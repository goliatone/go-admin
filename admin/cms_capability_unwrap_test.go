package admin

import (
	"context"
	"testing"

	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

type wrappedLocaleCatalogStub struct {
	CMSContainer
	delegate CMSContainer
}

func (w wrappedLocaleCatalogStub) UnwrapCMSContainer() CMSContainer {
	return w.delegate
}

type activeLocalesContentContainerStub struct {
	*NoopCMSContainer
	locales []string
}

func (s activeLocalesContentContainerStub) ActiveLocales(context.Context) ([]string, error) {
	return append([]string(nil), s.locales...), nil
}

type wrappedCMSContentServiceStub struct {
	CMSContentService
	delegate CMSContentService
}

func (w wrappedCMSContentServiceStub) UnwrapCMSContentService() CMSContentService {
	return w.delegate
}

func TestAdminActiveLocalesUnwrapsCMSContainerCatalog(t *testing.T) {
	base := activeLocalesContentContainerStub{
		NoopCMSContainer: NewNoopCMSContainer(),
		locales:          []string{"en", "bo", "zh"},
	}
	adm := &Admin{cms: wrappedLocaleCatalogStub{CMSContainer: NewNoopCMSContainer(), delegate: base}}

	locales := adm.activeLocales(context.Background())
	if got := len(locales); got != 3 {
		t.Fatalf("expected 3 active locales, got %d (%v)", got, locales)
	}
	if locales[0] != "en" || locales[1] != "bo" || locales[2] != "zh" {
		t.Fatalf("unexpected locales %v", locales)
	}
}

func TestAdminContentWriteServiceCreateTranslationUsesUnwrappedCreator(t *testing.T) {
	content := NewInMemoryContentService()
	source, err := content.CreateContent(context.Background(), CMSContent{
		Title:           "Home",
		Slug:            "home",
		Locale:          "en",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"path": "/home",
		},
	})
	if err != nil {
		t.Fatalf("create source content: %v", err)
	}
	translationStub := &translationCreatorContentServiceStub{
		CMSContentService: content,
		result: &CMSContent{
			ID:              source.ID,
			Locale:          "fr",
			ResolvedLocale:  "fr",
			ContentType:     "page",
			ContentTypeSlug: "page",
			Data: map[string]any{
				"path": "/fr/home",
			},
		},
	}
	wrapped := wrappedCMSContentServiceStub{
		CMSContentService: content,
		delegate:          translationStub,
	}
	service := newAdminContentWriteService(wrapped)

	record, err := service.CreateTranslation(context.Background(), TranslationCreateInput{
		SourceID: source.ID,
		Locale:   "fr",
	})
	if err != nil {
		t.Fatalf("create translation: %v", err)
	}
	if got := toString(record["locale"]); got != "fr" {
		t.Fatalf("expected locale fr, got %q", got)
	}
	if translationStub.lastInput.SourceID != source.ID || translationStub.lastInput.Locale != "fr" {
		t.Fatalf("expected unwrapped creator to receive canonical input, got %+v", translationStub.lastInput)
	}
}

func TestAdminContentReadServiceListForContentTypeUsesUnwrappedLocaleVariantReader(t *testing.T) {
	ctx := context.Background()
	contentID := uuid.New()
	familyID := uuid.New()
	newsType := CMSContentType{
		ID:           uuid.New().String(),
		Slug:         "news",
		Capabilities: map[string]any{"translations": true},
	}
	contentSvc := &stubGoCMSContentService{
		listWithDerived: []*cmscontent.Content{{
			ID:   contentID,
			Slug: "breaking-news",
			Type: &cmscontent.ContentType{Slug: "news"},
			Translations: []*cmscontent.ContentTranslation{
				{Locale: &cmscontent.Locale{Code: "en"}, FamilyID: &familyID, Title: "Breaking News", Content: map[string]any{"body": "english"}},
				{Locale: &cmscontent.Locale{Code: "bo"}, FamilyID: &familyID, Title: "Breaking News BO", Content: map[string]any{"body": "tibetan"}},
				{Locale: &cmscontent.Locale{Code: "zh"}, FamilyID: &familyID, Title: "Breaking News ZH", Content: map[string]any{"body": "chinese"}},
			},
		}},
	}
	adapter := NewGoCMSContentAdapter(contentSvc, nil, newStubContentTypeService(newsType))
	service := newAdminContentReadService(wrappedCMSContentServiceStub{
		CMSContentService: adapter,
		delegate:          adapter,
	}, newStubContentTypeService(newsType))

	items, total, err := service.ListForContentType(ctx, newsType, ListOptions{Filters: map[string]any{"locale": "all"}})
	if err != nil {
		t.Fatalf("list for content type: %v", err)
	}
	if total != 3 || len(items) != 3 {
		t.Fatalf("expected 3 locale variants from wrapped reader, got total=%d len=%d", total, len(items))
	}
}

func TestAdminContentReadServiceListForContentTypeUsesUnwrappedCountCapableSource(t *testing.T) {
	ctx := context.Background()
	contentType := CMSContentType{ID: uuid.New().String(), Slug: "archive_event"}
	source := &countCapableContentTypeSourceStub{
		rows: []map[string]any{
			{"id": "row-1", "title": "One", "content_type": "archive_event", "content_type_slug": "archive_event"},
			{"id": "row-2", "title": "Two", "content_type": "archive_event", "content_type_slug": "archive_event"},
			{"id": "row-3", "title": "Three", "content_type": "archive_event", "content_type_slug": "archive_event"},
		},
	}
	wrapped := wrappedCMSContentServiceStub{
		CMSContentService: source,
		delegate:          source,
	}
	service := newAdminContentReadService(wrapped)

	items, total, err := service.ListForContentType(ctx, contentType, ListOptions{Page: 2, PerPage: 1})
	if err != nil {
		t.Fatalf("list for content type: %v", err)
	}
	if source.calls != 1 {
		t.Fatalf("expected unwrapped count-capable source call, got %d", source.calls)
	}
	if total != 3 || len(items) != 1 || toString(items[0]["id"]) != "row-2" {
		t.Fatalf("expected page 2 from count-capable source, total=%d items=%#v", total, items)
	}
}

func TestCMSContentTypeEntryRepositoryUsesUnwrappedFamilyListSource(t *testing.T) {
	ctx := context.Background()
	contentType := CMSContentType{ID: uuid.New().String(), Slug: "archive_event"}
	source := &familyListContentTypeSourceStub{
		rows: []map[string]any{
			{"family_id": "family-1", "children": []map[string]any{{"id": "row-1"}}},
			{"family_id": "family-2", "children": []map[string]any{{"id": "row-2"}}},
		},
		total: 12,
	}
	wrapped := wrappedCMSContentServiceStub{
		CMSContentService: source,
		delegate:          source,
	}
	repo := NewCMSContentTypeEntryRepository(wrapped, contentType)

	items, total, err := repo.ListTranslationFamilies(ctx, ListOptions{Page: 1, PerPage: 2})
	if err != nil {
		t.Fatalf("list translation families: %v", err)
	}
	if source.calls != 1 {
		t.Fatalf("expected unwrapped family-list source call, got %d", source.calls)
	}
	if total != 12 || len(items) != 2 || toString(items[0]["family_id"]) != "family-1" {
		t.Fatalf("expected family rows from unwrapped source, total=%d items=%#v", total, items)
	}
}

type familyListContentTypeSourceStub struct {
	siteAPIContentServiceStub
	rows  []map[string]any
	total int
	calls int
}

func (s *familyListContentTypeSourceStub) ListContentTypeFamilies(context.Context, CMSContentType, ListOptions) ([]map[string]any, int, error) {
	s.calls++
	out := make([]map[string]any, 0, len(s.rows))
	for _, row := range s.rows {
		out = append(out, cloneMap(row))
	}
	return out, s.total, nil
}
