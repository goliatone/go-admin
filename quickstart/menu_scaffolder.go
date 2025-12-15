package quickstart

import (
	"context"

	"github.com/goliatone/go-admin/admin"
)

// DefaultMenuParents returns the baseline parents/groups used by quickstart modules.
func DefaultMenuParents(menuCode string) []admin.MenuItem {
	menuCode = admin.NormalizeMenuSlug(menuCode)
	if menuCode == "" {
		menuCode = admin.NormalizeMenuSlug("admin.main")
	}
	mainGroup := admin.MenuItem{
		ID:            "nav-group-main",
		Type:          admin.MenuItemTypeGroup,
		GroupTitle:    "Main Menu",
		GroupTitleKey: "menu.group.main",
		Position:      0,
		Menu:          menuCode,
	}
	content := admin.MenuItem{
		ID:          mainGroup.ID + ".content",
		Type:        admin.MenuItemTypeItem,
		Label:       "Content",
		LabelKey:    "menu.content",
		Icon:        "page",
		Position:    10,
		Collapsible: true,
		Collapsed:   false,
		Target: map[string]any{
			// go-cms requires a non-empty target for `item` types; the actual href is irrelevant
			// when this node renders as a collapsible parent.
			"type": "url",
			"key":  "content",
			"name": "admin.pages",
		},
		Menu:        menuCode,
		ParentID:    mainGroup.ID,
		Permissions: []string{"admin.pages.view", "admin.posts.view"},
	}
	others := admin.MenuItem{
		ID:            "nav-group-others",
		Type:          admin.MenuItemTypeGroup,
		GroupTitle:    "Others",
		GroupTitleKey: "menu.group.others",
		Position:      90,
		Menu:          menuCode,
	}
	return []admin.MenuItem{mainGroup, content, others}
}

// EnsureDefaultMenuParents scaffolds the default parents so module menus can nest without seeds.
func EnsureDefaultMenuParents(ctx context.Context, menuSvc admin.CMSMenuService, menuCode, locale string) error {
	return admin.EnsureMenuParents(ctx, admin.EnsureMenuParentsOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Parents:  DefaultMenuParents(menuCode),
		Locale:   locale,
	})
}
