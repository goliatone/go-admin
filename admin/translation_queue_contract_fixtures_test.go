package admin

import (
	"context"
	"encoding/json"
	"net/http"
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

	meta := mustMapAny(t, fixture["meta"], "fixture meta")

	assertStringSliceEqual(t, meta["supported_sort_keys"], TranslationQueueSupportedSortKeys())
	defaultSort := mustMapAny(t, meta["default_sort"], "default_sort payload")
	if got := toString(defaultSort["key"]); got != "updated_at" {
		t.Fatalf("expected default sort key updated_at, got %q", got)
	}
	if got := toString(defaultSort["order"]); got != "desc" {
		t.Fatalf("expected default sort order desc, got %q", got)
	}

	presets := mustAnySlice(t, meta["saved_filter_presets"], "saved_filter_presets")
	if len(presets) != 5 {
		t.Fatalf("expected five saved filter presets, got %d", len(presets))
	}
	reviewPresets := mustAnySlice(t, meta["saved_review_filter_presets"], "saved_review_filter_presets")
	if len(reviewPresets) != 4 {
		t.Fatalf("expected four saved review filter presets, got %d", len(reviewPresets))
	}
	if got := toString(meta["default_review_filter_preset"]); got != "review_inbox" {
		t.Fatalf("expected default_review_filter_preset review_inbox, got %q", got)
	}

	states := mustMapAny(t, fixture["states"], "states payload")
	serverFamily := extractMap(states["server_family_parent"])
	serverFamilyMeta := extractMap(serverFamily["meta"])
	serverFamilyGrouping := extractMap(serverFamilyMeta["grouping"])
	if got := toString(serverFamilyGrouping["strategy"]); got != "server_family" {
		t.Fatalf("expected server_family fixture strategy, got %+v", serverFamilyGrouping)
	}
	serverFamilyRows := mustAnySlice(t, serverFamily["data"], "server family data")
	if len(serverFamilyRows) != 1 {
		t.Fatalf("expected one server-family parent fixture row, got %+v", serverFamily)
	}
	serverFamilyRow := extractMap(serverFamilyRows[0])
	if got := toString(serverFamilyRow["row_type"]); got != "family" {
		t.Fatalf("expected server-family parent row_type family, got %+v", serverFamilyRow)
	}
	if expansion := extractMap(serverFamilyRow["expansion"]); toString(expansion["route"]) != "translations.assignments.family_assignments" {
		t.Fatalf("expected server-family expansion route fixture, got %+v", expansion)
	}
	if unsupported := extractMap(extractMap(states["server_family_unsupported"])["error"]); toString(extractMap(unsupported["metadata"])["reason_code"]) != "grouped_query_unsupported" {
		t.Fatalf("expected grouped_query_unsupported fixture, got %+v", unsupported)
	}
	if blockersUnavailable := extractMap(extractMap(states["server_family_blockers_unavailable"])["error"]); toString(extractMap(blockersUnavailable["metadata"])["reason_code"]) != "persisted_blockers_unavailable" {
		t.Fatalf("expected persisted_blockers_unavailable fixture, got %+v", blockersUnavailable)
	}
	assertQueueStateActionCode(t, states, "open_pool", "claim", "", true)
	assertQueueStateActionCode(t, states, "review_ready", "approve", "", true)
	assertQueueStateActionCode(t, states, "review_ready", "archive", "", true)
	assertQueueStateActionCode(t, states, "review_guarded", "approve", ActionDisabledReasonCodePermissionDenied, false)
	assertQueueStateActionCode(t, states, "permission_denied", "claim", ActionDisabledReasonCodePermissionDenied, false)

	qaSummaryState := extractMap(states["qa_summary"])
	qaRows := mustAnySlice(t, qaSummaryState["data"], "qa summary data")
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

	actionErrors := mustMapAny(t, fixture["action_errors"], "action_errors payload")
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

	req := testHTTPRequest(http.MethodGet, "/admin/api/translations/assignments", nil)
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			t.Fatalf("close response body: %v", closeErr)
		}
	}()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	meta := mustMapAny(t, payload["meta"], "meta payload")

	assertStringSliceEqual(t, meta["supported_sort_keys"], TranslationQueueSupportedSortKeys())
	if presets := mustAnySlice(t, meta["saved_filter_presets"], "saved_filter_presets"); len(presets) != 5 {
		t.Fatalf("expected five saved presets, got %d", len(presets))
	}
	if reviewPresets := mustAnySlice(t, meta["saved_review_filter_presets"], "saved_review_filter_presets"); len(reviewPresets) != 4 {
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
			FamilyID:       "tg-open",
			EntityType:     "pages",
			SourceRecordID: "page-open",
			SourceLocale:   "en",
			TargetLocale:   "fr",
			AssignmentType: AssignmentTypeOpenPool,
			Status:         AssignmentStatusOpen,
			Priority:       PriorityUrgent,
		},
		{
			FamilyID:       "tg-mine",
			EntityType:     "posts",
			SourceRecordID: "post-mine",
			SourceLocale:   "en",
			TargetLocale:   "es",
			AssignmentType: AssignmentTypeDirect,
			Status:         AssignmentStatusAssigned,
			Priority:       PriorityHigh,
			AssigneeID:     "translator-1",
		},
		{
			FamilyID:       "tg-review",
			EntityType:     "news",
			SourceRecordID: "news-review",
			SourceLocale:   "en",
			TargetLocale:   "de",
			AssignmentType: AssignmentTypeDirect,
			Status:         AssignmentStatusInReview,
			Priority:       PriorityNormal,
			ReviewerID:     "translator-1",
		},
	} {
		if _, createErr := repo.Create(context.Background(), assignment); createErr != nil {
			t.Fatalf("create assignment: %v", createErr)
		}
	}
	if _, registerErr := RegisterTranslationQueuePanel(adm, repo); registerErr != nil {
		t.Fatalf("register queue panel: %v", registerErr)
	}
	binding := newTranslationQueueBinding(adm)
	binding.now = func() time.Time { return now }
	app := newTranslationQueueTestApp(t, binding)

	req := testHTTPRequest(http.MethodGet, "/admin/api/translations/assignments?assignee_id=__me__&status=open,assigned&priority=high,urgent", nil)
	req.Header.Set("X-User-ID", "translator-1")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			t.Fatalf("close response body: %v", closeErr)
		}
	}()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	items := mustAnySlice(t, payload["data"], "assignments data")
	if len(items) != 1 {
		t.Fatalf("expected one filtered assignment, got %d", len(items))
	}
	row := mustMapAny(t, items[0], "assignment row")
	if got := toString(row["assignee_id"]); got != "translator-1" {
		t.Fatalf("expected __me__ resolution to translator-1, got %q", got)
	}
}

func assertQueueStateActionCode(t *testing.T, states map[string]any, stateKey, actionKey, reasonCode string, enabled bool) {
	t.Helper()
	state := mustMapAny(t, states[stateKey], stateKey)
	rows := mustAnySlice(t, state["data"], stateKey+" data")
	if len(rows) != 1 {
		t.Fatalf("expected one row for %s, got %d", stateKey, len(rows))
	}
	row := mustMapAny(t, rows[0], stateKey+" row")
	actions := mustMapAny(t, row["actions"], stateKey+" actions")
	action, ok := actions[actionKey].(map[string]any)
	if !ok || len(action) == 0 {
		reviewActions := mustMapAny(t, row["review_actions"], stateKey+" review actions")
		action = mustMapAny(t, reviewActions[actionKey], stateKey+" review action "+actionKey)
	}
	if got := mustBool(t, action["enabled"], stateKey+" action enabled"); got != enabled {
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
	entry := mustMapAny(t, payload[key], key)
	errPayload := mustMapAny(t, entry["error"], key+" error payload")
	if got := toString(errPayload["text_code"]); got != expected {
		t.Fatalf("expected %s error text_code=%q, got %q", key, expected, got)
	}
}

func assertStringSliceEqual(t *testing.T, raw any, expected []string) {
	t.Helper()
	values := mustAnySlice(t, raw, "string slice")
	if len(values) != len(expected) {
		t.Fatalf("expected %d values, got %d", len(expected), len(values))
	}
	for idx, want := range expected {
		if got := toString(values[idx]); got != want {
			t.Fatalf("expected value[%d]=%q, got %q", idx, want, got)
		}
	}
}
