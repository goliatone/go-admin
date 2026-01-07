package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
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
	if !cfg.Features.Dashboard || !cfg.Features.Settings || !cfg.Features.Users {
		t.Fatalf("expected default features enabled, got %+v", cfg.Features)
	}
	if cfg.ThemeTokens["primary"] == "" || cfg.ThemeTokens["accent"] == "" {
		t.Fatalf("expected default theme tokens, got %+v", cfg.ThemeTokens)
	}
}

func TestNewAdminConfigOverrides(t *testing.T) {
	t.Setenv("QS_DEBUG", "true")

	cfg := NewAdminConfig(
		"/root",
		"My Admin",
		"es",
		WithTheme("custom", "dark"),
		WithThemeTokens(map[string]string{"primary": "#000000"}),
		WithNavMenuCode("custom_menu"),
		WithFeatures(admin.Features{Dashboard: true}),
		WithFeatureFlag("custom_flag", true),
		WithFeatureFlagsFromEnv(EnvFlagOverride{Env: "QS_DEBUG", Key: "debug"}),
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
	if !cfg.Features.Dashboard || cfg.Features.CMS {
		t.Fatalf("expected features override, got %+v", cfg.Features)
	}
	if cfg.ThemeTokens["primary"] != "#000000" {
		t.Fatalf("expected theme token override, got %+v", cfg.ThemeTokens)
	}
	if !cfg.FeatureFlags["custom_flag"] || !cfg.FeatureFlags["debug"] {
		t.Fatalf("expected feature flags override, got %+v", cfg.FeatureFlags)
	}
}

func TestDefaultMinimalFeatures(t *testing.T) {
	got := DefaultMinimalFeatures()
	expected := admin.Features{Dashboard: true, CMS: true}
	if got != expected {
		t.Fatalf("expected minimal features %+v, got %+v", expected, got)
	}
}

func TestWithFeaturesExplicitClearsFlags(t *testing.T) {
	cfg := NewAdminConfig(
		"",
		"",
		"",
		WithFeatureFlags(map[string]bool{"users": true}),
		WithFeaturesExplicit(DefaultMinimalFeatures()),
	)
	if !cfg.Features.Dashboard || !cfg.Features.CMS || cfg.Features.Users {
		t.Fatalf("expected minimal features, got %+v", cfg.Features)
	}
	if len(cfg.FeatureFlags) != 0 {
		t.Fatalf("expected feature flags cleared, got %+v", cfg.FeatureFlags)
	}
}
