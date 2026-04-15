package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"strings"
	"testing"

	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
	"github.com/julienschmidt/httprouter"
)

type mediaRouteTestLibrary struct {
	items []MediaItem
}

func newMediaRouteTestLibrary() *mediaRouteTestLibrary {
	return &mediaRouteTestLibrary{
		items: []MediaItem{{
			ID:             "1",
			Name:           "hero.jpg",
			URL:            "/assets/hero.jpg",
			Thumbnail:      "/assets/hero-thumb.jpg",
			Type:           "image",
			MIMEType:       "image/jpeg",
			Status:         "ready",
			WorkflowStatus: "complete",
		}},
	}
}

func (l *mediaRouteTestLibrary) List(context.Context) ([]MediaItem, error) {
	return append([]MediaItem{}, l.items...), nil
}

func (l *mediaRouteTestLibrary) Add(_ context.Context, item MediaItem) (MediaItem, error) {
	if item.ID == "" {
		item.ID = "legacy-added"
	}
	l.items = append([]MediaItem{item}, l.items...)
	return item, nil
}

func (l *mediaRouteTestLibrary) GetMedia(_ context.Context, id string) (MediaItem, error) {
	for _, item := range l.items {
		if item.ID == id {
			return item, nil
		}
	}
	return MediaItem{}, notFoundDomainError("media item not found", map[string]any{"id": id})
}

func (l *mediaRouteTestLibrary) ResolveMedia(_ context.Context, ref MediaReference) (MediaItem, error) {
	for _, item := range l.items {
		if ref.ID != "" && item.ID == ref.ID {
			return item, nil
		}
		if ref.URL != "" && item.URL == ref.URL {
			return item, nil
		}
	}
	return MediaItem{}, notFoundDomainError("media item not found", map[string]any{"id": ref.ID, "url": ref.URL})
}

func (l *mediaRouteTestLibrary) UploadMedia(_ context.Context, input MediaUploadInput) (MediaItem, error) {
	_, _ = io.ReadAll(input.Reader)
	item := MediaItem{
		ID:        "upload-1",
		Name:      firstNonEmpty(input.Name, input.FileName),
		URL:       "/uploads/" + firstNonEmpty(input.FileName, "upload.bin"),
		Thumbnail: "/uploads/" + firstNonEmpty(input.FileName, "upload.bin"),
		Type:      "image",
		MIMEType:  input.ContentType,
		Status:    "ready",
		Metadata:  input.Metadata,
	}
	l.items = append([]MediaItem{item}, l.items...)
	return item, nil
}

func (l *mediaRouteTestLibrary) PresignMedia(_ context.Context, req MediaPresignRequest) (MediaPresignResponse, error) {
	return MediaPresignResponse{
		UploadURL: "/presigned/" + firstNonEmpty(req.FileName, "upload.bin"),
		Method:    "PUT",
		UploadID:  "pre-1",
	}, nil
}

func (l *mediaRouteTestLibrary) ConfirmMedia(_ context.Context, req MediaConfirmRequest) (MediaItem, error) {
	item := MediaItem{
		ID:        firstNonEmpty(req.UploadID, "confirm-1"),
		Name:      firstNonEmpty(req.Name, req.FileName),
		URL:       req.URL,
		Thumbnail: req.URL,
		Type:      "image",
		MIMEType:  req.ContentType,
		Status:    "ready",
		Metadata:  req.Metadata,
	}
	l.items = append([]MediaItem{item}, l.items...)
	return item, nil
}

func (l *mediaRouteTestLibrary) UpdateMedia(_ context.Context, id string, input MediaUpdateInput) (MediaItem, error) {
	for idx, item := range l.items {
		if item.ID != id {
			continue
		}
		if input.Name != "" {
			item.Name = input.Name
		}
		if input.Status != "" {
			item.Status = input.Status
		}
		if input.Metadata != nil {
			item.Metadata = input.Metadata
		}
		l.items[idx] = item
		return item, nil
	}
	return MediaItem{}, notFoundDomainError("media item not found", map[string]any{"id": id})
}

func (l *mediaRouteTestLibrary) DeleteMedia(_ context.Context, id string) error {
	for idx, item := range l.items {
		if item.ID == id {
			l.items = append(l.items[:idx], l.items[idx+1:]...)
			return nil
		}
	}
	return notFoundDomainError("media item not found", map[string]any{"id": id})
}

func (l *mediaRouteTestLibrary) MediaCapabilities(context.Context) (MediaCapabilities, error) {
	return MediaCapabilities{
		Operations: MediaOperationCapabilities{
			List:         true,
			Get:          true,
			Resolve:      true,
			Upload:       true,
			Presign:      true,
			Confirm:      true,
			Update:       true,
			Delete:       true,
			LegacyCreate: true,
		},
		Upload: MediaUploadCapabilities{
			DirectUpload:      true,
			Presign:           true,
			MaxSize:           10 << 20,
			AcceptedKinds:     []string{"image"},
			AcceptedMIMETypes: []string{"image/jpeg"},
		},
		Picker: MediaPickerCapabilities{
			ValueModes:       []MediaValueMode{MediaValueModeURL, MediaValueModeID},
			DefaultValueMode: MediaValueModeURL,
		},
	}, nil
}

type allowPermissionAuthorizer struct {
	allowed string
}

func (a allowPermissionAuthorizer) Can(_ context.Context, action string, _ string) bool {
	return action == a.allowed
}

func newMediaRouteServer(t *testing.T, authz Authorizer, lib MediaLibrary, featureGate fggate.FeatureGate) router.Server[*httprouter.Router] {
	t.Helper()
	cfg := Config{
		BasePath:              "/admin",
		DefaultLocale:         "en",
		MediaPermission:       "perm.view",
		MediaCreatePermission: "perm.create",
		MediaUpdatePermission: "perm.update",
		MediaDeletePermission: "perm.delete",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{
		FeatureGate:  featureGate,
		MediaLibrary: lib,
	})
	if authz != nil {
		adm.WithAuthorizer(authz)
	}
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("init admin: %v", err)
	}
	return server
}

func TestMediaRoutesUsePermissionMatrix(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	viewServer := newMediaRouteServer(t, allowPermissionAuthorizer{allowed: "perm.view"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))
	assertMediaStatus(t, viewServer, "GET", "/admin/api/media/library", nil, nil, 200)
	assertMediaStatus(t, viewServer, "GET", "/admin/api/media/library/1", nil, nil, 200)
	assertMediaStatus(t, viewServer, "POST", "/admin/api/media/resolve", bytes.NewBufferString(`{"id":"1"}`), map[string]string{"Content-Type": "application/json"}, 200)
	assertMediaStatus(t, viewServer, "GET", "/admin/api/media/capabilities", nil, nil, 200)
	assertMediaStatus(t, viewServer, "POST", "/admin/api/media/presign", bytes.NewBufferString(`{}`), map[string]string{"Content-Type": "application/json"}, 403)
	assertMediaStatus(t, viewServer, "PATCH", "/admin/api/media/library/1", bytes.NewBufferString(`{}`), map[string]string{"Content-Type": "application/json"}, 403)
	assertMediaStatus(t, viewServer, "DELETE", "/admin/api/media/library/1", nil, nil, 403)

	createServer := newMediaRouteServer(t, allowPermissionAuthorizer{allowed: "perm.create"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))
	assertMediaStatus(t, createServer, "POST", "/admin/api/media/presign", bytes.NewBufferString(`{"file_name":"hero.jpg"}`), map[string]string{"Content-Type": "application/json"}, 200)
	assertMediaStatus(t, createServer, "POST", "/admin/api/media/confirm", bytes.NewBufferString(`{"upload_id":"u1","url":"/uploads/hero.jpg"}`), map[string]string{"Content-Type": "application/json"}, 200)
	assertMultipartMediaStatus(t, createServer, "/admin/api/media/upload", 200)

	updateServer := newMediaRouteServer(t, allowPermissionAuthorizer{allowed: "perm.update"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))
	assertMediaStatus(t, updateServer, "PATCH", "/admin/api/media/library/1", bytes.NewBufferString(`{"name":"renamed.jpg"}`), map[string]string{"Content-Type": "application/json"}, 200)

	deleteServer := newMediaRouteServer(t, allowPermissionAuthorizer{allowed: "perm.delete"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))
	assertMediaStatus(t, deleteServer, "DELETE", "/admin/api/media/library/1", nil, nil, 200)
}

func TestMediaRoutesRemainFeatureGated(t *testing.T) {
	server := newMediaRouteServer(t, allowAll{}, newMediaRouteTestLibrary(), featureGateFromKeys(FeatureCMS))
	req := httptest.NewRequest("GET", "/admin/api/media/library", nil)
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code < 400 {
		t.Fatalf("expected gated media route to fail when feature disabled, got %d body=%s", res.Code, res.Body.String())
	}
	if !strings.Contains(strings.ToLower(res.Body.String()), "media") {
		t.Fatalf("expected media feature error body, got %s", res.Body.String())
	}
}

func TestMediaLegacyLibraryRoutesRemainCompatible(t *testing.T) {
	server := newMediaRouteServer(t, allowAll{}, NewInMemoryMediaLibrary("/admin"), featureGateFromKeys(FeatureMedia, FeatureCMS))
	assertMediaStatus(t, server, "GET", "/admin/api/media/library", nil, nil, 200)
	assertMediaStatus(t, server, "POST", "/admin/api/media/library", bytes.NewBufferString(`{"name":"asset","url":"/assets/asset.jpg"}`), map[string]string{"Content-Type": "application/json"}, 200)
	assertMediaStatus(t, server, "GET", "/admin/api/media/library/1", nil, nil, 200)
	assertMediaStatus(t, server, "POST", "/admin/api/media/resolve", bytes.NewBufferString(`{"id":"1"}`), map[string]string{"Content-Type": "application/json"}, 200)
}

func assertMediaStatus(t *testing.T, server router.Server[*httprouter.Router], method, path string, body io.Reader, headers map[string]string, want int) {
	t.Helper()
	req := httptest.NewRequest(method, path, body)
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != want {
		t.Fatalf("%s %s: expected %d, got %d body=%s", method, path, want, res.Code, res.Body.String())
	}
}

func assertMultipartMediaStatus(t *testing.T, server router.Server[*httprouter.Router], path string, want int) {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "upload.jpg")
	if err != nil {
		t.Fatalf("create multipart file: %v", err)
	}
	if _, err := part.Write([]byte("image-data")); err != nil {
		t.Fatalf("write multipart file: %v", err)
	}
	if err := writer.WriteField("name", "upload.jpg"); err != nil {
		t.Fatalf("write multipart field: %v", err)
	}
	if err := writer.WriteField("metadata", `{"source":"test"}`); err != nil {
		t.Fatalf("write multipart metadata: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}
	req := httptest.NewRequest("POST", path, &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != want {
		t.Fatalf("POST %s: expected %d, got %d body=%s", path, want, res.Code, res.Body.String())
	}
}

func TestDefaultAdminAPIRoutesIncludeMediaContractKeys(t *testing.T) {
	routes := defaultAdminAPIRoutes()
	expected := map[string]string{
		"media.library":      "/media/library",
		"media.item":         "/media/library/:id",
		"media.resolve":      "/media/resolve",
		"media.upload":       "/media/upload",
		"media.presign":      "/media/presign",
		"media.confirm":      "/media/confirm",
		"media.capabilities": "/media/capabilities",
	}
	for key, want := range expected {
		if got := routes[key]; got != want {
			t.Fatalf("route %q: expected %q, got %q", key, want, got)
		}
	}
}

func TestMediaCapabilitiesRouteReturnsRequestScopedCapabilities(t *testing.T) {
	server := newMediaRouteServer(t, allowAll{}, newMediaRouteTestLibrary(), featureGateFromKeys(FeatureMedia, FeatureCMS))
	req := httptest.NewRequest("GET", "/admin/api/media/capabilities", nil)
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != 200 {
		t.Fatalf("capabilities status: %d body=%s", res.Code, res.Body.String())
	}
	var payload MediaCapabilities
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode capabilities: %v", err)
	}
	if !payload.Operations.Upload || !payload.Upload.DirectUpload || payload.Picker.DefaultValueMode != MediaValueModeURL {
		t.Fatalf("unexpected capabilities payload: %+v", payload)
	}
}
