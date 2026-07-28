package admin

import (
	"context"
	"strings"

	formrender "github.com/goliatone/go-formgen/pkg/render"
)

// PanelFormRequest captures the data needed to render a panel form via go-formgen.
type PanelFormRequest struct {
	Schema Schema                       `json:"schema"`
	Values map[string]any               `json:"values"`
	Errors map[string]string            `json:"errors"`
	Locale string                       `json:"locale"`
	Theme  map[string]map[string]string `json:"theme"`
	// RenderTheme carries the typed go-formgen theme contract for in-process
	// renderers. It stays out of the wire payload because AssetURL is a function.
	RenderTheme *formrender.ThemeConfig `json:"-"`
	Metadata    map[string]any          `json:"metadata"`
}

// PanelFormAdapter maps panel definitions into a form request, injecting theme tokens and context.
// This is intentionally light so hosts can pass the payload to go-formgen orchestrators.
type PanelFormAdapter struct {
	ThemeResolver func(context.Context) *ThemeSelection `json:"theme_resolver"`
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
	var renderTheme *formrender.ThemeConfig
	if a != nil && a.ThemeResolver != nil {
		if theme := a.ThemeResolver(ctx.Context); theme != nil {
			themePayload = theme.payload()
			renderTheme = theme.formThemeConfig()
		}
	}
	schema := panel.SchemaWithTheme(themePayload)
	return PanelFormRequest{
		Schema:      schema,
		Values:      values,
		Errors:      errors,
		Locale:      ctx.Locale,
		Theme:       themePayload,
		RenderTheme: renderTheme,
		Metadata: map[string]any{
			"use_blocks": schema.UseBlocks,
			"use_seo":    schema.UseSEO,
			"tree_view":  schema.TreeView,
		},
	}
}

func (t *ThemeSelection) formThemeConfig() *formrender.ThemeConfig {
	if t == nil {
		return nil
	}
	selection := normalizeThemeProjection(cloneThemeSelection(t))
	diagnostics := make([]formrender.ThemeTokenDiagnostic, 0, len(selection.Diagnostics))
	for _, diagnostic := range selection.Diagnostics {
		diagnostics = append(diagnostics, formrender.ThemeTokenDiagnostic{
			Token:      diagnostic.Token,
			Canonical:  diagnostic.Canonical,
			Variable:   diagnostic.Variable,
			Constraint: diagnostic.Constraint,
			Status:     diagnostic.Status,
			Consumer:   diagnostic.Consumer,
			Reason:     diagnostic.Reason,
		})
	}
	return &formrender.ThemeConfig{
		Theme:             selection.Name,
		Variant:           selection.Variant,
		Partials:          cloneThemeStringMap(selection.Partials),
		Tokens:            cloneThemeStringMap(selection.Tokens),
		CSSVars:           cloneThemeStringMap(selection.CSSVars),
		SafeCSSVarsInline: selection.RootCSSVarsInline,
		SemanticTokens:    cloneThemeStringMap(selection.SemanticTokens),
		Diagnostics:       diagnostics,
		AssetURL: func(name string) string {
			value := strings.TrimSpace(selection.Assets[name])
			if value == "" || selection.AssetPrefix == "" ||
				strings.HasPrefix(value, "/") || strings.Contains(value, "://") {
				return value
			}
			return strings.TrimRight(selection.AssetPrefix, "/") + "/" + strings.TrimLeft(value, "/")
		},
	}
}

func cloneThemeStringMap(values map[string]string) map[string]string {
	if len(values) == 0 {
		return nil
	}
	out := make(map[string]string, len(values))
	for key, value := range values {
		out[key] = value
	}
	return out
}
