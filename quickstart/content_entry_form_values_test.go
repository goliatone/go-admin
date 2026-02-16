package quickstart

import "testing"

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

