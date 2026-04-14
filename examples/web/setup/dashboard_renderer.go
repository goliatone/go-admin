package setup

import (
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
)

// NewDashboardRenderer creates a template-based dashboard renderer
func NewDashboardRenderer(opts ...quickstart.DashboardRendererOption) (admin.DashboardRenderer, error) {
	rendererOpts := []quickstart.DashboardRendererOption{
		quickstart.WithDashboardEmbeddedTemplates(false),
		quickstart.WithDashboardTemplatesFS(client.Templates()),
		quickstart.WithDashboardTemplateFuncOptions(helpers.TemplateFuncOptions()...),
	}
	rendererOpts = append(rendererOpts, opts...)
	return quickstart.NewDashboardTemplateRenderer(rendererOpts...)
}
