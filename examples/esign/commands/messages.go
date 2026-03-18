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

type AgreementRevisionRequestInput struct {
	Scope          stores.Scope
	AgreementID    string
	ActorID        string
	IdempotencyKey string
	CorrelationID  string
}

func (m AgreementRevisionRequestInput) validateRequired() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	return nil
}

type AgreementRequestCorrectionInput struct {
	AgreementRevisionRequestInput
}

func (AgreementRequestCorrectionInput) Type() string {
	return CommandAgreementRequestCorrection
}

func (m AgreementRequestCorrectionInput) Validate() error {
	return m.validateRequired()
}

type AgreementRequestAmendmentInput struct {
	AgreementRevisionRequestInput
}

func (AgreementRequestAmendmentInput) Type() string {
	return CommandAgreementRequestAmendment
}

func (m AgreementRequestAmendmentInput) Validate() error {
	return m.validateRequired()
}

type AgreementReviewInput struct {
	Scope              stores.Scope
	AgreementID        string
	ReviewParticipants []services.ReviewParticipantInput
	ReviewerIDs        []string
	Gate               string
	CommentsEnabled    bool
	ActorID            string
	CorrelationID      string
}

func (m AgreementReviewInput) validateRequired() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	return nil
}

type AgreementRequestReviewInput struct {
	AgreementReviewInput
}

func (AgreementRequestReviewInput) Type() string {
	return CommandAgreementRequestReview
}

func (m AgreementRequestReviewInput) Validate() error {
	return m.validateRequired()
}

type AgreementReopenReviewInput struct {
	AgreementReviewInput
}

func (AgreementReopenReviewInput) Type() string {
	return CommandAgreementReopenReview
}

func (m AgreementReopenReviewInput) Validate() error {
	return m.validateRequired()
}

type AgreementNotifyReviewersInput struct {
	Scope         stores.Scope
	AgreementID   string
	ParticipantID string
	RecipientID   string
	ActorID       string
	CorrelationID string
}

func (AgreementNotifyReviewersInput) Type() string {
	return CommandAgreementNotifyReviewers
}

func (m AgreementNotifyReviewersInput) Validate() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	return nil
}

type AgreementReviewReminderControlInput struct {
	Scope         stores.Scope
	AgreementID   string
	ParticipantID string
	RecipientID   string
	ActorID       string
	CorrelationID string
}

func (m AgreementReviewReminderControlInput) validateRequired() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	if strings.TrimSpace(m.ParticipantID) == "" && strings.TrimSpace(m.RecipientID) == "" {
		return fmt.Errorf("participant_id or recipient_id required")
	}
	return nil
}

type AgreementReviewReminderPauseInput struct {
	AgreementReviewReminderControlInput
}

func (AgreementReviewReminderPauseInput) Type() string {
	return CommandAgreementReviewReminderPause
}

func (m AgreementReviewReminderPauseInput) Validate() error {
	return m.validateRequired()
}

type AgreementReviewReminderResumeInput struct {
	AgreementReviewReminderControlInput
}

func (AgreementReviewReminderResumeInput) Type() string {
	return CommandAgreementReviewReminderResume
}

func (m AgreementReviewReminderResumeInput) Validate() error {
	return m.validateRequired()
}

type AgreementReviewReminderSendNowInput struct {
	AgreementReviewReminderControlInput
}

func (AgreementReviewReminderSendNowInput) Type() string {
	return CommandAgreementReviewReminderSendNow
}

func (m AgreementReviewReminderSendNowInput) Validate() error {
	return m.validateRequired()
}

type AgreementCloseReviewInput struct {
	Scope         stores.Scope
	AgreementID   string
	ActorID       string
	CorrelationID string
}

func (AgreementCloseReviewInput) Type() string {
	return CommandAgreementCloseReview
}

func (m AgreementCloseReviewInput) Validate() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	return nil
}

type AgreementReviewDecisionCommandInput struct {
	Scope         stores.Scope
	AgreementID   string
	ParticipantID string
	RecipientID   string
	Comment       string
	ActorID       string
	CorrelationID string
}

func (m AgreementReviewDecisionCommandInput) validateRequired() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	if strings.TrimSpace(m.ParticipantID) == "" && strings.TrimSpace(m.RecipientID) == "" {
		return fmt.Errorf("participant_id or recipient_id required")
	}
	return nil
}

type AgreementApproveReviewInput struct {
	AgreementReviewDecisionCommandInput
}

func (AgreementApproveReviewInput) Type() string {
	return CommandAgreementApproveReview
}

func (m AgreementApproveReviewInput) Validate() error {
	return m.validateRequired()
}

type AgreementRequestReviewChangesInput struct {
	AgreementReviewDecisionCommandInput
}

func (AgreementRequestReviewChangesInput) Type() string {
	return CommandAgreementRequestReviewChanges
}

func (m AgreementRequestReviewChangesInput) Validate() error {
	if err := m.validateRequired(); err != nil {
		return err
	}
	if strings.TrimSpace(m.Comment) == "" {
		return fmt.Errorf("comment required")
	}
	return nil
}

type AgreementCommentThreadInput struct {
	Scope         stores.Scope
	AgreementID   string
	ReviewID      string
	Visibility    string
	AnchorType    string
	PageNumber    int
	FieldID       string
	AnchorX       float64
	AnchorY       float64
	Body          string
	ActorID       string
	CorrelationID string
}

func (m AgreementCommentThreadInput) validateRequired() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	if strings.TrimSpace(m.Body) == "" {
		return fmt.Errorf("body required")
	}
	return nil
}

type AgreementCreateCommentThreadInput struct {
	AgreementCommentThreadInput
}

func (AgreementCreateCommentThreadInput) Type() string {
	return CommandAgreementCreateCommentThread
}

func (m AgreementCreateCommentThreadInput) Validate() error {
	return m.validateRequired()
}

type AgreementReplyCommentThreadInput struct {
	Scope         stores.Scope
	AgreementID   string
	ThreadID      string
	Body          string
	ActorID       string
	CorrelationID string
}

func (AgreementReplyCommentThreadInput) Type() string {
	return CommandAgreementReplyCommentThread
}

func (m AgreementReplyCommentThreadInput) Validate() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	if strings.TrimSpace(m.ThreadID) == "" {
		return fmt.Errorf("thread_id required")
	}
	if strings.TrimSpace(m.Body) == "" {
		return fmt.Errorf("body required")
	}
	return nil
}

type AgreementCommentThreadStateInput struct {
	Scope         stores.Scope
	AgreementID   string
	ThreadID      string
	ActorID       string
	CorrelationID string
}

func (m AgreementCommentThreadStateInput) validateRequired() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	if strings.TrimSpace(m.ThreadID) == "" {
		return fmt.Errorf("thread_id required")
	}
	return nil
}

type AgreementResolveCommentThreadInput struct {
	AgreementCommentThreadStateInput
}

func (AgreementResolveCommentThreadInput) Type() string {
	return CommandAgreementResolveCommentThread
}

func (m AgreementResolveCommentThreadInput) Validate() error {
	return m.validateRequired()
}

type AgreementReopenCommentThreadInput struct {
	AgreementCommentThreadStateInput
}

func (AgreementReopenCommentThreadInput) Type() string {
	return CommandAgreementReopenCommentThread
}

func (m AgreementReopenCommentThreadInput) Validate() error {
	return m.validateRequired()
}

type AgreementDeliveryResumeInput struct {
	Scope         stores.Scope
	AgreementID   string
	ActorID       string
	CorrelationID string
}

func (AgreementDeliveryResumeInput) Type() string {
	return CommandAgreementDeliveryResume
}

func (m AgreementDeliveryResumeInput) Validate() error {
	if strings.TrimSpace(m.AgreementID) == "" {
		return fmt.Errorf("agreement_id required")
	}
	return nil
}

type GuardedEffectResumeInput struct {
	Scope         stores.Scope
	EffectID      string
	ActorID       string
	CorrelationID string
}

func (GuardedEffectResumeInput) Type() string {
	return CommandGuardedEffectResume
}

func (m GuardedEffectResumeInput) Validate() error {
	if strings.TrimSpace(m.EffectID) == "" {
		return fmt.Errorf("effect_id required")
	}
	return nil
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

// PDFRemediationInput captures payload for document remediation command dispatch.
type PDFRemediationInput struct {
	Scope            stores.Scope   `json:"scope"`
	DocumentID       string         `json:"document_id"`
	AgreementID      string         `json:"agreement_id,omitempty"`
	ActorID          string         `json:"actor_id,omitempty"`
	Force            bool           `json:"force,omitempty"`
	CorrelationID    string         `json:"correlation_id,omitempty"`
	CommandID        string         `json:"command_id,omitempty"`
	DispatchID       string         `json:"dispatch_id,omitempty"`
	ExecutionMode    string         `json:"execution_mode,omitempty"`
	RequestedAt      string         `json:"requested_at,omitempty"`
	DispatchMetadata map[string]any `json:"_dispatch_metadata,omitempty"`
}

func (PDFRemediationInput) Type() string {
	return CommandPDFRemediate
}

func (m PDFRemediationInput) Validate() error {
	if strings.TrimSpace(m.DocumentID) == "" {
		return fmt.Errorf("document_id required")
	}
	return nil
}

func (m PDFRemediationInput) resolvedCommandID() string {
	commandID := strings.TrimSpace(m.CommandID)
	if commandID == "" {
		commandID = strings.TrimSpace(toString(m.DispatchMetadata["command_id"]))
	}
	if commandID == "" {
		commandID = CommandPDFRemediate
	}
	return commandID
}

func (m PDFRemediationInput) resolvedDispatchID() string {
	dispatchID := strings.TrimSpace(m.DispatchID)
	if dispatchID == "" {
		dispatchID = strings.TrimSpace(toString(m.DispatchMetadata["dispatch_id"]))
	}
	return dispatchID
}

func (m PDFRemediationInput) resolvedExecutionMode() string {
	mode := strings.TrimSpace(strings.ToLower(m.ExecutionMode))
	if mode == "" {
		mode = strings.TrimSpace(strings.ToLower(toString(m.DispatchMetadata["execution_mode"])))
	}
	if mode == "" {
		mode = "inline"
	}
	return mode
}

func (m PDFRemediationInput) resolvedCorrelationID() string {
	correlationID := strings.TrimSpace(m.CorrelationID)
	if correlationID == "" {
		correlationID = strings.TrimSpace(toString(m.DispatchMetadata["correlation_id"]))
	}
	return correlationID
}

func (m PDFRemediationInput) requestedAtTime(now time.Time) *time.Time {
	raw := strings.TrimSpace(m.RequestedAt)
	if raw == "" {
		return &now
	}
	parsed, err := time.Parse(time.RFC3339Nano, raw)
	if err != nil {
		return &now
	}
	parsed = parsed.UTC()
	return &parsed
}

func (m PDFRemediationInput) Request(now time.Time) services.PDFRemediationRequest {
	return services.PDFRemediationRequest{
		DocumentID:    strings.TrimSpace(m.DocumentID),
		AgreementID:   strings.TrimSpace(m.AgreementID),
		ActorID:       strings.TrimSpace(m.ActorID),
		CommandID:     m.resolvedCommandID(),
		DispatchID:    m.resolvedDispatchID(),
		CorrelationID: m.resolvedCorrelationID(),
		ExecutionMode: m.resolvedExecutionMode(),
		RequestedAt:   m.requestedAtTime(now.UTC()),
		Force:         m.Force,
	}
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
