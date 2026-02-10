package quickstart

import (
	"reflect"
	"testing"
)

func TestNewAdminConfigDefaults(t *testing.T) {
	cfg := NewAdminConfig("", "", "")

	if cfg.Title != "Admin" {
		t.Fatalf("expected default title Admin, got %q", cfg.Title)
	}
	if cfg.BasePath != "/admin" {
		t.Fatalf("expected default base path /admin, got %q", cfg.BasePath)
	}
	if cfg.DefaultLocale != "en" {
		t.Fatalf("expected default locale en, got %q", cfg.DefaultLocale)
	}
	if cfg.Theme != "admin" {
		t.Fatalf("expected default theme admin, got %q", cfg.Theme)
	}
	if cfg.ThemeVariant != "light" {
		t.Fatalf("expected default theme variant light, got %q", cfg.ThemeVariant)
	}
	if cfg.NavMenuCode != DefaultNavMenuCode {
		t.Fatalf("expected default nav menu code %q, got %q", DefaultNavMenuCode, cfg.NavMenuCode)
	}
	if cfg.ThemeTokens["primary"] == "" || cfg.ThemeTokens["accent"] == "" {
		t.Fatalf("expected default theme tokens, got %+v", cfg.ThemeTokens)
	}
}

func TestNewAdminConfigOverrides(t *testing.T) {
	cfg := NewAdminConfig(
		"/root",
		"My Admin",
		"es",
		WithTheme("custom", "dark"),
		WithThemeTokens(map[string]string{"primary": "#000000"}),
		WithNavMenuCode("custom_menu"),
	)

	if cfg.BasePath != "/root" {
		t.Fatalf("expected base path /root, got %q", cfg.BasePath)
	}
	if cfg.Theme != "custom" || cfg.ThemeVariant != "dark" {
		t.Fatalf("expected theme override, got %s/%s", cfg.Theme, cfg.ThemeVariant)
	}
	if cfg.NavMenuCode != "custom_menu" {
		t.Fatalf("expected nav menu override, got %q", cfg.NavMenuCode)
	}
	if cfg.ThemeTokens["primary"] != "#000000" {
		t.Fatalf("expected theme token override, got %+v", cfg.ThemeTokens)
	}
}

func TestDefaultAdminFeatures(t *testing.T) {
	got := DefaultAdminFeatures()
	expected := map[string]bool{
		"dashboard":             true,
		"cms":                   true,
		"commands":              true,
		"settings":              true,
		"search":                true,
		"notifications":         true,
		"jobs":                  true,
		"media":                 true,
		"export":                true,
		"bulk":                  true,
		"preferences":           true,
		"profile":               true,
		"users":                 true,
		"tenants":               false,
		"organizations":         false,
		"translations.exchange": false,
		"translations.queue":    false,
	}
	if !reflect.DeepEqual(got, expected) {
		t.Fatalf("expected default features %+v, got %+v", expected, got)
	}
}

func TestDefaultMinimalFeatures(t *testing.T) {
	got := DefaultMinimalFeatures()
	expected := map[string]bool{
		"dashboard": true,
		"cms":       true,
	}
	if !reflect.DeepEqual(got, expected) {
		t.Fatalf("expected minimal features %+v, got %+v", expected, got)
	}
}
