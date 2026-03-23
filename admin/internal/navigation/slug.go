package navigation

import (
	"github.com/goliatone/go-admin/internal/navigationutil"
)

// NormalizeMenuSlug converts an arbitrary name/code into a normalized slug.
// It lowercases, trims whitespace, and replaces non slug characters with '-'.
func NormalizeMenuSlug(raw string) string {
	return navigationutil.NormalizeMenuSlug(raw)
}

// MenuUUIDFromSlug derives a deterministic UUID string from a menu slug/name.
func MenuUUIDFromSlug(slug string) string {
	return navigationutil.MenuUUIDFromSlug(slug)
}
