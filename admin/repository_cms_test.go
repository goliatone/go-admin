package admin

import (
	"context"
	"testing"
)

func TestCMSPageRepositoryListFiltersAndSearch(t *testing.T) {
	content := NewInMemoryContentService()
	_, _ = content.CreatePage(context.Background(), CMSPage{Title: "Home", Slug: "home", Locale: "en"})
	_, _ = content.CreatePage(context.Background(), CMSPage{Title: "About", Slug: "about", Locale: "en", ParentID: "1"})
	_, _ = content.CreatePage(context.Background(), CMSPage{Title: "Inicio", Slug: "inicio", Locale: "es"})

	repo := NewCMSPageRepository(content)
	results, total, err := repo.List(context.Background(), ListOptions{
		Page:    1,
		PerPage: 2,
		Filters: map[string]any{"locale": "en"},
		Search:  "ho",
	})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(results) != 1 {
		t.Fatalf("unexpected results total=%d len=%d", total, len(results))
	}
	if results[0]["slug"] != "home" {
		t.Fatalf("expected home page, got %+v", results[0])
	}
}

func TestCMSPageRepositoryCreateUpdateDelete(t *testing.T) {
	content := NewInMemoryContentService()
	repo := NewCMSPageRepository(content)

	created, err := repo.Create(context.Background(), map[string]any{
		"title":     "Docs",
		"slug":      "docs",
		"locale":    "en",
		"parent_id": "",
		"blocks":    []string{"hero"},
		"seo":       map[string]any{"title": "Docs"},
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	id, _ := created["id"].(string)
	if id == "" {
		t.Fatalf("expected id assigned")
	}

	updated, err := repo.Update(context.Background(), id, map[string]any{
		"title":  "Docs Updated",
		"blocks": []string{"hero", "cta"},
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated["title"] != "Docs Updated" {
		t.Fatalf("unexpected title: %+v", updated)
	}

	if err := repo.Delete(context.Background(), id); err != nil {
		t.Fatalf("delete failed: %v", err)
	}
	_, err = repo.Get(context.Background(), id)
	if err == nil {
		t.Fatalf("expected not found after delete")
	}
}
