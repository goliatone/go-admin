package admin

import (
	"context"
	"slices"
	"strings"
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
					{Locale: &cmscontent.Locale{Code: "en"}, Title: "Home", Content: map[string]any{"markdown": map[string]any{"body": "hello"}}},
				},
			},
		},
		listWithDerived: []*cmscontent.Content{
			{
				ID:   contentID,
				Slug: "home",
				Type: &cmscontent.ContentType{Slug: "page"},
				Translations: []*cmscontent.ContentTranslation{
					{
						Locale: &cmscontent.Locale{Code: "en"},
						Title:  "Home",
						Content: map[string]any{
							"body":       "hello",
							"summary":    "Derived summary",
							"path":       "/home",
							"meta_title": "Derived title",
						},
					},
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
	if !hasDerivedProjectionListOption(contentSvc.listOptions) {
		t.Fatalf("expected derived-fields projection option, got %v", contentSvc.listOptions)
	}
	if items[0].Data["summary"] != "Derived summary" {
		t.Fatalf("expected projected summary field, got %v", items[0].Data["summary"])
	}
	if items[0].Data["path"] != "/home" {
		t.Fatalf("expected projected path field, got %v", items[0].Data["path"])
	}
}

func TestCMSContentTypeEntryRepositoryListOptInTranslations(t *testing.T) {
	ctx := context.Background()
	familyID := uuid.New()
	pageType := CMSContentType{
		Slug:         "page",
		Capabilities: map[string]any{"translations": true},
	}
	otherType := CMSContentType{Slug: "product"}
	contentSvc := &stubGoCMSContentService{
		listResp: []*cmscontent.Content{
			{
				ID:   uuid.New(),
				Slug: "breaking",
				Type: &cmscontent.ContentType{Slug: "product"},
			},
		},
		listWithTranslations: []*cmscontent.Content{
			{
				ID:   uuid.New(),
				Slug: "home",
				Type: &cmscontent.ContentType{Slug: "page"},
				Translations: []*cmscontent.ContentTranslation{
					{Locale: &cmscontent.Locale{Code: "en"}, FamilyID: &familyID, Title: "Home", Content: map[string]any{"body": "hello"}},
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
	if strings.TrimSpace(toString(pages[0]["family_id"])) != familyID.String() {
		t.Fatalf("expected canonical family_id %q, got %v", familyID.String(), pages[0]["family_id"])
	}
	if !hasTranslationListOption(contentSvc.listOptions) {
		t.Fatalf("expected translations option for pages list, got %v", contentSvc.listOptions)
	}
	if !hasDerivedProjectionListOption(contentSvc.listOptions) {
		t.Fatalf("expected derived-fields projection for pages list, got %v", contentSvc.listOptions)
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
	if hasDerivedProjectionListOption(contentSvc.listOptions) {
		t.Fatalf("expected no derived-fields projection for non-pages list, got %v", contentSvc.listOptions)
	}
}

func TestGoCMSContentAdapterContentUsesDerivedFieldsProjection(t *testing.T) {
	ctx := context.Background()
	contentID := uuid.New()
	typeSvc := newStubContentTypeService(CMSContentType{ID: uuid.New().String(), Slug: "page"})
	contentSvc := &stubGoCMSContentService{
		getWithDerived: &cmscontent.Content{
			ID:   contentID,
			Slug: "home",
			Type: &cmscontent.ContentType{Slug: "page"},
			Translations: []*cmscontent.ContentTranslation{
				{
					Locale: &cmscontent.Locale{Code: "en"},
					Title:  "Home",
					Content: map[string]any{
						"summary":          "Projected summary",
						"path":             "/home",
						"meta_title":       "Projected SEO title",
						"meta_description": "Projected SEO description",
					},
				},
			},
		},
	}
	svc := NewGoCMSContentAdapter(contentSvc, nil, typeSvc)
	adapter, ok := svc.(*GoCMSContentAdapter)
	if !ok || adapter == nil {
		t.Fatalf("expected GoCMSContentAdapter, got %T", svc)
	}

	item, err := adapter.Content(ctx, contentID.String(), "en")
	if err != nil {
		t.Fatalf("get content: %v", err)
	}
	if item == nil {
		t.Fatalf("expected content record")
	}
	if !hasDerivedProjectionGetOption(contentSvc.getOptions) {
		t.Fatalf("expected derived-fields projection on get, got %v", contentSvc.getOptions)
	}
	if item.Data["summary"] != "Projected summary" {
		t.Fatalf("expected projected summary, got %v", item.Data["summary"])
	}
	if item.Data["path"] != "/home" {
		t.Fatalf("expected projected path, got %v", item.Data["path"])
	}
}

func TestGoCMSContentAdapterContentsWithLocaleVariantsExpandsTranslationFamilies(t *testing.T) {
	ctx := context.Background()
	contentID := uuid.New()
	familyID := uuid.New()
	typeSvc := newStubContentTypeService(CMSContentType{ID: uuid.New().String(), Slug: "news"})
	contentSvc := &stubGoCMSContentService{
		listWithDerived: []*cmscontent.Content{
			{
				ID:   contentID,
				Slug: "breaking-news",
				Type: &cmscontent.ContentType{Slug: "news"},
				Translations: []*cmscontent.ContentTranslation{
					{
						Locale:   &cmscontent.Locale{Code: "en"},
						FamilyID: &familyID,
						Title:    "Breaking News",
						Content:  map[string]any{"body": "english", "path": "/en/breaking-news"},
					},
					{
						Locale:   &cmscontent.Locale{Code: "bo"},
						FamilyID: &familyID,
						Title:    "Breaking News BO",
						Content:  map[string]any{"body": "tibetan", "path": "/bo/breaking-news"},
					},
					{
						Locale:   &cmscontent.Locale{Code: "zh"},
						FamilyID: &familyID,
						Title:    "Breaking News ZH",
						Content:  map[string]any{"body": "chinese", "path": "/zh/breaking-news"},
					},
				},
			},
		},
	}
	svc := NewGoCMSContentAdapter(contentSvc, nil, typeSvc)
	adapter := svc.(*GoCMSContentAdapter)

	items, err := adapter.ContentsWithOptions(ctx, "all", WithTranslations(), WithLocaleVariants())
	if err != nil {
		t.Fatalf("list content with locale variants: %v", err)
	}
	if len(items) != 3 {
		t.Fatalf("expected 3 locale variants, got %d", len(items))
	}
	locales := []string{items[0].Locale, items[1].Locale, items[2].Locale}
	if !slices.Equal(locales, []string{"en", "bo", "zh"}) {
		t.Fatalf("expected locales [en bo zh], got %v", locales)
	}
	for _, item := range items {
		if item.FamilyID != familyID.String() {
			t.Fatalf("expected family id %q, got %q", familyID.String(), item.FamilyID)
		}
		if item.RequestedLocale != "all" {
			t.Fatalf("expected requested locale all, got %q", item.RequestedLocale)
		}
		if item.ResolvedLocale != item.Locale {
			t.Fatalf("expected resolved locale %q, got %q", item.Locale, item.ResolvedLocale)
		}
		if item.MissingRequestedLocale {
			t.Fatalf("expected wildcard locale not to mark missing_requested_locale for %+v", item)
		}
		if len(item.AvailableLocales) != 3 {
			t.Fatalf("expected available locales to include siblings, got %+v", item.AvailableLocales)
		}
	}
	if !hasTranslationListOption(contentSvc.listOptions) {
		t.Fatalf("expected translations option for locale-variant list, got %v", contentSvc.listOptions)
	}
	if !hasDerivedProjectionListOption(contentSvc.listOptions) {
		t.Fatalf("expected derived-fields projection for locale-variant list, got %v", contentSvc.listOptions)
	}
}

func TestAdminContentReadServiceAndRepositoryExpandTranslationFamiliesForWildcardAndFamilyFilters(t *testing.T) {
	ctx := context.Background()
	familyID := uuid.New()
	newsType := CMSContentType{
		Slug:         "news",
		Capabilities: map[string]any{"translations": true},
	}
	contentSvc := &stubGoCMSContentService{
		listWithDerived: []*cmscontent.Content{
			{
				ID:   uuid.New(),
				Slug: "breaking-news",
				Type: &cmscontent.ContentType{Slug: "news"},
				Translations: []*cmscontent.ContentTranslation{
					{
						Locale:   &cmscontent.Locale{Code: "en"},
						FamilyID: &familyID,
						Title:    "Breaking News",
						Content:  map[string]any{"body": "english", "path": "/en/breaking-news"},
					},
					{
						Locale:   &cmscontent.Locale{Code: "bo"},
						FamilyID: &familyID,
						Title:    "Breaking News BO",
						Content:  map[string]any{"body": "tibetan", "path": "/bo/breaking-news"},
					},
					{
						Locale:   &cmscontent.Locale{Code: "zh"},
						FamilyID: &familyID,
						Title:    "Breaking News ZH",
						Content:  map[string]any{"body": "chinese", "path": "/zh/breaking-news"},
					},
				},
			},
		},
	}
	adapter := NewGoCMSContentAdapter(contentSvc, nil, newStubContentTypeService(newsType))
	service := newAdminContentReadService(adapter)

	items, total, err := service.ListForContentType(ctx, newsType, ListOptions{Filters: map[string]any{"locale": "all"}})
	if err != nil {
		t.Fatalf("list for content type with locale all: %v", err)
	}
	if total != 3 || len(items) != 3 {
		t.Fatalf("expected 3 sibling records from read service, got total=%d len=%d", total, len(items))
	}

	repo := NewCMSContentTypeEntryRepository(adapter, newsType)
	familyRows, familyTotal, err := repo.List(ctx, ListOptions{Filters: map[string]any{"family_id": familyID.String()}})
	if err != nil {
		t.Fatalf("list repository family filter: %v", err)
	}
	if familyTotal != 3 || len(familyRows) != 3 {
		t.Fatalf("expected 3 sibling rows from family filter, got total=%d len=%d", familyTotal, len(familyRows))
	}
	for _, row := range familyRows {
		if strings.TrimSpace(toString(row["family_id"])) != familyID.String() {
			t.Fatalf("expected family_id %q, got %#v", familyID.String(), row["family_id"])
		}
	}

	enRows, enTotal, err := repo.List(ctx, ListOptions{Filters: map[string]any{"locale": "en"}})
	if err != nil {
		t.Fatalf("list repository locale filter: %v", err)
	}
	if enTotal != 1 || len(enRows) != 1 {
		t.Fatalf("expected one explicit locale row, got total=%d len=%d", enTotal, len(enRows))
	}
	if strings.TrimSpace(toString(enRows[0]["locale"])) != "en" {
		t.Fatalf("expected english row, got %#v", enRows[0])
	}
}
