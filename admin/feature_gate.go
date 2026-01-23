package admin

import (
	"context"
	"strings"

	"github.com/goliatone/go-featuregate/adapters/configadapter"
	fggate "github.com/goliatone/go-featuregate/gate"
	"github.com/goliatone/go-featuregate/resolver"
)

func newFeatureGateFromFlags(flags map[string]bool) fggate.FeatureGate {
	if flags == nil {
		flags = map[string]bool{}
	}
	defaults := configadapter.NewDefaultsFromBools(flags)
	return resolver.New(resolver.WithDefaults(defaults))
}

func featureEnabled(featureGate fggate.FeatureGate, feature FeatureKey) bool {
	return featureEnabledKey(featureGate, string(feature))
}

func featureEnabledKey(featureGate fggate.FeatureGate, feature string) bool {
	if featureGate == nil || strings.TrimSpace(feature) == "" {
		return false
	}
	enabled, err := featureGate.Enabled(context.Background(), feature, fggate.WithScopeChain(fggate.ScopeChain{{Kind: fggate.ScopeSystem}}))
	return err == nil && enabled
}
