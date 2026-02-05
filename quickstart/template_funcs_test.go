package quickstart

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRenderMenuIcon_Empty(t *testing.T) {
	assert.Equal(t, "", renderMenuIcon(""))
	assert.Equal(t, "", renderMenuIcon("  "))
}

func TestRenderMenuIcon_Iconoir(t *testing.T) {
	result := renderMenuIcon("cube")
	assert.Contains(t, result, "iconoir-cube")
	assert.Contains(t, result, "<i ")
	assert.Contains(t, result, "flex-shrink-0")
}

func TestRenderMenuIcon_IconoirBackwardCompat(t *testing.T) {
	// All existing module icons must still render as Iconoir
	for _, name := range []string{"cube", "users", "shield", "settings", "bell", "clock", "bug", "building", "view-grid", "briefcase"} {
		result := renderMenuIcon(name)
		assert.Contains(t, result, "iconoir-"+name, "icon %q should render as Iconoir", name)
		assert.Contains(t, result, "<i ", "icon %q should use <i> tag", name)
	}
}

func TestRenderMenuIcon_Emoji(t *testing.T) {
	tests := []struct {
		input string
		label string
	}{
		{"📄", "page emoji"},
		{"🚀", "rocket emoji"},
		{"⚡", "zap emoji"},
		{"❤️", "heart emoji"},
		{"🎨", "palette emoji"},
		{"📦", "package emoji"},
	}
	for _, tt := range tests {
		t.Run(tt.label, func(t *testing.T) {
			result := renderMenuIcon(tt.input)
			assert.Contains(t, result, "<span ", "emoji should render in a <span>")
			assert.Contains(t, result, tt.input, "emoji character should be present")
			assert.NotContains(t, result, "iconoir-", "emoji should not have iconoir- prefix")
		})
	}
}

func TestRenderMenuIcon_SVGKey(t *testing.T) {
	tests := []struct {
		input   string
		mapped  string
		label   string
	}{
		{"rich-text", "edit-pencil", "rich-text maps to edit-pencil"},
		{"media-picker", "media-image", "media-picker maps to media-image"},
		{"blocks", "view-grid", "blocks maps to view-grid"},
		{"markdown", "edit-pencil", "markdown maps to edit-pencil"},
		{"toggle", "switch-on", "toggle maps to switch-on"},
	}
	for _, tt := range tests {
		t.Run(tt.label, func(t *testing.T) {
			result := renderMenuIcon(tt.input)
			assert.Contains(t, result, "iconoir-"+tt.mapped, "SVG key %q should map to %q", tt.input, tt.mapped)
			assert.Contains(t, result, "<i ", "mapped SVG keys should render as <i>")
		})
	}
}

func TestRenderMenuIcon_SVGKeySelfMapping(t *testing.T) {
	// Some SVG keys are valid Iconoir names and map to themselves
	for _, name := range []string{"text", "code", "user"} {
		result := renderMenuIcon(name)
		assert.Contains(t, result, "iconoir-"+name, "SVG key %q should map to itself", name)
	}
}

func TestIsEmoji(t *testing.T) {
	tests := []struct {
		input string
		want  bool
		label string
	}{
		{"📄", true, "page emoji"},
		{"🚀", true, "rocket"},
		{"⚡", true, "zap"},
		{"❤️", true, "heart with variation selector"},
		{"✨", true, "sparkles"},
		{"🧩", true, "puzzle piece"},
		{"cube", false, "plain text"},
		{"rich-text", false, "kebab-case"},
		{"settings", false, "lowercase word"},
		{"", false, "empty string"},
		{"a", false, "single ascii char"},
		{"123", false, "digits"},
	}
	for _, tt := range tests {
		t.Run(tt.label, func(t *testing.T) {
			assert.Equal(t, tt.want, isEmoji(tt.input), "isEmoji(%q)", tt.input)
		})
	}
}

func TestSvgFieldTypeKeysComplete(t *testing.T) {
	for key, mapped := range svgFieldTypeKeys {
		require.NotEmpty(t, mapped, "SVG key %q maps to empty Iconoir name", key)
	}
}

func TestRenderMenuIcon_HTMLEscaping(t *testing.T) {
	// Ensure malicious icon names are escaped
	result := renderMenuIcon(`"><script>alert(1)</script>`)
	assert.NotContains(t, result, "<script>")
	assert.Contains(t, result, "&lt;script&gt;")
}

func TestRenderMenuIcon_SidebarStyle(t *testing.T) {
	// All non-empty results should include the sidebar icon size CSS variable
	for _, icon := range []string{"cube", "📄", "rich-text"} {
		result := renderMenuIcon(icon)
		assert.Contains(t, result, "--sidebar-icon-size", "icon %q should reference sidebar icon size", icon)
	}
}

func TestDefaultTemplateFuncs_ContainsRenderMenuIcon(t *testing.T) {
	funcs := DefaultTemplateFuncs()
	fn, ok := funcs["renderMenuIcon"]
	require.True(t, ok, "renderMenuIcon should be registered")
	require.NotNil(t, fn)

	// Verify it's callable with a string argument
	callable, ok := fn.(func(string) string)
	require.True(t, ok, "renderMenuIcon should be func(string) string")
	result := callable("cube")
	assert.True(t, strings.Contains(result, "iconoir-cube"))
}
