package main

import (
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/pkg/admin"
	quicksite "github.com/goliatone/go-admin/quickstart/site"
)

func TestResolveSiteRuntimeConfigDefaults(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en", BasePath: "/admin", Theme: "admin-demo", ThemeVariant: "light"}
	runtimeSite := appcfg.Defaults().Site
	siteCfg := resolveSiteRuntimeConfig(cfg, runtimeSite, true)

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
	if siteCfg.Environment != "dev" {
		t.Fatalf("expected runtime environment dev, got %q", siteCfg.Environment)
	}
	if siteCfg.ContentEnvironment != defaultSiteContentEnv {
		t.Fatalf("expected content environment %q, got %q", defaultSiteContentEnv, siteCfg.ContentEnvironment)
	}
	if siteCfg.Features.EnableCanonicalRedirect == nil || !*siteCfg.Features.EnableCanonicalRedirect {
		t.Fatalf("expected canonical redirect feature enabled by default")
	}
	if siteCfg.Features.StrictLocalizedPaths == nil || *siteCfg.Features.StrictLocalizedPaths {
		t.Fatalf("expected strict localized paths feature disabled by default")
	}
}

func TestResolveSiteRuntimeConfigEnvOverrides(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en", BasePath: "/admin", Theme: "admin-demo", ThemeVariant: "light"}
	runtimeSite := appcfg.Defaults().Site
	runtimeSite.AllowLocaleFallback = false
	runtimeSite.LocalePrefixMode = "always"
	runtimeSite.EnableGeneratedFallback = true
	runtimeSite.EnableSearch = false
	runtimeSite.EnableCanonicalRedirect = false
	runtimeSite.StrictLocalizedPaths = true
	runtimeSite.SupportedLocales = []string{"en", "es", "de"}
	runtimeSite.RuntimeEnv = "staging"
	runtimeSite.ContentEnv = "qa"
	runtimeSite.Theme = "marketing"
	runtimeSite.ThemeVariant = "clean"
	siteCfg := resolveSiteRuntimeConfig(cfg, runtimeSite, false)

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
	if siteCfg.Features.EnableCanonicalRedirect == nil || *siteCfg.Features.EnableCanonicalRedirect {
		t.Fatalf("expected canonical redirect feature disabled by env override")
	}
	if siteCfg.Features.StrictLocalizedPaths == nil || !*siteCfg.Features.StrictLocalizedPaths {
		t.Fatalf("expected strict localized paths feature enabled by env override")
	}
	if len(siteCfg.SupportedLocales) != 3 {
		t.Fatalf("expected 3 supported locales, got %v", siteCfg.SupportedLocales)
	}
	if siteCfg.Environment != "staging" {
		t.Fatalf("expected runtime environment staging, got %q", siteCfg.Environment)
	}
	if siteCfg.ContentEnvironment != "qa" {
		t.Fatalf("expected content environment qa, got %q", siteCfg.ContentEnvironment)
	}
	if siteCfg.Theme.Name != "marketing" || siteCfg.Theme.Variant != "clean" {
		t.Fatalf("expected theme override marketing/clean, got %s/%s", siteCfg.Theme.Name, siteCfg.Theme.Variant)
	}
}

func TestResolveSiteRuntimeConfigContentEnvironmentFallbacksToDefault(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en", BasePath: "/admin", Theme: "admin-demo", ThemeVariant: "light"}
	runtimeSite := appcfg.Defaults().Site
	runtimeSite.RuntimeEnv = "prod"
	runtimeSite.ContentEnv = ""
	siteCfg := resolveSiteRuntimeConfig(cfg, runtimeSite, false)

	if siteCfg.Environment != "prod" {
		t.Fatalf("expected runtime environment prod, got %q", siteCfg.Environment)
	}
	if siteCfg.ContentEnvironment != defaultSiteContentEnv {
		t.Fatalf("expected content environment fallback %q, got %q", defaultSiteContentEnv, siteCfg.ContentEnvironment)
	}
}
