package admin

import (
	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
)

const (
	MenuItemTypeItem      = navinternal.MenuItemTypeItem
	MenuItemTypeGroup     = navinternal.MenuItemTypeGroup
	MenuItemTypeSeparator = navinternal.MenuItemTypeSeparator

	NavigationPermissionDeniedModeHide    = navinternal.NavigationPermissionDeniedModeHide
	NavigationPermissionDeniedModeDisable = navinternal.NavigationPermissionDeniedModeDisable

	NavigationDisabledReasonCodePermissionDenied = navinternal.NavigationDisabledReasonCodePermissionDenied
)

// Navigation resolves menus from CMS or in-memory sources.
type Navigation = navinternal.Navigation

// NavigationItem represents a node in the admin navigation tree.
type NavigationItem = navinternal.NavigationItem

// NavigationPermissionDeniedMode controls how denied navigation entries resolve.
type NavigationPermissionDeniedMode = navinternal.NavigationPermissionDeniedMode

// ResolveOptions controls navigation resolution behavior.
type ResolveOptions = navinternal.ResolveOptions

// NewNavigation builds a navigation helper.
func NewNavigation(menuSvc CMSMenuService, authorizer Authorizer) *Navigation {
	var svc navinternal.MenuService
	if menuSvc != nil {
		svc = menuSvc
	}
	return navinternal.NewNavigation(svc, authorizer)
}

// NormalizeNavigationPermissionDeniedMode returns the canonical navigation
// permission-denial mode.
func NormalizeNavigationPermissionDeniedMode(mode NavigationPermissionDeniedMode) NavigationPermissionDeniedMode {
	return navinternal.NormalizeNavigationPermissionDeniedMode(mode)
}
