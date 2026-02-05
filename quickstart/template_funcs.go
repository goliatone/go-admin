package quickstart

import (
	"encoding/json"
	"fmt"
	"html"
	"html/template"
	"strings"
	"unicode"

	"github.com/gobuffalo/flect"
	fggate "github.com/goliatone/go-featuregate/gate"
	fgtemplates "github.com/goliatone/go-featuregate/templates"
)

// TemplateFuncOption customizes default template functions.
type TemplateFuncOption func(*templateFuncOptions)

type templateFuncOptions struct {
	widgetTitles         map[string]string
	widgetTitleFn        func(string) string
	featureGate          fggate.FeatureGate
	featureHelperOptions []fgtemplates.HelperOption
	basePath             string
}

// DefaultTemplateFuncs returns shared template functions for view rendering.
func DefaultTemplateFuncs(opts ...TemplateFuncOption) map[string]any {
	options := templateFuncOptions{
		widgetTitles: defaultWidgetTitles(),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	titleFn := options.widgetTitleFn
	if titleFn == nil {
		titles := options.widgetTitles
		titleFn = func(definition string) string {
			if titles != nil {
				if title, ok := titles[definition]; ok {
					return title
				}
			}
			return strings.ReplaceAll(definition, "_", " ")
		}
	}

	basePath := sanitizeTemplateBasePath(options.basePath)
	funcs := map[string]any{
		"toJSON": func(v any) string {
			b, _ := json.Marshal(v)
			return string(b)
		},
		// TODO: Remove safeHTML and all references to it, in templates use safe
		"safeHTML": func(s string) template.HTML {
			return template.HTML(s)
		},
		"default": func(defaultVal, val any) any {
			if val == nil || val == "" {
				return defaultVal
			}
			return val
		},
		"getWidgetTitle": titleFn,
		"formatNumber":   formatNumber,
		"singularize":    flect.Singularize,
		"pluralize":      flect.Pluralize,
		"adminURL": func(path string) string {
			return joinAdminURL(basePath, path)
		},
		"renderMenuIcon": renderMenuIcon,
		"dict": func(values ...any) (map[string]any, error) {
			if len(values)%2 != 0 {
				return nil, fmt.Errorf("dict requires even number of arguments")
			}
			dict := make(map[string]any, len(values)/2)
			for i := 0; i < len(values); i += 2 {
				key, ok := values[i].(string)
				if !ok {
					return nil, fmt.Errorf("dict keys must be strings")
				}
				dict[key] = values[i+1]
			}
			return dict, nil
		},
	}
	for key, value := range fgtemplates.TemplateHelpers(options.featureGate, options.featureHelperOptions...) {
		funcs[key] = value
	}
	return funcs
}

// MergeTemplateFuncs combines default functions with caller overrides.
func MergeTemplateFuncs(overrides map[string]any, opts ...TemplateFuncOption) map[string]any {
	funcs := DefaultTemplateFuncs(opts...)
	for key, value := range overrides {
		funcs[key] = value
	}
	return funcs
}

// WithWidgetTitleOverrides updates the default widget title map.
func WithWidgetTitleOverrides(overrides map[string]string) TemplateFuncOption {
	return func(opts *templateFuncOptions) {
		if opts == nil || len(overrides) == 0 {
			return
		}
		if opts.widgetTitles == nil {
			opts.widgetTitles = map[string]string{}
		}
		for key, value := range overrides {
			opts.widgetTitles[key] = value
		}
	}
}

// WithWidgetTitleMap replaces the default widget title map.
func WithWidgetTitleMap(titles map[string]string) TemplateFuncOption {
	return func(opts *templateFuncOptions) {
		if opts == nil {
			return
		}
		if titles == nil {
			opts.widgetTitles = nil
			return
		}
		opts.widgetTitles = cloneWidgetTitles(titles)
	}
}

// WithWidgetTitleFunc replaces the widget title resolver.
func WithWidgetTitleFunc(fn func(string) string) TemplateFuncOption {
	return func(opts *templateFuncOptions) {
		if opts == nil {
			return
		}
		opts.widgetTitleFn = fn
	}
}

// WithTemplateBasePath configures the base path used by adminURL helper.
func WithTemplateBasePath(basePath string) TemplateFuncOption {
	return func(opts *templateFuncOptions) {
		if opts == nil {
			return
		}
		opts.basePath = strings.TrimSpace(basePath)
	}
}

// WithTemplateFeatureGate registers feature template helpers using the provided gate.
func WithTemplateFeatureGate(gate fggate.FeatureGate, opts ...fgtemplates.HelperOption) TemplateFuncOption {
	return func(options *templateFuncOptions) {
		if options == nil {
			return
		}
		options.featureGate = gate
		if len(opts) > 0 {
			options.featureHelperOptions = append(options.featureHelperOptions, opts...)
		}
	}
}

func defaultWidgetTitles() map[string]string {
	return map[string]string{
		"admin.widget.user_stats":        "User Statistics",
		"admin.widget.activity_feed":     "Recent Activity",
		"admin.widget.quick_actions":     "Quick Actions",
		"admin.widget.notifications":     "Notifications",
		"admin.widget.settings_overview": "Settings Overview",
		"admin.widget.content_stats":     "Content Stats",
		"admin.widget.storage_stats":     "Storage Stats",
		"admin.widget.system_health":     "System Health",
		"admin.widget.bar_chart":         "Bar Chart",
		"admin.widget.line_chart":        "Line Chart",
		"admin.widget.pie_chart":         "Pie Chart",
		"admin.widget.gauge_chart":       "Gauge",
		"admin.widget.scatter_chart":     "Scatter Chart",
	}
}

func sanitizeTemplateBasePath(basePath string) string {
	trimmed := strings.TrimSpace(basePath)
	if trimmed == "" {
		return ""
	}
	return "/" + strings.Trim(trimmed, "/")
}

func joinAdminURL(basePath, path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return basePath
	}
	if strings.HasPrefix(trimmed, "http://") ||
		strings.HasPrefix(trimmed, "https://") ||
		strings.HasPrefix(trimmed, "//") {
		return trimmed
	}
	if basePath == "" || basePath == "/" {
		if strings.HasPrefix(trimmed, "/") {
			return trimmed
		}
		return "/" + trimmed
	}
	trimmed = strings.TrimPrefix(trimmed, "/")
	return basePath + "/" + trimmed
}

func cloneWidgetTitles(input map[string]string) map[string]string {
	if input == nil {
		return nil
	}
	out := make(map[string]string, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}

// svgFieldTypeKeys maps icon-picker SVG field-type keys to their closest
// Iconoir equivalents. Keys that happen to be valid Iconoir names map to
// themselves; others map to a reasonable visual fallback.
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

// renderMenuIcon returns safe HTML for a sidebar/menu icon.
//
// Detection order:
//  1. Empty string → ""
//  2. Emoji (Unicode range check) → <span> with the emoji character
//  3. SVG field-type key (finite set from icon picker) → mapped to Iconoir name
//  4. Default → rendered as Iconoir <i class="iconoir-{name}">
func renderMenuIcon(icon string) string {
	icon = strings.TrimSpace(icon)
	if icon == "" {
		return ""
	}

	style := `font-size: var(--sidebar-icon-size, 20px);`

	// 1. Emoji detection
	if isEmoji(icon) {
		escaped := html.EscapeString(icon)
		return `<span class="flex-shrink-0" style="` + style + ` line-height: 1; text-align: center; width: 1.25em;">` + escaped + `</span>`
	}

	// 2. SVG field-type key → map to Iconoir name
	if mapped, ok := svgFieldTypeKeys[icon]; ok {
		icon = mapped
	}

	// 3. Render as Iconoir
	return `<i class="iconoir-` + html.EscapeString(icon) + ` flex-shrink-0" style="` + style + `"></i>`
}

// isEmoji returns true if the string contains emoji characters.
func isEmoji(s string) bool {
	for _, r := range s {
		if r > 0xFF {
			// Symbol, Other category covers many emoji
			if unicode.Is(unicode.So, r) {
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

// formatNumber formats numbers with locale-aware separators.
func formatNumber(value any) string {
	switch v := value.(type) {
	case int:
		return fmt.Sprintf("%d", v)
	case int64:
		return fmt.Sprintf("%d", v)
	case float64:
		if v == float64(int64(v)) {
			return fmt.Sprintf("%d", int64(v))
		}
		return fmt.Sprintf("%.2f", v)
	case string:
		return v
	default:
		return fmt.Sprintf("%v", v)
	}
}
