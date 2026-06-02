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
	adm := mustNewAdmin(t, translationFamilyScopedTestConfig(), Dependencies{
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
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/families?family_id=tg-page-1&content_type=pages&readiness_state=blocked&blocker_code=missing_locale&missing_locale=fr&tenant_id=tenant-1&org_id=org-1&channel=production", nil)
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
	report := extractMap(meta["report"])
	summary := extractMap(report["summary"])
	if got := toInt(summary["families"]); got != 3 {
		t.Fatalf("expected report families=3, got %d", got)
	}

	items := testAnySlice(t, data["items"], "data.items")
	if len(items) != 1 {
		t.Fatalf("expected one filtered family, got %d", len(items))
	}
	row := extractMap(items[0])
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

func TestTranslationFamilyListRowLabelsPolicyUnavailableWithoutChangingCode(t *testing.T) {
	row := translationFamilyListRow(translationservices.FamilyRecord{
		ID:             "family-policy-unavailable",
		ContentType:    "news",
		SourceLocale:   "en",
		ReadinessState: string(translationcore.FamilyReadinessBlocked),
		BlockerCodes:   []string{string(translationcore.FamilyBlockerPolicyDenied)},
		Blockers: []translationservices.FamilyBlocker{{
			FamilyID:    "family-policy-unavailable",
			BlockerCode: string(translationcore.FamilyBlockerPolicyDenied),
			Details: map[string]any{
				translationcore.FamilyBlockerDetailContentType: "news",
				translationcore.FamilyBlockerDetailEnvironment: "default",
				translationcore.FamilyBlockerDetailReason:      string(translationcore.FamilyBlockerReasonPolicyUnavailable),
			},
		}},
	})

	if codes := toStringSlice(row["blocker_codes"]); len(codes) != 1 || codes[0] != string(translationcore.FamilyBlockerPolicyDenied) {
		t.Fatalf("expected canonical policy_denied code, got %+v", codes)
	}
	labels, ok := row["blocker_labels"].(map[string]string)
	if !ok {
		t.Fatalf("expected blocker_labels map[string]string, got %#v", row["blocker_labels"])
	}
	if got := labels[string(translationcore.FamilyBlockerPolicyDenied)]; got != "Policy unavailable" {
		t.Fatalf("expected policy-unavailable label, got %q", got)
	}

	hostRow := translationFamilyListRow(translationservices.FamilyRecord{
		ID:             "family-host-policy",
		ContentType:    "news",
		SourceLocale:   "en",
		ReadinessState: string(translationcore.FamilyReadinessBlocked),
		BlockerCodes:   []string{string(translationcore.FamilyBlockerPolicyDenied)},
		Blockers: []translationservices.FamilyBlocker{{
			FamilyID:    "family-host-policy",
			BlockerCode: string(translationcore.FamilyBlockerPolicyDenied),
			Details: map[string]any{
				translationcore.FamilyBlockerDetailReason: "Legal hold",
			},
		}},
	})
	hostLabels, ok := hostRow["blocker_labels"].(map[string]string)
	if !ok {
		t.Fatalf("expected host blocker_labels map[string]string, got %#v", hostRow["blocker_labels"])
	}
	if got := hostLabels[string(translationcore.FamilyBlockerPolicyDenied)]; got != "Policy denied" {
		t.Fatalf("expected host policy denial label to remain policy denied, got %q", got)
	}
}

func TestTranslationFamilyPolicyResolverMarksHostPolicyDenials(t *testing.T) {
	expectedErr := errors.New("legal hold")
	adm := &Admin{
		translationPolicy: TranslationPolicyFunc(func(context.Context, TranslationPolicyInput) error {
			return expectedErr
		}),
	}
	resolver := translationFamilyPolicyResolver{admin: adm}
	blockers, err := resolver.ResolvePolicyBlockers(
		context.Background(),
		translationservices.FamilyRecord{
			ID:              "family-host-policy",
			ContentType:     "pages",
			SourceLocale:    "en",
			SourceVariantID: "variant-en",
			Variants: []translationservices.FamilyVariant{
				{ID: "variant-en", FamilyID: "family-host-policy", Locale: "en", SourceRecordID: "record-en", IsSource: true},
			},
		},
		translationservices.FamilyPolicy{ContentType: "pages", SourceLocale: "en", RequiredLocales: []string{"en"}},
		"production",
	)
	if err != nil {
		t.Fatalf("resolve policy blockers: %v", err)
	}
	if len(blockers) != 1 {
		t.Fatalf("expected one host policy blocker, got %+v", blockers)
	}
	details := blockers[0].Details
	if details["reason"] != "host_policy" {
		t.Fatalf("expected host_policy reason, got %+v", details)
	}
	if details["message"] != expectedErr.Error() {
		t.Fatalf("expected original policy error message, got %+v", details)
	}
}

func TestBunTranslationFamilyStoreListFamiliesQueryUsesLightweightProjectionRows(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	store := NewBunTranslationFamilyStore(db)
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	if err := store.SaveFamily(ctx, translationservices.FamilyRecord{
		ID:                         "family-lightweight-list",
		TenantID:                   "tenant-1",
		OrgID:                      "org-1",
		ContentType:                "pages",
		SourceLocale:               "en",
		SourceVariantID:            "family-lightweight-list::en",
		ReadinessState:             "blocked",
		MissingRequiredLocaleCount: 1,
		BlockerCodes:               []string{"missing_locale"},
		Variants: []translationservices.FamilyVariant{
			{
				ID:             "family-lightweight-list::en",
				FamilyID:       "family-lightweight-list",
				TenantID:       "tenant-1",
				OrgID:          "org-1",
				Locale:         "en",
				Status:         "published",
				IsSource:       true,
				SourceRecordID: "page-lightweight",
				Fields:         map[string]string{"title": "Lightweight Title"},
				CreatedAt:      now,
				UpdatedAt:      now,
			},
			{
				ID:        "family-lightweight-list::es",
				FamilyID:  "family-lightweight-list",
				TenantID:  "tenant-1",
				OrgID:     "org-1",
				Locale:    "es",
				Status:    "draft",
				CreatedAt: now,
				UpdatedAt: now,
			},
		},
		Blockers: []translationservices.FamilyBlocker{
			{FamilyID: "family-lightweight-list", TenantID: "tenant-1", OrgID: "org-1", BlockerCode: "missing_locale", Locale: "fr", Details: map[string]any{"reason": "missing"}},
		},
		CreatedAt: now,
		UpdatedAt: now,
	}); err != nil {
		t.Fatalf("seed family: %v", err)
	}
	if _, err := db.ExecContext(ctx, `UPDATE family_blockers SET details_json = '{malformed-json' WHERE family_id = ?`, "family-lightweight-list"); err != nil {
		t.Fatalf("poison blocker details: %v", err)
	}

	result, err := store.ListFamiliesQuery(ctx, translationservices.ListFamiliesInput{
		Scope:          translationservices.Scope{TenantID: "tenant-1", OrgID: "org-1"},
		ReadinessState: "blocked",
		MissingLocale:  "fr",
		Page:           1,
		PerPage:        10,
	})
	if err != nil {
		t.Fatalf("list families query: %v", err)
	}
	if result.Total != 1 || len(result.Items) != 1 {
		t.Fatalf("expected one family row, total=%d items=%+v", result.Total, result.Items)
	}
	row := translationFamilyListRow(result.Items[0])
	if got := toString(row["source_record_id"]); got != "page-lightweight" {
		t.Fatalf("expected source_record_id page-lightweight, got %q", got)
	}
	if got := toString(row["source_title"]); got != "Lightweight Title" {
		t.Fatalf("expected source title from projected source fields, got %q", got)
	}
	if got := toStringSlice(row["available_locales"]); len(got) != 2 || got[0] != "en" || got[1] != "es" {
		t.Fatalf("expected available locales [en es], got %+v", got)
	}
	if got := toStringSlice(row["missing_locales"]); len(got) != 1 || got[0] != "fr" {
		t.Fatalf("expected missing locale [fr], got %+v", got)
	}
	quickCreate := extractMap(row["quick_create"])
	if got := toStringSlice(quickCreate["missing_locales"]); len(got) != 1 || got[0] != "fr" {
		t.Fatalf("expected quick_create missing locale [fr], got %+v", got)
	}
}

func TestTranslationFamilyBindingDetailReturnsSourceAssignmentsAndPublishGate(t *testing.T) {
	adm := mustNewAdmin(t, translationFamilyScopedTestConfig(), Dependencies{
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
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/families/tg-page-1?tenant_id=tenant-1&org_id=org-1&channel=production", nil)
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
		t.Fatalf("decode response: %v", err)
	}
	data := extractMap(payload["data"])
	if got := toString(data["family_id"]); got != "tg-page-1" {
		t.Fatalf("expected family_id tg-page-1, got %q", got)
	}
	source := extractMap(data["source_variant"])
	if got := toString(source["locale"]); got != "en" {
		t.Fatalf("expected source locale en, got %q", got)
	}
	if got := toString(source["source_record_id"]); got != "page-1" {
		t.Fatalf("expected source_record_id page-1, got %q", got)
	}

	blockers := testAnySlice(t, data["blockers"], "data.blockers")
	if len(blockers) != 2 {
		t.Fatalf("expected 2 blockers, got %d", len(blockers))
	}
	firstBlocker := extractMap(blockers[0])
	secondBlocker := extractMap(blockers[1])
	if got := toString(firstBlocker["blocker_code"]); got != "missing_locale" {
		t.Fatalf("expected first blocker missing_locale, got %q", got)
	}
	if got := toString(secondBlocker["blocker_code"]); got != "pending_review" {
		t.Fatalf("expected second blocker pending_review, got %q", got)
	}

	assignments := testAnySlice(t, data["active_assignments"], "data.active_assignments")
	if len(assignments) != 1 {
		t.Fatalf("expected one active assignment, got %d", len(assignments))
	}
	assignment := extractMap(assignments[0])
	if got := toString(assignment["target_locale"]); got != "es" {
		t.Fatalf("expected active assignment target es, got %q", got)
	}
	if got := toString(assignment["status"]); got != string(translationcore.AssignmentStatusInProgress) {
		t.Fatalf("expected active assignment in_progress, got %q", got)
	}

	summary := extractMap(data["readiness_summary"])
	if got := toString(summary["state"]); got != string(translationcore.FamilyReadinessBlocked) {
		t.Fatalf("expected blocked readiness summary, got %q", got)
	}
	if got := toInt(summary["pending_review_count"]); got != 1 {
		t.Fatalf("expected pending_review_count=1, got %d", got)
	}
	if got := toInt(summary["missing_required_locale_count"]); got != 1 {
		t.Fatalf("expected missing_required_locale_count=1, got %d", got)
	}

	publishGate := extractMap(data["publish_gate"])
	if testBool(t, publishGate["allowed"], "publish_gate.allowed") {
		t.Fatalf("expected publish gate blocked")
	}
	if !testBool(t, publishGate["override_allowed"], "publish_gate.override_allowed") {
		t.Fatalf("expected publish override allowed")
	}
	if !testBool(t, publishGate["review_required"], "publish_gate.review_required") {
		t.Fatalf("expected review_required=true")
	}
	quickCreate := extractMap(data["quick_create"])
	if quickCreate == nil {
		t.Fatalf("expected quick_create payload, got %#v", data["quick_create"])
	}
	if got := toStringSlice(quickCreate["missing_locales"]); len(got) != 1 || got[0] != "fr" {
		t.Fatalf("expected quick_create missing_locales [fr], got %+v", got)
	}
	defaultAssignment := extractMap(quickCreate["default_assignment"])
	if got := toString(defaultAssignment["work_scope"]); got != "localization" {
		t.Fatalf("expected quick_create default assignment work_scope localization, got %q", got)
	}
}

func TestTranslationFamilyBindingDetailNotFoundIncludesSyncRecoveryForAuthorizedUser(t *testing.T) {
	adm := mustNewAdmin(t, translationFamilyScopedTestConfig(), Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView: true,
			PermAdminTranslationsSync: true,
		},
	})
	binding := newTranslationFamilyBinding(adm)
	runtime := newTranslationFamilyBindingTestRuntime(t)
	binding.loadRuntime = func(context.Context, string) (*translationFamilyRuntime, error) {
		return runtime, nil
	}

	app := newTranslationFamilyTestApp(t, binding)
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/families/missing-family?tenant_id=tenant-1&org_id=org-1&channel=production", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			t.Fatalf("close response body: %v", closeErr)
		}
	}()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status=%d want=404", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	errPayload := extractMap(payload["error"])
	metadata := extractMap(errPayload["metadata"])
	recovery := extractMap(metadata["sync_recovery"])
	if !testBool(t, recovery["can_sync"], "sync_recovery.can_sync") {
		t.Fatalf("expected sync recovery can_sync=true, got %+v", recovery)
	}
	if !testBool(t, recovery["syncable"], "sync_recovery.syncable") {
		t.Fatalf("expected sync recovery syncable=true, got %+v", recovery)
	}
	if got := toString(recovery["permission"]); got != PermAdminTranslationsSync {
		t.Fatalf("expected sync permission %q, got %q", PermAdminTranslationsSync, got)
	}
	if got := toString(recovery["command_name"]); got != "translation.families.sync" {
		t.Fatalf("expected sync command name, got %q", got)
	}
	if got := toString(recovery["rpc_invoke_path"]); got != "/admin/api/rpc" {
		t.Fatalf("expected rpc invoke path /admin/api/rpc, got %q", got)
	}
	if got := toString(recovery["environment"]); got != "production" {
		t.Fatalf("expected production environment, got %q", got)
	}
	if got := toString(recovery["family_id"]); got != "missing-family" {
		t.Fatalf("expected family id missing-family, got %q", got)
	}
}

func TestTranslationFamilyBindingDetailNotFoundOmitsSyncRecoveryWithoutPermission(t *testing.T) {
	adm := mustNewAdmin(t, translationFamilyScopedTestConfig(), Dependencies{
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
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/families/missing-family?tenant_id=tenant-1&org_id=org-1&channel=production", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			t.Fatalf("close response body: %v", closeErr)
		}
	}()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status=%d want=404", resp.StatusCode)
	}

	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	errPayload := extractMap(payload["error"])
	metadata := extractMap(errPayload["metadata"])
	if _, ok := metadata["sync_recovery"]; ok {
		t.Fatalf("expected sync recovery omitted without permission, got %+v", metadata["sync_recovery"])
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
	if testBool(t, meta["idempotency_hit"], "meta.idempotency_hit") {
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
	if testBool(t, quickCreate["enabled"], "quick_create.enabled") {
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
		if !testBool(t, meta["idempotency_hit"], "meta.idempotency_hit") {
			t.Fatalf("expected idempotency replay to set meta.idempotency_hit=true, got %+v", meta)
		}
	}

	detailStatus, detailPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/families/tg-page-1?channel=production&tenant_id=tenant-1&org_id=org-1", nil, nil)
	if detailStatus != http.StatusOK {
		t.Fatalf("detail status=%d payload=%+v", detailStatus, detailPayload)
	}
	variants := testAnySlice(t, extractMap(detailPayload["data"])["locale_variants"], "data.locale_variants")
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
	if !testBool(t, extractMap(secondPayload["meta"])["idempotency_hit"], "meta.idempotency_hit") {
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
	variants := testAnySlice(t, extractMap(detailPayload["data"])["locale_variants"], "data.locale_variants")
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
	variants := testAnySlice(t, extractMap(detailPayload["data"])["locale_variants"], "data.locale_variants")
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

func TestTranslationFamilyBindingCreateVariantRollsBackVariantWhenPreAssignmentSyncFails(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})
	fixture.admin.translationFamilyStore = &translationFamilyFailingStore{
		base:     fixture.admin.translationFamilyStore,
		saveErr:  errors.New("sync failed"),
		failSave: true,
	}

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale":                 "fr",
		"auto_create_assignment": true,
	}, nil)
	if status != http.StatusInternalServerError {
		t.Fatalf("expected sync failure, got status=%d payload=%+v", status, payload)
	}

	pages, err := fixture.content.Pages(context.Background(), "fr")
	if err != nil {
		t.Fatalf("list fr pages: %v", err)
	}
	for _, page := range pages {
		if strings.EqualFold(page.FamilyID, "tg-page-1") {
			t.Fatalf("expected created fr variant rollback after sync failure, got page %+v", page)
		}
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

func testAnySlice(t *testing.T, value any, label string) []any {
	t.Helper()
	items, ok := value.([]any)
	if !ok {
		t.Fatalf("expected %s to be []any, got %T", label, value)
	}
	return items
}

func testBool(t *testing.T, value any, label string) bool {
	t.Helper()
	typed, ok := value.(bool)
	if !ok {
		t.Fatalf("expected %s to be bool, got %T", label, value)
	}
	return typed
}

type translationFamilyMutationFixtureOptions struct {
	RequiredLocales      []string
	ReviewRequired       bool
	LifecycleMode        string
	Assignments          []TranslationAssignment
	DisablePolicy        bool
	OmitDefaultWorkScope bool
	Repo                 TranslationAssignmentRepository
	FamilyStore          translationservices.FamilyStore
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

	adm := mustNewAdmin(t, translationFamilyScopedTestConfig(), Dependencies{
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
	familyStore := options.FamilyStore
	if familyStore == nil {
		familyStore = translationservices.NewInMemoryFamilyStore()
	}
	adm.WithTranslationFamilyStore(familyStore)
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

func translationFamilyScopedTestConfig() Config {
	return Config{
		BasePath:        "/admin",
		DefaultLocale:   "en",
		ScopeMode:       "single",
		DefaultTenantID: "tenant-1",
		DefaultOrgID:    "org-1",
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
	req := httptest.NewRequestWithContext(context.Background(), method, target, bytes.NewReader(rawBody))
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
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			t.Fatalf("close response body: %v", closeErr)
		}
	}()
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

type translationFamilyFailingStore struct {
	base     translationservices.FamilyStore
	saveErr  error
	failSave bool
}

func (s *translationFamilyFailingStore) Families(ctx context.Context) ([]translationservices.FamilyRecord, error) {
	return s.base.Families(ctx)
}

func (s *translationFamilyFailingStore) Family(ctx context.Context, id string) (translationservices.FamilyRecord, bool, error) {
	return s.base.Family(ctx, id)
}

func (s *translationFamilyFailingStore) SaveFamily(ctx context.Context, family translationservices.FamilyRecord) error {
	if s.failSave {
		return s.saveErr
	}
	return s.base.SaveFamily(ctx, family)
}
