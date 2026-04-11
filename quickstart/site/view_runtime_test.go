package site

import (
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/quickstart"
)

func TestReadTemplateFromStackHonorsFSOrder(t *testing.T) {
	primary := fstest.MapFS{
		"site/base.html": &fstest.MapFile{Data: []byte("primary")},
	}
	fallback := fstest.MapFS{
		"site/base.html": &fstest.MapFile{Data: []byte("fallback")},
	}

	content, err := ReadTemplateFromStack("site/base.html", primary, fallback)
	if err != nil {
		t.Fatalf("read template: %v", err)
	}
	if string(content) != "primary" {
		t.Fatalf("expected primary template to win, got %q", string(content))
	}

	content, err = ReadTemplateFromStack("site/base.html", fallback, primary)
	if err != nil {
		t.Fatalf("read template reversed: %v", err)
	}
	if string(content) != "fallback" {
		t.Fatalf("expected fallback template to win in reversed order, got %q", string(content))
	}
}

func TestTemplateFSStackPrefersOverridesBeforeDefaults(t *testing.T) {
	base := fstest.MapFS{"site/base.html": &fstest.MapFile{Data: []byte("base")}}
	override := fstest.MapFS{"site/base.html": &fstest.MapFile{Data: []byte("override")}}

	stack := TemplateFSStack(ResolvedSiteViewConfig{TemplateFS: []fs.FS{override}}, base)
	if len(stack) != 2 {
		t.Fatalf("expected 2 fs entries, got %d", len(stack))
	}
	content, err := ReadTemplateFromStack("site/base.html", stack...)
	if err != nil {
		t.Fatalf("read template from stack: %v", err)
	}
	if string(content) != "override" {
		t.Fatalf("expected override stack precedence, got %q", string(content))
	}
}

func TestShouldReloadTemplatesByEnvironment(t *testing.T) {
	viewCfg := ResolvedSiteViewConfig{ReloadInDevelopment: true}

	if !ShouldReloadTemplates(viewCfg, "dev") {
		t.Fatalf("expected reload in dev")
	}
	if !ShouldReloadTemplates(viewCfg, "staging") {
		t.Fatalf("expected reload in staging")
	}
	if ShouldReloadTemplates(viewCfg, "prod") {
		t.Fatalf("expected no reload in prod")
	}

	always := ResolvedSiteViewConfig{Reload: true, ReloadInDevelopment: false}
	if !ShouldReloadTemplates(always, "prod") {
		t.Fatalf("expected explicit reload=true to win")
	}
}

func TestResolveViewRuntime(t *testing.T) {
	base := fstest.MapFS{"site/base.html": &fstest.MapFile{Data: []byte("base")}}
	runtime := ResolveViewRuntime(ResolvedSiteViewConfig{ReloadInDevelopment: true}, "dev", base)

	if !runtime.Reload {
		t.Fatalf("expected runtime reload true in dev")
	}
	if len(runtime.TemplateFS) != 1 {
		t.Fatalf("expected one fs entry, got %d", len(runtime.TemplateFS))
	}
}

func TestResolveSiteThemeTemplateDiagnosticsDetectsPackagedThemeShadowing(t *testing.T) {
	hostOverlay := LabelTemplateFS(fstest.MapFS{
		"templates/site/home/page.html": &fstest.MapFile{Data: []byte("host-home")},
	}, "host-overlay", TemplateSourceHostOverlay)
	packagedTheme := LabelTemplateFS(fstest.MapFS{
		"templates/site/home/page.html": &fstest.MapFile{Data: []byte("theme-home")},
	}, "garchen-archive-site", TemplateSourcePackagedTheme)
	builtIn := LabelTemplateFS(fstest.MapFS{
		"templates/site/home/page.html": &fstest.MapFile{Data: []byte("builtin-home")},
	}, "go-admin-builtins", TemplateSourceBuiltIn)

	diagnostics := ResolveSiteThemeTemplateDiagnostics(map[string]any{
		"manifest_partials": map[string]any{
			siteThemeTemplateKeyHomePage: "templates/site/home/page.html",
		},
	}, hostOverlay, packagedTheme, builtIn)
	diag, ok := diagnostics[siteThemeTemplateKeyHomePage]
	if !ok {
		t.Fatalf("expected homepage diagnostics entry, got %+v", diagnostics)
	}
	if diag.Winner == nil || diag.Winner.Label != "host-overlay" {
		t.Fatalf("expected host overlay to win, got %+v", diag)
	}
	if !diag.PackagedThemeShadowed {
		t.Fatalf("expected diagnostics to flag shadowed packaged theme, got %+v", diag)
	}
}

func TestViewEngineOptionsResolvedProjectsTemplateFSAndReload(t *testing.T) {
	override := fstest.MapFS{
		"site/partials/header.html": &fstest.MapFile{Data: []byte(`<header data-test="override">override</header>`)},
	}
	options := ViewEngineOptionsResolved(ResolvedSiteConfig{
		Environment: "dev",
		Views: ResolvedSiteViewConfig{
			TemplateFS:          []fs.FS{override},
			ReloadInDevelopment: true,
		},
	})

	body := mustRenderViewWithOptions(t, fstest.MapFS{
		"templates/site/base.html": &fstest.MapFile{Data: []byte(`{% include "site/partials/header.html" %}`)},
	}, options...)
	if !strings.Contains(body, `data-test="override"`) {
		t.Fatalf("expected override header to render, got %s", body)
	}
}

func TestViewEngineOptionsResolvesFromSiteConfig(t *testing.T) {
	override := fstest.MapFS{
		"site/partials/header.html": &fstest.MapFile{Data: []byte(`<header data-test="site-config">site-config</header>`)},
	}
	options := ViewEngineOptions(admin.Config{Debug: admin.DebugConfig{Enabled: true}}, SiteConfig{
		Views: SiteViewConfig{
			TemplateFS: []fs.FS{override},
		},
	})

	body := mustRenderViewWithOptions(t, fstest.MapFS{
		"templates/site/base.html": &fstest.MapFile{Data: []byte(`{% include "site/partials/header.html" %}`)},
	}, options...)
	if !strings.Contains(body, `data-test="site-config"`) {
		t.Fatalf("expected site config header to render, got %s", body)
	}
}

func mustRenderViewWithOptions(t *testing.T, base fs.FS, options ...quickstart.ViewEngineOption) string {
	t.Helper()

	views, err := quickstart.NewViewEngine(base, options...)
	if err != nil {
		t.Fatalf("new view engine: %v", err)
	}

	app := fiber.New(fiber.Config{Views: views})
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Render("site/base", map[string]any{})
	})

	res, err := app.Test(httptest.NewRequest(http.MethodGet, "/", nil))
	if err != nil {
		t.Fatalf("render request: %v", err)
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.StatusCode, string(body))
	}
	return string(body)
}
