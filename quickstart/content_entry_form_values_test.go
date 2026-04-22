package quickstart

import (
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
	ctx.On("Body").Return([]byte("gallery%5B%5D=/media/1.jpg&gallery%5B%5D=/media/2.jpg&hero=/media/hero.jpg"))
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
	if len(gallery) != 2 || gallery[0] != "/media/1.jpg" || gallery[1] != "/media/2.jpg" {
		t.Fatalf("expected ordered gallery values, got %#v", gallery)
	}
	if _, exists := record["gallery[]"]; exists {
		t.Fatalf("did not expect raw gallery[] key in record: %#v", record)
	}
	if got := record["hero"]; got != "/media/hero.jpg" {
		t.Fatalf("expected scalar hero value, got %#v", got)
	}
}

func TestParseFormPayloadNormalizesSingleArrayFieldSuffixValue(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Body").Return([]byte("gallery%5B%5D=/media/solo.jpg"))
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
	if len(gallery) != 1 || gallery[0] != "/media/solo.jpg" {
		t.Fatalf("expected one-item gallery array, got %#v", gallery)
	}
}

func TestParseFormPayloadKeepsSingleArrayFieldAsArray(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Body").Return([]byte("gallery=/media/solo.jpg"))
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
	if len(gallery) != 1 || gallery[0] != "/media/solo.jpg" {
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
