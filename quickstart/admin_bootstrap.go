package quickstart

import (
	"context"
	"errors"

	"github.com/goliatone/go-admin/admin"
	theme "github.com/goliatone/go-theme"
	"github.com/goliatone/go-users/pkg/types"
)

// AdminOption customizes NewAdmin behavior.
type AdminOption func(*adminOptions)

type adminOptions struct {
	ctx                          context.Context
	deps                         admin.Dependencies
	flags                        *AdapterFlags
	featureDefaults              map[string]bool
	preferencesRepo              types.PreferenceRepository
	preferencesRepoFactory       func() (types.PreferenceRepository, error)
	themeSelector                theme.ThemeSelector
	themeManifest                *theme.Manifest
	translationPolicyConfig      TranslationPolicyConfig
	translationPolicyConfigSet   bool
	translationPolicyServices    TranslationPolicyServices
	translationProductConfig     TranslationProductConfig
	translationProductConfigSet  bool
	translationProductWarnings   []string
	translationExchangeConfig    TranslationExchangeConfig
	translationExchangeConfigSet bool
	translationQueueConfig       TranslationQueueConfig
	translationQueueConfigSet    bool
	errors                       []error
	registerUserRoleBulkRoutes   bool
}

func (o *adminOptions) addError(err error) {
	if o == nil || err == nil {
		return
	}
	o.errors = append(o.errors, err)
}

func (o *adminOptions) err() error {
	if o == nil || len(o.errors) == 0 {
		return nil
	}
	if len(o.errors) == 1 {
		return o.errors[0]
	}
	return errors.Join(o.errors...)
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

// WithTranslationPolicyConfig sets the translation policy config for quickstart defaults.
func WithTranslationPolicyConfig(cfg TranslationPolicyConfig) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.translationPolicyConfig = NormalizeTranslationPolicyConfig(cfg)
		opts.translationPolicyConfigSet = true
	}
}

// WithTranslationPolicyServices overrides the translation check services used by the default policy.
func WithTranslationPolicyServices(services TranslationPolicyServices) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.translationPolicyServices = services
	}
}

// NewAdmin constructs an admin instance with adapter wiring applied.
func NewAdmin(cfg admin.Config, hooks AdapterHooks, opts ...AdminOption) (*admin.Admin, AdapterResult, error) {
	options := adminOptions{
		ctx:                        context.Background(),
		registerUserRoleBulkRoutes: true,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	if err := options.err(); err != nil {
		return nil, AdapterResult{}, err
	}

	loggerProvider, logger := resolveQuickstartLoggerDependencies(options.deps.LoggerProvider, options.deps.Logger)
	options.deps.LoggerProvider = loggerProvider
	options.deps.Logger = logger
	setQuickstartDefaultLoggerDependencies(loggerProvider, logger)
	adaptersLogger := resolveQuickstartNamedLogger("quickstart.adapters", loggerProvider, logger)
	translationLogger := resolveQuickstartNamedLogger("quickstart.translation.product", loggerProvider, logger)
	if err := resolveTranslationProductOptions(cfg, &options); err != nil {
		logTranslationCapabilityValidationError(translationLogger, err)
		return nil, AdapterResult{}, err
	}

	var result AdapterResult
	if options.flags != nil {
		cfg, result = configureAdaptersWithFlagsLogger(options.ctx, cfg, hooks, *options.flags, adaptersLogger)
	} else {
		cfg, result = configureAdaptersWithFlagsLogger(options.ctx, cfg, hooks, ResolveAdapterFlags(), adaptersLogger)
	}
	if options.deps.TranslationPolicy == nil {
		policyCfg := DefaultTranslationPolicyConfig()
		if options.translationPolicyConfigSet {
			policyCfg = options.translationPolicyConfig
		}
		if options.translationPolicyConfigSet || policyCfg.DenyByDefault || hasTranslationPolicyRequirements(policyCfg) {
			policyCfg = NormalizeTranslationPolicyConfig(policyCfg)
			services := resolveTranslationPolicyServices(cfg, options.translationPolicyServices)
			if policy := NewTranslationPolicy(policyCfg, services); policy != nil {
				options.deps.TranslationPolicy = policy
			}
		}
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
	if options.translationExchangeConfigSet {
		if err := RegisterTranslationExchangeWiring(adm, options.translationExchangeConfig); err != nil {
			return nil, result, err
		}
	}
	if options.translationQueueConfigSet {
		policyCfg, hasPolicyCfg := queuePolicyConfigFromOptions(options)
		if err := RegisterTranslationQueueWiring(adm, options.translationQueueConfig, policyCfg, hasPolicyCfg); err != nil {
			return nil, result, err
		}
	}
	if options.themeSelector != nil {
		adm.WithGoTheme(options.themeSelector)
	}
	if options.themeManifest != nil {
		adm.WithThemeManifest(options.themeManifest)
	}
	ApplyAdapterIntegrations(adm, &result, hooks)
	if options.registerUserRoleBulkRoutes {
		if err := registerUserRoleBulkRoutes(adm, cfg); err != nil {
			return nil, result, err
		}
	}
	if shouldValidateTranslationProductRuntime(options) {
		if err := validateTranslationProductRuntime(adm, options.translationProductConfig, options.translationProductWarnings); err != nil {
			logTranslationCapabilityValidationError(translationLogger, err)
			return nil, result, err
		}
	}
	registerTranslationCapabilities(adm, options.translationProductConfig, options.translationProductWarnings)
	logTranslationCapabilitiesStartup(translationLogger, TranslationCapabilities(adm))
	return adm, result, nil
}

func queuePolicyConfigFromOptions(opts adminOptions) (TranslationPolicyConfig, bool) {
	if opts.translationPolicyConfigSet {
		return NormalizeTranslationPolicyConfig(opts.translationPolicyConfig), true
	}
	if policy, ok := opts.deps.TranslationPolicy.(translationPolicy); ok {
		return NormalizeTranslationPolicyConfig(policy.cfg), true
	}
	if policy, ok := opts.deps.TranslationPolicy.(*translationPolicy); ok && policy != nil {
		return NormalizeTranslationPolicyConfig(policy.cfg), true
	}
	return TranslationPolicyConfig{}, false
}
