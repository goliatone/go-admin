package admin

import (
	"strings"
)

// IconType categorizes the source/format of an icon.
type IconType string

const (
	// IconTypeUnknown indicates the icon type could not be determined.
	IconTypeUnknown IconType = ""
	// IconTypeEmoji represents a Unicode emoji character.
	IconTypeEmoji IconType = "emoji"
	// IconTypeLibrary represents a named icon from an icon library.
	IconTypeLibrary IconType = "library"
	// IconTypeSVG represents inline SVG markup.
	IconTypeSVG IconType = "svg"
	// IconTypeURL represents an external URL or data URI.
	IconTypeURL IconType = "url"
)

// IconRenderMode specifies how an icon should be rendered to HTML.
type IconRenderMode string

const (
	// IconRenderModeUnknown indicates the render mode is not specified.
	IconRenderModeUnknown IconRenderMode = ""
	// IconRenderModeCSS renders as <i class="prefix-{name}">.
	IconRenderModeCSS IconRenderMode = "css-class"
	// IconRenderModeSVG renders as inline <svg>...</svg>.
	IconRenderModeSVG IconRenderMode = "inline-svg"
	// IconRenderModeImg renders as <img src="...">.
	IconRenderModeImg IconRenderMode = "img-url"
	// IconRenderModeSpan renders as <span>content</span>.
	IconRenderModeSpan IconRenderMode = "span"
)

// IconCategory groups related icons within a library.
type IconCategory struct {
	// ID is the unique identifier for this category.
	ID string `json:"id"`
	// Label is the human-readable display name.
	Label string `json:"label"`
	// LabelKey is the i18n translation key for the label.
	LabelKey string `json:"label_key,omitempty"`
	// Count is the number of icons in this category (populated at runtime).
	Count int `json:"count,omitempty"`
}

// IconDefinition represents a single icon with metadata.
type IconDefinition struct {
	// ID is the unique identifier for this icon (e.g., "iconoir:settings").
	ID string `json:"id"`
	// Name is the short key used in menus/panels (e.g., "settings").
	Name string `json:"name"`
	// Label is the human-readable display name.
	Label string `json:"label,omitempty"`
	// LabelKey is the i18n translation key for the label.
	LabelKey string `json:"label_key,omitempty"`
	// Type categorizes the icon source.
	Type IconType `json:"type"`
	// Library identifies the icon library (e.g., "iconoir", "lucide", "custom").
	Library string `json:"library,omitempty"`
	// Content holds the icon data: emoji char, SVG markup, or URL.
	Content string `json:"content,omitempty"`
	// Keywords for search/filtering.
	Keywords []string `json:"keywords,omitempty"`
	// Category groups related icons.
	Category string `json:"category,omitempty"`
	// Variants maps variant names to alternate content (e.g., "dark" -> SVG with fill:#fff).
	Variants map[string]string `json:"variants,omitempty"`
	// Trusted indicates whether this icon definition comes from a trusted source.
	Trusted bool `json:"trusted,omitempty"`
	// Metadata for additional icon properties.
	Metadata map[string]any `json:"metadata,omitempty"`
}

// IconLibrary represents a collection of icons from a single source.
type IconLibrary struct {
	// ID is the unique library identifier (e.g., "iconoir", "lucide", "app-icons").
	ID string `json:"id"`
	// Name is the display name.
	Name string `json:"name"`
	// Description explains the library.
	Description string `json:"description,omitempty"`
	// Version tracks library version for cache invalidation.
	Version string `json:"version,omitempty"`
	// CDN is the optional CSS/JS CDN URL for library icons.
	CDN string `json:"cdn,omitempty"`
	// CSSClass is the class prefix pattern (e.g., "iconoir-{name}").
	CSSClass string `json:"css_class,omitempty"`
	// RenderMode specifies how to render icons from this library.
	RenderMode IconRenderMode `json:"render_mode,omitempty"`
	// Priority determines sort order in picker (lower = first).
	Priority int `json:"priority,omitempty"`
	// Icons contains all icons in this library.
	Icons []IconDefinition `json:"icons,omitempty"`
	// Categories groups icons within the library.
	Categories []IconCategory `json:"categories,omitempty"`
	// Trusted indicates whether icons from this library are trusted.
	Trusted bool `json:"trusted,omitempty"`
}

// IconReference is a parsed icon string with resolved type and library.
type IconReference struct {
	// Raw is the original input string.
	Raw string `json:"raw"`
	// Type is the resolved icon type.
	Type IconType `json:"type"`
	// Library is the resolved library ID for library icons.
	Library string `json:"library,omitempty"`
	// Value is the resolved icon value (name, emoji, SVG content, or URL).
	Value string `json:"value"`
	// Qualified indicates whether the input used explicit prefix syntax.
	Qualified bool `json:"qualified,omitempty"`
	// LegacyMapped indicates whether svgFieldTypeKeys mapping was applied.
	LegacyMapped bool `json:"legacy_mapped,omitempty"`
}

// IsEmpty returns true if the reference represents an empty icon.
func (r IconReference) IsEmpty() bool {
	return r.Raw == ""
}

// IconRenderOptions configures icon rendering behavior.
type IconRenderOptions struct {
	// Variant selects a specific icon variant (e.g., "dark", "light").
	Variant string
	// TrustedInput indicates the icon value comes from a trusted source.
	TrustedInput bool
	// AllowCustomUntrusted permits custom SVG/URL for untrusted input.
	AllowCustomUntrusted bool
	// Size is the CSS size value (e.g., "20px", "1.5rem").
	Size string
	// Classes are additional CSS classes to apply.
	Classes []string
	// Style is additional inline CSS.
	Style string
	// AriaLabel sets the aria-label for accessibility.
	AriaLabel string
	// AriaHidden hides the icon from screen readers.
	AriaHidden bool
}

// DefaultIconLibrary is the library used when no prefix is specified.
const DefaultIconLibrary = "iconoir"

// svgFieldTypeKeys maps icon-picker SVG field-type keys to their closest
// Iconoir equivalents. This is kept for backward compatibility.
var svgFieldTypeKeys = map[string]string{
	"text":          "text",
	"textarea":      "text",
	"rich-text":     "edit-pencil",
	"markdown":      "edit-pencil",
	"code":          "code",
	"number":        "calculator",
	"integer":       "calculator",
	"currency":      "credit-card",
	"percentage":    "percentage-round",
	"select":        "list",
	"radio":         "circle",
	"checkbox":      "check-circle",
	"chips":         "label",
	"toggle":        "switch-on",
	"date":          "calendar",
	"time":          "clock",
	"datetime":      "calendar",
	"media-picker":  "media-image",
	"media-gallery": "media-image-list",
	"file-upload":   "attachment",
	"reference":     "link",
	"references":    "link",
	"user":          "user",
	"group":         "folder",
	"repeater":      "refresh-double",
	"blocks":        "view-grid",
	"json":          "code-brackets",
	"slug":          "link",
	"color":         "color-picker",
	"location":      "pin-alt",
}

// ParseIconReference parses an icon string into a structured reference.
//
// Parsing precedence (strict order):
//  1. Empty string -> empty reference
//  2. emoji:<value> -> emoji
//  3. svg:<svg...> -> svg
//  4. url:<value> -> url
//  5. Raw <svg...> -> svg (legacy convenience)
//  6. Raw http://, https://, or data: -> url
//  7. Qualified <library>:<name> -> library
//  8. Legacy iconoir-<name> -> library iconoir, name stripped
//  9. Legacy svgFieldTypeKeys mapping -> mapped Iconoir name with LegacyMapped=true
//  10. Bare name -> default library (iconoir)
func ParseIconReference(value string) IconReference {
	value = strings.TrimSpace(value)
	if value == "" {
		return IconReference{Raw: value, Type: IconTypeUnknown}
	}

	ref := IconReference{Raw: value}

	// 1. Check for explicit emoji prefix
	if strings.HasPrefix(value, "emoji:") {
		ref.Type = IconTypeEmoji
		ref.Value = strings.TrimPrefix(value, "emoji:")
		ref.Qualified = true
		return ref
	}

	// 2. Check for explicit svg prefix
	if strings.HasPrefix(value, "svg:") {
		ref.Type = IconTypeSVG
		ref.Value = strings.TrimPrefix(value, "svg:")
		ref.Qualified = true
		return ref
	}

	// 3. Check for explicit url prefix
	if strings.HasPrefix(value, "url:") {
		ref.Type = IconTypeURL
		ref.Value = strings.TrimPrefix(value, "url:")
		ref.Qualified = true
		return ref
	}

	// 4. Check for raw SVG (legacy convenience)
	if strings.HasPrefix(value, "<svg") || strings.HasPrefix(value, "<SVG") {
		ref.Type = IconTypeSVG
		ref.Value = value
		return ref
	}

	// 5. Check for raw URL patterns
	if strings.HasPrefix(value, "http://") ||
		strings.HasPrefix(value, "https://") ||
		strings.HasPrefix(value, "data:") {
		ref.Type = IconTypeURL
		ref.Value = value
		return ref
	}

	// 6. Check for qualified library:name syntax
	if idx := strings.Index(value, ":"); idx > 0 {
		prefix := value[:idx]
		name := value[idx+1:]

		// Known library prefixes (extensible)
		if isKnownLibraryPrefix(prefix) {
			ref.Type = IconTypeLibrary
			ref.Library = prefix
			ref.Value = name
			ref.Qualified = true
			return ref
		}
	}

	// 7. Check for legacy iconoir-<name> pattern
	if strings.HasPrefix(value, "iconoir-") {
		ref.Type = IconTypeLibrary
		ref.Library = "iconoir"
		ref.Value = strings.TrimPrefix(value, "iconoir-")
		ref.LegacyMapped = true
		return ref
	}

	// 8. Check if it's an emoji (auto-detection)
	if isEmojiString(value) {
		ref.Type = IconTypeEmoji
		ref.Value = value
		return ref
	}

	// 9. Check for svgFieldTypeKeys mapping (backward compatibility)
	if mapped, ok := svgFieldTypeKeys[value]; ok {
		ref.Type = IconTypeLibrary
		ref.Library = DefaultIconLibrary
		ref.Value = mapped
		ref.LegacyMapped = true
		return ref
	}

	// 10. Default: treat as bare library icon name
	ref.Type = IconTypeLibrary
	ref.Library = DefaultIconLibrary
	ref.Value = value
	return ref
}

// isKnownLibraryPrefix checks if the prefix is a known icon library.
func isKnownLibraryPrefix(prefix string) bool {
	switch prefix {
	case "iconoir", "lucide", "heroicons", "feather", "tabler", "phosphor", "custom":
		return true
	default:
		return false
	}
}

// isEmojiString returns true if the string contains emoji characters.
func isEmojiString(s string) bool {
	for _, r := range s {
		if r > 0xFF {
			// Symbol, Other category covers many emoji
			if isSymbolOther(r) {
				return true
			}
			// Variation selector (U+FE0F) and ZWJ (U+200D) indicate emoji sequences
			if r == 0xFE0F || r == 0x200D {
				return true
			}
			// Miscellaneous Symbols and Dingbats (U+2600–U+27BF)
			if r >= 0x2600 && r <= 0x27BF {
				return true
			}
			// Main emoji blocks (U+1F300–U+1FAFF)
			if r >= 0x1F300 && r <= 0x1FAFF {
				return true
			}
			// Skin tone modifiers
			if r >= 0x1F3FB && r <= 0x1F3FF {
				return true
			}
		}
	}
	return false
}

// isSymbolOther checks if a rune is in the Symbol, Other Unicode category.
// This covers many emoji symbols.
func isSymbolOther(r rune) bool {
	// Common emoji symbol ranges in So category
	switch {
	case r >= 0x2300 && r <= 0x23FF: // Miscellaneous Technical
		return true
	case r >= 0x2600 && r <= 0x26FF: // Miscellaneous Symbols
		return true
	case r >= 0x2700 && r <= 0x27BF: // Dingbats
		return true
	case r >= 0x1F300 && r <= 0x1F5FF: // Miscellaneous Symbols and Pictographs
		return true
	case r >= 0x1F600 && r <= 0x1F64F: // Emoticons
		return true
	case r >= 0x1F680 && r <= 0x1F6FF: // Transport and Map Symbols
		return true
	case r >= 0x1F900 && r <= 0x1F9FF: // Supplemental Symbols and Pictographs
		return true
	case r >= 0x1FA00 && r <= 0x1FAFF: // Chess Symbols, Extended-A Pictographs
		return true
	}
	return false
}

// GetSVGFieldTypeMapping returns the svgFieldTypeKeys map for backward compatibility.
func GetSVGFieldTypeMapping() map[string]string {
	result := make(map[string]string, len(svgFieldTypeKeys))
	for k, v := range svgFieldTypeKeys {
		result[k] = v
	}
	return result
}
