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
				EnableI18N: boolPtr(true),
			},
		}),
	}

	ctx := router.NewMockContext()
	ctx.On("Path").Return("/site/es/about")

	if got := runtime.requestPathForResolution(ctx); got != "/about" {
		t.Fatalf("expected normalized request path /about, got %q", got)
	}
}

func TestDeliveryRequestPathForResolutionUsesRoutePathAndRestParams(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			BasePath:         "/site",
			SupportedLocales: []string{"en", "es"},
			Features: SiteFeatures{
				EnableI18N: boolPtr(true),
			},
		}),
	}

	ctx := router.NewMockContext()
	ctx.On("Path").Return("/ignored")
	ctx.ParamsM["path"] = "articles"
	ctx.ParamsM["rest"] = "launch"

	if got := runtime.requestPathForResolution(ctx); got != "/articles/launch" {
		t.Fatalf("expected route-param request path /articles/launch, got %q", got)
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
				EnableI18N:              boolPtr(true),
				EnableCanonicalRedirect: boolPtr(true),
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
