package stores

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

type esignTestPersistenceConfig struct {
	driver string
	server string
}

func (c esignTestPersistenceConfig) GetDebug() bool                { return false }
func (c esignTestPersistenceConfig) GetDriver() string             { return c.driver }
func (c esignTestPersistenceConfig) GetServer() string             { return c.server }
func (c esignTestPersistenceConfig) GetPingTimeout() time.Duration { return time.Second }
func (c esignTestPersistenceConfig) GetOtelIdentifier() string     { return "" }

func newSQLiteMigrationClient(t *testing.T) (*persistence.Client, func()) {
	t.Helper()

	dsn := "file:" + filepath.Join(t.TempDir(), "esign_phase1.db") + "?cache=shared&_fk=1"
	return newSQLiteMigrationClientWithDSN(t, dsn)
}

func newSQLiteMigrationClientWithDSN(t *testing.T, dsn string) (*persistence.Client, func()) {
	t.Helper()

	sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)

	client, err := persistence.New(esignTestPersistenceConfig{
		driver: sqliteshim.ShimName,
		server: dsn,
	}, sqlDB, sqlitedialect.New())
	if err != nil {
		t.Fatalf("persistence.New: %v", err)
	}

	if err := RegisterMigrations(client); err != nil {
		t.Fatalf("RegisterMigrations: %v", err)
	}
	if err := client.ValidateDialects(context.Background()); err != nil {
		t.Fatalf("ValidateDialects: %v", err)
	}

	cleanup := func() {
		_ = client.Close()
	}
	return client, cleanup
}

func tableExists(ctx context.Context, db *bun.DB, name string) (bool, error) {
	var count int
	err := db.NewRaw(`SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name = ?`, name).Scan(ctx, &count)
	return count > 0, err
}

func tableColumnNames(ctx context.Context, db *bun.DB, table string) ([]string, error) {
	rows, err := db.QueryContext(ctx, `PRAGMA table_info('`+table+`')`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cols := make([]string, 0)
	for rows.Next() {
		var cid int
		var name, colType string
		var notNull, pk int
		var def sql.NullString
		if scanErr := rows.Scan(&cid, &name, &colType, &notNull, &def, &pk); scanErr != nil {
			return nil, scanErr
		}
		cols = append(cols, strings.ToLower(name))
	}
	return cols, rows.Err()
}

func contains(values []string, target string) bool {
	target = strings.ToLower(strings.TrimSpace(target))
	for _, v := range values {
		if strings.ToLower(strings.TrimSpace(v)) == target {
			return true
		}
	}
	return false
}

func countRows(ctx context.Context, db *bun.DB, table string) (int, error) {
	var count int
	err := db.NewRaw("SELECT COUNT(1) FROM "+table).Scan(ctx, &count)
	return count, err
}

func execSQLFile(t *testing.T, db *bun.DB, path string) {
	t.Helper()
	payload, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read sql file %s: %v", path, err)
	}
	if _, err := db.ExecContext(context.Background(), string(payload)); err != nil {
		t.Fatalf("exec sql file %s: %v", path, err)
	}
}

func TestMigrationsApplySeedAndRollbackSQLite(t *testing.T) {
	client, cleanup := newSQLiteMigrationClient(t)
	defer cleanup()

	ctx := context.Background()
	if err := client.Migrate(ctx); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	requiredTables := []string{
		"documents",
		"agreements",
		"recipients",
		"participants",
		"signing_tokens",
		"fields",
		"field_definitions",
		"field_instances",
		"field_values",
		"signature_artifacts",
		"audit_events",
		"email_logs",
		"integration_credentials",
	}
	for _, table := range requiredTables {
		exists, err := tableExists(ctx, client.DB(), table)
		if err != nil {
			t.Fatalf("tableExists(%s): %v", table, err)
		}
		if !exists {
			t.Fatalf("expected table %s to exist", table)
		}
	}

	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	if _, err := SeedCoreFixtures(ctx, client.DB(), scope); err != nil {
		t.Fatalf("SeedCoreFixtures: %v", err)
	}
	for _, table := range requiredTables {
		count, err := countRows(ctx, client.DB(), table)
		if err != nil {
			t.Fatalf("countRows(%s): %v", table, err)
		}
		if count < 1 {
			t.Fatalf("expected seeded records in %s", table)
		}
	}

	if err := client.RollbackAll(ctx); err != nil {
		t.Fatalf("RollbackAll: %v", err)
	}

	exists, err := tableExists(ctx, client.DB(), "documents")
	if err != nil {
		t.Fatalf("tableExists(documents): %v", err)
	}
	if exists {
		t.Fatalf("expected documents table to be removed after rollback")
	}
}

func TestMigrationsExposeVersionAndRecipientLifecycleColumns(t *testing.T) {
	client, cleanup := newSQLiteMigrationClient(t)
	defer cleanup()

	ctx := context.Background()
	if err := client.Migrate(ctx); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	agreementCols, err := tableColumnNames(ctx, client.DB(), "agreements")
	if err != nil {
		t.Fatalf("tableColumnNames(agreements): %v", err)
	}
	if !contains(agreementCols, "version") {
		t.Fatalf("expected agreements.version column")
	}

	recipientCols, err := tableColumnNames(ctx, client.DB(), "recipients")
	if err != nil {
		t.Fatalf("tableColumnNames(recipients): %v", err)
	}
	for _, col := range []string{"version", "first_view_at", "last_view_at", "decline_reason", "signing_order", "role"} {
		if !contains(recipientCols, col) {
			t.Fatalf("expected recipients.%s column", col)
		}
	}

	participantCols, err := tableColumnNames(ctx, client.DB(), "participants")
	if err != nil {
		t.Fatalf("tableColumnNames(participants): %v", err)
	}
	for _, col := range []string{"version", "first_view_at", "last_view_at", "decline_reason", "signing_stage", "role"} {
		if !contains(participantCols, col) {
			t.Fatalf("expected participants.%s column", col)
		}
	}

	fieldDefinitionCols, err := tableColumnNames(ctx, client.DB(), "field_definitions")
	if err != nil {
		t.Fatalf("tableColumnNames(field_definitions): %v", err)
	}
	for _, col := range []string{"participant_id", "field_type", "required", "validation_json"} {
		if !contains(fieldDefinitionCols, col) {
			t.Fatalf("expected field_definitions.%s column", col)
		}
	}

	fieldInstanceCols, err := tableColumnNames(ctx, client.DB(), "field_instances")
	if err != nil {
		t.Fatalf("tableColumnNames(field_instances): %v", err)
	}
	for _, col := range []string{"field_definition_id", "page_number", "x", "y", "width", "height", "tab_index", "label", "appearance_json"} {
		if !contains(fieldInstanceCols, col) {
			t.Fatalf("expected field_instances.%s column", col)
		}
	}
}

func TestMigrationsBackupAndRestoreSQLite(t *testing.T) {
	tempDir := t.TempDir()
	sourceDSN := "file:" + filepath.Join(tempDir, "esign_source.db") + "?cache=shared&_fk=1"
	client, cleanup := newSQLiteMigrationClientWithDSN(t, sourceDSN)
	defer cleanup()

	ctx := context.Background()
	if err := client.Migrate(ctx); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	if _, err := SeedCoreFixtures(ctx, client.DB(), scope); err != nil {
		t.Fatalf("SeedCoreFixtures: %v", err)
	}

	backupPath := filepath.Join(tempDir, "esign_backup.db")
	backupStmt := "VACUUM INTO '" + strings.ReplaceAll(backupPath, "'", "''") + "'"
	if _, err := client.DB().ExecContext(ctx, backupStmt); err != nil {
		t.Fatalf("VACUUM INTO backup: %v", err)
	}
	if _, err := os.Stat(backupPath); err != nil {
		t.Fatalf("backup file missing: %v", err)
	}

	restoreDSN := "file:" + backupPath + "?cache=shared&_fk=1"
	restoreSQLDB, err := sql.Open(sqliteshim.ShimName, restoreDSN)
	if err != nil {
		t.Fatalf("open restore sqlite: %v", err)
	}
	defer restoreSQLDB.Close()

	restoreDB := bun.NewDB(restoreSQLDB, sqlitedialect.New())
	defer restoreDB.Close()

	exists, err := tableExists(ctx, restoreDB, "documents")
	if err != nil {
		t.Fatalf("restore tableExists(documents): %v", err)
	}
	if !exists {
		t.Fatalf("expected documents table in restored backup")
	}
	count, err := countRows(ctx, restoreDB, "documents")
	if err != nil {
		t.Fatalf("restore countRows(documents): %v", err)
	}
	if count < 1 {
		t.Fatalf("expected at least one document row in restored backup")
	}
}

func TestMigrationsExposeGoogleSourceMetadataAndCredentialTable(t *testing.T) {
	client, cleanup := newSQLiteMigrationClient(t)
	defer cleanup()

	ctx := context.Background()
	if err := client.Migrate(ctx); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	documentCols, err := tableColumnNames(ctx, client.DB(), "documents")
	if err != nil {
		t.Fatalf("tableColumnNames(documents): %v", err)
	}
	for _, col := range []string{"source_type", "source_google_file_id", "source_google_doc_url", "source_modified_time", "source_exported_at", "source_exported_by_user_id"} {
		if !contains(documentCols, col) {
			t.Fatalf("expected documents.%s column", col)
		}
	}

	agreementCols, err := tableColumnNames(ctx, client.DB(), "agreements")
	if err != nil {
		t.Fatalf("tableColumnNames(agreements): %v", err)
	}
	for _, col := range []string{"source_type", "source_google_file_id", "source_google_doc_url", "source_modified_time", "source_exported_at", "source_exported_by_user_id"} {
		if !contains(agreementCols, col) {
			t.Fatalf("expected agreements.%s column", col)
		}
	}

	integrationCols, err := tableColumnNames(ctx, client.DB(), "integration_credentials")
	if err != nil {
		t.Fatalf("tableColumnNames(integration_credentials): %v", err)
	}
	for _, col := range []string{"provider", "user_id", "encrypted_access_token", "encrypted_refresh_token", "scopes_json", "expires_at"} {
		if !contains(integrationCols, col) {
			t.Fatalf("expected integration_credentials.%s column", col)
		}
	}
}

func TestMigrationsExposeIntegrationFoundationTablesAndColumns(t *testing.T) {
	client, cleanup := newSQLiteMigrationClient(t)
	defer cleanup()

	ctx := context.Background()
	if err := client.Migrate(ctx); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	requiredTables := []string{
		"integration_mapping_specs",
		"integration_bindings",
		"integration_sync_runs",
		"integration_checkpoints",
		"integration_conflicts",
		"integration_change_events",
		"integration_mutation_claims",
	}
	for _, table := range requiredTables {
		exists, err := tableExists(ctx, client.DB(), table)
		if err != nil {
			t.Fatalf("tableExists(%s): %v", table, err)
		}
		if !exists {
			t.Fatalf("expected table %s to exist", table)
		}
	}

	mappingCols, err := tableColumnNames(ctx, client.DB(), "integration_mapping_specs")
	if err != nil {
		t.Fatalf("tableColumnNames(integration_mapping_specs): %v", err)
	}
	for _, col := range []string{"provider", "name", "version", "status", "external_schema_json", "rules_json", "compiled_json", "compiled_hash"} {
		if !contains(mappingCols, col) {
			t.Fatalf("expected integration_mapping_specs.%s column", col)
		}
	}

	bindingCols, err := tableColumnNames(ctx, client.DB(), "integration_bindings")
	if err != nil {
		t.Fatalf("tableColumnNames(integration_bindings): %v", err)
	}
	for _, col := range []string{"provider", "entity_kind", "external_id", "internal_id", "provenance_json", "version"} {
		if !contains(bindingCols, col) {
			t.Fatalf("expected integration_bindings.%s column", col)
		}
	}

	syncRunCols, err := tableColumnNames(ctx, client.DB(), "integration_sync_runs")
	if err != nil {
		t.Fatalf("tableColumnNames(integration_sync_runs): %v", err)
	}
	for _, col := range []string{"provider", "direction", "mapping_spec_id", "status", "cursor", "last_error", "attempt_count", "version"} {
		if !contains(syncRunCols, col) {
			t.Fatalf("expected integration_sync_runs.%s column", col)
		}
	}

	conflictCols, err := tableColumnNames(ctx, client.DB(), "integration_conflicts")
	if err != nil {
		t.Fatalf("tableColumnNames(integration_conflicts): %v", err)
	}
	for _, col := range []string{"run_id", "binding_id", "status", "reason", "resolution_json", "resolved_by_user_id"} {
		if !contains(conflictCols, col) {
			t.Fatalf("expected integration_conflicts.%s column", col)
		}
	}
}

func TestMigrationsExposeDraftTablesAndColumns(t *testing.T) {
	client, cleanup := newSQLiteMigrationClient(t)
	defer cleanup()

	ctx := context.Background()
	if err := client.Migrate(ctx); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	exists, err := tableExists(ctx, client.DB(), "esign_drafts")
	if err != nil {
		t.Fatalf("tableExists(esign_drafts): %v", err)
	}
	if !exists {
		t.Fatalf("expected table esign_drafts to exist")
	}

	cols, err := tableColumnNames(ctx, client.DB(), "esign_drafts")
	if err != nil {
		t.Fatalf("tableColumnNames(esign_drafts): %v", err)
	}
	for _, col := range []string{
		"id",
		"tenant_id",
		"org_id",
		"created_by",
		"wizard_id",
		"document_id",
		"title",
		"current_step",
		"wizard_state_json",
		"revision",
		"created_at",
		"updated_at",
		"expires_at",
	} {
		if !contains(cols, col) {
			t.Fatalf("expected esign_drafts.%s column", col)
		}
	}
}

func TestMigrationsEnforceRecipientLifecycleConstraints(t *testing.T) {
	client, cleanup := newSQLiteMigrationClient(t)
	defer cleanup()

	ctx := context.Background()
	if err := client.Migrate(ctx); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	fx, err := SeedCoreFixtures(ctx, client.DB(), scope)
	if err != nil {
		t.Fatalf("SeedCoreFixtures: %v", err)
	}

	if _, err := client.DB().ExecContext(ctx, `
INSERT INTO recipients (id, tenant_id, org_id, agreement_id, email, name, role, signing_order, decline_reason)
VALUES ('rec-invalid-role', ?, ?, ?, 'invalid-role@example.com', 'Invalid', 'approver', 2, '')
`, scope.TenantID, scope.OrgID, fx.AgreementID); err == nil {
		t.Fatalf("expected role constraint violation")
	}

	if _, err := client.DB().ExecContext(ctx, `
INSERT INTO recipients (id, tenant_id, org_id, agreement_id, email, name, role, signing_order, decline_reason)
VALUES ('rec-invalid-order', ?, ?, ?, 'invalid-order@example.com', 'Invalid', 'signer', 0, '')
`, scope.TenantID, scope.OrgID, fx.AgreementID); err == nil {
		t.Fatalf("expected signing_order constraint violation")
	}
}

func TestMigrationsEnforceAuditEventsAppendOnlyGuardrails(t *testing.T) {
	client, cleanup := newSQLiteMigrationClient(t)
	defer cleanup()

	ctx := context.Background()
	if err := client.Migrate(ctx); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	fx, err := SeedCoreFixtures(ctx, client.DB(), scope)
	if err != nil {
		t.Fatalf("SeedCoreFixtures: %v", err)
	}

	if _, err := client.DB().ExecContext(ctx, `UPDATE audit_events SET actor_id = 'changed' WHERE id = ?`, fx.AuditEventID); err == nil {
		t.Fatalf("expected update on audit_events to be blocked")
	}
	if _, err := client.DB().ExecContext(ctx, `DELETE FROM audit_events WHERE id = ?`, fx.AuditEventID); err == nil {
		t.Fatalf("expected delete on audit_events to be blocked")
	}
}

func TestV2MigrationBackfillPreservesAuditTerminalOutcomesAndArtifactPointers(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "esign_v2_backfill.db") + "?cache=shared&_fk=1"
	sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer sqlDB.Close()
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)
	db := bun.NewDB(sqlDB, sqlitedialect.New())
	defer db.Close()

	execSQLFile(t, db, "data/sql/migrations/0001_esign_core.up.sql")
	execSQLFile(t, db, "data/sql/migrations/0003_esign_google_integration.up.sql")

	ctx := context.Background()
	scope := Scope{TenantID: "tenant-v2", OrgID: "org-v2"}
	now := time.Date(2026, 2, 15, 12, 0, 0, 0, time.UTC)

	documentID := "doc-v2"
	agreementID := "agreement-v2"
	recipientID := "recipient-v2"
	fieldID := "field-v2"
	auditID := "audit-v2"
	artifactID := "artifact-v2"
	signatureSHA := strings.Repeat("a", 64)
	sourceSHA := strings.Repeat("b", 64)
	artifactObjectKey := "tenant/tenant-v2/org/org-v2/artifacts/sig-v2.png"

	if _, err := db.ExecContext(ctx, `
INSERT INTO documents (id, tenant_id, org_id, title, source_object_key, source_sha256, size_bytes, page_count, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, documentID, scope.TenantID, scope.OrgID, "Backfill Doc", "tenant/tenant-v2/org/org-v2/docs/source.pdf", sourceSHA, 2048, 1, now, now); err != nil {
		t.Fatalf("insert document: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO agreements (id, tenant_id, org_id, document_id, status, title, message, version, sent_at, completed_at, created_at, updated_at)
VALUES (?, ?, ?, ?, 'completed', ?, ?, 2, ?, ?, ?, ?)
`, agreementID, scope.TenantID, scope.OrgID, documentID, "Backfill Agreement", "Completed agreement", now.Add(-2*time.Hour), now.Add(-1*time.Hour), now, now); err != nil {
		t.Fatalf("insert agreement: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO recipients (id, tenant_id, org_id, agreement_id, email, name, role, signing_order, first_view_at, last_view_at, completed_at, decline_reason, version, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, 'signer', 1, ?, ?, ?, '', 3, ?, ?)
`, recipientID, scope.TenantID, scope.OrgID, agreementID, "signer@v2.example", "V2 Signer", now.Add(-90*time.Minute), now.Add(-80*time.Minute), now.Add(-70*time.Minute), now, now); err != nil {
		t.Fatalf("insert recipient: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO fields (id, tenant_id, org_id, agreement_id, recipient_id, field_type, page_number, pos_x, pos_y, width, height, required, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, 'signature', 1, 12, 22, 120, 42, 1, ?, ?)
`, fieldID, scope.TenantID, scope.OrgID, agreementID, recipientID, now, now); err != nil {
		t.Fatalf("insert field: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO signature_artifacts (id, tenant_id, org_id, agreement_id, recipient_id, artifact_type, object_key, sha256, created_at)
VALUES (?, ?, ?, ?, ?, 'drawn', ?, ?, ?)
`, artifactID, scope.TenantID, scope.OrgID, agreementID, recipientID, artifactObjectKey, signatureSHA, now); err != nil {
		t.Fatalf("insert artifact: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO audit_events (id, tenant_id, org_id, agreement_id, event_type, actor_type, actor_id, metadata_json, created_at)
VALUES (?, ?, ?, ?, 'agreement.completed', 'system', 'worker', '{"status":"completed"}', ?)
`, auditID, scope.TenantID, scope.OrgID, agreementID, now); err != nil {
		t.Fatalf("insert audit: %v", err)
	}

	execSQLFile(t, db, "data/sql/migrations/0004_esign_v2_contract_reset.up.sql")

	var status string
	if err := db.NewRaw(`SELECT status FROM agreements WHERE id = ?`, agreementID).Scan(ctx, &status); err != nil {
		t.Fatalf("select agreement status: %v", err)
	}
	if status != AgreementStatusCompleted {
		t.Fatalf("expected agreement status %q, got %q", AgreementStatusCompleted, status)
	}

	var auditMetadata string
	if err := db.NewRaw(`SELECT metadata_json FROM audit_events WHERE id = ?`, auditID).Scan(ctx, &auditMetadata); err != nil {
		t.Fatalf("select audit metadata: %v", err)
	}
	if strings.TrimSpace(auditMetadata) != `{"status":"completed"}` {
		t.Fatalf("expected preserved audit metadata, got %q", auditMetadata)
	}

	var gotObjectKey, gotSHA string
	if err := db.NewRaw(`SELECT object_key, sha256 FROM signature_artifacts WHERE id = ?`, artifactID).Scan(ctx, &gotObjectKey, &gotSHA); err != nil {
		t.Fatalf("select artifact: %v", err)
	}
	if gotObjectKey != artifactObjectKey || gotSHA != signatureSHA {
		t.Fatalf("expected artifact pointer/hash continuity, got key=%q sha=%q", gotObjectKey, gotSHA)
	}

	var participantCount int
	if err := db.NewRaw(`SELECT COUNT(1) FROM participants WHERE tenant_id = ? AND org_id = ? AND id = ?`, scope.TenantID, scope.OrgID, recipientID).Scan(ctx, &participantCount); err != nil {
		t.Fatalf("count participants: %v", err)
	}
	if participantCount != 1 {
		t.Fatalf("expected migrated participant row for recipient %q", recipientID)
	}

	var definitionParticipantID string
	if err := db.NewRaw(`SELECT participant_id FROM field_definitions WHERE tenant_id = ? AND org_id = ? AND id = ?`, scope.TenantID, scope.OrgID, fieldID).Scan(ctx, &definitionParticipantID); err != nil {
		t.Fatalf("select field definition: %v", err)
	}
	if definitionParticipantID != recipientID {
		t.Fatalf("expected field definition participant_id %q, got %q", recipientID, definitionParticipantID)
	}

	var instanceDefinitionID string
	if err := db.NewRaw(`SELECT field_definition_id FROM field_instances WHERE tenant_id = ? AND org_id = ? AND id = ?`, scope.TenantID, scope.OrgID, fieldID).Scan(ctx, &instanceDefinitionID); err != nil {
		t.Fatalf("select field instance: %v", err)
	}
	if instanceDefinitionID != fieldID {
		t.Fatalf("expected field instance definition %q, got %q", fieldID, instanceDefinitionID)
	}
}
