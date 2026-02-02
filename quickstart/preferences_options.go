package quickstart

import (
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-users/pkg/types"
)

// EnableFeature enables a single admin feature key for quickstart.NewAdmin.
func EnableFeature(feature admin.FeatureKey) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil || feature == "" {
			return
		}
		if opts.featureDefaults == nil {
			opts.featureDefaults = map[string]bool{}
		}
		opts.featureDefaults[string(feature)] = true
	}
}

// EnablePreferences enables the preferences feature gate.
func EnablePreferences() AdminOption {
	return EnableFeature(admin.FeaturePreferences)
}

// WithGoUsersPreferencesRepository sets a go-users preference repository to be wrapped
// into an admin PreferencesStore when preferences dependencies are not already provided.
func WithGoUsersPreferencesRepository(repo types.PreferenceRepository) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil || repo == nil {
			return
		}
		opts.preferencesRepo = repo
	}
}

// WithGoUsersPreferencesRepositoryFactory sets a lazy go-users preference repository builder.
func WithGoUsersPreferencesRepositoryFactory(factory func() (types.PreferenceRepository, error)) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.preferencesRepoFactory = factory
	}
}
