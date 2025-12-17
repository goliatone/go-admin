package helpers

import (
	"encoding/json"
	"fmt"
	"html/template"
	"strings"
)

// TemplateFuncs returns shared template functions for use across all view engines.
// These functions are used by both the main view engine (WebViewConfig) and
// the dashboard renderer (TemplateRenderer).
func TemplateFuncs() map[string]any {
	return map[string]any{
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
		"getWidgetTitle": getWidgetTitle,
		"formatNumber":   formatNumber,
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
}

// getWidgetTitle returns a human-readable title for widget definitions
func getWidgetTitle(definition string) string {
	titles := map[string]string{
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
	if title, ok := titles[definition]; ok {
		return title
	}
	return strings.ReplaceAll(definition, "_", " ")
}

// formatNumber formats numbers with locale-aware separators
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
