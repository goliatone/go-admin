package admin

import (
	"strings"

	urlkit "github.com/goliatone/go-urlkit"
)

func adminBasePath(cfg Config) string {
	basePath := strings.TrimSpace(cfg.URLs.Admin.BasePath)
	if basePath == "" {
		basePath = normalizeBasePath(cfg.BasePath)
	}
	return normalizeBasePath(basePath)
}

func publicBasePath(cfg Config) string {
	basePath := strings.TrimSpace(cfg.URLs.Public.BasePath)
	return normalizeBasePath(basePath)
}

func adminRoutePath(a *Admin, route string) string {
	if a == nil {
		return ""
	}
	return routePathWithBase(a.urlManager, adminBasePath(a.config), "admin", route)
}

func adminAPIRoutePath(a *Admin, route string) string {
	if a == nil {
		return ""
	}
	return routePathWithBase(a.urlManager, adminBasePath(a.config), adminAPIGroupName(a.config), route)
}

func adminAPIBasePath(a *Admin) string {
	if a == nil {
		return ""
	}
	errorsPath := adminAPIRoutePath(a, "errors")
	if errorsPath == "" {
		return ""
	}
	errorsPath = strings.TrimSpace(errorsPath)
	if strings.HasSuffix(errorsPath, "/errors") {
		return strings.TrimSuffix(errorsPath, "/errors")
	}
	return strings.TrimSuffix(errorsPath, "/")
}

func publicAPIRoutePath(a *Admin, route string) string {
	if a == nil {
		return ""
	}
	return routePathWithBase(a.urlManager, publicBasePath(a.config), publicAPIGroupName(a.config), route)
}

func debugRoutePath(a *Admin, cfg DebugConfig, group, route string) string {
	if a == nil {
		return ""
	}
	return debugRoutePathWithBase(a.urlManager, debugBasePath(a, cfg), group, route)
}

func debugAPIRoutePath(a *Admin, cfg DebugConfig, route string) string {
	return debugRoutePath(a, cfg, "admin.debug.api", route)
}

func debugBasePath(a *Admin, cfg DebugConfig) string {
	if a == nil {
		return ""
	}
	return normalizeDebugConfig(cfg, adminBasePath(a.config)).BasePath
}

func routePathWithBase(urls urlkit.Resolver, basePath, group, route string) string {
	path := routePathRaw(urls, group, route)
	if path == "" {
		return ""
	}
	return prefixBasePath(basePath, path)
}

func routePathRaw(urls urlkit.Resolver, group, route string) string {
	manager, ok := urls.(*urlkit.RouteManager)
	if !ok || manager == nil {
		return ""
	}
	path, err := manager.RoutePath(group, route)
	if err != nil {
		return ""
	}
	return path
}

func resolveURL(urls urlkit.Resolver, group, route string, params urlkit.Params, query urlkit.Query) string {
	if urls == nil {
		return ""
	}
	path, err := urls.Resolve(group, route, params, query)
	if err != nil {
		return ""
	}
	return path
}

func resolveURLWith(urls urlkit.Resolver, group, route string, params any, query any) string {
	if urls == nil {
		return ""
	}
	if manager, ok := urls.(*urlkit.RouteManager); ok && manager != nil {
		path, err := manager.ResolveWith(group, route, params, query)
		if err == nil {
			return path
		}
		return ""
	}
	if params == nil && query == nil {
		return resolveURL(urls, group, route, nil, nil)
	}
	typedParams, ok := params.(urlkit.Params)
	if !ok && params != nil {
		return ""
	}
	typedQuery, ok := query.(urlkit.Query)
	if !ok && query != nil {
		return ""
	}
	return resolveURL(urls, group, route, typedParams, typedQuery)
}

func debugRoutePathWithBase(urls urlkit.Resolver, debugBase, group, route string) string {
	if urls == nil {
		return ""
	}
	raw := routePathRaw(urls, group, route)
	if raw == "" {
		return ""
	}
	debugBase = normalizeBasePath(debugBase)
	if debugBase == "" {
		return raw
	}
	debugPrefix := strings.TrimSuffix(routePathRaw(urls, "admin.debug", "index"), "/")
	if debugPrefix != "" && strings.HasPrefix(raw, debugPrefix) {
		suffix := strings.TrimPrefix(raw, debugPrefix)
		return joinBasePath(debugBase, suffix)
	}
	return joinBasePath(debugBase, raw)
}

func prefixBasePath(basePath, routePath string) string {
	routePath = strings.TrimSpace(routePath)
	if routePath == "" {
		return ""
	}
	routePath = ensureLeadingSlashPath(routePath)
	basePath = normalizeBasePath(basePath)
	if basePath == "" || basePath == "/" {
		return routePath
	}
	if routePath == basePath || strings.HasPrefix(routePath, basePath+"/") {
		return routePath
	}
	return joinBasePath(basePath, routePath)
}

func joinBasePath(basePath, routePath string) string {
	basePath = normalizeBasePath(basePath)
	if basePath == "" || basePath == "/" {
		return ensureLeadingSlashPath(routePath)
	}
	trimmed := strings.TrimPrefix(strings.TrimSpace(routePath), "/")
	if trimmed == "" {
		return basePath
	}
	return basePath + "/" + trimmed
}

func ensureLeadingSlashPath(path string) string {
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "/") {
		return path
	}
	return "/" + path
}
