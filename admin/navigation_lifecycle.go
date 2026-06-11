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
	QueuedItems                int                          `json:"queued_items"`
	EngineIdentity             string                       `json:"engine_identity,omitempty"`
	EngineVersion              string                       `json:"engine_version,omitempty"`
	RouteMissingItems          []string                     `json:"route_missing_items,omitempty"`
	RawInventoryErrors         []string                     `json:"raw_inventory_errors,omitempty"`
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
	return NavigationLifecycleReport{
		ContributionsClosed:        a.navigationContributionsClosed,
		Policy:                     normalizeNavigationContributionPolicy(a.navigationContributionPolicy),
		ContributionPolicyEnforced: a.navigationContributionPolicySet,
		RouteMissingPolicy:         a.effectiveNavigationRouteMissingPolicyLocked(),
		QueuedItems:                len(a.queuedNavigationItems),
		EngineIdentity:             navcontract.EngineIdentity,
		EngineVersion:              navcontract.EngineVersion,
		RouteMissingItems:          append([]string{}, a.navigationRouteMissingItems...),
		RawInventoryErrors:         append([]string{}, a.navigationRawInventoryErrors...),
	}
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
