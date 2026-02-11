package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

// subscriptionTier represents a row from subscription_tiers
type subscriptionTier struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Slug            string   `json:"slug"`
	StripeProductID *string  `json:"stripe_product_id,omitempty"`
	StripePriceID   *string  `json:"stripe_price_id,omitempty"`
	PriceCents      int      `json:"price_cents"`
	Currency        string   `json:"currency"`
	BillingInterval string   `json:"billing_interval"`
	MaxIntegrations int      `json:"max_integrations"`
	MaxAPICalls     int      `json:"max_api_calls"`
	MaxStorageMB    int      `json:"max_storage_mb"`
	Features        []string `json:"features"`
	SortOrder       int      `json:"sort_order"`
	Active          bool     `json:"active"`
}

// handleSubscriptionTiers returns active subscription tiers (public, no auth)
func handleSubscriptionTiers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		writeJSON(w, http.StatusServiceUnavailable, jsonResp{"ok": false, "error": "database not configured"})
		return
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		appLog.Error("Failed to open db for tiers: %v", err)
		writeJSON(w, http.StatusInternalServerError, jsonResp{"ok": false, "error": "internal_error"})
		return
	}
	defer db.Close()

	rows, err := db.Query(`
		SELECT id, name, slug, stripe_product_id, stripe_price_id,
		       price_cents, currency, billing_interval,
		       max_integrations, max_api_calls, max_storage_mb,
		       features, sort_order, active
		FROM public.subscription_tiers
		WHERE active = true AND deprecated_by IS NULL
		ORDER BY sort_order ASC
	`)
	if err != nil {
		appLog.Error("Failed to query tiers: %v", err)
		writeJSON(w, http.StatusInternalServerError, jsonResp{"ok": false, "error": "query_failed"})
		return
	}
	defer rows.Close()

	var tiers []subscriptionTier
	for rows.Next() {
		var t subscriptionTier
		var featuresJSON []byte
		var stripeProductID, stripePriceID sql.NullString

		err := rows.Scan(
			&t.ID, &t.Name, &t.Slug, &stripeProductID, &stripePriceID,
			&t.PriceCents, &t.Currency, &t.BillingInterval,
			&t.MaxIntegrations, &t.MaxAPICalls, &t.MaxStorageMB,
			&featuresJSON, &t.SortOrder, &t.Active,
		)
		if err != nil {
			appLog.Error("Failed to scan tier: %v", err)
			continue
		}
		if stripeProductID.Valid {
			t.StripeProductID = &stripeProductID.String
		}
		if stripePriceID.Valid {
			t.StripePriceID = &stripePriceID.String
		}
		_ = json.Unmarshal(featuresJSON, &t.Features)
		tiers = append(tiers, t)
	}

	writeJSON(w, http.StatusOK, jsonResp{"ok": true, "tiers": tiers})
}

// syncTiersToStripe ensures every paid tier has a Stripe product + price.
// Called once on backend startup; searches for existing products by metadata
// (saas_id + tier_slug), creates missing ones, and writes IDs back to the DB.
func syncTiersToStripe(dbURL, stripeKey string) {
	saasID := os.Getenv("SAAS_ID")
	if saasID == "" {
		saasID = "saas_wrapper_dev"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if appLog != nil {
			appLog.Error("syncTiersToStripe: db open: %v", err)
		}
		return
	}
	defer db.Close()

	sc := newStripeClient(stripeKey)

	rows, err := db.Query(`
		SELECT id, name, slug, stripe_product_id, stripe_price_id, price_cents, currency, billing_interval
		FROM public.subscription_tiers
		WHERE active = true AND deprecated_by IS NULL
		ORDER BY sort_order ASC
	`)
	if err != nil {
		if appLog != nil {
			appLog.Error("syncTiersToStripe: query: %v", err)
		}
		return
	}
	defer rows.Close()

	type tierRow struct {
		id              string
		name            string
		slug            string
		stripeProductID sql.NullString
		stripePriceID   sql.NullString
		priceCents      int
		currency        string
		billingInterval string
	}
	var tiers []tierRow
	for rows.Next() {
		var t tierRow
		if err := rows.Scan(&t.id, &t.name, &t.slug, &t.stripeProductID, &t.stripePriceID, &t.priceCents, &t.currency, &t.billingInterval); err != nil {
			if appLog != nil {
				appLog.Error("syncTiersToStripe: scan: %v", err)
			}
			continue
		}
		tiers = append(tiers, t)
	}

	if appLog != nil {
		appLog.Info("syncTiersToStripe: starting (saas_id=%s, %d tiers)", saasID, len(tiers))
	}

	for _, t := range tiers {
		// Skip free tier — no Stripe product needed
		if t.priceCents == 0 {
			if appLog != nil {
				appLog.Debug("syncTiersToStripe: skipping free tier %s", t.slug)
			}
			continue
		}

		productID := t.stripeProductID.String
		priceID := t.stripePriceID.String

		// If product ID is missing, search Stripe by metadata first
		if !t.stripeProductID.Valid || productID == "" {
			if existingID, found := sc.findProductBySaasSlug(saasID, t.slug); found {
				productID = existingID
				_, err = db.Exec(`UPDATE public.subscription_tiers SET stripe_product_id = $1, updated_at = now() WHERE id = $2`, productID, t.id)
				if err != nil && appLog != nil {
					appLog.Error("syncTiersToStripe: update product_id for %s: %v", t.slug, err)
				}
				if appLog != nil {
					appLog.Info("syncTiersToStripe: found existing Stripe product %s for tier %s", productID, t.slug)
				}
			}
		}

		// Create product if still missing
		if productID == "" {
			desc := fmt.Sprintf("SaaS Wrapper — %s plan", t.name)
			meta := map[string]string{
				"saas_id":   saasID,
				"tier_slug": t.slug,
			}
			newProductID, err := sc.createProduct(t.name, desc, meta)
			if err != nil {
				if appLog != nil {
					appLog.Error("syncTiersToStripe: create product for %s: %v", t.slug, err)
				}
				continue
			}
			productID = newProductID
			_, err = db.Exec(`UPDATE public.subscription_tiers SET stripe_product_id = $1, updated_at = now() WHERE id = $2`, productID, t.id)
			if err != nil && appLog != nil {
				appLog.Error("syncTiersToStripe: update product_id for %s: %v", t.slug, err)
			}
			if appLog != nil {
				appLog.Info("syncTiersToStripe: created Stripe product %s for tier %s (saas_id=%s)", productID, t.slug, saasID)
			}
		} else {
			// Product already exists — ensure metadata is present (backfill for older products)
			meta := map[string]string{
				"saas_id":   saasID,
				"tier_slug": t.slug,
			}
			if err := sc.updateProductMetadata(productID, meta); err != nil {
				if appLog != nil {
					appLog.Warn("syncTiersToStripe: failed to backfill metadata on %s for tier %s: %v", productID, t.slug, err)
				}
			} else if appLog != nil {
				appLog.Debug("syncTiersToStripe: ensured metadata on product %s for tier %s", productID, t.slug)
			}
		}

		// Create price if missing
		if !t.stripePriceID.Valid || priceID == "" {
			interval := t.billingInterval
			if interval == "" {
				interval = "month"
			}
			currency := t.currency
			if currency == "" {
				currency = "usd"
			}
			newPriceID, err := sc.createPrice(productID, t.priceCents, currency, interval)
			if err != nil {
				if appLog != nil {
					appLog.Error("syncTiersToStripe: create price for %s: %v", t.slug, err)
				}
				continue
			}
			priceID = newPriceID
			_, err = db.Exec(`UPDATE public.subscription_tiers SET stripe_price_id = $1, updated_at = now() WHERE id = $2`, priceID, t.id)
			if err != nil && appLog != nil {
				appLog.Error("syncTiersToStripe: update price_id for %s: %v", t.slug, err)
			}
			if appLog != nil {
				appLog.Info("syncTiersToStripe: created Stripe price %s (%d %s/%s) for tier %s", priceID, t.priceCents, currency, interval, t.slug)
			}
		}

		if appLog != nil {
			appLog.Debug("syncTiersToStripe: tier %s OK (product=%s, price=%s)", t.slug, productID, priceID)
		}
	}

	if appLog != nil {
		appLog.Info("syncTiersToStripe: sync complete (%d tiers checked)", len(tiers))
	}
}

// runMigrationWorker runs a background loop that processes tier migration jobs
func runMigrationWorker(dbURL, stripeKey string) {
	if appLog != nil {
		appLog.Info("Starting subscription migration worker (interval: 5m)")
	}

	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	// Run once immediately on start
	processMigrationJobs(dbURL, stripeKey)

	for range ticker.C {
		processMigrationJobs(dbURL, stripeKey)
	}
}

// processMigrationJobs checks for pending migration jobs with expired grace periods
func processMigrationJobs(dbURL, stripeKey string) {
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if appLog != nil {
			appLog.Error("Migration worker: failed to connect to db: %v", err)
		}
		return
	}
	defer db.Close()

	sc := newStripeClient(stripeKey)

	// Find pending jobs where grace period has ended
	rows, err := db.Query(`
		SELECT id, old_tier_id, new_tier_id
		FROM public.tier_migration_jobs
		WHERE status = 'pending' AND grace_end_at <= now()
		ORDER BY created_at ASC
		LIMIT 10
	`)
	if err != nil {
		if appLog != nil {
			appLog.Error("Migration worker: query jobs: %v", err)
		}
		return
	}
	defer rows.Close()

	type migJob struct {
		id        string
		oldTierID string
		newTierID string
	}
	var jobs []migJob
	for rows.Next() {
		var j migJob
		if err := rows.Scan(&j.id, &j.oldTierID, &j.newTierID); err != nil {
			if appLog != nil {
				appLog.Error("Migration worker: scan job: %v", err)
			}
			continue
		}
		jobs = append(jobs, j)
	}

	for _, job := range jobs {
		if appLog != nil {
			appLog.Info("Processing migration job %s: %s -> %s", job.id, job.oldTierID, job.newTierID)
		}

		// Mark as processing
		_, _ = db.Exec(`UPDATE public.tier_migration_jobs SET status = 'processing' WHERE id = $1`, job.id)

		// Get new tier's stripe price
		var newPriceID sql.NullString
		err := db.QueryRow(`SELECT stripe_price_id FROM public.subscription_tiers WHERE id = $1`, job.newTierID).Scan(&newPriceID)
		if err != nil || !newPriceID.Valid {
			errMsg := fmt.Sprintf("new tier %s has no stripe_price_id", job.newTierID)
			if err != nil {
				errMsg = err.Error()
			}
			_, _ = db.Exec(`UPDATE public.tier_migration_jobs SET status = 'failed', error_message = $1 WHERE id = $2`, errMsg, job.id)
			if appLog != nil {
				appLog.Error("Migration job %s failed: %s", job.id, errMsg)
			}
			continue
		}

		// Find all users on the old tier with active subscriptions
		subRows, err := db.Query(`
			SELECT id, user_id, stripe_subscription_id
			FROM public.user_subscriptions
			WHERE tier_id = $1 AND status = 'active' AND stripe_subscription_id IS NOT NULL
		`, job.oldTierID)
		if err != nil {
			_, _ = db.Exec(`UPDATE public.tier_migration_jobs SET status = 'failed', error_message = $1 WHERE id = $2`, err.Error(), job.id)
			if appLog != nil {
				appLog.Error("Migration job %s: query users: %v", job.id, err)
			}
			continue
		}

		type userSub struct {
			id          string
			userID      string
			stripeSubID string
		}
		var subs []userSub
		for subRows.Next() {
			var s userSub
			if err := subRows.Scan(&s.id, &s.userID, &s.stripeSubID); err != nil {
				continue
			}
			subs = append(subs, s)
		}
		subRows.Close()

		totalUsers := len(subs)
		migratedCount := 0

		for _, sub := range subs {
			if appLog != nil {
				appLog.Debug("Migrating user %s subscription %s to price %s", sub.userID, sub.stripeSubID, newPriceID.String)
			}

			err := sc.updateSubscription(sub.stripeSubID, newPriceID.String)
			if err != nil {
				if appLog != nil {
					appLog.Error("Failed to migrate user %s: %v", sub.userID, err)
				}
				continue
			}

			// Update user's subscription to the new tier
			_, err = db.Exec(`
				UPDATE public.user_subscriptions
				SET tier_id = $1, updated_at = now()
				WHERE id = $2
			`, job.newTierID, sub.id)
			if err != nil {
				if appLog != nil {
					appLog.Error("Failed to update user_subscription %s: %v", sub.id, err)
				}
				continue
			}

			migratedCount++
		}

		// Mark job as completed
		status := "completed"
		var errMsg *string
		if migratedCount < totalUsers {
			status = "completed"
			msg := fmt.Sprintf("migrated %d/%d users", migratedCount, totalUsers)
			errMsg = &msg
		}

		_, _ = db.Exec(`
			UPDATE public.tier_migration_jobs
			SET status = $1, error_message = $2, users_migrated = $3, users_total = $4, completed_at = now()
			WHERE id = $5
		`, status, errMsg, migratedCount, totalUsers, job.id)

		if appLog != nil {
			appLog.Info("Migration job %s completed: %d/%d users migrated", job.id, migratedCount, totalUsers)
		}
	}
}
