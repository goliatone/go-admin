package site

import (
	"context"
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	client "github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
	gotheme "github.com/goliatone/go-theme"
)

func TestQuickstartSiteThemeSelectionProjectsSiteThemeContract(t *testing.T) {
	themeFS, selector := mustTempSiteThemeFixture(t, map[string]string{
		"templates/site/base.html":            `<html><head>{% if site_theme and site_theme.bundle_urls and site_theme.bundle_urls.site_css %}<link rel="stylesheet" href="{{ site_theme.bundle_urls.site_css }}">{% endif %}<style>{% if site_theme and site_theme.css_vars_style %}{{ site_theme.css_vars_style|safe }}{% endif %}--site-color-primary: {{ site_theme.shell_vars.site_color_primary }};--site-color-surface: {{ site_theme.shell_vars.site_color_surface }};</style></head><body data-theme-base="true">{% block content %}{% endblock %}{% if site_theme and site_theme.bundle_urls and site_theme.bundle_urls.site_js %}<script defer src="{{ site_theme.bundle_urls.site_js }}"></script>{% endif %}</body></html>`,
		"templates/site/partials/header.html": `<header data-theme-header="true">Themed header</header>`,
		"templates/site/home/page.html":       `<section data-theme-home="true">Themed home page</section>`,
		"templates/site/search/page.html":     `<section data-theme-search="true">Themed search page</section>`,
	})
	adm := mustAdminWithTheme(t, "admin", "light")
	adm.WithAdminTheme(mustAdminThemeSelector(t, "admin", "light"))

	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Views: SiteViewConfig{
			TemplateFS: []fs.FS{themeFS},
		},
		Features: SiteFeatures{
			EnableTheme:  new(true),
			EnableSearch: new(true),
		},
		Theme: SiteThemeConfig{
			Name:    "garchen-archive-site",
			Variant: "dark",
		},
	}, WithSearchProvider(&recordingSiteSearchProvider{}), WithSiteTheme(selector)); err != nil {
		t.Fatalf("register themed site routes: %v", err)
	}

	payload := performSiteRequestWithContext(t, server, "/search?format=json", context.Background(), 200)
	if nestedString(payload, "context", "site_theme", "name") != "garchen-archive-site" {
		t.Fatalf("expected site_theme name in response payload, got %+v", nestedAny(payload, "context", "site_theme"))
	}
	if nestedString(payload, "context", "site_theme", "variant") != "dark" {
		t.Fatalf("expected site_theme variant in response payload, got %+v", nestedAny(payload, "context", "site_theme"))
	}
	if nestedString(payload, "context", "site_theme", "bundle_urls", "site_css") != "/static/themes/garchen-archive-site/static/site.css" {
		t.Fatalf("expected resolved site.css URL, got %+v", nestedAny(payload, "context", "site_theme"))
	}
	if nestedString(payload, "context", "site_theme", "partials", "header") != "site/partials/header.html" {
		t.Fatalf("expected aliased header partial in site_theme contract, got %+v", nestedAny(payload, "context", "site_theme"))
	}
	if nestedString(payload, "context", "site_theme", "partials", "home_page") != "site/home/page.html" {
		t.Fatalf("expected aliased home_page partial in site_theme contract, got %+v", nestedAny(payload, "context", "site_theme"))
	}
	if nestedString(payload, "context", "site_theme", "partials", "search_page") != "site/search/page.html" {
		t.Fatalf("expected aliased search_page partial in site_theme contract, got %+v", nestedAny(payload, "context", "site_theme"))
	}
	if nestedString(payload, "context", "site_theme", "css_vars", "--color-bg-primary") != "#0f172a" {
		t.Fatalf("expected merged CSS vars in site_theme contract, got %+v", nestedAny(payload, "context", "site_theme"))
	}
	if nestedString(payload, "context", "site_theme", "shell_vars", "site_color_primary") != "#c2410c" {
		t.Fatalf("expected site shell primary var in site_theme contract, got %+v", nestedAny(payload, "context", "site_theme"))
	}
	if nestedString(payload, "context", "site_theme", "shell_vars", "site_color_surface") != "#0f172a" {
		t.Fatalf("expected site shell surface var in site_theme contract, got %+v", nestedAny(payload, "context", "site_theme"))
	}

	body := renderSiteTemplateForTest(t, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Views: SiteViewConfig{TemplateFS: []fs.FS{themeFS}},
	}, "site/search", mapFromNestedAny(payload["context"]))
	if !strings.Contains(body, `data-theme-base="true"`) {
		t.Fatalf("expected themed base template render, got %s", body)
	}
	if !strings.Contains(body, `data-theme-search="true"`) {
		t.Fatalf("expected themed search partial render, got %s", body)
	}
	if !strings.Contains(body, `/static/themes/garchen-archive-site/static/site.css`) {
		t.Fatalf("expected themed bundle include, got %s", body)
	}
	if !strings.Contains(body, `/static/themes/garchen-archive-site/static/site.js`) {
		t.Fatalf("expected themed site.js include, got %s", body)
	}
	if !strings.Contains(body, `--site-color-primary: #c2410c;`) {
		t.Fatalf("expected site shell primary compatibility var, got %s", body)
	}
	if !strings.Contains(body, `--site-color-surface: #0f172a;`) {
		t.Fatalf("expected site shell surface compatibility var, got %s", body)
	}
}

func TestQuickstartSiteThemeFallbackUsesBuiltInTemplatesWhenOptionalKeysMissing(t *testing.T) {
	themeFS, selector := mustTempSiteThemeFixture(t, nil)
	adm := mustAdminWithTheme(t, "admin", "light")
	adm.WithAdminTheme(mustAdminThemeSelector(t, "admin", "light"))

	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Views: SiteViewConfig{
			TemplateFS: []fs.FS{themeFS},
		},
		Features: SiteFeatures{
			EnableTheme:  new(true),
			EnableSearch: new(true),
		},
		Theme: SiteThemeConfig{
			Name:    "garchen-archive-site",
			Variant: "dark",
		},
	}, WithSearchProvider(&recordingSiteSearchProvider{}), WithSiteTheme(selector)); err != nil {
		t.Fatalf("register fallback site routes: %v", err)
	}

	payload := performSiteRequestWithContext(t, server, "/search?format=json", context.Background(), 200)
	body := renderSiteTemplateForTest(t, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Views: SiteViewConfig{TemplateFS: []fs.FS{themeFS}},
	}, "site/search", mapFromNestedAny(payload["context"]))
	if !strings.Contains(body, "Site Search") {
		t.Fatalf("expected built-in search template fallback, got %s", body)
	}
	if !strings.Contains(body, `/assets/dist/runtime/site-runtime.js`) {
		t.Fatalf("expected built-in runtime asset include, got %s", body)
	}
	if strings.Contains(body, `data-theme-search="true"`) {
		t.Fatalf("expected no themed search override marker, got %s", body)
	}
}

func TestQuickstartSiteThemeProviderIsolatedFromAdminTheme(t *testing.T) {
	themeFS, siteSelector := mustTempSiteThemeFixture(t, map[string]string{
		"templates/site/base.html":        `<html><body>{% block content %}{% endblock %}</body></html>`,
		"templates/site/search/page.html": `<section data-site-theme="true">Search</section>`,
	})
	adm := mustAdminWithTheme(t, "admin", "light")
	adm.WithAdminTheme(mustAdminThemeSelector(t, "admin", "light"))

	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Views: SiteViewConfig{
			TemplateFS: []fs.FS{themeFS},
		},
		Features: SiteFeatures{
			EnableTheme:  new(true),
			EnableSearch: new(true),
		},
		Theme: SiteThemeConfig{
			Name:    "garchen-archive-site",
			Variant: "dark",
		},
	}, WithSearchProvider(&recordingSiteSearchProvider{}), WithSiteTheme(siteSelector)); err != nil {
		t.Fatalf("register isolated themed site routes: %v", err)
	}

	payload := performSiteRequestWithContext(t, server, "/search?format=json", context.Background(), 200)
	if nestedString(payload, "context", "site_theme", "bundle_urls", "site_css") != "/static/themes/garchen-archive-site/static/site.css" {
		t.Fatalf("expected site bundle URL from site selector, got %+v", nestedAny(payload, "context", "site_theme"))
	}
	if nestedString(payload, "context", "site_theme", "asset_prefix") != "/static/themes/garchen-archive-site" {
		t.Fatalf("expected site asset prefix from site selector, got %+v", nestedAny(payload, "context", "site_theme"))
	}

	adminTheme := adm.ThemePayload(context.Background())
	if adminTheme["selection"]["name"] != "admin" || adminTheme["selection"]["variant"] != "light" {
		t.Fatalf("expected admin theme to stay on admin/light, got %+v", adminTheme["selection"])
	}
	if adminTheme["assets"]["prefix"] != "/admin/assets" {
		t.Fatalf("expected admin assets prefix to stay isolated, got %+v", adminTheme["assets"])
	}
}

func TestSiteThemeRequestOverridesStayScopedToSiteRoutes(t *testing.T) {
	_, siteSelector := mustTempSiteThemeFixture(t, nil)
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Features: SiteFeatures{
			EnableTheme: new(true),
		},
		Theme: SiteThemeConfig{
			Name:    "garchen-archive-site",
			Variant: "dark",
		},
		ThemeProvider: ThemeProviderFromSelector(siteSelector),
	})

	ctx := router.NewMockContext()
	ctx.QueriesM["variant"] = "dark"

	requestCtx, payload, _, _ := resolveRequestTheme(ctx, context.Background(), siteCfg, "preview")
	if selection := SiteThemeSelectorFromContext(requestCtx); selection.Name != "garchen-archive-site" || selection.Variant != "dark" {
		t.Fatalf("expected site selector on request context, got %+v", selection)
	}
	if selection := admin.ThemeSelectorFromContext(requestCtx); selection.Name != "" || selection.Variant != "" {
		t.Fatalf("expected admin selector to stay empty for site request override, got %+v", selection)
	}
	if payload["selection"]["name"] != "garchen-archive-site" || payload["selection"]["variant"] != "dark" {
		t.Fatalf("expected site payload selection, got %+v", payload)
	}
}

func TestSiteThemeProviderReceivesStructuredSiteThemeRequest(t *testing.T) {
	requests := make([]SiteThemeRequest, 0, 2)
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Features: SiteFeatures{
			EnableTheme: new(true),
		},
		Theme: SiteThemeConfig{
			Name:                        "docs",
			Variant:                     "light",
			AllowRequestNameOverride:    new(true),
			AllowRequestVariantOverride: new(false),
		},
		ThemeProvider: func(ctx context.Context, request SiteThemeRequest) (*admin.ThemeSelection, error) {
			requests = append(requests, request)
			if selection := SiteThemeSelectorFromContext(ctx); selection.Name != "custom" || selection.Variant != "light" {
				t.Fatalf("expected site selector on context, got %+v", selection)
			}
			return &admin.ThemeSelection{Name: request.Selector.Name, Variant: request.Selector.Variant}, nil
		},
	})

	ctx := router.NewMockContext()
	ctx.QueriesM["theme"] = "custom"
	ctx.QueriesM["variant"] = "dark"

	_, payload, name, variant := resolveRequestTheme(ctx, context.Background(), siteCfg, "preview")
	if name != "custom" || variant != "light" {
		t.Fatalf("expected structured request provider to resolve custom/light, got %q/%q", name, variant)
	}
	if payload["selection"]["name"] != "custom" || payload["selection"]["variant"] != "light" {
		t.Fatalf("expected payload to reflect structured provider selection, got %+v", payload)
	}
	if len(requests) != 2 {
		t.Fatalf("expected fallback + requested resolution provider calls, got %+v", requests)
	}
	if requests[0].Configured.Name != "docs" || requests[0].Configured.Variant != "light" {
		t.Fatalf("expected configured selector docs/light, got %+v", requests[0].Configured)
	}
	if requests[0].Requested.Name != "custom" || requests[0].Requested.Variant != "dark" {
		t.Fatalf("expected raw requested selector custom/dark on fallback call, got %+v", requests[0].Requested)
	}
	if requests[0].Selector.Name != "docs" || requests[0].Selector.Variant != "light" {
		t.Fatalf("expected fallback resolution to probe configured selector first, got %+v", requests[0].Selector)
	}
	if requests[1].Selector.Name != "custom" || requests[1].Selector.Variant != "light" {
		t.Fatalf("expected effective selector custom/light after policy filtering, got %+v", requests[1].Selector)
	}
}

func TestQuickstartSiteThemeCanExplicitlyShareAdminThemeSelector(t *testing.T) {
	themeFS, sharedSelector := mustTempSiteThemeFixture(t, map[string]string{
		"templates/site/base.html":        `<html><body>{% block content %}{% endblock %}</body></html>`,
		"templates/site/search/page.html": `<section data-shared-theme="true">Shared</section>`,
	})
	adm := mustAdminWithTheme(t, "garchen-archive-site", "dark")
	adm.WithAdminTheme(sharedSelector)

	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Views: SiteViewConfig{
			TemplateFS: []fs.FS{themeFS},
		},
		Features: SiteFeatures{
			EnableTheme:  new(true),
			EnableSearch: new(true),
		},
		Theme: SiteThemeConfig{
			Name:    "garchen-archive-site",
			Variant: "dark",
		},
	}, WithSearchProvider(&recordingSiteSearchProvider{}), WithSiteTheme(sharedSelector)); err != nil {
		t.Fatalf("register shared themed site routes: %v", err)
	}

	payload := performSiteRequestWithContext(t, server, "/search?format=json", context.Background(), 200)
	if nestedString(payload, "context", "site_theme", "name") != "garchen-archive-site" {
		t.Fatalf("expected shared site theme name, got %+v", nestedAny(payload, "context", "site_theme"))
	}
	adminTheme := adm.ThemePayload(context.Background())
	if adminTheme["selection"]["name"] != "garchen-archive-site" || adminTheme["selection"]["variant"] != "dark" {
		t.Fatalf("expected explicit shared admin/site theme policy, got %+v", adminTheme["selection"])
	}
}

func TestQuickstartSiteThemeHomepageTemplateWinsAtRoot(t *testing.T) {
	themeFS, selector := mustTempSiteThemeFixture(t, map[string]string{
		"templates/site/base.html":               `<html><body>{% block content %}{% endblock %}</body></html>`,
		"templates/site/home/page.html":          `<section data-theme-homepage="true">{% include "site/home/sections/hero.html" %}{% include "site/home/sections/news.html" %}</section>`,
		"templates/site/home/sections/hero.html": `<div data-theme-home-hero="true">Hero</div>`,
		"templates/site/home/sections/news.html": `<div data-theme-home-news="true">News</div>`,
		"templates/site/content/detail.html":     `<section data-detail-fallback="true">Detail fallback</section>`,
	})
	adm := mustAdminWithTheme(t, "admin", "light")
	content := admin.NewInMemoryContentService()

	_, err := content.CreateContentType(t.Context(), admin.CMSContentType{
		ID:          "page-type",
		Name:        "Page",
		Slug:        "page",
		Environment: "default",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "page",
				"templates": map[string]any{
					"detail": "site/content/detail",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("create content type: %v", err)
	}
	_, err = content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "page-home",
		Title:           "Home",
		Slug:            "home",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"path":    "/",
			"summary": "Homepage summary",
			"content": "<p>Homepage body</p>",
		},
	})
	if err != nil {
		t.Fatalf("create home page: %v", err)
	}

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en"},
		Views: SiteViewConfig{
			TemplateFS: []fs.FS{
				LabelTemplateFS(themeFS, "garchen-archive-site", TemplateSourcePackagedTheme),
			},
		},
		Features: SiteFeatures{
			EnableTheme: new(true),
		},
		Theme: SiteThemeConfig{
			Name:    "garchen-archive-site",
			Variant: "dark",
		},
	}, WithDeliveryServices(content, content), WithSiteTheme(selector)); err != nil {
		t.Fatalf("register themed homepage routes: %v", err)
	}

	payload := performSiteRequestWithContext(t, server, "/?format=json", context.Background(), http.StatusOK)
	if nestedString(payload, "template") != "site/home/page" {
		t.Fatalf("expected homepage template payload, got %+v", payload)
	}
	if nestedString(payload, "mode") != "homepage" {
		t.Fatalf("expected homepage mode, got %+v", payload)
	}

	html := renderSiteTemplateForTest(t, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Views: SiteViewConfig{
			TemplateFS: []fs.FS{
				LabelTemplateFS(themeFS, "garchen-archive-site", TemplateSourcePackagedTheme),
			},
		},
	}, "site/home/page", mapFromNestedAny(payload["context"]))
	for _, snippet := range []string{
		`data-theme-homepage="true"`,
		`data-theme-home-hero="true"`,
		`data-theme-home-news="true"`,
	} {
		if !strings.Contains(html, snippet) {
			t.Fatalf("expected homepage html to contain %q, got %s", snippet, html)
		}
	}
	if strings.Contains(html, `data-detail-fallback="true"`) {
		t.Fatalf("expected homepage render to avoid detail fallback, got %s", html)
	}

	diagnostics := ResolveSiteThemeTemplateDiagnostics(mapFromNestedAny(nestedAny(payload, "context", "site_theme")), LabelTemplateFS(themeFS, "garchen-archive-site", TemplateSourcePackagedTheme), LabelTemplateFS(client.FS(), "go-admin-builtins", TemplateSourceBuiltIn))
	diag, ok := diagnostics[siteThemeTemplateKeyHomePage]
	if !ok || diag.Winner == nil || diag.Winner.Label != "garchen-archive-site" {
		t.Fatalf("expected packaged homepage diagnostics winner, got %+v", diagnostics)
	}
}

func mustTempSiteThemeFixture(t *testing.T, templateFiles map[string]string) (fs.FS, gotheme.ThemeSelector) {
	t.Helper()

	root := t.TempDir()
	for path, content := range templateFiles {
		fullPath := filepath.Join(root, filepath.FromSlash(path))
		if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
			t.Fatalf("mkdir %s: %v", fullPath, err)
		}
		if err := os.WriteFile(fullPath, []byte(content), 0o644); err != nil {
			t.Fatalf("write %s: %v", fullPath, err)
		}
	}

	manifest := &gotheme.Manifest{
		Name:    "garchen-archive-site",
		Version: "0.1.0",
		Tokens: map[string]string{
			"color-bg-primary":           "#fffffa",
			"color-text-primary":         "#1b1410",
			"color-brand-solid":          "#9a3412",
			"color-text-brand-secondary": "#f97316",
		},
		Assets: gotheme.Assets{
			Prefix: "/static/themes/garchen-archive-site",
			Files: map[string]string{
				"tokens.css": "static/tokens.css",
				"site.css":   "static/site.css",
				"site.js":    "static/site.js",
			},
		},
		Templates: map[string]string{},
		Variants: map[string]gotheme.Variant{
			"dark": {
				Tokens: map[string]string{
					"color-bg-primary":           "#0f172a",
					"color-text-primary":         "#f8fafc",
					"color-brand-solid":          "#c2410c",
					"color-text-brand-secondary": "#fdba74",
				},
			},
		},
	}
	if _, ok := templateFiles["templates/site/base.html"]; ok {
		manifest.Templates[siteThemeTemplateKeyBase] = "templates/site/base.html"
	}
	if _, ok := templateFiles["templates/site/partials/header.html"]; ok {
		manifest.Templates[siteThemeTemplateKeyHeader] = "templates/site/partials/header.html"
	}
	if _, ok := templateFiles["templates/site/home/page.html"]; ok {
		manifest.Templates[siteThemeTemplateKeyHomePage] = "templates/site/home/page.html"
	}
	if _, ok := templateFiles["templates/site/search/page.html"]; ok {
		manifest.Templates[siteThemeTemplateKeySearchPage] = "templates/site/search/page.html"
	}

	registry := gotheme.NewRegistry()
	if err := registry.Register(manifest); err != nil {
		t.Fatalf("register site theme manifest: %v", err)
	}

	return os.DirFS(root), gotheme.Selector{
		Registry:       registry,
		DefaultTheme:   "garchen-archive-site",
		DefaultVariant: "dark",
	}
}

func renderSiteTemplateForTest(t *testing.T, cfg admin.Config, siteCfg SiteConfig, templateName string, viewCtx map[string]any) string {
	t.Helper()

	views, err := quickstart.NewViewEngine(client.FS(), ViewEngineOptions(cfg, siteCfg)...)
	if err != nil {
		t.Fatalf("new view engine: %v", err)
	}

	app := fiber.New(fiber.Config{Views: views})
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Render(templateName, viewCtx)
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("render themed template request: %v", err)
	}
	defer closeResponseBody(t, res)

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("read themed template body: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected themed template render status 200, got %d body=%s", res.StatusCode, string(body))
	}
	return string(body)
}

func mapFromNestedAny(raw any) map[string]any {
	typed, _ := raw.(map[string]any)
	return typed
}

func mustAdminThemeSelector(t *testing.T, name, variant string) gotheme.ThemeSelector {
	t.Helper()

	registry := gotheme.NewRegistry()
	selector, _, err := quickstart.NewThemeSelector(
		name,
		variant,
		map[string]string{"primary": "#0044ff"},
		quickstart.WithThemeRegistry(registry),
		quickstart.WithThemeAssets("/admin/assets", map[string]string{
			"logo": "logo.svg",
		}),
	)
	if err != nil {
		t.Fatalf("register admin theme selector: %v", err)
	}
	return selector
}
