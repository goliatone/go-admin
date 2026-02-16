package stores

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

const defaultDraftTTL = 7 * 24 * time.Hour

// InMemoryStore is a phase-1 repository implementation with scope-safe query helpers.
type InMemoryStore struct {
	mu sync.RWMutex

	documents                  map[string]DocumentRecord
	agreements                 map[string]AgreementRecord
	drafts                     map[string]DraftRecord
	draftWizardIndex           map[string]string
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
	googleImportRuns           map[string]GoogleImportRunRecord
	googleImportRunDedupeIndex map[string]string
	outboxMessages             map[string]OutboxMessageRecord
	integrationCredentials     map[string]IntegrationCredentialRecord
	integrationCredentialIndex map[string]string
	mappingSpecs               map[string]MappingSpecRecord
	integrationBindings        map[string]IntegrationBindingRecord
	integrationBindingIndex    map[string]string
	integrationSyncRuns        map[string]IntegrationSyncRunRecord
	integrationCheckpoints     map[string]IntegrationCheckpointRecord
	integrationCheckpointIndex map[string]string
	integrationConflicts       map[string]IntegrationConflictRecord
	integrationChangeEvents    map[string]IntegrationChangeEventRecord
	integrationMutationClaims  map[string]time.Time
	placementRuns              map[string]PlacementRunRecord
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		documents:                  map[string]DocumentRecord{},
		agreements:                 map[string]AgreementRecord{},
		drafts:                     map[string]DraftRecord{},
		draftWizardIndex:           map[string]string{},
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
		googleImportRuns:           map[string]GoogleImportRunRecord{},
		googleImportRunDedupeIndex: map[string]string{},
		outboxMessages:             map[string]OutboxMessageRecord{},
		integrationCredentials:     map[string]IntegrationCredentialRecord{},
		integrationCredentialIndex: map[string]string{},
		mappingSpecs:               map[string]MappingSpecRecord{},
		integrationBindings:        map[string]IntegrationBindingRecord{},
		integrationBindingIndex:    map[string]string{},
		integrationSyncRuns:        map[string]IntegrationSyncRunRecord{},
		integrationCheckpoints:     map[string]IntegrationCheckpointRecord{},
		integrationCheckpointIndex: map[string]string{},
		integrationConflicts:       map[string]IntegrationConflictRecord{},
		integrationChangeEvents:    map[string]IntegrationChangeEventRecord{},
		integrationMutationClaims:  map[string]time.Time{},
		placementRuns:              map[string]PlacementRunRecord{},
	}
}

// WithTx executes fn within a transactional scope.
// InMemoryStore provides snapshot-based atomic commit semantics:
// all tx writes are applied on a cloned store and committed only on success.
func (s *InMemoryStore) WithTx(ctx context.Context, fn func(tx TxStore) error) error {
	_ = ctx
	if fn == nil {
		return nil
	}
	if s == nil {
		return invalidRecordError("transactions", "store", "not configured")
	}
	txStore, err := s.cloneForTx()
	if err != nil {
		return err
	}
	if err := fn(txStore); err != nil {
		return err
	}
	return s.commitFromTx(txStore)
}

func (s *InMemoryStore) cloneForTx() (*InMemoryStore, error) {
	if s == nil {
		return nil, invalidRecordError("transactions", "store", "not configured")
	}
	snapshot, err := s.snapshot()
	if err != nil {
		return nil, err
	}
	out := NewInMemoryStore()
	out.applySnapshot(snapshot)
	return out, nil
}

func (s *InMemoryStore) commitFromTx(txStore *InMemoryStore) error {
	if s == nil {
		return invalidRecordError("transactions", "store", "not configured")
	}
	if txStore == nil {
		return invalidRecordError("transactions", "tx_store", "not configured")
	}
	snapshot, err := txStore.snapshot()
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.applySnapshot(snapshot)
	return nil
}

func (s *InMemoryStore) snapshot() (sqliteStoreSnapshot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	payload := sqliteStoreSnapshot{
		Documents:                  s.documents,
		Agreements:                 s.agreements,
		Drafts:                     s.drafts,
		DraftWizardIndex:           s.draftWizardIndex,
		Participants:               s.participants,
		FieldDefinitions:           s.fieldDefinitions,
		FieldInstances:             s.fieldInstances,
		Recipients:                 s.recipients,
		Fields:                     s.fields,
		SigningTokens:              s.signingTokens,
		TokenHashIndex:             s.tokenHashIndex,
		SignatureArtifacts:         s.signatureArtifacts,
		FieldValues:                s.fieldValues,
		AuditEvents:                s.auditEvents,
		AgreementArtifacts:         s.agreementArtifacts,
		EmailLogs:                  s.emailLogs,
		JobRuns:                    s.jobRuns,
		JobRunDedupeIndex:          s.jobRunDedupeIndex,
		GoogleImportRuns:           s.googleImportRuns,
		GoogleImportRunDedupeIndex: s.googleImportRunDedupeIndex,
		OutboxMessages:             s.outboxMessages,
		IntegrationCredentials:     s.integrationCredentials,
		IntegrationCredentialIndex: s.integrationCredentialIndex,
		MappingSpecs:               s.mappingSpecs,
		IntegrationBindings:        s.integrationBindings,
		IntegrationBindingIndex:    s.integrationBindingIndex,
		IntegrationSyncRuns:        s.integrationSyncRuns,
		IntegrationCheckpoints:     s.integrationCheckpoints,
		IntegrationCheckpointIndex: s.integrationCheckpointIndex,
		IntegrationConflicts:       s.integrationConflicts,
		IntegrationChangeEvents:    s.integrationChangeEvents,
		IntegrationMutationClaims:  s.integrationMutationClaims,
		PlacementRuns:              s.placementRuns,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return sqliteStoreSnapshot{}, fmt.Errorf("snapshot store state: %w", err)
	}
	var cloned sqliteStoreSnapshot
	if err := json.Unmarshal(raw, &cloned); err != nil {
		return sqliteStoreSnapshot{}, fmt.Errorf("clone store state: %w", err)
	}
	return cloned, nil
}

func (s *InMemoryStore) applySnapshot(snapshot sqliteStoreSnapshot) {
	s.documents = ensureDocumentMap(snapshot.Documents)
	s.agreements = ensureAgreementMap(snapshot.Agreements)
	s.drafts = ensureDraftMap(snapshot.Drafts)
	s.draftWizardIndex = ensureStringMap(snapshot.DraftWizardIndex)
	s.participants = ensureParticipantMap(snapshot.Participants)
	s.fieldDefinitions = ensureFieldDefinitionMap(snapshot.FieldDefinitions)
	s.fieldInstances = ensureFieldInstanceMap(snapshot.FieldInstances)
	s.recipients = ensureRecipientMap(snapshot.Recipients)
	s.fields = ensureFieldMap(snapshot.Fields)
	s.signingTokens = ensureSigningTokenMap(snapshot.SigningTokens)
	s.tokenHashIndex = ensureStringMap(snapshot.TokenHashIndex)
	s.signatureArtifacts = ensureSignatureArtifactMap(snapshot.SignatureArtifacts)
	s.fieldValues = ensureFieldValueMap(snapshot.FieldValues)
	s.auditEvents = ensureAuditEventMap(snapshot.AuditEvents)
	s.agreementArtifacts = ensureAgreementArtifactMap(snapshot.AgreementArtifacts)
	s.emailLogs = ensureEmailLogMap(snapshot.EmailLogs)
	s.jobRuns = ensureJobRunMap(snapshot.JobRuns)
	s.jobRunDedupeIndex = ensureStringMap(snapshot.JobRunDedupeIndex)
	s.googleImportRuns = ensureGoogleImportRunMap(snapshot.GoogleImportRuns)
	s.googleImportRunDedupeIndex = ensureStringMap(snapshot.GoogleImportRunDedupeIndex)
	s.outboxMessages = ensureOutboxMessageMap(snapshot.OutboxMessages)
	s.integrationCredentials = ensureIntegrationCredentialMap(snapshot.IntegrationCredentials)
	s.integrationCredentialIndex = ensureStringMap(snapshot.IntegrationCredentialIndex)
	s.mappingSpecs = ensureMappingSpecMap(snapshot.MappingSpecs)
	s.integrationBindings = ensureIntegrationBindingMap(snapshot.IntegrationBindings)
	s.integrationBindingIndex = ensureStringMap(snapshot.IntegrationBindingIndex)
	s.integrationSyncRuns = ensureIntegrationSyncRunMap(snapshot.IntegrationSyncRuns)
	s.integrationCheckpoints = ensureIntegrationCheckpointMap(snapshot.IntegrationCheckpoints)
	s.integrationCheckpointIndex = ensureStringMap(snapshot.IntegrationCheckpointIndex)
	s.integrationConflicts = ensureIntegrationConflictMap(snapshot.IntegrationConflicts)
	s.integrationChangeEvents = ensureIntegrationChangeEventMap(snapshot.IntegrationChangeEvents)
	s.integrationMutationClaims = ensureTimeMap(snapshot.IntegrationMutationClaims)
	s.placementRuns = ensurePlacementRunMap(snapshot.PlacementRuns)
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
	record.SourceMimeType = strings.TrimSpace(record.SourceMimeType)
	record.SourceIngestionMode = strings.TrimSpace(record.SourceIngestionMode)
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
	record.SourceMimeType = strings.TrimSpace(record.SourceMimeType)
	record.SourceIngestionMode = strings.TrimSpace(record.SourceIngestionMode)

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

func (s *InMemoryStore) CreateDraftSession(ctx context.Context, scope Scope, record DraftRecord) (DraftRecord, bool, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return DraftRecord{}, false, err
	}
	record.WizardID = strings.TrimSpace(record.WizardID)
	record.CreatedByUserID = normalizeID(record.CreatedByUserID)
	if record.WizardID == "" {
		return DraftRecord{}, false, invalidRecordError("drafts", "wizard_id", "required")
	}
	if record.CreatedByUserID == "" {
		return DraftRecord{}, false, invalidRecordError("drafts", "created_by_user_id", "required")
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.DocumentID = normalizeID(record.DocumentID)
	record.Title = strings.TrimSpace(record.Title)
	record.WizardStateJSON = strings.TrimSpace(record.WizardStateJSON)
	if record.WizardStateJSON == "" {
		record.WizardStateJSON = "{}"
	}
	if record.CurrentStep <= 0 {
		record.CurrentStep = 1
	}
	if record.CurrentStep > 6 {
		return DraftRecord{}, false, invalidRecordError("drafts", "current_step", "must be between 1 and 6")
	}
	if record.Revision <= 0 {
		record.Revision = 1
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	if record.ExpiresAt.IsZero() {
		record.ExpiresAt = record.UpdatedAt.Add(defaultDraftTTL).UTC()
	} else {
		record.ExpiresAt = record.ExpiresAt.UTC()
	}

	key := scopedKey(scope, record.ID)
	indexKey := draftWizardIndexKey(scope, record.CreatedByUserID, record.WizardID)
	referenceNow := record.UpdatedAt.UTC()
	if referenceNow.IsZero() {
		referenceNow = time.Now().UTC()
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if existingID, ok := s.draftWizardIndex[indexKey]; ok {
		if existing, exists := s.drafts[scopedKey(scope, existingID)]; exists {
			if !existing.ExpiresAt.IsZero() && !existing.ExpiresAt.After(referenceNow) {
				delete(s.drafts, scopedKey(scope, existingID))
				delete(s.draftWizardIndex, indexKey)
			} else {
				// Idempotent create replays still refresh TTL/updated timestamps without bumping revision.
				now := record.UpdatedAt
				if now.IsZero() {
					now = time.Now().UTC()
				}
				expiresAt := record.ExpiresAt
				if expiresAt.IsZero() {
					expiresAt = now.Add(defaultDraftTTL).UTC()
				}
				existing.UpdatedAt = now.UTC()
				existing.ExpiresAt = expiresAt.UTC()
				existing = cloneDraftRecord(existing)
				s.drafts[scopedKey(scope, existingID)] = existing
				return cloneDraftRecord(existing), true, nil
			}
		} else {
			delete(s.draftWizardIndex, indexKey)
		}
	}
	if _, exists := s.drafts[key]; exists {
		return DraftRecord{}, false, invalidRecordError("drafts", "id", "already exists")
	}
	record = cloneDraftRecord(record)
	s.drafts[key] = record
	s.draftWizardIndex[indexKey] = record.ID
	return cloneDraftRecord(record), false, nil
}

func (s *InMemoryStore) GetDraftSession(ctx context.Context, scope Scope, id string) (DraftRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return DraftRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return DraftRecord{}, invalidRecordError("drafts", "id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.drafts[scopedKey(scope, id)]
	if !ok {
		return DraftRecord{}, notFoundError("drafts", id)
	}
	if !record.ExpiresAt.IsZero() && !record.ExpiresAt.After(time.Now().UTC()) {
		return DraftRecord{}, notFoundError("drafts", id)
	}
	return cloneDraftRecord(record), nil
}

func (s *InMemoryStore) ListDraftSessions(ctx context.Context, scope Scope, query DraftQuery) ([]DraftRecord, string, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, "", err
	}
	createdByUserID := normalizeID(query.CreatedByUserID)
	if createdByUserID == "" {
		return nil, "", invalidRecordError("drafts", "created_by_user_id", "required")
	}
	limit := query.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	offset := parseDraftCursorOffset(query.Cursor)
	if offset < 0 {
		offset = 0
	}
	wizardIDFilter := strings.TrimSpace(query.WizardID)

	s.mu.RLock()
	defer s.mu.RUnlock()

	now := time.Now().UTC()
	out := make([]DraftRecord, 0)
	for _, record := range s.drafts {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.CreatedByUserID != createdByUserID {
			continue
		}
		if wizardIDFilter != "" && record.WizardID != wizardIDFilter {
			continue
		}
		if !record.ExpiresAt.IsZero() && !record.ExpiresAt.After(now) {
			continue
		}
		out = append(out, cloneDraftRecord(record))
	}
	sort.Slice(out, func(i, j int) bool {
		if query.SortDesc {
			if out[i].UpdatedAt.Equal(out[j].UpdatedAt) {
				return out[i].ID > out[j].ID
			}
			return out[i].UpdatedAt.After(out[j].UpdatedAt)
		}
		if out[i].UpdatedAt.Equal(out[j].UpdatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].UpdatedAt.Before(out[j].UpdatedAt)
	})

	if offset > len(out) {
		offset = len(out)
	}
	end := offset + limit
	if end > len(out) {
		end = len(out)
	}
	page := out[offset:end]
	nextCursor := ""
	if end < len(out) {
		nextCursor = strconv.Itoa(end)
	}
	return page, nextCursor, nil
}

func (s *InMemoryStore) UpdateDraftSession(ctx context.Context, scope Scope, id string, patch DraftPatch, expectedRevision int64) (DraftRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return DraftRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return DraftRecord{}, invalidRecordError("drafts", "id", "required")
	}
	if expectedRevision <= 0 {
		return DraftRecord{}, invalidRecordError("drafts", "expected_revision", "required")
	}

	key := scopedKey(scope, id)
	s.mu.Lock()
	defer s.mu.Unlock()

	record, ok := s.drafts[key]
	if !ok {
		return DraftRecord{}, notFoundError("drafts", id)
	}
	if !record.ExpiresAt.IsZero() && !record.ExpiresAt.After(time.Now().UTC()) {
		return DraftRecord{}, notFoundError("drafts", id)
	}
	if record.Revision != expectedRevision {
		return DraftRecord{}, versionConflictError("drafts", id, expectedRevision, record.Revision)
	}

	if patch.WizardStateJSON != nil {
		record.WizardStateJSON = strings.TrimSpace(*patch.WizardStateJSON)
		if record.WizardStateJSON == "" {
			record.WizardStateJSON = "{}"
		}
	}
	if patch.Title != nil {
		record.Title = strings.TrimSpace(*patch.Title)
	}
	if patch.CurrentStep != nil {
		if *patch.CurrentStep <= 0 || *patch.CurrentStep > 6 {
			return DraftRecord{}, invalidRecordError("drafts", "current_step", "must be between 1 and 6")
		}
		record.CurrentStep = *patch.CurrentStep
	}
	if patch.DocumentID != nil {
		record.DocumentID = normalizeID(*patch.DocumentID)
	}

	if patch.UpdatedAt != nil && !patch.UpdatedAt.IsZero() {
		record.UpdatedAt = patch.UpdatedAt.UTC()
	} else {
		record.UpdatedAt = time.Now().UTC()
	}
	if patch.ExpiresAt != nil && !patch.ExpiresAt.IsZero() {
		record.ExpiresAt = patch.ExpiresAt.UTC()
	} else if record.ExpiresAt.IsZero() {
		record.ExpiresAt = record.UpdatedAt.Add(defaultDraftTTL).UTC()
	}

	record.Revision++
	record = cloneDraftRecord(record)
	s.drafts[key] = record
	return cloneDraftRecord(record), nil
}

func (s *InMemoryStore) DeleteDraftSession(ctx context.Context, scope Scope, id string) error {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return err
	}
	id = normalizeID(id)
	if id == "" {
		return invalidRecordError("drafts", "id", "required")
	}
	key := scopedKey(scope, id)
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.drafts[key]
	if !ok {
		return notFoundError("drafts", id)
	}
	delete(s.drafts, key)
	delete(s.draftWizardIndex, draftWizardIndexKey(scope, record.CreatedByUserID, record.WizardID))
	return nil
}

func (s *InMemoryStore) DeleteExpiredDraftSessions(ctx context.Context, before time.Time) (int, error) {
	_ = ctx
	if before.IsZero() {
		before = time.Now().UTC()
	}
	before = before.UTC()

	s.mu.Lock()
	defer s.mu.Unlock()
	deleted := 0
	for key, record := range s.drafts {
		if record.ExpiresAt.IsZero() || record.ExpiresAt.After(before) {
			continue
		}
		delete(s.drafts, key)
		delete(s.draftWizardIndex, draftWizardIndexKey(Scope{TenantID: record.TenantID, OrgID: record.OrgID}, record.CreatedByUserID, record.WizardID))
		deleted++
	}
	return deleted, nil
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

func (s *InMemoryStore) UpsertParticipantDraft(ctx context.Context, scope Scope, agreementID string, patch ParticipantDraftPatch, expectedVersion int64) (ParticipantRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return ParticipantRecord{}, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return ParticipantRecord{}, invalidRecordError("participants", "agreement_id", "required")
	}

	participantID := normalizeID(patch.ID)
	if participantID == "" {
		participantID = uuid.NewString()
	}
	key := scopedKey(scope, participantID)

	s.mu.Lock()
	defer s.mu.Unlock()

	agreement, ok := s.agreements[scopedKey(scope, agreementID)]
	if !ok {
		return ParticipantRecord{}, notFoundError("agreements", agreementID)
	}
	if agreement.Status != AgreementStatusDraft {
		return ParticipantRecord{}, immutableAgreementError(agreement.ID, agreement.Status)
	}

	record, exists := s.participants[key]
	if !exists {
		record = ParticipantRecord{
			ID:           participantID,
			TenantID:     scope.TenantID,
			OrgID:        scope.OrgID,
			AgreementID:  agreementID,
			Role:         RecipientRoleSigner,
			SigningStage: 1,
			Version:      1,
			CreatedAt:    time.Now().UTC(),
		}
	} else if expectedVersion > 0 && record.Version != expectedVersion {
		return ParticipantRecord{}, versionConflictError("participants", participantID, expectedVersion, record.Version)
	}

	if patch.Email != nil {
		record.Email = strings.TrimSpace(*patch.Email)
	}
	if patch.Name != nil {
		record.Name = strings.TrimSpace(*patch.Name)
	}
	if patch.Role != nil {
		record.Role = strings.ToLower(strings.TrimSpace(*patch.Role))
	}
	if patch.SigningStage != nil {
		record.SigningStage = *patch.SigningStage
	}
	if record.Role == "" {
		record.Role = RecipientRoleSigner
	}

	if record.Email == "" {
		return ParticipantRecord{}, invalidRecordError("participants", "email", "required")
	}
	if record.Role != RecipientRoleSigner && record.Role != RecipientRoleCC {
		return ParticipantRecord{}, invalidRecordError("participants", "role", "must be signer or cc")
	}
	if record.SigningStage <= 0 {
		return ParticipantRecord{}, invalidRecordError("participants", "signing_stage", "must be positive")
	}

	if exists {
		record.Version++
	}
	record.UpdatedAt = time.Now().UTC()
	s.participants[key] = record
	return record, nil
}

func (s *InMemoryStore) DeleteParticipantDraft(ctx context.Context, scope Scope, agreementID, participantID string) error {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return err
	}
	agreementID = normalizeID(agreementID)
	participantID = normalizeID(participantID)
	if agreementID == "" {
		return invalidRecordError("participants", "agreement_id", "required")
	}
	if participantID == "" {
		return invalidRecordError("participants", "id", "required")
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

	participantKey := scopedKey(scope, participantID)
	record, exists := s.participants[participantKey]
	if !exists || record.AgreementID != agreementID {
		return notFoundError("participants", participantID)
	}
	delete(s.participants, participantKey)

	for key, definition := range s.fieldDefinitions {
		if definition.TenantID != scope.TenantID || definition.OrgID != scope.OrgID {
			continue
		}
		if definition.AgreementID == agreementID && definition.ParticipantID == participantID {
			delete(s.fieldDefinitions, key)
			for instanceKey, instance := range s.fieldInstances {
				if instance.TenantID != scope.TenantID || instance.OrgID != scope.OrgID {
					continue
				}
				if instance.AgreementID == agreementID && instance.FieldDefinitionID == definition.ID {
					delete(s.fieldInstances, instanceKey)
					for valueKey, value := range s.fieldValues {
						if value.TenantID != scope.TenantID || value.OrgID != scope.OrgID {
							continue
						}
						if value.AgreementID == agreementID && value.FieldID == instance.ID {
							delete(s.fieldValues, valueKey)
						}
					}
				}
			}
		}
	}
	for valueKey, value := range s.fieldValues {
		if value.TenantID != scope.TenantID || value.OrgID != scope.OrgID {
			continue
		}
		if value.AgreementID == agreementID && value.RecipientID == participantID {
			delete(s.fieldValues, valueKey)
		}
	}
	return nil
}

func (s *InMemoryStore) ListParticipants(ctx context.Context, scope Scope, agreementID string) ([]ParticipantRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return nil, invalidRecordError("participants", "agreement_id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]ParticipantRecord, 0)
	for _, record := range s.participants {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.AgreementID != agreementID {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].SigningStage == out[j].SigningStage {
			return out[i].CreatedAt.Before(out[j].CreatedAt)
		}
		return out[i].SigningStage < out[j].SigningStage
	})
	return out, nil
}

func (s *InMemoryStore) UpsertRecipientDraft(ctx context.Context, scope Scope, agreementID string, patch RecipientDraftPatch, expectedVersion int64) (RecipientRecord, error) {
	participantPatch := ParticipantDraftPatch{
		ID:    patch.ID,
		Email: patch.Email,
		Name:  patch.Name,
		Role:  patch.Role,
	}
	if patch.SigningOrder != nil {
		participantPatch.SigningStage = patch.SigningOrder
	}
	participant, err := s.UpsertParticipantDraft(ctx, scope, agreementID, participantPatch, expectedVersion)
	if err != nil {
		return RecipientRecord{}, err
	}
	return participantToRecipient(participant), nil
}

func (s *InMemoryStore) ListRecipients(ctx context.Context, scope Scope, agreementID string) ([]RecipientRecord, error) {
	participants, err := s.ListParticipants(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	out := make([]RecipientRecord, 0, len(participants))
	for _, participant := range participants {
		out = append(out, participantToRecipient(participant))
	}
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
		return RecipientRecord{}, invalidRecordError("participants", "agreement_id", "required")
	}
	if recipientID == "" {
		return RecipientRecord{}, invalidRecordError("participants", "id", "required")
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
	record, ok := s.participants[key]
	if !ok || record.AgreementID != agreementID {
		return RecipientRecord{}, notFoundError("participants", recipientID)
	}
	if record.FirstViewAt == nil {
		record.FirstViewAt = cloneTimePtr(&viewedAt)
	}
	record.LastViewAt = cloneTimePtr(&viewedAt)
	record.UpdatedAt = time.Now().UTC()
	record.Version++
	s.participants[key] = record
	return participantToRecipient(record), nil
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
		return RecipientRecord{}, invalidRecordError("participants", "agreement_id", "required")
	}
	if recipientID == "" {
		return RecipientRecord{}, invalidRecordError("participants", "id", "required")
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
	record, ok := s.participants[key]
	if !ok || record.AgreementID != agreementID {
		return RecipientRecord{}, notFoundError("participants", recipientID)
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return RecipientRecord{}, versionConflictError("participants", recipientID, expectedVersion, record.Version)
	}
	record.CompletedAt = cloneTimePtr(&completedAt)
	record.UpdatedAt = time.Now().UTC()
	record.Version++
	s.participants[key] = record
	return participantToRecipient(record), nil
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
		return RecipientRecord{}, invalidRecordError("participants", "agreement_id", "required")
	}
	if recipientID == "" {
		return RecipientRecord{}, invalidRecordError("participants", "id", "required")
	}
	if reason == "" {
		return RecipientRecord{}, invalidRecordError("participants", "decline_reason", "required")
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
	record, ok := s.participants[key]
	if !ok || record.AgreementID != agreementID {
		return RecipientRecord{}, notFoundError("participants", recipientID)
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return RecipientRecord{}, versionConflictError("participants", recipientID, expectedVersion, record.Version)
	}
	record.DeclinedAt = cloneTimePtr(&declinedAt)
	record.DeclineReason = reason
	record.UpdatedAt = time.Now().UTC()
	record.Version++
	s.participants[key] = record
	return participantToRecipient(record), nil
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
	return s.DeleteParticipantDraft(ctx, scope, agreementID, recipientID)
}

func (s *InMemoryStore) UpsertFieldDefinitionDraft(ctx context.Context, scope Scope, agreementID string, patch FieldDefinitionDraftPatch) (FieldDefinitionRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return FieldDefinitionRecord{}, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return FieldDefinitionRecord{}, invalidRecordError("field_definitions", "agreement_id", "required")
	}

	definitionID := normalizeID(patch.ID)
	if definitionID == "" {
		definitionID = uuid.NewString()
	}
	key := scopedKey(scope, definitionID)

	s.mu.Lock()
	defer s.mu.Unlock()
	agreement, ok := s.agreements[scopedKey(scope, agreementID)]
	if !ok {
		return FieldDefinitionRecord{}, notFoundError("agreements", agreementID)
	}
	if agreement.Status != AgreementStatusDraft {
		return FieldDefinitionRecord{}, immutableAgreementError(agreementID, agreement.Status)
	}

	record, exists := s.fieldDefinitions[key]
	if !exists {
		record = FieldDefinitionRecord{
			ID:             definitionID,
			TenantID:       scope.TenantID,
			OrgID:          scope.OrgID,
			AgreementID:    agreementID,
			Type:           FieldTypeText,
			Required:       false,
			ValidationJSON: "",
			CreatedAt:      time.Now().UTC(),
		}
	}
	if patch.ParticipantID != nil {
		record.ParticipantID = normalizeID(*patch.ParticipantID)
	}
	if patch.Type != nil {
		record.Type = strings.TrimSpace(*patch.Type)
	}
	if patch.Required != nil {
		record.Required = *patch.Required
	}
	if patch.ValidationJSON != nil {
		record.ValidationJSON = strings.TrimSpace(*patch.ValidationJSON)
	}
	if record.Type == FieldTypeDateSigned {
		record.Required = true
	}
	if !isSupportedFieldType(record.Type) {
		return FieldDefinitionRecord{}, invalidRecordError("field_definitions", "field_type", "unsupported type")
	}
	if record.ParticipantID == "" {
		return FieldDefinitionRecord{}, invalidRecordError("field_definitions", "participant_id", "required")
	}
	participant, ok := s.participants[scopedKey(scope, record.ParticipantID)]
	if !ok || participant.AgreementID != agreementID {
		return FieldDefinitionRecord{}, notFoundError("participants", record.ParticipantID)
	}
	if participant.Role != RecipientRoleSigner {
		return FieldDefinitionRecord{}, invalidSignerStateError("field definitions cannot target cc participants")
	}
	record.UpdatedAt = time.Now().UTC()
	s.fieldDefinitions[key] = record
	return record, nil
}

func (s *InMemoryStore) DeleteFieldDefinitionDraft(ctx context.Context, scope Scope, agreementID, fieldDefinitionID string) error {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return err
	}
	agreementID = normalizeID(agreementID)
	fieldDefinitionID = normalizeID(fieldDefinitionID)
	if agreementID == "" {
		return invalidRecordError("field_definitions", "agreement_id", "required")
	}
	if fieldDefinitionID == "" {
		return invalidRecordError("field_definitions", "id", "required")
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
	key := scopedKey(scope, fieldDefinitionID)
	record, ok := s.fieldDefinitions[key]
	if !ok || record.AgreementID != agreementID {
		return notFoundError("field_definitions", fieldDefinitionID)
	}
	delete(s.fieldDefinitions, key)
	for instanceKey, instance := range s.fieldInstances {
		if instance.TenantID != scope.TenantID || instance.OrgID != scope.OrgID {
			continue
		}
		if instance.AgreementID == agreementID && instance.FieldDefinitionID == fieldDefinitionID {
			delete(s.fieldInstances, instanceKey)
			for valueKey, value := range s.fieldValues {
				if value.TenantID != scope.TenantID || value.OrgID != scope.OrgID {
					continue
				}
				if value.AgreementID == agreementID && value.FieldID == instance.ID {
					delete(s.fieldValues, valueKey)
				}
			}
		}
	}
	return nil
}

func (s *InMemoryStore) ListFieldDefinitions(ctx context.Context, scope Scope, agreementID string) ([]FieldDefinitionRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return nil, invalidRecordError("field_definitions", "agreement_id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]FieldDefinitionRecord, 0)
	for _, record := range s.fieldDefinitions {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.AgreementID != agreementID {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) UpsertFieldInstanceDraft(ctx context.Context, scope Scope, agreementID string, patch FieldInstanceDraftPatch) (FieldInstanceRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return FieldInstanceRecord{}, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return FieldInstanceRecord{}, invalidRecordError("field_instances", "agreement_id", "required")
	}
	instanceID := normalizeID(patch.ID)
	if instanceID == "" {
		instanceID = uuid.NewString()
	}
	key := scopedKey(scope, instanceID)

	s.mu.Lock()
	defer s.mu.Unlock()
	agreement, ok := s.agreements[scopedKey(scope, agreementID)]
	if !ok {
		return FieldInstanceRecord{}, notFoundError("agreements", agreementID)
	}
	if agreement.Status != AgreementStatusDraft {
		return FieldInstanceRecord{}, immutableAgreementError(agreementID, agreement.Status)
	}

	record, exists := s.fieldInstances[key]
	if !exists {
		record = FieldInstanceRecord{
			ID:              instanceID,
			TenantID:        scope.TenantID,
			OrgID:           scope.OrgID,
			AgreementID:     agreementID,
			PageNumber:      1,
			Width:           150,
			Height:          32,
			TabIndex:        0,
			PlacementSource: PlacementSourceManual,
			CreatedAt:       time.Now().UTC(),
		}
	}
	if patch.FieldDefinitionID != nil {
		record.FieldDefinitionID = normalizeID(*patch.FieldDefinitionID)
	}
	if patch.PageNumber != nil {
		record.PageNumber = *patch.PageNumber
	}
	if patch.X != nil {
		record.X = *patch.X
	}
	if patch.Y != nil {
		record.Y = *patch.Y
	}
	if patch.Width != nil {
		record.Width = *patch.Width
	}
	if patch.Height != nil {
		record.Height = *patch.Height
	}
	if patch.TabIndex != nil {
		record.TabIndex = *patch.TabIndex
	}
	if patch.Label != nil {
		record.Label = strings.TrimSpace(*patch.Label)
	}
	if patch.AppearanceJSON != nil {
		record.AppearanceJSON = strings.TrimSpace(*patch.AppearanceJSON)
	}
	if patch.PlacementSource != nil {
		record.PlacementSource = strings.ToLower(strings.TrimSpace(*patch.PlacementSource))
	}
	if patch.ResolverID != nil {
		record.ResolverID = strings.ToLower(strings.TrimSpace(*patch.ResolverID))
	}
	if patch.Confidence != nil {
		record.Confidence = *patch.Confidence
	}
	if patch.PlacementRunID != nil {
		record.PlacementRunID = normalizeID(*patch.PlacementRunID)
	}
	if patch.ManualOverride != nil {
		record.ManualOverride = *patch.ManualOverride
	}
	if record.FieldDefinitionID == "" {
		return FieldInstanceRecord{}, invalidRecordError("field_instances", "field_definition_id", "required")
	}
	definition, ok := s.fieldDefinitions[scopedKey(scope, record.FieldDefinitionID)]
	if !ok || definition.AgreementID != agreementID {
		return FieldInstanceRecord{}, notFoundError("field_definitions", record.FieldDefinitionID)
	}
	if record.PageNumber <= 0 {
		return FieldInstanceRecord{}, invalidRecordError("field_instances", "page_number", "must be positive")
	}
	if record.Width <= 0 || record.Height <= 0 {
		return FieldInstanceRecord{}, invalidRecordError("field_instances", "width|height", "must be positive")
	}
	if record.PlacementSource == "" {
		record.PlacementSource = PlacementSourceManual
	}
	if record.PlacementSource != PlacementSourceAuto && record.PlacementSource != PlacementSourceManual {
		return FieldInstanceRecord{}, invalidRecordError("field_instances", "placement_source", "must be auto or manual")
	}
	if record.Confidence < 0 {
		record.Confidence = 0
	}
	if record.Confidence > 1 {
		record.Confidence = 1
	}
	record.UpdatedAt = time.Now().UTC()
	s.fieldInstances[key] = record
	return record, nil
}

func (s *InMemoryStore) DeleteFieldInstanceDraft(ctx context.Context, scope Scope, agreementID, fieldInstanceID string) error {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return err
	}
	agreementID = normalizeID(agreementID)
	fieldInstanceID = normalizeID(fieldInstanceID)
	if agreementID == "" {
		return invalidRecordError("field_instances", "agreement_id", "required")
	}
	if fieldInstanceID == "" {
		return invalidRecordError("field_instances", "id", "required")
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
	key := scopedKey(scope, fieldInstanceID)
	instance, ok := s.fieldInstances[key]
	if !ok || instance.AgreementID != agreementID {
		return notFoundError("field_instances", fieldInstanceID)
	}
	delete(s.fieldInstances, key)
	for valueKey, value := range s.fieldValues {
		if value.TenantID != scope.TenantID || value.OrgID != scope.OrgID {
			continue
		}
		if value.AgreementID == agreementID && value.FieldID == fieldInstanceID {
			delete(s.fieldValues, valueKey)
		}
	}
	remaining := 0
	for _, check := range s.fieldInstances {
		if check.TenantID != scope.TenantID || check.OrgID != scope.OrgID {
			continue
		}
		if check.AgreementID == agreementID && check.FieldDefinitionID == instance.FieldDefinitionID {
			remaining++
			break
		}
	}
	if remaining == 0 {
		delete(s.fieldDefinitions, scopedKey(scope, instance.FieldDefinitionID))
	}
	return nil
}

func (s *InMemoryStore) ListFieldInstances(ctx context.Context, scope Scope, agreementID string) ([]FieldInstanceRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return nil, invalidRecordError("field_instances", "agreement_id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]FieldInstanceRecord, 0)
	for _, record := range s.fieldInstances {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.AgreementID != agreementID {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].PageNumber == out[j].PageNumber {
			if out[i].TabIndex == out[j].TabIndex {
				return out[i].CreatedAt.Before(out[j].CreatedAt)
			}
			return out[i].TabIndex < out[j].TabIndex
		}
		return out[i].PageNumber < out[j].PageNumber
	})
	return out, nil
}

func (s *InMemoryStore) UpsertFieldDraft(ctx context.Context, scope Scope, agreementID string, patch FieldDraftPatch) (FieldRecord, error) {
	fieldID := normalizeID(patch.ID)
	definitionID := fieldID
	if fieldID != "" {
		if instances, err := s.ListFieldInstances(ctx, scope, agreementID); err == nil {
			for _, instance := range instances {
				if instance.ID == fieldID {
					definitionID = instance.FieldDefinitionID
					break
				}
			}
		}
	}
	definitionPatch := FieldDefinitionDraftPatch{
		ID:            definitionID,
		ParticipantID: patch.RecipientID,
		Type:          patch.Type,
		Required:      patch.Required,
	}
	definition, err := s.UpsertFieldDefinitionDraft(ctx, scope, agreementID, definitionPatch)
	if err != nil {
		return FieldRecord{}, err
	}

	instancePatch := FieldInstanceDraftPatch{
		ID:                fieldID,
		FieldDefinitionID: &definition.ID,
		PageNumber:        patch.PageNumber,
		X:                 patch.PosX,
		Y:                 patch.PosY,
		Width:             patch.Width,
		Height:            patch.Height,
	}
	instance, err := s.UpsertFieldInstanceDraft(ctx, scope, agreementID, instancePatch)
	if err != nil {
		return FieldRecord{}, err
	}
	return FieldRecord{
		ID:                instance.ID,
		FieldDefinitionID: definition.ID,
		TenantID:          scope.TenantID,
		OrgID:             scope.OrgID,
		AgreementID:       agreementID,
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
	}, nil
}

func (s *InMemoryStore) DeleteFieldDraft(ctx context.Context, scope Scope, agreementID, fieldID string) error {
	return s.DeleteFieldInstanceDraft(ctx, scope, agreementID, fieldID)
}

func (s *InMemoryStore) ListFields(ctx context.Context, scope Scope, agreementID string) ([]FieldRecord, error) {
	definitions, err := s.ListFieldDefinitions(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	instances, err := s.ListFieldInstances(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	defByID := make(map[string]FieldDefinitionRecord, len(definitions))
	for _, definition := range definitions {
		defByID[definition.ID] = definition
	}
	out := make([]FieldRecord, 0, len(instances))
	for _, instance := range instances {
		definition, ok := defByID[instance.FieldDefinitionID]
		if !ok {
			continue
		}
		out = append(out, FieldRecord{
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
		})
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
	recipient, ok := s.participants[scopedKey(scope, record.RecipientID)]
	if !ok {
		return SignatureArtifactRecord{}, notFoundError("participants", record.RecipientID)
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

func cloneGoogleImportRunRecord(record GoogleImportRunRecord) GoogleImportRunRecord {
	record.UserID = normalizeID(record.UserID)
	record.GoogleFileID = strings.TrimSpace(record.GoogleFileID)
	record.SourceVersionHint = strings.TrimSpace(record.SourceVersionHint)
	record.DedupeKey = strings.TrimSpace(record.DedupeKey)
	record.DocumentTitle = strings.TrimSpace(record.DocumentTitle)
	record.AgreementTitle = strings.TrimSpace(record.AgreementTitle)
	record.CreatedByUserID = normalizeID(record.CreatedByUserID)
	record.CorrelationID = strings.TrimSpace(record.CorrelationID)
	record.Status = strings.ToLower(strings.TrimSpace(record.Status))
	record.DocumentID = normalizeID(record.DocumentID)
	record.AgreementID = normalizeID(record.AgreementID)
	record.SourceMimeType = strings.TrimSpace(record.SourceMimeType)
	record.IngestionMode = strings.TrimSpace(record.IngestionMode)
	record.ErrorCode = strings.TrimSpace(record.ErrorCode)
	record.ErrorMessage = strings.TrimSpace(record.ErrorMessage)
	record.ErrorDetailsJSON = strings.TrimSpace(record.ErrorDetailsJSON)
	record.StartedAt = cloneTimePtr(record.StartedAt)
	record.CompletedAt = cloneTimePtr(record.CompletedAt)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	return record
}

func cloneOutboxMessageRecord(record OutboxMessageRecord) OutboxMessageRecord {
	record.Topic = strings.TrimSpace(record.Topic)
	record.MessageKey = strings.TrimSpace(record.MessageKey)
	record.PayloadJSON = strings.TrimSpace(record.PayloadJSON)
	record.HeadersJSON = strings.TrimSpace(record.HeadersJSON)
	record.CorrelationID = strings.TrimSpace(record.CorrelationID)
	record.Status = strings.TrimSpace(record.Status)
	record.LastError = strings.TrimSpace(record.LastError)
	record.LockedAt = cloneTimePtr(record.LockedAt)
	record.LockedBy = strings.TrimSpace(record.LockedBy)
	record.PublishedAt = cloneTimePtr(record.PublishedAt)
	if !record.CreatedAt.IsZero() {
		record.CreatedAt = record.CreatedAt.UTC()
	}
	if !record.UpdatedAt.IsZero() {
		record.UpdatedAt = record.UpdatedAt.UTC()
	}
	if !record.AvailableAt.IsZero() {
		record.AvailableAt = record.AvailableAt.UTC()
	}
	return record
}

func cloneDraftRecord(record DraftRecord) DraftRecord {
	record.WizardID = strings.TrimSpace(record.WizardID)
	record.CreatedByUserID = normalizeID(record.CreatedByUserID)
	record.DocumentID = normalizeID(record.DocumentID)
	record.Title = strings.TrimSpace(record.Title)
	record.WizardStateJSON = strings.TrimSpace(record.WizardStateJSON)
	if record.WizardStateJSON == "" {
		record.WizardStateJSON = "{}"
	}
	if record.CurrentStep <= 0 {
		record.CurrentStep = 1
	}
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	if record.ExpiresAt.IsZero() {
		record.ExpiresAt = record.UpdatedAt.Add(defaultDraftTTL).UTC()
	} else {
		record.ExpiresAt = record.ExpiresAt.UTC()
	}
	if record.Revision <= 0 {
		record.Revision = 1
	}
	return record
}

func cloneIntegrationCredentialRecord(record IntegrationCredentialRecord) IntegrationCredentialRecord {
	record.Scopes = append([]string{}, record.Scopes...)
	record.ExpiresAt = cloneTimePtr(record.ExpiresAt)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	return record
}

func cloneExternalSchema(schema ExternalSchema) ExternalSchema {
	out := schema
	if len(schema.Fields) > 0 {
		out.Fields = append([]ExternalFieldRef{}, schema.Fields...)
	} else {
		out.Fields = []ExternalFieldRef{}
	}
	return out
}

func cloneMappingRules(rules []MappingRule) []MappingRule {
	if len(rules) == 0 {
		return []MappingRule{}
	}
	return append([]MappingRule{}, rules...)
}

func cloneMappingSpecRecord(record MappingSpecRecord) MappingSpecRecord {
	record.ExternalSchema = cloneExternalSchema(record.ExternalSchema)
	record.Rules = cloneMappingRules(record.Rules)
	record.PublishedAt = cloneTimePtr(record.PublishedAt)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	return record
}

func cloneIntegrationBindingRecord(record IntegrationBindingRecord) IntegrationBindingRecord {
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	return record
}

func cloneIntegrationSyncRunRecord(record IntegrationSyncRunRecord) IntegrationSyncRunRecord {
	record.CompletedAt = cloneTimePtr(record.CompletedAt)
	record.StartedAt = normalizeRecordTime(record.StartedAt)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	return record
}

func cloneIntegrationCheckpointRecord(record IntegrationCheckpointRecord) IntegrationCheckpointRecord {
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	return record
}

func cloneIntegrationConflictRecord(record IntegrationConflictRecord) IntegrationConflictRecord {
	record.ResolvedAt = cloneTimePtr(record.ResolvedAt)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	return record
}

func cloneIntegrationChangeEventRecord(record IntegrationChangeEventRecord) IntegrationChangeEventRecord {
	record.EmittedAt = normalizeRecordTime(record.EmittedAt)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	return record
}

func clonePlacementSuggestionRecords(in []PlacementSuggestionRecord) []PlacementSuggestionRecord {
	if len(in) == 0 {
		return []PlacementSuggestionRecord{}
	}
	out := make([]PlacementSuggestionRecord, 0, len(in))
	for _, suggestion := range in {
		suggestion.ID = normalizeID(suggestion.ID)
		suggestion.FieldDefinitionID = normalizeID(suggestion.FieldDefinitionID)
		suggestion.ResolverID = strings.ToLower(strings.TrimSpace(suggestion.ResolverID))
		suggestion.Label = strings.TrimSpace(suggestion.Label)
		suggestion.MetadataJSON = strings.TrimSpace(suggestion.MetadataJSON)
		if suggestion.Confidence < 0 {
			suggestion.Confidence = 0
		}
		if suggestion.Confidence > 1 {
			suggestion.Confidence = 1
		}
		out = append(out, suggestion)
	}
	return out
}

func clonePlacementResolverScores(in []PlacementResolverScore) []PlacementResolverScore {
	if len(in) == 0 {
		return []PlacementResolverScore{}
	}
	out := make([]PlacementResolverScore, 0, len(in))
	for _, score := range in {
		score.ResolverID = strings.ToLower(strings.TrimSpace(score.ResolverID))
		score.Reason = strings.TrimSpace(score.Reason)
		out = append(out, score)
	}
	return out
}

func clonePlacementRunRecord(record PlacementRunRecord) PlacementRunRecord {
	record.ID = normalizeID(record.ID)
	record.AgreementID = normalizeID(record.AgreementID)
	record.Status = strings.ToLower(strings.TrimSpace(record.Status))
	record.ReasonCode = strings.TrimSpace(record.ReasonCode)
	record.ResolverOrder = append([]string{}, record.ResolverOrder...)
	record.ExecutedResolvers = append([]string{}, record.ExecutedResolvers...)
	record.ResolverScores = clonePlacementResolverScores(record.ResolverScores)
	record.Suggestions = clonePlacementSuggestionRecords(record.Suggestions)
	record.SelectedSuggestionIDs = append([]string{}, record.SelectedSuggestionIDs...)
	record.UnresolvedDefinitionIDs = append([]string{}, record.UnresolvedDefinitionIDs...)
	record.SelectedSource = strings.TrimSpace(record.SelectedSource)
	record.PolicyJSON = strings.TrimSpace(record.PolicyJSON)
	record.CreatedByUserID = normalizeID(record.CreatedByUserID)
	record.CompletedAt = cloneTimePtr(record.CompletedAt)
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

func googleImportRunDedupeIndexKey(scope Scope, userID, dedupeKey string) string {
	return strings.Join([]string{
		scope.key(),
		normalizeID(userID),
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

func draftWizardIndexKey(scope Scope, userID, wizardID string) string {
	return strings.Join([]string{
		scope.key(),
		normalizeID(userID),
		strings.TrimSpace(wizardID),
	}, "|")
}

func integrationBindingIndexKey(scope Scope, provider, entityKind, externalID string) string {
	return strings.Join([]string{
		scope.key(),
		strings.ToLower(strings.TrimSpace(provider)),
		strings.ToLower(strings.TrimSpace(entityKind)),
		normalizeID(externalID),
	}, "|")
}

func integrationCheckpointIndexKey(scope Scope, runID, checkpointKey string) string {
	return strings.Join([]string{
		scope.key(),
		normalizeID(runID),
		strings.TrimSpace(checkpointKey),
	}, "|")
}

func parseDraftCursorOffset(raw string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 0 {
		return 0
	}
	return value
}

func parseGoogleImportRunCursorOffset(raw string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 0 {
		return 0
	}
	return value
}

func integrationMutationClaimKey(scope Scope, idempotencyKey string) string {
	return scope.key() + "|" + strings.TrimSpace(idempotencyKey)
}

func normalizePositiveVersion(input int64) int64 {
	if input > 0 {
		return input
	}
	return 1
}

func normalizeProviderAndEntity(provider, entityKind string) (string, string) {
	return strings.ToLower(strings.TrimSpace(provider)), strings.ToLower(strings.TrimSpace(entityKind))
}

func normalizeSyncRunStatus(status string) string {
	status = strings.ToLower(strings.TrimSpace(status))
	switch status {
	case IntegrationSyncRunStatusPending, IntegrationSyncRunStatusRunning, IntegrationSyncRunStatusCompleted, IntegrationSyncRunStatusFailed:
		return status
	default:
		return IntegrationSyncRunStatusPending
	}
}

func normalizeConflictStatus(status string) string {
	status = strings.ToLower(strings.TrimSpace(status))
	switch status {
	case IntegrationConflictStatusPending, IntegrationConflictStatusResolved, IntegrationConflictStatusIgnored:
		return status
	default:
		return IntegrationConflictStatusPending
	}
}

func normalizeMappingStatus(status string) string {
	status = strings.ToLower(strings.TrimSpace(status))
	switch status {
	case MappingSpecStatusDraft, MappingSpecStatusPublished:
		return status
	default:
		return MappingSpecStatusDraft
	}
}

func sanitizePlacementResolverIDs(in []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(in))
	for _, resolverID := range in {
		resolverID = strings.ToLower(strings.TrimSpace(resolverID))
		if resolverID == "" || seen[resolverID] {
			continue
		}
		seen[resolverID] = true
		out = append(out, resolverID)
	}
	return out
}

func mappingSpecSortKey(record MappingSpecRecord) string {
	return strings.Join([]string{
		strings.ToLower(strings.TrimSpace(record.Provider)),
		strings.ToLower(strings.TrimSpace(record.Name)),
		strconv.FormatInt(record.Version, 10),
		strings.TrimSpace(record.ID),
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

func (s *InMemoryStore) BeginGoogleImportRun(ctx context.Context, scope Scope, input GoogleImportRunInput) (GoogleImportRunRecord, bool, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return GoogleImportRunRecord{}, false, err
	}
	input.UserID = normalizeID(input.UserID)
	input.GoogleFileID = strings.TrimSpace(input.GoogleFileID)
	input.SourceVersionHint = strings.TrimSpace(input.SourceVersionHint)
	input.DedupeKey = strings.TrimSpace(input.DedupeKey)
	input.DocumentTitle = strings.TrimSpace(input.DocumentTitle)
	input.AgreementTitle = strings.TrimSpace(input.AgreementTitle)
	input.CreatedByUserID = normalizeID(input.CreatedByUserID)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if input.UserID == "" {
		return GoogleImportRunRecord{}, false, invalidRecordError("google_import_runs", "user_id", "required")
	}
	if input.GoogleFileID == "" {
		return GoogleImportRunRecord{}, false, invalidRecordError("google_import_runs", "google_file_id", "required")
	}
	if input.DedupeKey == "" {
		input.DedupeKey = strings.Join([]string{input.UserID, input.GoogleFileID, input.SourceVersionHint}, "|")
	}
	requestedAt := input.RequestedAt
	if requestedAt.IsZero() {
		requestedAt = time.Now().UTC()
	}
	requestedAt = requestedAt.UTC()
	indexKey := googleImportRunDedupeIndexKey(scope, input.UserID, input.DedupeKey)

	s.mu.Lock()
	defer s.mu.Unlock()
	if existingID, exists := s.googleImportRunDedupeIndex[indexKey]; exists {
		record, ok := s.googleImportRuns[scopedKey(scope, existingID)]
		if !ok {
			delete(s.googleImportRunDedupeIndex, indexKey)
		} else {
			return cloneGoogleImportRunRecord(record), false, nil
		}
	}

	record := GoogleImportRunRecord{
		ID:                uuid.NewString(),
		TenantID:          scope.TenantID,
		OrgID:             scope.OrgID,
		UserID:            input.UserID,
		GoogleFileID:      input.GoogleFileID,
		SourceVersionHint: input.SourceVersionHint,
		DedupeKey:         input.DedupeKey,
		DocumentTitle:     input.DocumentTitle,
		AgreementTitle:    input.AgreementTitle,
		CreatedByUserID:   input.CreatedByUserID,
		CorrelationID:     input.CorrelationID,
		Status:            GoogleImportRunStatusQueued,
		CreatedAt:         requestedAt,
		UpdatedAt:         requestedAt,
	}
	record = cloneGoogleImportRunRecord(record)
	s.googleImportRuns[scopedKey(scope, record.ID)] = record
	s.googleImportRunDedupeIndex[indexKey] = record.ID
	return cloneGoogleImportRunRecord(record), true, nil
}

func (s *InMemoryStore) MarkGoogleImportRunRunning(ctx context.Context, scope Scope, id string, startedAt time.Time) (GoogleImportRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return GoogleImportRunRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return GoogleImportRunRecord{}, invalidRecordError("google_import_runs", "id", "required")
	}
	if startedAt.IsZero() {
		startedAt = time.Now().UTC()
	}
	startedAt = startedAt.UTC()

	key := scopedKey(scope, id)
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.googleImportRuns[key]
	if !ok {
		return GoogleImportRunRecord{}, notFoundError("google_import_runs", id)
	}
	if record.Status == GoogleImportRunStatusSucceeded || record.Status == GoogleImportRunStatusFailed {
		return cloneGoogleImportRunRecord(record), nil
	}
	record.Status = GoogleImportRunStatusRunning
	record.StartedAt = cloneTimePtr(&startedAt)
	record.UpdatedAt = startedAt
	record = cloneGoogleImportRunRecord(record)
	s.googleImportRuns[key] = record
	return cloneGoogleImportRunRecord(record), nil
}

func (s *InMemoryStore) MarkGoogleImportRunSucceeded(ctx context.Context, scope Scope, id string, input GoogleImportRunSuccessInput) (GoogleImportRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return GoogleImportRunRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return GoogleImportRunRecord{}, invalidRecordError("google_import_runs", "id", "required")
	}
	completedAt := input.CompletedAt
	if completedAt.IsZero() {
		completedAt = time.Now().UTC()
	}
	completedAt = completedAt.UTC()
	key := scopedKey(scope, id)

	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.googleImportRuns[key]
	if !ok {
		return GoogleImportRunRecord{}, notFoundError("google_import_runs", id)
	}
	record.Status = GoogleImportRunStatusSucceeded
	record.DocumentID = normalizeID(input.DocumentID)
	record.AgreementID = normalizeID(input.AgreementID)
	record.SourceMimeType = strings.TrimSpace(input.SourceMimeType)
	record.IngestionMode = strings.TrimSpace(input.IngestionMode)
	record.ErrorCode = ""
	record.ErrorMessage = ""
	record.ErrorDetailsJSON = ""
	record.CompletedAt = cloneTimePtr(&completedAt)
	if record.StartedAt == nil {
		record.StartedAt = cloneTimePtr(&completedAt)
	}
	record.UpdatedAt = completedAt
	record = cloneGoogleImportRunRecord(record)
	s.googleImportRuns[key] = record
	return cloneGoogleImportRunRecord(record), nil
}

func (s *InMemoryStore) MarkGoogleImportRunFailed(ctx context.Context, scope Scope, id string, input GoogleImportRunFailureInput) (GoogleImportRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return GoogleImportRunRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return GoogleImportRunRecord{}, invalidRecordError("google_import_runs", "id", "required")
	}
	completedAt := input.CompletedAt
	if completedAt.IsZero() {
		completedAt = time.Now().UTC()
	}
	completedAt = completedAt.UTC()
	key := scopedKey(scope, id)

	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.googleImportRuns[key]
	if !ok {
		return GoogleImportRunRecord{}, notFoundError("google_import_runs", id)
	}
	record.Status = GoogleImportRunStatusFailed
	record.ErrorCode = strings.TrimSpace(input.ErrorCode)
	record.ErrorMessage = strings.TrimSpace(input.ErrorMessage)
	record.ErrorDetailsJSON = strings.TrimSpace(input.ErrorDetailsJSON)
	record.CompletedAt = cloneTimePtr(&completedAt)
	if record.StartedAt == nil {
		record.StartedAt = cloneTimePtr(&completedAt)
	}
	record.UpdatedAt = completedAt
	record = cloneGoogleImportRunRecord(record)
	s.googleImportRuns[key] = record
	return cloneGoogleImportRunRecord(record), nil
}

func (s *InMemoryStore) GetGoogleImportRun(ctx context.Context, scope Scope, id string) (GoogleImportRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return GoogleImportRunRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return GoogleImportRunRecord{}, invalidRecordError("google_import_runs", "id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.googleImportRuns[scopedKey(scope, id)]
	if !ok {
		return GoogleImportRunRecord{}, notFoundError("google_import_runs", id)
	}
	return cloneGoogleImportRunRecord(record), nil
}

func (s *InMemoryStore) ListGoogleImportRuns(ctx context.Context, scope Scope, query GoogleImportRunQuery) ([]GoogleImportRunRecord, string, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, "", err
	}
	userID := normalizeID(query.UserID)
	if userID == "" {
		return nil, "", invalidRecordError("google_import_runs", "user_id", "required")
	}
	limit := query.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	offset := parseGoogleImportRunCursorOffset(query.Cursor)
	if offset < 0 {
		offset = 0
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]GoogleImportRunRecord, 0)
	for _, record := range s.googleImportRuns {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.UserID != userID {
			continue
		}
		out = append(out, cloneGoogleImportRunRecord(record))
	}
	sort.Slice(out, func(i, j int) bool {
		if query.SortDesc {
			if out[i].UpdatedAt.Equal(out[j].UpdatedAt) {
				return out[i].ID > out[j].ID
			}
			return out[i].UpdatedAt.After(out[j].UpdatedAt)
		}
		if out[i].UpdatedAt.Equal(out[j].UpdatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].UpdatedAt.Before(out[j].UpdatedAt)
	})
	if offset > len(out) {
		offset = len(out)
	}
	end := offset + limit
	if end > len(out) {
		end = len(out)
	}
	page := out[offset:end]
	nextCursor := ""
	if end < len(out) {
		nextCursor = strconv.Itoa(end)
	}
	return page, nextCursor, nil
}

func (s *InMemoryStore) EnqueueOutboxMessage(ctx context.Context, scope Scope, record OutboxMessageRecord) (OutboxMessageRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return OutboxMessageRecord{}, err
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.Topic = strings.ToLower(strings.TrimSpace(record.Topic))
	record.MessageKey = strings.TrimSpace(record.MessageKey)
	record.PayloadJSON = strings.TrimSpace(record.PayloadJSON)
	record.HeadersJSON = strings.TrimSpace(record.HeadersJSON)
	record.CorrelationID = strings.TrimSpace(record.CorrelationID)
	record.Status = strings.ToLower(strings.TrimSpace(record.Status))
	if record.Topic == "" {
		return OutboxMessageRecord{}, invalidRecordError("outbox_messages", "topic", "required")
	}
	if record.PayloadJSON == "" {
		return OutboxMessageRecord{}, invalidRecordError("outbox_messages", "payload_json", "required")
	}
	now := time.Now().UTC()
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.AttemptCount = max(record.AttemptCount, 0)
	if record.MaxAttempts <= 0 {
		record.MaxAttempts = 5
	}
	if record.Status == "" {
		record.Status = OutboxMessageStatusPending
	}
	if record.Status != OutboxMessageStatusPending &&
		record.Status != OutboxMessageStatusRetrying &&
		record.Status != OutboxMessageStatusProcessing &&
		record.Status != OutboxMessageStatusSucceeded &&
		record.Status != OutboxMessageStatusFailed {
		return OutboxMessageRecord{}, invalidRecordError("outbox_messages", "status", "invalid status")
	}
	if record.CreatedAt.IsZero() {
		record.CreatedAt = now
	} else {
		record.CreatedAt = record.CreatedAt.UTC()
	}
	if record.UpdatedAt.IsZero() {
		record.UpdatedAt = record.CreatedAt
	} else {
		record.UpdatedAt = record.UpdatedAt.UTC()
	}
	if record.AvailableAt.IsZero() {
		record.AvailableAt = record.CreatedAt
	} else {
		record.AvailableAt = record.AvailableAt.UTC()
	}
	record.LockedAt = cloneTimePtr(record.LockedAt)
	record.PublishedAt = cloneTimePtr(record.PublishedAt)
	record = cloneOutboxMessageRecord(record)
	key := scopedKey(scope, record.ID)

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.outboxMessages[key]; exists {
		return OutboxMessageRecord{}, invalidRecordError("outbox_messages", "id", "already exists")
	}
	s.outboxMessages[key] = record
	return record, nil
}

func (s *InMemoryStore) ClaimOutboxMessages(ctx context.Context, scope Scope, input OutboxClaimInput) ([]OutboxMessageRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	input.Consumer = normalizeID(input.Consumer)
	input.Topic = strings.ToLower(strings.TrimSpace(input.Topic))
	if input.Consumer == "" {
		return nil, invalidRecordError("outbox_messages", "consumer", "required")
	}
	if input.Now.IsZero() {
		input.Now = time.Now().UTC()
	}
	input.Now = input.Now.UTC()
	if input.Limit <= 0 {
		input.Limit = 25
	}
	lockUntil := cloneTimePtr(input.LockUntil)
	if lockUntil == nil || lockUntil.IsZero() {
		defaultLock := input.Now.Add(5 * time.Minute).UTC()
		lockUntil = &defaultLock
	} else {
		lock := lockUntil.UTC()
		lockUntil = &lock
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	candidates := make([]OutboxMessageRecord, 0)
	for _, record := range s.outboxMessages {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if input.Topic != "" && strings.ToLower(strings.TrimSpace(record.Topic)) != input.Topic {
			continue
		}
		if record.MaxAttempts > 0 && record.AttemptCount >= record.MaxAttempts {
			continue
		}
		if record.AvailableAt.After(input.Now) {
			continue
		}
		status := strings.ToLower(strings.TrimSpace(record.Status))
		if status != OutboxMessageStatusPending && status != OutboxMessageStatusRetrying && status != OutboxMessageStatusProcessing {
			continue
		}
		if record.LockedAt != nil && record.LockedAt.After(input.Now) {
			continue
		}
		candidates = append(candidates, record)
	}
	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].AvailableAt.Equal(candidates[j].AvailableAt) {
			if candidates[i].CreatedAt.Equal(candidates[j].CreatedAt) {
				return candidates[i].ID < candidates[j].ID
			}
			return candidates[i].CreatedAt.Before(candidates[j].CreatedAt)
		}
		return candidates[i].AvailableAt.Before(candidates[j].AvailableAt)
	})
	if len(candidates) > input.Limit {
		candidates = candidates[:input.Limit]
	}
	out := make([]OutboxMessageRecord, 0, len(candidates))
	for _, record := range candidates {
		record.Status = OutboxMessageStatusProcessing
		record.AttemptCount++
		record.LockedBy = input.Consumer
		record.LockedAt = cloneTimePtr(lockUntil)
		record.UpdatedAt = input.Now
		record = cloneOutboxMessageRecord(record)
		s.outboxMessages[scopedKey(scope, record.ID)] = record
		out = append(out, record)
	}
	return out, nil
}

func (s *InMemoryStore) MarkOutboxMessageSucceeded(ctx context.Context, scope Scope, id string, publishedAt time.Time) (OutboxMessageRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return OutboxMessageRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return OutboxMessageRecord{}, invalidRecordError("outbox_messages", "id", "required")
	}
	if publishedAt.IsZero() {
		publishedAt = time.Now().UTC()
	}
	publishedAt = publishedAt.UTC()

	s.mu.Lock()
	defer s.mu.Unlock()
	key := scopedKey(scope, id)
	record, ok := s.outboxMessages[key]
	if !ok {
		return OutboxMessageRecord{}, notFoundError("outbox_messages", id)
	}
	record.Status = OutboxMessageStatusSucceeded
	record.LastError = ""
	record.LockedBy = ""
	record.LockedAt = nil
	record.AvailableAt = publishedAt
	record.PublishedAt = cloneTimePtr(&publishedAt)
	record.UpdatedAt = publishedAt
	record = cloneOutboxMessageRecord(record)
	s.outboxMessages[key] = record
	return record, nil
}

func (s *InMemoryStore) MarkOutboxMessageFailed(ctx context.Context, scope Scope, id, failureReason string, nextAttemptAt *time.Time, failedAt time.Time) (OutboxMessageRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return OutboxMessageRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return OutboxMessageRecord{}, invalidRecordError("outbox_messages", "id", "required")
	}
	failureReason = strings.TrimSpace(failureReason)
	if failureReason == "" {
		failureReason = "dispatch failed"
	}
	if failedAt.IsZero() {
		failedAt = time.Now().UTC()
	}
	failedAt = failedAt.UTC()

	s.mu.Lock()
	defer s.mu.Unlock()
	key := scopedKey(scope, id)
	record, ok := s.outboxMessages[key]
	if !ok {
		return OutboxMessageRecord{}, notFoundError("outbox_messages", id)
	}
	record.LastError = failureReason
	record.LockedAt = nil
	record.LockedBy = ""
	record.UpdatedAt = failedAt
	if nextAttemptAt != nil && record.AttemptCount < record.MaxAttempts {
		next := nextAttemptAt.UTC()
		record.Status = OutboxMessageStatusRetrying
		record.AvailableAt = next
	} else {
		record.Status = OutboxMessageStatusFailed
		record.AvailableAt = failedAt
	}
	record = cloneOutboxMessageRecord(record)
	s.outboxMessages[key] = record
	return record, nil
}

func (s *InMemoryStore) ListOutboxMessages(ctx context.Context, scope Scope, query OutboxQuery) ([]OutboxMessageRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	query.Topic = strings.ToLower(strings.TrimSpace(query.Topic))
	query.Status = strings.ToLower(strings.TrimSpace(query.Status))

	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]OutboxMessageRecord, 0)
	for _, record := range s.outboxMessages {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if query.Topic != "" && strings.ToLower(strings.TrimSpace(record.Topic)) != query.Topic {
			continue
		}
		if query.Status != "" && strings.ToLower(strings.TrimSpace(record.Status)) != query.Status {
			continue
		}
		out = append(out, cloneOutboxMessageRecord(record))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		if query.SortDesc {
			return out[i].CreatedAt.After(out[j].CreatedAt)
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	start := max(query.Offset, 0)
	if start > len(out) {
		start = len(out)
	}
	end := len(out)
	if query.Limit > 0 && start+query.Limit < end {
		end = start + query.Limit
	}
	return out[start:end], nil
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

func (s *InMemoryStore) UpsertMappingSpec(ctx context.Context, scope Scope, record MappingSpecRecord) (MappingSpecRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return MappingSpecRecord{}, err
	}
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.Name = strings.TrimSpace(record.Name)
	record.Status = normalizeMappingStatus(record.Status)
	record.CreatedByUserID = normalizeID(record.CreatedByUserID)
	record.UpdatedByUserID = normalizeID(record.UpdatedByUserID)
	record.ExternalSchema = cloneExternalSchema(record.ExternalSchema)
	record.ExternalSchema.ObjectType = strings.TrimSpace(record.ExternalSchema.ObjectType)
	record.ExternalSchema.Version = strings.TrimSpace(record.ExternalSchema.Version)
	for i := range record.ExternalSchema.Fields {
		record.ExternalSchema.Fields[i].Object = strings.TrimSpace(record.ExternalSchema.Fields[i].Object)
		record.ExternalSchema.Fields[i].Field = strings.TrimSpace(record.ExternalSchema.Fields[i].Field)
		record.ExternalSchema.Fields[i].Type = strings.TrimSpace(record.ExternalSchema.Fields[i].Type)
		record.ExternalSchema.Fields[i].ConstraintsJSON = strings.TrimSpace(record.ExternalSchema.Fields[i].ConstraintsJSON)
	}
	record.Rules = cloneMappingRules(record.Rules)
	for i := range record.Rules {
		record.Rules[i].SourceObject = strings.TrimSpace(record.Rules[i].SourceObject)
		record.Rules[i].SourceField = strings.TrimSpace(record.Rules[i].SourceField)
		record.Rules[i].TargetEntity = strings.TrimSpace(record.Rules[i].TargetEntity)
		record.Rules[i].TargetPath = strings.TrimSpace(record.Rules[i].TargetPath)
		record.Rules[i].DefaultValue = strings.TrimSpace(record.Rules[i].DefaultValue)
		record.Rules[i].Transform = strings.TrimSpace(record.Rules[i].Transform)
	}
	record.CompiledJSON = strings.TrimSpace(record.CompiledJSON)
	record.CompiledHash = strings.TrimSpace(record.CompiledHash)
	if record.Provider == "" {
		return MappingSpecRecord{}, invalidRecordError("integration_mapping_specs", "provider", "required")
	}
	if record.Name == "" {
		return MappingSpecRecord{}, invalidRecordError("integration_mapping_specs", "name", "required")
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	now := time.Now().UTC()

	key := scopedKey(scope, record.ID)
	s.mu.Lock()
	defer s.mu.Unlock()
	existing, hasExisting := s.mappingSpecs[key]
	if hasExisting {
		if record.Version > 0 && record.Version != existing.Version {
			return MappingSpecRecord{}, versionConflictError("integration_mapping_specs", record.ID, record.Version, existing.Version)
		}
		record.Version = existing.Version + 1
		record.CreatedAt = existing.CreatedAt
		record.PublishedAt = cloneTimePtr(existing.PublishedAt)
		if existing.Status == MappingSpecStatusPublished && record.Status == MappingSpecStatusDraft {
			record.Status = existing.Status
		}
	} else {
		record.Version = normalizePositiveVersion(record.Version)
		record.CreatedAt = now
	}
	if record.Status == MappingSpecStatusPublished {
		if record.PublishedAt == nil {
			record.PublishedAt = &now
		} else {
			record.PublishedAt = cloneTimePtr(record.PublishedAt)
		}
	} else {
		record.PublishedAt = nil
	}
	record.UpdatedAt = now
	record = cloneMappingSpecRecord(record)
	s.mappingSpecs[key] = record
	return record, nil
}

func (s *InMemoryStore) GetMappingSpec(ctx context.Context, scope Scope, id string) (MappingSpecRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return MappingSpecRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return MappingSpecRecord{}, invalidRecordError("integration_mapping_specs", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.mappingSpecs[scopedKey(scope, id)]
	if !ok {
		return MappingSpecRecord{}, notFoundError("integration_mapping_specs", id)
	}
	return cloneMappingSpecRecord(record), nil
}

func (s *InMemoryStore) ListMappingSpecs(ctx context.Context, scope Scope, provider string) ([]MappingSpecRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	provider = strings.ToLower(strings.TrimSpace(provider))
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]MappingSpecRecord, 0)
	for _, record := range s.mappingSpecs {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if provider != "" && strings.ToLower(strings.TrimSpace(record.Provider)) != provider {
			continue
		}
		out = append(out, cloneMappingSpecRecord(record))
	}
	sort.Slice(out, func(i, j int) bool {
		return mappingSpecSortKey(out[i]) < mappingSpecSortKey(out[j])
	})
	return out, nil
}

func (s *InMemoryStore) PublishMappingSpec(ctx context.Context, scope Scope, id string, expectedVersion int64, publishedAt time.Time) (MappingSpecRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return MappingSpecRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return MappingSpecRecord{}, invalidRecordError("integration_mapping_specs", "id", "required")
	}
	if publishedAt.IsZero() {
		publishedAt = time.Now().UTC()
	}
	publishedAt = publishedAt.UTC()
	key := scopedKey(scope, id)
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.mappingSpecs[key]
	if !ok {
		return MappingSpecRecord{}, notFoundError("integration_mapping_specs", id)
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return MappingSpecRecord{}, versionConflictError("integration_mapping_specs", id, expectedVersion, record.Version)
	}
	record.Status = MappingSpecStatusPublished
	record.PublishedAt = &publishedAt
	record.Version++
	record.UpdatedAt = publishedAt
	record = cloneMappingSpecRecord(record)
	s.mappingSpecs[key] = record
	return record, nil
}

func (s *InMemoryStore) UpsertIntegrationBinding(ctx context.Context, scope Scope, record IntegrationBindingRecord) (IntegrationBindingRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return IntegrationBindingRecord{}, err
	}
	record.Provider, record.EntityKind = normalizeProviderAndEntity(record.Provider, record.EntityKind)
	record.ExternalID = normalizeID(record.ExternalID)
	record.InternalID = normalizeID(record.InternalID)
	record.ProvenanceJSON = strings.TrimSpace(record.ProvenanceJSON)
	if record.Provider == "" {
		return IntegrationBindingRecord{}, invalidRecordError("integration_bindings", "provider", "required")
	}
	if record.EntityKind == "" {
		return IntegrationBindingRecord{}, invalidRecordError("integration_bindings", "entity_kind", "required")
	}
	if record.ExternalID == "" {
		return IntegrationBindingRecord{}, invalidRecordError("integration_bindings", "external_id", "required")
	}
	if record.InternalID == "" {
		return IntegrationBindingRecord{}, invalidRecordError("integration_bindings", "internal_id", "required")
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	now := time.Now().UTC()
	indexKey := integrationBindingIndexKey(scope, record.Provider, record.EntityKind, record.ExternalID)

	s.mu.Lock()
	defer s.mu.Unlock()
	if existingID, ok := s.integrationBindingIndex[indexKey]; ok {
		existing, ok := s.integrationBindings[scopedKey(scope, existingID)]
		if !ok {
			return IntegrationBindingRecord{}, notFoundError("integration_bindings", existingID)
		}
		if record.Version > 0 && record.Version != existing.Version {
			return IntegrationBindingRecord{}, versionConflictError("integration_bindings", existing.ID, record.Version, existing.Version)
		}
		record.ID = existing.ID
		record.Version = existing.Version + 1
		record.CreatedAt = existing.CreatedAt
		record.UpdatedAt = now
		record = cloneIntegrationBindingRecord(record)
		s.integrationBindings[scopedKey(scope, record.ID)] = record
		s.integrationBindingIndex[indexKey] = record.ID
		return record, nil
	}

	record.Version = normalizePositiveVersion(record.Version)
	record.CreatedAt = now
	record.UpdatedAt = now
	record = cloneIntegrationBindingRecord(record)
	s.integrationBindings[scopedKey(scope, record.ID)] = record
	s.integrationBindingIndex[indexKey] = record.ID
	return record, nil
}

func (s *InMemoryStore) GetIntegrationBindingByExternal(ctx context.Context, scope Scope, provider, entityKind, externalID string) (IntegrationBindingRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return IntegrationBindingRecord{}, err
	}
	provider, entityKind = normalizeProviderAndEntity(provider, entityKind)
	externalID = normalizeID(externalID)
	if provider == "" || entityKind == "" || externalID == "" {
		return IntegrationBindingRecord{}, invalidRecordError("integration_bindings", "provider|entity_kind|external_id", "required")
	}
	indexKey := integrationBindingIndexKey(scope, provider, entityKind, externalID)
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.integrationBindingIndex[indexKey]
	if !ok {
		return IntegrationBindingRecord{}, notFoundError("integration_bindings", externalID)
	}
	record, ok := s.integrationBindings[scopedKey(scope, id)]
	if !ok {
		return IntegrationBindingRecord{}, notFoundError("integration_bindings", id)
	}
	return cloneIntegrationBindingRecord(record), nil
}

func (s *InMemoryStore) ListIntegrationBindings(ctx context.Context, scope Scope, provider, entityKind, internalID string) ([]IntegrationBindingRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	provider, entityKind = normalizeProviderAndEntity(provider, entityKind)
	internalID = normalizeID(internalID)
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]IntegrationBindingRecord, 0)
	for _, record := range s.integrationBindings {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if provider != "" && record.Provider != provider {
			continue
		}
		if entityKind != "" && record.EntityKind != entityKind {
			continue
		}
		if internalID != "" && record.InternalID != internalID {
			continue
		}
		out = append(out, cloneIntegrationBindingRecord(record))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].UpdatedAt.Equal(out[j].UpdatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].UpdatedAt.Before(out[j].UpdatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) CreateIntegrationSyncRun(ctx context.Context, scope Scope, record IntegrationSyncRunRecord) (IntegrationSyncRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return IntegrationSyncRunRecord{}, err
	}
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.Direction = strings.ToLower(strings.TrimSpace(record.Direction))
	record.MappingSpecID = normalizeID(record.MappingSpecID)
	record.Status = normalizeSyncRunStatus(record.Status)
	record.Cursor = strings.TrimSpace(record.Cursor)
	record.LastError = strings.TrimSpace(record.LastError)
	record.CreatedByUserID = normalizeID(record.CreatedByUserID)
	if record.Provider == "" {
		return IntegrationSyncRunRecord{}, invalidRecordError("integration_sync_runs", "provider", "required")
	}
	if record.Direction == "" {
		return IntegrationSyncRunRecord{}, invalidRecordError("integration_sync_runs", "direction", "required")
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	if record.StartedAt.IsZero() {
		record.StartedAt = time.Now().UTC()
	}
	record.StartedAt = record.StartedAt.UTC()
	if record.AttemptCount <= 0 {
		record.AttemptCount = 1
	}
	record.Version = normalizePositiveVersion(record.Version)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	if record.CreatedAt.IsZero() {
		record.CreatedAt = record.StartedAt
	}
	if record.UpdatedAt.IsZero() {
		record.UpdatedAt = record.StartedAt
	}

	key := scopedKey(scope, record.ID)
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.integrationSyncRuns[key]; exists {
		return IntegrationSyncRunRecord{}, invalidRecordError("integration_sync_runs", "id", "already exists")
	}
	record = cloneIntegrationSyncRunRecord(record)
	s.integrationSyncRuns[key] = record
	return record, nil
}

func (s *InMemoryStore) UpdateIntegrationSyncRunStatus(ctx context.Context, scope Scope, id, status, lastError, cursor string, completedAt *time.Time, expectedVersion int64) (IntegrationSyncRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return IntegrationSyncRunRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return IntegrationSyncRunRecord{}, invalidRecordError("integration_sync_runs", "id", "required")
	}
	status = normalizeSyncRunStatus(status)
	lastError = strings.TrimSpace(lastError)
	cursor = strings.TrimSpace(cursor)

	key := scopedKey(scope, id)
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.integrationSyncRuns[key]
	if !ok {
		return IntegrationSyncRunRecord{}, notFoundError("integration_sync_runs", id)
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return IntegrationSyncRunRecord{}, versionConflictError("integration_sync_runs", id, expectedVersion, record.Version)
	}
	record.Status = status
	record.LastError = lastError
	if cursor != "" {
		record.Cursor = cursor
	}
	if completedAt != nil {
		record.CompletedAt = cloneTimePtr(completedAt)
	} else if status == IntegrationSyncRunStatusCompleted || status == IntegrationSyncRunStatusFailed {
		now := time.Now().UTC()
		record.CompletedAt = &now
	}
	record.Version++
	record.UpdatedAt = time.Now().UTC()
	record = cloneIntegrationSyncRunRecord(record)
	s.integrationSyncRuns[key] = record
	return record, nil
}

func (s *InMemoryStore) GetIntegrationSyncRun(ctx context.Context, scope Scope, id string) (IntegrationSyncRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return IntegrationSyncRunRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return IntegrationSyncRunRecord{}, invalidRecordError("integration_sync_runs", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.integrationSyncRuns[scopedKey(scope, id)]
	if !ok {
		return IntegrationSyncRunRecord{}, notFoundError("integration_sync_runs", id)
	}
	return cloneIntegrationSyncRunRecord(record), nil
}

func (s *InMemoryStore) ListIntegrationSyncRuns(ctx context.Context, scope Scope, provider string) ([]IntegrationSyncRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	provider = strings.ToLower(strings.TrimSpace(provider))
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]IntegrationSyncRunRecord, 0)
	for _, record := range s.integrationSyncRuns {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if provider != "" && record.Provider != provider {
			continue
		}
		out = append(out, cloneIntegrationSyncRunRecord(record))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].StartedAt.Equal(out[j].StartedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].StartedAt.After(out[j].StartedAt)
	})
	return out, nil
}

func (s *InMemoryStore) UpsertIntegrationCheckpoint(ctx context.Context, scope Scope, record IntegrationCheckpointRecord) (IntegrationCheckpointRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return IntegrationCheckpointRecord{}, err
	}
	record.RunID = normalizeID(record.RunID)
	record.CheckpointKey = strings.TrimSpace(record.CheckpointKey)
	record.Cursor = strings.TrimSpace(record.Cursor)
	record.PayloadJSON = strings.TrimSpace(record.PayloadJSON)
	if record.RunID == "" {
		return IntegrationCheckpointRecord{}, invalidRecordError("integration_checkpoints", "run_id", "required")
	}
	if record.CheckpointKey == "" {
		return IntegrationCheckpointRecord{}, invalidRecordError("integration_checkpoints", "checkpoint_key", "required")
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	now := time.Now().UTC()
	indexKey := integrationCheckpointIndexKey(scope, record.RunID, record.CheckpointKey)

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.integrationSyncRuns[scopedKey(scope, record.RunID)]; !ok {
		return IntegrationCheckpointRecord{}, notFoundError("integration_sync_runs", record.RunID)
	}

	if existingID, ok := s.integrationCheckpointIndex[indexKey]; ok {
		existing, ok := s.integrationCheckpoints[scopedKey(scope, existingID)]
		if !ok {
			return IntegrationCheckpointRecord{}, notFoundError("integration_checkpoints", existingID)
		}
		if record.Version > 0 && record.Version != existing.Version {
			return IntegrationCheckpointRecord{}, versionConflictError("integration_checkpoints", existing.ID, record.Version, existing.Version)
		}
		record.ID = existing.ID
		record.Version = existing.Version + 1
		record.CreatedAt = existing.CreatedAt
		record.UpdatedAt = now
		record = cloneIntegrationCheckpointRecord(record)
		s.integrationCheckpoints[scopedKey(scope, record.ID)] = record
		s.integrationCheckpointIndex[indexKey] = record.ID
		return record, nil
	}

	record.Version = normalizePositiveVersion(record.Version)
	record.CreatedAt = now
	record.UpdatedAt = now
	record = cloneIntegrationCheckpointRecord(record)
	s.integrationCheckpoints[scopedKey(scope, record.ID)] = record
	s.integrationCheckpointIndex[indexKey] = record.ID
	return record, nil
}

func (s *InMemoryStore) ListIntegrationCheckpoints(ctx context.Context, scope Scope, runID string) ([]IntegrationCheckpointRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	runID = normalizeID(runID)
	if runID == "" {
		return nil, invalidRecordError("integration_checkpoints", "run_id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]IntegrationCheckpointRecord, 0)
	for _, record := range s.integrationCheckpoints {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.RunID != runID {
			continue
		}
		out = append(out, cloneIntegrationCheckpointRecord(record))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].UpdatedAt.Equal(out[j].UpdatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].UpdatedAt.Before(out[j].UpdatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) CreateIntegrationConflict(ctx context.Context, scope Scope, record IntegrationConflictRecord) (IntegrationConflictRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return IntegrationConflictRecord{}, err
	}
	record.RunID = normalizeID(record.RunID)
	record.BindingID = normalizeID(record.BindingID)
	record.Provider, record.EntityKind = normalizeProviderAndEntity(record.Provider, record.EntityKind)
	record.ExternalID = normalizeID(record.ExternalID)
	record.InternalID = normalizeID(record.InternalID)
	record.Status = normalizeConflictStatus(record.Status)
	record.Reason = strings.TrimSpace(record.Reason)
	record.PayloadJSON = strings.TrimSpace(record.PayloadJSON)
	record.ResolutionJSON = strings.TrimSpace(record.ResolutionJSON)
	record.ResolvedByUserID = normalizeID(record.ResolvedByUserID)
	if record.Provider == "" {
		return IntegrationConflictRecord{}, invalidRecordError("integration_conflicts", "provider", "required")
	}
	if record.EntityKind == "" {
		return IntegrationConflictRecord{}, invalidRecordError("integration_conflicts", "entity_kind", "required")
	}
	if record.ExternalID == "" {
		return IntegrationConflictRecord{}, invalidRecordError("integration_conflicts", "external_id", "required")
	}
	if record.Reason == "" {
		return IntegrationConflictRecord{}, invalidRecordError("integration_conflicts", "reason", "required")
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.Version = normalizePositiveVersion(record.Version)
	now := time.Now().UTC()
	record.CreatedAt = now
	record.UpdatedAt = now
	record.ResolvedAt = cloneTimePtr(record.ResolvedAt)

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.integrationConflicts[scopedKey(scope, record.ID)]; exists {
		return IntegrationConflictRecord{}, invalidRecordError("integration_conflicts", "id", "already exists")
	}
	record = cloneIntegrationConflictRecord(record)
	s.integrationConflicts[scopedKey(scope, record.ID)] = record
	return record, nil
}

func (s *InMemoryStore) GetIntegrationConflict(ctx context.Context, scope Scope, id string) (IntegrationConflictRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return IntegrationConflictRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return IntegrationConflictRecord{}, invalidRecordError("integration_conflicts", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.integrationConflicts[scopedKey(scope, id)]
	if !ok {
		return IntegrationConflictRecord{}, notFoundError("integration_conflicts", id)
	}
	return cloneIntegrationConflictRecord(record), nil
}

func (s *InMemoryStore) ListIntegrationConflicts(ctx context.Context, scope Scope, runID, status string) ([]IntegrationConflictRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	runID = normalizeID(runID)
	status = strings.ToLower(strings.TrimSpace(status))
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]IntegrationConflictRecord, 0)
	for _, record := range s.integrationConflicts {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if runID != "" && record.RunID != runID {
			continue
		}
		if status != "" && record.Status != status {
			continue
		}
		out = append(out, cloneIntegrationConflictRecord(record))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].UpdatedAt.Equal(out[j].UpdatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].UpdatedAt.Before(out[j].UpdatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) ResolveIntegrationConflict(ctx context.Context, scope Scope, id, status, resolutionJSON, resolvedByUserID string, resolvedAt time.Time, expectedVersion int64) (IntegrationConflictRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return IntegrationConflictRecord{}, err
	}
	id = normalizeID(id)
	if id == "" {
		return IntegrationConflictRecord{}, invalidRecordError("integration_conflicts", "id", "required")
	}
	status = strings.ToLower(strings.TrimSpace(status))
	if status != IntegrationConflictStatusResolved && status != IntegrationConflictStatusIgnored {
		return IntegrationConflictRecord{}, invalidRecordError("integration_conflicts", "status", "must be resolved or ignored")
	}
	resolutionJSON = strings.TrimSpace(resolutionJSON)
	resolvedByUserID = normalizeID(resolvedByUserID)
	if resolvedAt.IsZero() {
		resolvedAt = time.Now().UTC()
	}
	resolvedAt = resolvedAt.UTC()

	key := scopedKey(scope, id)
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.integrationConflicts[key]
	if !ok {
		return IntegrationConflictRecord{}, notFoundError("integration_conflicts", id)
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return IntegrationConflictRecord{}, versionConflictError("integration_conflicts", id, expectedVersion, record.Version)
	}
	record.Status = status
	record.ResolutionJSON = resolutionJSON
	record.ResolvedByUserID = resolvedByUserID
	record.ResolvedAt = &resolvedAt
	record.Version++
	record.UpdatedAt = resolvedAt
	record = cloneIntegrationConflictRecord(record)
	s.integrationConflicts[key] = record
	return record, nil
}

func (s *InMemoryStore) AppendIntegrationChangeEvent(ctx context.Context, scope Scope, record IntegrationChangeEventRecord) (IntegrationChangeEventRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return IntegrationChangeEventRecord{}, err
	}
	record.AgreementID = normalizeID(record.AgreementID)
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.EventType = strings.TrimSpace(record.EventType)
	record.SourceEventID = strings.TrimSpace(record.SourceEventID)
	record.IdempotencyKey = strings.TrimSpace(record.IdempotencyKey)
	record.PayloadJSON = strings.TrimSpace(record.PayloadJSON)
	if record.Provider == "" {
		return IntegrationChangeEventRecord{}, invalidRecordError("integration_change_events", "provider", "required")
	}
	if record.EventType == "" {
		return IntegrationChangeEventRecord{}, invalidRecordError("integration_change_events", "event_type", "required")
	}
	if record.IdempotencyKey == "" {
		return IntegrationChangeEventRecord{}, invalidRecordError("integration_change_events", "idempotency_key", "required")
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	if record.EmittedAt.IsZero() {
		record.EmittedAt = time.Now().UTC()
	}
	record.EmittedAt = record.EmittedAt.UTC()
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	if record.CreatedAt.IsZero() {
		record.CreatedAt = record.EmittedAt
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	for _, existing := range s.integrationChangeEvents {
		if existing.TenantID != scope.TenantID || existing.OrgID != scope.OrgID {
			continue
		}
		if existing.Provider == record.Provider && existing.IdempotencyKey == record.IdempotencyKey {
			return cloneIntegrationChangeEventRecord(existing), nil
		}
	}
	record = cloneIntegrationChangeEventRecord(record)
	s.integrationChangeEvents[scopedKey(scope, record.ID)] = record
	return record, nil
}

func (s *InMemoryStore) ListIntegrationChangeEvents(ctx context.Context, scope Scope, agreementID string) ([]IntegrationChangeEventRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeID(agreementID)
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]IntegrationChangeEventRecord, 0)
	for _, record := range s.integrationChangeEvents {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if agreementID != "" && record.AgreementID != agreementID {
			continue
		}
		out = append(out, cloneIntegrationChangeEventRecord(record))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].EmittedAt.Equal(out[j].EmittedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].EmittedAt.Before(out[j].EmittedAt)
	})
	return out, nil
}

func (s *InMemoryStore) ClaimIntegrationMutation(ctx context.Context, scope Scope, idempotencyKey string, firstSeenAt time.Time) (bool, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return false, err
	}
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey == "" {
		return false, invalidRecordError("integration_mutation_claims", "idempotency_key", "required")
	}
	if firstSeenAt.IsZero() {
		firstSeenAt = time.Now().UTC()
	}
	firstSeenAt = firstSeenAt.UTC()
	key := integrationMutationClaimKey(scope, idempotencyKey)

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.integrationMutationClaims[key]; exists {
		return false, nil
	}
	s.integrationMutationClaims[key] = firstSeenAt
	return true, nil
}

func normalizePlacementRunStatus(status string) string {
	status = strings.ToLower(strings.TrimSpace(status))
	switch status {
	case PlacementRunStatusCompleted,
		PlacementRunStatusPartial,
		PlacementRunStatusBudgetExhausted,
		PlacementRunStatusTimedOut,
		PlacementRunStatusFailed:
		return status
	default:
		return PlacementRunStatusFailed
	}
}

func (s *InMemoryStore) UpsertPlacementRun(ctx context.Context, scope Scope, record PlacementRunRecord) (PlacementRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return PlacementRunRecord{}, err
	}
	record.AgreementID = normalizeID(record.AgreementID)
	if record.AgreementID == "" {
		return PlacementRunRecord{}, invalidRecordError("placement_runs", "agreement_id", "required")
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.Status = normalizePlacementRunStatus(record.Status)
	record.ReasonCode = strings.TrimSpace(record.ReasonCode)
	record.CreatedByUserID = normalizeID(record.CreatedByUserID)
	record.PolicyJSON = strings.TrimSpace(record.PolicyJSON)
	record.ResolverOrder = sanitizePlacementResolverIDs(record.ResolverOrder)
	record.ExecutedResolvers = sanitizePlacementResolverIDs(record.ExecutedResolvers)
	record.ResolverScores = clonePlacementResolverScores(record.ResolverScores)
	record.Suggestions = clonePlacementSuggestionRecords(record.Suggestions)
	record.SelectedSuggestionIDs = append([]string{}, record.SelectedSuggestionIDs...)
	record.UnresolvedDefinitionIDs = append([]string{}, record.UnresolvedDefinitionIDs...)
	record.SelectedSource = strings.TrimSpace(record.SelectedSource)
	if record.MaxBudget < 0 {
		record.MaxBudget = 0
	}
	if record.BudgetUsed < 0 {
		record.BudgetUsed = 0
	}
	if record.MaxTimeMS < 0 {
		record.MaxTimeMS = 0
	}
	if record.ElapsedMS < 0 {
		record.ElapsedMS = 0
	}
	if record.ManualOverrideCount < 0 {
		record.ManualOverrideCount = 0
	}
	now := time.Now().UTC()
	key := scopedKey(scope, record.ID)

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.agreements[scopedKey(scope, record.AgreementID)]; !ok {
		return PlacementRunRecord{}, notFoundError("agreements", record.AgreementID)
	}
	existing, hasExisting := s.placementRuns[key]
	if hasExisting {
		if record.Version > 0 && record.Version != existing.Version {
			return PlacementRunRecord{}, versionConflictError("placement_runs", record.ID, record.Version, existing.Version)
		}
		record.Version = existing.Version + 1
		record.CreatedAt = existing.CreatedAt
	} else {
		record.Version = normalizePositiveVersion(record.Version)
		record.CreatedAt = now
	}
	if record.CompletedAt != nil {
		completed := record.CompletedAt.UTC()
		record.CompletedAt = &completed
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.UpdatedAt = now
	record = clonePlacementRunRecord(record)
	s.placementRuns[key] = record
	return record, nil
}

func (s *InMemoryStore) GetPlacementRun(ctx context.Context, scope Scope, agreementID, runID string) (PlacementRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return PlacementRunRecord{}, err
	}
	agreementID = normalizeID(agreementID)
	runID = normalizeID(runID)
	if agreementID == "" {
		return PlacementRunRecord{}, invalidRecordError("placement_runs", "agreement_id", "required")
	}
	if runID == "" {
		return PlacementRunRecord{}, invalidRecordError("placement_runs", "id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.placementRuns[scopedKey(scope, runID)]
	if !ok {
		return PlacementRunRecord{}, notFoundError("placement_runs", runID)
	}
	if record.AgreementID != agreementID {
		return PlacementRunRecord{}, notFoundError("placement_runs", runID)
	}
	return clonePlacementRunRecord(record), nil
}

func (s *InMemoryStore) ListPlacementRuns(ctx context.Context, scope Scope, agreementID string) ([]PlacementRunRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return nil, invalidRecordError("placement_runs", "agreement_id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]PlacementRunRecord, 0)
	for _, record := range s.placementRuns {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.AgreementID != agreementID {
			continue
		}
		out = append(out, clonePlacementRunRecord(record))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
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
