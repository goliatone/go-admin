package stores

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// InMemoryStore is a phase-1 repository implementation with scope-safe query helpers.
type InMemoryStore struct {
	mu sync.RWMutex

	documents                  map[string]DocumentRecord
	agreements                 map[string]AgreementRecord
	participants               map[string]ParticipantRecord
	fieldDefinitions           map[string]FieldDefinitionRecord
	fieldInstances             map[string]FieldInstanceRecord
	recipients                 map[string]RecipientRecord
	fields                     map[string]FieldRecord
	signingTokens              map[string]SigningTokenRecord
	tokenHashIndex             map[string]string
	signatureArtifacts         map[string]SignatureArtifactRecord
	fieldValues                map[string]FieldValueRecord
	auditEvents                map[string]AuditEventRecord
	agreementArtifacts         map[string]AgreementArtifactRecord
	emailLogs                  map[string]EmailLogRecord
	jobRuns                    map[string]JobRunRecord
	jobRunDedupeIndex          map[string]string
	integrationCredentials     map[string]IntegrationCredentialRecord
	integrationCredentialIndex map[string]string
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		documents:                  map[string]DocumentRecord{},
		agreements:                 map[string]AgreementRecord{},
		participants:               map[string]ParticipantRecord{},
		fieldDefinitions:           map[string]FieldDefinitionRecord{},
		fieldInstances:             map[string]FieldInstanceRecord{},
		recipients:                 map[string]RecipientRecord{},
		fields:                     map[string]FieldRecord{},
		signingTokens:              map[string]SigningTokenRecord{},
		tokenHashIndex:             map[string]string{},
		signatureArtifacts:         map[string]SignatureArtifactRecord{},
		fieldValues:                map[string]FieldValueRecord{},
		auditEvents:                map[string]AuditEventRecord{},
		agreementArtifacts:         map[string]AgreementArtifactRecord{},
		emailLogs:                  map[string]EmailLogRecord{},
		jobRuns:                    map[string]JobRunRecord{},
		jobRunDedupeIndex:          map[string]string{},
		integrationCredentials:     map[string]IntegrationCredentialRecord{},
		integrationCredentialIndex: map[string]string{},
	}
}

// WithTx executes fn within a transactional scope.
// InMemoryStore currently provides best-effort semantics and executes inline.
func (s *InMemoryStore) WithTx(ctx context.Context, fn func(tx TxStore) error) error {
	_ = ctx
	if fn == nil {
		return nil
	}
	if s == nil {
		return invalidRecordError("transactions", "store", "not configured")
	}
	return fn(s)
}

func scopedKey(scope Scope, id string) string {
	return scope.key() + "|" + normalizeID(id)
}

func cloneTimePtr(src *time.Time) *time.Time {
	if src == nil {
		return nil
	}
	cpy := src.UTC()
	return &cpy
}

func cloneSigningTokenRecord(record SigningTokenRecord) SigningTokenRecord {
	record.RevokedAt = cloneTimePtr(record.RevokedAt)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	return record
}

func participantToRecipient(record ParticipantRecord) RecipientRecord {
	return RecipientRecord{
		ID:            record.ID,
		TenantID:      record.TenantID,
		OrgID:         record.OrgID,
		AgreementID:   record.AgreementID,
		Email:         record.Email,
		Name:          record.Name,
		Role:          record.Role,
		SigningOrder:  record.SigningStage,
		FirstViewAt:   cloneTimePtr(record.FirstViewAt),
		LastViewAt:    cloneTimePtr(record.LastViewAt),
		DeclinedAt:    cloneTimePtr(record.DeclinedAt),
		DeclineReason: record.DeclineReason,
		CompletedAt:   cloneTimePtr(record.CompletedAt),
		Version:       record.Version,
		CreatedAt:     record.CreatedAt,
		UpdatedAt:     record.UpdatedAt,
	}
}

func normalizeRecordTime(value time.Time) time.Time {
	if value.IsZero() {
		return time.Now().UTC()
	}
	return value.UTC()
}

func (s *InMemoryStore) Create(ctx context.Context, scope Scope, record DocumentRecord) (DocumentRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return DocumentRecord{}, err
	}
	if strings.TrimSpace(record.SourceObjectKey) == "" {
		return DocumentRecord{}, invalidRecordError("documents", "source_object_key", "required")
	}
	if strings.TrimSpace(record.SourceSHA256) == "" {
		return DocumentRecord{}, invalidRecordError("documents", "source_sha256", "required")
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.SourceType = strings.TrimSpace(record.SourceType)
	if record.SourceType == "" {
		record.SourceType = SourceTypeUpload
	}
	if record.SourceType != SourceTypeUpload && record.SourceType != SourceTypeGoogleDrive {
		return DocumentRecord{}, invalidRecordError("documents", "source_type", "unsupported source type")
	}
	record.SourceGoogleFileID = strings.TrimSpace(record.SourceGoogleFileID)
	record.SourceGoogleDocURL = strings.TrimSpace(record.SourceGoogleDocURL)
	record.SourceModifiedTime = cloneTimePtr(record.SourceModifiedTime)
	record.SourceExportedAt = cloneTimePtr(record.SourceExportedAt)
	record.SourceExportedByUserID = normalizeID(record.SourceExportedByUserID)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)

	key := scopedKey(scope, record.ID)

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.documents[key]; exists {
		return DocumentRecord{}, invalidRecordError("documents", "id", "already exists")
	}
	s.documents[key] = record
	return record, nil
}

func (s *InMemoryStore) Get(ctx context.Context, scope Scope, id string) (DocumentRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return DocumentRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return DocumentRecord{}, invalidRecordError("documents", "id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.documents[scopedKey(scope, id)]
	if !ok {
		return DocumentRecord{}, notFoundError("documents", id)
	}
	return record, nil
}

func (s *InMemoryStore) List(ctx context.Context, scope Scope, query DocumentQuery) ([]DocumentRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	scopePrefix := scope.key() + "|"
	titleFilter := strings.ToLower(strings.TrimSpace(query.TitleContains))
	out := make([]DocumentRecord, 0)
	for key, record := range s.documents {
		if !strings.HasPrefix(key, scopePrefix) {
			continue
		}
		if titleFilter != "" && !strings.Contains(strings.ToLower(record.Title), titleFilter) {
			continue
		}
		out = append(out, record)
	}

	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})

	start := query.Offset
	if start < 0 {
		start = 0
	}
	if start > len(out) {
		start = len(out)
	}
	end := len(out)
	if query.Limit > 0 && start+query.Limit < end {
		end = start + query.Limit
	}
	return out[start:end], nil
}

func (s *InMemoryStore) CreateDraft(ctx context.Context, scope Scope, record AgreementRecord) (AgreementRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementRecord{}, err
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	if normalizeID(record.DocumentID) == "" {
		return AgreementRecord{}, invalidRecordError("agreements", "document_id", "required")
	}
	record.DocumentID = normalizeID(record.DocumentID)
	record.SourceType = strings.TrimSpace(record.SourceType)
	if record.SourceType == "" {
		record.SourceType = SourceTypeUpload
	}
	if record.SourceType != SourceTypeUpload && record.SourceType != SourceTypeGoogleDrive {
		return AgreementRecord{}, invalidRecordError("agreements", "source_type", "unsupported source type")
	}
	record.SourceGoogleFileID = strings.TrimSpace(record.SourceGoogleFileID)
	record.SourceGoogleDocURL = strings.TrimSpace(record.SourceGoogleDocURL)
	record.SourceModifiedTime = cloneTimePtr(record.SourceModifiedTime)
	record.SourceExportedAt = cloneTimePtr(record.SourceExportedAt)
	record.SourceExportedByUserID = normalizeID(record.SourceExportedByUserID)

	if record.Status == "" {
		record.Status = AgreementStatusDraft
	}
	if record.Status != AgreementStatusDraft {
		return AgreementRecord{}, invalidRecordError("agreements", "status", "must start in draft")
	}
	if record.Version <= 0 {
		record.Version = 1
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)

	key := scopedKey(scope, record.ID)
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.agreements[key]; exists {
		return AgreementRecord{}, invalidRecordError("agreements", "id", "already exists")
	}
	s.agreements[key] = record
	return record, nil
}

func (s *InMemoryStore) GetAgreement(ctx context.Context, scope Scope, id string) (AgreementRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return AgreementRecord{}, invalidRecordError("agreements", "id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.agreements[scopedKey(scope, id)]
	if !ok {
		return AgreementRecord{}, notFoundError("agreements", id)
	}
	return record, nil
}

func (s *InMemoryStore) ListAgreements(ctx context.Context, scope Scope, query AgreementQuery) ([]AgreementRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	scopePrefix := scope.key() + "|"
	statusFilter := strings.TrimSpace(query.Status)
	out := make([]AgreementRecord, 0)
	for key, record := range s.agreements {
		if !strings.HasPrefix(key, scopePrefix) {
			continue
		}
		if statusFilter != "" && statusFilter != record.Status {
			continue
		}
		out = append(out, record)
	}

	sort.Slice(out, func(i, j int) bool {
		if query.SortDesc {
			return out[i].CreatedAt.After(out[j].CreatedAt)
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})

	start := query.Offset
	if start < 0 {
		start = 0
	}
	if start > len(out) {
		start = len(out)
	}
	end := len(out)
	if query.Limit > 0 && start+query.Limit < end {
		end = start + query.Limit
	}

	return out[start:end], nil
}

func (s *InMemoryStore) UpdateDraft(ctx context.Context, scope Scope, id string, patch AgreementDraftPatch, expectedVersion int64) (AgreementRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return AgreementRecord{}, invalidRecordError("agreements", "id", "required")
	}

	key := scopedKey(scope, id)
	s.mu.Lock()
	defer s.mu.Unlock()

	record, ok := s.agreements[key]
	if !ok {
		return AgreementRecord{}, notFoundError("agreements", id)
	}
	if record.Status != AgreementStatusDraft {
		return AgreementRecord{}, immutableAgreementError(record.ID, record.Status)
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return AgreementRecord{}, versionConflictError("agreements", id, expectedVersion, record.Version)
	}

	if patch.Title != nil {
		record.Title = strings.TrimSpace(*patch.Title)
	}
	if patch.Message != nil {
		record.Message = strings.TrimSpace(*patch.Message)
	}
	if patch.DocumentID != nil {
		documentID := normalizeID(*patch.DocumentID)
		if documentID == "" {
			return AgreementRecord{}, invalidRecordError("agreements", "document_id", "required")
		}
		record.DocumentID = documentID
	}
	record.Version++
	record.UpdatedAt = time.Now().UTC()
	s.agreements[key] = record
	return record, nil
}

func (s *InMemoryStore) Transition(ctx context.Context, scope Scope, id string, input AgreementTransitionInput) (AgreementRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return AgreementRecord{}, invalidRecordError("agreements", "id", "required")
	}
	toStatus := strings.TrimSpace(input.ToStatus)
	if toStatus == "" {
		return AgreementRecord{}, invalidRecordError("agreements", "status", "required")
	}

	key := scopedKey(scope, id)
	s.mu.Lock()
	defer s.mu.Unlock()

	record, ok := s.agreements[key]
	if !ok {
		return AgreementRecord{}, notFoundError("agreements", id)
	}
	if input.ExpectedVersion > 0 && record.Version != input.ExpectedVersion {
		return AgreementRecord{}, versionConflictError("agreements", id, input.ExpectedVersion, record.Version)
	}

	now := time.Now().UTC()
	record.Status = toStatus
	record.UpdatedAt = now
	record.Version++
	if toStatus == AgreementStatusSent {
		record.SentAt = cloneTimePtr(&now)
	}
	if toStatus == AgreementStatusCompleted {
		record.CompletedAt = cloneTimePtr(&now)
	}
	if toStatus == AgreementStatusVoided {
		record.VoidedAt = cloneTimePtr(&now)
	}
	if toStatus == AgreementStatusDeclined {
		record.DeclinedAt = cloneTimePtr(&now)
	}
	if toStatus == AgreementStatusExpired {
		record.ExpiredAt = cloneTimePtr(&now)
	}
	s.agreements[key] = record
	return record, nil
}

func (s *InMemoryStore) UpsertRecipientDraft(ctx context.Context, scope Scope, agreementID string, patch RecipientDraftPatch, expectedVersion int64) (RecipientRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return RecipientRecord{}, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return RecipientRecord{}, invalidRecordError("recipients", "agreement_id", "required")
	}

	recipientID := normalizeID(patch.ID)
	if recipientID == "" {
		recipientID = uuid.NewString()
	}
	key := scopedKey(scope, recipientID)

	s.mu.Lock()
	defer s.mu.Unlock()

	agreement, ok := s.agreements[scopedKey(scope, agreementID)]
	if !ok {
		return RecipientRecord{}, notFoundError("agreements", agreementID)
	}
	if agreement.Status != AgreementStatusDraft {
		return RecipientRecord{}, immutableAgreementError(agreement.ID, agreement.Status)
	}

	record, exists := s.recipients[key]
	if !exists {
		record = RecipientRecord{
			ID:           recipientID,
			TenantID:     scope.TenantID,
			OrgID:        scope.OrgID,
			AgreementID:  agreementID,
			Role:         RecipientRoleSigner,
			SigningOrder: 1,
			Version:      1,
			CreatedAt:    time.Now().UTC(),
		}
	} else if expectedVersion > 0 && record.Version != expectedVersion {
		return RecipientRecord{}, versionConflictError("recipients", recipientID, expectedVersion, record.Version)
	}

	if patch.Email != nil {
		record.Email = strings.TrimSpace(*patch.Email)
	}
	if patch.Name != nil {
		record.Name = strings.TrimSpace(*patch.Name)
	}
	if patch.Role != nil {
		record.Role = strings.TrimSpace(*patch.Role)
	}
	if patch.SigningOrder != nil {
		record.SigningOrder = *patch.SigningOrder
	}

	if record.Email == "" {
		return RecipientRecord{}, invalidRecordError("recipients", "email", "required")
	}
	if record.Role != RecipientRoleSigner && record.Role != RecipientRoleCC {
		return RecipientRecord{}, invalidRecordError("recipients", "role", "must be signer or cc")
	}
	if record.SigningOrder <= 0 {
		return RecipientRecord{}, invalidRecordError("recipients", "signing_order", "must be positive")
	}

	for mapKey, existing := range s.recipients {
		if mapKey == key {
			continue
		}
		if existing.TenantID != scope.TenantID || existing.OrgID != scope.OrgID || existing.AgreementID != agreementID {
			continue
		}
		if existing.SigningOrder == record.SigningOrder {
			return RecipientRecord{}, invalidRecordError("recipients", "signing_order", "duplicate for agreement")
		}
	}

	if exists {
		record.Version++
	}
	record.UpdatedAt = time.Now().UTC()
	s.recipients[key] = record
	return record, nil
}

func (s *InMemoryStore) ListRecipients(ctx context.Context, scope Scope, agreementID string) ([]RecipientRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return nil, invalidRecordError("recipients", "agreement_id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]RecipientRecord, 0)
	for _, record := range s.recipients {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.AgreementID != agreementID {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].SigningOrder == out[j].SigningOrder {
			return out[i].CreatedAt.Before(out[j].CreatedAt)
		}
		return out[i].SigningOrder < out[j].SigningOrder
	})
	return out, nil
}

func (s *InMemoryStore) TouchRecipientView(ctx context.Context, scope Scope, agreementID, recipientID string, viewedAt time.Time) (RecipientRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return RecipientRecord{}, err
	}
	agreementID = normalizeID(agreementID)
	recipientID = normalizeID(recipientID)
	if agreementID == "" {
		return RecipientRecord{}, invalidRecordError("recipients", "agreement_id", "required")
	}
	if recipientID == "" {
		return RecipientRecord{}, invalidRecordError("recipients", "id", "required")
	}
	if viewedAt.IsZero() {
		viewedAt = time.Now().UTC()
	}
	viewedAt = viewedAt.UTC()

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.agreements[scopedKey(scope, agreementID)]; !ok {
		return RecipientRecord{}, notFoundError("agreements", agreementID)
	}
	key := scopedKey(scope, recipientID)
	record, ok := s.recipients[key]
	if !ok || record.AgreementID != agreementID {
		return RecipientRecord{}, notFoundError("recipients", recipientID)
	}
	if record.FirstViewAt == nil {
		record.FirstViewAt = cloneTimePtr(&viewedAt)
	}
	record.LastViewAt = cloneTimePtr(&viewedAt)
	record.UpdatedAt = time.Now().UTC()
	record.Version++
	s.recipients[key] = record
	return record, nil
}

func (s *InMemoryStore) CompleteRecipient(ctx context.Context, scope Scope, agreementID, recipientID string, completedAt time.Time, expectedVersion int64) (RecipientRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return RecipientRecord{}, err
	}
	agreementID = normalizeID(agreementID)
	recipientID = normalizeID(recipientID)
	if agreementID == "" {
		return RecipientRecord{}, invalidRecordError("recipients", "agreement_id", "required")
	}
	if recipientID == "" {
		return RecipientRecord{}, invalidRecordError("recipients", "id", "required")
	}
	if completedAt.IsZero() {
		completedAt = time.Now().UTC()
	}
	completedAt = completedAt.UTC()

	s.mu.Lock()
	defer s.mu.Unlock()

	agreement, ok := s.agreements[scopedKey(scope, agreementID)]
	if !ok {
		return RecipientRecord{}, notFoundError("agreements", agreementID)
	}
	if agreement.Status != AgreementStatusSent && agreement.Status != AgreementStatusInProgress {
		return RecipientRecord{}, invalidSignerStateError("recipient completion requires sent or in_progress agreement status")
	}

	key := scopedKey(scope, recipientID)
	record, ok := s.recipients[key]
	if !ok || record.AgreementID != agreementID {
		return RecipientRecord{}, notFoundError("recipients", recipientID)
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return RecipientRecord{}, versionConflictError("recipients", recipientID, expectedVersion, record.Version)
	}
	record.CompletedAt = cloneTimePtr(&completedAt)
	record.UpdatedAt = time.Now().UTC()
	record.Version++
	s.recipients[key] = record
	return record, nil
}

func (s *InMemoryStore) DeclineRecipient(ctx context.Context, scope Scope, agreementID, recipientID, reason string, declinedAt time.Time, expectedVersion int64) (RecipientRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return RecipientRecord{}, err
	}
	agreementID = normalizeID(agreementID)
	recipientID = normalizeID(recipientID)
	reason = strings.TrimSpace(reason)
	if agreementID == "" {
		return RecipientRecord{}, invalidRecordError("recipients", "agreement_id", "required")
	}
	if recipientID == "" {
		return RecipientRecord{}, invalidRecordError("recipients", "id", "required")
	}
	if reason == "" {
		return RecipientRecord{}, invalidRecordError("recipients", "decline_reason", "required")
	}
	if declinedAt.IsZero() {
		declinedAt = time.Now().UTC()
	}
	declinedAt = declinedAt.UTC()

	s.mu.Lock()
	defer s.mu.Unlock()

	agreement, ok := s.agreements[scopedKey(scope, agreementID)]
	if !ok {
		return RecipientRecord{}, notFoundError("agreements", agreementID)
	}
	if agreement.Status != AgreementStatusSent && agreement.Status != AgreementStatusInProgress {
		return RecipientRecord{}, invalidSignerStateError("recipient decline requires sent or in_progress agreement status")
	}

	key := scopedKey(scope, recipientID)
	record, ok := s.recipients[key]
	if !ok || record.AgreementID != agreementID {
		return RecipientRecord{}, notFoundError("recipients", recipientID)
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return RecipientRecord{}, versionConflictError("recipients", recipientID, expectedVersion, record.Version)
	}
	record.DeclinedAt = cloneTimePtr(&declinedAt)
	record.DeclineReason = reason
	record.UpdatedAt = time.Now().UTC()
	record.Version++
	s.recipients[key] = record
	return record, nil
}

func isSupportedFieldType(fieldType string) bool {
	switch strings.TrimSpace(fieldType) {
	case FieldTypeSignature,
		FieldTypeName,
		FieldTypeDateSigned,
		FieldTypeText,
		FieldTypeCheckbox,
		FieldTypeInitials:
		return true
	default:
		return false
	}
}

func (s *InMemoryStore) DeleteRecipientDraft(ctx context.Context, scope Scope, agreementID, recipientID string) error {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return err
	}
	agreementID = normalizeID(agreementID)
	recipientID = normalizeID(recipientID)
	if agreementID == "" {
		return invalidRecordError("recipients", "agreement_id", "required")
	}
	if recipientID == "" {
		return invalidRecordError("recipients", "id", "required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	agreement, ok := s.agreements[scopedKey(scope, agreementID)]
	if !ok {
		return notFoundError("agreements", agreementID)
	}
	if agreement.Status != AgreementStatusDraft {
		return immutableAgreementError(agreementID, agreement.Status)
	}

	recipientKey := scopedKey(scope, recipientID)
	record, exists := s.recipients[recipientKey]
	if !exists || record.AgreementID != agreementID {
		return notFoundError("recipients", recipientID)
	}
	delete(s.recipients, recipientKey)

	for key, field := range s.fields {
		if field.TenantID != scope.TenantID || field.OrgID != scope.OrgID {
			continue
		}
		if field.AgreementID == agreementID && field.RecipientID == recipientID {
			delete(s.fields, key)
		}
	}
	for key, value := range s.fieldValues {
		if value.TenantID != scope.TenantID || value.OrgID != scope.OrgID {
			continue
		}
		if value.AgreementID == agreementID && value.RecipientID == recipientID {
			delete(s.fieldValues, key)
		}
	}

	return nil
}

func (s *InMemoryStore) UpsertFieldDraft(ctx context.Context, scope Scope, agreementID string, patch FieldDraftPatch) (FieldRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return FieldRecord{}, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return FieldRecord{}, invalidRecordError("fields", "agreement_id", "required")
	}

	fieldID := normalizeID(patch.ID)
	if fieldID == "" {
		fieldID = uuid.NewString()
	}
	fieldKey := scopedKey(scope, fieldID)

	s.mu.Lock()
	defer s.mu.Unlock()

	agreement, ok := s.agreements[scopedKey(scope, agreementID)]
	if !ok {
		return FieldRecord{}, notFoundError("agreements", agreementID)
	}
	if agreement.Status != AgreementStatusDraft {
		return FieldRecord{}, immutableAgreementError(agreementID, agreement.Status)
	}

	record, exists := s.fields[fieldKey]
	if !exists {
		record = FieldRecord{
			ID:          fieldID,
			TenantID:    scope.TenantID,
			OrgID:       scope.OrgID,
			AgreementID: agreementID,
			Type:        FieldTypeText,
			PageNumber:  1,
			PosX:        0,
			PosY:        0,
			Width:       150,
			Height:      32,
			Required:    false,
			CreatedAt:   time.Now().UTC(),
		}
	}
	if patch.Type != nil {
		record.Type = strings.TrimSpace(*patch.Type)
	}
	if patch.RecipientID != nil {
		record.RecipientID = normalizeID(*patch.RecipientID)
	}
	if patch.PageNumber != nil {
		record.PageNumber = *patch.PageNumber
	}
	if patch.PosX != nil {
		record.PosX = *patch.PosX
	}
	if patch.PosY != nil {
		record.PosY = *patch.PosY
	}
	if patch.Width != nil {
		record.Width = *patch.Width
	}
	if patch.Height != nil {
		record.Height = *patch.Height
	}
	if patch.Required != nil {
		record.Required = *patch.Required
	}
	if record.Type == FieldTypeDateSigned {
		// date_signed is always system-managed and required for signer completion.
		record.Required = true
	}

	if !isSupportedFieldType(record.Type) {
		return FieldRecord{}, invalidRecordError("fields", "field_type", "unsupported type")
	}
	if record.PageNumber <= 0 {
		return FieldRecord{}, invalidRecordError("fields", "page_number", "must be positive")
	}
	if record.Width <= 0 || record.Height <= 0 {
		return FieldRecord{}, invalidRecordError("fields", "width|height", "must be positive")
	}
	requiresSignerRecipient := record.Type == FieldTypeSignature ||
		record.Type == FieldTypeName ||
		record.Type == FieldTypeDateSigned ||
		record.Type == FieldTypeInitials
	if requiresSignerRecipient && record.RecipientID == "" {
		return FieldRecord{}, invalidRecordError("fields", "recipient_id", "required for signer-bound field type")
	}
	if record.RecipientID != "" {
		recipient, ok := s.recipients[scopedKey(scope, record.RecipientID)]
		if !ok || recipient.AgreementID != agreementID {
			return FieldRecord{}, notFoundError("recipients", record.RecipientID)
		}
		if recipient.Role == RecipientRoleCC {
			return FieldRecord{}, invalidSignerStateError("fields cannot be assigned to cc recipients")
		}
	}

	record.UpdatedAt = time.Now().UTC()
	s.fields[fieldKey] = record
	return record, nil
}

func (s *InMemoryStore) DeleteFieldDraft(ctx context.Context, scope Scope, agreementID, fieldID string) error {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return err
	}
	agreementID = normalizeID(agreementID)
	fieldID = normalizeID(fieldID)
	if agreementID == "" {
		return invalidRecordError("fields", "agreement_id", "required")
	}
	if fieldID == "" {
		return invalidRecordError("fields", "id", "required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	agreement, ok := s.agreements[scopedKey(scope, agreementID)]
	if !ok {
		return notFoundError("agreements", agreementID)
	}
	if agreement.Status != AgreementStatusDraft {
		return immutableAgreementError(agreementID, agreement.Status)
	}

	field, exists := s.fields[scopedKey(scope, fieldID)]
	if !exists || field.AgreementID != agreementID {
		return notFoundError("fields", fieldID)
	}
	delete(s.fields, scopedKey(scope, fieldID))

	for key, value := range s.fieldValues {
		if value.TenantID != scope.TenantID || value.OrgID != scope.OrgID {
			continue
		}
		if value.AgreementID == agreementID && value.FieldID == fieldID {
			delete(s.fieldValues, key)
		}
	}

	return nil
}

func (s *InMemoryStore) ListFields(ctx context.Context, scope Scope, agreementID string) ([]FieldRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return nil, invalidRecordError("fields", "agreement_id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]FieldRecord, 0)
	for _, field := range s.fields {
		if field.TenantID != scope.TenantID || field.OrgID != scope.OrgID {
			continue
		}
		if field.AgreementID != agreementID {
			continue
		}
		out = append(out, field)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].PageNumber == out[j].PageNumber {
			return out[i].CreatedAt.Before(out[j].CreatedAt)
		}
		return out[i].PageNumber < out[j].PageNumber
	})
	return out, nil
}

func (s *InMemoryStore) CreateSigningToken(ctx context.Context, scope Scope, record SigningTokenRecord) (SigningTokenRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SigningTokenRecord{}, err
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.AgreementID = normalizeID(record.AgreementID)
	record.RecipientID = normalizeID(record.RecipientID)
	record.TokenHash = strings.TrimSpace(record.TokenHash)
	if record.AgreementID == "" {
		return SigningTokenRecord{}, invalidRecordError("signing_tokens", "agreement_id", "required")
	}
	if record.RecipientID == "" {
		return SigningTokenRecord{}, invalidRecordError("signing_tokens", "recipient_id", "required")
	}
	if record.TokenHash == "" {
		return SigningTokenRecord{}, invalidRecordError("signing_tokens", "token_hash", "required")
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	if record.Status == "" {
		record.Status = SigningTokenStatusActive
	}
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)

	key := scopedKey(scope, record.ID)

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.signingTokens[key]; exists {
		return SigningTokenRecord{}, invalidRecordError("signing_tokens", "id", "already exists")
	}
	if _, exists := s.tokenHashIndex[record.TokenHash]; exists {
		return SigningTokenRecord{}, invalidRecordError("signing_tokens", "token_hash", "already exists")
	}

	record = cloneSigningTokenRecord(record)
	s.signingTokens[key] = record
	s.tokenHashIndex[record.TokenHash] = key
	return record, nil
}

func (s *InMemoryStore) GetSigningTokenByHash(ctx context.Context, scope Scope, tokenHash string) (SigningTokenRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SigningTokenRecord{}, err
	}
	tokenHash = strings.TrimSpace(tokenHash)
	if tokenHash == "" {
		return SigningTokenRecord{}, invalidRecordError("signing_tokens", "token_hash", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	key, ok := s.tokenHashIndex[tokenHash]
	if !ok {
		return SigningTokenRecord{}, notFoundError("signing_tokens", tokenHash)
	}
	record, ok := s.signingTokens[key]
	if !ok {
		return SigningTokenRecord{}, notFoundError("signing_tokens", tokenHash)
	}
	if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
		return SigningTokenRecord{}, scopeDeniedError()
	}

	return cloneSigningTokenRecord(record), nil
}

func (s *InMemoryStore) RevokeActiveSigningTokens(ctx context.Context, scope Scope, agreementID, recipientID string, revokedAt time.Time) (int, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return 0, err
	}
	agreementID = normalizeID(agreementID)
	recipientID = normalizeID(recipientID)
	if agreementID == "" {
		return 0, invalidRecordError("signing_tokens", "agreement_id", "required")
	}
	if recipientID == "" {
		return 0, invalidRecordError("signing_tokens", "recipient_id", "required")
	}
	if revokedAt.IsZero() {
		revokedAt = time.Now().UTC()
	}
	revokedAt = revokedAt.UTC()

	s.mu.Lock()
	defer s.mu.Unlock()

	revoked := 0
	for key, token := range s.signingTokens {
		if token.TenantID != scope.TenantID || token.OrgID != scope.OrgID {
			continue
		}
		if token.AgreementID != agreementID || token.RecipientID != recipientID {
			continue
		}
		if token.Status != SigningTokenStatusActive {
			continue
		}
		token.Status = SigningTokenStatusRevoked
		token.RevokedAt = cloneTimePtr(&revokedAt)
		s.signingTokens[key] = token
		revoked++
	}

	return revoked, nil
}

func (s *InMemoryStore) CreateSignatureArtifact(ctx context.Context, scope Scope, record SignatureArtifactRecord) (SignatureArtifactRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SignatureArtifactRecord{}, err
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.AgreementID = normalizeID(record.AgreementID)
	record.RecipientID = normalizeID(record.RecipientID)
	record.Type = strings.TrimSpace(record.Type)
	record.ObjectKey = strings.TrimSpace(record.ObjectKey)
	record.SHA256 = strings.TrimSpace(record.SHA256)
	if record.AgreementID == "" {
		return SignatureArtifactRecord{}, invalidRecordError("signature_artifacts", "agreement_id", "required")
	}
	if record.RecipientID == "" {
		return SignatureArtifactRecord{}, invalidRecordError("signature_artifacts", "recipient_id", "required")
	}
	if record.Type == "" {
		return SignatureArtifactRecord{}, invalidRecordError("signature_artifacts", "type", "required")
	}
	if record.ObjectKey == "" {
		return SignatureArtifactRecord{}, invalidRecordError("signature_artifacts", "object_key", "required")
	}
	if record.SHA256 == "" {
		return SignatureArtifactRecord{}, invalidRecordError("signature_artifacts", "sha256", "required")
	}

	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)

	key := scopedKey(scope, record.ID)
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.signatureArtifacts[key]; exists {
		return SignatureArtifactRecord{}, invalidRecordError("signature_artifacts", "id", "already exists")
	}
	agreement, ok := s.agreements[scopedKey(scope, record.AgreementID)]
	if !ok {
		return SignatureArtifactRecord{}, notFoundError("agreements", record.AgreementID)
	}
	if agreement.TenantID != scope.TenantID || agreement.OrgID != scope.OrgID {
		return SignatureArtifactRecord{}, scopeDeniedError()
	}
	recipient, ok := s.recipients[scopedKey(scope, record.RecipientID)]
	if !ok {
		return SignatureArtifactRecord{}, notFoundError("recipients", record.RecipientID)
	}
	if recipient.AgreementID != record.AgreementID {
		return SignatureArtifactRecord{}, invalidRecordError("signature_artifacts", "recipient_id", "recipient does not belong to agreement")
	}

	s.signatureArtifacts[key] = record
	return record, nil
}

func (s *InMemoryStore) GetSignatureArtifact(ctx context.Context, scope Scope, id string) (SignatureArtifactRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SignatureArtifactRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return SignatureArtifactRecord{}, invalidRecordError("signature_artifacts", "id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.signatureArtifacts[scopedKey(scope, id)]
	if !ok {
		return SignatureArtifactRecord{}, notFoundError("signature_artifacts", id)
	}
	return record, nil
}

func (s *InMemoryStore) UpsertFieldValue(ctx context.Context, scope Scope, value FieldValueRecord, expectedVersion int64) (FieldValueRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return FieldValueRecord{}, err
	}
	value.AgreementID = normalizeID(value.AgreementID)
	value.RecipientID = normalizeID(value.RecipientID)
	value.FieldID = normalizeID(value.FieldID)
	value.SignatureArtifactID = normalizeID(value.SignatureArtifactID)
	if value.AgreementID == "" {
		return FieldValueRecord{}, invalidRecordError("field_values", "agreement_id", "required")
	}
	if value.RecipientID == "" {
		return FieldValueRecord{}, invalidRecordError("field_values", "recipient_id", "required")
	}
	if value.FieldID == "" {
		return FieldValueRecord{}, invalidRecordError("field_values", "field_id", "required")
	}
	if normalizeID(value.ID) == "" {
		value.ID = uuid.NewString()
	}
	value.ID = normalizeID(value.ID)

	value.TenantID = scope.TenantID
	value.OrgID = scope.OrgID

	key := scopedKey(scope, value.ID)
	s.mu.Lock()
	defer s.mu.Unlock()

	var (
		existingByField FieldValueRecord
		hasByField      bool
	)
	for _, record := range s.fieldValues {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.AgreementID != value.AgreementID || record.RecipientID != value.RecipientID {
			continue
		}
		if record.FieldID != value.FieldID {
			continue
		}
		existingByField = record
		hasByField = true
		break
	}
	if hasByField && value.ID != existingByField.ID {
		value.ID = existingByField.ID
		key = scopedKey(scope, value.ID)
	}

	if value.SignatureArtifactID != "" {
		artifact, ok := s.signatureArtifacts[scopedKey(scope, value.SignatureArtifactID)]
		if !ok {
			return FieldValueRecord{}, notFoundError("signature_artifacts", value.SignatureArtifactID)
		}
		if artifact.AgreementID != value.AgreementID || artifact.RecipientID != value.RecipientID {
			return FieldValueRecord{}, invalidRecordError("field_values", "signature_artifact_id", "artifact does not belong to signer agreement scope")
		}
	}

	existing, exists := s.fieldValues[key]
	if !exists && hasByField {
		existing = existingByField
		exists = true
	}
	if exists {
		if expectedVersion > 0 && existing.Version != expectedVersion {
			return FieldValueRecord{}, versionConflictError("field_values", value.ID, expectedVersion, existing.Version)
		}
		value.CreatedAt = existing.CreatedAt
		value.Version = existing.Version + 1
	} else {
		if value.Version <= 0 {
			value.Version = 1
		}
		value.CreatedAt = normalizeRecordTime(value.CreatedAt)
	}
	value.UpdatedAt = time.Now().UTC()
	s.fieldValues[key] = value
	return value, nil
}

func (s *InMemoryStore) ListFieldValuesByRecipient(ctx context.Context, scope Scope, agreementID, recipientID string) ([]FieldValueRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeID(agreementID)
	recipientID = normalizeID(recipientID)
	if agreementID == "" || recipientID == "" {
		return nil, invalidRecordError("field_values", "agreement_id|recipient_id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]FieldValueRecord, 0)
	for _, record := range s.fieldValues {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.AgreementID != agreementID || record.RecipientID != recipientID {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].UpdatedAt.Before(out[j].UpdatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) Append(ctx context.Context, scope Scope, event AuditEventRecord) (AuditEventRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AuditEventRecord{}, err
	}
	if normalizeID(event.ID) == "" {
		event.ID = uuid.NewString()
	}
	event.ID = normalizeID(event.ID)
	event.AgreementID = normalizeID(event.AgreementID)
	if event.AgreementID == "" {
		return AuditEventRecord{}, invalidRecordError("audit_events", "agreement_id", "required")
	}
	if strings.TrimSpace(event.EventType) == "" {
		return AuditEventRecord{}, invalidRecordError("audit_events", "event_type", "required")
	}

	event.TenantID = scope.TenantID
	event.OrgID = scope.OrgID
	event.CreatedAt = normalizeRecordTime(event.CreatedAt)

	key := scopedKey(scope, event.ID)
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.auditEvents[key]; exists {
		return AuditEventRecord{}, invalidRecordError("audit_events", "id", "already exists")
	}
	s.auditEvents[key] = event
	return event, nil
}

func (s *InMemoryStore) ListForAgreement(ctx context.Context, scope Scope, agreementID string, query AuditEventQuery) ([]AuditEventRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return nil, invalidRecordError("audit_events", "agreement_id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]AuditEventRecord, 0)
	for _, record := range s.auditEvents {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.AgreementID != agreementID {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if query.SortDesc {
			return out[i].CreatedAt.After(out[j].CreatedAt)
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})

	start := query.Offset
	if start < 0 {
		start = 0
	}
	if start > len(out) {
		start = len(out)
	}
	end := len(out)
	if query.Limit > 0 && start+query.Limit < end {
		end = start + query.Limit
	}
	return out[start:end], nil
}

func mergeImmutableArtifactValue(existing, incoming, field string) (string, error) {
	existing = strings.TrimSpace(existing)
	incoming = strings.TrimSpace(incoming)
	if incoming == "" {
		return existing, nil
	}
	if existing != "" && existing != incoming {
		return "", invalidRecordError("agreement_artifacts", field, "immutable once set")
	}
	return incoming, nil
}

func cloneEmailLogRecord(record EmailLogRecord) EmailLogRecord {
	record.SentAt = cloneTimePtr(record.SentAt)
	record.NextRetryAt = cloneTimePtr(record.NextRetryAt)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	return record
}

func cloneJobRunRecord(record JobRunRecord) JobRunRecord {
	record.NextRetryAt = cloneTimePtr(record.NextRetryAt)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	return record
}

func cloneIntegrationCredentialRecord(record IntegrationCredentialRecord) IntegrationCredentialRecord {
	record.Scopes = append([]string{}, record.Scopes...)
	record.ExpiresAt = cloneTimePtr(record.ExpiresAt)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	return record
}

func jobDedupeIndexKey(scope Scope, jobName, dedupeKey string) string {
	return strings.Join([]string{
		scope.key(),
		strings.TrimSpace(jobName),
		strings.TrimSpace(dedupeKey),
	}, "|")
}

func integrationCredentialIndexKey(scope Scope, provider, userID string) string {
	return strings.Join([]string{
		scope.key(),
		strings.ToLower(strings.TrimSpace(provider)),
		normalizeID(userID),
	}, "|")
}

func (s *InMemoryStore) SaveAgreementArtifacts(ctx context.Context, scope Scope, record AgreementArtifactRecord) (AgreementArtifactRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementArtifactRecord{}, err
	}
	agreementID := normalizeID(record.AgreementID)
	if agreementID == "" {
		return AgreementArtifactRecord{}, invalidRecordError("agreement_artifacts", "agreement_id", "required")
	}
	executedKey := strings.TrimSpace(record.ExecutedObjectKey)
	executedSHA := strings.TrimSpace(record.ExecutedSHA256)
	certKey := strings.TrimSpace(record.CertificateObjectKey)
	certSHA := strings.TrimSpace(record.CertificateSHA256)
	if (executedKey == "") != (executedSHA == "") {
		return AgreementArtifactRecord{}, invalidRecordError("agreement_artifacts", "executed_object_key|executed_sha256", "must both be set")
	}
	if (certKey == "") != (certSHA == "") {
		return AgreementArtifactRecord{}, invalidRecordError("agreement_artifacts", "certificate_object_key|certificate_sha256", "must both be set")
	}

	key := scopedKey(scope, agreementID)
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.agreements[key]; !ok {
		return AgreementArtifactRecord{}, notFoundError("agreements", agreementID)
	}

	existing, exists := s.agreementArtifacts[key]
	now := time.Now().UTC()
	if !exists {
		existing = AgreementArtifactRecord{
			AgreementID: agreementID,
			TenantID:    scope.TenantID,
			OrgID:       scope.OrgID,
			CreatedAt:   now,
		}
	}
	mergedExecutedKey, err := mergeImmutableArtifactValue(existing.ExecutedObjectKey, executedKey, "executed_object_key")
	if err != nil {
		return AgreementArtifactRecord{}, err
	}
	mergedExecutedSHA, err := mergeImmutableArtifactValue(existing.ExecutedSHA256, executedSHA, "executed_sha256")
	if err != nil {
		return AgreementArtifactRecord{}, err
	}
	mergedCertKey, err := mergeImmutableArtifactValue(existing.CertificateObjectKey, certKey, "certificate_object_key")
	if err != nil {
		return AgreementArtifactRecord{}, err
	}
	mergedCertSHA, err := mergeImmutableArtifactValue(existing.CertificateSHA256, certSHA, "certificate_sha256")
	if err != nil {
		return AgreementArtifactRecord{}, err
	}
	existing.ExecutedObjectKey = mergedExecutedKey
	existing.ExecutedSHA256 = mergedExecutedSHA
	existing.CertificateObjectKey = mergedCertKey
	existing.CertificateSHA256 = mergedCertSHA
	if correlationID := strings.TrimSpace(record.CorrelationID); correlationID != "" {
		existing.CorrelationID = correlationID
	}
	existing.UpdatedAt = now
	s.agreementArtifacts[key] = existing
	return existing, nil
}

func (s *InMemoryStore) GetAgreementArtifacts(ctx context.Context, scope Scope, agreementID string) (AgreementArtifactRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementArtifactRecord{}, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return AgreementArtifactRecord{}, invalidRecordError("agreement_artifacts", "agreement_id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.agreementArtifacts[scopedKey(scope, agreementID)]
	if !ok {
		return AgreementArtifactRecord{}, notFoundError("agreement_artifacts", agreementID)
	}
	return record, nil
}

func (s *InMemoryStore) CreateEmailLog(ctx context.Context, scope Scope, record EmailLogRecord) (EmailLogRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return EmailLogRecord{}, err
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.AgreementID = normalizeID(record.AgreementID)
	record.RecipientID = normalizeID(record.RecipientID)
	record.TemplateCode = strings.TrimSpace(record.TemplateCode)
	record.ProviderMessageID = strings.TrimSpace(record.ProviderMessageID)
	record.Status = strings.TrimSpace(record.Status)
	if record.AgreementID == "" {
		return EmailLogRecord{}, invalidRecordError("email_logs", "agreement_id", "required")
	}
	if record.TemplateCode == "" {
		return EmailLogRecord{}, invalidRecordError("email_logs", "template_code", "required")
	}
	if record.Status == "" {
		record.Status = "queued"
	}
	if record.AttemptCount <= 0 {
		record.AttemptCount = 1
	}
	if record.MaxAttempts <= 0 {
		record.MaxAttempts = 3
	}
	record.CorrelationID = strings.TrimSpace(record.CorrelationID)
	record.NextRetryAt = cloneTimePtr(record.NextRetryAt)
	record.SentAt = cloneTimePtr(record.SentAt)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)

	key := scopedKey(scope, record.ID)
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.emailLogs[key]; exists {
		return EmailLogRecord{}, invalidRecordError("email_logs", "id", "already exists")
	}
	if _, ok := s.agreements[scopedKey(scope, record.AgreementID)]; !ok {
		return EmailLogRecord{}, notFoundError("agreements", record.AgreementID)
	}
	record = cloneEmailLogRecord(record)
	s.emailLogs[key] = record
	return record, nil
}

func (s *InMemoryStore) UpdateEmailLog(ctx context.Context, scope Scope, id string, patch EmailLogRecord) (EmailLogRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return EmailLogRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return EmailLogRecord{}, invalidRecordError("email_logs", "id", "required")
	}

	key := scopedKey(scope, id)
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.emailLogs[key]
	if !ok {
		return EmailLogRecord{}, notFoundError("email_logs", id)
	}

	if status := strings.TrimSpace(patch.Status); status != "" {
		record.Status = status
	}
	if providerMessageID := strings.TrimSpace(patch.ProviderMessageID); providerMessageID != "" {
		record.ProviderMessageID = providerMessageID
	}
	if patch.AttemptCount > 0 {
		record.AttemptCount = patch.AttemptCount
	}
	if patch.MaxAttempts > 0 {
		record.MaxAttempts = patch.MaxAttempts
	}
	if correlationID := strings.TrimSpace(patch.CorrelationID); correlationID != "" {
		record.CorrelationID = correlationID
	}
	if patch.FailureReason != "" || record.Status == "failed" || record.Status == "retrying" {
		record.FailureReason = strings.TrimSpace(patch.FailureReason)
	}
	if patch.NextRetryAt != nil {
		record.NextRetryAt = cloneTimePtr(patch.NextRetryAt)
	} else if record.Status == "sent" || record.Status == "failed" {
		record.NextRetryAt = nil
	}
	if patch.SentAt != nil {
		record.SentAt = cloneTimePtr(patch.SentAt)
	} else if record.Status == "sent" && record.SentAt == nil {
		now := time.Now().UTC()
		record.SentAt = cloneTimePtr(&now)
	}
	if record.Status == "sent" {
		record.FailureReason = ""
	}
	record.UpdatedAt = normalizeRecordTime(patch.UpdatedAt)
	if patch.UpdatedAt.IsZero() {
		record.UpdatedAt = time.Now().UTC()
	}

	record = cloneEmailLogRecord(record)
	s.emailLogs[key] = record
	return record, nil
}

func (s *InMemoryStore) ListEmailLogs(ctx context.Context, scope Scope, agreementID string) ([]EmailLogRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return nil, invalidRecordError("email_logs", "agreement_id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]EmailLogRecord, 0)
	for _, record := range s.emailLogs {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.AgreementID != agreementID {
			continue
		}
		out = append(out, cloneEmailLogRecord(record))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) BeginJobRun(ctx context.Context, scope Scope, input JobRunInput) (JobRunRecord, bool, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return JobRunRecord{}, false, err
	}
	input.JobName = strings.TrimSpace(input.JobName)
	input.DedupeKey = strings.TrimSpace(input.DedupeKey)
	input.AgreementID = normalizeID(input.AgreementID)
	input.RecipientID = normalizeID(input.RecipientID)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if input.JobName == "" {
		return JobRunRecord{}, false, invalidRecordError("job_runs", "job_name", "required")
	}
	if input.DedupeKey == "" {
		return JobRunRecord{}, false, invalidRecordError("job_runs", "dedupe_key", "required")
	}
	if input.AgreementID == "" {
		return JobRunRecord{}, false, invalidRecordError("job_runs", "agreement_id", "required")
	}
	if input.MaxAttempts <= 0 {
		input.MaxAttempts = 3
	}
	if input.AttemptedAt.IsZero() {
		input.AttemptedAt = time.Now().UTC()
	}
	input.AttemptedAt = input.AttemptedAt.UTC()

	dedupeKey := jobDedupeIndexKey(scope, input.JobName, input.DedupeKey)
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.agreements[scopedKey(scope, input.AgreementID)]; !ok {
		return JobRunRecord{}, false, notFoundError("agreements", input.AgreementID)
	}
	if existingID, exists := s.jobRunDedupeIndex[dedupeKey]; exists {
		record, ok := s.jobRuns[scopedKey(scope, existingID)]
		if !ok {
			return JobRunRecord{}, false, notFoundError("job_runs", existingID)
		}
		if record.Status == JobRunStatusSucceeded {
			return cloneJobRunRecord(record), false, nil
		}
		if record.Status == JobRunStatusRetrying && record.NextRetryAt != nil && input.AttemptedAt.Before(record.NextRetryAt.UTC()) {
			return cloneJobRunRecord(record), false, nil
		}
		if record.AttemptCount >= record.MaxAttempts && record.Status == JobRunStatusFailed {
			return cloneJobRunRecord(record), false, nil
		}
		record.AttemptCount++
		record.Status = JobRunStatusPending
		record.LastError = ""
		record.NextRetryAt = nil
		if input.CorrelationID != "" {
			record.CorrelationID = input.CorrelationID
		}
		record.UpdatedAt = input.AttemptedAt
		record = cloneJobRunRecord(record)
		s.jobRuns[scopedKey(scope, record.ID)] = record
		return record, true, nil
	}

	record := JobRunRecord{
		ID:            uuid.NewString(),
		TenantID:      scope.TenantID,
		OrgID:         scope.OrgID,
		JobName:       input.JobName,
		DedupeKey:     input.DedupeKey,
		AgreementID:   input.AgreementID,
		RecipientID:   input.RecipientID,
		CorrelationID: input.CorrelationID,
		Status:        JobRunStatusPending,
		AttemptCount:  1,
		MaxAttempts:   input.MaxAttempts,
		CreatedAt:     input.AttemptedAt,
		UpdatedAt:     input.AttemptedAt,
	}
	record = cloneJobRunRecord(record)
	s.jobRuns[scopedKey(scope, record.ID)] = record
	s.jobRunDedupeIndex[dedupeKey] = record.ID
	return record, true, nil
}

func (s *InMemoryStore) MarkJobRunSucceeded(ctx context.Context, scope Scope, id string, completedAt time.Time) (JobRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return JobRunRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return JobRunRecord{}, invalidRecordError("job_runs", "id", "required")
	}
	if completedAt.IsZero() {
		completedAt = time.Now().UTC()
	}
	completedAt = completedAt.UTC()

	key := scopedKey(scope, id)
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.jobRuns[key]
	if !ok {
		return JobRunRecord{}, notFoundError("job_runs", id)
	}
	record.Status = JobRunStatusSucceeded
	record.LastError = ""
	record.NextRetryAt = nil
	record.UpdatedAt = completedAt
	record = cloneJobRunRecord(record)
	s.jobRuns[key] = record
	return record, nil
}

func (s *InMemoryStore) MarkJobRunFailed(ctx context.Context, scope Scope, id, failureReason string, nextRetryAt *time.Time, failedAt time.Time) (JobRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return JobRunRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return JobRunRecord{}, invalidRecordError("job_runs", "id", "required")
	}
	failureReason = strings.TrimSpace(failureReason)
	if failureReason == "" {
		failureReason = "job failed"
	}
	if failedAt.IsZero() {
		failedAt = time.Now().UTC()
	}
	failedAt = failedAt.UTC()

	key := scopedKey(scope, id)
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.jobRuns[key]
	if !ok {
		return JobRunRecord{}, notFoundError("job_runs", id)
	}
	record.LastError = failureReason
	if nextRetryAt != nil && record.AttemptCount < record.MaxAttempts {
		next := nextRetryAt.UTC()
		record.Status = JobRunStatusRetrying
		record.NextRetryAt = &next
	} else {
		record.Status = JobRunStatusFailed
		record.NextRetryAt = nil
	}
	record.UpdatedAt = failedAt
	record = cloneJobRunRecord(record)
	s.jobRuns[key] = record
	return record, nil
}

func (s *InMemoryStore) GetJobRunByDedupe(ctx context.Context, scope Scope, jobName, dedupeKey string) (JobRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return JobRunRecord{}, err
	}
	jobName = strings.TrimSpace(jobName)
	dedupeKey = strings.TrimSpace(dedupeKey)
	if jobName == "" || dedupeKey == "" {
		return JobRunRecord{}, invalidRecordError("job_runs", "job_name|dedupe_key", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.jobRunDedupeIndex[jobDedupeIndexKey(scope, jobName, dedupeKey)]
	if !ok {
		return JobRunRecord{}, notFoundError("job_runs", dedupeKey)
	}
	record, ok := s.jobRuns[scopedKey(scope, id)]
	if !ok {
		return JobRunRecord{}, notFoundError("job_runs", id)
	}
	return cloneJobRunRecord(record), nil
}

func (s *InMemoryStore) ListJobRuns(ctx context.Context, scope Scope, agreementID string) ([]JobRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return nil, invalidRecordError("job_runs", "agreement_id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]JobRunRecord, 0)
	for _, record := range s.jobRuns {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.AgreementID != agreementID {
			continue
		}
		out = append(out, cloneJobRunRecord(record))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].UpdatedAt.Equal(out[j].UpdatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].UpdatedAt.Before(out[j].UpdatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) UpsertIntegrationCredential(ctx context.Context, scope Scope, record IntegrationCredentialRecord) (IntegrationCredentialRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return IntegrationCredentialRecord{}, err
	}
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.UserID = normalizeID(record.UserID)
	record.EncryptedAccessToken = strings.TrimSpace(record.EncryptedAccessToken)
	record.EncryptedRefreshToken = strings.TrimSpace(record.EncryptedRefreshToken)
	if record.Provider == "" {
		return IntegrationCredentialRecord{}, invalidRecordError("integration_credentials", "provider", "required")
	}
	if record.UserID == "" {
		return IntegrationCredentialRecord{}, invalidRecordError("integration_credentials", "user_id", "required")
	}
	if record.EncryptedAccessToken == "" {
		return IntegrationCredentialRecord{}, invalidRecordError("integration_credentials", "encrypted_access_token", "required")
	}
	scopes := make([]string, 0, len(record.Scopes))
	for _, scopeValue := range record.Scopes {
		if scopeText := strings.TrimSpace(scopeValue); scopeText != "" {
			scopes = append(scopes, scopeText)
		}
	}
	record.Scopes = scopes
	record.ExpiresAt = cloneTimePtr(record.ExpiresAt)
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID

	now := time.Now().UTC()
	indexKey := integrationCredentialIndexKey(scope, record.Provider, record.UserID)

	s.mu.Lock()
	defer s.mu.Unlock()

	if existingID, ok := s.integrationCredentialIndex[indexKey]; ok {
		existing, ok := s.integrationCredentials[scopedKey(scope, existingID)]
		if !ok {
			return IntegrationCredentialRecord{}, notFoundError("integration_credentials", existingID)
		}
		record.ID = existing.ID
		record.CreatedAt = existing.CreatedAt
		record.UpdatedAt = now
		record = cloneIntegrationCredentialRecord(record)
		s.integrationCredentials[scopedKey(scope, record.ID)] = record
		s.integrationCredentialIndex[indexKey] = record.ID
		return record, nil
	}

	record.CreatedAt = now
	record.UpdatedAt = now
	record = cloneIntegrationCredentialRecord(record)
	s.integrationCredentials[scopedKey(scope, record.ID)] = record
	s.integrationCredentialIndex[indexKey] = record.ID
	return record, nil
}

func (s *InMemoryStore) GetIntegrationCredential(ctx context.Context, scope Scope, provider, userID string) (IntegrationCredentialRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return IntegrationCredentialRecord{}, err
	}
	provider = strings.ToLower(strings.TrimSpace(provider))
	userID = normalizeID(userID)
	if provider == "" {
		return IntegrationCredentialRecord{}, invalidRecordError("integration_credentials", "provider", "required")
	}
	if userID == "" {
		return IntegrationCredentialRecord{}, invalidRecordError("integration_credentials", "user_id", "required")
	}

	indexKey := integrationCredentialIndexKey(scope, provider, userID)

	s.mu.RLock()
	defer s.mu.RUnlock()

	id, ok := s.integrationCredentialIndex[indexKey]
	if !ok {
		return IntegrationCredentialRecord{}, notFoundError("integration_credentials", provider+"|"+userID)
	}
	record, ok := s.integrationCredentials[scopedKey(scope, id)]
	if !ok {
		return IntegrationCredentialRecord{}, notFoundError("integration_credentials", id)
	}
	return cloneIntegrationCredentialRecord(record), nil
}

func (s *InMemoryStore) DeleteIntegrationCredential(ctx context.Context, scope Scope, provider, userID string) error {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return err
	}
	provider = strings.ToLower(strings.TrimSpace(provider))
	userID = normalizeID(userID)
	if provider == "" {
		return invalidRecordError("integration_credentials", "provider", "required")
	}
	if userID == "" {
		return invalidRecordError("integration_credentials", "user_id", "required")
	}
	indexKey := integrationCredentialIndexKey(scope, provider, userID)

	s.mu.Lock()
	defer s.mu.Unlock()
	id, ok := s.integrationCredentialIndex[indexKey]
	if !ok {
		return notFoundError("integration_credentials", provider+"|"+userID)
	}
	delete(s.integrationCredentialIndex, indexKey)
	delete(s.integrationCredentials, scopedKey(scope, id))
	return nil
}

// UpdateAuditEvent always rejects writes because audit_events is append-only.
func (s *InMemoryStore) UpdateAuditEvent(ctx context.Context, scope Scope, id string, _ AuditEventRecord) error {
	_ = ctx
	_, err := validateScope(scope)
	if err != nil {
		return err
	}
	if normalizeID(id) == "" {
		return invalidRecordError("audit_events", "id", "required")
	}
	return auditEventsAppendOnlyError()
}

// DeleteAuditEvent always rejects writes because audit_events is append-only.
func (s *InMemoryStore) DeleteAuditEvent(ctx context.Context, scope Scope, id string) error {
	_ = ctx
	_, err := validateScope(scope)
	if err != nil {
		return err
	}
	if normalizeID(id) == "" {
		return invalidRecordError("audit_events", "id", "required")
	}
	return auditEventsAppendOnlyError()
}
