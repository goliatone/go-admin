package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestResolvePageCapabilitiesSkipsNonPageKindsAndReturnsFirstPageMatch(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
	}
	state := RequestState{
		Locale:              "en",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en"},
		AllowLocaleFallback: true,
	}
	capabilities := []deliveryCapability{
		{TypeSlug: "post", Kind: "detail", DetailRoute: "/posts/:slug"},
		{TypeSlug: "page", Kind: "page"},
	}
	recordsByType := map[string][]admin.CMSContent{
		"page": {
			{
				ID:              "about-page",
				Slug:            "about",
				Locale:          "en",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				Data:            map[string]any{"path": "/about"},
			},
		},
		"post": {
			{
				ID:              "post-record",
				Slug:            "about",
				Locale:          "en",
				Status:          "published",
				ContentType:     "post",
				ContentTypeSlug: "post",
				Data:            map[string]any{"path": "/posts/about"},
			},
		},
	}

	resolution, siteErr, matched := runtime.resolvePageCapabilities(
		context.Background(),
		capabilities,
		recordsByType,
		state,
		"/about",
		newSiteContentCache(),
	)
	if !matched {
		t.Fatalf("expected page capability match")
	}
	if hasSiteRuntimeError(siteErr) {
		t.Fatalf("unexpected site error %+v", siteErr)
	}
	if resolution == nil || resolution.Record == nil || resolution.Record.ID != "about-page" {
		t.Fatalf("expected page match, got %+v", resolution)
	}
}

func TestResolveDetailCapabilitiesPropagatesTranslationMissingError(t *testing.T) {
	allowFallback := false
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{AllowLocaleFallback: &allowFallback}),
	}
	state := RequestState{
		Locale:              "es",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en", "es"},
		AllowLocaleFallback: false,
	}
	capabilities := []deliveryCapability{
		{TypeSlug: "post", Kind: "detail", DetailRoute: "/posts/:slug"},
	}
	recordsByType := map[string][]admin.CMSContent{
		"post": {
			{
				ID:              "post-en",
				Slug:            "hello-world",
				Locale:          "en",
				Status:          "published",
				ContentType:     "post",
				ContentTypeSlug: "post",
				Data:            map[string]any{"path": "/posts/hello-world"},
			},
		},
	}

	resolution, siteErr, matched := runtime.resolveDetailCapabilities(
		context.Background(),
		capabilities,
		recordsByType,
		state,
		"/posts/hello-world",
		newSiteContentCache(),
	)
	if !matched {
		t.Fatalf("expected detail capability to match and surface translation-missing error")
	}
	if resolution != nil {
		t.Fatalf("expected nil resolution when translation-missing error is returned, got %+v", resolution)
	}
	if siteErr.Code != siteErrorCodeTranslationMissing || siteErr.Status != 404 {
		t.Fatalf("expected translation-missing site error, got %+v", siteErr)
	}
}

func TestResolveCollectionCapabilitiesMatchesHybridCollectionRoute(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
	}
	state := RequestState{
		Locale:              "en",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en"},
		AllowLocaleFallback: true,
	}
	capabilities := []deliveryCapability{
		{TypeSlug: "post", Kind: "hybrid", ListRoute: "/blog"},
	}
	recordsByType := map[string][]admin.CMSContent{
		"post": {
			{
				ID:              "post-en",
				Slug:            "hello-world",
				Locale:          "en",
				Status:          "published",
				ContentType:     "post",
				ContentTypeSlug: "post",
				Data:            map[string]any{"path": "/blog/hello-world"},
			},
		},
	}

	resolution, matched := runtime.resolveCollectionCapabilities(capabilities, recordsByType, state, "/blog")
	if !matched {
		t.Fatalf("expected collection capability match")
	}
	if resolution == nil || resolution.Mode != "collection" || resolution.Capability.TypeSlug != "post" {
		t.Fatalf("expected collection resolution for post capability, got %+v", resolution)
	}
}

func TestResolvePreviewFallbackReturnsMatchedPreviewResult(t *testing.T) {
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
		ID:              "page-draft-home",
		Slug:            "home",
		Title:           "Home Draft",
		Locale:          "en",
		Status:          "draft",
		ContentType:     "page",
		ContentTypeSlug: "page",
	})
	if err != nil {
		t.Fatalf("create content page-draft-home: %v", err)
	}

	runtime := newDeliveryRuntime(
		ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		nil,
		content,
		content,
	)
	if runtime == nil {
		t.Fatalf("expected delivery runtime instance")
	}
	capabilities, err := runtime.capabilities(context.Background())
	if err != nil {
		t.Fatalf("capabilities returned error: %v", err)
	}
	contents, err := runtime.listSiteContentsCached(context.Background(), "en", newSiteContentCache())
	if err != nil {
		t.Fatalf("listSiteContentsCached returned error: %v", err)
	}
	state := RequestState{
		Locale:              "en",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en"},
		AllowLocaleFallback: true,
		PreviewTokenPresent: true,
		PreviewTokenValid:   true,
		IsPreview:           true,
		PreviewEntityType:   "pages",
		PreviewContentID:    "page-draft-home",
	}
	recordsByType := runtime.recordsByType(capabilities, contents, state)

	resolution, siteErr, matched := runtime.resolvePreviewFallback(capabilities, recordsByType, state)
	if !matched {
		t.Fatalf("expected preview fallback match")
	}
	if hasSiteRuntimeError(siteErr) {
		t.Fatalf("unexpected preview fallback site error %+v", siteErr)
	}
	if resolution == nil || resolution.Record == nil || resolution.Record.ID != "page-draft-home" {
		t.Fatalf("expected preview fallback to resolve page-draft-home, got %+v", resolution)
	}
}
