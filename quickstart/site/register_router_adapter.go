package site

import router "github.com/goliatone/go-router"

type siteAdminRouter[T any] struct {
	router router.Router[T]
}

func wrapSiteAdminRouter[T any](r router.Router[T]) SiteRouter {
	if r == nil {
		return nil
	}
	return siteAdminRouter[T]{router: r}
}

func (r siteAdminRouter[T]) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.router.Handle(method, path, handler, mw...)
}

func (r siteAdminRouter[T]) Group(prefix string) SiteRouter {
	return wrapSiteAdminRouter(r.router.Group(prefix))
}

func (r siteAdminRouter[T]) Mount(prefix string) SiteRouter {
	return wrapSiteAdminRouter(r.router.Mount(prefix))
}

func (r siteAdminRouter[T]) WithGroup(path string, cb func(SiteRouter)) SiteRouter {
	group := r.router.WithGroup(path, func(rg router.Router[T]) {
		if cb == nil {
			return
		}
		cb(wrapSiteAdminRouter(rg))
	})
	return wrapSiteAdminRouter(group)
}

func (r siteAdminRouter[T]) Use(m ...router.MiddlewareFunc) SiteRouter {
	return wrapSiteAdminRouter(r.router.Use(m...))
}

func (r siteAdminRouter[T]) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.router.Get(path, handler, mw...)
}

func (r siteAdminRouter[T]) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.router.Post(path, handler, mw...)
}

func (r siteAdminRouter[T]) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.router.Put(path, handler, mw...)
}

func (r siteAdminRouter[T]) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.router.Delete(path, handler, mw...)
}

func (r siteAdminRouter[T]) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.router.Patch(path, handler, mw...)
}

func (r siteAdminRouter[T]) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.router.Head(path, handler, mw...)
}
