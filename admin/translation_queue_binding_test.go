package admin

import (
	"context"
	"encoding/json"
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
		TranslationGroupID: "tg-overdue",
		EntityType:         "pages",
		SourceRecordID:     "page-1",
		SourceLocale:       "en",
		TargetLocale:       "es",
		AssigneeID:         "translator-1",
		AssignmentType:     AssignmentTypeDirect,
		Status:             AssignmentStatusInProgress,
		Priority:           PriorityNormal,
		DueDate:            &overdue,
	})
	seedTranslationAssignment(TranslationAssignment{
		TranslationGroupID: "tg-soon",
		EntityType:         "posts",
		SourceRecordID:     "post-1",
		SourceLocale:       "en",
		TargetLocale:       "fr",
		AssigneeID:         "translator-1",
		AssignmentType:     AssignmentTypeDirect,
		Status:             AssignmentStatusReview,
		Priority:           PriorityHigh,
		DueDate:            &dueSoon,
	})
	seedTranslationAssignment(TranslationAssignment{
		TranslationGroupID: "tg-track",
		EntityType:         "news",
		SourceRecordID:     "news-1",
		SourceLocale:       "en",
		TargetLocale:       "de",
		AssigneeID:         "translator-1",
		AssignmentType:     AssignmentTypeDirect,
		Status:             AssignmentStatusAssigned,
		Priority:           PriorityNormal,
		DueDate:            &onTrack,
	})
	seedTranslationAssignment(TranslationAssignment{
		TranslationGroupID: "tg-none",
		EntityType:         "news",
		SourceRecordID:     "news-2",
		SourceLocale:       "en",
		TargetLocale:       "it",
		AssigneeID:         "translator-1",
		AssignmentType:     AssignmentTypeDirect,
		Status:             AssignmentStatusAssigned,
		Priority:           PriorityLow,
	})
	seedTranslationAssignment(TranslationAssignment{
		TranslationGroupID: "tg-other",
		EntityType:         "pages",
		SourceRecordID:     "page-2",
		SourceLocale:       "en",
		TargetLocale:       "pt",
		AssigneeID:         "translator-2",
		AssignmentType:     AssignmentTypeDirect,
		Status:             AssignmentStatusAssigned,
		Priority:           PriorityLow,
	})

	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
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
	defer resp.Body.Close()

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
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
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
		TranslationGroupID: "tg-review",
		EntityType:         "pages",
		SourceRecordID:     "page-review",
		SourceLocale:       "en",
		TargetLocale:       "es",
		AssigneeID:         "translator-1",
		AssignmentType:     AssignmentTypeDirect,
		Status:             AssignmentStatusReview,
		Priority:           PriorityHigh,
		DueDate:            &reviewDue,
	}); err != nil {
		t.Fatalf("create review assignment: %v", err)
	}
	if _, err := repo.Create(context.Background(), TranslationAssignment{
		TranslationGroupID: "tg-progress",
		EntityType:         "news",
		SourceRecordID:     "news-progress",
		SourceLocale:       "en",
		TargetLocale:       "fr",
		AssigneeID:         "translator-2",
		AssignmentType:     AssignmentTypeDirect,
		Status:             AssignmentStatusInProgress,
		Priority:           PriorityNormal,
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
	defer resp.Body.Close()

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
		if strings.EqualFold(strings.TrimSpace(toString(row["queue_state"])), string(AssignmentStatusReview)) {
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
			TranslationGroupID: "tg-overdue",
			EntityType:         "pages",
			SourceRecordID:     "page-1",
			SourceLocale:       "en",
			TargetLocale:       "es",
			AssigneeID:         "translator-1",
			AssignmentType:     AssignmentTypeDirect,
			Status:             AssignmentStatusReview,
			DueDate:            &overdue,
		},
		{
			TranslationGroupID: "tg-due-soon",
			EntityType:         "posts",
			SourceRecordID:     "post-1",
			SourceLocale:       "en",
			TargetLocale:       "fr",
			AssigneeID:         "translator-1",
			AssignmentType:     AssignmentTypeDirect,
			Status:             AssignmentStatusInProgress,
			DueDate:            &dueSoon,
		},
		{
			TranslationGroupID: "tg-on-track",
			EntityType:         "news",
			SourceRecordID:     "news-1",
			SourceLocale:       "en",
			TargetLocale:       "de",
			AssigneeID:         "translator-1",
			AssignmentType:     AssignmentTypeDirect,
			Status:             AssignmentStatusAssigned,
			DueDate:            &onTrack,
		},
	} {
		if _, err := repo.Create(context.Background(), assignment); err != nil {
			t.Fatalf("create assignment: %v", err)
		}
	}
	if _, err := repo.Create(context.Background(), TranslationAssignment{
		TranslationGroupID: "tg-other",
		EntityType:         "pages",
		SourceRecordID:     "page-2",
		SourceLocale:       "en",
		TargetLocale:       "pt",
		AssigneeID:         "translator-2",
		AssignmentType:     AssignmentTypeDirect,
		Status:             AssignmentStatusAssigned,
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
	defer resp.Body.Close()

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
			TranslationGroupID: "tg-review",
			EntityType:         "pages",
			SourceRecordID:     "page-review",
			SourceLocale:       "en",
			TargetLocale:       "es",
			AssigneeID:         "translator-1",
			AssignmentType:     AssignmentTypeDirect,
			Status:             AssignmentStatusReview,
		},
		{
			TranslationGroupID: "tg-progress",
			EntityType:         "news",
			SourceRecordID:     "news-progress",
			SourceLocale:       "en",
			TargetLocale:       "fr",
			AssigneeID:         "translator-2",
			AssignmentType:     AssignmentTypeDirect,
			Status:             AssignmentStatusInProgress,
		},
		{
			TranslationGroupID: "tg-assigned",
			EntityType:         "posts",
			SourceRecordID:     "post-assigned",
			SourceLocale:       "en",
			TargetLocale:       "de",
			AssigneeID:         "translator-3",
			AssignmentType:     AssignmentTypeDirect,
			Status:             AssignmentStatusAssigned,
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
	defer resp.Body.Close()

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
	if int(byQueueState[string(AssignmentStatusReview)].(float64)) != 1 ||
		int(byQueueState[string(AssignmentStatusInProgress)].(float64)) != 1 ||
		int(byQueueState[string(AssignmentStatusAssigned)].(float64)) != 1 {
		t.Fatalf("unexpected by_queue_state summary: %+v", byQueueState)
	}
}

func newTranslationQueueTestApp(t *testing.T, binding *translationQueueBinding) *fiber.App {
	t.Helper()
	adapter := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{
			UnescapePath:      true,
			EnablePrintRoutes: true,
			StrictRouting:     false,
			PassLocalsToViews: true,
		})
	})
	r := adapter.Router()
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
