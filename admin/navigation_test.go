package admin

import (
	"context"
	"testing"
)

func TestNavigationResolve(t *testing.T) {
	menuSvc := NewInMemoryMenuService()
	ctx := context.Background()
	_, _ = menuSvc.CreateMenu(ctx, "admin.main")
	_ = menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{
		Label:       "Dashboard",
		Target:      map[string]any{"type": "route", "name": "admin.dashboard"},
		Locale:      "en",
		Permissions: []string{"nav.view"},
	})

	nav := NewNavigation(menuSvc, allowAll{})
	items := nav.Resolve(ctx, "en")
	if len(items) != 1 || items[0].Label != "Dashboard" {
		t.Fatalf("unexpected nav items: %+v", items)
	}
}
