package persistence

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

type testPersistenceConfig struct {
	driver string
	server string
}

func (c testPersistenceConfig) GetDebug() bool                { return false }
func (c testPersistenceConfig) GetDriver() string             { return c.driver }
func (c testPersistenceConfig) GetServer() string             { return c.server }
func (c testPersistenceConfig) GetPingTimeout() time.Duration { return time.Second }
func (c testPersistenceConfig) GetOtelIdentifier() string     { return "" }

func newSQLiteMigrationClient(t *testing.T) (*persistence.Client, func()) {
	t.Helper()
	dsn := "file:" + filepath.Join(t.TempDir(), "phase2-bootstrap.db") + "?_fk=1&_busy_timeout=5000"
	sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)

	client, err := persistence.New(testPersistenceConfig{driver: sqliteshim.ShimName, server: dsn}, sqlDB, sqlitedialect.New())
	if err != nil {
		_ = sqlDB.Close()
		t.Fatalf("persistence.New: %v", err)
	}
	return client, func() { _ = client.Close() }
}

func TestRegisterOrderedSourcesDefaultOrder(t *testing.T) {
	client, cleanup := newSQLiteMigrationClient(t)
	defer cleanup()

	cfg := appcfg.Defaults()
	cfg.Services.ModuleEnabled = true
	cfg.Persistence.Migrations.LocalOnly = false

	labels := make([]string, 0)
	err := registerOrderedSources(client, cfg, withMigrationObserver(func(reg migrationRegistration) {
		labels = append(labels, reg.Label)
	}))
	if err != nil {
		t.Fatalf("registerOrderedSources: %v", err)
	}

	expected := []string{
		migrationSourceLabelAuth,
		migrationSourceLabelUsers,
		migrationSourceLabelServices,
		migrationSourceLabelAppLocal,
	}
	if len(labels) != len(expected) {
		t.Fatalf("expected %d labels, got %d (%v)", len(expected), len(labels), labels)
	}
	for i := range expected {
		if labels[i] != expected[i] {
			t.Fatalf("expected registration order %v, got %v", expected, labels)
		}
	}
}

func TestRegisterOrderedSourcesLocalOnly(t *testing.T) {
	client, cleanup := newSQLiteMigrationClient(t)
	defer cleanup()

	cfg := appcfg.Defaults()
	cfg.Persistence.Migrations.LocalOnly = true

	labels := make([]string, 0)
	err := registerOrderedSources(client, cfg, withMigrationObserver(func(reg migrationRegistration) {
		labels = append(labels, reg.Label)
	}))
	if err != nil {
		t.Fatalf("registerOrderedSources local_only: %v", err)
	}
	if len(labels) != 1 || labels[0] != migrationSourceLabelAppLocal {
		t.Fatalf("expected only %q registration, got %v", migrationSourceLabelAppLocal, labels)
	}
}

func TestBootstrapSQLiteRunsMigrationsAndReadiness(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	cfg.Persistence.SQLite.DSN = "file:" + filepath.Join(t.TempDir(), "bootstrap-phase2.db") + "?_fk=1&_busy_timeout=5000"

	result, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}
	defer func() { _ = result.Close() }()

	if result.Dialect != DialectSQLite {
		t.Fatalf("expected sqlite dialect, got %q", result.Dialect)
	}
	if result.Client == nil || result.BunDB == nil || result.SQLDB == nil {
		t.Fatalf("expected initialized client/db handles, got %+v", result)
	}
	if err := CheckReadiness(context.Background(), result.Client); err != nil {
		t.Fatalf("CheckReadiness: %v", err)
	}
}

func TestBootstrapSQLiteCreatesLineageLinkageColumns(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	cfg.Persistence.SQLite.DSN = "file:" + filepath.Join(t.TempDir(), "bootstrap-lineage-columns.db") + "?_fk=1&_busy_timeout=5000"

	result, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}
	defer func() { _ = result.Close() }()

	requiredColumns := []struct {
		table  string
		column string
	}{
		{table: "documents", column: "source_document_id"},
		{table: "documents", column: "source_revision_id"},
		{table: "documents", column: "source_artifact_id"},
		{table: "agreements", column: "source_revision_id"},
	}
	for _, spec := range requiredColumns {
		exists, err := sqliteColumnExists(context.Background(), result.SQLDB, spec.table, spec.column)
		if err != nil {
			t.Fatalf("sqliteColumnExists %s.%s: %v", spec.table, spec.column, err)
		}
		if !exists {
			t.Fatalf("expected %s.%s to exist after bootstrap", spec.table, spec.column)
		}
	}
}

func TestRegisterOrderedSourcesGoUsersSQLiteProcessingOverlayRepairsMissingTokenColumns(t *testing.T) {
	client, cleanup := newSQLiteMigrationClient(t)
	defer cleanup()

	cfg := appcfg.Defaults()
	cfg.Services.ModuleEnabled = false
	cfg.Persistence.Migrations.LocalOnly = false

	if err := registerOrderedSources(client, cfg); err != nil {
		t.Fatalf("registerOrderedSources: %v", err)
	}
	if err := client.MigrateSources(context.Background(), migrationSourceLabelAuth); err != nil {
		t.Fatalf("migrate auth source: %v", err)
	}

	if _, err := client.DB().ExecContext(
		context.Background(),
		`INSERT INTO bun_migrations (name, group_id, migrated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
		"ord_000002_000006",
		1,
	); err != nil {
		t.Fatalf("seed bun_migrations for go-users 00008: %v", err)
	}

	if err := client.MigrateSources(context.Background(), migrationSourceLabelUsers); err != nil {
		t.Fatalf("migrate go-users source after skipping 00008: %v", err)
	}

	requiredColumns := []string{
		"jti",
		"issued_at",
		"expires_at",
		"used_at",
		"scope_tenant_id",
		"scope_org_id",
	}
	for _, column := range requiredColumns {
		exists, err := sqliteColumnExists(context.Background(), client.DB().DB, "password_reset", column)
		if err != nil {
			t.Fatalf("sqliteColumnExists password_reset.%s: %v", column, err)
		}
		if !exists {
			t.Fatalf("expected password_reset.%s to exist after go-users overlay repair", column)
		}
	}

	var userTokensCount int
	if err := client.DB().NewRaw(
		`SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name = ?`,
		"user_tokens",
	).Scan(context.Background(), &userTokensCount); err != nil {
		t.Fatalf("check user_tokens table: %v", err)
	}
	if userTokensCount != 1 {
		t.Fatalf("expected user_tokens table to exist after go-users overlay repair")
	}
}

func TestResolveDialectInputDefaultsByProfile(t *testing.T) {
	devCfg := appcfg.Defaults()
	devCfg.Runtime.Profile = "development"
	devCfg.Runtime.RepositoryDialect = ""
	if got := resolveDialectInput(devCfg); got != appcfg.RepositoryDialectSQLite {
		t.Fatalf("expected sqlite default dialect for development profile, got %q", got)
	}

	prodCfg := appcfg.Defaults()
	prodCfg.Runtime.Profile = "production"
	prodCfg.Runtime.RepositoryDialect = ""
	if got := resolveDialectInput(prodCfg); got != appcfg.RepositoryDialectPostgres {
		t.Fatalf("expected postgres default dialect for production profile, got %q", got)
	}
}

func TestResolveDSNRequiresDialectSpecificDSNFields(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Persistence.SQLite.DSN = ""
	cfg.Persistence.Postgres.DSN = ""

	if _, err := resolveDSN(cfg, DialectSQLite); err == nil {
		t.Fatalf("expected sqlite resolveDSN to fail when persistence.sqlite.dsn is empty")
	}

	if _, err := resolveDSN(cfg, DialectPostgres); err == nil {
		t.Fatalf("expected postgres resolveDSN to fail when persistence.postgres.dsn is empty")
	}
}
