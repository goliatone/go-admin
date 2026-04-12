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
	if siteCfg.Navigation.ContributionLocalePolicy != quicksite.ContributionLocalePolicyFallback {
		t.Fatalf("expected contribution locale policy fallback, got %q", siteCfg.Navigation.ContributionLocalePolicy)
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
	if siteCfg.ContentChannel != defaultSiteContentChannel {
		t.Fatalf("expected content channel %q, got %q", defaultSiteContentChannel, siteCfg.ContentChannel)
	}
	if siteCfg.Features.EnableCanonicalRedirect == nil || !*siteCfg.Features.EnableCanonicalRedirect {
		t.Fatalf("expected canonical redirect feature enabled by default")
	}
	if siteCfg.Features.CanonicalRedirectMode != quicksite.CanonicalRedirectRequestedLocaleSticky {
		t.Fatalf("expected canonical redirect mode sticky by default, got %q", siteCfg.Features.CanonicalRedirectMode)
	}
	if siteCfg.Features.StrictLocalizedPaths == nil || *siteCfg.Features.StrictLocalizedPaths {
		t.Fatalf("expected strict localized paths feature disabled by default")
	}
	if siteCfg.Theme.Name != defaultEmbeddedSiteThemeName {
		t.Fatalf("expected default site theme %q, got %q", defaultEmbeddedSiteThemeName, siteCfg.Theme.Name)
	}
	if siteCfg.Theme.AllowRequestNameOverride == nil || *siteCfg.Theme.AllowRequestNameOverride {
		t.Fatalf("expected example site theme name override disabled by default")
	}
	if siteCfg.Theme.AllowRequestVariantOverride == nil || !*siteCfg.Theme.AllowRequestVariantOverride {
		t.Fatalf("expected example site theme variant override enabled by default")
	}
	if siteCfg.Fallback.Mode != quicksite.SiteFallbackModePublicContentOnly || !siteCfg.Fallback.AllowRoot {
		t.Fatalf("expected typed fallback defaults to be wired, got %+v", siteCfg.Fallback)
	}
	if got := siteCfg.Fallback.AllowedMethods; len(got) != 2 || got[0] != "GET" || got[1] != "HEAD" {
		t.Fatalf("expected GET/HEAD fallback methods, got %v", got)
	}
	if got := siteCfg.Fallback.ReservedPrefixes; len(got) != 6 || got[0] != "/.well-known" || got[1] != "/admin" || got[2] != "/api" || got[3] != "/api/v1" || got[4] != "/assets" || got[5] != "/static" {
		t.Fatalf("expected config-derived reserved prefixes, got %v", got)
	}
}

func TestResolveSiteRuntimeConfigEnvOverrides(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en", BasePath: "/admin", Theme: "admin-demo", ThemeVariant: "light"}
	runtimeSite := appcfg.Defaults().Site
	runtimeSite.AllowLocaleFallback = false
	runtimeSite.ContributionLocalePolicy = "strict"
	runtimeSite.LocalePrefixMode = "always"
	runtimeSite.EnableGeneratedFallback = true
	runtimeSite.EnableSearch = false
	runtimeSite.EnableCanonicalRedirect = false
	runtimeSite.CanonicalRedirectMode = string(quicksite.CanonicalRedirectResolvedLocale)
	runtimeSite.StrictLocalizedPaths = true
	runtimeSite.SupportedLocales = []string{"en", "es", "de"}
	runtimeSite.RuntimeEnv = "staging"
	runtimeSite.ContentChannel = "qa"
	runtimeSite.Theme = "marketing"
	runtimeSite.ThemeVariant = "clean"
	runtimeSite.AllowThemeNameOverride = true
	runtimeSite.AllowThemeVariantOverride = false
	runtimeSite.Fallback.Mode = string(quicksite.SiteFallbackModeExplicitPathsOnly)
	runtimeSite.Fallback.AllowRoot = false
	runtimeSite.Fallback.AllowedMethods = []string{"HEAD", "GET"}
	runtimeSite.Fallback.AllowedExactPaths = []string{"/search", "landing"}
	runtimeSite.Fallback.ReservedPrefixes = []string{"/admin", "/api"}
	runtimeSite.InternalOps.EnableHealthz = true
	runtimeSite.InternalOps.HealthzPath = "/readyz"
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
	if siteCfg.Navigation.ContributionLocalePolicy != quicksite.ContributionLocalePolicyStrict {
		t.Fatalf("expected strict contribution locale policy, got %q", siteCfg.Navigation.ContributionLocalePolicy)
	}
	if siteCfg.Features.EnableSearch == nil || *siteCfg.Features.EnableSearch {
		t.Fatalf("expected search feature disabled by env override")
	}
	if siteCfg.Features.EnableCanonicalRedirect == nil || *siteCfg.Features.EnableCanonicalRedirect {
		t.Fatalf("expected canonical redirect feature disabled by env override")
	}
	if siteCfg.Features.CanonicalRedirectMode != quicksite.CanonicalRedirectResolvedLocale {
		t.Fatalf("expected canonical redirect mode resolved by env override, got %q", siteCfg.Features.CanonicalRedirectMode)
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
	if siteCfg.ContentChannel != "qa" {
		t.Fatalf("expected content channel qa, got %q", siteCfg.ContentChannel)
	}
	if siteCfg.Theme.Name != "marketing" || siteCfg.Theme.Variant != "clean" {
		t.Fatalf("expected theme override marketing/clean, got %s/%s", siteCfg.Theme.Name, siteCfg.Theme.Variant)
	}
	if siteCfg.Theme.AllowRequestNameOverride == nil || !*siteCfg.Theme.AllowRequestNameOverride {
		t.Fatalf("expected theme name request override enabled, got %+v", siteCfg.Theme)
	}
	if siteCfg.Theme.AllowRequestVariantOverride == nil || *siteCfg.Theme.AllowRequestVariantOverride {
		t.Fatalf("expected theme override policy to follow env config, got %+v", siteCfg.Theme)
	}
	if siteCfg.Fallback.Mode != quicksite.SiteFallbackModeExplicitPathsOnly || siteCfg.Fallback.AllowRoot {
		t.Fatalf("expected explicit fallback override without root ownership, got %+v", siteCfg.Fallback)
	}
	if got := siteCfg.Fallback.AllowedMethods; len(got) != 2 || got[0] != "GET" || got[1] != "HEAD" {
		t.Fatalf("expected GET/HEAD normalization for fallback methods, got %v", got)
	}
	if got := siteCfg.Fallback.ReservedPrefixes; len(got) != 7 || got[0] != "/.well-known" || got[1] != "/admin" || got[2] != "/api" || got[3] != "/api/v1" || got[4] != "/assets" || got[5] != "/readyz" || got[6] != "/static" {
		t.Fatalf("expected derived defaults + explicit overrides + internal ops to become reserved, got %v", got)
	}
}

func TestResolveSiteRuntimeConfigContentChannelFallbacksToDefault(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en", BasePath: "/admin", Theme: "admin-demo", ThemeVariant: "light"}
	runtimeSite := appcfg.Defaults().Site
	runtimeSite.RuntimeEnv = "prod"
	runtimeSite.ContentChannel = ""
	siteCfg := resolveSiteRuntimeConfig(cfg, runtimeSite, false)

	if siteCfg.Environment != "prod" {
		t.Fatalf("expected runtime environment prod, got %q", siteCfg.Environment)
	}
	if siteCfg.ContentChannel != defaultSiteContentChannel {
		t.Fatalf("expected content channel fallback %q, got %q", defaultSiteContentChannel, siteCfg.ContentChannel)
	}
}

func TestResolveSiteRuntimeConfigDoesNotInheritAdminThemeDefaults(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en", BasePath: "/admin", Theme: "admin-demo", ThemeVariant: "light"}
	runtimeSite := appcfg.Defaults().Site
	runtimeSite.Theme = ""
	runtimeSite.ThemeVariant = ""

	siteCfg := resolveSiteRuntimeConfig(cfg, runtimeSite, true)
	if siteCfg.Theme.Name != defaultEmbeddedSiteThemeName {
		t.Fatalf("expected site runtime to keep embedded site theme default, got %q", siteCfg.Theme.Name)
	}
	if siteCfg.Theme.Variant != "" {
		t.Fatalf("expected site runtime to keep site variant independent from admin default, got %q", siteCfg.Theme.Variant)
	}
}

func TestResolveSiteRuntimeConfigDerivesSearchEndpointAndReservedPrefixesFromURLConfig(t *testing.T) {
	cfg := admin.Config{
		DefaultLocale: "en",
		BasePath:      "/admin",
		URLs: admin.URLConfig{
			Admin: admin.URLNamespaceConfig{BasePath: "/control"},
			Public: admin.URLNamespaceConfig{
				BasePath:   "/public",
				APIPrefix:  "content",
				APIVersion: "v3",
			},
		},
	}
	runtimeSite := appcfg.Defaults().Site
	siteCfg := resolveSiteRuntimeConfig(cfg, runtimeSite, true)

	if siteCfg.Search.Endpoint != "/public/content/v3/site/search" {
		t.Fatalf("expected config-derived search endpoint, got %q", siteCfg.Search.Endpoint)
	}
	if got := siteCfg.Fallback.ReservedPrefixes; len(got) != 8 || got[0] != "/.well-known" || got[1] != "/admin" || got[2] != "/api" || got[3] != "/assets" || got[4] != "/control" || got[5] != "/public/content" || got[6] != "/public/content/v3" || got[7] != "/static" {
		t.Fatalf("expected config-derived reserved prefixes, got %v", got)
	}
}
