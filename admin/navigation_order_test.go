package admin

import (
	"context"
	"testing"
)

func TestNavigationDeterministicOrdering(t *testing.T) {
	menuSvc := NewInMemoryMenuService()
	ctx := context.Background()
	_, _ = menuSvc.CreateMenu(ctx, "admin.main")

	// Mixed explicit and auto positions on the root.
	_ = menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{Label: "AutoOne"})
	_ = menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{Label: "ExplicitOne", Position: 1})
	_ = menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{Label: "AutoTwo"})

	// Children under a collapsible parent.
	_ = menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{
		ID:          "parent",
		Label:       "Parent",
		Collapsible: true,
	})
	_ = menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{
		Label:    "ChildAuto",
		ParentID: "parent",
	})
	_ = menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{
		Label:    "ChildExplicit",
		Position: 2,
		ParentID: "parent",
	})
	_ = menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{
		Label:    "ChildAutoTwo",
		ParentID: "parent",
	})

	nav := NewNavigation(menuSvc, allowAllNav{})
	items := nav.Resolve(ctx, "")
	if len(items) != 4 {
		t.Fatalf("expected 4 root items, got %d", len(items))
	}
	if items[0].Label != "AutoOne" || items[1].Label != "ExplicitOne" || items[2].Label != "AutoTwo" {
		t.Fatalf("unexpected root order: %+v", labels(items))
	}

	parent := items[3]
	if parent.Label != "Parent" {
		t.Fatalf("expected parent at position 4, got %s", parent.Label)
	}
	if len(parent.Children) != 3 {
		t.Fatalf("expected 3 children, got %d", len(parent.Children))
	}
	expectedChildren := []string{"ChildAuto", "ChildExplicit", "ChildAutoTwo"}
	for i, child := range parent.Children {
		if child.Label != expectedChildren[i] {
			t.Fatalf("child %d expected %s, got %s", i, expectedChildren[i], child.Label)
		}
	}
}

func labels(items []NavigationItem) []string {
	out := make([]string, len(items))
	for i := range items {
		out[i] = items[i].Label
	}
	return out
}
