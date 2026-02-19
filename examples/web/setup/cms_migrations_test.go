package setup

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"testing"
)

// TestPersistentCMSAppliesMigrations ensures go-cms migrations run against a SQLite DSN
// and include the sanitized menu columns required by the example.
func TestPersistentCMSAppliesMigrations(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", strings.ToLower(t.Name()))

	opts, err := SetupPersistentCMS(ctx, "en", dsn)
	if err != nil {
		t.Fatalf("setup persistent cms: %v", err)
	}
	if opts.Container == nil {
		t.Fatalf("expected CMS container")
	}

	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	rows, err := db.QueryContext(ctx, `
SELECT name FROM sqlite_master
WHERE type = 'table' AND name IN (
    'locales','content_types','contents','content_translations',
    'pages','page_translations','menus','menu_items','menu_item_translations',
    'templates','themes'
)
ORDER BY name`)
	if err != nil {
		t.Fatalf("list tables: %v", err)
	}
	defer rows.Close()

	tables := map[string]bool{}
	for rows.Next() {
		var name string
		if scanErr := rows.Scan(&name); scanErr == nil {
			tables[name] = true
		}
	}

	for _, table := range []string{
		"locales", "content_types", "contents", "content_translations",
		"pages", "page_translations", "menus", "menu_items", "menu_item_translations",
		"templates", "themes",
	} {
		if !tables[table] {
			t.Fatalf("expected table %s to exist", table)
		}
	}

	colRows, err := db.QueryContext(ctx, `PRAGMA table_info('menu_items')`)
	if err != nil {
		t.Fatalf("inspect menu_items columns: %v", err)
	}
	defer colRows.Close()

	hasCanonicalKey := false
	for colRows.Next() {
		var cid int
		var name, colType string
		var notNull, pk int
		var defValue sql.NullString
		if scanErr := colRows.Scan(&cid, &name, &colType, &notNull, &defValue, &pk); scanErr != nil {
			t.Fatalf("scan column: %v", scanErr)
		}
		_ = cid
		_ = colType
		_ = notNull
		_ = defValue
		_ = pk
		if strings.EqualFold(name, "canonical_key") {
			hasCanonicalKey = true
			break
		}
	}
	if !hasCanonicalKey {
		t.Fatalf("expected canonical_key column from sanitized migrations")
	}
}

func TestPersistentCMSSeedsRequiredContentTypes(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", strings.ToLower(t.Name()))

	opts, err := SetupPersistentCMS(ctx, "en", dsn)
	if err != nil {
		t.Fatalf("setup persistent cms: %v", err)
	}
	if opts.Container == nil {
		t.Fatalf("expected CMS container")
	}

	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	required := []struct {
		name  string
		slug  string
		panel string
	}{
		{name: "page", slug: "page", panel: "pages"},
		{name: "post", slug: "post", panel: "posts"},
	}

	for _, item := range required {
		var slug string
		var status string
		var capabilities string
		var schema string
		err := db.QueryRowContext(ctx, `
SELECT COALESCE(slug, ''), COALESCE(status, ''), COALESCE(CAST(capabilities AS TEXT), ''), COALESCE(CAST(schema AS TEXT), '')
FROM content_types
WHERE name = ?`, item.name).Scan(&slug, &status, &capabilities, &schema)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				t.Fatalf("required content type %s missing", item.name)
			}
			t.Fatalf("query content type %s: %v", item.name, err)
		}
		if !strings.EqualFold(strings.TrimSpace(slug), item.slug) {
			t.Fatalf("expected %s slug %q, got %q", item.name, item.slug, slug)
		}
		if !strings.EqualFold(strings.TrimSpace(status), "active") {
			t.Fatalf("expected %s status active, got %q", item.name, status)
		}
		if strings.TrimSpace(schema) == "" || strings.TrimSpace(schema) == "{}" {
			t.Fatalf("expected %s schema to be seeded", item.name)
		}
		if strings.TrimSpace(capabilities) == "" || strings.TrimSpace(capabilities) == "{}" {
			t.Fatalf("expected %s capabilities to be seeded", item.name)
		}
		if !strings.Contains(strings.ToLower(capabilities), `"panel_slug":"`+item.panel+`"`) {
			t.Fatalf("expected %s capabilities panel_slug=%s, got %s", item.name, item.panel, capabilities)
		}
	}
}

func TestPersistentCMSSeedsCoreBlockDefinitions(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", strings.ToLower(t.Name()))

	opts, err := SetupPersistentCMS(ctx, "en", dsn)
	if err != nil {
		t.Fatalf("setup persistent cms: %v", err)
	}
	if opts.Container == nil || opts.Container.ContentService() == nil {
		t.Fatalf("expected CMS content service")
	}

	defs, err := opts.Container.ContentService().BlockDefinitions(ctx)
	if err != nil {
		t.Fatalf("list block definitions: %v", err)
	}

	seenHero := false
	seenRichText := false
	for _, def := range defs {
		id := strings.ToLower(strings.TrimSpace(def.ID))
		switch id {
		case "hero":
			seenHero = true
			if slug := strings.TrimSpace(def.Slug); slug != "hero" {
				t.Fatalf("expected hero slug %q, got %q", "hero", slug)
			}
			if status := strings.ToLower(strings.TrimSpace(def.Status)); status != "active" {
				t.Fatalf("expected hero status active, got %q", def.Status)
			}
		case "rich_text":
			seenRichText = true
			slug := strings.TrimSpace(def.Slug)
			if slug != "rich_text" && slug != "rich-text" {
				t.Fatalf("expected rich_text slug alias, got %q", slug)
			}
			if status := strings.ToLower(strings.TrimSpace(def.Status)); status != "active" {
				t.Fatalf("expected rich_text status active, got %q", def.Status)
			}
		}
	}

	if !seenHero || !seenRichText {
		t.Fatalf("expected seeded hero and rich_text block definitions, got %+v", defs)
	}
}

func TestPersistentCMSReconcilesRichTextBlockSlugDrift(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", strings.ToLower(t.Name()))

	opts, err := SetupPersistentCMS(ctx, "en", dsn)
	if err != nil {
		t.Fatalf("setup persistent cms: %v", err)
	}
	if opts.Container == nil || opts.Container.ContentService() == nil {
		t.Fatalf("expected CMS content service")
	}

	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	result, err := db.ExecContext(ctx, `
UPDATE block_definitions
SET slug = 'rich_text'
WHERE LOWER(slug) = 'rich-text'`)
	if err != nil {
		t.Fatalf("mutate rich_text slug to legacy alias: %v", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		t.Fatalf("rows affected: %v", err)
	}
	if affected < 1 {
		t.Fatalf("expected to mutate at least one rich_text block definition row")
	}

	opts, err = SetupPersistentCMS(ctx, "en", dsn)
	if err != nil {
		t.Fatalf("re-setup persistent cms: %v", err)
	}
	if opts.Container == nil || opts.Container.ContentService() == nil {
		t.Fatalf("expected CMS content service")
	}

	defs, err := opts.Container.ContentService().BlockDefinitions(ctx)
	if err != nil {
		t.Fatalf("list block definitions: %v", err)
	}
	seenRichText := false
	for _, def := range defs {
		if !strings.EqualFold(strings.TrimSpace(def.ID), "rich_text") {
			continue
		}
		seenRichText = true
		if slug := strings.TrimSpace(def.Slug); slug != "rich-text" {
			t.Fatalf("expected reconciled rich_text slug %q, got %q", "rich-text", slug)
		}
		if status := strings.ToLower(strings.TrimSpace(def.Status)); status != "active" {
			t.Fatalf("expected rich_text status active, got %q", def.Status)
		}
	}
	if !seenRichText {
		t.Fatalf("expected rich_text block definition after reconciliation")
	}
}
