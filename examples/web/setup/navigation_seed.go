package setup

import (
	"context"
	"path"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
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
// It delegates convergence to quickstart generated navigation reconciliation so legacy
// example-only specs cannot prune quickstart-owned rows from a divergent expected plan.
func SeedAdminNavigation(ctx context.Context, menuSvc admin.CMSMenuService, cfg admin.Config, modules []admin.Module, gates featureGates, isDev bool) error {
	if menuSvc == nil {
		return nil
	}
	_ = isDev
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

	return quickstart.SeedNavigation(ctx, quickstart.SeedNavigationOptions{
		MenuSvc:           menuSvc,
		MenuCode:          menuCode,
		Locale:            locale,
		RawInventory:      exampleNavigationRawInventoryOptions(cfg, menuCode),
		Items:             items,
		Reconcile:         true,
		AllowDestructive:  true,
		ManagedExclusions: ExampleManagedNavigationExclusions(menuCode),
	})
}

func exampleNavigationRawInventoryOptions(cfg admin.Config, menuCode string) admin.NavigationRawInventoryOptions {
	environment := strings.TrimSpace(cfg.NavEnvironment)
	source := "config.nav_environment"
	if environment == "" {
		environment = strings.TrimSpace(cfg.Debug.Environment)
		source = "config.debug.environment"
	}
	if environment == "" {
		environment = "default"
		source = "default"
	}
	return admin.NavigationRawInventoryOptions{
		MenuCode:          strings.TrimSpace(menuCode),
		Environment:       environment,
		EnvironmentSource: source,
	}
}

func ExampleManagedNavigationExclusions(menuCode string) []quickstart.NavigationManagedExclusion {
	menuCode = strings.TrimSpace(menuCode)
	if menuCode == "" {
		menuCode = NavigationMenuCode
	}
	mainGroup := menuCode + ".nav-group-main"
	othersGroup := menuCode + ".nav-group-others"
	return []quickstart.NavigationManagedExclusion{
		{ID: mainGroup + ".settings", Reason: "settings moved to utility menu"},
		{ID: othersGroup + ".translations.dashboard", Reason: "translations moved to product navigation"},
		{ID: othersGroup + ".translations.queue", Reason: "translations moved to product navigation"},
		{ID: othersGroup + ".translations.assignments", Reason: "translations moved to product navigation"},
		{ID: othersGroup + ".translations.exchange", Reason: "translations moved to product navigation"},
	}
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
	contentParent := mainGroup + ".content"

	out := []admin.MenuItem{
		{
			ID:            mainGroup,
			Type:          admin.MenuItemTypeGroup,
			GroupTitle:    "Navigation",
			GroupTitleKey: "menu.group.main",
			Position:      new(0),
			Menu:          menuCode,
		},
		{
			ID:          contentParent,
			Type:        admin.MenuItemTypeItem,
			Label:       "Content",
			LabelKey:    "menu.content",
			Icon:        "page",
			Position:    new(10),
			Collapsible: true,
			Collapsed:   false,
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "content", "pages"),
				"key":  "content",
			},
			Menu:        menuCode,
			ParentID:    mainGroup,
			Permissions: append([]string{}, quickstart.DefaultContentParentPermissions()...),
		},
		{
			ID:       contentParent + ".pages",
			Label:    "Pages",
			LabelKey: "menu.content.pages",
			Icon:     "page",
			Position: new(20),
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "content", "pages"),
				"key":  "pages",
			},
			Menu:        menuCode,
			ParentID:    contentParent,
			Locale:      locale,
			Permissions: []string{admin.PermAdminPagesView},
		},
		{
			ID:       contentParent + ".posts",
			Label:    "Posts",
			LabelKey: "menu.content.posts",
			Icon:     "page",
			Position: new(30),
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "content", "posts"),
				"key":  "posts",
			},
			Menu:        menuCode,
			ParentID:    contentParent,
			Locale:      locale,
			Permissions: []string{admin.PermAdminPostsView},
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
