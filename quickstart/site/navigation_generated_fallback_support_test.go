package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestGeneratedFallbackGroupsSkipsIneligibleAndPreviewDenied(t *testing.T) {
	records := []admin.CMSContent{
		{
			ID:              "landing-preview",
			FamilyID:        "landing",
			Slug:            "landing",
			Status:          "draft",
			ContentType:     "landing",
			ContentTypeSlug: "landing",
		},
		{
			ID:              "page-live",
			FamilyID:        "page-family",
			Slug:            "page",
			Status:          "published",
			ContentType:     "page",
			ContentTypeSlug: "page",
		},
		{
			ID:              "article-live",
			FamilyID:        "article-family",
			Slug:            "article",
			Status:          "published",
			ContentType:     "article",
			ContentTypeSlug: "article",
		},
	}

	grouped := generatedFallbackGroups(records, map[string]bool{"landing": true}, RequestState{})

	if len(grouped) != 1 {
		t.Fatalf("expected only one eligible visible group, got %+v", grouped)
	}
	if got := grouped["page-family"]; len(got) != 1 || got[0].ID != "page-live" {
		t.Fatalf("expected published page group to survive, got %+v", grouped)
	}
}

func TestGeneratedFallbackItemsBuildsDeterministicVisibleItems(t *testing.T) {
	items := generatedFallbackItems("main-menu", "site.main", map[string][]admin.CMSContent{
		"about": {
			{
				ID:              "about-es",
				FamilyID:        "about-family",
				Title:           "Sobre",
				Slug:            "about",
				Locale:          "es",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				Data: map[string]any{
					"path": "/sobre",
					"_navigation": map[string]any{
						"site.main": "show",
					},
				},
			},
			{
				ID:              "about-en",
				FamilyID:        "about-family",
				Title:           "About",
				Slug:            "about",
				Locale:          "en",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				Data:            map[string]any{"path": "/about"},
			},
		},
		"hidden": {
			{
				ID:              "hidden-en",
				FamilyID:        "hidden-family",
				Title:           "Hidden",
				Slug:            "hidden",
				Locale:          "en",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				Data: map[string]any{
					"path": "/hidden",
					"effective_navigation_visibility": map[string]any{
						"site.main": false,
					},
				},
			},
		},
	}, RequestState{
		Locale:              "es",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en", "es"},
		AllowLocaleFallback: true,
	})

	if len(items) != 1 {
		t.Fatalf("expected exactly one visible generated item, got %+v", items)
	}
	if items[0].Label != "Sobre" {
		t.Fatalf("expected requested locale label, got %+v", items[0])
	}
	if got := anyString(items[0].Target["url"]); got != "/sobre" {
		t.Fatalf("expected requested locale href, got %+v", items[0].Target)
	}
	if items[0].ID != "main_menu.sobre_1" {
		t.Fatalf("expected deterministic generated item id, got %+v", items[0])
	}
}
