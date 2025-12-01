package admin

import router "github.com/goliatone/go-router"

// AdminRouter is the minimal subset of go-router Router needed by admin.
type AdminRouter interface {
	Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
	Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
	Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
}
