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
	if options.themeProvider != nil {
		resolved.ThemeProvider = options.themeProvider
	}
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
	resolveSiteContentHandler(adm, resolved, &options)
	searchRuntime := resolveSiteSearchHandlers(resolved, modules, &options)
	options.fallbackPolicy = mergeSiteFallbackPolicy(resolved.Fallback, options.fallbackOverlay)

	return options, searchRuntime
}

func resolveSiteContentHandler(adm *admin.Admin, resolved ResolvedSiteConfig, options *siteRegisterOptions) {
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
}

func resolveSiteSearchHandlers(resolved ResolvedSiteConfig, modules []SiteModule, options *siteRegisterOptions) *searchRuntime {
	var searchRuntime *searchRuntime
	if options.searchProvider != nil {
		if runtime := newSearchRuntime(resolved, options.searchProvider, modules); runtime != nil {
			searchRuntime = runtime
			applySiteSearchRuntimeHandlers(searchRuntime, options)
		}
	}
	applyDefaultSiteSearchHandlers(options)
	return searchRuntime
}

func applySiteSearchRuntimeHandlers(searchRuntime *searchRuntime, options *siteRegisterOptions) {
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

func applyDefaultSiteSearchHandlers(options *siteRegisterOptions) {
	if options.searchHandler == nil {
		options.searchHandler = defaultNotFoundHandler
	}
	if options.searchAPIHandler == nil {
		options.searchAPIHandler = defaultNotFoundHandler
	}
	if options.suggestAPIHandler == nil {
		options.suggestAPIHandler = defaultNotFoundHandler
	}
}

func (f siteRegisterFlow[T]) register(r router.Router[T], adm *admin.Admin, cfg admin.Config) error {
	if err := f.registerRoutingOwnership(adm); err != nil {
		return err
	}
	targets := resolveSiteRouteTargets(r)
	requestContext := requestContextMiddleware(adm, cfg, f.resolved, f.modules)
	targets.site.Use(requestContext)
	if targets.hasDedicatedPublicAPI {
		targets.publicAPI.Use(requestContext)
	}
	if err := f.registerModules(targets.site, adm); err != nil {
		return err
	}
	f.registerSearchRoutes(targets.site, targets.publicAPI)
	f.registerContentRoutes(targets.site)
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

func (f siteRegisterFlow[T]) registerSearchRoutes(siteRouter, publicAPIRouter router.Router[T]) {
	if !f.resolved.Features.EnableSearch || f.options.searchProvider == nil {
		return
	}
	if siteRouter == nil {
		return
	}
	apiRouter := siteRouter
	if publicAPIRouter != nil {
		apiRouter = publicAPIRouter
	}

	searchPath := prefixedRoutePath(f.resolved.BasePath, f.resolved.Search.Route)
	searchTopicPath := strings.TrimSuffix(searchPath, "/") + "/topics/:topic_slug"
	searchAPIPath := prefixedRoutePath("", f.resolved.Search.Endpoint)
	suggestAPIPath := prefixedRoutePath("", searchSuggestRoute(f.resolved.Search.Endpoint))
	siteRouter.Get(searchPath, f.options.searchHandler)
	siteRouter.Head(searchPath, f.options.searchHandler)
	if f.searchRuntime != nil {
		siteRouter.Get(searchTopicPath, f.searchRuntime.TopicPageHandler())
		siteRouter.Head(searchTopicPath, f.searchRuntime.TopicPageHandler())
	}
	apiRouter.Get(searchAPIPath, f.options.searchAPIHandler)
	apiRouter.Head(searchAPIPath, f.options.searchAPIHandler)
	apiRouter.Get(suggestAPIPath, f.options.suggestAPIHandler)
	apiRouter.Head(suggestAPIPath, f.options.suggestAPIHandler)
}

func (f siteRegisterFlow[T]) registerContentRoutes(r router.Router[T]) {
	policy := f.options.fallbackPolicy
	handler := fallbackContentHandler(f.resolved, policy, f.options.contentHandler)
	baseRoutePath := prefixedRoutePath(f.resolved.BasePath, "/")

	switch policy.Mode {
	case SiteFallbackModeDisabled:
		return
	case SiteFallbackModePublicContentOnly:
		if registerSiteFallbackMissHandlers(r, fallbackMissHandler(f.resolved, policy, f.options.contentHandler)) {
			return
		}
		if policy.AllowRoot {
			registerSiteFallbackRouteMethods(r, policy, baseRoutePath, handler)
		}
		for _, routePath := range siteFallbackRoutePaths(r, f.resolved.BasePath) {
			registerSiteFallbackRouteMethods(r, policy, routePath, handler)
		}
	case SiteFallbackModeExplicitPathsOnly:
		contentPaths := make([]string, 0, len(policy.AllowedExactPaths)+len(policy.AllowedPathPrefixes)*3+1)
		if policy.AllowRoot {
			contentPaths = append(contentPaths, baseRoutePath)
		}
		for _, exactPath := range policy.AllowedExactPaths {
			if normalizePath(exactPath) == "/" {
				continue
			}
			contentPaths = append(contentPaths, prefixedRoutePath(f.resolved.BasePath, exactPath))
		}
		for _, prefix := range policy.AllowedPathPrefixes {
			contentPaths = append(contentPaths, sitePrefixRoutePaths(r, f.resolved.BasePath, prefix)...)
		}
		for _, routePath := range uniqueRoutePaths(contentPaths) {
			registerSiteFallbackRouteMethods(r, policy, routePath, handler)
		}
	}
}
