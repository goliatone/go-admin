package helpers

import (
	"context"
	"path"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-router"
)

// WithNav adds navigation items to the view context
func WithNav(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	if _, ok := ctx["base_path"]; !ok {
		ctx["base_path"] = cfg.BasePath
	}
	ctx["nav_items"] = BuildNavItems(adm, cfg)
	if active != "" {
		ctx["active"] = active
	}
	return ctx
}

// BuildNavItems builds navigation menu items from the admin menu service
func BuildNavItems(adm *admin.Admin, cfg admin.Config) []map[string]any {
	menuSvc := adm.MenuService()
	if menuSvc == nil {
		return nil
	}
	menuCode := cfg.NavMenuCode
	if menuCode == "" {
		menuCode = "admin.main"
	}
	menu, err := menuSvc.Menu(context.Background(), menuCode, cfg.DefaultLocale)
	if err != nil {
		return nil
	}
	items := make([]map[string]any, 0, len(menu.Items))
	for _, item := range menu.Items {
		href := cfg.BasePath
		if targetPath, ok := item.Target["path"].(string); ok && targetPath != "" {
			href = targetPath
		} else if name, ok := item.Target["name"].(string); ok && name != "" {
			trimmed := strings.TrimPrefix(name, "admin.")
			href = path.Join(cfg.BasePath, trimmed)
		}
		key := ""
		if k, ok := item.Target["key"].(string); ok && k != "" {
			key = k
		} else if name, ok := item.Target["name"].(string); ok && name != "" {
			key = strings.TrimPrefix(name, "admin.")
		} else if href != "" {
			parts := strings.Split(strings.Trim(href, "/"), "/")
			if len(parts) > 0 {
				key = parts[len(parts)-1]
			}
		}
		pos := item.Position
		if p, ok := item.Target["position"].(int); ok && p != 0 {
			pos = p
		}
		items = append(items, map[string]any{
			"label":    item.Label,
			"icon":     item.Icon,
			"href":     href,
			"key":      key,
			"position": pos,
			"badge":    item.Badge,
			"classes":  item.Classes,
			"styles":   item.Styles,
		})
	}
	sort.SliceStable(items, func(i, j int) bool {
		ival, _ := items[i]["position"].(int)
		jval, _ := items[j]["position"].(int)
		return ival < jval
	})
	return items
}
