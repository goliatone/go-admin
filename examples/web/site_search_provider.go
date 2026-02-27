package main

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	admin "github.com/goliatone/go-admin/admin"
)

type exampleSiteSearchProvider struct {
	content       admin.CMSContentService
	defaultLocale string
}

func newExampleSiteSearchProvider(content admin.CMSContentService, defaultLocale string) admin.SearchProvider {
	locale := strings.ToLower(strings.TrimSpace(defaultLocale))
	if locale == "" {
		locale = "en"
	}
	return &exampleSiteSearchProvider{
		content:       content,
		defaultLocale: locale,
	}
}

func (p *exampleSiteSearchProvider) Search(ctx context.Context, req admin.SearchRequest) (admin.SearchResultPage, error) {
	if p == nil || p.content == nil {
		return admin.SearchResultPage{}, fmt.Errorf("site search content service unavailable")
	}

	query := strings.TrimSpace(req.Query)
	if strings.EqualFold(query, "error") {
		return admin.SearchResultPage{}, fmt.Errorf("simulated site search failure for demo")
	}

	page := positiveInt(req.Page, 1)
	perPage := positiveInt(req.PerPage, 10)
	locale := normalizeLocaleOrDefault(req.Locale, p.defaultLocale)

	records, err := p.content.Contents(ctx, "")
	if err != nil {
		return admin.SearchResultPage{}, err
	}

	filters := normalizeSearchFilters(req.Filters)
	if locale != "" {
		if _, exists := filters["locale"]; !exists {
			filters["locale"] = []string{locale}
		}
	}

	hits := make([]admin.SearchHit, 0, len(records)+1)
	for _, record := range records {
		hit, ok := mapContentToSearchHit(record)
		if !ok {
			continue
		}
		if !searchHitMatchesFilters(hit, filters) {
			continue
		}
		if !searchHitMatchesQuery(hit, query) {
			continue
		}
		hits = append(hits, hit)
	}

	if query != "" && strings.Contains(strings.ToLower(query), "workflow") {
		hits = append(hits, admin.SearchHit{
			ID:      "doc-workflow-config",
			Type:    "docs",
			Title:   "Workflow Configuration Guide",
			Summary: "Example non-CMS hit used by the demo search page.",
			URL:     "/admin/content-types",
			Locale:  locale,
		})
	}

	sortSearchHits(hits, req.Sort)
	facets := buildSearchFacets(hits)
	total := len(hits)

	start := (page - 1) * perPage
	if start > total {
		start = total
	}
	end := start + perPage
	if end > total {
		end = total
	}

	return admin.SearchResultPage{
		Hits:    hits[start:end],
		Facets:  facets,
		Page:    page,
		PerPage: perPage,
		Total:   total,
	}, nil
}

func (p *exampleSiteSearchProvider) Suggest(ctx context.Context, req admin.SuggestRequest) (admin.SuggestResult, error) {
	if p == nil || p.content == nil {
		return admin.SuggestResult{}, fmt.Errorf("site search content service unavailable")
	}
	query := strings.ToLower(strings.TrimSpace(req.Query))
	if query == "" {
		return admin.SuggestResult{Suggestions: []string{}}, nil
	}
	limit := positiveInt(req.Limit, 8)

	records, err := p.content.Contents(ctx, "")
	if err != nil {
		return admin.SuggestResult{}, err
	}
	seen := map[string]struct{}{}
	suggestions := make([]string, 0, limit)
	for _, record := range records {
		title := strings.TrimSpace(record.Title)
		if title == "" {
			continue
		}
		lower := strings.ToLower(title)
		if !strings.Contains(lower, query) {
			continue
		}
		if _, exists := seen[lower]; exists {
			continue
		}
		seen[lower] = struct{}{}
		suggestions = append(suggestions, title)
		if len(suggestions) >= limit {
			break
		}
	}

	return admin.SuggestResult{Suggestions: suggestions}, nil
}

func mapContentToSearchHit(record admin.CMSContent) (admin.SearchHit, bool) {
	if strings.TrimSpace(record.ID) == "" {
		return admin.SearchHit{}, false
	}
	if !isSearchPublishedStatus(record.Status) {
		return admin.SearchHit{}, false
	}
	title := strings.TrimSpace(record.Title)
	if title == "" && record.Data != nil {
		title = strings.TrimSpace(toString(record.Data["title"]))
	}
	summary := ""
	if record.Data != nil {
		summary = strings.TrimSpace(firstNonEmpty(
			toString(record.Data["summary"]),
			toString(record.Data["excerpt"]),
			toString(record.Data["description"]),
		))
	}
	path := ""
	if record.Data != nil {
		path = strings.TrimSpace(firstNonEmpty(
			toString(record.Data["path"]),
			toString(record.Data["url"]),
		))
	}
	if path == "" {
		path = defaultPathForContent(record)
	}
	locale := strings.TrimSpace(firstNonEmpty(record.ResolvedLocale, record.Locale))
	contentType := strings.TrimSpace(firstNonEmpty(record.ContentTypeSlug, record.ContentType))
	if contentType == "" {
		contentType = "content"
	}

	hit := admin.SearchHit{
		ID:      strings.TrimSpace(record.ID),
		Type:    contentType,
		Title:   title,
		Summary: summary,
		URL:     admin.CanonicalPath(path, "/"+strings.Trim(strings.TrimSpace(record.Slug), "/")),
		Locale:  strings.ToLower(locale),
		Fields: map[string]any{
			"slug":         strings.TrimSpace(record.Slug),
			"content_type": contentType,
			"category":     strings.TrimSpace(toString(nestedMapValue(record.Data, "category"))),
			"tags":         toStringSlice(nestedMapValue(record.Data, "tags")),
		},
	}
	if publishedAt := parseTimeAny(nestedMapValue(record.Data, "published_at")); publishedAt != nil {
		hit.PublishedAt = publishedAt
	}
	if hit.Title == "" {
		hit.Title = strings.TrimSpace(record.Slug)
	}
	return hit, true
}

func defaultPathForContent(record admin.CMSContent) string {
	slug := strings.Trim(strings.TrimSpace(record.Slug), "/")
	if slug == "" {
		return "/"
	}
	switch strings.ToLower(strings.TrimSpace(firstNonEmpty(record.ContentTypeSlug, record.ContentType))) {
	case "page", "pages":
		return "/" + slug
	case "post", "posts":
		return "/posts/" + slug
	case "news":
		return "/news/" + slug
	default:
		return admin.CanonicalContentPath(strings.TrimSpace(record.ContentType), slug)
	}
}

func normalizeSearchFilters(filters map[string][]string) map[string][]string {
	if len(filters) == 0 {
		return map[string][]string{}
	}
	out := make(map[string][]string, len(filters))
	for key, values := range filters {
		normalizedKey := strings.ToLower(strings.TrimSpace(key))
		if normalizedKey == "" {
			continue
		}
		normalizedValues := make([]string, 0, len(values))
		for _, value := range values {
			trimmed := strings.TrimSpace(value)
			if trimmed == "" {
				continue
			}
			normalizedValues = append(normalizedValues, trimmed)
		}
		if len(normalizedValues) == 0 {
			continue
		}
		out[normalizedKey] = normalizedValues
	}
	return out
}

func searchHitMatchesFilters(hit admin.SearchHit, filters map[string][]string) bool {
	if len(filters) == 0 {
		return true
	}
	for key, values := range filters {
		if len(values) == 0 {
			continue
		}
		switch key {
		case "locale":
			if !containsFold(values, hit.Locale) {
				return false
			}
		case "content_type":
			if !containsFold(values, hit.Type) {
				return false
			}
		case "category":
			category := strings.TrimSpace(toString(hit.Fields["category"]))
			if category == "" || !containsFold(values, category) {
				return false
			}
		case "tag":
			tags := toStringSlice(hit.Fields["tags"])
			if !containsAnyFold(values, tags) {
				return false
			}
		case "date_from":
			if !matchesFromDateFilter(values, hit.PublishedAt) {
				return false
			}
		case "date_to":
			if !matchesToDateFilter(values, hit.PublishedAt) {
				return false
			}
		}
	}
	return true
}

func searchHitMatchesQuery(hit admin.SearchHit, query string) bool {
	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		return true
	}
	for _, candidate := range []string{
		hit.Title,
		hit.Summary,
		toString(hit.Fields["slug"]),
		toString(hit.Type),
	} {
		if strings.Contains(strings.ToLower(strings.TrimSpace(candidate)), query) {
			return true
		}
	}
	return false
}

func sortSearchHits(hits []admin.SearchHit, sortSpec string) {
	sortSpec = strings.TrimSpace(strings.ToLower(sortSpec))
	switch sortSpec {
	case "published_at:asc":
		sort.SliceStable(hits, func(i, j int) bool {
			return comparePublishedAt(hits[i].PublishedAt, hits[j].PublishedAt, true)
		})
	case "published_at:desc", "", "relevance":
		sort.SliceStable(hits, func(i, j int) bool {
			return comparePublishedAt(hits[i].PublishedAt, hits[j].PublishedAt, false)
		})
	default:
		sort.SliceStable(hits, func(i, j int) bool {
			return comparePublishedAt(hits[i].PublishedAt, hits[j].PublishedAt, false)
		})
	}
}

func comparePublishedAt(left, right *time.Time, asc bool) bool {
	if left == nil && right == nil {
		return false
	}
	if left == nil {
		return !asc
	}
	if right == nil {
		return asc
	}
	if asc {
		return left.Before(*right)
	}
	return left.After(*right)
}

func buildSearchFacets(hits []admin.SearchHit) []admin.SearchFacet {
	if len(hits) == 0 {
		return nil
	}
	counts := map[string]map[string]int{
		"content_type": {},
		"locale":       {},
		"category":     {},
		"tag":          {},
	}
	for _, hit := range hits {
		incrementFacet(counts["content_type"], hit.Type)
		incrementFacet(counts["locale"], hit.Locale)
		incrementFacet(counts["category"], toString(hit.Fields["category"]))
		for _, tag := range toStringSlice(hit.Fields["tags"]) {
			incrementFacet(counts["tag"], tag)
		}
	}

	order := []string{"content_type", "locale", "category", "tag"}
	facets := make([]admin.SearchFacet, 0, len(order))
	for _, name := range order {
		buckets := facetBucketsFromCounts(counts[name])
		if len(buckets) == 0 {
			continue
		}
		facets = append(facets, admin.SearchFacet{Name: name, Buckets: buckets})
	}
	if len(facets) == 0 {
		return nil
	}
	return facets
}

func incrementFacet(counter map[string]int, raw string) {
	if counter == nil {
		return
	}
	value := strings.TrimSpace(strings.ToLower(raw))
	if value == "" {
		return
	}
	counter[value]++
}

func facetBucketsFromCounts(counter map[string]int) []admin.SearchFacetTerm {
	if len(counter) == 0 {
		return nil
	}
	buckets := make([]admin.SearchFacetTerm, 0, len(counter))
	for value, count := range counter {
		buckets = append(buckets, admin.SearchFacetTerm{Value: value, Count: count})
	}
	sort.SliceStable(buckets, func(i, j int) bool {
		if buckets[i].Count == buckets[j].Count {
			return buckets[i].Value < buckets[j].Value
		}
		return buckets[i].Count > buckets[j].Count
	})
	return buckets
}

func matchesFromDateFilter(values []string, publishedAt *time.Time) bool {
	if len(values) == 0 {
		return true
	}
	if publishedAt == nil {
		return false
	}
	from := parseTimeAny(values[0])
	if from == nil {
		return true
	}
	return !publishedAt.Before(*from)
}

func matchesToDateFilter(values []string, publishedAt *time.Time) bool {
	if len(values) == 0 {
		return true
	}
	if publishedAt == nil {
		return false
	}
	to := parseTimeAny(values[0])
	if to == nil {
		return true
	}
	return !publishedAt.After(*to)
}

func parseTimeAny(raw any) *time.Time {
	switch typed := raw.(type) {
	case time.Time:
		if typed.IsZero() {
			return nil
		}
		value := typed
		return &value
	case *time.Time:
		if typed == nil || typed.IsZero() {
			return nil
		}
		value := *typed
		return &value
	case string:
		trimmed := strings.TrimSpace(typed)
		if trimmed == "" {
			return nil
		}
		for _, layout := range []string{time.RFC3339, time.RFC3339Nano, "2006-01-02"} {
			if parsed, err := time.Parse(layout, trimmed); err == nil {
				value := parsed
				return &value
			}
		}
	}
	return nil
}

func nestedMapValue(values map[string]any, key string) any {
	if len(values) == 0 {
		return nil
	}
	return values[strings.TrimSpace(key)]
}

func toString(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return typed
	default:
		return fmt.Sprint(typed)
	}
}

func toStringSlice(value any) []string {
	switch typed := value.(type) {
	case nil:
		return nil
	case []string:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			trimmed := strings.TrimSpace(item)
			if trimmed == "" {
				continue
			}
			out = append(out, trimmed)
		}
		return out
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			trimmed := strings.TrimSpace(fmt.Sprint(item))
			if trimmed == "" {
				continue
			}
			out = append(out, trimmed)
		}
		return out
	default:
		trimmed := strings.TrimSpace(fmt.Sprint(typed))
		if trimmed == "" {
			return nil
		}
		parts := strings.Split(trimmed, ",")
		out := make([]string, 0, len(parts))
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			out = append(out, part)
		}
		return out
	}
}

func containsFold(values []string, target string) bool {
	target = strings.TrimSpace(strings.ToLower(target))
	if target == "" {
		return false
	}
	for _, value := range values {
		if strings.TrimSpace(strings.ToLower(value)) == target {
			return true
		}
	}
	return false
}

func containsAnyFold(candidates []string, values []string) bool {
	if len(candidates) == 0 || len(values) == 0 {
		return false
	}
	for _, candidate := range candidates {
		if containsFold(values, candidate) {
			return true
		}
	}
	return false
}

func normalizeLocaleOrDefault(locale, fallback string) string {
	locale = strings.ToLower(strings.TrimSpace(locale))
	if locale != "" {
		return locale
	}
	fallback = strings.ToLower(strings.TrimSpace(fallback))
	if fallback == "" {
		return "en"
	}
	return fallback
}

func positiveInt(value, fallback int) int {
	if value > 0 {
		return value
	}
	if fallback > 0 {
		return fallback
	}
	return 1
}

func isSearchPublishedStatus(status string) bool {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "published", "scheduled", "active":
		return true
	default:
		return false
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}
