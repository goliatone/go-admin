package admin

import (
	"bytes"
	"encoding/json"
	"fmt"
	"path"
	"strings"

	"github.com/goliatone/go-formgen/pkg/model"
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla/components"
)

const (
	schemaEditorTemplate = "templates/components/schema_editor.tmpl"
	schemaEditorPartial  = "forms.schema-editor"
)

func schemaEditorRenderer(buf *bytes.Buffer, field model.Field, data components.ComponentData) error {
	if data.Template == nil {
		return fmt.Errorf("schema editor: template renderer not configured")
	}

	templateName := schemaEditorTemplate
	if data.ThemePartials != nil {
		if candidate := strings.TrimSpace(data.ThemePartials[schemaEditorPartial]); candidate != "" {
			templateName = candidate
		}
	}

	serialized := serializeSchemaDefault(field.Default)
	configJSON := ""
	if len(data.Config) > 0 {
		if raw, err := json.Marshal(data.Config); err == nil {
			configJSON = string(raw)
		}
	}

	payload := map[string]any{
		"field":       field,
		"config":      data.Config,
		"config_json": configJSON,
		"serialized":  serialized,
	}

	rendered, err := data.Template.RenderTemplate(templateName, payload)
	if err != nil {
		return fmt.Errorf("schema editor: render template %q: %w", templateName, err)
	}
	buf.WriteString(rendered)
	return nil
}

func serializeSchemaDefault(value any) string {
	if value == nil {
		return ""
	}
	if raw, ok := value.(string); ok {
		return strings.TrimSpace(raw)
	}
	payload, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return ""
	}
	return string(payload)
}

func schemaEditorScript(basePath string) string {
	assetsPrefix := path.Join(strings.TrimSuffix(strings.TrimSpace(basePath), "/"), "assets")
	if assetsPrefix == "" || assetsPrefix == "assets" {
		assetsPrefix = "/assets"
	}
	if !strings.HasPrefix(assetsPrefix, "/") {
		assetsPrefix = "/" + assetsPrefix
	}
	return path.Join(assetsPrefix, "dist/formgen/schema_editor.js")
}

// SchemaEditorDescriptor returns the component descriptor for registration.
func SchemaEditorDescriptor(basePath string) components.Descriptor {
	return components.Descriptor{
		Renderer: schemaEditorRenderer,
		Scripts: []components.Script{
			{Src: schemaEditorScript(basePath), Defer: true, Module: true},
		},
	}
}
