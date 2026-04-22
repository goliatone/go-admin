package site

import (
	"sort"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func searchCurrentQueryValues(c router.Context) map[string][]string {
	if c == nil {
		return map[string][]string{}
	}
	out := map[string][]string{}
	for key := range c.Queries() {
		values := searchQueryValues(c, key)
		if len(values) == 0 {
			continue
		}
		out[key] = values
	}
	return out
}

func searchFacetValues(c router.Context) []string {
	values := append(searchQueryValues(c, "facet"), searchQueryValues(c, "facets")...)
	return searchDedupeStrings(values)
}

func searchIndexValues(c router.Context, fallback []string) []string {
	values := append(searchQueryValues(c, "index"), searchQueryValues(c, "indexes")...)
	if len(values) == 0 {
		values = append(searchQueryValues(c, "collection"), searchQueryValues(c, "collections")...)
	}
	values = searchDedupeStrings(values)
	if len(values) > 0 {
		return values
	}
	return cloneStrings(fallback)
}

func searchBaseFilters(c router.Context) map[string][]string {
	out := map[string][]string{}
	if c == nil {
		return out
	}
	reserved := map[string]struct{}{
		"q":               {},
		"query":           {},
		"search":          {},
		"page":            {},
		"per_page":        {},
		"limit":           {},
		"offset":          {},
		"sort":            {},
		"order":           {},
		"facet":           {},
		"facets":          {},
		"index":           {},
		"indexes":         {},
		"format":          {},
		"collection":      {},
		"collections":     {},
		"accept_language": {},
		"env":             {},
		"environment":     {},
		"preview_token":   {},
		"view_profile":    {},
	}
	for key := range c.Queries() {
		normalizedKey := strings.TrimSpace(key)
		if normalizedKey == "" {
			continue
		}
		if _, skip := reserved[normalizedKey]; skip {
			continue
		}
		if _, _, ok := searchRangeKeyParts(normalizedKey); ok {
			continue
		}
		values := searchQueryValues(c, normalizedKey)
		if len(values) == 0 {
			continue
		}
		switch {
		case strings.HasPrefix(normalizedKey, "filter."):
			normalizedKey = strings.TrimPrefix(normalizedKey, "filter.")
		case strings.HasPrefix(normalizedKey, "filter_"):
			normalizedKey = strings.TrimPrefix(normalizedKey, "filter_")
		case strings.HasPrefix(normalizedKey, "filters."):
			normalizedKey = strings.TrimPrefix(normalizedKey, "filters.")
		case strings.HasPrefix(normalizedKey, "facet_"):
			normalizedKey = strings.TrimPrefix(normalizedKey, "facet_")
		}
		searchAddFilterValue(out, normalizedKey, values...)
	}

	searchForwardFilterAlias(out, c, "locale", "locale")
	searchForwardFilterAlias(out, c, "content_type", "content_type", "content_types", "type")
	searchForwardFilterAlias(out, c, "tag", "tag", "tags")
	searchForwardFilterAlias(out, c, "category", "category", "categories")
	searchForwardFilterAlias(out, c, "date_from", "date_from", "from", "start_date")
	searchForwardFilterAlias(out, c, "date_to", "date_to", "to", "end_date")

	return out
}

func searchBaseRanges(c router.Context) []admin.SearchRange {
	if c == nil {
		return nil
	}
	acc := map[string]*admin.SearchRange{}
	addSearchBaseRanges(c, acc)
	if len(acc) == 0 {
		return nil
	}
	return searchRangesFromAccumulator(acc)
}

func addSearchBaseRanges(c router.Context, acc map[string]*admin.SearchRange) {
	for _, key := range sortedSearchQueryKeys(c) {
		field, bound, ok := searchRangeKeyParts(strings.TrimSpace(key))
		if !ok {
			continue
		}
		addSearchBaseRange(c, acc, key, field, bound)
	}
}

func sortedSearchQueryKeys(c router.Context) []string {
	keys := make([]string, 0, len(c.Queries()))
	for key := range c.Queries() {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func addSearchBaseRange(c router.Context, acc map[string]*admin.SearchRange, key, field, bound string) {
	values := searchQueryValues(c, key)
	if len(values) == 0 {
		return
	}
	value := searchParseRangeValue(values[len(values)-1])
	if value == nil {
		return
	}
	entry := searchRangeAccumulatorEntry(acc, field)
	switch bound {
	case "gte":
		entry.GTE = value
	case "lte":
		entry.LTE = value
	}
}

func searchRangeAccumulatorEntry(acc map[string]*admin.SearchRange, field string) *admin.SearchRange {
	entry := acc[field]
	if entry != nil {
		return entry
	}
	entry = &admin.SearchRange{Field: field}
	acc[field] = entry
	return entry
}

func searchRangesFromAccumulator(acc map[string]*admin.SearchRange) []admin.SearchRange {
	fields := make([]string, 0, len(acc))
	for field := range acc {
		fields = append(fields, field)
	}
	sort.Strings(fields)
	out := make([]admin.SearchRange, 0, len(fields))
	for _, field := range fields {
		entry := acc[field]
		if entry == nil || (entry.GTE == nil && entry.LTE == nil) {
			continue
		}
		out = append(out, *entry)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func searchRangeKeyParts(key string) (string, string, bool) {
	key = strings.TrimSpace(key)
	switch {
	case strings.HasSuffix(key, "_gte"):
		field := strings.TrimSpace(strings.TrimSuffix(key, "_gte"))
		return field, "gte", field != ""
	case strings.HasSuffix(key, "_lte"):
		field := strings.TrimSpace(strings.TrimSuffix(key, "_lte"))
		return field, "lte", field != ""
	default:
		return "", "", false
	}
}

func searchParseRangeValue(raw string) any {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	if parsed, err := strconv.Atoi(raw); err == nil {
		return parsed
	}
	if parsed, err := strconv.ParseFloat(raw, 64); err == nil {
		return parsed
	}
	return raw
}

func searchForwardFilterAlias(target map[string][]string, c router.Context, canonical string, aliases ...string) {
	for _, alias := range aliases {
		values := searchQueryValues(c, alias)
		if len(values) == 0 {
			continue
		}
		searchAddFilterValue(target, canonical, values...)
	}
}

func searchQueryValues(c router.Context, key string) []string {
	if c == nil {
		return []string{}
	}
	values := []string{}
	func() {
		defer func() { _ = recover() }()
		values = append(values, c.QueryValues(key)...)
	}()
	if len(values) == 0 {
		if scalar := strings.TrimSpace(c.Query(key)); scalar != "" {
			values = append(values, scalar)
		}
	}
	out := []string{}
	for _, value := range values {
		for part := range strings.SplitSeq(value, ",") {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				out = append(out, trimmed)
			}
		}
	}
	return searchDedupeStrings(out)
}

func searchDedupeStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func searchAcceptLanguage(c router.Context) string {
	if c == nil {
		return ""
	}
	if value := strings.TrimSpace(firstNonEmpty(c.Query("accept_language"), c.Header("Accept-Language"))); value != "" {
		return value
	}
	return ""
}
