package admin

import fggate "github.com/goliatone/go-featuregate/gate"

// FeatureGate exposes the configured feature gate.
func (a *Admin) FeatureGate() fggate.FeatureGate {
	if a == nil {
		return nil
	}
	return a.featureGate
}

// ActivityReadEnabled reports whether the activity read API is wired.
func (a *Admin) ActivityReadEnabled() bool {
	if a == nil {
		return false
	}
	return a.activityFeed != nil
}
