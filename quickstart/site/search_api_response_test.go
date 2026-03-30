package site

import (
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestSearchAPIErrorResponseUsesSharedUnavailablePayload(t *testing.T) {
	payload := searchAPIErrorResponse(errors.New("provider offline"))
	errorPayload := nestedMapFromAny(payload["error"])

	if anyString(errorPayload["code"]) != searchUnavailableErrorCode {
		t.Fatalf("expected error code %q, got %+v", searchUnavailableErrorCode, payload)
	}
	if anyString(errorPayload["message"]) != "provider offline" {
		t.Fatalf("expected provider offline message, got %+v", payload)
	}
}

func TestSearchAPIResponseBuildsSearchSuccessEnvelope(t *testing.T) {
	payload := searchAPIResponse(
		searchResultEnvelope{
			Hits:       []map[string]any{{"id": "doc-1"}},
			Facets:     []map[string]any{{"name": "content_type"}},
			Pagination: map[string]any{"page": 2},
			Page:       2,
			PerPage:    10,
			Total:      1,
		},
		admin.SearchRequest{Query: "archive", Locale: "en"},
		[]string{"content_type"},
		[]string{"media"},
		&searchLandingState{Slug: "architecture"},
	)

	hits := menuItemsFromContext(t, nestedAny(payload, "data", "hits"))
	if len(hits) != 1 || anyString(hits[0]["id"]) != "doc-1" {
		t.Fatalf("expected hits payload, got %+v", nestedAny(payload, "data"))
	}
	if nestedString(payload, "meta", "locale") != "en" {
		t.Fatalf("expected locale en, got %+v", nestedAny(payload, "meta"))
	}
}

func TestSearchSuggestAPIResponseClonesSuggestions(t *testing.T) {
	result := admin.SuggestResult{Suggestions: []string{"hello", "help"}}
	payload := searchSuggestAPIResponse(result, admin.SuggestRequest{Query: "hel", Locale: "en"}, []string{"media"})

	suggestions, ok := nestedAny(payload, "data", "suggestions").([]string)
	if !ok || len(suggestions) != 2 {
		t.Fatalf("expected two suggestions, got %+v", nestedAny(payload, "data"))
	}
	if nestedString(payload, "meta", "locale") != "en" {
		t.Fatalf("expected locale en in suggest meta, got %+v", nestedAny(payload, "meta"))
	}

	result.Suggestions[0] = "mutated"
	suggestions, ok = nestedAny(payload, "data", "suggestions").([]string)
	if !ok || suggestions[0] != "hello" {
		t.Fatalf("expected response suggestions to remain cloned, got %+v", nestedAny(payload, "data"))
	}
}
