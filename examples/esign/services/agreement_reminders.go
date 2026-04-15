package services

import (
	"context"
	"errors"
	"strings"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	reminders "github.com/goliatone/go-notifications/pkg/reminders"
)

const (
	ResendSourceManual       = "manual"
	ResendSourceAutoReminder = "auto_reminder"
)

func normalizeResendSource(source string) string {
	switch strings.ToLower(strings.TrimSpace(source)) {
	case ResendSourceAutoReminder:
		return ResendSourceAutoReminder
	default:
		return ResendSourceManual
	}
}

// ReminderPolicyFromConfig maps e-sign runtime reminder config to shared reminder primitives.
func ReminderPolicyFromConfig(cfg appcfg.Config) reminders.Policy {
	resolved := cfg.Reminders
	if resolution, err := appcfg.ResolveReminderPolicy(cfg.Reminders); err == nil {
		resolved = resolution.Config
	}
	return reminders.Policy{
		Enabled:              resolved.Enabled,
		InitialDelay:         time.Duration(resolved.InitialDelayMinutes) * time.Minute,
		Interval:             time.Duration(resolved.IntervalMinutes) * time.Minute,
		MaxCount:             resolved.MaxReminders,
		JitterPercent:        resolved.JitterPercent,
		RecentViewGrace:      time.Duration(resolved.RecentViewGraceMinutes) * time.Minute,
		ManualResendCooldown: time.Duration(resolved.ManualResendCooldownMinutes) * time.Minute,
	}
}

func reminderStableKey(scope stores.Scope, agreementID, recipientID string) string {
	return strings.Join([]string{
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		strings.TrimSpace(agreementID),
		strings.TrimSpace(recipientID),
	}, "|")
}

func cloneServiceTimePtr(in *time.Time) *time.Time {
	if in == nil || in.IsZero() {
		return nil
	}
	out := in.UTC()
	return &out
}

func newerTimePtr(a, b *time.Time) *time.Time {
	if a == nil || a.IsZero() {
		return cloneServiceTimePtr(b)
	}
	if b == nil || b.IsZero() {
		return cloneServiceTimePtr(a)
	}
	if b.After(*a) {
		return cloneServiceTimePtr(b)
	}
	return cloneServiceTimePtr(a)
}

func isNotFoundStoreError(err error) bool {
	if err == nil {
		return false
	}
	var coded *goerrors.Error
	if !errors.As(err, &coded) || coded == nil {
		return false
	}
	return coded.Category == goerrors.CategoryNotFound
}

func (s AgreementService) ensureReminderState(
	ctx context.Context,
	scope stores.Scope,
	agreement stores.AgreementRecord,
	recipient stores.RecipientRecord,
) (stores.AgreementReminderStateRecord, error) {
	if s.reminders == nil {
		return stores.AgreementReminderStateRecord{}, nil
	}
	if recipient.Role != stores.RecipientRoleSigner {
		return stores.AgreementReminderStateRecord{}, domainValidationError("recipients", "role", "reminders require signer recipient")
	}
	agreementID := strings.TrimSpace(agreement.ID)
	recipientID := strings.TrimSpace(recipient.ID)
	if agreementID == "" || recipientID == "" {
		return stores.AgreementReminderStateRecord{}, nil
	}
	state, err := s.reminders.GetAgreementReminderState(ctx, scope, agreementID, recipientID)
	if err == nil {
		return state, nil
	}
	if !isNotFoundStoreError(err) {
		return stores.AgreementReminderStateRecord{}, err
	}
	now := s.now().UTC()
	firstSentAt := cloneServiceTimePtr(agreement.SentAt)
	if firstSentAt == nil {
		firstSentAt = &now
	}
	policy := ReminderPolicyFromConfig(appcfg.Active())
	seedDueAt := firstSentAt.UTC().Add(reminders.NormalizePolicy(policy).InitialDelay).UTC()
	evaluated := reminders.Evaluate(now, policy, reminders.State{
		SentCount:   0,
		FirstSentAt: firstSentAt,
		LastViewedAt: cloneServiceTimePtr(
			recipient.LastViewAt,
		),
	})
	nextDueAt := cloneServiceTimePtr(evaluated.NextDueAt)
	if nextDueAt == nil {
		nextDueAt = cloneServiceTimePtr(&seedDueAt)
	}
	created, upsertErr := s.reminders.UpsertAgreementReminderState(ctx, scope, stores.AgreementReminderStateRecord{
		AgreementID:         agreementID,
		RecipientID:         recipientID,
		Status:              stores.AgreementReminderStatusActive,
		PolicyVersion:       appcfg.ReminderPolicyVersion,
		SentCount:           0,
		FirstSentAt:         firstSentAt,
		LastViewedAt:        cloneServiceTimePtr(recipient.LastViewAt),
		NextDueAt:           nextDueAt,
		CreatedAt:           now,
		UpdatedAt:           now,
		LastEvaluatedAt:     cloneServiceTimePtr(&now),
		LastAttemptedSendAt: nil,
	})
	if upsertErr != nil {
		return stores.AgreementReminderStateRecord{}, upsertErr
	}
	return created, nil
}

func (s AgreementService) initializeReminderStatesForSend(
	ctx context.Context,
	scope stores.Scope,
	agreement stores.AgreementRecord,
	recipients []stores.RecipientRecord,
) error {
	if s.reminders == nil {
		return nil
	}
	now := s.now().UTC()
	for _, recipient := range recipients {
		if recipient.Role != stores.RecipientRoleSigner {
			continue
		}
		state, err := s.ensureReminderState(ctx, scope, agreement, recipient)
		if err != nil {
			return err
		}
		if strings.TrimSpace(state.Status) == "" {
			state.Status = stores.AgreementReminderStatusActive
		}
		if strings.TrimSpace(state.PolicyVersion) == "" {
			state.PolicyVersion = appcfg.ReminderPolicyVersion
		}
		if state.FirstSentAt == nil {
			state.FirstSentAt = cloneServiceTimePtr(agreement.SentAt)
			if state.FirstSentAt == nil {
				state.FirstSentAt = cloneServiceTimePtr(&now)
			}
		}
		if state.NextDueAt == nil {
			policy := ReminderPolicyFromConfig(appcfg.Active())
			decision := reminders.Evaluate(now, policy, reminders.State{
				SentCount:          state.SentCount,
				FirstSentAt:        state.FirstSentAt,
				LastSentAt:         state.LastSentAt,
				LastViewedAt:       state.LastViewedAt,
				LastManualResendAt: state.LastManualResendAt,
				NextDueAt:          state.NextDueAt,
			})
			state.NextDueAt = cloneServiceTimePtr(decision.NextDueAt)
			if state.NextDueAt == nil {
				fallbackDue := state.FirstSentAt.UTC().Add(reminders.NormalizePolicy(policy).InitialDelay).UTC()
				state.NextDueAt = cloneServiceTimePtr(&fallbackDue)
			}
		}
		state.LastViewedAt = newerTimePtr(state.LastViewedAt, recipient.LastViewAt)
		state.UpdatedAt = now
		if _, err := s.reminders.UpsertAgreementReminderState(ctx, scope, state); err != nil {
			return err
		}
	}
	return nil
}

func (s AgreementService) recordReminderResendState(
	ctx context.Context,
	scope stores.Scope,
	agreement stores.AgreementRecord,
	recipient stores.RecipientRecord,
	source string,
	lease stores.AgreementReminderLeaseToken,
	leaseSeconds int,
) error {
	if s.reminders == nil {
		return nil
	}
	_ = lease
	_ = leaseSeconds
	source = normalizeResendSource(source)
	now := s.now().UTC()
	state, err := s.ensureReminderState(ctx, scope, agreement, recipient)
	if err != nil {
		return err
	}
	state.LastViewedAt = newerTimePtr(state.LastViewedAt, recipient.LastViewAt)
	state.LastEvaluatedAt = cloneServiceTimePtr(&now)
	if strings.TrimSpace(state.PolicyVersion) == "" {
		state.PolicyVersion = appcfg.ReminderPolicyVersion
	}

	policy := ReminderPolicyFromConfig(appcfg.Active())
	if source == ResendSourceAutoReminder {
		state.UpdatedAt = now
		_, err = s.reminders.UpsertAgreementReminderState(ctx, scope, state)
		return err
	}

	state.LastManualResendAt = cloneServiceTimePtr(&now)
	state.LastReasonCode = "manual_resend"
	state.LastErrorCode = ""
	state.LastErrorInternalEncrypted = ""
	state.LastErrorInternalExpiresAt = nil
	state.LastAttemptedSendAt = cloneServiceTimePtr(&now)
	state.WorkerID = ""
	state.SweepID = ""
	state.ClaimedAt = nil
	state.LastHeartbeatAt = nil
	if policy.ManualResendCooldown > 0 {
		nextDueAt := now.Add(policy.ManualResendCooldown).UTC()
		state.NextDueAt = cloneServiceTimePtr(&nextDueAt)
	}
	state.UpdatedAt = now
	_, err = s.reminders.UpsertAgreementReminderState(ctx, scope, state)
	return err
}
