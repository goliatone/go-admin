package helpers

import (
	"embed"
	"io/fs"
	"log"
)

// WebViewConfig implements the ViewConfig interface for the go-router view engine
type WebViewConfig struct {
	templateFS []fs.FS
	assetsFS   fs.FS
	dirFS      string
	assetsDir  string
}

// NewWebViewConfig creates a new WebViewConfig from an embedded filesystem
func NewWebViewConfig(embedded fs.FS) *WebViewConfig {
	cfg := &WebViewConfig{
		templateFS: []fs.FS{embedded},
		assetsFS:   embedded,
		dirFS:      "templates",
		assetsDir:  "assets",
	}

	if sub, err := fs.Sub(embedded, "templates"); err == nil {
		cfg.templateFS = []fs.FS{sub}
		cfg.dirFS = "."
	}

	if sub, err := fs.Sub(embedded, "assets"); err == nil {
		cfg.assetsFS = sub
		cfg.assetsDir = "."
	}

	return cfg
}

// AddTemplatesFS appends an additional templates filesystem (used as fallback).
func (c *WebViewConfig) AddTemplatesFS(fsys fs.FS) {
	if fsys == nil {
		return
	}
	c.templateFS = append(c.templateFS, fsys)
}

// AddAssetsFS prepends an additional assets filesystem (allows overrides/fallbacks).
func (c *WebViewConfig) AddAssetsFS(fsys fs.FS) {
	if fsys == nil {
		return
	}
	c.assetsFS = WithFallbackFS(fsys, c.assetsFS)
}

// GetReload returns whether to reload templates on each request
func (c *WebViewConfig) GetReload() bool { return true }

// GetDebug returns whether debug mode is enabled
func (c *WebViewConfig) GetDebug() bool { return true }

// GetEmbed returns whether to use embedded filesystem
func (c *WebViewConfig) GetEmbed() bool { return true }

// GetCSSPath returns the CSS assets path
func (c *WebViewConfig) GetCSSPath() string { return "" }

// GetJSPath returns the JS assets path
func (c *WebViewConfig) GetJSPath() string { return "" }

// GetDirFS returns the templates directory path in the filesystem
func (c *WebViewConfig) GetDirFS() string { return c.dirFS }

// GetDirOS returns the templates directory path on OS filesystem (empty for embedded)
func (c *WebViewConfig) GetDirOS() string { return "" }

// GetURLPrefix returns the URL prefix for assets
func (c *WebViewConfig) GetURLPrefix() string { return "" }

// GetTemplateFunctions returns custom template functions
func (c *WebViewConfig) GetTemplateFunctions() map[string]any { return nil }

// GetExt returns the template file extension
func (c *WebViewConfig) GetExt() string { return ".html" }

// GetAssetsFS returns the assets filesystem
func (c *WebViewConfig) GetAssetsFS() fs.FS { return c.assetsFS }

// GetAssetsDir returns the assets directory path
func (c *WebViewConfig) GetAssetsDir() string { return c.assetsDir }

// GetTemplatesFS returns the template filesystems
func (c *WebViewConfig) GetTemplatesFS() []fs.FS { return c.templateFS }

// GetDevDir returns the development directory (empty for embedded)
func (c *WebViewConfig) GetDevDir() string { return "" }

// MustSubFS returns a sub-FS or nil without failing the example
func MustSubFS(fsys embed.FS, dir string) fs.FS {
	sub, err := fs.Sub(fsys, dir)
	if err != nil {
		log.Printf("failed to access %s: %v", dir, err)
		return nil
	}
	return sub
}

// MultiFS tries each filesystem in order until one succeeds.
type MultiFS []fs.FS

// Open implements fs.FS to provide fallback resolution.
func (m MultiFS) Open(name string) (fs.File, error) {
	var lastErr error
	for _, f := range m {
		if f == nil {
			continue
		}
		file, err := f.Open(name)
		if err == nil {
			return file, nil
		}
		lastErr = err
	}
	if lastErr == nil {
		lastErr = fs.ErrNotExist
	}
	return nil, lastErr
}

// WithFallbackFS builds a MultiFS preferring the primary FS first.
func WithFallbackFS(primary fs.FS, fallbacks ...fs.FS) fs.FS {
	fsList := []fs.FS{}
	fsList = append(fsList, extractFS(primary)...)
	for _, f := range fallbacks {
		fsList = append(fsList, extractFS(f)...)
	}
	return MultiFS(fsList)
}

func extractFS(f fs.FS) []fs.FS {
	if f == nil {
		return nil
	}
	if m, ok := f.(MultiFS); ok {
		return []fs.FS(m)
	}
	return []fs.FS{f}
}
