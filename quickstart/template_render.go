package quickstart

import (
	templateview "github.com/goliatone/go-admin/internal/templateview"
	router "github.com/goliatone/go-router"
)

// RenderTemplateView renders a template using the active router view engine.
// It propagates request CSRF helpers and normalizes whole-number JSON values
// before rendering. A nil router context returns an error.
func RenderTemplateView(c router.Context, template string, viewCtx router.ViewContext) error {
	return templateview.RenderTemplateView(c, template, viewCtx)
}
