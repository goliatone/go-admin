package quickstart

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/internal/primitives"
	cms "github.com/goliatone/go-cms"
)

var localeSuffixPattern = regexp.MustCompile(`^[a-z]{2}(?:[-_][a-z]{2})?$`)

type menuResetterWithContext interface {
	ResetMenuContext(ctx context.Context, code string) error
}

// SeedNavigationOptions drives the quickstart menu seeding workflow.
type SeedNavigationOptions struct {
	MenuSvc   admin.CMSMenuService `json:"menu_svc"`
	MenuCode  string               `json:"menu_code"`
	Items     []admin.MenuItem     `json:"items"`
	Reset     bool                 `json:"reset"`
	Reconcile bool                 `json:"reconcile"`
	// AllowDestructive lets reconcile delete generated replacement candidates during apply.
	// It is false by default so normal startup seeding preserves stale generated rows.
	AllowDestructive bool `json:"allow_destructive"`
	// RetireManagedExclusions allows deletion only for explicitly identified,
	// quickstart-owned generated rows without enabling general destructive reconciliation.
	RetireManagedExclusions bool                                `json:"retire_managed_exclusions"`
	ResetEnv                string                              `json:"reset_env"`
	Locale                  string                              `json:"locale"`
	RawInventory            admin.NavigationRawInventoryOptions `json:"raw_inventory"`
	Logf                    func(format string, args ...any)    `json:"logf"`
	SkipLogger              bool                                `json:"skip_logger"`
	Reportf                 func(NavigationReconcileReport)     `json:"-"`

	CapabilityOmissions     []string                     `json:"capability_omissions,omitempty"`
	PermissionFilteredItems []string                     `json:"permission_filtered_items,omitempty"`
	ManagedExclusions       []NavigationManagedExclusion `json:"managed_exclusions,omitempty"`

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
	if opts.Reconcile {
		_, err := runtime.reconcileSeedNavigation()
		return err
	}
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

func (runtime seedNavigationRuntime) rawInventoryOptions() admin.NavigationRawInventoryOptions {
	return normalizeNavigationRawInventoryOptions(runtime.opts.RawInventory, runtime.menuCode)
}

func (runtime seedNavigationRuntime) reconcileOptions() NavigationReconcileOptions {
	return NavigationReconcileOptions{
		MenuSvc:                 runtime.opts.MenuSvc,
		MenuCode:                runtime.menuCode,
		Locale:                  runtime.locale,
		Items:                   runtime.opts.Items,
		Apply:                   true,
		AllowDestructive:        runtime.opts.AllowDestructive,
		RetireManagedExclusions: runtime.opts.RetireManagedExclusions,
		RawInventory:            runtime.rawInventoryOptions(),
		Logf:                    runtime.opts.Logf,
		CapabilityOmissions:     runtime.opts.CapabilityOmissions,
		PermissionFilteredItems: runtime.opts.PermissionFilteredItems,
		ManagedExclusions:       append([]NavigationManagedExclusion{}, runtime.opts.ManagedExclusions...),
	}
}

func (runtime seedNavigationRuntime) reconcileSeedNavigation() (NavigationReconcileReport, error) {
	reconcileOpts := runtime.reconcileOptions()
	preparedRuntime, expected, report, err := prepareGeneratedNavigationReconcile(runtime.ctx, reconcileOpts)
	if err != nil {
		if runtime.opts.Reportf != nil {
			runtime.opts.Reportf(report)
		}
		return report, err
	}
	err = withGeneratedNavigationConvergence(runtime.ctx, reconcileOpts, preparedRuntime, func(ctx context.Context) error {
		defer func() {
			if runtime.opts.Reportf != nil {
				runtime.opts.Reportf(report)
			}
		}()
		seedRuntime := runtime
		seedRuntime.ctx = ctx
		seedRuntime.menuCode = preparedRuntime.menuCode
		seedRuntime.locale = preparedRuntime.locale
		reconcileRuntime := preparedRuntime
		reconcileRuntime.ctx = ctx
		if preflightErr := preflightGeneratedNavigationRawInventory(ctx, seedRuntime.opts.MenuSvc, seedRuntime.rawInventoryOptions(), &report); preflightErr != nil {
			return preflightErr
		}
		if resetErr := seedRuntime.resetMenu(); resetErr != nil {
			return resetErr
		}
		if _, createErr := seedRuntime.opts.MenuSvc.CreateMenu(ctx, seedRuntime.menuCode); createErr != nil {
			return createErr
		}
		var reconcileErr error
		report, reconcileErr = reconcileGeneratedNavigation(ctx, reconcileOpts, reconcileRuntime, expected, report)
		return reconcileErr
	})
	return report, err
}

func preflightGeneratedNavigationRawInventory(ctx context.Context, menuSvc admin.CMSMenuService, opts admin.NavigationRawInventoryOptions, report *NavigationReconcileReport) error {
	if _, rawErr := loadGeneratedNavigationRawItems(ctx, menuSvc, opts); rawErr != nil {
		if report != nil {
			report.RawInventoryUnavailable = append(report.RawInventoryUnavailable, rawErr.Error())
			report.sort()
		}
		return generatedNavigationRawInventoryError(rawErr)
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
		normalized = generatedMenuItem(normalized, runtime.menuCode)
		seedItems = append(seedItems, normalized)
	}
	autoCreateParents := runtime.opts.AutoCreateParents || shouldAutoCreateParents(runtime.menuCode, seedItems)
	if autoCreateParents {
		seedItems = withAutoCreatedParentItems(runtime.menuCode, runtime.locale, seedItems)
	}
	seedItems = compactGeneratedMenuItemPositions(seedItems)
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
	placementSlot := strings.TrimSpace(item.PlacementSlot)
	if placementSlot == "" {
		placementSlot = stringTargetValue(target, MenuTargetPlacementSlotKey)
	}
	if placementSlot != "" {
		target = ensureMenuTarget(target)
		target[MenuTargetPlacementSlotKey] = placementSlot
	}
	if item.Position != nil {
		target = ensureMenuTarget(target)
		target[MenuTargetGeneratedSortOrderKey] = *item.Position
	}
	if itemType == admin.MenuItemTypeGroup || itemType == admin.MenuItemTypeSeparator {
		target = breadcrumbTargetForStructuralMenuItem(target)
	}

	position := item.Position
	if item.Position != nil {
		position = cms.SeedPositionPtrForType(itemType, *item.Position)
	}

	seed := admin.MenuItem{
		ID:            path,
		Position:      position,
		Type:          itemType,
		URLOverride:   cloneStringPtr(item.URLOverride),
		Target:        target,
		Icon:          strings.TrimSpace(item.Icon),
		Badge:         cloneAnyMap(item.Badge),
		PlacementSlot: placementSlot,
		Permissions:   normalizeSeedPermissions(item.Permissions),
		Classes:       append([]string{}, item.Classes...),
		Styles:        cloneStringMap(item.Styles),
		Collapsible:   item.Collapsible,
		Collapsed:     item.Collapsed,
		Menu:          menuCode,
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
		MenuTargetGeneratedSortOrderKey,
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

func ensureMenuTarget(target map[string]any) map[string]any {
	if target != nil {
		return target
	}
	return map[string]any{}
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

func compactGeneratedMenuItemPositions(items []admin.MenuItem) []admin.MenuItem {
	if len(items) == 0 {
		return items
	}
	out := cloneMenuItems(items)
	siblingsByParent := map[string][]int{}
	for idx := range out {
		parent := menuItemParentKey(out[idx])
		siblingsByParent[parent] = append(siblingsByParent[parent], idx)
	}
	for _, siblings := range siblingsByParent {
		sort.SliceStable(siblings, func(i, j int) bool {
			left := out[siblings[i]]
			right := out[siblings[j]]
			leftOrder, leftOK := generatedMenuSortOrder(left)
			rightOrder, rightOK := generatedMenuSortOrder(right)
			if leftOK != rightOK {
				return leftOK
			}
			if leftOrder != rightOrder {
				return leftOrder < rightOrder
			}
			leftKey := generatedMenuItemStableSortKey(left)
			rightKey := generatedMenuItemStableSortKey(right)
			if leftKey != rightKey {
				return leftKey < rightKey
			}
			return siblings[i] < siblings[j]
		})
		for position, idx := range siblings {
			out[idx].Position = intPtr(position)
		}
	}
	return out
}

func menuItemParentKey(item admin.MenuItem) string {
	parent := strings.TrimSpace(firstNonEmpty(item.ParentID, item.ParentCode))
	if parent != "" {
		return parent
	}
	if parent = parentPath(item.ID); parent != "" {
		return parent
	}
	if menu := strings.TrimSpace(item.Menu); menu != "" {
		return menu
	}
	return "__root__"
}

func generatedMenuSortOrder(item admin.MenuItem) (int, bool) {
	if value, ok := intTargetValue(item.Target, MenuTargetGeneratedSortOrderKey); ok {
		return value, true
	}
	if item.Position != nil {
		return *item.Position, true
	}
	return 0, false
}

func generatedMenuItemStableSortKey(item admin.MenuItem) string {
	if id := strings.TrimSpace(item.ID); id != "" {
		return id
	}
	if key := stringTargetValue(item.Target, "key"); key != "" {
		return key
	}
	if path := stringTargetValue(item.Target, "path"); path != "" {
		return path
	}
	return strings.TrimSpace(firstNonEmpty(item.Label, item.GroupTitle, item.LabelKey, item.GroupTitleKey))
}

func intTargetValue(target map[string]any, key string) (int, bool) {
	if len(target) == 0 || strings.TrimSpace(key) == "" {
		return 0, false
	}
	value, ok := target[key]
	if !ok {
		return 0, false
	}
	return targetValueAsInt(value)
}

func targetValueAsInt(value any) (int, bool) {
	switch typed := value.(type) {
	case float32:
		return int(typed), true
	case float64:
		return int(typed), true
	case string:
		parsed, err := strconv.Atoi(strings.TrimSpace(typed))
		if err != nil {
			return 0, false
		}
		return parsed, true
	default:
		return reflectedIntValue(value)
	}
}

func reflectedIntValue(value any) (int, bool) {
	reflected := reflect.ValueOf(value)
	switch reflected.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return primitives.IntFromInt64(reflected.Int())
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return primitives.IntFromUint64(reflected.Uint())
	default:
		return 0, false
	}
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
