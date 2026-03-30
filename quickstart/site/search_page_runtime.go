package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func (r *searchRuntime) renderPage(c router.Context, topicSlug string) error {
	flow := r.prepareSearchPageFlow(c, topicSlug)
	ctx := r.searchViewContext(c, flow.state, flow.req, flow.result, flow.facets, flow.indexes, flow.landing, flow.err)
	if flow.err != nil {
		return renderSiteTemplateResponse(c, flow.state, r.siteCfg, siteTemplateResponse{
			JSONStatus:     502,
			TemplateStatus: 502,
			TemplateNames:  []string{searchTemplate},
			JSONPayload: siteTemplateResponsePayload(searchTemplate, ctx, map[string]any{
				"error": searchUnavailableErrorPayload(flow.err),
			}),
			ViewContext: ctx,
			FallbackError: SiteRuntimeError{
				Code:            searchUnavailableErrorCode,
				Status:          502,
				Message:         "search service unavailable",
				RequestedLocale: strings.TrimSpace(flow.req.Locale),
			},
		})
	}

	return renderSiteTemplateResponse(c, flow.state, r.siteCfg, siteTemplateResponse{
		JSONStatus:    200,
		TemplateNames: []string{searchTemplate},
		JSONPayload:   siteTemplateResponsePayload(searchTemplate, ctx, nil),
		ViewContext:   ctx,
		FallbackError: SiteRuntimeError{
			Status:          500,
			Message:         "no site template could render the search page",
			RequestedLocale: strings.TrimSpace(flow.req.Locale),
		},
	})
}

func (r *searchRuntime) searchViewContext(
	c router.Context,
	state RequestState,
	req admin.SearchRequest,
	result admin.SearchResultPage,
	facets []string,
	indexes []string,
	landing *searchLandingState,
	searchErr error,
) router.ViewContext {
	view := newRuntimeViewContext(state)
	queryValues := searchCurrentQueryValues(c)
	activeRoute := requestSearchRoute(c, r.baseRoute)
	errorPayload := map[string]any{}
	if searchErr != nil {
		errorPayload = searchUnavailableErrorPayload(searchErr)
		delete(errorPayload, "status")
	}
	envelope := buildSearchResultEnvelope(result, req, activeRoute, queryValues, len(errorPayload) > 0)
	projection := buildSearchPageViewProjection(req, envelope, facets, indexes, landing, activeRoute, queryValues, errorPayload)

	view["search_route"] = activeRoute
	view["search_endpoint"] = strings.TrimSpace(r.siteCfg.Search.Endpoint)
	view["search_suggest_endpoint"] = strings.TrimSpace(searchSuggestRoute(r.siteCfg.Search.Endpoint))
	projection.apply(view)
	return view
}
