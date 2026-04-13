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
