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
	clone["nested"].(map[string]any)["name"] = "changed"
	clone["items"].([]any)[0].(map[string]any)["name"] = "changed again"
	clone["bytes"].([]byte)[0] = 'X'

	if got := source["nested"].(map[string]any)["name"]; got != "original" {
		t.Fatalf("nested map was not detached: %v", got)
	}
	if got := source["items"].([]any)[0].(map[string]any)["name"]; got != "original" {
		t.Fatalf("nested slice value was not detached: %v", got)
	}
	if got := string(source["bytes"].([]byte)); got != "original" {
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
	self := clone["self"].(map[string]any)
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
	cloned := clone["typed"].(metadata)
	cloned.Labels["name"] = "changed"

	got := source["typed"].(metadata)
	if got.Labels["name"] != "original" || cloned.hidden != "kept" {
		t.Fatalf("typed metadata was not safely cloned: source=%+v clone=%+v", got, cloned)
	}
}
