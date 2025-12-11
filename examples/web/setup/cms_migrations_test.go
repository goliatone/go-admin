package setup

import (
	"context"
	"database/sql"
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
