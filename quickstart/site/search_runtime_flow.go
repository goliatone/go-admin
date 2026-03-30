package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type searchPageFlow struct {
	state   RequestState
	req     admin.SearchRequest
	facets  []string
	indexes []string
	landing *searchLandingState
	result  admin.SearchResultPage
	err     error
}

func (r *searchRuntime) prepareSearchPageFlow(c router.Context, topicSlug string) searchPageFlow {
	if r == nil {
		return searchPageFlow{}
	}
	state := fallbackRequestState(c, r.siteCfg, r.siteCfg.Search.Route)
	req, facets, indexes, landing := r.translateSearchRequest(c, state, strings.TrimSpace(topicSlug))
	result, searchErr := r.executeSearch(c, req)
	return searchPageFlow{
		state:   state,
		req:     req,
		facets:  facets,
		indexes: indexes,
		landing: landing,
		result:  result,
		err:     searchErr,
	}
}
