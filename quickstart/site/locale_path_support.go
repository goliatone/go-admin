package site

import (
	"net/url"
	pathpkg "path"
	"strings"
)

// LocalizedPath rewrites a canonical path using the configured locale prefix policy.
func LocalizedPath(path, locale, defaultLocale string, mode LocalePrefixMode) string {
	path = normalizeLocalePath(path)
	locale = strings.ToLower(strings.TrimSpace(locale))
	defaultLocale = strings.ToLower(strings.TrimSpace(defaultLocale))
	if locale == "" {
		return path
	}

	switch normalizeLocalePrefixMode(mode) {
	case LocalePrefixAlways:
		if path == "/" {
			return "/" + locale
		}
		return "/" + locale + path
	default:
		if defaultLocale != "" && locale == defaultLocale {
			return path
		}
		if path == "/" {
			return "/" + locale
		}
		return "/" + locale + path
	}
}

// localizedPublicPathForStoredPath derives the public URL path for a stored
// record path without assuming storage is always canonical/unlocalized.
//
// V1 compatibility note: this is temporary bridge logic for mixed datasets that
// still persist legacy locale-prefixed public paths. V2 should remove this
// compatibility branch once storage has been normalized and route identity no
// longer relies on path heuristics.
//
// If the stored path is already prefixed for the target locale, keep it as-is
// to avoid double-prefixing. Prefixes for other locales are ambiguous and are
// treated as ordinary path segments so canonical paths like /bo remain valid.
func localizedPublicPathForStoredPath(path, targetLocale, defaultLocale string, mode LocalePrefixMode, supported []string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	path = normalizeLocalePath(path)

	targetLocale = strings.ToLower(strings.TrimSpace(targetLocale))
	defaultLocale = strings.ToLower(strings.TrimSpace(defaultLocale))
	if targetLocale == "" {
		return path
	}

	canonical, prefixLocale := StripSupportedLocalePrefix(path, supported)
	if prefixLocale == "" {
		return LocalizedPath(path, targetLocale, defaultLocale, mode)
	}
	if prefixLocale != targetLocale {
		return LocalizedPath(path, targetLocale, defaultLocale, mode)
	}
	emitLocalePathBridgeDiagnostic(LocalePathBridgeDiagnostic{
		StoredPath:     path,
		TargetLocale:   targetLocale,
		DetectedLocale: prefixLocale,
		Reason:         "stored path already includes runtime locale prefix",
	})
	if normalizeLocalePrefixMode(mode) == LocalePrefixNonDefault && targetLocale == defaultLocale {
		return LocalizedPath(canonical, targetLocale, defaultLocale, mode)
	}
	return path
}

// StripSupportedLocalePrefix removes a locale segment prefix from path when it
// matches one of the configured locales.
func StripSupportedLocalePrefix(path string, supported []string) (string, string) {
	path = normalizeLocalePath(path)
	if path == "/" {
		return path, ""
	}

	trimmed := strings.Trim(path, "/")
	segments := strings.Split(trimmed, "/")
	if len(segments) == 0 {
		return path, ""
	}

	first := strings.ToLower(strings.TrimSpace(segments[0]))
	if first == "" {
		return path, ""
	}
	if !localeInSet(first, supported) {
		return path, ""
	}

	if len(segments) == 1 {
		return "/", first
	}
	return "/" + strings.Join(segments[1:], "/"), first
}

// LocalizedPathWithQuery rewrites a path and preserves query params.
func LocalizedPathWithQuery(path, locale, defaultLocale string, mode LocalePrefixMode, query map[string]string) string {
	localized := LocalizedPath(path, locale, defaultLocale, mode)
	if len(query) == 0 {
		return localized
	}
	values := url.Values{}
	for key, value := range query {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		values.Set(key, value)
	}
	if len(values) == 0 {
		return localized
	}
	return localized + "?" + values.Encode()
}

func normalizeLocalePath(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "/"
	}
	if idx := strings.IndexAny(value, "?#"); idx >= 0 {
		value = strings.TrimSpace(value[:idx])
	}
	if value == "" || localePathUnsafe(value) {
		return "/"
	}
	return cleanLocalePath("/" + strings.TrimLeft(value, "/"))
}

func cleanLocalePath(value string) string {
	cleaned := pathpkg.Clean(value)
	if !strings.HasPrefix(cleaned, "/") {
		cleaned = "/" + cleaned
	}
	if cleaned == "." || cleaned == "" {
		return "/"
	}
	if len(cleaned) > 1 {
		cleaned = strings.TrimSuffix(cleaned, "/")
	}
	if cleaned == "" {
		return "/"
	}
	return cleaned
}

func localePathUnsafe(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" {
		return false
	}
	lower := strings.ToLower(value)
	if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") || strings.HasPrefix(value, "//") {
		return true
	}
	if strings.Contains(value, "\\") {
		return true
	}
	for segment := range strings.SplitSeq(strings.Trim(value, "/"), "/") {
		if segment == "." || segment == ".." {
			return true
		}
	}
	return false
}
