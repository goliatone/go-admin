package admin

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-command/flow"
)

type fsmLifecycleTestMessage struct {
	EntityID string
	Event    string
}

func (fsmLifecycleTestMessage) Type() string { return "fsm.lifecycle.test" }

type failingActivitySink struct {
	err   error
	calls int
}

func (s *failingActivitySink) Record(_ context.Context, _ ActivityEntry) error {
	s.calls++
	if s.err != nil {
		return s.err
	}
	return errors.New("activity sink failure")
}

func (s *failingActivitySink) List(_ context.Context, _ int, _ ...ActivityFilter) ([]ActivityEntry, error) {
	return nil, nil
}

func TestFSMLifecycleActivitySinkAdapterMapsEnvelopeToActivityEntry(t *testing.T) {
	sink := &recordingSink{}
	adapter := NewFSMLifecycleActivitySinkAdapter(sink)
	now := time.Date(2026, 2, 25, 12, 0, 0, 0, time.UTC)
	metadata := map[string]any{
		"machine_id":      "agreement.lifecycle",
		"machine_version": "v2",
		"entity_id":       "agreement-1",
		"execution_id":    "exec-1",
		"event":           "approve",
		"transition_id":   "approve_transition",
		"phase":           "committed",
		"request_id":      "req-123",
	}
	envelope := flow.LifecycleActivityEnvelope{
		Channel:    flow.LifecycleActivityChannelFSM,
		Verb:       flow.LifecycleActivityVerbPrefix + "committed",
		ObjectType: flow.LifecycleActivityObjectTypeMachine,
		ObjectID:   "agreement-1",
		ActorID:    "admin-1",
		TenantID:   "tenant-1",
		OccurredAt: now,
		Metadata:   metadata,
	}

	if err := adapter.LogLifecycleActivity(context.Background(), envelope); err != nil {
		t.Fatalf("log lifecycle activity: %v", err)
	}
	if len(sink.entries) != 1 {
		t.Fatalf("expected 1 activity entry, got %d", len(sink.entries))
	}

	entry := sink.entries[0]
	if entry.Channel != flow.LifecycleActivityChannelFSM {
		t.Fatalf("channel=%q want %q", entry.Channel, flow.LifecycleActivityChannelFSM)
	}
	if entry.Action != flow.LifecycleActivityVerbPrefix+"committed" {
		t.Fatalf("action=%q want %q", entry.Action, flow.LifecycleActivityVerbPrefix+"committed")
	}
	if entry.Object != "fsm.machine:agreement-1" {
		t.Fatalf("object=%q want %q", entry.Object, "fsm.machine:agreement-1")
	}
	if entry.Actor != "admin-1" {
		t.Fatalf("actor=%q want %q", entry.Actor, "admin-1")
	}
	if !entry.CreatedAt.Equal(now) {
		t.Fatalf("created_at=%s want %s", entry.CreatedAt, now)
	}
	if entry.Metadata["phase"] != "committed" {
		t.Fatalf("metadata.phase=%v want committed", entry.Metadata["phase"])
	}
	for _, key := range []string{"machine_id", "machine_version", "entity_id", "execution_id", "event", "transition_id", "request_id"} {
		if _, ok := entry.Metadata[key]; !ok {
			t.Fatalf("expected metadata key %q to be present: %+v", key, entry.Metadata)
		}
	}

	// Verify copy-on-write behavior for metadata.
	metadata["machine_id"] = "modified"
	metadata["new_key"] = "new-value"
	if got := entry.Metadata["machine_id"]; got != "agreement.lifecycle" {
		t.Fatalf("expected copied machine_id to remain unchanged, got %v", got)
	}
	if _, ok := entry.Metadata["new_key"]; ok {
		t.Fatalf("expected copied metadata not to include post-call mutations")
	}
}

func TestFSMLifecycleActivitySinkAdapterDerivesPhaseFromVerb(t *testing.T) {
	sink := &recordingSink{}
	adapter := NewFSMLifecycleActivitySinkAdapter(sink)
	envelope := flow.LifecycleActivityEnvelope{
		Channel:    flow.LifecycleActivityChannelFSM,
		Verb:       flow.LifecycleActivityVerbPrefix + "attempted",
		ObjectType: flow.LifecycleActivityObjectTypeMachine,
		ObjectID:   "entity-42",
		ActorID:    "actor-42",
		Metadata: map[string]any{
			"machine_id": "orders.workflow",
		},
	}
	if err := adapter.LogLifecycleActivity(context.Background(), envelope); err != nil {
		t.Fatalf("log lifecycle activity: %v", err)
	}
	if len(sink.entries) != 1 {
		t.Fatalf("expected 1 activity entry, got %d", len(sink.entries))
	}
	if sink.entries[0].Metadata["phase"] != "attempted" {
		t.Fatalf("metadata.phase=%v want attempted", sink.entries[0].Metadata["phase"])
	}
}

func TestFSMLifecycleActivitySinkAdapterProjectsAttemptedCommittedRejectedPhases(t *testing.T) {
	feed := NewActivityFeed()
	adapter := NewFSMLifecycleActivitySinkAdapter(feed)
	hook := &flow.LifecycleActivityHook[fsmLifecycleTestMessage]{Sink: adapter}
	machine, store := newFSMLifecycleTestMachine(t, hook)
	seedFSMLifecycleState(t, store, "entity-phase", "pending")

	ctx := context.Background()
	msg := fsmLifecycleTestMessage{EntityID: "entity-phase", Event: "activate"}
	_, err := machine.ApplyEvent(ctx, flow.ApplyEventRequest[fsmLifecycleTestMessage]{
		EntityID: msg.EntityID,
		Event:    msg.Event,
		Msg:      msg,
		ExecCtx: flow.ExecutionContext{
			ActorID: "user-1",
			Tenant:  "tenant-1",
		},
	})
	if err != nil {
		t.Fatalf("apply event success path: %v", err)
	}

	_, err = machine.ApplyEvent(ctx, flow.ApplyEventRequest[fsmLifecycleTestMessage]{
		EntityID: msg.EntityID,
		Event:    "unknown_transition",
		Msg: fsmLifecycleTestMessage{
			EntityID: msg.EntityID,
			Event:    "unknown_transition",
		},
		ExecCtx: flow.ExecutionContext{
			ActorID: "user-1",
			Tenant:  "tenant-1",
		},
	})
	if err == nil {
		t.Fatalf("expected invalid transition to emit rejected event")
	}

	entries, listErr := feed.List(ctx, 20)
	if listErr != nil {
		t.Fatalf("list activity entries: %v", listErr)
	}
	entryByAction := map[string]ActivityEntry{}
	for _, entry := range entries {
		if strings.HasPrefix(entry.Action, flow.LifecycleActivityVerbPrefix) {
			entryByAction[entry.Action] = entry
		}
	}
	requiredActions := []string{
		flow.LifecycleActivityVerbPrefix + "attempted",
		flow.LifecycleActivityVerbPrefix + "committed",
		flow.LifecycleActivityVerbPrefix + "rejected",
	}
	for _, action := range requiredActions {
		entry, ok := entryByAction[action]
		if !ok {
			t.Fatalf("expected action %q in projected entries: %+v", action, entryByAction)
		}
		if entry.Channel != flow.LifecycleActivityChannelFSM {
			t.Fatalf("entry %q channel=%q want %q", action, entry.Channel, flow.LifecycleActivityChannelFSM)
		}
		if entry.Object != flow.LifecycleActivityObjectTypeMachine+":entity-phase" {
			t.Fatalf("entry %q object=%q", action, entry.Object)
		}
		if phase := entry.Metadata["phase"]; phase == "" {
			t.Fatalf("entry %q missing metadata.phase", action)
		}
		for _, key := range []string{"machine_id", "machine_version", "entity_id", "execution_id", "event"} {
			if _, ok := entry.Metadata[key]; !ok {
				t.Fatalf("entry %q missing metadata.%s: %+v", action, key, entry.Metadata)
			}
		}
	}
}

func TestFSMLifecycleActivitySinkAdapterFailureModeFailOpenDoesNotBlockTransitions(t *testing.T) {
	failingSink := &failingActivitySink{err: errors.New("activity sink down")}
	adapter := NewFSMLifecycleActivitySinkAdapter(failingSink)
	hook := &flow.LifecycleActivityHook[fsmLifecycleTestMessage]{Sink: adapter}
	machine, store := newFSMLifecycleTestMachine(t,
		hook,
		flow.WithHookFailureMode[fsmLifecycleTestMessage](flow.HookFailureModeFailOpen),
	)
	seedFSMLifecycleState(t, store, "entity-open", "pending")

	msg := fsmLifecycleTestMessage{EntityID: "entity-open", Event: "activate"}
	response, err := machine.ApplyEvent(context.Background(), flow.ApplyEventRequest[fsmLifecycleTestMessage]{
		EntityID: msg.EntityID,
		Event:    msg.Event,
		Msg:      msg,
	})
	if err != nil {
		t.Fatalf("expected fail-open path to succeed, got err=%v", err)
	}
	if response == nil || response.Transition == nil {
		t.Fatalf("expected non-nil response transition in fail-open path")
	}
	if response.Transition.CurrentState != "active" {
		t.Fatalf("expected current state active, got %q", response.Transition.CurrentState)
	}
	if failingSink.calls == 0 {
		t.Fatalf("expected adapter sink to be called")
	}
}

func TestFSMLifecycleActivitySinkAdapterFailureModeFailClosedBlocksTransitions(t *testing.T) {
	failingSink := &failingActivitySink{err: errors.New("activity sink down")}
	adapter := NewFSMLifecycleActivitySinkAdapter(failingSink)
	hook := &flow.LifecycleActivityHook[fsmLifecycleTestMessage]{Sink: adapter}
	machine, store := newFSMLifecycleTestMachine(t,
		hook,
		flow.WithHookFailureMode[fsmLifecycleTestMessage](flow.HookFailureModeFailClosed),
	)
	seedFSMLifecycleState(t, store, "entity-closed", "pending")

	msg := fsmLifecycleTestMessage{EntityID: "entity-closed", Event: "activate"}
	response, err := machine.ApplyEvent(context.Background(), flow.ApplyEventRequest[fsmLifecycleTestMessage]{
		EntityID: msg.EntityID,
		Event:    msg.Event,
		Msg:      msg,
	})
	if err == nil {
		t.Fatalf("expected fail-closed path to return error")
	}
	if response != nil {
		t.Fatalf("expected nil response in fail-closed path, got %+v", response)
	}
	if !strings.Contains(err.Error(), "lifecycle hook failed") {
		t.Fatalf("expected lifecycle hook failure error, got %v", err)
	}
	if failingSink.calls == 0 {
		t.Fatalf("expected adapter sink to be called")
	}

	snapshot, snapErr := machine.Snapshot(context.Background(), flow.SnapshotRequest[fsmLifecycleTestMessage]{
		EntityID: msg.EntityID,
	})
	if snapErr != nil {
		t.Fatalf("snapshot after fail-closed apply: %v", snapErr)
	}
	if snapshot.CurrentState != "pending" {
		t.Fatalf("expected state to remain pending after fail-closed error, got %q", snapshot.CurrentState)
	}
}

func newFSMLifecycleTestMachine(
	t *testing.T,
	hook flow.TransitionLifecycleHook[fsmLifecycleTestMessage],
	opts ...flow.StateMachineOption[fsmLifecycleTestMessage],
) (*flow.StateMachine[fsmLifecycleTestMessage], flow.StateStore) {
	t.Helper()

	definition := &flow.MachineDefinition{
		ID:      "fsm.lifecycle.test",
		Version: "v1",
		States: []flow.StateDefinition{
			{Name: "pending", Initial: true},
			{Name: "active", Terminal: true},
		},
		Transitions: []flow.TransitionDefinition{
			{ID: "activate", Event: "activate", From: "pending", To: "active"},
		},
	}
	request := flow.TransitionRequest[fsmLifecycleTestMessage]{
		StateKey: func(msg fsmLifecycleTestMessage) string {
			return strings.TrimSpace(msg.EntityID)
		},
		Event: func(msg fsmLifecycleTestMessage) string {
			return strings.TrimSpace(msg.Event)
		},
	}

	options := []flow.StateMachineOption[fsmLifecycleTestMessage]{
		flow.WithExecutionPolicy[fsmLifecycleTestMessage](flow.ExecutionPolicyLightweight),
	}
	if hook != nil {
		options = append(options, flow.WithLifecycleHooks[fsmLifecycleTestMessage](hook))
	}
	options = append(options, opts...)

	store := flow.NewInMemoryStateStore()
	machine, err := flow.NewStateMachineFromDefinition(
		definition,
		store,
		request,
		nil,
		nil,
		options...,
	)
	if err != nil {
		t.Fatalf("new state machine: %v", err)
	}
	return machine, store
}

func seedFSMLifecycleState(t *testing.T, store flow.StateStore, entityID, state string) {
	t.Helper()
	if _, err := store.SaveIfVersion(context.Background(), &flow.StateRecord{
		EntityID: entityID,
		State:    state,
	}, 0); err != nil {
		t.Fatalf("seed state entity=%q state=%q: %v", entityID, state, err)
	}
}
