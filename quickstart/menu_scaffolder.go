package quickstart

import (
	"context"

	"github.com/goliatone/go-admin/admin"
)

// DefaultContentParentPermissions returns the canonical permission set used for
// the sidebar "Content" parent node.
func DefaultContentParentPermissions() []string {
	return []string{
		"admin.pages.view",
		"admin.posts.view",
		"admin.media.view",
		"admin.content_types.view",
		"admin.block_definitions.view",
	}
}

// DefaultMenuParents returns the baseline parents/groups used by quickstart modules.
func DefaultMenuParents(menuCode string) []admin.MenuItem {
	menuCode = admin.NormalizeMenuSlug(menuCode)
	if menuCode == "" {
		menuCode = admin.NormalizeMenuSlug("admin.main")
	}
	mainGroup := admin.MenuItem{
		ID:            "nav-group-main",
		Type:          admin.MenuItemTypeGroup,
		GroupTitle:    "Navigation",
		GroupTitleKey: "menu.group.main",
		Position:      intPtr(0),
		Menu:          menuCode,
	}
	content := admin.MenuItem{
		ID:          mainGroup.ID + ".content",
		Type:        admin.MenuItemTypeItem,
		Label:       "Content",
		LabelKey:    "menu.content",
		Icon:        "page",
		Position:    intPtr(10),
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
		Permissions: append([]string{}, DefaultContentParentPermissions()...),
	}
	others := admin.MenuItem{
		ID:            "nav-group-others",
		Type:          admin.MenuItemTypeGroup,
		GroupTitle:    "Tools",
		GroupTitleKey: "menu.group.others",
		Position:      intPtr(90),
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
