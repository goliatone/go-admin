package datamodule

import (
	"context"
	"encoding/json"
	"path/filepath"
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/data/examples/sqlitestore"
	gocommand "github.com/goliatone/go-command"
)

type demoPolicy struct{}

func (demoPolicy) Authorize(_ context.Context, p data.Principal, request data.AccessRequest) error {
	if request.Target != (data.TargetKey{ScopeKey: "demo", TargetID: TargetID}) || p.ActorID != "operator" {
		return data.Error(data.CodeDenied)
	}
	return nil
}
func demoPrincipal(context.Context) (data.Principal, error) {
	return data.Principal{ActorID: "operator", ScopeKey: "demo", ExecutionID: "operator", ModuleHash: Hash("module"), PolicyHash: Hash("policy"), PermissionHash: Hash("operator")}, nil
}
func demoService(t *testing.T, runtime *Runtime, target data.ManagedTarget) *data.Service {
	t.Helper()
	service, err := data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"kitchen-sink": runtime}, Target: target, Store: runtime.Store, Policy: demoPolicy{}, Resolve: demoPrincipal, WritesEnabled: true})
	if err != nil {
		t.Fatal(err)
	}
	return service
}
func scenarioInput(t *testing.T, runtime *Runtime, scenario, key string) data.Input {
	t.Helper()
	for _, ref := range runtime.descriptor.Scenarios {
		if ref.ID == scenario {
			return data.Input{Dataset: runtime.descriptor.Dataset, Scenario: ref, TargetID: TargetID, IdempotencyKey: key}
		}
	}
	t.Fatal("missing scenario", scenario)
	return data.Input{}
}

func TestDurableDemoTypedLifecycleAndScenarioSwitch(t *testing.T) {
	filename := filepath.Join(t.TempDir(), "data.db")
	runtime, err := Open(filename)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := runtime.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	})
	service := demoService(t, runtime, runtime)
	bus := coreadmin.NewCommandBus(true)
	handle, err := coreadmin.RegisterDataCommands(bus, service)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := handle.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	})
	run := func(kind data.Kind, input data.Input) data.Result {
		t.Helper()
		encoded, operationErr := json.Marshal(input)
		if operationErr != nil {
			t.Fatal(operationErr)
		}
		var payload map[string]any
		if operationErr = json.Unmarshal(encoded, &payload); operationErr != nil {
			t.Fatal(operationErr)
		}
		outcome, operationErr := bus.DispatchByNameWithOutcome(t.Context(), kind.CommandID(), payload, nil, gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
		if operationErr != nil {
			t.Fatal(kind, operationErr)
		}
		result, ok := outcome.Result.(data.Result)
		if !ok || result.State != data.Succeeded || result.Failure != nil {
			t.Fatalf("%s: %+v", kind, outcome)
		}
		return result
	}
	input := scenarioInput(t, runtime, "ready", "validate")
	if result := run(data.Validate, input); len(result.Checks) != 2 || result.Active {
		t.Fatal(result)
	}
	input.IdempotencyKey, input.DryRun = "plan", true
	plan := run(data.Prepare, input)
	if len(plan.Checks) == 0 || plan.Checks[0].Status != data.CheckPlanned {
		t.Fatal(plan)
	}
	var stages int
	if err = runtime.db.QueryRowContext(t.Context(), `SELECT COUNT(*) FROM data_example_stages`).Scan(&stages); err != nil || stages != 0 {
		t.Fatal("dry run allocated a stage", stages, err)
	}
	input.IdempotencyKey, input.DryRun = "prepare", false
	prepared := run(data.Prepare, input)
	if prepared.Receipt == nil || prepared.Active {
		t.Fatal(prepared)
	}
	if replay := run(data.Prepare, input); replay.OperationID != prepared.OperationID || replay.Receipt.ID != prepared.Receipt.ID {
		t.Fatal("retry duplicated work", replay)
	}
	input.IdempotencyKey, input.ReceiptID = "verify", prepared.Receipt.ID
	verified := run(data.Verify, input)
	if verified.Verification == nil || !verified.Verification.Passed() || verified.Verification.Checks[1].Actual != "250" {
		t.Fatal("not actual SQLite verification", verified)
	}
	generation := uint64(0)
	input.IdempotencyKey, input.ExpectedGeneration = "activate", &generation
	activated := run(data.Activate, input)
	if !activated.Active || activated.Activation == nil || activated.Activation.Generation != 1 {
		t.Fatal(activated)
	}
	key := data.TargetKey{ScopeKey: "demo", TargetID: TargetID}
	rows, err := runtime.ActiveRecords(t.Context(), key)
	if err != nil || len(rows) != 3 {
		t.Fatal(rows, err)
	}
	quiet := scenarioInput(t, runtime, "quiet", "refresh")
	refreshed := run(data.Refresh, quiet)
	rows, err = runtime.ActiveRecords(t.Context(), key)
	if err != nil || len(rows) != 3 {
		t.Fatal("refresh changed active routing", rows, err)
	}
	quiet.ReceiptID, quiet.IdempotencyKey = refreshed.Receipt.ID, "verify-quiet"
	quietVerification := run(data.Verify, quiet)
	if quietVerification.Verification.Coverage[0].Status != data.CoveredEmpty {
		t.Fatal(quietVerification)
	}
	quiet.ExpectedGeneration, quiet.IdempotencyKey = &generation, "stale"
	stale, err := service.Run(t.Context(), data.Activate, quiet)
	if err != nil || stale.Failure == nil || stale.Failure.Code != data.CodeStale {
		t.Fatal("stale activation accepted", stale, err)
	}
	generation = 1
	quiet.IdempotencyKey = "activate-quiet"
	_ = run(data.Activate, quiet)
	rows, err = runtime.ActiveRecords(t.Context(), key)
	if err != nil || len(rows) != 0 {
		t.Fatal("quiet scenario left prior records active", rows, err)
	}
	// A new adapter/process observes the same physical route and generation.
	reopened, err := Open(filename)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := reopened.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	})
	restarted := demoService(t, reopened, reopened)
	state, err := restarted.Active(t.Context(), TargetID)
	if err != nil || state.Activation.Generation != 2 || !state.Activation.Ready {
		t.Fatal(state, err)
	}
	rows, err = reopened.ActiveRecords(t.Context(), key)
	if err != nil || len(rows) != 0 {
		t.Fatal(rows, err)
	}
	replay, err := restarted.Run(t.Context(), data.Activate, quiet)
	if err != nil || replay.Activation.Generation != 2 {
		t.Fatal("restart replay changed generation", replay, err)
	}
	changed := quiet
	changed.DryRun = true
	if _, err = restarted.Run(t.Context(), data.Activate, changed); data.ErrorCode(err) != data.CodeConflict {
		t.Fatal("changed fingerprint accepted", err)
	}
}

type ambiguousTarget struct {
	*Runtime
	ambiguous bool
}

func TestDemoRejectsDatasetVersionCollision(t *testing.T) {
	filename := filepath.Join(t.TempDir(), "data.db")
	runtime, err := Open(filename)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := runtime.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	})
	if _, err = runtime.db.ExecContext(t.Context(), `UPDATE data_example_catalog SET digest=?`, Hash("different-source")); err != nil {
		t.Fatal(err)
	}
	if reopened, openErr := Open(filename); openErr == nil {
		if closeErr := reopened.Close(); closeErr != nil {
			t.Error(closeErr)
		}
		t.Fatal("changed content reused the same dataset version")
	} else if data.ErrorCode(openErr) != data.CodeConflict {
		t.Fatal(openErr)
	}
}

func (r *ambiguousTarget) InspectIntent(ctx context.Context, intent data.Intent) (data.Observation, error) {
	if r.ambiguous {
		return data.Observation{Routing: data.RoutingUnknown}, nil
	}
	return r.Runtime.InspectIntent(ctx, intent)
}

func TestDemoRecoveryFencingAndImmutableContent(t *testing.T) {
	filename := filepath.Join(t.TempDir(), "data.db")
	runtime, err := Open(filename)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := runtime.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	})
	if err = runtime.Store.Close(); err != nil {
		t.Fatal(err)
	}
	now := time.Now()
	runtime.Store, err = sqlitestore.Open(filename, sqlitestore.Options{Now: func() time.Time { return now }})
	if err != nil {
		t.Fatal(err)
	}
	target := &ambiguousTarget{Runtime: runtime}
	service := demoService(t, runtime, target)
	input := scenarioInput(t, runtime, "ready", "prepare")
	prepared, err := service.Run(t.Context(), data.Prepare, input)
	if err != nil || prepared.Receipt == nil {
		t.Fatal(prepared, err)
	}
	input.IdempotencyKey, input.ReceiptID = "verify", prepared.Receipt.ID
	verified, err := service.Run(t.Context(), data.Verify, input)
	if err != nil || verified.Verification == nil || !verified.Verification.Passed() {
		t.Fatal(verified, err)
	}
	target.ambiguous = true
	generation := uint64(0)
	input.ExpectedGeneration, input.IdempotencyKey = &generation, "activate"
	pending, err := service.Run(t.Context(), data.Activate, input)
	if err != nil || pending.State.Terminal() {
		t.Fatal("ambiguous activation finalized", pending, err)
	}
	state, err := service.Active(t.Context(), TargetID)
	if err != nil || !state.RecoveryRequired || state.Activation.Ready {
		t.Fatal(state, err)
	}
	now = now.Add(time.Minute)
	target.ambiguous = false
	recovered, err := service.Recover(t.Context(), pending.OperationID)
	if err != nil || !recovered.Active || recovered.Activation.Generation != 1 {
		t.Fatal(recovered, err)
	}
	if _, err = runtime.db.ExecContext(t.Context(), `UPDATE data_example_records SET amount=999 WHERE stage=? AND id='order-1'`, prepared.Receipt.StageID); err != nil {
		t.Fatal(err)
	}
	if err = runtime.InspectReceipt(t.Context(), *prepared.Receipt); data.ErrorCode(err) != data.CodeConflict {
		t.Fatal("mutated receipt still ready", err)
	}
	// An expired/released worker cannot allocate or delete stages, even with
	// a callback that claims effects are allowed.
	p, principalErr := demoPrincipal(t.Context())
	if principalErr != nil {
		t.Fatal(principalErr)
	}
	work := data.Work{OperationID: "stale", Principal: p, Input: input, StageID: "forged-stage", Lease: data.Lease{OperationID: "stale", Target: data.TargetKey{ScopeKey: "demo", TargetID: TargetID}, Fence: 1}, BeforeEffects: func(context.Context) error { return nil }}
	if err = runtime.Allocate(t.Context(), work); data.ErrorCode(err) != data.CodeLeaseLost {
		t.Fatal("stale worker allocated", err)
	}
	if err = runtime.DrainCleanup(t.Context(), work, prepared.Receipt.StageID); err == nil {
		t.Fatal("stale worker deleted active stage")
	}
}
