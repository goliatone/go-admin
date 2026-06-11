package quickstart

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	navcontract "github.com/goliatone/go-admin/internal/navigation"
)

// NavigationReconcileOptions controls quickstart generated-menu reconciliation.
type NavigationReconcileOptions struct {
	MenuSvc  admin.CMSMenuService
	MenuCode string
	Locale   string
	Items    []admin.MenuItem
	Apply    bool
	Logf     func(format string, args ...any)

	CapabilityOmissions     []string
	PermissionFilteredItems []string
	AllowDestructive        bool
}

type rawMenuInventoryProvider interface {
	RawMenuItems(ctx context.Context, menuCode string) ([]admin.MenuItem, error)
}

// NavigationReconcileReport describes a dry-run or applied generated-menu reconciliation.
type NavigationReconcileReport struct {
	MenuCode       string `json:"menu_code"`
	Locale         string `json:"locale"`
	Applied        bool   `json:"applied"`
	EngineIdentity string `json:"engine_identity,omitempty"`
	EngineVersion  string `json:"engine_version,omitempty"`

	ExpectedGeneratedCount int `json:"expected_generated_count"`
	ActualGeneratedCount   int `json:"actual_generated_count"`

	Creates                  []string `json:"creates,omitempty"`
	Updates                  []string `json:"updates,omitempty"`
	PreservedUserRows        []string `json:"preserved_user_rows,omitempty"`
	DuplicateIdentities      []string `json:"duplicate_identities,omitempty"`
	DestructiveCandidates    []string `json:"destructive_candidates,omitempty"`
	StaleTargetStateCleanup  []string `json:"stale_target_state_cleanup,omitempty"`
	RouteResolutionFailures  []string `json:"route_resolution_failures,omitempty"`
	CapabilityOmissions      []string `json:"capability_omissions,omitempty"`
	PermissionFilteredItems  []string `json:"permission_filtered_items,omitempty"`
	ParentPrunedItems        []string `json:"parent_pruned_items,omitempty"`
	PreservedGeneratedFields []string `json:"preserved_generated_fields,omitempty"`
	PersistedPresent         []string `json:"persisted_present,omitempty"`
	PersistedMissing         []string `json:"persisted_missing,omitempty"`
	RawPresentButNotRendered []string `json:"raw_present_but_not_rendered,omitempty"`
	RawInventoryUnavailable  []string `json:"raw_inventory_unavailable,omitempty"`
}

// ReconcileGeneratedNavigation converges persisted CMS menu rows to the expected generated plan.
func ReconcileGeneratedNavigation(ctx context.Context, opts NavigationReconcileOptions) (NavigationReconcileReport, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if opts.MenuSvc == nil {
		return NavigationReconcileReport{}, fmt.Errorf("MenuSvc is required")
	}
	runtime, expected, report, err := prepareGeneratedNavigationReconcile(ctx, opts)
	if err != nil {
		return NavigationReconcileReport{}, err
	}
	rendered, err := loadGeneratedNavigationActualItems(ctx, opts.MenuSvc, runtime.menuCode, runtime.locale)
	if err != nil {
		return report, err
	}
	raw, rawErr := loadGeneratedNavigationRawItems(ctx, opts.MenuSvc, runtime.menuCode)
	if rawErr != nil {
		report.RawInventoryUnavailable = append(report.RawInventoryUnavailable, rawErr.Error())
	}
	recordRawGeneratedNavigationState(&report, rendered, raw, expected)
	actual := mergeGeneratedNavigationActualItems(rendered, raw)
	recordGeneratedNavigationActualState(&report, actual, expected)

	expectedKeys, err := reconcileGeneratedNavigationExpectedItems(ctx, opts, runtime, expected, actual, &report)
	if err != nil {
		return report, err
	}
	recordStaleGeneratedNavigationRows(&report, actual, expectedKeys)
	report.sort()
	return report, nil
}

func prepareGeneratedNavigationReconcile(ctx context.Context, opts NavigationReconcileOptions) (seedNavigationRuntime, []admin.MenuItem, NavigationReconcileReport, error) {
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuSvc:    opts.MenuSvc,
		MenuCode:   opts.MenuCode,
		Locale:     opts.Locale,
		Items:      opts.Items,
		Logf:       opts.Logf,
		SkipLogger: opts.Logf == nil,
	})
	expected, err := runtime.seedItems()
	if err != nil {
		return runtime, nil, NavigationReconcileReport{}, err
	}
	report := NavigationReconcileReport{
		EngineIdentity:          navcontract.EngineIdentity,
		EngineVersion:           navcontract.EngineVersion,
		MenuCode:                runtime.menuCode,
		Locale:                  runtime.locale,
		Applied:                 opts.Apply,
		ExpectedGeneratedCount:  len(expected),
		RouteResolutionFailures: menuRouteResolutionFailures(expected),
		CapabilityOmissions:     append([]string{}, opts.CapabilityOmissions...),
		PermissionFilteredItems: append([]string{}, opts.PermissionFilteredItems...),
		ParentPrunedItems:       generatedEmptyParentItems(expected),
	}
	report.PermissionFilteredItems = append(report.PermissionFilteredItems, generatedPermissionFilteredItems(expected)...)
	return runtime, expected, report, nil
}

func loadGeneratedNavigationActualItems(ctx context.Context, menuSvc admin.CMSMenuService, menuCode, locale string) ([]admin.MenuItem, error) {
	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		return nil, err
	}
	if menu == nil {
		return nil, nil
	}
	return flattenReconcileMenuItems(menu.Items), nil
}

func loadGeneratedNavigationRawItems(ctx context.Context, menuSvc admin.CMSMenuService, menuCode string) ([]admin.MenuItem, error) {
	provider, ok := menuSvc.(rawMenuInventoryProvider)
	if !ok || provider == nil {
		return nil, nil
	}
	items, err := provider.RawMenuItems(ctx, menuCode)
	if err != nil {
		return nil, err
	}
	return flattenReconcileMenuItems(items), nil
}

func mergeGeneratedNavigationActualItems(rendered, raw []admin.MenuItem) []admin.MenuItem {
	if len(raw) == 0 {
		return rendered
	}
	out := append([]admin.MenuItem{}, rendered...)
	for _, item := range raw {
		if navcontract.StronglyAppearsIn(navigationContractItem(item), navigationContractItems(out)) {
			continue
		}
		out = append(out, item)
	}
	return out
}

func recordRawGeneratedNavigationState(report *NavigationReconcileReport, rendered, raw, expected []admin.MenuItem) {
	if report == nil || len(raw) == 0 {
		return
	}
	for _, item := range raw {
		if navcontract.StronglyAppearsIn(navigationContractItem(item), navigationContractItems(rendered)) {
			continue
		}
		if matchesAnyExpectedGeneratedRow(item, expected) {
			report.RawPresentButNotRendered = append(report.RawPresentButNotRendered, item.ID)
		}
	}
}

func reconcileMenuItemStronglyAppearsIn(item admin.MenuItem, items []admin.MenuItem) bool {
	return navcontract.StronglyAppearsIn(navigationContractItem(item), navigationContractItems(items))
}

func recordGeneratedNavigationActualState(report *NavigationReconcileReport, actual, expected []admin.MenuItem) {
	actualIdentityCount := map[string]int{}
	for _, item := range actual {
		keys := navcontract.IdentityKeys(navigationContractItem(item))
		if generatedMenuItemOwned(item) {
			report.ActualGeneratedCount++
		}
		if !generatedMenuItemOwned(item) && !matchesAnyExpectedGeneratedRow(item, expected) {
			report.PreservedUserRows = append(report.PreservedUserRows, item.ID)
		}
		for _, key := range keys {
			actualIdentityCount[key]++
		}
	}
	for key, count := range actualIdentityCount {
		if count > 1 {
			report.DuplicateIdentities = append(report.DuplicateIdentities, key)
		}
	}
}

func reconcileGeneratedNavigationExpectedItems(ctx context.Context, opts NavigationReconcileOptions, runtime seedNavigationRuntime, expected, actual []admin.MenuItem, report *NavigationReconcileReport) (map[string]bool, error) {
	plan := navcontract.PlanConvergence(navigationContractItems(expected), navigationContractItems(actual), navcontract.ConvergenceOptions{
		MatchPolicy: navcontract.MatchPolicy{Owner: navcontract.OwnerQuickstart},
		Apply:       opts.Apply,
		Preserve:    preserveGeneratedNavigationContractFields,
	})
	expectedKeys := map[string]bool{}
	for _, key := range plan.ExpectedKeys {
		expectedKeys[key] = true
	}
	for _, item := range plan.Items {
		if err := reconcileGeneratedNavigationPlannedItem(ctx, opts, runtime.menuCode, item, report); err != nil {
			return expectedKeys, err
		}
	}
	return expectedKeys, nil
}

func reconcileGeneratedNavigationExpectedItem(ctx context.Context, opts NavigationReconcileOptions, runtime seedNavigationRuntime, item admin.MenuItem, actual []admin.MenuItem, report *NavigationReconcileReport) error {
	planned := navcontract.PlanExpectedItem(navigationContractItem(item), navigationContractItems(actual), navcontract.ConvergenceOptions{
		MatchPolicy: navcontract.MatchPolicy{Owner: navcontract.OwnerQuickstart},
		Apply:       opts.Apply,
		Preserve:    preserveGeneratedNavigationContractFields,
	})
	return reconcileGeneratedNavigationPlannedItem(ctx, opts, runtime.menuCode, planned, report)
}

func reconcileGeneratedNavigationPlannedItem(ctx context.Context, opts NavigationReconcileOptions, menuCode string, planned navcontract.PlannedItem, report *NavigationReconcileReport) error {
	expected := adminMenuItemFromNavigationContract(planned.Expected)
	actual := adminMenuItemFromNavigationContract(planned.Actual)
	update := adminMenuItemFromNavigationContract(planned.Update)
	switch planned.Action {
	case navcontract.ConvergenceAmbiguous:
		report.DuplicateIdentities = append(report.DuplicateIdentities, "ambiguous:"+expected.ID)
		return nil
	case navcontract.ConvergenceUnsafe:
		report.DuplicateIdentities = append(report.DuplicateIdentities, "unsafe_broad:"+expected.ID)
		return createMissingGeneratedNavigationItem(ctx, opts, menuCode, expected, report)
	case navcontract.ConvergenceCreate:
		return createMissingGeneratedNavigationItem(ctx, opts, menuCode, expected, report)
	case navcontract.ConvergenceNoop:
		report.PersistedPresent = append(report.PersistedPresent, expected.ID)
		if planned.StaleTargetState {
			report.StaleTargetStateCleanup = append(report.StaleTargetStateCleanup, actual.ID)
		}
		report.PreservedGeneratedFields = append(report.PreservedGeneratedFields, planned.PreservedFields...)
		return nil
	case navcontract.ConvergenceUpdate:
		report.PersistedPresent = append(report.PersistedPresent, expected.ID)
		if planned.StaleTargetState {
			report.StaleTargetStateCleanup = append(report.StaleTargetStateCleanup, actual.ID)
		}
		if planned.DestructiveCandidate {
			report.DestructiveCandidates = append(report.DestructiveCandidates, actual.ID)
		}
		report.PreservedGeneratedFields = append(report.PreservedGeneratedFields, planned.PreservedFields...)
		report.Updates = append(report.Updates, expected.ID)
		if !opts.Apply {
			return nil
		}
		return opts.MenuSvc.UpdateMenuItem(ctx, menuCode, update)
	case navcontract.ConvergenceReplace:
		report.PersistedPresent = append(report.PersistedPresent, expected.ID)
		report.DestructiveCandidates = append(report.DestructiveCandidates, actual.ID)
		report.PreservedGeneratedFields = append(report.PreservedGeneratedFields, planned.PreservedFields...)
		if !opts.Apply {
			return nil
		}
		if err := opts.MenuSvc.DeleteMenuItem(ctx, menuCode, actual.ID); err != nil && !errors.Is(err, admin.ErrMenuTargetNotFound) && !errors.Is(err, admin.ErrNotFound) {
			return err
		}
		report.Creates = append(report.Creates, expected.ID)
		return opts.MenuSvc.AddMenuItem(ctx, menuCode, update)
	default:
		return nil
	}
}

func createMissingGeneratedNavigationItem(ctx context.Context, opts NavigationReconcileOptions, menuCode string, item admin.MenuItem, report *NavigationReconcileReport) error {
	report.Creates = append(report.Creates, item.ID)
	report.PersistedMissing = append(report.PersistedMissing, item.ID)
	if !opts.Apply {
		return nil
	}
	return opts.MenuSvc.AddMenuItem(ctx, menuCode, item)
}

func reconcileMatchedGeneratedNavigationItem(ctx context.Context, opts NavigationReconcileOptions, menuCode string, item, match admin.MenuItem, report *NavigationReconcileReport) error {
	report.PersistedPresent = append(report.PersistedPresent, item.ID)
	if generatedMenuItemHasStaleTargetState(match) {
		report.StaleTargetStateCleanup = append(report.StaleTargetStateCleanup, match.ID)
	}
	updateItem := item
	report.PreservedGeneratedFields = append(report.PreservedGeneratedFields, preserveGeneratedMenuItemFields(match, &updateItem)...)
	replaced, err := replaceGeneratedNavigationItemWhenNeeded(ctx, opts, menuCode, match, &updateItem, report)
	if err != nil || replaced {
		return err
	}
	if generatedMenuItemsEquivalent(match, updateItem) {
		return nil
	}
	report.Updates = append(report.Updates, item.ID)
	if !opts.Apply {
		return nil
	}
	return opts.MenuSvc.UpdateMenuItem(ctx, menuCode, updateItem)
}

func preserveGeneratedNavigationContractFields(actual, expected navcontract.Item) (navcontract.Item, []string) {
	update := adminMenuItemFromNavigationContract(expected)
	preserved := preserveGeneratedMenuItemFields(adminMenuItemFromNavigationContract(actual), &update)
	return navigationContractItem(update), preserved
}

func replaceGeneratedNavigationItemWhenNeeded(ctx context.Context, opts NavigationReconcileOptions, menuCode string, match admin.MenuItem, updateItem *admin.MenuItem, report *NavigationReconcileReport) (bool, error) {
	matchID := strings.TrimSpace(match.ID)
	updateID := strings.TrimSpace(updateItem.ID)
	if strings.EqualFold(matchID, updateID) || matchID == "" {
		return false, nil
	}
	report.DestructiveCandidates = append(report.DestructiveCandidates, match.ID)
	if opts.Apply && (opts.AllowDestructive || generatedMenuItemOwned(match)) {
		if err := opts.MenuSvc.DeleteMenuItem(ctx, menuCode, match.ID); err != nil && !errors.Is(err, admin.ErrMenuTargetNotFound) && !errors.Is(err, admin.ErrNotFound) {
			return false, err
		}
		report.Creates = append(report.Creates, updateItem.ID)
		return true, opts.MenuSvc.AddMenuItem(ctx, menuCode, *updateItem)
	}
	updateItem.ID = match.ID
	report.PreservedGeneratedFields = append(report.PreservedGeneratedFields, updateItem.ID+":id")
	return false, nil
}

func recordStaleGeneratedNavigationRows(report *NavigationReconcileReport, actual []admin.MenuItem, expectedKeys map[string]bool) {
	for _, item := range actual {
		if !generatedMenuItemOwned(item) {
			continue
		}
		if generatedNavigationItemExpected(item, expectedKeys) {
			continue
		}
		report.DestructiveCandidates = append(report.DestructiveCandidates, item.ID)
	}
}

func generatedNavigationItemExpected(item admin.MenuItem, expectedKeys map[string]bool) bool {
	for _, key := range navcontract.IdentityKeys(navigationContractItem(item)) {
		if expectedKeys[key] {
			return true
		}
	}
	return false
}

func (report *NavigationReconcileReport) sort() {
	sort.Strings(report.Creates)
	sort.Strings(report.Updates)
	sort.Strings(report.PreservedUserRows)
	sort.Strings(report.DuplicateIdentities)
	sort.Strings(report.DestructiveCandidates)
	sort.Strings(report.StaleTargetStateCleanup)
	sort.Strings(report.RouteResolutionFailures)
	sort.Strings(report.CapabilityOmissions)
	sort.Strings(report.PermissionFilteredItems)
	sort.Strings(report.ParentPrunedItems)
	sort.Strings(report.PreservedGeneratedFields)
	sort.Strings(report.PersistedPresent)
	sort.Strings(report.PersistedMissing)
	sort.Strings(report.RawPresentButNotRendered)
	sort.Strings(report.RawInventoryUnavailable)
}

func flattenReconcileMenuItems(items []admin.MenuItem) []admin.MenuItem {
	out := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		out = append(out, item)
		out = append(out, flattenReconcileMenuItems(item.Children)...)
	}
	return out
}

func reconcileMenuItemKeys(item admin.MenuItem) []string {
	return navcontract.IdentityKeys(navigationContractItem(item))
}

func reconcileMenuItemStrongKeys(item admin.MenuItem) []string {
	return navcontract.StrongIdentityKeys(navigationContractItem(item))
}

func findActualGeneratedMatch(expected admin.MenuItem, actual []admin.MenuItem) (admin.MenuItem, bool, bool) {
	match := navcontract.FindMatch(navigationContractItem(expected), navigationContractItems(actual), navcontract.MatchPolicy{Owner: navcontract.OwnerQuickstart})
	return adminMenuItemFromNavigationContract(match.Item), match.Matched, match.Ambiguous
}

func generatedOwnedMatches(expected admin.MenuItem, actual []admin.MenuItem) []admin.MenuItem {
	out := []admin.MenuItem{}
	seen := map[string]bool{}
	for _, item := range actual {
		if !generatedMenuItemOwned(item) {
			continue
		}
		if reconcileMenuItemsShareKey(expected, item) {
			out = appendUniqueMenuItemByID(out, seen, item)
		}
	}
	return out
}

func generatedMetadataMatches(expected admin.MenuItem, actual []admin.MenuItem) []admin.MenuItem {
	expectedGeneratedID := strings.ToLower(strings.TrimSpace(stringTargetValue(expected.Target, MenuTargetGeneratedIDKey)))
	if expectedGeneratedID == "" {
		return nil
	}
	out := []admin.MenuItem{}
	seen := map[string]bool{}
	for _, item := range actual {
		if generatedMenuItemOwned(item) {
			continue
		}
		if actualGeneratedID := strings.ToLower(strings.TrimSpace(stringTargetValue(item.Target, MenuTargetGeneratedIDKey))); actualGeneratedID == expectedGeneratedID {
			out = appendUniqueMenuItemByID(out, seen, item)
		}
	}
	return out
}

func legacyGeneratedMatches(expected admin.MenuItem, actual []admin.MenuItem) []admin.MenuItem {
	out := []admin.MenuItem{}
	seen := map[string]bool{}
	for _, item := range actual {
		if generatedMenuItemOwned(item) || strings.TrimSpace(stringTargetValue(item.Target, MenuTargetGeneratedIDKey)) != "" {
			continue
		}
		if legacyGeneratedMenuItemMatches(expected, item) {
			out = appendUniqueMenuItemByID(out, seen, item)
		}
	}
	return out
}

func appendUniqueMenuItemByID(items []admin.MenuItem, seen map[string]bool, item admin.MenuItem) []admin.MenuItem {
	key := strings.ToLower(strings.TrimSpace(item.ID))
	if key == "" {
		key = strings.ToLower(strings.TrimSpace(stringTargetValue(item.Target, MenuTargetGeneratedIDKey)))
	}
	if key != "" {
		if seen[key] {
			return items
		}
		seen[key] = true
	}
	return append(items, item)
}

func matchesAnyExpectedGeneratedRow(actual admin.MenuItem, expected []admin.MenuItem) bool {
	for _, item := range expected {
		if generatedMenuItemOwned(actual) && reconcileMenuItemsShareKey(item, actual) {
			return true
		}
		if strings.TrimSpace(stringTargetValue(actual.Target, MenuTargetGeneratedIDKey)) != "" && len(generatedMetadataMatches(item, []admin.MenuItem{actual})) > 0 {
			return true
		}
		if legacyGeneratedMenuItemMatches(item, actual) {
			return true
		}
	}
	return false
}

func reconcileMenuItemsShareKey(a, b admin.MenuItem) bool {
	return navcontract.ShareIdentityKey(navigationContractItem(a), navigationContractItem(b))
}

func uniqueStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		out = append(out, value)
	}
	return out
}

func legacyGeneratedMenuItemMatches(expected, actual admin.MenuItem) bool {
	if legacyGeneratedMenuItemRouteIdentityMatches(expected, actual) {
		return true
	}
	if !legacyMenuItemIDMatches(expected, actual) {
		return false
	}
	expectedKey := strings.ToLower(strings.TrimSpace(stringTargetValue(expected.Target, "key")))
	actualKey := strings.ToLower(strings.TrimSpace(stringTargetValue(actual.Target, "key")))
	if expectedKey != "" && actualKey != "" {
		return expectedKey == actualKey
	}
	expectedPath := strings.ToLower(strings.TrimSpace(stringTargetValue(expected.Target, "path")))
	actualPath := strings.ToLower(strings.TrimSpace(stringTargetValue(actual.Target, "path")))
	if expectedPath != "" && actualPath != "" {
		return expectedPath == actualPath
	}
	return expectedKey == "" && actualKey == "" && expectedPath == "" && actualPath == ""
}

func legacyGeneratedMenuItemRouteIdentityMatches(expected, actual admin.MenuItem) bool {
	expectedParent := strings.ToLower(strings.TrimSpace(expected.ParentID))
	actualParent := strings.ToLower(strings.TrimSpace(actual.ParentID))
	if expectedParent == "" || actualParent == "" || expectedParent != actualParent {
		return false
	}
	if !legacyGeneratedMenuItemIDSuffixMatches(expected, actual) {
		return false
	}
	for _, key := range []string{"key", "path", "name", "route_name"} {
		expectedValue := strings.ToLower(strings.TrimSpace(stringTargetValue(expected.Target, key)))
		actualValue := strings.ToLower(strings.TrimSpace(stringTargetValue(actual.Target, key)))
		if expectedValue != "" && actualValue != "" && expectedValue == actualValue {
			return true
		}
	}
	return false
}

func legacyGeneratedMenuItemIDSuffixMatches(expected, actual admin.MenuItem) bool {
	expectedID := strings.ToLower(strings.TrimSpace(expected.ID))
	actualID := strings.ToLower(strings.TrimSpace(actual.ID))
	if expectedID == "" || actualID == "" {
		return false
	}
	if !legacyGeneratedMenuItemIDPrefixCompatible(expectedID, actualID) {
		return false
	}
	expectedParts := strings.Split(expectedID, ".")
	actualParts := strings.Split(actualID, ".")
	if len(expectedParts) < 2 || len(actualParts) < 2 {
		return false
	}
	expectedSuffix := strings.Join(expectedParts[len(expectedParts)-2:], ".")
	actualSuffix := strings.Join(actualParts[len(actualParts)-2:], ".")
	return expectedSuffix != "" && expectedSuffix == actualSuffix
}

func legacyGeneratedMenuItemIDPrefixCompatible(expectedID, actualID string) bool {
	expectedParts := strings.Split(strings.ToLower(strings.TrimSpace(expectedID)), ".")
	actualParts := strings.Split(strings.ToLower(strings.TrimSpace(actualID)), ".")
	if len(expectedParts) == 0 || len(actualParts) == 0 {
		return false
	}
	return expectedParts[0] != "" && expectedParts[0] == actualParts[0]
}

func legacyMenuItemIDMatches(expected, actual admin.MenuItem) bool {
	expectedID := strings.ToLower(strings.TrimSpace(expected.ID))
	actualID := strings.ToLower(strings.TrimSpace(actual.ID))
	if expectedID == "" || actualID == "" {
		return false
	}
	if expectedID == actualID {
		return true
	}
	if legacyGeneratedMenuItemIDSuffixMatches(expected, actual) {
		return true
	}
	if idx := strings.Index(expectedID, "."); idx >= 0 && idx+1 < len(expectedID) {
		if actualID == strings.TrimSpace(expectedID[idx+1:]) {
			return true
		}
	}
	itemType := admin.NormalizeMenuItemType(expected.Type)
	if itemType != admin.MenuItemTypeGroup && !expected.Collapsible {
		return false
	}
	if idx := strings.LastIndex(expectedID, "."); idx >= 0 && idx+1 < len(expectedID) {
		return actualID == strings.TrimSpace(expectedID[idx+1:])
	}
	return false
}

func generatedMenuItemOwned(item admin.MenuItem) bool {
	return navcontract.ResolveOwner(navigationContractItem(item)) == navcontract.OwnerQuickstart
}

func generatedMenuItemsEquivalent(actual, expected admin.MenuItem) bool {
	return navcontract.EquivalentManagedFields(navigationContractItem(actual), navigationContractItem(expected))
}

func generatedMenuItemForCompare(item admin.MenuItem) admin.MenuItem {
	item.Children = nil
	item.Code = ""
	item.Menu = ""
	item.Target = cleanGeneratedMenuTarget(item.Target)
	if len(item.Target) == 0 {
		item.Target = nil
	}
	if len(item.Badge) == 0 {
		item.Badge = nil
	}
	if len(item.Classes) == 0 {
		item.Classes = nil
	}
	if len(item.Styles) == 0 {
		item.Styles = nil
	}
	if len(item.Permissions) == 0 {
		item.Permissions = nil
	}
	return item
}

func preserveGeneratedMenuItemFields(actual admin.MenuItem, expected *admin.MenuItem) []string {
	if expected == nil {
		return nil
	}
	preserved := []string{}
	if actual.Collapsible && actual.Collapsed != expected.Collapsed {
		expected.Collapsed = actual.Collapsed
		preserved = append(preserved, expected.ID+":collapsed")
	}
	return preserved
}

func generatedMenuItemHasStaleTargetState(item admin.MenuItem) bool {
	return navcontract.HasRequestScopedTargetState(navigationContractItem(item))
}

func menuRouteResolutionFailures(items []admin.MenuItem) []string {
	failures := []string{}
	for _, item := range items {
		if strings.EqualFold(stringTargetValue(item.Target, "type"), "url") &&
			strings.TrimSpace(stringTargetValue(item.Target, "path")) == "" &&
			strings.TrimSpace(stringTargetValue(item.Target, "url")) == "" {
			failures = append(failures, item.ID)
		}
	}
	return failures
}

func navigationContractItems(items []admin.MenuItem) []navcontract.Item {
	out := make([]navcontract.Item, 0, len(items))
	for _, item := range items {
		out = append(out, navigationContractItem(item))
	}
	return out
}

func navigationContractItem(item admin.MenuItem) navcontract.Item {
	return navcontract.Item{
		ID:            item.ID,
		Code:          item.Code,
		Type:          item.Type,
		Label:         item.Label,
		LabelKey:      item.LabelKey,
		GroupTitle:    item.GroupTitle,
		GroupTitleKey: item.GroupTitleKey,
		Target:        cloneAnyMap(item.Target),
		Icon:          item.Icon,
		Position:      cloneNavigationIntPtr(item.Position),
		Permissions:   append([]string{}, item.Permissions...),
		Menu:          item.Menu,
		ParentID:      item.ParentID,
		ParentCode:    item.ParentCode,
		Locale:        item.Locale,
		Collapsible:   item.Collapsible,
		Collapsed:     item.Collapsed,
	}
}

func adminMenuItemFromNavigationContract(item navcontract.Item) admin.MenuItem {
	return admin.MenuItem{
		ID:            item.ID,
		Code:          item.Code,
		Type:          item.Type,
		Label:         item.Label,
		LabelKey:      item.LabelKey,
		GroupTitle:    item.GroupTitle,
		GroupTitleKey: item.GroupTitleKey,
		Target:        cloneAnyMap(item.Target),
		Icon:          item.Icon,
		Position:      cloneNavigationIntPtr(item.Position),
		Permissions:   append([]string{}, item.Permissions...),
		Menu:          item.Menu,
		ParentID:      item.ParentID,
		ParentCode:    item.ParentCode,
		Locale:        item.Locale,
		Collapsible:   item.Collapsible,
		Collapsed:     item.Collapsed,
	}
}

func cloneNavigationIntPtr(value *int) *int {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
}

func generatedPermissionFilteredItems(items []admin.MenuItem) []string {
	filtered := []string{}
	for _, item := range items {
		if len(item.Permissions) == 0 {
			continue
		}
		filtered = append(filtered, item.ID)
	}
	return filtered
}

func generatedEmptyParentItems(items []admin.MenuItem) []string {
	childrenByParent := map[string]int{}
	for _, item := range items {
		if parent := strings.TrimSpace(item.ParentID); parent != "" {
			childrenByParent[parent]++
		}
	}
	pruned := []string{}
	for _, item := range items {
		itemType := admin.NormalizeMenuItemType(item.Type)
		if itemType != admin.MenuItemTypeGroup && !item.Collapsible {
			continue
		}
		if childrenByParent[strings.TrimSpace(item.ID)] == 0 {
			pruned = append(pruned, item.ID)
		}
	}
	return pruned
}
