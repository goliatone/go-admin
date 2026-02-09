package admin

import (
	"bytes"
	"encoding/json"
	"path"
	"strings"

	"github.com/goliatone/go-formgen/pkg/model"
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla/components"
)

const (
	blockEditorTemplate = "templates/components/block.tmpl"
	blockEditorPartial  = "forms.block"
)

type blockDefinition struct {
	Type           string
	Label          string
	Icon           string
	Collapsed      bool
	Schema         string
	RequiredFields []string
	Category       string
	Status         string
	HTML           string
}

func blockEditorRenderer(buf *bytes.Buffer, field model.Field, data components.ComponentData) error {
	if data.Template == nil {
		return serviceNotConfiguredDomainError("block editor template renderer", map[string]any{"component": "block_editor"})
	}

	templateName := blockEditorTemplate
	if data.ThemePartials != nil {
		if candidate := strings.TrimSpace(data.ThemePartials[blockEditorPartial]); candidate != "" {
			templateName = candidate
		}
	}

	blocks, err := blockDefinitionsFromField(field, data.RenderChild)
	if err != nil {
		return err
	}

	serialized := serializeBlockDefaults(field.Default)

	sortable := resolveBlockBool(data.Config, field.UIHints, "sortable", false)
	addLabel := resolveBlockString(data.Config, field.UIHints, "addLabel", "")
	emptyLabel := resolveBlockString(data.Config, field.UIHints, "emptyLabel", "")

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
		"blocks":      blocks,
		"serialized":  serialized,
		"sortable":    sortable,
		"add_label":   addLabel,
		"empty_label": emptyLabel,
	}

	rendered, err := data.Template.RenderTemplate(templateName, payload)
	if err != nil {
		return serviceUnavailableDomainError("block editor render template failed", map[string]any{"component": "block_editor", "template": templateName, "error": err.Error()})
	}
	buf.WriteString(rendered)
	return nil
}

func serializeBlockDefaults(value any) string {
	if value == nil {
		return ""
	}
	if raw, ok := value.(string); ok {
		return strings.TrimSpace(raw)
	}
	payload, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(payload)
}

func resolveBlockBool(config map[string]any, hints map[string]string, key string, fallback bool) bool {
	if config != nil {
		if raw, ok := config[key]; ok {
			if value, ok := raw.(bool); ok {
				return value
			}
		}
	}
	if hints != nil {
		if raw, ok := hints[key]; ok {
			normalized := strings.TrimSpace(strings.ToLower(raw))
			if normalized == "true" {
				return true
			}
			if normalized == "false" {
				return false
			}
		}
	}
	return fallback
}

func resolveBlockString(config map[string]any, hints map[string]string, key string, fallback string) string {
	if config != nil {
		if raw, ok := config[key]; ok {
			if value, ok := raw.(string); ok {
				if normalized, ok := normalizeBlockStringValue(value); ok {
					return normalized
				}
			}
		}
	}
	if hints != nil {
		if normalized, ok := normalizeBlockStringValue(hints[key]); ok {
			return normalized
		}
	}
	return fallback
}

func normalizeBlockStringValue(raw string) (string, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", false
	}
	switch strings.ToLower(value) {
	case "true", "false":
		return "", false
	default:
		return value, true
	}
}

func blockDefinitionsFromField(field model.Field, renderChild func(any) (string, error)) ([]blockDefinition, error) {
	if renderChild == nil {
		return nil, nil
	}

	candidates := blockDefinitionCandidatesWithDiscriminator(field, false)
	if len(candidates) == 0 && field.Items != nil {
		candidates = blockDefinitionCandidatesWithDiscriminator(*field.Items, true)
	}

	definitions := make([]blockDefinition, 0, len(candidates))
	for _, candidate := range candidates {
		blockType := blockTypeFromField(candidate)
		if blockType == "" {
			continue
		}

		label := strings.TrimSpace(candidate.Label)
		if label == "" {
			label = blockType
		}
		if candidate.UIHints != nil {
			if hintLabel := strings.TrimSpace(candidate.UIHints["label"]); hintLabel != "" {
				label = hintLabel
			}
		}

		icon := ""
		if candidate.UIHints != nil {
			icon = strings.TrimSpace(candidate.UIHints["icon"])
		}

		collapsed := false
		if candidate.UIHints != nil {
			collapsed = parseHintBool(candidate.UIHints["collapsed"])
		}

		schemaVersion := blockSchemaVersionFromField(candidate)

		html, err := renderBlockFields(candidate, renderChild)
		if err != nil {
			return nil, err
		}

		definitions = append(definitions, blockDefinition{
			Type:      blockType,
			Label:     label,
			Icon:      icon,
			Collapsed: collapsed,
			Schema:    schemaVersion,
			HTML:      html,
		})
	}

	return definitions, nil
}

func blockDefinitionCandidates(field model.Field) []model.Field {
	return blockDefinitionCandidatesWithDiscriminator(field, false)
}

func blockDefinitionCandidatesWithDiscriminator(field model.Field, requireDiscriminator bool) []model.Field {
	if len(field.Nested) == 0 {
		return nil
	}
	if !requireDiscriminator {
		return field.Nested
	}
	candidates := make([]model.Field, 0, len(field.Nested))
	for _, nested := range field.Nested {
		if nested.Type != model.FieldTypeObject && len(nested.Nested) == 0 {
			continue
		}
		if blockTypeFromNested(nested.Nested) == "" {
			if nested.UIHints == nil || strings.TrimSpace(nested.UIHints["blockType"]) == "" {
				continue
			}
		}
		candidates = append(candidates, nested)
	}
	return candidates
}

func renderBlockFields(block model.Field, renderChild func(any) (string, error)) (string, error) {
	var builder strings.Builder
	if len(block.Nested) == 0 {
		html, err := renderChild(block)
		if err != nil {
			return "", err
		}
		builder.WriteString(html)
		return builder.String(), nil
	}
	for _, nested := range block.Nested {
		html, err := renderChild(nested)
		if err != nil {
			return "", err
		}
		builder.WriteString(html)
	}
	return builder.String(), nil
}

func blockTypeFromField(field model.Field) string {
	if field.UIHints != nil {
		if value := strings.TrimSpace(field.UIHints["blockType"]); value != "" {
			return value
		}
		if value := strings.TrimSpace(field.UIHints["type"]); value != "" {
			return value
		}
	}
	if field.Metadata != nil {
		if value := strings.TrimSpace(field.Metadata["block.type"]); value != "" {
			return value
		}
	}

	if nestedType := blockTypeFromNested(field.Nested); nestedType != "" {
		return nestedType
	}

	return strings.TrimSpace(field.Name)
}

func blockTypeFromNested(fields []model.Field) string {
	for _, nested := range fields {
		if nested.Name != "_type" {
			continue
		}
		if value, ok := nested.Default.(string); ok {
			if trimmed := strings.TrimSpace(value); trimmed != "" {
				return trimmed
			}
		}
		if len(nested.Enum) == 1 {
			if value, ok := nested.Enum[0].(string); ok {
				if trimmed := strings.TrimSpace(value); trimmed != "" {
					return trimmed
				}
			}
		}
	}
	return ""
}

func blockSchemaVersionFromField(field model.Field) string {
	if field.Metadata != nil {
		for _, key := range []string{
			"schema_version",
			"schema.version",
			"schemaVersion",
			"metadata.schema_version",
			"metadata.schemaVersion",
		} {
			if value := strings.TrimSpace(field.Metadata[key]); value != "" {
				return value
			}
		}
	}
	if field.UIHints != nil {
		for _, key := range []string{
			"schemaVersion",
			"schema_version",
		} {
			if value := strings.TrimSpace(field.UIHints[key]); value != "" {
				return value
			}
		}
	}
	if nested := schemaVersionFromNested(field.Nested); nested != "" {
		return nested
	}
	return ""
}

func schemaVersionFromNested(fields []model.Field) string {
	for _, nested := range fields {
		if nested.Name != "_schema" {
			continue
		}
		if value, ok := nested.Default.(string); ok {
			if trimmed := strings.TrimSpace(value); trimmed != "" {
				return trimmed
			}
		}
		if len(nested.Enum) == 1 {
			if value, ok := nested.Enum[0].(string); ok {
				if trimmed := strings.TrimSpace(value); trimmed != "" {
					return trimmed
				}
			}
		}
	}
	return ""
}

func parseHintBool(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "true", "1", "yes":
		return true
	default:
		return false
	}
}

func blockEditorScript(basePath string) string {
	assetsPrefix := path.Join(strings.TrimSuffix(strings.TrimSpace(basePath), "/"), "assets")
	if assetsPrefix == "" || assetsPrefix == "assets" {
		assetsPrefix = "/assets"
	}
	if !strings.HasPrefix(assetsPrefix, "/") {
		assetsPrefix = "/" + assetsPrefix
	}
	return path.Join(assetsPrefix, "dist/formgen/block_editor.js")
}

// BlockEditorDescriptor returns the component descriptor for registration.
func BlockEditorDescriptor(basePath string) components.Descriptor {
	return components.Descriptor{
		Renderer: blockEditorRenderer,
		Scripts: []components.Script{
			{Src: blockEditorScript(basePath), Defer: true, Module: true},
		},
	}
}
