package site

import (
	"context"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

// SiteRouter exposes grouped routing helpers for site modules.
type SiteRouter interface {
	admin.AdminRouter
	Group(prefix string) SiteRouter
	Mount(prefix string) SiteRouter
	WithGroup(path string, cb func(SiteRouter)) SiteRouter
	Use(m ...router.MiddlewareFunc) SiteRouter
}

// SiteModule allows host modules to contribute routes and view context.
type SiteModule interface {
	ID() string
	RegisterRoutes(ctx SiteModuleContext) error
	ViewContext(ctx context.Context, in router.ViewContext) router.ViewContext
}

// SiteSearchFilterRequest describes the current search request state that
// module filter injectors can inspect before returning extra filters.
type SiteSearchFilterRequest struct {
	Query     string              `json:"query"`
	Locale    string              `json:"locale"`
	Filters   map[string][]string `json:"filters"`
	Ranges    []admin.SearchRange `json:"ranges,omitempty"`
	IsSuggest bool                `json:"is_suggest"`
}

// SiteSearchFilterInjector allows modules to inject additional filter values
// into search and suggest provider requests.
type SiteSearchFilterInjector interface {
	SearchFilters(ctx context.Context, c router.Context, req SiteSearchFilterRequest) map[string][]string
}

// SiteRoutingOwnershipContext contains stable inputs for modules that declare
// planner-visible public-site ownership.
type SiteRoutingOwnershipContext struct {
	Admin            *admin.Admin              `json:"admin"`
	SiteConfig       ResolvedSiteConfig        `json:"site_config"`
	SearchProvider   admin.SearchProvider      `json:"search_provider"`
	SearchOperations *admin.GoSearchOperations `json:"search_ops"`
}

// SiteRoutingOwnershipProvider allows site modules to expose exact public-site
// and public-api routes to the shared routing planner without mutating the router.
type SiteRoutingOwnershipProvider interface {
	RoutingOwnership(ctx SiteRoutingOwnershipContext) []routing.ManifestEntry
}

// SiteModuleContext contains stable dependencies for module route registration.
type SiteModuleContext struct {
	Admin          *admin.Admin              `json:"admin"`
	Router         SiteRouter                `json:"router"`
	BasePath       string                    `json:"base_path"`
	DefaultLocale  string                    `json:"default_locale"`
	ThemeEnabled   bool                      `json:"theme_enabled"`
	SearchProvider admin.SearchProvider      `json:"search_provider"`
	SearchOps      *admin.GoSearchOperations `json:"search_ops"`
}
