package admin

import (
	"context"
	"errors"
	"testing"
	"time"

	debugregistry "github.com/goliatone/go-admin/debug"
	router "github.com/goliatone/go-router"
	"github.com/uptrace/bun"
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
	data, err := route.config.OnPreUpgrade(mockCtx)
	if err != nil {
		t.Fatalf("expected authorized debug websocket upgrade, got %v", err)
	}
	if _, ok := data[debugUpgradeAdminContext].(AdminContext); !ok {
		t.Fatalf("expected retained admin context, got %+v", data)
	}
}

func TestDebugWebSocketRetainsScopedCommandRunAccess(t *testing.T) {
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{Enabled: true, ApplicationID: "app", EnvironmentID: "test"})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	adminConfig := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, adminConfig, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.commandRunRuntime = runtime
	adm.WithAuth(&recordingAuthenticator{}, nil)
	adm.WithAuthorizer(allowAuthorizer{})
	stubRouter := &stubWebSocketRouter{}
	adm.router = stubRouter
	cfg := DebugConfig{Enabled: true, Panels: []string{DebugPanelCommandRuns}}
	mod := NewDebugModule(cfg)
	mod.collector = NewDebugCollector(cfg)
	mod.registerDebugWebSocket(adm)

	route := stubRouter.routeForPath(debugRoutePath(adm, cfg, "admin.debug", "ws"))
	if route == nil || route.config.OnPreUpgrade == nil {
		t.Fatal("expected websocket pre-upgrade hook")
	}
	mockCtx := newDebugSessionMockContext(t)
	mockCtx.QueriesM[ScopeTenantIDKey] = "tenant-a"
	data, err := route.config.OnPreUpgrade(mockCtx)
	if err != nil {
		t.Fatalf("upgrade: %v", err)
	}
	access, ok := data[debugUpgradeCommandRunAccess].(*commandRunWebSocketAccess)
	if !ok || !access.allowed || access.selector.Scope.TenantID != "tenant-a" {
		t.Fatalf("retained command-run access = %+v", data[debugUpgradeCommandRunAccess])
	}
}

func TestScopedCommandRunEventsAreRejectedBeforeWebSocketWrite(t *testing.T) {
	accessA := &commandRunWebSocketAccess{
		ctx: context.Background(), allowed: true,
		selector: CommandRunSelector{Scope: CommandRunScope{ApplicationID: "app", EnvironmentID: "test", TenantID: "tenant-a"}},
	}
	subscription := newDebugSubscription(accessA)
	ws := newStubWebSocketContext()

	allowed := DebugEvent{Type: commandRunDebugEventType, Payload: commandRunWebSocketTestRecord("run-a", "tenant-a")}
	if err := writeSubscribedDebugEvent(ws, subscription, allowed); err != nil || len(ws.writes) != 1 {
		t.Fatalf("authorized write count=%d err=%v", len(ws.writes), err)
	}
	denied := DebugEvent{Type: commandRunDebugEventType, Payload: commandRunWebSocketTestRecord("run-b", "tenant-b")}
	if err := writeSubscribedDebugEvent(ws, subscription, denied); err != nil || len(ws.writes) != 1 {
		t.Fatalf("cross-scope event reached writer count=%d err=%v", len(ws.writes), err)
	}
	malformed := DebugEvent{Type: commandRunDebugEventType, Payload: map[string]any{"run_id": "run-unknown"}}
	if err := writeSubscribedDebugEvent(ws, subscription, malformed); err != nil || len(ws.writes) != 1 {
		t.Fatalf("malformed event reached writer count=%d err=%v", len(ws.writes), err)
	}
	ordinary := DebugEvent{Type: "log", Payload: map[string]any{"message": "visible"}}
	if err := writeSubscribedDebugEvent(ws, subscription, ordinary); err != nil || len(ws.writes) != 2 {
		t.Fatalf("ordinary debug event behavior changed count=%d err=%v", len(ws.writes), err)
	}
}

func TestDebugWebSocketSnapshotsUsePerConnectionCommandRunScope(t *testing.T) {
	panel, runtime, store := newCommandRunsPanelTestFixture(t, allowAuthorizer{})
	applyCommandRunPanelUpdate(t, store, "run-a", "corr-a", "tenant-a", 1)
	applyCommandRunPanelUpdate(t, store, "run-b", "corr-b", "tenant-b", 1)
	RegisterCommandRunsDebugPanel(panel.admin)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommandRuns) })

	mod := NewDebugModule(DebugConfig{Panels: []string{DebugPanelCommandRuns}})
	mod.admin = panel.admin
	mod.collector = NewDebugCollector(DebugConfig{Panels: []string{DebugPanelCommandRuns}})
	ctxA := context.WithValue(context.Background(), tenantIDContextKey, "tenant-a")
	ctxB := context.WithValue(context.Background(), tenantIDContextKey, "tenant-b")
	accessA := mod.commandRunAccess(ctxA)
	accessB := mod.commandRunAccess(ctxB)
	if !accessA.allowed || !accessB.allowed || runtime.Store() == nil {
		t.Fatal("expected scoped gateway access")
	}

	wsA := newStubWebSocketContext()
	wsB := newStubWebSocketContext()
	if err := mod.writeDebugSnapshot(wsA, accessA); err != nil {
		t.Fatalf("tenant A snapshot: %v", err)
	}
	if err := mod.writeDebugSnapshot(wsB, accessB); err != nil {
		t.Fatalf("tenant B snapshot: %v", err)
	}
	assertCommandRunSnapshotForTenant(t, wsA.writes, "run-a")
	assertCommandRunSnapshotForTenant(t, wsB.writes, "run-b")
}

func TestDebugWebSocketReconnectWritesFreshStoreSnapshotBeforeLiveLoop(t *testing.T) {
	panel, _, store := newCommandRunsPanelTestFixture(t, allowAuthorizer{})
	applyCommandRunPanelUpdate(t, store, "run-reconnect", "corr-reconnect", "tenant-a", 1)
	RegisterCommandRunsDebugPanel(panel.admin)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommandRuns) })

	mod := NewDebugModule(DebugConfig{Panels: []string{DebugPanelCommandRuns}})
	mod.admin = panel.admin
	mod.collector = NewDebugCollector(DebugConfig{Panels: []string{DebugPanelCommandRuns}})
	access := mod.commandRunAccess(context.WithValue(context.Background(), tenantIDContextKey, "tenant-a"))

	firstCtx, cancelFirst := context.WithCancel(context.Background())
	first := newBlockingDebugWebSocketContext(firstCtx, nil)
	first.upgradeData[debugUpgradeCommandRunAccess] = access
	firstDone := make(chan error, 1)
	go func() { firstDone <- mod.handleDebugWebSocket(first) }()
	waitForDebugWebSocketSignal(t, first.readStarted, "initial reconnect reader")
	waitForDebugWebSocketWrites(t, first, 1)
	cancelFirst()
	if err := <-firstDone; err != nil {
		t.Fatalf("initial websocket: %v", err)
	}
	assertCommandRunSnapshotRevision(t, first.writes, "run-reconnect", 1)

	next := validCommandRunUpdate()
	next.EventID = "event-run-reconnect-2"
	next.RunID = "run-reconnect"
	next.CorrelationID = "corr-reconnect"
	next.Revision = 2
	next.Scope = CommandRunScope{ApplicationID: "app", EnvironmentID: "test", TenantID: "tenant-a"}
	if _, changed, err := store.Apply(context.Background(), next); err != nil || !changed {
		t.Fatalf("apply reconnect update: changed=%v err=%v", changed, err)
	}
	reconnectedCtx, cancelReconnected := context.WithCancel(context.Background())
	reconnected := newBlockingDebugWebSocketContext(reconnectedCtx, nil)
	reconnected.upgradeData[debugUpgradeCommandRunAccess] = access
	reconnectedDone := make(chan error, 1)
	go func() { reconnectedDone <- mod.handleDebugWebSocket(reconnected) }()
	waitForDebugWebSocketSignal(t, reconnected.readStarted, "reconnected reader")
	waitForDebugWebSocketWrites(t, reconnected, 1)
	cancelReconnected()
	if err := <-reconnectedDone; err != nil {
		t.Fatalf("reconnected websocket: %v", err)
	}
	assertCommandRunSnapshotRevision(t, reconnected.writes, "run-reconnect", 2)
}

func waitForDebugWebSocketWrites(t testing.TB, ws *blockingDebugWebSocketContext, count int32) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for ws.writeCount.Load() < count && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if got := ws.writeCount.Load(); got < count {
		t.Fatalf("websocket writes = %d, want at least %d", got, count)
	}
}

func TestDebugWebSocketSnapshotCaptureDoesNotCloseLiveConnection(t *testing.T) {
	const panelID = "websocket_snapshot_capture_isolation"

	debugregistry.UnregisterPanel(panelID)
	t.Cleanup(func() { debugregistry.UnregisterPanel(panelID) })

	var hook *DebugQueryHook
	if err := debugregistry.RegisterPanel(panelID, debugregistry.PanelConfig{
		SnapshotKey: panelID,
		Snapshot: func(ctx context.Context) any {
			for range debugSubscriberBuffer + 1 {
				hook.AfterQuery(ctx, &bun.QueryEvent{
					Query:     "SELECT snapshot_internal",
					StartTime: time.Now(),
				})
			}
			return map[string]any{"ready": true}
		},
	}); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	cfg := DebugConfig{
		CaptureSQL: true,
		Panels:     []string{DebugPanelSQL, panelID},
	}
	collector := NewDebugCollector(cfg)
	hook = NewDebugQueryHook(collector)
	mod := NewDebugModule(cfg)
	mod.collector = collector

	ctx, cancel := context.WithCancel(context.Background())
	ws := newBlockingDebugWebSocketContext(ctx, nil)
	handled := make(chan error, 1)
	go func() {
		handled <- mod.handleDebugWebSocket(ws)
	}()
	waitForDebugWebSocketSignal(t, ws.readStarted, "reader start after initial snapshot")

	select {
	case err := <-handled:
		t.Fatalf("websocket returned immediately after snapshot: %v", err)
	default:
	}

	hook.AfterQuery(context.Background(), &bun.QueryEvent{
		Query:     "SELECT application_request",
		StartTime: time.Now(),
	})
	deadline := time.Now().Add(time.Second)
	for ws.writeCount.Load() < 2 && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if got := ws.writeCount.Load(); got < 2 {
		t.Fatalf("ordinary live SQL was not written after snapshot; writes=%d", got)
	}

	cancel()
	select {
	case err := <-handled:
		if err != nil {
			t.Fatalf("websocket shutdown: %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("websocket did not stop after cancellation")
	}
}

func TestDebugWebSocketUnrelatedBurstRecoversSnapshotWithoutReconnect(t *testing.T) {
	const panelID = "websocket_external_snapshot_burst"
	debugregistry.UnregisterPanel(panelID)
	t.Cleanup(func() { debugregistry.UnregisterPanel(panelID) })

	snapshotStarted := make(chan struct{})
	releaseSnapshot := make(chan struct{})
	if err := debugregistry.RegisterPanel(panelID, debugregistry.PanelConfig{
		SnapshotKey: panelID,
		Snapshot: func(context.Context) any {
			close(snapshotStarted)
			<-releaseSnapshot
			return map[string]any{"ready": true}
		},
	}); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	cfg := DebugConfig{Panels: []string{panelID}, SnapshotTimeout: time.Second}
	collector := NewDebugCollector(cfg)
	mod := NewDebugModule(cfg)
	mod.collector = collector
	ctx, cancel := context.WithCancel(context.Background())
	ws := newBlockingDebugWebSocketContext(ctx, nil)
	handled := make(chan error, 1)
	go func() { handled <- mod.handleDebugWebSocket(ws) }()

	waitForDebugWebSocketSignal(t, ws.readStarted, "reader start")
	waitForDebugWebSocketSignal(t, snapshotStarted, "slow snapshot start")
	for index := range debugSubscriberBuffer + 3 {
		collector.publish("external_request", map[string]any{"index": index})
	}
	select {
	case err := <-handled:
		t.Fatalf("unrelated traffic closed websocket during snapshot: %v", err)
	default:
	}
	close(releaseSnapshot)
	waitForDebugWebSocketWrites(t, ws, 4)

	cancel()
	if err := <-handled; err != nil {
		t.Fatalf("websocket shutdown: %v", err)
	}
	foundRecovery := false
	for _, raw := range ws.writes {
		if event, ok := raw.(DebugEvent); ok && event.Type == debugEventSnapshotInvalidated {
			foundRecovery = true
			break
		}
	}
	if !foundRecovery {
		t.Fatalf("writes did not contain snapshot recovery: %#v", ws.writes)
	}
}

type debugSnapshotContextKey struct{}

func TestDebugWebSocketSnapshotPreservesAccessValuesAndHonorsTimeout(t *testing.T) {
	const panelID = "websocket_snapshot_timeout"
	debugregistry.UnregisterPanel(panelID)
	t.Cleanup(func() { debugregistry.UnregisterPanel(panelID) })

	seenValue := make(chan any, 1)
	if err := debugregistry.RegisterPanel(panelID, debugregistry.PanelConfig{
		SnapshotKey: panelID,
		Snapshot: func(ctx context.Context) any {
			seenValue <- ctx.Value(debugSnapshotContextKey{})
			<-ctx.Done()
			return map[string]any{"canceled": true}
		},
	}); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	cfg := DebugConfig{Panels: []string{panelID}, SnapshotTimeout: 20 * time.Millisecond}
	mod := NewDebugModule(cfg)
	mod.collector = NewDebugCollector(cfg)
	access := &commandRunWebSocketAccess{
		ctx: context.WithValue(context.Background(), debugSnapshotContextKey{}, "tenant-value"),
	}
	ws := newStubWebSocketContext()
	err := mod.writeDebugSnapshot(ws, access)
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("snapshot error = %v, want deadline exceeded", err)
	}
	if value := <-seenValue; value != "tenant-value" {
		t.Fatalf("snapshot access value = %v", value)
	}
	if len(ws.writes) != 0 {
		t.Fatalf("timed out snapshot was written: %#v", ws.writes)
	}
}

func TestDebugWebSocketDisconnectCancelsInitialSnapshotAndClassifiesReadFailure(t *testing.T) {
	const panelID = "websocket_snapshot_disconnect"
	debugregistry.UnregisterPanel(panelID)
	t.Cleanup(func() { debugregistry.UnregisterPanel(panelID) })

	snapshotStarted := make(chan struct{})
	snapshotCanceled := make(chan error, 1)
	if err := debugregistry.RegisterPanel(panelID, debugregistry.PanelConfig{
		SnapshotKey: panelID,
		Snapshot: func(ctx context.Context) any {
			close(snapshotStarted)
			<-ctx.Done()
			snapshotCanceled <- ctx.Err()
			return nil
		},
	}); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	cfg := DebugConfig{Panels: []string{panelID}, SnapshotTimeout: time.Second}
	mod := NewDebugModule(cfg)
	mod.collector = NewDebugCollector(cfg)
	ws := newBlockingDebugWebSocketContext(context.Background(), nil)
	handled := make(chan error, 1)
	go func() { handled <- mod.handleDebugWebSocket(ws) }()

	waitForDebugWebSocketSignal(t, ws.readStarted, "reader before disconnect")
	waitForDebugWebSocketSignal(t, snapshotStarted, "initial snapshot")
	ws.releaseOnce.Do(func() { close(ws.readReleased) })

	select {
	case err := <-snapshotCanceled:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("snapshot cancellation = %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("disconnect did not cancel the snapshot")
	}
	select {
	case err := <-handled:
		if !errors.Is(err, errDebugWebSocketReadFailed) {
			t.Fatalf("handler error = %v, want classified read failure", err)
		}
	case <-time.After(time.Second):
		t.Fatal("handler did not return after reader failure")
	}
	waitForDebugWebSocketSignal(t, ws.readReturned, "reader completion")
	if got := ws.interruptCalls.Load(); got != 0 {
		t.Fatalf("natural reader failure interrupt calls = %d, want 0", got)
	}
	if got := ws.closeCalls.Load(); got != 1 || ws.closeBeforeRead.Load() {
		t.Fatalf("websocket teardown close_calls=%d close_before_read=%v", got, ws.closeBeforeRead.Load())
	}
}

func TestCollectorCommandRunPayloadRemainsAuthorizable(t *testing.T) {
	collector := NewDebugCollector(DebugConfig{Panels: []string{DebugPanelCommandRuns}})
	debugregistry.UnregisterPanel(DebugPanelCommandRuns)
	if err := debugregistry.RegisterPanel(DebugPanelCommandRuns, debugregistry.PanelConfig{EventTypes: []string{commandRunDebugEventType}}); err != nil {
		t.Fatalf("register panel: %v", err)
	}
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommandRuns) })
	events := collector.Subscribe("scope-shape")
	defer collector.Unsubscribe("scope-shape")
	collector.PublishEvent(commandRunDebugEventType, commandRunWebSocketTestRecord("run-a", "tenant-a"))
	event := <-events
	scope, ok := commandRunScopeFromDebugEvent(event)
	if !ok || scope.TenantID != "tenant-a" {
		t.Fatalf("masked collector payload lost trusted scope: %#v", event.Payload)
	}
}

func TestCommandRunWebSocketAccessRequiresExplicitGlobalAuthorization(t *testing.T) {
	record := DebugEvent{Type: commandRunDebugEventType, Payload: commandRunWebSocketTestRecord("run-a", "tenant-a")}
	missing := &commandRunWebSocketAccess{ctx: context.Background(), allowed: true, selector: CommandRunSelector{}}
	if missing.allows(record) {
		t.Fatal("missing scope authorized tenant event")
	}
	global := &commandRunWebSocketAccess{
		ctx: context.Background(), allowed: true, selector: CommandRunSelector{Global: true},
		authorizer: CommandRunScopeAuthorizerFuncs{Authorize: func(context.Context, CommandRunScope) (bool, error) { return true, nil }},
	}
	if !global.allows(record) {
		t.Fatal("explicit authorized global access rejected event")
	}
	global.authorizer = CommandRunScopeAuthorizerFuncs{Authorize: func(context.Context, CommandRunScope) (bool, error) { return false, nil }}
	if global.allows(record) {
		t.Fatal("global selector bypassed scope authorizer")
	}
}

func TestCommandRunWebSocketAccessOutlivesUpgradeContextCancellation(t *testing.T) {
	panel, _, _ := newCommandRunsPanelTestFixture(t, allowAuthorizer{})
	mod := NewDebugModule(DebugConfig{Panels: []string{DebugPanelCommandRuns}})
	mod.admin = panel.admin
	upgradeCtx, cancel := context.WithCancel(context.WithValue(context.Background(), tenantIDContextKey, "tenant-a"))
	access := mod.commandRunAccess(upgradeCtx)
	cancel()
	if access.ctx.Err() != nil {
		t.Fatalf("retained websocket access inherited upgrade cancellation: %v", access.ctx.Err())
	}
	event := DebugEvent{Type: commandRunDebugEventType, Payload: commandRunWebSocketTestRecord("run-a", "tenant-a")}
	if !access.allows(event) {
		t.Fatal("retained websocket access stopped authorizing after upgrade cancellation")
	}
}

func commandRunWebSocketTestRecord(runID, tenantID string) CommandRunRecord {
	update := validCommandRunUpdate()
	update.RunID = runID
	update.Scope = CommandRunScope{ApplicationID: "app", EnvironmentID: "test", TenantID: tenantID}
	return CommandRunRecord{CommandRunUpdate: update, FirstOccurredAt: update.OccurredAt, UpdatedAt: update.OccurredAt}
}

func assertCommandRunSnapshotForTenant(t *testing.T, writes []any, wantRunID string) {
	t.Helper()
	if len(writes) != 1 {
		t.Fatalf("snapshot writes=%d", len(writes))
	}
	event, ok := writes[0].(DebugEvent)
	if !ok || event.Type != debugEventSnapshot {
		t.Fatalf("snapshot event=%#v", writes[0])
	}
	snapshot, ok := event.Payload.(map[string]any)
	if !ok {
		t.Fatalf("snapshot payload=%#v", event.Payload)
	}
	rows, ok := snapshot[DebugPanelCommandRuns].(CommandRunsSnapshot)
	if !ok || len(rows) != 1 || rows[0].RunID != wantRunID {
		t.Fatalf("command run rows=%#v want=%s", snapshot[DebugPanelCommandRuns], wantRunID)
	}
}

func assertCommandRunSnapshotRevision(t *testing.T, writes []any, wantRunID string, wantRevision uint64) {
	t.Helper()
	if len(writes) == 0 {
		t.Fatal("expected snapshot before websocket loop")
	}
	event, ok := writes[0].(DebugEvent)
	if !ok || event.Type != debugEventSnapshot {
		t.Fatalf("first websocket write=%#v, want snapshot", writes[0])
	}
	snapshot, ok := event.Payload.(map[string]any)
	if !ok {
		t.Fatalf("snapshot payload=%#v", event.Payload)
	}
	rows, ok := snapshot[DebugPanelCommandRuns].(CommandRunsSnapshot)
	if !ok || len(rows) != 1 || rows[0].RunID != wantRunID || rows[0].Revision != wantRevision {
		t.Fatalf("command run rows=%#v, want run=%s revision=%d", snapshot[DebugPanelCommandRuns], wantRunID, wantRevision)
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
