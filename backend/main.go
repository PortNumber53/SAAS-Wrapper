package main

import (
    "encoding/json"
    "fmt"
    "log"
    "mime/multipart"
    "net/http"
    "os"
    "path/filepath"
    "strings"
    "time"

    "github.com/google/uuid"
)

type jsonResp map[string]any

func main() {
    mux := http.NewServeMux()

    storageDir := os.Getenv("STORAGE_DIR")
    if storageDir == "" {
        storageDir = "./storage"
    }
    if err := os.MkdirAll(filepath.Join(storageDir, "uploads"), 0o755); err != nil {
        log.Fatalf("create storage: %v", err)
    }

    // Upload endpoint (Worker proxies /api/uploads -> /uploads)
    mux.HandleFunc("/uploads", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
            return
        }
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

        // Validate content type
        ct := header.Header.Get("Content-Type")
        if !strings.HasPrefix(ct, "image/") {
            writeJSON(w, http.StatusUnsupportedMediaType, jsonResp{"ok": false, "error": "unsupported_type"})
            return
        }

        name := strings.ToLower(header.Filename)
        ext := filepath.Ext(name)
        if ext == "" {
            // try derive from content type
            parts := strings.Split(ct, "/")
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
        dst, err := os.Create(dstPath)
        if err != nil {
            writeJSON(w, http.StatusInternalServerError, jsonResp{"ok": false, "error": "write_failed"})
            return
        }
        defer dst.Close()
        if _, err := copyLimited(dst, file, 25<<20); err != nil {
            writeJSON(w, http.StatusInternalServerError, jsonResp{"ok": false, "error": "save_failed"})
            return
        }
        // Return a proxyable URL under /api/media (Worker will strip /api and hit /media here)
        publicURL := "/api/media/" + id + ext
        writeJSON(w, http.StatusOK, jsonResp{"ok": true, "url": publicURL, "key": key})
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
        http.ServeContent(w, r, filepath.Base(fp), time.Now(), f)
    })

    addr := os.Getenv("PORT")
    if addr == "" {
        addr = ":8080"
    } else if !strings.HasPrefix(addr, ":") {
        addr = ":" + addr
    }
    log.Printf("listening on %s (storage=%s)", addr, storageDir)
    log.Fatal(http.ListenAndServe(addr, logRequest(mux)))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    _ = json.NewEncoder(w).Encode(v)
}

func copyLimited(dst multipart.File, src multipart.File, max int64) (int64, error) {
    // We already limited body; here just stream
    return dst.ReadFrom(src)
}

func logRequest(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        next.ServeHTTP(w, r)
    })
}

