package site

import (
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestSearchHandlerResponseRuntimeBuildsSearchAPIResponsePayload(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchResult: admin.SearchResultPage{
			Hits:    []admin.SearchHit{{ID: "post-1", Title: "Hola"}},
			Page:    1,
			PerPage: 10,
			Total:   1,
		},
	}
	runtime := &searchRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Search: SiteSearchConfig{
				Route:       "/search",
				Collections: []string{"media"},
			},
		}),
		provider:  provider,
		baseRoute: "/search",
	}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(t.Context())
	ctx.On("Method").Return("GET")
	ctx.On("Path").Return("/api/v1/site/search")
	ctx.On("IP").Return("127.0.0.1")
	ctx.QueriesM = map[string]string{
		"q":      "hola",
		"locale": "es",
	}

	status, payload := runtime.searchAPIHandlerPayload(ctx)

	if status != 200 {
		t.Fatalf("expected search API status 200, got %d", status)
	}
	apiHits := menuItemsFromContext(t, nestedAny(payload, "data", "hits"))
	if len(apiHits) != 1 || anyString(apiHits[0]["title"]) != "Hola" {
		t.Fatalf("expected one API hit titled Hola, got %+v", apiHits)
	}
	if nestedString(payload, "meta", "query") != "hola" {
		t.Fatalf("expected query metadata hola, got %+v", nestedAny(payload, "meta"))
	}
}

func TestSearchHandlerResponseRuntimeBuildsSuggestAPIResponsePayload(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		suggestResult: admin.SuggestResult{Suggestions: []string{"hello", "help"}},
	}
	runtime := &searchRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Search: SiteSearchConfig{
				Route:       "/search",
				Collections: []string{"media"},
			},
		}),
		provider: provider,
	}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(t.Context())
	ctx.On("Method").Return("GET")
	ctx.On("Path").Return("/api/v1/site/search/suggest")
	ctx.On("IP").Return("127.0.0.1")
	ctx.QueriesM = map[string]string{
		"q":     "hel",
		"limit": "7",
	}

	status, payload := runtime.searchSuggestHandlerPayload(ctx)

	if status != 200 {
		t.Fatalf("expected suggest API status 200, got %d", status)
	}
	suggestions, ok := nestedAny(payload, "data", "suggestions").([]string)
	if !ok || len(suggestions) != 2 || suggestions[0] != "hello" || suggestions[1] != "help" {
		t.Fatalf("expected suggest payload [hello help], got %+v", nestedAny(payload, "data", "suggestions"))
	}
}

func TestSearchHandlerResponseRuntimeBuildsUnavailableErrorPayloads(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchErr:  errors.New("provider offline"),
		suggestErr: errors.New("provider offline"),
	}
	runtime := &searchRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Search: SiteSearchConfig{Route: "/search"},
		}),
		provider:  provider,
		baseRoute: "/search",
	}

	searchCtx := router.NewMockContext()
	searchCtx.On("Context").Return(t.Context())
	searchCtx.On("Method").Return("GET")
	searchCtx.On("Path").Return("/api/v1/site/search")
	searchCtx.On("IP").Return("127.0.0.1")
	searchCtx.QueriesM = map[string]string{"q": "offline"}

	searchStatus, searchPayload := runtime.searchAPIHandlerPayload(searchCtx)
	if searchStatus != 502 {
		t.Fatalf("expected search API error status 502, got %d", searchStatus)
	}
	if nestedString(searchPayload, "error", "code") != searchUnavailableErrorCode {
		t.Fatalf("expected search error code %q, got %+v", searchUnavailableErrorCode, searchPayload)
	}
	if nestedString(searchPayload, "error", "message") != "provider offline" {
		t.Fatalf("expected search error message provider offline, got %+v", searchPayload)
	}

	suggestCtx := router.NewMockContext()
	suggestCtx.On("Context").Return(t.Context())
	suggestCtx.On("Method").Return("GET")
	suggestCtx.On("Path").Return("/api/v1/site/search/suggest")
	suggestCtx.On("IP").Return("127.0.0.1")
	suggestCtx.QueriesM = map[string]string{"q": "offline"}

	suggestStatus, suggestPayload := runtime.searchSuggestHandlerPayload(suggestCtx)
	if suggestStatus != 502 {
		t.Fatalf("expected suggest API error status 502, got %d", suggestStatus)
	}
	if nestedString(suggestPayload, "error", "code") != searchUnavailableErrorCode {
		t.Fatalf("expected suggest error code %q, got %+v", searchUnavailableErrorCode, suggestPayload)
	}
	if nestedString(suggestPayload, "error", "message") != "provider offline" {
		t.Fatalf("expected suggest error message provider offline, got %+v", suggestPayload)
	}
}
