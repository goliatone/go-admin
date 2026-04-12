package admin

import (
	"context"
	"slices"
	"testing"

	cms "github.com/goliatone/go-cms"
	cmscontent "github.com/goliatone/go-cms/content"
	cmsinterfaces "github.com/goliatone/go-cms/pkg/interfaces"
	"github.com/google/uuid"
)

type stubAdminPageReadService struct {
	lastListOpts cms.AdminPageListOptions
	lastGetOpts  cms.AdminPageGetOptions
	listRecords  []cms.AdminPageRecord
	listTotal    int
	getRecord    *cms.AdminPageRecord
	listCalls    int
}

func (s *stubAdminPageReadService) List(ctx context.Context, opts cms.AdminPageListOptions) ([]cms.AdminPageRecord, int, error) {
	s.listCalls++
	s.lastListOpts = opts
	if !opts.AllowMissingTranslations {
		return nil, 0, cmsinterfaces.ErrTranslationMissing
	}
	return s.listRecords, s.listTotal, nil
}

func (s *stubAdminPageReadService) Get(ctx context.Context, id string, opts cms.AdminPageGetOptions) (*cms.AdminPageRecord, error) {
	s.lastGetOpts = opts
	if !opts.AllowMissingTranslations {
		return nil, cmsinterfaces.ErrTranslationMissing
	}
	return s.getRecord, nil
}

func TestGoCMSAdminPageReadAdapterListAllowsMissingTranslations(t *testing.T) {
	ctx := context.Background()
	pageID := uuid.New()
	contentID := uuid.New()
	meta := TranslationMeta{
		RequestedLocale:        "es",
		ResolvedLocale:         "en",
		AvailableLocales:       []string{"en"},
		MissingRequestedLocale: true,
		FallbackUsed:           true,
		PrimaryLocale:          "en",
	}
	pageTranslation := PageTranslation{Locale: "en", Title: "Home", Path: "/home"}
	contentMeta := TranslationMeta{
		RequestedLocale:        "es",
		ResolvedLocale:         "en",
		AvailableLocales:       []string{"en", "fr"},
		MissingRequestedLocale: true,
		FallbackUsed:           true,
		PrimaryLocale:          "en",
	}
	contentTranslation := ContentTranslation{Locale: "en", Title: "Welcome"}
	record := cms.AdminPageRecord{
		ID:              pageID,
		ContentID:       contentID,
		TemplateID:      uuid.New(),
		RequestedLocale: "es",
		ResolvedLocale:  "en",
		Translation: TranslationBundle[PageTranslation]{
			Meta:     meta,
			Resolved: &pageTranslation,
		},
		ContentTranslation: TranslationBundle[ContentTranslation]{
			Meta:     contentMeta,
			Resolved: &contentTranslation,
		},
		Data: map[string]any{
			"title": "Fallback Title",
			"slug":  "fallback",
			"path":  "/fallback",
		},
	}

	svc := &stubAdminPageReadService{
		listRecords: []cms.AdminPageRecord{record},
		listTotal:   1,
	}
	adapter := NewGoCMSAdminPageReadAdapter(svc)

	items, total, err := adapter.List(ctx, AdminPageListOptions{Locale: "es", IncludeData: true})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 1 || len(items) != 1 {
		t.Fatalf("expected 1 record, got total=%d len=%d", total, len(items))
	}
	if !svc.lastListOpts.AllowMissingTranslations {
		t.Fatalf("expected AllowMissingTranslations enforced")
	}
	got := items[0]
	if got.Translation.Meta.MissingRequestedLocale != true {
		t.Fatalf("expected missing requested locale true, got %+v", got.Translation.Meta)
	}
	if got.Translation.Meta.RequestedLocale != "es" || got.Translation.Meta.ResolvedLocale != "en" {
		t.Fatalf("expected translation meta requested/resolved preserved, got %+v", got.Translation.Meta)
	}
	if len(got.Translation.Meta.AvailableLocales) != 1 || got.Translation.Meta.AvailableLocales[0] != "en" {
		t.Fatalf("expected translation available locales [en], got %+v", got.Translation.Meta.AvailableLocales)
	}
	if !got.Translation.Meta.FallbackUsed || got.Translation.Meta.PrimaryLocale != "en" {
		t.Fatalf("expected translation fallback/primary preserved, got %+v", got.Translation.Meta)
	}
	if got.Translation.Requested != nil {
		t.Fatalf("expected nil requested translation when missing")
	}
	if got.Translation.Resolved == nil || got.Translation.Resolved.Locale != "en" {
		t.Fatalf("expected resolved translation in fallback locale, got %+v", got.Translation.Resolved)
	}
	if got.ContentTranslation.Meta.RequestedLocale != "es" || got.ContentTranslation.Meta.ResolvedLocale != "en" {
		t.Fatalf("expected content translation meta requested/resolved preserved, got %+v", got.ContentTranslation.Meta)
	}
	if len(got.ContentTranslation.Meta.AvailableLocales) != 2 ||
		got.ContentTranslation.Meta.AvailableLocales[0] != "en" ||
		got.ContentTranslation.Meta.AvailableLocales[1] != "fr" {
		t.Fatalf("expected content available locales [en fr], got %+v", got.ContentTranslation.Meta.AvailableLocales)
	}
	if !got.ContentTranslation.Meta.FallbackUsed || got.ContentTranslation.Meta.PrimaryLocale != "en" {
		t.Fatalf("expected content fallback/primary preserved, got %+v", got.ContentTranslation.Meta)
	}
}

func TestGoCMSAdminPageReadAdapterGetAllowsMissingTranslations(t *testing.T) {
	ctx := context.Background()
	pageID := uuid.New()
	meta := TranslationMeta{
		RequestedLocale:        "es",
		ResolvedLocale:         "en",
		AvailableLocales:       []string{"en"},
		MissingRequestedLocale: true,
		FallbackUsed:           true,
		PrimaryLocale:          "en",
	}
	pageTranslation := PageTranslation{Locale: "en", Title: "Home", Path: "/home"}
	record := cms.AdminPageRecord{
		ID:              pageID,
		ContentID:       uuid.New(),
		TemplateID:      uuid.New(),
		RequestedLocale: "es",
		ResolvedLocale:  "en",
		Translation: TranslationBundle[PageTranslation]{
			Meta:     meta,
			Resolved: &pageTranslation,
		},
	}
	svc := &stubAdminPageReadService{getRecord: &record}
	adapter := NewGoCMSAdminPageReadAdapter(svc)

	got, err := adapter.Get(ctx, pageID.String(), AdminPageGetOptions{Locale: "es", IncludeData: true})
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got == nil {
		t.Fatalf("expected record returned")
	}
	if !svc.lastGetOpts.AllowMissingTranslations {
		t.Fatalf("expected AllowMissingTranslations enforced")
	}
	if got.Translation.Meta.RequestedLocale != "es" || !got.Translation.Meta.MissingRequestedLocale {
		t.Fatalf("expected translation meta preserved, got %+v", got.Translation.Meta)
	}
	if got.Translation.Meta.ResolvedLocale != "en" || !got.Translation.Meta.FallbackUsed || got.Translation.Meta.PrimaryLocale != "en" {
		t.Fatalf("expected translation bundle metadata preserved, got %+v", got.Translation.Meta)
	}
	if len(got.Translation.Meta.AvailableLocales) != 1 || got.Translation.Meta.AvailableLocales[0] != "en" {
		t.Fatalf("expected translation available locales [en], got %+v", got.Translation.Meta.AvailableLocales)
	}
}

func TestGoCMSAdminPageReadAdapterDoesNotDeriveCoreFieldsFromData(t *testing.T) {
	ctx := context.Background()
	pageID := uuid.New()
	record := cms.AdminPageRecord{
		ID:         pageID,
		ContentID:  uuid.New(),
		TemplateID: uuid.New(),
		Data: map[string]any{
			"title":            "Fallback Title",
			"slug":             "fallback-slug",
			"path":             "/fallback-path",
			"meta_title":       "Fallback Meta Title",
			"meta_description": "Fallback Meta Description",
			"workflow_status":  "published",
		},
	}
	svc := &stubAdminPageReadService{
		listRecords: []cms.AdminPageRecord{record},
		listTotal:   1,
	}
	adapter := NewGoCMSAdminPageReadAdapter(svc)

	items, total, err := adapter.List(ctx, AdminPageListOptions{Locale: "en", IncludeData: true})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 1 || len(items) != 1 {
		t.Fatalf("expected one record, got total=%d len=%d", total, len(items))
	}
	got := items[0]
	if got.Title != "" || got.Slug != "" || got.Path != "" {
		t.Fatalf("expected title/slug/path not derived from Data, got title=%q slug=%q path=%q", got.Title, got.Slug, got.Path)
	}
	if got.MetaTitle != "" || got.MetaDescription != "" {
		t.Fatalf("expected meta fields not derived from Data, got meta_title=%q meta_description=%q", got.MetaTitle, got.MetaDescription)
	}
	if got.Status != "" {
		t.Fatalf("expected status not derived from Data, got %q", got.Status)
	}
}

func TestGoCMSAdminPageReadAdapterWithContentExpandsTranslationFamilies(t *testing.T) {
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
	contentAdapter := NewGoCMSContentAdapter(contentSvc, nil, newStubContentTypeService(CMSContentType{Slug: "page"}))
	svc := &stubAdminPageReadService{}
	adapter := NewGoCMSAdminPageReadAdapterWithContent(svc, contentAdapter)

	items, total, err := adapter.List(ctx, AdminPageListOptions{
		Locale:                    "all",
		ExpandTranslationFamilies: true,
		IncludeData:               true,
		Filters:                   map[string]any{"family_id": familyID.String()},
	})
	if err != nil {
		t.Fatalf("list expanded translation families: %v", err)
	}
	if svc.listCalls != 0 {
		t.Fatalf("expected content-backed expansion path to bypass admin read service, got %d calls", svc.listCalls)
	}
	if total != 3 || len(items) != 3 {
		t.Fatalf("expected 3 sibling records, got total=%d len=%d", total, len(items))
	}
	locales := []string{items[0].ResolvedLocale, items[1].ResolvedLocale, items[2].ResolvedLocale}
	if !slices.Equal(locales, []string{"en", "bo", "zh"}) {
		t.Fatalf("expected resolved locales [en bo zh], got %v", locales)
	}
	for _, item := range items {
		if item.FamilyID != familyID.String() {
			t.Fatalf("expected family id %q, got %q", familyID.String(), item.FamilyID)
		}
		if item.Translation.Resolved == nil || item.Translation.Resolved.Locale != item.ResolvedLocale {
			t.Fatalf("expected resolved page translation for %+v", item)
		}
	}
}
