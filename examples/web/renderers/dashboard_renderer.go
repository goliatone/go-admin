package renderers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"sort"
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
	case map[string]any:
		return r.buildTemplateDataFromControllerPayload(v), nil
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

func (r *TemplateRenderer) buildTemplateDataFromControllerPayload(payload map[string]any) map[string]any {
	if payload == nil {
		return map[string]any{}
	}
	basePath := rendererToString(payload["base_path"])
	title := any("Dashboard")
	if value, ok := payload["title"]; ok && value != nil {
		title = value
	}
	view := baseTemplateContext(basePath, title)
	overlayOptionalContext(view, payload,
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
		"theme",
		"locale",
	)
	areas := normalizeControllerAreas(payload)
	layoutJSON, _ := json.Marshal(map[string]any{
		"areas":    areas,
		"basePath": basePath,
	})
	view["areas"] = areas
	view["base_path"] = basePath
	view["layout_json"] = string(layoutJSON)
	return view
}

func normalizeControllerAreas(payload map[string]any) []map[string]any {
	if payload == nil {
		return []map[string]any{}
	}
	ordered := controllerAreaSlice(payload["ordered_areas"])
	if len(ordered) > 0 {
		out := make([]map[string]any, 0, len(ordered))
		for _, area := range ordered {
			out = append(out, normalizeControllerArea(area, ""))
		}
		return out
	}
	rawAreas := controllerAreaSlice(payload["areas"])
	if len(rawAreas) > 0 {
		out := make([]map[string]any, 0, len(rawAreas))
		for _, area := range rawAreas {
			out = append(out, normalizeControllerArea(area, ""))
		}
		return out
	}
	areasMap, ok := payload["areas"].(map[string]any)
	if !ok || len(areasMap) == 0 {
		return []map[string]any{}
	}
	keys := make([]string, 0, len(areasMap))
	for key := range areasMap {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make([]map[string]any, 0, len(keys))
	for _, key := range keys {
		area, _ := areasMap[key].(map[string]any)
		out = append(out, normalizeControllerArea(area, key))
	}
	return out
}

func normalizeControllerArea(area map[string]any, fallbackCode string) map[string]any {
	code := strings.TrimSpace(rendererToString(area["code"]))
	if code == "" {
		code = strings.TrimSpace(fallbackCode)
	}
	rawWidgets := controllerWidgetSlice(area["widgets"])
	widgets := make([]map[string]any, 0, len(rawWidgets))
	for _, widget := range rawWidgets {
		widgets = append(widgets, normalizeControllerWidget(widget, code))
	}
	return map[string]any{
		"code":    code,
		"title":   code,
		"widgets": widgets,
	}
}

func normalizeControllerWidget(widget map[string]any, areaCode string) map[string]any {
	metadata := map[string]any{}
	if raw, ok := widget["metadata"].(map[string]any); ok && raw != nil {
		metadata = raw
	}
	span := normalizeSpan(widgetSpanFromControllerWidget(widget))
	hidden, _ := widget["hidden"].(bool)
	if !hidden {
		if metaHidden, ok := metadata["hidden"].(bool); ok {
			hidden = metaHidden
		}
	}
	area := strings.TrimSpace(rendererToString(widget["area"]))
	if area == "" {
		area = strings.TrimSpace(rendererToString(widget["area_code"]))
	}
	if area == "" {
		area = areaCode
	}
	config := map[string]any{}
	if raw, ok := widget["config"].(map[string]any); ok && raw != nil {
		config = raw
	}
	data := map[string]any{}
	if raw, ok := widget["data"].(map[string]any); ok && raw != nil {
		data = raw
	}
	return map[string]any{
		"id":         rendererToString(widget["id"]),
		"definition": rendererToString(widget["definition"]),
		"area":       area,
		"data":       data,
		"config":     config,
		"metadata":   metadata,
		"hidden":     hidden,
		"span":       span,
	}
}

func widgetSpanFromControllerWidget(widget map[string]any) int {
	if widget == nil {
		return 12
	}
	if span := rendererNumericToInt(widget["span"]); span > 0 {
		return span
	}
	metadata, ok := widget["metadata"].(map[string]any)
	if !ok || metadata == nil {
		return 12
	}
	if layout, ok := metadata["layout"].(map[string]any); ok {
		if width := rendererNumericToInt(layout["width"]); width > 0 {
			return width
		}
	}
	if width := rendererNumericToInt(metadata["width"]); width > 0 {
		return width
	}
	return 12
}

func controllerAreaSlice(raw any) []map[string]any {
	switch typed := raw.(type) {
	case []map[string]any:
		return typed
	case []any:
		out := make([]map[string]any, 0, len(typed))
		for _, value := range typed {
			if area, ok := value.(map[string]any); ok {
				out = append(out, area)
			}
		}
		return out
	default:
		return nil
	}
}

func controllerWidgetSlice(raw any) []map[string]any {
	switch typed := raw.(type) {
	case []map[string]any:
		return typed
	case []any:
		out := make([]map[string]any, 0, len(typed))
		for _, value := range typed {
			if widget, ok := value.(map[string]any); ok {
				out = append(out, widget)
			}
		}
		return out
	default:
		return nil
	}
}

func rendererNumericToInt(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int8:
		return int(typed)
	case int16:
		return int(typed)
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case float32:
		return int(typed)
	case float64:
		return int(typed)
	default:
		return 0
	}
}

func rendererToString(value any) string {
	text, _ := value.(string)
	return text
}
