package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	persistence "github.com/goliatone/go-persistence-bun"
	_ "github.com/lib/pq"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
	"github.com/uptrace/bun/schema"
)

// Dialect identifies the selected persistence backend.
type Dialect string

const (
	DialectSQLite   Dialect = "sqlite"
	DialectPostgres Dialect = "postgres"
)

type bootstrapPersistenceConfig struct {
	driver string
	server string
}

func (c bootstrapPersistenceConfig) GetDebug() bool                { return false }
func (c bootstrapPersistenceConfig) GetDriver() string             { return c.driver }
func (c bootstrapPersistenceConfig) GetServer() string             { return c.server }
func (c bootstrapPersistenceConfig) GetPingTimeout() time.Duration { return time.Second }
func (c bootstrapPersistenceConfig) GetOtelIdentifier() string     { return "" }

// BootstrapResult holds resolved persistence runtime handles.
type BootstrapResult struct {
	SQLDB   *sql.DB
	BunDB   *bun.DB
	Client  *persistence.Client
	Dialect Dialect
	DSN     string
}

// Close releases persistence resources.
func (r *BootstrapResult) Close() error {
	if r == nil || r.Client == nil {
		return nil
	}
	return r.Client.Close()
}

// Bootstrap initializes dialect-specific DB handles, registers ordered migrations,
// applies migrations, and verifies persistence readiness.
func Bootstrap(ctx context.Context, cfg appcfg.Config) (*BootstrapResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	dialect, err := resolveDialect(resolveDialectInput(cfg))
	if err != nil {
		return nil, err
	}
	dsn, err := resolveDSN(cfg, dialect)
	if err != nil {
		return nil, err
	}

	sqlDB, bunDialect, driverName, err := openDialectDB(ctx, dialect, dsn)
	if err != nil {
		return nil, err
	}

	client, err := persistence.New(bootstrapPersistenceConfig{driver: driverName, server: dsn}, sqlDB, bunDialect)
	if err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("persistence bootstrap: create client: %w", err)
	}

	if err := registerOrderedSources(client, cfg); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("persistence bootstrap: register migration sources: %w", err)
	}

	if err := client.Migrate(ctx); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("persistence bootstrap: migrate: %w", err)
	}
	if err := ensureRuntimeParityColumns(ctx, sqlDB, dialect); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("persistence bootstrap: runtime parity column repair: %w", err)
	}

	if err := CheckReadiness(ctx, client); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("persistence bootstrap: readiness check: %w", err)
	}

	return &BootstrapResult{
		SQLDB:   sqlDB,
		BunDB:   client.DB(),
		Client:  client,
		Dialect: dialect,
		DSN:     dsn,
	}, nil
}

func resolveDialect(raw string) (Dialect, error) {
	switch Dialect(strings.ToLower(strings.TrimSpace(raw))) {
	case DialectSQLite:
		return DialectSQLite, nil
	case DialectPostgres:
		return DialectPostgres, nil
	default:
		return "", fmt.Errorf("persistence bootstrap: unsupported runtime.repository_dialect %q", raw)
	}
}

func resolveDialectInput(cfg appcfg.Config) string {
	raw := strings.ToLower(strings.TrimSpace(cfg.Runtime.RepositoryDialect))
	if raw != "" {
		return raw
	}
	profile := strings.ToLower(strings.TrimSpace(cfg.Runtime.Profile))
	switch profile {
	case "production", "prod":
		return appcfg.RepositoryDialectPostgres
	default:
		return appcfg.RepositoryDialectSQLite
	}
}

func resolveDSN(cfg appcfg.Config, dialect Dialect) (string, error) {
	sqliteDSN := strings.TrimSpace(cfg.Persistence.SQLite.DSN)
	postgresDSN := strings.TrimSpace(cfg.Persistence.Postgres.DSN)

	switch dialect {
	case DialectSQLite:
		if sqliteDSN == "" {
			return "", fmt.Errorf("persistence bootstrap: persistence.sqlite.dsn is required when runtime.repository_dialect=%s", DialectSQLite)
		}
		return sqliteDSN, nil
	case DialectPostgres:
		if postgresDSN == "" {
			return "", fmt.Errorf("persistence bootstrap: persistence.postgres.dsn is required when runtime.repository_dialect=%s", DialectPostgres)
		}
		return postgresDSN, nil
	default:
		return "", fmt.Errorf("persistence bootstrap: unsupported dialect %q", dialect)
	}
}

func openDialectDB(ctx context.Context, dialect Dialect, dsn string) (*sql.DB, schema.Dialect, string, error) {
	dsn = strings.TrimSpace(dsn)
	if dsn == "" {
		return nil, nil, "", fmt.Errorf("persistence bootstrap: dsn is required")
	}

	switch dialect {
	case DialectSQLite:
		ensureSQLiteDSNDir(dsn)
		sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
		if err != nil {
			return nil, nil, "", fmt.Errorf("persistence bootstrap: open sqlite: %w", err)
		}
		sqlDB.SetMaxOpenConns(1)
		sqlDB.SetMaxIdleConns(1)
		if err := sqlDB.PingContext(ctx); err != nil {
			_ = sqlDB.Close()
			return nil, nil, "", fmt.Errorf("persistence bootstrap: ping sqlite: %w", err)
		}
		if err := ConfigureSQLiteConnection(ctx, sqlDB); err != nil {
			_ = sqlDB.Close()
			return nil, nil, "", fmt.Errorf("persistence bootstrap: configure sqlite: %w", err)
		}
		return sqlDB, sqlitedialect.New(), sqliteshim.ShimName, nil
	case DialectPostgres:
		sqlDB, err := sql.Open("postgres", dsn)
		if err != nil {
			return nil, nil, "", fmt.Errorf("persistence bootstrap: open postgres: %w", err)
		}
		if err := sqlDB.PingContext(ctx); err != nil {
			_ = sqlDB.Close()
			return nil, nil, "", fmt.Errorf("persistence bootstrap: ping postgres: %w", err)
		}
		return sqlDB, pgdialect.New(), "postgres", nil
	default:
		return nil, nil, "", fmt.Errorf("persistence bootstrap: unsupported dialect %q", dialect)
	}
}

func ensureSQLiteDSNDir(dsn string) {
	if !strings.HasPrefix(dsn, "file:") {
		return
	}
	raw := strings.TrimPrefix(dsn, "file:")
	if idx := strings.Index(raw, "?"); idx >= 0 {
		raw = raw[:idx]
	}
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == ":memory:" || strings.HasPrefix(raw, ":memory:") {
		return
	}
	dir := filepath.Dir(raw)
	if dir == "" || dir == "." {
		return
	}
	_ = os.MkdirAll(dir, 0o755)
}
