package quickstart

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

type testPersistenceConfig struct {
	driver string
	server string
}

func (c testPersistenceConfig) GetDebug() bool {
	return false
}

func (c testPersistenceConfig) GetDriver() string {
	return c.driver
}

func (c testPersistenceConfig) GetServer() string {
	return c.server
}

func (c testPersistenceConfig) GetPingTimeout() time.Duration {
	return time.Second
}

func (c testPersistenceConfig) GetOtelIdentifier() string {
	return ""
}

func TestRegisterUserMigrationsSQLite(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "users.db") + "?cache=shared&_fk=1"
	sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)
	defer func() {
		_ = sqlDB.Close()
	}()

	cfg := testPersistenceConfig{driver: sqliteshim.ShimName, server: dsn}
	client, err := persistence.New(cfg, sqlDB, sqlitedialect.New())
	if err != nil {
		t.Fatalf("persistence.New: %v", err)
	}

	if err := RegisterUserMigrations(client); err != nil {
		t.Fatalf("RegisterUserMigrations: %v", err)
	}
	if err := client.Migrate(context.Background()); err != nil {
		t.Fatalf("migrate: %v", err)
	}
}
