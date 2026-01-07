package client

import (
	"embed"
	"io/fs"
)

//go:embed assets
var embeddedAssets embed.FS

// Assets returns the embedded admin client assets filesystem.
func Assets() fs.FS {
	sub, err := fs.Sub(embeddedAssets, "assets")
	if err != nil {
		return embeddedAssets
	}
	return sub
}
