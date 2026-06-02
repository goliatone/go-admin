package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type compileTimeMediaDeliveryAdapter struct{}

func (compileTimeMediaDeliveryAdapter) ResolveMediaDelivery(context.Context, MediaDeliveryRequest) (MediaDeliveryResponse, error) {
	return MediaDeliveryResponse{Mode: MediaDeliveryModeRedirect, Redirect: &MediaDeliveryRedirect{URL: "/ok"}}, nil
}

func TestMediaDeliveryIntentParsing(t *testing.T) {
	for _, raw := range []string{"asset", "stream", "poster", "download"} {
		intent, ok := ParseMediaDeliveryIntent(raw)
		if !ok || string(intent) != raw {
			t.Fatalf("expected intent %q to parse, got %q ok=%v", raw, intent, ok)
		}
	}
	if _, ok := ParseMediaDeliveryIntent("thumbnail"); ok {
		t.Fatalf("unexpected thumbnail intent")
	}
}

func TestMediaDeliveryStateNormalization(t *testing.T) {
	cases := map[string]MediaDeliveryState{
		"ready":                MediaDeliveryStateReady,
		"external-source-only": MediaDeliveryStateExternalSourceOnly,
		"needs_import":         MediaDeliveryStateNeedsImport,
		"not-playable":         MediaDeliveryStateNotPlayable,
		"failed":               MediaDeliveryStateFailed,
		"":                     MediaDeliveryStateUnavailable,
	}
	for raw, want := range cases {
		if got := NormalizeMediaDeliveryState(raw); got != want {
			t.Fatalf("state %q: expected %q, got %q", raw, want, got)
		}
	}
}

func TestMediaDeliveryStateForItemReadyWorkflowCompleteAndMetadataOverride(t *testing.T) {
	item := MediaItem{
		ID:             "asset-1",
		Status:         "ready",
		WorkflowStatus: "complete",
	}
	if got := mediaDeliveryStateForItem(item); got != MediaDeliveryStateReady {
		t.Fatalf("expected ready state for ready/complete item, got %q", got)
	}

	item.Metadata = map[string]any{"delivery_state": "needs_import"}
	if got := mediaDeliveryStateForItem(item); got != MediaDeliveryStateNeedsImport {
		t.Fatalf("expected explicit metadata delivery_state to win, got %q", got)
	}
}

func TestMediaDeliveryCapabilityNormalization(t *testing.T) {
	got := NormalizeMediaDeliveryCapabilities(
		MediaDeliveryCapabilityStream,
		MediaDeliveryCapability("range"),
		MediaDeliveryCapability("auth-required"),
		MediaDeliveryCapabilityStream,
		MediaDeliveryCapability("unknown"),
	)
	want := []MediaDeliveryCapability{
		MediaDeliveryCapabilityStream,
		MediaDeliveryCapabilityRange,
		MediaDeliveryCapabilityAuthRequired,
	}
	if len(got) != len(want) {
		t.Fatalf("expected capabilities %v, got %v", want, got)
	}
	for idx := range want {
		if got[idx] != want[idx] {
			t.Fatalf("capability %d: expected %q, got %q", idx, want[idx], got[idx])
		}
	}
}

func TestMediaDeliveryAdapterCompileTimeSurface(t *testing.T) {
	var _ MediaDeliveryAdapter = compileTimeMediaDeliveryAdapter{}
}

func TestDefaultMediaDeliveryReferenceProjectorReadsProviderProvenance(t *testing.T) {
	item := MediaItem{
		ID:       "asset-1",
		Name:     "video.mp4",
		MIMEType: "video/mp4",
		Size:     42,
		Metadata: map[string]any{
			"provider":    "drive",
			"source_url":  "https://drive.example/raw",
			"external_id": "drive-1",
			"storage_key": "bucket/key",
			"poster_key":  "bucket/poster",
			"safe":        "kept",
		},
	}
	ref, err := DefaultMediaDeliveryReferenceProjector{}.ProjectMediaDeliveryReference(context.Background(), item)
	if err != nil {
		t.Fatalf("project reference: %v", err)
	}
	if ref.Provider != "drive" || ref.ExternalID != "drive-1" || ref.StorageKey != "bucket/key" || ref.PosterKey != "bucket/poster" {
		t.Fatalf("expected provider provenance in reference, got %+v", ref)
	}
	if ref.MIMEType != "video/mp4" || ref.Size != 42 || ref.Metadata["safe"] != "kept" {
		t.Fatalf("expected common media fields in reference, got %+v", ref)
	}
}

func TestMediaDeliveryProjectorCanBeReplacedByHost(t *testing.T) {
	projector := MediaDeliveryReferenceProjectorFunc(func(_ context.Context, item MediaItem) (MediaDeliveryReference, error) {
		return MediaDeliveryReference{ID: item.ID, Provider: "tenant-provider", ExternalID: "tenant-ref"}, nil
	})
	ref, err := projector.ProjectMediaDeliveryReference(context.Background(), MediaItem{ID: "asset-1"})
	if err != nil {
		t.Fatalf("project reference: %v", err)
	}
	if ref.Provider != "tenant-provider" || ref.ExternalID != "tenant-ref" {
		t.Fatalf("expected host projector output, got %+v", ref)
	}
}

func TestMediaItemJSONRedactsProviderProvenanceMetadata(t *testing.T) {
	item := MediaItem{
		ID:   "asset-1",
		Name: "asset.jpg",
		URL:  "/admin/api/media/delivery/asset-1/asset",
		Metadata: map[string]any{
			"source_url":  "https://provider.example/raw",
			"signed_url":  "https://provider.example/signed",
			"external_id": "external-1",
			"storage_key": "bucket/key",
			"poster_key":  "bucket/poster",
			"caption":     "Safe caption",
		},
	}
	raw, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("marshal media item: %v", err)
	}
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("decode media item: %v", err)
	}
	metadata := mustMapAny(t, payload["metadata"], "metadata")
	if metadata["caption"] != "Safe caption" {
		t.Fatalf("expected safe metadata to remain, got %+v", metadata)
	}
	for _, key := range []string{"source_url", "signed_url", "external_id", "storage_key", "poster_key"} {
		if _, ok := metadata[key]; ok {
			t.Fatalf("expected metadata key %q to be redacted from normal JSON: %+v", key, metadata)
		}
	}
}

func TestMediaItemJSONRedactsNestedProviderProvenanceMetadata(t *testing.T) {
	item := MediaItem{
		ID:   "asset-1",
		Name: "asset.jpg",
		Metadata: map[string]any{
			"caption": "Safe caption",
			"provider": map[string]any{
				"source_url": "https://provider.example/raw",
				"label":      "Drive",
			},
			"sources": []any{
				map[string]any{
					"signed_url": "https://provider.example/signed",
					"kind":       "preview",
				},
			},
		},
	}
	raw, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("marshal media item: %v", err)
	}
	payload := string(raw)
	for _, leaked := range []string{"source_url", "signed_url", "https://provider.example/raw", "https://provider.example/signed"} {
		if strings.Contains(payload, leaked) {
			t.Fatalf("expected nested provider provenance %q to be redacted from %s", leaked, payload)
		}
	}
	if !strings.Contains(payload, "Safe caption") || !strings.Contains(payload, "Drive") || !strings.Contains(payload, "preview") {
		t.Fatalf("expected safe nested metadata to remain, got %s", payload)
	}
}

func TestMediaDeliveryCredentialResolverFunc(t *testing.T) {
	credential, err := (MediaDeliveryRequest{}).ResolveCredential(context.Background(), "media.read")
	if err != nil {
		t.Fatalf("nil request resolver should not fail: %v", err)
	}
	if credential.AccessToken != "" || credential.TokenType != "" {
		t.Fatalf("nil request resolver should return zero credential, got %+v", credential)
	}

	resolver := MediaDeliveryCredentialResolverFunc(func(_ context.Context, req MediaDeliveryCredentialRequest) (MediaDeliveryCredential, error) {
		if req.Provider != "drive" || req.Intent != MediaDeliveryIntentStream {
			t.Fatalf("unexpected credential request: %+v", req)
		}
		return MediaDeliveryCredential{AccessToken: "token", TokenType: "Bearer"}, nil
	})
	credential, err = resolver.ResolveMediaDeliveryCredential(context.Background(), MediaDeliveryCredentialRequest{
		Provider: "drive",
		Intent:   MediaDeliveryIntentStream,
	})
	if err != nil {
		t.Fatalf("resolve credential: %v", err)
	}
	if credential.AccessToken != "token" || credential.TokenType != "Bearer" {
		t.Fatalf("unexpected credential: %+v", credential)
	}
}

func TestMediaDeliveryRegistryResolvesAdaptersAndFailsTypedUnavailable(t *testing.T) {
	registry := NewMediaDeliveryRegistry()
	if err := registry.Register("Drive", compileTimeMediaDeliveryAdapter{}); err != nil {
		t.Fatalf("register adapter: %v", err)
	}
	resp, err := registry.Resolve(context.Background(), MediaDeliveryRequest{
		Reference: MediaDeliveryReference{Provider: "drive"},
		Intent:    MediaDeliveryIntentStream,
	})
	if err != nil {
		t.Fatalf("resolve registered adapter: %v", err)
	}
	if resp.Mode != MediaDeliveryModeRedirect || resp.Redirect == nil || resp.Redirect.URL != "/ok" {
		t.Fatalf("unexpected registered adapter response: %+v", resp)
	}

	resp, err = registry.Resolve(context.Background(), MediaDeliveryRequest{
		Reference: MediaDeliveryReference{Provider: "missing"},
	})
	if err == nil {
		t.Fatalf("expected missing adapter error")
	}
	if resp.Mode != MediaDeliveryModeUnavailable || resp.Unavailable == nil {
		t.Fatalf("expected typed unavailable response, got %+v", resp)
	}
	var mediaDeliveryUnavailableError MediaDeliveryUnavailableError
	if !errors.As(err, &mediaDeliveryUnavailableError) {
		t.Fatalf("expected MediaDeliveryUnavailableError, got %T %v", err, err)
	}
}

func TestMediaRedirectDeliveryAdapterEnforcesAllowedHosts(t *testing.T) {
	adapter := MediaRedirectDeliveryAdapter{
		AllowedHosts: []string{"cdn.example"},
		Status:       http.StatusTemporaryRedirect,
		Cache:        "private, max-age=60",
	}
	resp, err := adapter.ResolveMediaDelivery(context.Background(), MediaDeliveryRequest{
		Reference: MediaDeliveryReference{SourceURL: "https://cdn.example/media/hero.jpg"},
		Intent:    MediaDeliveryIntentAsset,
	})
	if err != nil {
		t.Fatalf("resolve redirect: %v", err)
	}
	if resp.Mode != MediaDeliveryModeRedirect || resp.Redirect == nil {
		t.Fatalf("expected redirect response, got %+v", resp)
	}
	if resp.Redirect.URL != "https://cdn.example/media/hero.jpg" || resp.Redirect.Status != http.StatusTemporaryRedirect || resp.Redirect.Cache != "private, max-age=60" {
		t.Fatalf("unexpected redirect payload: %+v", resp.Redirect)
	}

	resp, err = adapter.ResolveMediaDelivery(context.Background(), MediaDeliveryRequest{
		Reference: MediaDeliveryReference{SourceURL: "https://evil.example/media/hero.jpg"},
		Intent:    MediaDeliveryIntentAsset,
	})
	if err != nil {
		t.Fatalf("unexpected disallowed redirect error: %v", err)
	}
	if resp.Mode != MediaDeliveryModeUnavailable || resp.Unavailable == nil || resp.Unavailable.Code != http.StatusForbidden {
		t.Fatalf("expected forbidden unavailable response, got %+v", resp)
	}
}

func TestMediaLocalFileDeliveryAdapterUsesRootsAndIntentPaths(t *testing.T) {
	root := t.TempDir()
	assetPath := filepath.Join(root, "asset.txt")
	posterPath := filepath.Join(root, "poster.txt")
	if err := os.WriteFile(assetPath, []byte("asset"), 0o600); err != nil {
		t.Fatalf("write asset: %v", err)
	}
	if err := os.WriteFile(posterPath, []byte("poster"), 0o600); err != nil {
		t.Fatalf("write poster: %v", err)
	}
	adapter := MediaLocalFileDeliveryAdapter{Roots: []string{root}}
	resp, err := adapter.ResolveMediaDelivery(context.Background(), MediaDeliveryRequest{
		Reference: MediaDeliveryReference{
			StorageKey: "asset.txt",
			PosterKey:  "poster.txt",
			MIMEType:   "text/plain",
		},
		Intent: MediaDeliveryIntentAsset,
	})
	if err != nil {
		t.Fatalf("resolve local asset: %v", err)
	}
	if resp.Mode != MediaDeliveryModeImported || resp.Imported == nil || resp.Imported.FileName != "asset.txt" {
		t.Fatalf("expected imported asset response, got %+v", resp)
	}
	if closer, ok := resp.Imported.Reader.(interface{ Close() error }); ok {
		if closeErr := closer.Close(); closeErr != nil {
			t.Fatalf("close asset reader: %v", closeErr)
		}
	}

	resp, err = adapter.ResolveMediaDelivery(context.Background(), MediaDeliveryRequest{
		Reference: MediaDeliveryReference{
			StorageKey: "asset.txt",
			PosterKey:  "poster.txt",
		},
		Intent: MediaDeliveryIntentPoster,
	})
	if err != nil {
		t.Fatalf("resolve local poster: %v", err)
	}
	if resp.Mode != MediaDeliveryModeImported || resp.Imported == nil || resp.Imported.FileName != "poster.txt" {
		t.Fatalf("expected imported poster response, got %+v", resp)
	}
	if closer, ok := resp.Imported.Reader.(interface{ Close() error }); ok {
		if closeErr := closer.Close(); closeErr != nil {
			t.Fatalf("close poster reader: %v", closeErr)
		}
	}

	outside := filepath.Join(t.TempDir(), "outside.txt")
	if writeErr := os.WriteFile(outside, []byte("outside"), 0o600); writeErr != nil {
		t.Fatalf("write outside: %v", writeErr)
	}
	resp, err = adapter.ResolveMediaDelivery(context.Background(), MediaDeliveryRequest{
		Reference: MediaDeliveryReference{StorageKey: outside},
		Intent:    MediaDeliveryIntentAsset,
	})
	if err != nil {
		t.Fatalf("unexpected outside path error: %v", err)
	}
	if resp.Mode != MediaDeliveryModeUnavailable || resp.Unavailable == nil || resp.Unavailable.Code != http.StatusForbidden {
		t.Fatalf("expected forbidden unavailable response for outside path, got %+v", resp)
	}
}

func TestMediaDeliveryURLHelpersUseURLKitRoutes(t *testing.T) {
	cfg := applyConfigDefaults(Config{BasePath: "/admin"})
	manager, err := newURLManager(cfg, true)
	if err != nil {
		t.Fatalf("new url manager: %v", err)
	}
	urls := BuildMediaDeliveryURLs(manager, adminAPIGroupName(cfg), publicAPIGroupName(cfg), "asset-1", false)
	if urls.AssetURL != "/admin/api/media/delivery/asset-1/asset" {
		t.Fatalf("expected asset delivery URL, got %+v", urls)
	}
	if urls.StreamURL != "/admin/api/media/delivery/asset-1/stream" {
		t.Fatalf("expected stream delivery URL, got %+v", urls)
	}
	if urls.PublicAssetURL != "" {
		t.Fatalf("did not expect public URLs without public opt-in, got %+v", urls)
	}
}

func TestParseMediaDeliveryRange(t *testing.T) {
	cases := []struct {
		header string
		size   int64
		want   MediaDeliveryRange
	}{
		{header: "bytes=0-3", size: 10, want: MediaDeliveryRange{Start: 0, End: 3}},
		{header: "bytes=4-", size: 10, want: MediaDeliveryRange{Start: 4, End: 9}},
		{header: "bytes=-4", size: 10, want: MediaDeliveryRange{Start: 6, End: 9}},
		{header: "bytes=0-99", size: 10, want: MediaDeliveryRange{Start: 0, End: 9}},
	}
	for _, tc := range cases {
		got, ok, err := ParseMediaDeliveryRange(tc.header, tc.size)
		if err != nil || !ok || got != tc.want {
			t.Fatalf("range %q: expected %+v ok, got %+v ok=%v err=%v", tc.header, tc.want, got, ok, err)
		}
	}
	for _, header := range []string{"items=0-1", "bytes=5-1", "bytes=20-21", "bytes=0-1,4-5"} {
		if _, _, err := ParseMediaDeliveryRange(header, 10); err == nil {
			t.Fatalf("expected invalid range %q to fail", header)
		}
	}
}

func TestNewLocalMediaDeliveryImportedValidatesRoots(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "asset.txt")
	if err := os.WriteFile(path, []byte("local media"), 0o600); err != nil {
		t.Fatalf("write temp media: %v", err)
	}
	imported, err := NewLocalMediaDeliveryImported(path, []string{root}, "")
	if err != nil {
		t.Fatalf("open local media: %v", err)
	}
	if closer, ok := imported.Reader.(interface{ Close() error }); ok {
		defer func() {
			if closeErr := closer.Close(); closeErr != nil {
				t.Fatalf("close imported reader: %v", closeErr)
			}
		}()
	}
	if imported.ContentLength != int64(len("local media")) || imported.FileName != "asset.txt" {
		t.Fatalf("unexpected imported metadata: %+v", imported)
	}

	outside := filepath.Join(t.TempDir(), "outside.txt")
	if err := os.WriteFile(outside, []byte("outside"), 0o600); err != nil {
		t.Fatalf("write outside media: %v", err)
	}
	if _, err := NewLocalMediaDeliveryImported(outside, []string{root}, ""); err == nil {
		t.Fatalf("expected outside path to be rejected")
	}
}
