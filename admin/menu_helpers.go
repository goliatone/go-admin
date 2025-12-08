package admin

import (
	"path"
	"strings"

	"github.com/goliatone/hashid/pkg/hashid"
	"github.com/google/uuid"
)

// normalizeMenuItem ensures menu code is set and derives an ID when missing.
func normalizeMenuItem(item MenuItem, menuCode string) MenuItem {
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

// canonicalMenuKeys returns stable keys used to dedupe menu items across persistent backends.
// It prefers an explicit ID, otherwise falls back to the target key/path when present.
func canonicalMenuKeys(item MenuItem) []string {
	keys := []string{}
	if id := strings.TrimSpace(item.ID); id != "" {
		keys = append(keys, "id:"+id)
	}
	if code := strings.TrimSpace(item.Code); code != "" {
		keys = append(keys, "code:"+strings.ToLower(code))
		keys = append(keys, "id:"+ensureMenuUUIDString(code))
	}
	if tgt := extractTargetKey(item.Target); tgt != "" {
		keys = append(keys, "target:"+tgt)
	}
	return keys
}

func extractTargetKey(target map[string]any) string {
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

func addMenuKeys(items []MenuItem, dest map[string]bool) {
	for _, item := range items {
		for _, key := range canonicalMenuKeys(item) {
			dest[key] = true
		}
		if len(item.Children) > 0 {
			addMenuKeys(item.Children, dest)
		}
	}
}

func hasAnyKey(set map[string]bool, keys []string) bool {
	for _, k := range keys {
		if set[k] {
			return true
		}
	}
	return false
}

// deterministicMenuUUID maps an arbitrary string to a deterministic UUID using hashid.
func deterministicMenuUUID(raw string) (uuid.UUID, error) {
	return hashid.NewUUID(strings.TrimSpace(raw))
}

// DeterministicMenuUUID is an exported helper for hosts to derive stable menu UUIDs from strings.
func DeterministicMenuUUID(raw string) (uuid.UUID, error) {
	return deterministicMenuUUID(raw)
}

// ensureMenuUUIDString returns a UUID string for an ID-like value; if already a UUID it is returned as-is.
// When not a valid UUID, a deterministic UUID derived from the raw string is returned.
func ensureMenuUUIDString(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if parsed, err := uuid.Parse(raw); err == nil {
		return parsed.String()
	}
	if mapped, err := deterministicMenuUUID(raw); err == nil {
		return mapped.String()
	}
	return raw
}

// EnsureMenuUUID maps an arbitrary string to a UUID string, preserving valid UUID inputs.
func EnsureMenuUUID(raw string) string {
	return ensureMenuUUIDString(raw)
}

// mapMenuIDs applies deterministic UUID mapping to ID and ParentID when they are not valid UUIDs.
func mapMenuIDs(item MenuItem) MenuItem {
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

// buildMenuTree reconstructs a hierarchy from a flat slice using ParentID metadata.
// If items already contain children, it leaves the structure as-is.
func buildMenuTree(items []MenuItem) []MenuItem {
	if len(items) == 0 {
		return items
	}
	childIDs := map[string]bool{}
	for _, item := range items {
		for _, child := range item.Children {
			childIDs[strings.TrimSpace(child.ID)] = true
		}
	}
	// If any child IDs already exist, assume the tree is already nested.
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

// dedupeMenuItems filters a slice of MenuItems using canonical keys.
func dedupeMenuItems(items []MenuItem) []MenuItem {
	seen := map[string]bool{}
	out := []MenuItem{}
	for _, item := range items {
		keys := canonicalMenuKeys(item)
		if hasAnyKey(seen, keys) {
			continue
		}
		for _, key := range keys {
			seen[key] = true
		}
		out = append(out, item)
	}
	return out
}
