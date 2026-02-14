package setup

import (
	"context"
	"database/sql"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/stores"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

// SetupPersistentWorkflowRuntime wires a Bun-backed workflow runtime on the same DSN
// used by persistent CMS mode and applies workflow runtime migrations.
func SetupPersistentWorkflowRuntime(ctx context.Context, dsn string) (coreadmin.WorkflowRuntime, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	resolvedDSN := resolveCMSDSN(dsn)

	registerSQLiteDrivers("sqlite3", "sqlite")

	sqlDB, err := sql.Open("sqlite3", resolvedDSN)
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)

	client, err := persistence.New(persistentConfig{
		driver:      "sqlite3",
		server:      resolvedDSN,
		pingTimeout: 5 * time.Second,
	}, sqlDB, sqlitedialect.New())
	if err != nil {
		_ = sqlDB.Close()
		return nil, err
	}

	client.RegisterSQLMigrations(stores.SanitizeSQLiteMigrations(coreadmin.GetWorkflowRuntimeMigrationsFS()))
	if err := client.Migrate(ctx); err != nil {
		_ = sqlDB.Close()
		return nil, err
	}

	workflows := coreadmin.NewBunWorkflowDefinitionRepository(client.DB())
	bindings := coreadmin.NewBunWorkflowBindingRepository(client.DB())
	return coreadmin.NewWorkflowRuntimeService(workflows, bindings), nil
}
