package navigation

import (
	"context"
	"path"
	"strings"

	"github.com/goliatone/hashid/pkg/hashid"
	"github.com/google/uuid"
)

// Menu represents a simple CMS menu tree.
type Menu struct {
	ID    string
	Code  string
	Slug  string
	Items []MenuItem
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
	Position      int               `json:"position,omitempty"`
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
	Position      int               `json:"position,omitempty"`

	order int `json:"-"`
}

// Authorizer determines whether a subject can perform an action on a resource.
type Authorizer interface {
	Can(ctx context.Context, action string, resource string) bool
}

// Translator resolves i18n keys into localized strings.
type Translator interface {
	Translate(key, locale string) string
}

// MenuService manages CMS-backed menus.
type MenuService interface {
	Menu(ctx context.Context, code, locale string) (*Menu, error)
}

// NormalizeMenuItem ensures menu code is set and derives an ID when missing.
func NormalizeMenuItem(item MenuItem, menuCode string) MenuItem {
	item.Menu = menuCode
	if strings.TrimSpace(item.ID) == "" {
		if key, ok := item.Target["key"].(string); ok && strings.TrimSpace(key) != "" {
			item.ID = strings.TrimSpace(key)
		} else {
			item.ID = strings.Trim(path.Join(item.ParentID, strings.ToLower(strings.ReplaceAll(item.Label, " ", "-"))), "/")
		}
	}
	if strings.TrimSpace(item.Code) == "" {
		item.Code = strings.TrimSpace(item.ID)
	}
	if strings.TrimSpace(item.ParentCode) == "" {
		item.ParentCode = strings.TrimSpace(item.ParentID)
	}
	return item
}

// CanonicalMenuKeys returns stable keys used to dedupe menu items across persistent backends.
// It prefers an explicit ID, otherwise falls back to the target key/path when present.
func CanonicalMenuKeys(item MenuItem) []string {
	keys := []string{}
	if id := strings.TrimSpace(item.ID); id != "" {
		keys = append(keys, "id:"+id)
	}
	if code := strings.TrimSpace(item.Code); code != "" {
		keys = append(keys, "code:"+strings.ToLower(code))
		keys = append(keys, "id:"+EnsureMenuUUID(code))
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

// DeterministicMenuUUID maps an arbitrary string to a deterministic UUID using hashid.
func DeterministicMenuUUID(raw string) (uuid.UUID, error) {
	return hashid.NewUUID(strings.TrimSpace(raw))
}

// EnsureMenuUUID maps an arbitrary string to a UUID string, preserving valid UUID inputs.
func EnsureMenuUUID(raw string) string {
	return ensureMenuUUIDString(raw)
}

func ensureMenuUUIDString(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if parsed, err := uuid.Parse(raw); err == nil {
		return parsed.String()
	}
	if mapped, err := DeterministicMenuUUID(raw); err == nil {
		return mapped.String()
	}
	return raw
}

// MapMenuIDs applies deterministic UUID mapping to ID and ParentID when they are not valid UUIDs.
func MapMenuIDs(item MenuItem) MenuItem {
	rawID := strings.TrimSpace(item.ID)
	if rawID == "" {
		rawID = strings.TrimSpace(item.Code)
		item.ID = rawID
	}
	if strings.TrimSpace(item.Code) == "" {
		item.Code = rawID
	}
	if rawID != "" {
		item.ID = ensureMenuUUIDString(rawID)
	}

	rawParent := strings.TrimSpace(item.ParentID)
	if rawParent == "" {
		rawParent = strings.TrimSpace(item.ParentCode)
		item.ParentID = rawParent
	}
	if strings.TrimSpace(item.ParentCode) == "" {
		item.ParentCode = rawParent
	}
	if rawParent != "" {
		item.ParentID = ensureMenuUUIDString(rawParent)
	}
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
