package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestNewContentTypeBuilderModuleDefaultsMenuParentToContentSection(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	module := NewContentTypeBuilderModule(cfg, "")
	builder, ok := module.(*admin.ContentTypeBuilderModule)
	if !ok || builder == nil {
		t.Fatalf("expected *admin.ContentTypeBuilderModule, got %T", module)
	}

	items := builder.MenuItems("en")
	if len(items) == 0 {
		t.Fatalf("expected content type builder menu items")
	}
	for _, item := range items {
		if item.ParentID != NavigationSectionContentID {
			t.Fatalf("expected parent %q, got %q", NavigationSectionContentID, item.ParentID)
		}
	}
}

func TestNewContentTypeBuilderModuleAllowsMenuParentOverride(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	module := NewContentTypeBuilderModule(cfg, "custom.content")
	builder, ok := module.(*admin.ContentTypeBuilderModule)
	if !ok || builder == nil {
		t.Fatalf("expected *admin.ContentTypeBuilderModule, got %T", module)
	}

	items := builder.MenuItems("en")
	if len(items) == 0 {
		t.Fatalf("expected content type builder menu items")
	}
	for _, item := range items {
		if item.ParentID != "custom.content" {
			t.Fatalf("expected parent custom.content, got %q", item.ParentID)
		}
	}
}

