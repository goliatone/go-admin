package config

import "testing"

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
}
