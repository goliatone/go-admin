package admin

import helpers "github.com/goliatone/go-admin/admin/internal/helpers"

func joinPath(basePath, suffix string) string {
	return helpers.JoinPath(basePath, suffix)
}

func menuHasTarget(items []MenuItem, key string, path string) bool {
	return helpers.MenuHasTarget(items, key, path)
}

func navigationHasTarget(items []NavigationItem, key string, path string) bool {
	return helpers.NavigationHasTarget(items, key, path)
}

func targetMatches(target map[string]any, key string, path string) bool {
	return helpers.TargetMatches(target, key, path)
}
