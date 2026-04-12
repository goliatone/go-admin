package stores

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
)

func TestCMSPageStorePageToRecordIncludesTranslationMetadata(t *testing.T) {
	store := &CMSPageStore{}
	record := store.pageToRecord(admin.CMSPage{
		ID:                     "page_1",
		Title:                  "Home",
		Slug:                   "home",
		Locale:                 "en",
		Status:                 "draft",
		FamilyID:               "tg_pages_1",
		RequestedLocale:        "fr",
		ResolvedLocale:         "en",
		AvailableLocales:       []string{"en", "es"},
		MissingRequestedLocale: true,
		Data: map[string]any{
			"path": "/home",
		},
	})

	if got := record["family_id"]; got != "tg_pages_1" {
		t.Fatalf("expected family_id tg_pages_1, got %#v", got)
	}
	if got := record["requested_locale"]; got != "fr" {
		t.Fatalf("expected requested_locale fr, got %#v", got)
	}
	if got := record["resolved_locale"]; got != "en" {
		t.Fatalf("expected resolved_locale en, got %#v", got)
	}
	if got, _ := record["missing_requested_locale"].(bool); !got {
		t.Fatalf("expected missing_requested_locale=true, got %#v", record["missing_requested_locale"])
	}
	if got, _ := record["fallback_used"].(bool); !got {
		t.Fatalf("expected fallback_used=true, got %#v", record["fallback_used"])
	}

	available, ok := record["available_locales"].([]string)
	if !ok {
		t.Fatalf("expected available_locales []string, got %#v", record["available_locales"])
	}
	if len(available) != 2 || available[0] != "en" || available[1] != "es" {
		t.Fatalf("unexpected available_locales: %#v", available)
	}
}

func TestCMSPostStorePostToRecordIncludesTranslationMetadata(t *testing.T) {
	store := &CMSPostStore{}
	record := store.postToRecord(admin.CMSContent{
		ID:                     "post_1",
		Title:                  "Hello",
		Slug:                   "hello",
		Locale:                 "en",
		Status:                 "draft",
		ContentType:            "post",
		FamilyID:               "tg_posts_1",
		RequestedLocale:        "fr",
		ResolvedLocale:         "en",
		AvailableLocales:       []string{"en", "fr"},
		MissingRequestedLocale: false,
		Data: map[string]any{
			"path": "/posts/hello",
		},
	})

	if got := record["family_id"]; got != "tg_posts_1" {
		t.Fatalf("expected family_id tg_posts_1, got %#v", got)
	}
	if got := record["requested_locale"]; got != "fr" {
		t.Fatalf("expected requested_locale fr, got %#v", got)
	}
	if got := record["resolved_locale"]; got != "en" {
		t.Fatalf("expected resolved_locale en, got %#v", got)
	}
	if got, _ := record["missing_requested_locale"].(bool); !got {
		t.Fatalf("expected missing_requested_locale=true (inferred from fr->en fallback), got %#v", record["missing_requested_locale"])
	}
	if got, _ := record["fallback_used"].(bool); !got {
		t.Fatalf("expected fallback_used=true, got %#v", record["fallback_used"])
	}

	available, ok := record["available_locales"].([]string)
	if !ok {
		t.Fatalf("expected available_locales []string, got %#v", record["available_locales"])
	}
	if len(available) != 2 || available[0] != "en" || available[1] != "fr" {
		t.Fatalf("unexpected available_locales: %#v", available)
	}
}

func TestCMSPostStorePostToRecordMarksInheritedFallbackPath(t *testing.T) {
	store := &CMSPostStore{}
	record := store.postToRecord(admin.CMSContent{
		ID:          "post_2",
		Slug:        "hello",
		Locale:      "fr",
		ContentType: "post",
		FamilyID:    "tg_posts_2",
		Data:        map[string]any{},
	})

	if got := record["path"]; got != "/posts/hello" {
		t.Fatalf("expected derived post path, got %#v", got)
	}
	if inherited, _ := record[inheritedLocalizedPathKey].(bool); !inherited {
		t.Fatalf("expected inherited localized path marker, got %#v", record[inheritedLocalizedPathKey])
	}
}

func TestCMSPostStorePostPayloadPreservesBlankPathForTranslationFallback(t *testing.T) {
	store := &CMSPostStore{defaultLocale: "en"}
	payload := store.postPayload(map[string]any{
		"title":     "Bonjour",
		"slug":      "hello",
		"locale":    "fr",
		"family_id": "tg_posts_2",
	}, nil)

	data, _ := payload["data"].(map[string]any)
	if _, ok := data["path"]; ok {
		t.Fatalf("expected translation clone payload to omit stored path, got %#v", data["path"])
	}
}

func TestCMSPostStorePostPayloadDoesNotMaterializeInheritedFallbackOnUpdate(t *testing.T) {
	store := &CMSPostStore{defaultLocale: "en"}
	payload := store.postPayload(map[string]any{
		"title": "Bonjour Updated",
	}, map[string]any{
		"id":                      "post_3",
		"slug":                    "hello",
		"locale":                  "fr",
		"family_id":               "tg_posts_3",
		"path":                    "/posts/hello",
		inheritedLocalizedPathKey: true,
	})

	data, _ := payload["data"].(map[string]any)
	if _, ok := data["path"]; ok {
		t.Fatalf("expected update payload to keep inherited fallback blank, got %#v", data["path"])
	}
}

func TestCMSPageStorePagePayloadPreservesBlankPathForTranslationFallback(t *testing.T) {
	store := &CMSPageStore{defaultLocale: "en"}
	payload := store.pagePayload(map[string]any{
		"title":     "Accueil",
		"slug":      "home",
		"locale":    "fr",
		"family_id": "tg_pages_2",
	}, nil)

	data, _ := payload["data"].(map[string]any)
	if _, ok := data["path"]; ok {
		t.Fatalf("expected translation clone payload to omit stored page path, got %#v", data["path"])
	}
}

type fallbackTranslationContentServiceStub struct {
	localeAwareContentServiceStub
	source  admin.CMSContent
	created admin.CMSContent
}

func (s *fallbackTranslationContentServiceStub) Content(_ context.Context, id, locale string) (*admin.CMSContent, error) {
	if id != s.source.ID {
		return nil, admin.ErrNotFound
	}
	source := s.source
	return &source, nil
}

func (s *fallbackTranslationContentServiceStub) Contents(context.Context, string) ([]admin.CMSContent, error) {
	return nil, nil
}

func (s *fallbackTranslationContentServiceStub) CreateContent(_ context.Context, content admin.CMSContent) (*admin.CMSContent, error) {
	created := content
	if created.ID == "" {
		created.ID = "translated-1"
	}
	s.created = created
	return &created, nil
}

func TestFilteredContentServiceCreateTranslationClearsSourceMetadataPathWhenTargetPathBlank(t *testing.T) {
	service := &fallbackTranslationContentServiceStub{
		source: admin.CMSContent{
			ID:          "source-1",
			Title:       "Hello",
			Slug:        "hello",
			Locale:      "en",
			ContentType: "post",
			Status:      "published",
			FamilyID:    "family-1",
			RouteKey:    "posts/hello",
			Data: map[string]any{
				"path":      "/posts/hello",
				"route_key": "posts/hello",
			},
			Metadata: map[string]any{
				"path":      "/posts/hello",
				"route_key": "posts/hello",
			},
		},
	}

	filtered := &filteredContentService{inner: service, contentType: "post"}
	created, err := filtered.CreateTranslation(context.Background(), admin.TranslationCreateInput{
		SourceID: "source-1",
		Locale:   "fr",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if created == nil {
		t.Fatalf("expected created translation")
	}
	if got := service.created.Data["path"]; got != nil {
		t.Fatalf("expected blank translated data path, got %#v", got)
	}
	if got := service.created.Metadata["path"]; got != nil {
		t.Fatalf("expected blank translated metadata path, got %#v", got)
	}
}

func TestFilteredContentServiceCreateTranslationUpdatesMetadataPathWhenTargetPathExplicit(t *testing.T) {
	service := &fallbackTranslationContentServiceStub{
		source: admin.CMSContent{
			ID:          "source-2",
			Title:       "About",
			Slug:        "about",
			Locale:      "en",
			ContentType: "post",
			Status:      "published",
			FamilyID:    "family-2",
			RouteKey:    "posts/about",
			Data: map[string]any{
				"path":      "/posts/about",
				"route_key": "posts/about",
			},
			Metadata: map[string]any{
				"path":      "/posts/about",
				"route_key": "posts/about",
			},
		},
	}

	filtered := &filteredContentService{inner: service, contentType: "post"}
	created, err := filtered.CreateTranslation(context.Background(), admin.TranslationCreateInput{
		SourceID: "source-2",
		Locale:   "es",
		Path:     "/publicaciones/sobre",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if created == nil {
		t.Fatalf("expected created translation")
	}
	if got := service.created.Data["path"]; got != "/publicaciones/sobre" {
		t.Fatalf("expected explicit translated data path, got %#v", got)
	}
	if got := service.created.Metadata["path"]; got != "/publicaciones/sobre" {
		t.Fatalf("expected explicit translated metadata path, got %#v", got)
	}
}

func TestFilteredContentServiceCreateTranslationDerivesRouteKeyFromSourceMetadata(t *testing.T) {
	service := &fallbackTranslationContentServiceStub{
		source: admin.CMSContent{
			ID:          "source-3",
			Title:       "About",
			Slug:        "about",
			Locale:      "en",
			ContentType: "post",
			Status:      "published",
			FamilyID:    "family-3",
			Data: map[string]any{
				"path":      "/posts/about",
				"route_key": "posts/about",
			},
			Metadata: map[string]any{
				"path":      "/posts/about",
				"route_key": "posts/about",
			},
		},
	}

	filtered := &filteredContentService{inner: service, contentType: "post"}
	created, err := filtered.CreateTranslation(context.Background(), admin.TranslationCreateInput{
		SourceID: "source-3",
		Locale:   "fr",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if created == nil {
		t.Fatalf("expected created translation")
	}
	if got := service.created.RouteKey; got != "posts/about" {
		t.Fatalf("expected derived route_key, got %#v", got)
	}
	if got := service.created.Metadata["route_key"]; got != "posts/about" {
		t.Fatalf("expected metadata route_key, got %#v", got)
	}
}

type fallbackTranslationPageServiceStub struct {
	localeAwareContentServiceStub
	source  admin.CMSPage
	created admin.CMSPage
}

func (s *fallbackTranslationPageServiceStub) Page(_ context.Context, id, locale string) (*admin.CMSPage, error) {
	if s.created.ID != "" && id == s.created.ID {
		created := s.created
		return &created, nil
	}
	if id != s.source.ID {
		return nil, admin.ErrNotFound
	}
	source := s.source
	return &source, nil
}

func (s *fallbackTranslationPageServiceStub) Pages(_ context.Context, locale string) ([]admin.CMSPage, error) {
	if s.created.ID == "" {
		return nil, nil
	}
	if strings.TrimSpace(locale) != "" && !strings.EqualFold(strings.TrimSpace(locale), strings.TrimSpace(s.created.Locale)) {
		return nil, nil
	}
	return []admin.CMSPage{s.created}, nil
}

func (s *fallbackTranslationPageServiceStub) CreatePage(_ context.Context, page admin.CMSPage) (*admin.CMSPage, error) {
	created := page
	if created.ID == "" {
		created.ID = "page-translated-1"
	}
	s.created = created
	return &created, nil
}

func TestCMSPageStoreCreateTranslationFallsBackWhenBackendLacksFirstClassCommand(t *testing.T) {
	service := &fallbackTranslationPageServiceStub{
		source: admin.CMSPage{
			ID:       "page-source-1",
			Title:    "About",
			Slug:     "about",
			Locale:   "en",
			Status:   "published",
			FamilyID: "page-family-1",
			Data: map[string]any{
				"path":      "/about",
				"route_key": "pages/about",
			},
			Metadata: map[string]any{
				"path":      "/about",
				"route_key": "pages/about",
			},
			PreviewURL: "/about",
		},
	}

	store := NewCMSPageStore(service, "en")
	record, err := store.CreateTranslation(context.Background(), admin.TranslationCreateInput{
		SourceID: "page-source-1",
		Locale:   "es",
		Path:     "/sobre-nosotros",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if got := service.created.RouteKey; got != "pages/about" {
		t.Fatalf("expected derived route_key, got %#v", got)
	}
	if got := service.created.Metadata["path"]; got != "/sobre-nosotros" {
		t.Fatalf("expected translated metadata path, got %#v", got)
	}
	if got := service.created.PreviewURL; got != "/sobre-nosotros" {
		t.Fatalf("expected translated preview url, got %#v", got)
	}
	if got := record["path"]; got != "/sobre-nosotros" {
		t.Fatalf("expected returned record path, got %#v", got)
	}
}
