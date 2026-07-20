package site

import (
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
)

type normalizedSearchResult struct {
	Hits          []map[string]any `json:"hits"`
	Facets        []map[string]any `json:"facets"`
	FilterChips   []map[string]any `json:"filter_chips"`
	Pagination    map[string]any   `json:"pagination"`
	Counts        []map[string]any `json:"counts,omitempty"`
	TotalAccuracy string           `json:"total_accuracy,omitempty"`
}

func normalizeSearchResults(
	result admin.SearchResultPage,
	activeFilters map[string][]string,
	baseRoute string,
	currentQuery map[string][]string,
) normalizedSearchResult {
	hits := make([]map[string]any, 0, len(result.Hits))
	for _, hit := range result.Hits {
		hits = append(hits, normalizeSearchHit(hit))
	}

	facets := make([]map[string]any, 0, len(result.Facets))
	for _, facet := range result.Facets {
		facetName := strings.TrimSpace(facet.Name)
		if facetName == "" {
			continue
		}
		buckets := make([]map[string]any, 0, len(facet.Buckets))
		for _, bucket := range facet.Buckets {
			value := strings.TrimSpace(bucket.Value)
			if value == "" {
				continue
			}
			active := bucket.Selected || searchFilterContains(activeFilters[facetName], value)
			nextQuery := cloneSearchFilters(currentQuery)
			if active {
				searchRemoveCanonicalFilterValue(nextQuery, facetName, value)
			} else {
				searchAddCanonicalFilterValue(nextQuery, facetName, value)
			}
			buckets = append(buckets, map[string]any{
				"value":        value,
				"label":        strings.TrimSpace(firstNonEmpty(bucket.Label, value)),
				"count":        bucket.Count,
				"active":       active,
				"selected":     active,
				"path":         append([]string{}, bucket.Path...),
				"level":        bucket.Level,
				"indent_px":    bucket.Level * 12,
				"parent_value": bucket.ParentValue,
				"metadata":     cloneAnyMap(bucket.Metadata),
				"url":          searchURLWithQuery(baseRoute, nextQuery),
			})
		}
		if len(buckets) == 0 {
			continue
		}
		facets = append(facets, map[string]any{
			"name":        facetName,
			"kind":        strings.TrimSpace(facet.Kind),
			"disjunctive": facet.Disjunctive,
			"metadata":    cloneAnyMap(facet.Metadata),
			"buckets":     buckets,
		})
	}

	chips := searchFilterChips(activeFilters, baseRoute, currentQuery)
	page := searchPositiveOrFallback(result.Page, 1)
	perPage := searchPositiveOrFallback(result.PerPage, 10)
	hasPrev := page > 1
	hasNext := searchHasNextPage(result, page, perPage)
	prevPage := max(page-1, 1)
	nextPage := page + 1
	prevQuery := cloneSearchFilters(currentQuery)
	prevQuery["page"] = []string{strconv.Itoa(prevPage)}
	nextQuery := cloneSearchFilters(currentQuery)
	nextQuery["page"] = []string{strconv.Itoa(nextPage)}
	pagination := map[string]any{
		"page":           page,
		"per_page":       perPage,
		"total":          result.Total,
		"has_prev":       hasPrev,
		"has_next":       hasNext,
		"prev_page":      prevPage,
		"next_page":      nextPage,
		"prev_url":       searchURLWithQuery(baseRoute, prevQuery),
		"next_url":       searchURLWithQuery(baseRoute, nextQuery),
		"total_accuracy": string(result.TotalAccuracy),
	}

	return normalizedSearchResult{
		Hits:          hits,
		Facets:        facets,
		FilterChips:   chips,
		Pagination:    pagination,
		Counts:        normalizeSearchCounts(result.Counts),
		TotalAccuracy: string(result.TotalAccuracy),
	}
}

func searchHasNextPage(result admin.SearchResultPage, page, perPage int) bool {
	if result.Total > page*perPage {
		return true
	}
	switch result.TotalAccuracy {
	case admin.SearchTotalAccuracyLowerBound, admin.SearchTotalAccuracyApproximate:
		return len(result.Hits) >= perPage
	default:
		return false
	}
}

func normalizeSearchHit(hit admin.SearchHit) map[string]any {
	fields := cloneAnyMap(hit.Fields)
	out := map[string]any{
		"id":               strings.TrimSpace(hit.ID),
		"type":             strings.TrimSpace(hit.Type),
		"title":            strings.TrimSpace(hit.Title),
		"summary":          strings.TrimSpace(hit.Summary),
		"locale":           strings.TrimSpace(hit.Locale),
		"score":            hit.Score,
		"fields":           fields,
		"snippet":          strings.TrimSpace(hit.Snippet),
		"highlighted":      strings.TrimSpace(hit.Highlighted),
		"parent_id":        strings.TrimSpace(hit.ParentID),
		"parent_title":     strings.TrimSpace(hit.ParentTitle),
		"parent_url":       strings.TrimSpace(hit.ParentURL),
		"parent_thumbnail": strings.TrimSpace(hit.ParentThumbnail),
		"parent_summary":   strings.TrimSpace(hit.ParentSummary),
		"anchor":           hit.Anchor,
		"metadata":         cloneAnyMap(hit.Metadata),
		"evidence":         normalizeSearchEvidence(hit.Evidence),
		"found_in":         normalizeSearchEvidenceLocations(hit.Evidence),
	}
	if out["title"] == "" {
		out["title"] = strings.TrimSpace(anyString(hit.Fields["title"]))
	}
	if out["summary"] == "" {
		out["summary"] = strings.TrimSpace(anyString(hit.Fields["summary"]))
	}
	out["url"] = searchNormalizedHitURL(hit)
	if hit.PublishedAt != nil {
		out["published_at"] = hit.PublishedAt.UTC().Format(time.RFC3339)
	}
	if out["summary"] == "" {
		out["summary"] = strings.TrimSpace(hit.Snippet)
	}
	if badge := strings.TrimSpace(anyString(fields["result_badge"])); badge != "" {
		out["badge"] = badge
	}
	return out
}

func normalizeSearchCounts(counts map[string]admin.SearchCount) []map[string]any {
	keys := make([]string, 0, len(counts))
	for key := range counts {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make([]map[string]any, 0, len(keys))
	for _, key := range keys {
		count := counts[key]
		out = append(out, map[string]any{"key": key, "value": count.Value, "accuracy": string(count.Accuracy), "diagnostic": count.Diagnostic})
	}
	return out
}

func normalizeSearchEvidence(evidence *admin.SearchEvidence) map[string]any {
	if evidence == nil {
		return nil
	}
	return map[string]any{"exact": evidence.Exact, "status": string(evidence.Status), "diagnostic": evidence.Diagnostic, "locations": normalizeSearchEvidenceLocations(evidence)}
}

func normalizeSearchEvidenceLocations(evidence *admin.SearchEvidence) []map[string]any {
	if evidence == nil {
		return nil
	}
	out := make([]map[string]any, 0, len(evidence.Locations))
	for _, location := range evidence.Locations {
		samples := make([]map[string]any, 0, len(location.Samples))
		for _, sample := range location.Samples {
			var snippet map[string]any
			if sample.Snippet != nil {
				snippet = map[string]any{"text": sample.Snippet.Text, "highlighted": sample.Snippet.Highlighted}
			}
			samples = append(samples, map[string]any{"document_id": sample.DocumentID, "field": sample.Field, "locale": sample.Locale, "snippet": snippet, "chunk_ordinal": sample.ChunkOrdinal, "anchor": sample.Anchor})
		}
		out = append(out, map[string]any{"location": location.Location, "count": location.Count, "samples": samples})
	}
	return out
}

func cloneSearchRanges(input []admin.SearchRange) []admin.SearchRange {
	if len(input) == 0 {
		return nil
	}
	out := make([]admin.SearchRange, 0, len(input))
	for _, item := range input {
		field := strings.TrimSpace(item.Field)
		if field == "" || (item.GTE == nil && item.LTE == nil) {
			continue
		}
		out = append(out, admin.SearchRange{
			Field: field,
			GTE:   item.GTE,
			LTE:   item.LTE,
		})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
