package stores

import (
	"context"
	"sort"
	"strings"

	"github.com/google/uuid"
)

func sourceCommentThreadRecordID(record SourceCommentThreadRecord) string { return record.ID }

func setSourceCommentThreadRecordID(record SourceCommentThreadRecord, id string) SourceCommentThreadRecord {
	record.ID = id
	return record
}

func scopeSourceCommentThreadRecord(record SourceCommentThreadRecord, scope Scope) SourceCommentThreadRecord {
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	return record
}

func includeSourceCommentThreadRecord(record SourceCommentThreadRecord, scope Scope, query SourceCommentThreadQuery) bool {
	if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
		return false
	}
	if !matchesNormalizedString(record.SourceDocumentID, query.SourceDocumentID) ||
		!matchesNormalizedString(record.SourceRevisionID, query.SourceRevisionID) ||
		!matchesNormalizedString(record.ThreadID, query.ThreadID) ||
		!matchesNormalizedString(record.ProviderKind, query.ProviderKind) ||
		!matchesNormalizedString(record.SyncStatus, query.SyncStatus) ||
		!matchesNormalizedString(record.Status, query.Status) {
		return false
	}
	return query.Status != "" || query.IncludeDeleted || !strings.EqualFold(strings.TrimSpace(record.Status), SourceCommentThreadStatusDeleted)
}

func sourceCommentThreadRecordLess(left, right SourceCommentThreadRecord) bool {
	if left.CreatedAt.Equal(right.CreatedAt) {
		return left.ID < right.ID
	}
	return left.CreatedAt.Before(right.CreatedAt)
}

func sourceCommentSyncStateRecordID(record SourceCommentSyncStateRecord) string { return record.ID }

func setSourceCommentSyncStateRecordID(record SourceCommentSyncStateRecord, id string) SourceCommentSyncStateRecord {
	record.ID = id
	return record
}

func scopeSourceCommentSyncStateRecord(record SourceCommentSyncStateRecord, scope Scope) SourceCommentSyncStateRecord {
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	return record
}

func includeSourceCommentSyncStateRecord(record SourceCommentSyncStateRecord, scope Scope, query SourceCommentSyncStateQuery) bool {
	if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
		return false
	}
	if query.SourceDocumentID != "" && strings.TrimSpace(record.SourceDocumentID) != strings.TrimSpace(query.SourceDocumentID) {
		return false
	}
	if query.SourceRevisionID != "" && strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(query.SourceRevisionID) {
		return false
	}
	if query.ProviderKind != "" && strings.TrimSpace(record.ProviderKind) != strings.TrimSpace(query.ProviderKind) {
		return false
	}
	return query.SyncStatus == "" || strings.TrimSpace(record.SyncStatus) == strings.TrimSpace(query.SyncStatus)
}

func sourceCommentSyncStateRecordLess(left, right SourceCommentSyncStateRecord) bool {
	if left.CreatedAt.Equal(right.CreatedAt) {
		return left.ID < right.ID
	}
	return left.CreatedAt.Before(right.CreatedAt)
}

func sourceSearchDocumentRecordID(record SourceSearchDocumentRecord) string { return record.ID }

func setSourceSearchDocumentRecordID(record SourceSearchDocumentRecord, id string) SourceSearchDocumentRecord {
	record.ID = id
	return record
}

func scopeSourceSearchDocumentRecord(record SourceSearchDocumentRecord, scope Scope) SourceSearchDocumentRecord {
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	return record
}

func includeSourceSearchDocumentRecord(record SourceSearchDocumentRecord, scope Scope, query SourceSearchDocumentQuery) bool {
	if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
		return false
	}
	if !matchesNormalizedString(record.SourceDocumentID, query.SourceDocumentID) ||
		!matchesNormalizedString(record.SourceRevisionID, query.SourceRevisionID) ||
		!matchesNormalizedString(record.ResultKind, query.ResultKind) ||
		!matchesNormalizedString(record.ProviderKind, query.ProviderKind) ||
		!matchesNormalizedString(record.RelationshipState, query.RelationshipState) ||
		!matchesNormalizedString(record.CommentSyncStatus, query.CommentSyncStatus) ||
		!matchesNormalizedString(record.CanonicalTitle, query.CanonicalTitle) {
		return false
	}
	return query.HasComments == nil || record.HasComments == *query.HasComments
}

func matchesNormalizedString(value, filter string) bool {
	filter = strings.TrimSpace(filter)
	return filter == "" || strings.TrimSpace(value) == filter
}

func sourceSearchDocumentRecordLess(left, right SourceSearchDocumentRecord) bool {
	if left.IndexedAt.Equal(right.IndexedAt) {
		return left.ID < right.ID
	}
	return left.IndexedAt.Before(right.IndexedAt)
}

func (s *InMemoryStore) ensureSourceCommentThreadRecord(scope Scope, record SourceCommentThreadRecord) error {
	return s.ensureSourceRevisionForDocument(scope, record.SourceDocumentID, record.SourceRevisionID)
}

func (s *InMemoryStore) ensureSourceCommentSyncStateRecord(scope Scope, record SourceCommentSyncStateRecord) error {
	return s.ensureSourceRevisionForDocument(scope, record.SourceDocumentID, record.SourceRevisionID)
}

func (s *InMemoryStore) ensureSourceSearchDocumentRecord(scope Scope, record SourceSearchDocumentRecord) error {
	return s.ensureSourceSearchDocumentScope(scope, record)
}

func (s *InMemoryStore) CreateSourceCommentThread(ctx context.Context, scope Scope, record SourceCommentThreadRecord) (SourceCommentThreadRecord, error) {
	return createLineageRecordWithScopeValidation(s, ctx, scope, record, "source_comment_threads", s.sourceCommentThreads, s.ensureSourceCommentThreadRecord, PrepareSourceCommentThreadRecord, sourceCommentThreadRecordID, setSourceCommentThreadRecordID, scopeSourceCommentThreadRecord, nil)
}

func (s *InMemoryStore) GetSourceCommentThread(ctx context.Context, scope Scope, id string) (SourceCommentThreadRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceCommentThreadRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return SourceCommentThreadRecord{}, invalidRecordError("source_comment_threads", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.sourceCommentThreads[lineageScopedID(scope, id)]
	if !ok {
		return SourceCommentThreadRecord{}, notFoundError("source_comment_threads", id)
	}
	return record, nil
}

func (s *InMemoryStore) ListSourceCommentThreads(ctx context.Context, scope Scope, query SourceCommentThreadQuery) ([]SourceCommentThreadRecord, error) {
	return listLineageQueryRecords(s, ctx, scope, query, s.sourceCommentThreads, includeSourceCommentThreadRecord, sourceCommentThreadRecordLess)
}

func (s *InMemoryStore) SaveSourceCommentThread(ctx context.Context, scope Scope, record SourceCommentThreadRecord) (SourceCommentThreadRecord, error) {
	return saveLineageRecordWithScopeValidation(s, ctx, scope, record, "source_comment_threads", s.sourceCommentThreads, s.ensureSourceCommentThreadRecord, PrepareSourceCommentThreadRecord, sourceCommentThreadRecordID, setSourceCommentThreadRecordID, scopeSourceCommentThreadRecord, nil)
}

func (s *InMemoryStore) CreateSourceCommentMessage(ctx context.Context, scope Scope, record SourceCommentMessageRecord) (SourceCommentMessageRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceCommentMessageRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	thread, err := s.GetSourceCommentThread(context.Background(), scope, record.SourceCommentThreadID)
	if err != nil {
		return SourceCommentMessageRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.SourceRevisionID = strings.TrimSpace(coalesceLineageString(record.SourceRevisionID, thread.SourceRevisionID))
	record, err = PrepareSourceCommentMessageRecord(record, nil)
	if err != nil {
		return SourceCommentMessageRecord{}, err
	}
	if strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(thread.SourceRevisionID) {
		return SourceCommentMessageRecord{}, invalidRecordError("source_comment_messages", "source_revision_id", "must belong to source_comment_thread_id")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	if _, exists := s.sourceCommentMessages[scopedID]; exists {
		return SourceCommentMessageRecord{}, invalidRecordError("source_comment_messages", "id", "already exists")
	}
	s.sourceCommentMessages[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) GetSourceCommentMessage(ctx context.Context, scope Scope, id string) (SourceCommentMessageRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceCommentMessageRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return SourceCommentMessageRecord{}, invalidRecordError("source_comment_messages", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.sourceCommentMessages[lineageScopedID(scope, id)]
	if !ok {
		return SourceCommentMessageRecord{}, notFoundError("source_comment_messages", id)
	}
	return record, nil
}

func (s *InMemoryStore) ListSourceCommentMessages(ctx context.Context, scope Scope, query SourceCommentMessageQuery) ([]SourceCommentMessageRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SourceCommentMessageRecord, 0)
	for _, record := range s.sourceCommentMessages {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if query.SourceCommentThreadID != "" && strings.TrimSpace(record.SourceCommentThreadID) != strings.TrimSpace(query.SourceCommentThreadID) {
			continue
		}
		if query.SourceRevisionID != "" && strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(query.SourceRevisionID) {
			continue
		}
		if query.ProviderMessageID != "" && strings.TrimSpace(record.ProviderMessageID) != strings.TrimSpace(query.ProviderMessageID) {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		leftAt := out[i].CreatedAt
		rightAt := out[j].CreatedAt
		if leftAt.Equal(rightAt) {
			return out[i].ID < out[j].ID
		}
		return leftAt.Before(rightAt)
	})
	return out, nil
}

func (s *InMemoryStore) DeleteSourceCommentMessages(ctx context.Context, scope Scope, query SourceCommentMessageQuery) error {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for scopedID, record := range s.sourceCommentMessages {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if query.SourceCommentThreadID != "" && strings.TrimSpace(record.SourceCommentThreadID) != strings.TrimSpace(query.SourceCommentThreadID) {
			continue
		}
		if query.SourceRevisionID != "" && strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(query.SourceRevisionID) {
			continue
		}
		if query.ProviderMessageID != "" && strings.TrimSpace(record.ProviderMessageID) != strings.TrimSpace(query.ProviderMessageID) {
			continue
		}
		delete(s.sourceCommentMessages, scopedID)
	}
	return nil
}

func (s *InMemoryStore) SaveSourceCommentMessage(ctx context.Context, scope Scope, record SourceCommentMessageRecord) (SourceCommentMessageRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceCommentMessageRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		return SourceCommentMessageRecord{}, invalidRecordError("source_comment_messages", "id", "required")
	}
	thread, err := s.GetSourceCommentThread(context.Background(), scope, record.SourceCommentThreadID)
	if err != nil {
		return SourceCommentMessageRecord{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	current, ok := s.sourceCommentMessages[scopedID]
	if !ok {
		return SourceCommentMessageRecord{}, notFoundError("source_comment_messages", record.ID)
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.SourceRevisionID = strings.TrimSpace(coalesceLineageString(record.SourceRevisionID, current.SourceRevisionID))
	record, err = PrepareSourceCommentMessageRecord(record, &current)
	if err != nil {
		return SourceCommentMessageRecord{}, err
	}
	if strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(thread.SourceRevisionID) {
		return SourceCommentMessageRecord{}, invalidRecordError("source_comment_messages", "source_revision_id", "must belong to source_comment_thread_id")
	}
	s.sourceCommentMessages[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) CreateSourceCommentSyncState(ctx context.Context, scope Scope, record SourceCommentSyncStateRecord) (SourceCommentSyncStateRecord, error) {
	return createLineageRecordWithScopeValidation(s, ctx, scope, record, "source_comment_sync_states", s.sourceCommentSyncStates, s.ensureSourceCommentSyncStateRecord, PrepareSourceCommentSyncStateRecord, sourceCommentSyncStateRecordID, setSourceCommentSyncStateRecordID, scopeSourceCommentSyncStateRecord, nil)
}

func (s *InMemoryStore) GetSourceCommentSyncState(ctx context.Context, scope Scope, id string) (SourceCommentSyncStateRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceCommentSyncStateRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return SourceCommentSyncStateRecord{}, invalidRecordError("source_comment_sync_states", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.sourceCommentSyncStates[lineageScopedID(scope, id)]
	if !ok {
		return SourceCommentSyncStateRecord{}, notFoundError("source_comment_sync_states", id)
	}
	return record, nil
}

func (s *InMemoryStore) ListSourceCommentSyncStates(ctx context.Context, scope Scope, query SourceCommentSyncStateQuery) ([]SourceCommentSyncStateRecord, error) {
	return listLineageQueryRecords(s, ctx, scope, query, s.sourceCommentSyncStates, includeSourceCommentSyncStateRecord, sourceCommentSyncStateRecordLess)
}

func (s *InMemoryStore) SaveSourceCommentSyncState(ctx context.Context, scope Scope, record SourceCommentSyncStateRecord) (SourceCommentSyncStateRecord, error) {
	return saveLineageRecordWithScopeValidation(s, ctx, scope, record, "source_comment_sync_states", s.sourceCommentSyncStates, s.ensureSourceCommentSyncStateRecord, PrepareSourceCommentSyncStateRecord, sourceCommentSyncStateRecordID, setSourceCommentSyncStateRecordID, scopeSourceCommentSyncStateRecord, nil)
}

func (s *InMemoryStore) CreateSourceSearchDocument(ctx context.Context, scope Scope, record SourceSearchDocumentRecord) (SourceSearchDocumentRecord, error) {
	return createLineageRecordWithScopeValidation(s, ctx, scope, record, "source_search_documents", s.sourceSearchDocuments, s.ensureSourceSearchDocumentRecord, PrepareSourceSearchDocumentRecord, sourceSearchDocumentRecordID, setSourceSearchDocumentRecordID, scopeSourceSearchDocumentRecord, nil)
}

func (s *InMemoryStore) GetSourceSearchDocument(ctx context.Context, scope Scope, id string) (SourceSearchDocumentRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceSearchDocumentRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return SourceSearchDocumentRecord{}, invalidRecordError("source_search_documents", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.sourceSearchDocuments[lineageScopedID(scope, id)]
	if !ok {
		return SourceSearchDocumentRecord{}, notFoundError("source_search_documents", id)
	}
	return record, nil
}

func (s *InMemoryStore) ListSourceSearchDocuments(ctx context.Context, scope Scope, query SourceSearchDocumentQuery) ([]SourceSearchDocumentRecord, error) {
	return listLineageQueryRecords(s, ctx, scope, query, s.sourceSearchDocuments, includeSourceSearchDocumentRecord, sourceSearchDocumentRecordLess)
}

func (s *InMemoryStore) SaveSourceSearchDocument(ctx context.Context, scope Scope, record SourceSearchDocumentRecord) (SourceSearchDocumentRecord, error) {
	return saveLineageRecordWithScopeValidation(s, ctx, scope, record, "source_search_documents", s.sourceSearchDocuments, s.ensureSourceSearchDocumentRecord, PrepareSourceSearchDocumentRecord, sourceSearchDocumentRecordID, setSourceSearchDocumentRecordID, scopeSourceSearchDocumentRecord, nil)
}

func (s *InMemoryStore) DeleteSourceSearchDocuments(ctx context.Context, scope Scope, query SourceSearchDocumentQuery) error {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for scopedID, record := range s.sourceSearchDocuments {
		if !includeSourceSearchDocumentRecord(record, scope, query) {
			continue
		}
		delete(s.sourceSearchDocuments, scopedID)
	}
	return nil
}

func (s *InMemoryStore) ensureSourceRevisionForDocument(scope Scope, sourceDocumentID, sourceRevisionID string) error {
	document, err := s.GetSourceDocument(context.Background(), scope, sourceDocumentID)
	if err != nil {
		return err
	}
	revision, err := s.GetSourceRevision(context.Background(), scope, sourceRevisionID)
	if err != nil {
		return err
	}
	if strings.TrimSpace(revision.SourceDocumentID) != strings.TrimSpace(document.ID) {
		return invalidRecordError("source_revisions", "source_document_id", "must match source_revision_id")
	}
	return nil
}

func (s *InMemoryStore) ensureSourceSearchDocumentScope(scope Scope, record SourceSearchDocumentRecord) error {
	if _, err := s.GetSourceDocument(context.Background(), scope, record.SourceDocumentID); err != nil {
		return err
	}
	if strings.TrimSpace(record.ResultKind) == SourceSearchResultKindSourceRevision || strings.TrimSpace(record.SourceRevisionID) != "" {
		if err := s.ensureSourceRevisionForDocument(scope, record.SourceDocumentID, record.SourceRevisionID); err != nil {
			return err
		}
	}
	return nil
}
