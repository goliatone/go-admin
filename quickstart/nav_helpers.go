package quickstart

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// WithNav adds session, theme, and navigation payload to the view context.
func WithNav(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	if _, ok := ctx["base_path"]; !ok {
		ctx["base_path"] = cfg.BasePath
	}
	if reqCtx == nil {
		reqCtx = context.Background()
	}
	session := BuildSessionUser(reqCtx)
	sessionView := session.ToViewContext()
	if sessionView["avatar_url"] == "" {
		sessionView["avatar_url"] = path.Join(cfg.BasePath, "assets", "avatar-default.svg")
	}
	ctx["session_user"] = sessionView
	ctx["nav_items"] = BuildNavItems(adm, cfg, reqCtx, active)
	ctx["theme"] = adm.ThemePayload(reqCtx)
	if active != "" {
		ctx["active"] = active
	}
	if strings.EqualFold(os.Getenv("NAV_DEBUG"), "true") {
		if raw, err := json.MarshalIndent(ctx["nav_items"], "", "  "); err == nil {
			ctx["nav_items_json"] = string(raw)
			ctx["nav_debug"] = true
		}
	}
	return ctx
}

// BuildNavItems builds navigation menu items from the admin menu service.
func BuildNavItems(adm *admin.Admin, cfg admin.Config, ctx context.Context, active string) []map[string]any {
	if adm == nil {
		return nil
	}
	nav := adm.Navigation()
	if nav == nil {
		return nil
	}
	menuCode := admin.NormalizeMenuSlug(cfg.NavMenuCode)
	if menuCode == "" {
		menuCode = admin.NormalizeMenuSlug("admin.main")
	}
	logNav := strings.EqualFold(os.Getenv("NAV_DEBUG"), "true") || strings.EqualFold(os.Getenv("NAV_DEBUG_LOG"), "true")
	items := nav.ResolveMenu(ctx, menuCode, cfg.DefaultLocale)
	entries := make([]map[string]any, 0, len(items))
	for _, item := range items {
		entry, _ := buildNavEntry(item, cfg, active)
		entries = append(entries, entry)
	}
	if logNav {
		if raw, err := json.Marshal(map[string]any{"menu_code": menuCode, "items": entries}); err == nil {
			log.Printf("[nav] payload=%s", string(raw))
		}
	}
	return entries
}

func buildNavEntry(item admin.NavigationItem, cfg admin.Config, active string) (map[string]any, bool) {
	children := []map[string]any{}
	childActive := false
	for _, child := range item.Children {
		childNode, hasActive := buildNavEntry(child, cfg, active)
		if hasActive {
			childActive = true
		}
		children = append(children, childNode)
	}

	href, key, position := resolveNavTarget(item.Target, cfg.BasePath)
	isActive := active != "" && key != "" && key == active
	collapsible := item.Collapsible && len(children) > 0
	collapsed := collapsible && item.Collapsed
	if isActive || childActive {
		collapsed = false
	}

	entry := map[string]any{
		"id":              item.ID,
		"type":            item.Type,
		"label":           item.Label,
		"label_key":       item.LabelKey,
		"group_title":     item.GroupTitle,
		"group_title_key": item.GroupTitleKey,
		"icon":            item.Icon,
		"href":            href,
		"key":             key,
		"badge":           item.Badge,
		"classes":         item.Classes,
		"styles":          item.Styles,
		"children":        children,
		"has_children":    len(children) > 0,
		"collapsible":     collapsible,
		"collapsed":       collapsed,
		"position":        position,
		"active":          isActive,
		"expanded":        collapsible && !collapsed,
		"child_active":    childActive,
	}
	return entry, isActive || childActive
}

func resolveNavTarget(target map[string]any, basePath string) (string, string, int) {
	href := basePath
	key := ""
	position := 0

	if target == nil {
		return href, key, position
	}

	if targetPath, ok := target["path"].(string); ok && strings.TrimSpace(targetPath) != "" {
		href = targetPath
	} else if name, ok := target["name"].(string); ok && strings.TrimSpace(name) != "" {
		trimmed := strings.TrimPrefix(strings.TrimSpace(name), "admin.")
		href = path.Join(basePath, trimmed)
	}

	if k, ok := target["key"].(string); ok && strings.TrimSpace(k) != "" {
		key = strings.TrimSpace(k)
	} else if name, ok := target["name"].(string); ok && strings.TrimSpace(name) != "" {
		key = strings.TrimPrefix(strings.TrimSpace(name), "admin.")
	} else if href != "" {
		parts := strings.Split(strings.Trim(href, "/"), "/")
		if len(parts) > 0 {
			key = parts[len(parts)-1]
		}
	}

	switch p := target["position"].(type) {
	case int:
		position = p
	case float64:
		position = int(p)
	}

	return href, key, position
}
