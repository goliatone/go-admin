package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestDeliveryRequestPathForResolutionStripsBasePathAndLocalePrefix(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			BasePath:         "/site",
			SupportedLocales: []string{"en", "es"},
			Features: SiteFeatures{
				EnableI18N: new(true),
			},
		}),
	}

	ctx := router.NewMockContext()
	ctx.On("Path").Return("/site/es/about")

	if got := runtime.requestPathForResolution(ctx); got != "/about" {
		t.Fatalf("expected normalized request path /about, got %q", got)
	}
}

func TestDeliveryRequestPathForResolutionUsesRequestPathInsteadOfRouteParams(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			BasePath:         "/site",
			SupportedLocales: []string{"en", "es"},
			Features: SiteFeatures{
				EnableI18N: new(true),
			},
		}),
	}

	ctx := router.NewMockContext()
	ctx.On("Path").Return("/site/es/articles/launch")
	ctx.ParamsM["path"] = "articles"
	ctx.ParamsM["rest"] = "launch"

	if got := runtime.requestPathForResolution(ctx); got != "/articles/launch" {
		t.Fatalf("expected request path /articles/launch after base/locale normalization, got %q", got)
	}
}

func TestCanonicalRedirectLocaleUsesStickyRequestedLocaleForMissingTranslation(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Features: SiteFeatures{
				CanonicalRedirectMode: CanonicalRedirectRequestedLocaleSticky,
			},
		}),
	}

	resolution := &deliveryResolution{
		RequestedLocale:  "es",
		ResolvedLocale:   "en",
		MissingRequested: true,
	}

	if got := runtime.canonicalRedirectLocale(resolution); got != "es" {
		t.Fatalf("expected sticky requested locale es, got %q", got)
	}
}

func TestCanonicalRedirectTargetBuildsLocalizedBasePathAndSortedQuery(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			BasePath:         "/site",
			SupportedLocales: []string{"en", "es"},
			LocalePrefixMode: LocalePrefixNonDefault,
			Features: SiteFeatures{
				EnableI18N:              new(true),
				EnableCanonicalRedirect: new(true),
				CanonicalRedirectMode:   CanonicalRedirectRequestedLocaleSticky,
			},
		}),
	}

	ctx := router.NewMockContext()
	ctx.On("Path").Return("/site/about")
	ctx.On("Method").Return("GET")
	ctx.QueriesM["q"] = "search"
	ctx.QueriesM["page"] = "2"

	resolution := &deliveryResolution{
		RequestedLocale:  "es",
		ResolvedLocale:   "en",
		MissingRequested: true,
		Capability:       deliveryCapability{TypeSlug: "page", Kind: "page"},
		Record: &admin.CMSContent{
			ID:              "about-record",
			Slug:            "about",
			Locale:          "en",
			Status:          "published",
			ContentType:     "page",
			ContentTypeSlug: "page",
			Data:            map[string]any{"path": "/about"},
		},
	}

	if got := runtime.canonicalRedirectTarget(ctx, resolution); got != "/site/es/about?page=2&q=search" {
		t.Fatalf("expected canonical redirect target /site/es/about?page=2&q=search, got %q", got)
	}
}

func TestCanonicalRedirectTargetCanonicalizesLegacyLocalizedStoredPaths(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			SupportedLocales: []string{"en", "bo", "zh"},
			LocalePrefixMode: LocalePrefixNonDefault,
			Features: SiteFeatures{
				EnableI18N:              new(true),
				EnableCanonicalRedirect: new(true),
			},
		}),
	}

	ctx := router.NewMockContext()
	ctx.On("Path").Return("/bo/bo")
	ctx.On("Method").Return("GET")
	ctx.QueriesM["locale"] = "en"

	resolution := &deliveryResolution{
		RequestedLocale: "en",
		ResolvedLocale:  "bo",
		Capability:      deliveryCapability{TypeSlug: "page", Kind: "page"},
		Record: &admin.CMSContent{
			ID:              "home-bo",
			Slug:            "home",
			Locale:          "bo",
			Status:          "published",
			ContentType:     "page",
			ContentTypeSlug: "page",
			Data:            map[string]any{"path": "/bo"},
		},
	}

	if got := runtime.canonicalRedirectTarget(ctx, resolution); got != "/bo?locale=en" {
		t.Fatalf("expected canonical redirect target /bo?locale=en, got %q", got)
	}
}

func TestCanonicalRedirectTargetDoesNotRedirectCanonicalLocalizedRootToDoublePrefix(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			SupportedLocales: []string{"en", "bo", "zh"},
			LocalePrefixMode: LocalePrefixNonDefault,
			Features: SiteFeatures{
				EnableI18N:              new(true),
				EnableCanonicalRedirect: new(true),
			},
		}),
	}

	ctx := router.NewMockContext()
	ctx.On("Path").Return("/bo")
	ctx.On("Method").Return("GET")
	ctx.QueriesM["locale"] = "en"

	resolution := &deliveryResolution{
		RequestedLocale: "en",
		ResolvedLocale:  "bo",
		Capability:      deliveryCapability{TypeSlug: "page", Kind: "page"},
		Record: &admin.CMSContent{
			ID:              "home-bo",
			Slug:            "home",
			Locale:          "bo",
			Status:          "published",
			ContentType:     "page",
			ContentTypeSlug: "page",
			Data:            map[string]any{"path": "/bo"},
		},
	}

	if got := runtime.canonicalRedirectTarget(ctx, resolution); got != "" {
		t.Fatalf("expected canonical localized root to avoid redirect, got %q", got)
	}
}

func TestCanonicalRedirectTargetPreservesCanonicalLocaleLikeSlugPaths(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			SupportedLocales: []string{"en", "bo", "zh"},
			LocalePrefixMode: LocalePrefixNonDefault,
			Features: SiteFeatures{
				EnableI18N:              new(true),
				EnableCanonicalRedirect: new(true),
			},
		}),
	}

	ctx := router.NewMockContext()
	ctx.On("Path").Return("/wrong")
	ctx.On("Method").Return("GET")

	resolution := &deliveryResolution{
		RequestedLocale: "en",
		ResolvedLocale:  "en",
		Capability:      deliveryCapability{TypeSlug: "page", Kind: "page"},
		Record: &admin.CMSContent{
			ID:              "bo-slug-en",
			Slug:            "bo",
			Locale:          "en",
			Status:          "published",
			ContentType:     "page",
			ContentTypeSlug: "page",
			Data:            map[string]any{"path": "/bo"},
		},
	}

	if got := runtime.canonicalRedirectTarget(ctx, resolution); got != "/bo" {
		t.Fatalf("expected canonical locale-like slug path /bo to remain /bo, got %q", got)
	}
}

func TestCanonicalRedirectTargetDoesNotRewriteLocaleLikeSlugWhenI18NDisabled(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			SupportedLocales: []string{"en", "bo", "zh"},
			LocalePrefixMode: LocalePrefixNonDefault,
			Features: SiteFeatures{
				EnableCanonicalRedirect: new(true),
			},
		}),
	}

	ctx := router.NewMockContext()
	ctx.On("Path").Return("/wrong")
	ctx.On("Method").Return("GET")

	resolution := &deliveryResolution{
		RequestedLocale: "en",
		ResolvedLocale:  "en",
		Capability:      deliveryCapability{TypeSlug: "page", Kind: "page"},
		Record: &admin.CMSContent{
			ID:              "bo-slug-en",
			Slug:            "bo",
			Locale:          "en",
			Status:          "published",
			ContentType:     "page",
			ContentTypeSlug: "page",
			Data:            map[string]any{"path": "/bo"},
		},
	}

	if got := runtime.canonicalRedirectTarget(ctx, resolution); got != "/bo" {
		t.Fatalf("expected i18n-disabled canonical path /bo to remain /bo, got %q", got)
	}
}

func TestWantsJSONResponseRecognizesQueryAndAcceptHeader(t *testing.T) {
	queryCtx := router.NewMockContext()
	queryCtx.QueriesM["format"] = "json"
	if !wantsJSONResponse(queryCtx) {
		t.Fatalf("expected format=json to request json")
	}

	headerCtx := router.NewMockContext()
	headerCtx.HeadersM["Accept"] = "text/html, application/json"
	if !wantsJSONResponse(headerCtx) {
		t.Fatalf("expected Accept header to request json")
	}
}

func TestEncodeRequestQuerySortsKeysAndUsesScalarFallback(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["z"] = "last"
	ctx.QueriesM["a"] = "first"

	if got := encodeRequestQuery(ctx); got != "a=first&z=last" {
		t.Fatalf("expected sorted encoded query a=first&z=last, got %q", got)
	}
}
