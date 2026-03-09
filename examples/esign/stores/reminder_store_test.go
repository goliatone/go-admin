package stores

import (
	"context"
	"testing"
	"time"
)

func TestInMemoryStoreClaimDueAgreementRemindersHonorsLeaseAndOrder(t *testing.T) {
	store := NewInMemoryStore()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	now := time.Date(2026, 3, 9, 1, 0, 0, 0, time.UTC)

	mustUpsertReminderState(t, store, scope, AgreementReminderStateRecord{
		AgreementID: "agreement-1", RecipientID: "recipient-1", Status: AgreementReminderStatusActive,
		NextDueAt: cloneReminderTimePtr(now.Add(-2 * time.Minute)), CreatedAt: now.Add(-1 * time.Hour), UpdatedAt: now.Add(-1 * time.Hour),
		PolicyVersion: "r1",
	})
	mustUpsertReminderState(t, store, scope, AgreementReminderStateRecord{
		AgreementID: "agreement-1", RecipientID: "recipient-2", Status: AgreementReminderStatusActive,
		NextDueAt: cloneReminderTimePtr(now.Add(-1 * time.Minute)), CreatedAt: now.Add(-1 * time.Hour), UpdatedAt: now.Add(-30 * time.Minute),
		PolicyVersion: "r1",
	})
	mustUpsertReminderState(t, store, scope, AgreementReminderStateRecord{
		AgreementID: "agreement-1", RecipientID: "recipient-3", Status: AgreementReminderStatusActive,
		NextDueAt: cloneReminderTimePtr(now.Add(10 * time.Minute)), CreatedAt: now.Add(-1 * time.Hour), UpdatedAt: now.Add(-30 * time.Minute),
		PolicyVersion: "r1",
	})

	claimed, err := store.ClaimDueAgreementReminders(context.Background(), scope, AgreementReminderClaimInput{
		Now:          now,
		Limit:        2,
		LeaseSeconds: 120,
		WorkerID:     "worker-a",
		SweepID:      "sweep-a",
	})
	if err != nil {
		t.Fatalf("ClaimDueAgreementReminders: %v", err)
	}
	if len(claimed) != 2 {
		t.Fatalf("expected 2 claimed reminders, got %d", len(claimed))
	}
	if claimed[0].State.RecipientID != "recipient-1" || claimed[1].State.RecipientID != "recipient-2" {
		t.Fatalf("expected claim order recipient-1,recipient-2 got %q,%q", claimed[0].State.RecipientID, claimed[1].State.RecipientID)
	}
	for _, claim := range claimed {
		if claim.Lease.LeaseSeq <= 0 {
			t.Fatalf("expected lease sequence > 0, got %+v", claim.Lease)
		}
		if claim.Lease.WorkerID != "worker-a" || claim.Lease.SweepID != "sweep-a" {
			t.Fatalf("unexpected lease metadata %+v", claim.Lease)
		}
		if claim.State.LastHeartbeatAt == nil || !claim.State.LastHeartbeatAt.Equal(now) {
			t.Fatalf("expected last heartbeat at claim time, got %+v", claim.State.LastHeartbeatAt)
		}
	}

	second, err := store.ClaimDueAgreementReminders(context.Background(), scope, AgreementReminderClaimInput{
		Now:          now.Add(30 * time.Second),
		Limit:        10,
		LeaseSeconds: 120,
		WorkerID:     "worker-b",
		SweepID:      "sweep-b",
	})
	if err != nil {
		t.Fatalf("second ClaimDueAgreementReminders: %v", err)
	}
	if len(second) != 0 {
		t.Fatalf("expected no records while lease is active, got %d", len(second))
	}
}

func TestInMemoryStoreRejectsActiveReminderWithoutNextDue(t *testing.T) {
	store := NewInMemoryStore()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	now := time.Date(2026, 3, 9, 1, 0, 0, 0, time.UTC)

	_, err := store.UpsertAgreementReminderState(context.Background(), scope, AgreementReminderStateRecord{
		AgreementID: "agreement-1",
		RecipientID: "recipient-1",
		Status:      AgreementReminderStatusActive,
		NextDueAt:   nil,
		CreatedAt:   now,
		UpdatedAt:   now,
	})
	if err == nil {
		t.Fatalf("expected active state with nil next_due_at to be rejected")
	}
}

func TestInMemoryStorePauseResumeAndTerminalDeterministic(t *testing.T) {
	store := NewInMemoryStore()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	now := time.Date(2026, 3, 9, 1, 0, 0, 0, time.UTC)
	mustUpsertReminderState(t, store, scope, AgreementReminderStateRecord{
		AgreementID: "agreement-1", RecipientID: "recipient-1", Status: AgreementReminderStatusActive,
		NextDueAt: cloneReminderTimePtr(now.Add(-1 * time.Minute)),
		CreatedAt: now.Add(-1 * time.Hour), UpdatedAt: now.Add(-1 * time.Hour),
		PolicyVersion: "r1",
	})

	paused, err := store.PauseAgreementReminder(context.Background(), scope, "agreement-1", "recipient-1", now)
	if err != nil {
		t.Fatalf("PauseAgreementReminder: %v", err)
	}
	if paused.Status != AgreementReminderStatusPaused {
		t.Fatalf("expected paused status, got %q", paused.Status)
	}
	if paused.NextDueAt != nil {
		t.Fatalf("expected next_due_at nil when paused")
	}

	nextDue := now.Add(45 * time.Minute)
	resumed, err := store.ResumeAgreementReminder(context.Background(), scope, "agreement-1", "recipient-1", now.Add(1*time.Minute), &nextDue)
	if err != nil {
		t.Fatalf("ResumeAgreementReminder: %v", err)
	}
	if resumed.Status != AgreementReminderStatusActive {
		t.Fatalf("expected active status after resume, got %q", resumed.Status)
	}
	if resumed.NextDueAt == nil || !resumed.NextDueAt.Equal(nextDue) {
		t.Fatalf("expected next_due_at=%s after resume, got %+v", nextDue.Format(time.RFC3339Nano), resumed.NextDueAt)
	}

	claimed := mustClaimReminder(t, store, scope, now.Add(50*time.Minute), "worker-a", "sweep-a")
	terminal, err := store.MarkAgreementReminderSkipped(context.Background(), scope, "agreement-1", "recipient-1", AgreementReminderMarkInput{
		ReasonCode:     AgreementReminderTerminalReasonMaxCountReached,
		OccurredAt:     now.Add(50 * time.Minute),
		LeaseSeconds:   120,
		Lease:          claimed.Lease,
		TerminalReason: AgreementReminderTerminalReasonMaxCountReached,
	})
	if err != nil {
		t.Fatalf("MarkAgreementReminderSkipped: %v", err)
	}
	if terminal.Status != AgreementReminderStatusTerminal {
		t.Fatalf("expected terminal status, got %q", terminal.Status)
	}
	if terminal.TerminalReason != AgreementReminderTerminalReasonMaxCountReached {
		t.Fatalf("expected terminal reason %q, got %q", AgreementReminderTerminalReasonMaxCountReached, terminal.TerminalReason)
	}
	if terminal.NextDueAt != nil {
		t.Fatalf("expected terminal next_due_at nil")
	}

	if _, err := store.ResumeAgreementReminder(context.Background(), scope, "agreement-1", "recipient-1", now.Add(3*time.Minute), &nextDue); err == nil {
		t.Fatalf("expected resume on terminal reminder to fail")
	}
}

func TestInMemoryStoreLeaseFencingRejectsStaleAndNonOwnerWrites(t *testing.T) {
	store := NewInMemoryStore()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	now := time.Date(2026, 3, 9, 1, 0, 0, 0, time.UTC)
	mustUpsertReminderState(t, store, scope, AgreementReminderStateRecord{
		AgreementID: "agreement-1", RecipientID: "recipient-1", Status: AgreementReminderStatusActive,
		SentCount: 1, FirstSentAt: cloneReminderTimePtr(now.Add(-24 * time.Hour)), LastSentAt: cloneReminderTimePtr(now.Add(-2 * time.Hour)),
		NextDueAt: cloneReminderTimePtr(now.Add(-1 * time.Minute)),
		CreatedAt: now.Add(-24 * time.Hour), UpdatedAt: now.Add(-2 * time.Hour),
		PolicyVersion: "r1",
	})

	claim := mustClaimReminder(t, store, scope, now, "worker-a", "sweep-a")
	renewed, err := store.RenewAgreementReminderLease(context.Background(), scope, "agreement-1", "recipient-1", AgreementReminderLeaseRenewInput{
		Now:          now.Add(30 * time.Second),
		LeaseSeconds: 120,
		Lease:        claim.Lease,
	})
	if err != nil {
		t.Fatalf("RenewAgreementReminderLease: %v", err)
	}
	nextDue := now.Add(1 * time.Hour)

	if _, err := store.MarkAgreementReminderSent(context.Background(), scope, "agreement-1", "recipient-1", AgreementReminderMarkInput{
		ReasonCode:   "due",
		OccurredAt:   now.Add(1 * time.Minute),
		NextDueAt:    &nextDue,
		LeaseSeconds: 120,
		Lease:        claim.Lease, // stale sequence
	}); err == nil {
		t.Fatalf("expected stale lease sequence to fail")
	}

	nonOwner := renewed.Lease
	nonOwner.WorkerID = "worker-b"
	if _, err := store.MarkAgreementReminderSent(context.Background(), scope, "agreement-1", "recipient-1", AgreementReminderMarkInput{
		ReasonCode:   "due",
		OccurredAt:   now.Add(1 * time.Minute),
		NextDueAt:    &nextDue,
		LeaseSeconds: 120,
		Lease:        nonOwner,
	}); err == nil {
		t.Fatalf("expected non-owner worker write to fail")
	}

	if _, err := store.MarkAgreementReminderSent(context.Background(), scope, "agreement-1", "recipient-1", AgreementReminderMarkInput{
		ReasonCode:   "due",
		OccurredAt:   now.Add(1 * time.Minute),
		NextDueAt:    &nextDue,
		LeaseSeconds: 120,
		Lease:        renewed.Lease,
	}); err != nil {
		t.Fatalf("expected owner with current lease sequence to succeed: %v", err)
	}
}

func TestInMemoryStoreTerminalReminderNoLongerClaimed(t *testing.T) {
	store := NewInMemoryStore()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	now := time.Date(2026, 3, 9, 1, 0, 0, 0, time.UTC)
	mustUpsertReminderState(t, store, scope, AgreementReminderStateRecord{
		AgreementID: "agreement-1", RecipientID: "recipient-1", Status: AgreementReminderStatusActive,
		NextDueAt: cloneReminderTimePtr(now.Add(-1 * time.Minute)),
		CreatedAt: now.Add(-1 * time.Hour), UpdatedAt: now.Add(-1 * time.Hour),
		PolicyVersion: "r1",
	})

	claim := mustClaimReminder(t, store, scope, now, "worker-a", "sweep-a")
	if _, err := store.MarkAgreementReminderSkipped(context.Background(), scope, "agreement-1", "recipient-1", AgreementReminderMarkInput{
		ReasonCode:     AgreementReminderTerminalReasonMaxCountReached,
		OccurredAt:     now.Add(1 * time.Minute),
		LeaseSeconds:   120,
		Lease:          claim.Lease,
		TerminalReason: AgreementReminderTerminalReasonMaxCountReached,
	}); err != nil {
		t.Fatalf("MarkAgreementReminderSkipped terminal: %v", err)
	}

	claimedAgain, err := store.ClaimDueAgreementReminders(context.Background(), scope, AgreementReminderClaimInput{
		Now:          now.Add(2 * time.Minute),
		Limit:        10,
		LeaseSeconds: 120,
		WorkerID:     "worker-b",
		SweepID:      "sweep-b",
	})
	if err != nil {
		t.Fatalf("ClaimDueAgreementReminders after terminal: %v", err)
	}
	if len(claimedAgain) != 0 {
		t.Fatalf("expected terminal reminder to not be claimed again, got %d", len(claimedAgain))
	}
}

func TestInMemoryStoreCleanupAgreementReminderInternalErrors(t *testing.T) {
	store := NewInMemoryStore()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	now := time.Date(2026, 3, 9, 1, 0, 0, 0, time.UTC)
	expiredAt := now.Add(-1 * time.Minute)
	record := mustUpsertReminderState(t, store, scope, AgreementReminderStateRecord{
		AgreementID:                "agreement-1",
		RecipientID:                "recipient-1",
		Status:                     AgreementReminderStatusActive,
		NextDueAt:                  cloneReminderTimePtr(now.Add(1 * time.Hour)),
		LastErrorCode:              "resend_failed",
		LastErrorInternalEncrypted: "ciphertext",
		LastErrorInternalExpiresAt: &expiredAt,
		CreatedAt:                  now.Add(-1 * time.Hour),
		UpdatedAt:                  now.Add(-1 * time.Hour),
		PolicyVersion:              "r1",
	})

	cleared, err := store.CleanupAgreementReminderInternalErrors(context.Background(), scope, now, 10)
	if err != nil {
		t.Fatalf("CleanupAgreementReminderInternalErrors: %v", err)
	}
	if cleared != 1 {
		t.Fatalf("expected one cleared record, got %d", cleared)
	}
	updated, err := store.GetAgreementReminderState(context.Background(), scope, record.AgreementID, record.RecipientID)
	if err != nil {
		t.Fatalf("GetAgreementReminderState: %v", err)
	}
	if updated.LastErrorInternalEncrypted != "" || updated.LastErrorInternalExpiresAt != nil {
		t.Fatalf("expected internal error payload to be cleared, got %+v", updated)
	}
}

func mustClaimReminder(t *testing.T, store *InMemoryStore, scope Scope, now time.Time, workerID, sweepID string) AgreementReminderClaim {
	t.Helper()
	claimed, err := store.ClaimDueAgreementReminders(context.Background(), scope, AgreementReminderClaimInput{
		Now:          now,
		Limit:        1,
		LeaseSeconds: 120,
		WorkerID:     workerID,
		SweepID:      sweepID,
	})
	if err != nil {
		t.Fatalf("ClaimDueAgreementReminders: %v", err)
	}
	if len(claimed) != 1 {
		t.Fatalf("expected one claimed reminder, got %d", len(claimed))
	}
	return claimed[0]
}

func mustUpsertReminderState(t *testing.T, store *InMemoryStore, scope Scope, record AgreementReminderStateRecord) AgreementReminderStateRecord {
	t.Helper()
	out, err := store.UpsertAgreementReminderState(context.Background(), scope, record)
	if err != nil {
		t.Fatalf("UpsertAgreementReminderState: %v", err)
	}
	return out
}

func cloneReminderTimePtr(in time.Time) *time.Time {
	value := in.UTC()
	return &value
}
