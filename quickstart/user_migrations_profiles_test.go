package quickstart

import (
	"context"
	"database/sql"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	auth "github.com/goliatone/go-auth"
	persistence "github.com/goliatone/go-persistence-bun"
	users "github.com/goliatone/go-users"
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

func TestRegisterUserMigrations_UserCoreNamesStableWhenAuthSourceInserted(t *testing.T) {
	coreOnlyClient := newUserMigrationsPersistenceClient(t)
	if err := RegisterUserMigrations(
		coreOnlyClient,
		WithUserMigrationsAuthEnabled(false),
	); err != nil {
		t.Fatalf("RegisterUserMigrations core-only: %v", err)
	}
	coreOnlyPlan, err := coreOnlyClient.Plan(context.Background())
	if err != nil {
		t.Fatalf("Plan core-only: %v", err)
	}

	combinedClient := newUserMigrationsPersistenceClient(t)
	if err := RegisterUserMigrations(combinedClient); err != nil {
		t.Fatalf("RegisterUserMigrations combined: %v", err)
	}
	combinedPlan, err := combinedClient.Plan(context.Background())
	if err != nil {
		t.Fatalf("Plan combined: %v", err)
	}

	coreOnlySynthetic := userSyntheticNamesBySourceKey(coreOnlyPlan, "go_users")
	combinedSynthetic := userSyntheticNamesBySourceKey(combinedPlan, "go_users")
	if !reflect.DeepEqual(combinedSynthetic, coreOnlySynthetic) {
		t.Fatalf("go-users synthetic names changed after inserting go-auth: got=%v want=%v", combinedSynthetic, coreOnlySynthetic)
	}
}

func TestRegisterUserMigrations_BackfillsLegacyPositionalMarkers(t *testing.T) {
	testCases := []struct {
		name           string
		profile        UserMigrationsProfile
		wantSourceKeys []string
	}{
		{
			name:           "auth-only",
			profile:        UserMigrationsProfileAuthOnly,
			wantSourceKeys: []string{"go_auth"},
		},
		{
			name:           "combined",
			profile:        UserMigrationsProfileCombined,
			wantSourceKeys: []string{"go_auth", "go_users"},
		},
		{
			name:           "users-standalone",
			profile:        UserMigrationsProfileUsersStandalone,
			wantSourceKeys: []string{"go_users_auth", "go_users_auth_extras", "go_users"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			client := newUserMigrationsPersistenceClient(t)
			legacySources := legacyUserMigrationSources(t, tc.profile)

			legacy := persistence.NewMigrations()
			if err := legacy.RegisterOrderedMigrationSources(legacySources...); err != nil {
				t.Fatalf("register legacy user migrations: %v", err)
			}
			if err := legacy.Migrate(ctx, client.DB()); err != nil {
				t.Fatalf("migrate legacy positional user sources: %v", err)
			}
			legacyCount := countUserMigrationRows(t, client, "ord_%")
			if legacyCount == 0 {
				t.Fatalf("expected legacy positional markers")
			}

			if err := RegisterUserMigrations(client, WithUserMigrationsProfile(tc.profile)); err != nil {
				t.Fatalf("RegisterUserMigrations stable graph: %v", err)
			}
			if err := client.GetMigrations().BackfillStableOrderedMigrationMarkers(ctx, client.DB(), legacySources); err != nil {
				t.Fatalf("backfill stable user markers: %v", err)
			}
			stableCount := countUserMigrationRows(t, client, "ordsrc_%")
			if stableCount == 0 {
				t.Fatalf("expected source-stable markers after backfill")
			}

			if err := client.GetMigrations().BackfillStableOrderedMigrationMarkers(ctx, client.DB(), legacySources); err != nil {
				t.Fatalf("backfill stable user markers second run: %v", err)
			}
			if secondCount := countUserMigrationRows(t, client, "ordsrc_%"); secondCount != stableCount {
				t.Fatalf("stable marker count changed after idempotent backfill: got=%d want=%d", secondCount, stableCount)
			}

			plan, err := client.Plan(ctx)
			if err != nil {
				t.Fatalf("Plan stable user migrations: %v", err)
			}
			for _, sourceKey := range tc.wantSourceKeys {
				assertUserAppliedSourceStablePlanEntry(t, plan, sourceKey)
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

func userSyntheticNamesBySourceKey(plan *persistence.MigrationPlan, sourceKey string) []string {
	if plan == nil {
		return nil
	}
	out := []string{}
	for _, entry := range plan.Entries {
		if entry.SourceKey == sourceKey {
			out = append(out, entry.SyntheticName)
		}
	}
	return out
}

func assertUserAppliedSourceStablePlanEntry(t *testing.T, plan *persistence.MigrationPlan, sourceKey string) {
	t.Helper()
	for _, entry := range plan.Entries {
		if entry.SourceKey != sourceKey {
			continue
		}
		if !entry.Applied {
			t.Fatalf("expected source key %q entry %q to be marked applied", sourceKey, entry.SyntheticName)
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

func legacyUserMigrationSources(t *testing.T, profile UserMigrationsProfile) []persistence.OrderedMigrationSource {
	t.Helper()

	enabledAuth, enabledCore, enabledBootstrap, enabledExtras, err := resolveUserMigrationsProfile(profile)
	if err != nil {
		t.Fatalf("resolve user migrations profile: %v", err)
	}

	sources := []persistence.OrderedMigrationSource{}
	if enabledAuth {
		authRoot, err := resolveMigrationFS(nil, auth.GetMigrationsFS(), "data/sql/migrations")
		if err != nil {
			t.Fatalf("resolve auth migrations: %v", err)
		}
		sources = append(sources, persistence.OrderedMigrationSource{Name: UserMigrationsSourceLabelAuth, Root: authRoot})
	}
	if enabledBootstrap {
		bootstrapRoot, err := resolveMigrationFS(nil, users.GetAuthBootstrapMigrationsFS(), "data/sql/migrations/auth")
		if err != nil {
			t.Fatalf("resolve users auth bootstrap migrations: %v", err)
		}
		sources = append(sources, persistence.OrderedMigrationSource{Name: UserMigrationsSourceLabelUsersAuthBootstrap, Root: bootstrapRoot})
	}
	if enabledExtras {
		extrasRoot, err := resolveMigrationFS(nil, users.GetAuthExtrasMigrationsFS(), "data/sql/migrations/auth_extras")
		if err != nil {
			t.Fatalf("resolve users auth extras migrations: %v", err)
		}
		sources = append(sources, persistence.OrderedMigrationSource{Name: UserMigrationsSourceLabelUsersAuthExtras, Root: extrasRoot})
	}
	if enabledCore {
		coreRoot, err := resolveMigrationFS(nil, users.GetCoreMigrationsFS(), "data/sql/migrations")
		if err != nil {
			t.Fatalf("resolve users core migrations: %v", err)
		}
		sources = append(sources, persistence.OrderedMigrationSource{Name: UserMigrationsSourceLabelUsersCore, Root: coreRoot})
	}
	return sources
}

func countUserMigrationRows(t *testing.T, client *persistence.Client, pattern string) int {
	t.Helper()
	var count int
	if err := client.DB().
		NewSelect().
		TableExpr("bun_migrations").
		ColumnExpr("COUNT(1)").
		Where("name LIKE ?", pattern).
		Scan(context.Background(), &count); err != nil {
		t.Fatalf("count migration rows %q: %v", pattern, err)
	}
	return count
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
