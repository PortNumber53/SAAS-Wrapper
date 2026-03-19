package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/jpeg"
	_ "image/png"

	"github.com/google/uuid"
	xdraw "golang.org/x/image/draw"
	_ "golang.org/x/image/webp"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type jsonResp map[string]any

func main() {
	_ = godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	if len(os.Args) >= 2 && os.Args[1] == "migrate" {
		if dbURL == "" {
			log.Fatal("DATABASE_URL must be set for migrations")
		}
		if err := handleMigrateCommand(dbURL, os.Args[2:]); err != nil {
			log.Fatal(err)
		}
		return
	}
	mux := http.NewServeMux()

	if dbURL != "" {
		if err := runMigrations(dbURL, "up", ""); err != nil {
			log.Printf("Auto-migration warning: %v", err)
		}
	}

	storageDir := os.Getenv("STORAGE_DIR")
	if storageDir == "" {
		storageDir = "./storage"
	}
	storageDir, _ = filepath.Abs(storageDir)
	if err := os.MkdirAll(filepath.Join(storageDir, "uploads"), 0o755); err != nil {
		log.Fatalf("create storage: %v", err)
	}
	backendSecret := os.Getenv("BACKEND_SECRET")

	// Upload endpoint (Worker proxies /api/uploads -> /uploads)
	mux.HandleFunc("/uploads", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			// Limit body size (25MB)
			r.Body = http.MaxBytesReader(w, r.Body, 25<<20)
			if err := r.ParseMultipartForm(25 << 20); err != nil {
				writeJSON(w, http.StatusBadRequest, jsonResp{"ok": false, "error": "invalid_form"})
				return
			}
			file, header, err := r.FormFile("file")
			if err != nil {
				writeJSON(w, http.StatusBadRequest, jsonResp{"ok": false, "error": "missing_file"})
				return
			}
			defer file.Close()

			// Sniff content type from first 512 bytes
			sniffBuf := make([]byte, 512)
			n, _ := io.ReadFull(file, sniffBuf)
			if n <= 0 {
				writeJSON(w, http.StatusBadRequest, jsonResp{"ok": false, "error": "empty_file"})
				return
			}
			sniff := http.DetectContentType(sniffBuf[:n])
			if !strings.HasPrefix(sniff, "image/") {
				writeJSON(w, http.StatusUnsupportedMediaType, jsonResp{"ok": false, "error": "unsupported_type"})
				return
			}
			name := strings.ToLower(header.Filename)
			ext := filepath.Ext(name)
			if ext == "" {
				parts := strings.Split(sniff, "/")
				if len(parts) == 2 {
					ext = "." + parts[1]
				} else {
					ext = ".bin"
				}
			}
			id := uuid.New().String()
			key := fmt.Sprintf("uploads/%s%s", id, ext)
			dstPath := filepath.Join(storageDir, key)
			if err := os.MkdirAll(filepath.Dir(dstPath), 0o755); err != nil {
				writeJSON(w, http.StatusInternalServerError, jsonResp{"ok": false, "error": "mkdir_failed"})
				return
			}
			// Reconstruct reader with sniffed bytes + remainder
			reader := io.MultiReader(bytes.NewReader(sniffBuf[:n]), file)
			dst, err := os.Create(dstPath)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, jsonResp{"ok": false, "error": "write_failed"})
				return
			}
			defer dst.Close()
			nbytes, err := copyLimited(dst, reader, 25<<20)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, jsonResp{"ok": false, "error": "save_failed"})
				return
			}
			publicURL := "/api/media/" + id + ext
			// Create thumbnail alongside original (best-effort)
			thumbName := id + ".thumb.jpg"
			thumbKey := filepath.Join("uploads", thumbName)
			thumbPath := filepath.Join(storageDir, thumbKey)
			if err := createThumbnail(dstPath, thumbPath, 512); err != nil {
				log.Printf("thumb generation failed for %s: %v", dstPath, err)
			}
			writeJSON(w, http.StatusOK, jsonResp{"ok": true, "url": publicURL, "thumb_url": "/api/media/" + thumbName, "key": key, "content_type": sniff, "size_bytes": nbytes})
			return
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
	})

	// Delete uploaded file via DELETE /uploads/<uuid>.<ext>
	mux.HandleFunc("/uploads/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		// Optional shared secret check (dev can omit)
		if backendSecret != "" && r.Header.Get("X-Backend-Secret") != backendSecret {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		base := strings.TrimPrefix(r.URL.Path, "/uploads/")
		if base == "" {
			http.NotFound(w, r)
			return
		}
		rel := filepath.Join("uploads", base)
		fp := filepath.Join(storageDir, rel)
		if !isPathWithin(fp, storageDir) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		if err := os.Remove(fp); err != nil {
			if os.IsNotExist(err) {
				http.NotFound(w, r)
				return
			}
			writeJSON(w, http.StatusInternalServerError, jsonResp{"ok": false, "error": "delete_failed"})
			return
		}
		writeJSON(w, http.StatusOK, jsonResp{"ok": true})
	})

	// Media serving (Worker proxies /api/media/* -> /media/*)
	mux.HandleFunc("/media/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		base := strings.TrimPrefix(r.URL.Path, "/media/")
		if base == "" {
			http.NotFound(w, r)
			return
		}
		// Our files stored as uploads/<uuid>.<ext>
		// Accept raw uuid.ext and map to uploads/uuid.ext; support legacy keys containing path
		var rel string
		if strings.Contains(base, "/") {
			// already a path
			rel = base
		} else {
			rel = filepath.Join("uploads", base)
		}
		fp := filepath.Join(storageDir, rel)
		if !isPathWithin(fp, storageDir) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		f, err := os.Open(fp)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer f.Close()
		// naive content type by ext
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		switch strings.ToLower(filepath.Ext(fp)) {
		case ".jpg", ".jpeg":
			w.Header().Set("Content-Type", "image/jpeg")
		case ".png":
			w.Header().Set("Content-Type", "image/png")
		case ".webp":
			w.Header().Set("Content-Type", "image/webp")
		default:
			w.Header().Set("Content-Type", "application/octet-stream")
		}
		// Use file's mod time for caching correctness
		stat, _ := f.Stat()
		modTime := time.Now()
		if stat != nil {
			modTime = stat.ModTime()
		}
		http.ServeContent(w, r, filepath.Base(fp), modTime, f)
	})

	// Start price migration worker if Stripe key is configured
	stripeKey := os.Getenv("STRIPE_SECRET_KEY")
	if dbURL != "" && stripeKey != "" {
		go runMigrationWorker(dbURL, stripeKey)
		log.Println("Price migration worker started")
	}

	addr := os.Getenv("PORT")
	if addr == "" {
		addr = "0.0.0.0:18311"
	} else if !strings.HasPrefix(addr, ":") {
		addr = ":" + addr
	}
	log.Printf("listening on %s (storage=%s)", addr, storageDir)
	log.Fatal(http.ListenAndServe(addr, logRequest(mux)))
}

func handleMigrateCommand(dbURL string, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("missing migrate command (up, down, version, force)")
	}
	cmd := args[0]
	switch cmd {
	case "up", "down", "version":
		return runMigrations(dbURL, cmd, "")
	case "force":
		if len(args) < 2 {
			return fmt.Errorf("force command requires a version number")
		}
		return runMigrations(dbURL, "force", args[1])
	default:
		return fmt.Errorf("unknown migrate command: %s", cmd)
	}
}

func runMigrations(dbURL, cmd, arg string) error {
	m, err := migrate.New("file://../db/migrations", dbURL)
	if err != nil {
		return fmt.Errorf("migrate instance: %w", err)
	}
	defer m.Close()

	switch cmd {
	case "up":
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			return fmt.Errorf("migrate up: %w", err)
		}
	case "down":
		if err := m.Down(); err != nil && err != migrate.ErrNoChange {
			return fmt.Errorf("migrate down: %w", err)
		}
	case "version":
		v, dirty, err := m.Version()
		if err != nil && err != migrate.ErrNilVersion {
			return fmt.Errorf("migrate version: %w", err)
		}
		log.Printf("Current migration version: %d (dirty: %v)", v, dirty)
		return nil
	case "force":
		var version int
		if _, err := fmt.Sscanf(arg, "%d", &version); err != nil {
			return fmt.Errorf("invalid version number: %w", err)
		}
		if err := m.Force(version); err != nil {
			return fmt.Errorf("migrate force: %w", err)
		}
	}

	log.Printf("Database migration '%s' completed successfully", cmd)
	return nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func copyLimited(dst io.Writer, src io.Reader, max int64) (int64, error) {
	// We already limited body at the request level; also guard at copy time
	return io.Copy(dst, io.LimitReader(src, max))
}

type statusRecorder struct {
	http.ResponseWriter
	status int
	nbytes int64
}

func (sr *statusRecorder) WriteHeader(code int) {
	sr.status = code
	sr.ResponseWriter.WriteHeader(code)
}
func (sr *statusRecorder) Write(b []byte) (int, error) {
	if sr.status == 0 {
		sr.status = http.StatusOK
	}
	n, err := sr.ResponseWriter.Write(b)
	sr.nbytes += int64(n)
	return n, err
}

func logRequest(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sr := &statusRecorder{ResponseWriter: w}
		next.ServeHTTP(sr, r)
		dur := time.Since(start)
		log.Printf("%s %s -> %d %dB %s", r.Method, r.URL.Path, sr.status, sr.nbytes, dur)
	})
}

// isPathWithin ensures the given path resides within base to prevent traversal
func isPathWithin(path, base string) bool {
	absPath, _ := filepath.Abs(path)
	absBase, _ := filepath.Abs(base)
	rel, err := filepath.Rel(absBase, absPath)
	if err != nil {
		return false
	}
	return !strings.HasPrefix(rel, "..") && !strings.Contains(rel, string(filepath.Separator)+"..")
}

// --- Stripe API helper ---

func stripeRequest(key, method, path string, params url.Values) (map[string]interface{}, error) {
	var body io.Reader
	if params != nil && (method == "POST" || method == "PUT" || method == "PATCH") {
		body = strings.NewReader(params.Encode())
	}
	reqURL := "https://api.stripe.com" + path
	if method == "GET" && params != nil {
		reqURL += "?" + params.Encode()
	}
	req, err := http.NewRequest(method, reqURL, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	if body != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("stripe request: %w", err)
	}
	defer resp.Body.Close()
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("stripe decode: %w", err)
	}
	if resp.StatusCode >= 400 {
		errMsg := "unknown"
		if e, ok := result["error"].(map[string]interface{}); ok {
			if m, ok := e["message"].(string); ok {
				errMsg = m
			}
		}
		return result, fmt.Errorf("stripe %d: %s", resp.StatusCode, errMsg)
	}
	return result, nil
}

// --- Price migration worker ---

func runMigrationWorker(dbURL, stripeKey string) {
	// Initial delay to let the server start up
	time.Sleep(10 * time.Second)
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()
	// Run once immediately, then on tick
	processPendingMigrations(dbURL, stripeKey)
	for range ticker.C {
		processPendingMigrations(dbURL, stripeKey)
	}
}

func processPendingMigrations(dbURL, stripeKey string) {
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Printf("migration-worker: db open: %v", err)
		return
	}
	defer db.Close()

	// Find a job that is ready to process (grace period elapsed)
	var job struct {
		ID                 int64
		TierID             int64
		OldStripeProductID string
		OldStripePriceID   string
		NewStripePriceID   string
		Status             string
	}
	err = db.QueryRow(`
		SELECT id, tier_id, old_stripe_product_id, old_stripe_price_id, new_stripe_price_id, status
		FROM public.price_migration_jobs
		WHERE status IN ('pending','running')
		  AND (status='running' OR created_at + (grace_period_days * interval '1 day') <= now())
		ORDER BY created_at ASC
		LIMIT 1
		FOR UPDATE SKIP LOCKED
	`).Scan(&job.ID, &job.TierID, &job.OldStripeProductID, &job.OldStripePriceID, &job.NewStripePriceID, &job.Status)
	if err != nil {
		if err != sql.ErrNoRows {
			log.Printf("migration-worker: query job: %v", err)
		}
		return
	}

	log.Printf("migration-worker: processing job %d (status=%s)", job.ID, job.Status)

	// Mark as running if pending
	if job.Status == "pending" {
		_, _ = db.Exec(`UPDATE public.price_migration_jobs SET status='running', started_at=now() WHERE id=$1`, job.ID)
	}

	// Process pending items in batches
	rows, err := db.Query(`
		SELECT id, user_id, stripe_subscription_id
		FROM public.price_migration_items
		WHERE job_id=$1 AND status='pending'
		ORDER BY id ASC
		LIMIT 50
	`, job.ID)
	if err != nil {
		log.Printf("migration-worker: query items: %v", err)
		return
	}
	defer rows.Close()

	type item struct {
		ID                   int64
		UserID               string
		StripeSubscriptionID string
	}
	var items []item
	for rows.Next() {
		var it item
		if err := rows.Scan(&it.ID, &it.UserID, &it.StripeSubscriptionID); err != nil {
			log.Printf("migration-worker: scan item: %v", err)
			continue
		}
		items = append(items, it)
	}
	rows.Close()

	if len(items) == 0 {
		// No pending items - check if job is done
		var pendingCount int
		_ = db.QueryRow(`SELECT count(*) FROM public.price_migration_items WHERE job_id=$1 AND status='pending'`, job.ID).Scan(&pendingCount)
		if pendingCount == 0 {
			_, _ = db.Exec(`UPDATE public.price_migration_jobs SET status='completed', completed_at=now() WHERE id=$1`, job.ID)
			// Archive old Stripe product
			if job.OldStripeProductID != "" {
				_, err := stripeRequest(stripeKey, "POST", "/v1/products/"+job.OldStripeProductID, url.Values{"active": {"false"}})
				if err != nil {
					log.Printf("migration-worker: archive old product %s: %v", job.OldStripeProductID, err)
				} else {
					log.Printf("migration-worker: archived old product %s", job.OldStripeProductID)
				}
			}
			log.Printf("migration-worker: job %d completed", job.ID)
		}
		return
	}

	for _, it := range items {
		err := migrateSubscription(stripeKey, it.StripeSubscriptionID, job.NewStripePriceID)
		if err != nil {
			errMsg := err.Error()
			if len(errMsg) > 500 {
				errMsg = errMsg[:500]
			}
			_, _ = db.Exec(`UPDATE public.price_migration_items SET status='failed', error_message=$1 WHERE id=$2`, errMsg, it.ID)
			_, _ = db.Exec(`UPDATE public.price_migration_jobs SET failed_users = failed_users + 1 WHERE id=$1`, job.ID)
			log.Printf("migration-worker: failed item %d (sub=%s): %v", it.ID, it.StripeSubscriptionID, err)
		} else {
			_, _ = db.Exec(`UPDATE public.price_migration_items SET status='migrated', migrated_at=now() WHERE id=$1`, it.ID)
			_, _ = db.Exec(`UPDATE public.price_migration_jobs SET migrated_users = migrated_users + 1 WHERE id=$1`, job.ID)
			// Update user_subscriptions to reflect new price
			_, _ = db.Exec(`UPDATE public.user_subscriptions SET stripe_price_id=$1, updated_at=now() WHERE user_id=$2`, job.NewStripePriceID, it.UserID)
			log.Printf("migration-worker: migrated item %d (sub=%s)", it.ID, it.StripeSubscriptionID)
		}
	}
}

func migrateSubscription(stripeKey, subscriptionID, newPriceID string) error {
	// Get current subscription to find the subscription item ID
	sub, err := stripeRequest(stripeKey, "GET", "/v1/subscriptions/"+subscriptionID, nil)
	if err != nil {
		return fmt.Errorf("get subscription: %w", err)
	}
	// Extract first item ID
	itemsObj, _ := sub["items"].(map[string]interface{})
	dataArr, _ := itemsObj["data"].([]interface{})
	if len(dataArr) == 0 {
		return fmt.Errorf("subscription has no items")
	}
	firstItem, _ := dataArr[0].(map[string]interface{})
	itemID, _ := firstItem["id"].(string)
	if itemID == "" {
		return fmt.Errorf("could not find subscription item ID")
	}
	// Check subscription status
	status, _ := sub["status"].(string)
	if status == "canceled" || status == "incomplete_expired" {
		return fmt.Errorf("subscription status is %s, skipping", status)
	}
	// Update subscription item to new price
	params := url.Values{
		"items[0][id]":         {itemID},
		"items[0][price]":      {newPriceID},
		"proration_behavior":   {"create_prorations"},
	}
	_, err = stripeRequest(stripeKey, "POST", "/v1/subscriptions/"+subscriptionID, params)
	if err != nil {
		return fmt.Errorf("update subscription: %w", err)
	}
	return nil
}

// createThumbnail decodes src image and writes a JPEG thumbnail at dst with max dimension maxDim
func createThumbnail(src, dst string, maxDim int) error {
	f, err := os.Open(src)
	if err != nil {
		return err
	}
	defer f.Close()
	img, _, err := image.Decode(f)
	if err != nil {
		return err
	}
	b := img.Bounds()
	w := b.Dx()
	h := b.Dy()
	if w <= 0 || h <= 0 {
		return fmt.Errorf("invalid image size")
	}
	// Compute target size preserving aspect ratio
	tw, th := w, h
	if w >= h {
		if w > maxDim {
			th = h * maxDim / w
			tw = maxDim
		}
	} else {
		if h > maxDim {
			tw = w * maxDim / h
			th = maxDim
		}
	}
	if tw <= 0 {
		tw = 1
	}
	if th <= 0 {
		th = 1
	}
	// Resize using ApproxBiLinear
	dstImg := image.NewRGBA(image.Rect(0, 0, tw, th))
	xdraw.ApproxBiLinear.Scale(dstImg, dstImg.Bounds(), img, b, xdraw.Over, nil)
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	// JPEG quality
	return jpeg.Encode(out, dstImg, &jpeg.Options{Quality: 80})
}
