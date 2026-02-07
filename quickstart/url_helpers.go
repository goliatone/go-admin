package quickstart

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	urlkit "github.com/goliatone/go-urlkit"
)

func resolveURL(urls urlkit.Resolver, group, route string) string {
	if urls == nil {
		return ""
	}
	path, err := urls.Resolve(group, route, nil, nil)
	if err != nil {
		return ""
	}
	return path
}

func resolveRoutePath(urls urlkit.Resolver, group, route string) string {
	return resolveURL(urls, group, route)
}

func resolveAdminBasePath(urls urlkit.Resolver, fallback string) string {
	if path := resolveRoutePath(urls, "admin", "dashboard"); path != "" {
		return trimTrailingSlash(path)
	}
	return normalizeBasePathValue(fallback)
}

func resolveAdminBaseURL(urls urlkit.Resolver, fallback string) string {
	if path := resolveURL(urls, "admin", "dashboard"); path != "" {
		return trimTrailingSlash(path)
	}
	return resolveAdminBasePath(urls, fallback)
}

func resolveAdminRoutePath(urls urlkit.Resolver, fallback, route string) string {
	if path := resolveRoutePath(urls, "admin", route); path != "" {
		return path
	}
	return prefixBasePath(normalizeBasePathValue(fallback), route)
}

func resolveAdminURL(urls urlkit.Resolver, fallback, path string) string {
	basePath := resolveAdminBaseURL(urls, fallback)
	return prefixBasePath(basePath, path)
}

func normalizeBasePathValue(basePath string) string {
	return admin.NormalizeBasePath(basePath)
}

func trimTrailingSlash(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" || trimmed == "/" {
		return trimmed
	}
	return strings.TrimSuffix(trimmed, "/")
}

func prefixBasePath(basePath, suffix string) string {
	trimmed := strings.TrimSpace(suffix)
	if trimmed == "" {
		return strings.TrimSpace(basePath)
	}
	if isAbsoluteURL(trimmed) {
		return trimmed
	}

	basePath = strings.TrimSpace(basePath)
	if basePath == "" || basePath == "/" {
		if strings.HasPrefix(trimmed, "/") {
			return trimmed
		}
		return "/" + trimmed
	}

	if isAbsoluteURL(basePath) {
		basePath = strings.TrimSuffix(basePath, "/")
		return basePath + "/" + strings.TrimPrefix(trimmed, "/")
	}

	basePath = normalizeBasePathValue(basePath)
	return admin.PrefixBasePath(basePath, trimmed)
}

func isAbsoluteURL(path string) bool {
	return strings.HasPrefix(path, "http://") ||
		strings.HasPrefix(path, "https://") ||
		strings.HasPrefix(path, "//")
}
