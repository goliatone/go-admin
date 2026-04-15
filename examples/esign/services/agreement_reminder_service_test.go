package services

import (
	"context"
	"encoding/json"
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
		WithAgreementReminderWorkerID("test-sweep"),
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
		WithAgreementReminderWorkerID("test-sweep"),
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
		WithAgreementReminderWorkerID("test-sweep"),
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
		WithAgreementReminderWorkerID("test-sweep"),
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
		WithAgreementReminderWorkerID("test-sweep"),
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
	state, err := store.GetAgreementReminderState(context.Background(), scope, agreement.ID, recipient.ID)
	if err != nil {
		t.Fatalf("GetAgreementReminderState: %v", err)
	}
	if state.Status != stores.AgreementReminderStatusTerminal {
		t.Fatalf("expected terminal state after max_count_reached, got %q", state.Status)
	}
	if state.TerminalReason != stores.AgreementReminderTerminalReasonMaxCountReached {
		t.Fatalf("expected terminal reason max_count_reached, got %q", state.TerminalReason)
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

func TestAgreementServiceEnsureReminderStateInitializesNextDue(t *testing.T) {
	now := time.Date(2026, 3, 9, 4, 30, 0, 0, time.UTC)
	cfg := appcfg.Defaults()
	cfg.Reminders.Enabled = true
	cfg.Reminders.InitialDelayMinutes = 30
	cfg.Reminders.IntervalMinutes = 60
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	agreement, recipient := seedSentAgreementWithSigner(t, store, scope, now)
	agreementSvc := NewAgreementService(
		store,
		WithAgreementClock(func() time.Time { return now }),
		WithAgreementReminderStore(store),
	)

	state, err := agreementSvc.ensureReminderState(context.Background(), scope, agreement, recipient)
	if err != nil {
		t.Fatalf("ensureReminderState: %v", err)
	}
	if state.NextDueAt == nil {
		t.Fatalf("expected next_due_at to be initialized")
	}
}

func TestAgreementReminderServicePauseRejectsNonSigner(t *testing.T) {
	now := time.Date(2026, 3, 9, 5, 0, 0, 0, time.UTC)
	cfg := appcfg.Defaults()
	cfg.Reminders.Enabled = true
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	agreement, cc := seedSentAgreementWithCC(t, store, scope, now)

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
	if _, err := reminders.Pause(context.Background(), scope, agreement.ID, cc.ID); err == nil {
		t.Fatalf("expected pause to reject non-signer recipient")
	}
}

func TestAgreementReminderServiceSweepSendsDueReviewReminder(t *testing.T) {
	now := time.Date(2026, 3, 10, 2, 0, 0, 0, time.UTC)
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

	current := now.Add(-2 * time.Hour)
	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	agreements, agreement, participant := seedDraftAgreementInReviewWithReviewer(t, store, scope, &current)
	reminders := NewAgreementReminderService(
		store,
		agreements,
		WithAgreementReminderClock(func() time.Time { return current }),
		WithAgreementReminderWorkerID("test-sweep"),
	)

	current = now
	result, err := reminders.Sweep(context.Background(), scope)
	if err != nil {
		t.Fatalf("Sweep: %v", err)
	}
	if result.Claimed != 1 || result.Sent != 1 {
		t.Fatalf("expected one scheduled review reminder sent, got %+v", result)
	}

	outbox, err := store.ListOutboxMessages(context.Background(), scope, stores.OutboxQuery{Topic: NotificationOutboxTopicEmailSendSigningRequest})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(outbox) != 2 {
		t.Fatalf("expected initial invite plus reminder, got %+v", outbox)
	}
	foundReminder := false
	for _, record := range outbox {
		var payload EmailSendAgreementNotificationOutboxPayload
		unmarshalErr := json.Unmarshal([]byte(record.PayloadJSON), &payload)
		if unmarshalErr != nil {
			t.Fatalf("Unmarshal outbox payload: %v", unmarshalErr)
		}
		if strings.TrimSpace(payload.CorrelationID) != "review-reminder:"+agreement.ID+":"+participant.ReviewID+":1" {
			continue
		}
		if payload.Notification != string(NotificationReviewInvitation) {
			t.Fatalf("expected review invitation payload, got %+v", payload)
		}
		foundReminder = true
	}
	if !foundReminder {
		t.Fatalf("expected scheduled review reminder outbox payload for participant %q", participant.ID)
	}

	events, err := store.ListForAgreement(context.Background(), scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	foundAutoAudit := false
	for _, event := range events {
		if event.EventType != "agreement.review_notified" {
			continue
		}
		metadata := map[string]any{}
		if err := json.Unmarshal([]byte(event.MetadataJSON), &metadata); err != nil {
			t.Fatalf("Unmarshal audit metadata: %v", err)
		}
		if strings.TrimSpace(fmt.Sprint(metadata["source"])) != ReviewNotificationSourceAutoReminder {
			continue
		}
		foundAutoAudit = true
		break
	}
	if !foundAutoAudit {
		t.Fatalf("expected auto reminder audit event, got %+v", events)
	}
}

func TestAgreementReminderServiceSweepSendsReviewReminderBatchToAllPendingReviewers(t *testing.T) {
	now := time.Date(2026, 3, 10, 2, 0, 0, 0, time.UTC)
	cfg := appcfg.Defaults()
	cfg.Reminders.Enabled = true
	cfg.Reminders.BatchSize = 10
	cfg.Reminders.ClaimLeaseSeconds = 120
	cfg.Reminders.IntervalMinutes = 60
	cfg.Reminders.InitialDelayMinutes = 30
	cfg.Reminders.MaxReminders = 6
	cfg.Reminders.JitterPercent = 0
	cfg.Reminders.RecentViewGraceMinutes = 120
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	current := now.Add(-2 * time.Hour)
	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	agreements, agreement, participants := seedDraftAgreementInReviewWithExternalReviewers(t, store, scope, &current)

	current = now.Add(-5 * time.Minute)
	appendReviewViewedAuditEvent(t, store, scope, agreement.ID, participants[1], current)

	reminders := NewAgreementReminderService(
		store,
		agreements,
		WithAgreementReminderClock(func() time.Time { return current }),
		WithAgreementReminderWorkerID("test-sweep"),
	)

	current = now
	result, err := reminders.Sweep(context.Background(), scope)
	if err != nil {
		t.Fatalf("Sweep: %v", err)
	}
	if result.Claimed != 2 || result.Sent != 2 {
		t.Fatalf("expected two scheduled review reminders sent, got %+v", result)
	}

	outbox, err := store.ListOutboxMessages(context.Background(), scope, stores.OutboxQuery{Topic: NotificationOutboxTopicEmailSendSigningRequest})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(outbox) != 4 {
		t.Fatalf("expected two initial invites plus two reminders, got %+v", outbox)
	}
	reminderCount := 0
	for _, record := range outbox {
		var payload EmailSendAgreementNotificationOutboxPayload
		unmarshalErr := json.Unmarshal([]byte(record.PayloadJSON), &payload)
		if unmarshalErr != nil {
			t.Fatalf("Unmarshal outbox payload: %v", unmarshalErr)
		}
		if strings.TrimSpace(payload.CorrelationID) != "review-reminder:"+agreement.ID+":"+participants[0].ReviewID+":1" {
			continue
		}
		reminderCount++
	}
	if reminderCount != 2 {
		t.Fatalf("expected two review reminder outbox payloads in one batch, got %d", reminderCount)
	}

	events, err := store.ListForAgreement(context.Background(), scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	foundAutoBatch := false
	for _, event := range events {
		if event.EventType != "agreement.review_notified" {
			continue
		}
		metadata := map[string]any{}
		if err := json.Unmarshal([]byte(event.MetadataJSON), &metadata); err != nil {
			t.Fatalf("Unmarshal audit metadata: %v", err)
		}
		if strings.TrimSpace(fmt.Sprint(metadata["source"])) != ReviewNotificationSourceAutoReminder {
			continue
		}
		if got := strings.TrimSpace(fmt.Sprint(metadata["notified_count"])); got != "2" {
			continue
		}
		rawParticipants, ok := metadata["review_participants"].([]any)
		if !ok || len(rawParticipants) != 2 {
			t.Fatalf("expected batched review participants metadata, got %+v", metadata)
		}
		foundAutoBatch = true
		break
	}
	if !foundAutoBatch {
		t.Fatalf("expected batched auto reminder audit event, got %+v", events)
	}
}

func TestAgreementReminderServiceSweepSkipsReviewReminderDuringManualCooldown(t *testing.T) {
	now := time.Date(2026, 3, 10, 3, 0, 0, 0, time.UTC)
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

	current := now.Add(-4 * time.Hour)
	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	agreements, agreement, participant := seedDraftAgreementInReviewWithReviewer(t, store, scope, &current)

	current = now.Add(-30 * time.Minute)
	if _, err := agreements.NotifyReviewers(context.Background(), scope, agreement.ID, ReviewNotifyInput{
		ParticipantID: participant.ID,
		RequestedByID: "ops-user",
		ActorType:     "user",
		ActorID:       "ops-user",
		CorrelationID: "manual-review-notify",
	}); err != nil {
		t.Fatalf("NotifyReviewers: %v", err)
	}

	reminders := NewAgreementReminderService(
		store,
		agreements,
		WithAgreementReminderClock(func() time.Time { return current }),
		WithAgreementReminderWorkerID("test-sweep"),
	)

	current = now
	result, err := reminders.Sweep(context.Background(), scope)
	if err != nil {
		t.Fatalf("Sweep: %v", err)
	}
	if result.Sent != 0 {
		t.Fatalf("expected no scheduled review reminder during manual cooldown, got %+v", result)
	}
	if result.SkipReasons["review_manual_resend_cooldown"] != 1 {
		t.Fatalf("expected review_manual_resend_cooldown skip, got %+v", result.SkipReasons)
	}
}

func TestAgreementServicePauseAndResumeReviewReminder(t *testing.T) {
	now := time.Date(2026, 3, 10, 3, 0, 0, 0, time.UTC)
	cfg := appcfg.Defaults()
	cfg.Reminders.Enabled = true
	cfg.Reminders.IntervalMinutes = 60
	cfg.Reminders.InitialDelayMinutes = 30
	cfg.Reminders.MaxReminders = 6
	cfg.Reminders.JitterPercent = 0
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	current := now
	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	agreements, agreement, participant := seedDraftAgreementInReviewWithReviewer(t, store, scope, &current)

	current = now.Add(10 * time.Minute)
	paused, err := agreements.PauseReviewReminder(context.Background(), scope, agreement.ID, ReviewReminderControlInput{
		ParticipantID: participant.ID,
		ActorType:     "user",
		ActorID:       "ops-user",
	})
	if err != nil {
		t.Fatalf("PauseReviewReminder: %v", err)
	}
	if !paused.Paused || paused.Status != stores.AgreementReminderStatusPaused {
		t.Fatalf("expected paused review reminder state, got %+v", paused)
	}

	reminders := NewAgreementReminderService(
		store,
		agreements,
		WithAgreementReminderClock(func() time.Time { return current }),
		WithAgreementReminderWorkerID("test-sweep"),
	)
	current = now.Add(40 * time.Minute)
	result, err := reminders.Sweep(context.Background(), scope)
	if err != nil {
		t.Fatalf("Sweep paused: %v", err)
	}
	if result.Sent != 0 || result.SkipReasons["review_paused"] != 1 {
		t.Fatalf("expected paused review reminder skip, got %+v", result)
	}

	current = now.Add(20 * time.Minute)
	resumed, err := agreements.ResumeReviewReminder(context.Background(), scope, agreement.ID, ReviewReminderControlInput{
		ParticipantID: participant.ID,
		ActorType:     "user",
		ActorID:       "ops-user",
	})
	if err != nil {
		t.Fatalf("ResumeReviewReminder: %v", err)
	}
	if resumed.Paused || resumed.Status != stores.AgreementReminderStatusActive || resumed.NextDueAt == nil {
		t.Fatalf("expected active resumed review reminder state, got %+v", resumed)
	}

	current = now.Add(31 * time.Minute)
	result, err = reminders.Sweep(context.Background(), scope)
	if err != nil {
		t.Fatalf("Sweep resumed: %v", err)
	}
	if result.Sent != 1 {
		t.Fatalf("expected resumed review reminder to send once due, got %+v", result)
	}
}

func TestAgreementServiceSendReviewReminderNowRespectsPolicy(t *testing.T) {
	now := time.Date(2026, 3, 10, 5, 0, 0, 0, time.UTC)
	cfg := appcfg.Defaults()
	cfg.Reminders.Enabled = true
	cfg.Reminders.IntervalMinutes = 60
	cfg.Reminders.InitialDelayMinutes = 30
	cfg.Reminders.MaxReminders = 6
	cfg.Reminders.JitterPercent = 0
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	current := now
	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	agreements, agreement, participant := seedDraftAgreementInReviewWithReviewer(t, store, scope, &current)

	current = now.Add(10 * time.Minute)
	if _, err := agreements.SendReviewReminderNow(context.Background(), scope, agreement.ID, ReviewReminderControlInput{
		ParticipantID: participant.ID,
		ActorType:     "user",
		ActorID:       "ops-user",
		CorrelationID: "review-send-now-blocked",
	}); err == nil {
		t.Fatalf("expected send review reminder now to be blocked by policy")
	}

	current = now.Add(40 * time.Minute)
	if _, err := agreements.SendReviewReminderNow(context.Background(), scope, agreement.ID, ReviewReminderControlInput{
		ParticipantID: participant.ID,
		ActorType:     "user",
		ActorID:       "ops-user",
		CorrelationID: "review-send-now",
	}); err != nil {
		t.Fatalf("SendReviewReminderNow: %v", err)
	}

	outbox, err := store.ListOutboxMessages(context.Background(), scope, stores.OutboxQuery{Topic: NotificationOutboxTopicEmailSendSigningRequest})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(outbox) != 2 {
		t.Fatalf("expected initial invite plus send_now reminder, got %+v", outbox)
	}
	events, err := store.ListForAgreement(context.Background(), scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	foundSendNow := false
	for _, event := range events {
		if event.EventType != "agreement.review_notified" {
			continue
		}
		metadata := map[string]any{}
		if err := json.Unmarshal([]byte(event.MetadataJSON), &metadata); err != nil {
			t.Fatalf("Unmarshal audit metadata: %v", err)
		}
		if strings.TrimSpace(fmt.Sprint(metadata["reason"])) == "send_now" {
			foundSendNow = true
			break
		}
	}
	if !foundSendNow {
		t.Fatalf("expected send_now audit event in %+v", events)
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

func seedSentAgreementWithCC(t *testing.T, store *stores.InMemoryStore, scope stores.Scope, now time.Time) (stores.AgreementRecord, stores.RecipientRecord) {
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
	signerEmail := "signer@example.test"
	signerName := "Signer"
	signerRole := stores.RecipientRoleSigner
	stage := 1
	_, upsertErr := store.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        &signerEmail,
		Name:         &signerName,
		Role:         &signerRole,
		SigningOrder: &stage,
	}, 0)
	if upsertErr != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", upsertErr)
	}
	email := "cc@example.test"
	name := "CC Recipient"
	role := stores.RecipientRoleCC
	ccStage := 1
	cc, err := store.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        &email,
		Name:         &name,
		Role:         &role,
		SigningOrder: &ccStage,
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
	return agreement, cc
}

func cloneServiceTestTimePtr(value time.Time) *time.Time {
	out := value.UTC()
	return &out
}

func seedDraftAgreementInReviewWithReviewer(
	t *testing.T,
	store *stores.InMemoryStore,
	scope stores.Scope,
	current *time.Time,
) (AgreementService, stores.AgreementRecord, stores.AgreementReviewParticipantRecord) {
	t.Helper()
	ctx := context.Background()
	docSvc := NewDocumentService(store, WithDocumentClock(func() time.Time { return current.UTC() }))
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "Review Reminder Document",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-review-reminder/original.pdf",
		SourceOriginalName: "review-reminder.pdf",
		PDF:                samplePDF(2),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	agreements := NewAgreementService(
		store,
		WithAgreementClock(func() time.Time { return current.UTC() }),
		WithAgreementNotificationOutbox(store),
	)
	agreement, err := agreements.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Review Reminder Agreement",
		Message:         "Please review",
		CreatedByUserID: "ops-user",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	email := "reviewer@example.test"
	name := "Reviewer"
	role := stores.RecipientRoleSigner
	stage := 1
	recipient, err := agreements.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        &email,
		Name:         &name,
		Role:         &role,
		SigningOrder: &stage,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	summary, err := agreements.OpenReview(ctx, scope, agreement.ID, ReviewOpenInput{
		Gate:              stores.AgreementReviewGateApproveBeforeSend,
		CommentsEnabled:   true,
		ReviewerIDs:       []string{recipient.ID},
		RequestedByUserID: "ops-user",
		ActorType:         "user",
		ActorID:           "ops-user",
		CorrelationID:     "initial-review-open",
	})
	if err != nil {
		t.Fatalf("OpenReview: %v", err)
	}
	if len(summary.Participants) != 1 {
		t.Fatalf("expected one review participant, got %+v", summary.Participants)
	}
	return agreements, agreement, summary.Participants[0]
}

func seedDraftAgreementInReviewWithExternalReviewers(
	t *testing.T,
	store *stores.InMemoryStore,
	scope stores.Scope,
	current *time.Time,
) (AgreementService, stores.AgreementRecord, []stores.AgreementReviewParticipantRecord) {
	t.Helper()
	ctx := context.Background()
	docSvc := NewDocumentService(store, WithDocumentClock(func() time.Time { return current.UTC() }))
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "Review Reminder Document",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-review-reminder-batch/original.pdf",
		SourceOriginalName: "review-reminder-batch.pdf",
		PDF:                samplePDF(2),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	agreements := NewAgreementService(
		store,
		WithAgreementClock(func() time.Time { return current.UTC() }),
		WithAgreementNotificationOutbox(store),
	)
	agreement, err := agreements.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Review Reminder Agreement",
		Message:         "Please review",
		CreatedByUserID: "ops-user",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	summary, err := agreements.OpenReview(ctx, scope, agreement.ID, ReviewOpenInput{
		Gate:            stores.AgreementReviewGateApproveBeforeSend,
		CommentsEnabled: true,
		ReviewParticipants: []ReviewParticipantInput{
			{
				ParticipantType: stores.AgreementReviewParticipantTypeExternal,
				Email:           "pm@team.com",
				DisplayName:     "Project Manager",
				CanComment:      true,
				CanApprove:      false,
			},
			{
				ParticipantType: stores.AgreementReviewParticipantTypeExternal,
				Email:           "legal@team.com",
				DisplayName:     "Legal",
				CanComment:      true,
				CanApprove:      true,
			},
		},
		RequestedByUserID: "ops-user",
		ActorType:         "user",
		ActorID:           "ops-user",
		CorrelationID:     "initial-review-open-batch",
	})
	if err != nil {
		t.Fatalf("OpenReview: %v", err)
	}
	if len(summary.Participants) != 2 {
		t.Fatalf("expected two review participants, got %+v", summary.Participants)
	}
	return agreements, agreement, summary.Participants
}

func appendReviewViewedAuditEvent(
	t *testing.T,
	store *stores.InMemoryStore,
	scope stores.Scope,
	agreementID string,
	participant stores.AgreementReviewParticipantRecord,
	createdAt time.Time,
) {
	t.Helper()
	metadata, err := json.Marshal(map[string]any{
		"participant_email": participant.Email,
		"participant_id":    participant.ID,
		"participant_type":  participant.ParticipantType,
		"recipient_id":      participant.RecipientID,
		"review_id":         participant.ReviewID,
	})
	if err != nil {
		t.Fatalf("Marshal review_viewed metadata: %v", err)
	}
	if _, err := store.Append(context.Background(), scope, stores.AuditEventRecord{
		AgreementID:  agreementID,
		EventType:    "agreement.review_viewed",
		ActorType:    "reviewer",
		ActorID:      participant.ID,
		MetadataJSON: string(metadata),
		CreatedAt:    createdAt,
	}); err != nil {
		t.Fatalf("Append review_viewed event: %v", err)
	}
}
