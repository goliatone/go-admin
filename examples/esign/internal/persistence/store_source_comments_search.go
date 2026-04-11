package persistence

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

func loadSourceCommentThreadRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceCommentThreadRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceCommentThreadRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return stores.SourceCommentThreadRecord{}, relationalInvalidRecordError("source_comment_threads", "id", "required")
	}
	record := stores.SourceCommentThreadRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.SourceCommentThreadRecord{}, mapSQLNotFound(err, "source_comment_threads", id)
	}
	return record, nil
}

func listSourceCommentThreadRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceCommentThreadQuery) ([]stores.SourceCommentThreadRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	records := make([]stores.SourceCommentThreadRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if query.SourceDocumentID != "" {
		sel = sel.Where("source_document_id = ?", strings.TrimSpace(query.SourceDocumentID))
	}
	if query.SourceRevisionID != "" {
		sel = sel.Where("source_revision_id = ?", strings.TrimSpace(query.SourceRevisionID))
	}
	if query.ThreadID != "" {
		sel = sel.Where("thread_id = ?", strings.TrimSpace(query.ThreadID))
	}
	if query.ProviderKind != "" {
		sel = sel.Where("provider_kind = ?", strings.TrimSpace(query.ProviderKind))
	}
	if query.SyncStatus != "" {
		sel = sel.Where("sync_status = ?", strings.TrimSpace(query.SyncStatus))
	}
	if query.Status != "" {
		sel = sel.Where("status = ?", strings.TrimSpace(query.Status))
	} else if !query.IncludeDeleted {
		sel = sel.Where("status <> ?", stores.SourceCommentThreadStatusDeleted)
	}
	sel = sel.OrderExpr("updated_at ASC, id ASC")
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func loadSourceCommentMessageRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceCommentMessageRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceCommentMessageRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return stores.SourceCommentMessageRecord{}, relationalInvalidRecordError("source_comment_messages", "id", "required")
	}
	record := stores.SourceCommentMessageRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.SourceCommentMessageRecord{}, mapSQLNotFound(err, "source_comment_messages", id)
	}
	return record, nil
}

func listSourceCommentMessageRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceCommentMessageQuery) ([]stores.SourceCommentMessageRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	records := make([]stores.SourceCommentMessageRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if query.SourceCommentThreadID != "" {
		sel = sel.Where("source_comment_thread_id = ?", strings.TrimSpace(query.SourceCommentThreadID))
	}
	if query.SourceRevisionID != "" {
		sel = sel.Where("source_revision_id = ?", strings.TrimSpace(query.SourceRevisionID))
	}
	if query.ProviderMessageID != "" {
		sel = sel.Where("provider_message_id = ?", strings.TrimSpace(query.ProviderMessageID))
	}
	sel = sel.OrderExpr("created_at ASC, id ASC")
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func loadSourceCommentSyncStateRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceCommentSyncStateRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceCommentSyncStateRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return stores.SourceCommentSyncStateRecord{}, relationalInvalidRecordError("source_comment_sync_states", "id", "required")
	}
	record := stores.SourceCommentSyncStateRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.SourceCommentSyncStateRecord{}, mapSQLNotFound(err, "source_comment_sync_states", id)
	}
	return record, nil
}

func listSourceCommentSyncStateRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceCommentSyncStateQuery) ([]stores.SourceCommentSyncStateRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	records := make([]stores.SourceCommentSyncStateRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if query.SourceDocumentID != "" {
		sel = sel.Where("source_document_id = ?", strings.TrimSpace(query.SourceDocumentID))
	}
	if query.SourceRevisionID != "" {
		sel = sel.Where("source_revision_id = ?", strings.TrimSpace(query.SourceRevisionID))
	}
	if query.ProviderKind != "" {
		sel = sel.Where("provider_kind = ?", strings.TrimSpace(query.ProviderKind))
	}
	if query.SyncStatus != "" {
		sel = sel.Where("sync_status = ?", strings.TrimSpace(query.SyncStatus))
	}
	sel = sel.OrderExpr("updated_at ASC, id ASC")
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func loadSourceSearchDocumentRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceSearchDocumentRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceSearchDocumentRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return stores.SourceSearchDocumentRecord{}, relationalInvalidRecordError("source_search_documents", "id", "required")
	}
	record := stores.SourceSearchDocumentRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.SourceSearchDocumentRecord{}, mapSQLNotFound(err, "source_search_documents", id)
	}
	return record, nil
}

func listSourceSearchDocumentRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceSearchDocumentQuery) ([]stores.SourceSearchDocumentRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	records := make([]stores.SourceSearchDocumentRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if query.SourceDocumentID != "" {
		sel = sel.Where("source_document_id = ?", strings.TrimSpace(query.SourceDocumentID))
	}
	if query.SourceRevisionID != "" {
		sel = sel.Where("source_revision_id = ?", strings.TrimSpace(query.SourceRevisionID))
	}
	if query.ResultKind != "" {
		sel = sel.Where("result_kind = ?", strings.TrimSpace(query.ResultKind))
	}
	if query.ProviderKind != "" {
		sel = sel.Where("provider_kind = ?", strings.TrimSpace(query.ProviderKind))
	}
	if query.RelationshipState != "" {
		sel = sel.Where("relationship_state = ?", strings.TrimSpace(query.RelationshipState))
	}
	if query.CommentSyncStatus != "" {
		sel = sel.Where("comment_sync_status = ?", strings.TrimSpace(query.CommentSyncStatus))
	}
	if query.CanonicalTitle != "" {
		sel = sel.Where("LOWER(canonical_title) = LOWER(?)", strings.TrimSpace(query.CanonicalTitle))
	}
	if query.HasComments != nil {
		sel = sel.Where("has_comments = ?", *query.HasComments)
	}
	sel = sel.OrderExpr("updated_at ASC, id ASC")
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func (s *StoreAdapter) CreateSourceCommentThread(ctx context.Context, scope stores.Scope, record stores.SourceCommentThreadRecord) (stores.SourceCommentThreadRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceCommentThreadRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceCommentThreadRecord{}, err
		}
		return lineage.CreateSourceCommentThread(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetSourceCommentThread(ctx context.Context, scope stores.Scope, id string) (stores.SourceCommentThreadRecord, error) {
	return loadSourceCommentThreadRecord(ctx, idbOrDB(nil, s.bunDB), scope, id)
}

func (s *StoreAdapter) ListSourceCommentThreads(ctx context.Context, scope stores.Scope, query stores.SourceCommentThreadQuery) ([]stores.SourceCommentThreadRecord, error) {
	return listSourceCommentThreadRecords(ctx, idbOrDB(nil, s.bunDB), scope, query)
}

func (s *StoreAdapter) SaveSourceCommentThread(ctx context.Context, scope stores.Scope, record stores.SourceCommentThreadRecord) (stores.SourceCommentThreadRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceCommentThreadRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceCommentThreadRecord{}, err
		}
		return lineage.SaveSourceCommentThread(ctx, scope, record)
	})
}

func (s *StoreAdapter) CreateSourceCommentMessage(ctx context.Context, scope stores.Scope, record stores.SourceCommentMessageRecord) (stores.SourceCommentMessageRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceCommentMessageRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceCommentMessageRecord{}, err
		}
		return lineage.CreateSourceCommentMessage(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetSourceCommentMessage(ctx context.Context, scope stores.Scope, id string) (stores.SourceCommentMessageRecord, error) {
	return loadSourceCommentMessageRecord(ctx, idbOrDB(nil, s.bunDB), scope, id)
}

func (s *StoreAdapter) ListSourceCommentMessages(ctx context.Context, scope stores.Scope, query stores.SourceCommentMessageQuery) ([]stores.SourceCommentMessageRecord, error) {
	return listSourceCommentMessageRecords(ctx, idbOrDB(nil, s.bunDB), scope, query)
}

func (s *StoreAdapter) SaveSourceCommentMessage(ctx context.Context, scope stores.Scope, record stores.SourceCommentMessageRecord) (stores.SourceCommentMessageRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceCommentMessageRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceCommentMessageRecord{}, err
		}
		return lineage.SaveSourceCommentMessage(ctx, scope, record)
	})
}

func (s *StoreAdapter) DeleteSourceCommentMessages(ctx context.Context, scope stores.Scope, query stores.SourceCommentMessageQuery) error {
	return s.WithTx(ctx, func(tx stores.TxStore) error {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return err
		}
		return lineage.DeleteSourceCommentMessages(ctx, scope, query)
	})
}

func (s *StoreAdapter) CreateSourceCommentSyncState(ctx context.Context, scope stores.Scope, record stores.SourceCommentSyncStateRecord) (stores.SourceCommentSyncStateRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceCommentSyncStateRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceCommentSyncStateRecord{}, err
		}
		return lineage.CreateSourceCommentSyncState(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetSourceCommentSyncState(ctx context.Context, scope stores.Scope, id string) (stores.SourceCommentSyncStateRecord, error) {
	return loadSourceCommentSyncStateRecord(ctx, idbOrDB(nil, s.bunDB), scope, id)
}

func (s *StoreAdapter) ListSourceCommentSyncStates(ctx context.Context, scope stores.Scope, query stores.SourceCommentSyncStateQuery) ([]stores.SourceCommentSyncStateRecord, error) {
	return listSourceCommentSyncStateRecords(ctx, idbOrDB(nil, s.bunDB), scope, query)
}

func (s *StoreAdapter) SaveSourceCommentSyncState(ctx context.Context, scope stores.Scope, record stores.SourceCommentSyncStateRecord) (stores.SourceCommentSyncStateRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceCommentSyncStateRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceCommentSyncStateRecord{}, err
		}
		return lineage.SaveSourceCommentSyncState(ctx, scope, record)
	})
}

func (s *StoreAdapter) CreateSourceSearchDocument(ctx context.Context, scope stores.Scope, record stores.SourceSearchDocumentRecord) (stores.SourceSearchDocumentRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceSearchDocumentRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceSearchDocumentRecord{}, err
		}
		return lineage.CreateSourceSearchDocument(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetSourceSearchDocument(ctx context.Context, scope stores.Scope, id string) (stores.SourceSearchDocumentRecord, error) {
	return loadSourceSearchDocumentRecord(ctx, idbOrDB(nil, s.bunDB), scope, id)
}

func (s *StoreAdapter) ListSourceSearchDocuments(ctx context.Context, scope stores.Scope, query stores.SourceSearchDocumentQuery) ([]stores.SourceSearchDocumentRecord, error) {
	return listSourceSearchDocumentRecords(ctx, idbOrDB(nil, s.bunDB), scope, query)
}

func (s *StoreAdapter) SaveSourceSearchDocument(ctx context.Context, scope stores.Scope, record stores.SourceSearchDocumentRecord) (stores.SourceSearchDocumentRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceSearchDocumentRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceSearchDocumentRecord{}, err
		}
		return lineage.SaveSourceSearchDocument(ctx, scope, record)
	})
}

func (s *StoreAdapter) DeleteSourceSearchDocuments(ctx context.Context, scope stores.Scope, query stores.SourceSearchDocumentQuery) error {
	return s.WithTx(ctx, func(tx stores.TxStore) error {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return err
		}
		return lineage.DeleteSourceSearchDocuments(ctx, scope, query)
	})
}

func (s *relationalTxStore) CreateSourceCommentThread(ctx context.Context, scope stores.Scope, record stores.SourceCommentThreadRecord) (stores.SourceCommentThreadRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceCommentThreadRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceCommentThreadRecord(record, nil)
	if err != nil {
		return stores.SourceCommentThreadRecord{}, err
	}
	revision, err := loadSourceRevisionRecord(ctx, s.tx, scope, record.SourceRevisionID)
	if err != nil {
		return stores.SourceCommentThreadRecord{}, err
	}
	if strings.TrimSpace(revision.SourceDocumentID) != strings.TrimSpace(record.SourceDocumentID) {
		return stores.SourceCommentThreadRecord{}, relationalInvalidRecordError("source_comment_threads", "source_revision_id", "must belong to source_document_id")
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SourceCommentThreadRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) GetSourceCommentThread(ctx context.Context, scope stores.Scope, id string) (stores.SourceCommentThreadRecord, error) {
	return loadSourceCommentThreadRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListSourceCommentThreads(ctx context.Context, scope stores.Scope, query stores.SourceCommentThreadQuery) ([]stores.SourceCommentThreadRecord, error) {
	return listSourceCommentThreadRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) SaveSourceCommentThread(ctx context.Context, scope stores.Scope, record stores.SourceCommentThreadRecord) (stores.SourceCommentThreadRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceCommentThreadRecord{}, err
	}
	current, err := loadSourceCommentThreadRecord(ctx, s.tx, scope, record.ID)
	if err != nil {
		return stores.SourceCommentThreadRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceCommentThreadRecord(record, &current)
	if err != nil {
		return stores.SourceCommentThreadRecord{}, err
	}
	if _, err := s.tx.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Exec(ctx); err != nil {
		return stores.SourceCommentThreadRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) CreateSourceCommentMessage(ctx context.Context, scope stores.Scope, record stores.SourceCommentMessageRecord) (stores.SourceCommentMessageRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceCommentMessageRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	thread, err := loadSourceCommentThreadRecord(ctx, s.tx, scope, record.SourceCommentThreadID)
	if err != nil {
		return stores.SourceCommentMessageRecord{}, err
	}
	if strings.TrimSpace(record.SourceRevisionID) == "" {
		record.SourceRevisionID = thread.SourceRevisionID
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceCommentMessageRecord(record, nil)
	if err != nil {
		return stores.SourceCommentMessageRecord{}, err
	}
	if strings.TrimSpace(record.SourceRevisionID) != strings.TrimSpace(thread.SourceRevisionID) {
		return stores.SourceCommentMessageRecord{}, relationalInvalidRecordError("source_comment_messages", "source_revision_id", "must belong to source_comment_thread_id")
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SourceCommentMessageRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) GetSourceCommentMessage(ctx context.Context, scope stores.Scope, id string) (stores.SourceCommentMessageRecord, error) {
	return loadSourceCommentMessageRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListSourceCommentMessages(ctx context.Context, scope stores.Scope, query stores.SourceCommentMessageQuery) ([]stores.SourceCommentMessageRecord, error) {
	return listSourceCommentMessageRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) SaveSourceCommentMessage(ctx context.Context, scope stores.Scope, record stores.SourceCommentMessageRecord) (stores.SourceCommentMessageRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceCommentMessageRecord{}, err
	}
	current, err := loadSourceCommentMessageRecord(ctx, s.tx, scope, record.ID)
	if err != nil {
		return stores.SourceCommentMessageRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceCommentMessageRecord(record, &current)
	if err != nil {
		return stores.SourceCommentMessageRecord{}, err
	}
	if _, err := s.tx.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Exec(ctx); err != nil {
		return stores.SourceCommentMessageRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) DeleteSourceCommentMessages(ctx context.Context, scope stores.Scope, query stores.SourceCommentMessageQuery) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	del := s.tx.NewDelete().
		Model((*stores.SourceCommentMessageRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if query.SourceCommentThreadID != "" {
		del = del.Where("source_comment_thread_id = ?", strings.TrimSpace(query.SourceCommentThreadID))
	}
	if query.SourceRevisionID != "" {
		del = del.Where("source_revision_id = ?", strings.TrimSpace(query.SourceRevisionID))
	}
	if query.ProviderMessageID != "" {
		del = del.Where("provider_message_id = ?", strings.TrimSpace(query.ProviderMessageID))
	}
	_, err = del.Exec(ctx)
	return err
}

func (s *relationalTxStore) CreateSourceCommentSyncState(ctx context.Context, scope stores.Scope, record stores.SourceCommentSyncStateRecord) (stores.SourceCommentSyncStateRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceCommentSyncStateRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceCommentSyncStateRecord(record, nil)
	if err != nil {
		return stores.SourceCommentSyncStateRecord{}, err
	}
	revision, err := loadSourceRevisionRecord(ctx, s.tx, scope, record.SourceRevisionID)
	if err != nil {
		return stores.SourceCommentSyncStateRecord{}, err
	}
	if strings.TrimSpace(revision.SourceDocumentID) != strings.TrimSpace(record.SourceDocumentID) {
		return stores.SourceCommentSyncStateRecord{}, relationalInvalidRecordError("source_comment_sync_states", "source_revision_id", "must belong to source_document_id")
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SourceCommentSyncStateRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) GetSourceCommentSyncState(ctx context.Context, scope stores.Scope, id string) (stores.SourceCommentSyncStateRecord, error) {
	return loadSourceCommentSyncStateRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListSourceCommentSyncStates(ctx context.Context, scope stores.Scope, query stores.SourceCommentSyncStateQuery) ([]stores.SourceCommentSyncStateRecord, error) {
	return listSourceCommentSyncStateRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) SaveSourceCommentSyncState(ctx context.Context, scope stores.Scope, record stores.SourceCommentSyncStateRecord) (stores.SourceCommentSyncStateRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceCommentSyncStateRecord{}, err
	}
	current, err := loadSourceCommentSyncStateRecord(ctx, s.tx, scope, record.ID)
	if err != nil {
		return stores.SourceCommentSyncStateRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceCommentSyncStateRecord(record, &current)
	if err != nil {
		return stores.SourceCommentSyncStateRecord{}, err
	}
	if _, err := s.tx.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Exec(ctx); err != nil {
		return stores.SourceCommentSyncStateRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) CreateSourceSearchDocument(ctx context.Context, scope stores.Scope, record stores.SourceSearchDocumentRecord) (stores.SourceSearchDocumentRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceSearchDocumentRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceSearchDocumentRecord(record, nil)
	if err != nil {
		return stores.SourceSearchDocumentRecord{}, err
	}
	if _, err := loadSourceDocumentRecord(ctx, s.tx, scope, record.SourceDocumentID); err != nil {
		return stores.SourceSearchDocumentRecord{}, err
	}
	if record.ResultKind == stores.SourceSearchResultKindSourceRevision {
		if _, err := loadSourceRevisionRecord(ctx, s.tx, scope, record.SourceRevisionID); err != nil {
			return stores.SourceSearchDocumentRecord{}, err
		}
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SourceSearchDocumentRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) GetSourceSearchDocument(ctx context.Context, scope stores.Scope, id string) (stores.SourceSearchDocumentRecord, error) {
	return loadSourceSearchDocumentRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListSourceSearchDocuments(ctx context.Context, scope stores.Scope, query stores.SourceSearchDocumentQuery) ([]stores.SourceSearchDocumentRecord, error) {
	return listSourceSearchDocumentRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) SaveSourceSearchDocument(ctx context.Context, scope stores.Scope, record stores.SourceSearchDocumentRecord) (stores.SourceSearchDocumentRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceSearchDocumentRecord{}, err
	}
	current, err := loadSourceSearchDocumentRecord(ctx, s.tx, scope, record.ID)
	if err != nil {
		return stores.SourceSearchDocumentRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceSearchDocumentRecord(record, &current)
	if err != nil {
		return stores.SourceSearchDocumentRecord{}, err
	}
	if _, err := s.tx.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Exec(ctx); err != nil {
		return stores.SourceSearchDocumentRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) DeleteSourceSearchDocuments(ctx context.Context, scope stores.Scope, query stores.SourceSearchDocumentQuery) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	del := s.tx.NewDelete().
		Model((*stores.SourceSearchDocumentRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if query.SourceDocumentID != "" {
		del = del.Where("source_document_id = ?", strings.TrimSpace(query.SourceDocumentID))
	}
	if query.SourceRevisionID != "" {
		del = del.Where("source_revision_id = ?", strings.TrimSpace(query.SourceRevisionID))
	}
	if query.ResultKind != "" {
		del = del.Where("result_kind = ?", strings.TrimSpace(query.ResultKind))
	}
	_, err = del.Exec(ctx)
	return err
}
