package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadPrecedenceDefaultsThenConfigThenOverridesThenEnv(t *testing.T) {
	basePath := writeTempFile(t, "app.json", `{
  "name": "From Base",
  "env": "development",
  "server": {"address": ":9001", "print_routes": false},
  "admin": {"base_path": "/control", "title": "From Base", "default_locale": "en"},
  "auth": {"signing_key": "base-signing", "demo_username": "admin", "demo_email": "admin@example.com", "demo_password": "admin.pwd"},
  "features": {"dashboard": false, "cms": false, "search": false, "commands": false, "settings": false, "jobs": false, "media": false, "users": false}
}`)
	overlayPath := writeTempFile(t, "overrides.yml", `
admin:
  title: "From Overlay"
features:
  search: true
`)
	t.Setenv("APP_ADMIN__TITLE", "From Env")
	t.Setenv("APP_FEATURES__SEARCH", "false")

	cfg, err := Load(basePath, overlayPath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Admin.Title != "From Env" {
		t.Fatalf("expected env precedence for admin.title, got %q", cfg.Admin.Title)
	}
	if cfg.Features.Search {
		t.Fatalf("expected env precedence for features.search=false")
	}
	if cfg.Server.Address != ":9001" {
		t.Fatalf("expected base config server.address, got %q", cfg.Server.Address)
	}
}

func TestLoadWithMissingOptionalOverlayIsNonFatal(t *testing.T) {
	basePath := writeTempFile(t, "app.json", `{
  "name": "admin-shell",
  "env": "development",
  "server": {"address": ":9002", "print_routes": true},
  "admin": {"base_path": "/admin", "title": "Overlay Optional", "default_locale": "en"},
  "auth": {"signing_key": "key", "demo_username": "admin", "demo_email": "admin@example.com", "demo_password": "pwd"},
  "features": {"dashboard": true, "cms": true, "search": true, "commands": false, "settings": false, "jobs": false, "media": false, "users": false}
}`)
	missingOverlay := filepath.Join(t.TempDir(), "missing-overrides.yml")

	cfg, err := Load(basePath, missingOverlay)
	if err != nil {
		t.Fatalf("load config with missing optional overlay should succeed: %v", err)
	}
	if cfg.Admin.Title != "Overlay Optional" {
		t.Fatalf("expected admin.title from base config, got %q", cfg.Admin.Title)
	}
}

func TestLoadUsesAPPConfigSelectorsWhenNoPathsProvided(t *testing.T) {
	basePath := writeTempFile(t, "app.json", `{
  "name": "admin-shell",
  "env": "development",
  "server": {"address": ":9003", "print_routes": true},
  "admin": {"base_path": "/admin", "title": "From APP_CONFIG", "default_locale": "en"},
  "auth": {"signing_key": "key", "demo_username": "admin", "demo_email": "admin@example.com", "demo_password": "pwd"},
  "features": {"dashboard": true, "cms": true, "search": true, "commands": false, "settings": false, "jobs": false, "media": false, "users": false}
}`)
	overlayPath := writeTempFile(t, "overrides.yml", `
admin:
  title: "From APP_CONFIG_OVERRIDES"
`)
	t.Setenv("APP_CONFIG", basePath)
	t.Setenv("APP_CONFIG_OVERRIDES", overlayPath)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Admin.Title != "From APP_CONFIG_OVERRIDES" {
		t.Fatalf("expected APP_CONFIG_OVERRIDES to override APP_CONFIG, got %q", cfg.Admin.Title)
	}
}

func TestLoadExplicitPathsTakePrecedenceOverEnvSelectors(t *testing.T) {
	envBase := writeTempFile(t, "env-app.json", `{
  "name": "admin-shell",
  "env": "development",
  "server": {"address": ":9004", "print_routes": true},
  "admin": {"base_path": "/admin", "title": "From Env Base", "default_locale": "en"},
  "auth": {"signing_key": "key", "demo_username": "admin", "demo_email": "admin@example.com", "demo_password": "pwd"},
  "features": {"dashboard": true, "cms": true, "search": true, "commands": false, "settings": false, "jobs": false, "media": false, "users": false}
}`)
	envOverlay := writeTempFile(t, "env-overrides.yml", `
admin:
  title: "From Env Overlay"
`)
	explicitBase := writeTempFile(t, "explicit-app.json", `{
  "name": "admin-shell",
  "env": "development",
  "server": {"address": ":9005", "print_routes": true},
  "admin": {"base_path": "/admin", "title": "From Explicit Base", "default_locale": "en"},
  "auth": {"signing_key": "key", "demo_username": "admin", "demo_email": "admin@example.com", "demo_password": "pwd"},
  "features": {"dashboard": true, "cms": true, "search": true, "commands": false, "settings": false, "jobs": false, "media": false, "users": false}
}`)
	explicitOverlay := writeTempFile(t, "explicit-overrides.yml", `
admin:
  title: "From Explicit Overlay"
`)
	t.Setenv("APP_CONFIG", envBase)
	t.Setenv("APP_CONFIG_OVERRIDES", envOverlay)

	cfg, err := Load(explicitBase, explicitOverlay)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Admin.Title != "From Explicit Overlay" {
		t.Fatalf("expected explicit paths to be used over APP_CONFIG selectors, got %q", cfg.Admin.Title)
	}
}

func TestLoadSupportsLegacyAPPConfigPathFallback(t *testing.T) {
	basePath := writeTempFile(t, "legacy-app.json", `{
  "name": "admin-shell",
  "env": "development",
  "server": {"address": ":9006", "print_routes": true},
  "admin": {"base_path": "/admin", "title": "From APP_CONFIG_PATH", "default_locale": "en"},
  "auth": {"signing_key": "key", "demo_username": "admin", "demo_email": "admin@example.com", "demo_password": "pwd"},
  "features": {"dashboard": true, "cms": true, "search": true, "commands": false, "settings": false, "jobs": false, "media": false, "users": false}
}`)
	t.Setenv("APP_CONFIG", "")
	t.Setenv("APP_CONFIG_PATH", basePath)
	t.Setenv("APP_CONFIG_OVERRIDES", filepath.Join(t.TempDir(), "missing-overrides.yml"))

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Admin.Title != "From APP_CONFIG_PATH" {
		t.Fatalf("expected APP_CONFIG_PATH fallback to be honored, got %q", cfg.Admin.Title)
	}
}

func TestValidateRejectsMissingSigningKey(t *testing.T) {
	cfg := Defaults()
	cfg.Auth.SigningKey = ""

	err := cfg.Validate()
	if err == nil {
		t.Fatalf("expected validate error when auth.signing_key is empty")
	}
	if !strings.Contains(err.Error(), "auth.signing_key is required") {
		t.Fatalf("expected signing key validation error, got %v", err)
	}
}

func writeTempFile(t *testing.T, name, contents string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatalf("write temp file %s: %v", name, err)
	}
	return path
}
