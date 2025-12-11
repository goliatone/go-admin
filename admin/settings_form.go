package admin

import (
	"context"

	settingsinternal "github.com/goliatone/go-admin/admin/internal/settings"
	opts "github.com/goliatone/go-options"
)

// SettingsFormAdapter maps definitions to a form-like payload with theme tokens.
type SettingsFormAdapter struct {
	settings      *SettingsService
	themeName     string
	themeToken    map[string]string
	themeResolver func(ctx context.Context) *ThemeSelection
}

// SettingsForm bundles schema, values, and theme for rendering.
type SettingsForm struct {
	Schema       map[string]any               `json:"schema"`
	SchemaFormat opts.SchemaFormat            `json:"schema_format,omitempty"`
	Scopes       []opts.SchemaScope           `json:"scopes,omitempty"`
	Values       map[string]ResolvedSetting   `json:"values"`
	Theme        map[string]map[string]string `json:"theme,omitempty"`
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
	schemaDoc, err := a.settings.Schema(ctx, userID)
	if err != nil {
		schemaDoc = opts.SchemaDocument{}
	}
	rootSchema := settingsinternal.ExtractSchema(schemaDoc)
	properties := settingsinternal.EnsureSchemaProperties(rootSchema)
	required := map[string]struct{}{}

	for _, def := range defs {
		field := settingsinternal.SchemaField(properties[def.Key])
		field["type"] = a.mapType(def.Type)
		field["title"] = def.Title
		field["description"] = def.Description
		field["default"] = def.Default

		adminMeta := settingsinternal.EnsureAdminMeta(field)
		adminMeta["group"] = def.Group
		if scopes := a.allowedScopes(def.AllowedScopes); len(scopes) > 0 {
			adminMeta["allowed_scopes"] = scopes
		}
		if def.VisibilityRule != "" {
			adminMeta["visibility_rule"] = def.VisibilityRule
		}

		options, optErr := resolveDefinitionOptions(ctx, def)
		if optErr != nil {
			adminMeta["options_error"] = optErr.Error()
		}
		if len(options) > 0 {
			field["x-formgen:options"] = options
		}
		if len(def.Enum) > 0 {
			field["enum"] = append([]any(nil), def.Enum...)
		}
		if widget := a.mapWidget(def); widget != "" {
			field["x-formgen:widget"] = widget
		}

		if len(def.Enrichers) > 0 {
			for _, enricher := range def.Enrichers {
				if enricher != nil {
					enricher(ctx, field)
				}
			}
		}

		properties[def.Key] = field
		if def.Default == nil {
			required[def.Key] = struct{}{}
		}
	}
	rootSchema["properties"] = properties

	if len(required) > 0 {
		rootSchema["required"] = settingsinternal.SortRequiredKeys(required)
	}

	form := SettingsForm{
		Schema:       rootSchema,
		SchemaFormat: schemaDoc.Format,
		Scopes:       schemaDoc.Scopes,
		Values:       a.settings.ResolveAll(userID),
	}
	if theme := a.themePayload(ctx); theme != nil {
		form.Theme = theme
	}
	return form
}

func (a *SettingsFormAdapter) mapType(t string) string {
	return settingsinternal.MapType(t)
}

func (a *SettingsFormAdapter) mapWidget(def SettingDefinition) string {
	return settingsinternal.MapWidget(def.Widget, def.Type)
}

func (a *SettingsFormAdapter) allowedScopes(scopes []SettingsScope) []string {
	if len(scopes) == 0 {
		return nil
	}
	out := make([]string, 0, len(scopes))
	for _, scope := range scopes {
		if scope == "" {
			continue
		}
		out = append(out, string(scope))
	}
	return settingsinternal.AllowedScopes(out)
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
