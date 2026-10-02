package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/data/examples/sqlitestore"
	demo "github.com/goliatone/go-admin/examples/web/datamodule"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

type dataModulePolicy struct{ view, execute, recover *atomic.Bool }

func (p dataModulePolicy) Authorize(_ context.Context, principal data.Principal, request data.AccessRequest) error {
	if !p.view.Load() || request.Target != (data.TargetKey{ScopeKey: "demo", TargetID: demo.TargetID}) {
		return data.Error(data.CodeDenied)
	}
	if request.Action == "view" {
		return nil
	}
	if request.Action == "recover" {
		if p.recover.Load() {
			return nil
		}
		return data.Error(data.CodeDenied)
	}
	if !p.execute.Load() || request.Operation != nil && request.Operation.Principal.ActorID != principal.ActorID || request.Receipt != nil && request.Receipt.RequesterID != principal.ActorID {
		return data.Error(data.CodeDenied)
	}
	return nil
}

type dataModuleTarget struct {
	*demo.Runtime
	ambiguous atomic.Bool
}

func (r *dataModuleTarget) InspectIntent(ctx context.Context, intent data.Intent) (data.Observation, error) {
	if r.ambiguous.Load() {
		return data.Observation{Routing: data.RoutingUnknown}, nil
	}
	return r.Runtime.InspectIntent(ctx, intent)
}

type dataModuleFixture struct {
	module                 *DataModule
	service                *data.Service
	runtime                *demo.Runtime
	target                 *dataModuleTarget
	input                  data.Input
	view, execute, recover atomic.Bool
	handler                http.Handler
	principal              func(context.Context) (data.Principal, error)
}

func newDataModuleFixture(t *testing.T, filename string, clock *atomic.Int64) *dataModuleFixture {
	t.Helper()
	r, err := demo.Open(filename)
	if err != nil {
		t.Fatal(err)
	}
	if clock != nil {
		if err = r.Store.Close(); err != nil {
			t.Fatal(err)
		}
		r.Store, err = sqlitestore.Open(filename, sqlitestore.Options{Now: func() time.Time { return time.Unix(0, clock.Load()) }})
		if err != nil {
			t.Fatal(err)
		}
	}
	f := &dataModuleFixture{runtime: r, target: &dataModuleTarget{Runtime: r}}
	t.Cleanup(func() {
		if err = r.Close(); err != nil {
			t.Error(err)
		}
	})
	f.view.Store(true)
	f.execute.Store(true)
	f.recover.Store(true)
	f.principal = func(ctx context.Context) (data.Principal, error) {
		actorID := "operator"
		if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil && actor.ActorID != "" {
			actorID = actor.ActorID
		}
		return data.Principal{ActorID: actorID, ExecutionID: actorID, ScopeKey: "demo", ModuleHash: demo.Hash("module"), PolicyHash: demo.Hash("policy"), PermissionHash: demo.Hash("operator")}, nil
	}
	f.service, err = data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"kitchen-sink": r}, Target: f.target, Store: r.Store, Policy: dataModulePolicy{&f.view, &f.execute, &f.recover}, Resolve: f.principal, WritesEnabled: true})
	if err != nil {
		t.Fatal(err)
	}
	f.module, err = NewDataModule(DataModuleConfig{Service: f.service, TargetID: demo.TargetID, Enabled: func() bool { return true }, ResolveIdentity: func(ctx context.Context) (console.Identity, error) {
		p, e := f.principal(ctx)
		return console.Identity{ConsoleID: "data", ApplicationID: "test", EnvironmentID: "dev", ActorID: p.ActorID, ScopeKey: p.ScopeKey}, e
	}})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err = f.module.Close(); err != nil {
			t.Error(err)
		}
	})
	adm := mustNewAdmin(t, Config{BasePath: "/admin", Debug: DebugConfig{Enabled: false}}, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"data": true, "commands": true})})
	adm.WithAuth(headerDebugAuthenticator{}, nil)
	adm.WithAuthorizer(allowAllDebugAuthorizer{})
	if err = adm.RegisterModule(f.module); err != nil {
		t.Fatal(err)
	}
	server := router.NewHTTPServer()
	if err = adm.Initialize(server.Router()); err != nil {
		t.Fatal(err)
	}
	f.handler = server.WrappedRouter()
	descriptors, err := f.service.Catalog(t.Context(), demo.TargetID, 100)
	if err != nil {
		t.Fatal(err)
	}
	for _, scenario := range descriptors[0].Scenarios {
		if scenario.ID == "ready" {
			f.input = data.Input{Dataset: descriptors[0].Dataset, Scenario: scenario, TargetID: demo.TargetID}
		}
	}
	if f.input.Scenario.ID == "" {
		t.Fatal("no ready scenario")
	}
	return f
}
func (f *dataModuleFixture) request(t *testing.T, method, path, actor string, payload any) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequestWithContext(t.Context(), method, path, strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", actor)
	res := httptest.NewRecorder()
	f.handler.ServeHTTP(res, req)
	return res
}
func (f *dataModuleFixture) snapshot(t *testing.T, actor string) console.Snapshot {
	t.Helper()
	res := f.request(t, http.MethodGet, "/admin/data/api/snapshot", actor, nil)
	if res.Code != http.StatusOK {
		t.Fatalf("snapshot: %d %s", res.Code, res.Body.String())
	}
	var snapshot console.Snapshot
	if err := json.Unmarshal(res.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	return snapshot
}
func dataModuleAction(t *testing.T, snapshot console.Snapshot, kind data.Kind, contains string) console.PanelUIAction {
	t.Helper()
	for _, panel := range snapshot.Panels {
		if panel.UI == nil {
			continue
		}
		for _, action := range panel.UI.Actions {
			if action.Kind == string(kind) && strings.Contains(action.Label, contains) {
				return action
			}
		}
	}
	t.Fatalf("missing %s action %s", kind, contains)
	return console.PanelUIAction{}
}
func (f *dataModuleFixture) action(t *testing.T, actor string, kind data.Kind, action console.PanelUIAction, payload map[string]any) console.PanelActionResult {
	t.Helper()
	merged := map[string]any{}
	for key, value := range action.Payload {
		merged[key] = value
	}
	for key, value := range payload {
		merged[key] = value
	}
	panel := dataChoicePanel(kind)
	res := f.request(t, http.MethodPost, "/admin/data/api/panels/"+panel+"/actions/"+action.ID, actor, merged)
	if res.Code != http.StatusOK {
		t.Fatalf("action: %d %s", res.Code, res.Body.String())
	}
	var result console.PanelActionResult
	if err := json.Unmarshal(res.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	return result
}
func (f *dataModuleFixture) prepareVerified(t *testing.T) data.Input {
	t.Helper()
	in := f.input
	in.IdempotencyKey = "prepare"
	result, err := f.service.Run(t.Context(), data.Prepare, in)
	if err != nil {
		t.Fatal(err)
	}
	in.ReceiptID = result.Receipt.ID
	in.IdempotencyKey = "verify"
	result, err = f.service.Run(t.Context(), data.Verify, in)
	if err != nil || !result.Verification.Passed() {
		t.Fatal(result, err)
	}
	zero := uint64(0)
	in.ExpectedGeneration = &zero
	in.IdempotencyKey = "activate"
	return in
}
func TestDataModuleHTTPRecoveryAfterRestart(t *testing.T) {
	filename := filepath.Join(t.TempDir(), "data.db")
	var clock atomic.Int64
	clock.Store(time.Now().UnixNano())
	old := newDataModuleFixture(t, filename, &clock)
	in := old.prepareVerified(t)
	old.target.ambiguous.Store(true)
	pending, err := old.service.Run(t.Context(), data.Activate, in)
	if err != nil || pending.State.Terminal() {
		t.Fatal(pending, err)
	}
	if err = old.module.Close(); err != nil {
		t.Fatal(err)
	}
	if err = old.runtime.Close(); err != nil {
		t.Fatal(err)
	}
	f := newDataModuleFixture(t, filename, &clock)
	// Read-only history can grow while writes are paused. Pending work must not
	// disappear from supervisor controls when it leaves that history window.
	for i := 0; i < 100; i++ {
		input := f.input
		input.IdempotencyKey = fmt.Sprintf("validate-%03d", i)
		if _, err = f.service.Run(t.Context(), data.Validate, input); err != nil {
			t.Fatal(err)
		}
	}
	f.recover.Store(false)
	snapshot := f.snapshot(t, "supervisor")
	for _, panel := range snapshot.Panels {
		if panel.UI == nil {
			continue
		}
		for _, action := range panel.UI.Actions {
			if action.Kind == string(data.Recover) {
				t.Fatal("operator received supervisor recovery")
			}
		}
	}
	f.recover.Store(true)
	action := dataModuleAction(t, f.snapshot(t, "supervisor"), data.Recover, pending.OperationID)
	if len(action.Fields) != 0 || !action.RequiresConfirm {
		t.Fatal("recovery asks for new work", action)
	}
	// The live lease is respected, even for a supervisor.
	if _, err = f.runtime.Store.AcquireRecovery(t.Context(), pending.OperationID, data.TargetKey{ScopeKey: "demo", TargetID: demo.TargetID}, 30*time.Second); err != nil {
		t.Fatal(err)
	}
	before := data.RecoverRequest{TargetID: demo.TargetID, OperationID: pending.OperationID}
	_, err = f.service.Run(t.Context(), data.Recover, before.OperationInput())
	if data.ErrorCode(err) != data.CodeBusy {
		t.Fatal("live lease was overridden", err)
	}
	clock.Add(int64(time.Minute))
	f.recover.Store(false)
	res := f.request(t, http.MethodPost, "/admin/data/api/panels/operations/actions/"+action.ID, "supervisor", map[string]any{})
	if res.Code == http.StatusOK {
		t.Fatal("revoked recovery ran")
	}
	f.recover.Store(true)
	result := f.action(t, "supervisor", data.Recover, action, map[string]any{"operation_id": "forged", "target_id": "other"})
	if !result.OK {
		t.Fatal(result)
	}
	state, err := f.service.Active(t.Context(), demo.TargetID)
	if err != nil || !state.Activation.Ready || state.RecoveryRequired || state.Activation.Generation != 1 {
		t.Fatal(state, err)
	}
	op, err := f.runtime.Store.GetOperation(t.Context(), pending.OperationID)
	if err != nil || op.RecoveryPrincipal == nil || op.RecoveryPrincipal.ActorID != "supervisor" || op.Principal.ActorID != "operator" {
		t.Fatal("missing supervisor audit", op, err)
	}
	// A trusted adapter can repeat recovery without repeating Commit/generation.
	ctx := auth.WithActorContext(t.Context(), &auth.ActorContext{ActorID: "supervisor"})
	again, err := f.service.Run(ctx, data.Recover, before.OperationInput())
	if err != nil || again.Activation.Generation != 1 {
		t.Fatal(again, err)
	}
	f.input.IdempotencyKey = "resumed-prepare"
	resumed, err := f.service.Run(t.Context(), data.Prepare, f.input)
	if err != nil || resumed.State != data.Succeeded {
		t.Fatal("writes did not resume", resumed, err)
	}
}

func TestDataModuleHTTPActivationReplayAndStaleGeneration(t *testing.T) {
	filename := filepath.Join(t.TempDir(), "data.db")
	f := newDataModuleFixture(t, filename, nil)
	in := f.prepareVerified(t)
	original := dataModuleAction(t, f.snapshot(t, "operator"), data.Activate, in.ReceiptID)
	first := f.action(t, "operator", data.Activate, original, map[string]any{"idempotency_key": "activate"})
	if !first.OK {
		t.Fatal(first)
	}
	refreshed := dataModuleAction(t, f.snapshot(t, "operator"), data.Activate, in.ReceiptID)
	if original.ID != refreshed.ID || original.Payload["expected_generation"] == refreshed.Payload["expected_generation"] {
		t.Fatal("action identity or captured precondition is wrong", original, refreshed)
	}
	for _, action := range []console.PanelUIAction{original, refreshed} {
		replay := f.action(t, "operator", data.Activate, action, map[string]any{"idempotency_key": "activate"})
		if !replay.OK {
			t.Fatal("activation replay failed", replay)
		}
	}
	conflict := f.action(t, "operator", data.Activate, refreshed, map[string]any{"idempotency_key": "activate", "dry_run": true})
	if conflict.OK || !strings.Contains(conflict.Message, "different input") {
		t.Fatal("changed inputs replayed", conflict)
	}
	stale := f.action(t, "operator", data.Activate, original, map[string]any{"idempotency_key": "new-stale-request"})
	if stale.OK || !strings.Contains(stale.Message, "active dataset changed") {
		t.Fatal("old page silently changed generation", stale)
	}
	state, err := f.service.Active(t.Context(), demo.TargetID)
	if err != nil || state.Activation.Generation != 1 {
		t.Fatal(state, err)
	}
	// The service API remains strict when a caller deliberately changes a typed
	// request's fingerprint. Only the adapter's explicit binding resolves retries.
	one := uint64(1)
	in.ExpectedGeneration = &one
	if _, err = f.service.Run(t.Context(), data.Activate, in); data.ErrorCode(err) != data.CodeConflict {
		t.Fatal("typed fingerprint semantics changed", err)
	}
	if err = f.module.Close(); err != nil {
		t.Fatal(err)
	}
	if err = f.runtime.Close(); err != nil {
		t.Fatal(err)
	}
	reopened := newDataModuleFixture(t, filename, nil)
	afterRestart := dataModuleAction(t, reopened.snapshot(t, "operator"), data.Activate, in.ReceiptID)
	replay := reopened.action(t, "operator", data.Activate, afterRestart, map[string]any{"idempotency_key": "activate"})
	if !replay.OK {
		t.Fatal("restart lost retry identity", replay)
	}
	state, err = reopened.service.Active(t.Context(), demo.TargetID)
	if err != nil || state.Activation.Generation != 1 {
		t.Fatal("replay advanced generation", state, err)
	}
	reopened.execute.Store(false)
	res := reopened.request(t, http.MethodPost, "/admin/data/api/panels/overview/actions/"+afterRestart.ID, "operator", map[string]any{"idempotency_key": "activate", "expected_generation": 1})
	if res.Code == http.StatusOK {
		t.Fatal("revoked actor received replay")
	}
}

func TestDataModuleReceiptsSurviveHistoryAndRemainSelectable(t *testing.T) {
	f := newDataModuleFixture(t, filepath.Join(t.TempDir(), "data.db"), nil)
	in := f.prepareVerified(t)
	result, err := f.service.Run(t.Context(), data.Activate, in)
	if err != nil || !result.Active {
		t.Fatal(result, err)
	}
	old := f.input
	old.IdempotencyKey = "old-preparation"
	prepared, err := f.service.Run(t.Context(), data.Prepare, old)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 100; i++ {
		input := f.input
		input.IdempotencyKey = fmt.Sprintf("history-%03d", i)
		if _, err = f.service.Run(t.Context(), data.Validate, input); err != nil {
			t.Fatal(err)
		}
	}
	model, err := f.module.readModel(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	scenario := model.scenario(f.input.Scenario, demo.TargetID)
	if !scenario.Active || scenario.Receipt == nil || scenario.Receipt.ID != in.ReceiptID || len(model.coverageRecords(1)) == 0 {
		t.Fatal("active receipt/evidence disappeared", scenario, model.receipts)
	}
	if len(model.receipts) != 2 {
		t.Fatal("retained preparation disappeared", model.receipts)
	}
	// Keep the overview small, then age the preparation beyond that receipt page.
	f.module.config.ReceiptLimit = 1
	newer := f.input
	newer.IdempotencyKey = "newer-preparation"
	if _, err = f.service.Run(t.Context(), data.Prepare, newer); err != nil {
		t.Fatal(err)
	}
	model, err = f.module.readModel(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	for _, receipt := range model.receipts {
		if receipt.ID == prepared.Receipt.ID {
			t.Fatal("test did not move preparation beyond the page")
		}
	}
	if !model.scenario(f.input.Scenario, demo.TargetID).Active {
		t.Fatal("active receipt was not pinned")
	}
	selected := dataModuleAction(t, f.snapshot(t, "operator"), data.Verify, "another ready")
	verified := f.action(t, "operator", data.Verify, selected, map[string]any{"idempotency_key": "verify-old", "receipt_id": prepared.Receipt.ID})
	if !verified.OK {
		t.Fatal("retained receipt could not be verified", verified)
	}
	receipt, err := f.service.LookupReceipt(t.Context(), demo.TargetID, prepared.Receipt.ID)
	if err != nil || !receipt.Verification.Passed() {
		t.Fatal(receipt, err)
	}
	activation := dataModuleAction(t, f.snapshot(t, "operator"), data.Activate, "another ready")
	activated := f.action(t, "operator", data.Activate, activation, map[string]any{"idempotency_key": "activate-old", "receipt_id": prepared.Receipt.ID})
	if !activated.OK {
		t.Fatal("retained receipt could not be activated", activated)
	}
	state, err := f.service.Active(t.Context(), demo.TargetID)
	if err != nil || state.Activation.Generation != 2 || state.Activation.ReceiptID != prepared.Receipt.ID {
		t.Fatal(state, err)
	}
	// A receipt selector does not grant ownership or access to another actor's work.
	res := f.request(t, http.MethodPost, "/admin/data/api/panels/overview/actions/"+selected.ID, "other", map[string]any{"idempotency_key": "foreign", "receipt_id": prepared.Receipt.ID})
	if res.Code != http.StatusForbidden {
		t.Fatalf("foreign receipt accepted: %d %s", res.Code, res.Body.String())
	}
	f.view.Store(false)
	if _, err = f.service.Receipts(t.Context(), demo.TargetID, data.ReceiptQuery{Limit: 1}); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("revoked view returned receipts", err)
	}
}

func TestDataModuleHTTPWrappedConflictAndBusyOutcomes(t *testing.T) {
	f := newDataModuleFixture(t, filepath.Join(t.TempDir(), "data.db"), nil)
	action := dataModuleAction(t, f.snapshot(t, "operator"), data.Prepare, "ready")
	result := f.action(t, "operator", data.Prepare, action, map[string]any{"idempotency_key": "prepare"})
	if !result.OK {
		t.Fatal(result)
	}
	for _, changed := range []map[string]any{
		{"idempotency_key": "prepare", "dry_run": true},
		{"idempotency_key": "prepare", "batch_limit": 1},
	} {
		conflict := f.action(t, "operator", data.Prepare, action, changed)
		if conflict.OK || !conflict.Refresh || !strings.Contains(conflict.Message, "different input") {
			t.Fatal("wrapped conflict became a generic error", conflict)
		}
	}
	ops, err := f.service.Operations(t.Context(), demo.TargetID, 100)
	if err != nil || len(ops) != 1 {
		t.Fatal("conflicting request created new work", ops, err)
	}
	blockingInput := f.input
	blockingInput.IdempotencyKey = "busy-blocker"
	principal, err := f.principal(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	fingerprint, err := blockingInput.Fingerprint(data.Prepare)
	if err != nil {
		t.Fatal(err)
	}
	claim, err := f.runtime.Store.Claim(t.Context(), data.Operation{Result: data.Result{OperationID: "busy-blocker", Kind: data.Prepare, State: data.Queued}, Target: ops[0].Target, Principal: principal, Input: blockingInput, Fingerprint: fingerprint})
	if err != nil {
		t.Fatal(err)
	}
	lease, err := f.runtime.Store.Acquire(t.Context(), claim.Operation.Result.OperationID, claim.Operation.Target, 30*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	busy := f.action(t, "operator", data.Prepare, action, map[string]any{"idempotency_key": "busy"})
	if busy.OK || busy.Message != dataFailureMessages[data.CodeBusy] {
		t.Fatal("busy outcome lost", busy)
	}
	if err = f.runtime.Store.Release(t.Context(), lease); err != nil {
		t.Fatal(err)
	}
}
