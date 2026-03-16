package guardedeffects

import (
	"context"
	"testing"
	"time"
)

type stubStore struct {
	records map[string]Record
}

func newStubStore(records ...Record) *stubStore {
	out := &stubStore{records: map[string]Record{}}
	for _, record := range records {
		out.records[record.EffectID] = record
	}
	return out
}

func (s *stubStore) SaveGuardedEffect(_ context.Context, _ Scope, record Record) (Record, error) {
	if s.records == nil {
		s.records = map[string]Record{}
	}
	s.records[record.EffectID] = record
	return record, nil
}

func (s *stubStore) GetGuardedEffect(_ context.Context, effectID string) (Record, error) {
	return s.records[effectID], nil
}

func (s *stubStore) GetGuardedEffectByIdempotencyKey(_ context.Context, _ Scope, key string) (Record, error) {
	for _, record := range s.records {
		if record.IdempotencyKey == key {
			return record, nil
		}
	}
	return Record{}, nil
}

type stubHandler struct {
	finalized int
	failed    int
	pending   int
	aborted   int
}

func (h *stubHandler) Finalize(context.Context, Record, DispatchResult) error {
	h.finalized++
	return nil
}
func (h *stubHandler) Fail(context.Context, Record, DispatchResult, *time.Time) error {
	h.failed++
	return nil
}
func (h *stubHandler) Pending(context.Context, Record, DispatchResult) error { h.pending++; return nil }
func (h *stubHandler) Abort(context.Context, Record, string) error           { h.aborted++; return nil }

func TestServiceCompletePersistsPendingOutcome(t *testing.T) {
	now := time.Date(2026, 3, 13, 10, 0, 0, 0, time.UTC)
	store := newStubStore(Record{EffectID: "effect-1", Status: StatusPrepared, CreatedAt: now, UpdatedAt: now})
	handler := &stubHandler{}
	svc := NewService(store, func() time.Time { return now.Add(time.Minute) })

	record, err := svc.Complete(context.Background(), Scope{TenantID: "tenant-1", OrgID: "org-1"}, "effect-1", SMTPAcceptedPolicy{}, DispatchResult{
		Outcome:    OutcomePending,
		DispatchID: "dispatch-1",
	}, nil, handler)
	if err != nil {
		t.Fatalf("Complete pending: %v", err)
	}
	if record.Status != StatusGuardPending {
		t.Fatalf("expected %q, got %q", StatusGuardPending, record.Status)
	}
	if handler.pending != 1 || handler.failed != 0 || handler.finalized != 0 {
		t.Fatalf("unexpected handler calls: %+v", handler)
	}
	if record.RetryAt != nil {
		t.Fatalf("expected retry_at cleared, got %+v", record.RetryAt)
	}
}

func TestServiceMarkDispatchingIncrementsAttemptAndStampsDispatchTime(t *testing.T) {
	now := time.Date(2026, 3, 13, 10, 0, 0, 0, time.UTC)
	store := newStubStore(Record{EffectID: "effect-2", Status: StatusPrepared, CreatedAt: now, UpdatedAt: now})
	svc := NewService(store, func() time.Time { return now.Add(2 * time.Minute) })

	record, err := svc.MarkDispatching(context.Background(), Scope{TenantID: "tenant-1", OrgID: "org-1"}, "effect-2", "dispatch-2")
	if err != nil {
		t.Fatalf("MarkDispatching: %v", err)
	}
	if record.Status != StatusDispatching {
		t.Fatalf("expected %q, got %q", StatusDispatching, record.Status)
	}
	if record.AttemptCount != 1 {
		t.Fatalf("expected attempt_count 1, got %d", record.AttemptCount)
	}
	if record.DispatchedAt == nil || !record.DispatchedAt.Equal(now.Add(2*time.Minute)) {
		t.Fatalf("expected dispatched_at set, got %+v", record.DispatchedAt)
	}
}

func TestServiceAbortPersistsTerminalAbort(t *testing.T) {
	now := time.Date(2026, 3, 13, 10, 0, 0, 0, time.UTC)
	retryAt := now.Add(5 * time.Minute)
	store := newStubStore(Record{
		EffectID:    "effect-3",
		Status:      StatusRetrying,
		RetryAt:     &retryAt,
		CreatedAt:   now,
		UpdatedAt:   now,
		ErrorJSON:   "temporary failure",
		GroupType:   "agreement",
		GroupID:     "agreement-1",
		SubjectID:   "recipient-1",
		SubjectType: "agreement_recipient_notification",
		Kind:        "esign.agreements.send_invitation",
	})
	handler := &stubHandler{}
	svc := NewService(store, func() time.Time { return now.Add(10 * time.Minute) })

	record, err := svc.Abort(context.Background(), Scope{TenantID: "tenant-1", OrgID: "org-1"}, "effect-3", "operator aborted", handler)
	if err != nil {
		t.Fatalf("Abort: %v", err)
	}
	if record.Status != StatusAborted {
		t.Fatalf("expected %q, got %q", StatusAborted, record.Status)
	}
	if record.AbortedAt == nil {
		t.Fatal("expected aborted_at to be set")
	}
	if record.RetryAt != nil {
		t.Fatalf("expected retry_at cleared, got %+v", record.RetryAt)
	}
	if handler.aborted != 1 {
		t.Fatalf("expected abort handler call, got %+v", handler)
	}
}

func TestServiceDeadLetteredEffectsRemainTerminal(t *testing.T) {
	now := time.Date(2026, 3, 13, 10, 0, 0, 0, time.UTC)
	store := newStubStore(Record{
		EffectID:      "effect-4",
		Status:        StatusDeadLettered,
		AttemptCount:  2,
		DispatchID:    "dispatch-dead",
		ErrorJSON:     "provider failed permanently",
		CreatedAt:     now,
		UpdatedAt:     now,
		DispatchedAt:  &now,
		MaxAttempts:   5,
		CorrelationID: "corr-dead",
	})
	handler := &stubHandler{}
	svc := NewService(store, func() time.Time { return now.Add(5 * time.Minute) })

	dispatched, err := svc.MarkDispatching(context.Background(), Scope{TenantID: "tenant-1", OrgID: "org-1"}, "effect-4", "dispatch-late")
	if err != nil {
		t.Fatalf("MarkDispatching dead-lettered: %v", err)
	}
	if dispatched.Status != StatusDeadLettered || dispatched.AttemptCount != 2 {
		t.Fatalf("expected dead-lettered effect unchanged, got %+v", dispatched)
	}

	completed, err := svc.Complete(context.Background(), Scope{TenantID: "tenant-1", OrgID: "org-1"}, "effect-4", SMTPAcceptedPolicy{}, DispatchResult{
		Outcome:    OutcomeCompleted,
		DispatchID: "dispatch-late",
	}, nil, handler)
	if err != nil {
		t.Fatalf("Complete dead-lettered: %v", err)
	}
	if completed.Status != StatusDeadLettered || completed.AttemptCount != 2 {
		t.Fatalf("expected dead-lettered effect unchanged after complete, got %+v", completed)
	}
	if handler.finalized != 0 || handler.failed != 0 || handler.pending != 0 || handler.aborted != 0 {
		t.Fatalf("expected no handler calls for terminal dead-lettered effect, got %+v", handler)
	}
}
