package quickstart

import (
	"io/fs"
	"net/http"
	"os"
	"path"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	dashboardcmp "github.com/goliatone/go-dashboard/components/dashboard"
	formgen "github.com/goliatone/go-formgen"
	formgenvanilla "github.com/goliatone/go-formgen/pkg/renderers/vanilla"
	router "github.com/goliatone/go-router"
)

// StaticAssetsOption customizes the asset mounting behavior.
type StaticAssetsOption func(*staticAssetsOptions)

type staticAssetsOptions struct {
	diskAssetsDir string
	diskAssetsFS  fs.FS
	extraAssetsFS []fs.FS
	assetsPrefix  string
	formgenPrefix string
	runtimePrefix string
	echartsPrefix string
	sidebarAssets fs.FS
}

// WithDiskAssetsDir configures a disk-backed asset directory (for dev overrides).
func WithDiskAssetsDir(dir string) StaticAssetsOption {
	return func(opts *staticAssetsOptions) {
		if opts == nil {
			return
		}
		opts.diskAssetsDir = strings.TrimSpace(dir)
	}
}

// WithDiskAssetsFS supplies a disk asset filesystem directly.
func WithDiskAssetsFS(fsys fs.FS) StaticAssetsOption {
	return func(opts *staticAssetsOptions) {
		if opts == nil {
			return
		}
		opts.diskAssetsFS = fsys
	}
}

// WithExtraAssetsFS appends additional asset fallbacks.
func WithExtraAssetsFS(fsys ...fs.FS) StaticAssetsOption {
	return func(opts *staticAssetsOptions) {
		if opts == nil || len(fsys) == 0 {
			return
		}
		opts.extraAssetsFS = append(opts.extraAssetsFS, fsys...)
	}
}

// WithAssetsPrefix overrides the base assets route prefix.
func WithAssetsPrefix(prefix string) StaticAssetsOption {
	return func(opts *staticAssetsOptions) {
		if opts == nil {
			return
		}
		opts.assetsPrefix = strings.TrimSpace(prefix)
	}
}

// WithFormgenPrefix overrides the formgen assets route prefix.
func WithFormgenPrefix(prefix string) StaticAssetsOption {
	return func(opts *staticAssetsOptions) {
		if opts == nil {
			return
		}
		opts.formgenPrefix = strings.TrimSpace(prefix)
	}
}

// WithRuntimePrefix overrides the formgen runtime route prefix.
func WithRuntimePrefix(prefix string) StaticAssetsOption {
	return func(opts *staticAssetsOptions) {
		if opts == nil {
			return
		}
		opts.runtimePrefix = strings.TrimSpace(prefix)
	}
}

// WithEChartsPrefix overrides the go-dashboard ECharts assets prefix.
func WithEChartsPrefix(prefix string) StaticAssetsOption {
	return func(opts *staticAssetsOptions) {
		if opts == nil {
			return
		}
		opts.echartsPrefix = strings.TrimSpace(prefix)
	}
}

// WithSidebarAssetsFS overrides the default quickstart sidebar assets.
func WithSidebarAssetsFS(fsys fs.FS) StaticAssetsOption {
	return func(opts *staticAssetsOptions) {
		if opts == nil {
			return
		}
		opts.sidebarAssets = fsys
	}
}

// NewStaticAssets registers static asset routes with quickstart defaults.
func NewStaticAssets(r router.Router[*fiber.App], cfg admin.Config, assetsFS fs.FS, opts ...StaticAssetsOption) {
	if r == nil {
		return
	}

	options := staticAssetsOptions{
		assetsPrefix:  path.Join(cfg.BasePath, "assets"),
		formgenPrefix: path.Join(cfg.BasePath, "formgen"),
		runtimePrefix: path.Join(cfg.BasePath, "runtime"),
		echartsPrefix: strings.TrimSuffix(dashboardcmp.DefaultEChartsAssetsPath, "/"),
		sidebarAssets: SidebarAssetsFS(),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	if options.diskAssetsFS == nil && options.diskAssetsDir != "" {
		if _, err := os.Stat(options.diskAssetsDir); err == nil {
			options.diskAssetsFS = os.DirFS(options.diskAssetsDir)
		}
	}

	assetStack := []fs.FS{}
	if options.diskAssetsFS != nil {
		assetStack = append(assetStack, resolveAssetsFS(options.diskAssetsFS))
	}
	if assetsFS != nil {
		assetStack = append(assetStack, resolveAssetsFS(assetsFS))
	}
	assetStack = append(assetStack, options.extraAssetsFS...)
	if options.sidebarAssets != nil {
		assetStack = append(assetStack, options.sidebarAssets)
	}
	staticFS := fallbackFSList(assetStack)
	if staticFS != nil && options.assetsPrefix != "" {
		r.Static(options.assetsPrefix, ".", router.Static{
			FS:   staticFS,
			Root: ".",
		})
	}

	if options.runtimePrefix != "" {
		r.Static(options.runtimePrefix, ".", router.Static{
			FS:   formgen.RuntimeAssetsFS(),
			Root: ".",
		})
		// go-formgen injects the relationships runtime at "/runtime/..." by default.
		// Keep a root alias so forms work even when the admin is served under a base path.
		if needsRuntimeRootAlias(options.runtimePrefix) {
			r.Static("/runtime", ".", router.Static{
				FS:   formgen.RuntimeAssetsFS(),
				Root: ".",
			})
		}
	}

	if options.formgenPrefix != "" {
		r.Static(options.formgenPrefix, ".", router.Static{
			FS:   formgenvanilla.AssetsFS(),
			Root: ".",
		})
	}

	if options.echartsPrefix != "" {
		r.Static(options.echartsPrefix, ".", router.Static{
			FS:   httpFSAdapter{fs: dashboardcmp.EChartsAssetsFS()},
			Root: ".",
		})
	}
}

func needsRuntimeRootAlias(prefix string) bool {
	trimmed := strings.TrimSpace(prefix)
	if trimmed == "" {
		return false
	}
	trimmed = strings.TrimSuffix(trimmed, "/")
	trimmed = strings.TrimPrefix(trimmed, "/")
	return trimmed != "runtime"
}

func resolveAssetsFS(base fs.FS) fs.FS {
	if base == nil {
		return nil
	}
	if assetRootHasMarker(base) {
		return base
	}
	if sub, err := fs.Sub(base, "assets"); err == nil {
		return sub
	}
	return base
}

func assetRootHasMarker(base fs.FS) bool {
	if base == nil {
		return false
	}
	if _, err := fs.Stat(base, "output.css"); err == nil {
		return true
	}
	if _, err := fs.Stat(base, path.Join("dist", "output.css")); err == nil {
		return true
	}
	return false
}

// httpFSAdapter wraps an http.FileSystem to satisfy fs.FS for go-router static handlers.
type httpFSAdapter struct{ fs http.FileSystem }

func (h httpFSAdapter) Open(name string) (fs.File, error) {
	return h.fs.Open(name)
}
