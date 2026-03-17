package services

import (
	"context"
	"encoding/json"
	"fmt"
	"maps"
	"reflect"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin/guardedeffects"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/google/uuid"
)

// AgreementService manages draft agreement lifecycle and recipient/field mutations.
type AgreementService struct {
	agreements            stores.AgreementStore
	revisionRequests      stores.AgreementRevisionRequestStore
	documents             stores.DocumentStore
	placementRuns         stores.PlacementRunStore
	reminders             stores.AgreementReminderStore
	tokens                AgreementTokenService
	reviewTokens          AgreementReviewTokenService
	audits                stores.AuditEventStore
	emails                AgreementEmailWorkflow
	outbox                stores.OutboxStore
	effects               stores.GuardedEffectStore
	placementOrchestrator AgreementPlacementOrchestrator
	placementPolicy       AgreementPlacementPolicyResolver
	placementObjectStore  PlacementDocumentObjectStore
	notificationDispatch  AgreementNotificationDispatchTrigger
	tx                    stores.TransactionManager
	customTokens          bool
	customReviewTokens    bool
	customAudits          bool
	customOutbox          bool
	customPlacementRuns   bool
	customReminders       bool
	pdfs                  PDFService
	now                   func() time.Time
}

// AgreementServiceOption customizes AgreementService behavior.
type AgreementServiceOption func(*AgreementService)

// AgreementTokenService captures signing-token lifecycle operations used by agreement flows.
type AgreementTokenService interface {
	Issue(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.IssuedSigningToken, error)
	IssuePending(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.IssuedSigningToken, error)
	Rotate(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.IssuedSigningToken, error)
	Revoke(ctx context.Context, scope stores.Scope, agreementID, recipientID string) error
	PromotePending(ctx context.Context, scope stores.Scope, tokenID string) (stores.SigningTokenRecord, error)
	AbortPending(ctx context.Context, scope stores.Scope, tokenID string) (stores.SigningTokenRecord, error)
}

type AgreementReviewTokenService interface {
	Issue(ctx context.Context, scope stores.Scope, agreementID, reviewID, participantID string) (stores.IssuedReviewSessionToken, error)
	Rotate(ctx context.Context, scope stores.Scope, agreementID, reviewID, participantID string) (stores.IssuedReviewSessionToken, error)
	Revoke(ctx context.Context, scope stores.Scope, agreementID, participantID string) error
}

// AgreementNotificationType defines notification policy kinds emitted by agreement lifecycle transitions.
type AgreementNotificationType string

const (
	NotificationSigningInvitation AgreementNotificationType = "signing_invitation"
	NotificationSigningReminder   AgreementNotificationType = "signing_reminder"
	NotificationCompletionPackage AgreementNotificationType = "completion_delivery"
)

const (
	GuardedEffectKindAgreementSendInvitation = "esign.agreements.send_invitation"
	GuardedEffectKindAgreementResendReminder = "esign.agreements.resend_reminder"
)

// AgreementNotification carries canonical email notification payload context.
type AgreementNotification struct {
	AgreementID   string
	RecipientID   string
	EffectID      string
	CorrelationID string
	Type          AgreementNotificationType
	Token         stores.IssuedSigningToken
}

// AgreementEmailWorkflow captures post-send and post-resend email dispatch behavior.
type AgreementEmailWorkflow interface {
	OnAgreementSent(ctx context.Context, scope stores.Scope, notification AgreementNotification) error
	OnAgreementResent(ctx context.Context, scope stores.Scope, notification AgreementNotification) error
}

// AgreementNotificationDispatchTrigger nudges async notification delivery without blocking the caller.
type AgreementNotificationDispatchTrigger interface {
	NotifyScope(scope stores.Scope)
}

type AgreementRevisionKind string

const (
	AgreementRevisionKindCorrection AgreementRevisionKind = "correction"
	AgreementRevisionKindAmendment  AgreementRevisionKind = "amendment"
)

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

func WithAgreementReviewTokenService(tokens AgreementReviewTokenService) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil || tokens == nil {
			return
		}
		s.reviewTokens = tokens
		s.customReviewTokens = true
	}
}

// WithAgreementAuditStore configures append-only audit event persistence.
func WithAgreementAuditStore(audits stores.AuditEventStore) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil || audits == nil {
			return
		}
		s.audits = audits
		s.customAudits = !sameInstance(audits, s.agreements)
	}
}

// WithAgreementReminderStore configures reminder cadence state persistence.
func WithAgreementReminderStore(reminders stores.AgreementReminderStore) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil || reminders == nil {
			return
		}
		s.reminders = reminders
		// Treat identical store injection as default wiring so reminder writes stay tx-bound.
		s.customReminders = !sameInstance(reminders, s.agreements)
	}
}

func sameInstance(left, right any) bool {
	if left == nil || right == nil {
		return false
	}
	lv := reflect.ValueOf(left)
	rv := reflect.ValueOf(right)
	if !lv.IsValid() || !rv.IsValid() || lv.Type() != rv.Type() {
		return false
	}
	switch lv.Kind() {
	case reflect.Pointer, reflect.Map, reflect.Slice, reflect.Func, reflect.Chan, reflect.UnsafePointer:
		return lv.Pointer() == rv.Pointer()
	default:
		if !lv.Type().Comparable() {
			return false
		}
		return lv.Interface() == rv.Interface()
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

// WithAgreementNotificationOutbox configures transactional notification outbox persistence.
func WithAgreementNotificationOutbox(outbox stores.OutboxStore) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil || outbox == nil {
			return
		}
		s.outbox = outbox
		s.customOutbox = !sameInstance(outbox, s.agreements)
	}
}

// WithAgreementNotificationDispatchTrigger configures the async notification dispatcher nudge hook.
func WithAgreementNotificationDispatchTrigger(trigger AgreementNotificationDispatchTrigger) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil || trigger == nil {
			return
		}
		s.notificationDispatch = trigger
	}
}

// WithAgreementPDFService sets the shared PDF policy service used for compatibility gating.
func WithAgreementPDFService(service PDFService) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil {
			return
		}
		s.pdfs = service
	}
}

// CreateDraftInput captures required agreement draft creation fields.
type CreateDraftInput struct {
	DocumentID             string
	Title                  string
	Message                string
	CreatedByUserID        string
	IPAddress              string
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
		agreements:       store,
		revisionRequests: store,
		documents:        store,
		placementRuns:    store,
		reminders:        store,
		audits:           store,
		outbox:           store,
		effects:          store,
		tokens:           stores.NewTokenService(store),
		reviewTokens:     stores.NewReviewSessionTokenService(store),
		tx:               store,
		pdfs:             NewPDFService(),
		now:              func() time.Time { return time.Now().UTC() },
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
	txSvc.revisionRequests = tx
	txSvc.documents = tx
	if !txSvc.customPlacementRuns {
		txSvc.placementRuns = tx
	}
	if !txSvc.customReminders {
		txSvc.reminders = tx
	}
	if txSvc.outbox != nil && !txSvc.customOutbox {
		txSvc.outbox = tx
	}
	if txSvc.effects != nil {
		txSvc.effects = tx
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
	if !txSvc.customReviewTokens {
		txSvc.reviewTokens = stores.NewReviewSessionTokenService(tx)
	} else {
		switch typed := txSvc.reviewTokens.(type) {
		case stores.ReviewSessionTokenService:
			txSvc.reviewTokens = typed.ForTx(tx)
		case *stores.ReviewSessionTokenService:
			txSvc.reviewTokens = typed.ForTx(tx)
		case interface {
			ForTx(tx stores.TxStore) AgreementReviewTokenService
		}:
			txSvc.reviewTokens = typed.ForTx(tx)
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

// CreateRevisionInput captures source-agreement bootstrap parameters for correction/amendment drafts.
type CreateRevisionInput struct {
	SourceAgreementID string
	Kind              AgreementRevisionKind
	CreatedByUserID   string
	IdempotencyKey    string
	IPAddress         string
}

// SendInput controls send transition behavior.
type SendInput struct {
	IdempotencyKey string
	IPAddress      string
	CorrelationID  string
}

// VoidInput controls void transition behavior.
type VoidInput struct {
	Reason       string
	RevokeTokens bool
	IPAddress    string
}

// ExpireInput controls expiry transition metadata.
type ExpireInput struct {
	Reason    string
	IPAddress string
}

// ResendInput controls resend behavior and token lifecycle options.
type ResendInput struct {
	RecipientID           string
	RotateToken           bool
	InvalidateExisting    bool
	AllowOutOfOrderResend bool
	IdempotencyKey        string
	IPAddress             string
	Source                string
	ReminderLease         stores.AgreementReminderLeaseToken
	ReminderLeaseSeconds  int
}

// ResendResult returns resend decision context and newly issued token.
type ResendResult struct {
	Agreement       stores.AgreementRecord
	Recipient       stores.RecipientRecord
	ActiveRecipient stores.RecipientRecord
	Token           stores.IssuedSigningToken
	Effects         []AgreementNotificationEffectDetail
}

type agreementNotificationEffectPreparePayload struct {
	AgreementID       string `json:"agreement_id"`
	RecipientID       string `json:"recipient_id"`
	PendingTokenID    string `json:"pending_token_id"`
	Notification      string `json:"notification"`
	FailureAuditEvent string `json:"failure_audit_event"`
}

func agreementNotificationEffectIdempotencyKey(
	scope stores.Scope,
	kind, agreementID, recipientID, idempotencyKey string,
) string {
	kind = strings.TrimSpace(kind)
	agreementID = strings.TrimSpace(agreementID)
	recipientID = strings.TrimSpace(recipientID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if kind == "" || agreementID == "" || recipientID == "" || idempotencyKey == "" {
		return ""
	}
	return strings.Join([]string{
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		kind,
		agreementID,
		recipientID,
		idempotencyKey,
	}, "|")
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
	if err := s.appendAuditEventWithIP(ctx, scope, agreement.ID, "agreement.created", actorType, actorID, input.IPAddress, map[string]any{
		"status": agreement.Status,
	}); err != nil {
		return stores.AgreementRecord{}, err
	}
	return agreement, nil
}

// CreateRevision creates a new draft agreement linked to an existing in-flight or completed agreement.
func (s AgreementService) CreateRevision(ctx context.Context, scope stores.Scope, input CreateRevisionInput) (stores.AgreementRecord, error) {
	if s.agreements == nil {
		return stores.AgreementRecord{}, domainValidationError("agreements", "store", "not configured")
	}
	sourceAgreementID := strings.TrimSpace(input.SourceAgreementID)
	if sourceAgreementID == "" {
		return stores.AgreementRecord{}, domainValidationError("agreements", "source_agreement_id", "required")
	}
	createdByUserID := strings.TrimSpace(input.CreatedByUserID)
	if createdByUserID == "" {
		return stores.AgreementRecord{}, domainValidationError("agreements", "created_by_user_id", "required")
	}
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	kind := normalizeAgreementRevisionKind(input.Kind)
	if kind == "" {
		return stores.AgreementRecord{}, domainValidationError("agreements", "revision_kind", "unsupported revision kind")
	}

	var created stores.AgreementRecord
	if err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		requestID := ""
		if txSvc.revisionRequests != nil && idempotencyKey != "" {
			request, reserved, err := txSvc.revisionRequests.BeginAgreementRevisionRequest(ctx, scope, stores.AgreementRevisionRequestInput{
				SourceAgreementID: sourceAgreementID,
				RevisionKind:      string(kind),
				IdempotencyKey:    idempotencyKey,
				RequestHash:       txSvc.revisionRequestHash(sourceAgreementID, kind, createdByUserID),
				ActorID:           createdByUserID,
				Now:               txSvc.now().UTC(),
			})
			if err != nil {
				return err
			}
			if !reserved {
				if strings.TrimSpace(request.CreatedAgreementID) == "" {
					return domainValidationError("agreement_revision_requests", "created_agreement_id", "replay request incomplete")
				}
				created, err = txSvc.agreements.GetAgreement(ctx, scope, request.CreatedAgreementID)
				return err
			}
			requestID = strings.TrimSpace(request.ID)
		}
		source, err := txSvc.agreements.GetAgreement(ctx, scope, sourceAgreementID)
		if err != nil {
			return err
		}
		if err := validateSourceAgreementForRevision(source, kind); err != nil {
			return err
		}

		parentExecutedSHA256, err := txSvc.resolveParentExecutedSHA256(ctx, scope, source, kind)
		if err != nil {
			return err
		}
		now := txSvc.now().UTC()
		rootAgreementID := strings.TrimSpace(source.RootAgreementID)
		if rootAgreementID == "" {
			rootAgreementID = strings.TrimSpace(source.ID)
		}
		workflowKind := stores.AgreementWorkflowKindCorrection
		sourceEventType := "agreement.correction_requested"
		childCreatedEventType := "agreement.correction_draft_created"
		childLinkedEventType := "agreement.corrected_from"
		if kind == AgreementRevisionKindAmendment {
			workflowKind = stores.AgreementWorkflowKindAmendment
			sourceEventType = "agreement.amendment_requested"
			childCreatedEventType = "agreement.amendment_draft_created"
			childLinkedEventType = "agreement.amended_from"
		}

		created, err = txSvc.agreements.CreateDraft(ctx, scope, stores.AgreementRecord{
			DocumentID:             strings.TrimSpace(source.DocumentID),
			WorkflowKind:           workflowKind,
			RootAgreementID:        rootAgreementID,
			ParentAgreementID:      strings.TrimSpace(source.ID),
			ParentExecutedSHA256:   strings.TrimSpace(parentExecutedSHA256),
			SourceType:             strings.TrimSpace(source.SourceType),
			SourceGoogleFileID:     strings.TrimSpace(source.SourceGoogleFileID),
			SourceGoogleDocURL:     strings.TrimSpace(source.SourceGoogleDocURL),
			SourceModifiedTime:     source.SourceModifiedTime,
			SourceExportedAt:       source.SourceExportedAt,
			SourceExportedByUserID: strings.TrimSpace(source.SourceExportedByUserID),
			SourceMimeType:         strings.TrimSpace(source.SourceMimeType),
			SourceIngestionMode:    strings.TrimSpace(source.SourceIngestionMode),
			Status:                 stores.AgreementStatusDraft,
			Title:                  strings.TrimSpace(source.Title),
			Message:                strings.TrimSpace(source.Message),
			CreatedByUserID:        createdByUserID,
			UpdatedByUserID:        createdByUserID,
			CreatedAt:              now,
			UpdatedAt:              now,
		})
		if err != nil {
			return err
		}
		if err := txSvc.copyRevisionAuthoringState(ctx, scope, source, created); err != nil {
			return err
		}

		baseMetadata := map[string]any{
			"source_agreement_id":    strings.TrimSpace(source.ID),
			"new_agreement_id":       strings.TrimSpace(created.ID),
			"root_agreement_id":      strings.TrimSpace(rootAgreementID),
			"parent_agreement_id":    strings.TrimSpace(source.ID),
			"workflow_kind":          strings.TrimSpace(workflowKind),
			"parent_executed_sha256": strings.TrimSpace(parentExecutedSHA256),
			"idempotency_key":        idempotencyKey,
			"change_summary": map[string]any{
				"document_changed": nil,
				"title_changed":    nil,
				"message_changed":  nil,
			},
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, source.ID, sourceEventType, "user", createdByUserID, input.IPAddress, cloneAnyMap(baseMetadata)); err != nil {
			return err
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, created.ID, childCreatedEventType, "user", createdByUserID, input.IPAddress, cloneAnyMap(baseMetadata)); err != nil {
			return err
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, created.ID, childLinkedEventType, "user", createdByUserID, input.IPAddress, cloneAnyMap(baseMetadata)); err != nil {
			return err
		}
		if requestID != "" {
			if _, err := txSvc.revisionRequests.CompleteAgreementRevisionRequest(ctx, scope, requestID, created.ID, txSvc.now().UTC()); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return stores.AgreementRecord{}, err
	}
	return created, nil
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
		"field_instance_id":    instance.ID,
		"field_definition_id":  instance.FieldDefinitionID,
		"page_number":          instance.PageNumber,
		"x":                    instance.X,
		"y":                    instance.Y,
		"width":                instance.Width,
		"height":               instance.Height,
		"tab_index":            instance.TabIndex,
		"placement_source":     strings.TrimSpace(instance.PlacementSource),
		"link_group_id":        strings.TrimSpace(instance.LinkGroupID),
		"linked_from_field_id": strings.TrimSpace(instance.LinkedFromFieldID),
		"is_unlinked":          instance.IsUnlinked,
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
		PlacementSource:   patch.PlacementSource,
		LinkGroupID:       patch.LinkGroupID,
		LinkedFromFieldID: patch.LinkedFromFieldID,
		IsUnlinked:        patch.IsUnlinked,
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
		PlacementSource:   instance.PlacementSource,
		LinkGroupID:       instance.LinkGroupID,
		LinkedFromFieldID: instance.LinkedFromFieldID,
		IsUnlinked:        instance.IsUnlinked,
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
	if err := s.validateReviewGateBeforeSend(ctx, scope, agreement); err != nil {
		issues = append(issues, ValidationIssue{
			Code:    string(ErrorCodeMissingRequiredFields),
			Field:   "review_status",
			Message: err.Error(),
		})
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

func (s AgreementService) resolveAgreementDocumentCompatibility(ctx context.Context, scope stores.Scope, agreement stores.AgreementRecord) (stores.DocumentRecord, PDFCompatibilityStatus, error) {
	if s.documents == nil {
		return stores.DocumentRecord{}, PDFCompatibilityStatus{}, domainValidationError("documents", "store", "not configured")
	}
	documentID := strings.TrimSpace(agreement.DocumentID)
	if documentID == "" {
		return stores.DocumentRecord{}, PDFCompatibilityStatus{}, domainValidationError("agreements", "document_id", "required")
	}
	document, err := s.documents.Get(ctx, scope, documentID)
	if err != nil {
		return stores.DocumentRecord{}, PDFCompatibilityStatus{}, err
	}
	policy := s.pdfs.Policy(ctx, scope)
	return document, resolveDocumentCompatibility(policy, document), nil
}

func (s AgreementService) prepareAgreementNotificationEffect(
	ctx context.Context,
	scope stores.Scope,
	kind string,
	notification AgreementNotification,
	failureAuditEvent string,
	idempotencyKey string,
) (guardedeffects.Record, bool, error) {
	if s.effects == nil {
		return guardedeffects.Record{}, false, domainValidationError("guarded_effects", "store", "not configured")
	}
	if s.outbox == nil {
		return guardedeffects.Record{}, false, domainValidationError("notifications", "outbox", "not configured")
	}
	effectKey := agreementNotificationEffectIdempotencyKey(scope, kind, notification.AgreementID, notification.RecipientID, idempotencyKey)
	if effectKey != "" {
		record, err := s.effects.GetGuardedEffectByIdempotencyKey(ctx, scope, effectKey)
		if err == nil {
			return record, true, nil
		}
	}

	now := s.now().UTC()
	notification.EffectID = uuid.NewString()
	preparePayload, err := json.Marshal(agreementNotificationEffectPreparePayload{
		AgreementID:       strings.TrimSpace(notification.AgreementID),
		RecipientID:       strings.TrimSpace(notification.RecipientID),
		PendingTokenID:    strings.TrimSpace(notification.Token.Record.ID),
		Notification:      strings.TrimSpace(string(notification.Type)),
		FailureAuditEvent: strings.TrimSpace(failureAuditEvent),
	})
	if err != nil {
		return guardedeffects.Record{}, false, err
	}
	outboxRecord, err := buildEmailNotificationOutboxRecord(scope, notification, failureAuditEvent, now)
	if err != nil {
		return guardedeffects.Record{}, false, err
	}
	effect := guardedeffects.Record{
		EffectID:            notification.EffectID,
		TenantID:            strings.TrimSpace(scope.TenantID),
		OrgID:               strings.TrimSpace(scope.OrgID),
		Kind:                strings.TrimSpace(kind),
		GroupType:           GuardedEffectGroupTypeAgreement,
		GroupID:             strings.TrimSpace(notification.AgreementID),
		SubjectType:         "agreement_recipient_notification",
		SubjectID:           strings.TrimSpace(notification.RecipientID),
		IdempotencyKey:      effectKey,
		CorrelationID:       strings.TrimSpace(notification.CorrelationID),
		Status:              guardedeffects.StatusPrepared,
		MaxAttempts:         5,
		GuardPolicy:         guardedeffects.PolicySMTPAccepted,
		PreparePayloadJSON:  string(preparePayload),
		DispatchPayloadJSON: strings.TrimSpace(outboxRecord.PayloadJSON),
		CreatedAt:           now,
		UpdatedAt:           now,
	}
	saved, err := s.effects.SaveGuardedEffect(ctx, scope, effect)
	if err != nil {
		return guardedeffects.Record{}, false, err
	}
	if _, err := s.outbox.EnqueueOutboxMessage(ctx, scope, outboxRecord); err != nil {
		return guardedeffects.Record{}, false, err
	}
	return saved, false, nil
}

// Send transitions a draft agreement to sent while honoring idempotency keys.
func (s AgreementService) Send(ctx context.Context, scope stores.Scope, agreementID string, input SendInput) (stores.AgreementRecord, error) {
	if s.agreements == nil {
		return stores.AgreementRecord{}, domainValidationError("agreements", "store", "not configured")
	}
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		correlationID = idempotencyKey
	}
	if replay, ok, err := s.resolveSendReplayFromAudit(ctx, scope, agreementID, idempotencyKey); err != nil {
		return stores.AgreementRecord{}, err
	} else if ok {
		return replay, nil
	}
	var result stores.AgreementRecord
	sendCompatibilityTier := PDFCompatibilityTierFull
	sendCompatibilityReason := ""
	sendStartedAt := time.Now()
	LogSendDebug("agreement_service", "send_start", SendDebugFields(scope, correlationID, map[string]any{
		"agreement_id":    strings.TrimSpace(agreementID),
		"idempotency_key": idempotencyKey,
	}))
	if err := s.withWriteTxHooks(ctx, func(txSvc AgreementService, hooks *stores.TxHooks) error {
		loadAgreementStartedAt := time.Now()
		agreement, err := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			LogSendPhaseDuration("agreement_service", "agreement_load_failed", loadAgreementStartedAt, SendDebugFields(scope, correlationID, map[string]any{
				"agreement_id": strings.TrimSpace(agreementID),
				"error":        strings.TrimSpace(err.Error()),
			}))
			return err
		}
		LogSendPhaseDuration("agreement_service", "agreement_loaded", loadAgreementStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"agreement_id": strings.TrimSpace(agreement.ID),
			"status":       strings.TrimSpace(agreement.Status),
			"version":      agreement.Version,
		}))
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
		workflowKind := strings.TrimSpace(agreement.WorkflowKind)
		parentAgreementID := strings.TrimSpace(agreement.ParentAgreementID)
		var parentAgreement stores.AgreementRecord
		var changeSummary map[string]any
		if (workflowKind == stores.AgreementWorkflowKindCorrection || workflowKind == stores.AgreementWorkflowKindAmendment) && parentAgreementID != "" {
			parentAgreement, err = txSvc.agreements.GetAgreement(ctx, scope, parentAgreementID)
			if err != nil {
				return err
			}
			switch workflowKind {
			case stores.AgreementWorkflowKindCorrection:
				if parentAgreement.Status != stores.AgreementStatusSent && parentAgreement.Status != stores.AgreementStatusInProgress {
					return domainValidationError("agreements", "parent_agreement_id", "correction parent must be sent or in_progress")
				}
			case stores.AgreementWorkflowKindAmendment:
				if parentAgreement.Status != stores.AgreementStatusCompleted {
					return domainValidationError("agreements", "parent_agreement_id", "amendment parent must be completed")
				}
			}
			changeSummary, err = txSvc.buildAgreementChangeSummary(ctx, scope, parentAgreement, agreement)
			if err != nil {
				return err
			}
		}
		compatibilityStartedAt := time.Now()
		document, compatibility, err := txSvc.resolveAgreementDocumentCompatibility(ctx, scope, agreement)
		if err != nil {
			LogSendPhaseDuration("agreement_service", "compatibility_check_failed", compatibilityStartedAt, SendDebugFields(scope, correlationID, map[string]any{
				"agreement_id": strings.TrimSpace(agreement.ID),
				"error":        strings.TrimSpace(err.Error()),
			}))
			return err
		}
		LogSendPhaseDuration("agreement_service", "compatibility_check_complete", compatibilityStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"agreement_id":         strings.TrimSpace(agreement.ID),
			"document_id":          strings.TrimSpace(document.ID),
			"compatibility_tier":   strings.TrimSpace(string(compatibility.Tier)),
			"compatibility_reason": strings.TrimSpace(compatibility.Reason),
		}))
		sendCompatibilityTier = compatibility.Tier
		sendCompatibilityReason = compatibility.Reason
		if compatibility.Tier == PDFCompatibilityTierUnsupported && !policyAllowsAnalyzeOnlyUpload(txSvc.pdfs.Policy(ctx, scope)) {
			return pdfUnsupportedError("agreement.send", string(compatibility.Tier), compatibility.Reason, map[string]any{
				"agreement_id": agreement.ID,
				"document_id":  document.ID,
			})
		}

		validationStartedAt := time.Now()
		validation, err := txSvc.ValidateBeforeSend(ctx, scope, agreementID)
		if err != nil {
			LogSendPhaseDuration("agreement_service", "validation_failed", validationStartedAt, SendDebugFields(scope, correlationID, map[string]any{
				"agreement_id": strings.TrimSpace(agreement.ID),
				"error":        strings.TrimSpace(err.Error()),
			}))
			return err
		}
		LogSendPhaseDuration("agreement_service", "validation_complete", validationStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"agreement_id":     strings.TrimSpace(agreement.ID),
			"recipient_count":  validation.RecipientCount,
			"field_count":      validation.FieldCount,
			"validation_valid": validation.Valid,
		}))
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
		transitionStartedAt := time.Now()
		transitioned, err := txSvc.agreements.Transition(ctx, scope, agreementID, stores.AgreementTransitionInput{
			ToStatus:        stores.AgreementStatusSent,
			ExpectedVersion: agreement.Version,
		})
		if err != nil {
			LogSendPhaseDuration("agreement_service", "transition_failed", transitionStartedAt, SendDebugFields(scope, correlationID, map[string]any{
				"agreement_id": strings.TrimSpace(agreement.ID),
				"error":        strings.TrimSpace(err.Error()),
			}))
			return err
		}
		LogSendPhaseDuration("agreement_service", "transition_complete", transitionStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"agreement_id": strings.TrimSpace(transitioned.ID),
			"status":       strings.TrimSpace(transitioned.Status),
			"version":      transitioned.Version,
		}))
		result = transitioned
		reminderStartedAt := time.Now()
		if err := txSvc.initializeReminderStatesForSend(ctx, scope, transitioned, recipients); err != nil {
			LogSendPhaseDuration("agreement_service", "reminder_init_failed", reminderStartedAt, SendDebugFields(scope, correlationID, map[string]any{
				"agreement_id": strings.TrimSpace(transitioned.ID),
				"error":        strings.TrimSpace(err.Error()),
			}))
			return err
		}
		LogSendPhaseDuration("agreement_service", "reminder_init_complete", reminderStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"agreement_id":    strings.TrimSpace(transitioned.ID),
			"recipient_count": len(recipients),
		}))

		activeRecipientIDs := recipientIDs(activeSigners)
		pendingByRecipient := map[string]stores.IssuedSigningToken{}
		pendingRecipientIDs := make([]string, 0, len(activeSigners))
		tokenIssueStartedAt := time.Now()
		for _, activeSigner := range activeSigners {
			issued, issueErr := txSvc.tokens.IssuePending(ctx, scope, agreementID, activeSigner.ID)
			if issueErr != nil {
				return issueErr
			}
			pendingByRecipient[activeSigner.ID] = issued
			pendingRecipientIDs = append(pendingRecipientIDs, activeSigner.ID)
		}
		LogSendPhaseDuration("agreement_service", "token_issuance_complete", tokenIssueStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"agreement_id":           strings.TrimSpace(agreement.ID),
			"issued_recipient_count": len(pendingRecipientIDs),
			"active_stage":           activeStage,
		}))
		auditStartedAt := time.Now()
		if err := txSvc.appendAuditEventWithIP(ctx, scope, transitioned.ID, "agreement.sent", "system", "", input.IPAddress, map[string]any{
			"idempotency_key":          strings.TrimSpace(input.IdempotencyKey),
			"status":                   transitioned.Status,
			"workflow_kind":            strings.TrimSpace(transitioned.WorkflowKind),
			"root_agreement_id":        strings.TrimSpace(transitioned.RootAgreementID),
			"parent_agreement_id":      strings.TrimSpace(transitioned.ParentAgreementID),
			"parent_executed_sha256":   strings.TrimSpace(transitioned.ParentExecutedSHA256),
			"change_summary":           cloneAnyMap(changeSummary),
			"pdf_compatibility_tier":   strings.TrimSpace(string(sendCompatibilityTier)),
			"pdf_compatibility_reason": strings.TrimSpace(sendCompatibilityReason),
			"active_stage":             activeStage,
			"active_recipient_id":      coalesceFirst(activeRecipientIDs),
			"active_recipient_ids": func() []string {
				return append([]string{}, activeRecipientIDs...)
			}(),
			"issued_recipient_ids": func() []string {
				return append([]string{}, pendingRecipientIDs...)
			}(),
		}); err != nil {
			LogSendPhaseDuration("agreement_service", "audit_failed", auditStartedAt, SendDebugFields(scope, correlationID, map[string]any{
				"agreement_id": strings.TrimSpace(transitioned.ID),
				"error":        strings.TrimSpace(err.Error()),
			}))
			return err
		}
		LogSendPhaseDuration("agreement_service", "audit_complete", auditStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"agreement_id": strings.TrimSpace(transitioned.ID),
			"active_stage": activeStage,
		}))
		if sendCompatibilityTier == PDFCompatibilityTierLimited {
			if err := txSvc.appendAuditEvent(ctx, scope, transitioned.ID, "agreement.send_degraded_preview", "system", "", map[string]any{
				"pdf_compatibility_tier":   strings.TrimSpace(string(sendCompatibilityTier)),
				"pdf_compatibility_reason": strings.TrimSpace(sendCompatibilityReason),
				"idempotency_key":          strings.TrimSpace(input.IdempotencyKey),
			}); err != nil {
				return err
			}
		}
		outboxStartedAt := time.Now()
		enqueuedCount := 0
		for _, activeSigner := range activeSigners {
			issued := pendingByRecipient[activeSigner.ID]
			notification := AgreementNotification{
				AgreementID:   transitioned.ID,
				RecipientID:   activeSigner.ID,
				CorrelationID: correlationID,
				Type:          NotificationSigningInvitation,
				Token:         issued,
			}
			_, replayed, effectErr := txSvc.prepareAgreementNotificationEffect(
				ctx,
				scope,
				GuardedEffectKindAgreementSendInvitation,
				notification,
				AgreementSendNotificationFailedAuditEvent,
				idempotencyKey,
			)
			if effectErr != nil {
				LogSendPhaseDuration("agreement_service", "outbox_enqueue_failed", outboxStartedAt, SendDebugFields(scope, correlationID, map[string]any{
					"agreement_id": strings.TrimSpace(transitioned.ID),
					"recipient_id": strings.TrimSpace(activeSigner.ID),
					"error":        strings.TrimSpace(effectErr.Error()),
				}))
				return effectErr
			}
			if !replayed {
				enqueuedCount++
			}
		}
		transitioned, _, err = ApplyAgreementNotificationSummary(ctx, txSvc.agreements, txSvc.effects, scope, transitioned.ID)
		if err != nil {
			return err
		}
		if workflowKind == stores.AgreementWorkflowKindCorrection && strings.TrimSpace(parentAgreement.ID) != "" {
			parentRecipients, err := txSvc.agreements.ListRecipients(ctx, scope, parentAgreement.ID)
			if err != nil {
				return err
			}
			for _, recipient := range parentRecipients {
				if recipient.Role != stores.RecipientRoleSigner {
					continue
				}
				if err := txSvc.tokens.Revoke(ctx, scope, parentAgreement.ID, recipient.ID); err != nil {
					return err
				}
			}
			parentAgreement, err = txSvc.agreements.Transition(ctx, scope, parentAgreement.ID, stores.AgreementTransitionInput{
				ToStatus:        stores.AgreementStatusVoided,
				ExpectedVersion: parentAgreement.Version,
			})
			if err != nil {
				return err
			}
			if err := txSvc.appendAuditEventWithIP(ctx, scope, parentAgreement.ID, "agreement.voided", "system", "", input.IPAddress, map[string]any{
				"reason":           "superseded_by_correction",
				"revoke_tokens":    true,
				"superseded_by_id": strings.TrimSpace(transitioned.ID),
				"workflow_kind":    strings.TrimSpace(transitioned.WorkflowKind),
			}); err != nil {
				return err
			}
			if err := txSvc.appendAuditEventWithIP(ctx, scope, parentAgreement.ID, "agreement.superseded_by_correction", "system", "", input.IPAddress, map[string]any{
				"new_agreement_id":    strings.TrimSpace(transitioned.ID),
				"source_agreement_id": strings.TrimSpace(parentAgreement.ID),
				"root_agreement_id":   strings.TrimSpace(transitioned.RootAgreementID),
				"parent_agreement_id": strings.TrimSpace(transitioned.ParentAgreementID),
				"workflow_kind":       strings.TrimSpace(transitioned.WorkflowKind),
				"change_summary":      cloneAnyMap(changeSummary),
				"new_document_id":     strings.TrimSpace(transitioned.DocumentID),
				"new_document_sha256": strings.TrimSpace(fmt.Sprint(changeSummary["new_document_sha256"])),
				"old_document_id":     strings.TrimSpace(parentAgreement.DocumentID),
				"old_document_sha256": strings.TrimSpace(fmt.Sprint(changeSummary["old_document_sha256"])),
			}); err != nil {
				return err
			}
		}
		result = transitioned
		LogSendPhaseDuration("agreement_service", "outbox_enqueue_complete", outboxStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"agreement_id":   strings.TrimSpace(transitioned.ID),
			"enqueued_count": enqueuedCount,
			"active_signers": len(activeSigners),
		}))
		if len(activeSigners) > 0 && hooks != nil && s.notificationDispatch != nil {
			hooks.AfterCommit(func() error {
				s.notificationDispatch.NotifyScope(scope)
				return nil
			})
			LogSendDebug("agreement_service", "after_commit_notify_registered", SendDebugFields(scope, correlationID, map[string]any{
				"agreement_id":   strings.TrimSpace(transitioned.ID),
				"enqueued_count": enqueuedCount,
			}))
		}
		return nil
	}); err != nil {
		LogSendPhaseDuration("agreement_service", "send_failed", sendStartedAt, SendDebugFields(scope, correlationID, map[string]any{
			"agreement_id":    strings.TrimSpace(agreementID),
			"idempotency_key": idempotencyKey,
			"error":           strings.TrimSpace(err.Error()),
		}))
		if replay, ok, replayErr := s.resolveSendReplayFromAudit(ctx, scope, agreementID, idempotencyKey); replayErr == nil && ok {
			return replay, nil
		}
		return stores.AgreementRecord{}, err
	}
	LogSendPhaseDuration("agreement_service", "send_complete", sendStartedAt, SendDebugFields(scope, correlationID, map[string]any{
		"agreement_id":         strings.TrimSpace(result.ID),
		"idempotency_key":      idempotencyKey,
		"compatibility_tier":   strings.TrimSpace(string(sendCompatibilityTier)),
		"compatibility_reason": strings.TrimSpace(sendCompatibilityReason),
	}))
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
			return txSvc.appendAuditEventWithIP(ctx, scope, transitioned.ID, "agreement.voided", "system", "", input.IPAddress, map[string]any{
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
		return txSvc.appendAuditEventWithIP(ctx, scope, transitioned.ID, "agreement.voided", "system", "", input.IPAddress, map[string]any{
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

		return txSvc.appendAuditEventWithIP(ctx, scope, transitioned.ID, "agreement.expired", "system", "", input.IPAddress, map[string]any{
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
		resendSource := normalizeResendSource(input.Source)
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

		issued, err := txSvc.tokens.IssuePending(ctx, scope, agreementID, target.ID)
		if err != nil {
			return err
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, agreement.ID, "agreement.resent", "system", "", input.IPAddress, map[string]any{
			"recipient_id":              target.ID,
			"active_stage":              activeStage,
			"active_recipient_id":       coalesceFirst(activeRecipientIDs),
			"active_recipient_ids":      activeRecipientIDs,
			"rotate_token":              input.RotateToken,
			"invalidate_existing":       input.InvalidateExisting,
			"allow_out_of_order_resend": input.AllowOutOfOrderResend,
			"source":                    resendSource,
			"token_id":                  issued.Record.ID,
		}); err != nil {
			return err
		}
		if err := txSvc.recordReminderResendState(ctx, scope, agreement, target, resendSource, input.ReminderLease, input.ReminderLeaseSeconds); err != nil {
			return err
		}
		notification := AgreementNotification{
			AgreementID:   agreement.ID,
			RecipientID:   target.ID,
			CorrelationID: strings.TrimSpace(input.IdempotencyKey),
			Type:          NotificationSigningReminder,
			Token:         issued,
		}
		effect, _, err := txSvc.prepareAgreementNotificationEffect(
			ctx,
			scope,
			GuardedEffectKindAgreementResendReminder,
			notification,
			AgreementResendNotificationFailedAuditEvent,
			strings.TrimSpace(input.IdempotencyKey),
		)
		if err != nil {
			return err
		}
		agreement, _, err = ApplyAgreementNotificationSummary(ctx, txSvc.agreements, txSvc.effects, scope, agreement.ID)
		if err != nil {
			return err
		}
		if hooks != nil && s.notificationDispatch != nil {
			hooks.AfterCommit(func() error {
				s.notificationDispatch.NotifyScope(scope)
				return nil
			})
		}
		result = ResendResult{
			Agreement:       agreement,
			Recipient:       target,
			ActiveRecipient: activeSigners[0],
			Token:           issued,
			Effects:         []AgreementNotificationEffectDetail{AgreementNotificationEffectDetailFromRecord(effect)},
		}
		return nil
	}); err != nil {
		return ResendResult{}, err
	}
	return result, nil
}

// CompletionDeliveryRecipients returns recipients opted-in for final artifact delivery after completion.
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
		if recipient.Notify {
			out = append(out, recipient)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].SigningOrder == out[j].SigningOrder {
			return strings.TrimSpace(out[i].ID) < strings.TrimSpace(out[j].ID)
		}
		return out[i].SigningOrder < out[j].SigningOrder
	})
	return out, nil
}

func participantPatchFromRecipientPatch(patch stores.RecipientDraftPatch) stores.ParticipantDraftPatch {
	out := stores.ParticipantDraftPatch{
		ID:     patch.ID,
		Email:  patch.Email,
		Name:   patch.Name,
		Role:   patch.Role,
		Notify: patch.Notify,
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
		Notify:        record.Notify,
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
	if patch.Notify != nil {
		rec.Notify = *patch.Notify
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

func normalizeAgreementRevisionKind(kind AgreementRevisionKind) AgreementRevisionKind {
	switch AgreementRevisionKind(strings.ToLower(strings.TrimSpace(string(kind)))) {
	case AgreementRevisionKindCorrection:
		return AgreementRevisionKindCorrection
	case AgreementRevisionKindAmendment:
		return AgreementRevisionKindAmendment
	default:
		return ""
	}
}

func (s AgreementService) revisionRequestHash(sourceAgreementID string, kind AgreementRevisionKind, actorID string) string {
	return strings.Join([]string{
		strings.TrimSpace(sourceAgreementID),
		strings.TrimSpace(string(kind)),
		strings.TrimSpace(actorID),
	}, "|")
}

func validateSourceAgreementForRevision(source stores.AgreementRecord, kind AgreementRevisionKind) error {
	switch kind {
	case AgreementRevisionKindCorrection:
		if source.Status != stores.AgreementStatusSent && source.Status != stores.AgreementStatusInProgress {
			return domainValidationError("agreements", "status", "correction requires sent or in_progress status")
		}
	case AgreementRevisionKindAmendment:
		if source.Status != stores.AgreementStatusCompleted {
			return domainValidationError("agreements", "status", "amendment requires completed status")
		}
	default:
		return domainValidationError("agreements", "revision_kind", "unsupported revision kind")
	}
	return nil
}

func (s AgreementService) resolveParentExecutedSHA256(ctx context.Context, scope stores.Scope, source stores.AgreementRecord, kind AgreementRevisionKind) (string, error) {
	if kind != AgreementRevisionKindAmendment {
		return "", nil
	}
	store, ok := s.agreements.(stores.AgreementArtifactStore)
	if !ok || store == nil {
		return "", domainValidationError("artifacts", "store", "not configured")
	}
	record, err := store.GetAgreementArtifacts(ctx, scope, strings.TrimSpace(source.ID))
	if err != nil {
		return "", err
	}
	sha := strings.TrimSpace(record.ExecutedSHA256)
	if sha == "" {
		return "", domainValidationError("artifacts", "executed_sha256", "completed agreement executed artifact required before amendment")
	}
	return sha, nil
}

func (s AgreementService) copyRevisionAuthoringState(ctx context.Context, scope stores.Scope, source, target stores.AgreementRecord) error {
	participants, err := s.agreements.ListParticipants(ctx, scope, source.ID)
	if err != nil {
		return err
	}
	definitions, err := s.agreements.ListFieldDefinitions(ctx, scope, source.ID)
	if err != nil {
		return err
	}
	instances, err := s.agreements.ListFieldInstances(ctx, scope, source.ID)
	if err != nil {
		return err
	}

	participantIDs := map[string]string{}
	for _, participant := range participants {
		email := strings.TrimSpace(participant.Email)
		name := strings.TrimSpace(participant.Name)
		role := strings.TrimSpace(participant.Role)
		stage := participant.SigningStage
		notify := participant.Notify
		cloned, err := s.agreements.UpsertParticipantDraft(ctx, scope, target.ID, stores.ParticipantDraftPatch{
			Email:        &email,
			Name:         &name,
			Role:         &role,
			Notify:       &notify,
			SigningStage: &stage,
		}, 0)
		if err != nil {
			return err
		}
		participantIDs[strings.TrimSpace(participant.ID)] = strings.TrimSpace(cloned.ID)
	}

	definitionIDs := map[string]string{}
	for _, definition := range definitions {
		participantID := strings.TrimSpace(participantIDs[strings.TrimSpace(definition.ParticipantID)])
		fieldType := strings.TrimSpace(definition.Type)
		required := definition.Required
		validationJSON := strings.TrimSpace(definition.ValidationJSON)
		cloned, err := s.agreements.UpsertFieldDefinitionDraft(ctx, scope, target.ID, stores.FieldDefinitionDraftPatch{
			ParticipantID:  &participantID,
			Type:           &fieldType,
			Required:       &required,
			ValidationJSON: &validationJSON,
		})
		if err != nil {
			return err
		}
		definitionIDs[strings.TrimSpace(definition.ID)] = strings.TrimSpace(cloned.ID)
	}

	instanceIDs := map[string]string{}
	type linkedFieldUpdate struct {
		instanceID        string
		fieldDefinitionID string
		linkedFromFieldID string
	}
	pendingLinkedUpdates := make([]linkedFieldUpdate, 0)
	for _, instance := range instances {
		fieldDefinitionID := strings.TrimSpace(definitionIDs[strings.TrimSpace(instance.FieldDefinitionID)])
		pageNumber := instance.PageNumber
		x := instance.X
		y := instance.Y
		width := instance.Width
		height := instance.Height
		tabIndex := instance.TabIndex
		label := strings.TrimSpace(instance.Label)
		appearanceJSON := strings.TrimSpace(instance.AppearanceJSON)
		placementSource := strings.TrimSpace(instance.PlacementSource)
		resolverID := strings.TrimSpace(instance.ResolverID)
		confidence := instance.Confidence
		placementRunID := strings.TrimSpace(instance.PlacementRunID)
		manualOverride := instance.ManualOverride
		linkGroupID := strings.TrimSpace(instance.LinkGroupID)
		isUnlinked := instance.IsUnlinked
		cloned, err := s.agreements.UpsertFieldInstanceDraft(ctx, scope, target.ID, stores.FieldInstanceDraftPatch{
			FieldDefinitionID: &fieldDefinitionID,
			PageNumber:        &pageNumber,
			X:                 &x,
			Y:                 &y,
			Width:             &width,
			Height:            &height,
			TabIndex:          &tabIndex,
			Label:             &label,
			AppearanceJSON:    &appearanceJSON,
			PlacementSource:   &placementSource,
			ResolverID:        &resolverID,
			Confidence:        &confidence,
			PlacementRunID:    &placementRunID,
			ManualOverride:    &manualOverride,
			LinkGroupID:       &linkGroupID,
			IsUnlinked:        &isUnlinked,
		})
		if err != nil {
			return err
		}
		instanceIDs[strings.TrimSpace(instance.ID)] = strings.TrimSpace(cloned.ID)
		if strings.TrimSpace(instance.LinkedFromFieldID) != "" {
			pendingLinkedUpdates = append(pendingLinkedUpdates, linkedFieldUpdate{
				instanceID:        strings.TrimSpace(cloned.ID),
				fieldDefinitionID: fieldDefinitionID,
				linkedFromFieldID: strings.TrimSpace(instance.LinkedFromFieldID),
			})
		}
	}
	for _, pending := range pendingLinkedUpdates {
		linkedFromFieldID := strings.TrimSpace(instanceIDs[pending.linkedFromFieldID])
		if linkedFromFieldID == "" {
			continue
		}
		if _, err := s.agreements.UpsertFieldInstanceDraft(ctx, scope, target.ID, stores.FieldInstanceDraftPatch{
			ID:                strings.TrimSpace(pending.instanceID),
			FieldDefinitionID: &pending.fieldDefinitionID,
			LinkedFromFieldID: &linkedFromFieldID,
		}); err != nil {
			return err
		}
	}
	return nil
}

func cloneAnyMap(in map[string]any) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]any, len(in))
	maps.Copy(out, in)
	return out
}

type comparableParticipant struct {
	ID           string
	Email        string
	Name         string
	Role         string
	SigningStage int
	Notify       bool
}

type comparableField struct {
	ID              string
	ParticipantKey  string
	Type            string
	Required        bool
	PageNumber      int
	X               float64
	Y               float64
	Width           float64
	Height          float64
	TabIndex        int
	Label           string
	PlacementSource string
	LinkGroupID     string
	IsUnlinked      bool
}

func (s AgreementService) buildAgreementChangeSummary(ctx context.Context, scope stores.Scope, source, target stores.AgreementRecord) (map[string]any, error) {
	oldDocumentSHA, err := s.documentSHA256(ctx, scope, strings.TrimSpace(source.DocumentID))
	if err != nil {
		return nil, err
	}
	newDocumentSHA, err := s.documentSHA256(ctx, scope, strings.TrimSpace(target.DocumentID))
	if err != nil {
		return nil, err
	}
	sourceParticipants, err := s.agreements.ListParticipants(ctx, scope, strings.TrimSpace(source.ID))
	if err != nil {
		return nil, err
	}
	targetParticipants, err := s.agreements.ListParticipants(ctx, scope, strings.TrimSpace(target.ID))
	if err != nil {
		return nil, err
	}
	sourceDefinitions, err := s.agreements.ListFieldDefinitions(ctx, scope, strings.TrimSpace(source.ID))
	if err != nil {
		return nil, err
	}
	targetDefinitions, err := s.agreements.ListFieldDefinitions(ctx, scope, strings.TrimSpace(target.ID))
	if err != nil {
		return nil, err
	}
	sourceInstances, err := s.agreements.ListFieldInstances(ctx, scope, strings.TrimSpace(source.ID))
	if err != nil {
		return nil, err
	}
	targetInstances, err := s.agreements.ListFieldInstances(ctx, scope, strings.TrimSpace(target.ID))
	if err != nil {
		return nil, err
	}

	participantChanges := diffComparableParticipants(sourceParticipants, targetParticipants)
	fieldChanges := diffComparableFields(sourceParticipants, sourceDefinitions, sourceInstances, targetParticipants, targetDefinitions, targetInstances)
	return map[string]any{
		"document_changed":    strings.TrimSpace(source.DocumentID) != strings.TrimSpace(target.DocumentID) || oldDocumentSHA != newDocumentSHA,
		"title_changed":       strings.TrimSpace(source.Title) != strings.TrimSpace(target.Title),
		"message_changed":     strings.TrimSpace(source.Message) != strings.TrimSpace(target.Message),
		"old_document_id":     strings.TrimSpace(source.DocumentID),
		"new_document_id":     strings.TrimSpace(target.DocumentID),
		"old_document_sha256": oldDocumentSHA,
		"new_document_sha256": newDocumentSHA,
		"participants":        participantChanges,
		"fields":              fieldChanges,
		"document": map[string]any{
			"old_document_id": strings.TrimSpace(source.DocumentID),
			"new_document_id": strings.TrimSpace(target.DocumentID),
			"old_sha256":      oldDocumentSHA,
			"new_sha256":      newDocumentSHA,
		},
	}, nil
}

func (s AgreementService) documentSHA256(ctx context.Context, scope stores.Scope, documentID string) (string, error) {
	documentID = strings.TrimSpace(documentID)
	if documentID == "" {
		return "", nil
	}
	if s.documents == nil {
		return "", domainValidationError("documents", "store", "not configured")
	}
	record, err := s.documents.Get(ctx, scope, documentID)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(record.SourceSHA256), nil
}

func diffComparableParticipants(source, target []stores.ParticipantRecord) map[string]any {
	left := comparableParticipants(source)
	right := comparableParticipants(target)
	added := make([]map[string]any, 0)
	removed := make([]map[string]any, 0)
	updated := make([]map[string]any, 0)
	matches := matchComparableParticipants(left, right)
	matchedLeft := map[int]int{}
	matchedRight := map[int]int{}
	for _, match := range matches {
		matchedLeft[match.LeftIndex] = match.RightIndex
		matchedRight[match.RightIndex] = match.LeftIndex
		changedFields := comparableParticipantChangedFields(left[match.LeftIndex], right[match.RightIndex])
		if len(changedFields) == 0 {
			continue
		}
		updated = append(updated, map[string]any{
			"participant_id": right[match.RightIndex].ID,
			"fields":         changedFields,
		})
	}
	for index := range left {
		if _, ok := matchedLeft[index]; ok {
			continue
		}
		removed = append(removed, comparableParticipantMap(left[index]))
	}
	for index := range right {
		if _, ok := matchedRight[index]; ok {
			continue
		}
		added = append(added, comparableParticipantMap(right[index]))
	}
	return map[string]any{
		"added":   added,
		"removed": removed,
		"updated": updated,
	}
}

func comparableParticipants(records []stores.ParticipantRecord) []comparableParticipant {
	out := make([]comparableParticipant, 0, len(records))
	for _, record := range records {
		stage := record.SigningStage
		if stage <= 0 {
			stage = 1
		}
		out = append(out, comparableParticipant{
			ID:           strings.TrimSpace(record.ID),
			Email:        strings.TrimSpace(record.Email),
			Name:         strings.TrimSpace(record.Name),
			Role:         strings.TrimSpace(record.Role),
			SigningStage: stage,
			Notify:       record.Notify,
		})
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].SigningStage == out[j].SigningStage {
			if out[i].Role == out[j].Role {
				if out[i].Email == out[j].Email {
					return out[i].Name < out[j].Name
				}
				return out[i].Email < out[j].Email
			}
			return out[i].Role < out[j].Role
		}
		return out[i].SigningStage < out[j].SigningStage
	})
	return out
}

func comparableParticipantMap(record comparableParticipant) map[string]any {
	return map[string]any{
		"participant_id": record.ID,
		"email":          record.Email,
		"name":           record.Name,
		"role":           record.Role,
		"signing_stage":  record.SigningStage,
		"notify":         record.Notify,
	}
}

func comparableParticipantChangedFields(left, right comparableParticipant) []string {
	changed := make([]string, 0)
	if left.Email != right.Email {
		changed = append(changed, "email")
	}
	if left.Name != right.Name {
		changed = append(changed, "name")
	}
	if left.Role != right.Role {
		changed = append(changed, "role")
	}
	if left.SigningStage != right.SigningStage {
		changed = append(changed, "signing_stage")
	}
	if left.Notify != right.Notify {
		changed = append(changed, "notify")
	}
	return changed
}

func diffComparableFields(
	sourceParticipants []stores.ParticipantRecord,
	sourceDefinitions []stores.FieldDefinitionRecord,
	sourceInstances []stores.FieldInstanceRecord,
	targetParticipants []stores.ParticipantRecord,
	targetDefinitions []stores.FieldDefinitionRecord,
	targetInstances []stores.FieldInstanceRecord,
) map[string]any {
	left := comparableFields(sourceParticipants, sourceDefinitions, sourceInstances)
	right := comparableFields(targetParticipants, targetDefinitions, targetInstances)
	added := make([]string, 0)
	removed := make([]string, 0)
	moved := make([]map[string]any, 0)
	updated := make([]map[string]any, 0)
	matches := matchComparableFields(left, right)
	matchedLeft := map[int]int{}
	matchedRight := map[int]int{}
	for _, match := range matches {
		matchedLeft[match.LeftIndex] = match.RightIndex
		matchedRight[match.RightIndex] = match.LeftIndex
		changedFields, movedFields := comparableFieldChangedFields(left[match.LeftIndex], right[match.RightIndex])
		if movedFields {
			moved = append(moved, map[string]any{
				"field_id": right[match.RightIndex].ID,
				"from": map[string]any{
					"page":   left[match.LeftIndex].PageNumber,
					"x":      left[match.LeftIndex].X,
					"y":      left[match.LeftIndex].Y,
					"width":  left[match.LeftIndex].Width,
					"height": left[match.LeftIndex].Height,
				},
				"to": map[string]any{
					"page":   right[match.RightIndex].PageNumber,
					"x":      right[match.RightIndex].X,
					"y":      right[match.RightIndex].Y,
					"width":  right[match.RightIndex].Width,
					"height": right[match.RightIndex].Height,
				},
			})
		}
		if len(changedFields) > 0 {
			updated = append(updated, map[string]any{
				"field_id": right[match.RightIndex].ID,
				"fields":   changedFields,
			})
		}
	}
	for index := range left {
		if _, ok := matchedLeft[index]; ok {
			continue
		}
		removed = append(removed, left[index].ID)
	}
	for index := range right {
		if _, ok := matchedRight[index]; ok {
			continue
		}
		added = append(added, right[index].ID)
	}
	return map[string]any{
		"added":   added,
		"removed": removed,
		"moved":   moved,
		"updated": updated,
	}
}

func comparableFields(
	participants []stores.ParticipantRecord,
	definitions []stores.FieldDefinitionRecord,
	instances []stores.FieldInstanceRecord,
) []comparableField {
	participantKeyByID := map[string]string{}
	for _, participant := range comparableParticipants(participants) {
		participantKeyByID[strings.TrimSpace(participant.ID)] = strings.Join([]string{
			fmt.Sprintf("%d", participant.SigningStage),
			participant.Role,
			participant.Email,
			participant.Name,
		}, "|")
	}
	definitionByID := map[string]stores.FieldDefinitionRecord{}
	for _, definition := range definitions {
		definitionByID[strings.TrimSpace(definition.ID)] = definition
	}
	out := make([]comparableField, 0, len(instances))
	for _, instance := range instances {
		definition, ok := definitionByID[strings.TrimSpace(instance.FieldDefinitionID)]
		if !ok {
			continue
		}
		out = append(out, comparableField{
			ID:              strings.TrimSpace(instance.ID),
			ParticipantKey:  participantKeyByID[strings.TrimSpace(definition.ParticipantID)],
			Type:            strings.TrimSpace(definition.Type),
			Required:        definition.Required,
			PageNumber:      instance.PageNumber,
			X:               instance.X,
			Y:               instance.Y,
			Width:           instance.Width,
			Height:          instance.Height,
			TabIndex:        instance.TabIndex,
			Label:           strings.TrimSpace(instance.Label),
			PlacementSource: strings.TrimSpace(instance.PlacementSource),
			LinkGroupID:     strings.TrimSpace(instance.LinkGroupID),
			IsUnlinked:      instance.IsUnlinked,
		})
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].ParticipantKey == out[j].ParticipantKey {
			if out[i].Type == out[j].Type {
				if out[i].PageNumber == out[j].PageNumber {
					if out[i].Y == out[j].Y {
						return out[i].X < out[j].X
					}
					return out[i].Y < out[j].Y
				}
				return out[i].PageNumber < out[j].PageNumber
			}
			return out[i].Type < out[j].Type
		}
		return out[i].ParticipantKey < out[j].ParticipantKey
	})
	return out
}

func comparableFieldChangedFields(left, right comparableField) ([]string, bool) {
	changed := make([]string, 0)
	moved := false
	if left.ParticipantKey != right.ParticipantKey {
		changed = append(changed, "participant")
	}
	if left.Type != right.Type {
		changed = append(changed, "type")
	}
	if left.Required != right.Required {
		changed = append(changed, "required")
	}
	if left.PageNumber != right.PageNumber {
		changed = append(changed, "page_number")
		moved = true
	}
	if left.X != right.X {
		changed = append(changed, "x")
		moved = true
	}
	if left.Y != right.Y {
		changed = append(changed, "y")
		moved = true
	}
	if left.Width != right.Width {
		changed = append(changed, "width")
		moved = true
	}
	if left.Height != right.Height {
		changed = append(changed, "height")
		moved = true
	}
	if left.TabIndex != right.TabIndex {
		changed = append(changed, "tab_index")
	}
	if left.Label != right.Label {
		changed = append(changed, "label")
	}
	if left.PlacementSource != right.PlacementSource {
		changed = append(changed, "placement_source")
	}
	if left.LinkGroupID != right.LinkGroupID {
		changed = append(changed, "link_group_id")
	}
	if left.IsUnlinked != right.IsUnlinked {
		changed = append(changed, "is_unlinked")
	}
	return changed, moved
}

type comparableMatch struct {
	LeftIndex  int
	RightIndex int
	Score      int
}

func matchComparableParticipants(left, right []comparableParticipant) []comparableMatch {
	return matchComparableRecords(
		len(left),
		len(right),
		func(index int) string { return comparableParticipantExactKey(left[index]) },
		func(index int) string { return comparableParticipantExactKey(right[index]) },
		func(leftIndex, rightIndex int) int {
			return comparableParticipantMatchScore(left[leftIndex], right[rightIndex])
		},
		6,
	)
}

func comparableParticipantExactKey(record comparableParticipant) string {
	return strings.Join([]string{
		record.Email,
		record.Name,
		record.Role,
		fmt.Sprintf("%d", record.SigningStage),
		fmt.Sprintf("%t", record.Notify),
	}, "|")
}

func comparableParticipantMatchScore(left, right comparableParticipant) int {
	score := 0
	if left.Email != "" && right.Email != "" && left.Email == right.Email {
		score += 8
	}
	if left.Name != "" && right.Name != "" && left.Name == right.Name {
		score += 4
	}
	if left.Role == right.Role {
		score += 2
	}
	if left.SigningStage == right.SigningStage {
		score += 2
	}
	if left.Notify == right.Notify {
		score++
	}
	return score
}

func matchComparableFields(left, right []comparableField) []comparableMatch {
	return matchComparableRecords(
		len(left),
		len(right),
		func(index int) string { return comparableFieldIdentityKey(left[index]) },
		func(index int) string { return comparableFieldIdentityKey(right[index]) },
		func(leftIndex, rightIndex int) int {
			return comparableFieldMatchScore(left[leftIndex], right[rightIndex])
		},
		10,
	)
}

func comparableFieldIdentityKey(record comparableField) string {
	return strings.Join([]string{
		record.ParticipantKey,
		record.Type,
		fmt.Sprintf("%t", record.Required),
		record.Label,
		fmt.Sprintf("%d", record.TabIndex),
		record.PlacementSource,
		record.LinkGroupID,
		fmt.Sprintf("%t", record.IsUnlinked),
	}, "|")
}

func comparableFieldMatchScore(left, right comparableField) int {
	score := 0
	if left.ParticipantKey != "" && left.ParticipantKey == right.ParticipantKey {
		score += 8
	}
	if left.Type == right.Type {
		score += 6
	}
	if left.Label != "" && right.Label != "" && left.Label == right.Label {
		score += 4
	}
	if left.Required == right.Required {
		score += 2
	}
	if left.LinkGroupID != "" && right.LinkGroupID != "" && left.LinkGroupID == right.LinkGroupID {
		score += 2
	}
	if left.TabIndex == right.TabIndex {
		score++
	}
	if left.PlacementSource == right.PlacementSource {
		score++
	}
	if left.IsUnlinked == right.IsUnlinked {
		score++
	}
	return score
}

func matchComparableRecords(
	leftLen, rightLen int,
	leftExactKey func(index int) string,
	rightExactKey func(index int) string,
	score func(leftIndex, rightIndex int) int,
	threshold int,
) []comparableMatch {
	matches := make([]comparableMatch, 0)
	if leftLen == 0 || rightLen == 0 {
		return matches
	}
	leftMatched := make([]bool, leftLen)
	rightMatched := make([]bool, rightLen)

	type exactBucket struct {
		leftIndexes  []int
		rightIndexes []int
	}
	buckets := map[string]*exactBucket{}
	for index := range leftLen {
		key := strings.TrimSpace(leftExactKey(index))
		if key == "" {
			continue
		}
		bucket := buckets[key]
		if bucket == nil {
			bucket = &exactBucket{}
			buckets[key] = bucket
		}
		bucket.leftIndexes = append(bucket.leftIndexes, index)
	}
	for index := range rightLen {
		key := strings.TrimSpace(rightExactKey(index))
		if key == "" {
			continue
		}
		bucket := buckets[key]
		if bucket == nil {
			bucket = &exactBucket{}
			buckets[key] = bucket
		}
		bucket.rightIndexes = append(bucket.rightIndexes, index)
	}
	for _, bucket := range buckets {
		limit := min(len(bucket.rightIndexes), len(bucket.leftIndexes))
		for index := range limit {
			leftIndex := bucket.leftIndexes[index]
			rightIndex := bucket.rightIndexes[index]
			leftMatched[leftIndex] = true
			rightMatched[rightIndex] = true
			matches = append(matches, comparableMatch{
				LeftIndex:  leftIndex,
				RightIndex: rightIndex,
				Score:      score(leftIndex, rightIndex),
			})
		}
	}

	candidates := make([]comparableMatch, 0)
	for leftIndex := range leftLen {
		if leftMatched[leftIndex] {
			continue
		}
		for rightIndex := range rightLen {
			if rightMatched[rightIndex] {
				continue
			}
			matchScore := score(leftIndex, rightIndex)
			if matchScore < threshold {
				continue
			}
			candidates = append(candidates, comparableMatch{
				LeftIndex:  leftIndex,
				RightIndex: rightIndex,
				Score:      matchScore,
			})
		}
	}
	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].Score == candidates[j].Score {
			if candidates[i].LeftIndex == candidates[j].LeftIndex {
				return candidates[i].RightIndex < candidates[j].RightIndex
			}
			return candidates[i].LeftIndex < candidates[j].LeftIndex
		}
		return candidates[i].Score > candidates[j].Score
	})
	for _, candidate := range candidates {
		if leftMatched[candidate.LeftIndex] || rightMatched[candidate.RightIndex] {
			continue
		}
		leftMatched[candidate.LeftIndex] = true
		rightMatched[candidate.RightIndex] = true
		matches = append(matches, candidate)
	}
	sort.SliceStable(matches, func(i, j int) bool {
		return matches[i].LeftIndex < matches[j].LeftIndex
	})
	return matches
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

func ptrString(value string) *string {
	out := value
	return &out
}

func agreementTimePtr(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	value = value.UTC()
	return &value
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
	return s.appendAuditEventWithIP(ctx, scope, agreementID, eventType, actorType, actorID, "", metadata)
}

func (s AgreementService) appendAuditEventWithIP(
	ctx context.Context,
	scope stores.Scope,
	agreementID,
	eventType,
	actorType,
	actorID,
	ipAddress string,
	metadata map[string]any,
) error {
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
		IPAddress:    ResolveAuditIPAddress(ipAddress),
		MetadataJSON: string(encoded),
		CreatedAt:    s.now(),
	})
	return err
}
