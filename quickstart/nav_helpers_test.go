package quickstart

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	urlkit "github.com/goliatone/go-urlkit"
)

func TestBuildNavItemsOrdering(t *testing.T) {
	cfg := admin.Config{
		DefaultLocale: "en",
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	ctx := context.Background()

	nav := adm.Navigation()
	nav.UseCMS(false)
	nav.AddFallback(
		admin.NavigationItem{Label: "Second", Position: intPtr(2)},
		admin.NavigationItem{Label: "First", Position: intPtr(1)},
		admin.NavigationItem{
			ID:          "parent",
			Label:       "Parent",
			Collapsible: true,
			Position:    intPtr(5),
			Children: []admin.NavigationItem{
				{Label: "ChildB", Position: intPtr(2)},
				{Label: "ChildA", Position: intPtr(1)},
				{Label: "ChildAuto"},
			},
		},
	)

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

func TestResolveNavTargetUsesURLKitRoute(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/console",
				Routes: map[string]string{
					"dashboard": "/",
					"settings":  "/settings",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("urlkit config: %v", err)
	}

	href, key, _ := resolveNavTarget(map[string]any{
		"name": "admin.settings",
	}, "/admin", manager)

	if href != "/console/settings" {
		t.Fatalf("expected urlkit path, got %q", href)
	}
	if key != "settings" {
		t.Fatalf("expected key settings, got %q", key)
	}
}
