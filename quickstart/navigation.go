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

type seedNavigationRuntime struct {
	ctx      context.Context
	opts     SeedNavigationOptions
	menuCode string
	locale   string
	logf     func(format string, args ...any)
}

// SeedNavigation seeds a menu using the public admin CMS menu contract.
func SeedNavigation(ctx context.Context, opts SeedNavigationOptions) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if opts.MenuSvc == nil {
		return fmt.Errorf("MenuSvc is required")
	}

	runtime := newSeedNavigationRuntime(ctx, opts)
	if err := runtime.resetMenu(); err != nil {
		return err
	}
	if _, err := opts.MenuSvc.CreateMenu(ctx, runtime.menuCode); err != nil {
		return err
	}
	return runtime.addSeedItems()
}

func newSeedNavigationRuntime(ctx context.Context, opts SeedNavigationOptions) seedNavigationRuntime {
	menuCode := cms.CanonicalMenuCode(opts.MenuCode)
	if menuCode == "" {
		menuCode = cms.CanonicalMenuCode("admin")
	}
	return seedNavigationRuntime{
		ctx:      ctx,
		opts:     opts,
		menuCode: menuCode,
		locale:   resolveSeedNavigationLocale(opts),
		logf:     resolveSeedNavigationLogger(opts),
	}
}

func resolveSeedNavigationLogger(opts SeedNavigationOptions) func(format string, args ...any) {
	if opts.Logf != nil || opts.SkipLogger {
		return opts.Logf
	}
	logger := resolveQuickstartNamedLogger("quickstart.navigation", nil, nil)
	return func(format string, args ...any) {
		ensureQuickstartLogger(logger).Info(fmt.Sprintf(format, args...))
	}
}

func resolveSeedNavigationLocale(opts SeedNavigationOptions) string {
	if locale := strings.TrimSpace(opts.Locale); locale != "" {
		return locale
	}
	for _, item := range opts.Items {
		if locale := strings.TrimSpace(item.Locale); locale != "" {
			return locale
		}
	}
	return "en"
}

func (runtime seedNavigationRuntime) resetMenu() error {
	if !runtime.opts.Reset {
		return nil
	}
	resetter, ok := runtime.opts.MenuSvc.(menuResetterWithContext)
	if !ok || resetter == nil {
		if runtime.logf != nil {
			runtime.logf("[nav seed] reset requested for %s but menu service does not implement reset", runtime.menuCode)
		}
		return nil
	}
	if err := resetter.ResetMenuContext(runtime.ctx, runtime.menuCode); err != nil && !errors.Is(err, admin.ErrNotFound) {
		return err
	}
	if runtime.logf != nil {
		runtime.logf("[nav seed] reset menu %s", runtime.menuCode)
	}
	return nil
}

func (runtime seedNavigationRuntime) addSeedItems() error {
	seedItems, err := runtime.seedItems()
	if err != nil {
		return err
	}
	for _, item := range seedItems {
		if err := runtime.opts.MenuSvc.AddMenuItem(runtime.ctx, runtime.menuCode, item); err != nil {
			return err
		}
	}
	return nil
}

func (runtime seedNavigationRuntime) seedItems() ([]admin.MenuItem, error) {
	seedItems := make([]admin.MenuItem, 0, len(runtime.opts.Items))
	for _, item := range runtime.opts.Items {
		normalized, err := normalizeSeedMenuItem(runtime.menuCode, runtime.locale, item)
		if err != nil {
			return nil, err
		}
		seedItems = append(seedItems, normalized)
	}
	autoCreateParents := runtime.opts.AutoCreateParents || shouldAutoCreateParents(runtime.menuCode, seedItems)
	if autoCreateParents {
		seedItems = withAutoCreatedParentItems(runtime.menuCode, runtime.locale, seedItems)
	}
	return seedItems, nil
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
