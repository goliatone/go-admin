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
	menuSvc         CMSMenuService
	authorizer      Authorizer
	fallback        []NavigationItem
	defaultMenuCode string
}

// NewNavigation builds a navigation helper.
func NewNavigation(menuSvc CMSMenuService, authorizer Authorizer) *Navigation {
	return &Navigation{
		menuSvc:         menuSvc,
		authorizer:      authorizer,
		fallback:        []NavigationItem{},
		defaultMenuCode: "admin.main",
	}
}

// AddItem appends a navigation item to the in-memory fallback tree.
func (n *Navigation) AddItem(item NavigationItem) {
	n.fallback = append(n.fallback, item)
}

// AddFallback allows adding items when CMS is disabled.
func (n *Navigation) AddFallback(items ...NavigationItem) {
	n.fallback = append(n.fallback, items...)
}

// Resolve returns navigation for a locale, applying permission filters.
func (n *Navigation) Resolve(ctx context.Context, locale string) []NavigationItem {
	return n.ResolveMenu(ctx, n.defaultMenuCode, locale)
}

// ResolveMenu returns navigation for a menu code and locale, applying permission filters.
func (n *Navigation) ResolveMenu(ctx context.Context, menuCode string, locale string) []NavigationItem {
	if menuCode == "" {
		menuCode = n.defaultMenuCode
	}
	if n.menuSvc == nil {
		return n.filter(n.localize(n.fallback, locale), ctx)
	}
	menu, err := n.menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		return n.filter(n.localize(n.fallback, locale), ctx)
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

func (n *Navigation) localize(items []NavigationItem, locale string) []NavigationItem {
	out := []NavigationItem{}
	for _, item := range items {
		if item.Locale != "" && locale != "" && item.Locale != locale {
			continue
		}
		item.Children = n.localize(item.Children, locale)
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
