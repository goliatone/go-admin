package setup

import (
	"context"
	"path"

	"github.com/goliatone/go-admin/admin"
)

const (
	// NavigationMenuCode is the default menu identifier for the admin sidebar.
	NavigationMenuCode = "admin.main"
	// NavigationGroupMain is the parent node for primary navigation entries.
	NavigationGroupMain = "nav.group.main"
	// NavigationGroupOthers groups secondary/utility links.
	NavigationGroupOthers = "nav.group.others"
	// NavigationSectionContent wraps content-related modules (pages, posts, media).
	NavigationSectionContent = "nav.section.content"
	// NavigationSectionShop demonstrates a nested submenu.
	NavigationSectionShop = "nav.section.shop"
)

// SetupNavigation seeds the CMS menu service with grouped, translatable navigation.
func SetupNavigation(ctx context.Context, menuSvc admin.CMSMenuService, basePath, menuCode string) error {
	if menuSvc == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if menuCode == "" {
		menuCode = NavigationMenuCode
	}

	if _, err := menuSvc.CreateMenu(ctx, menuCode); err != nil {
		if _, fetchErr := menuSvc.Menu(ctx, menuCode, ""); fetchErr != nil {
			return err
		}
	}

	groups := []admin.MenuItem{
		{
			ID:            NavigationGroupMain,
			Type:          admin.MenuItemTypeGroup,
			GroupTitle:    "Main Menu",
			GroupTitleKey: "menu.group.main",
			Position:      0,
			Menu:          menuCode,
		},
		{
			ID:            NavigationGroupOthers,
			Type:          admin.MenuItemTypeGroup,
			GroupTitle:    "Others",
			GroupTitleKey: "menu.group.others",
			Position:      90,
			Menu:          menuCode,
		},
	}
	for _, group := range groups {
		_ = menuSvc.AddMenuItem(ctx, menuCode, group)
	}

	content := admin.MenuItem{
		ID:          NavigationSectionContent,
		Type:        admin.MenuItemTypeItem,
		Label:       "Content",
		LabelKey:    "menu.content",
		Icon:        "page",
		Position:    10,
		Collapsible: true,
		Collapsed:   false,
		Target: map[string]any{
			"type": "url",
			"path": path.Join(basePath, "content"),
			"key":  NavigationSectionContent,
		},
		Menu:     menuCode,
		ParentID: NavigationGroupMain,
	}
	_ = menuSvc.AddMenuItem(ctx, menuCode, content)

	shop := admin.MenuItem{
		ID:          NavigationSectionShop,
		Type:        admin.MenuItemTypeItem,
		Label:       "My Shop",
		LabelKey:    "menu.shop",
		Icon:        "shop",
		Position:    40,
		Collapsible: true,
		Collapsed:   false,
		Target: map[string]any{
			"type": "url",
			"path": path.Join(basePath, "shop"),
			"key":  NavigationSectionShop,
		},
		Menu:     menuCode,
		ParentID: NavigationGroupMain,
	}
	_ = menuSvc.AddMenuItem(ctx, menuCode, shop)

	shopChildren := []admin.MenuItem{
		{
			Label:    "Products",
			LabelKey: "menu.shop.products",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "products"),
				"key":  "products",
			},
			Position: 1,
			Menu:     menuCode,
			ParentID: NavigationSectionShop,
		},
		{
			Label:    "Orders",
			LabelKey: "menu.shop.orders",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "orders"),
				"key":  "orders",
			},
			Position: 2,
			Menu:     menuCode,
			ParentID: NavigationSectionShop,
		},
		{
			Label:    "Customers",
			LabelKey: "menu.shop.customers",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "customers"),
				"key":  "customers",
			},
			Position: 3,
			Menu:     menuCode,
			ParentID: NavigationSectionShop,
		},
	}
	for _, child := range shopChildren {
		_ = menuSvc.AddMenuItem(ctx, menuCode, child)
	}

	analytics := admin.MenuItem{
		Label:    "Analytics",
		LabelKey: "menu.analytics",
		Icon:     "stats-report",
		Target: map[string]any{
			"type": "url",
			"path": path.Join(basePath, "analytics"),
			"key":  "analytics",
		},
		Position: 60,
		Menu:     menuCode,
		ParentID: NavigationGroupMain,
	}
	_ = menuSvc.AddMenuItem(ctx, menuCode, analytics)

	separator := admin.MenuItem{
		Type:     admin.MenuItemTypeSeparator,
		Position: 80,
		Menu:     menuCode,
	}
	_ = menuSvc.AddMenuItem(ctx, menuCode, separator)

	secondary := []admin.MenuItem{
		{
			Label:    "Help & Support",
			LabelKey: "menu.help",
			Icon:     "question-mark",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "help"),
				"key":  "help",
			},
			Position: 10,
			Menu:     menuCode,
			ParentID: NavigationGroupOthers,
		},
	}
	for _, item := range secondary {
		_ = menuSvc.AddMenuItem(ctx, menuCode, item)
	}

	return nil
}
