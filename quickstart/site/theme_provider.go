package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/internal/primitives"
	gotheme "github.com/goliatone/go-theme"
)

type siteThemeSelectorKey string

const (
	siteThemeNameKey    siteThemeSelectorKey = "quickstart.site.theme_name"
	siteThemeVariantKey siteThemeSelectorKey = "quickstart.site.theme_variant"
)

// SiteThemeSelector describes a site-scoped theme/variant selection.
type SiteThemeSelector struct {
	Name    string `json:"name"`
	Variant string `json:"variant"`
}

// SiteThemeRequest carries configured and request-scoped site theme selectors.
type SiteThemeRequest struct {
	Configured SiteThemeSelector `json:"configured"`
	Requested  SiteThemeSelector `json:"requested"`
	Selector   SiteThemeSelector `json:"selector"`
}

// SiteThemeProvider resolves site-scoped theme selections without coupling site requests to admin theme resolution.
type SiteThemeProvider func(ctx context.Context, request SiteThemeRequest) (*admin.ThemeSelection, error)

// WithSiteThemeSelection stores a site-scoped selector on the request context.
func WithSiteThemeSelection(ctx context.Context, selector SiteThemeSelector) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if selector.Name != "" {
		ctx = context.WithValue(ctx, siteThemeNameKey, selector.Name)
	}
	if selector.Variant != "" {
		ctx = context.WithValue(ctx, siteThemeVariantKey, selector.Variant)
	}
	return ctx
}

// SiteThemeSelectorFromContext extracts site-scoped theme overrides from context.
func SiteThemeSelectorFromContext(ctx context.Context) SiteThemeSelector {
	if ctx == nil {
		return SiteThemeSelector{}
	}
	selector := SiteThemeSelector{}
	if name, ok := ctx.Value(siteThemeNameKey).(string); ok && name != "" {
		selector.Name = name
	}
	if variant, ok := ctx.Value(siteThemeVariantKey).(string); ok && variant != "" {
		selector.Variant = variant
	}
	return selector
}

// ThemeProviderFromSelector adapts a go-theme selector into the site theme provider contract.
func ThemeProviderFromSelector(selector gotheme.ThemeSelector) SiteThemeProvider {
	if selector == nil {
		return nil
	}
	return func(ctx context.Context, request SiteThemeRequest) (*admin.ThemeSelection, error) {
		_ = ctx
		candidates := uniqueSiteThemeSelectors(request.Selector, request.Configured)
		var firstErr error
		for _, candidate := range candidates {
			selection, err := selector.Select(candidate.Name, candidate.Variant)
			if err != nil {
				if firstErr == nil {
					firstErr = err
				}
				continue
			}
			if selection == nil {
				continue
			}
			snapshot := selection.Snapshot()
			return &admin.ThemeSelection{
				Name:        snapshot.Theme,
				Variant:     snapshot.Variant,
				Tokens:      primitives.CloneStringMapNilOnEmpty(snapshot.Tokens),
				CSSVars:     primitives.CloneStringMapNilOnEmpty(selection.CSSVariables("")),
				Assets:      primitives.CloneStringMapNilOnEmpty(snapshot.Assets),
				Partials:    primitives.CloneStringMapNilOnEmpty(snapshot.Templates),
				ChartTheme:  snapshot.Variant,
				AssetPrefix: snapshot.AssetPrefix,
			}, nil
		}
		return nil, firstErr
	}
}

// WithSiteTheme wires a go-theme selector into the site runtime without coupling it to admin theme resolution.
func WithSiteTheme(selector gotheme.ThemeSelector) SiteOption {
	return WithSiteThemeProvider(ThemeProviderFromSelector(selector))
}

// WithSiteThemeProvider wires an explicit provider into the site runtime.
func WithSiteThemeProvider(provider SiteThemeProvider) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil || provider == nil {
			return
		}
		opts.themeProvider = provider
	}
}

func uniqueSiteThemeSelectors(selectors ...SiteThemeSelector) []SiteThemeSelector {
	out := make([]SiteThemeSelector, 0, len(selectors))
	seen := map[string]struct{}{}
	for _, selector := range selectors {
		selector.Name = strings.TrimSpace(selector.Name)
		selector.Variant = strings.TrimSpace(selector.Variant)
		key := selector.Name + "\x00" + selector.Variant
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, selector)
	}
	return out
}
