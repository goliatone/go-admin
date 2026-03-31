package site

import (
	"errors"
	"net/http"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestSearchHandlerRuntimeFallsBackWhenProviderUnavailable(t *testing.T) {
	cases := []struct {
		name    string
		handler func(*searchRuntime) router.HandlerFunc
	}{
		{name: "page", handler: func(r *searchRuntime) router.HandlerFunc { return r.PageHandler() }},
		{name: "topic", handler: func(r *searchRuntime) router.HandlerFunc { return r.TopicPageHandler() }},
		{name: "api", handler: func(r *searchRuntime) router.HandlerFunc { return r.APIHandler() }},
		{name: "suggest", handler: func(r *searchRuntime) router.HandlerFunc { return r.SuggestAPIHandler() }},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			handler := tc.handler(nil)
			ctx := router.NewMockContext()
			ctx.On("SendStatus", 404).Return(nil)
			if err := handler(ctx); err != nil {
				t.Fatalf("nil runtime fallback: %v", err)
			}
			ctx.AssertExpectations(t)

			handler = tc.handler(&searchRuntime{})
			ctx = router.NewMockContext()
			ctx.On("SendStatus", 404).Return(nil)
			if err := handler(ctx); err != nil {
				t.Fatalf("nil provider fallback: %v", err)
			}
			ctx.AssertExpectations(t)
		})
	}
}

func TestSearchHandlerRuntimeIgnoresNilContextForLiveHandlers(t *testing.T) {
	runtime := &searchRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		provider: &recordingSiteSearchProvider{
			searchResult:  admin.SearchResultPage{Hits: []admin.SearchHit{}, Page: 1, PerPage: 10, Total: 0},
			suggestResult: admin.SuggestResult{Suggestions: []string{}},
		},
		baseRoute: "/search",
	}

	handlers := []router.HandlerFunc{
		runtime.PageHandler(),
		runtime.TopicPageHandler(),
		runtime.APIHandler(),
		runtime.SuggestAPIHandler(),
	}
	for _, handler := range handlers {
		if err := handler(nil); err != nil {
			t.Fatalf("expected nil context to be ignored, got %v", err)
		}
	}
}

func TestSearchHandlerRuntimePageAndTopicHandlersDelegateThroughRuntime(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchResult: admin.SearchResultPage{
			Hits:    []admin.SearchHit{{ID: "doc-1", Title: "Archive"}},
			Page:    1,
			PerPage: 10,
			Total:   1,
		},
	}
	runtime := newSearchRuntime(ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}), provider, nil)
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	server.Router().Get("/search", runtime.PageHandler())
	server.Router().Get("/search/topics/:topic_slug", runtime.TopicPageHandler())

	pagePayload := performSiteRequest(t, server, "/search?q=archive&format=json")
	if got := nestedString(pagePayload, "template"); got != searchTemplate {
		t.Fatalf("expected page template %q, got %q", searchTemplate, got)
	}

	topicPayload := performSiteRequest(t, server, "/search/topics/architecture?q=archive&format=json")
	if provider.searchCalls != 2 {
		t.Fatalf("expected page and topic handlers to issue two searches, got %d", provider.searchCalls)
	}
	values := provider.lastSearch.Filters["topic_hierarchy"]
	if len(values) != 1 || values[0] != "Teaching Topics > Architecture" {
		t.Fatalf("expected topic landing filter, got %+v", provider.lastSearch.Filters)
	}
	landing := nestedMapFromAny(nestedAny(topicPayload, "context", "search_landing"))
	if anyString(landing["title"]) != "Architecture" {
		t.Fatalf("expected topic landing title Architecture, got %+v", landing)
	}
}

func TestSearchHandlerRuntimeAPIAndSuggestHandlersDelegateThroughRuntime(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchResult: admin.SearchResultPage{
			Hits:    []admin.SearchHit{{ID: "post-1", Title: "Hola"}},
			Page:    1,
			PerPage: 10,
			Total:   1,
		},
		suggestResult: admin.SuggestResult{Suggestions: []string{"hello", "help"}},
	}
	runtime := newSearchRuntime(ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}), provider, nil)
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	server.Router().Get("/api/v1/site/search", runtime.APIHandler())
	server.Router().Get("/api/v1/site/search/suggest", runtime.SuggestAPIHandler())

	apiPayload := performSiteRequest(t, server, "/api/v1/site/search?q=hola")
	if provider.searchCalls != 1 {
		t.Fatalf("expected one API search call, got %d", provider.searchCalls)
	}
	apiHits := menuItemsFromContext(t, nestedAny(apiPayload, "data", "hits"))
	if len(apiHits) != 1 || anyString(apiHits[0]["title"]) != "Hola" {
		t.Fatalf("expected one API hit titled Hola, got %+v", apiHits)
	}

	suggestPayload := performSiteRequest(t, server, "/api/v1/site/search/suggest?q=hel")
	if provider.suggestCalls != 1 {
		t.Fatalf("expected one suggest call, got %d", provider.suggestCalls)
	}
	suggestions, ok := nestedAny(suggestPayload, "data", "suggestions").([]any)
	if !ok || len(suggestions) != 2 || anyString(suggestions[0]) != "hello" || anyString(suggestions[1]) != "help" {
		t.Fatalf("expected suggest payload [hello help], got %+v", nestedAny(suggestPayload, "data", "suggestions"))
	}
}

func TestSearchHandlerRuntimeAPIAndSuggestHandlersShareUnavailableErrorContract(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchErr:  errors.New("provider offline"),
		suggestErr: errors.New("provider offline"),
	}
	runtime := newSearchRuntime(ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}), provider, nil)
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	server.Router().Get("/api/v1/site/search", runtime.APIHandler())
	server.Router().Get("/api/v1/site/search/suggest", runtime.SuggestAPIHandler())

	apiPayload := performSiteRequestWithContext(t, server, "/api/v1/site/search?q=offline", nil, http.StatusBadGateway)
	suggestPayload := performSiteRequestWithContext(t, server, "/api/v1/site/search/suggest?q=offline", nil, http.StatusBadGateway)

	if nestedString(apiPayload, "error", "code") != searchUnavailableErrorCode {
		t.Fatalf("expected API error code %q, got %+v", searchUnavailableErrorCode, apiPayload)
	}
	if nestedString(suggestPayload, "error", "code") != searchUnavailableErrorCode {
		t.Fatalf("expected suggest error code %q, got %+v", searchUnavailableErrorCode, suggestPayload)
	}
	if nestedString(apiPayload, "error", "message") != "provider offline" {
		t.Fatalf("expected API error message provider offline, got %+v", apiPayload)
	}
	if nestedString(suggestPayload, "error", "message") != "provider offline" {
		t.Fatalf("expected suggest error message provider offline, got %+v", suggestPayload)
	}
}
