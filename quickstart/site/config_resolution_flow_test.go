package site

import (
	"context"
	"io/fs"
	"slices"
	"testing"
	"testing/fstest"

	"github.com/goliatone/go-admin/admin"
)

func TestResolveSiteLocaleDefaultsHonorsConfigFallbackAndDeduplicatesSupportedLocales(t *testing.T) {
	defaults := resolveSiteLocaleDefaults(admin.Config{DefaultLocale: "en"}, SiteConfig{
		DefaultLocale:       " es ",
		SupportedLocales:    []string{"fr", "ES", "fr"},
		AllowLocaleFallback: new(false),
		LocalePrefixMode:    LocalePrefixAlways,
	})

	if defaults.DefaultLocale != "es" {
		t.Fatalf("expected trimmed explicit default locale es, got %q", defaults.DefaultLocale)
	}
	if got, want := defaults.SupportedLocales, []string{"es", "fr"}; len(got) != len(want) || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("expected normalized supported locales %v, got %v", want, got)
	}
	if defaults.AllowLocaleFallback {
		t.Fatalf("expected explicit allowLocaleFallback=false")
	}
	if defaults.LocalePrefixMode != LocalePrefixAlways {
		t.Fatalf("expected locale prefix mode always, got %q", defaults.LocalePrefixMode)
	}

	defaults = resolveSiteLocaleDefaults(admin.Config{DefaultLocale: "en"}, SiteConfig{})
	if defaults.DefaultLocale != "en" {
		t.Fatalf("expected admin default locale fallback en, got %q", defaults.DefaultLocale)
	}
}

func TestResolveSiteRuntimeDefaultsSeparatesBaseEnvironmentAndContentChannel(t *testing.T) {
	defaults := resolveSiteRuntimeDefaults(admin.Config{Debug: admin.DebugConfig{Enabled: true}}, SiteConfig{
		BasePath:       " site ",
		Environment:    "production",
		ContentChannel: "stage",
	})

	if defaults.BasePath != "/site" {
		t.Fatalf("expected normalized base path /site, got %q", defaults.BasePath)
	}
	if defaults.Environment != "prod" {
		t.Fatalf("expected normalized environment prod, got %q", defaults.Environment)
	}
	if defaults.ContentChannel != "staging" {
		t.Fatalf("expected normalized content channel staging, got %q", defaults.ContentChannel)
	}

	defaults = resolveSiteRuntimeDefaults(admin.Config{Debug: admin.DebugConfig{Enabled: true}}, SiteConfig{})
	if defaults.Environment != "dev" {
		t.Fatalf("expected debug fallback environment dev, got %q", defaults.Environment)
	}
	if defaults.ContentChannel != "default" {
		t.Fatalf("expected default content channel fallback, got %q", defaults.ContentChannel)
	}
}

func TestResolveSiteViewSearchFeaturesAndThemeConfigsPreserveExistingContracts(t *testing.T) {
	fsA := fstest.MapFS{"a.txt": {Data: []byte("a")}}
	views := resolveSiteViewConfig(SiteViewConfig{
		TemplateFS:    []fs.FS{fsA},
		BaseTemplate:  "custom/base",
		ErrorTemplate: "custom/error",
		ErrorTemplatesByStatus: map[int]string{
			500: " site/error/500 ",
		},
		ErrorTemplatesByCode: map[string]string{
			"translation_missing": " site/error/custom_missing ",
		},
		AssetBasePath:       "assets",
		Reload:              new(true),
		ReloadInDevelopment: new(false),
	})

	if len(views.TemplateFS) != 1 {
		t.Fatalf("expected one template fs, got %d", len(views.TemplateFS))
	}
	if views.BaseTemplate != "custom/base" || views.ErrorTemplate != "custom/error" {
		t.Fatalf("expected custom templates preserved, got %+v", views)
	}
	if views.ErrorTemplatesByStatus[404] != "site/error/404" || views.ErrorTemplatesByStatus[500] != "site/error/500" {
		t.Fatalf("expected merged status templates, got %#v", views.ErrorTemplatesByStatus)
	}
	if views.ErrorTemplatesByCode[siteErrorCodeTranslationMissing] != "site/error/custom_missing" {
		t.Fatalf("expected merged code template override, got %#v", views.ErrorTemplatesByCode)
	}
	if views.AssetBasePath != "/assets" || !views.Reload || views.ReloadInDevelopment {
		t.Fatalf("expected normalized view flags, got %+v", views)
	}

	search := resolveSiteSearchConfig(SiteSearchConfig{
		Route:       "search",
		Endpoint:    "/api/search",
		Collections: []string{"pages", "posts"},
	})
	if search.Route != "/search" || search.Endpoint != "/api/search" {
		t.Fatalf("expected normalized search paths, got %+v", search)
	}
	if got, want := search.Indexes, []string{"pages", "posts"}; len(got) != len(want) || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("expected canonical search indexes %v, got %v", want, got)
	}

	features := resolveSiteFeatures(SiteFeatures{
		EnableSearch:            new(false),
		EnableTheme:             new(false),
		EnableCanonicalRedirect: new(false),
		CanonicalRedirectMode:   CanonicalRedirectRequestedLocaleSticky,
		StrictLocalizedPaths:    new(true),
	})
	if features.EnableSearch || features.EnableTheme || features.EnableCanonicalRedirect || !features.StrictLocalizedPaths {
		t.Fatalf("expected feature toggles preserved, got %+v", features)
	}
	if features.CanonicalRedirectMode != CanonicalRedirectRequestedLocaleSticky {
		t.Fatalf("expected sticky canonical redirect mode, got %q", features.CanonicalRedirectMode)
	}

	theme := resolveSiteThemeConfig(SiteThemeConfig{
		Name:                        " editorial ",
		Variant:                     " night ",
		BaselineVariant:             new(" "),
		AllowRequestNameOverride:    new(false),
		AllowRequestVariantOverride: new(true),
	})
	if theme.Name != "editorial" || theme.Variant != "night" {
		t.Fatalf("expected trimmed theme config, got %+v", theme)
	}
	if theme.BaselineVariant == nil || *theme.BaselineVariant != "" {
		t.Fatalf("expected baseline variant to preserve explicit base selection, got %+v", theme)
	}
	if theme.AllowRequestNameOverride || !theme.AllowRequestVariantOverride {
		t.Fatalf("expected theme request override policy preserved, got %+v", theme)
	}
}

func TestResolveSiteConfigFlowAssemblesResolvedConfigFromSectionBuilders(t *testing.T) {
	fsA := fstest.MapFS{"a.txt": {Data: []byte("a")}}
	baseline := ""
	provider := SiteThemeProvider(func(ctx context.Context, request SiteThemeRequest) (*admin.ThemeSelection, error) {
		return &admin.ThemeSelection{Name: request.Selector.Name, Variant: request.Selector.Variant}, nil
	})
	resolved := resolveSiteConfigFlow(admin.Config{DefaultLocale: "en"}, SiteConfig{
		BasePath:         "site",
		DefaultLocale:    "fr",
		SupportedLocales: []string{"en", "fr"},
		Navigation: SiteNavigationConfig{
			MainMenuLocation:        "marketing.main",
			EnableGeneratedFallback: true,
		},
		Views: SiteViewConfig{
			TemplateFS: []fs.FS{fsA},
		},
		Search: SiteSearchConfig{
			Indexes: []string{"pages"},
		},
		Fallback: SiteFallbackPolicy{
			Mode:              SiteFallbackModeExplicitPathsOnly,
			AllowRoot:         true,
			AllowedExactPaths: []string{"/search", "landing"},
		},
		Modules:       []SiteModule{moduleStub{id: "site"}},
		Theme:         SiteThemeConfig{Name: "editorial", Variant: "night", BaselineVariant: &baseline},
		ThemeProvider: provider,
	})

	if resolved.BasePath != "/site" {
		t.Fatalf("expected normalized base path /site, got %q", resolved.BasePath)
	}
	if resolved.DefaultLocale != "fr" {
		t.Fatalf("expected default locale fr, got %q", resolved.DefaultLocale)
	}
	if resolved.Navigation.MainMenuLocation != "marketing.main" || !resolved.Navigation.EnableGeneratedFallback {
		t.Fatalf("expected navigation builder values preserved, got %+v", resolved.Navigation)
	}
	if len(resolved.Views.TemplateFS) != 1 {
		t.Fatalf("expected view builder to preserve template fs, got %d", len(resolved.Views.TemplateFS))
	}
	if got, want := resolved.Search.Indexes, []string{"pages"}; len(got) != len(want) || got[0] != want[0] {
		t.Fatalf("expected search builder indexes %v, got %v", want, got)
	}
	if len(resolved.Modules) != 1 || resolved.Modules[0].ID() != "site" {
		t.Fatalf("expected module compaction preserved site module, got %#v", resolved.Modules)
	}
	if resolved.Fallback.Mode != SiteFallbackModeExplicitPathsOnly || len(resolved.Fallback.AllowedExactPaths) != 2 {
		t.Fatalf("expected fallback builder values preserved, got %+v", resolved.Fallback)
	}
	if resolved.Theme.Name != "editorial" || resolved.Theme.Variant != "night" {
		t.Fatalf("expected theme builder values preserved, got %+v", resolved.Theme)
	}
	if resolved.Theme.BaselineVariant == nil || *resolved.Theme.BaselineVariant != "" {
		t.Fatalf("expected baseline variant metadata preserved, got %+v", resolved.Theme)
	}
	if resolved.ThemeProvider == nil {
		t.Fatalf("expected site theme provider to be preserved")
	}
	if !resolved.Theme.AllowRequestNameOverride || !resolved.Theme.AllowRequestVariantOverride {
		t.Fatalf("expected default request override policy enabled, got %+v", resolved.Theme)
	}
}

func TestResolveSiteConfigFlowAddsEnabledInternalOpsPathsToReservedPrefixes(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	resolved := resolveSiteConfigFlow(cfg, SiteConfig{
		InternalOps: SiteInternalOpsConfig{
			EnableHealthz: true,
			EnableStatus:  true,
			HealthzPath:   "/readyz",
			StatusPath:    "ops/status",
		},
		Fallback: SiteFallbackPolicy{
			ReservedPrefixes: []string{"/admin", "/custom"},
		},
	})

	if !resolved.InternalOps.EnableHealthz || !resolved.InternalOps.EnableStatus {
		t.Fatalf("expected internal ops enablement preserved, got %+v", resolved.InternalOps)
	}
	if resolved.InternalOps.HealthzPath != "/readyz" || resolved.InternalOps.StatusPath != "/ops/status" {
		t.Fatalf("expected internal ops paths normalized, got %+v", resolved.InternalOps)
	}

	want := append([]string{}, DefaultSiteFallbackPolicy().ReservedPrefixes...)
	want = append(want, SiteReservedPrefixesForAdminConfig(cfg)...)
	want = append(want, "/admin", "/custom", "/ops/status", "/readyz")
	slices.Sort(want)
	want = slices.Compact(want)
	got := resolved.Fallback.ReservedPrefixes
	if len(got) != len(want) {
		t.Fatalf("expected reserved prefixes %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected reserved prefixes %v, got %v", want, got)
		}
	}
}

//go:fix inline
func stringPtr(value string) *string {
	return new(value)
}
