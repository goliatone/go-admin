package main

import (
	"context"
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"path"
	"sort"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/gofiber/fiber/v2"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	quicksite "github.com/goliatone/go-admin/quickstart/site"
	router "github.com/goliatone/go-router"
	gotheme "github.com/goliatone/go-theme"
)

func TestLoadEmbeddedSiteThemePackage(t *testing.T) {
	pkg, err := loadEmbeddedSiteThemePackage(defaultEmbeddedSiteThemeName)
	if err != nil {
		t.Fatalf("load embedded site theme package: %v", err)
	}
	if pkg.Manifest.Name != defaultEmbeddedSiteThemeName {
		t.Fatalf("expected embedded site theme name %q, got %q", defaultEmbeddedSiteThemeName, pkg.Manifest.Name)
	}
	for _, key := range []string{"site.search.page", "site.home.page"} {
		if got := pkg.Manifest.Templates[key]; got == "" {
			t.Fatalf("expected embedded site theme to include %s, got %+v", key, pkg.Manifest.Templates)
		}
	}
}

func TestMountEmbeddedSiteThemeAssetsServesBundles(t *testing.T) {
	pkg, err := loadEmbeddedSiteThemePackage(defaultEmbeddedSiteThemeName)
	if err != nil {
		t.Fatalf("load embedded site theme package: %v", err)
	}

	adapter := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{
			UnescapePath:      true,
			EnablePrintRoutes: false,
			StrictRouting:     false,
		})
	})
	r := adapter.Router()
	if err := mountEmbeddedSiteThemeAssets(r, pkg); err != nil {
		t.Fatalf("mount embedded site theme assets: %v", err)
	}
	adapter.Init()
	app := adapter.WrappedRouter()

	for _, assetPath := range []string{
		path.Join(pkg.Manifest.Assets.Prefix, "static", "tokens.css"),
		path.Join(pkg.Manifest.Assets.Prefix, "static", "site.css"),
		path.Join(pkg.Manifest.Assets.Prefix, "static", "site.js"),
	} {
		resp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, assetPath, nil), -1)
		if err != nil {
			t.Fatalf("request %s failed: %v", assetPath, err)
		}
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			_ = resp.Body.Close()
			t.Fatalf("GET %s status=%d body=%q", assetPath, resp.StatusCode, string(body))
		}
		_ = resp.Body.Close()
	}
}

func TestAttachEmbeddedSiteThemeTemplateFSPreservesHostOverridePrecedence(t *testing.T) {
	pkg, err := loadEmbeddedSiteThemePackage(defaultEmbeddedSiteThemeName)
	if err != nil {
		t.Fatalf("load embedded site theme package: %v", err)
	}

	hostOverride := quicksite.LabelTemplateFS(fstest.MapFS{
		"templates/site/base.html": &fstest.MapFile{Data: []byte("host override")},
	}, "host-override", quicksite.TemplateSourceHostOverlay)

	siteCfg := attachEmbeddedSiteThemeTemplateFS(quicksite.SiteConfig{
		Views: quicksite.SiteViewConfig{
			TemplateFS: []fs.FS{hostOverride},
		},
	}, pkg)
	if len(siteCfg.Views.TemplateFS) != 2 {
		t.Fatalf("expected host override plus embedded package, got %d entries", len(siteCfg.Views.TemplateFS))
	}

	content, err := fs.ReadFile(quickstart.WithFallbackFS(siteCfg.Views.TemplateFS[0], siteCfg.Views.TemplateFS[1:]...), "templates/site/base.html")
	if err != nil {
		t.Fatalf("read stacked template: %v", err)
	}
	if string(content) != "host override" {
		t.Fatalf("expected host override to retain precedence, got %q", string(content))
	}

	diagnostics := quicksite.ResolveSiteThemeTemplateDiagnostics(map[string]any{
		"manifest_partials": map[string]any{
			"site.layout.base": pkg.Manifest.Templates["site.layout.base"],
		},
	}, siteCfg.Views.TemplateFS...)
	diag, ok := diagnostics["site.layout.base"]
	if !ok {
		t.Fatalf("expected diagnostics for packaged base template, got %+v", diagnostics)
	}
	if diag.Winner == nil || diag.Winner.Label != "host-override" {
		t.Fatalf("expected host override to win diagnostics, got %+v", diag)
	}
	if !diag.PackagedThemeShadowed {
		t.Fatalf("expected diagnostics to report shadowed packaged template, got %+v", diag)
	}
}

func TestEmbeddedSiteThemeRendersInitialSlice(t *testing.T) {
	pkg, err := loadEmbeddedSiteThemePackage(defaultEmbeddedSiteThemeName)
	if err != nil {
		t.Fatalf("load embedded site theme package: %v", err)
	}

	testCases := []struct {
		templateName string
		want         []string
		notWant      []string
	}{
		{
			templateName: "site/home/page",
			want: []string{
				"data-site-homepage",
				"Publishing Workflow Playbook",
				"Operational guidance for coordinating reviews, releases, and localized publishing.",
				"Teams coordinate publishing, localization, approvals, and governance from one public-ready workflow.",
			},
			notWant: []string{
				"partials/jserror-collector.html",
			},
		},
		{
			templateName: "site/search",
			want: []string{
				"data-site-search-input",
				"Site Search",
				"Preview mode active",
				"data-site-nav-toggle",
				"data-site-nav-panel",
				"site-header__locale--active",
				"site-header__locale--unavailable",
				"/static/themes/go-admin-demo-site/static/site.css",
				"/static/themes/go-admin-demo-site/static/site.js",
				"Publishing Workflow Playbook",
				"/es/search",
				"Find pages, posts, operational guides, and localized resources.",
				"Guide ×",
				"facet_content_type",
				"content, resources",
				"Page 1 · Total 1",
				"Open section",
			},
			notWant: []string{
				"/assets/output.css",
				"/assets/dist/styles/site-runtime.css",
				"/assets/dist/runtime/site-runtime.js",
				"partials/jserror-collector.html",
			},
		},
		{
			templateName: "site/content/list",
			want: []string{
				"site-content-list",
				"content-card__title",
				"Publishing Workflow Playbook",
			},
		},
		{
			templateName: "site/content/detail",
			want: []string{
				"site-content-detail",
				"Teams coordinate publishing, localization, approvals, and governance from one public-ready workflow.",
				"/resources/publishing-workflow-playbook",
			},
		},
	}

	for _, tc := range testCases {
		body := renderEmbeddedSiteTemplate(t, pkg, "dark", tc.templateName, nil)
		for _, want := range tc.want {
			if !strings.Contains(body, want) {
				t.Fatalf("render %s missing %q in body:\n%s", tc.templateName, want, body)
			}
		}
		for _, notWant := range tc.notWant {
			if strings.Contains(body, notWant) {
				t.Fatalf("render %s unexpectedly contained %q in body:\n%s", tc.templateName, notWant, body)
			}
		}
	}
}

func TestEmbeddedSiteThemeSearchZeroResultsState(t *testing.T) {
	pkg, err := loadEmbeddedSiteThemePackage(defaultEmbeddedSiteThemeName)
	if err != nil {
		t.Fatalf("load embedded site theme package: %v", err)
	}

	body := renderEmbeddedSiteTemplate(t, pkg, "dark", "site/search", func(ctx map[string]any) {
		ctx["search_results"] = nil
		ctx["search_filter_chips"] = []map[string]any{
			{"key": "content_type", "label": "Resource", "remove_url": "/search?q=workflow"},
		}
		ctx["search_state"] = map[string]any{
			"has_results":  false,
			"zero_results": true,
			"has_error":    false,
		}
		ctx["search_pagination"] = nil
	})

	for _, want := range []string{
		"No results found",
		"Try broadening your terms or removing one of the filter chips.",
		"Resource ×",
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("zero-results render missing %q in body:\n%s", want, body)
		}
	}
	if strings.Contains(body, "Search is unavailable") {
		t.Fatalf("zero-results render leaked error state:\n%s", body)
	}
}

func TestEmbeddedSiteThemeContainsNoLegacyDomainCopy(t *testing.T) {
	pkg, err := loadEmbeddedSiteThemePackage(defaultEmbeddedSiteThemeName)
	if err != nil {
		t.Fatalf("load embedded site theme package: %v", err)
	}

	legacyTerms := []string{
		"Gar" + "chen",
		"gar" + "chen",
		"Dhar" + "ma",
		"Rin" + "poche",
		"ref" + "uge",
		"Search " + "arch" + "ive",
		"In " + "trans" + "cript",
		"Gar" + "chen" + "SiteTheme",
		"arch" + "ive",
	}
	if err := fs.WalkDir(pkg.RootFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		content, err := fs.ReadFile(pkg.RootFS, path)
		if err != nil {
			return err
		}
		body := string(content)
		for _, term := range legacyTerms {
			if strings.Contains(body, term) {
				t.Fatalf("theme file %s contains legacy domain term %q", path, term)
			}
		}
		return nil
	}); err != nil {
		t.Fatalf("scan embedded theme: %v", err)
	}
}

func TestEmbeddedSiteThemeSearchErrorState(t *testing.T) {
	pkg, err := loadEmbeddedSiteThemePackage(defaultEmbeddedSiteThemeName)
	if err != nil {
		t.Fatalf("load embedded site theme package: %v", err)
	}

	body := renderEmbeddedSiteTemplate(t, pkg, "dark", "site/search", func(ctx map[string]any) {
		ctx["search_results"] = nil
		ctx["search_state"] = map[string]any{
			"has_results":  false,
			"zero_results": false,
			"has_error":    true,
		}
		ctx["search_error"] = map[string]any{
			"message": "Search backend timeout",
		}
		ctx["search_pagination"] = nil
	})

	for _, want := range []string{
		"Search is unavailable",
		"Search backend timeout",
		"data-site-search-input",
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("error render missing %q in body:\n%s", want, body)
		}
	}
	if strings.Contains(body, "No results found") {
		t.Fatalf("error render leaked zero-results state:\n%s", body)
	}
}

func renderEmbeddedSiteTemplate(t *testing.T, pkg *embeddedSiteThemePackage, variant, templateName string, mutate func(map[string]any)) string {
	t.Helper()

	cfg := admin.Config{
		DefaultLocale: "en",
		BasePath:      "/admin",
		Theme:         "admin-demo",
		ThemeVariant:  "light",
	}
	siteCfg := attachEmbeddedSiteThemeTemplateFS(resolveSiteRuntimeConfig(cfg, appcfg.Defaults().Site, true), pkg)

	views, err := quickstart.NewViewEngine(client.FS(), quicksite.ViewEngineOptions(cfg, siteCfg)...)
	if err != nil {
		t.Fatalf("new view engine: %v", err)
	}

	ctx := themedSiteTemplateContext(t, pkg, variant)
	if mutate != nil {
		mutate(ctx)
	}

	app := fiber.New(fiber.Config{Views: views})
	app.Get("/render/:template", func(c *fiber.Ctx) error {
		return c.Render(strings.ReplaceAll(c.Params("template"), "__", "/"), ctx)
	})

	resp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/render/"+strings.ReplaceAll(templateName, "/", "__"), nil), -1)
	if err != nil {
		t.Fatalf("render %s: %v", templateName, err)
	}
	body, err := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if err != nil {
		t.Fatalf("read %s body: %v", templateName, err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("render %s status=%d body=%s", templateName, resp.StatusCode, string(body))
	}
	return string(body)
}

func themedSiteTemplateContext(t *testing.T, pkg *embeddedSiteThemePackage, variant string) map[string]any {
	t.Helper()

	registry := gotheme.NewRegistry()
	if err := registry.Register(pkg.Manifest); err != nil {
		t.Fatalf("register embedded site theme manifest: %v", err)
	}

	selection, err := gotheme.Selector{
		Registry:       registry,
		DefaultTheme:   pkg.Manifest.Name,
		DefaultVariant: variant,
	}.Select(pkg.Manifest.Name, variant)
	if err != nil {
		t.Fatalf("select embedded site theme variant: %v", err)
	}

	tokens := selection.Tokens()
	cssVars := selection.CSSVariables("")

	return map[string]any{
		"title":           "Enterprise Admin",
		"base_path":       "/",
		"asset_base_path": "/admin",
		"active_path":     "/search",
		"locale":          "en",
		"resolved_locale": "en",
		"default_locale":  "en",
		"supported_locales": []string{
			"en", "es", "fr",
		},
		"preview_banner": map[string]any{
			"enabled":       true,
			"token_present": true,
			"token_valid":   true,
			"is_preview":    true,
		},
		"theme_name":    pkg.Manifest.Name,
		"theme_variant": variant,
		"theme": map[string]any{
			"tokens": tokens,
		},
		"site_theme": map[string]any{
			"name":           pkg.Manifest.Name,
			"variant":        variant,
			"css_vars":       cssVars,
			"css_vars_style": cssVarsStyle(cssVars),
			"shell_vars": map[string]string{
				"site_color_primary": firstNonEmptyToken(tokens, "color-brand-solid", "primary"),
				"site_color_accent":  firstNonEmptyToken(tokens, "color-text-brand-secondary", "accent"),
				"site_color_surface": firstNonEmptyToken(tokens, "color-bg-primary", "surface"),
			},
			"bundle_urls": map[string]string{
				"tokens_css": mustThemeAsset(t, selection, "tokens.css"),
				"site_css":   mustThemeAsset(t, selection, "site.css"),
				"site_js":    mustThemeAsset(t, selection, "site.js"),
			},
			"partials":          normalizeThemePartials(selection.Snapshot().Templates),
			"manifest_partials": selection.Snapshot().Templates,
		},
		"locale_switcher": map[string]any{
			"items": []map[string]any{
				{"locale": "en", "url": "/search", "active": true, "available": true},
				{"locale": "es", "url": "/es/search", "active": false, "available": true},
				{"locale": "fr", "url": "/fr/search", "active": false, "available": true},
				{"locale": "bo", "url": "/bo/search", "active": false, "available": false},
			},
		},
		"main_menu": map[string]any{
			"items": []map[string]any{
				{"label": "About", "href": "/about"},
				{
					"label": "Resources",
					"href":  "/resources",
					"children": []map[string]any{
						{"label": "Workflow", "href": "/resources/workflow"},
						{"label": "Governance", "href": "/resources/governance"},
					},
				},
				{"label": "Updates", "href": "/news"},
			},
		},
		"footer_menu": map[string]any{
			"items": []map[string]any{
				{"label": "Contact", "href": "/contact"},
				{"label": "Support", "href": "/support"},
			},
		},
		"search_route":            "/search",
		"search_suggest_endpoint": "/api/v1/site/search/suggest",
		"search_query":            "workflow",
		"search": map[string]any{
			"query":  "workflow",
			"locale": "en",
			"sort":   "relevance",
		},
		"search_sort_options": []map[string]any{
			{"value": "relevance", "label": "Relevance", "active": true},
			{"value": "recent", "label": "Most recent", "active": false},
		},
		"search_clear_url": "/search",
		"search_range_values": map[string]any{
			"published_year":       map[string]any{"gte": "2024", "lte": "2026"},
			"duration_seconds":     map[string]any{"gte": "60", "lte": "3600"},
			"reading_time_minutes": map[string]any{"gte": "2", "lte": "20"},
		},
		"search_facets": []map[string]any{
			{
				"name": "content_type",
				"kind": "term",
				"buckets": []map[string]any{
					{"value": "guide", "label": "Guide", "count": 12, "selected": true},
					{"value": "resource", "label": "Resource", "count": 7},
				},
			},
		},
		"search_filter_chips": []map[string]any{
			{"key": "content_type", "label": "Guide", "remove_url": "/search?q=workflow"},
		},
		"search_indexes": []string{"content", "resources"},
		"search_landing": map[string]any{
			"title":      "Find pages, posts, operational guides, and localized resources.",
			"page_title": "Site Search",
			"breadcrumb": "Resource",
		},
		"search_state": map[string]any{
			"has_results":  true,
			"zero_results": false,
			"has_error":    false,
		},
		"search_results": []map[string]any{
			{
				"title":          "Publishing Workflow Playbook",
				"url":            "/resources/publishing-workflow-playbook",
				"summary":        "A practical guide for planning approvals, releases, and localization.",
				"type":           "guide",
				"locale":         "en",
				"badge":          "Featured",
				"parent_title":   "Operations Guides",
				"parent_summary": "A curated collection of content operations guidance.",
				"score":          "0.98",
				"anchor": map[string]any{
					"url": "/resources/publishing-workflow-playbook#approvals",
				},
			},
		},
		"search_pagination": map[string]any{
			"page":     1,
			"total":    1,
			"has_prev": false,
			"has_next": false,
			"prev_url": "#",
			"next_url": "#",
		},
		"content_type_slug": "resources",
		"records": []map[string]any{
			{
				"id":      "page-1",
				"title":   "Publishing Workflow Playbook",
				"path":    "/resources/publishing-workflow-playbook",
				"summary": "Operational guidance for coordinating reviews, releases, and localized publishing.",
				"locale":  "en",
				"data": map[string]any{
					"summary": "Operational guidance for coordinating reviews, releases, and localized publishing.",
				},
			},
		},
		"record": map[string]any{
			"title":   "Publishing Workflow Playbook",
			"path":    "/resources/publishing-workflow-playbook",
			"summary": "Operational guidance for coordinating reviews, releases, and localized publishing.",
			"data": map[string]any{
				"content": "<p>Teams coordinate publishing, localization, approvals, and governance from one public-ready workflow.</p>",
			},
		},
		"slug_path": "/resources/publishing-workflow-playbook",
		"family_id": "resource-publishing-workflow",
	}
}

func normalizeThemePartials(raw map[string]string) map[string]string {
	aliases := map[string]string{
		"header":          "site.layout.header",
		"footer":          "site.layout.footer",
		"main_nav":        "site.nav.main",
		"footer_nav":      "site.nav.footer",
		"home_page":       "site.home.page",
		"home_hero":       "site.home.hero",
		"home_quote":      "site.home.quote",
		"home_highlights": "site.home.highlights",
		"home_news":       "site.home.news",
		"home_newsletter": "site.home.newsletter",
		"search_page":     "site.search.page",
		"content_list":    "site.content.list",
		"content_detail":  "site.content.detail",
	}
	out := map[string]string{}
	for alias, key := range aliases {
		value := strings.TrimSpace(raw[key])
		value = strings.TrimPrefix(value, "./")
		value = strings.TrimPrefix(value, "templates/")
		value = strings.TrimPrefix(value, "/")
		if value != "" {
			out[alias] = value
		}
	}
	return out
}

func cssVarsStyle(vars map[string]string) string {
	keys := make([]string, 0, len(vars))
	for key := range vars {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	lines := make([]string, 0, len(keys))
	for _, key := range keys {
		lines = append(lines, "      "+key+": "+vars[key]+";")
	}
	return strings.Join(lines, "\n")
}

func firstNonEmptyToken(tokens map[string]string, keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(tokens[key]); value != "" {
			return value
		}
	}
	return ""
}

func mustThemeAsset(t *testing.T, selection *gotheme.Selection, key string) string {
	t.Helper()
	value, ok := selection.Asset(key)
	if !ok {
		t.Fatalf("missing theme asset %s", key)
	}
	return value
}
