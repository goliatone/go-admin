package main

import (
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
	quicksite "github.com/goliatone/go-admin/quickstart/site"
)

func TestResolveSiteRuntimeConfigDefaults(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en", BasePath: "/admin", Theme: "admin-demo", ThemeVariant: "light"}
	siteCfg := resolveSiteRuntimeConfig(cfg, true)

	if siteCfg.DefaultLocale != "en" {
		t.Fatalf("expected default locale en, got %q", siteCfg.DefaultLocale)
	}
	if siteCfg.Navigation.FallbackMenuCode != "site_main" {
		t.Fatalf("expected fallback menu code site_main, got %q", siteCfg.Navigation.FallbackMenuCode)
	}
	if siteCfg.Navigation.EnableGeneratedFallback {
		t.Fatalf("expected generated fallback disabled by default")
	}
	if siteCfg.LocalePrefixMode != quicksite.LocalePrefixNonDefault {
		t.Fatalf("expected locale prefix mode non_default, got %q", siteCfg.LocalePrefixMode)
	}
	if siteCfg.Search.Route != "/search" {
		t.Fatalf("expected search route /search, got %q", siteCfg.Search.Route)
	}
	if siteCfg.Search.Endpoint != "/api/v1/site/search" {
		t.Fatalf("expected search endpoint /api/v1/site/search, got %q", siteCfg.Search.Endpoint)
	}
}

func TestResolveSiteRuntimeConfigEnvOverrides(t *testing.T) {
	t.Setenv("SITE_ALLOW_LOCALE_FALLBACK", "false")
	t.Setenv("SITE_LOCALE_PREFIX_MODE", "always")
	t.Setenv("SITE_ENABLE_GENERATED_FALLBACK", "true")
	t.Setenv("SITE_ENABLE_SEARCH", "false")
	t.Setenv("SITE_SUPPORTED_LOCALES", "en,es,de")
	t.Setenv("SITE_ENV", "prod")
	t.Setenv("SITE_THEME", "marketing")
	t.Setenv("SITE_THEME_VARIANT", "clean")

	cfg := admin.Config{DefaultLocale: "en", BasePath: "/admin", Theme: "admin-demo", ThemeVariant: "light"}
	siteCfg := resolveSiteRuntimeConfig(cfg, false)

	if siteCfg.AllowLocaleFallback == nil || *siteCfg.AllowLocaleFallback {
		t.Fatalf("expected allow locale fallback override=false")
	}
	if siteCfg.LocalePrefixMode != quicksite.LocalePrefixAlways {
		t.Fatalf("expected locale prefix mode always, got %q", siteCfg.LocalePrefixMode)
	}
	if !siteCfg.Navigation.EnableGeneratedFallback {
		t.Fatalf("expected generated fallback enabled by env override")
	}
	if siteCfg.Features.EnableSearch == nil || *siteCfg.Features.EnableSearch {
		t.Fatalf("expected search feature disabled by env override")
	}
	if len(siteCfg.SupportedLocales) != 3 {
		t.Fatalf("expected 3 supported locales, got %v", siteCfg.SupportedLocales)
	}
	if siteCfg.Environment != "prod" {
		t.Fatalf("expected environment prod, got %q", siteCfg.Environment)
	}
	if siteCfg.Theme.Name != "marketing" || siteCfg.Theme.Variant != "clean" {
		t.Fatalf("expected theme override marketing/clean, got %s/%s", siteCfg.Theme.Name, siteCfg.Theme.Variant)
	}
}
