package renderers

import (
	"encoding/json"
	"fmt"
	"html/template" // For safeHTML helper
	"strings"

	"github.com/goliatone/go-admin/admin"
	gotemplate "github.com/goliatone/go-template"
)

// TemplateRenderer renders dashboards using go-template (Pongo2)
type TemplateRenderer struct {
	renderer *gotemplate.Engine
}

// NewTemplateRenderer creates a renderer with Pongo2 templates
func NewTemplateRenderer(templatesDir string) (*TemplateRenderer, error) {
	renderer, err := gotemplate.NewRenderer(
		gotemplate.WithBaseDir(templatesDir),
		gotemplate.WithExtension(".html"),
		gotemplate.WithTemplateFunc(templateFuncs()),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create template renderer: %w", err)
	}
	return &TemplateRenderer{renderer: renderer}, nil
}

// Render generates HTML from the dashboard layout.
func (r *TemplateRenderer) Render(layout *admin.DashboardLayout) (string, error) {
	if layout == nil {
		return "", fmt.Errorf("layout is nil")
	}

	data := r.buildTemplateData(layout)

	// Render using go-template (Pongo2)
	html, err := r.renderer.Render("dashboard_ssr.html", data)
	if err != nil {
		// Log detailed error information
		fmt.Printf("ERROR: Template rendering failed: %v\n", err)
		fmt.Printf("DEBUG: Data passed to template: %+v\n", data)
		return "", fmt.Errorf("template execution failed: %w", err)
	}

	return html, nil
}

// buildTemplateData converts DashboardLayout to template-friendly structure
func (r *TemplateRenderer) buildTemplateData(layout *admin.DashboardLayout) map[string]any {
	areas := make([]map[string]any, 0, len(layout.Areas))
	for _, area := range layout.Areas {
		widgets := make([]map[string]any, 0, len(area.Widgets))
		for _, widget := range area.Widgets {
			widgets = append(widgets, map[string]any{
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
		areas = append(areas, map[string]any{
			"code":    area.Code,
			"title":   area.Title,
			"widgets": widgets,
		})
	}

	// Serialize layout as JSON for inline state
	layoutJSON, _ := json.Marshal(map[string]any{
		"areas":    areas,
		"basePath": layout.BasePath,
	})

	return map[string]any{
		"areas":       areas,
		"base_path":   layout.BasePath,
		"theme":       layout.Theme,
		"layout_json": string(layoutJSON),
	}
}

// templateFuncs returns custom template functions for Pongo2
func templateFuncs() map[string]any {
	return map[string]any{
		"toJSON": func(v any) string {
			b, _ := json.Marshal(v)
			return string(b)
		},
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
