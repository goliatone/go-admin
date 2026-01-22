package handlers

import (
	"context"
	"strings"

	fggate "github.com/goliatone/go-featuregate/gate"
)

func featureEnabled(gate fggate.FeatureGate, feature string) bool {
	if gate == nil || strings.TrimSpace(feature) == "" {
		return false
	}
	enabled, err := gate.Enabled(context.Background(), feature, fggate.WithScopeSet(fggate.ScopeSet{System: true}))
	return err == nil && enabled
}
