package site

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestSearchViewContextIncludesErrorPayloadWithoutStatus(t *testing.T) {
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

func TestRenderPageReturnsUnavailableJSONEnvelope(t *testing.T) {
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
