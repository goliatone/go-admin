package admin

import (
	"html"
	"strings"
)

// IconRenderer produces HTML output for icons.
type IconRenderer interface {
	// Render produces HTML for the given icon reference.
	Render(ref IconReference, def *IconDefinition, opts IconRenderOptions) string
}

// DefaultIconRenderer implements IconRenderer with standard HTML output.
type DefaultIconRenderer struct {
	// CDNURLs maps library IDs to their CDN stylesheet URLs.
	CDNURLs map[string]string
	// ClassPatterns maps library IDs to class patterns (e.g., "iconoir-{name}").
	ClassPatterns map[string]string
	// DefaultSize is the default icon size CSS value.
	DefaultSize string
	// SecurityValidator validates and sanitizes icon content.
	SecurityValidator *IconSecurityValidator
}

// NewDefaultIconRenderer creates a new DefaultIconRenderer with sensible defaults.
func NewDefaultIconRenderer(policy IconSecurityPolicy) *DefaultIconRenderer {
	return &DefaultIconRenderer{
		CDNURLs: map[string]string{
			"iconoir": "https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css",
			"lucide":  "https://cdn.jsdelivr.net/npm/lucide-static@latest/font/lucide.css",
		},
		ClassPatterns: map[string]string{
			"iconoir": "iconoir-{name}",
			"lucide":  "lucide-{name}",
		},
		DefaultSize:       "var(--sidebar-icon-size, 20px)",
		SecurityValidator: NewIconSecurityValidator(policy),
	}
}

// Render produces HTML for the given icon reference.
func (r *DefaultIconRenderer) Render(ref IconReference, def *IconDefinition, opts IconRenderOptions) string {
	if ref.IsEmpty() {
		return ""
	}

	// Validate the icon
	result := r.SecurityValidator.ValidateIcon(ref, opts)
	if !result.Allowed {
		// Return empty or fallback for blocked icons
		return ""
	}

	// Determine size
	size := opts.Size
	if size == "" {
		size = r.DefaultSize
	}

	// Build common style
	style := "font-size: " + size + ";"
	if opts.Style != "" {
		style += " " + opts.Style
	}

	// Build common classes
	classes := []string{"flex-shrink-0"}
	classes = append(classes, opts.Classes...)
	classAttr := strings.Join(classes, " ")

	// Build aria attributes
	ariaAttrs := ""
	if opts.AriaHidden {
		ariaAttrs = ` aria-hidden="true"`
	} else if opts.AriaLabel != "" {
		ariaAttrs = ` aria-label="` + html.EscapeString(opts.AriaLabel) + `"`
	}

	switch ref.Type {
	case IconTypeEmoji:
		return r.renderEmoji(ref.Value, style, classAttr, ariaAttrs)

	case IconTypeLibrary:
		return r.renderLibraryIcon(ref, def, style, classAttr, ariaAttrs, opts)

	case IconTypeSVG:
		return r.renderSVG(result.SanitizedContent, style, classAttr, ariaAttrs)

	case IconTypeURL:
		return r.renderURL(result.ValidatedURL, style, classAttr, ariaAttrs, opts)

	default:
		return ""
	}
}

// renderEmoji renders an emoji icon.
func (r *DefaultIconRenderer) renderEmoji(emoji, style, classes, ariaAttrs string) string {
	escaped := html.EscapeString(emoji)
	style += " line-height: 1; text-align: center; width: 1.25em;"
	return `<span class="` + classes + `" style="` + style + `"` + ariaAttrs + `>` + escaped + `</span>`
}

// renderLibraryIcon renders a CSS class-based library icon.
func (r *DefaultIconRenderer) renderLibraryIcon(ref IconReference, def *IconDefinition, style, classes, ariaAttrs string, opts IconRenderOptions) string {
	library := ref.Library
	if library == "" {
		library = DefaultIconLibrary
	}

	// Get the icon name, potentially from a variant
	name := ref.Value
	if def != nil && opts.Variant != "" && def.Variants != nil {
		if variantName, ok := def.Variants[opts.Variant]; ok {
			name = variantName
		}
	}

	// Build the icon class
	pattern, ok := r.ClassPatterns[library]
	if !ok {
		// Default pattern
		pattern = library + "-{name}"
	}
	iconClass := strings.ReplaceAll(pattern, "{name}", html.EscapeString(name))

	// Combine with additional classes
	fullClasses := iconClass + " " + classes

	return `<i class="` + fullClasses + `" style="` + style + `"` + ariaAttrs + `></i>`
}

// renderSVG renders inline SVG content.
func (r *DefaultIconRenderer) renderSVG(svg, style, classes, ariaAttrs string) string {
	if svg == "" {
		return ""
	}

	// The SVG has already been sanitized by the security validator.
	// We need to inject the style and classes into the SVG element.
	svg = injectSVGAttributes(svg, style, classes, ariaAttrs)

	return svg
}

// renderURL renders an image URL icon.
func (r *DefaultIconRenderer) renderURL(urlStr, style, classes, ariaAttrs string, opts IconRenderOptions) string {
	if urlStr == "" {
		return ""
	}

	escaped := html.EscapeString(urlStr)

	// For alt text, use aria-label if provided
	alt := ""
	if opts.AriaLabel != "" {
		alt = html.EscapeString(opts.AriaLabel)
	}

	return `<img src="` + escaped + `" alt="` + alt + `" class="` + classes + `" style="` + style + ` object-fit: contain;"` + ariaAttrs + ` />`
}

// injectSVGAttributes injects style, class, and aria attributes into an SVG element.
func injectSVGAttributes(svg, style, classes, ariaAttrs string) string {
	// Find the opening <svg tag
	lower := strings.ToLower(svg)
	svgIdx := strings.Index(lower, "<svg")
	if svgIdx < 0 {
		return svg
	}

	// Find the end of the opening tag
	endIdx := strings.Index(svg[svgIdx:], ">")
	if endIdx < 0 {
		return svg
	}
	endIdx += svgIdx

	// Check if it's a self-closing tag
	selfClosing := svg[endIdx-1] == '/'
	if selfClosing {
		endIdx--
	}

	// Build new attributes
	newAttrs := ""
	if style != "" {
		newAttrs += ` style="` + style + `"`
	}
	if classes != "" {
		newAttrs += ` class="` + classes + `"`
	}
	if ariaAttrs != "" {
		newAttrs += ariaAttrs
	}

	// Inject attributes before the closing > or />
	if selfClosing {
		return svg[:endIdx] + newAttrs + " />" + svg[endIdx+2:]
	}
	return svg[:endIdx] + newAttrs + svg[endIdx:]
}

// RenderOptions returns the render options for a specific context.
func RenderOptionsForTemplate() IconRenderOptions {
	return IconRenderOptions{
		TrustedInput:         false, // Template values are untrusted by default
		AllowCustomUntrusted: false,
		AriaHidden:           true,
	}
}

// RenderOptionsForModule returns render options for module-contributed icons.
func RenderOptionsForModule() IconRenderOptions {
	return IconRenderOptions{
		TrustedInput:         true, // Module code is trusted
		AllowCustomUntrusted: false,
		AriaHidden:           true,
	}
}

// RenderOptionsForAPI returns render options for API-requested icon rendering.
func RenderOptionsForAPI(trusted bool) IconRenderOptions {
	return IconRenderOptions{
		TrustedInput:         trusted,
		AllowCustomUntrusted: false,
		AriaHidden:           true,
	}
}
