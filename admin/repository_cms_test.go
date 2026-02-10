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

func TestCMSContentTypeEntryRepositoryListAppliesOperatorAwareFilters(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	repo := NewCMSContentTypeEntryRepository(content, CMSContentType{Slug: "page"})

	_, _ = content.CreateContent(ctx, CMSContent{
		Title:           "Home Page",
		Slug:            "home",
		Locale:          "en",
		Status:          "published",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"category": "news",
			"author":   "alice",
		},
	})
	_, _ = content.CreateContent(ctx, CMSContent{
		Title:           "Landing",
		Slug:            "landing",
		Locale:          "en",
		Status:          "draft",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"category": "updates",
			"author":   "bob",
		},
	})
	_, _ = content.CreateContent(ctx, CMSContent{
		Title:           "Changelog",
		Slug:            "changelog",
		Locale:          "en",
		Status:          "published",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"category": "updates",
			"author":   "alice",
		},
	})
	_, _ = content.CreateContent(ctx, CMSContent{
		Title:           "Home Post",
		Slug:            "home-post",
		Locale:          "en",
		Status:          "published",
		ContentTypeSlug: "post",
		Data: map[string]any{
			"category": "news",
			"author":   "alice",
		},
	})

	_, total, err := repo.List(ctx, ListOptions{Filters: map[string]any{"status": "published"}, PerPage: 20})
	if err != nil {
		t.Fatalf("list with status filter failed: %v", err)
	}
	if total != 2 {
		t.Fatalf("expected 2 published page records, got %d", total)
	}

	_, total, err = repo.List(ctx, ListOptions{Filters: map[string]any{"status__in": "draft,published"}, PerPage: 20})
	if err != nil {
		t.Fatalf("list with status__in failed: %v", err)
	}
	if total != 3 {
		t.Fatalf("expected 3 page records for status__in, got %d", total)
	}

	_, total, err = repo.List(ctx, ListOptions{Filters: map[string]any{"title__ilike": "home"}, PerPage: 20})
	if err != nil {
		t.Fatalf("list with title__ilike failed: %v", err)
	}
	if total != 1 {
		t.Fatalf("expected 1 page record for title__ilike, got %d", total)
	}

	_, total, err = repo.List(ctx, ListOptions{Filters: map[string]any{"author__eq": "alice"}, PerPage: 20})
	if err != nil {
		t.Fatalf("list with author__eq failed: %v", err)
	}
	if total != 2 {
		t.Fatalf("expected 2 page records for author__eq data filter, got %d", total)
	}

	_, total, err = repo.List(ctx, ListOptions{Filters: map[string]any{"category__in": "news,announcements"}, PerPage: 20})
	if err != nil {
		t.Fatalf("list with category__in failed: %v", err)
	}
	if total != 1 {
		t.Fatalf("expected 1 page record for category__in data filter, got %d", total)
	}

	_, total, err = repo.List(ctx, ListOptions{
		Search:  "home",
		Filters: map[string]any{"status": "published"},
		PerPage: 20,
	})
	if err != nil {
		t.Fatalf("list with search+status failed: %v", err)
	}
	if total != 1 {
		t.Fatalf("expected search+status intersection to return 1 record, got %d", total)
	}

	_, total, err = repo.List(ctx, ListOptions{
		Search:  "home",
		Filters: map[string]any{"title__ilike": "landing"},
		PerPage: 20,
	})
	if err != nil {
		t.Fatalf("list with search+title__ilike failed: %v", err)
	}
	if total != 0 {
		t.Fatalf("expected search+title__ilike intersection to return 0 records, got %d", total)
	}

	_, total, err = repo.List(ctx, ListOptions{
		Filters: map[string]any{
			"status":     "published",
			"title__gt":  "zzz",
			"author__ne": "alice",
		},
		PerPage: 20,
	})
	if err != nil {
		t.Fatalf("list with unknown operators failed: %v", err)
	}
	if total != 2 {
		t.Fatalf("expected unknown operators to be ignored, got total=%d", total)
	}
}

func TestCMSContentTypeEntryRepositoryListFiltersBeforePagination(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	repo := NewCMSContentTypeEntryRepository(content, CMSContentType{Slug: "page"})

	_, _ = content.CreateContent(ctx, CMSContent{Title: "One", Slug: "one", Locale: "en", Status: "published", ContentTypeSlug: "page"})
	_, _ = content.CreateContent(ctx, CMSContent{Title: "Two", Slug: "two", Locale: "en", Status: "draft", ContentTypeSlug: "page"})
	_, _ = content.CreateContent(ctx, CMSContent{Title: "Three", Slug: "three", Locale: "en", Status: "published", ContentTypeSlug: "page"})

	list, total, err := repo.List(ctx, ListOptions{
		Page:    1,
		PerPage: 1,
		Filters: map[string]any{"status": "published"},
	})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 2 {
		t.Fatalf("expected filtered total to be 2 before pagination, got %d", total)
	}
	if len(list) != 1 {
		t.Fatalf("expected one paginated record, got %d", len(list))
	}
}

func TestCMSContentTypeEntryRepositoryListSortsBeforePagination(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	repo := NewCMSContentTypeEntryRepository(content, CMSContentType{Slug: "post"})

	_, _ = content.CreateContent(ctx, CMSContent{Title: "Gamma", Slug: "gamma", Locale: "en", Status: "published", ContentTypeSlug: "post"})
	_, _ = content.CreateContent(ctx, CMSContent{Title: "Alpha", Slug: "alpha", Locale: "en", Status: "published", ContentTypeSlug: "post"})
	_, _ = content.CreateContent(ctx, CMSContent{Title: "Beta", Slug: "beta", Locale: "en", Status: "published", ContentTypeSlug: "post"})

	pageOne, total, err := repo.List(ctx, ListOptions{
		Page:    1,
		PerPage: 1,
		SortBy:  "title",
	})
	if err != nil {
		t.Fatalf("list page one failed: %v", err)
	}
	if total != 3 {
		t.Fatalf("expected total 3, got %d", total)
	}
	if len(pageOne) != 1 {
		t.Fatalf("expected one item on page one, got %d", len(pageOne))
	}
	if got := toString(pageOne[0]["title"]); got != "Alpha" {
		t.Fatalf("expected first sorted item Alpha, got %q", got)
	}

	pageTwo, total, err := repo.List(ctx, ListOptions{
		Page:    2,
		PerPage: 1,
		SortBy:  "title",
	})
	if err != nil {
		t.Fatalf("list page two failed: %v", err)
	}
	if total != 3 {
		t.Fatalf("expected total 3 on page two, got %d", total)
	}
	if len(pageTwo) != 1 {
		t.Fatalf("expected one item on page two, got %d", len(pageTwo))
	}
	if got := toString(pageTwo[0]["title"]); got != "Beta" {
		t.Fatalf("expected second sorted item Beta, got %q", got)
	}

	desc, total, err := repo.List(ctx, ListOptions{
		Page:     1,
		PerPage:  1,
		SortBy:   "title",
		SortDesc: true,
	})
	if err != nil {
		t.Fatalf("list desc failed: %v", err)
	}
	if total != 3 {
		t.Fatalf("expected total 3 on desc list, got %d", total)
	}
	if len(desc) != 1 {
		t.Fatalf("expected one item on desc page one, got %d", len(desc))
	}
	if got := toString(desc[0]["title"]); got != "Gamma" {
		t.Fatalf("expected desc item Gamma, got %q", got)
	}
}

func TestCMSContentTypeEntryRepositoryListFlattensMarkdownFields(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	repo := NewCMSContentTypeEntryRepository(content, CMSContentType{Slug: "page"})

	_, _ = content.CreateContent(ctx, CMSContent{
		Title:           "About Us",
		Slug:            "about",
		Locale:          "en",
		Status:          "published",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"markdown": map[string]any{
				"body": "We build composable admin products.",
				"frontmatter": map[string]any{
					"summary": "How the team builds reliable admin tooling for Go services.",
					"tags":    []string{"company", "mission", "engineering"},
				},
				"custom": map[string]any{
					"path":           "/about",
					"published_at":   "2025-10-13T10:00:00Z",
					"featured_image": "/static/media/logo.png",
					"meta": map[string]any{
						"audience":             "customers",
						"reading_time_minutes": 4,
					},
					"seo": map[string]any{
						"title":       "About Enterprise Admin",
						"description": "Meet the team building modular admin tooling for Go applications.",
					},
				},
			},
		},
	})

	list, total, err := repo.List(ctx, ListOptions{PerPage: 20})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(list) != 1 {
		t.Fatalf("expected one record, got total=%d len=%d", total, len(list))
	}

	record := list[0]
	if got := toString(record["summary"]); got != "How the team builds reliable admin tooling for Go services." {
		t.Fatalf("expected flattened summary, got %q", got)
	}
	if got := toString(record["path"]); got != "/about" {
		t.Fatalf("expected flattened path, got %q", got)
	}
	if got := toString(record["published_at"]); got != "2025-10-13T10:00:00Z" {
		t.Fatalf("expected flattened published_at, got %q", got)
	}
	if got := toString(record["featured_image"]); got != "/static/media/logo.png" {
		t.Fatalf("expected flattened featured_image, got %q", got)
	}
	if got := toString(record["meta_title"]); got != "About Enterprise Admin" {
		t.Fatalf("expected derived meta_title, got %q", got)
	}
	if got := toString(record["meta_description"]); got != "Meet the team building modular admin tooling for Go applications." {
		t.Fatalf("expected derived meta_description, got %q", got)
	}
	if got := toString(record["content"]); got != "We build composable admin products." {
		t.Fatalf("expected derived content body, got %q", got)
	}
	meta, ok := record["meta"].(map[string]any)
	if !ok || toString(meta["audience"]) != "customers" {
		t.Fatalf("expected flattened meta map, got %#v", record["meta"])
	}
	tags, ok := record["tags"].([]string)
	if !ok || !reflect.DeepEqual(tags, []string{"company", "mission", "engineering"}) {
		t.Fatalf("expected flattened tags, got %#v", record["tags"])
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

func TestCMSBlockDefinitionRepositoryFiltersByCategoryAndStatus(t *testing.T) {
	content := NewInMemoryContentService()
	ctx := context.Background()
	_, _ = content.CreateBlockDefinition(ctx, CMSBlockDefinition{ID: "hero", Name: "Hero", Category: "layout", Status: "active"})
	_, _ = content.CreateBlockDefinition(ctx, CMSBlockDefinition{ID: "gallery", Name: "Gallery", Category: "media", Status: "draft"})
	_, _ = content.CreateBlockDefinition(ctx, CMSBlockDefinition{ID: "cta", Name: "CTA", Category: "layout", Status: "deprecated"})

	repo := NewCMSBlockDefinitionRepository(content, content)
	defs, total, err := repo.List(ctx, ListOptions{Filters: map[string]any{"category": "layout"}, PerPage: 10})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 2 || len(defs) != 2 {
		t.Fatalf("expected 2 defs for category filter, got total=%d len=%d", total, len(defs))
	}

	defs, total, err = repo.List(ctx, ListOptions{Filters: map[string]any{"status": "draft"}, PerPage: 10})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(defs) != 1 {
		t.Fatalf("expected 1 def for status filter, got total=%d len=%d", total, len(defs))
	}
	if toString(defs[0]["id"]) != "gallery" {
		t.Fatalf("expected draft def 'gallery', got %+v", defs[0])
	}

	defs, total, err = repo.List(ctx, ListOptions{Filters: map[string]any{"category": "layout", "status": "active"}, PerPage: 10})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(defs) != 1 {
		t.Fatalf("expected 1 def for combined filters, got total=%d len=%d", total, len(defs))
	}
	if toString(defs[0]["id"]) != "hero" {
		t.Fatalf("expected active layout def 'hero', got %+v", defs[0])
	}
}

func TestCMSBlockDefinitionRepositoryUpdateClearsOptionalFields(t *testing.T) {
	content := NewInMemoryContentService()
	repo := NewCMSBlockDefinitionRepository(content, content)
	ctx := context.Background()
	schema := map[string]any{"fields": []map[string]any{{"name": "title", "type": "string"}}}
	created, err := repo.Create(ctx, map[string]any{
		"name":        "Hero",
		"type":        "hero",
		"description": "Lead block",
		"icon":        "star",
		"category":    "layout",
		"schema":      schema,
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	id := toString(created["id"])
	updated, err := repo.Update(ctx, id, map[string]any{
		"description": "",
		"icon":        "",
		"category":    "",
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated["description"] != "" {
		t.Fatalf("expected description cleared, got %+v", updated["description"])
	}
	if updated["icon"] != "" {
		t.Fatalf("expected icon cleared, got %+v", updated["icon"])
	}
	if updated["category"] != "" {
		t.Fatalf("expected category cleared, got %+v", updated["category"])
	}
}

func TestCMSBlockDefinitionRepositoryUpdatePreservesOptionalFieldsWhenOmitted(t *testing.T) {
	content := NewInMemoryContentService()
	repo := NewCMSBlockDefinitionRepository(content, content)
	ctx := context.Background()
	created, err := repo.Create(ctx, map[string]any{
		"name":        "Hero",
		"type":        "hero",
		"description": "Lead block",
		"icon":        "star",
		"category":    "layout",
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	id := toString(created["id"])
	updated, err := repo.Update(ctx, id, map[string]any{
		"name": "Hero Updated",
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated["description"] != "Lead block" {
		t.Fatalf("expected description preserved, got %+v", updated["description"])
	}
	if updated["icon"] != "star" {
		t.Fatalf("expected icon preserved, got %+v", updated["icon"])
	}
	if updated["category"] != "layout" {
		t.Fatalf("expected category preserved, got %+v", updated["category"])
	}
}

func TestCMSContentTypeRepositoryUpdateClearsOptionalFields(t *testing.T) {
	content := NewInMemoryContentService()
	repo := NewCMSContentTypeRepository(content)
	ctx := context.Background()
	schema := map[string]any{"fields": []map[string]any{{"name": "title", "type": "string"}}}
	created, err := repo.Create(ctx, map[string]any{
		"name":        "Article",
		"slug":        "article",
		"description": "Long form",
		"icon":        "doc",
		"schema":      schema,
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	id := toString(created["id"])
	updated, err := repo.Update(ctx, id, map[string]any{
		"description": "",
		"icon":        "",
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated["description"] != "" {
		t.Fatalf("expected description cleared, got %+v", updated["description"])
	}
	if updated["icon"] != "" {
		t.Fatalf("expected icon cleared, got %+v", updated["icon"])
	}
}

func TestCMSContentTypeRepositoryUpdatePreservesOptionalFieldsWhenOmitted(t *testing.T) {
	content := NewInMemoryContentService()
	repo := NewCMSContentTypeRepository(content)
	ctx := context.Background()
	schema := map[string]any{"fields": []map[string]any{{"name": "title", "type": "string"}}}
	created, err := repo.Create(ctx, map[string]any{
		"name":        "Article",
		"slug":        "article",
		"description": "Long form",
		"icon":        "doc",
		"schema":      schema,
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	id := toString(created["id"])
	updated, err := repo.Update(ctx, id, map[string]any{
		"name": "Article Updated",
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated["description"] != "Long form" {
		t.Fatalf("expected description preserved, got %+v", updated["description"])
	}
	if updated["icon"] != "doc" {
		t.Fatalf("expected icon preserved, got %+v", updated["icon"])
	}
}

func TestCMSContentTypeRepositoryUpdateMergesCapabilitiesByDefault(t *testing.T) {
	content := NewInMemoryContentService()
	repo := NewCMSContentTypeRepository(content)
	ctx := context.Background()
	schema := map[string]any{"fields": []map[string]any{{"name": "title", "type": "string"}}}
	created, err := repo.Create(ctx, map[string]any{
		"name":   "Page",
		"slug":   "page",
		"schema": schema,
		"capabilities": map[string]any{
			"panel_slug":  "pages",
			"workflow":    "pages",
			"permissions": "admin.pages",
			"seo":         true,
		},
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	id := toString(created["id"])
	updated, err := repo.Update(ctx, id, map[string]any{
		"icon": "page",
		"capabilities": map[string]any{
			"seo":    false,
			"blocks": true,
		},
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}

	caps, ok := updated["capabilities"].(map[string]any)
	if !ok {
		t.Fatalf("expected capabilities map, got %#v", updated["capabilities"])
	}
	if caps["panel_slug"] != "pages" {
		t.Fatalf("expected panel_slug preserved, got %#v", caps["panel_slug"])
	}
	if caps["workflow"] != "pages" {
		t.Fatalf("expected workflow preserved, got %#v", caps["workflow"])
	}
	if caps["permissions"] != "admin.pages" {
		t.Fatalf("expected permissions preserved, got %#v", caps["permissions"])
	}
	if caps["seo"] != false {
		t.Fatalf("expected seo updated to false, got %#v", caps["seo"])
	}
	if caps["blocks"] != true {
		t.Fatalf("expected blocks added, got %#v", caps["blocks"])
	}
}

func TestCMSContentTypeRepositoryUpdateCanReplaceCapabilities(t *testing.T) {
	content := NewInMemoryContentService()
	repo := NewCMSContentTypeRepository(content)
	ctx := context.Background()
	schema := map[string]any{"fields": []map[string]any{{"name": "title", "type": "string"}}}
	created, err := repo.Create(ctx, map[string]any{
		"name":   "Page",
		"slug":   "page",
		"schema": schema,
		"capabilities": map[string]any{
			"panel_slug":  "pages",
			"workflow":    "pages",
			"permissions": "admin.pages",
			"seo":         true,
		},
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	id := toString(created["id"])
	updated, err := repo.Update(ctx, id, map[string]any{
		"capabilities": map[string]any{
			"seo": false,
		},
		"replace_capabilities": true,
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}

	caps, ok := updated["capabilities"].(map[string]any)
	if !ok {
		t.Fatalf("expected capabilities map, got %#v", updated["capabilities"])
	}
	if len(caps) != 1 {
		t.Fatalf("expected replaced capabilities with one key, got %#v", caps)
	}
	if caps["seo"] != false {
		t.Fatalf("expected seo=false after replace, got %#v", caps["seo"])
	}
}
