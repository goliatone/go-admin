package quickstart

import (
	"context"
	"encoding/json"
	"net/url"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	uiplacement "github.com/goliatone/go-admin/ui/placement"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

type navRequestScope struct {
	MenuLocale string `json:"menu_locale"`
	Locale     string `json:"locale"`
	Channel    string `json:"channel"`
}

// MenuPlacementKey identifies a logical navigation placement.
type MenuPlacementKey string

// MenuPlacementSpec describes menu routing for a placement.
type MenuPlacementSpec struct {
	MenuCode string         `json:"menu_code"`
	Extra    map[string]any `json:"extra"`
}

// DashboardPlacementSpec describes dashboard routing for a placement.
type DashboardPlacementSpec struct {
	AreaCode string         `json:"area_code"`
	Extra    map[string]any `json:"extra"`
}

// PlacementConfig maps menu and dashboard placements independently.
type PlacementConfig struct {
	Menus      map[MenuPlacementKey]MenuPlacementSpec                       `json:"menus"`
	Dashboards map[uiplacement.DashboardPlacementKey]DashboardPlacementSpec `json:"dashboards"`
}

// DefaultPlacements builds a placement map seeded with defaults.
func DefaultPlacements(cfg admin.Config) PlacementConfig {
	return PlacementConfig{
		Menus: map[MenuPlacementKey]MenuPlacementSpec{
			SidebarPlacementPrimary: {
				MenuCode: cfg.NavMenuCode,
			},
			SidebarPlacementUtility: {
				MenuCode: DefaultSidebarUtilityMenuCode,
			},
			FooterPlacement: {
				MenuCode: "admin.footer",
			},
		},
		Dashboards: map[uiplacement.DashboardPlacementKey]DashboardPlacementSpec{
			uiplacement.DashboardPlacementMain: {
				AreaCode: uiplacement.DashboardAreaCodeMain,
			},
			uiplacement.DashboardPlacementSidebar: {
				AreaCode: uiplacement.DashboardAreaCodeSidebar,
			},
			uiplacement.DashboardPlacementFooter: {
				AreaCode: uiplacement.DashboardAreaCodeFooter,
			},
		},
	}
}

// MenuPlacementFor returns the menu placement spec for a logical placement, if present.
func (p PlacementConfig) MenuPlacementFor(placement MenuPlacementKey) (MenuPlacementSpec, bool) {
	if p.Menus == nil {
		return MenuPlacementSpec{}, false
	}
	spec, ok := p.Menus[placement]
	return spec, ok
}

// MenuCodeFor returns the menu code for a placement, falling back to the provided default.
func (p PlacementConfig) MenuCodeFor(placement MenuPlacementKey, fallback string) string {
	if spec, ok := p.MenuPlacementFor(placement); ok {
		if code := strings.TrimSpace(spec.MenuCode); code != "" {
			return admin.NormalizeMenuSlug(code)
		}
	}
	code := admin.NormalizeMenuSlug(fallback)
	if code == "" {
		code = admin.NormalizeMenuSlug("admin.main")
	}
	return code
}

// DashboardPlacementFor returns the dashboard placement spec for a logical placement, if present.
func (p PlacementConfig) DashboardPlacementFor(placement uiplacement.DashboardPlacementKey) (DashboardPlacementSpec, bool) {
	if p.Dashboards == nil {
		return DashboardPlacementSpec{}, false
	}
	spec, ok := p.Dashboards[placement]
	return spec, ok
}

// DashboardAreaFor returns the dashboard area for a placement, with fallback support.
func (p PlacementConfig) DashboardAreaFor(placement uiplacement.DashboardPlacementKey, fallback string) string {
	if spec, ok := p.DashboardPlacementFor(placement); ok {
		if area := strings.TrimSpace(spec.AreaCode); area != "" {
			return area
		}
	}
	if strings.TrimSpace(fallback) != "" {
		return fallback
	}
	return uiplacement.DashboardAreaCodeMain
}

// WithNav adds session, theme, and navigation payload to the view context.
func WithNav(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext {
	return WithNavPlacements(ctx, adm, cfg, DefaultPlacements(cfg), SidebarPlacementPrimary, active, reqCtx)
}

// WithNavPlacements is like WithNav but allows selecting a placement-specific menu.
func WithNavPlacements(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, placements PlacementConfig, placement MenuPlacementKey, active string, reqCtx context.Context) router.ViewContext {
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
	navItems := BuildNavItemsForPlacement(adm, cfg, placements, placement, reqCtx, active)
	ctx["nav_items"] = navItems
	utilityItems := BuildNavItemsForPlacement(adm, cfg, placements, SidebarPlacementUtility, reqCtx, active)
	if len(utilityItems) == 0 {
		utilityItems = buildDefaultUtilityNavItems(adm, cfg, reqCtx, active)
	}
	ctx["nav_utility_items"] = utilityItems
	ctx["theme"] = adm.ThemePayload(reqCtx)
	ctx["users_import_available"] = adm.UserImportEnabled()
	ctx["users_import_enabled"] = adm.UserImportAllowed(reqCtx)
	if active != "" {
		ctx["active"] = active
	}
	ctx = withResolvedBreadcrumbs(ctx, navItems, active)
	if cfg.NavDebug {
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
func BuildNavItemsForPlacement(adm *admin.Admin, cfg admin.Config, placements PlacementConfig, placement MenuPlacementKey, ctx context.Context, active string) []map[string]any {
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
	logNav := cfg.NavDebugLog
	scope := resolveNavRequestScope(ctx, cfg.DefaultLocale)
	items := nav.ResolveMenu(ctx, menuCode, scope.MenuLocale)
	for _, item := range items {
		entry, _ := buildNavEntry(item, basePath, urls, active, scope)
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
				"menu_locale", scope.MenuLocale,
				"link_locale", scope.Locale,
				"link_channel", scope.Channel,
				"payload", string(raw),
			)
		}
	}
	return entries
}

func buildDefaultUtilityNavItems(adm *admin.Admin, cfg admin.Config, ctx context.Context, active string) []map[string]any {
	if adm == nil {
		return []map[string]any{}
	}
	scope := resolveNavRequestScope(ctx, cfg.DefaultLocale)
	menuCode := DefaultPlacements(cfg).MenuCodeFor(SidebarPlacementUtility, DefaultSidebarUtilityMenuCode)
	items := defaultSidebarUtilityMenuItems(adm, cfg, menuCode, scope.MenuLocale)
	if len(items) == 0 {
		return []map[string]any{}
	}

	basePath := resolveAdminBasePath(adm.URLs(), adm.BasePath())
	urls := adm.URLs()
	entries := make([]map[string]any, 0, len(items))
	for _, item := range items {
		entry, _ := buildNavEntry(menuItemAsNavigationItem(item), basePath, urls, active, scope)
		if entry == nil {
			continue
		}
		entries = append(entries, entry)
	}
	return entries
}

func menuItemAsNavigationItem(item admin.MenuItem) admin.NavigationItem {
	return admin.NavigationItem{
		ID:            item.ID,
		Type:          item.Type,
		Label:         item.Label,
		LabelKey:      item.LabelKey,
		GroupTitle:    item.GroupTitle,
		GroupTitleKey: item.GroupTitleKey,
		Icon:          item.Icon,
		Target:        cloneAnyMap(item.Target),
		Badge:         cloneAnyMap(item.Badge),
		Permissions:   append([]string{}, item.Permissions...),
		Locale:        item.Locale,
		Classes:       append([]string{}, item.Classes...),
		Styles:        cloneStringMap(item.Styles),
		Collapsible:   item.Collapsible,
		Collapsed:     item.Collapsed,
		Position:      item.Position,
	}
}

func resolveNavRequestScope(ctx context.Context, defaultLocale string) navRequestScope {
	scope := navRequestScope{
		MenuLocale: strings.TrimSpace(defaultLocale),
	}
	if scopedLocale := strings.TrimSpace(admin.LocaleFromContext(ctx)); scopedLocale != "" {
		scope.MenuLocale = scopedLocale
		if !strings.EqualFold(scopedLocale, strings.TrimSpace(defaultLocale)) {
			scope.Locale = scopedLocale
		}
	}
	scope.Channel = strings.TrimSpace(admin.ContentChannelFromContext(ctx))
	return scope
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
	case "translations", "translation_dashboard", "translation_queue":
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

func buildNavEntry(item admin.NavigationItem, basePath string, urls urlkit.Resolver, active string, scope navRequestScope) (map[string]any, bool) {
	target := item.Target
	children, childActive := buildNavChildren(item.Children, basePath, urls, active, scope)

	href, derivedKey, position := resolveNavTarget(item.Target, basePath, urls, scope)
	key := navEntryKey(derivedKey, item.ID)
	isActive := navEntryActive(active, key, item.ID)
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
	applyNavTargetMetadata(entry, target, scope)
	if strings.EqualFold(strings.TrimSpace(item.Type), admin.MenuItemTypeGroup) && len(children) == 0 {
		return nil, false
	}
	return entry, isActive || childActive
}

func buildNavChildren(children []admin.NavigationItem, basePath string, urls urlkit.Resolver, active string, scope navRequestScope) ([]map[string]any, bool) {
	out := make([]map[string]any, 0, len(children))
	childActive := false
	for _, child := range children {
		childNode, hasActive := buildNavEntry(child, basePath, urls, active, scope)
		if childNode == nil {
			continue
		}
		childActive = childActive || hasActive
		out = append(out, childNode)
	}
	return out, childActive
}

func navEntryKey(derivedKey, itemID string) string {
	if strings.TrimSpace(derivedKey) != "" {
		return strings.TrimSpace(derivedKey)
	}
	return strings.TrimSpace(itemID)
}

func navEntryActive(active, key, itemID string) bool {
	active = strings.TrimSpace(active)
	if active == "" || key == "" {
		return false
	}
	itemID = strings.TrimSpace(itemID)
	return key == active || itemID == active || strings.HasSuffix(itemID, "."+active)
}

func applyNavTargetMetadata(entry map[string]any, target map[string]any, scope navRequestScope) {
	if breadcrumbLabel := strings.TrimSpace(toNavString(target["breadcrumb_label"])); breadcrumbLabel != "" {
		entry["breadcrumb_label"] = breadcrumbLabel
	}
	if breadcrumbHref := strings.TrimSpace(toNavString(target["breadcrumb_href"])); breadcrumbHref != "" {
		entry["breadcrumb_href"] = withNavScopeQuery(breadcrumbHref, scope)
	}
	if breadcrumbHidden, ok := target["breadcrumb_hidden"].(bool); ok {
		entry["breadcrumb_hidden"] = breadcrumbHidden
	}
	if targetEnabled, ok := target["enabled"].(bool); ok {
		entry["enabled"] = targetEnabled
	}
	if disabledReason := strings.TrimSpace(toNavString(target["disabled_reason"])); disabledReason != "" {
		entry["disabled_reason"] = disabledReason
	}
	if disabledReasonCode := strings.TrimSpace(toNavString(target["disabled_reason_code"])); disabledReasonCode != "" {
		entry["disabled_reason_code"] = disabledReasonCode
	}
}

func resolveNavTarget(target map[string]any, basePath string, urls urlkit.Resolver, scope navRequestScope) (string, string, int) {
	basePath = resolveAdminBasePath(urls, basePath)
	href := basePath
	key := ""
	position := 0

	if target == nil {
		return withNavScopeQuery(href, scope), key, position
	}

	href = resolveNavHref(target, basePath, urls, href)
	key = resolveNavKey(target, href)
	position = resolveNavPosition(target)

	return withNavScopeQuery(href, scope), key, position
}

func resolveNavHref(target map[string]any, basePath string, urls urlkit.Resolver, fallback string) string {
	if targetURL := strings.TrimSpace(toNavString(target["url"])); targetURL != "" {
		return targetURL
	}
	if targetPath := strings.TrimSpace(toNavString(target["path"])); targetPath != "" {
		if shouldPrefixBasePath(basePath, targetPath) {
			return prefixBasePath(basePath, targetPath)
		}
		return targetPath
	}
	if name := strings.TrimSpace(toNavString(target["name"])); name != "" {
		if resolved := resolveNavRoute(urls, name); resolved != "" {
			return resolved
		}
		return prefixBasePath(basePath, strings.TrimPrefix(name, "admin."))
	}
	return fallback
}

func resolveNavKey(target map[string]any, href string) string {
	if key := strings.TrimSpace(toNavString(target["key"])); key != "" {
		return key
	}
	if name := strings.TrimSpace(toNavString(target["name"])); name != "" {
		return strings.TrimPrefix(name, "admin.")
	}
	if href != "" {
		return navTargetKeyFromHref(href)
	}
	return ""
}

func resolveNavPosition(target map[string]any) int {
	switch p := target["position"].(type) {
	case int:
		return p
	case float64:
		return int(p)
	}
	return 0
}

func navTargetKeyFromHref(href string) string {
	trimmed := strings.TrimSpace(href)
	if trimmed == "" {
		return ""
	}
	parsed, err := url.Parse(trimmed)
	if err == nil {
		parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
		if len(parts) > 0 {
			return parts[len(parts)-1]
		}
		return ""
	}
	pathOnly := trimmed
	if idx := strings.IndexAny(pathOnly, "?#"); idx >= 0 {
		pathOnly = pathOnly[:idx]
	}
	parts := strings.Split(strings.Trim(pathOnly, "/"), "/")
	if len(parts) == 0 {
		return ""
	}
	return parts[len(parts)-1]
}

func withNavScopeQuery(href string, scope navRequestScope) string {
	trimmed := strings.TrimSpace(href)
	if trimmed == "" || !shouldDecorateNavHrefWithScope(trimmed) {
		return trimmed
	}
	out := trimmed
	if strings.TrimSpace(scope.Locale) != "" {
		out = appendQueryParam(out, "locale", scope.Locale)
	}
	if strings.TrimSpace(scope.Channel) != "" {
		out = appendQueryParam(out, admin.ContentChannelScopeQueryParam, scope.Channel)
	}
	return out
}

func shouldDecorateNavHrefWithScope(href string) bool {
	trimmed := strings.TrimSpace(href)
	if trimmed == "" || isAbsoluteURL(trimmed) {
		return false
	}
	lower := strings.ToLower(trimmed)
	switch {
	case strings.HasPrefix(trimmed, "#"):
		return false
	case strings.HasPrefix(lower, "mailto:"):
		return false
	case strings.HasPrefix(lower, "tel:"):
		return false
	case strings.HasPrefix(lower, "javascript:"):
		return false
	default:
		return true
	}
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
