package admin

import (
	"context"
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
	menuCode := canonicalMenuCode(code)
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
	menuCode = canonicalMenuCode(menuCode)

	path := resolveMenuItemPath(menuCode, item)
	parentPath := resolveMenuItemParentPath(menuCode, item)

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

	_, err := a.service.UpsertMenuItemByPath(ctx, input)
	return err
}

// UpdateMenuItem updates an item by path and refreshes its translation for the provided locale.
func (a *GoCMSMenuAdapter) UpdateMenuItem(ctx context.Context, menuCode string, item MenuItem) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	menuCode = canonicalMenuCode(menuCode)

	path := resolveMenuItemPath(menuCode, item)
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

	parent := resolveMenuItemParentPath(menuCode, item)
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
	menuCode = canonicalMenuCode(menuCode)
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
	menuCode = canonicalMenuCode(menuCode)

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
	menuCode := canonicalMenuCode(code)

	nodes, err := a.service.ResolveNavigation(ctx, menuCode, locale)
	if err != nil {
		return nil, err
	}
	items := convertPublicNavigationNodes(nodes, menuCode, "")
	return &Menu{ID: menuCode, Code: menuCode, Slug: menuCode, Items: items}, nil
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
	menuCode := canonicalMenuCode(code)
	return a.service.ResetMenuByCode(ctx, menuCode, uuid.Nil, true)
}

func (a *GoCMSMenuAdapter) String() string {
	if a == nil || a.service == nil {
		return "GoCMSMenuAdapter{nil}"
	}
	return "GoCMSMenuAdapter{go-cms}"
}

func canonicalMenuCode(code string) string {
	slug := NormalizeMenuSlug(code)
	if slug == "" {
		slug = strings.TrimSpace(code)
	}
	slug = strings.ReplaceAll(slug, ".", "_")
	slug = strings.Trim(slug, "-_")
	return slug
}

func canonicalMenuItemPath(menuCode, raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	menuCode = canonicalMenuCode(menuCode)

	path := sanitizeDotPath(raw)
	if path == "" {
		return ""
	}
	if path == menuCode || strings.HasPrefix(path, menuCode+".") {
		return path
	}
	return menuCode + "." + strings.TrimPrefix(path, ".")
}

func resolveMenuItemParentPath(menuCode string, item MenuItem) string {
	parent := strings.TrimSpace(firstNonEmpty(item.ParentID, item.ParentCode))
	if parent == "" {
		return ""
	}
	return canonicalMenuItemPath(menuCode, parent)
}

func resolveMenuItemPath(menuCode string, item MenuItem) string {
	if strings.TrimSpace(item.ID) != "" {
		return canonicalMenuItemPath(menuCode, item.ID)
	}
	parent := resolveMenuItemParentPath(menuCode, item)
	seed := firstNonEmpty(strings.TrimSpace(item.Label), strings.TrimSpace(item.GroupTitle), strings.TrimSpace(item.LabelKey), strings.TrimSpace(item.GroupTitleKey))
	seg := sanitizePathSegment(seed)
	if seg == "" {
		seg = "item"
	}
	if parent != "" {
		return parent + "." + seg
	}
	return canonicalMenuItemPath(menuCode, seg)
}

func sanitizeDotPath(raw string) string {
	normalized := strings.ReplaceAll(strings.TrimSpace(raw), "/", ".")
	normalized = strings.Trim(normalized, ".")
	if normalized == "" {
		return ""
	}
	parts := strings.Split(normalized, ".")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		seg := sanitizePathSegment(p)
		if seg == "" {
			continue
		}
		out = append(out, seg)
	}
	return strings.Join(out, ".")
}

func sanitizePathSegment(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	var b strings.Builder
	b.Grow(len(raw))
	lastDash := false
	for _, r := range raw {
		switch {
		case r >= 'a' && r <= 'z':
			b.WriteRune(r)
			lastDash = false
		case r >= 'A' && r <= 'Z':
			b.WriteRune(r + ('a' - 'A'))
			lastDash = false
		case r >= '0' && r <= '9':
			b.WriteRune(r)
			lastDash = false
		case r == '_' || r == '-':
			b.WriteRune(r)
			lastDash = false
		default:
			if !lastDash {
				b.WriteRune('-')
				lastDash = true
			}
		}
	}
	seg := strings.Trim(b.String(), "-_")
	return seg
}

func normalizeMenuItemType(raw string) string {
	switch strings.TrimSpace(raw) {
	case MenuItemTypeGroup:
		return MenuItemTypeGroup
	case MenuItemTypeSeparator:
		return MenuItemTypeSeparator
	default:
		return MenuItemTypeItem
	}
}

func normalizeMenuItemTranslationFields(item MenuItem) (label, labelKey, groupTitle, groupTitleKey string) {
	label = strings.TrimSpace(item.Label)
	labelKey = strings.TrimSpace(item.LabelKey)
	groupTitle = strings.TrimSpace(item.GroupTitle)
	groupTitleKey = strings.TrimSpace(item.GroupTitleKey)

	if label == "" && labelKey != "" {
		label = labelKey
	}
	if groupTitle == "" && groupTitleKey != "" {
		groupTitle = groupTitleKey
	}
	return
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
			path = canonicalMenuItemPath(menuCode, sanitizePathSegment(node.Label))
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
