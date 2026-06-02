package setup

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	cms "github.com/goliatone/go-cms"
	cmsinterfaces "github.com/goliatone/go-cms/pkg/interfaces"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

type translationCheckerContract interface {
	CheckTranslations(context.Context, uuid.UUID, []string, cmsinterfaces.TranslationCheckOptions) ([]string, error)
}

func TestLoadCMSContentSeedsAcceptsCanonicalTranslationFixtures(t *testing.T) {
	t.Helper()

	pageSeeds, postSeeds, _, err := loadCMSContentSeeds()
	if err != nil {
		t.Fatalf("load cms content seeds: %v", err)
	}

	pageSeed := findSeedBySlug(t, pageSeeds, "translation-missing-fr")
	if _, ok := pageSeed.Translations["es"]; !ok {
		t.Fatalf("expected translation-missing-fr to include es translation override")
	}

	postSeed := findSeedBySlug(t, postSeeds, "translation-review-post")
	if _, ok := postSeed.Translations["es"]; !ok {
		t.Fatalf("expected translation-review-post to include es translation override")
	}
}

func TestValidateCMSContentSeedsRejectsTopLevelLocalizedPageSeed(t *testing.T) {
	err := validateCMSContentSeeds([]contentSeed{
		{
			Slug:   "localized-page",
			Custom: map[string]any{"locale": "es"},
		},
	}, nil, nil)
	if err == nil {
		t.Fatalf("expected top-level localized page seed to fail validation")
	}
	if !strings.Contains(err.Error(), "use translations.es instead") {
		t.Fatalf("expected actionable validation error, got %v", err)
	}
}

func TestValidateCMSContentSeedsRejectsTopLevelLocalizedPostSeed(t *testing.T) {
	err := validateCMSContentSeeds(nil, []contentSeed{
		{
			Slug:   "localized-post",
			Custom: map[string]any{"locale": "es"},
		},
	}, nil)
	if err == nil {
		t.Fatalf("expected top-level localized post seed to fail validation")
	}
	if !strings.Contains(err.Error(), "use translations.es instead") {
		t.Fatalf("expected actionable validation error, got %v", err)
	}
}

func TestValidateCMSContentSeedsRejectsTranslationOverrideCustomLocale(t *testing.T) {
	err := validateCMSContentSeeds([]contentSeed{
		{
			Slug: "canonical-page",
			Translations: map[string]contentSeedTranslation{
				"es": {Custom: map[string]any{"locale": "es"}},
			},
		},
	}, nil, nil)
	if err == nil {
		t.Fatalf("expected translation override custom.locale to fail validation")
	}
	if !strings.Contains(err.Error(), "translations.es.custom.locale") {
		t.Fatalf("expected translation override validation error, got %v", err)
	}
}

func TestValidateCMSContentSeedsAcceptsCanonicalTranslationSeed(t *testing.T) {
	err := validateCMSContentSeeds([]contentSeed{
		{
			Slug: "canonical-page",
			Translations: map[string]contentSeedTranslation{
				"es": {Title: new("Pagina")},
				"fr": {Title: new("Page")},
			},
		},
	}, nil, nil)
	if err != nil {
		t.Fatalf("expected canonical translation seed to pass validation: %v", err)
	}
}

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

func TestSetupPersistentCMSExposesPolicyCheckerServices(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	opts, err := SetupPersistentCMS(ctx, "en", dsn)
	if err != nil {
		t.Fatalf("setup persistent cms: %v", err)
	}
	if opts.Container == nil || opts.Container.ContentService() == nil {
		t.Fatalf("expected admin CMS bridge container to remain available")
	}
	provider, ok := opts.GoCMSConfig.(interface {
		Pages() cms.PageService
		Content() cms.ContentService
	})
	if !ok {
		t.Fatalf("expected raw go-cms module in GoCMSConfig, got %T", opts.GoCMSConfig)
	}
	if _, ok := provider.Pages().(translationCheckerContract); !ok {
		t.Fatalf("expected go-cms page service to implement CheckTranslations")
	}
	if _, ok := provider.Content().(translationCheckerContract); !ok {
		t.Fatalf("expected go-cms content service to implement CheckTranslations")
	}
}

func TestSetupPersistentCMSSeedsCanonicalFamilyIDForTranslationEnabledContent(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	opts, err := SetupPersistentCMS(ctx, "en", dsn)
	if err != nil {
		t.Fatalf("setup persistent cms: %v", err)
	}
	if opts.Container == nil || opts.Container.ContentService() == nil {
		t.Fatalf("expected CMS content service")
	}

	items, err := opts.Container.ContentService().Contents(ctx, "en")
	if err != nil {
		t.Fatalf("load default-locale content: %v", err)
	}

	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(item.ContentType), "page") {
			continue
		}
		if strings.TrimSpace(item.FamilyID) == "" {
			t.Fatalf("expected canonical family_id for translation-enabled content slug=%s type=%s content=%#v", item.Slug, item.ContentType, item)
		}
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

func TestSetupPersistentCMSTranslationSeedsRemainIdempotentAcrossRestart(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	opts, err := SetupPersistentCMS(ctx, "en", dsn)
	if err != nil {
		t.Fatalf("setup persistent cms (first pass): %v", err)
	}
	if opts.Container == nil {
		t.Fatalf("expected CMS container on first pass")
	}

	opts, err = SetupPersistentCMS(ctx, "en", dsn)
	if err != nil {
		t.Fatalf("setup persistent cms (second pass): %v", err)
	}
	if opts.Container == nil {
		t.Fatalf("expected CMS container on second pass")
	}

	db := openTranslationFixtureTestDB(t, dsn)
	defer db.Close()

	pageLocales := translationFixtureLocales(t, ctx, db, "page_translations", "translation-missing-fr")
	if got, want := strings.Join(pageLocales, ","), "en,es"; got != want {
		t.Fatalf("expected translation-missing-fr page locales %q, got %q", want, got)
	}

	postLocales := translationFixtureLocales(t, ctx, db, "content_translations", "translation-review-post")
	if got, want := strings.Join(postLocales, ","), "en,es"; got != want {
		t.Fatalf("expected translation-review-post content locales %q, got %q", want, got)
	}
}

func TestSetupPersistentCMSReconcilesLegacyLocalizedContentRowsByFamilyLocale(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	if _, err := SetupPersistentCMS(ctx, "en", dsn); err != nil {
		t.Fatalf("setup persistent cms (first pass): %v", err)
	}

	db := openTranslationFixtureTestDB(t, dsn)
	defer db.Close()

	var home struct {
		ID            uuid.UUID `bun:"id"`
		ContentTypeID uuid.UUID `bun:"content_type_id"`
	}
	if err := db.NewSelect().
		Table("contents").
		Column("id", "content_type_id").
		Where("slug = ?", "home").
		Scan(ctx, &home); err != nil {
		t.Fatalf("load home content row: %v", err)
	}

	var frLocaleID uuid.UUID
	if err := db.NewSelect().
		Table("locales").
		Column("id").
		Where("LOWER(code) = LOWER(?)", "fr").
		Scan(ctx, &frLocaleID); err != nil {
		t.Fatalf("load fr locale: %v", err)
	}

	legacyContentID := uuid.New()
	if _, err := db.Exec(
		`INSERT INTO contents (id, content_type_id, current_version, status, slug, environment_id, created_by, updated_by, created_at, updated_at)
		 VALUES (?, ?, 1, 'published', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		legacyContentID.String(),
		home.ContentTypeID.String(),
		"home-fr-legacy",
		cmsSeedChannelID.String(),
		seedAuthorID.String(),
		seedAuthorID.String(),
	); err != nil {
		t.Fatalf("insert legacy localized content row: %v", err)
	}

	result, err := db.Exec(
		`UPDATE content_translations
		    SET content_id = ?
		  WHERE family_id = ?
		    AND locale_id = ?
		    AND deleted_at IS NULL`,
		legacyContentID.String(),
		home.ID.String(),
		frLocaleID.String(),
	)
	if err != nil {
		t.Fatalf("move fr translation onto legacy localized content row: %v", err)
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		t.Fatalf("expected to move one fr translation row, moved %d", affected)
	}

	if _, err := SetupPersistentCMS(ctx, "en", dsn); err != nil {
		t.Fatalf("setup persistent cms (second pass with legacy localized row): %v", err)
	}

	var count int
	if err := db.NewSelect().
		Table("content_translations").
		ColumnExpr("COUNT(1)").
		Where("family_id = ?", home.ID).
		Where("locale_id = ?", frLocaleID).
		Where("deleted_at IS NULL").
		Scan(ctx, &count); err != nil {
		t.Fatalf("count active fr family translations: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one active fr translation for home family after reconciliation, got %d", count)
	}
}

func TestSetupPersistentCMSRepairsSeedRerunWhenLegacyTranslationRowsAreMissing(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	if _, err := SetupPersistentCMS(ctx, "en", dsn); err != nil {
		t.Fatalf("setup persistent cms (first pass): %v", err)
	}

	db := openTranslationFixtureTestDB(t, dsn)
	defer db.Close()

	if _, err := db.NewDelete().
		TableExpr("content_translations AS ct").
		Where("ct.content_id IN (SELECT id FROM contents WHERE slug = ?)", "translation-missing-fr").
		Exec(ctx); err != nil {
		t.Fatalf("remove translation-missing-fr content translations: %v", err)
	}

	if _, err := SetupPersistentCMS(ctx, "en", dsn); err != nil {
		t.Fatalf("setup persistent cms (second pass after translation drift): %v", err)
	}

	var contentCount int
	if err := db.NewSelect().
		Table("contents").
		ColumnExpr("COUNT(1)").
		Where("slug = ?", "translation-missing-fr").
		Scan(ctx, &contentCount); err != nil {
		t.Fatalf("count translation-missing-fr contents: %v", err)
	}
	if contentCount != 1 {
		t.Fatalf("expected exactly one translation-missing-fr content row after repair, got %d", contentCount)
	}

	pageLocales := translationFixtureLocales(t, ctx, db, "page_translations", "translation-missing-fr")
	if got, want := strings.Join(pageLocales, ","), "en,es"; got != want {
		t.Fatalf("expected translation-missing-fr page locales %q after repair, got %q", want, got)
	}

	contentLocales := translationFixtureLocales(t, ctx, db, "content_translations", "translation-missing-fr")
	if got, want := strings.Join(contentLocales, ","), "en,es"; got != want {
		t.Fatalf("expected translation-missing-fr content locales %q after repair, got %q", want, got)
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

func findSeedBySlug(t *testing.T, seeds []contentSeed, slug string) contentSeed {
	t.Helper()
	for _, seed := range seeds {
		if strings.EqualFold(strings.TrimSpace(seed.Slug), strings.TrimSpace(slug)) {
			return seed
		}
	}
	t.Fatalf("seed %s not found", slug)
	return contentSeed{}
}

func translationFixtureLocales(t *testing.T, ctx context.Context, db *bun.DB, table, slug string) []string {
	t.Helper()
	var locales []string
	switch strings.ToLower(strings.TrimSpace(table)) {
	case "page_translations":
		err := db.NewSelect().
			TableExpr("page_translations AS tr").
			ColumnExpr("LOWER(l.code) AS code").
			Join("JOIN pages AS p ON p.id = tr.page_id").
			Join("JOIN locales AS l ON l.id = tr.locale_id").
			Where("p.slug = ?", slug).
			Scan(ctx, &locales)
		if err != nil {
			t.Fatalf("load page translation locales for %s: %v", slug, err)
		}
	case "content_translations":
		err := db.NewSelect().
			TableExpr("content_translations AS tr").
			ColumnExpr("LOWER(l.code) AS code").
			Join("JOIN contents AS c ON c.id = tr.content_id").
			Join("JOIN locales AS l ON l.id = tr.locale_id").
			Where("c.slug = ?", slug).
			Scan(ctx, &locales)
		if err != nil {
			t.Fatalf("load content translation locales for %s: %v", slug, err)
		}
	default:
		t.Fatalf("unsupported translation fixture table %s", table)
	}
	sort.Strings(locales)
	return locales
}

//go:fix inline
func stringPtr(value string) *string {
	return new(value)
}
