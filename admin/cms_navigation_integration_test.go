package admin

import (
	"context"
	"testing"

	cms "github.com/goliatone/go-cms"
)

func TestGoCMSNavigationPathsAndDedupe(t *testing.T) {
	ctx := context.Background()
	cfg := cms.DefaultConfig()
	cfg.Features.Widgets = true

	module, err := cms.New(cfg)
	if err != nil {
		t.Fatalf("cms new: %v", err)
	}

	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
		Features:      Features{CMS: true},
		CMS:           CMSOptions{Container: NewGoCMSContainerAdapter(module)},
	}, Dependencies{})
	if err := adm.Initialize(nilRouter{}); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	menuCode := adm.navMenuCode
	items := []MenuItem{
		{
			ID:         "nav-group-main",
			Type:       MenuItemTypeGroup,
			GroupTitle: "Main",
			Menu:       menuCode,
			Locale:     "en",
			Position:   0,
		},
		{
			ID:       "nav-group-main.content",
			Type:     MenuItemTypeItem,
			Label:    "Content",
			Menu:     menuCode,
			Locale:   "en",
			ParentID: "nav-group-main",
			Position: 1,
			Target: map[string]any{
				"type": "url",
				"path": "/admin/pages",
			},
			Collapsible: true,
		},
		{
			ID:       "nav-group-main.content.pages",
			Label:    "Pages",
			Menu:     menuCode,
			Locale:   "en",
			ParentID: "nav-group-main.content",
			Target: map[string]any{
				"type": "url",
				"path": "/admin/pages",
			},
			Position: 1,
		},
		{
			ID:       "nav-group-main.content.posts",
			Label:    "Posts",
			Menu:     menuCode,
			Locale:   "en",
			ParentID: "nav-group-main.content",
			Target: map[string]any{
				"type": "url",
				"path": "/admin/posts",
			},
			Position: 2,
		},
	}

	if err := adm.addMenuItems(ctx, items); err != nil {
		t.Fatalf("first addMenuItems failed: %v", err)
	}
	if err := adm.addMenuItems(ctx, items); err != nil {
		t.Fatalf("second addMenuItems failed: %v", err)
	}

	menu, err := adm.MenuService().Menu(ctx, menuCode, "en")
	if err != nil {
		t.Fatalf("menu fetch failed: %v", err)
	}
	if len(menu.Items) != 1 {
		t.Fatalf("expected single root group after dedupe, got %d", len(menu.Items))
	}
	root := menu.Items[0]
	if root.ID == "" {
		t.Fatalf("expected root ID")
	}
	if len(root.Children) != 1 {
		t.Fatalf("expected root to have 1 child, got %d", len(root.Children))
	}
	section := root.Children[0]
	if section.Label != "Content" {
		t.Fatalf("expected Content section, got %s", section.Label)
	}
	if len(section.Children) != 2 {
		t.Fatalf("expected 2 children under Content, got %d", len(section.Children))
	}

	nav := adm.Navigation().Resolve(ctx, "en")
	if len(nav) != 1 {
		t.Fatalf("expected navigation to have 1 root, got %d", len(nav))
	}
	if len(nav[0].Children) != 1 || len(nav[0].Children[0].Children) != 2 {
		t.Fatalf("expected grouped navigation tree, got %+v", nav)
	}
}
