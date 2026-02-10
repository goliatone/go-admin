package services

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	SignerSessionStateActive    = "active"
	SignerSessionStateWaiting   = "waiting"
	SignerSessionStateCompleted = "completed"
	SignerSessionStateTerminal  = "terminal"
	SignerSessionStateObserver  = "observer"
	SignerSessionStateInvalid   = "invalid"
)

// SigningService exposes signer-session and signing flow behavior.
type SigningService struct {
	agreements      stores.AgreementStore
	signing         stores.SigningStore
	artifacts       stores.SignatureArtifactStore
	audits          stores.AuditEventStore
	completionFlow  SigningCompletionWorkflow
	now             func() time.Time
	consentAccepted map[string]time.Time
	submitByKey     map[string]SignerSubmitResult
}

// SigningCompletionWorkflow handles post-submit completion workflows (artifacts/certificate/distribution).
type SigningCompletionWorkflow interface {
	RunCompletionWorkflow(ctx context.Context, scope stores.Scope, agreementID, correlationID string) error
}

// SigningServiceOption customizes SigningService.
type SigningServiceOption func(*SigningService)

// WithSigningClock overrides the service clock.
func WithSigningClock(now func() time.Time) SigningServiceOption {
	return func(s *SigningService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// WithSignatureArtifactStore overrides signature artifact persistence behavior.
func WithSignatureArtifactStore(store stores.SignatureArtifactStore) SigningServiceOption {
	return func(s *SigningService) {
		if s == nil {
			return
		}
		s.artifacts = store
	}
}

// WithSigningAuditStore configures signer audit event persistence.
func WithSigningAuditStore(store stores.AuditEventStore) SigningServiceOption {
	return func(s *SigningService) {
		if s == nil {
			return
		}
		s.audits = store
	}
}

// WithSigningCompletionWorkflow configures post-completion artifact/distribution workflow execution.
func WithSigningCompletionWorkflow(workflow SigningCompletionWorkflow) SigningServiceOption {
	return func(s *SigningService) {
		if s == nil {
			return
		}
		s.completionFlow = workflow
	}
}

func NewSigningService(agreements stores.AgreementStore, signing stores.SigningStore, opts ...SigningServiceOption) SigningService {
	svc := SigningService{
		agreements:      agreements,
		signing:         signing,
		now:             func() time.Time { return time.Now().UTC() },
		consentAccepted: map[string]time.Time{},
		submitByKey:     map[string]SignerSubmitResult{},
	}
	if artifacts, ok := signing.(stores.SignatureArtifactStore); ok {
		svc.artifacts = artifacts
	}
	if audits, ok := agreements.(stores.AuditEventStore); ok {
		svc.audits = audits
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	return svc
}

// SignerSessionField captures signer-visible field context and current value snapshot.
type SignerSessionField struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Page      int    `json:"page"`
	Required  bool   `json:"required"`
	ValueText string `json:"value_text,omitempty"`
	ValueBool *bool  `json:"value_bool,omitempty"`
}

// SignerSessionContext returns agreement and signer-scoped context for the signer API.
type SignerSessionContext struct {
	AgreementID         string               `json:"agreement_id"`
	AgreementStatus     string               `json:"agreement_status"`
	RecipientID         string               `json:"recipient_id"`
	RecipientRole       string               `json:"recipient_role"`
	RecipientEmail      string               `json:"recipient_email"`
	RecipientName       string               `json:"recipient_name"`
	RecipientOrder      int                  `json:"recipient_order"`
	State               string               `json:"state"`
	ActiveRecipientID   string               `json:"active_recipient_id,omitempty"`
	WaitingForRecipient string               `json:"waiting_for_recipient_id,omitempty"`
	Fields              []SignerSessionField `json:"fields"`
}

// SignerConsentInput captures signer consent payload.
type SignerConsentInput struct {
	Accepted  bool   `json:"accepted"`
	IPAddress string `json:"-"`
	UserAgent string `json:"-"`
}

// SignerConsentResult returns consent capture details.
type SignerConsentResult struct {
	AcceptedAt time.Time `json:"accepted_at"`
}

// SignerFieldValueInput captures signer field value upserts.
type SignerFieldValueInput struct {
	FieldID         string `json:"field_id"`
	ValueText       string `json:"value_text,omitempty"`
	ValueBool       *bool  `json:"value_bool,omitempty"`
	ExpectedVersion int64  `json:"expected_version,omitempty"`
	IPAddress       string `json:"-"`
	UserAgent       string `json:"-"`
}

// SignerSignatureInput captures create+attach signature artifact payload.
type SignerSignatureInput struct {
	FieldID         string `json:"field_id"`
	Type            string `json:"type"`
	ObjectKey       string `json:"object_key"`
	SHA256          string `json:"sha256"`
	ValueText       string `json:"value_text,omitempty"`
	ExpectedVersion int64  `json:"expected_version,omitempty"`
	IPAddress       string `json:"-"`
	UserAgent       string `json:"-"`
}

// SignerSignatureResult returns created artifact and attached field-value record.
type SignerSignatureResult struct {
	Artifact   stores.SignatureArtifactRecord `json:"artifact"`
	FieldValue stores.FieldValueRecord        `json:"field_value"`
}

// SignerSubmitInput captures submit/finalize request metadata.
type SignerSubmitInput struct {
	IdempotencyKey string `json:"idempotency_key"`
	IPAddress      string `json:"-"`
	UserAgent      string `json:"-"`
}

// SignerSubmitResult captures submit transition result data.
type SignerSubmitResult struct {
	Agreement       stores.AgreementRecord `json:"agreement"`
	Recipient       stores.RecipientRecord `json:"recipient"`
	NextRecipientID string                 `json:"next_recipient_id,omitempty"`
	Completed       bool                   `json:"completed"`
}

// SignerDeclineInput captures decline request metadata.
type SignerDeclineInput struct {
	Reason    string `json:"reason"`
	IPAddress string `json:"-"`
	UserAgent string `json:"-"`
}

// SignerDeclineResult captures decline transition results.
type SignerDeclineResult struct {
	Agreement stores.AgreementRecord `json:"agreement"`
	Recipient stores.RecipientRecord `json:"recipient"`
}

// GetSession returns signer-scoped agreement/field context with sequential waiting-state semantics.
func (s SigningService) GetSession(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord) (SignerSessionContext, error) {
	agreement, recipient, activeSigner, _, fields, err := s.signerContext(ctx, scope, token)
	if err != nil {
		return SignerSessionContext{}, err
	}
	updatedRecipient, err := s.agreements.TouchRecipientView(ctx, scope, agreement.ID, recipient.ID, s.now())
	if err != nil {
		return SignerSessionContext{}, err
	}
	recipient = updatedRecipient

	valuesByField := map[string]stores.FieldValueRecord{}
	if s.signing != nil {
		values, err := s.signing.ListFieldValuesByRecipient(ctx, scope, agreement.ID, recipient.ID)
		if err != nil {
			return SignerSessionContext{}, err
		}
		for _, value := range values {
			if strings.TrimSpace(value.FieldID) == "" {
				continue
			}
			valuesByField[value.FieldID] = value
		}
	}

	state := resolveSessionState(agreement.Status, recipient, activeSigner, strings.TrimSpace(activeSigner.ID) != "")
	waitingFor := ""
	if state == SignerSessionStateWaiting {
		waitingFor = activeSigner.ID
	}

	sessionFields := make([]SignerSessionField, 0)
	for _, field := range fields {
		fieldRecipientID := strings.TrimSpace(field.RecipientID)
		if fieldRecipientID != "" && fieldRecipientID != recipient.ID {
			continue
		}
		value := valuesByField[field.ID]
		sessionFields = append(sessionFields, SignerSessionField{
			ID:        field.ID,
			Type:      field.Type,
			Page:      field.PageNumber,
			Required:  field.Required,
			ValueText: strings.TrimSpace(value.ValueText),
			ValueBool: value.ValueBool,
		})
	}

	return SignerSessionContext{
		AgreementID:         agreement.ID,
		AgreementStatus:     agreement.Status,
		RecipientID:         recipient.ID,
		RecipientRole:       recipient.Role,
		RecipientEmail:      recipient.Email,
		RecipientName:       recipient.Name,
		RecipientOrder:      recipient.SigningOrder,
		State:               state,
		ActiveRecipientID:   activeSigner.ID,
		WaitingForRecipient: waitingFor,
		Fields:              sessionFields,
	}, nil
}

// CaptureConsent stores consent acceptance for the active signer in a sequential flow.
func (s SigningService) CaptureConsent(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input SignerConsentInput) (SignerConsentResult, error) {
	if !input.Accepted {
		return SignerConsentResult{}, domainValidationError("consent", "accepted", "must be true")
	}
	agreement, recipient, activeSigner, _, _, err := s.signerContext(ctx, scope, token)
	if err != nil {
		return SignerConsentResult{}, err
	}
	if agreement.Status != stores.AgreementStatusSent && agreement.Status != stores.AgreementStatusInProgress {
		return SignerConsentResult{}, domainValidationError("agreements", "status", "consent requires sent or in_progress status")
	}
	if err := ensureActiveSequentialSigner(recipient, activeSigner); err != nil {
		return SignerConsentResult{}, err
	}

	now := s.now()
	s.consentAccepted[signingFlowKey(scope, agreement.ID, recipient.ID)] = now
	if err := s.appendSignerAudit(ctx, scope, agreement.ID, recipient.ID, "signer.consent_captured", input.IPAddress, input.UserAgent, map[string]any{
		"consent_at": now.UTC().Format(time.RFC3339),
	}); err != nil {
		return SignerConsentResult{}, err
	}
	return SignerConsentResult{AcceptedAt: now}, nil
}

// UpsertFieldValue validates signer ownership and required-field semantics for field value writes.
func (s SigningService) UpsertFieldValue(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input SignerFieldValueInput) (stores.FieldValueRecord, error) {
	if s.signing == nil {
		return stores.FieldValueRecord{}, domainValidationError("field_values", "store", "not configured")
	}
	agreement, recipient, activeSigner, _, fields, err := s.signerContext(ctx, scope, token)
	if err != nil {
		return stores.FieldValueRecord{}, err
	}
	if err := ensureActiveSequentialSigner(recipient, activeSigner); err != nil {
		return stores.FieldValueRecord{}, err
	}
	fieldID := strings.TrimSpace(input.FieldID)
	if fieldID == "" {
		return stores.FieldValueRecord{}, domainValidationError("field_values", "field_id", "required")
	}
	field, ok := findFieldByID(fields, fieldID)
	if !ok {
		return stores.FieldValueRecord{}, domainValidationError("fields", "id", "not found")
	}
	if strings.TrimSpace(field.RecipientID) != strings.TrimSpace(recipient.ID) {
		return stores.FieldValueRecord{}, domainValidationError("fields", "recipient_id", "field does not belong to signer")
	}

	resolvedText := strings.TrimSpace(input.ValueText)
	if field.Type == stores.FieldTypeDateSigned {
		resolvedText = s.now().UTC().Format(time.RFC3339)
	}
	if err := validateFieldValueInput(field, resolvedText, input.ValueBool); err != nil {
		return stores.FieldValueRecord{}, err
	}

	record := stores.FieldValueRecord{
		AgreementID: agreement.ID,
		RecipientID: recipient.ID,
		FieldID:     field.ID,
		ValueText:   resolvedText,
		ValueBool:   input.ValueBool,
	}
	existing, hasExisting, err := s.findFieldValueByField(ctx, scope, agreement.ID, recipient.ID, field.ID)
	if err != nil {
		return stores.FieldValueRecord{}, err
	}
	if hasExisting {
		record.ID = existing.ID
		if input.ExpectedVersion == 0 {
			input.ExpectedVersion = existing.Version
		}
	}
	upserted, err := s.signing.UpsertFieldValue(ctx, scope, record, input.ExpectedVersion)
	if err != nil {
		return stores.FieldValueRecord{}, err
	}
	if err := s.appendSignerAudit(ctx, scope, agreement.ID, recipient.ID, "signer.field_value_upserted", input.IPAddress, input.UserAgent, map[string]any{
		"field_id": field.ID,
	}); err != nil {
		return stores.FieldValueRecord{}, err
	}
	return upserted, nil
}

// AttachSignatureArtifact creates a typed/drawn signature artifact and attaches it to a signature field value.
func (s SigningService) AttachSignatureArtifact(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input SignerSignatureInput) (SignerSignatureResult, error) {
	if s.signing == nil {
		return SignerSignatureResult{}, domainValidationError("field_values", "store", "not configured")
	}
	if s.artifacts == nil {
		return SignerSignatureResult{}, domainValidationError("signature_artifacts", "store", "not configured")
	}
	agreement, recipient, activeSigner, _, fields, err := s.signerContext(ctx, scope, token)
	if err != nil {
		return SignerSignatureResult{}, err
	}
	if err := ensureActiveSequentialSigner(recipient, activeSigner); err != nil {
		return SignerSignatureResult{}, err
	}
	fieldID := strings.TrimSpace(input.FieldID)
	if fieldID == "" {
		return SignerSignatureResult{}, domainValidationError("signature_artifacts", "field_id", "required")
	}
	field, ok := findFieldByID(fields, fieldID)
	if !ok {
		return SignerSignatureResult{}, domainValidationError("fields", "id", "not found")
	}
	if field.Type != stores.FieldTypeSignature {
		return SignerSignatureResult{}, domainValidationError("fields", "field_type", "signature attach requires signature field")
	}
	if strings.TrimSpace(field.RecipientID) != strings.TrimSpace(recipient.ID) {
		return SignerSignatureResult{}, domainValidationError("fields", "recipient_id", "field does not belong to signer")
	}

	signatureType := strings.TrimSpace(strings.ToLower(input.Type))
	if signatureType != "typed" && signatureType != "drawn" {
		return SignerSignatureResult{}, domainValidationError("signature_artifacts", "type", "must be typed or drawn")
	}
	artifact, err := s.artifacts.CreateSignatureArtifact(ctx, scope, stores.SignatureArtifactRecord{
		AgreementID: agreement.ID,
		RecipientID: recipient.ID,
		Type:        signatureType,
		ObjectKey:   strings.TrimSpace(input.ObjectKey),
		SHA256:      strings.TrimSpace(input.SHA256),
		CreatedAt:   s.now(),
	})
	if err != nil {
		return SignerSignatureResult{}, err
	}

	record := stores.FieldValueRecord{
		AgreementID:         agreement.ID,
		RecipientID:         recipient.ID,
		FieldID:             field.ID,
		ValueText:           strings.TrimSpace(input.ValueText),
		SignatureArtifactID: artifact.ID,
	}
	existing, hasExisting, err := s.findFieldValueByField(ctx, scope, agreement.ID, recipient.ID, field.ID)
	if err != nil {
		return SignerSignatureResult{}, err
	}
	if hasExisting {
		record.ID = existing.ID
		if input.ExpectedVersion == 0 {
			input.ExpectedVersion = existing.Version
		}
	}
	value, err := s.signing.UpsertFieldValue(ctx, scope, record, input.ExpectedVersion)
	if err != nil {
		return SignerSignatureResult{}, err
	}
	if err := s.appendSignerAudit(ctx, scope, agreement.ID, recipient.ID, "signer.signature_attached", input.IPAddress, input.UserAgent, map[string]any{
		"field_id":    field.ID,
		"artifact_id": artifact.ID,
		"type":        signatureType,
	}); err != nil {
		return SignerSignatureResult{}, err
	}
	return SignerSignatureResult{
		Artifact:   artifact,
		FieldValue: value,
	}, nil
}

// Submit finalizes signer participation with idempotency and CAS-protected transitions.
func (s SigningService) Submit(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input SignerSubmitInput) (SignerSubmitResult, error) {
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	if idempotencyKey == "" {
		return SignerSubmitResult{}, domainValidationError("submit", "idempotency_key", "required")
	}
	agreementID := strings.TrimSpace(token.AgreementID)
	recipientID := strings.TrimSpace(token.RecipientID)
	if agreementID == "" || recipientID == "" {
		return SignerSubmitResult{}, domainValidationError("signing_tokens", "agreement_id|recipient_id", "required")
	}
	submitKey := s.submitIdempotencyKey(scope, agreementID, recipientID, idempotencyKey)
	if cached, ok := s.submitByKey[submitKey]; ok {
		return cached, nil
	}

	agreement, recipient, activeSigner, recipients, fields, err := s.signerContext(ctx, scope, token)
	if err != nil {
		return SignerSubmitResult{}, err
	}
	if agreement.Status != stores.AgreementStatusSent && agreement.Status != stores.AgreementStatusInProgress {
		return SignerSubmitResult{}, domainValidationError("agreements", "status", "submit requires sent or in_progress status")
	}
	if err := ensureActiveSequentialSigner(recipient, activeSigner); err != nil {
		return SignerSubmitResult{}, err
	}

	if _, ok := s.consentAccepted[signingFlowKey(scope, agreement.ID, recipient.ID)]; !ok {
		return SignerSubmitResult{}, domainValidationError("consent", "accepted", "consent must be captured before submit")
	}
	if err := s.ensureRequiredFieldsCompleted(ctx, scope, agreement.ID, recipient.ID, fields); err != nil {
		return SignerSubmitResult{}, err
	}

	completedRecipient, err := s.agreements.CompleteRecipient(ctx, scope, agreement.ID, recipient.ID, s.now(), recipient.Version)
	if err != nil {
		return SignerSubmitResult{}, err
	}

	nextSignerID := nextSequentialSignerID(updateRecipientSnapshot(recipients, completedRecipient), completedRecipient.ID)
	resultAgreement := agreement
	expectedVersion := agreement.Version
	if nextSignerID == "" {
		if agreement.Status != stores.AgreementStatusCompleted {
			resultAgreement, err = s.agreements.Transition(ctx, scope, agreement.ID, stores.AgreementTransitionInput{
				ToStatus:        stores.AgreementStatusCompleted,
				ExpectedVersion: expectedVersion,
			})
			if err != nil {
				return SignerSubmitResult{}, err
			}
		}
	} else if agreement.Status == stores.AgreementStatusSent {
		resultAgreement, err = s.agreements.Transition(ctx, scope, agreement.ID, stores.AgreementTransitionInput{
			ToStatus:        stores.AgreementStatusInProgress,
			ExpectedVersion: expectedVersion,
		})
		if err != nil {
			return SignerSubmitResult{}, err
		}
	}

	result := SignerSubmitResult{
		Agreement:       resultAgreement,
		Recipient:       completedRecipient,
		NextRecipientID: nextSignerID,
		Completed:       nextSignerID == "",
	}
	if err := s.appendSignerAudit(ctx, scope, agreement.ID, recipient.ID, "signer.submitted", input.IPAddress, input.UserAgent, map[string]any{
		"agreement_status":    resultAgreement.Status,
		"next_recipient_id":   nextSignerID,
		"idempotency_key":     idempotencyKey,
		"agreement_completed": nextSignerID == "",
		"signer_identity_snapshot": map[string]any{
			"recipient_id":   completedRecipient.ID,
			"email":          completedRecipient.Email,
			"name":           completedRecipient.Name,
			"role":           completedRecipient.Role,
			"signing_order":  completedRecipient.SigningOrder,
			"first_view_at":  timePtrRFC3339(completedRecipient.FirstViewAt),
			"last_view_at":   timePtrRFC3339(completedRecipient.LastViewAt),
			"completed_at":   timePtrRFC3339(completedRecipient.CompletedAt),
			"declined_at":    timePtrRFC3339(completedRecipient.DeclinedAt),
			"decline_reason": completedRecipient.DeclineReason,
		},
	}); err != nil {
		return SignerSubmitResult{}, err
	}
	if result.Completed && s.completionFlow != nil {
		if err := s.completionFlow.RunCompletionWorkflow(ctx, scope, agreement.ID, idempotencyKey); err != nil {
			return SignerSubmitResult{}, err
		}
	}
	s.submitByKey[submitKey] = result
	return result, nil
}

// Decline records signer decline reason and transitions agreement to terminal declined state.
func (s SigningService) Decline(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input SignerDeclineInput) (SignerDeclineResult, error) {
	agreement, recipient, activeSigner, _, _, err := s.signerContext(ctx, scope, token)
	if err != nil {
		return SignerDeclineResult{}, err
	}
	if agreement.Status != stores.AgreementStatusSent && agreement.Status != stores.AgreementStatusInProgress {
		return SignerDeclineResult{}, domainValidationError("agreements", "status", "decline requires sent or in_progress status")
	}
	if err := ensureActiveSequentialSigner(recipient, activeSigner); err != nil {
		return SignerDeclineResult{}, err
	}
	reason := strings.TrimSpace(input.Reason)
	if reason == "" {
		return SignerDeclineResult{}, domainValidationError("recipients", "decline_reason", "required")
	}

	declinedRecipient, err := s.agreements.DeclineRecipient(ctx, scope, agreement.ID, recipient.ID, reason, s.now(), recipient.Version)
	if err != nil {
		return SignerDeclineResult{}, err
	}
	declinedAgreement, err := s.agreements.Transition(ctx, scope, agreement.ID, stores.AgreementTransitionInput{
		ToStatus:        stores.AgreementStatusDeclined,
		ExpectedVersion: agreement.Version,
	})
	if err != nil {
		return SignerDeclineResult{}, err
	}
	if err := s.appendSignerAudit(ctx, scope, agreement.ID, recipient.ID, "signer.declined", input.IPAddress, input.UserAgent, map[string]any{
		"decline_reason": reason,
	}); err != nil {
		return SignerDeclineResult{}, err
	}
	return SignerDeclineResult{
		Agreement: declinedAgreement,
		Recipient: declinedRecipient,
	}, nil
}

func resolveSessionState(agreementStatus string, recipient stores.RecipientRecord, activeSigner stores.RecipientRecord, hasActiveSigner bool) string {
	if recipient.CompletedAt != nil {
		return SignerSessionStateCompleted
	}
	if recipient.Role == stores.RecipientRoleCC {
		return SignerSessionStateObserver
	}
	switch strings.TrimSpace(agreementStatus) {
	case stores.AgreementStatusCompleted, stores.AgreementStatusVoided, stores.AgreementStatusDeclined, stores.AgreementStatusExpired:
		return SignerSessionStateTerminal
	case stores.AgreementStatusSent, stores.AgreementStatusInProgress:
		if !hasActiveSigner {
			return SignerSessionStateInvalid
		}
		if strings.TrimSpace(activeSigner.ID) != strings.TrimSpace(recipient.ID) {
			return SignerSessionStateWaiting
		}
		return SignerSessionStateActive
	default:
		return SignerSessionStateInvalid
	}
}

func validateFieldValueInput(field stores.FieldRecord, valueText string, valueBool *bool) error {
	valueText = strings.TrimSpace(valueText)
	switch field.Type {
	case stores.FieldTypeSignature:
		return domainValidationError("field_values", "field_type", "signature value requires signature artifact attach flow")
	case stores.FieldTypeCheckbox:
		if field.Required && valueBool == nil {
			return domainValidationError("field_values", "value_bool", "required")
		}
		return nil
	default:
		if field.Required && valueText == "" {
			return domainValidationError("field_values", "value_text", "required")
		}
		return nil
	}
}

func findRecipientByID(recipients []stores.RecipientRecord, recipientID string) (stores.RecipientRecord, bool) {
	recipientID = strings.TrimSpace(recipientID)
	for _, rec := range recipients {
		if strings.TrimSpace(rec.ID) == recipientID {
			return rec, true
		}
	}
	return stores.RecipientRecord{}, false
}

func findFieldByID(fields []stores.FieldRecord, fieldID string) (stores.FieldRecord, bool) {
	fieldID = strings.TrimSpace(fieldID)
	for _, field := range fields {
		if strings.TrimSpace(field.ID) == fieldID {
			return field, true
		}
	}
	return stores.FieldRecord{}, false
}

func currentSequentialSigner(recipients []stores.RecipientRecord) (stores.RecipientRecord, bool) {
	signers := make([]stores.RecipientRecord, 0)
	for _, rec := range recipients {
		if rec.Role != stores.RecipientRoleSigner {
			continue
		}
		signers = append(signers, rec)
	}
	if len(signers) == 0 {
		return stores.RecipientRecord{}, false
	}
	sort.Slice(signers, func(i, j int) bool {
		return signers[i].SigningOrder < signers[j].SigningOrder
	})
	for _, signer := range signers {
		if signer.CompletedAt == nil && signer.DeclinedAt == nil {
			return signer, true
		}
	}
	return stores.RecipientRecord{}, false
}

func ensureActiveSequentialSigner(recipient, activeSigner stores.RecipientRecord) error {
	if strings.TrimSpace(recipient.ID) == "" {
		return domainValidationError("recipients", "id", "required")
	}
	if recipient.Role != stores.RecipientRoleSigner {
		return domainValidationError("recipients", "role", "must be signer")
	}
	if strings.TrimSpace(activeSigner.ID) == "" {
		return domainValidationError("recipients", "signing_order", "no active sequential signer")
	}
	if strings.TrimSpace(recipient.ID) != strings.TrimSpace(activeSigner.ID) {
		return domainValidationError("recipients", "signing_order", "signer is waiting for a previous signer")
	}
	return nil
}

func (s SigningService) signerContext(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord) (stores.AgreementRecord, stores.RecipientRecord, stores.RecipientRecord, []stores.RecipientRecord, []stores.FieldRecord, error) {
	if s.agreements == nil {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, stores.RecipientRecord{}, nil, nil, domainValidationError("signing", "agreement_store", "not configured")
	}
	agreementID := strings.TrimSpace(token.AgreementID)
	recipientID := strings.TrimSpace(token.RecipientID)
	if agreementID == "" || recipientID == "" {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, stores.RecipientRecord{}, nil, nil, domainValidationError("signing_tokens", "agreement_id|recipient_id", "required")
	}

	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, stores.RecipientRecord{}, nil, nil, err
	}
	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, stores.RecipientRecord{}, nil, nil, err
	}
	fields, err := s.agreements.ListFields(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, stores.RecipientRecord{}, nil, nil, err
	}
	recipient, ok := findRecipientByID(recipients, recipientID)
	if !ok {
		return stores.AgreementRecord{}, stores.RecipientRecord{}, stores.RecipientRecord{}, nil, nil, domainValidationError("recipients", "id", "not found for token")
	}
	activeSigner, _ := currentSequentialSigner(recipients)
	return agreement, recipient, activeSigner, recipients, fields, nil
}

func (s SigningService) findFieldValueByField(ctx context.Context, scope stores.Scope, agreementID, recipientID, fieldID string) (stores.FieldValueRecord, bool, error) {
	values, err := s.signing.ListFieldValuesByRecipient(ctx, scope, agreementID, recipientID)
	if err != nil {
		return stores.FieldValueRecord{}, false, err
	}
	for _, value := range values {
		if strings.TrimSpace(value.FieldID) == strings.TrimSpace(fieldID) {
			return value, true, nil
		}
	}
	return stores.FieldValueRecord{}, false, nil
}

func signingFlowKey(scope stores.Scope, agreementID, recipientID string) string {
	return strings.Join([]string{
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		strings.TrimSpace(agreementID),
		strings.TrimSpace(recipientID),
	}, "|")
}

func (s SigningService) submitIdempotencyKey(scope stores.Scope, agreementID, recipientID, idempotencyKey string) string {
	return strings.Join([]string{
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		strings.TrimSpace(agreementID),
		strings.TrimSpace(recipientID),
		strings.TrimSpace(idempotencyKey),
	}, "|")
}

func (s SigningService) ensureRequiredFieldsCompleted(ctx context.Context, scope stores.Scope, agreementID, recipientID string, fields []stores.FieldRecord) error {
	values, err := s.signing.ListFieldValuesByRecipient(ctx, scope, agreementID, recipientID)
	if err != nil {
		return err
	}
	valuesByField := map[string]stores.FieldValueRecord{}
	for _, value := range values {
		valuesByField[strings.TrimSpace(value.FieldID)] = value
	}

	for _, field := range fields {
		if strings.TrimSpace(field.RecipientID) != strings.TrimSpace(recipientID) {
			continue
		}
		if !field.Required {
			continue
		}
		value, ok := valuesByField[strings.TrimSpace(field.ID)]
		if field.Type == stores.FieldTypeDateSigned && !ok {
			stamped := s.now().UTC().Format(time.RFC3339)
			upserted, err := s.signing.UpsertFieldValue(ctx, scope, stores.FieldValueRecord{
				AgreementID: agreementID,
				RecipientID: recipientID,
				FieldID:     field.ID,
				ValueText:   stamped,
			}, 0)
			if err != nil {
				return err
			}
			valuesByField[field.ID] = upserted
			continue
		}
		if !ok || !requiredFieldValueSatisfied(field, value) {
			return domainValidationError("field_values", "required", "all required fields must be completed before submit")
		}
	}
	return nil
}

func requiredFieldValueSatisfied(field stores.FieldRecord, value stores.FieldValueRecord) bool {
	switch field.Type {
	case stores.FieldTypeSignature:
		return strings.TrimSpace(value.SignatureArtifactID) != ""
	case stores.FieldTypeCheckbox:
		return value.ValueBool != nil
	default:
		return strings.TrimSpace(value.ValueText) != ""
	}
}

func updateRecipientSnapshot(recipients []stores.RecipientRecord, updated stores.RecipientRecord) []stores.RecipientRecord {
	next := make([]stores.RecipientRecord, len(recipients))
	copy(next, recipients)
	for i := range next {
		if strings.TrimSpace(next[i].ID) == strings.TrimSpace(updated.ID) {
			next[i] = updated
			break
		}
	}
	return next
}

func nextSequentialSignerID(recipients []stores.RecipientRecord, completedRecipientID string) string {
	signers := make([]stores.RecipientRecord, 0)
	for _, rec := range recipients {
		if rec.Role != stores.RecipientRoleSigner {
			continue
		}
		signers = append(signers, rec)
	}
	sort.Slice(signers, func(i, j int) bool {
		return signers[i].SigningOrder < signers[j].SigningOrder
	})
	for _, signer := range signers {
		if strings.TrimSpace(signer.ID) == strings.TrimSpace(completedRecipientID) {
			continue
		}
		if signer.CompletedAt == nil && signer.DeclinedAt == nil {
			return signer.ID
		}
	}
	return ""
}

func timePtrRFC3339(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func (s SigningService) appendSignerAudit(ctx context.Context, scope stores.Scope, agreementID, recipientID, eventType, ipAddress, userAgent string, metadata map[string]any) error {
	if s.audits == nil {
		return nil
	}
	meta := metadata
	if meta == nil {
		meta = map[string]any{}
	}
	encoded, err := json.Marshal(meta)
	if err != nil {
		return err
	}
	_, err = s.audits.Append(ctx, scope, stores.AuditEventRecord{
		AgreementID:  strings.TrimSpace(agreementID),
		EventType:    strings.TrimSpace(eventType),
		ActorType:    "signer_token",
		ActorID:      strings.TrimSpace(recipientID),
		IPAddress:    strings.TrimSpace(ipAddress),
		UserAgent:    strings.TrimSpace(userAgent),
		MetadataJSON: string(encoded),
		CreatedAt:    s.now(),
	})
	return err
}
