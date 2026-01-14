package quickstart

import (
	"context"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// WithThemeContext resolves the active theme (with optional query overrides) and adds it to the view context.
func WithThemeContext(ctx router.ViewContext, adm *admin.Admin, req router.Context) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	if adm == nil {
		return ctx
	}

	selector := admin.ThemeSelector{}
	if req != nil {
		if name := req.Query("theme"); name != "" {
			selector.Name = name
		}
		if variant := req.Query("variant"); variant != "" {
			selector.Variant = variant
		}
	}

	baseCtx := context.Background()
	if req != nil && req.Context() != nil {
		baseCtx = req.Context()
	}
	if selector.Name != "" || selector.Variant != "" {
		baseCtx = admin.WithThemeSelection(baseCtx, selector)
	}

	theme := adm.ThemePayload(baseCtx)
	ctx["theme"] = theme
	if selection, ok := theme["selection"]; ok {
		if name, ok := selection["name"]; ok {
			ctx["theme_name"] = name
		}
		if variant, ok := selection["variant"]; ok {
			ctx["theme_variant"] = variant
		}
	}
	return ctx
}
