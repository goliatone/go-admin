package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

const (
	// DefaultDraftTTL defines wizard draft expiry from the last successful write.
	DefaultDraftTTL = 7 * 24 * time.Hour
)

// DraftService coordinates six-step wizard draft persistence and send conversion.
type DraftService struct {
	drafts     stores.DraftStore
	audits     stores.AuditEventStore
	agreements AgreementService
	tx         stores.TransactionManager
	now        func() time.Time
	ttl        time.Duration
}

// DraftServiceOption customizes draft service behavior.
type DraftServiceOption func(*DraftService)

// WithDraftClock sets draft service clock.
func WithDraftClock(now func() time.Time) DraftServiceOption {
	return func(s *DraftService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// WithDraftTTL sets draft TTL policy applied on create/update.
func WithDraftTTL(ttl time.Duration) DraftServiceOption {
	return func(s *DraftService) {
		if s == nil || ttl <= 0 {
			return
		}
		s.ttl = ttl
	}
}

// WithDraftAuditStore overrides append-only audit sink for draft lifecycle events.
func WithDraftAuditStore(audits stores.AuditEventStore) DraftServiceOption {
	return func(s *DraftService) {
		if s == nil || audits == nil {
			return
		}
		s.audits = audits
	}
}

// WithDraftAgreementService injects agreement lifecycle service used for draft send conversion.
func WithDraftAgreementService(agreements AgreementService) DraftServiceOption {
	return func(s *DraftService) {
		if s == nil {
			return
		}
		s.agreements = agreements
	}
}

// DraftCreateInput captures draft creation payload.
type DraftCreateInput struct {
	WizardID        string
	WizardState     map[string]any
	Title           string
	CurrentStep     int
	DocumentID      string
	CreatedByUserID string
}

// DraftUpdateInput captures revision-aware draft update payload.
type DraftUpdateInput struct {
	ExpectedRevision int64
	WizardState      map[string]any
	Title            string
	CurrentStep      int
	DocumentID       *string
	UpdatedByUserID  string
}

// DraftListInput captures paginated draft list query.
type DraftListInput struct {
	CreatedByUserID string
	Limit           int
	Cursor          string
}

// DraftSendInput captures draft-to-agreement send preconditions.
type DraftSendInput struct {
	ExpectedRevision int64
	CreatedByUserID  string
}

// DraftSendResult captures send conversion output contract.
type DraftSendResult struct {
	AgreementID  string
	Status       string
	DraftID      string
	DraftDeleted bool
}

// NewDraftService builds a draft lifecycle service over the shared e-sign store.
func NewDraftService(store stores.Store, opts ...DraftServiceOption) DraftService {
	agreements := NewAgreementService(store)
	svc := DraftService{
		drafts:     store,
		audits:     store,
		agreements: agreements,
		tx:         store,
		now:        func() time.Time { return time.Now().UTC() },
		ttl:        DefaultDraftTTL,
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	if svc.audits == nil {
		svc.audits = store
	}
	if svc.ttl <= 0 {
		svc.ttl = DefaultDraftTTL
	}
	return svc
}

func (s DraftService) forTx(tx stores.TxStore) DraftService {
	txSvc := s
	txSvc.drafts = tx
	txSvc.audits = tx
	txSvc.agreements = s.agreements.forTx(tx)
	txSvc.tx = nil
	return txSvc
}

func (s DraftService) withWriteTx(ctx context.Context, fn func(DraftService) error) error {
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

// Create persists a durable wizard draft with idempotent replay by wizard_id.
func (s DraftService) Create(ctx context.Context, scope stores.Scope, input DraftCreateInput) (stores.DraftRecord, bool, error) {
	if s.drafts == nil {
		return stores.DraftRecord{}, false, domainValidationError("drafts", "store", "not configured")
	}
	createdByUserID := strings.TrimSpace(input.CreatedByUserID)
	if createdByUserID == "" {
		return stores.DraftRecord{}, false, domainValidationError("drafts", "created_by_user_id", "required")
	}
	wizardID := strings.TrimSpace(input.WizardID)
	if wizardID == "" {
		return stores.DraftRecord{}, false, domainValidationError("drafts", "wizard_id", "required")
	}
	if input.WizardState == nil {
		return stores.DraftRecord{}, false, domainValidationError("drafts", "wizard_state", "required")
	}
	if input.CurrentStep <= 0 || input.CurrentStep > 6 {
		return stores.DraftRecord{}, false, domainValidationError("drafts", "current_step", "must be between 1 and 6")
	}

	now := s.now().UTC()
	expiresAt := now.Add(s.ttl).UTC()
	record, replay, err := s.drafts.CreateDraftSession(ctx, scope, stores.DraftRecord{
		WizardID:        wizardID,
		CreatedByUserID: createdByUserID,
		DocumentID:      strings.TrimSpace(input.DocumentID),
		Title:           strings.TrimSpace(input.Title),
		CurrentStep:     input.CurrentStep,
		WizardStateJSON: mustJSON(input.WizardState),
		CreatedAt:       now,
		UpdatedAt:       now,
		ExpiresAt:       expiresAt,
	})
	if err != nil {
		return stores.DraftRecord{}, false, err
	}

	eventType := "draft.created"
	if replay {
		eventType = "draft.replayed"
	}
	s.appendDraftAudit(ctx, scope, record.ID, eventType, createdByUserID, map[string]any{
		"wizard_id":    record.WizardID,
		"current_step": record.CurrentStep,
		"revision":     record.Revision,
		"replay":       replay,
	})
	return record, replay, nil
}

// List returns paginated draft summaries for the requesting actor scope.
func (s DraftService) List(ctx context.Context, scope stores.Scope, input DraftListInput) ([]stores.DraftRecord, string, int, error) {
	if s.drafts == nil {
		return nil, "", 0, domainValidationError("drafts", "store", "not configured")
	}
	createdByUserID := strings.TrimSpace(input.CreatedByUserID)
	if createdByUserID == "" {
		return nil, "", 0, domainValidationError("drafts", "created_by_user_id", "required")
	}
	limit := input.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	rows, nextCursor, err := s.drafts.ListDraftSessions(ctx, scope, stores.DraftQuery{
		CreatedByUserID: createdByUserID,
		Limit:           limit,
		Cursor:          strings.TrimSpace(input.Cursor),
		SortDesc:        true,
	})
	if err != nil {
		return nil, "", 0, err
	}
	total, err := s.countDrafts(ctx, scope, createdByUserID)
	if err != nil {
		return nil, "", 0, err
	}
	return rows, nextCursor, total, nil
}

// Get resolves a scoped draft detail by id.
func (s DraftService) Get(ctx context.Context, scope stores.Scope, id, createdByUserID string) (stores.DraftRecord, error) {
	if s.drafts == nil {
		return stores.DraftRecord{}, domainValidationError("drafts", "store", "not configured")
	}
	createdByUserID = strings.TrimSpace(createdByUserID)
	if createdByUserID == "" {
		return stores.DraftRecord{}, domainValidationError("drafts", "created_by_user_id", "required")
	}
	draft, err := s.drafts.GetDraftSession(ctx, scope, strings.TrimSpace(id))
	if err != nil {
		return stores.DraftRecord{}, err
	}
	if strings.TrimSpace(draft.CreatedByUserID) != createdByUserID {
		return stores.DraftRecord{}, draftNotFoundError(strings.TrimSpace(id))
	}
	return draft, nil
}

// Update applies revision-aware mutations and refreshes draft TTL.
func (s DraftService) Update(ctx context.Context, scope stores.Scope, id string, input DraftUpdateInput) (stores.DraftRecord, error) {
	if s.drafts == nil {
		return stores.DraftRecord{}, domainValidationError("drafts", "store", "not configured")
	}
	if input.ExpectedRevision <= 0 {
		return stores.DraftRecord{}, domainValidationError("drafts", "expected_revision", "required")
	}
	if input.WizardState == nil {
		return stores.DraftRecord{}, domainValidationError("drafts", "wizard_state", "required")
	}
	if input.CurrentStep <= 0 || input.CurrentStep > 6 {
		return stores.DraftRecord{}, domainValidationError("drafts", "current_step", "must be between 1 and 6")
	}
	if _, err := s.Get(ctx, scope, id, input.UpdatedByUserID); err != nil {
		return stores.DraftRecord{}, err
	}

	now := s.now().UTC()
	expiresAt := now.Add(s.ttl).UTC()
	wizardStateJSON := mustJSON(input.WizardState)
	title := strings.TrimSpace(input.Title)

	patch := stores.DraftPatch{
		WizardStateJSON: &wizardStateJSON,
		Title:           &title,
		CurrentStep:     &input.CurrentStep,
		ExpiresAt:       &expiresAt,
		UpdatedAt:       &now,
	}
	if input.DocumentID != nil {
		documentID := strings.TrimSpace(*input.DocumentID)
		patch.DocumentID = &documentID
	}

	record, err := s.drafts.UpdateDraftSession(ctx, scope, strings.TrimSpace(id), patch, input.ExpectedRevision)
	if err != nil {
		return stores.DraftRecord{}, err
	}
	s.appendDraftAudit(ctx, scope, record.ID, "draft.updated", strings.TrimSpace(input.UpdatedByUserID), map[string]any{
		"wizard_id":    record.WizardID,
		"current_step": record.CurrentStep,
		"revision":     record.Revision,
	})
	return record, nil
}

// Delete removes a scoped draft record.
func (s DraftService) Delete(ctx context.Context, scope stores.Scope, id, createdByUserID string) error {
	if s.drafts == nil {
		return domainValidationError("drafts", "store", "not configured")
	}
	draft, err := s.Get(ctx, scope, id, createdByUserID)
	if err != nil {
		return err
	}
	if err := s.drafts.DeleteDraftSession(ctx, scope, strings.TrimSpace(id)); err != nil {
		return err
	}
	s.appendDraftAudit(ctx, scope, draft.ID, "draft.deleted", strings.TrimSpace(createdByUserID), map[string]any{
		"wizard_id": draft.WizardID,
	})
	return nil
}

// Send converts a draft to a sent agreement in a single transaction and deletes the draft on success.
func (s DraftService) Send(ctx context.Context, scope stores.Scope, id string, input DraftSendInput) (DraftSendResult, error) {
	if input.ExpectedRevision <= 0 {
		return DraftSendResult{}, domainValidationError("drafts", "expected_revision", "required")
	}
	if strings.TrimSpace(input.CreatedByUserID) == "" {
		return DraftSendResult{}, domainValidationError("drafts", "created_by_user_id", "required")
	}

	result := DraftSendResult{}
	err := s.withWriteTx(ctx, func(txSvc DraftService) error {
		draft, err := txSvc.Get(ctx, scope, id, input.CreatedByUserID)
		if err != nil {
			return err
		}
		if draft.Revision != input.ExpectedRevision {
			return staleRevisionError(draft.Revision)
		}
		agreement, err := txSvc.materializeDraftAgreement(ctx, scope, draft)
		if err != nil {
			return err
		}
		sent, err := txSvc.agreements.Send(ctx, scope, agreement.ID, SendInput{
			IdempotencyKey: fmt.Sprintf("draft_send_%s_rev_%d", strings.TrimSpace(draft.ID), draft.Revision),
		})
		if err != nil {
			return err
		}
		if err := txSvc.drafts.DeleteDraftSession(ctx, scope, draft.ID); err != nil {
			return err
		}
		txSvc.appendDraftAudit(ctx, scope, draft.ID, "draft.sent", strings.TrimSpace(input.CreatedByUserID), map[string]any{
			"agreement_id": strings.TrimSpace(sent.ID),
			"wizard_id":    draft.WizardID,
		})
		result = DraftSendResult{
			AgreementID:  strings.TrimSpace(sent.ID),
			Status:       primitives.FirstNonEmpty(strings.TrimSpace(sent.Status), stores.AgreementStatusSent),
			DraftID:      strings.TrimSpace(draft.ID),
			DraftDeleted: true,
		}
		return nil
	})
	if err != nil {
		return DraftSendResult{}, err
	}
	return result, nil
}

// CleanupExpiredDrafts removes drafts whose expires_at is before `before`.
func (s DraftService) CleanupExpiredDrafts(ctx context.Context, before time.Time) (int, error) {
	if s.drafts == nil {
		return 0, domainValidationError("drafts", "store", "not configured")
	}
	if before.IsZero() {
		before = s.now().UTC()
	}
	count, err := s.drafts.DeleteExpiredDraftSessions(ctx, before)
	if err != nil {
		return 0, err
	}
	s.appendDraftAudit(ctx, stores.Scope{TenantID: "system", OrgID: "system"}, "draft_cleanup", "draft.cleanup_expired", "system", map[string]any{
		"deleted": count,
		"before":  before.UTC().Format(time.RFC3339Nano),
	})
	return count, nil
}

func (s DraftService) countDrafts(ctx context.Context, scope stores.Scope, createdByUserID string) (int, error) {
	cursor := ""
	total := 0
	guard := map[string]struct{}{}
	for {
		if _, seen := guard[cursor]; seen {
			return total, nil
		}
		guard[cursor] = struct{}{}
		rows, nextCursor, err := s.drafts.ListDraftSessions(ctx, scope, stores.DraftQuery{
			CreatedByUserID: strings.TrimSpace(createdByUserID),
			Limit:           50,
			Cursor:          cursor,
			SortDesc:        true,
		})
		if err != nil {
			return 0, err
		}
		total += len(rows)
		if strings.TrimSpace(nextCursor) == "" {
			break
		}
		cursor = strings.TrimSpace(nextCursor)
	}
	return total, nil
}

func (s DraftService) materializeDraftAgreement(ctx context.Context, scope stores.Scope, draft stores.DraftRecord) (stores.AgreementRecord, error) {
	if s.agreements.agreements == nil {
		return stores.AgreementRecord{}, domainValidationError("agreements", "store", "not configured")
	}
	state, err := decodeWizardState(draft.WizardStateJSON)
	if err != nil {
		return stores.AgreementRecord{}, domainValidationError("drafts", "wizard_state", "invalid json payload")
	}
	documentID := primitives.FirstNonEmpty(strings.TrimSpace(draft.DocumentID), strings.TrimSpace(state.Document.ID))
	if documentID == "" {
		return stores.AgreementRecord{}, domainValidationError("drafts", "document_id", "required")
	}

	agreement, err := s.agreements.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      documentID,
		Title:           primitives.FirstNonEmpty(strings.TrimSpace(state.Details.Title), strings.TrimSpace(draft.Title), "Untitled Agreement"),
		Message:         strings.TrimSpace(state.Details.Message),
		CreatedByUserID: strings.TrimSpace(draft.CreatedByUserID),
	})
	if err != nil {
		var coded *goerrors.Error
		if errors.As(err, &coded) && strings.EqualFold(strings.TrimSpace(coded.TextCode), "NOT_FOUND") {
			return stores.AgreementRecord{}, domainValidationError("drafts", "document_id", "document not found")
		}
		return stores.AgreementRecord{}, err
	}

	participantMap := map[string]stores.ParticipantRecord{}
	for idx, participant := range state.Participants {
		role := normalizeDraftParticipantRole(participant.Role)
		signingStage := participant.SigningStage
		if signingStage <= 0 {
			signingStage = participant.Order
		}
		if signingStage <= 0 {
			signingStage = idx + 1
		}
		email := strings.TrimSpace(participant.Email)
		name := strings.TrimSpace(participant.Name)
		created, err := s.agreements.UpsertParticipantDraft(ctx, scope, agreement.ID, stores.ParticipantDraftPatch{
			Email:        &email,
			Name:         &name,
			Role:         &role,
			SigningStage: draftIntPtr(signingStage),
		}, 0)
		if err != nil {
			return stores.AgreementRecord{}, err
		}
		if key := strings.TrimSpace(participant.TempID); key != "" {
			participantMap[key] = created
		}
	}

	for idx, definition := range state.FieldDefinitions {
		participantID := resolveFieldParticipantID(definition, participantMap)
		if participantID == "" {
			return stores.AgreementRecord{}, domainValidationError("field_definitions", "participant_id", "field definition participant is not resolvable")
		}
		fieldType := normalizeDraftFieldType(definition.Type)
		required := definition.Required
		created, err := s.agreements.UpsertFieldDefinitionDraft(ctx, scope, agreement.ID, stores.FieldDefinitionDraftPatch{
			ParticipantID: &participantID,
			Type:          &fieldType,
			Required:      &required,
		})
		if err != nil {
			return stores.AgreementRecord{}, err
		}

		page, x, y, width, height := resolveFieldPlacementGeometry(state, definition, idx)
		label := strings.TrimSpace(definition.Label)
		if _, err := s.agreements.UpsertFieldInstanceDraft(ctx, scope, agreement.ID, stores.FieldInstanceDraftPatch{
			FieldDefinitionID: &created.ID,
			PageNumber:        &page,
			X:                 &x,
			Y:                 &y,
			Width:             &width,
			Height:            &height,
			TabIndex:          draftIntPtr(idx + 1),
			Label:             &label,
		}); err != nil {
			return stores.AgreementRecord{}, err
		}
	}

	return agreement, nil
}

func resolveFieldParticipantID(definition wizardFieldDefinitionState, participants map[string]stores.ParticipantRecord) string {
	tempID := strings.TrimSpace(definition.ParticipantTempID)
	if tempID == "" {
		tempID = strings.TrimSpace(definition.ParticipantID)
	}
	if tempID == "" {
		return ""
	}
	participant, ok := participants[tempID]
	if !ok {
		return ""
	}
	return strings.TrimSpace(participant.ID)
}

func resolveFieldPlacementGeometry(state wizardStatePayload, definition wizardFieldDefinitionState, index int) (int, float64, float64, float64, float64) {
	placement := findPlacementForField(state.FieldPlacements, definition)
	page := placement.Page
	if page <= 0 {
		page = definition.Page
	}
	if page <= 0 {
		page = 1
	}

	x := placement.X
	y := placement.Y
	width := placement.Width
	height := placement.Height

	if width <= 0 {
		width = 180
	}
	if height <= 0 {
		height = 32
	}
	if x <= 0 {
		x = 72
	}
	if y <= 0 {
		y = float64(96 + (index * 48))
	}
	return page, x, y, width, height
}

func findPlacementForField(placements []wizardFieldPlacementState, definition wizardFieldDefinitionState) wizardFieldPlacementState {
	for _, placement := range placements {
		if strings.TrimSpace(placement.FieldTempID) != "" && strings.TrimSpace(placement.FieldTempID) == strings.TrimSpace(definition.TempID) {
			return placement
		}
		if strings.TrimSpace(placement.FieldDefinitionID) != "" && strings.TrimSpace(placement.FieldDefinitionID) == strings.TrimSpace(definition.ID) {
			return placement
		}
	}
	return wizardFieldPlacementState{}
}

func normalizeDraftParticipantRole(role string) string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case stores.RecipientRoleCC:
		return stores.RecipientRoleCC
	default:
		return stores.RecipientRoleSigner
	}
}

func normalizeDraftFieldType(fieldType string) string {
	fieldType = strings.ToLower(strings.TrimSpace(fieldType))
	switch fieldType {
	case stores.FieldTypeSignature,
		stores.FieldTypeInitials,
		stores.FieldTypeDateSigned,
		stores.FieldTypeText,
		stores.FieldTypeCheckbox:
		return fieldType
	default:
		return stores.FieldTypeText
	}
}

func staleRevisionError(currentRevision int64) error {
	return goerrors.New("stale revision", goerrors.CategoryConflict).
		WithCode(409).
		WithTextCode("stale_revision").
		WithMetadata(map[string]any{"current_revision": currentRevision})
}

func draftNotFoundError(id string) error {
	return goerrors.New("draft not found", goerrors.CategoryNotFound).
		WithCode(404).
		WithTextCode("NOT_FOUND").
		WithMetadata(map[string]any{"id": strings.TrimSpace(id)})
}

func (s DraftService) appendDraftAudit(ctx context.Context, scope stores.Scope, draftID, eventType, actorID string, metadata map[string]any) {
	if s.audits == nil {
		return
	}
	if strings.TrimSpace(eventType) == "" {
		return
	}
	actorType := "system"
	if strings.TrimSpace(actorID) != "" {
		actorType = "user"
	}
	payload := map[string]any{"draft_id": strings.TrimSpace(draftID)}
	for key, value := range metadata {
		payload[key] = value
	}
	encoded, _ := json.Marshal(payload)
	_, _ = s.audits.Append(ctx, scope, stores.AuditEventRecord{
		AgreementID:  strings.TrimSpace(draftID),
		EventType:    strings.TrimSpace(eventType),
		ActorType:    actorType,
		ActorID:      strings.TrimSpace(actorID),
		MetadataJSON: string(encoded),
		CreatedAt:    s.now().UTC(),
	})
}

type wizardStatePayload struct {
	Document         wizardDocumentState          `json:"document"`
	Details          wizardDetailsState           `json:"details"`
	Participants     []wizardParticipantState     `json:"participants"`
	FieldDefinitions []wizardFieldDefinitionState `json:"fieldDefinitions"`
	FieldPlacements  []wizardFieldPlacementState  `json:"fieldPlacements"`
}

type wizardDocumentState struct {
	ID string `json:"id"`
}

type wizardDetailsState struct {
	Title   string `json:"title"`
	Message string `json:"message"`
}

type wizardParticipantState struct {
	TempID       string `json:"tempId"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	Order        int    `json:"order"`
	SigningStage int    `json:"signingStage"`
}

type wizardFieldDefinitionState struct {
	ID                string `json:"id"`
	TempID            string `json:"tempId"`
	Type              string `json:"type"`
	ParticipantID     string `json:"participantId"`
	ParticipantTempID string `json:"participantTempId"`
	Label             string `json:"label"`
	Required          bool   `json:"required"`
	Page              int    `json:"page"`
}

type wizardFieldPlacementState struct {
	FieldDefinitionID string  `json:"field_definition_id"`
	FieldTempID       string  `json:"fieldTempId"`
	Page              int     `json:"page"`
	X                 float64 `json:"x"`
	Y                 float64 `json:"y"`
	Width             float64 `json:"width"`
	Height            float64 `json:"height"`
}

func decodeWizardState(raw string) (wizardStatePayload, error) {
	state := wizardStatePayload{}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return state, fmt.Errorf("wizard state payload is empty")
	}
	if err := json.Unmarshal([]byte(raw), &state); err != nil {
		return wizardStatePayload{}, err
	}
	if state.Participants == nil {
		state.Participants = []wizardParticipantState{}
	}
	if state.FieldDefinitions == nil {
		state.FieldDefinitions = []wizardFieldDefinitionState{}
	}
	if state.FieldPlacements == nil {
		state.FieldPlacements = []wizardFieldPlacementState{}
	}
	return state, nil
}

func draftIntPtr(value int) *int {
	return &value
}
