package navigation

import (
	"context"
	"strings"

	cms "github.com/goliatone/go-cms"
)

// Menu represents a simple CMS menu tree.
type Menu struct {
	ID       string
	Code     string
	Slug     string
	Location string
	Items    []MenuItem
}

const (
	MenuItemTypeItem      = "item"
	MenuItemTypeGroup     = "group"
	MenuItemTypeSeparator = "separator"
)

// MenuItem describes a single navigation node.
type MenuItem struct {
	ID            string            `json:"id,omitempty"`
	Code          string            `json:"code,omitempty"`
	Type          string            `json:"type,omitempty"`
	Label         string            `json:"label,omitempty"`
	LabelKey      string            `json:"label_key,omitempty"`
	GroupTitle    string            `json:"group_title,omitempty"`
	GroupTitleKey string            `json:"group_title_key,omitempty"`
	Target        map[string]any    `json:"target,omitempty"`
	Icon          string            `json:"icon,omitempty"`
	Position      *int              `json:"position,omitempty"`
	Children      []MenuItem        `json:"children,omitempty"`
	Locale        string            `json:"locale,omitempty"`
	Badge         map[string]any    `json:"badge,omitempty"`
	Permissions   []string          `json:"permissions,omitempty"`
	Menu          string            `json:"menu,omitempty"`
	Classes       []string          `json:"classes,omitempty"`
	Styles        map[string]string `json:"styles,omitempty"`
	ParentID      string            `json:"parent_id,omitempty"`
	ParentCode    string            `json:"parent_code,omitempty"`
	Collapsible   bool              `json:"collapsible,omitempty"`
	Collapsed     bool              `json:"collapsed,omitempty"`
	order         int               `json:"-"`
}

// NavigationItem represents a node in the admin navigation tree.
type NavigationItem struct {
	ID            string            `json:"id,omitempty"`
	Type          string            `json:"type,omitempty"`
	Label         string            `json:"label"`
	LabelKey      string            `json:"label_key,omitempty"`
	GroupTitle    string            `json:"group_title,omitempty"`
	GroupTitleKey string            `json:"group_title_key,omitempty"`
	Icon          string            `json:"icon,omitempty"`
	Target        map[string]any    `json:"target,omitempty"`
	Badge         map[string]any    `json:"badge,omitempty"`
	Children      []NavigationItem  `json:"children,omitempty"`
	Permissions   []string          `json:"permissions,omitempty"`
	Locale        string            `json:"locale,omitempty"`
	Classes       []string          `json:"classes,omitempty"`
	Styles        map[string]string `json:"styles,omitempty"`
	Collapsible   bool              `json:"collapsible,omitempty"`
	Collapsed     bool              `json:"collapsed,omitempty"`
	Position      *int              `json:"position,omitempty"`

	order int `json:"-"`
}

// Authorizer determines whether a subject can perform an action on a resource.
type Authorizer interface {
	Can(ctx context.Context, action string, resource string) bool
}

// Translator resolves i18n keys into localized strings.
type Translator interface {
	Translate(locale, key string, args ...any) (string, error)
}

// MenuService manages CMS-backed menus.
type MenuService interface {
	Menu(ctx context.Context, code, locale string) (*Menu, error)
}

// NormalizeMenuItem ensures menu code is set and derives an ID when missing.
func NormalizeMenuItem(item MenuItem, menuCode string) MenuItem {
	menuCode = canonicalMenuCode(menuCode)
	item.Menu = menuCode

	parent := canonicalMenuItemPath(menuCode, firstNonEmpty(item.ParentID, item.ParentCode))
	item.ParentID = parent
	item.ParentCode = parent

	rawID := strings.TrimSpace(item.ID)
	if rawID == "" {
		if key := strings.TrimSpace(ExtractTargetKey(item.Target)); key != "" {
			rawID = key
		} else {
			rawID = cms.SanitizeMenuItemSegment(firstNonEmpty(item.Label, item.GroupTitle, item.LabelKey, item.GroupTitleKey))
		}
	}
	if parent != "" && rawID != "" {
		if !strings.Contains(rawID, ".") && !strings.Contains(rawID, "/") {
			rawID = parent + "." + cms.SanitizeMenuItemSegment(rawID)
		}
	}
	item.ID = canonicalMenuItemPath(menuCode, rawID)

	if strings.TrimSpace(item.Code) == "" {
		item.Code = item.ID
	} else {
		item.Code = canonicalMenuItemPath(menuCode, item.Code)
	}

	if strings.TrimSpace(item.Type) == "" {
		item.Type = MenuItemTypeItem
	}
	return item
}

// CanonicalMenuKeys returns stable keys used to dedupe menu items across persistent backends.
// It prefers an explicit ID, otherwise falls back to the target key/path when present.
func CanonicalMenuKeys(item MenuItem) []string {
	keys := []string{}
	if id := strings.TrimSpace(item.ID); id != "" {
		keys = append(keys, "path:"+id)
	}
	if code := strings.TrimSpace(item.Code); code != "" {
		keys = append(keys, "code:"+strings.ToLower(code))
	}
	if tgt := ExtractTargetKey(item.Target); tgt != "" {
		keys = append(keys, "target:"+tgt)
	}
	return keys
}

// ExtractTargetKey pulls a stable key from a target map.
func ExtractTargetKey(target map[string]any) string {
	if target == nil {
		return ""
	}
	if key, ok := target["key"].(string); ok && strings.TrimSpace(key) != "" {
		return strings.TrimSpace(key)
	}
	if path, ok := target["path"].(string); ok && strings.TrimSpace(path) != "" {
		return strings.TrimSpace(path)
	}
	return ""
}

// AddMenuKeys records canonical keys for a slice of MenuItems into the provided set.
func AddMenuKeys(items []MenuItem, dest map[string]bool) {
	for _, item := range items {
		for _, key := range CanonicalMenuKeys(item) {
			dest[key] = true
		}
		if len(item.Children) > 0 {
			AddMenuKeys(item.Children, dest)
		}
	}
}

// HasAnyKey checks if any of the provided keys are present in the set.
func HasAnyKey(set map[string]bool, keys []string) bool {
	for _, k := range keys {
		if set[k] {
			return true
		}
	}
	return false
}

func canonicalMenuCode(code string) string {
	return cms.CanonicalMenuCode(code)
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

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

// EnsureMenuUUID is retained for compatibility but no longer maps strings into UUIDs.
// Menu identity is string-first and should use menu codes + item paths.
func EnsureMenuUUID(raw string) string {
	return strings.TrimSpace(raw)
}

// MapMenuIDs normalizes ID and ParentID to menu item paths.
// Deprecated: go-admin no longer maps menu IDs to UUIDs.
func MapMenuIDs(item MenuItem) MenuItem {
	menuCode := canonicalMenuCode(item.Menu)
	if menuCode == "" {
		menuCode = canonicalMenuCode(item.Menu)
	}
	item.Menu = menuCode

	rawID := firstNonEmpty(item.ID, item.Code)
	item.ID = canonicalMenuItemPath(menuCode, rawID)
	item.Code = canonicalMenuItemPath(menuCode, firstNonEmpty(item.Code, item.ID))

	rawParent := firstNonEmpty(item.ParentID, item.ParentCode)
	item.ParentID = canonicalMenuItemPath(menuCode, rawParent)
	item.ParentCode = canonicalMenuItemPath(menuCode, firstNonEmpty(item.ParentCode, item.ParentID))
	return item
}

// BuildMenuTree reconstructs a hierarchy from a flat slice using ParentID metadata.
// If items already contain children, it leaves the structure as-is.
func BuildMenuTree(items []MenuItem) []MenuItem {
	if len(items) == 0 {
		return items
	}
	childIDs := map[string]bool{}
	for _, item := range items {
		for _, child := range item.Children {
			childIDs[strings.TrimSpace(child.ID)] = true
		}
	}
	if len(childIDs) > 0 {
		return items
	}

	index := map[string]*MenuItem{}
	order := []string{}
	roots := []*MenuItem{}
	for i := range items {
		id := strings.TrimSpace(items[i].ID)
		copy := items[i]
		copy.Children = nil
		if id == "" {
			roots = append(roots, &copy)
			continue
		}
		index[id] = &copy
		order = append(order, id)
	}

	childrenByParent := map[string][]*MenuItem{}
	for _, id := range order {
		node := index[id]
		pid := strings.TrimSpace(node.ParentID)
		childrenByParent[pid] = append(childrenByParent[pid], node)
	}

	for _, id := range order {
		node := index[id]
		pid := strings.TrimSpace(node.ParentID)
		if pid == "" || index[pid] == nil {
			roots = append(roots, node)
		}
	}

	var assemble func(node *MenuItem) MenuItem
	assemble = func(node *MenuItem) MenuItem {
		out := *node
		children := childrenByParent[strings.TrimSpace(node.ID)]
		if len(children) == 0 {
			out.Children = nil
			return out
		}
		out.Children = make([]MenuItem, 0, len(children))
		for _, child := range children {
			out.Children = append(out.Children, assemble(child))
		}
		return out
	}

	out := make([]MenuItem, 0, len(roots))
	for _, node := range roots {
		out = append(out, assemble(node))
	}
	return out
}

// DedupeMenuItems filters a slice of MenuItems using canonical keys.
func DedupeMenuItems(items []MenuItem) []MenuItem {
	seen := map[string]bool{}
	out := []MenuItem{}
	for _, item := range items {
		keys := CanonicalMenuKeys(item)
		if HasAnyKey(seen, keys) {
			continue
		}
		for _, key := range keys {
			seen[key] = true
		}
		out = append(out, item)
	}
	return out
}

// MenuItemOrder returns the stored order value used for deterministic sorting.
func MenuItemOrder(item MenuItem) int {
	return item.order
}

// SetMenuItemOrder sets the internal order value used for deterministic sorting.
func SetMenuItemOrder(item *MenuItem, order int) {
	if item != nil {
		item.order = order
	}
}
