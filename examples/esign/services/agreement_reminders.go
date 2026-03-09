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
	return reminders.Policy{
		Enabled:              cfg.Reminders.Enabled,
		InitialDelay:         time.Duration(cfg.Reminders.InitialDelayMinutes) * time.Minute,
		Interval:             time.Duration(cfg.Reminders.IntervalMinutes) * time.Minute,
		MaxCount:             cfg.Reminders.MaxReminders,
		JitterPercent:        cfg.Reminders.JitterPercent,
		RecentViewGrace:      time.Duration(cfg.Reminders.RecentViewGraceMinutes) * time.Minute,
		ManualResendCooldown: time.Duration(cfg.Reminders.ManualResendCooldownMinutes) * time.Minute,
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
	created, upsertErr := s.reminders.UpsertAgreementReminderState(ctx, scope, stores.AgreementReminderStateRecord{
		AgreementID:         agreementID,
		RecipientID:         recipientID,
		Status:              stores.AgreementReminderStatusActive,
		SentCount:           0,
		FirstSentAt:         firstSentAt,
		LastViewedAt:        cloneServiceTimePtr(recipient.LastViewAt),
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
		if state.FirstSentAt == nil {
			state.FirstSentAt = cloneServiceTimePtr(agreement.SentAt)
			if state.FirstSentAt == nil {
				state.FirstSentAt = cloneServiceTimePtr(&now)
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
) error {
	if s.reminders == nil {
		return nil
	}
	source = normalizeResendSource(source)
	now := s.now().UTC()
	state, err := s.ensureReminderState(ctx, scope, agreement, recipient)
	if err != nil {
		return err
	}
	state.LastViewedAt = newerTimePtr(state.LastViewedAt, recipient.LastViewAt)
	state.LastEvaluatedAt = cloneServiceTimePtr(&now)

	policy := ReminderPolicyFromConfig(appcfg.Active())
	if source == ResendSourceAutoReminder {
		nextDue := reminders.ComputeNextDue(now, policy, reminderStableKey(scope, agreement.ID, recipient.ID))
		if _, err := s.reminders.UpsertAgreementReminderState(ctx, scope, state); err != nil {
			return err
		}
		_, err := s.reminders.MarkAgreementReminderSent(
			ctx,
			scope,
			agreement.ID,
			recipient.ID,
			reminders.ReasonDue,
			now,
			&nextDue,
		)
		return err
	}

	state.LastManualResendAt = cloneServiceTimePtr(&now)
	state.LastReasonCode = "manual_resend"
	state.LastError = ""
	state.LastAttemptedSendAt = cloneServiceTimePtr(&now)
	state.LockedBy = ""
	state.LockUntil = nil
	if policy.ManualResendCooldown > 0 {
		nextDueAt := now.Add(policy.ManualResendCooldown).UTC()
		state.NextDueAt = cloneServiceTimePtr(&nextDueAt)
	}
	state.UpdatedAt = now
	_, err = s.reminders.UpsertAgreementReminderState(ctx, scope, state)
	return err
}
