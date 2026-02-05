package setup

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	cms "github.com/goliatone/go-cms"
	"github.com/goliatone/go-cms/pkg/storage"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/google/uuid"
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
	if err := client.Migrate(ctx); err != nil {
		return admin.CMSOptions{}, err
	}

	if err := stores.EnsureContentOverlay(ctx, client.DB()); err != nil {
		return admin.CMSOptions{}, fmt.Errorf("apply content overlay: %w", err)
	}

	seedCfg := SeedConfigFromEnv()
	if err := LoadSeedGroup(ctx, client, seedCfg, SeedGroupCMS); err != nil {
		return admin.CMSOptions{}, fmt.Errorf("load cms seeds: %w", err)
	}
	seedRefs := cmsSeedRefs{
		PageContentTypeID: pageContentTypeID,
		PostContentTypeID: postContentTypeID,
		TemplateID:        seedTemplateID,
	}

	cmsCfg := cms.DefaultConfig()
	cmsCfg.DefaultLocale = defaultLocale
	cmsCfg.I18N.Locales = []string{defaultLocale}
	cmsCfg.I18N.Enabled = true
	cmsCfg.I18N.RequireTranslations = false
	cmsCfg.Activity.Enabled = true
	cmsCfg.Features = cms.Features{
		Widgets:      true,
		Themes:       true,
		Versioning:   true,
		Scheduling:   true,
		Logger:       true,
		Shortcodes:   false,
		Activity:     true,
		MediaLibrary: false,
	}
	cmsCfg.Features.Markdown = true
	cmsCfg.Markdown.Enabled = true
	cmsCfg.Markdown.DefaultLocale = defaultLocale
	cmsCfg.Markdown.Locales = []string{defaultLocale}
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
		}, adapter.ContentTypeService())
	}
	if contentSvc == nil && adapter != nil && adapter.ContentService() != nil {
		contentSvc = adapter.ContentService()
	}

	if contentSvc == nil {
		return admin.CMSOptions{}, fmt.Errorf("go-cms content service unavailable")
	}

	if seedCfg.Enabled {
		if err := seedCMSBlockDefinitions(ctx, contentSvc, defaultLocale); err != nil {
			return admin.CMSOptions{}, fmt.Errorf("seed cms block definitions: %w", err)
		}
	}

	widgetSvc := admin.CMSWidgetService(nil)
	menuSvc := admin.CMSMenuService(nil)
	if adapter != nil {
		widgetSvc = adapter.WidgetService()
		menuSvc = adapter.MenuService()
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

func resolveCMSDSN(input string) string {
	if trimmed := strings.TrimSpace(input); trimmed != "" {
		return trimmed
	}
	if env := strings.TrimSpace(os.Getenv("CONTENT_DATABASE_DSN")); env != "" {
		return env
	}
	if env := strings.TrimSpace(os.Getenv("CMS_DATABASE_DSN")); env != "" {
		return env
	}
	return defaultCMSDSN()
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

	defs := []admin.CMSBlockDefinition{
		{
			ID:   "hero",
			Name: "Hero",
			Type: "hero",
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
			ID:   "rich_text",
			Name: "Rich Text",
			Type: "rich_text",
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

	for _, def := range defs {
		def.Locale = locale
		if _, err := svc.CreateBlockDefinition(ctx, def); err != nil {
			lower := strings.ToLower(err.Error())
			if strings.Contains(lower, "already") || strings.Contains(lower, "exists") {
				continue
			}
			return err
		}
	}

	return nil
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
