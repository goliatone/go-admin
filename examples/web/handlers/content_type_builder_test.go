package handlers

import "testing"

func TestDiffSchemasDetectsBreakingChanges(t *testing.T) {
	oldSchema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title": map[string]any{
				"type": "string",
				"enum": []any{"a", "b"},
			},
			"count": map[string]any{
				"type": "number",
			},
		},
		"required": []any{"title"},
	}
	newSchema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title": map[string]any{
				"type": "number",
				"enum": []any{"a"},
			},
			"count": map[string]any{
				"type": "number",
			},
			"subtitle": map[string]any{
				"type": "string",
			},
		},
		"required": []any{"title", "count"},
	}

	breaking, warnings := diffSchemas(oldSchema, newSchema)
	if len(breaking) < 3 {
		t.Fatalf("expected at least 3 breaking changes, got %d (%v)", len(breaking), breaking)
	}
	if len(warnings) == 0 {
		t.Fatalf("expected warnings for non-breaking changes, got none")
	}
}

func TestVersionStoreReturnsNewestFirst(t *testing.T) {
	store := newContentTypeVersionStore()
	key := "ct-1"
	store.addVersion(key, contentTypeSchemaVersion{Version: "1", Schema: map[string]any{"type": "object"}, CreatedAt: "2026-01-01T00:00:00Z"})
	store.addVersion(key, contentTypeSchemaVersion{Version: "2", Schema: map[string]any{"type": "object"}, CreatedAt: "2026-01-02T00:00:00Z"})

	versions := store.listVersions(key)
	if len(versions) != 2 {
		t.Fatalf("expected 2 versions, got %d", len(versions))
	}
	if versions[0].Version != "2" || versions[1].Version != "1" {
		t.Fatalf("expected newest-first ordering, got %+v", versions)
	}
}
