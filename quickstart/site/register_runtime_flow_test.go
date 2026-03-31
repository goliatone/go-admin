package site

import (
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestResolveSiteRegisterFlowPreservesExplicitHandlersAndBuildsSearchRuntime(t *testing.T) {
	var contentCalls int
	var searchCalls int
	var apiCalls int
	var suggestCalls int
	ops := &admin.GoSearchOperations{}

	flow := resolveSiteRegisterFlow[*fiber.App](nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, []SiteOption{
		WithSearchProvider(searchProviderStub{}),
		WithSearchOperations(ops),
		WithContentHandler(func(c router.Context) error {
			contentCalls++
			return nil
		}),
		WithSearchHandlers(
			func(c router.Context) error {
				searchCalls++
				return nil
			},
			func(c router.Context) error {
				apiCalls++
				return nil
			},
		),
		WithSuggestHandler(func(c router.Context) error {
			suggestCalls++
			return nil
		}),
	})

	if flow.searchRuntime == nil {
		t.Fatalf("expected search runtime when provider is configured")
	}
	if flow.options.searchOperations != ops {
		t.Fatalf("expected explicit search operations to be preserved")
	}

	if err := flow.options.contentHandler(nil); err != nil {
		t.Fatalf("invoke content handler: %v", err)
	}
	if err := flow.options.searchHandler(nil); err != nil {
		t.Fatalf("invoke search page handler: %v", err)
	}
	if err := flow.options.searchAPIHandler(nil); err != nil {
		t.Fatalf("invoke search api handler: %v", err)
	}
	if err := flow.options.suggestAPIHandler(nil); err != nil {
		t.Fatalf("invoke suggest api handler: %v", err)
	}
	if contentCalls != 1 || searchCalls != 1 || apiCalls != 1 || suggestCalls != 1 {
		t.Fatalf("expected explicit handlers to be preserved, got content=%d search=%d api=%d suggest=%d", contentCalls, searchCalls, apiCalls, suggestCalls)
	}
}

func TestResolveSiteRegisterFlowUsesDefaultHandlersWhenRuntimesUnavailable(t *testing.T) {
	flow := resolveSiteRegisterFlow[*fiber.App](nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, nil)

	if flow.searchRuntime != nil {
		t.Fatalf("did not expect search runtime without provider")
	}

	handlers := []router.HandlerFunc{
		flow.options.contentHandler,
		flow.options.searchHandler,
		flow.options.searchAPIHandler,
		flow.options.suggestAPIHandler,
	}
	for _, handler := range handlers {
		ctx := router.NewMockContext()
		ctx.On("SendStatus", 404).Return(nil)
		if err := handler(ctx); err != nil {
			t.Fatalf("invoke default handler: %v", err)
		}
		ctx.AssertExpectations(t)
	}
}

func TestSiteRegisterFlowRegistersSearchAndContentRoutes(t *testing.T) {
	flow := resolveSiteRegisterFlow[*fiber.App](nil, admin.Config{DefaultLocale: "en"}, SiteConfig{
		BasePath: "/site",
	}, []SiteOption{WithSearchProvider(searchProviderStub{})})

	recorder := &recordingRouter{}
	if err := flow.register(recorder, nil, admin.Config{DefaultLocale: "en"}); err != nil {
		t.Fatalf("register flow: %v", err)
	}

	expected := []recordedRoute{
		{Method: "GET", Path: "/site/search"},
		{Method: "GET", Path: "/site/search/topics/:topic_slug"},
		{Method: "GET", Path: "/api/v1/site/search"},
		{Method: "GET", Path: "/api/v1/site/search/suggest"},
		{Method: "GET", Path: "/site"},
		{Method: "GET", Path: "/site/*path"},
	}
	for _, route := range expected {
		if indexOfRoute(recorder.routes, route.Method, route.Path) == -1 {
			t.Fatalf("expected route %s %s, got %+v", route.Method, route.Path, recorder.routes)
		}
	}
	if len(recorder.middlewares) != 1 {
		t.Fatalf("expected one request-context middleware, got %d", len(recorder.middlewares))
	}
}
