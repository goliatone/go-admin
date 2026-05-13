package services

import (
	"context"
	"io/fs"
	"reflect"
	"strings"
	"testing"
	"testing/fstest"

	auth "github.com/goliatone/go-auth"
	persistence "github.com/goliatone/go-persistence-bun"
	goservices "github.com/goliatone/go-services"
	users "github.com/goliatone/go-users"
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

func TestRegisterServiceMigrations_SourceStablePlanMetadata(t *testing.T) {
	client := newTestPersistenceClient(t)

	appFS := fstest.MapFS{
		"00099_app_local.up.sql":   {Data: []byte("CREATE TABLE IF NOT EXISTS app_local_events(id TEXT);")},
		"00099_app_local.down.sql": {Data: []byte("DROP TABLE IF EXISTS app_local_events;")},
	}
	if err := RegisterServiceMigrations(
		client,
		WithServiceMigrationsAppSource("app-local", appFS),
	); err != nil {
		t.Fatalf("register service migrations: %v", err)
	}

	plan, err := client.Plan(context.Background())
	if err != nil {
		t.Fatalf("plan migrations: %v", err)
	}
	assertSourceStablePlanEntry(t, plan, "go_auth", 10, nil)
	assertSourceStablePlanEntry(t, plan, "go_users", 20, []string{"go_auth"})
	assertSourceStablePlanEntry(t, plan, "go_services", 30, []string{"go_users"})
	assertSourceStablePlanEntry(t, plan, "app_local", 100, []string{"go_services"})
}

func TestRegisterServiceMigrations_PrunesAbsentSourceDependencies(t *testing.T) {
	testCases := []struct {
		name        string
		options     []ServiceMigrationsOption
		sourceKey   string
		order       int
		dependsOn   []string
		appDepends  []string
		expectAppFS bool
	}{
		{
			name: "services-only",
			options: []ServiceMigrationsOption{
				WithServiceMigrationsAuthEnabled(false),
				WithServiceMigrationsUsersEnabled(false),
			},
			sourceKey: "go_services",
			order:     30,
		},
		{
			name: "auth-only-app",
			options: []ServiceMigrationsOption{
				WithServiceMigrationsProfile(ServiceMigrationsProfileAuthOnly),
				WithServiceMigrationsAppSource("app-local", appMigrationTestFS("auth_local")),
			},
			sourceKey:   "go_auth",
			order:       10,
			expectAppFS: true,
			appDepends:  []string{"go_auth"},
		},
		{
			name: "local-only-app",
			options: []ServiceMigrationsOption{
				WithServiceMigrationsAuthEnabled(false),
				WithServiceMigrationsUsersEnabled(false),
				WithServiceMigrationsServicesEnabled(false),
				WithServiceMigrationsAppSource("app-local", appMigrationTestFS("local_only")),
			},
			expectAppFS: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			client := newTestPersistenceClient(t)
			if err := RegisterServiceMigrations(client, tc.options...); err != nil {
				t.Fatalf("register service migrations: %v", err)
			}
			plan, err := client.Plan(context.Background())
			if err != nil {
				t.Fatalf("plan migrations: %v", err)
			}
			if tc.sourceKey != "" {
				assertSourceStablePlanEntry(t, plan, tc.sourceKey, tc.order, tc.dependsOn)
			}
			if tc.expectAppFS {
				assertSourceStablePlanEntry(t, plan, "app_local", 100, tc.appDepends)
			}
		})
	}
}

func TestRegisterServiceMigrations_AppLocalStableIdentity(t *testing.T) {
	firstClient := newTestPersistenceClient(t)
	if err := RegisterServiceMigrations(
		firstClient,
		WithServiceMigrationsStableAppSource("App A", appMigrationTestFS("app_a"), "app-a", 120),
	); err != nil {
		t.Fatalf("register first service migrations: %v", err)
	}
	firstPlan, err := firstClient.Plan(context.Background())
	if err != nil {
		t.Fatalf("plan first migrations: %v", err)
	}

	secondClient := newTestPersistenceClient(t)
	err = RegisterServiceMigrations(
		secondClient,
		WithServiceMigrationsStableAppSource("App B", appMigrationTestFS("app_b"), "app-b", 110),
		WithServiceMigrationsStableAppSource("App A", appMigrationTestFS("app_a"), "app-a", 120),
	)
	if err != nil {
		t.Fatalf("register second service migrations: %v", err)
	}
	secondPlan, err := secondClient.Plan(context.Background())
	if err != nil {
		t.Fatalf("plan second migrations: %v", err)
	}

	firstSynthetic := syntheticNamesBySourceKey(firstPlan, "app_a")
	secondSynthetic := syntheticNamesBySourceKey(secondPlan, "app_a")
	if !reflect.DeepEqual(firstSynthetic, secondSynthetic) {
		t.Fatalf("app-a synthetic names changed after inserting app-b: got=%v want=%v", secondSynthetic, firstSynthetic)
	}
	assertSourceStablePlanEntry(t, secondPlan, "app_b", 110, []string{"go_services"})
	assertSourceStablePlanEntry(t, secondPlan, "app_a", 120, []string{"go_services"})
}

func TestRegisterServiceMigrations_AppLocalRejectsSourceKeyCollisions(t *testing.T) {
	testCases := []struct {
		name    string
		options []ServiceMigrationsOption
		want    string
	}{
		{
			name: "duplicate app source key",
			options: []ServiceMigrationsOption{
				WithServiceMigrationsStableAppSource("App A", appMigrationTestFS("app_a"), "app-local", 100),
				WithServiceMigrationsStableAppSource("App B", appMigrationTestFS("app_b"), "app-local", 110),
			},
			want: "collides",
		},
		{
			name: "duplicate public default app source key",
			options: []ServiceMigrationsOption{
				WithServiceMigrationsAppSource("", appMigrationTestFS("app_a")),
				WithServiceMigrationsAppSource("", appMigrationTestFS("app_b")),
			},
			want: "collides",
		},
		{
			name: "package source key",
			options: []ServiceMigrationsOption{
				WithServiceMigrationsStableAppSource("App A", appMigrationTestFS("app_a"), "go-services", 100),
			},
			want: "go-services",
		},
		{
			name: "order below app range",
			options: []ServiceMigrationsOption{
				WithServiceMigrationsStableAppSource("App A", appMigrationTestFS("app_a"), "app-a", 90),
			},
			want: "must be >= 100",
		},
		{
			name: "duplicate app order",
			options: []ServiceMigrationsOption{
				WithServiceMigrationsStableAppSource("App A", appMigrationTestFS("app_a"), "app-a", 100),
				WithServiceMigrationsStableAppSource("App B", appMigrationTestFS("app_b"), "app-b", 100),
			},
			want: "order 100 collides",
		},
		{
			name: "invalid app source key",
			options: []ServiceMigrationsOption{
				WithServiceMigrationsStableAppSource("App A", appMigrationTestFS("app_a"), "!!!", 100),
			},
			want: "is invalid",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			client := newTestPersistenceClient(t)
			err := RegisterServiceMigrations(client, tc.options...)
			if err == nil {
				t.Fatalf("expected registration error")
			}
			if !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("expected error containing %q, got %v", tc.want, err)
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

func TestRegisterServiceMigrations_BackfillsLegacyPositionalMarkers(t *testing.T) {
	ctx := context.Background()
	client := newTestPersistenceClient(t)
	appFS := appMigrationTestFS("app_local_backfill")
	legacySources := legacyServiceMigrationSources(t, appFS)

	legacy := persistence.NewMigrations()
	if err := legacy.RegisterOrderedMigrationSources(legacySources...); err != nil {
		t.Fatalf("register legacy migrations: %v", err)
	}
	if err := legacy.Migrate(ctx, client.DB()); err != nil {
		t.Fatalf("migrate legacy positional sources: %v", err)
	}
	legacyCount := countMigrationRows(t, client, "ord_%")
	if legacyCount == 0 {
		t.Fatalf("expected legacy positional markers")
	}

	stable := persistence.NewMigrations()
	if err := stable.RegisterOrderedMigrationSources(stableServiceMigrationSources(t, appFS)...); err != nil {
		t.Fatalf("register stable migrations: %v", err)
	}
	if err := stable.BackfillStableOrderedMigrationMarkers(ctx, client.DB(), legacySources); err != nil {
		t.Fatalf("backfill stable markers: %v", err)
	}
	stableCount := countMigrationRows(t, client, "ordsrc_%")
	if stableCount == 0 {
		t.Fatalf("expected source-stable markers after backfill")
	}

	if err := stable.BackfillStableOrderedMigrationMarkers(ctx, client.DB(), legacySources); err != nil {
		t.Fatalf("backfill stable markers second run: %v", err)
	}
	if secondCount := countMigrationRows(t, client, "ordsrc_%"); secondCount != stableCount {
		t.Fatalf("stable marker count changed after idempotent backfill: got=%d want=%d", secondCount, stableCount)
	}

	plan, err := stable.Plan(ctx, client.DB())
	if err != nil {
		t.Fatalf("plan stable migrations: %v", err)
	}
	for _, sourceKey := range []string{"go_auth", "go_users", "go_services", "app_local"} {
		assertAppliedSourceStablePlanEntry(t, plan, sourceKey)
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

func legacyServiceMigrationSources(t *testing.T, appFS fs.FS) []persistence.OrderedMigrationSource {
	t.Helper()
	authRoot, err := resolveMigrationFS(nil, auth.GetMigrationsFS(), "data/sql/migrations")
	if err != nil {
		t.Fatalf("resolve auth migrations: %v", err)
	}
	usersRoot, err := resolveMigrationFS(nil, users.GetCoreMigrationsFS(), "data/sql/migrations")
	if err != nil {
		t.Fatalf("resolve users migrations: %v", err)
	}
	servicesRoot, err := resolveMigrationFS(nil, goservices.GetCoreMigrationsFS(), "data/sql/migrations")
	if err != nil {
		t.Fatalf("resolve services migrations: %v", err)
	}
	return []persistence.OrderedMigrationSource{
		{Name: ServiceMigrationsSourceLabelAuth, Root: authRoot},
		{Name: ServiceMigrationsSourceLabelUsers, Root: usersRoot},
		{Name: ServiceMigrationsSourceLabelServices, Root: servicesRoot},
		{Name: ServiceMigrationsSourceLabelAppLocal, Root: appFS},
	}
}

func stableServiceMigrationSources(t *testing.T, appFS fs.FS) []persistence.OrderedMigrationSource {
	t.Helper()
	authRoot, err := resolveMigrationFS(nil, auth.GetMigrationsFS(), "data/sql/migrations")
	if err != nil {
		t.Fatalf("resolve auth migrations: %v", err)
	}
	usersRoot, err := resolveMigrationFS(nil, users.GetCoreMigrationsFS(), "data/sql/migrations")
	if err != nil {
		t.Fatalf("resolve users migrations: %v", err)
	}
	servicesRoot, err := resolveMigrationFS(nil, goservices.GetCoreMigrationsFS(), "data/sql/migrations")
	if err != nil {
		t.Fatalf("resolve services migrations: %v", err)
	}
	return []persistence.OrderedMigrationSource{
		persistence.NewStableOrderedMigrationSource(ServiceMigrationsSourceLabelAuth, authRoot, serviceMigrationsSourceKeyAuth, serviceMigrationsSourceOrderAuth),
		persistence.NewStableOrderedMigrationSource(ServiceMigrationsSourceLabelUsers, usersRoot, serviceMigrationsSourceKeyUsers, serviceMigrationsSourceOrderUsers, persistence.WithOrderedMigrationDependencies(serviceMigrationsSourceKeyAuth)),
		persistence.NewStableOrderedMigrationSource(ServiceMigrationsSourceLabelServices, servicesRoot, serviceMigrationsSourceKeyServices, serviceMigrationsSourceOrderServices, persistence.WithOrderedMigrationDependencies(serviceMigrationsSourceKeyUsers)),
		persistence.NewStableOrderedMigrationSource(ServiceMigrationsSourceLabelAppLocal, appFS, serviceMigrationsSourceKeyAppLocal, serviceMigrationsSourceOrderAppLocal, persistence.WithOrderedMigrationDependencies(serviceMigrationsSourceKeyServices)),
	}
}

func appMigrationTestFS(table string) fstest.MapFS {
	table = strings.TrimSpace(table)
	if table == "" {
		table = "app_local"
	}
	return fstest.MapFS{
		"00001_" + table + ".up.sql":   {Data: []byte("CREATE TABLE IF NOT EXISTS " + table + "(id TEXT);")},
		"00001_" + table + ".down.sql": {Data: []byte("DROP TABLE IF EXISTS " + table + ";")},
	}
}

func assertSourceStablePlanEntry(t *testing.T, plan *persistence.MigrationPlan, sourceKey string, order int, dependsOn []string) {
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

func syntheticNamesBySourceKey(plan *persistence.MigrationPlan, sourceKey string) []string {
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

func assertAppliedSourceStablePlanEntry(t *testing.T, plan *persistence.MigrationPlan, sourceKey string) {
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

func countMigrationRows(t *testing.T, client *persistence.Client, pattern string) int {
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
