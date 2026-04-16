package persistence

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/internal/primitives"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/uptrace/bun"
)

type runtimeRelationalStoreSync struct {
	dialect Dialect
	factory *RepositoryFactory
	sqlDB   *sql.DB
}

func newRuntimeRelationalStoreSync(bootstrap *BootstrapResult) (*runtimeRelationalStoreSync, error) {
	if bootstrap == nil {
		return nil, fmt.Errorf("runtime relational store sync: bootstrap result is required")
	}
	if bootstrap.BunDB == nil {
		return nil, fmt.Errorf("runtime relational store sync: bun db is required")
	}
	factory, err := NewRepositoryFactoryFromDB(bootstrap.BunDB)
	if err != nil {
		return nil, fmt.Errorf("runtime relational store sync: repository factory: %w", err)
	}
	return &runtimeRelationalStoreSync{
		dialect: bootstrap.Dialect,
		factory: factory,
		sqlDB:   bootstrap.SQLDB,
	}, nil
}

func (b *runtimeRelationalStoreSync) LoadPayload(ctx context.Context) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	snapshot, err := b.loadSnapshot(ctx)
	if err != nil {
		return nil, err
	}
	validateErr := validateRuntimeSnapshot(snapshot)
	if validateErr != nil {
		return nil, validateErr
	}
	payload, err := json.Marshal(snapshot)
	if err != nil {
		return nil, fmt.Errorf("runtime relational store sync: encode runtime snapshot: %w", err)
	}
	return payload, nil
}

func (b *runtimeRelationalStoreSync) PersistPayload(ctx context.Context, payload []byte) error {
	if b == nil || b.sqlDB == nil {
		return fmt.Errorf("runtime relational store sync: sql db is required")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	payload = []byte(strings.TrimSpace(string(payload)))
	snapshot := runtimeStoreSnapshot{}
	if len(payload) > 0 {
		if err := json.Unmarshal(payload, &snapshot); err != nil {
			return fmt.Errorf("runtime relational store sync: decode runtime snapshot: %w", err)
		}
	}
	if err := validateRuntimeSnapshot(snapshot); err != nil {
		return err
	}
	return b.persistSnapshot(ctx, snapshot)
}

func (b *runtimeRelationalStoreSync) loadSnapshot(ctx context.Context) (runtimeStoreSnapshot, error) {
	return b.loadSnapshotWithIDB(ctx, nil)
}

func (b *runtimeRelationalStoreSync) loadSnapshotWithIDB(ctx context.Context, idb bun.IDB) (runtimeStoreSnapshot, error) {
	snapshot := newRuntimeStoreSnapshot()
	if b == nil || b.factory == nil {
		return snapshot, nil
	}
	if err := b.loadSnapshotCoreRecords(ctx, idb, &snapshot); err != nil {
		return snapshot, err
	}
	if err := b.loadSnapshotAgreementRecords(ctx, idb, &snapshot); err != nil {
		return snapshot, err
	}
	if err := b.loadSnapshotAsyncRecords(ctx, idb, &snapshot); err != nil {
		return snapshot, err
	}
	return snapshot, nil
}

func newRuntimeStoreSnapshot() runtimeStoreSnapshot {
	return runtimeStoreSnapshot{
		Documents:                  map[string]stores.DocumentRecord{},
		SourceDocuments:            map[string]stores.SourceDocumentRecord{},
		SourceHandles:              map[string]stores.SourceHandleRecord{},
		SourceRevisions:            map[string]stores.SourceRevisionRecord{},
		SourceArtifacts:            map[string]stores.SourceArtifactRecord{},
		SourceFingerprints:         map[string]stores.SourceFingerprintRecord{},
		SourceRelationships:        map[string]stores.SourceRelationshipRecord{},
		Agreements:                 map[string]stores.AgreementRecord{},
		Drafts:                     map[string]stores.DraftRecord{},
		DraftWizardIndex:           map[string]string{},
		DocumentRemediationLeases:  map[string]stores.DocumentRemediationLeaseRecord{},
		RemediationDispatches:      map[string]stores.RemediationDispatchRecord{},
		RemediationDispatchIndex:   map[string]string{},
		Participants:               map[string]stores.ParticipantRecord{},
		FieldDefinitions:           map[string]stores.FieldDefinitionRecord{},
		FieldInstances:             map[string]stores.FieldInstanceRecord{},
		Recipients:                 map[string]stores.RecipientRecord{},
		Fields:                     map[string]stores.FieldRecord{},
		SigningTokens:              map[string]stores.SigningTokenRecord{},
		TokenHashIndex:             map[string]string{},
		SignatureArtifacts:         map[string]stores.SignatureArtifactRecord{},
		SignerProfiles:             map[string]stores.SignerProfileRecord{},
		SignerProfileIndex:         map[string]string{},
		SavedSignerSignatures:      map[string]stores.SavedSignerSignatureRecord{},
		FieldValues:                map[string]stores.FieldValueRecord{},
		DraftAuditEvents:           map[string]stores.DraftAuditEventRecord{},
		AuditEvents:                map[string]stores.AuditEventRecord{},
		AgreementArtifacts:         map[string]stores.AgreementArtifactRecord{},
		EmailLogs:                  map[string]stores.EmailLogRecord{},
		JobRuns:                    map[string]stores.JobRunRecord{},
		JobRunDedupeIndex:          map[string]string{},
		GoogleImportRuns:           map[string]stores.GoogleImportRunRecord{},
		GoogleImportRunDedupeIndex: map[string]string{},
		AgreementReminderStates:    map[string]stores.AgreementReminderStateRecord{},
		OutboxMessages:             map[string]stores.OutboxMessageRecord{},
		IntegrationCredentials:     map[string]stores.IntegrationCredentialRecord{},
		IntegrationCredentialIndex: map[string]string{},
		MappingSpecs:               map[string]stores.MappingSpecRecord{},
		IntegrationBindings:        map[string]stores.IntegrationBindingRecord{},
		IntegrationBindingIndex:    map[string]string{},
		IntegrationSyncRuns:        map[string]stores.IntegrationSyncRunRecord{},
		IntegrationCheckpoints:     map[string]stores.IntegrationCheckpointRecord{},
		IntegrationCheckpointIndex: map[string]string{},
		IntegrationConflicts:       map[string]stores.IntegrationConflictRecord{},
		IntegrationChangeEvents:    map[string]stores.IntegrationChangeEventRecord{},
		IntegrationMutationClaims:  map[string]time.Time{},
		PlacementRuns:              map[string]stores.PlacementRunRecord{},
	}
}

func (b *runtimeRelationalStoreSync) loadSnapshotCoreRecords(ctx context.Context, idb bun.IDB, snapshot *runtimeStoreSnapshot) error {
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.Documents(), "documents", func(record *stores.DocumentRecord) {
		snapshot.Documents[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.SourceDocuments(), "source documents", func(record *stores.SourceDocumentRecord) {
		snapshot.SourceDocuments[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.SourceHandles(), "source handles", func(record *stores.SourceHandleRecord) {
		snapshot.SourceHandles[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.SourceRevisions(), "source revisions", func(record *stores.SourceRevisionRecord) {
		snapshot.SourceRevisions[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.SourceArtifacts(), "source artifacts", func(record *stores.SourceArtifactRecord) {
		snapshot.SourceArtifacts[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.SourceFingerprints(), "source fingerprints", func(record *stores.SourceFingerprintRecord) {
		snapshot.SourceFingerprints[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.SourceRelationships(), "source relationships", func(record *stores.SourceRelationshipRecord) {
		snapshot.SourceRelationships[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.Agreements(), "agreements", func(record *stores.AgreementRecord) {
		snapshot.Agreements[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.Drafts(), "drafts", func(record *stores.DraftRecord) {
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.Drafts[scopedID] = *record
		snapshot.DraftWizardIndex[draftWizardIndexForKey(record.TenantID, record.OrgID, record.CreatedByUserID, record.WizardID)] = strings.TrimSpace(record.ID)
	}); err != nil {
		return err
	}
	leases, err := listDocumentRemediationLeases(ctx, idbOrDB(idb, b.factory.DB()))
	if err != nil {
		return fmt.Errorf("runtime relational store sync: list document remediation leases: %w", err)
	}
	for _, record := range leases {
		snapshot.DocumentRemediationLeases[scopeRecordKey(record.TenantID, record.OrgID, record.DocumentID)] = record
	}
	dispatches, err := listRemediationDispatches(ctx, idbOrDB(idb, b.factory.DB()))
	if err != nil {
		return fmt.Errorf("runtime relational store sync: list remediation dispatches: %w", err)
	}
	for _, record := range dispatches {
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.DispatchID)
		snapshot.RemediationDispatches[scopedID] = record
		if key := strings.TrimSpace(record.IdempotencyKey); key != "" {
			snapshot.RemediationDispatchIndex[scopeRecordKey(record.TenantID, record.OrgID, key)] = strings.TrimSpace(record.DispatchID)
		}
	}
	return nil
}

func (b *runtimeRelationalStoreSync) loadSnapshotAgreementRecords(ctx context.Context, idb bun.IDB, snapshot *runtimeStoreSnapshot) error {
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.Recipients(), "recipients", func(record *stores.RecipientRecord) {
		snapshot.Recipients[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.Participants(), "participants", func(record *stores.ParticipantRecord) {
		snapshot.Participants[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.Fields(), "fields", func(record *stores.FieldRecord) {
		snapshot.Fields[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.FieldDefinitions(), "field definitions", func(record *stores.FieldDefinitionRecord) {
		snapshot.FieldDefinitions[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.FieldInstances(), "field instances", func(record *stores.FieldInstanceRecord) {
		snapshot.FieldInstances[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := b.loadSnapshotSigningRecords(ctx, idb, snapshot); err != nil {
		return err
	}
	if err := b.loadSnapshotAuditRecords(ctx, idb, snapshot); err != nil {
		return err
	}
	return nil
}

func (b *runtimeRelationalStoreSync) loadSnapshotSigningRecords(ctx context.Context, idb bun.IDB, snapshot *runtimeStoreSnapshot) error {
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.SigningTokens(), "signing tokens", func(record *stores.SigningTokenRecord) {
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.SigningTokens[scopedID] = *record
		hash := strings.TrimSpace(record.TokenHash)
		if hash != "" {
			snapshot.TokenHashIndex[hash] = scopedID
		}
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.SignatureArtifacts(), "signature artifacts", func(record *stores.SignatureArtifactRecord) {
		snapshot.SignatureArtifacts[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.SignerProfiles(), "signer profiles", func(record *stores.SignerProfileRecord) {
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.SignerProfiles[scopedID] = *record
		snapshot.SignerProfileIndex[signerProfileIndexForKey(record.TenantID, record.OrgID, record.Subject, record.Key)] = strings.TrimSpace(record.ID)
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.SavedSignerSignatures(), "saved signatures", func(record *stores.SavedSignerSignatureRecord) {
		snapshot.SavedSignerSignatures[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.FieldValues(), "field values", func(record *stores.FieldValueRecord) {
		snapshot.FieldValues[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	return nil
}

func (b *runtimeRelationalStoreSync) loadSnapshotAuditRecords(ctx context.Context, idb bun.IDB, snapshot *runtimeStoreSnapshot) error {
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.DraftAuditEvents(), "draft audit events", func(record *stores.DraftAuditEventRecord) {
		snapshot.DraftAuditEvents[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.AuditEvents(), "audit events", func(record *stores.AuditEventRecord) {
		snapshot.AuditEvents[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.AgreementArtifacts(), "agreement artifacts", func(record *stores.AgreementArtifactRecord) {
		snapshot.AgreementArtifacts[scopeRecordKey(record.TenantID, record.OrgID, record.AgreementID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.EmailLogs(), "email logs", func(record *stores.EmailLogRecord) {
		snapshot.EmailLogs[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	return nil
}

func (b *runtimeRelationalStoreSync) loadSnapshotAsyncRecords(ctx context.Context, idb bun.IDB, snapshot *runtimeStoreSnapshot) error {
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.JobRuns(), "job runs", func(record *stores.JobRunRecord) {
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.JobRuns[scopedID] = *record
		snapshot.JobRunDedupeIndex[jobRunDedupeIndexForKey(record.TenantID, record.OrgID, record.JobName, record.DedupeKey)] = strings.TrimSpace(record.ID)
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.GoogleImportRuns(), "google import runs", func(record *stores.GoogleImportRunRecord) {
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.GoogleImportRuns[scopedID] = *record
		snapshot.GoogleImportRunDedupeIndex[googleImportRunDedupeIndexForKey(record.TenantID, record.OrgID, record.UserID, record.DedupeKey)] = strings.TrimSpace(record.ID)
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.AgreementReminderStates(), "agreement reminder states", func(record *stores.AgreementReminderStateRecord) {
		snapshot.AgreementReminderStates[scopeAgreementRecipientKey(record.TenantID, record.OrgID, record.AgreementID, record.RecipientID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.OutboxMessages(), "outbox messages", func(record *OutboxMessageRecord) {
		snapshot.OutboxMessages[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = record.Message
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.IntegrationCredentials(), "integration credentials", func(record *stores.IntegrationCredentialRecord) {
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.IntegrationCredentials[scopedID] = *record
		snapshot.IntegrationCredentialIndex[integrationCredentialIndexForKey(record.TenantID, record.OrgID, record.Provider, record.UserID)] = strings.TrimSpace(record.ID)
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.MappingSpecs(), "mapping specs", func(record *stores.MappingSpecRecord) {
		snapshot.MappingSpecs[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.IntegrationBindings(), "integration bindings", func(record *stores.IntegrationBindingRecord) {
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.IntegrationBindings[scopedID] = *record
		snapshot.IntegrationBindingIndex[integrationBindingIndexForKey(record.TenantID, record.OrgID, record.Provider, record.EntityKind, record.ExternalID)] = strings.TrimSpace(record.ID)
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.IntegrationSyncRuns(), "integration sync runs", func(record *stores.IntegrationSyncRunRecord) {
		snapshot.IntegrationSyncRuns[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.IntegrationCheckpoints(), "integration checkpoints", func(record *stores.IntegrationCheckpointRecord) {
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.IntegrationCheckpoints[scopedID] = *record
		snapshot.IntegrationCheckpointIndex[integrationCheckpointIndexForKey(record.TenantID, record.OrgID, record.RunID, record.CheckpointKey)] = strings.TrimSpace(record.ID)
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.IntegrationConflicts(), "integration conflicts", func(record *stores.IntegrationConflictRecord) {
		snapshot.IntegrationConflicts[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.IntegrationChangeEvents(), "integration change events", func(record *stores.IntegrationChangeEventRecord) {
		snapshot.IntegrationChangeEvents[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.IntegrationMutationClaims(), "integration mutation claims", func(record *IntegrationMutationClaimRecord) {
		firstSeen := record.FirstSeenAt
		if firstSeen.IsZero() {
			firstSeen = record.CreatedAt
		}
		snapshot.IntegrationMutationClaims[integrationMutationClaimKeyForScope(record.TenantID, record.OrgID, record.IdempotencyKey)] = firstSeen.UTC()
	}); err != nil {
		return err
	}
	if err := loadSnapshotRepositoryRecords(ctx, idb, b.factory.PlacementRuns(), "placement runs", func(record *stores.PlacementRunRecord) {
		snapshot.PlacementRuns[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}); err != nil {
		return err
	}
	return nil
}

func (b *runtimeRelationalStoreSync) persistSnapshot(ctx context.Context, snapshot runtimeStoreSnapshot) error {
	if b == nil || b.sqlDB == nil {
		return fmt.Errorf("runtime relational store sync: sql db is required")
	}
	specs := runtimeStoreUpsertSpecs()
	columnMap, err := loadDialectColumnMap(ctx, b.sqlDB, b.dialect, runtimeStoreTargetTables(specs))
	if err != nil {
		return err
	}

	tx, err := b.sqlDB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("runtime relational store sync: begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if err := upsertRuntimeSnapshotRows(ctx, tx, b.dialect, specs, columnMap, snapshot); err != nil {
		return err
	}
	if err := cleanupRuntimeSnapshotRows(ctx, tx, b.dialect, specs, columnMap, snapshot); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("runtime relational store sync: commit transaction: %w", err)
	}
	return nil
}

func loadSnapshotRepositoryRecords[T any](ctx context.Context, idb bun.IDB, repo repository.Repository[*T], label string, apply func(*T)) error {
	records, err := listRepositoryRecords(ctx, idb, repo)
	if err != nil {
		return fmt.Errorf("runtime relational store sync: list %s: %w", label, err)
	}
	for _, record := range records {
		if record == nil {
			continue
		}
		apply(record)
	}
	return nil
}

func upsertRuntimeSnapshotRows(
	ctx context.Context,
	tx *sql.Tx,
	dialect Dialect,
	specs []runtimeTableUpsertSpec,
	columnMap map[string]map[string]bool,
	snapshot runtimeStoreSnapshot,
) error {
	for _, spec := range specs {
		tableColumns := columnMap[spec.table]
		if len(tableColumns) == 0 {
			continue
		}
		for _, row := range spec.rows(snapshot) {
			if err := upsertRuntimeRowForDialect(ctx, tx, dialect, spec, tableColumns, row); err != nil {
				return fmt.Errorf("runtime relational store sync: upsert into %s: %w", spec.table, err)
			}
		}
	}
	return nil
}

func cleanupRuntimeSnapshotRows(
	ctx context.Context,
	tx *sql.Tx,
	dialect Dialect,
	specs []runtimeTableUpsertSpec,
	columnMap map[string]map[string]bool,
	snapshot runtimeStoreSnapshot,
) error {
	for i := len(specs) - 1; i >= 0; i-- {
		spec := specs[i]
		if isAppendOnlyRuntimeTable(spec.table) {
			continue
		}
		tableColumns := columnMap[spec.table]
		keyColumn, ok := runtimeCleanupKeyColumn(spec, tableColumns)
		if !ok {
			continue
		}
		keys := collectRowKeys(spec.rows(snapshot), keyColumn)
		if err := deleteMissingRowsByKey(ctx, tx, dialect, spec.table, keyColumn, keys); err != nil {
			return fmt.Errorf("runtime relational store sync: cleanup stale rows from %s: %w", spec.table, err)
		}
	}
	return nil
}

func runtimeCleanupKeyColumn(spec runtimeTableUpsertSpec, tableColumns map[string]bool) (string, bool) {
	if len(tableColumns) == 0 || len(spec.conflict) == 0 {
		return "", false
	}
	keyColumn := strings.ToLower(strings.TrimSpace(spec.conflict[0]))
	if keyColumn == "" || !tableColumns[keyColumn] {
		return "", false
	}
	return keyColumn, true
}

func listRepositoryRecords[T any](ctx context.Context, idb bun.IDB, repo repository.Repository[T]) ([]T, error) {
	if repo == nil {
		return nil, nil
	}
	var (
		records []T
		err     error
	)
	if idb != nil {
		records, _, err = repo.ListTx(ctx, idb)
	} else {
		records, _, err = repo.List(ctx)
	}
	return records, err
}

func idbOrDB(idb bun.IDB, db *bun.DB) bun.IDB {
	if idb != nil {
		return idb
	}
	return db
}

func listDocumentRemediationLeases(ctx context.Context, idb bun.IDB) ([]stores.DocumentRemediationLeaseRecord, error) {
	if idb == nil {
		return nil, nil
	}
	records := make([]stores.DocumentRemediationLeaseRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		TableExpr("document_remediation_leases").
		Scan(ctx); err != nil {
		if isMissingRuntimeTableError(err) {
			return nil, nil
		}
		return nil, err
	}
	return records, nil
}

func listRemediationDispatches(ctx context.Context, idb bun.IDB) ([]stores.RemediationDispatchRecord, error) {
	if idb == nil {
		return nil, nil
	}
	records := make([]stores.RemediationDispatchRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		TableExpr("remediation_dispatches").
		Scan(ctx); err != nil {
		if isMissingRuntimeTableError(err) {
			return nil, nil
		}
		return nil, err
	}
	return records, nil
}

func isMissingRuntimeTableError(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(strings.TrimSpace(err.Error()))
	return strings.Contains(message, "does not exist") || strings.Contains(message, "no such table")
}

func runtimeStoreUpsertSpecs() []runtimeTableUpsertSpec {
	return runtimeStoreTableUpsertSpecs()
}

func runtimeStoreTargetTables(specs []runtimeTableUpsertSpec) []string {
	return runtimeUpsertTargetTables(specs)
}

func collectRowKeys(rows []map[string]any, keyColumn string) []string {
	if len(rows) == 0 {
		return nil
	}
	keyColumn = strings.ToLower(strings.TrimSpace(keyColumn))
	seen := map[string]bool{}
	keys := make([]string, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		value, ok := row[keyColumn]
		if !ok {
			continue
		}
		key := strings.TrimSpace(fmt.Sprint(value))
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func loadDialectColumnMap(ctx context.Context, queryer sqlQueryer, dialect Dialect, tables []string) (map[string]map[string]bool, error) {
	switch dialect {
	case DialectPostgres:
		return loadPostgresColumnMap(ctx, queryer, tables)
	default:
		return loadSQLiteColumnMap(ctx, queryer, tables)
	}
}

func loadPostgresColumnMap(ctx context.Context, queryer sqlQueryer, tables []string) (map[string]map[string]bool, error) {
	out := make(map[string]map[string]bool, len(tables))
	if queryer == nil {
		return out, nil
	}
	for _, table := range tables {
		table = strings.TrimSpace(table)
		if table == "" {
			continue
		}
		rows, err := queryer.QueryContext(ctx,
			`SELECT column_name
			 FROM information_schema.columns
			 WHERE table_schema = current_schema() AND table_name = $1`,
			table,
		)
		if err != nil {
			return nil, fmt.Errorf("runtime relational store sync: query columns for %s: %w", table, err)
		}
		columns := map[string]bool{}
		for rows.Next() {
			var column string
			if scanErr := rows.Scan(&column); scanErr != nil {
				_ = rows.Close()
				return nil, fmt.Errorf("runtime relational store sync: scan columns for %s: %w", table, scanErr)
			}
			column = strings.ToLower(strings.TrimSpace(column))
			if column != "" {
				columns[column] = true
			}
		}
		if closeErr := rows.Close(); closeErr != nil {
			return nil, fmt.Errorf("runtime relational store sync: close column rows for %s: %w", table, closeErr)
		}
		out[table] = columns
	}
	return out, nil
}

func upsertRuntimeRowForDialect(
	ctx context.Context,
	tx interface {
		ExecContext(context.Context, string, ...any) (sql.Result, error)
	},
	dialect Dialect,
	spec runtimeTableUpsertSpec,
	tableColumns map[string]bool,
	row map[string]any,
) error {
	if tx == nil || len(tableColumns) == 0 || len(row) == 0 {
		return nil
	}
	columns, args, err := runtimeUpsertColumnsAndArgs(spec, tableColumns, row)
	if err != nil {
		return err
	}
	if len(columns) == 0 || len(args) == 0 {
		return nil
	}

	placeholders := make([]string, 0, len(columns))
	for idx := range columns {
		placeholders = append(placeholders, sqlPlaceholder(dialect, idx+1))
	}
	assignments := runtimeUpsertAssignments(spec, columns)
	query, err := buildRuntimeUpsertQuery(spec.table, columns, placeholders, spec.conflict)
	if err != nil {
		return err
	}
	if len(assignments) == 0 {
		query += `DO NOTHING`
	} else {
		query += `DO UPDATE SET ` + strings.Join(normalizeRuntimeAssignments(assignments), ", ")
	}
	if _, err := tx.ExecContext(ctx, query, args...); err != nil {
		return err
	}
	return nil
}

func runtimeUpsertColumnsAndArgs(spec runtimeTableUpsertSpec, tableColumns map[string]bool, row map[string]any) ([]string, []any, error) {
	columns := make([]string, 0, len(spec.columns))
	args := make([]any, 0, len(spec.columns))
	for _, column := range spec.columns {
		column = strings.TrimSpace(strings.ToLower(column))
		if column == "" || !tableColumns[column] {
			continue
		}
		value, ok := row[column]
		if !ok {
			continue
		}
		columns = append(columns, column)
		args = append(args, value)
	}
	for _, conflictColumn := range spec.conflict {
		if !containsString(columns, conflictColumn) {
			return nil, nil, fmt.Errorf("missing conflict column %q", conflictColumn)
		}
	}
	return columns, args, nil
}

func runtimeUpsertAssignments(spec runtimeTableUpsertSpec, columns []string) []string {
	if isAppendOnlyRuntimeTable(spec.table) {
		return nil
	}
	assignments := make([]string, 0, len(columns))
	for _, column := range columns {
		if containsString(spec.conflict, column) {
			continue
		}
		assignments = append(assignments, column+" = excluded."+column)
	}
	return assignments
}

func isAppendOnlyRuntimeTable(table string) bool {
	switch strings.ToLower(strings.TrimSpace(table)) {
	case "audit_events", "draft_audit_events":
		return true
	default:
		return false
	}
}

func deleteMissingRowsByKey(
	ctx context.Context,
	tx *sql.Tx,
	dialect Dialect,
	table string,
	keyColumn string,
	keys []string,
) error {
	if tx == nil {
		return nil
	}
	tableName, err := primitives.NormalizeSQLIdentifier(table)
	if err != nil {
		return nil
	}
	keyName, err := primitives.NormalizeSQLIdentifier(keyColumn)
	if err != nil {
		return nil
	}
	if len(keys) == 0 {
		// #nosec G201,G202 -- table identifier is validated before query construction.
		_, execErr := tx.ExecContext(ctx, `DELETE FROM `+tableName)
		return execErr
	}
	placeholders := make([]string, 0, len(keys))
	args := make([]any, 0, len(keys))
	for idx, key := range keys {
		placeholders = append(placeholders, sqlPlaceholder(dialect, idx+1))
		args = append(args, key)
	}
	// #nosec G202 -- table and column identifiers are validated and values remain parameterized.
	query := `DELETE FROM ` + tableName + ` WHERE ` + keyName + ` NOT IN (` + strings.Join(placeholders, ", ") + `)`
	_, err = tx.ExecContext(ctx, query, args...)
	return err
}

func buildRuntimeUpsertQuery(table string, columns, placeholders, conflict []string) (string, error) {
	tableName, err := primitives.NormalizeSQLIdentifier(table)
	if err != nil {
		return "", err
	}
	normalizedColumns, err := primitives.NormalizeSQLIdentifiers(columns)
	if err != nil {
		return "", err
	}
	normalizedConflict, err := primitives.NormalizeSQLIdentifiers(conflict)
	if err != nil {
		return "", err
	}
	// #nosec G202 -- identifiers are validated before interpolation and row values stay parameterized.
	return `INSERT INTO ` + tableName + ` (` + strings.Join(normalizedColumns, ", ") + `) VALUES (` + strings.Join(placeholders, ", ") + `) ` +
		`ON CONFLICT(` + strings.Join(normalizedConflict, ", ") + `) `, nil
}

func normalizeRuntimeAssignments(assignments []string) []string {
	if len(assignments) == 0 {
		return nil
	}
	out := make([]string, 0, len(assignments))
	for _, assignment := range assignments {
		column, _, ok := strings.Cut(assignment, " = excluded.")
		if !ok {
			continue
		}
		normalized, err := primitives.NormalizeSQLIdentifier(column)
		if err != nil {
			continue
		}
		out = append(out, normalized+" = excluded."+normalized)
	}
	return out
}

func sqlPlaceholder(dialect Dialect, position int) string {
	if dialect == DialectPostgres {
		return fmt.Sprintf("$%d", position)
	}
	return "?"
}

func containsString(values []string, target string) bool {
	target = strings.TrimSpace(strings.ToLower(target))
	if target == "" {
		return false
	}
	for _, candidate := range values {
		if strings.TrimSpace(strings.ToLower(candidate)) == target {
			return true
		}
	}
	return false
}

func validateRuntimeSnapshot(snapshot runtimeStoreSnapshot) error {
	for key, record := range snapshot.AgreementReminderStates {
		expected := scopeAgreementRecipientKey(record.TenantID, record.OrgID, record.AgreementID, record.RecipientID)
		if strings.TrimSpace(key) != expected {
			return fmt.Errorf("runtime relational store sync: invalid reminder state key %q (expected %q)", key, expected)
		}
	}

	if err := validateRuntimeIndexIDs(snapshot.JobRunDedupeIndex, scopedRecordIDSetFromJobRuns(snapshot.JobRuns)); err != nil {
		return fmt.Errorf("runtime relational store sync: job run dedupe index: %w", err)
	}
	if err := validateRuntimeIndexIDs(snapshot.GoogleImportRunDedupeIndex, scopedRecordIDSetFromGoogleImportRuns(snapshot.GoogleImportRuns)); err != nil {
		return fmt.Errorf("runtime relational store sync: google import dedupe index: %w", err)
	}
	if err := validateRuntimeIndexIDs(snapshot.SignerProfileIndex, scopedRecordIDSetFromSignerProfiles(snapshot.SignerProfiles)); err != nil {
		return fmt.Errorf("runtime relational store sync: signer profile index: %w", err)
	}
	if err := validateRuntimeIndexIDs(snapshot.IntegrationCredentialIndex, scopedRecordIDSetFromIntegrationCredentials(snapshot.IntegrationCredentials)); err != nil {
		return fmt.Errorf("runtime relational store sync: integration credential index: %w", err)
	}
	if err := validateRuntimeIndexIDs(snapshot.IntegrationBindingIndex, scopedRecordIDSetFromIntegrationBindings(snapshot.IntegrationBindings)); err != nil {
		return fmt.Errorf("runtime relational store sync: integration binding index: %w", err)
	}
	if err := validateRuntimeIndexIDs(snapshot.IntegrationCheckpointIndex, scopedRecordIDSetFromIntegrationCheckpoints(snapshot.IntegrationCheckpoints)); err != nil {
		return fmt.Errorf("runtime relational store sync: integration checkpoint index: %w", err)
	}

	for hash, scopedID := range snapshot.TokenHashIndex {
		hash = strings.TrimSpace(hash)
		scopedID = strings.TrimSpace(scopedID)
		if hash == "" || scopedID == "" {
			return fmt.Errorf("invalid signing token hash index entry hash=%q scoped_id=%q", hash, scopedID)
		}
		if _, ok := snapshot.SigningTokens[scopedID]; !ok {
			return fmt.Errorf("token hash index points to missing token scoped_id=%q", scopedID)
		}
	}
	return nil
}

func validateRuntimeIndexIDs(index map[string]string, idSet map[string]bool) error {
	for indexKey, id := range index {
		indexKey = strings.TrimSpace(indexKey)
		id = strings.TrimSpace(id)
		if indexKey == "" || id == "" {
			return fmt.Errorf("invalid index entry key=%q id=%q", indexKey, id)
		}
		scope, ok := indexScopePrefix(indexKey)
		if !ok {
			return fmt.Errorf("invalid scoped index key %q", indexKey)
		}
		if !idSet[scope+"|"+id] {
			return fmt.Errorf("index key %q points to missing scoped id %q", indexKey, scope+"|"+id)
		}
	}
	return nil
}

func indexScopePrefix(indexKey string) (string, bool) {
	parts := strings.Split(indexKey, "|")
	if len(parts) < 3 {
		return "", false
	}
	tenantID := strings.TrimSpace(parts[0])
	orgID := strings.TrimSpace(parts[1])
	if tenantID == "" || orgID == "" {
		return "", false
	}
	return scopePrefix(tenantID, orgID), true
}

func scopedRecordIDSetFromJobRuns(records map[string]stores.JobRunRecord) map[string]bool {
	out := make(map[string]bool, len(records))
	for _, record := range records {
		out[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = true
	}
	return out
}

func scopedRecordIDSetFromGoogleImportRuns(records map[string]stores.GoogleImportRunRecord) map[string]bool {
	out := make(map[string]bool, len(records))
	for _, record := range records {
		out[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = true
	}
	return out
}

func scopedRecordIDSetFromSignerProfiles(records map[string]stores.SignerProfileRecord) map[string]bool {
	out := make(map[string]bool, len(records))
	for _, record := range records {
		out[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = true
	}
	return out
}

func scopedRecordIDSetFromIntegrationCredentials(records map[string]stores.IntegrationCredentialRecord) map[string]bool {
	out := make(map[string]bool, len(records))
	for _, record := range records {
		out[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = true
	}
	return out
}

func scopedRecordIDSetFromIntegrationBindings(records map[string]stores.IntegrationBindingRecord) map[string]bool {
	out := make(map[string]bool, len(records))
	for _, record := range records {
		out[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = true
	}
	return out
}

func scopedRecordIDSetFromIntegrationCheckpoints(records map[string]stores.IntegrationCheckpointRecord) map[string]bool {
	out := make(map[string]bool, len(records))
	for _, record := range records {
		out[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = true
	}
	return out
}

func scopePrefix(tenantID, orgID string) string {
	return strings.TrimSpace(tenantID) + "|" + strings.TrimSpace(orgID)
}

func scopeRecordKey(tenantID, orgID, id string) string {
	return scopePrefix(tenantID, orgID) + "|" + strings.TrimSpace(id)
}

func scopeAgreementRecipientKey(tenantID, orgID, agreementID, recipientID string) string {
	return scopePrefix(tenantID, orgID) + "|" + strings.TrimSpace(agreementID) + "|" + strings.TrimSpace(recipientID)
}

func draftWizardIndexForKey(tenantID, orgID, userID, wizardID string) string {
	return strings.Join([]string{
		scopePrefix(tenantID, orgID),
		strings.TrimSpace(userID),
		strings.TrimSpace(wizardID),
	}, "|")
}

func signerProfileIndexForKey(tenantID, orgID, subject, key string) string {
	return strings.Join([]string{
		scopePrefix(tenantID, orgID),
		strings.ToLower(strings.TrimSpace(subject)),
		strings.TrimSpace(key),
	}, "|")
}

func jobRunDedupeIndexForKey(tenantID, orgID, jobName, dedupeKey string) string {
	return strings.Join([]string{
		scopePrefix(tenantID, orgID),
		strings.TrimSpace(jobName),
		strings.TrimSpace(dedupeKey),
	}, "|")
}

func googleImportRunDedupeIndexForKey(tenantID, orgID, userID, dedupeKey string) string {
	return strings.Join([]string{
		scopePrefix(tenantID, orgID),
		strings.TrimSpace(userID),
		strings.TrimSpace(dedupeKey),
	}, "|")
}

func integrationCredentialIndexForKey(tenantID, orgID, provider, userID string) string {
	return strings.Join([]string{
		scopePrefix(tenantID, orgID),
		strings.ToLower(strings.TrimSpace(provider)),
		strings.TrimSpace(userID),
	}, "|")
}

func integrationBindingIndexForKey(tenantID, orgID, provider, entityKind, externalID string) string {
	return strings.Join([]string{
		scopePrefix(tenantID, orgID),
		strings.ToLower(strings.TrimSpace(provider)),
		strings.ToLower(strings.TrimSpace(entityKind)),
		strings.TrimSpace(externalID),
	}, "|")
}

func integrationCheckpointIndexForKey(tenantID, orgID, runID, checkpointKey string) string {
	return strings.Join([]string{
		scopePrefix(tenantID, orgID),
		strings.TrimSpace(runID),
		strings.TrimSpace(checkpointKey),
	}, "|")
}

func integrationMutationClaimKeyForScope(tenantID, orgID, idempotencyKey string) string {
	return scopePrefix(tenantID, orgID) + "|" + strings.TrimSpace(idempotencyKey)
}
