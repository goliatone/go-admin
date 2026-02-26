package admin

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-command/flow"
	goerrors "github.com/goliatone/go-errors"
)

func TestFSMWorkflowEngineApplyEventSuccess(t *testing.T) {
	engine := mustTestFSMEngine(t)

	response, err := engine.ApplyEvent(context.Background(), testWorkflowApplyRequest("pages", "page-1", "publish", "draft", "published", nil))
	if err != nil {
		t.Fatalf("apply event: %v", err)
	}
	if response == nil || response.Transition == nil {
		t.Fatalf("expected transition response, got %+v", response)
	}
	if response.Transition.PreviousState != "draft" || response.Transition.CurrentState != "published" {
		t.Fatalf("unexpected transition states: %+v", response.Transition)
	}
	if response.Version <= 0 {
		t.Fatalf("expected persisted version, got %d", response.Version)
	}
}

func TestFSMWorkflowEngineApplyEventInvalidTransition(t *testing.T) {
	engine := mustTestFSMEngine(t)

	_, err := engine.ApplyEvent(context.Background(), testWorkflowApplyRequest("pages", "page-2", "archive", "draft", "archived", nil))
	if err == nil {
		t.Fatalf("expected invalid transition error")
	}
	if code := workflowErrorTextCode(err); code != flow.ErrCodeInvalidTransition {
		t.Fatalf("expected %s, got %s (%v)", flow.ErrCodeInvalidTransition, code, err)
	}
}

func TestFSMWorkflowEngineApplyEventGuardRejected(t *testing.T) {
	engine := mustTestFSMEngine(t, func(e *FSMWorkflowEngine) {
		_ = e.RegisterGuard("deny.publish", func(context.Context, WorkflowMessage, WorkflowExecutionContext) error {
			return &flow.GuardRejection{
				Code:     "guard.denied",
				Category: flow.GuardClassificationDomainReject,
				Message:  "guard denied",
			}
		})
	})
	_ = engine.RegisterWorkflow("pages", WorkflowDefinition{
		EntityType:   "pages",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{Name: "publish", From: "draft", To: "published", Guard: "deny.publish"},
		},
	})

	_, err := engine.ApplyEvent(context.Background(), testWorkflowApplyRequest("pages", "page-3", "publish", "draft", "published", nil))
	if err == nil {
		t.Fatalf("expected guard rejection")
	}
	if code := workflowErrorTextCode(err); code != flow.ErrCodeGuardRejected {
		t.Fatalf("expected %s, got %s (%v)", flow.ErrCodeGuardRejected, code, err)
	}
}

func TestFSMWorkflowEngineApplyEventVersionConflict(t *testing.T) {
	baseStore := flow.NewInMemoryStateStore()
	if _, err := baseStore.SaveIfVersion(context.Background(), &flow.StateRecord{
		EntityID:       "page-4",
		State:          "draft",
		MachineID:      "pages",
		MachineVersion: "1",
	}, 0); err != nil {
		t.Fatalf("seed state: %v", err)
	}
	engine := mustTestFSMEngine(t,
		WithFSMWorkflowStateStore(&conflictStateStore{base: baseStore}),
	)

	_, err := engine.ApplyEvent(context.Background(), testWorkflowApplyRequest("pages", "page-4", "publish", "draft", "published", nil))
	if err == nil {
		t.Fatalf("expected version conflict")
	}
	if code := workflowErrorTextCode(err); code != flow.ErrCodeVersionConflict {
		t.Fatalf("expected %s, got %s (%v)", flow.ErrCodeVersionConflict, code, err)
	}
}

func TestFSMWorkflowEngineIdempotencyReplayAndConflict(t *testing.T) {
	engine := mustTestFSMEngine(t)

	req := testWorkflowApplyRequest("pages", "page-5", "publish", "draft", "published", map[string]any{"payload": "a"})
	req.IdempotencyKey = "publish-key"
	first, err := engine.ApplyEvent(context.Background(), req)
	if err != nil {
		t.Fatalf("first apply: %v", err)
	}

	second, err := engine.ApplyEvent(context.Background(), req)
	if err != nil {
		t.Fatalf("second apply replay: %v", err)
	}
	if second == nil || !second.IdempotencyHit {
		t.Fatalf("expected idempotency replay hit, got %+v", second)
	}
	if first.EventID != second.EventID {
		t.Fatalf("expected replayed event id %q, got %q", first.EventID, second.EventID)
	}

	conflict := req
	conflict.Metadata = map[string]any{"payload": "different"}
	_, err = engine.ApplyEvent(context.Background(), conflict)
	if err == nil {
		t.Fatalf("expected idempotency conflict")
	}
	if code := workflowErrorTextCode(err); code != flow.ErrCodeIdempotencyConflict {
		t.Fatalf("expected %s, got %s (%v)", flow.ErrCodeIdempotencyConflict, code, err)
	}
}

func TestFSMWorkflowEngineDryRunDoesNotMutateState(t *testing.T) {
	engine := mustTestFSMEngine(t)

	req := testWorkflowApplyRequest("pages", "page-6", "publish", "draft", "published", nil)
	req.DryRun = true
	response, err := engine.ApplyEvent(context.Background(), req)
	if err != nil {
		t.Fatalf("dry run apply: %v", err)
	}
	if response == nil || response.Transition == nil {
		t.Fatalf("expected transition response, got %+v", response)
	}
	if response.Transition.CurrentState != "published" {
		t.Fatalf("expected dry-run target state published, got %q", response.Transition.CurrentState)
	}

	snapshot, err := engine.Snapshot(context.Background(), WorkflowSnapshotRequest{
		MachineID: "pages",
		EntityID:  "page-6",
		Msg: WorkflowMessage{
			EntityID:     "page-6",
			EntityType:   "pages",
			CurrentState: "draft",
		},
	})
	if err != nil {
		t.Fatalf("snapshot after dry-run: %v", err)
	}
	if snapshot.CurrentState != "draft" {
		t.Fatalf("expected state to remain draft after dry run, got %q", snapshot.CurrentState)
	}
}

func TestFSMWorkflowEngineSnapshotBlockedTransitionDiagnostics(t *testing.T) {
	engine := mustTestFSMEngine(t, func(e *FSMWorkflowEngine) {
		_ = e.RegisterGuard("deny.publish", func(context.Context, WorkflowMessage, WorkflowExecutionContext) error {
			return &flow.GuardRejection{
				Code:            "guard.denied",
				Category:        flow.GuardClassificationDomainReject,
				Message:         "publish blocked",
				RequiresAction:  true,
				RemediationHint: "complete translation",
			}
		})
	})
	_ = engine.RegisterWorkflow("pages", WorkflowDefinition{
		EntityType:   "pages",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{Name: "publish", From: "draft", To: "published", Guard: "deny.publish"},
		},
	})

	snapshot, err := engine.Snapshot(context.Background(), WorkflowSnapshotRequest{
		MachineID: "pages",
		EntityID:  "page-7",
		Msg: WorkflowMessage{
			EntityID:     "page-7",
			EntityType:   "pages",
			CurrentState: "draft",
		},
		EvaluateGuards: true,
		IncludeBlocked: true,
	})
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	if len(snapshot.AllowedTransitions) != 1 {
		t.Fatalf("expected one transition, got %+v", snapshot.AllowedTransitions)
	}
	transition := snapshot.AllowedTransitions[0]
	if transition.Allowed {
		t.Fatalf("expected blocked transition, got %+v", transition)
	}
	if len(transition.Rejections) == 0 {
		t.Fatalf("expected guard rejection diagnostics, got %+v", transition)
	}
}

func TestFSMWorkflowEngineHookFailureModes(t *testing.T) {
	failOpenHook := &failingWorkflowHook{}
	engineOpen := mustTestFSMEngine(t,
		WithFSMWorkflowLifecycleHooks(failOpenHook),
		WithFSMWorkflowHookFailureMode(flow.HookFailureModeFailOpen),
	)
	if _, err := engineOpen.ApplyEvent(context.Background(), testWorkflowApplyRequest("pages", "page-8", "publish", "draft", "published", nil)); err != nil {
		t.Fatalf("expected fail-open hook mode to allow transition, got %v", err)
	}
	if failOpenHook.calls == 0 {
		t.Fatalf("expected fail-open hook to be invoked")
	}

	failClosedHook := &failingWorkflowHook{}
	engineClosed := mustTestFSMEngine(t,
		WithFSMWorkflowLifecycleHooks(failClosedHook),
		WithFSMWorkflowHookFailureMode(flow.HookFailureModeFailClosed),
	)
	_, err := engineClosed.ApplyEvent(context.Background(), testWorkflowApplyRequest("pages", "page-9", "publish", "draft", "published", nil))
	if err == nil {
		t.Fatalf("expected fail-closed hook to reject transition")
	}
	if code := workflowErrorTextCode(err); code != flow.ErrCodePreconditionFailed {
		t.Fatalf("expected %s, got %s (%v)", flow.ErrCodePreconditionFailed, code, err)
	}
	if failClosedHook.calls == 0 {
		t.Fatalf("expected fail-closed hook to be invoked")
	}
}

func mustTestFSMEngine(t *testing.T, opts ...FSMWorkflowEngineOption) *FSMWorkflowEngine {
	t.Helper()
	engine := NewFSMWorkflowEngine(opts...)
	if err := engine.RegisterWorkflow("pages", WorkflowDefinition{
		EntityType:   "pages",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{Name: "publish", From: "draft", To: "published"},
		},
	}); err != nil {
		t.Fatalf("register workflow: %v", err)
	}
	return engine
}

func testWorkflowApplyRequest(machineID, entityID, event, currentState, targetState string, metadata map[string]any) WorkflowApplyEventRequest {
	return WorkflowApplyEventRequest{
		MachineID:     machineID,
		EntityID:      entityID,
		Event:         event,
		ExpectedState: currentState,
		ExecCtx: WorkflowExecutionContext{
			ActorID: "tester",
			Tenant:  "tenant-a",
		},
		Msg: WorkflowMessage{
			EntityID:     entityID,
			EntityType:   machineID,
			Event:        event,
			CurrentState: currentState,
			TargetState:  targetState,
			Payload:      cloneWorkflowTransitionMetadata(metadata),
		},
		Metadata: cloneWorkflowTransitionMetadata(metadata),
	}
}

func workflowErrorTextCode(err error) string {
	var typed *goerrors.Error
	if !goerrors.As(err, &typed) || typed == nil {
		return ""
	}
	return typed.TextCode
}

type failingWorkflowHook struct {
	calls int
}

func (h *failingWorkflowHook) Notify(context.Context, flow.TransitionLifecycleEvent[WorkflowMessage]) error {
	h.calls++
	return errors.New("hook failure")
}

type conflictStateStore struct {
	base flow.StateStore
}

func (s *conflictStateStore) Load(ctx context.Context, id string) (*flow.StateRecord, error) {
	return s.base.Load(ctx, id)
}

func (s *conflictStateStore) SaveIfVersion(ctx context.Context, rec *flow.StateRecord, expectedVersion int) (int, error) {
	return s.base.SaveIfVersion(ctx, rec, expectedVersion)
}

func (s *conflictStateStore) RunInTransaction(ctx context.Context, fn func(flow.TxStore) error) error {
	return s.base.RunInTransaction(ctx, func(tx flow.TxStore) error {
		return fn(&conflictTxStore{tx: tx})
	})
}

type conflictTxStore struct {
	tx flow.TxStore
}

func (s *conflictTxStore) Load(ctx context.Context, id string) (*flow.StateRecord, error) {
	return s.tx.Load(ctx, id)
}

func (s *conflictTxStore) SaveIfVersion(context.Context, *flow.StateRecord, int) (int, error) {
	return 0, flow.ErrStateVersionConflict
}

func (s *conflictTxStore) AppendOutbox(ctx context.Context, entry flow.OutboxEntry) error {
	return s.tx.AppendOutbox(ctx, entry)
}
