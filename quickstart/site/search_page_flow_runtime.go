package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type searchPageFlow struct {
	state    RequestState
	req      admin.SearchRequest
	facets   []string
	indexes  []string
	landing  *searchLandingState
	result   admin.SearchResultPage
	executed bool
	err      error
}

func (r *searchRuntime) prepareSearchPageFlow(c router.Context, topicSlug string) searchPageFlow {
	if r == nil {
		return searchPageFlow{}
	}
	state := fallbackRequestState(c, r.siteCfg, r.siteCfg.Search.Route)
	req, facets, indexes, landing := r.translateSearchRequest(c, state, strings.TrimSpace(topicSlug))
	result, executed, searchErr := r.executeSearchWithLandingState(c, req, landing)
	return searchPageFlow{
		state:    state,
		req:      req,
		facets:   facets,
		indexes:  indexes,
		landing:  landing,
		result:   result,
		executed: executed,
		err:      searchErr,
	}
}
