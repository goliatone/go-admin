package data

import (
	"embed"
	"io/fs"
)

//go:embed uischemas
var embeddedFS embed.FS

// UISchemas returns the embedded UI schema filesystem.
func UISchemas() fs.FS {
	sub, err := fs.Sub(embeddedFS, "uischemas")
	if err != nil {
		return embeddedFS
	}
	return sub
}
