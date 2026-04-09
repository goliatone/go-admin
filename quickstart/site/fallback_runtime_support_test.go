package site

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestRequestPathForSiteResolutionRemovesBasePathAndLocalePrefix(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Path").Return("/site/es/docs/getting-started")
	ctx.On("Param", "path", "").Return("")

	resolved := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		BasePath:         "/site",
		SupportedLocales: []string{"en", "es"},
	})

	if got := requestPathForSiteResolution(ctx, resolved); got != "/docs/getting-started" {
		t.Fatalf("expected normalized request path /docs/getting-started, got %q", got)
	}
}

func TestRequestPathForSiteFallbackRejectsPathsOutsideConfiguredBase(t *testing.T) {
	resolved := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{BasePath: "/site"})

	ctx := router.NewMockContext()
	ctx.On("Path").Return("/posts/welcome")

	if got, ok := requestPathForSiteFallback(ctx, resolved); ok || got != "/posts/welcome" {
		t.Fatalf("expected out-of-scope request path to be rejected, got path=%q ok=%v", got, ok)
	}
}

func TestFallbackContentHandlerRejectsReservedPrefixesAndDisallowedMethods(t *testing.T) {
	resolved := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{})
	policy := ResolveSiteFallbackPolicy(SiteFallbackPolicy{})
	handlerCalls := 0
	handler := fallbackContentHandler(resolved, policy, func(c router.Context) error {
		handlerCalls++
		return c.SendStatus(http.StatusAccepted)
	})

	ctx := router.NewMockContext()
	ctx.On("Method").Return(http.MethodGet)
	ctx.On("Path").Return("/admin/reports")
	ctx.On("Param", "path", "").Return("")
	ctx.On("SendStatus", http.StatusNotFound).Return(nil)
	if err := handler(ctx); err != nil {
		t.Fatalf("reserved-prefix handler: %v", err)
	}

	postCtx := router.NewMockContext()
	postCtx.On("Method").Return(http.MethodPost)
	postCtx.On("Path").Return("/posts/welcome")
	postCtx.On("Param", "path", "").Return("")
	postCtx.On("SendStatus", http.StatusNotFound).Return(nil)
	if err := handler(postCtx); err != nil {
		t.Fatalf("disallowed-method handler: %v", err)
	}

	if handlerCalls != 0 {
		t.Fatalf("expected guarded handler not to run, got %d calls", handlerCalls)
	}
}

func TestSiteRegisterFlowHonorsExplicitPathsOnlyFallbackAcrossAdapters(t *testing.T) {
	runExplicitPathsOnlyFallbackMatrix(t, router.NewHTTPServer())
	runExplicitPathsOnlyFallbackMatrix(t, router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
		PathConflictMode: router.PathConflictModePreferStatic,
		StrictRoutes:     true,
	}))
}

func TestSiteRegisterFlowGuardsReservedPrefixesAcrossAdapters(t *testing.T) {
	runPublicContentFallbackGuardMatrix(t, router.NewHTTPServer())
	runPublicContentFallbackGuardMatrix(t, router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
		PathConflictMode: router.PathConflictModePreferStatic,
		StrictRoutes:     true,
	}))
}

func runExplicitPathsOnlyFallbackMatrix[T any](t *testing.T, server router.Server[T]) {
	t.Helper()

	handler := func(c router.Context) error {
		return c.JSON(http.StatusOK, map[string]any{
			"handler": "site",
			"path":    c.Path(),
		})
	}
	searchPage := func(c router.Context) error {
		return c.JSON(http.StatusOK, map[string]any{
			"handler": "search",
			"path":    c.Path(),
		})
	}
	r := server.Router()
	r.Get("/.well-known/app-info", func(c router.Context) error {
		return c.JSON(http.StatusOK, map[string]any{"handler": "host"})
	})

	if err := RegisterSiteRoutes(r, nil, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Fallback: SiteFallbackPolicy{
			Mode:                SiteFallbackModeExplicitPathsOnly,
			AllowRoot:           false,
			AllowedExactPaths:   []string{"/landing"},
			AllowedPathPrefixes: []string{"/docs"},
		},
	},
		WithSearchProvider(searchProviderStub{}),
		WithContentHandler(handler),
		WithSearchHandlers(searchPage, defaultNotFoundHandler),
	); err != nil {
		t.Fatalf("register explicit-paths-only routes: %v", err)
	}
	server.Init()

	assertJSONHandler(t, server, http.MethodGet, "/search", http.StatusOK, "search")
	assertJSONHandler(t, server, http.MethodGet, "/landing", http.StatusOK, "site")
	assertJSONHandler(t, server, http.MethodGet, "/docs/getting-started", http.StatusOK, "site")
	assertJSONHandler(t, server, http.MethodGet, "/.well-known/app-info", http.StatusOK, "host")
	assertStatusCode(t, server, http.MethodGet, "/", http.StatusNotFound)
	assertStatusCode(t, server, http.MethodGet, "/posts/welcome", http.StatusNotFound)
	assertStatusCode(t, server, http.MethodPost, "/landing", http.StatusMethodNotAllowed)
}

func runPublicContentFallbackGuardMatrix[T any](t *testing.T, server router.Server[T]) {
	t.Helper()

	handler := func(c router.Context) error {
		return c.JSON(http.StatusOK, map[string]any{
			"handler": "site",
			"path":    c.Path(),
		})
	}
	searchPage := func(c router.Context) error {
		return c.JSON(http.StatusOK, map[string]any{
			"handler": "search",
			"path":    c.Path(),
		})
	}
	r := server.Router()
	r.Get("/.well-known/app-info", func(c router.Context) error {
		return c.JSON(http.StatusOK, map[string]any{"handler": "host"})
	})

	opts := []SiteOption{
		WithContentHandler(handler),
		WithSearchHandlers(searchPage, defaultNotFoundHandler),
		WithSearchProvider(searchProviderStub{}),
	}
	if err := RegisterSiteRoutes(r, nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, opts...); err != nil {
		t.Fatalf("register public-content routes: %v", err)
	}
	server.Init()

	assertJSONHandler(t, server, http.MethodGet, "/", http.StatusOK, "site")
	assertJSONHandler(t, server, http.MethodGet, "/posts/welcome", http.StatusOK, "site")
	assertJSONHandler(t, server, http.MethodGet, "/search", http.StatusOK, "search")
	assertJSONHandler(t, server, http.MethodGet, "/.well-known/app-info", http.StatusOK, "host")
	assertStatusCode(t, server, http.MethodGet, "/admin/reports", http.StatusNotFound)
	assertStatusCode(t, server, http.MethodGet, "/api/posts", http.StatusNotFound)
	assertStatusCode(t, server, http.MethodGet, "/assets/logo.svg", http.StatusNotFound)
	assertStatusCode(t, server, http.MethodPost, "/posts/welcome", http.StatusMethodNotAllowed)
}

func assertJSONHandler[T any](t *testing.T, server router.Server[T], method, path string, status int, wantHandler string) {
	t.Helper()
	rec := performSiteTestRequest(t, server, method, path)
	if rec.Code != status {
		t.Fatalf("%s %s returned %d body=%s", method, path, rec.Code, rec.Body.String())
	}
	payload := decodeSitePayload(t, path, rec)
	if got := payload["handler"]; got != wantHandler {
		t.Fatalf("expected handler %q for %s %s, got %+v", wantHandler, method, path, payload)
	}
}

func assertStatusCode[T any](t *testing.T, server router.Server[T], method, path string, status int) {
	t.Helper()
	rec := performSiteTestRequest(t, server, method, path)
	if rec.Code != status {
		t.Fatalf("%s %s returned %d body=%s", method, path, rec.Code, rec.Body.String())
	}
}

func performSiteTestRequest[T any](t *testing.T, server router.Server[T], method, path string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, nil)
	req.Header.Set("Accept", "application/json")
	rec := httptest.NewRecorder()
	switch app := any(server.WrappedRouter()).(type) {
	case interface {
		ServeHTTP(http.ResponseWriter, *http.Request)
	}:
		app.ServeHTTP(rec, req)
	case *fiber.App:
		resp, err := app.Test(req, -1)
		if err != nil {
			t.Fatalf("%s %s test request failed: %v", method, path, err)
		}
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			t.Fatalf("%s %s read response failed: %v", method, path, err)
		}
		for key, values := range resp.Header {
			for _, value := range values {
				rec.Header().Add(key, value)
			}
		}
		rec.WriteHeader(resp.StatusCode)
		_, _ = rec.Write(body)
	default:
		t.Fatalf("unsupported wrapped router type %T", app)
	}
	return rec
}
