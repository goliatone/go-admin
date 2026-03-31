package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestSearchRequestExecutionRuntimeExecuteSearchReturnsEmptyDefaultsForBlankQuery(t *testing.T) {
	provider := &recordingSiteSearchProvider{}
	runtime := &searchRuntime{provider: provider}

	result, err := runtime.executeSearch(nil, admin.SearchRequest{Query: "   ", Page: 0, PerPage: 0})
	if err != nil {
		t.Fatalf("executeSearch returned error for blank query: %v", err)
	}
	if provider.searchCalls != 0 {
		t.Fatalf("expected provider to be skipped for blank query, got %d calls", provider.searchCalls)
	}
	if result.Page != 1 || result.PerPage != 10 || result.Total != 0 || len(result.Hits) != 0 {
		t.Fatalf("expected default empty search result, got %+v", result)
	}
}

func TestSearchRequestExecutionRuntimeExecuteSearchNormalizesProviderResultDefaults(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchResult: admin.SearchResultPage{
			Page:    0,
			PerPage: 0,
			Total:   3,
		},
	}
	runtime := &searchRuntime{provider: provider}

	result, err := runtime.executeSearch(nil, admin.SearchRequest{Query: "archive", Page: 2, PerPage: 5})
	if err != nil {
		t.Fatalf("executeSearch returned error: %v", err)
	}
	if provider.searchCalls != 1 {
		t.Fatalf("expected one provider search call, got %d", provider.searchCalls)
	}
	if result.Page != 2 || result.PerPage != 5 {
		t.Fatalf("expected provider defaults to be normalized from request, got %+v", result)
	}
	if result.Hits == nil || len(result.Hits) != 0 {
		t.Fatalf("expected nil hits to normalize to an empty slice, got %+v", result.Hits)
	}
}

func TestSearchRequestExecutionRuntimeTranslateSearchRequestBuildsCoreRequest(t *testing.T) {
	module := &recordingSearchFilterModule{
		response: map[string][]string{
			"module_scope": {"module-default", "beta"},
		},
	}
	runtime := &searchRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Search: SiteSearchConfig{
				Collections: []string{"media", "docs"},
			},
		}),
		modules: []SiteModule{module},
	}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(auth.WithActorContext(context.Background(), &auth.ActorContext{
		Subject: "user-42",
		Role:    "editor",
	}))
	ctx.On("Method").Return("GET")
	ctx.On("Path").Return("/search/topics/architecture")
	ctx.On("IP").Return("127.0.0.1")
	ctx.HeadersM["User-Agent"] = "test-agent"
	ctx.HeadersM["Accept-Language"] = "es-MX"
	ctx.QueriesM = map[string]string{
		"q":                  "archive",
		"locale":             "es",
		"page":               "2",
		"per_page":           "5",
		"sort":               "published_at:desc",
		"facet":              "content_type,category",
		"collection":         "media,docs",
		"content_type":       "post",
		"tag":                "go",
		"category":           "news",
		"published_year_gte": "2024",
	}

	req, facets, indexes, landing := runtime.translateSearchRequest(ctx, RequestState{Locale: "en"}, "architecture")

	if req.Query != "archive" || req.Locale != "es" || req.Page != 2 || req.PerPage != 5 {
		t.Fatalf("unexpected translated search request identity: %+v", req)
	}
	if req.Sort != "published_at:desc" {
		t.Fatalf("expected sort published_at:desc, got %q", req.Sort)
	}
	if len(facets) != 2 || facets[0] != "content_type" || facets[1] != "category" {
		t.Fatalf("expected translated facets [content_type category], got %+v", facets)
	}
	if len(indexes) != 2 || indexes[0] != "media" || indexes[1] != "docs" {
		t.Fatalf("expected translated indexes [media docs], got %+v", indexes)
	}
	if landing == nil || landing.Slug != "architecture" {
		t.Fatalf("expected architecture landing state, got %+v", landing)
	}
	if got := req.Filters["content_type"]; len(got) != 1 || got[0] != "post" {
		t.Fatalf("expected content_type filter to be preserved, got %+v", req.Filters)
	}
	if got := req.Filters["topic_hierarchy"]; len(got) != 1 || got[0] != "Teaching Topics > Architecture" {
		t.Fatalf("expected landing topic_hierarchy filter, got %+v", req.Filters)
	}
	if got := req.Filters["module_scope"]; len(got) != 2 || !searchFilterContains(got, "module-default") || !searchFilterContains(got, "beta") {
		t.Fatalf("expected injected module_scope filters, got %+v", req.Filters)
	}
	if len(req.Ranges) != 1 || req.Ranges[0].Field != "published_year" || intFromAny(req.Ranges[0].GTE) != 2024 {
		t.Fatalf("expected published_year range, got %+v", req.Ranges)
	}
	actor := nestedMapFromAny(req.Actor)
	if anyString(actor["actor_id"]) != "user-42" || anyString(actor["role"]) != "editor" {
		t.Fatalf("expected actor payload from context, got %+v", req.Actor)
	}
	meta := nestedMapFromAny(req.Metadata)
	if anyString(meta["accept_language"]) != "es-MX" {
		t.Fatalf("expected accept-language metadata, got %+v", meta)
	}
	if module.lastReq.IsSuggest {
		t.Fatalf("expected search request module injection to mark IsSuggest false, got %+v", module.lastReq)
	}
	if len(module.lastReq.Ranges) != 1 || module.lastReq.Ranges[0].Field != "published_year" {
		t.Fatalf("expected search ranges to reach module injector, got %+v", module.lastReq.Ranges)
	}
}

func TestSearchRequestExecutionRuntimeTranslateSuggestRequestBuildsCoreRequest(t *testing.T) {
	module := &recordingSearchFilterModule{
		response: map[string][]string{
			"module_scope": {"suggested"},
		},
	}
	runtime := &searchRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Search: SiteSearchConfig{
				Collections: []string{"media", "docs"},
			},
		}),
		modules: []SiteModule{module},
	}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(auth.WithActorContext(context.Background(), &auth.ActorContext{
		Subject: "user-99",
	}))
	ctx.On("Method").Return("GET")
	ctx.On("Path").Return("/api/v1/site/search/suggest")
	ctx.On("IP").Return("127.0.0.1")
	ctx.HeadersM["Accept-Language"] = "fr-CA"
	ctx.QueriesM = map[string]string{
		"q":          "hel",
		"locale":     "fr",
		"limit":      "7",
		"collection": "media,docs",
		"tag":        "reference",
	}

	req, indexes := runtime.translateSuggestRequest(ctx, RequestState{Locale: "en"})

	if req.Query != "hel" || req.Locale != "fr" || req.Limit != 7 {
		t.Fatalf("unexpected translated suggest request identity: %+v", req)
	}
	if len(indexes) != 2 || indexes[0] != "media" || indexes[1] != "docs" {
		t.Fatalf("expected translated indexes [media docs], got %+v", indexes)
	}
	if got := req.Filters["tag"]; len(got) != 1 || got[0] != "reference" {
		t.Fatalf("expected base tag filter to be preserved, got %+v", req.Filters)
	}
	if got := req.Filters["module_scope"]; len(got) != 1 || got[0] != "suggested" {
		t.Fatalf("expected injected suggest module filter, got %+v", req.Filters)
	}
	meta := nestedMapFromAny(req.Metadata)
	if anyString(meta["accept_language"]) != "fr-CA" {
		t.Fatalf("expected accept-language metadata, got %+v", meta)
	}
	if !module.lastReq.IsSuggest {
		t.Fatalf("expected suggest module injection to mark IsSuggest true, got %+v", module.lastReq)
	}
	if len(module.lastReq.Ranges) != 0 {
		t.Fatalf("expected suggest module injection to omit ranges, got %+v", module.lastReq.Ranges)
	}
	actor := nestedMapFromAny(req.Actor)
	if anyString(actor["actor_id"]) != "user-99" {
		t.Fatalf("expected suggest actor payload from context, got %+v", req.Actor)
	}
}
