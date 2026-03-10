package site

import (
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// SiteOption customizes RegisterSiteRoutes behavior.
type SiteOption func(*siteRegisterOptions)

type siteRegisterOptions struct {
	searchProvider    admin.SearchProvider
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

	resolved := ResolveSiteConfig(cfg, siteCfg)
	modules := compactModules(resolved.Modules)

	options := siteRegisterOptions{}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	if options.contentHandler == nil {
		contentSvc := options.contentService
		contentTypeSvc := options.contentTypeSvc
		if contentSvc == nil && adm != nil {
			contentSvc = adm.ContentService()
		}
		if contentTypeSvc == nil && adm != nil {
			contentTypeSvc = adm.ContentTypeService()
		}
		if runtime := newDeliveryRuntime(resolved, adm, contentSvc, contentTypeSvc); runtime != nil {
			options.contentHandler = runtime.Handler()
		}
	}
	if options.contentHandler == nil {
		options.contentHandler = defaultNotFoundHandler
	}

	if options.searchProvider != nil {
		if runtime := newSearchRuntime(resolved, options.searchProvider, modules); runtime != nil {
			if options.searchHandler == nil {
				options.searchHandler = runtime.PageHandler()
			}
			if options.searchAPIHandler == nil {
				options.searchAPIHandler = runtime.APIHandler()
			}
			if options.suggestAPIHandler == nil {
				options.suggestAPIHandler = runtime.SuggestAPIHandler()
			}
		}
	}
	if options.searchHandler == nil {
		options.searchHandler = defaultNotFoundHandler
	}
	if options.searchAPIHandler == nil {
		options.searchAPIHandler = defaultNotFoundHandler
	}
	if options.suggestAPIHandler == nil {
		options.suggestAPIHandler = defaultNotFoundHandler
	}

	r.Use(requestContextMiddleware(adm, cfg, resolved, modules))

	moduleCtx := SiteModuleContext{
		Admin:          adm,
		Router:         siteAdminRouter[T]{router: r},
		BasePath:       resolved.BasePath,
		DefaultLocale:  resolved.DefaultLocale,
		ThemeEnabled:   resolved.Features.EnableTheme,
		SearchProvider: options.searchProvider,
	}
	for _, module := range modules {
		if module == nil {
			continue
		}
		if err := module.RegisterRoutes(moduleCtx); err != nil {
			moduleID := strings.TrimSpace(module.ID())
			if moduleID == "" {
				moduleID = "unknown"
			}
			return fmt.Errorf("register site module %q routes: %w", moduleID, err)
		}
	}

	if resolved.Features.EnableSearch && options.searchProvider != nil {
		searchPath := prefixedRoutePath(resolved.BasePath, resolved.Search.Route)
		searchAPIPath := prefixedRoutePath("", resolved.Search.Endpoint)
		suggestAPIPath := prefixedRoutePath("", searchSuggestRoute(resolved.Search.Endpoint))
		r.Get(searchPath, options.searchHandler)
		r.Get(searchAPIPath, options.searchAPIHandler)
		r.Get(suggestAPIPath, options.suggestAPIHandler)
	}

	baseRoutePath := prefixedRoutePath(resolved.BasePath, "/")
	r.Get(baseRoutePath, options.contentHandler)

	if isHTTPRouterAdapter(r) {
		r.Get(prefixedRoutePath(resolved.BasePath, "/:path"), options.contentHandler)
		r.Get(prefixedRoutePath(resolved.BasePath, "/:path/*rest"), options.contentHandler)
	} else {
		catchAllPath := siteCatchAllRoutePath(r, resolved.BasePath)
		r.Get(catchAllPath, options.contentHandler)
	}

	return nil
}

func defaultNotFoundHandler(c router.Context) error {
	if c == nil {
		return nil
	}
	return c.SendStatus(404)
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
	switch any(r).(type) {
	case *router.FiberRouter:
		return prefixedRoutePath(basePath, "/*")
	default:
		return prefixedRoutePath(basePath, "/*path")
	}
}

func isHTTPRouterAdapter[T any](r router.Router[T]) bool {
	switch any(r).(type) {
	case *router.HTTPRouter:
		return true
	default:
		return false
	}
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

type siteAdminRouter[T any] struct {
	router router.Router[T]
}

func (r siteAdminRouter[T]) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.router.Handle(method, path, handler, mw...)
}

func (r siteAdminRouter[T]) Group(prefix string) admin.AdminRouter {
	group := r.router.Group(prefix)
	if group == nil {
		return nil
	}
	return siteAdminRouter[T]{router: group}
}

func (r siteAdminRouter[T]) Mount(prefix string) admin.AdminRouter {
	group := r.router.Mount(prefix)
	if group == nil {
		return nil
	}
	return siteAdminRouter[T]{router: group}
}

func (r siteAdminRouter[T]) WithGroup(path string, cb func(admin.AdminRouter)) admin.AdminRouter {
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

func (r siteAdminRouter[T]) Use(m ...router.MiddlewareFunc) admin.AdminRouter {
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
