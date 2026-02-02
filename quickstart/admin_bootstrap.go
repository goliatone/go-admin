package quickstart

import (
	"context"

	"github.com/goliatone/go-admin/admin"
	theme "github.com/goliatone/go-theme"
	"github.com/goliatone/go-users/pkg/types"
)

// AdminOption customizes NewAdmin behavior.
type AdminOption func(*adminOptions)

type adminOptions struct {
	ctx                    context.Context
	deps                   admin.Dependencies
	flags                  *AdapterFlags
	featureDefaults        map[string]bool
	preferencesRepo        types.PreferenceRepository
	preferencesRepoFactory func() (types.PreferenceRepository, error)
	themeSelector          theme.ThemeSelector
	themeManifest          *theme.Manifest
}

// WithAdminContext sets the context used when resolving adapter hooks.
func WithAdminContext(ctx context.Context) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		if ctx != nil {
			opts.ctx = ctx
		}
	}
}

// WithAdminDependencies sets the admin dependencies passed to admin.New.
func WithAdminDependencies(deps admin.Dependencies) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.deps = deps
	}
}

// WithAdapterFlags overrides env-driven adapter flag resolution.
func WithAdapterFlags(flags AdapterFlags) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.flags = &flags
	}
}

// WithFeatureDefaults overrides or extends the feature defaults used to build the gate.
func WithFeatureDefaults(defaults map[string]bool) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil || len(defaults) == 0 {
			return
		}
		opts.featureDefaults = cloneFeatureDefaults(defaults)
	}
}

// WithThemeSelector wires a go-theme selector + manifest into admin.
func WithThemeSelector(selector theme.ThemeSelector, manifest *theme.Manifest) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.themeSelector = selector
		opts.themeManifest = manifest
	}
}

// NewAdmin constructs an admin instance with adapter wiring applied.
func NewAdmin(cfg admin.Config, hooks AdapterHooks, opts ...AdminOption) (*admin.Admin, AdapterResult, error) {
	options := adminOptions{
		ctx: context.Background(),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	var result AdapterResult
	if options.flags != nil {
		cfg, result = ConfigureAdaptersWithFlags(options.ctx, cfg, hooks, *options.flags)
	} else {
		cfg, result = ConfigureAdapters(options.ctx, cfg, hooks)
	}
	if options.deps.PreferencesStore == nil {
		repo := options.preferencesRepo
		if repo == nil && options.preferencesRepoFactory != nil {
			var err error
			repo, err = options.preferencesRepoFactory()
			if err != nil {
				return nil, result, err
			}
		}
		if repo != nil {
			store, err := NewGoUsersPreferencesStore(repo)
			if err != nil {
				return nil, result, err
			}
			options.deps.PreferencesStore = store
		}
	}
	if options.deps.PreferencesStore == nil {
		options.deps.PreferencesStore = admin.NewInMemoryPreferencesStore()
	}
	if options.deps.FeatureGate == nil {
		defaults := DefaultAdminFeatures()
		if len(options.featureDefaults) > 0 {
			defaults = mergeFeatureDefaults(defaults, options.featureDefaults)
		}
		options.deps.FeatureGate = buildFeatureGate(cfg, defaults, options.deps.PreferencesStore)
	}
	adm, err := admin.New(cfg, options.deps)
	if err != nil {
		return nil, result, err
	}
	if options.themeSelector != nil {
		adm.WithGoTheme(options.themeSelector)
	}
	if options.themeManifest != nil {
		adm.WithThemeManifest(options.themeManifest)
	}
	ApplyAdapterIntegrations(adm, &result, hooks)
	return adm, result, nil
}
