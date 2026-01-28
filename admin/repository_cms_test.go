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
	blockRepo := NewCMSBlockDefinitionRepository(content, content)
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

func TestCMSContentRepositoryEmbeddedBlocksAndSchema(t *testing.T) {
	content := NewInMemoryContentService()
	repo := NewCMSContentRepository(content)

	blocks := []map[string]any{
		{"_type": "hero", "title": "Hello"},
	}
	created, err := repo.Create(context.Background(), map[string]any{
		"title":        "Blocky",
		"slug":         "blocky",
		"locale":       "en",
		"status":       "draft",
		"content_type": "article",
		"blocks":       blocks,
		"_schema":      "content/v1",
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	if created["_schema"] != "content/v1" {
		t.Fatalf("expected schema version set, got %+v", created["_schema"])
	}
	if gotBlocks, ok := created["blocks"].([]map[string]any); !ok || len(gotBlocks) != 1 {
		t.Fatalf("expected embedded blocks returned, got %+v", created["blocks"])
	}

	id, _ := created["id"].(string)
	updated, err := repo.Update(context.Background(), id, map[string]any{
		"title": "Blocky Updated",
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated["_schema"] != "content/v1" {
		t.Fatalf("expected schema preserved on update, got %+v", updated["_schema"])
	}

	item, err := content.Content(context.Background(), id, "en")
	if err != nil || item == nil {
		t.Fatalf("expected content stored, got err=%v", err)
	}
	if item.SchemaVersion != "content/v1" {
		t.Fatalf("expected content schema version persisted, got %+v", item.SchemaVersion)
	}
	if len(item.EmbeddedBlocks) != 1 {
		t.Fatalf("expected embedded blocks persisted, got %+v", item.EmbeddedBlocks)
	}
}

func TestCMSBlockDefinitionRepositoryFiltersByContentType(t *testing.T) {
	content := NewInMemoryContentService()
	ctx := context.Background()
	_, _ = content.CreateContentType(ctx, CMSContentType{
		ID:           "ct-1",
		Name:         "Article",
		Slug:         "article",
		Schema:       map[string]any{"fields": []map[string]any{{"name": "title", "type": "string"}}},
		Capabilities: map[string]any{"block_types": []string{"hero", "gallery"}},
	})
	_, _ = content.CreateBlockDefinition(ctx, CMSBlockDefinition{ID: "hero", Name: "Hero", Type: "hero"})
	_, _ = content.CreateBlockDefinition(ctx, CMSBlockDefinition{ID: "gallery", Name: "Gallery", Type: "gallery"})
	_, _ = content.CreateBlockDefinition(ctx, CMSBlockDefinition{ID: "cta", Name: "CTA", Type: "cta"})

	repo := NewCMSBlockDefinitionRepository(content, content)
	defs, total, err := repo.List(ctx, ListOptions{Filters: map[string]any{"content_type": "article"}, PerPage: 10})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 2 || len(defs) != 2 {
		t.Fatalf("expected 2 defs, got total=%d len=%d", total, len(defs))
	}
	seen := map[string]bool{}
	for _, def := range defs {
		seen[toString(def["id"])] = true
	}
	if !seen["hero"] || !seen["gallery"] {
		t.Fatalf("expected filtered defs, got %+v", defs)
	}
}
