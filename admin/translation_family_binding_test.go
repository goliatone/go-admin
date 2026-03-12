package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/families?content_type=pages&readiness_state=blocked&blocker_code=missing_locale&missing_locale=fr&tenant_id=tenant-1&org_id=org-1&environment=production", nil)
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
	if got := toInt(payload["total"]); got != 1 {
		t.Fatalf("expected total=1, got %d", got)
	}
	if got := toString(payload["environment"]); got != "production" {
		t.Fatalf("expected environment production, got %q", got)
	}
	report, _ := payload["report"].(map[string]any)
	summary, _ := report["summary"].(map[string]any)
	if got := toInt(summary["families"]); got != 3 {
		t.Fatalf("expected report families=3, got %d", got)
	}

	items, _ := payload["items"].([]any)
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
	req := httptest.NewRequest(http.MethodGet, "/admin/api/translations/families/tg-page-1?tenant_id=tenant-1&org_id=org-1&environment=production", nil)
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
	if got := toString(payload["family_id"]); got != "tg-page-1" {
		t.Fatalf("expected family_id tg-page-1, got %q", got)
	}
	source, _ := payload["source_variant"].(map[string]any)
	if got := toString(source["locale"]); got != "en" {
		t.Fatalf("expected source locale en, got %q", got)
	}
	if got := toString(source["source_record_id"]); got != "page-1" {
		t.Fatalf("expected source_record_id page-1, got %q", got)
	}

	blockers, _ := payload["blockers"].([]any)
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

	assignments, _ := payload["active_assignments"].([]any)
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

	summary, _ := payload["readiness_summary"].(map[string]any)
	if got := toString(summary["state"]); got != string(translationcore.FamilyReadinessBlocked) {
		t.Fatalf("expected blocked readiness summary, got %q", got)
	}
	if got := toInt(summary["pending_review_count"]); got != 1 {
		t.Fatalf("expected pending_review_count=1, got %d", got)
	}
	if got := toInt(summary["missing_required_locale_count"]); got != 1 {
		t.Fatalf("expected missing_required_locale_count=1, got %d", got)
	}

	publishGate, _ := payload["publish_gate"].(map[string]any)
	if allowed, _ := publishGate["allowed"].(bool); allowed {
		t.Fatalf("expected publish gate blocked")
	}
	if overrideAllowed, _ := publishGate["override_allowed"].(bool); !overrideAllowed {
		t.Fatalf("expected publish override allowed")
	}
	if reviewRequired, _ := publishGate["review_required"].(bool); !reviewRequired {
		t.Fatalf("expected review_required=true")
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
	adapter.Init()
	return adapter.WrappedRouter()
}

func newTranslationFamilyBindingTestRuntime(t *testing.T) *translationFamilyRuntime {
	t.Helper()
	ctx := context.Background()
	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	input := translationservices.BackfillInput{
		Variants: []translationservices.BackfillSourceVariant{
			{
				Scope:              translationservices.Scope{TenantID: "tenant-1", OrgID: "org-1"},
				ContentType:        "pages",
				SourceRecordID:     "page-1",
				TranslationGroupID: "tg-page-1",
				Locale:             "en",
				Fields:             map[string]string{"title": "Page 1", "body": "Hello"},
				Status:             string(translationcore.VariantStatusPublished),
				CreatedAt:          now.Add(-6 * time.Hour),
				UpdatedAt:          now.Add(-6 * time.Hour),
			},
			{
				Scope:              translationservices.Scope{TenantID: "tenant-1", OrgID: "org-1"},
				ContentType:        "pages",
				SourceRecordID:     "page-1-es",
				TranslationGroupID: "tg-page-1",
				Locale:             "es",
				Fields:             map[string]string{"title": "Pagina 1", "body": "Hola"},
				Status:             string(translationcore.VariantStatusInReview),
				CreatedAt:          now.Add(-5 * time.Hour),
				UpdatedAt:          now.Add(-5 * time.Hour),
			},
			{
				Scope:              translationservices.Scope{TenantID: "tenant-1", OrgID: "org-1"},
				ContentType:        "posts",
				SourceRecordID:     "post-1",
				TranslationGroupID: "tg-post-1",
				Locale:             "en",
				Fields:             map[string]string{"title": "Post 1", "body": "Hello"},
				Status:             string(translationcore.VariantStatusPublished),
				CreatedAt:          now.Add(-4 * time.Hour),
				UpdatedAt:          now.Add(-4 * time.Hour),
			},
			{
				Scope:              translationservices.Scope{TenantID: "tenant-1", OrgID: "org-1"},
				ContentType:        "posts",
				SourceRecordID:     "post-1-es",
				TranslationGroupID: "tg-post-1",
				Locale:             "es",
				Fields:             map[string]string{"title": "Post 1 ES", "body": "Hola"},
				Status:             string(translationcore.VariantStatusApproved),
				CreatedAt:          now.Add(-3 * time.Hour),
				UpdatedAt:          now.Add(-3 * time.Hour),
			},
			{
				Scope:              translationservices.Scope{TenantID: "tenant-2", OrgID: "org-9"},
				ContentType:        "pages",
				SourceRecordID:     "page-tenant-2",
				TranslationGroupID: "tg-page-tenant-2",
				Locale:             "en",
				Fields:             map[string]string{"title": "Tenant 2", "body": "Hello"},
				Status:             string(translationcore.VariantStatusPublished),
				CreatedAt:          now.Add(-2 * time.Hour),
				UpdatedAt:          now.Add(-2 * time.Hour),
			},
		},
		Policies: map[string]translationservices.BackfillPolicy{
			"pages": {
				SourceLocale:            "en",
				RequiredLocales:         []string{"es", "fr"},
				RequiredFields:          map[string][]string{"es": {"title", "body"}, "fr": {"title", "body"}},
				ReviewRequired:          true,
				AllowPublishOverride:    true,
				AssignmentLifecycleMode: "single_active_per_locale",
				DefaultWorkScope:        "localization",
			},
			"posts": {
				SourceLocale:         "en",
				RequiredLocales:      []string{"es"},
				RequiredFields:       map[string][]string{"es": {"title", "body"}},
				AllowPublishOverride: false,
			},
		},
	}
	plan, err := translationservices.NewBackfillRunner().BuildPlan(ctx, input)
	if err != nil {
		t.Fatalf("build backfill plan: %v", err)
	}
	store := translationservices.NewInMemoryFamilyStore()
	if err := store.LoadBackfillPlan(plan); err != nil {
		t.Fatalf("load backfill plan: %v", err)
	}
	if err := store.ReplaceAssignments([]translationservices.FamilyAssignment{
		{
			ID:           "asg-open-es",
			FamilyID:     "tg-page-1",
			SourceLocale: "en",
			TargetLocale: "es",
			WorkScope:    "localization",
			Status:       string(translationcore.AssignmentStatusInProgress),
			AssigneeID:   "translator-1",
			Priority:     "high",
			CreatedAt:    now.Add(-90 * time.Minute),
			UpdatedAt:    now.Add(-45 * time.Minute),
		},
		{
			ID:           "asg-approved-fr",
			FamilyID:     "tg-page-1",
			SourceLocale: "en",
			TargetLocale: "fr",
			WorkScope:    "localization",
			Status:       string(translationcore.AssignmentStatusApproved),
			ReviewerID:   "reviewer-1",
			Priority:     "normal",
			CreatedAt:    now.Add(-2 * time.Hour),
			UpdatedAt:    now.Add(-1 * time.Hour),
		},
	}); err != nil {
		t.Fatalf("replace assignments: %v", err)
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
		report:  translationservices.BuildBackfillReport(plan),
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
