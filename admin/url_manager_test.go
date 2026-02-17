package admin

import (
	"testing"

	urlkit "github.com/goliatone/go-urlkit"
)

func TestNormalizeURLConfigDefaults(t *testing.T) {
	cfg := normalizeURLConfig(URLConfig{}, "/admin/")

	if cfg.Admin.BasePath != "/admin" {
		t.Fatalf("expected admin base path /admin, got %q", cfg.Admin.BasePath)
	}
	if cfg.Admin.APIPrefix != "api" {
		t.Fatalf("expected admin api prefix default, got %q", cfg.Admin.APIPrefix)
	}
	if cfg.Admin.APIVersion != "" {
		t.Fatalf("expected admin api version default empty, got %q", cfg.Admin.APIVersion)
	}
	if cfg.Public.BasePath != "" {
		t.Fatalf("expected public base path empty, got %q", cfg.Public.BasePath)
	}
	if cfg.Public.APIPrefix != "api" {
		t.Fatalf("expected public api prefix default, got %q", cfg.Public.APIPrefix)
	}
	if cfg.Public.APIVersion != "v1" {
		t.Fatalf("expected public api version default v1, got %q", cfg.Public.APIVersion)
	}
}

func TestNormalizeURLConfigAdminOverridesDefaults(t *testing.T) {
	cfg := normalizeURLConfig(URLConfig{
		Admin: URLNamespaceConfig{
			APIPrefix:  "admin-api",
			APIVersion: "v9",
		},
	}, "/admin")

	if cfg.Admin.APIPrefix != "admin-api" {
		t.Fatalf("expected admin api prefix override, got %q", cfg.Admin.APIPrefix)
	}
	if cfg.Admin.APIVersion != "v9" {
		t.Fatalf("expected admin api version override, got %q", cfg.Admin.APIVersion)
	}
	if cfg.Public.APIVersion != "v1" {
		t.Fatalf("expected public api version default v1, got %q", cfg.Public.APIVersion)
	}
}

func TestNormalizeURLConfigKeepsURLKit(t *testing.T) {
	custom := &urlkit.Config{Groups: []urlkit.GroupConfig{{Name: "custom"}}}
	cfg := normalizeURLConfig(URLConfig{URLKit: custom}, "/admin")

	if cfg.URLKit != custom {
		t.Fatalf("expected URLKit config to be preserved")
	}
}

func TestDefaultURLKitConfigPaths(t *testing.T) {
	cfg := applyConfigDefaults(Config{BasePath: "/admin"})
	manager, err := newURLManager(cfg)
	if err != nil {
		t.Fatalf("newURLManager: %v", err)
	}

	adminErrors, err := manager.Resolve("admin.api", "errors", nil, nil)
	if err != nil {
		t.Fatalf("resolve admin.api errors: %v", err)
	}
	if adminErrors != "/admin/api/errors" {
		t.Fatalf("expected /admin/api/errors, got %q", adminErrors)
	}

	publicPreview, err := manager.Resolve("public.api.v1", "preview", urlkit.Params{"token": "token"}, nil)
	if err != nil {
		t.Fatalf("resolve public.api.v1 preview: %v", err)
	}
	if publicPreview != "/api/v1/preview/token" {
		t.Fatalf("expected /api/v1/preview/token, got %q", publicPreview)
	}

	panelSubresource, err := manager.Resolve("admin.api", "panel.subresource", urlkit.Params{
		"panel":       "agreements",
		"id":          "agreement-1",
		"subresource": "artifact",
		"value":       "executed",
	}, nil)
	if err != nil {
		t.Fatalf("resolve admin.api panel.subresource: %v", err)
	}
	if panelSubresource != "/admin/api/panels/agreements/agreement-1/artifact/executed" {
		t.Fatalf("expected panel subresource path, got %q", panelSubresource)
	}

	translationsQueue, err := manager.Resolve("admin", "translations.queue", nil, nil)
	if err != nil {
		t.Fatalf("resolve admin translations.queue: %v", err)
	}
	if translationsQueue != "/admin/content/translations" {
		t.Fatalf("expected /admin/content/translations, got %q", translationsQueue)
	}

	translationsDashboard, err := manager.Resolve("admin", "translations.dashboard", nil, nil)
	if err != nil {
		t.Fatalf("resolve admin translations.dashboard: %v", err)
	}
	if translationsDashboard != "/admin/translations/dashboard" {
		t.Fatalf("expected /admin/translations/dashboard, got %q", translationsDashboard)
	}
}

func TestDefaultAdminAPIRoutesPanelTemplatesAreNamespaced(t *testing.T) {
	routes := defaultAdminAPIRoutes()

	expected := map[string]string{
		"panel":             "/panels/:panel",
		"panel.id":          "/panels/:panel/:id",
		"panel.action":      "/panels/:panel/actions/:action",
		"panel.bulk":        "/panels/:panel/bulk/:action",
		"panel.preview":     "/panels/:panel/:id/preview",
		"panel.subresource": "/panels/:panel/:id/:subresource/:value",
	}

	for key, want := range expected {
		got, ok := routes[key]
		if !ok {
			t.Fatalf("expected route key %q to exist", key)
		}
		if got != want {
			t.Fatalf("route %q: expected %q, got %q", key, want, got)
		}
	}
}
