package quickstart

import (
	"fmt"
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

// WithThemeAssets configures default assets for the manifest.
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

	manifest := options.manifest
	if manifest == nil {
		manifest = defaultThemeManifest(name, tokenOverrides, options)
	} else {
		if strings.TrimSpace(manifest.Name) == "" {
			manifest.Name = name
		}
		if len(tokenOverrides) > 0 {
			if manifest.Tokens == nil {
				manifest.Tokens = map[string]string{}
			}
			for key, value := range tokenOverrides {
				manifest.Tokens[key] = value
			}
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

	if err := registry.Register(manifest); err != nil {
		return theme.Selector{}, nil, fmt.Errorf("register theme: %w", err)
	}

	selector := theme.Selector{
		Registry:       provider,
		DefaultTheme:   manifest.Name,
		DefaultVariant: variant,
	}
	return selector, manifest, nil
}

func defaultThemeManifest(name string, tokenOverrides map[string]string, options themeOptions) *theme.Manifest {
	tokens := map[string]string{
		"primary": "#2563eb",
		"accent":  "#f59e0b",
		"surface": "#1C1C1E",
		"sidebar-width":         "260px",
		"sidebar-padding-x":     "12px",
		"sidebar-padding-y":     "12px",
		"sidebar-item-height":   "36px",
		"sidebar-title-height":  "28px",
		"sidebar-gap-sections":  "24px",
		"sidebar-icon-size":     "20px",
		"sidebar-footer-height": "64px",
	}
	for key, value := range tokenOverrides {
		tokens[key] = value
	}

	assetsPrefix := strings.TrimSpace(options.assetsPrefix)
	assetsFiles := options.assetsFiles
	if len(assetsFiles) == 0 {
		assetsFiles = map[string]string{
			"logo":    "logo.svg",
			"favicon": "logo.svg",
		}
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
					},
				},
			},
		}
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
