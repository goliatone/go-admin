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
	enabled, err := gate.Enabled(context.Background(), feature, fggate.WithScopeChain(fggate.ScopeChain{{Kind: fggate.ScopeSystem}}))
	return err == nil && enabled
}
