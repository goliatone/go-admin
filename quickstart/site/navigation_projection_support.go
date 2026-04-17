package site

import (
	"regexp"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/internal/primitives"
)

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
	if value := strings.TrimSpace(item.LabelKey); value != "" {
		return strings.ToLower(value)
	}
	if value := strings.TrimSpace(item.GroupTitleKey); value != "" {
		return strings.ToLower(value)
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
