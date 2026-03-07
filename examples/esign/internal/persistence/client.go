package persistence

import (
	"context"
	"database/sql"
	"fmt"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/uptrace/bun"
)

// ClientHandles represents open persistence runtime handles without executing migrations.
type ClientHandles struct {
	SQLDB   *sql.DB
	BunDB   *bun.DB
	Client  *persistence.Client
	Dialect Dialect
	DSN     string
}

// Close releases all persistence resources.
func (h *ClientHandles) Close() error {
	if h == nil || h.Client == nil {
		return nil
	}
	return h.Client.Close()
}

// ResolveRuntimeDialect resolves the configured runtime dialect using bootstrap defaults.
func ResolveRuntimeDialect(cfg appcfg.Config) (Dialect, error) {
	return resolveDialect(resolveDialectInput(cfg))
}

// ResolveRuntimeDSN resolves the configured DSN for a given dialect.
func ResolveRuntimeDSN(cfg appcfg.Config, dialect Dialect) (string, error) {
	return resolveDSN(cfg, dialect)
}

// OpenClient opens persistence handles and registers ordered migration sources without running migrations.
func OpenClient(ctx context.Context, cfg appcfg.Config) (*ClientHandles, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	dialect, err := ResolveRuntimeDialect(cfg)
	if err != nil {
		return nil, err
	}
	dsn, err := ResolveRuntimeDSN(cfg, dialect)
	if err != nil {
		return nil, err
	}

	sqlDB, bunDialect, driverName, err := openDialectDB(ctx, dialect, dsn)
	if err != nil {
		return nil, err
	}

	client, err := persistence.New(
		bootstrapPersistenceConfig{driver: driverName, server: dsn},
		sqlDB,
		bunDialect,
	)
	if err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("persistence open client: create client: %w", err)
	}
	if err := registerOrderedSources(client, cfg); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("persistence open client: register migration sources: %w", err)
	}

	return &ClientHandles{
		SQLDB:   sqlDB,
		BunDB:   client.DB(),
		Client:  client,
		Dialect: dialect,
		DSN:     dsn,
	}, nil
}
