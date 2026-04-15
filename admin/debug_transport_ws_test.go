package admin

import (
	"errors"
	"testing"

	router "github.com/goliatone/go-router"
)

type stubNoWebSocketRouter struct{}

func (s *stubNoWebSocketRouter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	switch method {
	case router.GET:
		return s.Get(path, handler, mw...)
	case router.POST:
		return s.Post(path, handler, mw...)
	case router.PUT:
		return s.Put(path, handler, mw...)
	case router.DELETE:
		return s.Delete(path, handler, mw...)
	case router.PATCH:
		return s.Patch(path, handler, mw...)
	case router.HEAD:
		return s.Head(path, handler, mw...)
	default:
		return nil
	}
}

func (s *stubNoWebSocketRouter) Get(_ string, _ router.HandlerFunc, _ ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}

func (s *stubNoWebSocketRouter) Post(_ string, _ router.HandlerFunc, _ ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}

func (s *stubNoWebSocketRouter) Put(_ string, _ router.HandlerFunc, _ ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}

func (s *stubNoWebSocketRouter) Delete(_ string, _ router.HandlerFunc, _ ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}

func (s *stubNoWebSocketRouter) Patch(_ string, _ router.HandlerFunc, _ ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}

func (s *stubNoWebSocketRouter) Head(_ string, _ router.HandlerFunc, _ ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}

func TestDebugWebSocketRequiresViewPermission(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled:    true,
			Permission: debugDefaultPermission,
			Panels:     []string{DebugPanelRequests, DebugPanelSQL},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuth(&recordingAuthenticator{}, nil)
	adm.WithAuthorizer(mapAuthorizer{allowed: map[string]bool{debugDefaultPermission: false}})
	stubRouter := &stubWebSocketRouter{}
	adm.router = stubRouter

	mod := NewDebugModule(cfg.Debug)
	mod.collector = NewDebugCollector(cfg.Debug)
	mod.registerDebugWebSocket(adm)

	path := debugRoutePath(adm, cfg.Debug, "admin.debug", "ws")
	route := stubRouter.routeForPath(path)
	if route == nil || route.config.OnPreUpgrade == nil {
		t.Fatalf("expected debug websocket route to register pre-upgrade hook")
	}

	mockCtx := newDebugSessionMockContext(t)
	if _, err := route.config.OnPreUpgrade(mockCtx); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected debug websocket view permission to be enforced, got %v", err)
	}
}

func TestDebugWebSocketAllowsAuthorizedUpgrade(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled:    true,
			Permission: debugDefaultPermission,
			Panels:     []string{DebugPanelRequests, DebugPanelSQL},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuth(&recordingAuthenticator{}, nil)
	adm.WithAuthorizer(allowAuthorizer{})
	stubRouter := &stubWebSocketRouter{}
	adm.router = stubRouter

	mod := NewDebugModule(cfg.Debug)
	mod.collector = NewDebugCollector(cfg.Debug)
	mod.registerDebugWebSocket(adm)

	path := debugRoutePath(adm, cfg.Debug, "admin.debug", "ws")
	route := stubRouter.routeForPath(path)
	if route == nil || route.config.OnPreUpgrade == nil {
		t.Fatalf("expected debug websocket route to register pre-upgrade hook")
	}

	mockCtx := newDebugSessionMockContext(t)
	if _, err := route.config.OnPreUpgrade(mockCtx); err != nil {
		t.Fatalf("expected authorized debug websocket upgrade, got %v", err)
	}
}

func TestDebugWebSocketCapabilityDisabledWhenRouterLacksWebSocketSupport(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled:    true,
			Permission: debugDefaultPermission,
			Panels:     []string{DebugPanelRequests, DebugPanelSQL},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.router = &stubNoWebSocketRouter{}

	mod := NewDebugModule(cfg.Debug)
	mod.collector = NewDebugCollector(cfg.Debug)
	mod.collector.SetLiveTransportEnabled(true)

	mod.registerDebugWebSocket(adm)

	if mod.collector.toolbarLiveTransportEnabled() {
		t.Fatalf("expected live transport to be disabled when websocket registration is unavailable")
	}
}
