package cmsadapter

import (
	"reflect"
	"testing"
)

func TestExtractStructuralMetadataSeparatesStructuralKeys(t *testing.T) {
	t.Parallel()

	input := map[string]any{
		"path":        "/hello",
		"template":    "page",
		"parent_id":   "parent-1",
		"order":       7,
		"body":        "world",
		"template_id": "page-explicit",
	}

	meta, cleaned := ExtractStructuralMetadata(input)

	if got, want := meta["template_id"], "page-explicit"; got != want {
		t.Fatalf("expected template_id %q, got %#v", want, got)
	}
	if got, want := meta["sort_order"], 7; got != want {
		t.Fatalf("expected sort_order %#v, got %#v", want, got)
	}
	if _, ok := cleaned["path"]; ok {
		t.Fatalf("expected path to be removed from cleaned data: %+v", cleaned)
	}
	if _, ok := cleaned["template"]; ok {
		t.Fatalf("expected template to be removed from cleaned data: %+v", cleaned)
	}
	if _, ok := cleaned["order"]; ok {
		t.Fatalf("expected order to be removed from cleaned data: %+v", cleaned)
	}
	if got, want := cleaned["body"], "world"; got != want {
		t.Fatalf("expected body %q, got %#v", want, got)
	}
	if got, want := input["template"], "page"; got != want {
		t.Fatalf("expected input map to remain unchanged, got %#v", input["template"])
	}
}

func TestNormalizeAndInjectStructuralMetadataPreserveCanonicalKeys(t *testing.T) {
	t.Parallel()

	normalized := NormalizeStructuralMetadata(map[string]any{
		"template": "landing",
		"order":    3,
		"path":     "/docs",
	})

	if _, ok := normalized["template"]; ok {
		t.Fatalf("expected template alias to be removed: %+v", normalized)
	}
	if _, ok := normalized["order"]; ok {
		t.Fatalf("expected order alias to be removed: %+v", normalized)
	}
	if got, want := normalized["template_id"], "landing"; got != want {
		t.Fatalf("expected template_id %q, got %#v", want, got)
	}
	if got, want := normalized["sort_order"], 3; got != want {
		t.Fatalf("expected sort_order %#v, got %#v", want, got)
	}

	data := InjectStructuralMetadata(normalized, map[string]any{"body": "text"})
	if got, want := data["path"], "/docs"; got != want {
		t.Fatalf("expected path %q, got %#v", want, got)
	}
	if got, want := data["template_id"], "landing"; got != want {
		t.Fatalf("expected template_id %q, got %#v", want, got)
	}
	if got, want := data["sort_order"], 3; got != want {
		t.Fatalf("expected sort_order %#v, got %#v", want, got)
	}
}

func TestMergeMetadataAndGroupPersistenceCloneInputs(t *testing.T) {
	t.Parallel()

	base := map[string]any{"a": 1, "family_id": "base"}
	updates := map[string]any{"b": 2}
	merged := MergeMetadata(base, updates)
	if !reflect.DeepEqual(merged, map[string]any{"a": 1, "b": 2, "family_id": "base"}) {
		t.Fatalf("unexpected merged metadata: %+v", merged)
	}
	merged["a"] = 99
	if got, want := base["a"], 1; got != want {
		t.Fatalf("expected base map to remain unchanged, got %#v", got)
	}

	data := map[string]any{"body": "text"}
	metadata := map[string]any{"channel": "default"}
	persistedData, persistedMeta := PersistTranslationGroupMetadata("family-1", data, metadata)
	if got, want := persistedData["family_id"], "family-1"; got != want {
		t.Fatalf("expected persisted data family_id %q, got %#v", want, got)
	}
	if got, want := persistedMeta["family_id"], "family-1"; got != want {
		t.Fatalf("expected persisted metadata family_id %q, got %#v", want, got)
	}
	persistedData["family_id"] = "mutated"
	if _, ok := data["family_id"]; ok {
		t.Fatalf("expected original data map to remain unchanged: %+v", data)
	}
}

func TestRequestedAndResolvedFamilyIDPrecedence(t *testing.T) {
	t.Parallel()

	if got, want := RequestedFamilyID("requested", map[string]any{"family_id": "payload"}), "requested"; got != want {
		t.Fatalf("expected explicit requested family id %q, got %q", want, got)
	}
	if got, want := RequestedFamilyID("", map[string]any{"family_id": "payload"}, map[string]any{"family_id": "meta"}), "payload"; got != want {
		t.Fatalf("expected payload family id %q, got %q", want, got)
	}
	if got, want := ResolvedFamilyID("fallback", map[string]any{"title": "x"}), "fallback"; got != want {
		t.Fatalf("expected fallback family id %q, got %q", want, got)
	}
	if got, want := ResolvedFamilyID("", map[string]any{"family_id": []byte("bytes-id")}), "bytes-id"; got != want {
		t.Fatalf("expected byte-backed family id %q, got %q", want, got)
	}
}
