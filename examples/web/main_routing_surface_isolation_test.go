package main

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"path"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	quicksite "github.com/goliatone/go-admin/quickstart/site"
	commandregistry "github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
	gotheme "github.com/goliatone/go-theme"
)

func TestExamplePhase6MigratedHostPreservesOwnershipAfterAdoption(t *testing.T) {
	app := newExamplePhase6SurfaceApp(t, func(cfg *appcfg.Config) {
		cfg.Site.InternalOps.EnableHealthz = true
		cfg.Site.InternalOps.EnableStatus = true
		cfg.Site.InternalOps.HealthzPath = "/readyz"
		cfg.Site.InternalOps.StatusPath = "/ops/status"
	})

	assertExampleHandler(t, app, http.MethodGet, "/", http.StatusOK, "site")
	assertExampleHandler(t, app, http.MethodGet, quicksite.DefaultSearchRoute, http.StatusOK, "search")
	assertExampleHandler(t, app, http.MethodGet, "/teachings/foundations-of-refuge", http.StatusOK, "site")
	assertExampleAppInfo(t, app, http.MethodGet, exampleAppInfoPath, http.StatusOK)
	assertExampleJSONStatus(t, app, http.MethodGet, "/readyz", http.StatusOK)
	assertExampleJSONStatus(t, app, http.MethodGet, "/ops/status", http.StatusOK)
	assertExampleHandler(t, app, http.MethodGet, "/admin/debug", http.StatusOK, "admin_debug")
	assertExampleHandler(t, app, http.MethodGet, "/admin/api/debug/scope", http.StatusOK, "admin_api")
	assertExampleStatus(t, app, http.MethodGet, "/admin/reports", http.StatusNotFound)
	assertExampleStatus(t, app, http.MethodGet, "/api/v1/posts", http.StatusNotFound)

	rec := performExampleRequest(t, app, http.MethodGet, "/.well-known/security.txt")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected /.well-known/security.txt to stay host-owned and return 404, got %d body=%s", rec.Code, rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), `"handler":"site"`) {
		t.Fatalf("expected /.well-known/security.txt to bypass site fallback, got body=%s", rec.Body.String())
	}
}

func TestExamplePhase6HTMLSurfacesKeep404AndThemeOutputsSeparated(t *testing.T) {
	app := newExamplePhase6HTMLApp(t)

	searchStatus, searchBody := performExampleHTMLRequest(t, app, http.MethodGet, quicksite.DefaultSearchRoute)
	if searchStatus != http.StatusOK {
		t.Fatalf("expected search page 200, got %d body=%s", searchStatus, searchBody)
	}
	assertContainsAll(t, searchBody,
		`data-theme-name="garchen-archive-site"`,
		`/static/themes/garchen-archive-site/static/site.css`,
		`/static/themes/garchen-archive-site/static/site.js`,
	)
	assertDoesNotContainAny(t, searchBody,
		`/admin/assets/output.css`,
		`/admin/assets/dist/styles/error-page.css`,
	)

	site404Status, site404Body := performExampleHTMLRequest(t, app, http.MethodGet, "/missing-page")
	if site404Status != http.StatusNotFound {
		t.Fatalf("expected site 404, got %d body=%s", site404Status, site404Body)
	}
	assertContainsAll(t, site404Body,
		`Not Found · Site Runtime`,
		`data-theme-name="garchen-archive-site"`,
		`/static/themes/garchen-archive-site/static/site.css`,
	)
	assertDoesNotContainAny(t, site404Body,
		`/admin/assets/output.css`,
		`/admin/assets/dist/styles/error-page.css`,
	)

	admin404Status, admin404Body := performExampleHTMLRequest(t, app, http.MethodGet, "/admin/missing")
	if admin404Status != http.StatusNotFound {
		t.Fatalf("expected admin 404, got %d body=%s", admin404Status, admin404Body)
	}
	assertContainsAll(t, admin404Body,
		`Error 404 -`,
		`/admin/assets/output.css`,
		`/admin/assets/dist/styles/error-page.css`,
	)
	assertDoesNotContainAny(t, admin404Body,
		`/static/themes/garchen-archive-site/static/site.css`,
		`Not Found · Site Runtime`,
	)

	system404Status, system404Body := performExampleHTMLRequest(t, app, http.MethodGet, "/.well-known/security.txt")
	if system404Status != http.StatusNotFound {
		t.Fatalf("expected /.well-known/security.txt to return 404, got %d body=%s", system404Status, system404Body)
	}
	assertDoesNotContainAny(t, system404Body,
		`data-theme-name="garchen-archive-site"`,
		`/static/themes/garchen-archive-site/static/site.css`,
		`/admin/assets/output.css`,
	)

	appInfo := performExampleRequest(t, app, http.MethodGet, exampleAppInfoPath)
	if appInfo.Code != http.StatusOK {
		t.Fatalf("expected %s to return 200, got %d body=%s", exampleAppInfoPath, appInfo.Code, appInfo.Body.String())
	}
	assertDoesNotContainAny(t, appInfo.Body.String(), "<html", "site-shell")
}

func newExamplePhase6SurfaceApp(t *testing.T, mutate func(*appcfg.Config)) *fiber.App {
	t.Helper()

	runtimeCfg := appcfg.Defaults()
	if mutate != nil {
		mutate(runtimeCfg)
	}

	adminCfg := quickstart.NewAdminConfig(runtimeCfg.Admin.BasePath, runtimeCfg.Admin.Title, runtimeCfg.Admin.DefaultLocale)
	siteCfg := resolveSiteRuntimeConfig(adminCfg, runtimeCfg.Site, true)
	adminAPIBasePath := quickstart.ResolveAdminAPIBasePath(nil, adminCfg, adminCfg.BasePath)

	server := router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
		PathConflictMode: router.PathConflictModePreferStatic,
		StrictRoutes:     true,
	})
	host := quickstart.NewHostRouter(server.Router(), adminCfg)
	if _, err := registerExampleHostOwnedRoutes(host, runtimeCfg); err != nil {
		t.Fatalf("register host-owned routes: %v", err)
	}

	host.AdminUI().Get(path.Join(adminCfg.BasePath, "debug"), func(c router.Context) error {
		return c.JSON(http.StatusOK, map[string]any{"handler": "admin_debug"})
	})
	host.AdminAPI().Get(path.Join(adminAPIBasePath, "debug", "scope"), func(c router.Context) error {
		return c.JSON(http.StatusOK, map[string]any{"handler": "admin_api"})
	})

	if err := quicksite.RegisterSiteRoutes(
		host.PublicSite(),
		nil,
		adminCfg,
		siteCfg,
		quicksite.WithFallbackPolicy(siteCfg.Fallback),
		quicksite.WithSearchProvider(exampleSearchProviderStub{}),
		quicksite.WithContentHandler(func(c router.Context) error {
			return c.JSON(http.StatusOK, map[string]any{
				"handler": "site",
				"path":    c.Path(),
			})
		}),
		quicksite.WithSearchHandlers(
			func(c router.Context) error {
				return c.JSON(http.StatusOK, map[string]any{
					"handler": "search",
					"path":    c.Path(),
				})
			},
			func(c router.Context) error {
				return c.JSON(http.StatusOK, map[string]any{"handler": "search_api"})
			},
		),
		quicksite.WithSuggestHandler(func(c router.Context) error {
			return c.JSON(http.StatusOK, map[string]any{"handler": "suggest_api"})
		}),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	server.Init()
	return server.WrappedRouter()
}

func newExamplePhase6HTMLApp(t *testing.T) *fiber.App {
	t.Helper()

	if err := commandregistry.Stop(context.Background()); err != nil {
		t.Fatalf("stop command registry before test: %v", err)
	}
	t.Cleanup(func() {
		_ = commandregistry.Stop(context.Background())
	})

	runtimeCfg := appcfg.Defaults()
	runtimeCfg.Site.InternalOps.EnableHealthz = true
	runtimeCfg.Site.InternalOps.EnableStatus = true
	runtimeCfg.Site.InternalOps.HealthzPath = "/readyz"
	runtimeCfg.Site.InternalOps.StatusPath = "/ops/status"

	cfg := quickstart.NewAdminConfig(runtimeCfg.Admin.BasePath, runtimeCfg.Admin.Title, runtimeCfg.Admin.DefaultLocale)
	cfg.AuthConfig = &coreadmin.AuthConfig{AllowUnauthenticatedRoutes: true}
	cfg.Theme = "example-admin"
	cfg.ThemeVariant = "light"

	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithFeatureDefaults(quickstart.DefaultMinimalFeatures()),
	)
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	adminThemeSelector, _, err := quickstart.NewThemeSelector(
		cfg.Theme,
		cfg.ThemeVariant,
		map[string]string{"primary": "#2563eb"},
		quickstart.WithThemeRegistry(gotheme.NewRegistry()),
		quickstart.WithThemeAssets(path.Join(cfg.BasePath, "assets"), map[string]string{
			"logo": "logo.svg",
		}),
	)
	if err != nil {
		t.Fatalf("new admin theme selector: %v", err)
	}
	adm.WithAdminTheme(adminThemeSelector)

	siteCfg := resolveSiteRuntimeConfig(cfg, runtimeCfg.Site, true)
	siteThemePackage, err := loadEmbeddedSiteThemePackage(siteCfg.Theme.Name)
	if err != nil {
		t.Fatalf("load embedded site theme package: %v", err)
	}
	siteThemeRegistry := gotheme.NewRegistry()
	if err := registerEmbeddedSiteTheme(siteThemeRegistry, siteThemePackage); err != nil {
		t.Fatalf("register embedded site theme: %v", err)
	}
	siteCfg.ThemeProvider = quicksite.ThemeProviderFromSelector(gotheme.Selector{
		Registry:       siteThemeRegistry,
		DefaultTheme:   strings.TrimSpace(siteCfg.Theme.Name),
		DefaultVariant: strings.TrimSpace(siteCfg.Theme.Variant),
	})
	siteCfg = attachEmbeddedSiteThemeTemplateFS(siteCfg, siteThemePackage)

	viewEngine, err := quickstart.NewViewEngine(
		client.FS(),
		append([]quickstart.ViewEngineOption{
			quickstart.WithViewBasePath(cfg.BasePath),
			quickstart.WithViewURLResolver(adm.URLs()),
		}, quicksite.ViewEngineOptions(cfg, siteCfg)...)...,
	)
	if err != nil {
		t.Fatalf("new view engine: %v", err)
	}

	server, r := quickstart.NewFiberServer(
		viewEngine,
		cfg,
		adm,
		true,
		quickstart.WithFiberLogger(false),
		quickstart.WithFiberAdapterConfig(func(adapterCfg *router.FiberAdapterConfig) {
			if adapterCfg == nil {
				return
			}
			conflictPolicy := router.HTTPRouterConflictLogAndContinue
			adapterCfg.ConflictPolicy = &conflictPolicy
			adapterCfg.StrictRoutes = false
			adapterCfg.PathConflictMode = router.PathConflictModePreferStatic
		}),
	)
	host := quickstart.NewHostRouter(r, cfg)
	if err := adm.Initialize(host.Admin()); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}
	if _, err := registerExampleHostOwnedRoutes(host, runtimeCfg); err != nil {
		t.Fatalf("register host-owned routes: %v", err)
	}
	if err := mountEmbeddedSiteThemeAssets(host.Static(), siteThemePackage); err != nil {
		t.Fatalf("mount embedded site theme assets: %v", err)
	}
	if err := quicksite.RegisterSiteRoutes(
		host.PublicSite(),
		adm,
		cfg,
		siteCfg,
		quicksite.WithSearchProvider(exampleSearchProviderStub{}),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	server.Init()
	return server.WrappedRouter()
}

func performExampleHTMLRequest(t *testing.T, app *fiber.App, method, target string) (int, string) {
	t.Helper()

	req := httptest.NewRequest(method, target, nil)
	req.Header.Set("Accept", "text/html")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("%s %s failed: %v", method, target, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("%s %s read body failed: %v", method, target, err)
	}
	return resp.StatusCode, string(body)
}

func assertContainsAll(t *testing.T, body string, fragments ...string) {
	t.Helper()
	for _, fragment := range fragments {
		if fragment == "" {
			continue
		}
		if !strings.Contains(body, fragment) {
			t.Fatalf("expected response body to contain %q\nbody=%s", fragment, body)
		}
	}
}

func assertDoesNotContainAny(t *testing.T, body string, fragments ...string) {
	t.Helper()
	for _, fragment := range fragments {
		if fragment == "" {
			continue
		}
		if strings.Contains(body, fragment) {
			t.Fatalf("expected response body not to contain %q\nbody=%s", fragment, body)
		}
	}
}
