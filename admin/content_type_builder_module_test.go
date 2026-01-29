package admin

import "testing"

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
