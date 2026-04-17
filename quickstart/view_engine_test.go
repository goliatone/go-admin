package quickstart

import (
	"bytes"
	"io/fs"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/client"
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

func TestSidebarTemplateCopiesExposeBrandVariants(t *testing.T) {
	shared, err := fs.ReadFile(client.Templates(), "partials/sidebar.html")
	if err != nil {
		t.Fatalf("read shared sidebar template: %v", err)
	}
	embedded, err := fs.ReadFile(SidebarTemplatesFS(), "partials/sidebar.html")
	if err != nil {
		t.Fatalf("read quickstart sidebar template: %v", err)
	}
	for _, template := range [][]byte{shared, embedded} {
		if !containsAll(string(template), `sidebar-brand-expanded`, `sidebar-brand-collapsed`, `sidebar-logo-compact`) {
			t.Fatalf("expected sidebar template to expose expanded and compact brand variants, got %q", string(template))
		}
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

	resp, err := app.Test(httptest.NewRequest("GET", "/", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

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

	resp, err := app.Test(httptest.NewRequest("GET", "/", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

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

	resp, err := app.Test(httptest.NewRequest("GET", "/", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	var body bytes.Buffer
	if _, err := body.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read response body: %v", err)
	}
	html := body.String()
	if !containsAll(html, `/brand/logo.svg`, `/brand/icon.svg`, `sidebar-logo-compact`) {
		t.Fatalf("expected rendered sidebar to include expanded logo and compact icon, got %q", html)
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

	resp, err := app.Test(httptest.NewRequest("GET", "/", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

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

	resp, err := app.Test(httptest.NewRequest("GET", "/", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	var body bytes.Buffer
	if _, err := body.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if bytes.Count(body.Bytes(), []byte(`/admin/assets/logo.svg`)) != 2 {
		t.Fatalf("expected built-in brand asset fallback for both states, got %q", body.String())
	}
}

func TestLoginTemplatePrefersThemeIconAsset(t *testing.T) {
	views, err := NewViewEngine(
		client.Templates(),
		WithViewTemplateFuncs(DefaultTemplateFuncs(WithTemplateBasePath("/admin"))),
	)
	if err != nil {
		t.Fatalf("NewViewEngine error: %v", err)
	}

	app := fiber.New(fiber.Config{Views: views})
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Render("login", fiber.Map{
			"title":           "Admin",
			"base_path":       "/admin",
			"asset_base_path": "/admin",
			"theme": map[string]map[string]string{"assets": {
				"logo": "/brand/logo.svg",
				"icon": "/brand/icon.svg",
			}},
			"csrf_field": "",
		})
	})

	resp, err := app.Test(httptest.NewRequest("GET", "/", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	var body bytes.Buffer
	if _, err := body.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read response body: %v", err)
	}
	html := body.String()
	if !containsAll(html, `/brand/icon.svg`, `w-10 h-10 object-contain`) {
		t.Fatalf("expected login template to prefer theme icon asset, got %q", html)
	}
	if bytes.Contains(body.Bytes(), []byte(`/brand/logo.svg`)) {
		t.Fatalf("expected login template not to render logo when icon exists, got %q", html)
	}
}

func containsAll(input string, patterns ...string) bool {
	for _, pattern := range patterns {
		if !bytes.Contains([]byte(input), []byte(pattern)) {
			return false
		}
	}
	return true
}
