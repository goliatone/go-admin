package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestSearchSuggestFlowRuntimeNilReceiverReturnsEmptyFlow(t *testing.T) {
	var runtime *searchRuntime

	flow := runtime.prepareSearchSuggestFlow(nil)

	if flow.state.Locale != "" || flow.req.Query != "" || len(flow.indexes) != 0 || flow.err != nil {
		t.Fatalf("expected empty flow for nil receiver, got %+v", flow)
	}
	if len(flow.result.Suggestions) != 0 {
		t.Fatalf("expected zero-value suggest payload for nil receiver, got %+v", flow.result)
	}
}

func TestSearchSuggestFlowRuntimeBuildsTranslatedRequestAndExecutesSuggest(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		suggestResult: admin.SuggestResult{Suggestions: []string{"hello", "help"}},
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
	ctx.On("Path").Return("/site/api/v1/site/search/suggest")
	ctx.On("IP").Return("127.0.0.1")
	ctx.HeadersM["Accept-Language"] = "es-MX"
	ctx.QueriesM = map[string]string{
		"q":                  "hel",
		"limit":              "7",
		"locale":             "es",
		"facet_content_type": "post",
	}

	flow := runtime.prepareSearchSuggestFlow(ctx)

	if flow.state.ActivePath != "/site/api/v1/site/search/suggest" {
		t.Fatalf("expected active path from request, got %+v", flow.state)
	}
	if flow.state.Locale != "en" || flow.state.DefaultLocale != "en" {
		t.Fatalf("expected fallback request-state locale defaults, got %+v", flow.state)
	}
	if flow.req.Query != "hel" || flow.req.Locale != "es" || flow.req.Limit != 7 {
		t.Fatalf("expected translated suggest request, got %+v", flow.req)
	}
	if flow.err != nil {
		t.Fatalf("expected successful suggest flow, got error %v", flow.err)
	}
	if len(flow.result.Suggestions) != 2 {
		t.Fatalf("expected provider suggestions to be preserved, got %+v", flow.result)
	}
	if provider.suggestCalls != 1 {
		t.Fatalf("expected one provider suggest call, got %d", provider.suggestCalls)
	}
	if got := provider.lastSuggest.Filters["content_type"]; len(got) != 1 || got[0] != "post" {
		t.Fatalf("expected translated content_type suggest filter, got %+v", provider.lastSuggest.Filters)
	}
}

func TestSearchSuggestFlowRuntimeSkipsProviderOnBlankQuery(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		suggestResult: admin.SuggestResult{Suggestions: []string{"unused"}},
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
	ctx.On("Path").Return("/site/api/v1/site/search/suggest")
	ctx.On("IP").Return("127.0.0.1")
	ctx.QueriesM = map[string]string{
		"q": "  ",
	}

	flow := runtime.prepareSearchSuggestFlow(ctx)

	if flow.state.ActivePath != "/site/api/v1/site/search/suggest" {
		t.Fatalf("expected request path to seed fallback state, got %+v", flow.state)
	}
	if flow.req.Query != "" {
		t.Fatalf("expected blank suggest query to stay trimmed, got %+v", flow.req)
	}
	if flow.err != nil {
		t.Fatalf("expected blank query to skip provider errors, got %+v", flow.err)
	}
	if provider.suggestCalls != 0 {
		t.Fatalf("expected blank query to skip provider call, got %d", provider.suggestCalls)
	}
	if len(flow.result.Suggestions) != 0 {
		t.Fatalf("expected empty suggest payload for blank query, got %+v", flow.result)
	}
}

func TestSearchSuggestFlowRuntimeSuggestHandlerSharesBootstrap(t *testing.T) {
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

func TestSearchSuggestFlowRuntimeSuggestHandlerSkipsProviderOnBlankQuery(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		suggestResult: admin.SuggestResult{Suggestions: []string{"unused"}},
	}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequestWithContext(t, server, "/api/v1/site/search/suggest?q=%20%20", nil, 200)

	if provider.suggestCalls != 0 || len(provider.suggestHistory) != 0 {
		t.Fatalf("expected blank suggest query to skip provider call, got calls=%d history=%d", provider.suggestCalls, len(provider.suggestHistory))
	}
	suggestions, ok := nestedAny(payload, "data", "suggestions").([]any)
	if !ok || len(suggestions) != 0 {
		t.Fatalf("expected blank-query suggest payload with no suggestions, got %+v", nestedAny(payload, "data"))
	}
}
