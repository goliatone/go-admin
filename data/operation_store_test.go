package data_test

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/data/examples/sqlitestore"
)

func claimedOperation(t *testing.T, f *fixture, id, key string, kind data.Kind, input data.Input) data.Operation {
	t.Helper()
	input.IdempotencyKey = key
	fingerprint, err := input.Fingerprint(kind)
	if err != nil {
		t.Fatal(err)
	}
	return data.Operation{Result: data.Result{OperationID: id, Kind: kind, State: data.Queued, Revision: 1, DryRun: input.DryRun}, Principal: f.principal, Target: data.TargetKey{ScopeKey: f.principal.ScopeKey, TargetID: input.TargetID}, Input: input, Fingerprint: fingerprint}
}
func TestStoreIndependentProcessesClaimOneOperation(t *testing.T) {
	f := newFixture(t)
	var wg sync.WaitGroup
	errors := make(chan error, 2)
	for i := range 2 {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			cmd := exec.CommandContext(t.Context(), os.Args[0], "-test.run=^TestStoreClaimProcess$")
			cmd.Env = append(os.Environ(), "DATA_STORE_PROCESS_DB="+f.path, "DATA_STORE_PROCESS_OUTPUT="+filepath.Join(filepath.Dir(f.path), "claim-"+strconv.Itoa(i)), "DATA_STORE_PROCESS_ID=worker-"+strconv.Itoa(i))
			if output, err := cmd.CombinedOutput(); err != nil {
				errors <- &processError{err, string(output)}
			}
		}(i)
	}
	wg.Wait()
	close(errors)
	for err := range errors {
		t.Fatal(err)
	}
	a, err := os.ReadFile(filepath.Join(filepath.Dir(f.path), "claim-0"))
	if err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(filepath.Join(filepath.Dir(f.path), "claim-1"))
	if err != nil {
		t.Fatal(err)
	}
	if string(a) != string(b) {
		t.Fatal("cross-process duplicate claim", string(a), string(b))
	}
}

type processError struct {
	err    error
	output string
}

func (e *processError) Error() string { return e.err.Error() + " " + e.output }
func TestStoreClaimProcess(t *testing.T) {
	path := os.Getenv("DATA_STORE_PROCESS_DB")
	if path == "" {
		return
	}
	store, err := sqlitestore.Open(path, sqlitestore.Options{})
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if closeErr := store.Close(); closeErr != nil {
			t.Errorf("close store: %v", closeErr)
		}
	}()
	f := &fixture{input: fixtureInput(t)}
	h := f.input.Scenario.ProfileHash
	f.principal = data.Principal{ActorID: "alice", ScopeKey: "org", ExecutionID: "bounded-bootstrap", ModuleHash: h, PolicyHash: h, PermissionHash: h}
	op := claimedOperation(t, f, os.Getenv("DATA_STORE_PROCESS_ID"), "cross-process", data.Prepare, f.input)
	claim, err := store.Claim(context.Background(), op)
	if err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(os.Getenv("DATA_STORE_PROCESS_OUTPUT"), []byte(claim.Operation.Result.OperationID), 0600); err != nil {
		t.Fatal(err)
	}
}
func TestStoreCrashAfterPhysicalHandoverFinalizesExactlyOnce(t *testing.T) {
	f := newFixture(t)
	receipt := verified(t, f, prepared(t, f, "prepare"), "verify")
	input := activationInput(f, receipt, 0, "crashed")
	op := claimedOperation(t, f, "crashed-operation", "crashed", data.Activate, input)
	claim, err := f.store.Claim(context.Background(), op)
	if err != nil {
		t.Fatal(err)
	}
	op = claim.Operation
	lease, err := f.store.Acquire(context.Background(), op.Result.OperationID, op.Target, 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	op.Result.State = data.Running
	op, err = f.store.Save(context.Background(), op, op.Result.Revision, &lease)
	if err != nil {
		t.Fatal(err)
	}
	intent := data.Intent{ID: "crashed-intent", OperationID: op.Result.OperationID, Target: op.Target, Kind: data.Activate, Next: data.Activation{ReceiptID: receipt.ID, Generation: 1, Ready: true}, Receipt: &receipt, Fence: lease.Fence}
	if err = f.store.BeginIntent(context.Background(), lease, intent, op.Result.Revision); err != nil {
		t.Fatal(err)
	}
	work := data.Work{OperationID: op.Result.OperationID, Principal: f.principal, Input: input, Lease: lease, BeforeEffects: func(ctx context.Context) error { return f.store.CheckLease(ctx, lease) }}
	if err = f.target.Commit(context.Background(), work, intent); err != nil {
		t.Fatal(err)
	}
	// No operation finalization, no lease release. Reopen the persisted store as a
	// restarted process and read durable target routing through a new adapter.
	if err = f.store.Close(); err != nil {
		t.Fatal(err)
	}
	f.now.Add(int64(6 * time.Second))
	reopened, err := sqlitestore.Open(f.path, sqlitestore.Options{Now: func() time.Time { return time.Unix(0, f.now.Load()) }})
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if closeErr := reopened.Close(); closeErr != nil {
			t.Errorf("close store: %v", closeErr)
		}
	}()
	f.target = &testTarget{root: f.target.root, store: reopened}
	f.store = reopened
	f.provider.target = f.target
	service := f.newService(t, reopened)
	result, err := service.Recover(context.Background(), op.Result.OperationID)
	if err != nil {
		t.Fatal(err)
	}
	successful(t, result)
	if result.Activation.Generation != 1 || !result.Active {
		t.Fatal(result)
	}
	if err = reopened.CheckLease(context.Background(), lease); data.ErrorCode(err) != data.CodeLeaseLost {
		t.Fatal("stale worker accepted", err)
	}
	again, err := service.Recover(context.Background(), op.Result.OperationID)
	if err != nil || again.Revision != result.Revision || again.Activation.Generation != 1 {
		t.Fatal("recovery duplicated generation", again, err)
	}
	// Active receipts and their operations remain available beyond regular retention.
	f.now.Add(int64(10 * 24 * time.Hour))
	if err = reopened.Prune(context.Background()); err != nil {
		t.Fatal(err)
	}
	if _, err = reopened.GetReceipt(context.Background(), receipt.ID); err != nil {
		t.Fatal("active receipt pruned", err)
	}
	if _, err = reopened.GetOperation(context.Background(), op.Result.OperationID); err != nil {
		t.Fatal("active evidence pruned", err)
	}
}
func TestStoreRetentionKeepsTombstonesAndPendingIntents(t *testing.T) {
	f := newFixture(t)
	validated := run(t, f, data.Validate, f.input)
	f.now.Add(int64(8 * 24 * time.Hour))
	if err := f.store.Prune(context.Background()); err != nil {
		t.Fatal(err)
	}
	if _, err := f.service.Run(context.Background(), data.Validate, f.input); data.ErrorCode(err) != data.CodeGone {
		t.Fatal("deleted outcome reran inside retry window", validated, err)
	}
	f.now.Add(-int64(8 * 24 * time.Hour))
	r := verified(t, f, prepared(t, f, "p"), "v")
	f.target.mode = "unknown"
	pending := run(t, f, data.Activate, activationInput(f, r, 0, "a"))
	if pending.Phase != "recovering" {
		t.Fatal(pending)
	}
	f.now.Add(int64(31 * 24 * time.Hour))
	if err := f.store.Prune(context.Background()); err != nil {
		t.Fatal(err)
	}
	if _, err := f.store.GetReceipt(context.Background(), r.ID); err != nil {
		t.Fatal("pending receipt pruned", err)
	}
	if _, err := f.store.GetOperation(context.Background(), pending.OperationID); err != nil {
		t.Fatal("intent evidence pruned", err)
	}
	in := f.input
	in.IdempotencyKey = "must-not-write"
	blocked := run(t, f, data.Prepare, in)
	if blocked.Failure == nil || blocked.Failure.Code != data.CodeRecovery {
		t.Fatal("unknown authority allowed new write", blocked)
	}
}
func TestStoreFingerprintCollisionAndMonotonicFences(t *testing.T) {
	f := newFixture(t)
	op := claimedOperation(t, f, "one", "key", data.Prepare, f.input)
	claim, err := f.store.Claim(context.Background(), op)
	if err != nil {
		t.Fatal(err)
	}
	op = claim.Operation
	lease, err := f.store.Acquire(context.Background(), op.Result.OperationID, op.Target, 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	altered := op
	altered.Result.OperationID = "collision"
	altered.Input.BatchLimit = 2
	altered.Fingerprint, err = altered.Input.Fingerprint(data.Prepare)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.Claim(context.Background(), altered); data.ErrorCode(err) != data.CodeConflict {
		t.Fatal("mismatched fingerprint", err)
	}
	f.now.Add(int64(6 * time.Second))
	replacement, err := f.store.AcquireRecovery(context.Background(), op.Result.OperationID, op.Target, 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if replacement.Fence <= lease.Fence {
		t.Fatal("fence regressed")
	}
	op.Result.State = data.Running
	if _, err = f.store.Save(context.Background(), op, op.Result.Revision, &lease); data.ErrorCode(err) != data.CodeLeaseLost {
		t.Fatal("stale CAS accepted", err)
	}
	if err = f.store.Release(context.Background(), replacement); err != nil {
		t.Fatal(err)
	}
	newLease, err := f.store.Acquire(context.Background(), op.Result.OperationID, op.Target, 5*time.Second)
	if err != nil || newLease.Fence <= replacement.Fence {
		t.Fatal("released fence reused", newLease, err)
	}
}

func TestRecoveryNeverCleansActiveOrRetainedReceipt(t *testing.T) {
	f := newFixture(t)
	receipt := verified(t, f, prepared(t, f, "prepared"), "verified")
	successful(t, run(t, f, data.Activate, activationInput(f, receipt, 0, "active")))
	// Model a restart whose receipt write completed but the operation's result
	// attachment did not. Target/retention authority must protect that stage.
	op := claimedOperation(t, f, "abandoned", "abandoned", data.Prepare, f.input)
	claim, err := f.store.Claim(context.Background(), op)
	if err != nil {
		t.Fatal(err)
	}
	op = claim.Operation
	lease, err := f.store.Acquire(context.Background(), op.Result.OperationID, op.Target, 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	op.StageID = receipt.StageID
	op.Result.State = data.Running
	if _, err = f.store.Save(context.Background(), op, op.Result.Revision, &lease); err != nil {
		t.Fatal(err)
	}
	if err = f.store.Release(context.Background(), lease); err != nil {
		t.Fatal(err)
	}
	outcome, err := f.service.Recover(context.Background(), op.Result.OperationID)
	if err != nil || outcome.Phase != "recovering" || f.target.cleanups.Load() != 0 {
		t.Fatal("active stage cleanup", outcome, err)
	}
	if err = f.target.InspectReceipt(context.Background(), receipt); err != nil {
		t.Fatal("active content removed", err)
	}
	recovered, err := f.store.GetOperation(context.Background(), op.Result.OperationID)
	if err != nil || recovered.RecoveryPrincipal == nil || recovered.RecoveryPrincipal.ExecutionID != f.principal.ExecutionID {
		t.Fatal("recovery execution not audited", recovered, err)
	}
}

func TestStoreRejectsTerminalResolutionOfUnreadyRouting(t *testing.T) {
	f := newFixture(t)
	receipt := verified(t, f, prepared(t, f, "prepared"), "verified")
	f.target.mode = "unknown"
	pending := run(t, f, data.Activate, activationInput(f, receipt, 0, "pending"))
	op, err := f.store.GetOperation(t.Context(), pending.OperationID)
	if err != nil {
		t.Fatal(err)
	}
	state, err := f.store.Target(t.Context(), op.Target)
	if err != nil || state.Pending == nil {
		t.Fatal(state, err)
	}
	lease, err := f.store.AcquireRecovery(t.Context(), op.Result.OperationID, op.Target, 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	for _, routing := range []data.IntentObservation{data.RoutingPrior, data.RoutingNext} {
		outcome := op
		outcome.Result.State = data.Failed
		outcome.Result.Phase = "not_activated"
		if routing == data.RoutingNext {
			outcome.Result.State = data.Succeeded
			outcome.Result.Activation = &state.Pending.Next
		}
		if _, err = f.store.ResolveIntent(t.Context(), lease, *state.Pending, data.Observation{Routing: routing}, outcome, op.Result.Revision); data.ErrorCode(err) != data.CodeInvalid {
			t.Fatal("unready route accepted terminal outcome", routing, err)
		}
		current, loadErr := f.store.GetOperation(t.Context(), op.Result.OperationID)
		if loadErr != nil || current.Result.Revision != op.Result.Revision || current.Result.State != data.Running {
			t.Fatal("rejected resolution changed operation", current, loadErr)
		}
	}
	// A truthful recovering result is accepted under the same store-level rule.
	if _, err = f.store.ResolveIntent(t.Context(), lease, *state.Pending, data.Observation{Routing: data.RoutingPrior}, op, op.Result.Revision); err != nil {
		t.Fatal(err)
	}
	current, err := f.store.Target(t.Context(), op.Target)
	if err != nil || current.Pending == nil || !current.RecoveryRequired || current.Activation.Generation != 0 {
		t.Fatal("unready routing cleared recovery authority", current, err)
	}
	if err = f.store.Release(t.Context(), lease); err != nil {
		t.Fatal(err)
	}
}

func TestStoreRequestLookupHonorsScopeAndRetryTombstones(t *testing.T) {
	f := newFixture(t)
	result := run(t, f, data.Validate, f.input)
	key := data.RequestKey{ActorID: f.principal.ActorID, Target: data.TargetKey{ScopeKey: f.principal.ScopeKey, TargetID: f.input.TargetID}, Kind: data.Validate, IdempotencyKey: f.input.IdempotencyKey}
	op, found, err := f.store.LookupRequest(t.Context(), key)
	if err != nil || !found || op.Result.OperationID != result.OperationID {
		t.Fatal(op, found, err)
	}
	for _, other := range []data.RequestKey{
		{ActorID: "other", Target: key.Target, Kind: key.Kind, IdempotencyKey: key.IdempotencyKey},
		{ActorID: key.ActorID, Target: data.TargetKey{ScopeKey: "other", TargetID: key.Target.TargetID}, Kind: key.Kind, IdempotencyKey: key.IdempotencyKey},
		{ActorID: key.ActorID, Target: key.Target, Kind: data.Prepare, IdempotencyKey: key.IdempotencyKey},
	} {
		if _, found, err = f.store.LookupRequest(t.Context(), other); err != nil || found {
			t.Fatal("foreign request found", found, err)
		}
	}
	f.now.Add(int64(8 * 24 * time.Hour))
	if err = f.store.Prune(t.Context()); err != nil {
		t.Fatal(err)
	}
	if _, found, err = f.store.LookupRequest(t.Context(), key); !found || data.ErrorCode(err) != data.CodeGone {
		t.Fatal("live tombstone treated as new request", found, err)
	}
	f.now.Add(int64(23 * 24 * time.Hour))
	if _, found, err = f.store.LookupRequest(t.Context(), key); err != nil || found {
		t.Fatal("expired claim remains replayable", found, err)
	}
}

func TestStoreReceiptPagesDoNotDependOnOperationHistory(t *testing.T) {
	f := newFixture(t)
	want := map[string]bool{}
	for i := 0; i < 3; i++ {
		receipt := prepared(t, f, fmt.Sprintf("prepare-%d", i))
		want[receipt.ID] = true
		f.now.Add(int64(time.Second))
	}
	key := data.TargetKey{ScopeKey: f.principal.ScopeKey, TargetID: f.input.TargetID}
	query := data.ReceiptQuery{Limit: 1}
	seen := map[string]bool{}
	for i := 0; i < 3; i++ {
		page, err := f.store.ListReceipts(t.Context(), key, query)
		if err != nil || len(page.Receipts) != 1 {
			t.Fatal(page, err)
		}
		id := page.Receipts[0].ID
		if !want[id] || seen[id] {
			t.Fatal("receipt duplicated or foreign", page)
		}
		seen[id] = true
		query.Cursor = page.NextCursor
		if (i == 2) != (query.Cursor == "") {
			t.Fatal("incorrect page termination", page)
		}
	}
	page, err := f.store.ListReceipts(t.Context(), data.TargetKey{ScopeKey: "other", TargetID: key.TargetID}, data.ReceiptQuery{Limit: 100})
	if err != nil || len(page.Receipts) != 0 {
		t.Fatal("foreign receipts returned", page, err)
	}
	if _, err = f.store.ListReceipts(t.Context(), key, data.ReceiptQuery{Limit: 1, Cursor: "invalid"}); data.ErrorCode(err) != data.CodeInvalid {
		t.Fatal("invalid cursor accepted", err)
	}
}
