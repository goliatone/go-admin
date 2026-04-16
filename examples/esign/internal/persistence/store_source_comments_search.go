package persistence

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

func loadSourceCommentThreadRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceCommentThreadRecord, error) {
	return relationalLoadRecord[stores.SourceCommentThreadRecord](ctx, idb, scope, "source_comment_threads", "id", id)
}

func listSourceCommentThreadRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceCommentThreadQuery) ([]stores.SourceCommentThreadRecord, error) {
	return relationalListRecords[stores.SourceCommentThreadRecord](ctx, idb, scope, "updated_at ASC, id ASC", func(sel *bun.SelectQuery) *bun.SelectQuery {
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
		return sel
	})
}

func loadSourceCommentMessageRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceCommentMessageRecord, error) {
	return relationalLoadRecord[stores.SourceCommentMessageRecord](ctx, idb, scope, "source_comment_messages", "id", id)
}

func listSourceCommentMessageRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceCommentMessageQuery) ([]stores.SourceCommentMessageRecord, error) {
	return relationalListRecords[stores.SourceCommentMessageRecord](ctx, idb, scope, "created_at ASC, id ASC", func(sel *bun.SelectQuery) *bun.SelectQuery {
		if query.SourceCommentThreadID != "" {
			sel = sel.Where("source_comment_thread_id = ?", strings.TrimSpace(query.SourceCommentThreadID))
		}
		if query.SourceRevisionID != "" {
			sel = sel.Where("source_revision_id = ?", strings.TrimSpace(query.SourceRevisionID))
		}
		if query.ProviderMessageID != "" {
			sel = sel.Where("provider_message_id = ?", strings.TrimSpace(query.ProviderMessageID))
		}
		return sel
	})
}

func loadSourceCommentSyncStateRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceCommentSyncStateRecord, error) {
	return relationalLoadRecord[stores.SourceCommentSyncStateRecord](ctx, idb, scope, "source_comment_sync_states", "id", id)
}

func listSourceCommentSyncStateRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceCommentSyncStateQuery) ([]stores.SourceCommentSyncStateRecord, error) {
	return relationalListRecords[stores.SourceCommentSyncStateRecord](ctx, idb, scope, "updated_at ASC, id ASC", func(sel *bun.SelectQuery) *bun.SelectQuery {
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
		return sel
	})
}

func loadSourceSearchDocumentRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceSearchDocumentRecord, error) {
	return relationalLoadRecord[stores.SourceSearchDocumentRecord](ctx, idb, scope, "source_search_documents", "id", id)
}

func listSourceSearchDocumentRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceSearchDocumentQuery) ([]stores.SourceSearchDocumentRecord, error) {
	return relationalListRecords[stores.SourceSearchDocumentRecord](ctx, idb, scope, "updated_at ASC, id ASC", func(sel *bun.SelectQuery) *bun.SelectQuery {
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
		return sel
	})
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

func createScopedSourceCommentRecord[T any](
	ctx context.Context,
	idb bun.IDB,
	scope stores.Scope,
	record T,
	initialize func(stores.Scope, T) T,
	prepare func(T, *T) (T, error),
	validate func(context.Context, bun.IDB, stores.Scope, T) error,
) (T, error) {
	return relationalCreatePreparedRecord(
		ctx,
		idb,
		scope,
		record,
		func(_ context.Context, _ bun.IDB, scope stores.Scope, record T) (T, error) {
			return initialize(scope, record), nil
		},
		prepare,
		validate,
	)
}

func initializeSourceCommentThreadRecord(scope stores.Scope, record stores.SourceCommentThreadRecord) stores.SourceCommentThreadRecord {
	record.ID, record.TenantID, record.OrgID = relationalInitializeScopedID(record.ID, scope)
	return record
}

func validateCreateSourceCommentThreadRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, record stores.SourceCommentThreadRecord) error {
	revision, err := loadSourceRevisionRecord(ctx, idb, scope, record.SourceRevisionID)
	if err != nil {
		return err
	}
	if strings.TrimSpace(revision.SourceDocumentID) != strings.TrimSpace(record.SourceDocumentID) {
		return relationalInvalidRecordError("source_comment_threads", "source_revision_id", "must belong to source_document_id")
	}
	return nil
}

func initializeSourceCommentSyncStateRecord(scope stores.Scope, record stores.SourceCommentSyncStateRecord) stores.SourceCommentSyncStateRecord {
	record.ID, record.TenantID, record.OrgID = relationalInitializeScopedID(record.ID, scope)
	return record
}

func validateCreateSourceCommentSyncStateRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, record stores.SourceCommentSyncStateRecord) error {
	revision, err := loadSourceRevisionRecord(ctx, idb, scope, record.SourceRevisionID)
	if err != nil {
		return err
	}
	if strings.TrimSpace(revision.SourceDocumentID) != strings.TrimSpace(record.SourceDocumentID) {
		return relationalInvalidRecordError("source_comment_sync_states", "source_revision_id", "must belong to source_document_id")
	}
	return nil
}

func (s *relationalTxStore) CreateSourceCommentThread(ctx context.Context, scope stores.Scope, record stores.SourceCommentThreadRecord) (stores.SourceCommentThreadRecord, error) {
	return createScopedSourceCommentRecord(
		ctx,
		s.tx,
		scope,
		record,
		initializeSourceCommentThreadRecord,
		stores.PrepareSourceCommentThreadRecord,
		validateCreateSourceCommentThreadRecord,
	)
}

func (s *relationalTxStore) GetSourceCommentThread(ctx context.Context, scope stores.Scope, id string) (stores.SourceCommentThreadRecord, error) {
	return loadSourceCommentThreadRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListSourceCommentThreads(ctx context.Context, scope stores.Scope, query stores.SourceCommentThreadQuery) ([]stores.SourceCommentThreadRecord, error) {
	return listSourceCommentThreadRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) SaveSourceCommentThread(ctx context.Context, scope stores.Scope, record stores.SourceCommentThreadRecord) (stores.SourceCommentThreadRecord, error) {
	return relationalSavePreparedRecord(
		ctx,
		s.tx,
		scope,
		record.ID,
		record,
		loadSourceCommentThreadRecord,
		stores.PrepareSourceCommentThreadRecord,
		func(record stores.SourceCommentThreadRecord, scope stores.Scope) stores.SourceCommentThreadRecord {
			record.TenantID = scope.TenantID
			record.OrgID = scope.OrgID
			return record
		},
		nil,
	)
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
	return relationalSavePreparedRecord(
		ctx,
		s.tx,
		scope,
		record.ID,
		record,
		loadSourceCommentMessageRecord,
		stores.PrepareSourceCommentMessageRecord,
		func(record stores.SourceCommentMessageRecord, scope stores.Scope) stores.SourceCommentMessageRecord {
			record.TenantID = scope.TenantID
			record.OrgID = scope.OrgID
			return record
		},
		nil,
	)
}

func (s *relationalTxStore) DeleteSourceCommentMessages(ctx context.Context, scope stores.Scope, query stores.SourceCommentMessageQuery) error {
	return relationalDeleteScopedRecords(
		ctx,
		s.tx,
		scope,
		(*stores.SourceCommentMessageRecord)(nil),
		relationalDeleteFilter{field: "source_comment_thread_id", value: query.SourceCommentThreadID},
		relationalDeleteFilter{field: "source_revision_id", value: query.SourceRevisionID},
		relationalDeleteFilter{field: "provider_message_id", value: query.ProviderMessageID},
	)
}

func (s *relationalTxStore) CreateSourceCommentSyncState(ctx context.Context, scope stores.Scope, record stores.SourceCommentSyncStateRecord) (stores.SourceCommentSyncStateRecord, error) {
	return createScopedSourceCommentRecord(
		ctx,
		s.tx,
		scope,
		record,
		initializeSourceCommentSyncStateRecord,
		stores.PrepareSourceCommentSyncStateRecord,
		validateCreateSourceCommentSyncStateRecord,
	)
}

func (s *relationalTxStore) GetSourceCommentSyncState(ctx context.Context, scope stores.Scope, id string) (stores.SourceCommentSyncStateRecord, error) {
	return loadSourceCommentSyncStateRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListSourceCommentSyncStates(ctx context.Context, scope stores.Scope, query stores.SourceCommentSyncStateQuery) ([]stores.SourceCommentSyncStateRecord, error) {
	return listSourceCommentSyncStateRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) SaveSourceCommentSyncState(ctx context.Context, scope stores.Scope, record stores.SourceCommentSyncStateRecord) (stores.SourceCommentSyncStateRecord, error) {
	return relationalSavePreparedRecord(
		ctx,
		s.tx,
		scope,
		record.ID,
		record,
		loadSourceCommentSyncStateRecord,
		stores.PrepareSourceCommentSyncStateRecord,
		func(record stores.SourceCommentSyncStateRecord, scope stores.Scope) stores.SourceCommentSyncStateRecord {
			record.TenantID = scope.TenantID
			record.OrgID = scope.OrgID
			return record
		},
		nil,
	)
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
	return relationalSavePreparedRecord(
		ctx,
		s.tx,
		scope,
		record.ID,
		record,
		loadSourceSearchDocumentRecord,
		stores.PrepareSourceSearchDocumentRecord,
		func(record stores.SourceSearchDocumentRecord, scope stores.Scope) stores.SourceSearchDocumentRecord {
			record.TenantID = scope.TenantID
			record.OrgID = scope.OrgID
			return record
		},
		nil,
	)
}

func (s *relationalTxStore) DeleteSourceSearchDocuments(ctx context.Context, scope stores.Scope, query stores.SourceSearchDocumentQuery) error {
	return relationalDeleteScopedRecords(
		ctx,
		s.tx,
		scope,
		(*stores.SourceSearchDocumentRecord)(nil),
		relationalDeleteFilter{field: "source_document_id", value: query.SourceDocumentID},
		relationalDeleteFilter{field: "source_revision_id", value: query.SourceRevisionID},
		relationalDeleteFilter{field: "result_kind", value: query.ResultKind},
	)
}
