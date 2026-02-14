package admin

import "strings"

func validateMenuParentLink(itemID, parentID string) error {
	canonicalID := strings.TrimSpace(itemID)
	canonicalParent := strings.TrimSpace(parentID)
	if canonicalID == "" || canonicalParent == "" {
		return nil
	}
	if canonicalID != canonicalParent {
		return nil
	}
	return validationDomainError("menu item parent cannot reference itself", map[string]any{
		"id":        canonicalID,
		"parent_id": canonicalParent,
	})
}

func menuStateWouldCreateCycle(items map[string]MenuItem, itemID, parentID string) bool {
	parentByID := map[string]string{}
	for id, item := range items {
		canonicalID := strings.TrimSpace(id)
		if canonicalID == "" {
			continue
		}
		parentByID[canonicalID] = strings.TrimSpace(item.ParentID)
	}
	return menuParentMapWouldCreateCycle(parentByID, itemID, parentID)
}

func menuTreeWouldCreateCycle(items []MenuItem, itemID, parentID string) bool {
	parentByID := map[string]string{}
	collectMenuParents(items, parentByID)
	return menuParentMapWouldCreateCycle(parentByID, itemID, parentID)
}

func collectMenuParents(items []MenuItem, out map[string]string) {
	for _, item := range items {
		id := strings.TrimSpace(item.ID)
		if id != "" {
			out[id] = strings.TrimSpace(item.ParentID)
		}
		if len(item.Children) > 0 {
			collectMenuParents(item.Children, out)
		}
	}
}

func menuParentMapWouldCreateCycle(parentByID map[string]string, itemID, parentID string) bool {
	canonicalID := strings.TrimSpace(itemID)
	canonicalParent := strings.TrimSpace(parentID)
	if canonicalID == "" || canonicalParent == "" {
		return false
	}
	if canonicalID == canonicalParent {
		return true
	}
	parentByID[canonicalID] = canonicalParent
	visited := map[string]bool{}
	current := canonicalParent
	for current != "" {
		if current == canonicalID {
			return true
		}
		if visited[current] {
			// Existing malformed graph already loops.
			return true
		}
		visited[current] = true
		next, ok := parentByID[current]
		if !ok {
			return false
		}
		current = strings.TrimSpace(next)
	}
	return false
}
