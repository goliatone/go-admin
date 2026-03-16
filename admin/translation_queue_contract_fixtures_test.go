package admin

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

func TestTranslationQueueContractFixtures(t *testing.T) {
	data, err := os.ReadFile("testdata/translation_queue_contract_fixtures.json")
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	fixture := map[string]any{}
	if err := json.Unmarshal(data, &fixture); err != nil {
		t.Fatalf("decode fixture: %v", err)
	}

	meta, _ := fixture["meta"].(map[string]any)
	if meta == nil {
		t.Fatalf("expected fixture meta")
	}

	assertStringSliceEqual(t, meta["supported_sort_keys"], TranslationQueueSupportedSortKeys())
	defaultSort, _ := meta["default_sort"].(map[string]any)
	if defaultSort == nil {
		t.Fatalf("expected default_sort payload")
	}
	if got := toString(defaultSort["key"]); got != "updated_at" {
		t.Fatalf("expected default sort key updated_at, got %q", got)
	}
	if got := toString(defaultSort["order"]); got != "desc" {
		t.Fatalf("expected default sort order desc, got %q", got)
	}

	presets, _ := meta["saved_filter_presets"].([]any)
	if len(presets) != 5 {
		t.Fatalf("expected five saved filter presets, got %d", len(presets))
	}
	reviewPresets, _ := meta["saved_review_filter_presets"].([]any)
	if len(reviewPresets) != 4 {
		t.Fatalf("expected four saved review filter presets, got %d", len(reviewPresets))
	}
	if got := toString(meta["default_review_filter_preset"]); got != "review_inbox" {
		t.Fatalf("expected default_review_filter_preset review_inbox, got %q", got)
	}

	states, _ := fixture["states"].(map[string]any)
	if states == nil {
		t.Fatalf("expected states payload")
	}
	assertQueueStateActionCode(t, states, "open_pool", "claim", "", true)
	assertQueueStateActionCode(t, states, "review_ready", "approve", "", true)
	assertQueueStateActionCode(t, states, "review_ready", "archive", "", true)
	assertQueueStateActionCode(t, states, "review_guarded", "approve", ActionDisabledReasonCodePermissionDenied, false)
	assertQueueStateActionCode(t, states, "permission_denied", "claim", ActionDisabledReasonCodePermissionDenied, false)

	qaSummaryState := extractMap(states["qa_summary"])
	qaRows, _ := qaSummaryState["data"].([]any)
	if len(qaRows) != 1 {
		t.Fatalf("expected one qa_summary row, got %+v", qaSummaryState)
	}
	qaRow := extractMap(qaRows[0])
	if got := toString(qaRow["last_rejection_reason"]); got == "" {
		t.Fatalf("expected qa_summary last_rejection_reason, got %+v", qaRow)
	}
	reviewFeedback := extractMap(qaRow["review_feedback"])
	if got := toString(reviewFeedback["last_reviewer_id"]); got == "" {
		t.Fatalf("expected review_feedback.last_reviewer_id, got %+v", reviewFeedback)
	}
	summary := extractMap(qaRow["qa_summary"])
	if got := toInt(summary["warning_count"]); got <= 0 {
		t.Fatalf("expected qa warning_count > 0, got %+v", summary)
	}
	if got := toInt(summary["blocker_count"]); got <= 0 {
		t.Fatalf("expected qa blocker_count > 0, got %+v", summary)
	}

	actionErrors, _ := fixture["action_errors"].(map[string]any)
	if actionErrors == nil {
		t.Fatalf("expected action_errors payload")
	}
	assertActionErrorCode(t, actionErrors, "permission_denied", TextCodeForbidden)
	assertActionErrorCode(t, actionErrors, "version_conflict", TextCodeTranslationQueueVersionConflict)
	assertActionErrorCode(t, actionErrors, "reject_requires_reason", TextCodeValidationError)
}

func TestTranslationQueueAssignmentsMetaPublishesPresetContracts(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}
	binding := newTranslationQueueBinding(adm)
	app := newTranslationQueueTestApp(t, binding)

	req := httptest.NewRequest("GET", "/admin/api/translations/assignments", nil)
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer resp.Body.Close()

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	meta, _ := payload["meta"].(map[string]any)
	if meta == nil {
		t.Fatalf("expected meta payload")
	}

	assertStringSliceEqual(t, meta["supported_sort_keys"], TranslationQueueSupportedSortKeys())
	if presets, _ := meta["saved_filter_presets"].([]any); len(presets) != 5 {
		t.Fatalf("expected five saved presets, got %d", len(presets))
	}
	if reviewPresets, _ := meta["saved_review_filter_presets"].([]any); len(reviewPresets) != 4 {
		t.Fatalf("expected four review presets, got %d", len(reviewPresets))
	}
}

func TestTranslationQueueAssignmentsFiltersResolveActorPresetTokensAndMultiValueFilters(t *testing.T) {
	now, err := time.Parse(time.RFC3339, "2026-03-12T10:00:00Z")
	if err != nil {
		t.Fatalf("parse time: %v", err)
	}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	repo := NewInMemoryTranslationAssignmentRepository()
	for _, assignment := range []TranslationAssignment{
		{
			TranslationGroupID: "tg-open",
			EntityType:         "pages",
			SourceRecordID:     "page-open",
			SourceLocale:       "en",
			TargetLocale:       "fr",
			AssignmentType:     AssignmentTypeOpenPool,
			Status:             AssignmentStatusOpen,
			Priority:           PriorityUrgent,
		},
		{
			TranslationGroupID: "tg-mine",
			EntityType:         "posts",
			SourceRecordID:     "post-mine",
			SourceLocale:       "en",
			TargetLocale:       "es",
			AssignmentType:     AssignmentTypeDirect,
			Status:             AssignmentStatusAssigned,
			Priority:           PriorityHigh,
			AssigneeID:         "translator-1",
		},
		{
			TranslationGroupID: "tg-review",
			EntityType:         "news",
			SourceRecordID:     "news-review",
			SourceLocale:       "en",
			TargetLocale:       "de",
			AssignmentType:     AssignmentTypeDirect,
			Status:             AssignmentStatusInReview,
			Priority:           PriorityNormal,
			ReviewerID:         "translator-1",
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

	req := httptest.NewRequest("GET", "/admin/api/translations/assignments?assignee_id=__me__&status=open,assigned&priority=high,urgent", nil)
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	defer resp.Body.Close()

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	items, _ := payload["data"].([]any)
	if len(items) != 1 {
		t.Fatalf("expected one filtered assignment, got %d", len(items))
	}
	row, _ := items[0].(map[string]any)
	if got := toString(row["assignee_id"]); got != "translator-1" {
		t.Fatalf("expected __me__ resolution to translator-1, got %q", got)
	}
}

func assertQueueStateActionCode(t *testing.T, states map[string]any, stateKey, actionKey, reasonCode string, enabled bool) {
	t.Helper()
	state, _ := states[stateKey].(map[string]any)
	rows, _ := state["data"].([]any)
	if len(rows) != 1 {
		t.Fatalf("expected one row for %s, got %d", stateKey, len(rows))
	}
	row, _ := rows[0].(map[string]any)
	actions, _ := row["actions"].(map[string]any)
	action, _ := actions[actionKey].(map[string]any)
	if len(action) == 0 {
		reviewActions, _ := row["review_actions"].(map[string]any)
		action, _ = reviewActions[actionKey].(map[string]any)
	}
	if got, _ := action["enabled"].(bool); got != enabled {
		t.Fatalf("expected %s.%s enabled=%t, got %+v", stateKey, actionKey, enabled, action)
	}
	if reasonCode == "" {
		return
	}
	if got := toString(action["reason_code"]); got != reasonCode {
		t.Fatalf("expected %s.%s reason_code=%q, got %q", stateKey, actionKey, reasonCode, got)
	}
}

func assertActionErrorCode(t *testing.T, payload map[string]any, key, expected string) {
	t.Helper()
	entry, _ := payload[key].(map[string]any)
	errPayload, _ := entry["error"].(map[string]any)
	if errPayload == nil {
		t.Fatalf("expected %s error payload", key)
	}
	if got := toString(errPayload["text_code"]); got != expected {
		t.Fatalf("expected %s error text_code=%q, got %q", key, expected, got)
	}
}

func assertStringSliceEqual(t *testing.T, raw any, expected []string) {
	t.Helper()
	values, _ := raw.([]any)
	if len(values) != len(expected) {
		t.Fatalf("expected %d values, got %d", len(expected), len(values))
	}
	for idx, want := range expected {
		if got := toString(values[idx]); got != want {
			t.Fatalf("expected value[%d]=%q, got %q", idx, want, got)
		}
	}
}
