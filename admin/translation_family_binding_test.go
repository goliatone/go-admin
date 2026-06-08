package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	neturl "net/url"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
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

	mixedRow := translationFamilyListRow(translationservices.FamilyRecord{
		ID:             "family-mixed-policy",
		ContentType:    "news",
		SourceLocale:   "en",
		ReadinessState: string(translationcore.FamilyReadinessBlocked),
		BlockerCodes:   []string{string(translationcore.FamilyBlockerPolicyDenied)},
		Blockers: []translationservices.FamilyBlocker{
			{
				FamilyID:    "family-mixed-policy",
				BlockerCode: string(translationcore.FamilyBlockerPolicyDenied),
				Details: map[string]any{
					translationcore.FamilyBlockerDetailContentType: "news",
					translationcore.FamilyBlockerDetailEnvironment: "default",
					translationcore.FamilyBlockerDetailReason:      string(translationcore.FamilyBlockerReasonPolicyUnavailable),
				},
			},
			{
				FamilyID:    "family-mixed-policy",
				BlockerCode: string(translationcore.FamilyBlockerPolicyDenied),
				Details: map[string]any{
					translationcore.FamilyBlockerDetailReason: string(translationcore.FamilyBlockerReasonHostPolicy),
				},
			},
		},
	})
	mixedLabels, ok := mixedRow["blocker_labels"].(map[string]string)
	if !ok {
		t.Fatalf("expected mixed blocker_labels map[string]string, got %#v", mixedRow["blocker_labels"])
	}
	if got := mixedLabels[string(translationcore.FamilyBlockerPolicyDenied)]; got != "Policy denied" {
		t.Fatalf("expected mixed canonical policy_denied label to remain host-policy label, got %q", got)
	}
	if got := mixedLabels[string(translationcore.FamilyBlockerReasonPolicyUnavailable)]; got != "Policy unavailable" {
		t.Fatalf("expected mixed row to expose policy_unavailable label, got %q", got)
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

func TestTranslationFamilyPolicyResolverIgnoresSourceLookupNotFound(t *testing.T) {
	adm := &Admin{
		translationPolicy: TranslationPolicyFunc(func(context.Context, TranslationPolicyInput) error {
			return ErrNotFound
		}),
	}
	resolver := translationFamilyPolicyResolver{admin: adm}
	blockers, err := resolver.ResolvePolicyBlockers(
		context.Background(),
		translationservices.FamilyRecord{
			ID:              "family-ready-projection",
			ContentType:     "pages",
			SourceLocale:    "en",
			SourceVariantID: "family-ready-projection::en",
			Variants: []translationservices.FamilyVariant{
				{ID: "family-ready-projection::en", FamilyID: "family-ready-projection", Locale: "en", SourceRecordID: "family-ready-projection", IsSource: true},
				{ID: "family-ready-projection::es", FamilyID: "family-ready-projection", Locale: "es", SourceRecordID: "family-ready-projection"},
			},
		},
		translationservices.FamilyPolicy{ContentType: "pages", SourceLocale: "en", RequiredLocales: []string{"en", "es"}},
		"default",
	)
	if err != nil {
		t.Fatalf("resolve policy blockers: %v", err)
	}
	if len(blockers) != 0 {
		t.Fatalf("expected source lookup not-found to be non-blocking, got %+v", blockers)
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
	assignmentLinks := extractMap(assignment["links"])
	editorLink := extractMap(assignmentLinks["editor"])
	if got := toString(editorLink["href"]); got != "/admin/translations/assignments/asg-open-es/edit" {
		t.Fatalf("expected active assignment editor href, got %q", got)
	}
	if got := toString(editorLink["label"]); got != "Open editor" {
		t.Fatalf("expected active assignment editor label, got %q", got)
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
	if got := toString(assignment["assigned_at"]); got == "" {
		t.Fatalf("expected auto-created assignment assigned_at, got %+v", assignment)
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

func TestTranslationFamilyBindingCreateVariantAssignmentPersistsScopedVariantID(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	now := time.Date(2026, 6, 7, 20, 0, 0, 0, time.UTC)
	store := NewBunTranslationFamilyStore(db)
	family := translationservices.FamilyRecord{
		ID:              "family-create-locale-scope",
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "page-source::en",
		ReadinessState:  "blocked",
		Variants: []translationservices.FamilyVariant{
			{
				ID:             "page-source::en",
				FamilyID:       "family-create-locale-scope",
				TenantID:       "tenant-1",
				OrgID:          "org-1",
				Locale:         "en",
				Status:         string(translationcore.VariantStatusPublished),
				IsSource:       true,
				SourceRecordID: "page-source",
				Fields:         map[string]string{"title": "Source page", "path": "/source"},
				CreatedAt:      now,
				UpdatedAt:      now,
			},
			{
				ID:             "page-target-es::es",
				FamilyID:       "family-create-locale-scope",
				TenantID:       "tenant-1",
				OrgID:          "org-1",
				Locale:         "es",
				Status:         string(translationcore.VariantStatusDraft),
				SourceRecordID: "page-target-es",
				Fields:         map[string]string{"title": "Target page", "path": "/source-es"},
				CreatedAt:      now,
				UpdatedAt:      now,
			},
		},
	}
	if err := store.SaveFamily(ctx, family); err != nil {
		t.Fatalf("seed family: %v", err)
	}

	repo := NewBunTranslationAssignmentRepository(db)
	binding := &translationFamilyBinding{}
	created, inserted, err := binding.createVariantAssignment(ctx, repo, family, translationFamilyCreateVariantInput{
		Locale:     "es",
		AssigneeID: "translator-1",
		Priority:   PriorityHigh,
	}, translationFamilyCreateVariantAssignmentPlan{
		WorkScope: translationcore.DefaultWorkScope,
	}, &CMSContent{
		ID:              "page-target-es",
		ContentType:     "pages",
		ContentTypeSlug: "pages",
		Locale:          "es",
	})
	if err != nil {
		t.Fatalf("create scoped assignment: %v", err)
	}
	if !inserted {
		t.Fatalf("expected assignment insert")
	}
	if created.TenantID != "tenant-1" || created.OrgID != "org-1" {
		t.Fatalf("expected scoped assignment, got %+v", created)
	}
	if created.VariantID != "page-target-es::es" {
		t.Fatalf("expected canonical locale variant id, got %+v", created)
	}
	if created.TargetRecordID != "page-target-es" {
		t.Fatalf("expected target record id preserved, got %+v", created)
	}
}

func TestTranslationFamilyBindingCreateVariantAssignmentRejectsMissingVariantLink(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	ctx := context.Background()
	now := time.Date(2026, 6, 7, 20, 0, 0, 0, time.UTC)
	store := NewBunTranslationFamilyStore(db)
	family := translationservices.FamilyRecord{
		ID:              "family-create-locale-missing-link",
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "page-source::en",
		Variants: []translationservices.FamilyVariant{
			{
				ID:             "page-source::en",
				FamilyID:       "family-create-locale-missing-link",
				TenantID:       "tenant-1",
				OrgID:          "org-1",
				Locale:         "en",
				Status:         string(translationcore.VariantStatusPublished),
				IsSource:       true,
				SourceRecordID: "page-source",
				Fields:         map[string]string{"title": "Source page", "path": "/source"},
				CreatedAt:      now,
				UpdatedAt:      now,
			},
		},
	}
	if err := store.SaveFamily(ctx, family); err != nil {
		t.Fatalf("seed family: %v", err)
	}

	repo := NewBunTranslationAssignmentRepository(db)
	binding := &translationFamilyBinding{}
	_, _, err := binding.createVariantAssignment(ctx, repo, family, translationFamilyCreateVariantInput{
		Locale:     "es",
		AssigneeID: "translator-1",
		Priority:   PriorityHigh,
	}, translationFamilyCreateVariantAssignmentPlan{
		WorkScope: translationcore.DefaultWorkScope,
	}, &CMSContent{
		ID:              "page-target-es",
		ContentType:     "pages",
		ContentTypeSlug: "pages",
		Locale:          "es",
	})
	if err == nil {
		t.Fatalf("expected missing variant link error")
	}
	var domainErr *goerrors.Error
	if !errors.As(err, &domainErr) {
		t.Fatalf("expected domain error, got %T %v", err, err)
	}
	if got := toString(domainErr.Metadata["reason_code"]); got != "missing_locale_variant" {
		t.Fatalf("expected missing_locale_variant reason, got %q", got)
	}
}

func TestTranslationFamilyBindingReuseCreateVariantAssignmentRelinksScopedVariant(t *testing.T) {
	ctx := context.Background()
	family := translationservices.FamilyRecord{
		ID:              "family-reuse-create-locale",
		TenantID:        "tenant-1",
		OrgID:           "org-1",
		ContentType:     "pages",
		SourceLocale:    "",
		SourceVariantID: "page-source::en",
		Policy:          translationservices.FamilyPolicy{SourceLocale: "en"},
		Variants: []translationservices.FamilyVariant{
			{
				ID:             "page-source::en",
				FamilyID:       "family-reuse-create-locale",
				TenantID:       "tenant-1",
				OrgID:          "org-1",
				Locale:         "en",
				Status:         string(translationcore.VariantStatusPublished),
				IsSource:       true,
				SourceRecordID: "page-source",
				Fields:         map[string]string{"title": "Source page", "path": "/source"},
			},
		},
	}
	existing := TranslationAssignment{
		ID:           "assignment-existing",
		FamilyID:     "family-reuse-create-locale",
		TargetLocale: "es",
		WorkScope:    translationcore.DefaultWorkScope,
		Status:       AssignmentStatusOpen,
		Version:      7,
	}
	repo := &translationFamilyAssignmentUpdateRepo{
		update: func(_ context.Context, assignment TranslationAssignment, expectedVersion int64) (TranslationAssignment, error) {
			if expectedVersion != 7 {
				t.Fatalf("expected version 7, got %d", expectedVersion)
			}
			if assignment.TenantID != "tenant-1" || assignment.OrgID != "org-1" {
				t.Fatalf("expected family scope on reused assignment, got %+v", assignment)
			}
			if assignment.SourceLocale != "en" {
				t.Fatalf("expected canonical source locale en, got %+v", assignment)
			}
			if assignment.TargetRecordID != "page-target-es" {
				t.Fatalf("expected target record link, got %+v", assignment)
			}
			assignment.VariantID = "page-target-es::es"
			return assignment, nil
		},
	}
	binding := &translationFamilyBinding{}
	reused, err := binding.reuseCreateVariantAssignment(ctx, repo, family, translationFamilyCreateVariantInput{
		Locale:     "es",
		AssigneeID: "translator-1",
		Priority:   PriorityHigh,
	}, translationFamilyCreateVariantAssignmentPlan{
		WorkScope:       translationcore.DefaultWorkScope,
		ReuseAssignment: &existing,
	}, &CMSContent{ID: "page-target-es", Locale: "es"})
	if err != nil {
		t.Fatalf("reuse assignment: %v", err)
	}
	if reused.VariantID != "page-target-es::es" {
		t.Fatalf("expected linked variant id, got %+v", reused)
	}
	if repo.updateCalls != 1 {
		t.Fatalf("expected one update call, got %d", repo.updateCalls)
	}
}

func TestTranslationFamilyBindingCreateVariantAutoAssignmentPersistsScopeThroughHTTP(t *testing.T) {
	db := newTranslationFamilyStoreSQLiteDB(t)
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
		ReviewRequired:  true,
		LifecycleMode:   string(translationcore.AssignmentLifecycleSingleActivePerLang),
		FamilyStore:     NewBunTranslationFamilyStore(db),
		Repo:            NewBunTranslationAssignmentRepository(db),
	})

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale":                 "fr",
		"auto_create_assignment": true,
		"assignee_id":            "translator-9",
		"priority":               "high",
	}, map[string]string{
		"X-User-ID": "assigner-1",
	})
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	assignments, _, err := fixture.repo.List(context.Background(), ListOptions{
		Page:    1,
		PerPage: 20,
		Filters: map[string]any{
			ScopeTenantIDKey: "tenant-1",
			ScopeOrgIDKey:    "org-1",
			"family_id":      "tg-page-1",
			"target_locale":  "fr",
		},
	})
	if err != nil {
		t.Fatalf("list assignments: %v", err)
	}
	if len(assignments) != 1 {
		t.Fatalf("expected one scoped auto-created assignment, got %+v", assignments)
	}
	assignment := assignments[0]
	if assignment.TenantID != "tenant-1" || assignment.OrgID != "org-1" {
		t.Fatalf("expected scoped assignment, got %+v", assignment)
	}
	if assignment.VariantID == "" {
		t.Fatalf("expected canonical variant_id, got %+v", assignment)
	}
	if assignment.TargetRecordID == "" {
		t.Fatalf("expected target_record_id, got %+v", assignment)
	}
}

func TestTranslationFamilyBindingCreateVariantAllowsDefaultAssignmentFieldsWhenAutoAssignDisabled(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale":   "fr",
		"priority": "normal",
	}, map[string]string{"X-User-ID": "assigner-1"})
	if status != http.StatusOK {
		t.Fatalf("expected create locale success, got status=%d payload=%+v", status, payload)
	}
	data := extractMap(payload["data"])
	if assignment := extractMap(data["assignment"]); len(assignment) > 0 {
		t.Fatalf("did not expect assignment when auto_create_assignment=false, got %+v", assignment)
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
	if len(assignments) != 0 {
		t.Fatalf("expected no seeded assignments, got %+v", assignments)
	}
}

type translationFamilyAssignmentUpdateRepo struct {
	update      func(context.Context, TranslationAssignment, int64) (TranslationAssignment, error)
	updateCalls int
}

func (repo *translationFamilyAssignmentUpdateRepo) List(context.Context, ListOptions) ([]TranslationAssignment, int, error) {
	return nil, 0, nil
}

func (repo *translationFamilyAssignmentUpdateRepo) Create(context.Context, TranslationAssignment) (TranslationAssignment, error) {
	return TranslationAssignment{}, errors.New("unexpected create")
}

func (repo *translationFamilyAssignmentUpdateRepo) CreateOrReuseActive(context.Context, TranslationAssignment) (TranslationAssignment, bool, error) {
	return TranslationAssignment{}, false, errors.New("unexpected create-or-reuse")
}

func (repo *translationFamilyAssignmentUpdateRepo) Get(context.Context, string) (TranslationAssignment, error) {
	return TranslationAssignment{}, errors.New("unexpected get")
}

func (repo *translationFamilyAssignmentUpdateRepo) Update(ctx context.Context, assignment TranslationAssignment, expectedVersion int64) (TranslationAssignment, error) {
	repo.updateCalls++
	if repo.update != nil {
		return repo.update(ctx, assignment, expectedVersion)
	}
	return assignment, nil
}

func TestTranslationFamilyBindingCreateVariantRejectsSourceLocaleAutoAssignment(t *testing.T) {
	store := translationservices.NewInMemoryFamilyStore()
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"en", "fr"},
		FamilyStore:     store,
	})
	ctx := context.Background()
	family, ok, err := store.Family(ctx, "tg-page-1")
	if err != nil || !ok {
		t.Fatalf("load fixture family ok=%v err=%v", ok, err)
	}
	family.SourceLocale = "fr"
	family.SourceVariantID = "page-1-fr"
	family.Variants = []translationservices.FamilyVariant{{
		ID:             "page-1-fr",
		FamilyID:       "tg-page-1",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		Locale:         "fr",
		Status:         string(translationcore.VariantStatusDraft),
		IsSource:       true,
		SourceRecordID: "page-1-fr",
		Fields:         map[string]string{"title": "Page 1 FR", "body": "Bonjour"},
		CreatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
		UpdatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
	}}
	if err := store.SaveFamily(ctx, family); err != nil {
		t.Fatalf("save malformed family: %v", err)
	}

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale":                 "en",
		"auto_create_assignment": true,
	}, map[string]string{"X-User-ID": "assigner-1"})
	if status != http.StatusBadRequest {
		t.Fatalf("expected source-locale auto assignment rejection, got status=%d payload=%+v", status, payload)
	}
	metadata := extractMap(extractMap(payload["error"])["metadata"])
	if got := toString(metadata["reason_code"]); got != ActionDisabledReasonCodeInvalidStatus {
		t.Fatalf("expected invalid status reason, got %q payload=%+v", got, payload)
	}
	if got := toString(metadata["source_locale"]); got != "en" {
		t.Fatalf("expected source_locale en metadata, got %q", got)
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

func TestTranslationFamilyBindingCreateVariantAllowsMissingLocaleWhenHostPolicyDeniedEndToEnd(t *testing.T) {
	options := translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	}
	fixture := newTranslationFamilyMutationFixture(t, options)
	fixture.admin.WithTranslationPolicy(hostPolicyDeniedByEntityStub{
		readinessPolicyByEntityStub: readinessPolicyByEntityStub{
			requirements: fixtureTranslationRequirementsByEntity(options),
		},
	})
	syncTranslationFamilyFixtureStore(t, fixture.admin, "production")

	detailStatus, detailPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/families/tg-page-1?channel=production&tenant_id=tenant-1&org_id=org-1", nil, nil)
	if detailStatus != http.StatusOK {
		t.Fatalf("detail status=%d payload=%+v", detailStatus, detailPayload)
	}
	detail := extractMap(detailPayload["data"])
	quickCreate := extractMap(detail["quick_create"])
	if enabled := testBool(t, quickCreate["enabled"], "quick_create.enabled"); !enabled {
		t.Fatalf("expected quick_create enabled for host-policy-denied missing locale, got %+v", quickCreate)
	}
	if got := toStringSlice(quickCreate["missing_locales"]); len(got) != 1 || got[0] != "fr" {
		t.Fatalf("expected missing locale fr before create, got %+v", got)
	}
	if got := toStringSlice(extractMap(detail["readiness_summary"])["blocker_codes"]); !slices.Contains(got, string(translationcore.FamilyBlockerPolicyDenied)) {
		t.Fatalf("expected policy_denied blocker before create, got %+v", got)
	}

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale": "fr",
	}, nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	data := extractMap(payload["data"])
	if got := toString(data["locale"]); got != "fr" {
		t.Fatalf("expected created locale fr, got %q", got)
	}
	familyMeta := extractMap(extractMap(payload["meta"])["family"])
	if got := toStringSlice(familyMeta["blocker_codes"]); len(got) != 1 || got[0] != string(translationcore.FamilyBlockerPolicyDenied) {
		t.Fatalf("expected family to remain blocked only by policy_denied, got %+v", got)
	}
}

func TestTranslationFamilyBindingCreateVariantAllowsMissingLocaleWhenHostPolicyDenied(t *testing.T) {
	binding := &translationFamilyBinding{}
	family := translationservices.FamilyRecord{
		ID:          "family-policy-denied",
		ContentType: "pages",
		Blockers: []translationservices.FamilyBlocker{
			{
				BlockerCode: string(translationcore.FamilyBlockerPolicyDenied),
				Locale:      "es",
				Details: map[string]any{
					translationcore.FamilyBlockerDetailReason: string(translationcore.FamilyBlockerReasonHostPolicy),
				},
			},
			{
				BlockerCode: string(translationcore.FamilyBlockerMissingLocale),
				Locale:      "es",
			},
		},
	}
	request := translationFamilyCreateVariantRequest{
		AdminCtx: AdminContext{Context: context.Background()},
		Input:    translationFamilyCreateVariantInput{Locale: "es", Environment: "default"},
	}

	if err := binding.ensureCreateVariantAllowed(request, family); err != nil {
		t.Fatalf("expected missing locale create to be allowed despite host policy denial, got %v", err)
	}

	missingLocales := translationFamilyQuickCreateLocales(family)
	enabled, reasonCode, reason := translationFamilyQuickCreateAvailability(family, missingLocales)
	if !enabled || reasonCode != "" || reason != "" {
		t.Fatalf("expected quick create enabled for missing locale with host policy denial, got enabled=%v code=%q reason=%q", enabled, reasonCode, reason)
	}
}

func TestTranslationFamilyBindingCreateVariantStillBlocksMissingLocaleWhenPolicyUnavailable(t *testing.T) {
	binding := &translationFamilyBinding{}
	family := translationservices.FamilyRecord{
		ID:          "family-policy-unavailable",
		ContentType: "pages",
		Blockers: []translationservices.FamilyBlocker{
			{
				BlockerCode: string(translationcore.FamilyBlockerPolicyDenied),
				Locale:      "es",
				Details: map[string]any{
					translationcore.FamilyBlockerDetailReason: string(translationcore.FamilyBlockerReasonPolicyUnavailable),
				},
			},
			{
				BlockerCode: string(translationcore.FamilyBlockerMissingLocale),
				Locale:      "es",
			},
		},
	}
	request := translationFamilyCreateVariantRequest{
		AdminCtx: AdminContext{Context: context.Background()},
		Input:    translationFamilyCreateVariantInput{Locale: "es", Environment: "default"},
	}

	if err := binding.ensureCreateVariantAllowed(request, family); err == nil {
		t.Fatalf("expected policy unavailable family to block missing locale create")
	}

	missingLocales := translationFamilyQuickCreateLocales(family)
	enabled, reasonCode, _ := translationFamilyQuickCreateAvailability(family, missingLocales)
	if enabled || reasonCode != "policy_denied" {
		t.Fatalf("expected quick create disabled for policy unavailable, got enabled=%v code=%q", enabled, reasonCode)
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

func TestTranslationFamilyBindingCreateAssignmentToActorReturnsAssigned(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})
	createVariantStatus, createVariantPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale": "fr",
	}, nil)
	if createVariantStatus != http.StatusOK {
		t.Fatalf("create variant status=%d payload=%+v", createVariantStatus, createVariantPayload)
	}

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"target_locale": "fr",
		"assignee_id":   "translator-1",
		"priority":      "high",
		"work_scope":    "localization",
	}, map[string]string{"X-User-ID": "assigner-1"})
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	assignment := extractMap(extractMap(payload["data"])["assignment"])
	if got := toString(assignment["queue_state"]); got != string(AssignmentStatusAssigned) {
		t.Fatalf("expected assigned queue_state, got %q payload=%+v", got, assignment)
	}
	if got := toString(assignment["assignee_id"]); got != "translator-1" {
		t.Fatalf("expected assignee translator-1, got %q", got)
	}
	if got := toString(assignment["target_record_id"]); got == "" {
		t.Fatalf("expected target_record_id from locale variant, got empty")
	}
	if got := toString(assignment["assigned_at"]); got == "" {
		t.Fatalf("expected family assignment assigned_at, got %+v", assignment)
	}
	if got := toString(assignment["content_state"]); got == string(AssignmentStatusInProgress) {
		t.Fatalf("expected create assignment not to start work, got content_state=%q", got)
	}
}

func TestTranslationFamilyBindingCreateAssignmentJSONSkipsFragmentRefresh(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})
	seedTranslationFamilyLocaleVariant(t, fixture, "fr")

	binding := newTranslationFamilyBinding(fixture.admin)
	binding.now = func() time.Time { return time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC) }
	runtime, err := binding.runtime(context.Background(), "production")
	if err != nil {
		t.Fatalf("load runtime: %v", err)
	}
	loads := 0
	binding.loadRuntime = func(context.Context, string) (*translationFamilyRuntime, error) {
		loads++
		if loads > 1 {
			return nil, errors.New("detail refresh should not run for JSON requests")
		}
		return runtime, nil
	}
	app := newTranslationFamilyTestApp(t, binding)

	status, payload := doTranslationFamilyJSONRequest(t, app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"target_locale": "fr",
		"assignee_id":   "translator-1",
		"work_scope":    "localization",
	}, map[string]string{"X-User-ID": "assigner-1"})
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	if loads != 1 {
		t.Fatalf("expected one runtime load for JSON mutation, got %d", loads)
	}
	if got := toString(extractMap(extractMap(payload["data"])["assignment"])["assignee_id"]); got != "translator-1" {
		t.Fatalf("expected JSON assignment payload, got assignee %q payload=%+v", got, payload)
	}
}

func TestTranslationFamilyAssignCommandExecutesWithoutRouterContext(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})
	if _, err := fixture.content.CreatePage(context.Background(), CMSPage{
		ID:       "page-1-fr",
		Title:    "Page 1 FR",
		Slug:     "page-1-fr",
		Locale:   "fr",
		FamilyID: "tg-page-1",
		Status:   "draft",
		Data: map[string]any{
			"path": "/fr/page-1",
			"body": "Bonjour",
		},
		Metadata: map[string]any{
			"tenant_id": "tenant-1",
			"org_id":    "org-1",
		},
	}); err != nil {
		t.Fatalf("seed fr page: %v", err)
	}
	syncTranslationFamilyFixtureStore(t, fixture.admin, "production")

	binding := newTranslationFamilyBinding(fixture.admin)
	var result TranslationFamilyAssignResult
	cmd := &TranslationFamilyAssignCommand{Binding: binding}
	err := cmd.Execute(context.Background(), TranslationFamilyAssignInput{
		FamilyID:     "tg-page-1",
		Scope:        translationservices.Scope{TenantID: "tenant-1", OrgID: "org-1"},
		ActorID:      "assigner-1",
		TargetLocale: "fr",
		AssigneeID:   "translator-command",
		Priority:     PriorityHigh,
		PrioritySet:  true,
		WorkScope:    "localization",
		Channel:      "production",
		Result:       &result,
	})
	if err != nil {
		t.Fatalf("execute command: %v", err)
	}
	if result.Family.ID != "tg-page-1" {
		t.Fatalf("expected command to load family tg-page-1, got %q", result.Family.ID)
	}
	if result.Assignment.ID == "" {
		t.Fatalf("expected command assignment id")
	}
	if result.Assignment.AssigneeID != "translator-command" {
		t.Fatalf("expected command assignee translator-command, got %q", result.Assignment.AssigneeID)
	}
	if result.Assignment.Priority != PriorityHigh {
		t.Fatalf("expected command priority high, got %q", result.Assignment.Priority)
	}
	if result.Assignment.TargetRecordID == "" {
		t.Fatalf("expected command assignment target record")
	}
	persisted, err := fixture.repo.Get(context.Background(), result.Assignment.ID)
	if err != nil {
		t.Fatalf("load persisted assignment: %v", err)
	}
	if persisted.AssigneeID != "translator-command" || persisted.Status != AssignmentStatusAssigned {
		t.Fatalf("unexpected persisted assignment: %+v", persisted)
	}
}

func TestTranslationFamilyBindingCreateAssignmentEnhancedReturnsFragments(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})
	seedTranslationFamilyLocaleVariant(t, fixture, "fr")

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"target_locale": "fr",
		"assignee_id":   "translator-1",
		"work_scope":    "localization",
	}, map[string]string{
		"X-User-ID":          "assigner-1",
		"X-Enhanced-Action":  "1",
		"Accept":             "application/vnd.admin.enhanced+json",
	})
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	if !testBool(t, payload["ok"], "ok") {
		t.Fatalf("expected enhanced ok payload, got %+v", payload)
	}
	fragments := testAnySlice(t, payload["fragments"], "fragments")
	if len(fragments) != 4 {
		t.Fatalf("expected four family fragments, got %d payload=%+v", len(fragments), payload)
	}
	seen := map[string]string{}
	for _, raw := range fragments {
		fragment := extractMap(raw)
		seen[toString(fragment["selector"])] = toString(fragment["html"])
		if got := toString(fragment["mode"]); got != EnhancedFragmentModeReplace {
			t.Fatalf("expected replace fragment, got %q", got)
		}
	}
	if !strings.Contains(seen["[data-family-assignments]"], "Open editor") {
		t.Fatalf("expected assignments fragment to expose Open editor, got %q", seen["[data-family-assignments]"])
	}
	if !strings.Contains(seen["[data-family-locale-coverage]"], `data-enhance-action="true"`) {
		t.Fatalf("expected locale coverage fragment to contain enhanced forms, got %q", seen["[data-family-locale-coverage]"])
	}
	toasts := testAnySlice(t, payload["toasts"], "toasts")
	if got := toString(extractMap(toasts[0])["message"]); got != "Assignment updated." {
		t.Fatalf("expected success toast, got %q", got)
	}
	if got := toString(payload["redirect"]); !strings.Contains(got, "/admin/translations/families/tg-page-1") {
		t.Fatalf("expected family detail redirect, got %q", got)
	}
}

func TestTranslationFamilyBindingCreateAssignmentEnhancedUsesSubmittedChannelForFragments(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})
	seedTranslationFamilyLocaleVariant(t, fixture, "fr")
	syncTranslationFamilyFixtureStore(t, fixture.admin, "staging")

	form := neturl.Values{}
	form.Set("target_locale", "fr")
	form.Set("assignee_id", "translator-staging")
	form.Set("work_scope", "localization")
	form.Set("channel", "staging")
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?tenant_id=tenant-1&org_id=org-1", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/vnd.admin.enhanced+json")
	req.Header.Set("X-Enhanced-Action", "1")
	req.Header.Set("X-User-ID", "assigner-1")
	resp, err := fixture.app.Test(req)
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
		t.Fatalf("decode payload: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", resp.StatusCode, payload)
	}
	fragments := testAnySlice(t, payload["fragments"], "fragments")
	seen := map[string]string{}
	for _, raw := range fragments {
		fragment := extractMap(raw)
		seen[toString(fragment["selector"])] = toString(fragment["html"])
	}
	if got := seen["[data-family-locale-coverage]"]; !strings.Contains(got, `name="channel" value="staging"`) {
		t.Fatalf("expected enhanced fragment forms to preserve submitted staging channel, got %q", got)
	}
	if got := toString(payload["redirect"]); !strings.Contains(got, "channel=staging") {
		t.Fatalf("expected redirect fallback to preserve staging channel, got %q", got)
	}
}

func TestTranslationFamilyBindingCreateAssignmentFormRedirectsWithFlash(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})
	seedTranslationFamilyLocaleVariant(t, fixture, "fr")

	form := neturl.Values{}
	form.Set("target_locale", "fr")
	form.Set("assignee_id", "translator-1")
	form.Set("work_scope", "localization")
	form.Set("channel", "production")
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?tenant_id=tenant-1&org_id=org-1", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "text/html")
	req.Header.Set("X-User-ID", "assigner-1")
	resp, err := fixture.app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			t.Fatalf("close response body: %v", closeErr)
		}
	}()
	bodyBytes, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		t.Fatalf("read response body: %v", readErr)
	}
	if resp.StatusCode != http.StatusSeeOther {
		t.Fatalf("expected 303 redirect, got %d body=%s", resp.StatusCode, string(bodyBytes))
	}
	if got := resp.Header.Get("Location"); !strings.Contains(got, "/admin/translations/families/tg-page-1") || !strings.Contains(got, "channel=production") {
		t.Fatalf("expected family detail redirect with channel, got %q", got)
	}
	if got := resp.Header.Get("X-GoAdmin-Flash-Message"); got != "Assignment updated." {
		t.Fatalf("expected flash header, got %q type=%q body=%s location=%q", got, resp.Header.Get("X-GoAdmin-Flash-Type"), string(bodyBytes), resp.Header.Get("Location"))
	}
}

func TestTranslationFamilyBindingCreateAssignmentFormDoesNotRequireFragmentRefresh(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})
	seedTranslationFamilyLocaleVariant(t, fixture, "fr")
	fixture.admin.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsAssign: true,
		},
	})

	form := neturl.Values{}
	form.Set("target_locale", "fr")
	form.Set("assignee_id", "translator-1")
	form.Set("work_scope", "localization")
	form.Set("channel", "production")
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?tenant_id=tenant-1&org_id=org-1", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "text/html")
	req.Header.Set("X-User-ID", "assigner-1")
	resp, err := fixture.app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			t.Fatalf("close response body: %v", closeErr)
		}
	}()
	bodyBytes, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		t.Fatalf("read response body: %v", readErr)
	}
	if resp.StatusCode != http.StatusSeeOther {
		t.Fatalf("expected 303 redirect, got %d body=%s", resp.StatusCode, string(bodyBytes))
	}
	if got := resp.Header.Get("X-GoAdmin-Flash-Message"); got != "Assignment updated." {
		t.Fatalf("expected success flash without fragment refresh, got %q type=%q body=%s", got, resp.Header.Get("X-GoAdmin-Flash-Type"), string(bodyBytes))
	}
}

func seedTranslationFamilyLocaleVariant(t *testing.T, fixture translationFamilyMutationFixture, locale string) {
	t.Helper()
	locale = strings.TrimSpace(strings.ToLower(locale))
	if _, err := fixture.content.CreatePage(context.Background(), CMSPage{
		ID:       "page-1-" + locale,
		Title:    "Page 1 " + strings.ToUpper(locale),
		Slug:     "page-1-" + locale,
		Locale:   locale,
		FamilyID: "tg-page-1",
		Status:   "draft",
		Data: map[string]any{
			"path": "/" + locale + "/page-1",
			"body": "Translated",
		},
		Metadata: map[string]any{
			"tenant_id": "tenant-1",
			"org_id":    "org-1",
		},
	}); err != nil {
		t.Fatalf("seed %s page: %v", locale, err)
	}
	syncTranslationFamilyFixtureStore(t, fixture.admin, "production")
}

func TestTranslationFamilyBindingCreateAssignmentRequiresAssignPermission(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})
	createVariantStatus, createVariantPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale": "fr",
	}, nil)
	if createVariantStatus != http.StatusOK {
		t.Fatalf("create variant status=%d payload=%+v", createVariantStatus, createVariantPayload)
	}
	fixture.admin.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:  true,
			PermAdminTranslationsClaim: true,
		},
	})

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"target_locale": "fr",
		"assignee_id":   "translator-1",
		"work_scope":    "localization",
	}, map[string]string{"X-User-ID": "assigner-1"})
	if status != http.StatusForbidden {
		t.Fatalf("status=%d want=403 payload=%+v", status, payload)
	}
	metadata := extractMap(extractMap(payload["error"])["metadata"])
	if got := toString(metadata["permission"]); got != PermAdminTranslationsAssign {
		t.Fatalf("expected missing permission %q, got %q payload=%+v", PermAdminTranslationsAssign, got, payload)
	}
}

func TestTranslationFamilyBindingDetailIncludesLocaleAssignmentActions(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
		Users: []UserRecord{{
			ID:        "translator-1",
			Username:  "translator.one",
			Email:     "translator.one@example.com",
			FirstName: "Translator",
			LastName:  "One",
			Status:    "active",
		}},
	})
	createVariantStatus, createVariantPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale": "fr",
	}, nil)
	if createVariantStatus != http.StatusOK {
		t.Fatalf("create variant status=%d payload=%+v", createVariantStatus, createVariantPayload)
	}
	createAssignmentStatus, createAssignmentPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"target_locale": "fr",
		"assignee_id":   "translator-1",
		"work_scope":    "localization",
	}, map[string]string{"X-User-ID": "assigner-1"})
	if createAssignmentStatus != http.StatusOK {
		t.Fatalf("create assignment status=%d payload=%+v", createAssignmentStatus, createAssignmentPayload)
	}

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/families/tg-page-1?channel=production&tenant_id=tenant-1&org_id=org-1", nil, map[string]string{"X-User-ID": "translator-1"})
	if status != http.StatusOK {
		t.Fatalf("detail status=%d payload=%+v", status, payload)
	}
	data := extractMap(payload["data"])
	activeAssignments := testAnySlice(t, data["active_assignments"], "data.active_assignments")
	if len(activeAssignments) != 1 {
		t.Fatalf("expected one active assignment, got %d", len(activeAssignments))
	}
	active := extractMap(activeAssignments[0])
	if got := toString(active["assignment_type"]); got != string(AssignmentTypeDirect) {
		t.Fatalf("expected queue-compatible assignment_type, got %q", got)
	}
	if got := toInt(active["row_version"]); got <= 0 {
		t.Fatalf("expected row_version, got %d", got)
	}
	if got := toString(active["display_assignee"]); got != "Translator One <translator.one@example.com>" {
		t.Fatalf("expected family display assignee with name and email, got %q", got)
	}
	if got := toString(active["target_record_id"]); got == "" {
		t.Fatalf("expected target_record_id on active assignment")
	}
	if got := toString(active["variant_id"]); got == "" {
		t.Fatalf("expected variant_id on active assignment")
	}

	localeAssignments := extractMap(data["locale_assignments"])
	fr := extractMap(localeAssignments["fr:localization"])
	if got := toString(fr["state"]); got != "assigned_to_me" {
		t.Fatalf("expected fr assigned_to_me state, got %q payload=%+v", got, fr)
	}
	localeAssignment := extractMap(fr["assignment"])
	if got := toString(localeAssignment["display_assignee"]); got != "Translator One <translator.one@example.com>" {
		t.Fatalf("expected locale assignment display assignee with name and email, got %q", got)
	}
	actions := extractMap(fr["actions"])
	assignToMe := extractMap(actions["assign_to_me"])
	if testBool(t, assignToMe["enabled"], "assign_to_me.enabled") {
		t.Fatalf("expected assign_to_me disabled when already assigned, got %+v", assignToMe)
	}
	if got := toString(assignToMe["reason_code"]); got != "already_assigned" {
		t.Fatalf("expected already_assigned reason, got %q", got)
	}
	assignToMePayload := extractMap(assignToMe["payload"])
	if got := toString(assignToMePayload["assignee_id"]); got != "translator-1" {
		t.Fatalf("expected self assignment payload assignee_id translator-1, got %q", got)
	}
	assignToUser := extractMap(actions["assign_to_user"])
	if !testBool(t, assignToUser["enabled"], "assign_to_user.enabled") {
		t.Fatalf("expected assign_to_user enabled, got %+v", assignToUser)
	}
	if got := toString(assignToUser["endpoint"]); got != "/admin/api/translations/families/tg-page-1/assignments" {
		t.Fatalf("expected assign endpoint, got %q", got)
	}
	claim := extractMap(actions["claim"])
	if testBool(t, claim["enabled"], "claim.enabled") {
		t.Fatalf("expected claim disabled for current assignee, got %+v", claim)
	}
	if got := toString(claim["reason_code"]); got != "already_assigned" {
		t.Fatalf("expected already_assigned claim reason, got %q", got)
	}
	if got := toString(claim["endpoint"]); !strings.Contains(got, "/admin/api/translations/assignments/") || !strings.Contains(got, "/actions/claim") {
		t.Fatalf("expected claim endpoint, got %q", got)
	}
	openEditor := extractMap(actions["open_editor"])
	if !testBool(t, openEditor["enabled"], "open_editor.enabled") {
		t.Fatalf("expected open_editor enabled, got %+v", openEditor)
	}
	if got := toString(openEditor["href"]); !strings.Contains(got, "/admin/translations/assignments/") {
		t.Fatalf("expected editor href, got %q", got)
	}
}

func TestTranslationFamilyBindingAssignmentDisplayUsesCurrentActorMetadataFallback(t *testing.T) {
	adm := mustNewAdmin(t, translationFamilyScopedTestConfig(), Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
	})
	binding := newTranslationFamilyBinding(adm)
	claims := &auth.JWTClaims{
		UID:      "translator-claims",
		UserRole: string(auth.RoleMember),
		Metadata: map[string]any{
			"display_name": "Claims Translator",
			"email":        "claims.translator@example.com",
		},
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	ctx = auth.WithActorContext(ctx, auth.ActorContextFromClaims(claims))

	row := map[string]any{
		"assignee_id": "translator-claims",
	}
	binding.decorateFamilyAssignmentRow(ctx, row, TranslationAssignment{
		ID:         "asg-claims",
		AssigneeID: "translator-claims",
	})

	if got := toString(row["display_assignee"]); got != "Claims Translator <claims.translator@example.com>" {
		t.Fatalf("expected current actor metadata display assignee, got %q row=%+v", got, row)
	}
	if got := toString(row["assignee_label"]); got != "translator-claims" {
		t.Fatalf("expected raw assignee label fallback to remain for payload compatibility, got %q", got)
	}
}

func TestTranslationFamilyBindingAssignmentDisplayMergesCurrentActorMetadataWithUserRecord(t *testing.T) {
	userStore := NewInMemoryUserStore()
	if _, err := userStore.CreateUser(context.Background(), UserRecord{
		ID:        "translator-claims",
		Username:  "claims.translator",
		FirstName: "Claims",
		LastName:  "Translator",
		Status:    "active",
	}); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	adm := mustNewAdmin(t, translationFamilyScopedTestConfig(), Dependencies{
		FeatureGate:    featureGateFromKeys(FeatureCMS, FeatureTranslationQueue),
		UserRepository: &inMemoryUserRepoAdapter{store: userStore},
		RoleRepository: &inMemoryRoleRepoAdapter{store: userStore},
	})
	binding := newTranslationFamilyBinding(adm)
	claims := &auth.JWTClaims{
		UID:      "translator-claims",
		UserRole: string(auth.RoleMember),
		Metadata: map[string]any{
			"email": "claims.translator@example.com",
		},
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	ctx = auth.WithActorContext(ctx, auth.ActorContextFromClaims(claims))

	row := map[string]any{
		"assignee_id": "translator-claims",
	}
	binding.decorateFamilyAssignmentRow(ctx, row, TranslationAssignment{
		ID:         "asg-claims",
		AssigneeID: "translator-claims",
	})

	if got := toString(row["display_assignee"]); got != "Claims Translator <claims.translator@example.com>" {
		t.Fatalf("expected user display name merged with current actor email metadata, got %q row=%+v", got, row)
	}
}

func TestTranslationFamilyBindingDetailAllowsTargetAssignmentWhenVariantSourceFlagConflictsWithPolicy(t *testing.T) {
	store := translationservices.NewInMemoryFamilyStore()
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"en", "fr"},
		FamilyStore:     store,
	})
	ctx := context.Background()
	family, ok, err := store.Family(ctx, "tg-page-1")
	if err != nil || !ok {
		t.Fatalf("load fixture family ok=%v err=%v", ok, err)
	}
	family.SourceLocale = "fr"
	family.SourceVariantID = "page-1-fr"
	family.Variants = []translationservices.FamilyVariant{
		{
			ID:             "page-1-en",
			FamilyID:       "tg-page-1",
			TenantID:       "tenant-1",
			OrgID:          "org-1",
			Locale:         "en",
			Status:         string(translationcore.VariantStatusPublished),
			IsSource:       false,
			SourceRecordID: "page-1",
			Fields:         map[string]string{"title": "Page 1 EN", "body": "Hello"},
			CreatedAt:      time.Date(2026, 2, 17, 9, 0, 0, 0, time.UTC),
			UpdatedAt:      time.Date(2026, 2, 17, 9, 0, 0, 0, time.UTC),
		},
		{
			ID:             "page-1-fr",
			FamilyID:       "tg-page-1",
			TenantID:       "tenant-1",
			OrgID:          "org-1",
			Locale:         "fr",
			Status:         string(translationcore.VariantStatusDraft),
			IsSource:       true,
			SourceRecordID: "page-1-fr",
			Fields:         map[string]string{"title": "Page 1 FR", "body": "Bonjour"},
			CreatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
			UpdatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
		},
	}
	if err := store.SaveFamily(ctx, family); err != nil {
		t.Fatalf("save malformed family: %v", err)
	}

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/families/tg-page-1?channel=production&tenant_id=tenant-1&org_id=org-1", nil, map[string]string{"X-User-ID": "translator-self"})
	if status != http.StatusOK {
		t.Fatalf("detail status=%d payload=%+v", status, payload)
	}
	data := extractMap(payload["data"])
	if got := toString(data["source_locale"]); got != "en" {
		t.Fatalf("expected policy source_locale en, got %q", got)
	}
	localeAssignments := extractMap(data["locale_assignments"])
	fr := extractMap(localeAssignments["fr:localization"])
	if got := toString(fr["state"]); got != "unassigned" {
		t.Fatalf("expected fr to remain assignable target locale, got state=%q payload=%+v", got, fr)
	}
	actions := extractMap(fr["actions"])
	assignToMe := extractMap(actions["assign_to_me"])
	if !testBool(t, assignToMe["enabled"], "assign_to_me.enabled") {
		t.Fatalf("expected assign_to_me enabled for fr target locale, got %+v", assignToMe)
	}
	if got := toString(extractMap(assignToMe["payload"])["assignee_id"]); got != "translator-self" {
		t.Fatalf("expected assign_to_me payload to use actor id, got %q", got)
	}
	assignToUser := extractMap(actions["assign_to_user"])
	if !testBool(t, assignToUser["enabled"], "assign_to_user.enabled") {
		t.Fatalf("expected assign_to_user enabled for fr target locale, got %+v", assignToUser)
	}

	assignStatus, assignPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"target_locale": "fr",
		"assignee_id":   "translator-self",
		"work_scope":    "localization",
	}, map[string]string{"X-User-ID": "translator-self"})
	if assignStatus != http.StatusOK {
		t.Fatalf("assign to me status=%d payload=%+v", assignStatus, assignPayload)
	}
	assignment := extractMap(extractMap(assignPayload["data"])["assignment"])
	if got := toString(assignment["queue_state"]); got != string(AssignmentStatusAssigned) {
		t.Fatalf("expected assigned queue_state, got %q payload=%+v", got, assignment)
	}
	if got := toString(assignment["assignee_id"]); got != "translator-self" {
		t.Fatalf("expected assignee translator-self, got %q", got)
	}
	if got := toString(assignment["source_locale"]); got != "en" {
		t.Fatalf("expected assignment source_locale en, got %q payload=%+v", got, assignment)
	}
	if got := toString(assignment["source_record_id"]); got != "page-1" {
		t.Fatalf("expected assignment source_record_id page-1, got %q payload=%+v", got, assignment)
	}
	if got := toString(assignment["source_title"]); got != "Page 1 EN" {
		t.Fatalf("expected assignment source_title from canonical source, got %q payload=%+v", got, assignment)
	}

	refreshStatus, refreshPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/families/tg-page-1?channel=production&tenant_id=tenant-1&org_id=org-1", nil, map[string]string{"X-User-ID": "translator-self"})
	if refreshStatus != http.StatusOK {
		t.Fatalf("refresh detail status=%d payload=%+v", refreshStatus, refreshPayload)
	}
	refreshAssignments := extractMap(extractMap(refreshPayload["data"])["locale_assignments"])
	refreshFR := extractMap(refreshAssignments["fr:localization"])
	if got := toString(refreshFR["state"]); got != "assigned_to_me" {
		t.Fatalf("expected refreshed fr row assigned_to_me, got state=%q payload=%+v", got, refreshFR)
	}
}

func TestTranslationFamilyBindingCreateAssignmentRejectsCanonicalSourceLocale(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"en", "fr"},
	})

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"target_locale": "en",
		"assignee_id":   "translator-1",
		"work_scope":    "localization",
	}, map[string]string{"X-User-ID": "assigner-1"})
	if status != http.StatusBadRequest {
		t.Fatalf("expected source-locale assignment to be rejected, got status=%d payload=%+v", status, payload)
	}
	metadata := extractMap(extractMap(payload["error"])["metadata"])
	if got := toString(metadata["reason_code"]); got != ActionDisabledReasonCodeInvalidStatus {
		t.Fatalf("expected invalid status reason, got %q payload=%+v", got, payload)
	}
	if got := toString(metadata["source_locale"]); got != "en" {
		t.Fatalf("expected source_locale en metadata, got %q", got)
	}
}

func TestTranslationFamilyBindingCreateAssignmentRejectsMissingCanonicalSourceVariant(t *testing.T) {
	store := translationservices.NewInMemoryFamilyStore()
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"en", "fr"},
		FamilyStore:     store,
	})
	ctx := context.Background()
	family, ok, err := store.Family(ctx, "tg-page-1")
	if err != nil || !ok {
		t.Fatalf("load fixture family ok=%v err=%v", ok, err)
	}
	family.SourceLocale = "fr"
	family.SourceVariantID = "page-1-fr"
	family.Variants = []translationservices.FamilyVariant{{
		ID:             "page-1-fr",
		FamilyID:       "tg-page-1",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		Locale:         "fr",
		Status:         string(translationcore.VariantStatusDraft),
		IsSource:       true,
		SourceRecordID: "page-1-fr",
		Fields:         map[string]string{"title": "Page 1 FR", "body": "Bonjour"},
		CreatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
		UpdatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
	}}
	if err := store.SaveFamily(ctx, family); err != nil {
		t.Fatalf("save malformed family: %v", err)
	}

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"target_locale": "fr",
		"assignee_id":   "translator-self",
		"work_scope":    "localization",
	}, map[string]string{"X-User-ID": "translator-self"})
	if status != http.StatusBadRequest {
		t.Fatalf("expected missing source variant rejection, got status=%d payload=%+v", status, payload)
	}
	metadata := extractMap(extractMap(payload["error"])["metadata"])
	if got := toString(metadata["reason_code"]); got != "missing_source_variant" {
		t.Fatalf("expected missing_source_variant reason, got %q payload=%+v", got, payload)
	}
	if got := toString(metadata["source_locale"]); got != "en" {
		t.Fatalf("expected canonical source locale en, got %q", got)
	}
}

func TestTranslationFamilyBindingDetailSurfacesLegacySourceLocaleAssignment(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"en", "fr"},
		Assignments: []TranslationAssignment{{
			ID:             "asg-source-en",
			FamilyID:       "tg-page-1",
			EntityType:     "pages",
			TenantID:       "tenant-1",
			OrgID:          "org-1",
			SourceRecordID: "page-1",
			SourceLocale:   "en",
			TargetLocale:   "en",
			WorkScope:      "localization",
			AssignmentType: AssignmentTypeDirect,
			Status:         AssignmentStatusAssigned,
			AssigneeID:     "translator-1",
			Priority:       PriorityNormal,
			CreatedAt:      time.Date(2026, 2, 17, 9, 0, 0, 0, time.UTC),
			UpdatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
		}},
	})

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/families/tg-page-1?channel=production&tenant_id=tenant-1&org_id=org-1", nil, map[string]string{"X-User-ID": "translator-1"})
	if status != http.StatusOK {
		t.Fatalf("detail status=%d payload=%+v", status, payload)
	}
	localeAssignments := extractMap(extractMap(payload["data"])["locale_assignments"])
	sourceRow := extractMap(localeAssignments["en:localization"])
	if got := toString(sourceRow["state"]); got != "invalid_source_assignment" {
		t.Fatalf("expected invalid_source_assignment state, got %q payload=%+v", got, sourceRow)
	}
	assignment := extractMap(sourceRow["assignment"])
	if got := toString(assignment["id"]); got != "asg-source-en" {
		t.Fatalf("expected legacy assignment to remain visible, got %+v", assignment)
	}
	actions := extractMap(sourceRow["actions"])
	assignToMe := extractMap(actions["assign_to_me"])
	if testBool(t, assignToMe["enabled"], "assign_to_me.enabled") {
		t.Fatalf("expected assign_to_me disabled for invalid source assignment, got %+v", assignToMe)
	}
	if got := toString(assignToMe["reason_code"]); got != ActionDisabledReasonCodeInvalidStatus {
		t.Fatalf("expected invalid status reason, got %q", got)
	}
	openEditor := extractMap(actions["open_editor"])
	if !testBool(t, openEditor["enabled"], "open_editor.enabled") {
		t.Fatalf("expected open_editor enabled for visible legacy assignment, got %+v", openEditor)
	}
}

func TestTranslationFamilyBindingCreateAssignmentOpenPoolReturnsOpen(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})
	createVariantStatus, createVariantPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale": "fr",
	}, nil)
	if createVariantStatus != http.StatusOK {
		t.Fatalf("create variant status=%d payload=%+v", createVariantStatus, createVariantPayload)
	}

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"target_locale": "fr",
		"open_pool":     true,
		"work_scope":    "localization",
	}, map[string]string{"X-User-ID": "assigner-1"})
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	assignment := extractMap(extractMap(payload["data"])["assignment"])
	if got := toString(assignment["queue_state"]); got != string(AssignmentStatusOpen) {
		t.Fatalf("expected open queue_state, got %q", got)
	}
	if got := toString(assignment["assignment_type"]); got != string(AssignmentTypeOpenPool) {
		t.Fatalf("expected open_pool assignment_type, got %q", got)
	}
}

func TestTranslationFamilyBindingCreateAssignmentReassignsExistingOpenPool(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
		Assignments: []TranslationAssignment{
			{
				ID:             "asg-open-fr",
				FamilyID:       "tg-page-1",
				EntityType:     "pages",
				TenantID:       "tenant-1",
				OrgID:          "org-1",
				SourceRecordID: "page-1",
				SourceLocale:   "en",
				TargetLocale:   "fr",
				WorkScope:      "localization",
				AssignmentType: AssignmentTypeOpenPool,
				Status:         AssignmentStatusOpen,
				Priority:       PriorityNormal,
				CreatedAt:      time.Date(2026, 2, 17, 9, 0, 0, 0, time.UTC),
				UpdatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
			},
		},
	})

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"target_locale": "fr",
		"assignee_id":   "translator-2",
		"work_scope":    "localization",
	}, map[string]string{"X-User-ID": "assigner-1"})
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	assignment := extractMap(extractMap(payload["data"])["assignment"])
	if got := toString(assignment["id"]); got != "asg-open-fr" {
		t.Fatalf("expected existing assignment reused, got %q", got)
	}
	if got := toString(assignment["queue_state"]); got != string(AssignmentStatusAssigned) {
		t.Fatalf("expected assigned queue_state, got %q", got)
	}
	if got := toString(assignment["assignee_id"]); got != "translator-2" {
		t.Fatalf("expected reassigned assignee translator-2, got %q", got)
	}
	if got := toString(assignment["assigned_at"]); got == "" {
		t.Fatalf("expected reassigned family assignment assigned_at, got %+v", assignment)
	}
	meta := extractMap(payload["meta"])
	if !testBool(t, meta["assignment_reused"], "meta.assignment_reused") {
		t.Fatalf("expected assignment_reused=true, got %+v", meta)
	}
}

func TestTranslationFamilyBindingCreateAssignmentSameAssigneeDoesNotResetPriority(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
		Assignments: []TranslationAssignment{
			{
				ID:             "asg-assigned-fr",
				FamilyID:       "tg-page-1",
				EntityType:     "pages",
				TenantID:       "tenant-1",
				OrgID:          "org-1",
				SourceRecordID: "page-1",
				SourceLocale:   "en",
				TargetLocale:   "fr",
				WorkScope:      "localization",
				AssignmentType: AssignmentTypeDirect,
				Status:         AssignmentStatusAssigned,
				AssigneeID:     "translator-1",
				Priority:       PriorityHigh,
				Version:        1,
				CreatedAt:      time.Date(2026, 2, 17, 9, 0, 0, 0, time.UTC),
				UpdatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
			},
		},
	})

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"target_locale": "fr",
		"assignee_id":   "translator-1",
		"work_scope":    "localization",
	}, map[string]string{"X-User-ID": "assigner-1"})
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	assignment := extractMap(extractMap(payload["data"])["assignment"])
	if got := toString(assignment["priority"]); got != string(PriorityHigh) {
		t.Fatalf("expected priority high to be preserved, got %q", got)
	}
	if got := toInt(assignment["row_version"]); got != 1 {
		t.Fatalf("expected row_version to remain 1 for no-op assignment, got %d", got)
	}
}

func TestTranslationFamilyBindingCreateAssignmentRejectsInProgressAndInReview(t *testing.T) {
	for _, status := range []AssignmentStatus{AssignmentStatusInProgress, AssignmentStatusInReview} {
		t.Run(string(status), func(t *testing.T) {
			fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
				RequiredLocales: []string{"fr"},
				Assignments: []TranslationAssignment{
					{
						ID:             "asg-active-fr",
						FamilyID:       "tg-page-1",
						EntityType:     "pages",
						TenantID:       "tenant-1",
						OrgID:          "org-1",
						SourceRecordID: "page-1",
						SourceLocale:   "en",
						TargetLocale:   "fr",
						WorkScope:      "localization",
						AssignmentType: AssignmentTypeDirect,
						Status:         status,
						AssigneeID:     "translator-1",
						Priority:       PriorityNormal,
						CreatedAt:      time.Date(2026, 2, 17, 9, 0, 0, 0, time.UTC),
						UpdatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
					},
				},
			})
			httpStatus, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
				"target_locale": "fr",
				"assignee_id":   "translator-2",
				"work_scope":    "localization",
			}, map[string]string{"X-User-ID": "assigner-1"})
			if httpStatus != http.StatusConflict {
				t.Fatalf("expected conflict, got status=%d payload=%+v", httpStatus, payload)
			}
			metadata := extractMap(extractMap(payload["error"])["metadata"])
			if got := toString(metadata["from_status"]); got != string(status) {
				t.Fatalf("expected from_status %q, got %q", status, got)
			}
		})
	}
}

func TestTranslationFamilyBindingCreateAssignmentIdempotencyReplayAndConflict(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
	})
	createVariantStatus, createVariantPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale": "fr",
	}, nil)
	if createVariantStatus != http.StatusOK {
		t.Fatalf("create variant status=%d payload=%+v", createVariantStatus, createVariantPayload)
	}

	path := "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1"
	headers := map[string]string{"X-User-ID": "assigner-1", "X-Idempotency-Key": "assign-fr"}
	body := map[string]any{
		"target_locale": "fr",
		"assignee_id":   "translator-1",
		"priority":      "normal",
		"work_scope":    "localization",
	}
	firstStatus, firstPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, path, body, headers)
	if firstStatus != http.StatusOK {
		t.Fatalf("first status=%d payload=%+v", firstStatus, firstPayload)
	}
	secondStatus, secondPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, path, body, headers)
	if secondStatus != http.StatusOK {
		t.Fatalf("second status=%d payload=%+v", secondStatus, secondPayload)
	}
	if !testBool(t, extractMap(secondPayload["meta"])["idempotency_hit"], "meta.idempotency_hit") {
		t.Fatalf("expected idempotency replay, got %+v", secondPayload)
	}
	conflictStatus, conflictPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, path, map[string]any{
		"target_locale": "fr",
		"assignee_id":   "translator-1",
		"priority":      "high",
		"work_scope":    "localization",
	}, headers)
	if conflictStatus != http.StatusConflict {
		t.Fatalf("expected idempotency conflict, got status=%d payload=%+v", conflictStatus, conflictPayload)
	}
}

func TestTranslationFamilyBindingCreateAssignmentIgnoresOtherScopeActiveAssignment(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
		Assignments: []TranslationAssignment{
			{
				ID:             "asg-other-scope-fr",
				FamilyID:       "tg-page-1",
				EntityType:     "pages",
				TenantID:       "tenant-2",
				OrgID:          "org-2",
				SourceRecordID: "page-1",
				SourceLocale:   "en",
				TargetLocale:   "fr",
				WorkScope:      "localization",
				AssignmentType: AssignmentTypeDirect,
				Status:         AssignmentStatusInProgress,
				AssigneeID:     "translator-other",
				Priority:       PriorityNormal,
				CreatedAt:      time.Date(2026, 2, 17, 9, 0, 0, 0, time.UTC),
				UpdatedAt:      time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC),
			},
		},
	})
	createVariantStatus, createVariantPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale": "fr",
	}, nil)
	if createVariantStatus != http.StatusOK {
		t.Fatalf("create variant status=%d payload=%+v", createVariantStatus, createVariantPayload)
	}

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"target_locale": "fr",
		"assignee_id":   "translator-1",
		"work_scope":    "localization",
	}, map[string]string{"X-User-ID": "assigner-1"})
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	assignment := extractMap(extractMap(payload["data"])["assignment"])
	if got := toString(assignment["id"]); got == "asg-other-scope-fr" {
		t.Fatalf("expected current-scope assignment, got other-scope assignment payload=%+v", assignment)
	}

	detailStatus, detailPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/families/tg-page-1?channel=production&tenant_id=tenant-1&org_id=org-1", nil, map[string]string{"X-User-ID": "translator-1"})
	if detailStatus != http.StatusOK {
		t.Fatalf("detail status=%d payload=%+v", detailStatus, detailPayload)
	}
	activeAssignments := testAnySlice(t, extractMap(detailPayload["data"])["active_assignments"], "data.active_assignments")
	for _, item := range activeAssignments {
		if got := toString(extractMap(item)["id"]); got == "asg-other-scope-fr" {
			t.Fatalf("detail leaked other-scope assignment: %+v", activeAssignments)
		}
	}
}

func TestTranslationFamilyBindingCreateAssignmentFindsActiveAssignmentAfterTerminalRows(t *testing.T) {
	assignments := make([]TranslationAssignment, 0, 206)
	for i := range 205 {
		assignments = append(assignments, TranslationAssignment{
			ID:             fmt.Sprintf("asg-archived-fr-%03d", i),
			FamilyID:       "tg-page-1",
			EntityType:     "pages",
			TenantID:       "tenant-1",
			OrgID:          "org-1",
			SourceRecordID: "page-1",
			SourceLocale:   "en",
			TargetLocale:   "fr",
			WorkScope:      "localization",
			AssignmentType: AssignmentTypeDirect,
			Status:         AssignmentStatusArchived,
			AssigneeID:     "translator-archived",
			Priority:       PriorityNormal,
			CreatedAt:      time.Date(2026, 2, 17, 9, 0, 0, 0, time.UTC).Add(time.Duration(i) * time.Minute),
			UpdatedAt:      time.Date(2026, 2, 18, 9, 0, 0, 0, time.UTC).Add(time.Duration(i) * time.Minute),
		})
	}
	assignments = append(assignments, TranslationAssignment{
		ID:             "asg-in-progress-fr",
		FamilyID:       "tg-page-1",
		EntityType:     "pages",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "page-1",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		WorkScope:      "localization",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInProgress,
		AssigneeID:     "translator-1",
		Priority:       PriorityNormal,
		CreatedAt:      time.Date(2026, 2, 17, 8, 0, 0, 0, time.UTC),
		UpdatedAt:      time.Date(2026, 2, 17, 8, 0, 0, 0, time.UTC),
	})
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
		Assignments:     assignments,
	})

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/assignments?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"target_locale": "fr",
		"assignee_id":   "translator-2",
		"work_scope":    "localization",
	}, map[string]string{"X-User-ID": "assigner-1"})
	if status != http.StatusConflict {
		t.Fatalf("expected conflict from existing active assignment, got status=%d payload=%+v", status, payload)
	}
	metadata := extractMap(extractMap(payload["error"])["metadata"])
	if got := toString(metadata["from_status"]); got != string(AssignmentStatusInProgress) {
		t.Fatalf("expected from_status %q, got %q payload=%+v", AssignmentStatusInProgress, got, payload)
	}
}

func TestTranslationFamilyBindingDetailDisablesAssignmentActionsWhenQueueFeatureDisabled(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales:     []string{"fr"},
		DisableQueueFeature: true,
	})
	createVariantStatus, createVariantPayload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/families/tg-page-1/variants?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"locale": "fr",
	}, nil)
	if createVariantStatus != http.StatusOK {
		t.Fatalf("create variant status=%d payload=%+v", createVariantStatus, createVariantPayload)
	}

	status, payload := doTranslationFamilyJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/families/tg-page-1?channel=production&tenant_id=tenant-1&org_id=org-1", nil, map[string]string{"X-User-ID": "translator-1"})
	if status != http.StatusOK {
		t.Fatalf("detail status=%d payload=%+v", status, payload)
	}
	localeAssignments := extractMap(extractMap(payload["data"])["locale_assignments"])
	fr := extractMap(localeAssignments["fr:localization"])
	actions := extractMap(fr["actions"])
	for _, name := range []string{"assign_to_me", "assign_to_user", "claim", "open_editor"} {
		action := extractMap(actions[name])
		if testBool(t, action["enabled"], name+".enabled") {
			t.Fatalf("expected %s disabled when queue feature is disabled, got %+v", name, action)
		}
		if got := toString(action["reason_code"]); got != ActionDisabledReasonCodeFeatureDisabled {
			t.Fatalf("expected %s reason_code %q, got %q action=%+v", name, ActionDisabledReasonCodeFeatureDisabled, got, action)
		}
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
	approvedAssignment := TranslationAssignment{
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
	}
	if _, err := baseRepo.Create(context.Background(), approvedAssignment); err != nil {
		t.Fatalf("seed approved assignment repo: %v", err)
	}
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
		Assignments:     []TranslationAssignment{approvedAssignment},
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
	r.Post("/admin/api/translations/families/:family_id/assignments", func(c router.Context) error {
		return binding.CreateAssignmentMutation(c, c.Param("family_id"))
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
	RequiredLocales         []string
	ReviewRequired          bool
	LifecycleMode           string
	Assignments             []TranslationAssignment
	DisablePolicy           bool
	OmitDefaultWorkScope    bool
	Repo                    TranslationAssignmentRepository
	FamilyStore             translationservices.FamilyStore
	Users                   []UserRecord
	PagePanelViewPermission string
	DisableQueueFeature     bool
}

type translationFamilyMutationFixture struct {
	app      *fiber.App
	activity *ActivityFeed
	content  *translationFamilyMutationContentService
	admin    *Admin
	repo     TranslationAssignmentRepository
}

type hostPolicyDeniedByEntityStub struct {
	readinessPolicyByEntityStub
}

func (s hostPolicyDeniedByEntityStub) FamilyPolicyBlockers(_ context.Context, family translationservices.FamilyRecord, _ translationservices.FamilyPolicy, environment string) ([]translationservices.FamilyBlocker, error) {
	locale := strings.TrimSpace(strings.ToLower(firstNonEmpty(family.SourceLocale, "en")))
	return []translationservices.FamilyBlocker{{
		ID:          translationservices.DeterministicBlockerID(translationservices.Scope{TenantID: family.TenantID, OrgID: family.OrgID}, family.ID, string(translationcore.FamilyBlockerPolicyDenied), locale, "host_policy"),
		FamilyID:    family.ID,
		TenantID:    family.TenantID,
		OrgID:       family.OrgID,
		BlockerCode: string(translationcore.FamilyBlockerPolicyDenied),
		Locale:      locale,
		Details: map[string]any{
			translationcore.FamilyBlockerDetailContentType: family.ContentType,
			translationcore.FamilyBlockerDetailEnvironment: strings.TrimSpace(environment),
			translationcore.FamilyBlockerDetailMessage:     "host policy denied publish",
			translationcore.FamilyBlockerDetailReason:      string(translationcore.FamilyBlockerReasonHostPolicy),
		},
	}}, nil
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

	features := []FeatureKey{FeatureCMS}
	if !options.DisableQueueFeature {
		features = append(features, FeatureTranslationQueue)
	}
	deps := Dependencies{
		FeatureGate:  featureGateFromKeys(features...),
		ActivitySink: activityFeed,
	}
	if len(options.Users) > 0 {
		userStore := NewInMemoryUserStore()
		for _, user := range options.Users {
			if _, err := userStore.CreateUser(context.Background(), user); err != nil {
				t.Fatalf("seed user %q: %v", user.ID, err)
			}
		}
		deps.UserRepository = &inMemoryUserRepoAdapter{store: userStore}
		deps.RoleRepository = &inMemoryRoleRepoAdapter{store: userStore}
	}
	adm := mustNewAdmin(t, translationFamilyScopedTestConfig(), deps)
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:   true,
			PermAdminTranslationsEdit:   true,
			PermAdminTranslationsAssign: true,
			PermAdminTranslationsClaim:  true,
		},
	})
	adm.UseCMS(&NoopCMSContainer{
		widgets: NewInMemoryWidgetService(),
		menus:   NewInMemoryMenuService(),
		content: contentSvc.InMemoryContentService,
	})
	adm.contentSvc = contentSvc
	pagePanelViewPermission := strings.TrimSpace(options.PagePanelViewPermission)
	if pagePanelViewPermission == "" {
		pagePanelViewPermission = PermAdminTranslationsView
	}
	if _, err := adm.RegisterPanel("pages", adm.Panel("pages").
		WithRepository(NewCMSPageRepository(contentSvc)).
		Permissions(PanelPermissions{
			View: pagePanelViewPermission,
		}),
	); err != nil {
		t.Fatalf("register pages panel: %v", err)
	}
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
