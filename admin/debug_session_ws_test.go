package admin

import (
	"context"
	"errors"
	"testing"

	debugregistry "github.com/goliatone/go-admin/debug"
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
	adm.WithAuth(&recordingAuthenticator{}, nil)
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
	adm.WithAuth(&recordingAuthenticator{}, nil)
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

	event = DebugEvent{Type: debugEventSnapshotInvalidated}
	if !debugSessionEventAllowed(event, sessionID, false) {
		t.Fatalf("expected snapshot invalidation to refresh session clients")
	}
}

func TestDebugSessionSnapshotsIncludeOnlyAuthorizedCommandRuns(t *testing.T) {
	panel, _, store := newCommandRunsPanelTestFixture(t, allowAuthorizer{})
	applyCommandRunPanelUpdate(t, store, "run-a", "corr-a", "tenant-a", 1)
	applyCommandRunPanelUpdate(t, store, "run-b", "corr-b", "tenant-b", 1)
	RegisterCommandRunsDebugPanel(panel.admin)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommandRuns) })

	mod := NewDebugModule(DebugConfig{Panels: []string{DebugPanelCommandRuns}})
	mod.admin = panel.admin
	mod.collector = NewDebugCollector(DebugConfig{Panels: []string{DebugPanelCommandRuns}})
	upgradeCtx, cancel := context.WithCancel(context.WithValue(context.Background(), tenantIDContextKey, "tenant-a"))
	access := mod.commandRunAccess(upgradeCtx)
	cancel()
	if access.ctx.Err() != nil {
		t.Fatalf("retained session access inherited upgrade cancellation: %v", access.ctx.Err())
	}

	initial := newStubWebSocketContext()
	if err := mod.writeDebugSessionSnapshot(initial, "session-1", true, access); err != nil {
		t.Fatalf("initial session snapshot: %v", err)
	}
	assertCommandRunSnapshotForTenant(t, initial.writes, "run-a")

	requested := newStubWebSocketContext()
	if err := mod.handleDebugSessionCommand(requested, newDebugSubscription(access), debugCommand{Type: "snapshot"}, "session-1", true); err != nil {
		t.Fatalf("requested session snapshot: %v", err)
	}
	assertCommandRunSnapshotForTenant(t, requested.writes, "run-a")

	withoutGlobals := newStubWebSocketContext()
	if err := mod.writeDebugSessionSnapshot(withoutGlobals, "session-1", false, access); err != nil {
		t.Fatalf("session-only snapshot: %v", err)
	}
	event, ok := withoutGlobals.writes[0].(DebugEvent)
	if !ok {
		t.Fatalf("snapshot event = %#v", withoutGlobals.writes[0])
	}
	snapshot, ok := event.Payload.(map[string]any)
	if !ok {
		t.Fatalf("snapshot payload = %#v", event.Payload)
	}
	if _, exists := snapshot[DebugPanelCommandRuns]; exists {
		t.Fatal("command runs leaked into a session-only snapshot")
	}
}
