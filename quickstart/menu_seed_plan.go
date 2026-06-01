package quickstart

import (
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

const (
	MenuTargetGeneratedByKey  = "_generated_by"
	MenuTargetGeneratedIDKey  = "_generated_id"
	MenuTargetGeneratedOwner  = "quickstart"
	MenuTargetGeneratedSource = "quickstart.menu_seed_plan"
)

// MenuSeedItemTransform can adjust expected generated menu rows before they are normalized.
type MenuSeedItemTransform func(moduleID string, item *admin.MenuItem)

// MenuSeedPlanOptions describes how quickstart computes expected generated menu rows.
type MenuSeedPlanOptions struct {
	MenuCode string
	Locale   string

	Modules   []admin.Module
	BaseItems []admin.MenuItem

	ParentItems           []admin.MenuItem
	ReplaceDefaultParents bool

	ModuleParentOverrides map[string]string
	TargetParentOverrides map[string]string
	ItemTransforms        []MenuSeedItemTransform
}

// MenuSeedPlan is the canonical expected quickstart-generated menu tree before persistence.
type MenuSeedPlan struct {
	MenuCode string           `json:"menu_code"`
	Locale   string           `json:"locale"`
	Items    []admin.MenuItem `json:"items"`
}

// BuildMenuSeedPlan computes the expected generated quickstart menu rows.
func BuildMenuSeedPlan(opts MenuSeedPlanOptions) (MenuSeedPlan, error) {
	menuCode := admin.NormalizeMenuSlug(strings.TrimSpace(opts.MenuCode))
	if menuCode == "" {
		menuCode = admin.NormalizeMenuSlug(DefaultNavMenuCode)
	}
	locale := strings.TrimSpace(opts.Locale)
	if locale == "" {
		locale = "en"
	}

	items := []admin.MenuItem{}
	if opts.ReplaceDefaultParents {
		items = append(items, cloneMenuItems(opts.ParentItems)...)
	} else {
		items = append(items, DefaultMenuParents(menuCode)...)
		items = append(items, cloneMenuItems(opts.ParentItems)...)
	}
	for _, item := range cloneMenuItems(opts.BaseItems) {
		applyMenuSeedTargetParentOverride(&item, opts)
		items = append(items, item)
	}

	for _, mod := range opts.Modules {
		if mod == nil {
			continue
		}
		contributor, ok := mod.(interface{ MenuItems(string) []admin.MenuItem })
		if !ok || contributor == nil {
			continue
		}
		moduleID := strings.TrimSpace(mod.Manifest().ID)
		for _, item := range contributor.MenuItems(locale) {
			applyMenuSeedParentOverrides(&item, moduleID, opts)
			for _, transform := range opts.ItemTransforms {
				if transform != nil {
					transform(moduleID, &item)
				}
			}
			items = append(items, item)
		}
	}

	return MenuSeedPlan{
		MenuCode: menuCode,
		Locale:   locale,
		Items:    dedupeMenuItems(items),
	}, nil
}

func applyMenuSeedParentOverrides(item *admin.MenuItem, moduleID string, opts MenuSeedPlanOptions) {
	if item == nil {
		return
	}
	if parent := strings.TrimSpace(opts.ModuleParentOverrides[moduleID]); parent != "" {
		item.ParentID = parent
	}
	applyMenuSeedTargetParentOverride(item, opts)
}

func applyMenuSeedTargetParentOverride(item *admin.MenuItem, opts MenuSeedPlanOptions) {
	if item == nil {
		return
	}
	if key := stringTargetValue(item.Target, "key"); key != "" {
		if parent := strings.TrimSpace(opts.TargetParentOverrides[key]); parent != "" {
			item.ParentID = parent
		}
	}
}

func cloneMenuItems(items []admin.MenuItem) []admin.MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		out = append(out, cloneMenuItem(item))
	}
	return out
}

func cloneMenuItem(item admin.MenuItem) admin.MenuItem {
	item.Target = cloneAnyMap(item.Target)
	item.Badge = cloneAnyMap(item.Badge)
	item.Classes = append([]string{}, item.Classes...)
	item.Styles = cloneStringMap(item.Styles)
	item.Permissions = append([]string{}, item.Permissions...)
	item.Children = cloneMenuItems(item.Children)
	if item.Position != nil {
		position := *item.Position
		item.Position = &position
	}
	if item.URLOverride != nil {
		urlOverride := *item.URLOverride
		item.URLOverride = &urlOverride
	}
	return item
}

func generatedMenuItem(item admin.MenuItem, menuCode string) admin.MenuItem {
	item.Target = cleanGeneratedMenuTarget(cloneAnyMap(item.Target))
	if item.Target == nil {
		item.Target = map[string]any{}
	}
	item.Target[MenuTargetGeneratedByKey] = MenuTargetGeneratedOwner
	item.Target[MenuTargetGeneratedIDKey] = generatedMenuItemIdentity(item, menuCode)
	return item
}

func generatedMenuItemIdentity(item admin.MenuItem, menuCode string) string {
	if id := strings.TrimSpace(item.ID); id != "" {
		return id
	}
	if key := stringTargetValue(item.Target, "key"); key != "" {
		return key
	}
	if path := stringTargetValue(item.Target, "path"); path != "" {
		return path
	}
	label := firstNonEmpty(item.Label, item.GroupTitle, item.LabelKey, item.GroupTitleKey)
	if label != "" {
		return strings.TrimSpace(menuCode) + ":" + strings.TrimSpace(label)
	}
	return fmt.Sprintf("%s:generated", strings.TrimSpace(menuCode))
}

func cleanGeneratedMenuTarget(target map[string]any) map[string]any {
	if len(target) == 0 {
		return nil
	}
	out := cloneAnyMap(target)
	for _, key := range requestScopedMenuTargetKeys() {
		delete(out, key)
	}
	return out
}

func requestScopedMenuTargetKeys() []string {
	return []string{
		"enabled",
		"disabled",
		"aria_disabled",
		"disabled_reason",
		"disabled_reason_code",
		"missing_permission",
	}
}
