package site

import (
	"sort"
	"strings"
)

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
	if stripped, _ := StripSupportedLocalePrefix(currentPath, cfg.SupportedLocales); stripped != "" {
		currentPath = stripped
	}
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
			if localePathUnsafe(localizedPath) {
				// Ignore unsafe translated paths and keep the current in-site route.
			} else if candidate := normalizeLocalePath(localizedPath); candidate != "" {
				path = candidate
				if stripped, _ := StripSupportedLocalePrefix(path, cfg.SupportedLocales); stripped != "" {
					path = stripped
				}
			}
		}
		switcherQuery := localeSwitcherQuery(query, cfg, locale)
		url := LocalizedPathWithQuery(path, locale, cfg.DefaultLocale, cfg.LocalePrefixMode, switcherQuery)
		item := map[string]any{
			"locale":    locale,
			"url":       url,
			"active":    locale == resolvedLocale,
			"available": localeInMap(locale, availableSet),
		}
		items = append(items, item)
	}

	out := map[string]any{
		"requested_locale": requestedLocale,
		"resolved_locale":  resolvedLocale,
		"family_id":        strings.TrimSpace(translationGroupID),
		"items":            items,
	}
	if len(availableSet) > 0 {
		out["available_locales"] = mapKeysSorted(availableSet)
	}
	return out
}

func localeSwitcherQuery(base map[string]string, cfg ResolvedSiteConfig, targetLocale string) map[string]string {
	out := map[string]string{}
	for key, value := range base {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if strings.EqualFold(key, "locale") {
			continue
		}
		out[key] = strings.TrimSpace(value)
	}
	if localeSwitcherRequiresExplicitDefaultLocale(cfg, targetLocale) {
		out["locale"] = strings.ToLower(strings.TrimSpace(targetLocale))
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func localeSwitcherRequiresExplicitDefaultLocale(cfg ResolvedSiteConfig, targetLocale string) bool {
	targetLocale = strings.ToLower(strings.TrimSpace(targetLocale))
	defaultLocale := strings.ToLower(strings.TrimSpace(cfg.DefaultLocale))
	if targetLocale == "" || defaultLocale == "" || targetLocale != defaultLocale {
		return false
	}
	return normalizeLocalePrefixMode(cfg.LocalePrefixMode) == LocalePrefixNonDefault
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
