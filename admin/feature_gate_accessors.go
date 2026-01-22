package admin

import fggate "github.com/goliatone/go-featuregate/gate"

// FeatureGate exposes the configured feature gate.
func (a *Admin) FeatureGate() fggate.FeatureGate {
	if a == nil {
		return nil
	}
	return a.featureGate
}
