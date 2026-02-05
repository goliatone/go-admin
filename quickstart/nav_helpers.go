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

// PlacementConfig maps logical placements to menu codes and dashboard areas.
type PlacementConfig struct {
	MenuCodes      map[string]string
	DashboardAreas map[string]string
}

// DefaultPlacements builds a placement map seeded with defaults.
func DefaultPlacements(cfg admin.Config) PlacementConfig {
	menuCode := admin.NormalizeMenuSlug(cfg.NavMenuCode)
	if menuCode == "" {
		menuCode = admin.NormalizeMenuSlug("admin.main")
	}
	return PlacementConfig{
		MenuCodes: map[string]string{
			"sidebar": menuCode,
			"footer":  admin.NormalizeMenuSlug("admin.footer"),
		},
		DashboardAreas: map[string]string{
			"main":    "admin.dashboard.main",
			"sidebar": "admin.dashboard.sidebar",
			"footer":  "admin.dashboard.footer",
		},
	}
}

// MenuCodeFor returns the menu code for a placement, falling back to the provided default.
func (p PlacementConfig) MenuCodeFor(placement, fallback string) string {
	if p.MenuCodes != nil {
		if code := strings.TrimSpace(p.MenuCodes[placement]); code != "" {
			return admin.NormalizeMenuSlug(code)
		}
	}
	code := admin.NormalizeMenuSlug(fallback)
	if code == "" {
		code = admin.NormalizeMenuSlug("admin.main")
	}
	return code
}

// DashboardAreaFor returns the dashboard area for a placement, with fallback support.
func (p PlacementConfig) DashboardAreaFor(placement, fallback string) string {
	if p.DashboardAreas != nil {
		if area := strings.TrimSpace(p.DashboardAreas[placement]); area != "" {
			return area
		}
	}
	if strings.TrimSpace(fallback) != "" {
		return fallback
	}
	return "admin.dashboard.main"
}

// WithNav adds session, theme, and navigation payload to the view context.
func WithNav(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext {
	return WithNavPlacements(ctx, adm, cfg, DefaultPlacements(cfg), "sidebar", active, reqCtx)
}

// WithNavPlacements is like WithNav but allows selecting a placement-specific menu.
func WithNavPlacements(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, placements PlacementConfig, placement string, active string, reqCtx context.Context) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	if _, ok := ctx["base_path"]; !ok {
		ctx["base_path"] = cfg.BasePath
	}
	if reqCtx == nil {
		reqCtx = context.Background()
	}
	rawSession := ApplyScopeDefaultsToSession(BuildSessionUser(reqCtx), cfg)
	scopeData := featureScopeFromSession(rawSession)
	session := FilterSessionUser(rawSession, adm.FeatureGate())
	sessionView := session.ToViewContext()
	if sessionView["avatar_url"] == "" {
		sessionView["avatar_url"] = path.Join(cfg.BasePath, "assets", "avatar-default.svg")
	}
	ctx["session_user"] = sessionView
	ctx = WithFeatureTemplateContext(ctx, reqCtx, scopeData, map[string]bool{})
	ctx["nav_items"] = BuildNavItemsForPlacement(adm, cfg, placements, placement, reqCtx, active)
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
	return BuildNavItemsForPlacement(adm, cfg, DefaultPlacements(cfg), "sidebar", ctx, active)
}

// BuildNavItemsForPlacement resolves a menu for a placement and returns render-ready entries.
func BuildNavItemsForPlacement(adm *admin.Admin, cfg admin.Config, placements PlacementConfig, placement string, ctx context.Context, active string) []map[string]any {
	entries := []map[string]any{}
	if adm == nil {
		return entries
	}
	nav := adm.Navigation()
	if nav == nil {
		return entries
	}
	menuCode := placements.MenuCodeFor(placement, cfg.NavMenuCode)
	logNav := strings.EqualFold(os.Getenv("NAV_DEBUG"), "true") || strings.EqualFold(os.Getenv("NAV_DEBUG_LOG"), "true")
	items := nav.ResolveMenu(ctx, menuCode, cfg.DefaultLocale)
	for _, item := range items {
		entry, _ := buildNavEntry(item, cfg, active)
		entries = append(entries, entry)
	}
	if logNav {
		if raw, err := json.Marshal(map[string]any{"placement": placement, "menu_code": menuCode, "items": entries}); err == nil {
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

	href, derivedKey, position := resolveNavTarget(item.Target, cfg.BasePath)
	// Prefer target key for active matching since IDs may include parent prefixes
	key := derivedKey
	if key == "" {
		key = strings.TrimSpace(item.ID)
	}
	// Match against target key, item ID, or the last segment of ID for nested items
	isActive := active != "" && key != "" && (key == active || strings.TrimSpace(item.ID) == active || strings.HasSuffix(item.ID, "."+active))
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
		href = strings.TrimSpace(targetPath)
		if shouldPrefixBasePath(target, basePath, href) {
			href = joinBasePath(basePath, href)
		}
	} else if name, ok := target["name"].(string); ok && strings.TrimSpace(name) != "" {
		trimmed := strings.TrimPrefix(strings.TrimSpace(name), "admin.")
		href = joinBasePath(basePath, trimmed)
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

func shouldPrefixBasePath(target map[string]any, basePath string, href string) bool {
	if target == nil {
		return false
	}
	if strings.TrimSpace(basePath) == "" || basePath == "/" {
		return false
	}
	href = strings.TrimSpace(href)
	if href == "" || !strings.HasPrefix(href, "/") {
		return false
	}
	if strings.HasPrefix(href, basePath) {
		return false
	}
	if key, ok := target["key"].(string); ok {
		key = strings.TrimSpace(key)
		if key == "feature_flags" {
			return true
		}
	}
	return false
}

func joinBasePath(basePath string, suffix string) string {
	base := strings.TrimSpace(basePath)
	if base == "" {
		base = "/"
	}
	return path.Join("/", strings.TrimPrefix(base, "/"), strings.TrimPrefix(strings.TrimSpace(suffix), "/"))
}
