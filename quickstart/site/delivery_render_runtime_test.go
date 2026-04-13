package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type recordAwareModuleStub struct{}

func (recordAwareModuleStub) ID() string { return "record-aware" }

func (recordAwareModuleStub) RegisterRoutes(SiteModuleContext) error { return nil }

func (recordAwareModuleStub) ViewContext(_ context.Context, viewCtx router.ViewContext) router.ViewContext {
	record := anyMap(viewCtx["record"])
	if viewCtx == nil {
		viewCtx = router.ViewContext{}
	}
	viewCtx["module_record_title"] = anyString(record["title"])
	viewCtx["module_resolved_locale"] = anyString(viewCtx["resolved_locale"])
	return viewCtx
}

func TestRenderResolutionJSONProjectsDetailRecordAndLocalizedSwitcher(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
		LocalePrefixMode: LocalePrefixNonDefault,
		Features: SiteFeatures{
			EnableI18N: new(true),
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
	availableLocales, ok := nestedAny(payload, "context", "record", "available_locales").([]any)
	if !ok || len(availableLocales) != 2 {
		t.Fatalf("expected projected record available_locales to include enriched locales, got %+v", nestedAny(payload, "context", "record", "available_locales"))
	}
	if got := anyString(availableLocales[0]); got != "en" {
		t.Fatalf("expected first available locale en, got %+v", availableLocales)
	}
	if got := anyString(availableLocales[1]); got != "es" {
		t.Fatalf("expected second available locale es, got %+v", availableLocales)
	}
	contextAvailableLocales, ok := nestedAny(payload, "context", "available_locales").([]any)
	if !ok || len(contextAvailableLocales) != 2 {
		t.Fatalf("expected context available_locales projection, got %+v", nestedAny(payload, "context", "available_locales"))
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

func TestRenderResolutionReappliesModulesAfterResolvedRecordProjection(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Modules: []SiteModule{recordAwareModuleStub{}},
		}),
		modules: []SiteModule{recordAwareModuleStub{}},
	}
	state := RequestState{
		Locale:           "bo",
		DefaultLocale:    "en",
		SupportedLocales: []string{"en", "bo"},
		ViewContext: router.ViewContext{
			"module_record_title": "",
		},
	}
	record := admin.CMSContent{
		ID:              "home-bo",
		Title:           "Tibetan Home",
		Slug:            "home",
		Locale:          "bo",
		ResolvedLocale:  "bo",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/bo"},
	}
	resolution := &deliveryResolution{
		Mode:               "detail",
		Capability:         deliveryCapability{TypeSlug: "page", Kind: "page"},
		Record:             &record,
		RequestedLocale:    "bo",
		ResolvedLocale:     "bo",
		AvailableLocales:   []string{"en", "bo"},
		TemplateCandidates: []string{"site/page"},
	}

	server := router.NewHTTPServer()
	server.Router().Get("/bo", func(c router.Context) error {
		return runtime.renderResolution(c, state, resolution, "/bo", newSiteContentCache())
	})

	payload := performSiteRequest(t, server, "/bo?format=json")
	if got := nestedString(payload, "context", "module_record_title"); got != "Tibetan Home" {
		t.Fatalf("expected modules to see resolved record title, got %q payload=%+v", got, payload)
	}
	if got := nestedString(payload, "context", "module_resolved_locale"); got != "bo" {
		t.Fatalf("expected modules to see resolved locale bo, got %q payload=%+v", got, payload)
	}
}
