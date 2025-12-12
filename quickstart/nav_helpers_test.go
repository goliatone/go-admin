package quickstart

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestBuildNavItemsOrdering(t *testing.T) {
	cfg := admin.Config{
		DefaultLocale: "en",
		Features: admin.Features{
			CMS: true,
		},
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	ctx := context.Background()

	menu := adm.MenuService()
	_, _ = menu.CreateMenu(ctx, "admin.main")

	// Add out-of-order items; positions and insertion order should stabilize output.
	_ = menu.AddMenuItem(ctx, "admin.main", admin.MenuItem{Label: "Second", Position: 2})
	_ = menu.AddMenuItem(ctx, "admin.main", admin.MenuItem{Label: "First", Position: 1})
	_ = menu.AddMenuItem(ctx, "admin.main", admin.MenuItem{
		ID:          "parent",
		Label:       "Parent",
		Collapsible: true,
		Position:    5,
	})
	// Children with mixed positions and auto order.
	_ = menu.AddMenuItem(ctx, "admin.main", admin.MenuItem{Label: "ChildB", ParentID: "parent", Position: 2})
	_ = menu.AddMenuItem(ctx, "admin.main", admin.MenuItem{Label: "ChildA", ParentID: "parent", Position: 1})
	_ = menu.AddMenuItem(ctx, "admin.main", admin.MenuItem{Label: "ChildAuto", ParentID: "parent"})

	items := BuildNavItems(adm, cfg, ctx, "")
	if len(items) != 3 {
		t.Fatalf("expected 3 root items, got %d", len(items))
	}
	if items[0]["label"] != "First" || items[1]["label"] != "Second" {
		t.Fatalf("unexpected root order: %v, %v", items[0]["label"], items[1]["label"])
	}

	parent := items[2]
	children, ok := parent["children"].([]map[string]any)
	if !ok {
		t.Fatalf("expected children slice, got %T", parent["children"])
	}
	expected := []string{"ChildA", "ChildB", "ChildAuto"}
	if len(children) != len(expected) {
		t.Fatalf("expected %d children, got %d", len(expected), len(children))
	}
	for i, child := range children {
		if child["label"] != expected[i] {
			t.Fatalf("child %d expected %s, got %v", i, expected[i], child["label"])
		}
	}
}

func TestWithNavInjectsThemeAndSession(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	ctx := context.Background()

	view := WithNav(nil, adm, cfg, "", ctx)
	if view["session_user"] == nil {
		t.Fatalf("expected session_user in view context")
	}
	if view["theme"] == nil {
		t.Fatalf("expected theme in view context")
	}
	if view["nav_items"] == nil {
		t.Fatalf("expected nav_items in view context")
	}
}
