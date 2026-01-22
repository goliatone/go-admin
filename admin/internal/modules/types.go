package modules

import (
	"context"

	"github.com/goliatone/go-admin/admin/internal/helpers"
	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	fggate "github.com/goliatone/go-featuregate/gate"
)

// Manifest captures identifying metadata and dependencies for a module.
type Manifest struct {
	ID             string
	NameKey        string
	DescriptionKey string
	Dependencies   []string
	FeatureFlags   []string
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

// FeatureGates evaluates feature enablement.
type FeatureGates = fggate.FeatureGate

// DisabledErrorFactory builds feature-disabled errors for modules.
type DisabledErrorFactory func(feature, moduleID string) error

// RegisterFunc executes module registration using host-provided context.
type RegisterFunc func(Module) error

// MenuItemsFunc forwards contributed menu items to the host.
type MenuItemsFunc func(ctx context.Context, items []navinternal.MenuItem) error

// LoadOptions configures module loading.
type LoadOptions struct {
	Modules          []Module
	Gates            FeatureGates
	DefaultLocale    string
	Translator       Translator
	DisabledError    DisabledErrorFactory
	Register         RegisterFunc
	AddMenuItems     MenuItemsFunc
	RegisterDefaults func() error
}
