package admin

// IconContributor allows modules to contribute icon libraries and definitions.
// Modules implementing this interface can register custom icon sets that
// will be available for icon pickers and rendering throughout the admin panel.
type IconContributor interface {
	// IconLibraries returns icon libraries this module provides.
	// Libraries are registered during module loading and available for
	// icon resolution and rendering.
	IconLibraries() []IconLibrary

	// IconDefinitions returns standalone icon definitions.
	// Icons without an explicit library are added to the "custom" library.
	IconDefinitions() []IconDefinition
}

// IconContributorCallbacks holds callbacks for processing icon contributions.
type IconContributorCallbacks struct {
	// OnLibrary is called for each library contributed by a module.
	OnLibrary func(lib IconLibrary) error
	// OnIcon is called for each standalone icon contributed by a module.
	OnIcon func(icon IconDefinition) error
}

// CollectIconContributions processes icon contributions from a module.
func CollectIconContributions(contributor IconContributor, callbacks IconContributorCallbacks) error {
	if contributor == nil {
		return nil
	}

	// Collect libraries
	if callbacks.OnLibrary != nil {
		for _, lib := range contributor.IconLibraries() {
			if err := callbacks.OnLibrary(lib); err != nil {
				return err
			}
		}
	}

	// Collect standalone icons
	if callbacks.OnIcon != nil {
		for _, icon := range contributor.IconDefinitions() {
			if err := callbacks.OnIcon(icon); err != nil {
				return err
			}
		}
	}

	return nil
}

// IconContributorAdapter provides a simple way to create an IconContributor
// from functions or static data.
type IconContributorAdapter struct {
	libraries []IconLibrary
	icons     []IconDefinition
}

// NewIconContributorAdapter creates a new adapter with the given libraries and icons.
func NewIconContributorAdapter(libraries []IconLibrary, icons []IconDefinition) *IconContributorAdapter {
	return &IconContributorAdapter{
		libraries: libraries,
		icons:     icons,
	}
}

// IconLibraries implements IconContributor.
func (a *IconContributorAdapter) IconLibraries() []IconLibrary {
	return a.libraries
}

// IconDefinitions implements IconContributor.
func (a *IconContributorAdapter) IconDefinitions() []IconDefinition {
	return a.icons
}

// WithLibrary adds a library to the adapter.
func (a *IconContributorAdapter) WithLibrary(lib IconLibrary) *IconContributorAdapter {
	a.libraries = append(a.libraries, lib)
	return a
}

// WithIcon adds an icon to the adapter.
func (a *IconContributorAdapter) WithIcon(icon IconDefinition) *IconContributorAdapter {
	a.icons = append(a.icons, icon)
	return a
}
