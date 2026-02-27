package main

import (
	"context"
	"testing"
	"time"

	admin "github.com/goliatone/go-admin/admin"
)

func TestExampleSiteSearchProviderSearchAndSuggest(t *testing.T) {
	ctx := context.Background()
	svc := admin.NewInMemoryContentService()

	publishedAt := time.Date(2026, 2, 20, 10, 0, 0, 0, time.UTC)
	_, _ = svc.CreateContent(ctx, admin.CMSContent{
		ID:          "post-1",
		Title:       "Go Runtime Migration",
		Slug:        "go-runtime-migration",
		Locale:      "en",
		Status:      "published",
		ContentType: "post",
		Data: map[string]any{
			"path":         "/posts/go-runtime-migration",
			"summary":      "Capability-driven runtime migration",
			"category":     "guides",
			"tags":         []string{"go", "runtime"},
			"published_at": publishedAt.Format(time.RFC3339),
		},
	})
	_, _ = svc.CreateContent(ctx, admin.CMSContent{
		ID:          "news-1",
		Title:       "Runtime News",
		Slug:        "runtime-news",
		Locale:      "en",
		Status:      "published",
		ContentType: "news",
		Data: map[string]any{
			"path":     "/news/runtime-news",
			"summary":  "News entry",
			"category": "updates",
			"tags":     []string{"news"},
		},
	})
	_, _ = svc.CreateContent(ctx, admin.CMSContent{
		ID:          "draft-1",
		Title:       "Draft Hidden",
		Slug:        "draft-hidden",
		Locale:      "en",
		Status:      "draft",
		ContentType: "post",
		Data: map[string]any{
			"path": "/posts/draft-hidden",
		},
	})

	provider := newExampleSiteSearchProvider(svc, "en")
	result, err := provider.Search(ctx, admin.SearchRequest{
		Query:   "runtime",
		Page:    1,
		PerPage: 10,
		Filters: map[string][]string{"content_type": []string{"post", "news"}},
	})
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	if result.Total < 2 {
		t.Fatalf("expected at least 2 hits, got %d", result.Total)
	}

	for _, hit := range result.Hits {
		if hit.ID == "draft-1" {
			t.Fatalf("expected drafts to be excluded from search hits")
		}
	}

	suggest, err := provider.Suggest(ctx, admin.SuggestRequest{Query: "runtime", Limit: 5})
	if err != nil {
		t.Fatalf("suggest: %v", err)
	}
	if len(suggest.Suggestions) == 0 {
		t.Fatalf("expected suggestions for runtime query")
	}
}

func TestExampleSiteSearchProviderErrorState(t *testing.T) {
	ctx := context.Background()
	svc := admin.NewInMemoryContentService()
	provider := newExampleSiteSearchProvider(svc, "en")

	_, err := provider.Search(ctx, admin.SearchRequest{Query: "error", Page: 1, PerPage: 10})
	if err == nil {
		t.Fatalf("expected simulated error for query=error")
	}
}
