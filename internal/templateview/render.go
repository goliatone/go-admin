package templateview

import (
	"errors"

	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	router "github.com/goliatone/go-router"
)

var errNilContext = errors.New("template view: router context is nil")

// RenderTemplateView normalizes numeric values in the provided view context
// before delegating to the active view renderer.
func RenderTemplateView(c router.Context, template string, viewCtx router.ViewContext) error {
	if c == nil {
		return errNilContext
	}
	if viewCtx == nil {
		viewCtx = router.ViewContext{}
	}
	if helpers, ok := c.Locals(csrfmw.DefaultTemplateHelpersKey).(map[string]any); ok && helpers != nil {
		viewCtx[csrfmw.DefaultTemplateHelpersKey] = helpers
		for key, value := range helpers {
			if _, exists := viewCtx[key]; !exists {
				viewCtx[key] = value
			}
		}
	}
	NormalizeContextNumbers(viewCtx)
	return c.Render(template, viewCtx)
}
