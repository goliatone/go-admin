package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"

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
		snapshot := selection.Snapshot()
		return &ThemeSelection{
			Name:        snapshot.Theme,
			Variant:     snapshot.Variant,
			Tokens:      primitives.CloneStringMapNilOnEmpty(snapshot.Tokens),
			Assets:      primitives.CloneStringMapNilOnEmpty(snapshot.Assets),
			Partials:    primitives.CloneStringMapNilOnEmpty(snapshot.Templates),
			ChartTheme:  snapshot.Variant,
			AssetPrefix: snapshot.AssetPrefix,
		}, nil
	}
	return a
}
