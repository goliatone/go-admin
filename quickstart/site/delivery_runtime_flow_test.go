package site

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type contentChannelRecordingContentService struct {
	admin.CMSContentService
	byLocale    map[string][]admin.CMSContent
	lastChannel string
	lastLocale  string
}

func (s *contentChannelRecordingContentService) Contents(ctx context.Context, locale string) ([]admin.CMSContent, error) {
	s.lastChannel = admin.ContentChannelFromContext(ctx)
	s.lastLocale = locale
	if items, ok := s.byLocale[locale]; ok {
		return append([]admin.CMSContent{}, items...), nil
	}
	if items, ok := s.byLocale[""]; ok {
		return append([]admin.CMSContent{}, items...), nil
	}
	return nil, nil
}

type contentChannelRecordingTypeService struct {
	admin.CMSContentTypeService
	items       []admin.CMSContentType
	lastChannel string
}

func (s *contentChannelRecordingTypeService) ContentTypes(ctx context.Context) ([]admin.CMSContentType, error) {
	s.lastChannel = admin.ContentChannelFromContext(ctx)
	return append([]admin.CMSContentType{}, s.items...), nil
}

type errorContentTypeService struct {
	admin.CMSContentTypeService
	err error
}

func (s *errorContentTypeService) ContentTypes(context.Context) ([]admin.CMSContentType, error) {
	return nil, s.err
}

func TestPrepareDeliveryFlowPropagatesResolvedContentChannelAndPath(t *testing.T) {
	contentSvc := &contentChannelRecordingContentService{
		byLocale: map[string][]admin.CMSContent{
			"es": {
				{
					ID:              "about-es",
					Title:           "Sobre Nosotros",
					Slug:            "about",
					Locale:          "es",
					Status:          "published",
					ContentType:     "page",
					ContentTypeSlug: "page",
					Data:            map[string]any{"path": "/about"},
				},
			},
		},
	}
	contentTypeSvc := &contentChannelRecordingTypeService{
		items: []admin.CMSContentType{
			{
				ID:   "page-type",
				Name: "Page",
				Slug: "page",
				Schema: map[string]any{
					"type":       "object",
					"properties": map[string]any{},
				},
				Capabilities: map[string]any{
					"delivery": map[string]any{
						"enabled": true,
						"kind":    "page",
					},
				},
			},
		},
	}
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			BasePath:         "/site",
			ContentChannel:   "default",
			SupportedLocales: []string{"en", "es"},
			Features: SiteFeatures{
				EnableI18N: boolPtr(true),
			},
		}),
		contentSvc:     contentSvc,
		contentTypeSvc: contentTypeSvc,
	}
	ctx := router.NewMockContext()
	ctx.On("Path").Return("/site/es/about")
	ctx.QueriesM = map[string]string{"locale": "es", admin.ContentChannelScopeQueryParam: "preview"}
	requestCtx, _ := ResolveRequestState(context.Background(), ctx, nil, admin.Config{}, runtime.siteCfg, nil)
	ctx.On("Context").Return(requestCtx)

	flow := runtime.prepareDeliveryFlow(ctx)

	if hasSiteRuntimeError(flow.err) {
		t.Fatalf("expected no site error, got %+v", flow.err)
	}
	if flow.state.ContentChannel != "preview" {
		t.Fatalf("expected request state content channel preview, got %q", flow.state.ContentChannel)
	}
	if flow.requestPath != "/about" {
		t.Fatalf("expected normalized request path /about, got %q", flow.requestPath)
	}
	if contentTypeSvc.lastChannel != "preview" || contentSvc.lastChannel != "preview" {
		t.Fatalf("expected preview channel to propagate into service contexts, got contentType=%q content=%q", contentTypeSvc.lastChannel, contentSvc.lastChannel)
	}
	if contentSvc.lastLocale != "es" {
		t.Fatalf("expected localized content lookup for es locale, got %q", contentSvc.lastLocale)
	}
	if flow.resolution == nil || flow.resolution.Record == nil || flow.resolution.Record.ID != "about-es" {
		t.Fatalf("expected localized about page resolution, got %+v", flow.resolution)
	}
}

func TestPrepareDeliveryFlowFallsBackToConfiguredContentChannel(t *testing.T) {
	contentSvc := &contentChannelRecordingContentService{
		byLocale: map[string][]admin.CMSContent{
			"en": {
				{
					ID:              "home-en",
					Title:           "Home",
					Slug:            "home",
					Locale:          "en",
					Status:          "published",
					ContentType:     "page",
					ContentTypeSlug: "page",
					Data:            map[string]any{"path": "/home"},
				},
			},
		},
	}
	contentTypeSvc := &contentChannelRecordingTypeService{
		items: []admin.CMSContentType{
			{
				ID:   "page-type",
				Name: "Page",
				Slug: "page",
				Schema: map[string]any{
					"type":       "object",
					"properties": map[string]any{},
				},
				Capabilities: map[string]any{
					"delivery": map[string]any{
						"enabled": true,
						"kind":    "page",
					},
				},
			},
		},
	}
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			ContentChannel: "staging",
		}),
		contentSvc:     contentSvc,
		contentTypeSvc: contentTypeSvc,
	}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/home")

	flow := runtime.prepareDeliveryFlow(ctx)

	if flow.state.ContentChannel != "staging" {
		t.Fatalf("expected configured content channel fallback staging, got %q", flow.state.ContentChannel)
	}
	if contentTypeSvc.lastChannel != "staging" || contentSvc.lastChannel != "staging" {
		t.Fatalf("expected staging channel to propagate into service contexts, got contentType=%q content=%q", contentTypeSvc.lastChannel, contentSvc.lastChannel)
	}
	if flow.resolution == nil || flow.resolution.Record == nil || flow.resolution.Record.ID != "home-en" {
		t.Fatalf("expected home-en resolution under configured content channel fallback, got %+v", flow.resolution)
	}
}

func TestPrepareDeliveryFlowCarriesResolveErrors(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg:        ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		contentSvc:     admin.NewInMemoryContentService(),
		contentTypeSvc: &errorContentTypeService{err: errors.New("content types offline")},
	}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/home")

	flow := runtime.prepareDeliveryFlow(ctx)

	if flow.resolution != nil {
		t.Fatalf("expected no resolution when capability lookup fails, got %+v", flow.resolution)
	}
	if flow.err.Status != 500 || flow.err.Message != "content types offline" {
		t.Fatalf("expected resolve error to surface as site runtime error, got %+v", flow.err)
	}
}
