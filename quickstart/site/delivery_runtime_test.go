package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

type localeScopedContentListStub struct {
	admin.CMSContentService
	byLocale  map[string][]admin.CMSContent
	listCalls map[string]int
}

func (s *localeScopedContentListStub) Contents(ctx context.Context, locale string) ([]admin.CMSContent, error) {
	if s == nil {
		return nil, nil
	}
	if s.listCalls == nil {
		s.listCalls = map[string]int{}
	}
	s.listCalls[locale]++
	if items, ok := s.byLocale[locale]; ok {
		return append([]admin.CMSContent{}, items...), nil
	}
	if items, ok := s.byLocale[""]; ok {
		return append([]admin.CMSContent{}, items...), nil
	}
	return nil, nil
}

func (s *localeScopedContentListStub) ContentsWithOptions(ctx context.Context, locale string, _ ...admin.CMSContentListOption) ([]admin.CMSContent, error) {
	return s.Contents(ctx, locale)
}

func TestResolveLocalizedPathsByLocaleUsesLocaleVariants(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es", "fr"},
		LocalePrefixMode: LocalePrefixNonDefault,
	})
	stub := &localeScopedContentListStub{
		CMSContentService: admin.NewInMemoryContentService(),
		byLocale: map[string][]admin.CMSContent{
			"en": []admin.CMSContent{{
				ID:              "about-record",
				Slug:            "about",
				Locale:          "en",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				Data:            map[string]any{"path": "/about"},
			}},
			"es": []admin.CMSContent{{
				ID:              "about-record",
				Slug:            "about",
				Locale:          "es",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				Data:            map[string]any{"path": "/sobre-nosotros"},
			}},
			"fr": []admin.CMSContent{{
				ID:              "about-record",
				Slug:            "about",
				Locale:          "fr",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				Data:            map[string]any{"path": "/a-propos"},
			}},
		},
	}
	runtime := &deliveryRuntime{
		siteCfg:    cfg,
		contentSvc: stub,
	}
	state := RequestState{
		Locale:              "en",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en", "es", "fr"},
		AllowLocaleFallback: true,
	}
	record := admin.CMSContent{
		ID:              "about-record",
		Slug:            "about",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/about"},
	}
	got := runtime.resolveLocalizedPathsByLocale(
		context.Background(),
		state,
		deliveryCapability{TypeSlug: "page", Kind: "page"},
		record,
		nil,
		newSiteContentCache(),
	)

	if got["en"] != "/about" {
		t.Fatalf("expected en localized path /about, got %#v", got)
	}
	if got["es"] != "/sobre-nosotros" {
		t.Fatalf("expected es localized path /sobre-nosotros, got %#v", got)
	}
	if got["fr"] != "/a-propos" {
		t.Fatalf("expected fr localized path /a-propos, got %#v", got)
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
		resolution, siteErr := runtime.resolve(context.Background(), state, path, newSiteContentCache())
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
	resolution, siteErr := runtime.resolve(context.Background(), state, "/", newSiteContentCache())
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

func TestRecordDeliveryPathAppliesContentTypePathPolicy(t *testing.T) {
	capability, ok := capabilityFromContentType(admin.CMSContentType{
		Name: "news",
		Slug: "news",
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "detail",
				"routes": map[string]any{
					"detail": "/news/:slug",
				},
				"path_policy": map[string]any{
					"allow_root":       false,
					"allowed_prefixes": []string{"/news"},
				},
			},
		},
	})
	if !ok {
		t.Fatalf("expected delivery capability to resolve")
	}

	externalPath := admin.CMSContent{
		Slug: "site-runtime-rollout",
		Data: map[string]any{"path": "https://example.com/phish"},
	}
	if got := recordDeliveryPath(externalPath, capability); got != "/news/site-runtime-rollout" {
		t.Fatalf("expected external URL path to be ignored and fallback to route path, got %q", got)
	}

	offPrefixPath := admin.CMSContent{
		Slug: "site-runtime-rollout",
		Data: map[string]any{"path": "/admin/secret"},
	}
	if got := recordDeliveryPath(offPrefixPath, capability); got != "/news/site-runtime-rollout" {
		t.Fatalf("expected disallowed prefix path to fallback to route path, got %q", got)
	}

	unrecoverable := admin.CMSContent{
		Data: map[string]any{"path": "/admin/secret"},
	}
	if got := recordDeliveryPath(unrecoverable, capability); got != "" {
		t.Fatalf("expected unrecoverable invalid path to be dropped, got %q", got)
	}
}

func TestDeliveryRuntimeResolvesWithEnvironmentScopedContentTypes(t *testing.T) {
	content := admin.NewInMemoryContentService()
	_, err := content.CreateContentType(context.Background(), admin.CMSContentType{
		ID:          "page-type",
		Name:        "Page",
		Slug:        "page",
		Environment: "prod",
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
		t.Fatalf("create content type: %v", err)
	}
	_, err = content.CreateContent(context.Background(), admin.CMSContent{
		ID:              "home-page",
		Title:           "Home",
		Slug:            "home",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/home"},
	})
	if err != nil {
		t.Fatalf("create content: %v", err)
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
	}

	resolution, siteErr := runtime.resolve(
		admin.WithEnvironment(context.Background(), "prod"),
		state,
		"/home",
		newSiteContentCache(),
	)
	if hasSiteRuntimeError(siteErr) {
		t.Fatalf("resolve /home unexpected error %+v", siteErr)
	}
	if resolution == nil || resolution.Record == nil || resolution.Record.ID != "home-page" {
		t.Fatalf("expected home-page detail resolution, got %+v", resolution)
	}
}
