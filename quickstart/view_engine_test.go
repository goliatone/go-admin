package quickstart

import (
	"bytes"
	"context"
	"io/fs"
	"maps"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/client"
	router "github.com/goliatone/go-router"
)

func TestViewEngineTemplateOverrides(t *testing.T) {
	hostFS := fstest.MapFS{
		"templates/partials/sidebar.html": {
			Data: []byte("host sidebar"),
		},
	}

	cfg, err := newViewEngineConfig(hostFS)
	if err != nil {
		t.Fatalf("newViewEngineConfig error: %v", err)
	}

	if len(cfg.templateFS) == 0 {
		t.Fatalf("expected template FS stack")
	}

	data, err := fs.ReadFile(cfg.templateFS[0], "partials/sidebar.html")
	if err != nil {
		t.Fatalf("read host sidebar: %v", err)
	}
	if string(data) != "host sidebar" {
		t.Fatalf("expected host sidebar override, got %q", string(data))
	}
}

func TestNewViewEngineRequiresBaseFS(t *testing.T) {
	_, err := NewViewEngine(nil)
	if err == nil {
		t.Fatalf("expected error for nil base filesystem")
	}
}

func TestNewViewEngineBuildsWithHostFS(t *testing.T) {
	hostFS := fstest.MapFS{
		"templates/partials/sidebar.html": {
			Data: []byte("host sidebar"),
		},
	}

	views, err := NewViewEngine(hostFS)
	if err != nil {
		t.Fatalf("NewViewEngine error: %v", err)
	}
	if views == nil {
		t.Fatalf("expected view engine")
	}
}

func TestViewEngineTemplateStackAlignsRoots(t *testing.T) {
	baseFS := fstest.MapFS{
		"layout.html": {
			Data: []byte("base layout"),
		},
	}
	fallbackFS := fstest.MapFS{
		"templates/partials/debug-toolbar.html": {
			Data: []byte("toolbar"),
		},
	}

	cfg, err := newViewEngineConfig(baseFS, WithViewTemplatesFS(fallbackFS))
	if err != nil {
		t.Fatalf("newViewEngineConfig error: %v", err)
	}

	stack := WithFallbackFS(cfg.templateFS[0], cfg.templateFS[1:]...)
	data, err := fs.ReadFile(stack, "partials/debug-toolbar.html")
	if err != nil {
		t.Fatalf("read debug toolbar: %v", err)
	}
	if string(data) != "toolbar" {
		t.Fatalf("expected toolbar template, got %q", string(data))
	}
}

func TestViewEngineTemplateStackPrefersOverlayOverHostBase(t *testing.T) {
	baseFS := fstest.MapFS{
		"templates/site/base.html": {
			Data: []byte("base template"),
		},
	}
	overrideFS := fstest.MapFS{
		"templates/site/base.html": {
			Data: []byte("override template"),
		},
	}

	cfg, err := newViewEngineConfig(baseFS, WithViewTemplatesFS(overrideFS))
	if err != nil {
		t.Fatalf("newViewEngineConfig error: %v", err)
	}

	stack := WithFallbackFS(cfg.templateFS[0], cfg.templateFS[1:]...)
	data, err := fs.ReadFile(stack, "site/base.html")
	if err != nil {
		t.Fatalf("read overridden base template: %v", err)
	}
	if string(data) != "override template" {
		t.Fatalf("expected overlay template to win, got %q", string(data))
	}
}

func TestViewEngineAdminBindingUsesExactNormalizedTemplateStack(t *testing.T) {
	hostFS := fstest.MapFS{
		"templates/layout.html": {Data: []byte("host layout")},
	}
	overlayFS := fstest.MapFS{
		"templates/themes/acme/breadcrumbs.html": {Data: []byte("acme breadcrumbs")},
	}
	adm, err := admin.New(admin.Config{}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.WithThemeProvider(func(context.Context, admin.ThemeSelector) (*admin.ThemeSelection, error) {
		return &admin.ThemeSelection{Partials: map[string]string{
			admin.AdminPartialPageBreadcrumbs: "themes/acme/breadcrumbs.html",
		}}, nil
	})

	if _, err := newViewEngineConfig(hostFS, WithViewTemplatesFS(overlayFS), WithViewAdmin(adm)); err != nil {
		t.Fatalf("newViewEngineConfig: %v", err)
	}
	selection := adm.StructuralPartials(context.Background())
	if selection.Breadcrumbs != "themes/acme/breadcrumbs.html" || len(selection.Diagnostics) != 0 {
		t.Fatalf("bound structural selection = %+v", selection)
	}
}

func TestStructuralBreadcrumbOverrideRendersAcrossAuthenticatedSurfaceMatrix(t *testing.T) {
	hostFS := fstest.MapFS{
		"partials/breadcrumbs.html": {
			Data: []byte(`<nav aria-label="Breadcrumb" data-host-breadcrumbs="fixed">fixed</nav>`),
		},
		"themes/acme/breadcrumbs.html": {
			Data: []byte(`<nav aria-label="Breadcrumb" data-host-breadcrumbs="selected">selected</nav>`),
		},
	}
	adm, err := admin.New(admin.Config{BasePath: "/admin"}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.WithThemeProvider(func(_ context.Context, selector admin.ThemeSelector) (*admin.ThemeSelection, error) {
		selection := &admin.ThemeSelection{}
		if selector.Variant == "contrast" {
			selection.Partials = map[string]string{
				admin.AdminPartialPageBreadcrumbs: "themes/acme/breadcrumbs.html",
			}
		}
		return selection, nil
	})

	views, err := NewViewEngine(
		client.Templates(),
		WithViewTemplatesFS(hostFS),
		WithViewAdmin(adm),
		WithViewReload(false),
		WithViewBasePath("/admin"),
	)
	if err != nil {
		t.Fatalf("NewViewEngine: %v", err)
	}
	if err := views.Load(); err != nil {
		t.Fatalf("load views: %v", err)
	}

	pages := []string{
		"resources/users/list",
		"resources/translations/shell",
		"resources/activity/list",
		"resources/feature-flags/index",
		"resources/media/list",
	}
	for _, variant := range []struct {
		name   string
		ctx    context.Context
		marker string
	}{
		{name: "fixed path overlay", ctx: context.Background(), marker: `data-host-breadcrumbs="fixed"`},
		{name: "theme selected path", ctx: admin.WithThemeSelection(context.Background(), admin.ThemeSelector{Variant: "contrast"}), marker: `data-host-breadcrumbs="selected"`},
	} {
		t.Run(variant.name, func(t *testing.T) {
			selection := adm.StructuralPartials(variant.ctx)
			for _, page := range pages {
				var rendered bytes.Buffer
				data, err := router.SerializeAsContext(structuralSurfaceRenderContext(selection))
				if err != nil {
					t.Fatalf("serialize %s render context: %v", page, err)
				}
				if err := views.Render(&rendered, page, data); err != nil {
					t.Fatalf("render %s: %v", page, err)
				}
				html := rendered.String()
				if !containsAll(html, variant.marker, "data-admin-shell", "data-admin-page-header", "data-admin-shell-content") {
					t.Fatalf("%s did not use %s through canonical shell", page, variant.marker)
				}
				if strings.Count(html, `aria-label="Breadcrumb"`) != 1 {
					t.Fatalf("%s rendered competing breadcrumb frames", page)
				}
			}
		})
	}
}

func TestOrdinaryAndModuleViewProvidersRenderStructuralDefaults(t *testing.T) {
	hostFS := fstest.MapFS{
		"provider.html": {Data: []byte(`{% extends "layout.html" %}{% block page_title %}Provider{% endblock %}{% block content %}<div data-provider-content></div>{% endblock %}`)},
	}
	views, err := NewViewEngine(client.Templates(), WithViewTemplatesFS(hostFS), WithViewBasePath("/admin"))
	if err != nil {
		t.Fatalf("NewViewEngine: %v", err)
	}
	if err := views.Load(); err != nil {
		t.Fatalf("load views: %v", err)
	}

	base := router.ViewContext(structuralSurfaceRenderContext(admin.DefaultAdminStructuralPartials()))
	providers := map[string]router.ViewContext{
		"ordinary quickstart": WithThemeContext(maps.Clone(base), nil, nil),
		"module enrichment":   admin.EnrichLayoutViewContext(nil, nil, maps.Clone(base), "activity"),
	}
	for name, view := range providers {
		t.Run(name, func(t *testing.T) {
			partials, ok := view["admin_partials"].(map[string]any)
			if !ok || partials["breadcrumbs"] == "" || partials["sidebar"] == "" || partials["footer"] == "" {
				t.Fatalf("provider omitted typed structural defaults: %#v", view["admin_partials"])
			}
			var rendered bytes.Buffer
			if err := views.Render(&rendered, "provider", view); err != nil {
				t.Fatalf("render provider context: %v", err)
			}
			if !containsAll(rendered.String(), "data-admin-shell", "data-admin-page-header", "data-admin-shell-content", "data-provider-content") {
				t.Fatalf("provider did not render canonical shell")
			}
		})
	}
}

func structuralSurfaceRenderContext(selection admin.AdminStructuralPartials) fiber.Map {
	return fiber.Map{
		"title":                     "Admin",
		"base_path":                 "/admin",
		"asset_base_path":           "/admin",
		"api_base_path":             "/admin/api",
		"active":                    "test",
		"nav_items":                 []any{},
		"nav_utility_items":         []any{},
		"session_user":              map[string]any{},
		"theme":                     map[string]map[string]string{},
		"external_assets":           map[string]string{},
		"csrf_meta":                 "",
		"csrf_field":                "",
		"breadcrumbs":               []map[string]any{{"label": "Home", "href": "/admin"}, {"label": "Current", "current": true}},
		"admin_partials":            selection.TemplateContext(),
		"admin_partial_diagnostics": append([]admin.AdminStructuralPartialDiagnostic(nil), selection.Diagnostics...),
		"routes":                    map[string]string{"new": "/admin/new"},
		"resource":                  "users",
		"resource_label":            "Users",
		"items":                     []any{},
		"can_edit":                  false,
		"columns":                   []any{},
		"datagrid_config":           map[string]any{},
		"activity_action_labels":    map[string]string{},
		"translation_shell_surface": "surface",
		"media_view":                "list",
		"media_gallery_path":        "/admin/media",
		"media_list_path":           "/admin/media/list",
	}
}

func TestViewEngineAdminLookupFollowsReloadAndCachePolicy(t *testing.T) {
	for _, test := range []struct {
		name        string
		reload      bool
		wantVisible bool
	}{
		{name: "reload sees new template", reload: true, wantVisible: true},
		{name: "non-reload caches negative lookup", reload: false, wantVisible: false},
	} {
		t.Run(test.name, func(t *testing.T) {
			hostFS := fstest.MapFS{"templates/layout.html": {Data: []byte("layout")}}
			adm, err := admin.New(admin.Config{}, admin.Dependencies{})
			if err != nil {
				t.Fatalf("admin.New: %v", err)
			}
			adm.WithThemeProvider(func(context.Context, admin.ThemeSelector) (*admin.ThemeSelection, error) {
				return &admin.ThemeSelection{Partials: map[string]string{
					admin.AdminPartialShellFooter: "themes/runtime/footer.html",
				}}, nil
			})
			if _, err := newViewEngineConfig(hostFS, WithViewReload(test.reload), WithViewAdmin(adm)); err != nil {
				t.Fatalf("newViewEngineConfig: %v", err)
			}
			if got := adm.StructuralPartials(context.Background()).Footer; got != "partials/admin-footer.html" {
				t.Fatalf("initial footer = %q", got)
			}
			hostFS["templates/themes/runtime/footer.html"] = &fstest.MapFile{Data: []byte("runtime footer")}
			got := adm.StructuralPartials(context.Background()).Footer
			if visible := got == "themes/runtime/footer.html"; visible != test.wantVisible {
				t.Fatalf("footer = %q, visible=%v want %v", got, visible, test.wantVisible)
			}
		})
	}
}

func TestSidebarTemplateFallbackUsesCanonicalPackagedSource(t *testing.T) {
	shared, err := fs.ReadFile(client.Templates(), "partials/sidebar.html")
	if err != nil {
		t.Fatalf("read shared sidebar template: %v", err)
	}
	embedded, err := fs.ReadFile(SidebarTemplatesFS(), "partials/sidebar.html")
	if err != nil {
		t.Fatalf("read quickstart sidebar template: %v", err)
	}
	if !bytes.Equal(shared, embedded) {
		t.Fatal("quickstart sidebar fallback must resolve the packaged canonical template")
	}
	for name, template := range map[string][]byte{
		"packaged": shared,
		"fallback": embedded,
	} {
		if !containsAll(
			string(template),
			`sidebar-brand-expanded`,
			`sidebar-brand-collapsed`,
			`sidebar-logo-compact`,
			`id="sidebar-mobile-toggle"`,
			`id="sidebar-backdrop"`,
			`data-mobile-open="false"`,
			`renderThemeMenuIcon("collapse", theme.assets)`,
			`renderThemeMenuIcon(item.icon, theme.assets)`,
		) {
			t.Fatalf("expected %s sidebar template to expose expanded and compact brand variants, got %q", name, string(template))
		}
	}
	if strings.Contains(string(shared), `assets/sidebar.css`) {
		t.Fatalf("shared sidebar template must use the compiled client stylesheet, got %q", string(shared))
	}
}

func TestSharedSidebarTemplatePrefersThemeLogoAsset(t *testing.T) {
	hostFS := fstest.MapFS{
		"templates/home.html": {
			Data: []byte(`{% include "partials/sidebar.html" %}`),
		},
	}

	views, err := NewViewEngine(
		client.Templates(),
		WithViewTemplatesFS(hostFS),
		WithViewTemplateFuncs(DefaultTemplateFuncs(WithTemplateBasePath("/admin"))),
	)
	if err != nil {
		t.Fatalf("NewViewEngine error: %v", err)
	}

	app := fiber.New(fiber.Config{Views: views})
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Render("home", fiber.Map{
			"title":             "Admin",
			"base_path":         "/admin",
			"asset_base_path":   "/admin",
			"theme":             map[string]map[string]string{"assets": {"logo": "/brand/logo.svg"}},
			"nav_items":         []map[string]any{},
			"nav_utility_items": []map[string]any{},
			"session_user":      map[string]any{},
			"csrf_field":        "",
		})
	})

	resp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil), -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer closeResponseBody(t, resp)

	var body bytes.Buffer
	if _, err := body.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read response body: %v", err)
	}
	html := body.String()
	if !containsAll(html, `/brand/logo.svg`, `sidebar-brand-expanded`, `sidebar-brand-collapsed`, `href="/admin"`) {
		t.Fatalf("expected shared sidebar render to use theme logo asset, got %q", html)
	}
}

func TestSidebarTemplatePrefersThemeLogoAsset(t *testing.T) {
	hostFS := fstest.MapFS{
		"templates/home.html": {
			Data: []byte(`{% include "partials/sidebar.html" %}`),
		},
	}

	views, err := NewViewEngine(
		hostFS,
		WithViewTemplateFuncs(DefaultTemplateFuncs(WithTemplateBasePath("/admin"))),
	)
	if err != nil {
		t.Fatalf("NewViewEngine error: %v", err)
	}

	app := fiber.New(fiber.Config{Views: views})
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Render("home", fiber.Map{
			"title":             "Admin",
			"base_path":         "/admin",
			"asset_base_path":   "/admin",
			"theme":             map[string]map[string]string{"assets": {"logo": "/brand/logo.svg"}},
			"nav_items":         []map[string]any{},
			"nav_utility_items": []map[string]any{},
			"session_user":      map[string]any{},
			"csrf_field":        "",
		})
	})

	resp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil), -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer closeResponseBody(t, resp)

	var body bytes.Buffer
	if _, err := body.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read response body: %v", err)
	}
	html := body.String()
	if !containsAll(html, `/brand/logo.svg`, `sidebar-brand-expanded`, `sidebar-brand-collapsed`) {
		t.Fatalf("expected rendered sidebar to use theme logo asset, got %q", html)
	}
}

func TestSidebarTemplateUsesCompactIconWhenAvailable(t *testing.T) {
	hostFS := fstest.MapFS{
		"templates/home.html": {
			Data: []byte(`{% include "partials/sidebar.html" %}`),
		},
	}

	views, err := NewViewEngine(
		hostFS,
		WithViewTemplateFuncs(DefaultTemplateFuncs(WithTemplateBasePath("/admin"))),
	)
	if err != nil {
		t.Fatalf("NewViewEngine error: %v", err)
	}

	app := fiber.New(fiber.Config{Views: views})
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Render("home", fiber.Map{
			"title":           "Admin",
			"base_path":       "/admin",
			"asset_base_path": "/admin",
			"theme": map[string]map[string]string{"assets": {
				"logo": "/brand/logo.svg",
				"icon": "/brand/icon.svg",
			}},
			"nav_items":         []map[string]any{},
			"nav_utility_items": []map[string]any{},
			"session_user":      map[string]any{},
			"csrf_field":        "",
		})
	})

	resp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil), -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer closeResponseBody(t, resp)

	var body bytes.Buffer
	if _, err := body.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read response body: %v", err)
	}
	html := body.String()
	if !containsAll(html, `/brand/logo.svg`, `/brand/icon.svg`, `sidebar-logo-compact`) {
		t.Fatalf("expected rendered sidebar to include expanded logo and compact icon, got %q", html)
	}
}

func TestSidebarTemplateConsumesThemeMenuIconAsset(t *testing.T) {
	hostFS := fstest.MapFS{
		"templates/home.html": {
			Data: []byte(`{% include "partials/sidebar.html" %}`),
		},
	}
	views, err := NewViewEngine(
		hostFS,
		WithViewTemplateFuncs(DefaultTemplateFuncs(WithTemplateBasePath("/admin"))),
	)
	if err != nil {
		t.Fatalf("NewViewEngine error: %v", err)
	}

	app := fiber.New(fiber.Config{Views: views})
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Render("home", fiber.Map{
			"title":           "Admin",
			"base_path":       "/admin",
			"asset_base_path": "/admin",
			"theme": map[string]map[string]string{"assets": {
				"icon-dashboard": "/brand/dashboard.svg",
			}},
			"nav_items": []map[string]any{{
				"id":     "dashboard",
				"label":  "Dashboard",
				"href":   "/admin",
				"icon":   "dashboard",
				"active": true,
			}},
			"nav_utility_items": []map[string]any{},
			"session_user":      map[string]any{},
			"csrf_field":        "",
		})
	})

	resp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil), -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer closeResponseBody(t, resp)
	var body bytes.Buffer
	if _, err := body.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read response body: %v", err)
	}
	html := body.String()
	if !containsAll(html, `/brand/dashboard.svg`, `data-theme-icon-role="icon-dashboard"`, `aria-hidden="true"`) {
		t.Fatalf("expected rendered sidebar to consume theme icon asset, got %q", html)
	}
	if strings.Contains(html, "iconoir-dashboard") {
		t.Fatalf("expected theme asset to replace legacy dashboard icon, got %q", html)
	}
}

func TestSidebarTemplateRendersDisabledNavigationAsNonLinks(t *testing.T) {
	hostFS := fstest.MapFS{
		"templates/home.html": {
			Data: []byte(`{% include "partials/sidebar.html" %}`),
		},
	}

	views, err := NewViewEngine(
		hostFS,
		WithViewTemplateFuncs(DefaultTemplateFuncs(WithTemplateBasePath("/admin"))),
	)
	if err != nil {
		t.Fatalf("NewViewEngine error: %v", err)
	}

	app := fiber.New(fiber.Config{Views: views})
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Render("home", fiber.Map{
			"title":           "Admin",
			"base_path":       "/admin",
			"asset_base_path": "/admin",
			"nav_items": []map[string]any{
				{
					"id":                   "debug",
					"label":                "Debug",
					"href":                 "/admin/debug",
					"enabled":              false,
					"disabled_reason":      "Permission denied",
					"disabled_reason_code": "permission_denied",
				},
				{
					"id":           "tools",
					"label":        "Tools",
					"collapsible":  true,
					"has_children": true,
					"children": []map[string]any{
						{
							"id":                   "tools.reports",
							"label":                "Reports",
							"href":                 "/admin/reports",
							"enabled":              false,
							"disabled_reason":      "Permission denied",
							"disabled_reason_code": "permission_denied",
						},
					},
				},
			},
			"nav_utility_items": []map[string]any{
				{
					"id":                   "utility.audit",
					"label":                "Audit",
					"href":                 "/admin/audit",
					"enabled":              false,
					"disabled_reason":      "Permission denied",
					"disabled_reason_code": "permission_denied",
				},
			},
			"session_user": map[string]any{},
			"csrf_field":   "",
		})
	})

	resp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil), -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer closeResponseBody(t, resp)

	var body bytes.Buffer
	if _, err := body.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read response body: %v", err)
	}
	html := body.String()
	if !containsAll(html, `aria-disabled="true"`, `Debug`, `Reports`, `Audit`, `permission_denied`) {
		t.Fatalf("expected disabled navigation controls, got %q", html)
	}
	for _, forbidden := range []string{`href="/admin/debug"`, `href="/admin/reports"`, `href="/admin/audit"`} {
		if bytes.Contains(body.Bytes(), []byte(forbidden)) {
			t.Fatalf("expected disabled navigation to omit %s, got %q", forbidden, html)
		}
	}
}

func TestViewEngineConfigWiresTranslationHelpersFromOptions(t *testing.T) {
	cfg, err := newViewEngineConfig(
		fstest.MapFS{"templates/home.html": {Data: []byte("home")}},
		WithViewTranslator(templateTranslatorStub{
			values: map[string]string{
				"en:menu.home": "Home",
			},
		}),
		WithViewDefaultLocale("en"),
	)
	if err != nil {
		t.Fatalf("newViewEngineConfig error: %v", err)
	}

	translate, ok := cfg.templateFuncs["translate"].(func(...any) string)
	if !ok {
		t.Fatalf("expected translate helper in template funcs, got %T", cfg.templateFuncs["translate"])
	}
	if got := translate("menu.home"); got != "Home" {
		t.Fatalf("expected translated helper output Home, got %q", got)
	}
}

var _ admin.Translator = templateTranslatorStub{}

func TestSidebarTemplateFallsBackToLogoForCompactBrand(t *testing.T) {
	hostFS := fstest.MapFS{
		"templates/home.html": {
			Data: []byte(`{% include "partials/sidebar.html" %}`),
		},
	}

	views, err := NewViewEngine(
		hostFS,
		WithViewTemplateFuncs(DefaultTemplateFuncs(WithTemplateBasePath("/admin"))),
	)
	if err != nil {
		t.Fatalf("NewViewEngine error: %v", err)
	}

	app := fiber.New(fiber.Config{Views: views})
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Render("home", fiber.Map{
			"title":             "Admin",
			"base_path":         "/admin",
			"asset_base_path":   "/admin",
			"theme":             map[string]map[string]string{"assets": {"logo": "/brand/logo.svg"}},
			"nav_items":         []map[string]any{},
			"nav_utility_items": []map[string]any{},
			"session_user":      map[string]any{},
			"csrf_field":        "",
		})
	})

	resp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil), -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer closeResponseBody(t, resp)

	var body bytes.Buffer
	if _, err := body.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read response body: %v", err)
	}
	html := body.String()
	if bytes.Count(body.Bytes(), []byte(`/brand/logo.svg`)) != 2 {
		t.Fatalf("expected expanded and compact brands to both use logo fallback, got %q", html)
	}
}

func TestSidebarTemplateFallsBackToBuiltInBrandAsset(t *testing.T) {
	hostFS := fstest.MapFS{
		"templates/home.html": {
			Data: []byte(`{% include "partials/sidebar.html" %}`),
		},
	}

	views, err := NewViewEngine(
		hostFS,
		WithViewTemplateFuncs(DefaultTemplateFuncs(WithTemplateBasePath("/admin"))),
	)
	if err != nil {
		t.Fatalf("NewViewEngine error: %v", err)
	}

	app := fiber.New(fiber.Config{Views: views})
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Render("home", fiber.Map{
			"title":             "Admin",
			"base_path":         "/admin",
			"asset_base_path":   "/admin",
			"nav_items":         []map[string]any{},
			"nav_utility_items": []map[string]any{},
			"session_user":      map[string]any{},
			"csrf_field":        "",
		})
	})

	resp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil), -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer closeResponseBody(t, resp)

	var body bytes.Buffer
	if _, err := body.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if bytes.Count(body.Bytes(), []byte(`/admin/assets/logo.svg`)) != 2 {
		t.Fatalf("expected built-in brand asset fallback for both states, got %q", body.String())
	}
}

func TestLoginTemplatePrefersThemeIconAsset(t *testing.T) {
	html := renderLoginTemplate(t, fiber.Map{
		"theme": map[string]map[string]string{"assets": {
			"logo": "/brand/logo.svg",
			"icon": "/brand/icon.svg",
		}},
	})
	if !containsAll(html, `/brand/icon.svg`, `w-10 h-10 object-contain`) {
		t.Fatalf("expected login template to prefer theme icon asset, got %q", html)
	}
	if strings.Contains(html, `/brand/logo.svg`) {
		t.Fatalf("expected login template not to render logo when icon exists, got %q", html)
	}
}

func TestLoginTemplatePlacesLogoOutsideCardByDefault(t *testing.T) {
	html := renderLoginTemplate(t, fiber.Map{
		"theme": map[string]map[string]string{"assets": {"logo": "/brand/logo.svg"}},
	})
	assertLoginLogoPlacement(t, html, false)
}

func TestLoginTemplatePlacesLogoInsideCard(t *testing.T) {
	html := renderLoginTemplate(t, fiber.Map{
		"login_logo_placement": "inside-card",
		"theme":                map[string]map[string]string{"assets": {"logo": "/brand/logo.svg"}},
	})
	assertLoginLogoPlacement(t, html, true)
}

func assertLoginLogoPlacement(t *testing.T, html string, inside bool) {
	t.Helper()
	const card = `<div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">`
	if count := strings.Count(html, `data-login-logo`); count != 1 {
		t.Fatalf("expected one login logo, got %d in %q", count, html)
	}
	logoIndex := strings.Index(html, `data-login-logo`)
	cardIndex := strings.Index(html, card)
	headerIndex := strings.Index(html, `Welcome back!`)
	if logoIndex < 0 || cardIndex < 0 || headerIndex < 0 {
		t.Fatalf("expected logo, card, and header markers in %q", html)
	}
	if inside && (cardIndex >= logoIndex || logoIndex >= headerIndex) {
		t.Fatalf("expected logo inside card before header, got %q", html)
	}
	if !inside && logoIndex >= cardIndex {
		t.Fatalf("expected logo outside card, got %q", html)
	}
}

func TestLoginTemplateOmitsSSOSectionWithoutProviders(t *testing.T) {
	for name, providers := range map[string]any{
		"absent": nil,
		"empty":  []map[string]any{},
	} {
		t.Run(name, func(t *testing.T) {
			data := fiber.Map{}
			if name != "absent" {
				data["sso_providers"] = providers
			}
			html := renderLoginTemplate(t, data)
			if containsAny(html, `Or sign in with`, `>Google<`, `>Apple<`, `href="/admin/auth/sso`) {
				t.Fatalf("expected no SSO section or static OAuth controls, got %q", html)
			}
			if !containsAll(html, `name="identifier"`, `name="password"`, `Sign In`, `data-submit-loading-form`, `assets/dist/login-submit-loading/index.js`) {
				t.Fatalf("expected local login form to remain, got %q", html)
			}
		})
	}
}

func TestLoginTemplateRendersEnabledSSOProviders(t *testing.T) {
	html := renderLoginTemplate(t, fiber.Map{
		"sso_providers": []map[string]any{
			{
				"key":        "acme",
				"label":      "Acme ID",
				"login_url":  "/admin/auth/sso/acme",
				"icon_class": "iconoir-key",
			},
			{
				"key":       "contoso",
				"label":     "Contoso",
				"login_url": "https://idp.example.test/start",
				"icon_url":  "/assets/contoso.svg",
			},
		},
	})
	if !containsAll(html,
		`Or sign in with`,
		`href="/admin/auth/sso/acme"`,
		`Acme ID`,
		`iconoir-key`,
		`href="https://idp.example.test/start"`,
		`/assets/contoso.svg`,
		`Contoso`,
	) {
		t.Fatalf("expected enabled SSO provider links, got %q", html)
	}
	if containsAny(html, `>Google<`, `>Apple<`, `aria-disabled="true"`) {
		t.Fatalf("expected no static OAuth or disabled controls, got %q", html)
	}
}

func TestLoginTemplateRendersDisabledSSOProvidersWithoutLinks(t *testing.T) {
	html := renderLoginTemplate(t, fiber.Map{
		"sso_providers": []map[string]any{
			{
				"key":             "okta",
				"label":           "Okta",
				"login_url":       "/admin/auth/sso/okta",
				"disabled_reason": "Temporarily unavailable",
			},
		},
	})
	if !containsAll(html, `Or sign in with`, `Okta`, `Temporarily unavailable`, `aria-disabled="true"`) {
		t.Fatalf("expected disabled SSO provider control, got %q", html)
	}
	if strings.Contains(html, `href="/admin/auth/sso/okta"`) {
		t.Fatalf("expected disabled provider not to link to login, got %q", html)
	}
}

func TestLoginTemplateFiltersMalformedSSOProviders(t *testing.T) {
	html := renderLoginTemplate(t, fiber.Map{
		"sso_providers": []map[string]any{
			{"key": "blank-label", "label": " ", "login_url": "/admin/auth/sso/blank-label"},
			{"key": "blank-url", "label": "Blank URL", "login_url": " "},
			{"key": "unsafe-url", "label": "Unsafe", "login_url": "javascript:alert(1)"},
			{"key": "scheme-relative", "label": "Scheme Relative", "login_url": "//idp.example.test/start"},
			{"key": "disabled", "label": "Disabled IDP", "disabled_reason": "Setup required"},
			{"key": "valid", "label": "Valid IDP", "login_url": "/admin/auth/sso/valid"},
		},
	})
	if !containsAll(html, `Or sign in with`, `Disabled IDP`, `Setup required`, `Valid IDP`, `href="/admin/auth/sso/valid"`) {
		t.Fatalf("expected mixed provider list to render valid controls, got %q", html)
	}
	if containsAny(html, `Blank URL`, `Unsafe`, `javascript:alert`, `Scheme Relative`, `//idp.example.test/start`, `blank-label`) {
		t.Fatalf("expected malformed providers to be filtered, got %q", html)
	}

	html = renderLoginTemplate(t, fiber.Map{
		"sso_providers": []map[string]any{
			{"label": " "},
			{"label": "No URL"},
			{"label": "Unsafe", "login_url": "data:text/html,hi"},
			{"label": "Scheme Relative", "login_url": "//idp.example.test/start"},
		},
	})
	if containsAny(html, `Or sign in with`, `No URL`, `Unsafe`, `Scheme Relative`) {
		t.Fatalf("expected fully malformed provider list to omit SSO section, got %q", html)
	}
}

func renderLoginTemplate(t *testing.T, data fiber.Map) string {
	t.Helper()

	views, err := NewViewEngine(
		client.Templates(),
		WithViewTemplateFuncs(DefaultTemplateFuncs(WithTemplateBasePath("/admin"))),
	)
	if err != nil {
		t.Fatalf("NewViewEngine error: %v", err)
	}

	viewData := fiber.Map{
		"title":           "Admin",
		"base_path":       "/admin",
		"asset_base_path": "/admin",
		"csrf_field":      "",
	}
	maps.Copy(viewData, data)

	app := fiber.New(fiber.Config{Views: views})
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Render("login", viewData)
	})

	resp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil), -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer closeResponseBody(t, resp)

	var body bytes.Buffer
	if _, err := body.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read response body: %v", err)
	}
	return body.String()
}

func containsAll(input string, patterns ...string) bool {
	for _, pattern := range patterns {
		if !bytes.Contains([]byte(input), []byte(pattern)) {
			return false
		}
	}
	return true
}

func containsAny(input string, patterns ...string) bool {
	for _, pattern := range patterns {
		if strings.Contains(input, pattern) {
			return true
		}
	}
	return false
}
