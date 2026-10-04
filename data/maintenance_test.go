package data

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"
)

type maintenanceTestHost struct {
	completionExpired                 bool
	prunes                            int
	pruneFailureAt                    int
	r                                 MaintenanceRecord
	target                            TargetState
	now                               time.Time
	fresh, changed, immutable, denied bool
	gate                              chan struct{}
	calls                             []Kind
	failures                          int
	lostAck                           bool
	recoveries                        int
	generatedKeys                     []string
	before                            func()
}

func (h *maintenanceTestHost) Acquire(ctx context.Context) (func(), error) {
	select {
	case h.gate <- struct{}{}:
		return func() { <-h.gate }, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}
func (h *maintenanceTestHost) Authorize(ctx context.Context, _ bool) (Principal, error) {
	if err := ctx.Err(); err != nil {
		return Principal{}, err
	}
	if h.denied {
		return Principal{}, Error(CodeDenied)
	}
	return Principal{ActorID: "owner"}, nil
}
func (h *maintenanceTestHost) AuthorizePolicy(ctx context.Context, r MaintenanceRecord) error {
	if !r.Enabled || h.denied {
		return Error(CodeDenied)
	}
	return ctx.Err()
}
func (h *maintenanceTestHost) Delegate(ctx context.Context, _ MaintenanceRecord) context.Context {
	return ctx
}
func (h *maintenanceTestHost) Load(context.Context) (MaintenanceRecord, TargetState, error) {
	return h.r, h.target, nil
}
func (h *maintenanceTestHost) Save(_ context.Context, r MaintenanceRecord) error {
	if r.Revision != h.r.Revision {
		return Error(CodeStale)
	}
	h.r = r
	return nil
}
func (h *maintenanceTestHost) Configure(_ context.Context, _ Principal, in MaintenanceConfigureRequest, r MaintenanceRecord) (MaintenanceRecord, error) {
	if in.ExpectedRevision != h.r.Revision {
		return h.r, Error(CodeStale)
	}
	h.r = r
	return r, nil
}
func (h *maintenanceTestHost) Profile(context.Context) (MaintenanceProfile, error) {
	return MaintenanceProfile{Digest: "profile", Principal: "delegate", ReplaceDrift: h.immutable}, nil
}
func (h *maintenanceTestHost) Observe(context.Context, MaintenanceRecord, TargetState) (MaintenanceObservation, error) {
	return MaintenanceObservation{Fresh: h.fresh && (h.r.ExpiresAt.IsZero() || h.r.ExpiresAt.After(h.now)), Changed: h.changed}, nil
}
func (h *maintenanceTestHost) Plan(context.Context, MaintenanceRecord) (Input, error) {
	return Input{TargetID: "test"}, nil
}
func (h *maintenanceTestHost) Generated(context.Context, DatasetRef) (ScenarioRef, error) {
	return ScenarioRef{ID: "ready"}, nil
}
func (h *maintenanceTestHost) Complete(_ context.Context, _ MaintenanceRecord, target TargetState) (MaintenanceIdentity, time.Time, time.Time, error) {
	if h.completionExpired {
		return MaintenanceIdentity{}, time.Time{}, time.Time{}, Error(CodeStale)
	}
	h.fresh = true
	return MaintenanceIdentity{Generation: target.Activation.Generation}, h.now.Add(110 * time.Minute), h.now.Add(120 * time.Minute), nil
}
func (h *maintenanceTestHost) Prune(context.Context) error {
	h.prunes++
	if h.prunes == h.pruneFailureAt {
		return Error(CodeUnavailable)
	}
	return nil
}
func (h *maintenanceTestHost) Run(ctx context.Context, kind Kind, in Input) (Result, error) {
	h.calls = append(h.calls, kind)
	if h.before != nil {
		f := h.before
		h.before = nil
		f()
	}
	if err := ctx.Err(); err != nil {
		return Result{OperationID: "interrupted", State: Running}, err
	}
	out := Result{OperationID: fmt.Sprint(len(h.calls)), State: Succeeded, Kind: kind}
	switch kind {
	case Generate:
		h.generatedKeys = append(h.generatedKeys, in.IdempotencyKey)
		out.Dataset = &DatasetRef{ID: "synthetic"}
	case Prepare:
		if h.failures > 0 {
			h.failures--
			out.State = Failed
			out.Failure = &Failure{Code: CodeUnavailable}
			return out, Error(CodeUnavailable)
		}
		out.Receipt = &PreparationReceipt{ID: "receipt"}
	case Activate:
		h.target.Activation = Activation{Generation: h.target.Activation.Generation + 1, ReceiptID: in.ReceiptID, Ready: true}
		if h.lostAck {
			out.State = State("recovering")
			return out, Error(CodeRecovery)
		}
	}
	return out, nil
}
func (h *maintenanceTestHost) Recover(context.Context, string) (Result, error) {
	h.recoveries++
	return Result{State: Succeeded}, nil
}
func newMaintenanceTest(t *testing.T) (*MaintenanceService, *maintenanceTestHost) {
	t.Helper()
	h := &maintenanceTestHost{now: time.Date(2026, 10, 4, 12, 0, 0, 0, time.UTC), gate: make(chan struct{}, 1)}
	s, e := NewMaintenanceService(h, h, func() time.Time { return h.now })
	if e != nil {
		t.Fatal(e)
	}
	if _, e = s.Configure(context.Background(), MaintenanceConfigureRequest{Enabled: true, RequestKey: "enable"}); e != nil {
		t.Fatal(e)
	}
	return s, h
}
func ensureMaintenance(t *testing.T, s *MaintenanceService) (MaintenanceResult, error) {
	t.Helper()
	in, e := s.NextRequest(context.Background(), "trigger")
	if e != nil {
		t.Fatal(e)
	}
	return s.Ensure(context.Background(), in)
}
func TestMaintenanceRetriesBeyondFormerBudgetAndRenewsAcrossDays(t *testing.T) {
	s, h := newMaintenanceTest(t)
	h.failures = 8
	for i := 0; i < 8; i++ {
		out, e := ensureMaintenance(t, s)
		if ErrorCode(e) != CodeUnavailable || out.Record.State != MaintenanceFailed {
			t.Fatalf("attempt %d: %+v %v", i, out, e)
		}
		calls := len(h.calls)
		if _, e = ensureMaintenance(t, s); e != nil || len(h.calls) != calls {
			t.Fatal("backoff dispatched effects", e)
		}
		if delay := h.r.Due.Sub(h.now); delay > 15*time.Minute || delay < time.Minute {
			t.Fatal("unbounded delay", delay)
		}
		h.now = h.r.Due
	}
	out, e := ensureMaintenance(t, s)
	if e != nil || out.Record.State != MaintenanceReady || out.Target.Activation.Generation != 1 {
		t.Fatal(out, e)
	}
	for day := 0; day < 5; day++ {
		h.now = h.now.Add(24 * time.Hour)
		status, e := s.Status(context.Background())
		if e != nil || status.Record.State == MaintenanceReady {
			t.Fatal("persisted ready survived expiry", status, e)
		}
		if _, e = ensureMaintenance(t, s); e != nil {
			t.Fatal(e)
		}
	}
	if h.target.Activation.Generation != 6 {
		t.Fatal("renewal stopped", h.target)
	}
	if len(h.generatedKeys) != 14 {
		t.Fatal("unexpected epochs", h.generatedKeys)
	}
	for i := 1; i < len(h.generatedKeys); i++ {
		if h.generatedKeys[i] == h.generatedKeys[i-1] {
			t.Fatal("terminal failed epoch replayed")
		}
	}
}
func TestMaintenanceRecoverAcknowledgedActivationWithoutDuplication(t *testing.T) {
	s, h := newMaintenanceTest(t)
	h.lostAck = true
	if _, e := ensureMaintenance(t, s); ErrorCode(e) != CodeRecovery {
		t.Fatal(e)
	}
	epoch := h.r.Epoch
	calls := len(h.calls)
	out, e := ensureMaintenance(t, s)
	if e != nil || out.Record.State != MaintenanceReady || out.Record.Epoch != "" || epoch == "" || len(h.calls) != calls || h.target.Activation.Generation != 1 {
		t.Fatal("ambiguous activation duplicated", out, e, h.calls)
	}
}
func TestMaintenanceManualChangesAndImmutableDrift(t *testing.T) {
	s, h := newMaintenanceTest(t)
	if _, e := ensureMaintenance(t, s); e != nil {
		t.Fatal(e)
	}
	h.changed = true
	h.now = h.r.Due
	out, e := ensureMaintenance(t, s)
	if e != nil || out.Record.State != MaintenancePaused || h.target.Activation.Generation != 1 {
		t.Fatal("editable drift replaced", out, e)
	}
	h.immutable = true
	out, e = ensureMaintenance(t, s)
	if e != nil || out.Record.State != MaintenanceReady || h.target.Activation.Generation != 2 {
		t.Fatal("immutable drift not replaced", out, e)
	}
	h.target.Activation.Generation++
	out, e = ensureMaintenance(t, s)
	if e != nil || out.Record.State != MaintenancePaused || h.target.Activation.Generation != 3 {
		t.Fatal("manual activation overwritten", out, e)
	}
}
func TestMaintenanceCancellationAdmissionDryRunAndDisableFence(t *testing.T) {
	s, h := newMaintenanceTest(t)
	h.gate <- struct{}{}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	in, _ := s.NextRequest(context.Background(), "cancel")
	if _, e := s.Ensure(ctx, in); !errors.Is(e, context.Canceled) {
		t.Fatal(e)
	}
	<-h.gate
	in.DryRun = true
	if _, e := s.Ensure(context.Background(), in); e != nil || len(h.calls) != 0 || h.r.Epoch != "" {
		t.Fatal("dry run wrote", e)
	}
	in.DryRun = false
	h.before = func() { h.r.Enabled = false; h.r.Revision++ }
	if _, e := s.Ensure(context.Background(), in); ErrorCode(e) != CodeStale || h.target.Activation.Generation != 0 || h.r.Enabled {
		t.Fatal("disable fence overwritten", e, h.r)
	}
}
func TestMaintenancePayloadAndCurrentAuthorization(t *testing.T) {
	s, h := newMaintenanceTest(t)
	h.denied = true
	if _, e := ensureMaintenance(t, s); ErrorCode(e) != CodeDenied || len(h.calls) != 0 {
		t.Fatal(e)
	}
	for _, key := range []string{"", " leading", "newline\n", strings.Repeat("x", 129), "é"} {
		if (MaintenanceConfigureRequest{RequestKey: key}).Validate() == nil {
			t.Fatal("key accepted", key)
		}
	}
	if (MaintenanceEnsureRequest{PolicyRevision: MaxWireCounter + 1, RequestKey: "key"}).Validate() == nil {
		t.Fatal("oversized revision")
	}
}

func TestMaintenancePreservesHostPersistedEpochPrefix(t *testing.T) {
	s, h := newMaintenanceTest(t)
	h.r.Epoch = "persisted-epoch"
	h.r.EpochPrefix = "host-v1-"
	h.r.Step = Generate
	h.r.Input = Input{TargetID: "test", IdempotencyKey: "host-v1-persisted-epoch-generate"}
	if _, e := ensureMaintenance(t, s); e != nil {
		t.Fatal(e)
	}
	if len(h.generatedKeys) != 1 || h.generatedKeys[0] != "host-v1-persisted-epoch-generate" {
		t.Fatal("persisted request duplicated", h.generatedKeys)
	}
}
func TestMaintenanceControllerHonorsHostCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	calls := 0
	err := RunMaintenance(ctx, func(context.Context) (MaintenanceResult, error) { calls++; cancel(); return MaintenanceResult{}, nil }, nil)
	if !errors.Is(err, context.Canceled) || calls != 1 {
		t.Fatal("controller lifetime escaped host", calls, err)
	}
}

func TestMaintenanceNativeFreshServingDoesNotRenew(t *testing.T) {
	s, h := newMaintenanceTest(t)
	if _, e := ensureMaintenance(t, s); e != nil {
		t.Fatal(e)
	}
	calls := len(h.calls)
	if fresh, e := s.FreshForServing(context.Background(), 1); e != nil || !fresh {
		t.Fatal("fresh refused", e)
	}
	h.now = h.r.ExpiresAt
	if fresh, e := s.FreshForServing(context.Background(), 1); e != nil || fresh || len(h.calls) != calls {
		t.Fatal("expired served or read renewed", fresh, e)
	}
	if fresh, e := s.FreshForServing(context.Background(), 2); ErrorCode(e) != CodeStale || fresh {
		t.Fatal("generation fence ignored", e)
	}
	h.target.Activation.Generation = 2
	if fresh, e := s.FreshForServing(context.Background(), 2); e != nil || !fresh {
		t.Fatal("manual selection acquired automatic expiry", e)
	}
	h.denied = true
	if _, e := s.FreshForServing(context.Background(), 2); ErrorCode(e) != CodeDenied {
		t.Fatal("revocation ignored", e)
	}
}

func TestMaintenanceProjectionKeepsPrivateRecoveryEvidence(t *testing.T) {
	result := MaintenanceResult{Record: MaintenanceRecord{Revision: 1, Enabled: true, Owner: "private-owner", Principal: "private-delegate", Epoch: "private-epoch", RecipeDigest: "private-profile", Input: Input{IdempotencyKey: "private-request"}, State: MaintenanceReady}, Target: TargetState{Pending: &Intent{ID: "private-intent"}}}
	raw, e := json.Marshal(result)
	if e != nil {
		t.Fatal(e)
	}
	if strings.Contains(string(raw), "private-") {
		t.Fatal("coordinator evidence leaked", string(raw))
	}
	stored, e := json.Marshal(result.Record)
	if e != nil {
		t.Fatal(e)
	}
	if !strings.Contains(string(stored), "private-epoch") {
		t.Fatal("persistence lost recovery")
	}
}

func TestMaintenanceCleanupFailureCannotDowngradeCommittedReadiness(t *testing.T) {
	s, h := newMaintenanceTest(t)
	h.pruneFailureAt = 2
	result, e := ensureMaintenance(t, s)
	if ErrorCode(e) != CodeUnavailable || result.Record.State != MaintenanceReady || h.r.State != MaintenanceReady || h.target.Activation.Generation != 1 {
		t.Fatal("cleanup downgraded activation", result, e)
	}
	calls := len(h.calls)
	result, e = ensureMaintenance(t, s)
	if e != nil || result.Record.State != MaintenanceReady || len(h.calls) != calls {
		t.Fatal("cleanup duplicated committed work", result, e)
	}
}

func TestMaintenanceExpiryAfterActivationStartsFreshWork(t *testing.T) {
	s, h := newMaintenanceTest(t)
	h.completionExpired = true
	result, e := ensureMaintenance(t, s)
	if ErrorCode(e) != CodeStale || h.r.Generation != 1 || h.r.Epoch != "" || result.Record.State != MaintenanceFailed {
		t.Fatal("expired commit stuck in recovery", result, e)
	}
	h.completionExpired = false
	h.now = h.r.Due
	result, e = ensureMaintenance(t, s)
	if e != nil || result.Record.State != MaintenanceReady || result.Record.Generation != 2 || len(h.generatedKeys) != 2 {
		t.Fatal("expired receipt replayed forever", result, e)
	}
}
