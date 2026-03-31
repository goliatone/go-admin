package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestSearchHandlerPageRuntimeRespondsWithSearchPagePayload(t *testing.T) {
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
	server.Router().Get("/search", func(c router.Context) error {
		return runtime.respondSearchPage(c)
	})

	payload := performSiteRequest(t, server, "/search?q=archive&format=json")

	if provider.searchCalls != 1 {
		t.Fatalf("expected one page search call, got %d", provider.searchCalls)
	}
	if got := nestedString(payload, "template"); got != searchTemplate {
		t.Fatalf("expected page template %q, got %q", searchTemplate, got)
	}
	if nestedString(payload, "context", "search_query") != "archive" {
		t.Fatalf("expected search query archive, got %+v", nestedAny(payload, "context"))
	}
}

func TestSearchHandlerPageRuntimeRespondsWithTopicLandingPayload(t *testing.T) {
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
	server.Router().Get("/search/topics/:topic_slug", func(c router.Context) error {
		return runtime.respondSearchTopicPage(c)
	})

	payload := performSiteRequest(t, server, "/search/topics/architecture?q=archive&format=json")

	if provider.searchCalls != 1 {
		t.Fatalf("expected one topic search call, got %d", provider.searchCalls)
	}
	values := provider.lastSearch.Filters["topic_hierarchy"]
	if len(values) != 1 || values[0] != "Teaching Topics > Architecture" {
		t.Fatalf("expected topic landing filter, got %+v", provider.lastSearch.Filters)
	}
	landing := nestedMapFromAny(nestedAny(payload, "context", "search_landing"))
	if anyString(landing["title"]) != "Architecture" {
		t.Fatalf("expected topic landing title Architecture, got %+v", landing)
	}
}
