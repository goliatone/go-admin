package admin

import (
	"context"
	"errors"
	"testing"
	"time"

	translationservices "github.com/goliatone/go-admin/translations/services"
)

func TestInMemoryTranslationAssignmentRepositoryCreateEnforcesActiveUniqueness(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()

	created, err := repo.Create(ctx, TranslationAssignment{
		FamilyID:       "tg_123",
		EntityType:     "pages",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create first assignment: %v", err)
	}

	_, err = repo.Create(ctx, TranslationAssignment{
		FamilyID:       "tg_123",
		EntityType:     "pages",
		SourceRecordID: "page_2",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		Priority:       PriorityHigh,
	})
	if err == nil {
		t.Fatalf("expected uniqueness conflict")
	}

	if !errors.Is(err, ErrTranslationAssignmentConflict) {
		t.Fatalf("expected ErrTranslationAssignmentConflict, got %v", err)
	}

	var conflict TranslationAssignmentConflictError
	if !errors.As(err, &conflict) {
		t.Fatalf("expected TranslationAssignmentConflictError, got %T", err)
	}
	if conflict.ExistingAssignmentID != created.ID {
		t.Fatalf("expected existing id %q, got %q", created.ID, conflict.ExistingAssignmentID)
	}
}

func TestInMemoryTranslationAssignmentRepositoryCreateOrReuseActiveIsIdempotent(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()

	first, created, err := repo.CreateOrReuseActive(ctx, TranslationAssignment{
		FamilyID:       "tg_123",
		EntityType:     "pages",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		SourceTitle:    "First title",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create/reuse first assignment: %v", err)
	}
	if !created {
		t.Fatalf("expected first create/reuse call to create a record")
	}

	second, created, err := repo.CreateOrReuseActive(ctx, TranslationAssignment{
		FamilyID:       "tg_123",
		EntityType:     "pages",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		SourceTitle:    "Updated title",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityHigh,
	})
	if err != nil {
		t.Fatalf("create/reuse duplicate assignment: %v", err)
	}
	if created {
		t.Fatalf("expected second create/reuse call to reuse existing record")
	}
	if second.ID != first.ID {
		t.Fatalf("expected reused id %q, got %q", first.ID, second.ID)
	}
	if second.SourceTitle != "Updated title" {
		t.Fatalf("expected refreshed source title, got %q", second.SourceTitle)
	}
	if second.Priority != PriorityHigh {
		t.Fatalf("expected refreshed priority high, got %q", second.Priority)
	}
	if second.Version <= first.Version {
		t.Fatalf("expected reused assignment version to increment, got first=%d second=%d", first.Version, second.Version)
	}
}

func TestInMemoryTranslationAssignmentRepositoryUpdateVersionConflict(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()

	created, err := repo.Create(ctx, TranslationAssignment{
		FamilyID:       "tg_123",
		EntityType:     "pages",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}

	created.Status = AssignmentStatusInProgress
	_, err = repo.Update(ctx, created, created.Version-1)
	if err == nil {
		t.Fatalf("expected version conflict")
	}
	if !errors.Is(err, ErrTranslationAssignmentVersionConflict) {
		t.Fatalf("expected ErrTranslationAssignmentVersionConflict, got %v", err)
	}
}

func TestInMemoryTranslationAssignmentRepositoryArchiveReleasesActiveKey(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()

	created, err := repo.Create(ctx, TranslationAssignment{
		FamilyID:       "tg_123",
		EntityType:     "posts",
		SourceRecordID: "post_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}

	created.Status = AssignmentStatusArchived
	archived, err := repo.Update(ctx, created, created.Version)
	if err != nil {
		t.Fatalf("archive assignment: %v", err)
	}
	if archived.Status != AssignmentStatusArchived {
		t.Fatalf("expected archived status, got %q", archived.Status)
	}

	_, err = repo.Create(ctx, TranslationAssignment{
		FamilyID:       "tg_123",
		EntityType:     "posts",
		SourceRecordID: "post_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("expected new active assignment after archive, got %v", err)
	}
}

func TestInMemoryTranslationAssignmentRepositoryAllowsConcurrentActiveAssignmentsAcrossWorkScopes(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()

	if _, err := repo.Create(ctx, TranslationAssignment{
		FamilyID:       "tg_123",
		EntityType:     "pages",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		WorkScope:      "__all__",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	}); err != nil {
		t.Fatalf("create __all__ assignment: %v", err)
	}

	if _, err := repo.Create(ctx, TranslationAssignment{
		FamilyID:       "tg_123",
		EntityType:     "pages",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		WorkScope:      "editorial.review",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	}); err != nil {
		t.Fatalf("expected separate work_scope assignment to succeed, got %v", err)
	}
}

func TestBunTranslationAssignmentRepositoryListFiltersSortsAndCountsInSQL(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	store := NewBunTranslationFamilyStore(db)
	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-sql",
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "family-sql::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{
			{ID: "family-sql::en", FamilyID: "family-sql", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: "published", IsSource: true, SourceRecordID: "page-1"},
			{ID: "family-sql::es", FamilyID: "family-sql", TenantID: "tenant-1", OrgID: "org-1", Locale: "es", Status: "draft", SourceRecordID: "page-1"},
			{ID: "family-sql::fr", FamilyID: "family-sql", TenantID: "tenant-1", OrgID: "org-1", Locale: "fr", Status: "draft", SourceRecordID: "page-1"},
		},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}
	repo := NewBunTranslationAssignmentRepository(db)
	overdue := time.Now().UTC().Add(-2 * time.Hour)
	future := time.Now().UTC().Add(72 * time.Hour)
	for _, assignment := range []TranslationAssignment{
		{ID: "asg-sql-1", FamilyID: "family-sql", EntityType: "pages", TenantID: "tenant-1", OrgID: "org-1", SourceRecordID: "page-1", SourceLocale: "en", TargetLocale: "es", SourceTitle: "Avalokiteshvara", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusInProgress, AssigneeID: "translator-1", ReviewerID: "reviewer-1", Priority: PriorityUrgent, DueDate: &overdue},
		{ID: "asg-sql-2", FamilyID: "family-sql", EntityType: "pages", TenantID: "tenant-1", OrgID: "org-1", SourceRecordID: "page-1", SourceLocale: "en", TargetLocale: "fr", SourceTitle: "Other", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusAssigned, AssigneeID: "translator-1", ReviewerID: "reviewer-2", Priority: PriorityLow, DueDate: &future},
	} {
		if _, err := repo.Create(ctx, assignment); err != nil {
			t.Fatalf("create assignment %s: %v", assignment.ID, err)
		}
	}

	items, total, err := repo.List(ctx, ListOptions{
		Page:    1,
		PerPage: 1,
		SortBy:  "due_date",
		Filters: map[string]any{
			"tenant_id":        "tenant-1",
			"org_id":           "org-1",
			"assignee_id":      "translator-1",
			"target_locale":    "es,fr",
			"source_locale":    "en",
			"entity_type":      "pages",
			"source_record_id": "page-1",
			"_search":          "avalok",
		},
	})
	if err != nil {
		t.Fatalf("list assignments: %v", err)
	}
	if total != 1 {
		t.Fatalf("total=%d want=1", total)
	}
	if len(items) != 1 || items[0].ID != "asg-sql-1" {
		t.Fatalf("items=%+v want asg-sql-1", items)
	}
}

func TestBunAssignmentFilterValuesPreserveIndexedScopeIDs(t *testing.T) {
	values := normalizedBunAssignmentFilterValues("tenant_id", "Tenant-A,tenant-b")
	if len(values) != 2 || values[0] != "Tenant-A" || values[1] != "tenant-b" {
		t.Fatalf("expected scope IDs to keep caller casing for raw-column index predicates, got %+v", values)
	}
	statusValues := normalizedBunAssignmentFilterValues("status", "Assigned,IN_REVIEW")
	if len(statusValues) != 2 || statusValues[0] != string(AssignmentStatusAssigned) || statusValues[1] != string(AssignmentStatusInReview) {
		t.Fatalf("expected status values normalized to stored enum values, got %+v", statusValues)
	}
	localeValues := normalizedBunAssignmentFilterValues("target_locale", "ES, fr ")
	if len(localeValues) != 2 || localeValues[0] != "es" || localeValues[1] != "fr" {
		t.Fatalf("expected locale values normalized for stored locale columns, got %+v", localeValues)
	}
}

func TestBunAssignmentStorageDateValueIsIndexSortableUTCText(t *testing.T) {
	pacific := time.FixedZone("PST", -8*60*60)
	value := time.Date(2026, 2, 17, 4, 30, 0, 0, pacific)
	if got := bunAssignmentStorageDateValue(value); got != "2026-02-17 12:30:00" {
		t.Fatalf("expected UTC sortable storage value, got %q", got)
	}
	if got := queueTimePtr("2026-02-17 12:30:00+00:00"); got == nil || !got.Equal(value.UTC()) {
		t.Fatalf("expected existing Postgres text timestamp to parse as UTC, got %#v", got)
	}
}

func TestBunTranslationAssignmentRepositoryListAssignmentPageUsesInjectedClockForDueState(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	store := NewBunTranslationFamilyStore(db)
	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-clock",
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "family-clock::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{
			{ID: "family-clock::en", FamilyID: "family-clock", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: "published", IsSource: true, SourceRecordID: "page-clock"},
			{ID: "family-clock::es", FamilyID: "family-clock", TenantID: "tenant-1", OrgID: "org-1", Locale: "es", Status: "draft", SourceRecordID: "page-clock"},
		},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}
	repo := NewBunTranslationAssignmentRepository(db)
	queryNow := time.Date(2030, 1, 2, 12, 0, 0, 0, time.UTC)
	due := queryNow.Add(-time.Hour)
	if _, err := repo.Create(ctx, TranslationAssignment{
		ID:             "asg-clock-overdue",
		FamilyID:       "family-clock",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-clock",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		Priority:       PriorityNormal,
		DueDate:        &due,
	}); err != nil {
		t.Fatalf("seed assignment: %v", err)
	}

	result, err := repo.ListAssignmentPage(ctx, TranslationAssignmentPageQueryInput{
		Filter: translationAssignmentListFilter{
			TenantID:   "tenant-1",
			OrgID:      "org-1",
			DueState:   translationQueueDueStateOverdue,
			SortBy:     "due_date",
			SortDesc:   false,
			ReviewerID: "",
		},
		Page:    1,
		PerPage: 10,
		Now:     queryNow,
	})
	if err != nil {
		t.Fatalf("list assignment page: %v", err)
	}
	if result.Total != 1 || len(result.Items) != 1 || result.Items[0].ID != "asg-clock-overdue" {
		t.Fatalf("expected overdue assignment using injected clock, got total=%d items=%+v", result.Total, result.Items)
	}
}

func TestBunTranslationAssignmentRepositoryFamilyGroupingAggregatesAndExpands(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	store := NewBunTranslationFamilyStore(db)
	for _, family := range []translationservices.FamilyRecord{
		{
			ID:              "family-grouped-a",
			TenantID:        "tenant-1",
			OrgID:           "org-1",
			ContentType:     "pages",
			SourceLocale:    "en",
			SourceVariantID: "family-grouped-a::en",
			ReadinessState:  "blocked",
			Variants: []translationservices.FamilyVariant{
				{ID: "family-grouped-a::en", FamilyID: "family-grouped-a", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: "published", IsSource: true, SourceRecordID: "page-a"},
				{ID: "family-grouped-a::es", FamilyID: "family-grouped-a", TenantID: "tenant-1", OrgID: "org-1", Locale: "es", Status: "draft", SourceRecordID: "page-a"},
				{ID: "family-grouped-a::fr", FamilyID: "family-grouped-a", TenantID: "tenant-1", OrgID: "org-1", Locale: "fr", Status: "draft", SourceRecordID: "page-a"},
			},
		},
		{
			ID:              "family-grouped-b",
			TenantID:        "tenant-1",
			OrgID:           "org-1",
			ContentType:     "posts",
			SourceLocale:    "en",
			SourceVariantID: "family-grouped-b::en",
			ReadinessState:  "ready",
			Variants: []translationservices.FamilyVariant{
				{ID: "family-grouped-b::en", FamilyID: "family-grouped-b", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: "published", IsSource: true, SourceRecordID: "post-b"},
				{ID: "family-grouped-b::de", FamilyID: "family-grouped-b", TenantID: "tenant-1", OrgID: "org-1", Locale: "de", Status: "draft", SourceRecordID: "post-b"},
			},
		},
	} {
		if err := store.SaveFamily(ctx, family); err != nil {
			t.Fatalf("seed family %s: %v", family.ID, err)
		}
	}
	repo := NewBunTranslationAssignmentRepository(db)
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	dueSoon := now.Add(time.Hour)
	for _, assignment := range []TranslationAssignment{
		{ID: "asg-family-a-es", FamilyID: "family-grouped-a", EntityType: "pages", TenantID: "tenant-1", OrgID: "org-1", SourceRecordID: "page-a", SourceLocale: "en", TargetLocale: "es", SourceTitle: "Page A", AssignmentType: AssignmentTypeOpenPool, Status: AssignmentStatusOpen, Priority: PriorityHigh, DueDate: &dueSoon, UpdatedAt: now.Add(-time.Hour), CreatedAt: now.Add(-3 * time.Hour)},
		{ID: "asg-family-a-fr", FamilyID: "family-grouped-a", EntityType: "pages", TenantID: "tenant-1", OrgID: "org-1", SourceRecordID: "page-a", SourceLocale: "en", TargetLocale: "fr", SourceTitle: "Page A", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusInReview, Priority: PriorityNormal, ReviewerID: "reviewer-1", UpdatedAt: now.Add(-30 * time.Minute), CreatedAt: now.Add(-2 * time.Hour)},
		{ID: "asg-family-b-de", FamilyID: "family-grouped-b", EntityType: "posts", TenantID: "tenant-1", OrgID: "org-1", SourceRecordID: "post-b", SourceLocale: "en", TargetLocale: "de", SourceTitle: "Post B", AssignmentType: AssignmentTypeOpenPool, Status: AssignmentStatusOpen, Priority: PriorityLow, UpdatedAt: now.Add(-4 * time.Hour), CreatedAt: now.Add(-4 * time.Hour)},
	} {
		if _, err := repo.Create(ctx, assignment); err != nil {
			t.Fatalf("create assignment %s: %v", assignment.ID, err)
		}
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO family_blockers (family_id, tenant_id, org_id, blocker_code, locale, field_path, details_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"family-grouped-a", "tenant-1", "org-1", "missing_locale", "fr", "", "{}", bunAssignmentStorageDateValue(now), bunAssignmentStorageDateValue(now)); err != nil {
		t.Fatalf("insert family blocker: %v", err)
	}

	result, err := repo.ListAssignmentFamilyGroups(ctx, TranslationAssignmentFamilyGroupQueryInput{
		Filter: translationAssignmentListFilter{
			TenantID: "tenant-1",
			OrgID:    "org-1",
			SortBy:   "due_date",
			SortDesc: false,
		},
		Page:    1,
		PerPage: 10,
		Now:     now,
	})
	if err != nil {
		t.Fatalf("list family groups: %v", err)
	}
	if result.FamilyTotal != 2 || result.AssignmentTotal != 3 || len(result.Families) != 2 {
		t.Fatalf("unexpected family totals: %+v", result)
	}
	first := result.Families[0]
	if first.FamilyID != "family-grouped-a" || first.AssignmentCount != 2 || first.LocaleCount != 2 {
		t.Fatalf("expected family-grouped-a aggregate first, got %+v", first)
	}
	if first.FamilyBlockerCount == nil || *first.FamilyBlockerCount != 1 || !first.FamilyBlockerCountAvailable {
		t.Fatalf("expected persisted blocker count on first family, got %+v", first)
	}

	blocked, err := repo.ListAssignmentFamilyGroups(ctx, TranslationAssignmentFamilyGroupQueryInput{
		Filter: translationAssignmentListFilter{
			TenantID:    "tenant-1",
			OrgID:       "org-1",
			ReviewState: translationQueueReviewStateQABlocked,
			SortBy:      "due_date",
			SortDesc:    false,
		},
		Page:    1,
		PerPage: 10,
		Now:     now,
	})
	if err != nil {
		t.Fatalf("list blocked family groups: %v", err)
	}
	if blocked.FamilyTotal != 1 || blocked.AssignmentTotal != 2 || len(blocked.Families) != 1 || blocked.Families[0].FamilyID != "family-grouped-a" {
		t.Fatalf("expected qa_blocked to use persisted blocker scope, got %+v", blocked)
	}

	children, err := repo.ListFamilyAssignments(ctx, TranslationAssignmentFamilyAssignmentsQueryInput{
		FamilyID: "family-grouped-a",
		Filter: translationAssignmentListFilter{
			TenantID: "tenant-1",
			OrgID:    "org-1",
			SortBy:   "updated_at",
			SortDesc: true,
		},
		Page:    1,
		PerPage: 1,
		Now:     now,
	})
	if err != nil {
		t.Fatalf("list family assignments: %v", err)
	}
	if children.Total != 2 || !children.HasNext || len(children.Items) != 1 || children.Items[0].ID != "asg-family-a-fr" {
		t.Fatalf("unexpected child assignment page: %+v", children)
	}
}

func TestBunTranslationAssignmentRepositoryFamilyGroupingDegradesWhenBlockerTableMissing(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	store := NewBunTranslationFamilyStore(db)
	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-no-blockers",
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "family-no-blockers::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{
			{ID: "family-no-blockers::en", FamilyID: "family-no-blockers", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: "published", IsSource: true, SourceRecordID: "page-no-blockers"},
			{ID: "family-no-blockers::es", FamilyID: "family-no-blockers", TenantID: "tenant-1", OrgID: "org-1", Locale: "es", Status: "draft", SourceRecordID: "page-no-blockers"},
		},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}
	if _, err := db.ExecContext(ctx, `DROP TABLE family_blockers`); err != nil {
		t.Fatalf("drop family_blockers: %v", err)
	}
	repo := NewBunTranslationAssignmentRepository(db)
	if _, err := repo.Create(ctx, TranslationAssignment{
		ID:             "asg-no-blockers",
		FamilyID:       "family-no-blockers",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-no-blockers",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	}); err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	result, err := repo.ListAssignmentFamilyGroups(ctx, TranslationAssignmentFamilyGroupQueryInput{
		Filter: translationAssignmentListFilter{TenantID: "tenant-1", OrgID: "org-1", SortBy: "updated_at", SortDesc: true},
		Page:   1,
		Now:    time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("list family groups without blocker table: %v", err)
	}
	if len(result.Families) != 1 || result.Families[0].FamilyBlockerCountAvailable || result.Families[0].FamilyBlockerCountReason != "persisted_blockers_unavailable" {
		t.Fatalf("expected degraded blocker metadata, got %+v", result.Families)
	}
	_, err = repo.ListAssignmentFamilyGroups(ctx, TranslationAssignmentFamilyGroupQueryInput{
		Filter: translationAssignmentListFilter{TenantID: "tenant-1", OrgID: "org-1", ReviewState: translationQueueReviewStateQABlocked, SortBy: "updated_at", SortDesc: true},
		Page:   1,
		Now:    time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC),
	})
	if !errors.Is(err, ErrTranslationAssignmentFamilyBlockersUnavailable) {
		t.Fatalf("expected qa_blocked to fail without blocker table, got %v", err)
	}
}

func TestBunTranslationAssignmentRepositoryMyWorkSummaryPreservesStatusFilterReviewParity(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	store := NewBunTranslationFamilyStore(db)
	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-my-work-summary",
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "family-my-work-summary::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{
			{ID: "family-my-work-summary::en", FamilyID: "family-my-work-summary", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: "published", IsSource: true, SourceRecordID: "page-summary"},
			{ID: "family-my-work-summary::es", FamilyID: "family-my-work-summary", TenantID: "tenant-1", OrgID: "org-1", Locale: "es", Status: "draft", SourceRecordID: "page-summary"},
			{ID: "family-my-work-summary::fr", FamilyID: "family-my-work-summary", TenantID: "tenant-1", OrgID: "org-1", Locale: "fr", Status: "draft", SourceRecordID: "page-summary"},
			{ID: "family-my-work-summary::de", FamilyID: "family-my-work-summary", TenantID: "tenant-1", OrgID: "org-1", Locale: "de", Status: "draft", SourceRecordID: "page-summary"},
		},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}
	repo := NewBunTranslationAssignmentRepository(db)
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	for _, assignment := range []TranslationAssignment{
		{ID: "asg-my-work-assigned", FamilyID: "family-my-work-summary", EntityType: "pages", TenantID: "tenant-1", OrgID: "org-1", SourceRecordID: "page-summary", SourceLocale: "en", TargetLocale: "es", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusAssigned, AssigneeID: "translator-1", Priority: PriorityNormal},
		{ID: "asg-my-work-review", FamilyID: "family-my-work-summary", EntityType: "pages", TenantID: "tenant-1", OrgID: "org-1", SourceRecordID: "page-summary", SourceLocale: "en", TargetLocale: "fr", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusInReview, AssigneeID: "translator-1", Priority: PriorityNormal},
		{ID: "asg-my-work-other", FamilyID: "family-my-work-summary", EntityType: "pages", TenantID: "tenant-1", OrgID: "org-1", SourceRecordID: "page-summary", SourceLocale: "en", TargetLocale: "de", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusInReview, AssigneeID: "translator-2", Priority: PriorityNormal},
	} {
		if _, err := repo.Create(ctx, assignment); err != nil {
			t.Fatalf("create assignment %s: %v", assignment.ID, err)
		}
	}

	assignedOnly, err := repo.AssignmentMyWorkSummary(ctx, TranslationAssignmentMyWorkSummaryInput{
		Filters: map[string]any{"tenant_id": "tenant-1", "org_id": "org-1", "assignee_id": "translator-1", "status": string(AssignmentStatusAssigned)},
		Now:     now,
	})
	if err != nil {
		t.Fatalf("assigned my-work summary: %v", err)
	}
	if assignedOnly["total"] != 1 || assignedOnly["review"] != 0 {
		t.Fatalf("expected assigned-only summary total=1 review=0, got %+v", assignedOnly)
	}

	assignedAndReview, err := repo.AssignmentMyWorkSummary(ctx, TranslationAssignmentMyWorkSummaryInput{
		Filters: map[string]any{"tenant_id": "tenant-1", "org_id": "org-1", "assignee_id": "translator-1", "status": string(AssignmentStatusAssigned) + "," + string(AssignmentStatusInReview)},
		Now:     now,
	})
	if err != nil {
		t.Fatalf("multi-status my-work summary: %v", err)
	}
	if assignedAndReview["total"] != 2 || assignedAndReview["review"] != 1 {
		t.Fatalf("expected multi-status summary total=2 review=1, got %+v", assignedAndReview)
	}
}

func TestBunTranslationAssignmentRepositoryReviewerAggregateDeclinesQABlockedPlaceholder(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	repo := NewBunTranslationAssignmentRepository(db)

	counts, err := repo.AssignmentReviewerAggregateCounts(context.Background(), TranslationAssignmentReviewerAggregateInput{
		TenantID: "tenant-1",
		OrgID:    "org-1",
		ActorID:  "reviewer-1",
		Now:      time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC),
	})
	if !errors.Is(err, ErrTranslationAssignmentQueryUnsupported) {
		t.Fatalf("expected reviewer aggregate query to decline QA-blocked placeholder, got counts=%+v err=%v", counts, err)
	}
	for _, key := range TranslationQueueReviewAggregateCountKeys() {
		if _, ok := counts[key]; !ok {
			t.Fatalf("expected initialized count key %q in %+v", key, counts)
		}
	}
}

func TestInMemoryTranslationAssignmentRepositoryApprovedAssignmentsDoNotOccupyActiveKey(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()

	if _, err := repo.Create(ctx, TranslationAssignment{
		FamilyID:       "tg_123",
		EntityType:     "pages",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		WorkScope:      "__all__",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusApproved,
		Priority:       PriorityNormal,
	}); err != nil {
		t.Fatalf("create approved assignment: %v", err)
	}

	if _, err := repo.Create(ctx, TranslationAssignment{
		FamilyID:       "tg_123",
		EntityType:     "pages",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		WorkScope:      "__all__",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	}); err != nil {
		t.Fatalf("expected approved assignment not to block new active assignment, got %v", err)
	}
}
