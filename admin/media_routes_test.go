package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	auth "github.com/goliatone/go-auth"
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
	payload, err := io.ReadAll(input.Reader)
	if err != nil {
		return MediaItem{}, err
	}
	item := MediaItem{
		ID:        "upload-1",
		Name:      firstNonEmpty(input.Name, input.FileName),
		URL:       "/uploads/" + firstNonEmpty(input.FileName, "upload.bin"),
		Thumbnail: "/uploads/" + firstNonEmpty(input.FileName, "upload.bin"),
		Type:      "image",
		MIMEType:  input.ContentType,
		Size:      int64(len(payload)),
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
	return newMediaRouteServerWithDeps(t, authz, lib, featureGate, Dependencies{})
}

func newMediaRouteServerWithDeps(t *testing.T, authz Authorizer, lib MediaLibrary, featureGate fggate.FeatureGate, deps Dependencies) router.Server[*httprouter.Router] {
	t.Helper()
	cfg := Config{
		BasePath:              "/admin",
		DefaultLocale:         "en",
		MediaPermission:       "perm.view",
		MediaCreatePermission: "perm.create",
		MediaUpdatePermission: "perm.update",
		MediaDeletePermission: "perm.delete",
	}
	deps.FeatureGate = featureGate
	deps.MediaLibrary = lib
	adm := mustNewAdmin(t, cfg, deps)
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

type mediaCapabilityOverrideTestLibrary struct {
	*mediaRouteTestLibrary
	overrides MediaCapabilityOverrides
}

func (l *mediaCapabilityOverrideTestLibrary) MediaCapabilityOverrides(context.Context) (MediaCapabilityOverrides, error) {
	return l.overrides, nil
}

func TestMediaCapabilitiesClampUnauthorizedProviderClaims(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	server := newMediaRouteServer(t, allowPermissionAuthorizer{allowed: "perm.view"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))
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
	if payload.Operations.Upload || payload.Operations.Presign || payload.Operations.Confirm || payload.Operations.Delete {
		t.Fatalf("unauthorized operations should be clamped: %+v", payload.Operations)
	}
	if payload.Upload.DirectUpload || payload.Upload.Presign {
		t.Fatalf("unauthorized upload modes should be clamped: %+v", payload.Upload)
	}
}

func TestMediaCapabilityOverridesCanAdjustPartialFieldsWithoutResettingBooleans(t *testing.T) {
	maxSize := int64(1024)
	acceptedKinds := []string{"image", "audio"}
	lib := &mediaCapabilityOverrideTestLibrary{
		mediaRouteTestLibrary: newMediaRouteTestLibrary(),
		overrides: MediaCapabilityOverrides{
			Upload: MediaUploadCapabilityOverrides{
				MaxSize:       &maxSize,
				AcceptedKinds: &acceptedKinds,
			},
		},
	}
	server := newMediaRouteServer(t, allowAll{}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))
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
	if !payload.Operations.Upload || !payload.Operations.Presign || !payload.Operations.Resolve {
		t.Fatalf("partial overrides should not reset supported operations: %+v", payload.Operations)
	}
	if payload.Upload.MaxSize != maxSize {
		t.Fatalf("expected max size %d, got %d", maxSize, payload.Upload.MaxSize)
	}
	if len(payload.Upload.AcceptedKinds) != len(acceptedKinds) {
		t.Fatalf("expected accepted kinds %v, got %v", acceptedKinds, payload.Upload.AcceptedKinds)
	}
}

func TestMediaMutationRoutesEmitDefaultActivityEntries(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	feed := NewActivityFeed()
	server := newMediaRouteServerWithDeps(
		t,
		allowPermissionAuthorizer{allowed: "perm.create"},
		lib,
		featureGateFromKeys(FeatureMedia, FeatureCMS),
		Dependencies{ActivitySink: feed},
	)

	uploadReq := newMultipartMediaRequest(t, "/admin/api/media/upload", "hero.jpg", "image/jpeg", []byte("hero"))
	uploadReq = uploadReq.WithContext(auth.WithActorContext(uploadReq.Context(), &auth.ActorContext{ActorID: "editor-upload"}))
	uploadResp := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(uploadResp, uploadReq)
	if uploadResp.Code != 200 {
		t.Fatalf("expected upload 200, got %d", uploadResp.Code)
	}

	updateServer := newMediaRouteServerWithDeps(
		t,
		allowPermissionAuthorizer{allowed: "perm.update"},
		lib,
		featureGateFromKeys(FeatureMedia, FeatureCMS),
		Dependencies{ActivitySink: feed},
	)
	updateReq := httptest.NewRequest("PATCH", "/admin/api/media/library/1", bytes.NewBufferString(`{"metadata":{"alt_text":"Hero image"}}`))
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq = updateReq.WithContext(auth.WithActorContext(updateReq.Context(), &auth.ActorContext{ActorID: "editor-update"}))
	updateResp := httptest.NewRecorder()
	updateServer.WrappedRouter().ServeHTTP(updateResp, updateReq)
	if updateResp.Code != 200 {
		t.Fatalf("expected update 200, got %d", updateResp.Code)
	}

	deleteServer := newMediaRouteServerWithDeps(
		t,
		allowPermissionAuthorizer{allowed: "perm.delete"},
		lib,
		featureGateFromKeys(FeatureMedia, FeatureCMS),
		Dependencies{ActivitySink: feed},
	)
	deleteReq := httptest.NewRequest("DELETE", "/admin/api/media/library/1", nil)
	deleteReq = deleteReq.WithContext(auth.WithActorContext(deleteReq.Context(), &auth.ActorContext{ActorID: "editor-delete"}))
	deleteResp := httptest.NewRecorder()
	deleteServer.WrappedRouter().ServeHTTP(deleteResp, deleteReq)
	if deleteResp.Code != 200 {
		t.Fatalf("expected delete 200, got %d", deleteResp.Code)
	}

	entries, err := feed.List(context.Background(), 100)
	if err != nil {
		t.Fatalf("list activity: %v", err)
	}
	entries = filterActivityEntries(entries, "media.")
	if len(entries) != 3 {
		t.Fatalf("expected 3 media activity entries, got %+v", entries)
	}
	if entries[0].Action != "media.deleted" || entries[0].Actor != "editor-delete" {
		t.Fatalf("expected delete activity entry, got %+v", entries[0])
	}
	if got := toString(entries[0].Metadata["request_kind"]); got != "delete" {
		t.Fatalf("expected delete request_kind, got %+v", entries[0].Metadata)
	}
	if entries[1].Action != "media.updated" || entries[1].Actor != "editor-update" {
		t.Fatalf("expected update activity entry, got %+v", entries[1])
	}
	if got := toString(entries[1].Metadata["request_kind"]); got != "update" {
		t.Fatalf("expected update request_kind, got %+v", entries[1].Metadata)
	}
	if entries[2].Action != "media.created" || entries[2].Actor != "editor-upload" {
		t.Fatalf("expected create activity entry, got %+v", entries[2])
	}
	if got := toString(entries[2].Metadata["request_kind"]); got != "upload" {
		t.Fatalf("expected upload request_kind, got %+v", entries[2].Metadata)
	}
}

func TestMediaMutationActivityHookCanOverrideAppendAndSuppress(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	feed := NewActivityFeed()
	hook := func(_ context.Context, event MediaMutationEvent) (MediaActivityDecision, error) {
		switch event.Operation {
		case MediaMutationUpdate:
			entry := *event.DefaultEntry
			entry.Action = "media.updated.enriched"
			entry.Metadata["hook"] = "update"
			return MediaActivityDecision{
				Primary: &entry,
				Additional: []ActivityEntry{{
					Action:   "media.audit",
					Object:   joinObject("media", event.MediaID),
					Channel:  "media",
					Metadata: map[string]any{"operation": "update"},
				}},
			}, nil
		case MediaMutationDelete:
			return MediaActivityDecision{SuppressDefault: true}, nil
		default:
			return MediaActivityDecision{}, nil
		}
	}

	updateServer := newMediaRouteServerWithDeps(
		t,
		allowPermissionAuthorizer{allowed: "perm.update"},
		lib,
		featureGateFromKeys(FeatureMedia, FeatureCMS),
		Dependencies{ActivitySink: feed, MediaActivityHook: hook},
	)
	updateReq := httptest.NewRequest("PATCH", "/admin/api/media/library/1", bytes.NewBufferString(`{"metadata":{"alt_text":"Hero image"}}`))
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq = updateReq.WithContext(auth.WithActorContext(updateReq.Context(), &auth.ActorContext{ActorID: "editor-update"}))
	updateResp := httptest.NewRecorder()
	updateServer.WrappedRouter().ServeHTTP(updateResp, updateReq)
	if updateResp.Code != 200 {
		t.Fatalf("expected update 200, got %d", updateResp.Code)
	}

	deleteServer := newMediaRouteServerWithDeps(
		t,
		allowPermissionAuthorizer{allowed: "perm.delete"},
		lib,
		featureGateFromKeys(FeatureMedia, FeatureCMS),
		Dependencies{ActivitySink: feed, MediaActivityHook: hook},
	)
	deleteReq := httptest.NewRequest("DELETE", "/admin/api/media/library/1", nil)
	deleteReq = deleteReq.WithContext(auth.WithActorContext(deleteReq.Context(), &auth.ActorContext{ActorID: "editor-delete"}))
	deleteResp := httptest.NewRecorder()
	deleteServer.WrappedRouter().ServeHTTP(deleteResp, deleteReq)
	if deleteResp.Code != 200 {
		t.Fatalf("expected delete 200, got %d", deleteResp.Code)
	}

	entries, err := feed.List(context.Background(), 100)
	if err != nil {
		t.Fatalf("list activity: %v", err)
	}
	entries = filterActivityEntries(entries, "media.")
	if len(entries) != 2 {
		t.Fatalf("expected 2 media activity entries, got %+v", entries)
	}
	if entries[0].Action != "media.audit" {
		t.Fatalf("expected audit entry first, got %+v", entries[0])
	}
	if entries[1].Action != "media.updated.enriched" {
		t.Fatalf("expected enriched update entry, got %+v", entries[1])
	}
	if got := toString(entries[1].Metadata["hook"]); got != "update" {
		t.Fatalf("expected hook metadata on enriched entry, got %+v", entries[1].Metadata)
	}
}

func newMultipartMediaRequest(t *testing.T, path, filename, contentType string, payload []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		t.Fatalf("create multipart file: %v", err)
	}
	if _, err := part.Write(payload); err != nil {
		t.Fatalf("write multipart payload: %v", err)
	}
	if err := writer.WriteField("name", filename); err != nil {
		t.Fatalf("write multipart field: %v", err)
	}
	if contentType != "" {
		if err := writer.WriteField("content_type", contentType); err != nil {
			t.Fatalf("write multipart content type: %v", err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}
	req := httptest.NewRequest("POST", path, &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func filterActivityEntries(entries []ActivityEntry, prefix string) []ActivityEntry {
	filtered := make([]ActivityEntry, 0, len(entries))
	for _, entry := range entries {
		if strings.HasPrefix(strings.TrimSpace(entry.Action), prefix) {
			filtered = append(filtered, entry)
		}
	}
	return filtered
}
