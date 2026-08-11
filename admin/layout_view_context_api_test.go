package admin

import (
	"context"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestEnrichLayoutViewContextIncludesAssetBasePath(t *testing.T) {
	view := EnrichLayoutViewContext(nil, nil, router.ViewContext{
		"base_path": "/admin",
	}, "")
	if got := view["asset_base_path"]; got != "/admin" {
		t.Fatalf("expected asset_base_path /admin, got %v", got)
	}
}

func TestEnrichLayoutViewContextPreservesActiveModule(t *testing.T) {
	view := EnrichLayoutViewContext(nil, nil, router.ViewContext{
		"base_path": "/admin",
	}, "users")
	if got := view["active"]; got != "users" {
		t.Fatalf("expected active users, got %v", got)
	}
}

func TestEnrichLayoutViewContextProjectsThemeSelectedStructuralPartials(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{})
	adm.WithThemeProvider(func(context.Context, ThemeSelector) (*ThemeSelection, error) {
		return &ThemeSelection{Partials: map[string]string{
			AdminPartialPageBreadcrumbs: "themes/acme/breadcrumbs.html",
		}}, nil
	}).WithAdminTemplateLookup(AdminTemplateLookupFunc(func(identifier string) bool {
		return identifier == "themes/acme/breadcrumbs.html"
	}))

	view := EnrichLayoutViewContext(adm, nil, nil, "activity")
	partials := adminStructuralPartialsFromViewValue(view["admin_partials"])
	if partials.Breadcrumbs != "themes/acme/breadcrumbs.html" {
		t.Fatalf("expected module context to project selected structural partials, got %#v", view["admin_partials"])
	}
}

func TestEnrichLayoutViewContextIncludesTranslationCapabilities(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		FeatureGate: featureGateFromKeys(
			FeatureCMS,
			FeatureDashboard,
			FeatureTranslationExchange,
			FeatureTranslationQueue,
		),
	})

	view := EnrichLayoutViewContext(adm, nil, router.ViewContext{
		"base_path": "/admin",
	}, "")

	caps, ok := view["translation_capabilities"].(map[string]any)
	if !ok {
		t.Fatalf("expected translation_capabilities map, got %T", view["translation_capabilities"])
	}
	if profile := mustAs[string](caps["profile"]); profile != "full" {
		t.Fatalf("expected translation profile full, got %v", caps["profile"])
	}
	if schemaVersion := mustAs[int](caps["schema_version"]); schemaVersion != translationCapabilitiesSchemaVersionCurrent {
		t.Fatalf("expected schema version %d, got %v", translationCapabilitiesSchemaVersionCurrent, caps["schema_version"])
	}

	modules := mustAs[map[string]any](caps["modules"])
	exchange := mustAs[map[string]any](modules["exchange"])
	if enabled := mustAs[bool](exchange["enabled"]); !enabled {
		t.Fatalf("expected exchange module enabled")
	}
	queue := mustAs[map[string]any](modules["queue"])
	if enabled := mustAs[bool](queue["enabled"]); !enabled {
		t.Fatalf("expected queue module enabled")
	}

	routes := mustAs[map[string]string](caps["routes"])
	if strings.TrimSpace(routes["admin.translations.queue"]) == "" {
		t.Fatalf("expected admin.translations.queue route")
	}
	if strings.TrimSpace(routes["admin.translations.dashboard"]) == "" {
		t.Fatalf("expected admin.translations.dashboard route")
	}
	if strings.TrimSpace(routes["admin.translations.exchange"]) == "" {
		t.Fatalf("expected admin.translations.exchange route")
	}
}

func TestEnrichLayoutViewContextPreservesProvidedTranslationCapabilities(t *testing.T) {
	custom := map[string]any{
		"profile": "custom",
	}
	view := EnrichLayoutViewContext(nil, nil, router.ViewContext{
		"base_path":                "/admin",
		"translation_capabilities": custom,
	}, "")
	if got := mustAs[map[string]any](view["translation_capabilities"]); got["profile"] != "custom" {
		t.Fatalf("expected custom translation capabilities to be preserved, got %v", view["translation_capabilities"])
	}
}

func TestEnrichLayoutViewContextWithChromeClonesAndOverridesLegacyPageKeys(t *testing.T) {
	input := router.ViewContext{
		"base_path":       "/admin",
		"page_title":      "Legacy title",
		"page_subtitle":   "Legacy subtitle",
		"breadcrumbs":     []map[string]any{{"label": "Legacy"}},
		"active":          "legacy",
		"body_classes":    "legacy-body",
		"unrelated_value": "domain data",
	}
	chrome := AdminPageChrome{
		Header: AdminPageHeader{
			Title:       "Typed title",
			Pretitle:    "Workspace",
			Subtitle:    "Typed subtitle",
			Breadcrumbs: []AdminPageHeaderBreadcrumb{{Label: "Typed", Current: true}},
			Hooks:       map[string]string{"mount": `<section data-value="unsafe">`},
		},
		Active:      "typed",
		BodyClasses: "typed-body",
	}

	view := EnrichLayoutViewContextWithChrome(nil, nil, input, chrome)
	if view["page_title"] != "Typed title" || view["page_pretitle"] != "Workspace" ||
		view["page_subtitle"] != "Typed subtitle" || view["active"] != "typed" ||
		view["body_classes"] != "typed-body" {
		t.Fatalf("typed page chrome did not win over legacy keys: %+v", view)
	}
	if view["unrelated_value"] != "domain data" {
		t.Fatalf("domain data was not preserved: %+v", view)
	}
	if input["page_title"] != "Legacy title" || input["active"] != "legacy" {
		t.Fatalf("typed enrichment mutated its caller map: %+v", input)
	}
	projected := mustAs[[]AdminPageHeaderBreadcrumb](view["breadcrumbs"])
	chrome.Header.Breadcrumbs[0].Label = "Mutated"
	if projected[0].Label != "Typed" {
		t.Fatalf("projected breadcrumbs alias the caller slice: %+v", projected)
	}
	hooks := mustAs[map[string]string](view["page_hooks"])
	if hooks["mount"] != `&lt;section data-value=&#34;unsafe&#34;&gt;` {
		t.Fatalf("expected hook identifiers to be escaped, got %+v", hooks)
	}
	projectedContext := chrome.TemplateContext()
	projectedHooks := mustAs[map[string]string](projectedContext["page_hooks"])
	if projectedHooks["mount"] != hooks["mount"] {
		t.Fatalf("public template projection diverged from enrichment: %+v", projectedContext)
	}
}

func TestEnrichLayoutViewContextWithChromeKeepsOptionalLegacyValues(t *testing.T) {
	view := EnrichLayoutViewContextWithChrome(nil, nil, router.ViewContext{
		"page_title":       "Legacy",
		"hide_page_header": true,
	}, AdminPageChrome{})
	if view["page_title"] != "Legacy" || view["hide_page_header"] != true {
		t.Fatalf("zero typed values must not erase compatibility page values: %+v", view)
	}
}
