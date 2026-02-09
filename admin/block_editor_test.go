package admin

import "testing"

func TestResolveBlockString_IgnoresBooleanLikeValues(t *testing.T) {
	t.Run("config boolean-like string falls back", func(t *testing.T) {
		got := resolveBlockString(map[string]any{"addLabel": "True"}, nil, "addLabel", "Add block")
		if got != "Add block" {
			t.Fatalf("expected fallback label, got %q", got)
		}
	})

	t.Run("ui hint boolean-like string falls back", func(t *testing.T) {
		got := resolveBlockString(nil, map[string]string{"emptyLabel": "true"}, "emptyLabel", "No blocks added yet.")
		if got != "No blocks added yet." {
			t.Fatalf("expected fallback label, got %q", got)
		}
	})
}

func TestResolveBlockString_UsesTrimmedStringValues(t *testing.T) {
	if got := resolveBlockString(map[string]any{"addLabel": "  Add section  "}, nil, "addLabel", "fallback"); got != "Add section" {
		t.Fatalf("expected trimmed config label, got %q", got)
	}
	if got := resolveBlockString(nil, map[string]string{"emptyLabel": "  Nothing yet  "}, "emptyLabel", "fallback"); got != "Nothing yet" {
		t.Fatalf("expected trimmed hint label, got %q", got)
	}
}
