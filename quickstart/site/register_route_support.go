package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func prefixedRoutePath(basePath, routePath string) string {
	routePath = strings.TrimSpace(routePath)
	if routePath == "" {
		routePath = "/"
	}
	if strings.HasPrefix(routePath, "http://") || strings.HasPrefix(routePath, "https://") || strings.HasPrefix(routePath, "//") {
		return routePath
	}
	if basePath == "" || basePath == "/" {
		if strings.HasPrefix(routePath, "/") {
			return routePath
		}
		return "/" + routePath
	}
	return admin.PrefixBasePath(basePath, routePath)
}

func siteCatchAllRoutePath[T any](r router.Router[T], basePath string) string {
	// go-router uses adapter-specific catch-all syntax:
	// - Fiber: "/*"
	// - HTTPRouter: "/*param"
	// Keep registration explicit so public site routes resolve across adapters.
	switch any(r).(type) {
	case *router.FiberRouter:
		return prefixedRoutePath(basePath, "/*")
	default:
		return prefixedRoutePath(basePath, "/*path")
	}
}

func isHTTPRouterAdapter[T any](r router.Router[T]) bool {
	switch any(r).(type) {
	case *router.HTTPRouter:
		return true
	default:
		return false
	}
}

func searchSuggestRoute(searchEndpoint string) string {
	searchEndpoint = strings.TrimSpace(searchEndpoint)
	if searchEndpoint == "" {
		searchEndpoint = DefaultSearchEndpoint
	}
	searchEndpoint = strings.TrimSuffix(searchEndpoint, "/")
	if searchEndpoint == "" {
		searchEndpoint = DefaultSearchEndpoint
	}
	if strings.HasSuffix(searchEndpoint, "/suggest") {
		return searchEndpoint
	}
	return searchEndpoint + "/suggest"
}
