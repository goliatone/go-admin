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

func TestMapFromAnyEmptyPreservesBorrowedMapSemantics(t *testing.T) {
	source := map[string]any{"status": "ready"}
	got := MapFromAnyEmpty(source)
	got["status"] = "changed"
	if source["status"] != "changed" {
		t.Fatal("MapFromAnyEmpty must return the typed map without copying")
	}

	var typedNil map[string]any
	if MapFromAnyEmpty(typedNil) != nil {
		t.Fatal("MapFromAnyEmpty must preserve a typed nil map")
	}
	if invalid := MapFromAnyEmpty(map[string]string{"status": "ready"}); invalid == nil || len(invalid) != 0 {
		t.Fatalf("MapFromAnyEmpty invalid input = %#v, want non-nil empty map", invalid)
	}
}

func TestBoolFromAnyDefaultPreservesFallback(t *testing.T) {
	tests := []struct {
		name     string
		value    any
		fallback bool
		want     bool
	}{
		{name: "bool", value: false, fallback: true, want: false},
		{name: "truthy string", value: " yes ", fallback: false, want: true},
		{name: "zero number", value: 0, fallback: true, want: false},
		{name: "invalid false fallback", value: "unknown", fallback: false, want: false},
		{name: "invalid true fallback", value: struct{}{}, fallback: true, want: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := BoolFromAnyDefault(test.value, test.fallback); got != test.want {
				t.Fatalf("BoolFromAnyDefault(%#v, %t) = %t, want %t", test.value, test.fallback, got, test.want)
			}
		})
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
	if got := CloneStringMapEmptyOnEmpty(nil); got == nil || len(got) != 0 {
		t.Fatalf("CloneStringMapEmptyOnEmpty(nil) should be empty map")
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
	v := new(7)
	if v == nil || *v != 7 {
		t.Fatalf("Int helper mismatch")
	}
}

func TestBool(t *testing.T) {
	v := new(true)
	if v == nil || !*v {
		t.Fatalf("Bool helper mismatch")
	}
}

func TestStringOrNil(t *testing.T) {
	if got := StringOrNil("  "); got != nil {
		t.Fatalf("StringOrNil should return nil for blank input")
	}
	got := StringOrNil("  value ")
	if got == nil || *got != "value" {
		t.Fatalf("StringOrNil mismatch: got %#v", got)
	}
}
