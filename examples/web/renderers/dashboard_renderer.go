package renderers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"strings"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/internal/templateview"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
	gotemplate "github.com/goliatone/go-template"
)

// TemplateRenderer renders dashboards using go-template (Pongo2).
type TemplateRenderer struct {
	renderer *gotemplate.Engine
}

// NewTemplateRenderer creates a renderer with Pongo2 templates.
func NewTemplateRenderer(templatesFS fs.FS) (*TemplateRenderer, error) {
	if templatesFS == nil {
		return nil, fmt.Errorf("templates filesystem is required")
	}
	renderer, err := gotemplate.NewRenderer(
		gotemplate.WithFS(templatesFS),
		gotemplate.WithExtension(".html"),
		gotemplate.WithTemplateFunc(quickstart.DefaultTemplateFuncs(helpers.TemplateFuncOptions()...)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create template renderer: %w", err)
	}
	return &TemplateRenderer{renderer: renderer}, nil
}

// RenderLayout keeps the legacy go-admin contract by delegating to the
// go-dashboard compatible Render method with the default template.
func (r *TemplateRenderer) RenderLayout(layout *admin.DashboardLayout) (string, error) {
	return r.Render("dashboard_ssr.html", layout)
}

// Render implements go-dashboard's Renderer interface.
func (r *TemplateRenderer) Render(name string, data any, out ...io.Writer) (string, error) {
	if r == nil || r.renderer == nil {
		return "", fmt.Errorf("template renderer not initialized")
	}

	templateName := strings.TrimSpace(name)
	if templateName == "" {
		templateName = "dashboard_ssr.html"
	}

	normalized, err := r.normalizeData(data)
	if err != nil {
		return "", err
	}
	serialized, err := router.SerializeAsContext(normalized)
	if err != nil {
		return "", fmt.Errorf("serialize dashboard template context: %w", err)
	}
	templateview.NormalizeContextNumbers(serialized)

	html, err := r.renderer.Render(templateName, serialized)
	if err != nil {
		return "", fmt.Errorf("template execution failed: %w", err)
	}
	if len(out) > 0 && out[0] != nil {
		_, _ = io.Copy(out[0], bytes.NewBufferString(html))
	}
	return html, nil
}

func (r *TemplateRenderer) normalizeData(data any) (map[string]any, error) {
	switch v := data.(type) {
	case *admin.DashboardLayout:
		return r.buildTemplateData(v), nil
	case admin.DashboardLayout:
		return r.buildTemplateData(&v), nil
	case nil:
		return map[string]any{}, nil
	default:
		return nil, fmt.Errorf("unsupported dashboard payload type: %T", data)
	}
}

// buildTemplateData converts DashboardLayout to template-friendly structure.
func (r *TemplateRenderer) buildTemplateData(layout *admin.DashboardLayout) map[string]any {
	if layout == nil {
		return map[string]any{
			"title":             "Dashboard",
			"base_path":         "",
			"asset_base_path":   "",
			"nav_items":         []any{},
			"nav_utility_items": []any{},
			"session_user":      map[string]any{},
			"areas":             []map[string]any{},
			"layout_json":       "{}",
		}
	}

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
				"span":       normalizeSpan(widget.Span),
			})
		}
		areas = append(areas, map[string]any{
			"code":    area.Code,
			"title":   area.Title,
			"widgets": widgets,
		})
	}

	layoutJSON, _ := json.Marshal(map[string]any{
		"areas":    areas,
		"basePath": layout.BasePath,
	})

	title := any("Dashboard")
	if layout.Metadata != nil {
		if metaTitle, ok := layout.Metadata["title"]; ok {
			title = metaTitle
		}
	}
	view := baseTemplateContext(layout.BasePath, title)
	if layout.Metadata != nil {
		overlayOptionalContext(view, layout.Metadata,
			"asset_base_path",
			"api_base_path",
			"body_classes",
			"nav_items",
			"nav_utility_items",
			"nav_debug",
			"nav_items_json",
			"session_user",
			"translation_capabilities",
			"users_import_available",
			"users_import_enabled",
		)
	}
	view["areas"] = areas
	view["base_path"] = layout.BasePath
	view["theme"] = layout.Theme
	view["layout_json"] = string(layoutJSON)
	return view
}

func normalizeSpan(span int) int {
	if span < 1 || span > 12 {
		return 12
	}
	return span
}

func baseTemplateContext(basePath string, title any) map[string]any {
	resolvedTitle := "Dashboard"
	if titleStr, ok := title.(string); ok && strings.TrimSpace(titleStr) != "" {
		resolvedTitle = strings.TrimSpace(titleStr)
	}
	return map[string]any{
		"title":             resolvedTitle,
		"base_path":         basePath,
		"asset_base_path":   basePath,
		"nav_items":         []any{},
		"nav_utility_items": []any{},
		"session_user":      map[string]any{},
	}
}

func overlayOptionalContext(target map[string]any, source map[string]any, keys ...string) {
	if target == nil || source == nil {
		return
	}
	for _, key := range keys {
		if value, ok := source[key]; ok && value != nil {
			target[key] = value
		}
	}
}
