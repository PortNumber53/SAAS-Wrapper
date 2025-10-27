package main

import (
    "bytes"
    "io"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "path/filepath"
    "strings"
    "time"

    "github.com/google/uuid"
    "image"
    _ "image/gif"
    _ "image/jpeg"
    _ "image/png"
    "image/jpeg"
    xdraw "golang.org/x/image/draw"
    _ "golang.org/x/image/webp"
)

type jsonResp map[string]any

func main() {
    mux := http.NewServeMux()

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
            if _, err := copyLimited(dst, reader, 25<<20); err != nil {
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
            writeJSON(w, http.StatusOK, jsonResp{"ok": true, "url": publicURL, "thumb_url": "/api/media/" + thumbName, "key": key, "content_type": sniff})
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
        if stat != nil { modTime = stat.ModTime() }
        http.ServeContent(w, r, filepath.Base(fp), modTime, f)
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
    if err != nil { return false }
    return !strings.HasPrefix(rel, "..") && !strings.Contains(rel, string(filepath.Separator)+"..")
}

// createThumbnail decodes src image and writes a JPEG thumbnail at dst with max dimension maxDim
func createThumbnail(src, dst string, maxDim int) error {
    f, err := os.Open(src)
    if err != nil { return err }
    defer f.Close()
    img, _, err := image.Decode(f)
    if err != nil { return err }
    b := img.Bounds()
    w := b.Dx()
    h := b.Dy()
    if w <= 0 || h <= 0 { return fmt.Errorf("invalid image size") }
    // Compute target size preserving aspect ratio
    tw, th := w, h
    if w >= h {
        if w > maxDim { th = h * maxDim / w; tw = maxDim }
    } else {
        if h > maxDim { tw = w * maxDim / h; th = maxDim }
    }
    if tw <= 0 { tw = 1 }
    if th <= 0 { th = 1 }
    // Resize using ApproxBiLinear
    dstImg := image.NewRGBA(image.Rect(0, 0, tw, th))
    xdraw.ApproxBiLinear.Scale(dstImg, dstImg.Bounds(), img, b, xdraw.Over, nil)
    if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil { return err }
    out, err := os.Create(dst)
    if err != nil { return err }
    defer out.Close()
    // JPEG quality
    return jpeg.Encode(out, dstImg, &jpeg.Options{Quality: 80})
}
