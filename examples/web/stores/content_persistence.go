package stores

import (
	"context"
	"database/sql"
	"flag"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing/fstest"
	"time"

	cms "github.com/goliatone/go-cms"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

// contentConfig satisfies the go-persistence-bun Config interface.
type contentConfig struct {
	driver      string
	server      string
	pingTimeout time.Duration
}

func (c contentConfig) GetDebug() bool    { return false }
func (c contentConfig) GetDriver() string { return c.driver }
func (c contentConfig) GetServer() string { return c.server }
func (c contentConfig) GetPingTimeout() time.Duration {
	if c.pingTimeout <= 0 {
		return 5 * time.Second
	}
	return c.pingTimeout
}

func (c contentConfig) GetOtelIdentifier() string { return "" }

// ResolveContentDSN returns the SQLite DSN for content persistence. It checks
// CONTENT_DATABASE_DSN first, then CMS_DATABASE_DSN, and finally falls back
// to a shared temp-file path to keep parity with the CMS/users examples.
func ResolveContentDSN() string {
	if env := strings.TrimSpace(os.Getenv("CONTENT_DATABASE_DSN")); env != "" {
		return env
	}
	if env := strings.TrimSpace(os.Getenv("CMS_DATABASE_DSN")); env != "" {
		return env
	}
	return defaultContentDSN()
}

// SetupContentDatabase opens a SQLite connection, applies the content
// migrations, and returns a Bun DB handle.
func SetupContentDatabase(ctx context.Context, dsn string, opts ...persistence.ClientOption) (*bun.DB, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	resolvedDSN := strings.TrimSpace(dsn)
	if resolvedDSN == "" {
		resolvedDSN = ResolveContentDSN()
	}

	registerSQLiteDrivers("sqlite3", sqliteshim.ShimName)

	sqlDB, err := sql.Open("sqlite3", resolvedDSN)
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)

	client, err := persistence.New(contentConfig{
		driver:      "sqlite3",
		server:      resolvedDSN,
		pingTimeout: 5 * time.Second,
	}, sqlDB, sqlitedialect.New(), opts...)
	if err != nil {
		return nil, err
	}
	registerCMSMigrations(client)
	if err := client.Migrate(ctx); err != nil {
		return nil, err
	}

	if err := applyContentOverlay(ctx, client.DB()); err != nil {
		return nil, err
	}

	return client.DB(), nil
}

func registerCMSMigrations(client *persistence.Client) {
	if client == nil {
		return
	}
	if fsys, err := fs.Sub(cms.GetMigrationsFS(), "data/sql/migrations"); err == nil {
		client.RegisterSQLMigrations(SanitizeSQLiteMigrations(fsys))
		return
	}
	client.RegisterSQLMigrations(SanitizeSQLiteMigrations(cms.GetMigrationsFS()))
}

func applyContentOverlay(ctx context.Context, db *bun.DB) error {
	if db == nil {
		return nil
	}
	_, err := db.ExecContext(ctx, `
DROP VIEW IF EXISTS admin_page_records;
CREATE VIEW admin_page_records AS
SELECT
    p.id                   AS id,
    p.content_id           AS content_id,
    p.parent_id            AS parent_id,
    p.template_id          AS template_id,
    p.slug                 AS slug,
    p.status               AS status,
    COALESCE(
        pt.path,
        json_extract(ct.content, '$.path'),
        json_extract(ct.content, '$.data.path')
    ) AS path,
    pt.title               AS title,
    COALESCE(l.code, '')   AS locale,
    pt.locale_id           AS locale_id,
    pt.translation_group_id AS translation_group_id,
    COALESCE(
        pt.seo_title,
        json_extract(ct.content, '$.markdown.frontmatter.seo.title'),
        json_extract(ct.content, '$.markdown.custom.seo.title'),
        json_extract(ct.content, '$.markdown.frontmatter.meta_title'),
        json_extract(ct.content, '$.meta_title'),
        json_extract(ct.content, '$.seo.title'),
        json_extract(ct.content, '$.meta_title'),
        json_extract(ct.content, '$.data.seo.title'),
        json_extract(ct.content, '$.data.meta_title')
    ) AS meta_title,
    COALESCE(
        pt.seo_description,
        json_extract(ct.content, '$.markdown.frontmatter.seo.description'),
        json_extract(ct.content, '$.markdown.custom.seo.description'),
        json_extract(ct.content, '$.markdown.frontmatter.meta_description'),
        json_extract(ct.content, '$.meta_description'),
        json_extract(ct.content, '$.seo.description'),
        json_extract(ct.content, '$.meta_description'),
        json_extract(ct.content, '$.data.seo.description'),
        json_extract(ct.content, '$.data.meta_description')
    ) AS meta_description,
    COALESCE(
        json_extract(ct.content, '$.markdown.body'),
        json_extract(ct.content, '$.content'),
        json_extract(ct.content, '$.data.content')
    ) AS content,
    COALESCE(
        json_extract(ct.content, '$.markdown.frontmatter.tags'),
        json_extract(ct.content, '$.tags'),
        json_extract(ct.content, '$.data.tags')
    ) AS tags,
    p.published_at         AS published_at,
    p.created_at           AS created_at,
    p.updated_at           AS updated_at,
    pt.summary             AS summary,
    COALESCE(
        pt.path,
        json_extract(ct.content, '$.preview_url'),
        json_extract(ct.content, '$.path'),
        json_extract(ct.content, '$.data.path')
    ) AS preview_url
FROM page_translations AS pt
         JOIN pages AS p ON p.id = pt.page_id
         LEFT JOIN contents AS c ON c.id = p.content_id
         LEFT JOIN content_types AS t ON t.id = c.content_type_id
         LEFT JOIN content_translations AS ct ON ct.content_id = p.content_id AND ct.locale_id = pt.locale_id
         LEFT JOIN locales AS l ON l.id = pt.locale_id
WHERE LOWER(COALESCE(
              t.name,
              json_extract(ct.content, '$.content_type'),
              json_extract(ct.content, '$.data.content_type'),
              json_extract(ct.content, '$.type')
          )) = 'page';

DROP VIEW IF EXISTS admin_post_records;
CREATE VIEW admin_post_records AS
SELECT
    c.id                                                AS id,
    c.slug                                              AS slug,
    c.status                                            AS status,
    ct.title                                            AS title,
    l.code                                              AS locale,
    ct.translation_group_id                             AS translation_group_id,
    ct.summary                                          AS excerpt,
    COALESCE(
        json_extract(ct.content, '$.markdown.body'),
        json_extract(ct.content, '$.content'),
        json_extract(ct.content, '$.data.content')
    ) AS content,
    COALESCE(
        json_extract(ct.content, '$.markdown.frontmatter.category'),
        json_extract(ct.content, '$.category'),
        json_extract(ct.content, '$.data.category')
    ) AS category,
    COALESCE(
        json_extract(ct.content, '$.markdown.frontmatter.featured_image'),
        json_extract(ct.content, '$.featured_image'),
        json_extract(ct.content, '$.data.featured_image')
    ) AS featured_image,
    COALESCE(
        json_extract(ct.content, '$.markdown.frontmatter.tags'),
        json_extract(ct.content, '$.tags'),
        json_extract(ct.content, '$.data.tags')
    ) AS tags,
    COALESCE(
        json_extract(ct.content, '$.markdown.frontmatter.seo.title'),
        json_extract(ct.content, '$.markdown.custom.seo.title'),
        json_extract(ct.content, '$.markdown.frontmatter.meta_title'),
        json_extract(ct.content, '$.meta_title'),
        json_extract(ct.content, '$.seo.title'),
        json_extract(ct.content, '$.meta_title'),
        json_extract(ct.content, '$.data.seo.title'),
        json_extract(ct.content, '$.data.meta_title')
    ) AS meta_title,
    COALESCE(
        json_extract(ct.content, '$.markdown.frontmatter.seo.description'),
        json_extract(ct.content, '$.markdown.custom.seo.description'),
        json_extract(ct.content, '$.markdown.frontmatter.meta_description'),
        json_extract(ct.content, '$.meta_description'),
        json_extract(ct.content, '$.seo.description'),
        json_extract(ct.content, '$.meta_description'),
        json_extract(ct.content, '$.data.seo.description'),
        json_extract(ct.content, '$.data.meta_description')
    ) AS meta_description,
    COALESCE(p.published_at, c.published_at, c.publish_at) AS published_at,
    c.created_at                                        AS created_at,
    c.updated_at                                        AS updated_at,
    COALESCE(
        pt.path,
        json_extract(ct.content, '$.path'),
        json_extract(ct.content, '$.data.path')
    ) AS path,
    COALESCE(
        json_extract(ct.content, '$.markdown.frontmatter.author'),
        json_extract(ct.content, '$.author'),
        json_extract(ct.content, '$.data.author')
    ) AS author
FROM contents AS c
         JOIN content_translations AS ct ON ct.content_id = c.id
         JOIN locales AS l ON l.id = ct.locale_id
         LEFT JOIN content_types AS t ON t.id = c.content_type_id
         LEFT JOIN pages AS p ON p.content_id = c.id
         LEFT JOIN page_translations AS pt ON pt.page_id = p.id AND pt.locale_id = ct.locale_id
WHERE LOWER(COALESCE(
              t.name,
              json_extract(ct.content, '$.content_type'),
              json_extract(ct.content, '$.data.content_type'),
              json_extract(ct.content, '$.type')
          )) = 'post';

CREATE TABLE IF NOT EXISTS media (
    id TEXT NOT NULL PRIMARY KEY,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT,
    mime_type TEXT,
    size BIGINT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    uploaded_by TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS media_filename_idx ON media(filename);
CREATE INDEX IF NOT EXISTS media_type_idx ON media(type);
`)
	return err
}

func SanitizeSQLiteMigrations(src fs.FS) fs.FS {
	if src == nil {
		return src
	}
	out := fstest.MapFS{}
	_ = fs.WalkDir(src, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		data, readErr := fs.ReadFile(src, path)
		if readErr != nil {
			return nil
		}
		content := string(data)
		if strings.Contains(path, "20250209000000_menu_navigation_enhancements.up.sql") {
			content = `
ALTER TABLE menu_items ADD COLUMN type TEXT NOT NULL DEFAULT 'item';
ALTER TABLE menu_items ADD COLUMN collapsible BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE menu_items ADD COLUMN collapsed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE menu_items ADD COLUMN metadata JSON NOT NULL DEFAULT '{}';
ALTER TABLE menu_items ADD COLUMN icon TEXT;
ALTER TABLE menu_items ADD COLUMN badge JSON;
ALTER TABLE menu_items ADD COLUMN permissions TEXT;
ALTER TABLE menu_items ADD COLUMN classes TEXT;
ALTER TABLE menu_items ADD COLUMN styles JSON;

--bun:split

ALTER TABLE menu_item_translations ADD COLUMN label_key TEXT;
ALTER TABLE menu_item_translations ADD COLUMN group_title TEXT;
ALTER TABLE menu_item_translations ADD COLUMN group_title_key TEXT;
`
		}
		if strings.Contains(path, "20250301000000_menu_item_canonical_dedupe.up.sql") {
			content = `
ALTER TABLE menu_items ADD COLUMN canonical_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_menu_canonical_key
    ON menu_items(menu_id, canonical_key)
    WHERE canonical_key IS NOT NULL;
`
		}
		content = strings.ReplaceAll(content, "::jsonb", "")
		content = strings.ReplaceAll(content, "JSONB", "JSON")
		content = strings.ReplaceAll(content, "TEXT[]", "TEXT")
		out[path] = &fstest.MapFile{
			Data: []byte(content),
			Mode: 0o644,
		}
		return nil
	})
	if len(out) == 0 {
		return src
	}
	return out
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

func defaultContentDSN() string {
	// Tests should not share a stable on-disk DB (cross-test contamination).
	if flag.Lookup("test.v") != nil {
		if f, err := os.CreateTemp("", "go-admin-content-*.db"); err == nil {
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
