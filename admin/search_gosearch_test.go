package admin

import (
	"context"
	"testing"

	searchtypes "github.com/goliatone/go-search/pkg/types"
)

type stubSearchQuery struct {
	last searchtypes.SearchRequest
	page searchtypes.SearchResultPage
}

func (s *stubSearchQuery) Query(_ context.Context, req searchtypes.SearchRequest) (searchtypes.SearchResultPage, error) {
	s.last = req
	return s.page, nil
}

type stubSuggestQuery struct {
	last   searchtypes.SuggestRequest
	result searchtypes.SuggestResult
}

func (s *stubSuggestQuery) Query(_ context.Context, req searchtypes.SuggestRequest) (searchtypes.SuggestResult, error) {
	s.last = req
	return s.result, nil
}

type stubHealthQuery struct {
	last   searchtypes.HealthRequest
	result searchtypes.HealthStatus
}

func (s *stubHealthQuery) Query(_ context.Context, req searchtypes.HealthRequest) (searchtypes.HealthStatus, error) {
	s.last = req
	return s.result, nil
}

type stubStatsQuery struct {
	last   searchtypes.StatsRequest
	result searchtypes.StatsResult
}

func (s *stubStatsQuery) Query(_ context.Context, req searchtypes.StatsRequest) (searchtypes.StatsResult, error) {
	s.last = req
	return s.result, nil
}

type stubEnsureCommand struct {
	last searchtypes.EnsureIndexInput
}

func (s *stubEnsureCommand) Execute(_ context.Context, req searchtypes.EnsureIndexInput) error {
	s.last = req
	return nil
}

type stubReindexCommand struct {
	last searchtypes.ReindexIndexInput
}

func (s *stubReindexCommand) Execute(_ context.Context, req searchtypes.ReindexIndexInput) error {
	s.last = req
	return nil
}

func TestGoSearchGlobalAdapterUsesGoSearchQuery(t *testing.T) {
	search := &stubSearchQuery{
		page: searchtypes.SearchResultPage{
			Hits: []searchtypes.SearchHit{{ID: "1", Type: "page", Title: "Ocean Wind"}},
		},
	}
	adapter := NewGoSearchGlobalAdapter(GoSearchGlobalAdapterConfig{
		Search:         search,
		Indexes:        []string{"media"},
		PermissionName: "search.read",
		FallbackType:   "search",
	})
	results, err := adapter.Search(context.Background(), "ocean", 5)
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	if len(results) != 1 || search.last.Indexes[0] != "media" {
		t.Fatalf("results=%#v request=%#v", results, search.last)
	}
	if search.last.Metadata["indexes"] == nil {
		t.Fatalf("expected canonical indexes metadata, got %#v", search.last.Metadata)
	}
	if adapter.Permission() != "search.read" {
		t.Fatalf("permission = %q", adapter.Permission())
	}
}

func TestGoSearchSiteProviderTranslatesSearchAndSuggest(t *testing.T) {
	search := &stubSearchQuery{
		page: searchtypes.SearchResultPage{
			Hits: []searchtypes.SearchHit{{
				ID:      "1",
				Type:    "page",
				Title:   "Ocean Wind",
				Summary: "archive chant",
				Locale:  "en",
				Snippet: &searchtypes.SearchSnippet{Text: "archive chant", Highlighted: "<mark>archive</mark> chant"},
				Parent:  &searchtypes.SearchParent{ID: "video-1", Title: "Ocean Wind", URL: "/media/ocean", Thumbnail: "/thumb.jpg"},
				Anchor:  &searchtypes.MediaAnchor{StartMS: 1000, EndMS: 2000, URL: "/media/ocean#t=1"},
				Fields: map[string]any{
					"parent_summary": "Ocean summary",
				},
				Ranking: &searchtypes.AppliedRankingSignals{
					Editorial: []searchtypes.AppliedEditorialSignal{{RuleID: "pin-1", Action: searchtypes.EditorialActionPin}},
				},
			}},
			Facets: []searchtypes.SearchFacet{{
				Field:       "topic_hierarchy",
				Kind:        searchtypes.FacetKindHierarchical,
				Disjunctive: true,
				Values: []searchtypes.SearchFacetValue{{
					Value:    "Teaching Topics > Architecture",
					Label:    "Architecture",
					Count:    2,
					Selected: true,
					Path:     []string{"Teaching Topics", "Architecture"},
					Level:    1,
				}},
			}},
			Page: 1, PerPage: 10, Total: 1,
		},
	}
	suggest := &stubSuggestQuery{
		result: searchtypes.SuggestResult{
			Items: []searchtypes.SuggestHit{{ID: "1", Title: "Ocean Wind"}},
		},
	}
	provider := NewGoSearchSiteProvider(GoSearchSiteProviderConfig{
		Search:  search,
		Suggest: suggest,
		Indexes: []string{"media"},
	})
	page, err := provider.Search(context.Background(), SearchRequest{
		Query:   "ocean",
		Locale:  "en",
		Page:    1,
		PerPage: 10,
		Ranges:  []SearchRange{{Field: "published_year", GTE: 2024}},
	})
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	if len(page.Hits) != 1 || search.last.Indexes[0] != "media" {
		t.Fatalf("page=%#v request=%#v", page, search.last)
	}
	if page.Hits[0].Highlighted != "<mark>archive</mark> chant" || page.Hits[0].ParentTitle != "Ocean Wind" || page.Hits[0].Anchor == nil {
		t.Fatalf("expected richer hit translation, got %+v", page.Hits[0])
	}
	if len(page.Facets) != 1 || page.Facets[0].Kind != "hierarchical" || !page.Facets[0].Buckets[0].Selected {
		t.Fatalf("expected richer facet translation, got %+v", page.Facets)
	}
	rangeExpr, ok := search.last.Filters.(searchtypes.RangeExpr)
	if !ok || rangeExpr.Field != "published_year" || rangeExpr.GTE != 2024 {
		t.Fatalf("expected published_year range filter, got %#v", search.last.Filters)
	}
	result, err := provider.Suggest(context.Background(), SuggestRequest{Query: "oce", Limit: 5, Locale: "en"})
	if err != nil {
		t.Fatalf("suggest: %v", err)
	}
	if len(result.Suggestions) != 1 || suggest.last.Indexes[0] != "media" {
		t.Fatalf("result=%#v request=%#v", result, suggest.last)
	}
}

func TestGoSearchBundleBuildsSiteGlobalAndOperations(t *testing.T) {
	search := &stubSearchQuery{}
	suggest := &stubSuggestQuery{}
	health := &stubHealthQuery{result: searchtypes.HealthStatus{Provider: "memory", Healthy: true}}
	stats := &stubStatsQuery{result: searchtypes.StatsResult{Indexes: []searchtypes.IndexStats{{Name: "site_content", Documents: 3}}}}
	ensure := &stubEnsureCommand{}
	reindex := &stubReindexCommand{}

	bundle := NewGoSearchBundle(GoSearchBundleConfig{
		Search:         search,
		Suggest:        suggest,
		Health:         health,
		Stats:          stats,
		EnsureIndex:    ensure,
		Reindex:        reindex,
		Indexes:        []string{"site_content", "archive_media"},
		PermissionName: "admin.search.view",
		FallbackType:   "search",
	})
	if bundle == nil || bundle.SiteProvider == nil || bundle.GlobalAdapter == nil || bundle.Operations == nil {
		t.Fatalf("expected complete bundle, got %#v", bundle)
	}

	_, _ = bundle.SiteProvider.Search(context.Background(), SearchRequest{Query: "ocean", Locale: "en"})
	if len(search.last.Indexes) != 2 || search.last.Indexes[0] != "site_content" {
		t.Fatalf("expected site provider indexes, got %#v", search.last.Indexes)
	}
	if bundle.GlobalAdapter.Permission() != "admin.search.view" {
		t.Fatalf("permission = %q", bundle.GlobalAdapter.Permission())
	}

	if _, err := bundle.Operations.HealthStatus(context.Background()); err != nil {
		t.Fatalf("health: %v", err)
	}
	if len(health.last.Indexes) != 2 || health.last.Indexes[1] != "archive_media" {
		t.Fatalf("expected ops indexes, got %#v", health.last.Indexes)
	}
	if _, err := bundle.Operations.StatsSnapshot(context.Background()); err != nil {
		t.Fatalf("stats: %v", err)
	}
	if err := bundle.Operations.Ensure(context.Background(), searchtypes.IndexDefinition{Name: "site_content"}); err != nil {
		t.Fatalf("ensure: %v", err)
	}
	if ensure.last.Definition.Name != "site_content" {
		t.Fatalf("ensure input = %#v", ensure.last)
	}
	if err := bundle.Operations.ReindexAll(context.Background(), "site_content", 200); err != nil {
		t.Fatalf("reindex: %v", err)
	}
	if reindex.last.Index != "site_content" || reindex.last.BatchSize != 200 {
		t.Fatalf("reindex input = %#v", reindex.last)
	}
}

func TestGoSearchBundleAttachAdminSearchCanSetPrimary(t *testing.T) {
	search := &stubSearchQuery{
		page: searchtypes.SearchResultPage{
			Hits: []searchtypes.SearchHit{{ID: "1", Type: "page", Title: "Ocean Wind"}},
		},
	}
	bundle := NewGoSearchBundle(GoSearchBundleConfig{
		Search:         search,
		Suggest:        &stubSuggestQuery{},
		Indexes:        []string{"site_content"},
		PermissionName: "",
		FallbackType:   "search",
	})
	if bundle == nil {
		t.Fatal("expected bundle")
	}

	engine := NewSearchEngine(nil)
	bundle.AttachAdminSearch(engine, "gosearch", true)

	results, err := engine.Query(AdminContext{Context: context.Background()}, "ocean", 5)
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	if len(results) != 1 || results[0].Title != "Ocean Wind" {
		t.Fatalf("results=%#v", results)
	}
	if search.last.Indexes[0] != "site_content" {
		t.Fatalf("request=%#v", search.last)
	}
}
