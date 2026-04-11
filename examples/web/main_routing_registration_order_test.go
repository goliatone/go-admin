package main

import (
	"net/http"
	"path"
	"testing"

	"github.com/gofiber/fiber/v2"
	adminrouting "github.com/goliatone/go-admin/admin/routing"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/quickstart"
	quicksite "github.com/goliatone/go-admin/quickstart/site"
	router "github.com/goliatone/go-router"
)

func TestExampleHostRoutingSurfacesRemainStableAcrossRegistrationOrder(t *testing.T) {
	first := newExamplePhase5TestApp(t, []string{"host", "admin", "static", "site"}, func(cfg *appcfg.Config) {
		cfg.Site.InternalOps.EnableHealthz = true
		cfg.Site.InternalOps.EnableStatus = true
		cfg.Site.InternalOps.HealthzPath = "/readyz"
		cfg.Site.InternalOps.StatusPath = "/ops/status"
	})
	second := newExamplePhase5TestApp(t, []string{"site", "static", "admin", "host"}, func(cfg *appcfg.Config) {
		cfg.Site.InternalOps.EnableHealthz = true
		cfg.Site.InternalOps.EnableStatus = true
		cfg.Site.InternalOps.HealthzPath = "/readyz"
		cfg.Site.InternalOps.StatusPath = "/ops/status"
	})

	assertExamplePhase5SurfaceMatrix(t, first)
	assertExamplePhase5SurfaceMatrix(t, second)
}

func TestExampleRoutingOwnershipManifestIncludesAllHostStaticSurfaces(t *testing.T) {
	runtimeCfg := appcfg.Defaults()
	adminCfg := quickstart.NewAdminConfig(runtimeCfg.Admin.BasePath, runtimeCfg.Admin.Title, runtimeCfg.Admin.DefaultLocale)

	entries := exampleRoutingOwnershipManifestEntries(adminCfg, runtimeCfg)
	paths := map[string]struct{}{}
	for _, entry := range entries {
		if entry.Domain != adminrouting.RouteDomainStatic {
			continue
		}
		paths[entry.Path] = struct{}{}
	}

	expected := []string{path.Join("/static", "*")}
	for _, prefix := range quickstart.ResolveStaticAssetPrefixes(adminCfg) {
		expected = append(expected, path.Join(prefix, "*"))
	}
	for _, prefix := range resolveExampleSiteThemeStaticPrefixes(runtimeCfg) {
		expected = append(expected, path.Join(prefix, "*"))
	}

	for _, routePath := range expected {
		if _, ok := paths[routePath]; !ok {
			t.Fatalf("expected static ownership manifest path %q, got %+v", routePath, paths)
		}
	}
}

func newExamplePhase5TestApp(t *testing.T, order []string, mutate func(*appcfg.Config)) *fiber.App {
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

	steps := map[string]func(){
		"host": func() {
			if _, err := registerExampleHostOwnedRoutes(host, runtimeCfg); err != nil {
				t.Fatalf("register host-owned routes: %v", err)
			}
		},
		"admin": func() {
			host.AdminUI().Get(path.Join(adminCfg.BasePath, "debug"), func(c router.Context) error {
				return c.JSON(http.StatusOK, map[string]any{"handler": "admin_debug"})
			})
			host.AdminAPI().Get(path.Join(adminAPIBasePath, "debug", "scope"), func(c router.Context) error {
				return c.JSON(http.StatusOK, map[string]any{"handler": "admin_api"})
			})
		},
		"static": func() {
			host.Static().Get("/static/logo.svg", func(c router.Context) error {
				return c.JSON(http.StatusOK, map[string]any{"handler": "static"})
			})
		},
		"site": func() {
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
		},
	}

	for _, step := range order {
		register, ok := steps[step]
		if !ok {
			t.Fatalf("unknown registration step %q", step)
		}
		register()
	}

	server.Init()
	return server.WrappedRouter()
}

func assertExamplePhase5SurfaceMatrix(t *testing.T, app *fiber.App) {
	t.Helper()

	assertExampleHandler(t, app, http.MethodGet, "/", http.StatusOK, "site")
	assertExampleHandler(t, app, http.MethodGet, quicksite.DefaultSearchRoute, http.StatusOK, "search")
	assertExampleAppInfo(t, app, http.MethodGet, exampleAppInfoPath, http.StatusOK)
	assertExampleHandler(t, app, http.MethodGet, "/admin/debug", http.StatusOK, "admin_debug")
	assertExampleHandler(t, app, http.MethodGet, "/admin/api/debug/scope", http.StatusOK, "admin_api")
	assertExampleHandler(t, app, http.MethodGet, "/static/logo.svg", http.StatusOK, "static")
	assertExampleJSONStatus(t, app, http.MethodGet, "/readyz", http.StatusOK)
	assertExampleJSONStatus(t, app, http.MethodGet, "/ops/status", http.StatusOK)
	assertExampleStatus(t, app, http.MethodGet, "/admin/reports", http.StatusNotFound)
	assertExampleStatus(t, app, http.MethodGet, "/assets/logo.svg", http.StatusNotFound)
}
