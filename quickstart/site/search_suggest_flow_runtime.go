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
	if strings.TrimSpace(req.Query) != "" {
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
