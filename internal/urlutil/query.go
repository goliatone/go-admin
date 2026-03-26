package urlutil

import (
	"net/url"
	"strings"
)

// RawQueryFromOriginalURL extracts the raw query string from an original URL value.
func RawQueryFromOriginalURL(raw string) string {
	if raw == "" {
		return ""
	}
	if parsed, err := url.Parse(raw); err == nil {
		return parsed.RawQuery
	}
	if idx := strings.Index(raw, "?"); idx >= 0 && idx+1 < len(raw) {
		return raw[idx+1:]
	}
	return ""
}
