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

	expected := []string{"go-auth", "go-users", "go-services", "app-local"}
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

	expected := []string{"go-services"}
	if !reflect.DeepEqual(labels, expected) {
		t.Fatalf("migration toggle mismatch: got=%v want=%v", labels, expected)
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
