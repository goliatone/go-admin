package client

import (
	"strings"

	router "github.com/goliatone/go-router"
)

// RegisterAssets serves the embedded assets at the provided base path.
func RegisterAssets[T any](r router.Router[T], basePath string) {
	if r == nil {
		return
	}
	basePath = strings.TrimSpace(basePath)
	if basePath == "" {
		basePath = "/admin/assets"
	}
	r.Static(basePath, ".", router.Static{FS: Assets(), Root: "."})
}
