package site

import (
	"context"

	"github.com/goliatone/go-admin/admin"
)

func (r *navigationRuntime) filterMenuItems(ctx context.Context, items []admin.MenuItem) []admin.MenuItem {
	return filterNavigationMenuItems(r, ctx, items)
}

func (r *navigationRuntime) isAuthorized(ctx context.Context, permissions []string) bool {
	if len(permissions) == 0 || r.authorizer == nil {
		return true
	}
	return admin.CanAny(r.authorizer, ctx, "navigation", permissions...)
}

func (r *navigationRuntime) projectMenuItems(items []admin.MenuItem, activePath, locale, dedupPolicy string, debugMode bool) []map[string]any {
	return projectNavigationMenuItems(r, items, activePath, locale, dedupPolicy, debugMode)
}

func (r *navigationRuntime) projectMenuItem(item admin.MenuItem, activePath, locale, dedupPolicy string, debugMode bool) map[string]any {
	return projectNavigationMenuItem(r, item, activePath, locale, dedupPolicy, debugMode)
}
