package modules

import (
	"context"

	"github.com/goliatone/go-admin/admin/internal/helpers"
	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	fggate "github.com/goliatone/go-featuregate/gate"
)

// Manifest captures identifying metadata and dependencies for a module.
type Manifest struct {
	ID             string   `json:"id"`
	NameKey        string   `json:"name_key"`
	DescriptionKey string   `json:"description_key"`
	Dependencies   []string `json:"dependencies"`
	FeatureFlags   []string `json:"feature_flags"`
}

// Module exposes manifest metadata used for ordering and validation.
type Module interface {
	Manifest() Manifest
}

// Translator resolves i18n keys into localized strings.
type Translator = helpers.Translator

// TranslatorAware receives a translator before registration.
type TranslatorAware interface {
	WithTranslator(Translator)
}

// MenuContributor optionally lets a module contribute navigation items.
type MenuContributor interface {
	MenuItems(locale string) []navinternal.MenuItem
}

// IconLibrary represents an icon library contribution from a module.
type IconLibrary struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CDN         string `json:"cdn"`
	CSSClass    string `json:"css_class"`
	RenderMode  string `json:"render_mode"`
	Priority    int    `json:"priority"`
	Trusted     bool   `json:"trusted"`
}

// IconDefinition represents a single icon contribution from a module.
type IconDefinition struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Label    string   `json:"label"`
	Type     string   `json:"type"`
	Library  string   `json:"library"`
	Content  string   `json:"content"`
	Keywords []string `json:"keywords"`
	Category string   `json:"category"`
	Trusted  bool     `json:"trusted"`
}

// IconContributor optionally lets a module contribute icon libraries and definitions.
type IconContributor interface {
	IconLibraries() []IconLibrary
	IconDefinitions() []IconDefinition
}

// FeatureGates evaluates feature enablement.
type FeatureGates = fggate.FeatureGate

// DisabledErrorFactory builds feature-disabled errors for modules.
type DisabledErrorFactory func(feature, moduleID string) error

// RegisterFunc executes module registration using host-provided context.
type RegisterFunc func(Module) error

// MenuItemsFunc forwards contributed menu items to the host.
type MenuItemsFunc func(ctx context.Context, items []navinternal.MenuItem) error

// IconLibraryFunc forwards contributed icon libraries to the host.
type IconLibraryFunc func(lib IconLibrary) error

// IconDefinitionFunc forwards contributed icon definitions to the host.
type IconDefinitionFunc func(icon IconDefinition) error

// SkipDependencyFunc handles modules skipped because one of their dependencies was skipped earlier in the load order.
type SkipDependencyFunc func(moduleID string, dependencies []string)

// LoadOptions configures module loading.
type LoadOptions struct {
	Modules           []Module             `json:"modules"`
	Gates             FeatureGates         `json:"gates"`
	DefaultLocale     string               `json:"default_locale"`
	Translator        Translator           `json:"translator"`
	DisabledError     DisabledErrorFactory `json:"disabled_error"`
	Register          RegisterFunc         `json:"register"`
	SkipDependency    SkipDependencyFunc   `json:"skip_dependency"`
	AddMenuItems      MenuItemsFunc        `json:"add_menu_items"`
	AddIconLibrary    IconLibraryFunc      `json:"add_icon_library"`
	AddIconDefinition IconDefinitionFunc   `json:"add_icon_definition"`
	RegisterDefaults  func() error         `json:"register_defaults"`
}
