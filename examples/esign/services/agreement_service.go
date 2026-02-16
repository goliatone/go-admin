package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

// AgreementService manages draft agreement lifecycle and recipient/field mutations.
type AgreementService struct {
	agreements            stores.AgreementStore
	documents             stores.DocumentStore
	placementRuns         stores.PlacementRunStore
	tokens                AgreementTokenService
	audits                stores.AuditEventStore
	emails                AgreementEmailWorkflow
	placementOrchestrator AgreementPlacementOrchestrator
	placementPolicy       AgreementPlacementPolicyResolver
	placementObjectStore  PlacementDocumentObjectStore
	tx                    stores.TransactionManager
	customTokens          bool
	customAudits          bool
	customPlacementRuns   bool
	now                   func() time.Time
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
	SourceMimeType         string
	SourceIngestionMode    string
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
		agreements:    store,
		documents:     store,
		placementRuns: store,
		audits:        store,
		tokens:        stores.NewTokenService(store),
		tx:            store,
		now:           func() time.Time { return time.Now().UTC() },
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	svc.initPlacementDefaults()
	return svc
}

func (s AgreementService) forTx(tx stores.TxStore) AgreementService {
	txSvc := s
	txSvc.agreements = tx
	txSvc.documents = tx
	if !txSvc.customPlacementRuns {
		txSvc.placementRuns = tx
	}
	if !txSvc.customAudits {
		txSvc.audits = tx
	}
	if !txSvc.customTokens {
		txSvc.tokens = stores.NewTokenService(tx)
	} else {
		switch typed := txSvc.tokens.(type) {
		case stores.TokenService:
			txSvc.tokens = typed.ForTx(tx)
		case *stores.TokenService:
			txSvc.tokens = typed.ForTx(tx)
		case interface {
			ForTx(tx stores.TxStore) AgreementTokenService
		}:
			txSvc.tokens = typed.ForTx(tx)
		}
	}
	txSvc.tx = nil
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

func (s AgreementService) withWriteTxHooks(ctx context.Context, fn func(AgreementService, *stores.TxHooks) error) error {
	if fn == nil {
		return nil
	}
	return stores.WithTxHooks(ctx, s.tx, func(tx stores.TxStore, hooks *stores.TxHooks) error {
		if tx == nil {
			return fn(s, hooks)
		}
		return fn(s.forTx(tx), hooks)
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
		SourceMimeType:         strings.TrimSpace(input.SourceMimeType),
		SourceIngestionMode:    strings.TrimSpace(input.SourceIngestionMode),
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

	participants, err := s.agreements.ListParticipants(ctx, scope, agreementID)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	participantPatch := participantPatchFromRecipientPatch(patch)
	if err := validateParticipantSet(simulateParticipantUpsert(participants, participantPatch)); err != nil {
		return stores.RecipientRecord{}, err
	}
	participant, err := s.agreements.UpsertParticipantDraft(ctx, scope, agreementID, participantPatch, expectedVersion)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	if err := s.appendAuditEvent(ctx, scope, agreementID, "agreement.recipient_upserted", "system", "", map[string]any{
		"participant_id": participant.ID,
		"recipient_id":   participant.ID,
		"role":           participant.Role,
		"signing_stage":  participant.SigningStage,
	}); err != nil {
		return stores.RecipientRecord{}, err
	}
	return recipientFromParticipant(participant), nil
}

// RemoveRecipientDraft removes a draft recipient and enforces recipient constraints.
func (s AgreementService) RemoveRecipientDraft(ctx context.Context, scope stores.Scope, agreementID, recipientID string) error {
	if s.agreements == nil {
		return domainValidationError("recipients", "store", "not configured")
	}
	participants, err := s.agreements.ListParticipants(ctx, scope, agreementID)
	if err != nil {
		return err
	}
	if err := validateParticipantSet(simulateParticipantDelete(participants, recipientID)); err != nil {
		return err
	}
	if err := s.agreements.DeleteParticipantDraft(ctx, scope, agreementID, recipientID); err != nil {
		return err
	}
	return s.appendAuditEvent(ctx, scope, agreementID, "agreement.recipient_removed", "system", "", map[string]any{
		"participant_id": strings.TrimSpace(recipientID),
		"recipient_id":   strings.TrimSpace(recipientID),
	})
}

// ListParticipants returns canonical v2 participants for a draft agreement.
func (s AgreementService) ListParticipants(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.ParticipantRecord, error) {
	if s.agreements == nil {
		return nil, domainValidationError("participants", "store", "not configured")
	}
	return s.agreements.ListParticipants(ctx, scope, agreementID)
}

// UpsertParticipantDraft creates or updates a v2 participant record.
func (s AgreementService) UpsertParticipantDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.ParticipantDraftPatch, expectedVersion int64) (stores.ParticipantRecord, error) {
	if s.agreements == nil {
		return stores.ParticipantRecord{}, domainValidationError("participants", "store", "not configured")
	}
	participant, err := s.agreements.UpsertParticipantDraft(ctx, scope, agreementID, patch, expectedVersion)
	if err != nil {
		return stores.ParticipantRecord{}, err
	}
	if err := s.appendAuditEvent(ctx, scope, agreementID, "agreement.participant_upserted", "system", "", map[string]any{
		"participant_id": participant.ID,
		"role":           participant.Role,
		"signing_stage":  participant.SigningStage,
	}); err != nil {
		return stores.ParticipantRecord{}, err
	}
	return participant, nil
}

// DeleteParticipantDraft deletes a v2 participant record from a draft agreement.
func (s AgreementService) DeleteParticipantDraft(ctx context.Context, scope stores.Scope, agreementID, participantID string) error {
	if s.agreements == nil {
		return domainValidationError("participants", "store", "not configured")
	}
	if err := s.agreements.DeleteParticipantDraft(ctx, scope, agreementID, participantID); err != nil {
		return err
	}
	return s.appendAuditEvent(ctx, scope, agreementID, "agreement.participant_deleted", "system", "", map[string]any{
		"participant_id": strings.TrimSpace(participantID),
	})
}

// ListFieldDefinitions returns canonical v2 logical field definitions for a draft agreement.
func (s AgreementService) ListFieldDefinitions(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.FieldDefinitionRecord, error) {
	if s.agreements == nil {
		return nil, domainValidationError("field_definitions", "store", "not configured")
	}
	return s.agreements.ListFieldDefinitions(ctx, scope, agreementID)
}

// UpsertFieldDefinitionDraft creates or updates a canonical v2 field definition record.
func (s AgreementService) UpsertFieldDefinitionDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldDefinitionDraftPatch) (stores.FieldDefinitionRecord, error) {
	if s.agreements == nil {
		return stores.FieldDefinitionRecord{}, domainValidationError("field_definitions", "store", "not configured")
	}
	definition, err := s.agreements.UpsertFieldDefinitionDraft(ctx, scope, agreementID, patch)
	if err != nil {
		return stores.FieldDefinitionRecord{}, err
	}
	if err := s.appendAuditEvent(ctx, scope, agreementID, "agreement.field_definition_upserted", "system", "", map[string]any{
		"field_definition_id": definition.ID,
		"participant_id":      definition.ParticipantID,
		"field_type":          definition.Type,
		"required":            definition.Required,
	}); err != nil {
		return stores.FieldDefinitionRecord{}, err
	}
	return definition, nil
}

// DeleteFieldDefinitionDraft deletes a v2 field definition record from a draft agreement.
func (s AgreementService) DeleteFieldDefinitionDraft(ctx context.Context, scope stores.Scope, agreementID, fieldDefinitionID string) error {
	if s.agreements == nil {
		return domainValidationError("field_definitions", "store", "not configured")
	}
	if err := s.agreements.DeleteFieldDefinitionDraft(ctx, scope, agreementID, fieldDefinitionID); err != nil {
		return err
	}
	return s.appendAuditEvent(ctx, scope, agreementID, "agreement.field_definition_deleted", "system", "", map[string]any{
		"field_definition_id": strings.TrimSpace(fieldDefinitionID),
	})
}

// ListFieldInstances returns canonical v2 field placements for a draft agreement.
func (s AgreementService) ListFieldInstances(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.FieldInstanceRecord, error) {
	if s.agreements == nil {
		return nil, domainValidationError("field_instances", "store", "not configured")
	}
	return s.agreements.ListFieldInstances(ctx, scope, agreementID)
}

// UpsertFieldInstanceDraft creates or updates a canonical v2 field placement record.
func (s AgreementService) UpsertFieldInstanceDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldInstanceDraftPatch) (stores.FieldInstanceRecord, error) {
	if s.agreements == nil {
		return stores.FieldInstanceRecord{}, domainValidationError("field_instances", "store", "not configured")
	}
	pageNumber, err := s.resolveFieldInstancePageNumber(ctx, scope, agreementID, patch)
	if err != nil {
		return stores.FieldInstanceRecord{}, err
	}
	if err := s.validateFieldInstanceGeometryBounds(ctx, scope, agreementID, pageNumber); err != nil {
		return stores.FieldInstanceRecord{}, err
	}
	instance, err := s.agreements.UpsertFieldInstanceDraft(ctx, scope, agreementID, patch)
	if err != nil {
		return stores.FieldInstanceRecord{}, err
	}
	if err := s.appendAuditEvent(ctx, scope, agreementID, "agreement.field_instance_upserted", "system", "", map[string]any{
		"field_instance_id":   instance.ID,
		"field_definition_id": instance.FieldDefinitionID,
		"page_number":         instance.PageNumber,
		"x":                   instance.X,
		"y":                   instance.Y,
		"width":               instance.Width,
		"height":              instance.Height,
		"tab_index":           instance.TabIndex,
	}); err != nil {
		return stores.FieldInstanceRecord{}, err
	}
	return instance, nil
}

// DeleteFieldInstanceDraft deletes a v2 field placement record from a draft agreement.
func (s AgreementService) DeleteFieldInstanceDraft(ctx context.Context, scope stores.Scope, agreementID, fieldInstanceID string) error {
	if s.agreements == nil {
		return domainValidationError("field_instances", "store", "not configured")
	}
	if err := s.agreements.DeleteFieldInstanceDraft(ctx, scope, agreementID, fieldInstanceID); err != nil {
		return err
	}
	return s.appendAuditEvent(ctx, scope, agreementID, "agreement.field_instance_deleted", "system", "", map[string]any{
		"field_instance_id": strings.TrimSpace(fieldInstanceID),
	})
}

// UpsertFieldDraft creates or updates draft fields.
func (s AgreementService) UpsertFieldDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldDraftPatch) (stores.FieldRecord, error) {
	if s.agreements == nil {
		return stores.FieldRecord{}, domainValidationError("fields", "store", "not configured")
	}
	fieldID := strings.TrimSpace(patch.ID)
	definitionID := fieldID
	if fieldID != "" {
		instances, err := s.agreements.ListFieldInstances(ctx, scope, agreementID)
		if err == nil {
			for _, instance := range instances {
				if instance.ID == fieldID {
					definitionID = instance.FieldDefinitionID
					break
				}
			}
		}
	}
	definitionPatch := stores.FieldDefinitionDraftPatch{
		ID:            definitionID,
		ParticipantID: patch.RecipientID,
		Type:          patch.Type,
		Required:      patch.Required,
	}
	definition, err := s.agreements.UpsertFieldDefinitionDraft(ctx, scope, agreementID, definitionPatch)
	if err != nil {
		return stores.FieldRecord{}, err
	}
	instancePatch := stores.FieldInstanceDraftPatch{
		ID:                fieldID,
		FieldDefinitionID: &definition.ID,
		PageNumber:        patch.PageNumber,
		X:                 patch.PosX,
		Y:                 patch.PosY,
		Width:             patch.Width,
		Height:            patch.Height,
	}
	instance, err := s.agreements.UpsertFieldInstanceDraft(ctx, scope, agreementID, instancePatch)
	if err != nil {
		return stores.FieldRecord{}, err
	}
	field := stores.FieldRecord{
		ID:                instance.ID,
		FieldDefinitionID: definition.ID,
		TenantID:          instance.TenantID,
		OrgID:             instance.OrgID,
		AgreementID:       instance.AgreementID,
		RecipientID:       definition.ParticipantID,
		Type:              definition.Type,
		PageNumber:        instance.PageNumber,
		PosX:              instance.X,
		PosY:              instance.Y,
		Width:             instance.Width,
		Height:            instance.Height,
		Required:          definition.Required,
		CreatedAt:         instance.CreatedAt,
		UpdatedAt:         instance.UpdatedAt,
	}
	if err := s.appendAuditEvent(ctx, scope, agreementID, "agreement.field_upserted", "system", "", map[string]any{
		"field_definition_id": definition.ID,
		"field_instance_id":   instance.ID,
		"field_id":            field.ID,
		"field_type":          field.Type,
		"participant_id":      definition.ParticipantID,
		"recipient_id":        field.RecipientID,
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
	if err := s.agreements.DeleteFieldInstanceDraft(ctx, scope, agreementID, fieldID); err != nil {
		return err
	}
	return s.appendAuditEvent(ctx, scope, agreementID, "agreement.field_deleted", "system", "", map[string]any{
		"field_instance_id": strings.TrimSpace(fieldID),
		"field_id":          strings.TrimSpace(fieldID),
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

	participants, err := s.agreements.ListParticipants(ctx, scope, agreementID)
	if err != nil {
		return AgreementValidationResult{}, err
	}
	definitions, err := s.agreements.ListFieldDefinitions(ctx, scope, agreementID)
	if err != nil {
		return AgreementValidationResult{}, err
	}
	instances, err := s.agreements.ListFieldInstances(ctx, scope, agreementID)
	if err != nil {
		return AgreementValidationResult{}, err
	}
	documentPageCount, err := s.documentPageCount(ctx, scope, agreement)
	if err != nil {
		return AgreementValidationResult{}, err
	}
	issues = append(issues, participantValidationIssues(participants)...)

	if len(definitions) == 0 {
		issues = append(issues, ValidationIssue{
			Code:    string(ErrorCodeMissingRequiredFields),
			Field:   "field_definitions",
			Message: "at least one field definition is required",
		})
	}
	if len(instances) == 0 {
		issues = append(issues, ValidationIssue{
			Code:    string(ErrorCodeMissingRequiredFields),
			Field:   "field_instances",
			Message: "at least one field instance is required",
		})
	}

	signers := map[string]stores.ParticipantRecord{}
	for _, participant := range participants {
		if participant.Role == stores.RecipientRoleSigner {
			signers[participant.ID] = participant
		}
	}

	instancesByDefinition := make(map[string]int, len(instances))
	definitionByID := make(map[string]stores.FieldDefinitionRecord, len(definitions))
	for _, definition := range definitions {
		definitionByID[definition.ID] = definition
	}
	for _, instance := range instances {
		if instance.PageNumber <= 0 || instance.Width <= 0 || instance.Height <= 0 {
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "field_instances.geometry",
				Message: "field instance geometry must be positive and page_number must be > 0",
			})
			continue
		}
		if documentPageCount > 0 && instance.PageNumber > documentPageCount {
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "field_instances.page_number",
				Message: "field instance page_number exceeds source document page count",
			})
			continue
		}
		if _, ok := definitionByID[instance.FieldDefinitionID]; !ok {
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "field_instances.field_definition_id",
				Message: "field instance references missing field definition",
			})
			continue
		}
		instancesByDefinition[instance.FieldDefinitionID]++
	}

	requiredSignatureBySigner := map[string]bool{}
	for _, definition := range definitions {
		if !isV1FieldType(definition.Type) {
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "field_definitions.field_type",
				Message: "unsupported field type",
			})
			continue
		}
		if definition.Type == stores.FieldTypeDateSigned {
			if !definition.Required {
				issues = append(issues, ValidationIssue{
					Code:    string(ErrorCodeInvalidSignerState),
					Field:   "field_definitions.date_signed.required",
					Message: "date_signed fields must be required and system-managed",
				})
			}
			if strings.TrimSpace(definition.ParticipantID) == "" {
				issues = append(issues, ValidationIssue{
					Code:    string(ErrorCodeMissingRequiredFields),
					Field:   "field_definitions.date_signed.participant_id",
					Message: "date_signed fields must target a signer",
				})
			}
		}
		if strings.TrimSpace(definition.ParticipantID) == "" {
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "field_definitions.participant_id",
				Message: "field definitions must be assigned to a signer participant",
			})
			continue
		}
		if strings.TrimSpace(definition.ParticipantID) != "" {
			participant, ok := signers[definition.ParticipantID]
			if !ok {
				issues = append(issues, ValidationIssue{
					Code:    string(ErrorCodeInvalidSignerState),
					Field:   "field_definitions.participant_id",
					Message: "field definition participant must be a signer",
				})
				continue
			}
			if participant.Role != stores.RecipientRoleSigner {
				issues = append(issues, ValidationIssue{
					Code:    string(ErrorCodeInvalidSignerState),
					Field:   "field_definitions.participant_id",
					Message: "field definition participant must be a signer",
				})
			}
		}
		if definition.Required && instancesByDefinition[definition.ID] == 0 {
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "field_instances",
				Message: "required field definition must include at least one valid instance placement",
			})
		}
		if definition.Required && definition.Type == stores.FieldTypeSignature && strings.TrimSpace(definition.ParticipantID) != "" && instancesByDefinition[definition.ID] > 0 {
			requiredSignatureBySigner[definition.ParticipantID] = true
		}
	}

	for signerID := range signers {
		if !requiredSignatureBySigner[signerID] {
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "field_definitions.signature",
				Message: "each signer requires at least one required signature field",
			})
		}
	}

	return AgreementValidationResult{
		Valid:          len(issues) == 0,
		RecipientCount: len(participants),
		FieldCount:     len(instances),
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
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	if replay, ok, err := s.resolveSendReplayFromAudit(ctx, scope, agreementID, idempotencyKey); err != nil {
		return stores.AgreementRecord{}, err
	} else if ok {
		return replay, nil
	}
	var result stores.AgreementRecord
	if err := s.withWriteTxHooks(ctx, func(txSvc AgreementService, hooks *stores.TxHooks) error {
		agreement, err := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if agreement.Status != stores.AgreementStatusDraft {
			if agreement.Status == stores.AgreementStatusSent && idempotencyKey != "" {
				if replayed, replayErr := txSvc.wasSendRecordedWithIdempotencyKey(ctx, scope, agreementID, idempotencyKey); replayErr != nil {
					return replayErr
				} else if replayed {
					result = agreement
					return nil
				}
			}
			return domainValidationError("agreements", "status", "send requires draft status")
		}

		validation, err := txSvc.ValidateBeforeSend(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if !validation.Valid {
			first := validation.Issues[0]
			return domainValidationError("agreements", first.Field, first.Message)
		}
		if txSvc.tokens == nil {
			return domainValidationError("signing_tokens", "service", "not configured")
		}
		recipients, err := txSvc.agreements.ListRecipients(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		activeStage, activeSigners, ok := activeSignerStage(recipients)
		if !ok {
			return domainValidationError("recipients", "role", "no active signer recipient found")
		}
		issuedByRecipient := map[string]stores.IssuedSigningToken{}
		issuedRecipientIDs := make([]string, 0)
		for _, recipient := range recipients {
			if recipient.Role != stores.RecipientRoleSigner {
				continue
			}
			issued, issueErr := txSvc.tokens.Issue(ctx, scope, agreementID, recipient.ID)
			if issueErr != nil {
				return issueErr
			}
			issuedByRecipient[recipient.ID] = issued
			issuedRecipientIDs = append(issuedRecipientIDs, recipient.ID)
		}
		if len(issuedByRecipient) == 0 {
			return domainValidationError("recipients", "role", "no active signer recipient found")
		}

		transitioned, err := txSvc.agreements.Transition(ctx, scope, agreementID, stores.AgreementTransitionInput{
			ToStatus:        stores.AgreementStatusSent,
			ExpectedVersion: agreement.Version,
		})
		if err != nil {
			var rollbackErr error
			for recipientID := range issuedByRecipient {
				if revokeErr := txSvc.tokens.Revoke(ctx, scope, agreementID, recipientID); revokeErr != nil {
					rollbackErr = errors.Join(rollbackErr, revokeErr)
				}
			}
			if rollbackErr != nil {
				return errors.Join(err, rollbackErr)
			}
			return err
		}
		result = transitioned

		activeRecipientIDs := recipientIDs(activeSigners)
		if err := txSvc.appendAuditEvent(ctx, scope, transitioned.ID, "agreement.sent", "system", "", map[string]any{
			"idempotency_key":     strings.TrimSpace(input.IdempotencyKey),
			"status":              transitioned.Status,
			"active_stage":        activeStage,
			"active_recipient_id": coalesceFirst(activeRecipientIDs),
			"active_recipient_ids": func() []string {
				return append([]string{}, activeRecipientIDs...)
			}(),
			"issued_recipient_ids": func() []string {
				return append([]string{}, issuedRecipientIDs...)
			}(),
		}); err != nil {
			return err
		}
		if txSvc.emails != nil {
			for _, activeSigner := range activeSigners {
				issued := issuedByRecipient[activeSigner.ID]
				notification := AgreementNotification{
					AgreementID:   transitioned.ID,
					RecipientID:   activeSigner.ID,
					CorrelationID: strings.TrimSpace(input.IdempotencyKey),
					Type:          NotificationSigningInvitation,
					Token:         issued,
				}
				hooks.AfterCommit(func() error {
					if err := s.emails.OnAgreementSent(ctx, scope, notification); err != nil {
						_ = s.appendAuditEvent(ctx, scope, transitioned.ID, "agreement.send_notification_failed", "system", "", map[string]any{
							"idempotency_key": strings.TrimSpace(input.IdempotencyKey),
							"recipient_id":    notification.RecipientID,
							"error":           strings.TrimSpace(err.Error()),
						})
					}
					return nil
				})
			}
		}
		return nil
	}); err != nil {
		if replay, ok, replayErr := s.resolveSendReplayFromAudit(ctx, scope, agreementID, idempotencyKey); replayErr == nil && ok {
			return replay, nil
		}
		return stores.AgreementRecord{}, err
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
	if err := s.withWriteTxHooks(ctx, func(txSvc AgreementService, hooks *stores.TxHooks) error {
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
		activeStage, activeSigners, ok := activeSignerStage(recipients)
		if !ok {
			return domainValidationError("recipients", "role", "no active signer recipient found")
		}

		target := activeSigners[0]
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
		activeRecipientIDs := recipientIDs(activeSigners)
		if !containsRecipientID(activeRecipientIDs, target.ID) && !input.AllowOutOfOrderResend {
			return domainValidationError("recipients", "signing_stage", "resend target is not in active signing stage")
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
			"active_stage":              activeStage,
			"active_recipient_id":       coalesceFirst(activeRecipientIDs),
			"active_recipient_ids":      activeRecipientIDs,
			"rotate_token":              input.RotateToken,
			"invalidate_existing":       input.InvalidateExisting,
			"allow_out_of_order_resend": input.AllowOutOfOrderResend,
			"token_id":                  issued.Record.ID,
		}); err != nil {
			return err
		}
		if txSvc.emails != nil {
			notification := AgreementNotification{
				AgreementID:   agreement.ID,
				RecipientID:   target.ID,
				CorrelationID: strings.TrimSpace(input.IdempotencyKey),
				Type:          NotificationSigningReminder,
				Token:         issued,
			}
			hooks.AfterCommit(func() error {
				if err := s.emails.OnAgreementResent(ctx, scope, notification); err != nil {
					_ = s.appendAuditEvent(ctx, scope, agreement.ID, "agreement.resend_notification_failed", "system", "", map[string]any{
						"idempotency_key": strings.TrimSpace(input.IdempotencyKey),
						"recipient_id":    notification.RecipientID,
						"error":           strings.TrimSpace(err.Error()),
					})
				}
				return nil
			})
		}
		result = ResendResult{
			Agreement:       agreement,
			Recipient:       target,
			ActiveRecipient: activeSigners[0],
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

func participantPatchFromRecipientPatch(patch stores.RecipientDraftPatch) stores.ParticipantDraftPatch {
	out := stores.ParticipantDraftPatch{
		ID:    patch.ID,
		Email: patch.Email,
		Name:  patch.Name,
		Role:  patch.Role,
	}
	if patch.SigningOrder != nil {
		out.SigningStage = patch.SigningOrder
	}
	return out
}

func recipientFromParticipant(record stores.ParticipantRecord) stores.RecipientRecord {
	return stores.RecipientRecord{
		ID:            record.ID,
		TenantID:      record.TenantID,
		OrgID:         record.OrgID,
		AgreementID:   record.AgreementID,
		Email:         record.Email,
		Name:          record.Name,
		Role:          record.Role,
		SigningOrder:  record.SigningStage,
		FirstViewAt:   record.FirstViewAt,
		LastViewAt:    record.LastViewAt,
		DeclinedAt:    record.DeclinedAt,
		DeclineReason: record.DeclineReason,
		CompletedAt:   record.CompletedAt,
		Version:       record.Version,
		CreatedAt:     record.CreatedAt,
		UpdatedAt:     record.UpdatedAt,
	}
}

func simulateParticipantUpsert(current []stores.ParticipantRecord, patch stores.ParticipantDraftPatch) []stores.ParticipantRecord {
	next := make([]stores.ParticipantRecord, len(current))
	copy(next, current)

	participantID := strings.TrimSpace(patch.ID)
	idx := -1
	for i, rec := range next {
		if strings.TrimSpace(rec.ID) == participantID && participantID != "" {
			idx = i
			break
		}
	}

	if idx == -1 {
		next = append(next, stores.ParticipantRecord{ID: participantID})
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
	if patch.SigningStage != nil {
		rec.SigningStage = *patch.SigningStage
	}
	if rec.Role == "" {
		rec.Role = stores.RecipientRoleSigner
	}
	if rec.SigningStage <= 0 {
		rec.SigningStage = 1
	}
	next[idx] = rec
	return next
}

func simulateParticipantDelete(current []stores.ParticipantRecord, participantID string) []stores.ParticipantRecord {
	participantID = strings.TrimSpace(participantID)
	if participantID == "" {
		return current
	}
	next := make([]stores.ParticipantRecord, 0, len(current))
	for _, rec := range current {
		if strings.TrimSpace(rec.ID) == participantID {
			continue
		}
		next = append(next, rec)
	}
	return next
}

func validateParticipantSet(participants []stores.ParticipantRecord) error {
	issues := participantValidationIssues(participants)
	if len(issues) == 0 {
		return nil
	}
	issue := issues[0]
	return domainValidationError("participants", issue.Field, issue.Message)
}

func participantValidationIssues(participants []stores.ParticipantRecord) []ValidationIssue {
	issues := make([]ValidationIssue, 0)
	if len(participants) == 0 {
		return issues
	}
	signerStages := make([]int, 0, len(participants))
	signerCount := 0
	for _, rec := range participants {
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
			signerStages = append(signerStages, rec.SigningStage)
		case stores.RecipientRoleCC:
			if rec.SigningStage <= 0 {
				issues = append(issues, ValidationIssue{
					Code:    string(ErrorCodeMissingRequiredFields),
					Field:   "signing_stage",
					Message: "must be positive",
				})
				return issues
			}
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
	sort.Ints(signerStages)
	seenStage := map[int]bool{}
	maxStage := 0
	for _, stage := range signerStages {
		if stage <= 0 {
			issues = append(issues, ValidationIssue{
				Code:    string(ErrorCodeMissingRequiredFields),
				Field:   "signing_stage",
				Message: "must be positive",
			})
			return issues
		}
		seenStage[stage] = true
		if stage > maxStage {
			maxStage = stage
		}
	}
	for stage := 1; stage <= maxStage; stage++ {
		if seenStage[stage] {
			continue
		}
		issues = append(issues, ValidationIssue{
			Code:    string(ErrorCodeMissingRequiredFields),
			Field:   "signing_stage",
			Message: "signing stages must be contiguous starting at 1",
		})
		return issues
	}
	return issues
}

func (s AgreementService) resolveFieldInstancePageNumber(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldInstanceDraftPatch) (int, error) {
	if patch.PageNumber != nil {
		return *patch.PageNumber, nil
	}
	instanceID := strings.TrimSpace(patch.ID)
	if instanceID == "" || s.agreements == nil {
		return 1, nil
	}
	instances, err := s.agreements.ListFieldInstances(ctx, scope, agreementID)
	if err != nil {
		return 0, err
	}
	for _, instance := range instances {
		if strings.TrimSpace(instance.ID) == instanceID {
			return instance.PageNumber, nil
		}
	}
	return 1, nil
}

func (s AgreementService) validateFieldInstanceGeometryBounds(ctx context.Context, scope stores.Scope, agreementID string, pageNumber int) error {
	if pageNumber <= 0 {
		return domainValidationError("field_instances", "page_number", "must be positive")
	}
	if s.agreements == nil || s.documents == nil {
		return nil
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return err
	}
	documentPageCount, err := s.documentPageCount(ctx, scope, agreement)
	if err != nil {
		return err
	}
	if documentPageCount <= 0 {
		return nil
	}
	if pageNumber > documentPageCount {
		return domainValidationError("field_instances", "page_number", "exceeds source document page count")
	}
	return nil
}

func (s AgreementService) documentPageCount(ctx context.Context, scope stores.Scope, agreement stores.AgreementRecord) (int, error) {
	if s.documents == nil {
		return 0, nil
	}
	documentID := strings.TrimSpace(agreement.DocumentID)
	if documentID == "" {
		return 0, nil
	}
	document, err := s.documents.Get(ctx, scope, documentID)
	if err != nil {
		return 0, err
	}
	return document.PageCount, nil
}

func (s AgreementService) resolveSendReplayFromAudit(ctx context.Context, scope stores.Scope, agreementID, idempotencyKey string) (stores.AgreementRecord, bool, error) {
	if s.agreements == nil {
		return stores.AgreementRecord{}, false, nil
	}
	replayed, err := s.wasSendRecordedWithIdempotencyKey(ctx, scope, agreementID, idempotencyKey)
	if err != nil {
		return stores.AgreementRecord{}, false, err
	}
	if !replayed {
		return stores.AgreementRecord{}, false, nil
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementRecord{}, false, err
	}
	return agreement, true, nil
}

func (s AgreementService) wasSendRecordedWithIdempotencyKey(ctx context.Context, scope stores.Scope, agreementID, idempotencyKey string) (bool, error) {
	if s.audits == nil {
		return false, nil
	}
	agreementID = strings.TrimSpace(agreementID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if agreementID == "" || idempotencyKey == "" {
		return false, nil
	}
	events, err := s.audits.ListForAgreement(ctx, scope, agreementID, stores.AuditEventQuery{SortDesc: true})
	if err != nil {
		return false, err
	}
	for _, event := range events {
		if strings.TrimSpace(event.EventType) != "agreement.sent" {
			continue
		}
		metadataJSON := strings.TrimSpace(event.MetadataJSON)
		if metadataJSON == "" {
			continue
		}
		decoded := map[string]any{}
		if err := json.Unmarshal([]byte(metadataJSON), &decoded); err != nil {
			continue
		}
		if strings.TrimSpace(fmt.Sprint(decoded["idempotency_key"])) == idempotencyKey {
			return true, nil
		}
	}
	return false, nil
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

func activeSignerStage(recipients []stores.RecipientRecord) (int, []stores.RecipientRecord, bool) {
	signers := make([]stores.RecipientRecord, 0)
	for _, rec := range recipients {
		if rec.Role == stores.RecipientRoleSigner {
			signers = append(signers, rec)
		}
	}
	if len(signers) == 0 {
		return 0, nil, false
	}
	sort.Slice(signers, func(i, j int) bool {
		return signers[i].SigningOrder < signers[j].SigningOrder
	})
	activeStage := 0
	active := make([]stores.RecipientRecord, 0)
	for _, signer := range signers {
		if signer.CompletedAt != nil || signer.DeclinedAt != nil {
			continue
		}
		stage := signer.SigningOrder
		if stage <= 0 {
			stage = 1
		}
		if activeStage == 0 || stage < activeStage {
			activeStage = stage
			active = []stores.RecipientRecord{signer}
			continue
		}
		if stage == activeStage {
			active = append(active, signer)
		}
	}
	if activeStage == 0 || len(active) == 0 {
		return 0, nil, false
	}
	return activeStage, active, true
}

func recipientIDs(recipients []stores.RecipientRecord) []string {
	ids := make([]string, 0, len(recipients))
	for _, recipient := range recipients {
		id := strings.TrimSpace(recipient.ID)
		if id == "" {
			continue
		}
		ids = append(ids, id)
	}
	return ids
}

func containsRecipientID(recipientIDs []string, candidate string) bool {
	candidate = strings.TrimSpace(candidate)
	if candidate == "" {
		return false
	}
	for _, recipientID := range recipientIDs {
		if strings.TrimSpace(recipientID) == candidate {
			return true
		}
	}
	return false
}

func coalesceFirst(items []string) string {
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item != "" {
			return item
		}
	}
	return ""
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
