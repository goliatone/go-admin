package setup

import (
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/examples/web/renderers"
)

// NewDashboardRenderer creates a template-based dashboard renderer
func NewDashboardRenderer() (admin.DashboardRenderer, error) {
	// Pass the templates directory (go-template expects a directory, not a file)
	tmplDir := "templates"
	return renderers.NewTemplateRenderer(tmplDir)
}
