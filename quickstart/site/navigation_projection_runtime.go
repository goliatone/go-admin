package site

import (
	"context"
	"regexp"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/internal/primitives"
)

func (r *navigationRuntime) filterMenuItems(ctx context.Context, items []admin.MenuItem) []admin.MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]admin.MenuItem, 0, len(items))
	lastWasSeparator := false
	for _, item := range items {
		if !r.isAuthorized(ctx, item.Permissions) {
			continue
		}
		filteredChildren := r.filterMenuItems(ctx, item.Children)
		item.Children = filteredChildren
		itemType := normalizeMenuItemType(item.Type)

		if itemType == "group" && len(item.Children) == 0 {
			continue
		}
		if (item.Collapsible || targetBool(item.Target, "collapsible")) && len(item.Children) == 0 {
			continue
		}
		if itemType == "separator" {
			if len(out) == 0 || lastWasSeparator {
				continue
			}
			lastWasSeparator = true
			out = append(out, item)
			continue
		}

		lastWasSeparator = false
		out = append(out, item)
	}
	for len(out) > 0 && normalizeMenuItemType(out[len(out)-1].Type) == "separator" {
		out = out[:len(out)-1]
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func (r *navigationRuntime) isAuthorized(ctx context.Context, permissions []string) bool {
	if len(permissions) == 0 || r.authorizer == nil {
		return true
	}
	return admin.CanAny(r.authorizer, ctx, "navigation", permissions...)
}

func (r *navigationRuntime) projectMenuItems(items []admin.MenuItem, activePath, locale, dedupPolicy string, debugMode bool) []map[string]any {
	if len(items) == 0 {
		return nil
	}

	ordered := orderMenuItemsDeterministic(items)
	deduped := dedupeMenuItems(ordered, dedupPolicy)

	out := make([]map[string]any, 0, len(deduped))
	for _, item := range deduped {
		projected := r.projectMenuItem(item, activePath, locale, dedupPolicy, debugMode)
		if projected == nil {
			continue
		}
		out = append(out, projected)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func (r *navigationRuntime) projectMenuItem(item admin.MenuItem, activePath, locale, dedupPolicy string, debugMode bool) map[string]any {
	itemType := normalizeMenuItemType(item.Type)
	target := cloneAnyMap(item.Target)
	href := resolveMenuItemHref(item, target)
	href = r.localizeMenuHref(href, locale)
	if href != "" {
		target["url"] = href
	}
	key := resolveMenuItemKey(item, href, target)

	children := r.projectMenuItems(item.Children, activePath, locale, dedupPolicy, debugMode)

	activeMatch := normalizeActiveMatch(strings.TrimSpace(anyString(target["active_match"])))
	pattern := strings.TrimSpace(anyString(target["active_pattern"]))
	activeSelf := r.menuItemActiveForRequestPath(normalizeNavigationPath(activePath), href, activeMatch, pattern)
	childActive := anyProjectedChildActive(children)
	active := activeSelf || childActive

	contribution, contributionOrigin := contributionInfoFromTarget(target)
	origin := strings.TrimSpace(anyString(target["origin"]))
	if origin == "" {
		if contribution {
			origin = primitives.FirstNonEmpty(contributionOrigin, "contribution")
		} else {
			origin = "manual"
		}
	}

	out := map[string]any{
		"id":                  strings.TrimSpace(item.ID),
		"code":                strings.TrimSpace(item.Code),
		"key":                 key,
		"type":                itemType,
		"label":               strings.TrimSpace(item.Label),
		"group_title":         strings.TrimSpace(item.GroupTitle),
		"href":                href,
		"active":              active,
		"active_self":         activeSelf,
		"active_ancestor":     childActive,
		"active_match":        activeMatch,
		"contribution":        contribution,
		"contribution_origin": contributionOrigin,
		"origin":              origin,
		"target":              target,
		"permissions":         append([]string{}, item.Permissions...),
		"classes":             append([]string{}, item.Classes...),
		"styles":              cloneStringMap(item.Styles),
		"collapsible":         item.Collapsible,
		"collapsed":           item.Collapsed,
	}
	if item.Position != nil {
		out["position"] = *item.Position
	}
	if item.Icon != "" {
		out["icon"] = strings.TrimSpace(item.Icon)
	}
	if item.Badge != nil {
		out["badge"] = cloneAnyMap(item.Badge)
	}
	if len(children) > 0 {
		out["children"] = children
	}
	if debugMode {
		out["debug"] = map[string]any{
			"id":                  strings.TrimSpace(item.ID),
			"code":                strings.TrimSpace(item.Code),
			"source":              origin,
			"contribution":        contribution,
			"contribution_origin": contributionOrigin,
			"permissions":         append([]string{}, item.Permissions...),
		}
	}
	return out
}

func dedupeMenuItems(items []admin.MenuItem, policy string) []admin.MenuItem {
	policy = normalizeDedupPolicy(policy)
	if policy == "" || policy == menuDedupNone || len(items) <= 1 {
		return items
	}
	seen := map[string]struct{}{}
	out := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		key := dedupeKeyForMenuItem(item, policy)
		if key == "" {
			out = append(out, item)
			continue
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, item)
	}
	return out
}

func dedupeKeyForMenuItem(item admin.MenuItem, policy string) string {
	target := item.Target
	switch policy {
	case menuDedupByTarget:
		for _, key := range []string{"key", "id", "content_id", "page_id", "slug", "name"} {
			if value := strings.TrimSpace(anyString(target[key])); value != "" {
				return strings.ToLower("target:" + value)
			}
		}
		if itemID := strings.TrimSpace(item.ID); itemID != "" {
			return strings.ToLower("target:" + itemID)
		}
		fallthrough
	case menuDedupByURL:
		if href := resolveMenuItemHref(item, target); href != "" {
			return strings.ToLower("url:" + href)
		}
	}
	return ""
}

func orderMenuItemsDeterministic(items []admin.MenuItem) []admin.MenuItem {
	if len(items) <= 1 {
		return append([]admin.MenuItem{}, items...)
	}
	type orderedItem struct {
		index int
		item  admin.MenuItem
	}
	out := make([]orderedItem, 0, len(items))
	for index, item := range items {
		out = append(out, orderedItem{index: index, item: item})
	}
	sort.SliceStable(out, func(i, j int) bool {
		left := out[i].item
		right := out[j].item

		leftPos := menuItemPosition(left)
		rightPos := menuItemPosition(right)
		if leftPos != rightPos {
			return leftPos < rightPos
		}

		leftKey := resolveMenuItemKey(left, resolveMenuItemHref(left, left.Target), left.Target)
		rightKey := resolveMenuItemKey(right, resolveMenuItemHref(right, right.Target), right.Target)
		if leftKey != rightKey {
			return leftKey < rightKey
		}
		return out[i].index < out[j].index
	})

	projected := make([]admin.MenuItem, 0, len(out))
	for _, item := range out {
		projected = append(projected, item.item)
	}
	return projected
}

func menuItemPosition(item admin.MenuItem) int {
	if item.Position == nil {
		return int(^uint(0) >> 1)
	}
	return *item.Position
}

func resolveMenuItemHref(item admin.MenuItem, target map[string]any) string {
	for _, key := range []string{"url", "href", "path"} {
		if value := strings.TrimSpace(anyString(target[key])); value != "" {
			return normalizeNavigationPath(value)
		}
	}
	if slug := strings.TrimSpace(anyString(target["slug"])); slug != "" {
		contentType := singularTypeSlug(anyString(target["content_type_slug"]))
		if contentType == "page" {
			return normalizeNavigationPath("/" + slug)
		}
		if contentType != "" {
			return normalizeNavigationPath("/" + contentType + "/" + slug)
		}
		return normalizeNavigationPath("/" + slug)
	}
	if strings.EqualFold(normalizeMenuItemType(item.Type), "separator") {
		return ""
	}
	return normalizeNavigationPath("/")
}

func (r *navigationRuntime) localizeMenuHref(href, locale string) string {
	href = normalizeNavigationPath(href)
	if href == "" {
		return "/"
	}
	if r == nil || !r.siteCfg.Features.EnableI18N {
		return href
	}
	locale = normalizeRequestedLocale(locale, r.siteCfg.DefaultLocale, r.siteCfg.SupportedLocales)
	if locale == "" {
		return href
	}
	if strings.HasPrefix(href, "http://") || strings.HasPrefix(href, "https://") || strings.HasPrefix(href, "//") {
		return href
	}
	if canonical, _ := StripSupportedLocalePrefix(href, r.siteCfg.SupportedLocales); canonical != "" {
		href = canonical
	}
	return LocalizedPath(href, locale, r.siteCfg.DefaultLocale, r.siteCfg.LocalePrefixMode)
}

func (r *navigationRuntime) menuItemActiveForRequestPath(activePath, href, mode, pattern string) bool {
	if menuItemActive(activePath, href, mode, pattern) {
		return true
	}
	if r == nil || !r.siteCfg.Features.EnableI18N {
		return false
	}
	strippedActive, _ := StripSupportedLocalePrefix(activePath, r.siteCfg.SupportedLocales)
	strippedHref, _ := StripSupportedLocalePrefix(href, r.siteCfg.SupportedLocales)
	if strippedPattern, _ := StripSupportedLocalePrefix(pattern, r.siteCfg.SupportedLocales); strippedPattern != "" {
		pattern = strippedPattern
	}
	if strippedActive == "" {
		strippedActive = activePath
	}
	if strippedHref == "" {
		strippedHref = href
	}
	return menuItemActive(strippedActive, strippedHref, mode, pattern)
}

func resolveMenuItemKey(item admin.MenuItem, href string, target map[string]any) string {
	if value := strings.TrimSpace(anyString(target["key"])); value != "" {
		return strings.ToLower(value)
	}
	if value := strings.TrimSpace(item.ID); value != "" {
		return strings.ToLower(value)
	}
	if value := strings.TrimSpace(item.Code); value != "" {
		return strings.ToLower(value)
	}
	if href != "" {
		return strings.ToLower(strings.Trim(href, "/"))
	}
	if value := strings.TrimSpace(item.Label); value != "" {
		return strings.ToLower(strings.ReplaceAll(value, " ", "_"))
	}
	return ""
}

func contributionInfoFromTarget(target map[string]any) (bool, string) {
	if len(target) == 0 {
		return false, ""
	}
	origin := strings.TrimSpace(primitives.FirstNonEmpty(
		anyString(target["contribution_origin"]),
		anyString(target["origin"]),
	))
	contribution := targetBool(target, "contribution")
	if !contribution {
		if meta := anyMap(target["metadata"]); len(meta) > 0 {
			contribution = strings.TrimSpace(anyString(meta["contribution"])) != ""
			if origin == "" {
				origin = strings.TrimSpace(anyString(meta["contribution_origin"]))
			}
		}
	}
	if origin != "" && !contribution {
		contribution = strings.Contains(strings.ToLower(origin), "contribution") || strings.Contains(strings.ToLower(origin), "override")
	}
	return contribution, origin
}

func normalizeMenuItemType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "group":
		return "group"
	case "separator":
		return "separator"
	default:
		return "item"
	}
}

func normalizeDedupPolicy(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case menuDedupByTarget:
		return menuDedupByTarget
	case menuDedupNone:
		return menuDedupNone
	default:
		return menuDedupByURL
	}
}

func normalizeActiveMatch(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "prefix":
		return "prefix"
	case "pattern":
		return "pattern"
	default:
		return "exact"
	}
}

func menuItemActive(activePath, href, mode, pattern string) bool {
	if href == "" {
		return false
	}
	if strings.HasPrefix(href, "http://") || strings.HasPrefix(href, "https://") || strings.HasPrefix(href, "//") {
		return false
	}
	activePath = normalizeNavigationPath(activePath)
	href = normalizeNavigationPath(href)
	mode = normalizeActiveMatch(mode)

	switch mode {
	case "prefix":
		if href == "/" {
			return activePath == "/"
		}
		return activePath == href || strings.HasPrefix(activePath, href+"/")
	case "pattern":
		pattern = strings.TrimSpace(primitives.FirstNonEmpty(pattern, href))
		if pattern == "" {
			return activePath == href
		}
		return pathMatchesPattern(activePath, pattern)
	default:
		return activePath == href
	}
}

func pathMatchesPattern(path, pattern string) bool {
	path = normalizeNavigationPath(path)
	pattern = strings.TrimSpace(pattern)
	if pattern == "" {
		return false
	}
	if strings.HasPrefix(pattern, "/") {
		pattern = normalizeNavigationPath(pattern)
	}
	if strings.Contains(pattern, "*") {
		quoted := regexp.QuoteMeta(pattern)
		quoted = strings.ReplaceAll(quoted, "\\*", ".*")
		re, err := regexp.Compile("^" + quoted + "$")
		if err == nil {
			return re.MatchString(path)
		}
	}
	if re, err := regexp.Compile(pattern); err == nil {
		return re.MatchString(path)
	}
	return normalizeNavigationPath(pattern) == path
}

func anyProjectedChildActive(children []map[string]any) bool {
	for _, child := range children {
		if targetBool(child, "active") {
			return true
		}
	}
	return false
}

func targetBool(target map[string]any, key string) bool {
	if len(target) == 0 {
		return false
	}
	raw, ok := target[key]
	if !ok {
		return false
	}
	switch value := raw.(type) {
	case bool:
		return value
	case string:
		value = strings.ToLower(strings.TrimSpace(value))
		switch value {
		case "1", "true", "yes", "on":
			return true
		}
	}
	return false
}

func normalizeNavigationPath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return "/"
	}
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") || strings.HasPrefix(path, "//") {
		return path
	}
	return normalizeLocalePath(path)
}
