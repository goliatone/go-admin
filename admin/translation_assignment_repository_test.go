package admin

import (
	"context"
	"database/sql"
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

func TestInMemoryTranslationAssignmentRepositoryAssignedAtCreateAndReuse(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()

	direct, err := repo.Create(ctx, TranslationAssignment{
		FamilyID:       "tg-assigned-at-create",
		EntityType:     "pages",
		SourceRecordID: "page-assigned-at-create",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		AssigneeID:     "translator-1",
		AssignerID:     "manager-1",
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create direct assignment: %v", err)
	}
	if direct.AssignedAt == nil {
		t.Fatalf("expected assigned_at on direct assignment create")
	}

	open, created, err := repo.CreateOrReuseActive(ctx, TranslationAssignment{
		FamilyID:       "tg-assigned-at-reuse",
		EntityType:     "pages",
		SourceRecordID: "page-assigned-at-reuse",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create open assignment: %v", err)
	}
	if !created {
		t.Fatalf("expected first create/reuse to create")
	}
	if open.AssignedAt != nil {
		t.Fatalf("expected open assignment assigned_at to stay nil")
	}

	reused, created, err := repo.CreateOrReuseActive(ctx, TranslationAssignment{
		FamilyID:       "tg-assigned-at-reuse",
		EntityType:     "pages",
		SourceRecordID: "page-assigned-at-reuse",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		AssigneeID:     "translator-2",
		AssignerID:     "manager-2",
		Priority:       PriorityHigh,
	})
	if err != nil {
		t.Fatalf("reuse as direct assignment: %v", err)
	}
	if created {
		t.Fatalf("expected active assignment to be reused")
	}
	if reused.ID != open.ID || reused.Status != AssignmentStatusAssigned || reused.AssignmentType != AssignmentTypeDirect || reused.AssigneeID != "translator-2" {
		t.Fatalf("expected reused direct assignment, got %+v", reused)
	}
	if reused.AssignedAt == nil {
		t.Fatalf("expected assigned_at on direct reuse")
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

func TestInMemoryTranslationAssignmentRepositoryAllowsConcurrentActiveAssignmentsAcrossScopes(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()

	base := TranslationAssignment{
		FamilyID:       "tg_123",
		EntityType:     "pages",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		WorkScope:      "__all__",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	}
	first := base
	first.TenantID = "tenant-1"
	first.OrgID = "org-1"
	if _, err := repo.Create(ctx, first); err != nil {
		t.Fatalf("create tenant-1 assignment: %v", err)
	}

	second := base
	second.TenantID = "tenant-2"
	second.OrgID = "org-2"
	if _, err := repo.Create(ctx, second); err != nil {
		t.Fatalf("expected separate tenant/org assignment to succeed, got %v", err)
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

	entityTypes, err := repo.DistinctAssignmentEntityTypes(ctx)
	if err != nil {
		t.Fatalf("distinct entity types: %v", err)
	}
	if len(entityTypes) != 1 || entityTypes[0] != "pages" {
		t.Fatalf("expected distinct entity type pages, got %+v", entityTypes)
	}
	locales, err := repo.DistinctAssignmentLocales(ctx, map[string]any{
		"entity_type":      "pages",
		"source_record_id": "page-1",
	})
	if err != nil {
		t.Fatalf("distinct locales: %v", err)
	}
	if len(locales) != 3 || locales[0] != "en" || locales[1] != "es" || locales[2] != "fr" {
		t.Fatalf("expected distinct locales en/es/fr, got %+v", locales)
	}
	groups, err := repo.DistinctAssignmentTranslationGroups(ctx, map[string]any{
		"entity_type":      "pages",
		"source_record_id": "page-1",
	})
	if err != nil {
		t.Fatalf("distinct translation groups: %v", err)
	}
	if len(groups) != 1 || groups[0].FamilyID != "family-sql" || groups[0].SourceTitle == "" {
		t.Fatalf("expected distinct family-sql group with title, got %+v", groups)
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
	// Slice filters (family detail passes a []string status list) must not be
	// flattened through fmt.Sprint into a single garbage token.
	sliceStatusValues := normalizedBunAssignmentFilterValues("status", translationFamilyActiveAssignmentStatusFilter())
	if len(sliceStatusValues) != 5 {
		t.Fatalf("expected all active statuses preserved from slice filter, got %+v", sliceStatusValues)
	}
	if sliceStatusValues[1] != string(AssignmentStatusAssigned) || sliceStatusValues[4] != string(AssignmentStatusChangesRequested) {
		t.Fatalf("expected normalized status enum values from slice filter, got %+v", sliceStatusValues)
	}
}

func TestBunTranslationAssignmentRepositoryListSupportsStatusSliceFilter(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	store := NewBunTranslationFamilyStore(db)
	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-slice",
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "family-slice::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{
			{ID: "family-slice::en", FamilyID: "family-slice", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: "published", IsSource: true, SourceRecordID: "page-1"},
			{ID: "family-slice::es", FamilyID: "family-slice", TenantID: "tenant-1", OrgID: "org-1", Locale: "es", Status: "draft", SourceRecordID: "page-1"},
			{ID: "family-slice::fr", FamilyID: "family-slice", TenantID: "tenant-1", OrgID: "org-1", Locale: "fr", Status: "draft", SourceRecordID: "page-1"},
		},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}
	repo := NewBunTranslationAssignmentRepository(db)
	for _, assignment := range []TranslationAssignment{
		{ID: "asg-slice-1", FamilyID: "family-slice", EntityType: "pages", TenantID: "tenant-1", OrgID: "org-1", SourceRecordID: "page-1", SourceLocale: "en", TargetLocale: "fr", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusAssigned, AssigneeID: "translator-1"},
		{ID: "asg-slice-2", FamilyID: "family-slice", EntityType: "pages", TenantID: "tenant-1", OrgID: "org-1", SourceRecordID: "page-1", SourceLocale: "en", TargetLocale: "es", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusArchived, AssigneeID: "translator-1"},
	} {
		if _, err := repo.Create(ctx, assignment); err != nil {
			t.Fatalf("create assignment %s: %v", assignment.ID, err)
		}
	}
	items, total, err := repo.List(ctx, ListOptions{
		Page:    1,
		PerPage: 10,
		Filters: map[string]any{
			"tenant_id": "tenant-1",
			"org_id":    "org-1",
			"family_id": "family-slice",
			"status":    translationFamilyActiveAssignmentStatusFilter(),
		},
	})
	if err != nil {
		t.Fatalf("list assignments: %v", err)
	}
	if total != 1 || len(items) != 1 || items[0].ID != "asg-slice-1" {
		t.Fatalf("expected only the active assignment via status slice filter, got total=%d items=%+v", total, items)
	}
}

func TestBunTranslationAssignmentRepositoryCloneAssignmentFilterMapReturnsMutableMapForEmptyInputs(t *testing.T) {
	cases := map[string]map[string]any{
		"nil":   nil,
		"empty": {},
	}
	for name, input := range cases {
		t.Run(name, func(t *testing.T) {
			cloned := cloneAssignmentFilterMap(input)
			if cloned == nil {
				t.Fatalf("expected mutable map, got nil")
			}
			cloned["due_state"] = translationQueueDueStateOverdue
			if got := toString(cloned["due_state"]); got != translationQueueDueStateOverdue {
				t.Fatalf("expected cloned map to accept writes, got %q", got)
			}
		})
	}

	input := map[string]any{"tenant_id": "tenant-1"}
	cloned := cloneAssignmentFilterMap(input)
	cloned["org_id"] = "org-1"
	if got := toString(cloned["tenant_id"]); got != "tenant-1" {
		t.Fatalf("expected tenant_id to be copied, got %q", got)
	}
	if _, ok := input["org_id"]; ok {
		t.Fatalf("expected clone mutation not to modify input map: %+v", input)
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

func TestBunTranslationAssignmentRepositoryListAssignmentPageClampsOutOfRangePage(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	store := NewBunTranslationFamilyStore(db)
	familyRecord := func(id, targetLocale, sourceRecordID string) translationservices.FamilyRecord {
		return translationservices.FamilyRecord{
			ID:              id,
			ContentType:     "pages",
			SourceLocale:    "en",
			SourceVariantID: id + "::en",
			ReadinessState:  "ready",
			Variants: []translationservices.FamilyVariant{
				{ID: id + "::en", FamilyID: id, Locale: "en", Status: "published", IsSource: true, SourceRecordID: sourceRecordID},
				{ID: id + "::" + targetLocale, FamilyID: id, Locale: targetLocale, Status: "draft", SourceRecordID: sourceRecordID},
			},
		}
	}
	for _, family := range []translationservices.FamilyRecord{
		familyRecord("family-page-1", "es", "page-1"),
		familyRecord("family-page-2", "fr", "page-2"),
		familyRecord("family-page-3", "de", "page-3"),
	} {
		if err := store.SaveFamily(ctx, family); err != nil {
			t.Fatalf("seed family %s: %v", family.ID, err)
		}
	}
	repo := NewBunTranslationAssignmentRepository(db)
	for _, assignment := range []TranslationAssignment{
		{ID: "asg-page-1", FamilyID: "family-page-1", EntityType: "pages", SourceRecordID: "page-1", SourceLocale: "en", TargetLocale: "es", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusAssigned, Priority: PriorityNormal},
		{ID: "asg-page-2", FamilyID: "family-page-2", EntityType: "pages", SourceRecordID: "page-2", SourceLocale: "en", TargetLocale: "fr", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusAssigned, Priority: PriorityNormal},
		{ID: "asg-page-3", FamilyID: "family-page-3", EntityType: "pages", SourceRecordID: "page-3", SourceLocale: "en", TargetLocale: "de", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusAssigned, Priority: PriorityNormal},
	} {
		if _, err := repo.Create(ctx, assignment); err != nil {
			t.Fatalf("seed assignment %s: %v", assignment.ID, err)
		}
	}

	result, err := repo.ListAssignmentPage(ctx, TranslationAssignmentPageQueryInput{
		Filter: translationAssignmentListFilter{
			EntityType: "pages",
			SortBy:     "updated_at",
			SortDesc:   false,
		},
		Page:    99,
		PerPage: 2,
	})
	if err != nil {
		t.Fatalf("list assignment page: %v", err)
	}
	if result.Total != 3 || len(result.Items) != 1 {
		t.Fatalf("expected out-of-range page to return final page, total=%d items=%+v", result.Total, result.Items)
	}
}

func TestBunTranslationAssignmentRepositoryDashboardSummaryAllowsUnscopedScope(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	store := NewBunTranslationFamilyStore(db)
	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-dashboard-unscoped",
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "family-dashboard-unscoped::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{
			{ID: "family-dashboard-unscoped::en", FamilyID: "family-dashboard-unscoped", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: "published", IsSource: true, SourceRecordID: "page-dashboard-unscoped"},
			{ID: "family-dashboard-unscoped::es", FamilyID: "family-dashboard-unscoped", TenantID: "tenant-1", OrgID: "org-1", Locale: "es", Status: "draft", SourceRecordID: "page-dashboard-unscoped"},
		},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}
	repo := NewBunTranslationAssignmentRepository(db)
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	overdue := now.Add(-time.Hour)
	if _, err := repo.Create(ctx, TranslationAssignment{
		ID:             "asg-dashboard-unscoped",
		FamilyID:       "family-dashboard-unscoped",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-dashboard-unscoped",
		SourceTitle:    "Dashboard Unscoped",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssigneeID:     "manager-1",
		ReviewerID:     "manager-1",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInReview,
		Priority:       PriorityHigh,
		DueDate:        &overdue,
	}); err != nil {
		t.Fatalf("seed assignment: %v", err)
	}
	if _, err := repo.Create(ctx, TranslationAssignment{
		ID:             "asg-dashboard-approved-overdue",
		FamilyID:       "family-dashboard-unscoped",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-dashboard-unscoped",
		SourceTitle:    "Dashboard Approved",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		AssigneeID:     "manager-1",
		ReviewerID:     "manager-1",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusApproved,
		Priority:       PriorityUrgent,
		DueDate:        &overdue,
	}); err != nil {
		t.Fatalf("seed approved assignment: %v", err)
	}

	t.Run("actor present", func(t *testing.T) {
		summary, err := repo.AssignmentDashboardSummary(ctx, TranslationAssignmentDashboardSummaryInput{
			ActorID:      "manager-1",
			Now:          now,
			OverdueLimit: 5,
		})
		if err != nil {
			t.Fatalf("dashboard summary: %v", err)
		}
		if summary.MyTasks != 1 || summary.NeedsReview != 1 {
			t.Fatalf("expected actor aggregates to use unscoped mutable filters, got %+v", summary)
		}
		if summary.OverdueTasks != 1 || summary.HighPriorityOverdue != 1 {
			t.Fatalf("expected overdue aggregates for unscoped summary, got %+v", summary)
		}
		if len(summary.TopOverdue) != 1 || summary.TopOverdue[0].ID != "asg-dashboard-unscoped" {
			t.Fatalf("expected top overdue assignment, got %+v", summary.TopOverdue)
		}
	})

	t.Run("actor empty", func(t *testing.T) {
		summary, err := repo.AssignmentDashboardSummary(ctx, TranslationAssignmentDashboardSummaryInput{
			Now:          now,
			OverdueLimit: 5,
		})
		if err != nil {
			t.Fatalf("dashboard summary: %v", err)
		}
		if summary.MyTasks != 0 || summary.NeedsReview != 0 {
			t.Fatalf("expected actor aggregates to be skipped without actor, got %+v", summary)
		}
		if summary.OverdueTasks != 1 || summary.HighPriorityOverdue != 1 {
			t.Fatalf("expected overdue aggregates for actor-empty unscoped summary, got %+v", summary)
		}
		if len(summary.TopOverdue) != 1 || summary.TopOverdue[0].ID != "asg-dashboard-unscoped" {
			t.Fatalf("expected top overdue assignment, got %+v", summary.TopOverdue)
		}
	})
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
	if _, err := db.ExecContext(ctx, `INSERT INTO family_blockers (family_id, tenant_id, org_id, blocker_code, locale, field_path, details_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"family-grouped-b", "tenant-2", "org-9", "missing_locale", "de", "", "{}", bunAssignmentStorageDateValue(now), bunAssignmentStorageDateValue(now)); err != nil {
		t.Fatalf("insert wrong-scope family blocker: %v", err)
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
	var familyB TranslationAssignmentFamilyGroup
	for _, group := range result.Families {
		if group.FamilyID == "family-grouped-b" {
			familyB = group
			break
		}
	}
	if familyB.FamilyID == "" {
		t.Fatalf("expected family-grouped-b in grouped results, got %+v", result.Families)
	}
	if familyB.FamilyBlockerCount == nil || *familyB.FamilyBlockerCount != 0 || !familyB.FamilyBlockerCountAvailable {
		t.Fatalf("expected wrong-scope blocker to be excluded from family-grouped-b count, got %+v", familyB)
	}

	outOfRangeGroups, err := repo.ListAssignmentFamilyGroups(ctx, TranslationAssignmentFamilyGroupQueryInput{
		Filter: translationAssignmentListFilter{
			TenantID: "tenant-1",
			OrgID:    "org-1",
			SortBy:   "created_at",
			SortDesc: true,
		},
		Page:    99,
		PerPage: 1,
		Now:     now,
	})
	if err != nil {
		t.Fatalf("list out-of-range family groups: %v", err)
	}
	if outOfRangeGroups.FamilyTotal != 2 || outOfRangeGroups.AssignmentTotal != 3 || len(outOfRangeGroups.Families) != 1 || outOfRangeGroups.Families[0].FamilyID != "family-grouped-b" {
		t.Fatalf("expected out-of-range family groups to clamp to final family page, got %+v", outOfRangeGroups)
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
			SortBy:   "created_at",
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

	outOfRangeChildren, err := repo.ListFamilyAssignments(ctx, TranslationAssignmentFamilyAssignmentsQueryInput{
		FamilyID: "family-grouped-a",
		Filter: translationAssignmentListFilter{
			TenantID: "tenant-1",
			OrgID:    "org-1",
			SortBy:   "updated_at",
			SortDesc: true,
		},
		Page:    99,
		PerPage: 1,
		Now:     now,
	})
	if err != nil {
		t.Fatalf("list out-of-range family assignments: %v", err)
	}
	if outOfRangeChildren.Total != 2 || outOfRangeChildren.HasNext || len(outOfRangeChildren.Items) != 1 || outOfRangeChildren.Items[0].ID != "asg-family-a-es" {
		t.Fatalf("expected out-of-range child assignments to clamp to final child page, got %+v", outOfRangeChildren)
	}
}

func TestBunTranslationAssignmentRepositoryCreateResolvesVariantIDWithinScope(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	if _, err := db.NewInsert().Model(&bunTranslationFamilyRecord{
		FamilyID:       "family-variant-scope",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		ContentType:    "pages",
		SourceLocale:   "en",
		ReadinessState: "ready",
		CreatedAt:      now,
		UpdatedAt:      now,
	}).Exec(ctx); err != nil {
		t.Fatalf("seed scoped family: %v", err)
	}
	if _, err := db.NewInsert().Model(&bunTranslationLocaleVariantRecord{
		VariantID:      "family-variant-scope::fr-wrong-scope",
		FamilyID:       "family-variant-scope",
		TenantID:       "tenant-2",
		OrgID:          "org-9",
		Locale:         "fr",
		Status:         "draft",
		SourceRecordID: "wrong-scope-target",
		FieldsJSON:     "{}",
		CreatedAt:      now,
		UpdatedAt:      now,
	}).Exec(ctx); err != nil {
		t.Fatalf("seed wrong-scope variant: %v", err)
	}

	repo := NewBunTranslationAssignmentRepository(db)
	created, err := repo.Create(ctx, TranslationAssignment{
		ID:             "asg-variant-scope",
		FamilyID:       "family-variant-scope",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-variant-scope",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		SourceTitle:    "Scoped page",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
		CreatedAt:      now,
		UpdatedAt:      now,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if created.VariantID != "" {
		t.Fatalf("expected wrong-scope variant not to be linked, got %+v", created)
	}
}

func TestBunTranslationAssignmentRepositoryCreateDoesNotUseTargetRecordAsVariantIDWhenScopedVariantMissing(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	if _, err := db.NewInsert().Model(&bunTranslationFamilyRecord{
		FamilyID:       "family-missing-scoped-variant",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		ContentType:    "pages",
		SourceLocale:   "en",
		ReadinessState: "ready",
		CreatedAt:      now,
		UpdatedAt:      now,
	}).Exec(ctx); err != nil {
		t.Fatalf("seed scoped family: %v", err)
	}
	if _, err := db.NewInsert().Model(&bunTranslationLocaleVariantRecord{
		VariantID:      "family-missing-scoped-variant::fr-wrong-scope",
		FamilyID:       "family-missing-scoped-variant",
		TenantID:       "tenant-2",
		OrgID:          "org-9",
		Locale:         "fr",
		Status:         "draft",
		SourceRecordID: "page-target-fr",
		FieldsJSON:     "{}",
		CreatedAt:      now,
		UpdatedAt:      now,
	}).Exec(ctx); err != nil {
		t.Fatalf("seed wrong-scope variant: %v", err)
	}

	repo := NewBunTranslationAssignmentRepository(db)
	created, err := repo.Create(ctx, TranslationAssignment{
		ID:             "asg-missing-scoped-variant",
		FamilyID:       "family-missing-scoped-variant",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-source",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		TargetRecordID: "page-target-fr",
		SourceTitle:    "Scoped page",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
		CreatedAt:      now,
		UpdatedAt:      now,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if created.VariantID != "" {
		t.Fatalf("expected unresolved variant_id to stay empty, got %+v", created)
	}
	if created.TargetRecordID != "page-target-fr" {
		t.Fatalf("expected target_record_id preserved, got %+v", created)
	}
	var stored sql.NullString
	if err := db.QueryRowContext(ctx, `SELECT variant_id FROM translation_assignments WHERE assignment_id = ?`, created.ID).Scan(&stored); err != nil {
		t.Fatalf("query stored variant_id: %v", err)
	}
	if stored.Valid {
		t.Fatalf("expected stored variant_id NULL when scoped variant is missing, got %q", stored.String)
	}
}

func TestBunTranslationAssignmentRepositoryAssignedAtRoundTrip(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	store := NewBunTranslationFamilyStore(db)
	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:              "family-assigned-at-round-trip",
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "family-assigned-at-round-trip::en",
		ReadinessState:  "ready",
		Variants: []translationservices.FamilyVariant{
			{ID: "family-assigned-at-round-trip::en", FamilyID: "family-assigned-at-round-trip", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: "published", IsSource: true, SourceRecordID: "page-assigned-at"},
			{ID: "family-assigned-at-round-trip::es", FamilyID: "family-assigned-at-round-trip", TenantID: "tenant-1", OrgID: "org-1", Locale: "es", Status: "draft", SourceRecordID: "page-assigned-at-es"},
		},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}
	repo := NewBunTranslationAssignmentRepository(db)
	created, err := repo.Create(ctx, TranslationAssignment{
		ID:             "asg-assigned-at-round-trip",
		FamilyID:       "family-assigned-at-round-trip",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-assigned-at",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		AssigneeID:     "translator-1",
		AssignerID:     "manager-1",
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if created.AssignedAt == nil {
		t.Fatalf("expected assigned_at on create")
	}
	loaded, err := repo.Get(ctx, created.ID)
	if err != nil {
		t.Fatalf("get assignment: %v", err)
	}
	if loaded.AssignedAt == nil || !loaded.AssignedAt.Equal(*created.AssignedAt) {
		t.Fatalf("expected assigned_at round trip, created=%v loaded=%v", created.AssignedAt, loaded.AssignedAt)
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

func TestBunTranslationAssignmentRepositoryReviewerAggregateSummaryCountsSQLSafeStates(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	repo := NewBunTranslationAssignmentRepository(db)
	familyStore := NewBunTranslationFamilyStore(db)
	ctx := context.Background()
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	overdue := now.Add(-2 * time.Hour)
	future := now.Add(24 * time.Hour)
	createAssignment := func(input TranslationAssignment) {
		t.Helper()
		if err := familyStore.SaveFamily(ctx, translationservices.FamilyRecord{
			ID:              input.FamilyID,
			TenantID:        input.TenantID,
			OrgID:           input.OrgID,
			ContentType:     input.EntityType,
			SourceLocale:    input.SourceLocale,
			SourceVariantID: input.FamilyID + "::" + input.SourceLocale,
			ReadinessState:  "ready",
			Variants: []translationservices.FamilyVariant{
				{ID: input.FamilyID + "::" + input.SourceLocale, FamilyID: input.FamilyID, TenantID: input.TenantID, OrgID: input.OrgID, Locale: input.SourceLocale, Status: "published", IsSource: true, SourceRecordID: input.SourceRecordID},
				{ID: input.FamilyID + "::" + input.TargetLocale, FamilyID: input.FamilyID, TenantID: input.TenantID, OrgID: input.OrgID, Locale: input.TargetLocale, Status: "draft", SourceRecordID: input.SourceRecordID},
			},
		}); err != nil {
			t.Fatalf("seed family %s: %v", input.FamilyID, err)
		}
		if _, err := repo.Create(ctx, input); err != nil {
			t.Fatalf("create assignment %s: %v", input.ID, err)
		}
	}
	createAssignment(TranslationAssignment{
		ID:             "asg-review-inbox-future",
		FamilyID:       "family-review-inbox-future",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-review-inbox-future",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInReview,
		ReviewerID:     "reviewer-1",
		Priority:       PriorityNormal,
		DueDate:        &future,
	})
	createAssignment(TranslationAssignment{
		ID:             "asg-review-inbox-overdue",
		FamilyID:       "family-review-inbox-overdue",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-review-inbox-overdue",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInReview,
		ReviewerID:     "reviewer-1",
		Priority:       PriorityNormal,
		DueDate:        &overdue,
	})
	createAssignment(TranslationAssignment{
		ID:             "asg-review-fallback-overdue",
		FamilyID:       "family-review-fallback-overdue",
		EntityType:     "posts",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "post-review-fallback-overdue",
		SourceLocale:   "en",
		TargetLocale:   "de",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInReview,
		LastReviewerID: "reviewer-1",
		Priority:       PriorityNormal,
		DueDate:        &overdue,
	})
	createAssignment(TranslationAssignment{
		ID:             "asg-review-changes-requested",
		FamilyID:       "family-review-changes-requested",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-review-changes-requested",
		SourceLocale:   "en",
		TargetLocale:   "it",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusChangesRequested,
		ReviewerID:     "reviewer-1",
		Priority:       PriorityNormal,
	})
	createAssignment(TranslationAssignment{
		ID:             "asg-review-changes-fallback",
		FamilyID:       "family-review-changes-fallback",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-review-changes-fallback",
		SourceLocale:   "en",
		TargetLocale:   "pt",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusChangesRequested,
		LastReviewerID: "reviewer-1",
		Priority:       PriorityNormal,
	})
	createAssignment(TranslationAssignment{
		ID:             "asg-review-other-reviewer",
		FamilyID:       "family-review-other-reviewer",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-review-other-reviewer",
		SourceLocale:   "en",
		TargetLocale:   "nl",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInReview,
		ReviewerID:     "reviewer-2",
		Priority:       PriorityNormal,
		DueDate:        &overdue,
	})
	createAssignment(TranslationAssignment{
		ID:             "asg-review-other-scope",
		FamilyID:       "family-review-other-scope",
		EntityType:     "pages",
		TenantID:       "tenant-2",
		OrgID:          "org-2",
		SourceRecordID: "page-review-other-scope",
		SourceLocale:   "en",
		TargetLocale:   "sv",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInReview,
		ReviewerID:     "reviewer-1",
		Priority:       PriorityNormal,
		DueDate:        &overdue,
	})

	summary, err := repo.AssignmentReviewerAggregateSummary(ctx, TranslationAssignmentReviewerAggregateInput{
		TenantID: "tenant-1",
		OrgID:    "org-1",
		ActorID:  "reviewer-1",
		Now:      now,
	})
	if err != nil {
		t.Fatalf("reviewer aggregate summary: %v", err)
	}
	if got := summary.Counts["review_inbox"]; got != 3 {
		t.Fatalf("expected review_inbox=3, got %+v", summary.Counts)
	}
	if got := summary.Counts["review_overdue"]; got != 2 {
		t.Fatalf("expected review_overdue=2, got %+v", summary.Counts)
	}
	if got := summary.Counts["review_changes_requested"]; got != 2 {
		t.Fatalf("expected review_changes_requested=2, got %+v", summary.Counts)
	}
	if _, ok := summary.Counts["review_blocked"]; !ok {
		t.Fatalf("expected initialized review_blocked key, got %+v", summary.Counts)
	}
	if got := summary.Counts["review_blocked"]; got != 0 {
		t.Fatalf("expected review_blocked compatibility placeholder 0, got %+v", summary.Counts)
	}
	if len(summary.Unavailable) != 1 || summary.Unavailable[0] != "review_blocked" {
		t.Fatalf("expected review_blocked unavailable, got %+v", summary.Unavailable)
	}
	if len(summary.Degraded) != 0 {
		t.Fatalf("expected no degraded reviewer aggregate keys, got %+v", summary.Degraded)
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
