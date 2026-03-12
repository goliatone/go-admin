package persistence

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"testing"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
)

func TestPhase8RestartPersistenceSQLiteSurvivesRestart(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "phase8-restart.sqlite") + "?_busy_timeout=5000&_foreign_keys=on"
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.SQLite.DSN = dsn
	cfg.Postgres.DSN = ""

	const tableName = "phase8_restart_probe_sqlite"
	const marker = "phase8-sqlite"

	first, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("first Bootstrap: %v", err)
	}
	if _, err := first.BunDB.ExecContext(context.Background(), fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s (id INTEGER PRIMARY KEY, marker TEXT NOT NULL)`, tableName)); err != nil {
		_ = first.Close()
		t.Fatalf("create probe table: %v", err)
	}
	if _, err := first.BunDB.ExecContext(context.Background(), fmt.Sprintf(`INSERT OR REPLACE INTO %s (id, marker) VALUES (1, ?)`, tableName), marker); err != nil {
		_ = first.Close()
		t.Fatalf("insert probe row: %v", err)
	}
	if err := first.Close(); err != nil {
		t.Fatalf("close first bootstrap: %v", err)
	}

	second, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("second Bootstrap: %v", err)
	}
	defer func() { _ = second.Close() }()

	var persisted string
	if err := second.BunDB.NewRaw(fmt.Sprintf(`SELECT marker FROM %s WHERE id = 1`, tableName)).Scan(context.Background(), &persisted); err != nil {
		t.Fatalf("read probe row after restart: %v", err)
	}
	if strings.TrimSpace(persisted) != marker {
		t.Fatalf("expected probe marker %q after restart, got %q", marker, persisted)
	}
}

func TestPhase8RestartPersistencePostgresSurvivesRestartWhenDSNProvided(t *testing.T) {
	dsn := requirePostgresTestDSN(t)

	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectPostgres
	cfg.Postgres.DSN = dsn
	cfg.SQLite.DSN = ""

	tableName := fmt.Sprintf("phase8_restart_probe_postgres_%d", time.Now().UnixNano())
	marker := fmt.Sprintf("phase8-postgres-%d", time.Now().UnixNano())

	first, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("first Bootstrap (postgres): %v", err)
	}
	if _, err := first.BunDB.ExecContext(context.Background(), fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s (id BIGINT PRIMARY KEY, marker TEXT NOT NULL)`, tableName)); err != nil {
		_ = first.Close()
		t.Fatalf("create postgres probe table: %v", err)
	}
	if _, err := first.BunDB.ExecContext(context.Background(), fmt.Sprintf(`INSERT INTO %s (id, marker) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET marker = EXCLUDED.marker`, tableName), marker); err != nil {
		_ = first.Close()
		t.Fatalf("insert postgres probe row: %v", err)
	}
	if err := first.Close(); err != nil {
		t.Fatalf("close first postgres bootstrap: %v", err)
	}

	second, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("second Bootstrap (postgres): %v", err)
	}
	defer func() {
		_, _ = second.BunDB.ExecContext(context.Background(), fmt.Sprintf(`DROP TABLE IF EXISTS %s`, tableName))
		_ = second.Close()
	}()

	var persisted string
	if err := second.BunDB.NewRaw(fmt.Sprintf(`SELECT marker FROM %s WHERE id = 1`, tableName)).Scan(context.Background(), &persisted); err != nil {
		t.Fatalf("read postgres probe row after restart: %v", err)
	}
	if strings.TrimSpace(persisted) != marker {
		t.Fatalf("expected postgres probe marker %q after restart, got %q", marker, persisted)
	}
}
