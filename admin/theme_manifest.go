package admin

import (
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	theme "github.com/goliatone/go-theme"
)

// WithThemeManifest wires the active go-theme manifest for runtime variant
// reconciliation and downstream UI option building.
func (a *Admin) WithThemeManifest(manifest *theme.Manifest) *Admin {
	if a == nil {
		return a
	}
	a.themeManifest = manifest
	return a
}

func reconcileThemeSelectionWithManifest(
	selection *ThemeSelection,
	manifest *theme.Manifest,
	configuredTheme string,
	providerResolved bool,
) *ThemeSelection {
	result := cloneThemeSelection(selection)
	if manifest == nil {
		return result
	}

	manifestName := strings.TrimSpace(manifest.Name)
	if manifestName == "" {
		return result
	}

	if providerResolved {
		if strings.TrimSpace(result.Name) != manifestName {
			return result
		}
	} else {
		if strings.TrimSpace(configuredTheme) != manifestName {
			return result
		}
		result = mergeThemeSelections(result, baseThemeSelectionFromManifest(manifest))
	}

	result.Name = manifestName
	if result.Tokens == nil {
		result.Tokens = map[string]string{}
	}
	result.Tokens["theme"] = manifestName

	result.Variant = strings.TrimSpace(result.Variant)
	if result.Variant == "" {
		result.ChartTheme = ""
		result.VariantResolved = true
		return result
	}
	if _, supported := manifest.Variants[result.Variant]; !supported {
		result.Variant = ""
		result.ChartTheme = ""
	}
	result.VariantResolved = true
	return result
}

func baseThemeSelectionFromManifest(manifest *theme.Manifest) *ThemeSelection {
	if manifest == nil {
		return &ThemeSelection{VariantResolved: true}
	}
	name := strings.TrimSpace(manifest.Name)
	selection := theme.Selection{
		Theme:    name,
		Variant:  "",
		Manifest: manifest,
	}
	snapshot := selection.Snapshot()
	return normalizeThemeProjection(&ThemeSelection{
		Name:            name,
		Variant:         "",
		VariantResolved: true,
		Tokens:          primitives.CloneStringMapNilOnEmpty(snapshot.Tokens),
		CSSVars:         primitives.CloneStringMapNilOnEmpty(selection.CSSVariables("")),
		Assets:          primitives.CloneStringMapNilOnEmpty(snapshot.Assets),
		Partials:        primitives.CloneStringMapNilOnEmpty(snapshot.Templates),
		ChartTheme:      "",
		AssetPrefix:     snapshot.AssetPrefix,
	})
}
