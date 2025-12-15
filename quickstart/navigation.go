package quickstart

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/goliatone/go-admin/admin"
	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

// ErrSeedNavigationRequiresGoCMS is returned when SeedNavigation is invoked with a non go-cms backed menu service.
var ErrSeedNavigationRequiresGoCMS = fmt.Errorf("quickstart: SeedNavigation requires a go-cms backed menu service")

// goCMSMenuServiceProvider exposes the raw go-cms menu service behind the admin CMSMenuService adapter.
//
// Implemented by admin.GoCMSMenuAdapter.
type goCMSMenuServiceProvider interface {
	GoCMSMenuService() cms.MenuService
}

// SeedNavigationOptions drives the quickstart menu seeding workflow.
type SeedNavigationOptions struct {
	MenuSvc    admin.CMSMenuService
	MenuCode   string
	Items      []admin.MenuItem
	Reset      bool
	ResetEnv   string
	Locale     string
	Logf       func(format string, args ...any)
	SkipLogger bool

	// AutoCreateParents allows seeds to omit intermediate path segments; go-cms will scaffold them as group nodes.
	AutoCreateParents bool
}

// SeedNavigation seeds a menu using go-cms cms.SeedMenu.
func SeedNavigation(ctx context.Context, opts SeedNavigationOptions) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if opts.MenuSvc == nil {
		return fmt.Errorf("MenuSvc is required")
	}

	provider, ok := opts.MenuSvc.(goCMSMenuServiceProvider)
	if !ok || provider.GoCMSMenuService() == nil {
		return ErrSeedNavigationRequiresGoCMS
	}
	menus := provider.GoCMSMenuService()

	menuCode := canonicalMenuCode(opts.MenuCode)
	if menuCode == "" {
		menuCode = canonicalMenuCode("admin")
	}

	resetEnv := opts.ResetEnv
	if resetEnv == "" {
		resetEnv = "RESET_NAV_MENU"
	}
	reset := opts.Reset || strings.EqualFold(os.Getenv(resetEnv), "true")

	logf := opts.Logf
	if logf == nil && !opts.SkipLogger {
		logf = log.Printf
	}

	locale := strings.TrimSpace(opts.Locale)
	if locale == "" {
		locale = strings.TrimSpace(opts.Locale)
	}

	if reset {
		if err := menus.ResetMenuByCode(ctx, menuCode, uuid.Nil, true); err != nil && !errors.Is(err, cms.ErrMenuNotFound) {
			return err
		}
		if logf != nil {
			logf("[nav seed] reset menu %s", menuCode)
		}
	}

	seedItems := make([]cms.SeedMenuItem, 0, len(opts.Items))
	for _, item := range opts.Items {
		seedItems = append(seedItems, toSeedMenuItem(menuCode, locale, item))
	}

	return cms.SeedMenu(ctx, cms.SeedMenuOptions{
		Menus:             menus,
		MenuCode:          menuCode,
		Locale:            locale,
		Actor:             uuid.Nil,
		Items:             seedItems,
		AutoCreateParents: opts.AutoCreateParents,
	})
}

func toSeedMenuItem(menuCode string, defaultLocale string, item admin.MenuItem) cms.SeedMenuItem {
	itemType := normalizeMenuItemType(item.Type)
	parentPath := resolveParentPath(menuCode, item)
	path := resolveItemPath(menuCode, parentPath, item)

	target := cloneAnyMap(item.Target)
	if itemType == admin.MenuItemTypeGroup || itemType == admin.MenuItemTypeSeparator {
		target = nil
	} else {
		item.Target = target
		target = mergeMenuTarget(item)
	}

	seed := cms.SeedMenuItem{
		Path:        path,
		Position:    positionPtr(item.Position),
		Type:        itemType,
		Target:      target,
		Icon:        strings.TrimSpace(item.Icon),
		Badge:       cloneAnyMap(item.Badge),
		Permissions: append([]string{}, item.Permissions...),
		Classes:     append([]string{}, item.Classes...),
		Styles:      cloneStringMap(item.Styles),
		Collapsible: item.Collapsible,
		Collapsed:   item.Collapsed,
		Metadata: map[string]any{
			"path":        path,
			"parent_path": parentPath,
		},
	}

	locale := strings.TrimSpace(item.Locale)
	if locale == "" {
		locale = strings.TrimSpace(defaultLocale)
	}
	if locale == "" {
		seed.AllowMissingTranslations = true
		return seed
	}
	if itemType == admin.MenuItemTypeSeparator {
		return seed
	}

	label, labelKey, groupTitle, groupTitleKey := normalizeMenuItemTranslationFields(item)
	seed.Translations = []cms.MenuItemTranslationInput{{
		Locale:        locale,
		Label:         label,
		LabelKey:      labelKey,
		GroupTitle:    groupTitle,
		GroupTitleKey: groupTitleKey,
	}}
	return seed
}

func canonicalMenuCode(code string) string {
	slug := admin.NormalizeMenuSlug(code)
	if slug == "" {
		slug = strings.TrimSpace(code)
	}
	slug = strings.ReplaceAll(slug, ".", "_")
	slug = strings.Trim(slug, "-_")
	return slug
}

func normalizeMenuItemType(raw string) string {
	switch strings.TrimSpace(raw) {
	case admin.MenuItemTypeGroup:
		return admin.MenuItemTypeGroup
	case admin.MenuItemTypeSeparator:
		return admin.MenuItemTypeSeparator
	default:
		return admin.MenuItemTypeItem
	}
}

func resolveParentPath(menuCode string, item admin.MenuItem) string {
	parent := strings.TrimSpace(item.ParentID)
	if parent == "" {
		parent = strings.TrimSpace(item.ParentCode)
	}
	if parent == "" {
		return ""
	}
	return canonicalMenuItemPath(menuCode, parent)
}

func resolveItemPath(menuCode string, parentPath string, item admin.MenuItem) string {
	if strings.TrimSpace(item.ID) != "" {
		candidate := canonicalMenuItemPath(menuCode, item.ID)
		if parentPath != "" && !strings.HasPrefix(candidate, parentPath+".") {
			// Single-segment IDs can be relative to an explicit parent.
			if !strings.Contains(strings.TrimSpace(item.ID), ".") && !strings.Contains(strings.TrimSpace(item.ID), "/") {
				candidate = parentPath + "." + sanitizePathSegment(item.ID)
			}
		}
		return candidate
	}

	seed := firstNonEmpty(strings.TrimSpace(item.Label), strings.TrimSpace(item.GroupTitle), strings.TrimSpace(item.LabelKey), strings.TrimSpace(item.GroupTitleKey))
	seg := sanitizePathSegment(seed)
	if seg == "" {
		seg = "item"
	}
	if parentPath != "" {
		return parentPath + "." + seg
	}
	return canonicalMenuItemPath(menuCode, seg)
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

func positionPtr(pos int) *int {
	if pos <= 0 {
		return nil
	}
	copy := pos
	return &copy
}

func normalizeMenuItemTranslationFields(item admin.MenuItem) (label, labelKey, groupTitle, groupTitleKey string) {
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

func mergeMenuTarget(item admin.MenuItem) map[string]any {
	target := cloneAnyMap(item.Target)
	if target == nil {
		target = map[string]any{}
	}
	if _, ok := target["collapsible"]; !ok && item.Collapsible {
		target["collapsible"] = true
	}
	if _, ok := target["collapsed"]; !ok && item.Collapsed {
		target["collapsed"] = true
	}
	if _, ok := target["icon"]; !ok && strings.TrimSpace(item.Icon) != "" {
		target["icon"] = strings.TrimSpace(item.Icon)
	}
	if _, ok := target["badge"]; !ok && item.Badge != nil {
		target["badge"] = cloneAnyMap(item.Badge)
	}
	if _, ok := target["classes"]; !ok && len(item.Classes) > 0 {
		target["classes"] = append([]string{}, item.Classes...)
	}
	if _, ok := target["styles"]; !ok && len(item.Styles) > 0 {
		target["styles"] = cloneStringMap(item.Styles)
	}
	if _, ok := target["permissions"]; !ok && len(item.Permissions) > 0 {
		target["permissions"] = append([]string{}, item.Permissions...)
	}
	if _, ok := target["locale"]; !ok && strings.TrimSpace(item.Locale) != "" {
		target["locale"] = strings.TrimSpace(item.Locale)
	}
	return target
}
