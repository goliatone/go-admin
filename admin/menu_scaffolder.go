package admin

import (
	"context"
	"fmt"
	"strings"
)

// EnsureMenuParentsOptions controls how parent/group menu items are scaffolded.
type EnsureMenuParentsOptions struct {
	MenuSvc  CMSMenuService
	MenuCode string
	Parents  []MenuItem
	Locale   string
}

// EnsureMenuParents upserts parent/group/collapsible nodes with deterministic IDs before children are added.
// It tolerates existing menus/items (idempotent) and maps IDs/parents to UUIDs for adapter compatibility.
func EnsureMenuParents(ctx context.Context, opts EnsureMenuParentsOptions) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if opts.MenuSvc == nil {
		return fmt.Errorf("MenuSvc is required")
	}
	menuCode := NormalizeMenuSlug(opts.MenuCode)
	if menuCode == "" {
		menuCode = NormalizeMenuSlug("admin.main")
	}
	if _, err := opts.MenuSvc.CreateMenu(ctx, menuCode); err != nil {
		if _, fetchErr := opts.MenuSvc.Menu(ctx, menuCode, opts.Locale); fetchErr != nil {
			return err
		}
	}

	existing := map[string]bool{}
	if menu, err := opts.MenuSvc.Menu(ctx, menuCode, opts.Locale); err == nil && menu != nil {
		addMenuKeys(menu.Items, existing)
	}

	for _, parent := range opts.Parents {
		parent.Menu = menuCode
		if strings.TrimSpace(parent.Locale) == "" && strings.TrimSpace(opts.Locale) != "" {
			parent.Locale = strings.TrimSpace(opts.Locale)
		}
		parent = normalizeMenuItem(parent, menuCode)
		keys := canonicalMenuKeys(parent)
		if hasAnyKey(existing, keys) {
			continue
		}
		if err := opts.MenuSvc.AddMenuItem(ctx, menuCode, parent); err != nil {
			return err
		}
		for _, key := range keys {
			existing[key] = true
		}
	}
	return nil
}
