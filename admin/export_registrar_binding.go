package admin

import (
	"github.com/goliatone/go-admin/admin/internal/boot"
	router "github.com/goliatone/go-router"
)

type exportRegistrarBinding struct {
	registrar ExportHTTPRegistrar
}

func newExportRegistrarBinding(a *Admin) boot.ExportRegistrar {
	if a == nil || a.exportRegistrar == nil {
		return nil
	}
	return &exportRegistrarBinding{registrar: a.exportRegistrar}
}

type adminRouterAdapter struct {
	router boot.Router
}

func (a adminRouterAdapter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return a.router.Get(path, handler, mw...)
}

func (a adminRouterAdapter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return a.router.Post(path, handler, mw...)
}

func (a adminRouterAdapter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return a.router.Put(path, handler, mw...)
}

func (a adminRouterAdapter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return a.router.Delete(path, handler, mw...)
}

func (e *exportRegistrarBinding) Register(r boot.Router, opts boot.ExportRouteOptions) error {
	if e == nil || e.registrar == nil || r == nil {
		return nil
	}
	return e.registrar.RegisterExportRoutes(adminRouterAdapter{router: r}, ExportRouteOptions{
		BasePath: opts.BasePath,
		Wrap:     adaptExportWrapper(opts.Wrap),
	})
}

func adaptExportWrapper(wrap boot.HandlerWrapper) ExportRouteWrapper {
	if wrap == nil {
		return nil
	}
	return func(handler router.HandlerFunc) router.HandlerFunc {
		return wrap(handler)
	}
}
