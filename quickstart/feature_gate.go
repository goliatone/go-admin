package quickstart

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-featuregate/adapters/configadapter"
	goauthadapter "github.com/goliatone/go-auth/adapters/featuregate"
	"github.com/goliatone/go-featuregate/adapters/optionsadapter"
	fggate "github.com/goliatone/go-featuregate/gate"
	"github.com/goliatone/go-featuregate/resolver"
)

func buildFeatureGate(cfg admin.Config, defaults map[string]bool, store admin.PreferencesStore) fggate.FeatureGate {
	merged := cloneFeatureDefaults(defaults)
	applyDebugFeatureDefaults(merged, cfg.Debug)
	defaultsConfig := configadapter.NewDefaultsFromBools(merged)
	options := []resolver.Option{
		resolver.WithDefaults(defaultsConfig),
		resolver.WithScopeResolver(goauthadapter.NewScopeResolver()),
	}
	if store != nil {
		stateStore := admin.NewPreferencesStoreAdapter(store)
		overrides := optionsadapter.NewStore(stateStore)
		options = append(options, resolver.WithOverrideStore(overrides))
	}
	return resolver.New(options...)
}

func mergeFeatureDefaults(base, overrides map[string]bool) map[string]bool {
	out := cloneFeatureDefaults(base)
	if out == nil {
		out = map[string]bool{}
	}
	for key, value := range overrides {
		out[key] = value
	}
	return out
}

func cloneFeatureDefaults(in map[string]bool) map[string]bool {
	if len(in) == 0 {
		return map[string]bool{}
	}
	out := make(map[string]bool, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}

func applyDebugFeatureDefaults(defaults map[string]bool, cfg admin.DebugConfig) {
	if defaults == nil {
		return
	}
	featureKey := strings.TrimSpace(cfg.FeatureKey)
	if featureKey == "" {
		featureKey = "debug"
	}
	defaults["debug"] = cfg.Enabled
	if featureKey != "debug" {
		defaults[featureKey] = cfg.Enabled
	}
}
