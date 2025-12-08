package setup

import (
	"context"
	"os"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/quickstart"
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
	content := admin.MenuItem{
		ID:          NavigationSectionContent,
		Type:        admin.MenuItemTypeItem,
		Label:       "Content",
		LabelKey:    "menu.content",
		Icon:        "page",
		Position:    10,
		Collapsible: true,
		Collapsed:   false,
		Menu:        menuCode,
		ParentID:    NavigationGroupMain,
		Permissions: []string{"admin.pages.view", "admin.posts.view"},
	}
	contentChildren := []admin.MenuItem{
		{
			ID:       NavigationSectionContent + ".pages",
			Label:    "Pages",
			LabelKey: "menu.content.pages",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "pages"),
				"key":  "pages",
			},
			Position: 1,
			Menu:     menuCode,
			ParentID: NavigationSectionContent,
			// No permissions needed - parent Content already checks them
		},
		{
			ID:       NavigationSectionContent + ".posts",
			Label:    "Posts",
			LabelKey: "menu.content.posts",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "posts"),
				"key":  "posts",
			},
			Position: 2,
			Menu:     menuCode,
			ParentID: NavigationSectionContent,
			// No permissions needed - parent Content already checks them
		},
	}
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
	shopChildren := []admin.MenuItem{
		{
			ID:       NavigationSectionShop + ".products",
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
			ID:       NavigationSectionShop + ".orders",
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
			ID:       NavigationSectionShop + ".customers",
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
	analytics := admin.MenuItem{
		ID:       NavigationGroupMain + ".analytics",
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
	separator := admin.MenuItem{
		ID:       NavigationGroupMain + ".separator",
		Type:     admin.MenuItemTypeSeparator,
		Position: 80,
		Menu:     menuCode,
	}
	secondary := []admin.MenuItem{
		{
			ID:       NavigationGroupOthers + ".help",
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

	items := append([]admin.MenuItem{}, groups...)
	items = append(items, content)
	items = append(items, contentChildren...)
	items = append(items, shop)
	items = append(items, shopChildren...)
	items = append(items, analytics, separator)
	items = append(items, secondary...)

	return quickstart.SeedNavigation(ctx, quickstart.SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Items:    items,
		Locale:   "",
		Reset:    strings.EqualFold(os.Getenv("RESET_NAV_MENU"), "true"),
		Logf:     nil,
	})
}
