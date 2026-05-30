package admin

import (
	"context"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	translationservices "github.com/goliatone/go-admin/translations/services"
)

func TestTranslationDashboardOptimizedSyntheticValidation(t *testing.T) {
	if os.Getenv("TRANSLATION_PERF_SYNTHETIC") != "1" {
		t.Skip("set TRANSLATION_PERF_SYNTHETIC=1 to run the archive-scale translation dashboard validation")
	}
	familyCount := envInt("TRANSLATION_PERF_FAMILIES", 20_000)
	assignmentCount := envInt("TRANSLATION_PERF_ASSIGNMENTS", 40_000)
	blockersPerFamily := envInt("TRANSLATION_PERF_BLOCKERS_PER_FAMILY", 10)
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	ensureTranslationSyntheticIndexes(t, ctx, db)
	familyStore := NewBunTranslationFamilyStore(db)
	for idx := range familyCount {
		familyID := "perf-family-" + strconv.Itoa(idx)
		blockers := make([]translationservices.FamilyBlocker, 0, blockersPerFamily)
		for blockerIdx := range blockersPerFamily {
			blockers = append(blockers, translationservices.FamilyBlocker{
				FamilyID:    familyID,
				TenantID:    "tenant-perf",
				OrgID:       "org-perf",
				BlockerCode: "missing_locale",
				Locale:      "l" + strconv.Itoa(blockerIdx),
			})
		}
		if err := familyStore.SaveFamily(ctx, translationservices.FamilyRecord{
			ID:                         familyID,
			TenantID:                   "tenant-perf",
			OrgID:                      "org-perf",
			ContentType:                "pages",
			SourceLocale:               "en",
			SourceVariantID:            familyID + "::en",
			ReadinessState:             "blocked",
			MissingRequiredLocaleCount: blockersPerFamily,
			BlockerCodes:               []string{"missing_locale"},
			Variants: []translationservices.FamilyVariant{
				{ID: familyID + "::en", FamilyID: familyID, TenantID: "tenant-perf", OrgID: "org-perf", Locale: "en", Status: "published", IsSource: true, SourceRecordID: familyID},
			},
			Blockers:  blockers,
			CreatedAt: now.Add(-24 * time.Hour),
			UpdatedAt: now.Add(-time.Duration(idx%1440) * time.Minute),
		}); err != nil {
			t.Fatalf("seed family %d: %v", idx, err)
		}
	}
	repo := NewBunTranslationAssignmentRepository(db)
	for idx := range assignmentCount {
		familyID := "perf-family-" + strconv.Itoa(idx%max(familyCount, 1))
		due := now.Add(time.Duration(idx%240-120) * time.Minute)
		status := AssignmentStatusAssigned
		if idx%5 == 0 {
			status = AssignmentStatusInReview
		}
		if _, err := repo.Create(ctx, TranslationAssignment{
			ID:             "perf-asg-" + strconv.Itoa(idx),
			FamilyID:       familyID,
			EntityType:     "pages",
			TenantID:       "tenant-perf",
			OrgID:          "org-perf",
			SourceRecordID: familyID,
			SourceTitle:    "Performance " + strconv.Itoa(idx),
			SourceLocale:   "en",
			TargetLocale:   "l" + strconv.Itoa(idx%blockersPerFamily),
			WorkScope:      "perf-" + strconv.Itoa(idx),
			AssigneeID:     "manager-perf",
			ReviewerID:     "manager-perf",
			AssignmentType: AssignmentTypeDirect,
			Status:         status,
			Priority:       PriorityHigh,
			DueDate:        &due,
		}); err != nil {
			t.Fatalf("seed assignment %d: %v", idx, err)
		}
	}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{allowed: map[string]bool{PermAdminTranslationsView: true}})
	adm.WithTranslationFamilyStore(familyStore)
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)
	timedQueueRequest := func(label, path string) time.Duration {
		t.Helper()
		started := time.Now()
		req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, path, nil)
		req.Header.Set("X-User-ID", "manager-perf")
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("request %s: %v", label, err)
		}
		defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("%s status=%d want=200", label, resp.StatusCode)
		}
		return time.Since(started)
	}
	dashboardElapsed := timedQueueRequest("dashboard", "/admin/api/translations/dashboard?tenant_id=tenant-perf&org_id=org-perf")
	queueElapsed := timedQueueRequest("queue page", "/admin/api/translations/assignments?tenant_id=tenant-perf&org_id=org-perf&due_state=overdue&sort_by=due_date&per_page=50")
	myWorkElapsed := timedQueueRequest("my-work", "/admin/api/translations/my-work?tenant_id=tenant-perf&org_id=org-perf&per_page=50")

	familyBinding := &translationFamilyBinding{admin: adm}
	familyApp := newTranslationFamilyTestApp(t, familyBinding)
	started := time.Now()
	familyReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/families?tenant_id=tenant-perf&org_id=org-perf&readiness_state=blocked&per_page=50", nil)
	familyReq.Header.Set("X-User-ID", "manager-perf")
	familyResp, err := familyApp.Test(familyReq)
	if err != nil {
		t.Fatalf("request family list: %v", err)
	}
	defer familyResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if familyResp.StatusCode != http.StatusOK {
		t.Fatalf("family list status=%d want=200", familyResp.StatusCode)
	}
	familyElapsed := time.Since(started)

	t.Logf("translation synthetic validation: families=%d assignments=%d blockers=%d dashboard=%s queue_page=%s my_work=%s family_list=%s",
		familyCount, assignmentCount, familyCount*blockersPerFamily, dashboardElapsed, queueElapsed, myWorkElapsed, familyElapsed)
	logTranslationSyntheticQueryPlans(t, db)
	if dashboardElapsed > translationDashboardLatencyTargetMS*time.Millisecond {
		t.Fatalf("dashboard elapsed %s exceeds %dms target", dashboardElapsed, translationDashboardLatencyTargetMS)
	}
}

func logTranslationSyntheticQueryPlans(t *testing.T, db interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
}) {
	t.Helper()
	plans := []struct {
		name  string
		query string
		args  []any
	}{
		{
			name:  "queue_page_overdue",
			query: "EXPLAIN QUERY PLAN SELECT assignment_id FROM translation_assignments WHERE tenant_id IN (?) AND org_id IN (?) AND status IN (?, ?, ?, ?, ?, ?) AND due_date IS NOT NULL AND due_date < ? ORDER BY due_date ASC, assignment_id ASC LIMIT 50",
			args: []any{
				"tenant-perf",
				"org-perf",
				string(AssignmentStatusOpen),
				string(AssignmentStatusAssigned),
				string(AssignmentStatusInProgress),
				string(AssignmentStatusInReview),
				string(AssignmentStatusChangesRequested),
				string(AssignmentStatusApproved),
				bunAssignmentStorageDateValue(time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)),
			},
		},
		{
			name:  "family_list_blocked",
			query: "EXPLAIN QUERY PLAN SELECT family_id FROM content_families WHERE tenant_id = ? AND org_id = ? AND readiness_state = ? ORDER BY updated_at DESC, family_id ASC LIMIT 50",
			args:  []any{"tenant-perf", "org-perf", "blocked"},
		},
	}
	for _, plan := range plans {
		logTranslationSyntheticQueryPlan(t, db, plan.name, plan.query, plan.args)
	}
}

func logTranslationSyntheticQueryPlan(t *testing.T, db interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
}, name, query string, args []any) {
	t.Helper()
	rows, err := db.QueryContext(context.Background(), query, args...)
	if err != nil {
		t.Logf("query plan %s unavailable: %v", name, err)
		return
	}
	defer func() {
		if closeErr := rows.Close(); closeErr != nil {
			t.Logf("query plan %s close error: %v", name, closeErr)
		}
	}()
	parts := []string{}
	for rows.Next() {
		var id, parent, notUsed int
		var detail string
		if scanErr := rows.Scan(&id, &parent, &notUsed, &detail); scanErr != nil {
			t.Logf("query plan %s scan unavailable: %v", name, scanErr)
			break
		}
		parts = append(parts, detail)
	}
	if rowsErr := rows.Err(); rowsErr != nil {
		t.Logf("query plan %s rows error: %v", name, rowsErr)
	}
	t.Logf("query plan %s: %s", name, strings.Join(parts, " | "))
}

func ensureTranslationSyntheticIndexes(t *testing.T, ctx context.Context, db interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
}) {
	t.Helper()
	statements := []string{
		`CREATE INDEX IF NOT EXISTS ix_translation_assignments_scope_due
			ON translation_assignments(tenant_id, org_id, due_date, priority, assignment_id)`,
		`CREATE INDEX IF NOT EXISTS ix_translation_assignments_scope_assignee_due
			ON translation_assignments(tenant_id, org_id, assignee_id, status, due_date, assignment_id)`,
		`CREATE INDEX IF NOT EXISTS ix_content_families_scope_readiness_updated
			ON content_families(tenant_id, org_id, readiness_state, updated_at DESC, family_id)`,
	}
	for _, statement := range statements {
		if _, err := db.ExecContext(ctx, statement); err != nil {
			t.Fatalf("create synthetic validation index: %v", err)
		}
	}
}

func envInt(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}
