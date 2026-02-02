package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	admindata "github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/pkg/client"
	formgen "github.com/goliatone/go-formgen"
	formgenjsonschema "github.com/goliatone/go-formgen/pkg/jsonschema"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	formgenschema "github.com/goliatone/go-formgen/pkg/schema"
	formgenvanilla "github.com/goliatone/go-formgen/pkg/renderers/vanilla"
)

const (
	preferencesSchemaSlug         = "preferences"
	preferencesSchemaFileName     = "schema.json"
	preferencesSchemaDefaultPath  = preferencesSchemaSlug + "/" + preferencesSchemaFileName
	preferencesSchemaSourceFile   = "file"
	preferencesSchemaSourceEmbed  = "embedded"
)

type preferencesSchemaInfo struct {
	Source string
	Path   string
	FormID string
	Schema map[string]any
}

func newPreferencesFormGenerator() (*formgenorchestrator.Orchestrator, error) {
	formTemplatesFS, err := fs.Sub(client.Templates(), "formgen/vanilla")
	if err != nil {
		return nil, fmt.Errorf("preferences form templates: %w", err)
	}

	registry := formgenrender.NewRegistry()
	templateBundle := formgenvanilla.TemplatesFS()
	if formTemplatesFS != nil {
		templateBundle = withFallbackFS(formTemplatesFS, templateBundle)
	}

	vanillaRenderer, err := formgenvanilla.New(
		formgenvanilla.WithoutStyles(),
		formgenvanilla.WithTemplatesFS(templateBundle),
	)
	if err != nil {
		return nil, fmt.Errorf("preferences form renderer: %w", err)
	}
	registry.MustRegister(vanillaRenderer)

	return formgen.NewOrchestrator(
		formgenorchestrator.WithRegistry(registry),
		formgenorchestrator.WithDefaultRenderer(vanillaRenderer.Name()),
		formgenorchestrator.WithDefaultAdapter(formgenjsonschema.DefaultAdapterName),
	), nil
}

func (m *PreferencesModule) preferencesFormHTML(
	ctx context.Context,
	prefPath string,
	prefs UserPreferences,
	themeOptions []Option,
	variantOptions []Option,
) (string, preferencesSchemaInfo, error) {
	schemaDoc, schemaInfo, err := m.resolvePreferencesSchema(themeOptions, variantOptions)
	if err != nil {
		return "", schemaInfo, err
	}

	formGen, err := newPreferencesFormGenerator()
	if err != nil {
		return "", schemaInfo, err
	}

	values := map[string]any{
		"theme":         prefs.Theme,
		"theme_variant": prefs.ThemeVariant,
		"raw_ui":        preferencesRawUIJSON(prefs.Raw),
		"clear_ui_keys": "",
	}

	output, err := formGen.Generate(ctx, formgenorchestrator.Request{
		SchemaDocument: &schemaDoc,
		OperationID:    schemaInfo.FormID,
		Format:         formgenjsonschema.DefaultAdapterName,
		NormalizeOptions: formgenschema.NormalizeOptions{
			ContentTypeSlug: prefPath,
			FormID:          schemaInfo.FormID,
		},
		RenderOptions: formgenrender.RenderOptions{
			Values: values,
		},
	})
	if err != nil {
		return "", schemaInfo, err
	}

	return string(output), schemaInfo, nil
}

func (m *PreferencesModule) resolvePreferencesSchema(themeOptions, variantOptions []Option) (formgenschema.Document, preferencesSchemaInfo, error) {
	schemaInfo := preferencesSchemaInfo{}
	raw, location, source, err := m.readPreferencesSchema()
	if err != nil {
		return formgenschema.Document{}, schemaInfo, err
	}

	schemaMap := map[string]any{}
	if err := json.Unmarshal(raw, &schemaMap); err != nil {
		return formgenschema.Document{}, schemaInfo, fmt.Errorf("preferences schema parse: %w", err)
	}
	if schemaMap == nil {
		return formgenschema.Document{}, schemaInfo, fmt.Errorf("preferences schema is empty")
	}

	applyPreferencesSchemaOptions(schemaMap, themeOptions, variantOptions)

	updated, err := json.Marshal(schemaMap)
	if err != nil {
		return formgenschema.Document{}, schemaInfo, fmt.Errorf("preferences schema encode: %w", err)
	}

	forms, err := formgenjsonschema.DiscoverFormsFromBytes(updated, formgenjsonschema.FormDiscoveryOptions{Slug: preferencesSchemaSlug})
	if err != nil {
		return formgenschema.Document{}, schemaInfo, fmt.Errorf("preferences schema forms: %w", err)
	}
	formID := preferencesSchemaSlug
	if len(forms) > 0 && strings.TrimSpace(forms[0].ID) != "" {
		formID = strings.TrimSpace(forms[0].ID)
	}

	schemaInfo.Source = source
	schemaInfo.Path = location
	schemaInfo.FormID = formID
	schemaInfo.Schema = schemaMap

	var schemaSource formgenschema.Source
	switch source {
	case preferencesSchemaSourceFile:
		schemaSource = formgenschema.SourceFromFile(location)
	default:
		schemaSource = formgenschema.SourceFromFS(location)
	}

	doc, err := formgenschema.NewDocument(schemaSource, updated)
	if err != nil {
		return formgenschema.Document{}, schemaInfo, err
	}

	return doc, schemaInfo, nil
}

func (m *PreferencesModule) readPreferencesSchema() ([]byte, string, string, error) {
	if m != nil {
		if override := strings.TrimSpace(m.schemaPath); override != "" {
			payload, location, err := readPreferencesSchemaFile(override)
			if err != nil {
				return nil, "", preferencesSchemaSourceFile, err
			}
			return payload, location, preferencesSchemaSourceFile, nil
		}
	}

	fsys := admindata.UISchemas()
	payload, err := fs.ReadFile(fsys, preferencesSchemaDefaultPath)
	if err != nil {
		return nil, "", preferencesSchemaSourceEmbed, fmt.Errorf("read embedded preferences schema: %w", err)
	}
	return payload, preferencesSchemaDefaultPath, preferencesSchemaSourceEmbed, nil
}

func readPreferencesSchemaFile(path string) ([]byte, string, error) {
	if strings.TrimSpace(path) == "" {
		return nil, "", fmt.Errorf("preferences schema path is empty")
	}

	cleaned := filepath.Clean(path)
	info, err := os.Stat(cleaned)
	if err != nil {
		return nil, "", fmt.Errorf("preferences schema path: %w", err)
	}

	location := cleaned
	if info.IsDir() {
		location = filepath.Join(cleaned, preferencesSchemaFileName)
	}

	payload, err := os.ReadFile(location)
	if err != nil {
		return nil, "", fmt.Errorf("read preferences schema: %w", err)
	}
	return payload, location, nil
}

func applyPreferencesSchemaOptions(schema map[string]any, themeOptions, variantOptions []Option) {
	if schema == nil {
		return
	}

	xform := ensureSchemaMap(schema, "x-formgen")
	if _, ok := xform["actions"]; !ok {
		xform["actions"] = []map[string]any{
			{
				"label": "Save Preferences",
				"type":  "submit",
				"kind":  "primary",
			},
		}
	}

	props, ok := schema["properties"].(map[string]any)
	if !ok {
		return
	}

	applyPreferenceSelectOptions(props, "theme", themeOptions, "System Default", "Leave blank to use the system default theme.")
	applyPreferenceSelectOptions(props, "theme_variant", variantOptions, "System Default", "Leave blank to use the system default variant.")
	applyPreferenceJSONEditorDefaults(props, "raw_ui")
	applyPreferenceClearKeysDefaults(props, "clear_ui_keys")
}

func applyPreferenceSelectOptions(props map[string]any, field string, options []Option, placeholder, helpText string) {
	prop, ok := props[field].(map[string]any)
	if !ok || prop == nil {
		return
	}

	xform := ensureSchemaMap(prop, "x-formgen")
	if _, ok := xform["widget"]; !ok {
		xform["widget"] = "select"
	}
	if placeholder != "" {
		if _, ok := xform["placeholder"]; !ok {
			xform["placeholder"] = placeholder
		}
	}
	if helpText != "" {
		if _, ok := xform["helpText"]; !ok {
			xform["helpText"] = helpText
		}
	}

	if _, ok := prop["enum"]; !ok {
		values := enumValuesFromOptions(options)
		if len(values) > 0 {
			prop["enum"] = values
		}
	}
}

func applyPreferenceJSONEditorDefaults(props map[string]any, field string) {
	prop, ok := props[field].(map[string]any)
	if !ok || prop == nil {
		return
	}

	xform := ensureSchemaMap(prop, "x-formgen")
	if _, ok := xform["widget"]; !ok {
		xform["widget"] = "json-editor"
	}
	if _, ok := xform["schema.example"]; !ok {
		xform["schema.example"] = "{\"ui.datagrid.users.columns\": {\"order\": [\"email\", \"username\"]}}"
	}
}

func applyPreferenceClearKeysDefaults(props map[string]any, field string) {
	prop, ok := props[field].(map[string]any)
	if !ok || prop == nil {
		return
	}

	xform := ensureSchemaMap(prop, "x-formgen")
	if _, ok := xform["placeholder"]; !ok {
		xform["placeholder"] = "ui.datagrid.users.columns ui.datagrid.users.order"
	}
	if _, ok := xform["helpText"]; !ok {
		xform["helpText"] = "Comma or whitespace-separated ui.* keys to remove."
	}
}

func ensureSchemaMap(parent map[string]any, key string) map[string]any {
	if parent == nil {
		return map[string]any{}
	}
	if existing, ok := parent[key].(map[string]any); ok {
		return existing
	}
	value := map[string]any{}
	parent[key] = value
	return value
}

func enumValuesFromOptions(options []Option) []any {
	if len(options) == 0 {
		return nil
	}
	seen := map[string]bool{}
	values := make([]any, 0, len(options))
	for _, opt := range options {
		val := strings.TrimSpace(toString(opt.Value))
		if val == "" || seen[val] {
			continue
		}
		seen[val] = true
		values = append(values, val)
	}
	if len(values) == 0 {
		return nil
	}
	return values
}
