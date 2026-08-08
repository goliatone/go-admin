package admin

import (
	"context"
	"database/sql"
	"io/fs"
	"path/filepath"
	"sync"
	"testing"
	"time"

	notifications "github.com/goliatone/go-notifications"
	"github.com/goliatone/go-notifications/pkg/interfaces/store"
	"github.com/goliatone/go-notifications/pkg/storage"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

type notificationPersistenceConfig struct{ dsn string }

func (c notificationPersistenceConfig) GetDebug() bool                { return false }
func (c notificationPersistenceConfig) GetDriver() string             { return sqliteshim.ShimName }
func (c notificationPersistenceConfig) GetServer() string             { return c.dsn }
func (c notificationPersistenceConfig) GetPingTimeout() time.Duration { return time.Second }
func (c notificationPersistenceConfig) GetOtelIdentifier() string     { return "" }

func TestNewBunNotificationRuntimeRequiresMigrationsAndSupportsBootstrap(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "notifications.db") + "?cache=shared&_fk=1"
	sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer sqlDB.Close()
	client, err := persistence.New(notificationPersistenceConfig{dsn: dsn}, sqlDB, sqlitedialect.New())
	if err != nil {
		t.Fatalf("new persistence client: %v", err)
	}
	ctx := context.Background()
	if _, err := NewBunNotificationRuntime(ctx, client.DB()); err == nil {
		t.Fatal("expected runtime construction to fail before migrations")
	}
	root, err := notifications.GetMigrationsFS()
	if err != nil {
		t.Fatalf("notification migration filesystem: %v", err)
	}
	for _, name := range []string{
		"sqlite/001_notifications_core.up.sql",
		"sqlite/002_notification_delivery_upgrades.up.sql",
	} {
		migration, readErr := fs.ReadFile(root, name)
		if readErr != nil {
			t.Fatalf("read partial migration %s: %v", name, readErr)
		}
		if _, execErr := client.DB().ExecContext(ctx, string(migration)); execErr != nil {
			t.Fatalf("apply partial migration %s: %v", name, execErr)
		}
	}
	if _, err := NewBunNotificationRuntime(ctx, client.DB()); err == nil {
		t.Fatal("expected runtime construction to reject migrations missing schema/index upgrades")
	}
	fullDSN := "file:" + filepath.Join(t.TempDir(), "notifications-full.db") + "?cache=shared&_fk=1"
	fullSQLDB, err := sql.Open(sqliteshim.ShimName, fullDSN)
	if err != nil {
		t.Fatalf("open full sqlite: %v", err)
	}
	defer fullSQLDB.Close()
	client, err = persistence.New(notificationPersistenceConfig{dsn: fullDSN}, fullSQLDB, sqlitedialect.New())
	if err != nil {
		t.Fatalf("new full persistence client: %v", err)
	}
	source, err := notifications.OrderedMigrationSource()
	if err != nil {
		t.Fatalf("notification migration source: %v", err)
	}
	if err := client.RegisterOrderedMigrationSources(source); err != nil {
		t.Fatalf("register notification migrations: %v", err)
	}
	if err := client.Migrate(ctx); err != nil {
		t.Fatalf("migrate notifications: %v", err)
	}
	runtime, err := NewBunNotificationRuntime(ctx, client.DB())
	if err != nil {
		t.Fatalf("persistent runtime after migrations: %v", err)
	}
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureNotifications, FeatureCommands), NotificationRuntime: runtime,
	})
	if !notificationCapabilityAvailable(adm.NotificationDeliveries()) || !notificationCapabilityAvailable(adm.NotificationRetention()) {
		t.Fatal("expected migrated Bun runtime capabilities")
	}
}

func TestBunNotificationRuntimeSeedsAreConcurrentAndIdempotent(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "notifications-seed-race.db") + "?cache=shared&_fk=1&_pragma=busy_timeout(5000)"
	sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer sqlDB.Close()
	sqlDB.SetMaxOpenConns(16)
	client, err := persistence.New(notificationPersistenceConfig{dsn: dsn}, sqlDB, sqlitedialect.New())
	if err != nil {
		t.Fatalf("new persistence client: %v", err)
	}
	source, err := notifications.OrderedMigrationSource()
	if err != nil {
		t.Fatalf("notification migration source: %v", err)
	}
	if err := client.RegisterOrderedMigrationSources(source); err != nil {
		t.Fatalf("register notification migrations: %v", err)
	}
	if err := client.Migrate(context.Background()); err != nil {
		t.Fatalf("migrate notifications: %v", err)
	}
	providers := storage.NewBunProviders(client.DB())

	const constructors = 16
	errorsCh := make(chan error, constructors)
	var wait sync.WaitGroup
	for range constructors {
		wait.Go(func() {
			_, constructErr := newGoNotificationsServiceWithProviders("en", nil, nil, providers)
			errorsCh <- constructErr
		})
	}
	wait.Wait()
	close(errorsCh)
	for constructErr := range errorsCh {
		if constructErr != nil {
			t.Fatalf("concurrent runtime construction: %v", constructErr)
		}
	}
	definitions, err := providers.Definitions.List(context.Background(), store.ListOptions{})
	if err != nil || definitions.Total != 1 {
		t.Fatalf("definitions after concurrent seed: total=%d err=%v", definitions.Total, err)
	}
	templates, err := providers.Templates.List(context.Background(), store.ListOptions{})
	if err != nil || templates.Total != 1 {
		t.Fatalf("templates after concurrent seed: total=%d err=%v", templates.Total, err)
	}
}
