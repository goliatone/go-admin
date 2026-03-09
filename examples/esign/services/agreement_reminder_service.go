package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	reminders "github.com/goliatone/go-notifications/pkg/reminders"
)

const reminderInternalErrorTTL = 30 * 24 * time.Hour

// AgreementReminderSweepResult summarizes one reminder sweep execution.
type AgreementReminderSweepResult struct {
	Claimed                 int
	Sent                    int
	Skipped                 int
	Failed                  int
	LeaseLost               int
	LeaseConflict           int
	StateInvariantViolation int
	PolicyBlock             int
	SkipReasons             map[string]int
}

// AgreementReminderService coordinates due reminder claims and resend dispatch.
type AgreementReminderService struct {
	agreements stores.AgreementStore
	reminders  stores.AgreementReminderStore
	lifecycle  AgreementService
	now        func() time.Time
	workerID   string
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

// WithAgreementReminderClaimer is a compatibility alias for worker id.
func WithAgreementReminderClaimer(claimer string) AgreementReminderServiceOption {
	return WithAgreementReminderWorkerID(claimer)
}

// WithAgreementReminderWorkerID sets the reminder sweep worker id used for lease fencing.
func WithAgreementReminderWorkerID(workerID string) AgreementReminderServiceOption {
	return func(s *AgreementReminderService) {
		if s == nil {
			return
		}
		s.workerID = strings.TrimSpace(workerID)
	}
}

func NewAgreementReminderService(store stores.Store, lifecycle AgreementService, opts ...AgreementReminderServiceOption) AgreementReminderService {
	svc := AgreementReminderService{
		agreements: store,
		reminders:  store,
		lifecycle:  lifecycle,
		now:        func() time.Time { return time.Now().UTC() },
		workerID:   "agreement-reminder-sweep",
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&svc)
		}
	}
	return svc
}

func reminderErrorTextCode(err error) string {
	if err == nil {
		return ""
	}
	var coded *goerrors.Error
	if !errors.As(err, &coded) || coded == nil {
		return ""
	}
	return strings.TrimSpace(strings.ToUpper(coded.TextCode))
}

func classifyReminderMutationErr(err error) (outcome, reason string, handled bool) {
	switch reminderErrorTextCode(err) {
	case "REMINDER_LEASE_LOST":
		return "skipped", "lease_lost", true
	case "REMINDER_LEASE_CONFLICT":
		return "skipped", "lease_conflict", true
	case "REMINDER_STATE_INVARIANT_VIOLATION":
		return "failed", "state_invariant_violation", true
	default:
		return "", "", false
	}
}

func reminderHeartbeatInterval(leaseSeconds int) time.Duration {
	if leaseSeconds <= 0 {
		leaseSeconds = 120
	}
	interval := (time.Duration(leaseSeconds) * time.Second) / 3
	if interval <= 0 {
		interval = time.Second
	}
	maxInterval := 30 * time.Second
	if interval > maxInterval {
		interval = maxInterval
	}
	return interval
}

func (s AgreementReminderService) encryptReminderFailure(ctx context.Context, failure string, now time.Time) (string, *time.Time, error) {
	failure = strings.TrimSpace(failure)
	if failure == "" {
		return "", nil, nil
	}
	key := strings.TrimSpace(appcfg.Active().Services.EncryptionKey)
	if key == "" {
		key = "go-admin-esign-services-app-key"
	}
	cipher := NewAESGCMCredentialCipher([]byte(key))
	encrypted, err := cipher.Encrypt(ctx, failure)
	if err != nil {
		return "", nil, err
	}
	expiresAt := now.Add(reminderInternalErrorTTL).UTC()
	return encrypted, &expiresAt, nil
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
	workerID := strings.TrimSpace(s.workerID)
	if workerID == "" {
		workerID = "agreement-reminder-sweep"
	}
	sweepID := fmt.Sprintf("%s:%d", workerID, now.UnixNano())
	claims, err := s.reminders.ClaimDueAgreementReminders(ctx, scope, stores.AgreementReminderClaimInput{
		Now:          now,
		Limit:        cfg.BatchSize,
		LeaseSeconds: cfg.ClaimLeaseSeconds,
		WorkerID:     workerID,
		SweepID:      sweepID,
	})
	if err != nil {
		return out, err
	}
	out.Claimed = len(claims)
	policy := ReminderPolicyFromConfig(appcfg.Active())
	for _, claim := range claims {
		outcome, reason, processErr := s.processClaimedReminder(ctx, scope, claim, policy, cfg.ClaimLeaseSeconds)
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
			if reason == "lease_lost" {
				out.LeaseLost++
			}
			if reason == "lease_conflict" {
				out.LeaseConflict++
			}
			if reason == "policy_block" {
				out.PolicyBlock++
			}
		case "failed":
			out.Failed++
			if reason == "state_invariant_violation" {
				out.StateInvariantViolation++
			}
		}
	}
	return out, nil
}

func (s AgreementReminderService) CleanupInternalErrors(ctx context.Context, scope stores.Scope, now time.Time, limit int) (int, error) {
	if s.reminders == nil {
		return 0, fmt.Errorf("agreement reminder service not configured")
	}
	if now.IsZero() {
		now = s.now().UTC()
	}
	if limit <= 0 {
		limit = 1000
	}
	return s.reminders.CleanupAgreementReminderInternalErrors(ctx, scope, now.UTC(), limit)
}

func (s AgreementReminderService) processClaimedReminder(
	ctx context.Context,
	scope stores.Scope,
	claim stores.AgreementReminderClaim,
	policy reminders.Policy,
	leaseSeconds int,
) (string, string, error) {
	state := claim.State
	stableKey := reminderStableKey(scope, state.AgreementID, state.RecipientID)
	if leaseSeconds <= 0 {
		leaseSeconds = appcfg.Active().Reminders.ClaimLeaseSeconds
	}
	if leaseSeconds <= 0 {
		leaseSeconds = 120
	}
	leaseToken := claim.Lease
	var leaseMu sync.Mutex
	getLease := func() stores.AgreementReminderLeaseToken {
		leaseMu.Lock()
		defer leaseMu.Unlock()
		return leaseToken
	}
	setLease := func(next stores.AgreementReminderLeaseToken) {
		leaseMu.Lock()
		defer leaseMu.Unlock()
		leaseToken = next
	}

	handleMutationErr := func(err error) (string, string, error) {
		if err == nil {
			return "", "", nil
		}
		if outcome, reason, handled := classifyReminderMutationErr(err); handled {
			return outcome, reason, nil
		}
		return "failed", "", err
	}

	markSkip := func(reason string, due *time.Time, terminalReason string) (string, string, error) {
		markAt := s.now().UTC()
		_, err := s.reminders.MarkAgreementReminderSkipped(ctx, scope, state.AgreementID, state.RecipientID, stores.AgreementReminderMarkInput{
			ReasonCode:     reason,
			OccurredAt:     markAt,
			NextDueAt:      due,
			LeaseSeconds:   leaseSeconds,
			Lease:          getLease(),
			TerminalReason: terminalReason,
		})
		if err != nil {
			return handleMutationErr(err)
		}
		return "skipped", reason, nil
	}
	computeNextDue := func(at time.Time) *time.Time {
		next := reminders.ComputeNextDue(at, policy, stableKey)
		return &next
	}
	markFail := func(reason, failure string) (string, string, error) {
		markAt := s.now().UTC()
		nextDue := reminders.ComputeNextDue(markAt, policy, stableKey)
		encryptedFailure, expiresAt, encryptErr := s.encryptReminderFailure(ctx, failure, markAt)
		if encryptErr != nil {
			encryptedFailure = ""
			expiresAt = nil
		}
		_, err := s.reminders.MarkAgreementReminderFailed(ctx, scope, state.AgreementID, state.RecipientID, stores.AgreementReminderMarkInput{
			ReasonCode:             reason,
			Failure:                failure,
			OccurredAt:             markAt,
			NextDueAt:              &nextDue,
			LeaseSeconds:           leaseSeconds,
			Lease:                  getLease(),
			ErrorInternalEncrypted: encryptedFailure,
			ErrorInternalExpiresAt: expiresAt,
		})
		if err != nil {
			return handleMutationErr(err)
		}
		return "failed", reason, nil
	}

	agreement, err := s.agreements.GetAgreement(ctx, scope, state.AgreementID)
	if err != nil {
		return markFail("agreement_lookup_failed", err.Error())
	}
	switch strings.TrimSpace(agreement.Status) {
	case stores.AgreementStatusSent, stores.AgreementStatusInProgress:
	case stores.AgreementStatusCompleted, stores.AgreementStatusVoided, stores.AgreementStatusDeclined, stores.AgreementStatusExpired:
		_, pauseErr := s.reminders.PauseAgreementReminder(ctx, scope, state.AgreementID, state.RecipientID, s.now().UTC())
		if pauseErr != nil {
			return "failed", "pause_failed", pauseErr
		}
		return "skipped", "agreement_terminal", nil
	default:
		return markSkip("agreement_not_active", computeNextDue(s.now().UTC()), "")
	}

	recipients, err := s.agreements.ListRecipients(ctx, scope, state.AgreementID)
	if err != nil {
		return markFail("recipient_lookup_failed", err.Error())
	}
	activeStage, activeSigners, ok := activeSignerStage(recipients)
	if !ok {
		return markSkip("no_active_signer", computeNextDue(s.now().UTC()), "")
	}
	target, found := recipientByID(recipients, state.RecipientID)
	if !found {
		return markFail("recipient_not_found", "recipient not found")
	}
	if target.Role != stores.RecipientRoleSigner {
		return markSkip("recipient_not_signer", computeNextDue(s.now().UTC()), "")
	}
	if target.CompletedAt != nil || target.DeclinedAt != nil {
		_, pauseErr := s.reminders.PauseAgreementReminder(ctx, scope, state.AgreementID, state.RecipientID, s.now().UTC())
		if pauseErr != nil {
			return "failed", "pause_failed", pauseErr
		}
		return "skipped", "recipient_terminal", nil
	}
	if !containsRecipientID(recipientIDs(activeSigners), target.ID) && !appcfg.Active().Reminders.AllowOutOfOrder {
		_ = activeStage
		return markSkip("recipient_not_in_active_stage", computeNextDue(s.now().UTC()), "")
	}

	updatedState := state
	updatedState.LastViewedAt = newerTimePtr(updatedState.LastViewedAt, target.LastViewAt)
	now := s.now().UTC()
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
		if reason == stores.AgreementReminderTerminalReasonMaxCountReached {
			return markSkip(reason, nil, stores.AgreementReminderTerminalReasonMaxCountReached)
		}
		if decision.NextDueAt == nil {
			return markSkip(reason, computeNextDue(s.now().UTC()), "")
		}
		return markSkip(reason, decision.NextDueAt, "")
	}

	renewed, renewErr := s.reminders.RenewAgreementReminderLease(ctx, scope, state.AgreementID, state.RecipientID, stores.AgreementReminderLeaseRenewInput{
		Now:          s.now().UTC(),
		LeaseSeconds: leaseSeconds,
		Lease:        getLease(),
	})
	if renewErr != nil {
		return handleMutationErr(renewErr)
	}
	setLease(renewed.Lease)

	heartbeatCtx, heartbeatCancel := context.WithCancel(ctx)
	heartbeatErrCh := make(chan error, 1)
	heartbeatDone := make(chan struct{})
	heartbeatInterval := reminderHeartbeatInterval(leaseSeconds)
	go func() {
		defer close(heartbeatDone)
		ticker := time.NewTicker(heartbeatInterval)
		defer ticker.Stop()
		for {
			select {
			case <-heartbeatCtx.Done():
				return
			case <-ticker.C:
				renewed, err := s.reminders.RenewAgreementReminderLease(ctx, scope, state.AgreementID, state.RecipientID, stores.AgreementReminderLeaseRenewInput{
					Now:          s.now().UTC(),
					LeaseSeconds: leaseSeconds,
					Lease:        getLease(),
				})
				if err != nil {
					select {
					case heartbeatErrCh <- err:
					default:
					}
					heartbeatCancel()
					return
				}
				setLease(renewed.Lease)
			}
		}
	}()

	_, resendErr := s.lifecycle.Resend(heartbeatCtx, scope, agreement.ID, ResendInput{
		RecipientID:           target.ID,
		RotateToken:           appcfg.Active().Reminders.RotateToken,
		InvalidateExisting:    appcfg.Active().Reminders.RotateToken,
		AllowOutOfOrderResend: appcfg.Active().Reminders.AllowOutOfOrder,
		IdempotencyKey:        fmt.Sprintf("reminder:%s:%s:%s:%d", agreement.ID, target.ID, claim.Lease.SweepID, claim.Lease.LeaseSeq),
		Source:                ResendSourceAutoReminder,
		ReminderLease:         getLease(),
		ReminderLeaseSeconds:  leaseSeconds,
	})
	heartbeatCancel()
	<-heartbeatDone
	select {
	case heartbeatErr := <-heartbeatErrCh:
		if resendErr == nil {
			return handleMutationErr(heartbeatErr)
		}
	default:
	}
	if resendErr != nil {
		return markFail("resend_failed", resendErr.Error())
	}

	markAt := s.now().UTC()
	nextDue := reminders.ComputeNextDue(markAt, policy, stableKey)
	_, err = s.reminders.MarkAgreementReminderSent(ctx, scope, state.AgreementID, state.RecipientID, stores.AgreementReminderMarkInput{
		ReasonCode:   reminders.ReasonDue,
		OccurredAt:   markAt,
		NextDueAt:    &nextDue,
		LeaseSeconds: leaseSeconds,
		Lease:        getLease(),
	})
	if err != nil {
		return handleMutationErr(err)
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
		state.LastReasonCode = strings.TrimSpace(decision.ReasonCode)
		state.LastEvaluatedAt = cloneServiceTimePtr(&now)
		if state.Status == stores.AgreementReminderStatusActive && decision.NextDueAt != nil {
			state.NextDueAt = cloneServiceTimePtr(decision.NextDueAt)
		}
		state.UpdatedAt = now
		_, _ = s.reminders.UpsertAgreementReminderState(ctx, scope, state)
		return ResendResult{}, domainValidationError("reminders", "policy", "send_now blocked by reminder policy")
	}
	return s.lifecycle.Resend(ctx, scope, agreement.ID, ResendInput{
		RecipientID:           recipient.ID,
		RotateToken:           appcfg.Active().Reminders.RotateToken,
		InvalidateExisting:    appcfg.Active().Reminders.RotateToken,
		AllowOutOfOrderResend: appcfg.Active().Reminders.AllowOutOfOrder,
		IdempotencyKey:        fmt.Sprintf("reminder-send-now:%s:%s:%d", agreement.ID, recipient.ID, now.UnixNano()),
		Source:                ResendSourceManual,
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
	if recipient.Role != stores.RecipientRoleSigner {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, domainValidationError("recipients", "role", "reminders require signer recipient")
	}
	return agreement, recipient, nil
}
