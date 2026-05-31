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

func TestLoadTranslationExchangeUIRuntimeConfig(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "app.json")
	if err := os.WriteFile(configPath, []byte(`{
  "app": {"name": "go-admin web", "env": "development"},
  "server": {"address": ":8080"},
  "translation": {
    "profile": "core+exchange",
    "exchange_ui": {
      "source_locale": "en",
      "target_locales": [
        {"code": "bo", "label": "BO"},
        {"code": "zh", "label": "ZH"}
      ],
      "resources": [
        {"id": "Archive_Items", "label": "Archive items"}
      ],
      "default_resources": ["Archive_Items"],
      "default_target_locales": ["bo"],
      "include_source_hash": false,
      "include_examples": false,
      "template": {
        "label": "Download Archive Template",
        "format": "xlsx",
        "href": "/admin/api/archive/template",
        "filename": "archive_translation_template.xlsx"
      },
      "apply": {
        "allow_create_missing": true,
        "allow_source_hash_override": true,
        "continue_on_error": false,
        "dry_run": true
      }
    }
  }
}`), 0o600); err != nil {
		t.Fatalf("write config fixture: %v", err)
	}

	cfg, _, err := Load(context.Background(), configPath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	ui := cfg.Translation.ExchangeUI
	if ui.SourceLocale != "en" {
		t.Fatalf("expected source locale en, got %q", ui.SourceLocale)
	}
	if len(ui.TargetLocales) != 2 || ui.TargetLocales[0].Code != "bo" || ui.TargetLocales[1].Label != "ZH" {
		t.Fatalf("expected target locale options decoded, got %+v", ui.TargetLocales)
	}
	if len(ui.Resources) != 1 || ui.Resources[0].ID != "Archive_Items" {
		t.Fatalf("expected resource option decoded with preserved ID, got %+v", ui.Resources)
	}
	if len(ui.DefaultResources) != 1 || ui.DefaultResources[0] != "Archive_Items" {
		t.Fatalf("expected default resources decoded, got %+v", ui.DefaultResources)
	}
	if ui.Template.Format != "xlsx" || ui.Template.Filename != "archive_translation_template.xlsx" {
		t.Fatalf("expected template metadata decoded, got %+v", ui.Template)
	}
	if ui.IncludeSourceHash == nil || *ui.IncludeSourceHash != false {
		t.Fatalf("expected include_source_hash=false decoded")
	}
	if ui.IncludeExamples == nil || *ui.IncludeExamples != false {
		t.Fatalf("expected include_examples=false decoded")
	}
	if ui.Apply.AllowCreateMissing == nil || *ui.Apply.AllowCreateMissing != true {
		t.Fatalf("expected allow_create_missing=true decoded")
	}
	if ui.Apply.AllowSourceHashOverride == nil || *ui.Apply.AllowSourceHashOverride != true {
		t.Fatalf("expected allow_source_hash_override=true decoded")
	}
	if ui.Apply.ContinueOnError == nil || *ui.Apply.ContinueOnError != false {
		t.Fatalf("expected continue_on_error=false decoded")
	}
	if ui.Apply.DryRun == nil || *ui.Apply.DryRun != true {
		t.Fatalf("expected dry_run=true decoded")
	}
}
