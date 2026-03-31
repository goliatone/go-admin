package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

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
