package quickstart

import (
	"net/url"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestParseMultiValueScalarCollapsesIdenticalDuplicates(t *testing.T) {
	value, err := parseMultiValue([]string{"temp_123", "temp_123"}, schemaPathInfo{})
	if err != nil {
		t.Fatalf("parseMultiValue: %v", err)
	}
	if got := anyToString(value); got != "temp_123" {
		t.Fatalf("expected temp_123, got %q", got)
	}
}

func TestParseMultiValueScalarRejectsConflictingDuplicates(t *testing.T) {
	if _, err := parseMultiValue([]string{"temp_123", "temp_456"}, schemaPathInfo{}); err == nil {
		t.Fatal("expected conflicting duplicate scalar values error")
	}
}

func TestParseMultiValueArrayRemainsArray(t *testing.T) {
	value, err := parseMultiValue([]string{"1", "2"}, schemaPathInfo{
		Schema: map[string]any{
			"type": "array",
			"items": map[string]any{
				"type": "integer",
			},
		},
		Type: "array",
	})
	if err != nil {
		t.Fatalf("parseMultiValue: %v", err)
	}
	values, ok := value.([]any)
	if !ok {
		t.Fatalf("expected []any result, got %T", value)
	}
	if len(values) != 2 {
		t.Fatalf("expected 2 values, got %d", len(values))
	}
	first, ok := values[0].(int)
	if !ok || first != 1 {
		t.Fatalf("expected first value 1, got %#v", values[0])
	}
	second, ok := values[1].(int)
	if !ok || second != 2 {
		t.Fatalf("expected second value 2, got %#v", values[1])
	}
}

func TestParseFormPayloadNormalizesRepeatedArrayFieldSuffix(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Body").Return([]byte("gallery%5B%5D=/admin/api/media/delivery/media-1/asset&gallery%5B%5D=/admin/api/media/delivery/media-2/asset&hero=/admin/api/media/delivery/media-hero/asset"))
	h := &contentEntryHandlers{}
	record, err := h.parseFormPayload(ctx, map[string]any{
		"type": "object",
		"properties": map[string]any{
			"hero": map[string]any{
				"type": "string",
			},
			"gallery": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "string",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("parseFormPayload: %v", err)
	}
	gallery, ok := record["gallery"].([]any)
	if !ok {
		t.Fatalf("expected gallery array, got %#v", record["gallery"])
	}
	if len(gallery) != 2 || gallery[0] != "/admin/api/media/delivery/media-1/asset" || gallery[1] != "/admin/api/media/delivery/media-2/asset" {
		t.Fatalf("expected ordered gallery values, got %#v", gallery)
	}
	if _, exists := record["gallery[]"]; exists {
		t.Fatalf("did not expect raw gallery[] key in record: %#v", record)
	}
	if got := record["hero"]; got != "/admin/api/media/delivery/media-hero/asset" {
		t.Fatalf("expected scalar hero value, got %#v", got)
	}
}

func TestParseFormPayloadNormalizesSingleArrayFieldSuffixValue(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Body").Return([]byte("gallery%5B%5D=/admin/api/media/delivery/media-solo/asset"))
	h := &contentEntryHandlers{}
	record, err := h.parseFormPayload(ctx, map[string]any{
		"type": "object",
		"properties": map[string]any{
			"gallery": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "string",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("parseFormPayload: %v", err)
	}
	gallery, ok := record["gallery"].([]any)
	if !ok {
		t.Fatalf("expected gallery array, got %#v", record["gallery"])
	}
	if len(gallery) != 1 || gallery[0] != "/admin/api/media/delivery/media-solo/asset" {
		t.Fatalf("expected one-item gallery array, got %#v", gallery)
	}
}

func TestParseFormPayloadKeepsSingleArrayFieldAsArray(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Body").Return([]byte("gallery=/admin/api/media/delivery/media-solo/asset"))
	h := &contentEntryHandlers{}
	record, err := h.parseFormPayload(ctx, map[string]any{
		"type": "object",
		"properties": map[string]any{
			"gallery": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "string",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("parseFormPayload: %v", err)
	}
	gallery, ok := record["gallery"].([]any)
	if !ok {
		t.Fatalf("expected gallery array, got %#v", record["gallery"])
	}
	if len(gallery) != 1 || gallery[0] != "/admin/api/media/delivery/media-solo/asset" {
		t.Fatalf("expected one-item gallery array, got %#v", gallery)
	}
}

func TestParseFormPayloadKeepsEmptyArrayFieldAsEmptyArray(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Body").Return([]byte("gallery="))
	h := &contentEntryHandlers{}
	record, err := h.parseFormPayload(ctx, map[string]any{
		"type": "object",
		"properties": map[string]any{
			"gallery": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "string",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("parseFormPayload: %v", err)
	}
	gallery, ok := record["gallery"].([]any)
	if !ok {
		t.Fatalf("expected gallery array, got %#v", record["gallery"])
	}
	if len(gallery) != 0 {
		t.Fatalf("expected empty gallery array, got %#v", gallery)
	}
}

func TestParseFormPayloadPreservesJSONArrayFieldValue(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Body").Return([]byte("blocks=%5B%7B%22_type%22%3A%22hero%22%7D%5D"))
	h := &contentEntryHandlers{}
	record, err := h.parseFormPayload(ctx, map[string]any{
		"type": "object",
		"properties": map[string]any{
			"blocks": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "object",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("parseFormPayload: %v", err)
	}
	blocks, ok := record["blocks"].([]any)
	if !ok {
		t.Fatalf("expected blocks array, got %#v", record["blocks"])
	}
	if len(blocks) != 1 {
		t.Fatalf("expected one block, got %#v", blocks)
	}
	block, ok := blocks[0].(map[string]any)
	if !ok || block["_type"] != "hero" {
		t.Fatalf("expected decoded block value, got %#v", blocks[0])
	}
}

func TestParseFormPayloadPreservesIndexedNestedArrayObjects(t *testing.T) {
	form := url.Values{}
	form.Set("columns[0].title", "Subjects")
	form.Set("columns[0].entries[0].topic_id", "topic-refuge-id")
	form.Set("columns[0].entries[0].topic_slug", "refuge")
	form.Set("columns[0].entries[1].topic_id", "topic-bodhisattva-id")
	form.Set("columns[1].title", "Deity Practice")
	form.Set("columns[1].entries[0].topic_id", "topic-tara-id")

	ctx := router.NewMockContext()
	ctx.On("Body").Return([]byte(form.Encode()))
	h := &contentEntryHandlers{}
	record, err := h.parseFormPayload(ctx, map[string]any{
		"type": "object",
		"properties": map[string]any{
			"columns": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"title": map[string]any{
							"type": "string",
						},
						"entries": map[string]any{
							"type": "array",
							"items": map[string]any{
								"type": "object",
								"properties": map[string]any{
									"enabled": map[string]any{
										"type": "boolean",
									},
									"topic_id": map[string]any{
										"type": "string",
									},
									"topic_slug": map[string]any{
										"type": "string",
									},
								},
							},
						},
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("parseFormPayload: %v", err)
	}
	columns, ok := record["columns"].([]any)
	if !ok {
		t.Fatalf("expected columns array, got %#v", record["columns"])
	}
	if len(columns) != 2 {
		t.Fatalf("expected two columns, got %#v", columns)
	}
	firstColumn, ok := columns[0].(map[string]any)
	if !ok {
		t.Fatalf("expected first column object, got %#v", columns[0])
	}
	if got := firstColumn["title"]; got != "Subjects" {
		t.Fatalf("expected first column title, got %#v", got)
	}
	firstEntries, ok := firstColumn["entries"].([]any)
	if !ok {
		t.Fatalf("expected first column entries array, got %#v", firstColumn["entries"])
	}
	if len(firstEntries) != 2 {
		t.Fatalf("expected two first-column entries, got %#v", firstEntries)
	}
	firstEntry, ok := firstEntries[0].(map[string]any)
	if !ok {
		t.Fatalf("expected first entry object, got %#v", firstEntries[0])
	}
	if got := firstEntry["topic_id"]; got != "topic-refuge-id" {
		t.Fatalf("expected first entry topic_id, got %#v", got)
	}
	if got := firstEntry["topic_slug"]; got != "refuge" {
		t.Fatalf("expected first entry topic_slug, got %#v", got)
	}
	secondColumn, ok := columns[1].(map[string]any)
	if !ok {
		t.Fatalf("expected second column object, got %#v", columns[1])
	}
	secondEntries, ok := secondColumn["entries"].([]any)
	if !ok || len(secondEntries) != 1 {
		t.Fatalf("expected one second-column entry, got %#v", secondColumn["entries"])
	}
	secondEntry, ok := secondEntries[0].(map[string]any)
	if !ok || secondEntry["topic_id"] != "topic-tara-id" {
		t.Fatalf("expected second-column topic_id, got %#v", secondEntries[0])
	}
	if _, exists := record["columns[0].entries[0].topic_id"]; exists {
		t.Fatalf("did not expect raw indexed key in record: %#v", record)
	}
}

func TestParseFormPayloadIndexedNestedScalarCollapsesBlankDuplicate(t *testing.T) {
	form := url.Values{}
	form.Add("columns[0].entries[0].topic_id", "")
	form.Add("columns[0].entries[0].topic_id", "topic-refuge-id")

	ctx := router.NewMockContext()
	ctx.On("Body").Return([]byte(form.Encode()))
	h := &contentEntryHandlers{}
	record, err := h.parseFormPayload(ctx, map[string]any{
		"type": "object",
		"properties": map[string]any{
			"columns": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"entries": map[string]any{
							"type": "array",
							"items": map[string]any{
								"type": "object",
								"properties": map[string]any{
									"topic_id": map[string]any{
										"type": "string",
									},
								},
							},
						},
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("parseFormPayload: %v", err)
	}
	columns := record["columns"].([]any)
	firstColumn := columns[0].(map[string]any)
	entries := firstColumn["entries"].([]any)
	firstEntry := entries[0].(map[string]any)
	if got := firstEntry["topic_id"]; got != "topic-refuge-id" {
		t.Fatalf("expected duplicate scalar collapse to keep selected value, got %#v", got)
	}
}

func TestParseFormPayloadCoercesIndexedArrayItems(t *testing.T) {
	form := url.Values{}
	form.Set("scores[0]", "1")
	form.Set("scores[1]", "2")
	form.Add("columns[0].weights[]", "3")
	form.Add("columns[0].weights[]", "4")

	ctx := router.NewMockContext()
	ctx.On("Body").Return([]byte(form.Encode()))
	h := &contentEntryHandlers{}
	record, err := h.parseFormPayload(ctx, map[string]any{
		"type": "object",
		"properties": map[string]any{
			"scores": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "integer",
				},
			},
			"columns": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"weights": map[string]any{
							"type": "array",
							"items": map[string]any{
								"type": "integer",
							},
						},
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("parseFormPayload: %v", err)
	}
	scores, ok := record["scores"].([]any)
	if !ok || len(scores) != 2 {
		t.Fatalf("expected two scores, got %#v", record["scores"])
	}
	if first, ok := scores[0].(int); !ok || first != 1 {
		t.Fatalf("expected first score int 1, got %#v", scores[0])
	}
	if second, ok := scores[1].(int); !ok || second != 2 {
		t.Fatalf("expected second score int 2, got %#v", scores[1])
	}
	columns := record["columns"].([]any)
	firstColumn := columns[0].(map[string]any)
	weights, ok := firstColumn["weights"].([]any)
	if !ok || len(weights) != 2 {
		t.Fatalf("expected two weights, got %#v", firstColumn["weights"])
	}
	if first, ok := weights[0].(int); !ok || first != 3 {
		t.Fatalf("expected first weight int 3, got %#v", weights[0])
	}
	if second, ok := weights[1].(int); !ok || second != 4 {
		t.Fatalf("expected second weight int 4, got %#v", weights[1])
	}
}

func TestParseFormPayloadRejectsNestedAppendObjectFields(t *testing.T) {
	form := url.Values{}
	form.Set("columns[0].entries[].topic_id", "topic-refuge-id")

	ctx := router.NewMockContext()
	ctx.On("Body").Return([]byte(form.Encode()))
	h := &contentEntryHandlers{}
	_, err := h.parseFormPayload(ctx, map[string]any{
		"type": "object",
		"properties": map[string]any{
			"columns": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"entries": map[string]any{
							"type": "array",
							"items": map[string]any{
								"type": "object",
								"properties": map[string]any{
									"topic_id": map[string]any{
										"type": "string",
									},
								},
							},
						},
					},
				},
			},
		},
	})
	if err == nil {
		t.Fatal("expected ambiguous nested append object field to be rejected")
	}
}
