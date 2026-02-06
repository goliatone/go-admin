package admin

import (
	"context"
	"errors"
	"testing"

	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func newDebugSessionMockContext(t *testing.T) *router.MockContext {
	t.Helper()
	mockCtx := router.NewMockContext()
	mockCtx.On("Context").Return(context.Background())
	mockCtx.On("IP").Return("127.0.0.1")
	mockCtx.On("SetContext", mock.Anything).Return()
	return mockCtx
}

func TestDebugSessionWebSocketRequiresAttachPermission(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
			Panels:  []string{DebugPanelRequests},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuthorizer(mapAuthorizer{allowed: map[string]bool{debugSessionAttachPermission: false}})
	stubRouter := &stubWebSocketRouter{}
	adm.router = stubRouter

	mod := NewDebugModule(cfg.Debug)
	mod.collector = NewDebugCollector(cfg.Debug)
	mod.registerDebugSessionWebSocket(adm)

	route := stubRouter.routeForSuffix(debugSessionWSPathSuffix)
	if route == nil || route.config.OnPreUpgrade == nil {
		t.Fatalf("expected session websocket route to register pre-upgrade hook")
	}

	mockCtx := newDebugSessionMockContext(t)
	if _, err := route.config.OnPreUpgrade(mockCtx); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected attach permission to be enforced, got %v", err)
	}
}

func TestDebugSessionWebSocketAllowsAttachPermission(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
			Panels:  []string{DebugPanelRequests},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuthorizer(mapAuthorizer{allowed: map[string]bool{debugSessionAttachPermission: true}})
	stubRouter := &stubWebSocketRouter{}
	adm.router = stubRouter

	mod := NewDebugModule(cfg.Debug)
	mod.collector = NewDebugCollector(cfg.Debug)
	mod.registerDebugSessionWebSocket(adm)

	route := stubRouter.routeForSuffix(debugSessionWSPathSuffix)
	if route == nil || route.config.OnPreUpgrade == nil {
		t.Fatalf("expected session websocket route to register pre-upgrade hook")
	}

	mockCtx := newDebugSessionMockContext(t)
	mockCtx.HeadersM["User-Agent"] = "debug-client"
	mockCtx.HeadersM["X-User-ID"] = "user-1"

	data, err := route.config.OnPreUpgrade(mockCtx)
	if err != nil {
		t.Fatalf("expected attach permission to allow connection, got %v", err)
	}

	adminCtx, ok := data[debugSessionUpgradeAdminContext].(AdminContext)
	if !ok {
		t.Fatalf("expected admin context in upgrade data")
	}
	if adminCtx.UserID != "user-1" {
		t.Fatalf("expected upgrade admin context user_id to be set, got %q", adminCtx.UserID)
	}
	if data[debugSessionUpgradeIP] != "127.0.0.1" {
		t.Fatalf("expected upgrade ip to be set, got %v", data[debugSessionUpgradeIP])
	}
	if data[debugSessionUpgradeUserAgent] != "debug-client" {
		t.Fatalf("expected upgrade user agent to be set, got %v", data[debugSessionUpgradeUserAgent])
	}
}

func TestDebugSessionEventAllowed(t *testing.T) {
	sessionID := "session-1"
	event := DebugEvent{
		Type:    "request",
		Payload: RequestEntry{SessionID: "session-1"},
	}
	if !debugSessionEventAllowed(event, sessionID, false) {
		t.Fatalf("expected matching session request to be allowed")
	}
	event.Payload = RequestEntry{SessionID: "session-2"}
	if debugSessionEventAllowed(event, sessionID, false) {
		t.Fatalf("expected mismatched session request to be denied")
	}

	event = DebugEvent{Type: DebugPanelTemplate, Payload: map[string]any{}}
	if debugSessionEventAllowed(event, sessionID, false) {
		t.Fatalf("expected global event to be denied when globals disabled")
	}
	if !debugSessionEventAllowed(event, sessionID, true) {
		t.Fatalf("expected global event to be allowed when globals enabled")
	}

	event = DebugEvent{Type: debugEventSnapshot}
	if debugSessionEventAllowed(event, sessionID, true) {
		t.Fatalf("expected snapshot event to be denied")
	}
}
