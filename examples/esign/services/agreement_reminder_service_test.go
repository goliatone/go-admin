package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

func TestAgreementReminderServiceSweepSendsDueReminder(t *testing.T) {
	now := time.Date(2026, 3, 9, 2, 0, 0, 0, time.UTC)
	cfg := appcfg.Defaults()
	cfg.Reminders.Enabled = true
	cfg.Reminders.BatchSize = 10
	cfg.Reminders.ClaimLeaseSeconds = 120
	cfg.Reminders.IntervalMinutes = 60
	cfg.Reminders.InitialDelayMinutes = 30
	cfg.Reminders.MaxReminders = 6
	cfg.Reminders.JitterPercent = 0
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	agreement, recipient := seedSentAgreementWithSigner(t, store, scope, now.Add(-2*time.Hour))

	_, err := store.UpsertAgreementReminderState(context.Background(), scope, stores.AgreementReminderStateRecord{
		AgreementID: agreement.ID,
		RecipientID: recipient.ID,
		Status:      stores.AgreementReminderStatusActive,
		SentCount:   1,
		FirstSentAt: cloneServiceTestTimePtr(now.Add(-26 * time.Hour)),
		LastSentAt:  cloneServiceTestTimePtr(now.Add(-2 * time.Hour)),
		NextDueAt:   cloneServiceTestTimePtr(now.Add(-1 * time.Minute)),
		CreatedAt:   now.Add(-26 * time.Hour),
		UpdatedAt:   now.Add(-2 * time.Hour),
	})
	if err != nil {
		t.Fatalf("UpsertAgreementReminderState: %v", err)
	}

	agreements := NewAgreementService(
		store,
		WithAgreementClock(func() time.Time { return now }),
		WithAgreementReminderStore(store),
	)
	reminders := NewAgreementReminderService(
		store,
		agreements,
		WithAgreementReminderClock(func() time.Time { return now }),
		WithAgreementReminderClaimer("test-sweep"),
	)

	result, err := reminders.Sweep(context.Background(), scope)
	if err != nil {
		t.Fatalf("Sweep: %v", err)
	}
	if result.Claimed != 1 {
		t.Fatalf("expected claimed=1, got %d", result.Claimed)
	}
	if result.Sent != 1 {
		t.Fatalf("expected sent=1, got %d", result.Sent)
	}
	if result.Skipped != 0 || result.Failed != 0 {
		t.Fatalf("expected no skipped/failed reminders, got %+v", result)
	}

	state, err := store.GetAgreementReminderState(context.Background(), scope, agreement.ID, recipient.ID)
	if err != nil {
		t.Fatalf("GetAgreementReminderState: %v", err)
	}
	if state.SentCount != 2 {
		t.Fatalf("expected sent_count=2, got %d", state.SentCount)
	}
	if state.LastSentAt == nil || !state.LastSentAt.Equal(now) {
		t.Fatalf("expected last_sent_at=%s, got %+v", now.Format(time.RFC3339Nano), state.LastSentAt)
	}
}

func TestAgreementReminderServiceSweepSkipsManualCooldown(t *testing.T) {
	now := time.Date(2026, 3, 9, 2, 30, 0, 0, time.UTC)
	cfg := appcfg.Defaults()
	cfg.Reminders.Enabled = true
	cfg.Reminders.BatchSize = 10
	cfg.Reminders.ClaimLeaseSeconds = 120
	cfg.Reminders.IntervalMinutes = 60
	cfg.Reminders.InitialDelayMinutes = 30
	cfg.Reminders.ManualResendCooldownMinutes = 180
	cfg.Reminders.MaxReminders = 6
	cfg.Reminders.JitterPercent = 0
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	agreement, recipient := seedSentAgreementWithSigner(t, store, scope, now.Add(-4*time.Hour))

	_, err := store.UpsertAgreementReminderState(context.Background(), scope, stores.AgreementReminderStateRecord{
		AgreementID:        agreement.ID,
		RecipientID:        recipient.ID,
		Status:             stores.AgreementReminderStatusActive,
		SentCount:          1,
		FirstSentAt:        cloneServiceTestTimePtr(now.Add(-30 * time.Hour)),
		LastSentAt:         cloneServiceTestTimePtr(now.Add(-3 * time.Hour)),
		LastManualResendAt: cloneServiceTestTimePtr(now.Add(-30 * time.Minute)),
		NextDueAt:          cloneServiceTestTimePtr(now.Add(-1 * time.Minute)),
		CreatedAt:          now.Add(-30 * time.Hour),
		UpdatedAt:          now.Add(-3 * time.Hour),
	})
	if err != nil {
		t.Fatalf("UpsertAgreementReminderState: %v", err)
	}

	agreements := NewAgreementService(
		store,
		WithAgreementClock(func() time.Time { return now }),
		WithAgreementReminderStore(store),
	)
	reminders := NewAgreementReminderService(
		store,
		agreements,
		WithAgreementReminderClock(func() time.Time { return now }),
		WithAgreementReminderClaimer("test-sweep"),
	)

	result, err := reminders.Sweep(context.Background(), scope)
	if err != nil {
		t.Fatalf("Sweep: %v", err)
	}
	if result.Claimed != 1 {
		t.Fatalf("expected claimed=1, got %d", result.Claimed)
	}
	if result.Skipped != 1 {
		t.Fatalf("expected skipped=1, got %+v", result)
	}
	if result.Sent != 0 || result.Failed != 0 {
		t.Fatalf("expected sent=0 failed=0, got %+v", result)
	}
	if result.SkipReasons["manual_resend_cooldown"] != 1 {
		t.Fatalf("expected manual_resend_cooldown reason count 1, got %+v", result.SkipReasons)
	}

	state, err := store.GetAgreementReminderState(context.Background(), scope, agreement.ID, recipient.ID)
	if err != nil {
		t.Fatalf("GetAgreementReminderState: %v", err)
	}
	if state.SentCount != 1 {
		t.Fatalf("expected sent_count to remain 1, got %d", state.SentCount)
	}
	if state.LastReasonCode != "manual_resend_cooldown" {
		t.Fatalf("expected last_reason_code manual_resend_cooldown, got %q", state.LastReasonCode)
	}
}

func TestAgreementReminderServiceSweepSkipsRecipientNotInActiveStage(t *testing.T) {
	now := time.Date(2026, 3, 9, 3, 0, 0, 0, time.UTC)
	cfg := appcfg.Defaults()
	cfg.Reminders.Enabled = true
	cfg.Reminders.BatchSize = 10
	cfg.Reminders.ClaimLeaseSeconds = 120
	cfg.Reminders.IntervalMinutes = 60
	cfg.Reminders.InitialDelayMinutes = 30
	cfg.Reminders.MaxReminders = 6
	cfg.Reminders.JitterPercent = 0
	cfg.Reminders.AllowOutOfOrder = false
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	agreement, firstSigner, secondSigner := seedSentAgreementWithTwoSigners(t, store, scope, now.Add(-3*time.Hour))

	_, err := store.UpsertAgreementReminderState(context.Background(), scope, stores.AgreementReminderStateRecord{
		AgreementID: agreement.ID,
		RecipientID: secondSigner.ID,
		Status:      stores.AgreementReminderStatusActive,
		SentCount:   0,
		NextDueAt:   cloneServiceTestTimePtr(now.Add(-1 * time.Minute)),
		CreatedAt:   now.Add(-3 * time.Hour),
		UpdatedAt:   now.Add(-2 * time.Hour),
	})
	if err != nil {
		t.Fatalf("UpsertAgreementReminderState: %v", err)
	}

	agreements := NewAgreementService(
		store,
		WithAgreementClock(func() time.Time { return now }),
		WithAgreementReminderStore(store),
	)
	reminders := NewAgreementReminderService(
		store,
		agreements,
		WithAgreementReminderClock(func() time.Time { return now }),
		WithAgreementReminderClaimer("test-sweep"),
	)

	result, err := reminders.Sweep(context.Background(), scope)
	if err != nil {
		t.Fatalf("Sweep: %v", err)
	}
	if result.Claimed != 1 || result.Skipped != 1 || result.Sent != 0 {
		t.Fatalf("expected claimed=1 skipped=1 sent=0, got %+v", result)
	}
	if result.SkipReasons["recipient_not_in_active_stage"] != 1 {
		t.Fatalf("expected recipient_not_in_active_stage reason count 1, got %+v", result.SkipReasons)
	}

	state, err := store.GetAgreementReminderState(context.Background(), scope, agreement.ID, secondSigner.ID)
	if err != nil {
		t.Fatalf("GetAgreementReminderState: %v", err)
	}
	if state.LastReasonCode != "recipient_not_in_active_stage" {
		t.Fatalf("expected last_reason_code recipient_not_in_active_stage, got %q", state.LastReasonCode)
	}

	if _, err := store.GetAgreementReminderState(context.Background(), scope, agreement.ID, firstSigner.ID); err == nil {
		t.Fatalf("did not expect reminder state for active-stage signer to be created in this path")
	}
}

func TestAgreementReminderServiceSweepPausesTerminalAgreement(t *testing.T) {
	now := time.Date(2026, 3, 9, 3, 15, 0, 0, time.UTC)
	cfg := appcfg.Defaults()
	cfg.Reminders.Enabled = true
	cfg.Reminders.BatchSize = 10
	cfg.Reminders.ClaimLeaseSeconds = 120
	cfg.Reminders.IntervalMinutes = 60
	cfg.Reminders.InitialDelayMinutes = 30
	cfg.Reminders.MaxReminders = 6
	cfg.Reminders.JitterPercent = 0
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	agreement, recipient := seedSentAgreementWithSigner(t, store, scope, now.Add(-2*time.Hour))

	agreementSvc := NewAgreementService(
		store,
		WithAgreementClock(func() time.Time { return now }),
		WithAgreementReminderStore(store),
	)
	if _, err := agreementSvc.Void(context.Background(), scope, agreement.ID, VoidInput{Reason: "cancelled"}); err != nil {
		t.Fatalf("Void: %v", err)
	}

	_, err := store.UpsertAgreementReminderState(context.Background(), scope, stores.AgreementReminderStateRecord{
		AgreementID: agreement.ID,
		RecipientID: recipient.ID,
		Status:      stores.AgreementReminderStatusActive,
		NextDueAt:   cloneServiceTestTimePtr(now.Add(-1 * time.Minute)),
		CreatedAt:   now.Add(-3 * time.Hour),
		UpdatedAt:   now.Add(-2 * time.Hour),
	})
	if err != nil {
		t.Fatalf("UpsertAgreementReminderState: %v", err)
	}

	reminders := NewAgreementReminderService(
		store,
		agreementSvc,
		WithAgreementReminderClock(func() time.Time { return now }),
		WithAgreementReminderClaimer("test-sweep"),
	)
	result, err := reminders.Sweep(context.Background(), scope)
	if err != nil {
		t.Fatalf("Sweep: %v", err)
	}
	if result.Claimed != 1 || result.Skipped != 1 || result.Sent != 0 || result.Failed != 0 {
		t.Fatalf("unexpected sweep result: %+v", result)
	}
	if result.SkipReasons["agreement_terminal"] != 1 {
		t.Fatalf("expected agreement_terminal reason count 1, got %+v", result.SkipReasons)
	}
	state, err := store.GetAgreementReminderState(context.Background(), scope, agreement.ID, recipient.ID)
	if err != nil {
		t.Fatalf("GetAgreementReminderState: %v", err)
	}
	if state.Status != stores.AgreementReminderStatusPaused {
		t.Fatalf("expected paused state after terminal agreement, got %q", state.Status)
	}
}

func TestAgreementReminderServiceSweepSkipsMaxCountReached(t *testing.T) {
	now := time.Date(2026, 3, 9, 3, 30, 0, 0, time.UTC)
	cfg := appcfg.Defaults()
	cfg.Reminders.Enabled = true
	cfg.Reminders.BatchSize = 10
	cfg.Reminders.ClaimLeaseSeconds = 120
	cfg.Reminders.IntervalMinutes = 60
	cfg.Reminders.InitialDelayMinutes = 30
	cfg.Reminders.MaxReminders = 1
	cfg.Reminders.JitterPercent = 0
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	agreement, recipient := seedSentAgreementWithSigner(t, store, scope, now.Add(-2*time.Hour))
	_, err := store.UpsertAgreementReminderState(context.Background(), scope, stores.AgreementReminderStateRecord{
		AgreementID: agreement.ID,
		RecipientID: recipient.ID,
		Status:      stores.AgreementReminderStatusActive,
		SentCount:   1,
		FirstSentAt: cloneServiceTestTimePtr(now.Add(-24 * time.Hour)),
		LastSentAt:  cloneServiceTestTimePtr(now.Add(-2 * time.Hour)),
		NextDueAt:   cloneServiceTestTimePtr(now.Add(-1 * time.Minute)),
		CreatedAt:   now.Add(-24 * time.Hour),
		UpdatedAt:   now.Add(-2 * time.Hour),
	})
	if err != nil {
		t.Fatalf("UpsertAgreementReminderState: %v", err)
	}

	agreements := NewAgreementService(
		store,
		WithAgreementClock(func() time.Time { return now }),
		WithAgreementReminderStore(store),
	)
	reminders := NewAgreementReminderService(
		store,
		agreements,
		WithAgreementReminderClock(func() time.Time { return now }),
		WithAgreementReminderClaimer("test-sweep"),
	)
	result, err := reminders.Sweep(context.Background(), scope)
	if err != nil {
		t.Fatalf("Sweep: %v", err)
	}
	if result.Claimed != 1 || result.Skipped != 1 || result.Sent != 0 {
		t.Fatalf("expected claimed=1 skipped=1 sent=0, got %+v", result)
	}
	if result.SkipReasons["max_count_reached"] != 1 {
		t.Fatalf("expected max_count_reached reason count 1, got %+v", result.SkipReasons)
	}
}

func TestAgreementReminderServiceSendNowBlockedByPolicy(t *testing.T) {
	now := time.Date(2026, 3, 9, 4, 0, 0, 0, time.UTC)
	cfg := appcfg.Defaults()
	cfg.Reminders.Enabled = true
	cfg.Reminders.BatchSize = 10
	cfg.Reminders.ClaimLeaseSeconds = 120
	cfg.Reminders.IntervalMinutes = 60
	cfg.Reminders.InitialDelayMinutes = 30
	cfg.Reminders.ManualResendCooldownMinutes = 180
	cfg.Reminders.MaxReminders = 6
	cfg.Reminders.JitterPercent = 0
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	agreement, recipient := seedSentAgreementWithSigner(t, store, scope, now.Add(-4*time.Hour))

	_, err := store.UpsertAgreementReminderState(context.Background(), scope, stores.AgreementReminderStateRecord{
		AgreementID:        agreement.ID,
		RecipientID:        recipient.ID,
		Status:             stores.AgreementReminderStatusActive,
		SentCount:          1,
		FirstSentAt:        cloneServiceTestTimePtr(now.Add(-26 * time.Hour)),
		LastSentAt:         cloneServiceTestTimePtr(now.Add(-2 * time.Hour)),
		LastManualResendAt: cloneServiceTestTimePtr(now.Add(-30 * time.Minute)),
		NextDueAt:          cloneServiceTestTimePtr(now.Add(90 * time.Minute)),
		CreatedAt:          now.Add(-26 * time.Hour),
		UpdatedAt:          now.Add(-2 * time.Hour),
	})
	if err != nil {
		t.Fatalf("UpsertAgreementReminderState: %v", err)
	}

	agreements := NewAgreementService(
		store,
		WithAgreementClock(func() time.Time { return now }),
		WithAgreementReminderStore(store),
	)
	reminders := NewAgreementReminderService(
		store,
		agreements,
		WithAgreementReminderClock(func() time.Time { return now }),
	)
	_, err = reminders.SendNow(context.Background(), scope, agreement.ID, recipient.ID)
	if err == nil {
		t.Fatalf("expected send_now to be blocked by policy")
	}
	var coded *goerrors.Error
	if !errors.As(err, &coded) || coded == nil {
		t.Fatalf("expected coded validation error, got %v", err)
	}
	if got := strings.TrimSpace(fmt.Sprint(coded.Metadata["entity"])); got != "reminders" {
		t.Fatalf("expected validation entity reminders, got %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(coded.Metadata["field"])); got != "policy" {
		t.Fatalf("expected validation field policy, got %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(coded.Metadata["reason"])); got != "send_now blocked by reminder policy" {
		t.Fatalf("expected policy block reason, got %q", got)
	}
	state, err := store.GetAgreementReminderState(context.Background(), scope, agreement.ID, recipient.ID)
	if err != nil {
		t.Fatalf("GetAgreementReminderState: %v", err)
	}
	if state.SentCount != 1 {
		t.Fatalf("expected sent_count to remain 1, got %d", state.SentCount)
	}
	if state.LastReasonCode != "manual_resend_cooldown" {
		t.Fatalf("expected last_reason_code manual_resend_cooldown, got %q", state.LastReasonCode)
	}
}

func seedSentAgreementWithSigner(t *testing.T, store *stores.InMemoryStore, scope stores.Scope, now time.Time) (stores.AgreementRecord, stores.RecipientRecord) {
	t.Helper()
	ctx := context.Background()
	agreement, err := store.CreateDraft(ctx, scope, stores.AgreementRecord{
		DocumentID:      "doc-1",
		Title:           "Reminder Agreement",
		Status:          stores.AgreementStatusDraft,
		CreatedByUserID: "user-1",
		UpdatedByUserID: "user-1",
		CreatedAt:       now,
		UpdatedAt:       now,
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	email := "signer@example.test"
	name := "Signer"
	role := stores.RecipientRoleSigner
	stage := 1
	recipient, err := store.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        &email,
		Name:         &name,
		Role:         &role,
		SigningOrder: &stage,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	agreement, err = store.GetAgreement(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("GetAgreement: %v", err)
	}
	agreement, err = store.Transition(ctx, scope, agreement.ID, stores.AgreementTransitionInput{
		ToStatus:        stores.AgreementStatusSent,
		ExpectedVersion: agreement.Version,
	})
	if err != nil {
		t.Fatalf("Transition(sent): %v", err)
	}
	return agreement, recipient
}

func seedSentAgreementWithTwoSigners(
	t *testing.T,
	store *stores.InMemoryStore,
	scope stores.Scope,
	now time.Time,
) (stores.AgreementRecord, stores.RecipientRecord, stores.RecipientRecord) {
	t.Helper()
	ctx := context.Background()
	agreement, err := store.CreateDraft(ctx, scope, stores.AgreementRecord{
		DocumentID:      "doc-1",
		Title:           "Reminder Agreement",
		Status:          stores.AgreementStatusDraft,
		CreatedByUserID: "user-1",
		UpdatedByUserID: "user-1",
		CreatedAt:       now,
		UpdatedAt:       now,
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	email1 := "signer-1@example.test"
	name1 := "Signer One"
	role := stores.RecipientRoleSigner
	stage1 := 1
	signer1, err := store.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        &email1,
		Name:         &name1,
		Role:         &role,
		SigningOrder: &stage1,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer1: %v", err)
	}
	email2 := "signer-2@example.test"
	name2 := "Signer Two"
	stage2 := 2
	signer2, err := store.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        &email2,
		Name:         &name2,
		Role:         &role,
		SigningOrder: &stage2,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer2: %v", err)
	}
	agreement, err = store.GetAgreement(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("GetAgreement: %v", err)
	}
	agreement, err = store.Transition(ctx, scope, agreement.ID, stores.AgreementTransitionInput{
		ToStatus:        stores.AgreementStatusSent,
		ExpectedVersion: agreement.Version,
	})
	if err != nil {
		t.Fatalf("Transition(sent): %v", err)
	}
	return agreement, signer1, signer2
}

func cloneServiceTestTimePtr(value time.Time) *time.Time {
	out := value.UTC()
	return &out
}
