package admin

import (
	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
)

const (
	MenuItemTypeItem      = navinternal.MenuItemTypeItem
	MenuItemTypeGroup     = navinternal.MenuItemTypeGroup
	MenuItemTypeSeparator = navinternal.MenuItemTypeSeparator
)

// Navigation resolves menus from CMS or in-memory sources.
type Navigation = navinternal.Navigation

// NavigationItem represents a node in the admin navigation tree.
type NavigationItem = navinternal.NavigationItem

// NewNavigation builds a navigation helper.
func NewNavigation(menuSvc CMSMenuService, authorizer Authorizer) *Navigation {
	var svc navinternal.MenuService
	if menuSvc != nil {
		svc = menuSvc
	}
	return navinternal.NewNavigation(svc, authorizer)
}
