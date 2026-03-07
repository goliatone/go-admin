package persistence

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/uptrace/bun"
)

const phase8PostgresDSNEnv = "ESIGN_PHASE8_POSTGRES_DSN"

func TestPhase8RestartPersistenceSQLiteSurvivesBootstrapRestart(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Migrations.LocalOnly = true
	cfg.SQLite.DSN = "file:" + filepath.Join(t.TempDir(), "phase8-restart-sqlite.db") + "?_busy_timeout=5000&_foreign_keys=on"

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-phase8", OrgID: "org-phase8"}
	documentID := fmt.Sprintf("doc-phase8-restart-%d", time.Now().UTC().UnixNano())
	createdAt := time.Now().UTC().Round(time.Microsecond)

	first, err := Bootstrap(ctx, *cfg)
	if err != nil {
		t.Fatalf("Bootstrap first sqlite instance: %v", err)
	}
	if err := phase8InsertDocument(ctx, first.BunDB, scope, documentID, createdAt); err != nil {
		_ = first.Close()
		t.Fatalf("insert sqlite document before restart: %v", err)
	}
	if err := first.Close(); err != nil {
		t.Fatalf("close first sqlite instance: %v", err)
	}

	second, err := Bootstrap(ctx, *cfg)
	if err != nil {
		t.Fatalf("Bootstrap second sqlite instance: %v", err)
	}
	defer func() { _ = second.Close() }()

	count, err := second.BunDB.NewSelect().
		Model((*stores.DocumentRecord)(nil)).
		Where("id = ?", documentID).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Count(ctx)
	if err != nil {
		t.Fatalf("select sqlite document after restart: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one sqlite document after restart, got %d", count)
	}
}

func TestPhase8RestartPersistencePostgresSurvivesBootstrapRestart(t *testing.T) {
	postgresDSN := strings.TrimSpace(os.Getenv(phase8PostgresDSNEnv))
	if postgresDSN == "" {
		t.Skipf("%s is not set", phase8PostgresDSNEnv)
	}

	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectPostgres
	cfg.Migrations.LocalOnly = true
	cfg.Postgres.DSN = postgresDSN

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-phase8", OrgID: "org-phase8"}
	documentID := fmt.Sprintf("doc-phase8-restart-pg-%d", time.Now().UTC().UnixNano())
	createdAt := time.Now().UTC().Round(time.Microsecond)

	first, err := Bootstrap(ctx, *cfg)
	if err != nil {
		t.Fatalf("Bootstrap first postgres instance: %v", err)
	}
	if err := phase8InsertDocument(ctx, first.BunDB, scope, documentID, createdAt); err != nil {
		_ = first.Close()
		t.Fatalf("insert postgres document before restart: %v", err)
	}
	if err := first.Close(); err != nil {
		t.Fatalf("close first postgres instance: %v", err)
	}

	second, err := Bootstrap(ctx, *cfg)
	if err != nil {
		t.Fatalf("Bootstrap second postgres instance: %v", err)
	}
	defer func() {
		_, _ = second.BunDB.NewDelete().
			Model((*stores.DocumentRecord)(nil)).
			Where("id = ?", documentID).
			Where("tenant_id = ?", scope.TenantID).
			Where("org_id = ?", scope.OrgID).
			Exec(ctx)
		_ = second.Close()
	}()

	count, err := second.BunDB.NewSelect().
		Model((*stores.DocumentRecord)(nil)).
		Where("id = ?", documentID).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Count(ctx)
	if err != nil {
		t.Fatalf("select postgres document after restart: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one postgres document after restart, got %d", count)
	}
}

func phase8InsertDocument(ctx context.Context, db *bun.DB, scope stores.Scope, id string, createdAt time.Time) error {
	if db == nil {
		return fmt.Errorf("phase8 restart test: bun db is required")
	}
	_, err := db.NewRaw(
		`INSERT INTO documents (
			id, tenant_id, org_id, title, source_object_key, source_sha256, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		strings.TrimSpace(id),
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		"Phase8 Restart",
		fmt.Sprintf("tenant/%s/org/%s/docs/%s.pdf", scope.TenantID, scope.OrgID, id),
		strings.Repeat("a", 64),
		createdAt,
		createdAt,
	).Exec(ctx)
	if err != nil {
		return fmt.Errorf("phase8 restart test: insert document: %w", err)
	}
	return nil
}
