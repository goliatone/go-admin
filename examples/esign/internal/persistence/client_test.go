package persistence

import (
	"context"
	"path/filepath"
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
)

func TestOpenClientSQLiteRegistersSourcesAndMigrates(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.SQLite.DSN = "file:" + filepath.Join(t.TempDir(), "open-client.sqlite") + "?_busy_timeout=5000&_foreign_keys=on"
	cfg.Persistence.Postgres.DSN = ""
	cfg.Persistence.Migrations.LocalOnly = false

	handles, err := OpenClient(context.Background(), cfg)
	if err != nil {
		t.Fatalf("OpenClient: %v", err)
	}
	defer func() { _ = handles.Close() }()

	if handles.Client == nil || handles.BunDB == nil || handles.SQLDB == nil {
		t.Fatalf("expected all persistence handles to be initialized")
	}
	if handles.Dialect != DialectSQLite {
		t.Fatalf("expected sqlite dialect, got %s", handles.Dialect)
	}
	if err := handles.Client.ValidateDialects(context.Background()); err != nil {
		t.Fatalf("ValidateDialects: %v", err)
	}
	if err := handles.Client.Migrate(context.Background()); err != nil {
		t.Fatalf("Migrate: %v", err)
	}
}

func TestResolveRuntimeDialectAndDSN(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.SQLite.DSN = "file:test.sqlite?_busy_timeout=5000&_foreign_keys=on"

	dialect, err := ResolveRuntimeDialect(cfg)
	if err != nil {
		t.Fatalf("ResolveRuntimeDialect: %v", err)
	}
	if dialect != DialectSQLite {
		t.Fatalf("expected sqlite dialect, got %s", dialect)
	}
	dsn, err := ResolveRuntimeDSN(cfg, dialect)
	if err != nil {
		t.Fatalf("ResolveRuntimeDSN: %v", err)
	}
	if dsn != cfg.Persistence.SQLite.DSN {
		t.Fatalf("expected sqlite dsn %q, got %q", cfg.Persistence.SQLite.DSN, dsn)
	}
}
