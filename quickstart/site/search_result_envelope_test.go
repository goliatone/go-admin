package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestBuildSearchResultEnvelope(t *testing.T) {
	envelope := buildSearchResultEnvelope(
		admin.SearchResultPage{
			Hits: []admin.SearchHit{{
				ID:    "post-1",
				Type:  "post",
				Title: "Hello",
				Fields: map[string]any{
					"path": "/posts/hello",
				},
			}},
			Facets: []admin.SearchFacet{{
				Name: "content_type",
				Buckets: []admin.SearchFacetTerm{{
					Value: "post",
					Count: 1,
				}},
			}},
			Page:    2,
			PerPage: 5,
			Total:   11,
		},
		admin.SearchRequest{
			Query:   "hello",
			Page:    2,
			PerPage: 5,
			Filters: map[string][]string{"content_type": []string{"post"}},
		},
		"/search",
		map[string][]string{"q": []string{"hello"}},
		false,
	)

	if len(envelope.Hits) != 1 {
		t.Fatalf("expected one hit, got %+v", envelope.Hits)
	}
	if len(envelope.Facets) != 1 {
		t.Fatalf("expected one facet, got %+v", envelope.Facets)
	}
	if got := envelope.Page; got != 2 {
		t.Fatalf("expected page 2, got %d", got)
	}
	if got := envelope.PerPage; got != 5 {
		t.Fatalf("expected per_page 5, got %d", got)
	}
	if got := envelope.Total; got != 11 {
		t.Fatalf("expected total 11, got %d", got)
	}
	if !envelope.HasQuery || !envelope.HasResults || envelope.ZeroResults {
		t.Fatalf("unexpected envelope state %+v", envelope)
	}
}

func TestSearchPageStateAndAPIData(t *testing.T) {
	envelope := searchResultEnvelope{
		Hits:        []map[string]any{{"id": "post-1"}},
		Facets:      []map[string]any{{"name": "content_type"}},
		FilterChips: []map[string]any{{"field": "content_type"}},
		Pagination:  map[string]any{"page": 1},
		Page:        1,
		PerPage:     10,
		Total:       0,
		HasQuery:    true,
		HasResults:  false,
		ZeroResults: true,
	}

	state := searchPageState(envelope, false)
	if !anyBool(state["has_query"]) || anyBool(state["has_results"]) || !anyBool(state["zero_results"]) || anyBool(state["has_error"]) {
		t.Fatalf("unexpected page state %+v", state)
	}

	data := searchAPIData(envelope)
	if got := intFromAny(data["page"]); got != 1 {
		t.Fatalf("expected API data page 1, got %d", got)
	}
	if got := intFromAny(data["per_page"]); got != 10 {
		t.Fatalf("expected API data per_page 10, got %d", got)
	}
	if got := intFromAny(data["total"]); got != 0 {
		t.Fatalf("expected API data total 0, got %d", got)
	}
}
