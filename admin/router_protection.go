package admin

import router "github.com/goliatone/go-router"

type protectedAdminRouter struct {
	router     AdminRouter
	middleware router.MiddlewareFunc
}

func wrapAdminRouter(r AdminRouter, mw router.MiddlewareFunc) AdminRouter {
	if r == nil || mw == nil {
		return r
	}
	return protectedAdminRouter{
		router:     r,
		middleware: mw,
	}
}

func (r protectedAdminRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.router.Get(path, handler, r.withMiddleware(mw)...)
}

func (r protectedAdminRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.router.Post(path, handler, r.withMiddleware(mw)...)
}

func (r protectedAdminRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.router.Put(path, handler, r.withMiddleware(mw)...)
}

func (r protectedAdminRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.router.Delete(path, handler, r.withMiddleware(mw)...)
}

func (r protectedAdminRouter) withMiddleware(mw []router.MiddlewareFunc) []router.MiddlewareFunc {
	if r.middleware == nil {
		return mw
	}
	out := make([]router.MiddlewareFunc, 0, len(mw)+1)
	out = append(out, r.middleware)
	out = append(out, mw...)
	return out
}
