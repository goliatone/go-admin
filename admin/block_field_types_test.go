package admin

import "testing"

func TestDefaultBlockFieldTypeRegistryExposesFirstClassMediaPickerTypes(t *testing.T) {
	t.Parallel()

	reg := DefaultBlockFieldTypeRegistry()
	if reg == nil {
		t.Fatal("expected default block field type registry")
	}

	fieldTypes := reg.FieldTypes()
	seen := map[string]FieldTypeDefinition{}
	for _, item := range fieldTypes {
		seen[item.Type] = item
	}

	picker, ok := seen["media-picker"]
	if !ok {
		t.Fatalf("expected media-picker field type, got %+v", fieldTypes)
	}
	if picker.Category != "media" {
		t.Fatalf("expected media-picker category media, got %q", picker.Category)
	}
	pickerConfig, _ := picker.Defaults["config"].(map[string]any)
	if got := toString(pickerConfig["valueMode"]); got != "url" {
		t.Fatalf("expected media-picker default valueMode url, got %v", pickerConfig["valueMode"])
	}

	gallery, ok := seen["media-gallery"]
	if !ok {
		t.Fatalf("expected media-gallery field type, got %+v", fieldTypes)
	}
	galleryConfig, _ := gallery.Defaults["config"].(map[string]any)
	if multiple, _ := galleryConfig["multiple"].(bool); !multiple {
		t.Fatalf("expected media-gallery multiple=true, got %+v", galleryConfig)
	}
}
