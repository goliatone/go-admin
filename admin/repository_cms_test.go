package admin

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"

	goerrors "github.com/goliatone/go-errors"
)

type translationCreatorContentServiceStub struct {
	CMSContentService
	lastInput TranslationCreateInput
	result    *CMSContent
	err       error
}

type contentTypeListServiceStub struct {
	CMSContentTypeService
	items []CMSContentType
	err   error
}

func (s *contentTypeListServiceStub) ContentTypes(_ context.Context) ([]CMSContentType, error) {
	if s.err != nil {
		return nil, s.err
	}
	out := make([]CMSContentType, 0, len(s.items))
	for _, item := range s.items {
		out = append(out, item)
	}
	return out, nil
}

type blockDefinitionListServiceStub struct {
	CMSContentService
	defs []CMSBlockDefinition
	err  error
}

func (s *blockDefinitionListServiceStub) BlockDefinitions(_ context.Context) ([]CMSBlockDefinition, error) {
	if s.err != nil {
		return nil, s.err
	}
	out := make([]CMSBlockDefinition, 0, len(s.defs))
	for _, def := range s.defs {
		out = append(out, def)
	}
	return out, nil
}

func (s *translationCreatorContentServiceStub) CreateTranslation(_ context.Context, input TranslationCreateInput) (*CMSContent, error) {
	s.lastInput = input
	if s.err != nil {
		return nil, s.err
	}
	if s.result != nil {
		created := cloneCMSContent(*s.result)
		return &created, nil
	}
	return nil, ErrNotFound
}

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

func TestCMSPageRepositoryListSortsBeforePagination(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	repo := NewCMSPageRepository(content)

	_, _ = content.CreatePage(ctx, CMSPage{Title: "Gamma", Slug: "/gamma", Locale: "en"})
	_, _ = content.CreatePage(ctx, CMSPage{Title: "Alpha", Slug: "/alpha", Locale: "en"})
	_, _ = content.CreatePage(ctx, CMSPage{Title: "Beta", Slug: "/beta", Locale: "en"})

	pageOne, total, err := repo.List(ctx, ListOptions{
		Page:    1,
		PerPage: 1,
		SortBy:  "title",
		Filters: map[string]any{"locale": "en"},
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
		Filters: map[string]any{"locale": "en"},
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
		Filters:  map[string]any{"locale": "en"},
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

func TestCMSPageRepositoryListWithoutSortRemainsStableAcrossPages(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	repo := NewCMSPageRepository(content)

	_, _ = content.CreatePage(ctx, CMSPage{Title: "Alpha", Slug: "/alpha", Locale: "en"})
	_, _ = content.CreatePage(ctx, CMSPage{Title: "Bravo", Slug: "/bravo", Locale: "en"})
	_, _ = content.CreatePage(ctx, CMSPage{Title: "Charlie", Slug: "/charlie", Locale: "en"})
	_, _ = content.CreatePage(ctx, CMSPage{Title: "Delta", Slug: "/delta", Locale: "en"})

	for i := 0; i < 25; i++ {
		pageOne, totalOne, err := repo.List(ctx, ListOptions{
			Page:    1,
			PerPage: 2,
			Filters: map[string]any{"locale": "en"},
		})
		if err != nil {
			t.Fatalf("iteration %d page one failed: %v", i, err)
		}
		if totalOne != 4 {
			t.Fatalf("iteration %d expected total 4 on page one, got %d", i, totalOne)
		}

		pageTwo, totalTwo, err := repo.List(ctx, ListOptions{
			Page:    2,
			PerPage: 2,
			Filters: map[string]any{"locale": "en"},
		})
		if err != nil {
			t.Fatalf("iteration %d page two failed: %v", i, err)
		}
		if totalTwo != 4 {
			t.Fatalf("iteration %d expected total 4 on page two, got %d", i, totalTwo)
		}

		pageOneIDs := map[string]struct{}{}
		for idx, record := range pageOne {
			id := toString(record["id"])
			if id == "" {
				t.Fatalf("iteration %d page one record %d missing id", i, idx)
			}
			pageOneIDs[id] = struct{}{}
		}
		for idx, record := range pageTwo {
			id := toString(record["id"])
			if id == "" {
				t.Fatalf("iteration %d page two record %d missing id", i, idx)
			}
			if _, exists := pageOneIDs[id]; exists {
				t.Fatalf("iteration %d pagination overlap detected for id %q", i, id)
			}
		}
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

func TestCMSContentRepositoryCreateTranslationDelegatesToContentCommand(t *testing.T) {
	service := &translationCreatorContentServiceStub{
		CMSContentService: NewInMemoryContentService(),
		result: &CMSContent{
			ID:                 "post_456",
			Locale:             "fr",
			Status:             "draft",
			TranslationGroupID: "tg_123",
			ContentTypeSlug:    "posts",
		},
	}
	repo := NewCMSContentRepository(service)

	record, err := repo.CreateTranslation(context.Background(), TranslationCreateInput{
		SourceID: "post_123",
		Locale:   "fr",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if record["id"] != "post_456" {
		t.Fatalf("expected id post_456, got %v", record["id"])
	}
	if record["locale"] != "fr" {
		t.Fatalf("expected locale fr, got %v", record["locale"])
	}
	if service.lastInput.SourceID != "post_123" {
		t.Fatalf("expected source id post_123, got %q", service.lastInput.SourceID)
	}
	if service.lastInput.Locale != "fr" {
		t.Fatalf("expected locale fr, got %q", service.lastInput.Locale)
	}
}

func TestCMSContentTypeEntryRepositoryCreateTranslationDelegatesToContentCommand(t *testing.T) {
	service := &translationCreatorContentServiceStub{
		CMSContentService: NewInMemoryContentService(),
		result: &CMSContent{
			ID:                 "post_456",
			Locale:             "fr",
			Status:             "draft",
			TranslationGroupID: "tg_123",
			ContentTypeSlug:    "posts",
		},
	}
	repo := NewCMSContentTypeEntryRepository(service, CMSContentType{Slug: "posts"})

	record, err := repo.CreateTranslation(context.Background(), TranslationCreateInput{
		SourceID: "post_123",
		Locale:   "fr",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if record["id"] != "post_456" {
		t.Fatalf("expected id post_456, got %v", record["id"])
	}
	if service.lastInput.ContentType != "posts" {
		t.Fatalf("expected content type posts, got %q", service.lastInput.ContentType)
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

func TestCMSContentTypeEntryRepositoryListUsesProjectedTopLevelFields(t *testing.T) {
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
			"content":        "We build composable admin products.",
			"summary":        "How the team builds reliable admin tooling for Go services.",
			"path":           "/about",
			"published_at":   "2025-10-13T10:00:00Z",
			"featured_image": "/static/media/logo.png",
			"meta": map[string]any{
				"audience":             "customers",
				"reading_time_minutes": 4,
			},
			"tags":             []string{"company", "mission", "engineering"},
			"meta_title":       "About Enterprise Admin",
			"meta_description": "Meet the team building modular admin tooling for Go applications.",
			"markdown": map[string]any{
				"body": "We build composable admin products.",
				"frontmatter": map[string]any{
					"summary": "Legacy markdown summary that should not be flattened in repository",
					"tags":    []string{"legacy"},
				},
				"custom": map[string]any{
					"path": "/legacy-about",
					"seo": map[string]any{
						"title":       "Legacy SEO title",
						"description": "Legacy SEO description",
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
		t.Fatalf("expected projected summary, got %q", got)
	}
	if got := toString(record["path"]); got != "/about" {
		t.Fatalf("expected projected path, got %q", got)
	}
	if got := toString(record["published_at"]); got != "2025-10-13T10:00:00Z" {
		t.Fatalf("expected projected published_at, got %q", got)
	}
	if got := toString(record["featured_image"]); got != "/static/media/logo.png" {
		t.Fatalf("expected projected featured_image, got %q", got)
	}
	if got := toString(record["meta_title"]); got != "About Enterprise Admin" {
		t.Fatalf("expected projected meta_title, got %q", got)
	}
	if got := toString(record["meta_description"]); got != "Meet the team building modular admin tooling for Go applications." {
		t.Fatalf("expected projected meta_description, got %q", got)
	}
	if got := toString(record["content"]); got != "We build composable admin products." {
		t.Fatalf("expected projected content body, got %q", got)
	}
	meta, ok := record["meta"].(map[string]any)
	if !ok || toString(meta["audience"]) != "customers" {
		t.Fatalf("expected projected meta map, got %#v", record["meta"])
	}
	tags, ok := record["tags"].([]string)
	if !ok || !reflect.DeepEqual(tags, []string{"company", "mission", "engineering"}) {
		t.Fatalf("expected projected tags, got %#v", record["tags"])
	}
}

func TestCMSContentRepositoryListEmitsCanonicalTranslationGroupIDWhenTranslationMetadataPresent(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	repo := NewCMSContentRepository(content)

	_, _ = content.CreateContent(ctx, CMSContent{
		Title:           "Page One",
		Slug:            "page-one",
		Locale:          "en",
		Status:          "draft",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"translation_context": map[string]any{
				"translation_group_id": "tg-page-1",
			},
		},
	})
	_, _ = content.CreateContent(ctx, CMSContent{
		Title:           "Post One",
		Slug:            "post-one",
		Locale:          "en",
		Status:          "draft",
		ContentTypeSlug: "post",
		Data: map[string]any{
			"translation_context": map[string]any{
				"translation_group_id": "tg-post-1",
			},
		},
	})
	_, _ = content.CreateContent(ctx, CMSContent{
		Title:           "News One",
		Slug:            "news-one",
		Locale:          "en",
		Status:          "draft",
		ContentTypeSlug: "news",
		Data: map[string]any{
			"translation_context": map[string]any{
				"translation_group_id": "tg-news-1",
			},
		},
	})

	list, total, err := repo.List(ctx, ListOptions{PerPage: 20})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 3 || len(list) != 3 {
		t.Fatalf("expected 3 editorial records, got total=%d len=%d", total, len(list))
	}
	for _, record := range list {
		groupID := strings.TrimSpace(toString(record["translation_group_id"]))
		if groupID == "" {
			t.Fatalf("expected translation_group_id on list record, got %#v", record)
		}
	}
}

func TestCMSContentTypeEntryRepositoryListEmitsCanonicalTranslationGroupIDForTranslationCapabilityTypes(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	created, _ := content.CreateContent(ctx, CMSContent{
		Title:           "Announcement",
		Slug:            "announcement",
		Locale:          "en",
		Status:          "draft",
		ContentTypeSlug: "announcements",
	})
	repo := NewCMSContentTypeEntryRepository(content, CMSContentType{
		Slug: "announcements",
		Capabilities: map[string]any{
			"translations": true,
		},
	})

	list, total, err := repo.List(ctx, ListOptions{PerPage: 10})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(list) != 1 {
		t.Fatalf("expected one translation-enabled record, got total=%d len=%d", total, len(list))
	}
	groupID := strings.TrimSpace(toString(list[0]["translation_group_id"]))
	if groupID == "" {
		t.Fatalf("expected translation_group_id in list payload, got %#v", list[0])
	}
	if created != nil && strings.TrimSpace(created.ID) != "" && groupID != strings.TrimSpace(created.ID) {
		t.Fatalf("expected translation_group_id fallback to record id %q, got %q", created.ID, groupID)
	}
}

func TestCMSContentRepositoryListRejectsMarkdownOnlyPagePayloadsWithoutCanonicalTopLevelFields(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	repo := NewCMSContentRepository(content)

	_, _ = content.CreateContent(ctx, CMSContent{
		Title:           "Legacy Page",
		Slug:            "legacy-page",
		Locale:          "en",
		Status:          "published",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"markdown": map[string]any{
				"body": "Legacy body only in nested markdown payload.",
				"frontmatter": map[string]any{
					"summary":          "Legacy summary in frontmatter",
					"path":             "/legacy-page",
					"meta_title":       "Legacy Meta Title",
					"meta_description": "Legacy Meta Description",
				},
			},
		},
	})

	_, _, err := repo.List(ctx, ListOptions{PerPage: 20})
	if err == nil {
		t.Fatalf("expected canonical top-level validation error")
	}

	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) {
		t.Fatalf("expected typed domain error, got %T", err)
	}
	if typedErr.TextCode != TextCodeValidationError {
		t.Fatalf("expected validation code, got %q", typedErr.TextCode)
	}
	missing, ok := typedErr.Metadata["missing"].([]string)
	if !ok {
		t.Fatalf("expected missing fields metadata, got %#v", typedErr.Metadata["missing"])
	}
	for _, field := range []string{"content", "summary/excerpt", "path", "meta_title", "meta_description"} {
		found := false
		for _, candidate := range missing {
			if candidate == field {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("expected missing field %q, got %#v", field, missing)
		}
	}
}

func TestCMSContentRepositoryListAllowsMarkdownOnlyPayloadsForNonPageTypes(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	repo := NewCMSContentRepository(content)

	_, _ = content.CreateContent(ctx, CMSContent{
		Title:           "Legacy Article",
		Slug:            "legacy-article",
		Locale:          "en",
		Status:          "published",
		ContentTypeSlug: "article",
		Data: map[string]any{
			"markdown": map[string]any{
				"body": "Article markdown body",
				"frontmatter": map[string]any{
					"summary": "Article summary",
				},
			},
		},
	})

	list, total, err := repo.List(ctx, ListOptions{PerPage: 20})
	if err != nil {
		t.Fatalf("expected non-page markdown payload to be accepted, got %v", err)
	}
	if total != 1 || len(list) != 1 {
		t.Fatalf("expected one record, got total=%d len=%d", total, len(list))
	}
}

func TestCMSContentTypeRepositoryListIncludesEnvironmentScopedRecordsWithoutFilter(t *testing.T) {
	repo := NewCMSContentTypeRepository(&contentTypeListServiceStub{
		items: []CMSContentType{
			{ID: "page-default", Name: "Page", Slug: "page", Environment: "default"},
			{ID: "post-staging", Name: "Post", Slug: "post", Environment: "staging"},
		},
	})

	items, total, err := repo.List(context.Background(), ListOptions{PerPage: 20})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 2 || len(items) != 2 {
		t.Fatalf("expected 2 items without explicit environment filter, got total=%d len=%d", total, len(items))
	}
}

func TestCMSBlockDefinitionRepositoryListIncludesEnvironmentScopedRecordsWithoutFilter(t *testing.T) {
	content := &blockDefinitionListServiceStub{
		defs: []CMSBlockDefinition{
			{ID: "hero-default", Name: "Hero", Slug: "hero", Environment: "default"},
			{ID: "cta-staging", Name: "CTA", Slug: "cta", Environment: "staging"},
		},
	}
	repo := NewCMSBlockDefinitionRepository(content, nil)

	items, total, err := repo.List(context.Background(), ListOptions{PerPage: 20})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 2 || len(items) != 2 {
		t.Fatalf("expected 2 items without explicit environment filter, got total=%d len=%d", total, len(items))
	}
}

func TestCMSBlockDefinitionRepositoryGetResolvesEnvironmentScopedRecordWithoutContextEnvironment(t *testing.T) {
	content := &blockDefinitionListServiceStub{
		defs: []CMSBlockDefinition{
			{ID: "hero-default", Name: "Hero", Slug: "hero", Environment: "default"},
		},
	}
	repo := NewCMSBlockDefinitionRepository(content, nil)

	record, err := repo.Get(context.Background(), "hero-default")
	if err != nil {
		t.Fatalf("get failed: %v", err)
	}
	if toString(record["id"]) != "hero-default" {
		t.Fatalf("expected hero-default, got %+v", record)
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
