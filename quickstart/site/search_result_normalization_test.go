package site

import (
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
)

func TestNormalizeSearchHitAppliesFallbackFields(t *testing.T) {
	publishedAt := time.Date(2026, 3, 29, 10, 0, 0, 0, time.UTC)
	out := normalizeSearchHit(admin.SearchHit{
		ID:          "post-1",
		Type:        "post",
		Snippet:     "Snippet summary",
		PublishedAt: &publishedAt,
		Fields: map[string]any{
			"title":        "Fallback Title",
			"result_badge": "Featured",
			"slug":         "hello-world",
		},
	})

	if anyString(out["title"]) != "Fallback Title" {
		t.Fatalf("expected fallback title, got %+v", out)
	}
	if anyString(out["summary"]) != "Snippet summary" {
		t.Fatalf("expected snippet summary fallback, got %+v", out)
	}
	if anyString(out["badge"]) != "Featured" {
		t.Fatalf("expected result badge, got %+v", out)
	}
	if anyString(out["published_at"]) != publishedAt.Format(time.RFC3339) {
		t.Fatalf("expected published_at RFC3339, got %+v", out)
	}
}

func TestNormalizeSearchResultsBuildsFacetToggleAndPaginationURLs(t *testing.T) {
	result := normalizeSearchResults(
		admin.SearchResultPage{
			Hits: []admin.SearchHit{
				{ID: "post-1", Type: "post", Title: "Hello", Fields: map[string]any{"slug": "hello"}},
			},
			Facets: []admin.SearchFacet{
				{
					Name: "tag",
					Buckets: []admin.SearchFacetTerm{
						{Value: "go", Count: 3},
						{Value: "news", Count: 2},
					},
				},
			},
			Page:    2,
			PerPage: 5,
			Total:   12,
		},
		map[string][]string{"tag": {"go"}},
		"/search",
		map[string][]string{"q": {"archive"}, "tag": {"go"}},
	)

	if len(result.Hits) != 1 || anyString(result.Hits[0]["url"]) != "/post/hello" {
		t.Fatalf("expected normalized hit url, got %+v", result.Hits)
	}
	if len(result.Facets) != 1 {
		t.Fatalf("expected one facet, got %+v", result.Facets)
	}
	buckets, ok := result.Facets[0]["buckets"].([]map[string]any)
	if !ok || len(buckets) != 2 {
		t.Fatalf("expected facet buckets, got %+v", result.Facets[0]["buckets"])
	}
	if anyString(buckets[0]["url"]) != "/search?q=archive" {
		t.Fatalf("expected active bucket url to remove filter, got %+v", buckets[0])
	}
	if anyString(buckets[1]["url"]) != "/search?q=archive&tag=go&tag=news" {
		t.Fatalf("expected inactive bucket url to add filter, got %+v", buckets[1])
	}
	if anyString(result.Pagination["prev_url"]) != "/search?page=1&q=archive&tag=go" {
		t.Fatalf("expected prev pagination url, got %+v", result.Pagination)
	}
	if anyString(result.Pagination["next_url"]) != "/search?page=3&q=archive&tag=go" {
		t.Fatalf("expected next pagination url, got %+v", result.Pagination)
	}
}

func TestCloneSearchRangesDropsBlankAndEmptyRanges(t *testing.T) {
	cloned := cloneSearchRanges([]admin.SearchRange{
		{Field: "published_year", GTE: 2024},
		{Field: " ", LTE: 1},
		{Field: "duration_seconds"},
	})
	if len(cloned) != 1 || cloned[0].Field != "published_year" || intFromAny(cloned[0].GTE) != 2024 {
		t.Fatalf("expected filtered cloned ranges, got %+v", cloned)
	}
}
