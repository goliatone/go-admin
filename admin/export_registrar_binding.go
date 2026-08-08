package admin

import (
	"strings"

	"github.com/goliatone/go-admin/admin/internal/boot"
	router "github.com/goliatone/go-router"
)

type exportRegistrarBinding struct {
	admin     *Admin
	registrar ExportHTTPRegistrar
}

func newExportRegistrarBinding(a *Admin) boot.ExportRegistrar {
	if a == nil || a.exportRegistrar == nil {
		return nil
	}
	return &exportRegistrarBinding{admin: a, registrar: a.exportRegistrar}
}

type adminRouterAdapter struct {
	router        boot.Router
	registrations *[]exportRouteRegistration
}

type exportRouteRegistration struct {
	method router.HTTPMethod
	path   string
}

func (a adminRouterAdapter) record(method router.HTTPMethod, path string) {
	if a.registrations == nil {
		return
	}
	*a.registrations = append(*a.registrations, exportRouteRegistration{method: method, path: path})
}

func (a adminRouterAdapter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	a.record(method, path)
	return a.router.Handle(method, path, handler, mw...)
}

func (a adminRouterAdapter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	a.record(router.GET, path)
	return a.router.Get(path, handler, mw...)
}

func (a adminRouterAdapter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	a.record(router.POST, path)
	return a.router.Post(path, handler, mw...)
}

func (a adminRouterAdapter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	a.record(router.PUT, path)
	return a.router.Put(path, handler, mw...)
}

func (a adminRouterAdapter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	a.record(router.DELETE, path)
	return a.router.Delete(path, handler, mw...)
}

func (a adminRouterAdapter) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	a.record(router.PATCH, path)
	return a.router.Patch(path, handler, mw...)
}

func (a adminRouterAdapter) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	a.record(router.HEAD, path)
	return a.router.Head(path, handler, mw...)
}

func (e *exportRegistrarBinding) Register(r boot.Router, opts boot.ExportRouteOptions) error {
	if e == nil || e.registrar == nil || r == nil {
		return nil
	}
	registrations := []exportRouteRegistration{}
	err := e.registrar.RegisterExportRoutes(adminRouterAdapter{router: r, registrations: &registrations}, ExportRouteOptions{
		BasePath: opts.BasePath,
		Wrap:     adaptExportWrapper(opts.Wrap),
	})
	if err != nil {
		return err
	}
	if endpoint := registeredExportEndpoint(registrations); endpoint != "" {
		e.admin.recordExportRoutesAvailable(endpoint)
	}
	return nil
}

// registeredExportEndpoint derives the collection endpoint from the routes the
// registrar actually mounted. Export registrars own their path layout, so the
// shortest POST path is the collection route and remains correct for custom
// base paths and suffixes.
func registeredExportEndpoint(registrations []exportRouteRegistration) string {
	endpoint := ""
	for _, registration := range registrations {
		if registration.method != router.POST {
			continue
		}
		path := strings.TrimSpace(registration.path)
		if path == "" {
			continue
		}
		if path != "/" {
			path = strings.TrimRight(path, "/")
		}
		if endpoint == "" || len(path) < len(endpoint) {
			endpoint = path
		}
	}
	return endpoint
}

func adaptExportWrapper(wrap boot.HandlerWrapper) ExportRouteWrapper {
	if wrap == nil {
		return nil
	}
	return func(handler router.HandlerFunc) router.HandlerFunc {
		return wrap(handler)
	}
}
