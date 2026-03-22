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
