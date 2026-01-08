package setup

import (
	"github.com/goliatone/go-admin/examples/web/renderers"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/pkg/client"
)

// NewDashboardRenderer creates a template-based dashboard renderer
func NewDashboardRenderer() (admin.DashboardRenderer, error) {
	return renderers.NewTemplateRenderer(client.Templates())
}
