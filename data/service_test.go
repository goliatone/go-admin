package data_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/data/examples/sqlitestore"
)

type fixture struct {
	service   *data.Service
	store     *sqlitestore.Store
	provider  *testProvider
	target    *testTarget
	input     data.Input
	principal data.Principal
	now       atomic.Int64
	revoked   atomic.Bool
	path      string
}

func fixtureInput(t *testing.T) data.Input {
	t.Helper()
	h := strings.Repeat("a", 64)
	d := data.Descriptor{Dataset: data.DatasetRef{Provider: "sample", ID: "a", Version: "1"}, Components: []data.Component{{Path: "records.json", Digest: h}}, SourceContractHash: h, SourceContractVersion: "1", PolicyHash: h, Synthetic: true}
	d.Scenarios = []data.ScenarioRef{{Dataset: d.Dataset, ID: "ready", Version: "1", ProfileHash: h}}
	digest, err := d.CompositeDigest()
	if err != nil {
		t.Fatal(err)
	}
	d.Dataset.Digest = digest
	d.Scenarios[0].Dataset = d.Dataset
	return data.Input{Dataset: d.Dataset, Scenario: data.ScenarioRef{Dataset: d.Dataset, ID: "ready", Version: "1", ProfileHash: h}, TargetID: "preview", IdempotencyKey: "one"}
}

type testPolicy struct{ denied string }

func (p *testPolicy) Authorize(_ context.Context, principal data.Principal, request data.AccessRequest) error {
	if request.Action == p.denied {
		return errors.New("denied")
	}
	if request.Target.ScopeKey != principal.ScopeKey {
		return errors.New("scope")
	}
	return nil
}
func newFixture(t *testing.T) *fixture {
	t.Helper()
	root := t.TempDir()
	f := &fixture{input: fixtureInput(t), path: filepath.Join(root, "operations.db")}
	f.now.Store(time.Now().UnixNano())
	store, err := sqlitestore.Open(f.path, sqlitestore.Options{Now: func() time.Time { return time.Unix(0, f.now.Load()) }})
	if err != nil {
		t.Fatal(err)
	}
	f.store = store
	t.Cleanup(func() {
		if closeErr := store.Close(); closeErr != nil {
			t.Errorf("close store: %v", closeErr)
		}
	})
	h := strings.Repeat("a", 64)
	f.principal = data.Principal{ActorID: "alice", ScopeKey: "org", ExecutionID: "bounded-bootstrap", ModuleHash: h, PolicyHash: h, PermissionHash: h}
	target := &testTarget{root: filepath.Join(root, "targets"), store: store}
	f.target = target
	f.provider = &testProvider{input: f.input, target: target}
	f.service = f.newService(t, store)
	return f
}
func (f *fixture) newService(t *testing.T, store data.OperationStore) *data.Service {
	t.Helper()
	service, err := data.NewService(f.serviceConfig(store))
	if err != nil {
		t.Fatal(err)
	}
	return service
}
func (f *fixture) serviceConfig(store data.OperationStore) data.ServiceConfig {
	return data.ServiceConfig{Providers: map[string]data.Provider{"sample": f.provider}, Target: f.target, Store: store, Policy: &testPolicy{}, Resolve: func(context.Context) (data.Principal, error) {
		if f.revoked.Load() {
			return data.Principal{}, errors.New("revoked")
		}
		return f.principal, nil
	}, WritesEnabled: true, LeaseDuration: 5 * time.Second}
}
func run(t *testing.T, f *fixture, k data.Kind, input data.Input) data.Result {
	t.Helper()
	result, err := f.service.Run(context.Background(), k, input)
	if err != nil {
		t.Fatalf("%s: %v", k, err)
	}
	return result
}
func successful(t *testing.T, result data.Result) {
	t.Helper()
	if result.State != data.Succeeded || result.Failure != nil {
		t.Fatalf("not successful: %+v", result)
	}
}
func prepared(t *testing.T, f *fixture, key string) data.PreparationReceipt {
	t.Helper()
	in := f.input
	in.IdempotencyKey = key
	r := run(t, f, data.Prepare, in)
	successful(t, r)
	if r.Active || r.Receipt == nil {
		t.Fatal("preparation claimed activation")
	}
	return *r.Receipt
}
func verified(t *testing.T, f *fixture, r data.PreparationReceipt, key string) data.PreparationReceipt {
	t.Helper()
	in := f.input
	in.IdempotencyKey = key
	in.ReceiptID = r.ID
	result := run(t, f, data.Verify, in)
	successful(t, result)
	return *result.Receipt
}
func activationInput(f *fixture, r data.PreparationReceipt, generation uint64, key string) data.Input {
	in := f.input
	in.ReceiptID = r.ID
	in.ExpectedGeneration = &generation
	in.IdempotencyKey = key
	return in
}

type testProvider struct {
	includeArtifacts bool
	artifactReads    atomic.Int64
	afterArtifact    func()

	input      data.Input
	target     *testTarget
	effects    atomic.Int64
	fail       atomic.Bool
	started    chan struct{}
	unblock    chan struct{}
	failChecks atomic.Bool
}

func (p *testProvider) Describe(_ context.Context, _ data.Principal, ref data.DatasetRef) (data.Descriptor, error) {
	h := strings.Repeat("a", 64)
	d := data.Descriptor{Dataset: ref, Components: []data.Component{{Path: "records.json", Digest: h}}, SourceContractHash: h, SourceContractVersion: "1", PolicyHash: h, Synthetic: true, Capabilities: map[data.Kind]data.Capability{}}
	d.Scenarios = []data.ScenarioRef{p.input.Scenario}
	for _, k := range []data.Kind{data.Validate, data.Prepare, data.Refresh, data.Verify, data.Activate, data.Reset, data.Generate, data.Cancel} {
		d.Capabilities[k] = data.Capability{Supported: true}
	}
	return d, nil
}
func (p *testProvider) Validate(context.Context, data.Principal, data.Input) ([]data.Check, error) {
	status := data.CheckPassed
	if p.failChecks.Load() {
		status = data.CheckFailed
	}
	return []data.Check{{ID: "source", Status: status}}, nil
}
func (p *testProvider) Plan(context.Context, data.Principal, data.Kind, data.Input) ([]data.Check, error) {
	return []data.Check{{ID: "query", Status: data.CheckPlanned}}, nil
}
func (p *testProvider) Prepare(ctx context.Context, w data.Work) (data.PreparationReceipt, error) {
	return p.prepare(ctx, w)
}
func (p *testProvider) Refresh(ctx context.Context, w data.Work) (data.PreparationReceipt, error) {
	return p.prepare(ctx, w)
}
func (p *testProvider) prepare(ctx context.Context, w data.Work) (data.PreparationReceipt, error) {
	if p.started != nil {
		close(p.started)
		select {
		case <-p.unblock:
		case <-ctx.Done():
			return data.PreparationReceipt{}, ctx.Err()
		}
	}
	if err := w.BeforeEffects(ctx); err != nil {
		return data.PreparationReceipt{}, err
	}
	if p.fail.Load() {
		return data.PreparationReceipt{}, errors.New("secret DSN provider failure")
	}
	b := []byte(`{"records":["a","b"]}`)
	if err := os.WriteFile(filepath.Join(p.target.root, w.StageID, "records.json"), b, 0600); err != nil {
		return data.PreparationReceipt{}, err
	}
	p.effects.Add(1)
	if err := w.Progress(ctx, data.Progress{Stage: "seed", Completed: 2, Total: 2}); err != nil {
		return data.PreparationReceipt{}, err
	}
	hash := sha256.Sum256(b)
	return data.PreparationReceipt{ID: "receipt-" + w.StageID, Target: data.TargetKey{ScopeKey: w.Principal.ScopeKey, TargetID: w.Input.TargetID}, StageID: w.StageID, Dataset: w.Input.Dataset, Scenario: w.Input.Scenario, ModuleHash: w.Principal.ModuleHash, PolicyHash: w.Principal.PolicyHash, PermissionHash: w.Principal.PermissionHash, ContentRevision: 1, SourceCheckpoint: "source-1", DerivedCheckpoint: hex.EncodeToString(hash[:]), RequesterID: w.Principal.ActorID}, nil
}
func (p *testProvider) Verify(ctx context.Context, w data.Work, r data.PreparationReceipt) (data.VerificationResult, error) {
	if err := w.BeforeEffects(ctx); err != nil {
		return data.VerificationResult{}, err
	}
	b, err := os.ReadFile(filepath.Join(p.target.root, r.StageID, "records.json"))
	if err != nil {
		return data.VerificationResult{}, err
	}
	var source struct {
		Records []string `json:"records"`
	}
	if err = json.Unmarshal(b, &source); err != nil {
		return data.VerificationResult{}, err
	}
	status := data.CheckFailed
	if len(source.Records) == 2 {
		status = data.CheckPassed
	}
	result := data.VerificationResult{ID: "verification-" + r.ID, ContentRevision: r.ContentRevision, Checks: []data.Check{{ID: "query-count", Status: status, Expected: "2", Actual: string(rune('0' + len(source.Records)))}}}
	if p.includeArtifacts {
		result.Artifacts = []data.ArtifactRef{{ID: "report-" + w.OperationID, Target: data.TargetKey{ScopeKey: w.Principal.ScopeKey, TargetID: w.Input.TargetID}, RequesterID: w.Principal.ActorID, ExpiresAt: time.Now().Add(time.Hour)}}
	}
	return result, nil
}
func (p *testProvider) Generate(ctx context.Context, w data.Work) (data.DatasetRef, error) {
	if err := w.BeforeEffects(ctx); err != nil {
		return data.DatasetRef{}, err
	}
	p.effects.Add(1)
	return w.Input.Dataset, nil
}

type testTarget struct {
	root     string
	store    data.OperationStore
	mu       sync.Mutex
	mode     string
	commits  atomic.Int64
	cleanups atomic.Int64
}

func (*testTarget) Capabilities() data.TargetCapabilities {
	return data.TargetCapabilities{Recovery: true, Fencing: true, SafeReset: true, Cancellation: true}
}
func (t *testTarget) Allocate(ctx context.Context, w data.Work) error {
	if err := w.BeforeEffects(ctx); err != nil {
		return err
	}
	if err := t.store.CheckLease(ctx, w.Lease); err != nil {
		return err
	}
	return os.MkdirAll(filepath.Join(t.root, w.StageID), 0700)
}
func (t *testTarget) InspectReceipt(_ context.Context, r data.PreparationReceipt) error {
	b, err := os.ReadFile(filepath.Join(t.root, r.StageID, "records.json"))
	if err != nil {
		return err
	}
	h := sha256.Sum256(b)
	if hex.EncodeToString(h[:]) != r.DerivedCheckpoint {
		return data.Error(data.CodeConflict)
	}
	return nil
}
func (t *testTarget) Commit(ctx context.Context, w data.Work, intent data.Intent) error {
	if err := w.BeforeEffects(ctx); err != nil {
		return err
	}
	if err := t.store.CheckLease(ctx, w.Lease); err != nil {
		return err
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.mode == "prior" || t.mode == "prior-unready" {
		return errors.New("failed before commit")
	}
	if t.mode == "unknown" {
		return errors.New("routing unreadable")
	}
	encoded, encodeErr := json.Marshal(intent)
	if encodeErr != nil {
		return encodeErr
	}
	if err := os.MkdirAll(t.root, 0700); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(t.root, "routing.json"), encoded, 0600); err != nil {
		return err
	}
	t.commits.Add(1)
	if t.mode == "after" {
		return errors.New("crash after physical commit")
	}
	return nil
}
func (t *testTarget) InspectIntent(_ context.Context, intent data.Intent) (data.Observation, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.mode == "unknown" {
		return data.Observation{}, errors.New("routing unreadable")
	}
	ready := t.mode != "prior-unready" && t.mode != "next-unready"
	b, err := os.ReadFile(filepath.Join(t.root, "routing.json"))
	if os.IsNotExist(err) {
		return data.Observation{Routing: data.RoutingPrior, Ready: ready}, nil
	}
	if err != nil {
		return data.Observation{}, err
	}
	var committed data.Intent
	if err = json.Unmarshal(b, &committed); err != nil {
		return data.Observation{}, err
	}
	if committed.ID == intent.ID {
		return data.Observation{Routing: data.RoutingNext, Ready: ready}, nil
	}
	if committed.Next == intent.Prior {
		return data.Observation{Routing: data.RoutingPrior, Ready: ready}, nil
	}
	return data.Observation{Routing: data.RoutingUnknown}, nil
}
func (t *testTarget) DrainCleanup(ctx context.Context, w data.Work, stage string) error {
	if err := t.store.CheckLease(ctx, w.Lease); err != nil {
		return err
	}
	t.cleanups.Add(1)
	return os.RemoveAll(filepath.Join(t.root, stage))
}

func TestLifecycleRetryRefreshAndRollback(t *testing.T) {
	f := newFixture(t)
	r := prepared(t, f, "prepare")
	replay := f.input
	replay.IdempotencyKey = "prepare"
	got := run(t, f, data.Prepare, replay)
	if got.Receipt.ID != r.ID || f.provider.effects.Load() != 1 {
		t.Fatal("retry duplicated work")
	}
	replay.BatchLimit = 2
	if _, err := f.service.Run(context.Background(), data.Prepare, replay); data.ErrorCode(err) != data.CodeConflict {
		t.Fatal("fingerprint conflict", err)
	}
	r = verified(t, f, r, "verify")
	in := activationInput(f, r, 0, "activate")
	first := run(t, f, data.Activate, in)
	successful(t, first)
	if !first.Active || first.Activation.Generation != 1 {
		t.Fatal(first)
	}
	refresh := f.input
	refresh.IdempotencyKey = "fresh"
	newResult := run(t, f, data.Refresh, refresh)
	successful(t, newResult)
	if newResult.Active || newResult.Receipt.StageID == r.StageID {
		t.Fatal("refresh changed active stage")
	}
	state, stateErr := f.store.Target(context.Background(), data.TargetKey{ScopeKey: "org", TargetID: "preview"})
	if stateErr != nil {
		t.Fatal(stateErr)
	}
	if state.Activation.Generation != 1 || state.Activation.ReceiptID != r.ID {
		t.Fatal("refresh activated implicitly")
	}
	stale := run(t, f, data.Activate, activationInput(f, r, 0, "stale"))
	if stale.Failure == nil || stale.Failure.Code != data.CodeStale {
		t.Fatal(stale)
	}
	r2 := verified(t, f, *newResult.Receipt, "verify-new")
	second := run(t, f, data.Activate, activationInput(f, r2, 1, "switch"))
	successful(t, second)
	rollback := run(t, f, data.Activate, activationInput(f, r, 2, "rollback"))
	successful(t, rollback)
	if rollback.Activation.Generation != 3 || rollback.Activation.ReceiptID != r.ID {
		t.Fatal("rollback decremented generation")
	}
}
func TestDryRunsAndPrerequisiteFailureHaveNoEffects(t *testing.T) {
	f := newFixture(t)
	r := verified(t, f, prepared(t, f, "prepare"), "verify")
	before := f.provider.effects.Load()
	commits := f.target.commits.Load()
	for _, k := range []data.Kind{data.Validate, data.Prepare, data.Refresh, data.Verify, data.Activate, data.Reset, data.Generate} {
		in := f.input
		in.IdempotencyKey = "dry-" + string(k)
		in.DryRun = true
		if k == data.Activate || k == data.Verify {
			in.ReceiptID = r.ID
		}
		if k == data.Activate || k == data.Reset {
			var gen uint64
			in.ExpectedGeneration = &gen
		}
		result := run(t, f, k, in)
		successful(t, result)
		if result.Active || result.Phase != "planned" {
			t.Fatal(result)
		}
		for _, c := range result.Checks {
			if c.Status != data.CheckPlanned {
				t.Fatal("false executed check")
			}
		}
	}
	if f.provider.effects.Load() != before || f.target.commits.Load() != commits {
		t.Fatal("dry-run effects")
	}
	f.provider.failChecks.Store(true)
	in := f.input
	in.IdempotencyKey = "bad-prerequisites"
	bad := run(t, f, data.Prepare, in)
	if bad.State != data.Failed || f.provider.effects.Load() != before {
		t.Fatal("failed prerequisite prepared stage")
	}
}

type validationProvider struct {
	data.Provider
	checks []data.Check
	err    error
	calls  int
}

func (p *validationProvider) Validate(context.Context, data.Principal, data.Input) ([]data.Check, error) {
	p.calls++
	return p.checks, p.err
}

func TestValidationFailurePersistsExecutedEvidence(t *testing.T) {
	for _, kind := range []data.Kind{data.Validate, data.Prepare} {
		for _, tc := range []struct {
			name   string
			checks []data.Check
			err    error
			code   string
			valid  bool
		}{
			{"failed", []data.Check{{ID: "source", Status: data.CheckFailed, Expected: "available", Actual: "missing", EvidenceRef: "source-check"}}, nil, data.CodeInvalid, true},
			{"unavailable", []data.Check{{ID: "source", Status: data.CheckUnavailable}}, nil, data.CodeInvalid, true},
			{"partial-provider-error", []data.Check{{ID: "source", Status: data.CheckUnavailable}}, errors.New("private source error"), data.CodeProvider, true},
			{"empty-provider-error", nil, errors.New("private source error"), data.CodeProvider, false},
			{"planned-not-executed", []data.Check{{ID: "source", Status: data.CheckPlanned}}, nil, data.CodeInvalid, false},
			{"duplicate-checks", []data.Check{{ID: "source", Status: data.CheckPassed}, {ID: "source", Status: data.CheckFailed}}, nil, data.CodeInvalid, false},
		} {
			t.Run(string(kind)+"/"+tc.name, func(t *testing.T) {
				f := newFixture(t)
				provider := &validationProvider{Provider: f.provider, checks: tc.checks, err: tc.err}
				cfg := f.serviceConfig(f.store)
				cfg.Providers["sample"] = provider
				service, err := data.NewService(cfg)
				if err != nil {
					t.Fatal(err)
				}
				f.service = service
				result := run(t, f, kind, f.input)
				if result.State != data.Failed || result.Failure == nil || result.Failure.Code != tc.code || result.Receipt != nil {
					t.Fatal("validation failure misreported", result)
				}
				want := tc.checks
				if !tc.valid {
					want = nil
				}
				lookedUp, err := service.LookupOperation(t.Context(), result.OperationID)
				if err != nil || !slices.Equal(result.Checks, want) || !slices.Equal(lookedUp.Result.Checks, want) {
					t.Fatal("executed evidence lost or malformed evidence persisted", result, lookedUp, err)
				}
				again := run(t, f, kind, f.input)
				if again.OperationID != result.OperationID || again.Revision != result.Revision || !slices.Equal(again.Checks, want) || provider.calls != 1 {
					t.Fatal("validation retry changed evidence or reran work", again)
				}
				if f.provider.effects.Load() != 0 || f.target.commits.Load() != 0 || lookedUp.StageID != "" {
					t.Fatal("failed validation produced target/domain effects")
				}
			})
		}
	}
}
func TestFailureAndContentMutationPreserveActiveTarget(t *testing.T) {
	f := newFixture(t)
	r := verified(t, f, prepared(t, f, "p"), "v")
	successful(t, run(t, f, data.Activate, activationInput(f, r, 0, "a")))
	f.provider.fail.Store(true)
	in := f.input
	in.IdempotencyKey = "failed-refresh"
	bad := run(t, f, data.Refresh, in)
	if bad.State != data.Failed || bad.Failure.Code != data.CodeProvider || f.target.cleanups.Load() != 1 {
		t.Fatal(bad)
	}
	encoded, encodeErr := json.Marshal(bad)
	if encodeErr != nil {
		t.Fatal(encodeErr)
	}
	if strings.Contains(string(encoded), "secret") {
		t.Fatal("provider failure disclosed")
	}
	f.provider.fail.Store(false)
	if err := os.WriteFile(filepath.Join(f.target.root, r.StageID, "records.json"), []byte("changed"), 0600); err != nil {
		t.Fatal(err)
	}
	bad = run(t, f, data.Activate, activationInput(f, r, 1, "mutated"))
	if bad.State != data.Failed || f.target.commits.Load() != 1 {
		t.Fatal("mutated receipt activated")
	}
}
func TestCancellationAndBusyAcrossWorkers(t *testing.T) {
	f := newFixture(t)
	f.provider.started = make(chan struct{})
	f.provider.unblock = make(chan struct{})
	result := make(chan data.Result, 1)
	errs := make(chan error, 1)
	go func() { r, e := f.service.Run(context.Background(), data.Prepare, f.input); result <- r; errs <- e }()
	<-f.provider.started
	store2, err := sqlitestore.Open(f.path, sqlitestore.Options{Now: func() time.Time { return time.Unix(0, f.now.Load()) }})
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if closeErr := store2.Close(); closeErr != nil {
			t.Errorf("close store: %v", closeErr)
		}
	}()
	service2 := f.newService(t, store2)
	other := f.input
	other.IdempotencyKey = "other"
	busy, e := service2.Run(context.Background(), data.Prepare, other)
	if e != nil || busy.Failure == nil || busy.Failure.Code != data.CodeBusy {
		t.Fatal(busy, e)
	}
	ops, e := f.service.Operations(context.Background(), "preview", 10)
	if e != nil {
		t.Fatal(e)
	}
	var operationID string
	for _, op := range ops {
		if op.Input.IdempotencyKey == f.input.IdempotencyKey {
			operationID = op.Result.OperationID
		}
	}
	cancel := data.Input{TargetID: "preview", IdempotencyKey: "cancel", OperationID: operationID}
	requested := run(t, f, data.Cancel, cancel)
	if requested.Phase != "cancel_requested" {
		t.Fatal(requested)
	}
	close(f.provider.unblock)
	done := <-result
	if e = <-errs; e != nil || done.State != data.Canceled || f.provider.effects.Load() != 0 {
		t.Fatal(done, e)
	}
	if f.target.cleanups.Load() != 1 {
		t.Fatal("canceled stage not drained")
	}
	retry := run(t, f, data.Prepare, f.input)
	if retry.OperationID != done.OperationID || retry.State != data.Canceled {
		t.Fatal("retry restarted canceled operation")
	}
}
func TestIntentRecoveryAfterRestartAndUnknownAuthority(t *testing.T) {
	for _, mode := range []string{"after", "unknown", "prior"} {
		t.Run(mode, func(t *testing.T) {
			f := newFixture(t)
			r := verified(t, f, prepared(t, f, "p"), "v")
			f.target.mode = mode
			result := run(t, f, data.Activate, activationInput(f, r, 0, "a"))
			if mode == "after" {
				successful(t, result)
				if result.Activation.Generation != 1 {
					t.Fatal(result)
				}
				return
			}
			if mode == "prior" {
				if result.State != data.Failed {
					t.Fatal(result)
				}
				return
			}
			if result.Phase != "recovering" || result.Failure.Code != data.CodeRecovery {
				t.Fatal(result)
			}
			// Simulate process restart by opening a new store and constructing a service;
			// the intent, generation and operation are read from disk, not fixture memory.
			reopened, e := sqlitestore.Open(f.path, sqlitestore.Options{Now: func() time.Time { return time.Unix(0, f.now.Load()) }})
			if e != nil {
				t.Fatal(e)
			}
			defer func() {
				if closeErr := reopened.Close(); closeErr != nil {
					t.Errorf("close store: %v", closeErr)
				}
			}()
			service := f.newService(t, reopened)
			f.target.mode = ""
			recovered, e := service.Recover(context.Background(), result.OperationID)
			if e != nil || recovered.State != data.Failed {
				t.Fatal(recovered, e)
			}
			state, e := reopened.Target(context.Background(), data.TargetKey{ScopeKey: "org", TargetID: "preview"})
			if e != nil || state.Pending != nil || state.RecoveryRequired || state.Activation.Generation != 0 {
				t.Fatal(state, e)
			}
		})
	}
}
func TestCurrentPolicyAndLeaseLossStopEffects(t *testing.T) {
	for _, revoke := range []bool{true, false} {
		t.Run(map[bool]string{true: "revoked", false: "lease-lost"}[revoke], func(t *testing.T) {
			f := newFixture(t)
			f.provider.started = make(chan struct{})
			f.provider.unblock = make(chan struct{})
			results := make(chan data.Result, 1)
			errs := make(chan error, 1)
			go func() { r, e := f.service.Run(context.Background(), data.Prepare, f.input); results <- r; errs <- e }()
			<-f.provider.started
			if revoke {
				f.revoked.Store(true)
			} else {
				f.now.Add(int64(6 * time.Second))
			}
			close(f.provider.unblock)
			result := <-results
			err := <-errs
			if f.provider.effects.Load() != 0 {
				t.Fatal("effect after revocation/lease loss")
			}
			if revoke {
				if data.ErrorCode(err) != data.CodeDenied {
					t.Fatal(result, err)
				}
			} else {
				if data.ErrorCode(err) != data.CodeLeaseLost {
					t.Fatal(result, err)
				}
				ops, e := f.store.ListOperations(context.Background(), data.TargetKey{ScopeKey: "org", TargetID: "preview"}, 10)
				if e != nil {
					t.Fatal(e)
				}
				recovery, e := f.service.Recover(context.Background(), ops[0].Result.OperationID)
				if e != nil || recovery.State != data.Failed || f.target.cleanups.Load() != 1 {
					t.Fatal(recovery, e)
				}
			}
		})
	}
}

func TestUnreadyRoutingPreservesRecoveryAcrossRestart(t *testing.T) {
	for _, kind := range []data.Kind{data.Activate, data.Reset} {
		for _, mode := range []string{"prior-unready", "next-unready"} {
			t.Run(string(kind)+"/"+mode, func(t *testing.T) {
				testUnreadyRoutingRecovery(t, kind, mode)
			})
		}
	}
}

func testUnreadyRoutingRecovery(t *testing.T, kind data.Kind, mode string) {
	t.Helper()
	f := newFixture(t)
	prior := verified(t, f, prepared(t, f, "prepare-prior"), "verify-prior")
	successful(t, run(t, f, data.Activate, activationInput(f, prior, 0, "active-prior")))
	next := verified(t, f, prepared(t, f, "prepare-next"), "verify-next")
	input := activationInput(f, next, 1, "unready-handover")
	if kind == data.Reset {
		input.ReceiptID = ""
	}
	f.target.mode = mode
	pending := run(t, f, kind, input)
	requireRecoveringTarget(t, f, pending.OperationID)
	state, err := f.store.Target(t.Context(), data.TargetKey{ScopeKey: "org", TargetID: input.TargetID})
	if err != nil {
		t.Fatal(err)
	}
	intentID := state.Pending.ID
	effects := f.provider.effects.Load()
	blockedInput := f.input
	blockedInput.IdempotencyKey = "blocked-write"
	blocked := run(t, f, data.Prepare, blockedInput)
	if blocked.Failure == nil || blocked.Failure.Code != data.CodeRecovery || f.provider.effects.Load() != effects {
		t.Fatal("unready routing permitted new effects", blocked)
	}
	// Recovery authority must survive both retention and a fresh process/store.
	f.now.Add(int64(8 * 24 * time.Hour))
	if err = f.store.Prune(t.Context()); err != nil {
		t.Fatal(err)
	}
	if err = f.store.Close(); err != nil {
		t.Fatal(err)
	}
	reopened, err := sqlitestore.Open(f.path, sqlitestore.Options{Now: func() time.Time { return time.Unix(0, f.now.Load()) }})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := reopened.Close(); closeErr != nil {
			t.Errorf("close reopened store: %v", closeErr)
		}
	})
	f.store = reopened
	f.target = &testTarget{root: f.target.root, store: reopened, mode: mode}
	f.provider.target = f.target
	f.service = f.newService(t, reopened)
	for _, receipt := range []data.PreparationReceipt{prior, next} {
		// Reset does not reference the unused next receipt; it may expire normally.
		if kind == data.Reset && receipt.ID == next.ID {
			continue
		}
		if _, err = reopened.GetReceipt(t.Context(), receipt.ID); err != nil {
			t.Fatal("recovery receipt pruned", receipt.ID, err)
		}
	}
	if _, err = f.service.Recover(t.Context(), pending.OperationID); err != nil {
		t.Fatal(err)
	}
	requireRecoveringTarget(t, f, pending.OperationID)
	state, err = reopened.Target(t.Context(), data.TargetKey{ScopeKey: "org", TargetID: input.TargetID})
	if err != nil || state.Pending.ID != intentID {
		t.Fatal("recovery changed intent authority", state, err)
	}
	// A later healthy observation settles the same intent without replaying Commit.
	f.target.mode = ""
	recovered, err := f.service.Recover(t.Context(), pending.OperationID)
	if err != nil {
		t.Fatal(err)
	}
	wantGeneration := uint64(1)
	wantState := data.Failed
	if mode == "next-unready" {
		wantGeneration = 2
		wantState = data.Succeeded
	}
	state, err = reopened.Target(t.Context(), data.TargetKey{ScopeKey: "org", TargetID: input.TargetID})
	if err != nil || state.Pending != nil || state.RecoveryRequired || state.Activation.Generation != wantGeneration || recovered.State != wantState {
		t.Fatal("healthy routing did not settle correctly", state, recovered, err)
	}
	if recovered.State == data.Failed && (recovered.Failure == nil || recovered.Failure.Code != data.CodeProvider) {
		t.Fatal("settled handover still claims recovery is required", recovered)
	}
	again, err := f.service.Recover(t.Context(), pending.OperationID)
	if err != nil || again.Revision != recovered.Revision || f.target.commits.Load() != 0 || f.provider.effects.Load() != effects {
		t.Fatal("recovery replayed effects or advanced revision", again, err)
	}
}

func requireRecoveringTarget(t *testing.T, f *fixture, operationID string) {
	t.Helper()
	op, err := f.store.GetOperation(t.Context(), operationID)
	if err != nil || op.Result.State != data.Running || op.Result.Phase != "recovering" || op.Result.Active || op.Result.Activation != nil {
		t.Fatal("unready operation falsely finalized", op, err)
	}
	active, err := f.service.Active(t.Context(), f.input.TargetID)
	if err != nil || active.Activation.Ready || active.Activation.Generation != 1 || !active.Transitioning || !active.RecoveryRequired {
		t.Fatal("unready route falsely presented as ready", active, err)
	}
}

type releaseFailureStore struct {
	data.OperationStore
	beforeRelease func()
}

func (s releaseFailureStore) Release(context.Context, data.Lease) error {
	if s.beforeRelease != nil {
		s.beforeRelease()
	}
	return errors.New("private store release failure")
}

func TestLifecycleReportsLeaseReleaseFailureWithoutLosingResult(t *testing.T) {
	f := newFixture(t)
	f.service = f.newService(t, releaseFailureStore{OperationStore: f.store})
	result, err := f.service.Run(context.Background(), data.Prepare, f.input)
	if err == nil || data.ErrorCode(err) != data.CodeProvider || strings.Contains(err.Error(), "private store") {
		t.Fatalf("unsafe or missing release error: %v", err)
	}
	successful(t, result)
	if result.Receipt == nil {
		t.Fatal("lease cleanup lost the prepared receipt")
	}
}

func TestLifecycleDeliveryReauthorizesAfterReleaseFailure(t *testing.T) {
	for _, action := range []string{"prepare", "recover"} {
		for _, change := range []string{"none", "principal-revoked", "grant-revoked"} {
			t.Run(action+"/"+change, func(t *testing.T) {
				testReleaseFailureDelivery(t, action, change)
			})
		}
	}
}

func testReleaseFailureDelivery(t *testing.T, action, change string) {
	t.Helper()
	f := newFixture(t)
	policy := &testPolicy{}
	store := releaseFailureStore{OperationStore: f.store, beforeRelease: func() {
		switch change {
		case "principal-revoked":
			f.revoked.Store(true)
		case "grant-revoked":
			policy.denied = action
		}
	}}
	cfg := f.serviceConfig(store)
	cfg.Policy = policy
	service, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	var result data.Result
	if action == "recover" {
		claim, claimErr := f.store.Claim(t.Context(), claimedOperation(t, f, "abandoned", "abandoned", data.Prepare, f.input))
		if claimErr != nil {
			t.Fatal(claimErr)
		}
		// Recovery grants belong to the supervisor, not the original requester.
		f.principal.ActorID = "supervisor"
		result, err = service.Recover(t.Context(), claim.Operation.Result.OperationID)
	} else {
		result, err = service.Run(t.Context(), data.Prepare, f.input)
	}
	if change != "none" {
		if data.ErrorCode(err) != data.CodeDenied || result.OperationID != "" || result.Receipt != nil {
			t.Fatalf("revoked result disclosed: %+v, %v", result, err)
		}
	} else if data.ErrorCode(err) != data.CodeProvider || result.OperationID == "" {
		t.Fatalf("authorized durable result or release error lost: %+v, %v", result, err)
	}
	ops, loadErr := f.store.ListOperations(t.Context(), data.TargetKey{ScopeKey: "org", TargetID: f.input.TargetID}, 10)
	if loadErr != nil || len(ops) != 1 || !ops[0].Result.State.Terminal() {
		t.Fatalf("delivery changed durable completion: %+v, %v", ops, loadErr)
	}
	if action == "prepare" && (ops[0].Result.State != data.Succeeded || ops[0].Result.Receipt == nil) {
		t.Fatal("prepared receipt lost on delivery failure", ops[0])
	}
}

type policyFunc func(context.Context, data.Principal, data.AccessRequest) error

func (p policyFunc) Authorize(ctx context.Context, principal data.Principal, access data.AccessRequest) error {
	return p(ctx, principal, access)
}

func TestOperationListDeliveryChecksCurrentAccess(t *testing.T) {
	for _, change := range []string{"record-denied", "principal-revoked", "view-revoked", "scope-changed"} {
		t.Run(change, func(t *testing.T) {
			f := newFixture(t)
			for _, key := range []string{"first", "second"} {
				input := f.input
				input.IdempotencyKey = key
				successful(t, run(t, f, data.Validate, input))
			}
			checks := 0
			viewRevoked := false
			cfg := f.serviceConfig(f.store)
			cfg.Policy = policyFunc(func(_ context.Context, _ data.Principal, access data.AccessRequest) error {
				if access.Operation != nil {
					checks++
					if checks == 2 {
						switch change {
						case "principal-revoked":
							f.revoked.Store(true)
						case "view-revoked":
							viewRevoked = true
						case "scope-changed":
							f.principal.ScopeKey = "other"
						}
						return data.Error(data.CodeDenied)
					}
				}
				if viewRevoked {
					return data.Error(data.CodeDenied)
				}
				return nil
			})
			service, err := data.NewService(cfg)
			if err != nil {
				t.Fatal(err)
			}
			ops, err := service.Operations(t.Context(), f.input.TargetID, 10)
			if change == "record-denied" {
				if err != nil || len(ops) != 1 {
					t.Fatalf("record denial must only filter that record: %+v, %v", ops, err)
				}
			} else if data.ErrorCode(err) != data.CodeDenied || len(ops) != 0 {
				t.Fatalf("revoked list disclosed earlier rows: %+v, %v", ops, err)
			}
		})
	}
}

type listHookStore struct {
	data.OperationStore
	afterList func()
}

func (s listHookStore) ListOperations(ctx context.Context, target data.TargetKey, limit int) ([]data.Operation, error) {
	ops, err := s.OperationStore.ListOperations(ctx, target, limit)
	s.afterList()
	return ops, err
}

func TestEmptyOperationListRechecksRevocationAfterStoreRead(t *testing.T) {
	f := newFixture(t)
	service := f.newService(t, listHookStore{OperationStore: f.store, afterList: func() { f.revoked.Store(true) }})
	ops, err := service.Operations(t.Context(), f.input.TargetID, 10)
	if data.ErrorCode(err) != data.CodeDenied || len(ops) != 0 {
		t.Fatalf("revoked empty list reported success: %+v, %v", ops, err)
	}
}

func (p *testProvider) Catalog(context.Context, data.Principal, data.TargetKey, int) ([]data.DatasetRef, error) {
	return []data.DatasetRef{p.input.Dataset}, nil
}
func (p *testProvider) LookupArtifact(context.Context, data.Principal, data.ArtifactRef) (any, error) {
	p.artifactReads.Add(1)
	if p.afterArtifact != nil {
		p.afterArtifact()
	}
	return map[string]int{"count": 2}, nil
}
func TestReadPolicyAndArtifactRevocation(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	f.provider.includeArtifacts = true
	catalog, err := f.service.Catalog(ctx, "preview", 10)
	if err != nil || len(catalog) != 1 {
		t.Fatal(catalog, err)
	}
	receipt := verified(t, f, prepared(t, f, "artifact-preparation"), "artifact-verify")
	ref := receipt.Verification.Artifacts[0]
	_ = verified(t, f, receipt, "second-artifact-verification")
	authority, err := f.store.GetArtifact(ctx, "sample", ref.ID)
	if err != nil || authority.RequesterID != ref.RequesterID || !authority.ExpiresAt.Equal(ref.ExpiresAt) {
		t.Fatal("re-verification replaced original artifact authority", authority, err)
	}

	if value, lookupErr := f.service.LookupArtifact(ctx, "sample", ref.ID); lookupErr != nil || value == nil {
		t.Fatal(value, lookupErr)
	}
	// Callers supply no requester/scope/expiry/generation claims to overwrite.
	f.principal.ActorID = "bob"
	bobReceipt := verified(t, f, prepared(t, f, "bob-prepare"), "bob-verify")
	f.principal.ActorID = "alice"
	if _, err = f.service.LookupArtifact(ctx, "sample", bobReceipt.Verification.Artifacts[0].ID); data.ErrorCode(err) != data.CodeGone {
		t.Fatal("foreign artifact", err)
	}
	for _, id := range []string{"missing", "expired", "wrong-scope", "wrong-generation"} {
		altered := ref
		altered.ID = id
		switch id {
		case "expired":
			altered.ExpiresAt = time.Now().Add(-time.Hour)
		case "wrong-scope":
			altered.Target.ScopeKey = "other"
		case "wrong-generation":
			altered.Generation = 1
		}
		store := authoritativeArtifactStore{OperationStore: f.store, artifact: altered}
		service := f.newService(t, store)
		if _, err = service.LookupArtifact(ctx, "sample", id); data.ErrorCode(err) != data.CodeGone {
			t.Fatal(id, err)
		}
	}
	if f.provider.artifactReads.Load() != 1 {
		t.Fatal("foreign/expired artifact reached provider")
	}
	f.provider.afterArtifact = func() { f.revoked.Store(true) }
	if _, err = f.service.LookupArtifact(ctx, "sample", ref.ID); data.ErrorCode(err) != data.CodeGone {
		t.Fatal("slow lookup disclosed revoked artifact", err)
	}
	if _, err = f.service.Catalog(ctx, "preview", 10); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("revoked catalog", err)
	}
}

type authoritativeArtifactStore struct {
	data.OperationStore
	artifact data.ArtifactRef
}

func (s authoritativeArtifactStore) GetArtifact(_ context.Context, provider, id string) (data.ArtifactRef, error) {
	if s.artifact.ID == "missing" {
		return data.ArtifactRef{}, data.Error(data.CodeGone)
	}
	return s.artifact, nil
}

type nonDurableStore struct{ data.OperationStore }

func (nonDurableStore) Capabilities() data.StoreCapabilities {
	return data.StoreCapabilities{AtomicClaims: true, Fencing: true, AtomicIntentFinalize: true, ProtectedRetention: true}
}
func TestHostWriteGateAndReadOnlyCapabilities(t *testing.T) {
	f := newFixture(t)
	cfg := data.ServiceConfig{Providers: map[string]data.Provider{"sample": f.provider}, Target: f.target, Store: nonDurableStore{f.store}, Policy: &testPolicy{}, Resolve: func(context.Context) (data.Principal, error) { return f.principal, nil }, WritesEnabled: true}
	if _, err := data.NewService(cfg); data.ErrorCode(err) != data.CodeUnavailable {
		t.Fatal("memory storage enabled writes", err)
	}
	cfg.WritesEnabled = false
	cfg.Store = f.store
	cfg.Policy = &testPolicy{denied: "prepare"}
	service, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	descriptor, err := service.Describe(context.Background(), f.input.Dataset, "preview")
	if err != nil || descriptor.Capabilities[data.Prepare].Permitted || descriptor.Capabilities[data.Prepare].Supported {
		t.Fatal("read grant enabled write", descriptor, err)
	}
	if _, err = service.Run(context.Background(), data.Prepare, f.input); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("hidden action bypass", err)
	}
	cfg.Policy = &testPolicy{}
	service, err = data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = service.Run(context.Background(), data.Prepare, f.input); data.ErrorCode(err) != data.CodeUnavailable {
		t.Fatal("write gate bypass", err)
	}
	input := f.input
	input.DryRun = true
	input.IdempotencyKey = "safe-plan"
	result, err := service.Run(context.Background(), data.Prepare, input)
	if err != nil || result.Phase != "planned" || f.provider.effects.Load() != 0 {
		t.Fatal("safe plan rejected", result, err)
	}
}

func TestRequestGenerationBindingCannotCrossActorsOrInputs(t *testing.T) {
	f := newFixture(t)
	receipt := verified(t, f, prepared(t, f, "p"), "v")
	original := activationInput(f, receipt, 0, "a")
	result := run(t, f, data.Activate, original)
	successful(t, result)
	one := uint64(1)
	refreshed := original
	refreshed.ExpectedGeneration = &one
	bound, err := f.service.ResolveRequestGeneration(t.Context(), data.Activate, refreshed)
	if err != nil || *bound.ExpectedGeneration != 0 {
		t.Fatal(bound, err)
	}
	for _, mutate := range []func(*data.Input){
		func(in *data.Input) { in.DryRun = true }, func(in *data.Input) { in.BatchLimit = 1 }, func(in *data.Input) { in.ReceiptID = "different" },
	} {
		changed := refreshed
		mutate(&changed)
		if _, err = f.service.ResolveRequestGeneration(t.Context(), data.Activate, changed); data.ErrorCode(err) != data.CodeConflict {
			t.Fatal("changed input accepted", changed, err)
		}
	}
	cfg := f.serviceConfig(f.store)
	other := f.principal
	other.ActorID = "bob"
	cfg.Resolve = func(context.Context) (data.Principal, error) { return other, nil }
	service, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	bound, err = service.ResolveRequestGeneration(t.Context(), data.Activate, refreshed)
	if err != nil || *bound.ExpectedGeneration != 1 {
		t.Fatal("other actor restored original request", bound, err)
	}
	f.revoked.Store(true)
	if _, err = f.service.ResolveRequestGeneration(t.Context(), data.Activate, refreshed); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("revocation ignored", err)
	}
}

type receiptHookStore struct {
	data.OperationStore
	after func()
}

func (s receiptHookStore) ListReceipts(ctx context.Context, key data.TargetKey, query data.ReceiptQuery) (data.ReceiptPage, error) {
	page, err := s.OperationStore.ListReceipts(ctx, key, query)
	s.after()
	return page, err
}
func (s receiptHookStore) GetReceipt(ctx context.Context, id string) (data.PreparationReceipt, error) {
	receipt, err := s.OperationStore.GetReceipt(ctx, id)
	s.after()
	return receipt, err
}

func TestReceiptDeliveryReauthorizesAndFiltersRecords(t *testing.T) {
	for _, change := range []string{"record-denied", "principal-revoked", "scope-changed"} {
		t.Run(change, func(t *testing.T) {
			f := newFixture(t)
			prepared(t, f, "first")
			prepared(t, f, "second")
			checks := 0
			cfg := f.serviceConfig(f.store)
			cfg.Policy = policyFunc(func(_ context.Context, _ data.Principal, access data.AccessRequest) error {
				if access.Receipt != nil {
					checks++
					if checks == 2 {
						switch change {
						case "principal-revoked":
							f.revoked.Store(true)
						case "scope-changed":
							f.principal.ScopeKey = "other"
						}
						return data.Error(data.CodeDenied)
					}
				}
				return nil
			})
			service, err := data.NewService(cfg)
			if err != nil {
				t.Fatal(err)
			}
			page, err := service.Receipts(t.Context(), f.input.TargetID, data.ReceiptQuery{Limit: 100})
			if change == "record-denied" {
				if err != nil || len(page.Receipts) != 1 {
					t.Fatal(page, err)
				}
			} else if data.ErrorCode(err) != data.CodeDenied || len(page.Receipts) != 0 {
				t.Fatal("revoked caller received earlier rows", page, err)
			}
		})
	}
	for _, lookup := range []bool{false, true} {
		t.Run(fmt.Sprintf("slow-read-%v", lookup), func(t *testing.T) {
			f := newFixture(t)
			receipt := prepared(t, f, "first")
			cfg := f.serviceConfig(receiptHookStore{OperationStore: f.store, after: func() { f.revoked.Store(true) }})
			service, err := data.NewService(cfg)
			if err != nil {
				t.Fatal(err)
			}
			if lookup {
				r, e := service.LookupReceipt(t.Context(), f.input.TargetID, receipt.ID)
				if data.ErrorCode(e) != data.CodeGone || r.ID != "" {
					t.Fatal("slow lookup disclosed revoked receipt", r, e)
				}
			} else {
				page, e := service.Receipts(t.Context(), f.input.TargetID, data.ReceiptQuery{Limit: 1})
				if data.ErrorCode(e) != data.CodeDenied || len(page.Receipts) != 0 {
					t.Fatal("slow list disclosed revoked receipt", page, e)
				}
			}
		})
	}
	f := newFixture(t)
	receipt := prepared(t, f, "first")
	if _, err := f.service.LookupReceipt(t.Context(), "other-target", receipt.ID); data.ErrorCode(err) != data.CodeGone {
		t.Fatal("wrong target returned receipt", err)
	}
}
