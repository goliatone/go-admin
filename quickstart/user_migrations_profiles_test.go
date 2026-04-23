package quickstart

import (
	"context"
	"database/sql"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

func TestRegisterUserMigrations_ProfileOrderAndLabels(t *testing.T) {
	testCases := []struct {
		name     string
		profile  UserMigrationsProfile
		expected []string
	}{
		{
			name:     "auth-only",
			profile:  UserMigrationsProfileAuthOnly,
			expected: []string{UserMigrationsSourceLabelAuth},
		},
		{
			name:    "users-standalone",
			profile: UserMigrationsProfileUsersStandalone,
			expected: []string{
				UserMigrationsSourceLabelUsersAuthBootstrap,
				UserMigrationsSourceLabelUsersAuthExtras,
				UserMigrationsSourceLabelUsersCore,
			},
		},
		{
			name:     "combined",
			profile:  UserMigrationsProfileCombined,
			expected: []string{UserMigrationsSourceLabelAuth, UserMigrationsSourceLabelUsersCore},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			client := newUserMigrationsPersistenceClient(t)
			labels := make([]string, 0, len(tc.expected))

			err := RegisterUserMigrations(
				client,
				WithUserMigrationsProfile(tc.profile),
				WithUserMigrationsObserver(func(step UserMigrationRegistration) {
					labels = append(labels, step.Label)
				}),
			)
			if err != nil {
				t.Fatalf("RegisterUserMigrations: %v", err)
			}
			if !reflect.DeepEqual(labels, tc.expected) {
				t.Fatalf("registration order mismatch: got=%v want=%v", labels, tc.expected)
			}
			if err := client.ValidateDialects(context.Background()); err != nil {
				t.Fatalf("ValidateDialects: %v", err)
			}
		})
	}
}

func TestRegisterUserMigrations_InvalidProfile(t *testing.T) {
	client := newUserMigrationsPersistenceClient(t)
	err := RegisterUserMigrations(
		client,
		WithUserMigrationsProfile(UserMigrationsProfile("unknown")),
	)
	if err == nil {
		t.Fatalf("expected profile validation error")
	}
	if !strings.Contains(err.Error(), "unsupported user migrations profile") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func newUserMigrationsPersistenceClient(t *testing.T) *persistence.Client {
	t.Helper()

	dsn := "file:" + filepath.Join(t.TempDir(), "user_migration_profiles.db") + "?cache=shared&_fk=1"
	sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)
	t.Cleanup(func() {
		_ = sqlDB.Close()
	})

	cfg := testPersistenceConfig{driver: sqliteshim.ShimName, server: dsn}
	client, err := persistence.New(cfg, sqlDB, sqlitedialect.New())
	if err != nil {
		t.Fatalf("persistence.New: %v", err)
	}
	return client
}
