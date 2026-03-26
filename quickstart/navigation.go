package quickstart

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/goliatone/go-admin/admin"
	cms "github.com/goliatone/go-cms"
)

var localeSuffixPattern = regexp.MustCompile(`^[a-z]{2}(?:[-_][a-z]{2})?$`)

type menuResetterWithContext interface {
	ResetMenuContext(ctx context.Context, code string) error
}

// SeedNavigationOptions drives the quickstart menu seeding workflow.
type SeedNavigationOptions struct {
	MenuSvc    admin.CMSMenuService             `json:"menu_svc"`
	MenuCode   string                           `json:"menu_code"`
	Items      []admin.MenuItem                 `json:"items"`
	Reset      bool                             `json:"reset"`
	ResetEnv   string                           `json:"reset_env"`
	Locale     string                           `json:"locale"`
	Logf       func(format string, args ...any) `json:"logf"`
	SkipLogger bool                             `json:"skip_logger"`

	// AutoCreateParents allows seeds to omit intermediate path segments; missing parents are scaffolded as group nodes.
	AutoCreateParents bool `json:"auto_create_parents"`
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
	_ = resetEnv
	reset := opts.Reset

	logf := opts.Logf
	if logf == nil && !opts.SkipLogger {
		logger := resolveQuickstartNamedLogger("quickstart.navigation", nil, nil)
		logf = func(format string, args ...any) {
			ensureQuickstartLogger(logger).Info(fmt.Sprintf(format, args...))
		}
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
	if err := validateSeedMenuIdentity(item, defaultLocale); err != nil {
		return admin.MenuItem{}, err
	}

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
		target = breadcrumbTargetForStructuralMenuItem(target)
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

func breadcrumbTargetForStructuralMenuItem(target map[string]any) map[string]any {
	if len(target) == 0 {
		return nil
	}
	out := map[string]any{}
	for _, key := range []string{
		"type",
		"url",
		"path",
		"name",
		"key",
		"breadcrumb_label",
		"breadcrumb_href",
		"breadcrumb_hidden",
	} {
		if value, ok := target[key]; ok {
			out[key] = value
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func validateSeedMenuIdentity(item admin.MenuItem, defaultLocale string) error {
	itemID := strings.TrimSpace(item.ID)
	if itemID == "" {
		return nil
	}
	locale := strings.ToLower(strings.TrimSpace(firstNonEmpty(item.Locale, defaultLocale)))
	if locale == "" {
		return nil
	}
	last := strings.TrimSpace(itemID)
	if idx := strings.LastIndex(last, "."); idx >= 0 && idx+1 < len(last) {
		last = last[idx+1:]
	}
	last = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(last), "_", "-"))
	if !localeSuffixPattern.MatchString(last) {
		return nil
	}
	normalizedLocale := strings.ReplaceAll(locale, "_", "-")
	if last != normalizedLocale {
		return nil
	}
	return fmt.Errorf("seed menu item id %q must not encode locale suffix %q; use localized translations with stable IDs", itemID, locale)
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
