package navigation

import (
	"context"
	"sort"
	"strings"
)

// NoopTranslator returns the key unchanged.
type NoopTranslator struct{}

func (NoopTranslator) Translate(key, locale string) string {
	_ = locale
	return key
}

// Navigation resolves menus from CMS or in-memory sources.
type Navigation struct {
	menuSvc         MenuService
	authorizer      Authorizer
	fallback        []NavigationItem
	defaultMenuCode string
	useCMS          bool
	translator      Translator
}

// NewNavigation builds a navigation helper.
func NewNavigation(menuSvc MenuService, authorizer Authorizer) *Navigation {
	return &Navigation{
		menuSvc:         menuSvc,
		authorizer:      authorizer,
		fallback:        []NavigationItem{},
		defaultMenuCode: "admin.main",
		useCMS:          menuSvc != nil,
		translator:      NoopTranslator{},
	}
}

// SetDefaultMenuCode updates the default menu code used for resolution.
func (n *Navigation) SetDefaultMenuCode(code string) {
	if n != nil && strings.TrimSpace(code) != "" {
		n.defaultMenuCode = strings.TrimSpace(code)
	}
}

// DefaultMenuCode returns the current default menu code used for resolution.
func (n *Navigation) DefaultMenuCode() string {
	if n == nil {
		return ""
	}
	return n.defaultMenuCode
}

// SetMenuService swaps the underlying menu service.
func (n *Navigation) SetMenuService(svc MenuService) {
	if n == nil {
		return
	}
	n.menuSvc = svc
}

// MenuService returns the configured menu service, if any.
func (n *Navigation) MenuService() MenuService {
	if n == nil {
		return nil
	}
	return n.menuSvc
}

// SetTranslator wires a translator for label resolution.
func (n *Navigation) SetTranslator(t Translator) {
	if n != nil && t != nil {
		n.translator = t
	}
}

// SetAuthorizer updates the authorizer used for permission filtering.
func (n *Navigation) SetAuthorizer(authz Authorizer) {
	if n != nil {
		n.authorizer = authz
	}
}

// Fallback returns the currently configured fallback navigation items.
func (n *Navigation) Fallback() []NavigationItem {
	if n == nil {
		return nil
	}
	out := make([]NavigationItem, 0, len(n.fallback))
	out = append(out, n.fallback...)
	return out
}

// AddItem appends a navigation item to the in-memory fallback tree.
func (n *Navigation) AddItem(item NavigationItem) {
	n.fallback = append(n.fallback, item)
}

// AddFallback allows adding items when CMS is disabled.
func (n *Navigation) AddFallback(items ...NavigationItem) {
	n.fallback = append(n.fallback, items...)
}

// UseCMS toggles whether to resolve navigation from the CMS menu service.
func (n *Navigation) UseCMS(enabled bool) {
	n.useCMS = enabled && n.menuSvc != nil
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
	if n.menuSvc == nil || !n.useCMS {
		items := orderNavigation(localize(n.translator, n.fallback, locale))
		return n.filter(items, ctx)
	}
	menu, err := n.menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		items := orderNavigation(localize(n.translator, n.fallback, locale))
		return n.filter(items, ctx)
	}
	items := orderNavigation(localize(n.translator, ConvertMenuItems(menu.Items, n.translator, locale), locale))
	return n.filter(items, ctx)
}

// ConvertMenuItems converts MenuItems into NavigationItems applying translation/localization.
func ConvertMenuItems(items []MenuItem, t Translator, locale string) []NavigationItem {
	items = BuildMenuTree(items)
	out := make([]NavigationItem, 0, len(items))
	for _, item := range items {
		translated := NavigationItem{
			ID:            item.ID,
			Type:          strings.TrimSpace(item.Type),
			Label:         item.Label,
			LabelKey:      item.LabelKey,
			GroupTitle:    item.GroupTitle,
			GroupTitleKey: item.GroupTitleKey,
			Icon:          item.Icon,
			Target:        cloneAnyMap(item.Target),
			Badge:         cloneAnyMap(item.Badge),
			Classes:       append([]string{}, item.Classes...),
			Styles:        cloneStringMap(item.Styles),
			Permissions:   append([]string{}, item.Permissions...),
			Locale:        item.Locale,
			Collapsible:   item.Collapsible,
			Collapsed:     item.Collapsed,
			Position:      item.Position,
			order:         item.order,
		}
		if translated.Type == "" {
			translated.Type = MenuItemTypeItem
		}
		translated.Children = ConvertMenuItems(item.Children, t, locale)
		translated.Label = translateValue(translated.Label, translated.LabelKey, t, locale)

		groupTitleKey := translated.GroupTitleKey
		if groupTitleKey == "" {
			groupTitleKey = translated.LabelKey
		}
		groupTitle := translated.GroupTitle
		if groupTitle == "" {
			groupTitle = translated.Label
		}
		translated.GroupTitleKey = groupTitleKey
		translated.GroupTitle = translateValue(groupTitle, groupTitleKey, t, locale)

		if !translated.Collapsible && boolFromTarget(translated.Target, "collapsible") {
			translated.Collapsible = true
		}
		if !translated.Collapsed && boolFromTarget(translated.Target, "collapsed") {
			translated.Collapsed = true
		}

		out = append(out, translated)
	}
	return out
}

func orderNavigation(items []NavigationItem) []NavigationItem {
	posKey := func(item NavigationItem) int {
		if item.Position == nil {
			return int(^uint(0) >> 1)
		}
		return *item.Position
	}
	sort.Slice(items, func(i, j int) bool {
		pi := posKey(items[i])
		pj := posKey(items[j])
		if pi == pj {
			if items[i].order == items[j].order {
				if items[i].ID == items[j].ID {
					return items[i].Label < items[j].Label
				}
				return items[i].ID < items[j].ID
			}
			return items[i].order < items[j].order
		}
		return pi < pj
	})
	for idx := range items {
		items[idx].Children = orderNavigation(items[idx].Children)
	}
	return items
}

func (n *Navigation) filter(items []NavigationItem, ctx context.Context) []NavigationItem {
	if n.authorizer == nil {
		return items
	}
	out := []NavigationItem{}
	lastWasSeparator := false
	for _, item := range items {
		if len(item.Permissions) > 0 && !n.canAny(ctx, item.Permissions) {
			continue
		}
		if len(item.Children) > 0 {
			item.Children = n.filter(item.Children, ctx)
		}
		if item.Type == MenuItemTypeGroup && len(item.Children) == 0 {
			continue
		}
		if (item.Collapsible || boolFromTarget(item.Target, "collapsible")) && len(item.Children) == 0 {
			continue
		}
		if item.Type == MenuItemTypeSeparator {
			if len(out) == 0 || lastWasSeparator {
				continue
			}
			lastWasSeparator = true
			out = append(out, item)
			continue
		}
		lastWasSeparator = false
		out = append(out, item)
	}
	for len(out) > 0 && out[len(out)-1].Type == MenuItemTypeSeparator {
		out = out[:len(out)-1]
	}
	return out
}

func boolFromTarget(target map[string]any, key string) bool {
	if target == nil {
		return false
	}
	raw, ok := target[key]
	if !ok || raw == nil {
		return false
	}
	switch v := raw.(type) {
	case bool:
		return v
	case string:
		return strings.EqualFold(strings.TrimSpace(v), "true")
	default:
		return false
	}
}

func (n *Navigation) localize(items []NavigationItem, locale string) []NavigationItem {
	return localize(n.translator, items, locale)
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

func translateValue(raw, key string, t Translator, locale string) string {
	val := strings.TrimSpace(raw)
	if t == nil {
		if val != "" {
			return val
		}
		return key
	}
	if key != "" {
		translated := strings.TrimSpace(t.Translate(key, locale))
		if translated != "" && translated != key {
			return translated
		}
	}
	if val != "" {
		return val
	}
	return key
}

func localize(t Translator, items []NavigationItem, locale string) []NavigationItem {
	out := []NavigationItem{}
	for _, item := range items {
		if item.Locale != "" && locale != "" && item.Locale != locale {
			continue
		}
		if strings.TrimSpace(item.Type) == "" {
			item.Type = MenuItemTypeItem
		}
		item.Label = translateValue(item.Label, item.LabelKey, t, locale)
		groupTitleKey := item.GroupTitleKey
		if groupTitleKey == "" {
			groupTitleKey = item.LabelKey
		}
		groupTitle := item.GroupTitle
		if groupTitle == "" {
			groupTitle = item.Label
		}
		item.GroupTitleKey = groupTitleKey
		item.GroupTitle = translateValue(groupTitle, groupTitleKey, t, locale)
		item.Children = localize(t, item.Children, locale)
		if item.Type == MenuItemTypeGroup && len(item.Children) == 0 {
			continue
		}
		out = append(out, item)
	}
	return out
}

// MenuHasTarget checks whether a menu tree contains a target.
func MenuHasTarget(items []MenuItem, key string, path string) bool {
	for _, item := range items {
		if TargetMatches(item.Target, key, path) {
			return true
		}
		if MenuHasTarget(item.Children, key, path) {
			return true
		}
	}
	return false
}

// NavigationHasTarget checks whether a navigation tree contains a target.
func NavigationHasTarget(items []NavigationItem, key string, path string) bool {
	for _, item := range items {
		if TargetMatches(item.Target, key, path) {
			return true
		}
		if NavigationHasTarget(item.Children, key, path) {
			return true
		}
	}
	return false
}

// TargetMatches returns true when a target map matches key or path.
func TargetMatches(target map[string]any, key string, path string) bool {
	if len(target) == 0 {
		return false
	}
	if targetKey, ok := target["key"].(string); ok && targetKey == key {
		return true
	}
	if targetPath, ok := target["path"].(string); ok && path != "" && targetPath == path {
		return true
	}
	return false
}

func cloneAnyMap(in map[string]any) map[string]any {
	if in == nil {
		return nil
	}
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func cloneStringMap(in map[string]string) map[string]string {
	if in == nil {
		return nil
	}
	out := make(map[string]string, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}
