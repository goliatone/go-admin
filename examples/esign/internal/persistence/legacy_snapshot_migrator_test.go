package persistence

import (
	"context"
	"database/sql"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/uptrace/bun/driver/sqliteshim"
)

func TestBootstrapMigratesLegacySnapshotWhenTargetTablesEmpty(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "legacy-snapshot-bootstrap.db") + "?_fk=1&_busy_timeout=5000"
	seedLegacySQLiteSnapshot(t, dsn)

	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Migrations.LocalOnly = true
	cfg.SQLite.DSN = dsn

	result, err := Bootstrap(context.Background(), *cfg)
	if err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}
	defer func() { _ = result.Close() }()

	assertSQLiteTableCount(t, result.SQLDB, "documents", 1)
	assertSQLiteTableCount(t, result.SQLDB, "agreements", 1)
	assertSQLiteTableCount(t, result.SQLDB, "recipients", 1)
	assertSQLiteTableCount(t, result.SQLDB, "fields", 1)
	assertSQLiteTableCount(t, result.SQLDB, "audit_events", 1)
	assertSQLiteTableCount(t, result.SQLDB, "esign_drafts", 1)
	assertSQLiteTableCount(t, result.SQLDB, legacySnapshotMigrationMarkerTable, 1)
}

func TestLegacySnapshotMigrationPreservesNormalizedObjectKeyWhenColumnExists(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "legacy-snapshot-normalized-key.db") + "?_fk=1&_busy_timeout=5000"
	seedLegacySQLiteSnapshot(t, dsn)

	sqlDB, bunDialect, driverName, err := openDialectDB(context.Background(), DialectSQLite, dsn)
	if err != nil {
		t.Fatalf("openDialectDB: %v", err)
	}
	client, err := persistence.New(bootstrapPersistenceConfig{driver: driverName, server: dsn}, sqlDB, bunDialect)
	if err != nil {
		_ = sqlDB.Close()
		t.Fatalf("persistence.New: %v", err)
	}
	defer func() { _ = client.Close() }()

	cfg := appcfg.Defaults()
	cfg.Migrations.LocalOnly = true
	if err := registerOrderedSources(client, *cfg); err != nil {
		t.Fatalf("registerOrderedSources: %v", err)
	}
	if err := client.Migrate(context.Background()); err != nil {
		t.Fatalf("client.Migrate: %v", err)
	}
	if _, err := sqlDB.ExecContext(context.Background(), `ALTER TABLE documents ADD COLUMN normalized_object_key TEXT NOT NULL DEFAULT ''`); err != nil {
		if !strings.Contains(strings.ToLower(err.Error()), "duplicate column name") {
			t.Fatalf("ALTER TABLE documents add normalized_object_key: %v", err)
		}
	}
	if err := migrateLegacySnapshotWithOptions(context.Background(), sqlDB, DialectSQLite, legacySnapshotMigrationOptions{}); err != nil {
		t.Fatalf("migrateLegacySnapshotWithOptions: %v", err)
	}

	var normalizedObjectKey string
	if err := sqlDB.QueryRowContext(context.Background(),
		`SELECT normalized_object_key FROM documents WHERE id = ?`,
		"doc-legacy-1",
	).Scan(&normalizedObjectKey); err != nil {
		t.Fatalf("query normalized object key: %v", err)
	}
	if normalizedObjectKey != "tenant/tenant-legacy/org/org-legacy/docs/doc-legacy-1.normalized.pdf" {
		t.Fatalf("expected normalized object key to round-trip from legacy snapshot, got %q", normalizedObjectKey)
	}
}

func TestLegacySnapshotMigrationSecondRunIsNoOp(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "legacy-snapshot-idempotent.db") + "?_fk=1&_busy_timeout=5000"
	seedLegacySQLiteSnapshot(t, dsn)

	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Migrations.LocalOnly = true
	cfg.SQLite.DSN = dsn

	first, err := Bootstrap(context.Background(), *cfg)
	if err != nil {
		t.Fatalf("first Bootstrap: %v", err)
	}
	firstDocCount := mustSQLiteTableCount(t, first.SQLDB, "documents")
	firstMarkerCount := mustSQLiteTableCount(t, first.SQLDB, legacySnapshotMigrationMarkerTable)
	_ = first.Close()

	second, err := Bootstrap(context.Background(), *cfg)
	if err != nil {
		t.Fatalf("second Bootstrap: %v", err)
	}
	defer func() { _ = second.Close() }()

	secondDocCount := mustSQLiteTableCount(t, second.SQLDB, "documents")
	secondMarkerCount := mustSQLiteTableCount(t, second.SQLDB, legacySnapshotMigrationMarkerTable)

	if firstDocCount != secondDocCount {
		t.Fatalf("expected idempotent document count %d, got %d", firstDocCount, secondDocCount)
	}
	if firstMarkerCount != secondMarkerCount || secondMarkerCount != 1 {
		t.Fatalf("expected single stable migration marker row, got first=%d second=%d", firstMarkerCount, secondMarkerCount)
	}
}

func TestLegacySnapshotMigrationRetryAfterFailure(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "legacy-snapshot-retry.db") + "?_fk=1&_busy_timeout=5000"
	seedLegacySQLiteSnapshot(t, dsn)

	sqlDB, bunDialect, driverName, err := openDialectDB(context.Background(), DialectSQLite, dsn)
	if err != nil {
		t.Fatalf("openDialectDB: %v", err)
	}
	client, err := persistence.New(bootstrapPersistenceConfig{driver: driverName, server: dsn}, sqlDB, bunDialect)
	if err != nil {
		_ = sqlDB.Close()
		t.Fatalf("persistence.New: %v", err)
	}
	defer func() { _ = client.Close() }()

	cfg := appcfg.Defaults()
	cfg.Migrations.LocalOnly = true
	if err := registerOrderedSources(client, *cfg); err != nil {
		t.Fatalf("registerOrderedSources: %v", err)
	}
	if err := client.Migrate(context.Background()); err != nil {
		t.Fatalf("client.Migrate: %v", err)
	}

	err = migrateLegacySnapshotWithOptions(context.Background(), sqlDB, DialectSQLite, legacySnapshotMigrationOptions{
		failAfterTable: "agreements",
	})
	if err == nil || !strings.Contains(err.Error(), "test failpoint") {
		t.Fatalf("expected failpoint migration error, got %v", err)
	}

	assertSQLiteTableCount(t, sqlDB, "documents", 0)
	assertSQLiteTableCount(t, sqlDB, "agreements", 0)
	assertSQLiteTableCount(t, sqlDB, legacySnapshotMigrationMarkerTable, 0)

	if err := migrateLegacySnapshotWithOptions(context.Background(), sqlDB, DialectSQLite, legacySnapshotMigrationOptions{}); err != nil {
		t.Fatalf("retry migration: %v", err)
	}

	assertSQLiteTableCount(t, sqlDB, "documents", 1)
	assertSQLiteTableCount(t, sqlDB, "agreements", 1)
	assertSQLiteTableCount(t, sqlDB, legacySnapshotMigrationMarkerTable, 1)
}

func TestLegacySnapshotMigrationMigratesSignerProfilesWhenTableExists(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "legacy-snapshot-unsupported.db") + "?_fk=1&_busy_timeout=5000"
	seedLegacySQLiteSnapshot(t, dsn)

	rawSignerProfile := map[string]any{
		"id":                       "profile-legacy-1",
		"tenant_id":                "tenant-legacy",
		"org_id":                   "org-legacy",
		"subject":                  "legacy.signer@example.com",
		"key":                      "default",
		"full_name":                "Legacy Signer",
		"initials":                 "LS",
		"typed_signature":          "Legacy Signer",
		"drawn_signature_data_url": "",
		"drawn_initials_data_url":  "",
		"remember":                 true,
		"created_at":               time.Now().UTC(),
		"updated_at":               time.Now().UTC(),
		"expires_at":               time.Now().UTC().Add(24 * time.Hour),
	}
	payload := map[string]any{
		"documents": map[string]any{},
		"signer_profiles": map[string]any{
			"tenant-legacy|org-legacy|profile-legacy-1": rawSignerProfile,
		},
	}
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("json.Marshal payload: %v", err)
	}

	sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatalf("sql.Open: %v", err)
	}
	defer func() { _ = sqlDB.Close() }()
	if _, err := sqlDB.ExecContext(context.Background(),
		`INSERT INTO esign_store_state (id, snapshot_json, updated_at)
		 VALUES (1, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET snapshot_json = excluded.snapshot_json, updated_at = excluded.updated_at`,
		string(rawPayload),
		time.Now().UTC().Format(time.RFC3339Nano),
	); err != nil {
		t.Fatalf("seed unsupported snapshot section: %v", err)
	}

	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Migrations.LocalOnly = true
	cfg.SQLite.DSN = dsn

	_, err = Bootstrap(context.Background(), *cfg)
	if err != nil {
		t.Fatalf("expected bootstrap legacy migration success, got %v", err)
	}

	assertSQLiteTableCount(t, sqlDB, "signer_profiles", 1)
	assertSQLiteTableCount(t, sqlDB, legacySnapshotMigrationMarkerTable, 1)
}

func seedLegacySQLiteSnapshot(t *testing.T, dsn string) {
	t.Helper()
	store, err := stores.NewSQLiteStore(dsn)
	if err != nil {
		t.Fatalf("NewSQLiteStore: %v", err)
	}
	defer func() { _ = store.Close() }()

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-legacy", OrgID: "org-legacy"}

	document, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                  "doc-legacy-1",
		Title:               "Legacy Source",
		SourceObjectKey:     "tenant/tenant-legacy/org/org-legacy/docs/doc-legacy-1.pdf",
		NormalizedObjectKey: "tenant/tenant-legacy/org/org-legacy/docs/doc-legacy-1.normalized.pdf",
		SourceSHA256:        strings.Repeat("a", 64),
		SizeBytes:           1234,
		PageCount:           1,
	})
	if err != nil {
		t.Fatalf("Create document: %v", err)
	}

	agreement, err := store.CreateDraft(ctx, scope, stores.AgreementRecord{
		ID:         "agreement-legacy-1",
		DocumentID: document.ID,
		Title:      "Legacy Agreement",
	})
	if err != nil {
		t.Fatalf("CreateDraft agreement: %v", err)
	}

	email := "legacy.signer@example.com"
	role := stores.RecipientRoleSigner
	signingOrder := 1
	recipient, err := store.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		ID:           "recipient-legacy-1",
		Email:        &email,
		Role:         &role,
		SigningOrder: &signingOrder,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}

	fieldType := stores.FieldTypeSignature
	pageNumber := 1
	posX := 10.0
	posY := 20.0
	width := 100.0
	height := 24.0
	required := true
	if _, err := store.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		ID:          "field-legacy-1",
		RecipientID: &recipient.ID,
		Type:        &fieldType,
		PageNumber:  &pageNumber,
		PosX:        &posX,
		PosY:        &posY,
		Width:       &width,
		Height:      &height,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}

	if _, err := store.Append(ctx, scope, stores.AuditEventRecord{
		ID:          "audit-legacy-1",
		AgreementID: agreement.ID,
		EventType:   "agreement.created",
		ActorType:   "user",
		ActorID:     "legacy-user-1",
	}); err != nil {
		t.Fatalf("Append audit event: %v", err)
	}

	now := time.Now().UTC()
	if _, _, err := store.CreateDraftSession(ctx, scope, stores.DraftRecord{
		ID:              "draft-legacy-1",
		WizardID:        "wizard-legacy-1",
		TenantID:        scope.TenantID,
		OrgID:           scope.OrgID,
		CreatedByUserID: "legacy-user-1",
		DocumentID:      document.ID,
		Title:           "Legacy Draft Session",
		CurrentStep:     1,
		WizardStateJSON: "{}",
		Revision:        1,
		CreatedAt:       now,
		UpdatedAt:       now,
		ExpiresAt:       now.Add(24 * time.Hour),
	}); err != nil {
		t.Fatalf("CreateDraftSession: %v", err)
	}
}

func assertSQLiteTableCount(t *testing.T, db *sql.DB, table string, expected int) {
	t.Helper()
	got := mustSQLiteTableCount(t, db, table)
	if got != expected {
		t.Fatalf("expected %s count=%d, got %d", table, expected, got)
	}
}

func mustSQLiteTableCount(t *testing.T, db *sql.DB, table string) int {
	t.Helper()
	if db == nil {
		t.Fatalf("db is nil")
	}
	var count int
	if err := db.QueryRowContext(context.Background(), `SELECT COUNT(1) FROM `+table).Scan(&count); err != nil {
		t.Fatalf("count %s: %v", table, err)
	}
	return count
}
