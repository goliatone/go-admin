package site

import (
	"io/fs"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func normalizedSearchIndexes(cfg SiteSearchConfig) []string {
	if len(cfg.Indexes) > 0 {
		return cloneStrings(cfg.Indexes)
	}
	return cloneStrings(cfg.Collections)
}

func compactFS(items []fs.FS) []fs.FS {
	if len(items) == 0 {
		return nil
	}
	out := make([]fs.FS, 0, len(items))
	for _, item := range items {
		if item == nil {
			continue
		}
		out = append(out, item)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func compactModules(items []SiteModule) []SiteModule {
	if len(items) == 0 {
		return nil
	}
	out := make([]SiteModule, 0, len(items))
	for _, item := range items {
		if item == nil {
			continue
		}
		out = append(out, item)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func uniqueLocalesPreserveOrder(locales []string, fallback string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(locales)+1)
	appendLocale := func(value string) {
		value = strings.ToLower(strings.TrimSpace(value))
		if value == "" {
			return
		}
		if _, ok := seen[value]; ok {
			return
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	appendLocale(fallback)
	for _, locale := range locales {
		appendLocale(locale)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeLocalePrefixMode(mode LocalePrefixMode) LocalePrefixMode {
	switch strings.ToLower(strings.TrimSpace(string(mode))) {
	case "", string(LocalePrefixNonDefault):
		return LocalePrefixNonDefault
	case string(LocalePrefixAlways), "always_prefixed":
		return LocalePrefixAlways
	default:
		return LocalePrefixNonDefault
	}
}

func normalizeCanonicalRedirectMode(mode CanonicalRedirectMode) CanonicalRedirectMode {
	switch strings.ToLower(strings.TrimSpace(string(mode))) {
	case "", string(CanonicalRedirectResolvedLocale):
		return CanonicalRedirectResolvedLocale
	case string(CanonicalRedirectRequestedLocaleSticky):
		return CanonicalRedirectRequestedLocaleSticky
	default:
		return CanonicalRedirectResolvedLocale
	}
}

func normalizeContributionLocalePolicy(policy string) string {
	switch strings.ToLower(strings.TrimSpace(policy)) {
	case ContributionLocalePolicyStrict:
		return ContributionLocalePolicyStrict
	default:
		return ContributionLocalePolicyFallback
	}
}

func normalizeRuntimeEnvironment(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "default":
		return ""
	case "dev", "development", "local", "test":
		return "dev"
	case "staging", "stage":
		return "staging"
	case "prod", "production":
		return "prod"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func normalizeContentChannel(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "default":
		return "default"
	case "dev", "development", "local", "test":
		return "dev"
	case "staging", "stage":
		return "staging"
	case "prod", "production":
		return "prod"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func normalizePath(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	return admin.NormalizeBasePath(trimmed)
}

func normalizePathOrDefault(path, fallback string) string {
	normalized := normalizePath(path)
	if normalized != "" {
		return normalized
	}
	return normalizePath(fallback)
}

func normalizeAssetPath(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") || strings.HasPrefix(trimmed, "//") {
		return strings.TrimSuffix(trimmed, "/")
	}
	return normalizePath(trimmed)
}

func cloneStatusTemplateMap(in map[int]string) map[int]string {
	if len(in) == 0 {
		return nil
	}
	out := make(map[int]string, len(in))
	for key, value := range in {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		out[key] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func cloneCodeTemplateMap(in map[string]string) map[string]string {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]string, len(in))
	for key, value := range in {
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" || value == "" {
			continue
		}
		out[key] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func mergeStatusTemplateMaps(parts ...map[int]string) map[int]string {
	out := map[int]string{}
	for _, part := range parts {
		for key, value := range part {
			value = strings.TrimSpace(value)
			if value == "" {
				continue
			}
			out[key] = value
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func mergeCodeTemplateMaps(parts ...map[string]string) map[string]string {
	out := map[string]string{}
	for _, part := range parts {
		for key, value := range part {
			key = strings.TrimSpace(key)
			value = strings.TrimSpace(value)
			if key == "" || value == "" {
				continue
			}
			out[key] = value
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func cloneStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func boolValue(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}
