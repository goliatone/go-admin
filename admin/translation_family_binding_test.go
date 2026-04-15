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

	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
)

func TestTranslationFamilyBindingListAppliesFiltersAndScopeIsolation(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	binding := newTranslationFamilyBinding(adm)
	runtime := newTranslationFamilyBindingTestRuntime(t)
	binding.loadRuntime = func(context.Context, string) (*translationFamilyRuntime, error) {
		return runtime, nil
	}

	app := newTranslationFamilyTestApp(t, binding)
	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/families?family_id=tg-page-1&content_type=pages&readiness_state=blocked&blocker_code=missing_locale&missing_locale=fr&tenant_id=tenant-1&org_id=org-1&channel=production", nil)
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
	data := extractMap(payload["data"])
	meta := extractMap(payload["meta"])
	if got := toInt(meta["total"]); got != 1 {
		t.Fatalf("expected total=1, got %d", got)
	}
	if got := toString(meta["channel"]); got != "production" {
		t.Fatalf("expected channel production, got %q", got)
	}
	report, _ := meta["report"].(map[string]any)
	summary, _ := report["summary"].(map[string]any)
	if got := toInt(summary["families"]); got != 3 {
		t.Fatalf("expected report families=3, got %d", got)
	}

	items, _ := data["items"].([]any)
	if len(items) != 1 {
		t.Fatalf("expected one filtered family, got %d", len(items))
	}
	row, _ := items[0].(map[string]any)
	if got := toString(row["family_id"]); got != "tg-page-1" {
		t.Fatalf("expected family_id tg-page-1, got %q", got)
	}
	if got := toString(row["source_locale"]); got != "en" {
		t.Fatalf("expected source_locale en, got %q", got)
	}
	if got := toInt(row["missing_required_locale_count"]); got != 1 {
		t.Fatalf("expected missing_required_locale_count=1, got %d", got)
	}
	if got := toInt(row["pending_review_count"]); got != 1 {
		t.Fatalf("expected pending_review_count=1, got %d", got)
	}
	blockerCodes := toStringSlice(row["blocker_codes"])
	if len(blockerCodes) != 2 || blockerCodes[0] != "missing_locale" || blockerCodes[1] != "pending_review" {
		t.Fatalf("unexpected blocker codes: %+v", blockerCodes)
	}
	missingLocales := toStringSlice(row["missing_locales"])
	if len(missingLocales) != 1 || missingLocales[0] != "fr" {
		t.Fatalf("expected missing locale fr, got %+v", missingLocales)
	}
}

func TestTranslationFamilyBindingDetailReturnsSourceAssignmentsAndPublishGate(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	binding := newTranslationFamilyBinding(adm)
	runtime := newTranslationFamilyBindingTestRuntime(t)
	binding.loadRuntime = func(context.Context, string) (*translationFamilyRuntime, error) {
		return runtime, nil
	}

	app := newTranslationFamilyTestApp(t, binding)
	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/families/tg-page-1?tenant_id=tenant-1&org_id=org-1&channel=production", nil)
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
	data := extractMap(payload["data"])
	if got := toString(data["family_id"]); got != "tg-page-1" {
		t.Fatalf("expected family_id tg-page-1, got %q", got)
	}
	source, _ := data["source_variant"].(map[string]any)
	if got := toString(source["locale"]); got != "en" {
		t.Fatalf("expected source locale en, got %q", got)
	}
	if got := toString(source["source_record_id"]); got != "page-1" {
		t.Fatalf("expected source_record_id page-1, got %q", got)
	}

	blockers, _ := data["blockers"].([]any)
	if len(blockers) != 2 {
		t.Fatalf("expected 2 blockers, got %d", len(blockers))
	}
	firstBlocker, _ := blockers[0].(map[string]any)
	secondBlocker, _ := blockers[1].(map[string]any)
	if got := toString(firstBlocker["blocker_code"]); got != "missing_locale" {
		t.Fatalf("expected first blocker missing_locale, got %q", got)
	}
	if got := toString(secondBlocker["blocker_code"]); got != "pending_review" {
		t.Fatalf("expected second blocker pending_review, got %q", got)
	}

	assignments, _ := data["active_assignments"].([]any)
	if len(assignments) != 1 {
		t.Fatalf("expected one active assignment, got %d", len(assignments))
	}
	assignment, _ := assignments[0].(map[string]any)
	if got := toString(assignment["target_locale"]); got != "es" {
		t.Fatalf("expected active assignment target es, got %q", got)
	}
	if got := toString(assignment["status"]); got != string(translationcore.AssignmentStatusInProgress) {
		t.Fatalf("expected active assignment in_progress, got %q", got)
	}

	summary, _ := data["readiness_summary"].(map[string]any)
	if got := toString(summary["state"]); got != string(translationcore.FamilyReadinessBlocked) {
		t.Fatalf("expected blocked readiness summary, got %q", got)
	}
	if got := toInt(summary["pending_review_count"]); got != 1 {
		t.Fatalf("expected pending_review_count=1, got %d", got)
	}
	if got := toInt(summary["missing_required_locale_count"]); got != 1 {
		t.Fatalf("expected missing_required_locale_count=1, got %d", got)
	}

	publishGate, _ := data["publish_gate"].(map[string]any)
	if allowed, _ := publishGate["allowed"].(bool); allowed {
		t.Fatalf("expected publish gate blocked")
	}
	if overrideAllowed, _ := publishGate["override_allowed"].(bool); !overrideAllowed {
		t.Fatalf("expected publish override allowed")
	}
	if reviewRequired, _ := publishGate["review_required"].(bool); !reviewRequired {
		t.Fatalf("expected review_required=true")
	}
	quickCreate, _ := data["quick_create"].(map[string]any)
	if quickCreate == nil {
		t.Fatalf("expected quick_create payload, got %#v", data["quick_create"])
	}
	if got := toStringSlice(quickCreate["missing_locales"]); len(got) != 1 || got[0] != "fr" {
		t.Fatalf("expected quick_create missing_locales [fr], got %+v", got)
	}
	defaultAssignment, _ := quickCreate["default_assignment"].(map[string]any)
	if got := toString(defaultAssignment["work_scope"]); got != "localization" {
		t.Fatalf("expected quick_create default assignment work_scope localization, got %q", got)
	}
}

func TestTranslationFamilyBindingCreateVariantRecomputesReadinessAndRecordsAudit(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
		ReviewRequired:  true,
		LifecycleMode:   string(translationcore.AssignmentLifecycleSingleActivePerLang),
	})

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale":                 "fr",
		"auto_create_assignment": true,
		"assignee_id":            "translator-9",
		"priority":               "high",
		"due_date":               "2026-02-20T15:00:00Z",
	}, map[string]string{
		"X-Idempotency-Key": "tx-family-create-fr",
	})
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	data := extractMap(payload["data"])
	if got := toString(data["family_id"]); got != "tg-page-1" {
		t.Fatalf("expected family_id tg-page-1, got %q", got)
	}
	if got := toString(data["locale"]); got != "fr" {
		t.Fatalf("expected locale fr, got %q", got)
	}
	if got := toString(data["status"]); got != string(translationcore.VariantStatusDraft) {
		t.Fatalf("expected variant status draft, got %q", got)
	}
	if got := toString(data["record_id"]); got == "" {
		t.Fatalf("expected created record_id in payload, got empty")
	}
	navigation := extractMap(data["navigation"])
	if got := toString(navigation["content_edit_url"]); !strings.Contains(got, "/admin/content/pages/") || !strings.Contains(got, "locale=fr") {
		t.Fatalf("expected content_edit_url with locale fr, got %q", got)
	}

	assignment := extractMap(data["assignment"])
	if got := toString(assignment["status"]); got != string(translationcore.AssignmentStatusAssigned) {
		t.Fatalf("expected seeded assignment status assigned, got %q", got)
	}
	if got := toString(assignment["assignee_id"]); got != "translator-9" {
		t.Fatalf("expected assignee translator-9, got %q", got)
	}

	meta := extractMap(payload["meta"])
	if hit, _ := meta["idempotency_hit"].(bool); hit {
		t.Fatalf("expected first create request not to be an idempotency replay")
	}
	familyMeta := extractMap(meta["family"])
	if got := toInt(familyMeta["missing_required_locale_count"]); got != 0 {
		t.Fatalf("expected missing_required_locale_count=0, got %d", got)
	}
	if got := toInt(familyMeta["pending_review_count"]); got != 1 {
		t.Fatalf("expected pending_review_count=1, got %d", got)
	}
	if got := toStringSlice(familyMeta["available_locales"]); len(got) != 2 || got[0] != "en" || got[1] != "fr" {
		t.Fatalf("expected available locales [en fr], got %+v", got)
	}
	if got := toStringSlice(familyMeta["blocker_codes"]); len(got) != 1 || got[0] != "pending_review" {
		t.Fatalf("expected blocker_codes [pending_review], got %+v", got)
	}
	quickCreate := extractMap(familyMeta["quick_create"])
	if got := toStringSlice(quickCreate["missing_locales"]); len(got) != 0 {
		t.Fatalf("expected quick_create missing_locales empty after creation, got %+v", got)
	}
	if enabled, _ := quickCreate["enabled"].(bool); enabled {
		t.Fatalf("expected quick_create disabled after creation, got %+v", quickCreate)
	}

	detailStatus, detailPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/families/tg-page-1?channel=production&tenant_id=tenant-1&org_id=org-1", nil, nil)
	if detailStatus != http.StatusOK {
		t.Fatalf("detail status=%d payload=%+v", detailStatus, detailPayload)
	}
	summary := extractMap(extractMap(detailPayload["data"])["readiness_summary"])
	if got := toInt(summary["missing_required_locale_count"]); got != 0 {
		t.Fatalf("expected detail missing_required_locale_count=0, got %d", got)
	}
	if got := toInt(summary["pending_review_count"]); got != 1 {
		t.Fatalf("expected detail pending_review_count=1, got %d", got)
	}

	entries, err := fixture.activity.List(context.Background(), 10)
	if err != nil {
		t.Fatalf("list activity entries: %v", err)
	}
	actions := map[string]bool{}
	for _, entry := range entries {
		actions[entry.Action] = true
	}
	for _, action := range []string{
		"translation.family.variant_created",
		"translation.family.blockers_changed",
		"translation.family.assignment_seeded",
	} {
		if !actions[action] {
			t.Fatalf("expected activity action %q, got %+v", action, actions)
		}
	}
}

func TestTranslationFamilyBindingCreateVariantRejectsDuplicateLocaleWithoutIdempotencyReplay(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})

	firstStatus, firstPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale": "fr",
	}, nil)
	if firstStatus != http.StatusOK {
		t.Fatalf("first create status=%d payload=%+v", firstStatus, firstPayload)
	}

	secondStatus, secondPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale": "fr",
	}, nil)
	if secondStatus != http.StatusConflict {
		t.Fatalf("expected duplicate create conflict, got status=%d payload=%+v", secondStatus, secondPayload)
	}
	if got := toString(extractMap(secondPayload["error"])["text_code"]); got != TextCodeTranslationExists {
		t.Fatalf("expected text_code %q, got %q", TextCodeTranslationExists, got)
	}
}

func TestTranslationFamilyBindingCreateVariantBlocksWhenPolicyIsUnavailable(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		DisablePolicy: true,
	})

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale": "fr",
	}, nil)
	if status != http.StatusConflict {
		t.Fatalf("expected policy-blocked conflict, got status=%d payload=%+v", status, payload)
	}
	if got := toString(extractMap(payload["error"])["text_code"]); got != string(translationcore.ErrorPolicyBlocked) {
		t.Fatalf("expected text_code %q, got %q", string(translationcore.ErrorPolicyBlocked), got)
	}
}

func TestTranslationFamilyBindingCreateVariantManualArchiveModeBlocksReplacementAssignment(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
		LifecycleMode:   string(translationcore.AssignmentLifecycleManualArchive),
		Assignments: []TranslationAssignment{
			{
				ID:             "asg-approved-fr",
				FamilyID:       "tg-page-1",
				EntityType:     "pages",
				SourceRecordID: "page-1",
				SourceLocale:   "en",
				TargetLocale:   "fr",
				WorkScope:      "localization",
				Status:         AssignmentStatusApproved,
				Priority:       PriorityNormal,
				CreatedAt:      time.Date(2026, 2, 17, 9, 0, 0, 0, time.UTC),
				UpdatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
			},
		},
	})

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale":                 "fr",
		"auto_create_assignment": true,
	}, nil)
	if status != http.StatusConflict {
		t.Fatalf("expected lifecycle conflict, got status=%d payload=%+v", status, payload)
	}
	if got := toString(extractMap(payload["error"])["text_code"]); got != string(translationcore.ErrorPolicyBlocked) {
		t.Fatalf("expected text_code %q, got %q", string(translationcore.ErrorPolicyBlocked), got)
	}

	detailStatus, detailPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/families/tg-page-1?channel=production&tenant_id=tenant-1&org_id=org-1", nil, nil)
	if detailStatus != http.StatusOK {
		t.Fatalf("detail status=%d payload=%+v", detailStatus, detailPayload)
	}
	summary := extractMap(extractMap(detailPayload["data"])["readiness_summary"])
	if got := toInt(summary["missing_required_locale_count"]); got != 1 {
		t.Fatalf("expected missing_required_locale_count to remain 1, got %d", got)
	}
}

func TestTranslationFamilyBindingCreateVariantIdempotencyReplayReturnsStablePayload(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})

	path := "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1"
	headers := map[string]string{"X-Idempotency-Key": "tx-idempotent-fr"}
	body := map[string]any{
		"locale": "fr",
	}
	firstStatus, firstPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, path, body, headers)
	if firstStatus != http.StatusOK {
		t.Fatalf("first create status=%d payload=%+v", firstStatus, firstPayload)
	}
	secondStatus, secondPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, path, body, headers)
	if secondStatus != http.StatusOK {
		t.Fatalf("second create status=%d payload=%+v", secondStatus, secondPayload)
	}
	if got := toString(extractMap(secondPayload["meta"])["idempotency_hit"]); strings.ToLower(got) != "true" {
		meta := extractMap(secondPayload["meta"])
		if hit, _ := meta["idempotency_hit"].(bool); !hit {
			t.Fatalf("expected idempotency replay to set meta.idempotency_hit=true, got %+v", meta)
		}
	}

	detailStatus, detailPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/families/tg-page-1?channel=production&tenant_id=tenant-1&org_id=org-1", nil, nil)
	if detailStatus != http.StatusOK {
		t.Fatalf("detail status=%d payload=%+v", detailStatus, detailPayload)
	}
	variants, _ := extractMap(detailPayload["data"])["locale_variants"].([]any)
	count := 0
	for _, item := range variants {
		if toString(extractMap(item)["locale"]) == "fr" {
			count++
		}
	}
	if count != 1 {
		t.Fatalf("expected exactly one fr variant after idempotent replay, got %d", count)
	}
}

func TestTranslationFamilyBindingCreateVariantIdempotencyReplaySurvivesBindingRestart(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales:      []string{"fr"},
		OmitDefaultWorkScope: true,
	})

	path := "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1"
	headers := map[string]string{"X-Idempotency-Key": "tx-idempotent-fr-restart"}
	body := map[string]any{
		"locale": "fr",
	}

	firstStatus, firstPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, path, body, headers)
	if firstStatus != http.StatusOK {
		t.Fatalf("first create status=%d payload=%+v", firstStatus, firstPayload)
	}

	restartedBinding := newTranslationFamilyBinding(fixture.admin)
	restartedBinding.now = func() time.Time { return time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC) }
	restartedApp := newTranslationFamilyTestApp(t, restartedBinding)

	secondStatus, secondPayload := doTranslationFamilyJSONRequest(t, restartedApp, http.MethodPost, path, body, headers)
	if secondStatus != http.StatusOK {
		t.Fatalf("second create status=%d payload=%+v", secondStatus, secondPayload)
	}
	if hit, _ := extractMap(secondPayload["meta"])["idempotency_hit"].(bool); !hit {
		t.Fatalf("expected idempotency replay hit after restart, got %+v", secondPayload)
	}
	familyMeta := extractMap(extractMap(secondPayload["meta"])["family"])
	quickCreate := extractMap(familyMeta["quick_create"])
	defaultAssignment := extractMap(quickCreate["default_assignment"])
	if got := toString(defaultAssignment["work_scope"]); got != translationcore.DefaultWorkScope {
		t.Fatalf("expected replayed quick-create default work_scope %q, got %q", translationcore.DefaultWorkScope, got)
	}

	detailStatus, detailPayload := doTranslationFamilyJSONRequest(t, restartedApp, http.MethodGet, "/admin/api/translations/families/tg-page-1?channel=production&tenant_id=tenant-1&org_id=org-1", nil, nil)
	if detailStatus != http.StatusOK {
		t.Fatalf("detail status=%d payload=%+v", detailStatus, detailPayload)
	}
	variants, _ := extractMap(detailPayload["data"])["locale_variants"].([]any)
	count := 0
	for _, item := range variants {
		if toString(extractMap(item)["locale"]) == "fr" {
			count++
		}
	}
	if count != 1 {
		t.Fatalf("expected exactly one fr variant after restart replay, got %d", count)
	}
}

func TestTranslationFamilyBindingCreateVariantRollsBackVariantWhenAssignmentSeedingFails(t *testing.T) {
	baseRepo := NewInMemoryTranslationAssignmentRepository()
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
		Assignments: []TranslationAssignment{
			{
				ID:             "asg-approved-fr",
				FamilyID:       "tg-page-1",
				EntityType:     "pages",
				SourceRecordID: "page-1",
				SourceLocale:   "en",
				TargetLocale:   "fr",
				WorkScope:      "localization",
				Status:         AssignmentStatusApproved,
				Priority:       PriorityNormal,
				CreatedAt:      time.Date(2026, 2, 17, 9, 0, 0, 0, time.UTC),
				UpdatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
			},
		},
		Repo: &translationAssignmentFailingRepository{
			base:            baseRepo,
			failCreateReuse: errors.New("assignment create failed"),
		},
	})

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale":                 "fr",
		"auto_create_assignment": true,
	}, nil)
	if status != http.StatusInternalServerError {
		t.Fatalf("expected create-locale failure, got status=%d payload=%+v", status, payload)
	}

	detailStatus, detailPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/families/tg-page-1?channel=production&tenant_id=tenant-1&org_id=org-1", nil, nil)
	if detailStatus != http.StatusOK {
		t.Fatalf("detail status=%d payload=%+v", detailStatus, detailPayload)
	}
	variants, _ := extractMap(detailPayload["data"])["locale_variants"].([]any)
	for _, item := range variants {
		if toString(extractMap(item)["locale"]) == "fr" {
			t.Fatalf("expected fr variant rollback, got %+v", variants)
		}
	}

	assignments, _, err := baseRepo.List(context.Background(), ListOptions{
		Page:    1,
		PerPage: 20,
		Filters: map[string]any{
			"family_id":     "tg-page-1",
			"target_locale": "fr",
		},
	})
	if err != nil {
		t.Fatalf("list assignments: %v", err)
	}
	if len(assignments) != 1 || assignments[0].Status != AssignmentStatusApproved {
		t.Fatalf("expected archived assignment rollback to restore approved state, got %+v", assignments)
	}
}

func TestTranslationFamilyBindingCreateVariantScopesLifecycleByWorkScope(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales:      []string{"fr"},
		OmitDefaultWorkScope: true,
		LifecycleMode:        string(translationcore.AssignmentLifecycleManualArchive),
		Assignments: []TranslationAssignment{
			{
				ID:             "asg-approved-editorial-fr",
				FamilyID:       "tg-page-1",
				EntityType:     "pages",
				SourceRecordID: "page-1",
				SourceLocale:   "en",
				TargetLocale:   "fr",
				WorkScope:      "editorial.review",
				Status:         AssignmentStatusApproved,
				Priority:       PriorityNormal,
				CreatedAt:      time.Date(2026, 2, 17, 9, 0, 0, 0, time.UTC),
				UpdatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
			},
		},
	})

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale":                 "fr",
		"auto_create_assignment": true,
	}, nil)
	if status != http.StatusOK {
		t.Fatalf("expected work-scope-isolated create success, got status=%d payload=%+v", status, payload)
	}
	if got := toString(extractMap(extractMap(payload["data"])["assignment"])["work_scope"]); got != translationcore.DefaultWorkScope {
		t.Fatalf("expected seeded assignment work_scope %q, got %q", translationcore.DefaultWorkScope, got)
	}

	assignments, _, err := fixture.repo.List(context.Background(), ListOptions{
		Page:    1,
		PerPage: 20,
		Filters: map[string]any{
			"family_id":     "tg-page-1",
			"target_locale": "fr",
		},
	})
	if err != nil {
		t.Fatalf("list assignments: %v", err)
	}
	if len(assignments) != 2 {
		t.Fatalf("expected approved assignment in other work scope to remain alongside seeded assignment, got %+v", assignments)
	}
}

func newTranslationFamilyTestApp(t *testing.T, binding *translationFamilyBinding) *fiber.App {
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
	r.Get("/admin/api/translations/families", func(c router.Context) error {
		payload, err := binding.List(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Get("/admin/api/translations/families/:family_id", func(c router.Context) error {
		payload, err := binding.Detail(c, c.Param("family_id"))
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Post("/admin/api/translations/families/:family_id/variants", func(c router.Context) error {
		payload, err := binding.Create(c, c.Param("family_id"))
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Get("/admin/api/translations/matrix", func(c router.Context) error {
		payload, err := binding.Matrix(c)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Post("/admin/api/translations/matrix/actions/create-missing", func(c router.Context) error {
		body, err := parseOptionalJSONMap(c.Body())
		if err != nil {
			return writeError(c, err)
		}
		payload, err := binding.CreateMissingBulk(c, body)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	r.Post("/admin/api/translations/matrix/actions/export-selected", func(c router.Context) error {
		body, err := parseOptionalJSONMap(c.Body())
		if err != nil {
			return writeError(c, err)
		}
		payload, err := binding.ExportSelectedBulk(c, body)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, payload)
	})
	adapter.Init()
	return adapter.WrappedRouter()
}

func newTranslationFamilyBindingTestRuntime(t *testing.T) *translationFamilyRuntime {
	t.Helper()
	ctx := context.Background()
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	store := translationservices.NewInMemoryFamilyStore()
	families := []translationservices.FamilyRecord{
		{
			ID:              "tg-page-1",
			TenantID:        "tenant-1",
			OrgID:           "org-1",
			ContentType:     "pages",
			SourceLocale:    "en",
			SourceVariantID: "page-1",
			Variants: []translationservices.FamilyVariant{
				{ID: "page-1", FamilyID: "tg-page-1", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: string(translationcore.VariantStatusPublished), IsSource: true, SourceRecordID: "page-1", Fields: map[string]string{"title": "Page 1", "body": "Hello"}, CreatedAt: now.Add(-6 * time.Hour), UpdatedAt: now.Add(-6 * time.Hour)},
				{ID: "page-1-es", FamilyID: "tg-page-1", TenantID: "tenant-1", OrgID: "org-1", Locale: "es", Status: string(translationcore.VariantStatusInReview), SourceRecordID: "page-1-es", Fields: map[string]string{"title": "Pagina 1", "body": "Hola"}, CreatedAt: now.Add(-5 * time.Hour), UpdatedAt: now.Add(-5 * time.Hour)},
			},
			Assignments: []translationservices.FamilyAssignment{
				{ID: "asg-open-es", FamilyID: "tg-page-1", SourceLocale: "en", TargetLocale: "es", WorkScope: "localization", Status: string(translationcore.AssignmentStatusInProgress), AssigneeID: "translator-1", Priority: "high", CreatedAt: now.Add(-90 * time.Minute), UpdatedAt: now.Add(-45 * time.Minute)},
				{ID: "asg-approved-fr", FamilyID: "tg-page-1", SourceLocale: "en", TargetLocale: "fr", WorkScope: "localization", Status: string(translationcore.AssignmentStatusApproved), ReviewerID: "reviewer-1", Priority: "normal", CreatedAt: now.Add(-2 * time.Hour), UpdatedAt: now.Add(-1 * time.Hour)},
			},
		},
		{
			ID:              "tg-post-1",
			TenantID:        "tenant-1",
			OrgID:           "org-1",
			ContentType:     "posts",
			SourceLocale:    "en",
			SourceVariantID: "post-1",
			Variants: []translationservices.FamilyVariant{
				{ID: "post-1", FamilyID: "tg-post-1", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: string(translationcore.VariantStatusPublished), IsSource: true, SourceRecordID: "post-1", Fields: map[string]string{"title": "Post 1", "body": "Hello"}, CreatedAt: now.Add(-4 * time.Hour), UpdatedAt: now.Add(-4 * time.Hour)},
				{ID: "post-1-es", FamilyID: "tg-post-1", TenantID: "tenant-1", OrgID: "org-1", Locale: "es", Status: string(translationcore.VariantStatusApproved), SourceRecordID: "post-1-es", Fields: map[string]string{"title": "Post 1 ES", "body": "Hola"}, CreatedAt: now.Add(-3 * time.Hour), UpdatedAt: now.Add(-3 * time.Hour)},
			},
		},
		{
			ID:              "tg-page-tenant-2",
			TenantID:        "tenant-2",
			OrgID:           "org-9",
			ContentType:     "pages",
			SourceLocale:    "en",
			SourceVariantID: "page-tenant-2",
			Variants: []translationservices.FamilyVariant{
				{ID: "page-tenant-2", FamilyID: "tg-page-tenant-2", TenantID: "tenant-2", OrgID: "org-9", Locale: "en", Status: string(translationcore.VariantStatusPublished), IsSource: true, SourceRecordID: "page-tenant-2", Fields: map[string]string{"title": "Tenant 2", "body": "Hello"}, CreatedAt: now.Add(-2 * time.Hour), UpdatedAt: now.Add(-2 * time.Hour)},
			},
		},
	}
	if err := seedTranslationFamilyStore(store, families...); err != nil {
		t.Fatalf("seed family store: %v", err)
	}

	service := &translationservices.FamilyService{
		Store: store,
		Policies: translationservices.PolicyService{
			Resolver: translationservices.StaticPolicyResolver{Policies: map[string]translationservices.FamilyPolicy{
				"pages": {
					ContentType:             "pages",
					Environment:             "production",
					SourceLocale:            "en",
					RequiredLocales:         []string{"es", "fr"},
					RequiredFields:          map[string][]string{"es": {"title", "body"}, "fr": {"title", "body"}},
					ReviewRequired:          true,
					AllowPublishOverride:    true,
					AssignmentLifecycleMode: "single_active_per_locale",
					DefaultWorkScope:        "localization",
				},
				"posts": {
					ContentType:          "posts",
					Environment:          "production",
					SourceLocale:         "en",
					RequiredLocales:      []string{"es"},
					RequiredFields:       map[string][]string{"es": {"title", "body"}},
					AllowPublishOverride: false,
				},
			}},
		},
	}
	if _, err := service.RecomputeAll(ctx, "production"); err != nil {
		t.Fatalf("recompute families: %v", err)
	}
	return &translationFamilyRuntime{
		service: service,
		report: translationRuntimeReport{
			Checksum: "family-binding-test-runtime",
			Summary: translationRuntimeReportSummary{
				Families:    len(families),
				Variants:    5,
				Assignments: 2,
			},
		},
	}
}

func toInt(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	default:
		return 0
	}
}

type translationFamilyMutationFixtureOptions struct {
	RequiredLocales      []string
	ReviewRequired       bool
	LifecycleMode        string
	Assignments          []TranslationAssignment
	DisablePolicy        bool
	OmitDefaultWorkScope bool
	Repo                 TranslationAssignmentRepository
}

type translationFamilyMutationFixture struct {
	app      *fiber.App
	activity *ActivityFeed
	content  *translationFamilyMutationContentService
	admin    *Admin
	repo     TranslationAssignmentRepository
}

func syncTranslationFamilyFixtureStore(t *testing.T, adm *Admin, environment string) {
	t.Helper()
	if adm == nil {
		t.Fatalf("admin required for translation family sync")
	}
	if err := SyncTranslationFamilyStore(context.Background(), adm, environment); err != nil {
		t.Fatalf("sync translation family store: %v", err)
	}
}

func newTranslationFamilyMutationFixture(t *testing.T, options translationFamilyMutationFixtureOptions) translationFamilyMutationFixture {
	t.Helper()
	if len(options.RequiredLocales) == 0 {
		options.RequiredLocales = []string{"fr"}
	}
	if options.LifecycleMode == "" {
		options.LifecycleMode = string(translationcore.AssignmentLifecycleAutoArchive)
	}

	contentSvc := newTranslationFamilyMutationContentService()
	_, err := contentSvc.CreatePage(context.Background(), CMSPage{
		ID:       "page-1",
		Title:    "Page 1",
		Slug:     "page-1",
		Locale:   "en",
		FamilyID: "tg-page-1",
		Status:   "published",
		Data: map[string]any{
			"path": "/page-1",
			"body": "Hello world",
		},
		Metadata: map[string]any{
			"tenant_id": "tenant-1",
			"org_id":    "org-1",
		},
	})
	if err != nil {
		t.Fatalf("seed source page: %v", err)
	}

	activityFeed := NewActivityFeed()
	contentSvc.WithActivitySink(activityFeed)
	repo := options.Repo
	if repo == nil {
		repo = NewInMemoryTranslationAssignmentRepository()
	}
	for _, assignment := range options.Assignments {
		if _, err := repo.Create(context.Background(), assignment); err != nil {
			t.Fatalf("seed assignment %q: %v", assignment.ID, err)
		}
	}

	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate:  featureGateFromKeys(FeatureCMS),
		ActivitySink: activityFeed,
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView: true,
			PermAdminTranslationsEdit: true,
		},
	})
	adm.UseCMS(&NoopCMSContainer{
		widgets: NewInMemoryWidgetService(),
		menus:   NewInMemoryMenuService(),
		content: contentSvc.InMemoryContentService,
	})
	adm.contentSvc = contentSvc
	adm.WithTranslationPolicy(readinessPolicyByEntityStub{
		requirements: fixtureTranslationRequirementsByEntity(options),
	})
	adm.WithTranslationFamilyStore(translationservices.NewInMemoryFamilyStore())
	if _, err := RegisterTranslationQueuePanel(adm, repo); err != nil {
		t.Fatalf("register translation queue panel: %v", err)
	}
	syncTranslationFamilyFixtureStore(t, adm, "production")

	binding := newTranslationFamilyBinding(adm)
	binding.now = func() time.Time { return time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC) }
	return translationFamilyMutationFixture{
		app:      newTranslationFamilyTestApp(t, binding),
		activity: activityFeed,
		content:  contentSvc,
		admin:    adm,
		repo:     repo,
	}
}

func fixtureTranslationRequirementsByEntity(options translationFamilyMutationFixtureOptions) map[string]TranslationRequirements {
	if options.DisablePolicy {
		return map[string]TranslationRequirements{}
	}
	defaultWorkScope := "localization"
	if options.OmitDefaultWorkScope {
		defaultWorkScope = ""
	}
	requiredFields := map[string][]string{}
	for _, locale := range options.RequiredLocales {
		requiredFields[strings.ToLower(strings.TrimSpace(locale))] = []string{"title", "body"}
	}
	return map[string]TranslationRequirements{
		"pages": {
			Locales:                 append([]string{}, options.RequiredLocales...),
			RequiredFields:          requiredFields,
			ReviewRequired:          options.ReviewRequired,
			AllowPublishOverride:    true,
			AssignmentLifecycleMode: options.LifecycleMode,
			DefaultWorkScope:        defaultWorkScope,
		},
	}
}

type translationFamilyMutationContentService struct {
	*InMemoryContentService
}

func newTranslationFamilyMutationContentService() *translationFamilyMutationContentService {
	return &translationFamilyMutationContentService{InMemoryContentService: NewInMemoryContentService()}
}

func (s *translationFamilyMutationContentService) CreateTranslation(ctx context.Context, input TranslationCreateInput) (*CMSContent, error) {
	input = normalizeTranslationCreateInput(input)
	source, err := s.Page(ctx, input.SourceID, "")
	if err != nil || source == nil {
		return nil, ErrNotFound
	}
	pages, err := s.Pages(ctx, "")
	if err != nil {
		return nil, err
	}
	groupID := strings.TrimSpace(firstNonEmpty(source.FamilyID, source.ID))
	for _, page := range pages {
		if !strings.EqualFold(strings.TrimSpace(firstNonEmpty(page.FamilyID, page.ID)), groupID) {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(page.Locale), input.Locale) {
			return nil, TranslationAlreadyExistsError{
				Panel:        "pages",
				EntityID:     source.ID,
				SourceLocale: source.Locale,
				Locale:       input.Locale,
				FamilyID:     groupID,
			}
		}
	}

	createdPage := cloneCMSPage(*source)
	createdPage.ID = ""
	createdPage.Locale = input.Locale
	createdPage.Status = string(translationcore.VariantStatusDraft)
	createdPage.FamilyID = groupID
	createdPage.Slug = strings.TrimSpace(firstNonEmpty(source.Slug+"-"+input.Locale, input.Locale))
	createdPage.Metadata = cloneAnyMap(source.Metadata)
	for key, value := range cloneAnyMap(input.Metadata) {
		if createdPage.Metadata == nil {
			createdPage.Metadata = map[string]any{}
		}
		createdPage.Metadata[key] = value
	}
	createdPage.Data = cloneAnyMap(source.Data)
	if createdPage.Data == nil {
		createdPage.Data = map[string]any{}
	}
	if pathValue := strings.TrimSpace(toString(createdPage.Data["path"])); pathValue != "" {
		createdPage.Data["path"] = pathValue + "-" + input.Locale
	}
	created, err := s.CreatePage(ctx, createdPage)
	if err != nil {
		return nil, err
	}
	return &CMSContent{
		ID:              created.ID,
		Title:           created.Title,
		Slug:            created.Slug,
		Locale:          created.Locale,
		FamilyID:        created.FamilyID,
		ContentType:     "pages",
		ContentTypeSlug: "pages",
		Status:          created.Status,
		Data:            cloneAnyMap(created.Data),
		Metadata:        cloneAnyMap(created.Metadata),
	}, nil
}

func seedTranslationFamilyStore(store *translationservices.InMemoryFamilyStore, families ...translationservices.FamilyRecord) error {
	if store == nil {
		return nil
	}
	for _, family := range families {
		if err := store.SaveFamily(context.Background(), family); err != nil {
			return err
		}
	}
	return nil
}

func doTranslationFamilyJSONRequest(t *testing.T, app *fiber.App, method, target string, body map[string]any, headers map[string]string) (int, map[string]any) {
	t.Helper()
	var rawBody []byte
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request body: %v", err)
		}
		rawBody = encoded
	}
	req := httptest.NewRequest(method, target, bytes.NewReader(rawBody))
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer mustClose(t, "response body", resp.Body)
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response payload: %v", err)
	}
	return resp.StatusCode, payload
}

type translationAssignmentFailingRepository struct {
	base            TranslationAssignmentRepository
	failCreateReuse error
	failUpdate      error
}

func (r *translationAssignmentFailingRepository) List(ctx context.Context, opts ListOptions) ([]TranslationAssignment, int, error) {
	return r.base.List(ctx, opts)
}

func (r *translationAssignmentFailingRepository) Create(ctx context.Context, assignment TranslationAssignment) (TranslationAssignment, error) {
	return r.base.Create(ctx, assignment)
}

func (r *translationAssignmentFailingRepository) CreateOrReuseActive(ctx context.Context, assignment TranslationAssignment) (TranslationAssignment, bool, error) {
	if r.failCreateReuse != nil {
		return TranslationAssignment{}, false, r.failCreateReuse
	}
	return r.base.CreateOrReuseActive(ctx, assignment)
}

func (r *translationAssignmentFailingRepository) Get(ctx context.Context, id string) (TranslationAssignment, error) {
	return r.base.Get(ctx, id)
}

func (r *translationAssignmentFailingRepository) Update(ctx context.Context, assignment TranslationAssignment, expectedVersion int64) (TranslationAssignment, error) {
	if r.failUpdate != nil {
		return TranslationAssignment{}, r.failUpdate
	}
	return r.base.Update(ctx, assignment, expectedVersion)
}
