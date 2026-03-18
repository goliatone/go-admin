package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strconv"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
)

func TestTranslationMatrixBindingQueryBuildsTypedRowsColumnsAndCellStates(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:           true,
			PermAdminTranslationsEdit:           true,
			translationExchangePermissionExport: true,
		},
	})

	binding := newTranslationFamilyBinding(adm)
	binding.loadRuntime = func(context.Context, string) (*translationFamilyRuntime, error) {
		return newTranslationMatrixTestRuntime(t), nil
	}
	app := newTranslationFamilyTestApp(t, binding)

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/matrix?tenant_id=tenant-1&org_id=org-1&channel=production&locale_limit=4", nil)
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
	data := extractMap(payload["data"])
	meta := extractMap(payload["meta"])
	rows := extractListMaps(data["rows"])
	columns := extractListMaps(data["columns"])
	if got := toInt(meta["total"]); got != 2 {
		t.Fatalf("expected total rows=2, got %d", got)
	}
	if got := len(columns); got != 4 {
		t.Fatalf("expected 4 visible columns, got %d", got)
	}
	if got := toString(columns[0]["locale"]); got != "en" {
		t.Fatalf("expected source locale column first, got %q", got)
	}
	localePolicy := extractListMaps(meta["locale_policy"])
	if len(localePolicy) != 4 {
		t.Fatalf("expected locale policy metadata for four visible locales, got %+v", localePolicy)
	}
	if got := toString(localePolicy[0]["locale"]); got != "en" {
		t.Fatalf("expected source locale policy first, got %q", got)
	}
	if got := toInt(localePolicy[1]["optional_family_count"]); got != 1 {
		t.Fatalf("expected de optional_family_count=1, got %d", got)
	}
	quickActionTargets := extractMap(meta["quick_action_targets"])
	if got := toString(extractMap(quickActionTargets["create_missing"])["endpoint"]); got == "" {
		t.Fatalf("expected create_missing quick-action endpoint, got empty")
	}
	if got := toString(extractMap(quickActionTargets["family_detail"])["route"]); got != "translations.families.id" {
		t.Fatalf("expected family detail quick-action target route, got %q", got)
	}

	rowByID := map[string]map[string]any{}
	for _, row := range rows {
		rowByID[toString(row["family_id"])] = row
	}
	if len(rowByID) != 2 {
		t.Fatalf("expected two scoped matrix rows, got %+v", rows)
	}

	pagesCells := extractMap(rowByID["tg-page-matrix-1"]["cells"])
	if got := toString(extractMap(pagesCells["es"])["state"]); got != translationMatrixCellStateInProgress {
		t.Fatalf("expected pages/es state in_progress, got %q", got)
	}
	if href := toString(extractMap(extractMap(extractMap(pagesCells["es"])["quick_actions"])["open"])["href"]); href == "" {
		t.Fatalf("expected pages/es open quick action href")
	}
	frCell := extractMap(pagesCells["fr"])
	if got := toString(frCell["state"]); got != translationMatrixCellStateFallback {
		t.Fatalf("expected pages/fr state fallback, got %q", got)
	}
	if fallback, _ := frCell["fallback"].(bool); !fallback {
		t.Fatalf("expected pages/fr fallback=true, got %+v", frCell)
	}
	frCreate := extractMap(extractMap(frCell["quick_actions"])["create"])
	if enabled, _ := frCreate["enabled"].(bool); !enabled {
		t.Fatalf("expected pages/fr create quick action enabled, got %+v", frCreate)
	}
	if got := toString(frCreate["endpoint"]); got == "" {
		t.Fatalf("expected pages/fr create quick action endpoint")
	}
	if got := toString(extractMap(pagesCells["de"])["state"]); got != translationMatrixCellStateNotRequired {
		t.Fatalf("expected pages/de state not_required, got %q", got)
	}
	deCreate := extractMap(extractMap(extractMap(pagesCells["de"])["quick_actions"])["create"])
	if enabled, _ := deCreate["enabled"].(bool); enabled {
		t.Fatalf("expected pages/de create quick action disabled, got %+v", deCreate)
	}
	if code := toString(deCreate["reason_code"]); code != ActionDisabledReasonCodeInvalidStatus {
		t.Fatalf("expected pages/de disabled reason code %q, got %q", ActionDisabledReasonCodeInvalidStatus, code)
	}

	newsCells := extractMap(rowByID["tg-news-matrix-1"]["cells"])
	if got := toString(extractMap(newsCells["es"])["state"]); got != translationMatrixCellStateReady {
		t.Fatalf("expected news/es state ready, got %q", got)
	}
	if got := toString(extractMap(newsCells["fr"])["state"]); got != translationMatrixCellStateInReview {
		t.Fatalf("expected news/fr state in_review, got %q", got)
	}
	if href := toString(extractMap(extractMap(extractMap(newsCells["fr"])["quick_actions"])["open"])["href"]); href == "" {
		t.Fatalf("expected news/fr open quick action href")
	}
	rowLinks := extractMap(rowByID["tg-page-matrix-1"]["links"])
	if href := toString(extractMap(rowLinks["family"])["href"]); href == "" {
		t.Fatalf("expected family quick link on matrix row")
	}

	selection := extractMap(data["selection"])
	actions := extractMap(selection["bulk_actions"])
	if enabled, _ := extractMap(actions[translationMatrixBulkActionCreateMissing])["enabled"].(bool); !enabled {
		t.Fatalf("expected create_missing bulk action enabled")
	}
	if enabled, _ := extractMap(actions[translationMatrixBulkActionExportSelected])["enabled"].(bool); !enabled {
		t.Fatalf("expected export_selected bulk action enabled")
	}
}

func TestTranslationMatrixBindingFiltersColumnsRowsAndScope(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	binding := newTranslationFamilyBinding(adm)
	binding.loadRuntime = func(context.Context, string) (*translationFamilyRuntime, error) {
		return newTranslationMatrixTestRuntime(t), nil
	}
	app := newTranslationFamilyTestApp(t, binding)

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/matrix?tenant_id=tenant-1&org_id=org-1&channel=production&content_type=pages&blocker_code=missing_locale&locales=fr,de", nil)
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
	data := extractMap(payload["data"])
	rows := extractListMaps(data["rows"])
	columns := extractListMaps(data["columns"])
	if len(rows) != 1 || toString(rows[0]["family_id"]) != "tg-page-matrix-1" {
		t.Fatalf("expected filtered pages row only, got %+v", rows)
	}
	if len(columns) != 2 || toString(columns[0]["locale"]) != "de" || toString(columns[1]["locale"]) != "fr" {
		t.Fatalf("expected requested locale columns [de fr], got %+v", columns)
	}
}

func TestTranslationMatrixBindingIncludesMissingCellFixtureState(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView: true,
			PermAdminTranslationsEdit: true,
		},
	})
	binding := newTranslationFamilyBinding(adm)
	binding.loadRuntime = func(context.Context, string) (*translationFamilyRuntime, error) {
		return newTranslationMatrixTestRuntime(t), nil
	}
	app := newTranslationFamilyTestApp(t, binding)

	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/matrix?tenant_id=tenant-1&org_id=org-1&channel=production&locales=it", nil)
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
	rows := extractListMaps(extractMap(payload["data"])["rows"])
	if len(rows) != 2 {
		t.Fatalf("expected two rows in missing-cell fixture query, got %+v", rows)
	}
	rowByID := map[string]map[string]any{}
	for _, row := range rows {
		rowByID[toString(row["family_id"])] = row
	}
	pageCell := extractMap(extractMap(rowByID["tg-page-matrix-1"]["cells"])["it"])
	if got := toString(pageCell["state"]); got != translationMatrixCellStateMissing {
		t.Fatalf("expected pages/it state missing, got %q", got)
	}
	create := extractMap(extractMap(pageCell["quick_actions"])["create"])
	if enabled, _ := create["enabled"].(bool); !enabled {
		t.Fatalf("expected pages/it create quick action enabled, got %+v", create)
	}
}

func TestTranslationMatrixBindingCreateMissingBulkReturnsTypedSummary(t *testing.T) {
	fixture := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
		ReviewRequired:  true,
	})

	status, payload := doTranslationMatrixJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/matrix/actions/create-missing?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"family_ids":             []string{"tg-page-1"},
		"locales":                []string{"fr"},
		"auto_create_assignment": true,
		"assignee_id":            "translator-7",
		"priority":               "high",
		"due_date":               "2026-02-20T15:00:00Z",
	}, nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	data := extractMap(payload["data"])
	if got := toString(data["action"]); got != translationMatrixBulkActionCreateMissing {
		t.Fatalf("expected create_missing action, got %q", got)
	}
	summary := extractMap(data["summary"])
	if got := toInt(summary["created"]); got != 1 {
		t.Fatalf("expected summary.created=1, got %d", got)
	}
	results := extractListMaps(data["results"])
	if len(results) != 1 {
		t.Fatalf("expected one family result, got %+v", results)
	}
	if got := toString(results[0]["status"]); got != translationMatrixBulkResultStatusCreated {
		t.Fatalf("expected created family result, got %q", got)
	}
	created := extractListMaps(results[0]["created"])
	if len(created) != 1 || toString(created[0]["locale"]) != "fr" {
		t.Fatalf("expected created locale fr, got %+v", created)
	}
	if got := toString(created[0]["assignment_id"]); got == "" {
		t.Fatalf("expected seeded assignment id, got empty")
	}

	status, payload = doTranslationMatrixJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/matrix/actions/create-missing?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"family_ids": []string{"tg-page-1"},
		"locales":    []string{"fr"},
	}, nil)
	if status != http.StatusOK {
		t.Fatalf("repeat status=%d want=200 payload=%+v", status, payload)
	}
	summary = extractMap(extractMap(payload["data"])["summary"])
	if got := toInt(summary["skipped"]); got != 1 {
		t.Fatalf("expected duplicate request to increment skipped, got %d", got)
	}
}

func TestTranslationMatrixBindingExportSelectedReturnsPreviewAndPermissionChecks(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsView:           true,
			translationExchangePermissionExport: true,
		},
	})
	binding := newTranslationFamilyBinding(adm)
	binding.loadRuntime = func(context.Context, string) (*translationFamilyRuntime, error) {
		return newTranslationMatrixTestRuntime(t), nil
	}
	app := newTranslationFamilyTestApp(t, binding)

	status, payload := doTranslationMatrixJSONRequest(t, app, http.MethodPost, "/admin/api/translations/matrix/actions/export-selected?tenant_id=tenant-1&org_id=org-1&channel=production", map[string]any{
		"family_ids":          []string{"tg-page-matrix-1", "tg-news-matrix-1"},
		"locales":             []string{"es", "fr"},
		"include_source_hash": true,
		"format":              "json",
	}, nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	data := extractMap(payload["data"])
	summary := extractMap(data["summary"])
	if got := toInt(summary["export_ready"]); got != 2 {
		t.Fatalf("expected export_ready=2, got %d", got)
	}
	exportRequest := extractMap(data["export_request"])
	if got := toString(exportRequest["endpoint"]); got == "" {
		t.Fatalf("expected export_request endpoint, got empty")
	}
	filter := extractMap(exportRequest["filter"])
	if locales := toStringSlice(filter["target_locales"]); len(locales) != 2 || locales[0] != "es" || locales[1] != "fr" {
		t.Fatalf("expected target_locales [es fr], got %+v", locales)
	}
	previewRows := extractListMaps(data["preview_rows"])
	if len(previewRows) == 0 {
		t.Fatalf("expected preview rows")
	}

	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	status, payload = doTranslationMatrixJSONRequest(t, app, http.MethodPost, "/admin/api/translations/matrix/actions/export-selected?tenant_id=tenant-1&org_id=org-1&channel=production", map[string]any{
		"family_ids": []string{"tg-page-matrix-1"},
	}, nil)
	if status != http.StatusForbidden {
		t.Fatalf("expected permission denied, got status=%d payload=%+v", status, payload)
	}
}

func TestTranslationMatrixBindingMatrixViewportP95UnderTarget(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{PermAdminTranslationsView: true},
	})
	binding := newTranslationFamilyBinding(adm)
	binding.loadRuntime = func(context.Context, string) (*translationFamilyRuntime, error) {
		return newTranslationMatrixPerformanceRuntime(t), nil
	}
	app := newTranslationFamilyTestApp(t, binding)

	samples := make([]time.Duration, 0, 20)
	for range 20 {
		started := time.Now()
		req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/matrix?tenant_id=tenant-1&org_id=org-1&channel=production&per_page=100&locale_limit=20", nil)
		resp, err := app.Test(req, 5_000)
		if err != nil {
			t.Fatalf("request error: %v", err)
		}
		_ = resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status=%d want=200", resp.StatusCode)
		}
		samples = append(samples, time.Since(started))
	}
	if p95 := translationMatrixPercentile95(samples); p95 > time.Duration(translationMatrixLatencyTargetMS)*time.Millisecond {
		t.Fatalf("matrix p95 %v exceeds %dms target", p95, translationMatrixLatencyTargetMS)
	}
}

func doTranslationMatrixJSONRequest(t *testing.T, app *fiber.App, method, path string, body map[string]any, headers map[string]string) (int, map[string]any) {
	t.Helper()
	var reader *bytes.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		reader = bytes.NewReader(raw)
	} else {
		reader = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close()
	payload := map[string]any{}
	_ = json.NewDecoder(resp.Body).Decode(&payload)
	return resp.StatusCode, payload
}

func newTranslationMatrixTestRuntime(t *testing.T) *translationFamilyRuntime {
	t.Helper()
	store := translationservices.NewInMemoryFamilyStore()
	now := time.Date(2026, 2, 18, 9, 0, 0, 0, time.UTC)
	families := []translationservices.FamilyRecord{
		{
			ID:              "tg-page-matrix-1",
			TenantID:        "tenant-1",
			OrgID:           "org-1",
			ContentType:     "pages",
			SourceLocale:    "en",
			SourceVariantID: "variant-page-en",
			ReadinessState:  string(translationcore.FamilyReadinessBlocked),
			BlockerCodes:    []string{string(translationcore.FamilyBlockerMissingLocale), string(translationcore.FamilyBlockerMissingField)},
			Policy: translationservices.FamilyPolicy{
				ContentType:     "pages",
				Environment:     "production",
				SourceLocale:    "en",
				RequiredLocales: []string{"es", "fr", "it"},
			},
			Variants: []translationservices.FamilyVariant{
				{ID: "variant-page-en", FamilyID: "tg-page-matrix-1", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: string(translationcore.VariantStatusPublished), IsSource: true, SourceRecordID: "page-1", Fields: map[string]string{"title": "Page 1", "body": "Hello"}, UpdatedAt: now},
				{ID: "variant-page-es", FamilyID: "tg-page-matrix-1", TenantID: "tenant-1", OrgID: "org-1", Locale: "es", Status: string(translationcore.VariantStatusDraft), SourceRecordID: "page-1-es", Fields: map[string]string{"title": "", "body": "Hola"}, UpdatedAt: now},
			},
			Assignments: []translationservices.FamilyAssignment{
				{ID: "asg-page-es", FamilyID: "tg-page-matrix-1", TenantID: "tenant-1", OrgID: "org-1", TargetLocale: "es", SourceLocale: "en", Status: string(translationcore.AssignmentStatusInProgress), AssigneeID: "translator-1", WorkScope: "localization", UpdatedAt: now},
			},
			Blockers: []translationservices.FamilyBlocker{
				{ID: "blk-page-es", FamilyID: "tg-page-matrix-1", TenantID: "tenant-1", OrgID: "org-1", BlockerCode: string(translationcore.FamilyBlockerMissingField), Locale: "es"},
				{ID: "blk-page-fr", FamilyID: "tg-page-matrix-1", TenantID: "tenant-1", OrgID: "org-1", BlockerCode: string(translationcore.FamilyBlockerMissingLocale), Locale: "fr", Details: map[string]any{"fallback_used": true}},
			},
		},
		{
			ID:              "tg-news-matrix-1",
			TenantID:        "tenant-1",
			OrgID:           "org-1",
			ContentType:     "news",
			SourceLocale:    "en",
			SourceVariantID: "variant-news-en",
			ReadinessState:  string(translationcore.FamilyReadinessBlocked),
			BlockerCodes:    []string{string(translationcore.FamilyBlockerPendingReview)},
			Policy: translationservices.FamilyPolicy{
				ContentType:     "news",
				Environment:     "production",
				SourceLocale:    "en",
				RequiredLocales: []string{"es", "fr"},
			},
			Variants: []translationservices.FamilyVariant{
				{ID: "variant-news-en", FamilyID: "tg-news-matrix-1", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: string(translationcore.VariantStatusPublished), IsSource: true, SourceRecordID: "news-1", Fields: map[string]string{"title": "News 1", "body": "Latest"}, UpdatedAt: now},
				{ID: "variant-news-de", FamilyID: "tg-news-matrix-1", TenantID: "tenant-1", OrgID: "org-1", Locale: "de", Status: string(translationcore.VariantStatusApproved), SourceRecordID: "news-1-de", Fields: map[string]string{"title": "Nachrichten 1", "body": "Aktuell"}, UpdatedAt: now},
				{ID: "variant-news-es", FamilyID: "tg-news-matrix-1", TenantID: "tenant-1", OrgID: "org-1", Locale: "es", Status: string(translationcore.VariantStatusApproved), SourceRecordID: "news-1-es", Fields: map[string]string{"title": "Noticias 1", "body": "Actual"}, UpdatedAt: now},
				{ID: "variant-news-fr", FamilyID: "tg-news-matrix-1", TenantID: "tenant-1", OrgID: "org-1", Locale: "fr", Status: string(translationcore.VariantStatusInReview), SourceRecordID: "news-1-fr", Fields: map[string]string{"title": "Nouvelles 1", "body": "Actuel"}, UpdatedAt: now},
			},
			Assignments: []translationservices.FamilyAssignment{
				{ID: "asg-news-fr", FamilyID: "tg-news-matrix-1", TenantID: "tenant-1", OrgID: "org-1", TargetLocale: "fr", SourceLocale: "en", Status: string(translationcore.AssignmentStatusInReview), ReviewerID: "reviewer-1", WorkScope: "localization", UpdatedAt: now},
			},
			Blockers: []translationservices.FamilyBlocker{
				{ID: "blk-news-fr", FamilyID: "tg-news-matrix-1", TenantID: "tenant-1", OrgID: "org-1", BlockerCode: string(translationcore.FamilyBlockerPendingReview), Locale: "fr"},
			},
		},
		{
			ID:              "tg-hidden-matrix-1",
			TenantID:        "tenant-2",
			OrgID:           "org-9",
			ContentType:     "pages",
			SourceLocale:    "en",
			SourceVariantID: "variant-hidden-en",
			ReadinessState:  string(translationcore.FamilyReadinessReady),
			Policy: translationservices.FamilyPolicy{
				ContentType:     "pages",
				Environment:     "production",
				SourceLocale:    "en",
				RequiredLocales: []string{"es"},
			},
			Variants: []translationservices.FamilyVariant{
				{ID: "variant-hidden-en", FamilyID: "tg-hidden-matrix-1", TenantID: "tenant-2", OrgID: "org-9", Locale: "en", Status: string(translationcore.VariantStatusPublished), IsSource: true, SourceRecordID: "hidden-1", Fields: map[string]string{"title": "Hidden", "body": "Hidden"}, UpdatedAt: now},
				{ID: "variant-hidden-es", FamilyID: "tg-hidden-matrix-1", TenantID: "tenant-2", OrgID: "org-9", Locale: "es", Status: string(translationcore.VariantStatusApproved), SourceRecordID: "hidden-1-es", Fields: map[string]string{"title": "Oculto", "body": "Oculto"}, UpdatedAt: now},
			},
		},
	}
	for _, family := range families {
		if err := store.SaveFamily(context.Background(), family); err != nil {
			t.Fatalf("save family %q: %v", family.ID, err)
		}
	}
	service := &translationservices.FamilyService{
		Store: store,
		Policies: translationservices.PolicyService{
			Resolver: translationservices.StaticPolicyResolver{Policies: map[string]translationservices.FamilyPolicy{
				"pages": {
					ContentType:     "pages",
					Environment:     "production",
					SourceLocale:    "en",
					RequiredLocales: []string{"es", "fr", "it"},
					RequiredFields:  map[string][]string{"es": {"title", "body"}, "fr": {"title", "body"}, "it": {"title", "body"}},
				},
				"news": {
					ContentType:     "news",
					Environment:     "production",
					SourceLocale:    "en",
					RequiredLocales: []string{"es", "fr"},
					RequiredFields:  map[string][]string{"es": {"title", "body"}, "fr": {"title", "body"}},
				},
			}},
		},
	}
	if _, err := service.RecomputeAll(context.Background(), "production"); err != nil {
		t.Fatalf("recompute matrix families: %v", err)
	}
	return &translationFamilyRuntime{
		service: service,
		report: translationRuntimeReport{
			Checksum: "matrix-test-runtime",
			Summary:  translationRuntimeReportSummary{Families: len(families), Variants: 8, Blockers: 3},
		},
	}
}

func newTranslationMatrixPerformanceRuntime(t *testing.T) *translationFamilyRuntime {
	t.Helper()
	store := translationservices.NewInMemoryFamilyStore()
	locales := []string{"en", "es", "fr", "de", "it", "pt", "nl", "sv", "pl", "cs", "da", "fi", "no", "ja", "ko", "zh", "ar", "he", "tr", "uk"}
	now := time.Date(2026, 2, 18, 9, 0, 0, 0, time.UTC)
	for index := range 100 {
		familyID := "tg-perf-" + strconv.Itoa(index)
		variants := []translationservices.FamilyVariant{
			{
				ID:             familyID + "-en",
				FamilyID:       familyID,
				TenantID:       "tenant-1",
				OrgID:          "org-1",
				Locale:         "en",
				Status:         string(translationcore.VariantStatusPublished),
				IsSource:       true,
				SourceRecordID: familyID + "-source",
				Fields:         map[string]string{"title": "Title", "body": "Body"},
				UpdatedAt:      now,
			},
		}
		assignments := []translationservices.FamilyAssignment{}
		blockers := []translationservices.FamilyBlocker{}
		for localeIndex, locale := range locales[1:] {
			status := string(translationcore.VariantStatusApproved)
			switch localeIndex % 4 {
			case 0:
				status = string(translationcore.VariantStatusDraft)
				assignments = append(assignments, translationservices.FamilyAssignment{
					ID:           familyID + "-asg-" + locale,
					FamilyID:     familyID,
					TenantID:     "tenant-1",
					OrgID:        "org-1",
					TargetLocale: locale,
					SourceLocale: "en",
					Status:       string(translationcore.AssignmentStatusInProgress),
					UpdatedAt:    now,
				})
				blockers = append(blockers, translationservices.FamilyBlocker{
					ID:          familyID + "-blk-" + locale,
					FamilyID:    familyID,
					TenantID:    "tenant-1",
					OrgID:       "org-1",
					BlockerCode: string(translationcore.FamilyBlockerMissingField),
					Locale:      locale,
				})
			case 1:
				status = string(translationcore.VariantStatusInReview)
				assignments = append(assignments, translationservices.FamilyAssignment{
					ID:           familyID + "-asg-review-" + locale,
					FamilyID:     familyID,
					TenantID:     "tenant-1",
					OrgID:        "org-1",
					TargetLocale: locale,
					SourceLocale: "en",
					Status:       string(translationcore.AssignmentStatusInReview),
					UpdatedAt:    now,
				})
				blockers = append(blockers, translationservices.FamilyBlocker{
					ID:          familyID + "-blk-review-" + locale,
					FamilyID:    familyID,
					TenantID:    "tenant-1",
					OrgID:       "org-1",
					BlockerCode: string(translationcore.FamilyBlockerPendingReview),
					Locale:      locale,
				})
			}
			variants = append(variants, translationservices.FamilyVariant{
				ID:             familyID + "-" + locale,
				FamilyID:       familyID,
				TenantID:       "tenant-1",
				OrgID:          "org-1",
				Locale:         locale,
				Status:         status,
				SourceRecordID: familyID + "-" + locale,
				Fields:         map[string]string{"title": "Title " + locale, "body": "Body " + locale},
				UpdatedAt:      now,
			})
		}
		family := translationservices.FamilyRecord{
			ID:              familyID,
			TenantID:        "tenant-1",
			OrgID:           "org-1",
			ContentType:     "pages",
			SourceLocale:    "en",
			SourceVariantID: familyID + "-en",
			ReadinessState:  string(translationcore.FamilyReadinessBlocked),
			BlockerCodes:    translationMatrixBlockerCodes(blockers),
			Policy: translationservices.FamilyPolicy{
				ContentType:     "pages",
				Environment:     "production",
				SourceLocale:    "en",
				RequiredLocales: locales[1:],
			},
			Variants:    variants,
			Assignments: assignments,
			Blockers:    blockers,
		}
		if err := store.SaveFamily(context.Background(), family); err != nil {
			t.Fatalf("save performance family %q: %v", familyID, err)
		}
	}
	service := &translationservices.FamilyService{
		Store: store,
		Policies: translationservices.PolicyService{
			Resolver: translationservices.StaticPolicyResolver{Policies: map[string]translationservices.FamilyPolicy{
				"pages": {
					ContentType:     "pages",
					Environment:     "production",
					SourceLocale:    "en",
					RequiredLocales: locales[1:],
					RequiredFields: map[string][]string{
						"es": {"title", "body"},
						"fr": {"title", "body"},
					},
				},
			}},
		},
	}
	if _, err := service.RecomputeAll(context.Background(), "production"); err != nil {
		t.Fatalf("recompute performance matrix families: %v", err)
	}
	return &translationFamilyRuntime{
		service: service,
		report: translationRuntimeReport{
			Checksum: "matrix-performance-runtime",
			Summary:  translationRuntimeReportSummary{Families: 100, Variants: 2_000},
		},
	}
}

func translationMatrixPercentile95(samples []time.Duration) time.Duration {
	if len(samples) == 0 {
		return 0
	}
	cloned := append([]time.Duration{}, samples...)
	slices.Sort(cloned)
	index := max(int(float64(len(cloned)-1)*0.95), 0)
	if index >= len(cloned) {
		index = len(cloned) - 1
	}
	return cloned[index]
}
