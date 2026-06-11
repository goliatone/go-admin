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

type NavigationLifecycleReport struct {
	ContributionsClosed bool                         `json:"contributions_closed"`
	Policy              NavigationContributionPolicy `json:"policy"`
	QueuedItems         int                          `json:"queued_items"`
	EngineIdentity      string                       `json:"engine_identity,omitempty"`
	EngineVersion       string                       `json:"engine_version,omitempty"`
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
	return a.addMenuItemsNow(ctx, items)
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
		ContributionsClosed: a.navigationContributionsClosed,
		Policy:              normalizeNavigationContributionPolicy(a.navigationContributionPolicy),
		QueuedItems:         len(a.queuedNavigationItems),
		EngineIdentity:      navcontract.EngineIdentity,
		EngineVersion:       navcontract.EngineVersion,
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

func cloneNavigationContributionItems(items []MenuItem) []MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]MenuItem, 0, len(items))
	for _, item := range items {
		clone := item
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
