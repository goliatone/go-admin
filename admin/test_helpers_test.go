package admin

import (
	"context"
	"testing"

	"github.com/goliatone/go-command/registry"
	fggate "github.com/goliatone/go-featuregate/gate"
)

func mustNewAdmin(t *testing.T, cfg Config, deps Dependencies) *Admin {
	t.Helper()
	_ = registry.Stop(context.Background())
	adm, err := New(cfg, deps)
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	if adm != nil && adm.Commands() != nil {
		t.Cleanup(func() {
			adm.Commands().Reset()
		})
	}
	return adm
}

func featureGateFromFlags(flags map[string]bool) fggate.FeatureGate {
	return newFeatureGateFromFlags(flags)
}

func featureGateFromKeys(keys ...FeatureKey) fggate.FeatureGate {
	if len(keys) == 0 {
		return newFeatureGateFromFlags(nil)
	}
	flags := make(map[string]bool, len(keys))
	for _, key := range keys {
		if key == "" {
			continue
		}
		flags[string(key)] = true
	}
	return newFeatureGateFromFlags(flags)
}
