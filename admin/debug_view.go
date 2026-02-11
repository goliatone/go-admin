package admin

import (
	"context"
	"path"
	"strings"
	"unicode/utf8"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

const (
	debugLayoutQueryParam      = "debug_layout"
	debugLayoutStandaloneValue = "standalone"
)

func debugStandalonePath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	sep := "?"
	if strings.Contains(path, "?") {
		sep = "&"
	}
	return path + sep + debugLayoutQueryParam + "=" + debugLayoutStandaloneValue
}

func debugPageTemplate(cfg DebugConfig, c router.Context) string {
	template := strings.TrimSpace(cfg.PageTemplate)
	if template == "" {
		template = debugDefaultPageTemplate
	}
	if cfg.LayoutMode != DebugLayoutAdmin || c == nil {
		return template
	}
	if strings.EqualFold(strings.TrimSpace(c.Query(debugLayoutQueryParam)), debugLayoutStandaloneValue) {
		standalone := strings.TrimSpace(cfg.StandaloneTemplate)
		if standalone == "" {
			standalone = debugDefaultPageTemplate
		}
		return standalone
	}
	return template
}

func buildDebugViewContext(adm *Admin, cfg DebugConfig, c router.Context, view router.ViewContext) router.ViewContext {
	if view == nil {
		view = router.ViewContext{}
	}
	if cfg.ViewContextBuilder != nil {
		view = cfg.ViewContextBuilder(adm, cfg, c, view)
		if view == nil {
			view = router.ViewContext{}
		}
	}
	view["layout_mode"] = string(cfg.LayoutMode)
	if cfg.LayoutMode != DebugLayoutAdmin {
		return view
	}
	view = buildAdminLayoutViewContext(adm, c, view, "")
	if _, ok := view["debug_standalone_path"]; !ok {
		if debugPath, ok := view["debug_path"].(string); ok && debugPath != "" {
			view["debug_standalone_path"] = debugStandalonePath(debugPath)
		}
	}
	if _, ok := view["debug_admin_path"]; !ok {
		if debugPath, ok := view["debug_path"].(string); ok && debugPath != "" {
			view["debug_admin_path"] = debugPath
		}
	}
	if cfg.ToolbarMode && c != nil && debugToolbarExcluded(cfg, c.Path()) {
		view["debug_toolbar_enabled"] = false
	}
	// Hide content header for admin layout since the iframe provides its own UI
	view["hide_content_header"] = true
	return view
}

func debugViewNavItems(adm *Admin, c router.Context, basePath string) []map[string]any {
	out := []map[string]any{}
	if adm == nil {
		return out
	}
	nav := adm.Navigation()
	if nav == nil {
		return out
	}

	ctx := context.Background()
	if c != nil && c.Context() != nil {
		ctx = c.Context()
	}

	locale := strings.TrimSpace(adm.DefaultLocale())
	if c != nil {
		if queryLocale := strings.TrimSpace(c.Query("locale")); queryLocale != "" {
			locale = queryLocale
		}
	}
	menuCode := strings.TrimSpace(adm.NavMenuCode())
	if menuCode == "" {
		menuCode = NormalizeMenuSlug("admin.main")
	}
	if basePath == "" {
		basePath = strings.TrimSpace(adm.BasePath())
	}

	activePath := ""
	if c != nil {
		activePath = debugNormalizePath(c.Path())
	}

	items := nav.ResolveMenu(ctx, menuCode, locale)
	out = make([]map[string]any, 0, len(items))
	for _, item := range items {
		entry, _ := debugViewNavEntry(item, adm, basePath, activePath)
		out = append(out, entry)
	}
	return out
}

func debugViewNavEntry(item NavigationItem, adm *Admin, basePath string, activePath string) (map[string]any, bool) {
	children := []map[string]any{}
	childActive := false
	for _, child := range item.Children {
		childNode, hasActive := debugViewNavEntry(child, adm, basePath, activePath)
		if hasActive {
			childActive = true
		}
		children = append(children, childNode)
	}

	href, key, position := debugViewResolveNavTarget(item.Target, item.ID, adm, basePath)
	entryActive := debugPathMatches(activePath, href)
	if !entryActive {
		entryActive = debugNavKeyMatchesPath(key, activePath)
	}
	collapsible := item.Collapsible && len(children) > 0
	collapsed := collapsible && item.Collapsed
	if entryActive || childActive {
		collapsed = false
	}

	itemType := strings.TrimSpace(item.Type)
	if itemType == "" {
		itemType = MenuItemTypeItem
	}

	entry := map[string]any{
		"id":              item.ID,
		"type":            itemType,
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
		"active":          entryActive,
		"expanded":        collapsible && !collapsed,
		"child_active":    childActive,
	}
	return entry, entryActive || childActive
}

func debugViewResolveNavTarget(target map[string]any, itemID string, adm *Admin, basePath string) (string, string, int) {
	if basePath == "" && adm != nil {
		basePath = strings.TrimSpace(adm.BasePath())
	}
	href := normalizeBasePath(basePath)
	if href == "" {
		href = "/"
	}
	key := ""
	position := 0
	if target == nil {
		return href, debugViewNavKey(target, itemID, href), position
	}

	if targetPath := strings.TrimSpace(toString(target["path"])); targetPath != "" {
		href = targetPath
		if debugShouldPrefixBasePath(basePath, href) {
			href = prefixBasePath(basePath, href)
		}
	} else if name := strings.TrimSpace(toString(target["name"])); name != "" {
		if resolved := debugResolveAdminRoute(adm, name); resolved != "" {
			href = resolved
		} else {
			route := strings.TrimPrefix(name, "admin.")
			href = prefixBasePath(basePath, route)
		}
	}

	if rawPos, ok := target["position"]; ok {
		switch p := rawPos.(type) {
		case int:
			position = p
		case int64:
			position = int(p)
		case float64:
			position = int(p)
		}
	}

	key = debugViewNavKey(target, itemID, href)
	return href, key, position
}

func debugViewNavKey(target map[string]any, itemID string, href string) string {
	if target != nil {
		if key := strings.TrimSpace(toString(target["key"])); key != "" {
			return key
		}
		if name := strings.TrimSpace(toString(target["name"])); name != "" {
			return strings.TrimPrefix(name, "admin.")
		}
	}
	if itemID != "" {
		segments := strings.Split(itemID, ".")
		return strings.TrimSpace(segments[len(segments)-1])
	}
	href = debugNormalizePath(href)
	if href == "/" {
		return ""
	}
	segments := strings.Split(strings.Trim(href, "/"), "/")
	return strings.TrimSpace(segments[len(segments)-1])
}

func debugResolveAdminRoute(adm *Admin, routeName string) string {
	if adm == nil {
		return ""
	}
	routeName = strings.TrimSpace(routeName)
	if routeName == "" {
		return ""
	}
	route := strings.TrimPrefix(routeName, "admin.")
	if route == "" {
		route = "dashboard"
	}
	if resolved := resolveURL(adm.URLs(), "admin", route, nil, nil); resolved != "" {
		return resolved
	}
	return routePathWithBase(adm.URLs(), adminBasePath(adm.config), "admin", route)
}

func debugShouldPrefixBasePath(basePath string, href string) bool {
	href = strings.TrimSpace(href)
	if href == "" {
		return false
	}
	if strings.HasPrefix(href, "http://") || strings.HasPrefix(href, "https://") || strings.HasPrefix(href, "//") {
		return false
	}
	basePath = normalizeBasePath(basePath)
	if basePath == "" || basePath == "/" {
		return false
	}
	href = ensureLeadingSlashPath(href)
	if href == basePath || strings.HasPrefix(href, basePath+"/") {
		return false
	}
	return strings.HasPrefix(href, "/")
}

func debugViewSessionUser(c router.Context, basePath string) map[string]any {
	session := map[string]any{
		"display_name":     "Guest",
		"initial":          "?",
		"is_authenticated": false,
	}
	basePath = normalizeBasePath(basePath)
	if basePath != "" && basePath != "/" {
		session["avatar_url"] = path.Join(basePath, "assets", "avatar-default.svg")
	}

	if c == nil {
		return session
	}

	reqCtx := c.Context()
	if reqCtx == nil {
		return session
	}

	metadata := map[string]any{}
	actor, hasActor := auth.ActorFromContext(reqCtx)
	if hasActor && actor != nil {
		for k, v := range actor.Metadata {
			metadata[k] = v
		}
		if actor.Role != "" {
			session["role"] = actor.Role
		}
		session["id"] = firstNonEmpty(strings.TrimSpace(actor.ActorID), strings.TrimSpace(actor.Subject))
	}
	claims, hasClaims := auth.GetClaims(reqCtx)
	if hasClaims && claims != nil {
		session["id"] = firstNonEmpty(toString(session["id"]), strings.TrimSpace(claims.UserID()), strings.TrimSpace(claims.Subject()))
		if role := strings.TrimSpace(claims.Role()); role != "" && strings.TrimSpace(toString(session["role"])) == "" {
			session["role"] = role
		}
		if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok && carrier != nil {
			for k, v := range carrier.ClaimsMetadata() {
				if _, exists := metadata[k]; !exists {
					metadata[k] = v
				}
			}
		}
	}
	if strings.TrimSpace(toString(session["id"])) == "" {
		session["id"] = strings.TrimSpace(userIDFromContext(reqCtx))
	}

	displayName := firstNonEmpty(
		debugSessionUsernameFromRequest(c),
		strings.TrimSpace(toString(metadata["display_name"])),
		strings.TrimSpace(toString(metadata["name"])),
		strings.TrimSpace(toString(metadata["username"])),
		strings.TrimSpace(toString(metadata["email"])),
		strings.TrimSpace(toString(session["id"])),
		"Guest",
	)
	session["display_name"] = displayName
	if initial := debugDisplayInitial(displayName); initial != "" && !strings.EqualFold(displayName, "Guest") {
		session["initial"] = initial
	}

	if avatarURL := firstNonEmpty(
		strings.TrimSpace(toString(metadata["avatar_url"])),
		strings.TrimSpace(toString(metadata["avatar"])),
		strings.TrimSpace(toString(metadata["picture"])),
		strings.TrimSpace(toString(metadata["image_url"])),
	); avatarURL != "" {
		session["avatar_url"] = avatarURL
	}

	session["is_authenticated"] = hasActor || hasClaims
	return session
}

func debugDisplayInitial(displayName string) string {
	displayName = strings.TrimSpace(displayName)
	if displayName == "" {
		return ""
	}
	r, _ := utf8.DecodeRuneInString(displayName)
	if r == utf8.RuneError {
		return ""
	}
	return strings.ToUpper(string(r))
}

func debugNormalizePath(path string) string {
	path = strings.TrimSpace(path)
	if idx := strings.Index(path, "?"); idx >= 0 {
		path = path[:idx]
	}
	if path == "" {
		return ""
	}
	path = ensureLeadingSlashPath(path)
	if path != "/" {
		path = strings.TrimSuffix(path, "/")
	}
	return path
}

func debugPathMatches(activePath, href string) bool {
	activePath = debugNormalizePath(activePath)
	href = debugNormalizePath(href)
	return activePath != "" && href != "" && activePath == href
}

func debugNavKeyMatchesPath(key, activePath string) bool {
	key = strings.Trim(strings.TrimSpace(key), "/")
	if key == "" {
		return false
	}
	activePath = strings.Trim(strings.TrimSpace(debugNormalizePath(activePath)), "/")
	if activePath == "" {
		return false
	}
	if activePath == key {
		return true
	}
	return strings.HasSuffix(activePath, "/"+key)
}
