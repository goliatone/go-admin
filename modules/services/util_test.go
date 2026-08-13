package services

import "testing"

func TestExtractMapReturnsDetachedTypedMap(t *testing.T) {
	source := map[string]any{"status": "ready"}
	got := extractMap(source)
	got["status"] = "changed"
	if source["status"] != "ready" {
		t.Fatal("services extractMap must retain detached-copy behavior")
	}
	if invalid := extractMap(map[string]string{"status": "ready"}); invalid == nil || len(invalid) != 0 {
		t.Fatalf("services extractMap invalid input = %#v, want non-nil empty map", invalid)
	}
}
