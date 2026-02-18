package quickstart

import (
	"context"
	"encoding/json"
	"os"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
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
			SidebarPlacementPrimary: menuCode,
			SidebarPlacementUtility: admin.NormalizeMenuSlug(DefaultSidebarUtilityMenuCode),
			FooterPlacement:         admin.NormalizeMenuSlug("admin.footer"),
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
	return WithNavPlacements(ctx, adm, cfg, DefaultPlacements(cfg), SidebarPlacementPrimary, active, reqCtx)
}

// WithNavPlacements is like WithNav but allows selecting a placement-specific menu.
func WithNavPlacements(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, placements PlacementConfig, placement string, active string, reqCtx context.Context) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	ctx = withUIFeatureContext(ctx, adm, active, reqCtx)
	var urls urlkit.Resolver
	basePath := resolveAdminBasePath(nil, cfg.BasePath)
	if adm != nil {
		urls = adm.URLs()
		basePath = resolveAdminBasePath(urls, adm.BasePath())
	}
	ctx = WithPathViewContext(ctx, cfg, PathViewContextConfig{
		BasePath:    basePath,
		URLResolver: urls,
	})
	if reqCtx == nil {
		reqCtx = context.Background()
	}
	rawSession := ApplyScopeDefaultsToSession(BuildSessionUser(reqCtx), cfg)
	scopeData := featureScopeFromSession(rawSession)
	session := FilterSessionUser(rawSession, adm.FeatureGate())
	sessionView := session.ToViewContext()
	if sessionView["avatar_url"] == "" {
		sessionView["avatar_url"] = path.Join(basePath, "assets", "avatar-default.svg")
	}
	ctx["session_user"] = sessionView
	ctx = WithFeatureTemplateContext(ctx, reqCtx, scopeData, map[string]bool{})
	ctx["nav_items"] = BuildNavItemsForPlacement(adm, cfg, placements, placement, reqCtx, active)
	ctx["nav_utility_items"] = BuildNavItemsForPlacement(adm, cfg, placements, SidebarPlacementUtility, reqCtx, active)
	ctx["theme"] = adm.ThemePayload(reqCtx)
	ctx["users_import_available"] = adm.UserImportEnabled()
	ctx["users_import_enabled"] = adm.UserImportAllowed(reqCtx)
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
	return BuildNavItemsForPlacement(adm, cfg, DefaultPlacements(cfg), SidebarPlacementPrimary, ctx, active)
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
	basePath := resolveAdminBasePath(adm.URLs(), adm.BasePath())
	urls := adm.URLs()
	menuCode := placements.MenuCodeFor(placement, cfg.NavMenuCode)
	logNav := strings.EqualFold(os.Getenv("NAV_DEBUG"), "true") || strings.EqualFold(os.Getenv("NAV_DEBUG_LOG"), "true")
	items := nav.ResolveMenu(ctx, menuCode, cfg.DefaultLocale)
	for _, item := range items {
		entry, _ := buildNavEntry(item, basePath, urls, active)
		if entry == nil {
			continue
		}
		entries = append(entries, entry)
	}
	entries = applyTranslationEntrypointDegradation(entries, resolveTranslationModuleExposureSnapshot(adm, ctx))
	if logNav {
		logger := resolveQuickstartAdminLogger(adm, "quickstart.navigation", nil, nil)
		if raw, err := json.Marshal(map[string]any{"placement": placement, "menu_code": menuCode, "items": entries}); err == nil {
			logger.Debug("nav payload",
				"placement", placement,
				"menu_code", menuCode,
				"payload", string(raw),
			)
		}
	}
	return entries
}

func applyTranslationEntrypointDegradation(entries []map[string]any, exposure translationModuleExposureSnapshot) []map[string]any {
	if len(entries) == 0 {
		return entries
	}
	out := make([]map[string]any, 0, len(entries))
	for _, entry := range entries {
		mutated, include := applyTranslationEntrypointDegradationEntry(entry, exposure)
		if !include {
			continue
		}
		out = append(out, mutated)
	}
	return out
}

func applyTranslationEntrypointDegradationEntry(entry map[string]any, exposure translationModuleExposureSnapshot) (map[string]any, bool) {
	if entry == nil {
		return entry, false
	}

	children, _ := entry["children"].([]map[string]any)
	if len(children) > 0 {
		entry["children"] = applyTranslationEntrypointDegradation(children, exposure)
		updatedChildren, _ := entry["children"].([]map[string]any)
		entry["has_children"] = len(updatedChildren) > 0
	}
	if strings.EqualFold(strings.TrimSpace(toNavString(entry["type"])), admin.MenuItemTypeGroup) {
		updatedChildren, _ := entry["children"].([]map[string]any)
		if len(updatedChildren) == 0 {
			return nil, false
		}
	}

	moduleName, ok := translationModuleForNavKey(strings.TrimSpace(toNavString(entry["key"])))
	if !ok {
		return entry, true
	}
	moduleState, ok := exposure.module(moduleName)
	if !ok {
		return entry, true
	}
	if !moduleState.CapabilityEnabled {
		return nil, false
	}
	if moduleState.EntryEnabled {
		return entry, true
	}

	entry["disabled"] = true
	entry["aria_disabled"] = true
	entry["disabled_reason"] = moduleState.Reason
	entry["disabled_reason_code"] = moduleState.ReasonCode
	return entry, true
}

func translationModuleForNavKey(key string) (string, bool) {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "translations", "translation_dashboard":
		return "queue", true
	case "translation_exchange":
		return "exchange", true
	default:
		return "", false
	}
}

func toNavString(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	default:
		return ""
	}
}

func buildNavEntry(item admin.NavigationItem, basePath string, urls urlkit.Resolver, active string) (map[string]any, bool) {
	children := make([]map[string]any, 0, len(item.Children))
	childActive := false
	for _, child := range item.Children {
		childNode, hasActive := buildNavEntry(child, basePath, urls, active)
		if childNode == nil {
			continue
		}
		if hasActive {
			childActive = true
		}
		children = append(children, childNode)
	}

	href, derivedKey, position := resolveNavTarget(item.Target, basePath, urls)
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
	if strings.EqualFold(strings.TrimSpace(item.Type), admin.MenuItemTypeGroup) && len(children) == 0 {
		return nil, false
	}
	return entry, isActive || childActive
}

func resolveNavTarget(target map[string]any, basePath string, urls urlkit.Resolver) (string, string, int) {
	basePath = resolveAdminBasePath(urls, basePath)
	href := basePath
	key := ""
	position := 0

	if target == nil {
		return href, key, position
	}

	if targetPath, ok := target["path"].(string); ok && strings.TrimSpace(targetPath) != "" {
		href = strings.TrimSpace(targetPath)
		if shouldPrefixBasePath(basePath, href) {
			href = prefixBasePath(basePath, href)
		}
	} else if name, ok := target["name"].(string); ok && strings.TrimSpace(name) != "" {
		trimmedName := strings.TrimSpace(name)
		if resolved := resolveNavRoute(urls, trimmedName); resolved != "" {
			href = resolved
		} else {
			trimmed := strings.TrimPrefix(trimmedName, "admin.")
			href = prefixBasePath(basePath, trimmed)
		}
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

func resolveNavRoute(urls urlkit.Resolver, name string) string {
	if urls == nil {
		return ""
	}
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "admin.") {
		route := strings.TrimPrefix(trimmed, "admin.")
		return resolveRoutePath(urls, "admin", route)
	}
	if strings.HasPrefix(trimmed, "public.") {
		route := strings.TrimPrefix(trimmed, "public.")
		return resolveRoutePath(urls, "public", route)
	}
	return resolveRoutePath(urls, "admin", trimmed)
}

func shouldPrefixBasePath(basePath string, href string) bool {
	if strings.TrimSpace(basePath) == "" || basePath == "/" {
		return false
	}
	href = strings.TrimSpace(href)
	if href == "" {
		return false
	}
	if isAbsoluteURL(href) {
		return false
	}
	if strings.HasPrefix(href, basePath) {
		return false
	}
	return true
}
