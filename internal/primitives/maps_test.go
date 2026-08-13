package primitives

import "testing"

func TestCloneAnyMapDeepDetachesNestedContainers(t *testing.T) {
	nested := map[string]any{"name": "original"}
	items := []any{nested}
	bytes := []byte("original")
	source := map[string]any{
		"nested": nested,
		"items":  items,
		"bytes":  bytes,
	}

	clone := CloneAnyMapDeep(source)
	clonedNested := requireClonedValue[map[string]any](t, clone["nested"])
	clonedNested["name"] = "changed"
	clonedItems := requireClonedValue[[]any](t, clone["items"])
	if len(clonedItems) == 0 {
		t.Fatal("cloned items must not be empty")
	}
	requireClonedValue[map[string]any](t, clonedItems[0])["name"] = "changed again"
	clonedBytes := requireClonedValue[[]byte](t, clone["bytes"])
	clonedBytes[0] = 'X'

	if got := requireClonedValue[map[string]any](t, source["nested"])["name"]; got != "original" {
		t.Fatalf("nested map was not detached: %v", got)
	}
	sourceItems := requireClonedValue[[]any](t, source["items"])
	if got := requireClonedValue[map[string]any](t, sourceItems[0])["name"]; got != "original" {
		t.Fatalf("nested slice value was not detached: %v", got)
	}
	if got := string(requireClonedValue[[]byte](t, source["bytes"])); got != "original" {
		t.Fatalf("byte slice was not detached: %q", got)
	}
}

func TestCloneAnyMapDeepPreservesNilAndCycles(t *testing.T) {
	if CloneAnyMapDeep(nil) != nil {
		t.Fatal("nil input must remain nil")
	}

	cyclic := map[string]any{}
	cyclic["self"] = cyclic
	clone := CloneAnyMapDeep(cyclic)
	clone["value"] = "clone-only"
	self := requireClonedValue[map[string]any](t, clone["self"])
	if self["value"] != "clone-only" {
		t.Fatal("map cycle was not preserved in clone")
	}
	if _, exists := cyclic["value"]; exists {
		t.Fatal("clone mutation leaked to source")
	}
}

func TestCloneAnyMapDeepDetachesExportedStructContainers(t *testing.T) {
	type metadata struct {
		Labels map[string]string
		hidden string
	}
	source := map[string]any{"typed": metadata{Labels: map[string]string{"name": "original"}, hidden: "kept"}}
	clone := CloneAnyMapDeep(source)
	cloned := requireClonedValue[metadata](t, clone["typed"])
	cloned.Labels["name"] = "changed"

	got := requireClonedValue[metadata](t, source["typed"])
	if got.Labels["name"] != "original" || cloned.hidden != "kept" {
		t.Fatalf("typed metadata was not safely cloned: source=%+v clone=%+v", got, cloned)
	}
}

func requireClonedValue[T any](t *testing.T, value any) T {
	t.Helper()
	typed, ok := value.(T)
	if !ok {
		t.Fatalf("cloned value has type %T", value)
	}
	return typed
}
