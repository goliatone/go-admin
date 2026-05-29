package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
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

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/my-work", nil)
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer mustClose(t, "response body", resp.Body)

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

	summary, _ := payload["summary"].(map[string]any)
	if int(summary["total"].(float64)) != 4 {
		t.Fatalf("expected total=4, got %+v", summary)
	}
	if int(summary["overdue"].(float64)) != 1 || int(summary["due_soon"].(float64)) != 1 || int(summary["on_track"].(float64)) != 1 || int(summary["none"].(float64)) != 1 {
		t.Fatalf("unexpected due-state summary: %+v", summary)
	}
	if int(summary["review"].(float64)) != 1 {
		t.Fatalf("expected review=1, got %+v", summary)
	}

	items, _ := payload["assignments"].([]any)
	if len(items) != 4 {
		t.Fatalf("expected 4 assignments, got %d", len(items))
	}
	for _, raw := range items {
		row, _ := raw.(map[string]any)
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

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/my-work", nil)
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("status=%d want=403", resp.StatusCode)
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

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/queue", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer mustClose(t, "response body", resp.Body)

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got := strings.TrimSpace(toString(payload["scope"])); got != "queue" {
		t.Fatalf("expected scope queue, got %q", got)
	}

	items, _ := payload["items"].([]any)
	if len(items) != 2 {
		t.Fatalf("expected 2 queue items, got %d", len(items))
	}
	for _, raw := range items {
		row, _ := raw.(map[string]any)
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
		approve, _ := actions["approve"].(map[string]any)
		submit, _ := actions["submit_review"].(map[string]any)
		if strings.EqualFold(strings.TrimSpace(toString(row["queue_state"])), string(AssignmentStatusInReview)) {
			if enabled, _ := approve["enabled"].(bool); !enabled {
				t.Fatalf("expected approve enabled in review state, got %+v", approve)
			}
		}
		if strings.EqualFold(strings.TrimSpace(toString(row["queue_state"])), string(AssignmentStatusInProgress)) {
			if enabled, _ := submit["enabled"].(bool); enabled {
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

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/assignments?locale=es&priority=high&reviewer_id=reviewer-1&due_state=overdue", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer mustClose(t, "response body", resp.Body)

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta, _ := payload["meta"].(map[string]any)
	if int(meta["total"].(float64)) != 1 {
		t.Fatalf("expected meta.total=1, got %+v", meta)
	}
	if got := strings.TrimSpace(toString(meta["default_review_filter_preset"])); got != "review_inbox" {
		t.Fatalf("expected default_review_filter_preset review_inbox, got %q", got)
	}
	if reviewPresets, _ := meta["saved_review_filter_presets"].([]any); len(reviewPresets) != 4 {
		t.Fatalf("expected four saved review presets, got %d", len(reviewPresets))
	}
	reviewCounts := extractMap(meta["review_aggregate_counts"])
	if got := intValue(reviewCounts["review_inbox"]); got != 0 {
		t.Fatalf("expected empty review_inbox count for non-reviewer result, got %+v", reviewCounts)
	}
	data, _ := payload["data"].([]any)
	if len(data) != 1 {
		t.Fatalf("expected one data row, got %d", len(data))
	}
	row, _ := data[0].(map[string]any)
	if got := strings.TrimSpace(toString(row["id"])); got != created.ID {
		t.Fatalf("expected id %q, got %q", created.ID, got)
	}
	if got := strings.TrimSpace(toString(row["due_state"])); got != translationQueueDueStateOverdue {
		t.Fatalf("expected overdue due_state, got %q", got)
	}
	actions, _ := row["actions"].(map[string]any)
	claim, _ := actions["claim"].(map[string]any)
	release, _ := actions["release"].(map[string]any)
	if enabled, _ := claim["enabled"].(bool); !enabled {
		t.Fatalf("expected claim enabled, got %+v", claim)
	}
	if enabled, _ := release["enabled"].(bool); enabled {
		t.Fatalf("expected release disabled for pending assignment, got %+v", release)
	}
	if got := strings.TrimSpace(toString(release["reason_code"])); got != ActionDisabledReasonCodeInvalidStatus {
		t.Fatalf("expected invalid status reason code, got %q", got)
	}
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

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/assignments?group_by=family_id&per_page=2&sort=created_at&order=asc", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer mustClose(t, "response body", resp.Body)

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
	data, _ := payload["data"].([]any)
	if len(data) != 1 {
		t.Fatalf("expected one group row on first page, got %+v", data)
	}
	group := extractMap(data[0])
	if toString(group["row_type"]) != "group" || toString(group["group_by"]) != "family_id" {
		t.Fatalf("expected group row, got %+v", group)
	}
	children, _ := group["children"].([]any)
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

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/assignments?group_by=content_type", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
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

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/assignments?tenant_id=tenant-1&org_id=org-1", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer mustClose(t, "response body", resp.Body)
	if repo.listCalls != 0 {
		t.Fatalf("optimized assignment endpoint called List %d times", repo.listCalls)
	}
	if repo.pageCalls != 1 {
		t.Fatalf("expected one optimized page call, got %d", repo.pageCalls)
	}
	if repo.reviewerCalls != 1 {
		t.Fatalf("expected one optimized reviewer summary call, got %d", repo.reviewerCalls)
	}
}

type optimizedAssignmentReadRepo struct {
	pageItems      []TranslationAssignment
	reviewerCounts map[string]int
	listCalls      int
	pageCalls      int
	reviewerCalls  int
}

func (r *optimizedAssignmentReadRepo) List(context.Context, ListOptions) ([]TranslationAssignment, int, error) {
	r.listCalls++
	return nil, 0, errors.New("List must not be called by optimized assignment page")
}

func (r *optimizedAssignmentReadRepo) ListAssignmentPage(context.Context, TranslationAssignmentPageQueryInput) (TranslationAssignmentPageQueryResult, error) {
	r.pageCalls++
	return TranslationAssignmentPageQueryResult{Items: append([]TranslationAssignment{}, r.pageItems...), Total: len(r.pageItems)}, nil
}

func (r *optimizedAssignmentReadRepo) AssignmentReviewerAggregateCounts(context.Context, TranslationAssignmentReviewerAggregateInput) (map[string]int, error) {
	r.reviewerCalls++
	out := map[string]int{}
	for key, value := range r.reviewerCounts {
		out[key] = value
	}
	return out, nil
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

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/assignments", nil)
	req.Header.Set("X-User-ID", "reviewer-2")
	resp, err := fixture.app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer mustClose(t, "response body", resp.Body)

	payload := map[string]any{}
	if decodeErr := json.NewDecoder(resp.Body).Decode(&payload); decodeErr != nil {
		t.Fatalf("decode response: %v", decodeErr)
	}
	data, _ := payload["data"].([]any)
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
	if enabled, _ := approve["enabled"].(bool); enabled {
		t.Fatalf("expected approve disabled for non-reviewer, got %+v", approve)
	}
	if got := strings.TrimSpace(toString(approve["reason_code"])); got != ActionDisabledReasonCodePermissionDenied {
		t.Fatalf("expected reviewer guard permission denied, got %+v", approve)
	}
	if got := strings.TrimSpace(toString(approve["expected_reviewer_id"])); got != "reviewer-1" {
		t.Fatalf("expected expected_reviewer_id reviewer-1, got %+v", approve)
	}
	archive := extractMap(reviewActions["archive"])
	if enabled, _ := archive["enabled"].(bool); !enabled {
		t.Fatalf("expected archive enabled for review row, got %+v", archive)
	}

	qaSummary := extractMap(row["qa_summary"])
	if enabled, _ := qaSummary["enabled"].(bool); !enabled {
		t.Fatalf("expected qa_summary enabled, got %+v", qaSummary)
	}
	if got := intValue(qaSummary["warning_count"]); got <= 0 {
		t.Fatalf("expected qa warning count > 0, got %+v", qaSummary)
	}
	if got := intValue(qaSummary["blocker_count"]); got <= 0 {
		t.Fatalf("expected qa blocker count > 0, got %+v", qaSummary)
	}

	reqReviewer := httptest.NewRequest(http.MethodGet, "/admin/api/translations/assignments", nil)
	reqReviewer.Header.Set("X-User-ID", "reviewer-1")
	respReviewer, err := fixture.app.Test(reqReviewer)
	if err != nil {
		t.Fatalf("reviewer request error: %v", err)
	}
	if respReviewer.StatusCode != http.StatusOK {
		t.Fatalf("reviewer status=%d want=200", respReviewer.StatusCode)
	}
	defer mustClose(t, "response body", respReviewer.Body)

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

	reqActorlessPreset := httptest.NewRequest(http.MethodGet, "/admin/api/translations/assignments?reviewer_id=__me__", nil)
	respActorlessPreset, err := fixture.app.Test(reqActorlessPreset)
	if err != nil {
		t.Fatalf("actorless preset request error: %v", err)
	}
	if respActorlessPreset.StatusCode != http.StatusOK {
		t.Fatalf("actorless preset status=%d want=200", respActorlessPreset.StatusCode)
	}
	defer mustClose(t, "response body", respActorlessPreset.Body)

	actorlessPresetPayload := map[string]any{}
	if err := json.NewDecoder(respActorlessPreset.Body).Decode(&actorlessPresetPayload); err != nil {
		t.Fatalf("decode actorless preset payload: %v", err)
	}
	actorlessData, _ := actorlessPresetPayload["data"].([]any)
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

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/assignments?reviewer_id=__me__&review_state=qa_blocked&family_id=tg-page-1&channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	req.Header.Set("X-User-ID", "reviewer-1")
	resp, err := fixture.app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer mustClose(t, "response body", resp.Body)

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
	data, _ := payload["data"].([]any)
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

	req := httptest.NewRequest(
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
	if resp.StatusCode < 400 || resp.StatusCode >= 500 {
		t.Fatalf("status=%d want=4xx", resp.StatusCode)
	}
	defer mustClose(t, "response body", resp.Body)

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
		req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/assignments/"+created.ID+"/actions/claim", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", "translator-1")
		return req
	}

	firstResp, err := app.Test(makeReq())
	if err != nil {
		t.Fatalf("first request error: %v", err)
	}
	if firstResp.StatusCode != http.StatusOK {
		t.Fatalf("first status=%d want=200", firstResp.StatusCode)
	}
	defer mustClose(t, "response body", firstResp.Body)
	first := map[string]any{}
	if firstDecodeErr := json.NewDecoder(firstResp.Body).Decode(&first); firstDecodeErr != nil {
		t.Fatalf("decode first response: %v", firstDecodeErr)
	}
	firstMeta, _ := first["meta"].(map[string]any)
	if hit, _ := firstMeta["idempotency_hit"].(bool); hit {
		t.Fatalf("expected first response not to be replay hit")
	}

	secondResp, err := app.Test(makeReq())
	if err != nil {
		t.Fatalf("second request error: %v", err)
	}
	if secondResp.StatusCode != http.StatusOK {
		t.Fatalf("second status=%d want=200", secondResp.StatusCode)
	}
	defer mustClose(t, "response body", secondResp.Body)
	second := map[string]any{}
	if secondDecodeErr := json.NewDecoder(secondResp.Body).Decode(&second); secondDecodeErr != nil {
		t.Fatalf("decode second response: %v", secondDecodeErr)
	}
	secondMeta, _ := second["meta"].(map[string]any)
	if hit, _ := secondMeta["idempotency_hit"].(bool); !hit {
		t.Fatalf("expected replay to set meta.idempotency_hit=true, got %+v", secondMeta)
	}
	data, _ := second["data"].(map[string]any)
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

	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/assignments/"+created.ID+"/actions/claim", strings.NewReader(`{"expected_version":1}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
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
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/assignment-actions/bulk", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "manager-1")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer mustClose(t, "response body", resp.Body)
	response := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	meta := extractMap(response["meta"])
	if intValue(meta["requested"]) != 2 || intValue(meta["succeeded"]) != 1 || intValue(meta["failed"]) != 1 {
		t.Fatalf("unexpected bulk metadata: %+v", meta)
	}
	if partial, _ := meta["partial"].(bool); !partial {
		t.Fatalf("expected partial=true, got %+v", meta)
	}
	data := extractMap(response["data"])
	assignments, _ := data["assignments"].([]any)
	if len(assignments) != 1 {
		t.Fatalf("expected one updated assignment row, got %d", len(assignments))
	}
	errorsOut, _ := data["errors"].([]any)
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
		for key, value := range extra {
			payload[key] = value
		}
		body, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("marshal %s request: %v", action, err)
		}
		req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/assignment-actions/bulk", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", "manager-1")
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("%s request error: %v", action, err)
		}
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("%s status=%d want=200", action, resp.StatusCode)
		}
		defer mustClose(t, "response body", resp.Body)
		response := map[string]any{}
		if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
			t.Fatalf("decode %s response: %v", action, err)
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
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/assignment-actions/bulk", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "manager-1")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer mustClose(t, "response body", resp.Body)
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
	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/assignment-actions/bulk", strings.NewReader(`{"action":"approve","assignments":[{"assignment_id":"asg-1","expected_version":1}]}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "manager-1")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d want=400", resp.StatusCode)
	}
}

func TestTranslationQueueBindingAssignmentActionEnforcesScopeIsolation(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
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

	req := httptest.NewRequest(http.MethodPost, "/admin/api/translations/assignments/"+created.ID+"/actions/claim?tenant_id=tenant-b&org_id=org-b", strings.NewReader(`{"expected_version":1}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
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

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/my-work", nil)
	req.Header.Set("X-User-ID", "translator-1")
	req.Header.Set("X-Request-ID", "req-queue-1")
	req.Header.Set("X-Correlation-ID", "corr-queue-1")
	req.Header.Set("X-Trace-ID", "trace-queue-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer mustClose(t, "response body", resp.Body)

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

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/my-work?per_page=1&page=1", nil)
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer mustClose(t, "response body", resp.Body)

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	assignments, _ := payload["assignments"].([]any)
	if len(assignments) != 1 {
		t.Fatalf("expected paginated assignments length=1, got %d", len(assignments))
	}
	summary, _ := payload["summary"].(map[string]any)
	if int(summary["total"].(float64)) != 3 {
		t.Fatalf("expected summary.total=3, got %+v", summary)
	}
	if int(summary["overdue"].(float64)) != 1 || int(summary["due_soon"].(float64)) != 1 || int(summary["on_track"].(float64)) != 1 {
		t.Fatalf("unexpected due summary counts: %+v", summary)
	}
	if int(summary["review"].(float64)) != 1 {
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

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/queue?per_page=1&page=1", nil)
	req.Header.Set("X-User-ID", "manager-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer mustClose(t, "response body", resp.Body)

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	items, _ := payload["items"].([]any)
	if len(items) != 1 {
		t.Fatalf("expected paginated items length=1, got %d", len(items))
	}
	summary, _ := payload["summary"].(map[string]any)
	if int(summary["total"].(float64)) != 3 {
		t.Fatalf("expected summary.total=3, got %+v", summary)
	}
	byQueueState, _ := summary["by_queue_state"].(map[string]any)
	if int(byQueueState[string(AssignmentStatusInReview)].(float64)) != 1 ||
		int(byQueueState[string(AssignmentStatusInProgress)].(float64)) != 1 ||
		int(byQueueState[string(AssignmentStatusAssigned)].(float64)) != 1 {
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
	r.Get("/admin/api/translations/assignments/:assignment_id", func(c router.Context) error {
		payload, err := binding.AssignmentDetail(c, c.Param("assignment_id"))
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
	r.Patch("/admin/api/translations/variants/:variant_id", func(c router.Context) error {
		body, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		payload, err := binding.UpdateVariant(c, c.Param("variant_id"), body)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
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
