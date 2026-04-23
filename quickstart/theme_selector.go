package quickstart

import (
	"fmt"
	"maps"
	"strings"

	theme "github.com/goliatone/go-theme"
)

// ThemeOption customizes the default theme manifest/registry.
type ThemeOption func(*themeOptions)

type themeOptions struct {
	registry     theme.Registry
	manifest     *theme.Manifest
	assetsPrefix string
	assetsFiles  map[string]string
	variants     map[string]theme.Variant
}

// WithThemeRegistry supplies a registry for theme registration.
func WithThemeRegistry(registry theme.Registry) ThemeOption {
	return func(opts *themeOptions) {
		if opts == nil {
			return
		}
		opts.registry = registry
	}
}

// WithThemeManifest overrides the default manifest entirely.
func WithThemeManifest(manifest *theme.Manifest) ThemeOption {
	return func(opts *themeOptions) {
		if opts == nil {
			return
		}
		opts.manifest = manifest
	}
}

// WithThemeAssets configures manifest asset files plus an optional manifest asset prefix.
// Use this for go-theme manifests/selectors; for final config-level URL overrides, use
// admin.Config.ThemeAssets or quickstart.WithThemeAssetURLs.
func WithThemeAssets(prefix string, files map[string]string) ThemeOption {
	return func(opts *themeOptions) {
		if opts == nil {
			return
		}
		opts.assetsPrefix = strings.TrimSpace(prefix)
		opts.assetsFiles = cloneStringMap(files)
	}
}

// WithThemeVariants overrides the default variant definitions.
func WithThemeVariants(variants map[string]theme.Variant) ThemeOption {
	return func(opts *themeOptions) {
		if opts == nil {
			return
		}
		opts.variants = variants
	}
}

// NewThemeSelector registers a default theme manifest and returns a selector.
func NewThemeSelector(name, variant string, tokenOverrides map[string]string, opts ...ThemeOption) (theme.Selector, *theme.Manifest, error) {
	options := themeOptions{}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	if strings.TrimSpace(name) == "" {
		name = "admin"
	}
	if strings.TrimSpace(variant) == "" {
		variant = "light"
	}

	registry := options.registry
	if registry == nil {
		registry = theme.NewRegistry()
	}
	provider, ok := registry.(theme.ThemeProvider)
	if !ok {
		return theme.Selector{}, nil, fmt.Errorf("theme registry does not implement ThemeProvider")
	}

	manifest, registerManifest := resolveThemeManifest(registry, name, tokenOverrides, options)
	manifest.Assets.Files = normalizeThemeAssetFiles(manifest.Assets.Files)
	manifest.Variants = normalizeThemeVariants(manifest.Variants)

	if registerManifest {
		if err := registry.Register(manifest); err != nil {
			return theme.Selector{}, nil, fmt.Errorf("register theme: %w", err)
		}
	}

	selector := theme.Selector{
		Registry:       provider,
		DefaultTheme:   manifest.Name,
		DefaultVariant: variant,
	}
	return selector, manifest, nil
}

func resolveThemeManifest(registry theme.Registry, name string, tokenOverrides map[string]string, options themeOptions) (*theme.Manifest, bool) {
	manifest := options.manifest
	if manifest == nil {
		if existing, err := registry.Get(name); err == nil && existing != nil {
			manifest = existing
		}
	}
	if manifest == nil {
		return defaultThemeManifest(name, tokenOverrides, options), true
	}
	applyThemeManifestFallbacks(manifest, name, options)
	return manifest, false
}

func applyThemeManifestFallbacks(manifest *theme.Manifest, name string, options themeOptions) {
	if strings.TrimSpace(manifest.Name) == "" {
		manifest.Name = name
	}
	if strings.TrimSpace(options.assetsPrefix) != "" && strings.TrimSpace(manifest.Assets.Prefix) == "" {
		manifest.Assets.Prefix = options.assetsPrefix
	}
	if len(options.assetsFiles) > 0 && len(manifest.Assets.Files) == 0 {
		manifest.Assets.Files = cloneStringMap(options.assetsFiles)
	}
	if len(options.variants) > 0 && len(manifest.Variants) == 0 {
		manifest.Variants = options.variants
	}
}

func defaultThemeManifest(name string, tokenOverrides map[string]string, options themeOptions) *theme.Manifest {
	tokens := map[string]string{
		"primary":                      "#2563eb",
		"accent":                       "#f59e0b",
		"surface":                      "#1C1C1E",
		"sidebar-width":                "260px",
		"sidebar-padding-x":            "12px",
		"sidebar-padding-y":            "12px",
		"sidebar-item-height":          "36px",
		"sidebar-title-height":         "28px",
		"sidebar-gap-sections":         "24px",
		"sidebar-icon-size":            "20px",
		"sidebar-footer-height":        "64px",
		"sidebar-brand-max-height":     "40px",
		"sidebar-brand-max-width":      "100%",
		"sidebar-brand-collapsed-size": "32px",
		"sidebar-brand-align":          "flex-start",
	}
	maps.Copy(tokens, tokenOverrides)

	assetsPrefix := strings.TrimSpace(options.assetsPrefix)
	assetsFiles := options.assetsFiles
	if len(assetsFiles) == 0 {
		assetsFiles = map[string]string{
			"logo":    "logo.svg",
			"icon":    "logo.svg",
			"favicon": "logo.svg",
		}
	} else {
		assetsFiles = normalizeThemeAssetFiles(assetsFiles)
	}

	variants := options.variants
	if len(variants) == 0 {
		variants = map[string]theme.Variant{
			"dark": {
				Tokens: map[string]string{
					"primary": "#0ea5e9",
					"accent":  "#fbbf24",
					"surface": "#0b1221",
				},
				Assets: theme.Assets{
					Prefix: assetsPrefix,
					Files: map[string]string{
						"logo": "logo.svg",
						"icon": "logo.svg",
					},
				},
			},
		}
	} else {
		variants = normalizeThemeVariants(variants)
	}

	return &theme.Manifest{
		Name:        name,
		Version:     "1.0.0",
		Description: "Quickstart admin theme",
		Tokens:      tokens,
		Assets: theme.Assets{
			Prefix: assetsPrefix,
			Files:  cloneStringMap(assetsFiles),
		},
		Variants: variants,
	}
}

func normalizeThemeAssetFiles(files map[string]string) map[string]string {
	out := cloneStringMap(files)
	if len(out) == 0 {
		return out
	}
	if strings.TrimSpace(out["icon"]) == "" {
		if logo := strings.TrimSpace(out["logo"]); logo != "" {
			out["icon"] = logo
		}
	}
	return out
}

func normalizeThemeVariants(variants map[string]theme.Variant) map[string]theme.Variant {
	if len(variants) == 0 {
		return nil
	}
	out := make(map[string]theme.Variant, len(variants))
	for key, variant := range variants {
		clone := variant
		clone.Assets.Files = normalizeThemeAssetFiles(clone.Assets.Files)
		out[key] = clone
	}
	return out
}
