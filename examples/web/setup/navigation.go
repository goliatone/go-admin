package setup

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
)

func targetKey(target map[string]any) string {
	if target == nil {
		return ""
	}
	if key, ok := target["key"].(string); ok && strings.TrimSpace(key) != "" {
		return strings.TrimSpace(key)
	}
	if pathVal, ok := target["path"].(string); ok && strings.TrimSpace(pathVal) != "" {
		return strings.TrimSpace(pathVal)
	}
	return ""
}

const (
	// NavigationMenuCode is the default menu identifier for the admin sidebar.
	NavigationMenuCode = "admin_main"
	// SiteNavigationMenuCode is the default menu identifier for the public site navigation.
	SiteNavigationMenuCode = "site_main"
	// NavigationGroupMain is the parent node for primary navigation entries.
	NavigationGroupMain = NavigationMenuCode + ".nav-group-main"
	// NavigationGroupOthers groups secondary/utility links.
	NavigationGroupOthers = NavigationMenuCode + ".nav-group-others"
	// NavigationSectionContent wraps content-related modules (pages, posts, media).
	NavigationSectionContent = NavigationGroupMain + ".content"
	// NavigationSectionDashboard is the top-level dashboard link.
	NavigationSectionDashboard = NavigationGroupMain + ".dashboard"
	// NavigationSectionShop demonstrates a nested submenu.
	NavigationSectionShop = NavigationGroupMain + ".shop"
)

// SetupNavigation seeds the CMS menu service with grouped, translatable navigation.
func SetupNavigation(ctx context.Context, menuSvc admin.CMSMenuService, basePath, menuCode, locale string) error {
	if menuSvc == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if menuCode == "" {
		menuCode = NavigationMenuCode
	}
	if strings.TrimSpace(locale) == "" {
		locale = "en"
	}

	groups := []admin.MenuItem{
		{
			ID:            NavigationGroupMain,
			Type:          admin.MenuItemTypeGroup,
			GroupTitle:    "Main Menu",
			GroupTitleKey: "menu.group.main",
			Position:      prtInt(0),
			Menu:          menuCode,
		},
		{
			ID:            NavigationGroupOthers,
			Type:          admin.MenuItemTypeGroup,
			GroupTitle:    "Others",
			GroupTitleKey: "menu.group.others",
			Position:      prtInt(90),
			Menu:          menuCode,
		},
	}
	content := admin.MenuItem{
		ID:          NavigationSectionContent,
		Type:        admin.MenuItemTypeItem,
		Label:       "Content",
		LabelKey:    "menu.content",
		Icon:        "page",
		Position:    prtInt(10),
		Collapsible: true,
		Collapsed:   false,
		Target: map[string]any{
			"type": "url",
			"path": path.Join(basePath, "pages"),
			"key":  "content",
		},
		Menu:        menuCode,
		ParentID:    NavigationGroupMain,
		Permissions: []string{"admin.pages.view", "admin.posts.view"},
	}
	dashboard := admin.MenuItem{
		ID:       NavigationSectionDashboard,
		Type:     admin.MenuItemTypeItem,
		Label:    "Dashboard",
		LabelKey: "menu.dashboard",
		Icon:     "home",
		Target: map[string]any{
			"type": "url",
			"path": basePath,
			"key":  "dashboard",
		},
		Position: prtInt(5),
		Menu:     menuCode,
		ParentID: NavigationGroupMain,
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
			Position: prtInt(1),
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
			Position: prtInt(2),
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
		Position:    prtInt(40),
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
			Position: prtInt(1),
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
			Position: prtInt(2),
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
			Position: prtInt(3),
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
		Position: prtInt(60),
		Menu:     menuCode,
		ParentID: NavigationGroupMain,
	}
	separator := admin.MenuItem{
		ID:       NavigationGroupMain + ".separator",
		Type:     admin.MenuItemTypeSeparator,
		Position: prtInt(80),
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
			Position: prtInt(10),
			Menu:     menuCode,
			ParentID: NavigationGroupOthers,
		},
	}

	items := append([]admin.MenuItem{}, groups...)
	items = append(items, dashboard)
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
		Locale:   locale,
		Reset:    strings.EqualFold(os.Getenv("RESET_NAV_MENU"), "true"),
		Logf:     nil,
	})
}

func navDebugEnabled() bool {
	return strings.EqualFold(os.Getenv("NAV_DEBUG"), "true") || strings.EqualFold(os.Getenv("NAV_DEBUG_LOG"), "true")
}

func debugLogf(format string, args ...any) {
	if !navDebugEnabled() {
		return
	}
	log.Printf(format, args...)
}

func describeMenuItem(item admin.MenuItem) string {
	tgt := targetKey(item.Target)
	label := strings.TrimSpace(item.Label)
	if label == "" {
		label = strings.TrimSpace(item.LabelKey)
	}
	if label == "" {
		label = "(unnamed)"
	}
	pos := 0
	if item.Position != nil {
		pos = *item.Position
	}
	if tgt != "" {
		return fmt.Sprintf("%s (target=%s id=%s pos=%d)", label, tgt, item.ID, pos)
	}
	return fmt.Sprintf("%s (id=%s pos=%d)", label, item.ID, pos)
}

func flattenMenuIDs(items []admin.MenuItem, out *[]string) {
	for _, item := range items {
		if strings.TrimSpace(item.ID) != "" {
			*out = append(*out, item.ID)
		}
		if len(item.Children) > 0 {
			flattenMenuIDs(item.Children, out)
		}
	}
}

// EnsureDashboardFirst updates persisted menu item positions so Dashboard renders before Content.
// This is useful for persistent CMS backends where module menu items are only inserted once.
func EnsureDashboardFirst(ctx context.Context, menuSvc admin.CMSMenuService, basePath, menuCode, locale string) error {
	if menuSvc == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if menuCode == "" {
		menuCode = NavigationMenuCode
	}
	if strings.TrimSpace(locale) == "" {
		locale = "en"
	}
	basePath = "/" + strings.Trim(strings.TrimSpace(basePath), "/")
	if basePath == "/" {
		basePath = "/admin"
	}

	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil || menu == nil || len(menu.Items) == 0 {
		return err
	}

	var mainGroup *admin.MenuItem
	for idx := range menu.Items {
		item := &menu.Items[idx]
		if !strings.EqualFold(item.Type, admin.MenuItemTypeGroup) {
			continue
		}
		if strings.EqualFold(item.GroupTitleKey, "menu.group.main") ||
			strings.EqualFold(item.LabelKey, "menu.group.main") ||
			strings.EqualFold(item.GroupTitle, "Main Menu") ||
			strings.EqualFold(item.Label, "Main Menu") {
			mainGroup = item
			break
		}
	}
	if mainGroup == nil {
		debugLogf("[nav repair] main group not found for menu=%s locale=%s", menuCode, locale)
		return nil
	}

	var dashboardItem *admin.MenuItem
	var contentItem *admin.MenuItem
	for idx := range mainGroup.Children {
		child := &mainGroup.Children[idx]
		if strings.EqualFold(child.LabelKey, "menu.dashboard") ||
			strings.EqualFold(strings.TrimSpace(child.Label), "dashboard") ||
			strings.EqualFold(targetKey(child.Target), "dashboard") {
			dashboardItem = child
		}
		if strings.EqualFold(child.LabelKey, "menu.content") ||
			strings.EqualFold(strings.TrimSpace(child.Label), "content") ||
			strings.EqualFold(targetKey(child.Target), "content") {
			contentItem = child
		}
	}

	childrenSummary := []string{}
	for _, child := range mainGroup.Children {
		childrenSummary = append(childrenSummary, describeMenuItem(child))
	}
	debugLogf("[nav repair] before menu=%s locale=%s mainGroup=%s children=%v", menuCode, locale, mainGroup.ID, childrenSummary)

	dashboardIndex := -1
	contentIndex := -1
	for idx := range mainGroup.Children {
		if dashboardItem != nil && mainGroup.Children[idx].ID == dashboardItem.ID {
			dashboardIndex = idx
		}
		if contentItem != nil && mainGroup.Children[idx].ID == contentItem.ID {
			contentIndex = idx
		}
	}

	if dashboardItem == nil {
		debugLogf("[nav repair] dashboard item not found in main group (menu=%s locale=%s)", menuCode, locale)
	}
	if contentItem == nil {
		debugLogf("[nav repair] content item not found in main group (menu=%s locale=%s)", menuCode, locale)
	}

	// go-cms treats Position as a 0-based insertion index; in-memory service treats Position
	// as a sort key (1-based, 0 means "keep existing"). Keep the repair backend-aware.
	dashboardPos := 1
	contentPos := 10
	if _, ok := menuSvc.(*admin.GoCMSMenuAdapter); ok {
		dashboardPos = 0
		contentPos = 1
	}

	needsRepair := dashboardItem != nil && dashboardIndex != 0
	if needsRepair || (dashboardItem != nil && contentItem != nil && contentIndex != 1) {
		debugLogf("[nav repair] applying menu repairs (dashboardPos=%d contentPos=%d dashboardIndex=%d contentIndex=%d)", dashboardPos, contentPos, dashboardIndex, contentIndex)
	}

	if dashboardItem != nil && dashboardIndex != 0 {
		updated := *dashboardItem
		updated.Position = &dashboardPos
		if err := menuSvc.UpdateMenuItem(ctx, menuCode, updated); err != nil {
			return err
		}
	}

	if contentItem != nil && dashboardItem != nil && contentIndex != 1 {
		updated := *contentItem
		updated.Position = &contentPos
		updated.Collapsible = true
		if updated.Target == nil {
			updated.Target = map[string]any{}
		}
		if _, ok := updated.Target["type"]; !ok {
			updated.Target["type"] = "url"
		}
		if _, ok := updated.Target["path"]; !ok {
			updated.Target["path"] = path.Join(basePath, "pages")
		}
		if _, ok := updated.Target["key"]; !ok {
			updated.Target["key"] = "content"
		}
		if err := menuSvc.UpdateMenuItem(ctx, menuCode, updated); err != nil {
			return err
		}
	}

	updatedMenu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil || updatedMenu == nil {
		return err
	}

	var updatedMainGroup *admin.MenuItem
	for idx := range updatedMenu.Items {
		item := &updatedMenu.Items[idx]
		if !strings.EqualFold(item.Type, admin.MenuItemTypeGroup) {
			continue
		}
		if strings.EqualFold(item.GroupTitleKey, "menu.group.main") ||
			strings.EqualFold(item.LabelKey, "menu.group.main") ||
			strings.EqualFold(item.GroupTitle, "Main Menu") ||
			strings.EqualFold(item.Label, "Main Menu") {
			updatedMainGroup = item
			break
		}
	}

	if updatedMainGroup != nil {
		afterSummary := []string{}
		for _, child := range updatedMainGroup.Children {
			afterSummary = append(afterSummary, describeMenuItem(child))
		}
		debugLogf("[nav repair] after menu=%s locale=%s mainGroup=%s children=%v", menuCode, locale, updatedMainGroup.ID, afterSummary)
		if navDebugEnabled() && strings.EqualFold(os.Getenv("NAV_DEBUG_LOG"), "true") {
			if raw, err := json.Marshal(updatedMainGroup.Children); err == nil {
				debugLogf("[nav repair] after children json=%s", string(raw))
			}
		}
	}

	// If we're on go-cms and the ordering still didn't change, force a deterministic reorder
	// across the entire menu (go-cms requires providing all item IDs).
	if _, ok := menuSvc.(*admin.GoCMSMenuAdapter); ok && updatedMainGroup != nil && len(updatedMainGroup.Children) > 1 {
		first := strings.ToLower(strings.TrimSpace(updatedMainGroup.Children[0].LabelKey))
		if first == "" {
			first = strings.ToLower(strings.TrimSpace(targetKey(updatedMainGroup.Children[0].Target)))
		}
		if first != "menu.dashboard" && first != "dashboard" {
			debugLogf("[nav repair] fallback to ReorderMenu for go-cms (dashboard still not first)")

			orderedRoot := make([]admin.MenuItem, 0, len(updatedMenu.Items))
			orderedRoot = append(orderedRoot, updatedMenu.Items...)
			for idx := range orderedRoot {
				if !strings.EqualFold(orderedRoot[idx].Type, admin.MenuItemTypeGroup) {
					continue
				}
				if !strings.EqualFold(orderedRoot[idx].ID, updatedMainGroup.ID) {
					continue
				}
				children := append([]admin.MenuItem{}, orderedRoot[idx].Children...)
				reordered := make([]admin.MenuItem, 0, len(children))
				var dash *admin.MenuItem
				var content *admin.MenuItem
				rest := make([]admin.MenuItem, 0, len(children))
				for i := range children {
					child := children[i]
					if strings.EqualFold(child.LabelKey, "menu.dashboard") || strings.EqualFold(targetKey(child.Target), "dashboard") || strings.EqualFold(child.Label, "Dashboard") {
						tmp := child
						dash = &tmp
						continue
					}
					if strings.EqualFold(child.LabelKey, "menu.content") || strings.EqualFold(targetKey(child.Target), "content") || strings.EqualFold(child.Label, "Content") {
						tmp := child
						content = &tmp
						continue
					}
					rest = append(rest, child)
				}
				if dash != nil {
					reordered = append(reordered, *dash)
				}
				if content != nil {
					reordered = append(reordered, *content)
				}
				reordered = append(reordered, rest...)
				orderedRoot[idx].Children = reordered
				break
			}

			orderedIDs := []string{}
			flattenMenuIDs(orderedRoot, &orderedIDs)
			if len(orderedIDs) > 0 {
				if err := menuSvc.ReorderMenu(ctx, menuCode, orderedIDs); err != nil {
					return err
				}
			}
		}
	}

	return nil
}
