package site

import router "github.com/goliatone/go-router"

func (r *searchRuntime) searchAPIHandlerPayload(c router.Context) (int, map[string]any) {
	flow := r.prepareSearchPageFlow(c, "")
	if flow.err != nil {
		return searchErrorStatus(flow.err), searchAPIErrorResponse(flow.err)
	}

	envelope := buildSearchResultEnvelope(
		flow.result,
		flow.req,
		requestSearchRoute(c, r.baseRoute),
		searchCurrentQueryValues(c),
		flow.executed,
		false,
	)

	return 200, searchAPIResponse(envelope, flow.req, flow.facets, flow.indexes, flow.landing)
}

func (r *searchRuntime) respondSearchAPI(c router.Context) error {
	status, payload := r.searchAPIHandlerPayload(c)
	return c.JSON(status, payload)
}

func (r *searchRuntime) searchSuggestHandlerPayload(c router.Context) (int, map[string]any) {
	flow := r.prepareSearchSuggestFlow(c)
	if flow.err != nil {
		return searchErrorStatus(flow.err), searchAPIErrorResponse(flow.err)
	}
	return 200, searchSuggestAPIResponse(flow.result, flow.req, flow.indexes)
}

func (r *searchRuntime) respondSearchSuggestAPI(c router.Context) error {
	status, payload := r.searchSuggestHandlerPayload(c)
	return c.JSON(status, payload)
}
