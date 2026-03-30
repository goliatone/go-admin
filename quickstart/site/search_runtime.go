package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

const (
	searchUnavailableErrorCode = "search_unavailable"
	searchTemplate             = "site/search"
)

type searchRuntime struct {
	siteCfg   ResolvedSiteConfig
	provider  admin.SearchProvider
	modules   []SiteModule
	baseRoute string
}

type searchLandingState struct {
	Slug       string
	Title      string
	Breadcrumb string
}

func newSearchRuntime(siteCfg ResolvedSiteConfig, provider admin.SearchProvider, modules []SiteModule) *searchRuntime {
	if provider == nil {
		return nil
	}
	return &searchRuntime{
		siteCfg:   siteCfg,
		provider:  provider,
		modules:   compactModules(modules),
		baseRoute: prefixedRoutePath(siteCfg.BasePath, siteCfg.Search.Route),
	}
}

func (r *searchRuntime) PageHandler() router.HandlerFunc {
	if r == nil || r.provider == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		return r.renderPage(c, "")
	}
}

func (r *searchRuntime) TopicPageHandler() router.HandlerFunc {
	if r == nil || r.provider == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		return r.renderPage(c, strings.TrimSpace(c.Param("topic_slug")))
	}
}

func (r *searchRuntime) APIHandler() router.HandlerFunc {
	if r == nil || r.provider == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		flow := r.prepareSearchPageFlow(c, "")
		if flow.err != nil {
			return c.JSON(502, searchAPIErrorResponse(flow.err))
		}

		envelope := buildSearchResultEnvelope(
			flow.result,
			flow.req,
			requestSearchRoute(c, r.baseRoute),
			searchCurrentQueryValues(c),
			false,
		)

		return c.JSON(200, searchAPIResponse(envelope, flow.req, flow.facets, flow.indexes, flow.landing))
	}
}

func (r *searchRuntime) SuggestAPIHandler() router.HandlerFunc {
	if r == nil || r.provider == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		flow := r.prepareSearchSuggestFlow(c)
		if flow.err != nil {
			return c.JSON(502, searchAPIErrorResponse(flow.err))
		}
		return c.JSON(200, searchSuggestAPIResponse(flow.result, flow.req, flow.indexes))
	}
}
