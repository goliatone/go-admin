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
