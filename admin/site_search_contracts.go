package admin

import (
	"context"
	"time"
)

// SearchProvider defines the minimal site-search integration contract.
type SearchProvider interface {
	Search(ctx context.Context, req SearchRequest) (SearchResultPage, error)
	Suggest(ctx context.Context, req SuggestRequest) (SuggestResult, error)
}

// SearchRequest is a backend-agnostic site search request envelope.
type SearchRequest struct {
	Query    string              `json:"q"`
	Locale   string              `json:"locale,omitempty"`
	Page     int                 `json:"page,omitempty"`
	PerPage  int                 `json:"per_page,omitempty"`
	Sort     string              `json:"sort,omitempty"`
	Filters  map[string][]string `json:"filters,omitempty"`
	Actor    any                 `json:"actor,omitempty"`
	Request  any                 `json:"request,omitempty"`
	Metadata map[string]any      `json:"metadata,omitempty"`
}

// SearchResultPage captures paginated search hits plus facets.
type SearchResultPage struct {
	Hits     []SearchHit    `json:"hits"`
	Facets   []SearchFacet  `json:"facets,omitempty"`
	Page     int            `json:"page"`
	PerPage  int            `json:"per_page"`
	Total    int            `json:"total"`
	Metadata map[string]any `json:"metadata,omitempty"`
}

// SearchHit represents one normalized search document hit.
type SearchHit struct {
	ID          string         `json:"id"`
	Type        string         `json:"type,omitempty"`
	Title       string         `json:"title,omitempty"`
	Summary     string         `json:"summary,omitempty"`
	URL         string         `json:"url,omitempty"`
	Locale      string         `json:"locale,omitempty"`
	PublishedAt *time.Time     `json:"published_at,omitempty"`
	Score       float64        `json:"score,omitempty"`
	Fields      map[string]any `json:"fields,omitempty"`
}

// SearchFacet describes one facet dimension and value buckets.
type SearchFacet struct {
	Name    string            `json:"name"`
	Buckets []SearchFacetTerm `json:"buckets,omitempty"`
}

// SearchFacetTerm describes one facet value bucket.
type SearchFacetTerm struct {
	Value string `json:"value"`
	Count int    `json:"count"`
}

// SuggestRequest is a backend-agnostic suggest request envelope.
type SuggestRequest struct {
	Query    string              `json:"q"`
	Locale   string              `json:"locale,omitempty"`
	Limit    int                 `json:"limit,omitempty"`
	Filters  map[string][]string `json:"filters,omitempty"`
	Actor    any                 `json:"actor,omitempty"`
	Request  any                 `json:"request,omitempty"`
	Metadata map[string]any      `json:"metadata,omitempty"`
}

// SuggestResult captures typeahead suggestions with optional metadata.
type SuggestResult struct {
	Suggestions []string       `json:"suggestions"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}
