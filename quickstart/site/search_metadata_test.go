package site

import (
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestSearchUnavailableErrorPayload(t *testing.T) {
	payload := searchUnavailableErrorPayload(errors.New(" provider offline "))
	if got := anyString(payload["code"]); got != searchUnavailableErrorCode {
		t.Fatalf("expected error code %q, got %q", searchUnavailableErrorCode, got)
	}
	if got := intFromAny(payload["status"]); got != 502 {
		t.Fatalf("expected status 502, got %d", got)
	}
	if got := anyString(payload["message"]); got != "provider offline" {
		t.Fatalf("expected trimmed error message, got %q", got)
	}
}

func TestSearchCollectionsMetadata(t *testing.T) {
	meta := searchCollectionsMetadata([]string{"media", "docs"})
	indexes, ok := meta["indexes"].([]string)
	if !ok || len(indexes) != 2 || indexes[0] != "media" || indexes[1] != "docs" {
		t.Fatalf("expected indexes [media docs], got %+v", meta["indexes"])
	}
	collections, ok := meta["collections"].([]string)
	if !ok || len(collections) != 2 || collections[0] != "media" || collections[1] != "docs" {
		t.Fatalf("expected collections [media docs], got %+v", meta["collections"])
	}
}

func TestSearchPageResponseMeta(t *testing.T) {
	meta := searchPageResponseMeta(admin.SearchRequest{
		Query:   "archive",
		Locale:  "es",
		Sort:    "published_at:desc",
		Filters: map[string][]string{"content_type": {"post"}},
		Ranges:  []admin.SearchRange{{Field: "published_year", GTE: 2024}},
	}, []string{"content_type"}, []string{"media"}, &searchLandingState{Slug: "architecture"})

	if got := anyString(meta["query"]); got != "archive" {
		t.Fatalf("expected query archive, got %q", got)
	}
	if got := anyString(meta["locale"]); got != "es" {
		t.Fatalf("expected locale es, got %q", got)
	}
	if got := anyString(meta["sort"]); got != "published_at:desc" {
		t.Fatalf("expected sort published_at:desc, got %q", got)
	}
	filters, ok := meta["filters"].(map[string][]string)
	if !ok || len(filters["content_type"]) != 1 || filters["content_type"][0] != "post" {
		t.Fatalf("expected content_type filter post, got %+v", meta["filters"])
	}
	if got := nestedMapFromAny(meta["landing"])["slug"]; got != "architecture" {
		t.Fatalf("expected landing slug architecture, got %+v", meta["landing"])
	}
}

func TestSearchSuggestResponseMeta(t *testing.T) {
	meta := searchSuggestResponseMeta(admin.SuggestRequest{
		Query:   "hel",
		Locale:  "en",
		Filters: map[string][]string{"content_type": {"post"}},
	}, []string{"media"})

	if got := anyString(meta["query"]); got != "hel" {
		t.Fatalf("expected query hel, got %q", got)
	}
	if got := anyString(meta["locale"]); got != "en" {
		t.Fatalf("expected locale en, got %q", got)
	}
	filters, ok := meta["filters"].(map[string][]string)
	if !ok || len(filters["content_type"]) != 1 || filters["content_type"][0] != "post" {
		t.Fatalf("expected suggest content_type filter post, got %+v", meta["filters"])
	}
}
