package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestNavigationPageKindByContentTypeIncludesCustomPageKinds(t *testing.T) {
	runtime := &navigationRuntime{contentType: navigationContentTypeStub{
		types: []admin.CMSContentType{
			{
				ID:   "page-type",
				Name: "Page",
				Slug: "page",
				Capabilities: map[string]any{
					"delivery": map[string]any{
						"enabled": true,
						"kind":    "page",
					},
				},
			},
			{
				ID:   "landing-type",
				Name: "Landing",
				Slug: "landing",
				Capabilities: map[string]any{
					"delivery": map[string]any{
						"enabled": true,
						"kind":    "page",
					},
				},
			},
		},
	}}
	pageKinds := runtime.pageKindByContentType(context.Background())

	if !pageKinds["page"] || !pageKinds["landing"] {
		t.Fatalf("expected pageKinds to include page and landing, got %+v", pageKinds)
	}
}

func TestNavigationGeneratedFallbackMenuPrefersRequestedLocaleRecord(t *testing.T) {
	content := admin.NewInMemoryContentService()
	seedDeliveryPageType(t, content)
	_, err := content.CreateContent(context.Background(), admin.CMSContent{
		ID:              "about-en",
		FamilyID:        "about-family",
		Title:           "About",
		Slug:            "about",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/about"},
	})
	if err != nil {
		t.Fatalf("create en record: %v", err)
	}
	_, err = content.CreateContent(context.Background(), admin.CMSContent{
		ID:              "about-es",
		FamilyID:        "about-family",
		Title:           "Sobre Nosotros",
		Slug:            "about",
		Locale:          "es",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/sobre-nosotros"},
	})
	if err != nil {
		t.Fatalf("create es record: %v", err)
	}

	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			SupportedLocales: []string{"en", "es"},
			Navigation: SiteNavigationConfig{
				EnableGeneratedFallback: true,
				FallbackMenuCode:        "site_generated",
			},
		}),
		contentSvc:  content,
		contentType: content,
	}

	menu := runtime.generatedFallbackMenu(context.Background(), RequestState{
		Locale:           "es",
		DefaultLocale:    "en",
		SupportedLocales: []string{"en", "es"},
	}, "site.main")
	if menu == nil || len(menu.Items) != 1 {
		t.Fatalf("expected one generated fallback item, got %+v", menu)
	}
	item := menu.Items[0]
	if item.Label != "Sobre Nosotros" {
		t.Fatalf("expected requested-locale label, got %+v", item)
	}
	if got := anyString(item.Target["url"]); got != "/sobre-nosotros" {
		t.Fatalf("expected requested-locale path /sobre-nosotros, got %+v", item.Target)
	}
}

func TestGeneratedRecordVisibleForLocationPrefersEffectiveVisibility(t *testing.T) {
	record := admin.CMSContent{
		Data: map[string]any{
			"_navigation": map[string]any{
				"site.main": "show",
			},
			"effective_navigation_visibility": map[string]any{
				"site.main": false,
			},
		},
	}

	if generatedRecordVisibleForLocation(record, "site.main") {
		t.Fatalf("expected effective visibility to override show and hide record")
	}
}

func TestGeneratedFallbackEligibleUsesConfiguredPageKinds(t *testing.T) {
	record := admin.CMSContent{
		ContentType:     "landing",
		ContentTypeSlug: "landing",
	}

	if !generatedFallbackEligible(record, map[string]bool{"landing": true}) {
		t.Fatalf("expected landing record to be eligible when configured as page kind")
	}
	if generatedFallbackEligible(record, nil) {
		t.Fatalf("expected landing record to be ineligible without configured page kinds")
	}
}

type navigationContentTypeStub struct {
	types []admin.CMSContentType
}

func (s navigationContentTypeStub) ContentTypes(context.Context) ([]admin.CMSContentType, error) {
	return append([]admin.CMSContentType{}, s.types...), nil
}

func (s navigationContentTypeStub) ContentType(context.Context, string) (*admin.CMSContentType, error) {
	return nil, admin.ErrNotFound
}

func (s navigationContentTypeStub) ContentTypeBySlug(context.Context, string) (*admin.CMSContentType, error) {
	return nil, admin.ErrNotFound
}

func (s navigationContentTypeStub) CreateContentType(context.Context, admin.CMSContentType) (*admin.CMSContentType, error) {
	return nil, admin.ErrNotFound
}

func (s navigationContentTypeStub) UpdateContentType(context.Context, admin.CMSContentType) (*admin.CMSContentType, error) {
	return nil, admin.ErrNotFound
}

func (s navigationContentTypeStub) DeleteContentType(context.Context, string) error {
	return admin.ErrNotFound
}
