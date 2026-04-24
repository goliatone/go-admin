package config

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultsEnableFullTranslationProfileForReleaseQA(t *testing.T) {
	cfg := Defaults()
	if cfg.Translation.Profile != "full" {
		t.Fatalf("expected default translation profile full, got %q", cfg.Translation.Profile)
	}
	if cfg.Site.Fallback.Mode == "" {
		t.Fatalf("expected site fallback mode default to be configured")
	}
	if !cfg.Site.Fallback.AllowRoot {
		t.Fatalf("expected site fallback root handling enabled by default")
	}
	if cfg.Site.InternalOps.HealthzPath == "" || cfg.Site.InternalOps.StatusPath == "" {
		t.Fatalf("expected internal ops defaults to expose healthz/status paths")
	}
	if cfg.ProtectedApp.Enabled {
		t.Fatalf("expected protected app opt-in to be disabled by default")
	}
}

func TestLoadProtectedAppRuntimeConfig(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "app.json")
	if err := os.WriteFile(configPath, []byte(`{
  "app": {"name": "go-admin web", "env": "development"},
  "server": {"address": ":8080"},
  "protected_app": {
    "enabled": true,
    "root": "/portal",
    "api_root": "/portal/api"
  }
}`), 0o600); err != nil {
		t.Fatalf("write config fixture: %v", err)
	}

	cfg, _, err := Load(context.Background(), configPath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if !cfg.ProtectedApp.Enabled {
		t.Fatalf("expected protected app enabled from config file")
	}
	if cfg.ProtectedApp.Root != "/portal" {
		t.Fatalf("expected protected app root /portal, got %q", cfg.ProtectedApp.Root)
	}
	if cfg.ProtectedApp.APIRoot != "/portal/api" {
		t.Fatalf("expected protected app api root /portal/api, got %q", cfg.ProtectedApp.APIRoot)
	}
}
