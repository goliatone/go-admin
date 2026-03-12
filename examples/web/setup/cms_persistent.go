package setup

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	cms "github.com/goliatone/go-cms"
	"github.com/goliatone/go-cms/pkg/storage"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

// persistentConfig satisfies the go-persistence-bun Config interface.
type persistentConfig struct {
	driver      string
	server      string
	pingTimeout time.Duration
}

var cmsTestLogs = flag.Bool("cms-test-logs", false, "enable go-cms runtime logs during tests")

const defaultContentScopeID = "00000000-0000-0000-0000-000000000001"

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
// via CONTENT_DATABASE_DSN (preferred) or CMS_DATABASE_DSN to keep env parity with the
// existing example.
func SetupPersistentCMS(ctx context.Context, defaultLocale, dsn string) (admin.CMSOptions, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if strings.TrimSpace(defaultLocale) == "" {
		defaultLocale = "en"
	}

	resolvedDSN := resolveCMSDSN(dsn)

	RegisterSeedModels()
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

	client.RegisterSQLMigrations(stores.SanitizeSQLiteMigrations(resolveCMSMigrationsFS()))
	client.RegisterSQLMigrations(stores.SanitizeSQLiteMigrations(coreadmin.GetTranslationFlowSQLiteMigrationsFS()))
	if err := client.Migrate(ctx); err != nil {
		return admin.CMSOptions{}, err
	}
	if err := ensureLegacyContentScopeSchema(ctx, client.DB()); err != nil {
		return admin.CMSOptions{}, fmt.Errorf("repair content scope schema: %w", err)
	}

	if err := stores.EnsureContentOverlay(ctx, client.DB()); err != nil {
		return admin.CMSOptions{}, fmt.Errorf("apply content overlay: %w", err)
	}

	runtimeCfg := runtimeConfig()
	seedCfg := ResolveSeedConfig(runtimeCfg.Seeds, isProductionEnv())
	if err := LoadSeedGroup(ctx, client, seedCfg, SeedGroupCMS); err != nil {
		return admin.CMSOptions{}, fmt.Errorf("load cms seeds: %w", err)
	}
	seedRefs, err := seedCMSPrereqs(ctx, client.DB(), defaultLocale)
	if err != nil {
		return admin.CMSOptions{}, fmt.Errorf("seed cms prereqs: %w", err)
	}
	if err := ensureRequiredSeedContentTypes(ctx, client.DB(), seedRefs); err != nil {
		return admin.CMSOptions{}, fmt.Errorf("validate required cms content types: %w", err)
	}

	cmsCfg := cms.DefaultConfig()
	cmsCfg.DefaultLocale = defaultLocale
	cmsCfg.I18N.Locales = translationSeedLocales(defaultLocale)
	cmsCfg.I18N.Enabled = true
	cmsCfg.I18N.RequireTranslations = false
	cmsCfg.Activity.Enabled = true
	cmsCfg.Features = cms.Features{
		Widgets:      true,
		Themes:       true,
		Versioning:   true,
		Scheduling:   true,
		Logger:       shouldEnableCMSRuntimeLogs(),
		Shortcodes:   false,
		Activity:     true,
		MediaLibrary: false,
	}
	cmsCfg.Features.Markdown = true
	cmsCfg.Markdown.Enabled = true
	cmsCfg.Markdown.DefaultLocale = defaultLocale
	cmsCfg.Markdown.Locales = translationSeedLocales(defaultLocale)
	contentDir, err := os.MkdirTemp("", "cms-content-*")
	if err != nil {
		return admin.CMSOptions{}, err
	}
	cmsCfg.Markdown.ContentDir = contentDir
	cmsCfg.Retention = cms.RetentionConfig{
		Content: 5,
		Pages:   5,
	}
	cmsCfg.Workflow.Definitions = []cms.WorkflowDefinitionConfig{
		{
			Entity:      "page",
			Description: "Page workflow",
			States: []cms.WorkflowStateConfig{
				{Name: "draft", Description: "Draft content", Initial: true},
				{Name: "pending_approval", Description: "Pending approval"},
				{Name: "scheduled", Description: "Scheduled"},
				{Name: "published", Description: "Published"},
				{Name: "archived", Description: "Archived"},
			},
			Transitions: []cms.WorkflowTransitionConfig{
				{Name: "request_approval", Description: "Submit for review", From: "draft", To: "pending_approval"},
				{Name: "approve", Description: "Approve content", From: "pending_approval", To: "published"},
				{Name: "reject", Description: "Reject content", From: "pending_approval", To: "draft"},
				{Name: "publish", Description: "Publish content", From: "draft", To: "published"},
				{Name: "schedule", Description: "Schedule content", From: "draft", To: "scheduled"},
				{Name: "publish", Description: "Publish scheduled content", From: "scheduled", To: "published"},
				{Name: "cancel_schedule", Description: "Cancel scheduled publish", From: "scheduled", To: "draft"},
				{Name: "unpublish", Description: "Move back to draft", From: "published", To: "draft"},
				{Name: "archive", Description: "Archive content", From: "draft", To: "archived"},
				{Name: "archive", Description: "Archive content", From: "published", To: "archived"},
				{Name: "restore", Description: "Restore from archive", From: "archived", To: "draft"},
			},
		},
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

	adapter := admin.NewGoCMSContainerAdapter(module)
	if adapter != nil {
		if err := migrateDashboardWidgetDefinitions(ctx, client.DB(), adapter.WidgetService()); err != nil {
			return admin.CMSOptions{}, err
		}
	}
	contentSvc := admin.CMSContentService(nil)
	if module != nil && module.Content() != nil {
		contentSvc = newGoCMSContentBridge(module.Content(), module.Blocks(), module.Pages(), seedRefs.TemplateID, map[string]uuid.UUID{
			"page": seedRefs.PageContentTypeID,
			"post": seedRefs.PostContentTypeID,
			"news": seedRefs.NewsContentTypeID,
		}, adapter.ContentTypeService())
	}
	if contentSvc == nil && adapter != nil && adapter.ContentService() != nil {
		contentSvc = adapter.ContentService()
	}

	if contentSvc == nil {
		return admin.CMSOptions{}, fmt.Errorf("go-cms content service unavailable")
	}

	widgetSvc := admin.CMSWidgetService(nil)
	menuSvc := admin.CMSMenuService(nil)
	if adapter != nil {
		widgetSvc = adapter.WidgetService()
		menuSvc = adapter.MenuService()
	}

	if err := seedCMSBlockDefinitions(ctx, contentSvc, defaultLocale); err != nil {
		return admin.CMSOptions{}, fmt.Errorf("seed cms block definitions: %w", err)
	}
	if seedCfg.Enabled {
		if menuSvc != nil {
			if err := seedCMSDemoContent(ctx, client.DB(), nil, contentSvc, menuSvc, seedRefs, defaultLocale); err != nil {
				return admin.CMSOptions{}, fmt.Errorf("seed cms demo content: %w", err)
			}
			if err := validateTranslationSeedFixtureCoverage(ctx, client.DB()); err != nil {
				return admin.CMSOptions{}, fmt.Errorf("validate translation seed fixtures: %w", err)
			}
		}
	}
	if _, err := backfillContentTranslationPathsFromPages(ctx, client.DB()); err != nil {
		return admin.CMSOptions{}, fmt.Errorf("backfill content translation paths from pages: %w", err)
	}

	contentTypeSvc := admin.CMSContentTypeService(nil)
	if adapter != nil {
		contentTypeSvc = adapter.ContentTypeService()
	}
	if contentTypeSvc == nil {
		if svc, ok := contentSvc.(admin.CMSContentTypeService); ok {
			contentTypeSvc = svc
		}
	}

	container := &cmsContainerAdapter{
		widgetSvc:      widgetSvc,
		menuSvc:        menuSvc,
		contentSvc:     contentSvc,
		contentTypeSvc: contentTypeSvc,
	}

	return admin.CMSOptions{Container: container}, nil
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
	// Tests should not share a stable on-disk DB (cross-test contamination).
	if flag.Lookup("test.v") != nil {
		if f, err := os.CreateTemp("", "go-admin-cms-*.db"); err == nil {
			_ = f.Close()
			return "file:" + f.Name() + "?cache=shared&_fk=1"
		}
	}

	// Prefer a stable on-disk database in the example directory so IDs remain
	// consistent across restarts (unlike per-run OS temp dirs).
	if _, currentFile, _, ok := runtime.Caller(0); ok {
		exampleDir := filepath.Clean(filepath.Join(filepath.Dir(currentFile), ".."))
		dbPath := filepath.Join(exampleDir, "admin.db")
		return "file:" + dbPath + "?cache=shared&_fk=1"
	}
	return "file:" + filepath.Join(os.TempDir(), "go-admin-cms.db") + "?cache=shared&_fk=1"
}

func shouldEnableCMSRuntimeLogs() bool {
	runtime := runtimeConfig()
	envOverride := false
	hasEnvOverride := false
	if runtime.CMSRuntimeLogs != nil {
		envOverride = *runtime.CMSRuntimeLogs
		hasEnvOverride = true
	}
	isTest := flag.Lookup("test.v") != nil
	testFlag := cmsTestLogs != nil && *cmsTestLogs
	return shouldEnableCMSRuntimeLogsWith(isTest, testFlag, envOverride, hasEnvOverride)
}

func shouldEnableCMSRuntimeLogsWith(isTest bool, testFlag bool, envOverride bool, hasEnvOverride bool) bool {
	if hasEnvOverride {
		return envOverride
	}
	if isTest {
		return testFlag
	}
	return true
}

func canonicalCMSPath(path, fallback string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		path = strings.TrimSpace(fallback)
	}
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + strings.TrimLeft(path, "/")
	}
	return path
}

func resolveCMSDSN(input string) string {
	if trimmed := strings.TrimSpace(input); trimmed != "" {
		return trimmed
	}
	runtime := runtimeConfig()
	if value := strings.TrimSpace(runtime.Databases.ContentDSN); value != "" {
		return value
	}
	if value := strings.TrimSpace(runtime.Databases.CMSDSN); value != "" {
		return value
	}
	return defaultCMSDSN()
}

func ensureLegacyContentScopeSchema(ctx context.Context, db *bun.DB) error {
	if db == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := ensureContentScopeLookupTables(ctx, db); err != nil {
		return err
	}

	for _, table := range []string{
		"content_types",
		"contents",
		"pages",
		"menus",
		"menu_items",
		"block_definitions",
		"menu_view_profiles",
		"menu_location_bindings",
	} {
		if err := ensureEnvironmentIDColumn(ctx, db, table); err != nil {
			return err
		}
		if err := backfillEnvironmentIDFromChannel(ctx, db, table); err != nil {
			return err
		}
	}

	for _, stmt := range []struct {
		table string
		sql   string
	}{
		{
			table: "content_types",
			sql: `UPDATE content_types
		 SET environment_id = ?
		 WHERE environment_id IS NULL OR TRIM(environment_id) = ''`,
		},
		{
			table: "contents",
			sql: `UPDATE contents
		 SET environment_id = (
		     SELECT ct.environment_id
		     FROM content_types AS ct
		     WHERE ct.id = contents.content_type_id
		 )
		 WHERE (environment_id IS NULL OR TRIM(environment_id) = '')
		   AND content_type_id IS NOT NULL`,
		},
		{
			table: "contents",
			sql: `UPDATE contents
		 SET environment_id = ?
		 WHERE environment_id IS NULL OR TRIM(environment_id) = ''`,
		},
		{
			table: "pages",
			sql: `UPDATE pages
		 SET environment_id = (
		     SELECT c.environment_id
		     FROM contents AS c
		     WHERE c.id = pages.content_id
		 )
		 WHERE (environment_id IS NULL OR TRIM(environment_id) = '')
		   AND content_id IS NOT NULL`,
		},
		{
			table: "pages",
			sql: `UPDATE pages
		 SET environment_id = ?
		 WHERE environment_id IS NULL OR TRIM(environment_id) = ''`,
		},
		{
			table: "menus",
			sql: `UPDATE menus
		 SET environment_id = ?
		 WHERE environment_id IS NULL OR TRIM(environment_id) = ''`,
		},
		{
			table: "menu_items",
			sql: `UPDATE menu_items
		 SET environment_id = (
		     SELECT m.environment_id
		     FROM menus AS m
		     WHERE m.id = menu_items.menu_id
		 )
		 WHERE (environment_id IS NULL OR TRIM(environment_id) = '')
		   AND menu_id IS NOT NULL`,
		},
		{
			table: "menu_items",
			sql: `UPDATE menu_items
		 SET environment_id = ?
		 WHERE environment_id IS NULL OR TRIM(environment_id) = ''`,
		},
		{
			table: "block_definitions",
			sql: `UPDATE block_definitions
		 SET environment_id = ?
		 WHERE environment_id IS NULL OR TRIM(environment_id) = ''`,
		},
		{
			table: "menu_view_profiles",
			sql: `UPDATE menu_view_profiles
		 SET environment_id = ?
		 WHERE environment_id IS NULL OR TRIM(environment_id) = ''`,
		},
		{
			table: "menu_location_bindings",
			sql: `UPDATE menu_location_bindings
		 SET environment_id = ?
		 WHERE environment_id IS NULL OR TRIM(environment_id) = ''`,
		},
	} {
		if err := execIfTableExists(ctx, db, stmt.table, stmt.sql, defaultContentScopeID); err != nil {
			return err
		}
	}

	if tableExists, err := sqliteTableExists(ctx, db, "menu_view_profiles"); err != nil {
		return err
	} else if tableExists {
		if _, err := db.ExecContext(ctx, `
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_view_profiles_env_code
ON menu_view_profiles(environment_id, code);`); err != nil {
			return err
		}
	}

	if tableExists, err := sqliteTableExists(ctx, db, "menu_location_bindings"); err != nil {
		return err
	} else if tableExists {
		if _, err := db.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS idx_menu_location_bindings_env_location
ON menu_location_bindings(environment_id, location);`); err != nil {
			return err
		}
		if _, err := db.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS idx_menu_location_bindings_env_menu
ON menu_location_bindings(environment_id, menu_code);`); err != nil {
			return err
		}
		if _, err := db.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS idx_menu_location_bindings_env_profile
ON menu_location_bindings(environment_id, view_profile_code);`); err != nil {
			return err
		}
		if _, err := db.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS idx_menu_location_bindings_priority
ON menu_location_bindings(environment_id, location, priority DESC);`); err != nil {
			return err
		}
		if _, err := db.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS idx_menu_location_bindings_locale
ON menu_location_bindings(environment_id, location, locale);`); err != nil {
			return err
		}
	}

	return nil
}

func ensureContentScopeLookupTables(ctx context.Context, db *bun.DB) error {
	for _, stmt := range []string{
		`CREATE TABLE IF NOT EXISTS environments (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_environments_default ON environments(is_default) WHERE is_default = 1;`,
		`INSERT OR IGNORE INTO environments (id, key, name, description, is_active, is_default, created_at, updated_at)
VALUES (?, 'default', 'Default', 'Default environment', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
		`CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_default ON channels(is_default) WHERE is_default = 1;`,
		`INSERT OR REPLACE INTO channels (id, key, name, description, is_active, is_default, created_at, updated_at, deleted_at)
SELECT id, key, name, description, is_active, is_default, created_at, updated_at, deleted_at
FROM environments;`,
		`CREATE TRIGGER IF NOT EXISTS trg_channels_sync_insert
AFTER INSERT ON environments
BEGIN
    INSERT INTO channels (id, key, name, description, is_active, is_default, created_at, updated_at, deleted_at)
    VALUES (NEW.id, NEW.key, NEW.name, NEW.description, NEW.is_active, NEW.is_default, NEW.created_at, NEW.updated_at, NEW.deleted_at)
    ON CONFLICT(id) DO UPDATE SET
        key = excluded.key,
        name = excluded.name,
        description = excluded.description,
        is_active = excluded.is_active,
        is_default = excluded.is_default,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at;
END;`,
		`CREATE TRIGGER IF NOT EXISTS trg_channels_sync_update
AFTER UPDATE ON environments
BEGIN
    INSERT INTO channels (id, key, name, description, is_active, is_default, created_at, updated_at, deleted_at)
    VALUES (NEW.id, NEW.key, NEW.name, NEW.description, NEW.is_active, NEW.is_default, NEW.created_at, NEW.updated_at, NEW.deleted_at)
    ON CONFLICT(id) DO UPDATE SET
        key = excluded.key,
        name = excluded.name,
        description = excluded.description,
        is_active = excluded.is_active,
        is_default = excluded.is_default,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at;
END;`,
		`CREATE TRIGGER IF NOT EXISTS trg_channels_sync_delete
AFTER DELETE ON environments
BEGIN
    DELETE FROM channels WHERE id = OLD.id;
END;`,
	} {
		args := []any{}
		if strings.Contains(stmt, "INSERT OR IGNORE INTO environments") {
			args = append(args, defaultContentScopeID)
		}
		if _, err := db.ExecContext(ctx, stmt, args...); err != nil {
			return err
		}
	}
	return nil
}

func ensureEnvironmentIDColumn(ctx context.Context, db *bun.DB, table string) error {
	tableExists, err := sqliteTableExists(ctx, db, table)
	if err != nil || !tableExists {
		return err
	}
	hasEnvironmentID, err := sqliteColumnExists(ctx, db, table, "environment_id")
	if err != nil || hasEnvironmentID {
		return err
	}
	_, err = db.ExecContext(
		ctx,
		fmt.Sprintf(
			`ALTER TABLE %s ADD COLUMN environment_id TEXT NOT NULL DEFAULT '%s'`,
			quoteSQLiteIdentifier(table),
			defaultContentScopeID,
		),
	)
	return err
}

func backfillEnvironmentIDFromChannel(ctx context.Context, db *bun.DB, table string) error {
	tableExists, err := sqliteTableExists(ctx, db, table)
	if err != nil || !tableExists {
		return err
	}
	hasEnvironmentID, err := sqliteColumnExists(ctx, db, table, "environment_id")
	if err != nil || !hasEnvironmentID {
		return err
	}
	hasChannelID, err := sqliteColumnExists(ctx, db, table, "channel_id")
	if err != nil || !hasChannelID {
		return err
	}
	_, err = db.ExecContext(
		ctx,
		fmt.Sprintf(
			`UPDATE %s
SET environment_id = channel_id
WHERE (environment_id IS NULL OR TRIM(environment_id) = '')
  AND channel_id IS NOT NULL
  AND TRIM(channel_id) != ''`,
			quoteSQLiteIdentifier(table),
		),
	)
	return err
}

func sqliteTableExists(ctx context.Context, db *bun.DB, table string) (bool, error) {
	if db == nil {
		return false, nil
	}
	var exists bool
	if err := db.NewSelect().
		ColumnExpr("EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND LOWER(name) = LOWER(?))", table).
		Scan(ctx, &exists); err != nil {
		return false, err
	}
	return exists, nil
}

func sqliteColumnExists(ctx context.Context, db *bun.DB, table, column string) (bool, error) {
	if db == nil {
		return false, nil
	}
	rows, err := db.QueryContext(ctx, fmt.Sprintf("PRAGMA table_info(%s)", quoteSQLiteIdentifier(table)))
	if err != nil {
		return false, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			cid        int
			name       string
			columnType string
			notNull    int
			defaultVal any
			primaryKey int
		)
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultVal, &primaryKey); err != nil {
			return false, err
		}
		if strings.EqualFold(strings.TrimSpace(name), strings.TrimSpace(column)) {
			return true, nil
		}
	}
	if err := rows.Err(); err != nil {
		return false, err
	}
	return false, nil
}

func quoteSQLiteIdentifier(value string) string {
	return `"` + strings.ReplaceAll(strings.TrimSpace(value), `"`, `""`) + `"`
}

func execIfTableExists(ctx context.Context, db *bun.DB, table, query string, args ...any) error {
	tableExists, err := sqliteTableExists(ctx, db, table)
	if err != nil || !tableExists {
		return err
	}
	_, err = db.ExecContext(ctx, query, args...)
	return err
}

type contentTranslationPathBackfillRow struct {
	ContentID string `bun:"content_id"`
	LocaleID  string `bun:"locale_id"`
	Content   string `bun:"content"`
	Path      string `bun:"path"`
}

// backfillContentTranslationPathsFromPages ensures page translation paths are
// projected into content_translations.content.path for delivery/runtime readers.
func backfillContentTranslationPathsFromPages(ctx context.Context, db *bun.DB) (int, error) {
	if db == nil {
		return 0, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	rows := []contentTranslationPathBackfillRow{}
	query := `
SELECT
	ct.content_id AS content_id,
	ct.locale_id AS locale_id,
	COALESCE(ct.content, '') AS content,
	pt.path AS path
FROM content_translations ct
JOIN pages p ON p.content_id = ct.content_id
JOIN page_translations pt ON pt.page_id = p.id AND pt.locale_id = ct.locale_id
WHERE TRIM(COALESCE(pt.path, '')) <> ''`
	if err := db.NewRaw(query).Scan(ctx, &rows); err != nil {
		return 0, err
	}

	updated := 0
	for _, row := range rows {
		path := strings.TrimSpace(canonicalCMSPath(row.Path, ""))
		if path == "" {
			continue
		}

		payload := map[string]any{}
		raw := strings.TrimSpace(row.Content)
		if raw != "" {
			if err := json.Unmarshal([]byte(raw), &payload); err != nil {
				return updated, fmt.Errorf("decode content translation %s/%s: %w", row.ContentID, row.LocaleID, err)
			}
		}
		existingRaw := strings.TrimSpace(asString(payload["path"], ""))
		existingCanonical := strings.TrimSpace(canonicalCMSPath(existingRaw, ""))
		if existingCanonical != "" {
			if existingCanonical == existingRaw {
				continue
			}
			payload["path"] = existingCanonical
		} else {
			payload["path"] = path
		}
		encoded, err := json.Marshal(payload)
		if err != nil {
			return updated, fmt.Errorf("encode content translation %s/%s: %w", row.ContentID, row.LocaleID, err)
		}
		result, err := db.ExecContext(
			ctx,
			`UPDATE content_translations
			 SET content = ?, updated_at = CURRENT_TIMESTAMP
			 WHERE content_id = ? AND locale_id = ?`,
			string(encoded),
			row.ContentID,
			row.LocaleID,
		)
		if err != nil {
			return updated, err
		}
		if result == nil {
			continue
		}
		affected, err := result.RowsAffected()
		if err != nil {
			return updated, err
		}
		updated += int(affected)
	}

	return updated, nil
}

func seedCMSBlockDefinitions(ctx context.Context, svc admin.CMSContentService, locale string) error {
	if svc == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	locale = strings.TrimSpace(locale)
	if locale == "" {
		locale = "en"
	}
	seedEnvironment := "default"

	defs := []admin.CMSBlockDefinition{
		{
			ID:          "hero",
			Name:        "Hero",
			Type:        "hero",
			Slug:        "hero",
			Status:      "active",
			Environment: seedEnvironment,
			Category:    "layout",
			Schema: map[string]any{
				"$schema":  "https://json-schema.org/draft/2020-12/schema",
				"type":     "object",
				"required": []string{"_type", "headline"},
				"x-formgen": map[string]any{
					"label":     "Hero",
					"icon":      "star",
					"collapsed": true,
				},
				"properties": map[string]any{
					"_type": map[string]any{
						"const": "hero",
						"x-formgen": map[string]any{
							"readonly": true,
						},
					},
					"headline":    map[string]any{"type": "string"},
					"subheadline": map[string]any{"type": "string"},
					"cta_label":   map[string]any{"type": "string"},
					"cta_url":     map[string]any{"type": "string"},
				},
			},
		},
		{
			ID:          "rich_text",
			Name:        "Rich Text",
			Type:        "rich_text",
			Slug:        "rich_text",
			Status:      "active",
			Environment: seedEnvironment,
			Category:    "content",
			Schema: map[string]any{
				"$schema":  "https://json-schema.org/draft/2020-12/schema",
				"type":     "object",
				"required": []string{"_type", "body"},
				"x-formgen": map[string]any{
					"label": "Rich Text",
					"icon":  "text",
				},
				"properties": map[string]any{
					"_type": map[string]any{
						"const": "rich_text",
						"x-formgen": map[string]any{
							"readonly": true,
						},
					},
					"body": map[string]any{
						"type": "string",
						"x-formgen": map[string]any{
							"widget": "wysiwyg",
						},
					},
				},
			},
		},
	}

	existingByKey := map[string]admin.CMSBlockDefinition{}
	rebuildExistingIndex := func() error {
		existing, err := svc.BlockDefinitions(ctx)
		if err != nil {
			return err
		}
		clear(existingByKey)
		for _, existingDef := range existing {
			for _, key := range blockDefinitionLookupKeys(existingDef.Environment, existingDef.ID, existingDef.Name, existingDef.Slug, existingDef.Type) {
				existingByKey[key] = existingDef
			}
		}
		return nil
	}
	if err := rebuildExistingIndex(); err != nil {
		return err
	}

	lookupExisting := func(def admin.CMSBlockDefinition) (admin.CMSBlockDefinition, bool) {
		for _, candidate := range blockDefinitionLookupKeys(def.Environment, def.ID, def.Name, def.Slug, def.Type) {
			if found, ok := existingByKey[candidate]; ok {
				return found, true
			}
		}
		return admin.CMSBlockDefinition{}, false
	}

	for _, def := range defs {
		def.Locale = locale
		if existing, ok := lookupExisting(def); ok {
			update := def
			if existing.ID != "" {
				update.ID = existing.ID
			}
			if existing.Name != "" {
				// Keep existing canonical name to avoid backend-specific rename side effects.
				update.Name = existing.Name
			}
			if _, err := svc.UpdateBlockDefinition(ctx, update); err == nil {
				if refreshErr := rebuildExistingIndex(); refreshErr != nil {
					return refreshErr
				}
				continue
			} else {
				lower := strings.ToLower(err.Error())
				if !strings.Contains(lower, "not found") {
					return err
				}
				// Continue with create fallback when update target can't be resolved.
			}
		}
		if _, err := svc.CreateBlockDefinition(ctx, def); err != nil {
			lower := strings.ToLower(err.Error())
			if strings.Contains(lower, "already") || strings.Contains(lower, "exists") {
				if refreshErr := rebuildExistingIndex(); refreshErr != nil {
					return refreshErr
				}
				if existing, ok := lookupExisting(def); ok {
					update := def
					if existing.ID != "" {
						update.ID = existing.ID
					}
					if existing.Name != "" {
						update.Name = existing.Name
					}
					if _, updateErr := svc.UpdateBlockDefinition(ctx, update); updateErr == nil {
						if refreshErr := rebuildExistingIndex(); refreshErr != nil {
							return refreshErr
						}
						continue
					}
				}
				continue
			}
			return err
		}
		if refreshErr := rebuildExistingIndex(); refreshErr != nil {
			return refreshErr
		}
	}

	return nil
}

func blockDefinitionLookupKeys(environment string, keys ...string) []string {
	out := make([]string, 0, len(keys)*4)
	seen := map[string]struct{}{}
	env := strings.ToLower(strings.TrimSpace(environment))
	if env == "" {
		env = "default"
	}
	add := func(raw string) {
		key := strings.ToLower(strings.TrimSpace(raw))
		if key == "" {
			return
		}
		if _, ok := seen[key]; ok {
			return
		}
		seen[key] = struct{}{}
		out = append(out, key)
		if env != "" {
			envKey := env + "::" + key
			if _, ok := seen[envKey]; ok {
				return
			}
			seen[envKey] = struct{}{}
			out = append(out, envKey)
		}
	}
	for _, raw := range keys {
		base := strings.TrimSpace(raw)
		if base == "" {
			continue
		}
		add(base)
		add(strings.ReplaceAll(base, "-", "_"))
		add(strings.ReplaceAll(base, "_", "-"))
	}
	return out
}

func resolveCMSMigrationsFS() fs.FS {
	candidates := []string{
		filepath.Join("..", "go-cms", "data", "sql", "migrations"),
		filepath.Join("..", "..", "go-cms", "data", "sql", "migrations"),
	}
	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			if sqliteDir := filepath.Join(candidate, "sqlite"); dirExists(sqliteDir) {
				return os.DirFS(sqliteDir)
			}
			return os.DirFS(candidate)
		}
	}
	if sub, err := fs.Sub(cms.GetMigrationsFS(), "data/sql/migrations/sqlite"); err == nil {
		return sub
	}
	if sub, err := fs.Sub(cms.GetMigrationsFS(), "data/sql/migrations"); err == nil {
		return sub
	}
	return cms.GetMigrationsFS()
}

func dirExists(path string) bool {
	if info, err := os.Stat(path); err == nil {
		return info.IsDir()
	}
	return false
}

type cmsContainerAdapter struct {
	widgetSvc      admin.CMSWidgetService
	menuSvc        admin.CMSMenuService
	contentSvc     admin.CMSContentService
	contentTypeSvc admin.CMSContentTypeService
}

func (c *cmsContainerAdapter) WidgetService() admin.CMSWidgetService {
	return c.widgetSvc
}

func (c *cmsContainerAdapter) MenuService() admin.CMSMenuService {
	return c.menuSvc
}

func (c *cmsContainerAdapter) ContentService() admin.CMSContentService {
	return c.contentSvc
}

func (c *cmsContainerAdapter) ContentTypeService() admin.CMSContentTypeService {
	return c.contentTypeSvc
}
