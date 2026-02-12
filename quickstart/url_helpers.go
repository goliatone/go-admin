package quickstart

import (
	"path"
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

func resolveRouteURL(urls urlkit.Resolver, group, route string, params map[string]string, query map[string]string) string {
	if urls == nil {
		return ""
	}
	var typedParams urlkit.Params
	if len(params) > 0 {
		typedParams = urlkit.Params{}
		for key, value := range params {
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			typedParams[key] = strings.TrimSpace(value)
		}
	}
	var typedQuery urlkit.Query
	if len(query) > 0 {
		typedQuery = urlkit.Query{}
		for key, value := range query {
			key = strings.TrimSpace(key)
			value = strings.TrimSpace(value)
			if key == "" || value == "" {
				continue
			}
			typedQuery[key] = value
		}
	}
	resolved, err := urls.Resolve(strings.TrimSpace(group), strings.TrimSpace(route), typedParams, typedQuery)
	if err != nil {
		return ""
	}
	return resolved
}

func resolveAdminPanelURL(urls urlkit.Resolver, fallback, panel string) string {
	panel = strings.TrimSpace(panel)
	if panel == "" {
		return resolveAdminBasePath(urls, fallback)
	}
	for _, route := range panelRouteKeys(panel) {
		resolved := strings.TrimSpace(resolveRoutePath(urls, "admin", route))
		if resolved == "" || strings.Contains(resolved, ":") || strings.Contains(resolved, "*") {
			continue
		}
		return resolved
	}
	if resolved := resolveRouteURL(urls, "admin", "content.panel", map[string]string{"panel": panel}, nil); strings.TrimSpace(resolved) != "" {
		return resolved
	}
	return prefixBasePath(resolveAdminBasePath(urls, fallback), path.Join("content", panel))
}

func resolveAdminPanelDetailURL(urls urlkit.Resolver, fallback, panel, id string) string {
	panel = strings.TrimSpace(panel)
	id = strings.TrimSpace(id)
	if panel == "" {
		return ""
	}
	for _, route := range panelRouteKeys(panel) {
		resolved := resolveRouteURL(urls, "admin", route+".id", map[string]string{"id": id}, nil)
		if strings.TrimSpace(resolved) != "" {
			return resolved
		}
	}
	if resolved := resolveRouteURL(urls, "admin", "content.panel.id", map[string]string{"panel": panel, "id": id}, nil); strings.TrimSpace(resolved) != "" {
		return resolved
	}
	return prefixBasePath(resolveAdminBasePath(urls, fallback), path.Join("content", panel, id))
}

func resolveAdminPanelEditURL(urls urlkit.Resolver, fallback, panel, id string) string {
	detail := strings.TrimSpace(resolveAdminPanelDetailURL(urls, fallback, panel, id))
	if detail == "" {
		return ""
	}
	return prefixBasePath(detail, "edit")
}

func resolveAdminPanelPreviewURL(urls urlkit.Resolver, fallback, panel, id string) string {
	panel = strings.TrimSpace(panel)
	id = strings.TrimSpace(id)
	if panel == "" {
		return ""
	}
	if resolved := resolveRouteURL(urls, "admin", "content.panel.preview", map[string]string{"panel": panel, "id": id}, nil); strings.TrimSpace(resolved) != "" {
		return resolved
	}
	detail := strings.TrimSpace(resolveAdminPanelDetailURL(urls, fallback, panel, id))
	if detail == "" {
		return ""
	}
	return prefixBasePath(detail, "preview")
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
