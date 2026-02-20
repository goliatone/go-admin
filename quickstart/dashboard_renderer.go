package quickstart

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/internal/templateview"
	router "github.com/goliatone/go-router"
	gotemplate "github.com/goliatone/go-template"
)

// DashboardRendererOption customizes the default dashboard renderer setup.
type DashboardRendererOption func(*dashboardRendererOptions)

type dashboardRendererOptions struct {
	templateFS          []fs.FS
	useEmbedded         bool
	templateFuncs       map[string]any
	templateFuncOptions []TemplateFuncOption
}

// WithDashboardTemplatesFS appends a template filesystem to the renderer.
func WithDashboardTemplatesFS(fsys fs.FS) DashboardRendererOption {
	return func(opts *dashboardRendererOptions) {
		if opts == nil || fsys == nil {
			return
		}
		opts.templateFS = append(opts.templateFS, fsys)
	}
}

// WithDashboardEmbeddedTemplates toggles the embedded dashboard templates.
func WithDashboardEmbeddedTemplates(enabled bool) DashboardRendererOption {
	return func(opts *dashboardRendererOptions) {
		if opts == nil {
			return
		}
		opts.useEmbedded = enabled
	}
}

// WithDashboardTemplateFuncs overrides template functions used by the dashboard renderer.
func WithDashboardTemplateFuncs(funcs map[string]any) DashboardRendererOption {
	return func(opts *dashboardRendererOptions) {
		if opts == nil {
			return
		}
		opts.templateFuncs = cloneTemplateFuncMap(funcs)
	}
}

// WithDashboardTemplateFuncOptions configures quickstart.DefaultTemplateFuncs when
// no explicit template function map is provided.
func WithDashboardTemplateFuncOptions(options ...TemplateFuncOption) DashboardRendererOption {
	return func(opts *dashboardRendererOptions) {
		if opts == nil || len(options) == 0 {
			return
		}
		opts.templateFuncOptions = append(opts.templateFuncOptions, options...)
	}
}

// WithDefaultDashboardRenderer registers a basic dashboard SSR renderer when none is set.
func WithDefaultDashboardRenderer(adm *admin.Admin, viewEngine fiber.Views, cfg admin.Config, opts ...DashboardRendererOption) error {
	_ = viewEngine
	_ = cfg
	if adm == nil {
		return fmt.Errorf("admin is required")
	}
	dashboard := adm.Dashboard()
	if dashboard == nil {
		return fmt.Errorf("dashboard is required")
	}
	if dashboard.HasRenderer() {
		return nil
	}
	renderer, err := NewDashboardTemplateRenderer(opts...)
	if err != nil {
		return err
	}
	dashboard.WithRenderer(renderer)
	return nil
}

type dashboardTemplateRenderer struct {
	renderer *gotemplate.Engine
}

// NewDashboardTemplateRenderer builds the default dashboard SSR renderer.
func NewDashboardTemplateRenderer(opts ...DashboardRendererOption) (admin.DashboardRenderer, error) {
	return newDashboardTemplateRenderer(opts...)
}

func newDashboardTemplateRenderer(opts ...DashboardRendererOption) (*dashboardTemplateRenderer, error) {
	options := dashboardRendererOptions{
		useEmbedded: true,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	templateStack := append([]fs.FS{}, options.templateFS...)
	if options.useEmbedded {
		if embedded := DashboardTemplatesFS(); embedded != nil {
			templateStack = append(templateStack, embedded)
		}
	}

	templateFS := fallbackFSList(templateStack)
	if templateFS == nil {
		return nil, fmt.Errorf("dashboard templates are required")
	}

	templateFuncs := options.templateFuncs
	if templateFuncs == nil {
		templateFuncs = DefaultTemplateFuncs(options.templateFuncOptions...)
	}

	renderer, err := gotemplate.NewRenderer(
		gotemplate.WithFS(templateFS),
		gotemplate.WithExtension(".html"),
		gotemplate.WithTemplateFunc(templateFuncs),
	)
	if err != nil {
		return nil, err
	}
	return &dashboardTemplateRenderer{renderer: renderer}, nil
}

// Render renders the dashboard template with the provided data.
func (r *dashboardTemplateRenderer) Render(name string, data any, out ...io.Writer) (string, error) {
	if r == nil || r.renderer == nil {
		return "", fmt.Errorf("dashboard renderer not initialized")
	}
	templateName := strings.TrimSpace(name)
	if templateName == "" {
		templateName = "dashboard_ssr.html"
	}
	normalized, err := normalizeDashboardTemplateData(data)
	if err != nil {
		return "", err
	}
	html, err := r.renderer.Render(templateName, normalized)
	if err != nil {
		return "", err
	}
	if len(out) > 0 && out[0] != nil {
		_, _ = io.Copy(out[0], bytes.NewBufferString(html))
	}
	return html, nil
}

// RenderLayout keeps legacy callers compatible with the default template.
func (r *dashboardTemplateRenderer) RenderLayout(layout *admin.DashboardLayout) (string, error) {
	return r.Render("dashboard_ssr.html", layout)
}

func normalizeDashboardTemplateData(data any) (map[string]any, error) {
	renderer := &dashboardTemplateRenderer{}
	normalized, err := renderer.normalizeData(data)
	if err != nil {
		return nil, err
	}
	serialized, err := router.SerializeAsContext(normalized)
	if err != nil {
		return nil, fmt.Errorf("serialize dashboard template context: %w", err)
	}
	templateview.NormalizeContextNumbers(serialized)
	return serialized, nil
}

func (r *dashboardTemplateRenderer) normalizeData(data any) (map[string]any, error) {
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

func (r *dashboardTemplateRenderer) buildTemplateData(layout *admin.DashboardLayout) map[string]any {
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

func cloneTemplateFuncMap(src map[string]any) map[string]any {
	if src == nil {
		return nil
	}
	out := make(map[string]any, len(src))
	for key, value := range src {
		out[key] = value
	}
	return out
}
