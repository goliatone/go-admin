package stores

import (
	"context"
	"sort"
	"strings"

	"github.com/google/uuid"
)

func (s *InMemoryStore) CreateSourceCommentThread(ctx context.Context, scope Scope, record SourceCommentThreadRecord) (SourceCommentThreadRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceCommentThreadRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	err = s.ensureSourceRevisionForDocument(scope, record.SourceDocumentID, record.SourceRevisionID)
	if err != nil {
		return SourceCommentThreadRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceCommentThreadRecord(record, nil)
	if err != nil {
		return SourceCommentThreadRecord{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	if _, exists := s.sourceCommentThreads[scopedID]; exists {
		return SourceCommentThreadRecord{}, invalidRecordError("source_comment_threads", "id", "already exists")
	}
	s.sourceCommentThreads[scopedID] = record
	return record, nil
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
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SourceCommentThreadRecord, 0)
	for _, record := range s.sourceCommentThreads {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if query.SourceDocumentID != "" && strings.TrimSpace(record.SourceDocumentID) != strings.TrimSpace(query.SourceDocumentID) {
			continue
		}
		if query.SourceRevisionID != "" && strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(query.SourceRevisionID) {
			continue
		}
		if query.ThreadID != "" && strings.TrimSpace(record.ThreadID) != strings.TrimSpace(query.ThreadID) {
			continue
		}
		if query.ProviderKind != "" && strings.TrimSpace(record.ProviderKind) != strings.TrimSpace(query.ProviderKind) {
			continue
		}
		if query.SyncStatus != "" && strings.TrimSpace(record.SyncStatus) != strings.TrimSpace(query.SyncStatus) {
			continue
		}
		if query.Status != "" && strings.TrimSpace(record.Status) != strings.TrimSpace(query.Status) {
			continue
		}
		if query.Status == "" && !query.IncludeDeleted && strings.EqualFold(strings.TrimSpace(record.Status), SourceCommentThreadStatusDeleted) {
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

func (s *InMemoryStore) SaveSourceCommentThread(ctx context.Context, scope Scope, record SourceCommentThreadRecord) (SourceCommentThreadRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceCommentThreadRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		return SourceCommentThreadRecord{}, invalidRecordError("source_comment_threads", "id", "required")
	}
	err = s.ensureSourceRevisionForDocument(scope, record.SourceDocumentID, record.SourceRevisionID)
	if err != nil {
		return SourceCommentThreadRecord{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	current, ok := s.sourceCommentThreads[scopedID]
	if !ok {
		return SourceCommentThreadRecord{}, notFoundError("source_comment_threads", record.ID)
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceCommentThreadRecord(record, &current)
	if err != nil {
		return SourceCommentThreadRecord{}, err
	}
	s.sourceCommentThreads[scopedID] = record
	return record, nil
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
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceCommentSyncStateRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	err = s.ensureSourceRevisionForDocument(scope, record.SourceDocumentID, record.SourceRevisionID)
	if err != nil {
		return SourceCommentSyncStateRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceCommentSyncStateRecord(record, nil)
	if err != nil {
		return SourceCommentSyncStateRecord{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	if _, exists := s.sourceCommentSyncStates[scopedID]; exists {
		return SourceCommentSyncStateRecord{}, invalidRecordError("source_comment_sync_states", "id", "already exists")
	}
	s.sourceCommentSyncStates[scopedID] = record
	return record, nil
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
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SourceCommentSyncStateRecord, 0)
	for _, record := range s.sourceCommentSyncStates {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if query.SourceDocumentID != "" && strings.TrimSpace(record.SourceDocumentID) != strings.TrimSpace(query.SourceDocumentID) {
			continue
		}
		if query.SourceRevisionID != "" && strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(query.SourceRevisionID) {
			continue
		}
		if query.ProviderKind != "" && strings.TrimSpace(record.ProviderKind) != strings.TrimSpace(query.ProviderKind) {
			continue
		}
		if query.SyncStatus != "" && strings.TrimSpace(record.SyncStatus) != strings.TrimSpace(query.SyncStatus) {
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

func (s *InMemoryStore) SaveSourceCommentSyncState(ctx context.Context, scope Scope, record SourceCommentSyncStateRecord) (SourceCommentSyncStateRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceCommentSyncStateRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		return SourceCommentSyncStateRecord{}, invalidRecordError("source_comment_sync_states", "id", "required")
	}
	err = s.ensureSourceRevisionForDocument(scope, record.SourceDocumentID, record.SourceRevisionID)
	if err != nil {
		return SourceCommentSyncStateRecord{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	current, ok := s.sourceCommentSyncStates[scopedID]
	if !ok {
		return SourceCommentSyncStateRecord{}, notFoundError("source_comment_sync_states", record.ID)
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceCommentSyncStateRecord(record, &current)
	if err != nil {
		return SourceCommentSyncStateRecord{}, err
	}
	s.sourceCommentSyncStates[scopedID] = record
	return record, nil
}

func (s *InMemoryStore) CreateSourceSearchDocument(ctx context.Context, scope Scope, record SourceSearchDocumentRecord) (SourceSearchDocumentRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceSearchDocumentRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	err = s.ensureSourceSearchDocumentScope(scope, record)
	if err != nil {
		return SourceSearchDocumentRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceSearchDocumentRecord(record, nil)
	if err != nil {
		return SourceSearchDocumentRecord{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	if _, exists := s.sourceSearchDocuments[scopedID]; exists {
		return SourceSearchDocumentRecord{}, invalidRecordError("source_search_documents", "id", "already exists")
	}
	s.sourceSearchDocuments[scopedID] = record
	return record, nil
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
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SourceSearchDocumentRecord, 0)
	for _, record := range s.sourceSearchDocuments {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if query.SourceDocumentID != "" && strings.TrimSpace(record.SourceDocumentID) != strings.TrimSpace(query.SourceDocumentID) {
			continue
		}
		if query.SourceRevisionID != "" && strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(query.SourceRevisionID) {
			continue
		}
		if query.ResultKind != "" && strings.TrimSpace(record.ResultKind) != strings.TrimSpace(query.ResultKind) {
			continue
		}
		if query.ProviderKind != "" && strings.TrimSpace(record.ProviderKind) != strings.TrimSpace(query.ProviderKind) {
			continue
		}
		if query.RelationshipState != "" && strings.TrimSpace(record.RelationshipState) != strings.TrimSpace(query.RelationshipState) {
			continue
		}
		if query.CommentSyncStatus != "" && strings.TrimSpace(record.CommentSyncStatus) != strings.TrimSpace(query.CommentSyncStatus) {
			continue
		}
		if query.CanonicalTitle != "" && strings.TrimSpace(record.CanonicalTitle) != strings.TrimSpace(query.CanonicalTitle) {
			continue
		}
		if query.HasComments != nil && record.HasComments != *query.HasComments {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		leftAt := out[i].IndexedAt
		rightAt := out[j].IndexedAt
		if leftAt.Equal(rightAt) {
			return out[i].ID < out[j].ID
		}
		return leftAt.Before(rightAt)
	})
	return out, nil
}

func (s *InMemoryStore) SaveSourceSearchDocument(ctx context.Context, scope Scope, record SourceSearchDocumentRecord) (SourceSearchDocumentRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return SourceSearchDocumentRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		return SourceSearchDocumentRecord{}, invalidRecordError("source_search_documents", "id", "required")
	}
	err = s.ensureSourceSearchDocumentScope(scope, record)
	if err != nil {
		return SourceSearchDocumentRecord{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	scopedID := lineageScopedID(scope, record.ID)
	current, ok := s.sourceSearchDocuments[scopedID]
	if !ok {
		return SourceSearchDocumentRecord{}, notFoundError("source_search_documents", record.ID)
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = PrepareSourceSearchDocumentRecord(record, &current)
	if err != nil {
		return SourceSearchDocumentRecord{}, err
	}
	s.sourceSearchDocuments[scopedID] = record
	return record, nil
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
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if query.SourceDocumentID != "" && strings.TrimSpace(record.SourceDocumentID) != strings.TrimSpace(query.SourceDocumentID) {
			continue
		}
		if query.SourceRevisionID != "" && strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(query.SourceRevisionID) {
			continue
		}
		if query.ResultKind != "" && strings.TrimSpace(record.ResultKind) != strings.TrimSpace(query.ResultKind) {
			continue
		}
		if query.ProviderKind != "" && strings.TrimSpace(record.ProviderKind) != strings.TrimSpace(query.ProviderKind) {
			continue
		}
		if query.RelationshipState != "" && strings.TrimSpace(record.RelationshipState) != strings.TrimSpace(query.RelationshipState) {
			continue
		}
		if query.CommentSyncStatus != "" && strings.TrimSpace(record.CommentSyncStatus) != strings.TrimSpace(query.CommentSyncStatus) {
			continue
		}
		if query.CanonicalTitle != "" && strings.TrimSpace(record.CanonicalTitle) != strings.TrimSpace(query.CanonicalTitle) {
			continue
		}
		if query.HasComments != nil && record.HasComments != *query.HasComments {
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
