package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func filterNavigationMenuItems(r *navigationRuntime, ctx context.Context, items []admin.MenuItem) []admin.NavigationItem {
	if len(items) == 0 {
		return nil
	}
	navItems := make([]admin.NavigationItem, 0, len(items))
	for _, item := range items {
		navItems = append(navItems, siteMenuItemAsNavigationItem(item))
	}
	nav := admin.NewNavigation(nil, nil)
	if r != nil {
		nav.SetAuthorizer(r.authorizer)
	}
	nav.AddFallback(navItems...)
	return nav.ResolveMenuWithOptions(ctx, "", "", admin.ResolveOptions{
		PermissionDeniedMode: siteNavigationPermissionDeniedMode(r),
		PermissionResource:   "navigation",
	})
}

func projectNavigationMenuItems(r *navigationRuntime, items []admin.NavigationItem, activePath, locale, dedupPolicy string, debugMode bool) []map[string]any {
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

func projectNavigationMenuItem(r *navigationRuntime, item admin.NavigationItem, activePath, locale, dedupPolicy string, debugMode bool) map[string]any {
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
		"label_key":           strings.TrimSpace(item.LabelKey),
		"group_title":         strings.TrimSpace(item.GroupTitle),
		"group_title_key":     strings.TrimSpace(item.GroupTitleKey),
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
	applySiteNavigationItemMetadata(out, item)
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

func siteMenuItemAsNavigationItem(item admin.MenuItem) admin.NavigationItem {
	children := make([]admin.NavigationItem, 0, len(item.Children))
	for _, child := range item.Children {
		children = append(children, siteMenuItemAsNavigationItem(child))
	}
	return admin.NavigationItem{
		ID:            strings.TrimSpace(item.ID),
		Code:          strings.TrimSpace(item.Code),
		Type:          normalizeMenuItemType(item.Type),
		Label:         strings.TrimSpace(item.Label),
		LabelKey:      strings.TrimSpace(item.LabelKey),
		GroupTitle:    strings.TrimSpace(item.GroupTitle),
		GroupTitleKey: strings.TrimSpace(item.GroupTitleKey),
		Icon:          strings.TrimSpace(item.Icon),
		Target:        cloneAnyMap(item.Target),
		Badge:         cloneAnyMap(item.Badge),
		Children:      children,
		Permissions:   append([]string{}, item.Permissions...),
		Locale:        strings.TrimSpace(item.Locale),
		Classes:       append([]string{}, item.Classes...),
		Styles:        cloneStringMap(item.Styles),
		Collapsible:   item.Collapsible,
		Collapsed:     item.Collapsed,
		Position:      item.Position,
	}
}

func siteNavigationPermissionDeniedMode(r *navigationRuntime) admin.NavigationPermissionDeniedMode {
	if r == nil {
		return admin.NavigationPermissionDeniedModeHide
	}
	return admin.NormalizeNavigationPermissionDeniedMode(r.siteCfg.Navigation.PermissionDeniedMode)
}

func applySiteNavigationItemMetadata(entry map[string]any, item admin.NavigationItem) {
	if entry == nil || item.Enabled == nil {
		return
	}
	entry["enabled"] = *item.Enabled
	if *item.Enabled {
		delete(entry, "disabled")
		delete(entry, "aria_disabled")
		delete(entry, "disabled_reason")
		delete(entry, "disabled_reason_code")
		delete(entry, "missing_permission")
		return
	}
	if item.Disabled {
		entry["disabled"] = true
	}
	if item.ARIADisabled {
		entry["aria_disabled"] = true
	}
	if strings.TrimSpace(item.DisabledReason) != "" {
		entry["disabled_reason"] = strings.TrimSpace(item.DisabledReason)
	}
	if strings.TrimSpace(item.DisabledReasonCode) != "" {
		entry["disabled_reason_code"] = strings.TrimSpace(item.DisabledReasonCode)
	}
	if strings.TrimSpace(item.MissingPermission) != "" {
		entry["missing_permission"] = strings.TrimSpace(item.MissingPermission)
	}
}
