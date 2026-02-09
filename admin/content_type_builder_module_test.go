package admin

import (
	"context"
	"strings"
	"testing"

	formgenrender "github.com/goliatone/go-formgen/pkg/render"
)

func TestSchemaHasPreviewableFields(t *testing.T) {
	if schemaHasPreviewableFields(nil) {
		t.Fatalf("expected nil schema to be non-previewable")
	}
	if schemaHasPreviewableFields(map[string]any{"type": "object", "properties": map[string]any{}}) {
		t.Fatalf("expected empty properties to be non-previewable")
	}
	if !schemaHasPreviewableFields(map[string]any{"type": "object", "properties": map[string]any{"title": map[string]any{"type": "string"}}}) {
		t.Fatalf("expected schema with properties to be previewable")
	}
}

func TestNormalizeFormgenSchemaCompatibility_BlockLibraryPickerOneOfArray(t *testing.T) {
	input := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"blocks": map[string]any{
				"type": "array",
				"x-formgen": map[string]any{
					"widget": "block-library-picker",
				},
				"items": map[string]any{
					"oneOf": []any{
						map[string]any{"$ref": "#/$defs/hero"},
					},
				},
			},
		},
	}

	out := normalizeFormgenSchemaCompatibility(input)
	props, _ := out["properties"].(map[string]any)
	blocks, _ := props["blocks"].(map[string]any)
	formgen, _ := blocks["x-formgen"].(map[string]any)
	if got := formgen["widget"]; got != "block-library-picker" {
		t.Fatalf("expected block-library-picker widget, got %v", got)
	}
	if got := formgen["component.name"]; got != "block-library-picker" {
		t.Fatalf("expected component.name block-library-picker, got %v", got)
	}
	if allowed, _ := formgen["allowedBlocks"].([]string); len(allowed) != 1 || allowed[0] != "hero" {
		t.Fatalf("expected allowedBlocks [hero], got %v", formgen["allowedBlocks"])
	}
	componentConfig, _ := formgen["component.config"].(map[string]any)
	allowedFromConfig, _ := componentConfig["allowedBlocks"].([]string)
	if len(allowedFromConfig) != 1 || allowedFromConfig[0] != "hero" {
		t.Fatalf("expected component.config.allowedBlocks [hero], got %v", componentConfig["allowedBlocks"])
	}
	if includeInactive, _ := componentConfig["includeInactive"].(bool); !includeInactive {
		t.Fatalf("expected component.config.includeInactive=true, got %v", componentConfig["includeInactive"])
	}
	items, _ := blocks["items"].(map[string]any)
	if _, ok := items["oneOf"]; ok {
		t.Fatalf("expected oneOf removed from picker schema")
	}

	// Original input should remain unchanged.
	inProps, _ := input["properties"].(map[string]any)
	inBlocks, _ := inProps["blocks"].(map[string]any)
	inFormgen, _ := inBlocks["x-formgen"].(map[string]any)
	if got := inFormgen["widget"]; got != "block-library-picker" {
		t.Fatalf("expected input widget untouched, got %v", got)
	}
	inItems, _ := inBlocks["items"].(map[string]any)
	if _, ok := inItems["oneOf"]; !ok {
		t.Fatalf("expected input oneOf preserved")
	}
}

func TestNormalizeFormgenSchemaCompatibility_AllowsHyphenUnderscoreBlockAliases(t *testing.T) {
	input := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"blocks": map[string]any{
				"type": "array",
				"x-formgen": map[string]any{
					"widget": "block-library-picker",
				},
				"items": map[string]any{
					"oneOf": []any{
						map[string]any{"$ref": "#/$defs/rich_text"},
					},
				},
			},
		},
	}

	out := normalizeFormgenSchemaCompatibility(input)
	props, _ := out["properties"].(map[string]any)
	blocks, _ := props["blocks"].(map[string]any)
	formgen, _ := blocks["x-formgen"].(map[string]any)
	allowed, _ := formgen["allowedBlocks"].([]string)
	if len(allowed) < 2 {
		t.Fatalf("expected alias-expanded allowedBlocks, got %v", allowed)
	}
	seen := map[string]bool{}
	for _, key := range allowed {
		seen[key] = true
	}
	if !seen["rich_text"] {
		t.Fatalf("expected rich_text in allowedBlocks, got %v", allowed)
	}
	if !seen["rich-text"] {
		t.Fatalf("expected rich-text in allowedBlocks, got %v", allowed)
	}
}

func TestFormgenSchemaValidator_RenderForm_UsesBlockLibraryPickerComponent(t *testing.T) {
	validator, err := NewFormgenSchemaValidatorWithAPIBase("/admin", "/admin/api")
	if err != nil {
		t.Fatalf("validator init failed: %v", err)
	}
	schema := map[string]any{
		"$schema": "https://json-schema.org/draft/2020-12/schema",
		"type":    "object",
		"properties": map[string]any{
			"blocks": map[string]any{
				"type": "array",
				"x-formgen": map[string]any{
					"widget": "block-library-picker",
				},
				"items": map[string]any{
					"oneOf": []any{
						map[string]any{"$ref": "#/$defs/hero"},
					},
				},
			},
		},
	}

	html, err := validator.RenderForm(
		context.Background(),
		schema,
		SchemaValidationOptions{Slug: "page"},
		formgenrender.RenderOptions{},
	)
	if err != nil {
		t.Fatalf("render failed: %v", err)
	}
	if !strings.Contains(html, `data-component="block-library-picker"`) {
		t.Fatalf("expected block-library-picker component in html: %s", html)
	}
	if !strings.Contains(html, `data-block-library-picker="true"`) {
		t.Fatalf("expected block-library-picker marker in html: %s", html)
	}
	if !strings.Contains(html, `data-block-add-label="Add block"`) {
		t.Fatalf("expected default add label in html: %s", html)
	}
	if !strings.Contains(html, `data-block-empty-label="No blocks added yet."`) {
		t.Fatalf("expected default empty label in html: %s", html)
	}
	if strings.Contains(html, `name="blocksItem"`) {
		t.Fatalf("expected no blocksItem fallback JSON editor in html: %s", html)
	}
}
