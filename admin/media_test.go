package admin

import (
	"context"
	"testing"
	"time"
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

func TestMediaFieldTypeHelpersRecognizeCanonicalAndLegacyAliases(t *testing.T) {
	if !isMediaFieldType("media") || !isMediaFieldType("media-picker") || !isMediaFieldType("media_gallery") {
		t.Fatalf("expected media field type helpers to recognize legacy and canonical aliases")
	}
	if !isMediaGalleryFieldType("media-gallery") {
		t.Fatalf("expected media-gallery to be recognized as gallery media type")
	}
	if canonicalMediaFieldType("media_picker") != "media-picker" {
		t.Fatalf("expected media_picker alias to canonicalize to media-picker")
	}
}

func TestMediaPageFromLegacyAppliesSortModes(t *testing.T) {
	items := []MediaItem{
		{ID: "1", Name: "Zulu.jpg", Size: 10, CreatedAt: time.Date(2026, 4, 10, 10, 0, 0, 0, time.UTC)},
		{ID: "2", Name: "Alpha.jpg", Size: 50, CreatedAt: time.Date(2026, 4, 12, 10, 0, 0, 0, time.UTC)},
		{ID: "3", Name: "Mike.jpg", Size: 25, CreatedAt: time.Date(2026, 4, 11, 10, 0, 0, 0, time.UTC)},
	}

	byName := mediaPageFromLegacy(items, MediaQuery{Sort: "name"})
	if got := []string{byName.Items[0].Name, byName.Items[1].Name, byName.Items[2].Name}; got[0] != "Alpha.jpg" || got[1] != "Mike.jpg" || got[2] != "Zulu.jpg" {
		t.Fatalf("expected name sort order, got %v", got)
	}

	bySize := mediaPageFromLegacy(items, MediaQuery{Sort: "size"})
	if got := []string{bySize.Items[0].ID, bySize.Items[1].ID, bySize.Items[2].ID}; got[0] != "2" || got[1] != "3" || got[2] != "1" {
		t.Fatalf("expected size sort order, got %v", got)
	}

	byOldest := mediaPageFromLegacy(items, MediaQuery{Sort: "oldest"})
	if got := []string{byOldest.Items[0].ID, byOldest.Items[1].ID, byOldest.Items[2].ID}; got[0] != "1" || got[1] != "3" || got[2] != "2" {
		t.Fatalf("expected oldest sort order, got %v", got)
	}
}
