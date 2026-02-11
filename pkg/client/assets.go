package client

import (
	"embed"
	"io/fs"
)

// Embed runtime assets only. Exclude frontend dev/test trees (e.g. assets/tests, assets/node_modules)
// so local frontend edits cannot break Go builds with copy length mismatches.
//
//go:embed assets/dist assets/uploads assets/*.css assets/*.js assets/*.svg templates openapi
var embeddedClient embed.FS

// FS returns the embedded client filesystem (assets + templates).
func FS() fs.FS {
	return embeddedClient
}

// Assets returns the embedded admin client assets filesystem.
func Assets() fs.FS {
	sub, err := fs.Sub(embeddedClient, "assets")
	if err != nil {
		return embeddedClient
	}
	return sub
}

// Templates returns the embedded admin client templates filesystem.
func Templates() fs.FS {
	sub, err := fs.Sub(embeddedClient, "templates")
	if err != nil {
		return embeddedClient
	}
	return sub
}

// OpenAPI returns the embedded OpenAPI filesystem (OpenAPI specs + UI schema).
func OpenAPI() fs.FS {
	sub, err := fs.Sub(embeddedClient, "openapi")
	if err != nil {
		return embeddedClient
	}
	return sub
}
