package admin

import (
	"context"
	"testing"
)

func TestInMemoryMediaLibraryRemainsListAddCompatible(t *testing.T) {
	lib := NewInMemoryMediaLibrary("/admin")

	items, err := lib.List(context.Background())
	if err != nil {
		t.Fatalf("list media: %v", err)
	}
	if len(items) == 0 {
		t.Fatalf("expected seeded media items")
	}
	if items[0].Type == "" || items[0].Status == "" {
		t.Fatalf("expected expanded media item fields to be populated, got %+v", items[0])
	}

	created, err := lib.Add(context.Background(), MediaItem{
		Name: "manual.pdf",
		URL:  "/admin/assets/manual.pdf",
		Metadata: map[string]any{
			"type": "document",
		},
	})
	if err != nil {
		t.Fatalf("add media: %v", err)
	}
	if created.ID == "" {
		t.Fatalf("expected created media ID")
	}
	if created.Type != "document" {
		t.Fatalf("expected media type derived from metadata, got %+v", created)
	}
	if created.Status != "ready" {
		t.Fatalf("expected default status ready, got %+v", created)
	}
}

func TestMediaContractTypesExposeExpectedDefaults(t *testing.T) {
	caps := MediaCapabilities{
		Operations: MediaOperationCapabilities{
			List:         true,
			Get:          true,
			Resolve:      true,
			LegacyCreate: true,
		},
		Picker: MediaPickerCapabilities{
			ValueModes:       []MediaValueMode{MediaValueModeURL, MediaValueModeID},
			DefaultValueMode: MediaValueModeURL,
		},
	}
	if caps.Picker.DefaultValueMode != MediaValueModeURL {
		t.Fatalf("expected default picker value mode %q, got %q", MediaValueModeURL, caps.Picker.DefaultValueMode)
	}
	if !caps.Operations.List || !caps.Operations.Resolve {
		t.Fatalf("expected operation capabilities to be preserved, got %+v", caps.Operations)
	}
}
