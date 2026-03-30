package site

import "testing"

func TestSearchFilterChipsBuildRemoveURLs(t *testing.T) {
	chips := searchFilterChips(
		map[string][]string{
			"tag":          {"go"},
			"content_type": {"post"},
		},
		"/search",
		map[string][]string{
			"q":            {"archive"},
			"tag":          {"go"},
			"content_type": {"post"},
		},
	)

	if len(chips) != 2 {
		t.Fatalf("expected two chips, got %+v", chips)
	}

	var tagRemoveURL string
	for _, chip := range chips {
		if chip["key"] == "tag" {
			tagRemoveURL = anyString(chip["remove_url"])
		}
	}
	if tagRemoveURL != "/search?content_type=post&q=archive" {
		t.Fatalf("expected tag remove url to drop tag only, got %q", tagRemoveURL)
	}
}

func TestSearchClearURLRemovesFilterAndRangeKeysOnly(t *testing.T) {
	got := searchClearURL("/search", map[string][]string{
		"q":                  {"archive"},
		"page":               {"2"},
		"filter.visibility":  {"public"},
		"facet_tag":          {"go"},
		"published_year_gte": {"2024"},
		"tag":                {"architecture"},
		"sort":               {"published_year:desc"},
	})

	if got != "/search?q=archive&sort=published_year%3Adesc" {
		t.Fatalf("expected clear url to preserve only non-filter state, got %q", got)
	}
}

func TestSearchFilterMutationHelpersDeduplicateAndRemove(t *testing.T) {
	filters := map[string][]string{}
	searchAddFilterValue(filters, "tag", "go", "go", "news")
	if len(filters["tag"]) != 2 || !searchFilterContains(filters["tag"], "GO") || !searchFilterContains(filters["tag"], "news") {
		t.Fatalf("expected deduplicated tag values, got %+v", filters)
	}

	searchRemoveFilterValue(filters, "tag", "go")
	if len(filters["tag"]) != 1 || filters["tag"][0] != "news" {
		t.Fatalf("expected go to be removed, got %+v", filters)
	}

	searchRemoveFilterValue(filters, "tag", "news")
	if _, ok := filters["tag"]; ok {
		t.Fatalf("expected tag key to be removed when empty, got %+v", filters)
	}
}

func TestSearchURLWithQuerySortsAndDropsBlankValues(t *testing.T) {
	got := searchURLWithQuery("/search", map[string][]string{
		"tag": {"go", " "},
		"q":   {"archive"},
		"z":   {""},
	})
	if got != "/search?q=archive&tag=go" {
		t.Fatalf("expected sorted compact query string, got %q", got)
	}
}
