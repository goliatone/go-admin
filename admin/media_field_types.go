package admin

import "strings"

func normalizeFieldTypeKey(raw string) string {
	normalized := strings.ToLower(strings.TrimSpace(raw))
	normalized = strings.ReplaceAll(normalized, "_", "-")
	return normalized
}

func canonicalMediaFieldType(raw string) string {
	switch normalizeFieldTypeKey(raw) {
	case "media", "media-picker":
		return "media-picker"
	case "media-gallery":
		return "media-gallery"
	default:
		return strings.TrimSpace(raw)
	}
}

func isMediaFieldType(raw string) bool {
	switch canonicalMediaFieldType(raw) {
	case "media-picker", "media-gallery":
		return true
	default:
		return false
	}
}

func isMediaGalleryFieldType(raw string) bool {
	return canonicalMediaFieldType(raw) == "media-gallery"
}
