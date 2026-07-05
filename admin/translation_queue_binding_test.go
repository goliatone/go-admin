package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"maps"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestTranslationQueueBindingMyWorkReturnsAssignmentsWithDueState(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	seedTranslationAssignment := func(input TranslationAssignment) {
		t.Helper()
		if _, err := repo.Create(context.Background(), input); err != nil {
			t.Fatalf("create assignment: %v", err)
		}
	}
	overdue := now.Add(-2 * time.Hour)
	dueSoon := now.Add(6 * time.Hour)
	onTrack := now.Add(96 * time.Hour)
	seedTranslationAssignment(TranslationAssignment{
		FamilyID:       "tg-overdue",
		EntityType:     "pages",
		SourceRecordID: "page-1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssigneeID:     "translator-1",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInProgress,
		Priority:       PriorityNormal,
		DueDate:        &overdue,
	})
	seedTranslationAssignment(TranslationAssignment{
		FamilyID:       "tg-soon",
		EntityType:     "posts",
		SourceRecordID: "post-1",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		AssigneeID:     "translator-1",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInReview,
		Priority:       PriorityHigh,
		DueDate:        &dueSoon,
	})
	seedTranslationAssignment(TranslationAssignment{
		FamilyID:       "tg-track",
		EntityType:     "news",
		SourceRecordID: "news-1",
		SourceLocale:   "en",
		TargetLocale:   "de",
		AssigneeID:     "translator-1",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		Priority:       PriorityNormal,
		DueDate:        &onTrack,
	})
	seedTranslationAssignment(TranslationAssignment{
		FamilyID:       "tg-none",
		EntityType:     "news",
		SourceRecordID: "news-2",
		SourceLocale:   "en",
		TargetLocale:   "it",
		AssigneeID:     "translator-1",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		Priority:       PriorityLow,
	})
	seedTranslationAssignment(TranslationAssignment{
		FamilyID:       "tg-other",
		EntityType:     "pages",
		SourceRecordID: "page-2",
		SourceLocale:   "en",
		TargetLocale:   "pt",
		AssigneeID:     "translator-2",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		Priority:       PriorityLow,
	})

	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/my-work", nil)
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got := strings.TrimSpace(toString(payload["scope"])); got != "my_work" {
		t.Fatalf("expected scope my_work, got %q", got)
	}
	if got := strings.TrimSpace(toString(payload["user_id"])); got != "translator-1" {
		t.Fatalf("expected translator-1 user_id, got %q", got)
	}

	summary := extractMap(payload["summary"])
	if toInt(summary["total"]) != 4 {
		t.Fatalf("expected total=4, got %+v", summary)
	}
	if toInt(summary["overdue"]) != 1 || toInt(summary["due_soon"]) != 1 || toInt(summary["on_track"]) != 1 || toInt(summary["none"]) != 1 {
		t.Fatalf("unexpected due-state summary: %+v", summary)
	}
	if toInt(summary["review"]) != 1 {
		t.Fatalf("expected review=1, got %+v", summary)
	}

	items := anySliceFromValue(payload["assignments"])
	if len(items) != 4 {
		t.Fatalf("expected 4 assignments, got %d", len(items))
	}
	for _, raw := range items {
		row := extractMap(raw)
		if strings.TrimSpace(toString(row["due_state"])) == "" {
			t.Fatalf("expected due_state on row: %+v", row)
		}
		if got := strings.TrimSpace(toString(row["assignee_id"])); got != "translator-1" {
			t.Fatalf("expected assignee translator-1, got %q", got)
		}
	}
}

func TestTranslationQueueBindingMyWorkRequiresViewPermission(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{allowed: map[string]bool{}})
	repo := NewInMemoryTranslationAssignmentRepository()
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	binding := newTranslationQueueBinding(adm)
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/my-work", nil)
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("status=%d want=403", resp.StatusCode)
	}
}

func TestTranslationQueueListOptionsIncludesEntityTypeFilter(t *testing.T) {
	opts, empty := listOptionsFromAssignmentPageQuery(TranslationAssignmentPageQueryInput{
		Filter: translationAssignmentListFilter{
			TenantID:   "tenant-1",
			OrgID:      "org-1",
			EntityType: "pages",
			SortBy:     "updated_at",
			SortDesc:   true,
		},
		Page:    2,
		PerPage: 25,
	})
	if empty {
		t.Fatalf("expected non-empty query options")
	}
	if got := strings.TrimSpace(toString(opts.Filters["entity_type"])); got != "pages" {
		t.Fatalf("expected entity_type filter, got filters=%+v", opts.Filters)
	}
}

func TestTranslationQueueFallbackFilteringMatchesEntityType(t *testing.T) {
	binding := &translationQueueBinding{}
	now := time.Date(2026, 7, 3, 12, 0, 0, 0, time.UTC)
	assignments := []TranslationAssignment{
		{ID: "asg-pages", EntityType: "pages", TargetLocale: "es", Status: AssignmentStatusAssigned, Priority: PriorityNormal},
		{ID: "asg-posts", EntityType: "posts", TargetLocale: "es", Status: AssignmentStatusAssigned, Priority: PriorityNormal},
	}

	filtered, total := binding.filterAssignments(context.Background(), assignments, translationAssignmentListFilter{
		EntityType: "Pages",
		SortBy:     "updated_at",
		SortDesc:   true,
	}, 1, 25, "", now)
	if total != 1 || len(filtered) != 1 || filtered[0].ID != "asg-pages" {
		t.Fatalf("expected only pages assignment, total=%d rows=%+v", total, filtered)
	}
}

func TestTranslationQueueFallbackPaginationClampsOutOfRangePage(t *testing.T) {
	binding := &translationQueueBinding{}
	now := time.Date(2026, 7, 3, 12, 0, 0, 0, time.UTC)
	assignments := []TranslationAssignment{
		{ID: "asg-1", Status: AssignmentStatusAssigned, Priority: PriorityNormal},
		{ID: "asg-2", Status: AssignmentStatusAssigned, Priority: PriorityNormal},
		{ID: "asg-3", Status: AssignmentStatusAssigned, Priority: PriorityNormal},
	}

	filtered, total := binding.filterAssignments(context.Background(), assignments, translationAssignmentListFilter{
		SortBy:   "updated_at",
		SortDesc: false,
	}, 99, 2, "", now)
	if total != 3 || len(filtered) != 1 || filtered[0].ID != "asg-3" {
		t.Fatalf("expected out-of-range page to clamp to final assignment, total=%d rows=%+v", total, filtered)
	}
}

func TestTranslationQueueAssignmentsTypeFilterAliasesMatchAPIRows(t *testing.T) {
	now := time.Date(2026, 7, 3, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	for _, assignment := range []TranslationAssignment{
		{ID: "asg-pages", FamilyID: "fam-pages", EntityType: "pages", SourceRecordID: "page-1", SourceLocale: "en", TargetLocale: "es", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusAssigned, Priority: PriorityNormal},
		{ID: "asg-posts", FamilyID: "fam-posts", EntityType: "posts", SourceRecordID: "post-1", SourceLocale: "en", TargetLocale: "es", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusAssigned, Priority: PriorityNormal},
	} {
		if _, err := repo.Create(context.Background(), assignment); err != nil {
			t.Fatalf("create assignment %s: %v", assignment.ID, err)
		}
	}
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	for _, query := range []string{"entity_type=pages", "content_type=pages", "type=pages"} {
		t.Run(query, func(t *testing.T) {
			req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?"+query, nil)
			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("request error: %v", err)
			}
			defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
			if resp.StatusCode != http.StatusOK {
				t.Fatalf("status=%d want=200", resp.StatusCode)
			}
			payload := map[string]any{}
			if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			rows := anySliceFromValue(payload["data"])
			if len(rows) != 1 {
				t.Fatalf("expected one row for %s, got %+v", query, payload)
			}
			row := extractMap(rows[0])
			if got := firstNonEmpty(toString(row["assignment_id"]), toString(row["id"])); got != "asg-pages" {
				t.Fatalf("expected pages assignment for %s, got %+v", query, row)
			}
			if got := toString(row["entity_type"]); got != "pages" {
				t.Fatalf("expected pages entity_type for %s, got %+v", query, row)
			}
		})
	}
}

func TestTranslationQueueBindingQueueIncludesUnifiedInboxFields(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:    true,
			PermAdminTranslationsApprove: true,
			PermAdminTranslationsEdit:    false,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	reviewDue := now.Add(6 * time.Hour)
	if _, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-review",
		EntityType:     "pages",
		SourceRecordID: "page-review",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssigneeID:     "translator-1",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInReview,
		Priority:       PriorityHigh,
		DueDate:        &reviewDue,
	}); err != nil {
		t.Fatalf("create review assignment: %v", err)
	}
	if _, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-progress",
		EntityType:     "news",
		SourceRecordID: "news-progress",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		AssigneeID:     "translator-2",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInProgress,
		Priority:       PriorityNormal,
	}); err != nil {
		t.Fatalf("create in_progress assignment: %v", err)
	}

	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/queue", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got := strings.TrimSpace(toString(payload["scope"])); got != "queue" {
		t.Fatalf("expected scope queue, got %q", got)
	}

	items := anySliceFromValue(payload["items"])
	if len(items) != 2 {
		t.Fatalf("expected 2 queue items, got %d", len(items))
	}
	for _, raw := range items {
		row := extractMap(raw)
		if strings.TrimSpace(toString(row["content_state"])) == "" {
			t.Fatalf("expected content_state, got %+v", row)
		}
		if strings.TrimSpace(toString(row["queue_state"])) == "" {
			t.Fatalf("expected queue_state, got %+v", row)
		}
		if _, ok := row["assignee_id"]; !ok {
			t.Fatalf("expected assignee_id, got %+v", row)
		}
		actions, ok := row["review_actions"].(map[string]any)
		if !ok || len(actions) == 0 {
			t.Fatalf("expected review_actions map, got %+v", row["review_actions"])
		}
		approve := extractMap(actions["approve"])
		submit := extractMap(actions["submit_review"])
		if strings.EqualFold(strings.TrimSpace(toString(row["queue_state"])), string(AssignmentStatusInReview)) {
			if enabled := toBool(approve["enabled"]); !enabled {
				t.Fatalf("expected approve enabled in review state, got %+v", approve)
			}
		}
		if strings.EqualFold(strings.TrimSpace(toString(row["queue_state"])), string(AssignmentStatusInProgress)) {
			if enabled := toBool(submit["enabled"]); enabled {
				t.Fatalf("expected submit_review disabled without edit permission, got %+v", submit)
			}
			if code := strings.TrimSpace(toString(submit["reason_code"])); code != ActionDisabledReasonCodePermissionDenied {
				t.Fatalf("expected permission denied code for submit_review, got %q", code)
			}
		}
	}
}

func TestTranslationQueueBindingAssignmentsReturnsEnvelopeAndActionStates(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:   true,
			PermAdminTranslationsClaim:  true,
			PermAdminTranslationsAssign: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	overdue := now.Add(-2 * time.Hour)
	created, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-assignments",
		EntityType:     "pages",
		SourceRecordID: "page-1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityHigh,
		DueDate:        &overdue,
		ReviewerID:     "reviewer-1",
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?locale=es&priority=high&reviewer_id=reviewer-1&due_state=overdue", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta := extractMap(payload["meta"])
	if toInt(meta["total"]) != 1 {
		t.Fatalf("expected meta.total=1, got %+v", meta)
	}
	if got := strings.TrimSpace(toString(meta["default_review_filter_preset"])); got != "review_inbox" {
		t.Fatalf("expected default_review_filter_preset review_inbox, got %q", got)
	}
	if reviewPresets := anySliceFromValue(meta["saved_review_filter_presets"]); len(reviewPresets) != 4 {
		t.Fatalf("expected four saved review presets, got %d", len(reviewPresets))
	}
	reviewCounts := extractMap(meta["review_aggregate_counts"])
	if got := intValue(reviewCounts["review_inbox"]); got != 0 {
		t.Fatalf("expected empty review_inbox count for non-reviewer result, got %+v", reviewCounts)
	}
	data := anySliceFromValue(payload["data"])
	if len(data) != 1 {
		t.Fatalf("expected one data row, got %d", len(data))
	}
	row := extractMap(data[0])
	if got := strings.TrimSpace(toString(row["id"])); got != created.ID {
		t.Fatalf("expected id %q, got %q", created.ID, got)
	}
	if got := strings.TrimSpace(toString(row["due_state"])); got != translationQueueDueStateOverdue {
		t.Fatalf("expected overdue due_state, got %q", got)
	}
	actions := extractMap(row["actions"])
	claim := extractMap(actions["claim"])
	release := extractMap(actions["release"])
	if enabled := toBool(claim["enabled"]); !enabled {
		t.Fatalf("expected claim enabled, got %+v", claim)
	}
	if enabled := toBool(release["enabled"]); enabled {
		t.Fatalf("expected release disabled for pending assignment, got %+v", release)
	}
	if got := strings.TrimSpace(toString(release["reason_code"])); got != ActionDisabledReasonCodeInvalidStatus {
		t.Fatalf("expected invalid status reason code, got %q", got)
	}
}

func TestTranslationQueueBindingAssignmentsIncludesOwnerLabels(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	userStore := NewInMemoryUserStore()
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue, FeatureUsers),
		UserRepository: &inMemoryUserRepoAdapter{
			store: userStore,
		},
		RoleRepository: &inMemoryRoleRepoAdapter{
			store: userStore,
		},
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView: true,
		},
	})
	if err := adm.RegisterModule(NewUserManagementModule()); err != nil {
		t.Fatalf("register users module: %v", err)
	}
	if _, err := userStore.CreateUser(context.Background(), UserRecord{
		ID:       "9e838c81-6d3e-49d7-ad8f-b6616a040a44",
		Username: "translator.jane",
		Email:    "jane@example.com",
		Status:   "active",
	}); err != nil {
		t.Fatalf("save user: %v", err)
	}
	if _, err := userStore.CreateUser(context.Background(), UserRecord{
		ID:       "reviewer-1",
		Username: "reviewer.sam",
		Email:    "sam@example.com",
		Status:   "active",
	}); err != nil {
		t.Fatalf("save reviewer: %v", err)
	}
	repo := NewInMemoryTranslationAssignmentRepository()
	created, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-owner-labels",
		EntityType:     "pages",
		SourceRecordID: "page-1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInReview,
		Priority:       PriorityNormal,
		AssigneeID:     "9e838c81-6d3e-49d7-ad8f-b6616a040a44",
		ReviewerID:     "reviewer-1",
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	data := anySliceFromValue(payload["data"])
	if len(data) != 1 {
		t.Fatalf("expected one data row, got %d", len(data))
	}
	row := extractMap(data[0])
	if got := strings.TrimSpace(toString(row["id"])); got != created.ID {
		t.Fatalf("expected id %q, got %q", created.ID, got)
	}
	if got := strings.TrimSpace(toString(row["assignee_label"])); got != "translator.jane" {
		t.Fatalf("expected assignee_label translator.jane, got %q", got)
	}
	if got := strings.TrimSpace(toString(row["reviewer_label"])); got != "reviewer.sam" {
		t.Fatalf("expected reviewer_label reviewer.sam, got %q", got)
	}
	if got := strings.TrimSpace(toString(row["assignee_id"])); got != "9e838c81-6d3e-49d7-ad8f-b6616a040a44" {
		t.Fatalf("expected assignee_id to remain stable, got %q", got)
	}
}

func TestTranslationQueueActorLabelResolverUsesUserServiceFallbackAndCaches(t *testing.T) {
	userStore := NewInMemoryUserStore()
	userRepo := &translationQueueCountingUserRepo{UserRepository: &inMemoryUserRepoAdapter{store: userStore}}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate:    featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
		UserRepository: userRepo,
		RoleRepository: &inMemoryRoleRepoAdapter{store: userStore},
	})
	if _, err := userStore.CreateUser(context.Background(), UserRecord{
		ID:       "translator-1",
		Username: "translator.jane",
		Email:    "jane@example.com",
		Status:   "active",
	}); err != nil {
		t.Fatalf("save user: %v", err)
	}

	binding := newTranslationQueueBinding(adm)
	resolver := binding.newAssignmentActorLabelResolver()
	assignments := []TranslationAssignment{
		{AssigneeID: "translator-1", ReviewerID: "translator-1"},
		{AssigneeID: "translator-1"},
	}

	first := resolver.labelsForAssignments(context.Background(), assignments)
	second := resolver.labelsForAssignments(context.Background(), assignments)

	if got := strings.TrimSpace(first["translator-1"]); got != "translator.jane" {
		t.Fatalf("expected first lookup label translator.jane, got %q", got)
	}
	if got := strings.TrimSpace(second["translator-1"]); got != "translator.jane" {
		t.Fatalf("expected cached label translator.jane, got %q", got)
	}
	if userRepo.getCount != 1 {
		t.Fatalf("expected one user lookup for repeated owner id, got %d", userRepo.getCount)
	}
}

func TestTranslationQueueAssigneesOptionsHydratesSelectedUserDirectly(t *testing.T) {
	userStore := NewInMemoryUserStore()
	userRepo := &translationQueueCountingUserRepo{UserRepository: &inMemoryUserRepoAdapter{store: userStore}}
	roleRepo := &translationQueueCountingRoleRepo{RoleRepository: &inMemoryRoleRepoAdapter{store: userStore}}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate:    featureGateFromKeys(FeatureCMS, FeatureTranslationQueue, FeatureUsers),
		UserRepository: userRepo,
		RoleRepository: roleRepo,
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView: true,
		},
	})
	if _, err := userStore.CreateUser(context.Background(), UserRecord{
		ID:        "translator-1",
		Username:  "translator.jane",
		Email:     "jane@example.com",
		FirstName: "Jane",
		LastName:  "Doe",
		Status:    "active",
	}); err != nil {
		t.Fatalf("save user: %v", err)
	}
	if _, err := userStore.CreateUser(context.Background(), UserRecord{
		ID:        "translator-2",
		Username:  "translator.two",
		Email:     "two@example.com",
		FirstName: "Translator",
		LastName:  "Two",
		Status:    "active",
	}); err != nil {
		t.Fatalf("save second user: %v", err)
	}

	repo := NewInMemoryTranslationAssignmentRepository()
	if _, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "family-1",
		EntityType:     "pages",
		SourceRecordID: "page-1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		AssigneeID:     "unrelated-assignment-assignee",
	}); err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	binding := newTranslationQueueBinding(adm)
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/options/assignees?assignee_id=translator-1,translator-2&per_page=200", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	payload := []map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 2 {
		t.Fatalf("expected two hydrated assignee options, got %+v", payload)
	}
	optionsByValue := map[string]map[string]any{}
	for _, option := range payload {
		optionsByValue[strings.TrimSpace(toString(option["value"]))] = option
	}
	if got := strings.TrimSpace(toString(optionsByValue["translator-1"]["label"])); got != "Jane Doe" {
		t.Fatalf("expected selected label Jane Doe, got %q in %+v", got, payload)
	}
	if got := strings.TrimSpace(toString(optionsByValue["translator-2"]["label"])); got != "Translator Two" {
		t.Fatalf("expected selected label Translator Two, got %q in %+v", got, payload)
	}
	if userRepo.getCount != 2 {
		t.Fatalf("expected two direct user lookups, got %d", userRepo.getCount)
	}
	if userRepo.listCount != 0 {
		t.Fatalf("expected hydrate path not to list users, got %d list calls", userRepo.listCount)
	}
	if roleRepo.rolesForUserCount != 0 {
		t.Fatalf("expected hydrate path not to hydrate roles, got %d role calls", roleRepo.rolesForUserCount)
	}
}

func TestTranslationQueueAssigneesOptionsHydratesGenericSelectedAlias(t *testing.T) {
	userStore := NewInMemoryUserStore()
	userRepo := &translationQueueCountingUserRepo{UserRepository: &inMemoryUserRepoAdapter{store: userStore}}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate:    featureGateFromKeys(FeatureCMS, FeatureTranslationQueue, FeatureUsers),
		UserRepository: userRepo,
		RoleRepository: &inMemoryRoleRepoAdapter{store: userStore},
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	if _, err := userStore.CreateUser(context.Background(), UserRecord{
		ID:        "reviewer-1",
		Username:  "reviewer.sam",
		Email:     "sam@example.com",
		FirstName: "Sam",
		LastName:  "Reviewer",
		Status:    "active",
	}); err != nil {
		t.Fatalf("save user: %v", err)
	}
	if _, err := RegisterTranslationQueuePanel(adm, NewInMemoryTranslationAssignmentRepository()); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/options/assignees?selected=reviewer-1,missing-reviewer", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	payload := []map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 2 {
		t.Fatalf("expected hydrated selected option and raw fallback, got %+v", payload)
	}
	optionsByValue := map[string]map[string]any{}
	for _, option := range payload {
		optionsByValue[strings.TrimSpace(toString(option["value"]))] = option
	}
	if got := strings.TrimSpace(toString(optionsByValue["reviewer-1"]["label"])); got != "Sam Reviewer" {
		t.Fatalf("expected selected label Sam Reviewer, got %q in %+v", got, payload)
	}
	if got := strings.TrimSpace(toString(optionsByValue["missing-reviewer"]["label"])); got != "missing-reviewer" {
		t.Fatalf("expected raw fallback label missing-reviewer, got %q in %+v", got, payload)
	}
	if userRepo.getCount != 2 {
		t.Fatalf("expected one lookup per selected id, got %d", userRepo.getCount)
	}
}

func TestTranslationQueueLocalesOptionsHydratesSelectedWithRawFallback(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	if _, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "family-1",
		EntityType:     "pages",
		SourceRecordID: "page-1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
	}); err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/options/locales?selected=fr,pt-br", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	payload := []map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 2 {
		t.Fatalf("expected selected locale hydration to return raw fallback options, got %+v", payload)
	}
	optionsByValue := map[string]map[string]any{}
	for _, option := range payload {
		optionsByValue[strings.TrimSpace(toString(option["value"]))] = option
	}
	if got := strings.TrimSpace(toString(optionsByValue["fr"]["label"])); got != "FR" {
		t.Fatalf("expected FR selected locale label, got %q in %+v", got, payload)
	}
	if got := strings.TrimSpace(toString(optionsByValue["pt-br"]["label"])); got != "PT-BR" {
		t.Fatalf("expected PT-BR selected locale label, got %q in %+v", got, payload)
	}
}

func TestTranslationQueueFamiliesOptionsHydratesSelectedWithRawFallback(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	if _, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "family-1",
		EntityType:     "pages",
		SourceRecordID: "page-1",
		SourceTitle:    "Launch Page",
		SourcePath:     "/launch",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
	}); err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/options/families?selected=family-1,missing-family&per_page=1", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	payload := []map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 2 {
		t.Fatalf("expected selected hydration to return both selected family options, got %+v", payload)
	}
	optionsByValue := map[string]map[string]any{}
	for _, option := range payload {
		optionsByValue[strings.TrimSpace(toString(option["value"]))] = option
	}
	if got := strings.TrimSpace(toString(optionsByValue["family-1"]["label"])); got != "Launch Page" {
		t.Fatalf("expected resolved family label Launch Page, got %q in %+v", got, payload)
	}
	if got := strings.TrimSpace(toString(optionsByValue["missing-family"]["label"])); got != "missing-family" {
		t.Fatalf("expected unresolved family raw fallback, got %q in %+v", got, payload)
	}
}

func TestTranslationQueueFamiliesOptionsUsesBoundedStoreForSelectedHydration(t *testing.T) {
	repo := &translationQueueFamilyOptionSpyRepo{
		InMemoryTranslationAssignmentRepository: NewInMemoryTranslationAssignmentRepository(),
		result: TranslationAssignmentFamilyOptionQueryResult{Options: []TranslationAssignmentGroupOption{{
			FamilyID:    "family-1",
			SourceTitle: "Launch Page",
			SourcePath:  "/launch",
			EntityType:  "pages",
		}}},
	}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/options/families?selected=family-1,missing-family&per_page=1", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	payload := []map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 2 {
		t.Fatalf("expected selected hydration and fallback, got %+v", payload)
	}
	optionsByValue := map[string]map[string]any{}
	for _, option := range payload {
		optionsByValue[strings.TrimSpace(toString(option["value"]))] = option
	}
	if got := strings.TrimSpace(toString(optionsByValue["family-1"]["label"])); got != "Launch Page" {
		t.Fatalf("expected resolved family label Launch Page, got %q in %+v", got, payload)
	}
	if got := strings.TrimSpace(toString(optionsByValue["missing-family"]["label"])); got != "missing-family" {
		t.Fatalf("expected unresolved family raw fallback, got %q in %+v", got, payload)
	}
	if repo.listCalls != 0 {
		t.Fatalf("expected selected hydration not to list assignments, got %d list calls", repo.listCalls)
	}
	if len(repo.calls) != 1 {
		t.Fatalf("expected one bounded family option call, got %d", len(repo.calls))
	}
	call := repo.calls[0]
	if len(call.SelectedFamilyIDs) != 2 || call.SelectedFamilyIDs[0] != "family-1" || call.SelectedFamilyIDs[1] != "missing-family" {
		t.Fatalf("expected selected IDs propagated to bounded store, got %+v", call.SelectedFamilyIDs)
	}
	if call.PerPage != 1 {
		t.Fatalf("expected per_page propagated as 1, got %d", call.PerPage)
	}
}

func TestTranslationQueueFamiliesOptionsPassesSearchFiltersAndPaginationToBoundedStore(t *testing.T) {
	repo := &translationQueueFamilyOptionSpyRepo{
		InMemoryTranslationAssignmentRepository: NewInMemoryTranslationAssignmentRepository(),
		result: TranslationAssignmentFamilyOptionQueryResult{Options: []TranslationAssignmentGroupOption{{
			FamilyID:    "family-launch",
			SourceTitle: "Launch Page",
			SourcePath:  "/launch",
			EntityType:  "pages",
		}}},
	}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/options/families?search=launch&page=2&per_page=3&entity_type=Pages&source_record_id=page-1", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	payload := []map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 1 || strings.TrimSpace(toString(payload[0]["value"])) != "family-launch" {
		t.Fatalf("expected bounded store result family-launch, got %+v", payload)
	}
	if repo.listCalls != 0 {
		t.Fatalf("expected bounded path not to list assignments, got %d list calls", repo.listCalls)
	}
	if len(repo.calls) != 1 {
		t.Fatalf("expected one bounded family option call, got %d", len(repo.calls))
	}
	call := repo.calls[0]
	if call.Search != "launch" || call.Page != 2 || call.PerPage != 3 {
		t.Fatalf("expected search/page/per_page propagated, got search=%q page=%d per_page=%d", call.Search, call.Page, call.PerPage)
	}
	if got := strings.TrimSpace(toString(call.Filters["entity_type"])); got != "pages" {
		t.Fatalf("expected entity_type filter pages, got %q in %+v", got, call.Filters)
	}
	if got := strings.TrimSpace(toString(call.Filters["source_record_id"])); got != "page-1" {
		t.Fatalf("expected source_record_id filter page-1, got %q in %+v", got, call.Filters)
	}
}

func TestTranslationQueueFamiliesOptionsDoesNotMergeSourceRecordIntoNormalSearch(t *testing.T) {
	repo := &translationQueueFamilyOptionSpyRepo{
		InMemoryTranslationAssignmentRepository: NewInMemoryTranslationAssignmentRepository(),
		result: TranslationAssignmentFamilyOptionQueryResult{Options: []TranslationAssignmentGroupOption{{
			FamilyID:    "family-launch",
			SourceTitle: "Launch Page",
			SourcePath:  "/launch",
			EntityType:  "pages",
		}}},
	}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	pageRepo := NewMemoryRepository()
	sourceRecord, err := pageRepo.Create(context.Background(), map[string]any{
		"family_id":    "family-alpha",
		"source_title": "Alpha Page",
		"source_path":  "/alpha",
	})
	if err != nil {
		t.Fatalf("create source record: %v", err)
	}
	if _, err := adm.RegisterPanel("pages", adm.Panel("pages").WithRepository(pageRepo)); err != nil {
		t.Fatalf("register pages panel: %v", err)
	}
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/options/families?search=launch&page=1&per_page=1&entity_type=pages&source_record_id="+toString(sourceRecord["id"]), nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	payload := []map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 1 {
		t.Fatalf("expected one bounded provider option, got %+v", payload)
	}
	if got := strings.TrimSpace(toString(payload[0]["value"])); got != "family-launch" {
		t.Fatalf("expected source record option not to displace bounded provider result, got %q in %+v", got, payload)
	}
	for _, option := range payload {
		if got := strings.TrimSpace(toString(option["value"])); got == "family-alpha" {
			t.Fatalf("expected normal search not to include source-record family option, got %+v", payload)
		}
	}
	if repo.listCalls != 0 {
		t.Fatalf("expected bounded path not to list assignments, got %d list calls", repo.listCalls)
	}
	if len(repo.calls) != 1 {
		t.Fatalf("expected one bounded family option call, got %d", len(repo.calls))
	}
}

func TestTranslationQueueEntityTypeOptionsArePaginated(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	for _, entityType := range []string{"pages", "articles", "products"} {
		if _, err := repo.Create(context.Background(), TranslationAssignment{
			FamilyID:       "family-" + entityType,
			EntityType:     entityType,
			SourceRecordID: entityType + "-1",
			SourceLocale:   "en",
			TargetLocale:   "es",
			AssignmentType: AssignmentTypeDirect,
			Status:         AssignmentStatusAssigned,
		}); err != nil {
			t.Fatalf("create assignment for %s: %v", entityType, err)
		}
	}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/options/entity-types?per_page=1&page=2", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	payload := []map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 1 {
		t.Fatalf("expected one paginated option, got %+v", payload)
	}
}

func TestTranslationQueueAssigneesOptionsSearchesUsersWithoutRoleHydration(t *testing.T) {
	userStore := NewInMemoryUserStore()
	userRepo := &translationQueueCountingUserRepo{UserRepository: &inMemoryUserRepoAdapter{store: userStore}}
	roleRepo := &translationQueueCountingRoleRepo{RoleRepository: &inMemoryRoleRepoAdapter{store: userStore}}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate:    featureGateFromKeys(FeatureCMS, FeatureTranslationQueue, FeatureUsers),
		UserRepository: userRepo,
		RoleRepository: roleRepo,
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView: true,
		},
	})
	if _, err := userStore.CreateUser(context.Background(), UserRecord{
		ID:        "translator-1",
		Username:  "translator.jane",
		Email:     "jane@example.com",
		FirstName: "Jane",
		LastName:  "Doe",
		Status:    "active",
	}); err != nil {
		t.Fatalf("save user: %v", err)
	}
	if _, err := RegisterTranslationQueuePanel(adm, NewInMemoryTranslationAssignmentRepository()); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/options/assignees?q=jane&per_page=200", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	payload := []map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 1 {
		t.Fatalf("expected one assignee option, got %+v", payload)
	}
	if got := strings.TrimSpace(toString(payload[0]["label"])); got != "Jane Doe" {
		t.Fatalf("expected label Jane Doe, got %q in %+v", got, payload)
	}
	if userRepo.searchCount != 1 {
		t.Fatalf("expected one direct user search, got %d", userRepo.searchCount)
	}
	if userRepo.listCount != 0 {
		t.Fatalf("expected search path not to list users through panel, got %d list calls", userRepo.listCount)
	}
	if roleRepo.rolesForUserCount != 0 {
		t.Fatalf("expected search path not to hydrate roles, got %d role calls", roleRepo.rolesForUserCount)
	}
}

type translationQueueFamilyOptionSpyRepo struct {
	*InMemoryTranslationAssignmentRepository
	calls     []TranslationAssignmentFamilyOptionQueryInput
	result    TranslationAssignmentFamilyOptionQueryResult
	err       error
	listCalls int
}

func (r *translationQueueFamilyOptionSpyRepo) List(ctx context.Context, opts ListOptions) ([]TranslationAssignment, int, error) {
	r.listCalls++
	return r.InMemoryTranslationAssignmentRepository.List(ctx, opts)
}

func (r *translationQueueFamilyOptionSpyRepo) ListAssignmentFamilyOptions(_ context.Context, input TranslationAssignmentFamilyOptionQueryInput) (TranslationAssignmentFamilyOptionQueryResult, error) {
	r.calls = append(r.calls, input)
	if r.err != nil {
		return TranslationAssignmentFamilyOptionQueryResult{}, r.err
	}
	return r.result, nil
}

type translationQueueCountingUserRepo struct {
	UserRepository
	getCount    int
	listCount   int
	searchCount int
}

func (r *translationQueueCountingUserRepo) Get(ctx context.Context, id string) (UserRecord, error) {
	r.getCount++
	return r.UserRepository.Get(ctx, id)
}

func (r *translationQueueCountingUserRepo) List(ctx context.Context, opts ListOptions) ([]UserRecord, int, error) {
	r.listCount++
	return r.UserRepository.List(ctx, opts)
}

func (r *translationQueueCountingUserRepo) Search(ctx context.Context, query string, limit int) ([]UserRecord, error) {
	r.searchCount++
	return r.UserRepository.Search(ctx, query, limit)
}

type translationQueueCountingRoleRepo struct {
	RoleRepository
	rolesForUserCount int
}

func (r *translationQueueCountingRoleRepo) RolesForUser(ctx context.Context, userID string) ([]RoleRecord, error) {
	r.rolesForUserCount++
	return r.RoleRepository.RolesForUser(ctx, userID)
}

func TestTranslationQueueBindingAssignmentsSupportsPageLocalFamilyGrouping(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:   true,
			PermAdminTranslationsClaim:  true,
			PermAdminTranslationsAssign: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	for _, assignment := range []TranslationAssignment{
		{FamilyID: "family-group-1", EntityType: "pages", SourceRecordID: "page-1", SourceTitle: "Page One", SourceLocale: "en", TargetLocale: "es", AssignmentType: AssignmentTypeOpenPool, Status: AssignmentStatusOpen, Priority: PriorityHigh},
		{FamilyID: "family-group-1", EntityType: "pages", SourceRecordID: "page-1", SourceTitle: "Page One", SourceLocale: "en", TargetLocale: "fr", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusAssigned, Priority: PriorityNormal, AssigneeID: "translator-1"},
		{FamilyID: "family-group-2", EntityType: "posts", SourceRecordID: "post-1", SourceTitle: "Post One", SourceLocale: "en", TargetLocale: "de", AssignmentType: AssignmentTypeOpenPool, Status: AssignmentStatusOpen, Priority: PriorityLow},
	} {
		if _, err := repo.Create(context.Background(), assignment); err != nil {
			t.Fatalf("create assignment: %v", err)
		}
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?group_by=family_id&per_page=2&sort=created_at&order=asc", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta := extractMap(payload["meta"])
	grouping := extractMap(meta["grouping"])
	if toString(grouping["mode"]) != "family_id" || toString(grouping["strategy"]) != "page_local" {
		t.Fatalf("expected page-local family grouping metadata, got %+v", grouping)
	}
	if intValue(grouping["assignment_count"]) != 2 || intValue(grouping["group_count"]) != 1 {
		t.Fatalf("expected current-page assignment/group counts, got %+v", grouping)
	}
	data := anySliceFromValue(payload["data"])
	if len(data) != 1 {
		t.Fatalf("expected one group row on first page, got %+v", data)
	}
	group := extractMap(data[0])
	if toString(group["row_type"]) != "group" || toString(group["group_by"]) != "family_id" {
		t.Fatalf("expected group row, got %+v", group)
	}
	if actions := extractMap(group["actions"]); len(actions) != 0 {
		t.Fatalf("expected group parent row to omit executable child actions, got %+v", actions)
	}
	if reviewActions := extractMap(group["review_actions"]); len(reviewActions) != 0 {
		t.Fatalf("expected group parent row to omit executable child review actions, got %+v", reviewActions)
	}
	actionState := extractMap(group["action_state"])
	if got := toString(actionState["scope"]); got != "children" {
		t.Fatalf("expected informational child action scope, got %+v", actionState)
	}
	children := anySliceFromValue(group["children"])
	if len(children) != 2 {
		t.Fatalf("expected two child assignments, got %+v", children)
	}
	parent := extractMap(group["parent"])
	if locales := toStringSlice(parent["target_locales"]); strings.Join(locales, ",") != "es,fr" {
		t.Fatalf("expected parent target locales es,fr, got %+v", locales)
	}
	firstChild := extractMap(children[0])
	if actions := extractMap(firstChild["actions"]); len(actions) == 0 {
		t.Fatalf("expected child rows to retain action states, got %+v", firstChild)
	}
}

func TestTranslationQueueBindingAssignmentsSupportsServerFamilyGrouping(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{allowed: map[string]bool{PermAdminTranslationsView: true}})
	repo := NewInMemoryTranslationAssignmentRepository()
	for _, assignment := range []TranslationAssignment{
		{FamilyID: "family-server-1", EntityType: "pages", SourceRecordID: "page-1", SourceTitle: "Page One", SourceLocale: "en", TargetLocale: "es", AssignmentType: AssignmentTypeOpenPool, Status: AssignmentStatusOpen, Priority: PriorityHigh, UpdatedAt: now.Add(-1 * time.Hour), CreatedAt: now.Add(-3 * time.Hour)},
		{FamilyID: "family-server-1", EntityType: "pages", SourceRecordID: "page-1", SourceTitle: "Page One", SourceLocale: "en", TargetLocale: "fr", AssignmentType: AssignmentTypeDirect, Status: AssignmentStatusInReview, Priority: PriorityNormal, ReviewerID: "reviewer-1", UpdatedAt: now.Add(-30 * time.Minute), CreatedAt: now.Add(-2 * time.Hour)},
		{FamilyID: "family-server-2", EntityType: "posts", SourceRecordID: "post-1", SourceTitle: "Post One", SourceLocale: "en", TargetLocale: "de", AssignmentType: AssignmentTypeOpenPool, Status: AssignmentStatusOpen, Priority: PriorityLow, UpdatedAt: now.Add(-4 * time.Hour), CreatedAt: now.Add(-4 * time.Hour)},
	} {
		if _, err := repo.Create(context.Background(), assignment); err != nil {
			t.Fatalf("create assignment: %v", err)
		}
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?group_by=family_id&group_strategy=server_family&per_page=1&sort=updated_at&order=desc", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta := extractMap(payload["meta"])
	if intValue(meta["total"]) != 2 || intValue(meta["assignment_total"]) != 3 {
		t.Fatalf("expected family total 2 and assignment total 3, got %+v", meta)
	}
	reviewCounts := extractMap(meta["review_aggregate_counts"])
	for _, key := range TranslationQueueReviewAggregateCountKeys() {
		if _, ok := reviewCounts[key]; !ok {
			t.Fatalf("expected server-family review aggregate count key %q in %+v", key, reviewCounts)
		}
	}
	if unavailable := toStringSlice(meta["review_aggregate_counts_unavailable"]); len(unavailable) != len(TranslationQueueReviewAggregateCountKeys()) {
		t.Fatalf("expected server-family reviewer aggregate counts unavailable, got %+v", unavailable)
	}
	if degraded := toStringSlice(meta["review_aggregate_counts_degraded"]); len(degraded) != 0 {
		t.Fatalf("expected server-family reviewer aggregate counts not degraded, got %+v", degraded)
	}
	grouping := extractMap(meta["grouping"])
	if toString(grouping["strategy"]) != "server_family" || intValue(grouping["family_total"]) != 2 || intValue(grouping["assignment_total"]) != 3 {
		t.Fatalf("expected server_family grouping totals, got %+v", grouping)
	}
	data := anySliceFromValue(payload["data"])
	if len(data) != 1 {
		t.Fatalf("expected one parent family row, got %+v", data)
	}
	parent := extractMap(data[0])
	if toString(parent["row_type"]) != "family" || toString(parent["id"]) != "family:family-server-1" {
		t.Fatalf("expected server family parent row, got %+v", parent)
	}
	if intValue(parent["assignment_count"]) != 2 || intValue(parent["locale_count"]) != 2 {
		t.Fatalf("expected aggregate counts on parent, got %+v", parent)
	}
	if actions := extractMap(parent["actions"]); len(actions) != 0 {
		t.Fatalf("expected parent row to omit executable actions, got %+v", actions)
	}
	expansion := extractMap(parent["expansion"])
	if toString(expansion["route"]) != "translations.assignments.family_assignments" {
		t.Fatalf("expected child expansion route, got %+v", expansion)
	}
	if !strings.Contains(toString(expansion["href"]), "/admin/api/translations/families/family-server-1/assignments") {
		t.Fatalf("expected expansion href for family child endpoint, got %+v", expansion)
	}
	if href := strings.TrimSpace(toString(parent["assignments_href"])); href != "" {
		t.Fatalf("expected API parent row not to expose SSR assignments href, got %q", href)
	}
	if toBool(parent["family_blocker_count_available"]) {
		t.Fatalf("expected in-memory blocker aggregate to be degraded, got %+v", parent)
	}

	childReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/families/family-server-1/assignments?page=1&per_page=1&sort=updated_at&order=desc", nil)
	childReq.Header.Set("X-User-ID", "manager-1")
	childResp, err := app.Test(childReq)
	if err != nil {
		t.Fatalf("child request error: %v", err)
	}
	defer childResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if childResp.StatusCode != http.StatusOK {
		t.Fatalf("child status=%d want=200", childResp.StatusCode)
	}
	childPayload := map[string]any{}
	if err := json.NewDecoder(childResp.Body).Decode(&childPayload); err != nil {
		t.Fatalf("decode child response: %v", err)
	}
	childMeta := extractMap(childPayload["meta"])
	if intValue(childMeta["total"]) != 2 || !toBool(childMeta["has_next"]) {
		t.Fatalf("expected child pagination metadata, got %+v", childMeta)
	}
	childRows := anySliceFromValue(childPayload["data"])
	if len(childRows) != 1 || len(extractMap(extractMap(childRows[0])["actions"])) == 0 {
		t.Fatalf("expected normal assignment child row with actions, got %+v", childRows)
	}

	outOfRangeReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?group_by=family_id&group_strategy=server_family&page=99&per_page=1&sort=created_at&order=desc", nil)
	outOfRangeReq.Header.Set("X-User-ID", "manager-1")
	outOfRangeResp, err := app.Test(outOfRangeReq)
	if err != nil {
		t.Fatalf("out-of-range request error: %v", err)
	}
	defer outOfRangeResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if outOfRangeResp.StatusCode != http.StatusOK {
		t.Fatalf("out-of-range status=%d want=200", outOfRangeResp.StatusCode)
	}
	outOfRangePayload := map[string]any{}
	if err := json.NewDecoder(outOfRangeResp.Body).Decode(&outOfRangePayload); err != nil {
		t.Fatalf("decode out-of-range response: %v", err)
	}
	outOfRangeMeta := extractMap(outOfRangePayload["meta"])
	if intValue(outOfRangeMeta["page"]) != 2 || intValue(outOfRangeMeta["total"]) != 2 {
		t.Fatalf("expected out-of-range family page to clamp to final page, got %+v", outOfRangeMeta)
	}
	outOfRangeData := anySliceFromValue(outOfRangePayload["data"])
	if len(outOfRangeData) != 1 {
		t.Fatalf("expected one clamped parent family row, got %+v", outOfRangeData)
	}
	outOfRangeParent := extractMap(outOfRangeData[0])
	if toString(outOfRangeParent["id"]) != "family:family-server-2" {
		t.Fatalf("expected final family page to return family-server-2, got %+v", outOfRangeParent)
	}

	outOfRangeChildReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/families/family-server-1/assignments?page=99&per_page=1&sort=created_at&order=desc", nil)
	outOfRangeChildReq.Header.Set("X-User-ID", "manager-1")
	outOfRangeChildResp, err := app.Test(outOfRangeChildReq)
	if err != nil {
		t.Fatalf("out-of-range child request error: %v", err)
	}
	defer outOfRangeChildResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if outOfRangeChildResp.StatusCode != http.StatusOK {
		t.Fatalf("out-of-range child status=%d want=200", outOfRangeChildResp.StatusCode)
	}
	outOfRangeChildPayload := map[string]any{}
	if err := json.NewDecoder(outOfRangeChildResp.Body).Decode(&outOfRangeChildPayload); err != nil {
		t.Fatalf("decode out-of-range child response: %v", err)
	}
	outOfRangeChildMeta := extractMap(outOfRangeChildPayload["meta"])
	if intValue(outOfRangeChildMeta["page"]) != 2 || intValue(outOfRangeChildMeta["total"]) != 2 || toBool(outOfRangeChildMeta["has_next"]) {
		t.Fatalf("expected family assignment page to clamp to final page, got %+v", outOfRangeChildMeta)
	}
	outOfRangeChildRows := anySliceFromValue(outOfRangeChildPayload["data"])
	if len(outOfRangeChildRows) != 1 {
		t.Fatalf("expected one clamped child row, got %+v", outOfRangeChildRows)
	}
	outOfRangeChild := extractMap(outOfRangeChildRows[0])
	if toString(outOfRangeChild["target_locale"]) != "es" {
		t.Fatalf("expected final child page to return es assignment, got %+v", outOfRangeChild)
	}
}

func TestTranslationQueueBindingAssignmentsServerFamilyRequeriesNormalizedPages(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{allowed: map[string]bool{PermAdminTranslationsView: true}})
	finalAssignment := TranslationAssignment{
		ID:             "asg-final-family-page",
		FamilyID:       "family-custom",
		EntityType:     "pages",
		SourceRecordID: "page-final",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
		UpdatedAt:      now,
		CreatedAt:      now,
	}
	repo := &optimizedAssignmentFamilyRepo{
		optimizedAssignmentReadRepo: &optimizedAssignmentReadRepo{},
		listFamilyGroups: func(_ context.Context, input TranslationAssignmentFamilyGroupQueryInput) (TranslationAssignmentFamilyGroupQueryResult, error) {
			if input.Page == 2 && input.PerPage == 1 {
				return TranslationAssignmentFamilyGroupQueryResult{
					Families: []TranslationAssignmentFamilyGroup{{
						FamilyID:        "family-final",
						FamilyLabel:     "Final Family",
						EntityType:      "pages",
						SourceRecordID:  "page-final",
						SourceLocale:    "en",
						SourceTitle:     "Final Page",
						AssignmentCount: 1,
						LocaleCount:     1,
						TargetLocales:   []string{"es"},
						StatusCounts:    map[string]int{string(AssignmentStatusOpen): 1},
						Priority:        PriorityNormal,
						UpdatedAt:       now,
						CreatedAt:       now,
					}},
					FamilyTotal:     2,
					AssignmentTotal: 2,
				}, nil
			}
			return TranslationAssignmentFamilyGroupQueryResult{
				Families: []TranslationAssignmentFamilyGroup{{
					FamilyID:        "family-wrong",
					FamilyLabel:     "Wrong Family",
					EntityType:      "pages",
					SourceRecordID:  "page-wrong",
					SourceLocale:    "en",
					SourceTitle:     "Wrong Page",
					AssignmentCount: 1,
					LocaleCount:     1,
					TargetLocales:   []string{"fr"},
					StatusCounts:    map[string]int{string(AssignmentStatusOpen): 1},
					Priority:        PriorityNormal,
					UpdatedAt:       now,
					CreatedAt:       now,
				}},
				FamilyTotal:     2,
				AssignmentTotal: 2,
			}, nil
		},
		listFamilyAssignments: func(_ context.Context, input TranslationAssignmentFamilyAssignmentsQueryInput) (TranslationAssignmentFamilyAssignmentsQueryResult, error) {
			if input.Page == 2 && input.PerPage == 1 {
				return TranslationAssignmentFamilyAssignmentsQueryResult{Items: []TranslationAssignment{finalAssignment}, Total: 2, HasNext: false}, nil
			}
			return TranslationAssignmentFamilyAssignmentsQueryResult{Items: []TranslationAssignment{{
				ID:             "asg-wrong-family-page",
				FamilyID:       "family-custom",
				EntityType:     "pages",
				SourceRecordID: "page-wrong",
				SourceLocale:   "en",
				TargetLocale:   "fr",
				AssignmentType: AssignmentTypeOpenPool,
				Status:         AssignmentStatusOpen,
				Priority:       PriorityNormal,
				UpdatedAt:      now,
				CreatedAt:      now,
			}}, Total: 2, HasNext: true}, nil
		},
	}
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?group_by=family_id&group_strategy=server_family&page=99&per_page=1", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	if repo.familyGroupCalls != 2 {
		t.Fatalf("expected raw and normalized family group calls, got %d", repo.familyGroupCalls)
	}
	if len(repo.familyGroupInputs) != 2 || repo.familyGroupInputs[0].Page != 99 || repo.familyGroupInputs[1].Page != 2 || repo.familyGroupInputs[1].PerPage != 1 {
		t.Fatalf("expected family group requery on normalized page, got %+v", repo.familyGroupInputs)
	}
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta := extractMap(payload["meta"])
	if intValue(meta["page"]) != 2 || intValue(meta["per_page"]) != 1 || intValue(meta["total"]) != 2 {
		t.Fatalf("expected normalized family metadata, got %+v", meta)
	}
	data := anySliceFromValue(payload["data"])
	if len(data) != 1 {
		t.Fatalf("expected one normalized family row, got %+v", data)
	}
	if row := extractMap(data[0]); toString(row["id"]) != "family:family-final" {
		t.Fatalf("expected normalized family row, got %+v", row)
	}

	childReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/families/family-custom/assignments?page=99&per_page=1", nil)
	childReq.Header.Set("X-User-ID", "manager-1")
	childResp, err := app.Test(childReq)
	if err != nil {
		t.Fatalf("child request error: %v", err)
	}
	defer childResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if childResp.StatusCode != http.StatusOK {
		t.Fatalf("child status=%d want=200", childResp.StatusCode)
	}
	if repo.familyAssignmentCalls != 2 {
		t.Fatalf("expected raw and normalized family assignment calls, got %d", repo.familyAssignmentCalls)
	}
	if len(repo.familyAssignmentInputs) != 2 || repo.familyAssignmentInputs[0].Page != 99 || repo.familyAssignmentInputs[1].Page != 2 || repo.familyAssignmentInputs[1].PerPage != 1 {
		t.Fatalf("expected family assignment requery on normalized page, got %+v", repo.familyAssignmentInputs)
	}
	childPayload := map[string]any{}
	if err := json.NewDecoder(childResp.Body).Decode(&childPayload); err != nil {
		t.Fatalf("decode child response: %v", err)
	}
	childMeta := extractMap(childPayload["meta"])
	if intValue(childMeta["page"]) != 2 || intValue(childMeta["per_page"]) != 1 || intValue(childMeta["total"]) != 2 || toBool(childMeta["has_next"]) {
		t.Fatalf("expected normalized child metadata, got %+v", childMeta)
	}
	childRows := anySliceFromValue(childPayload["data"])
	if len(childRows) != 1 {
		t.Fatalf("expected one normalized child row, got %+v", childRows)
	}
	if row := extractMap(childRows[0]); toString(row["id"]) != "asg-final-family-page" {
		t.Fatalf("expected normalized child assignment, got %+v", row)
	}
}

func TestTranslationQueueBindingAssignmentsRejectsUnsupportedServerFamilySort(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{allowed: map[string]bool{PermAdminTranslationsView: true}})
	repo := NewInMemoryTranslationAssignmentRepository()
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	app := newTranslationQueueTestApp(t, newTranslationQueueBinding(adm))
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?group_by=family_id&group_strategy=server_family&sort=locale", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d want=400", resp.StatusCode)
	}
}

func TestTranslationQueueBindingAssignmentsRejectsServerFamilyWithoutGroupedRepository(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{allowed: map[string]bool{PermAdminTranslationsView: true}})
	repo := &optimizedAssignmentReadRepo{}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	app := newTranslationQueueTestApp(t, newTranslationQueueBinding(adm))
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?group_by=family_id&group_strategy=server_family", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d want=400", resp.StatusCode)
	}
}

func TestTranslationQueueBindingAssignmentsRejectsUnsupportedGrouping(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{allowed: map[string]bool{PermAdminTranslationsView: true}})
	repo := NewInMemoryTranslationAssignmentRepository()
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	app := newTranslationQueueTestApp(t, newTranslationQueueBinding(adm))

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?group_by=content_type", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d want=400", resp.StatusCode)
	}
}

func TestTranslationQueueBindingAssignmentsUsesOptimizedPageAndReviewerSummary(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:   true,
			PermAdminTranslationsClaim:  true,
			PermAdminTranslationsAssign: true,
		},
	})
	repo := &optimizedAssignmentReadRepo{
		pageItems: []TranslationAssignment{{
			ID:             "asg-optimized-page",
			FamilyID:       "family-optimized-page",
			EntityType:     "pages",
			SourceRecordID: "page-optimized",
			SourceLocale:   "en",
			TargetLocale:   "es",
			AssignmentType: AssignmentTypeOpenPool,
			Status:         AssignmentStatusOpen,
			Priority:       PriorityNormal,
			UpdatedAt:      now,
			CreatedAt:      now,
		}},
		reviewerCounts: map[string]int{"review_inbox": 1, "review_overdue": 0, "review_blocked": 0, "review_changes_requested": 0},
	}
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?tenant_id=tenant-1&org_id=org-1", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	if repo.listCalls != 0 {
		t.Fatalf("optimized assignment endpoint called List %d times", repo.listCalls)
	}
	if repo.pageCalls != 1 {
		t.Fatalf("expected one optimized page call, got %d", repo.pageCalls)
	}
	if repo.reviewerCalls != 1 {
		t.Fatalf("expected one optimized reviewer summary call, got %d", repo.reviewerCalls)
	}
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta := extractMap(payload["meta"])
	reviewCounts := extractMap(meta["review_aggregate_counts"])
	for _, key := range TranslationQueueReviewAggregateCountKeys() {
		if _, ok := reviewCounts[key]; !ok {
			t.Fatalf("expected review aggregate count key %q in %+v", key, reviewCounts)
		}
	}
	if unavailable := toStringSlice(meta["review_aggregate_counts_unavailable"]); len(unavailable) != 0 {
		t.Fatalf("expected no unavailable reviewer aggregate keys, got %+v", unavailable)
	}
	if degraded := toStringSlice(meta["review_aggregate_counts_degraded"]); len(degraded) != 0 {
		t.Fatalf("expected no degraded reviewer aggregate keys, got %+v", degraded)
	}
}

func TestTranslationQueueBindingAssignmentsOptimizedPageRequeriesNormalizedPage(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{allowed: map[string]bool{PermAdminTranslationsView: true}})
	finalAssignment := TranslationAssignment{
		ID:             "asg-final-page",
		FamilyID:       "family-final-page",
		EntityType:     "pages",
		SourceRecordID: "page-final",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
		UpdatedAt:      now,
		CreatedAt:      now,
	}
	repo := &optimizedAssignmentReadRepo{
		listAssignmentPage: func(_ context.Context, input TranslationAssignmentPageQueryInput) (TranslationAssignmentPageQueryResult, error) {
			if input.Page == 2 && input.PerPage == 2 {
				return TranslationAssignmentPageQueryResult{Items: []TranslationAssignment{finalAssignment}, Total: 3}, nil
			}
			return TranslationAssignmentPageQueryResult{Items: []TranslationAssignment{{
				ID:             "asg-wrong-page",
				FamilyID:       "family-wrong-page",
				EntityType:     "pages",
				SourceRecordID: "page-wrong",
				SourceLocale:   "en",
				TargetLocale:   "fr",
				AssignmentType: AssignmentTypeOpenPool,
				Status:         AssignmentStatusOpen,
				Priority:       PriorityNormal,
				UpdatedAt:      now,
				CreatedAt:      now,
			}}, Total: 3}, nil
		},
	}
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?page=99&per_page=2", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	if repo.pageCalls != 2 {
		t.Fatalf("expected raw and normalized optimized page calls, got %d", repo.pageCalls)
	}
	if len(repo.pageInputs) != 2 || repo.pageInputs[0].Page != 99 || repo.pageInputs[1].Page != 2 || repo.pageInputs[1].PerPage != 2 {
		t.Fatalf("expected optimized page requery on normalized page, got %+v", repo.pageInputs)
	}
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta := extractMap(payload["meta"])
	if intValue(meta["page"]) != 2 || intValue(meta["per_page"]) != 2 || intValue(meta["total"]) != 3 {
		t.Fatalf("expected normalized pagination metadata, got %+v", meta)
	}
	data := anySliceFromValue(payload["data"])
	if len(data) != 1 {
		t.Fatalf("expected one normalized page row, got %+v", data)
	}
	if row := extractMap(data[0]); toString(row["id"]) != "asg-final-page" {
		t.Fatalf("expected normalized page assignment, got %+v", row)
	}
}

func TestTranslationQueueBindingAssignmentsOptimizedPageDoesNotFallbackWhenReviewerSummaryUnsupported(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{allowed: map[string]bool{PermAdminTranslationsView: true}})
	repo := &optimizedAssignmentReadRepo{
		pageItems: []TranslationAssignment{{
			ID:             "asg-optimized-page",
			FamilyID:       "family-optimized-page",
			EntityType:     "pages",
			SourceRecordID: "page-optimized",
			SourceLocale:   "en",
			TargetLocale:   "es",
			AssignmentType: AssignmentTypeOpenPool,
			Status:         AssignmentStatusOpen,
			Priority:       PriorityNormal,
			UpdatedAt:      now,
			CreatedAt:      now,
		}},
		reviewerErr: ErrTranslationAssignmentQueryUnsupported,
	}
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?tenant_id=tenant-1&org_id=org-1&per_page=5", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	if repo.listCalls != 0 {
		t.Fatalf("optimized assignment endpoint called List %d times after unsupported reviewer summary", repo.listCalls)
	}
	if repo.pageCalls != 1 {
		t.Fatalf("expected one optimized page call, got %d", repo.pageCalls)
	}
	if repo.reviewerCalls != 1 {
		t.Fatalf("expected one optimized reviewer summary call, got %d", repo.reviewerCalls)
	}
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta := extractMap(payload["meta"])
	reviewCounts := extractMap(meta["review_aggregate_counts"])
	for _, key := range TranslationQueueReviewAggregateCountKeys() {
		if _, ok := reviewCounts[key]; !ok {
			t.Fatalf("expected review aggregate count key %q in %+v", key, reviewCounts)
		}
	}
	unavailable := toStringSlice(meta["review_aggregate_counts_unavailable"])
	if len(unavailable) != len(TranslationQueueReviewAggregateCountKeys()) {
		t.Fatalf("expected all reviewer aggregate keys unavailable, got %+v", unavailable)
	}
	if degraded := toStringSlice(meta["review_aggregate_counts_degraded"]); len(degraded) != 0 {
		t.Fatalf("expected no degraded reviewer aggregate keys for unsupported summary, got %+v", degraded)
	}
}

func TestTranslationQueueBindingAssignmentsOptimizedPageDoesNotFallbackWhenReviewerSummaryFails(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{allowed: map[string]bool{PermAdminTranslationsView: true}})
	repo := &optimizedAssignmentReadRepo{
		pageItems: []TranslationAssignment{{
			ID:             "asg-optimized-page",
			FamilyID:       "family-optimized-page",
			EntityType:     "pages",
			SourceRecordID: "page-optimized",
			SourceLocale:   "en",
			TargetLocale:   "es",
			AssignmentType: AssignmentTypeOpenPool,
			Status:         AssignmentStatusOpen,
			Priority:       PriorityNormal,
			UpdatedAt:      now,
			CreatedAt:      now,
		}},
		reviewerErr: errors.New("reviewer aggregate failed"),
	}
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?tenant_id=tenant-1&org_id=org-1&per_page=5", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	if repo.listCalls != 0 {
		t.Fatalf("optimized assignment endpoint called List %d times after failed reviewer summary", repo.listCalls)
	}
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta := extractMap(payload["meta"])
	degraded := toStringSlice(meta["review_aggregate_counts_degraded"])
	if len(degraded) != len(TranslationQueueReviewAggregateCountKeys()) {
		t.Fatalf("expected all reviewer aggregate keys degraded, got %+v", degraded)
	}
	if unavailable := toStringSlice(meta["review_aggregate_counts_unavailable"]); len(unavailable) != 0 {
		t.Fatalf("expected no unavailable reviewer aggregate keys for failed summary, got %+v", unavailable)
	}
}

func TestTranslationQueueBindingAssignmentsPrefersPartialReviewerAggregateSummary(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{allowed: map[string]bool{PermAdminTranslationsView: true}})
	baseRepo := &optimizedAssignmentReadRepo{
		pageItems: []TranslationAssignment{{
			ID:             "asg-optimized-page",
			FamilyID:       "family-optimized-page",
			EntityType:     "pages",
			SourceRecordID: "page-optimized",
			SourceLocale:   "en",
			TargetLocale:   "es",
			AssignmentType: AssignmentTypeOpenPool,
			Status:         AssignmentStatusInReview,
			Priority:       PriorityNormal,
			UpdatedAt:      now,
			CreatedAt:      now,
		}},
		reviewerCounts: map[string]int{"review_inbox": 99},
	}
	repo := &partialAggregateAssignmentReadRepo{
		optimizedAssignmentReadRepo: baseRepo,
		summary: TranslationAssignmentReviewerAggregateSummary{
			Counts:      map[string]int{"review_inbox": 2, "review_overdue": 1, "review_changes_requested": 3},
			Unavailable: []string{"review_blocked"},
		},
	}
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?tenant_id=tenant-1&org_id=org-1&per_page=5", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	if repo.listCalls != 0 {
		t.Fatalf("optimized assignment endpoint called List %d times", repo.listCalls)
	}
	if repo.summaryCalls != 1 {
		t.Fatalf("expected one partial reviewer aggregate call, got %d", repo.summaryCalls)
	}
	if repo.reviewerCalls != 0 {
		t.Fatalf("expected legacy reviewer aggregate not to be called, got %d", repo.reviewerCalls)
	}
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta := extractMap(payload["meta"])
	reviewCounts := extractMap(meta["review_aggregate_counts"])
	if got := intValue(reviewCounts["review_inbox"]); got != 2 {
		t.Fatalf("expected partial review_inbox count 2, got %+v", reviewCounts)
	}
	if got := intValue(reviewCounts["review_blocked"]); got != 0 {
		t.Fatalf("expected initialized blocked placeholder 0, got %+v", reviewCounts)
	}
	unavailable := toStringSlice(meta["review_aggregate_counts_unavailable"])
	if len(unavailable) != 1 || unavailable[0] != "review_blocked" {
		t.Fatalf("expected review_blocked unavailable, got %+v", unavailable)
	}
}

type optimizedAssignmentReadRepo struct {
	pageItems          []TranslationAssignment
	listAssignmentPage func(context.Context, TranslationAssignmentPageQueryInput) (TranslationAssignmentPageQueryResult, error)
	pageInputs         []TranslationAssignmentPageQueryInput
	reviewerCounts     map[string]int
	reviewerErr        error
	listCalls          int
	pageCalls          int
	reviewerCalls      int
}

func (r *optimizedAssignmentReadRepo) List(context.Context, ListOptions) ([]TranslationAssignment, int, error) {
	r.listCalls++
	return nil, 0, errors.New("List must not be called by optimized assignment page")
}

func (r *optimizedAssignmentReadRepo) ListAssignmentPage(ctx context.Context, input TranslationAssignmentPageQueryInput) (TranslationAssignmentPageQueryResult, error) {
	r.pageCalls++
	r.pageInputs = append(r.pageInputs, input)
	if r.listAssignmentPage != nil {
		return r.listAssignmentPage(ctx, input)
	}
	return TranslationAssignmentPageQueryResult{Items: append([]TranslationAssignment{}, r.pageItems...), Total: len(r.pageItems)}, nil
}

func (r *optimizedAssignmentReadRepo) AssignmentReviewerAggregateCounts(context.Context, TranslationAssignmentReviewerAggregateInput) (map[string]int, error) {
	r.reviewerCalls++
	out := map[string]int{}
	maps.Copy(out, r.reviewerCounts)
	return out, r.reviewerErr
}

func (r *optimizedAssignmentReadRepo) Create(context.Context, TranslationAssignment) (TranslationAssignment, error) {
	return TranslationAssignment{}, errors.New("not implemented")
}

func (r *optimizedAssignmentReadRepo) CreateOrReuseActive(context.Context, TranslationAssignment) (TranslationAssignment, bool, error) {
	return TranslationAssignment{}, false, errors.New("not implemented")
}

func (r *optimizedAssignmentReadRepo) Get(context.Context, string) (TranslationAssignment, error) {
	return TranslationAssignment{}, errors.New("not implemented")
}

func (r *optimizedAssignmentReadRepo) Update(context.Context, TranslationAssignment, int64) (TranslationAssignment, error) {
	return TranslationAssignment{}, errors.New("not implemented")
}

type optimizedAssignmentFamilyRepo struct {
	*optimizedAssignmentReadRepo
	listFamilyGroups       func(context.Context, TranslationAssignmentFamilyGroupQueryInput) (TranslationAssignmentFamilyGroupQueryResult, error)
	listFamilyAssignments  func(context.Context, TranslationAssignmentFamilyAssignmentsQueryInput) (TranslationAssignmentFamilyAssignmentsQueryResult, error)
	familyGroupInputs      []TranslationAssignmentFamilyGroupQueryInput
	familyAssignmentInputs []TranslationAssignmentFamilyAssignmentsQueryInput
	familyGroupCalls       int
	familyAssignmentCalls  int
}

func (r *optimizedAssignmentFamilyRepo) ListAssignmentFamilyGroups(ctx context.Context, input TranslationAssignmentFamilyGroupQueryInput) (TranslationAssignmentFamilyGroupQueryResult, error) {
	r.familyGroupCalls++
	r.familyGroupInputs = append(r.familyGroupInputs, input)
	if r.listFamilyGroups != nil {
		return r.listFamilyGroups(ctx, input)
	}
	return TranslationAssignmentFamilyGroupQueryResult{}, ErrTranslationAssignmentQueryUnsupported
}

func (r *optimizedAssignmentFamilyRepo) ListFamilyAssignments(ctx context.Context, input TranslationAssignmentFamilyAssignmentsQueryInput) (TranslationAssignmentFamilyAssignmentsQueryResult, error) {
	r.familyAssignmentCalls++
	r.familyAssignmentInputs = append(r.familyAssignmentInputs, input)
	if r.listFamilyAssignments != nil {
		return r.listFamilyAssignments(ctx, input)
	}
	return TranslationAssignmentFamilyAssignmentsQueryResult{}, ErrTranslationAssignmentQueryUnsupported
}

type partialAggregateAssignmentReadRepo struct {
	*optimizedAssignmentReadRepo
	summary      TranslationAssignmentReviewerAggregateSummary
	summaryErr   error
	summaryCalls int
}

func (r *partialAggregateAssignmentReadRepo) AssignmentReviewerAggregateSummary(context.Context, TranslationAssignmentReviewerAggregateInput) (TranslationAssignmentReviewerAggregateSummary, error) {
	r.summaryCalls++
	return r.summary, r.summaryErr
}

func TestTranslationQueueBindingAssignmentsExposeReviewerGuardFeedbackAndQASummary(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired:      true,
		LastRejectionReason: "Please preserve the CTA token.",
	})
	fixture.admin.featureGate = featureGateFromKeys(
		FeatureCMS,
		FeatureTranslationQueue,
		FeatureTranslationQATerms,
		FeatureTranslationQAStyle,
	)

	assignment, err := fixture.repo.Get(context.Background(), fixture.assignmentID)
	if err != nil {
		t.Fatalf("load assignment: %v", err)
	}
	assignment.Status = AssignmentStatusInReview
	assignment.ReviewerID = "reviewer-1"
	assignment.LastReviewerID = "reviewer-1"
	if _, updateAssignmentErr := fixture.repo.Update(context.Background(), assignment, assignment.Version); updateAssignmentErr != nil {
		t.Fatalf("update assignment: %v", updateAssignmentErr)
	}

	source, err := fixture.content.Page(context.Background(), "page-1", "")
	if err != nil || source == nil {
		t.Fatalf("load source page: %v", err)
	}
	updatedSource := cloneCMSPage(*source)
	updatedSource.Title = "Translation publish guide {{cta}}"
	updatedSource.Data["body"] = "Translation guide for publish workflows from the home page. Review https://example.com <strong>now</strong>."
	if _, updateSourceErr := fixture.content.UpdatePage(context.Background(), updatedSource); updateSourceErr != nil {
		t.Fatalf("update source page: %v", updateSourceErr)
	}

	target, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || target == nil {
		t.Fatalf("load target page: %v", err)
	}
	updatedTarget := cloneCMSPage(*target)
	updatedTarget.Title = "Guide de contenu"
	updatedTarget.Data["body"] = "Publier le contenu depuis l'accueil."
	if _, updateTargetErr := fixture.content.UpdatePage(context.Background(), updatedTarget); updateTargetErr != nil {
		t.Fatalf("update target page: %v", updateTargetErr)
	}
	syncTranslationFamilyFixtureStore(t, fixture.admin, "production")

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments", nil)
	req.Header.Set("X-User-ID", "reviewer-2")
	resp, err := fixture.app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if decodeErr := json.NewDecoder(resp.Body).Decode(&payload); decodeErr != nil {
		t.Fatalf("decode response: %v", decodeErr)
	}
	data := anySliceFromValue(payload["data"])
	if len(data) != 1 {
		t.Fatalf("expected one queue row, got %d", len(data))
	}
	row := extractMap(data[0])
	if got := strings.TrimSpace(toString(row["last_rejection_reason"])); got != "Please preserve the CTA token." {
		t.Fatalf("expected last_rejection_reason, got %+v", row)
	}
	reviewFeedback := extractMap(row["review_feedback"])
	if got := strings.TrimSpace(toString(reviewFeedback["last_rejection_reason"])); got != "Please preserve the CTA token." {
		t.Fatalf("expected review_feedback last_rejection_reason, got %+v", reviewFeedback)
	}
	if got := strings.TrimSpace(toString(reviewFeedback["last_reviewer_id"])); got != "reviewer-1" {
		t.Fatalf("expected review_feedback last_reviewer_id reviewer-1, got %+v", reviewFeedback)
	}

	reviewActions := extractMap(row["review_actions"])
	approve := extractMap(reviewActions["approve"])
	if enabled := toBool(approve["enabled"]); enabled {
		t.Fatalf("expected approve disabled for non-reviewer, got %+v", approve)
	}
	if got := strings.TrimSpace(toString(approve["reason_code"])); got != ActionDisabledReasonCodePermissionDenied {
		t.Fatalf("expected reviewer guard permission denied, got %+v", approve)
	}
	if got := strings.TrimSpace(toString(approve["expected_reviewer_id"])); got != "reviewer-1" {
		t.Fatalf("expected expected_reviewer_id reviewer-1, got %+v", approve)
	}
	archive := extractMap(reviewActions["archive"])
	if enabled := toBool(archive["enabled"]); !enabled {
		t.Fatalf("expected archive enabled for review row, got %+v", archive)
	}

	qaSummary := extractMap(row["qa_summary"])
	if enabled := toBool(qaSummary["enabled"]); !enabled {
		t.Fatalf("expected qa_summary enabled, got %+v", qaSummary)
	}
	if got := intValue(qaSummary["warning_count"]); got <= 0 {
		t.Fatalf("expected qa warning count > 0, got %+v", qaSummary)
	}
	if got := intValue(qaSummary["blocker_count"]); got <= 0 {
		t.Fatalf("expected qa blocker count > 0, got %+v", qaSummary)
	}

	reqReviewer := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments", nil)
	reqReviewer.Header.Set("X-User-ID", "reviewer-1")
	respReviewer, err := fixture.app.Test(reqReviewer)
	if err != nil {
		t.Fatalf("reviewer request error: %v", err)
	}
	defer respReviewer.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if respReviewer.StatusCode != http.StatusOK {
		t.Fatalf("reviewer status=%d want=200", respReviewer.StatusCode)
	}

	reviewerPayload := map[string]any{}
	if reviewerDecodeErr := json.NewDecoder(respReviewer.Body).Decode(&reviewerPayload); reviewerDecodeErr != nil {
		t.Fatalf("decode reviewer payload: %v", reviewerDecodeErr)
	}
	meta := extractMap(reviewerPayload["meta"])
	if got := strings.TrimSpace(toString(meta["review_actor_id"])); got != "reviewer-1" {
		t.Fatalf("expected review_actor_id reviewer-1, got %+v", meta)
	}
	reviewCounts := extractMap(meta["review_aggregate_counts"])
	if got := intValue(reviewCounts["review_inbox"]); got != 1 {
		t.Fatalf("expected review_inbox count 1, got %+v", reviewCounts)
	}
	if got := intValue(reviewCounts["review_blocked"]); got != 1 {
		t.Fatalf("expected review_blocked count 1, got %+v", reviewCounts)
	}

	reqActorlessPreset := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?reviewer_id=__me__", nil)
	respActorlessPreset, err := fixture.app.Test(reqActorlessPreset)
	if err != nil {
		t.Fatalf("actorless preset request error: %v", err)
	}
	defer respActorlessPreset.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if respActorlessPreset.StatusCode != http.StatusOK {
		t.Fatalf("actorless preset status=%d want=200", respActorlessPreset.StatusCode)
	}

	actorlessPresetPayload := map[string]any{}
	if err := json.NewDecoder(respActorlessPreset.Body).Decode(&actorlessPresetPayload); err != nil {
		t.Fatalf("decode actorless preset payload: %v", err)
	}
	actorlessData := anySliceFromValue(actorlessPresetPayload["data"])
	if got := len(actorlessData); got != 0 {
		t.Fatalf("expected actorless reviewer preset to match zero assignments, got %d", got)
	}
	actorlessMeta := extractMap(actorlessPresetPayload["meta"])
	if got := strings.TrimSpace(toString(actorlessMeta["review_actor_id"])); got != "" {
		t.Fatalf("expected empty review_actor_id for actorless reviewer preset, got %+v", actorlessMeta)
	}
}

func TestTranslationQueueBindingAssignmentsSupportStableReviewStateAndGroupFilters(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
	})
	enableTranslationEditorQAWithBlockers(t, fixture)

	reviewAssignment, err := fixture.repo.Get(context.Background(), fixture.assignmentID)
	if err != nil {
		t.Fatalf("load assignment: %v", err)
	}
	reviewAssignment.Status = AssignmentStatusInReview
	reviewAssignment.ReviewerID = "reviewer-1"
	reviewAssignment.LastReviewerID = "reviewer-1"
	reviewAssignment.FamilyID = "tg-page-1"
	reviewAssignment.TargetRecordID = fixture.targetRecordID
	if _, updateReviewErr := fixture.repo.Update(context.Background(), reviewAssignment, reviewAssignment.Version); updateReviewErr != nil {
		t.Fatalf("update review assignment: %v", updateReviewErr)
	}

	otherDue := time.Date(2026, 3, 12, 14, 0, 0, 0, time.UTC)
	if _, createErr := fixture.repo.Create(context.Background(), TranslationAssignment{
		ID:             "asg-clean-1",
		FamilyID:       "tg-post-2",
		EntityType:     "posts",
		SourceRecordID: "post-2",
		TargetRecordID: "post-2-fr",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		ReviewerID:     "reviewer-1",
		LastReviewerID: "reviewer-1",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInReview,
		Priority:       PriorityNormal,
		DueDate:        &otherDue,
		TenantID:       "tenant-1",
		OrgID:          "org-1",
	}); createErr != nil {
		t.Fatalf("create clean review assignment: %v", createErr)
	}
	syncTranslationFamilyFixtureStore(t, fixture.admin, "production")

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments?reviewer_id=__me__&review_state=qa_blocked&family_id=tg-page-1&channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	req.Header.Set("X-User-ID", "reviewer-1")
	resp, err := fixture.app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta := extractMap(payload["meta"])
	supportedFilters := toStringSlice(meta["supported_filter_keys"])
	if !containsString(supportedFilters, "review_state") || !containsString(supportedFilters, "family_id") {
		t.Fatalf("expected supported_filter_keys to advertise review_state and family_id, got %+v", supportedFilters)
	}
	supportedReviewStates := toStringSlice(meta["supported_review_states"])
	if len(supportedReviewStates) != 1 || supportedReviewStates[0] != translationQueueReviewStateQABlocked {
		t.Fatalf("expected supported_review_states to include qa_blocked, got %+v", supportedReviewStates)
	}
	data := anySliceFromValue(payload["data"])
	if len(data) != 1 {
		t.Fatalf("expected one qa-blocked assignment in the selected translation group, got %d", len(data))
	}
	row := extractMap(data[0])
	if got := strings.TrimSpace(toString(row["id"])); got != fixture.assignmentID {
		t.Fatalf("expected blocked assignment %q, got %q", fixture.assignmentID, got)
	}
	if got := strings.TrimSpace(toString(row["family_id"])); got != "tg-page-1" {
		t.Fatalf("expected family_id tg-page-1, got %q", got)
	}
	qaSummary := extractMap(row["qa_summary"])
	if got := intValue(qaSummary["blocker_count"]); got <= 0 {
		t.Fatalf("expected qa_summary blocker_count > 0, got %+v", qaSummary)
	}
	if got := toInt(meta["total"]); got != 1 {
		t.Fatalf("expected filtered total=1, got %d", got)
	}
}

func TestTranslationQueueBindingRejectActionRequiresReason(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
	})

	assignment, err := fixture.repo.Get(context.Background(), fixture.assignmentID)
	if err != nil {
		t.Fatalf("load assignment: %v", err)
	}
	assignment.Status = AssignmentStatusInReview
	assignment.ReviewerID = "reviewer-1"
	assignment.LastReviewerID = "reviewer-1"
	if _, updateAssignmentErr := fixture.repo.Update(context.Background(), assignment, assignment.Version); updateAssignmentErr != nil {
		t.Fatalf("update assignment: %v", updateAssignmentErr)
	}

	req := httptest.NewRequestWithContext(context.Background(),
		http.MethodPost,
		"/admin/api/translations/assignments/"+fixture.assignmentID+"/actions/reject",
		strings.NewReader(`{"expected_version":3}`),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "reviewer-1")
	resp, err := fixture.app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode < 400 || resp.StatusCode >= 500 {
		t.Fatalf("status=%d want=4xx", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode error payload: %v", err)
	}
	errPayload := extractMap(payload["error"])
	if got := strings.TrimSpace(toString(errPayload["text_code"])); got != TextCodeValidationError {
		t.Fatalf("expected validation error text_code, got %+v", errPayload)
	}
	if got := strings.TrimSpace(toString(extractMap(errPayload["metadata"])["field"])); got != "reason" {
		t.Fatalf("expected missing reason field metadata, got %+v", errPayload)
	}
}

func TestSortAssignmentsOrdersPriorityBySeverity(t *testing.T) {
	assignments := []TranslationAssignment{
		{ID: "asg-high", Priority: PriorityHigh},
		{ID: "asg-low", Priority: PriorityLow},
		{ID: "asg-urgent", Priority: PriorityUrgent},
		{ID: "asg-normal", Priority: PriorityNormal},
	}

	sortAssignments(assignments, "priority", false, time.Date(2026, 3, 12, 10, 0, 0, 0, time.UTC))

	got := []string{assignments[0].ID, assignments[1].ID, assignments[2].ID, assignments[3].ID}
	want := []string{"asg-low", "asg-normal", "asg-high", "asg-urgent"}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected priority order %v, got %v", want, got)
		}
	}
}

func TestSortAssignmentsOrdersDueStateByUrgency(t *testing.T) {
	now := time.Date(2026, 3, 12, 10, 0, 0, 0, time.UTC)
	onTrack := now.Add(72 * time.Hour)
	dueSoon := now.Add(12 * time.Hour)
	overdue := now.Add(-2 * time.Hour)
	assignments := []TranslationAssignment{
		{ID: "asg-overdue", DueDate: &overdue},
		{ID: "asg-none"},
		{ID: "asg-due-soon", DueDate: &dueSoon},
		{ID: "asg-on-track", DueDate: &onTrack},
	}

	sortAssignments(assignments, "due_state", false, now)

	got := []string{assignments[0].ID, assignments[1].ID, assignments[2].ID, assignments[3].ID}
	want := []string{"asg-none", "asg-on-track", "asg-due-soon", "asg-overdue"}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected due_state order %v, got %v", want, got)
		}
	}
}

func TestTranslationQueueBindingAssignmentActionClaimSupportsIdempotentReplay(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:   true,
			PermAdminTranslationsClaim:  true,
			PermAdminTranslationsAssign: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	created, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-claim",
		EntityType:     "pages",
		SourceRecordID: "page-1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	body := []byte(`{"expected_version":1,"idempotency_key":"claim-1"}`)
	makeReq := func() *http.Request {
		req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignments/"+created.ID+"/actions/claim", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", "translator-1")
		return req
	}

	firstResp, err := app.Test(makeReq())
	if err != nil {
		t.Fatalf("first request error: %v", err)
	}
	defer firstResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if firstResp.StatusCode != http.StatusOK {
		t.Fatalf("first status=%d want=200", firstResp.StatusCode)
	}
	first := map[string]any{}
	if firstDecodeErr := json.NewDecoder(firstResp.Body).Decode(&first); firstDecodeErr != nil {
		t.Fatalf("decode first response: %v", firstDecodeErr)
	}
	firstMeta := extractMap(first["meta"])
	if hit := toBool(firstMeta["idempotency_hit"]); hit {
		t.Fatalf("expected first response not to be replay hit")
	}

	secondResp, err := app.Test(makeReq())
	if err != nil {
		t.Fatalf("second request error: %v", err)
	}
	defer secondResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if secondResp.StatusCode != http.StatusOK {
		t.Fatalf("second status=%d want=200", secondResp.StatusCode)
	}
	second := map[string]any{}
	if secondDecodeErr := json.NewDecoder(secondResp.Body).Decode(&second); secondDecodeErr != nil {
		t.Fatalf("decode second response: %v", secondDecodeErr)
	}
	secondMeta := extractMap(second["meta"])
	if hit := toBool(secondMeta["idempotency_hit"]); !hit {
		t.Fatalf("expected replay to set meta.idempotency_hit=true, got %+v", secondMeta)
	}
	data := extractMap(second["data"])
	if got := strings.TrimSpace(toString(data["status"])); got != string(AssignmentStatusInProgress) {
		t.Fatalf("expected in_progress status, got %q", got)
	}
	stored, err := repo.Get(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("get stored assignment: %v", err)
	}
	if stored.Status != AssignmentStatusInProgress {
		t.Fatalf("expected stored assignment to be in_progress, got %q", stored.Status)
	}
}

func TestTranslationQueueBindingAssignmentActionRequiresPermission(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	created, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-claim",
		EntityType:     "pages",
		SourceRecordID: "page-1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	app := newTranslationQueueTestApp(t, newTranslationQueueBinding(adm))

	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignments/"+created.ID+"/actions/claim", strings.NewReader(`{"expected_version":1}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("status=%d want=403", resp.StatusCode)
	}
}

func TestTranslationQueueBindingBulkActionAssignReturnsUpdatedRowsAndPartialFailures(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:   true,
			PermAdminTranslationsAssign: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	first, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-bulk-1",
		EntityType:     "pages",
		SourceRecordID: "page-1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create first assignment: %v", err)
	}
	second, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-bulk-2",
		EntityType:     "pages",
		SourceRecordID: "page-2",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create second assignment: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	app := newTranslationQueueTestApp(t, newTranslationQueueBinding(adm))
	payload := map[string]any{
		"action":      "assign",
		"assignee_id": "translator-1",
		"assignments": []map[string]any{
			{"assignment_id": first.ID, "expected_version": first.Version},
			{"assignment_id": second.ID, "expected_version": second.Version + 100},
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/bulk", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "manager-1")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	response := map[string]any{}
	if decodeErr := json.NewDecoder(resp.Body).Decode(&response); decodeErr != nil {
		t.Fatalf("decode response: %v", decodeErr)
	}
	meta := extractMap(response["meta"])
	if intValue(meta["requested"]) != 2 || intValue(meta["succeeded"]) != 1 || intValue(meta["failed"]) != 1 {
		t.Fatalf("unexpected bulk metadata: %+v", meta)
	}
	if partial := toBool(meta["partial"]); !partial {
		t.Fatalf("expected partial=true, got %+v", meta)
	}
	data := extractMap(response["data"])
	assignments := anySliceFromValue(data["assignments"])
	if len(assignments) != 1 {
		t.Fatalf("expected one updated assignment row, got %d", len(assignments))
	}
	errorsOut := anySliceFromValue(data["errors"])
	if len(errorsOut) != 1 {
		t.Fatalf("expected one item error, got %d", len(errorsOut))
	}
	itemErr := extractMap(errorsOut[0])
	errBody := extractMap(itemErr["error"])
	if got := strings.TrimSpace(toString(errBody["code"])); got != TextCodeTranslationQueueVersionConflict {
		t.Fatalf("expected version conflict code, got %q in %+v", got, errBody)
	}
	stored, err := repo.Get(context.Background(), first.ID)
	if err != nil {
		t.Fatalf("get stored assignment: %v", err)
	}
	if stored.Status != AssignmentStatusAssigned || stored.AssigneeID != "translator-1" {
		t.Fatalf("expected first assignment assigned to translator-1, got %+v", stored)
	}
}

func TestTranslationQueueBindingBulkActionSupportsReleasePriorityAndArchive(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:   true,
			PermAdminTranslationsAssign: true,
			PermAdminTranslationsManage: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	releaseCandidate, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-bulk-release",
		EntityType:     "pages",
		SourceRecordID: "page-release",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		AssigneeID:     "translator-1",
	})
	if err != nil {
		t.Fatalf("create release candidate: %v", err)
	}
	priorityCandidate, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-bulk-priority",
		EntityType:     "pages",
		SourceRecordID: "page-priority",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityLow,
	})
	if err != nil {
		t.Fatalf("create priority candidate: %v", err)
	}
	archiveCandidate, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-bulk-archive",
		EntityType:     "pages",
		SourceRecordID: "page-archive",
		SourceLocale:   "en",
		TargetLocale:   "de",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusApproved,
	})
	if err != nil {
		t.Fatalf("create archive candidate: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	app := newTranslationQueueTestApp(t, newTranslationQueueBinding(adm))
	doBulk := func(action string, assignment TranslationAssignment, extra map[string]any) map[string]any {
		t.Helper()
		payload := map[string]any{
			"action": action,
			"assignments": []map[string]any{
				{"assignment_id": assignment.ID, "expected_version": assignment.Version},
			},
		}
		maps.Copy(payload, extra)
		body, marshalErr := json.Marshal(payload)
		if marshalErr != nil {
			t.Fatalf("marshal %s request: %v", action, marshalErr)
		}
		req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/bulk", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", "manager-1")
		resp, requestErr := app.Test(req)
		if requestErr != nil {
			t.Fatalf("%s request error: %v", action, requestErr)
		}
		defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("%s status=%d want=200", action, resp.StatusCode)
		}
		response := map[string]any{}
		if decodeErr := json.NewDecoder(resp.Body).Decode(&response); decodeErr != nil {
			t.Fatalf("decode %s response: %v", action, decodeErr)
		}
		meta := extractMap(response["meta"])
		if intValue(meta["succeeded"]) != 1 || intValue(meta["failed"]) != 0 {
			t.Fatalf("unexpected %s metadata: %+v", action, meta)
		}
		return response
	}

	doBulk("release", releaseCandidate, nil)
	released, err := repo.Get(context.Background(), releaseCandidate.ID)
	if err != nil {
		t.Fatalf("get released assignment: %v", err)
	}
	if released.Status != AssignmentStatusOpen || released.AssignmentType != AssignmentTypeOpenPool {
		t.Fatalf("expected released assignment to return to open pool, got %+v", released)
	}

	doBulk("priority", priorityCandidate, map[string]any{"priority": string(PriorityHigh)})
	prioritized, err := repo.Get(context.Background(), priorityCandidate.ID)
	if err != nil {
		t.Fatalf("get prioritized assignment: %v", err)
	}
	if prioritized.Priority != PriorityHigh {
		t.Fatalf("expected high priority, got %q", prioritized.Priority)
	}

	doBulk("archive", archiveCandidate, nil)
	archived, err := repo.Get(context.Background(), archiveCandidate.ID)
	if err != nil {
		t.Fatalf("get archived assignment: %v", err)
	}
	if archived.Status != AssignmentStatusArchived || archived.ArchivedAt == nil {
		t.Fatalf("expected archived assignment, got %+v", archived)
	}
}

func TestTranslationQueueBindingBulkActionReportsPerItemPermissionDenial(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	created, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-bulk-permission",
		EntityType:     "pages",
		SourceRecordID: "page-1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		AssigneeID:     "translator-1",
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	app := newTranslationQueueTestApp(t, newTranslationQueueBinding(adm))
	body := []byte(`{"action":"release","assignments":[{"assignment_id":"` + created.ID + `","expected_version":1}]}`)
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/bulk", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "manager-1")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	response := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta := extractMap(response["meta"])
	if intValue(meta["succeeded"]) != 0 || intValue(meta["failed"]) != 1 {
		t.Fatalf("unexpected permission-denial metadata: %+v", meta)
	}
}

func TestTranslationQueueBindingBulkActionRejectsUnsupportedAction(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	app := newTranslationQueueTestApp(t, newTranslationQueueBinding(adm))
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/bulk", strings.NewReader(`{"action":"approve","assignments":[{"assignment_id":"asg-1","expected_version":1}]}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "manager-1")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d want=400", resp.StatusCode)
	}
}

func TestTranslationQueueBindingFilterSnapshotBulkActionUsesSnapshotVersions(t *testing.T) {
	now := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:   true,
			PermAdminTranslationsAssign: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	first, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-snapshot-1",
		EntityType:     "pages",
		SourceRecordID: "page-snapshot-1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityHigh,
	})
	if err != nil {
		t.Fatalf("create first assignment: %v", err)
	}
	second, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-snapshot-2",
		EntityType:     "pages",
		SourceRecordID: "page-snapshot-2",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityHigh,
	})
	if err != nil {
		t.Fatalf("create second assignment: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	snapshotReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/snapshot", strings.NewReader(`{"filters":{"priority":"high","sort":"updated_at","order":"asc"}}`))
	snapshotReq.Header.Set("Content-Type", "application/json")
	snapshotReq.Header.Set("X-User-ID", "manager-1")
	snapshotResp, err := app.Test(snapshotReq)
	if err != nil {
		t.Fatalf("snapshot request error: %v", err)
	}
	defer snapshotResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if snapshotResp.StatusCode != http.StatusOK {
		t.Fatalf("snapshot status=%d want=200", snapshotResp.StatusCode)
	}
	snapshotPayload := map[string]any{}
	if err := json.NewDecoder(snapshotResp.Body).Decode(&snapshotPayload); err != nil {
		t.Fatalf("decode snapshot response: %v", err)
	}
	snapshotData := extractMap(snapshotPayload["data"])
	snapshotID := strings.TrimSpace(toString(snapshotData["snapshot_id"]))
	if snapshotID == "" {
		t.Fatalf("expected snapshot_id in %+v", snapshotData)
	}
	if got := intValue(snapshotData["requested"]); got != 2 {
		t.Fatalf("expected requested=2, got %+v", snapshotData)
	}

	second.Status = AssignmentStatusAssigned
	second.AssignmentType = AssignmentTypeDirect
	second.AssigneeID = "translator-existing"
	if _, err := repo.Update(context.Background(), second, second.Version); err != nil {
		t.Fatalf("stale second assignment: %v", err)
	}

	bulkPayload := map[string]any{
		"action":          "assign",
		"selection_scope": "filter_snapshot",
		"snapshot_id":     snapshotID,
		"assignee_id":     "translator-1",
	}
	body, err := json.Marshal(bulkPayload)
	if err != nil {
		t.Fatalf("marshal bulk request: %v", err)
	}
	bulkReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/bulk", bytes.NewReader(body))
	bulkReq.Header.Set("Content-Type", "application/json")
	bulkReq.Header.Set("X-User-ID", "manager-1")
	bulkResp, err := app.Test(bulkReq)
	if err != nil {
		t.Fatalf("bulk request error: %v", err)
	}
	defer bulkResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if bulkResp.StatusCode != http.StatusOK {
		t.Fatalf("bulk status=%d want=200", bulkResp.StatusCode)
	}
	response := map[string]any{}
	if err := json.NewDecoder(bulkResp.Body).Decode(&response); err != nil {
		t.Fatalf("decode bulk response: %v", err)
	}
	meta := extractMap(response["meta"])
	if got := strings.TrimSpace(toString(meta["selection_scope"])); got != "filter_snapshot" {
		t.Fatalf("expected filter_snapshot scope, got %+v", meta)
	}
	if intValue(meta["requested"]) != 2 || intValue(meta["succeeded"]) != 1 || intValue(meta["failed"]) != 1 || !toBool(meta["partial"]) {
		t.Fatalf("unexpected snapshot bulk metadata: %+v", meta)
	}
	data := extractMap(response["data"])
	errorsOut := anySliceFromValue(data["errors"])
	if len(errorsOut) != 1 {
		t.Fatalf("expected one stale item error, got %d", len(errorsOut))
	}
	itemErr := extractMap(errorsOut[0])
	if got := strings.TrimSpace(toString(itemErr["assignment_id"])); got != second.ID {
		t.Fatalf("expected stale second assignment error, got %+v", itemErr)
	}
	stored, err := repo.Get(context.Background(), first.ID)
	if err != nil {
		t.Fatalf("get first assignment: %v", err)
	}
	if stored.Status != AssignmentStatusAssigned || stored.AssigneeID != "translator-1" {
		t.Fatalf("expected first assignment assigned by snapshot bulk, got %+v", stored)
	}
}

func TestTranslationQueueBindingFilterSnapshotBulkActionSupportsIdempotentReplay(t *testing.T) {
	now := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:   true,
			PermAdminTranslationsAssign: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	created, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-snapshot-idempotent",
		EntityType:     "pages",
		SourceRecordID: "page-snapshot-idempotent",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityHigh,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	snapshotReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/snapshot", strings.NewReader(`{"filters":{"priority":"high"}}`))
	snapshotReq.Header.Set("Content-Type", "application/json")
	snapshotReq.Header.Set("X-User-ID", "manager-1")
	snapshotResp, err := app.Test(snapshotReq)
	if err != nil {
		t.Fatalf("snapshot request error: %v", err)
	}
	defer snapshotResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if snapshotResp.StatusCode != http.StatusOK {
		t.Fatalf("snapshot status=%d want=200", snapshotResp.StatusCode)
	}
	snapshotPayload := map[string]any{}
	if err := json.NewDecoder(snapshotResp.Body).Decode(&snapshotPayload); err != nil {
		t.Fatalf("decode snapshot response: %v", err)
	}
	snapshotID := strings.TrimSpace(toString(extractMap(snapshotPayload["data"])["snapshot_id"]))
	if snapshotID == "" {
		t.Fatalf("expected snapshot id in %+v", snapshotPayload)
	}

	payload := map[string]any{
		"action":          "assign",
		"selection_scope": "filter_snapshot",
		"snapshot_id":     snapshotID,
		"assignee_id":     "translator-1",
		"idempotency_key": "bulk-snapshot-assign-1",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal bulk payload: %v", err)
	}
	makeReq := func(body []byte) *http.Request {
		req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/bulk", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", "manager-1")
		return req
	}

	firstResp, err := app.Test(makeReq(body))
	if err != nil {
		t.Fatalf("first bulk request error: %v", err)
	}
	defer firstResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if firstResp.StatusCode != http.StatusOK {
		t.Fatalf("first bulk status=%d want=200", firstResp.StatusCode)
	}
	firstPayload := map[string]any{}
	if err := json.NewDecoder(firstResp.Body).Decode(&firstPayload); err != nil {
		t.Fatalf("decode first bulk response: %v", err)
	}
	firstMeta := extractMap(firstPayload["meta"])
	if toBool(firstMeta["idempotency_hit"]) {
		t.Fatalf("first response should not be an idempotency hit: %+v", firstMeta)
	}

	secondResp, err := app.Test(makeReq(body))
	if err != nil {
		t.Fatalf("second bulk request error: %v", err)
	}
	defer secondResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if secondResp.StatusCode != http.StatusOK {
		t.Fatalf("second bulk status=%d want=200", secondResp.StatusCode)
	}
	secondPayload := map[string]any{}
	if err := json.NewDecoder(secondResp.Body).Decode(&secondPayload); err != nil {
		t.Fatalf("decode second bulk response: %v", err)
	}
	secondMeta := extractMap(secondPayload["meta"])
	if !toBool(secondMeta["idempotency_hit"]) {
		t.Fatalf("expected second response to be an idempotency hit: %+v", secondMeta)
	}
	stored, err := repo.Get(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("get stored assignment: %v", err)
	}
	if stored.Version != created.Version+1 || stored.AssigneeID != "translator-1" {
		t.Fatalf("expected one mutation from idempotent replay, got %+v", stored)
	}

	payload["assignee_id"] = "translator-2"
	differentBody, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal conflicting bulk payload: %v", err)
	}
	conflictResp, err := app.Test(makeReq(differentBody))
	if err != nil {
		t.Fatalf("conflicting bulk request error: %v", err)
	}
	defer conflictResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if conflictResp.StatusCode != http.StatusConflict {
		t.Fatalf("conflicting bulk status=%d want=409", conflictResp.StatusCode)
	}
}

func TestTranslationQueueBindingFilterSnapshotBulkActionRejectsMovedOutOfScopeAssignment(t *testing.T) {
	now := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:   true,
			PermAdminTranslationsManage: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	created, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-snapshot-scope",
		EntityType:     "pages",
		SourceRecordID: "page-snapshot-scope",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityLow,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	snapshotReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/snapshot", strings.NewReader(`{"filters":{"status":"open"}}`))
	snapshotReq.Header.Set("Content-Type", "application/json")
	snapshotReq.Header.Set("X-User-ID", "manager-1")
	snapshotResp, err := app.Test(snapshotReq)
	if err != nil {
		t.Fatalf("snapshot request error: %v", err)
	}
	defer snapshotResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if snapshotResp.StatusCode != http.StatusOK {
		t.Fatalf("snapshot status=%d want=200", snapshotResp.StatusCode)
	}
	snapshotPayload := map[string]any{}
	if err := json.NewDecoder(snapshotResp.Body).Decode(&snapshotPayload); err != nil {
		t.Fatalf("decode snapshot response: %v", err)
	}
	snapshotID := strings.TrimSpace(toString(extractMap(snapshotPayload["data"])["snapshot_id"]))
	if snapshotID == "" {
		t.Fatalf("expected snapshot id in %+v", snapshotPayload)
	}

	created.Status = AssignmentStatusAssigned
	created.AssignmentType = AssignmentTypeDirect
	created.AssigneeID = "translator-existing"
	if _, err := repo.Update(context.Background(), created, created.Version); err != nil {
		t.Fatalf("move assignment out of snapshot scope: %v", err)
	}

	bulkBody := []byte(`{"action":"priority","selection_scope":"filter_snapshot","snapshot_id":"` + snapshotID + `","priority":"urgent"}`)
	bulkReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/bulk", bytes.NewReader(bulkBody))
	bulkReq.Header.Set("Content-Type", "application/json")
	bulkReq.Header.Set("X-User-ID", "manager-1")
	bulkResp, err := app.Test(bulkReq)
	if err != nil {
		t.Fatalf("bulk request error: %v", err)
	}
	defer bulkResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if bulkResp.StatusCode != http.StatusOK {
		t.Fatalf("bulk status=%d want=200", bulkResp.StatusCode)
	}
	response := map[string]any{}
	if err := json.NewDecoder(bulkResp.Body).Decode(&response); err != nil {
		t.Fatalf("decode bulk response: %v", err)
	}
	meta := extractMap(response["meta"])
	if intValue(meta["succeeded"]) != 0 || intValue(meta["failed"]) != 1 {
		t.Fatalf("unexpected moved-out-of-scope metadata: %+v", meta)
	}
	errorsOut := anySliceFromValue(extractMap(response["data"])["errors"])
	if len(errorsOut) != 1 {
		t.Fatalf("expected one moved-out-of-scope error, got %d", len(errorsOut))
	}
	errBody := extractMap(extractMap(errorsOut[0])["error"])
	if got := strings.TrimSpace(toString(extractMap(errBody["metadata"])["reason_code"])); got != "snapshot_scope_changed" {
		t.Fatalf("expected snapshot_scope_changed error, got %+v", errBody)
	}
}

func TestTranslationQueueBindingFilterSnapshotRejectsUnsupportedReviewStateFilter(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	app := newTranslationQueueTestApp(t, newTranslationQueueBinding(adm))

	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/snapshot", strings.NewReader(`{"filters":{"review_state":"qa_blocked"}}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("snapshot request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("snapshot status=%d want=400", resp.StatusCode)
	}
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode snapshot error: %v", err)
	}
	metadata := extractMap(extractMap(payload["error"])["metadata"])
	if got := strings.TrimSpace(toString(metadata["reason_code"])); got != "snapshot_review_state_unsupported" {
		t.Fatalf("expected unsupported review-state reason code, got %+v", metadata)
	}
}

func TestTranslationQueueBindingFilterSnapshotRejectsCrossScopeExecution(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	now := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	binding := newTranslationQueueBinding(adm)
	binding.storeAssignmentBulkSnapshot(translationQueueFilterSnapshot{
		ID:        "snap_scope_test",
		ActorID:   "manager-1",
		TenantID:  "tenant-a",
		OrgID:     "org-a",
		Channel:   "admin",
		CreatedAt: now,
		ExpiresAt: now.Add(translationQueueBulkSnapshotTTL),
		Selections: []translationQueueBulkActionSelection{
			{AssignmentID: "asg-1", ExpectedVersion: 1},
		},
	})

	_, err := binding.lookupAssignmentBulkSnapshot(translationTransportIdentity{
		ActorID:  "manager-2",
		TenantID: "tenant-a",
		OrgID:    "org-a",
	}, "admin", map[string]any{"snapshot_id": "snap_scope_test"}, now)
	if err == nil {
		t.Fatalf("expected cross-actor snapshot lookup to fail")
	}
	_, err = binding.lookupAssignmentBulkSnapshot(translationTransportIdentity{
		ActorID:  "manager-1",
		TenantID: "tenant-b",
		OrgID:    "org-a",
	}, "admin", map[string]any{"snapshot_id": "snap_scope_test"}, now)
	if err == nil {
		t.Fatalf("expected cross-tenant snapshot lookup to fail")
	}
}

func TestTranslationQueueBindingFilterSnapshotBulkActionIdempotencyReplay(t *testing.T) {
	now := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:   true,
			PermAdminTranslationsAssign: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	created, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-snapshot-idempotent",
		EntityType:     "pages",
		SourceRecordID: "page-snapshot-idempotent",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
		Priority:       PriorityHigh,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	snapshotReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/snapshot", strings.NewReader(`{"filters":{"priority":"high"}}`))
	snapshotReq.Header.Set("Content-Type", "application/json")
	snapshotReq.Header.Set("X-User-ID", "manager-1")
	snapshotResp, err := app.Test(snapshotReq)
	if err != nil {
		t.Fatalf("snapshot request error: %v", err)
	}
	defer snapshotResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if snapshotResp.StatusCode != http.StatusOK {
		t.Fatalf("snapshot status=%d want=200", snapshotResp.StatusCode)
	}
	snapshotPayload := map[string]any{}
	if err := json.NewDecoder(snapshotResp.Body).Decode(&snapshotPayload); err != nil {
		t.Fatalf("decode snapshot response: %v", err)
	}
	snapshotID := strings.TrimSpace(toString(extractMap(snapshotPayload["data"])["snapshot_id"]))
	if snapshotID == "" {
		t.Fatalf("expected snapshot id in %+v", snapshotPayload)
	}

	bulkPayload := map[string]any{
		"action":          "assign",
		"selection_scope": "filter_snapshot",
		"snapshot_id":     snapshotID,
		"assignee_id":     "translator-1",
		"idempotency_key": "bulk-snapshot-assign-1",
	}
	doBulk := func(payload map[string]any) (int, map[string]any) {
		t.Helper()
		body, marshalErr := json.Marshal(payload)
		if marshalErr != nil {
			t.Fatalf("marshal bulk payload: %v", marshalErr)
		}
		req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/bulk", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", "manager-1")
		resp, requestErr := app.Test(req)
		if requestErr != nil {
			t.Fatalf("bulk request error: %v", requestErr)
		}
		defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
		response := map[string]any{}
		if decodeErr := json.NewDecoder(resp.Body).Decode(&response); decodeErr != nil {
			t.Fatalf("decode bulk response: %v", decodeErr)
		}
		return resp.StatusCode, response
	}

	status, first := doBulk(bulkPayload)
	if status != http.StatusOK {
		t.Fatalf("first bulk status=%d want=200 payload=%+v", status, first)
	}
	firstMeta := extractMap(first["meta"])
	if intValue(firstMeta["succeeded"]) != 1 || toBool(firstMeta["idempotency_hit"]) {
		t.Fatalf("unexpected first idempotent bulk meta: %+v", firstMeta)
	}
	stored, err := repo.Get(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("get assigned row: %v", err)
	}
	if stored.AssigneeID != "translator-1" {
		t.Fatalf("expected assignment to translator-1, got %+v", stored)
	}

	status, second := doBulk(bulkPayload)
	if status != http.StatusOK {
		t.Fatalf("second bulk status=%d want=200 payload=%+v", status, second)
	}
	secondMeta := extractMap(second["meta"])
	if !toBool(secondMeta["idempotency_hit"]) || intValue(secondMeta["succeeded"]) != 1 {
		t.Fatalf("expected replayed successful response, got meta %+v", secondMeta)
	}

	conflictPayload := map[string]any{}
	maps.Copy(conflictPayload, bulkPayload)
	conflictPayload["assignee_id"] = "translator-2"
	status, conflict := doBulk(conflictPayload)
	if status != http.StatusConflict {
		t.Fatalf("conflict status=%d want=409 payload=%+v", status, conflict)
	}
}

func TestTranslationQueueBindingFilterSnapshotRejectsUnsupportedReviewStateFallback(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	if _, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-snapshot-review",
		EntityType:     "pages",
		SourceRecordID: "page-snapshot-review",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInReview,
		ReviewerID:     "reviewer-1",
	}); err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	app := newTranslationQueueTestApp(t, newTranslationQueueBinding(adm))
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignment-actions/snapshot", strings.NewReader(`{"filters":{"review_state":"qa_blocked"}}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "reviewer-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("snapshot request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d want=400", resp.StatusCode)
	}
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	errPayload := extractMap(payload["error"])
	if !strings.Contains(toString(errPayload["message"]), "review state") {
		t.Fatalf("expected review-state snapshot error, got %+v", payload)
	}
}

func TestTranslationQueueBindingAssignmentActionEnforcesScopeIsolation(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		BasePath:        "/admin",
		DefaultLocale:   "en",
		ScopeMode:       "single",
		DefaultTenantID: "tenant-b",
		DefaultOrgID:    "org-b",
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:  true,
			PermAdminTranslationsClaim: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	created, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-scope",
		EntityType:     "pages",
		TenantID:       "tenant-a",
		OrgID:          "org-a",
		SourceRecordID: "page-1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeOpenPool,
		Status:         AssignmentStatusOpen,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	app := newTranslationQueueTestApp(t, newTranslationQueueBinding(adm))

	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignments/"+created.ID+"/actions/claim?tenant_id=tenant-b&org_id=org-b", strings.NewReader(`{"expected_version":1}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("status=%d want=403", resp.StatusCode)
	}
}

func TestTranslationQueueBindingMyWorkEchoesTraceHeaders(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/my-work", nil)
	req.Header.Set("X-User-ID", "translator-1")
	req.Header.Set("X-Request-ID", "req-queue-1")
	req.Header.Set("X-Correlation-ID", "corr-queue-1")
	req.Header.Set("X-Trace-ID", "trace-queue-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort

	if got := strings.TrimSpace(resp.Header.Get("X-Request-ID")); got != "req-queue-1" {
		t.Fatalf("expected X-Request-ID req-queue-1, got %q", got)
	}
	if got := strings.TrimSpace(resp.Header.Get("X-Correlation-ID")); got != "corr-queue-1" {
		t.Fatalf("expected X-Correlation-ID corr-queue-1, got %q", got)
	}
	if got := strings.TrimSpace(resp.Header.Get("X-Trace-ID")); got != "trace-queue-1" {
		t.Fatalf("expected X-Trace-ID trace-queue-1, got %q", got)
	}
}

func TestTranslationQueueBindingMyWorkSummaryIncludesAllFilteredAssignmentsAcrossPages(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	overdue := now.Add(-2 * time.Hour)
	dueSoon := now.Add(6 * time.Hour)
	onTrack := now.Add(96 * time.Hour)
	for _, assignment := range []TranslationAssignment{
		{
			FamilyID:       "tg-overdue",
			EntityType:     "pages",
			SourceRecordID: "page-1",
			SourceLocale:   "en",
			TargetLocale:   "es",
			AssigneeID:     "translator-1",
			AssignmentType: AssignmentTypeDirect,
			Status:         AssignmentStatusInReview,
			DueDate:        &overdue,
		},
		{
			FamilyID:       "tg-due-soon",
			EntityType:     "posts",
			SourceRecordID: "post-1",
			SourceLocale:   "en",
			TargetLocale:   "fr",
			AssigneeID:     "translator-1",
			AssignmentType: AssignmentTypeDirect,
			Status:         AssignmentStatusInProgress,
			DueDate:        &dueSoon,
		},
		{
			FamilyID:       "tg-on-track",
			EntityType:     "news",
			SourceRecordID: "news-1",
			SourceLocale:   "en",
			TargetLocale:   "de",
			AssigneeID:     "translator-1",
			AssignmentType: AssignmentTypeDirect,
			Status:         AssignmentStatusAssigned,
			DueDate:        &onTrack,
		},
	} {
		if _, err := repo.Create(context.Background(), assignment); err != nil {
			t.Fatalf("create assignment: %v", err)
		}
	}
	if _, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "tg-other",
		EntityType:     "pages",
		SourceRecordID: "page-2",
		SourceLocale:   "en",
		TargetLocale:   "pt",
		AssigneeID:     "translator-2",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
	}); err != nil {
		t.Fatalf("create other assignment: %v", err)
	}
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/my-work?per_page=1&page=1", nil)
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	assignments := anySliceFromValue(payload["assignments"])
	if len(assignments) != 1 {
		t.Fatalf("expected paginated assignments length=1, got %d", len(assignments))
	}
	summary := extractMap(payload["summary"])
	if toInt(summary["total"]) != 3 {
		t.Fatalf("expected summary.total=3, got %+v", summary)
	}
	if toInt(summary["overdue"]) != 1 || toInt(summary["due_soon"]) != 1 || toInt(summary["on_track"]) != 1 {
		t.Fatalf("unexpected due summary counts: %+v", summary)
	}
	if toInt(summary["review"]) != 1 {
		t.Fatalf("expected summary.review=1, got %+v", summary)
	}
}

func TestTranslationQueueBindingQueueSummaryIncludesAllFilteredAssignmentsAcrossPages(t *testing.T) {
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView: true,
		},
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	for _, assignment := range []TranslationAssignment{
		{
			FamilyID:       "tg-review",
			EntityType:     "pages",
			SourceRecordID: "page-review",
			SourceLocale:   "en",
			TargetLocale:   "es",
			AssigneeID:     "translator-1",
			AssignmentType: AssignmentTypeDirect,
			Status:         AssignmentStatusInReview,
		},
		{
			FamilyID:       "tg-progress",
			EntityType:     "news",
			SourceRecordID: "news-progress",
			SourceLocale:   "en",
			TargetLocale:   "fr",
			AssigneeID:     "translator-2",
			AssignmentType: AssignmentTypeDirect,
			Status:         AssignmentStatusInProgress,
		},
		{
			FamilyID:       "tg-assigned",
			EntityType:     "posts",
			SourceRecordID: "post-assigned",
			SourceLocale:   "en",
			TargetLocale:   "de",
			AssigneeID:     "translator-3",
			AssignmentType: AssignmentTypeDirect,
			Status:         AssignmentStatusAssigned,
		},
	} {
		if _, err := repo.Create(context.Background(), assignment); err != nil {
			t.Fatalf("create assignment: %v", err)
		}
	}
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/queue?per_page=1&page=1", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	items := anySliceFromValue(payload["items"])
	if len(items) != 1 {
		t.Fatalf("expected paginated items length=1, got %d", len(items))
	}
	summary := extractMap(payload["summary"])
	if toInt(summary["total"]) != 3 {
		t.Fatalf("expected summary.total=3, got %+v", summary)
	}
	byQueueState := extractMap(summary["by_queue_state"])
	if toInt(byQueueState[string(AssignmentStatusInReview)]) != 1 ||
		toInt(byQueueState[string(AssignmentStatusInProgress)]) != 1 ||
		toInt(byQueueState[string(AssignmentStatusAssigned)]) != 1 {
		t.Fatalf("unexpected by_queue_state summary: %+v", byQueueState)
	}
}

func TestTranslationQueueSourceRecordOptionIncludesSourceLocale(t *testing.T) {
	option := translationQueueSourceRecordOption(map[string]any{
		"id":            "page_1",
		"title":         "Homepage",
		"source_locale": "EN",
	}, "pages")
	if option == nil {
		t.Fatalf("expected option")
	}
	if got := strings.TrimSpace(toString(option["source_locale"])); got != "en" {
		t.Fatalf("expected source_locale en, got %q", got)
	}
}

func TestTranslationQueueAssigneeOptionBuildsLabelAndDescription(t *testing.T) {
	option := translationQueueAssigneeOption(map[string]any{
		"id":           "user_1",
		"display_name": "Jane Doe",
		"email":        "jane@example.com",
		"role":         "translator",
		"status":       "active",
		"avatar_url":   "https://cdn.example.com/jane.png",
	})
	if option == nil {
		t.Fatalf("expected option")
	}
	if got := strings.TrimSpace(toString(option["value"])); got != "user_1" {
		t.Fatalf("expected value user_1, got %q", got)
	}
	if got := strings.TrimSpace(toString(option["label"])); got != "Jane Doe" {
		t.Fatalf("expected label Jane Doe, got %q", got)
	}
	if got := strings.TrimSpace(toString(option["display_name"])); got != "Jane Doe" {
		t.Fatalf("expected display_name Jane Doe, got %q", got)
	}
	if got := strings.TrimSpace(toString(option["avatar_url"])); got != "https://cdn.example.com/jane.png" {
		t.Fatalf("expected avatar_url in option, got %q", got)
	}
	desc := strings.TrimSpace(toString(option["description"]))
	if !strings.Contains(desc, "jane@example.com") || !strings.Contains(desc, "translator") {
		t.Fatalf("expected description to include email and role, got %q", desc)
	}
}

func newTranslationQueueTestApp(t *testing.T, binding *translationQueueBinding) *fiber.App {
	t.Helper()
	if binding != nil && binding.admin != nil && binding.admin.Authorizer() == nil {
		binding.admin.WithAuthorizer(allowAll{})
	}
	adapter := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{
			UnescapePath:      true,
			EnablePrintRoutes: true,
			StrictRouting:     false,
			PassLocalsToViews: true,
		})
	})
	r := adapter.Router()
	r.Get("/admin/api/translations/dashboard", func(c router.Context) error {
		payload, err := binding.Dashboard(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Get("/admin/api/translations/assignments", func(c router.Context) error {
		payload, err := binding.Assignments(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Get("/admin/api/translations/options/assignees", func(c router.Context) error {
		payload, err := binding.AssigneesOptions(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Get("/admin/api/translations/options/entity-types", func(c router.Context) error {
		payload, err := binding.EntityTypesOptions(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Get("/admin/api/translations/options/locales", func(c router.Context) error {
		payload, err := binding.LocalesOptions(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Get("/admin/api/translations/options/families", func(c router.Context) error {
		payload, err := binding.TranslationGroupsOptions(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Get("/admin/api/translations/families/:family_id/assignments", func(c router.Context) error {
		payload, err := binding.FamilyAssignments(c, c.Param("family_id"))
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Get("/admin/api/translations/assignments/:assignment_id", func(c router.Context) error {
		payload, err := binding.AssignmentDetail(c, c.Param("assignment_id"))
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Get("/admin/api/translations/assignments/:assignment_id/preview", func(c router.Context) error {
		payload, err := binding.AssignmentPreview(c, c.Param("assignment_id"))
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Post("/admin/api/translations/assignments/:assignment_id/actions/:action", func(c router.Context) error {
		body, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		payload, err := binding.RunAssignmentAction(c, c.Param("assignment_id"), c.Param("action"), body)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Post("/admin/api/translations/assignment-actions/bulk", func(c router.Context) error {
		body, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		payload, err := binding.RunAssignmentBulkAction(c, body)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Post("/admin/api/translations/assignment-actions/snapshot", func(c router.Context) error {
		body, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		payload, err := binding.CreateAssignmentBulkSnapshot(c, body)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Get("/admin/api/translations/sync/resources/:kind/:id", func(c router.Context) error {
		withTranslationQueueTestAuthenticatedActor(c)
		if err := binding.ReadDraftSync(c); err != nil {
			return writeError(c, err)
		}
		return nil
	})
	r.Patch("/admin/api/translations/sync/resources/:kind/:id", func(c router.Context) error {
		withTranslationQueueTestAuthenticatedActor(c)
		if err := binding.MutateDraftSync(c); err != nil {
			return writeError(c, err)
		}
		return nil
	})
	r.Get("/admin/api/translations/my-work", func(c router.Context) error {
		payload, err := binding.MyWork(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Get("/admin/api/translations/queue", func(c router.Context) error {
		payload, err := binding.Queue(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	adapter.Init()
	return adapter.WrappedRouter()
}

func withTranslationQueueTestAuthenticatedActor(c router.Context) {
	if c == nil {
		return
	}
	actorID := strings.TrimSpace(c.Header("X-Test-Authenticated-Actor-ID"))
	if actorID == "" {
		return
	}
	c.SetContext(auth.WithActorContext(c.Context(), &auth.ActorContext{
		ActorID:        actorID,
		Subject:        actorID,
		TenantID:       strings.TrimSpace(c.Query(ScopeTenantIDKey)),
		OrganizationID: strings.TrimSpace(c.Query(ScopeOrgIDKey)),
	}))
}
