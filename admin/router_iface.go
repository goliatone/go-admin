package admin

import router "github.com/goliatone/go-router"

// AdminRouter exposes an expressive routing surface used by admin and quickstart.
type AdminRouter interface {
	Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
	Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
	Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
	Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
	Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
	Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
	Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
}

// AdminStaticRouter extends AdminRouter with typed static asset registration.
type AdminStaticRouter[T any] interface {
	AdminRouter
	Static(prefix, root string, config ...router.Static) router.Router[T]
}

// DashboardAssetOwnershipProvider is an optional router capability for hosts
// that mount go-dashboard's embedded assets on a dedicated static surface.
// Admin dashboard initialization uses it to avoid registering duplicate static
// routes through the admin surface.
type DashboardAssetOwnershipProvider interface {
	DashboardAssetsManagedExternally() bool
}
