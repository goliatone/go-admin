package site

import (
	"context"

	"github.com/goliatone/go-admin/admin"
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
	IsSuggest bool                `json:"is_suggest"`
}

// SiteSearchFilterInjector allows modules to inject additional filter values
// into search and suggest provider requests.
type SiteSearchFilterInjector interface {
	SearchFilters(ctx context.Context, c router.Context, req SiteSearchFilterRequest) map[string][]string
}

// SiteModuleContext contains stable dependencies for module route registration.
type SiteModuleContext struct {
	Admin          *admin.Admin         `json:"admin"`
	Router         SiteRouter           `json:"router"`
	BasePath       string               `json:"base_path"`
	DefaultLocale  string               `json:"default_locale"`
	ThemeEnabled   bool                 `json:"theme_enabled"`
	SearchProvider admin.SearchProvider `json:"search_provider"`
}
