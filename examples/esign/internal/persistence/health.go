package persistence

import (
	"context"
	"fmt"

	persistence "github.com/goliatone/go-persistence-bun"
)

// CheckConnectivity validates DB connectivity through the persistence client.
func CheckConnectivity(ctx context.Context, client *persistence.Client) error {
	if client == nil {
		return fmt.Errorf("persistence health: client is required")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := client.Ping(ctx); err != nil {
		return fmt.Errorf("persistence health: ping failed: %w", err)
	}
	return nil
}

// CheckMigrationReadiness verifies migration metadata table presence and dialect contract validation.
func CheckMigrationReadiness(ctx context.Context, client *persistence.Client) error {
	if client == nil {
		return fmt.Errorf("persistence health: client is required")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := client.ValidateDialects(ctx); err != nil {
		return fmt.Errorf("persistence health: dialect validation failed: %w", err)
	}
	var applied int
	if err := client.DB().NewRaw(`SELECT COUNT(1) FROM bun_migrations`).Scan(ctx, &applied); err != nil {
		return fmt.Errorf("persistence health: migration state query failed: %w", err)
	}
	return nil
}

// CheckReadiness runs connectivity and migration readiness checks.
func CheckReadiness(ctx context.Context, client *persistence.Client) error {
	if err := CheckConnectivity(ctx, client); err != nil {
		return err
	}
	if err := CheckMigrationReadiness(ctx, client); err != nil {
		return err
	}
	return nil
}
