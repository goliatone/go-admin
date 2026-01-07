package quickstart

import (
	"embed"
	"io/fs"
)

//go:embed templates/dashboard_ssr.html
var dashboardTemplates embed.FS

// DashboardTemplatesFS returns the embedded dashboard templates filesystem.
func DashboardTemplatesFS() fs.FS {
	sub, err := fs.Sub(dashboardTemplates, "templates")
	if err != nil {
		return nil
	}
	return sub
}
