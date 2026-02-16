package quickstart

import (
	"fmt"
	"io/fs"

	"github.com/gofiber/fiber/v2"
	fggate "github.com/goliatone/go-featuregate/gate"
	fgtemplates "github.com/goliatone/go-featuregate/templates"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

// ViewEngineOption customizes the view engine config.
type ViewEngineOption func(*viewEngineOptions)

type viewEngineOptions struct {
	templateFS           []fs.FS
	assetsFS             []fs.FS
	templateFuncs        map[string]any
	featureGate          fggate.FeatureGate
	featureHelperOptions []fgtemplates.HelperOption
	reload               bool
	debug                bool
	embed                bool
	ext                  string
	urlPrefix            string
	basePath             string
	urls                 urlkit.Resolver
}

// WithViewTemplatesFS appends template fallbacks.
func WithViewTemplatesFS(fsys ...fs.FS) ViewEngineOption {
	return func(opts *viewEngineOptions) {
		if opts == nil || len(fsys) == 0 {
			return
		}
		opts.templateFS = append(opts.templateFS, fsys...)
	}
}

// WithViewAssetsFS appends asset fallbacks.
func WithViewAssetsFS(fsys ...fs.FS) ViewEngineOption {
	return func(opts *viewEngineOptions) {
		if opts == nil || len(fsys) == 0 {
			return
		}
		opts.assetsFS = append(opts.assetsFS, fsys...)
	}
}

// WithViewTemplateFuncs overrides template functions.
func WithViewTemplateFuncs(funcs map[string]any) ViewEngineOption {
	return func(opts *viewEngineOptions) {
		if opts == nil {
			return
		}
		opts.templateFuncs = funcs
	}
}

// WithViewFeatureGate registers feature template helpers using the provided gate.
func WithViewFeatureGate(gate fggate.FeatureGate, helperOpts ...fgtemplates.HelperOption) ViewEngineOption {
	return func(opts *viewEngineOptions) {
		if opts == nil {
			return
		}
		opts.featureGate = gate
		if len(helperOpts) > 0 {
			opts.featureHelperOptions = append(opts.featureHelperOptions, helperOpts...)
		}
	}
}

// WithViewReload toggles template reload behavior.
func WithViewReload(enabled bool) ViewEngineOption {
	return func(opts *viewEngineOptions) {
		if opts == nil {
			return
		}
		opts.reload = enabled
	}
}

// WithViewDebug toggles view engine debug mode.
func WithViewDebug(enabled bool) ViewEngineOption {
	return func(opts *viewEngineOptions) {
		if opts == nil {
			return
		}
		opts.debug = enabled
	}
}

// WithViewEmbed toggles embedded filesystem usage.
func WithViewEmbed(enabled bool) ViewEngineOption {
	return func(opts *viewEngineOptions) {
		if opts == nil {
			return
		}
		opts.embed = enabled
	}
}

// WithViewExt sets the template extension.
func WithViewExt(ext string) ViewEngineOption {
	return func(opts *viewEngineOptions) {
		if opts == nil {
			return
		}
		opts.ext = ext
	}
}

// WithViewURLPrefix sets the assets URL prefix.
func WithViewURLPrefix(prefix string) ViewEngineOption {
	return func(opts *viewEngineOptions) {
		if opts == nil {
			return
		}
		opts.urlPrefix = prefix
	}
}

// WithViewBasePath sets the fallback admin base path used by template helpers (adminURL).
func WithViewBasePath(basePath string) ViewEngineOption {
	return func(opts *viewEngineOptions) {
		if opts == nil {
			return
		}
		opts.basePath = basePath
	}
}

// WithViewURLResolver sets the URLKit resolver used by template helpers.
func WithViewURLResolver(urls urlkit.Resolver) ViewEngineOption {
	return func(opts *viewEngineOptions) {
		if opts == nil || urls == nil {
			return
		}
		opts.urls = urls
	}
}

// NewViewEngine builds a view engine with quickstart sidebar fallbacks.
func NewViewEngine(baseFS fs.FS, opts ...ViewEngineOption) (fiber.Views, error) {
	cfg, err := newViewEngineConfig(baseFS, opts...)
	if err != nil {
		return nil, err
	}
	return router.InitializeViewEngine(cfg)
}

type viewEngineConfig struct {
	templateFS    []fs.FS
	assetsFS      fs.FS
	dirFS         string
	assetsDir     string
	templateFuncs map[string]any
	reload        bool
	debug         bool
	embed         bool
	ext           string
	urlPrefix     string
}

func newViewEngineConfig(baseFS fs.FS, opts ...ViewEngineOption) (*viewEngineConfig, error) {
	if baseFS == nil {
		return nil, fmt.Errorf("view engine requires a base filesystem")
	}
	registerTemplateFilterAliases()

	options := viewEngineOptions{
		reload: true,
		debug:  false,
		embed:  true,
		ext:    ".html",
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	if options.templateFuncs == nil {
		options.templateFuncs = DefaultTemplateFuncs(
			WithTemplateBasePath(options.basePath),
			WithTemplateURLResolver(options.urls),
			WithTemplateFeatureGate(options.featureGate, options.featureHelperOptions...),
		)
	}

	templateFS := normalizeTemplatesFS(baseFS)
	dirFS := "."

	assetsFS := baseFS
	assetsDir := "assets"
	if sub, err := fs.Sub(baseFS, "assets"); err == nil {
		assetsFS = sub
		assetsDir = "."
	}

	templateStack := []fs.FS{templateFS}
	for _, fsys := range options.templateFS {
		templateStack = append(templateStack, normalizeTemplatesFS(fsys))
	}
	if qsTemplates := SidebarTemplatesFS(); qsTemplates != nil {
		templateStack = append(templateStack, qsTemplates)
	}

	assetStack := []fs.FS{assetsFS}
	assetStack = append(assetStack, options.assetsFS...)
	if qsAssets := SidebarAssetsFS(); qsAssets != nil {
		assetStack = append(assetStack, qsAssets)
	}

	return &viewEngineConfig{
		templateFS:    templateStack,
		assetsFS:      fallbackFSList(assetStack),
		dirFS:         dirFS,
		assetsDir:     assetsDir,
		templateFuncs: options.templateFuncs,
		reload:        options.reload,
		debug:         options.debug,
		embed:         options.embed,
		ext:           options.ext,
		urlPrefix:     options.urlPrefix,
	}, nil
}

func (c *viewEngineConfig) GetReload() bool { return c.reload }
func (c *viewEngineConfig) GetDebug() bool  { return c.debug }
func (c *viewEngineConfig) GetEmbed() bool  { return c.embed }
func (c *viewEngineConfig) GetCSSPath() string {
	return ""
}
func (c *viewEngineConfig) GetJSPath() string {
	return ""
}
func (c *viewEngineConfig) GetDirFS() string { return c.dirFS }
func (c *viewEngineConfig) GetDirOS() string { return "" }
func (c *viewEngineConfig) GetURLPrefix() string {
	return c.urlPrefix
}
func (c *viewEngineConfig) GetTemplateFunctions() map[string]any {
	return c.templateFuncs
}
func (c *viewEngineConfig) GetExt() string { return c.ext }
func (c *viewEngineConfig) GetAssetsFS() fs.FS {
	return c.assetsFS
}
func (c *viewEngineConfig) GetAssetsDir() string { return c.assetsDir }
func (c *viewEngineConfig) GetTemplatesFS() []fs.FS {
	return c.templateFS
}
func (c *viewEngineConfig) GetDevDir() string { return "" }

func normalizeTemplatesFS(fsys fs.FS) fs.FS {
	if fsys == nil {
		return nil
	}
	info, err := fs.Stat(fsys, "templates")
	if err != nil || !info.IsDir() {
		return fsys
	}
	sub, err := fs.Sub(fsys, "templates")
	if err != nil {
		return fsys
	}
	return sub
}
