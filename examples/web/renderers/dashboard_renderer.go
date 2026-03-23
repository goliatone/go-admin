package renderers

import (
	"fmt"
	"io"
	"io/fs"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
)

// TemplateRenderer delegates dashboard rendering to the shared quickstart renderer.
type TemplateRenderer struct {
	renderer admin.DashboardRenderer
}

// NewTemplateRenderer creates a renderer with Pongo2 templates.
func NewTemplateRenderer(templatesFS fs.FS) (*TemplateRenderer, error) {
	if templatesFS == nil {
		return nil, fmt.Errorf("templates filesystem is required")
	}
	renderer, err := quickstart.NewDashboardTemplateRenderer(
		quickstart.WithDashboardEmbeddedTemplates(false),
		quickstart.WithDashboardTemplatesFS(templatesFS),
		quickstart.WithDashboardTemplateFuncOptions(helpers.TemplateFuncOptions()...),
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
	return r.renderer.Render(name, data, out...)
}

func (r *TemplateRenderer) normalizeData(data any) (map[string]any, error) {
	return quickstart.NormalizeDashboardTemplateData(data)
}
