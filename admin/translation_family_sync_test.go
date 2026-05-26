package admin

import (
	"context"
	"database/sql"
	"sort"
	"testing"

	translationservices "github.com/goliatone/go-admin/translations/services"
	_ "github.com/mattn/go-sqlite3"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

func TestTranslationFamilySyncKeepsLocaleVariantsForSharedPageRecordID(t *testing.T) {
	content := &translationFamilySyncContentStub{
		InMemoryContentService: NewInMemoryContentService(),
		pagesByLocale: map[string][]CMSPage{
			"bo": {{
				ID:               "page-privacy",
				FamilyID:         "family-privacy",
				Locale:           "bo",
				Title:            "Privacy BO",
				Slug:             "privacy",
				Status:           "published",
				AvailableLocales: []string{"bo", "en", "zh"},
			}},
			"en": {{
				ID:               "page-privacy",
				FamilyID:         "family-privacy",
				Locale:           "en",
				Title:            "Privacy",
				Slug:             "privacy",
				Status:           "published",
				AvailableLocales: []string{"bo", "en", "zh"},
			}},
			"zh": {{
				ID:               "page-privacy",
				FamilyID:         "family-privacy",
				Locale:           "zh",
				Title:            "Privacy ZH",
				Slug:             "privacy",
				Status:           "published",
				AvailableLocales: []string{"bo", "en", "zh"},
			}},
		},
	}
	adm := &Admin{contentSvc: content, config: Config{DefaultLocale: "en"}}

	families, err := translationFamilySyncFamilies(context.Background(), adm, []string{"bo", "en", "zh"}, "en")
	if err != nil {
		t.Fatalf("translationFamilySyncFamilies: %v", err)
	}
	family := families["family-privacy"]
	if family.SourceVariantID != "page-privacy::en" {
		t.Fatalf("source variant id = %q, want localized en variant", family.SourceVariantID)
	}
	if got := sortedFamilyVariantIDs(family); !equalStrings(got, []string{"page-privacy::bo", "page-privacy::en", "page-privacy::zh"}) {
		t.Fatalf("variant ids = %#v", got)
	}
	for _, variant := range family.Variants {
		if variant.SourceRecordID != "page-privacy" {
			t.Fatalf("variant %s source record id = %q", variant.ID, variant.SourceRecordID)
		}
	}
}

func TestTranslationFamilySyncKeepsRecordIDsWhenLocaleRecordsAreDistinct(t *testing.T) {
	content := &translationFamilySyncContentStub{
		InMemoryContentService: NewInMemoryContentService(),
		contentsByLocale: map[string][]CMSContent{
			"bo": {{
				ID:              "archive-bo",
				FamilyID:        "archive-family",
				Locale:          "bo",
				Title:           "Archive BO",
				ContentType:     "archive_event",
				ContentTypeSlug: "archive_event",
				Status:          "published",
			}},
			"en": {{
				ID:              "archive-en",
				FamilyID:        "archive-family",
				Locale:          "en",
				Title:           "Archive",
				ContentType:     "archive_event",
				ContentTypeSlug: "archive_event",
				Status:          "published",
			}},
		},
	}
	adm := &Admin{contentSvc: content, config: Config{DefaultLocale: "en"}}

	families, err := translationFamilySyncFamilies(context.Background(), adm, []string{"bo", "en"}, "en")
	if err != nil {
		t.Fatalf("translationFamilySyncFamilies: %v", err)
	}
	family := families["archive-family"]
	if family.SourceVariantID != "archive-en" {
		t.Fatalf("source variant id = %q, want raw en record id", family.SourceVariantID)
	}
	if got := sortedFamilyVariantIDs(family); !equalStrings(got, []string{"archive-bo", "archive-en"}) {
		t.Fatalf("variant ids = %#v", got)
	}
}

func TestBunTranslationFamilyStoreReplacesStaleLocaleVariantIDs(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)
	ctx := context.Background()

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-privacy",
		ContentType:     "pages",
		SourceLocale:    "bo",
		SourceVariantID: "page-privacy",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{{
			ID:             "page-privacy",
			FamilyID:       "family-privacy",
			Locale:         "bo",
			Status:         "published",
			IsSource:       true,
			SourceRecordID: "page-privacy",
		}},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-privacy",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "page-privacy::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{
			{
				ID:             "page-privacy::bo",
				FamilyID:       "family-privacy",
				Locale:         "bo",
				Status:         "published",
				SourceRecordID: "page-privacy",
			},
			{
				ID:             "page-privacy::en",
				FamilyID:       "family-privacy",
				Locale:         "en",
				Status:         "published",
				IsSource:       true,
				SourceRecordID: "page-privacy",
			},
		},
	}); err != nil {
		t.Fatalf("replace stale variants: %v", err)
	}

	family, ok, err := store.Family(ctx, "family-privacy")
	if err != nil {
		t.Fatalf("load family: %v", err)
	}
	if !ok {
		t.Fatal("expected saved family")
	}
	if family.SourceVariantID != "page-privacy::en" {
		t.Fatalf("source variant id = %q", family.SourceVariantID)
	}
	if got := sortedFamilyVariantIDs(family); !equalStrings(got, []string{"page-privacy::bo", "page-privacy::en"}) {
		t.Fatalf("variant ids = %#v", got)
	}
}

func TestBunTranslationFamilyStoreRenamesStaleVariantIDsWithoutDeletingAssignments(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)
	ctx := context.Background()

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-privacy",
		ContentType:     "pages",
		SourceLocale:    "bo",
		SourceVariantID: "page-privacy",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{{
			ID:             "page-privacy",
			FamilyID:       "family-privacy",
			Locale:         "bo",
			Status:         "published",
			IsSource:       true,
			SourceRecordID: "page-privacy",
		}},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}
	_, err := db.ExecContext(ctx, `INSERT INTO translation_assignments (
		assignment_id, family_id, variant_id, entity_type, source_record_id, source_locale,
		target_locale, work_scope, assignment_type, status, priority, row_version, created_at, updated_at
	) VALUES (
		'assignment-bo', 'family-privacy', 'page-privacy', 'pages', 'page-privacy', 'en',
		'bo', '__all__', 'open_pool', 'open', 'normal', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
	)`)
	if err != nil {
		t.Fatalf("seed assignment: %v", err)
	}

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-privacy",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "page-privacy::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{
			{
				ID:             "page-privacy::bo",
				FamilyID:       "family-privacy",
				Locale:         "bo",
				Status:         "published",
				SourceRecordID: "page-privacy",
			},
			{
				ID:             "page-privacy::en",
				FamilyID:       "family-privacy",
				Locale:         "en",
				Status:         "published",
				IsSource:       true,
				SourceRecordID: "page-privacy",
			},
		},
	}); err != nil {
		t.Fatalf("rename variants: %v", err)
	}

	var variantID string
	if err := db.QueryRowContext(ctx, `SELECT variant_id FROM translation_assignments WHERE assignment_id = 'assignment-bo'`).Scan(&variantID); err != nil {
		t.Fatalf("load assignment: %v", err)
	}
	if variantID != "page-privacy::bo" {
		t.Fatalf("assignment variant_id = %q, want page-privacy::bo", variantID)
	}
}

func TestBunTranslationAssignmentRepositoryResolvesLocaleVariantID(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)
	ctx := context.Background()

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-privacy",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "page-privacy::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{
			{
				ID:             "page-privacy::bo",
				FamilyID:       "family-privacy",
				Locale:         "bo",
				Status:         "draft",
				SourceRecordID: "page-privacy",
			},
			{
				ID:             "page-privacy::en",
				FamilyID:       "family-privacy",
				Locale:         "en",
				Status:         "published",
				IsSource:       true,
				SourceRecordID: "page-privacy",
			},
		},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}

	repo := NewBunTranslationAssignmentRepository(db)
	created, err := repo.Create(ctx, TranslationAssignment{
		FamilyID:       "family-privacy",
		EntityType:     "pages",
		SourceRecordID: "page-privacy",
		SourceLocale:   "en",
		TargetLocale:   "bo",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if created.VariantID != "page-privacy::bo" {
		t.Fatalf("created variant_id = %q, want page-privacy::bo", created.VariantID)
	}
	var storedVariantID string
	if err := db.QueryRowContext(ctx, `SELECT variant_id FROM translation_assignments WHERE assignment_id = ?`, created.ID).Scan(&storedVariantID); err != nil {
		t.Fatalf("load stored assignment: %v", err)
	}
	if storedVariantID != "page-privacy::bo" {
		t.Fatalf("stored variant_id = %q, want page-privacy::bo", storedVariantID)
	}
}

func TestBunTranslationAssignmentRepositoryAllowsMissingLocaleAssignment(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	store := NewBunTranslationFamilyStore(db)
	ctx := context.Background()

	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-privacy",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "page-privacy::en",
		ReadinessState:  "blocked",
		Variants: []translationservices.FamilyVariant{{
			ID:             "page-privacy::en",
			FamilyID:       "family-privacy",
			Locale:         "en",
			Status:         "published",
			IsSource:       true,
			SourceRecordID: "page-privacy",
		}},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}

	repo := NewBunTranslationAssignmentRepository(db)
	created, err := repo.Create(ctx, TranslationAssignment{
		FamilyID:       "family-privacy",
		EntityType:     "pages",
		SourceRecordID: "page-privacy",
		SourceLocale:   "en",
		TargetLocale:   "bo",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create missing-locale assignment: %v", err)
	}
	if created.VariantID != "" {
		t.Fatalf("created variant_id = %q, want empty missing-locale variant", created.VariantID)
	}
	var storedVariantID sql.NullString
	if err := db.QueryRowContext(ctx, `SELECT variant_id FROM translation_assignments WHERE assignment_id = ?`, created.ID).Scan(&storedVariantID); err != nil {
		t.Fatalf("load stored assignment: %v", err)
	}
	if storedVariantID.Valid {
		t.Fatalf("stored variant_id valid = true, value %q; want SQL NULL", storedVariantID.String)
	}
}

type translationFamilySyncContentStub struct {
	*InMemoryContentService
	pagesByLocale    map[string][]CMSPage
	contentsByLocale map[string][]CMSContent
}

func (s *translationFamilySyncContentStub) Pages(_ context.Context, locale string) ([]CMSPage, error) {
	return append([]CMSPage(nil), s.pagesByLocale[locale]...), nil
}

func (s *translationFamilySyncContentStub) Contents(_ context.Context, locale string) ([]CMSContent, error) {
	return append([]CMSContent(nil), s.contentsByLocale[locale]...), nil
}

func sortedFamilyVariantIDs(family translationservices.FamilyRecord) []string {
	out := make([]string, 0, len(family.Variants))
	for _, variant := range family.Variants {
		out = append(out, variant.ID)
	}
	sort.Strings(out)
	return out
}

func equalStrings(left, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	for i := range left {
		if left[i] != right[i] {
			return false
		}
	}
	return true
}

func newTranslationFamilyStoreSQLiteDB(t *testing.T) *bun.DB {
	t.Helper()
	sqlDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() {
		if closeErr := sqlDB.Close(); closeErr != nil {
			t.Errorf("close sqlite handle: %v", closeErr)
		}
	})
	db := bun.NewDB(sqlDB, sqlitedialect.New())
	t.Cleanup(func() {
		if closeErr := db.Close(); closeErr != nil {
			t.Errorf("close bun db: %v", closeErr)
		}
	})
	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		t.Fatalf("enable foreign keys: %v", err)
	}
	statements := []string{
		`CREATE TABLE content_families (
			family_id TEXT PRIMARY KEY,
			tenant_id TEXT,
			org_id TEXT,
			content_type TEXT NOT NULL,
			source_locale TEXT NOT NULL,
			source_variant_id TEXT,
			readiness_state TEXT NOT NULL,
			blocker_codes_json TEXT NOT NULL DEFAULT '[]',
			missing_required_locale_count INTEGER NOT NULL DEFAULT 0,
			pending_review_count INTEGER NOT NULL DEFAULT 0,
			outdated_locale_count INTEGER NOT NULL DEFAULT 0,
			created_at TEXT,
			updated_at TEXT,
			FOREIGN KEY (source_variant_id, family_id, source_locale)
				REFERENCES locale_variants(variant_id, family_id, locale)
				ON UPDATE CASCADE
				DEFERRABLE INITIALLY DEFERRED
		)`,
		`CREATE TABLE locale_variants (
			variant_id TEXT PRIMARY KEY,
			tenant_id TEXT,
			org_id TEXT,
			family_id TEXT NOT NULL REFERENCES content_families(family_id) ON DELETE CASCADE,
			locale TEXT NOT NULL,
			status TEXT NOT NULL,
			is_source BOOLEAN NOT NULL DEFAULT FALSE,
			source_hash_at_last_sync TEXT,
			fields_json TEXT NOT NULL DEFAULT '{}',
			row_version BIGINT NOT NULL DEFAULT 1,
			source_record_id TEXT,
			created_at TEXT,
			updated_at TEXT,
			published_at TEXT,
			UNIQUE (variant_id, family_id, locale),
			UNIQUE (family_id, locale)
			)`,
		`CREATE UNIQUE INDEX ux_locale_variants_one_source_per_family
			ON locale_variants(family_id)
			WHERE is_source`,
		`CREATE TABLE family_blockers (
			family_id TEXT,
			tenant_id TEXT,
			org_id TEXT,
			blocker_code TEXT,
			locale TEXT,
			field_path TEXT,
			details_json TEXT,
			created_at TEXT,
			updated_at TEXT
		)`,
		`CREATE TABLE translation_assignments (
			assignment_id TEXT PRIMARY KEY,
			tenant_id TEXT,
			org_id TEXT,
			family_id TEXT NOT NULL REFERENCES content_families(family_id) ON DELETE CASCADE,
			variant_id TEXT,
			entity_type TEXT,
			source_record_id TEXT,
			source_locale TEXT,
			target_locale TEXT NOT NULL,
			target_record_id TEXT,
			source_title TEXT,
			source_path TEXT,
			work_scope TEXT,
			assignment_type TEXT,
			status TEXT,
			assignee_id TEXT,
			reviewer_id TEXT,
			assigner_id TEXT,
			last_reviewer_id TEXT,
			last_rejection_reason TEXT,
			priority TEXT,
			due_date TEXT,
			row_version BIGINT,
			claimed_at TEXT,
			submitted_at TEXT,
			approved_at TEXT,
			published_at TEXT,
			archived_at TEXT,
			created_at TEXT,
			updated_at TEXT,
			FOREIGN KEY (variant_id, family_id, target_locale)
				REFERENCES locale_variants(variant_id, family_id, locale)
				ON UPDATE CASCADE
				ON DELETE CASCADE
		)`,
	}
	for _, statement := range statements {
		if _, err := db.Exec(statement); err != nil {
			t.Fatalf("create schema: %v", err)
		}
	}
	return db
}
