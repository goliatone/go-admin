package admin

import (
	"reflect"
	"testing"
	"time"
)

func TestMediaLibraryContractRequiresQueryMedia(t *testing.T) {
	contract := reflect.TypeFor[MediaLibrary]()
	if _, ok := contract.MethodByName("QueryMedia"); !ok {
		t.Fatalf("expected MediaLibrary contract to require QueryMedia")
	}
	if _, ok := contract.MethodByName("List"); ok {
		t.Fatalf("legacy List must not be part of the MediaLibrary contract")
	}
	if _, ok := contract.MethodByName("Add"); ok {
		t.Fatalf("legacy Add must not be part of the MediaLibrary contract")
	}
}

func TestInMemoryMediaLibrarySupportsModernQueries(t *testing.T) {
	lib := NewInMemoryMediaLibrary("/admin")

	page, err := lib.QueryMedia(t.Context(), MediaQuery{Limit: 10})
	if err != nil {
		t.Fatalf("query media: %v", err)
	}
	if len(page.Items) == 0 || page.Total == 0 {
		t.Fatalf("expected seeded media items")
	}
	if page.Items[0].Type == "" || page.Items[0].Status == "" {
		t.Fatalf("expected expanded media item fields to be populated, got %+v", page.Items[0])
	}

	item, err := lib.GetMedia(t.Context(), page.Items[0].ID)
	if err != nil {
		t.Fatalf("get media: %v", err)
	}
	if item.ID != page.Items[0].ID {
		t.Fatalf("expected get media to resolve by ID, got %+v", item)
	}

	resolved, err := lib.ResolveMedia(t.Context(), MediaReference{URL: page.Items[0].URL})
	if err != nil {
		t.Fatalf("resolve media: %v", err)
	}
	if resolved.ID != page.Items[0].ID {
		t.Fatalf("expected resolve media to resolve by URL, got %+v", resolved)
	}
}

func TestInMemoryMediaLibraryOnlyBackfillsImageThumbnails(t *testing.T) {
	image := MediaItem{
		Name:     "hero.png",
		URL:      "/admin/assets/hero.png",
		Type:     "asset",
		MIMEType: "image/png",
	}
	if !mediaItemCanUseAccessURLAsThumbnail(image) {
		t.Fatalf("expected image thumbnail to use access URL, got %+v", image)
	}

	video := MediaItem{
		Name:     "clip.mp4",
		URL:      "/admin/assets/clip.mp4",
		Type:     "video",
		MIMEType: "video/mp4",
	}
	if mediaItemCanUseAccessURLAsThumbnail(video) {
		t.Fatalf("expected video thumbnail to stay empty without a distinct poster, got %+v", video)
	}
}

func TestMediaContractTypesExposeExpectedDefaults(t *testing.T) {
	caps := MediaCapabilities{
		Operations: MediaOperationCapabilities{
			List:    true,
			Get:     true,
			Resolve: true,
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

func TestMediaPageFromItemsAppliesSortModes(t *testing.T) {
	items := []MediaItem{
		{ID: "1", Name: "Zulu.jpg", Size: 10, CreatedAt: time.Date(2026, 4, 10, 10, 0, 0, 0, time.UTC)},
		{ID: "2", Name: "Alpha.jpg", Size: 50, CreatedAt: time.Date(2026, 4, 12, 10, 0, 0, 0, time.UTC)},
		{ID: "3", Name: "Mike.jpg", Size: 25, CreatedAt: time.Date(2026, 4, 11, 10, 0, 0, 0, time.UTC)},
	}

	byName := mediaPageFromItems(items, MediaQuery{Sort: "name"})
	if got := []string{byName.Items[0].Name, byName.Items[1].Name, byName.Items[2].Name}; got[0] != "Alpha.jpg" || got[1] != "Mike.jpg" || got[2] != "Zulu.jpg" {
		t.Fatalf("expected name sort order, got %v", got)
	}

	bySize := mediaPageFromItems(items, MediaQuery{Sort: "size"})
	if got := []string{bySize.Items[0].ID, bySize.Items[1].ID, bySize.Items[2].ID}; got[0] != "2" || got[1] != "3" || got[2] != "1" {
		t.Fatalf("expected size sort order, got %v", got)
	}

	byOldest := mediaPageFromItems(items, MediaQuery{Sort: "oldest"})
	if got := []string{byOldest.Items[0].ID, byOldest.Items[1].ID, byOldest.Items[2].ID}; got[0] != "1" || got[1] != "3" || got[2] != "2" {
		t.Fatalf("expected oldest sort order, got %v", got)
	}
}

func TestMediaPageFromItemsMIMEFamilyMatchesEffectiveFamily(t *testing.T) {
	items := []MediaItem{
		{ID: "1", Name: "mime-audio.mp3", Type: "binary", MIMEType: "audio/mpeg"},
		{ID: "2", Name: "typed-audio.bin", Type: "audio"},
		{ID: "3", Name: "mime-video.mp4", Type: "file", MIMEType: "video/mp4"},
		{ID: "4", Name: "guide.pdf", Type: "document", MIMEType: "application/pdf"},
		{ID: "5", Name: "mime-vector.svg", Type: "asset", MIMEType: "image/svg+xml"},
		{ID: "6", Name: "typed-vector.svg", Type: "vector", MIMEType: "image/svg+xml"},
		{ID: "7", Name: "raster.png", Type: "asset", MIMEType: "image/png"},
	}

	audioPage := mediaPageFromItems(items, MediaQuery{MIMEFamily: "audio"})
	if audioPage.Total != 2 {
		t.Fatalf("expected two effective audio items, got %d: %+v", audioPage.Total, audioPage.Items)
	}
	if got := map[string]bool{audioPage.Items[0].Name: true, audioPage.Items[1].Name: true}; !got["mime-audio.mp3"] || !got["typed-audio.bin"] {
		t.Fatalf("expected MIME-only and explicit audio items, got %+v", audioPage.Items)
	}

	videoPage := mediaPageFromItems(items, MediaQuery{MIMEFamily: "video"})
	if videoPage.Total != 1 || videoPage.Items[0].Name != "mime-video.mp4" {
		t.Fatalf("expected MIME-only video item, got %+v", videoPage.Items)
	}

	vectorPage := mediaPageFromItems(items, MediaQuery{MIMEFamily: "vector"})
	if vectorPage.Total != 2 {
		t.Fatalf("expected explicit and generic SVG vector items, got %d: %+v", vectorPage.Total, vectorPage.Items)
	}
	if got := map[string]bool{vectorPage.Items[0].Name: true, vectorPage.Items[1].Name: true}; !got["mime-vector.svg"] || !got["typed-vector.svg"] {
		t.Fatalf("expected MIME-only and explicit vector items, got %+v", vectorPage.Items)
	}

	imagePage := mediaPageFromItems(items, MediaQuery{MIMEFamily: "image"})
	if imagePage.Total != 1 || imagePage.Items[0].Name != "raster.png" {
		t.Fatalf("expected image filter to keep generic SVG under vectors, got %+v", imagePage.Items)
	}
}
