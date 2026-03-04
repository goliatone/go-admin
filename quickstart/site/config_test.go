package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestResolveSiteConfigDefaults(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	resolved := ResolveSiteConfig(cfg, SiteConfig{})

	if resolved.BasePath != "/" {
		t.Fatalf("expected default base path /, got %q", resolved.BasePath)
	}
	if resolved.DefaultLocale != "en" {
		t.Fatalf("expected default locale en, got %q", resolved.DefaultLocale)
	}
	if len(resolved.SupportedLocales) != 1 || resolved.SupportedLocales[0] != "en" {
		t.Fatalf("expected supported locales [en], got %+v", resolved.SupportedLocales)
	}
	if !resolved.AllowLocaleFallback {
		t.Fatalf("expected allow locale fallback by default")
	}
	if resolved.LocalePrefixMode != LocalePrefixNonDefault {
		t.Fatalf("expected locale prefix mode non_default, got %q", resolved.LocalePrefixMode)
	}
	if resolved.Environment != "prod" {
		t.Fatalf("expected default environment prod, got %q", resolved.Environment)
	}
	if resolved.ContentChannel != "default" {
		t.Fatalf("expected default content channel default, got %q", resolved.ContentChannel)
	}

	if resolved.Navigation.MainMenuLocation != DefaultMainMenuLocation {
		t.Fatalf("expected main menu location %q, got %q", DefaultMainMenuLocation, resolved.Navigation.MainMenuLocation)
	}
	if resolved.Navigation.FooterMenuLocation != DefaultFooterMenuLocation {
		t.Fatalf("expected footer menu location %q, got %q", DefaultFooterMenuLocation, resolved.Navigation.FooterMenuLocation)
	}
	if resolved.Navigation.FallbackMenuCode != DefaultFallbackMenuCode {
		t.Fatalf("expected fallback menu code %q, got %q", DefaultFallbackMenuCode, resolved.Navigation.FallbackMenuCode)
	}
	if resolved.Navigation.ContributionLocalePolicy != ContributionLocalePolicyFallback {
		t.Fatalf("expected contribution locale policy fallback, got %q", resolved.Navigation.ContributionLocalePolicy)
	}

	if resolved.Views.BaseTemplate != DefaultBaseTemplate {
		t.Fatalf("expected base template %q, got %q", DefaultBaseTemplate, resolved.Views.BaseTemplate)
	}
	if resolved.Views.ErrorTemplate != DefaultErrorTemplate {
		t.Fatalf("expected error template %q, got %q", DefaultErrorTemplate, resolved.Views.ErrorTemplate)
	}
	if got := resolved.Views.ErrorTemplatesByStatus[404]; got != "site/error/404" {
		t.Fatalf("expected default 404 error template contract, got %q", got)
	}
	if got := resolved.Views.ErrorTemplatesByCode[siteErrorCodeTranslationMissing]; got != "site/error/missing_translation" {
		t.Fatalf("expected default translation missing template contract, got %q", got)
	}
	if resolved.Views.Reload {
		t.Fatalf("expected reload false by default")
	}
	if !resolved.Views.ReloadInDevelopment {
		t.Fatalf("expected reload in development true by default")
	}

	if resolved.Search.Route != DefaultSearchRoute {
		t.Fatalf("expected search route %q, got %q", DefaultSearchRoute, resolved.Search.Route)
	}
	if resolved.Search.Endpoint != DefaultSearchEndpoint {
		t.Fatalf("expected search endpoint %q, got %q", DefaultSearchEndpoint, resolved.Search.Endpoint)
	}

	if !resolved.Features.EnablePreview || !resolved.Features.EnableI18N || !resolved.Features.EnableSearch || !resolved.Features.EnableTheme || !resolved.Features.EnableMenuDraftPreview || !resolved.Features.EnableCanonicalRedirect || resolved.Features.StrictLocalizedPaths {
		t.Fatalf("expected all feature flags enabled by default, got %+v", resolved.Features)
	}
	if resolved.Features.CanonicalRedirectMode != CanonicalRedirectResolvedLocale {
		t.Fatalf("expected canonical redirect mode %q by default, got %q", CanonicalRedirectResolvedLocale, resolved.Features.CanonicalRedirectMode)
	}
}

func TestResolveSiteConfigHonorsFeatureAndFallbackOverrides(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en", Debug: admin.DebugConfig{Enabled: true}}
	resolved := ResolveSiteConfig(cfg, SiteConfig{
		AllowLocaleFallback: boolPtr(false),
		Environment:         "staging",
		ContentChannel:      "prod",
		Features: SiteFeatures{
			EnableSearch:            boolPtr(false),
			EnableTheme:             boolPtr(false),
			EnableCanonicalRedirect: boolPtr(false),
			CanonicalRedirectMode:   CanonicalRedirectRequestedLocaleSticky,
			StrictLocalizedPaths:    boolPtr(true),
		},
		Navigation: SiteNavigationConfig{
			ContributionLocalePolicy: ContributionLocalePolicyStrict,
		},
		Views: SiteViewConfig{
			Reload: boolPtr(true),
			ErrorTemplatesByStatus: map[int]string{
				418: "site/error/teapot",
			},
			ErrorTemplatesByCode: map[string]string{
				"translation_missing": "site/error/custom_missing_translation",
			},
		},
	})

	if resolved.AllowLocaleFallback {
		t.Fatalf("expected locale fallback override false")
	}
	if resolved.Environment != "staging" {
		t.Fatalf("expected environment staging, got %q", resolved.Environment)
	}
	if resolved.ContentChannel != "prod" {
		t.Fatalf("expected content channel prod, got %q", resolved.ContentChannel)
	}
	if resolved.Navigation.ContributionLocalePolicy != ContributionLocalePolicyStrict {
		t.Fatalf("expected strict contribution locale policy, got %q", resolved.Navigation.ContributionLocalePolicy)
	}
	if resolved.Features.EnableSearch {
		t.Fatalf("expected search feature disabled")
	}
	if resolved.Features.EnableTheme {
		t.Fatalf("expected theme feature disabled")
	}
	if !resolved.Features.EnablePreview {
		t.Fatalf("expected unspecified feature to keep default enabled")
	}
	if resolved.Features.EnableCanonicalRedirect {
		t.Fatalf("expected canonical redirect feature disabled")
	}
	if resolved.Features.CanonicalRedirectMode != CanonicalRedirectRequestedLocaleSticky {
		t.Fatalf("expected canonical redirect mode sticky, got %q", resolved.Features.CanonicalRedirectMode)
	}
	if !resolved.Features.StrictLocalizedPaths {
		t.Fatalf("expected strict localized paths feature enabled")
	}
	if !resolved.Views.Reload {
		t.Fatalf("expected explicit reload=true")
	}
	if got := resolved.Views.ErrorTemplatesByStatus[404]; got != "site/error/404" {
		t.Fatalf("expected default 404 template retained, got %q", got)
	}
	if got := resolved.Views.ErrorTemplatesByStatus[418]; got != "site/error/teapot" {
		t.Fatalf("expected custom status template, got %q", got)
	}
	if got := resolved.Views.ErrorTemplatesByCode[siteErrorCodeTranslationMissing]; got != "site/error/custom_missing_translation" {
		t.Fatalf("expected override for translation_missing template, got %q", got)
	}
}

func TestResolveSiteConfigResolvesRuntimeAndContentChannelsIndependently(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	resolved := ResolveSiteConfig(cfg, SiteConfig{ContentChannel: "staging"})

	if resolved.ContentChannel != "staging" {
		t.Fatalf("expected content channel from config override, got %q", resolved.ContentChannel)
	}
	if resolved.Environment != "prod" {
		t.Fatalf("expected runtime environment default prod when Environment is unset, got %q", resolved.Environment)
	}

	resolved = ResolveSiteConfig(cfg, SiteConfig{
		Environment:    "development",
		ContentChannel: "staging",
	})
	if resolved.Environment != "dev" {
		t.Fatalf("expected runtime environment dev from Environment override, got %q", resolved.Environment)
	}
	if resolved.ContentChannel != "staging" {
		t.Fatalf("expected content channel override to remain unchanged, got %q", resolved.ContentChannel)
	}
}

func TestResolveSiteConfigContentChannelDefaultsToDefaultWhenRuntimeIsSet(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	resolved := ResolveSiteConfig(cfg, SiteConfig{Environment: "staging"})

	if resolved.Environment != "staging" {
		t.Fatalf("expected runtime environment staging from Environment override, got %q", resolved.Environment)
	}
	if resolved.ContentChannel != "default" {
		t.Fatalf("expected content channel default when ContentChannel is unset, got %q", resolved.ContentChannel)
	}
}

func TestResolveSiteConfigPreservesExplicitDefaultContentChannel(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	resolved := ResolveSiteConfig(cfg, SiteConfig{
		Environment:    "dev",
		ContentChannel: "default",
	})

	if resolved.Environment != "dev" {
		t.Fatalf("expected runtime environment dev, got %q", resolved.Environment)
	}
	if resolved.ContentChannel != "default" {
		t.Fatalf("expected explicit default content channel to be preserved, got %q", resolved.ContentChannel)
	}
}

func boolPtr(value bool) *bool {
	return &value
}
