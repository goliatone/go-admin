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
	repository "github.com/goliatone/go-repository-bun"
)

var _ stores.SQLitePersistenceBackend = (*runtimeRelationalStoreBackend)(nil)

// runtimeStoreSnapshot is the runtime payload shape used by the relational bridge.
// It intentionally avoids referencing legacy state tables.
type runtimeStoreSnapshot = legacySQLiteSnapshot

type runtimeTableUpsertSpec = legacyTableMigrationSpec

type runtimeRelationalStoreBackend struct {
	dialect Dialect
	factory *RepositoryFactory
}

func newRuntimeRelationalStoreBackend(bootstrap *BootstrapResult) (*runtimeRelationalStoreBackend, error) {
	if bootstrap == nil {
		return nil, fmt.Errorf("runtime relational store backend: bootstrap result is required")
	}
	if bootstrap.BunDB == nil {
		return nil, fmt.Errorf("runtime relational store backend: bun db is required")
	}
	factory, err := NewRepositoryFactoryFromDB(bootstrap.BunDB)
	if err != nil {
		return nil, fmt.Errorf("runtime relational store backend: repository factory: %w", err)
	}
	return &runtimeRelationalStoreBackend{
		dialect: bootstrap.Dialect,
		factory: factory,
	}, nil
}

func (b *runtimeRelationalStoreBackend) EnsureSchema(_ context.Context, _ *sql.DB) error {
	return nil
}

func (b *runtimeRelationalStoreBackend) LoadPayload(ctx context.Context, _ *sql.DB) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	snapshot, err := b.loadSnapshot(ctx)
	if err != nil {
		return nil, err
	}
	if err := validateRuntimeSnapshot(snapshot); err != nil {
		return nil, err
	}
	payload, err := json.Marshal(snapshot)
	if err != nil {
		return nil, fmt.Errorf("runtime relational store backend: encode runtime snapshot: %w", err)
	}
	return payload, nil
}

func (b *runtimeRelationalStoreBackend) PersistPayload(ctx context.Context, db *sql.DB, payload []byte) error {
	if db == nil {
		return fmt.Errorf("runtime relational store backend: sql db is required")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	payload = []byte(strings.TrimSpace(string(payload)))
	snapshot := runtimeStoreSnapshot{}
	if len(payload) > 0 {
		if err := json.Unmarshal(payload, &snapshot); err != nil {
			return fmt.Errorf("runtime relational store backend: decode runtime snapshot: %w", err)
		}
	}
	if err := validateRuntimeSnapshot(snapshot); err != nil {
		return err
	}
	return b.persistSnapshot(ctx, db, snapshot)
}

func (b *runtimeRelationalStoreBackend) loadSnapshot(ctx context.Context) (runtimeStoreSnapshot, error) {
	snapshot := runtimeStoreSnapshot{
		Documents:                  map[string]stores.DocumentRecord{},
		Agreements:                 map[string]stores.AgreementRecord{},
		Drafts:                     map[string]stores.DraftRecord{},
		DraftWizardIndex:           map[string]string{},
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

	if b == nil || b.factory == nil {
		return snapshot, nil
	}

	docs, err := listRepositoryRecords(ctx, b.factory.Documents())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list documents: %w", err)
	}
	for _, record := range docs {
		if record == nil {
			continue
		}
		snapshot.Documents[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	agreements, err := listRepositoryRecords(ctx, b.factory.Agreements())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list agreements: %w", err)
	}
	for _, record := range agreements {
		if record == nil {
			continue
		}
		snapshot.Agreements[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	drafts, err := listRepositoryRecords(ctx, b.factory.Drafts())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list drafts: %w", err)
	}
	for _, record := range drafts {
		if record == nil {
			continue
		}
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.Drafts[scopedID] = *record
		snapshot.DraftWizardIndex[draftWizardIndexForKey(record.TenantID, record.OrgID, record.CreatedByUserID, record.WizardID)] = strings.TrimSpace(record.ID)
	}

	recipients, err := listRepositoryRecords(ctx, b.factory.Recipients())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list recipients: %w", err)
	}
	for _, record := range recipients {
		if record == nil {
			continue
		}
		snapshot.Recipients[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	participants, err := listRepositoryRecords(ctx, b.factory.Participants())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list participants: %w", err)
	}
	for _, record := range participants {
		if record == nil {
			continue
		}
		snapshot.Participants[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	fields, err := listRepositoryRecords(ctx, b.factory.Fields())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list fields: %w", err)
	}
	for _, record := range fields {
		if record == nil {
			continue
		}
		snapshot.Fields[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	fieldDefs, err := listRepositoryRecords(ctx, b.factory.FieldDefinitions())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list field definitions: %w", err)
	}
	for _, record := range fieldDefs {
		if record == nil {
			continue
		}
		snapshot.FieldDefinitions[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	fieldInstances, err := listRepositoryRecords(ctx, b.factory.FieldInstances())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list field instances: %w", err)
	}
	for _, record := range fieldInstances {
		if record == nil {
			continue
		}
		snapshot.FieldInstances[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	signingTokens, err := listRepositoryRecords(ctx, b.factory.SigningTokens())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list signing tokens: %w", err)
	}
	for _, record := range signingTokens {
		if record == nil {
			continue
		}
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.SigningTokens[scopedID] = *record
		hash := strings.TrimSpace(record.TokenHash)
		if hash != "" {
			snapshot.TokenHashIndex[hash] = scopedID
		}
	}

	signatures, err := listRepositoryRecords(ctx, b.factory.SignatureArtifacts())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list signature artifacts: %w", err)
	}
	for _, record := range signatures {
		if record == nil {
			continue
		}
		snapshot.SignatureArtifacts[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	signerProfiles, err := listRepositoryRecords(ctx, b.factory.SignerProfiles())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list signer profiles: %w", err)
	}
	for _, record := range signerProfiles {
		if record == nil {
			continue
		}
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.SignerProfiles[scopedID] = *record
		snapshot.SignerProfileIndex[signerProfileIndexForKey(record.TenantID, record.OrgID, record.Subject, record.Key)] = strings.TrimSpace(record.ID)
	}

	savedSignatures, err := listRepositoryRecords(ctx, b.factory.SavedSignerSignatures())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list saved signatures: %w", err)
	}
	for _, record := range savedSignatures {
		if record == nil {
			continue
		}
		snapshot.SavedSignerSignatures[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	fieldValues, err := listRepositoryRecords(ctx, b.factory.FieldValues())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list field values: %w", err)
	}
	for _, record := range fieldValues {
		if record == nil {
			continue
		}
		snapshot.FieldValues[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	auditEvents, err := listRepositoryRecords(ctx, b.factory.AuditEvents())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list audit events: %w", err)
	}
	for _, record := range auditEvents {
		if record == nil {
			continue
		}
		snapshot.AuditEvents[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	agreementArtifacts, err := listRepositoryRecords(ctx, b.factory.AgreementArtifacts())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list agreement artifacts: %w", err)
	}
	for _, record := range agreementArtifacts {
		if record == nil {
			continue
		}
		snapshot.AgreementArtifacts[scopeRecordKey(record.TenantID, record.OrgID, record.AgreementID)] = *record
	}

	emailLogs, err := listRepositoryRecords(ctx, b.factory.EmailLogs())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list email logs: %w", err)
	}
	for _, record := range emailLogs {
		if record == nil {
			continue
		}
		snapshot.EmailLogs[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	jobRuns, err := listRepositoryRecords(ctx, b.factory.JobRuns())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list job runs: %w", err)
	}
	for _, record := range jobRuns {
		if record == nil {
			continue
		}
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.JobRuns[scopedID] = *record
		snapshot.JobRunDedupeIndex[jobRunDedupeIndexForKey(record.TenantID, record.OrgID, record.JobName, record.DedupeKey)] = strings.TrimSpace(record.ID)
	}

	googleImportRuns, err := listRepositoryRecords(ctx, b.factory.GoogleImportRuns())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list google import runs: %w", err)
	}
	for _, record := range googleImportRuns {
		if record == nil {
			continue
		}
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.GoogleImportRuns[scopedID] = *record
		snapshot.GoogleImportRunDedupeIndex[googleImportRunDedupeIndexForKey(record.TenantID, record.OrgID, record.UserID, record.DedupeKey)] = strings.TrimSpace(record.ID)
	}

	agreementReminderStates, err := listRepositoryRecords(ctx, b.factory.AgreementReminderStates())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list agreement reminder states: %w", err)
	}
	for _, record := range agreementReminderStates {
		if record == nil {
			continue
		}
		snapshot.AgreementReminderStates[scopeAgreementRecipientKey(record.TenantID, record.OrgID, record.AgreementID, record.RecipientID)] = *record
	}

	outboxMessages, err := listRepositoryRecords(ctx, b.factory.OutboxMessages())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list outbox messages: %w", err)
	}
	for _, record := range outboxMessages {
		if record == nil {
			continue
		}
		snapshot.OutboxMessages[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = stores.OutboxMessageRecord(record.Message)
	}

	integrationCredentials, err := listRepositoryRecords(ctx, b.factory.IntegrationCredentials())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list integration credentials: %w", err)
	}
	for _, record := range integrationCredentials {
		if record == nil {
			continue
		}
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.IntegrationCredentials[scopedID] = *record
		snapshot.IntegrationCredentialIndex[integrationCredentialIndexForKey(record.TenantID, record.OrgID, record.Provider, record.UserID)] = strings.TrimSpace(record.ID)
	}

	mappingSpecs, err := listRepositoryRecords(ctx, b.factory.MappingSpecs())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list mapping specs: %w", err)
	}
	for _, record := range mappingSpecs {
		if record == nil {
			continue
		}
		snapshot.MappingSpecs[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	integrationBindings, err := listRepositoryRecords(ctx, b.factory.IntegrationBindings())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list integration bindings: %w", err)
	}
	for _, record := range integrationBindings {
		if record == nil {
			continue
		}
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.IntegrationBindings[scopedID] = *record
		snapshot.IntegrationBindingIndex[integrationBindingIndexForKey(record.TenantID, record.OrgID, record.Provider, record.EntityKind, record.ExternalID)] = strings.TrimSpace(record.ID)
	}

	integrationSyncRuns, err := listRepositoryRecords(ctx, b.factory.IntegrationSyncRuns())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list integration sync runs: %w", err)
	}
	for _, record := range integrationSyncRuns {
		if record == nil {
			continue
		}
		snapshot.IntegrationSyncRuns[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	integrationCheckpoints, err := listRepositoryRecords(ctx, b.factory.IntegrationCheckpoints())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list integration checkpoints: %w", err)
	}
	for _, record := range integrationCheckpoints {
		if record == nil {
			continue
		}
		scopedID := scopeRecordKey(record.TenantID, record.OrgID, record.ID)
		snapshot.IntegrationCheckpoints[scopedID] = *record
		snapshot.IntegrationCheckpointIndex[integrationCheckpointIndexForKey(record.TenantID, record.OrgID, record.RunID, record.CheckpointKey)] = strings.TrimSpace(record.ID)
	}

	integrationConflicts, err := listRepositoryRecords(ctx, b.factory.IntegrationConflicts())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list integration conflicts: %w", err)
	}
	for _, record := range integrationConflicts {
		if record == nil {
			continue
		}
		snapshot.IntegrationConflicts[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	integrationChangeEvents, err := listRepositoryRecords(ctx, b.factory.IntegrationChangeEvents())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list integration change events: %w", err)
	}
	for _, record := range integrationChangeEvents {
		if record == nil {
			continue
		}
		snapshot.IntegrationChangeEvents[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	integrationMutationClaims, err := listRepositoryRecords(ctx, b.factory.IntegrationMutationClaims())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list integration mutation claims: %w", err)
	}
	for _, record := range integrationMutationClaims {
		if record == nil {
			continue
		}
		firstSeen := record.FirstSeenAt
		if firstSeen.IsZero() {
			firstSeen = record.CreatedAt
		}
		snapshot.IntegrationMutationClaims[integrationMutationClaimKeyForScope(record.TenantID, record.OrgID, record.IdempotencyKey)] = firstSeen.UTC()
	}

	placementRuns, err := listRepositoryRecords(ctx, b.factory.PlacementRuns())
	if err != nil {
		return snapshot, fmt.Errorf("runtime relational store backend: list placement runs: %w", err)
	}
	for _, record := range placementRuns {
		if record == nil {
			continue
		}
		snapshot.PlacementRuns[scopeRecordKey(record.TenantID, record.OrgID, record.ID)] = *record
	}

	return snapshot, nil
}

func (b *runtimeRelationalStoreBackend) persistSnapshot(ctx context.Context, db *sql.DB, snapshot runtimeStoreSnapshot) error {
	specs := runtimeStoreUpsertSpecs()
	columnMap, err := loadDialectColumnMap(ctx, db, b.dialect, runtimeStoreTargetTables(specs))
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("runtime relational store backend: begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	for _, spec := range specs {
		tableColumns := columnMap[spec.table]
		if len(tableColumns) == 0 {
			continue
		}
		rows := spec.rows(snapshot)
		for _, row := range rows {
			if err := upsertLegacyRowForDialect(ctx, tx, b.dialect, spec, tableColumns, row); err != nil {
				return fmt.Errorf("runtime relational store backend: upsert into %s: %w", spec.table, err)
			}
		}
	}

	for i := len(specs) - 1; i >= 0; i-- {
		spec := specs[i]
		if strings.EqualFold(strings.TrimSpace(spec.table), "audit_events") {
			continue
		}
		tableColumns := columnMap[spec.table]
		if len(tableColumns) == 0 || len(spec.conflict) == 0 {
			continue
		}
		keyColumn := strings.ToLower(strings.TrimSpace(spec.conflict[0]))
		if keyColumn == "" || !tableColumns[keyColumn] {
			continue
		}
		rows := spec.rows(snapshot)
		keys := collectRowKeys(rows, keyColumn)
		if err := deleteMissingRowsByKey(ctx, tx, b.dialect, spec.table, keyColumn, keys); err != nil {
			return fmt.Errorf("runtime relational store backend: cleanup stale rows from %s: %w", spec.table, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("runtime relational store backend: commit transaction: %w", err)
	}
	return nil
}

func listRepositoryRecords[T any](ctx context.Context, repo repository.Repository[T]) ([]T, error) {
	if repo == nil {
		return nil, nil
	}
	records, _, err := repo.List(ctx)
	return records, err
}

func runtimeStoreUpsertSpecs() []runtimeTableUpsertSpec {
	return legacySnapshotMigrationSpecs()
}

func runtimeStoreTargetTables(specs []runtimeTableUpsertSpec) []string {
	return legacySnapshotTargetTables(specs)
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

func loadDialectColumnMap(ctx context.Context, db *sql.DB, dialect Dialect, tables []string) (map[string]map[string]bool, error) {
	switch dialect {
	case DialectPostgres:
		return loadPostgresColumnMap(ctx, db, tables)
	default:
		return loadSQLiteColumnMap(ctx, db, tables)
	}
}

func loadPostgresColumnMap(ctx context.Context, db *sql.DB, tables []string) (map[string]map[string]bool, error) {
	out := make(map[string]map[string]bool, len(tables))
	if db == nil {
		return out, nil
	}
	for _, table := range tables {
		table = strings.TrimSpace(table)
		if table == "" {
			continue
		}
		rows, err := db.QueryContext(ctx,
			`SELECT column_name
			 FROM information_schema.columns
			 WHERE table_schema = current_schema() AND table_name = $1`,
			table,
		)
		if err != nil {
			return nil, fmt.Errorf("runtime relational store backend: query columns for %s: %w", table, err)
		}
		columns := map[string]bool{}
		for rows.Next() {
			var column string
			if scanErr := rows.Scan(&column); scanErr != nil {
				_ = rows.Close()
				return nil, fmt.Errorf("runtime relational store backend: scan columns for %s: %w", table, scanErr)
			}
			column = strings.ToLower(strings.TrimSpace(column))
			if column != "" {
				columns[column] = true
			}
		}
		if closeErr := rows.Close(); closeErr != nil {
			return nil, fmt.Errorf("runtime relational store backend: close column rows for %s: %w", table, closeErr)
		}
		out[table] = columns
	}
	return out, nil
}

func upsertLegacyRowForDialect(
	ctx context.Context,
	tx *sql.Tx,
	dialect Dialect,
	spec legacyTableMigrationSpec,
	tableColumns map[string]bool,
	row map[string]any,
) error {
	if tx == nil || len(tableColumns) == 0 || len(row) == 0 {
		return nil
	}
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
	if len(columns) == 0 {
		return nil
	}
	for _, conflictColumn := range spec.conflict {
		if !containsString(columns, conflictColumn) {
			return fmt.Errorf("missing conflict column %q", conflictColumn)
		}
	}

	placeholders := make([]string, 0, len(columns))
	for idx := range columns {
		placeholders = append(placeholders, sqlPlaceholder(dialect, idx+1))
	}
	assignments := make([]string, 0, len(columns))
	for _, column := range columns {
		if containsString(spec.conflict, column) {
			continue
		}
		assignments = append(assignments, column+" = excluded."+column)
	}
	if strings.EqualFold(strings.TrimSpace(spec.table), "audit_events") {
		assignments = nil
	}

	query := `INSERT INTO ` + spec.table + ` (` + strings.Join(columns, ", ") + `) VALUES (` + strings.Join(placeholders, ", ") + `) ` +
		`ON CONFLICT(` + strings.Join(spec.conflict, ", ") + `) `
	if len(assignments) == 0 {
		query += `DO NOTHING`
	} else {
		query += `DO UPDATE SET ` + strings.Join(assignments, ", ")
	}
	if _, err := tx.ExecContext(ctx, query, args...); err != nil {
		return err
	}
	return nil
}

func deleteMissingRowsByKey(
	ctx context.Context,
	tx *sql.Tx,
	dialect Dialect,
	table string,
	keyColumn string,
	keys []string,
) error {
	table = strings.TrimSpace(table)
	keyColumn = strings.TrimSpace(strings.ToLower(keyColumn))
	if tx == nil || table == "" || keyColumn == "" {
		return nil
	}
	if len(keys) == 0 {
		_, err := tx.ExecContext(ctx, `DELETE FROM `+table)
		return err
	}
	placeholders := make([]string, 0, len(keys))
	args := make([]any, 0, len(keys))
	for idx, key := range keys {
		placeholders = append(placeholders, sqlPlaceholder(dialect, idx+1))
		args = append(args, key)
	}
	query := `DELETE FROM ` + table + ` WHERE ` + keyColumn + ` NOT IN (` + strings.Join(placeholders, ", ") + `)`
	_, err := tx.ExecContext(ctx, query, args...)
	return err
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
			return fmt.Errorf("runtime relational store backend: invalid reminder state key %q (expected %q)", key, expected)
		}
	}

	if err := validateRuntimeIndexIDs(snapshot.JobRunDedupeIndex, scopedRecordIDSetFromJobRuns(snapshot.JobRuns)); err != nil {
		return fmt.Errorf("runtime relational store backend: job run dedupe index: %w", err)
	}
	if err := validateRuntimeIndexIDs(snapshot.GoogleImportRunDedupeIndex, scopedRecordIDSetFromGoogleImportRuns(snapshot.GoogleImportRuns)); err != nil {
		return fmt.Errorf("runtime relational store backend: google import dedupe index: %w", err)
	}
	if err := validateRuntimeIndexIDs(snapshot.SignerProfileIndex, scopedRecordIDSetFromSignerProfiles(snapshot.SignerProfiles)); err != nil {
		return fmt.Errorf("runtime relational store backend: signer profile index: %w", err)
	}
	if err := validateRuntimeIndexIDs(snapshot.IntegrationCredentialIndex, scopedRecordIDSetFromIntegrationCredentials(snapshot.IntegrationCredentials)); err != nil {
		return fmt.Errorf("runtime relational store backend: integration credential index: %w", err)
	}
	if err := validateRuntimeIndexIDs(snapshot.IntegrationBindingIndex, scopedRecordIDSetFromIntegrationBindings(snapshot.IntegrationBindings)); err != nil {
		return fmt.Errorf("runtime relational store backend: integration binding index: %w", err)
	}
	if err := validateRuntimeIndexIDs(snapshot.IntegrationCheckpointIndex, scopedRecordIDSetFromIntegrationCheckpoints(snapshot.IntegrationCheckpoints)); err != nil {
		return fmt.Errorf("runtime relational store backend: integration checkpoint index: %w", err)
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
