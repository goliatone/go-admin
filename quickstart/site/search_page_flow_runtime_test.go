package site

import (
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestSearchPageFlowRuntimeNilReceiverReturnsEmptyFlow(t *testing.T) {
	var runtime *searchRuntime

	flow := runtime.prepareSearchPageFlow(nil, " architecture ")

	if flow.state.Locale != "" || flow.req.Query != "" || len(flow.facets) != 0 || len(flow.indexes) != 0 || flow.landing != nil || flow.err != nil {
		t.Fatalf("expected empty flow for nil receiver, got %+v", flow)
	}
	if flow.result.Page != 0 || flow.result.PerPage != 0 || flow.result.Total != 0 || len(flow.result.Hits) != 0 {
		t.Fatalf("expected zero-value result payload for nil receiver, got %+v", flow.result)
	}
}

func TestSearchPageFlowRuntimeBuildsTranslatedRequestAndExecutesSearch(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchResult: admin.SearchResultPage{
			Hits:    []admin.SearchHit{{ID: "doc-1", Title: "Architecture"}},
			Page:    1,
			PerPage: 10,
			Total:   1,
		},
	}
	runtime := &searchRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			BasePath:         "/site",
			SupportedLocales: []string{"en", "es"},
			Search: SiteSearchConfig{
				Route:       "/search",
				Collections: []string{"media"},
			},
		}),
		provider: provider,
	}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(auth.WithActorContext(t.Context(), &auth.ActorContext{Subject: "editor-7"}))
	ctx.On("Method").Return("GET")
	ctx.On("Path").Return("/site/search/topics/architecture")
	ctx.On("IP").Return("127.0.0.1")
	ctx.HeadersM["Accept-Language"] = "es-MX"
	ctx.QueriesM = map[string]string{
		"q":            "archive",
		"locale":       "es",
		"content_type": "post",
	}

	flow := runtime.prepareSearchPageFlow(ctx, " architecture ")

	if flow.state.ActivePath != "/site/search/topics/architecture" {
		t.Fatalf("expected active path from request, got %+v", flow.state)
	}
	if flow.state.Locale != "en" || flow.state.DefaultLocale != "en" {
		t.Fatalf("expected fallback request-state locale defaults, got %+v", flow.state)
	}
	if flow.req.Query != "archive" || flow.req.Locale != "es" {
		t.Fatalf("expected translated request query+locale, got %+v", flow.req)
	}
	if flow.landing == nil || flow.landing.Slug != "architecture" {
		t.Fatalf("expected trimmed landing state, got %+v", flow.landing)
	}
	if flow.err != nil {
		t.Fatalf("expected successful page flow, got error %v", flow.err)
	}
	if flow.result.Total != 1 || len(flow.result.Hits) != 1 {
		t.Fatalf("expected provider result to be preserved, got %+v", flow.result)
	}
	if provider.searchCalls != 1 {
		t.Fatalf("expected one provider search call, got %d", provider.searchCalls)
	}
	if got := provider.lastSearch.Filters["topic_hierarchy"]; len(got) != 1 || got[0] != "Teaching Topics > Architecture" {
		t.Fatalf("expected landing filter injection, got %+v", provider.lastSearch.Filters)
	}
}

func TestSearchPageFlowRuntimeReturnsErrorBundleFromExecuteSearch(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchErr: errors.New("provider offline"),
	}
	runtime := &searchRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			BasePath: "/site",
			Search: SiteSearchConfig{
				Route: "/search",
			},
		}),
		provider: provider,
	}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(t.Context())
	ctx.On("Method").Return("GET")
	ctx.On("Path").Return("/site/search")
	ctx.On("IP").Return("127.0.0.1")
	ctx.QueriesM = map[string]string{
		"q": "offline",
	}

	flow := runtime.prepareSearchPageFlow(ctx, "")

	if flow.state.ActivePath != "/site/search" {
		t.Fatalf("expected request path to seed fallback state, got %+v", flow.state)
	}
	if flow.req.Query != "offline" {
		t.Fatalf("expected translated request query, got %+v", flow.req)
	}
	if flow.err == nil || flow.err.Error() != "provider offline" {
		t.Fatalf("expected provider error bundle, got %+v", flow.err)
	}
	if flow.result.Page != 1 || flow.result.PerPage != 10 || flow.result.Total != 0 {
		t.Fatalf("expected normalized empty result on error, got %+v", flow.result)
	}
}

func TestSearchPageFlowRuntimePageAndAPIShareSearchFlowBootstrap(t *testing.T) {
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

func TestSearchPageFlowRuntimePageAndAPIShareUnavailableErrorPayloadCode(t *testing.T) {
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
