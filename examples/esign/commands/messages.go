package commands

import (
	"fmt"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

// AgreementSendInput captures payload for send transitions dispatched from panel actions.
type AgreementSendInput struct {
	Scope          stores.Scope
	AgreementID    string
	IdempotencyKey string
	CorrelationID  string
}

func (AgreementSendInput) Type() string {
	return CommandAgreementSend
}

func (m AgreementSendInput) Validate() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	return nil
}

func (m AgreementSendInput) SendInput() services.SendInput {
	return services.SendInput{IdempotencyKey: strings.TrimSpace(m.IdempotencyKey)}
}

// AgreementVoidInput captures payload for void transitions dispatched from panel actions.
type AgreementVoidInput struct {
	Scope         stores.Scope
	AgreementID   string
	Reason        string
	RevokeTokens  bool
	CorrelationID string
}

func (AgreementVoidInput) Type() string {
	return CommandAgreementVoid
}

func (m AgreementVoidInput) Validate() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	return nil
}

func (m AgreementVoidInput) VoidInput() services.VoidInput {
	return services.VoidInput{
		Reason:       strings.TrimSpace(m.Reason),
		RevokeTokens: m.RevokeTokens,
	}
}

// AgreementResendInput captures payload for resend transitions dispatched from panel actions.
type AgreementResendInput struct {
	Scope              stores.Scope
	AgreementID        string
	RecipientID        string
	RotateToken        bool
	InvalidateExisting bool
	AllowOutOfOrder    bool
	IdempotencyKey     string
	CorrelationID      string
}

func (AgreementResendInput) Type() string {
	return CommandAgreementResend
}

func (m AgreementResendInput) Validate() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	return nil
}

func (m AgreementResendInput) ResendInput() services.ResendInput {
	return services.ResendInput{
		RecipientID:           strings.TrimSpace(m.RecipientID),
		RotateToken:           m.RotateToken,
		InvalidateExisting:    m.InvalidateExisting,
		AllowOutOfOrderResend: m.AllowOutOfOrder,
		IdempotencyKey:        strings.TrimSpace(m.IdempotencyKey),
		Source:                services.ResendSourceManual,
	}
}

// TokenRotateInput captures payload for explicit token-rotation actions.
type TokenRotateInput struct {
	Scope         stores.Scope
	AgreementID   string
	RecipientID   string
	CorrelationID string
}

func (TokenRotateInput) Type() string {
	return CommandTokenRotate
}

func (m TokenRotateInput) Validate() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	if strings.TrimSpace(m.RecipientID) == "" {
		return fmt.Errorf("recipient_id required")
	}
	return nil
}

// AgreementReminderSweepInput captures payload for periodic reminder sweeps.
type AgreementReminderSweepInput struct {
	Scope         stores.Scope
	CorrelationID string
}

func (AgreementReminderSweepInput) Type() string {
	return CommandAgreementReminderSweep
}

func (m AgreementReminderSweepInput) Validate() error {
	_ = m
	return nil
}

// AgreementReminderCleanupInput captures payload for periodic internal reminder error cleanup.
type AgreementReminderCleanupInput struct {
	Scope         stores.Scope
	Before        string
	Limit         int
	CorrelationID string
}

func (AgreementReminderCleanupInput) Type() string {
	return CommandAgreementReminderCleanup
}

func (m AgreementReminderCleanupInput) Validate() error {
	if m.Limit < 0 {
		return fmt.Errorf("limit must be non-negative")
	}
	return nil
}

func (m AgreementReminderCleanupInput) BeforeTime(now time.Time) time.Time {
	before := strings.TrimSpace(m.Before)
	if before == "" {
		return now.UTC()
	}
	parsed, err := time.Parse(time.RFC3339Nano, before)
	if err != nil {
		return now.UTC()
	}
	return parsed.UTC()
}

// AgreementReminderControlInput captures pause/resume/send-now reminder actions.
type AgreementReminderControlInput struct {
	Scope         stores.Scope
	AgreementID   string
	RecipientID   string
	CorrelationID string
}

func (m AgreementReminderControlInput) validateRequired() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	if strings.TrimSpace(m.RecipientID) == "" {
		return fmt.Errorf("recipient_id required")
	}
	return nil
}

// AgreementReminderPauseInput pauses reminder processing for one recipient.
type AgreementReminderPauseInput struct {
	AgreementReminderControlInput
}

func (AgreementReminderPauseInput) Type() string {
	return CommandAgreementReminderPause
}

func (m AgreementReminderPauseInput) Validate() error {
	return m.validateRequired()
}

// AgreementReminderResumeInput resumes reminder processing for one recipient.
type AgreementReminderResumeInput struct {
	AgreementReminderControlInput
}

func (AgreementReminderResumeInput) Type() string {
	return CommandAgreementReminderResume
}

func (m AgreementReminderResumeInput) Validate() error {
	return m.validateRequired()
}

// AgreementReminderSendNowInput attempts immediate policy-safe reminder send.
type AgreementReminderSendNowInput struct {
	AgreementReminderControlInput
}

func (AgreementReminderSendNowInput) Type() string {
	return CommandAgreementReminderSendNow
}

func (m AgreementReminderSendNowInput) Validate() error {
	return m.validateRequired()
}

// DraftCleanupInput captures payload for scheduled/manual draft expiry cleanup.
type DraftCleanupInput struct {
	Scope         stores.Scope
	Before        string
	CorrelationID string
}

func (DraftCleanupInput) Type() string {
	return CommandDraftCleanup
}

func (m DraftCleanupInput) Validate() error {
	return nil
}

func (m DraftCleanupInput) BeforeTime(now time.Time) time.Time {
	before := strings.TrimSpace(m.Before)
	if before == "" {
		return now.UTC()
	}
	parsed, err := time.Parse(time.RFC3339Nano, before)
	if err != nil {
		return now.UTC()
	}
	return parsed.UTC()
}
