package admin

import (
	"strings"

	"github.com/goliatone/go-admin/admin/routing"
	urlkit "github.com/goliatone/go-urlkit"
)

var debugRouteResolverKeys = map[string]map[string]string{
	"admin.debug": {
		"index":      debugRouteKey,
		"ws":         debugWSRouteKey,
		"session.ws": debugSessionWSRouteKey,
		"repl.app":   debugREPLAppRouteKey,
		"repl.shell": debugREPLShellRouteKey,
	},
	"admin.debug.api": {
		"panels":                    debugPanelsRouteKey,
		"snapshot":                  debugSnapshotRouteKey,
		"sessions":                  debugSessionsRouteKey,
		"clear":                     debugClearRouteKey,
		"clear.panel":               debugClearPanelRouteKey,
		"doctor.action":             debugDoctorActionRouteKey,
		"errors":                    debugErrorsRouteKey,
		"dashboard":                 debugDashboardRouteKey,
		"dashboard.widgets":         debugDashboardWidgetsRouteKey,
		"dashboard.widget":          debugDashboardWidgetRouteKey,
		"dashboard.widgets.reorder": debugDashboardReorderRouteKey,
		"dashboard.widgets.refresh": debugDashboardRefreshRouteKey,
		"dashboard.preferences":     debugDashboardPrefsRouteKey,
		"dashboard.ws":              debugDashboardWSRouteKey,
	},
}

func adminBasePath(cfg Config) string {
	basePath := strings.TrimSpace(cfg.Routing.Roots.AdminRoot)
	if basePath == "" {
		basePath = strings.TrimSpace(cfg.URLs.Admin.BasePath)
	}
	if basePath == "" {
		basePath = normalizeBasePath(cfg.BasePath)
	}
	return normalizeBasePath(basePath)
}

func publicBasePath(cfg Config) string {
	basePath := strings.TrimSpace(cfg.Routing.Roots.PublicAPIRoot)
	if basePath == "" {
		basePath = strings.TrimSpace(cfg.URLs.Public.BasePath)
	}
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
	return routePathWithBase(a.urlManager, normalizeBasePath(a.config.Routing.Roots.APIRoot), adminAPIGroupName(a.config), route)
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
	if before, ok := strings.CutSuffix(errorsPath, "/errors"); ok {
		return before
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
	if path := debugPlannerRoutePath(a, group, route); path != "" {
		return path
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
	if path := debugPlannerRoutePath(a, "admin.debug", "index"); path != "" {
		return path
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
	if routeKey := debugRouteResolverKey(group, route); routeKey != "" {
		if resolved := resolveURLWith(urls, routing.DefaultUIGroupPath(), routeKey, nil, nil); resolved != "" {
			return resolved
		}
		if fallback := debugFallbackRoutePath(debugBase, routeKey); fallback != "" {
			return fallback
		}
	}
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

func debugPlannerRoutePath(a *Admin, group, route string) string {
	if a == nil || a.urlManager == nil {
		return ""
	}
	routeKey := debugRouteResolverKey(group, route)
	if routeKey == "" {
		return ""
	}
	return resolveURLWith(a.urlManager, routing.DefaultUIGroupPath(), routeKey, nil, nil)
}

func debugFallbackRoutePath(debugBase, routeKey string) string {
	relative := debugRouteRelativePath(routeKey)
	if relative == "" {
		return ""
	}
	debugBase = normalizeBasePath(debugBase)
	if relative == "/" {
		return debugBase
	}
	return joinBasePath(debugBase, strings.TrimPrefix(relative, "/"))
}

func debugRouteResolverKey(group, route string) string {
	group = strings.TrimSpace(group)
	route = strings.TrimSpace(route)
	routes, ok := debugRouteResolverKeys[group]
	if !ok {
		return ""
	}
	return strings.TrimSpace(routes[route])
}

func debugRouteRelativePath(routeKey string) string {
	return debugModuleRoutes()[strings.TrimSpace(routeKey)]
}
