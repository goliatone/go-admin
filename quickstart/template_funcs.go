package quickstart

import (
	"encoding/json"
	"fmt"
	"html/template"
	"strings"

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
