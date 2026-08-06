package admin

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"

	debugregistry "github.com/goliatone/go-admin/debug"
	gocommand "github.com/goliatone/go-command"
)

type commandRunsDenyAuthorizer struct{}

func (commandRunsDenyAuthorizer) Can(context.Context, string, string) bool { return false }

type commandRunsPermissionAuthorizer struct {
	allowed map[string]bool
}

type commandRunClearRaceStore struct {
	store  *MemoryCommandRunStore
	once   sync.Once
	inject func()
}

func (s *commandRunClearRaceStore) Apply(ctx context.Context, update CommandRunUpdate) (CommandRunRecord, bool, error) {
	return s.store.Apply(ctx, update)
}

func (s *commandRunClearRaceStore) List(ctx context.Context, selector CommandRunSelector) ([]CommandRunRecord, error) {
	return s.store.List(ctx, selector)
}

func (s *commandRunClearRaceStore) Clear(ctx context.Context, selector CommandRunSelector) error {
	return s.store.Clear(ctx, selector)
}

func (s *commandRunClearRaceStore) SnapshotForCommandRunClear(ctx context.Context, selector CommandRunSelector) (CommandRunClearSnapshot, error) {
	return s.store.SnapshotForCommandRunClear(ctx, selector)
}

func (s *commandRunClearRaceStore) ClearCommandRunsIfUnchanged(ctx context.Context, selector CommandRunSelector, version uint64) (bool, error) {
	s.once.Do(s.inject)
	return s.store.ClearCommandRunsIfUnchanged(ctx, selector, version)
}

type legacyCommandRunClearStore struct {
	store      *MemoryCommandRunStore
	clearCalls int
}

func (s *legacyCommandRunClearStore) Apply(ctx context.Context, update CommandRunUpdate) (CommandRunRecord, bool, error) {
	return s.store.Apply(ctx, update)
}

func (s *legacyCommandRunClearStore) List(ctx context.Context, selector CommandRunSelector) ([]CommandRunRecord, error) {
	return s.store.List(ctx, selector)
}

func (s *legacyCommandRunClearStore) Clear(ctx context.Context, selector CommandRunSelector) error {
	s.clearCalls++
	return s.store.Clear(ctx, selector)
}

func (a commandRunsPermissionAuthorizer) Can(_ context.Context, permission string, resource string) bool {
	return a.allowed[permission+"|"+resource]
}

func TestCommandRunsPanelDefinitionContract(t *testing.T) {
	panel, _, _ := newCommandRunsPanelTestFixture(t, allowAuthorizer{})
	RegisterCommandRunsDebugPanel(panel.admin)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommandRuns) })

	definition, ok := debugregistry.PanelDefinitionForContext(context.Background(), DebugPanelCommandRuns)
	if !ok {
		t.Fatal("command runs panel was not registered")
	}
	if definition.ID != DebugPanelCommandRuns || definition.SnapshotKey != DebugPanelCommandRuns {
		t.Fatalf("definition identity = %+v", definition)
	}
	if definition.Icon != "iconoir-list" {
		t.Fatalf("definition icon = %q, want iconoir-list", definition.Icon)
	}
	if len(definition.EventTypes) != 1 || definition.EventTypes[0] != commandRunDebugEventType {
		t.Fatalf("event types = %+v", definition.EventTypes)
	}
	if definition.UI == nil || definition.UI.Events == nil || definition.UI.Events.Mode != debugregistry.PanelEventUpsert || definition.UI.Events.Key != "run_id" {
		t.Fatalf("event policy = %+v", definition.UI)
	}
	if definition.UI.Count == nil || definition.UI.Count.Mode != debugregistry.PanelCountArrayLength || len(definition.UI.Filters) != 6 {
		t.Fatalf("count/filters = %+v", definition.UI)
	}
	if definition.Metadata["deep_link_key"] != "run_id" || definition.Metadata["deep_link_fallback"] != "dispatch_id" {
		t.Fatalf("deep-link metadata = %+v", definition.Metadata)
	}
	deepLinkKeys, ok := definition.Metadata["deep_link_keys"].([]string)
	if !ok || len(deepLinkKeys) != 3 || deepLinkKeys[0] != "run_id" ||
		deepLinkKeys[1] != "dispatch_id" || deepLinkKeys[2] != "correlation_id" {
		t.Fatalf("deep-link keys = %#v", definition.Metadata["deep_link_keys"])
	}
}

func TestCommandRunsPanelSnapshotClearAndLookupAreScoped(t *testing.T) {
	panel, runtime, store := newCommandRunsPanelTestFixture(t, allowAuthorizer{})
	RegisterCommandRunsDebugPanel(panel.admin)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommandRuns) })
	collector := NewDebugCollector(DebugConfig{Panels: []string{DebugPanelCommandRuns}})
	applyCommandRunPanelUpdate(t, store, "run-a", "corr-a", "tenant-a", 1)
	applyCommandRunPanelUpdate(t, store, "run-b", "corr-b", "tenant-b", 1)

	ctx := context.WithValue(context.Background(), tenantIDContextKey, "tenant-a")
	snapshot := panel.Snapshot(ctx)
	if len(snapshot) != 1 || snapshot[0].RunID != "run-a" {
		t.Fatalf("tenant snapshot = %+v", snapshot)
	}
	byRun, found, lookupErr := panel.Lookup(ctx, "run-a")
	if lookupErr != nil || !found || byRun.CorrelationID != "corr-a" {
		t.Fatalf("run lookup = %+v found=%v err=%v", byRun, found, lookupErr)
	}
	byDispatch, found, lookupErr := panel.Lookup(ctx, "dispatch-run-a")
	if lookupErr != nil || !found || byDispatch.RunID != "run-a" {
		t.Fatalf("dispatch lookup = %+v found=%v err=%v", byDispatch, found, lookupErr)
	}
	byCorrelation, found, lookupErr := panel.Lookup(ctx, "corr-a")
	if lookupErr != nil || !found || byCorrelation.RunID != "run-a" {
		t.Fatalf("correlation lookup = %+v found=%v err=%v", byCorrelation, found, lookupErr)
	}
	if _, found, err := panel.Lookup(ctx, "run-b"); err != nil || found {
		t.Fatalf("cross-scope lookup found=%v err=%v", found, err)
	}
	if !collector.ClearPanelWithContext(ctx, DebugPanelCommandRuns) {
		t.Fatal("scoped collector clear did not find panel")
	}
	rows, err := runtime.Store().List(context.Background(), CommandRunSelector{Global: true})
	if err != nil || len(rows) != 1 || rows[0].RunID != "run-b" {
		t.Fatalf("rows after scoped clear = %+v err=%v", rows, err)
	}
}

func TestCommandRunsLookupUsesIdentifierPrecedenceAndNewestCorrelationMatch(t *testing.T) {
	panel, _, store := newCommandRunsPanelTestFixture(t, allowAuthorizer{})
	ctx := context.WithValue(context.Background(), tenantIDContextKey, "tenant-a")

	applyCommandRunPanelUpdate(t, store, "shared", "corr-run", "tenant-a", 1)
	applyCommandRunPanelUpdate(t, store, "dispatch-owner", "corr-dispatch", "tenant-a", 1)
	applyCommandRunPanelUpdate(t, store, "correlation-owner", "shared", "tenant-a", 1)

	record, found, err := panel.Lookup(ctx, "shared")
	if err != nil || !found || record.RunID != "shared" {
		t.Fatalf("run precedence lookup = %+v found=%v err=%v", record, found, err)
	}

	applyCommandRunPanelUpdate(t, store, "correlation-dispatch", "dispatch-dispatch-owner", "tenant-a", 1)
	record, found, err = panel.Lookup(ctx, "dispatch-dispatch-owner")
	if err != nil || !found || record.RunID != "dispatch-owner" {
		t.Fatalf("dispatch precedence lookup = %+v found=%v err=%v", record, found, err)
	}

	applyCommandRunPanelUpdate(t, store, "corr-old", "corr-shared", "tenant-a", 1)
	applyCommandRunPanelUpdate(t, store, "corr-new", "corr-shared", "tenant-a", 1)
	record, found, err = panel.Lookup(ctx, "corr-shared")
	if err != nil || !found || record.RunID != "corr-new" {
		t.Fatalf("newest correlation lookup = %+v found=%v err=%v", record, found, err)
	}
}

func TestCommandRunsPanelIsInertWithoutPermission(t *testing.T) {
	panel, _, store := newCommandRunsPanelTestFixture(t, commandRunsDenyAuthorizer{})
	applyCommandRunPanelUpdate(t, store, "run-a", "corr-a", "tenant-a", 1)
	if snapshot := panel.Snapshot(context.Background()); len(snapshot) != 0 {
		t.Fatalf("denied snapshot = %+v", snapshot)
	}
	RegisterCommandRunsDebugPanel(panel.admin)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommandRuns) })
	definition, ok := debugregistry.PanelDefinitionForContext(context.Background(), DebugPanelCommandRuns)
	if !ok || definition.UI != nil || len(definition.EventTypes) != 0 || definition.Metadata["available"] != false {
		t.Fatalf("denied definition = %+v", definition)
	}
}

func TestCommandRunsPanelAppliesScopeAuthorizerToSnapshotAndClear(t *testing.T) {
	scopeAuthorizer := CommandRunScopeAuthorizerFuncs{
		Selector: func(context.Context) (CommandRunSelector, error) {
			return CommandRunSelector{Global: true}, nil
		},
		Authorize: func(_ context.Context, scope CommandRunScope) (bool, error) {
			return scope.TenantID == "tenant-a", nil
		},
	}
	runtime, runtimeErr := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, ApplicationID: "app", EnvironmentID: "test", ScopeAuthorizer: scopeAuthorizer,
	})
	if runtimeErr != nil {
		t.Fatalf("new runtime: %v", runtimeErr)
	}
	adm := &Admin{
		authorizer:        allowAuthorizer{},
		commandRunRuntime: runtime,
		commandCatalog: commandLauncherTestCatalog{descriptors: []gocommand.CommandDescriptor{
			{ID: "jobs.reindex", ExposeInAdmin: true},
		}},
	}
	panel := NewCommandRunsDebugPanel(adm)
	applyCommandRunPanelUpdate(t, runtime.Store(), "run-a", "corr-a", "tenant-a", 1)
	applyCommandRunPanelUpdate(t, runtime.Store(), "run-b", "corr-b", "tenant-b", 1)

	rows := panel.Snapshot(context.Background())
	if len(rows) != 1 || rows[0].RunID != "run-a" {
		t.Fatalf("authorized snapshot = %+v", rows)
	}
	if err := panel.Clear(context.Background()); !errors.Is(err, ErrForbidden) {
		t.Fatalf("mixed-scope global clear error=%v, want forbidden", err)
	}
	remaining, err := runtime.Store().List(context.Background(), CommandRunSelector{Global: true})
	if err != nil || len(remaining) != 2 {
		t.Fatalf("fail-closed clear changed store rows=%+v err=%v", remaining, err)
	}
}

func TestCommandRunsRecordAuthorizationTruthTable(t *testing.T) {
	policyCalls := map[string]int{}
	recordPolicy := CommandRunRecordAuthorizerFunc(func(_ context.Context, record CommandRunRecord) (bool, error) {
		policyCalls[record.CommandID]++
		switch record.CommandID {
		case "jobs.restricted":
			return false, nil
		case "jobs.error":
			return false, errors.New("policy failed")
		default:
			return true, nil
		}
	})
	runtime, runtimeErr := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, ApplicationID: "app", EnvironmentID: "test", RecordAuthorizer: recordPolicy,
	})
	if runtimeErr != nil {
		t.Fatalf("new runtime: %v", runtimeErr)
	}
	authorizer := commandRunsPermissionAuthorizer{allowed: map[string]bool{
		commandRunReadPermission + "|" + defaultRPCCommandResource: true,
		"jobs.view|job": true,
	}}
	adm := &Admin{
		authorizer:        authorizer,
		commandRunRuntime: runtime,
		commandCatalog: commandLauncherTestCatalog{descriptors: []gocommand.CommandDescriptor{
			{ID: "jobs.allowed", ExposeInAdmin: true, Permissions: []string{"jobs.view"}, DisplayHints: map[string]any{"resource": "job"}},
			{ID: "jobs.restricted", ExposeInAdmin: true, Permissions: []string{"jobs.view"}, DisplayHints: map[string]any{"resource": "job"}},
			{ID: "jobs.denied", ExposeInAdmin: true, Permissions: []string{"jobs.secret"}, DisplayHints: map[string]any{"resource": "job"}},
			{ID: "jobs.hidden", ExposeInAdmin: false},
			{ID: "jobs.error", ExposeInAdmin: true, Permissions: []string{"jobs.view"}, DisplayHints: map[string]any{"resource": "job"}},
			{MessageType: "jobs.fallback", Exposure: gocommand.CommandExposure{ExposeInAdmin: true}},
			{ID: " jobs.normalized ", ExposeInAdmin: true},
			{ID: "jobs.duplicate", ExposeInAdmin: true},
			{ID: "jobs.duplicate", ExposeInAdmin: true},
		}},
	}
	panel := NewCommandRunsDebugPanel(adm)
	for _, commandID := range []string{
		"jobs.allowed", "jobs.restricted", "jobs.denied", "jobs.hidden",
		"jobs.error", "jobs.fallback", "jobs.normalized", "jobs.duplicate", "jobs.unknown",
	} {
		applyCommandRunPanelUpdateForCommand(t, runtime.Store(), "run-"+commandID, commandID, "tenant-a", 1)
	}

	ctx := context.WithValue(context.Background(), tenantIDContextKey, "tenant-a")
	rows := panel.Snapshot(ctx)
	got := map[string]bool{}
	for _, row := range rows {
		got[row.CommandID] = true
	}
	for _, commandID := range []string{"jobs.allowed", "jobs.fallback", "jobs.normalized", "jobs.unknown"} {
		if !got[commandID] {
			t.Errorf("eligible command %q missing from snapshot: %+v", commandID, rows)
		}
	}
	for _, commandID := range []string{"jobs.restricted", "jobs.denied", "jobs.hidden", "jobs.error", "jobs.duplicate"} {
		if got[commandID] {
			t.Errorf("ineligible command %q exposed in snapshot", commandID)
		}
	}
	for _, commandID := range []string{"jobs.denied", "jobs.hidden", "jobs.duplicate"} {
		if policyCalls[commandID] != 0 {
			t.Errorf("host policy overrode known launcher-ineligible %q", commandID)
		}
	}

	if _, found, lookupErr := panel.Lookup(ctx, "run-jobs.denied"); lookupErr != nil || found {
		t.Fatalf("unauthorized lookup found=%v err=%v", found, lookupErr)
	}
	if _, found, lookupErr := panel.Lookup(ctx, "does-not-exist"); lookupErr != nil || found {
		t.Fatalf("missing lookup found=%v err=%v", found, lookupErr)
	}
	if err := panel.Clear(ctx); !errors.Is(err, ErrForbidden) {
		t.Fatalf("mixed-visibility clear error=%v, want forbidden", err)
	}
	remaining, err := runtime.Store().List(context.Background(), CommandRunSelector{Global: true})
	if err != nil || len(remaining) != 9 {
		t.Fatalf("denied clear changed store rows=%d err=%v", len(remaining), err)
	}
}

func TestCommandRunsUnknownRecordsRequireExplicitHostPolicy(t *testing.T) {
	runtime, runtimeErr := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, ApplicationID: "app", EnvironmentID: "test",
	})
	if runtimeErr != nil {
		t.Fatalf("new runtime: %v", runtimeErr)
	}
	adm := &Admin{authorizer: allowAuthorizer{}, commandRunRuntime: runtime}
	panel := NewCommandRunsDebugPanel(adm)
	applyCommandRunPanelUpdateForCommand(t, runtime.Store(), "run-unknown", "jobs.unknown", "", 1)
	if rows := panel.Snapshot(context.Background()); len(rows) != 0 {
		t.Fatalf("unknown record exposed without policy: %+v", rows)
	}
	runtime.config.RecordAuthorizer = CommandRunRecordAuthorizerFunc(func(context.Context, CommandRunRecord) (bool, error) {
		return true, nil
	})
	if rows := panel.Snapshot(context.Background()); len(rows) != 1 || rows[0].RunID != "run-unknown" {
		t.Fatalf("explicit unknown policy rows=%+v", rows)
	}
}

func TestCommandRunsClearRejectsRecordInsertedAfterAuthorizationSnapshot(t *testing.T) {
	memory := newTestCommandRunStore(t, 10, 20)
	racing := &commandRunClearRaceStore{store: memory}
	runtime, runtimeErr := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, ApplicationID: "app", EnvironmentID: "test", Store: racing,
	})
	if runtimeErr != nil {
		t.Fatalf("new runtime: %v", runtimeErr)
	}
	adm := &Admin{
		authorizer:        allowAuthorizer{},
		commandRunRuntime: runtime,
		commandCatalog: commandLauncherTestCatalog{descriptors: []gocommand.CommandDescriptor{
			{ID: "jobs.visible", ExposeInAdmin: true},
			{ID: "jobs.hidden", ExposeInAdmin: false},
		}},
	}
	applyCommandRunPanelUpdateForCommand(t, racing, "run-visible", "jobs.visible", "", 1)
	racing.inject = func() {
		applyCommandRunPanelUpdateForCommand(t, racing, "run-hidden", "jobs.hidden", "", 1)
	}
	if err := NewCommandRunsDebugPanel(adm).Clear(context.Background()); !errors.Is(err, ErrForbidden) {
		t.Fatalf("racing clear error=%v, want forbidden", err)
	}
	rows, err := racing.List(context.Background(), CommandRunSelector{Global: true})
	if err != nil || len(rows) != 2 {
		t.Fatalf("racing clear rows=%+v err=%v", rows, err)
	}
}

func TestCommandRunsClearFailsClosedForLegacyStore(t *testing.T) {
	legacy := &legacyCommandRunClearStore{store: newTestCommandRunStore(t, 10, 20)}
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, ApplicationID: "app", EnvironmentID: "test", Store: legacy,
	})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	adm := &Admin{
		authorizer:        allowAuthorizer{},
		commandRunRuntime: runtime,
		commandCatalog: commandLauncherTestCatalog{descriptors: []gocommand.CommandDescriptor{
			{ID: "jobs.reindex", ExposeInAdmin: true},
		}},
	}
	applyCommandRunPanelUpdateForCommand(t, legacy, "run-visible", "jobs.reindex", "", 1)
	if err := NewCommandRunsDebugPanel(adm).Clear(context.Background()); !errors.Is(err, ErrForbidden) {
		t.Fatalf("legacy clear error=%v, want forbidden", err)
	}
	if legacy.clearCalls != 0 {
		t.Fatalf("legacy clear calls=%d, want 0", legacy.clearCalls)
	}
}

func TestCommandRunsPanelSnapshotRowsAreCompleteAndJSONSafe(t *testing.T) {
	panel, _, store := newCommandRunsPanelTestFixture(t, allowAuthorizer{})
	update := validCommandRunUpdate()
	update.RunID = "run-safe"
	update.EventID = "event-safe"
	update.Scope = CommandRunScope{ApplicationID: "app", EnvironmentID: "test"}
	update.Metadata = map[string]any{"worker": "one"}
	if _, _, err := store.Apply(context.Background(), update); err != nil {
		t.Fatalf("apply: %v", err)
	}
	rows := panel.Snapshot(context.Background())
	if len(rows) != 1 || rows[0].SchemaVersion != CommandRunSchemaVersion || rows[0].UpdatedAt.IsZero() || rows[0].Metadata["worker"] != "one" {
		t.Fatalf("snapshot row = %+v", rows)
	}
	encoded, err := json.Marshal(rows[0])
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var raw map[string]any
	if err := json.Unmarshal(encoded, &raw); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	for _, forbidden := range []string{"error", "payload", "idempotency_key", "provider"} {
		if _, exists := raw[forbidden]; exists {
			t.Fatalf("unsafe field %q in row: %s", forbidden, encoded)
		}
	}
}

func TestNormalizeDebugConfigAddsCommandRunsOnlyToDefaultPanels(t *testing.T) {
	defaulted := normalizeDebugConfig(DebugConfig{CommandRuns: CommandRunRuntimeConfig{Enabled: true}}, "/admin")
	if !containsString(defaulted.Panels, DebugPanelCommandRuns) {
		t.Fatalf("default panels = %+v", defaulted.Panels)
	}
	explicit := normalizeDebugConfig(DebugConfig{
		CommandRuns: CommandRunRuntimeConfig{Enabled: true}, Panels: []string{DebugPanelLogs},
	}, "/admin")
	if containsString(explicit.Panels, DebugPanelCommandRuns) {
		t.Fatalf("explicit panel allowlist was expanded: %+v", explicit.Panels)
	}
}

func newCommandRunsPanelTestFixture(t *testing.T, authorizer Authorizer) (*CommandRunsDebugPanel, *CommandRunRuntime, CommandRunStore) {
	t.Helper()
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, ApplicationID: "app", EnvironmentID: "test",
	})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	adm := &Admin{
		authorizer:        authorizer,
		commandRunRuntime: runtime,
		commandCatalog: commandLauncherTestCatalog{descriptors: []gocommand.CommandDescriptor{
			{ID: "jobs.reindex", ExposeInAdmin: true},
		}},
	}
	return NewCommandRunsDebugPanel(adm), runtime, runtime.Store()
}

func newCommandRunsPermissionPanelFixture(t *testing.T) (*CommandRunsDebugPanel, *CommandRunRuntime) {
	t.Helper()
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, ApplicationID: "app", EnvironmentID: "test",
	})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	adm := &Admin{
		authorizer: commandRunsPermissionAuthorizer{allowed: map[string]bool{
			commandRunReadPermission + "|" + defaultRPCCommandResource: true,
			"jobs.allowed|job": true,
		}},
		commandRunRuntime: runtime,
		commandCatalog: commandLauncherTestCatalog{descriptors: []gocommand.CommandDescriptor{
			{ID: "jobs.allowed", ExposeInAdmin: true, Permissions: []string{"jobs.allowed"}, DisplayHints: map[string]any{"resource": "job"}},
			{ID: "jobs.denied", ExposeInAdmin: true, Permissions: []string{"jobs.denied"}, DisplayHints: map[string]any{"resource": "job"}},
		}},
	}
	return NewCommandRunsDebugPanel(adm), runtime
}

func applyCommandRunPanelUpdate(t *testing.T, store CommandRunStore, runID, correlationID, tenantID string, revision uint64) {
	t.Helper()
	update := validCommandRunUpdate()
	update.RunID = runID
	update.EventID = "event-" + runID
	update.DispatchID = "dispatch-" + runID
	update.CorrelationID = correlationID
	update.Revision = revision
	update.Scope = CommandRunScope{ApplicationID: "app", EnvironmentID: "test", TenantID: tenantID}
	if _, _, err := store.Apply(context.Background(), update); err != nil {
		t.Fatalf("apply %s: %v", runID, err)
	}
}

func applyCommandRunPanelUpdateForCommand(t *testing.T, store CommandRunStore, runID, commandID, tenantID string, revision uint64) {
	t.Helper()
	update := validCommandRunUpdate()
	update.RunID = runID
	update.EventID = "event-" + runID
	update.CommandID = commandID
	update.Revision = revision
	update.Scope = CommandRunScope{ApplicationID: "app", EnvironmentID: "test", TenantID: tenantID}
	if _, _, err := store.Apply(context.Background(), update); err != nil {
		t.Fatalf("apply %s: %v", runID, err)
	}
}
