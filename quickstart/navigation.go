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
)

// ErrSeedNavigationRequiresGoCMS is retained for backwards compatibility.
//
// Deprecated: SeedNavigation now works against the public admin.CMSMenuService contract.
var ErrSeedNavigationRequiresGoCMS = fmt.Errorf("quickstart: SeedNavigation requires a go-cms backed menu service")

type menuResetterWithContext interface {
	ResetMenuContext(ctx context.Context, code string) error
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

	// AutoCreateParents allows seeds to omit intermediate path segments; missing parents are scaffolded as group nodes.
	AutoCreateParents bool
}

// SeedNavigation seeds a menu using the public admin CMS menu contract.
func SeedNavigation(ctx context.Context, opts SeedNavigationOptions) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if opts.MenuSvc == nil {
		return fmt.Errorf("MenuSvc is required")
	}

	menuCode := cms.CanonicalMenuCode(opts.MenuCode)
	if menuCode == "" {
		menuCode = cms.CanonicalMenuCode("admin")
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
		for _, item := range opts.Items {
			if v := strings.TrimSpace(item.Locale); v != "" {
				locale = v
				break
			}
		}
	}
	if locale == "" {
		locale = "en"
	}

	if reset {
		if resetter, ok := opts.MenuSvc.(menuResetterWithContext); ok && resetter != nil {
			if err := resetter.ResetMenuContext(ctx, menuCode); err != nil && !errors.Is(err, admin.ErrNotFound) {
				return err
			}
			if logf != nil {
				logf("[nav seed] reset menu %s", menuCode)
			}
		} else if logf != nil {
			logf("[nav seed] reset requested for %s but menu service does not implement reset", menuCode)
		}
	}

	if _, err := opts.MenuSvc.CreateMenu(ctx, menuCode); err != nil {
		return err
	}

	seedItems := make([]admin.MenuItem, 0, len(opts.Items))
	for _, item := range opts.Items {
		normalized, err := normalizeSeedMenuItem(menuCode, locale, item)
		if err != nil {
			return err
		}
		seedItems = append(seedItems, normalized)
	}

	autoCreateParents := opts.AutoCreateParents
	if !autoCreateParents {
		autoCreateParents = shouldAutoCreateParents(menuCode, seedItems)
	}
	if autoCreateParents {
		seedItems = withAutoCreatedParentItems(menuCode, locale, seedItems)
	}

	for _, item := range seedItems {
		if err := opts.MenuSvc.AddMenuItem(ctx, menuCode, item); err != nil {
			return err
		}
	}

	return nil
}

func normalizeSeedMenuItem(menuCode string, defaultLocale string, item admin.MenuItem) (admin.MenuItem, error) {
	itemType := admin.NormalizeMenuItemType(item.Type)
	derived, err := cms.DeriveMenuItemPaths(
		menuCode,
		item.ID,
		firstNonEmpty(item.ParentID, item.ParentCode),
		firstNonEmpty(item.Label, item.GroupTitle, item.LabelKey, item.GroupTitleKey),
	)
	if err != nil {
		return admin.MenuItem{}, err
	}
	parentPath := derived.ParentPath
	path := derived.Path

	target := cloneAnyMap(item.Target)
	if itemType == admin.MenuItemTypeGroup || itemType == admin.MenuItemTypeSeparator {
		target = nil
	}

	position := item.Position
	if item.Position != nil {
		position = cms.SeedPositionPtrForType(itemType, *item.Position)
	}

	seed := admin.MenuItem{
		ID:          path,
		Position:    position,
		Type:        itemType,
		Target:      target,
		Icon:        strings.TrimSpace(item.Icon),
		Badge:       cloneAnyMap(item.Badge),
		Permissions: normalizeSeedPermissions(item.Permissions),
		Classes:     append([]string{}, item.Classes...),
		Styles:      cloneStringMap(item.Styles),
		Collapsible: item.Collapsible,
		Collapsed:   item.Collapsed,
		Menu:        menuCode,
	}
	if parentPath != "" && parentPath != menuCode {
		seed.ParentID = parentPath
		seed.ParentCode = parentPath
	}

	locale := strings.TrimSpace(item.Locale)
	if locale == "" {
		locale = strings.TrimSpace(defaultLocale)
	}
	seed.Locale = locale
	if locale == "" {
		return seed, nil
	}
	if itemType == admin.MenuItemTypeSeparator {
		return seed, nil
	}

	label, labelKey, groupTitle, groupTitleKey := admin.NormalizeMenuItemTranslationFields(item)
	seed.Label = label
	seed.LabelKey = labelKey
	seed.GroupTitle = groupTitle
	seed.GroupTitleKey = groupTitleKey
	return seed, nil
}

func shouldAutoCreateParents(menuCode string, items []admin.MenuItem) bool {
	if len(items) == 0 {
		return false
	}
	existing := map[string]bool{}
	for _, item := range items {
		id := strings.TrimSpace(item.ID)
		if id == "" {
			continue
		}
		existing[id] = true
	}
	for _, item := range items {
		parent := strings.TrimSpace(firstNonEmpty(item.ParentID, item.ParentCode))
		if parent == "" {
			parent = parentPath(item.ID)
		}
		if parent == "" || parent == menuCode {
			continue
		}
		if !existing[parent] {
			return true
		}
	}
	return false
}

func withAutoCreatedParentItems(menuCode string, locale string, items []admin.MenuItem) []admin.MenuItem {
	if len(items) == 0 {
		return items
	}
	out := append([]admin.MenuItem{}, items...)
	existing := map[string]bool{}
	for _, item := range out {
		if id := strings.TrimSpace(item.ID); id != "" {
			existing[id] = true
		}
	}

	for _, item := range items {
		parent := strings.TrimSpace(firstNonEmpty(item.ParentID, item.ParentCode))
		if parent == "" {
			parent = parentPath(item.ID)
		}
		for parent != "" && parent != menuCode {
			if existing[parent] {
				parent = parentPath(parent)
				continue
			}
			created := admin.MenuItem{
				ID:          parent,
				Type:        admin.MenuItemTypeGroup,
				GroupTitle:  humanizeMenuPath(parent),
				Collapsible: true,
				Collapsed:   false,
				Menu:        menuCode,
				Locale:      locale,
			}
			pp := parentPath(parent)
			if pp != "" && pp != menuCode {
				created.ParentID = pp
				created.ParentCode = pp
			}
			out = append(out, created)
			existing[parent] = true
			parent = pp
		}
	}

	return out
}

func parentPath(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	idx := strings.LastIndex(trimmed, ".")
	if idx <= 0 {
		return ""
	}
	return trimmed[:idx]
}

func humanizeMenuPath(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	label := trimmed
	if idx := strings.LastIndex(label, "."); idx >= 0 && idx+1 < len(label) {
		label = label[idx+1:]
	}
	label = strings.ReplaceAll(label, "_", " ")
	label = strings.ReplaceAll(label, "-", " ")
	if label == "" {
		return trimmed
	}
	return strings.ToUpper(label[:1]) + label[1:]
}

func normalizeSeedPermissions(perms []string) []string {
	if len(perms) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(perms))
	for _, perm := range perms {
		trimmed := strings.TrimSpace(perm)
		if trimmed == "" || seen[trimmed] {
			continue
		}
		seen[trimmed] = true
		out = append(out, trimmed)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
