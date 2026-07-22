package admin

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	debugregistry "github.com/goliatone/go-admin/debug"
)

type commandRunsDenyAuthorizer struct{}

func (commandRunsDenyAuthorizer) Can(context.Context, string, string) bool { return false }

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
	if len(definition.EventTypes) != 1 || definition.EventTypes[0] != commandRunDebugEventType {
		t.Fatalf("event types = %+v", definition.EventTypes)
	}
	if definition.UI == nil || definition.UI.Events == nil || definition.UI.Events.Mode != debugregistry.PanelEventUpsert || definition.UI.Events.Key != "run_id" {
		t.Fatalf("event policy = %+v", definition.UI)
	}
	if definition.UI.Count == nil || definition.UI.Count.Mode != debugregistry.PanelCountArrayLength || len(definition.UI.Filters) != 5 {
		t.Fatalf("count/filters = %+v", definition.UI)
	}
	if definition.Metadata["deep_link_key"] != "run_id" || definition.Metadata["deep_link_fallback"] != "correlation_id" {
		t.Fatalf("deep-link metadata = %+v", definition.Metadata)
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
	byRun, found, err := panel.Lookup(ctx, "run-a")
	if err != nil || !found || byRun.CorrelationID != "corr-a" {
		t.Fatalf("run lookup = %+v found=%v err=%v", byRun, found, err)
	}
	byCorrelation, found, err := panel.Lookup(ctx, "corr-a")
	if err != nil || !found || byCorrelation.RunID != "run-a" {
		t.Fatalf("correlation lookup = %+v found=%v err=%v", byCorrelation, found, err)
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
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, ApplicationID: "app", EnvironmentID: "test", ScopeAuthorizer: scopeAuthorizer,
	})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	adm := &Admin{authorizer: allowAuthorizer{}, commandRunRuntime: runtime}
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
	adm := &Admin{authorizer: authorizer, commandRunRuntime: runtime}
	return NewCommandRunsDebugPanel(adm), runtime, runtime.Store()
}

func applyCommandRunPanelUpdate(t *testing.T, store CommandRunStore, runID, correlationID, tenantID string, revision uint64) {
	t.Helper()
	update := validCommandRunUpdate()
	update.RunID = runID
	update.EventID = "event-" + runID
	update.CorrelationID = correlationID
	update.Revision = revision
	update.Scope = CommandRunScope{ApplicationID: "app", EnvironmentID: "test", TenantID: tenantID}
	if _, _, err := store.Apply(context.Background(), update); err != nil {
		t.Fatalf("apply %s: %v", runID, err)
	}
}
