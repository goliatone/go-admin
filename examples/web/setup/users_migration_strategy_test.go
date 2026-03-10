package setup

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"

	auth "github.com/goliatone/go-auth"
	"github.com/uptrace/bun/driver/sqliteshim"
)

func TestDetectUserMigrationStrategy_LegacyWhenGoAuthMarkersExist(t *testing.T) {
	t.Parallel()

	db := openStrategyTestDB(t)
	mustExec(t, db, `CREATE TABLE users (id TEXT PRIMARY KEY)`)
	mustExec(t, db, `CREATE TABLE bun_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`)

	versions, err := listMigrationVersions(auth.GetMigrationsFS(), "data/sql/migrations")
	if err != nil {
		t.Fatalf("list migration versions: %v", err)
	}
	if len(versions) == 0 {
		t.Fatal("expected go-auth migration versions")
	}

	mustExec(t, db, `INSERT INTO bun_migrations (name) VALUES (?)`, versions[0])

	strategy, err := detectUserMigrationStrategy(context.Background(), db)
	if err != nil {
		t.Fatalf("detect strategy: %v", err)
	}
	if strategy != userMigrationStrategyLegacy {
		t.Fatalf("expected legacy strategy, got %v", strategy)
	}
}

func TestDetectUserMigrationStrategy_OrderedWhenOnlyOrderedMarkersExist(t *testing.T) {
	t.Parallel()

	db := openStrategyTestDB(t)
	mustExec(t, db, `CREATE TABLE users (id TEXT PRIMARY KEY)`)
	mustExec(t, db, `CREATE TABLE bun_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`)
	mustExec(t, db, `INSERT INTO bun_migrations (name) VALUES ('ord_000001_000001')`)

	strategy, err := detectUserMigrationStrategy(context.Background(), db)
	if err != nil {
		t.Fatalf("detect strategy: %v", err)
	}
	if strategy != userMigrationStrategyOrdered {
		t.Fatalf("expected ordered strategy, got %v", strategy)
	}
}

func TestDetectUserMigrationStrategy_OrderedWhenUsersTableMissing(t *testing.T) {
	t.Parallel()

	db := openStrategyTestDB(t)
	mustExec(t, db, `CREATE TABLE bun_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`)

	versions, err := listMigrationVersions(auth.GetMigrationsFS(), "data/sql/migrations")
	if err != nil {
		t.Fatalf("list migration versions: %v", err)
	}
	if len(versions) == 0 {
		t.Fatal("expected go-auth migration versions")
	}
	mustExec(t, db, `INSERT INTO bun_migrations (name) VALUES (?)`, versions[0])

	strategy, err := detectUserMigrationStrategy(context.Background(), db)
	if err != nil {
		t.Fatalf("detect strategy: %v", err)
	}
	if strategy != userMigrationStrategyOrdered {
		t.Fatalf("expected ordered strategy when users table is absent, got %v", strategy)
	}
}

func openStrategyTestDB(t *testing.T) *sql.DB {
	t.Helper()

	dsn := "file:" + filepath.Join(t.TempDir(), "users_migration_strategy.db") + "?cache=shared&_fk=1"
	db, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	t.Cleanup(func() {
		_ = db.Close()
	})
	return db
}

func mustExec(t *testing.T, db *sql.DB, query string, args ...any) {
	t.Helper()
	if _, err := db.Exec(query, args...); err != nil {
		t.Fatalf("exec %q: %v", query, err)
	}
}
