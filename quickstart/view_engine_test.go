package quickstart

import (
	"bytes"
	"io/fs"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/gofiber/fiber/v2"
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
	if !containsAll(html, `/brand/logo.svg`, `class="sidebar-logo"`) {
		t.Fatalf("expected rendered sidebar to use theme logo asset, got %q", html)
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
