package admin

import (
	"context"
	"errors"
	"strings"
	"testing"

	goerrors "github.com/goliatone/go-errors"
)

type recordingAdminContentReadService struct {
	listFn               func(context.Context, ListOptions) ([]map[string]any, int, error)
	getFn                func(context.Context, string) (map[string]any, error)
	listForContentTypeFn func(context.Context, CMSContentType, ListOptions) ([]map[string]any, int, error)
	getForContentTypeFn  func(context.Context, CMSContentType, string) (map[string]any, error)
}

func (s recordingAdminContentReadService) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if s.listFn == nil {
		return nil, 0, ErrNotFound
	}
	return s.listFn(ctx, opts)
}

func (s recordingAdminContentReadService) Get(ctx context.Context, id string) (map[string]any, error) {
	if s.getFn == nil {
		return nil, ErrNotFound
	}
	return s.getFn(ctx, id)
}

func (s recordingAdminContentReadService) ListForContentType(ctx context.Context, contentType CMSContentType, opts ListOptions) ([]map[string]any, int, error) {
	if s.listForContentTypeFn == nil {
		return nil, 0, ErrNotFound
	}
	return s.listForContentTypeFn(ctx, contentType, opts)
}

func (s recordingAdminContentReadService) GetForContentType(ctx context.Context, contentType CMSContentType, id string) (map[string]any, error) {
	if s.getForContentTypeFn == nil {
		return nil, ErrNotFound
	}
	return s.getForContentTypeFn(ctx, contentType, id)
}

func TestAdminContentReadServiceListAndGetReturnNotFoundWithoutContentService(t *testing.T) {
	service := newAdminContentReadService(nil)

	if _, _, err := service.List(context.Background(), ListOptions{}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from List without content service, got %v", err)
	}
	if _, err := service.Get(context.Background(), "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from Get without content service, got %v", err)
	}
	if _, _, err := service.ListForContentType(context.Background(), CMSContentType{Slug: "page"}, ListOptions{}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from ListForContentType without content service, got %v", err)
	}
	if _, err := service.GetForContentType(context.Background(), CMSContentType{Slug: "page"}, "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from GetForContentType without content service, got %v", err)
	}
}

func TestAdminContentReadServiceListAndGetPreserveRepositoryReadContract(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	_, _ = content.CreateContentType(ctx, CMSContentType{
		ID:   "page-type",
		Name: "Page",
		Slug: "page",
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "page",
			},
			"navigation": map[string]any{
				"entry": map[string]any{
					"editable": true,
				},
			},
		},
	})
	created, err := content.CreateContent(ctx, CMSContent{
		Title:           "Home",
		Slug:            "home",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"path": "/home",
			"_navigation": map[string]any{
				"site.main": "show",
			},
			"effective_menu_locations": []string{"site.main"},
		},
	})
	if err != nil {
		t.Fatalf("create content failed: %v", err)
	}

	service := newAdminContentReadService(content)

	items, total, err := service.List(ctx, ListOptions{PerPage: 20})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(items) != 1 {
		t.Fatalf("expected one item, got total=%d len=%d", total, len(items))
	}
	if got := toString(items[0]["slug"]); got != "home" {
		t.Fatalf("expected slug home, got %q", got)
	}
	if got := toString(items[0]["content_type"]); got != "page" {
		t.Fatalf("expected content_type page, got %q", got)
	}
	if got := extractMap(items[0]["effective_navigation_visibility"])["site.main"]; !toBool(got) {
		t.Fatalf("expected effective navigation visibility to be projected, got %#v", items[0]["effective_navigation_visibility"])
	}

	record, err := service.Get(ctx, created.ID)
	if err != nil {
		t.Fatalf("get failed: %v", err)
	}
	if got := toString(record["id"]); got != created.ID {
		t.Fatalf("expected id %q, got %q", created.ID, got)
	}
	if got := toString(record["family_id"]); got != "" {
		t.Fatalf("expected blank family_id for non-translation content, got %q", got)
	}
}

type contextRecordingContentService struct {
	CMSContentService
	captured context.Context
}

func (s *contextRecordingContentService) Contents(ctx context.Context, _ string) ([]CMSContent, error) {
	s.captured = ctx
	return []CMSContent{{
		ID:              "ctx-record",
		Title:           "Context Record",
		Slug:            "context-record",
		Locale:          "en",
		Status:          "draft",
		ContentType:     "news",
		ContentTypeSlug: "news",
	}}, nil
}

func TestAdminContentReadServiceListForContentTypePropagatesRequestContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	content := &contextRecordingContentService{}
	service := newAdminContentReadService(content)

	if _, _, err := service.ListForContentType(ctx, CMSContentType{Slug: "news"}, ListOptions{}); err != nil {
		t.Fatalf("list for content type: %v", err)
	}
	if content.captured == nil {
		t.Fatalf("expected content service to receive request context")
	}
	if err := content.captured.Err(); !errors.Is(err, context.Canceled) {
		t.Fatalf("expected canceled request context, got %v", err)
	}
}

func TestAdminContentReadServiceListForContentTypeSummarizesEmbeddedBlocksForListRows(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	created, err := content.CreateContent(ctx, CMSContent{
		Title:           "Block Heavy",
		Slug:            "block-heavy",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"blocks": []map[string]any{
				{
					"_type": "hero",
					"id":    "hero-1",
					"image": map[string]any{
						"id":   "media-1",
						"path": "/large/image.jpg",
					},
					"body": strings.Repeat("heavy", 100),
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("create content: %v", err)
	}
	service := newAdminContentReadService(content)

	rows, total, err := service.ListForContentType(ctx, CMSContentType{Slug: "page"}, ListOptions{})
	if err != nil {
		t.Fatalf("list for content type: %v", err)
	}
	if total != 1 || len(rows) != 1 {
		t.Fatalf("expected one row, got total=%d len=%d", total, len(rows))
	}
	blocks, ok := rows[0]["blocks"].([]map[string]any)
	if !ok || len(blocks) != 1 {
		t.Fatalf("expected summarized top-level blocks, got %#v", rows[0]["blocks"])
	}
	if got := toString(blocks[0]["_type"]); got != "hero" {
		t.Fatalf("expected summarized block type hero, got %q", got)
	}
	if _, hasImage := blocks[0]["image"]; hasImage {
		t.Fatalf("expected list block summary to omit image payload, got %#v", blocks[0])
	}
	data := extractMap(rows[0]["data"])
	dataBlocks, ok := data["blocks"].([]map[string]any)
	if !ok || len(dataBlocks) != 1 {
		t.Fatalf("expected summarized data blocks, got %#v", data["blocks"])
	}
	if _, hasBody := dataBlocks[0]["body"]; hasBody {
		t.Fatalf("expected list data block summary to omit body payload, got %#v", dataBlocks[0])
	}

	detail, err := service.GetForContentType(ctx, CMSContentType{Slug: "page"}, created.ID)
	if err != nil {
		t.Fatalf("get for content type: %v", err)
	}
	detailData := extractMap(detail["data"])
	detailBlocks, ok := detailData["blocks"].([]map[string]any)
	if !ok || len(detailBlocks) != 1 {
		t.Fatalf("expected detail data to keep full embedded blocks, got %#v", detailData["blocks"])
	}
	if _, ok := detailBlocks[0]["image"]; !ok {
		t.Fatalf("expected detail block to keep image payload, got %#v", detailBlocks[0])
	}
}

func TestAdminContentReadServiceGetReturnsTranslationMissingWhenFallbackDisabled(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	created, err := content.CreateContent(ctx, CMSContent{
		Title:            "Home",
		Slug:             "home",
		Locale:           "en",
		Status:           "published",
		ContentType:      "page",
		ContentTypeSlug:  "page",
		AvailableLocales: []string{"en"},
	})
	if err != nil {
		t.Fatalf("create content failed: %v", err)
	}

	service := newAdminContentReadService(content)
	readCtx := WithLocaleFallback(WithLocale(ctx, "es"), false)

	_, err = service.Get(readCtx, created.ID)
	if err == nil {
		t.Fatalf("expected translation missing error")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) {
		t.Fatalf("expected typed translation error, got %T", err)
	}
	if typedErr.TextCode != TextCodeTranslationMissing {
		t.Fatalf("expected text code %s, got %q", TextCodeTranslationMissing, typedErr.TextCode)
	}
	if val, ok := typedErr.Metadata["translation_missing"].(bool); !ok || !val {
		t.Fatalf("expected translation_missing metadata, got %+v", typedErr.Metadata)
	}
}

func TestCMSContentRepositoryDelegatesReadPathToAdminContentReadService(t *testing.T) {
	ctx := context.Background()
	expectedList := []map[string]any{{"id": "content-1"}}
	expectedGet := map[string]any{"id": "content-1"}
	repo := &CMSContentRepository{
		read: recordingAdminContentReadService{
			listFn: func(callCtx context.Context, opts ListOptions) ([]map[string]any, int, error) {
				if callCtx != ctx {
					t.Fatalf("expected context passed through")
				}
				if got := toString(opts.Filters["locale"]); got != "en" {
					t.Fatalf("expected locale filter passthrough, got %#v", opts.Filters)
				}
				return expectedList, 1, nil
			},
			getFn: func(callCtx context.Context, id string) (map[string]any, error) {
				if callCtx != ctx {
					t.Fatalf("expected context passed through")
				}
				if id != "content-1" {
					t.Fatalf("expected content-1 id, got %q", id)
				}
				return expectedGet, nil
			},
		},
	}

	list, total, err := repo.List(ctx, ListOptions{Filters: map[string]any{"locale": "en"}})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(list) != 1 || list[0]["id"] != "content-1" {
		t.Fatalf("expected delegated list result, got total=%d list=%#v", total, list)
	}

	record, err := repo.Get(ctx, "content-1")
	if err != nil {
		t.Fatalf("get failed: %v", err)
	}
	if record["id"] != "content-1" {
		t.Fatalf("expected delegated get result, got %#v", record)
	}
}

func TestCMSContentTypeEntryRepositoryDelegatesReadPathToAdminContentReadService(t *testing.T) {
	ctx := context.Background()
	repo := &CMSContentTypeEntryRepository{
		contentType: CMSContentType{Slug: "page"},
		read: recordingAdminContentReadService{
			listForContentTypeFn: func(callCtx context.Context, contentType CMSContentType, opts ListOptions) ([]map[string]any, int, error) {
				if callCtx != ctx {
					t.Fatalf("expected context passed through")
				}
				if contentType.Slug != "page" {
					t.Fatalf("expected page content type, got %#v", contentType)
				}
				if opts.PerPage != 5 {
					t.Fatalf("expected per_page passthrough, got %#v", opts)
				}
				return []map[string]any{{"id": "page-1"}}, 1, nil
			},
			getForContentTypeFn: func(callCtx context.Context, contentType CMSContentType, id string) (map[string]any, error) {
				if callCtx != ctx {
					t.Fatalf("expected context passed through")
				}
				if contentType.Slug != "page" || id != "page-1" {
					t.Fatalf("expected page/page-1 passthrough, got %#v id=%q", contentType, id)
				}
				return map[string]any{"id": "page-1"}, nil
			},
		},
	}

	list, total, err := repo.List(ctx, ListOptions{PerPage: 5})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(list) != 1 || list[0]["id"] != "page-1" {
		t.Fatalf("expected delegated list result, got total=%d list=%#v", total, list)
	}

	record, err := repo.Get(ctx, "page-1")
	if err != nil {
		t.Fatalf("get failed: %v", err)
	}
	if record["id"] != "page-1" {
		t.Fatalf("expected delegated get result, got %#v", record)
	}
}
