package site

import router "github.com/goliatone/go-router"

func (r *searchRuntime) PageHandler() router.HandlerFunc {
	return r.searchHandlerEntrypoint(r.respondSearchPage)
}

func (r *searchRuntime) TopicPageHandler() router.HandlerFunc {
	return r.searchHandlerEntrypoint(r.respondSearchTopicPage)
}

func (r *searchRuntime) APIHandler() router.HandlerFunc {
	return r.searchHandlerEntrypoint(r.respondSearchAPI)
}

func (r *searchRuntime) SuggestAPIHandler() router.HandlerFunc {
	return r.searchHandlerEntrypoint(r.respondSearchSuggestAPI)
}

func (r *searchRuntime) searchHandlerEntrypoint(next func(router.Context) error) router.HandlerFunc {
	if r == nil || r.provider == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		return next(c)
	}
}
