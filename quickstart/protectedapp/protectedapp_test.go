package protectedapp_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path"
	"slices"
	"testing"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	quickstart "github.com/goliatone/go-admin/quickstart"
	quickprotectedapp "github.com/goliatone/go-admin/quickstart/protectedapp"
	quicksite "github.com/goliatone/go-admin/quickstart/site"
	router "github.com/goliatone/go-router"
)

func TestReservedPrefixesOnlyOptInWhenProtectedAppEnabled(t *testing.T) {
	cfg := quickstart.NewAdminConfig("/admin", "Protected App", "en")
	if got := quickprotectedapp.ReservedPrefixes(cfg); len(got) != 0 {
		t.Fatalf("expected no protected-app prefixes when disabled, got %v", got)
	}
	cfg.Routing.Roots.ProtectedAppRoot = "/stale-app"
	cfg.Routing.Roots.ProtectedAppAPIRoot = "/stale-app/api"
	if got := quickprotectedapp.ReservedPrefixes(cfg); len(got) != 0 {
		t.Fatalf("expected stale protected-app roots to stay inactive when disabled, got %v", got)
	}

	cfg.Routing.ProtectedAppEnabled = true
	cfg.Routing.Roots.ProtectedAppRoot = "/portal"
	cfg.Routing.Roots.ProtectedAppAPIRoot = "/portal/api"
	got := quickprotectedapp.ReservedPrefixes(cfg)
	want := []string{"/portal", "/portal/api"}
	if !slices.Equal(got, want) {
		t.Fatalf("expected protected-app reserved prefixes %v, got %v", want, got)
	}
}

func TestProtectedAppSingleDeploymentComposition(t *testing.T) {
	cfg := quickstart.NewAdminConfig("/admin", "Protected App", "en")
	cfg.Routing.ProtectedAppEnabled = true
	hostServer := router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
		PathConflictMode: router.PathConflictModePreferStatic,
		StrictRoutes:     true,
	})
	host := quickstart.NewHostRouter(hostServer.Router(), cfg)

	staticDir := t.TempDir()
	if err := os.WriteFile(path.Join(staticDir, "app.js"), []byte("bundle"), 0o600); err != nil {
		t.Fatalf("write bundle fixture: %v", err)
	}
	globalStaticDir := t.TempDir()
	if err := os.WriteFile(path.Join(globalStaticDir, "logo.svg"), []byte("<svg>logo</svg>"), 0o600); err != nil {
		t.Fatalf("write static fixture: %v", err)
	}

	host.AdminUI().Get("/admin/debug", jsonHandler("admin_ui"))
	host.ProtectedAppAPI().Get("/app/api/me", jsonHandler("protected_app_api"))
	host.Static().Static("/static", ".", router.Static{FS: os.DirFS(globalStaticDir), Root: "."})

	if err := quickprotectedapp.RegisterShell(host.ProtectedAppUI(), cfg, textHandler("protected-app-shell")); err != nil {
		t.Fatalf("register protected app shell: %v", err)
	}
	if err := quickprotectedapp.MountBundle(host.Static(), cfg, "/app/assets", ".", router.Static{FS: os.DirFS(staticDir), Root: "."}); err != nil {
		t.Fatalf("mount protected app bundle: %v", err)
	}
	if err := quickprotectedapp.RegisterHistoryFallback(
		host.ProtectedAppUI(),
		cfg,
		textHandler("protected-app-shell"),
		"/app/assets",
		"/admin",
		"/api",
		"/static",
		"/.well-known",
	); err != nil {
		t.Fatalf("register protected app history fallback: %v", err)
	}

	siteCfg := quicksite.SiteConfig{
		DefaultLocale:    "en",
		SupportedLocales: []string{"en"},
		Search: quicksite.SiteSearchConfig{
			Route:    quicksite.DefaultSearchRoute,
			Endpoint: quicksite.DefaultSiteSearchEndpointForAdminConfig(cfg),
		},
		Features: quicksite.SiteFeatures{
			EnableSearch: new(bool),
			EnableI18N:   new(bool),
		},
		Fallback: quicksite.ResolveSiteFallbackPolicy(quicksite.SiteFallbackPolicy{
			Mode:             quicksite.SiteFallbackModePublicContentOnly,
			AllowRoot:        true,
			ReservedPrefixes: quicksite.SiteReservedPrefixesForAdminConfig(cfg),
		}),
	}
	*siteCfg.Features.EnableSearch = true
	*siteCfg.Features.EnableI18N = false
	if err := quicksite.RegisterSiteRoutes(
		host.PublicSite(),
		nil,
		cfg,
		siteCfg,
		quicksite.WithFallbackPolicy(siteCfg.Fallback),
		quicksite.WithSearchProvider(searchProviderStub{}),
		quicksite.WithContentHandler(jsonHandler("site")),
		quicksite.WithSearchHandlers(jsonHandler("search"), jsonHandler("search_api")),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	hostServer.Init()

	assertText(t, hostServer, http.MethodGet, "/app", http.StatusOK, "protected-app-shell")
	assertText(t, hostServer, http.MethodGet, "/app/projects/alpha", http.StatusOK, "protected-app-shell")
	assertJSON(t, hostServer, http.MethodGet, "/app/api/me", http.StatusOK, "protected_app_api")
	assertText(t, hostServer, http.MethodGet, "/app/assets/app.js", http.StatusOK, "bundle")
	assertJSON(t, hostServer, http.MethodGet, "/", http.StatusOK, "site")
	assertJSON(t, hostServer, http.MethodGet, "/admin/debug", http.StatusOK, "admin_ui")
	assertTextStatus(t, hostServer, http.MethodGet, "/app/api/missing", http.StatusNotFound)
}

func TestProtectedAppHistoryFallbackRejectsHTTPRouterAdapter(t *testing.T) {
	cfg := quickstart.NewAdminConfig("/admin", "Protected App", "en")
	cfg.Routing.ProtectedAppEnabled = true
	host := quickstart.NewHostRouter(router.NewHTTPServer().Router(), cfg)

	err := quickprotectedapp.RegisterHistoryFallback(host.ProtectedAppUI(), cfg, textHandler("protected-app-shell"))
	if err == nil {
		t.Fatalf("expected httprouter-backed protected app fallback registration to fail")
	}
}

func assertJSON[T any](t *testing.T, server router.Server[T], method, target string, wantStatus int, wantHandler string) {
	t.Helper()
	code, payload := requestJSON(t, server, method, target)
	if code != wantStatus {
		t.Fatalf("expected %s %s status %d, got %d payload=%v", method, target, wantStatus, code, payload)
	}
	if got := payload["handler"]; got != wantHandler {
		t.Fatalf("expected handler %q for %s %s, got %v", wantHandler, method, target, got)
	}
}

func assertText[T any](t *testing.T, server router.Server[T], method, target string, wantStatus int, wantBody string) {
	t.Helper()
	code, body := requestText(t, server, method, target)
	if code != wantStatus {
		t.Fatalf("expected %s %s status %d, got %d body=%s", method, target, wantStatus, code, body)
	}
	if body != wantBody {
		t.Fatalf("expected %s %s body %q, got %q", method, target, wantBody, body)
	}
}

func assertTextStatus[T any](t *testing.T, server router.Server[T], method, target string, wantStatus int) {
	t.Helper()
	code, body := requestText(t, server, method, target)
	if code != wantStatus {
		t.Fatalf("expected %s %s status %d, got %d body=%s", method, target, wantStatus, code, body)
	}
}

func requestJSON[T any](t *testing.T, server router.Server[T], method, target string) (int, map[string]any) {
	t.Helper()
	resp := requestHTTP(t, server, method, target)
	defer resp.Body.Close()
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode %s %s json: %v", method, target, err)
	}
	return resp.StatusCode, payload
}

func requestText[T any](t *testing.T, server router.Server[T], method, target string) (int, string) {
	t.Helper()
	resp := requestHTTP(t, server, method, target)
	defer resp.Body.Close()
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read %s %s body: %v", method, target, err)
	}
	return resp.StatusCode, string(bodyBytes)
}

func requestHTTP[T any](t *testing.T, server router.Server[T], method, target string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(method, target, nil)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	switch wrapped := any(server.WrappedRouter()).(type) {
	case http.Handler:
		rec := httptest.NewRecorder()
		wrapped.ServeHTTP(rec, req)
		return rec.Result()
	case *fiber.App:
		resp, err := wrapped.Test(req, -1)
		if err != nil {
			t.Fatalf("%s %s failed: %v", method, target, err)
		}
		return resp
	default:
		t.Fatalf("wrapped router does not implement a supported http test interface")
		return nil
	}
}

func jsonHandler(name string) router.HandlerFunc {
	return func(c router.Context) error {
		return c.JSON(http.StatusOK, map[string]any{
			"handler": name,
			"path":    c.Path(),
		})
	}
}

func textHandler(body string) router.HandlerFunc {
	return func(c router.Context) error {
		return c.SendString(body)
	}
}

type searchProviderStub struct{}

func (searchProviderStub) Search(_ context.Context, _ coreadmin.SearchRequest) (coreadmin.SearchResultPage, error) {
	return coreadmin.SearchResultPage{}, nil
}

func (searchProviderStub) Suggest(_ context.Context, _ coreadmin.SuggestRequest) (coreadmin.SuggestResult, error) {
	return coreadmin.SuggestResult{}, nil
}
