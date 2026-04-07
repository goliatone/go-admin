package quickstart

import (
	"bytes"
	"fmt"
	"io"
	"io/fs"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/internal/templateview"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
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

// RenderPage renders the dashboard template with the typed admin wrapper.
func (r *dashboardTemplateRenderer) RenderPage(name string, page admin.AdminDashboardPage, out ...io.Writer) (string, error) {
	if r == nil || r.renderer == nil {
		return "", fmt.Errorf("dashboard renderer not initialized")
	}
	templateName := strings.TrimSpace(name)
	if templateName == "" {
		templateName = "dashboard_ssr.html"
	}
	normalized, err := normalizeDashboardTemplateData(page)
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

// NormalizeDashboardTemplateData converts a typed go-dashboard page or typed
// admin host wrapper into the serialized template context used by the default
// dashboard renderer.
func NormalizeDashboardTemplateData(data any) (map[string]any, error) {
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

func normalizeDashboardTemplateData(data any) (map[string]any, error) {
	return NormalizeDashboardTemplateData(data)
}

func (r *dashboardTemplateRenderer) normalizeData(data any) (map[string]any, error) {
	switch v := data.(type) {
	case *admin.AdminDashboardPage:
		if v == nil {
			return r.buildTemplateData(admin.AdminDashboardPage{}), nil
		}
		return r.buildTemplateData(*v), nil
	case admin.AdminDashboardPage:
		return r.buildTemplateData(v), nil
	case *dashcmp.Page:
		if v == nil {
			return r.buildTemplateData(admin.AdminDashboardPage{}), nil
		}
		return r.buildTemplateData(admin.ComposeAdminDashboardPage(*v)), nil
	case dashcmp.Page:
		return r.buildTemplateData(admin.ComposeAdminDashboardPage(v)), nil
	case nil:
		return r.buildTemplateData(admin.AdminDashboardPage{}), nil
	default:
		return nil, fmt.Errorf("unsupported dashboard payload type: %T", data)
	}
}

func (r *dashboardTemplateRenderer) buildTemplateData(page admin.AdminDashboardPage) map[string]any {
	if len(page.Dashboard.Areas) == 0 && page.Chrome.Empty() {
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

	areas := make([]map[string]any, 0, len(page.Dashboard.Areas))
	for _, area := range page.Dashboard.Areas {
		widgets := make([]map[string]any, 0, len(area.Widgets))
		for _, widget := range area.Widgets {
			widgets = append(widgets, map[string]any{
				"id":         widget.ID,
				"definition": widget.Definition,
				"name":       widget.Name,
				"template":   widget.Template,
				"area":       widget.Area,
				"data":       widget.Data,
				"config":     widget.Config,
				"meta":       widget.Meta,
				"hidden":     widget.Hidden,
				"span":       normalizeSpan(widget.Span),
			})
		}
		areas = append(areas, map[string]any{
			"slot":    area.Slot,
			"code":    area.Code,
			"title":   area.Title,
			"widgets": widgets,
		})
	}

	view := baseTemplateContext(page.Chrome.BasePath, page.Title())
	overlayOptionalContext(view, map[string]any{
		"asset_base_path":          page.Chrome.AssetBasePath,
		"api_base_path":            page.Chrome.APIBasePath,
		"body_classes":             page.Chrome.BodyClasses,
		"nav_items":                page.Chrome.NavItems,
		"nav_utility_items":        page.Chrome.NavUtilityItems,
		"nav_debug":                page.Chrome.NavDebug,
		"nav_items_json":           page.Chrome.NavItemsJSON,
		"session_user":             page.Chrome.SessionUser,
		"theme":                    page.Chrome.Theme,
		"translation_capabilities": page.Chrome.TranslationCapabilities,
		"users_import_available":   page.Chrome.UsersImportAvailable,
		"users_import_enabled":     page.Chrome.UsersImportEnabled,
		"locale":                   page.Dashboard.Locale,
	}, "asset_base_path",
		"api_base_path",
		"body_classes",
		"nav_items",
		"nav_utility_items",
		"nav_debug",
		"nav_items_json",
		"session_user",
		"theme",
		"translation_capabilities",
		"users_import_available",
		"users_import_enabled",
		"locale",
	)
	view["areas"] = areas
	view["base_path"] = page.Chrome.BasePath
	view["layout_json"] = page.LayoutJSON()
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
