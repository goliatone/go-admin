package quickstart

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"

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

	RawInventory            admin.NavigationRawInventoryOptions
	CapabilityOmissions     []string
	PermissionFilteredItems []string
	AllowDestructive        bool
	RetireManagedExclusions bool
	ManagedExclusions       []NavigationManagedExclusion
}

type rawMenuInventoryProvider interface {
	RawMenuItems(ctx context.Context, menuCode string) ([]admin.MenuItem, error)
}

type scopedRawMenuInventoryProvider interface {
	RawMenuItemsWithOptions(ctx context.Context, opts admin.NavigationRawInventoryOptions) ([]admin.MenuItem, error)
}

var generatedNavigationConvergenceMu sync.Mutex

type NavigationManagedExclusion struct {
	ID          string
	GeneratedID string
	TargetKey   string
	Reason      string
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
	RetiredManagedItems      []string `json:"retired_managed_items,omitempty"`

	CoordinationBackend   string `json:"coordination_backend,omitempty"`
	CoordinationScope     string `json:"coordination_scope,omitempty"`
	CoordinationSupported bool   `json:"coordination_supported"`
	CoordinationWarning   string `json:"coordination_warning,omitempty"`
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
	if opts.Apply {
		err = withGeneratedNavigationConvergence(ctx, opts, runtime, func(ctx context.Context) error {
			var reconcileErr error
			report, reconcileErr = reconcileGeneratedNavigation(ctx, opts, runtime, expected, report)
			return reconcileErr
		})
		return report, err
	}
	return reconcileGeneratedNavigation(ctx, opts, runtime, expected, report)
}

func reconcileGeneratedNavigation(ctx context.Context, opts NavigationReconcileOptions, runtime seedNavigationRuntime, expected []admin.MenuItem, report NavigationReconcileReport) (NavigationReconcileReport, error) {
	rawInventory := normalizeNavigationRawInventoryOptions(opts.RawInventory, runtime.menuCode)
	rendered, err := loadGeneratedNavigationActualItems(ctx, opts.MenuSvc, runtime.menuCode, runtime.locale)
	if err != nil {
		return report, err
	}
	raw, rawErr := loadGeneratedNavigationRawItems(ctx, opts.MenuSvc, rawInventory)
	if rawErr != nil {
		report.RawInventoryUnavailable = append(report.RawInventoryUnavailable, rawErr.Error())
		if opts.Apply {
			report.sort()
			return report, generatedNavigationRawInventoryError(rawErr)
		}
	}
	recordRawGeneratedNavigationState(&report, rendered, raw, expected)
	actual := mergeGeneratedNavigationActualItems(rendered, raw)
	recordGeneratedNavigationActualState(&report, actual, expected)

	expectedKeys, err := reconcileGeneratedNavigationExpectedItems(ctx, opts, runtime, expected, actual, &report)
	if err != nil {
		return report, err
	}
	if opts.Apply {
		if applyErr := ensureAppliedGeneratedNavigationItems(ctx, opts, runtime, expected, &report); applyErr != nil {
			return report, applyErr
		}
		rendered, err = loadGeneratedNavigationActualItems(ctx, opts.MenuSvc, runtime.menuCode, runtime.locale)
		if err != nil {
			return report, err
		}
		raw, rawErr = loadGeneratedNavigationRawItems(ctx, opts.MenuSvc, rawInventory)
		if rawErr != nil {
			report.RawInventoryUnavailable = append(report.RawInventoryUnavailable, rawErr.Error())
			report.sort()
			return report, generatedNavigationRawInventoryError(rawErr)
		}
		actual = mergeGeneratedNavigationActualItems(rendered, raw)
	}
	recordStaleGeneratedNavigationRows(&report, actual, expectedKeys)
	if err := reconcileGeneratedNavigationExclusions(ctx, opts, runtime.menuCode, actual, &report); err != nil {
		return report, err
	}
	report.sort()
	return report, nil
}

func prepareGeneratedNavigationReconcile(ctx context.Context, opts NavigationReconcileOptions) (seedNavigationRuntime, []admin.MenuItem, NavigationReconcileReport, error) {
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuSvc:      opts.MenuSvc,
		MenuCode:     opts.MenuCode,
		Locale:       opts.Locale,
		Items:        opts.Items,
		Logf:         opts.Logf,
		SkipLogger:   opts.Logf == nil,
		RawInventory: opts.RawInventory,
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
	recordGeneratedNavigationCoordination(&report, opts.MenuSvc, normalizeNavigationRawInventoryOptions(opts.RawInventory, runtime.menuCode))
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

func loadGeneratedNavigationRawItems(ctx context.Context, menuSvc admin.CMSMenuService, opts admin.NavigationRawInventoryOptions) ([]admin.MenuItem, error) {
	if scoped, ok := menuSvc.(scopedRawMenuInventoryProvider); ok && scoped != nil {
		items, err := scoped.RawMenuItemsWithOptions(ctx, opts)
		if err != nil {
			return nil, err
		}
		return flattenReconcileMenuItems(items), nil
	}
	provider, ok := menuSvc.(rawMenuInventoryProvider)
	if !ok || provider == nil {
		return nil, nil
	}
	items, err := provider.RawMenuItems(ctx, opts.MenuCode)
	if err != nil {
		return nil, err
	}
	return flattenReconcileMenuItems(items), nil
}

func withGeneratedNavigationConvergence(ctx context.Context, opts NavigationReconcileOptions, runtime seedNavigationRuntime, fn func(context.Context) error) error {
	if fn == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	generatedNavigationConvergenceMu.Lock()
	defer generatedNavigationConvergenceMu.Unlock()

	scopeOptions := normalizeNavigationRawInventoryOptions(opts.RawInventory, runtime.menuCode)
	scope := admin.NavigationConvergenceScope{
		MenuCode:          scopeOptions.MenuCode,
		Environment:       scopeOptions.Environment,
		EnvironmentSource: scopeOptions.EnvironmentSource,
		EngineIdentity:    navcontract.EngineIdentity,
		EngineVersion:     navcontract.EngineVersion,
	}
	if coordinator, ok := opts.MenuSvc.(admin.NavigationConvergenceCoordinator); ok && coordinator != nil {
		return coordinator.WithNavigationConvergence(ctx, scope, fn)
	}
	return fn(ctx)
}

func normalizeNavigationRawInventoryOptions(opts admin.NavigationRawInventoryOptions, menuCode string) admin.NavigationRawInventoryOptions {
	if effectiveMenuCode := strings.TrimSpace(menuCode); effectiveMenuCode != "" {
		opts.MenuCode = effectiveMenuCode
	} else {
		opts.MenuCode = strings.TrimSpace(opts.MenuCode)
	}
	if strings.TrimSpace(opts.Environment) == "" {
		opts.Environment = "default"
	}
	if strings.TrimSpace(opts.EnvironmentSource) == "" {
		opts.EnvironmentSource = "default"
	}
	return opts
}

func recordGeneratedNavigationCoordination(report *NavigationReconcileReport, menuSvc admin.CMSMenuService, opts admin.NavigationRawInventoryOptions) {
	if report == nil {
		return
	}
	coordination := generatedNavigationCoordinationReport(menuSvc, opts)
	report.CoordinationBackend = coordination.Backend
	report.CoordinationScope = coordination.Scope
	report.CoordinationSupported = coordination.Supported
	report.CoordinationWarning = strings.TrimSpace(coordination.Warning)
}

func generatedNavigationCoordinationReport(menuSvc admin.CMSMenuService, opts admin.NavigationRawInventoryOptions) admin.NavigationCoordinationReport {
	report := admin.NavigationCoordinationReport{
		Backend:   "process",
		Scope:     "quickstart-process",
		Supported: false,
		Warning:   "backend coordination unavailable; generated navigation convergence is serialized only inside this process",
	}
	if menuSvc == nil {
		return report
	}
	if provider, ok := menuSvc.(interface {
		NavigationCoordinationReport() admin.NavigationCoordinationReport
	}); ok && provider != nil {
		provided := provider.NavigationCoordinationReport()
		if value := strings.TrimSpace(provided.Backend); value != "" {
			report.Backend = value
		}
		if value := strings.TrimSpace(provided.Scope); value != "" {
			report.Scope = value
		}
		report.Supported = provided.Supported
		report.Warning = strings.TrimSpace(provided.Warning)
		return report
	}
	if _, ok := menuSvc.(admin.NavigationConvergenceCoordinator); ok {
		report.Backend = "custom"
		report.Scope = strings.TrimSpace(opts.MenuCode)
		if report.Scope == "" {
			report.Scope = "menu"
		}
		if env := strings.TrimSpace(opts.Environment); env != "" {
			report.Scope += ":" + env
		}
		report.Supported = true
		report.Warning = ""
	}
	return report
}

func generatedNavigationRawInventoryError(err error) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("generated navigation raw inventory unavailable: %w", err)
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

func recordGeneratedNavigationActualState(report *NavigationReconcileReport, actual, expected []admin.MenuItem) {
	actualIdentityCount := map[string]int{}
	for _, item := range actual {
		keys := generatedNavigationDuplicateIdentityKeys(item)
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

func generatedNavigationDuplicateIdentityKeys(item admin.MenuItem) []string {
	keys := navcontract.IdentityKeys(navigationContractItem(item))
	out := make([]string, 0, len(keys))
	for _, key := range keys {
		if strings.HasPrefix(key, "id_suffix:") {
			continue
		}
		out = append(out, key)
	}
	return out
}

func reconcileGeneratedNavigationExpectedItems(ctx context.Context, opts NavigationReconcileOptions, runtime seedNavigationRuntime, expected, actual []admin.MenuItem, report *NavigationReconcileReport) (map[string]bool, error) {
	plan := navcontract.PlanConvergence(navigationContractItems(expected), navigationContractItems(actual), navcontract.ConvergenceOptions{
		MatchPolicy:      navcontract.MatchPolicy{Owner: navcontract.OwnerQuickstart},
		Apply:            opts.Apply,
		AllowDestructive: opts.AllowDestructive,
		Preserve:         preserveGeneratedNavigationContractFields,
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
		recordPersistedGeneratedNavigationPlannedItem(report, expected, actual, planned)
		return nil
	case navcontract.ConvergenceUpdate:
		return updateGeneratedNavigationPlannedItem(ctx, opts, menuCode, expected, actual, update, planned, report)
	case navcontract.ConvergenceReplace:
		return replaceGeneratedNavigationPlannedItem(ctx, opts, menuCode, expected, actual, update, planned, report)
	default:
		return nil
	}
}

func recordPersistedGeneratedNavigationPlannedItem(report *NavigationReconcileReport, expected, actual admin.MenuItem, planned navcontract.PlannedItem) {
	report.PersistedPresent = append(report.PersistedPresent, expected.ID)
	if planned.StaleTargetState {
		report.StaleTargetStateCleanup = append(report.StaleTargetStateCleanup, actual.ID)
	}
	report.PreservedGeneratedFields = append(report.PreservedGeneratedFields, planned.PreservedFields...)
}

func updateGeneratedNavigationPlannedItem(ctx context.Context, opts NavigationReconcileOptions, menuCode string, expected, actual, update admin.MenuItem, planned navcontract.PlannedItem, report *NavigationReconcileReport) error {
	recordPersistedGeneratedNavigationPlannedItem(report, expected, actual, planned)
	if planned.DestructiveCandidate {
		report.DestructiveCandidates = append(report.DestructiveCandidates, actual.ID)
	}
	report.Updates = append(report.Updates, expected.ID)
	if !opts.Apply {
		return nil
	}
	return opts.MenuSvc.UpdateMenuItem(ctx, menuCode, update)
}

func replaceGeneratedNavigationPlannedItem(ctx context.Context, opts NavigationReconcileOptions, menuCode string, expected, actual, update admin.MenuItem, planned navcontract.PlannedItem, report *NavigationReconcileReport) error {
	recordPersistedGeneratedNavigationPlannedItem(report, expected, actual, planned)
	report.DestructiveCandidates = append(report.DestructiveCandidates, actual.ID)
	if !opts.Apply {
		return nil
	}
	report.Creates = append(report.Creates, expected.ID)
	if err := addGeneratedNavigationItemAndVerifyRendered(ctx, opts, menuCode, update.Locale, update); err != nil {
		return err
	}
	if err := opts.MenuSvc.DeleteMenuItem(ctx, menuCode, actual.ID); err != nil && !errors.Is(err, admin.ErrMenuTargetNotFound) && !errors.Is(err, admin.ErrNotFound) {
		return err
	}
	removeGeneratedNavigationReportPresence(report, expected)
	return nil
}

func createMissingGeneratedNavigationItem(ctx context.Context, opts NavigationReconcileOptions, menuCode string, item admin.MenuItem, report *NavigationReconcileReport) error {
	removeGeneratedNavigationReportPresence(report, item)
	report.Creates = append(report.Creates, item.ID)
	report.PersistedMissing = append(report.PersistedMissing, item.ID)
	if !opts.Apply {
		return nil
	}
	return opts.MenuSvc.AddMenuItem(ctx, menuCode, item)
}

type generatedNavigationSnapshot struct {
	rendered []admin.MenuItem
	actual   []admin.MenuItem
}

func ensureAppliedGeneratedNavigationItems(ctx context.Context, opts NavigationReconcileOptions, runtime seedNavigationRuntime, expected []admin.MenuItem, report *NavigationReconcileReport) error {
	snapshot, err := loadGeneratedNavigationSnapshot(ctx, opts, runtime, report)
	if err != nil {
		return err
	}
	if err = repairMissingAppliedGeneratedNavigationItems(ctx, opts, runtime.menuCode, expected, snapshot.actual, report); err != nil {
		return err
	}
	snapshot, err = loadGeneratedNavigationSnapshot(ctx, opts, runtime, report)
	if err != nil {
		return err
	}
	changed, err := cleanupAppliedWeakGeneratedNavigationMatches(ctx, opts, runtime.menuCode, expected, snapshot.actual, report)
	if err != nil {
		return err
	}
	if changed {
		snapshot, err = loadGeneratedNavigationSnapshot(ctx, opts, runtime, report)
		if err != nil {
			return err
		}
	}
	return validateAppliedGeneratedNavigationItems(expected, snapshot, report)
}

func loadGeneratedNavigationSnapshot(ctx context.Context, opts NavigationReconcileOptions, runtime seedNavigationRuntime, report *NavigationReconcileReport) (generatedNavigationSnapshot, error) {
	rendered, err := loadGeneratedNavigationActualItems(ctx, opts.MenuSvc, runtime.menuCode, runtime.locale)
	if err != nil {
		return generatedNavigationSnapshot{}, err
	}
	raw, rawErr := loadGeneratedNavigationRawItems(ctx, opts.MenuSvc, normalizeNavigationRawInventoryOptions(opts.RawInventory, runtime.menuCode))
	if rawErr != nil {
		report.RawInventoryUnavailable = append(report.RawInventoryUnavailable, rawErr.Error())
		if opts.Apply {
			return generatedNavigationSnapshot{}, generatedNavigationRawInventoryError(rawErr)
		}
	}
	return generatedNavigationSnapshot{
		rendered: rendered,
		actual:   mergeGeneratedNavigationActualItems(rendered, raw),
	}, nil
}

func repairMissingAppliedGeneratedNavigationItems(ctx context.Context, opts NavigationReconcileOptions, menuCode string, expected, actual []admin.MenuItem, report *NavigationReconcileReport) error {
	for _, item := range expected {
		if !generatedMenuItemOwned(item) {
			continue
		}
		if exactGeneratedNavigationItemPresent(item, actual) {
			continue
		}
		if repairErr := repairAppliedExactGeneratedNavigationItem(ctx, opts, menuCode, item, actual, report); repairErr != nil {
			return repairErr
		}
	}
	return nil
}

func validateAppliedGeneratedNavigationItems(expected []admin.MenuItem, snapshot generatedNavigationSnapshot, report *NavigationReconcileReport) error {
	missing := []string{}
	notRendered := []string{}
	for _, item := range expected {
		if !generatedMenuItemOwned(item) {
			continue
		}
		if exactGeneratedNavigationItemPresent(item, snapshot.rendered) {
			continue
		}
		if exactGeneratedNavigationItemPresent(item, snapshot.actual) {
			report.RawPresentButNotRendered = append(report.RawPresentButNotRendered, item.ID)
			notRendered = append(notRendered, item.ID)
			continue
		}
		missing = append(missing, item.ID)
	}
	if len(missing) > 0 {
		sort.Strings(missing)
		return fmt.Errorf("generated navigation items still missing after apply: %s", strings.Join(missing, ", "))
	}
	if len(notRendered) > 0 {
		sort.Strings(notRendered)
		return fmt.Errorf("generated navigation items still not rendered after apply: %s", strings.Join(notRendered, ", "))
	}
	return nil
}

func cleanupAppliedWeakGeneratedNavigationMatches(ctx context.Context, opts NavigationReconcileOptions, menuCode string, expected []admin.MenuItem, actual []admin.MenuItem, report *NavigationReconcileReport) (bool, error) {
	changed := false
	for _, item := range expected {
		if !generatedMenuItemOwned(item) {
			continue
		}
		if !exactGeneratedNavigationItemPresent(item, actual) {
			continue
		}
		candidate, ambiguous := exactGeneratedNavigationReplacementCandidate(item, actual)
		if ambiguous {
			report.DuplicateIdentities = append(report.DuplicateIdentities, "ambiguous_exact_cleanup:"+item.ID)
			continue
		}
		if candidate == nil {
			continue
		}
		removeGeneratedNavigationReportPresence(report, item)
		report.DestructiveCandidates = append(report.DestructiveCandidates, candidate.ID)
		if !opts.AllowDestructive {
			continue
		}
		if err := opts.MenuSvc.DeleteMenuItem(ctx, menuCode, candidate.ID); err != nil && !errors.Is(err, admin.ErrMenuTargetNotFound) && !errors.Is(err, admin.ErrNotFound) {
			return changed, err
		}
		changed = true
	}
	return changed, nil
}

//nolint:nestif // Replacement repair flow keeps mutation and report updates together.
func repairAppliedExactGeneratedNavigationItem(ctx context.Context, opts NavigationReconcileOptions, menuCode string, expected admin.MenuItem, actual []admin.MenuItem, report *NavigationReconcileReport) error {
	candidate, ambiguous := exactGeneratedNavigationReplacementCandidate(expected, actual)
	if ambiguous {
		report.DuplicateIdentities = append(report.DuplicateIdentities, "ambiguous_exact_replacement:"+expected.ID)
		return createMissingGeneratedNavigationItem(ctx, opts, menuCode, expected, report)
	}
	if candidate != nil {
		if generatedNavigationConcreteIDMatches(expected, *candidate) {
			report.Updates = append(report.Updates, expected.ID)
			if !opts.Apply {
				return nil
			}
			return opts.MenuSvc.UpdateMenuItem(ctx, menuCode, expected)
		}
		report.DestructiveCandidates = append(report.DestructiveCandidates, candidate.ID)
		report.Creates = append(report.Creates, expected.ID)
		report.PersistedMissing = append(report.PersistedMissing, expected.ID)
		if err := addGeneratedNavigationItemAndVerifyRendered(ctx, opts, menuCode, expected.Locale, expected); err != nil {
			return err
		}
		if !opts.AllowDestructive {
			removeGeneratedNavigationReportPresence(report, expected)
			return nil
		}
		if err := opts.MenuSvc.DeleteMenuItem(ctx, menuCode, candidate.ID); err != nil && !errors.Is(err, admin.ErrMenuTargetNotFound) && !errors.Is(err, admin.ErrNotFound) {
			return err
		}
		removeGeneratedNavigationReportPresence(report, expected)
		return nil
	}
	return createMissingGeneratedNavigationItem(ctx, opts, menuCode, expected, report)
}

func addGeneratedNavigationItemAndVerifyRendered(ctx context.Context, opts NavigationReconcileOptions, menuCode, locale string, item admin.MenuItem) error {
	if err := opts.MenuSvc.AddMenuItem(ctx, menuCode, item); err != nil {
		return err
	}
	rendered, err := loadGeneratedNavigationActualItems(ctx, opts.MenuSvc, menuCode, locale)
	if err != nil {
		return err
	}
	if !exactGeneratedNavigationItemPresent(item, rendered) {
		return fmt.Errorf("generated navigation item not rendered after create: %s", item.ID)
	}
	return nil
}

func exactGeneratedNavigationReplacementCandidate(expected admin.MenuItem, actual []admin.MenuItem) (*admin.MenuItem, bool) {
	matches := []admin.MenuItem{}
	for _, item := range actual {
		if generatedNavigationConcreteIDMatches(expected, item) {
			continue
		}
		if exactGeneratedNavigationItemPresent(expected, []admin.MenuItem{item}) {
			continue
		}
		if !generatedMenuItemOwned(item) {
			continue
		}
		if !matchesAnyExpectedGeneratedRow(item, []admin.MenuItem{expected}) {
			continue
		}
		matches = append(matches, item)
	}
	switch len(matches) {
	case 0:
		return nil, false
	case 1:
		candidate := matches[0]
		return &candidate, false
	default:
		return nil, true
	}
}

func generatedNavigationConcreteIDMatches(expected, actual admin.MenuItem) bool {
	expectedID := strings.TrimSpace(expected.ID)
	if expectedID == "" {
		return false
	}
	return strings.EqualFold(strings.TrimSpace(actual.ID), expectedID) ||
		strings.EqualFold(strings.TrimSpace(actual.Code), expectedID)
}

func removeGeneratedNavigationReportPresence(report *NavigationReconcileReport, item admin.MenuItem) {
	if report == nil {
		return
	}
	report.PersistedPresent = removeGeneratedNavigationReportItem(report.PersistedPresent, item)
}

func removeGeneratedNavigationReportItem(values []string, item admin.MenuItem) []string {
	if len(values) == 0 {
		return values
	}
	out := values[:0]
	for _, value := range values {
		if generatedNavigationReportIDMatches(value, item) {
			continue
		}
		out = append(out, value)
	}
	return out
}

func generatedNavigationReportIDMatches(value string, item admin.MenuItem) bool {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return false
	}
	expectedID := strings.ToLower(strings.TrimSpace(item.ID))
	expectedGeneratedID := strings.ToLower(strings.TrimSpace(stringTargetValue(item.Target, MenuTargetGeneratedIDKey)))
	for _, expected := range []string{expectedID, expectedGeneratedID} {
		if expected == "" {
			continue
		}
		if normalized == expected {
			return true
		}
	}
	return legacyMenuItemIDMatches(item, admin.MenuItem{ID: normalized})
}

func exactGeneratedNavigationItemPresent(expected admin.MenuItem, actual []admin.MenuItem) bool {
	expectedID := strings.ToLower(strings.TrimSpace(expected.ID))
	expectedGeneratedID := strings.ToLower(strings.TrimSpace(stringTargetValue(expected.Target, MenuTargetGeneratedIDKey)))
	if expectedID == "" && expectedGeneratedID == "" {
		return false
	}
	for _, item := range actual {
		if expectedID != "" {
			if strings.EqualFold(strings.TrimSpace(item.ID), expectedID) || strings.EqualFold(strings.TrimSpace(item.Code), expectedID) {
				return true
			}
		}
		if expectedGeneratedID != "" && strings.EqualFold(strings.TrimSpace(stringTargetValue(item.Target, MenuTargetGeneratedIDKey)), expectedGeneratedID) {
			return true
		}
	}
	return false
}

func preserveGeneratedNavigationContractFields(actual, expected navcontract.Item) (navcontract.Item, []string) {
	update := adminMenuItemFromNavigationContract(expected)
	preserved := preserveGeneratedMenuItemFields(adminMenuItemFromNavigationContract(actual), &update)
	return navigationContractItem(update), preserved
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
	sort.Strings(report.RetiredManagedItems)
}

func reconcileGeneratedNavigationExclusions(ctx context.Context, opts NavigationReconcileOptions, menuCode string, actual []admin.MenuItem, report *NavigationReconcileReport) error {
	if len(opts.ManagedExclusions) == 0 {
		return nil
	}
	for _, exclusion := range opts.ManagedExclusions {
		matches := generatedNavigationExclusionMatches(exclusion, actual)
		switch len(matches) {
		case 0:
			continue
		case 1:
			item := matches[0]
			report.RetiredManagedItems = append(report.RetiredManagedItems, item.ID)
			report.DestructiveCandidates = append(report.DestructiveCandidates, item.ID)
			if !opts.Apply || (!opts.AllowDestructive && !opts.RetireManagedExclusions) {
				continue
			}
			if err := opts.MenuSvc.DeleteMenuItem(ctx, menuCode, item.ID); err != nil && !errors.Is(err, admin.ErrMenuTargetNotFound) && !errors.Is(err, admin.ErrNotFound) {
				return err
			}
		default:
			report.DuplicateIdentities = append(report.DuplicateIdentities, "ambiguous_retired:"+navigationManagedExclusionIdentity(exclusion))
		}
	}
	return nil
}

func generatedNavigationExclusionMatches(exclusion NavigationManagedExclusion, actual []admin.MenuItem) []admin.MenuItem {
	out := []admin.MenuItem{}
	seen := map[string]bool{}
	for _, item := range actual {
		if !generatedMenuItemOwned(item) {
			continue
		}
		if !navigationManagedExclusionMatchesItem(exclusion, item) {
			continue
		}
		out = appendUniqueMenuItemByID(out, seen, item)
	}
	return out
}

func navigationManagedExclusionMatchesItem(exclusion NavigationManagedExclusion, item admin.MenuItem) bool {
	if id := strings.TrimSpace(exclusion.ID); id != "" {
		if strings.EqualFold(strings.TrimSpace(item.ID), id) || strings.EqualFold(strings.TrimSpace(item.Code), id) {
			return true
		}
	}
	if generatedID := strings.TrimSpace(exclusion.GeneratedID); generatedID != "" {
		if strings.EqualFold(strings.TrimSpace(stringTargetValue(item.Target, MenuTargetGeneratedIDKey)), generatedID) {
			return true
		}
	}
	if key := strings.TrimSpace(exclusion.TargetKey); key != "" {
		if strings.EqualFold(strings.TrimSpace(stringTargetValue(item.Target, "key")), key) {
			return true
		}
	}
	return false
}

func navigationManagedExclusionIdentity(exclusion NavigationManagedExclusion) string {
	for _, value := range []string{exclusion.ID, exclusion.GeneratedID, exclusion.TargetKey, exclusion.Reason} {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return "unknown"
}

func flattenReconcileMenuItems(items []admin.MenuItem) []admin.MenuItem {
	out := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		out = append(out, item)
		out = append(out, flattenReconcileMenuItems(item.Children)...)
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
		if generatedOwnedMenuItemsMatchExpected(item, actual) {
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

func generatedOwnedMenuItemsMatchExpected(expected, actual admin.MenuItem) bool {
	if !generatedMenuItemOwned(actual) {
		return false
	}
	actualGeneratedID := strings.ToLower(strings.TrimSpace(stringTargetValue(actual.Target, MenuTargetGeneratedIDKey)))
	if actualGeneratedID == "" {
		return reconcileMenuItemsShareKey(expected, actual)
	}
	expectedGeneratedID := strings.ToLower(strings.TrimSpace(stringTargetValue(expected.Target, MenuTargetGeneratedIDKey)))
	if expectedGeneratedID == "" {
		return generatedNavigationConcreteIDMatches(expected, actual)
	}
	return actualGeneratedID == expectedGeneratedID
}

func reconcileMenuItemsShareKey(a, b admin.MenuItem) bool {
	return navcontract.ShareIdentityKey(navigationContractItem(a), navigationContractItem(b))
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

//nolint:dupl // Bidirectional conversion intentionally mirrors every persisted menu field across package boundaries.
func navigationContractItem(item admin.MenuItem) navcontract.Item {
	return navcontract.Item{
		ID:            item.ID,
		Code:          item.Code,
		Type:          item.Type,
		Label:         item.Label,
		LabelKey:      item.LabelKey,
		GroupTitle:    item.GroupTitle,
		GroupTitleKey: item.GroupTitleKey,
		URLOverride:   cloneStringPtr(item.URLOverride),
		Target:        cloneAnyMap(item.Target),
		Icon:          item.Icon,
		Position:      cloneNavigationIntPtr(item.Position),
		PlacementSlot: navigationPlacementSlot(item.PlacementSlot, item.Target),
		Permissions:   append([]string{}, item.Permissions...),
		Badge:         cloneAnyMap(item.Badge),
		Classes:       append([]string{}, item.Classes...),
		Styles:        cloneStringMap(item.Styles),
		Menu:          item.Menu,
		ParentID:      item.ParentID,
		ParentCode:    item.ParentCode,
		Locale:        item.Locale,
		Collapsible:   item.Collapsible,
		Collapsed:     item.Collapsed,
	}
}

//nolint:dupl // Bidirectional conversion intentionally mirrors every persisted menu field across package boundaries.
func adminMenuItemFromNavigationContract(item navcontract.Item) admin.MenuItem {
	return admin.MenuItem{
		ID:            item.ID,
		Code:          item.Code,
		Type:          item.Type,
		Label:         item.Label,
		LabelKey:      item.LabelKey,
		GroupTitle:    item.GroupTitle,
		GroupTitleKey: item.GroupTitleKey,
		URLOverride:   cloneStringPtr(item.URLOverride),
		Target:        cloneAnyMap(item.Target),
		Icon:          item.Icon,
		Position:      cloneNavigationIntPtr(item.Position),
		PlacementSlot: navigationPlacementSlot(item.PlacementSlot, item.Target),
		Permissions:   append([]string{}, item.Permissions...),
		Badge:         cloneAnyMap(item.Badge),
		Classes:       append([]string{}, item.Classes...),
		Styles:        cloneStringMap(item.Styles),
		Menu:          item.Menu,
		ParentID:      item.ParentID,
		ParentCode:    item.ParentCode,
		Locale:        item.Locale,
		Collapsible:   item.Collapsible,
		Collapsed:     item.Collapsed,
	}
}

func navigationPlacementSlot(slot string, target map[string]any) string {
	if trimmed := strings.TrimSpace(slot); trimmed != "" {
		return trimmed
	}
	return stringTargetValue(target, MenuTargetPlacementSlotKey)
}

func cloneNavigationIntPtr(value *int) *int {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
}

func cloneStringPtr(value *string) *string {
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
