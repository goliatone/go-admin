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
