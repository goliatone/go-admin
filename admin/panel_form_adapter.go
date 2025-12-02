package admin

import "context"

// PanelFormRequest captures the data needed to render a panel form via go-formgen.
type PanelFormRequest struct {
	Schema   Schema                       `json:"schema"`
	Values   map[string]any               `json:"values"`
	Errors   map[string]string            `json:"errors"`
	Locale   string                       `json:"locale"`
	Theme    map[string]map[string]string `json:"theme"`
	Metadata map[string]any               `json:"metadata"`
}

// PanelFormAdapter maps panel definitions into a form request, injecting theme tokens and context.
// This is intentionally light so hosts can pass the payload to go-formgen orchestrators.
type PanelFormAdapter struct {
	ThemeResolver func(context.Context) *ThemeSelection
}

// Build assembles a PanelFormRequest for a panel and locale, merging theme payload and provided values/errors.
func (a *PanelFormAdapter) Build(panel *Panel, ctx AdminContext, values map[string]any, errors map[string]string) PanelFormRequest {
	if values == nil {
		values = map[string]any{}
	}
	if errors == nil {
		errors = map[string]string{}
	}
	themePayload := map[string]map[string]string{}
	if a != nil && a.ThemeResolver != nil {
		if theme := a.ThemeResolver(ctx.Context); theme != nil {
			themePayload = theme.payload()
		}
	}
	schema := panel.SchemaWithTheme(themePayload)
	return PanelFormRequest{
		Schema: schema,
		Values: values,
		Errors: errors,
		Locale: ctx.Locale,
		Theme:  themePayload,
		Metadata: map[string]any{
			"use_blocks": schema.UseBlocks,
			"use_seo":    schema.UseSEO,
			"tree_view":  schema.TreeView,
		},
	}
}
