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
	requestedLocale = normalizeRequestedLocale(requestedLocale, cfg.DefaultLocale, cfg.SupportedLocales)
	resolvedLocale = normalizeRequestedLocale(resolvedLocale, requestedLocale, cfg.SupportedLocales)
	availableSet := toLocaleSet(availableLocales)

	items := make([]map[string]any, 0, len(cfg.SupportedLocales))
	for _, locale := range cfg.SupportedLocales {
		locale = strings.ToLower(strings.TrimSpace(locale))
		if locale == "" {
			continue
		}
		path, usedExplicitPath := localizedPublicPathForLocale(
			cfg,
			currentPath,
			locale,
			pathsByLocale,
		)
		switcherQuery := localeSwitcherQuery(query, cfg, locale)
		url := path
		if url == "" {
			url = ""
		} else if !usedExplicitPath {
			url = LocalizedPathWithQuery(path, locale, cfg.DefaultLocale, cfg.LocalePrefixMode, switcherQuery)
		} else if len(switcherQuery) > 0 {
			url = LocalizedPathWithQuery(path, "", cfg.DefaultLocale, cfg.LocalePrefixMode, switcherQuery)
		}
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

func localizedPublicPathForLocale(cfg ResolvedSiteConfig, currentPath, targetLocale string, pathsByLocale map[string]string) (string, bool) {
	targetLocale = normalizeRequestedLocale(targetLocale, cfg.DefaultLocale, cfg.SupportedLocales)
	if targetLocale == "" {
		return "", false
	}
	if localizedPath := strings.TrimSpace(pathsByLocale[targetLocale]); localizedPath != "" {
		if !localePathUnsafe(localizedPath) {
			if candidate := normalizeLocalePath(localizedPath); candidate != "" {
				return localizedPublicPathForStoredPath(
					candidate,
					targetLocale,
					cfg.DefaultLocale,
					cfg.LocalePrefixMode,
					cfg.SupportedLocales,
				), true
			}
		}
	}
	if cfg.Features.StrictLocalizedPaths {
		return "", false
	}
	seed := localizedPublicPathFallbackSeed(cfg, currentPath, pathsByLocale)
	if seed == "" {
		return "", false
	}
	return seed, false
}

func localizedPublicPathFallbackSeed(cfg ResolvedSiteConfig, currentPath string, pathsByLocale map[string]string) string {
	defaultLocale := normalizeRequestedLocale(cfg.DefaultLocale, cfg.DefaultLocale, cfg.SupportedLocales)
	if defaultLocale != "" {
		if candidate := strings.TrimSpace(pathsByLocale[defaultLocale]); candidate != "" && !localePathUnsafe(candidate) {
			if normalizedPath := normalizeLocalePath(candidate); normalizedPath != "" {
				return normalizedPath
			}
		}
	}
	if normalizedCurrent := normalizeLocalePath(currentPath); normalizedCurrent != "" {
		return normalizedCurrent
	}
	for _, candidate := range pathsByLocale {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" || localePathUnsafe(candidate) {
			continue
		}
		if normalized := normalizeLocalePath(candidate); normalized != "" {
			return normalized
		}
	}
	return ""
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
