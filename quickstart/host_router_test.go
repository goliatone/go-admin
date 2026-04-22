package quickstart_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path"
	"reflect"
	"slices"
	"testing"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	quickstart "github.com/goliatone/go-admin/quickstart"
	quicksite "github.com/goliatone/go-admin/quickstart/site"
	router "github.com/goliatone/go-router"
	"github.com/julienschmidt/httprouter"
)

func TestHostRouterGroupedSurfacesPreserveOwnershipOnFiber(t *testing.T) {
	first, firstRoutes := buildHostRouterTestServer(t,
		router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
			PathConflictMode: router.PathConflictModePreferStatic,
			StrictRoutes:     true,
		}),
		[]string{"host", "admin", "static", "site"},
	)
	second, secondRoutes := buildHostRouterTestServer(t,
		router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
			PathConflictMode: router.PathConflictModePreferStatic,
			StrictRoutes:     true,
		}),
		[]string{"site", "static", "admin", "host"},
	)

	assertHostRouterServerMatrix(t, first)
	assertHostRouterServerMatrix(t, second)
	if !reflect.DeepEqual(firstRoutes, secondRoutes) {
		t.Fatalf("expected identical route sets across registration order\nfirst=%v\nsecond=%v", firstRoutes, secondRoutes)
	}
}

func TestHostRouterGroupedSurfacesPreserveOwnershipOnHTTPRouter(t *testing.T) {
	first, firstRoutes := buildHostRouterTestServer(t, router.NewHTTPServer(), []string{"host", "admin", "static", "site"})
	second, secondRoutes := buildHostRouterTestServer(t, router.NewHTTPServer(), []string{"site", "static", "admin", "host"})

	assertHostRouterServerMatrix(t, first)
	assertHostRouterServerMatrix(t, second)
	if !reflect.DeepEqual(firstRoutes, secondRoutes) {
		t.Fatalf("expected identical route sets across registration order\nfirst=%v\nsecond=%v", firstRoutes, secondRoutes)
	}
}

func TestHostRouterPublicSiteSurfaceRejectsSystemRouteRegistration(t *testing.T) {
	cfg := quickstart.NewAdminConfig("/admin", "Host Router", "en")
	host := quickstart.NewHostRouter(router.NewHTTPServer().Router(), cfg)

	defer func() {
		if recover() == nil {
			t.Fatalf("expected public site surface registration to panic for system route")
		}
	}()

	host.PublicSite().Get("/.well-known/app-info", jsonRouteHandler("system"))
}

func TestHostRouterAdminSurfaceRejectsSiteRouteRegistration(t *testing.T) {
	cfg := quickstart.NewAdminConfig("/admin", "Host Router", "en")
	host := quickstart.NewHostRouter(router.NewHTTPServer().Router(), cfg)

	defer func() {
		if recover() == nil {
			t.Fatalf("expected admin surface registration to panic for public site route")
		}
	}()

	host.Admin().Get("/posts/welcome", jsonRouteHandler("site"))
}

func TestHostRouterAdminSurfacePreservesWebSocketRegistrationOnFiber(t *testing.T) {
	cfg := quickstart.NewAdminConfig("/admin", "Host Router", "en")
	server := router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
		PathConflictMode: router.PathConflictModePreferStatic,
		StrictRoutes:     true,
	})
	host := quickstart.NewHostRouter(server.Router(), cfg)

	type wsRegistrar interface {
		WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo
	}

	ws, ok := host.Admin().(wsRegistrar)
	if !ok {
		t.Fatalf("expected host admin surface to preserve websocket capability")
	}

	ws.WebSocket(path.Join(cfg.BasePath, "debug", "ws"), router.DefaultWebSocketConfig(), func(c router.WebSocketContext) error {
		return c.Close()
	})

	server.Init()

	routes := routeSet(server.Router())
	if !slices.Contains(routes, "GET /admin/debug/ws") {
		t.Fatalf("expected websocket route to register on admin host surface, routes=%v", routes)
	}
}

func TestHostRouterSurfaceMiddlewareRemainsIsolated(t *testing.T) {
	t.Run("fiber", func(t *testing.T) {
		assertHostSurfaceMiddlewareIsolation(t, router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
			PathConflictMode: router.PathConflictModePreferStatic,
			StrictRoutes:     true,
		}))
	})
	t.Run("httprouter", func(t *testing.T) {
		assertHostSurfaceMiddlewareIsolation(t, router.NewHTTPServer())
	})
}

func TestHostRouterPublicSiteRoutesUseDedicatedPublicAPISurface(t *testing.T) {
	t.Run("fiber", func(t *testing.T) {
		assertHostPublicAPISurfaceSplit(t, router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
			PathConflictMode: router.PathConflictModePreferStatic,
			StrictRoutes:     true,
		}))
	})
	t.Run("httprouter", func(t *testing.T) {
		assertHostPublicAPISurfaceSplit(t, router.NewHTTPServer())
	})
}

func TestHostRouterStaticSurfaceMiddlewareAppliesToStaticRoutes(t *testing.T) {
	t.Run("fiber", func(t *testing.T) {
		assertHostStaticSurfaceMiddleware(t, router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
			PathConflictMode: router.PathConflictModePreferStatic,
			StrictRoutes:     true,
		}))
	})
	t.Run("httprouter", func(t *testing.T) {
		assertHostStaticSurfaceMiddleware(t, router.NewHTTPServer())
	})
}

func buildHostRouterTestServer[T any](t *testing.T, server router.Server[T], order []string) (router.Server[T], []string) {
	t.Helper()

	cfg := quickstart.NewAdminConfig("/admin", "Host Router", "en")
	host := quickstart.NewHostRouter(server.Router(), cfg)
	adminAPIBasePath := quickstart.ResolveAdminAPIBasePath(nil, cfg, cfg.BasePath)

	staticDir := t.TempDir()
	if err := os.WriteFile(path.Join(staticDir, "logo.svg"), []byte("<svg>logo</svg>"), 0o600); err != nil {
		t.Fatalf("write static fixture: %v", err)
	}

	siteFallback := quicksite.ResolveSiteFallbackPolicy(quicksite.SiteFallbackPolicy{
		Mode:      quicksite.SiteFallbackModePublicContentOnly,
		AllowRoot: true,
		ReservedPrefixes: append(
			append([]string{}, quicksite.SiteReservedPrefixesForAdminConfig(cfg)...),
			"/readyz",
			"/ops/status",
		),
	})
	siteCfg := quicksite.SiteConfig{
		DefaultLocale:    "en",
		SupportedLocales: []string{"en"},
		Search: quicksite.SiteSearchConfig{
			Route:    quicksite.DefaultSearchRoute,
			Endpoint: quicksite.DefaultSiteSearchEndpointForAdminConfig(cfg),
		},
		Features: quicksite.SiteFeatures{
			EnableSearch: new(true),
			EnableI18N:   new(false),
		},
		Fallback: siteFallback,
	}

	registerSteps := map[string]func(){
		"host": func() {
			host.System().Get("/.well-known/app-info", jsonRouteHandler("system"))
			if _, err := quickstart.RegisterInternalOpsRoutes(host.InternalOps(), quickstart.InternalOpsConfig{
				EnableHealthz: true,
				EnableStatus:  true,
				HealthzPath:   "/readyz",
				StatusPath:    "/ops/status",
			}); err != nil {
				t.Fatalf("register internal ops routes: %v", err)
			}
		},
		"admin": func() {
			host.AdminUI().Get(path.Join(cfg.BasePath, "debug"), jsonRouteHandler("admin_ui"))
			host.AdminAPI().Get(path.Join(adminAPIBasePath, "debug", "scope"), jsonRouteHandler("admin_api"))
		},
		"static": func() {
			host.Static().Static("/static", ".", router.Static{
				FS:   os.DirFS(staticDir),
				Root: ".",
			})
		},
		"site": func() {
			if err := quicksite.RegisterSiteRoutes(
				host.PublicSite(),
				nil,
				cfg,
				siteCfg,
				quicksite.WithFallbackPolicy(siteFallback),
				quicksite.WithSearchProvider(hostRouterSearchProviderStub{}),
				quicksite.WithContentHandler(jsonRouteHandler("site")),
				quicksite.WithSearchHandlers(
					jsonRouteHandler("search"),
					jsonRouteHandler("search_api"),
				),
				quicksite.WithSuggestHandler(jsonRouteHandler("suggest_api")),
			); err != nil {
				t.Fatalf("register site routes: %v", err)
			}
		},
	}

	for _, step := range order {
		register, ok := registerSteps[step]
		if !ok {
			t.Fatalf("unknown registration step %q", step)
		}
		register()
	}

	server.Init()
	return server, routeSet(server.Router())
}

func assertHostRouterServerMatrix[T any](t *testing.T, server router.Server[T]) {
	t.Helper()

	assertJSONHandler(t, server, http.MethodGet, "/", http.StatusOK, "site")
	assertJSONHandler(t, server, http.MethodGet, quicksite.DefaultSearchRoute, http.StatusOK, "search")
	assertJSONHandler(t, server, http.MethodGet, quicksite.DefaultSiteSearchEndpointForAdminConfig(quickstart.NewAdminConfig("/admin", "Host Router", "en")), http.StatusOK, "search_api")
	assertJSONHandler(t, server, http.MethodGet, "/.well-known/app-info", http.StatusOK, "system")
	assertJSONStatus(t, server, http.MethodGet, "/readyz", http.StatusOK)
	assertJSONStatus(t, server, http.MethodGet, "/ops/status", http.StatusOK)
	assertJSONHandler(t, server, http.MethodGet, "/admin/debug", http.StatusOK, "admin_ui")
	assertJSONHandler(t, server, http.MethodGet, "/admin/api/debug/scope", http.StatusOK, "admin_api")
	assertTextBody(t, server, http.MethodGet, "/static/logo.svg", http.StatusOK, "<svg>logo</svg>")
	assertStatusCode(t, server, http.MethodGet, "/admin/reports", http.StatusNotFound)
	assertStatusCode(t, server, http.MethodGet, "/assets/logo.svg", http.StatusNotFound)
}

func assertHostSurfaceMiddlewareIsolation[T any](t *testing.T, server router.Server[T]) {
	t.Helper()

	cfg := quickstart.NewAdminConfig("/admin", "Host Router", "en")
	host := quickstart.NewHostRouter(server.Router(), cfg)
	host.AdminUI().Use(headerMiddleware("X-Admin-UI", "1"))
	host.AdminUI().Get(path.Join(cfg.BasePath, "debug"), jsonRouteHandler("admin_ui"))
	host.PublicSite().Get("/", jsonRouteHandler("site"))

	server.Init()

	assertResponseHeader(t, server, http.MethodGet, "/admin/debug", "X-Admin-UI", "1")
	assertResponseHeaderAbsent(t, server, http.MethodGet, "/", "X-Admin-UI")
}

func assertHostPublicAPISurfaceSplit[T any](t *testing.T, server router.Server[T]) {
	t.Helper()

	cfg := quickstart.NewAdminConfig("/admin", "Host Router", "en")
	host := quickstart.NewHostRouter(server.Router(), cfg)
	host.PublicAPI().Use(headerMiddleware("X-Public-API", "1"))

	if err := quicksite.RegisterSiteRoutes(
		host.PublicSite(),
		nil,
		cfg,
		quicksite.SiteConfig{
			DefaultLocale:    "en",
			SupportedLocales: []string{"en"},
			Search: quicksite.SiteSearchConfig{
				Route:    quicksite.DefaultSearchRoute,
				Endpoint: quicksite.DefaultSiteSearchEndpointForAdminConfig(cfg),
			},
			Features: quicksite.SiteFeatures{
				EnableSearch: boolPtr(true),
				EnableI18N:   boolPtr(false),
			},
			Fallback: quicksite.ResolveSiteFallbackPolicy(quicksite.SiteFallbackPolicy{
				Mode:      quicksite.SiteFallbackModePublicContentOnly,
				AllowRoot: true,
			}),
		},
		quicksite.WithSearchProvider(hostRouterSearchProviderStub{}),
		quicksite.WithContentHandler(jsonRouteHandler("site")),
		quicksite.WithSearchHandlers(
			jsonRouteHandler("search"),
			jsonRouteHandler("search_api"),
		),
		quicksite.WithSuggestHandler(jsonRouteHandler("suggest_api")),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	server.Init()

	assertResponseHeaderAbsent(t, server, http.MethodGet, quicksite.DefaultSearchRoute, "X-Public-API")
	assertResponseHeader(t, server, http.MethodGet, quicksite.DefaultSiteSearchEndpointForAdminConfig(cfg), "X-Public-API", "1")
	assertResponseHeader(t, server, http.MethodGet, quicksite.DefaultSearchSuggestRoute, "X-Public-API", "1")
}

func assertHostStaticSurfaceMiddleware[T any](t *testing.T, server router.Server[T]) {
	t.Helper()

	cfg := quickstart.NewAdminConfig("/admin", "Host Router", "en")
	host := quickstart.NewHostRouter(server.Router(), cfg)
	staticDir := t.TempDir()
	if err := os.WriteFile(path.Join(staticDir, "logo.svg"), []byte("<svg>logo</svg>"), 0o600); err != nil {
		t.Fatalf("write static fixture: %v", err)
	}

	host.Static().Use(headerMiddleware("X-Static", "1"))
	host.Static().Static("/static", ".", router.Static{
		FS:   os.DirFS(staticDir),
		Root: ".",
	})
	host.PublicSite().Get("/", jsonRouteHandler("site"))

	server.Init()

	assertResponseHeader(t, server, http.MethodGet, "/static/logo.svg", "X-Static", "1")
	assertResponseHeaderAbsent(t, server, http.MethodGet, "/", "X-Static")
}

func headerMiddleware(name, value string) router.MiddlewareFunc {
	return func(next router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			c.SetHeader(name, value)
			return next(c)
		}
	}
}

func jsonRouteHandler(name string) router.HandlerFunc {
	return func(c router.Context) error {
		return c.JSON(http.StatusOK, map[string]any{
			"handler": name,
			"path":    c.Path(),
		})
	}
}

func assertJSONHandler[T any](t *testing.T, server router.Server[T], method, target string, status int, want string) {
	t.Helper()
	payload, _, _ := performHostRouterRequest(t, server, method, target)
	if payload == nil {
		t.Fatalf("expected JSON payload for %s %s", method, target)
	}
	if got := payload["handler"]; got != want {
		t.Fatalf("expected handler %q for %s %s, got %+v", want, method, target, payload)
	}
}

func assertJSONStatus[T any](t *testing.T, server router.Server[T], method, target string, status int) {
	t.Helper()
	payload, code, _ := performHostRouterRequest(t, server, method, target)
	if code != status {
		t.Fatalf("%s %s returned %d", method, target, code)
	}
	if got := payload["status"]; got != "ok" {
		t.Fatalf("expected ok status for %s %s, got %+v", method, target, payload)
	}
}

func assertTextBody[T any](t *testing.T, server router.Server[T], method, target string, status int, want string) {
	t.Helper()
	_, code, body := performHostRouterRequest(t, server, method, target)
	if code != status {
		t.Fatalf("%s %s returned %d body=%s", method, target, code, body)
	}
	if body != want {
		t.Fatalf("expected body %q for %s %s, got %q", want, method, target, body)
	}
}

func assertStatusCode[T any](t *testing.T, server router.Server[T], method, target string, want int) {
	t.Helper()
	_, code, body := performHostRouterRequest(t, server, method, target)
	if code != want {
		t.Fatalf("%s %s returned %d body=%s", method, target, code, body)
	}
}

func assertResponseHeader[T any](t *testing.T, server router.Server[T], method, target, header, want string) {
	t.Helper()

	resp := performHostRouterHTTPResponse(t, server, method, target)
	defer closeResponseBody(t, resp)

	if got := resp.Header.Get(header); got != want {
		t.Fatalf("expected header %s=%q for %s %s, got %q", header, want, method, target, got)
	}
}

func assertResponseHeaderAbsent[T any](t *testing.T, server router.Server[T], method, target, header string) {
	t.Helper()

	resp := performHostRouterHTTPResponse(t, server, method, target)
	defer closeResponseBody(t, resp)

	if got := resp.Header.Get(header); got != "" {
		t.Fatalf("expected header %s to be absent for %s %s, got %q", header, method, target, got)
	}
}

func performHostRouterRequest[T any](t *testing.T, server router.Server[T], method, target string) (map[string]any, int, string) {
	t.Helper()

	resp := performHostRouterHTTPResponse(t, server, method, target)
	defer closeResponseBody(t, resp)

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("%s %s read body failed: %v", method, target, err)
	}
	body := string(bodyBytes)

	var payload map[string]any
	if json.Unmarshal(bodyBytes, &payload) != nil {
		payload = nil
	}

	return payload, resp.StatusCode, body
}

func performHostRouterHTTPResponse[T any](t *testing.T, server router.Server[T], method, target string) *http.Response {
	t.Helper()

	req := httptest.NewRequest(method, target, nil)
	req.Header.Set("Accept", "application/json")

	switch wrapped := any(server.WrappedRouter()).(type) {
	case *fiber.App:
		resp, err := wrapped.Test(req, -1)
		if err != nil {
			t.Fatalf("%s %s failed: %v", method, target, err)
		}
		return resp
	case *httprouter.Router:
		rec := httptest.NewRecorder()
		wrapped.ServeHTTP(rec, req)
		return rec.Result()
	default:
		t.Fatalf("unsupported wrapped router type %T", wrapped)
		return nil
	}
}

func routeSet[T any](r router.Router[T]) []string {
	routes := r.Routes()
	if len(routes) == 0 {
		return nil
	}
	out := make([]string, 0, len(routes))
	for _, route := range routes {
		out = append(out, string(route.Method)+" "+route.Path)
	}
	slices.Sort(out)
	return out
}

type hostRouterSearchProviderStub struct{}

func (hostRouterSearchProviderStub) Search(_ context.Context, _ coreadmin.SearchRequest) (coreadmin.SearchResultPage, error) {
	return coreadmin.SearchResultPage{}, nil
}

func (hostRouterSearchProviderStub) Suggest(_ context.Context, _ coreadmin.SuggestRequest) (coreadmin.SuggestResult, error) {
	return coreadmin.SuggestResult{}, nil
}

//go:fix inline
func boolPtr(v bool) *bool {
	return new(v)
}
