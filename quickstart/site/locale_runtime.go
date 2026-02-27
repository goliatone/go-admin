package site

import (
	"net/url"
	"sort"
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

// BuildLocaleSwitcherContract returns a stable template contract for language
// switcher rendering, preserving translation-group identity metadata.
func BuildLocaleSwitcherContract(
	cfg ResolvedSiteConfig,
	currentPath string,
	requestedLocale string,
	resolvedLocale string,
	translationGroupID string,
	availableLocales []string,
	pathsByLocale map[string]string,
	query map[string]string,
) map[string]any {
	currentPath = normalizeLocalePath(currentPath)
	requestedLocale = normalizeRequestedLocale(requestedLocale, cfg.DefaultLocale, cfg.SupportedLocales)
	resolvedLocale = normalizeRequestedLocale(resolvedLocale, requestedLocale, cfg.SupportedLocales)
	availableSet := toLocaleSet(availableLocales)

	items := make([]map[string]any, 0, len(cfg.SupportedLocales))
	for _, locale := range cfg.SupportedLocales {
		locale = strings.ToLower(strings.TrimSpace(locale))
		if locale == "" {
			continue
		}
		path := currentPath
		if localizedPath := strings.TrimSpace(pathsByLocale[locale]); localizedPath != "" {
			path = normalizeLocalePath(localizedPath)
		}
		url := LocalizedPathWithQuery(path, locale, cfg.DefaultLocale, cfg.LocalePrefixMode, query)
		item := map[string]any{
			"locale":    locale,
			"url":       url,
			"active":    locale == resolvedLocale,
			"available": localeInMap(locale, availableSet),
		}
		items = append(items, item)
	}

	out := map[string]any{
		"requested_locale":     requestedLocale,
		"resolved_locale":      resolvedLocale,
		"translation_group_id": strings.TrimSpace(translationGroupID),
		"items":                items,
	}
	if len(availableSet) > 0 {
		out["available_locales"] = mapKeysSorted(availableSet)
	}
	return out
}

func normalizeLocalePath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return "/"
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	if len(path) > 1 {
		path = strings.TrimSuffix(path, "/")
		if path == "" {
			return "/"
		}
	}
	return path
}

func normalizeRequestedLocale(locale, fallback string, supported []string) string {
	if normalized := matchSupportedLocale(locale, supported); normalized != "" {
		return normalized
	}
	if normalized := matchSupportedLocale(fallback, supported); normalized != "" {
		return normalized
	}
	locale = strings.ToLower(strings.TrimSpace(locale))
	if locale != "" {
		return locale
	}
	return strings.ToLower(strings.TrimSpace(fallback))
}

func toLocaleSet(locales []string) map[string]struct{} {
	if len(locales) == 0 {
		return nil
	}
	out := map[string]struct{}{}
	for _, locale := range locales {
		locale = strings.ToLower(strings.TrimSpace(locale))
		if locale == "" {
			continue
		}
		out[locale] = struct{}{}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func localeInSet(locale string, supported []string) bool {
	locale = strings.ToLower(strings.TrimSpace(locale))
	if locale == "" || len(supported) == 0 {
		return false
	}
	for _, item := range supported {
		if strings.ToLower(strings.TrimSpace(item)) == locale {
			return true
		}
	}
	return false
}

func localeInMap(locale string, values map[string]struct{}) bool {
	if len(values) == 0 {
		return false
	}
	_, ok := values[strings.ToLower(strings.TrimSpace(locale))]
	return ok
}

func mapKeysSorted(values map[string]struct{}) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for key := range values {
		if strings.TrimSpace(key) == "" {
			continue
		}
		out = append(out, key)
	}
	sort.Strings(out)
	if len(out) == 0 {
		return nil
	}
	return out
}
