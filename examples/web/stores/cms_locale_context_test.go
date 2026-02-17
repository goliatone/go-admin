package stores

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
)

type localeAwareContentServiceStub struct {
	pageLocales    []string
	contentLocales []string
}

type missingLocaleFallbackContentServiceStub struct {
	localeAwareContentServiceStub
}

type localeVariantLookupContentServiceStub struct {
	localeAwareContentServiceStub
}

func (s *localeAwareContentServiceStub) Pages(context.Context, string) ([]admin.CMSPage, error) {
	return nil, nil
}

func (s *localeAwareContentServiceStub) Page(_ context.Context, id, locale string) (*admin.CMSPage, error) {
	locale = strings.TrimSpace(locale)
	s.pageLocales = append(s.pageLocales, locale)
	if locale == "" {
		locale = "en"
	}
	resolvedLocale := locale
	missingRequestedLocale := false
	if locale == "fr" {
		resolvedLocale = "en"
		missingRequestedLocale = true
	}
	return &admin.CMSPage{
		ID:                     id,
		Title:                  "Locale Aware Page",
		Slug:                   "locale-aware-page",
		Locale:                 resolvedLocale,
		Status:                 "draft",
		TranslationGroupID:     "tg-page-locale-aware",
		RequestedLocale:        locale,
		ResolvedLocale:         resolvedLocale,
		AvailableLocales:       []string{"en"},
		MissingRequestedLocale: missingRequestedLocale,
	}, nil
}

func (s *localeAwareContentServiceStub) CreatePage(context.Context, admin.CMSPage) (*admin.CMSPage, error) {
	return nil, nil
}

func (s *localeAwareContentServiceStub) UpdatePage(context.Context, admin.CMSPage) (*admin.CMSPage, error) {
	return nil, nil
}

func (s *localeAwareContentServiceStub) DeletePage(context.Context, string) error {
	return nil
}

func (s *localeAwareContentServiceStub) Contents(context.Context, string) ([]admin.CMSContent, error) {
	return nil, nil
}

func (s *localeAwareContentServiceStub) Content(_ context.Context, id, locale string) (*admin.CMSContent, error) {
	locale = strings.TrimSpace(locale)
	s.contentLocales = append(s.contentLocales, locale)
	if locale == "" {
		locale = "en"
	}
	resolvedLocale := locale
	missingRequestedLocale := false
	if locale == "fr" {
		resolvedLocale = "en"
		missingRequestedLocale = true
	}
	return &admin.CMSContent{
		ID:                     id,
		Title:                  "Locale Aware Post",
		Slug:                   "locale-aware-post",
		Locale:                 resolvedLocale,
		ContentType:            "post",
		Status:                 "draft",
		TranslationGroupID:     "tg-post-locale-aware",
		RequestedLocale:        locale,
		ResolvedLocale:         resolvedLocale,
		AvailableLocales:       []string{"en"},
		MissingRequestedLocale: missingRequestedLocale,
	}, nil
}

func (s *localeAwareContentServiceStub) CreateContent(context.Context, admin.CMSContent) (*admin.CMSContent, error) {
	return nil, nil
}

func (s *localeAwareContentServiceStub) UpdateContent(context.Context, admin.CMSContent) (*admin.CMSContent, error) {
	return nil, nil
}

func (s *localeAwareContentServiceStub) DeleteContent(context.Context, string) error {
	return nil
}

func (s *localeAwareContentServiceStub) BlockDefinitions(context.Context) ([]admin.CMSBlockDefinition, error) {
	return nil, nil
}

func (s *localeAwareContentServiceStub) CreateBlockDefinition(context.Context, admin.CMSBlockDefinition) (*admin.CMSBlockDefinition, error) {
	return nil, nil
}

func (s *localeAwareContentServiceStub) UpdateBlockDefinition(context.Context, admin.CMSBlockDefinition) (*admin.CMSBlockDefinition, error) {
	return nil, nil
}

func (s *localeAwareContentServiceStub) DeleteBlockDefinition(context.Context, string) error {
	return nil
}

func (s *localeAwareContentServiceStub) BlockDefinitionVersions(context.Context, string) ([]admin.CMSBlockDefinitionVersion, error) {
	return nil, nil
}

func (s *localeAwareContentServiceStub) BlocksForContent(context.Context, string, string) ([]admin.CMSBlock, error) {
	return nil, nil
}

func (s *localeAwareContentServiceStub) SaveBlock(context.Context, admin.CMSBlock) (*admin.CMSBlock, error) {
	return nil, nil
}

func (s *localeAwareContentServiceStub) DeleteBlock(context.Context, string) error {
	return nil
}

func (s *missingLocaleFallbackContentServiceStub) Page(_ context.Context, id, locale string) (*admin.CMSPage, error) {
	locale = strings.TrimSpace(locale)
	s.pageLocales = append(s.pageLocales, locale)
	if locale == "fr" {
		return nil, errors.New("missing locale")
	}
	return &admin.CMSPage{
		ID:                 id,
		Title:              "Fallback Page",
		Slug:               "fallback-page",
		Locale:             "en",
		Status:             "draft",
		TranslationGroupID: "tg-fallback-page",
	}, nil
}

func (s *missingLocaleFallbackContentServiceStub) Content(_ context.Context, id, locale string) (*admin.CMSContent, error) {
	locale = strings.TrimSpace(locale)
	s.contentLocales = append(s.contentLocales, locale)
	if locale == "fr" {
		return nil, errors.New("missing locale")
	}
	return &admin.CMSContent{
		ID:                 id,
		Title:              "Fallback Post",
		Slug:               "fallback-post",
		Locale:             "en",
		ContentType:        "post",
		Status:             "draft",
		TranslationGroupID: "tg-fallback-post",
	}, nil
}

func (s *localeVariantLookupContentServiceStub) Pages(_ context.Context, locale string) ([]admin.CMSPage, error) {
	switch strings.ToLower(strings.TrimSpace(locale)) {
	case "es":
		return []admin.CMSPage{
			{
				ID:                 "page-es",
				Title:              "Locale Variant Page ES",
				Slug:               "locale-variant-page-es",
				Locale:             "es",
				Status:             "draft",
				TranslationGroupID: "tg-locale-variant-page",
				AvailableLocales:   []string{"en", "es"},
			},
		}, nil
	default:
		return nil, nil
	}
}

func (s *localeVariantLookupContentServiceStub) Page(_ context.Context, id, locale string) (*admin.CMSPage, error) {
	locale = strings.TrimSpace(locale)
	s.pageLocales = append(s.pageLocales, locale)
	switch strings.ToLower(locale) {
	case "es":
		// Simulates backends where translation variants have distinct IDs.
		return nil, errors.New("missing locale variant by source id")
	case "":
		return &admin.CMSPage{
			ID:                 id,
			Title:              "Locale Variant Page EN",
			Slug:               "locale-variant-page",
			Locale:             "en",
			Status:             "draft",
			TranslationGroupID: "tg-locale-variant-page",
			AvailableLocales:   []string{"en", "es"},
		}, nil
	default:
		return nil, errors.New("unsupported locale")
	}
}

func (s *localeVariantLookupContentServiceStub) Contents(_ context.Context, locale string) ([]admin.CMSContent, error) {
	switch strings.ToLower(strings.TrimSpace(locale)) {
	case "es":
		return []admin.CMSContent{
			{
				ID:                 "post-es",
				Title:              "Locale Variant Post ES",
				Slug:               "locale-variant-post-es",
				Locale:             "es",
				ContentType:        "post",
				Status:             "draft",
				TranslationGroupID: "tg-locale-variant-post",
				AvailableLocales:   []string{"en", "es"},
			},
		}, nil
	default:
		return nil, nil
	}
}

func (s *localeVariantLookupContentServiceStub) Content(_ context.Context, id, locale string) (*admin.CMSContent, error) {
	locale = strings.TrimSpace(locale)
	s.contentLocales = append(s.contentLocales, locale)
	switch strings.ToLower(locale) {
	case "es":
		// Simulates backends where translation variants have distinct IDs.
		return nil, errors.New("missing locale variant by source id")
	case "":
		return &admin.CMSContent{
			ID:                 id,
			Title:              "Locale Variant Post EN",
			Slug:               "locale-variant-post",
			Locale:             "en",
			ContentType:        "post",
			Status:             "draft",
			TranslationGroupID: "tg-locale-variant-post",
			AvailableLocales:   []string{"en", "es"},
		}, nil
	default:
		return nil, errors.New("unsupported locale")
	}
}

func TestCMSPageStoreGetUsesLocaleFromContext(t *testing.T) {
	contentSvc := &localeAwareContentServiceStub{}
	store := NewCMSPageStore(contentSvc, "en")
	if store == nil {
		t.Fatalf("expected page store")
	}

	ctx := admin.WithLocale(context.Background(), "fr")
	record, err := store.Get(ctx, "page-fr")
	if err != nil {
		t.Fatalf("get page: %v", err)
	}
	if len(contentSvc.pageLocales) != 1 || contentSvc.pageLocales[0] != "fr" {
		t.Fatalf("expected page lookup locale fr, got %#v", contentSvc.pageLocales)
	}
	if got := strings.TrimSpace(stringID(record["requested_locale"])); got != "fr" {
		t.Fatalf("expected requested_locale=fr, got %q", got)
	}
	if got := strings.TrimSpace(stringID(record["resolved_locale"])); got != "en" {
		t.Fatalf("expected resolved_locale=en, got %q", got)
	}
	if missing, _ := record["missing_requested_locale"].(bool); !missing {
		t.Fatalf("expected missing_requested_locale=true, got %#v", record["missing_requested_locale"])
	}
	if fallback, _ := record["fallback_used"].(bool); !fallback {
		t.Fatalf("expected fallback_used=true, got %#v", record["fallback_used"])
	}
}

func TestCMSPostStoreGetUsesLocaleFromContext(t *testing.T) {
	contentSvc := &localeAwareContentServiceStub{}
	store := NewCMSPostStore(contentSvc, "en")
	if store == nil {
		t.Fatalf("expected post store")
	}

	ctx := admin.WithLocale(context.Background(), "fr")
	record, err := store.Get(ctx, "post-fr")
	if err != nil {
		t.Fatalf("get post: %v", err)
	}
	if len(contentSvc.contentLocales) != 1 || contentSvc.contentLocales[0] != "fr" {
		t.Fatalf("expected content lookup locale fr, got %#v", contentSvc.contentLocales)
	}
	if got := strings.TrimSpace(stringID(record["requested_locale"])); got != "fr" {
		t.Fatalf("expected requested_locale=fr, got %q", got)
	}
	if got := strings.TrimSpace(stringID(record["resolved_locale"])); got != "en" {
		t.Fatalf("expected resolved_locale=en, got %q", got)
	}
	if missing, _ := record["missing_requested_locale"].(bool); !missing {
		t.Fatalf("expected missing_requested_locale=true, got %#v", record["missing_requested_locale"])
	}
	if fallback, _ := record["fallback_used"].(bool); !fallback {
		t.Fatalf("expected fallback_used=true, got %#v", record["fallback_used"])
	}
}

func TestCMSPageStoreGetPreservesRequestedLocaleAfterFallbackLookup(t *testing.T) {
	contentSvc := &missingLocaleFallbackContentServiceStub{}
	store := NewCMSPageStore(contentSvc, "en")
	if store == nil {
		t.Fatalf("expected page store")
	}

	ctx := admin.WithLocale(context.Background(), "fr")
	record, err := store.Get(ctx, "page-fallback")
	if err != nil {
		t.Fatalf("get page: %v", err)
	}
	if got := contentSvc.pageLocales; len(got) != 2 || got[0] != "fr" || got[1] != "" {
		t.Fatalf("expected fallback sequence [fr, \"\"], got %#v", got)
	}
	if got := strings.TrimSpace(stringID(record["requested_locale"])); got != "fr" {
		t.Fatalf("expected requested_locale=fr, got %q", got)
	}
	if got := strings.TrimSpace(stringID(record["resolved_locale"])); got != "en" {
		t.Fatalf("expected resolved_locale=en, got %q", got)
	}
	if missing, _ := record["missing_requested_locale"].(bool); !missing {
		t.Fatalf("expected missing_requested_locale=true, got %#v", record["missing_requested_locale"])
	}
}

func TestCMSPostStoreGetPreservesRequestedLocaleAfterFallbackLookup(t *testing.T) {
	contentSvc := &missingLocaleFallbackContentServiceStub{}
	store := NewCMSPostStore(contentSvc, "en")
	if store == nil {
		t.Fatalf("expected post store")
	}

	ctx := admin.WithLocale(context.Background(), "fr")
	record, err := store.Get(ctx, "post-fallback")
	if err != nil {
		t.Fatalf("get post: %v", err)
	}
	if got := contentSvc.contentLocales; len(got) != 2 || got[0] != "fr" || got[1] != "" {
		t.Fatalf("expected fallback sequence [fr, \"\"], got %#v", got)
	}
	if got := strings.TrimSpace(stringID(record["requested_locale"])); got != "fr" {
		t.Fatalf("expected requested_locale=fr, got %q", got)
	}
	if got := strings.TrimSpace(stringID(record["resolved_locale"])); got != "en" {
		t.Fatalf("expected resolved_locale=en, got %q", got)
	}
	if missing, _ := record["missing_requested_locale"].(bool); !missing {
		t.Fatalf("expected missing_requested_locale=true, got %#v", record["missing_requested_locale"])
	}
}

func TestCMSPageStoreGetResolvesRequestedLocaleVariantByTranslationGroup(t *testing.T) {
	contentSvc := &localeVariantLookupContentServiceStub{}
	store := NewCMSPageStore(contentSvc, "en")
	if store == nil {
		t.Fatalf("expected page store")
	}

	ctx := admin.WithLocale(context.Background(), "es")
	record, err := store.Get(ctx, "page-en")
	if err != nil {
		t.Fatalf("get page: %v", err)
	}
	if got := strings.TrimSpace(asString(record["locale"], "")); got != "es" {
		t.Fatalf("expected resolved locale es, got %q", got)
	}
	if got := strings.TrimSpace(stringID(record["requested_locale"])); got != "es" {
		t.Fatalf("expected requested_locale=es, got %q", got)
	}
	if missing, _ := record["missing_requested_locale"].(bool); missing {
		t.Fatalf("expected missing_requested_locale=false, got %#v", record["missing_requested_locale"])
	}
}

func TestCMSPostStoreGetResolvesRequestedLocaleVariantByTranslationGroup(t *testing.T) {
	contentSvc := &localeVariantLookupContentServiceStub{}
	store := NewCMSPostStore(contentSvc, "en")
	if store == nil {
		t.Fatalf("expected post store")
	}

	ctx := admin.WithLocale(context.Background(), "es")
	record, err := store.Get(ctx, "post-en")
	if err != nil {
		t.Fatalf("get post: %v", err)
	}
	if got := strings.TrimSpace(asString(record["locale"], "")); got != "es" {
		t.Fatalf("expected resolved locale es, got %q", got)
	}
	if got := strings.TrimSpace(stringID(record["requested_locale"])); got != "es" {
		t.Fatalf("expected requested_locale=es, got %q", got)
	}
	if missing, _ := record["missing_requested_locale"].(bool); missing {
		t.Fatalf("expected missing_requested_locale=false, got %#v", record["missing_requested_locale"])
	}
}

func TestCMSPageStoreResolveLocaleReturnsAllLocalesWhenFilterMissing(t *testing.T) {
	store := NewCMSPageStore(&localeAwareContentServiceStub{}, "en")

	if got := strings.TrimSpace(store.resolveLocale(admin.ListOptions{})); got != "" {
		t.Fatalf("expected empty locale scope when filter missing, got %q", got)
	}
	if got := strings.TrimSpace(store.resolveLocale(admin.ListOptions{
		Filters: map[string]any{"locale": "fr"},
	})); got != "fr" {
		t.Fatalf("expected explicit locale filter to win, got %q", got)
	}
}

func TestCMSPostStoreResolveLocaleReturnsAllLocalesWhenFilterMissing(t *testing.T) {
	store := NewCMSPostStore(&localeAwareContentServiceStub{}, "en")

	if got := strings.TrimSpace(store.resolveLocale(admin.ListOptions{})); got != "" {
		t.Fatalf("expected empty locale scope when filter missing, got %q", got)
	}
	if got := strings.TrimSpace(store.resolveLocale(admin.ListOptions{
		Filters: map[string]any{"locale": "fr"},
	})); got != "fr" {
		t.Fatalf("expected explicit locale filter to win, got %q", got)
	}
}
