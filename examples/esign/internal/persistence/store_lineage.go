package persistence

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

func loadSourceDocumentRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceDocumentRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceDocumentRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return stores.SourceDocumentRecord{}, relationalInvalidRecordError("source_documents", "id", "required")
	}
	record := stores.SourceDocumentRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.SourceDocumentRecord{}, mapSQLNotFound(err, "source_documents", id)
	}
	return record, nil
}

func listSourceDocumentRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceDocumentQuery) ([]stores.SourceDocumentRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	records := make([]stores.SourceDocumentRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if query.ProviderKind != "" {
		sel = sel.Where("provider_kind = ?", strings.TrimSpace(query.ProviderKind))
	}
	if query.Status != "" {
		sel = sel.Where("status = ?", strings.TrimSpace(query.Status))
	}
	if query.CanonicalTitle != "" {
		sel = sel.Where("LOWER(canonical_title) = LOWER(?)", strings.TrimSpace(query.CanonicalTitle))
	}
	sel = sel.OrderExpr("created_at ASC, id ASC")
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func loadSourceHandleRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceHandleRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceHandleRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return stores.SourceHandleRecord{}, relationalInvalidRecordError("source_handles", "id", "required")
	}
	record := stores.SourceHandleRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.SourceHandleRecord{}, mapSQLNotFound(err, "source_handles", id)
	}
	return record, nil
}

func findActiveSourceHandleRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, providerKind, externalFileID, accountID, excludeID string) (stores.SourceHandleRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceHandleRecord{}, err
	}
	if strings.TrimSpace(providerKind) == "" || strings.TrimSpace(externalFileID) == "" {
		return stores.SourceHandleRecord{}, relationalInvalidRecordError("source_handles", "provider_kind|external_file_id", "required")
	}
	record := stores.SourceHandleRecord{}
	sel := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("provider_kind = ?", strings.TrimSpace(providerKind)).
		Where("external_file_id = ?", strings.TrimSpace(externalFileID)).
		Where("account_id = ?", strings.TrimSpace(accountID)).
		Where("handle_status = ?", stores.SourceHandleStatusActive).
		Where("valid_to IS NULL")
	if strings.TrimSpace(excludeID) != "" {
		sel = sel.Where("id <> ?", strings.TrimSpace(excludeID))
	}
	if err := sel.Scan(ctx); err != nil {
		return stores.SourceHandleRecord{}, mapSQLNotFound(err, "source_handles", externalFileID)
	}
	return record, nil
}

func listSourceHandleRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceHandleQuery) ([]stores.SourceHandleRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	documentIDs := relationalNormalizedLineageIDs(query.SourceDocumentID, query.SourceDocumentIDs)
	records := make([]stores.SourceHandleRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if len(documentIDs) == 1 {
		for id := range documentIDs {
			sel = sel.Where("source_document_id = ?", id)
		}
	} else if len(documentIDs) > 1 {
		ids := relationalLineageIDList(documentIDs)
		sel = sel.Where("source_document_id IN (?)", bun.List(ids))
	}
	if query.ProviderKind != "" {
		sel = sel.Where("provider_kind = ?", strings.TrimSpace(query.ProviderKind))
	}
	if query.ExternalFileID != "" {
		sel = sel.Where("external_file_id = ?", strings.TrimSpace(query.ExternalFileID))
	}
	if query.AccountID != "" {
		sel = sel.Where("account_id = ?", strings.TrimSpace(query.AccountID))
	}
	if query.ActiveOnly {
		sel = sel.Where("handle_status = ?", stores.SourceHandleStatusActive).Where("valid_to IS NULL")
	}
	sel = sel.OrderExpr("created_at ASC, id ASC")
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func loadSourceRevisionRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceRevisionRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceRevisionRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return stores.SourceRevisionRecord{}, relationalInvalidRecordError("source_revisions", "id", "required")
	}
	record := stores.SourceRevisionRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.SourceRevisionRecord{}, mapSQLNotFound(err, "source_revisions", id)
	}
	return record, nil
}

func listSourceRevisionRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceRevisionQuery) ([]stores.SourceRevisionRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	documentIDs := relationalNormalizedLineageIDs(query.SourceDocumentID, query.SourceDocumentIDs)
	records := make([]stores.SourceRevisionRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if len(documentIDs) == 1 {
		for id := range documentIDs {
			sel = sel.Where("source_document_id = ?", id)
		}
	} else if len(documentIDs) > 1 {
		ids := relationalLineageIDList(documentIDs)
		sel = sel.Where("source_document_id IN (?)", bun.List(ids))
	}
	if query.SourceHandleID != "" {
		sel = sel.Where("source_handle_id = ?", strings.TrimSpace(query.SourceHandleID))
	}
	if query.ProviderRevisionHint != "" {
		sel = sel.Where("provider_revision_hint = ?", strings.TrimSpace(query.ProviderRevisionHint))
	}
	sel = sel.OrderExpr("created_at ASC, id ASC")
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func loadSourceArtifactRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceArtifactRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceArtifactRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return stores.SourceArtifactRecord{}, relationalInvalidRecordError("source_artifacts", "id", "required")
	}
	record := stores.SourceArtifactRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.SourceArtifactRecord{}, mapSQLNotFound(err, "source_artifacts", id)
	}
	return record, nil
}

func listSourceArtifactRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceArtifactQuery) ([]stores.SourceArtifactRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	records := make([]stores.SourceArtifactRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if query.SourceRevisionID != "" {
		sel = sel.Where("source_revision_id = ?", strings.TrimSpace(query.SourceRevisionID))
	}
	if query.ArtifactKind != "" {
		sel = sel.Where("artifact_kind = ?", strings.TrimSpace(query.ArtifactKind))
	}
	if query.SHA256 != "" {
		sel = sel.Where("sha256 = ?", strings.TrimSpace(query.SHA256))
	}
	sel = sel.OrderExpr("created_at ASC, id ASC")
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func loadSourceFingerprintRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceFingerprintRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceFingerprintRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return stores.SourceFingerprintRecord{}, relationalInvalidRecordError("source_fingerprints", "id", "required")
	}
	record := stores.SourceFingerprintRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.SourceFingerprintRecord{}, mapSQLNotFound(err, "source_fingerprints", id)
	}
	return record, nil
}

func listSourceFingerprintRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceFingerprintQuery) ([]stores.SourceFingerprintRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	records := make([]stores.SourceFingerprintRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if query.SourceRevisionID != "" {
		sel = sel.Where("source_revision_id = ?", strings.TrimSpace(query.SourceRevisionID))
	}
	if query.ArtifactID != "" {
		sel = sel.Where("artifact_id = ?", strings.TrimSpace(query.ArtifactID))
	}
	if query.ExtractVersion != "" {
		sel = sel.Where("extract_version = ?", strings.TrimSpace(query.ExtractVersion))
	}
	sel = sel.OrderExpr("created_at ASC, id ASC")
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func loadSourceRelationshipRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SourceRelationshipRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return stores.SourceRelationshipRecord{}, relationalInvalidRecordError("source_relationships", "id", "required")
	}
	record := stores.SourceRelationshipRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.SourceRelationshipRecord{}, mapSQLNotFound(err, "source_relationships", id)
	}
	return record, nil
}

func listSourceRelationshipRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceRelationshipQuery) ([]stores.SourceRelationshipRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	documentIDs := relationalNormalizedLineageIDs(query.SourceDocumentID, query.SourceDocumentIDs)
	records := make([]stores.SourceRelationshipRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if len(documentIDs) > 0 {
		ids := relationalLineageIDList(documentIDs)
		sel = sel.WhereGroup(" AND ", func(q *bun.SelectQuery) *bun.SelectQuery {
			return q.Where("left_source_document_id IN (?)", bun.List(ids)).
				WhereOr("right_source_document_id IN (?)", bun.List(ids))
		})
	}
	if query.RelationshipType != "" {
		sel = sel.Where("relationship_type = ?", strings.TrimSpace(query.RelationshipType))
	}
	if query.Status != "" {
		sel = sel.Where("status = ?", strings.TrimSpace(query.Status))
	}
	sel = sel.OrderExpr("created_at ASC, id ASC")
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func findSourceRelationshipRecordByTuple(ctx context.Context, idb bun.IDB, scope stores.Scope, leftID, rightID, relationshipType, status, excludeID string) (stores.SourceRelationshipRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	record := stores.SourceRelationshipRecord{}
	sel := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("left_source_document_id = ?", strings.TrimSpace(leftID)).
		Where("right_source_document_id = ?", strings.TrimSpace(rightID)).
		Where("relationship_type = ?", strings.TrimSpace(relationshipType)).
		Where("status = ?", strings.TrimSpace(status))
	if strings.TrimSpace(excludeID) != "" {
		sel = sel.Where("id <> ?", strings.TrimSpace(excludeID))
	}
	if err := sel.Scan(ctx); err != nil {
		return stores.SourceRelationshipRecord{}, mapSQLNotFound(err, "source_relationships", strings.TrimSpace(leftID)+"|"+strings.TrimSpace(rightID))
	}
	return record, nil
}

func listSourceRevisionUsageRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.SourceRevisionUsageQuery) ([]stores.SourceRevisionUsageRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	documentIDs := relationalNormalizedLineageIDs("", query.SourceDocumentIDs)
	revisionIDs := relationalNormalizedLineageIDs("", query.SourceRevisionIDs)
	usage := map[string]stores.SourceRevisionUsageRecord{}

	type documentUsageRow struct {
		SourceDocumentID string `bun:"source_document_id"`
		SourceRevisionID string `bun:"source_revision_id"`
		PinnedCount      int    `bun:"pinned_count"`
	}
	documentRows := make([]documentUsageRow, 0)
	documentSel := idb.NewSelect().
		Table("documents").
		Column("source_document_id", "source_revision_id").
		ColumnExpr("COUNT(*) AS pinned_count").
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("source_document_id <> ''").
		Where("source_revision_id <> ''")
	if len(documentIDs) > 0 {
		documentSel = documentSel.Where("source_document_id IN (?)", bun.List(relationalLineageIDList(documentIDs)))
	}
	if len(revisionIDs) > 0 {
		documentSel = documentSel.Where("source_revision_id IN (?)", bun.List(relationalLineageIDList(revisionIDs)))
	}
	documentSel = documentSel.Group("source_document_id", "source_revision_id")
	if err := documentSel.Scan(ctx, &documentRows); err != nil {
		return nil, err
	}
	for _, row := range documentRows {
		revisionID := strings.TrimSpace(row.SourceRevisionID)
		current := usage[revisionID]
		current.SourceDocumentID = strings.TrimSpace(row.SourceDocumentID)
		current.SourceRevisionID = revisionID
		current.PinnedDocumentCount = row.PinnedCount
		usage[revisionID] = current
	}

	type agreementUsageRow struct {
		SourceDocumentID string `bun:"source_document_id"`
		SourceRevisionID string `bun:"source_revision_id"`
		PinnedCount      int    `bun:"pinned_count"`
	}
	agreementRows := make([]agreementUsageRow, 0)
	agreementSel := idb.NewSelect().
		TableExpr("agreements AS agr").
		Join("JOIN source_revisions AS srv ON srv.tenant_id = agr.tenant_id AND srv.org_id = agr.org_id AND srv.id = agr.source_revision_id").
		ColumnExpr("srv.source_document_id AS source_document_id").
		ColumnExpr("agr.source_revision_id AS source_revision_id").
		ColumnExpr("COUNT(*) AS pinned_count").
		Where("agr.tenant_id = ?", scope.TenantID).
		Where("agr.org_id = ?", scope.OrgID).
		Where("agr.source_revision_id <> ''")
	if len(documentIDs) > 0 {
		agreementSel = agreementSel.Where("srv.source_document_id IN (?)", bun.List(relationalLineageIDList(documentIDs)))
	}
	if len(revisionIDs) > 0 {
		agreementSel = agreementSel.Where("agr.source_revision_id IN (?)", bun.List(relationalLineageIDList(revisionIDs)))
	}
	agreementSel = agreementSel.Group("srv.source_document_id", "agr.source_revision_id")
	if err := agreementSel.Scan(ctx, &agreementRows); err != nil {
		return nil, err
	}
	for _, row := range agreementRows {
		revisionID := strings.TrimSpace(row.SourceRevisionID)
		current := usage[revisionID]
		current.SourceDocumentID = strings.TrimSpace(row.SourceDocumentID)
		current.SourceRevisionID = revisionID
		current.PinnedAgreementCount = row.PinnedCount
		usage[revisionID] = current
	}

	out := make([]stores.SourceRevisionUsageRecord, 0, len(usage))
	for _, record := range usage {
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].SourceDocumentID == out[j].SourceDocumentID {
			return out[i].SourceRevisionID < out[j].SourceRevisionID
		}
		return out[i].SourceDocumentID < out[j].SourceDocumentID
	})
	return out, nil
}

func relationalNormalizedLineageIDs(primary string, values []string) map[string]struct{} {
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

func relationalLineageIDList(values map[string]struct{}) []string {
	out := make([]string, 0, len(values))
	for value := range values {
		out = append(out, value)
	}
	return out
}

func lineageStoreForTx(tx stores.TxStore) (stores.LineageStore, error) {
	lineage, ok := tx.(stores.LineageStore)
	if !ok {
		return nil, fmt.Errorf("lineage store is not configured on transaction")
	}
	return lineage, nil
}

func (s *StoreAdapter) CreateSourceDocument(ctx context.Context, scope stores.Scope, record stores.SourceDocumentRecord) (stores.SourceDocumentRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceDocumentRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceDocumentRecord{}, err
		}
		return lineage.CreateSourceDocument(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetSourceDocument(ctx context.Context, scope stores.Scope, id string) (stores.SourceDocumentRecord, error) {
	return loadSourceDocumentRecord(ctx, idbOrDB(nil, s.bunDB), scope, id)
}

func (s *StoreAdapter) ListSourceDocuments(ctx context.Context, scope stores.Scope, query stores.SourceDocumentQuery) ([]stores.SourceDocumentRecord, error) {
	return listSourceDocumentRecords(ctx, idbOrDB(nil, s.bunDB), scope, query)
}

func (s *StoreAdapter) SaveSourceDocument(ctx context.Context, scope stores.Scope, record stores.SourceDocumentRecord) (stores.SourceDocumentRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceDocumentRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceDocumentRecord{}, err
		}
		return lineage.SaveSourceDocument(ctx, scope, record)
	})
}

func (s *StoreAdapter) CreateSourceHandle(ctx context.Context, scope stores.Scope, record stores.SourceHandleRecord) (stores.SourceHandleRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceHandleRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceHandleRecord{}, err
		}
		return lineage.CreateSourceHandle(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetSourceHandle(ctx context.Context, scope stores.Scope, id string) (stores.SourceHandleRecord, error) {
	return loadSourceHandleRecord(ctx, idbOrDB(nil, s.bunDB), scope, id)
}

func (s *StoreAdapter) GetActiveSourceHandle(ctx context.Context, scope stores.Scope, providerKind, externalFileID, accountID string) (stores.SourceHandleRecord, error) {
	return findActiveSourceHandleRecord(ctx, idbOrDB(nil, s.bunDB), scope, providerKind, externalFileID, accountID, "")
}

func (s *StoreAdapter) ListSourceHandles(ctx context.Context, scope stores.Scope, query stores.SourceHandleQuery) ([]stores.SourceHandleRecord, error) {
	return listSourceHandleRecords(ctx, idbOrDB(nil, s.bunDB), scope, query)
}

func (s *StoreAdapter) SaveSourceHandle(ctx context.Context, scope stores.Scope, record stores.SourceHandleRecord) (stores.SourceHandleRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceHandleRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceHandleRecord{}, err
		}
		return lineage.SaveSourceHandle(ctx, scope, record)
	})
}

func (s *StoreAdapter) CreateSourceRevision(ctx context.Context, scope stores.Scope, record stores.SourceRevisionRecord) (stores.SourceRevisionRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceRevisionRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceRevisionRecord{}, err
		}
		return lineage.CreateSourceRevision(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetSourceRevision(ctx context.Context, scope stores.Scope, id string) (stores.SourceRevisionRecord, error) {
	return loadSourceRevisionRecord(ctx, idbOrDB(nil, s.bunDB), scope, id)
}

func (s *StoreAdapter) ListSourceRevisions(ctx context.Context, scope stores.Scope, query stores.SourceRevisionQuery) ([]stores.SourceRevisionRecord, error) {
	return listSourceRevisionRecords(ctx, idbOrDB(nil, s.bunDB), scope, query)
}

func (s *StoreAdapter) SaveSourceRevision(ctx context.Context, scope stores.Scope, record stores.SourceRevisionRecord) (stores.SourceRevisionRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceRevisionRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceRevisionRecord{}, err
		}
		return lineage.SaveSourceRevision(ctx, scope, record)
	})
}

func (s *StoreAdapter) CreateSourceArtifact(ctx context.Context, scope stores.Scope, record stores.SourceArtifactRecord) (stores.SourceArtifactRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceArtifactRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceArtifactRecord{}, err
		}
		return lineage.CreateSourceArtifact(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetSourceArtifact(ctx context.Context, scope stores.Scope, id string) (stores.SourceArtifactRecord, error) {
	return loadSourceArtifactRecord(ctx, idbOrDB(nil, s.bunDB), scope, id)
}

func (s *StoreAdapter) ListSourceArtifacts(ctx context.Context, scope stores.Scope, query stores.SourceArtifactQuery) ([]stores.SourceArtifactRecord, error) {
	return listSourceArtifactRecords(ctx, idbOrDB(nil, s.bunDB), scope, query)
}

func (s *StoreAdapter) SaveSourceArtifact(ctx context.Context, scope stores.Scope, record stores.SourceArtifactRecord) (stores.SourceArtifactRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceArtifactRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceArtifactRecord{}, err
		}
		return lineage.SaveSourceArtifact(ctx, scope, record)
	})
}

func (s *StoreAdapter) CreateSourceFingerprint(ctx context.Context, scope stores.Scope, record stores.SourceFingerprintRecord) (stores.SourceFingerprintRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceFingerprintRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceFingerprintRecord{}, err
		}
		return lineage.CreateSourceFingerprint(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetSourceFingerprint(ctx context.Context, scope stores.Scope, id string) (stores.SourceFingerprintRecord, error) {
	return loadSourceFingerprintRecord(ctx, idbOrDB(nil, s.bunDB), scope, id)
}

func (s *StoreAdapter) ListSourceFingerprints(ctx context.Context, scope stores.Scope, query stores.SourceFingerprintQuery) ([]stores.SourceFingerprintRecord, error) {
	return listSourceFingerprintRecords(ctx, idbOrDB(nil, s.bunDB), scope, query)
}

func (s *StoreAdapter) SaveSourceFingerprint(ctx context.Context, scope stores.Scope, record stores.SourceFingerprintRecord) (stores.SourceFingerprintRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceFingerprintRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceFingerprintRecord{}, err
		}
		return lineage.SaveSourceFingerprint(ctx, scope, record)
	})
}

func (s *StoreAdapter) CreateSourceRelationship(ctx context.Context, scope stores.Scope, record stores.SourceRelationshipRecord) (stores.SourceRelationshipRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceRelationshipRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceRelationshipRecord{}, err
		}
		return lineage.CreateSourceRelationship(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetSourceRelationship(ctx context.Context, scope stores.Scope, id string) (stores.SourceRelationshipRecord, error) {
	return loadSourceRelationshipRecord(ctx, idbOrDB(nil, s.bunDB), scope, id)
}

func (s *StoreAdapter) ListSourceRelationships(ctx context.Context, scope stores.Scope, query stores.SourceRelationshipQuery) ([]stores.SourceRelationshipRecord, error) {
	return listSourceRelationshipRecords(ctx, idbOrDB(nil, s.bunDB), scope, query)
}

func (s *StoreAdapter) ListSourceRevisionUsage(ctx context.Context, scope stores.Scope, query stores.SourceRevisionUsageQuery) ([]stores.SourceRevisionUsageRecord, error) {
	return listSourceRevisionUsageRecords(ctx, idbOrDB(nil, s.bunDB), scope, query)
}

func (s *StoreAdapter) SaveSourceRelationship(ctx context.Context, scope stores.Scope, record stores.SourceRelationshipRecord) (stores.SourceRelationshipRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SourceRelationshipRecord, error) {
		lineage, err := lineageStoreForTx(tx)
		if err != nil {
			return stores.SourceRelationshipRecord{}, err
		}
		return lineage.SaveSourceRelationship(ctx, scope, record)
	})
}

func (s *relationalTxStore) CreateSourceDocument(ctx context.Context, scope stores.Scope, record stores.SourceDocumentRecord) (stores.SourceDocumentRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceDocumentRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceDocumentRecord(record, nil)
	if err != nil {
		return stores.SourceDocumentRecord{}, err
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SourceDocumentRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) GetSourceDocument(ctx context.Context, scope stores.Scope, id string) (stores.SourceDocumentRecord, error) {
	return loadSourceDocumentRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListSourceDocuments(ctx context.Context, scope stores.Scope, query stores.SourceDocumentQuery) ([]stores.SourceDocumentRecord, error) {
	return listSourceDocumentRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) SaveSourceDocument(ctx context.Context, scope stores.Scope, record stores.SourceDocumentRecord) (stores.SourceDocumentRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceDocumentRecord{}, err
	}
	current, err := loadSourceDocumentRecord(ctx, s.tx, scope, record.ID)
	if err != nil {
		return stores.SourceDocumentRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceDocumentRecord(record, &current)
	if err != nil {
		return stores.SourceDocumentRecord{}, err
	}
	if _, err := s.tx.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Exec(ctx); err != nil {
		return stores.SourceDocumentRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) CreateSourceHandle(ctx context.Context, scope stores.Scope, record stores.SourceHandleRecord) (stores.SourceHandleRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceHandleRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceHandleRecord(record, nil)
	if err != nil {
		return stores.SourceHandleRecord{}, err
	}
	if _, err := loadSourceDocumentRecord(ctx, s.tx, scope, record.SourceDocumentID); err != nil {
		return stores.SourceHandleRecord{}, err
	}
	if record.HandleStatus == stores.SourceHandleStatusActive && record.ValidTo == nil {
		if _, err := findActiveSourceHandleRecord(ctx, s.tx, scope, record.ProviderKind, record.ExternalFileID, record.AccountID, record.ID); err == nil {
			return stores.SourceHandleRecord{}, relationalInvalidRecordError("source_handles", "external_file_id", "duplicate active handle")
		} else if !relationalIsNotFoundError(err) {
			return stores.SourceHandleRecord{}, err
		}
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SourceHandleRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) GetSourceHandle(ctx context.Context, scope stores.Scope, id string) (stores.SourceHandleRecord, error) {
	return loadSourceHandleRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) GetActiveSourceHandle(ctx context.Context, scope stores.Scope, providerKind, externalFileID, accountID string) (stores.SourceHandleRecord, error) {
	return findActiveSourceHandleRecord(ctx, s.tx, scope, providerKind, externalFileID, accountID, "")
}

func (s *relationalTxStore) ListSourceHandles(ctx context.Context, scope stores.Scope, query stores.SourceHandleQuery) ([]stores.SourceHandleRecord, error) {
	return listSourceHandleRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) SaveSourceHandle(ctx context.Context, scope stores.Scope, record stores.SourceHandleRecord) (stores.SourceHandleRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceHandleRecord{}, err
	}
	current, err := loadSourceHandleRecord(ctx, s.tx, scope, record.ID)
	if err != nil {
		return stores.SourceHandleRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceHandleRecord(record, &current)
	if err != nil {
		return stores.SourceHandleRecord{}, err
	}
	if record.HandleStatus == stores.SourceHandleStatusActive && record.ValidTo == nil {
		if _, err := findActiveSourceHandleRecord(ctx, s.tx, scope, record.ProviderKind, record.ExternalFileID, record.AccountID, record.ID); err == nil {
			return stores.SourceHandleRecord{}, relationalInvalidRecordError("source_handles", "external_file_id", "duplicate active handle")
		} else if !relationalIsNotFoundError(err) {
			return stores.SourceHandleRecord{}, err
		}
	}
	if _, err := s.tx.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Exec(ctx); err != nil {
		return stores.SourceHandleRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) CreateSourceRevision(ctx context.Context, scope stores.Scope, record stores.SourceRevisionRecord) (stores.SourceRevisionRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceRevisionRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceRevisionRecord(record, nil)
	if err != nil {
		return stores.SourceRevisionRecord{}, err
	}
	if _, err := loadSourceDocumentRecord(ctx, s.tx, scope, record.SourceDocumentID); err != nil {
		return stores.SourceRevisionRecord{}, err
	}
	handle, err := loadSourceHandleRecord(ctx, s.tx, scope, record.SourceHandleID)
	if err != nil {
		return stores.SourceRevisionRecord{}, err
	}
	if strings.TrimSpace(handle.SourceDocumentID) != strings.TrimSpace(record.SourceDocumentID) {
		return stores.SourceRevisionRecord{}, relationalInvalidRecordError("source_revisions", "source_handle_id", "must belong to source_document_id")
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SourceRevisionRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) GetSourceRevision(ctx context.Context, scope stores.Scope, id string) (stores.SourceRevisionRecord, error) {
	return loadSourceRevisionRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListSourceRevisions(ctx context.Context, scope stores.Scope, query stores.SourceRevisionQuery) ([]stores.SourceRevisionRecord, error) {
	return listSourceRevisionRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) SaveSourceRevision(ctx context.Context, scope stores.Scope, record stores.SourceRevisionRecord) (stores.SourceRevisionRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceRevisionRecord{}, err
	}
	current, err := loadSourceRevisionRecord(ctx, s.tx, scope, record.ID)
	if err != nil {
		return stores.SourceRevisionRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceRevisionRecord(record, &current)
	if err != nil {
		return stores.SourceRevisionRecord{}, err
	}
	if _, err := s.tx.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Exec(ctx); err != nil {
		return stores.SourceRevisionRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) CreateSourceArtifact(ctx context.Context, scope stores.Scope, record stores.SourceArtifactRecord) (stores.SourceArtifactRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceArtifactRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceArtifactRecord(record, nil)
	if err != nil {
		return stores.SourceArtifactRecord{}, err
	}
	if _, err := loadSourceRevisionRecord(ctx, s.tx, scope, record.SourceRevisionID); err != nil {
		return stores.SourceArtifactRecord{}, err
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SourceArtifactRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) GetSourceArtifact(ctx context.Context, scope stores.Scope, id string) (stores.SourceArtifactRecord, error) {
	return loadSourceArtifactRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListSourceArtifacts(ctx context.Context, scope stores.Scope, query stores.SourceArtifactQuery) ([]stores.SourceArtifactRecord, error) {
	return listSourceArtifactRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) SaveSourceArtifact(ctx context.Context, scope stores.Scope, record stores.SourceArtifactRecord) (stores.SourceArtifactRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceArtifactRecord{}, err
	}
	current, err := loadSourceArtifactRecord(ctx, s.tx, scope, record.ID)
	if err != nil {
		return stores.SourceArtifactRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceArtifactRecord(record, &current)
	if err != nil {
		return stores.SourceArtifactRecord{}, err
	}
	if _, err := s.tx.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Exec(ctx); err != nil {
		return stores.SourceArtifactRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) CreateSourceFingerprint(ctx context.Context, scope stores.Scope, record stores.SourceFingerprintRecord) (stores.SourceFingerprintRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceFingerprintRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceFingerprintRecord(record, nil)
	if err != nil {
		return stores.SourceFingerprintRecord{}, err
	}
	if _, err := loadSourceRevisionRecord(ctx, s.tx, scope, record.SourceRevisionID); err != nil {
		return stores.SourceFingerprintRecord{}, err
	}
	artifact, err := loadSourceArtifactRecord(ctx, s.tx, scope, record.ArtifactID)
	if err != nil {
		return stores.SourceFingerprintRecord{}, err
	}
	if strings.TrimSpace(artifact.SourceRevisionID) != strings.TrimSpace(record.SourceRevisionID) {
		return stores.SourceFingerprintRecord{}, relationalInvalidRecordError("source_fingerprints", "artifact_id", "must belong to source_revision_id")
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SourceFingerprintRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) GetSourceFingerprint(ctx context.Context, scope stores.Scope, id string) (stores.SourceFingerprintRecord, error) {
	return loadSourceFingerprintRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListSourceFingerprints(ctx context.Context, scope stores.Scope, query stores.SourceFingerprintQuery) ([]stores.SourceFingerprintRecord, error) {
	return listSourceFingerprintRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) SaveSourceFingerprint(ctx context.Context, scope stores.Scope, record stores.SourceFingerprintRecord) (stores.SourceFingerprintRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceFingerprintRecord{}, err
	}
	current, err := loadSourceFingerprintRecord(ctx, s.tx, scope, record.ID)
	if err != nil {
		return stores.SourceFingerprintRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceFingerprintRecord(record, &current)
	if err != nil {
		return stores.SourceFingerprintRecord{}, err
	}
	artifact, err := loadSourceArtifactRecord(ctx, s.tx, scope, record.ArtifactID)
	if err != nil {
		return stores.SourceFingerprintRecord{}, err
	}
	if strings.TrimSpace(artifact.SourceRevisionID) != strings.TrimSpace(record.SourceRevisionID) {
		return stores.SourceFingerprintRecord{}, relationalInvalidRecordError("source_fingerprints", "artifact_id", "must belong to source_revision_id")
	}
	if _, err := s.tx.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Exec(ctx); err != nil {
		return stores.SourceFingerprintRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) CreateSourceRelationship(ctx context.Context, scope stores.Scope, record stores.SourceRelationshipRecord) (stores.SourceRelationshipRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceRelationshipRecord(record, nil)
	if err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	if _, err := loadSourceDocumentRecord(ctx, s.tx, scope, record.LeftSourceDocumentID); err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	if _, err := loadSourceDocumentRecord(ctx, s.tx, scope, record.RightSourceDocumentID); err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	if _, err := findSourceRelationshipRecordByTuple(ctx, s.tx, scope, record.LeftSourceDocumentID, record.RightSourceDocumentID, record.RelationshipType, record.Status, record.ID); err == nil {
		return stores.SourceRelationshipRecord{}, relationalInvalidRecordError("source_relationships", "status", "already exists")
	} else if !relationalIsNotFoundError(err) {
		return stores.SourceRelationshipRecord{}, err
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) GetSourceRelationship(ctx context.Context, scope stores.Scope, id string) (stores.SourceRelationshipRecord, error) {
	return loadSourceRelationshipRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListSourceRelationships(ctx context.Context, scope stores.Scope, query stores.SourceRelationshipQuery) ([]stores.SourceRelationshipRecord, error) {
	return listSourceRelationshipRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) SaveSourceRelationship(ctx context.Context, scope stores.Scope, record stores.SourceRelationshipRecord) (stores.SourceRelationshipRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	current, err := loadSourceRelationshipRecord(ctx, s.tx, scope, record.ID)
	if err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record, err = stores.PrepareSourceRelationshipRecord(record, &current)
	if err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	if _, err := findSourceRelationshipRecordByTuple(ctx, s.tx, scope, record.LeftSourceDocumentID, record.RightSourceDocumentID, record.RelationshipType, record.Status, record.ID); err == nil {
		return stores.SourceRelationshipRecord{}, relationalInvalidRecordError("source_relationships", "status", "already exists")
	} else if !relationalIsNotFoundError(err) {
		return stores.SourceRelationshipRecord{}, err
	}
	if _, err := s.tx.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Exec(ctx); err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	return record, nil
}
