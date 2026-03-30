package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

type fixedContentTypeService struct {
	admin.CMSContentTypeService
	items []admin.CMSContentType
}

func (s *fixedContentTypeService) ContentTypes(context.Context) ([]admin.CMSContentType, error) {
	return append([]admin.CMSContentType{}, s.items...), nil
}

func TestDeliveryCapabilitiesSortsAndSkipsDisabledEntries(t *testing.T) {
	runtime := &deliveryRuntime{
		contentTypeSvc: &fixedContentTypeService{
			items: []admin.CMSContentType{
				{
					Name: "post",
					Slug: "post",
					Capabilities: map[string]any{
						"delivery": map[string]any{
							"enabled": true,
							"kind":    "hybrid",
						},
					},
				},
				{
					Name: "page",
					Slug: "page",
					Capabilities: map[string]any{
						"delivery": map[string]any{
							"enabled": false,
							"kind":    "page",
						},
					},
				},
				{
					Name: "news",
					Slug: "news",
					Capabilities: map[string]any{
						"delivery": map[string]any{
							"enabled": true,
							"kind":    "collection",
						},
					},
				},
				{
					Name: "article",
					Slug: "article",
					Capabilities: map[string]any{
						"delivery": map[string]any{
							"enabled": true,
							"kind":    "detail",
						},
					},
				},
			},
		},
	}

	got, err := runtime.capabilities(context.Background())
	if err != nil {
		t.Fatalf("capabilities returned error: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("expected three enabled delivery capabilities, got %+v", got)
	}
	if got[0].TypeSlug != "article" || got[1].TypeSlug != "news" || got[2].TypeSlug != "post" {
		t.Fatalf("expected capabilities sorted by type slug, got %+v", got)
	}
}

func TestDeliveryRecordsByTypeFiltersByCapabilityAndVisibility(t *testing.T) {
	runtime := &deliveryRuntime{}
	capabilities := []deliveryCapability{
		{TypeSlug: "page", Kind: "page"},
		{TypeSlug: "post", Kind: "detail"},
	}
	contents := []admin.CMSContent{
		{
			ID:              "page-published",
			Slug:            "about",
			Locale:          "en",
			Status:          "published",
			ContentType:     "page",
			ContentTypeSlug: "page",
		},
		{
			ID:              "page-draft",
			Slug:            "draft",
			Locale:          "en",
			Status:          "draft",
			ContentType:     "page",
			ContentTypeSlug: "page",
		},
		{
			ID:              "post-published",
			Slug:            "hello",
			Locale:          "en",
			Status:          "published",
			ContentType:     "post",
			ContentTypeSlug: "post",
		},
	}
	state := RequestState{
		Locale:              "en",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en"},
		AllowLocaleFallback: true,
	}

	got := runtime.recordsByType(capabilities, contents, state)

	if len(got["page"]) != 1 || got["page"][0].ID != "page-published" {
		t.Fatalf("expected only visible page record, got %+v", got["page"])
	}
	if len(got["post"]) != 1 || got["post"][0].ID != "post-published" {
		t.Fatalf("expected visible post record, got %+v", got["post"])
	}
}

func TestDeliveryResolveUsesPreviewFallbackAfterRouteMisses(t *testing.T) {
	content := admin.NewInMemoryContentService()
	_, err := content.CreateContentType(context.Background(), admin.CMSContentType{
		ID:   "page-type",
		Name: "page",
		Slug: "page",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "page",
			},
		},
	})
	if err != nil {
		t.Fatalf("create content type page: %v", err)
	}
	_, err = content.CreateContent(context.Background(), admin.CMSContent{
		ID:              "page-draft-home",
		Slug:            "home",
		Title:           "Home Draft",
		Locale:          "en",
		Status:          "draft",
		ContentType:     "page",
		ContentTypeSlug: "page",
	})
	if err != nil {
		t.Fatalf("create content page-draft-home: %v", err)
	}

	runtime := newDeliveryRuntime(
		ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		nil,
		content,
		content,
	)
	if runtime == nil {
		t.Fatalf("expected delivery runtime instance")
	}
	state := RequestState{
		Locale:              "en",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en"},
		AllowLocaleFallback: true,
		PreviewTokenPresent: true,
		PreviewTokenValid:   true,
		IsPreview:           true,
		PreviewEntityType:   "pages",
		PreviewContentID:    "page-draft-home",
	}

	resolution, siteErr := runtime.resolve(context.Background(), state, "/", newSiteContentCache())
	if hasSiteRuntimeError(siteErr) {
		t.Fatalf("resolve / unexpected error %+v", siteErr)
	}
	if resolution == nil || resolution.Record == nil || resolution.Record.ID != "page-draft-home" {
		t.Fatalf("expected preview fallback resolution, got %+v", resolution)
	}
}
