package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type searchSuggestFlow struct {
	state   RequestState
	req     admin.SuggestRequest
	indexes []string
	result  admin.SuggestResult
	err     error
}

func (r *searchRuntime) prepareSearchSuggestFlow(c router.Context) searchSuggestFlow {
	if r == nil {
		return searchSuggestFlow{}
	}
	state := fallbackRequestState(c, r.siteCfg, r.siteCfg.Search.Route)
	req, indexes := r.translateSuggestRequest(c, state)
	result := admin.SuggestResult{Suggestions: []string{}}
	var suggestErr error
	if suggestErr = r.validateSearchVariant(req.Variant); suggestErr == nil && strings.TrimSpace(req.Query) != "" {
		if policy := r.siteCfg.Search.VariantPolicy; policy != nil && !policy.IncludeInSuggestions {
			req.Variant = ""
		}
		result, suggestErr = r.provider.Suggest(RequestContext(c), req)
	}
	return searchSuggestFlow{
		state:   state,
		req:     req,
		indexes: indexes,
		result:  result,
		err:     suggestErr,
	}
}
