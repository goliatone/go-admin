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
