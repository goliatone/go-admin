package persistence

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"slices"
	"sort"
	"strings"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	legacySnapshotStateTable             = "esign_store_state"
	legacySnapshotMigrationMarkerTable   = "esign_snapshot_migration_markers"
	legacySnapshotMigrationMarkerKeyV1   = "legacy_esign_store_state_v1"
	legacySnapshotMigrationMarkerJSONDef = `{}`
)

type legacySQLiteSnapshot struct {
	Documents                  map[string]stores.DocumentRecord               `json:"documents"`
	Agreements                 map[string]stores.AgreementRecord              `json:"agreements"`
	Drafts                     map[string]stores.DraftRecord                  `json:"drafts"`
	DraftWizardIndex           map[string]string                              `json:"draft_wizard_index"`
	Participants               map[string]stores.ParticipantRecord            `json:"participants"`
	FieldDefinitions           map[string]stores.FieldDefinitionRecord        `json:"field_definitions"`
	FieldInstances             map[string]stores.FieldInstanceRecord          `json:"field_instances"`
	Recipients                 map[string]stores.RecipientRecord              `json:"recipients"`
	Fields                     map[string]stores.FieldRecord                  `json:"fields"`
	SigningTokens              map[string]stores.SigningTokenRecord           `json:"signing_tokens"`
	TokenHashIndex             map[string]string                              `json:"token_hash_index"`
	SignatureArtifacts         map[string]stores.SignatureArtifactRecord      `json:"signature_artifacts"`
	SignerProfiles             map[string]stores.SignerProfileRecord          `json:"signer_profiles"`
	SignerProfileIndex         map[string]string                              `json:"signer_profile_index"`
	SavedSignerSignatures      map[string]stores.SavedSignerSignatureRecord   `json:"saved_signatures"`
	FieldValues                map[string]stores.FieldValueRecord             `json:"field_values"`
	AuditEvents                map[string]stores.AuditEventRecord             `json:"audit_events"`
	AgreementArtifacts         map[string]stores.AgreementArtifactRecord      `json:"agreement_artifacts"`
	EmailLogs                  map[string]stores.EmailLogRecord               `json:"email_logs"`
	JobRuns                    map[string]stores.JobRunRecord                 `json:"job_runs"`
	JobRunDedupeIndex          map[string]string                              `json:"job_run_dedupe_index"`
	GoogleImportRuns           map[string]stores.GoogleImportRunRecord        `json:"google_import_runs"`
	GoogleImportRunDedupeIndex map[string]string                              `json:"google_import_run_dedupe_index"`
	AgreementReminderStates    map[string]stores.AgreementReminderStateRecord `json:"agreement_reminder_states"`
	OutboxMessages             map[string]stores.OutboxMessageRecord          `json:"outbox_messages"`
	IntegrationCredentials     map[string]stores.IntegrationCredentialRecord  `json:"integration_credentials"`
	IntegrationCredentialIndex map[string]string                              `json:"integration_credential_index"`
	MappingSpecs               map[string]stores.MappingSpecRecord            `json:"mapping_specs"`
	IntegrationBindings        map[string]stores.IntegrationBindingRecord     `json:"integration_bindings"`
	IntegrationBindingIndex    map[string]string                              `json:"integration_binding_index"`
	IntegrationSyncRuns        map[string]stores.IntegrationSyncRunRecord     `json:"integration_sync_runs"`
	IntegrationCheckpoints     map[string]stores.IntegrationCheckpointRecord  `json:"integration_checkpoints"`
	IntegrationCheckpointIndex map[string]string                              `json:"integration_checkpoint_index"`
	IntegrationConflicts       map[string]stores.IntegrationConflictRecord    `json:"integration_conflicts"`
	IntegrationChangeEvents    map[string]stores.IntegrationChangeEventRecord `json:"integration_change_events"`
	IntegrationMutationClaims  map[string]time.Time                           `json:"integration_mutation_claims"`
	PlacementRuns              map[string]stores.PlacementRunRecord           `json:"placement_runs"`
}

type legacySnapshotMigrationOptions struct {
	failAfterTable string
}

type legacyTableMigrationSpec struct {
	table    string
	columns  []string
	conflict []string
	rows     func(legacySQLiteSnapshot) []map[string]any
}

func migrateLegacySnapshot(ctx context.Context, db *sql.DB, dialect Dialect) error {
	return migrateLegacySnapshotWithOptions(ctx, db, dialect, legacySnapshotMigrationOptions{})
}

func migrateLegacySnapshotWithOptions(
	ctx context.Context,
	db *sql.DB,
	dialect Dialect,
	opts legacySnapshotMigrationOptions,
) error {
	if db == nil || dialect != DialectSQLite {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	if err := ensureLegacyMigrationMarkerTable(ctx, db); err != nil {
		return err
	}
	completed, err := legacyMigrationMarkerExists(ctx, db)
	if err != nil {
		return err
	}
	if completed {
		return nil
	}

	payload, exists, err := loadLegacySnapshotPayload(ctx, db)
	if err != nil {
		return err
	}
	if !exists {
		return nil
	}
	payload = strings.TrimSpace(payload)
	if payload == "" || payload == "{}" {
		return nil
	}

	var snapshot legacySQLiteSnapshot
	if err := json.Unmarshal([]byte(payload), &snapshot); err != nil {
		return fmt.Errorf("legacy snapshot migration: decode %s payload: %w", legacySnapshotStateTable, err)
	}

	specs := legacySnapshotMigrationSpecs()
	columnMap, err := loadSQLiteColumnMap(ctx, db, legacySnapshotTargetTables(specs))
	if err != nil {
		return err
	}
	if err := validateLegacySnapshotCoverage(snapshot, specs, columnMap); err != nil {
		return err
	}
	eligibleTables := eligibleTargetTables(columnMap, specs)
	if len(eligibleTables) == 0 {
		return nil
	}
	empty, err := areSQLiteTablesEmpty(ctx, db, eligibleTables)
	if err != nil {
		return err
	}
	if !empty {
		return nil
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("legacy snapshot migration: begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	counts := map[string]int{}
	for _, spec := range specs {
		tableColumns := columnMap[spec.table]
		if len(tableColumns) == 0 {
			continue
		}
		rows := spec.rows(snapshot)
		for _, row := range rows {
			if err := upsertLegacyRow(ctx, tx, spec, tableColumns, row); err != nil {
				return fmt.Errorf("legacy snapshot migration: upsert into %s: %w", spec.table, err)
			}
			counts[spec.table]++
		}
		if strings.EqualFold(strings.TrimSpace(opts.failAfterTable), spec.table) {
			return fmt.Errorf("legacy snapshot migration: test failpoint after table %s", spec.table)
		}
	}

	detailsJSON := marshalJSONWithDefault(map[string]any{
		"source_table": legacySnapshotStateTable,
		"counts":       counts,
	}, legacySnapshotMigrationMarkerJSONDef)
	now := time.Now().UTC()
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO `+legacySnapshotMigrationMarkerTable+` (marker_key, completed_at, details_json)
		 VALUES (?, ?, ?)
		 ON CONFLICT(marker_key) DO UPDATE SET
		   completed_at = excluded.completed_at,
		   details_json = excluded.details_json`,
		legacySnapshotMigrationMarkerKeyV1,
		now,
		detailsJSON,
	); err != nil {
		return fmt.Errorf("legacy snapshot migration: write completion marker: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("legacy snapshot migration: commit transaction: %w", err)
	}
	return nil
}

func ensureLegacyMigrationMarkerTable(ctx context.Context, db *sql.DB) error {
	if db == nil {
		return nil
	}
	stmt := `CREATE TABLE IF NOT EXISTS ` + legacySnapshotMigrationMarkerTable + ` (
		marker_key TEXT PRIMARY KEY,
		completed_at TIMESTAMP NOT NULL,
		details_json TEXT NOT NULL DEFAULT '{}'
	)`
	if _, err := db.ExecContext(ctx, stmt); err != nil {
		return fmt.Errorf("legacy snapshot migration: ensure marker table: %w", err)
	}
	return nil
}

func legacyMigrationMarkerExists(ctx context.Context, db *sql.DB) (bool, error) {
	if db == nil {
		return false, nil
	}
	var count int
	if err := db.QueryRowContext(ctx,
		`SELECT COUNT(1)
		 FROM `+legacySnapshotMigrationMarkerTable+`
		 WHERE marker_key = ?`,
		legacySnapshotMigrationMarkerKeyV1,
	).Scan(&count); err != nil {
		return false, fmt.Errorf("legacy snapshot migration: lookup marker: %w", err)
	}
	return count > 0, nil
}

func loadLegacySnapshotPayload(ctx context.Context, db *sql.DB) (string, bool, error) {
	if db == nil {
		return "", false, nil
	}
	exists, err := sqliteTableExists(ctx, db, legacySnapshotStateTable)
	if err != nil {
		return "", false, err
	}
	if !exists {
		return "", false, nil
	}

	var payload string
	err = db.QueryRowContext(ctx, `SELECT snapshot_json FROM `+legacySnapshotStateTable+` WHERE id = 1`).Scan(&payload)
	if err == sql.ErrNoRows {
		return "", false, nil
	}
	if err != nil {
		return "", false, fmt.Errorf("legacy snapshot migration: load %s payload: %w", legacySnapshotStateTable, err)
	}
	return payload, true, nil
}

func sqliteTableExists(ctx context.Context, db *sql.DB, tableName string) (bool, error) {
	tableName = strings.TrimSpace(tableName)
	if tableName == "" || db == nil {
		return false, nil
	}
	var count int
	if err := db.QueryRowContext(ctx,
		`SELECT COUNT(1)
		 FROM sqlite_master
		 WHERE type = 'table' AND name = ?`,
		tableName,
	).Scan(&count); err != nil {
		return false, fmt.Errorf("legacy snapshot migration: check sqlite table %s: %w", tableName, err)
	}
	return count > 0, nil
}

func loadSQLiteColumnMap(ctx context.Context, db *sql.DB, tables []string) (map[string]map[string]bool, error) {
	out := make(map[string]map[string]bool, len(tables))
	if db == nil {
		return out, nil
	}
	for _, table := range tables {
		table = strings.TrimSpace(table)
		if table == "" {
			continue
		}
		exists, err := sqliteTableExists(ctx, db, table)
		if err != nil {
			return nil, err
		}
		if !exists {
			continue
		}
		rows, err := db.QueryContext(ctx, `PRAGMA table_info(`+table+`)`)
		if err != nil {
			return nil, fmt.Errorf("legacy snapshot migration: table_info for %s: %w", table, err)
		}
		columns := map[string]bool{}
		for rows.Next() {
			var (
				cid        int
				name       string
				declType   string
				notNull    int
				defaultVal any
				pk         int
			)
			if scanErr := rows.Scan(&cid, &name, &declType, &notNull, &defaultVal, &pk); scanErr != nil {
				_ = rows.Close()
				return nil, fmt.Errorf("legacy snapshot migration: scan table_info %s: %w", table, scanErr)
			}
			name = strings.TrimSpace(strings.ToLower(name))
			if name != "" {
				columns[name] = true
			}
		}
		if err := rows.Close(); err != nil {
			return nil, fmt.Errorf("legacy snapshot migration: close table_info rows for %s: %w", table, err)
		}
		out[table] = columns
	}
	return out, nil
}

func eligibleTargetTables(columnMap map[string]map[string]bool, specs []legacyTableMigrationSpec) []string {
	out := make([]string, 0, len(specs))
	seen := map[string]bool{}
	for _, spec := range specs {
		if seen[spec.table] {
			continue
		}
		if len(columnMap[spec.table]) == 0 {
			continue
		}
		seen[spec.table] = true
		out = append(out, spec.table)
	}
	return out
}

func areSQLiteTablesEmpty(ctx context.Context, db *sql.DB, tables []string) (bool, error) {
	if db == nil {
		return true, nil
	}
	for _, table := range tables {
		table = strings.TrimSpace(table)
		if table == "" {
			continue
		}
		var count int
		if err := db.QueryRowContext(ctx, `SELECT COUNT(1) FROM `+table).Scan(&count); err != nil {
			return false, fmt.Errorf("legacy snapshot migration: count rows in %s: %w", table, err)
		}
		if count > 0 {
			return false, nil
		}
	}
	return true, nil
}

func legacySnapshotTargetTables(specs []legacyTableMigrationSpec) []string {
	tables := make([]string, 0, len(specs))
	seen := map[string]bool{}
	for _, spec := range specs {
		if seen[spec.table] {
			continue
		}
		seen[spec.table] = true
		tables = append(tables, spec.table)
	}
	return tables
}

type legacySnapshotSectionSpec struct {
	section string
	table   string
	derived bool
	base    string
}

func validateLegacySnapshotCoverage(
	snapshot legacySQLiteSnapshot,
	specs []legacyTableMigrationSpec,
	columnMap map[string]map[string]bool,
) error {
	sectionCounts := legacySnapshotSectionCounts(snapshot)
	specByTable := map[string]bool{}
	for _, spec := range specs {
		specByTable[strings.TrimSpace(spec.table)] = true
	}
	issues := make([]string, 0)
	for _, sectionSpec := range legacySnapshotSections() {
		count := sectionCounts[sectionSpec.section]
		if count == 0 {
			continue
		}
		if sectionSpec.derived {
			if sectionSpec.base == "" || sectionCounts[sectionSpec.base] > 0 {
				continue
			}
			issues = append(issues, fmt.Sprintf("%s has %d rows but base section %s is empty", sectionSpec.section, count, sectionSpec.base))
			continue
		}
		if strings.TrimSpace(sectionSpec.table) == "" {
			issues = append(issues, fmt.Sprintf("%s has %d rows and no target table mapping", sectionSpec.section, count))
			continue
		}
		if !specByTable[sectionSpec.table] {
			issues = append(issues, fmt.Sprintf("%s has %d rows but no migration spec for table %s", sectionSpec.section, count, sectionSpec.table))
			continue
		}
		if len(columnMap[sectionSpec.table]) == 0 {
			issues = append(issues, fmt.Sprintf("%s has %d rows but target table %s does not exist", sectionSpec.section, count, sectionSpec.table))
			continue
		}
	}
	if len(issues) > 0 {
		sort.Strings(issues)
		return fmt.Errorf("legacy snapshot migration: incomplete coverage: %s", strings.Join(issues, "; "))
	}
	return nil
}

func legacySnapshotSectionCounts(snapshot legacySQLiteSnapshot) map[string]int {
	return map[string]int{
		"documents":                      len(snapshot.Documents),
		"agreements":                     len(snapshot.Agreements),
		"drafts":                         len(snapshot.Drafts),
		"draft_wizard_index":             len(snapshot.DraftWizardIndex),
		"participants":                   len(snapshot.Participants),
		"field_definitions":              len(snapshot.FieldDefinitions),
		"field_instances":                len(snapshot.FieldInstances),
		"recipients":                     len(snapshot.Recipients),
		"fields":                         len(snapshot.Fields),
		"signing_tokens":                 len(snapshot.SigningTokens),
		"token_hash_index":               len(snapshot.TokenHashIndex),
		"signature_artifacts":            len(snapshot.SignatureArtifacts),
		"signer_profiles":                len(snapshot.SignerProfiles),
		"signer_profile_index":           len(snapshot.SignerProfileIndex),
		"saved_signatures":               len(snapshot.SavedSignerSignatures),
		"field_values":                   len(snapshot.FieldValues),
		"audit_events":                   len(snapshot.AuditEvents),
		"agreement_artifacts":            len(snapshot.AgreementArtifacts),
		"email_logs":                     len(snapshot.EmailLogs),
		"job_runs":                       len(snapshot.JobRuns),
		"job_run_dedupe_index":           len(snapshot.JobRunDedupeIndex),
		"google_import_runs":             len(snapshot.GoogleImportRuns),
		"google_import_run_dedupe_index": len(snapshot.GoogleImportRunDedupeIndex),
		"agreement_reminder_states":      len(snapshot.AgreementReminderStates),
		"outbox_messages":                len(snapshot.OutboxMessages),
		"integration_credentials":        len(snapshot.IntegrationCredentials),
		"integration_credential_index":   len(snapshot.IntegrationCredentialIndex),
		"mapping_specs":                  len(snapshot.MappingSpecs),
		"integration_bindings":           len(snapshot.IntegrationBindings),
		"integration_binding_index":      len(snapshot.IntegrationBindingIndex),
		"integration_sync_runs":          len(snapshot.IntegrationSyncRuns),
		"integration_checkpoints":        len(snapshot.IntegrationCheckpoints),
		"integration_checkpoint_index":   len(snapshot.IntegrationCheckpointIndex),
		"integration_conflicts":          len(snapshot.IntegrationConflicts),
		"integration_change_events":      len(snapshot.IntegrationChangeEvents),
		"integration_mutation_claims":    len(snapshot.IntegrationMutationClaims),
		"placement_runs":                 len(snapshot.PlacementRuns),
	}
}

func legacySnapshotSections() []legacySnapshotSectionSpec {
	return []legacySnapshotSectionSpec{
		{section: "documents", table: "documents"},
		{section: "agreements", table: "agreements"},
		{section: "drafts", table: "esign_drafts"},
		{section: "draft_wizard_index", derived: true, base: "drafts"},
		{section: "participants", table: "participants"},
		{section: "field_definitions", table: "field_definitions"},
		{section: "field_instances", table: "field_instances"},
		{section: "recipients", table: "recipients"},
		{section: "fields", table: "fields"},
		{section: "signing_tokens", table: "signing_tokens"},
		{section: "token_hash_index", derived: true, base: "signing_tokens"},
		{section: "signature_artifacts", table: "signature_artifacts"},
		{section: "signer_profiles", table: "signer_profiles"},
		{section: "signer_profile_index", derived: true, base: "signer_profiles"},
		{section: "saved_signatures", table: "saved_signer_signatures"},
		{section: "field_values", table: "field_values"},
		{section: "audit_events", table: "audit_events"},
		{section: "agreement_artifacts", table: "agreement_artifacts"},
		{section: "email_logs", table: "email_logs"},
		{section: "job_runs", table: "job_runs"},
		{section: "job_run_dedupe_index", derived: true, base: "job_runs"},
		{section: "google_import_runs", table: "google_import_runs"},
		{section: "google_import_run_dedupe_index", derived: true, base: "google_import_runs"},
		{section: "agreement_reminder_states", table: "agreement_reminder_states"},
		{section: "outbox_messages", table: "outbox_messages"},
		{section: "integration_credentials", table: "integration_credentials"},
		{section: "integration_credential_index", derived: true, base: "integration_credentials"},
		{section: "mapping_specs", table: "integration_mapping_specs"},
		{section: "integration_bindings", table: "integration_bindings"},
		{section: "integration_binding_index", derived: true, base: "integration_bindings"},
		{section: "integration_sync_runs", table: "integration_sync_runs"},
		{section: "integration_checkpoints", table: "integration_checkpoints"},
		{section: "integration_checkpoint_index", derived: true, base: "integration_checkpoints"},
		{section: "integration_conflicts", table: "integration_conflicts"},
		{section: "integration_change_events", table: "integration_change_events"},
		{section: "integration_mutation_claims", table: "integration_mutation_claims"},
		{section: "placement_runs", table: "placement_runs"},
	}
}

func upsertLegacyRow(
	ctx context.Context,
	tx *sql.Tx,
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
		if !slices.Contains(columns, conflictColumn) {
			return fmt.Errorf("missing conflict column %q", conflictColumn)
		}
	}

	placeholders := make([]string, 0, len(columns))
	for range columns {
		placeholders = append(placeholders, "?")
	}
	assignments := make([]string, 0, len(columns))
	for _, column := range columns {
		if slices.Contains(spec.conflict, column) {
			continue
		}
		assignments = append(assignments, column+" = excluded."+column)
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

func legacySnapshotMigrationSpecs() []legacyTableMigrationSpec {
	now := func() time.Time { return time.Now().UTC() }
	return []legacyTableMigrationSpec{
		{
			table:    "documents",
			columns:  []string{"id", "tenant_id", "org_id", "created_by_user_id", "title", "source_object_key", "normalized_object_key", "source_sha256", "size_bytes", "page_count", "created_at", "updated_at", "source_type", "source_google_file_id", "source_google_doc_url", "source_modified_time", "source_exported_at", "source_exported_by_user_id", "source_mime_type", "source_ingestion_mode", "pdf_compatibility_tier", "pdf_compatibility_reason", "pdf_normalization_status", "pdf_analyzed_at", "pdf_policy_version"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.Documents))
				for _, record := range sortedMapValues(snapshot.Documents) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					sourceType := strings.TrimSpace(record.SourceType)
					if sourceType == "" {
						sourceType = stores.SourceTypeUpload
					}
					rows = append(rows, map[string]any{
						"id":                         strings.TrimSpace(record.ID),
						"tenant_id":                  strings.TrimSpace(record.TenantID),
						"org_id":                     strings.TrimSpace(record.OrgID),
						"created_by_user_id":         strings.TrimSpace(record.CreatedByUserID),
						"title":                      strings.TrimSpace(record.Title),
						"source_object_key":          strings.TrimSpace(record.SourceObjectKey),
						"normalized_object_key":      strings.TrimSpace(record.NormalizedObjectKey),
						"source_sha256":              strings.TrimSpace(record.SourceSHA256),
						"size_bytes":                 record.SizeBytes,
						"page_count":                 record.PageCount,
						"created_at":                 createdAt,
						"updated_at":                 updatedAt,
						"source_type":                sourceType,
						"source_google_file_id":      strings.TrimSpace(record.SourceGoogleFileID),
						"source_google_doc_url":      strings.TrimSpace(record.SourceGoogleDocURL),
						"source_modified_time":       optionalTime(record.SourceModifiedTime),
						"source_exported_at":         optionalTime(record.SourceExportedAt),
						"source_exported_by_user_id": strings.TrimSpace(record.SourceExportedByUserID),
						"source_mime_type":           strings.TrimSpace(record.SourceMimeType),
						"source_ingestion_mode":      strings.TrimSpace(record.SourceIngestionMode),
						"pdf_compatibility_tier":     strings.TrimSpace(record.PDFCompatibilityTier),
						"pdf_compatibility_reason":   strings.TrimSpace(record.PDFCompatibilityReason),
						"pdf_normalization_status":   strings.TrimSpace(record.PDFNormalizationStatus),
						"pdf_analyzed_at":            optionalTime(record.PDFAnalyzedAt),
						"pdf_policy_version":         strings.TrimSpace(record.PDFPolicyVersion),
					})
				}
				return rows
			},
		},
		{
			table:    "agreements",
			columns:  []string{"id", "tenant_id", "org_id", "document_id", "status", "title", "message", "version", "sent_at", "completed_at", "voided_at", "declined_at", "expired_at", "created_by_user_id", "updated_by_user_id", "created_at", "updated_at", "source_type", "source_google_file_id", "source_google_doc_url", "source_modified_time", "source_exported_at", "source_exported_by_user_id", "source_mime_type", "source_ingestion_mode"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.Agreements))
				for _, record := range sortedMapValues(snapshot.Agreements) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					version := record.Version
					if version <= 0 {
						version = 1
					}
					status := strings.TrimSpace(record.Status)
					if status == "" {
						status = stores.AgreementStatusDraft
					}
					sourceType := strings.TrimSpace(record.SourceType)
					if sourceType == "" {
						sourceType = stores.SourceTypeUpload
					}
					rows = append(rows, map[string]any{
						"id":                         strings.TrimSpace(record.ID),
						"tenant_id":                  strings.TrimSpace(record.TenantID),
						"org_id":                     strings.TrimSpace(record.OrgID),
						"document_id":                strings.TrimSpace(record.DocumentID),
						"status":                     status,
						"title":                      strings.TrimSpace(record.Title),
						"message":                    strings.TrimSpace(record.Message),
						"version":                    version,
						"sent_at":                    optionalTime(record.SentAt),
						"completed_at":               optionalTime(record.CompletedAt),
						"voided_at":                  optionalTime(record.VoidedAt),
						"declined_at":                optionalTime(record.DeclinedAt),
						"expired_at":                 optionalTime(record.ExpiredAt),
						"created_by_user_id":         strings.TrimSpace(record.CreatedByUserID),
						"updated_by_user_id":         strings.TrimSpace(record.UpdatedByUserID),
						"created_at":                 createdAt,
						"updated_at":                 updatedAt,
						"source_type":                sourceType,
						"source_google_file_id":      strings.TrimSpace(record.SourceGoogleFileID),
						"source_google_doc_url":      strings.TrimSpace(record.SourceGoogleDocURL),
						"source_modified_time":       optionalTime(record.SourceModifiedTime),
						"source_exported_at":         optionalTime(record.SourceExportedAt),
						"source_exported_by_user_id": strings.TrimSpace(record.SourceExportedByUserID),
						"source_mime_type":           strings.TrimSpace(record.SourceMimeType),
						"source_ingestion_mode":      strings.TrimSpace(record.SourceIngestionMode),
					})
				}
				return rows
			},
		},
		{
			table:    "recipients",
			columns:  []string{"id", "tenant_id", "org_id", "agreement_id", "email", "name", "role", "signing_order", "first_view_at", "last_view_at", "declined_at", "decline_reason", "completed_at", "version", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.Recipients)+len(snapshot.Participants))
				addRecipient := func(record stores.RecipientRecord) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					version := record.Version
					if version <= 0 {
						version = 1
					}
					rows = append(rows, map[string]any{
						"id":             strings.TrimSpace(record.ID),
						"tenant_id":      strings.TrimSpace(record.TenantID),
						"org_id":         strings.TrimSpace(record.OrgID),
						"agreement_id":   strings.TrimSpace(record.AgreementID),
						"email":          strings.TrimSpace(record.Email),
						"name":           strings.TrimSpace(record.Name),
						"role":           strings.TrimSpace(record.Role),
						"signing_order":  record.SigningOrder,
						"first_view_at":  optionalTime(record.FirstViewAt),
						"last_view_at":   optionalTime(record.LastViewAt),
						"declined_at":    optionalTime(record.DeclinedAt),
						"decline_reason": strings.TrimSpace(record.DeclineReason),
						"completed_at":   optionalTime(record.CompletedAt),
						"version":        version,
						"created_at":     createdAt,
						"updated_at":     updatedAt,
					})
				}
				seen := map[string]bool{}
				for _, record := range sortedMapValues(snapshot.Recipients) {
					addRecipient(record)
					seen[strings.TrimSpace(record.ID)] = true
				}
				for _, participant := range sortedMapValues(snapshot.Participants) {
					id := strings.TrimSpace(participant.ID)
					if id == "" || seen[id] {
						continue
					}
					addRecipient(stores.RecipientRecord{
						ID:            id,
						TenantID:      participant.TenantID,
						OrgID:         participant.OrgID,
						AgreementID:   participant.AgreementID,
						Email:         participant.Email,
						Name:          participant.Name,
						Role:          participant.Role,
						SigningOrder:  participant.SigningStage,
						FirstViewAt:   participant.FirstViewAt,
						LastViewAt:    participant.LastViewAt,
						DeclinedAt:    participant.DeclinedAt,
						DeclineReason: participant.DeclineReason,
						CompletedAt:   participant.CompletedAt,
						Version:       participant.Version,
						CreatedAt:     participant.CreatedAt,
						UpdatedAt:     participant.UpdatedAt,
					})
					seen[id] = true
				}
				return rows
			},
		},
		{
			table:    "participants",
			columns:  []string{"id", "tenant_id", "org_id", "agreement_id", "email", "name", "role", "signing_stage", "first_view_at", "last_view_at", "declined_at", "decline_reason", "completed_at", "version", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.Participants))
				for _, record := range sortedMapValues(snapshot.Participants) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					version := record.Version
					if version <= 0 {
						version = 1
					}
					rows = append(rows, map[string]any{
						"id":             strings.TrimSpace(record.ID),
						"tenant_id":      strings.TrimSpace(record.TenantID),
						"org_id":         strings.TrimSpace(record.OrgID),
						"agreement_id":   strings.TrimSpace(record.AgreementID),
						"email":          strings.TrimSpace(record.Email),
						"name":           strings.TrimSpace(record.Name),
						"role":           strings.TrimSpace(record.Role),
						"signing_stage":  record.SigningStage,
						"first_view_at":  optionalTime(record.FirstViewAt),
						"last_view_at":   optionalTime(record.LastViewAt),
						"declined_at":    optionalTime(record.DeclinedAt),
						"decline_reason": strings.TrimSpace(record.DeclineReason),
						"completed_at":   optionalTime(record.CompletedAt),
						"version":        version,
						"created_at":     createdAt,
						"updated_at":     updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "fields",
			columns:  []string{"id", "tenant_id", "org_id", "agreement_id", "recipient_id", "field_type", "page_number", "pos_x", "pos_y", "width", "height", "required", "created_at", "updated_at", "field_definition_id", "placement_source", "link_group_id", "linked_from_field_id", "is_unlinked"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.Fields)+len(snapshot.FieldInstances))
				definitionsByID := map[string]stores.FieldDefinitionRecord{}
				for _, definition := range snapshot.FieldDefinitions {
					id := strings.TrimSpace(definition.ID)
					if id == "" {
						continue
					}
					definitionsByID[id] = definition
				}
				addField := func(record stores.FieldRecord) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					rows = append(rows, map[string]any{
						"id":                   strings.TrimSpace(record.ID),
						"tenant_id":            strings.TrimSpace(record.TenantID),
						"org_id":               strings.TrimSpace(record.OrgID),
						"agreement_id":         strings.TrimSpace(record.AgreementID),
						"recipient_id":         nullableString(record.RecipientID),
						"field_type":           strings.TrimSpace(record.Type),
						"page_number":          record.PageNumber,
						"pos_x":                record.PosX,
						"pos_y":                record.PosY,
						"width":                record.Width,
						"height":               record.Height,
						"required":             record.Required,
						"created_at":           createdAt,
						"updated_at":           updatedAt,
						"field_definition_id":  nullableString(record.FieldDefinitionID),
						"placement_source":     strings.TrimSpace(record.PlacementSource),
						"link_group_id":        strings.TrimSpace(record.LinkGroupID),
						"linked_from_field_id": strings.TrimSpace(record.LinkedFromFieldID),
						"is_unlinked":          record.IsUnlinked,
					})
				}
				seen := map[string]bool{}
				for _, record := range sortedMapValues(snapshot.Fields) {
					addField(record)
					seen[strings.TrimSpace(record.ID)] = true
				}
				for _, instance := range sortedMapValues(snapshot.FieldInstances) {
					id := strings.TrimSpace(instance.ID)
					if id == "" || seen[id] {
						continue
					}
					definition, ok := definitionsByID[strings.TrimSpace(instance.FieldDefinitionID)]
					if !ok {
						continue
					}
					addField(stores.FieldRecord{
						ID:                id,
						FieldDefinitionID: instance.FieldDefinitionID,
						TenantID:          instance.TenantID,
						OrgID:             instance.OrgID,
						AgreementID:       instance.AgreementID,
						RecipientID:       definition.ParticipantID,
						Type:              definition.Type,
						PageNumber:        instance.PageNumber,
						PosX:              instance.X,
						PosY:              instance.Y,
						Width:             instance.Width,
						Height:            instance.Height,
						Required:          definition.Required,
						CreatedAt:         instance.CreatedAt,
						UpdatedAt:         instance.UpdatedAt,
					})
					seen[id] = true
				}
				return rows
			},
		},
		{
			table:    "field_definitions",
			columns:  []string{"id", "tenant_id", "org_id", "agreement_id", "participant_id", "field_type", "required", "validation_json", "link_group_id", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.FieldDefinitions))
				for _, record := range sortedMapValues(snapshot.FieldDefinitions) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					rows = append(rows, map[string]any{
						"id":              strings.TrimSpace(record.ID),
						"tenant_id":       strings.TrimSpace(record.TenantID),
						"org_id":          strings.TrimSpace(record.OrgID),
						"agreement_id":    strings.TrimSpace(record.AgreementID),
						"participant_id":  strings.TrimSpace(record.ParticipantID),
						"field_type":      strings.TrimSpace(record.Type),
						"required":        record.Required,
						"validation_json": strings.TrimSpace(record.ValidationJSON),
						"link_group_id":   strings.TrimSpace(record.LinkGroupID),
						"created_at":      createdAt,
						"updated_at":      updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "field_instances",
			columns:  []string{"id", "tenant_id", "org_id", "agreement_id", "field_definition_id", "page_number", "x", "y", "width", "height", "tab_index", "label", "appearance_json", "created_at", "updated_at", "placement_source", "resolver_id", "confidence", "placement_run_id", "manual_override", "link_group_id", "linked_from_field_id", "is_unlinked"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.FieldInstances))
				for _, record := range sortedMapValues(snapshot.FieldInstances) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					rows = append(rows, map[string]any{
						"id":                   strings.TrimSpace(record.ID),
						"tenant_id":            strings.TrimSpace(record.TenantID),
						"org_id":               strings.TrimSpace(record.OrgID),
						"agreement_id":         strings.TrimSpace(record.AgreementID),
						"field_definition_id":  strings.TrimSpace(record.FieldDefinitionID),
						"page_number":          record.PageNumber,
						"x":                    record.X,
						"y":                    record.Y,
						"width":                record.Width,
						"height":               record.Height,
						"tab_index":            record.TabIndex,
						"label":                strings.TrimSpace(record.Label),
						"appearance_json":      strings.TrimSpace(record.AppearanceJSON),
						"created_at":           createdAt,
						"updated_at":           updatedAt,
						"placement_source":     strings.TrimSpace(record.PlacementSource),
						"resolver_id":          strings.TrimSpace(record.ResolverID),
						"confidence":           record.Confidence,
						"placement_run_id":     nullableString(record.PlacementRunID),
						"manual_override":      record.ManualOverride,
						"link_group_id":        strings.TrimSpace(record.LinkGroupID),
						"linked_from_field_id": strings.TrimSpace(record.LinkedFromFieldID),
						"is_unlinked":          record.IsUnlinked,
					})
				}
				return rows
			},
		},
		{
			table:    "signing_tokens",
			columns:  []string{"id", "tenant_id", "org_id", "agreement_id", "recipient_id", "token_hash", "status", "expires_at", "revoked_at", "created_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.SigningTokens))
				for _, record := range sortedMapValues(snapshot.SigningTokens) {
					createdAt := requiredTime(record.CreatedAt, now())
					status := strings.TrimSpace(record.Status)
					if status == "" {
						status = stores.SigningTokenStatusActive
					}
					rows = append(rows, map[string]any{
						"id":           strings.TrimSpace(record.ID),
						"tenant_id":    strings.TrimSpace(record.TenantID),
						"org_id":       strings.TrimSpace(record.OrgID),
						"agreement_id": strings.TrimSpace(record.AgreementID),
						"recipient_id": strings.TrimSpace(record.RecipientID),
						"token_hash":   strings.TrimSpace(record.TokenHash),
						"status":       status,
						"expires_at":   requiredTime(record.ExpiresAt, createdAt),
						"revoked_at":   optionalTime(record.RevokedAt),
						"created_at":   createdAt,
					})
				}
				return rows
			},
		},
		{
			table:    "signature_artifacts",
			columns:  []string{"id", "tenant_id", "org_id", "agreement_id", "recipient_id", "artifact_type", "object_key", "sha256", "created_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.SignatureArtifacts))
				for _, record := range sortedMapValues(snapshot.SignatureArtifacts) {
					createdAt := requiredTime(record.CreatedAt, now())
					rows = append(rows, map[string]any{
						"id":            strings.TrimSpace(record.ID),
						"tenant_id":     strings.TrimSpace(record.TenantID),
						"org_id":        strings.TrimSpace(record.OrgID),
						"agreement_id":  strings.TrimSpace(record.AgreementID),
						"recipient_id":  strings.TrimSpace(record.RecipientID),
						"artifact_type": strings.TrimSpace(record.Type),
						"object_key":    strings.TrimSpace(record.ObjectKey),
						"sha256":        strings.TrimSpace(record.SHA256),
						"created_at":    createdAt,
					})
				}
				return rows
			},
		},
		{
			table:    "signer_profiles",
			columns:  []string{"id", "tenant_id", "org_id", "subject", "profile_key", "full_name", "initials", "typed_signature", "drawn_signature_data_url", "drawn_initials_data_url", "remember", "created_at", "updated_at", "expires_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.SignerProfiles))
				for _, record := range sortedMapValues(snapshot.SignerProfiles) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					expiresAt := requiredTime(record.ExpiresAt, updatedAt.Add(365*24*time.Hour))
					rows = append(rows, map[string]any{
						"id":                       strings.TrimSpace(record.ID),
						"tenant_id":                strings.TrimSpace(record.TenantID),
						"org_id":                   strings.TrimSpace(record.OrgID),
						"subject":                  strings.TrimSpace(record.Subject),
						"profile_key":              strings.TrimSpace(record.Key),
						"full_name":                strings.TrimSpace(record.FullName),
						"initials":                 strings.TrimSpace(record.Initials),
						"typed_signature":          strings.TrimSpace(record.TypedSignature),
						"drawn_signature_data_url": strings.TrimSpace(record.DrawnSignatureDataURL),
						"drawn_initials_data_url":  strings.TrimSpace(record.DrawnInitialsDataURL),
						"remember":                 record.Remember,
						"created_at":               createdAt,
						"updated_at":               updatedAt,
						"expires_at":               expiresAt,
					})
				}
				return rows
			},
		},
		{
			table:    "saved_signer_signatures",
			columns:  []string{"id", "tenant_id", "org_id", "subject", "signature_type", "label", "object_key", "thumbnail_data_url", "created_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.SavedSignerSignatures))
				for _, record := range sortedMapValues(snapshot.SavedSignerSignatures) {
					createdAt := requiredTime(record.CreatedAt, now())
					rows = append(rows, map[string]any{
						"id":                 strings.TrimSpace(record.ID),
						"tenant_id":          strings.TrimSpace(record.TenantID),
						"org_id":             strings.TrimSpace(record.OrgID),
						"subject":            strings.TrimSpace(record.Subject),
						"signature_type":     strings.TrimSpace(record.Type),
						"label":              strings.TrimSpace(record.Label),
						"object_key":         strings.TrimSpace(record.ObjectKey),
						"thumbnail_data_url": strings.TrimSpace(record.ThumbnailDataURL),
						"created_at":         createdAt,
					})
				}
				return rows
			},
		},
		{
			table:    "field_values",
			columns:  []string{"id", "tenant_id", "org_id", "agreement_id", "recipient_id", "field_id", "value_text", "value_bool", "signature_artifact_id", "version", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.FieldValues))
				for _, record := range sortedMapValues(snapshot.FieldValues) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					version := record.Version
					if version <= 0 {
						version = 1
					}
					rows = append(rows, map[string]any{
						"id":                    strings.TrimSpace(record.ID),
						"tenant_id":             strings.TrimSpace(record.TenantID),
						"org_id":                strings.TrimSpace(record.OrgID),
						"agreement_id":          strings.TrimSpace(record.AgreementID),
						"recipient_id":          strings.TrimSpace(record.RecipientID),
						"field_id":              strings.TrimSpace(record.FieldID),
						"value_text":            strings.TrimSpace(record.ValueText),
						"value_bool":            optionalBool(record.ValueBool),
						"signature_artifact_id": nullableString(record.SignatureArtifactID),
						"version":               version,
						"created_at":            createdAt,
						"updated_at":            updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "audit_events",
			columns:  []string{"id", "tenant_id", "org_id", "agreement_id", "event_type", "actor_type", "actor_id", "ip_address", "user_agent", "metadata_json", "created_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.AuditEvents))
				for _, record := range sortedMapValues(snapshot.AuditEvents) {
					createdAt := requiredTime(record.CreatedAt, now())
					metadataJSON := strings.TrimSpace(record.MetadataJSON)
					if metadataJSON == "" {
						metadataJSON = "{}"
					}
					rows = append(rows, map[string]any{
						"id":            strings.TrimSpace(record.ID),
						"tenant_id":     strings.TrimSpace(record.TenantID),
						"org_id":        strings.TrimSpace(record.OrgID),
						"agreement_id":  strings.TrimSpace(record.AgreementID),
						"event_type":    strings.TrimSpace(record.EventType),
						"actor_type":    strings.TrimSpace(record.ActorType),
						"actor_id":      strings.TrimSpace(record.ActorID),
						"ip_address":    strings.TrimSpace(record.IPAddress),
						"user_agent":    strings.TrimSpace(record.UserAgent),
						"metadata_json": metadataJSON,
						"created_at":    createdAt,
					})
				}
				return rows
			},
		},
		{
			table:    "email_logs",
			columns:  []string{"id", "tenant_id", "org_id", "agreement_id", "recipient_id", "template_code", "provider_message_id", "status", "failure_reason", "attempt_count", "max_attempts", "correlation_id", "next_retry_at", "sent_at", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.EmailLogs))
				for _, record := range sortedMapValues(snapshot.EmailLogs) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					status := strings.TrimSpace(record.Status)
					if status == "" {
						status = "queued"
					}
					rows = append(rows, map[string]any{
						"id":                  strings.TrimSpace(record.ID),
						"tenant_id":           strings.TrimSpace(record.TenantID),
						"org_id":              strings.TrimSpace(record.OrgID),
						"agreement_id":        strings.TrimSpace(record.AgreementID),
						"recipient_id":        nullableString(record.RecipientID),
						"template_code":       strings.TrimSpace(record.TemplateCode),
						"provider_message_id": strings.TrimSpace(record.ProviderMessageID),
						"status":              status,
						"failure_reason":      strings.TrimSpace(record.FailureReason),
						"attempt_count":       record.AttemptCount,
						"max_attempts":        record.MaxAttempts,
						"correlation_id":      strings.TrimSpace(record.CorrelationID),
						"next_retry_at":       optionalTime(record.NextRetryAt),
						"sent_at":             optionalTime(record.SentAt),
						"created_at":          createdAt,
						"updated_at":          updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "agreement_artifacts",
			columns:  []string{"agreement_id", "tenant_id", "org_id", "executed_object_key", "executed_sha256", "certificate_object_key", "certificate_sha256", "correlation_id", "created_at", "updated_at"},
			conflict: []string{"agreement_id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.AgreementArtifacts))
				for _, record := range sortedMapValues(snapshot.AgreementArtifacts) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					rows = append(rows, map[string]any{
						"agreement_id":           strings.TrimSpace(record.AgreementID),
						"tenant_id":              strings.TrimSpace(record.TenantID),
						"org_id":                 strings.TrimSpace(record.OrgID),
						"executed_object_key":    strings.TrimSpace(record.ExecutedObjectKey),
						"executed_sha256":        strings.TrimSpace(record.ExecutedSHA256),
						"certificate_object_key": strings.TrimSpace(record.CertificateObjectKey),
						"certificate_sha256":     strings.TrimSpace(record.CertificateSHA256),
						"correlation_id":         strings.TrimSpace(record.CorrelationID),
						"created_at":             createdAt,
						"updated_at":             updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "job_runs",
			columns:  []string{"id", "tenant_id", "org_id", "job_name", "dedupe_key", "agreement_id", "recipient_id", "correlation_id", "status", "attempt_count", "max_attempts", "last_error", "next_retry_at", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.JobRuns))
				for _, record := range sortedMapValues(snapshot.JobRuns) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					rows = append(rows, map[string]any{
						"id":             strings.TrimSpace(record.ID),
						"tenant_id":      strings.TrimSpace(record.TenantID),
						"org_id":         strings.TrimSpace(record.OrgID),
						"job_name":       strings.TrimSpace(record.JobName),
						"dedupe_key":     strings.TrimSpace(record.DedupeKey),
						"agreement_id":   strings.TrimSpace(record.AgreementID),
						"recipient_id":   nullableString(record.RecipientID),
						"correlation_id": strings.TrimSpace(record.CorrelationID),
						"status":         strings.TrimSpace(record.Status),
						"attempt_count":  record.AttemptCount,
						"max_attempts":   record.MaxAttempts,
						"last_error":     strings.TrimSpace(record.LastError),
						"next_retry_at":  optionalTime(record.NextRetryAt),
						"created_at":     createdAt,
						"updated_at":     updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "google_import_runs",
			columns:  []string{"id", "tenant_id", "org_id", "user_id", "google_file_id", "source_version_hint", "dedupe_key", "document_title", "agreement_title", "created_by_user_id", "correlation_id", "status", "document_id", "agreement_id", "source_mime_type", "ingestion_mode", "error_code", "error_message", "error_details_json", "created_at", "updated_at", "started_at", "completed_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.GoogleImportRuns))
				for _, record := range sortedMapValues(snapshot.GoogleImportRuns) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					rows = append(rows, map[string]any{
						"id":                  strings.TrimSpace(record.ID),
						"tenant_id":           strings.TrimSpace(record.TenantID),
						"org_id":              strings.TrimSpace(record.OrgID),
						"user_id":             strings.TrimSpace(record.UserID),
						"google_file_id":      strings.TrimSpace(record.GoogleFileID),
						"source_version_hint": strings.TrimSpace(record.SourceVersionHint),
						"dedupe_key":          strings.TrimSpace(record.DedupeKey),
						"document_title":      strings.TrimSpace(record.DocumentTitle),
						"agreement_title":     strings.TrimSpace(record.AgreementTitle),
						"created_by_user_id":  strings.TrimSpace(record.CreatedByUserID),
						"correlation_id":      strings.TrimSpace(record.CorrelationID),
						"status":              strings.TrimSpace(record.Status),
						"document_id":         strings.TrimSpace(record.DocumentID),
						"agreement_id":        strings.TrimSpace(record.AgreementID),
						"source_mime_type":    strings.TrimSpace(record.SourceMimeType),
						"ingestion_mode":      strings.TrimSpace(record.IngestionMode),
						"error_code":          strings.TrimSpace(record.ErrorCode),
						"error_message":       strings.TrimSpace(record.ErrorMessage),
						"error_details_json":  strings.TrimSpace(record.ErrorDetailsJSON),
						"created_at":          createdAt,
						"updated_at":          updatedAt,
						"started_at":          optionalTime(record.StartedAt),
						"completed_at":        optionalTime(record.CompletedAt),
					})
				}
				return rows
			},
		},
		{
			table:    "agreement_reminder_states",
			columns:  []string{"id", "tenant_id", "org_id", "agreement_id", "recipient_id", "status", "terminal_reason", "policy_version", "sent_count", "first_sent_at", "last_sent_at", "last_viewed_at", "last_manual_resend_at", "next_due_at", "last_reason_code", "last_error_code", "last_error_internal_encrypted", "last_error_internal_expires_at", "lease_seq", "claimed_at", "last_heartbeat_at", "sweep_id", "worker_id", "last_evaluated_at", "last_attempted_send_at", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.AgreementReminderStates))
				for _, record := range sortedMapValues(snapshot.AgreementReminderStates) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					status := strings.ToLower(strings.TrimSpace(record.Status))
					if status == "" {
						status = stores.AgreementReminderStatusActive
					}
					nextDueAt := optionalTime(record.NextDueAt)
					if status == stores.AgreementReminderStatusActive && nextDueAt == nil {
						nextDueAt = optionalTime(record.FirstSentAt)
						if nextDueAt == nil {
							nextDueAt = optionalTime(&updatedAt)
						}
					}
					if status != stores.AgreementReminderStatusActive {
						nextDueAt = nil
					}
					lastErrorCode := strings.TrimSpace(record.LastErrorCode)
					if lastErrorCode == "" {
						lastErrorCode = strings.TrimSpace(record.LastError)
					}
					policyVersion := strings.TrimSpace(record.PolicyVersion)
					if policyVersion == "" {
						policyVersion = appcfg.ReminderPolicyVersion
					}
					rows = append(rows, map[string]any{
						"id":                             strings.TrimSpace(record.ID),
						"tenant_id":                      strings.TrimSpace(record.TenantID),
						"org_id":                         strings.TrimSpace(record.OrgID),
						"agreement_id":                   strings.TrimSpace(record.AgreementID),
						"recipient_id":                   strings.TrimSpace(record.RecipientID),
						"status":                         status,
						"terminal_reason":                strings.TrimSpace(record.TerminalReason),
						"policy_version":                 policyVersion,
						"sent_count":                     record.SentCount,
						"first_sent_at":                  optionalTime(record.FirstSentAt),
						"last_sent_at":                   optionalTime(record.LastSentAt),
						"last_viewed_at":                 optionalTime(record.LastViewedAt),
						"last_manual_resend_at":          optionalTime(record.LastManualResendAt),
						"next_due_at":                    nextDueAt,
						"last_reason_code":               strings.TrimSpace(record.LastReasonCode),
						"last_error_code":                strings.TrimSpace(lastErrorCode),
						"last_error_internal_encrypted":  strings.TrimSpace(record.LastErrorInternalEncrypted),
						"last_error_internal_expires_at": optionalTime(record.LastErrorInternalExpiresAt),
						"lease_seq":                      record.LeaseSeq,
						"claimed_at":                     optionalTime(record.ClaimedAt),
						"last_heartbeat_at":              optionalTime(record.LastHeartbeatAt),
						"sweep_id":                       strings.TrimSpace(record.SweepID),
						"worker_id":                      strings.TrimSpace(record.WorkerID),
						"last_evaluated_at":              optionalTime(record.LastEvaluatedAt),
						"last_attempted_send_at":         optionalTime(record.LastAttemptedSendAt),
						"created_at":                     createdAt,
						"updated_at":                     updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "outbox_messages",
			columns:  []string{"id", "tenant_id", "org_id", "topic", "message_key", "payload_json", "headers_json", "correlation_id", "status", "attempt_count", "max_attempts", "last_error", "available_at", "locked_at", "locked_by", "published_at", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.OutboxMessages))
				for _, record := range sortedMapValues(snapshot.OutboxMessages) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					availableAt := requiredTime(record.AvailableAt, createdAt)
					rows = append(rows, map[string]any{
						"id":             strings.TrimSpace(record.ID),
						"tenant_id":      strings.TrimSpace(record.TenantID),
						"org_id":         strings.TrimSpace(record.OrgID),
						"topic":          strings.TrimSpace(record.Topic),
						"message_key":    strings.TrimSpace(record.MessageKey),
						"payload_json":   strings.TrimSpace(record.PayloadJSON),
						"headers_json":   strings.TrimSpace(record.HeadersJSON),
						"correlation_id": strings.TrimSpace(record.CorrelationID),
						"status":         strings.TrimSpace(record.Status),
						"attempt_count":  record.AttemptCount,
						"max_attempts":   record.MaxAttempts,
						"last_error":     strings.TrimSpace(record.LastError),
						"available_at":   availableAt,
						"locked_at":      optionalTime(record.LockedAt),
						"locked_by":      strings.TrimSpace(record.LockedBy),
						"published_at":   optionalTime(record.PublishedAt),
						"created_at":     createdAt,
						"updated_at":     updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "integration_credentials",
			columns:  []string{"id", "tenant_id", "org_id", "user_id", "provider", "encrypted_access_token", "encrypted_refresh_token", "scopes_json", "expires_at", "profile_json", "last_used_at", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.IntegrationCredentials))
				for _, record := range sortedMapValues(snapshot.IntegrationCredentials) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					rows = append(rows, map[string]any{
						"id":                      strings.TrimSpace(record.ID),
						"tenant_id":               strings.TrimSpace(record.TenantID),
						"org_id":                  strings.TrimSpace(record.OrgID),
						"user_id":                 strings.TrimSpace(record.UserID),
						"provider":                strings.TrimSpace(record.Provider),
						"encrypted_access_token":  strings.TrimSpace(record.EncryptedAccessToken),
						"encrypted_refresh_token": strings.TrimSpace(record.EncryptedRefreshToken),
						"scopes_json":             marshalJSONWithDefault(record.Scopes, "[]"),
						"expires_at":              optionalTime(record.ExpiresAt),
						"profile_json":            strings.TrimSpace(record.ProfileJSON),
						"last_used_at":            optionalTime(record.LastUsedAt),
						"created_at":              createdAt,
						"updated_at":              updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "integration_mapping_specs",
			columns:  []string{"id", "tenant_id", "org_id", "provider", "name", "version", "status", "external_schema_json", "rules_json", "compiled_json", "compiled_hash", "published_at", "created_by_user_id", "updated_by_user_id", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.MappingSpecs))
				for _, record := range sortedMapValues(snapshot.MappingSpecs) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					version := record.Version
					if version <= 0 {
						version = 1
					}
					status := strings.TrimSpace(record.Status)
					if status == "" {
						status = stores.MappingSpecStatusDraft
					}
					rows = append(rows, map[string]any{
						"id":                   strings.TrimSpace(record.ID),
						"tenant_id":            strings.TrimSpace(record.TenantID),
						"org_id":               strings.TrimSpace(record.OrgID),
						"provider":             strings.TrimSpace(record.Provider),
						"name":                 strings.TrimSpace(record.Name),
						"version":              version,
						"status":               status,
						"external_schema_json": marshalJSONWithDefault(record.ExternalSchema, "{}"),
						"rules_json":           marshalJSONWithDefault(record.Rules, "[]"),
						"compiled_json":        strings.TrimSpace(record.CompiledJSON),
						"compiled_hash":        strings.TrimSpace(record.CompiledHash),
						"published_at":         optionalTime(record.PublishedAt),
						"created_by_user_id":   strings.TrimSpace(record.CreatedByUserID),
						"updated_by_user_id":   strings.TrimSpace(record.UpdatedByUserID),
						"created_at":           createdAt,
						"updated_at":           updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "integration_bindings",
			columns:  []string{"id", "tenant_id", "org_id", "provider", "entity_kind", "external_id", "internal_id", "provenance_json", "version", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.IntegrationBindings))
				for _, record := range sortedMapValues(snapshot.IntegrationBindings) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					version := record.Version
					if version <= 0 {
						version = 1
					}
					rows = append(rows, map[string]any{
						"id":              strings.TrimSpace(record.ID),
						"tenant_id":       strings.TrimSpace(record.TenantID),
						"org_id":          strings.TrimSpace(record.OrgID),
						"provider":        strings.TrimSpace(record.Provider),
						"entity_kind":     strings.TrimSpace(record.EntityKind),
						"external_id":     strings.TrimSpace(record.ExternalID),
						"internal_id":     strings.TrimSpace(record.InternalID),
						"provenance_json": strings.TrimSpace(record.ProvenanceJSON),
						"version":         version,
						"created_at":      createdAt,
						"updated_at":      updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "integration_sync_runs",
			columns:  []string{"id", "tenant_id", "org_id", "provider", "direction", "mapping_spec_id", "status", "cursor", "last_error", "attempt_count", "version", "started_at", "completed_at", "created_by_user_id", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.IntegrationSyncRuns))
				for _, record := range sortedMapValues(snapshot.IntegrationSyncRuns) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					startedAt := requiredTime(record.StartedAt, createdAt)
					version := record.Version
					if version <= 0 {
						version = 1
					}
					attemptCount := record.AttemptCount
					if attemptCount <= 0 {
						attemptCount = 1
					}
					status := strings.TrimSpace(record.Status)
					if status == "" {
						status = stores.IntegrationSyncRunStatusPending
					}
					rows = append(rows, map[string]any{
						"id":                 strings.TrimSpace(record.ID),
						"tenant_id":          strings.TrimSpace(record.TenantID),
						"org_id":             strings.TrimSpace(record.OrgID),
						"provider":           strings.TrimSpace(record.Provider),
						"direction":          strings.TrimSpace(record.Direction),
						"mapping_spec_id":    strings.TrimSpace(record.MappingSpecID),
						"status":             status,
						"cursor":             strings.TrimSpace(record.Cursor),
						"last_error":         strings.TrimSpace(record.LastError),
						"attempt_count":      attemptCount,
						"version":            version,
						"started_at":         startedAt,
						"completed_at":       optionalTime(record.CompletedAt),
						"created_by_user_id": strings.TrimSpace(record.CreatedByUserID),
						"created_at":         createdAt,
						"updated_at":         updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "integration_checkpoints",
			columns:  []string{"id", "tenant_id", "org_id", "run_id", "checkpoint_key", "cursor", "payload_json", "version", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.IntegrationCheckpoints))
				for _, record := range sortedMapValues(snapshot.IntegrationCheckpoints) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					version := record.Version
					if version <= 0 {
						version = 1
					}
					rows = append(rows, map[string]any{
						"id":             strings.TrimSpace(record.ID),
						"tenant_id":      strings.TrimSpace(record.TenantID),
						"org_id":         strings.TrimSpace(record.OrgID),
						"run_id":         strings.TrimSpace(record.RunID),
						"checkpoint_key": strings.TrimSpace(record.CheckpointKey),
						"cursor":         strings.TrimSpace(record.Cursor),
						"payload_json":   strings.TrimSpace(record.PayloadJSON),
						"version":        version,
						"created_at":     createdAt,
						"updated_at":     updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "integration_conflicts",
			columns:  []string{"id", "tenant_id", "org_id", "run_id", "binding_id", "provider", "entity_kind", "external_id", "internal_id", "status", "reason", "payload_json", "resolution_json", "resolved_by_user_id", "resolved_at", "version", "created_at", "updated_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.IntegrationConflicts))
				for _, record := range sortedMapValues(snapshot.IntegrationConflicts) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					version := record.Version
					if version <= 0 {
						version = 1
					}
					status := strings.TrimSpace(record.Status)
					if status == "" {
						status = stores.IntegrationConflictStatusPending
					}
					rows = append(rows, map[string]any{
						"id":                  strings.TrimSpace(record.ID),
						"tenant_id":           strings.TrimSpace(record.TenantID),
						"org_id":              strings.TrimSpace(record.OrgID),
						"run_id":              strings.TrimSpace(record.RunID),
						"binding_id":          nullableString(record.BindingID),
						"provider":            strings.TrimSpace(record.Provider),
						"entity_kind":         strings.TrimSpace(record.EntityKind),
						"external_id":         strings.TrimSpace(record.ExternalID),
						"internal_id":         strings.TrimSpace(record.InternalID),
						"status":              status,
						"reason":              strings.TrimSpace(record.Reason),
						"payload_json":        strings.TrimSpace(record.PayloadJSON),
						"resolution_json":     strings.TrimSpace(record.ResolutionJSON),
						"resolved_by_user_id": strings.TrimSpace(record.ResolvedByUserID),
						"resolved_at":         optionalTime(record.ResolvedAt),
						"version":             version,
						"created_at":          createdAt,
						"updated_at":          updatedAt,
					})
				}
				return rows
			},
		},
		{
			table:    "integration_change_events",
			columns:  []string{"id", "tenant_id", "org_id", "agreement_id", "provider", "event_type", "source_event_id", "idempotency_key", "payload_json", "emitted_at", "created_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.IntegrationChangeEvents))
				for _, record := range sortedMapValues(snapshot.IntegrationChangeEvents) {
					emittedAt := requiredTime(record.EmittedAt, now())
					createdAt := requiredTime(record.CreatedAt, emittedAt)
					rows = append(rows, map[string]any{
						"id":              strings.TrimSpace(record.ID),
						"tenant_id":       strings.TrimSpace(record.TenantID),
						"org_id":          strings.TrimSpace(record.OrgID),
						"agreement_id":    strings.TrimSpace(record.AgreementID),
						"provider":        strings.TrimSpace(record.Provider),
						"event_type":      strings.TrimSpace(record.EventType),
						"source_event_id": strings.TrimSpace(record.SourceEventID),
						"idempotency_key": strings.TrimSpace(record.IdempotencyKey),
						"payload_json":    strings.TrimSpace(record.PayloadJSON),
						"emitted_at":      emittedAt,
						"created_at":      createdAt,
					})
				}
				return rows
			},
		},
		{
			table:    "integration_mutation_claims",
			columns:  []string{"id", "tenant_id", "org_id", "idempotency_key", "first_seen_at", "created_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.IntegrationMutationClaims))
				keys := make([]string, 0, len(snapshot.IntegrationMutationClaims))
				for key := range snapshot.IntegrationMutationClaims {
					keys = append(keys, key)
				}
				sort.Strings(keys)
				for _, key := range keys {
					firstSeenAt := requiredTime(snapshot.IntegrationMutationClaims[key], now())
					tenantID, orgID, idempotencyKey, ok := parseIntegrationMutationClaimKey(key)
					if !ok {
						continue
					}
					rows = append(rows, map[string]any{
						"id":              strings.TrimSpace(key),
						"tenant_id":       tenantID,
						"org_id":          orgID,
						"idempotency_key": idempotencyKey,
						"first_seen_at":   firstSeenAt,
						"created_at":      firstSeenAt,
					})
				}
				return rows
			},
		},
		{
			table:    "placement_runs",
			columns:  []string{"id", "tenant_id", "org_id", "agreement_id", "status", "reason_code", "resolver_order_json", "executed_resolvers_json", "resolver_scores_json", "suggestions_json", "selected_suggestion_ids_json", "unresolved_definition_ids_json", "selected_source", "policy_json", "max_budget", "budget_used", "max_time_ms", "elapsed_ms", "manual_override_count", "created_by_user_id", "version", "created_at", "updated_at", "completed_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.PlacementRuns))
				for _, record := range sortedMapValues(snapshot.PlacementRuns) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					version := record.Version
					if version <= 0 {
						version = 1
					}
					rows = append(rows, map[string]any{
						"id":                             strings.TrimSpace(record.ID),
						"tenant_id":                      strings.TrimSpace(record.TenantID),
						"org_id":                         strings.TrimSpace(record.OrgID),
						"agreement_id":                   strings.TrimSpace(record.AgreementID),
						"status":                         strings.TrimSpace(record.Status),
						"reason_code":                    strings.TrimSpace(record.ReasonCode),
						"resolver_order_json":            marshalJSONWithDefault(record.ResolverOrder, "[]"),
						"executed_resolvers_json":        marshalJSONWithDefault(record.ExecutedResolvers, "[]"),
						"resolver_scores_json":           marshalJSONWithDefault(record.ResolverScores, "[]"),
						"suggestions_json":               marshalJSONWithDefault(record.Suggestions, "[]"),
						"selected_suggestion_ids_json":   marshalJSONWithDefault(record.SelectedSuggestionIDs, "[]"),
						"unresolved_definition_ids_json": marshalJSONWithDefault(record.UnresolvedDefinitionIDs, "[]"),
						"selected_source":                strings.TrimSpace(record.SelectedSource),
						"policy_json":                    strings.TrimSpace(record.PolicyJSON),
						"max_budget":                     record.MaxBudget,
						"budget_used":                    record.BudgetUsed,
						"max_time_ms":                    record.MaxTimeMS,
						"elapsed_ms":                     record.ElapsedMS,
						"manual_override_count":          record.ManualOverrideCount,
						"created_by_user_id":             strings.TrimSpace(record.CreatedByUserID),
						"version":                        version,
						"created_at":                     createdAt,
						"updated_at":                     updatedAt,
						"completed_at":                   optionalTime(record.CompletedAt),
					})
				}
				return rows
			},
		},
		{
			table:    "esign_drafts",
			columns:  []string{"id", "tenant_id", "org_id", "created_by", "wizard_id", "document_id", "title", "current_step", "wizard_state_json", "revision", "created_at", "updated_at", "expires_at"},
			conflict: []string{"id"},
			rows: func(snapshot legacySQLiteSnapshot) []map[string]any {
				rows := make([]map[string]any, 0, len(snapshot.Drafts))
				for _, record := range sortedMapValues(snapshot.Drafts) {
					createdAt := requiredTime(record.CreatedAt, now())
					updatedAt := requiredTime(record.UpdatedAt, createdAt)
					expiresAt := requiredTime(record.ExpiresAt, updatedAt.Add(7*24*time.Hour))
					revision := record.Revision
					if revision <= 0 {
						revision = 1
					}
					currentStep := record.CurrentStep
					if currentStep <= 0 {
						currentStep = 1
					}
					rows = append(rows, map[string]any{
						"id":                strings.TrimSpace(record.ID),
						"tenant_id":         strings.TrimSpace(record.TenantID),
						"org_id":            strings.TrimSpace(record.OrgID),
						"created_by":        strings.TrimSpace(record.CreatedByUserID),
						"wizard_id":         strings.TrimSpace(record.WizardID),
						"document_id":       nullableString(record.DocumentID),
						"title":             strings.TrimSpace(record.Title),
						"current_step":      currentStep,
						"wizard_state_json": strings.TrimSpace(record.WizardStateJSON),
						"revision":          revision,
						"created_at":        createdAt,
						"updated_at":        updatedAt,
						"expires_at":        expiresAt,
					})
				}
				return rows
			},
		},
	}
}

func requiredTime(value time.Time, fallback time.Time) time.Time {
	if value.IsZero() {
		if fallback.IsZero() {
			return time.Now().UTC()
		}
		return fallback.UTC()
	}
	return value.UTC()
}

func optionalTime(value *time.Time) any {
	if value == nil || value.IsZero() {
		return nil
	}
	return value.UTC()
}

func optionalBool(value *bool) any {
	if value == nil {
		return nil
	}
	return *value
}

func nullableString(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

func parseIntegrationMutationClaimKey(key string) (tenantID, orgID, idempotencyKey string, ok bool) {
	key = strings.TrimSpace(key)
	if key == "" {
		return "", "", "", false
	}
	parts := strings.SplitN(key, "|", 3)
	if len(parts) != 3 {
		return "", "", "", false
	}
	tenantID = strings.TrimSpace(parts[0])
	orgID = strings.TrimSpace(parts[1])
	idempotencyKey = strings.TrimSpace(parts[2])
	if tenantID == "" || orgID == "" || idempotencyKey == "" {
		return "", "", "", false
	}
	return tenantID, orgID, idempotencyKey, true
}

func marshalJSONWithDefault(value any, fallback string) string {
	raw, err := json.Marshal(value)
	if err != nil {
		return fallback
	}
	encoded := strings.TrimSpace(string(raw))
	if encoded == "" {
		return fallback
	}
	return encoded
}

func sortedMapValues[T any](records map[string]T) []T {
	if len(records) == 0 {
		return nil
	}
	keys := make([]string, 0, len(records))
	for key := range records {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make([]T, 0, len(keys))
	for _, key := range keys {
		out = append(out, records[key])
	}
	return out
}
