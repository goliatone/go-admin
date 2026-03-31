package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

type recordingSearchFilterModule struct {
	response map[string][]string
	lastReq  SiteSearchFilterRequest
}

func (m *recordingSearchFilterModule) ID() string { return "recording-search-filter-module" }

func (m *recordingSearchFilterModule) RegisterRoutes(SiteModuleContext) error { return nil }

func (m *recordingSearchFilterModule) ViewContext(_ context.Context, in router.ViewContext) router.ViewContext {
	return in
}

func (m *recordingSearchFilterModule) SearchFilters(_ context.Context, _ router.Context, req SiteSearchFilterRequest) map[string][]string {
	m.lastReq = req
	return cloneSearchFilters(m.response)
}

func TestSearchRequestTranslationSupportBuildSearchRequestTranslationSeedBuildsNormalizedSeed(t *testing.T) {
	runtime := &searchRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Search: SiteSearchConfig{
				Indexes: []string{"media", "docs"},
			},
		}),
	}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(auth.WithActorContext(context.Background(), &auth.ActorContext{
		Subject: "user-42",
		Role:    "editor",
	}))
	ctx.On("Method").Return("GET")
	ctx.On("Path").Return("/search")
	ctx.On("IP").Return("127.0.0.1")
	ctx.HeadersM["User-Agent"] = "test-agent"
	ctx.HeadersM["Accept-Language"] = "es-MX"
	ctx.QueriesM = map[string]string{
		"q":            "archive",
		"locale":       "es",
		"facet":        "content_type,category",
		"collection":   "media,docs",
		"content_type": "post",
		"tag":          "go",
	}

	seed := runtime.buildSearchRequestTranslationSeed(ctx, RequestState{Locale: "en"})

	if seed.locale != "es" || seed.query != "archive" {
		t.Fatalf("unexpected seed identity: %+v", seed)
	}
	if len(seed.indexes) != 2 || seed.indexes[0] != "media" || seed.indexes[1] != "docs" {
		t.Fatalf("expected indexes [media docs], got %+v", seed.indexes)
	}
	if len(seed.facets) != 2 || seed.facets[0] != "content_type" || seed.facets[1] != "category" {
		t.Fatalf("expected facets [content_type category], got %+v", seed.facets)
	}
	if got := seed.filters["content_type"]; len(got) != 1 || got[0] != "post" {
		t.Fatalf("expected content_type filter to be preserved, got %+v", seed.filters)
	}
	if got := seed.filters["tag"]; len(got) != 1 || got[0] != "go" {
		t.Fatalf("expected tag filter to be preserved, got %+v", seed.filters)
	}
	actorID := anyString(nestedMapFromAny(seed.actor)["actor_id"])
	if actorID != "user-42" {
		t.Fatalf("expected actor payload to include user-42, got %+v", seed.actor)
	}
	if seed.acceptLanguage != "es-MX" {
		t.Fatalf("expected accept-language es-MX, got %+v", seed)
	}
}

func TestSearchRequestTranslationSupportInjectSearchRequestFiltersPreservesFlagsAndClonesInputs(t *testing.T) {
	module := &recordingSearchFilterModule{
		response: map[string][]string{
			"module_scope": {"beta"},
		},
	}
	runtime := &searchRuntime{modules: []SiteModule{module}}
	seed := searchRequestTranslationSeed{
		query:   "archive",
		locale:  "en",
		filters: map[string][]string{"content_type": {"post"}},
	}
	filters := map[string][]string{"content_type": {"post"}}
	ranges := []admin.SearchRange{{Field: "published_year", GTE: 2024}}

	out := runtime.injectSearchRequestFilters(context.Background(), nil, seed, filters, ranges, false)

	if module.lastReq.Query != "archive" || module.lastReq.Locale != "en" {
		t.Fatalf("unexpected injected request identity: %+v", module.lastReq)
	}
	if module.lastReq.IsSuggest {
		t.Fatalf("expected IsSuggest false, got %+v", module.lastReq)
	}
	if len(module.lastReq.Ranges) != 1 || module.lastReq.Ranges[0].Field != "published_year" {
		t.Fatalf("expected ranges to be forwarded to module injector, got %+v", module.lastReq.Ranges)
	}
	if got := out["module_scope"]; len(got) != 1 || got[0] != "beta" {
		t.Fatalf("expected injected module_scope filter, got %+v", out)
	}
	module.lastReq.Filters["content_type"][0] = "page"
	if filters["content_type"][0] != "post" {
		t.Fatalf("expected input filters to remain cloned, got %+v", filters)
	}
	module.lastReq.Ranges[0].Field = "duration_seconds"
	if ranges[0].Field != "published_year" {
		t.Fatalf("expected input ranges to remain cloned, got %+v", ranges)
	}
}

func TestSearchRequestTranslationSupportInjectSearchRequestFiltersForSuggestMarksSuggestAndOmitsRanges(t *testing.T) {
	module := &recordingSearchFilterModule{}
	runtime := &searchRuntime{modules: []SiteModule{module}}
	seed := searchRequestTranslationSeed{
		query:  "archive",
		locale: "es",
	}

	_ = runtime.injectSearchRequestFilters(context.Background(), nil, seed, map[string][]string{}, nil, true)

	if !module.lastReq.IsSuggest {
		t.Fatalf("expected IsSuggest true, got %+v", module.lastReq)
	}
	if len(module.lastReq.Ranges) != 0 {
		t.Fatalf("expected no ranges for suggest path, got %+v", module.lastReq.Ranges)
	}
}

func TestSearchRequestTranslationSupportApplySearchLandingFiltersAddsTopicPresetFacetFilters(t *testing.T) {
	filters := map[string][]string{
		"content_type": {"post"},
	}

	applySearchLandingFilters(filters, &searchLandingState{Slug: "architecture"})

	values := filters["topic_hierarchy"]
	if len(values) != 1 || values[0] != "Teaching Topics > Architecture" {
		t.Fatalf("expected topic_hierarchy landing filter, got %+v", filters)
	}
	if got := filters["content_type"]; len(got) != 1 || got[0] != "post" {
		t.Fatalf("expected unrelated filters to remain intact, got %+v", filters)
	}
}
