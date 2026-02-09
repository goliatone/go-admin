package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestSerializeTemplateValue_SourceContextUsesJSONTags(t *testing.T) {
	source := &admin.SourceContext{
		File:       "/tmp/example.go",
		Line:       42,
		RelPath:    "github.com/example/project/example.go",
		CanOpenIDE: true,
		Lines: []admin.SourceLine{
			{
				Number:  42,
				Content: "panic(\"boom\")",
				IsError: true,
			},
		},
	}

	got := serializeTemplateValue(source)
	root, ok := got.(map[string]any)
	if !ok {
		t.Fatalf("expected map[string]any, got %T", got)
	}

	if _, ok := root["rel_path"].(string); !ok {
		t.Fatalf("expected rel_path string, got %T", root["rel_path"])
	}
	if _, ok := root["can_open_ide"].(bool); !ok {
		t.Fatalf("expected can_open_ide bool, got %T", root["can_open_ide"])
	}
	if got, ok := numericValue(root["line"]); !ok || got != 42 {
		t.Fatalf("expected line numeric value 42, got %v (%T)", root["line"], root["line"])
	}

	lines, ok := root["lines"].([]any)
	if !ok || len(lines) != 1 {
		t.Fatalf("expected lines slice with one entry, got %T len=%d", root["lines"], len(lines))
	}

	line, ok := lines[0].(map[string]any)
	if !ok {
		t.Fatalf("expected nested line map, got %T", lines[0])
	}
	if _, ok := line["is_error"].(bool); !ok {
		t.Fatalf("expected is_error bool, got %T", line["is_error"])
	}
	if got, ok := numericValue(line["number"]); !ok || got != 42 {
		t.Fatalf("expected number numeric value 42, got %v (%T)", line["number"], line["number"])
	}
}

func TestSerializeTemplateValue_StackFramesUseJSONTags(t *testing.T) {
	frames := []admin.StackFrameInfo{
		{
			File:       "/tmp/example.go",
			Line:       42,
			Function:   "main.main",
			IsAppCode:  true,
			IsExpanded: true,
			IDELink:    "vscode://file/tmp/example.go:42",
		},
	}

	got := serializeTemplateValue(frames)
	items, ok := got.([]any)
	if !ok || len(items) != 1 {
		t.Fatalf("expected []any with one frame, got %T len=%d", got, len(items))
	}

	frame, ok := items[0].(map[string]any)
	if !ok {
		t.Fatalf("expected frame map, got %T", items[0])
	}

	if _, ok := frame["is_app_code"].(bool); !ok {
		t.Fatalf("expected is_app_code bool, got %T", frame["is_app_code"])
	}
	if _, ok := frame["is_expanded"].(bool); !ok {
		t.Fatalf("expected is_expanded bool, got %T", frame["is_expanded"])
	}
	if _, ok := frame["ide_link"].(string); !ok {
		t.Fatalf("expected ide_link string, got %T", frame["ide_link"])
	}
}

func TestSerializeTemplateValue_UnserializableFallsBackToOriginal(t *testing.T) {
	value := make(chan int)

	got := serializeTemplateValue(value)
	gotChan, ok := got.(chan int)
	if !ok {
		t.Fatalf("expected chan int fallback, got %T", got)
	}
	if gotChan != value {
		t.Fatalf("expected original channel value to be preserved")
	}
}

func numericValue(v any) (int64, bool) {
	switch n := v.(type) {
	case int:
		return int64(n), true
	case int64:
		return n, true
	case float64:
		return int64(n), true
	default:
		return 0, false
	}
}
