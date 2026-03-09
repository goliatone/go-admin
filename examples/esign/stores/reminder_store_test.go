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
	})
	mustUpsertReminderState(t, store, scope, AgreementReminderStateRecord{
		AgreementID: "agreement-1", RecipientID: "recipient-2", Status: AgreementReminderStatusActive,
		NextDueAt: cloneReminderTimePtr(now.Add(-1 * time.Minute)), CreatedAt: now.Add(-1 * time.Hour), UpdatedAt: now.Add(-30 * time.Minute),
	})
	mustUpsertReminderState(t, store, scope, AgreementReminderStateRecord{
		AgreementID: "agreement-1", RecipientID: "recipient-3", Status: AgreementReminderStatusActive,
		NextDueAt: cloneReminderTimePtr(now.Add(10 * time.Minute)), CreatedAt: now.Add(-1 * time.Hour), UpdatedAt: now.Add(-30 * time.Minute),
	})

	claimed, err := store.ClaimDueAgreementReminders(context.Background(), scope, AgreementReminderClaimInput{
		Now:          now,
		Limit:        2,
		LeaseSeconds: 120,
		Claimer:      "claimer-a",
	})
	if err != nil {
		t.Fatalf("ClaimDueAgreementReminders: %v", err)
	}
	if len(claimed) != 2 {
		t.Fatalf("expected 2 claimed reminders, got %d", len(claimed))
	}
	if claimed[0].RecipientID != "recipient-1" || claimed[1].RecipientID != "recipient-2" {
		t.Fatalf("expected claim order recipient-1,recipient-2 got %q,%q", claimed[0].RecipientID, claimed[1].RecipientID)
	}
	for _, record := range claimed {
		if record.LockUntil == nil || !record.LockUntil.After(now) {
			t.Fatalf("expected active lease for claimed record %+v", record)
		}
		if record.LockedBy != "claimer-a" {
			t.Fatalf("expected locked_by claimer-a, got %q", record.LockedBy)
		}
	}

	second, err := store.ClaimDueAgreementReminders(context.Background(), scope, AgreementReminderClaimInput{
		Now:          now.Add(30 * time.Second),
		Limit:        10,
		LeaseSeconds: 120,
		Claimer:      "claimer-b",
	})
	if err != nil {
		t.Fatalf("second ClaimDueAgreementReminders: %v", err)
	}
	if len(second) != 0 {
		t.Fatalf("expected no records while lease is active, got %d", len(second))
	}
}

func TestInMemoryStorePauseAndResumeAgreementReminder(t *testing.T) {
	store := NewInMemoryStore()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	now := time.Date(2026, 3, 9, 1, 0, 0, 0, time.UTC)
	mustUpsertReminderState(t, store, scope, AgreementReminderStateRecord{
		AgreementID: "agreement-1", RecipientID: "recipient-1", Status: AgreementReminderStatusActive,
		NextDueAt: cloneReminderTimePtr(now.Add(30 * time.Minute)),
		CreatedAt: now.Add(-1 * time.Hour), UpdatedAt: now.Add(-1 * time.Hour),
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
}

func TestInMemoryStoreMarkAgreementReminderSentAndFailed(t *testing.T) {
	store := NewInMemoryStore()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	now := time.Date(2026, 3, 9, 1, 0, 0, 0, time.UTC)
	mustUpsertReminderState(t, store, scope, AgreementReminderStateRecord{
		AgreementID: "agreement-1", RecipientID: "recipient-1", Status: AgreementReminderStatusActive,
		SentCount: 1, FirstSentAt: cloneReminderTimePtr(now.Add(-24 * time.Hour)), LastSentAt: cloneReminderTimePtr(now.Add(-2 * time.Hour)),
		NextDueAt: cloneReminderTimePtr(now.Add(-1 * time.Minute)),
		CreatedAt: now.Add(-24 * time.Hour), UpdatedAt: now.Add(-2 * time.Hour),
	})

	nextDue := now.Add(3 * time.Hour)
	sent, err := store.MarkAgreementReminderSent(context.Background(), scope, "agreement-1", "recipient-1", "due", now, &nextDue)
	if err != nil {
		t.Fatalf("MarkAgreementReminderSent: %v", err)
	}
	if sent.SentCount != 2 {
		t.Fatalf("expected sent_count=2, got %d", sent.SentCount)
	}
	if sent.LastSentAt == nil || !sent.LastSentAt.Equal(now) {
		t.Fatalf("expected last_sent_at=%s, got %+v", now.Format(time.RFC3339Nano), sent.LastSentAt)
	}
	if sent.NextDueAt == nil || !sent.NextDueAt.Equal(nextDue) {
		t.Fatalf("expected next_due_at=%s, got %+v", nextDue.Format(time.RFC3339Nano), sent.NextDueAt)
	}

	retryAt := now.Add(1 * time.Hour)
	failed, err := store.MarkAgreementReminderFailed(context.Background(), scope, "agreement-1", "recipient-1", "resend_failed", "smtp timeout", now.Add(2*time.Minute), &retryAt)
	if err != nil {
		t.Fatalf("MarkAgreementReminderFailed: %v", err)
	}
	if failed.LastError != "smtp timeout" {
		t.Fatalf("expected last_error smtp timeout, got %q", failed.LastError)
	}
	if failed.NextDueAt == nil || !failed.NextDueAt.Equal(retryAt) {
		t.Fatalf("expected retry next_due_at=%s, got %+v", retryAt.Format(time.RFC3339Nano), failed.NextDueAt)
	}
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
