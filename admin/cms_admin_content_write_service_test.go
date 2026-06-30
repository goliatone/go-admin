package admin

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"

	goerrors "github.com/goliatone/go-errors"
)

type recordingAdminContentWriteService struct {
	createFn                func(context.Context, map[string]any) (map[string]any, error)
	updateFn                func(context.Context, string, map[string]any) (map[string]any, error)
	deleteFn                func(context.Context, string) error
	createTranslationFn     func(context.Context, TranslationCreateInput) (map[string]any, error)
	createForContentTypeFn  func(context.Context, CMSContentType, map[string]any) (map[string]any, error)
	updateForContentTypeFn  func(context.Context, CMSContentType, string, map[string]any) (map[string]any, error)
	deleteForContentTypeFn  func(context.Context, CMSContentType, string) error
	createTranslationTypeFn func(context.Context, CMSContentType, TranslationCreateInput) (map[string]any, error)
}

func (s recordingAdminContentWriteService) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if s.createFn == nil {
		return nil, ErrNotFound
	}
	return s.createFn(ctx, record)
}

func (s recordingAdminContentWriteService) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if s.updateFn == nil {
		return nil, ErrNotFound
	}
	return s.updateFn(ctx, id, record)
}

func (s recordingAdminContentWriteService) Delete(ctx context.Context, id string) error {
	if s.deleteFn == nil {
		return ErrNotFound
	}
	return s.deleteFn(ctx, id)
}

func (s recordingAdminContentWriteService) CreateTranslation(ctx context.Context, input TranslationCreateInput) (map[string]any, error) {
	if s.createTranslationFn == nil {
		return nil, ErrNotFound
	}
	return s.createTranslationFn(ctx, input)
}

func (s recordingAdminContentWriteService) CreateForContentType(ctx context.Context, contentType CMSContentType, record map[string]any) (map[string]any, error) {
	if s.createForContentTypeFn == nil {
		return nil, ErrNotFound
	}
	return s.createForContentTypeFn(ctx, contentType, record)
}

func (s recordingAdminContentWriteService) UpdateForContentType(ctx context.Context, contentType CMSContentType, id string, record map[string]any) (map[string]any, error) {
	if s.updateForContentTypeFn == nil {
		return nil, ErrNotFound
	}
	return s.updateForContentTypeFn(ctx, contentType, id, record)
}

func (s recordingAdminContentWriteService) DeleteForContentType(ctx context.Context, contentType CMSContentType, id string) error {
	if s.deleteForContentTypeFn == nil {
		return ErrNotFound
	}
	return s.deleteForContentTypeFn(ctx, contentType, id)
}

func (s recordingAdminContentWriteService) CreateTranslationForContentType(ctx context.Context, contentType CMSContentType, input TranslationCreateInput) (map[string]any, error) {
	if s.createTranslationTypeFn == nil {
		return nil, ErrNotFound
	}
	return s.createTranslationTypeFn(ctx, contentType, input)
}

func TestAdminContentWriteServiceCreateUpdateAndTranslationPreserveRepositoryContract(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	translationStub := &translationCreatorContentServiceStub{CMSContentService: content}
	service := newAdminContentWriteService(translationStub)

	created, err := service.Create(ctx, map[string]any{
		"title":             "Home",
		"slug":              "home",
		"locale":            "en",
		"status":            "draft",
		"content_type":      "page",
		"content_type_slug": "page",
		"path":              "/home",
		"_navigation": map[string]any{
			"site.main": "show",
		},
		"effective_menu_locations": []string{"site.main"},
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	if got := toString(created["content_type"]); got != "page" {
		t.Fatalf("expected page content_type, got %q", got)
	}
	if got := extractMap(created["effective_navigation_visibility"])["site.main"]; !toBool(got) {
		t.Fatalf("expected navigation visibility projection, got %#v", created["effective_navigation_visibility"])
	}
	translationStub.result = &CMSContent{
		ID:              toString(created["id"]),
		Title:           "Home Updated",
		Slug:            "home",
		Locale:          "es",
		Status:          "draft",
		ContentType:     "page",
		ContentTypeSlug: "page",
	}

	updated, err := service.Update(ctx, toString(created["id"]), map[string]any{
		"title": "Home Updated",
		"path":  "/home-updated",
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if got := toString(updated["title"]); got != "Home Updated" {
		t.Fatalf("expected updated title, got %q", got)
	}
	if got := toString(updated["path"]); got != "/home-updated" {
		t.Fatalf("expected updated path, got %q", got)
	}

	translated, err := service.CreateTranslation(ctx, TranslationCreateInput{
		SourceID: toString(created["id"]),
		Locale:   "es",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if got := toString(translated["locale"]); got != "es" {
		t.Fatalf("expected es locale, got %q", got)
	}
}

func TestAdminContentWriteServiceCreateAppliesNestedNavigationOverrides(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	if _, err := content.CreateContentType(ctx, CMSContentType{
		Name:   "Page",
		Slug:   "page",
		Schema: minimalContentTypeSchema(),
		Capabilities: map[string]any{
			"navigation": map[string]any{
				"enabled":                 true,
				"eligible_locations":      []string{"site.main", "site.footer"},
				"default_locations":       []string{"site.main"},
				"default_visible":         true,
				"allow_instance_override": true,
			},
		},
	}); err != nil {
		t.Fatalf("create content type: %v", err)
	}
	service := newAdminContentWriteService(content)

	created, err := service.Create(ctx, map[string]any{
		"title":             "Home",
		"slug":              "home",
		"locale":            "en",
		"status":            "draft",
		"content_type":      "page",
		"content_type_slug": "page",
		"data": map[string]any{
			"path": "/home",
			"_navigation": map[string]any{
				"site.main":   "hide",
				"site.footer": "show",
			},
		},
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	nav := extractMap(created["_navigation"])
	if got := toString(nav["site.main"]); got != NavigationOverrideHide {
		t.Fatalf("expected nested site.main override to persist, got %q", got)
	}
	if got := toString(nav["site.footer"]); got != NavigationOverrideShow {
		t.Fatalf("expected nested site.footer override to persist, got %q", got)
	}
	visibility := extractMap(created["effective_navigation_visibility"])
	if toBool(visibility["site.main"]) || !toBool(visibility["site.footer"]) {
		t.Fatalf("effective visibility mismatch: %+v", visibility)
	}
	if got, want := toStringSlice(created["effective_menu_locations"]), []string{"site.footer"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("effective locations mismatch: got %+v want %+v", got, want)
	}
	data := extractMap(created["data"])
	dataNav := extractMap(data["_navigation"])
	if got := toString(dataNav["site.main"]); got != NavigationOverrideHide {
		t.Fatalf("expected data._navigation to persist normalized override, got %+v", dataNav)
	}
}

func TestAdminContentReadWriteServicesWithEntryNavigationOptionsApplyGlobalPolicy(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	if _, err := content.CreateContentType(ctx, CMSContentType{
		Name:   "Page",
		Slug:   "page",
		Schema: minimalContentTypeSchema(),
	}); err != nil {
		t.Fatalf("create content type: %v", err)
	}
	enabled := true
	options := EntryNavigationOptions{
		Enabled:               &enabled,
		EligibleLocations:     []string{"site.main", "site.footer"},
		DefaultLocations:      []string{"site.footer"},
		AllowInstanceOverride: &enabled,
	}
	write := newAdminContentWriteServiceWithEntryNavigationOptions(content, options)

	created, err := write.Create(ctx, map[string]any{
		"title":             "Home",
		"slug":              "home",
		"locale":            "en",
		"status":            "draft",
		"content_type":      "page",
		"content_type_slug": "page",
		"_navigation": map[string]any{
			"site.main":   "show",
			"site.footer": "hide",
		},
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	if got, want := toStringSlice(created["effective_menu_locations"]), []string{"site.main"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("effective locations mismatch after write: got %+v want %+v", got, want)
	}

	read := newAdminContentReadServiceWithEntryNavigationOptions(content, options)
	record, err := read.Get(ctx, toString(created["id"]))
	if err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if got, want := toStringSlice(record["effective_menu_locations"]), []string{"site.main"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("effective locations mismatch after read: got %+v want %+v", got, want)
	}
	visibility := extractMap(record["effective_navigation_visibility"])
	if !toBool(visibility["site.main"]) || toBool(visibility["site.footer"]) {
		t.Fatalf("expected global option policy visibility after read, got %+v", visibility)
	}
}

func TestAdminContentReadWriteServicesMetadataOnlyEntryNavigationOptionsDoNotProjectPolicy(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	if _, err := content.CreateContentType(ctx, CMSContentType{
		Name:   "Misc",
		Slug:   "misc",
		Schema: minimalContentTypeSchema(),
	}); err != nil {
		t.Fatalf("create content type: %v", err)
	}
	options := EntryNavigationOptions{
		ViewPermission:     "entry:view",
		EditPermission:     "entry:edit",
		PermissionResource: "content_navigation",
		ActivityAction:     "content.navigation.custom",
	}
	write := newAdminContentWriteServiceWithEntryNavigationOptions(content, options)
	created, err := write.Create(ctx, map[string]any{
		"title":             "Loose Contract",
		"slug":              "loose-contract",
		"locale":            "en",
		"status":            "draft",
		"content_type":      "misc",
		"content_type_slug": "misc",
		"_navigation": map[string]any{
			"legacy.location": "show",
		},
		"effective_menu_locations": []string{"legacy.location"},
	})
	if err != nil {
		t.Fatalf("metadata-only options must not reject navigation payloads: %v", err)
	}
	if got := toString(extractMap(created["_navigation"])["legacy.location"]); got != NavigationOverrideShow {
		t.Fatalf("expected legacy navigation payload to survive write, got %+v", created["_navigation"])
	}

	read := newAdminContentReadServiceWithEntryNavigationOptions(content, options)
	record, err := read.Get(ctx, toString(created["id"]))
	if err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if got := toString(extractMap(record["_navigation"])["legacy.location"]); got != NavigationOverrideShow {
		t.Fatalf("metadata-only options must not strip read navigation payload, got %+v", record["_navigation"])
	}
	if got, want := toStringSlice(record["effective_menu_locations"]), []string{"legacy.location"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("metadata-only options must not strip read effective locations: got %+v want %+v", got, want)
	}
}

func TestAdminContentWriteServiceUpdateAppliesNestedNavigationOverrides(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	if _, err := content.CreateContentType(ctx, CMSContentType{
		Name:   "Page",
		Slug:   "page",
		Schema: minimalContentTypeSchema(),
		Capabilities: map[string]any{
			"navigation": map[string]any{
				"enabled":                 true,
				"eligible_locations":      []string{"site.main", "site.footer"},
				"default_locations":       []string{"site.main"},
				"default_visible":         true,
				"allow_instance_override": true,
			},
		},
	}); err != nil {
		t.Fatalf("create content type: %v", err)
	}
	service := newAdminContentWriteService(content)
	created, err := service.Create(ctx, map[string]any{
		"title":             "Home",
		"slug":              "home",
		"locale":            "en",
		"status":            "draft",
		"content_type":      "page",
		"content_type_slug": "page",
		"data": map[string]any{
			"path": "/home",
		},
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	updated, err := service.Update(ctx, toString(created["id"]), map[string]any{
		"data": map[string]any{
			"_navigation": map[string]any{
				"site.main":   "hide",
				"site.footer": "show",
			},
		},
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}

	nav := extractMap(updated["_navigation"])
	if got := toString(nav["site.main"]); got != NavigationOverrideHide {
		t.Fatalf("expected nested site.main override to persist, got %q", got)
	}
	if got := toString(nav["site.footer"]); got != NavigationOverrideShow {
		t.Fatalf("expected nested site.footer override to persist, got %q", got)
	}
	visibility := extractMap(updated["effective_navigation_visibility"])
	if toBool(visibility["site.main"]) || !toBool(visibility["site.footer"]) {
		t.Fatalf("effective visibility mismatch: %+v", visibility)
	}
	if got, want := toStringSlice(updated["effective_menu_locations"]), []string{"site.footer"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("effective locations mismatch: got %+v want %+v", got, want)
	}
}

func TestAdminContentWriteServiceUpdateRequiresCreateTranslationIntent(t *testing.T) {
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
	service := newAdminContentWriteService(content)

	_, err = service.Update(WithLocale(context.Background(), "es"), created.ID, map[string]any{
		"title": "Casa",
	})
	if err == nil {
		t.Fatalf("expected translation create required error")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) {
		t.Fatalf("expected typed validation error, got %T", err)
	}
	if val, ok := typedErr.Metadata["translation_missing"].(bool); !ok || !val {
		t.Fatalf("expected translation_missing metadata, got %+v", typedErr.Metadata)
	}
}

func TestAdminContentWriteServiceUniquenessChecksUseContentTypeScope(t *testing.T) {
	content := &scopedReaderContentServiceStub{
		siteAPIContentServiceStub: siteAPIContentServiceStub{byLocale: map[string][]CMSContent{
			"en": {
				{ID: "article-1", Slug: "article", Locale: "en", ContentType: "article", ContentTypeSlug: "article", Data: map[string]any{"path": "/shared"}},
				{ID: "event-1", Slug: "event", Locale: "en", ContentType: "event", ContentTypeSlug: "event", Data: map[string]any{"path": "/shared"}},
			},
		}},
		contentTypes: []CMSContentType{
			{ID: "ct-article", Slug: "article"},
			{ID: "ct-event", Slug: "event"},
		},
	}
	service := newAdminContentWriteService(content, content)

	err := service.ensureUniqueLocalizedPath(context.Background(), CMSContent{
		ID:              "article-2",
		Locale:          "en",
		ContentType:     "article",
		ContentTypeSlug: "article",
		Data:            map[string]any{"path": "/shared"},
	}, "")
	if !errors.Is(err, ErrPathConflict) {
		t.Fatalf("expected same type duplicate path conflict, got %v", err)
	}
	if calls := content.unscopedCalls(); len(calls) != 0 {
		t.Fatalf("expected uniqueness check to avoid unscoped content reads, got %+v", calls)
	}
	if got := content.countScopedCalls("contents_with_options", "ct-article"); got != 1 {
		t.Fatalf("expected one article-scoped uniqueness read, got calls=%+v", content.calls)
	}

	content.calls = nil
	err = service.ensureUniqueLocalizedPath(context.Background(), CMSContent{
		ID:              "article-3",
		Locale:          "en",
		ContentType:     "article",
		ContentTypeSlug: "article",
		Data:            map[string]any{"path": "/event-only"},
	}, "")
	if err != nil {
		t.Fatalf("expected unrelated type path to be ignored, got %v", err)
	}
	if calls := content.unscopedCalls(); len(calls) != 0 {
		t.Fatalf("expected unrelated path check to avoid unscoped reads, got %+v", calls)
	}
}

func TestAdminContentWriteServiceCreateTranslationBackfillsRouteKeyAndRejectsLocalizedPathConflict(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	translationStub := &translationCreatorContentServiceStub{CMSContentService: content}
	service := newAdminContentWriteService(translationStub)

	source, err := content.CreateContent(ctx, CMSContent{
		Title:           "About",
		Slug:            "about",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		RouteKey:        "pages/about",
		Data:            map[string]any{"path": "/about"},
	})
	if err != nil {
		t.Fatalf("create source failed: %v", err)
	}
	if _, createErr := content.CreateContent(ctx, CMSContent{
		Title:           "Existing French",
		Slug:            "a-propos",
		Locale:          "fr",
		Status:          "draft",
		ContentType:     "page",
		ContentTypeSlug: "page",
		RouteKey:        "pages/existing",
		Data:            map[string]any{"path": "/a-propos"},
	}); createErr != nil {
		t.Fatalf("seed existing locale failed: %v", createErr)
	}
	translationStub.result = &CMSContent{
		ID:              "translated-1",
		Title:           "A propos nous",
		Slug:            "about",
		Locale:          "fr",
		Status:          "draft",
		ContentType:     "page",
		ContentTypeSlug: "page",
		RouteKey:        "pages/about",
		Data:            map[string]any{"path": "/a-propos-nous"},
	}

	_, err = service.CreateTranslation(ctx, TranslationCreateInput{
		SourceID: source.ID,
		Locale:   "fr",
		Path:     "/a-propos",
	})
	if !errors.Is(err, ErrPathConflict) {
		t.Fatalf("expected path conflict for duplicate localized path, got %v", err)
	}

	translated, err := service.CreateTranslation(ctx, TranslationCreateInput{
		SourceID: source.ID,
		Locale:   "fr",
		Path:     "/a-propos-nous",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if got := toString(translated["route_key"]); got != "pages/about" {
		t.Fatalf("expected route_key backfilled from source, got %q", got)
	}
	if got := toString(translated["path"]); got != "/a-propos-nous" {
		t.Fatalf("expected localized path preserved, got %q", got)
	}
}

func TestAdminContentWriteServiceCreateTranslationWithInMemoryContentServiceClonesLocaleVariant(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	service := newAdminContentWriteService(content)

	source, err := content.CreateContent(ctx, CMSContent{
		ID:              "home-en",
		Title:           "Home",
		Slug:            "home",
		Locale:          "en",
		FamilyID:        "family:home",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		RouteKey:        "pages/home",
		Data:            map[string]any{"path": "/"},
		Metadata:        map[string]any{"path": "/"},
	})
	if err != nil {
		t.Fatalf("create source failed: %v", err)
	}

	translated, err := service.CreateTranslation(ctx, TranslationCreateInput{
		SourceID: source.ID,
		Locale:   "bo",
		Path:     "/bo",
		RouteKey: "pages/home",
		Metadata: map[string]any{
			"translation_create_locale": map[string]any{"idempotency_key": "home-bo"},
		},
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if got := toString(translated["locale"]); got != "bo" {
		t.Fatalf("expected locale bo, got %q", got)
	}
	if got := toString(translated["family_id"]); got != "family:home" {
		t.Fatalf("expected family_id family:home, got %q", got)
	}
	if got := toString(translated["path"]); got != "/bo" {
		t.Fatalf("expected localized path /bo, got %q", got)
	}
	if got := toString(translated["route_key"]); got != "pages/home" {
		t.Fatalf("expected route_key pages/home, got %q", got)
	}
	metadata := extractMap(translated["metadata"])
	if replay := extractMap(metadata["translation_create_locale"]); toString(replay["idempotency_key"]) != "home-bo" {
		t.Fatalf("expected translation metadata to survive clone, got %+v", metadata)
	}

	sourceAfter, err := content.Content(ctx, source.ID, "en")
	if err != nil || sourceAfter == nil {
		t.Fatalf("fetch source after create translation: content=%+v err=%v", sourceAfter, err)
	}
	if got := strings.Join(sourceAfter.AvailableLocales, ","); got != "en,bo" {
		t.Fatalf("expected source available locales en,bo, got %q", got)
	}
}

func TestCMSContentRepositoryDelegatesWritePathToAdminContentWriteService(t *testing.T) {
	ctx := context.Background()
	repo := &CMSContentRepository{
		write: recordingAdminContentWriteService{
			createFn: func(callCtx context.Context, record map[string]any) (map[string]any, error) {
				if callCtx != ctx {
					t.Fatalf("expected context passthrough")
				}
				if got := toString(record["title"]); got != "Home" {
					t.Fatalf("expected create payload passthrough, got %#v", record)
				}
				return map[string]any{"id": "content-1"}, nil
			},
			updateFn: func(callCtx context.Context, id string, record map[string]any) (map[string]any, error) {
				if callCtx != ctx || id != "content-1" {
					t.Fatalf("expected update passthrough, got ctx=%v id=%q", callCtx, id)
				}
				return map[string]any{"id": id, "title": record["title"]}, nil
			},
			deleteFn: func(callCtx context.Context, id string) error {
				if callCtx != ctx || id != "content-1" {
					t.Fatalf("expected delete passthrough, got ctx=%v id=%q", callCtx, id)
				}
				return nil
			},
			createTranslationFn: func(callCtx context.Context, input TranslationCreateInput) (map[string]any, error) {
				if callCtx != ctx || input.SourceID != "content-1" || input.Locale != "es" {
					t.Fatalf("expected translation passthrough, got %+v", input)
				}
				return map[string]any{"id": "content-1", "locale": "es"}, nil
			},
		},
	}

	created, err := repo.Create(ctx, map[string]any{"title": "Home"})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	if created["id"] != "content-1" {
		t.Fatalf("expected delegated create result, got %#v", created)
	}

	updated, err := repo.Update(ctx, "content-1", map[string]any{"title": "Home Updated"})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated["id"] != "content-1" {
		t.Fatalf("expected delegated update result, got %#v", updated)
	}

	if deleteErr := repo.Delete(ctx, "content-1"); deleteErr != nil {
		t.Fatalf("delete failed: %v", deleteErr)
	}

	translated, err := repo.CreateTranslation(ctx, TranslationCreateInput{SourceID: "content-1", Locale: "es"})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if translated["locale"] != "es" {
		t.Fatalf("expected delegated translation result, got %#v", translated)
	}
}

func TestCMSContentTypeEntryRepositoryDelegatesWritePathToAdminContentWriteService(t *testing.T) {
	ctx := context.Background()
	contentType := CMSContentType{Slug: "page"}
	repo := &CMSContentTypeEntryRepository{
		contentType: contentType,
		write: recordingAdminContentWriteService{
			createForContentTypeFn: func(callCtx context.Context, gotType CMSContentType, record map[string]any) (map[string]any, error) {
				if callCtx != ctx || gotType.Slug != "page" {
					t.Fatalf("expected create-for-type passthrough, got ctx=%v type=%#v", callCtx, gotType)
				}
				return map[string]any{"id": "page-1"}, nil
			},
			updateForContentTypeFn: func(callCtx context.Context, gotType CMSContentType, id string, record map[string]any) (map[string]any, error) {
				if callCtx != ctx || gotType.Slug != "page" || id != "page-1" {
					t.Fatalf("expected update-for-type passthrough, got ctx=%v type=%#v id=%q", callCtx, gotType, id)
				}
				return map[string]any{"id": id}, nil
			},
			deleteForContentTypeFn: func(callCtx context.Context, gotType CMSContentType, id string) error {
				if callCtx != ctx || gotType.Slug != "page" || id != "page-1" {
					t.Fatalf("expected delete-for-type passthrough, got ctx=%v type=%#v id=%q", callCtx, gotType, id)
				}
				return nil
			},
			createTranslationTypeFn: func(callCtx context.Context, gotType CMSContentType, input TranslationCreateInput) (map[string]any, error) {
				if callCtx != ctx || gotType.Slug != "page" || input.SourceID != "page-1" || input.Locale != "es" {
					t.Fatalf("expected translation-for-type passthrough, got type=%#v input=%+v", gotType, input)
				}
				return map[string]any{"id": "page-1", "locale": "es"}, nil
			},
		},
	}

	created, err := repo.Create(ctx, map[string]any{"title": "Home"})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	if created["id"] != "page-1" {
		t.Fatalf("expected delegated create result, got %#v", created)
	}

	updated, err := repo.Update(ctx, "page-1", map[string]any{"title": "Home Updated"})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated["id"] != "page-1" {
		t.Fatalf("expected delegated update result, got %#v", updated)
	}

	if deleteErr := repo.Delete(ctx, "page-1"); deleteErr != nil {
		t.Fatalf("delete failed: %v", deleteErr)
	}

	translated, err := repo.CreateTranslation(ctx, TranslationCreateInput{SourceID: "page-1", Locale: "es"})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if translated["locale"] != "es" {
		t.Fatalf("expected delegated translation result, got %#v", translated)
	}
}

func TestAdminContentWriteServiceReturnsNotFoundWithoutContentService(t *testing.T) {
	service := newAdminContentWriteService(nil)

	if _, err := service.Create(context.Background(), nil); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from Create, got %v", err)
	}
	if _, err := service.Update(context.Background(), "missing", nil); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from Update, got %v", err)
	}
	if err := service.Delete(context.Background(), "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from Delete, got %v", err)
	}
	if _, err := service.CreateTranslation(context.Background(), TranslationCreateInput{}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from CreateTranslation, got %v", err)
	}
	if _, err := service.CreateForContentType(context.Background(), CMSContentType{Slug: "page"}, nil); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from CreateForContentType, got %v", err)
	}
	if _, err := service.UpdateForContentType(context.Background(), CMSContentType{Slug: "page"}, "missing", nil); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from UpdateForContentType, got %v", err)
	}
	if err := service.DeleteForContentType(context.Background(), CMSContentType{Slug: "page"}, "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from DeleteForContentType, got %v", err)
	}
	if _, err := service.CreateTranslationForContentType(context.Background(), CMSContentType{Slug: "page"}, TranslationCreateInput{}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from CreateTranslationForContentType, got %v", err)
	}
}
