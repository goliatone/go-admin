package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
	reminders "github.com/goliatone/go-notifications/pkg/reminders"
)

// AgreementReminderSweepResult summarizes one reminder sweep execution.
type AgreementReminderSweepResult struct {
	Claimed     int
	Sent        int
	Skipped     int
	Failed      int
	SkipReasons map[string]int
}

// AgreementReminderService coordinates due reminder claims and resend dispatch.
type AgreementReminderService struct {
	agreements stores.AgreementStore
	reminders  stores.AgreementReminderStore
	lifecycle  AgreementService
	now        func() time.Time
	claimer    string
}

// AgreementReminderServiceOption customizes reminder service behavior.
type AgreementReminderServiceOption func(*AgreementReminderService)

// WithAgreementReminderClock overrides wall clock.
func WithAgreementReminderClock(now func() time.Time) AgreementReminderServiceOption {
	return func(s *AgreementReminderService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// WithAgreementReminderClaimer sets the lease claimer id used by sweeps.
func WithAgreementReminderClaimer(claimer string) AgreementReminderServiceOption {
	return func(s *AgreementReminderService) {
		if s == nil {
			return
		}
		s.claimer = strings.TrimSpace(claimer)
	}
}

func NewAgreementReminderService(store stores.Store, lifecycle AgreementService, opts ...AgreementReminderServiceOption) AgreementReminderService {
	svc := AgreementReminderService{
		agreements: store,
		reminders:  store,
		lifecycle:  lifecycle,
		now:        func() time.Time { return time.Now().UTC() },
		claimer:    "agreement-reminder-sweep",
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&svc)
		}
	}
	return svc
}

func (s AgreementReminderService) Sweep(ctx context.Context, scope stores.Scope) (AgreementReminderSweepResult, error) {
	out := AgreementReminderSweepResult{SkipReasons: map[string]int{}}
	if s.reminders == nil || s.agreements == nil {
		return out, fmt.Errorf("agreement reminder service not configured")
	}
	cfg := appcfg.Active().Reminders
	if !cfg.Enabled {
		return out, nil
	}
	now := s.now().UTC()
	claimer := strings.TrimSpace(s.claimer)
	if claimer == "" {
		claimer = "agreement-reminder-sweep"
	}
	states, err := s.reminders.ClaimDueAgreementReminders(ctx, scope, stores.AgreementReminderClaimInput{
		Now:          now,
		Limit:        cfg.BatchSize,
		LeaseSeconds: cfg.ClaimLeaseSeconds,
		Claimer:      claimer,
	})
	if err != nil {
		return out, err
	}
	out.Claimed = len(states)
	policy := ReminderPolicyFromConfig(appcfg.Active())
	for _, state := range states {
		outcome, reason, processErr := s.processClaimedReminder(ctx, scope, state, policy)
		if processErr != nil {
			out.Failed++
			continue
		}
		switch outcome {
		case "sent":
			out.Sent++
		case "skipped":
			out.Skipped++
			if strings.TrimSpace(reason) != "" {
				out.SkipReasons[reason]++
			}
		case "failed":
			out.Failed++
		}
	}
	return out, nil
}

func (s AgreementReminderService) processClaimedReminder(
	ctx context.Context,
	scope stores.Scope,
	state stores.AgreementReminderStateRecord,
	policy reminders.Policy,
) (string, string, error) {
	now := s.now().UTC()
	stableKey := reminderStableKey(scope, state.AgreementID, state.RecipientID)
	nextDue := reminders.ComputeNextDue(now, policy, stableKey)
	markSkip := func(reason string, due *time.Time) error {
		_, err := s.reminders.MarkAgreementReminderSkipped(ctx, scope, state.AgreementID, state.RecipientID, reason, now, due)
		return err
	}
	markFail := func(reason, failure string) error {
		_, err := s.reminders.MarkAgreementReminderFailed(ctx, scope, state.AgreementID, state.RecipientID, reason, failure, now, &nextDue)
		return err
	}

	agreement, err := s.agreements.GetAgreement(ctx, scope, state.AgreementID)
	if err != nil {
		return "failed", "agreement_lookup_failed", markFail("agreement_lookup_failed", err.Error())
	}
	switch strings.TrimSpace(agreement.Status) {
	case stores.AgreementStatusSent, stores.AgreementStatusInProgress:
	case stores.AgreementStatusCompleted, stores.AgreementStatusVoided, stores.AgreementStatusDeclined, stores.AgreementStatusExpired:
		_, pauseErr := s.reminders.PauseAgreementReminder(ctx, scope, state.AgreementID, state.RecipientID, now)
		if pauseErr != nil {
			return "failed", "pause_failed", pauseErr
		}
		return "skipped", "agreement_terminal", nil
	default:
		return "skipped", "agreement_not_active", markSkip("agreement_not_active", &nextDue)
	}

	recipients, err := s.agreements.ListRecipients(ctx, scope, state.AgreementID)
	if err != nil {
		return "failed", "recipient_lookup_failed", markFail("recipient_lookup_failed", err.Error())
	}
	activeStage, activeSigners, ok := activeSignerStage(recipients)
	if !ok {
		return "skipped", "no_active_signer", markSkip("no_active_signer", &nextDue)
	}
	target, found := recipientByID(recipients, state.RecipientID)
	if !found {
		return "failed", "recipient_not_found", markFail("recipient_not_found", "recipient not found")
	}
	if target.Role != stores.RecipientRoleSigner {
		return "skipped", "recipient_not_signer", markSkip("recipient_not_signer", &nextDue)
	}
	if target.CompletedAt != nil || target.DeclinedAt != nil {
		_, pauseErr := s.reminders.PauseAgreementReminder(ctx, scope, state.AgreementID, state.RecipientID, now)
		if pauseErr != nil {
			return "failed", "pause_failed", pauseErr
		}
		return "skipped", "recipient_terminal", nil
	}
	if !containsRecipientID(recipientIDs(activeSigners), target.ID) && !appcfg.Active().Reminders.AllowOutOfOrder {
		_ = activeStage
		return "skipped", "recipient_not_in_active_stage", markSkip("recipient_not_in_active_stage", &nextDue)
	}

	updatedState := state
	updatedState.LastViewedAt = newerTimePtr(updatedState.LastViewedAt, target.LastViewAt)
	updatedState.LastEvaluatedAt = cloneServiceTimePtr(&now)
	updatedState.UpdatedAt = now
	if _, err := s.reminders.UpsertAgreementReminderState(ctx, scope, updatedState); err != nil {
		return "failed", "state_upsert_failed", err
	}

	decision := reminders.Evaluate(now, policy, reminders.State{
		SentCount:          updatedState.SentCount,
		FirstSentAt:        updatedState.FirstSentAt,
		LastSentAt:         updatedState.LastSentAt,
		LastViewedAt:       updatedState.LastViewedAt,
		LastManualResendAt: updatedState.LastManualResendAt,
		NextDueAt:          updatedState.NextDueAt,
	})
	if !decision.Due {
		reason := strings.TrimSpace(decision.ReasonCode)
		return "skipped", reason, markSkip(reason, decision.NextDueAt)
	}

	_, resendErr := s.lifecycle.Resend(ctx, scope, agreement.ID, ResendInput{
		RecipientID:           target.ID,
		RotateToken:           appcfg.Active().Reminders.RotateToken,
		InvalidateExisting:    appcfg.Active().Reminders.RotateToken,
		AllowOutOfOrderResend: appcfg.Active().Reminders.AllowOutOfOrder,
		IdempotencyKey:        fmt.Sprintf("reminder:%s:%s:%d", agreement.ID, target.ID, now.UnixNano()),
		Source:                ResendSourceAutoReminder,
	})
	if resendErr != nil {
		return "failed", "resend_failed", markFail("resend_failed", resendErr.Error())
	}
	return "sent", "", nil
}

func recipientByID(recipients []stores.RecipientRecord, id string) (stores.RecipientRecord, bool) {
	id = strings.TrimSpace(id)
	for _, recipient := range recipients {
		if strings.TrimSpace(recipient.ID) == id {
			return recipient, true
		}
	}
	return stores.RecipientRecord{}, false
}

func (s AgreementReminderService) Pause(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.AgreementReminderStateRecord, error) {
	if s.reminders == nil || s.agreements == nil {
		return stores.AgreementReminderStateRecord{}, fmt.Errorf("agreement reminder service not configured")
	}
	agreement, recipient, err := s.resolveRecipient(ctx, scope, agreementID, recipientID)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	if _, err := s.lifecycle.ensureReminderState(ctx, scope, agreement, recipient); err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	return s.reminders.PauseAgreementReminder(ctx, scope, agreement.ID, recipient.ID, s.now().UTC())
}

func (s AgreementReminderService) Resume(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.AgreementReminderStateRecord, error) {
	if s.reminders == nil || s.agreements == nil {
		return stores.AgreementReminderStateRecord{}, fmt.Errorf("agreement reminder service not configured")
	}
	agreement, recipient, err := s.resolveRecipient(ctx, scope, agreementID, recipientID)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	state, err := s.lifecycle.ensureReminderState(ctx, scope, agreement, recipient)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	now := s.now().UTC()
	nextDue := now
	if state.NextDueAt != nil && state.NextDueAt.After(now) {
		nextDue = state.NextDueAt.UTC()
	}
	return s.reminders.ResumeAgreementReminder(ctx, scope, agreement.ID, recipient.ID, now, &nextDue)
}

func (s AgreementReminderService) SendNow(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (ResendResult, error) {
	if s.reminders == nil || s.agreements == nil {
		return ResendResult{}, fmt.Errorf("agreement reminder service not configured")
	}
	agreement, recipient, err := s.resolveRecipient(ctx, scope, agreementID, recipientID)
	if err != nil {
		return ResendResult{}, err
	}
	state, err := s.lifecycle.ensureReminderState(ctx, scope, agreement, recipient)
	if err != nil {
		return ResendResult{}, err
	}
	now := s.now().UTC()
	state.LastViewedAt = newerTimePtr(state.LastViewedAt, recipient.LastViewAt)
	state.LastEvaluatedAt = cloneServiceTimePtr(&now)
	state.UpdatedAt = now
	if _, err := s.reminders.UpsertAgreementReminderState(ctx, scope, state); err != nil {
		return ResendResult{}, err
	}
	policy := ReminderPolicyFromConfig(appcfg.Active())
	decision := reminders.Evaluate(now, policy, reminders.State{
		SentCount:          state.SentCount,
		FirstSentAt:        state.FirstSentAt,
		LastSentAt:         state.LastSentAt,
		LastViewedAt:       state.LastViewedAt,
		LastManualResendAt: state.LastManualResendAt,
		NextDueAt:          state.NextDueAt,
	})
	if !decision.Due {
		_, _ = s.reminders.MarkAgreementReminderSkipped(ctx, scope, agreement.ID, recipient.ID, decision.ReasonCode, now, decision.NextDueAt)
		return ResendResult{}, domainValidationError("reminders", "policy", "send_now blocked by reminder policy")
	}
	return s.lifecycle.Resend(ctx, scope, agreement.ID, ResendInput{
		RecipientID:           recipient.ID,
		RotateToken:           appcfg.Active().Reminders.RotateToken,
		InvalidateExisting:    appcfg.Active().Reminders.RotateToken,
		AllowOutOfOrderResend: appcfg.Active().Reminders.AllowOutOfOrder,
		IdempotencyKey:        fmt.Sprintf("reminder-send-now:%s:%s:%d", agreement.ID, recipient.ID, now.UnixNano()),
		Source:                ResendSourceAutoReminder,
	})
}

func (s AgreementReminderService) resolveRecipient(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.AgreementRecord, stores.RecipientRecord, error) {
	agreementID = strings.TrimSpace(agreementID)
	recipientID = strings.TrimSpace(recipientID)
	if agreementID == "" {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, domainValidationError("agreements", "id", "required")
	}
	if recipientID == "" {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, domainValidationError("recipients", "id", "required")
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, err
	}
	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, err
	}
	recipient, ok := recipientByID(recipients, recipientID)
	if !ok {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, domainValidationError("recipients", "id", "not found")
	}
	return agreement, recipient, nil
}
