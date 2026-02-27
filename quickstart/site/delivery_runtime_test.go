package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestResolveLocaleRecordFallbackPolicy(t *testing.T) {
	capability := deliveryCapability{TypeSlug: "post", Kind: "detail"}
	state := RequestState{
		Locale:           "es",
		DefaultLocale:    "en",
		SupportedLocales: []string{"en", "es"},
	}
	candidates := []admin.CMSContent{
		{
			ID:          "post-en",
			Slug:        "welcome",
			Locale:      "en",
			Status:      "published",
			ContentType: "post",
		},
	}

	selected, missing, available, fallbackUsed := resolveLocaleRecord(candidates, state, capability, true, "en")
	if missing {
		t.Fatalf("expected no hard-missing error in fallback-allowed mode")
	}
	if selected.ID != "post-en" {
		t.Fatalf("expected fallback record selected, got %+v", selected)
	}
	if !fallbackUsed || !selected.MissingRequestedLocale {
		t.Fatalf("expected fallback metadata to be marked, got %+v", selected)
	}
	if len(available) != 1 || available[0] != "en" {
		t.Fatalf("expected available locales [en], got %+v", available)
	}

	selected, missing, _, fallbackUsed = resolveLocaleRecord(candidates, state, capability, false, "en")
	if !missing {
		t.Fatalf("expected locale-missing indicator when fallback disabled")
	}
	if selected.ID != "" {
		t.Fatalf("expected no selected record when fallback disabled, got %+v", selected)
	}
	if fallbackUsed {
		t.Fatalf("expected fallback not used when disabled")
	}
}

func TestPreviewScopeEnforcesEntityAndRecordID(t *testing.T) {
	capability := deliveryCapability{TypeSlug: "post", Kind: "detail"}
	record := admin.CMSContent{
		ID:              "post-1",
		Slug:            "welcome",
		Status:          "draft",
		ContentType:     "post",
		ContentTypeSlug: "post",
	}

	invalidState := RequestState{
		PreviewTokenPresent: true,
		PreviewTokenValid:   false,
		IsPreview:           false,
		PreviewEntityType:   "post",
		PreviewContentID:    "post-1",
	}
	if recordVisibleForRequest(record, capability, invalidState) {
		t.Fatalf("expected invalid preview token to keep draft hidden")
	}

	validWrongEntity := RequestState{
		PreviewTokenPresent: true,
		PreviewTokenValid:   true,
		IsPreview:           true,
		PreviewEntityType:   "page",
		PreviewContentID:    "post-1",
	}
	if recordVisibleForRequest(record, capability, validWrongEntity) {
		t.Fatalf("expected wrong entity scope to keep draft hidden")
	}

	validWrongID := RequestState{
		PreviewTokenPresent: true,
		PreviewTokenValid:   true,
		IsPreview:           true,
		PreviewEntityType:   "post",
		PreviewContentID:    "other-id",
	}
	if recordVisibleForRequest(record, capability, validWrongID) {
		t.Fatalf("expected wrong record id scope to keep draft hidden")
	}

	valid := RequestState{
		PreviewTokenPresent: true,
		PreviewTokenValid:   true,
		IsPreview:           true,
		PreviewEntityType:   "posts",
		PreviewContentID:    "post-1",
	}
	if !recordVisibleForRequest(record, capability, valid) {
		t.Fatalf("expected matching preview token scope to show draft")
	}
}

func TestDeliveryRuntimeResolvesCapabilityKinds(t *testing.T) {
	content := admin.NewInMemoryContentService()
	createType := func(id, slug, kind, listRoute, detailRoute string) {
		_, err := content.CreateContentType(context.Background(), admin.CMSContentType{
			ID:   id,
			Name: slug,
			Slug: slug,
			Schema: map[string]any{
				"type":       "object",
				"properties": map[string]any{},
			},
			Capabilities: map[string]any{
				"delivery": map[string]any{
					"enabled": true,
					"kind":    kind,
					"routes": map[string]any{
						"list":   listRoute,
						"detail": detailRoute,
					},
				},
			},
		})
		if err != nil {
			t.Fatalf("create content type %s: %v", slug, err)
		}
	}
	createType("page-type", "page", "page", "", "")
	createType("news-type", "news", "collection", "/news", "")
	createType("product-type", "product", "detail", "", "/products/:slug")
	createType("post-type", "post", "hybrid", "/blog", "/blog/:slug")

	createRecord := func(id, slug, path, contentType string) {
		_, err := content.CreateContent(context.Background(), admin.CMSContent{
			ID:              id,
			Slug:            slug,
			Title:           slug,
			Locale:          "en",
			Status:          "published",
			ContentType:     contentType,
			ContentTypeSlug: contentType,
			Data:            map[string]any{"path": path},
		})
		if err != nil {
			t.Fatalf("create content %s: %v", id, err)
		}
	}
	createRecord("about", "about", "/about", "page")
	createRecord("news-1", "breaking-news", "/news/breaking-news", "news")
	createRecord("product-1", "widget", "", "product")
	createRecord("post-1", "hello", "/blog/hello", "post")

	runtime := newDeliveryRuntime(
		ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		nil,
		content,
		content,
	)
	if runtime == nil {
		t.Fatalf("expected delivery runtime instance")
	}
	state := RequestState{
		Locale:              "en",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en"},
		AllowLocaleFallback: true,
	}

	assertMode := func(path, expectedMode, expectedType string) {
		t.Helper()
		resolution, siteErr := runtime.resolve(context.Background(), state, path)
		if hasSiteRuntimeError(siteErr) {
			t.Fatalf("resolve %s unexpected error %+v", path, siteErr)
		}
		if resolution == nil {
			t.Fatalf("resolve %s expected resolution", path)
		}
		if resolution.Mode != expectedMode || resolution.Capability.TypeSlug != expectedType {
			t.Fatalf("resolve %s expected %s/%s, got %s/%s", path, expectedMode, expectedType, resolution.Mode, resolution.Capability.TypeSlug)
		}
	}

	assertMode("/about", "detail", "page")
	assertMode("/news", "collection", "news")
	assertMode("/products/widget", "detail", "product")
	assertMode("/blog", "collection", "post")
	assertMode("/blog/hello", "detail", "post")
}

func TestRecordDeliveryPathPrefersCanonicalContentPathFromMetadata(t *testing.T) {
	capability := deliveryCapability{TypeSlug: "page", Kind: "page"}
	record := admin.CMSContent{
		Slug:     "home",
		Data:     map[string]any{},
		Metadata: map[string]any{"path": "/"},
	}
	if got := recordDeliveryPath(record, capability); got != "/" {
		t.Fatalf("expected canonical metadata path /, got %q", got)
	}
}

func TestDeliveryRuntimePreviewFallbackResolvesByRecordIDWhenRoutePathMisses(t *testing.T) {
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
		Data:            map[string]any{},
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
	resolution, siteErr := runtime.resolve(context.Background(), state, "/")
	if hasSiteRuntimeError(siteErr) {
		t.Fatalf("resolve / unexpected error %+v", siteErr)
	}
	if resolution == nil {
		t.Fatalf("expected preview fallback resolution")
	}
	if resolution.Capability.TypeSlug != "page" || resolution.Mode != "detail" {
		t.Fatalf("expected detail/page resolution, got %+v", resolution)
	}
	if resolution.Record == nil || resolution.Record.ID != "page-draft-home" {
		t.Fatalf("expected preview fallback to resolve page-draft-home, got %+v", resolution.Record)
	}
}
