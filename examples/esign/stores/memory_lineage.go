package stores

import (
	"context"
	"sort"
	"strings"

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

func createPreparedLineageRecord[T any](
	s *InMemoryStore,
	scope Scope,
	record T,
	table string,
	records map[string]T,
	ensure func(Scope, T) error,
	prepare func(T, *T) (T, error),
	getID func(T) string,
	setID func(T, string) T,
	setScope func(T, Scope) T,
	beforeStore func(T) error,
) (T, error) {
	var zero T

	record = setID(record, strings.TrimSpace(getID(record)))
	if getID(record) == "" {
		record = setID(record, uuid.NewString())
	}
	if ensure != nil {
		if err := ensure(scope, record); err != nil {
			return zero, err
		}
	}
	record = setScope(record, scope)
	record, err := prepare(record, nil)
	if err != nil {
		return zero, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, getID(record))
	if _, exists := records[scopedID]; exists {
		return zero, invalidRecordError(table, "id", "already exists")
	}
	if beforeStore != nil {
		if err := beforeStore(record); err != nil {
			return zero, err
		}
	}
	records[scopedID] = record
	return record, nil
}

func savePreparedLineageRecord[T any](
	s *InMemoryStore,
	scope Scope,
	record T,
	table string,
	records map[string]T,
	ensure func(Scope, T) error,
	prepare func(T, *T) (T, error),
	getID func(T) string,
	setID func(T, string) T,
	setScope func(T, Scope) T,
	beforeStore func(T, T) error,
) (T, error) {
	var zero T

	record = setID(record, strings.TrimSpace(getID(record)))
	if getID(record) == "" {
		return zero, invalidRecordError(table, "id", "required")
	}
	if ensure != nil {
		if err := ensure(scope, record); err != nil {
			return zero, err
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, getID(record))
	current, ok := records[scopedID]
	if !ok {
		return zero, notFoundError(table, getID(record))
	}
	record = setScope(record, scope)
	record, err := prepare(record, &current)
	if err != nil {
		return zero, err
	}
	if beforeStore != nil {
		if err := beforeStore(record, current); err != nil {
			return zero, err
		}
	}
	records[scopedID] = record
	return record, nil
}

func listFilteredLineageRecords[T any](
	scope Scope,
	records map[string]T,
	include func(T, Scope) bool,
	less func(T, T) bool,
) []T {
	out := make([]T, 0)
	for _, record := range records {
		if !include(record, scope) {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		return less(out[i], out[j])
	})
	return out
}

func listLineageQueryRecords[T any, Q any](
	s *InMemoryStore,
	ctx context.Context,
	scope Scope,
	query Q,
	records map[string]T,
	include func(T, Scope, Q) bool,
	less func(T, T) bool,
) ([]T, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return listFilteredLineageRecords(scope, records, func(record T, scope Scope) bool {
		return include(record, scope, query)
	}, less), nil
}

func createLineageRecordWithScopeValidation[T any](
	s *InMemoryStore,
	ctx context.Context,
	scope Scope,
	record T,
	table string,
	records map[string]T,
	ensure func(Scope, T) error,
	prepare func(T, *T) (T, error),
	getID func(T) string,
	setID func(T, string) T,
	setScope func(T, Scope) T,
	beforeStore func(T) error,
) (T, error) {
	var zero T

	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return zero, err
	}
	return createPreparedLineageRecord(s, scope, record, table, records, ensure, prepare, getID, setID, setScope, beforeStore)
}

func saveLineageRecordWithScopeValidation[T any](
	s *InMemoryStore,
	ctx context.Context,
	scope Scope,
	record T,
	table string,
	records map[string]T,
	ensure func(Scope, T) error,
	prepare func(T, *T) (T, error),
	getID func(T) string,
	setID func(T, string) T,
	setScope func(T, Scope) T,
	beforeStore func(T, T) error,
) (T, error) {
	var zero T

	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return zero, err
	}
	return savePreparedLineageRecord(s, scope, record, table, records, ensure, prepare, getID, setID, setScope, beforeStore)
}

func sourceDocumentRecordID(record SourceDocumentRecord) string { return record.ID }

func setSourceDocumentRecordID(record SourceDocumentRecord, id string) SourceDocumentRecord {
	record.ID = id
	return record
}

func scopeSourceDocumentRecord(record SourceDocumentRecord, scope Scope) SourceDocumentRecord {
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	return record
}

func includeSourceDocumentRecord(record SourceDocumentRecord, scope Scope, query SourceDocumentQuery) bool {
	if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
		return false
	}
	if query.ProviderKind != "" && strings.TrimSpace(record.ProviderKind) != strings.TrimSpace(query.ProviderKind) {
		return false
	}
	if query.Status != "" && strings.TrimSpace(record.Status) != strings.TrimSpace(query.Status) {
		return false
	}
	return query.CanonicalTitle == "" || strings.EqualFold(strings.TrimSpace(record.CanonicalTitle), strings.TrimSpace(query.CanonicalTitle))
}

func sourceDocumentRecordLess(left, right SourceDocumentRecord) bool {
	if left.CreatedAt.Equal(right.CreatedAt) {
		return left.ID < right.ID
	}
	return left.CreatedAt.Before(right.CreatedAt)
}

func sourceArtifactRecordID(record SourceArtifactRecord) string { return record.ID }

func setSourceArtifactRecordID(record SourceArtifactRecord, id string) SourceArtifactRecord {
	record.ID = id
	return record
}

func scopeSourceArtifactRecord(record SourceArtifactRecord, scope Scope) SourceArtifactRecord {
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	return record
}

func includeSourceArtifactRecord(record SourceArtifactRecord, scope Scope, query SourceArtifactQuery) bool {
	if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
		return false
	}
	if query.SourceRevisionID != "" && strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(query.SourceRevisionID) {
		return false
	}
	if query.ArtifactKind != "" && strings.TrimSpace(record.ArtifactKind) != strings.TrimSpace(query.ArtifactKind) {
		return false
	}
	return query.SHA256 == "" || strings.TrimSpace(record.SHA256) == strings.TrimSpace(query.SHA256)
}

func sourceArtifactRecordLess(left, right SourceArtifactRecord) bool {
	if left.CreatedAt.Equal(right.CreatedAt) {
		return left.ID < right.ID
	}
	return left.CreatedAt.Before(right.CreatedAt)
}

func sourceFingerprintRecordID(record SourceFingerprintRecord) string { return record.ID }

func setSourceFingerprintRecordID(record SourceFingerprintRecord, id string) SourceFingerprintRecord {
	record.ID = id
	return record
}

func scopeSourceFingerprintRecord(record SourceFingerprintRecord, scope Scope) SourceFingerprintRecord {
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	return record
}

func includeSourceFingerprintRecord(record SourceFingerprintRecord, scope Scope, query SourceFingerprintQuery) bool {
	if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
		return false
	}
	if query.SourceRevisionID != "" && strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(query.SourceRevisionID) {
		return false
	}
	if query.ArtifactID != "" && strings.TrimSpace(record.ArtifactID) != strings.TrimSpace(query.ArtifactID) {
		return false
	}
	return query.ExtractVersion == "" || strings.TrimSpace(record.ExtractVersion) == strings.TrimSpace(query.ExtractVersion)
}

func sourceFingerprintRecordLess(left, right SourceFingerprintRecord) bool {
	if left.CreatedAt.Equal(right.CreatedAt) {
		return left.ID < right.ID
	}
	return left.CreatedAt.Before(right.CreatedAt)
}

func (s *InMemoryStore) ensureSourceArtifactRecord(scope Scope, record SourceArtifactRecord) error {
	_, err := s.GetSourceRevision(context.Background(), scope, record.SourceRevisionID)
	return err
}

func (s *InMemoryStore) ensureUniqueSourceArtifactRecord(scope Scope, record SourceArtifactRecord) error {
	for _, existing := range s.sourceArtifacts {
		if existing.TenantID == scope.TenantID &&
			existing.OrgID == scope.OrgID &&
			strings.TrimSpace(existing.SourceRevisionID) == record.SourceRevisionID &&
			strings.TrimSpace(existing.ArtifactKind) == record.ArtifactKind &&
			strings.TrimSpace(existing.SHA256) == record.SHA256 {
			return invalidRecordError("source_artifacts", "sha256", "already exists")
		}
	}
	return nil
}

func (s *InMemoryStore) ensureSourceRevisionRecord(scope Scope, record SourceRevisionRecord) error {
	_, err := s.GetSourceDocument(context.Background(), scope, record.SourceDocumentID)
	if err != nil {
		return err
	}
	handle, err := s.GetSourceHandle(context.Background(), scope, record.SourceHandleID)
	if err != nil {
		return err
	}
	if strings.TrimSpace(handle.SourceDocumentID) != strings.TrimSpace(record.SourceDocumentID) {
		return invalidRecordError("source_revisions", "source_handle_id", "must belong to source_document_id")
	}
	return nil
}

func sourceRevisionRecordID(record SourceRevisionRecord) string { return record.ID }

func setSourceRevisionRecordID(record SourceRevisionRecord, id string) SourceRevisionRecord {
	record.ID = id
	return record
}

func scopeSourceRevisionRecord(record SourceRevisionRecord, scope Scope) SourceRevisionRecord {
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	return record
}

func (s *InMemoryStore) ensureSourceFingerprintRecord(scope Scope, record SourceFingerprintRecord) error {
	_, err := s.GetSourceRevision(context.Background(), scope, record.SourceRevisionID)
	if err != nil {
		return err
	}
	artifact, err := s.GetSourceArtifact(context.Background(), scope, record.ArtifactID)
	if err != nil {
		return err
	}
	if strings.TrimSpace(artifact.SourceRevisionID) != strings.TrimSpace(record.SourceRevisionID) {
		return invalidRecordError("source_fingerprints", "artifact_id", "must belong to source_revision_id")
	}
	return nil
}

func (s *InMemoryStore) validateSavedSourceFingerprintRecord(scope Scope, record, _ SourceFingerprintRecord) error {
	artifact, err := s.getSourceArtifactLocked(scope, record.ArtifactID)
	if err != nil {
		return err
	}
	if strings.TrimSpace(artifact.SourceRevisionID) != strings.TrimSpace(record.SourceRevisionID) {
		return invalidRecordError("source_fingerprints", "artifact_id", "must belong to source_revision_id")
	}
	return nil
}

func (s *InMemoryStore) CreateSourceDocument(ctx context.Context, scope Scope, record SourceDocumentRecord) (SourceDocumentRecord, error) {
	return createLineageRecordWithScopeValidation(s, ctx, scope, record, "source_documents", s.sourceDocuments, nil, PrepareSourceDocumentRecord, sourceDocumentRecordID, setSourceDocumentRecordID, scopeSourceDocumentRecord, nil)
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
	return listLineageQueryRecords(s, ctx, scope, query, s.sourceDocuments, includeSourceDocumentRecord, sourceDocumentRecordLess)
}

func (s *InMemoryStore) SaveSourceDocument(ctx context.Context, scope Scope, record SourceDocumentRecord) (SourceDocumentRecord, error) {
	return saveLineageRecordWithScopeValidation(s, ctx, scope, record, "source_documents", s.sourceDocuments, nil, PrepareSourceDocumentRecord, sourceDocumentRecordID, setSourceDocumentRecordID, scopeSourceDocumentRecord, nil)
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
	_, err = s.GetSourceDocument(context.Background(), scope, record.SourceDocumentID)
	if err != nil {
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
	documentIDs := normalizedLineageQueryIDs(query.SourceDocumentID, query.SourceDocumentIDs)
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SourceHandleRecord, 0)
	for _, record := range s.sourceHandles {
		if !includeSourceHandleRecord(record, scope, query, documentIDs) {
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

func includeSourceHandleRecord(record SourceHandleRecord, scope Scope, query SourceHandleQuery, documentIDs map[string]struct{}) bool {
	if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
		return false
	}
	if len(documentIDs) > 0 && !lineageQueryIDMatches(record.SourceDocumentID, documentIDs) {
		return false
	}
	if query.ProviderKind != "" && strings.TrimSpace(record.ProviderKind) != strings.TrimSpace(query.ProviderKind) {
		return false
	}
	if query.ExternalFileID != "" && strings.TrimSpace(record.ExternalFileID) != strings.TrimSpace(query.ExternalFileID) {
		return false
	}
	if query.AccountID != "" && strings.TrimSpace(record.AccountID) != strings.TrimSpace(query.AccountID) {
		return false
	}
	return !query.ActiveOnly || isActiveSourceHandle(record)
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
	return createLineageRecordWithScopeValidation(s, ctx, scope, record, "source_revisions", s.sourceRevisions, s.ensureSourceRevisionRecord, PrepareSourceRevisionRecord, sourceRevisionRecordID, setSourceRevisionRecordID, scopeSourceRevisionRecord, nil)
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
	documentIDs := normalizedLineageQueryIDs(query.SourceDocumentID, query.SourceDocumentIDs)
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SourceRevisionRecord, 0)
	for _, record := range s.sourceRevisions {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if len(documentIDs) > 0 && !lineageQueryIDMatches(record.SourceDocumentID, documentIDs) {
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
	return createLineageRecordWithScopeValidation(s, ctx, scope, record, "source_artifacts", s.sourceArtifacts, s.ensureSourceArtifactRecord, PrepareSourceArtifactRecord, sourceArtifactRecordID, setSourceArtifactRecordID, scopeSourceArtifactRecord, func(record SourceArtifactRecord) error {
		return s.ensureUniqueSourceArtifactRecord(scope, record)
	})
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
	return s.getSourceArtifactLocked(scope, id)
}

func (s *InMemoryStore) getSourceArtifactLocked(scope Scope, id string) (SourceArtifactRecord, error) {
	record, ok := s.sourceArtifacts[lineageScopedID(scope, id)]
	if !ok {
		return SourceArtifactRecord{}, notFoundError("source_artifacts", id)
	}
	return record, nil
}

func (s *InMemoryStore) ListSourceArtifacts(ctx context.Context, scope Scope, query SourceArtifactQuery) ([]SourceArtifactRecord, error) {
	return listLineageQueryRecords(s, ctx, scope, query, s.sourceArtifacts, includeSourceArtifactRecord, sourceArtifactRecordLess)
}

func (s *InMemoryStore) SaveSourceArtifact(ctx context.Context, scope Scope, record SourceArtifactRecord) (SourceArtifactRecord, error) {
	return saveLineageRecordWithScopeValidation(s, ctx, scope, record, "source_artifacts", s.sourceArtifacts, nil, PrepareSourceArtifactRecord, sourceArtifactRecordID, setSourceArtifactRecordID, scopeSourceArtifactRecord, nil)
}

func (s *InMemoryStore) CreateSourceFingerprint(ctx context.Context, scope Scope, record SourceFingerprintRecord) (SourceFingerprintRecord, error) {
	return createLineageRecordWithScopeValidation(s, ctx, scope, record, "source_fingerprints", s.sourceFingerprints, s.ensureSourceFingerprintRecord, PrepareSourceFingerprintRecord, sourceFingerprintRecordID, setSourceFingerprintRecordID, scopeSourceFingerprintRecord, nil)
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
	return listLineageQueryRecords(s, ctx, scope, query, s.sourceFingerprints, includeSourceFingerprintRecord, sourceFingerprintRecordLess)
}

func (s *InMemoryStore) SaveSourceFingerprint(ctx context.Context, scope Scope, record SourceFingerprintRecord) (SourceFingerprintRecord, error) {
	return saveLineageRecordWithScopeValidation(s, ctx, scope, record, "source_fingerprints", s.sourceFingerprints, nil, PrepareSourceFingerprintRecord, sourceFingerprintRecordID, setSourceFingerprintRecordID, scopeSourceFingerprintRecord, func(record, current SourceFingerprintRecord) error {
		return s.validateSavedSourceFingerprintRecord(scope, record, current)
	})
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
	_, err = s.GetSourceDocument(context.Background(), scope, record.LeftSourceDocumentID)
	if err != nil {
		return SourceRelationshipRecord{}, err
	}
	_, err = s.GetSourceDocument(context.Background(), scope, record.RightSourceDocumentID)
	if err != nil {
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
	documentIDs := normalizedLineageQueryIDs(query.SourceDocumentID, query.SourceDocumentIDs)
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SourceRelationshipRecord, 0)
	for _, record := range s.sourceRelationships {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if len(documentIDs) > 0 &&
			!lineageQueryIDMatches(record.LeftSourceDocumentID, documentIDs) &&
			!lineageQueryIDMatches(record.RightSourceDocumentID, documentIDs) {
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

func normalizedLineageQueryIDs(primary string, values []string) map[string]struct{} {
	set := make(map[string]struct{}, len(values)+1)
	if value := strings.TrimSpace(primary); value != "" {
		set[value] = struct{}{}
	}
	for _, value := range values {
		if value = strings.TrimSpace(value); value != "" {
			set[value] = struct{}{}
		}
	}
	if len(set) == 0 {
		return nil
	}
	return set
}

func lineageQueryIDMatches(candidate string, values map[string]struct{}) bool {
	if len(values) == 0 {
		return true
	}
	_, ok := values[strings.TrimSpace(candidate)]
	return ok
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
