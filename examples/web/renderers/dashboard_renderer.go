package renderers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"strings"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	gotemplate "github.com/goliatone/go-template"
)

// TemplateRenderer renders dashboards using go-template (Pongo2)
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

// Render implements go-dashboard's Renderer interface while preserving the
// existing go-admin renderer contract. It accepts either the legacy
// DashboardLayout or a go-dashboard payload (map-based) and renders to the
// provided writer when present.
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

	html, err := r.renderer.Render(templateName, normalized)
	if err != nil {
		fmt.Printf("ERROR: Template rendering failed: %v\n", err)
		fmt.Printf("DEBUG: Data passed to template: %+v\n", normalized)
		return "", fmt.Errorf("template execution failed: %w", err)
	}

	if len(out) > 0 && out[0] != nil {
		_, _ = io.Copy(out[0], bytes.NewBufferString(html))
	}

	return html, nil
}

// normalizeData converts supported payloads into the template shape we expect.
// Supports:
//   - *admin.DashboardLayout or admin.DashboardLayout (legacy)
//   - map[string]any produced by go-dashboard.Controller.LayoutPayload
func (r *TemplateRenderer) normalizeData(data any) (map[string]any, error) {
	switch v := data.(type) {
	case *admin.DashboardLayout:
		return r.buildTemplateData(v), nil
	case admin.DashboardLayout:
		return r.buildTemplateData(&v), nil
	case map[string]any:
		return r.convertGoDashboardPayload(v), nil
	default:
		return nil, fmt.Errorf("unsupported dashboard payload type: %T", data)
	}
}

// convertGoDashboardPayload adapts the go-dashboard controller payload to the
// legacy template structure.
func (r *TemplateRenderer) convertGoDashboardPayload(payload map[string]any) map[string]any {
	areasSlice := []map[string]any{}
	if rawAreas, ok := payload["areas"].(map[string]any); ok {
		for _, value := range rawAreas {
			areaMap, ok := value.(map[string]any)
			if !ok {
				continue
			}
			widgets := []map[string]any{}
			if rawWidgets, ok := areaMap["widgets"].([]any); ok {
				for _, w := range rawWidgets {
					if wMap, ok := w.(map[string]any); ok {
						dataVal := wMap["data"]
						if dataVal == nil {
							if meta, ok := wMap["metadata"].(map[string]any); ok {
								dataVal = meta["data"]
							}
						}
						widgets = append(widgets, map[string]any{
							"id":         wMap["id"],
							"definition": wMap["definition"],
							"area":       wMap["area_code"],
							"data":       dataVal,
							"config":     wMap["config"],
							"metadata":   wMap["metadata"],
							"hidden":     wMap["hidden"],
							"span":       widthFromMetadata(wMap["metadata"]),
						})
					}
				}
			}
			areasSlice = append(areasSlice, map[string]any{
				"code":    areaMap["code"],
				"title":   areaMap["code"],
				"widgets": widgets,
			})
		}
	}

	basePath := ""
	if raw, ok := payload["base_path"].(string); ok {
		basePath = raw
	}

	layoutJSON, _ := json.Marshal(map[string]any{
		"areas":    areasSlice,
		"basePath": basePath,
	})

	return map[string]any{
		"areas":       areasSlice,
		"base_path":   basePath,
		"theme":       payload["theme"],
		"layout_json": string(layoutJSON),
	}
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

// widthFromMetadata extracts a grid width from go-dashboard widget metadata.
func widthFromMetadata(meta any) int {
	metaMap, ok := meta.(map[string]any)
	if !ok || metaMap == nil {
		return 0
	}
	if layout, ok := metaMap["layout"].(map[string]any); ok {
		if width, ok := layout["width"].(int); ok {
			return width
		}
		if widthf, ok := layout["width"].(float64); ok {
			return int(widthf)
		}
	}
	if width, ok := metaMap["width"].(int); ok {
		return width
	}
	if widthf, ok := metaMap["width"].(float64); ok {
		return int(widthf)
	}
	return 0
}
