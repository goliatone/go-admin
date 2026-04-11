package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"testing"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	quicksite "github.com/goliatone/go-admin/quickstart/site"
	router "github.com/goliatone/go-router"
)

func TestExampleHostRoutingUsesExplicitSiteFallbackAndPreservesReservedRoutes(t *testing.T) {
	app := newExamplePhase2TestApp(t, func(cfg *appcfg.Config) {
		cfg.Site.Fallback.Mode = string(quicksite.SiteFallbackModePublicContentOnly)
		cfg.Site.Fallback.AllowRoot = true
		cfg.Site.Fallback.AllowedExactPaths = []string{quicksite.DefaultSearchRoute}
		cfg.Site.InternalOps.EnableHealthz = false
		cfg.Site.InternalOps.EnableStatus = false
	})

	assertExampleHandler(t, app, http.MethodGet, "/", http.StatusOK, "site")
	assertExampleHandler(t, app, http.MethodGet, "/search", http.StatusOK, "search")
	assertExampleHandler(t, app, http.MethodGet, "/posts/welcome", http.StatusOK, "site")
	assertExampleAppInfo(t, app, http.MethodGet, exampleAppInfoPath, http.StatusOK)
	assertExampleStatus(t, app, http.MethodGet, "/admin/reports", http.StatusNotFound)
	assertExampleStatus(t, app, http.MethodGet, "/api/posts", http.StatusNotFound)
	assertExampleStatus(t, app, http.MethodGet, "/api/v1/posts", http.StatusNotFound)
	assertExampleStatus(t, app, http.MethodGet, "/assets/logo.svg", http.StatusNotFound)
}

func TestExampleHostRoutingInternalOpsRemainHostOwned(t *testing.T) {
	app := newExamplePhase2TestApp(t, func(cfg *appcfg.Config) {
		cfg.Site.InternalOps.EnableHealthz = true
		cfg.Site.InternalOps.EnableStatus = true
		cfg.Site.InternalOps.HealthzPath = "/readyz"
		cfg.Site.InternalOps.StatusPath = "/ops/status"
	})

	assertExampleJSONStatus(t, app, http.MethodGet, "/readyz", http.StatusOK)
	assertExampleJSONStatus(t, app, http.MethodGet, "/ops/status", http.StatusOK)
	assertExampleHandler(t, app, http.MethodGet, "/posts/welcome", http.StatusOK, "site")
}

func newExamplePhase2TestApp(t *testing.T, mutate func(*appcfg.Config)) *fiber.App {
	t.Helper()

	runtimeCfg := appcfg.Defaults()
	if mutate != nil {
		mutate(runtimeCfg)
	}

	adminCfg := admin.Config{
		BasePath:      runtimeCfg.Admin.BasePath,
		DefaultLocale: runtimeCfg.Admin.DefaultLocale,
		Theme:         defaultEmbeddedSiteThemeName,
		ThemeVariant:  runtimeCfg.Site.ThemeVariant,
	}
	siteCfg := resolveSiteRuntimeConfig(adminCfg, runtimeCfg.Site, true)

	server := router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
		PathConflictMode: router.PathConflictModePreferStatic,
		StrictRoutes:     true,
	})
	r := server.Router()
	host := quickstart.NewHostRouter(r, adminCfg)
	if _, err := registerExampleHostOwnedRoutes(host, runtimeCfg); err != nil {
		t.Fatalf("register host-owned routes: %v", err)
	}
	if len(siteCfg.Fallback.ReservedPrefixes) == 0 {
		t.Fatalf("expected example site fallback reserved prefixes to be resolved")
	}
	if !containsString(siteCfg.Fallback.ReservedPrefixes, "/api") {
		t.Fatalf("expected example site fallback reserved prefixes to include /api, got %v", siteCfg.Fallback.ReservedPrefixes)
	}
	if !containsString(siteCfg.Fallback.ReservedPrefixes, "/api/v1") {
		t.Fatalf("expected example site fallback reserved prefixes to include /api/v1, got %v", siteCfg.Fallback.ReservedPrefixes)
	}
	if err := quicksite.RegisterSiteRoutes(host.PublicSite(), nil, adminCfg, siteCfg,
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
		quicksite.WithAllowedFallbackMethods(http.MethodGet, http.MethodHead),
		quicksite.WithReservedPrefixes(append([]string{}, siteCfg.Fallback.ReservedPrefixes...)...),
		quicksite.WithAllowedExactPaths(append([]string{}, siteCfg.Fallback.AllowedExactPaths...)...),
		quicksite.WithAllowedPathPrefixes(append([]string{}, siteCfg.Fallback.AllowedPathPrefixes...)...),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}
	server.Init()
	return server.WrappedRouter()
}

func assertExampleJSONStatus(t *testing.T, app *fiber.App, method, path string, status int) {
	t.Helper()
	payload := performExampleJSONRequest(t, app, method, path, status)
	if got := payload["status"]; got != "ok" {
		t.Fatalf("expected status ok for %s %s, got %+v", method, path, payload)
	}
}

func assertExampleAppInfo(t *testing.T, app *fiber.App, method, path string, status int) {
	t.Helper()
	payload := performExampleJSONRequest(t, app, method, path, status)
	if got := payload["status"]; got != "ok" {
		t.Fatalf("expected app-info status ok for %s %s, got %+v", method, path, payload)
	}
	if got := payload["app"]; got != "go-admin web" {
		t.Fatalf("expected app-info payload to include app name, got %+v", payload)
	}
}

func assertExampleStatus(t *testing.T, app *fiber.App, method, path string, status int) {
	t.Helper()
	rec := performExampleRequest(t, app, method, path)
	if rec.Code != status {
		t.Fatalf("%s %s returned %d body=%s", method, path, rec.Code, rec.Body.String())
	}
}

func assertExampleHandler(t *testing.T, app *fiber.App, method, path string, status int, wantHandler string) {
	t.Helper()
	payload := performExampleJSONRequest(t, app, method, path, status)
	if got := payload["handler"]; got != wantHandler {
		t.Fatalf("expected handler %q for %s %s, got %+v", wantHandler, method, path, payload)
	}
}

func performExampleJSONRequest(t *testing.T, app *fiber.App, method, path string, status int) map[string]any {
	t.Helper()
	rec := performExampleRequest(t, app, method, path)
	if rec.Code != status {
		t.Fatalf("%s %s returned %d body=%s", method, path, rec.Code, rec.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode %s %s: %v body=%s", method, path, err, rec.Body.String())
	}
	return payload
}

func performExampleRequest(t *testing.T, app *fiber.App, method, path string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, nil)
	req.Header.Set("Accept", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("%s %s failed: %v", method, path, err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("%s %s read body failed: %v", method, path, err)
	}
	rec := httptest.NewRecorder()
	for key, values := range resp.Header {
		for _, value := range values {
			rec.Header().Add(key, value)
		}
	}
	rec.WriteHeader(resp.StatusCode)
	_, _ = rec.Write(body)
	return rec
}

func containsString(values []string, target string) bool {
	return slices.Contains(values, target)
}

type exampleSearchProviderStub struct{}

func (exampleSearchProviderStub) Search(_ context.Context, _ coreadmin.SearchRequest) (coreadmin.SearchResultPage, error) {
	return coreadmin.SearchResultPage{}, nil
}

func (exampleSearchProviderStub) Suggest(_ context.Context, _ coreadmin.SuggestRequest) (coreadmin.SuggestResult, error) {
	return coreadmin.SuggestResult{}, nil
}
