package setup

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	cms "github.com/goliatone/go-cms"
	"github.com/goliatone/go-cms/pkg/storage"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

// persistentConfig satisfies the go-persistence-bun Config interface.
type persistentConfig struct {
	driver      string
	server      string
	pingTimeout time.Duration
}

func (c persistentConfig) GetDebug() bool    { return false }
func (c persistentConfig) GetDriver() string { return c.driver }
func (c persistentConfig) GetServer() string { return c.server }
func (c persistentConfig) GetPingTimeout() time.Duration {
	if c.pingTimeout <= 0 {
		return 5 * time.Second
	}
	return c.pingTimeout
}

func (c persistentConfig) GetOtelIdentifier() string { return "" }

// SetupPersistentCMS wires a go-cms container backed by Bun/SQLite and applies migrations.
// DSN falls back to a temp file (under /tmp) when none is provided and can be overridden
// via the CMS_DATABASE_DSN environment variable.
func SetupPersistentCMS(ctx context.Context, defaultLocale, dsn string) (admin.CMSOptions, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if strings.TrimSpace(defaultLocale) == "" {
		defaultLocale = "en"
	}

	resolvedDSN := strings.TrimSpace(dsn)
	if resolvedDSN == "" {
		if env := strings.TrimSpace(os.Getenv("CMS_DATABASE_DSN")); env != "" {
			resolvedDSN = env
		} else {
			resolvedDSN = defaultCMSDSN()
		}
	}

	registerSQLiteDrivers("sqlite3", "sqlite")

	sqlDB, err := sql.Open("sqlite3", resolvedDSN)
	if err != nil {
		return admin.CMSOptions{}, err
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
		return admin.CMSOptions{}, err
	}
	defer client.Close()

	client.RegisterSQLMigrations(cms.GetMigrationsFS())
	if err := client.Migrate(ctx); err != nil {
		return admin.CMSOptions{}, err
	}

	cmsCfg := cms.DefaultConfig()
	cmsCfg.DefaultLocale = defaultLocale
	cmsCfg.I18N.Locales = []string{defaultLocale}
	cmsCfg.I18N.RequireTranslations = false
	cmsCfg.Activity.Enabled = true
	cmsCfg.Features = cms.Features{
		Widgets:      true,
		Themes:       true,
		Versioning:   true,
		Logger:       true,
		Shortcodes:   false,
		Activity:     true,
		MediaLibrary: false,
	}

	profileName := "primary"
	cmsCfg.Storage.Provider = profileName
	cmsCfg.Storage.Profiles = []storage.Profile{
		{
			Name:     profileName,
			Provider: "bun",
			Default:  true,
			Config: storage.Config{
				Name:   "cms",
				Driver: "sqlite3",
				DSN:    resolvedDSN,
			},
		},
	}

	module, err := cms.New(cmsCfg)
	if err != nil {
		return admin.CMSOptions{}, err
	}

	return admin.CMSOptions{Container: admin.NewGoCMSContainerAdapter(module)}, nil
}

func registerSQLiteDrivers(names ...string) {
	for _, name := range names {
		registered := false
		for _, drv := range sql.Drivers() {
			if drv == name {
				registered = true
				break
			}
		}
		if registered {
			continue
		}
		sql.Register(name, sqliteshim.Driver())
	}
}

func defaultCMSDSN() string {
	path := filepath.Join(os.TempDir(), "go-admin-cms.db")
	return "file:" + path + "?cache=shared&_fk=1"
}
