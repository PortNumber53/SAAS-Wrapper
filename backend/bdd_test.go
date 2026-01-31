package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/cucumber/godog"
)

// testContext holds state between steps
type testContext struct {
	server      *httptest.Server
	storageDir  string
	response    *http.Response
	responseBody []byte
	jsonResp    map[string]any
	uploadedURL string
	thumbURL    string
	uploadedKey string
}

func (tc *testContext) reset() {
	tc.response = nil
	tc.responseBody = nil
	tc.jsonResp = nil
	tc.uploadedURL = ""
	tc.thumbURL = ""
	tc.uploadedKey = ""
}

// Step: the server is running
func (tc *testContext) theServerIsRunning(ctx context.Context) error {
	if tc.server != nil {
		return nil
	}

	// Create temp storage directory
	tmpDir, err := os.MkdirTemp("", "bdd-storage-*")
	if err != nil {
		return fmt.Errorf("failed to create temp storage: %w", err)
	}
	tc.storageDir = tmpDir

	if err := os.MkdirAll(filepath.Join(tc.storageDir, "uploads"), 0o755); err != nil {
		return fmt.Errorf("failed to create uploads dir: %w", err)
	}

	// Create test server with the same handlers as main
	mux := http.NewServeMux()
	setupHandlers(mux, tc.storageDir, "")
	tc.server = httptest.NewServer(mux)

	return nil
}

// Step: the storage directory is empty
func (tc *testContext) theStorageDirectoryIsEmpty(ctx context.Context) error {
	uploadsDir := filepath.Join(tc.storageDir, "uploads")
	entries, err := os.ReadDir(uploadsDir)
	if err != nil {
		return nil // directory might not exist yet, which is fine
	}
	for _, entry := range entries {
		os.RemoveAll(filepath.Join(uploadsDir, entry.Name()))
	}
	return nil
}

// Step: I upload a file with content type
func (tc *testContext) iUploadAFileWithContentType(ctx context.Context, filename, contentType string) error {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return err
	}

	// Create test content based on content type
	imgContent := createTestContent(contentType)
	if _, err := part.Write(imgContent); err != nil {
		return err
	}
	writer.Close()

	req, err := http.NewRequest(http.MethodPost, tc.server.URL+"/uploads", &body)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	tc.response, err = http.DefaultClient.Do(req)
	if err != nil {
		return err
	}

	return tc.readResponseBody()
}

// Step: I upload an empty file
func (tc *testContext) iUploadAnEmptyFile(ctx context.Context, filename string) error {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	_, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return err
	}
	writer.Close()

	req, err := http.NewRequest(http.MethodPost, tc.server.URL+"/uploads", &body)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	tc.response, err = http.DefaultClient.Do(req)
	if err != nil {
		return err
	}

	return tc.readResponseBody()
}

// Step: I submit an upload request without a file
func (tc *testContext) iSubmitAnUploadRequestWithoutAFile(ctx context.Context) error {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	writer.Close()

	req, err := http.NewRequest(http.MethodPost, tc.server.URL+"/uploads", &body)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	tc.response, err = http.DefaultClient.Do(req)
	if err != nil {
		return err
	}

	return tc.readResponseBody()
}

// Step: I have uploaded a file with content type
func (tc *testContext) iHaveUploadedAFileWithContentType(ctx context.Context, filename, contentType string) error {
	if err := tc.iUploadAFileWithContentType(ctx, filename, contentType); err != nil {
		return err
	}
	if tc.response.StatusCode != http.StatusOK {
		return fmt.Errorf("upload failed with status %d", tc.response.StatusCode)
	}
	if url, ok := tc.jsonResp["url"].(string); ok {
		tc.uploadedURL = url
	}
	if thumbURL, ok := tc.jsonResp["thumb_url"].(string); ok {
		tc.thumbURL = thumbURL
	}
	if key, ok := tc.jsonResp["key"].(string); ok {
		tc.uploadedKey = key
	}
	return nil
}

// Step: I request the media file with the returned URL
func (tc *testContext) iRequestTheMediaFileWithTheReturnedURL(ctx context.Context) error {
	if tc.uploadedURL == "" {
		return fmt.Errorf("no uploaded URL available")
	}
	// Convert /api/media/ to /media/ for direct server access
	url := strings.Replace(tc.uploadedURL, "/api/media/", "/media/", 1)
	return tc.sendRequest(http.MethodGet, url)
}

// Step: I request the thumbnail with the returned thumb URL
func (tc *testContext) iRequestTheThumbnailWithTheReturnedThumbURL(ctx context.Context) error {
	if tc.thumbURL == "" {
		return fmt.Errorf("no thumb URL available")
	}
	// Convert /api/media/ to /media/ for direct server access
	url := strings.Replace(tc.thumbURL, "/api/media/", "/media/", 1)
	return tc.sendRequest(http.MethodGet, url)
}

// Step: I delete the uploaded file
func (tc *testContext) iDeleteTheUploadedFile(ctx context.Context) error {
	if tc.uploadedKey == "" {
		return fmt.Errorf("no uploaded key available")
	}
	// uploadedKey is like "uploads/uuid.ext", we need "/uploads/uuid.ext"
	path := "/" + tc.uploadedKey
	return tc.sendRequest(http.MethodDelete, path)
}

// Step: I send a GET/POST/DELETE request to path
func (tc *testContext) iSendARequestTo(ctx context.Context, method, path string) error {
	return tc.sendRequest(method, path)
}

// Step: the response status should be
func (tc *testContext) theResponseStatusShouldBe(ctx context.Context, expectedStatus int) error {
	if tc.response == nil {
		return fmt.Errorf("no response available")
	}
	if tc.response.StatusCode != expectedStatus {
		return fmt.Errorf("expected status %d, got %d", expectedStatus, tc.response.StatusCode)
	}
	return nil
}

// Step: the response should contain field equal to value (bool)
func (tc *testContext) theResponseShouldContainEqualToBool(ctx context.Context, field string, expectedStr string) error {
	if tc.jsonResp == nil {
		return fmt.Errorf("no JSON response available")
	}
	val, ok := tc.jsonResp[field]
	if !ok {
		return fmt.Errorf("field %q not found in response", field)
	}
	boolVal, ok := val.(bool)
	if !ok {
		return fmt.Errorf("field %q is not a boolean", field)
	}
	expected := expectedStr == "true"
	if boolVal != expected {
		return fmt.Errorf("expected %q to be %v, got %v", field, expected, boolVal)
	}
	return nil
}

// Step: the response should contain field equal to value (string)
func (tc *testContext) theResponseShouldContainEqualToString(ctx context.Context, field, expected string) error {
	if tc.jsonResp == nil {
		return fmt.Errorf("no JSON response available")
	}
	val, ok := tc.jsonResp[field]
	if !ok {
		return fmt.Errorf("field %q not found in response", field)
	}
	strVal, ok := val.(string)
	if !ok {
		return fmt.Errorf("field %q is not a string", field)
	}
	if strVal != expected {
		return fmt.Errorf("expected %q to be %q, got %q", field, expected, strVal)
	}
	return nil
}

// Step: the response should contain a field
func (tc *testContext) theResponseShouldContainAField(ctx context.Context, field string) error {
	if tc.jsonResp == nil {
		return fmt.Errorf("no JSON response available")
	}
	if _, ok := tc.jsonResp[field]; !ok {
		return fmt.Errorf("field %q not found in response", field)
	}
	return nil
}

// Step: the response header should be
func (tc *testContext) theResponseHeaderShouldBe(ctx context.Context, header, expected string) error {
	if tc.response == nil {
		return fmt.Errorf("no response available")
	}
	actual := tc.response.Header.Get(header)
	if actual != expected {
		return fmt.Errorf("expected header %q to be %q, got %q", header, expected, actual)
	}
	return nil
}

// Step: the response header should contain
func (tc *testContext) theResponseHeaderShouldContain(ctx context.Context, header, substring string) error {
	if tc.response == nil {
		return fmt.Errorf("no response available")
	}
	actual := tc.response.Header.Get(header)
	if !strings.Contains(actual, substring) {
		return fmt.Errorf("expected header %q to contain %q, got %q", header, substring, actual)
	}
	return nil
}

// Helper methods

func (tc *testContext) sendRequest(method, path string) error {
	req, err := http.NewRequest(method, tc.server.URL+path, nil)
	if err != nil {
		return err
	}

	tc.response, err = http.DefaultClient.Do(req)
	if err != nil {
		return err
	}

	return tc.readResponseBody()
}

func (tc *testContext) readResponseBody() error {
	if tc.response == nil {
		return nil
	}
	defer tc.response.Body.Close()

	body, err := io.ReadAll(tc.response.Body)
	if err != nil {
		return err
	}
	tc.responseBody = body

	// Try to parse as JSON
	if strings.HasPrefix(tc.response.Header.Get("Content-Type"), "application/json") {
		tc.jsonResp = make(map[string]any)
		json.Unmarshal(body, &tc.jsonResp)
	}

	return nil
}

// createTestContent creates appropriate test content based on content type
func createTestContent(contentType string) []byte {
	// For non-image types, return plain text
	if !strings.HasPrefix(contentType, "image/") {
		return []byte("This is plain text content, not an image.")
	}

	// Create a minimal valid PNG image
	img := image.NewRGBA(image.Rect(0, 0, 10, 10))
	for y := 0; y < 10; y++ {
		for x := 0; x < 10; x++ {
			img.Set(x, y, color.RGBA{255, 0, 0, 255})
		}
	}

	var buf bytes.Buffer
	png.Encode(&buf, img)
	return buf.Bytes()
}

// setupHandlers configures the HTTP handlers (extracted for testing)
func setupHandlers(mux *http.ServeMux, storageDir, backendSecret string) {
	// Upload endpoint
	mux.HandleFunc("/uploads", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
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
			id := fmt.Sprintf("test-%d", os.Getpid())
			key := fmt.Sprintf("uploads/%s%s", id, ext)
			dstPath := filepath.Join(storageDir, key)
			os.MkdirAll(filepath.Dir(dstPath), 0o755)

			reader := io.MultiReader(bytes.NewReader(sniffBuf[:n]), file)
			dst, err := os.Create(dstPath)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, jsonResp{"ok": false, "error": "write_failed"})
				return
			}
			defer dst.Close()
			nbytes, _ := io.Copy(dst, io.LimitReader(reader, 25<<20))

			publicURL := "/api/media/" + id + ext
			thumbName := id + ".thumb.jpg"
			thumbPath := filepath.Join(storageDir, "uploads", thumbName)
			createThumbnail(dstPath, thumbPath, 512)

			writeJSON(w, http.StatusOK, jsonResp{
				"ok":           true,
				"url":          publicURL,
				"thumb_url":    "/api/media/" + thumbName,
				"key":          key,
				"content_type": sniff,
				"size_bytes":   nbytes,
			})
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Delete endpoint
	mux.HandleFunc("/uploads/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
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

	// Media serving endpoint
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
		var rel string
		if strings.Contains(base, "/") {
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

		stat, _ := f.Stat()
		http.ServeContent(w, r, filepath.Base(fp), stat.ModTime(), f)
	})
}

func InitializeScenario(sc *godog.ScenarioContext) {
	tc := &testContext{}

	sc.Before(func(ctx context.Context, sc *godog.Scenario) (context.Context, error) {
		tc.reset()
		return ctx, nil
	})

	sc.After(func(ctx context.Context, sc *godog.Scenario, err error) (context.Context, error) {
		if tc.server != nil {
			tc.server.Close()
			tc.server = nil
		}
		if tc.storageDir != "" {
			os.RemoveAll(tc.storageDir)
			tc.storageDir = ""
		}
		return ctx, nil
	})

	// Background steps
	sc.Step(`^the server is running$`, tc.theServerIsRunning)
	sc.Step(`^the storage directory is empty$`, tc.theStorageDirectoryIsEmpty)

	// Upload steps
	sc.Step(`^I upload a file "([^"]*)" with content type "([^"]*)"$`, tc.iUploadAFileWithContentType)
	sc.Step(`^I upload an empty file "([^"]*)"$`, tc.iUploadAnEmptyFile)
	sc.Step(`^I submit an upload request without a file$`, tc.iSubmitAnUploadRequestWithoutAFile)
	sc.Step(`^I have uploaded a file "([^"]*)" with content type "([^"]*)"$`, tc.iHaveUploadedAFileWithContentType)

	// Media steps
	sc.Step(`^I request the media file with the returned URL$`, tc.iRequestTheMediaFileWithTheReturnedURL)
	sc.Step(`^I request the thumbnail with the returned thumb URL$`, tc.iRequestTheThumbnailWithTheReturnedThumbURL)

	// Delete steps
	sc.Step(`^I delete the uploaded file$`, tc.iDeleteTheUploadedFile)

	// Generic HTTP steps
	sc.Step(`^I send a (GET|POST|DELETE) request to "([^"]*)"$`, tc.iSendARequestTo)

	// Response assertions
	sc.Step(`^the response status should be (\d+)$`, tc.theResponseStatusShouldBe)
	sc.Step(`^the response should contain "([^"]*)" equal to (true|false)$`, tc.theResponseShouldContainEqualToBool)
	sc.Step(`^the response should contain "([^"]*)" equal to "([^"]*)"$`, tc.theResponseShouldContainEqualToString)
	sc.Step(`^the response should contain a "([^"]*)" field$`, tc.theResponseShouldContainAField)
	sc.Step(`^the response header "([^"]*)" should be "([^"]*)"$`, tc.theResponseHeaderShouldBe)
	sc.Step(`^the response header "([^"]*)" should contain "([^"]*)"$`, tc.theResponseHeaderShouldContain)
}

func TestFeatures(t *testing.T) {
	suite := godog.TestSuite{
		ScenarioInitializer: InitializeScenario,
		Options: &godog.Options{
			Format:   "pretty",
			Paths:    []string{"features"},
			TestingT: t,
		},
	}

	if suite.Run() != 0 {
		t.Fatal("BDD tests failed")
	}
}
