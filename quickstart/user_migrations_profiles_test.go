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

func TestRegisterUserMigrations_SourceStablePlanMetadata(t *testing.T) {
	testCases := []struct {
		name     string
		profile  UserMigrationsProfile
		expected []userSourcePlanExpectation
	}{
		{
			name:    "auth-only",
			profile: UserMigrationsProfileAuthOnly,
			expected: []userSourcePlanExpectation{
				{sourceKey: "go_auth", order: 10},
			},
		},
		{
			name:    "combined",
			profile: UserMigrationsProfileCombined,
			expected: []userSourcePlanExpectation{
				{sourceKey: "go_auth", order: 10},
				{sourceKey: "go_users", order: 40, dependsOn: []string{"go_auth"}},
			},
		},
		{
			name:    "users-standalone",
			profile: UserMigrationsProfileUsersStandalone,
			expected: []userSourcePlanExpectation{
				{sourceKey: "go_users_auth", order: 20},
				{sourceKey: "go_users_auth_extras", order: 30, dependsOn: []string{"go_users_auth"}},
				{sourceKey: "go_users", order: 40, dependsOn: []string{"go_users_auth_extras"}},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			client := newUserMigrationsPersistenceClient(t)
			if err := RegisterUserMigrations(client, WithUserMigrationsProfile(tc.profile)); err != nil {
				t.Fatalf("RegisterUserMigrations: %v", err)
			}
			plan, err := client.Plan(context.Background())
			if err != nil {
				t.Fatalf("Plan: %v", err)
			}
			for _, expected := range tc.expected {
				assertUserSourceStablePlanEntry(t, plan, expected.sourceKey, expected.order, expected.dependsOn)
			}
		})
	}
}

func TestRegisterUserMigrations_PrunesAbsentSourceDependencies(t *testing.T) {
	client := newUserMigrationsPersistenceClient(t)
	if err := RegisterUserMigrations(
		client,
		WithUserMigrationsProfile(UserMigrationsProfileUsersStandalone),
		WithUserMigrationsAuthExtrasEnabled(false),
	); err != nil {
		t.Fatalf("RegisterUserMigrations: %v", err)
	}
	plan, err := client.Plan(context.Background())
	if err != nil {
		t.Fatalf("Plan: %v", err)
	}
	assertUserSourceStablePlanEntry(t, plan, "go_users_auth", 20, nil)
	assertUserSourceStablePlanEntry(t, plan, "go_users", 40, []string{"go_users_auth"})
	assertUserSourceAbsent(t, plan, "go_users_auth_extras")
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

type userSourcePlanExpectation struct {
	sourceKey string
	order     int
	dependsOn []string
}

func assertUserSourceStablePlanEntry(t *testing.T, plan *persistence.MigrationPlan, sourceKey string, order int, dependsOn []string) {
	t.Helper()
	for _, entry := range plan.Entries {
		if entry.SourceKey != sourceKey {
			continue
		}
		if entry.SourceOrder != order {
			t.Fatalf("%s source order mismatch: got=%d want=%d", sourceKey, entry.SourceOrder, order)
		}
		if !reflect.DeepEqual(entry.SourceDependsOn, dependsOn) {
			t.Fatalf("%s dependencies mismatch: got=%v want=%v", sourceKey, entry.SourceDependsOn, dependsOn)
		}
		if !strings.HasPrefix(entry.SyntheticName, "ordsrc_") {
			t.Fatalf("%s synthetic name %q is not source-stable", sourceKey, entry.SyntheticName)
		}
		return
	}
	t.Fatalf("expected source key %q in migration plan", sourceKey)
}

func assertUserSourceAbsent(t *testing.T, plan *persistence.MigrationPlan, sourceKey string) {
	t.Helper()
	for _, entry := range plan.Entries {
		if entry.SourceKey == sourceKey {
			t.Fatalf("expected source key %q to be absent", sourceKey)
		}
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
