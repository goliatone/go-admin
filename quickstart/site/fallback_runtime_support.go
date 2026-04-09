package site

import (
	"net/http"
	"strings"

	router "github.com/goliatone/go-router"
)

func requestPathForSiteResolution(c router.Context, siteCfg ResolvedSiteConfig) string {
	path, _ := requestPathForSiteFallback(c, siteCfg)
	return path
}

func requestPathForSiteFallback(c router.Context, siteCfg ResolvedSiteConfig) (string, bool) {
	if c == nil {
		return "/", normalizeLocalePath(siteCfg.BasePath) == "/"
	}

	path := strings.TrimSpace(c.Path())
	path = normalizeLocalePath(path)
	basePath := normalizeLocalePath(siteCfg.BasePath)
	if basePath != "/" {
		switch {
		case path == basePath:
			path = "/"
		case strings.HasPrefix(path, basePath+"/"):
			path = normalizeLocalePath(strings.TrimPrefix(path, basePath))
		default:
			return path, false
		}
	}
	if siteCfg.Features.EnableI18N {
		if stripped, _ := StripSupportedLocalePrefix(path, siteCfg.SupportedLocales); stripped != "" {
			path = stripped
		}
	}
	path = normalizeLocalePath(path)
	if path == "" {
		return "/", true
	}
	return path, true
}

func fallbackContentHandler(siteCfg ResolvedSiteConfig, policy SiteFallbackPolicy, handler router.HandlerFunc) router.HandlerFunc {
	if handler == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return handler(c)
		}
		method := normalizeFallbackRequestMethod(c.Method())
		requestPath, withinBasePath := requestPathForSiteFallback(c, siteCfg)
		if !withinBasePath {
			return defaultNotFoundHandler(c)
		}
		if !siteFallbackAllowsRequest(policy, method, requestPath) {
			return defaultNotFoundHandler(c)
		}
		return handler(c)
	}
}

func fallbackMissHandler(siteCfg ResolvedSiteConfig, policy SiteFallbackPolicy, handler router.HandlerFunc) router.HandlerFunc {
	if handler == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return handler(c)
		}
		method := normalizeFallbackRequestMethod(c.Method())
		requestPath, withinBasePath := requestPathForSiteFallback(c, siteCfg)
		if !withinBasePath {
			return defaultNotFoundHandler(c)
		}
		if siteFallbackAllowsRequest(policy, method, requestPath) {
			return handler(c)
		}
		if siteFallbackAllowsPath(policy, requestPath) {
			return c.SendStatus(http.StatusMethodNotAllowed)
		}
		return defaultNotFoundHandler(c)
	}
}

func siteFallbackRoutePaths[T any](r router.Router[T], basePath string) []string {
	if isHTTPRouterAdapter(r) {
		return []string{
			prefixedRoutePath(basePath, "/:path"),
			prefixedRoutePath(basePath, "/:path/*rest"),
		}
	}
	return []string{siteCatchAllRoutePath(r, basePath)}
}

func sitePrefixRoutePaths[T any](r router.Router[T], basePath, prefix string) []string {
	prefix = normalizePath(prefix)
	if prefix == "" || prefix == "/" {
		return nil
	}
	out := []string{prefixedRoutePath(basePath, prefix)}
	if isHTTPRouterAdapter(r) {
		out = append(out,
			prefixedRoutePath(basePath, prefix+"/:path"),
			prefixedRoutePath(basePath, prefix+"/:path/*rest"),
		)
	} else {
		out = append(out, prefixedRoutePath(basePath, prefix+"/*"))
	}
	return out
}

func registerSiteFallbackMissHandlers[T any](r router.Router[T], handler router.HandlerFunc) bool {
	registrar, ok := any(r).(router.MissHandlerRegistrar)
	if !ok || handler == nil {
		return false
	}
	for _, method := range []router.HTTPMethod{
		router.GET,
		router.HEAD,
		router.POST,
		router.PUT,
		router.PATCH,
		router.DELETE,
	} {
		registrar.HandleMiss(method, handler)
	}
	return true
}

func registerSiteFallbackRouteMethods[T any](r router.Router[T], policy SiteFallbackPolicy, routePath string, handler router.HandlerFunc) {
	if strings.TrimSpace(routePath) == "" || handler == nil {
		return
	}
	if siteFallbackAllowsMethod(policy, string(router.GET)) {
		r.Get(routePath, handler)
	}
	if siteFallbackAllowsMethod(policy, string(router.HEAD)) {
		r.Head(routePath, handler)
	}
}

func uniqueRoutePaths(paths []string) []string {
	if len(paths) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(paths))
	for _, candidate := range paths {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		if _, ok := seen[candidate]; ok {
			continue
		}
		seen[candidate] = struct{}{}
		out = append(out, candidate)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
