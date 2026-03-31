package site

import (
	"strings"

	router "github.com/goliatone/go-router"
)

func (r *searchRuntime) respondSearchPage(c router.Context) error {
	return r.renderPage(c, "")
}

func (r *searchRuntime) respondSearchTopicPage(c router.Context) error {
	return r.renderPage(c, strings.TrimSpace(c.Param("topic_slug")))
}
