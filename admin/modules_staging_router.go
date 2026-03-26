package admin

import router "github.com/goliatone/go-router"

type stagedRouteRegistration struct {
	method  router.HTTPMethod
	path    string
	handler router.HandlerFunc
	mw      []router.MiddlewareFunc
}

type stagedAdminRouter struct {
	target AdminRouter
	routes []stagedRouteRegistration
}

func newStagedAdminRouter(target AdminRouter) *stagedAdminRouter {
	return &stagedAdminRouter{target: target}
}

func (r *stagedAdminRouter) Commit() {
	if r == nil || r.target == nil || len(r.routes) == 0 {
		return
	}
	for _, route := range r.routes {
		r.target.Handle(route.method, route.path, route.handler, route.mw...)
	}
	r.routes = nil
}

func (r *stagedAdminRouter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	if r == nil {
		return nil
	}
	r.routes = append(r.routes, stagedRouteRegistration{
		method:  method,
		path:    path,
		handler: handler,
		mw:      append([]router.MiddlewareFunc(nil), mw...),
	})
	return nil
}

func (r *stagedAdminRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.Handle(router.GET, path, handler, mw...)
}

func (r *stagedAdminRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.Handle(router.POST, path, handler, mw...)
}

func (r *stagedAdminRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.Handle(router.PUT, path, handler, mw...)
}

func (r *stagedAdminRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.Handle(router.DELETE, path, handler, mw...)
}

func (r *stagedAdminRouter) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.Handle(router.PATCH, path, handler, mw...)
}

func (r *stagedAdminRouter) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.Handle(router.HEAD, path, handler, mw...)
}
