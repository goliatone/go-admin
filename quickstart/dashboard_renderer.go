package quickstart

import (
	"bytes"
	"fmt"
	"io"
	"io/fs"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	gotemplate "github.com/goliatone/go-template"
)

// DashboardRendererOption customizes the default dashboard renderer setup.
type DashboardRendererOption func(*dashboardRendererOptions)

type dashboardRendererOptions struct {
	templateFS  []fs.FS
	useEmbedded bool
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
	renderer, err := newDashboardTemplateRenderer(opts...)
	if err != nil {
		return err
	}
	dashboard.WithRenderer(renderer)
	return nil
}

type dashboardTemplateRenderer struct {
	renderer *gotemplate.Engine
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

	renderer, err := gotemplate.NewRenderer(
		gotemplate.WithFS(templateFS),
		gotemplate.WithExtension(".html"),
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

func normalizeDashboardTemplateData(data any) (map[string]any, error) {
	switch v := data.(type) {
	case *admin.DashboardLayout:
		return dashboardTemplateData(v), nil
	case admin.DashboardLayout:
		return dashboardTemplateData(&v), nil
	case map[string]any:
		return v, nil
	case nil:
		return map[string]any{}, nil
	default:
		return nil, fmt.Errorf("unsupported dashboard payload type: %T", data)
	}
}

func dashboardTemplateData(layout *admin.DashboardLayout) map[string]any {
	if layout == nil {
		return map[string]any{"title": "Dashboard"}
	}
	return map[string]any{
		"title":     "Dashboard",
		"areas":     layout.Areas,
		"theme":     layout.Theme,
		"metadata":  layout.Metadata,
		"base_path": layout.BasePath,
	}
}
