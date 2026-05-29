package services

import (
	"context"
	"slices"
	"strconv"
	"strings"
	"testing"
	"time"

	translationcore "github.com/goliatone/go-admin/translations/core"
)

func TestFamilyServiceRecomputeOrdersBlockersAndMaterializesCounters(t *testing.T) {
	store := NewInMemoryFamilyStore()
	requireNoErr(t, seedFamilyStore(store, FamilyRecord{
		ID:              "family-1",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "variant-en",
		Variants: []FamilyVariant{
			{ID: "variant-en", FamilyID: "family-1", Locale: "en", Status: string(translationcore.VariantStatusPublished), IsSource: true, Fields: map[string]string{"title": "Home", "path": "/home"}},
			{ID: "variant-es", FamilyID: "family-1", Locale: "es", Status: string(translationcore.VariantStatusDraft), Fields: map[string]string{"title": "", "path": "/es/home"}},
		},
	}))

	svc := FamilyService{
		Store: store,
		Policies: PolicyService{
			Resolver: StaticPolicyResolver{Policies: map[string]FamilyPolicy{
				"pages": {
					ContentType:          "pages",
					SourceLocale:         "en",
					RequiredLocales:      []string{"en", "es", "fr"},
					RequiredFields:       map[string][]string{"en": {"title", "path"}, "es": {"title", "path"}, "fr": {"title", "path"}},
					ReviewRequired:       true,
					AllowPublishOverride: true,
				},
			}},
		},
	}

	family, err := svc.Recompute(context.Background(), "family-1", "production")
	requireNoErr(t, err)

	if family.ReadinessState != string(translationcore.FamilyReadinessBlocked) {
		t.Fatalf("expected blocked readiness, got %q", family.ReadinessState)
	}
	if family.MissingRequiredLocaleCount != 1 {
		t.Fatalf("expected missing locale count 1, got %d", family.MissingRequiredLocaleCount)
	}
	if family.PendingReviewCount != 1 {
		t.Fatalf("expected pending review count 1, got %d", family.PendingReviewCount)
	}
	if got := strings.Join(family.BlockerCodes, ","); got != "missing_locale,missing_field,pending_review" {
		t.Fatalf("unexpected blocker codes ordering: %s", got)
	}
	if len(family.Blockers) != 3 {
		t.Fatalf("expected 3 blockers, got %d", len(family.Blockers))
	}
	if family.Blockers[0].BlockerCode != string(translationcore.FamilyBlockerMissingLocale) || family.Blockers[0].Locale != "fr" {
		t.Fatalf("expected missing_locale blocker first, got %+v", family.Blockers[0])
	}
	if family.Blockers[1].BlockerCode != string(translationcore.FamilyBlockerMissingField) || family.Blockers[1].Locale != "es" || family.Blockers[1].FieldPath != "title" {
		t.Fatalf("expected missing_field blocker second, got %+v", family.Blockers[1])
	}
	if family.Blockers[2].BlockerCode != string(translationcore.FamilyBlockerPendingReview) || family.Blockers[2].Locale != "es" {
		t.Fatalf("expected pending_review blocker third, got %+v", family.Blockers[2])
	}
}

func TestFamilyServicePolicyOverrideAndSourceLocaleSelection(t *testing.T) {
	store := NewInMemoryFamilyStore()
	requireNoErr(t, seedFamilyStore(store, FamilyRecord{
		ID:          "family-override",
		ContentType: "posts",
		Variants: []FamilyVariant{
			{ID: "variant-es", FamilyID: "family-override", Locale: "es", Status: string(translationcore.VariantStatusPublished), IsSource: true, Fields: map[string]string{"title": "Articulo", "path": "/es/post", "excerpt": "Resumen"}},
			{ID: "variant-fr", FamilyID: "family-override", Locale: "fr", Status: string(translationcore.VariantStatusPublished), SourceHashAtLastSync: "stale-source-hash", Fields: map[string]string{"title": "Article FR", "path": "/fr/post", "excerpt": "Resume"}},
		},
	}))

	svc := FamilyService{
		Store: store,
		Policies: PolicyService{
			Resolver: StaticPolicyResolver{Policies: map[string]FamilyPolicy{
				"posts": {
					ContentType:          "posts",
					SourceLocale:         "en",
					RequiredLocales:      []string{"es", "fr"},
					RequiredFields:       map[string][]string{"es": {"title", "path", "excerpt"}, "fr": {"title", "path", "excerpt"}},
					ReviewRequired:       false,
					AllowPublishOverride: true,
				},
			}},
		},
	}

	family, err := svc.Recompute(context.Background(), "family-override", "staging")
	requireNoErr(t, err)

	if family.SourceLocale != "es" || family.SourceVariantID != "variant-es" {
		t.Fatalf("expected fallback source locale selection to choose es, got locale=%q variant=%q", family.SourceLocale, family.SourceVariantID)
	}
	if !family.Policy.AllowPublishOverride {
		t.Fatalf("expected allow_publish_override=true in policy")
	}
	if family.OutdatedLocaleCount != 1 {
		t.Fatalf("expected outdated locale count 1, got %d", family.OutdatedLocaleCount)
	}
	if !familyHasBlockerCode(family, string(translationcore.FamilyBlockerOutdatedSource)) {
		t.Fatalf("expected outdated_source blocker, got %+v", family.Blockers)
	}
}

func TestFamilyServiceIncludesCustomPolicyBlockers(t *testing.T) {
	store := NewInMemoryFamilyStore()
	requireNoErr(t, seedFamilyStore(store, FamilyRecord{
		ID:              "family-custom-policy",
		ContentType:     "pages",
		SourceLocale:    "en",
		SourceVariantID: "variant-en",
		Variants: []FamilyVariant{
			{ID: "variant-en", FamilyID: "family-custom-policy", Locale: "en", Status: string(translationcore.VariantStatusPublished), IsSource: true, Fields: map[string]string{"title": "Home"}},
		},
	}))

	resolver := customPolicyBlockerResolver{
		policy: FamilyPolicy{
			ContentType:     "pages",
			SourceLocale:    "en",
			RequiredLocales: []string{"en"},
		},
		blockers: []FamilyBlocker{{
			ID:          "custom-policy-blocker",
			FamilyID:    "family-custom-policy",
			BlockerCode: string(translationcore.FamilyBlockerPolicyDenied),
			Locale:      "en",
			Details:     map[string]any{"reason": "route collision"},
		}},
	}
	svc := FamilyService{
		Store:    store,
		Policies: PolicyService{Resolver: resolver},
	}

	family, err := svc.Recompute(context.Background(), "family-custom-policy", "production")
	requireNoErr(t, err)

	if family.ReadinessState != string(translationcore.FamilyReadinessBlocked) {
		t.Fatalf("expected custom blocker to block family, got %q", family.ReadinessState)
	}
	if got := strings.Join(family.BlockerCodes, ","); got != "policy_denied" {
		t.Fatalf("unexpected blocker codes: %s", got)
	}
	if len(family.Blockers) != 1 || family.Blockers[0].Details["reason"] != "route collision" {
		t.Fatalf("unexpected blockers: %+v", family.Blockers)
	}
}

func TestFamilyServiceListAndDetailRespectScopeFilters(t *testing.T) {
	store := NewInMemoryFamilyStore()
	requireNoErr(t, seedFamilyStore(
		store,
		FamilyRecord{
			ID:              "global-family",
			ContentType:     "pages",
			SourceLocale:    "en",
			SourceVariantID: "global-en",
			Variants:        []FamilyVariant{{ID: "global-en", FamilyID: "global-family", Locale: "en", Status: string(translationcore.VariantStatusPublished), IsSource: true, Fields: map[string]string{"title": "Home", "path": "/"}}},
		},
		FamilyRecord{
			ID:              "tenant-family",
			TenantID:        "tenant-1",
			OrgID:           "org-1",
			ContentType:     "news",
			SourceLocale:    "en",
			SourceVariantID: "tenant-en",
			Variants:        []FamilyVariant{{ID: "tenant-en", FamilyID: "tenant-family", TenantID: "tenant-1", OrgID: "org-1", Locale: "en", Status: string(translationcore.VariantStatusPublished), IsSource: true, Fields: map[string]string{"title": "News", "path": "/news"}}},
		},
	))

	svc := FamilyService{
		Store: store,
		Policies: PolicyService{
			Resolver: StaticPolicyResolver{Policies: map[string]FamilyPolicy{
				"pages": {ContentType: "pages", SourceLocale: "en", RequiredLocales: []string{"en"}, RequiredFields: map[string][]string{"en": {"title", "path"}}},
				"news":  {ContentType: "news", SourceLocale: "en", RequiredLocales: []string{"en", "es"}, RequiredFields: map[string][]string{"en": {"title", "path"}, "es": {"title", "path"}}},
			}},
		},
	}

	global, err := svc.List(context.Background(), ListFamiliesInput{Scope: Scope{}, Page: 1, PerPage: 20})
	requireNoErr(t, err)
	if global.Total != 1 || len(global.Items) != 1 || global.Items[0].ID != "global-family" {
		t.Fatalf("expected only global family in global scope, got %+v", global.Items)
	}

	scoped, err := svc.List(context.Background(), ListFamiliesInput{
		Scope:         Scope{TenantID: "tenant-1", OrgID: "org-1"},
		MissingLocale: "es",
		Page:          1,
		PerPage:       20,
	})
	requireNoErr(t, err)
	if scoped.Total != 1 || scoped.Items[0].ID != "tenant-family" {
		t.Fatalf("expected scoped tenant family, got %+v", scoped.Items)
	}

	if _, detailOK, detailErr := svc.Detail(context.Background(), GetFamilyInput{Scope: Scope{}, FamilyID: "tenant-family"}); detailErr != nil || detailOK {
		t.Fatalf("expected cross-scope detail access denied, ok=%v err=%v", detailOK, detailErr)
	}

	detail, ok, err := svc.Detail(context.Background(), GetFamilyInput{Scope: Scope{TenantID: "tenant-1", OrgID: "org-1"}, FamilyID: "tenant-family"})
	requireNoErr(t, err)
	if !ok {
		t.Fatalf("expected scoped detail access")
	}
	if detail.ReadinessState != string(translationcore.FamilyReadinessBlocked) {
		t.Fatalf("expected tenant family blocked by missing locale, got %q", detail.ReadinessState)
	}
}

func TestFamilyServiceListUsesQueryStoreWithoutRecomputeAll(t *testing.T) {
	store := &queryFamilyStore{
		result: ListFamiliesResult{
			Items: []FamilyRecord{{ID: "family-query", TenantID: "tenant-1", OrgID: "org-1", ContentType: "pages"}},
			Total: 1,
		},
	}
	svc := FamilyService{
		Store: store,
		Policies: PolicyService{
			Resolver: StaticPolicyResolver{Policies: map[string]FamilyPolicy{
				"pages": {
					ContentType:      "pages",
					SourceLocale:     "en",
					RequiredLocales:  []string{"en", "es"},
					DefaultWorkScope: "localization",
				},
			}},
		},
	}

	result, err := svc.List(context.Background(), ListFamiliesInput{
		Scope:   Scope{TenantID: "tenant-1", OrgID: "org-1"},
		Page:    0,
		PerPage: 500,
	})
	if err != nil {
		t.Fatalf("list families: %v", err)
	}
	if store.familiesCalls != 0 {
		t.Fatalf("expected query store path to avoid Families/RecomputeAll, got %d calls", store.familiesCalls)
	}
	if store.queryCalls != 1 {
		t.Fatalf("expected one query call, got %d", store.queryCalls)
	}
	if result.Page != 1 || result.PerPage != 200 {
		t.Fatalf("expected clamped pagination page=1 per_page=200, got page=%d per_page=%d", result.Page, result.PerPage)
	}
	if len(result.Items) != 1 || result.Items[0].ID != "family-query" {
		t.Fatalf("unexpected items: %+v", result.Items)
	}
	if got := result.Items[0].Policy.RequiredLocales; len(got) != 2 || got[0] != "en" || got[1] != "es" {
		t.Fatalf("expected optimized list row to include policy required locales, got %+v", got)
	}
	if got := result.Items[0].Policy.DefaultWorkScope; got != "localization" {
		t.Fatalf("expected optimized list row policy work scope, got %q", got)
	}
}

type queryFamilyStore struct {
	result        ListFamiliesResult
	queryCalls    int
	familiesCalls int
}

func (s *queryFamilyStore) ListFamiliesQuery(_ context.Context, input ListFamiliesInput) (ListFamiliesResult, error) {
	s.queryCalls++
	out := s.result
	out.Page = input.Page
	out.PerPage = input.PerPage
	return out, nil
}

func (s *queryFamilyStore) Families(context.Context) ([]FamilyRecord, error) {
	s.familiesCalls++
	return nil, nil
}

func (s *queryFamilyStore) Family(context.Context, string) (FamilyRecord, bool, error) {
	return FamilyRecord{}, false, nil
}

func (s *queryFamilyStore) SaveFamily(context.Context, FamilyRecord) error {
	return nil
}

type customPolicyBlockerResolver struct {
	policy   FamilyPolicy
	blockers []FamilyBlocker
}

func (r customPolicyBlockerResolver) ResolvePolicy(_ context.Context, contentType, environment string) (FamilyPolicy, bool, error) {
	if !strings.EqualFold(strings.TrimSpace(contentType), r.policy.ContentType) {
		return FamilyPolicy{}, false, nil
	}
	policy := r.policy
	if policy.Environment == "" {
		policy.Environment = strings.TrimSpace(environment)
	}
	return policy, true, nil
}

func (r customPolicyBlockerResolver) ResolvePolicyBlockers(_ context.Context, _ FamilyRecord, _ FamilyPolicy, _ string) ([]FamilyBlocker, error) {
	return append([]FamilyBlocker{}, r.blockers...), nil
}

func TestFamilyServicePerformanceBudgets(t *testing.T) {
	store := NewInMemoryFamilyStore()
	for i := range 250 {
		id := fmtFamilyID(i)
		requireNoErr(t, seedFamilyStore(store, FamilyRecord{
			ID:              id,
			ContentType:     "pages",
			SourceLocale:    "en",
			SourceVariantID: id + "-en",
			Variants: []FamilyVariant{
				{ID: id + "-en", FamilyID: id, Locale: "en", Status: string(translationcore.VariantStatusPublished), IsSource: true, Fields: map[string]string{"title": "Title", "path": "/page"}, UpdatedAt: time.Date(2026, time.January, 1, 10, 0, 0, 0, time.UTC)},
				{ID: id + "-es", FamilyID: id, Locale: "es", Status: string(translationcore.VariantStatusPublished), Fields: map[string]string{"title": "Titulo", "path": "/es/page"}, UpdatedAt: time.Date(2026, time.January, 1, 11, 0, 0, 0, time.UTC)},
			},
		}))
	}

	svc := FamilyService{
		Store: store,
		Policies: PolicyService{
			Resolver: StaticPolicyResolver{Policies: map[string]FamilyPolicy{
				"pages": {
					ContentType:     "pages",
					SourceLocale:    "en",
					RequiredLocales: []string{"en", "es"},
					RequiredFields:  map[string][]string{"en": {"title", "path"}, "es": {"title", "path"}},
				},
			}},
		},
	}

	const runs = 20
	recomputeSamples := make([]time.Duration, 0, runs)
	listSamples := make([]time.Duration, 0, runs)
	detailSamples := make([]time.Duration, 0, runs)
	for i := range runs {
		start := time.Now()
		_, err := svc.Recompute(context.Background(), fmtFamilyID(i%250), "production")
		requireNoErr(t, err)
		recomputeSamples = append(recomputeSamples, time.Since(start))

		start = time.Now()
		_, err = svc.List(context.Background(), ListFamiliesInput{Page: 1, PerPage: 50, Environment: "production"})
		requireNoErr(t, err)
		listSamples = append(listSamples, time.Since(start))

		start = time.Now()
		_, _, err = svc.Detail(context.Background(), GetFamilyInput{FamilyID: fmtFamilyID(i % 250), Environment: "production"})
		requireNoErr(t, err)
		detailSamples = append(detailSamples, time.Since(start))
	}
	if p95 := percentile95(listSamples); p95 > 300*time.Millisecond {
		t.Fatalf("family list p95 %v exceeds 300ms target", p95)
	}
	if p95 := percentile95(detailSamples); p95 > 300*time.Millisecond {
		t.Fatalf("family detail p95 %v exceeds 300ms target", p95)
	}
	if p95 := percentile95(recomputeSamples); p95 > 150*time.Millisecond {
		t.Fatalf("recompute p95 %v exceeds 150ms target", p95)
	}
}

func percentile95(samples []time.Duration) time.Duration {
	if len(samples) == 0 {
		return 0
	}
	cp := append([]time.Duration{}, samples...)
	slices.Sort(cp)
	index := int(float64(len(cp)-1) * 0.95)
	return cp[index]
}

func fmtFamilyID(i int) string {
	return "family-perf-" + strconv.Itoa(i)
}

func requireNoErr(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func seedFamilyStore(store *InMemoryFamilyStore, families ...FamilyRecord) error {
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
