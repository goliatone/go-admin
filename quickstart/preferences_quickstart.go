package quickstart

import (
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-users/pkg/types"
)

// PreferencesOption customizes NewAdminWithGoUsersPreferences behavior.
type PreferencesOption func(*preferencesOptions)

type preferencesOptions struct {
	enabledFeatures map[admin.FeatureKey]bool
	hooks           AdapterHooks
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

// WithPreferencesAdapterHooks sets adapter hooks used by NewAdminWithGoUsersPreferences.
func WithPreferencesAdapterHooks(hooks AdapterHooks) PreferencesOption {
	return func(opts *preferencesOptions) {
		if opts == nil {
			return
		}
		opts.hooks = hooks
	}
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
	featureDefaults := applyPreferencesOptions(options)
	adminOpts := []AdminOption{WithAdminDependencies(admin.Dependencies{PreferencesStore: store})}
	if len(featureDefaults) > 0 {
		adminOpts = append(adminOpts, WithFeatureDefaults(featureDefaults))
	}
	adm, _, err := NewAdmin(cfg, options.hooks, adminOpts...)
	if err != nil {
		return nil, err
	}
	return adm, nil
}

func applyPreferencesOptions(options preferencesOptions) map[string]bool {
	if len(options.enabledFeatures) == 0 {
		return nil
	}
	defaults := map[string]bool{}
	for feature := range options.enabledFeatures {
		if feature == "" {
			continue
		}
		defaults[string(feature)] = true
	}
	return defaults
}
