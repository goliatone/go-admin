package templateview

import "testing"

func TestNormalizeContextNumbersConvertsWholeFloatToInt64(t *testing.T) {
	input := map[string]any{
		"span": 6.0,
		"nested": map[string]any{
			"pending": 1.0,
		},
		"items": []any{
			2.0,
			2.5,
		},
		"areas": []map[string]any{
			{
				"widgets": []map[string]any{
					{"span": 12.0},
				},
			},
		},
	}

	outAny := NormalizeContextNumbers(input)
	out, ok := outAny.(map[string]any)
	if !ok {
		t.Fatalf("expected map output, got %T", outAny)
	}

	if _, ok := out["span"].(int64); !ok {
		t.Fatalf("expected span int64, got %T", out["span"])
	}
	nested, ok := out["nested"].(map[string]any)
	if !ok {
		t.Fatalf("expected nested map, got %T", out["nested"])
	}
	if _, ok := nested["pending"].(int64); !ok {
		t.Fatalf("expected nested pending int64, got %T", nested["pending"])
	}
	items, ok := out["items"].([]any)
	if !ok {
		t.Fatalf("expected items slice, got %T", out["items"])
	}
	if _, ok := items[0].(int64); !ok {
		t.Fatalf("expected items[0] int64, got %T", items[0])
	}
	if _, ok := items[1].(float64); !ok {
		t.Fatalf("expected items[1] float64, got %T", items[1])
	}
	areas, ok := out["areas"].([]map[string]any)
	if !ok {
		t.Fatalf("expected areas []map[string]any, got %T", out["areas"])
	}
	widgets, ok := areas[0]["widgets"].([]map[string]any)
	if !ok {
		t.Fatalf("expected widgets []map[string]any, got %T", areas[0]["widgets"])
	}
	if _, ok := widgets[0]["span"].(int64); !ok {
		t.Fatalf("expected widgets[0].span int64, got %T", widgets[0]["span"])
	}
}
