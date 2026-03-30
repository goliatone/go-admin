package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestCloneLocalizedPathsNormalizesAndSkipsBlankEntries(t *testing.T) {
	got := cloneLocalizedPaths(map[string]string{
		" EN ": " /about ",
		"es":   "",
		"":     "/ignored",
		"fr":   "a-propos",
	})

	if len(got) != 2 {
		t.Fatalf("expected two normalized entries, got %#v", got)
	}
	if got["en"] != "/about" {
		t.Fatalf("expected normalized en path /about, got %#v", got)
	}
	if got["fr"] != "/a-propos" {
		t.Fatalf("expected normalized fr path /a-propos, got %#v", got)
	}
}

func TestMapDeliveryRecordProjectsFieldsAndClonesData(t *testing.T) {
	record := admin.CMSContent{
		ID:                     "post-1",
		Title:                  "Site Runtime Rollout",
		Slug:                   "site-runtime-rollout",
		Status:                 "published",
		Locale:                 "en",
		RequestedLocale:        "es",
		ResolvedLocale:         "en",
		AvailableLocales:       []string{"en", "es"},
		FamilyID:               "post-family-1",
		MissingRequestedLocale: true,
		ContentType:            "post",
		ContentTypeSlug:        "post",
		Data: map[string]any{
			"path":             "/posts/site-runtime-rollout",
			"excerpt":          "Short summary",
			"body":             "Full content",
			"meta_title":       "Meta Title",
			"meta_description": "Meta Description",
			"preview_url":      "https://preview.example.com/posts/site-runtime-rollout",
		},
	}

	mapped := mapDeliveryRecord(record, deliveryCapability{TypeSlug: "post", Kind: "detail"})
	data, ok := mapped["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected projected data map, got %#v", mapped["data"])
	}
	data["excerpt"] = "mutated"

	if got := anyString(record.Data["excerpt"]); got != "Short summary" {
		t.Fatalf("expected original record data unchanged, got %q", got)
	}
	if got := anyString(mapped["path"]); got != "/posts/site-runtime-rollout" {
		t.Fatalf("expected projected path, got %q", got)
	}
	if got := anyString(mapped["summary"]); got != "Short summary" {
		t.Fatalf("expected projected summary, got %q", got)
	}
	if got := anyString(mapped["content"]); got != "Full content" {
		t.Fatalf("expected projected content, got %q", got)
	}
	if got := anyString(mapped["meta_title"]); got != "Meta Title" {
		t.Fatalf("expected projected meta title, got %q", got)
	}
	if got := anyString(mapped["preview_url"]); got != "https://preview.example.com/posts/site-runtime-rollout" {
		t.Fatalf("expected projected preview URL, got %q", got)
	}
	if got := anyString(mapped["family_id"]); got != "post-family-1" {
		t.Fatalf("expected projected family ID, got %q", got)
	}
}

func TestRenderResolutionJSONProjectsDetailRecordAndLocalizedSwitcher(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
		LocalePrefixMode: LocalePrefixNonDefault,
		Features: SiteFeatures{
			EnableI18N: boolPtr(true),
		},
	})
	contentSvc := &localeScopedContentListStub{
		CMSContentService: admin.NewInMemoryContentService(),
		byLocale: map[string][]admin.CMSContent{
			"en": {
				{
					ID:              "about-record",
					Title:           "About",
					Slug:            "about",
					Locale:          "en",
					Status:          "published",
					FamilyID:        "about-family",
					ContentType:     "page",
					ContentTypeSlug: "page",
					Data:            map[string]any{"path": "/about", "excerpt": "About summary"},
				},
			},
			"es": {
				{
					ID:              "about-record",
					Title:           "Sobre Nosotros",
					Slug:            "about",
					Locale:          "es",
					Status:          "published",
					FamilyID:        "about-family",
					ContentType:     "page",
					ContentTypeSlug: "page",
					Data:            map[string]any{"path": "/sobre-nosotros"},
				},
			},
		},
	}
	runtime := &deliveryRuntime{
		siteCfg:    cfg,
		contentSvc: contentSvc,
	}
	state := RequestState{
		Locale:              "en",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en", "es"},
		AllowLocaleFallback: true,
		ViewContext:         router.ViewContext{"theme": "docs"},
	}
	record := admin.CMSContent{
		ID:              "about-record",
		Title:           "About",
		Slug:            "about",
		Locale:          "en",
		Status:          "published",
		FamilyID:        "about-family",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/about", "excerpt": "About summary"},
	}
	resolution := &deliveryResolution{
		Mode:               "detail",
		Capability:         deliveryCapability{TypeSlug: "page", Kind: "page"},
		Record:             &record,
		RequestedLocale:    "en",
		ResolvedLocale:     "en",
		AvailableLocales:   []string{"en", "es"},
		FamilyID:           "about-family",
		PathsByLocale:      map[string]string{"en": " /about "},
		TemplateCandidates: []string{"site/page"},
	}

	server := router.NewHTTPServer()
	server.Router().Get("/about", func(c router.Context) error {
		return runtime.renderResolution(c, state, resolution, "/about", newSiteContentCache())
	})

	payload := performSiteRequest(t, server, "/about?format=json")

	if got := nestedString(payload, "template"); got != "site/page" {
		t.Fatalf("expected template site/page, got %q payload=%+v", got, payload)
	}
	if got := nestedString(payload, "context", "record", "path"); got != "/about" {
		t.Fatalf("expected projected record path /about, got %q payload=%+v", got, payload)
	}
	if got := nestedString(payload, "context", "record", "summary"); got != "About summary" {
		t.Fatalf("expected projected record summary, got %q payload=%+v", got, payload)
	}
	if got := nestedString(payload, "context", "family_id"); got != "about-family" {
		t.Fatalf("expected top-level family_id about-family, got %q payload=%+v", got, payload)
	}
	if got := localeSwitcherURLByLocale(payload, "es"); got != "/es/sobre-nosotros" {
		t.Fatalf("expected locale switcher to use localized es path, got %q payload=%+v", got, payload)
	}
	if got := resolution.PathsByLocale["en"]; got != " /about " {
		t.Fatalf("expected original resolution paths map unchanged, got %#v", resolution.PathsByLocale)
	}
	if _, exists := resolution.PathsByLocale["es"]; exists {
		t.Fatalf("expected localized-path projection to avoid mutating original map, got %#v", resolution.PathsByLocale)
	}
	if contentSvc.listCalls["en"] != 1 || contentSvc.listCalls["es"] != 1 {
		t.Fatalf("expected localized path lookup for en and es once each, got %#v", contentSvc.listCalls)
	}
}

func TestRenderResolutionJSONProjectsCollectionRecords(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
	}
	state := RequestState{
		Locale:           "en",
		DefaultLocale:    "en",
		SupportedLocales: []string{"en"},
	}
	resolution := &deliveryResolution{
		Mode: "collection",
		Capability: deliveryCapability{
			TypeSlug: "post",
			Kind:     "collection",
		},
		Records: []admin.CMSContent{
			{
				ID:              "post-1",
				Title:           "First",
				Slug:            "first",
				Locale:          "en",
				Status:          "published",
				ContentType:     "post",
				ContentTypeSlug: "post",
				Data:            map[string]any{"path": "/posts/first"},
			},
		},
		TemplateCandidates: []string{"site/posts"},
	}

	server := router.NewHTTPServer()
	server.Router().Get("/posts", func(c router.Context) error {
		return runtime.renderResolution(c, state, resolution, "/posts", newSiteContentCache())
	})

	payload := performSiteRequest(t, server, "/posts?format=json")

	records := nestedAny(payload, "context", "records")
	postList := nestedAny(payload, "context", "posts")
	if records == nil || postList == nil {
		t.Fatalf("expected collection projections in payload, got %+v", payload)
	}
}
