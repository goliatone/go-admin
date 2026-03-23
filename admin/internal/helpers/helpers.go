package helpers

import (
	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	"github.com/goliatone/go-admin/internal/navigationutil"
)

// Translator resolves i18n keys into localized strings.
type Translator interface {
	Translate(locale, key string, args ...any) (string, error)
}

// NormalizeMenuSlug converts an arbitrary name/code into a normalized slug.
func NormalizeMenuSlug(raw string) string {
	return navigationutil.NormalizeMenuSlug(raw)
}

// MenuUUIDFromSlug derives a deterministic UUID string from a menu slug/name.
func MenuUUIDFromSlug(slug string) string {
	return navigationutil.MenuUUIDFromSlug(slug)
}

// NormalizeMenuItem ensures menu code is set and derives an ID when missing.
func NormalizeMenuItem(item navinternal.MenuItem, menuCode string) navinternal.MenuItem {
	return navinternal.NormalizeMenuItem(item, menuCode)
}

// CanonicalMenuKeys returns stable keys used to dedupe menu items across persistent backends.
func CanonicalMenuKeys(item navinternal.MenuItem) []string {
	return navinternal.CanonicalMenuKeys(item)
}

// ExtractTargetKey pulls a stable key from a target map.
func ExtractTargetKey(target map[string]any) string {
	return navinternal.ExtractTargetKey(target)
}

// AddMenuKeys records canonical keys for a slice of MenuItems into the provided set.
func AddMenuKeys(items []navinternal.MenuItem, dest map[string]bool) {
	navinternal.AddMenuKeys(items, dest)
}

// HasAnyKey checks if any of the provided keys are present in the set.
func HasAnyKey(set map[string]bool, keys []string) bool {
	return navinternal.HasAnyKey(set, keys)
}

// MapMenuIDs normalizes ID and ParentID values to canonical menu item paths.
func MapMenuIDs(item navinternal.MenuItem) navinternal.MenuItem {
	return navinternal.MapMenuIDs(item)
}

// BuildMenuTree reconstructs a hierarchy from a flat slice using ParentID metadata.
func BuildMenuTree(items []navinternal.MenuItem) []navinternal.MenuItem {
	return navinternal.BuildMenuTree(items)
}

// DedupeMenuItems filters a slice of MenuItems using canonical keys.
func DedupeMenuItems(items []navinternal.MenuItem) []navinternal.MenuItem {
	return navinternal.DedupeMenuItems(items)
}

// MenuHasTarget checks whether a menu tree contains a target.
func MenuHasTarget(items []navinternal.MenuItem, key string, menuPath string) bool {
	return navinternal.MenuHasTarget(items, key, menuPath)
}

// NavigationHasTarget checks whether a navigation tree contains a target.
func NavigationHasTarget(items []navinternal.NavigationItem, key string, menuPath string) bool {
	return navinternal.NavigationHasTarget(items, key, menuPath)
}

// TargetMatches returns true when a target map matches key or path.
func TargetMatches(target map[string]any, key string, menuPath string) bool {
	return navinternal.TargetMatches(target, key, menuPath)
}
