package site

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestDeliveryHandlerRuntimeFallsBackWhenRuntimeUnavailable(t *testing.T) {
	var runtime *deliveryRuntime

	handler := runtime.Handler()
	ctx := router.NewMockContext()
	ctx.On("SendStatus", 404).Return(nil)
	if err := handler(ctx); err != nil {
		t.Fatalf("nil runtime fallback: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestDeliveryHandlerRuntimeIgnoresNilContextForLiveHandler(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg:        ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		contentSvc:     admin.NewInMemoryContentService(),
		contentTypeSvc: admin.NewInMemoryContentService(),
	}
	if err := runtime.Handler()(nil); err != nil {
		t.Fatalf("expected nil context to be ignored, got %v", err)
	}
}

func TestDeliveryHandlerRuntimeRespondDeliveryRendersResolvedContent(t *testing.T) {
	content := admin.NewInMemoryContentService()
	_, err := content.CreateContentType(context.Background(), admin.CMSContentType{
		ID:   "page-type",
		Name: "page",
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
	})
	if err != nil {
		t.Fatalf("create content type page: %v", err)
	}
	_, err = content.CreateContent(context.Background(), admin.CMSContent{
		ID:              "home-page",
		Slug:            "home",
		Title:           "Home",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/"},
	})
	if err != nil {
		t.Fatalf("create content home-page: %v", err)
	}
	runtime := newDeliveryRuntime(
		ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		nil,
		content,
		content,
	)
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	server.Router().Get("/*path", func(c router.Context) error {
		return runtime.respondDelivery(c)
	})

	payload := performSiteRequest(t, server, "/?format=json")
	if got := nestedString(payload, "template"); got != "site/page" {
		t.Fatalf("expected delivery template site/page, got %q", got)
	}
	if nestedString(payload, "context", "page", "title") != "Home" {
		t.Fatalf("expected rendered home content in payload, got %+v", nestedAny(payload, "context"))
	}
}

func TestDeliveryHandlerRuntimeRespondDeliveryRendersSiteErrors(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg:        ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		contentSvc:     admin.NewInMemoryContentService(),
		contentTypeSvc: &errorContentTypeService{err: errors.New("content types offline")},
	}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	server.Router().Get("/*path", func(c router.Context) error {
		return runtime.respondDelivery(c)
	})

	payload := performSiteRequestWithContext(t, server, "/home?format=json", nil, http.StatusInternalServerError)
	if nestedString(payload, "error", "message") != "content types offline" {
		t.Fatalf("expected runtime error message content types offline, got %+v", payload)
	}
}

func TestDeliveryHandlerRuntimeRespondDeliveryRendersNotFoundWhenNoResolution(t *testing.T) {
	content := admin.NewInMemoryContentService()
	runtime := newDeliveryRuntime(
		ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		nil,
		content,
		content,
	)
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	server.Router().Get("/*path", func(c router.Context) error {
		return runtime.respondDelivery(c)
	})

	payload := performSiteRequestWithContext(t, server, "/missing?format=json", nil, http.StatusNotFound)
	if intFromAny(nestedAny(payload, "error", "status")) != http.StatusNotFound {
		t.Fatalf("expected 404 payload, got %+v", payload)
	}
}
