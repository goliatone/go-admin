package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestResolvePageKindMatchesLocalizedAliasPath(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
		LocalePrefixMode: LocalePrefixNonDefault,
		Features: SiteFeatures{
			EnableI18N: boolPtr(true),
		},
	})
	stub := &localeScopedContentListStub{
		CMSContentService: admin.NewInMemoryContentService(),
		byLocale: map[string][]admin.CMSContent{
			"en": {
				{
					ID:              "about-record",
					Slug:            "about",
					Locale:          "en",
					Status:          "published",
					ContentType:     "page",
					ContentTypeSlug: "page",
					Data:            map[string]any{"path": "/about"},
				},
			},
			"es": {
				{
					ID:              "about-record",
					Slug:            "about",
					Locale:          "es",
					Status:          "published",
					ContentType:     "page",
					ContentTypeSlug: "page",
					Data:            map[string]any{"path": "/sobre-nosotros"},
				},
			},
		},
	}
	runtime := &deliveryRuntime{
		siteCfg:    cfg,
		contentSvc: stub,
	}
	state := RequestState{
		Locale:              "es",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en", "es"},
		AllowLocaleFallback: true,
	}
	records := append([]admin.CMSContent{}, stub.byLocale["es"]...)
	resolution, siteErr, matched := runtime.resolvePageKind(
		context.Background(),
		deliveryCapability{TypeSlug: "page", Kind: "page"},
		records,
		state,
		"/about",
		newSiteContentCache(),
	)
	if !matched {
		t.Fatalf("expected localized alias match for /about in es locale")
	}
	if hasSiteRuntimeError(siteErr) {
		t.Fatalf("unexpected site error %+v", siteErr)
	}
	if resolution == nil || resolution.Record == nil {
		t.Fatalf("expected detail resolution with record")
	}
	if resolution.Record.Locale != "es" {
		t.Fatalf("expected resolved record locale es, got %+v", resolution.Record)
	}
}

func TestResolveDetailKindMatchesLocalizedAliasPath(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
		LocalePrefixMode: LocalePrefixNonDefault,
		Features: SiteFeatures{
			EnableI18N: boolPtr(true),
		},
	})
	stub := &localeScopedContentListStub{
		CMSContentService: admin.NewInMemoryContentService(),
		byLocale: map[string][]admin.CMSContent{
			"en": {
				{
					ID:              "post-record",
					Slug:            "hello-world",
					FamilyID:        "post-family",
					Locale:          "en",
					Status:          "published",
					ContentType:     "post",
					ContentTypeSlug: "post",
					Data:            map[string]any{"path": "/posts/hello-world"},
				},
			},
			"es": {
				{
					ID:              "post-record",
					Slug:            "hello-world",
					FamilyID:        "post-family",
					Locale:          "es",
					Status:          "published",
					ContentType:     "post",
					ContentTypeSlug: "post",
					Data:            map[string]any{"path": "/posts/hello-world"},
				},
			},
		},
	}
	runtime := &deliveryRuntime{
		siteCfg:    cfg,
		contentSvc: stub,
	}
	state := RequestState{
		Locale:              "es",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en", "es"},
		AllowLocaleFallback: true,
	}
	resolution, siteErr, matched := runtime.resolveDetailKind(
		context.Background(),
		deliveryCapability{TypeSlug: "post", Kind: "detail", DetailRoute: "/posts/:slug"},
		nil,
		state,
		"/posts/hello-world",
		newSiteContentCache(),
	)
	if !matched {
		t.Fatalf("expected localized alias match for /posts/hello-world in es locale")
	}
	if hasSiteRuntimeError(siteErr) {
		t.Fatalf("unexpected site error %+v", siteErr)
	}
	if resolution == nil || resolution.Record == nil {
		t.Fatalf("expected detail resolution with record")
	}
	if resolution.Record.Locale != "es" {
		t.Fatalf("expected resolved record locale es, got %+v", resolution.Record)
	}
	if stub.listCalls["en"] != 1 || stub.listCalls["es"] != 1 {
		t.Fatalf("expected localized alias candidate lookup across locales, got %+v", stub.listCalls)
	}
}

func TestResolveCollectionKindBuildsResolvedLocaleAndTemplates(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
	}
	state := RequestState{
		Locale:              "es",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en", "es"},
		AllowLocaleFallback: true,
	}
	records := []admin.CMSContent{
		{
			ID:              "post-es",
			Title:           "Hola",
			Slug:            "hola",
			FamilyID:        "post-family",
			Locale:          "es",
			Status:          "published",
			ContentType:     "post",
			ContentTypeSlug: "post",
			Data:            map[string]any{"path": "/blog/hola"},
		},
		{
			ID:              "post-en",
			Title:           "Hello",
			Slug:            "hello",
			FamilyID:        "post-family",
			Locale:          "en",
			Status:          "published",
			ContentType:     "post",
			ContentTypeSlug: "post",
			Data:            map[string]any{"path": "/blog/hello"},
		},
	}
	resolution, matched := runtime.resolveCollectionKind(
		deliveryCapability{TypeSlug: "post", Kind: "hybrid", ListRoute: "/blog"},
		records,
		state,
		"/blog",
	)
	if !matched {
		t.Fatalf("expected collection route match")
	}
	if resolution == nil || resolution.Mode != "collection" {
		t.Fatalf("expected collection resolution, got %+v", resolution)
	}
	if resolution.ResolvedLocale != "es" {
		t.Fatalf("expected resolved locale es, got %+v", resolution)
	}
	if len(resolution.Records) != 1 || resolution.Records[0].Locale != "es" {
		t.Fatalf("expected locale-selected collection records, got %+v", resolution.Records)
	}
	if len(resolution.TemplateCandidates) == 0 || resolution.TemplateCandidates[0] == "" {
		t.Fatalf("expected collection template candidates, got %+v", resolution.TemplateCandidates)
	}
}
