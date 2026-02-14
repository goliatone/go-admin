package services

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

// AgreementService manages draft agreement lifecycle and recipient/field mutations.
type AgreementService struct {
	agreements   stores.AgreementStore
	documents    stores.DocumentStore
	tokens       AgreementTokenService
	audits       stores.AuditEventStore
	emails       AgreementEmailWorkflow
	tx           stores.TransactionManager
	customTokens bool
	customAudits bool
	now          func() time.Time
	sendByKey    map[string]stores.AgreementRecord
}

// AgreementServiceOption customizes AgreementService behavior.
type AgreementServiceOption func(*AgreementService)

// AgreementTokenService captures signing-token lifecycle operations used by agreement flows.
type AgreementTokenService interface {
	Issue(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.IssuedSigningToken, error)
	Rotate(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.IssuedSigningToken, error)
	Revoke(ctx context.Context, scope stores.Scope, agreementID, recipientID string) error
}

// AgreementNotificationType defines notification policy kinds emitted by agreement lifecycle transitions.
type AgreementNotificationType string

const (
	NotificationSigningInvitation AgreementNotificationType = "signing_invitation"
	NotificationSigningReminder   AgreementNotificationType = "signing_reminder"
	NotificationCompletionPackage AgreementNotificationType = "completion_delivery"
)

// AgreementNotification carries canonical email notification payload context.
type AgreementNotification struct {
	AgreementID   string
	RecipientID   string
	CorrelationID string
	Type          AgreementNotificationType
	Token         stores.IssuedSigningToken
}

// AgreementEmailWorkflow captures post-send and post-resend email dispatch behavior.
type AgreementEmailWorkflow interface {
	OnAgreementSent(ctx context.Context, scope stores.Scope, notification AgreementNotification) error
	OnAgreementResent(ctx context.Context, scope stores.Scope, notification AgreementNotification) error
}

// WithAgreementClock sets the service clock.
func WithAgreementClock(now func() time.Time) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// WithAgreementTokenService configures token lifecycle operations for send/resend/void flows.
func WithAgreementTokenService(tokens AgreementTokenService) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil || tokens == nil {
			return
		}
		s.tokens = tokens
		s.customTokens = true
	}
}

// WithAgreementAuditStore configures append-only audit event persistence.
func WithAgreementAuditStore(audits stores.AuditEventStore) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil || audits == nil {
			return
		}
		s.audits = audits
		s.customAudits = true
	}
}

// WithAgreementEmailWorkflow configures email dispatch for send/resend flows.
func WithAgreementEmailWorkflow(workflow AgreementEmailWorkflow) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil {
			return
		}
		s.emails = workflow
	}
}

// CreateDraftInput captures required agreement draft creation fields.
type CreateDraftInput struct {
	DocumentID             string
	Title                  string
	Message                string
	CreatedByUserID        string
	SourceType             string
	SourceGoogleFileID     string
	SourceGoogleDocURL     string
	SourceModifiedTime     *time.Time
	SourceExportedAt       *time.Time
	SourceExportedByUserID string
}

// ValidationIssue represents a pre-send validation failure.
type ValidationIssue struct {
	Code    string
	Field   string
	Message string
}

// AgreementValidationResult captures pre-send validation output.
type AgreementValidationResult struct {
	Valid          bool
	RecipientCount int
	FieldCount     int
	Issues         []ValidationIssue
}

func NewAgreementService(store stores.Store, opts ...AgreementServiceOption) AgreementService {
	svc := AgreementService{
		agreements: store,
		documents:  store,
		audits:     store,
		tokens:     stores.NewTokenService(store),
		tx:         store,
		now:        func() time.Time { return time.Now().UTC() },
		sendByKey:  map[string]stores.AgreementRecord{},
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	return svc
}

func (s AgreementService) forTx(tx stores.TxStore) AgreementService {
	txSvc := s
	txSvc.agreements = tx
	txSvc.documents = tx
	if !txSvc.customAudits {
		txSvc.audits = tx
	}
	if !txSvc.customTokens {
		txSvc.tokens = stores.NewTokenService(tx)
	}
	return txSvc
}

func (s AgreementService) withWriteTx(ctx context.Context, fn func(AgreementService) error) error {
	if fn == nil {
		return nil
	}
	if s.tx == nil {
		return fn(s)
	}
	return s.tx.WithTx(ctx, func(tx stores.TxStore) error {
		return fn(s.forTx(tx))
	})
}

// SendInput controls send transition behavior.
type SendInput struct {
	IdempotencyKey string
}

// VoidInput controls void transition behavior.
type VoidInput struct {
	Reason       string
	RevokeTokens bool
}

// ExpireInput controls expiry transition metadata.
type ExpireInput struct {
	Reason string
}

// ResendInput controls resend behavior and token lifecycle options.
type ResendInput struct {
	RecipientID           string
	RotateToken           bool
	InvalidateExisting    bool
	AllowOutOfOrderResend bool
	IdempotencyKey        string
}

// ResendResult returns resend decision context and newly issued token.
type ResendResult struct {
	Agreement       stores.AgreementRecord
	Recipient       stores.RecipientRecord
	ActiveRecipient stores.RecipientRecord
	Token           stores.IssuedSigningToken
}

// CreateDraft creates a draft agreement scoped to tenant/org.
func (s AgreementService) CreateDraft(ctx context.Context, scope stores.Scope, input CreateDraftInput) (stores.AgreementRecord, error) {
	if s.agreements == nil {
		return stores.AgreementRecord{}, domainValidationError("agreements", "store", "not configured")
	}
	documentID := strings.TrimSpace(input.DocumentID)
	if documentID == "" {
		return stores.AgreementRecord{}, domainValidationError("agreements", "document_id", "required")
	}
	if s.documents != nil {
		if _, err := s.documents.Get(ctx, scope, documentID); err != nil {
			return stores.AgreementRecord{}, err
		}
	}
	now := s.now()
	agreement, err := s.agreements.CreateDraft(ctx, scope, stores.AgreementRecord{
		DocumentID:             documentID,
		SourceType:             strings.TrimSpace(input.SourceType),
		SourceGoogleFileID:     strings.TrimSpace(input.SourceGoogleFileID),
		SourceGoogleDocURL:     strings.TrimSpace(input.SourceGoogleDocURL),
		SourceModifiedTime:     input.SourceModifiedTime,
		SourceExportedAt:       input.SourceExportedAt,
		SourceExportedByUserID: strings.TrimSpace(input.SourceExportedByUserID),
		Status:                 stores.AgreementStatusDraft,
		Title:                  strings.TrimSpace(input.Title),
		Message:                strings.TrimSpace(input.Message),
		CreatedByUserID:        strings.TrimSpace(input.CreatedByUserID),
		UpdatedByUserID:        strings.TrimSpace(input.CreatedByUserID),
		CreatedAt:              now,
		UpdatedAt:              now,
	})
	if err != nil {
		return stores.AgreementRecord{}, err
	}
	actorType := "system"
	actorID := strings.TrimSpace(input.CreatedByUserID)
	if actorID != "" {
		actorType = "user"
	}
	if err := s.appendAuditEvent(ctx, scope, agreement.ID, "agreement.created", actorType, actorID, map[string]any{
		"status": agreement.Status,
	}); err != nil {
		return stores.AgreementRecord{}, err
	}
	return agreement, nil
}

// UpdateDraft updates mutable draft fields.
func (s AgreementService) UpdateDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.AgreementDraftPatch, expectedVersion int64) (stores.AgreementRecord, error) {
	if s.agreements == nil {
		return stores.AgreementRecord{}, domainValidationError("agreements", "store", "not configured")
	}
	agreement, err := s.agreements.UpdateDraft(ctx, scope, agreementID, patch, expectedVersion)
	if err != nil {
		return stores.AgreementRecord{}, err
	}
	if err := s.appendAuditEvent(ctx, scope, agreement.ID, "agreement.updated", "system", "", map[string]any{
		"version": agreement.Version,
	}); err != nil {
		return stores.AgreementRecord{}, err
	}
	return agreement, nil
}

// UpsertRecipientDraft creates or updates a draft recipient and enforces v1 recipient constraints.
func (s AgreementService) UpsertRecipientDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.RecipientDraftPatch, expectedVersion int64) (stores.RecipientRecord, error) {
	if s.agreements == nil {
		return stores.RecipientRecord{}, domainValidationError("recipients", "store", "not configured")
	}

	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	if err := validateRecipientSet(simulateRecipientUpsert(recipients, patch)); err != nil {
		return stores.RecipientRecord{}, err
	}
	recipient, err := s.agreements.UpsertRecipientDraft(ctx, scope, agreementID, patch, expectedVersion)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	if err := s.appendAuditEvent(ctx, scope, agreementID, "agreement.recipient_upserted", "system", "", map[string]any{
		"recipient_id":  recipient.ID,
		"role":          recipient.Role,
		"signing_order": recipient.SigningOrder,
	}); err != nil {
		return stores.RecipientRecord{}, err
	}
	return recipient, nil
}

// RemoveRecipientDraft removes a draft recipient and enforces recipient constraints.
func (s AgreementService) RemoveRecipientDraft(ctx context.Context, scope stores.Scope, agreementID, recipientID string) error {
	if s.agreements == nil {
		return domainValidationError("recipients", "store", "not configured")
	}
	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return err
	}
	if err := validateRecipientSet(simulateRecipientDelete(recipients, recipientID)); err != nil {
		return err
	}
	if err := s.agreements.DeleteRecipientDraft(ctx, scope, agreementID, recipientID); err != nil {
		return err
	}
	return s.appendAuditEvent(ctx, scope, agreementID, "agreement.recipient_removed", "system", "", map[string]any{
		"recipient_id": strings.TrimSpace(recipientID),
	})
}

// UpsertFieldDraft creates or updates draft fields.
func (s AgreementService) UpsertFieldDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldDraftPatch) (stores.FieldRecord, error) {
	if s.agreements == nil {
		return stores.FieldRecord{}, domainValidationError("fields", "store", "not configured")
	}
	field, err := s.agreements.UpsertFieldDraft(ctx, scope, agreementID, patch)
	if err != nil {
		return stores.FieldRecord{}, err
	}
	if err := s.appendAuditEvent(ctx, scope, agreementID, "agreement.field_upserted", "system", "", map[string]any{
		"field_id":     field.ID,
		"field_type":   field.Type,
		"recipient_id": field.RecipientID,
	}); err != nil {
		return stores.FieldRecord{}, err
	}
	return field, nil
}

// DeleteFieldDraft deletes a draft field.
func (s AgreementService) DeleteFieldDraft(ctx context.Context, scope stores.Scope, agreementID, fieldID string) error {
	if s.agreements == nil {
		return domainValidationError("fields", "store", "not configured")
	}
	if err := s.agreements.DeleteFieldDraft(ctx, scope, agreementID, fieldID); err != nil {
		return err
	}
	return s.appendAuditEvent(ctx, scope, agreementID, "agreement.field_deleted", "system", "", map[string]any{
		"field_id": strings.TrimSpace(fieldID),
	})
}

// ValidateBeforeSend runs recipient/field checks before send transitions.
func (s AgreementService) ValidateBeforeSend(ctx context.Context, scope stores.Scope, agreementID string) (AgreementValidationResult, error) {
	if s.agreements == nil {
		return AgreementValidationResult{}, domainValidationError("agreements", "store", "not configured")
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return AgreementValidationResult{}, err
	}

	issues := make([]ValidationIssue, 0)
	if agreement.Status != stores.AgreementStatusDraft {
		issues = append(issues, ValidationIssue{
			Code:    string(ErrorCodeAgreementImmutable),
			Field:   "status",
			Message: "agreement must be in draft before send validation",
		})
	}

	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return AgreementValidationResult{}, err
	}
	fields, err := s.agreements.ListFields(ctx, scope, agreementID)
	if err != nil {
		return AgreementValidationResult{}, err
	}
	issues = append(issues, recipientValidationIssues(recipients)...)

	if len(fields) == 0 {
		issues = append(issues, ValidationIssue{
			Code:    string(ErrorCodeMissingRequiredFields),
			Field:   "fields",
			Message: "at least one field is required",
		})
	}

	signers := map[string]stores.RecipientRecord{}
	for _, rec := range recipients {
		if rec.Role == stores.RecipientRoleSigner {
			signers[rec.ID] = rec
		}
	}

	requiredSignatureBySigner := map[string]bool{}
	for _, field := range fields {
		if !isV1FieldType(field.Type) {
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "fields.field_type",
				Message: "unsupported field type",
			})
			continue
		}
		if field.Type == stores.FieldTypeDateSigned {
			if !field.Required {
				issues = append(issues, ValidationIssue{
					Code:    string(ErrorCodeInvalidSignerState),
					Field:   "fields.date_signed.required",
					Message: "date_signed fields must be required and system-managed",
				})
			}
			if strings.TrimSpace(field.RecipientID) == "" {
				issues = append(issues, ValidationIssue{
					Code:    string(ErrorCodeMissingRequiredFields),
					Field:   "fields.date_signed.recipient_id",
					Message: "date_signed fields must target a signer",
				})
			}
		}
		if field.Required && strings.TrimSpace(field.RecipientID) == "" {
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "fields.recipient_id",
				Message: "required fields must be assigned to a signer",
			})
			continue
		}
		if strings.TrimSpace(field.RecipientID) != "" {
			recipient, ok := signers[field.RecipientID]
			if !ok {
				issues = append(issues, ValidationIssue{
					Code:    string(ErrorCodeInvalidSignerState),
					Field:   "fields.recipient_id",
					Message: "field recipient must be a signer",
				})
				continue
			}
			if recipient.Role != stores.RecipientRoleSigner {
				issues = append(issues, ValidationIssue{
					Code:    string(ErrorCodeInvalidSignerState),
					Field:   "fields.recipient_id",
					Message: "field recipient must be a signer",
				})
			}
		}
		if field.Required && field.Type == stores.FieldTypeSignature && strings.TrimSpace(field.RecipientID) != "" {
			requiredSignatureBySigner[field.RecipientID] = true
		}
	}

	for signerID := range signers {
		if !requiredSignatureBySigner[signerID] {
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "fields.signature",
				Message: "each signer requires at least one required signature field",
			})
		}
	}

	return AgreementValidationResult{
		Valid:          len(issues) == 0,
		RecipientCount: len(recipients),
		FieldCount:     len(fields),
		Issues:         issues,
	}, nil
}

// ResolveFieldValueForSigner enforces system-managed field semantics for signer submissions.
func (s AgreementService) ResolveFieldValueForSigner(field stores.FieldRecord, proposedValue string, signedAt time.Time) (string, error) {
	if !isV1FieldType(field.Type) {
		return "", domainValidationError("fields", "field_type", "unsupported type")
	}
	if field.Type != stores.FieldTypeDateSigned {
		return strings.TrimSpace(proposedValue), nil
	}
	if signedAt.IsZero() {
		signedAt = s.now()
	}
	// Signers cannot edit date_signed directly; backend resolves to canonical UTC timestamp.
	return signedAt.UTC().Format(time.RFC3339), nil
}

// Send transitions a draft agreement to sent while honoring idempotency keys.
func (s AgreementService) Send(ctx context.Context, scope stores.Scope, agreementID string, input SendInput) (stores.AgreementRecord, error) {
	if s.agreements == nil {
		return stores.AgreementRecord{}, domainValidationError("agreements", "store", "not configured")
	}
	key := s.sendIdempotencyKey(scope, agreementID, input.IdempotencyKey)
	if key != "" {
		if cached, ok := s.sendByKey[key]; ok {
			return cached, nil
		}
	}
	var result stores.AgreementRecord
	cacheResult := false
	if err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		validation, err := txSvc.ValidateBeforeSend(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if !validation.Valid {
			first := validation.Issues[0]
			return domainValidationError("agreements", first.Field, first.Message)
		}

		agreement, err := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if agreement.Status != stores.AgreementStatusDraft {
			if agreement.Status == stores.AgreementStatusSent && key != "" {
				result = agreement
				cacheResult = true
				return nil
			}
			return domainValidationError("agreements", "status", "send requires draft status")
		}
		if txSvc.tokens == nil {
			return domainValidationError("signing_tokens", "service", "not configured")
		}
		recipients, err := txSvc.agreements.ListRecipients(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		activeSigner, ok := activeSignerForSequentialFlow(recipients)
		if !ok {
			return domainValidationError("recipients", "role", "no active signer recipient found")
		}
		issued, err := txSvc.tokens.Issue(ctx, scope, agreementID, activeSigner.ID)
		if err != nil {
			return err
		}

		transitioned, err := txSvc.agreements.Transition(ctx, scope, agreementID, stores.AgreementTransitionInput{
			ToStatus:        stores.AgreementStatusSent,
			ExpectedVersion: agreement.Version,
		})
		if err != nil {
			_ = txSvc.tokens.Revoke(ctx, scope, agreementID, activeSigner.ID)
			return err
		}
		result = transitioned
		cacheResult = key != ""

		if err := txSvc.appendAuditEvent(ctx, scope, transitioned.ID, "agreement.sent", "system", "", map[string]any{
			"idempotency_key": strings.TrimSpace(input.IdempotencyKey),
			"status":          transitioned.Status,
			"recipient_id":    activeSigner.ID,
			"token_id":        issued.Record.ID,
			"token_expires_at": func() string {
				if issued.Record.ExpiresAt.IsZero() {
					return ""
				}
				return issued.Record.ExpiresAt.UTC().Format(time.RFC3339)
			}(),
		}); err != nil {
			return err
		}
		if txSvc.emails != nil {
			if err := txSvc.emails.OnAgreementSent(ctx, scope, AgreementNotification{
				AgreementID:   transitioned.ID,
				RecipientID:   activeSigner.ID,
				CorrelationID: strings.TrimSpace(input.IdempotencyKey),
				Type:          NotificationSigningInvitation,
				Token:         issued,
			}); err != nil {
				_ = txSvc.appendAuditEvent(ctx, scope, transitioned.ID, "agreement.send_notification_failed", "system", "", map[string]any{
					"idempotency_key": strings.TrimSpace(input.IdempotencyKey),
					"recipient_id":    activeSigner.ID,
					"error":           strings.TrimSpace(err.Error()),
				})
			}
		}
		return nil
	}); err != nil {
		return stores.AgreementRecord{}, err
	}
	if cacheResult && key != "" {
		s.sendByKey[key] = result
	}
	return result, nil
}

// Void transitions sent/in-progress agreements to voided and revokes signer tokens when requested.
func (s AgreementService) Void(ctx context.Context, scope stores.Scope, agreementID string, input VoidInput) (stores.AgreementRecord, error) {
	if s.agreements == nil {
		return stores.AgreementRecord{}, domainValidationError("agreements", "store", "not configured")
	}
	var result stores.AgreementRecord
	if err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		agreement, err := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if agreement.Status != stores.AgreementStatusSent && agreement.Status != stores.AgreementStatusInProgress {
			return domainValidationError("agreements", "status", "void requires sent or in_progress status")
		}

		transitioned, err := txSvc.agreements.Transition(ctx, scope, agreementID, stores.AgreementTransitionInput{
			ToStatus:        stores.AgreementStatusVoided,
			ExpectedVersion: agreement.Version,
		})
		if err != nil {
			return err
		}
		result = transitioned
		if !input.RevokeTokens {
			return txSvc.appendAuditEvent(ctx, scope, transitioned.ID, "agreement.voided", "system", "", map[string]any{
				"reason":        strings.TrimSpace(input.Reason),
				"revoke_tokens": false,
			})
		}
		if txSvc.tokens == nil {
			return domainValidationError("signing_tokens", "service", "not configured")
		}

		recipients, err := txSvc.agreements.ListRecipients(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		for _, recipient := range recipients {
			if recipient.Role != stores.RecipientRoleSigner {
				continue
			}
			if err := txSvc.tokens.Revoke(ctx, scope, agreementID, recipient.ID); err != nil {
				return err
			}
		}
		return txSvc.appendAuditEvent(ctx, scope, transitioned.ID, "agreement.voided", "system", "", map[string]any{
			"reason":        strings.TrimSpace(input.Reason),
			"revoke_tokens": true,
		})
	}); err != nil {
		return stores.AgreementRecord{}, err
	}
	return result, nil
}

// Expire transitions sent/in-progress agreements to expired and invalidates signer tokens.
func (s AgreementService) Expire(ctx context.Context, scope stores.Scope, agreementID string, input ExpireInput) (stores.AgreementRecord, error) {
	if s.agreements == nil {
		return stores.AgreementRecord{}, domainValidationError("agreements", "store", "not configured")
	}
	if s.tokens == nil {
		return stores.AgreementRecord{}, domainValidationError("signing_tokens", "service", "not configured")
	}
	var result stores.AgreementRecord
	if err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		agreement, err := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if agreement.Status != stores.AgreementStatusSent && agreement.Status != stores.AgreementStatusInProgress {
			return domainValidationError("agreements", "status", "expiry requires sent or in_progress status")
		}

		transitioned, err := txSvc.agreements.Transition(ctx, scope, agreementID, stores.AgreementTransitionInput{
			ToStatus:        stores.AgreementStatusExpired,
			ExpectedVersion: agreement.Version,
		})
		if err != nil {
			return err
		}
		result = transitioned

		recipients, err := txSvc.agreements.ListRecipients(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		for _, recipient := range recipients {
			if recipient.Role != stores.RecipientRoleSigner {
				continue
			}
			if err := txSvc.tokens.Revoke(ctx, scope, agreementID, recipient.ID); err != nil {
				return err
			}
		}

		return txSvc.appendAuditEvent(ctx, scope, transitioned.ID, "agreement.expired", "system", "", map[string]any{
			"reason": strings.TrimSpace(input.Reason),
			"from":   agreement.Status,
			"to":     transitioned.Status,
		})
	}); err != nil {
		return stores.AgreementRecord{}, err
	}
	return result, nil
}

// Resend applies sequential-recipient guards and issues/rotates signer tokens.
func (s AgreementService) Resend(ctx context.Context, scope stores.Scope, agreementID string, input ResendInput) (ResendResult, error) {
	if s.agreements == nil {
		return ResendResult{}, domainValidationError("agreements", "store", "not configured")
	}
	if s.tokens == nil {
		return ResendResult{}, domainValidationError("signing_tokens", "service", "not configured")
	}
	var result ResendResult
	if err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		agreement, err := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if agreement.Status != stores.AgreementStatusSent && agreement.Status != stores.AgreementStatusInProgress {
			return domainValidationError("agreements", "status", "resend requires sent or in_progress status")
		}

		recipients, err := txSvc.agreements.ListRecipients(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		activeSigner, ok := activeSignerForSequentialFlow(recipients)
		if !ok {
			return domainValidationError("recipients", "role", "no active signer recipient found")
		}

		target := activeSigner
		requestedID := strings.TrimSpace(input.RecipientID)
		if requestedID != "" {
			var found *stores.RecipientRecord
			for i := range recipients {
				if recipients[i].ID == requestedID {
					found = &recipients[i]
					break
				}
			}
			if found == nil {
				return domainValidationError("recipients", "id", "recipient not found")
			}
			target = *found
		}

		if target.Role != stores.RecipientRoleSigner {
			return domainValidationError("recipients", "role", "resend target must be signer")
		}
		if target.ID != activeSigner.ID && !input.AllowOutOfOrderResend {
			return domainValidationError("recipients", "signing_order", "resend target is not the active sequential signer")
		}

		var issued stores.IssuedSigningToken
		if input.RotateToken || input.InvalidateExisting {
			issued, err = txSvc.tokens.Rotate(ctx, scope, agreementID, target.ID)
		} else {
			issued, err = txSvc.tokens.Issue(ctx, scope, agreementID, target.ID)
		}
		if err != nil {
			return err
		}
		if err := txSvc.appendAuditEvent(ctx, scope, agreement.ID, "agreement.resent", "system", "", map[string]any{
			"recipient_id":              target.ID,
			"active_recipient_id":       activeSigner.ID,
			"rotate_token":              input.RotateToken,
			"invalidate_existing":       input.InvalidateExisting,
			"allow_out_of_order_resend": input.AllowOutOfOrderResend,
			"token_id":                  issued.Record.ID,
		}); err != nil {
			return err
		}
		if txSvc.emails != nil {
			if err := txSvc.emails.OnAgreementResent(ctx, scope, AgreementNotification{
				AgreementID:   agreement.ID,
				RecipientID:   target.ID,
				CorrelationID: strings.TrimSpace(input.IdempotencyKey),
				Type:          NotificationSigningReminder,
				Token:         issued,
			}); err != nil {
				return err
			}
		}
		result = ResendResult{
			Agreement:       agreement,
			Recipient:       target,
			ActiveRecipient: activeSigner,
			Token:           issued,
		}
		return nil
	}); err != nil {
		return ResendResult{}, err
	}
	return result, nil
}

// CompletionDeliveryRecipients returns cc recipients eligible for final artifact delivery after completion.
func (s AgreementService) CompletionDeliveryRecipients(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.RecipientRecord, error) {
	if s.agreements == nil {
		return nil, domainValidationError("agreements", "store", "not configured")
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	if agreement.Status != stores.AgreementStatusCompleted {
		return []stores.RecipientRecord{}, nil
	}
	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	out := make([]stores.RecipientRecord, 0)
	for _, recipient := range recipients {
		if recipient.Role == stores.RecipientRoleCC {
			out = append(out, recipient)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].SigningOrder < out[j].SigningOrder
	})
	return out, nil
}

func simulateRecipientUpsert(current []stores.RecipientRecord, patch stores.RecipientDraftPatch) []stores.RecipientRecord {
	next := make([]stores.RecipientRecord, len(current))
	copy(next, current)

	recipientID := strings.TrimSpace(patch.ID)
	idx := -1
	for i, rec := range next {
		if strings.TrimSpace(rec.ID) == recipientID && recipientID != "" {
			idx = i
			break
		}
	}

	if idx == -1 {
		next = append(next, stores.RecipientRecord{ID: recipientID})
		idx = len(next) - 1
	}
	rec := next[idx]
	if patch.Email != nil {
		rec.Email = strings.TrimSpace(*patch.Email)
	}
	if patch.Name != nil {
		rec.Name = strings.TrimSpace(*patch.Name)
	}
	if patch.Role != nil {
		rec.Role = strings.TrimSpace(*patch.Role)
	}
	if patch.SigningOrder != nil {
		rec.SigningOrder = *patch.SigningOrder
	}
	if rec.Role == "" {
		rec.Role = stores.RecipientRoleSigner
	}
	if rec.SigningOrder <= 0 {
		rec.SigningOrder = 1
	}
	next[idx] = rec
	return next
}

func simulateRecipientDelete(current []stores.RecipientRecord, recipientID string) []stores.RecipientRecord {
	recipientID = strings.TrimSpace(recipientID)
	if recipientID == "" {
		return current
	}
	next := make([]stores.RecipientRecord, 0, len(current))
	for _, rec := range current {
		if strings.TrimSpace(rec.ID) == recipientID {
			continue
		}
		next = append(next, rec)
	}
	return next
}

func validateRecipientSet(recipients []stores.RecipientRecord) error {
	issues := recipientValidationIssues(recipients)
	if len(issues) == 0 {
		return nil
	}
	issue := issues[0]
	return domainValidationError("recipients", issue.Field, issue.Message)
}

func recipientValidationIssues(recipients []stores.RecipientRecord) []ValidationIssue {
	issues := make([]ValidationIssue, 0)
	if len(recipients) == 0 {
		return issues
	}
	if len(recipients) > 3 {
		issues = append(issues, ValidationIssue{
			Code:    string(ErrorCodeMissingRequiredFields),
			Field:   "count",
			Message: "must be between 1 and 3",
		})
		return issues
	}

	signerOrders := make([]int, 0, len(recipients))
	signerCount := 0
	ccCount := 0
	for _, rec := range recipients {
		role := strings.TrimSpace(rec.Role)
		email := strings.TrimSpace(rec.Email)
		if email == "" {
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "email",
				Message: "required",
			})
			return issues
		}
		switch role {
		case stores.RecipientRoleSigner:
			signerCount++
			signerOrders = append(signerOrders, rec.SigningOrder)
		case stores.RecipientRoleCC:
			ccCount++
		default:
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "role",
				Message: "must be signer or cc",
			})
			return issues
		}
	}
	if signerCount == 0 {
		issues = append(issues, ValidationIssue{
			Code:    string(ErrorCodeMissingRequiredFields),
			Field:   "role",
			Message: "at least one signer is required",
		})
		return issues
	}
	if ccCount > 1 {
		issues = append(issues, ValidationIssue{
			Code:    string(ErrorCodeMissingRequiredFields),
			Field:   "role",
			Message: "only one cc recipient is allowed in v1",
		})
		return issues
	}
	sort.Ints(signerOrders)
	for i, order := range signerOrders {
		expected := i + 1
		if order != expected {
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "signing_order",
				Message: "signer order must be sequential starting at 1",
			})
			return issues
		}
	}
	return issues
}

func (s AgreementService) sendIdempotencyKey(scope stores.Scope, agreementID, idempotencyKey string) string {
	if strings.TrimSpace(idempotencyKey) == "" {
		return ""
	}
	return strings.Join([]string{
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		strings.TrimSpace(agreementID),
		strings.TrimSpace(idempotencyKey),
	}, "|")
}

func activeSignerForSequentialFlow(recipients []stores.RecipientRecord) (stores.RecipientRecord, bool) {
	signers := make([]stores.RecipientRecord, 0)
	for _, rec := range recipients {
		if rec.Role == stores.RecipientRoleSigner {
			signers = append(signers, rec)
		}
	}
	if len(signers) == 0 {
		return stores.RecipientRecord{}, false
	}
	sort.Slice(signers, func(i, j int) bool {
		return signers[i].SigningOrder < signers[j].SigningOrder
	})
	for _, signer := range signers {
		if signer.CompletedAt == nil {
			return signer, true
		}
	}
	return stores.RecipientRecord{}, false
}

func isV1FieldType(fieldType string) bool {
	switch strings.TrimSpace(fieldType) {
	case stores.FieldTypeSignature,
		stores.FieldTypeName,
		stores.FieldTypeDateSigned,
		stores.FieldTypeText,
		stores.FieldTypeCheckbox,
		stores.FieldTypeInitials:
		return true
	default:
		return false
	}
}

func (s AgreementService) appendAuditEvent(ctx context.Context, scope stores.Scope, agreementID, eventType, actorType, actorID string, metadata map[string]any) error {
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
		ActorType:    strings.TrimSpace(actorType),
		ActorID:      strings.TrimSpace(actorID),
		MetadataJSON: string(encoded),
		CreatedAt:    s.now(),
	})
	return err
}
