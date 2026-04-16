package quickstart

import "testing"

func TestJoinAssetPathPreservesResolvedAssetReferences(t *testing.T) {
	tests := map[string]string{
		"/brand/logo.svg":            "/brand/logo.svg",
		"https://cdn.example.com/a":  "https://cdn.example.com/a",
		"//cdn.example.com/a":        "//cdn.example.com/a",
		"data:image/svg+xml;base64,": "data:image/svg+xml;base64,",
	}
	for input, expected := range tests {
		if got := joinAssetPath("/admin/assets", input); got != expected {
			t.Fatalf("expected resolved asset %q to stay unchanged, got %q", input, got)
		}
	}
}

func TestJoinAssetPathJoinsRelativeAssetNames(t *testing.T) {
	if got := joinAssetPath("/admin/assets", "logo.svg"); got != "/admin/assets/logo.svg" {
		t.Fatalf("expected relative asset to join with prefix, got %q", got)
	}
}
