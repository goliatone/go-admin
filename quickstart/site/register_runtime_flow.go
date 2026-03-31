package site

import (
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type siteRegisterFlow[T any] struct {
	resolved      ResolvedSiteConfig
	modules       []SiteModule
	options       siteRegisterOptions
	searchRuntime *searchRuntime
}

func resolveSiteRegisterFlow[T any](
	adm *admin.Admin,
	cfg admin.Config,
	siteCfg SiteConfig,
	opts []SiteOption,
) siteRegisterFlow[T] {
	resolved := ResolveSiteConfig(cfg, siteCfg)
	modules := compactModules(resolved.Modules)
	options, searchRuntime := resolveSiteRegisterOptions(adm, resolved, modules, opts)
	return siteRegisterFlow[T]{
		resolved:      resolved,
		modules:       modules,
		options:       options,
		searchRuntime: searchRuntime,
	}
}

func resolveSiteRegisterOptions(
	adm *admin.Admin,
	resolved ResolvedSiteConfig,
	modules []SiteModule,
	opts []SiteOption,
) (siteRegisterOptions, *searchRuntime) {
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

	var searchRuntime *searchRuntime
	if options.searchProvider != nil {
		if runtime := newSearchRuntime(resolved, options.searchProvider, modules); runtime != nil {
			searchRuntime = runtime
			if options.searchHandler == nil {
				options.searchHandler = searchRuntime.PageHandler()
			}
			if options.searchAPIHandler == nil {
				options.searchAPIHandler = searchRuntime.APIHandler()
			}
			if options.suggestAPIHandler == nil {
				options.suggestAPIHandler = searchRuntime.SuggestAPIHandler()
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

	return options, searchRuntime
}

func (f siteRegisterFlow[T]) register(r router.Router[T], adm *admin.Admin, cfg admin.Config) error {
	r.Use(requestContextMiddleware(adm, cfg, f.resolved, f.modules))
	if err := f.registerModules(r, adm); err != nil {
		return err
	}
	f.registerSearchRoutes(r)
	f.registerContentRoutes(r)
	return nil
}

func (f siteRegisterFlow[T]) registerModules(r router.Router[T], adm *admin.Admin) error {
	moduleCtx := SiteModuleContext{
		Admin:          adm,
		Router:         siteAdminRouter[T]{router: r},
		BasePath:       f.resolved.BasePath,
		DefaultLocale:  f.resolved.DefaultLocale,
		ThemeEnabled:   f.resolved.Features.EnableTheme,
		SearchProvider: f.options.searchProvider,
		SearchOps:      f.options.searchOperations,
	}
	for _, module := range f.modules {
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
	return nil
}

func (f siteRegisterFlow[T]) registerSearchRoutes(r router.Router[T]) {
	if !f.resolved.Features.EnableSearch || f.options.searchProvider == nil {
		return
	}

	searchPath := prefixedRoutePath(f.resolved.BasePath, f.resolved.Search.Route)
	searchTopicPath := strings.TrimSuffix(searchPath, "/") + "/topics/:topic_slug"
	searchAPIPath := prefixedRoutePath("", f.resolved.Search.Endpoint)
	suggestAPIPath := prefixedRoutePath("", searchSuggestRoute(f.resolved.Search.Endpoint))
	r.Get(searchPath, f.options.searchHandler)
	if f.searchRuntime != nil {
		r.Get(searchTopicPath, f.searchRuntime.TopicPageHandler())
	}
	r.Get(searchAPIPath, f.options.searchAPIHandler)
	r.Get(suggestAPIPath, f.options.suggestAPIHandler)
}

func (f siteRegisterFlow[T]) registerContentRoutes(r router.Router[T]) {
	baseRoutePath := prefixedRoutePath(f.resolved.BasePath, "/")
	r.Get(baseRoutePath, f.options.contentHandler)

	if isHTTPRouterAdapter(r) {
		r.Get(prefixedRoutePath(f.resolved.BasePath, "/:path"), f.options.contentHandler)
		r.Get(prefixedRoutePath(f.resolved.BasePath, "/:path/*rest"), f.options.contentHandler)
		return
	}

	catchAllPath := siteCatchAllRoutePath(r, f.resolved.BasePath)
	r.Get(catchAllPath, f.options.contentHandler)
}
