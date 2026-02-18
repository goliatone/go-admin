package primitives

import "testing"

func TestFirstNonEmpty(t *testing.T) {
	if got := FirstNonEmpty("", "  ", " value ", "fallback"); got != "value" {
		t.Fatalf("FirstNonEmpty mismatch: got %q", got)
	}
	if got := FirstNonEmpty("", " \t "); got != "" {
		t.Fatalf("expected empty result, got %q", got)
	}
}

func TestFirstNonEmptyRaw(t *testing.T) {
	if got := FirstNonEmptyRaw("", "  ", " value ", "fallback"); got != " value " {
		t.Fatalf("FirstNonEmptyRaw mismatch: got %q", got)
	}
	if got := FirstNonEmptyRaw("", " \n "); got != "" {
		t.Fatalf("expected empty result, got %q", got)
	}
}

func TestCloneAnyMapVariants(t *testing.T) {
	if CloneAnyMap(nil) != nil {
		t.Fatalf("CloneAnyMap(nil) should be nil")
	}
	empty := map[string]any{}
	clonedEmpty := CloneAnyMap(empty)
	if clonedEmpty == nil || len(clonedEmpty) != 0 {
		t.Fatalf("CloneAnyMap(empty) should return empty map")
	}
	if CloneAnyMapNilOnEmpty(empty) != nil {
		t.Fatalf("CloneAnyMapNilOnEmpty(empty) should be nil")
	}
	if got := CloneAnyMapEmptyOnEmpty(nil); got == nil || len(got) != 0 {
		t.Fatalf("CloneAnyMapEmptyOnEmpty(nil) should be empty map")
	}

	source := map[string]any{"a": 1}
	copied := CloneAnyMap(source)
	if copied["a"] != 1 {
		t.Fatalf("CloneAnyMap copy mismatch")
	}
	copied["a"] = 2
	if source["a"] != 1 {
		t.Fatalf("CloneAnyMap must produce independent map")
	}
}

func TestCloneStringMapVariants(t *testing.T) {
	if CloneStringMap(nil) != nil {
		t.Fatalf("CloneStringMap(nil) should be nil")
	}
	empty := map[string]string{}
	clonedEmpty := CloneStringMap(empty)
	if clonedEmpty == nil || len(clonedEmpty) != 0 {
		t.Fatalf("CloneStringMap(empty) should return empty map")
	}
	if CloneStringMapNilOnEmpty(empty) != nil {
		t.Fatalf("CloneStringMapNilOnEmpty(empty) should be nil")
	}

	source := map[string]string{"a": "1"}
	copied := CloneStringMap(source)
	if copied["a"] != "1" {
		t.Fatalf("CloneStringMap copy mismatch")
	}
	copied["a"] = "2"
	if source["a"] != "1" {
		t.Fatalf("CloneStringMap must produce independent map")
	}
}

func TestInt(t *testing.T) {
	v := Int(7)
	if v == nil || *v != 7 {
		t.Fatalf("Int helper mismatch")
	}
}
