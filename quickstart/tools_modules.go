package quickstart

import "github.com/goliatone/go-admin/admin"

// ActivityModuleOption customizes quickstart activity module defaults.
type ActivityModuleOption func(*admin.ActivityModule)

// NewActivityModule returns the built-in activity module under the quickstart Tools group.
func NewActivityModule(opts ...ActivityModuleOption) *admin.ActivityModule {
	mod := admin.NewActivityModule().WithMenuParent(NavigationGroupToolsID)
	for _, opt := range opts {
		if opt != nil {
			opt(mod)
		}
	}
	return mod
}

// FeatureFlagsModuleOption customizes quickstart feature flags module defaults.
type FeatureFlagsModuleOption func(*admin.FeatureFlagsModule)

// NewFeatureFlagsModule returns the built-in feature flags module under the quickstart Tools group.
func NewFeatureFlagsModule(opts ...FeatureFlagsModuleOption) *admin.FeatureFlagsModule {
	mod := admin.NewFeatureFlagsModule().WithMenuParent(NavigationGroupToolsID)
	for _, opt := range opts {
		if opt != nil {
			opt(mod)
		}
	}
	return mod
}

// DebugModuleOption customizes quickstart debug module defaults.
type DebugModuleOption func(*admin.DebugModule)

// NewDebugModule returns the built-in debug module under the quickstart Tools group.
func NewDebugModule(cfg admin.DebugConfig, opts ...DebugModuleOption) *admin.DebugModule {
	mod := admin.NewDebugModule(cfg).WithMenuParent(NavigationGroupToolsID)
	for _, opt := range opts {
		if opt != nil {
			opt(mod)
		}
	}
	return mod
}

