package persistence

import (
	"context"
	"database/sql"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	auth "github.com/goliatone/go-auth"
	persistence "github.com/goliatone/go-persistence-bun"
	goservices "github.com/goliatone/go-services"
	users "github.com/goliatone/go-users"
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

func TestRegisterOrderedSourcesSourceStablePlanMetadata(t *testing.T) {
	testCases := []struct {
		name     string
		mutate   func(*appcfg.Config)
		expected []esignSourcePlanExpectation
	}{
		{
			name: "default",
			mutate: func(cfg *appcfg.Config) {
				cfg.Services.ModuleEnabled = true
				cfg.Persistence.Migrations.LocalOnly = false
			},
			expected: []esignSourcePlanExpectation{
				{sourceKey: "go_auth", order: 10},
				{sourceKey: "go_users", order: 20, dependsOn: []string{"go_auth"}},
				{sourceKey: "go_services", order: 30, dependsOn: []string{"go_users"}},
				{sourceKey: "app_local", order: 100, dependsOn: []string{"go_services"}},
			},
		},
		{
			name: "services-disabled",
			mutate: func(cfg *appcfg.Config) {
				cfg.Services.ModuleEnabled = false
				cfg.Persistence.Migrations.LocalOnly = false
			},
			expected: []esignSourcePlanExpectation{
				{sourceKey: "go_auth", order: 10},
				{sourceKey: "go_users", order: 20, dependsOn: []string{"go_auth"}},
				{sourceKey: "app_local", order: 100, dependsOn: []string{"go_users"}},
			},
		},
		{
			name: "local-only",
			mutate: func(cfg *appcfg.Config) {
				cfg.Persistence.Migrations.LocalOnly = true
			},
			expected: []esignSourcePlanExpectation{
				{sourceKey: "app_local", order: 100},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			client, cleanup := newSQLiteMigrationClient(t)
			defer cleanup()

			cfg := appcfg.Defaults()
			tc.mutate(&cfg)
			if err := registerOrderedSources(client, cfg); err != nil {
				t.Fatalf("registerOrderedSources: %v", err)
			}
			plan, err := client.Plan(context.Background())
			if err != nil {
				t.Fatalf("Plan: %v", err)
			}
			for _, expected := range tc.expected {
				assertEsignSourceStablePlanEntry(t, plan, expected.sourceKey, expected.order, expected.dependsOn)
			}
			if tc.name == "services-disabled" || tc.name == "local-only" {
				assertEsignSourceAbsent(t, plan, "go_services")
			}
		})
	}
}

func TestRegisterOrderedSourcesBackfillsLegacyPositionalMarkers(t *testing.T) {
	testCases := []struct {
		name           string
		mutate         func(*appcfg.Config)
		wantSourceKeys []string
	}{
		{
			name: "default",
			mutate: func(cfg *appcfg.Config) {
				cfg.Services.ModuleEnabled = true
				cfg.Persistence.Migrations.LocalOnly = false
			},
			wantSourceKeys: []string{"go_auth", "go_users", "go_services", "app_local"},
		},
		{
			name: "services-disabled",
			mutate: func(cfg *appcfg.Config) {
				cfg.Services.ModuleEnabled = false
				cfg.Persistence.Migrations.LocalOnly = false
			},
			wantSourceKeys: []string{"go_auth", "go_users", "app_local"},
		},
		{
			name: "local-only",
			mutate: func(cfg *appcfg.Config) {
				cfg.Persistence.Migrations.LocalOnly = true
			},
			wantSourceKeys: []string{"app_local"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			client, cleanup := newSQLiteMigrationClient(t)
			defer cleanup()

			cfg := appcfg.Defaults()
			tc.mutate(&cfg)
			legacySources := legacyEsignMigrationSources(t, cfg)

			legacy := persistence.NewMigrations()
			if err := legacy.RegisterOrderedMigrationSources(legacySources...); err != nil {
				t.Fatalf("register legacy eSign migrations: %v", err)
			}
			if err := legacy.Migrate(ctx, client.DB()); err != nil {
				t.Fatalf("migrate legacy positional eSign sources: %v", err)
			}
			legacyCount := countEsignMigrationRows(t, client, "ord_%")
			if legacyCount == 0 {
				t.Fatalf("expected legacy positional markers")
			}

			if err := registerOrderedSources(client, cfg); err != nil {
				t.Fatalf("register stable eSign migrations: %v", err)
			}
			if err := client.GetMigrations().BackfillStableOrderedMigrationMarkers(ctx, client.DB(), legacySources); err != nil {
				t.Fatalf("backfill stable eSign markers: %v", err)
			}
			stableCount := countEsignMigrationRows(t, client, "ordsrc_%")
			if stableCount == 0 {
				t.Fatalf("expected source-stable markers after backfill")
			}

			if err := client.GetMigrations().BackfillStableOrderedMigrationMarkers(ctx, client.DB(), legacySources); err != nil {
				t.Fatalf("backfill stable eSign markers second run: %v", err)
			}
			if secondCount := countEsignMigrationRows(t, client, "ordsrc_%"); secondCount != stableCount {
				t.Fatalf("stable marker count changed after idempotent backfill: got=%d want=%d", secondCount, stableCount)
			}

			plan, err := client.Plan(ctx)
			if err != nil {
				t.Fatalf("Plan stable eSign migrations: %v", err)
			}
			for _, sourceKey := range tc.wantSourceKeys {
				assertEsignAppliedSourceStablePlanEntry(t, plan, sourceKey)
			}
		})
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

type esignSourcePlanExpectation struct {
	sourceKey string
	order     int
	dependsOn []string
}

func assertEsignSourceStablePlanEntry(t *testing.T, plan *persistence.MigrationPlan, sourceKey string, order int, dependsOn []string) {
	t.Helper()
	for _, entry := range plan.Entries {
		if entry.SourceKey != sourceKey {
			continue
		}
		if entry.SourceOrder != order {
			t.Fatalf("%s source order mismatch: got=%d want=%d", sourceKey, entry.SourceOrder, order)
		}
		if !reflect.DeepEqual(entry.SourceDependsOn, dependsOn) {
			t.Fatalf("%s dependencies mismatch: got=%v want=%v", sourceKey, entry.SourceDependsOn, dependsOn)
		}
		if !strings.HasPrefix(entry.SyntheticName, "ordsrc_") {
			t.Fatalf("%s synthetic name %q is not source-stable", sourceKey, entry.SyntheticName)
		}
		return
	}
	t.Fatalf("expected source key %q in migration plan", sourceKey)
}

func assertEsignAppliedSourceStablePlanEntry(t *testing.T, plan *persistence.MigrationPlan, sourceKey string) {
	t.Helper()
	for _, entry := range plan.Entries {
		if entry.SourceKey != sourceKey {
			continue
		}
		if !entry.Applied {
			t.Fatalf("expected source key %q entry %q to be marked applied", sourceKey, entry.SyntheticName)
		}
		return
	}
	t.Fatalf("expected source key %q in migration plan", sourceKey)
}

func assertEsignSourceAbsent(t *testing.T, plan *persistence.MigrationPlan, sourceKey string) {
	t.Helper()
	for _, entry := range plan.Entries {
		if entry.SourceKey == sourceKey {
			t.Fatalf("expected source key %q to be absent", sourceKey)
		}
	}
}

func legacyEsignMigrationSources(t *testing.T, cfg appcfg.Config) []persistence.OrderedMigrationSource {
	t.Helper()

	sources := []persistence.OrderedMigrationSource{}
	if !cfg.Persistence.Migrations.LocalOnly {
		authRoot, err := resolveMigrationFS(auth.GetMigrationsFS(), "data/sql/migrations")
		if err != nil {
			t.Fatalf("resolve auth migrations: %v", err)
		}
		sources = append(sources, persistence.OrderedMigrationSource{Name: migrationSourceLabelAuth, Root: authRoot})

		usersRoot, err := resolveMigrationFS(users.GetCoreMigrationsFS(), "data/sql/migrations")
		if err != nil {
			t.Fatalf("resolve users migrations: %v", err)
		}
		usersRoot, err = applyUsersMigrationOverlay(usersRoot)
		if err != nil {
			t.Fatalf("overlay users migrations: %v", err)
		}
		sources = append(sources, persistence.OrderedMigrationSource{Name: migrationSourceLabelUsers, Root: usersRoot})

		if cfg.Services.ModuleEnabled {
			servicesRoot, err := resolveMigrationFS(goservices.GetCoreMigrationsFS(), "data/sql/migrations")
			if err != nil {
				t.Fatalf("resolve services migrations: %v", err)
			}
			sources = append(sources, persistence.OrderedMigrationSource{Name: migrationSourceLabelServices, Root: servicesRoot})
		}
	}

	appLocalRoot, err := resolveAppLocalMigrationFS(cfg)
	if err != nil {
		t.Fatalf("resolve app-local migrations: %v", err)
	}
	sources = append(sources, persistence.OrderedMigrationSource{Name: migrationSourceLabelAppLocal, Root: appLocalRoot})
	return sources
}

func countEsignMigrationRows(t *testing.T, client *persistence.Client, pattern string) int {
	t.Helper()
	var count int
	if err := client.DB().
		NewSelect().
		TableExpr("bun_migrations").
		ColumnExpr("COUNT(1)").
		Where("name LIKE ?", pattern).
		Scan(context.Background(), &count); err != nil {
		t.Fatalf("count migration rows %q: %v", pattern, err)
	}
	return count
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

	if err := client.MigrateSources(context.Background(), migrationSourceLabelAuth, migrationSourceLabelUsers); err != nil {
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
