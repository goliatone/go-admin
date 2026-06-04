package quickstart

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
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
	MenuCode string `json:"menu_code"`
	Locale   string `json:"locale"`
	Applied  bool   `json:"applied"`

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
		if reconcileMenuItemStronglyAppearsIn(item, out) {
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
		if reconcileMenuItemStronglyAppearsIn(item, rendered) {
			continue
		}
		if matchesAnyExpectedGeneratedRow(item, expected) {
			report.RawPresentButNotRendered = append(report.RawPresentButNotRendered, item.ID)
		}
	}
}

func reconcileMenuItemStronglyAppearsIn(item admin.MenuItem, items []admin.MenuItem) bool {
	itemKeys := map[string]bool{}
	for _, key := range uniqueStrings(reconcileMenuItemStrongKeys(item)) {
		itemKeys[key] = true
	}
	if len(itemKeys) == 0 {
		return false
	}
	for _, existing := range items {
		for _, key := range uniqueStrings(reconcileMenuItemStrongKeys(existing)) {
			if itemKeys[key] {
				return true
			}
		}
	}
	return false
}

func recordGeneratedNavigationActualState(report *NavigationReconcileReport, actual, expected []admin.MenuItem) {
	actualIdentityCount := map[string]int{}
	for _, item := range actual {
		keys := uniqueStrings(reconcileMenuItemKeys(item))
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
	expectedKeys := map[string]bool{}
	for _, item := range expected {
		for _, key := range uniqueStrings(reconcileMenuItemKeys(item)) {
			expectedKeys[key] = true
		}
		if err := reconcileGeneratedNavigationExpectedItem(ctx, opts, runtime, item, actual, report); err != nil {
			return expectedKeys, err
		}
	}
	return expectedKeys, nil
}

func reconcileGeneratedNavigationExpectedItem(ctx context.Context, opts NavigationReconcileOptions, runtime seedNavigationRuntime, item admin.MenuItem, actual []admin.MenuItem, report *NavigationReconcileReport) error {
	match, ok, ambiguous := findActualGeneratedMatch(item, actual)
	if ambiguous {
		report.DuplicateIdentities = append(report.DuplicateIdentities, "ambiguous:"+item.ID)
		return nil
	}
	if !ok {
		return createMissingGeneratedNavigationItem(ctx, opts, runtime.menuCode, item, report)
	}
	return reconcileMatchedGeneratedNavigationItem(ctx, opts, runtime.menuCode, item, match, report)
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
	for _, key := range uniqueStrings(reconcileMenuItemKeys(item)) {
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
	keys := []string{}
	if id := strings.TrimSpace(item.ID); id != "" {
		normalizedID := strings.ToLower(id)
		keys = append(keys, "id:"+normalizedID)
		if idx := strings.Index(id, "."); idx >= 0 && idx+1 < len(id) {
			suffix := strings.ToLower(strings.TrimSpace(id[idx+1:]))
			keys = append(keys, "id:"+suffix, "id_suffix:"+suffix)
		}
		if idx := strings.LastIndex(id, "."); idx >= 0 && idx+1 < len(id) {
			suffix := strings.ToLower(strings.TrimSpace(id[idx+1:]))
			keys = append(keys, "id:"+suffix, "id_suffix:"+suffix)
		}
	}
	if generatedID := stringTargetValue(item.Target, MenuTargetGeneratedIDKey); generatedID != "" {
		keys = append(keys, "generated_id:"+strings.ToLower(generatedID))
	}
	if key := stringTargetValue(item.Target, "key"); key != "" {
		keys = append(keys, "target_key:"+strings.ToLower(key))
	}
	if path := stringTargetValue(item.Target, "path"); path != "" {
		keys = append(keys, "target_path:"+strings.ToLower(path))
	}
	if name := stringTargetValue(item.Target, "name"); name != "" {
		keys = append(keys, "target_name:"+strings.ToLower(name))
	}
	if routeName := stringTargetValue(item.Target, "route_name"); routeName != "" {
		keys = append(keys, "target_name:"+strings.ToLower(routeName))
	}
	return keys
}

func reconcileMenuItemStrongKeys(item admin.MenuItem) []string {
	keys := []string{}
	if id := strings.TrimSpace(item.ID); id != "" {
		keys = append(keys, "id:"+strings.ToLower(id))
	}
	if generatedID := stringTargetValue(item.Target, MenuTargetGeneratedIDKey); generatedID != "" {
		keys = append(keys, "generated_id:"+strings.ToLower(generatedID))
	}
	return keys
}

func findActualGeneratedMatch(expected admin.MenuItem, actual []admin.MenuItem) (admin.MenuItem, bool, bool) {
	if matches := generatedOwnedMatches(expected, actual); len(matches) > 0 {
		if len(matches) > 1 {
			return admin.MenuItem{}, false, true
		}
		return matches[0], true, false
	}
	if matches := generatedMetadataMatches(expected, actual); len(matches) > 0 {
		if len(matches) > 1 {
			return admin.MenuItem{}, false, true
		}
		return matches[0], true, false
	}
	if matches := legacyGeneratedMatches(expected, actual); len(matches) > 0 {
		if len(matches) > 1 {
			return admin.MenuItem{}, false, true
		}
		return matches[0], true, false
	}
	return admin.MenuItem{}, false, false
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
	aKeys := map[string]bool{}
	for _, key := range uniqueStrings(reconcileMenuItemKeys(a)) {
		aKeys[key] = true
	}
	for _, key := range uniqueStrings(reconcileMenuItemKeys(b)) {
		if aKeys[key] {
			return true
		}
	}
	return false
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
	return strings.EqualFold(stringTargetValue(item.Target, MenuTargetGeneratedByKey), MenuTargetGeneratedOwner)
}

func generatedMenuItemsEquivalent(actual, expected admin.MenuItem) bool {
	actual = generatedMenuItemForCompare(actual)
	expected = generatedMenuItemForCompare(expected)
	return reflect.DeepEqual(actual, expected)
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
	for _, key := range requestScopedMenuTargetKeys() {
		if _, ok := item.Target[key]; ok {
			return true
		}
	}
	return false
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
