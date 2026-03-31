package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func filterNavigationMenuItems(r *navigationRuntime, ctx context.Context, items []admin.MenuItem) []admin.MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]admin.MenuItem, 0, len(items))
	lastWasSeparator := false
	for _, item := range items {
		if !r.isAuthorized(ctx, item.Permissions) {
			continue
		}
		filteredChildren := filterNavigationMenuItems(r, ctx, item.Children)
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

func projectNavigationMenuItems(r *navigationRuntime, items []admin.MenuItem, activePath, locale, dedupPolicy string, debugMode bool) []map[string]any {
	if len(items) == 0 {
		return nil
	}

	ordered := orderMenuItemsDeterministic(items)
	deduped := dedupeMenuItems(ordered, dedupPolicy)

	out := make([]map[string]any, 0, len(deduped))
	for _, item := range deduped {
		projected := projectNavigationMenuItem(r, item, activePath, locale, dedupPolicy, debugMode)
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

func projectNavigationMenuItem(r *navigationRuntime, item admin.MenuItem, activePath, locale, dedupPolicy string, debugMode bool) map[string]any {
	itemType := normalizeMenuItemType(item.Type)
	target := cloneAnyMap(item.Target)
	href := resolveMenuItemHref(item, target)
	href = r.localizeMenuHref(href, locale)
	if href != "" {
		target["url"] = href
	}
	key := resolveMenuItemKey(item, href, target)

	children := projectNavigationMenuItems(r, item.Children, activePath, locale, dedupPolicy, debugMode)

	activeMatch := normalizeActiveMatch(strings.TrimSpace(anyString(target["active_match"])))
	pattern := strings.TrimSpace(anyString(target["active_pattern"]))
	activeSelf := r.menuItemActiveForRequestPath(normalizeNavigationPath(activePath), href, activeMatch, pattern)
	childActive := anyProjectedChildActive(children)
	active := activeSelf || childActive

	contribution, contributionOrigin := contributionInfoFromTarget(target)
	origin := strings.TrimSpace(anyString(target["origin"]))
	if origin == "" {
		if contribution {
			origin = firstNonEmpty(contributionOrigin, "contribution")
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
