package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestSearchHandlerEntrypointRuntimeFallsBackWhenProviderUnavailable(t *testing.T) {
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

func TestSearchHandlerEntrypointRuntimeIgnoresNilContextForLiveHandlers(t *testing.T) {
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

func TestSearchHandlerEntrypointRuntimeDelegatesToProvidedSeam(t *testing.T) {
	runtime := &searchRuntime{
		provider: &recordingSiteSearchProvider{},
	}
	ctx := router.NewMockContext()
	calls := 0

	handler := runtime.searchHandlerEntrypoint(func(got router.Context) error {
		calls++
		if got != ctx {
			t.Fatalf("expected delegated context to be preserved")
		}
		return nil
	})
	if err := handler(ctx); err != nil {
		t.Fatalf("expected delegated handler to succeed, got %v", err)
	}
	if calls != 1 {
		t.Fatalf("expected exactly one delegate call, got %d", calls)
	}
}
