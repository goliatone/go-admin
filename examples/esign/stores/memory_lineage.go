package stores

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
)

func lineageScopedID(scope Scope, id string) string {
	return strings.TrimSpace(scope.TenantID) + "|" + strings.TrimSpace(scope.OrgID) + "|" + strings.TrimSpace(id)
}

func activeSourceHandleIndexKey(scope Scope, providerKind, externalFileID, accountID string) string {
	return strings.Join([]string{
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		strings.TrimSpace(strings.ToLower(providerKind)),
		strings.TrimSpace(strings.ToLower(externalFileID)),
		strings.TrimSpace(strings.ToLower(accountID)),
	}, "|")
}

func isActiveSourceHandle(record SourceHandleRecord) bool {
	if strings.TrimSpace(record.HandleStatus) != SourceHandleStatusActive {
		return false
	}
	return record.ValidTo == nil || record.ValidTo.IsZero()
}

func lineageTimeOrNow(value time.Time) time.Time {
	if value.IsZero() {
		return time.Now().UTC()
	}
	return value.UTC()
}

func cloneLineageTimePtr(value *time.Time) *time.Time {
	if value == nil || value.IsZero() {
		return nil
	}
	cloned := value.UTC()
	return &cloned
}

func (s *InMemoryStore) CreateSourceDocument(ctx context.Context, scope Scope, record SourceDocumentRecord) (SourceDocumentRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceDocumentRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceDocumentRecord(record, nil)
	if err != nil {
		return SourceDocumentRecord{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	if _, exists := s.sourceDocuments[scopedID]; exists {
		return SourceDocumentRecord{}, invalidRecordError("source_documents", "id", "already exists")
	}
	s.sourceDocuments[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) GetSourceDocument(ctx context.Context, scope Scope, id string) (SourceDocumentRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceDocumentRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return SourceDocumentRecord{}, invalidRecordError("source_documents", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.sourceDocuments[lineageScopedID(scope, id)]
	if !ok {
		return SourceDocumentRecord{}, notFoundError("source_documents", id)
	}
	return record, nil
}

func (s *InMemoryStore) ListSourceDocuments(ctx context.Context, scope Scope, query SourceDocumentQuery) ([]SourceDocumentRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SourceDocumentRecord, 0)
	for _, record := range s.sourceDocuments {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if query.ProviderKind != "" && strings.TrimSpace(record.ProviderKind) != strings.TrimSpace(query.ProviderKind) {
			continue
		}
		if query.Status != "" && strings.TrimSpace(record.Status) != strings.TrimSpace(query.Status) {
			continue
		}
		if query.CanonicalTitle != "" && !strings.EqualFold(strings.TrimSpace(record.CanonicalTitle), strings.TrimSpace(query.CanonicalTitle)) {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) SaveSourceDocument(ctx context.Context, scope Scope, record SourceDocumentRecord) (SourceDocumentRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceDocumentRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		return SourceDocumentRecord{}, invalidRecordError("source_documents", "id", "required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	current, ok := s.sourceDocuments[scopedID]
	if !ok {
		return SourceDocumentRecord{}, notFoundError("source_documents", record.ID)
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceDocumentRecord(record, &current)
	if err != nil {
		return SourceDocumentRecord{}, err
	}
	s.sourceDocuments[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) CreateSourceHandle(ctx context.Context, scope Scope, record SourceHandleRecord) (SourceHandleRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceHandleRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	if _, err := s.GetSourceDocument(context.Background(), scope, record.SourceDocumentID); err != nil {
		return SourceHandleRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceHandleRecord(record, nil)
	if err != nil {
		return SourceHandleRecord{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	if _, exists := s.sourceHandles[scopedID]; exists {
		return SourceHandleRecord{}, invalidRecordError("source_handles", "id", "already exists")
	}
	if isActiveSourceHandle(record) {
		indexKey := activeSourceHandleIndexKey(scope, record.ProviderKind, record.ExternalFileID, record.AccountID)
		for _, existing := range s.sourceHandles {
			if existing.TenantID != scope.TenantID || existing.OrgID != scope.OrgID {
				continue
			}
			if !isActiveSourceHandle(existing) {
				continue
			}
			if activeSourceHandleIndexKey(scope, existing.ProviderKind, existing.ExternalFileID, existing.AccountID) == indexKey {
				return SourceHandleRecord{}, invalidRecordError("source_handles", "external_file_id", "duplicate active handle")
			}
		}
	}
	s.sourceHandles[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) GetSourceHandle(ctx context.Context, scope Scope, id string) (SourceHandleRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceHandleRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return SourceHandleRecord{}, invalidRecordError("source_handles", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.sourceHandles[lineageScopedID(scope, id)]
	if !ok {
		return SourceHandleRecord{}, notFoundError("source_handles", id)
	}
	return record, nil
}

func (s *InMemoryStore) GetActiveSourceHandle(ctx context.Context, scope Scope, providerKind, externalFileID, accountID string) (SourceHandleRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceHandleRecord{}, err
	}
	if strings.TrimSpace(providerKind) == "" || strings.TrimSpace(externalFileID) == "" {
		return SourceHandleRecord{}, invalidRecordError("source_handles", "provider_kind|external_file_id", "required")
	}
	indexKey := activeSourceHandleIndexKey(scope, providerKind, externalFileID, accountID)
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, record := range s.sourceHandles {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if !isActiveSourceHandle(record) {
			continue
		}
		if activeSourceHandleIndexKey(scope, record.ProviderKind, record.ExternalFileID, record.AccountID) == indexKey {
			return record, nil
		}
	}
	return SourceHandleRecord{}, notFoundError("source_handles", externalFileID)
}

func (s *InMemoryStore) ListSourceHandles(ctx context.Context, scope Scope, query SourceHandleQuery) ([]SourceHandleRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SourceHandleRecord, 0)
	for _, record := range s.sourceHandles {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if query.SourceDocumentID != "" && strings.TrimSpace(record.SourceDocumentID) != strings.TrimSpace(query.SourceDocumentID) {
			continue
		}
		if query.ProviderKind != "" && strings.TrimSpace(record.ProviderKind) != strings.TrimSpace(query.ProviderKind) {
			continue
		}
		if query.ExternalFileID != "" && strings.TrimSpace(record.ExternalFileID) != strings.TrimSpace(query.ExternalFileID) {
			continue
		}
		if query.AccountID != "" && strings.TrimSpace(record.AccountID) != strings.TrimSpace(query.AccountID) {
			continue
		}
		if query.ActiveOnly && !isActiveSourceHandle(record) {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) SaveSourceHandle(ctx context.Context, scope Scope, record SourceHandleRecord) (SourceHandleRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceHandleRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		return SourceHandleRecord{}, invalidRecordError("source_handles", "id", "required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	current, ok := s.sourceHandles[scopedID]
	if !ok {
		return SourceHandleRecord{}, notFoundError("source_handles", record.ID)
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceHandleRecord(record, &current)
	if err != nil {
		return SourceHandleRecord{}, err
	}
	if isActiveSourceHandle(record) {
		indexKey := activeSourceHandleIndexKey(scope, record.ProviderKind, record.ExternalFileID, record.AccountID)
		for _, existing := range s.sourceHandles {
			if existing.TenantID != scope.TenantID || existing.OrgID != scope.OrgID || existing.ID == record.ID {
				continue
			}
			if !isActiveSourceHandle(existing) {
				continue
			}
			if activeSourceHandleIndexKey(scope, existing.ProviderKind, existing.ExternalFileID, existing.AccountID) == indexKey {
				return SourceHandleRecord{}, invalidRecordError("source_handles", "external_file_id", "duplicate active handle")
			}
		}
	}
	s.sourceHandles[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) CreateSourceRevision(ctx context.Context, scope Scope, record SourceRevisionRecord) (SourceRevisionRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceRevisionRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	if _, err := s.GetSourceDocument(context.Background(), scope, record.SourceDocumentID); err != nil {
		return SourceRevisionRecord{}, err
	}
	handle, err := s.GetSourceHandle(context.Background(), scope, record.SourceHandleID)
	if err != nil {
		return SourceRevisionRecord{}, err
	}
	if strings.TrimSpace(handle.SourceDocumentID) != strings.TrimSpace(record.SourceDocumentID) {
		return SourceRevisionRecord{}, invalidRecordError("source_revisions", "source_handle_id", "must belong to source_document_id")
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceRevisionRecord(record, nil)
	if err != nil {
		return SourceRevisionRecord{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	if _, exists := s.sourceRevisions[scopedID]; exists {
		return SourceRevisionRecord{}, invalidRecordError("source_revisions", "id", "already exists")
	}
	s.sourceRevisions[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) GetSourceRevision(ctx context.Context, scope Scope, id string) (SourceRevisionRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceRevisionRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return SourceRevisionRecord{}, invalidRecordError("source_revisions", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.sourceRevisions[lineageScopedID(scope, id)]
	if !ok {
		return SourceRevisionRecord{}, notFoundError("source_revisions", id)
	}
	return record, nil
}

func (s *InMemoryStore) ListSourceRevisions(ctx context.Context, scope Scope, query SourceRevisionQuery) ([]SourceRevisionRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SourceRevisionRecord, 0)
	for _, record := range s.sourceRevisions {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if query.SourceDocumentID != "" && strings.TrimSpace(record.SourceDocumentID) != strings.TrimSpace(query.SourceDocumentID) {
			continue
		}
		if query.SourceHandleID != "" && strings.TrimSpace(record.SourceHandleID) != strings.TrimSpace(query.SourceHandleID) {
			continue
		}
		if query.ProviderRevisionHint != "" && strings.TrimSpace(record.ProviderRevisionHint) != strings.TrimSpace(query.ProviderRevisionHint) {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) SaveSourceRevision(ctx context.Context, scope Scope, record SourceRevisionRecord) (SourceRevisionRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceRevisionRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		return SourceRevisionRecord{}, invalidRecordError("source_revisions", "id", "required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	current, ok := s.sourceRevisions[scopedID]
	if !ok {
		return SourceRevisionRecord{}, notFoundError("source_revisions", record.ID)
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceRevisionRecord(record, &current)
	if err != nil {
		return SourceRevisionRecord{}, err
	}
	s.sourceRevisions[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) CreateSourceArtifact(ctx context.Context, scope Scope, record SourceArtifactRecord) (SourceArtifactRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceArtifactRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	if _, err := s.GetSourceRevision(context.Background(), scope, record.SourceRevisionID); err != nil {
		return SourceArtifactRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceArtifactRecord(record, nil)
	if err != nil {
		return SourceArtifactRecord{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	if _, exists := s.sourceArtifacts[scopedID]; exists {
		return SourceArtifactRecord{}, invalidRecordError("source_artifacts", "id", "already exists")
	}
	for _, existing := range s.sourceArtifacts {
		if existing.TenantID == scope.TenantID &&
			existing.OrgID == scope.OrgID &&
			strings.TrimSpace(existing.SourceRevisionID) == record.SourceRevisionID &&
			strings.TrimSpace(existing.ArtifactKind) == record.ArtifactKind &&
			strings.TrimSpace(existing.SHA256) == record.SHA256 {
			return SourceArtifactRecord{}, invalidRecordError("source_artifacts", "sha256", "already exists")
		}
	}
	s.sourceArtifacts[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) GetSourceArtifact(ctx context.Context, scope Scope, id string) (SourceArtifactRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceArtifactRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return SourceArtifactRecord{}, invalidRecordError("source_artifacts", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.sourceArtifacts[lineageScopedID(scope, id)]
	if !ok {
		return SourceArtifactRecord{}, notFoundError("source_artifacts", id)
	}
	return record, nil
}

func (s *InMemoryStore) ListSourceArtifacts(ctx context.Context, scope Scope, query SourceArtifactQuery) ([]SourceArtifactRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SourceArtifactRecord, 0)
	for _, record := range s.sourceArtifacts {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if query.SourceRevisionID != "" && strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(query.SourceRevisionID) {
			continue
		}
		if query.ArtifactKind != "" && strings.TrimSpace(record.ArtifactKind) != strings.TrimSpace(query.ArtifactKind) {
			continue
		}
		if query.SHA256 != "" && strings.TrimSpace(record.SHA256) != strings.TrimSpace(query.SHA256) {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) SaveSourceArtifact(ctx context.Context, scope Scope, record SourceArtifactRecord) (SourceArtifactRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceArtifactRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		return SourceArtifactRecord{}, invalidRecordError("source_artifacts", "id", "required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	current, ok := s.sourceArtifacts[scopedID]
	if !ok {
		return SourceArtifactRecord{}, notFoundError("source_artifacts", record.ID)
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceArtifactRecord(record, &current)
	if err != nil {
		return SourceArtifactRecord{}, err
	}
	s.sourceArtifacts[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) CreateSourceFingerprint(ctx context.Context, scope Scope, record SourceFingerprintRecord) (SourceFingerprintRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceFingerprintRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	if _, err := s.GetSourceRevision(context.Background(), scope, record.SourceRevisionID); err != nil {
		return SourceFingerprintRecord{}, err
	}
	if _, err := s.GetSourceArtifact(context.Background(), scope, record.ArtifactID); err != nil {
		return SourceFingerprintRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceFingerprintRecord(record, nil)
	if err != nil {
		return SourceFingerprintRecord{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	if _, exists := s.sourceFingerprints[scopedID]; exists {
		return SourceFingerprintRecord{}, invalidRecordError("source_fingerprints", "id", "already exists")
	}
	s.sourceFingerprints[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) GetSourceFingerprint(ctx context.Context, scope Scope, id string) (SourceFingerprintRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceFingerprintRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return SourceFingerprintRecord{}, invalidRecordError("source_fingerprints", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.sourceFingerprints[lineageScopedID(scope, id)]
	if !ok {
		return SourceFingerprintRecord{}, notFoundError("source_fingerprints", id)
	}
	return record, nil
}

func (s *InMemoryStore) ListSourceFingerprints(ctx context.Context, scope Scope, query SourceFingerprintQuery) ([]SourceFingerprintRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SourceFingerprintRecord, 0)
	for _, record := range s.sourceFingerprints {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if query.SourceRevisionID != "" && strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(query.SourceRevisionID) {
			continue
		}
		if query.ArtifactID != "" && strings.TrimSpace(record.ArtifactID) != strings.TrimSpace(query.ArtifactID) {
			continue
		}
		if query.ExtractVersion != "" && strings.TrimSpace(record.ExtractVersion) != strings.TrimSpace(query.ExtractVersion) {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) SaveSourceFingerprint(ctx context.Context, scope Scope, record SourceFingerprintRecord) (SourceFingerprintRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceFingerprintRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		return SourceFingerprintRecord{}, invalidRecordError("source_fingerprints", "id", "required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	current, ok := s.sourceFingerprints[scopedID]
	if !ok {
		return SourceFingerprintRecord{}, notFoundError("source_fingerprints", record.ID)
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceFingerprintRecord(record, &current)
	if err != nil {
		return SourceFingerprintRecord{}, err
	}
	s.sourceFingerprints[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) CreateSourceRelationship(ctx context.Context, scope Scope, record SourceRelationshipRecord) (SourceRelationshipRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceRelationshipRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	if _, err := s.GetSourceDocument(context.Background(), scope, record.LeftSourceDocumentID); err != nil {
		return SourceRelationshipRecord{}, err
	}
	if _, err := s.GetSourceDocument(context.Background(), scope, record.RightSourceDocumentID); err != nil {
		return SourceRelationshipRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceRelationshipRecord(record, nil)
	if err != nil {
		return SourceRelationshipRecord{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	if _, exists := s.sourceRelationships[scopedID]; exists {
		return SourceRelationshipRecord{}, invalidRecordError("source_relationships", "id", "already exists")
	}
	for _, existing := range s.sourceRelationships {
		if existing.TenantID != scope.TenantID || existing.OrgID != scope.OrgID {
			continue
		}
		if strings.TrimSpace(existing.LeftSourceDocumentID) == record.LeftSourceDocumentID &&
			strings.TrimSpace(existing.RightSourceDocumentID) == record.RightSourceDocumentID &&
			strings.TrimSpace(existing.RelationshipType) == record.RelationshipType &&
			strings.TrimSpace(existing.Status) == record.Status {
			return SourceRelationshipRecord{}, invalidRecordError("source_relationships", "status", "already exists")
		}
	}
	s.sourceRelationships[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) GetSourceRelationship(ctx context.Context, scope Scope, id string) (SourceRelationshipRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceRelationshipRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return SourceRelationshipRecord{}, invalidRecordError("source_relationships", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.sourceRelationships[lineageScopedID(scope, id)]
	if !ok {
		return SourceRelationshipRecord{}, notFoundError("source_relationships", id)
	}
	return record, nil
}

func (s *InMemoryStore) ListSourceRelationships(ctx context.Context, scope Scope, query SourceRelationshipQuery) ([]SourceRelationshipRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SourceRelationshipRecord, 0)
	for _, record := range s.sourceRelationships {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if query.SourceDocumentID != "" &&
			strings.TrimSpace(record.LeftSourceDocumentID) != strings.TrimSpace(query.SourceDocumentID) &&
			strings.TrimSpace(record.RightSourceDocumentID) != strings.TrimSpace(query.SourceDocumentID) {
			continue
		}
		if query.RelationshipType != "" && strings.TrimSpace(record.RelationshipType) != strings.TrimSpace(query.RelationshipType) {
			continue
		}
		if query.Status != "" && strings.TrimSpace(record.Status) != strings.TrimSpace(query.Status) {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) SaveSourceRelationship(ctx context.Context, scope Scope, record SourceRelationshipRecord) (SourceRelationshipRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceRelationshipRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		return SourceRelationshipRecord{}, invalidRecordError("source_relationships", "id", "required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	current, ok := s.sourceRelationships[scopedID]
	if !ok {
		return SourceRelationshipRecord{}, notFoundError("source_relationships", record.ID)
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceRelationshipRecord(record, &current)
	if err != nil {
		return SourceRelationshipRecord{}, err
	}
	for _, existing := range s.sourceRelationships {
		if existing.TenantID != scope.TenantID || existing.OrgID != scope.OrgID || existing.ID == record.ID {
			continue
		}
		if strings.TrimSpace(existing.LeftSourceDocumentID) == record.LeftSourceDocumentID &&
			strings.TrimSpace(existing.RightSourceDocumentID) == record.RightSourceDocumentID &&
			strings.TrimSpace(existing.RelationshipType) == record.RelationshipType &&
			strings.TrimSpace(existing.Status) == record.Status {
			return SourceRelationshipRecord{}, invalidRecordError("source_relationships", "status", "already exists")
		}
	}
	s.sourceRelationships[scopedID] = record
	return record, nil
}
