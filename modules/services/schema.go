package services

import (
	"context"
	"fmt"

	servicemigrations "github.com/goliatone/go-services/migrations"
	"github.com/uptrace/bun"
)

// RequiredServicesSQLTables returns the go-services core SQL tables expected after migrations.
func RequiredServicesSQLTables() []string {
	return servicemigrations.RequiredSQLTables()
}

// RequiredServicesOAuthStorageTables returns the OAuth/storage tables used by provider callbacks.
func RequiredServicesOAuthStorageTables() []string {
	return servicemigrations.RequiredOAuthStorageTables()
}

// VerifyServicesSQLSchema verifies the full go-services SQL schema and wraps
// missing-table failures with go-admin migration composition context.
func VerifyServicesSQLSchema(ctx context.Context, db *bun.DB) error {
	if err := servicemigrations.VerifySQLSchema(ctx, db); err != nil {
		return fmt.Errorf("modules/services: go-services SQL schema is incomplete; run source-stable go-services migrations and legacy marker backfill before starting services-backed flows: %w", err)
	}
	return nil
}

// VerifyServicesOAuthStorageSchema verifies the tables required by OAuth-backed
// provider callbacks and wraps failures with go-admin migration composition context.
func VerifyServicesOAuthStorageSchema(ctx context.Context, db *bun.DB) error {
	if err := servicemigrations.VerifyOAuthStorageSchema(ctx, db); err != nil {
		return fmt.Errorf("modules/services: go-services OAuth storage schema is incomplete; run source-stable go-services migrations and legacy marker backfill before provider callbacks: %w", err)
	}
	return nil
}
