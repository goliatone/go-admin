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

func TestGoCMSContentAdapterContentsWithLocaleVariantsReturnsCompleteRows(t *testing.T) {
	assertGoCMSContentAdapterContentsWithLocaleVariantsCompleteRows(t)
}

func TestGoCMSContentAdapterContentsWithLocaleVariantsExpandsTranslationFamilies(t *testing.T) {
	assertGoCMSContentAdapterContentsWithLocaleVariantsCompleteRows(t)
}

func assertGoCMSContentAdapterContentsWithLocaleVariantsCompleteRows(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	contentID := uuid.New()
	familyID := uuid.New()
	typeSvc := newStubContentTypeService(CMSContentType{ID: uuid.New().String(), Slug: "news"})
	contentSvc := &stubGoCMSContentService{
		listWithDerived: []*cmscontent.Content{
			{
				ID:       contentID,
				Slug:     "breaking-news",
				Status:   "published",
				Metadata: map[string]any{"family_id": familyID.String(), "channel": "production"},
				Type:     &cmscontent.ContentType{Slug: "news"},
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

	items, err := adapter.ContentsWithOptions(ctx, "all", WithTranslations(), WithDerivedFields(), WithLocaleVariants())
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
		if item.ID != contentID.String() {
			t.Fatalf("expected stable content id %q, got %q", contentID.String(), item.ID)
		}
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
		if !slices.Equal(item.AvailableLocales, []string{"en", "bo", "zh"}) {
			t.Fatalf("expected available locale siblings en/bo/zh, got %+v", item.AvailableLocales)
		}
		if strings.TrimSpace(item.Title) == "" {
			t.Fatalf("expected variant title, got %+v", item)
		}
		if item.Slug != "breaking-news" {
			t.Fatalf("expected parent slug fallback, got %q", item.Slug)
		}
		if item.Status != "published" {
			t.Fatalf("expected parent status fallback, got %q", item.Status)
		}
		if item.ContentType != "news" || item.ContentTypeSlug != "news" {
			t.Fatalf("expected content type slug news, got content_type=%q content_type_slug=%q", item.ContentType, item.ContentTypeSlug)
		}
		if len(item.Data) == 0 || strings.TrimSpace(toString(item.Data["body"])) == "" {
			t.Fatalf("expected list-renderable translation data, got %+v", item.Data)
		}
		if strings.TrimSpace(toString(item.Metadata["channel"])) != "production" {
			t.Fatalf("expected parent metadata to be preserved, got %+v", item.Metadata)
		}
	}
	if contentSvc.getCount != 0 {
		t.Fatalf("expected locale variant list to avoid per-locale get calls, got %d", contentSvc.getCount)
	}
	if !hasTranslationListOption(contentSvc.listOptions) {
		t.Fatalf("expected translations option for locale-variant list, got %v", contentSvc.listOptions)
	}
	if !hasDerivedProjectionListOption(contentSvc.listOptions) {
		t.Fatalf("expected derived-fields projection for locale-variant list, got %v", contentSvc.listOptions)
	}
}

func TestGoCMSContentAdapterContentsWithLocaleVariantsCachesContentTypeMetadataLookup(t *testing.T) {
	ctx := context.Background()
	contentID := uuid.New()
	familyID := uuid.New()
	typeSvc := newStubContentTypeService(CMSContentType{
		ID:           uuid.New().String(),
		Slug:         "news",
		Capabilities: map[string]any{"structural_fields": true},
	})
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
						Content:  map[string]any{"body": "english"},
					},
					{
						Locale:   &cmscontent.Locale{Code: "bo"},
						FamilyID: &familyID,
						Title:    "Breaking News BO",
						Content:  map[string]any{"body": "tibetan"},
					},
					{
						Locale:   &cmscontent.Locale{Code: "zh"},
						FamilyID: &familyID,
						Title:    "Breaking News ZH",
						Content:  map[string]any{"body": "chinese"},
					},
				},
			},
		},
	}
	svc := NewGoCMSContentAdapter(contentSvc, nil, typeSvc)
	adapter := svc.(*GoCMSContentAdapter)

	items, err := adapter.ContentsWithOptions(ctx, "all", WithTranslations(), WithDerivedFields(), WithLocaleVariants())
	if err != nil {
		t.Fatalf("list content with locale variants: %v", err)
	}
	if len(items) != 3 {
		t.Fatalf("expected 3 locale variants, got %d", len(items))
	}
	if typeSvc.slugLookups != 1 {
		t.Fatalf("expected one cached content type slug lookup, got %d", typeSvc.slugLookups)
	}
}

func TestGoCMSContentAdapterPagesWithLocaleVariantsExpandsTranslationFamilies(t *testing.T) {
	ctx := context.Background()
	contentID := uuid.New()
	familyID := uuid.New()
	typeSvc := newStubContentTypeService(CMSContentType{ID: uuid.New().String(), Slug: "page"})
	contentSvc := &stubGoCMSContentService{
		listWithDerived: []*cmscontent.Content{
			{
				ID:   contentID,
				Slug: "home",
				Type: &cmscontent.ContentType{Slug: "page"},
				Translations: []*cmscontent.ContentTranslation{
					{
						Locale:   &cmscontent.Locale{Code: "en"},
						FamilyID: &familyID,
						Title:    "Home",
						Content:  map[string]any{"path": "/home", "summary": "english"},
					},
					{
						Locale:   &cmscontent.Locale{Code: "bo"},
						FamilyID: &familyID,
						Title:    "Home BO",
						Content:  map[string]any{"path": "/bo/home", "summary": "tibetan"},
					},
					{
						Locale:   &cmscontent.Locale{Code: "zh"},
						FamilyID: &familyID,
						Title:    "Home ZH",
						Content:  map[string]any{"path": "/zh/home", "summary": "chinese"},
					},
				},
			},
		},
	}
	adapter := NewGoCMSContentAdapter(contentSvc, nil, typeSvc).(*GoCMSContentAdapter)

	items, err := adapter.PagesWithOptions(ctx, "all", WithTranslations(), WithLocaleVariants())
	if err != nil {
		t.Fatalf("list pages with locale variants: %v", err)
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

func TestAdminContentReadServiceListForContentTypeGroupedUsesCompleteLocaleVariantRows(t *testing.T) {
	ctx := context.Background()
	contentID := uuid.New()
	familyID := uuid.New()
	newsType := CMSContentType{
		Slug:         "news",
		Capabilities: map[string]any{"translations": true},
	}
	contentSvc := &stubGoCMSContentService{
		listWithDerived: []*cmscontent.Content{
			{
				ID:       contentID,
				Slug:     "breaking-news",
				Status:   "published",
				Metadata: map[string]any{"family_id": familyID.String(), "channel": "production"},
				Type:     &cmscontent.ContentType{Slug: "news"},
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

	rows, total, err := service.ListForContentType(ctx, newsType, ListOptions{
		Filters: map[string]any{
			"locale":   "en",
			"group_by": "family_id",
		},
		Predicates: []ListPredicate{
			{Field: "status", Operator: "eq", Values: []string{"published"}},
		},
	})
	if err != nil {
		t.Fatalf("list grouped content type rows: %v", err)
	}
	if total != 3 || len(rows) != 3 {
		t.Fatalf("expected 3 complete locale rows before DataGrid grouping, got total=%d len=%d", total, len(rows))
	}
	for _, row := range rows {
		if strings.TrimSpace(toString(row["id"])) != contentID.String() {
			t.Fatalf("expected stable id %q, got %#v", contentID.String(), row["id"])
		}
		if strings.TrimSpace(toString(row["family_id"])) != familyID.String() {
			t.Fatalf("expected family_id %q, got %#v", familyID.String(), row["family_id"])
		}
		locale := strings.TrimSpace(toString(row["locale"]))
		if locale == "" {
			t.Fatalf("expected locale, got %#v", row)
		}
		if strings.TrimSpace(toString(row["resolved_locale"])) != locale {
			t.Fatalf("expected resolved_locale %q, got %#v", locale, row["resolved_locale"])
		}
		if !slices.Equal(toStringSlice(row["available_locales"]), []string{"en", "bo", "zh"}) {
			t.Fatalf("expected available_locales en/bo/zh, got %#v", row["available_locales"])
		}
		if strings.TrimSpace(toString(row["content_type"])) != "news" {
			t.Fatalf("expected content_type news, got %#v", row["content_type"])
		}
		if strings.TrimSpace(toString(row["content_type_slug"])) != "news" {
			t.Fatalf("expected content_type_slug news, got %#v", row["content_type_slug"])
		}
		if strings.TrimSpace(toString(row["title"])) == "" {
			t.Fatalf("expected title, got %#v", row["title"])
		}
		if strings.TrimSpace(toString(row["slug"])) != "breaking-news" {
			t.Fatalf("expected slug fallback breaking-news, got %#v", row["slug"])
		}
		if strings.TrimSpace(toString(row["status"])) != "published" {
			t.Fatalf("expected status fallback published, got %#v", row["status"])
		}
		data, ok := row["data"].(map[string]any)
		if !ok || strings.TrimSpace(toString(data["body"])) == "" {
			t.Fatalf("expected list-renderable data, got %#v", row["data"])
		}
		metadata, ok := row["metadata"].(map[string]any)
		if !ok || strings.TrimSpace(toString(metadata["channel"])) != "production" {
			t.Fatalf("expected preserved metadata, got %#v", row["metadata"])
		}
	}
	if contentSvc.getCount != 0 {
		t.Fatalf("expected grouped locale variant list to avoid per-locale get calls, got %d", contentSvc.getCount)
	}
}

func TestCMSPageRepositoryExpandTranslationFamiliesForWildcardAndFamilyFilters(t *testing.T) {
	ctx := context.Background()
	familyID := uuid.New()
	contentSvc := &stubGoCMSContentService{
		listWithDerived: []*cmscontent.Content{
			{
				ID:   uuid.New(),
				Slug: "home",
				Type: &cmscontent.ContentType{Slug: "page"},
				Translations: []*cmscontent.ContentTranslation{
					{
						Locale:   &cmscontent.Locale{Code: "en"},
						FamilyID: &familyID,
						Title:    "Home",
						Content:  map[string]any{"path": "/home"},
					},
					{
						Locale:   &cmscontent.Locale{Code: "bo"},
						FamilyID: &familyID,
						Title:    "Home BO",
						Content:  map[string]any{"path": "/bo/home"},
					},
					{
						Locale:   &cmscontent.Locale{Code: "zh"},
						FamilyID: &familyID,
						Title:    "Home ZH",
						Content:  map[string]any{"path": "/zh/home"},
					},
				},
			},
		},
	}
	adapter := NewGoCMSContentAdapter(contentSvc, nil, newStubContentTypeService(CMSContentType{Slug: "page"}))
	repo := NewCMSPageRepository(adapter)

	items, total, err := repo.List(ctx, ListOptions{Filters: map[string]any{"locale": "all"}})
	if err != nil {
		t.Fatalf("list pages with locale all: %v", err)
	}
	if total != 3 || len(items) != 3 {
		t.Fatalf("expected 3 page sibling rows, got total=%d len=%d", total, len(items))
	}

	familyRows, familyTotal, err := repo.List(ctx, ListOptions{Filters: map[string]any{"family_id": familyID.String()}})
	if err != nil {
		t.Fatalf("list pages with family filter: %v", err)
	}
	if familyTotal != 3 || len(familyRows) != 3 {
		t.Fatalf("expected 3 page sibling rows for family filter, got total=%d len=%d", familyTotal, len(familyRows))
	}

	englishOnly, englishTotal, err := repo.List(ctx, ListOptions{Filters: map[string]any{"locale": "en"}})
	if err != nil {
		t.Fatalf("list pages with explicit locale: %v", err)
	}
	if englishTotal != 1 || len(englishOnly) != 1 {
		t.Fatalf("expected 1 page row for explicit locale, got total=%d len=%d", englishTotal, len(englishOnly))
	}
	if got := strings.TrimSpace(toString(englishOnly[0]["locale"])); got != "en" {
		t.Fatalf("expected english row locale en, got %q", got)
	}
}
