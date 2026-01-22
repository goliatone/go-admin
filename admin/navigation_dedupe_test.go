package admin

import (
	"context"
	"testing"
)

func TestAddMenuItemsDedupesMenusByPath(t *testing.T) {
	ctx := context.Background()

	menuSvc := NewInMemoryMenuService()
	container := &stubCMSContainer{menu: menuSvc}

	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(container)

	items := []MenuItem{
		{
			ID:          "nav-group-main.content",
			Label:       "Content",
			ParentID:    "nav-group-main",
			Collapsible: true,
			Menu:        "admin_main",
		},
		{
			ID:       "nav-group-main.content.pages",
			Label:    "Pages",
			ParentID: "nav-group-main.content",
			Target: map[string]any{
				"type": "url",
				"path": "/admin/pages",
			},
			Menu: "admin_main",
		},
	}

	if err := adm.addMenuItems(ctx, items); err != nil {
		t.Fatalf("first addMenuItems failed: %v", err)
	}
	if err := adm.addMenuItems(ctx, items); err != nil {
		t.Fatalf("second addMenuItems failed: %v", err)
	}

	menu, err := menuSvc.Menu(ctx, "admin_main", "en")
	if err != nil {
		t.Fatalf("menu fetch failed: %v", err)
	}
	if got := len(menu.Items); got != 1 {
		t.Fatalf("expected 1 root menu item, got %d", got)
	}
	if menu.Items[0].Label != "Content" {
		t.Fatalf("expected Content root, got %s", menu.Items[0].Label)
	}
	if len(menu.Items[0].Children) != 1 || menu.Items[0].Children[0].Label != "Pages" {
		t.Fatalf("expected Pages child under Content, got %+v", menu.Items[0].Children)
	}

	navItems := adm.Navigation().Resolve(ctx, "en")
	if got := len(navItems); got != 1 {
		t.Fatalf("expected 1 root, got %d", got)
	}
	if navItems[0].Label != "Content" {
		t.Fatalf("expected Content parent, got %s", navItems[0].Label)
	}
	if len(navItems[0].Children) != 1 || navItems[0].Children[0].Label != "Pages" {
		t.Fatalf("expected Pages child under Content, got %+v", navItems[0].Children)
	}
}
