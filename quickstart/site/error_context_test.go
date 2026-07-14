package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type errorContextTestModule struct {
	id            string
	normalCalls   int
	errorCalls    int
	observed      []SiteErrorRenderEvent
	panicObserver bool
}

type mutatingNestedErrorContextModule struct{}

func (*mutatingNestedErrorContextModule) ID() string                             { return "mutating-nested" }
func (*mutatingNestedErrorContextModule) RegisterRoutes(SiteModuleContext) error { return nil }
func (*mutatingNestedErrorContextModule) ViewContext(_ context.Context, in router.ViewContext) router.ViewContext {
	return in
}
func (*mutatingNestedErrorContextModule) ErrorViewContext(_ context.Context, _ SiteErrorContextRequest, in router.ViewContext) router.ViewContext {
	host := anyMap(in["host"])
	items, _ := host["items"].([]any)
	first := anyMap(items[0])
	first["label"] = "provider-mutated"
	host["added"] = true
	return in
}

func (m *errorContextTestModule) ID() string                             { return m.id }
func (m *errorContextTestModule) RegisterRoutes(SiteModuleContext) error { return nil }
func (m *errorContextTestModule) ViewContext(_ context.Context, in router.ViewContext) router.ViewContext {
	m.normalCalls++
	out := cloneViewContext(in)
	out["normal_"+m.id] = true
	return out
}
func (m *errorContextTestModule) ErrorViewContext(_ context.Context, _ SiteErrorContextRequest, in router.ViewContext) router.ViewContext {
	m.errorCalls++
	out := cloneSiteErrorViewContext(in)
	errorModel := cloneAnyMap(anyMap(out["site_error"]))
	errorModel["provider_"+m.id] = m.errorCalls
	out["site_error"] = errorModel
	return out
}
func (m *errorContextTestModule) ObserveSiteErrorRender(_ context.Context, event SiteErrorRenderEvent) {
	if m.panicObserver {
		panic("observer failure")
	}
	m.observed = append(m.observed, event)
}

func TestBuildSiteErrorViewContextRunsOnlyErrorProvidersInOrder(t *testing.T) {
	first := &errorContextTestModule{id: "first"}
	second := &errorContextTestModule{id: "second"}
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		BasePath:         "/site",
		SupportedLocales: []string{"en", "bo"},
		Modules:          []SiteModule{first, second},
	})
	base := applyRequestStateModuleViewContext(context.Background(), router.ViewContext{"seed": "safe"}, cfg.Modules)
	if first.normalCalls != 1 || second.normalCalls != 1 {
		t.Fatalf("normal modules should run once before error projection: %d %d", first.normalCalls, second.normalCalls)
	}

	got := buildSiteErrorViewContext(context.Background(), cfg, SiteErrorContextRequest{
		Error: SiteRuntimeError{Code: " Not_Found ", Status: 404, Message: "private"},
		State: RequestState{Locale: "bo", ViewContext: base},
	}, base)
	if first.normalCalls != 1 || second.normalCalls != 1 {
		t.Fatalf("error projection reran normal modules: %d %d", first.normalCalls, second.normalCalls)
	}
	if first.errorCalls != 1 || second.errorCalls != 1 {
		t.Fatalf("error providers should run once in order: %d %d", first.errorCalls, second.errorCalls)
	}
	model := anyMap(got["site_error"])
	if model["code"] != "not_found" || model["status"] != 404 || model["home_href"] != "/site/bo" {
		t.Fatalf("unexpected base site_error model: %#v", model)
	}
	if model["provider_first"] != 1 || model["provider_second"] != 1 {
		t.Fatalf("providers did not compose in order: %#v", model)
	}
	if _, exists := model["message"]; exists {
		t.Fatalf("base site_error must not expose arbitrary metadata: %#v", model)
	}
}

func TestBuildSiteErrorViewContextClonesProviderInputsAndOutputs(t *testing.T) {
	module := &errorContextTestModule{id: "clone"}
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{Modules: []SiteModule{module}})
	baseModel := map[string]any{"host": "value"}
	base := router.ViewContext{"site_error": baseModel, "supported_locales": []string{"en", "bo"}}

	got := buildSiteErrorViewContext(context.Background(), cfg, SiteErrorContextRequest{
		Error: SiteRuntimeError{Status: 500},
		State: RequestState{Locale: "en"},
	}, base)
	anyMap(got["site_error"])["mutated"] = true
	if _, exists := baseModel["mutated"]; exists {
		t.Fatalf("returned context mutated caller-owned nested map")
	}
	if _, exists := baseModel["provider_clone"]; exists {
		t.Fatalf("provider output mutated caller-owned nested map")
	}
}

func TestBuildSiteErrorViewContextRecursivelyIsolatesHostContainers(t *testing.T) {
	module := &mutatingNestedErrorContextModule{}
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{Modules: []SiteModule{module}})
	baseItem := map[string]any{"label": "original"}
	baseHost := map[string]any{"items": []any{baseItem}}
	base := router.ViewContext{"host": baseHost}

	got := buildSiteErrorViewContext(context.Background(), cfg, SiteErrorContextRequest{
		Error: SiteRuntimeError{Status: 500},
		State: RequestState{Locale: "en"},
	}, base)

	gotItems, _ := anyMap(got["host"])["items"].([]any)
	if gotLabel := anyString(anyMap(gotItems[0])["label"]); gotLabel != "provider-mutated" {
		t.Fatalf("expected provider mutation in returned context, got %q", gotLabel)
	}
	if baseItem["label"] != "original" {
		t.Fatalf("provider mutated caller-owned nested item: %#v", baseItem)
	}
	if _, exists := baseHost["added"]; exists {
		t.Fatalf("provider mutated caller-owned host map: %#v", baseHost)
	}

	anyMap(gotItems[0])["label"] = "caller-mutated"
	if baseItem["label"] != "original" {
		t.Fatalf("returned context retained caller-owned nested aliases: %#v", baseItem)
	}
}

func TestCompleteSiteErrorRequestStateMergesPreparedStateAndCallerOverlay(t *testing.T) {
	preparedNested := map[string]any{"label": "prepared"}
	prepared := RequestState{
		Locale:              "en",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en", "bo"},
		Environment:         "production",
		ContentChannel:      "published",
		AllowLocaleFallback: true,
		PreviewTokenPresent: true,
		PreviewTokenValid:   true,
		IsPreview:           true,
		PreviewToken:        "preview-secret",
		PreviewEntityType:   "pages",
		PreviewContentID:    "page-1",
		ThemeName:           "archive",
		ThemeVariant:        "default",
		Theme:               map[string]map[string]string{"default": {"name": "archive"}},
		SiteTheme:           map[string]any{"manifest_partials": map[string]string{"site.error.404_page": "templates/site/error/404.html"}},
		BasePath:            "/site",
		AssetBasePath:       "/site/assets",
		ActivePath:          "/site/missing",
		ViewContext: router.ViewContext{
			"prepared":   preparedNested,
			"shared_key": "prepared",
		},
	}
	ctx := router.NewMockContext()
	ctx.LocalsMock[requestStateLocalsKey] = prepared

	got := completeSiteErrorRequestState(ctx, ResolvedSiteConfig{}, RequestState{
		Locale: "bo",
		ViewContext: router.ViewContext{
			"caller":     true,
			"shared_key": "caller",
		},
	})

	if got.Locale != "bo" || got.DefaultLocale != "en" || got.Environment != "production" || got.ContentChannel != "published" {
		t.Fatalf("prepared scalar state not merged with caller locale: %+v", got)
	}
	if !got.AllowLocaleFallback || !got.PreviewTokenPresent || !got.PreviewTokenValid || !got.IsPreview || got.PreviewToken != "preview-secret" {
		t.Fatalf("prepared preview state not preserved: %+v", got)
	}
	if got.ThemeName != "archive" || got.ThemeVariant != "default" || got.AssetBasePath != "/site/assets" || got.ActivePath != "/site/missing" {
		t.Fatalf("prepared theme/path state not preserved: %+v", got)
	}
	if got.ViewContext["caller"] != true || got.ViewContext["shared_key"] != "caller" || anyMap(got.ViewContext["prepared"])["label"] != "prepared" {
		t.Fatalf("view context overlay did not preserve prepared values: %#v", got.ViewContext)
	}
	anyMap(got.ViewContext["prepared"])["label"] = "mutated"
	if preparedNested["label"] != "prepared" {
		t.Fatalf("merged request state retained prepared nested alias: %#v", preparedNested)
	}
}

func TestObserveSiteErrorRenderIsolatesObserverPanics(t *testing.T) {
	broken := &errorContextTestModule{id: "broken", panicObserver: true}
	healthy := &errorContextTestModule{id: "healthy"}
	event := SiteErrorRenderEvent{Code: "not_found", Status: 404, Template: "site/error", Outcome: "selected", Attempt: 1}
	observeSiteErrorRender(context.Background(), []SiteModule{broken, healthy}, event)
	if len(healthy.observed) != 1 || healthy.observed[0] != event {
		t.Fatalf("healthy observer should receive event after panic: %#v", healthy.observed)
	}
}
