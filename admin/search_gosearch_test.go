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
	if adapter.Permission() != "search.read" {
		t.Fatalf("permission = %q", adapter.Permission())
	}
}

func TestGoSearchSiteProviderTranslatesSearchAndSuggest(t *testing.T) {
	search := &stubSearchQuery{
		page: searchtypes.SearchResultPage{
			Hits: []searchtypes.SearchHit{{ID: "1", Type: "page", Title: "Ocean Wind"}},
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
	page, err := provider.Search(context.Background(), SearchRequest{Query: "ocean", Locale: "en", Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	if len(page.Hits) != 1 || search.last.Indexes[0] != "media" {
		t.Fatalf("page=%#v request=%#v", page, search.last)
	}
	result, err := provider.Suggest(context.Background(), SuggestRequest{Query: "oce", Limit: 5, Locale: "en"})
	if err != nil {
		t.Fatalf("suggest: %v", err)
	}
	if len(result.Suggestions) != 1 || suggest.last.Indexes[0] != "media" {
		t.Fatalf("result=%#v request=%#v", result, suggest.last)
	}
}
