package admin

import (
	"context"
	"errors"
	"strings"

	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

// GoCMSMenuAdapter maps the go-cms menu service into the Admin CMSMenuService contract.
//
// It enforces a string-first identity:
// - menu identity: menu code (sanitized to satisfy go-cms menu code validation)
// - item identity: dot-paths (menuCode + "." + segments)
//
// UUIDs remain a go-cms persistence detail and are never supplied by go-admin.
type GoCMSMenuAdapter struct {
	service cms.MenuService
}

// NewGoCMSMenuAdapter wraps a go-cms MenuService.
func NewGoCMSMenuAdapter(service cms.MenuService) *GoCMSMenuAdapter {
	if service == nil {
		return nil
	}
	return &GoCMSMenuAdapter{service: service}
}

// NewGoCMSMenuAdapterFromAny wraps a go-cms MenuService exposed as any (used by adapter hooks).
func NewGoCMSMenuAdapterFromAny(service any) *GoCMSMenuAdapter {
	svc, ok := service.(cms.MenuService)
	if !ok || svc == nil {
		return nil
	}
	return &GoCMSMenuAdapter{service: svc}
}

// GoCMSMenuService exposes the underlying go-cms menu service (used by quickstart seeding).
func (a *GoCMSMenuAdapter) GoCMSMenuService() cms.MenuService {
	if a == nil {
		return nil
	}
	return a.service
}

// CreateMenu ensures a menu exists.
func (a *GoCMSMenuAdapter) CreateMenu(ctx context.Context, code string) (*Menu, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	menuCode := cms.CanonicalMenuCode(code)
	if _, err := a.service.UpsertMenu(ctx, menuCode, nil, uuid.Nil); err != nil {
		return nil, err
	}
	return &Menu{ID: menuCode, Code: menuCode, Slug: menuCode}, nil
}

// AddMenuItem upserts an item using go-cms path-based APIs.
func (a *GoCMSMenuAdapter) AddMenuItem(ctx context.Context, menuCode string, item MenuItem) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	menuCode = cms.CanonicalMenuCode(menuCode)

	path, parentPath, err := deriveMenuItemPaths(menuCode, item)
	if err != nil {
		return err
	}

	itemType := normalizeMenuItemType(item.Type)
	target := mergeMenuTarget(item)
	if itemType == MenuItemTypeGroup || itemType == MenuItemTypeSeparator {
		target = nil
	}

	// go-cms menus are path-addressed; Collapsible/Collapsed and ParentPath are safe to upsert
	// even when parents/children are not yet present (order-independent seeding).
	input := cms.UpsertMenuItemByPathInput{
		Path:        path,
		ParentPath:  parentPath,
		Position:    cloneIntPtr(item.Position),
		Type:        itemType,
		Target:      target,
		Icon:        strings.TrimSpace(item.Icon),
		Badge:       cloneAnyMap(item.Badge),
		Permissions: cloneStringSliceOrNil(item.Permissions),
		Classes:     cloneStringSliceOrNil(item.Classes),
		Styles:      cloneStringMapOrNil(item.Styles),
		Collapsible: item.Collapsible,
		Collapsed:   item.Collapsed,
		Metadata: map[string]any{
			"path":        path,
			"parent_path": parentPath,
		},
		Actor: uuid.Nil,
	}

	locale := strings.TrimSpace(item.Locale)
	if locale == "" {
		input.AllowMissingTranslations = true
	} else if itemType != MenuItemTypeSeparator {
		label, labelKey, groupTitle, groupTitleKey := normalizeMenuItemTranslationFields(item)
		input.Translations = []cms.MenuItemTranslationInput{{
			Locale:        locale,
			Label:         label,
			LabelKey:      labelKey,
			GroupTitle:    groupTitle,
			GroupTitleKey: groupTitleKey,
		}}
	}

	_, err = a.service.UpsertMenuItemByPath(ctx, input)
	return err
}

// UpdateMenuItem updates an item by path and refreshes its translation for the provided locale.
func (a *GoCMSMenuAdapter) UpdateMenuItem(ctx context.Context, menuCode string, item MenuItem) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	menuCode = cms.CanonicalMenuCode(menuCode)

	path, parent, err := deriveMenuItemPaths(menuCode, item)
	if err != nil {
		return err
	}
	update := cms.UpdateMenuItemByPathInput{Actor: uuid.Nil}

	if item.Position != nil {
		update.Position = cloneIntPtr(item.Position)
	}
	if trimmed := strings.TrimSpace(item.Type); trimmed != "" {
		normalized := normalizeMenuItemType(trimmed)
		update.Type = &normalized
	}
	if trimmed := strings.TrimSpace(item.Icon); trimmed != "" {
		update.Icon = &trimmed
	}
	if item.Badge != nil {
		update.Badge = cloneAnyMap(item.Badge)
	}
	if item.Permissions != nil {
		update.Permissions = cloneStringSliceOrNil(item.Permissions)
	}
	if item.Classes != nil {
		update.Classes = cloneStringSliceOrNil(item.Classes)
	}
	if item.Styles != nil {
		update.Styles = cloneStringMapOrNil(item.Styles)
	}
	if item.Collapsible {
		v := true
		update.Collapsible = &v
	}
	if item.Collapsed {
		v := true
		update.Collapsed = &v
	}
	if item.Target != nil && len(item.Target) > 0 {
		itemType := normalizeMenuItemType(item.Type)
		tgt := mergeMenuTarget(item)
		if itemType != MenuItemTypeGroup && itemType != MenuItemTypeSeparator {
			update.Target = tgt
		}
	}

	if parent != "" {
		update.ParentPath = &parent
	}
	update.Metadata = map[string]any{"path": path, "parent_path": parent}

	if _, err := a.service.UpdateMenuItemByPath(ctx, menuCode, path, update); err != nil {
		return err
	}

	locale := strings.TrimSpace(item.Locale)
	if locale == "" {
		return nil
	}
	if strings.TrimSpace(item.Label) == "" && strings.TrimSpace(item.LabelKey) == "" && strings.TrimSpace(item.GroupTitle) == "" && strings.TrimSpace(item.GroupTitleKey) == "" {
		return nil
	}
	label, labelKey, groupTitle, groupTitleKey := normalizeMenuItemTranslationFields(item)
	return a.service.UpsertMenuItemTranslationByPath(ctx, menuCode, path, cms.MenuItemTranslationInput{
		Locale:        locale,
		Label:         label,
		LabelKey:      labelKey,
		GroupTitle:    groupTitle,
		GroupTitleKey: groupTitleKey,
	})
}

// DeleteMenuItem removes an item via go-cms path-based APIs.
func (a *GoCMSMenuAdapter) DeleteMenuItem(ctx context.Context, menuCode, id string) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	menuCode = cms.CanonicalMenuCode(menuCode)
	path := canonicalMenuItemPath(menuCode, id)
	if path == "" {
		return ErrNotFound
	}
	return a.service.DeleteMenuItemByPath(ctx, menuCode, path, uuid.Nil, true)
}

// ReorderMenu updates item positions while preserving their parents.
//
// orderedIDs are treated as item paths (preferred) or relative item IDs.
func (a *GoCMSMenuAdapter) ReorderMenu(ctx context.Context, menuCode string, orderedIDs []string) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	menuCode = cms.CanonicalMenuCode(menuCode)

	menu, err := a.Menu(ctx, menuCode, "")
	if err != nil {
		return err
	}

	parentByPath := map[string]string{}
	var walk func(items []MenuItem, parent string)
	walk = func(items []MenuItem, parent string) {
		for _, it := range items {
			path := canonicalMenuItemPath(menuCode, it.ID)
			parentByPath[path] = parent
			if len(it.Children) > 0 {
				walk(it.Children, path)
			}
		}
	}
	walk(menu.Items, "")

	for idx, raw := range orderedIDs {
		path := canonicalMenuItemPath(menuCode, raw)
		position := idx + 1
		update := cms.UpdateMenuItemByPathInput{Actor: uuid.Nil, Position: &position}
		if parent := parentByPath[path]; parent != "" {
			update.ParentPath = &parent
		}
		if _, err := a.service.UpdateMenuItemByPath(ctx, menuCode, path, update); err != nil {
			return err
		}
	}
	return nil
}

// Menu resolves a localized navigation tree from go-cms.
func (a *GoCMSMenuAdapter) Menu(ctx context.Context, code, locale string) (*Menu, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	menuCode := cms.CanonicalMenuCode(code)

	nodes, err := a.service.ResolveNavigation(ctx, menuCode, locale)
	if err != nil {
		return nil, err
	}
	items := convertPublicNavigationNodes(nodes, menuCode, "")
	return &Menu{ID: menuCode, Code: menuCode, Slug: menuCode, Location: code, Items: items}, nil
}

// MenuByLocation resolves a localized navigation tree using menu locations.
func (a *GoCMSMenuAdapter) MenuByLocation(ctx context.Context, location, locale string) (*Menu, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	trimmed := strings.TrimSpace(location)
	menuCode := cms.CanonicalMenuCode(trimmed)
	resolvedLocation := trimmed

	info, err := a.service.GetMenuByLocation(ctx, trimmed)
	if err != nil {
		if !errors.Is(err, cms.ErrMenuNotFound) {
			return nil, err
		}
		nodes, resolveErr := a.service.ResolveNavigation(ctx, menuCode, locale)
		if resolveErr != nil {
			return nil, resolveErr
		}
		items := convertPublicNavigationNodes(nodes, menuCode, "")
		return &Menu{ID: menuCode, Code: menuCode, Slug: menuCode, Location: resolvedLocation, Items: items}, nil
	}

	if info != nil {
		menuCode = cms.CanonicalMenuCode(info.Code)
		if loc := strings.TrimSpace(info.Location); loc != "" {
			resolvedLocation = loc
		}
	}

	nodes, err := a.service.ResolveNavigationByLocation(ctx, resolvedLocation, locale)
	if err != nil {
		nodes, err = a.service.ResolveNavigation(ctx, menuCode, locale)
	}
	if err != nil {
		return nil, err
	}
	items := convertPublicNavigationNodes(nodes, menuCode, "")
	return &Menu{ID: menuCode, Code: menuCode, Slug: menuCode, Location: resolvedLocation, Items: items}, nil
}

// ResetMenuContext resets the menu contents.
// It is used by quickstart navigation tooling to allow rebuilds during development.
func (a *GoCMSMenuAdapter) ResetMenuContext(ctx context.Context, code string) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	if ctx == nil {
		ctx = context.Background()
	}
	menuCode := cms.CanonicalMenuCode(code)
	return a.service.ResetMenuByCode(ctx, menuCode, uuid.Nil, true)
}

func (a *GoCMSMenuAdapter) String() string {
	if a == nil || a.service == nil {
		return "GoCMSMenuAdapter{nil}"
	}
	return "GoCMSMenuAdapter{go-cms}"
}

func canonicalMenuItemPath(menuCode, raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	path, err := cms.CanonicalMenuItemPath(menuCode, trimmed)
	if err != nil {
		return ""
	}
	return path
}

func normalizeMenuItemType(raw string) string {
	return NormalizeMenuItemType(raw)
}

func normalizeMenuItemTranslationFields(item MenuItem) (label, labelKey, groupTitle, groupTitleKey string) {
	return NormalizeMenuItemTranslationFields(item)
}

func deriveMenuItemPaths(menuCode string, item MenuItem) (string, string, error) {
	derived, err := cms.DeriveMenuItemPaths(
		menuCode,
		item.ID,
		firstNonEmpty(item.ParentID, item.ParentCode),
		firstNonEmpty(item.Label, item.GroupTitle, item.LabelKey, item.GroupTitleKey),
	)
	if err != nil {
		return "", "", err
	}
	return derived.Path, derived.ParentPath, nil
}

func cloneIntPtr(pos *int) *int {
	if pos == nil {
		return nil
	}
	v := *pos
	return &v
}

func cloneStringSliceOrNil(in []string) []string {
	if in == nil {
		return nil
	}
	return append([]string{}, in...)
}

func cloneStringMapOrNil(in map[string]string) map[string]string {
	if in == nil {
		return nil
	}
	return cloneStringMap(in)
}

func convertPublicNavigationNodes(nodes []cms.NavigationNode, menuCode, parentPath string) []MenuItem {
	out := make([]MenuItem, 0, len(nodes))
	for _, node := range nodes {
		path := navigationNodePath(node, menuCode)
		if path == "" {
			if seg := cms.SanitizeMenuItemSegment(node.Label); seg != "" {
				path = canonicalMenuItemPath(menuCode, seg)
			}
		}
		pos := node.Position
		item := MenuItem{
			ID:            path,
			Code:          path,
			Type:          normalizeMenuItemType(node.Type),
			Label:         node.Label,
			LabelKey:      strings.TrimSpace(node.LabelKey),
			GroupTitle:    node.GroupTitle,
			GroupTitleKey: strings.TrimSpace(node.GroupTitleKey),
			Target:        cloneAnyMap(node.Target),
			Icon:          strings.TrimSpace(node.Icon),
			Badge:         cloneAnyMap(node.Badge),
			Permissions:   cloneStringSliceOrNil(node.Permissions),
			Classes:       cloneStringSliceOrNil(node.Classes),
			Styles:        cloneStringMapOrNil(node.Styles),
			Collapsible:   node.Collapsible,
			Collapsed:     node.Collapsed,
			Position:      cloneIntPtr(&pos),
			Menu:          menuCode,
			ParentID:      parentPath,
			ParentCode:    parentPath,
		}

		if item.Target == nil {
			item.Target = map[string]any{}
		}
		if node.URL != "" {
			if _, ok := item.Target["url"]; !ok {
				item.Target["url"] = node.URL
			}
		}
		if _, ok := item.Target["key"]; !ok {
			item.Target["key"] = path
		}

		item.Children = convertPublicNavigationNodes(node.Children, menuCode, path)
		out = append(out, item)
	}
	return out
}

func navigationNodePath(node cms.NavigationNode, menuCode string) string {
	if node.Metadata != nil {
		if v, ok := node.Metadata["path"].(string); ok {
			if trimmed := strings.TrimSpace(v); trimmed != "" {
				return canonicalMenuItemPath(menuCode, trimmed)
			}
		}
	}
	if node.Target != nil {
		if v, ok := node.Target["key"].(string); ok {
			if trimmed := strings.TrimSpace(v); trimmed != "" {
				return canonicalMenuItemPath(menuCode, trimmed)
			}
		}
	}
	return ""
}

func mergeMenuTarget(item MenuItem) map[string]any {
	return cloneAnyMap(item.Target)
}
