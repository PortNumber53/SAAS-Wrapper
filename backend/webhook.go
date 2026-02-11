package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

// handleStripeWebhook processes incoming Stripe webhook events
func handleStripeWebhook(w http.ResponseWriter, r *http.Request, hub *WSHub) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	secret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if secret == "" {
		if appLog != nil {
			appLog.Error("STRIPE_WEBHOOK_SECRET not set")
		}
		http.Error(w, "webhook secret not configured", http.StatusInternalServerError)
		return
	}

	// Read body (limit to 1MB)
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		http.Error(w, "read body failed", http.StatusBadRequest)
		return
	}

	// Verify signature
	sigHeader := r.Header.Get("Stripe-Signature")
	if sigHeader == "" {
		http.Error(w, "missing signature", http.StatusBadRequest)
		return
	}

	if err := verifyStripeSignature(body, sigHeader, secret); err != nil {
		if appLog != nil {
			appLog.Warn("Webhook signature verification failed: %v", err)
		}
		http.Error(w, "invalid signature", http.StatusBadRequest)
		return
	}

	// Parse event
	var event struct {
		ID      string         `json:"id"`
		Type    string         `json:"type"`
		Created int64          `json:"created"`
		Data    map[string]any `json:"data"`
	}
	if err := json.Unmarshal(body, &event); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	obj, ok := event.Data["object"].(map[string]any)
	if !ok {
		http.Error(w, "missing data.object", http.StatusBadRequest)
		return
	}

	if appLog != nil {
		appLog.Info("Stripe webhook: %s (id=%s)", event.Type, event.ID)
	}

	// Broadcast event trigger to all connected clients
	if hub != nil {
		hub.BroadcastMessage("billing_update", map[string]string{
			"event": event.Type,
		})
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		http.Error(w, "database not configured", http.StatusInternalServerError)
		return
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if appLog != nil {
			appLog.Error("db open: %v", err)
		}
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	defer db.Close()

	// Helper to extract string from map
	str := func(m map[string]any, key string) string {
		if v, ok := m[key].(string); ok {
			return v
		}
		return ""
	}

	// Insert into stripe_events
	var customerID, subID, piID string
	var amount int64
	var currency, status string

	// Extract common fields based on event type
	// Note: allow looser typing to handle both subscriptions and invoices/sessions
	if c, ok := obj["customer"].(string); ok {
		customerID = c
	}
	if s, ok := obj["subscription"].(string); ok {
		subID = s
	} else if s, ok := obj["id"].(string); ok && (event.Type == "customer.subscription.created" || event.Type == "customer.subscription.updated" || event.Type == "customer.subscription.deleted") {
		subID = s
	}

	if pi, ok := obj["payment_intent"].(string); ok {
		piID = pi
	} else if event.Type == "payment_intent.succeeded" || event.Type == "payment_intent.payment_failed" {
		piID = str(obj, "id")
	}

	if amt, ok := obj["amount_total"].(float64); ok {
		amount = int64(amt)
	} else if amt, ok := obj["amount"].(float64); ok {
		amount = int64(amt)
	}

	currency = str(obj, "currency")
	if currency == "" {
		currency = "usd"
	}

	if st := str(obj, "status"); st != "" {
		status = st
	} else if st := str(obj, "payment_status"); st != "" {
		status = st
	} else {
		status = "unknown"
	}

	createdAt := time.Unix(event.Created, 0)
	metaJSON, _ := json.Marshal(obj["metadata"])

	_, err = db.Exec(`
		INSERT INTO public.stripe_events 
		(event_id, event_type, customer_id, subscription_id, payment_intent_id, amount, currency, status, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (event_id) DO NOTHING
	`, event.ID, event.Type, customerID, subID, piID, amount, currency, status, string(metaJSON), createdAt)
	if err != nil {
		if appLog != nil {
			appLog.Error("insert stripe_event: %v", err)
		}
	}

	// Handle specific logic
	switch event.Type {
	case "checkout.session.completed":
		// Only handle subscription mode checkouts that have our metadata
		if mode := str(obj, "mode"); mode == "subscription" {
			meta, _ := obj["metadata"].(map[string]any)
			userID := str(meta, "user_id")
			tierID := str(meta, "tier_id")

			if userID != "" && tierID != "" {
				// Link user to subscription
				// Upsert user_subscriptions
				_, err := db.Exec(`
					INSERT INTO public.user_subscriptions (user_id, tier_id, stripe_subscription_id, stripe_customer_id, status, created_at, updated_at)
					VALUES ($1, $2, $3, $4, 'active', now(), now())
					ON CONFLICT (user_id) DO UPDATE SET
						tier_id = EXCLUDED.tier_id,
						stripe_subscription_id = EXCLUDED.stripe_subscription_id,
						stripe_customer_id = EXCLUDED.stripe_customer_id,
						status = 'active',
						updated_at = now()
				`, userID, tierID, subID, customerID)

				if err != nil {
					if appLog != nil {
						appLog.Error("checkout link user failed: %v", err)
					}
				} else if appLog != nil {
					appLog.Info("Linked user %s to subscription %s (tier %s)", userID, subID, tierID)
				}
			}
		}

	case "customer.subscription.updated", "customer.subscription.deleted":
		// Sync status and period dates
		currentPeriodStart := time.Unix(int64(obj["current_period_start"].(float64)), 0)
		currentPeriodEnd := time.Unix(int64(obj["current_period_end"].(float64)), 0)

		_, err := db.Exec(`
			UPDATE public.user_subscriptions
			SET status = $1, current_period_start = $2, current_period_end = $3, updated_at = now()
			WHERE stripe_subscription_id = $4
		`, status, currentPeriodStart, currentPeriodEnd, subID)

		if err != nil {
			if appLog != nil {
				appLog.Error("update sub status failed: %v", err)
			}
		} else if appLog != nil {
			appLog.Info("Updated subscription %s status to %s", subID, status)
		}
	}

	writeJSON(w, http.StatusOK, jsonResp{"received": true})
}

// verifyStripeSignature verifies the header signature against the body and secret
func verifyStripeSignature(payload []byte, header, secret string) error {
	parts := strings.Split(header, ",")
	var timestamp string
	var signatures []string

	for _, part := range parts {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) == 2 {
			if kv[0] == "t" {
				timestamp = kv[1]
			} else if kv[0] == "v1" {
				signatures = append(signatures, kv[1])
			}
		}
	}

	if timestamp == "" || len(signatures) == 0 {
		return fmt.Errorf("missing timestamp or signature")
	}

	// Check timestamp freshness (tolerance 5 min)
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid timestamp")
	}
	if time.Since(time.Unix(ts, 0)) > 5*time.Minute {
		return fmt.Errorf("timestamp too old")
	}

	// Compute expected signature
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(timestamp))
	mac.Write([]byte("."))
	mac.Write(payload)
	expectedMAC := mac.Sum(nil)

	// Try to match any of the provided signatures
	for _, sig := range signatures {
		decodedSig, err := hex.DecodeString(sig)
		if err != nil {
			continue
		}
		if hmac.Equal(decodedSig, expectedMAC) {
			return nil
		}
	}

	return fmt.Errorf("signature mismatch")
}
