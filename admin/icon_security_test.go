package admin

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDefaultIconSecurityPolicy(t *testing.T) {
	policy := DefaultIconSecurityPolicy()

	assert.False(t, policy.AllowUntrustedCustom)
	assert.True(t, policy.AllowDataURI)
	assert.Contains(t, policy.AllowedExternalSchemes, "https")
	assert.Contains(t, policy.AllowedDataMIMEs, "image/svg+xml")
	assert.Contains(t, policy.AllowedDataMIMEs, "image/png")
	assert.Equal(t, 65536, policy.MaxSVGBytes)
	assert.Equal(t, 131072, policy.MaxDataURIBytes)
}

func TestIconSecurityValidator_ValidateIcon_Emoji(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	ref := IconReference{Type: IconTypeEmoji, Value: "🏠"}
	result := v.ValidateIcon(ref, IconRenderOptions{})

	assert.True(t, result.Allowed)
	assert.Empty(t, result.Reason)
}

func TestIconSecurityValidator_ValidateIcon_LibraryValid(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	ref := IconReference{Type: IconTypeLibrary, Library: "iconoir", Value: "home"}
	result := v.ValidateIcon(ref, IconRenderOptions{})

	assert.True(t, result.Allowed)
}

func TestIconSecurityValidator_ValidateIcon_LibraryEmpty(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	ref := IconReference{Type: IconTypeLibrary, Library: "iconoir", Value: ""}
	result := v.ValidateIcon(ref, IconRenderOptions{})

	assert.False(t, result.Allowed)
	assert.Equal(t, "empty icon name", result.Reason)
}

func TestIconSecurityValidator_ValidateIcon_LibraryInvalidChars(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	ref := IconReference{Type: IconTypeLibrary, Library: "iconoir", Value: "home<script>"}
	result := v.ValidateIcon(ref, IconRenderOptions{})

	assert.False(t, result.Allowed)
	assert.Equal(t, "invalid icon name characters", result.Reason)
}

func TestIconSecurityValidator_ValidateIcon_SVGTrusted(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	ref := IconReference{Type: IconTypeSVG, Value: "<svg><circle r='5'/></svg>"}
	result := v.ValidateIcon(ref, IconRenderOptions{TrustedInput: true})

	assert.True(t, result.Allowed)
	assert.NotEmpty(t, result.SanitizedContent)
}

func TestIconSecurityValidator_ValidateIcon_SVGUntrusted(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	ref := IconReference{Type: IconTypeSVG, Value: "<svg><circle/></svg>"}
	result := v.ValidateIcon(ref, IconRenderOptions{TrustedInput: false})

	assert.False(t, result.Allowed)
	assert.Equal(t, "custom SVG not allowed for untrusted input", result.Reason)
}

func TestIconSecurityValidator_ValidateIcon_SVGWithScript(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	svg := `<svg><script>alert('xss')</script><circle r='5'/></svg>`
	ref := IconReference{Type: IconTypeSVG, Value: svg}
	result := v.ValidateIcon(ref, IconRenderOptions{TrustedInput: true})

	assert.True(t, result.Allowed)
	assert.NotContains(t, result.SanitizedContent, "script")
}

func TestIconSecurityValidator_ValidateIcon_SVGWithEventHandler(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	svg := `<svg onclick="alert('xss')"><circle r='5'/></svg>`
	ref := IconReference{Type: IconTypeSVG, Value: svg}
	result := v.ValidateIcon(ref, IconRenderOptions{TrustedInput: true})

	assert.True(t, result.Allowed)
	assert.NotContains(t, result.SanitizedContent, "onclick")
}

func TestIconSecurityValidator_ValidateIcon_URLHTTPSUntrusted(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	ref := IconReference{Type: IconTypeURL, Value: "https://example.com/icon.png"}
	result := v.ValidateIcon(ref, IconRenderOptions{TrustedInput: false})

	assert.False(t, result.Allowed)
	assert.Equal(t, "external URLs not allowed for untrusted input", result.Reason)
}

func TestIconSecurityValidator_ValidateIcon_URLHTTPSTrusted(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	ref := IconReference{Type: IconTypeURL, Value: "https://example.com/icon.png"}
	result := v.ValidateIcon(ref, IconRenderOptions{TrustedInput: true})

	assert.True(t, result.Allowed)
	assert.Equal(t, "https://example.com/icon.png", result.ValidatedURL)
}

func TestIconSecurityValidator_ValidateIcon_URLJavaScript(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	ref := IconReference{Type: IconTypeURL, Value: "javascript:alert('xss')"}
	result := v.ValidateIcon(ref, IconRenderOptions{TrustedInput: true})

	assert.False(t, result.Allowed)
	assert.Contains(t, result.Reason, "scheme not allowed")
}

func TestIconSecurityValidator_ValidateIcon_DataURIAllowedMIME(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	ref := IconReference{Type: IconTypeURL, Value: "data:image/png;base64,ABC123"}
	result := v.ValidateIcon(ref, IconRenderOptions{TrustedInput: true})

	assert.True(t, result.Allowed)
}

func TestIconSecurityValidator_ValidateIcon_DataURIDisallowedMIME(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	ref := IconReference{Type: IconTypeURL, Value: "data:text/html;base64,ABC123"}
	result := v.ValidateIcon(ref, IconRenderOptions{TrustedInput: true})

	assert.False(t, result.Allowed)
	assert.Contains(t, result.Reason, "MIME type not allowed")
}

func TestIconSecurityValidator_ValidateIcon_DataURIUntrusted(t *testing.T) {
	v := NewIconSecurityValidator(DefaultIconSecurityPolicy())

	ref := IconReference{Type: IconTypeURL, Value: "data:image/png;base64,ABC123"}
	result := v.ValidateIcon(ref, IconRenderOptions{TrustedInput: false})

	assert.False(t, result.Allowed)
	assert.Equal(t, "data URIs not allowed for untrusted input", result.Reason)
}

func TestSanitizeSVG_ValidSVG(t *testing.T) {
	svg := `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/></svg>`
	result, err := sanitizeSVG(svg)

	assert.NoError(t, err)
	assert.Contains(t, result, "<svg")
	assert.Contains(t, result, "<circle")
}

func TestSanitizeSVG_RemovesScript(t *testing.T) {
	svg := `<svg><script>alert('xss')</script><circle/></svg>`
	result, err := sanitizeSVG(svg)

	assert.NoError(t, err)
	assert.NotContains(t, result, "script")
}

func TestSanitizeSVG_RemovesForeignObject(t *testing.T) {
	svg := `<svg><foreignObject><div>html</div></foreignObject><circle/></svg>`
	result, err := sanitizeSVG(svg)

	assert.NoError(t, err)
	assert.NotContains(t, result, "foreignObject")
}

func TestSanitizeSVG_RemovesEventHandlers(t *testing.T) {
	svg := `<svg onclick="alert()" onload="alert()"><circle/></svg>`
	result, err := sanitizeSVG(svg)

	assert.NoError(t, err)
	assert.NotContains(t, result, "onclick")
	assert.NotContains(t, result, "onload")
}

func TestSanitizeSVG_RemovesJavaScriptHref(t *testing.T) {
	svg := `<svg><a href="javascript:alert()"><circle/></a></svg>`
	result, err := sanitizeSVG(svg)

	assert.NoError(t, err)
	assert.NotContains(t, result, "javascript")
}

func TestSanitizeSVG_RemovesExternalRefs(t *testing.T) {
	svg := `<svg><image href="https://evil.com/img.png"/></svg>`
	result, err := sanitizeSVG(svg)

	assert.NoError(t, err)
	assert.NotContains(t, result, "https://")
}

func TestSanitizeSVG_InvalidContent(t *testing.T) {
	result, err := sanitizeSVG("not an svg")

	assert.Error(t, err)
	assert.Empty(t, result)
}

func TestIsValidIconName(t *testing.T) {
	tests := []struct {
		name  string
		valid bool
	}{
		{"home", true},
		{"home-icon", true},
		{"home_icon", true},
		{"HomeIcon", true},
		{"home123", true},
		{"home<script>", false},
		{"home icon", false},
		{"home.icon", false},
		{"", true}, // empty is technically valid chars, but validated elsewhere
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.valid, isValidIconName(tt.name))
		})
	}
}
