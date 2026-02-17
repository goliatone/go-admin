package setup

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"
	"strings"
	"testing"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

func TestValidateTranslationSeedFixtureCoveragePassesForPersistentCMSSeeds(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	opts, err := SetupPersistentCMS(ctx, "en", dsn)
	if err != nil {
		t.Fatalf("setup persistent cms: %v", err)
	}
	if opts.Container == nil {
		t.Fatalf("expected CMS container")
	}

	db := openTranslationFixtureTestDB(t, dsn)
	defer db.Close()

	if err := validateTranslationSeedFixtureCoverage(ctx, db); err != nil {
		t.Fatalf("validate translation seed fixtures: %v", err)
	}
}

func TestValidateTranslationSeedFixtureCoverageFailsWhenOptionALocaleChildMissing(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	opts, err := SetupPersistentCMS(ctx, "en", dsn)
	if err != nil {
		t.Fatalf("setup persistent cms: %v", err)
	}
	if opts.Container == nil {
		t.Fatalf("expected CMS container")
	}

	db := openTranslationFixtureTestDB(t, dsn)
	defer db.Close()

	if _, err := db.Exec(
		`DELETE FROM page_translations
		  WHERE page_id IN (SELECT id FROM pages WHERE slug = ?)
		    AND locale_id IN (SELECT id FROM locales WHERE LOWER(code) = LOWER(?))`,
		"translation-demo-exchange",
		"fr",
	); err != nil {
		t.Fatalf("remove fr locale child fixture: %v", err)
	}

	err = validateTranslationSeedFixtureCoverage(ctx, db)
	if err == nil {
		t.Fatalf("expected translation fixture coverage validation error after deleting locale child")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "translation-demo-exchange") {
		t.Fatalf("expected validation error to mention deleted fixture, got %v", err)
	}
}

func openTranslationFixtureTestDB(t *testing.T, dsn string) *bun.DB {
	t.Helper()

	registerSQLiteDrivers("sqlite3")
	sqlDB, err := sql.Open("sqlite3", dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() {
		_ = sqlDB.Close()
	})
	return bun.NewDB(sqlDB, sqlitedialect.New())
}
