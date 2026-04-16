package admin

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin/routing"
	urlkit "github.com/goliatone/go-urlkit"
)

func TestNormalizeURLConfigDefaults(t *testing.T) {
	cfg := normalizeURLConfig(URLConfig{}, "/admin/")

	if cfg.Admin.BasePath != "/admin" {
		t.Fatalf("expected admin base path /admin, got %q", cfg.Admin.BasePath)
	}
	if cfg.Admin.APIPrefix != "api" {
		t.Fatalf("expected admin api prefix default, got %q", cfg.Admin.APIPrefix)
	}
	if cfg.Admin.APIVersion != "" {
		t.Fatalf("expected admin api version default empty, got %q", cfg.Admin.APIVersion)
	}
	if cfg.Public.BasePath != "" {
		t.Fatalf("expected public base path empty, got %q", cfg.Public.BasePath)
	}
	if cfg.Public.APIPrefix != "api" {
		t.Fatalf("expected public api prefix default, got %q", cfg.Public.APIPrefix)
	}
	if cfg.Public.APIVersion != "v1" {
		t.Fatalf("expected public api version default v1, got %q", cfg.Public.APIVersion)
	}
}

func TestNormalizeURLConfigAdminOverridesDefaults(t *testing.T) {
	cfg := normalizeURLConfig(URLConfig{
		Admin: URLNamespaceConfig{
			APIPrefix:  "admin-api",
			APIVersion: "v9",
		},
	}, "/admin")

	if cfg.Admin.APIPrefix != "admin-api" {
		t.Fatalf("expected admin api prefix override, got %q", cfg.Admin.APIPrefix)
	}
	if cfg.Admin.APIVersion != "v9" {
		t.Fatalf("expected admin api version override, got %q", cfg.Admin.APIVersion)
	}
	if cfg.Public.APIVersion != "v1" {
		t.Fatalf("expected public api version default v1, got %q", cfg.Public.APIVersion)
	}
}

func TestNormalizeURLConfigKeepsURLKit(t *testing.T) {
	custom := &urlkit.Config{Groups: []urlkit.GroupConfig{{Name: "custom"}}}
	cfg := normalizeURLConfig(URLConfig{URLKit: custom}, "/admin")

	if cfg.URLKit != custom {
		t.Fatalf("expected URLKit config to be preserved")
	}
}

func TestDefaultURLKitConfigPaths(t *testing.T) {
	cfg := applyConfigDefaults(Config{BasePath: "/admin"})
	manager, err := newURLManager(cfg)
	if err != nil {
		t.Fatalf("newURLManager: %v", err)
	}

	adminErrors, err := manager.Resolve("admin.api", "errors", nil, nil)
	if err != nil {
		t.Fatalf("resolve admin.api errors: %v", err)
	}
	if adminErrors != "/admin/api/errors" {
		t.Fatalf("expected /admin/api/errors, got %q", adminErrors)
	}

	publicPreview, err := manager.Resolve("public.api.v1", "preview", urlkit.Params{"token": "token"}, nil)
	if err != nil {
		t.Fatalf("resolve public.api.v1 preview: %v", err)
	}
	if publicPreview != "/api/v1/preview/token" {
		t.Fatalf("expected /api/v1/preview/token, got %q", publicPreview)
	}
	siteMenuByLocation, err := manager.Resolve("public.api.v1", SiteRouteMenuByLocation, urlkit.Params{"location": "site.main"}, nil)
	if err != nil {
		t.Fatalf("resolve public.api.v1 site.menus.location: %v", err)
	}
	if siteMenuByLocation != "/api/v1/site/menus/site.main" {
		t.Fatalf("expected /api/v1/site/menus/site.main, got %q", siteMenuByLocation)
	}
	siteMenuByCode, err := manager.Resolve("public.api.v1", SiteRouteMenuByCode, urlkit.Params{"code": "primary"}, nil)
	if err != nil {
		t.Fatalf("resolve public.api.v1 site.menus.code: %v", err)
	}
	if siteMenuByCode != "/api/v1/site/menus/code/primary" {
		t.Fatalf("expected /api/v1/site/menus/code/primary, got %q", siteMenuByCode)
	}

	panelSubresource, err := manager.Resolve("admin.api", "panel.subresource", urlkit.Params{
		"panel":       "agreements",
		"id":          "agreement-1",
		"subresource": "artifact",
		"value":       "executed",
	}, nil)
	if err != nil {
		t.Fatalf("resolve admin.api panel.subresource: %v", err)
	}
	if panelSubresource != "/admin/api/panels/agreements/agreement-1/artifact/executed" {
		t.Fatalf("expected panel subresource path, got %q", panelSubresource)
	}

	translationsQueue, err := manager.Resolve("admin", "translations.queue", nil, nil)
	if err != nil {
		t.Fatalf("resolve admin translations.queue: %v", err)
	}
	if translationsQueue != "/admin/content/translations" {
		t.Fatalf("expected /admin/content/translations, got %q", translationsQueue)
	}

	translationsDashboard, err := manager.Resolve("admin", "translations.dashboard", nil, nil)
	if err != nil {
		t.Fatalf("resolve admin translations.dashboard: %v", err)
	}
	if translationsDashboard != "/admin/translations/dashboard" {
		t.Fatalf("expected /admin/translations/dashboard, got %q", translationsDashboard)
	}

	translationsDashboardAPI, err := manager.Resolve("admin.api", "translations.dashboard", nil, nil)
	if err != nil {
		t.Fatalf("resolve admin.api translations.dashboard: %v", err)
	}
	if translationsDashboardAPI != "/admin/api/translations/dashboard" {
		t.Fatalf("expected /admin/api/translations/dashboard, got %q", translationsDashboardAPI)
	}
}

func TestRegisterPanelSyncsCanonicalUIRoutesIntoURLManager(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	factory := NewDynamicPanelFactory(adm)
	if _, err := factory.CreatePanelFromContentType(context.Background(), &CMSContentType{
		ID:     "ct-quotes",
		Name:   "Quote",
		Slug:   "quote",
		Status: "active",
		Schema: minimalContentTypeSchema(),
		Capabilities: map[string]any{
			"panel_slug": "quotes",
		},
	}); err != nil {
		t.Fatalf("create quotes panel: %v", err)
	}

	listPath, err := adm.URLs().Resolve("admin", "quotes", nil, nil)
	if err != nil {
		t.Fatalf("resolve quotes route: %v", err)
	}
	if listPath != "/admin/quotes" {
		t.Fatalf("expected /admin/quotes, got %q", listPath)
	}

	detailPath, err := adm.URLs().Resolve("admin", "quotes.id", urlkit.Params{"id": "quote-1"}, nil)
	if err != nil {
		t.Fatalf("resolve quotes detail route: %v", err)
	}
	if detailPath != "/admin/quotes/quote-1" {
		t.Fatalf("expected /admin/quotes/quote-1, got %q", detailPath)
	}
}

func TestDefaultURLKitConfigUsesRoutingRootOverrides(t *testing.T) {
	cfg := applyConfigDefaults(Config{
		BasePath: "/admin",
		Routing: routing.Config{
			Roots: routing.RootsConfig{
				AdminRoot:     "/control",
				APIRoot:       "/api",
				PublicAPIRoot: "/site/api/v2",
			},
		},
	})
	manager, err := newURLManager(cfg)
	if err != nil {
		t.Fatalf("newURLManager: %v", err)
	}

	adminDashboard, err := manager.Resolve("admin", "dashboard", nil, nil)
	if err != nil {
		t.Fatalf("resolve admin dashboard: %v", err)
	}
	if adminDashboard != "/control/" {
		t.Fatalf("expected /control/, got %q", adminDashboard)
	}

	adminErrors, err := manager.Resolve(adminAPIGroupName(cfg), "errors", nil, nil)
	if err != nil {
		t.Fatalf("resolve %s errors: %v", adminAPIGroupName(cfg), err)
	}
	if adminErrors != "/api/errors" {
		t.Fatalf("expected /api/errors, got %q", adminErrors)
	}

	publicPreview, err := manager.Resolve(publicAPIGroupName(cfg), "preview", urlkit.Params{"token": "token"}, nil)
	if err != nil {
		t.Fatalf("resolve %s preview: %v", publicAPIGroupName(cfg), err)
	}
	if publicPreview != "/site/api/v2/preview/token" {
		t.Fatalf("expected /site/api/v2/preview/token, got %q", publicPreview)
	}
}

func TestNewURLManagerBackfillsMediaRoutesWhenFeatureEnabled(t *testing.T) {
	cfg := applyConfigDefaults(Config{BasePath: "/admin"})
	custom := defaultURLKitConfig(cfg)
	if len(custom.Groups) == 0 || len(custom.Groups[0].Groups) == 0 {
		t.Fatalf("expected default URLKit config to include admin api group")
	}
	delete(custom.Groups[0].Groups[0].Routes, "media.capabilities")
	cfg.URLs.URLKit = custom

	manager, err := newURLManager(cfg, true)
	if err != nil {
		t.Fatalf("newURLManager: %v", err)
	}
	got, resolveErr := manager.Resolve("admin.api", "media.capabilities", nil, nil)
	if resolveErr != nil {
		t.Fatalf("resolve admin.api media.capabilities: %v", resolveErr)
	}
	if got != "/admin/api/media/capabilities" {
		t.Fatalf("expected /admin/api/media/capabilities, got %q", got)
	}
}

func TestDefaultURLKitConfigSupportsVersionedAdminAPIGroup(t *testing.T) {
	cfg := applyConfigDefaults(Config{
		BasePath: "/admin",
		URLs: URLConfig{
			Admin: URLNamespaceConfig{
				APIVersion: "v2",
			},
		},
	})
	manager, err := newURLManager(cfg)
	if err != nil {
		t.Fatalf("newURLManager: %v", err)
	}

	group := adminAPIGroupName(cfg)
	if group != "admin.api.v2" {
		t.Fatalf("expected admin api group admin.api.v2, got %q", group)
	}

	adminErrors, err := manager.Resolve(group, "errors", nil, nil)
	if err != nil {
		t.Fatalf("resolve %s errors: %v", group, err)
	}
	if adminErrors != "/admin/api/v2/errors" {
		t.Fatalf("expected /admin/api/v2/errors, got %q", adminErrors)
	}
}

func TestDefaultAdminAPIRoutesPanelTemplatesAreNamespaced(t *testing.T) {
	routes := defaultAdminAPIRoutes()

	expected := map[string]string{
		"panel":             "/panels/:panel",
		"panel.id":          "/panels/:panel/:id",
		"panel.action":      "/panels/:panel/actions/:action",
		"panel.bulk.state":  "/panels/:panel/bulk-actions/state",
		"panel.bulk":        "/panels/:panel/bulk/:action",
		"panel.preview":     "/panels/:panel/:id/preview",
		"panel.subresource": "/panels/:panel/:id/:subresource/:value",
	}

	for key, want := range expected {
		got, ok := routes[key]
		if !ok {
			t.Fatalf("expected route key %q to exist", key)
		}
		if got != want {
			t.Fatalf("route %q: expected %q, got %q", key, want, got)
		}
	}
}

func TestDefaultURLKitConfigMenuBuilderPaths(t *testing.T) {
	cfg := applyConfigDefaults(Config{BasePath: "/admin"})
	manager, err := newURLManager(cfg)
	if err != nil {
		t.Fatalf("newURLManager: %v", err)
	}

	resolved := map[string]string{
		"menus":                      "/admin/api/menus",
		"menus.contracts":            "/admin/api/menu-contracts",
		"menus.id":                   "/admin/api/menus/primary",
		"menus.publish":              "/admin/api/menus/primary/publish",
		"menus.unpublish":            "/admin/api/menus/primary/unpublish",
		"menus.items":                "/admin/api/menus/primary/items",
		"menus.preview":              "/admin/api/menus/primary/preview",
		"menus.clone":                "/admin/api/menus/primary/clone",
		"menus.archive":              "/admin/api/menus/primary/archive",
		"menu.bindings":              "/admin/api/menu-bindings",
		"menu.bindings.location":     "/admin/api/menu-bindings/site.main",
		"menu.view_profiles":         "/admin/api/menu-view-profiles",
		"menu.view_profiles.code":    "/admin/api/menu-view-profiles/footer",
		"menu.view_profiles.publish": "/admin/api/menu-view-profiles/footer/publish",
	}

	for key, want := range resolved {
		params := map[string]string{}
		switch key {
		case "menus.id", "menus.publish", "menus.unpublish", "menus.items", "menus.preview", "menus.clone", "menus.archive":
			params["id"] = "primary"
		case "menu.bindings.location":
			params["location"] = "site.main"
		case "menu.view_profiles.code", "menu.view_profiles.publish":
			params["code"] = "footer"
		}
		got, resolveErr := manager.ResolveWith("admin.api", key, params, nil)
		if resolveErr != nil {
			t.Fatalf("resolve admin.api %s: %v", key, resolveErr)
		}
		if got != want {
			t.Fatalf("expected %s path %q, got %q", key, want, got)
		}
	}
}

func TestDefaultURLKitConfigContentNavigationPath(t *testing.T) {
	cfg := applyConfigDefaults(Config{BasePath: "/admin"})
	manager, err := newURLManager(cfg)
	if err != nil {
		t.Fatalf("newURLManager: %v", err)
	}
	got, resolveErr := manager.ResolveWith("admin.api", "content.navigation", map[string]string{
		"type": "page",
		"id":   "home-1",
	}, nil)
	if resolveErr != nil {
		t.Fatalf("resolve admin.api content.navigation: %v", resolveErr)
	}
	if got != "/admin/api/content/page/home-1/navigation" {
		t.Fatalf("expected content navigation path, got %q", got)
	}
}
