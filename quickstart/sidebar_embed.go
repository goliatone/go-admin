package quickstart

import (
	"embed"
	"io/fs"

	"github.com/goliatone/go-admin/pkg/client"
)

//go:embed assets/sidebar-state.js assets/sidebar.js assets/sidebar.css
var sidebarFS embed.FS

// SidebarTemplatesFS returns the packaged canonical admin templates. It remains
// as a quickstart fallback so hosts with an isolated template filesystem still
// receive the complete authenticated shell without maintaining a second copy.
func SidebarTemplatesFS() fs.FS {
	return client.Templates()
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
