package admin

import (
	"context"
	"strings"

	gotheme "github.com/goliatone/go-theme"
)

// WithGoTheme wires a go-theme selector so CMS templates, dashboard widgets, and forms share the same selection.
func (a *Admin) WithGoTheme(selector gotheme.ThemeSelector) *Admin {
	if selector == nil {
		return a
	}
	a.themeProvider = func(ctx context.Context, sel ThemeSelector) (*ThemeSelection, error) {
		selection, err := selector.Select(sel.Name, sel.Variant)
		if err != nil {
			return nil, err
		}
		if selection == nil {
			return nil, nil
		}
		tokens := selection.Tokens()
		return &ThemeSelection{
			Name:        selection.Theme,
			Variant:     selection.Variant,
			Tokens:      cloneStringMap(tokens),
			Assets:      resolveGoThemeAssets(selection),
			Partials:    resolveGoThemePartials(selection),
			ChartTheme:  selection.Variant,
			AssetPrefix: goThemeAssetPrefix(selection),
		}, nil
	}
	return a
}

func resolveGoThemeAssets(selection *gotheme.Selection) map[string]string {
	assets := map[string]string{}
	if selection == nil || selection.Manifest == nil {
		return assets
	}
	keys := map[string]struct{}{}
	for key := range selection.Manifest.Assets.Files {
		keys[key] = struct{}{}
	}
	if selection.Variant != "" {
		if variant, ok := selection.Manifest.Variants[selection.Variant]; ok {
			for key := range variant.Assets.Files {
				keys[key] = struct{}{}
			}
		}
	}
	for key := range keys {
		if resolved, ok := selection.Asset(key); ok && resolved != "" {
			assets[key] = resolved
		}
	}
	return assets
}

func resolveGoThemePartials(selection *gotheme.Selection) map[string]string {
	partials := map[string]string{}
	if selection == nil || selection.Manifest == nil {
		return partials
	}
	keys := map[string]struct{}{}
	for key := range selection.Manifest.Templates {
		keys[key] = struct{}{}
	}
	if selection.Variant != "" {
		if variant, ok := selection.Manifest.Variants[selection.Variant]; ok {
			for key := range variant.Templates {
				keys[key] = struct{}{}
			}
		}
	}
	for key := range keys {
		fallback := selection.Manifest.Templates[key]
		if tpl := selection.Template(key, fallback); tpl != "" {
			partials[key] = tpl
		}
	}
	return partials
}

func goThemeAssetPrefix(selection *gotheme.Selection) string {
	if selection == nil || selection.Manifest == nil {
		return ""
	}
	if selection.Variant != "" {
		if variant, ok := selection.Manifest.Variants[selection.Variant]; ok {
			if prefix := strings.TrimSpace(variant.Assets.Prefix); prefix != "" {
				return prefix
			}
		}
	}
	return selection.Manifest.Assets.Prefix
}
