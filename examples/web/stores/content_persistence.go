package stores

import (
	"context"
	"database/sql"
	"embed"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

//go:embed migrations/content/*.sql
var contentMigrations embed.FS

// contentConfig satisfies the go-persistence-bun Config interface.
type contentConfig struct {
	driver      string
	server      string
	pingTimeout time.Duration
}

func (c contentConfig) GetDebug() bool    { return false }
func (c contentConfig) GetDriver() string { return c.driver }
func (c contentConfig) GetServer() string { return c.server }
func (c contentConfig) GetPingTimeout() time.Duration {
	if c.pingTimeout <= 0 {
		return 5 * time.Second
	}
	return c.pingTimeout
}

func (c contentConfig) GetOtelIdentifier() string { return "" }

// ResolveContentDSN returns the SQLite DSN for content persistence. It checks
// CONTENT_DATABASE_DSN first, then CMS_DATABASE_DSN, and finally falls back
// to a shared temp-file path to keep parity with the CMS/users examples.
func ResolveContentDSN() string {
	if env := strings.TrimSpace(os.Getenv("CONTENT_DATABASE_DSN")); env != "" {
		return env
	}
	if env := strings.TrimSpace(os.Getenv("CMS_DATABASE_DSN")); env != "" {
		return env
	}
	return defaultContentDSN()
}

// SetupContentDatabase opens a SQLite connection, applies the content
// migrations, and returns a Bun DB handle.
func SetupContentDatabase(ctx context.Context, dsn string) (*bun.DB, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	resolvedDSN := strings.TrimSpace(dsn)
	if resolvedDSN == "" {
		resolvedDSN = ResolveContentDSN()
	}

	registerSQLiteDrivers("sqlite3", sqliteshim.ShimName)

	sqlDB, err := sql.Open("sqlite3", resolvedDSN)
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)

	client, err := persistence.New(contentConfig{
		driver:      "sqlite3",
		server:      resolvedDSN,
		pingTimeout: 5 * time.Second,
	}, sqlDB, sqlitedialect.New())
	if err != nil {
		return nil, err
	}

	migrationsFS, err := fs.Sub(contentMigrations, "migrations/content")
	if err != nil {
		return nil, err
	}
	client.RegisterDialectMigrations(
		migrationsFS,
		persistence.WithDialectSourceLabel("."),
		persistence.WithValidationTargets("sqlite"),
	)
	if err := client.Migrate(ctx); err != nil {
		return nil, err
	}

	return client.DB(), nil
}

func registerSQLiteDrivers(names ...string) {
	for _, name := range names {
		registered := false
		for _, drv := range sql.Drivers() {
			if drv == name {
				registered = true
				break
			}
		}
		if registered {
			continue
		}
		sql.Register(name, sqliteshim.Driver())
	}
}

func defaultContentDSN() string {
	path := filepath.Join(os.TempDir(), "go-admin-cms.db")
	return "file:" + path + "?cache=shared&_fk=1"
}
