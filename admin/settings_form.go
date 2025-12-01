package admin

import "context"

// SettingsFormAdapter maps definitions to a form-like payload with theme tokens.
type SettingsFormAdapter struct {
	settings      *SettingsService
	themeName     string
	themeToken    map[string]string
	themeResolver func(ctx context.Context) *ThemeSelection
}

// SettingsForm bundles schema, values, and theme for rendering.
type SettingsForm struct {
	Schema map[string]any               `json:"schema"`
	Values map[string]ResolvedSetting   `json:"values"`
	Theme  map[string]map[string]string `json:"theme,omitempty"`
}

// NewSettingsFormAdapter constructs a form adapter for settings.
func NewSettingsFormAdapter(service *SettingsService, theme string, tokens map[string]string) *SettingsFormAdapter {
	tokenCopy := map[string]string{}
	for k, v := range tokens {
		tokenCopy[k] = v
	}
	return &SettingsFormAdapter{
		settings:   service,
		themeName:  theme,
		themeToken: tokenCopy,
	}
}

// WithThemeResolver injects a resolver that can fetch the current theme selection.
func (a *SettingsFormAdapter) WithThemeResolver(resolver func(ctx context.Context) *ThemeSelection) *SettingsFormAdapter {
	a.themeResolver = resolver
	return a
}

// Form returns a schema/value payload suitable for feeding form renderers.
func (a *SettingsFormAdapter) Form(userID string) SettingsForm {
	return a.FormWithContext(context.Background(), userID)
}

// FormWithContext is context-aware to allow theme providers to resolve per-request.
func (a *SettingsFormAdapter) FormWithContext(ctx context.Context, userID string) SettingsForm {
	defs := a.settings.Definitions()
	properties := map[string]any{}
	required := []string{}

	for _, def := range defs {
		properties[def.Key] = map[string]any{
			"type":        a.mapType(def.Type),
			"title":       def.Title,
			"description": def.Description,
			"default":     def.Default,
			"x-admin": map[string]any{
				"group": def.Group,
			},
		}
		if def.Default == nil {
			required = append(required, def.Key)
		}
	}

	schema := map[string]any{
		"type":       "object",
		"properties": properties,
	}
	if len(required) > 0 {
		schema["required"] = required
	}

	form := SettingsForm{
		Schema: schema,
		Values: a.settings.ResolveAll(userID),
	}
	if theme := a.themePayload(ctx); theme != nil {
		form.Theme = theme
	}
	return form
}

func (a *SettingsFormAdapter) mapType(t string) string {
	switch t {
	case "boolean", "bool":
		return "boolean"
	case "number":
		return "number"
	default:
		return "string"
	}
}

func (a *SettingsFormAdapter) themePayload(ctx context.Context) map[string]map[string]string {
	if a.themeResolver != nil {
		if selection := a.themeResolver(ctx); selection != nil {
			return selection.payload()
		}
	}
	selection := &ThemeSelection{
		Name:   a.themeName,
		Tokens: cloneStringMap(a.themeToken),
	}
	return selection.payload()
}
