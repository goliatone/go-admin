package admin

import (
	"testing"
)

func TestPageFromContentInjectsStructuralMetadataAndFallbackPath(t *testing.T) {
	page := pageFromContent(CMSContent{
		ID:            "page-1",
		Title:         "Home",
		Slug:          "home",
		Status:        "draft",
		Locale:        "en",
		SchemaVersion: "page/v1",
		Metadata: map[string]any{
			"path":        "/home",
			"route_key":   "pages/home",
			"parent_id":   "parent-1",
			"template_id": "tmpl-1",
		},
		Data: map[string]any{
			"meta_title":       "Meta Title",
			"meta_description": "Meta Description",
			"body":             "hello",
		},
	})

	if page.TemplateID != "tmpl-1" || page.ParentID != "parent-1" {
		t.Fatalf("expected structural metadata injected, got %+v", page)
	}
	if page.PreviewURL != "/home" {
		t.Fatalf("expected preview url /home, got %q", page.PreviewURL)
	}
	if got := toString(page.Data["path"]); got != "/home" {
		t.Fatalf("expected path copied into data, got %q", got)
	}
	if page.RouteKey != "pages/home" {
		t.Fatalf("expected route key pages/home, got %q", page.RouteKey)
	}
	if got := toString(page.Data["route_key"]); got != "pages/home" {
		t.Fatalf("expected route_key copied into data, got %q", got)
	}
	if page.SEO["title"] != "Meta Title" || page.SEO["description"] != "Meta Description" {
		t.Fatalf("expected SEO fields derived from data, got %+v", page.SEO)
	}
}

func TestPageFromContentFallsBackToSlugPreviewPath(t *testing.T) {
	page := pageFromContent(CMSContent{
		ID:     "page-2",
		Title:  "About",
		Slug:   "about",
		Status: "draft",
		Locale: "en",
		Data:   map[string]any{},
	})

	if page.PreviewURL != "/about" {
		t.Fatalf("expected slug-based preview path, got %q", page.PreviewURL)
	}
}
