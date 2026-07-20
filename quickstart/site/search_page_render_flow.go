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
		status := searchErrorStatus(flow.err)
		return renderSiteTemplateResponse(c, flow.state, r.siteCfg, siteTemplateResponse{
			JSONStatus:     status,
			TemplateStatus: status,
			TemplateNames:  []string{searchTemplate},
			JSONPayload: siteTemplateResponsePayload(searchTemplate, ctx, map[string]any{
				"error": searchUnavailableErrorPayload(flow.err),
			}),
			ViewContext: ctx,
			FallbackError: SiteRuntimeError{
				Code:            searchErrorCode(flow.err),
				Status:          status,
				Message:         strings.TrimSpace(flow.err.Error()),
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
	r.applySearchPolicyViewContext(view, req)
	return mergeSiteContentViewContext(view, map[string]any{
		"kind": "search",
		"mode": "search",
	})
}

func (r *searchRuntime) applySearchPolicyViewContext(view router.ViewContext, req admin.SearchRequest) {
	if r == nil || view == nil {
		return
	}
	variantParameter := r.searchVariantParameter()
	allowedVariants := []string{}
	if policy := r.siteCfg.Search.VariantPolicy; policy != nil {
		for _, value := range policy.Allowed {
			allowedVariants = append(allowedVariants, string(value))
		}
	}
	pageSizes := []int{}
	if policy := r.siteCfg.Search.PageSizePolicy; policy != nil {
		pageSizes = append(pageSizes, policy.Allowed...)
	}
	expandedFacets := []string{}
	if policy := r.siteCfg.Search.FacetExpansionPolicy; policy != nil {
		expandedFacets = append(expandedFacets, policy.Fields...)
	}
	view["search_variant_query_param"] = variantParameter
	view["search_allowed_variants"] = allowedVariants
	view["search_allowed_page_sizes"] = pageSizes
	view["search_facet_default_expansion"] = expandedFacets
	if nested, ok := view["search"].(map[string]any); ok {
		nested["variant_query_param"] = variantParameter
		nested["allowed_variants"] = allowedVariants
		nested["allowed_page_sizes"] = pageSizes
		nested["facet_default_expansion"] = expandedFacets
		nested["variant"] = strings.TrimSpace(string(req.Variant))
	}
}
