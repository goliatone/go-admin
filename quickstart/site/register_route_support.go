package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type routerAdapterUnwrapper interface {
	UnderlyingRouter() any
}

type siteRouteSurfaceProvider[T any] interface {
	PublicSiteRouter() router.Router[T]
	PublicAPIRouter() router.Router[T]
}

type siteRouteTargets[T any] struct {
	site                  router.Router[T]
	publicAPI             router.Router[T]
	hasDedicatedPublicAPI bool
}

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
	switch unwrapRouterAdapter(any(r)).(type) {
	case *router.FiberRouter:
		return prefixedRoutePath(basePath, "/*")
	default:
		return prefixedRoutePath(basePath, "/*path")
	}
}

func isHTTPRouterAdapter[T any](r router.Router[T]) bool {
	switch unwrapRouterAdapter(any(r)).(type) {
	case *router.HTTPRouter:
		return true
	default:
		return false
	}
}

func unwrapRouterAdapter(value any) any {
	for value != nil {
		unwrapper, ok := value.(routerAdapterUnwrapper)
		if !ok {
			return value
		}
		next := unwrapper.UnderlyingRouter()
		if next == nil || next == value {
			return value
		}
		value = next
	}
	return nil
}

func resolveSiteRouteTargets[T any](r router.Router[T]) siteRouteTargets[T] {
	targets := siteRouteTargets[T]{site: r}
	provider, ok := any(r).(siteRouteSurfaceProvider[T])
	if !ok || provider == nil {
		return targets
	}

	siteRouter := provider.PublicSiteRouter()
	if siteRouter == nil {
		siteRouter = r
	}
	targets.site = siteRouter

	if publicAPIRouter := provider.PublicAPIRouter(); publicAPIRouter != nil {
		targets.publicAPI = publicAPIRouter
		targets.hasDedicatedPublicAPI = true
	}

	return targets
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
