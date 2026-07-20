package admin

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

type siteSearchProviderStub struct{}

func (siteSearchProviderStub) Search(_ context.Context, req SearchRequest) (SearchResultPage, error) {
	return SearchResultPage{
		Hits:    []SearchHit{{ID: "doc-1", Title: req.Query}},
		Page:    req.Page,
		PerPage: req.PerPage,
		Total:   1,
	}, nil
}

func TestSearchFoundationContractsRemainAdditiveAtZeroValue(t *testing.T) {
	payload, err := json.Marshal(SearchResultPage{})
	if err != nil {
		t.Fatal(err)
	}
	body := string(payload)
	if strings.Contains(body, `"counts"`) || strings.Contains(body, `"total_accuracy"`) {
		t.Fatalf("optional fields leaked into zero value: %s", body)
	}
	var _ SearchProvider = siteSearchProviderStub{}
}

func (siteSearchProviderStub) Suggest(_ context.Context, req SuggestRequest) (SuggestResult, error) {
	return SuggestResult{Suggestions: []string{req.Query}}, nil
}

func TestSearchProviderContract(t *testing.T) {
	var provider SearchProvider = siteSearchProviderStub{}
	result, err := provider.Search(context.Background(), SearchRequest{Query: "hello", Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	if len(result.Hits) != 1 || result.Hits[0].ID != "doc-1" {
		t.Fatalf("unexpected search result: %+v", result)
	}

	suggest, err := provider.Suggest(context.Background(), SuggestRequest{Query: "he"})
	if err != nil {
		t.Fatalf("suggest: %v", err)
	}
	if len(suggest.Suggestions) != 1 || suggest.Suggestions[0] != "he" {
		t.Fatalf("unexpected suggest result: %+v", suggest)
	}
}
