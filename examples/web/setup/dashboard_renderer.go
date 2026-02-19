package setup

import (
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
)

// NewDashboardRenderer creates a template-based dashboard renderer
func NewDashboardRenderer() (admin.DashboardRenderer, error) {
	return quickstart.NewDashboardTemplateRenderer(
		quickstart.WithDashboardEmbeddedTemplates(false),
		quickstart.WithDashboardTemplatesFS(client.Templates()),
		quickstart.WithDashboardTemplateFuncOptions(helpers.TemplateFuncOptions()...),
	)
}
