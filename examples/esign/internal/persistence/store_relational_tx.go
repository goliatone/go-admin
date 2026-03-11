package persistence

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

const relationalDefaultDraftTTL = 7 * 24 * time.Hour

const (
	relationalDefaultReminderLeaseSeconds = 120
	relationalDefaultReminderPolicy       = "r1"
	relationalDefaultOutboxMaxAttempts    = 5
	relationalDefaultOutboxClaimLimit     = 25
	relationalDefaultOutboxClaimLockTTL   = 5 * time.Minute
)

type relationalTxStore struct {
	adapter *StoreAdapter
	tx      bun.Tx
}

var _ stores.TxStore = (*relationalTxStore)(nil)

func newRelationalTxStore(adapter *StoreAdapter, tx bun.Tx) *relationalTxStore {
	return &relationalTxStore{adapter: adapter, tx: tx}
}

func relationalWriteCompat[T any](ctx context.Context, s *relationalTxStore, fn func(stores.TxStore) (T, error)) (T, error) {
	var zero T
	if s == nil || s.adapter == nil || s.adapter.sync == nil {
		return zero, fmt.Errorf("store adapter: tx store is not configured")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	before, err := s.adapter.sync.loadSnapshotWithIDB(ctx, s.tx)
	if err != nil {
		return zero, fmt.Errorf("store adapter: load runtime snapshot: %w", err)
	}
	mem, err := inMemoryStoreFromRuntimeSnapshot(before)
	if err != nil {
		return zero, fmt.Errorf("store adapter: hydrate runtime store: %w", err)
	}
	out, err := fn(mem)
	if err != nil {
		return zero, err
	}
	after, err := runtimeSnapshotFromInMemoryStore(mem)
	if err != nil {
		return zero, fmt.Errorf("store adapter: encode runtime snapshot: %w", err)
	}
	if err := validateRuntimeSnapshot(after); err != nil {
		return zero, err
	}
	if err := s.adapter.sync.persistSnapshotDeltaTx(ctx, s.tx, before, after); err != nil {
		return zero, err
	}
	return out, nil
}

func relationalWriteCompat2[A any, B any](ctx context.Context, s *relationalTxStore, fn func(stores.TxStore) (A, B, error)) (A, B, error) {
	var zeroA A
	var zeroB B
	outA, err := relationalWriteCompat(ctx, s, func(tx stores.TxStore) (struct {
		A A
		B B
	}, error) {
		a, b, innerErr := fn(tx)
		return struct {
			A A
			B B
		}{A: a, B: b}, innerErr
	})
	if err != nil {
		return zeroA, zeroB, err
	}
	return outA.A, outA.B, nil
}

func relationalExecCompat(ctx context.Context, s *relationalTxStore, fn func(stores.TxStore) error) error {
	_, err := relationalWriteCompat(ctx, s, func(tx stores.TxStore) (struct{}, error) {
		return struct{}{}, fn(tx)
	})
	return err
}

func relationalReadCompat[T any](ctx context.Context, s *relationalTxStore, fn func(*stores.InMemoryStore) (T, error)) (T, error) {
	var zero T
	if s == nil || s.adapter == nil || s.adapter.sync == nil {
		return zero, fmt.Errorf("store adapter: tx store is not configured")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	snapshot, err := s.adapter.sync.loadSnapshotWithIDB(ctx, s.tx)
	if err != nil {
		return zero, fmt.Errorf("store adapter: load runtime snapshot: %w", err)
	}
	mem, err := inMemoryStoreFromRuntimeSnapshot(snapshot)
	if err != nil {
		return zero, fmt.Errorf("store adapter: hydrate runtime store: %w", err)
	}
	return fn(mem)
}

func relationalReadCompat2[A any, B any](ctx context.Context, s *relationalTxStore, fn func(*stores.InMemoryStore) (A, B, error)) (A, B, error) {
	var zeroA A
	var zeroB B
	out, err := relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) (struct {
		A A
		B B
	}, error) {
		a, b, innerErr := fn(mem)
		return struct {
			A A
			B B
		}{A: a, B: b}, innerErr
	})
	if err != nil {
		return zeroA, zeroB, err
	}
	return out.A, out.B, nil
}

func normalizeRelationalID(id string) string {
	return strings.TrimSpace(id)
}

func cloneRelationalTimePtr(src *time.Time) *time.Time {
	if src == nil {
		return nil
	}
	out := src.UTC()
	return &out
}

func relationalTimeOrNow(value time.Time) time.Time {
	if value.IsZero() {
		return time.Now().UTC()
	}
	return value.UTC()
}

func relationalParticipantToRecipient(record stores.ParticipantRecord) stores.RecipientRecord {
	return stores.RecipientRecord{
		ID:            record.ID,
		TenantID:      record.TenantID,
		OrgID:         record.OrgID,
		AgreementID:   record.AgreementID,
		Email:         record.Email,
		Name:          record.Name,
		Role:          record.Role,
		Notify:        record.Notify,
		SigningOrder:  record.SigningStage,
		FirstViewAt:   cloneRelationalTimePtr(record.FirstViewAt),
		LastViewAt:    cloneRelationalTimePtr(record.LastViewAt),
		DeclinedAt:    cloneRelationalTimePtr(record.DeclinedAt),
		DeclineReason: record.DeclineReason,
		CompletedAt:   cloneRelationalTimePtr(record.CompletedAt),
		Version:       record.Version,
		CreatedAt:     record.CreatedAt,
		UpdatedAt:     record.UpdatedAt,
	}
}

func relationalVersionConflictError(entity, id string, expected, actual int64) error {
	return goerrors.New("version conflict", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("VERSION_CONFLICT").
		WithMetadata(map[string]any{
			"entity":   entity,
			"id":       strings.TrimSpace(id),
			"expected": expected,
			"actual":   actual,
		})
}

func relationalImmutableAgreementError(agreementID, status string) error {
	return goerrors.New("agreement is immutable after send", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("AGREEMENT_IMMUTABLE").
		WithMetadata(map[string]any{
			"agreement_id": strings.TrimSpace(agreementID),
			"status":       strings.TrimSpace(status),
		})
}

func relationalInvalidSignerStateError(message string) error {
	return goerrors.New("invalid signer state: "+strings.TrimSpace(message), goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("INVALID_SIGNER_STATE")
}

func relationalUniqueConstraintError(err error, entity, field string) error {
	if err == nil {
		return nil
	}
	text := strings.ToLower(err.Error())
	if strings.Contains(text, "unique constraint") ||
		strings.Contains(text, "duplicate key") ||
		strings.Contains(text, "23505") {
		return relationalInvalidRecordError(entity, field, "already exists")
	}
	return err
}

func relationalMergeImmutableArtifactValue(existing, incoming, field string) (string, error) {
	existing = strings.TrimSpace(existing)
	incoming = strings.TrimSpace(incoming)
	if incoming == "" {
		return existing, nil
	}
	if existing != "" && existing != incoming {
		return "", relationalInvalidRecordError("agreement_artifacts", field, "immutable once set")
	}
	return incoming, nil
}

func updateScopedModelByID(ctx context.Context, idb bun.IDB, model any, tenantID, orgID, id string) error {
	_, err := idb.NewUpdate().
		Model(model).
		Where("tenant_id = ?", strings.TrimSpace(tenantID)).
		Where("org_id = ?", strings.TrimSpace(orgID)).
		Where("id = ?", strings.TrimSpace(id)).
		Exec(ctx)
	return err
}

func deleteScopedModelByID(ctx context.Context, idb bun.IDB, model any, tenantID, orgID, id string) error {
	_, err := idb.NewDelete().
		Model(model).
		Where("tenant_id = ?", strings.TrimSpace(tenantID)).
		Where("org_id = ?", strings.TrimSpace(orgID)).
		Where("id = ?", strings.TrimSpace(id)).
		Exec(ctx)
	return err
}

func updateScopedAgreementArtifact(ctx context.Context, idb bun.IDB, model any, tenantID, orgID, agreementID string) error {
	_, err := idb.NewUpdate().
		Model(model).
		Where("tenant_id = ?", strings.TrimSpace(tenantID)).
		Where("org_id = ?", strings.TrimSpace(orgID)).
		Where("agreement_id = ?", strings.TrimSpace(agreementID)).
		Exec(ctx)
	return err
}

func loadDocumentRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.DocumentRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.DocumentRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.DocumentRecord{}, relationalInvalidRecordError("documents", "id", "required")
	}
	record := stores.DocumentRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return stores.DocumentRecord{}, mapSQLNotFound(err, "documents", id)
	}
	return record, nil
}

func loadParticipantRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID, participantID string) (stores.ParticipantRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.ParticipantRecord{}, err
	}
	agreementID = normalizeRelationalID(agreementID)
	participantID = normalizeRelationalID(participantID)
	if agreementID == "" {
		return stores.ParticipantRecord{}, relationalInvalidRecordError("participants", "agreement_id", "required")
	}
	if participantID == "" {
		return stores.ParticipantRecord{}, relationalInvalidRecordError("participants", "id", "required")
	}
	record := stores.ParticipantRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("id = ?", participantID).
		Scan(ctx)
	if err != nil {
		return stores.ParticipantRecord{}, mapSQLNotFound(err, "participants", participantID)
	}
	return record, nil
}

func loadFieldDefinitionRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID, definitionID string) (stores.FieldDefinitionRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.FieldDefinitionRecord{}, err
	}
	agreementID = normalizeRelationalID(agreementID)
	definitionID = normalizeRelationalID(definitionID)
	if agreementID == "" {
		return stores.FieldDefinitionRecord{}, relationalInvalidRecordError("field_definitions", "agreement_id", "required")
	}
	if definitionID == "" {
		return stores.FieldDefinitionRecord{}, relationalInvalidRecordError("field_definitions", "id", "required")
	}
	record := stores.FieldDefinitionRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("id = ?", definitionID).
		Scan(ctx)
	if err != nil {
		return stores.FieldDefinitionRecord{}, mapSQLNotFound(err, "field_definitions", definitionID)
	}
	return record, nil
}

func loadFieldInstanceRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID, instanceID string) (stores.FieldInstanceRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.FieldInstanceRecord{}, err
	}
	agreementID = normalizeRelationalID(agreementID)
	instanceID = normalizeRelationalID(instanceID)
	if agreementID == "" {
		return stores.FieldInstanceRecord{}, relationalInvalidRecordError("field_instances", "agreement_id", "required")
	}
	if instanceID == "" {
		return stores.FieldInstanceRecord{}, relationalInvalidRecordError("field_instances", "id", "required")
	}
	record := stores.FieldInstanceRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("id = ?", instanceID).
		Scan(ctx)
	if err != nil {
		return stores.FieldInstanceRecord{}, mapSQLNotFound(err, "field_instances", instanceID)
	}
	return record, nil
}

func loadEmailLogRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.EmailLogRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.EmailLogRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.EmailLogRecord{}, relationalInvalidRecordError("email_logs", "id", "required")
	}
	record := stores.EmailLogRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return stores.EmailLogRecord{}, mapSQLNotFound(err, "email_logs", id)
	}
	return record, nil
}

func loadJobRunRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.JobRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.JobRunRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.JobRunRecord{}, relationalInvalidRecordError("job_runs", "id", "required")
	}
	record := stores.JobRunRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return stores.JobRunRecord{}, mapSQLNotFound(err, "job_runs", id)
	}
	return record, nil
}

func findDraftByWizardRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, createdByUserID, wizardID string) (stores.DraftRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.DraftRecord{}, err
	}
	createdByUserID = normalizeRelationalID(createdByUserID)
	wizardID = strings.TrimSpace(wizardID)
	if createdByUserID == "" || wizardID == "" {
		return stores.DraftRecord{}, relationalInvalidRecordError("drafts", "created_by_user_id|wizard_id", "required")
	}
	record := stores.DraftRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("created_by = ?", createdByUserID).
		Where("wizard_id = ?", wizardID).
		OrderExpr("created_at DESC, id DESC").
		Limit(1).
		Scan(ctx)
	if err != nil {
		return stores.DraftRecord{}, mapSQLNotFound(err, "drafts", wizardID)
	}
	return record, nil
}

func listDocumentRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.DocumentQuery) ([]stores.DocumentRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	records := make([]stores.DocumentRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if titleFilter := strings.TrimSpace(query.TitleContains); titleFilter != "" {
		sel = sel.Where("LOWER(title) LIKE ?", "%"+strings.ToLower(titleFilter)+"%")
	}
	if createdBy := normalizeRelationalID(query.CreatedByUserID); createdBy != "" {
		sel = sel.Where("created_by = ?", createdBy)
	}
	switch strings.ToLower(strings.TrimSpace(query.SortBy)) {
	case "updated_at":
		if query.SortDesc {
			sel = sel.OrderExpr("updated_at DESC, id DESC")
		} else {
			sel = sel.OrderExpr("updated_at ASC, id ASC")
		}
	default:
		if query.SortDesc {
			sel = sel.OrderExpr("created_at DESC, id DESC")
		} else {
			sel = sel.OrderExpr("created_at ASC, id ASC")
		}
	}
	if query.Limit > 0 {
		sel = sel.Limit(query.Limit)
	}
	if query.Offset > 0 {
		sel = sel.Offset(query.Offset)
	}
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func findFieldValueByLogicalKey(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID, recipientID, fieldID string) (stores.FieldValueRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.FieldValueRecord{}, err
	}
	record := stores.FieldValueRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("recipient_id = ?", recipientID).
		Where("field_id = ?", fieldID).
		Limit(1).
		Scan(ctx)
	if err != nil {
		return stores.FieldValueRecord{}, mapSQLNotFound(err, "field_values", fieldID)
	}
	return record, nil
}

func findJobRunByDedupeRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, jobName, dedupeKey string) (stores.JobRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.JobRunRecord{}, err
	}
	record := stores.JobRunRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("job_name = ?", jobName).
		Where("dedupe_key = ?", dedupeKey).
		Limit(1).
		Scan(ctx)
	if err != nil {
		return stores.JobRunRecord{}, mapSQLNotFound(err, "job_runs", dedupeKey)
	}
	return record, nil
}

func (s *relationalTxStore) Get(ctx context.Context, scope stores.Scope, id string) (stores.DocumentRecord, error) {
	return loadDocumentRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) List(ctx context.Context, scope stores.Scope, query stores.DocumentQuery) ([]stores.DocumentRecord, error) {
	return listDocumentRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) GetRemediationDispatch(ctx context.Context, dispatchID string) (stores.RemediationDispatchRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) (stores.RemediationDispatchRecord, error) {
		return mem.GetRemediationDispatch(ctx, dispatchID)
	})
}

func (s *relationalTxStore) GetRemediationDispatchByIdempotencyKey(ctx context.Context, scope stores.Scope, key string) (stores.RemediationDispatchRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) (stores.RemediationDispatchRecord, error) {
		return mem.GetRemediationDispatchByIdempotencyKey(ctx, scope, key)
	})
}

func (s *relationalTxStore) GetAgreement(ctx context.Context, scope stores.Scope, id string) (stores.AgreementRecord, error) {
	return loadAgreementRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListAgreements(ctx context.Context, scope stores.Scope, query stores.AgreementQuery) ([]stores.AgreementRecord, error) {
	return listAgreementRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) ListParticipants(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.ParticipantRecord, error) {
	return listParticipantRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) ListRecipients(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.RecipientRecord, error) {
	return listRecipientRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) ListFieldDefinitions(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.FieldDefinitionRecord, error) {
	return listFieldDefinitionRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) ListFieldInstances(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.FieldInstanceRecord, error) {
	return listFieldInstanceRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) ListFields(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.FieldRecord, error) {
	return listFieldRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) GetDraftSession(ctx context.Context, scope stores.Scope, id string) (stores.DraftRecord, error) {
	return loadDraftRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListDraftSessions(ctx context.Context, scope stores.Scope, query stores.DraftQuery) ([]stores.DraftRecord, string, error) {
	return listDraftRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) ListFieldValuesByRecipient(ctx context.Context, scope stores.Scope, agreementID, recipientID string) ([]stores.FieldValueRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeRelationalID(agreementID)
	recipientID = normalizeRelationalID(recipientID)
	if agreementID == "" || recipientID == "" {
		return nil, relationalInvalidRecordError("field_values", "agreement_id|recipient_id", "required")
	}
	records := make([]stores.FieldValueRecord, 0)
	if err := s.tx.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("recipient_id = ?", recipientID).
		OrderExpr("updated_at ASC, id ASC").
		Scan(ctx); err != nil {
		return nil, err
	}
	return records, nil
}

func (s *relationalTxStore) GetSignatureArtifact(ctx context.Context, scope stores.Scope, id string) (stores.SignatureArtifactRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SignatureArtifactRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "id", "required")
	}
	record := stores.SignatureArtifactRecord{}
	err = s.tx.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return stores.SignatureArtifactRecord{}, mapSQLNotFound(err, "signature_artifacts", id)
	}
	return record, nil
}

func (s *relationalTxStore) GetSignerProfile(ctx context.Context, scope stores.Scope, subject, key string, now time.Time) (stores.SignerProfileRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) (stores.SignerProfileRecord, error) {
		return mem.GetSignerProfile(ctx, scope, subject, key, now)
	})
}

func (s *relationalTxStore) ListSavedSignerSignatures(ctx context.Context, scope stores.Scope, subject, signatureType string) ([]stores.SavedSignerSignatureRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) ([]stores.SavedSignerSignatureRecord, error) {
		return mem.ListSavedSignerSignatures(ctx, scope, subject, signatureType)
	})
}

func (s *relationalTxStore) CountSavedSignerSignatures(ctx context.Context, scope stores.Scope, subject, signatureType string) (int, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) (int, error) {
		return mem.CountSavedSignerSignatures(ctx, scope, subject, signatureType)
	})
}

func (s *relationalTxStore) GetSigningTokenByHash(ctx context.Context, scope stores.Scope, tokenHash string) (stores.SigningTokenRecord, error) {
	return loadSigningTokenByHashRecord(ctx, s.tx, scope, tokenHash)
}

func (s *relationalTxStore) ListForAgreement(ctx context.Context, scope stores.Scope, agreementID string, query stores.AuditEventQuery) ([]stores.AuditEventRecord, error) {
	return listAuditEventRecords(ctx, s.tx, scope, agreementID, query)
}

func (s *relationalTxStore) GetAgreementArtifacts(ctx context.Context, scope stores.Scope, agreementID string) (stores.AgreementArtifactRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) (stores.AgreementArtifactRecord, error) {
		return mem.GetAgreementArtifacts(ctx, scope, agreementID)
	})
}

func (s *relationalTxStore) ListEmailLogs(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.EmailLogRecord, error) {
	return listEmailLogRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) GetJobRunByDedupe(ctx context.Context, scope stores.Scope, jobName, dedupeKey string) (stores.JobRunRecord, error) {
	return findJobRunByDedupeRecord(ctx, s.tx, scope, strings.TrimSpace(jobName), strings.TrimSpace(dedupeKey))
}

func (s *relationalTxStore) ListJobRuns(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.JobRunRecord, error) {
	return listJobRunRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) GetGoogleImportRun(ctx context.Context, scope stores.Scope, id string) (stores.GoogleImportRunRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) (stores.GoogleImportRunRecord, error) {
		return mem.GetGoogleImportRun(ctx, scope, id)
	})
}

func (s *relationalTxStore) ListGoogleImportRuns(ctx context.Context, scope stores.Scope, query stores.GoogleImportRunQuery) ([]stores.GoogleImportRunRecord, string, error) {
	return relationalReadCompat2(ctx, s, func(mem *stores.InMemoryStore) ([]stores.GoogleImportRunRecord, string, error) {
		return mem.ListGoogleImportRuns(ctx, scope, query)
	})
}

func (s *relationalTxStore) GetAgreementReminderState(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.AgreementReminderStateRecord, error) {
	return loadAgreementReminderStateRecord(ctx, s.tx, scope, agreementID, recipientID)
}

func (s *relationalTxStore) ListOutboxMessages(ctx context.Context, scope stores.Scope, query stores.OutboxQuery) ([]stores.OutboxMessageRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) ([]stores.OutboxMessageRecord, error) {
		return mem.ListOutboxMessages(ctx, scope, query)
	})
}

func (s *relationalTxStore) GetIntegrationCredential(ctx context.Context, scope stores.Scope, provider, userID string) (stores.IntegrationCredentialRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) (stores.IntegrationCredentialRecord, error) {
		return mem.GetIntegrationCredential(ctx, scope, provider, userID)
	})
}

func (s *relationalTxStore) ListIntegrationCredentials(ctx context.Context, scope stores.Scope, provider string, baseUserIDPrefix string) ([]stores.IntegrationCredentialRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) ([]stores.IntegrationCredentialRecord, error) {
		return mem.ListIntegrationCredentials(ctx, scope, provider, baseUserIDPrefix)
	})
}

func (s *relationalTxStore) GetMappingSpec(ctx context.Context, scope stores.Scope, id string) (stores.MappingSpecRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) (stores.MappingSpecRecord, error) {
		return mem.GetMappingSpec(ctx, scope, id)
	})
}

func (s *relationalTxStore) ListMappingSpecs(ctx context.Context, scope stores.Scope, provider string) ([]stores.MappingSpecRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) ([]stores.MappingSpecRecord, error) {
		return mem.ListMappingSpecs(ctx, scope, provider)
	})
}

func (s *relationalTxStore) GetIntegrationBindingByExternal(ctx context.Context, scope stores.Scope, provider, entityKind, externalID string) (stores.IntegrationBindingRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) (stores.IntegrationBindingRecord, error) {
		return mem.GetIntegrationBindingByExternal(ctx, scope, provider, entityKind, externalID)
	})
}

func (s *relationalTxStore) ListIntegrationBindings(ctx context.Context, scope stores.Scope, provider, entityKind, internalID string) ([]stores.IntegrationBindingRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) ([]stores.IntegrationBindingRecord, error) {
		return mem.ListIntegrationBindings(ctx, scope, provider, entityKind, internalID)
	})
}

func (s *relationalTxStore) GetIntegrationSyncRun(ctx context.Context, scope stores.Scope, id string) (stores.IntegrationSyncRunRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) (stores.IntegrationSyncRunRecord, error) {
		return mem.GetIntegrationSyncRun(ctx, scope, id)
	})
}

func (s *relationalTxStore) ListIntegrationSyncRuns(ctx context.Context, scope stores.Scope, provider string) ([]stores.IntegrationSyncRunRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) ([]stores.IntegrationSyncRunRecord, error) {
		return mem.ListIntegrationSyncRuns(ctx, scope, provider)
	})
}

func (s *relationalTxStore) ListIntegrationCheckpoints(ctx context.Context, scope stores.Scope, runID string) ([]stores.IntegrationCheckpointRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) ([]stores.IntegrationCheckpointRecord, error) {
		return mem.ListIntegrationCheckpoints(ctx, scope, runID)
	})
}

func (s *relationalTxStore) GetIntegrationConflict(ctx context.Context, scope stores.Scope, id string) (stores.IntegrationConflictRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) (stores.IntegrationConflictRecord, error) {
		return mem.GetIntegrationConflict(ctx, scope, id)
	})
}

func (s *relationalTxStore) ListIntegrationConflicts(ctx context.Context, scope stores.Scope, runID, status string) ([]stores.IntegrationConflictRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) ([]stores.IntegrationConflictRecord, error) {
		return mem.ListIntegrationConflicts(ctx, scope, runID, status)
	})
}

func (s *relationalTxStore) ListIntegrationChangeEvents(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.IntegrationChangeEventRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) ([]stores.IntegrationChangeEventRecord, error) {
		return mem.ListIntegrationChangeEvents(ctx, scope, agreementID)
	})
}

func (s *relationalTxStore) GetPlacementRun(ctx context.Context, scope stores.Scope, agreementID, runID string) (stores.PlacementRunRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) (stores.PlacementRunRecord, error) {
		return mem.GetPlacementRun(ctx, scope, agreementID, runID)
	})
}

func (s *relationalTxStore) ListPlacementRuns(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.PlacementRunRecord, error) {
	return relationalReadCompat(ctx, s, func(mem *stores.InMemoryStore) ([]stores.PlacementRunRecord, error) {
		return mem.ListPlacementRuns(ctx, scope, agreementID)
	})
}

func (s *relationalTxStore) Create(ctx context.Context, scope stores.Scope, record stores.DocumentRecord) (stores.DocumentRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.DocumentRecord{}, err
	}
	if strings.TrimSpace(record.SourceObjectKey) == "" {
		return stores.DocumentRecord{}, relationalInvalidRecordError("documents", "source_object_key", "required")
	}
	record.SourceOriginalName = strings.TrimSpace(record.SourceOriginalName)
	if record.SourceOriginalName == "" {
		return stores.DocumentRecord{}, relationalInvalidRecordError("documents", "source_original_name", "required")
	}
	record.SourceSHA256 = strings.TrimSpace(record.SourceSHA256)
	if record.SourceSHA256 == "" {
		return stores.DocumentRecord{}, relationalInvalidRecordError("documents", "source_sha256", "required")
	}
	record.NormalizedObjectKey = strings.TrimSpace(record.NormalizedObjectKey)
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.SourceType = strings.TrimSpace(record.SourceType)
	if record.SourceType == "" {
		record.SourceType = stores.SourceTypeUpload
	}
	if record.SourceType != stores.SourceTypeUpload && record.SourceType != stores.SourceTypeGoogleDrive {
		return stores.DocumentRecord{}, relationalInvalidRecordError("documents", "source_type", "unsupported source type")
	}
	record.SourceGoogleFileID = strings.TrimSpace(record.SourceGoogleFileID)
	record.SourceGoogleDocURL = strings.TrimSpace(record.SourceGoogleDocURL)
	record.CreatedByUserID = normalizeRelationalID(record.CreatedByUserID)
	record.SourceModifiedTime = cloneRelationalTimePtr(record.SourceModifiedTime)
	record.SourceExportedAt = cloneRelationalTimePtr(record.SourceExportedAt)
	record.SourceExportedByUserID = normalizeRelationalID(record.SourceExportedByUserID)
	record.SourceMimeType = strings.TrimSpace(record.SourceMimeType)
	record.SourceIngestionMode = strings.TrimSpace(record.SourceIngestionMode)
	record.PDFCompatibilityTier = strings.TrimSpace(record.PDFCompatibilityTier)
	record.PDFCompatibilityReason = strings.TrimSpace(record.PDFCompatibilityReason)
	record.PDFNormalizationStatus = strings.TrimSpace(record.PDFNormalizationStatus)
	record.PDFAnalyzedAt = cloneRelationalTimePtr(record.PDFAnalyzedAt)
	record.PDFPolicyVersion = strings.TrimSpace(record.PDFPolicyVersion)
	record.RemediationStatus = strings.TrimSpace(record.RemediationStatus)
	record.RemediationActorID = normalizeRelationalID(record.RemediationActorID)
	record.RemediationCommandID = strings.TrimSpace(record.RemediationCommandID)
	record.RemediationDispatchID = strings.TrimSpace(record.RemediationDispatchID)
	record.RemediationExecMode = strings.TrimSpace(record.RemediationExecMode)
	record.RemediationCorrelation = strings.TrimSpace(record.RemediationCorrelation)
	record.RemediationFailure = strings.TrimSpace(record.RemediationFailure)
	record.RemediationOriginalKey = strings.TrimSpace(record.RemediationOriginalKey)
	record.RemediationOutputKey = strings.TrimSpace(record.RemediationOutputKey)
	record.RemediationRequestedAt = cloneRelationalTimePtr(record.RemediationRequestedAt)
	record.RemediationStartedAt = cloneRelationalTimePtr(record.RemediationStartedAt)
	record.RemediationCompletedAt = cloneRelationalTimePtr(record.RemediationCompletedAt)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)

	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.DocumentRecord{}, relationalUniqueConstraintError(err, "documents", "id")
	}
	return record, nil
}

func (s *relationalTxStore) SaveMetadata(ctx context.Context, scope stores.Scope, id string, patch stores.DocumentMetadataPatch) (stores.DocumentRecord, error) {
	record, err := loadDocumentRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.DocumentRecord{}, err
	}
	next := record
	next.NormalizedObjectKey = strings.TrimSpace(patch.NormalizedObjectKey)
	next.PDFCompatibilityTier = strings.TrimSpace(patch.PDFCompatibilityTier)
	next.PDFCompatibilityReason = strings.TrimSpace(patch.PDFCompatibilityReason)
	next.PDFNormalizationStatus = strings.TrimSpace(patch.PDFNormalizationStatus)
	next.PDFAnalyzedAt = cloneRelationalTimePtr(patch.PDFAnalyzedAt)
	next.PDFPolicyVersion = strings.TrimSpace(patch.PDFPolicyVersion)
	next.RemediationStatus = strings.TrimSpace(patch.RemediationStatus)
	next.RemediationActorID = normalizeRelationalID(patch.RemediationActorID)
	next.RemediationCommandID = strings.TrimSpace(patch.RemediationCommandID)
	next.RemediationDispatchID = strings.TrimSpace(patch.RemediationDispatchID)
	next.RemediationExecMode = strings.TrimSpace(patch.RemediationExecMode)
	next.RemediationCorrelation = strings.TrimSpace(patch.RemediationCorrelation)
	next.RemediationFailure = strings.TrimSpace(patch.RemediationFailure)
	next.RemediationOriginalKey = strings.TrimSpace(patch.RemediationOriginalKey)
	next.RemediationOutputKey = strings.TrimSpace(patch.RemediationOutputKey)
	next.RemediationRequestedAt = cloneRelationalTimePtr(patch.RemediationRequestedAt)
	next.RemediationStartedAt = cloneRelationalTimePtr(patch.RemediationStartedAt)
	next.RemediationCompletedAt = cloneRelationalTimePtr(patch.RemediationCompletedAt)
	next.SizeBytes = patch.SizeBytes
	next.PageCount = patch.PageCount
	next.UpdatedAt = time.Now().UTC()
	if err := updateScopedModelByID(ctx, s.tx, &next, next.TenantID, next.OrgID, next.ID); err != nil {
		return stores.DocumentRecord{}, err
	}
	return next, nil
}

func (s *relationalTxStore) Delete(ctx context.Context, scope stores.Scope, id string) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return relationalInvalidRecordError("documents", "id", "required")
	}
	if _, err := loadDocumentRecord(ctx, s.tx, scope, id); err != nil {
		return err
	}
	count, err := s.tx.NewSelect().
		Model((*stores.AgreementRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("document_id = ?", id).
		Count(ctx)
	if err != nil {
		return err
	}
	if count > 0 {
		return relationalInvalidRecordError("documents", "id", "in use by agreements")
	}
	if _, err := s.tx.NewDelete().
		Model((*stores.DocumentRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Exec(ctx); err != nil {
		return err
	}
	return nil
}

func (s *relationalTxStore) AcquireDocumentRemediationLease(ctx context.Context, scope stores.Scope, documentID string, input stores.DocumentRemediationLeaseAcquireInput) (stores.DocumentRemediationLeaseClaim, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.DocumentRemediationLeaseClaim, error) {
		return tx.AcquireDocumentRemediationLease(ctx, scope, documentID, input)
	})
}

func (s *relationalTxStore) RenewDocumentRemediationLease(ctx context.Context, scope stores.Scope, documentID string, input stores.DocumentRemediationLeaseRenewInput) (stores.DocumentRemediationLeaseClaim, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.DocumentRemediationLeaseClaim, error) {
		return tx.RenewDocumentRemediationLease(ctx, scope, documentID, input)
	})
}

func (s *relationalTxStore) ReleaseDocumentRemediationLease(ctx context.Context, scope stores.Scope, documentID string, input stores.DocumentRemediationLeaseReleaseInput) error {
	return relationalExecCompat(ctx, s, func(tx stores.TxStore) error {
		return tx.ReleaseDocumentRemediationLease(ctx, scope, documentID, input)
	})
}

func (s *relationalTxStore) SaveRemediationDispatch(ctx context.Context, scope stores.Scope, record stores.RemediationDispatchRecord) (stores.RemediationDispatchRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.RemediationDispatchRecord, error) {
		return tx.SaveRemediationDispatch(ctx, scope, record)
	})
}

func (s *relationalTxStore) CreateDraft(ctx context.Context, scope stores.Scope, record stores.AgreementRecord) (stores.AgreementRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.DocumentID = normalizeRelationalID(record.DocumentID)
	if record.DocumentID == "" {
		return stores.AgreementRecord{}, relationalInvalidRecordError("agreements", "document_id", "required")
	}
	record.SourceType = strings.TrimSpace(record.SourceType)
	if record.SourceType == "" {
		record.SourceType = stores.SourceTypeUpload
	}
	if record.SourceType != stores.SourceTypeUpload && record.SourceType != stores.SourceTypeGoogleDrive {
		return stores.AgreementRecord{}, relationalInvalidRecordError("agreements", "source_type", "unsupported source type")
	}
	record.SourceGoogleFileID = strings.TrimSpace(record.SourceGoogleFileID)
	record.SourceGoogleDocURL = strings.TrimSpace(record.SourceGoogleDocURL)
	record.SourceModifiedTime = cloneRelationalTimePtr(record.SourceModifiedTime)
	record.SourceExportedAt = cloneRelationalTimePtr(record.SourceExportedAt)
	record.SourceExportedByUserID = normalizeRelationalID(record.SourceExportedByUserID)
	record.SourceMimeType = strings.TrimSpace(record.SourceMimeType)
	record.SourceIngestionMode = strings.TrimSpace(record.SourceIngestionMode)
	if record.Status == "" {
		record.Status = stores.AgreementStatusDraft
	}
	if record.Status != stores.AgreementStatusDraft {
		return stores.AgreementRecord{}, relationalInvalidRecordError("agreements", "status", "must start in draft")
	}
	if record.Version <= 0 {
		record.Version = 1
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.AgreementRecord{}, relationalUniqueConstraintError(err, "agreements", "id")
	}
	return record, nil
}

func (s *relationalTxStore) UpdateDraft(ctx context.Context, scope stores.Scope, id string, patch stores.AgreementDraftPatch, expectedVersion int64) (stores.AgreementRecord, error) {
	record, err := loadAgreementRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.AgreementRecord{}, err
	}
	if record.Status != stores.AgreementStatusDraft {
		return stores.AgreementRecord{}, relationalImmutableAgreementError(record.ID, record.Status)
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return stores.AgreementRecord{}, relationalVersionConflictError("agreements", id, expectedVersion, record.Version)
	}
	if patch.Title != nil {
		record.Title = strings.TrimSpace(*patch.Title)
	}
	if patch.Message != nil {
		record.Message = strings.TrimSpace(*patch.Message)
	}
	if patch.DocumentID != nil {
		record.DocumentID = normalizeRelationalID(*patch.DocumentID)
		if record.DocumentID == "" {
			return stores.AgreementRecord{}, relationalInvalidRecordError("agreements", "document_id", "required")
		}
	}
	record.Version++
	record.UpdatedAt = time.Now().UTC()
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.AgreementRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) Transition(ctx context.Context, scope stores.Scope, id string, input stores.AgreementTransitionInput) (stores.AgreementRecord, error) {
	record, err := loadAgreementRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.AgreementRecord{}, err
	}
	toStatus := strings.TrimSpace(input.ToStatus)
	if toStatus == "" {
		return stores.AgreementRecord{}, relationalInvalidRecordError("agreements", "status", "required")
	}
	if input.ExpectedVersion > 0 && record.Version != input.ExpectedVersion {
		return stores.AgreementRecord{}, relationalVersionConflictError("agreements", id, input.ExpectedVersion, record.Version)
	}
	now := time.Now().UTC()
	record.Status = toStatus
	record.UpdatedAt = now
	record.Version++
	switch toStatus {
	case stores.AgreementStatusSent:
		record.SentAt = cloneRelationalTimePtr(&now)
	case stores.AgreementStatusCompleted:
		record.CompletedAt = cloneRelationalTimePtr(&now)
	case stores.AgreementStatusVoided:
		record.VoidedAt = cloneRelationalTimePtr(&now)
	case stores.AgreementStatusDeclined:
		record.DeclinedAt = cloneRelationalTimePtr(&now)
	case stores.AgreementStatusExpired:
		record.ExpiredAt = cloneRelationalTimePtr(&now)
	}
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.AgreementRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) UpsertParticipantDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.ParticipantDraftPatch, expectedVersion int64) (stores.ParticipantRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.ParticipantRecord{}, err
	}
	agreementID = normalizeRelationalID(agreementID)
	if agreementID == "" {
		return stores.ParticipantRecord{}, relationalInvalidRecordError("participants", "agreement_id", "required")
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return stores.ParticipantRecord{}, err
	}
	if agreement.Status != stores.AgreementStatusDraft {
		return stores.ParticipantRecord{}, relationalImmutableAgreementError(agreement.ID, agreement.Status)
	}

	participantID := normalizeRelationalID(patch.ID)
	if participantID == "" {
		participantID = uuid.NewString()
	}

	record, err := loadParticipantRecord(ctx, s.tx, scope, agreementID, participantID)
	exists := err == nil
	if err != nil && !strings.Contains(err.Error(), "NOT_FOUND") {
		return stores.ParticipantRecord{}, err
	}
	if !exists {
		record = stores.ParticipantRecord{
			ID:           participantID,
			TenantID:     scope.TenantID,
			OrgID:        scope.OrgID,
			AgreementID:  agreementID,
			Role:         stores.RecipientRoleSigner,
			Notify:       true,
			SigningStage: 1,
			Version:      1,
			CreatedAt:    time.Now().UTC(),
		}
	} else if expectedVersion > 0 && record.Version != expectedVersion {
		return stores.ParticipantRecord{}, relationalVersionConflictError("participants", participantID, expectedVersion, record.Version)
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
	if patch.Notify != nil {
		record.Notify = *patch.Notify
	}
	if patch.SigningStage != nil {
		record.SigningStage = *patch.SigningStage
	}
	if record.Role == "" {
		record.Role = stores.RecipientRoleSigner
	}
	if record.Email == "" {
		return stores.ParticipantRecord{}, relationalInvalidRecordError("participants", "email", "required")
	}
	if record.Role != stores.RecipientRoleSigner && record.Role != stores.RecipientRoleCC {
		return stores.ParticipantRecord{}, relationalInvalidRecordError("participants", "role", "must be signer or cc")
	}
	if record.SigningStage <= 0 {
		return stores.ParticipantRecord{}, relationalInvalidRecordError("participants", "signing_stage", "must be positive")
	}
	record.UpdatedAt = time.Now().UTC()
	if exists {
		record.Version++
		if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
			return stores.ParticipantRecord{}, err
		}
		return record, nil
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.ParticipantRecord{}, relationalUniqueConstraintError(err, "participants", "id")
	}
	return record, nil
}

func (s *relationalTxStore) DeleteParticipantDraft(ctx context.Context, scope stores.Scope, agreementID, participantID string) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return err
	}
	if agreement.Status != stores.AgreementStatusDraft {
		return relationalImmutableAgreementError(agreementID, agreement.Status)
	}
	if _, err := loadParticipantRecord(ctx, s.tx, scope, agreementID, participantID); err != nil {
		return err
	}
	definitions, err := listFieldDefinitionRecords(ctx, s.tx, scope, agreementID)
	if err != nil {
		return err
	}
	for _, definition := range definitions {
		if normalizeRelationalID(definition.ParticipantID) != normalizeRelationalID(participantID) {
			continue
		}
		if _, err := s.tx.NewDelete().
			Model((*stores.FieldValueRecord)(nil)).
			Where("tenant_id = ?", scope.TenantID).
			Where("org_id = ?", scope.OrgID).
			Where("agreement_id = ?", agreementID).
			Where("field_id IN (SELECT id FROM field_instances WHERE tenant_id = ? AND org_id = ? AND agreement_id = ? AND field_definition_id = ?)", scope.TenantID, scope.OrgID, agreementID, definition.ID).
			Exec(ctx); err != nil {
			return err
		}
		if _, err := s.tx.NewDelete().
			Model((*stores.FieldInstanceRecord)(nil)).
			Where("tenant_id = ?", scope.TenantID).
			Where("org_id = ?", scope.OrgID).
			Where("agreement_id = ?", agreementID).
			Where("field_definition_id = ?", definition.ID).
			Exec(ctx); err != nil {
			return err
		}
		if _, err := s.tx.NewDelete().
			Model((*stores.FieldDefinitionRecord)(nil)).
			Where("tenant_id = ?", scope.TenantID).
			Where("org_id = ?", scope.OrgID).
			Where("agreement_id = ?", agreementID).
			Where("id = ?", definition.ID).
			Exec(ctx); err != nil {
			return err
		}
	}
	if _, err := s.tx.NewDelete().
		Model((*stores.FieldValueRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("recipient_id = ?", participantID).
		Exec(ctx); err != nil {
		return err
	}
	if _, err := s.tx.NewDelete().
		Model((*stores.ParticipantRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("id = ?", participantID).
		Exec(ctx); err != nil {
		return err
	}
	return nil
}

func (s *relationalTxStore) UpsertRecipientDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.RecipientDraftPatch, expectedVersion int64) (stores.RecipientRecord, error) {
	participantPatch := stores.ParticipantDraftPatch{
		ID:     patch.ID,
		Email:  patch.Email,
		Name:   patch.Name,
		Role:   patch.Role,
		Notify: patch.Notify,
	}
	if patch.SigningOrder != nil {
		participantPatch.SigningStage = patch.SigningOrder
	}
	record, err := s.UpsertParticipantDraft(ctx, scope, agreementID, participantPatch, expectedVersion)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	return relationalParticipantToRecipient(record), nil
}

func (s *relationalTxStore) DeleteRecipientDraft(ctx context.Context, scope stores.Scope, agreementID, recipientID string) error {
	return s.DeleteParticipantDraft(ctx, scope, agreementID, recipientID)
}

func (s *relationalTxStore) TouchRecipientView(ctx context.Context, scope stores.Scope, agreementID, recipientID string, viewedAt time.Time) (stores.RecipientRecord, error) {
	if viewedAt.IsZero() {
		viewedAt = time.Now().UTC()
	}
	record, err := loadParticipantRecord(ctx, s.tx, scope, agreementID, recipientID)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	if _, err := loadAgreementRecord(ctx, s.tx, scope, agreementID); err != nil {
		return stores.RecipientRecord{}, err
	}
	if record.FirstViewAt == nil {
		record.FirstViewAt = cloneRelationalTimePtr(&viewedAt)
	}
	record.LastViewAt = cloneRelationalTimePtr(&viewedAt)
	record.UpdatedAt = time.Now().UTC()
	record.Version++
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.RecipientRecord{}, err
	}
	return relationalParticipantToRecipient(record), nil
}

func (s *relationalTxStore) CompleteRecipient(ctx context.Context, scope stores.Scope, agreementID, recipientID string, completedAt time.Time, expectedVersion int64) (stores.RecipientRecord, error) {
	if completedAt.IsZero() {
		completedAt = time.Now().UTC()
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	if agreement.Status != stores.AgreementStatusSent && agreement.Status != stores.AgreementStatusInProgress {
		return stores.RecipientRecord{}, relationalInvalidSignerStateError("recipient completion requires sent or in_progress agreement status")
	}
	record, err := loadParticipantRecord(ctx, s.tx, scope, agreementID, recipientID)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return stores.RecipientRecord{}, relationalVersionConflictError("participants", recipientID, expectedVersion, record.Version)
	}
	record.CompletedAt = cloneRelationalTimePtr(&completedAt)
	record.UpdatedAt = time.Now().UTC()
	record.Version++
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.RecipientRecord{}, err
	}
	return relationalParticipantToRecipient(record), nil
}

func (s *relationalTxStore) DeclineRecipient(ctx context.Context, scope stores.Scope, agreementID, recipientID, reason string, declinedAt time.Time, expectedVersion int64) (stores.RecipientRecord, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return stores.RecipientRecord{}, relationalInvalidRecordError("participants", "decline_reason", "required")
	}
	if declinedAt.IsZero() {
		declinedAt = time.Now().UTC()
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	if agreement.Status != stores.AgreementStatusSent && agreement.Status != stores.AgreementStatusInProgress {
		return stores.RecipientRecord{}, relationalInvalidSignerStateError("recipient decline requires sent or in_progress agreement status")
	}
	record, err := loadParticipantRecord(ctx, s.tx, scope, agreementID, recipientID)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return stores.RecipientRecord{}, relationalVersionConflictError("participants", recipientID, expectedVersion, record.Version)
	}
	record.DeclinedAt = cloneRelationalTimePtr(&declinedAt)
	record.DeclineReason = reason
	record.UpdatedAt = time.Now().UTC()
	record.Version++
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.RecipientRecord{}, err
	}
	return relationalParticipantToRecipient(record), nil
}

func (s *relationalTxStore) UpsertFieldDefinitionDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldDefinitionDraftPatch) (stores.FieldDefinitionRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.FieldDefinitionRecord{}, err
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return stores.FieldDefinitionRecord{}, err
	}
	if agreement.Status != stores.AgreementStatusDraft {
		return stores.FieldDefinitionRecord{}, relationalImmutableAgreementError(agreementID, agreement.Status)
	}
	definitionID := normalizeRelationalID(patch.ID)
	if definitionID == "" {
		definitionID = uuid.NewString()
	}
	record, err := loadFieldDefinitionRecord(ctx, s.tx, scope, agreementID, definitionID)
	exists := err == nil
	if err != nil && !strings.Contains(err.Error(), "NOT_FOUND") {
		return stores.FieldDefinitionRecord{}, err
	}
	if !exists {
		record = stores.FieldDefinitionRecord{
			ID:             definitionID,
			TenantID:       scope.TenantID,
			OrgID:          scope.OrgID,
			AgreementID:    agreementID,
			Type:           stores.FieldTypeText,
			Required:       false,
			ValidationJSON: "",
			CreatedAt:      time.Now().UTC(),
		}
	}
	if patch.ParticipantID != nil {
		record.ParticipantID = normalizeRelationalID(*patch.ParticipantID)
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
	if record.Type == stores.FieldTypeDateSigned {
		record.Required = true
	}
	switch strings.TrimSpace(record.Type) {
	case stores.FieldTypeSignature, stores.FieldTypeName, stores.FieldTypeDateSigned, stores.FieldTypeText, stores.FieldTypeCheckbox, stores.FieldTypeInitials:
	default:
		return stores.FieldDefinitionRecord{}, relationalInvalidRecordError("field_definitions", "field_type", "unsupported type")
	}
	if record.ParticipantID == "" {
		return stores.FieldDefinitionRecord{}, relationalInvalidRecordError("field_definitions", "participant_id", "required")
	}
	participant, err := loadParticipantRecord(ctx, s.tx, scope, agreementID, record.ParticipantID)
	if err != nil {
		return stores.FieldDefinitionRecord{}, err
	}
	if participant.Role != stores.RecipientRoleSigner {
		return stores.FieldDefinitionRecord{}, relationalInvalidSignerStateError("field definitions cannot target cc participants")
	}
	record.UpdatedAt = time.Now().UTC()
	if exists {
		if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
			return stores.FieldDefinitionRecord{}, err
		}
		return record, nil
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.FieldDefinitionRecord{}, relationalUniqueConstraintError(err, "field_definitions", "id")
	}
	return record, nil
}

func (s *relationalTxStore) DeleteFieldDefinitionDraft(ctx context.Context, scope stores.Scope, agreementID, fieldDefinitionID string) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return err
	}
	if agreement.Status != stores.AgreementStatusDraft {
		return relationalImmutableAgreementError(agreementID, agreement.Status)
	}
	if _, err := loadFieldDefinitionRecord(ctx, s.tx, scope, agreementID, fieldDefinitionID); err != nil {
		return err
	}
	if _, err := s.tx.NewDelete().
		Model((*stores.FieldValueRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("field_id IN (SELECT id FROM field_instances WHERE tenant_id = ? AND org_id = ? AND agreement_id = ? AND field_definition_id = ?)", scope.TenantID, scope.OrgID, agreementID, fieldDefinitionID).
		Exec(ctx); err != nil {
		return err
	}
	if _, err := s.tx.NewDelete().
		Model((*stores.FieldInstanceRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("field_definition_id = ?", fieldDefinitionID).
		Exec(ctx); err != nil {
		return err
	}
	if _, err := s.tx.NewDelete().
		Model((*stores.FieldDefinitionRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("id = ?", fieldDefinitionID).
		Exec(ctx); err != nil {
		return err
	}
	return nil
}

func (s *relationalTxStore) UpsertFieldInstanceDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldInstanceDraftPatch) (stores.FieldInstanceRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.FieldInstanceRecord{}, err
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return stores.FieldInstanceRecord{}, err
	}
	if agreement.Status != stores.AgreementStatusDraft {
		return stores.FieldInstanceRecord{}, relationalImmutableAgreementError(agreementID, agreement.Status)
	}
	instanceID := normalizeRelationalID(patch.ID)
	if instanceID == "" {
		instanceID = uuid.NewString()
	}
	record, err := loadFieldInstanceRecord(ctx, s.tx, scope, agreementID, instanceID)
	exists := err == nil
	if err != nil && !strings.Contains(err.Error(), "NOT_FOUND") {
		return stores.FieldInstanceRecord{}, err
	}
	if !exists {
		record = stores.FieldInstanceRecord{
			ID:              instanceID,
			TenantID:        scope.TenantID,
			OrgID:           scope.OrgID,
			AgreementID:     agreementID,
			PageNumber:      1,
			Width:           150,
			Height:          32,
			TabIndex:        0,
			PlacementSource: stores.PlacementSourceManual,
			CreatedAt:       time.Now().UTC(),
		}
	}
	if patch.FieldDefinitionID != nil {
		record.FieldDefinitionID = normalizeRelationalID(*patch.FieldDefinitionID)
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
		record.PlacementRunID = normalizeRelationalID(*patch.PlacementRunID)
	}
	if patch.ManualOverride != nil {
		record.ManualOverride = *patch.ManualOverride
	}
	if patch.LinkGroupID != nil {
		record.LinkGroupID = strings.TrimSpace(*patch.LinkGroupID)
	}
	if patch.LinkedFromFieldID != nil {
		record.LinkedFromFieldID = normalizeRelationalID(*patch.LinkedFromFieldID)
	}
	if patch.IsUnlinked != nil {
		record.IsUnlinked = *patch.IsUnlinked
	}
	if record.FieldDefinitionID == "" {
		return stores.FieldInstanceRecord{}, relationalInvalidRecordError("field_instances", "field_definition_id", "required")
	}
	definition, err := loadFieldDefinitionRecord(ctx, s.tx, scope, agreementID, record.FieldDefinitionID)
	if err != nil {
		return stores.FieldInstanceRecord{}, err
	}
	if strings.TrimSpace(record.LinkGroupID) == "" {
		record.LinkGroupID = strings.TrimSpace(definition.LinkGroupID)
	}
	if record.PageNumber <= 0 {
		return stores.FieldInstanceRecord{}, relationalInvalidRecordError("field_instances", "page_number", "must be positive")
	}
	if record.Width <= 0 || record.Height <= 0 {
		return stores.FieldInstanceRecord{}, relationalInvalidRecordError("field_instances", "width|height", "must be positive")
	}
	if record.PlacementSource == "" {
		record.PlacementSource = stores.PlacementSourceManual
	}
	if record.PlacementSource != stores.PlacementSourceAuto &&
		record.PlacementSource != stores.PlacementSourceManual &&
		record.PlacementSource != stores.PlacementSourceAutoLinked {
		return stores.FieldInstanceRecord{}, relationalInvalidRecordError("field_instances", "placement_source", "must be auto, manual, or auto_linked")
	}
	if record.Confidence < 0 {
		record.Confidence = 0
	}
	if record.Confidence > 1 {
		record.Confidence = 1
	}
	record.UpdatedAt = time.Now().UTC()
	if exists {
		if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
			return stores.FieldInstanceRecord{}, err
		}
		return record, nil
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.FieldInstanceRecord{}, relationalUniqueConstraintError(err, "field_instances", "id")
	}
	return record, nil
}

func (s *relationalTxStore) DeleteFieldInstanceDraft(ctx context.Context, scope stores.Scope, agreementID, fieldInstanceID string) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return err
	}
	if agreement.Status != stores.AgreementStatusDraft {
		return relationalImmutableAgreementError(agreementID, agreement.Status)
	}
	instance, err := loadFieldInstanceRecord(ctx, s.tx, scope, agreementID, fieldInstanceID)
	if err != nil {
		return err
	}
	if _, err := s.tx.NewDelete().
		Model((*stores.FieldValueRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("field_id = ?", fieldInstanceID).
		Exec(ctx); err != nil {
		return err
	}
	if _, err := s.tx.NewDelete().
		Model((*stores.FieldInstanceRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("id = ?", fieldInstanceID).
		Exec(ctx); err != nil {
		return err
	}
	remaining, err := s.tx.NewSelect().
		Model((*stores.FieldInstanceRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("field_definition_id = ?", instance.FieldDefinitionID).
		Count(ctx)
	if err != nil {
		return err
	}
	if remaining == 0 {
		if _, err := s.tx.NewDelete().
			Model((*stores.FieldDefinitionRecord)(nil)).
			Where("tenant_id = ?", scope.TenantID).
			Where("org_id = ?", scope.OrgID).
			Where("agreement_id = ?", agreementID).
			Where("id = ?", instance.FieldDefinitionID).
			Exec(ctx); err != nil {
			return err
		}
	}
	return nil
}

func (s *relationalTxStore) UpsertFieldDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldDraftPatch) (stores.FieldRecord, error) {
	fieldID := normalizeRelationalID(patch.ID)
	definitionID := fieldID
	if fieldID != "" {
		instances, err := listFieldInstanceRecords(ctx, s.tx, scope, agreementID)
		if err == nil {
			for _, instance := range instances {
				if instance.ID == fieldID {
					definitionID = instance.FieldDefinitionID
					break
				}
			}
		}
	}
	definition, err := s.UpsertFieldDefinitionDraft(ctx, scope, agreementID, stores.FieldDefinitionDraftPatch{
		ID:            definitionID,
		ParticipantID: patch.RecipientID,
		Type:          patch.Type,
		Required:      patch.Required,
	})
	if err != nil {
		return stores.FieldRecord{}, err
	}
	instance, err := s.UpsertFieldInstanceDraft(ctx, scope, agreementID, stores.FieldInstanceDraftPatch{
		ID:                fieldID,
		FieldDefinitionID: &definition.ID,
		PageNumber:        patch.PageNumber,
		X:                 patch.PosX,
		Y:                 patch.PosY,
		Width:             patch.Width,
		Height:            patch.Height,
		PlacementSource:   patch.PlacementSource,
		LinkGroupID:       patch.LinkGroupID,
		LinkedFromFieldID: patch.LinkedFromFieldID,
		IsUnlinked:        patch.IsUnlinked,
	})
	if err != nil {
		return stores.FieldRecord{}, err
	}
	return stores.FieldRecord{
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
		PlacementSource:   instance.PlacementSource,
		LinkGroupID:       instance.LinkGroupID,
		LinkedFromFieldID: instance.LinkedFromFieldID,
		IsUnlinked:        instance.IsUnlinked,
		Required:          definition.Required,
		CreatedAt:         instance.CreatedAt,
		UpdatedAt:         instance.UpdatedAt,
	}, nil
}

func (s *relationalTxStore) DeleteFieldDraft(ctx context.Context, scope stores.Scope, agreementID, fieldID string) error {
	return s.DeleteFieldInstanceDraft(ctx, scope, agreementID, fieldID)
}

func (s *relationalTxStore) CreateDraftSession(ctx context.Context, scope stores.Scope, record stores.DraftRecord) (stores.DraftRecord, bool, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.DraftRecord{}, false, err
	}
	record.WizardID = strings.TrimSpace(record.WizardID)
	record.CreatedByUserID = normalizeRelationalID(record.CreatedByUserID)
	if record.WizardID == "" {
		return stores.DraftRecord{}, false, relationalInvalidRecordError("drafts", "wizard_id", "required")
	}
	if record.CreatedByUserID == "" {
		return stores.DraftRecord{}, false, relationalInvalidRecordError("drafts", "created_by_user_id", "required")
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.DocumentID = normalizeRelationalID(record.DocumentID)
	record.Title = strings.TrimSpace(record.Title)
	record.WizardStateJSON = strings.TrimSpace(record.WizardStateJSON)
	if record.WizardStateJSON == "" {
		record.WizardStateJSON = "{}"
	}
	if record.CurrentStep <= 0 {
		record.CurrentStep = 1
	}
	if record.CurrentStep > 6 {
		return stores.DraftRecord{}, false, relationalInvalidRecordError("drafts", "current_step", "must be between 1 and 6")
	}
	if record.Revision <= 0 {
		record.Revision = 1
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	if record.ExpiresAt.IsZero() {
		record.ExpiresAt = record.UpdatedAt.Add(relationalDefaultDraftTTL).UTC()
	} else {
		record.ExpiresAt = record.ExpiresAt.UTC()
	}
	referenceNow := record.UpdatedAt

	existing, err := findDraftByWizardRecord(ctx, s.tx, scope, record.CreatedByUserID, record.WizardID)
	if err == nil {
		if !existing.ExpiresAt.IsZero() && !existing.ExpiresAt.After(referenceNow) {
			if delErr := deleteScopedModelByID(ctx, s.tx, &existing, existing.TenantID, existing.OrgID, existing.ID); delErr != nil {
				return stores.DraftRecord{}, false, delErr
			}
		} else {
			existing.UpdatedAt = record.UpdatedAt
			existing.ExpiresAt = record.ExpiresAt
			if updErr := updateScopedModelByID(ctx, s.tx, &existing, existing.TenantID, existing.OrgID, existing.ID); updErr != nil {
				return stores.DraftRecord{}, false, updErr
			}
			return existing, true, nil
		}
	} else if !strings.Contains(err.Error(), "NOT_FOUND") {
		return stores.DraftRecord{}, false, err
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		if relationalUniqueConstraintError(err, "drafts", "id") != err {
			if replayed, reloadErr := findDraftByWizardRecord(ctx, s.tx, scope, record.CreatedByUserID, record.WizardID); reloadErr == nil {
				return replayed, true, nil
			}
		}
		return stores.DraftRecord{}, false, relationalUniqueConstraintError(err, "drafts", "id")
	}
	return record, false, nil
}

func (s *relationalTxStore) UpdateDraftSession(ctx context.Context, scope stores.Scope, id string, patch stores.DraftPatch, expectedRevision int64) (stores.DraftRecord, error) {
	record, err := loadDraftRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.DraftRecord{}, err
	}
	if expectedRevision <= 0 {
		return stores.DraftRecord{}, relationalInvalidRecordError("drafts", "expected_revision", "required")
	}
	if record.Revision != expectedRevision {
		return stores.DraftRecord{}, relationalVersionConflictError("drafts", id, expectedRevision, record.Revision)
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
			return stores.DraftRecord{}, relationalInvalidRecordError("drafts", "current_step", "must be between 1 and 6")
		}
		record.CurrentStep = *patch.CurrentStep
	}
	if patch.DocumentID != nil {
		record.DocumentID = normalizeRelationalID(*patch.DocumentID)
	}
	if patch.UpdatedAt != nil && !patch.UpdatedAt.IsZero() {
		record.UpdatedAt = patch.UpdatedAt.UTC()
	} else {
		record.UpdatedAt = time.Now().UTC()
	}
	if patch.ExpiresAt != nil && !patch.ExpiresAt.IsZero() {
		record.ExpiresAt = patch.ExpiresAt.UTC()
	} else if record.ExpiresAt.IsZero() {
		record.ExpiresAt = record.UpdatedAt.Add(relationalDefaultDraftTTL).UTC()
	}
	record.Revision++
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.DraftRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) DeleteDraftSession(ctx context.Context, scope stores.Scope, id string) error {
	record, err := loadDraftRecord(ctx, s.tx, scope, id)
	if err != nil {
		return err
	}
	if err := deleteScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return err
	}
	return nil
}

func (s *relationalTxStore) DeleteExpiredDraftSessions(ctx context.Context, before time.Time) (int, error) {
	if before.IsZero() {
		before = time.Now().UTC()
	}
	result, err := s.tx.NewDelete().
		Model((*stores.DraftRecord)(nil)).
		Where("expires_at <= ?", before.UTC()).
		Exec(ctx)
	if err != nil {
		return 0, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return int(rows), nil
}

func (s *relationalTxStore) UpsertFieldValue(ctx context.Context, scope stores.Scope, value stores.FieldValueRecord, expectedVersion int64) (stores.FieldValueRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.FieldValueRecord{}, err
	}
	value.AgreementID = normalizeRelationalID(value.AgreementID)
	value.RecipientID = normalizeRelationalID(value.RecipientID)
	value.FieldID = normalizeRelationalID(value.FieldID)
	value.SignatureArtifactID = normalizeRelationalID(value.SignatureArtifactID)
	if value.AgreementID == "" {
		return stores.FieldValueRecord{}, relationalInvalidRecordError("field_values", "agreement_id", "required")
	}
	if value.RecipientID == "" {
		return stores.FieldValueRecord{}, relationalInvalidRecordError("field_values", "recipient_id", "required")
	}
	if value.FieldID == "" {
		return stores.FieldValueRecord{}, relationalInvalidRecordError("field_values", "field_id", "required")
	}
	value.ID = normalizeRelationalID(value.ID)
	if value.ID == "" {
		value.ID = uuid.NewString()
	}
	value.TenantID = scope.TenantID
	value.OrgID = scope.OrgID

	existingByField, err := findFieldValueByLogicalKey(ctx, s.tx, scope, value.AgreementID, value.RecipientID, value.FieldID)
	hasByField := err == nil
	if err != nil && !strings.Contains(err.Error(), "NOT_FOUND") {
		return stores.FieldValueRecord{}, err
	}
	if hasByField && value.ID != existingByField.ID {
		value.ID = existingByField.ID
	}
	if value.SignatureArtifactID != "" {
		artifact, err := s.GetSignatureArtifact(ctx, scope, value.SignatureArtifactID)
		if err != nil {
			return stores.FieldValueRecord{}, err
		}
		if artifact.AgreementID != value.AgreementID || artifact.RecipientID != value.RecipientID {
			return stores.FieldValueRecord{}, relationalInvalidRecordError("field_values", "signature_artifact_id", "artifact does not belong to signer agreement scope")
		}
	}
	existing := stores.FieldValueRecord{}
	exists := false
	if hasByField {
		existing = existingByField
		exists = true
	}
	if exists {
		if expectedVersion > 0 && existing.Version != expectedVersion {
			return stores.FieldValueRecord{}, relationalVersionConflictError("field_values", value.ID, expectedVersion, existing.Version)
		}
		value.CreatedAt = existing.CreatedAt
		value.Version = existing.Version + 1
		value.UpdatedAt = time.Now().UTC()
		if err := updateScopedModelByID(ctx, s.tx, &value, value.TenantID, value.OrgID, value.ID); err != nil {
			return stores.FieldValueRecord{}, err
		}
		return value, nil
	}
	if value.Version <= 0 {
		value.Version = 1
	}
	value.CreatedAt = relationalTimeOrNow(value.CreatedAt)
	value.UpdatedAt = time.Now().UTC()
	if _, err := s.tx.NewInsert().Model(&value).Exec(ctx); err != nil {
		if relationalUniqueConstraintError(err, "field_values", "id") != err {
			reloaded, reloadErr := findFieldValueByLogicalKey(ctx, s.tx, scope, value.AgreementID, value.RecipientID, value.FieldID)
			if reloadErr == nil {
				return reloaded, nil
			}
		}
		return stores.FieldValueRecord{}, relationalUniqueConstraintError(err, "field_values", "id")
	}
	return value, nil
}

func (s *relationalTxStore) CreateSignatureArtifact(ctx context.Context, scope stores.Scope, record stores.SignatureArtifactRecord) (stores.SignatureArtifactRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SignatureArtifactRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.RecipientID = normalizeRelationalID(record.RecipientID)
	record.Type = strings.TrimSpace(record.Type)
	record.ObjectKey = strings.TrimSpace(record.ObjectKey)
	record.SHA256 = strings.TrimSpace(record.SHA256)
	if record.AgreementID == "" {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "agreement_id", "required")
	}
	if record.RecipientID == "" {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "recipient_id", "required")
	}
	if record.Type == "" {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "type", "required")
	}
	if record.ObjectKey == "" {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "object_key", "required")
	}
	if record.SHA256 == "" {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "sha256", "required")
	}
	if _, err := loadAgreementRecord(ctx, s.tx, scope, record.AgreementID); err != nil {
		return stores.SignatureArtifactRecord{}, err
	}
	participant, err := loadParticipantRecord(ctx, s.tx, scope, record.AgreementID, record.RecipientID)
	if err != nil {
		return stores.SignatureArtifactRecord{}, err
	}
	if participant.AgreementID != record.AgreementID {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "recipient_id", "recipient does not belong to agreement")
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SignatureArtifactRecord{}, relationalUniqueConstraintError(err, "signature_artifacts", "id")
	}
	return record, nil
}

func (s *relationalTxStore) CreateSigningToken(ctx context.Context, scope stores.Scope, record stores.SigningTokenRecord) (stores.SigningTokenRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SigningTokenRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.RecipientID = normalizeRelationalID(record.RecipientID)
	record.TokenHash = strings.TrimSpace(record.TokenHash)
	if record.AgreementID == "" {
		return stores.SigningTokenRecord{}, relationalInvalidRecordError("signing_tokens", "agreement_id", "required")
	}
	if record.RecipientID == "" {
		return stores.SigningTokenRecord{}, relationalInvalidRecordError("signing_tokens", "recipient_id", "required")
	}
	if record.TokenHash == "" {
		return stores.SigningTokenRecord{}, relationalInvalidRecordError("signing_tokens", "token_hash", "required")
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	if record.Status == "" {
		record.Status = stores.SigningTokenStatusActive
	}
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SigningTokenRecord{}, relationalUniqueConstraintError(err, "signing_tokens", "id|token_hash")
	}
	return record, nil
}

func (s *relationalTxStore) RevokeActiveSigningTokens(ctx context.Context, scope stores.Scope, agreementID, recipientID string, revokedAt time.Time) (int, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return 0, err
	}
	agreementID = normalizeRelationalID(agreementID)
	recipientID = normalizeRelationalID(recipientID)
	if agreementID == "" {
		return 0, relationalInvalidRecordError("signing_tokens", "agreement_id", "required")
	}
	if recipientID == "" {
		return 0, relationalInvalidRecordError("signing_tokens", "recipient_id", "required")
	}
	if revokedAt.IsZero() {
		revokedAt = time.Now().UTC()
	}
	result, err := s.tx.NewUpdate().
		Model((*stores.SigningTokenRecord)(nil)).
		Set("status = ?", stores.SigningTokenStatusRevoked).
		Set("revoked_at = ?", revokedAt.UTC()).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("recipient_id = ?", recipientID).
		Where("status = ?", stores.SigningTokenStatusActive).
		Exec(ctx)
	if err != nil {
		return 0, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return int(rows), nil
}

func (s *relationalTxStore) Append(ctx context.Context, scope stores.Scope, event stores.AuditEventRecord) (stores.AuditEventRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AuditEventRecord{}, err
	}
	event.ID = normalizeRelationalID(event.ID)
	if event.ID == "" {
		event.ID = uuid.NewString()
	}
	event.AgreementID = normalizeRelationalID(event.AgreementID)
	if event.AgreementID == "" {
		return stores.AuditEventRecord{}, relationalInvalidRecordError("audit_events", "agreement_id", "required")
	}
	if strings.TrimSpace(event.EventType) == "" {
		return stores.AuditEventRecord{}, relationalInvalidRecordError("audit_events", "event_type", "required")
	}
	event.TenantID = scope.TenantID
	event.OrgID = scope.OrgID
	event.CreatedAt = relationalTimeOrNow(event.CreatedAt)
	if _, err := s.tx.NewInsert().Model(&event).Exec(ctx); err != nil {
		return stores.AuditEventRecord{}, relationalUniqueConstraintError(err, "audit_events", "id")
	}
	return event, nil
}

func (s *relationalTxStore) SaveAgreementArtifacts(ctx context.Context, scope stores.Scope, record stores.AgreementArtifactRecord) (stores.AgreementArtifactRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	agreementID := normalizeRelationalID(record.AgreementID)
	if agreementID == "" {
		return stores.AgreementArtifactRecord{}, relationalInvalidRecordError("agreement_artifacts", "agreement_id", "required")
	}
	executedKey := strings.TrimSpace(record.ExecutedObjectKey)
	executedSHA := strings.TrimSpace(record.ExecutedSHA256)
	certKey := strings.TrimSpace(record.CertificateObjectKey)
	certSHA := strings.TrimSpace(record.CertificateSHA256)
	if (executedKey == "") != (executedSHA == "") {
		return stores.AgreementArtifactRecord{}, relationalInvalidRecordError("agreement_artifacts", "executed_object_key|executed_sha256", "must both be set")
	}
	if (certKey == "") != (certSHA == "") {
		return stores.AgreementArtifactRecord{}, relationalInvalidRecordError("agreement_artifacts", "certificate_object_key|certificate_sha256", "must both be set")
	}
	if _, err := loadAgreementRecord(ctx, s.tx, scope, agreementID); err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	current := stores.AgreementArtifactRecord{}
	err = s.tx.NewSelect().
		Model(&current).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Scan(ctx)
	exists := err == nil
	if err != nil && !strings.Contains(strings.ToLower(err.Error()), "no rows") {
		return stores.AgreementArtifactRecord{}, err
	}
	now := time.Now().UTC()
	if !exists {
		current = stores.AgreementArtifactRecord{
			AgreementID: agreementID,
			TenantID:    scope.TenantID,
			OrgID:       scope.OrgID,
			CreatedAt:   now,
		}
	}
	if current.ExecutedObjectKey, err = relationalMergeImmutableArtifactValue(current.ExecutedObjectKey, executedKey, "executed_object_key"); err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	if current.ExecutedSHA256, err = relationalMergeImmutableArtifactValue(current.ExecutedSHA256, executedSHA, "executed_sha256"); err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	if current.CertificateObjectKey, err = relationalMergeImmutableArtifactValue(current.CertificateObjectKey, certKey, "certificate_object_key"); err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	if current.CertificateSHA256, err = relationalMergeImmutableArtifactValue(current.CertificateSHA256, certSHA, "certificate_sha256"); err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	if correlationID := strings.TrimSpace(record.CorrelationID); correlationID != "" {
		current.CorrelationID = correlationID
	}
	current.UpdatedAt = now
	if exists {
		if err := updateScopedAgreementArtifact(ctx, s.tx, &current, current.TenantID, current.OrgID, current.AgreementID); err != nil {
			return stores.AgreementArtifactRecord{}, err
		}
		return current, nil
	}
	if _, err := s.tx.NewInsert().Model(&current).Exec(ctx); err != nil {
		return stores.AgreementArtifactRecord{}, relationalUniqueConstraintError(err, "agreement_artifacts", "agreement_id")
	}
	return current, nil
}

func (s *relationalTxStore) CreateEmailLog(ctx context.Context, scope stores.Scope, record stores.EmailLogRecord) (stores.EmailLogRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.EmailLogRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.RecipientID = normalizeRelationalID(record.RecipientID)
	record.TemplateCode = strings.TrimSpace(record.TemplateCode)
	record.ProviderMessageID = strings.TrimSpace(record.ProviderMessageID)
	record.Status = strings.TrimSpace(record.Status)
	if record.AgreementID == "" {
		return stores.EmailLogRecord{}, relationalInvalidRecordError("email_logs", "agreement_id", "required")
	}
	if record.TemplateCode == "" {
		return stores.EmailLogRecord{}, relationalInvalidRecordError("email_logs", "template_code", "required")
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
	record.NextRetryAt = cloneRelationalTimePtr(record.NextRetryAt)
	record.SentAt = cloneRelationalTimePtr(record.SentAt)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	if _, err := loadAgreementRecord(ctx, s.tx, scope, record.AgreementID); err != nil {
		return stores.EmailLogRecord{}, err
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.EmailLogRecord{}, relationalUniqueConstraintError(err, "email_logs", "id")
	}
	return record, nil
}

func (s *relationalTxStore) UpdateEmailLog(ctx context.Context, scope stores.Scope, id string, patch stores.EmailLogRecord) (stores.EmailLogRecord, error) {
	record, err := loadEmailLogRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.EmailLogRecord{}, err
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
		record.NextRetryAt = cloneRelationalTimePtr(patch.NextRetryAt)
	} else if record.Status == "sent" || record.Status == "failed" {
		record.NextRetryAt = nil
	}
	if patch.SentAt != nil {
		record.SentAt = cloneRelationalTimePtr(patch.SentAt)
	} else if record.Status == "sent" && record.SentAt == nil {
		now := time.Now().UTC()
		record.SentAt = cloneRelationalTimePtr(&now)
	}
	if record.Status == "sent" {
		record.FailureReason = ""
	}
	if patch.UpdatedAt.IsZero() {
		record.UpdatedAt = time.Now().UTC()
	} else {
		record.UpdatedAt = patch.UpdatedAt.UTC()
	}
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.EmailLogRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) BeginJobRun(ctx context.Context, scope stores.Scope, input stores.JobRunInput) (stores.JobRunRecord, bool, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.JobRunRecord{}, false, err
	}
	input.JobName = strings.TrimSpace(input.JobName)
	input.DedupeKey = strings.TrimSpace(input.DedupeKey)
	input.AgreementID = normalizeRelationalID(input.AgreementID)
	input.RecipientID = normalizeRelationalID(input.RecipientID)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if input.JobName == "" {
		return stores.JobRunRecord{}, false, relationalInvalidRecordError("job_runs", "job_name", "required")
	}
	if input.DedupeKey == "" {
		return stores.JobRunRecord{}, false, relationalInvalidRecordError("job_runs", "dedupe_key", "required")
	}
	if input.MaxAttempts <= 0 {
		input.MaxAttempts = 3
	}
	if input.AttemptedAt.IsZero() {
		input.AttemptedAt = time.Now().UTC()
	}
	input.AttemptedAt = input.AttemptedAt.UTC()
	if input.AgreementID != "" {
		if _, err := loadAgreementRecord(ctx, s.tx, scope, input.AgreementID); err != nil {
			return stores.JobRunRecord{}, false, err
		}
	}
	record, err := findJobRunByDedupeRecord(ctx, s.tx, scope, input.JobName, input.DedupeKey)
	if err == nil {
		if record.Status == stores.JobRunStatusSucceeded {
			return record, false, nil
		}
		if record.Status == stores.JobRunStatusRetrying && record.NextRetryAt != nil && input.AttemptedAt.Before(record.NextRetryAt.UTC()) {
			return record, false, nil
		}
		if record.AttemptCount >= record.MaxAttempts && record.Status == stores.JobRunStatusFailed {
			return record, false, nil
		}
		record.AttemptCount++
		record.Status = stores.JobRunStatusPending
		record.LastError = ""
		record.NextRetryAt = nil
		if input.CorrelationID != "" {
			record.CorrelationID = input.CorrelationID
		}
		record.UpdatedAt = input.AttemptedAt
		if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
			return stores.JobRunRecord{}, false, err
		}
		return record, true, nil
	}
	if !strings.Contains(err.Error(), "NOT_FOUND") {
		return stores.JobRunRecord{}, false, err
	}
	record = stores.JobRunRecord{
		ID:            uuid.NewString(),
		TenantID:      scope.TenantID,
		OrgID:         scope.OrgID,
		JobName:       input.JobName,
		DedupeKey:     input.DedupeKey,
		AgreementID:   input.AgreementID,
		RecipientID:   input.RecipientID,
		CorrelationID: input.CorrelationID,
		Status:        stores.JobRunStatusPending,
		AttemptCount:  1,
		MaxAttempts:   input.MaxAttempts,
		CreatedAt:     input.AttemptedAt,
		UpdatedAt:     input.AttemptedAt,
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		if relationalUniqueConstraintError(err, "job_runs", "dedupe_key") != err {
			reloaded, reloadErr := findJobRunByDedupeRecord(ctx, s.tx, scope, input.JobName, input.DedupeKey)
			if reloadErr == nil {
				return reloaded, false, nil
			}
		}
		return stores.JobRunRecord{}, false, relationalUniqueConstraintError(err, "job_runs", "id|dedupe_key")
	}
	return record, true, nil
}

func (s *relationalTxStore) MarkJobRunSucceeded(ctx context.Context, scope stores.Scope, id string, completedAt time.Time) (stores.JobRunRecord, error) {
	if completedAt.IsZero() {
		completedAt = time.Now().UTC()
	}
	record, err := loadJobRunRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.JobRunRecord{}, err
	}
	record.Status = stores.JobRunStatusSucceeded
	record.LastError = ""
	record.NextRetryAt = nil
	record.UpdatedAt = completedAt.UTC()
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.JobRunRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) MarkJobRunFailed(ctx context.Context, scope stores.Scope, id, failureReason string, nextRetryAt *time.Time, failedAt time.Time) (stores.JobRunRecord, error) {
	if failedAt.IsZero() {
		failedAt = time.Now().UTC()
	}
	record, err := loadJobRunRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.JobRunRecord{}, err
	}
	failureReason = strings.TrimSpace(failureReason)
	if failureReason == "" {
		failureReason = "job failed"
	}
	record.LastError = failureReason
	if nextRetryAt != nil && record.AttemptCount < record.MaxAttempts {
		next := nextRetryAt.UTC()
		record.Status = stores.JobRunStatusRetrying
		record.NextRetryAt = &next
	} else {
		record.Status = stores.JobRunStatusFailed
		record.NextRetryAt = nil
	}
	record.UpdatedAt = failedAt.UTC()
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.JobRunRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) BeginGoogleImportRun(ctx context.Context, scope stores.Scope, input stores.GoogleImportRunInput) (stores.GoogleImportRunRecord, bool, error) {
	return relationalWriteCompat2(ctx, s, func(tx stores.TxStore) (stores.GoogleImportRunRecord, bool, error) {
		return tx.BeginGoogleImportRun(ctx, scope, input)
	})
}

func (s *relationalTxStore) MarkGoogleImportRunRunning(ctx context.Context, scope stores.Scope, id string, startedAt time.Time) (stores.GoogleImportRunRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.GoogleImportRunRecord, error) {
		return tx.MarkGoogleImportRunRunning(ctx, scope, id, startedAt)
	})
}

func (s *relationalTxStore) MarkGoogleImportRunSucceeded(ctx context.Context, scope stores.Scope, id string, input stores.GoogleImportRunSuccessInput) (stores.GoogleImportRunRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.GoogleImportRunRecord, error) {
		return tx.MarkGoogleImportRunSucceeded(ctx, scope, id, input)
	})
}

func (s *relationalTxStore) MarkGoogleImportRunFailed(ctx context.Context, scope stores.Scope, id string, input stores.GoogleImportRunFailureInput) (stores.GoogleImportRunRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.GoogleImportRunRecord, error) {
		return tx.MarkGoogleImportRunFailed(ctx, scope, id, input)
	})
}

func (s *relationalTxStore) UpsertAgreementReminderState(ctx context.Context, scope stores.Scope, record stores.AgreementReminderStateRecord) (stores.AgreementReminderStateRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderStateRecord, error) {
		return tx.UpsertAgreementReminderState(ctx, scope, record)
	})
}

func (s *relationalTxStore) ClaimDueAgreementReminders(ctx context.Context, scope stores.Scope, input stores.AgreementReminderClaimInput) ([]stores.AgreementReminderClaim, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) ([]stores.AgreementReminderClaim, error) {
		return tx.ClaimDueAgreementReminders(ctx, scope, input)
	})
}

func (s *relationalTxStore) RenewAgreementReminderLease(ctx context.Context, scope stores.Scope, agreementID, recipientID string, input stores.AgreementReminderLeaseRenewInput) (stores.AgreementReminderClaim, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderClaim, error) {
		return tx.RenewAgreementReminderLease(ctx, scope, agreementID, recipientID, input)
	})
}

func (s *relationalTxStore) MarkAgreementReminderSent(ctx context.Context, scope stores.Scope, agreementID, recipientID string, input stores.AgreementReminderMarkInput) (stores.AgreementReminderStateRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderStateRecord, error) {
		return tx.MarkAgreementReminderSent(ctx, scope, agreementID, recipientID, input)
	})
}

func (s *relationalTxStore) MarkAgreementReminderSkipped(ctx context.Context, scope stores.Scope, agreementID, recipientID string, input stores.AgreementReminderMarkInput) (stores.AgreementReminderStateRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderStateRecord, error) {
		return tx.MarkAgreementReminderSkipped(ctx, scope, agreementID, recipientID, input)
	})
}

func (s *relationalTxStore) MarkAgreementReminderFailed(ctx context.Context, scope stores.Scope, agreementID, recipientID string, input stores.AgreementReminderMarkInput) (stores.AgreementReminderStateRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderStateRecord, error) {
		return tx.MarkAgreementReminderFailed(ctx, scope, agreementID, recipientID, input)
	})
}

func (s *relationalTxStore) PauseAgreementReminder(ctx context.Context, scope stores.Scope, agreementID, recipientID string, pausedAt time.Time) (stores.AgreementReminderStateRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderStateRecord, error) {
		return tx.PauseAgreementReminder(ctx, scope, agreementID, recipientID, pausedAt)
	})
}

func (s *relationalTxStore) ResumeAgreementReminder(ctx context.Context, scope stores.Scope, agreementID, recipientID string, resumedAt time.Time, nextDueAt *time.Time) (stores.AgreementReminderStateRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderStateRecord, error) {
		return tx.ResumeAgreementReminder(ctx, scope, agreementID, recipientID, resumedAt, nextDueAt)
	})
}

func (s *relationalTxStore) CleanupAgreementReminderInternalErrors(ctx context.Context, scope stores.Scope, now time.Time, limit int) (int, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (int, error) {
		return tx.CleanupAgreementReminderInternalErrors(ctx, scope, now, limit)
	})
}

func (s *relationalTxStore) EnqueueOutboxMessage(ctx context.Context, scope stores.Scope, record stores.OutboxMessageRecord) (stores.OutboxMessageRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.OutboxMessageRecord, error) {
		return tx.EnqueueOutboxMessage(ctx, scope, record)
	})
}

func (s *relationalTxStore) ClaimOutboxMessages(ctx context.Context, scope stores.Scope, input stores.OutboxClaimInput) ([]stores.OutboxMessageRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) ([]stores.OutboxMessageRecord, error) {
		return tx.ClaimOutboxMessages(ctx, scope, input)
	})
}

func (s *relationalTxStore) MarkOutboxMessageSucceeded(ctx context.Context, scope stores.Scope, id string, publishedAt time.Time) (stores.OutboxMessageRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.OutboxMessageRecord, error) {
		return tx.MarkOutboxMessageSucceeded(ctx, scope, id, publishedAt)
	})
}

func (s *relationalTxStore) MarkOutboxMessageFailed(ctx context.Context, scope stores.Scope, id, failureReason string, nextAttemptAt *time.Time, failedAt time.Time) (stores.OutboxMessageRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.OutboxMessageRecord, error) {
		return tx.MarkOutboxMessageFailed(ctx, scope, id, failureReason, nextAttemptAt, failedAt)
	})
}

func (s *relationalTxStore) UpsertIntegrationCredential(ctx context.Context, scope stores.Scope, record stores.IntegrationCredentialRecord) (stores.IntegrationCredentialRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.IntegrationCredentialRecord, error) {
		return tx.UpsertIntegrationCredential(ctx, scope, record)
	})
}

func (s *relationalTxStore) DeleteIntegrationCredential(ctx context.Context, scope stores.Scope, provider, userID string) error {
	return relationalExecCompat(ctx, s, func(tx stores.TxStore) error {
		return tx.DeleteIntegrationCredential(ctx, scope, provider, userID)
	})
}

func (s *relationalTxStore) UpsertMappingSpec(ctx context.Context, scope stores.Scope, record stores.MappingSpecRecord) (stores.MappingSpecRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.MappingSpecRecord, error) {
		return tx.UpsertMappingSpec(ctx, scope, record)
	})
}

func (s *relationalTxStore) PublishMappingSpec(ctx context.Context, scope stores.Scope, id string, expectedVersion int64, publishedAt time.Time) (stores.MappingSpecRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.MappingSpecRecord, error) {
		return tx.PublishMappingSpec(ctx, scope, id, expectedVersion, publishedAt)
	})
}

func (s *relationalTxStore) UpsertIntegrationBinding(ctx context.Context, scope stores.Scope, record stores.IntegrationBindingRecord) (stores.IntegrationBindingRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.IntegrationBindingRecord, error) {
		return tx.UpsertIntegrationBinding(ctx, scope, record)
	})
}

func (s *relationalTxStore) CreateIntegrationSyncRun(ctx context.Context, scope stores.Scope, record stores.IntegrationSyncRunRecord) (stores.IntegrationSyncRunRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.IntegrationSyncRunRecord, error) {
		return tx.CreateIntegrationSyncRun(ctx, scope, record)
	})
}

func (s *relationalTxStore) UpdateIntegrationSyncRunStatus(ctx context.Context, scope stores.Scope, id, status, lastError, cursor string, completedAt *time.Time, expectedVersion int64) (stores.IntegrationSyncRunRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.IntegrationSyncRunRecord, error) {
		return tx.UpdateIntegrationSyncRunStatus(ctx, scope, id, status, lastError, cursor, completedAt, expectedVersion)
	})
}

func (s *relationalTxStore) UpsertIntegrationCheckpoint(ctx context.Context, scope stores.Scope, record stores.IntegrationCheckpointRecord) (stores.IntegrationCheckpointRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.IntegrationCheckpointRecord, error) {
		return tx.UpsertIntegrationCheckpoint(ctx, scope, record)
	})
}

func (s *relationalTxStore) CreateIntegrationConflict(ctx context.Context, scope stores.Scope, record stores.IntegrationConflictRecord) (stores.IntegrationConflictRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.IntegrationConflictRecord, error) {
		return tx.CreateIntegrationConflict(ctx, scope, record)
	})
}

func (s *relationalTxStore) ResolveIntegrationConflict(ctx context.Context, scope stores.Scope, id, status, resolutionJSON, resolvedByUserID string, resolvedAt time.Time, expectedVersion int64) (stores.IntegrationConflictRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.IntegrationConflictRecord, error) {
		return tx.ResolveIntegrationConflict(ctx, scope, id, status, resolutionJSON, resolvedByUserID, resolvedAt, expectedVersion)
	})
}

func (s *relationalTxStore) AppendIntegrationChangeEvent(ctx context.Context, scope stores.Scope, record stores.IntegrationChangeEventRecord) (stores.IntegrationChangeEventRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.IntegrationChangeEventRecord, error) {
		return tx.AppendIntegrationChangeEvent(ctx, scope, record)
	})
}

func (s *relationalTxStore) ClaimIntegrationMutation(ctx context.Context, scope stores.Scope, idempotencyKey string, firstSeenAt time.Time) (bool, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (bool, error) {
		return tx.ClaimIntegrationMutation(ctx, scope, idempotencyKey, firstSeenAt)
	})
}

func (s *relationalTxStore) UpsertPlacementRun(ctx context.Context, scope stores.Scope, record stores.PlacementRunRecord) (stores.PlacementRunRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.PlacementRunRecord, error) {
		return tx.UpsertPlacementRun(ctx, scope, record)
	})
}

func (s *relationalTxStore) UpsertSignerProfile(ctx context.Context, scope stores.Scope, record stores.SignerProfileRecord) (stores.SignerProfileRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.SignerProfileRecord, error) {
		return tx.UpsertSignerProfile(ctx, scope, record)
	})
}

func (s *relationalTxStore) DeleteSignerProfile(ctx context.Context, scope stores.Scope, subject, key string) error {
	return relationalExecCompat(ctx, s, func(tx stores.TxStore) error {
		return tx.DeleteSignerProfile(ctx, scope, subject, key)
	})
}

func (s *relationalTxStore) CreateSavedSignerSignature(ctx context.Context, scope stores.Scope, record stores.SavedSignerSignatureRecord) (stores.SavedSignerSignatureRecord, error) {
	return relationalWriteCompat(ctx, s, func(tx stores.TxStore) (stores.SavedSignerSignatureRecord, error) {
		return tx.CreateSavedSignerSignature(ctx, scope, record)
	})
}

func (s *relationalTxStore) DeleteSavedSignerSignature(ctx context.Context, scope stores.Scope, subject, id string) error {
	return relationalExecCompat(ctx, s, func(tx stores.TxStore) error {
		return tx.DeleteSavedSignerSignature(ctx, scope, subject, id)
	})
}
