package quickstart

import (
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-users/pkg/types"
)

// PreferencesOption customizes NewAdminWithGoUsersPreferences behavior.
type PreferencesOption func(*preferencesOptions)

type preferencesOptions struct {
	enabledFeatures map[admin.FeatureKey]bool
}

// EnableFeature enables a single admin feature key.
func EnableFeature(feature admin.FeatureKey) PreferencesOption {
	return func(opts *preferencesOptions) {
		if opts == nil {
			return
		}
		if opts.enabledFeatures == nil {
			opts.enabledFeatures = map[admin.FeatureKey]bool{}
		}
		opts.enabledFeatures[feature] = true
	}
}

// EnablePreferences enables the preferences feature gate.
func EnablePreferences() PreferencesOption {
	return EnableFeature(admin.FeaturePreferences)
}

// NewAdminWithGoUsersPreferences wires a go-users preferences store and returns an admin instance.
func NewAdminWithGoUsersPreferences(cfg admin.Config, repo types.PreferenceRepository, opts ...PreferencesOption) (*admin.Admin, error) {
	store, err := NewGoUsersPreferencesStore(repo)
	if err != nil {
		return nil, err
	}
	options := preferencesOptions{}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	cfg = applyPreferencesOptions(cfg, options)
	return admin.New(cfg, admin.Dependencies{PreferencesStore: store})
}

func applyPreferencesOptions(cfg admin.Config, options preferencesOptions) admin.Config {
	if len(options.enabledFeatures) == 0 {
		return cfg
	}
	cfg.FeatureFlags = cloneFeatureFlags(cfg.FeatureFlags)
	for feature := range options.enabledFeatures {
		if feature == "" {
			continue
		}
		cfg.FeatureFlags[string(feature)] = true
	}
	return cfg
}

func cloneFeatureFlags(flags map[string]bool) map[string]bool {
	if len(flags) == 0 {
		return map[string]bool{}
	}
	out := make(map[string]bool, len(flags))
	for key, value := range flags {
		out[key] = value
	}
	return out
}
