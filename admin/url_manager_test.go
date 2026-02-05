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
	if cfg.APIPrefix != "api" {
		t.Fatalf("expected legacy api prefix default, got %q", cfg.APIPrefix)
	}
	if cfg.APIVersion != "" {
		t.Fatalf("expected legacy api version default empty, got %q", cfg.APIVersion)
	}
}

func TestNormalizeURLConfigLegacyOverridesAdmin(t *testing.T) {
	cfg := normalizeURLConfig(URLConfig{
		APIPrefix:  "legacy-api",
		APIVersion: "v9",
	}, "/admin")

	if cfg.Admin.APIPrefix != "legacy-api" {
		t.Fatalf("expected admin api prefix from legacy, got %q", cfg.Admin.APIPrefix)
	}
	if cfg.Admin.APIVersion != "v9" {
		t.Fatalf("expected admin api version from legacy, got %q", cfg.Admin.APIVersion)
	}
	if cfg.Public.APIVersion != "v1" {
		t.Fatalf("expected public api version default v1, got %q", cfg.Public.APIVersion)
	}
	if cfg.APIPrefix != "legacy-api" || cfg.APIVersion != "v9" {
		t.Fatalf("expected legacy fields to mirror admin, got %q/%q", cfg.APIPrefix, cfg.APIVersion)
	}
}

func TestNormalizeURLConfigAdminOverridesLegacy(t *testing.T) {
	cfg := normalizeURLConfig(URLConfig{
		Admin: URLNamespaceConfig{
			APIPrefix:  "admin-api",
			APIVersion: "v2",
		},
	}, "/admin")

	if cfg.APIPrefix != "admin-api" {
		t.Fatalf("expected legacy api prefix to mirror admin, got %q", cfg.APIPrefix)
	}
	if cfg.APIVersion != "v2" {
		t.Fatalf("expected legacy api version to mirror admin, got %q", cfg.APIVersion)
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
}
