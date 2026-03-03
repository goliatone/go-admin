package admin

import helpers "github.com/goliatone/go-admin/admin/internal/helpers"

// normalizeMenuItem ensures menu code is set and derives an ID when missing.
func normalizeMenuItem(item MenuItem, menuCode string) MenuItem {
	return helpers.NormalizeMenuItem(item, menuCode)
}

// canonicalMenuKeys returns stable keys used to dedupe menu items across persistent backends.
// It prefers an explicit ID, otherwise falls back to the target key/path when present.
func canonicalMenuKeys(item MenuItem) []string {
	return helpers.CanonicalMenuKeys(item)
}

func extractTargetKey(target map[string]any) string {
	return helpers.ExtractTargetKey(target)
}

func addMenuKeys(items []MenuItem, dest map[string]bool) {
	helpers.AddMenuKeys(items, dest)
}

func hasAnyKey(set map[string]bool, keys []string) bool {
	return helpers.HasAnyKey(set, keys)
}

// mapMenuIDs normalizes ID and ParentID values to canonical menu item paths.
func mapMenuIDs(item MenuItem) MenuItem {
	return helpers.MapMenuIDs(item)
}

// buildMenuTree reconstructs a hierarchy from a flat slice using ParentID metadata.
// If items already contain children, it leaves the structure as-is.
func buildMenuTree(items []MenuItem) []MenuItem {
	return helpers.BuildMenuTree(items)
}

// dedupeMenuItems filters a slice of MenuItems using canonical keys.
func dedupeMenuItems(items []MenuItem) []MenuItem {
	return helpers.DedupeMenuItems(items)
}
