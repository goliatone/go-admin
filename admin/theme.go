package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
)

type themeSelectorKey string

const (
	themeNameKey    themeSelectorKey = "admin.theme_name"
	themeVariantKey themeSelectorKey = "admin.theme_variant"
)

// ThemeSelector describes the requested theme/variant.
type ThemeSelector struct {
	Name    string
	Variant string
}

// ThemeSelection captures resolved theme assets/tokens.
type ThemeSelection struct {
	Name        string
	Variant     string
	Tokens      map[string]string
	Assets      map[string]string
	Partials    map[string]string
	ChartTheme  string
	AssetPrefix string
}

// ThemeProvider resolves the theme selection, typically backed by go-theme.
type ThemeProvider func(ctx context.Context, selector ThemeSelector) (*ThemeSelection, error)

// WithThemeSelection stores a theme selector on the context for downstream resolution.
func WithThemeSelection(ctx context.Context, selector ThemeSelector) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if selector.Name != "" {
		ctx = context.WithValue(ctx, themeNameKey, selector.Name)
	}
	if selector.Variant != "" {
		ctx = context.WithValue(ctx, themeVariantKey, selector.Variant)
	}
	return ctx
}

// ThemeSelectorFromContext extracts a theme selector override from context, if present.
func ThemeSelectorFromContext(ctx context.Context) ThemeSelector {
	if ctx == nil {
		return ThemeSelector{}
	}
	selector := ThemeSelector{}
	if name, ok := ctx.Value(themeNameKey).(string); ok && name != "" {
		selector.Name = name
	}
	if variant, ok := ctx.Value(themeVariantKey).(string); ok && variant != "" {
		selector.Variant = variant
	}
	return selector
}

func cloneThemeSelection(sel *ThemeSelection) *ThemeSelection {
	if sel == nil {
		return &ThemeSelection{}
	}
	return &ThemeSelection{
		Name:        sel.Name,
		Variant:     sel.Variant,
		Tokens:      primitives.CloneStringMapNilOnEmpty(sel.Tokens),
		Assets:      primitives.CloneStringMapNilOnEmpty(sel.Assets),
		Partials:    primitives.CloneStringMapNilOnEmpty(sel.Partials),
		ChartTheme:  sel.ChartTheme,
		AssetPrefix: sel.AssetPrefix,
	}
}

type RouterContext interface {
	Query(name string, defaultValue ...string) string
	Header(string) string
}

func selectorFromRequest(c RouterContext) ThemeSelector {
	selector := ThemeSelector{}
	if c == nil {
		return selector
	}
	if name := strings.TrimSpace(c.Query("theme")); name != "" {
		selector.Name = name
	}
	if variant := strings.TrimSpace(c.Query("variant")); variant != "" {
		selector.Variant = variant
	}
	if selector.Name == "" {
		if name := strings.TrimSpace(c.Header("X-Admin-Theme")); name != "" {
			selector.Name = name
		}
	}
	if selector.Variant == "" {
		if variant := strings.TrimSpace(c.Header("X-Admin-Theme-Variant")); variant != "" {
			selector.Variant = variant
		}
	}
	return selector
}

func mergeSelector(base, override ThemeSelector) ThemeSelector {
	if override.Name != "" {
		base.Name = override.Name
	}
	if override.Variant != "" {
		base.Variant = override.Variant
	}
	return base
}

func mergeThemeSelections(base, override *ThemeSelection) *ThemeSelection {
	result := cloneThemeSelection(base)
	if override == nil {
		return result
	}
	if override.Name != "" {
		result.Name = override.Name
	}
	if override.Variant != "" {
		result.Variant = override.Variant
	}
	if len(override.Tokens) > 0 {
		if result.Tokens == nil {
			result.Tokens = map[string]string{}
		}
		for k, v := range override.Tokens {
			result.Tokens[k] = v
		}
	}
	if len(override.Assets) > 0 {
		if result.Assets == nil {
			result.Assets = map[string]string{}
		}
		for k, v := range override.Assets {
			result.Assets[k] = v
		}
	}
	if len(override.Partials) > 0 {
		if result.Partials == nil {
			result.Partials = map[string]string{}
		}
		for k, v := range override.Partials {
			result.Partials[k] = v
		}
	}
	if override.ChartTheme != "" {
		result.ChartTheme = override.ChartTheme
	}
	if override.AssetPrefix != "" {
		result.AssetPrefix = override.AssetPrefix
	}
	return result
}

func (t *ThemeSelection) payload() map[string]map[string]string {
	if t == nil {
		return nil
	}
	out := map[string]map[string]string{}
	selection := map[string]string{}
	if t.Name != "" {
		selection["name"] = t.Name
	}
	if t.Variant != "" {
		selection["variant"] = t.Variant
	}
	if len(selection) > 0 {
		out["selection"] = selection
	}
	if len(t.Tokens) > 0 {
		out["tokens"] = primitives.CloneStringMapNilOnEmpty(t.Tokens)
	}
	assets := primitives.CloneStringMapNilOnEmpty(t.Assets)
	if t.AssetPrefix != "" {
		if assets == nil {
			assets = map[string]string{}
		}
		assets["prefix"] = t.AssetPrefix
	}
	if len(assets) > 0 {
		out["assets"] = assets
	}
	if len(t.Partials) > 0 {
		out["partials"] = primitives.CloneStringMapNilOnEmpty(t.Partials)
	}
	if t.ChartTheme != "" {
		out["chart"] = map[string]string{"theme": t.ChartTheme}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
