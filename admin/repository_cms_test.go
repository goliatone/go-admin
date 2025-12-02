package admin

import (
	"context"
	"errors"
	"reflect"
	"testing"
)

func TestCMSPageRepositoryListFiltersAndSearch(t *testing.T) {
	content := NewInMemoryContentService()
	_, _ = content.CreatePage(context.Background(), CMSPage{Title: "Home", Slug: "/home", Locale: "en"})
	_, _ = content.CreatePage(context.Background(), CMSPage{Title: "About", Slug: "/about", Locale: "en", ParentID: "1"})
	_, _ = content.CreatePage(context.Background(), CMSPage{Title: "Inicio", Slug: "/inicio", Locale: "es"})

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
	if results[0]["slug"] != "/home" {
		t.Fatalf("expected home page, got %+v", results[0])
	}
	if results[0]["preview_url"] == "" {
		t.Fatalf("expected preview url to be set")
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
	if created["preview_url"] == "" {
		t.Fatalf("expected preview url set")
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

func TestCMSPageRepositoryPreventsSlugCollision(t *testing.T) {
	content := NewInMemoryContentService()
	repo := NewCMSPageRepository(content)
	_, _ = repo.Create(context.Background(), map[string]any{
		"title":  "Home",
		"slug":   "/home",
		"locale": "en",
	})
	_, err := repo.Create(context.Background(), map[string]any{
		"title":  "Another",
		"slug":   "/home",
		"locale": "en",
	})
	if !errors.Is(err, ErrPathConflict) {
		t.Fatalf("expected path conflict, got %v", err)
	}
	_, err = repo.Create(context.Background(), map[string]any{
		"title":  "Inicio",
		"slug":   "/home",
		"locale": "es",
	})
	if err != nil {
		t.Fatalf("expected slug to be allowed for other locale, got %v", err)
	}
}

func TestBlockAndWidgetDefinitionRoundTrip(t *testing.T) {
	content := NewInMemoryContentService()
	blockRepo := NewCMSBlockDefinitionRepository(content)
	schema := map[string]any{"fields": []string{"title", "body"}}
	created, err := blockRepo.Create(context.Background(), map[string]any{
		"name":   "Hero",
		"type":   "text",
		"schema": schema,
	})
	if err != nil {
		t.Fatalf("block definition create failed: %v", err)
	}
	got, err := blockRepo.Get(context.Background(), created["id"].(string))
	if err != nil {
		t.Fatalf("block definition get failed: %v", err)
	}
	if !reflect.DeepEqual(got["schema"], schema) {
		t.Fatalf("expected schema to round trip, got %+v", got["schema"])
	}

	widgetSvc := NewInMemoryWidgetService()
	widgetRepo := NewWidgetDefinitionRepository(widgetSvc)
	_, _ = widgetRepo.Create(context.Background(), map[string]any{
		"code":   "stats",
		"name":   "Stats",
		"schema": `{"type":"stats","fields":["a","b"]}`,
	})
	def, err := widgetRepo.Get(context.Background(), "stats")
	if err != nil {
		t.Fatalf("widget definition get failed: %v", err)
	}
	if def["schema"] == nil {
		t.Fatalf("expected schema to be parsed")
	}
}
