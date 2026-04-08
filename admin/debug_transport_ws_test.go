package admin

import (
	"errors"
	"testing"
)

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
