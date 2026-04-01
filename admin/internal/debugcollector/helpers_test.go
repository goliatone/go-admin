package debugcollector

import "testing"

func testToString(input any) string {
	if s, ok := input.(string); ok {
		return s
	}
	return ""
}

func TestSetAndGetNestedValueUseSharedKeyPathRules(t *testing.T) {
	data := map[string]any{}
	SetNestedValue(data, "custom.foo/bar:baz", "ok")
	got, ok := GetNestedValue(data, "custom.foo.bar.baz")
	if !ok || got != "ok" {
		t.Fatalf("expected nested value, got %#v ok=%v", got, ok)
	}
}

func TestSplitKeyPathDropsBlankSegments(t *testing.T) {
	got := SplitKeyPath(" custom..foo//bar::baz ")
	if len(got) != 4 || got[0] != "custom" || got[3] != "baz" {
		t.Fatalf("unexpected split key path: %#v", got)
	}
}

func TestClonePanelPayloadClonesMapAndSliceInputs(t *testing.T) {
	sourceMap := map[string]any{"nested": map[string]any{"ok": true}}
	clonedMap, ok := ClonePanelPayload(sourceMap).(map[string]any)
	if !ok {
		t.Fatalf("expected cloned map")
	}
	sourceMap["nested"].(map[string]any)["ok"] = false
	if clonedMap["nested"].(map[string]any)["ok"] != true {
		t.Fatalf("expected cloned nested map isolation, got %+v", clonedMap)
	}

	sourceSlice := []string{"a", "b"}
	clonedSlice, ok := ClonePanelPayload(sourceSlice).([]string)
	if !ok {
		t.Fatalf("expected cloned slice")
	}
	sourceSlice[0] = "changed"
	if clonedSlice[0] != "a" {
		t.Fatalf("expected cloned slice isolation, got %#v", clonedSlice)
	}
}

func TestFieldsToMapPairsTrailingKeysAndSkipsBlankOnes(t *testing.T) {
	got := FieldsToMap([]any{"first", 1, "", 2, "flag"}, testToString)
	if len(got) != 2 || got["first"] != 1 || got["flag"] != true {
		t.Fatalf("unexpected fields map: %#v", got)
	}
}

func TestFilterBySessionPreservesMatchingEntriesOnly(t *testing.T) {
	type entry struct {
		SessionID string
		Value     string
	}
	got := FilterBySession([]entry{
		{SessionID: "a", Value: "one"},
		{SessionID: "b", Value: "two"},
		{SessionID: "a", Value: "three"},
	}, "a", func(item entry) string { return item.SessionID })
	if len(got) != 2 || got[0].Value != "one" || got[1].Value != "three" {
		t.Fatalf("unexpected filtered entries: %#v", got)
	}
}
