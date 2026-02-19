package helpers

import (
	"github.com/goliatone/go-admin/internal/templateview"
	router "github.com/goliatone/go-router"
)

// RenderTemplateView normalizes numeric values in template view context
// before rendering. This avoids float-style JSON number formatting leaks in templates.
func RenderTemplateView(c router.Context, template string, viewCtx router.ViewContext) error {
	return templateview.RenderTemplateView(c, template, viewCtx)
}
