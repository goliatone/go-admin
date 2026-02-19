package admin

import (
	"github.com/goliatone/go-router"
)

func renderTemplateView(c router.Context, template string, viewCtx router.ViewContext) error {
	if viewCtx == nil {
		viewCtx = router.ViewContext{}
	}
	serialized, err := router.SerializeAsContext(viewCtx)
	if err != nil {
		return err
	}
	return c.Render(template, serialized)
}
