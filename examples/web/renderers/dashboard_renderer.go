package renderers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// TemplateRenderer renders dashboards using Go html/template with Pongo2-style syntax support
type TemplateRenderer struct {
	tmpl *template.Template
}

// NewTemplateRenderer creates a renderer with the given template
func NewTemplateRenderer(tmplPath string) (*TemplateRenderer, error) {
	tmpl, err := template.New("dashboard").Funcs(templateFuncs()).ParseFiles(tmplPath)
	if err != nil {
		return nil, fmt.Errorf("failed to parse dashboard template: %w", err)
	}
	return &TemplateRenderer{tmpl: tmpl}, nil
}

// Render generates HTML from the dashboard layout
func (r *TemplateRenderer) Render(layout *admin.DashboardLayout) (template.HTML, error) {
	if layout == nil {
		return "", fmt.Errorf("layout is nil")
	}

	var buf bytes.Buffer
	data := r.buildTemplateData(layout)

	if err := r.tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("template execution failed: %w", err)
	}

	return template.HTML(buf.String()), nil
}

// buildTemplateData converts DashboardLayout to template-friendly structure
func (r *TemplateRenderer) buildTemplateData(layout *admin.DashboardLayout) map[string]interface{} {
	areas := make([]map[string]interface{}, 0, len(layout.Areas))
	for _, area := range layout.Areas {
		widgets := make([]map[string]interface{}, 0, len(area.Widgets))
		for _, widget := range area.Widgets {
			widgets = append(widgets, map[string]interface{}{
				"id":         widget.ID,
				"definition": widget.Definition,
				"area":       widget.Area,
				"data":       widget.Data,
				"config":     widget.Config,
				"metadata":   widget.Metadata,
				"hidden":     widget.Hidden,
				"span":       widget.Span,
			})
		}
		areas = append(areas, map[string]interface{}{
			"code":    area.Code,
			"title":   area.Title,
			"widgets": widgets,
		})
	}

	// Serialize layout as JSON for inline state
	layoutJSON, _ := json.Marshal(map[string]interface{}{
		"areas":    areas,
		"basePath": layout.BasePath,
	})

	return map[string]interface{}{
		"areas":       areas,
		"base_path":   layout.BasePath,
		"theme":       layout.Theme,
		"layout_json": string(layoutJSON),
	}
}

// templateFuncs returns custom template functions
func templateFuncs() template.FuncMap {
	return template.FuncMap{
		"toJSON": func(v interface{}) template.JS {
			b, _ := json.Marshal(v)
			return template.JS(b)
		},
		"safeHTML": func(s string) template.HTML {
			return template.HTML(s)
		},
		"default": func(defaultVal, val interface{}) interface{} {
			if val == nil || val == "" {
				return defaultVal
			}
			return val
		},
		"getWidgetTitle": getWidgetTitle,
		"formatNumber":   formatNumber,
		"dict": func(values ...interface{}) (map[string]interface{}, error) {
			if len(values)%2 != 0 {
				return nil, fmt.Errorf("dict requires even number of arguments")
			}
			dict := make(map[string]interface{}, len(values)/2)
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
		"admin.widget.user_stats":       "User Statistics",
		"admin.widget.activity_feed":    "Recent Activity",
		"admin.widget.quick_actions":    "Quick Actions",
		"admin.widget.notifications":    "Notifications",
		"admin.widget.settings_overview": "Settings Overview",
		"admin.widget.content_stats":    "Content Stats",
		"admin.widget.storage_stats":    "Storage Stats",
		"admin.widget.system_health":    "System Health",
		"admin.widget.bar_chart":        "Bar Chart",
		"admin.widget.line_chart":       "Line Chart",
		"admin.widget.pie_chart":        "Pie Chart",
		"admin.widget.gauge_chart":      "Gauge",
		"admin.widget.scatter_chart":    "Scatter Chart",
	}
	if title, ok := titles[definition]; ok {
		return title
	}
	return strings.ReplaceAll(definition, "_", " ")
}

// formatNumber formats numbers with locale-aware separators
func formatNumber(value interface{}) string {
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
