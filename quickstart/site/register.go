package site

import (
	"fmt"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// SiteOption customizes RegisterSiteRoutes behavior.
type SiteOption func(*siteRegisterOptions)

type siteRegisterOptions struct {
	searchProvider    admin.SearchProvider
	searchOperations  *admin.GoSearchOperations
	contentService    admin.CMSContentService
	contentTypeSvc    admin.CMSContentTypeService
	contentHandler    router.HandlerFunc
	searchHandler     router.HandlerFunc
	searchAPIHandler  router.HandlerFunc
	suggestAPIHandler router.HandlerFunc
}

// WithSearchProvider sets the search provider for optional search route wiring.
func WithSearchProvider(provider admin.SearchProvider) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		opts.searchProvider = provider
	}
}

// WithSearchOperations exposes optional search operations to site modules.
func WithSearchOperations(ops *admin.GoSearchOperations) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		opts.searchOperations = ops
	}
}

// WithDeliveryServices sets explicit content/content-type services for
// capability-driven site delivery handlers.
func WithDeliveryServices(contentSvc admin.CMSContentService, contentTypeSvc admin.CMSContentTypeService) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		if contentSvc != nil {
			opts.contentService = contentSvc
		}
		if contentTypeSvc != nil {
			opts.contentTypeSvc = contentTypeSvc
		}
	}
}

// WithContentHandler overrides the default catch-all site content handler.
func WithContentHandler(handler router.HandlerFunc) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil || handler == nil {
			return
		}
		opts.contentHandler = handler
	}
}

// WithSearchHandlers overrides default search page/api handlers.
func WithSearchHandlers(pageHandler, apiHandler router.HandlerFunc) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		if pageHandler != nil {
			opts.searchHandler = pageHandler
		}
		if apiHandler != nil {
			opts.searchAPIHandler = apiHandler
		}
	}
}

// WithSuggestHandler overrides the default search suggest handler.
func WithSuggestHandler(handler router.HandlerFunc) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil || handler == nil {
			return
		}
		opts.suggestAPIHandler = handler
	}
}

// RegisterSiteRoutes registers quickstart site routes with deterministic ordering.
func RegisterSiteRoutes[T any](
	r router.Router[T],
	adm *admin.Admin,
	cfg admin.Config,
	siteCfg SiteConfig,
	opts ...SiteOption,
) error {
	if r == nil {
		return fmt.Errorf("site router is required")
	}

	flow := resolveSiteRegisterFlow[T](adm, cfg, siteCfg, opts)
	return flow.register(r, adm, cfg)
}

func defaultNotFoundHandler(c router.Context) error {
	if c == nil {
		return nil
	}
	return c.SendStatus(404)
}

type siteAdminRouter[T any] struct {
	router router.Router[T]
}

func (r siteAdminRouter[T]) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.router.Handle(method, path, handler, mw...)
}

func (r siteAdminRouter[T]) Group(prefix string) SiteRouter {
	group := r.router.Group(prefix)
	if group == nil {
		return nil
	}
	return siteAdminRouter[T]{router: group}
}

func (r siteAdminRouter[T]) Mount(prefix string) SiteRouter {
	group := r.router.Mount(prefix)
	if group == nil {
		return nil
	}
	return siteAdminRouter[T]{router: group}
}

func (r siteAdminRouter[T]) WithGroup(path string, cb func(SiteRouter)) SiteRouter {
	group := r.router.WithGroup(path, func(rg router.Router[T]) {
		if cb == nil {
			return
		}
		cb(siteAdminRouter[T]{router: rg})
	})
	if group == nil {
		return nil
	}
	return siteAdminRouter[T]{router: group}
}

func (r siteAdminRouter[T]) Use(m ...router.MiddlewareFunc) SiteRouter {
	group := r.router.Use(m...)
	if group == nil {
		return nil
	}
	return siteAdminRouter[T]{router: group}
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
