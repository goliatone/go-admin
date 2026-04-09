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
		"templates/site/search/page.html":     `<section data-theme-search="true">Themed search page</section>`,
	})
	adm := mustAdminWithTheme(t, "garchen-archive-site", "dark")
	adm.WithGoTheme(selector)

	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Views: SiteViewConfig{
			TemplateFS: []fs.FS{themeFS},
		},
		Features: SiteFeatures{
			EnableTheme:  boolPtr(true),
			EnableSearch: boolPtr(true),
		},
		Theme: SiteThemeConfig{
			Name:    "garchen-archive-site",
			Variant: "dark",
		},
	}, WithSearchProvider(&recordingSiteSearchProvider{})); err != nil {
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
	adm := mustAdminWithTheme(t, "garchen-archive-site", "dark")
	adm.WithGoTheme(selector)

	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Views: SiteViewConfig{
			TemplateFS: []fs.FS{themeFS},
		},
		Features: SiteFeatures{
			EnableTheme:  boolPtr(true),
			EnableSearch: boolPtr(true),
		},
		Theme: SiteThemeConfig{
			Name:    "garchen-archive-site",
			Variant: "dark",
		},
	}, WithSearchProvider(&recordingSiteSearchProvider{})); err != nil {
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
	defer res.Body.Close()

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
