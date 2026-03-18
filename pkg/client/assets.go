package client

import (
	"bytes"
	"embed"
	"errors"
	"io/fs"
	"path"
	"strings"
	"time"
)

// Embed runtime assets only. Exclude frontend dev/test trees (e.g. assets/tests, assets/node_modules)
// so local frontend edits cannot break Go builds with copy length mismatches.
//
// Embed source files required to synthesize copied runtime assets when dist artifacts
// are missing from a clean checkout.
//
//go:embed assets/dist assets/uploads assets/*.css assets/*.js assets/*.svg assets/src/styles assets/src/site assets/src/datatable templates openapi
var embeddedClient embed.FS

var assetAliasPaths = map[string]string{
	"dist/output.css":                   "output.css",
	"dist/runtime/site-runtime.js":      "src/site/site-runtime.js",
	"dist/styles/activity.css":          "src/styles/activity.css",
	"dist/styles/datatable-actions.css": "src/datatable/actions.css",
	"dist/styles/error-page.css":        "src/styles/error-page.css",
	"dist/styles/export.css":            "src/styles/export.css",
	"dist/styles/site-runtime.css":      "src/styles/site-runtime.css",
	"dist/styles/widgets.css":           "src/styles/widgets.css",
}

var assetContentBuilders = map[string]func(fs.FS) ([]byte, error){
	"dist/styles/debug.css": func(base fs.FS) ([]byte, error) {
		parts := []string{
			"src/styles/debug/console.css",
			"src/styles/debug/prism-catppuccin.css",
			"src/styles/debug/expandable-rows.css",
		}
		return concatEmbeddedFiles(base, parts...)
	},
}

type assetFS struct {
	base fs.FS
}

type virtualFile struct {
	*bytes.Reader
	info virtualFileInfo
}

type virtualFileInfo struct {
	name string
	size int64
}

func newAssetsFS(base fs.FS) fs.FS {
	return assetFS{base: base}
}

func concatEmbeddedFiles(base fs.FS, names ...string) ([]byte, error) {
	if len(names) == 0 {
		return nil, nil
	}

	var content bytes.Buffer
	for i, name := range names {
		data, err := fs.ReadFile(base, name)
		if err != nil {
			return nil, err
		}
		if i > 0 {
			content.WriteByte('\n')
		}
		content.Write(data)
	}

	return content.Bytes(), nil
}

func (a assetFS) Open(name string) (fs.File, error) {
	name = normalizeAssetPath(name)

	file, err := a.base.Open(name)
	if err == nil {
		return file, nil
	}
	if !errors.Is(err, fs.ErrNotExist) {
		return nil, err
	}

	if alias, ok := assetAliasPaths[name]; ok {
		return a.base.Open(alias)
	}
	if build, ok := assetContentBuilders[name]; ok {
		content, buildErr := build(a.base)
		if buildErr != nil {
			return nil, buildErr
		}
		return newVirtualFile(name, content), nil
	}

	return nil, err
}

func normalizeAssetPath(name string) string {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return "."
	}
	return strings.TrimPrefix(path.Clean(trimmed), "/")
}

func newVirtualFile(name string, content []byte) fs.File {
	return &virtualFile{
		Reader: bytes.NewReader(content),
		info: virtualFileInfo{
			name: name,
			size: int64(len(content)),
		},
	}
}

func (f *virtualFile) Stat() (fs.FileInfo, error) {
	return f.info, nil
}

func (f *virtualFile) Close() error {
	return nil
}

func (i virtualFileInfo) Name() string {
	return path.Base(i.name)
}

func (i virtualFileInfo) Size() int64 {
	return i.size
}

func (i virtualFileInfo) Mode() fs.FileMode {
	return 0o444
}

func (i virtualFileInfo) ModTime() time.Time {
	return time.Time{}
}

func (i virtualFileInfo) IsDir() bool {
	return false
}

func (i virtualFileInfo) Sys() any {
	return nil
}

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
	return newAssetsFS(sub)
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
