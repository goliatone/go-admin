package handlers

import "testing"

func TestNormalizeMetadataObjectInput(t *testing.T) {
	t.Run("empty clears metadata", func(t *testing.T) {
		got, err := normalizeMetadataObjectInput("")
		if err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
		if got != "" {
			t.Fatalf("expected empty string, got %#v", got)
		}
	})

	t.Run("parses JSON object", func(t *testing.T) {
		got, err := normalizeMetadataObjectInput(`{"$meta":{"local":true}}`)
		if err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
		obj, ok := got.(map[string]any)
		if !ok {
			t.Fatalf("expected map, got %#v", got)
		}
		meta, ok := obj["$meta"].(map[string]any)
		if !ok {
			t.Fatalf("expected $meta object, got %#v", obj["$meta"])
		}
		if meta["local"] != true {
			t.Fatalf("expected $meta.local=true, got %#v", meta["local"])
		}
	})

	t.Run("parses double-encoded JSON object", func(t *testing.T) {
		got, err := normalizeMetadataObjectInput(`"{\"$meta\":{\"local\":true}}"`)
		if err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
		obj, ok := got.(map[string]any)
		if !ok {
			t.Fatalf("expected map, got %#v", got)
		}
		meta, ok := obj["$meta"].(map[string]any)
		if !ok {
			t.Fatalf("expected $meta object, got %#v", obj["$meta"])
		}
		if meta["local"] != true {
			t.Fatalf("expected $meta.local=true, got %#v", meta["local"])
		}
	})

	t.Run("rejects non-object JSON", func(t *testing.T) {
		_, err := normalizeMetadataObjectInput(`["nope"]`)
		if err == nil {
			t.Fatalf("expected error")
		}
	})

	t.Run("rejects plain string JSON", func(t *testing.T) {
		_, err := normalizeMetadataObjectInput(`"nope"`)
		if err == nil {
			t.Fatalf("expected error")
		}
	})
}
