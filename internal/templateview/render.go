package templateview

import (
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	router "github.com/goliatone/go-router"
)

// RenderTemplateView normalizes numeric values in the provided view context
// before delegating to the active view renderer.
func RenderTemplateView(c router.Context, template string, viewCtx router.ViewContext) error {
	if viewCtx == nil {
		viewCtx = router.ViewContext{}
	}
	if c != nil {
		if helpers, ok := c.Locals(csrfmw.DefaultTemplateHelpersKey).(map[string]any); ok && helpers != nil {
			viewCtx[csrfmw.DefaultTemplateHelpersKey] = helpers
			for key, value := range helpers {
				if _, exists := viewCtx[key]; !exists {
					viewCtx[key] = value
				}
			}
		}
	}
	NormalizeContextNumbers(viewCtx)
	return c.Render(template, viewCtx)
}
