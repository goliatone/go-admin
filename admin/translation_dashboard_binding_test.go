package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
	"time"

	translationservices "github.com/goliatone/go-admin/translations/services"
)

func TestTranslationQueueBindingDashboardAggregatesCardsTablesAndLinks(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})

	repo := NewInMemoryTranslationAssignmentRepository()
	mustCreate := func(assignment TranslationAssignment) {
		t.Helper()
		if _, err := repo.Create(context.Background(), assignment); err != nil {
			t.Fatalf("create assignment: %v", err)
		}
	}
	overdue := now.Add(-3 * time.Hour)
	dueSoon := now.Add(8 * time.Hour)
	mustCreate(TranslationAssignment{
		ID:             "asg-overdue-1",
		FamilyID:       "tg-page-1",
		EntityType:     "pages",
		SourceRecordID: "page-1",
		SourceTitle:    "Page 1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssigneeID:     "translator-1",
		ReviewerID:     "reviewer-1",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInProgress,
		Priority:       PriorityUrgent,
		DueDate:        &overdue,
		TenantID:       "tenant-1",
		OrgID:          "org-1",
	})
	mustCreate(TranslationAssignment{
		ID:             "asg-review-1",
		FamilyID:       "tg-post-1",
		EntityType:     "posts",
		SourceRecordID: "post-1",
		SourceTitle:    "Post 1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		ReviewerID:     "manager-1",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInReview,
		Priority:       PriorityHigh,
		DueDate:        &dueSoon,
		TenantID:       "tenant-1",
		OrgID:          "org-1",
	})
	mustCreate(TranslationAssignment{
		ID:             "asg-my-task-1",
		FamilyID:       "tg-post-1",
		EntityType:     "posts",
		SourceRecordID: "post-1",
		SourceTitle:    "Post 1",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		AssigneeID:     "manager-1",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		Priority:       PriorityNormal,
		DueDate:        &dueSoon,
		TenantID:       "tenant-1",
		OrgID:          "org-1",
	})
	mustCreate(TranslationAssignment{
		ID:             "asg-other-scope",
		FamilyID:       "tg-hidden",
		EntityType:     "pages",
		SourceRecordID: "page-hidden",
		SourceTitle:    "Hidden",
		SourceLocale:   "en",
		TargetLocale:   "de",
		AssigneeID:     "manager-1",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInProgress,
		Priority:       PriorityLow,
		DueDate:        &overdue,
		TenantID:       "tenant-2",
		OrgID:          "org-9",
	})
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}

	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	binding.dashboardLoadRuntime = func(context.Context, string) (*translationFamilyRuntime, error) {
		return newTranslationFamilyBindingTestRuntime(t), nil
	}

	app := newTranslationQueueTestApp(t, binding)
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/dashboard?channel=production&tenant_id=tenant-1&org_id=org-1&blocked_limit=1&overdue_limit=1", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	data := extractMap(payload["data"])
	meta := extractMap(payload["meta"])
	cards := extractListMaps(data["cards"])
	if len(cards) != 5 {
		t.Fatalf("expected 5 cards, got %d", len(cards))
	}
	cardByID := map[string]map[string]any{}
	for _, card := range cards {
		cardByID[toString(card["id"])] = card
	}
	if got := toInt(cardByID[translationDashboardCardMyTasks]["count"]); got != 1 {
		t.Fatalf("expected my_tasks count=1, got %d", got)
	}
	if got := toInt(cardByID[translationDashboardCardNeedsReview]["count"]); got != 1 {
		t.Fatalf("expected needs_review count=1, got %d", got)
	}
	if got := toInt(cardByID[translationDashboardCardOverdueTasks]["count"]); got != 1 {
		t.Fatalf("expected overdue_tasks count=1, got %d", got)
	}
	if got := toInt(cardByID[translationDashboardCardBlockedFamilies]["count"]); got != 1 {
		t.Fatalf("expected blocked_families count=1, got %d", got)
	}
	if got := toInt(cardByID[translationDashboardCardMissingRequiredLocale]["count"]); got != 1 {
		t.Fatalf("expected missing_required_locales count=1, got %d", got)
	}

	tables := extractMap(data["tables"])
	overdueTable := extractMap(tables[translationDashboardTableTopOverdueAssignments])
	if got := toInt(overdueTable["total"]); got != 1 {
		t.Fatalf("expected overdue table total=1, got %d", got)
	}
	overdueRows := extractListMaps(overdueTable["rows"])
	if len(overdueRows) != 1 {
		t.Fatalf("expected one overdue row, got %d", len(overdueRows))
	}
	if got := toString(overdueRows[0]["assignment_id"]); got != "asg-overdue-1" {
		t.Fatalf("expected overdue row asg-overdue-1, got %q", got)
	}
	if href := toString(extractMap(extractMap(overdueRows[0]["links"])["assignment"])["href"]); href == "" {
		t.Fatalf("expected assignment drilldown href on overdue row")
	}
	if label := toString(extractMap(extractMap(overdueRows[0]["links"])["assignment"])["label"]); label != "Open assignment" {
		t.Fatalf("expected assignment drilldown label, got %q", label)
	}
	if entityID := toString(extractMap(extractMap(overdueRows[0]["links"])["assignment"])["entity_id"]); entityID != "asg-overdue-1" {
		t.Fatalf("expected assignment drilldown entity_id=asg-overdue-1, got %q", entityID)
	}
	queueLink := extractMap(extractMap(overdueRows[0]["links"])["queue"])
	if href := toString(queueLink["href"]); !strings.Contains(href, "family_id=tg-page-1") {
		t.Fatalf("expected queue drilldown href to preserve family_id, got %q", href)
	}
	if relation := toString(queueLink["relation"]); relation != "secondary" {
		t.Fatalf("expected queue relation secondary, got %q", relation)
	}

	blockedTable := extractMap(tables[translationDashboardTableBlockedFamilies])
	if got := toInt(blockedTable["total"]); got != 1 {
		t.Fatalf("expected blocked table total=1, got %d", got)
	}
	blockedRows := extractListMaps(blockedTable["rows"])
	if len(blockedRows) != 1 {
		t.Fatalf("expected one blocked family row, got %d", len(blockedRows))
	}
	if got := toString(blockedRows[0]["family_id"]); got != "tg-page-1" {
		t.Fatalf("expected blocked family tg-page-1, got %q", got)
	}
	if href := toString(extractMap(extractMap(blockedRows[0]["links"])["family"])["href"]); href == "" {
		t.Fatalf("expected family drilldown href on blocked row")
	}
	if entityID := toString(extractMap(extractMap(blockedRows[0]["links"])["family"])["entity_id"]); entityID != "tg-page-1" {
		t.Fatalf("expected family drilldown entity_id=tg-page-1, got %q", entityID)
	}

	queryModels := extractMap(meta["query_models"])
	indexHints := toStringSlice(extractMap(queryModels[translationDashboardTableTopOverdueAssignments])["index_hints"])
	if len(indexHints) == 0 {
		t.Fatalf("expected index hints for overdue query model")
	}
	modelLinks := extractMap(extractMap(queryModels[translationDashboardTableBlockedFamilies])["drilldown_links"])
	if label := toString(extractMap(modelLinks["family"])["label"]); label != "Open family" {
		t.Fatalf("expected blocked family drilldown label, got %q", label)
	}
	runbooks := extractListMaps(data["runbooks"])
	if len(runbooks) < 3 {
		t.Fatalf("expected runbook catalog, got %+v", runbooks)
	}
	runbookByID := map[string]map[string]any{}
	for _, runbook := range runbooks {
		runbookByID[toString(runbook["id"])] = runbook
	}
	if href := toString(runbookByID["translations.dashboard.publish_blockers"]["href"]); href == "" {
		t.Fatalf("expected publish_blockers runbook href to resolve")
	}
	alerts := extractListMaps(data["alerts"])
	if len(alerts) == 0 {
		t.Fatalf("expected dashboard alerts for overdue/blocked conditions")
	}
	if refresh := toInt(meta["refresh_interval_ms"]); refresh != translationDashboardRefreshIntervalMS {
		t.Fatalf("expected refresh_interval_ms=%d, got %d", translationDashboardRefreshIntervalMS, refresh)
	}
	if degraded := toBool(meta["degraded"]); degraded {
		t.Fatalf("expected non-degraded dashboard payload")
	}
}

func TestTranslationQueueBindingDashboardDegradesWhenFamilyRuntimeUnavailable(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.dashboardLoadRuntime = func(context.Context, string) (*translationFamilyRuntime, error) {
		return nil, ErrNotFound
	}
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/dashboard?tenant_id=tenant-1&org_id=org-1", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta := extractMap(payload["meta"])
	if degraded := toBool(meta["degraded"]); !degraded {
		t.Fatalf("expected degraded dashboard payload")
	}
	reasons := extractListMaps(meta["degraded_reasons"])
	if len(reasons) == 0 {
		t.Fatalf("expected degraded reasons in meta")
	}
}

func TestTranslationQueueBindingDashboardOptimizedPathAvoidsFullFamilyHydration(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	baseFamilyStore := NewBunTranslationFamilyStore(db)
	if err := baseFamilyStore.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:                         "family-optimized",
		TenantID:                   "tenant-1",
		OrgID:                      "org-1",
		ContentType:                "pages",
		SourceLocale:               "en",
		SourceVariantID:            "family-optimized::en",
		ReadinessState:             "blocked",
		MissingRequiredLocaleCount: 1,
		BlockerCodes:               []string{"missing_locale"},
		Variants: []translationservices.FamilyVariant{
			{ID: "family-optimized::en", FamilyID: "family-optimized", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: "published", IsSource: true, SourceRecordID: "page-optimized", Fields: map[string]string{"title": "Optimized"}},
		},
		Blockers: []translationservices.FamilyBlocker{
			{FamilyID: "family-optimized", TenantID: "tenant-1", OrgID: "org-1", BlockerCode: "missing_locale", Locale: "es"},
		},
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}
	repo := NewBunTranslationAssignmentRepository(db)
	overdue := now.Add(-time.Hour)
	if _, err := repo.Create(ctx, TranslationAssignment{
		ID:             "asg-optimized",
		FamilyID:       "family-optimized",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-optimized",
		SourceTitle:    "Optimized",
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
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{allowed: map[string]bool{PermAdminTranslationsView: true}})
	wrappedFamilyStore := &dashboardNoFamiliesStore{BunTranslationFamilyStore: baseFamilyStore}
	adm.WithTranslationFamilyStore(wrappedFamilyStore)
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/dashboard?tenant_id=tenant-1&org_id=org-1", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	summary := extractMap(extractMap(payload["data"])["summary"])
	if got := toInt(summary["overdue_tasks"]); got != 1 {
		t.Fatalf("expected overdue_tasks=1, got %d", got)
	}
	if got := toInt(summary["blocked_families"]); got != 1 {
		t.Fatalf("expected blocked_families=1, got %d", got)
	}
	if wrappedFamilyStore.familiesCalls != 0 {
		t.Fatalf("optimized dashboard called Families %d times", wrappedFamilyStore.familiesCalls)
	}
}

func TestTranslationQueueBindingDashboardOptimizedAssignmentFailureFallsBackWithDegradedMetadata(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{allowed: map[string]bool{PermAdminTranslationsView: true}})
	baseRepo := NewInMemoryTranslationAssignmentRepository()
	overdue := now.Add(-time.Hour)
	if _, err := baseRepo.Create(context.Background(), TranslationAssignment{
		ID:             "asg-fallback",
		FamilyID:       "family-fallback",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-fallback",
		SourceTitle:    "Fallback",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssigneeID:     "manager-1",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInProgress,
		Priority:       PriorityHigh,
		DueDate:        &overdue,
	}); err != nil {
		t.Fatalf("seed assignment: %v", err)
	}
	repo := &dashboardFailingAssignmentSummaryRepo{InMemoryTranslationAssignmentRepository: baseRepo}
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	familyStore := &dashboardMetricsOnlyFamilyStore{
		metrics: TranslationDashboardFamilyMetrics{
			BlockedFamilies:         1,
			MissingRequiredFamilies: 1,
			TopBlocked: []translationservices.FamilyRecord{{
				ID:                         "family-fallback",
				TenantID:                   "tenant-1",
				OrgID:                      "org-1",
				ContentType:                "pages",
				SourceLocale:               "en",
				ReadinessState:             "blocked",
				MissingRequiredLocaleCount: 1,
				BlockerCodes:               []string{"missing_locale"},
				UpdatedAt:                  now,
			}},
		},
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	binding.dashboardLoadRuntime = func(context.Context, string) (*translationFamilyRuntime, error) {
		return &translationFamilyRuntime{service: &translationservices.FamilyService{Store: familyStore}}, nil
	}
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/dashboard?tenant_id=tenant-1&org_id=org-1", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	summary := extractMap(extractMap(payload["data"])["summary"])
	if got := toInt(summary["overdue_tasks"]); got != 1 {
		t.Fatalf("expected fallback overdue_tasks=1, got %d", got)
	}
	meta := extractMap(payload["meta"])
	if degraded := toBool(meta["degraded"]); !degraded {
		t.Fatalf("expected degraded metadata after assignment summary failure")
	}
	reasons := extractListMaps(meta["degraded_reasons"])
	if len(reasons) != 1 || toString(reasons[0]["component"]) != "assignment_metrics_query" {
		t.Fatalf("expected assignment_metrics_query degraded reason, got %+v", reasons)
	}
	if familyStore.familiesCalls != 0 {
		t.Fatalf("expected family metrics to remain optimized, Families calls=%d", familyStore.familiesCalls)
	}
}

func TestBunTranslationFamilyStoreDashboardMetricsUsesLightweightRows(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `INSERT INTO content_families (
		family_id, tenant_id, org_id, content_type, source_locale, readiness_state,
		blocker_codes_json, missing_required_locale_count, pending_review_count,
		outdated_locale_count, created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"family-lightweight", "tenant-1", "org-1", "pages", "en", "blocked",
		`["missing_locale"]`, 2, 1, 0, nowStringForTest(), nowStringForTest(),
	); err != nil {
		t.Fatalf("seed content family: %v", err)
	}
	for _, statement := range []string{
		`DROP TABLE translation_assignments`,
		`DROP TABLE locale_variants`,
		`DROP TABLE family_blockers`,
	} {
		if _, err := db.ExecContext(ctx, statement); err != nil {
			t.Fatalf("drop hydration table %q: %v", statement, err)
		}
	}
	store := NewBunTranslationFamilyStore(db)
	metrics, err := store.TranslationDashboardFamilyMetrics(ctx, TranslationDashboardFamilyMetricsInput{
		TenantID:     "tenant-1",
		OrgID:        "org-1",
		BlockedLimit: 5,
	})
	if err != nil {
		t.Fatalf("dashboard family metrics: %v", err)
	}
	if metrics.BlockedFamilies != 1 || metrics.MissingRequiredFamilies != 1 {
		t.Fatalf("unexpected metrics: %+v", metrics)
	}
	if len(metrics.TopBlocked) != 1 || metrics.TopBlocked[0].ID != "family-lightweight" {
		t.Fatalf("expected lightweight top blocked row, got %+v", metrics.TopBlocked)
	}
	if len(metrics.TopBlocked[0].Variants) != 0 || len(metrics.TopBlocked[0].Blockers) != 0 {
		t.Fatalf("expected lightweight row without hydrated variants/blockers, got %+v", metrics.TopBlocked[0])
	}
}

func TestBunTranslationFamilyStoreDashboardMetricsLoadsLightweightReasonProjection(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	now := nowStringForTest()
	if _, err := db.ExecContext(ctx, `INSERT INTO content_families (
		family_id, tenant_id, org_id, content_type, source_locale, readiness_state,
		blocker_codes_json, missing_required_locale_count, pending_review_count,
		outdated_locale_count, created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"family-reasons", "tenant-1", "org-1", "pages", "en", "blocked",
		`["missing_locale","pending_review"]`, 1, 1, 0, now, now,
	); err != nil {
		t.Fatalf("seed content family: %v", err)
	}
	for _, row := range []struct {
		code   string
		locale string
	}{
		{code: "missing_locale", locale: "es"},
		{code: "pending_review", locale: "fr"},
	} {
		if _, err := db.ExecContext(ctx, `INSERT INTO family_blockers (
			family_id, tenant_id, org_id, blocker_code, locale, field_path, details_json, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			"family-reasons", "tenant-1", "org-1", row.code, row.locale, "", `{}`, now, now,
		); err != nil {
			t.Fatalf("seed family blocker: %v", err)
		}
	}
	for _, statement := range []string{
		`DROP TABLE translation_assignments`,
		`DROP TABLE locale_variants`,
	} {
		if _, err := db.ExecContext(ctx, statement); err != nil {
			t.Fatalf("drop hydration table %q: %v", statement, err)
		}
	}
	store := NewBunTranslationFamilyStore(db)
	metrics, err := store.TranslationDashboardFamilyMetrics(ctx, TranslationDashboardFamilyMetricsInput{
		TenantID:     "tenant-1",
		OrgID:        "org-1",
		BlockedLimit: 5,
	})
	if err != nil {
		t.Fatalf("dashboard family metrics: %v", err)
	}
	if len(metrics.TopBlocked) != 1 {
		t.Fatalf("expected one top blocked family, got %+v", metrics.TopBlocked)
	}
	top := metrics.TopBlocked[0]
	if len(top.Variants) != 0 || len(top.Assignments) != 0 {
		t.Fatalf("expected no variant or assignment hydration, got %+v", top)
	}
	if len(top.Blockers) != 2 {
		t.Fatalf("expected two lightweight blockers, got %+v", top.Blockers)
	}
	rows := translationDashboardTopBlockedRows(nil, metrics.TopBlocked, 5, "production")
	reasonData := extractMap(rows[0]["reason_data"])
	if state := toString(reasonData["state"]); state != "available" {
		t.Fatalf("expected available reason_data, got %+v", reasonData)
	}
	if locales := toStringSlice(rows[0]["affected_locales"]); strings.Join(locales, ",") != "es,fr" {
		t.Fatalf("expected affected locales es,fr, got %+v", locales)
	}
}

func nowStringForTest() string {
	return time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC).Format(time.RFC3339)
}

type dashboardNoFamiliesStore struct {
	*BunTranslationFamilyStore
	familiesCalls int
}

func (s *dashboardNoFamiliesStore) Families(context.Context) ([]translationservices.FamilyRecord, error) {
	s.familiesCalls++
	return nil, errors.New("Families must not be called by optimized dashboard")
}

type dashboardFailingAssignmentSummaryRepo struct {
	*InMemoryTranslationAssignmentRepository
}

func (r *dashboardFailingAssignmentSummaryRepo) AssignmentQueueSummary(context.Context, TranslationAssignmentQueueSummaryInput) (TranslationAssignmentQueueSummary, error) {
	return TranslationAssignmentQueueSummary{}, errors.New("assignment summary unavailable")
}

func (r *dashboardFailingAssignmentSummaryRepo) AssignmentMyWorkSummary(context.Context, TranslationAssignmentMyWorkSummaryInput) (map[string]int, error) {
	return nil, errors.New("assignment summary unavailable")
}

func (r *dashboardFailingAssignmentSummaryRepo) AssignmentDashboardSummary(context.Context, TranslationAssignmentDashboardSummaryInput) (TranslationAssignmentDashboardSummary, error) {
	return TranslationAssignmentDashboardSummary{}, errors.New("assignment summary unavailable")
}

type dashboardMetricsOnlyFamilyStore struct {
	metrics       TranslationDashboardFamilyMetrics
	familiesCalls int
}

func (s *dashboardMetricsOnlyFamilyStore) TranslationDashboardFamilyMetrics(context.Context, TranslationDashboardFamilyMetricsInput) (TranslationDashboardFamilyMetrics, error) {
	return s.metrics, nil
}

func (s *dashboardMetricsOnlyFamilyStore) Families(context.Context) ([]translationservices.FamilyRecord, error) {
	s.familiesCalls++
	return nil, errors.New("Families must not be called when metrics query succeeds")
}

func (s *dashboardMetricsOnlyFamilyStore) Family(context.Context, string) (translationservices.FamilyRecord, bool, error) {
	return translationservices.FamilyRecord{}, false, nil
}

func (s *dashboardMetricsOnlyFamilyStore) SaveFamily(context.Context, translationservices.FamilyRecord) error {
	return nil
}

func TestTranslationQueueBindingDashboardLatencyStaysWithinTarget(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	for idx := range 120 {
		due := now.Add(time.Duration(idx-60) * time.Minute)
		status := AssignmentStatusAssigned
		if idx%3 == 0 {
			status = AssignmentStatusInReview
		}
		if _, err := repo.Create(context.Background(), TranslationAssignment{
			FamilyID:       "tg-load-" + toString(idx),
			EntityType:     "pages",
			SourceRecordID: "page-" + toString(idx),
			SourceTitle:    "Load",
			SourceLocale:   "en",
			TargetLocale:   "es",
			AssigneeID:     "manager-1",
			ReviewerID:     "manager-1",
			AssignmentType: AssignmentTypeDirect,
			Status:         status,
			Priority:       PriorityNormal,
			DueDate:        &due,
			TenantID:       "tenant-1",
			OrgID:          "org-1",
		}); err != nil {
			t.Fatalf("seed assignment %d: %v", idx, err)
		}
	}
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	binding.dashboardLoadRuntime = func(context.Context, string) (*translationFamilyRuntime, error) {
		return newTranslationFamilyBindingTestRuntime(t), nil
	}

	app := newTranslationQueueTestApp(t, binding)
	samples := make([]time.Duration, 0, 25)
	for idx := range 25 {
		started := time.Now()
		req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/dashboard?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
		req.Header.Set("X-User-ID", "manager-1")
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("request %d error: %v", idx, err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("request %d status=%d want=200", idx, resp.StatusCode)
		}
		samples = append(samples, time.Since(started))
	}
	if p95 := translationDashboardPercentile95(samples); p95 > time.Duration(translationDashboardLatencyTargetMS)*time.Millisecond {
		t.Fatalf("dashboard summary p95 %v exceeds %dms target", p95, translationDashboardLatencyTargetMS)
	}
}

func translationDashboardPercentile95(samples []time.Duration) time.Duration {
	if len(samples) == 0 {
		return 0
	}
	cp := append([]time.Duration(nil), samples...)
	slices.Sort(cp)
	index := int(float64(len(cp)-1) * 0.95)
	return cp[index]
}

func extractListMaps(value any) []map[string]any {
	switch typed := value.(type) {
	case []map[string]any:
		return typed
	case []any:
		out := make([]map[string]any, 0, len(typed))
		for _, item := range typed {
			if record, ok := item.(map[string]any); ok {
				out = append(out, record)
			}
		}
		return out
	default:
		return nil
	}
}
