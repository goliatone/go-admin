package site

import (
	"net/url"
	"sort"
	"strings"
)

func searchFilterChips(filters map[string][]string, baseRoute string, currentQuery map[string][]string) []map[string]any {
	if len(filters) == 0 {
		return []map[string]any{}
	}
	keys := make([]string, 0, len(filters))
	for key := range filters {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := []map[string]any{}
	for _, key := range keys {
		for _, value := range filters[key] {
			value = strings.TrimSpace(value)
			if value == "" {
				continue
			}
			nextQuery := cloneSearchFilters(currentQuery)
			searchRemoveFilterValue(nextQuery, key, value)
			out = append(out, map[string]any{
				"key":        key,
				"value":      value,
				"label":      key + ": " + value,
				"remove_url": searchURLWithQuery(baseRoute, nextQuery),
			})
		}
	}
	return out
}

func searchClearURL(baseRoute string, currentQuery map[string][]string) string {
	next := cloneSearchFilters(currentQuery)
	for key := range next {
		switch {
		case key == "page":
			delete(next, key)
		case strings.HasPrefix(key, "facet_"):
			delete(next, key)
		case strings.HasPrefix(key, "filter_"):
			delete(next, key)
		case strings.HasPrefix(key, "filter."):
			delete(next, key)
		case strings.HasPrefix(key, "filters."):
			delete(next, key)
		case strings.HasSuffix(key, "_gte"):
			delete(next, key)
		case strings.HasSuffix(key, "_lte"):
			delete(next, key)
		}
		if key == "content_type" || key == "tag" || key == "category" || key == "date_from" || key == "date_to" {
			delete(next, key)
		}
	}
	return searchURLWithQuery(baseRoute, next)
}

func cloneSearchFilters(input map[string][]string) map[string][]string {
	if len(input) == 0 {
		return map[string][]string{}
	}
	out := make(map[string][]string, len(input))
	for key, values := range input {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		out[key] = append([]string{}, values...)
	}
	return out
}

func searchAddFilterValue(filters map[string][]string, key string, values ...string) {
	if filters == nil {
		return
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return
	}
	existing := append([]string{}, filters[key]...)
	seen := map[string]struct{}{}
	for _, value := range existing {
		seen[strings.TrimSpace(value)] = struct{}{}
	}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		existing = append(existing, value)
	}
	if len(existing) == 0 {
		return
	}
	filters[key] = existing
}

func searchRemoveFilterValue(filters map[string][]string, key, value string) {
	if len(filters) == 0 {
		return
	}
	key = strings.TrimSpace(key)
	value = strings.TrimSpace(value)
	if key == "" || value == "" {
		return
	}
	values := filters[key]
	if len(values) == 0 {
		return
	}
	out := make([]string, 0, len(values))
	for _, current := range values {
		if strings.TrimSpace(current) == value {
			continue
		}
		out = append(out, current)
	}
	if len(out) == 0 {
		delete(filters, key)
		return
	}
	filters[key] = out
}

func searchFilterContains(values []string, target string) bool {
	target = strings.TrimSpace(target)
	for _, value := range values {
		if strings.EqualFold(strings.TrimSpace(value), target) {
			return true
		}
	}
	return false
}

func searchURLWithQuery(path string, query map[string][]string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		path = "/search"
	}
	if len(query) == 0 {
		return path
	}
	keys := make([]string, 0, len(query))
	for key := range query {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	values := url.Values{}
	for _, key := range keys {
		for _, value := range query[key] {
			value = strings.TrimSpace(value)
			if value == "" {
				continue
			}
			values.Add(key, value)
		}
	}
	if encoded := values.Encode(); encoded != "" {
		return path + "?" + encoded
	}
	return path
}
