package admin

import (
	"context"
	"testing"

	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

func TestGoCMSContentAdapterContentsWithOptionsLoadsTranslations(t *testing.T) {
	ctx := context.Background()
	typeSvc := newStubContentTypeService(CMSContentType{ID: uuid.New().String(), Slug: "page"})
	contentID := uuid.New()
	contentSvc := &stubGoCMSContentService{
		listResp: []*cmscontent.Content{
			{
				ID:   contentID,
				Slug: "home",
				Type: &cmscontent.ContentType{Slug: "page"},
			},
		},
		listWithTranslations: []*cmscontent.Content{
			{
				ID:   contentID,
				Slug: "home",
				Type: &cmscontent.ContentType{Slug: "page"},
				Translations: []*cmscontent.ContentTranslation{
					{Locale: &cmscontent.Locale{Code: "en"}, Title: "Home", Content: map[string]any{"body": "hello"}},
				},
			},
		},
	}
	svc := NewGoCMSContentAdapter(contentSvc, nil, typeSvc)
	adapter, ok := svc.(*GoCMSContentAdapter)
	if !ok || adapter == nil {
		t.Fatalf("expected GoCMSContentAdapter, got %T", svc)
	}

	items, err := adapter.Contents(ctx, "en")
	if err != nil {
		t.Fatalf("list content: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].Title != "" {
		t.Fatalf("expected empty title without translations, got %q", items[0].Title)
	}

	items, err = adapter.ContentsWithOptions(ctx, "en", WithTranslations())
	if err != nil {
		t.Fatalf("list content with options: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].Title != "Home" {
		t.Fatalf("expected translated title, got %q", items[0].Title)
	}
	if items[0].Data["body"] != "hello" {
		t.Fatalf("expected translation content merged, got %v", items[0].Data["body"])
	}
}

func TestCMSContentTypeEntryRepositoryListOptInTranslations(t *testing.T) {
	ctx := context.Background()
	pageType := CMSContentType{
		Slug:         "page",
		Capabilities: map[string]any{"panel_slug": "pages"},
	}
	otherType := CMSContentType{Slug: "news"}
	contentSvc := &stubGoCMSContentService{
		listResp: []*cmscontent.Content{
			{
				ID:   uuid.New(),
				Slug: "breaking",
				Type: &cmscontent.ContentType{Slug: "news"},
			},
		},
		listWithTranslations: []*cmscontent.Content{
			{
				ID:   uuid.New(),
				Slug: "home",
				Type: &cmscontent.ContentType{Slug: "page"},
				Translations: []*cmscontent.ContentTranslation{
					{Locale: &cmscontent.Locale{Code: "en"}, Title: "Home", Content: map[string]any{"body": "hello"}},
				},
			},
		},
	}
	adapter := NewGoCMSContentAdapter(contentSvc, nil, newStubContentTypeService(pageType, otherType))

	pagesRepo := NewCMSContentTypeEntryRepository(adapter, pageType)
	pages, _, err := pagesRepo.List(ctx, ListOptions{Filters: map[string]any{"locale": "en"}})
	if err != nil {
		t.Fatalf("list pages: %v", err)
	}
	if len(pages) != 1 {
		t.Fatalf("expected 1 page result, got %d", len(pages))
	}
	if pages[0]["title"] != "Home" {
		t.Fatalf("expected translated title, got %v", pages[0]["title"])
	}
	if !hasTranslationListOption(contentSvc.listOptions) {
		t.Fatalf("expected translations option for pages list, got %v", contentSvc.listOptions)
	}

	otherRepo := NewCMSContentTypeEntryRepository(adapter, otherType)
	other, _, err := otherRepo.List(ctx, ListOptions{Filters: map[string]any{"locale": "en"}})
	if err != nil {
		t.Fatalf("list other: %v", err)
	}
	if len(other) != 1 {
		t.Fatalf("expected 1 other result, got %d", len(other))
	}
	if other[0]["title"] != "" {
		t.Fatalf("expected empty title without translations, got %v", other[0]["title"])
	}
	if hasTranslationListOption(contentSvc.listOptions) {
		t.Fatalf("expected no translations option for non-pages list, got %v", contentSvc.listOptions)
	}
}
