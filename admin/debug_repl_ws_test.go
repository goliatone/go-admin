package admin

import (
	"context"
	"errors"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

type stubWebSocketRoute struct {
	path    string
	config  router.WebSocketConfig
	handler func(router.WebSocketContext) error
}

type stubWebSocketRouter struct {
	routes []stubWebSocketRoute
}

func (s *stubWebSocketRouter) WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	s.routes = append(s.routes, stubWebSocketRoute{path: path, config: config, handler: handler})
	return nil
}

func (s *stubWebSocketRouter) Get(_ string, _ router.HandlerFunc, _ ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}

func (s *stubWebSocketRouter) Post(_ string, _ router.HandlerFunc, _ ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}

func (s *stubWebSocketRouter) Put(_ string, _ router.HandlerFunc, _ ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}

func (s *stubWebSocketRouter) Delete(_ string, _ router.HandlerFunc, _ ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}

func (s *stubWebSocketRouter) routeForSuffix(suffix string) *stubWebSocketRoute {
	for i := range s.routes {
		if strings.HasSuffix(s.routes[i].path, suffix) {
			return &s.routes[i]
		}
	}
	return nil
}

type mapAuthorizer struct {
	allowed map[string]bool
}

func (a mapAuthorizer) Can(_ context.Context, action string, _ string) bool {
	return a.allowed[action]
}

func TestDebugREPLShellWebSocketAuthRequiresExec(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		FeatureFlags:  map[string]bool{"debug": true},
		Debug: DebugConfig{
			Enabled: true,
			Panels:  []string{DebugPanelShell, DebugPanelConsole},
			Repl: DebugREPLConfig{
				Enabled:      true,
				ShellEnabled: true,
				AppEnabled:   true,
				ReadOnly:     BoolPtr(true),
			},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	authn := &recordingAuthenticator{}
	adm.WithAuth(authn, nil)
	adm.WithAuthorizer(allowAuthorizer{})
	stubRouter := &stubWebSocketRouter{}
	adm.router = stubRouter

	mod := NewDebugModule(cfg.Debug)
	mod.registerDebugREPLShellWebSocket(adm)

	route := stubRouter.routeForSuffix(debugREPLShellPathSuffix)
	if route == nil || route.config.OnPreUpgrade == nil {
		t.Fatalf("expected shell websocket route to register pre-upgrade hook")
	}

	mockCtx := newDebugREPLMockContext(t, context.Background(), "127.0.0.1")
	if _, err := route.config.OnPreUpgrade(mockCtx); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected read-only shell to be forbidden, got %v", err)
	}
	if authn.calls == 0 {
		t.Fatalf("expected authenticator to be invoked")
	}
}

func TestDebugREPLAppWebSocketAllowsReadOnly(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		FeatureFlags:  map[string]bool{"debug": true},
		Debug: DebugConfig{
			Enabled: true,
			Panels:  []string{DebugPanelConsole},
			Repl: DebugREPLConfig{
				Enabled:    true,
				AppEnabled: true,
				ReadOnly:   BoolPtr(true),
			},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	adm.WithAuthorizer(allowAuthorizer{})
	stubRouter := &stubWebSocketRouter{}
	adm.router = stubRouter

	mod := NewDebugModule(cfg.Debug)
	mod.registerDebugREPLAppWebSocket(adm)

	route := stubRouter.routeForSuffix(debugREPLAppPathSuffix)
	if route == nil || route.config.OnPreUpgrade == nil {
		t.Fatalf("expected app websocket route to register pre-upgrade hook")
	}

	mockCtx := newDebugREPLMockContext(t, context.Background(), "127.0.0.1")
	if _, err := route.config.OnPreUpgrade(mockCtx); err != nil {
		t.Fatalf("expected read-only app repl to allow connection, got %v", err)
	}
}

func TestDebugREPLShellWebSocketExecPermissionDenied(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		FeatureFlags:  map[string]bool{"debug": true},
		Debug: DebugConfig{
			Enabled: true,
			Panels:  []string{DebugPanelShell},
			Repl: DebugREPLConfig{
				Enabled:      true,
				ShellEnabled: true,
				ReadOnly:     BoolPtr(false),
			},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	adm.WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
		debugReplDefaultPermission:     true,
		debugReplDefaultExecPermission: false,
	}})
	stubRouter := &stubWebSocketRouter{}
	adm.router = stubRouter

	mod := NewDebugModule(cfg.Debug)
	mod.registerDebugREPLShellWebSocket(adm)

	route := stubRouter.routeForSuffix(debugREPLShellPathSuffix)
	if route == nil || route.config.OnPreUpgrade == nil {
		t.Fatalf("expected shell websocket route to register pre-upgrade hook")
	}

	mockCtx := newDebugREPLMockContext(t, context.Background(), "127.0.0.1")
	if _, err := route.config.OnPreUpgrade(mockCtx); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected exec permission to be enforced, got %v", err)
	}
}
