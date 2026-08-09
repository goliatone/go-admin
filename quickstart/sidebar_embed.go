package quickstart

import (
	"embed"
	"io/fs"
)

//go:embed templates/partials/sidebar.html assets/sidebar-state.js assets/sidebar.js assets/sidebar.css
var sidebarFS embed.FS

// SidebarTemplatesFS returns the embedded sidebar templates (partials/sidebar.html).
func SidebarTemplatesFS() fs.FS {
	sub, err := fs.Sub(sidebarFS, "templates")
	if err != nil {
		return nil
	}
	return sub
}

// SidebarAssetsFS returns the embedded sidebar assets (sidebar-state.js,
// sidebar.js, and sidebar.css).
func SidebarAssetsFS() fs.FS {
	sub, err := fs.Sub(sidebarFS, "assets")
	if err != nil {
		return nil
	}
	return sub
}
