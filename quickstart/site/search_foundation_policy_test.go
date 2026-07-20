package site

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type foundationSearchProvider struct {
	searchCalls   int
	validateCalls int
	last          admin.SearchRequest
	validateErr   error
}

func (p *foundationSearchProvider) Search(_ context.Context, req admin.SearchRequest) (admin.SearchResultPage, error) {
	p.searchCalls++
	p.last = req
	return admin.SearchResultPage{Page: req.Page, PerPage: req.PerPage}, nil
}

func (p *foundationSearchProvider) Suggest(context.Context, admin.SuggestRequest) (admin.SuggestResult, error) {
	return admin.SuggestResult{}, nil
}

func (p *foundationSearchProvider) ValidateFilterOnlyRequest(_ context.Context, req admin.SearchRequest) error {
	p.validateCalls++
	p.last = req
	return p.validateErr
}

func foundationSearchConfig() SiteSearchConfig {
	return SiteSearchConfig{
		VariantPolicy:        &SiteSearchVariantPolicy{QueryParameter: "mode", Default: "metadata", Allowed: []admin.SearchVariant{"metadata", "transcripts"}, IncludeInSuggestions: true},
		PageSizePolicy:       &SiteSearchPageSizePolicy{Default: 25, Allowed: []int{10, 25, 50}},
		FilterOnlyPolicy:     &SiteSearchFilterOnlyPolicy{Enabled: true, EligibleFilterFields: []string{"topic"}, EligibleRangeFields: []string{"published_year"}, EligibleLandingConstraints: []string{"architecture"}, MaxPage: 2, MaxPageSize: 50, MaxCandidates: 100},
		FacetExpansionPolicy: &SiteSearchFacetExpansionPolicy{Fields: []string{}},
	}
}

func TestValidateSiteConfigSearchPolicies(t *testing.T) {
	if err := ValidateSiteConfig(admin.Config{}, SiteConfig{Search: foundationSearchConfig()}); err != nil {
		t.Fatalf("valid policies: %v", err)
	}
	cases := []SiteSearchConfig{
		{VariantPolicy: &SiteSearchVariantPolicy{QueryParameter: "bad-name", Allowed: []admin.SearchVariant{"metadata"}}},
		{VariantPolicy: &SiteSearchVariantPolicy{Default: "missing", Allowed: []admin.SearchVariant{"metadata"}}},
		{PageSizePolicy: &SiteSearchPageSizePolicy{Default: 25, Allowed: []int{25, 10}}},
		{FilterOnlyPolicy: &SiteSearchFilterOnlyPolicy{Enabled: true, EligibleFilterFields: []string{"topic"}, MaxPage: 10, MaxPageSize: 100, MaxCandidates: 100}},
		{FilterOnlyPolicy: &SiteSearchFilterOnlyPolicy{Enabled: true, EligibleFilterFields: []string{"topic", "topic"}, MaxPage: 1, MaxPageSize: 10, MaxCandidates: 10}},
	}
	for index, search := range cases {
		if err := ValidateSiteConfig(admin.Config{}, SiteConfig{Search: search}); err == nil {
			t.Fatalf("case %d expected validation error", index)
		}
	}
}

func TestValidateSiteConfigRejectsVariantQueryParameterCollisions(t *testing.T) {
	for _, parameter := range []string{
		"q",
		"locale",
		"content_type",
		"content_types",
		"type",
		"published_year_gte",
		"duration_seconds_lte",
		"filter_topic",
		"facet_category",
	} {
		t.Run(parameter, func(t *testing.T) {
			err := ValidateSiteConfig(admin.Config{}, SiteConfig{Search: SiteSearchConfig{
				VariantPolicy: &SiteSearchVariantPolicy{
					QueryParameter: parameter,
					Allowed:        []admin.SearchVariant{"metadata"},
				},
			}})
			if err == nil {
				t.Fatalf("expected %q to conflict with quickstart search query keys", parameter)
			}
		})
	}

	if err := ValidateSiteConfig(admin.Config{}, SiteConfig{Search: SiteSearchConfig{
		VariantPolicy: &SiteSearchVariantPolicy{
			QueryParameter: "result_mode",
			Allowed:        []admin.SearchVariant{"metadata"},
		},
	}}); err != nil {
		t.Fatalf("expected a non-conflicting custom parameter to validate: %v", err)
	}
}

func TestSearchVariantIsTypedReservedAndDefaultsPageSize(t *testing.T) {
	runtime := &searchRuntime{siteCfg: ResolveSiteConfig(admin.Config{}, SiteConfig{Search: foundationSearchConfig()})}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Method").Return("GET")
	ctx.On("Path").Return("/search")
	ctx.On("IP").Return("127.0.0.1")
	ctx.QueriesM = map[string]string{"q": "wind", "mode": "transcripts", "filter.topic": "tara"}
	req, _, _, _ := runtime.translateSearchRequest(ctx, RequestState{Locale: "en"}, "")
	if req.Variant != "transcripts" || req.PerPage != 25 {
		t.Fatalf("request variant/page size: %#v", req)
	}
	if _, leaked := req.Filters["mode"]; leaked {
		t.Fatalf("variant became provider filter: %#v", req.Filters)
	}
	if got := req.Filters["topic"]; len(got) != 1 || got[0] != "tara" {
		t.Fatalf("eligible filter missing: %#v", req.Filters)
	}
}

func TestFilterOnlySearchFailsClosedAndEnforcesCeilings(t *testing.T) {
	provider := &foundationSearchProvider{}
	runtime := &searchRuntime{siteCfg: ResolveSiteConfig(admin.Config{}, SiteConfig{Search: foundationSearchConfig()}), provider: provider}

	_, err := runtime.executeSearch(nil, admin.SearchRequest{Page: 1, PerPage: 25, Filters: map[string][]string{"unknown": {"value"}}})
	if err == nil || provider.searchCalls != 0 || provider.validateCalls != 0 {
		t.Fatalf("unknown constraint did not fail closed: err=%v provider=%#v", err, provider)
	}

	_, err = runtime.executeSearch(nil, admin.SearchRequest{Page: 3, PerPage: 25, Filters: map[string][]string{"topic": {"tara"}}})
	if err == nil || provider.searchCalls != 0 {
		t.Fatalf("ceiling did not fail closed: err=%v calls=%d", err, provider.searchCalls)
	}

	_, err = runtime.executeSearch(nil, admin.SearchRequest{Page: 1, PerPage: 25, Filters: map[string][]string{"topic": {"tara"}, "unknown": {"value"}}})
	if err != nil || provider.searchCalls != 1 || provider.validateCalls != 1 {
		t.Fatalf("eligible filter-only request: err=%v provider=%#v", err, provider)
	}
	if _, leaked := provider.last.Filters["unknown"]; leaked || provider.last.Metadata["max_candidates"] != 100 || provider.last.MaxCandidates != 100 {
		t.Fatalf("unbounded constraints leaked: %#v", provider.last)
	}

	provider.validateErr = errors.New("ignored")
	_, err = runtime.executeSearch(nil, admin.SearchRequest{Page: 1, PerPage: 25, Filters: map[string][]string{"topic": {"tara"}}})
	if err == nil || provider.searchCalls != 1 {
		t.Fatalf("provider rejection did not fail closed: err=%v calls=%d", err, provider.searchCalls)
	}
}

func TestUnsupportedVariantFailsBeforeProviderExecution(t *testing.T) {
	provider := &foundationSearchProvider{}
	runtime := &searchRuntime{siteCfg: ResolveSiteConfig(admin.Config{}, SiteConfig{Search: foundationSearchConfig()}), provider: provider}
	_, err := runtime.executeSearch(nil, admin.SearchRequest{Query: "wind", Page: 1, PerPage: 25, Variant: "unknown"})
	if err == nil || searchErrorStatus(err) != 400 || provider.searchCalls != 0 {
		t.Fatalf("unsupported variant broadened execution: err=%v calls=%d", err, provider.searchCalls)
	}
}

func TestSearchFoundationProjectionIncludesEvidenceCountsAndAccuracy(t *testing.T) {
	result := admin.SearchResultPage{
		Page: 1, PerPage: 25, Total: 1, TotalAccuracy: admin.SearchTotalAccuracyExact,
		Counts: map[string]admin.SearchCount{"z_count": {Value: 0, Accuracy: admin.SearchCountAccuracyExact}, "a_count": {Accuracy: admin.SearchCountAccuracyUnavailable, Diagnostic: "not supported"}},
		Hits:   []admin.SearchHit{{ID: "event-1", Evidence: &admin.SearchEvidence{Exact: true, Status: admin.SearchEvidenceStatusComplete, Locations: []admin.SearchEvidenceLocation{{Location: "transcript", Count: 2}}}}},
	}
	normalized := normalizeSearchResults(result, nil, "/search", nil)
	if normalized.TotalAccuracy != "exact" || len(normalized.Counts) != 2 || normalized.Counts[0]["key"] != "a_count" {
		t.Fatalf("count/accuracy projection: %#v", normalized)
	}
	foundIn, ok := normalized.Hits[0]["found_in"].([]map[string]any)
	if !ok || len(foundIn) != 1 || foundIn[0]["count"] != 2 {
		t.Fatalf("evidence projection: %#v", normalized.Hits[0])
	}
}
