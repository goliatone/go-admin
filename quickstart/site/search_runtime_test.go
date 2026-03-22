package site

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sort"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

type recordingSiteSearchProvider struct {
	searchResult  admin.SearchResultPage
	suggestResult admin.SuggestResult
	searchErr     error
	suggestErr    error
	lastSearch    admin.SearchRequest
	lastSuggest   admin.SuggestRequest
	searchCalls   int
	suggestCalls  int
}

func (s *recordingSiteSearchProvider) Search(_ context.Context, req admin.SearchRequest) (admin.SearchResultPage, error) {
	s.searchCalls++
	s.lastSearch = req
	if s.searchErr != nil {
		return admin.SearchResultPage{}, s.searchErr
	}
	if s.searchResult.Hits == nil {
		s.searchResult.Hits = []admin.SearchHit{}
	}
	return s.searchResult, nil
}

func (s *recordingSiteSearchProvider) Suggest(_ context.Context, req admin.SuggestRequest) (admin.SuggestResult, error) {
	s.suggestCalls++
	s.lastSuggest = req
	if s.suggestErr != nil {
		return admin.SuggestResult{}, s.suggestErr
	}
	if s.suggestResult.Suggestions == nil {
		s.suggestResult.Suggestions = []string{}
	}
	return s.suggestResult, nil
}

type searchFilterInjectorModule struct{}

func (searchFilterInjectorModule) ID() string { return "search-filter-injector" }

func (searchFilterInjectorModule) RegisterRoutes(SiteModuleContext) error { return nil }

func (searchFilterInjectorModule) ViewContext(_ context.Context, in router.ViewContext) router.ViewContext {
	return in
}

func (searchFilterInjectorModule) SearchFilters(_ context.Context, c router.Context, _ SiteSearchFilterRequest) map[string][]string {
	values := []string{"module-default"}
	if c != nil {
		if fromQuery := stringsTrimSpace(c.Query("module_scope")); fromQuery != "" {
			values = append(values, fromQuery)
		}
	}
	return map[string][]string{
		"module_scope": values,
	}
}

func TestSiteSearchPageAndAPIRequestTranslation(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchResult: admin.SearchResultPage{
			Hits: []admin.SearchHit{
				{
					ID:      "post-1",
					Type:    "post",
					Title:   "Hola",
					Summary: "Primer post",
					Locale:  "es",
					Fields: map[string]any{
						"path": "posts/hola",
					},
				},
				{
					ID:    "doc-1",
					Type:  "docs",
					Title: "Guide",
					URL:   "https://example.com/docs/guide",
				},
			},
			Facets: []admin.SearchFacet{
				{Name: "content_type", Buckets: []admin.SearchFacetTerm{{Value: "post", Count: 3}, {Value: "docs", Count: 1}}},
				{Name: "category", Buckets: []admin.SearchFacetTerm{{Value: "news", Count: 2}}},
			},
			Page:    2,
			PerPage: 5,
			Total:   11,
		},
	}

	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
		Search: SiteSearchConfig{
			Collections: []string{"media"},
		},
	}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	pagePayload := performSiteRequest(t, server, "/search?q=hola&page=2&per_page=5&sort=published_at:desc&locale=es&facet=content_type&facet=category&collection=media&content_type=post&tag=go&category=news&date_from=2024-01-01&date_to=2024-12-31&filter.visibility=public&filter.visibility=authenticated&format=json")
	if got := nestedString(pagePayload, "template"); got != searchTemplate {
		t.Fatalf("expected search template %q, got %q", searchTemplate, got)
	}
	if provider.searchCalls != 1 {
		t.Fatalf("expected one provider search call from page route, got %d", provider.searchCalls)
	}
	if provider.lastSearch.Query != "hola" || provider.lastSearch.Page != 2 || provider.lastSearch.PerPage != 5 {
		t.Fatalf("unexpected search request pagination/query: %+v", provider.lastSearch)
	}
	if provider.lastSearch.Locale != "es" {
		t.Fatalf("expected locale es, got %q", provider.lastSearch.Locale)
	}
	if provider.lastSearch.Sort != "published_at:desc" {
		t.Fatalf("expected sort published_at:desc, got %q", provider.lastSearch.Sort)
	}
	if got := provider.lastSearch.Filters["visibility"]; len(got) != 2 || got[0] != "public" || got[1] != "authenticated" {
		t.Fatalf("expected visibility filters [public authenticated], got %+v", got)
	}
	if got := provider.lastSearch.Filters["content_type"]; len(got) != 1 || got[0] != "post" {
		t.Fatalf("expected content_type filter post, got %+v", got)
	}
	if got := provider.lastSearch.Filters["tag"]; len(got) != 1 || got[0] != "go" {
		t.Fatalf("expected tag filter go, got %+v", got)
	}
	if got := provider.lastSearch.Filters["category"]; len(got) != 1 || got[0] != "news" {
		t.Fatalf("expected category filter news, got %+v", got)
	}
	if got := provider.lastSearch.Filters["date_from"]; len(got) != 1 || got[0] != "2024-01-01" {
		t.Fatalf("expected date_from filter, got %+v", got)
	}
	if got := provider.lastSearch.Filters["date_to"]; len(got) != 1 || got[0] != "2024-12-31" {
		t.Fatalf("expected date_to filter, got %+v", got)
	}
	metadata := nestedMapFromAny(provider.lastSearch.Metadata)
	facets, ok := metadata["facets"].([]string)
	if !ok || len(facets) != 2 || facets[0] != "content_type" || facets[1] != "category" {
		t.Fatalf("expected facets metadata [content_type category], got %+v", metadata["facets"])
	}
	indexes, ok := metadata["indexes"].([]string)
	if !ok || len(indexes) != 1 || indexes[0] != "media" {
		t.Fatalf("expected indexes metadata [media], got %+v", metadata["indexes"])
	}
	pageHits := menuItemsFromContext(t, nestedAny(pagePayload, "context", "search_results"))
	if len(pageHits) != 2 {
		t.Fatalf("expected two search results in page context, got %+v", pageHits)
	}
	if got := stringsTrimSpace(anyString(pageHits[0]["url"])); got != "/posts/hola" {
		t.Fatalf("expected normalized path URL /posts/hola, got %q", got)
	}
	if got := stringsTrimSpace(anyString(pageHits[1]["url"])); got != "https://example.com/docs/guide" {
		t.Fatalf("expected absolute URL passthrough, got %q", got)
	}
	if !nestedBool(pagePayload, "context", "search_state", "has_results") {
		t.Fatalf("expected has_results state true")
	}

	apiPayload := performSiteRequest(t, server, "/api/v1/site/search?q=hola&page=2&per_page=5&sort=published_at:desc&locale=es&content_type=post")
	if provider.searchCalls != 2 {
		t.Fatalf("expected second provider search call from API route, got %d", provider.searchCalls)
	}
	apiHits := menuItemsFromContext(t, nestedAny(apiPayload, "data", "hits"))
	if len(apiHits) != 2 {
		t.Fatalf("expected API hits payload, got %+v", apiHits)
	}
	if got := stringsTrimSpace(anyString(apiHits[0]["url"])); got != "/posts/hola" {
		t.Fatalf("expected normalized API hit URL /posts/hola, got %q", got)
	}
	if got := anyString(nestedAny(apiPayload, "meta", "locale")); got != "es" {
		t.Fatalf("expected API meta locale es, got %q", got)
	}
	apiIndexes, ok := nestedAny(apiPayload, "meta", "indexes").([]any)
	if !ok || len(apiIndexes) != 1 || anyString(apiIndexes[0]) != "media" {
		t.Fatalf("expected API meta indexes [media], got %+v", nestedAny(apiPayload, "meta", "indexes"))
	}
}

func TestSiteSearchParsesRangeQueriesIntoRanges(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchResult: admin.SearchResultPage{Hits: []admin.SearchHit{}, Page: 1, PerPage: 10, Total: 0},
	}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequest(t, server, "/api/v1/site/search?q=archive&content_type=post&published_year_gte=2024&duration_seconds_lte=3600")
	if len(provider.lastSearch.Ranges) != 2 {
		t.Fatalf("expected two range filters, got %+v", provider.lastSearch.Ranges)
	}
	if _, ok := provider.lastSearch.Filters["published_year_gte"]; ok {
		t.Fatalf("expected published_year_gte to be parsed as a range, got %+v", provider.lastSearch.Filters)
	}
	if _, ok := provider.lastSearch.Filters["duration_seconds_lte"]; ok {
		t.Fatalf("expected duration_seconds_lte to be parsed as a range, got %+v", provider.lastSearch.Filters)
	}
	rangesByField := map[string]admin.SearchRange{}
	for _, item := range provider.lastSearch.Ranges {
		rangesByField[item.Field] = item
	}
	if rangesByField["published_year"].GTE != 2024 {
		t.Fatalf("expected published_year.gte=2024, got %+v", rangesByField["published_year"])
	}
	if rangesByField["duration_seconds"].LTE != 3600 {
		t.Fatalf("expected duration_seconds.lte=3600, got %+v", rangesByField["duration_seconds"])
	}
	metaRanges, ok := nestedAny(payload, "meta", "ranges").([]any)
	if !ok || len(metaRanges) != 2 {
		t.Fatalf("expected meta ranges payload, got %+v", nestedAny(payload, "meta", "ranges"))
	}
	metaByField := map[string]map[string]any{}
	for _, item := range metaRanges {
		entry := nestedMapFromAny(item)
		metaByField[stringsTrimSpace(anyString(entry["field"]))] = entry
	}
	if intFromAny(metaByField["published_year"]["gte"]) != 2024 {
		t.Fatalf("expected published_year.gte in meta payload, got %+v", metaByField["published_year"])
	}
	if intFromAny(metaByField["duration_seconds"]["lte"]) != 3600 {
		t.Fatalf("expected duration_seconds.lte in meta payload, got %+v", metaByField["duration_seconds"])
	}
}

func TestSiteSearchModuleFilterInjection(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchResult: admin.SearchResultPage{Hits: []admin.SearchHit{}, Page: 1, PerPage: 10, Total: 0},
	}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Modules: []SiteModule{searchFilterInjectorModule{}},
	}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	_ = performSiteRequest(t, server, "/search?q=module-test&module_scope=beta&format=json")
	values := provider.lastSearch.Filters["module_scope"]
	if len(values) != 2 || !searchFilterContains(values, "module-default") || !searchFilterContains(values, "beta") {
		t.Fatalf("expected module_scope filters to include module-default and beta, got %+v", values)
	}
}

func TestSiteSearchSuggestEndpointWiring(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		suggestResult: admin.SuggestResult{
			Suggestions: []string{"hello", "help", "helm"},
		},
	}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequest(t, server, "/api/v1/site/search/suggest?q=hel&limit=7&locale=en&facet_content_type=post")
	if provider.suggestCalls != 1 {
		t.Fatalf("expected one suggest call, got %d", provider.suggestCalls)
	}
	if provider.lastSuggest.Query != "hel" || provider.lastSuggest.Limit != 7 {
		t.Fatalf("unexpected suggest request: %+v", provider.lastSuggest)
	}
	if provider.lastSuggest.Locale != "en" {
		t.Fatalf("expected suggest locale en, got %q", provider.lastSuggest.Locale)
	}
	if got := provider.lastSuggest.Filters["content_type"]; len(got) != 1 || got[0] != "post" {
		t.Fatalf("expected content_type facet alias forwarded to suggest request, got %+v", got)
	}
	suggestions, ok := nestedAny(payload, "data", "suggestions").([]any)
	if !ok || len(suggestions) != 3 {
		t.Fatalf("expected suggest payload with 3 suggestions, got %+v", nestedAny(payload, "data"))
	}
}

func TestSiteSearchTopicLandingRouteAppliesPresetFilters(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchResult: admin.SearchResultPage{Hits: []admin.SearchHit{}, Page: 1, PerPage: 10, Total: 0},
	}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequest(t, server, "/search/topics/architecture?q=archive&format=json")
	values := provider.lastSearch.Filters["topic_hierarchy"]
	if len(values) != 1 || values[0] != "Teaching Topics > Architecture" {
		t.Fatalf("expected landing preset topic_hierarchy filter, got %+v", values)
	}
	landing := nestedMapFromAny(nestedAny(payload, "context", "search_landing"))
	if anyString(landing["title"]) != "Architecture" {
		t.Fatalf("expected landing title Architecture, got %+v", landing)
	}
}

func TestSiteSearchNormalizesRicherFacetAndHitPayloads(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchResult: admin.SearchResultPage{
			Hits: []admin.SearchHit{
				{
					ID:          "segment-1",
					Type:        "transcript_segment",
					Title:       "Ocean Wind",
					Locale:      "en",
					URL:         "/media/ocean",
					Snippet:     "archive chant",
					Highlighted: "<mark>archive</mark> chant",
					ParentTitle: "Ocean Wind Parent",
					Fields: map[string]any{
						"result_badge": "Featured",
					},
				},
			},
			Facets: []admin.SearchFacet{
				{
					Name:        "topic_hierarchy",
					Kind:        "hierarchical",
					Disjunctive: true,
					Buckets: []admin.SearchFacetTerm{
						{
							Value:    "Teaching Topics > Architecture",
							Label:    "Architecture",
							Count:    2,
							Selected: true,
							Path:     []string{"Teaching Topics", "Architecture"},
							Level:    1,
						},
					},
				},
			},
			Page:    1,
			PerPage: 10,
			Total:   1,
		},
	}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequest(t, server, "/search?q=archive&format=json")
	hits := menuItemsFromContext(t, nestedAny(payload, "context", "search_results"))
	if len(hits) != 1 || anyString(hits[0]["highlighted"]) != "<mark>archive</mark> chant" || anyString(hits[0]["badge"]) != "Featured" {
		t.Fatalf("expected richer hit payload, got %+v", hits)
	}
	facets := menuItemsFromContext(t, nestedAny(payload, "context", "search_facets"))
	if len(facets) != 1 || anyString(facets[0]["kind"]) != "hierarchical" {
		t.Fatalf("expected hierarchical facet payload, got %+v", facets)
	}
	buckets := menuItemsFromContext(t, facets[0]["buckets"])
	if len(buckets) != 1 || !anyBool(buckets[0]["selected"]) || anyString(buckets[0]["label"]) != "Architecture" {
		t.Fatalf("expected rich facet bucket payload, got %+v", buckets)
	}
}

func TestSiteSearchPropagatesActorContext(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchResult: admin.SearchResultPage{Hits: []admin.SearchHit{}, Page: 1, PerPage: 10, Total: 0},
	}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID:        "user-7",
		Subject:        "user-7",
		Role:           "member",
		TenantID:       "tenant-1",
		OrganizationID: "org-1",
	})
	_ = performSiteRequestWithContext(t, server, "/search?q=scope&format=json", ctx, http.StatusOK)

	actor := nestedMapFromAny(provider.lastSearch.Actor)
	if stringsTrimSpace(anyString(actor["actor_id"])) != "user-7" {
		t.Fatalf("expected actor_id user-7, got %+v", actor)
	}
	if stringsTrimSpace(anyString(actor["tenant_id"])) != "tenant-1" {
		t.Fatalf("expected tenant_id tenant-1, got %+v", actor)
	}
	if stringsTrimSpace(anyString(actor["organization_id"])) != "org-1" {
		t.Fatalf("expected organization_id org-1, got %+v", actor)
	}
}

func TestSiteSearchPageErrorState(t *testing.T) {
	provider := &recordingSiteSearchProvider{
		searchErr: errors.New("provider offline"),
	}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequestWithContext(t, server, "/search?q=offline&format=json", context.Background(), http.StatusBadGateway)
	if !nestedBool(payload, "context", "search_state", "has_error") {
		t.Fatalf("expected has_error state true, got %+v", nestedAny(payload, "context", "search_state"))
	}
	if code := nestedString(payload, "error", "code"); code != searchUnavailableErrorCode {
		t.Fatalf("expected error code %q, got %+v", searchUnavailableErrorCode, payload)
	}
}

func TestSiteSearchEndpointPerformanceP95(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping performance test in short mode")
	}

	provider := &recordingSiteSearchProvider{
		searchResult: admin.SearchResultPage{
			Hits:    []admin.SearchHit{{ID: "doc-1", Title: "Perf"}},
			Page:    1,
			PerPage: 10,
			Total:   1,
		},
	}
	server := router.NewHTTPServer(
		router.WithHTTPRouterConflictPolicy(router.HTTPRouterConflictLogAndSkip),
	)
	if err := RegisterSiteRoutes(server.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, WithSearchProvider(provider)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	samples := 120
	durations := make([]time.Duration, 0, samples)
	for i := 0; i < samples; i++ {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/site/search?q=perf&page=1&per_page=10", nil)
		req.Header.Set("Accept", "application/json")
		rec := httptest.NewRecorder()
		started := time.Now()
		server.WrappedRouter().ServeHTTP(rec, req)
		durations = append(durations, time.Since(started))
		if rec.Code != http.StatusOK {
			t.Fatalf("search request failed status=%d body=%s", rec.Code, rec.Body.String())
		}
	}

	sort.Slice(durations, func(i, j int) bool { return durations[i] < durations[j] })
	p95Index := (95*samples + 99) / 100
	if p95Index >= samples {
		p95Index = samples - 1
	}
	p95 := durations[p95Index]
	if p95 > 300*time.Millisecond {
		t.Fatalf("expected search p95 <= 300ms, got %s", p95)
	}
}

func performSiteRequestWithContext[T interface {
	ServeHTTP(http.ResponseWriter, *http.Request)
}](t *testing.T, server router.Server[T], path string, reqCtx context.Context, status int) map[string]any {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Accept", "application/json")
	if reqCtx != nil {
		req = req.WithContext(reqCtx)
	}
	rec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rec, req)
	if rec.Code != status {
		t.Fatalf("request %q returned status %d body=%s", path, rec.Code, rec.Body.String())
	}
	return decodeSitePayload(t, path, rec)
}

func intFromAny(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case float32:
		return int(typed)
	case float64:
		return int(typed)
	default:
		return 0
	}
}
