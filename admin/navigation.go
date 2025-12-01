package admin

import (
	"context"
	"strings"
)

// NavigationItem represents a node in the admin navigation tree.
type NavigationItem struct {
	Label       string           `json:"label"`
	Icon        string           `json:"icon,omitempty"`
	Target      map[string]any   `json:"target,omitempty"`
	Badge       map[string]any   `json:"badge,omitempty"`
	Children    []NavigationItem `json:"children,omitempty"`
	Permissions []string         `json:"permissions,omitempty"`
	Locale      string           `json:"locale,omitempty"`
}

// Navigation resolves menus from CMS or in-memory sources.
type Navigation struct {
	menuSvc    CMSMenuService
	authorizer Authorizer
	fallback   []NavigationItem
}

// NewNavigation builds a navigation helper.
func NewNavigation(menuSvc CMSMenuService, authorizer Authorizer) *Navigation {
	return &Navigation{menuSvc: menuSvc, authorizer: authorizer, fallback: []NavigationItem{}}
}

// AddFallback allows adding items when CMS is disabled.
func (n *Navigation) AddFallback(items ...NavigationItem) {
	n.fallback = append(n.fallback, items...)
}

// Resolve returns navigation for a locale, applying permission filters.
func (n *Navigation) Resolve(ctx context.Context, locale string) []NavigationItem {
	if n.menuSvc == nil {
		return n.filter(n.fallback, ctx)
	}
	menu, err := n.menuSvc.Menu(ctx, "admin.main", locale)
	if err != nil {
		return n.filter(n.fallback, ctx)
	}
	items := convertMenuItems(menu.Items)
	return n.filter(items, ctx)
}

func convertMenuItems(items []MenuItem) []NavigationItem {
	out := make([]NavigationItem, 0, len(items))
	for _, item := range items {
		out = append(out, NavigationItem{
			Label:       item.Label,
			Icon:        item.Icon,
			Target:      item.Target,
			Badge:       item.Badge,
			Permissions: item.Permissions,
			Children:    convertMenuItems(item.Children),
			Locale:      item.Locale,
		})
	}
	return out
}

func (n *Navigation) filter(items []NavigationItem, ctx context.Context) []NavigationItem {
	if n.authorizer == nil {
		return items
	}
	out := []NavigationItem{}
	for _, item := range items {
		if len(item.Permissions) > 0 && !n.canAny(ctx, item.Permissions) {
			continue
		}
		if len(item.Children) > 0 {
			item.Children = n.filter(item.Children, ctx)
		}
		out = append(out, item)
	}
	return out
}

func (n *Navigation) canAny(ctx context.Context, perms []string) bool {
	for _, perm := range perms {
		if strings.TrimSpace(perm) == "" {
			continue
		}
		if n.authorizer.Can(ctx, perm, "navigation") {
			return true
		}
	}
	return len(perms) == 0
}
