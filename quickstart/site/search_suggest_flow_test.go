package site

import (
	"net/http"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestSiteSearchSuggestFlowBootstrapPreservesTranslatedRequest(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		suggestResult: admin.SuggestResult{Suggestions: []string{"hello", "help"}},
	}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Search: SiteSearchConfig{
			Collections: []string{"media"},
		},
	}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequest(t, server, "/api/v1/site/search/suggest?q=hel&limit=7&locale=en&facet_content_type=post")

	if provider.suggestCalls != 1 || len(provider.suggestHistory) != 1 {
		t.Fatalf("expected one suggest flow/provider call, got calls=%d history=%d", provider.suggestCalls, len(provider.suggestHistory))
	}
	req := provider.suggestHistory[0]
	if req.Query != "hel" || req.Limit != 7 || req.Locale != "en" {
		t.Fatalf("unexpected suggest request bootstrap: %+v", req)
	}
	if got := req.Filters["content_type"]; len(got) != 1 || got[0] != "post" {
		t.Fatalf("expected translated content_type suggest filter, got %+v", req.Filters)
	}
	suggestions, ok := nestedAny(payload, "data", "suggestions").([]any)
	if !ok || len(suggestions) != 2 {
		t.Fatalf("expected suggest payload with two suggestions, got %+v", nestedAny(payload, "data"))
	}
}

func TestSiteSearchSuggestFlowSkipsProviderOnBlankQuery(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		suggestResult: admin.SuggestResult{Suggestions: []string{"unused"}},
	}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequestWithContext(t, server, "/api/v1/site/search/suggest?q=%20%20", nil, http.StatusOK)

	if provider.suggestCalls != 0 || len(provider.suggestHistory) != 0 {
		t.Fatalf("expected blank suggest query to skip provider call, got calls=%d history=%d", provider.suggestCalls, len(provider.suggestHistory))
	}
	suggestions, ok := nestedAny(payload, "data", "suggestions").([]any)
	if !ok || len(suggestions) != 0 {
		t.Fatalf("expected blank-query suggest payload with no suggestions, got %+v", nestedAny(payload, "data"))
	}
}
