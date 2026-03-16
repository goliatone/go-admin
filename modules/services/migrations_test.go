package services

import (
	"context"
	"io/fs"
	"reflect"
	"testing"
	"testing/fstest"
)

func TestRegisterServiceMigrations_OrderAndLabels(t *testing.T) {
	client := newTestPersistenceClient(t)

	appFS := fstest.MapFS{
		"00099_app_local.up.sql":          {Data: []byte("CREATE TABLE IF NOT EXISTS app_local_events(id TEXT);")},
		"00099_app_local.down.sql":        {Data: []byte("DROP TABLE IF EXISTS app_local_events;")},
		"sqlite/00099_app_local.up.sql":   {Data: []byte("CREATE TABLE IF NOT EXISTS app_local_events(id TEXT);")},
		"sqlite/00099_app_local.down.sql": {Data: []byte("DROP TABLE IF EXISTS app_local_events;")},
	}

	labels := []string{}
	err := RegisterServiceMigrations(
		client,
		WithServiceMigrationsObserver(func(step MigrationRegistration) {
			labels = append(labels, step.Label)
		}),
		WithServiceMigrationsAppSource("app-local", appFS),
	)
	if err != nil {
		t.Fatalf("register service migrations: %v", err)
	}

	expected := []string{
		ServiceMigrationsSourceLabelAuth,
		ServiceMigrationsSourceLabelUsers,
		ServiceMigrationsSourceLabelServices,
		ServiceMigrationsSourceLabelAppLocal,
	}
	if !reflect.DeepEqual(labels, expected) {
		t.Fatalf("migration registration order mismatch: got=%v want=%v", labels, expected)
	}
	if err := client.ValidateDialects(context.Background()); err != nil {
		t.Fatalf("validate dialects: %v", err)
	}
}

func TestRegisterServiceMigrations_Toggles(t *testing.T) {
	client := newTestPersistenceClient(t)

	labels := []string{}
	err := RegisterServiceMigrations(
		client,
		WithServiceMigrationsAuthEnabled(false),
		WithServiceMigrationsUsersEnabled(false),
		WithServiceMigrationsObserver(func(step MigrationRegistration) {
			labels = append(labels, step.Label)
		}),
	)
	if err != nil {
		t.Fatalf("register service migrations: %v", err)
	}

	expected := []string{ServiceMigrationsSourceLabelServices}
	if !reflect.DeepEqual(labels, expected) {
		t.Fatalf("migration toggle mismatch: got=%v want=%v", labels, expected)
	}
}

func TestRegisterServiceMigrations_ProfileOrderAndLabels(t *testing.T) {
	testCases := []struct {
		name     string
		profile  ServiceMigrationsProfile
		expected []string
	}{
		{
			name:     "auth-only",
			profile:  ServiceMigrationsProfileAuthOnly,
			expected: []string{ServiceMigrationsSourceLabelAuth},
		},
		{
			name:    "combined",
			profile: ServiceMigrationsProfileCombined,
			expected: []string{
				ServiceMigrationsSourceLabelAuth,
				ServiceMigrationsSourceLabelUsers,
			},
		},
		{
			name:    "services-stack",
			profile: ServiceMigrationsProfileServicesStack,
			expected: []string{
				ServiceMigrationsSourceLabelAuth,
				ServiceMigrationsSourceLabelUsers,
				ServiceMigrationsSourceLabelServices,
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			client := newTestPersistenceClient(t)
			labels := []string{}

			err := RegisterServiceMigrations(
				client,
				WithServiceMigrationsProfile(tc.profile),
				WithServiceMigrationsObserver(func(step MigrationRegistration) {
					labels = append(labels, step.Label)
				}),
			)
			if err != nil {
				t.Fatalf("register service migrations: %v", err)
			}
			if !reflect.DeepEqual(labels, tc.expected) {
				t.Fatalf("migration registration order mismatch: got=%v want=%v", labels, tc.expected)
			}
			if err := client.ValidateDialects(context.Background()); err != nil {
				t.Fatalf("validate dialects: %v", err)
			}
		})
	}
}

func TestRegisterServiceMigrations_InvalidProfile(t *testing.T) {
	client := newTestPersistenceClient(t)
	err := RegisterServiceMigrations(
		client,
		WithServiceMigrationsProfile(ServiceMigrationsProfile("unknown")),
	)
	if err == nil {
		t.Fatalf("expected profile validation error")
	}
}

func TestRegisterServiceMigrations_SQLiteMigrateAppliesOverlappingSources(t *testing.T) {
	client := newTestPersistenceClient(t)
	if err := RegisterServiceMigrations(client); err != nil {
		t.Fatalf("register service migrations: %v", err)
	}

	if err := client.Migrate(context.Background()); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	requiredTables := []string{
		"custom_roles",
		"service_connections",
		"service_grant_snapshots",
	}
	for _, table := range requiredTables {
		var count int
		if err := client.DB().
			NewSelect().
			TableExpr("sqlite_master").
			ColumnExpr("COUNT(1)").
			Where("type = 'table'").
			Where("name = ?", table).
			Scan(context.Background(), &count); err != nil {
			t.Fatalf("check table %q: %v", table, err)
		}
		if count <= 0 {
			t.Fatalf("expected table %q to exist after migration", table)
		}
	}
}

func TestResolveMigrationFS_OverrideWins(t *testing.T) {
	override := fstest.MapFS{"00001_test.up.sql": {Data: []byte("SELECT 1;")}}
	fallback := fstest.MapFS{"data/sql/migrations/00001_fallback.up.sql": {Data: []byte("SELECT 1;")}}

	resolved, err := resolveMigrationFS(override, fallback, "data/sql/migrations")
	if err != nil {
		t.Fatalf("resolve migration fs: %v", err)
	}
	if resolved == nil {
		t.Fatalf("expected override filesystem")
	}
	if _, readErr := fs.ReadFile(resolved, "00001_test.up.sql"); readErr != nil {
		t.Fatalf("expected override fs file: %v", readErr)
	}
}
