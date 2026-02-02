package admin

import theme "github.com/goliatone/go-theme"

// WithThemeManifest wires a go-theme manifest for downstream UI option building.
func (a *Admin) WithThemeManifest(manifest *theme.Manifest) *Admin {
	if a == nil {
		return a
	}
	a.themeManifest = manifest
	return a
}
