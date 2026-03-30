package site

import (
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestSiteSearchPageAndAPIShareSearchFlowBootstrap(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchResult: admin.SearchResultPage{
			Hits:    []admin.SearchHit{{ID: "doc-1", Title: "Archive"}},
			Page:    1,
			PerPage: 10,
			Total:   1,
		},
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

	_ = performSiteRequest(t, server, "/search?q=archive&locale=es&content_type=post&format=json")
	_ = performSiteRequest(t, server, "/api/v1/site/search?q=archive&locale=es&content_type=post")

	if len(provider.searchHistory) != 2 {
		t.Fatalf("expected two search requests, got %+v", provider.searchHistory)
	}
	pageReq := provider.searchHistory[0]
	apiReq := provider.searchHistory[1]
	if pageReq.Query != apiReq.Query || pageReq.Locale != apiReq.Locale {
		t.Fatalf("expected page/API flow to share query+locale bootstrap, got page=%+v api=%+v", pageReq, apiReq)
	}
	if pageReq.Filters["content_type"][0] != "post" || apiReq.Filters["content_type"][0] != "post" {
		t.Fatalf("expected shared content_type filter bootstrap, got page=%+v api=%+v", pageReq.Filters, apiReq.Filters)
	}
	if nestedMapFromAny(pageReq.Request)["path"] == "" || nestedMapFromAny(apiReq.Request)["path"] == "" {
		t.Fatalf("expected request payloads for page/API flow, got page=%+v api=%+v", pageReq.Request, apiReq.Request)
	}
}

func TestSiteSearchPageAndAPIShareUnavailableErrorPayloadCode(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchErr: errors.New("provider offline"),
	}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	pagePayload := performSiteRequestWithContext(t, server, "/search?q=offline&format=json", nil, 502)
	apiPayload := performSiteRequestWithContext(t, server, "/api/v1/site/search?q=offline", nil, 502)

	if nestedString(pagePayload, "error", "code") != searchUnavailableErrorCode {
		t.Fatalf("expected page error code %q, got %+v", searchUnavailableErrorCode, pagePayload)
	}
	if nestedString(apiPayload, "error", "code") != searchUnavailableErrorCode {
		t.Fatalf("expected API error code %q, got %+v", searchUnavailableErrorCode, apiPayload)
	}
	if nestedString(pagePayload, "error", "message") != "provider offline" {
		t.Fatalf("expected page error message provider offline, got %+v", pagePayload)
	}
	if nestedString(apiPayload, "error", "message") != "provider offline" {
		t.Fatalf("expected API error message provider offline, got %+v", apiPayload)
	}
}
