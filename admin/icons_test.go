package admin

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseIconReference_EmptyString(t *testing.T) {
	ref := ParseIconReference("")
	assert.True(t, ref.IsEmpty())
	assert.Equal(t, "", ref.Raw)
}

func TestParseIconReference_Whitespace(t *testing.T) {
	ref := ParseIconReference("   ")
	assert.True(t, ref.IsEmpty())
}

func TestParseIconReference_EmojiPrefix(t *testing.T) {
	ref := ParseIconReference("emoji:rocket")
	assert.Equal(t, IconTypeEmoji, ref.Type)
	assert.Equal(t, "rocket", ref.Value)
	assert.False(t, ref.IsEmpty())
}

func TestParseIconReference_SVGPrefix(t *testing.T) {
	ref := ParseIconReference("svg:<svg><path/></svg>")
	assert.Equal(t, IconTypeSVG, ref.Type)
	assert.Equal(t, "<svg><path/></svg>", ref.Value)
}

func TestParseIconReference_URLPrefix(t *testing.T) {
	ref := ParseIconReference("url:https://example.com/icon.png")
	assert.Equal(t, IconTypeURL, ref.Type)
	assert.Equal(t, "https://example.com/icon.png", ref.Value)
}

func TestParseIconReference_RawSVG(t *testing.T) {
	ref := ParseIconReference("<svg><circle/></svg>")
	assert.Equal(t, IconTypeSVG, ref.Type)
	assert.Equal(t, "<svg><circle/></svg>", ref.Value)
}

func TestParseIconReference_RawHTTPSURL(t *testing.T) {
	ref := ParseIconReference("https://example.com/icon.svg")
	assert.Equal(t, IconTypeURL, ref.Type)
	assert.Equal(t, "https://example.com/icon.svg", ref.Value)
}

func TestParseIconReference_RawDataURL(t *testing.T) {
	ref := ParseIconReference("data:image/png;base64,ABC123")
	assert.Equal(t, IconTypeURL, ref.Type)
	assert.Equal(t, "data:image/png;base64,ABC123", ref.Value)
}

func TestParseIconReference_EmojiString(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"🚀", "🚀"},
		{"🏠", "🏠"},
		{"😀", "😀"},
	}
	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			ref := ParseIconReference(tt.input)
			assert.Equal(t, IconTypeEmoji, ref.Type)
			assert.Equal(t, tt.want, ref.Value)
		})
	}
}

func TestParseIconReference_QualifiedLibraryName(t *testing.T) {
	tests := []struct {
		input   string
		library string
		value   string
	}{
		{"iconoir:home", "iconoir", "home"},
		{"lucide:home", "lucide", "home"},
		{"custom:my-icon", "custom", "my-icon"},
	}
	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			ref := ParseIconReference(tt.input)
			assert.Equal(t, IconTypeLibrary, ref.Type)
			assert.Equal(t, tt.library, ref.Library)
			assert.Equal(t, tt.value, ref.Value)
			assert.True(t, ref.Qualified)
		})
	}
}

func TestParseIconReference_LegacyIconoir(t *testing.T) {
	ref := ParseIconReference("iconoir-home")
	assert.Equal(t, IconTypeLibrary, ref.Type)
	assert.Equal(t, "iconoir", ref.Library)
	assert.Equal(t, "home", ref.Value)
}

func TestParseIconReference_SVGFieldTypeKeys(t *testing.T) {
	tests := []struct {
		input  string
		mapped string
	}{
		{"text", "text"},
		{"rich-text", "edit-pencil"},
		{"code", "code"},
		{"number", "calculator"},
		{"date", "calendar"},
		{"media-picker", "media-image"},
	}
	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			ref := ParseIconReference(tt.input)
			assert.Equal(t, IconTypeLibrary, ref.Type)
			assert.Equal(t, tt.mapped, ref.Value)
			assert.True(t, ref.LegacyMapped)
		})
	}
}

func TestParseIconReference_BareIconName(t *testing.T) {
	ref := ParseIconReference("home")
	assert.Equal(t, IconTypeLibrary, ref.Type)
	assert.Equal(t, DefaultIconLibrary, ref.Library)
	assert.Equal(t, "home", ref.Value)
	assert.False(t, ref.Qualified)
	assert.False(t, ref.LegacyMapped)
}

func TestParseIconReference_TrimWhitespace(t *testing.T) {
	ref := ParseIconReference("  home  ")
	assert.Equal(t, IconTypeLibrary, ref.Type)
	assert.Equal(t, "home", ref.Value)
}

func TestIconReference_IsEmpty(t *testing.T) {
	tests := []struct {
		name  string
		ref   IconReference
		empty bool
	}{
		{"empty struct", IconReference{}, true},
		{"has raw only", IconReference{Raw: "home"}, false},
		{"empty raw with value", IconReference{Type: IconTypeLibrary, Value: "home", Raw: ""}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.empty, tt.ref.IsEmpty())
		})
	}
}

func TestIconReference_IsEmptyFromParse(t *testing.T) {
	// Use ParseIconReference which properly sets Raw
	ref := ParseIconReference("home")
	assert.False(t, ref.IsEmpty())

	ref = ParseIconReference("")
	assert.True(t, ref.IsEmpty())
}

func TestIconType_Values(t *testing.T) {
	// Verify the icon type constants are defined correctly
	assert.Equal(t, IconType("emoji"), IconTypeEmoji)
	assert.Equal(t, IconType("library"), IconTypeLibrary)
	assert.Equal(t, IconType("svg"), IconTypeSVG)
	assert.Equal(t, IconType("url"), IconTypeURL)
}

func TestIconRenderMode_Values(t *testing.T) {
	// Verify the render mode constants are defined correctly
	assert.Equal(t, IconRenderMode("css-class"), IconRenderModeCSS)
	assert.Equal(t, IconRenderMode("inline-svg"), IconRenderModeSVG)
	assert.Equal(t, IconRenderMode("img-url"), IconRenderModeImg)
	assert.Equal(t, IconRenderMode("span"), IconRenderModeSpan)
}
