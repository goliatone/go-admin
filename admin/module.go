package admin

import (
	"context"

	modinternal "github.com/goliatone/go-admin/admin/internal/modules"
	router "github.com/goliatone/go-router"
)

// ModuleManifest captures identifying metadata and dependencies for a module.
// Labels/description keys are i18n-friendly and resolved by the host.
type ModuleManifest = modinternal.Manifest

// ModuleContext is passed to modules so they can register panels, routes,
// commands, and other contributions against the admin orchestrator.
type ModuleContext struct {
	Admin *Admin
	// Router is the default module router and is auth-protected when auth is configured.
	Router AdminRouter
	// ProtectedRouter always wraps routes with admin auth middleware when auth is configured.
	ProtectedRouter AdminRouter
	// PublicRouter bypasses auth middleware and must be used explicitly for public endpoints.
	PublicRouter AdminRouter
	// AuthMiddleware exposes the admin auth middleware for selective route protection.
	AuthMiddleware router.MiddlewareFunc
	Locale         string
	Translator     Translator
}

// Module defines the minimal contract for pluggable slices.
// Modules should be registered before Admin.Initialize is called.
type Module interface {
	Manifest() ModuleManifest
	Register(ctx ModuleContext) error
}

// ModuleStartupPolicy controls how startup validation errors are handled.
type ModuleStartupPolicy string

const (
	// ModuleStartupPolicyEnforce treats module startup validation errors as fatal.
	ModuleStartupPolicyEnforce ModuleStartupPolicy = "enforce"
	// ModuleStartupPolicyWarn logs module startup validation errors and continues.
	ModuleStartupPolicyWarn ModuleStartupPolicy = "warn"
)

// ModuleStartupValidator can run additional startup checks after module registration.
type ModuleStartupValidator interface {
	ValidateStartup(ctx context.Context) error
}

// MenuContributor optionally lets a module contribute navigation items.
type MenuContributor = modinternal.MenuContributor

// TranslatorAware is implemented by modules that want a translator injected before registration.
type TranslatorAware = modinternal.TranslatorAware
