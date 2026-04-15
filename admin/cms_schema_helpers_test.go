package admin

import "testing"

func TestSchemaToFieldsConverterPrefersFlatMediaWidgetHintsForCompatibility(t *testing.T) {
	t.Parallel()

	converter := NewSchemaToFieldsConverter()
	schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"hero": map[string]any{
				"type":             "string",
				"format":           "uri",
				"x-formgen:widget": "media-picker",
			},
		},
	}

	converted := converter.Convert(schema, nil)
	if len(converted.Form) != 1 {
		t.Fatalf("expected one form field, got %+v", converted.Form)
	}
	if got := converted.Form[0].Type; got != "media-picker" {
		t.Fatalf("expected media-picker field type from flat compatibility hint, got %q", got)
	}
}

func TestNormalizeSchemaFieldTypeCanonicalizesMediaAliases(t *testing.T) {
	t.Parallel()

	if got := normalizeSchemaFieldType("media", nil); got != "media-picker" {
		t.Fatalf("expected media alias to normalize to media-picker, got %q", got)
	}
	if got := normalizeSchemaFieldType("media_picker", nil); got != "media-picker" {
		t.Fatalf("expected media_picker alias to normalize to media-picker, got %q", got)
	}
	if got := normalizeSchemaFieldType("media-gallery", nil); got != "media-gallery" {
		t.Fatalf("expected media-gallery to remain canonical, got %q", got)
	}
}
