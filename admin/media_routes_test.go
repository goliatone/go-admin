package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
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
			Size:           102400,
			Status:         "ready",
			WorkflowStatus: "complete",
		}},
	}
}

func (l *mediaRouteTestLibrary) QueryMedia(_ context.Context, query MediaQuery) (MediaPage, error) {
	return mediaPageFromItems(append([]MediaItem{}, l.items...), query), nil
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
		Size:      req.Size,
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
			List:    true,
			Get:     true,
			Resolve: true,
			Upload:  true,
			Presign: true,
			Confirm: true,
			Update:  true,
			Delete:  true,
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

type queryOnlyMediaRouteLibrary struct {
	items []MediaItem
}

func (l queryOnlyMediaRouteLibrary) QueryMedia(_ context.Context, query MediaQuery) (MediaPage, error) {
	return mediaPageFromItems(append([]MediaItem{}, l.items...), query), nil
}

type mediaDeliveryRouteAdapter struct {
	response MediaDeliveryResponse
	err      error
}

func (a mediaDeliveryRouteAdapter) ResolveMediaDelivery(context.Context, MediaDeliveryRequest) (MediaDeliveryResponse, error) {
	return a.response, a.err
}

type mediaDeliveryRouteAdapterFunc func(context.Context, MediaDeliveryRequest) (MediaDeliveryResponse, error)

func (f mediaDeliveryRouteAdapterFunc) ResolveMediaDelivery(ctx context.Context, req MediaDeliveryRequest) (MediaDeliveryResponse, error) {
	return f(ctx, req)
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
	return newMediaRouteServerWithConfigDeps(t, cfg, authz, lib, featureGate, deps)
}

func newMediaRouteServerWithConfigDeps(t *testing.T, cfg Config, authz Authorizer, lib MediaLibrary, featureGate fggate.FeatureGate, deps Dependencies) router.Server[*httprouter.Router] {
	t.Helper()
	if strings.TrimSpace(cfg.BasePath) == "" {
		cfg.BasePath = "/admin"
	}
	if strings.TrimSpace(cfg.DefaultLocale) == "" {
		cfg.DefaultLocale = "en"
	}
	if strings.TrimSpace(cfg.MediaPermission) == "" {
		cfg.MediaPermission = "perm.view"
	}
	if strings.TrimSpace(cfg.MediaCreatePermission) == "" {
		cfg.MediaCreatePermission = "perm.create"
	}
	if strings.TrimSpace(cfg.MediaUpdatePermission) == "" {
		cfg.MediaUpdatePermission = "perm.update"
	}
	if strings.TrimSpace(cfg.MediaDeletePermission) == "" {
		cfg.MediaDeletePermission = "perm.delete"
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
	assertMediaStatus(t, viewServer, "GET", "/admin/api/media/assets", nil, nil, 200)
	assertMediaStatus(t, viewServer, "GET", "/admin/api/media/assets/1", nil, nil, 200)
	assertMediaStatus(t, viewServer, "POST", "/admin/api/media/resolve", bytes.NewBufferString(`{"id":"1"}`), map[string]string{"Content-Type": "application/json"}, 200)
	assertMediaStatus(t, viewServer, "GET", "/admin/api/media/capabilities", nil, nil, 200)
	assertMediaStatus(t, viewServer, "POST", "/admin/api/media/presign", bytes.NewBufferString(`{}`), map[string]string{"Content-Type": "application/json"}, 403)
	assertMediaStatus(t, viewServer, "PATCH", "/admin/api/media/assets/1", bytes.NewBufferString(`{}`), map[string]string{"Content-Type": "application/json"}, 403)
	assertMediaStatus(t, viewServer, "DELETE", "/admin/api/media/assets/1", nil, nil, 403)

	createServer := newMediaRouteServer(t, allowPermissionAuthorizer{allowed: "perm.create"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))
	assertMediaStatus(t, createServer, "POST", "/admin/api/media/presign", bytes.NewBufferString(`{"file_name":"hero.jpg"}`), map[string]string{"Content-Type": "application/json"}, 200)
	assertMediaStatus(t, createServer, "POST", "/admin/api/media/confirm", bytes.NewBufferString(`{"upload_id":"u1","url":"/uploads/hero.jpg"}`), map[string]string{"Content-Type": "application/json"}, 200)
	assertMultipartMediaStatus(t, createServer, "/admin/api/media/upload", 200)

	updateServer := newMediaRouteServer(t, allowPermissionAuthorizer{allowed: "perm.update"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))
	assertMediaStatus(t, updateServer, "PATCH", "/admin/api/media/assets/1", bytes.NewBufferString(`{"name":"renamed.jpg"}`), map[string]string{"Content-Type": "application/json"}, 200)

	deleteServer := newMediaRouteServer(t, allowPermissionAuthorizer{allowed: "perm.delete"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))
	assertMediaStatus(t, deleteServer, "DELETE", "/admin/api/media/assets/1", nil, nil, 200)
}

func TestMediaRoutesRemainFeatureGated(t *testing.T) {
	server := newMediaRouteServer(t, allowAll{}, newMediaRouteTestLibrary(), featureGateFromKeys(FeatureCMS))
	req := httptest.NewRequest("GET", "/admin/api/media/assets", nil)
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code < 400 {
		t.Fatalf("expected gated media route to fail when feature disabled, got %d body=%s", res.Code, res.Body.String())
	}
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected module-owned media routes to be absent when feature disabled, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestMediaModernLibraryRoutesRemainCompatible(t *testing.T) {
	server := newMediaRouteServer(t, allowAll{}, NewInMemoryMediaLibrary("/admin"), featureGateFromKeys(FeatureMedia, FeatureCMS))
	listPayload := assertMediaJSON[MediaPage](t, server, "GET", "/admin/api/media/assets", nil, nil, 200)
	if len(listPayload.Items) == 0 || listPayload.Items[0].Size <= 0 {
		t.Fatalf("expected seeded media list response to include nonzero size, got %+v", listPayload.Items)
	}
	assertMediaStatus(t, server, "POST", "/admin/api/media/assets", bytes.NewBufferString(`{"name":"asset","url":"/assets/asset.jpg","size":12345}`), map[string]string{"Content-Type": "application/json"}, 405)
	assertMediaStatus(t, server, "GET", "/admin/api/media/assets/1", nil, nil, 200)
	assertMediaStatus(t, server, "POST", "/admin/api/media/resolve", bytes.NewBufferString(`{"id":"1"}`), map[string]string{"Content-Type": "application/json"}, 200)
}

func TestMediaAdminDeliveryCanBeDisabledWithoutDisablingJSONAPIs(t *testing.T) {
	adminDeliveryDisabled := false
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		MediaDelivery: MediaDeliveryConfig{
			AdminEnabled: &adminDeliveryDisabled,
		},
	}
	lib := newMediaRouteTestLibrary()
	lib.items[0].URL = "https://provider.example/raw/hero.jpg"
	server := newMediaRouteServerWithConfigDeps(t, cfg, allowAll{}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS), Dependencies{})

	payload := assertMediaJSON[map[string]any](t, server, "GET", "/admin/api/media/assets/1", nil, nil, http.StatusOK)
	if got := toString(payload["url"]); got != "" {
		t.Fatalf("expected disabled admin delivery not to expose raw url, got %q", got)
	}
	if got := toString(payload["asset_url"]); got != "" {
		t.Fatalf("expected disabled admin delivery not to expose admin asset_url, got %q", got)
	}
	assertMediaStatus(t, server, "GET", "/admin/api/media/assets", nil, nil, http.StatusOK)
	assertMediaStatus(t, server, "GET", "/admin/api/media/assets/1", nil, nil, http.StatusOK)
	assertMediaStatus(t, server, "GET", "/admin/api/media/delivery/1/asset", nil, nil, http.StatusNotFound)
}

func TestMediaPayloadsEmitAppOwnedDeliveryURLs(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	lib.items[0].URL = "https://drive.example/raw/hero.jpg"
	lib.items[0].Thumbnail = "https://drive.example/raw/hero-thumb.jpg"
	lib.items[0].Metadata = map[string]any{
		"provider":    "drive",
		"source_url":  "https://drive.example/raw/hero.jpg",
		"external_id": "drive-file-1",
		"storage_key": "private/hero.jpg",
		"alt_text":    "Hero",
	}
	server := newMediaRouteServer(t, allowAll{}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))

	payload := assertMediaJSON[map[string]any](t, server, "GET", "/admin/api/media/assets", nil, nil, 200)
	items, ok := payload["items"].([]any)
	if !ok || len(items) != 1 {
		t.Fatalf("expected one media item, got %+v", payload["items"])
	}
	item, ok := items[0].(map[string]any)
	if !ok {
		t.Fatalf("expected media item object, got %+v", items[0])
	}
	assetURL := "/admin/api/media/delivery/1/asset"
	assertMediaPayloadUsesDeliveryURL(t, item, assetURL)
	if got := toString(item["thumbnail"]); got != "/admin/api/media/delivery/1/poster" {
		t.Fatalf("expected thumbnail to use poster delivery URL, got %q", got)
	}
	metadata, ok := item["metadata"].(map[string]any)
	if !ok {
		t.Fatalf("expected safe metadata object, got %+v", item["metadata"])
	}
	if got := toString(metadata["alt_text"]); got != "Hero" {
		t.Fatalf("expected safe metadata to remain, got %+v", metadata)
	}
	for _, key := range []string{"source_url", "external_id", "storage_key"} {
		if _, exists := metadata[key]; exists {
			t.Fatalf("provider provenance %q leaked in metadata: %+v", key, metadata)
		}
	}

	detail := assertMediaJSON[map[string]any](t, server, "GET", "/admin/api/media/assets/1", nil, nil, 200)
	assertMediaPayloadUsesDeliveryURL(t, detail, assetURL)
}

func TestMediaPayloadsDeepRedactProviderProvenance(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	lib.items[0].Metadata = map[string]any{
		"safe": "kept",
		"provider_data": map[string]any{
			"source_url": "https://drive.example/raw/hero.jpg",
			"label":      "Drive",
		},
		"sources": []any{
			map[string]any{
				"signed_url": "https://drive.example/signed/hero.jpg",
				"kind":       "preview",
			},
		},
	}
	server := newMediaRouteServer(t, allowAll{}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))

	payload := assertMediaJSON[map[string]any](t, server, "GET", "/admin/api/media/assets/1", nil, nil, 200)
	raw, err := json.Marshal(payload["metadata"])
	if err != nil {
		t.Fatalf("marshal metadata: %v", err)
	}
	for _, leaked := range []string{"source_url", "signed_url", "https://drive.example/raw", "https://drive.example/signed"} {
		if strings.Contains(string(raw), leaked) {
			t.Fatalf("provider provenance leaked through metadata %q: %s", leaked, raw)
		}
	}
	if !strings.Contains(string(raw), "kept") || !strings.Contains(string(raw), "Drive") || !strings.Contains(string(raw), "preview") {
		t.Fatalf("expected safe nested metadata to remain, got %s", raw)
	}
}

func TestMediaMutationResponsesAndActivityUseDeliveryURLs(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	feed := NewActivityFeed()
	server := newMediaRouteServerWithDeps(
		t,
		allowPermissionAuthorizer{allowed: "perm.create"},
		lib,
		featureGateFromKeys(FeatureMedia, FeatureCMS),
		Dependencies{ActivitySink: feed},
	)

	req := newMultipartMediaRequest(t, "/admin/api/media/upload", "hero.jpg", "image/jpeg", []byte("hero"))
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected upload 200, got %d body=%s", res.Code, res.Body.String())
	}
	var item map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &item); err != nil {
		t.Fatalf("decode upload response: %v", err)
	}
	assertMediaPayloadUsesDeliveryURL(t, item, "/admin/api/media/delivery/upload-1/asset")

	entries, err := feed.List(context.Background(), 10)
	if err != nil {
		t.Fatalf("list activity: %v", err)
	}
	entries = filterActivityEntries(entries, "media.")
	if len(entries) != 1 {
		t.Fatalf("expected upload activity entry, got %+v", entries)
	}
	for _, key := range []string{"url", "source_url", "external_id", "storage_key"} {
		if _, exists := entries[0].Metadata[key]; exists {
			t.Fatalf("activity metadata should not expose %q: %+v", key, entries[0].Metadata)
		}
	}
}

func TestMediaResolveAcceptsAppOwnedDeliveryURLMode(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	lib.items[0].URL = "https://provider.example/raw/hero.jpg"
	server := newMediaRouteServer(t, allowAll{}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))

	payload := assertMediaJSON[map[string]any](
		t,
		server,
		"POST",
		"/admin/api/media/resolve",
		bytes.NewBufferString(`{"url":"/admin/api/media/delivery/1/asset"}`),
		map[string]string{"Content-Type": "application/json"},
		200,
	)
	assertMediaPayloadUsesDeliveryURL(t, payload, "/admin/api/media/delivery/1/asset")
}

func TestMediaRoutesRequireExplicitLookupInterfaces(t *testing.T) {
	lib := queryOnlyMediaRouteLibrary{items: []MediaItem{{
		ID:       "1",
		Name:     "hero.jpg",
		URL:      "/assets/hero.jpg",
		Type:     "image",
		MIMEType: "image/jpeg",
		Size:     102400,
	}}}
	server := newMediaRouteServer(t, allowAll{}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))

	listPayload := assertMediaJSON[MediaPage](t, server, "GET", "/admin/api/media/assets", nil, nil, 200)
	if len(listPayload.Items) != 1 {
		t.Fatalf("expected query-only media list response, got %+v", listPayload.Items)
	}
	assertMediaStatus(t, server, "GET", "/admin/api/media/assets/1", nil, nil, 503)
	assertMediaStatus(t, server, "POST", "/admin/api/media/resolve", bytes.NewBufferString(`{"url":"/assets/hero.jpg"}`), map[string]string{"Content-Type": "application/json"}, 503)

	caps := assertMediaJSON[MediaCapabilities](t, server, "GET", "/admin/api/media/capabilities", nil, nil, 200)
	if !caps.Operations.List || caps.Operations.Get || caps.Operations.Resolve {
		t.Fatalf("expected query-only capabilities without lookup fallbacks, got %+v", caps.Operations)
	}
	if len(caps.Picker.ValueModes) != 1 || caps.Picker.ValueModes[0] != MediaValueModeURL {
		t.Fatalf("expected picker to fall back to URL mode without lookup interfaces, got %+v", caps.Picker)
	}
}

func assertMediaPayloadUsesDeliveryURL(t *testing.T, item map[string]any, assetURL string) {
	t.Helper()
	if got := toString(item["asset_url"]); got != assetURL {
		t.Fatalf("expected asset_url %q, got %q in %+v", assetURL, got, item)
	}
	if got := toString(item["url"]); got != assetURL {
		t.Fatalf("expected url alias to equal asset_url %q, got %q", assetURL, got)
	}
	for key, suffix := range map[string]string{
		"stream_url":   "/stream",
		"poster_url":   "/poster",
		"download_url": "/download",
	} {
		got := toString(item[key])
		if !strings.HasSuffix(got, suffix) {
			t.Fatalf("expected %s to end with %s, got %q", key, suffix, got)
		}
	}
	delivery, ok := item["delivery"].(map[string]any)
	if !ok {
		t.Fatalf("expected delivery info object, got %+v", item["delivery"])
	}
	if state := toString(delivery["state"]); state != string(MediaDeliveryStateReady) {
		t.Fatalf("expected ready delivery state, got %+v", delivery)
	}
}

func TestWithMediaLibraryOverridesRouteLibrary(t *testing.T) {
	cfg := Config{
		BasePath:              "/admin",
		DefaultLocale:         "en",
		MediaPermission:       "perm.view",
		MediaCreatePermission: "perm.create",
		MediaUpdatePermission: "perm.update",
		MediaDeletePermission: "perm.delete",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{
		FeatureGate:  featureGateFromKeys(FeatureMedia, FeatureCMS),
		MediaLibrary: NewInMemoryMediaLibrary("/admin"),
	})
	adm.WithAuthorizer(allowPermissionAuthorizer{allowed: "perm.view"})
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("init admin: %v", err)
	}

	replacement := &mediaRouteTestLibrary{items: []MediaItem{{
		ID:       "replacement",
		Name:     "replacement.jpg",
		URL:      "/assets/replacement.jpg",
		Type:     "image",
		MIMEType: "image/jpeg",
		Size:     98765,
		Status:   "ready",
	}}}
	adm.WithMediaLibrary(replacement)

	payload := assertMediaJSON[MediaPage](t, server, "GET", "/admin/api/media/assets", nil, nil, 200)
	if len(payload.Items) != 1 || payload.Items[0].ID != "replacement" || payload.Items[0].Size != 98765 {
		t.Fatalf("expected route to use replacement media library, got %+v", payload.Items)
	}
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

func assertMediaJSON[T any](t *testing.T, server router.Server[*httprouter.Router], method, path string, body io.Reader, headers map[string]string, want int) T {
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
	var payload T
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode %s %s response: %v body=%s", method, path, err, res.Body.String())
	}
	return payload
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
		"media.assets.list":       "/media/assets",
		"media.assets.item":       "/media/assets/:id",
		"media.resolve":           "/media/resolve",
		"media.upload":            "/media/upload",
		"media.presign":           "/media/presign",
		"media.confirm":           "/media/confirm",
		"media.capabilities":      "/media/capabilities",
		"media.delivery.asset":    "/media/delivery/:id/asset",
		"media.delivery.stream":   "/media/delivery/:id/stream",
		"media.delivery.poster":   "/media/delivery/:id/poster",
		"media.delivery.download": "/media/delivery/:id/download",
	}
	for key, want := range expected {
		if got := routes[key]; got != want {
			t.Fatalf("route %q: expected %q, got %q", key, want, got)
		}
	}
	for _, legacy := range []string{"media.library", "media.item"} {
		if _, ok := routes[legacy]; ok {
			t.Fatalf("legacy route key %q must not be registered", legacy)
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
	updateReq := httptest.NewRequest("PATCH", "/admin/api/media/assets/1", bytes.NewBufferString(`{"metadata":{"alt_text":"Hero image"}}`))
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
	deleteReq := httptest.NewRequest("DELETE", "/admin/api/media/assets/1", nil)
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
	updateReq := httptest.NewRequest("PATCH", "/admin/api/media/assets/1", bytes.NewBufferString(`{"metadata":{"alt_text":"Hero image"}}`))
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
	deleteReq := httptest.NewRequest("DELETE", "/admin/api/media/assets/1", nil)
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

func TestAdminMediaDeliveryRoutesHandleRedirectHeadAndUnavailable(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	lib.items[0].Metadata = map[string]any{"provider": "redirect"}
	registry := NewMediaDeliveryRegistry()
	if err := registry.Register("redirect", mediaDeliveryRouteAdapter{
		response: MediaDeliveryResponse{
			Mode: MediaDeliveryModeRedirect,
			Redirect: &MediaDeliveryRedirect{
				URL:    "https://cdn.example/hero.jpg",
				Status: http.StatusTemporaryRedirect,
				Cache:  "private, max-age=60",
			},
		},
	}); err != nil {
		t.Fatalf("register delivery adapter: %v", err)
	}
	server := newMediaRouteServerWithDeps(t, allowPermissionAuthorizer{allowed: "perm.view"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS), Dependencies{
		MediaDeliveryRegistry: registry,
	})

	req := httptest.NewRequest("GET", "/admin/api/media/delivery/1/asset", nil)
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusTemporaryRedirect {
		t.Fatalf("expected redirect status, got %d body=%s", res.Code, res.Body.String())
	}
	if got := res.Header().Get("Location"); got != "https://cdn.example/hero.jpg" {
		t.Fatalf("expected redirect location, got %q", got)
	}
	if got := res.Header().Get("Cache-Control"); got != "private, max-age=60" {
		t.Fatalf("expected cache header, got %q", got)
	}

	req = httptest.NewRequest("HEAD", "/admin/api/media/delivery/1/asset", nil)
	res = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusTemporaryRedirect || res.Body.Len() != 0 {
		t.Fatalf("expected HEAD redirect without body, got status=%d body=%q", res.Code, res.Body.String())
	}

	missingReq := httptest.NewRequest("GET", "/admin/api/media/delivery/1/stream", nil)
	missingRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(missingRes, missingReq)
	if missingRes.Code != http.StatusTemporaryRedirect {
		t.Fatalf("same provider should handle stream redirect, got %d body=%s", missingRes.Code, missingRes.Body.String())
	}
}

func TestPublicMediaDeliveryRoutesAuthorizeAndResolve(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	lib.items[0].Metadata = map[string]any{"provider": "public"}
	called := false
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		MediaDelivery: MediaDeliveryConfig{
			Public: MediaPublicDeliveryConfig{
				Enabled: true,
				Authorizer: func(_ context.Context, auth MediaPublicDeliveryAuthorization) error {
					if auth.MediaID != "1" || auth.Intent != string(MediaDeliveryIntentAsset) || auth.Request == nil {
						t.Fatalf("unexpected public auth context: %+v", auth)
					}
					called = true
					return nil
				},
			},
		},
	}
	registry := NewMediaDeliveryRegistry()
	if err := registry.Register("public", mediaDeliveryRouteAdapterFunc(func(context.Context, MediaDeliveryRequest) (MediaDeliveryResponse, error) {
		return MediaDeliveryResponse{
			Mode: MediaDeliveryModeProxy,
			Proxy: &MediaDeliveryProxy{
				Reader:        io.NopCloser(strings.NewReader("public-bytes")),
				ContentType:   "text/plain",
				ContentLength: int64(len("public-bytes")),
			},
		}, nil
	})); err != nil {
		t.Fatalf("register public adapter: %v", err)
	}
	server := newMediaRouteServerWithConfigDeps(t, cfg, allowPermissionAuthorizer{allowed: "perm.view"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS), Dependencies{
		MediaDeliveryRegistry: registry,
	})

	req := httptest.NewRequest("GET", "/api/v1/media/delivery/1/asset", nil)
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusOK || res.Body.String() != "public-bytes" {
		t.Fatalf("expected public delivery response, got status=%d body=%q", res.Code, res.Body.String())
	}
	if !called {
		t.Fatalf("expected public authorizer to run")
	}
}

func TestPublicMediaDeliveryRoutesFailClosedWhenAuthorizationFails(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	lib.items[0].Metadata = map[string]any{"provider": "public"}
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		MediaDelivery: MediaDeliveryConfig{
			Public: MediaPublicDeliveryConfig{
				Enabled:    true,
				Authorizer: func(context.Context, MediaPublicDeliveryAuthorization) error { return ErrForbidden },
			},
		},
	}
	registry := NewMediaDeliveryRegistry()
	called := false
	if err := registry.Register("public", mediaDeliveryRouteAdapterFunc(func(context.Context, MediaDeliveryRequest) (MediaDeliveryResponse, error) {
		called = true
		return MediaDeliveryResponse{Mode: MediaDeliveryModeProxy, Proxy: &MediaDeliveryProxy{Reader: io.NopCloser(strings.NewReader("nope"))}}, nil
	})); err != nil {
		t.Fatalf("register public adapter: %v", err)
	}
	server := newMediaRouteServerWithConfigDeps(t, cfg, allowPermissionAuthorizer{allowed: "perm.view"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS), Dependencies{
		MediaDeliveryRegistry: registry,
	})

	assertMediaStatus(t, server, "GET", "/api/v1/media/delivery/1/asset", nil, nil, http.StatusForbidden)
	if called {
		t.Fatalf("public delivery adapter must not run when public authorization fails")
	}
}

func TestAdminMediaDeliveryRoutesHandleProxyDownloadAndErrors(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	lib.items[0].Metadata = map[string]any{"provider": "proxy"}
	registry := NewMediaDeliveryRegistry()
	if err := registry.Register("proxy", mediaDeliveryRouteAdapter{
		response: MediaDeliveryResponse{
			Mode: MediaDeliveryModeProxy,
			Proxy: &MediaDeliveryProxy{
				Reader:        io.NopCloser(strings.NewReader("media-bytes")),
				ContentType:   "image/jpeg",
				ContentLength: int64(len("media-bytes")),
				FileName:      "hero.jpg",
			},
		},
	}); err != nil {
		t.Fatalf("register delivery adapter: %v", err)
	}
	server := newMediaRouteServerWithDeps(t, allowPermissionAuthorizer{allowed: "perm.view"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS), Dependencies{
		MediaDeliveryRegistry: registry,
	})

	req := httptest.NewRequest("GET", "/admin/api/media/delivery/1/download", nil)
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusOK || res.Body.String() != "media-bytes" {
		t.Fatalf("expected proxied bytes, got status=%d body=%q", res.Code, res.Body.String())
	}
	if got := res.Header().Get("Content-Disposition"); !strings.Contains(got, "attachment") || !strings.Contains(got, "hero.jpg") {
		t.Fatalf("expected download disposition, got %q", got)
	}

	unauthorized := newMediaRouteServerWithDeps(t, allowPermissionAuthorizer{allowed: "perm.create"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS), Dependencies{
		MediaDeliveryRegistry: registry,
	})
	assertMediaStatus(t, unauthorized, "GET", "/admin/api/media/delivery/1/asset", nil, nil, http.StatusForbidden)

	missingAdapterServer := newMediaRouteServer(t, allowPermissionAuthorizer{allowed: "perm.view"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS))
	req = httptest.NewRequest("GET", "/admin/api/media/delivery/1/asset", nil)
	res = httptest.NewRecorder()
	missingAdapterServer.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected missing adapter 503, got %d body=%s", res.Code, res.Body.String())
	}

	assertMediaStatus(t, server, "GET", "/admin/api/media/delivery/missing/asset", nil, nil, http.StatusNotFound)
}

func TestAdminMediaDeliveryProxySupportsRanges(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	lib.items[0].Metadata = map[string]any{"provider": "proxy"}
	registry := NewMediaDeliveryRegistry()
	if err := registry.Register("proxy", mediaDeliveryRouteAdapterFunc(func(context.Context, MediaDeliveryRequest) (MediaDeliveryResponse, error) {
		return MediaDeliveryResponse{
			Mode: MediaDeliveryModeProxy,
			Proxy: &MediaDeliveryProxy{
				Reader:        io.NopCloser(strings.NewReader("0123456789")),
				ContentType:   "text/plain",
				ContentLength: 10,
				Range:         true,
			},
		}, nil
	})); err != nil {
		t.Fatalf("register delivery adapter: %v", err)
	}
	server := newMediaRouteServerWithDeps(t, allowPermissionAuthorizer{allowed: "perm.view"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS), Dependencies{
		MediaDeliveryRegistry: registry,
	})

	req := httptest.NewRequest("GET", "/admin/api/media/delivery/1/stream", nil)
	req.Header.Set("Range", "bytes=2-5")
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusPartialContent || res.Body.String() != "2345" {
		t.Fatalf("expected ranged proxy bytes, got status=%d body=%q", res.Code, res.Body.String())
	}
	if got := res.Header().Get("Accept-Ranges"); got != "bytes" {
		t.Fatalf("expected Accept-Ranges bytes, got %q", got)
	}
	if got := res.Header().Get("Content-Range"); got != "bytes 2-5/10" {
		t.Fatalf("expected Content-Range bytes 2-5/10, got %q", got)
	}

	req = httptest.NewRequest("HEAD", "/admin/api/media/delivery/1/stream", nil)
	req.Header.Set("Range", "bytes=2-5")
	res = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusPartialContent || res.Body.Len() != 0 {
		t.Fatalf("expected HEAD ranged proxy without body, got status=%d body=%q", res.Code, res.Body.String())
	}
	if got := res.Header().Get("Content-Length"); got != "4" {
		t.Fatalf("expected HEAD ranged proxy Content-Length 4, got %q", got)
	}
	if got := res.Header().Get("Content-Range"); got != "bytes 2-5/10" {
		t.Fatalf("expected HEAD ranged proxy Content-Range bytes 2-5/10, got %q", got)
	}

	req = httptest.NewRequest("GET", "/admin/api/media/delivery/1/stream", nil)
	req.Header.Set("Range", "bytes=20-25")
	res = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusRequestedRangeNotSatisfiable {
		t.Fatalf("expected invalid proxy range 416, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestAdminMediaDeliveryRequestExposesCredentialResolver(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	lib.items[0].Metadata = map[string]any{"provider": "drive"}
	registry := NewMediaDeliveryRegistry()
	if err := registry.Register("drive", mediaDeliveryRouteAdapterFunc(func(ctx context.Context, req MediaDeliveryRequest) (MediaDeliveryResponse, error) {
		credential, err := req.ResolveCredential(ctx, "media.read")
		if err != nil {
			return MediaDeliveryResponse{}, err
		}
		if credential.AccessToken != "drive-token" {
			t.Fatalf("expected drive-token credential, got %+v", credential)
		}
		return MediaDeliveryResponse{
			Mode: MediaDeliveryModeProxy,
			Proxy: &MediaDeliveryProxy{
				Reader:        io.NopCloser(strings.NewReader("drive-bytes")),
				ContentType:   "text/plain",
				ContentLength: int64(len("drive-bytes")),
			},
		}, nil
	})); err != nil {
		t.Fatalf("register delivery adapter: %v", err)
	}
	resolverCalled := false
	resolver := MediaDeliveryCredentialResolverFunc(func(_ context.Context, req MediaDeliveryCredentialRequest) (MediaDeliveryCredential, error) {
		resolverCalled = true
		if req.Provider != "drive" || req.MediaID != "1" || req.Intent != MediaDeliveryIntentAsset || len(req.Scopes) != 1 || req.Scopes[0] != "media.read" {
			t.Fatalf("unexpected credential request: %+v", req)
		}
		return MediaDeliveryCredential{AccessToken: "drive-token", TokenType: "Bearer"}, nil
	})
	server := newMediaRouteServerWithDeps(t, allowPermissionAuthorizer{allowed: "perm.view"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS), Dependencies{
		MediaDeliveryRegistry:           registry,
		MediaDeliveryCredentialResolver: resolver,
	})

	req := httptest.NewRequest("GET", "/admin/api/media/delivery/1/asset", nil)
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusOK || res.Body.String() != "drive-bytes" {
		t.Fatalf("expected credential-backed delivery response, got status=%d body=%q", res.Code, res.Body.String())
	}
	if !resolverCalled {
		t.Fatalf("expected credential resolver to be called")
	}
}

func TestAdminMediaDeliveryRoutesServeImportedRangesAndHead(t *testing.T) {
	lib := newMediaRouteTestLibrary()
	lib.items[0].Metadata = map[string]any{"provider": "imported"}
	registry := NewMediaDeliveryRegistry()
	if err := registry.Register("imported", mediaDeliveryRouteAdapter{
		response: MediaDeliveryResponse{
			Mode: MediaDeliveryModeImported,
			Imported: &MediaDeliveryImported{
				Reader:        strings.NewReader("0123456789"),
				ContentType:   "text/plain",
				ContentLength: 10,
				FileName:      "asset.txt",
			},
		},
	}); err != nil {
		t.Fatalf("register delivery adapter: %v", err)
	}
	server := newMediaRouteServerWithDeps(t, allowPermissionAuthorizer{allowed: "perm.view"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS), Dependencies{
		MediaDeliveryRegistry: registry,
	})

	req := httptest.NewRequest("GET", "/admin/api/media/delivery/1/asset", nil)
	req.Header.Set("Range", "bytes=2-5")
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusPartialContent || res.Body.String() != "2345" {
		t.Fatalf("expected partial content, got status=%d body=%q", res.Code, res.Body.String())
	}
	if got := res.Header().Get("Accept-Ranges"); got != "bytes" {
		t.Fatalf("expected Accept-Ranges bytes, got %q", got)
	}
	if got := res.Header().Get("Content-Range"); got != "bytes 2-5/10" {
		t.Fatalf("expected Content-Range bytes 2-5/10, got %q", got)
	}

	req = httptest.NewRequest("HEAD", "/admin/api/media/delivery/1/asset", nil)
	res = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusOK || res.Body.Len() != 0 {
		t.Fatalf("expected HEAD full content without body, got status=%d body=%q", res.Code, res.Body.String())
	}

	req = httptest.NewRequest("GET", "/admin/api/media/delivery/1/asset", nil)
	req.Header.Set("Range", "bytes=20-25")
	res = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusRequestedRangeNotSatisfiable {
		t.Fatalf("expected invalid range 416, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestAdminMediaDeliveryRoutesUseLocalFileAdapter(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "asset.txt"), []byte("0123456789"), 0o600); err != nil {
		t.Fatalf("write local media: %v", err)
	}
	lib := newMediaRouteTestLibrary()
	lib.items[0].Metadata = map[string]any{
		"provider":    "local",
		"storage_key": "asset.txt",
	}
	registry := NewMediaDeliveryRegistry()
	if err := registry.Register("local", MediaLocalFileDeliveryAdapter{Roots: []string{root}}); err != nil {
		t.Fatalf("register local adapter: %v", err)
	}
	server := newMediaRouteServerWithDeps(t, allowPermissionAuthorizer{allowed: "perm.view"}, lib, featureGateFromKeys(FeatureMedia, FeatureCMS), Dependencies{
		MediaDeliveryRegistry: registry,
	})

	req := httptest.NewRequest("GET", "/admin/api/media/delivery/1/asset", nil)
	req.Header.Set("Range", "bytes=1-3")
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusPartialContent || res.Body.String() != "123" {
		t.Fatalf("expected ranged local content, got status=%d body=%q", res.Code, res.Body.String())
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
