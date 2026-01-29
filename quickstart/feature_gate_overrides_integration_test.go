package quickstart

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/goliatone/go-admin/admin"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
)

func TestRuntimeOverridesAffectBootAndModules(t *testing.T) {
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Title:         "Admin",
	}
	store := admin.NewInMemoryPreferencesStore()
	defaults := map[string]bool{
		"users":    true,
		"settings": true,
	}
	gate := buildFeatureGate(cfg, defaults, store)
	mutable, ok := gate.(fggate.MutableFeatureGate)
	if !ok {
		t.Fatalf("expected mutable feature gate")
	}
	scope := fggate.ScopeRef{Kind: fggate.ScopeSystem}
	if err := mutable.Set(context.Background(), "users", scope, false, fggate.ActorRef{}); err != nil {
		t.Fatalf("set users override: %v", err)
	}
	if err := mutable.Set(context.Background(), "settings", scope, false, fggate.ActorRef{}); err != nil {
		t.Fatalf("set settings override: %v", err)
	}

	adm, err := admin.New(cfg, admin.Dependencies{
		FeatureGate:      gate,
		PreferencesStore: store,
	})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}

	server := router.NewFiberAdapter()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize error: %v", err)
	}

	if _, ok := adm.Registry().Module("users"); ok {
		t.Fatalf("expected users module to be disabled by override")
	}

	req := httptest.NewRequest(http.MethodGet, "/admin/api/settings", nil)
	resp, err := server.WrappedRouter().Test(req)
	if err != nil {
		t.Fatalf("settings request error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for disabled settings, got %d", resp.StatusCode)
	}
	var payload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if textCode, _ := payload["text_code"].(string); textCode != "" && textCode != "FEATURE_DISABLED" {
		t.Fatalf("expected FEATURE_DISABLED text code, got %v", payload["text_code"])
	}
}
