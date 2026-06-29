package admin

import (
	"context"
	"strings"

	navcontract "github.com/goliatone/go-admin/internal/navigation"
	"github.com/goliatone/go-admin/internal/primitives"
)

type NavigationContributionPolicy string

const (
	NavigationContributionPolicyStrict   NavigationContributionPolicy = "strict"
	NavigationContributionPolicyTolerant NavigationContributionPolicy = "tolerant"
)

type NavigationRouteMissingPolicy string

const (
	NavigationRouteMissingPolicyAuto   NavigationRouteMissingPolicy = ""
	NavigationRouteMissingPolicyStrict NavigationRouteMissingPolicy = "strict"
	NavigationRouteMissingPolicyReport NavigationRouteMissingPolicy = "report"
)

type NavigationLifecycleReport struct {
	ContributionsClosed        bool                         `json:"contributions_closed"`
	Policy                     NavigationContributionPolicy `json:"policy"`
	ContributionPolicyEnforced bool                         `json:"contribution_policy_enforced"`
	RouteMissingPolicy         NavigationRouteMissingPolicy `json:"route_missing_policy"`
	Environment                string                       `json:"environment"`
	EnvironmentSource          string                       `json:"environment_source"`
	CoordinationBackend        string                       `json:"coordination_backend"`
	CoordinationScope          string                       `json:"coordination_scope"`
	CoordinationSupported      bool                         `json:"coordination_supported"`
	PersistenceBackend         string                       `json:"persistence_backend,omitempty"`
	RawInventoryScope          string                       `json:"raw_inventory_scope,omitempty"`
	RawInventoryBounded        bool                         `json:"raw_inventory_bounded"`
	RawInventoryEnvScoped      bool                         `json:"raw_inventory_env_scoped"`
	SoftDeletedRowsVisible     bool                         `json:"soft_deleted_rows_visible"`
	TransactionalApply         bool                         `json:"transactional_apply"`
	QueuedItems                int                          `json:"queued_items"`
	EngineIdentity             string                       `json:"engine_identity,omitempty"`
	EngineVersion              string                       `json:"engine_version,omitempty"`
	RouteMissingItems          []string                     `json:"route_missing_items,omitempty"`
	RawInventoryErrors         []string                     `json:"raw_inventory_errors,omitempty"`
	CoordinationWarnings       []string                     `json:"coordination_warnings,omitempty"`
	PersistenceWarnings        []string                     `json:"persistence_warnings,omitempty"`
}

type NavigationRawInventoryOptions struct {
	MenuCode          string
	Environment       string
	EnvironmentSource string
}

type NavigationConvergenceScope struct {
	MenuCode          string
	Environment       string
	EnvironmentSource string
	EngineIdentity    string
	EngineVersion     string
}

type NavigationConvergenceCoordinator interface {
	WithNavigationConvergence(ctx context.Context, scope NavigationConvergenceScope, fn func(context.Context) error) error
}

type NavigationCoordinationReport struct {
	Backend   string
	Scope     string
	Supported bool
	Warning   string
}

type NavigationPersistenceReport struct {
	Backend                string
	RawInventoryScope      string
	RawInventoryBounded    bool
	RawInventoryEnvScoped  bool
	SoftDeletedRowsVisible bool
	TransactionalApply     bool
	Warnings               []string
}

func (a *Admin) WithNavigationContributionPolicy(policy NavigationContributionPolicy) *Admin {
	if a == nil {
		return a
	}
	a.navigationLifecycleMu.Lock()
	defer a.navigationLifecycleMu.Unlock()
	a.navigationContributionPolicy = normalizeNavigationContributionPolicy(policy)
	a.navigationContributionPolicySet = true
	return a
}

func (a *Admin) WithNavigationRouteMissingPolicy(policy NavigationRouteMissingPolicy) *Admin {
	if a == nil {
		return a
	}
	a.navigationLifecycleMu.Lock()
	defer a.navigationLifecycleMu.Unlock()
	a.navigationRouteMissingPolicy = normalizeNavigationRouteMissingPolicy(policy)
	return a
}

func (a *Admin) CloseNavigationContributions() NavigationLifecycleReport {
	if a == nil {
		return NavigationLifecycleReport{}
	}
	a.navigationLifecycleMu.Lock()
	defer a.navigationLifecycleMu.Unlock()
	a.navigationContributionsClosed = true
	return a.navigationLifecycleReportLocked()
}

func (a *Admin) NavigationLifecycleReport() NavigationLifecycleReport {
	if a == nil {
		return NavigationLifecycleReport{}
	}
	a.navigationLifecycleMu.Lock()
	defer a.navigationLifecycleMu.Unlock()
	return a.navigationLifecycleReportLocked()
}

func (a *Admin) FlushQueuedNavigationContributions(ctx context.Context) error {
	if a == nil {
		return nil
	}
	a.navigationLifecycleMu.Lock()
	items := cloneNavigationContributionItems(a.queuedNavigationItems)
	a.queuedNavigationItems = nil
	a.navigationLifecycleMu.Unlock()
	if len(items) == 0 {
		return nil
	}
	if err := a.addMenuItemsNow(ctx, items); err != nil {
		a.navigationLifecycleMu.Lock()
		a.queuedNavigationItems = append(cloneNavigationContributionItems(items), a.queuedNavigationItems...)
		a.navigationLifecycleMu.Unlock()
		return err
	}
	return nil
}

func (a *Admin) queueOrRejectLateNavigationItems(items []MenuItem) (bool, error) {
	if a == nil || len(items) == 0 {
		return false, nil
	}
	a.navigationLifecycleMu.Lock()
	defer a.navigationLifecycleMu.Unlock()
	if !a.navigationContributionsClosed {
		return false, nil
	}
	if !a.navigationContributionPolicySet {
		return false, nil
	}
	switch normalizeNavigationContributionPolicy(a.navigationContributionPolicy) {
	case NavigationContributionPolicyTolerant:
		a.queuedNavigationItems = append(a.queuedNavigationItems, cloneNavigationContributionItems(items)...)
		return true, nil
	default:
		return true, validationDomainError("navigation contributions closed", map[string]any{
			"component": "navigation",
			"items":     len(items),
		})
	}
}

func (a *Admin) navigationLifecycleReportLocked() NavigationLifecycleReport {
	environment, source := a.navigationEnvironmentLocked()
	coordination := a.navigationCoordinationReportLocked()
	persistence := a.navigationPersistenceReportLocked()
	coordinationWarnings := append([]string{}, a.navigationCoordinationWarnings...)
	if !coordination.Supported {
		coordinationWarnings = appendUniqueString(coordinationWarnings, coordination.Warning)
	}
	return NavigationLifecycleReport{
		ContributionsClosed:        a.navigationContributionsClosed,
		Policy:                     normalizeNavigationContributionPolicy(a.navigationContributionPolicy),
		ContributionPolicyEnforced: a.navigationContributionPolicySet,
		RouteMissingPolicy:         a.effectiveNavigationRouteMissingPolicyLocked(),
		Environment:                environment,
		EnvironmentSource:          source,
		CoordinationBackend:        coordination.Backend,
		CoordinationScope:          coordination.Scope,
		CoordinationSupported:      coordination.Supported,
		PersistenceBackend:         persistence.Backend,
		RawInventoryScope:          persistence.RawInventoryScope,
		RawInventoryBounded:        persistence.RawInventoryBounded,
		RawInventoryEnvScoped:      persistence.RawInventoryEnvScoped,
		SoftDeletedRowsVisible:     persistence.SoftDeletedRowsVisible,
		TransactionalApply:         persistence.TransactionalApply,
		QueuedItems:                len(a.queuedNavigationItems),
		EngineIdentity:             navcontract.EngineIdentity,
		EngineVersion:              navcontract.EngineVersion,
		RouteMissingItems:          append([]string{}, a.navigationRouteMissingItems...),
		RawInventoryErrors:         append([]string{}, a.navigationRawInventoryErrors...),
		CoordinationWarnings:       coordinationWarnings,
		PersistenceWarnings:        append([]string{}, persistence.Warnings...),
	}
}

func (a *Admin) navigationEnvironmentLocked() (string, string) {
	if a == nil {
		return "default", "default"
	}
	if value := strings.TrimSpace(a.config.NavEnvironment); value != "" {
		return value, "config.nav_environment"
	}
	if value := strings.TrimSpace(a.config.Debug.Environment); value != "" {
		return value, "config.debug.environment"
	}
	return "default", "default"
}

func (a *Admin) navigationRawInventoryOptionsLocked(menuCode string) NavigationRawInventoryOptions {
	environment, source := a.navigationEnvironmentLocked()
	return NavigationRawInventoryOptions{
		MenuCode:          strings.TrimSpace(menuCode),
		Environment:       environment,
		EnvironmentSource: source,
	}
}

func (a *Admin) withNavigationConvergence(ctx context.Context, menuCode string, fn func(context.Context) error) error {
	if fn == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if a == nil {
		return fn(ctx)
	}
	a.navigationConvergenceMu.Lock()
	defer a.navigationConvergenceMu.Unlock()

	a.navigationLifecycleMu.Lock()
	rawOptions := a.navigationRawInventoryOptionsLocked(menuCode)
	coordination := a.navigationCoordinationReportLocked()
	a.navigationLifecycleMu.Unlock()
	if strings.TrimSpace(rawOptions.MenuCode) == "" {
		rawOptions.MenuCode = strings.TrimSpace(menuCode)
	}
	if a.menuSvc != nil && !coordination.Supported {
		a.recordNavigationCoordinationWarning(coordination.Warning)
	}
	scope := NavigationConvergenceScope{
		MenuCode:          rawOptions.MenuCode,
		Environment:       rawOptions.Environment,
		EnvironmentSource: rawOptions.EnvironmentSource,
		EngineIdentity:    navcontract.EngineIdentity,
		EngineVersion:     navcontract.EngineVersion,
	}
	if coordinator, ok := a.menuSvc.(NavigationConvergenceCoordinator); ok && coordinator != nil {
		return coordinator.WithNavigationConvergence(ctx, scope, fn)
	}
	return fn(ctx)
}

func (a *Admin) navigationCoordinationReportLocked() NavigationCoordinationReport {
	report := NavigationCoordinationReport{
		Backend:   "process",
		Scope:     "admin-process",
		Supported: false,
		Warning:   "backend coordination unavailable; convergence is serialized only inside this admin process",
	}
	if a == nil || a.menuSvc == nil {
		return report
	}
	if provider, ok := a.menuSvc.(navigationCoordinationReporter); ok && provider != nil {
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
	return report
}

func (a *Admin) navigationPersistenceReportLocked() NavigationPersistenceReport {
	report := NavigationPersistenceReport{
		Backend:                "unknown",
		RawInventoryScope:      "menu-code",
		RawInventoryBounded:    true,
		RawInventoryEnvScoped:  false,
		SoftDeletedRowsVisible: false,
		TransactionalApply:     false,
		Warnings: []string{
			"navigation persistence backend does not expose capability diagnostics",
		},
	}
	if a == nil || a.menuSvc == nil {
		return report
	}
	if provider, ok := a.menuSvc.(navigationPersistenceReporter); ok && provider != nil {
		provided := provider.NavigationPersistenceReport()
		if value := strings.TrimSpace(provided.Backend); value != "" {
			report.Backend = value
		}
		if value := strings.TrimSpace(provided.RawInventoryScope); value != "" {
			report.RawInventoryScope = value
		}
		report.RawInventoryBounded = provided.RawInventoryBounded
		report.RawInventoryEnvScoped = provided.RawInventoryEnvScoped
		report.SoftDeletedRowsVisible = provided.SoftDeletedRowsVisible
		report.TransactionalApply = provided.TransactionalApply
		report.Warnings = append([]string{}, provided.Warnings...)
		return report
	}
	return report
}

func normalizeNavigationContributionPolicy(policy NavigationContributionPolicy) NavigationContributionPolicy {
	switch strings.ToLower(strings.TrimSpace(string(policy))) {
	case "":
		return NavigationContributionPolicyTolerant
	case string(NavigationContributionPolicyTolerant):
		return NavigationContributionPolicyTolerant
	default:
		return NavigationContributionPolicyStrict
	}
}

func normalizeNavigationRouteMissingPolicy(policy NavigationRouteMissingPolicy) NavigationRouteMissingPolicy {
	switch strings.ToLower(strings.TrimSpace(string(policy))) {
	case string(NavigationRouteMissingPolicyReport):
		return NavigationRouteMissingPolicyReport
	case string(NavigationRouteMissingPolicyStrict):
		return NavigationRouteMissingPolicyStrict
	default:
		return NavigationRouteMissingPolicyAuto
	}
}

func (a *Admin) navigationRouteMissingPolicyStrict() bool {
	if a == nil {
		return true
	}
	a.navigationLifecycleMu.Lock()
	defer a.navigationLifecycleMu.Unlock()
	return a.effectiveNavigationRouteMissingPolicyLocked() == NavigationRouteMissingPolicyStrict
}

func (a *Admin) effectiveNavigationRouteMissingPolicyLocked() NavigationRouteMissingPolicy {
	if a == nil {
		return NavigationRouteMissingPolicyStrict
	}
	policy := normalizeNavigationRouteMissingPolicy(a.navigationRouteMissingPolicy)
	if policy != NavigationRouteMissingPolicyAuto {
		return policy
	}
	if a.config.Errors.DevMode || a.config.Debug.Enabled || navigationRouteMissingStrictEnvironment(a.config.Debug.Environment) {
		return NavigationRouteMissingPolicyStrict
	}
	return NavigationRouteMissingPolicyReport
}

func navigationRouteMissingStrictEnvironment(environment string) bool {
	switch strings.ToLower(strings.TrimSpace(environment)) {
	case "dev", "develop", "development", "local", "test", "testing":
		return true
	default:
		return false
	}
}

func (a *Admin) recordNavigationRouteMissing(item MenuItem) {
	if a == nil {
		return
	}
	id := strings.TrimSpace(item.ID)
	if id == "" {
		id = strings.TrimSpace(item.Code)
	}
	if id == "" {
		id = strings.TrimSpace(targetStringValue(item.Target, "key"))
	}
	if id == "" {
		id = "unknown"
	}
	a.navigationLifecycleMu.Lock()
	defer a.navigationLifecycleMu.Unlock()
	a.navigationRouteMissingItems = appendUniqueString(a.navigationRouteMissingItems, id)
}

func (a *Admin) recordNavigationRawInventoryUnavailable(menuCode string, err error) {
	if a == nil || err == nil {
		return
	}
	value := strings.TrimSpace(menuCode)
	if value == "" {
		value = "unknown"
	}
	value += ": " + strings.TrimSpace(err.Error())
	a.navigationLifecycleMu.Lock()
	defer a.navigationLifecycleMu.Unlock()
	a.navigationRawInventoryErrors = appendUniqueString(a.navigationRawInventoryErrors, value)
}

func (a *Admin) recordNavigationCoordinationWarning(warning string) {
	if a == nil {
		return
	}
	a.navigationLifecycleMu.Lock()
	defer a.navigationLifecycleMu.Unlock()
	a.navigationCoordinationWarnings = appendUniqueString(a.navigationCoordinationWarnings, warning)
}

func appendUniqueString(values []string, value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return values
	}
	for _, existing := range values {
		if strings.EqualFold(strings.TrimSpace(existing), value) {
			return values
		}
	}
	return append(values, value)
}

func cloneStringPtr(value *string) *string {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
}

func cloneNavigationContributionItems(items []MenuItem) []MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]MenuItem, 0, len(items))
	for _, item := range items {
		clone := item
		clone.URLOverride = cloneStringPtr(item.URLOverride)
		clone.Target = primitives.CloneAnyMap(item.Target)
		clone.Badge = primitives.CloneAnyMap(item.Badge)
		clone.Classes = cloneStringSliceOrNil(item.Classes)
		clone.Styles = cloneStringMapOrNil(item.Styles)
		clone.Permissions = cloneStringSliceOrNil(item.Permissions)
		clone.Position = cloneIntPtr(item.Position)
		clone.Children = cloneNavigationContributionItems(item.Children)
		out = append(out, clone)
	}
	return out
}
