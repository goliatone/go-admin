package navigationutil

import (
	"strings"
	"unicode"

	cms "github.com/goliatone/go-cms"
)

// NormalizeMenuSlug converts an arbitrary name/code into a normalized slug.
func NormalizeMenuSlug(raw string) string {
	trimmed := strings.TrimSpace(strings.ToLower(raw))
	if trimmed == "" {
		return ""
	}
	var b strings.Builder
	lastWasDash := false
	for _, r := range trimmed {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(r)
			lastWasDash = false
		case r == '-', r == '_', r == '.':
			b.WriteRune(r)
			lastWasDash = false
		default:
			if !lastWasDash {
				b.WriteRune('-')
				lastWasDash = true
			}
		}
	}
	slug := strings.Trim(b.String(), "-._")
	if slug == "" {
		return trimmed
	}
	return slug
}

// MenuUUIDFromSlug derives a deterministic key from a menu slug/name.
func MenuUUIDFromSlug(slug string) string {
	normalized := NormalizeMenuSlug(slug)
	if normalized == "" {
		normalized = strings.TrimSpace(slug)
	}
	return normalized
}

// CanonicalMenuItemPath canonicalizes a menu item path using go-cms semantics.
func CanonicalMenuItemPath(menuCode, raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	path, err := cms.CanonicalMenuItemPath(menuCode, trimmed)
	if err != nil {
		return ""
	}
	return path
}
