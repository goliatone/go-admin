package admin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/console"
	admindata "github.com/goliatone/go-admin/data"
	gerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

func dataPanelTestDataset(id string) admindata.DatasetRef {
	return admindata.DatasetRef{Provider: "crm", ID: id, Version: "1", Digest: strings.Repeat("a", 64)}
}

func dataPanelTestScenario(id string) admindata.ScenarioRef {
	return admindata.ScenarioRef{Dataset: dataPanelTestDataset("corpus-a"), ID: id, Version: "1", ProfileHash: strings.Repeat("b", 64)}
}

func dataPanelTestOperation(kind admindata.Kind, state admindata.State, mutate func(*admindata.Operation)) admindata.Operation {
	operation := admindata.Operation{
		Result: admindata.Result{OperationID: "op-1", Kind: kind, State: state, Revision: 3, Phase: "accepted"},
		Target: admindata.TargetKey{ScopeKey: "synthetic-org", TargetID: "preview"},
		Input:  admindata.Input{Dataset: dataPanelTestDataset("corpus-a"), Scenario: dataPanelTestScenario("ready")},
	}
	if mutate != nil {
		mutate(&operation)
	}
	return operation
}

func dataPanelRecordJSON(t *testing.T, record console.Record) map[string]any {
	t.Helper()
	encoded, err := json.Marshal(record.Data)
	if err != nil {
		t.Fatalf("marshal record: %v", err)
	}
	var data map[string]any
	if err := json.Unmarshal(encoded, &data); err != nil {
		t.Fatalf("unmarshal record: %v", err)
	}
	return data
}

func dataPanelText(value any) string {
	text, ok := value.(string)
	if !ok {
		return ""
	}
	return text
}

func TestRegisterDataPanelsDeclaresSixOrderedReadOnlyViews(t *testing.T) {
	if err := RegisterDataPanels(nil); err == nil {
		t.Fatal("nil registry accepted")
	}
	registry := console.NewPanelRegistry()
	if err := RegisterDataPanels(registry); err != nil {
		t.Fatalf("register data panels: %v", err)
	}
	if err := RegisterDataPanels(registry); err == nil {
		t.Fatal("duplicate registration replaced panels")
	}
	previous := 0
	for _, id := range DataPanelIDs() {
		def, ok := registry.DefinitionForContext(context.Background(), id)
		if !ok {
			t.Fatalf("panel %q missing", id)
		}
		if def.Order <= previous || def.SupportsToolbar || def.Category != "data" {
			t.Fatalf("panel %q order/toolbar/category = %d/%v/%q", id, def.Order, def.SupportsToolbar, def.Category)
		}
		previous = def.Order
		if def.UI == nil || def.UI.SchemaVersion != console.PanelUISchemaVersion || def.UI.Views.Console == nil || def.UI.Views.Toolbar != nil {
			t.Fatalf("panel %q UI = %+v", id, def.UI)
		}
		if len(def.UI.Actions) != 0 {
			t.Fatalf("panel %q declares actions without module dispatchers: %+v", id, def.UI.Actions)
		}
		for _, filter := range def.UI.Filters {
			if filter.Kind == console.PanelFilterSelect && len(filter.Options) == 0 {
				t.Fatalf("panel %q select filter %q lost its options", id, filter.ID)
			}
		}
	}
	if overview, _ := registry.DefinitionForContext(context.Background(), DataPanelOverview); overview.UI.Views.Console.Renderer != console.PanelRendererStack || overview.UI.Count == nil {
		t.Fatalf("overview view/count = %+v", overview.UI)
	}
}

func TestDataOperationOutcomesKeepAcceptanceCompletionAndActivationDistinct(t *testing.T) {
	passed := &admindata.VerificationResult{ID: "ver-1", ContentRevision: 2, Checks: []admindata.Check{{ID: "search", Status: admindata.CheckPassed}}}
	failed := &admindata.VerificationResult{ID: "ver-2", ContentRevision: 2, Checks: []admindata.Check{{ID: "search", Status: admindata.CheckFailed}}}
	cases := []struct {
		name      string
		operation admindata.Operation
		want      string
	}{
		{"accepted", dataPanelTestOperation(admindata.Prepare, admindata.Queued, nil), "Accepted — not started"},
		{"running", dataPanelTestOperation(admindata.Prepare, admindata.Running, nil), "Running"},
		{"running phase", dataPanelTestOperation(admindata.Prepare, admindata.Running, func(o *admindata.Operation) { o.Result.Phase = "preparing" }), "Running — preparing"},
		{"recovering", dataPanelTestOperation(admindata.Activate, admindata.Running, func(o *admindata.Operation) { o.Result.Phase = "recovering" }), "Recovering — writes paused"},
		{"cancel requested", dataPanelTestOperation(admindata.Prepare, admindata.Running, func(o *admindata.Operation) { o.CancelRequested = true }), "Cancel requested"},
		{"prepared", dataPanelTestOperation(admindata.Prepare, admindata.Succeeded, nil), "Prepared — not verified or active"},
		{"refreshed", dataPanelTestOperation(admindata.Refresh, admindata.Succeeded, nil), "Prepared — not verified or active"},
		{"verified", dataPanelTestOperation(admindata.Verify, admindata.Succeeded, func(o *admindata.Operation) { o.Result.Verification = passed }), "Verified — not active"},
		{"verification failed", dataPanelTestOperation(admindata.Verify, admindata.Succeeded, func(o *admindata.Operation) { o.Result.Verification = failed }), "Verification failed — not active"},
		{"verification without evidence", dataPanelTestOperation(admindata.Verify, admindata.Succeeded, nil), "Verification finished — not active"},
		{"activated", dataPanelTestOperation(admindata.Activate, admindata.Succeeded, func(o *admindata.Operation) {
			o.Result.Active = true
			o.Result.Activation = &admindata.Activation{ReceiptID: "rcpt-1", Generation: 4, Ready: true}
		}), "Active — generation 4"},
		{"committed not ready", dataPanelTestOperation(admindata.Activate, admindata.Succeeded, func(o *admindata.Operation) {
			o.Result.Activation = &admindata.Activation{ReceiptID: "rcpt-1", Generation: 4}
		}), "Activation committed — not ready"},
		{"dry run", dataPanelTestOperation(admindata.Activate, admindata.Succeeded, func(o *admindata.Operation) {
			o.Result.DryRun = true
			o.Result.Active = true
		}), "Dry run planned — nothing changed"},
		{"validation problems", dataPanelTestOperation(admindata.Validate, admindata.Succeeded, func(o *admindata.Operation) {
			o.Result.Checks = []admindata.Check{{ID: "prerequisite.audiences", Status: admindata.CheckFailed}}
		}), "Validation found problems"},
		{"stale generation", dataPanelTestOperation(admindata.Activate, admindata.Failed, func(o *admindata.Operation) {
			o.Result.Failure = &admindata.Failure{Code: admindata.CodeStale}
		}), "Failed — stale generation"},
		{"fingerprint conflict", dataPanelTestOperation(admindata.Prepare, admindata.Failed, func(o *admindata.Operation) {
			o.Result.Failure = &admindata.Failure{Code: admindata.CodeConflict}
		}), "Failed — key reused with different input"},
		{"recovery required", dataPanelTestOperation(admindata.Activate, admindata.Failed, func(o *admindata.Operation) {
			o.Result.Failure = &admindata.Failure{Code: admindata.CodeRecovery}
		}), "Recovery required — writes blocked"},
		{"canceled", dataPanelTestOperation(admindata.Prepare, admindata.Canceled, nil), "Canceled"},
		{"unknown failure code", dataPanelTestOperation(admindata.Prepare, admindata.Failed, func(o *admindata.Operation) {
			o.Result.Failure = &admindata.Failure{Code: "driver: connection refused"}
		}), "Failed — provider error"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			data := dataPanelRecordJSON(t, DataOperationRecord(tc.operation))
			if got := data["outcome"]; got != tc.want {
				t.Fatalf("outcome = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestDataProjectionsExcludePrincipalsInputsAndProviderPaths(t *testing.T) {
	operation := dataPanelTestOperation(admindata.Prepare, admindata.Running, func(o *admindata.Operation) {
		o.Principal = admindata.Principal{ActorID: "operator-secret", ScopeKey: "scope-secret", ExecutionID: "exec-secret", ModuleHash: strings.Repeat("c", 64)}
		o.RecoveryPrincipal = &admindata.Principal{ActorID: "recovery-secret", ExecutionID: "recovery-exec-secret"}
		o.Input.IdempotencyKey = "key-secret"
		o.Fingerprint = "fingerprint-secret"
		o.StageID = "stage-secret"
		o.CreatedAt = time.Date(2026, 10, 1, 10, 0, 0, 0, time.UTC)
	})
	descriptor := admindata.Descriptor{
		Dataset:    dataPanelTestDataset("corpus-a"),
		Components: []admindata.Component{{Path: "private/people-secret.json", Digest: strings.Repeat("d", 64)}},
		Seed:       "seed-secret",
		Synthetic:  true,
	}
	for _, record := range []console.Record{DataOperationRecord(operation), DataDatasetRecord(descriptor, 1)} {
		encoded, err := json.Marshal(record)
		if err != nil {
			t.Fatalf("marshal record: %v", err)
		}
		for _, secret := range []string{"secret", strings.Repeat("c", 64)} {
			if strings.Contains(string(encoded), secret) {
				t.Fatalf("record leaked %q: %s", secret, encoded)
			}
		}
	}
	data := dataPanelRecordJSON(t, DataOperationRecord(operation))
	if data["created_at"] != "2026-10-01T10:00:00Z" || data["dataset_label"] != "crm/corpus-a v1" || data["scenario_label"] != "ready v1" {
		t.Fatalf("operation row = %+v", data)
	}
}

func TestDataTargetAndScenarioStatusesUseOnlyMatchingReceipts(t *testing.T) {
	receipt := &admindata.PreparationReceipt{ID: "rcpt-2", Dataset: dataPanelTestDataset("corpus-a"), Scenario: dataPanelTestScenario("ready"), ContentRevision: 2}
	target := func(id string) admindata.TargetKey { return admindata.TargetKey{ScopeKey: "org", TargetID: id} }
	overview := dataPanelRecordJSON(t, DataOverviewRecord(DataOverviewView{Targets: []DataTargetView{
		{State: admindata.ActiveState{Target: target("preview"), Activation: admindata.Activation{ReceiptID: "rcpt-1", Generation: 3, Ready: true}}, Receipt: receipt},
		{State: admindata.ActiveState{Target: target("staging"), RecoveryRequired: true, Activation: admindata.Activation{ReceiptID: "rcpt-1"}}},
		{State: admindata.ActiveState{Target: target("qa"), Transitioning: true, Activation: admindata.Activation{ReceiptID: "rcpt-1"}}},
		{State: admindata.ActiveState{Target: target("empty")}},
	}}, 1))
	primary, ok := overview["primary"].(map[string]any)
	if !ok || primary["status_label"] != "Active" || primary["dataset_label"] != nil {
		t.Fatalf("primary target labelled a non-active receipt: %+v", primary)
	}
	targets, ok := overview["targets"].([]any)
	if !ok || len(targets) != 4 {
		t.Fatalf("targets = %+v", overview["targets"])
	}
	var labels []string
	for _, target := range targets {
		row, ok := target.(map[string]any)
		if !ok {
			t.Fatalf("target row = %#v", target)
		}
		labels = append(labels, dataPanelText(row["status_label"]))
	}
	if want := []string{"Active", "Recovery required", "Switch in progress", "Nothing active"}; !slices.Equal(labels, want) {
		t.Fatalf("target statuses = %v, want %v", labels, want)
	}

	stale := *receipt
	stale.Verification = &admindata.VerificationResult{ID: "ver-1", ContentRevision: 1, Checks: []admindata.Check{{ID: "search", Status: admindata.CheckPassed}}}
	verified := *receipt
	verified.Verification = &admindata.VerificationResult{ID: "ver-2", ContentRevision: 2, Checks: []admindata.Check{{ID: "search", Status: admindata.CheckPassed}}}
	other := *receipt
	other.Scenario = dataPanelTestScenario("empty-history")
	for _, tc := range []struct {
		view DataScenarioView
		want string
	}{
		{DataScenarioView{Scenario: dataPanelTestScenario("ready")}, "Not prepared"},
		{DataScenarioView{Scenario: dataPanelTestScenario("ready"), TargetID: "preview", Receipt: &other}, "Not prepared"},
		{DataScenarioView{Scenario: dataPanelTestScenario("ready"), TargetID: "preview", Receipt: receipt}, "Prepared — not verified"},
		{DataScenarioView{Scenario: dataPanelTestScenario("ready"), TargetID: "preview", Receipt: &stale}, "Changed since verification"},
		{DataScenarioView{Scenario: dataPanelTestScenario("ready"), TargetID: "preview", Receipt: &verified}, "Verified — not active"},
		{DataScenarioView{Scenario: dataPanelTestScenario("ready"), TargetID: "preview", Receipt: &verified, Active: true}, "Active"},
	} {
		if got := dataPanelRecordJSON(t, DataScenarioRecord(tc.view, 1))["status_label"]; got != tc.want {
			t.Fatalf("scenario status = %q, want %q", got, tc.want)
		}
	}
}

func TestDataChecksCoverageAndCapabilitiesPresentSafeStates(t *testing.T) {
	for _, tc := range []struct {
		view DataCheckView
		want string
	}{
		{DataCheckView{Origin: admindata.Verify, Check: admindata.Check{ID: "search", Status: admindata.CheckPassed}}, "Passed"},
		{DataCheckView{Origin: admindata.Validate, Check: admindata.Check{ID: "prerequisite", Status: admindata.CheckFailed}}, "Failed"},
		{DataCheckView{Origin: admindata.Verify, DryRun: true, Check: admindata.Check{ID: "search", Status: admindata.CheckPassed}}, "Planned — not executed"},
		{DataCheckView{Origin: admindata.Verify, DryRun: true, Check: admindata.Check{ID: "export", Status: admindata.CheckUnavailable}}, "Unavailable"},
	} {
		if got := dataPanelRecordJSON(t, DataCheckRecord(tc.view, 1))["result"]; got != tc.want {
			t.Fatalf("check result = %q, want %q", got, tc.want)
		}
	}
	if got := dataPanelRecordJSON(t, DataCheckRecord(DataCheckView{Origin: admindata.Verify, DryRun: true}, 1))["source"]; got != "Dry-run plan" {
		t.Fatalf("dry-run source = %q", got)
	}

	for status, want := range map[string]string{
		admindata.CoveredEmpty: "Covered — no records", admindata.Uncovered: "Not covered", admindata.Partial: "Partially covered",
		admindata.PolicySuppressed: "Suppressed by policy", admindata.Unavailable: "Unavailable", "future_state": "future_state",
	} {
		record := DataCoverageRecord(DataCoverageView{VerificationID: "ver-1", Coverage: admindata.Coverage{Status: status, Sample: admindata.SamplePeriod{LocalDay: "2026-03-08", Timezone: "America/Los_Angeles"}}}, 1)
		if got := dataPanelRecordJSON(t, record)["coverage"]; got != want {
			t.Fatalf("coverage %q = %q, want %q", status, got, want)
		}
	}

	descriptor := admindata.Descriptor{Dataset: dataPanelTestDataset("corpus-a"), Capabilities: map[admindata.Kind]admindata.Capability{
		admindata.Prepare: {Supported: true, Permitted: true},
		admindata.Reset:   {Supported: false, Permitted: false, Reason: "target has no safe deactivation"},
		admindata.Verify:  {Supported: true, Permitted: false, Reason: "requires admin.data.verify"},
	}}
	data := dataPanelRecordJSON(t, DataDatasetRecord(descriptor, 1))
	if data["actions"] != "Prepare" || data["unavailable"] != "Verify: not permitted (requires admin.data.verify), Reset: unsupported (target has no safe deactivation)" {
		t.Fatalf("capability summary = %q / %q", data["actions"], data["unavailable"])
	}
}

func TestDataRecordKeysAreStableOpaqueAndRevisioned(t *testing.T) {
	scenario := dataPanelTestScenario("ready/../#1")
	first := DataScenarioRecord(DataScenarioView{Scenario: scenario, TargetID: "preview"}, 7)
	second := DataScenarioRecord(DataScenarioView{Scenario: scenario, TargetID: "preview"}, 8)
	other := DataScenarioRecord(DataScenarioView{Scenario: scenario, TargetID: "staging"}, 7)
	if first.Key != second.Key || first.Key == other.Key || strings.ContainsAny(first.Key, "/#.") || first.Revision != 7 || first.TargetID != "preview" {
		t.Fatalf("scenario keys/revision = %+v %+v %+v", first, second, other)
	}
	operation := DataOperationRecord(dataPanelTestOperation(admindata.Prepare, admindata.Running, nil))
	if operation.Key != "op-1" || operation.Revision != 3 || operation.TargetID != "preview" || operation.Generation != 0 {
		t.Fatalf("operation record = %+v", operation)
	}
	if overview := DataOverviewRecord(DataOverviewView{}, 2); overview.Key != DataOverviewRecordKey || overview.Revision != 2 {
		t.Fatalf("overview record = %+v", overview)
	}
}

func TestDataPanelsServeProjectedRecordsThroughAConsoleHost(t *testing.T) {
	registry := console.NewPanelRegistry()
	if err := RegisterDataPanels(registry); err != nil {
		t.Fatal(err)
	}
	records := map[string][]console.Record{
		DataPanelOverview:     {DataOverviewRecord(DataOverviewView{Targets: []DataTargetView{{State: admindata.ActiveState{Target: admindata.TargetKey{ScopeKey: "org", TargetID: "preview"}}}}}, 1)},
		DataPanelDatasets:     {DataDatasetRecord(admindata.Descriptor{Dataset: dataPanelTestDataset("corpus-a")}, 1)},
		DataPanelScenarios:    {DataScenarioRecord(DataScenarioView{Scenario: dataPanelTestScenario("ready")}, 1)},
		DataPanelOperations:   {DataOperationRecord(dataPanelTestOperation(admindata.Prepare, admindata.Queued, nil))},
		DataPanelVerification: {DataCheckRecord(DataCheckView{Origin: admindata.Verify, VerificationID: "ver-1", Check: admindata.Check{ID: "search", Status: admindata.CheckPassed}}, 1)},
		DataPanelCoverage:     {DataCoverageRecord(DataCoverageView{VerificationID: "ver-1", Coverage: admindata.Coverage{Status: admindata.CoveredEmpty}}, 1)},
	}
	identity := console.Identity{ConsoleID: "data", ApplicationID: "crm", EnvironmentID: "dev", ActorID: "viewer-1", ScopeKey: "org"}
	host, err := NewConsoleHost(ConsoleHostConfig{ID: "data", Registry: registry, Enabled: func() bool { return true },
		RequestIdentity: func(router.Context) (console.Identity, error) { return identity, nil },
		Access: ConsoleAccess{
			Resolve: func(ctx context.Context, current console.Identity) (context.Context, console.Identity, error) {
				return ctx, current, nil
			},
			Read:   func(context.Context, console.Identity) error { return nil },
			Panel:  func(context.Context, console.Identity, console.PanelDefinition) bool { return true },
			Record: func(context.Context, console.Identity, string, console.Record) bool { return true },
		},
		Snapshot: func(_ context.Context, _ console.Identity, panelID string) ([]console.Record, error) {
			return records[panelID], nil
		},
		RenderPage: func(router.Context, console.Bootstrap) error { return nil },
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := host.Close(); closeErr != nil {
			t.Errorf("close host: %v", closeErr)
		}
	})
	snapshot, err := host.Snapshot(context.Background(), identity)
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	served := map[string]int{}
	for _, panel := range snapshot.Panels {
		served[panel.ID] = len(panel.Records)
	}
	for _, id := range DataPanelIDs() {
		want := 1
		if id == DataPanelExplore {
			want = 0 // Explore reads lazily; it never carries snapshot records.
		}
		if served[id] != want {
			t.Fatalf("panel %q served %d records; host dropped a projected record: %+v", id, served[id], served)
		}
	}
}

func TestDataActionResultPresentsTypedOutcomesWithoutOverstatingActivation(t *testing.T) {
	denied := admindata.Error(admindata.CodeDenied)
	if result, err := DataActionResult(admindata.Prepare, admindata.Result{}, denied); !errors.Is(err, denied) || result.OK || result.Message != "" {
		t.Fatalf("denied must stay an error for the host's 403: %+v %v", result, err)
	}
	foreign := errors.New("transport failed")
	if _, err := DataActionResult(admindata.Prepare, admindata.Result{}, foreign); !errors.Is(err, foreign) {
		t.Fatalf("errors outside the Data contract must propagate: %v", err)
	}
	stale, err := DataActionResult(admindata.Activate, admindata.Result{}, fmt.Errorf("activate: %w", admindata.Error(admindata.CodeStale)))
	if err != nil || stale.OK || !stale.Refresh || !strings.Contains(stale.Message, "active dataset changed") {
		t.Fatalf("stale generation = %+v %v", stale, err)
	}
	invalid, err := DataActionResult(admindata.Prepare, admindata.Result{OperationID: "op-1", Kind: admindata.Prepare, State: admindata.Failed,
		Failure: &admindata.Failure{Code: admindata.CodeInvalid, Fields: map[string]string{"target_id": "unknown target"}}}, nil)
	if err != nil || invalid.OK || invalid.Errors["target_id"] != "unknown target" || invalid.Message != "The request is invalid. Check the highlighted fields." {
		t.Fatalf("field failure = %+v %v", invalid, err)
	}
	for _, tc := range []struct {
		name   string
		result admindata.Result
		want   string
	}{
		{"failed without failure record", admindata.Result{OperationID: "op-1", Kind: admindata.Prepare, State: admindata.Failed}, "The provider failed. Check the operation history for its recorded state."},
		{"canceled", admindata.Result{OperationID: "op-1", Kind: admindata.Prepare, State: admindata.Canceled}, "The operation was canceled."},
	} {
		presented, presentErr := DataActionResult(tc.result.Kind, tc.result, nil)
		if presentErr != nil || presented.OK || presented.Message != tc.want {
			t.Fatalf("%s = %+v %v", tc.name, presented, presentErr)
		}
	}
	requested, err := DataActionResult(admindata.Cancel, admindata.Result{OperationID: "op-7", Kind: admindata.Activate, State: admindata.Running}, nil)
	if err != nil || !requested.OK || requested.Message != "Cancellation requested for operation op-7. It stops at the next safe point; a committed activation is not undone." {
		t.Fatalf("cancel request = %+v %v", requested, err)
	}
	finished, err := DataActionResult(admindata.Cancel, admindata.Result{OperationID: "op-7", Kind: admindata.Activate, State: admindata.Succeeded, Active: true}, nil)
	if err != nil || !finished.OK || finished.Message != "Operation op-7 already finished as succeeded; nothing was canceled." {
		t.Fatalf("cancel after finish = %+v %v", finished, err)
	}

	passed := &admindata.VerificationResult{ID: "ver-1", ContentRevision: 1, Checks: []admindata.Check{{ID: "search", Status: admindata.CheckPassed}}}
	for _, tc := range []struct {
		result admindata.Result
		want   string
	}{
		{admindata.Result{OperationID: "op-1", Kind: admindata.Prepare, State: admindata.Queued}, "Accepted prepare operation op-1. It has not run yet; the active dataset is unchanged."},
		{admindata.Result{OperationID: "op-1", Kind: admindata.Refresh, State: admindata.Running}, "Refresh operation op-1 is running. The active dataset is unchanged until an activation completes."},
		{admindata.Result{OperationID: "op-1", Kind: admindata.Prepare, State: admindata.Succeeded, Receipt: &admindata.PreparationReceipt{ID: "rcpt-1"}}, "Prepared receipt rcpt-1. Verify and activate it to change the active dataset."},
		{admindata.Result{OperationID: "op-1", Kind: admindata.Verify, State: admindata.Succeeded, Receipt: &admindata.PreparationReceipt{ID: "rcpt-1"}, Verification: passed}, "Verified receipt rcpt-1. Activate it to change the active dataset."},
		{admindata.Result{OperationID: "op-1", Kind: admindata.Activate, State: admindata.Succeeded, Active: true, Activation: &admindata.Activation{ReceiptID: "rcpt-1", Generation: 4, Ready: true}}, "Activated receipt rcpt-1 at generation 4."},
		{admindata.Result{OperationID: "op-1", Kind: admindata.Activate, State: admindata.Succeeded, Activation: &admindata.Activation{ReceiptID: "rcpt-1", Generation: 4}}, "Activation committed at generation 4; the target is not ready yet."},
		{admindata.Result{OperationID: "op-1", Kind: admindata.Activate, State: admindata.Succeeded, DryRun: true, Checks: []admindata.Check{{ID: "a", Status: admindata.CheckPlanned}, {ID: "b", Status: admindata.CheckPlanned}}}, "Dry run planned for activate op-1. Nothing changed; 2 checks are planned, not executed."},
		// A same-key replay of an in-flight dry run reports its actual state, not a finished plan.
		{admindata.Result{OperationID: "op-1", Kind: admindata.Prepare, State: admindata.Queued, DryRun: true}, "Accepted dry run for prepare operation op-1. Planning has not run yet; nothing will change."},
		{admindata.Result{OperationID: "op-1", Kind: admindata.Activate, State: admindata.Running, DryRun: true}, "Activate dry run op-1 is planning. Nothing will change."},
		{admindata.Result{OperationID: "op-1", Kind: admindata.Validate, State: admindata.Succeeded, Checks: []admindata.Check{{ID: "a", Status: admindata.CheckFailed}, {ID: "b", Status: admindata.CheckPassed}}}, "Validation found problems in 1 of 2 checks."},
		{admindata.Result{OperationID: "op-1", Kind: admindata.Generate, State: admindata.Succeeded}, "Generated a dataset. Prepare it before use."},
	} {
		presented, err := DataActionResult(tc.result.Kind, tc.result, nil)
		if err != nil || !presented.OK || !presented.Refresh || presented.Message != tc.want || presented.Data != nil {
			t.Fatalf("%s/%s = %+v %v, want %q", tc.result.Kind, tc.result.State, presented, err, tc.want)
		}
		if tc.result.Kind != admindata.Activate && strings.Contains(presented.Message, "Activated") {
			t.Fatalf("%s outcome claims activation: %q", tc.result.Kind, presented.Message)
		}
	}
}

type dataPanelDispatch struct {
	kind  admindata.Kind
	input admindata.Input
}

func dataPanelActionHost(t *testing.T, actions DataPanelActions, execute map[admindata.Kind]bool) (*ConsoleHost, console.Identity) {
	t.Helper()
	registry := console.NewPanelRegistry()
	if err := RegisterDataPanels(registry, actions); err != nil {
		t.Fatal(err)
	}
	identity := console.Identity{ConsoleID: "data", ApplicationID: "crm", EnvironmentID: "dev", ActorID: "operator-1", ScopeKey: "org"}
	host, err := NewConsoleHost(ConsoleHostConfig{ID: "data", Registry: registry, Enabled: func() bool { return true },
		RequestIdentity: func(router.Context) (console.Identity, error) { return identity, nil },
		Access: ConsoleAccess{
			Resolve: func(ctx context.Context, current console.Identity) (context.Context, console.Identity, error) {
				return ctx, current, nil
			},
			Read:  func(context.Context, console.Identity) error { return nil },
			Panel: func(context.Context, console.Identity, console.PanelDefinition) bool { return true },
			Action: func(_ context.Context, _ console.Identity, _ string, actionID string) bool {
				kind, ok := DataActionKind(actionID)
				return ok && execute[kind]
			},
			Record: func(context.Context, console.Identity, string, console.Record) bool { return true },
		},
		Snapshot:   func(context.Context, console.Identity, string) ([]console.Record, error) { return nil, nil },
		RenderPage: func(router.Context, console.Bootstrap) error { return nil },
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := host.Close(); closeErr != nil {
			t.Errorf("close host: %v", closeErr)
		}
	})
	return host, identity
}

func dataPanelActions(t *testing.T, snapshot console.Snapshot, panelID string) []console.PanelUIAction {
	t.Helper()
	for _, panel := range snapshot.Panels {
		if panel.ID == panelID {
			return panel.UI.Actions
		}
	}
	t.Fatalf("panel %q missing", panelID)
	return nil
}

func TestDataPanelActionsDispatchOnlyAuthorizedServerChoices(t *testing.T) {
	generation := uint64(3)
	base := admindata.Input{Dataset: dataPanelTestDataset("corpus-a"), Scenario: dataPanelTestScenario("ready"), TargetID: "preview"}
	activate := base
	activate.ReceiptID, activate.ExpectedGeneration = "rcpt-1", &generation
	choices := []DataActionChoice{
		{Kind: admindata.Prepare, Label: "Prepare ready v1 on preview", Input: base},
		{Kind: admindata.Activate, Label: "Activate rcpt-1 on preview", Input: activate},
		{Kind: admindata.Cancel, Label: "Cancel op-0003", Input: admindata.Input{TargetID: "preview", OperationID: "op-0003"}},
	}
	var dispatched []dataPanelDispatch
	actions := DataPanelActions{
		Choices: func(context.Context) ([]DataActionChoice, error) { return choices, nil },
		Dispatch: func(_ context.Context, kind admindata.Kind, input admindata.Input) (admindata.Result, error) {
			dispatched = append(dispatched, dataPanelDispatch{kind, input})
			if kind == admindata.Cancel {
				return admindata.Result{OperationID: input.OperationID, Kind: admindata.Refresh, State: admindata.Running}, nil
			}
			return admindata.Result{OperationID: "op-9", Kind: kind, State: admindata.Queued}, nil
		},
	}
	host, identity := dataPanelActionHost(t, actions, map[admindata.Kind]bool{admindata.Prepare: true, admindata.Cancel: true})
	snapshot, err := host.Snapshot(context.Background(), identity)
	if err != nil {
		t.Fatal(err)
	}
	overview := dataPanelActions(t, snapshot, DataPanelOverview)
	if len(overview) != 1 || overview[0].Kind != "prepare" || overview[0].Label != "Prepare ready v1 on preview" || !overview[0].Refresh {
		t.Fatalf("overview actions = %+v; denied activation must stay hidden", overview)
	}
	cancel := dataPanelActions(t, snapshot, DataPanelOperations)
	if len(cancel) != 1 || !cancel[0].RequiresConfirm || slices.ContainsFunc(cancel[0].Fields, func(f console.PanelUIActionField) bool { return f.Name == "dry_run" }) {
		t.Fatalf("cancel actions = %+v", cancel)
	}
	if prepareKind, ok := DataActionKind(overview[0].ID); !ok || prepareKind != admindata.Prepare {
		t.Fatalf("action id %q kind = %q", overview[0].ID, prepareKind)
	}

	result, err := host.RunAction(context.Background(), identity, console.PanelActionRequest{PanelID: DataPanelOverview, ActionID: overview[0].ID, Payload: map[string]any{
		"idempotency_key": " key-1 ", "dry_run": true, "batch_limit": float64(50),
		"target_id": "production", "dataset": map[string]any{"id": "forged"}, "receipt_id": "forged",
	}})
	if err != nil || !result.OK || result.Message != "Accepted prepare operation op-9. It has not run yet; the active dataset is unchanged." {
		t.Fatalf("prepare = %+v %v", result, err)
	}
	want := base
	want.IdempotencyKey, want.DryRun, want.BatchLimit = "key-1", true, 50
	if len(dispatched) != 1 || dispatched[0].kind != admindata.Prepare || dispatched[0].input.TargetID != "preview" ||
		dispatched[0].input.Dataset != want.Dataset || dispatched[0].input.ReceiptID != "" || dispatched[0].input.IdempotencyKey != "key-1" ||
		!dispatched[0].input.DryRun || dispatched[0].input.BatchLimit != 50 {
		t.Fatalf("dispatched %+v, want server choice input %+v", dispatched, want)
	}

	for _, payload := range []map[string]any{{}, {"idempotency_key": "key-2", "batch_limit": float64(0)}, {"idempotency_key": "key-2", "dry_run": "yes"}} {
		invalid, runErr := host.RunAction(context.Background(), identity, console.PanelActionRequest{PanelID: DataPanelOverview, ActionID: overview[0].ID, Payload: payload})
		if runErr != nil || invalid.OK || len(invalid.Errors) != 1 {
			t.Fatalf("payload %v = %+v %v", payload, invalid, runErr)
		}
	}
	if len(dispatched) != 1 {
		t.Fatal("invalid request fields reached dispatch")
	}

	activateID := dataActionID(choices[1])
	if _, hiddenErr := host.RunAction(context.Background(), identity, console.PanelActionRequest{PanelID: DataPanelOverview, ActionID: activateID, Payload: map[string]any{"idempotency_key": "key-3"}}); !errors.Is(hiddenErr, ErrNotFound) {
		t.Fatalf("hidden activation ran: %v", hiddenErr)
	}
	canceled, err := host.RunAction(context.Background(), identity, console.PanelActionRequest{PanelID: DataPanelOperations, ActionID: cancel[0].ID, Payload: map[string]any{"idempotency_key": "key-4", "dry_run": true}})
	if err != nil || !canceled.OK || !strings.HasPrefix(canceled.Message, "Cancellation requested for operation op-0003.") || dispatched[1].input.DryRun {
		t.Fatalf("cancel = %+v %v (%+v)", canceled, err, dispatched)
	}
}

func TestDataPanelActionsFailClosedWithoutChoicesOrBinding(t *testing.T) {
	failing := DataPanelActions{
		Choices: func(context.Context) ([]DataActionChoice, error) { return nil, errors.New("catalog unavailable") },
		Dispatch: func(context.Context, admindata.Kind, admindata.Input) (admindata.Result, error) {
			return admindata.Result{}, nil
		},
	}
	all := map[admindata.Kind]bool{admindata.Prepare: true, admindata.Cancel: true}
	for name, actions := range map[string]DataPanelActions{"choices error": failing, "read only": {}} {
		host, identity := dataPanelActionHost(t, actions, all)
		snapshot, err := host.Snapshot(context.Background(), identity)
		if err != nil {
			t.Fatal(err)
		}
		if got := len(dataPanelActions(t, snapshot, DataPanelOverview)) + len(dataPanelActions(t, snapshot, DataPanelOperations)); got != 0 {
			t.Fatalf("%s declared %d actions", name, got)
		}
	}
	for _, id := range []string{"prepare", "bogus-abc", ""} {
		if _, ok := DataActionKind(id); ok {
			t.Fatalf("DataActionKind(%q) accepted", id)
		}
	}
}

func TestDataActionResultRecognizesWrappedSafeErrors(t *testing.T) {
	for _, code := range []string{admindata.CodeConflict, admindata.CodeBusy, admindata.CodeStale, admindata.CodeUnavailable, admindata.CodeProvider} {
		cause := admindata.Error(code)
		wrapped := gerrors.Wrap(cause, gerrors.CategoryInternal, "dispatcher private detail").WithTextCode("HANDLER_EXECUTION_FAILED")
		result, err := DataActionResult(admindata.Prepare, admindata.Result{}, wrapped)
		if err != nil || result.OK || result.Message != dataFailureMessages[code] || !result.Refresh {
			t.Fatal(code, result, err)
		}
	}
	cause := admindata.Error(admindata.CodeDenied)
	wrapped := gerrors.Wrap(cause, gerrors.CategoryInternal, "dispatcher private detail").WithCode(500).WithTextCode("HANDLER_EXECUTION_FAILED")
	result, err := DataActionResult(admindata.Prepare, admindata.Result{}, wrapped)
	var structured *gerrors.Error
	if result.Message != "" || !errors.Is(err, cause) || !errors.As(err, &structured) || structured.Code != 403 || structured.TextCode != admindata.CodeDenied {
		t.Fatal("wrapped denial lost HTTP status/compatibility", result, err)
	}
	unknown := gerrors.Wrap(errors.New("private foreign error"), gerrors.CategoryInternal, "dispatcher").WithTextCode("HANDLER_EXECUTION_FAILED")
	if _, err = DataActionResult(admindata.Prepare, admindata.Result{}, unknown); !errors.Is(err, unknown) {
		t.Fatal("unknown error was converted to a lifecycle failure", err)
	}
}
