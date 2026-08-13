package admin

import "testing"

func TestExtractMapPreservesTypedMapAndConvertsNamedStringKeyedMaps(t *testing.T) {
	direct := map[string]any{"status": "ready"}
	borrowed := extractMap(direct)
	borrowed["status"] = "changed"
	if direct["status"] != "changed" {
		t.Fatal("extractMap must preserve borrowed map[string]any behavior")
	}

	type namedMap map[string]int
	source := namedMap{"count": 2}
	converted := extractMap(source)
	if converted["count"] != 2 {
		t.Fatalf("extractMap named map conversion = %#v", converted)
	}
	converted["count"] = 3
	if source["count"] != 2 {
		t.Fatal("extractMap reflection conversion must produce a detached map")
	}
}
