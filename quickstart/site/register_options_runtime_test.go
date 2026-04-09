package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestSiteRegisterOptionsApplyExplicitOverrides(t *testing.T) {
	var contentCalls int
	var searchCalls int
	var apiCalls int
	var suggestCalls int

	provider := searchProviderStub{}
	ops := &admin.GoSearchOperations{}
	contentSvc := admin.NewInMemoryContentService()
	contentHandler := func(c router.Context) error {
		contentCalls++
		return nil
	}
	searchHandler := func(c router.Context) error {
		searchCalls++
		return nil
	}
	searchAPIHandler := func(c router.Context) error {
		apiCalls++
		return nil
	}
	suggestHandler := func(c router.Context) error {
		suggestCalls++
		return nil
	}

	var options siteRegisterOptions
	WithSearchProvider(provider)(&options)
	WithSearchOperations(ops)(&options)
	WithDeliveryServices(contentSvc, nil)(&options)
	WithContentHandler(contentHandler)(&options)
	WithSearchHandlers(searchHandler, searchAPIHandler)(&options)
	WithSuggestHandler(suggestHandler)(&options)
	WithFallbackPolicy(SiteFallbackPolicy{
		Mode:              SiteFallbackModeExplicitPathsOnly,
		AllowRoot:         true,
		AllowedExactPaths: []string{"/search"},
	})(&options)
	WithReservedPrefixes("/admin", "api")(&options)
	WithAllowedExactPaths("/search", "landing")(&options)
	WithAllowedPathPrefixes("blog", "/docs")(&options)
	WithAllowedFallbackMethods(router.HEAD, router.GET, router.POST)(&options)

	if options.searchProvider != provider {
		t.Fatalf("expected search provider to be preserved")
	}
	if options.searchOperations != ops {
		t.Fatalf("expected search operations to be preserved")
	}
	if options.contentService != contentSvc {
		t.Fatalf("expected content service override to be preserved")
	}
	if options.contentTypeSvc != nil {
		t.Fatalf("expected nil content-type service to remain unchanged")
	}
	if err := options.contentHandler(nil); err != nil {
		t.Fatalf("invoke content handler: %v", err)
	}
	if err := options.searchHandler(nil); err != nil {
		t.Fatalf("invoke search handler: %v", err)
	}
	if err := options.searchAPIHandler(nil); err != nil {
		t.Fatalf("invoke search api handler: %v", err)
	}
	if err := options.suggestAPIHandler(nil); err != nil {
		t.Fatalf("invoke suggest handler: %v", err)
	}
	mergedFallback := mergeSiteFallbackPolicy(DefaultSiteFallbackPolicy(), options.fallbackOverlay)
	if mergedFallback.Mode != SiteFallbackModeExplicitPathsOnly {
		t.Fatalf("expected explicit_paths_only fallback mode, got %+v", mergedFallback)
	}
	if got := mergedFallback.AllowedMethods; len(got) != 3 || got[0] != router.GET || got[1] != router.HEAD || got[2] != router.POST {
		t.Fatalf("expected normalized fallback methods with unsupported entries preserved for validation, got %v", got)
	}
	if err := ValidateSiteFallbackPolicy(mergedFallback); err == nil {
		t.Fatalf("expected unsupported fallback methods to fail validation")
	}
	if got := mergedFallback.AllowedExactPaths; len(got) != 2 || got[0] != "/landing" || got[1] != "/search" {
		t.Fatalf("expected normalized fallback exact paths, got %v", got)
	}
	if got := mergedFallback.AllowedPathPrefixes; len(got) != 2 || got[0] != "/blog" || got[1] != "/docs" {
		t.Fatalf("expected normalized fallback path prefixes, got %v", got)
	}
	if got := mergedFallback.ReservedPrefixes; len(got) != 2 || got[0] != "/admin" || got[1] != "/api" {
		t.Fatalf("expected normalized reserved prefixes, got %v", got)
	}
	if contentCalls != 1 || searchCalls != 1 || apiCalls != 1 || suggestCalls != 1 {
		t.Fatalf("expected explicit handlers to be preserved, got content=%d search=%d api=%d suggest=%d", contentCalls, searchCalls, apiCalls, suggestCalls)
	}
}

func TestSiteRegisterOptionsIgnoreNilInputs(t *testing.T) {
	originalContent := admin.NewInMemoryContentService()
	var searchCalls int
	var suggestCalls int
	originalSearch := func(c router.Context) error {
		searchCalls++
		return nil
	}
	originalSuggest := func(c router.Context) error {
		suggestCalls++
		return nil
	}

	options := siteRegisterOptions{
		contentService:    originalContent,
		searchHandler:     originalSearch,
		suggestAPIHandler: originalSuggest,
	}

	WithSearchProvider(searchProviderStub{})(nil)
	WithSearchOperations(&admin.GoSearchOperations{})(nil)
	WithDeliveryServices(nil, nil)(nil)
	WithContentHandler(nil)(nil)
	WithSearchHandlers(nil, nil)(nil)
	WithSuggestHandler(nil)(nil)

	WithDeliveryServices(nil, nil)(&options)
	WithContentHandler(nil)(&options)
	WithSearchHandlers(nil, nil)(&options)
	WithSuggestHandler(nil)(&options)

	if options.contentService != originalContent {
		t.Fatalf("expected existing content service to remain unchanged")
	}
	if options.searchHandler == nil {
		t.Fatalf("expected existing search handler to remain unchanged")
	}
	if options.suggestAPIHandler == nil {
		t.Fatalf("expected existing suggest handler to remain unchanged")
	}
	if err := options.searchHandler(nil); err != nil {
		t.Fatalf("invoke preserved search handler: %v", err)
	}
	if err := options.suggestAPIHandler(nil); err != nil {
		t.Fatalf("invoke preserved suggest handler: %v", err)
	}
	if searchCalls != 1 || suggestCalls != 1 {
		t.Fatalf("expected preserved handlers to keep behavior, got search=%d suggest=%d", searchCalls, suggestCalls)
	}
}

func TestDefaultNotFoundHandlerContracts(t *testing.T) {
	if err := defaultNotFoundHandler(nil); err != nil {
		t.Fatalf("nil context should be ignored: %v", err)
	}

	ctx := router.NewMockContext()
	ctx.On("SendStatus", 404).Return(nil)
	if err := defaultNotFoundHandler(ctx); err != nil {
		t.Fatalf("send status: %v", err)
	}
	ctx.AssertExpectations(t)
}
