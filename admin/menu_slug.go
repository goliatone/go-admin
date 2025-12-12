package admin

import (
	"errors"

	helpers "github.com/goliatone/go-admin/admin/internal/helpers"
)

// ErrMenuSlugConflict signals an attempt to create a menu with a duplicate slug.
var ErrMenuSlugConflict = errors.New("menu slug already exists")

// NormalizeMenuSlug converts an arbitrary name/code into a normalized slug.
// It lowercases, trims whitespace, and replaces non slug characters with '-'.
func NormalizeMenuSlug(raw string) string {
	return helpers.NormalizeMenuSlug(raw)
}

// MenuUUIDFromSlug derives a deterministic UUID string from a menu slug/name.
func MenuUUIDFromSlug(slug string) string {
	return helpers.MenuUUIDFromSlug(slug)
}
