package setup

import (
	"context"
	"fmt"
	"path"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

type featureGates interface {
	Enabled(key string) bool
}

type menuContributor interface {
	MenuItems(locale string) []admin.MenuItem
}

// SeedAdminNavigation converges the example admin navigation menu so parent scaffolding,
// ordering, and module-contributed items remain deterministic across restarts.
//
// When the CMS menu service is backed by go-cms, this uses cms.SeedMenu with Ensure enabled
// (and PruneUnspecified in development) so sibling ordering is repaired without ad-hoc resets.
func SeedAdminNavigation(ctx context.Context, menuSvc admin.CMSMenuService, cfg admin.Config, modules []admin.Module, gates featureGates, isDev bool) error {
	if menuSvc == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	menuCode := strings.TrimSpace(cfg.NavMenuCode)
	if menuCode == "" {
		menuCode = NavigationMenuCode
	}
	locale := strings.TrimSpace(cfg.DefaultLocale)
	if locale == "" {
		locale = "en"
	}

	items := buildAdminNavigationSpec(cfg.BasePath, menuCode, locale, modules, gates)
	if len(items) == 0 {
		return nil
	}

	// Prefer go-cms converge flow when possible.
	if goCMS, ok := menuSvc.(*admin.GoCMSMenuAdapter); ok && goCMS != nil && goCMS.GoCMSMenuService() != nil {
		seed := toSeedMenuItems(menuCode, locale, items)
		return cms.SeedMenu(ctx, cms.SeedMenuOptions{
			Menus:            goCMS.GoCMSMenuService(),
			MenuCode:         menuCode,
			Locale:           locale,
			Actor:            uuid.Nil,
			Items:            seed,
			Ensure:           true,
			PruneUnspecified: isDev,
		})
	}

	if _, err := menuSvc.CreateMenu(ctx, menuCode); err != nil {
		return err
	}
	for _, item := range items {
		item.Menu = menuCode
		if strings.TrimSpace(item.Locale) == "" {
			item.Locale = locale
		}
		if err := menuSvc.AddMenuItem(ctx, menuCode, item); err != nil {
			return err
		}
	}
	return nil
}

func buildAdminNavigationSpec(basePath, menuCode, locale string, modules []admin.Module, gates featureGates) []admin.MenuItem {
	menuCode = strings.TrimSpace(menuCode)
	if menuCode == "" {
		menuCode = NavigationMenuCode
	}
	basePath = "/" + strings.Trim(strings.TrimSpace(basePath), "/")
	if basePath == "/" {
		basePath = "/admin"
	}

	mainGroup := menuCode + ".nav-group-main"
	othersGroup := menuCode + ".nav-group-others"
	contentParent := mainGroup + ".content"

	out := []admin.MenuItem{
		{
			ID:            mainGroup,
			Type:          admin.MenuItemTypeGroup,
			GroupTitle:    "Main Menu",
			GroupTitleKey: "menu.group.main",
			Position:      admin.IntPtr(0),
			Menu:          menuCode,
		},
		{
			ID:            othersGroup,
			Type:          admin.MenuItemTypeGroup,
			GroupTitle:    "Others",
			GroupTitleKey: "menu.group.others",
			Position:      admin.IntPtr(90),
			Menu:          menuCode,
		},
		{
			ID:          contentParent,
			Type:        admin.MenuItemTypeItem,
			Label:       "Content",
			LabelKey:    "menu.content",
			Icon:        "page",
			Position:    admin.IntPtr(10),
			Collapsible: true,
			Collapsed:   false,
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "pages"),
				"key":  "content",
			},
			Menu:        menuCode,
			ParentID:    mainGroup,
			Permissions: []string{"admin.pages.view", "admin.posts.view"},
		},
		{
			ID:       mainGroup + ".shop",
			Type:     admin.MenuItemTypeItem,
			Label:    "My Shop",
			LabelKey: "menu.shop",
			Icon:     "shop",
			Position: admin.IntPtr(40),
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "shop"),
				"key":  "shop",
			},
			Menu:        menuCode,
			ParentID:    mainGroup,
			Collapsible: true,
		},
		{
			ID:       mainGroup + ".shop.products",
			Label:    "Products",
			LabelKey: "menu.shop.products",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "products"),
				"key":  "products",
			},
			Position: admin.IntPtr(1),
			Menu:     menuCode,
			ParentID: mainGroup + ".shop",
		},
		{
			ID:       mainGroup + ".shop.orders",
			Label:    "Orders",
			LabelKey: "menu.shop.orders",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "orders"),
				"key":  "orders",
			},
			Position: admin.IntPtr(2),
			Menu:     menuCode,
			ParentID: mainGroup + ".shop",
		},
		{
			ID:       mainGroup + ".shop.customers",
			Label:    "Customers",
			LabelKey: "menu.shop.customers",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "customers"),
				"key":  "customers",
			},
			Position: admin.IntPtr(3),
			Menu:     menuCode,
			ParentID: mainGroup + ".shop",
		},
		{
			ID:       mainGroup + ".analytics",
			Label:    "Analytics",
			LabelKey: "menu.analytics",
			Icon:     "stats-report",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "analytics"),
				"key":  "analytics",
			},
			Position: admin.IntPtr(60),
			Menu:     menuCode,
			ParentID: mainGroup,
		},
		{
			ID:       mainGroup + ".separator",
			Type:     admin.MenuItemTypeSeparator,
			Position: admin.IntPtr(80),
			Menu:     menuCode,
		},
		{
			ID:       othersGroup + ".help",
			Label:    "Help & Support",
			LabelKey: "menu.help",
			Icon:     "question-mark",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "help"),
				"key":  "help",
			},
			Position: admin.IntPtr(10),
			Menu:     menuCode,
			ParentID: othersGroup,
		},
	}

	for _, mod := range modules {
		if mod == nil {
			continue
		}
		if !moduleEnabled(mod, gates) {
			continue
		}
		contributor, ok := mod.(menuContributor)
		if !ok {
			continue
		}
		for _, item := range contributor.MenuItems(locale) {
			if strings.TrimSpace(item.Menu) != "" && strings.TrimSpace(item.Menu) != menuCode {
				continue
			}
			if strings.TrimSpace(item.Locale) == "" {
				item.Locale = locale
			}
			if strings.TrimSpace(item.Menu) == "" {
				item.Menu = menuCode
			}
			out = append(out, item)
		}
	}

	return dedupeMenuItemsByID(out)
}

func moduleEnabled(mod admin.Module, gates featureGates) bool {
	if mod == nil {
		return false
	}
	if gates == nil {
		return true
	}
	flags := mod.Manifest().FeatureFlags
	for _, flag := range flags {
		if strings.TrimSpace(flag) == "" {
			continue
		}
		if !gates.Enabled(flag) {
			return false
		}
	}
	return true
}

func dedupeMenuItemsByID(items []admin.MenuItem) []admin.MenuItem {
	out := make([]admin.MenuItem, 0, len(items))
	indexByID := map[string]int{}
	for _, item := range items {
		id := strings.TrimSpace(item.ID)
		if id == "" {
			continue
		}
		if idx, ok := indexByID[id]; ok {
			out[idx] = item
			continue
		}
		indexByID[id] = len(out)
		out = append(out, item)
	}
	return out
}

func toSeedMenuItems(menuCode, locale string, items []admin.MenuItem) []cms.SeedMenuItem {
	seed := make([]cms.SeedMenuItem, 0, len(items))
	for _, item := range items {
		trimmedID := strings.TrimSpace(item.ID)
		if trimmedID == "" {
			continue
		}
		path := canonicalMenuItemPath(menuCode, trimmedID)
		if path == "" {
			continue
		}

		itemType := strings.TrimSpace(item.Type)
		if itemType == "" {
			itemType = admin.MenuItemTypeItem
		}

		target := cloneAnyMapOrNil(item.Target)
		if itemType == admin.MenuItemTypeGroup || itemType == admin.MenuItemTypeSeparator {
			target = nil
		}

		seedItem := cms.SeedMenuItem{
			Path:        path,
			Position:    item.Position,
			Type:        itemType,
			Target:      target,
			Icon:        strings.TrimSpace(item.Icon),
			Badge:       cloneAnyMapOrNil(item.Badge),
			Permissions: append([]string{}, item.Permissions...),
			Classes:     append([]string{}, item.Classes...),
			Styles:      cloneStringMapOrNil(item.Styles),
			Collapsible: item.Collapsible,
			Collapsed:   item.Collapsed,
			Metadata: map[string]any{
				"path":        path,
				"parent_path": canonicalMenuItemPath(menuCode, firstNonEmpty(item.ParentID, item.ParentCode)),
			},
		}

		if itemType != admin.MenuItemTypeSeparator {
			tr := cms.MenuItemTranslationInput{Locale: locale}
			switch itemType {
			case admin.MenuItemTypeGroup:
				tr.GroupTitle = firstNonEmpty(strings.TrimSpace(item.GroupTitle), strings.TrimSpace(item.GroupTitleKey), fmt.Sprintf("group:%s", path))
				tr.GroupTitleKey = strings.TrimSpace(item.GroupTitleKey)
			default:
				tr.Label = firstNonEmpty(strings.TrimSpace(item.Label), strings.TrimSpace(item.LabelKey), fmt.Sprintf("item:%s", path))
				tr.LabelKey = strings.TrimSpace(item.LabelKey)
			}
			seedItem.Translations = []cms.MenuItemTranslationInput{tr}
		}

		seed = append(seed, seedItem)
	}
	return seed
}

func canonicalMenuItemPath(menuCode, raw string) string {
	menuCode = strings.TrimSpace(menuCode)
	raw = strings.TrimSpace(raw)
	if menuCode == "" || raw == "" {
		return ""
	}
	if raw == menuCode || strings.HasPrefix(raw, menuCode+".") {
		return raw
	}
	return menuCode + "." + strings.TrimPrefix(raw, ".")
}

func cloneAnyMapOrNil(src map[string]any) map[string]any {
	if len(src) == 0 {
		return nil
	}
	dst := make(map[string]any, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func cloneStringMapOrNil(src map[string]string) map[string]string {
	if len(src) == 0 {
		return nil
	}
	dst := make(map[string]string, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}
