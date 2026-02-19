package renderers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
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
	serialized, err := router.SerializeAsContext(normalized)
	if err != nil {
		return "", fmt.Errorf("serialize dashboard template context: %w", err)
	}

	html, err := r.renderer.Render(templateName, serialized)
	if err != nil {
		fmt.Printf("ERROR: Template rendering failed: %v\n", err)
		fmt.Printf("DEBUG: Data passed to template: %+v\n", serialized)
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
					wMap, ok := w.(map[string]any)
					if !ok {
						continue
					}
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
						"data":       normalizeWidgetData(dataVal),
						"config":     normalizeTemplateValue(wMap["config"]),
						"metadata":   normalizeTemplateValue(wMap["metadata"]),
						"hidden":     wMap["hidden"],
						"span":       normalizeSpan(widthFromMetadata(wMap["metadata"])),
					})
				}
			}
			areasSlice = append(areasSlice, map[string]any{
				"code":    areaMap["code"],
				"title":   areaMap["code"],
				"widgets": widgets,
			})
		}
	}
	if len(areasSlice) == 0 {
		switch rawAreas := payload["areas"].(type) {
		case []map[string]any:
			for _, area := range rawAreas {
				if normalizedArea, ok := normalizeTemplateValue(area).(map[string]any); ok {
					areasSlice = append(areasSlice, normalizedArea)
					continue
				}
				areasSlice = append(areasSlice, area)
			}
		case []any:
			for _, area := range rawAreas {
				areaMap, ok := normalizeTemplateValue(area).(map[string]any)
				if !ok {
					continue
				}
				areasSlice = append(areasSlice, areaMap)
			}
		}
	}
	sanitizeAreaWidgetSpans(areasSlice)

	basePath := ""
	if raw, ok := payload["base_path"].(string); ok {
		basePath = raw
	}

	layoutJSON, _ := json.Marshal(map[string]any{
		"areas":    areasSlice,
		"basePath": basePath,
	})

	view := baseTemplateContext(basePath, payload["title"])
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
	)
	view["areas"] = areasSlice
	view["base_path"] = basePath
	view["theme"] = payload["theme"]
	view["layout_json"] = string(layoutJSON)
	return view
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
				"data":       normalizeWidgetData(widget.Data),
				"config":     normalizeTemplateValue(widget.Config),
				"metadata":   normalizeTemplateValue(widget.Metadata),
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

	// Serialize layout as JSON for inline state
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

// widthFromMetadata extracts a grid width from go-dashboard widget metadata.
func widthFromMetadata(meta any) int {
	metaMap, ok := meta.(map[string]any)
	if !ok || metaMap == nil {
		return 0
	}
	if layout, ok := metaMap["layout"].(map[string]any); ok {
		if width := templateNumericToInt(layout["width"]); width > 0 {
			return width
		}
	}
	if width := templateNumericToInt(metaMap["width"]); width > 0 {
		return width
	}
	return 0
}

func normalizeSpan(span int) int {
	if span < 1 || span > 12 {
		return 12
	}
	return span
}

func sanitizeAreaWidgetSpans(areas []map[string]any) {
	for _, area := range areas {
		widgetsRaw, ok := area["widgets"]
		if !ok || widgetsRaw == nil {
			continue
		}
		switch widgets := widgetsRaw.(type) {
		case []map[string]any:
			for _, widget := range widgets {
				if widget == nil {
					continue
				}
				widget["span"] = normalizeSpan(resolveWidgetSpan(widget))
			}
		case []any:
			for idx, item := range widgets {
				widget, ok := item.(map[string]any)
				if !ok || widget == nil {
					continue
				}
				widget["span"] = normalizeSpan(resolveWidgetSpan(widget))
				widgets[idx] = widget
			}
			area["widgets"] = widgets
		}
	}
}

func resolveWidgetSpan(widget map[string]any) int {
	if widget == nil {
		return 12
	}
	if span := templateNumericToInt(widget["span"]); span > 0 {
		return span
	}
	if span := widthFromMetadata(widget["metadata"]); span > 0 {
		return span
	}
	return 12
}

func normalizeTemplateValue(value any) any {
	if value == nil {
		return nil
	}
	data, err := json.Marshal(value)
	if err != nil {
		return value
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()

	var normalized any
	if err := dec.Decode(&normalized); err != nil {
		return value
	}
	if err := ensureTemplateJSONEOF(dec); err != nil {
		return value
	}
	return normalizeTemplateNumbers(normalized)
}

func ensureTemplateJSONEOF(dec *json.Decoder) error {
	var trailing any
	err := dec.Decode(&trailing)
	if err == io.EOF {
		return nil
	}
	if err != nil {
		return err
	}
	return io.ErrUnexpectedEOF
}

func normalizeTemplateNumbers(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		for key, item := range typed {
			typed[key] = normalizeTemplateNumbers(item)
		}
		return typed
	case []any:
		for idx, item := range typed {
			typed[idx] = normalizeTemplateNumbers(item)
		}
		return typed
	case json.Number:
		raw := typed.String()
		if !strings.ContainsAny(raw, ".eE") {
			if n, err := typed.Int64(); err == nil {
				return n
			}
		}
		if n, err := typed.Float64(); err == nil {
			return n
		}
		return raw
	default:
		return value
	}
}

func templateNumericToInt(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case float32:
		return int(typed)
	case float64:
		return int(typed)
	case json.Number:
		if n, err := typed.Int64(); err == nil {
			return int(n)
		}
		if n, err := typed.Float64(); err == nil {
			return int(n)
		}
	case string:
		parsed, err := strconv.Atoi(strings.TrimSpace(typed))
		if err == nil {
			return parsed
		}
	}
	return 0
}

func normalizeWidgetData(value any) any {
	normalized := sanitizeWidgetTemplateValue(normalizeTemplateValue(value))
	return serializeWidgetTemplateContext(normalized)
}

func sanitizeWidgetTemplateValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		out := map[string]any{}
		for key, item := range typed {
			keyNorm := strings.ToLower(strings.TrimSpace(key))
			if keyNorm == "chart_html" || keyNorm == "chart_html_fragment" {
				continue
			}
			out[key] = sanitizeWidgetTemplateValue(item)
		}
		return out
	case []any:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, sanitizeWidgetTemplateValue(item))
		}
		return out
	case string:
		lowered := strings.ToLower(strings.TrimSpace(typed))
		if strings.Contains(lowered, "<script") ||
			strings.Contains(lowered, "<!doctype") ||
			strings.Contains(lowered, "<html") ||
			strings.Contains(lowered, "<head") ||
			strings.Contains(lowered, "<body") {
			return ""
		}
		return typed
	default:
		return value
	}
}

func serializeWidgetTemplateContext(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		serialized, err := router.SerializeAsContext(typed)
		if err != nil {
			out := map[string]any{}
			for key, item := range typed {
				out[key] = serializeWidgetTemplateContext(item)
			}
			return out
		}
		for key, item := range serialized {
			serialized[key] = serializeWidgetTemplateContext(item)
		}
		return serialized
	case []any:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, serializeWidgetTemplateContext(item))
		}
		return out
	default:
		return value
	}
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
			target[key] = normalizeTemplateValue(value)
		}
	}
}
