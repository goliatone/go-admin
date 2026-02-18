package quickstart

import (
	"context"

	"github.com/goliatone/go-admin/admin"
)

const (
	// SidebarPlacementPrimary is the placement key used for the main sidebar tree.
	SidebarPlacementPrimary = "sidebar"
	// SidebarPlacementUtility is the placement key used for fixed utility links above the user pod.
	SidebarPlacementUtility = "sidebar_utility"
	// FooterPlacement is the placement key used for footer navigation.
	FooterPlacement = "footer"

	// NavigationGroupMainID is the canonical main navigation group parent ID.
	NavigationGroupMainID = "nav-group-main"
	// NavigationSectionContentID is the canonical content section parent ID.
	NavigationSectionContentID = NavigationGroupMainID + ".content"
	// NavigationGroupToolsID is the canonical Tools group parent ID.
	NavigationGroupToolsID = "nav-group-others"
	// NavigationGroupOthersID is retained as an alias for backward compatibility.
	NavigationGroupOthersID = NavigationGroupToolsID
	// NavigationGroupTranslationsID is the canonical Translations group parent ID.
	NavigationGroupTranslationsID = "nav-group-translations"

	// DefaultSidebarUtilityMenuCode is the default menu code used for sidebar utility links.
	DefaultSidebarUtilityMenuCode = "admin.utility"
)

// DefaultContentParentPermissions returns the canonical permission set used for
// the sidebar "Content" parent node.
func DefaultContentParentPermissions() []string {
	return []string{
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
		ID:            NavigationGroupMainID,
		Type:          admin.MenuItemTypeGroup,
		GroupTitle:    "Navigation",
		GroupTitleKey: "menu.group.main",
		Position:      intPtr(0),
		Menu:          menuCode,
		Collapsible:   true,
	}
	content := admin.MenuItem{
		ID:          NavigationSectionContentID,
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
			"name": "admin.content",
		},
		Menu:        menuCode,
		ParentID:    mainGroup.ID,
		Permissions: append([]string{}, DefaultContentParentPermissions()...),
	}
	tools := admin.MenuItem{
		ID:            NavigationGroupToolsID,
		Type:          admin.MenuItemTypeGroup,
		GroupTitle:    "Tools",
		GroupTitleKey: "menu.group.others",
		Position:      intPtr(90),
		Menu:          menuCode,
		Collapsible:   true,
	}
	translations := admin.MenuItem{
		ID:            NavigationGroupTranslationsID,
		Type:          admin.MenuItemTypeGroup,
		GroupTitle:    "Translations",
		GroupTitleKey: "menu.group.translations",
		Position:      intPtr(80),
		Menu:          menuCode,
		Collapsible:   true,
	}
	return []admin.MenuItem{mainGroup, content, translations, tools}
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
