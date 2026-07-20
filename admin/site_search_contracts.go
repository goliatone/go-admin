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

// FilterOnlyRequestValidator is an optional capability for providers that can
// prove a blank-query request retains at least one effective bounded constraint.
type FilterOnlyRequestValidator interface {
	ValidateFilterOnlyRequest(ctx context.Context, req SearchRequest) error
}

// SearchVariant is an application-defined product variant. It is intentionally
// distinct from provider retrieval modes such as lexical or semantic search.
type SearchVariant string

// SearchRange describes one provider-neutral range constraint.
type SearchRange struct {
	Field string `json:"field"`
	GTE   any    `json:"gte,omitempty"`
	LTE   any    `json:"lte,omitempty"`
}

// SearchRequest is a backend-agnostic site search request envelope.
type SearchRequest struct {
	Query         string              `json:"q"`
	Locale        string              `json:"locale,omitempty"`
	Page          int                 `json:"page,omitempty"`
	PerPage       int                 `json:"per_page,omitempty"`
	Sort          string              `json:"sort,omitempty"`
	Filters       map[string][]string `json:"filters,omitempty"`
	Ranges        []SearchRange       `json:"ranges,omitempty"`
	Actor         any                 `json:"actor,omitempty"`
	Request       any                 `json:"request,omitempty"`
	Metadata      map[string]any      `json:"metadata,omitempty"`
	Variant       SearchVariant       `json:"variant,omitempty"`
	MaxCandidates int                 `json:"max_candidates,omitempty"`
}

// SearchResultPage captures paginated search hits plus facets.
type SearchResultPage struct {
	Hits          []SearchHit            `json:"hits"`
	Facets        []SearchFacet          `json:"facets,omitempty"`
	Page          int                    `json:"page"`
	PerPage       int                    `json:"per_page"`
	Total         int                    `json:"total"`
	TotalAccuracy SearchTotalAccuracy    `json:"total_accuracy,omitempty"`
	Counts        map[string]SearchCount `json:"counts,omitempty"`
	Metadata      map[string]any         `json:"metadata,omitempty"`
}

type SearchTotalAccuracy string

const (
	SearchTotalAccuracyExact       SearchTotalAccuracy = "exact"
	SearchTotalAccuracyLowerBound  SearchTotalAccuracy = "lower_bound"
	SearchTotalAccuracyApproximate SearchTotalAccuracy = "approximate"
)

type SearchCountAccuracy string

const (
	SearchCountAccuracyExact       SearchCountAccuracy = "exact"
	SearchCountAccuracyLowerBound  SearchCountAccuracy = "lower_bound"
	SearchCountAccuracyApproximate SearchCountAccuracy = "approximate"
	SearchCountAccuracyUnavailable SearchCountAccuracy = "unavailable"
)

type SearchCount struct {
	Value      int                 `json:"value"`
	Accuracy   SearchCountAccuracy `json:"accuracy"`
	Diagnostic string              `json:"diagnostic,omitempty"`
}

type SearchEvidenceStatus string

const (
	SearchEvidenceStatusComplete    SearchEvidenceStatus = "complete"
	SearchEvidenceStatusPartial     SearchEvidenceStatus = "partial"
	SearchEvidenceStatusUnsupported SearchEvidenceStatus = "unsupported"
	SearchEvidenceStatusUnavailable SearchEvidenceStatus = "unavailable"
)

type SearchEvidence struct {
	Exact      bool                     `json:"exact"`
	Status     SearchEvidenceStatus     `json:"status,omitempty"`
	Locations  []SearchEvidenceLocation `json:"locations"`
	Diagnostic string                   `json:"diagnostic,omitempty"`
}

type SearchEvidenceLocation struct {
	Location string                 `json:"location"`
	Count    int                    `json:"count"`
	Samples  []SearchEvidenceSample `json:"samples,omitempty"`
}

type SearchEvidenceSample struct {
	DocumentID   string                 `json:"document_id"`
	Field        string                 `json:"field,omitempty"`
	Locale       string                 `json:"locale,omitempty"`
	Snippet      *SearchEvidenceSnippet `json:"snippet,omitempty"`
	ChunkOrdinal *int                   `json:"chunk_ordinal,omitempty"`
	Anchor       any                    `json:"anchor,omitempty"`
}

type SearchEvidenceSnippet struct {
	Text        string `json:"text"`
	Highlighted string `json:"highlighted"`
}

// SearchHit represents one normalized search document hit.
type SearchHit struct {
	ID              string          `json:"id"`
	Type            string          `json:"type,omitempty"`
	Title           string          `json:"title,omitempty"`
	Summary         string          `json:"summary,omitempty"`
	URL             string          `json:"url,omitempty"`
	Locale          string          `json:"locale,omitempty"`
	PublishedAt     *time.Time      `json:"published_at,omitempty"`
	Score           float64         `json:"score,omitempty"`
	Fields          map[string]any  `json:"fields,omitempty"`
	Snippet         string          `json:"snippet,omitempty"`
	Highlighted     string          `json:"highlighted,omitempty"`
	ParentID        string          `json:"parent_id,omitempty"`
	ParentTitle     string          `json:"parent_title,omitempty"`
	ParentURL       string          `json:"parent_url,omitempty"`
	ParentThumbnail string          `json:"parent_thumbnail,omitempty"`
	ParentSummary   string          `json:"parent_summary,omitempty"`
	Anchor          any             `json:"anchor,omitempty"`
	Metadata        map[string]any  `json:"metadata,omitempty"`
	Evidence        *SearchEvidence `json:"match_evidence,omitempty"`
}

// SearchFacet describes one facet dimension and value buckets.
type SearchFacet struct {
	Name        string            `json:"name"`
	Kind        string            `json:"kind,omitempty"`
	Disjunctive bool              `json:"disjunctive,omitempty"`
	Buckets     []SearchFacetTerm `json:"buckets,omitempty"`
	Metadata    map[string]any    `json:"metadata,omitempty"`
}

// SearchFacetTerm describes one facet value bucket.
type SearchFacetTerm struct {
	Value       string         `json:"value"`
	Label       string         `json:"label,omitempty"`
	Count       int            `json:"count"`
	Selected    bool           `json:"selected,omitempty"`
	Path        []string       `json:"path,omitempty"`
	Level       int            `json:"level,omitempty"`
	ParentValue string         `json:"parent_value,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
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
	Variant  SearchVariant       `json:"variant,omitempty"`
}

// SuggestResult captures typeahead suggestions with optional metadata.
type SuggestResult struct {
	Suggestions []string       `json:"suggestions"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}
