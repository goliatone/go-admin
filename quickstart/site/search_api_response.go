package site

import "github.com/goliatone/go-admin/admin"

func searchAPIErrorResponse(err error) map[string]any {
	return map[string]any{
		"error": searchUnavailableErrorPayload(err),
	}
}

func searchAPIResponse(envelope searchResultEnvelope, req admin.SearchRequest, facets []string, indexes []string, landing *searchLandingState) map[string]any {
	return map[string]any{
		"data": searchAPIData(envelope),
		"meta": searchPageResponseMeta(req, facets, indexes, landing),
	}
}

func searchSuggestAPIResponse(result admin.SuggestResult, req admin.SuggestRequest, indexes []string) map[string]any {
	return map[string]any{
		"data": map[string]any{
			"suggestions": append([]string{}, result.Suggestions...),
		},
		"meta": searchSuggestResponseMeta(req, indexes),
	}
}
