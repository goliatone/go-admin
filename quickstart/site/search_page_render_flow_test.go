package site

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestSearchPageRenderFlowSearchViewContextClonesRequestStateViewContext(t *testing.T) {
	runtime := &searchRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Search: SiteSearchConfig{
				Endpoint: "/api/v1/site/search",
			},
		}),
		baseRoute: "/search",
	}
	ctx := router.NewMockContext()
	ctx.On("Path").Return("/search")

	state := RequestState{
		ViewContext: router.ViewContext{
			"locale": "en",
			"theme":  "admin",
		},
	}
	req := admin.SearchRequest{Query: "welcome"}
	result := admin.SearchResultPage{
		Hits:    []admin.SearchHit{},
		Page:    1,
		PerPage: 10,
		Total:   0,
	}

	view := runtime.searchViewContext(ctx, state, req, result, nil, nil, nil, nil)
	if got := anyString(view["search_route"]); got != "/search" {
		t.Fatalf("expected search_route /search, got %q", got)
	}
	if got := anyString(state.ViewContext["search_route"]); got != "" {
		t.Fatalf("expected original request state view context to remain unchanged, got %q", got)
	}
	if got := anyString(view["theme"]); got != "admin" {
		t.Fatalf("expected cloned base request view context to preserve theme, got %q", got)
	}
}

func TestSearchPageRenderFlowSearchViewContextIncludesErrorPayloadWithoutStatus(t *testing.T) {
	runtime := &searchRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Search: SiteSearchConfig{
				Endpoint: "/api/v1/site/search",
			},
		}),
		baseRoute: "/search",
	}
	ctx := router.NewMockContext()
	ctx.On("Path").Return("/search")

	view := runtime.searchViewContext(
		ctx,
		RequestState{ViewContext: router.ViewContext{}},
		admin.SearchRequest{Query: "offline"},
		admin.SearchResultPage{Hits: []admin.SearchHit{}, Page: 1, PerPage: 10, Total: 0},
		nil,
		nil,
		nil,
		errors.New("provider offline"),
	)

	searchErr := nestedMapFromAny(view["search_error"])
	if anyString(searchErr["code"]) != searchUnavailableErrorCode {
		t.Fatalf("expected search error code, got %+v", searchErr)
	}
	if _, ok := searchErr["status"]; ok {
		t.Fatalf("expected page view-context error payload to omit status, got %+v", searchErr)
	}
}

func TestSearchPageRenderFlowRenderPageReturnsUnavailableJSONEnvelope(t *testing.T) {
	provider := &recordingSiteSearchProvider{searchErr: errors.New("provider offline")}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequestWithContext(t, server, "/search?q=offline&format=json", context.Background(), http.StatusBadGateway)
	if nestedString(payload, "template") != searchTemplate {
		t.Fatalf("expected search template payload, got %+v", payload)
	}
	if nestedString(payload, "error", "code") != searchUnavailableErrorCode {
		t.Fatalf("expected unavailable error code, got %+v", payload)
	}
	if nestedString(payload, "context", "search_error", "code") != searchUnavailableErrorCode {
		t.Fatalf("expected view-context error code, got %+v", nestedAny(payload, "context", "search_error"))
	}
}
