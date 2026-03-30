package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func searchUnavailableErrorPayload(err error) map[string]any {
	message := ""
	if err != nil {
		message = strings.TrimSpace(err.Error())
	}
	return map[string]any{
		"code":    searchUnavailableErrorCode,
		"status":  502,
		"message": message,
	}
}

func searchCollectionsMetadata(indexes []string) map[string]any {
	return map[string]any{
		"indexes":     cloneStrings(indexes),
		"collections": cloneStrings(indexes),
	}
}

func searchRequestMetadata(facets []string, indexes []string, landing *searchLandingState, acceptLanguage string) map[string]any {
	out := searchCollectionsMetadata(indexes)
	out["facets"] = cloneStrings(facets)
	out["accept_language"] = strings.TrimSpace(acceptLanguage)
	out["landing"] = landingMetadata(landing)
	return out
}

func searchSuggestRequestMetadata(indexes []string, acceptLanguage string) map[string]any {
	out := searchCollectionsMetadata(indexes)
	out["accept_language"] = strings.TrimSpace(acceptLanguage)
	return out
}

func searchPageResponseMeta(
	req admin.SearchRequest,
	facets []string,
	indexes []string,
	landing *searchLandingState,
) map[string]any {
	out := searchCollectionsMetadata(indexes)
	out["query"] = strings.TrimSpace(req.Query)
	out["locale"] = strings.TrimSpace(req.Locale)
	out["sort"] = strings.TrimSpace(req.Sort)
	out["filters"] = cloneSearchFilters(req.Filters)
	out["ranges"] = cloneSearchRanges(req.Ranges)
	out["facets"] = cloneStrings(facets)
	out["landing"] = landingMetadata(landing)
	return out
}

func searchSuggestResponseMeta(req admin.SuggestRequest, indexes []string) map[string]any {
	out := searchCollectionsMetadata(indexes)
	out["query"] = strings.TrimSpace(req.Query)
	out["locale"] = strings.TrimSpace(req.Locale)
	out["filters"] = cloneSearchFilters(req.Filters)
	return out
}
