package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestResolveRequestEnvironmentPrefersRequestAndFallsBack(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["runtime_env"] = " preview "
	if got := resolveRequestEnvironment(ctx, "prod"); got != "preview" {
		t.Fatalf("expected preview runtime env, got %q", got)
	}

	ctx = router.NewMockContext()
	ctx.HeadersM["X-Site-Environment"] = " staging "
	if got := resolveRequestEnvironment(ctx, "prod"); got != "staging" {
		t.Fatalf("expected staging runtime env from header, got %q", got)
	}

	if got := resolveRequestEnvironment(nil, " dev "); got != "dev" {
		t.Fatalf("expected fallback env dev, got %q", got)
	}
	if got := resolveRequestEnvironment(router.NewMockContext(), ""); got != "prod" {
		t.Fatalf("expected default runtime env prod, got %q", got)
	}
}

func TestResolveRequestContentChannelPrefersRequestSourcesAndFallback(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM[admin.ContentChannelScopeQueryParam] = " preview "
	if got := resolveRequestContentChannel(ctx, "default"); got != "preview" {
		t.Fatalf("expected preview content channel, got %q", got)
	}

	ctx = router.NewMockContext()
	ctx.HeadersM["X-Content-Channel"] = " staging "
	if got := resolveRequestContentChannel(ctx, "default"); got != "staging" {
		t.Fatalf("expected staging content channel from header, got %q", got)
	}

	ctx = router.NewMockContext()
	ctx.CookiesM[defaultContentChannelCookie] = "qa"
	if got := resolveRequestContentChannel(ctx, "default"); got != "qa" {
		t.Fatalf("expected cookie channel qa, got %q", got)
	}

	if got := resolveRequestContentChannel(nil, " editorial "); got != "editorial" {
		t.Fatalf("expected fallback channel editorial, got %q", got)
	}
	if got := resolveRequestContentChannel(router.NewMockContext(), ""); got != "default" {
		t.Fatalf("expected default content channel, got %q", got)
	}
}

func TestResolveRequestLocaleHonorsPriorityChainAndFallbacks(t *testing.T) {
	supported := []string{"en", "fr", "es"}

	ctx := router.NewMockContext()
	ctx.ParamsM["locale"] = "fr"
	ctx.QueriesM["locale"] = "es"
	ctx.On("Path").Return("/locales")
	if got := resolveRequestLocale(ctx, true, "en", supported); got != "fr" {
		t.Fatalf("expected param locale fr, got %q", got)
	}

	ctx = router.NewMockContext()
	ctx.ParamsM["path"] = "es/articles"
	ctx.On("Path").Return("/es/articles")
	if got := resolveRequestLocale(ctx, true, "en", supported); got != "es" {
		t.Fatalf("expected path locale es, got %q", got)
	}

	ctx = router.NewMockContext()
	ctx.HeadersM["Accept-Language"] = "fr-CA,es;q=0.8"
	ctx.On("Path").Return("/locales")
	if got := resolveRequestLocale(ctx, true, "en", supported); got != "fr" {
		t.Fatalf("expected accepted language locale fr, got %q", got)
	}

	ctx = router.NewMockContext()
	ctx.On("Path").Return("/locales")
	if got := resolveRequestLocale(ctx, false, "en", supported); got != "en" {
		t.Fatalf("expected fallback locale en when i18n disabled, got %q", got)
	}
}

func TestResolveRequestThemeHonorsEnvironmentOverrideAndFallbackBehavior(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Features: SiteFeatures{
			EnableTheme: boolPtr(true),
		},
		Theme: SiteThemeConfig{
			Name:    "docs",
			Variant: "light",
		},
	})

	ctx := router.NewMockContext()
	ctx.QueriesM["theme"] = " custom "
	ctx.QueriesM["variant"] = " dark "

	requestCtx, payload, name, variant := resolveRequestTheme(ctx, nil, context.Background(), siteCfg, "preview")
	if selection := admin.ThemeSelectorFromContext(requestCtx); selection.Name != "custom" || selection.Variant != "dark" {
		t.Fatalf("expected theme override in context, got %+v", selection)
	}
	if name != "custom" || variant != "dark" {
		t.Fatalf("expected override names custom/dark, got %q/%q", name, variant)
	}
	if payload["selection"]["name"] != "custom" || payload["selection"]["variant"] != "dark" {
		t.Fatalf("expected selection payload to preserve override, got %+v", payload)
	}

	adm := mustAdminWithTheme(t, "admin", "light")
	requestCtx, payload, name, variant = resolveRequestTheme(ctx, adm, context.Background(), siteCfg, "prod")
	if selection := admin.ThemeSelectorFromContext(requestCtx); selection.Name != "docs" || selection.Variant != "light" {
		t.Fatalf("expected prod to keep configured theme selection, got %+v", selection)
	}
	if name != "docs" || variant != "light" {
		t.Fatalf("expected resolved configured theme payload name/variant, got %q/%q", name, variant)
	}
	if payload["selection"]["name"] != "docs" {
		t.Fatalf("expected configured theme payload selection, got %+v", payload)
	}
}

func TestResolveRequestThemeHonorsPerFieldRequestOverridePolicy(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Features: SiteFeatures{
			EnableTheme: boolPtr(true),
		},
		Theme: SiteThemeConfig{
			Name:                        "docs",
			Variant:                     "light",
			AllowRequestNameOverride:    boolPtr(false),
			AllowRequestVariantOverride: boolPtr(true),
		},
	})

	ctx := router.NewMockContext()
	ctx.QueriesM["theme"] = "custom"
	ctx.QueriesM["variant"] = "dark"

	requestCtx, payload, name, variant := resolveRequestTheme(ctx, nil, context.Background(), siteCfg, "staging")
	if selection := admin.ThemeSelectorFromContext(requestCtx); selection.Name != "docs" || selection.Variant != "dark" {
		t.Fatalf("expected name override blocked and variant override allowed, got %+v", selection)
	}
	if name != "docs" || variant != "dark" {
		t.Fatalf("expected resolved selection docs/dark, got %q/%q", name, variant)
	}
	if payload["selection"]["name"] != "docs" || payload["selection"]["variant"] != "dark" {
		t.Fatalf("expected payload to preserve filtered override policy, got %+v", payload)
	}
}
