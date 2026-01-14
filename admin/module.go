package admin

import modinternal "github.com/goliatone/go-admin/admin/internal/modules"

// ModuleManifest captures identifying metadata and dependencies for a module.
// Labels/description keys are i18n-friendly and resolved by the host.
type ModuleManifest = modinternal.Manifest

// ModuleContext is passed to modules so they can register panels, routes,
// commands, and other contributions against the admin orchestrator.
type ModuleContext struct {
	Admin      *Admin
	Router     AdminRouter
	Locale     string
	Translator Translator
}

// Module defines the minimal contract for pluggable slices.
// Modules should be registered before Admin.Initialize is called.
type Module interface {
	Manifest() ModuleManifest
	Register(ctx ModuleContext) error
}

// MenuContributor optionally lets a module contribute navigation items.
type MenuContributor = modinternal.MenuContributor

// TranslatorAware is implemented by modules that want a translator injected before registration.
type TranslatorAware = modinternal.TranslatorAware
