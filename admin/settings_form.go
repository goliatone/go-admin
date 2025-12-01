package admin

// SettingsFormAdapter maps definitions to a form-like payload with theme tokens.
type SettingsFormAdapter struct {
	settings   *SettingsService
	themeName  string
	themeToken map[string]string
}

// SettingsForm bundles schema, values, and theme for rendering.
type SettingsForm struct {
	Schema map[string]any                 `json:"schema"`
	Values map[string]ResolvedSetting     `json:"values"`
	Theme  map[string]map[string]string   `json:"theme,omitempty"`
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

// Form returns a schema/value payload suitable for feeding form renderers.
func (a *SettingsFormAdapter) Form(userID string) SettingsForm {
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

	return SettingsForm{
		Schema: schema,
		Values: a.settings.ResolveAll(userID),
		Theme: map[string]map[string]string{
			"selection": {
				"name": a.themeName,
			},
			"tokens": a.themeToken,
		},
	}
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
