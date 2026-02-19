package templateview

import (
	router "github.com/goliatone/go-router"
)

// RenderTemplateView normalizes numeric values in the provided view context
// before delegating to the active view renderer.
func RenderTemplateView(c router.Context, template string, viewCtx router.ViewContext) error {
	if viewCtx == nil {
		viewCtx = router.ViewContext{}
	}
	NormalizeContextNumbers(viewCtx)
	return c.Render(template, viewCtx)
}
