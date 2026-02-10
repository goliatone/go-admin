package stores

import (
	"context"
	"database/sql"
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
		"signing_tokens",
		"fields",
		"field_values",
		"signature_artifacts",
		"audit_events",
		"email_logs",
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
