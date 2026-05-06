package setup

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestPersistentCMSAppliesMigrations ensures go-cms migrations run against a SQLite DSN
// and include the sanitized menu columns required by the example.
func TestPersistentCMSAppliesMigrations(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := testSQLiteDSN(t)

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
    'templates','themes',
    'content_families','locale_variants','translation_assignments','family_blockers',
    'translation_assignment_events','exchange_jobs',
    'translation_exchange_job_rows','translation_exchange_job_artifacts','translation_exchange_apply_ledger'
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
		"content_families", "locale_variants", "translation_assignments", "family_blockers",
		"translation_assignment_events", "exchange_jobs",
		"translation_exchange_job_rows", "translation_exchange_job_artifacts", "translation_exchange_apply_ledger",
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

func TestPersistentCMSReconcilesStaleMediaShowcaseRows(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := testSQLiteDSN(t)

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
	if _, err := db.ExecContext(ctx, `DELETE FROM media`); err != nil {
		_ = db.Close()
		t.Fatalf("clear media rows: %v", err)
	}
	staleRows := []struct {
		id       string
		filename string
		url      string
		mimeType string
	}{
		{
			id:       "10000000-0000-0000-0000-000000000001",
			filename: "logo.png",
			url:      "/static/media/logo.png",
			mimeType: "image/png",
		},
		{
			id:       "10000000-0000-0000-0000-000000000002",
			filename: "banner.jpg",
			url:      "/static/media/banner.jpg",
			mimeType: "image/jpeg",
		},
		{
			id:       "10000000-0000-0000-0000-000000000003",
			filename: "user-upload.png",
			url:      "/admin/assets/uploads/media/library/user-upload.png",
			mimeType: "image/png",
		},
	}
	for _, row := range staleRows {
		if _, err := db.ExecContext(ctx, `
INSERT INTO media (id, filename, url, type, mime_type, size, metadata, uploaded_by, created_at, updated_at)
VALUES (?, ?, ?, 'image', ?, 1, '{}', 'test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			row.id, row.filename, row.url, row.mimeType,
		); err != nil {
			_ = db.Close()
			t.Fatalf("insert stale media row %s: %v", row.filename, err)
		}
	}
	if err := db.Close(); err != nil {
		t.Fatalf("close sqlite before setup rerun: %v", err)
	}

	opts, err = SetupPersistentCMS(ctx, "en", dsn)
	if err != nil {
		t.Fatalf("rerun persistent cms setup: %v", err)
	}
	if opts.Container == nil {
		t.Fatalf("expected CMS container after rerun")
	}

	db, err = sql.Open("sqlite3", dsn)
	if err != nil {
		t.Fatalf("reopen sqlite: %v", err)
	}
	defer db.Close()

	rows, err := db.QueryContext(ctx, `SELECT COALESCE(url, '') FROM media`)
	if err != nil {
		t.Fatalf("query media urls: %v", err)
	}
	defer rows.Close()

	urls := map[string]bool{}
	for rows.Next() {
		var url string
		if err := rows.Scan(&url); err != nil {
			t.Fatalf("scan media url: %v", err)
		}
		urls[url] = true
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iterate media urls: %v", err)
	}

	for _, staleURL := range []string{
		"/static/media/logo.png",
		"/static/media/banner.jpg",
	} {
		if urls[staleURL] {
			t.Fatalf("stale media URL should be reconciled away: %s", staleURL)
		}
	}
	if !urls["/admin/assets/uploads/media/library/user-upload.png"] {
		t.Fatalf("unrelated user media should be preserved")
	}
	for _, expectedURL := range []string{
		"/admin/assets/uploads/users/profile-pictures/1765861166124613.png",
		"/admin/assets/uploads/media/showcase/brand-mark.svg",
		"/admin/assets/uploads/media/showcase/generic-vector.svg",
		"/admin/assets/uploads/media/showcase/product-demo.mp4",
		"/admin/assets/uploads/media/showcase/narration.mp3",
		"/admin/assets/uploads/media/showcase/operator-guide.pdf",
	} {
		if !urls[expectedURL] {
			t.Fatalf("expected current showcase URL after setup rerun: %s", expectedURL)
		}
	}
}

func TestPersistentCMSSeedsRequiredContentTypes(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := testSQLiteDSN(t)

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
		name   string
		slug   string
		panel  string
		expect []string
	}{
		{
			name:  "page",
			slug:  "page",
			panel: "pages",
			expect: []string{
				`"delivery":{"enabled":true,"kind":"page"`,
				`"navigation":{"allow_instance_override":true`,
				`"default_locations":["site.main"]`,
			},
		},
		{
			name:  "post",
			slug:  "post",
			panel: "posts",
			expect: []string{
				`"delivery":{"enabled":true,"kind":"hybrid"`,
				`"routes":{"detail":"/posts/:slug","list":"/posts"}`,
				`"search":{"collection":"site_content","enabled":true`,
			},
		},
		{
			name:  "news",
			slug:  "news",
			panel: "news",
			expect: []string{
				`"delivery":{"enabled":true,"kind":"hybrid"`,
				`"routes":{"detail":"/news/:slug","list":"/news"}`,
				`"navigation":{"allow_instance_override":true`,
			},
		},
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
		lowerCaps := strings.ToLower(capabilities)
		for _, expected := range item.expect {
			if !strings.Contains(lowerCaps, strings.ToLower(expected)) {
				t.Fatalf("expected %s capabilities to include %s, got %s", item.name, expected, capabilities)
			}
		}
	}
}

func TestPersistentCMSSeedsSiteMenuBindingsAndViewProfiles(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := testSQLiteDSN(t)

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

	for _, profile := range []string{"full", "footer_top_5"} {
		var status string
		err := db.QueryRowContext(ctx, `
SELECT COALESCE(status, '')
FROM menu_view_profiles
WHERE code = ?`, profile).Scan(&status)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				t.Fatalf("expected menu view profile %s", profile)
			}
			t.Fatalf("query menu view profile %s: %v", profile, err)
		}
		if !strings.EqualFold(strings.TrimSpace(status), "published") {
			t.Fatalf("expected profile %s status published, got %q", profile, status)
		}
	}

	type bindingExpectation struct {
		location string
		profile  string
	}
	for _, expected := range []bindingExpectation{
		{location: "site.main", profile: "full"},
		{location: "site.footer", profile: "footer_top_5"},
	} {
		var menuCode string
		var viewProfile sql.NullString
		var status string
		err := db.QueryRowContext(ctx, `
SELECT COALESCE(menu_code, ''), view_profile_code, COALESCE(status, '')
FROM menu_location_bindings
WHERE location = ?`, expected.location).Scan(&menuCode, &viewProfile, &status)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				t.Fatalf("expected menu location binding for %s", expected.location)
			}
			t.Fatalf("query menu location binding %s: %v", expected.location, err)
		}
		if strings.TrimSpace(menuCode) != SiteNavigationMenuCode {
			t.Fatalf("expected menu_code=%s for %s, got %q", SiteNavigationMenuCode, expected.location, menuCode)
		}
		if strings.TrimSpace(viewProfile.String) != expected.profile {
			t.Fatalf("expected view_profile_code=%s for %s, got %q", expected.profile, expected.location, viewProfile.String)
		}
		if !strings.EqualFold(strings.TrimSpace(status), "published") {
			t.Fatalf("expected binding status published for %s, got %q", expected.location, status)
		}
	}
}

func TestPersistentCMSSeedsCoreBlockDefinitions(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := testSQLiteDSN(t)

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

func TestPersistentCMSMediaGallerySchemaAllowsRelativeAdminAssetURLs(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := testSQLiteDSN(t)

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

	var gallerySchema map[string]any
	for _, def := range defs {
		if strings.EqualFold(strings.TrimSpace(def.ID), "media_gallery") {
			gallerySchema = def.Schema
			break
		}
	}
	if len(gallerySchema) == 0 {
		t.Fatalf("expected media_gallery block definition")
	}
	items := nestedSchemaMap(t, gallerySchema, "properties", "images", "items")
	if got := strings.TrimSpace(fmt.Sprint(items["format"])); got != "uri-reference" {
		t.Fatalf("expected persistent media_gallery image items format uri-reference, got %q", got)
	}

	fixture, err := os.ReadFile(filepath.Join("..", "data", "sql", "seeds", "cms", "cms.yml"))
	if err != nil {
		t.Fatalf("read cms seed fixture: %v", err)
	}
	body := string(fixture)
	if !strings.Contains(body, `format: "uri-reference"`) {
		t.Fatalf("expected SQL/YAML cms seed fixture to use uri-reference for media_gallery URLs")
	}
	if strings.Contains(body, `format: "uri"`) {
		t.Fatalf("expected SQL/YAML cms seed fixture not to require absolute uri format")
	}

	contentFixture, err := os.ReadFile(filepath.Join("..", "data", "sql", "seeds", "content", "content.yml"))
	if err != nil {
		t.Fatalf("read content seed fixture: %v", err)
	}
	if !strings.Contains(string(contentFixture), `/admin/assets/uploads/media/showcase/brand-mark.svg`) {
		t.Fatalf("expected content seed fixture to include relative admin asset media gallery URLs")
	}
}

func TestPersistentCMSSeedsMediaGalleryBlocksFromContentFixture(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := testSQLiteDSN(t)

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
SELECT ct.content
FROM content_translations ct
JOIN contents c ON c.id = ct.content_id
WHERE c.slug = 'home'`)
	if err != nil {
		t.Fatalf("query home content translations: %v", err)
	}
	defer rows.Close()

	rowCount := 0
	galleryCount := 0
	for rows.Next() {
		rowCount++
		var raw string
		if err := rows.Scan(&raw); err != nil {
			t.Fatalf("scan content translation: %v", err)
		}
		payload := map[string]any{}
		if err := json.Unmarshal([]byte(raw), &payload); err != nil {
			t.Fatalf("decode content translation payload: %v", err)
		}
		markdown, ok := payload["markdown"].(map[string]any)
		if !ok {
			t.Fatalf("expected persisted home content translation to include markdown payload, got %#v", payload["markdown"])
		}
		custom, ok := markdown["custom"].(map[string]any)
		if !ok {
			t.Fatalf("expected persisted home content translation to include markdown custom payload, got %#v", markdown["custom"])
		}
		blocks, ok := custom["blocks"].([]any)
		if !ok || len(blocks) == 0 {
			t.Fatalf("expected persisted home content translation to include embedded blocks, got %#v", custom["blocks"])
		}
		for _, block := range blocks {
			blockMap, ok := block.(map[string]any)
			if !ok {
				continue
			}
			if strings.TrimSpace(fmt.Sprint(blockMap["_type"])) != "media_gallery" {
				continue
			}
			galleryCount++
			images, ok := blockMap["images"].([]any)
			if !ok || len(images) < 3 {
				t.Fatalf("expected media_gallery block images, got %#v", blockMap["images"])
			}
			imageSet := map[string]struct{}{}
			for _, image := range images {
				imageSet[strings.TrimSpace(fmt.Sprint(image))] = struct{}{}
			}
			for _, expected := range []string{
				"/admin/assets/uploads/users/profile-pictures/1765861166124613.png",
				"/admin/assets/uploads/media/showcase/brand-mark.svg",
				"/admin/assets/uploads/media/showcase/generic-vector.svg",
			} {
				if _, ok := imageSet[expected]; !ok {
					t.Fatalf("expected persistent media_gallery block to include %s, got %#v", expected, images)
				}
			}
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iterate content translations: %v", err)
	}
	if rowCount == 0 {
		t.Fatalf("expected at least one home content translation row")
	}
	if galleryCount == 0 {
		t.Fatalf("expected persistent home content translations to include media_gallery blocks")
	}
}

func TestPersistentCMSReconcilesRichTextBlockSlugDrift(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := testSQLiteDSN(t)

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

func nestedSchemaMap(t *testing.T, root map[string]any, keys ...string) map[string]any {
	t.Helper()
	current := root
	for _, key := range keys {
		next, ok := current[key].(map[string]any)
		if !ok {
			t.Fatalf("expected schema path %s to be an object, got %#v", strings.Join(keys, "."), current[key])
		}
		current = next
	}
	return current
}

func TestPersistentCMSBackfillsContentTranslationPathFromPageTranslations(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := testSQLiteDSN(t)

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
SELECT ct.content
FROM content_translations ct
JOIN contents c ON c.id = ct.content_id
WHERE c.slug = 'home'`)
	if err != nil {
		t.Fatalf("query home content translations: %v", err)
	}
	defer rows.Close()

	rowCount := 0
	for rows.Next() {
		rowCount++
		var raw string
		if err := rows.Scan(&raw); err != nil {
			t.Fatalf("scan content translation: %v", err)
		}
		if strings.TrimSpace(raw) == "" {
			t.Fatalf("expected content translation payload for home")
		}
		payload := map[string]any{}
		if err := json.Unmarshal([]byte(raw), &payload); err != nil {
			t.Fatalf("decode content translation payload: %v", err)
		}
		if got := strings.TrimSpace(asString(payload["path"], "")); got != "/" {
			t.Fatalf("expected backfilled path /, got %q", got)
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iterate content translations: %v", err)
	}
	if rowCount == 0 {
		t.Fatalf("expected at least one home content translation row")
	}
}

func TestPersistentCMSRepairsLegacyMenuChannelSchema(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	if _, err := SetupPersistentCMS(ctx, "en", dsn); err != nil {
		t.Fatalf("setup persistent cms: %v", err)
	}

	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	_, err = db.ExecContext(ctx, `
DROP TABLE IF EXISTS menu_view_profiles;
DROP TABLE IF EXISTS menu_location_bindings;

CREATE TABLE menu_view_profiles (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'full',
    max_top_level INTEGER,
    max_depth INTEGER,
    include_item_ids TEXT,
    exclude_item_ids TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    published_at TIMESTAMP,
    channel_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_menu_view_profiles_channel_code
    ON menu_view_profiles(channel_id, code);

CREATE TABLE menu_location_bindings (
    id TEXT PRIMARY KEY,
    location TEXT NOT NULL,
    menu_code TEXT NOT NULL,
    view_profile_code TEXT,
    locale TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published',
    published_at TIMESTAMP,
    channel_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_menu_location_bindings_channel_location
    ON menu_location_bindings(channel_id, location);
`)
	if err != nil {
		t.Fatalf("install legacy channel schema drift: %v", err)
	}

	if _, err := SetupPersistentCMS(ctx, "en", dsn); err != nil {
		t.Fatalf("re-setup persistent cms after schema drift: %v", err)
	}

	if !sqliteTableHasColumn(t, db, "menu_view_profiles", "environment_id") {
		t.Fatalf("expected menu_view_profiles.environment_id to be restored")
	}
	if !sqliteTableHasColumn(t, db, "menu_location_bindings", "environment_id") {
		t.Fatalf("expected menu_location_bindings.environment_id to be restored")
	}

	var profileCount int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(1) FROM menu_view_profiles WHERE code = 'full'`).Scan(&profileCount); err != nil {
		t.Fatalf("query repaired menu_view_profiles seed row: %v", err)
	}
	if profileCount < 1 {
		t.Fatalf("expected menu_view_profiles to be reseeded after drift repair")
	}
}

func sqliteTableHasColumn(t *testing.T, db *sql.DB, table, column string) bool {
	t.Helper()
	rows, err := db.Query(fmt.Sprintf(`PRAGMA table_info('%s')`, table))
	if err != nil {
		t.Fatalf("pragma table_info(%s): %v", table, err)
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, columnType string
		var notNull, pk int
		var defValue sql.NullString
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defValue, &pk); err != nil {
			t.Fatalf("scan pragma row for %s: %v", table, err)
		}
		if strings.EqualFold(strings.TrimSpace(name), strings.TrimSpace(column)) {
			return true
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iterate pragma rows for %s: %v", table, err)
	}
	return false
}
