package site

import (
	"context"

	"github.com/goliatone/go-admin/admin"
)

func (r *navigationRuntime) filterMenuItems(ctx context.Context, items []admin.MenuItem) []admin.NavigationItem {
	return filterNavigationMenuItems(r, ctx, items)
}

func (r *navigationRuntime) projectMenuItems(items []admin.NavigationItem, activePath, locale, dedupPolicy string, debugMode bool) []map[string]any {
	return projectNavigationMenuItems(r, items, activePath, locale, dedupPolicy, debugMode)
}

func (r *navigationRuntime) projectMenuItem(item admin.NavigationItem, activePath, locale, dedupPolicy string, debugMode bool) map[string]any {
	return projectNavigationMenuItem(r, item, activePath, locale, dedupPolicy, debugMode)
}
