package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestLocalizedCapabilityRecordsFiltersByTypeVisibilityAndLocaleOrder(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es", "fr"},
		Features: SiteFeatures{
			EnableI18N: new(true),
		},
	})
	stub := &localeScopedContentListStub{
		CMSContentService: admin.NewInMemoryContentService(),
		byLocale: map[string][]admin.CMSContent{
			"en": {
				{
					ID:              "page-en",
					Slug:            "about",
					Locale:          "en",
					Status:          "published",
					ContentType:     "page",
					ContentTypeSlug: "page",
				},
				{
					ID:              "page-draft",
					Slug:            "draft",
					Locale:          "en",
					Status:          "draft",
					ContentType:     "page",
					ContentTypeSlug: "page",
				},
			},
			"es": {
				{
					ID:              "page-es",
					Slug:            "sobre",
					Locale:          "es",
					Status:          "published",
					ContentType:     "page",
					ContentTypeSlug: "page",
				},
				{
					ID:              "post-es",
					Slug:            "not-a-page",
					Locale:          "es",
					Status:          "published",
					ContentType:     "post",
					ContentTypeSlug: "post",
				},
			},
			"fr": {
				{
					ID:              "page-fr",
					Slug:            "bonjour",
					Locale:          "fr",
					Status:          "published",
					ContentType:     "page",
					ContentTypeSlug: "page",
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

	got := runtime.localizedCapabilityRecords(
		context.Background(),
		deliveryCapability{TypeSlug: "page", Kind: "page"},
		state,
		newSiteContentCache(),
		state.SupportedLocales,
		[]string{state.Locale},
		[]string{state.DefaultLocale},
		[]string{"fr"},
	)

	if len(got.locales) != 3 || got.locales[0] != "en" || got.locales[1] != "es" || got.locales[2] != "fr" {
		t.Fatalf("expected locale order [en es fr], got %+v", got.locales)
	}
	if len(got.byLocale["es"]) != 1 || got.byLocale["es"][0].ID != "page-es" {
		t.Fatalf("expected only visible page-es for es locale, got %+v", got.byLocale["es"])
	}
	if len(got.byLocale["en"]) != 1 || got.byLocale["en"][0].ID != "page-en" {
		t.Fatalf("expected draft page filtered from en locale, got %+v", got.byLocale["en"])
	}
	if len(got.byLocale["fr"]) != 1 || got.byLocale["fr"][0].ID != "page-fr" {
		t.Fatalf("expected page-fr included from extra locale, got %+v", got.byLocale["fr"])
	}
	if stub.listCalls["en"] != 1 || stub.listCalls["es"] != 1 || stub.listCalls["fr"] != 1 {
		t.Fatalf("expected one cached load per locale, got %+v", stub.listCalls)
	}
}

func TestResolvePagePathAliasCandidatesMatchesIdentityAcrossLocales(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
		Features: SiteFeatures{
			EnableI18N: new(true),
		},
	})
	stub := &localeScopedContentListStub{
		CMSContentService: admin.NewInMemoryContentService(),
		byLocale: map[string][]admin.CMSContent{
			"en": {
				{
					ID:              "page-record",
					FamilyID:        "page-family",
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
					ID:              "page-record",
					FamilyID:        "page-family",
					Slug:            "about",
					Locale:          "es",
					Status:          "published",
					ContentType:     "page",
					ContentTypeSlug: "page",
					Data:            map[string]any{"path": "/sobre"},
				},
			},
		},
	}
	runtime := &deliveryRuntime{
		siteCfg:    cfg,
		contentSvc: stub,
	}
	state := RequestState{
		Locale:           "es",
		DefaultLocale:    "en",
		SupportedLocales: []string{"en", "es"},
	}
	records := []admin.CMSContent{{
		ID:              "page-record",
		FamilyID:        "page-family",
		Slug:            "about",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/about"},
	}}

	got := runtime.resolvePagePathAliasCandidates(
		context.Background(),
		deliveryCapability{TypeSlug: "page", Kind: "page"},
		records,
		state,
		"/sobre",
		newSiteContentCache(),
	)

	if len(got) != 1 || got[0].ID != "page-record" {
		t.Fatalf("expected canonical record returned for localized alias, got %+v", got)
	}
}

func TestResolveDetailPathAliasCandidatesDeduplicatesMatchedIdentity(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
		Features: SiteFeatures{
			EnableI18N: new(true),
		},
	})
	stub := &localeScopedContentListStub{
		CMSContentService: admin.NewInMemoryContentService(),
		byLocale: map[string][]admin.CMSContent{
			"en": {
				{
					ID:              "post-record",
					FamilyID:        "post-family",
					Slug:            "hello-world",
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
					FamilyID:        "post-family",
					Slug:            "hello-world",
					Locale:          "es",
					Status:          "published",
					ContentType:     "post",
					ContentTypeSlug: "post",
					Data:            map[string]any{"path": "/posts/hola-mundo"},
				},
				{
					ID:              "post-record",
					FamilyID:        "post-family",
					Slug:            "hello-world",
					Locale:          "es",
					Status:          "published",
					ContentType:     "post",
					ContentTypeSlug: "post",
					Data:            map[string]any{"path": "/posts/hola-mundo"},
				},
			},
		},
	}
	runtime := &deliveryRuntime{
		siteCfg:    cfg,
		contentSvc: stub,
	}
	state := RequestState{
		Locale:           "es",
		DefaultLocale:    "en",
		SupportedLocales: []string{"en", "es"},
	}

	got := runtime.resolveDetailPathAliasCandidates(
		context.Background(),
		deliveryCapability{TypeSlug: "post", Kind: "detail", DetailRoute: "/posts/:slug"},
		state,
		"",
		"hello-world",
		newSiteContentCache(),
	)

	if len(got) != 2 {
		t.Fatalf("expected one candidate per locale after dedupe, got %+v", got)
	}
	if got[0].Locale != "en" || got[1].Locale != "es" {
		t.Fatalf("expected locale-preserving alias candidates, got %+v", got)
	}
}

func TestResolutionFromDetailRecordProjectsLocaleMetadataAndFamilyPaths(t *testing.T) {
	capability := deliveryCapability{TypeSlug: "post", Kind: "detail", DetailTemplate: "site/post"}
	group := []admin.CMSContent{
		{
			ID:       "post-en",
			FamilyID: "post-family",
			Locale:   "en",
			Slug:     "hello-world",
			Data:     map[string]any{"path": "/posts/hello-world"},
		},
		{
			ID:       "post-es",
			FamilyID: "post-family",
			Locale:   "es",
			Slug:     "hello-world",
			Data:     map[string]any{"path": "/posts/hola-mundo"},
		},
	}

	resolution := resolutionFromDetailRecord(
		capability,
		group[1],
		"es",
		[]string{"en", "es"},
		false,
		group,
	)

	if resolution == nil || resolution.Record == nil {
		t.Fatalf("expected detail resolution, got %+v", resolution)
	}
	if resolution.ResolvedLocale != "es" || resolution.Record.ResolvedLocale != "es" {
		t.Fatalf("expected resolved locale es, got %+v", resolution)
	}
	if resolution.FamilyID != "post-family" {
		t.Fatalf("expected family id preserved, got %+v", resolution)
	}
	if resolution.PathsByLocale["en"] != "/posts/hello-world" || resolution.PathsByLocale["es"] != "/posts/hola-mundo" {
		t.Fatalf("expected localized paths projected, got %+v", resolution.PathsByLocale)
	}
	if len(resolution.TemplateCandidates) == 0 || resolution.TemplateCandidates[0] != "site/post" {
		t.Fatalf("expected detail template candidates preserved, got %+v", resolution.TemplateCandidates)
	}
}

func TestResolvePagePathAliasCandidatesMatchesRouteKeyAcrossDifferentSlugs(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
		Features: SiteFeatures{
			EnableI18N: new(true),
		},
	})
	stub := &localeScopedContentListStub{
		CMSContentService: admin.NewInMemoryContentService(),
		byLocale: map[string][]admin.CMSContent{
			"en": {{
				ID:              "page-en",
				Slug:            "about",
				Locale:          "en",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				RouteKey:        "pages/about",
				Data:            map[string]any{"path": "/about"},
			}},
			"es": {{
				ID:              "page-es",
				Slug:            "sobre-nosotros",
				Locale:          "es",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				RouteKey:        "pages/about",
				Data:            map[string]any{"path": "/sobre-nosotros"},
			}},
		},
	}
	runtime := &deliveryRuntime{
		siteCfg:    cfg,
		contentSvc: stub,
	}
	state := RequestState{
		Locale:           "es",
		DefaultLocale:    "en",
		SupportedLocales: []string{"en", "es"},
	}
	records := []admin.CMSContent{{
		ID:              "page-es",
		Slug:            "sobre-nosotros",
		Locale:          "es",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		RouteKey:        "pages/about",
		Data:            map[string]any{"path": "/sobre-nosotros"},
	}}

	got := runtime.resolvePagePathAliasCandidates(
		context.Background(),
		deliveryCapability{TypeSlug: "page", Kind: "page"},
		records,
		state,
		"/about",
		newSiteContentCache(),
	)

	if len(got) != 1 || got[0].ID != "page-es" {
		t.Fatalf("expected es page matched by route_key alias, got %+v", got)
	}
}
