package quickstart_test

import (
	"net/http"
	"path"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	quickstart "github.com/goliatone/go-admin/quickstart"
	quicksite "github.com/goliatone/go-admin/quickstart/site"
	router "github.com/goliatone/go-router"
	gotheme "github.com/goliatone/go-theme"
)

func TestHostRouterDownstreamAdoptionUsesExplicitFallbackAndSeparateThemes(t *testing.T) {
	cfg := quickstart.NewAdminConfig("/admin", "Downstream Host", "en")
	cfg.Theme = "admin-shell"
	cfg.ThemeVariant = "dark"
	adm, err := coreadmin.New(cfg, coreadmin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}

	adminSelector := newHostRouterTestThemeSelector(t, "admin-shell", "dark", "/admin/assets")
	siteSelector := newHostRouterTestThemeSelector(t, "archive-site", "sunrise", "/static/themes/archive-site")
	adm.WithAdminTheme(adminSelector)

	server := router.NewHTTPServer()
	host := quickstart.NewHostRouter(server.Router(), cfg)
	host.System().Get("/.well-known/app-info", jsonRouteHandler("system"))
	host.AdminUI().Get(path.Join(cfg.BasePath, "theme-probe"), func(c router.Context) error {
		return c.JSON(http.StatusOK, map[string]any{
			"theme": adm.ThemePayload(c.Context()),
		})
	})

	siteFallback := quicksite.ResolveSiteFallbackPolicy(quicksite.SiteFallbackPolicy{
		Mode:                quicksite.SiteFallbackModeExplicitPathsOnly,
		AllowedPathPrefixes: []string{"/stories"},
		ReservedPrefixes:    quicksite.SiteReservedPrefixesForAdminConfig(cfg),
	})
	siteCfg := quicksite.SiteConfig{
		DefaultLocale:    "en",
		SupportedLocales: []string{"en"},
		Search: quicksite.SiteSearchConfig{
			Route:    quicksite.DefaultSearchRoute,
			Endpoint: quicksite.DefaultSiteSearchEndpointForAdminConfig(cfg),
		},
		Features: quicksite.SiteFeatures{
			EnableSearch: new(true),
			EnableTheme:  new(true),
			EnableI18N:   new(false),
		},
		Theme: quicksite.SiteThemeConfig{
			Name:    "archive-site",
			Variant: "sunrise",
		},
		Fallback: siteFallback,
	}

	if err := quicksite.RegisterSiteRoutes(
		host.PublicSite(),
		adm,
		cfg,
		siteCfg,
		quicksite.WithFallbackPolicy(siteFallback),
		quicksite.WithSearchProvider(hostRouterSearchProviderStub{}),
		quicksite.WithSiteTheme(siteSelector),
		quicksite.WithContentHandler(jsonRouteHandler("site")),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	server.Init()

	adminProbe, code, body := performHostRouterRequest(t, server, http.MethodGet, "/admin/theme-probe")
	if code != http.StatusOK {
		t.Fatalf("expected admin theme probe 200, got %d body=%s", code, body)
	}
	theme, ok := adminProbe["theme"].(map[string]any)
	if !ok {
		t.Fatalf("expected admin theme payload, got %+v", adminProbe)
	}
	selection, ok := theme["selection"].(map[string]any)
	if !ok || selection["name"] != "admin-shell" || selection["variant"] != "dark" {
		t.Fatalf("expected admin theme selection admin-shell/dark, got %+v", theme["selection"])
	}
	assets, ok := theme["assets"].(map[string]any)
	if !ok || assets["prefix"] != "/admin/assets" {
		t.Fatalf("expected admin asset prefix /admin/assets, got %+v", theme["assets"])
	}

	siteSearch, code, body := performHostRouterRequest(t, server, http.MethodGet, quicksite.DefaultSearchRoute+"?format=json")
	if code != http.StatusOK {
		t.Fatalf("expected site search 200, got %d body=%s", code, body)
	}
	contextPayload, ok := siteSearch["context"].(map[string]any)
	if !ok {
		t.Fatalf("expected site search context payload, got %+v", siteSearch)
	}
	siteTheme, ok := contextPayload["site_theme"].(map[string]any)
	if !ok {
		t.Fatalf("expected site theme payload, got %+v", contextPayload["site_theme"])
	}
	if siteTheme["name"] != "archive-site" || siteTheme["variant"] != "sunrise" {
		t.Fatalf("expected site theme archive-site/sunrise, got %+v", siteTheme)
	}
	if siteTheme["asset_prefix"] != "/static/themes/archive-site" {
		t.Fatalf("expected site asset prefix /static/themes/archive-site, got %+v", siteTheme)
	}

	assertJSONHandler(t, server, http.MethodGet, "/stories/refuge", http.StatusOK, "site")
	assertStatusCode(t, server, http.MethodGet, "/posts/refuge", http.StatusNotFound)
	assertJSONHandler(t, server, http.MethodGet, "/.well-known/app-info", http.StatusOK, "system")
}

func newHostRouterTestThemeSelector(t *testing.T, name, variant, assetPrefix string) gotheme.ThemeSelector {
	t.Helper()

	registry := gotheme.NewRegistry()
	if err := registry.Register(&gotheme.Manifest{
		Name:    name,
		Version: "1.0.0",
		Assets: gotheme.Assets{
			Prefix: assetPrefix,
			Files: map[string]string{
				"logo": "logo.svg",
			},
		},
		Variants: map[string]gotheme.Variant{
			variant: {
				Assets: gotheme.Assets{
					Prefix: assetPrefix,
					Files: map[string]string{
						"logo": "logo.svg",
					},
				},
			},
		},
	}); err != nil {
		t.Fatalf("register theme manifest: %v", err)
	}

	return gotheme.Selector{
		Registry:       registry,
		DefaultTheme:   name,
		DefaultVariant: variant,
	}
}
