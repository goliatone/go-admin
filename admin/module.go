package admin

import (
	"context"
	"strings"

	modinternal "github.com/goliatone/go-admin/admin/internal/modules"
	"github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

// ModuleManifest captures identifying metadata and dependencies for a module.
// Labels/description keys are i18n-friendly and resolved by the host.
type ModuleManifest = modinternal.Manifest

// ModuleContext is passed to modules so they can register panels, routes,
// commands, and other contributions against the admin orchestrator.
type ModuleContext struct {
	Admin *Admin `json:"admin"`
	// Router is the default module router and is auth-protected when auth is configured.
	Router AdminRouter `json:"router"`
	// ProtectedRouter always wraps routes with admin auth middleware when auth is configured.
	ProtectedRouter AdminRouter `json:"protected_router"`
	// PublicRouter bypasses auth middleware and must be used explicitly for public endpoints.
	PublicRouter AdminRouter `json:"public_router"`
	// AuthMiddleware exposes the admin auth middleware for selective route protection.
	AuthMiddleware router.MiddlewareFunc `json:"auth_middleware"`
	Locale         string                `json:"locale"`
	Translator     Translator            `json:"translator"`
	Routing        routing.ModuleContext `json:"routing"`
	// MountRouters exposes host-authorized named routing surfaces declared in
	// Routing. Modules should resolve paths through Routing.MountRoutePath.
	MountRouters map[string]AdminRouter `json:"-"`
}

func (c ModuleContext) MountRouter(name string) (AdminRouter, bool) {
	r, ok := c.MountRouters[strings.ToLower(strings.TrimSpace(name))]
	return r, ok
}

// Module defines the minimal contract for pluggable slices.
// Modules should be registered before Admin.Initialize is called.
type Module interface {
	Manifest() ModuleManifest
	Register(ctx ModuleContext) error
}

// RouteContractProvider exposes the explicit routing contract required for mounted modules.
type RouteContractProvider interface {
	RouteContract() routing.ModuleContract
}

// ModuleMountRouterProvider is implemented by host routers that can resolve a
// validated routing surface to its concrete registration router.
type ModuleMountRouterProvider interface {
	ModuleMountRouter(surface string) (AdminRouter, bool)
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
