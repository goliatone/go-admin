package quickstart

import (
	"context"
	"errors"
	"strings"

	"github.com/goliatone/go-admin/admin"
	theme "github.com/goliatone/go-theme"
	"github.com/goliatone/go-users/pkg/types"
	"golang.org/x/text/language"
	"golang.org/x/text/language/display"
)

// AdminOption customizes NewAdmin behavior.
type AdminOption func(*adminOptions)

// StartupPolicy controls how module startup validation errors are handled.
type StartupPolicy = admin.ModuleStartupPolicy

const (
	// StartupPolicyEnforce fails startup when module startup validation fails.
	StartupPolicyEnforce StartupPolicy = admin.ModuleStartupPolicyEnforce
	// StartupPolicyWarn logs startup validation failures and continues.
	StartupPolicyWarn StartupPolicy = admin.ModuleStartupPolicyWarn
)

type adminOptions struct {
	ctx                          context.Context
	deps                         admin.Dependencies
	flags                        *AdapterFlags
	commandExecutionPolicy       admin.CommandExecutionPolicy
	commandExecutionPolicySet    bool
	commandQueueRouting          CommandQueueRoutingConfig
	commandQueueRoutingSet       bool
	rpcTransportConfig           RPCTransportConfig
	rpcTransportConfigSet        bool
	featureSet                   map[string]bool
	featureDefaults              map[string]bool
	workflowConfig               WorkflowConfig
	workflowConfigSet            bool
	workflowConfigPath           string
	workflowRuntime              admin.WorkflowRuntime
	traitWorkflowDefaults        map[string]string
	preferencesRepo              types.PreferenceRepository
	preferencesRepoFactory       func() (types.PreferenceRepository, error)
	themeSelector                theme.ThemeSelector
	themeManifest                *theme.Manifest
	translationPolicyConfig      TranslationPolicyConfig
	translationPolicyConfigSet   bool
	translationPolicyServices    TranslationPolicyServices
	translationLocaleLabels      map[string]string
	translationProductConfig     TranslationProductConfig
	translationProductConfigSet  bool
	translationProductWarnings   []string
	translationExchangeConfig    TranslationExchangeConfig
	translationExchangeConfigSet bool
	translationQueueConfig       TranslationQueueConfig
	translationQueueConfigSet    bool
	startupPolicy                *admin.ModuleStartupPolicy
	doctorChecks                 []admin.DoctorCheck
	goUsersUserManagement        *goUsersUserManagementWiring
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

// WithFeatureDefaults applies compatibility feature overrides used to build the gate.
// It preserves legacy merge semantics against DefaultAdminFeatures.
func WithFeatureDefaults(defaults map[string]bool) AdminOption {
	return WithFeatureOverrides(defaults)
}

// WithFeatureOverrides merges feature overrides into the base defaults used to build the gate.
func WithFeatureOverrides(defaults map[string]bool) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil || len(defaults) == 0 {
			return
		}
		opts.featureDefaults = cloneFeatureDefaults(defaults)
	}
}

// WithFeatureSet replaces the base feature defaults used to build the quickstart feature gate.
func WithFeatureSet(defaults map[string]bool) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.featureSet = cloneFeatureDefaults(defaults)
	}
}

// WithMinimalFeatures replaces the quickstart feature defaults with DefaultMinimalFeatures.
func WithMinimalFeatures() AdminOption {
	return WithFeatureSet(DefaultMinimalFeatures())
}

// WithTraitWorkflowDefaults sets trait->workflow defaults applied to the admin instance.
func WithTraitWorkflowDefaults(defaults map[string]string) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.traitWorkflowDefaults = normalizeTraitWorkflowDefaultsOption(defaults)
	}
}

// WithWorkflowConfig sets external workflow definitions + trait defaults.
func WithWorkflowConfig(cfg WorkflowConfig) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.workflowConfig = NormalizeWorkflowConfig(cfg)
		opts.workflowConfigSet = true
	}
}

// WithWorkflowConfigFile loads external workflow definitions + trait defaults from file.
func WithWorkflowConfigFile(path string) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.workflowConfigPath = strings.TrimSpace(path)
	}
}

// WithWorkflowRuntime wires persisted workflow runtime management into admin bootstrap.
func WithWorkflowRuntime(runtime admin.WorkflowRuntime) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.workflowRuntime = runtime
	}
}

// WithThemeSelector wires an admin go-theme selector + manifest into quickstart admin bootstrap.
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

// WithTranslationLocaleLabels overrides locale labels used by create_translation action payload options.
func WithTranslationLocaleLabels(labels map[string]string) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.translationLocaleLabels = normalizeTranslationLocaleLabels(labels)
	}
}

// WithStartupPolicy configures module startup validation handling policy.
func WithStartupPolicy(policy StartupPolicy) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		normalized := normalizeStartupPolicy(policy)
		opts.startupPolicy = &normalized
	}
}

// WithDoctorChecks registers app-specific doctor diagnostics checks.
func WithDoctorChecks(checks ...admin.DoctorCheck) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil || len(checks) == 0 {
			return
		}
		for _, check := range checks {
			if strings.TrimSpace(check.ID) == "" || check.Run == nil {
				continue
			}
			opts.doctorChecks = append(opts.doctorChecks, check)
		}
	}
}

// NewAdmin constructs an admin instance with adapter wiring applied.
func NewAdmin(cfg admin.Config, hooks AdapterHooks, opts ...AdminOption) (*admin.Admin, AdapterResult, error) {
	options, optionsErr := resolveNewAdminOptions(opts)
	if optionsErr != nil {
		return nil, AdapterResult{}, optionsErr
	}

	loggerProvider, logger := resolveQuickstartLoggerDependencies(options.deps.LoggerProvider, options.deps.Logger)
	options.deps.LoggerProvider = loggerProvider
	options.deps.Logger = logger
	setQuickstartDefaultLoggerDependencies(loggerProvider, logger)
	adaptersLogger := resolveQuickstartNamedLogger("quickstart.adapters", loggerProvider, logger)
	translationLogger := resolveQuickstartNamedLogger("quickstart.translation.product", loggerProvider, logger)
	if productErr := resolveTranslationProductOptions(cfg, &options); productErr != nil {
		logTranslationCapabilityValidationError(translationLogger, productErr)
		return nil, AdapterResult{}, productErr
	}
	if !options.translationProductConfigSet && options.translationExchangeConfigSet {
		options.translationExchangeConfig.UI = normalizeTranslationExchangeUIConfig(options.translationExchangeConfig.UI, cfg.DefaultLocale, options.translationQueueConfig.SupportedLocales)
	}

	cfg, result, err := configureNewAdminAdapters(cfg, hooks, options, adaptersLogger)
	if err != nil {
		return nil, result, err
	}
	finalizeGoUsersUserManagement(cfg, &options)
	if runtimeErr := resolveAdminRuntimeDependencies(cfg, &options); runtimeErr != nil {
		return nil, result, runtimeErr
	}
	applyAdminRuntimeConfig(&cfg, &options)
	adm, err := admin.New(cfg, options.deps)
	if err != nil {
		return nil, result, err
	}
	if err := applyAdminPostCreateIntegrations(adm, cfg, hooks, &result, options); err != nil {
		return nil, result, err
	}
	if err := validateAndRegisterTranslationCapabilities(adm, options, translationLogger); err != nil {
		return nil, result, err
	}
	registerQuickstartDoctorChecks(adm, cfg, result, options)
	if err := configureAdminRuntimeQueues(adm, options); err != nil {
		return nil, result, err
	}
	return adm, result, nil
}

func resolveNewAdminOptions(opts []AdminOption) (adminOptions, error) {
	options := adminOptions{
		ctx:                        context.Background(),
		registerUserRoleBulkRoutes: false,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	if err := options.err(); err != nil {
		return options, err
	}
	if err := resolveWorkflowConfigOptions(&options); err != nil {
		return options, err
	}
	return options, nil
}

func configureNewAdminAdapters(cfg admin.Config, hooks AdapterHooks, options adminOptions, logger admin.Logger) (admin.Config, AdapterResult, error) {
	flags := AdapterFlags{}
	if options.flags != nil {
		flags = *options.flags
	}
	cfg, result := configureAdaptersWithFlagsLogger(options.ctx, cfg, hooks, flags, logger)
	if result.Flags.UsePersistentCMS && !result.PersistentCMSSet {
		if result.PersistentCMSError != nil {
			return cfg, result, result.PersistentCMSError
		}
		return cfg, result, ErrPersistentCMSSetupFailed
	}
	return cfg, result, nil
}

func applyAdminRuntimeConfig(cfg *admin.Config, options *adminOptions) {
	applyRPCTransportPolicyConfig(cfg, options)
	applyCommandExecutionRoutingConfig(cfg, *options)
	if options.workflowRuntime != nil {
		options.deps.WorkflowRuntime = options.workflowRuntime
	}
}

func applyAdminPostCreateIntegrations(adm *admin.Admin, cfg admin.Config, hooks AdapterHooks, result *AdapterResult, options adminOptions) error {
	if options.startupPolicy != nil {
		adm.WithModuleStartupPolicy(*options.startupPolicy)
	}
	configureCMSWorkflowTranslationActions(adm, options)
	if err := registerTranslationProductWiring(adm, options); err != nil {
		return err
	}
	if options.themeSelector != nil {
		adm.WithAdminTheme(options.themeSelector)
	}
	if options.themeManifest != nil {
		adm.WithThemeManifest(options.themeManifest)
	}
	ApplyAdapterIntegrations(adm, result, hooks)
	if options.registerUserRoleBulkRoutes {
		return registerUserRoleBulkRoutes(adm, cfg)
	}
	return nil
}

func registerTranslationProductWiring(adm *admin.Admin, options adminOptions) error {
	if options.translationExchangeConfigSet {
		if err := RegisterTranslationExchangeWiring(adm, options.translationExchangeConfig); err != nil {
			return err
		}
	}
	if options.translationQueueConfigSet {
		policyCfg, hasPolicyCfg := queuePolicyConfigFromOptions(options)
		return RegisterTranslationQueueWiring(adm, options.translationQueueConfig, policyCfg, hasPolicyCfg)
	}
	return nil
}

func validateAndRegisterTranslationCapabilities(adm *admin.Admin, options adminOptions, translationLogger admin.Logger) error {
	productCfg := options.translationProductConfig
	if options.translationExchangeConfigSet {
		exchangeCfg := options.translationExchangeConfig
		productCfg.Exchange = &exchangeCfg
	}
	if options.translationQueueConfigSet {
		queueCfg := options.translationQueueConfig
		productCfg.Queue = &queueCfg
	}
	translationModules := resolvedTranslationCapabilityModules(
		productCfg,
		options.translationExchangeConfig,
		options.translationExchangeConfigSet,
		options.translationQueueConfig,
		options.translationQueueConfigSet,
	)
	if shouldValidateTranslationProductRuntime(options) {
		if err := validateTranslationProductRuntime(adm, productCfg, options.translationProductWarnings, translationModules); err != nil {
			logTranslationCapabilityValidationError(translationLogger, err)
			return err
		}
	}
	registerTranslationCapabilities(adm, productCfg, options.translationProductWarnings, translationModules)
	logTranslationCapabilitiesStartup(translationLogger, TranslationCapabilities(adm))
	return nil
}

func configureAdminRuntimeQueues(adm *admin.Admin, options adminOptions) error {
	if err := configureCommandQueueRouting(options); err != nil {
		return err
	}
	return configureRPCTransport(adm, options)
}

func resolveAdminRuntimeDependencies(cfg admin.Config, options *adminOptions) error {
	if options == nil {
		return nil
	}
	resolveTranslationPolicyDependency(cfg, options)
	if err := resolvePreferencesStoreDependency(options); err != nil {
		return err
	}
	if options.deps.FeatureGate == nil {
		options.deps.FeatureGate = buildFeatureGate(cfg, resolveFeatureDefaults(*options), options.deps.PreferencesStore)
	}
	return nil
}

func resolveTranslationPolicyDependency(cfg admin.Config, options *adminOptions) {
	if options.deps.TranslationPolicy != nil {
		return
	}
	policyCfg := DefaultTranslationPolicyConfig()
	if options.translationPolicyConfigSet {
		policyCfg = options.translationPolicyConfig
	}
	if !options.translationPolicyConfigSet && !policyCfg.DenyByDefault && !hasTranslationPolicyRequirements(policyCfg) {
		return
	}
	policyCfg = NormalizeTranslationPolicyConfig(policyCfg)
	services := resolveTranslationPolicyServices(cfg, options.translationPolicyServices)
	if policy := NewTranslationPolicy(policyCfg, services); policy != nil {
		options.deps.TranslationPolicy = policy
	}
}

func resolvePreferencesStoreDependency(options *adminOptions) error {
	if options.deps.PreferencesStore != nil {
		return nil
	}
	repo := options.preferencesRepo
	if repo == nil && options.preferencesRepoFactory != nil {
		var err error
		repo, err = options.preferencesRepoFactory()
		if err != nil {
			return err
		}
	}
	if repo == nil {
		options.deps.PreferencesStore = admin.NewInMemoryPreferencesStore()
		return nil
	}
	store, err := NewGoUsersPreferencesStore(repo)
	if err != nil {
		return err
	}
	options.deps.PreferencesStore = store
	return nil
}

func resolveFeatureDefaults(options adminOptions) map[string]bool {
	defaults := DefaultAdminFeatures()
	if len(options.featureSet) > 0 {
		defaults = cloneFeatureDefaults(options.featureSet)
	}
	if len(options.featureDefaults) > 0 {
		defaults = mergeFeatureDefaults(defaults, options.featureDefaults)
	}
	return defaults
}

func normalizeStartupPolicy(policy StartupPolicy) admin.ModuleStartupPolicy {
	switch strings.ToLower(strings.TrimSpace(string(policy))) {
	case string(admin.ModuleStartupPolicyWarn):
		return admin.ModuleStartupPolicyWarn
	default:
		return admin.ModuleStartupPolicyEnforce
	}
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

func configureCMSWorkflowTranslationActions(adm *admin.Admin, opts adminOptions) {
	if adm == nil {
		return
	}
	policyCfg, hasPolicyCfg := queuePolicyConfigFromOptions(opts)
	if !hasPolicyCfg {
		return
	}

	locales := normalizeCreateTranslationLocales(translationPolicyLocales(policyCfg))
	if len(locales) == 0 {
		return
	}

	actions := admin.DefaultCMSWorkflowActions()
	for i := range actions {
		if strings.EqualFold(strings.TrimSpace(actions[i].Name), admin.CreateTranslationKey) {
			actions[i] = configureCreateTranslationActionLocaleSchema(actions[i], locales, opts.translationLocaleLabels)
		}
	}
	adm.WithCMSWorkflowActions(actions...)
}

func configureCreateTranslationActionLocaleSchema(action admin.Action, locales []string, labels map[string]string) admin.Action {
	if len(locales) == 0 {
		return action
	}
	schema := cloneAnyMap(action.PayloadSchema)
	if schema == nil {
		schema = map[string]any{}
	}
	schema["type"] = "object"
	schema["additionalProperties"] = false
	schema["required"] = []string{"locale"}

	properties, ok := schema["properties"].(map[string]any)
	if !ok {
		properties = nil
	}
	if properties == nil {
		properties = map[string]any{}
	}
	localeSchema, ok := properties["locale"].(map[string]any)
	if !ok {
		localeSchema = nil
	}
	if localeSchema == nil {
		localeSchema = map[string]any{}
	}
	localeSchema["type"] = "string"
	localeSchema["title"] = "Locale"
	localeSchema["enum"] = append([]string{}, locales...)
	localeSchema["x-options"] = createTranslationLocaleOptions(locales, labels)
	properties["locale"] = localeSchema
	schema["properties"] = properties

	action.PayloadRequired = []string{"locale"}
	action.PayloadSchema = schema
	return action
}

func normalizeCreateTranslationLocales(locales []string) []string {
	if len(locales) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(locales))
	for _, locale := range locales {
		normalized := strings.ToLower(strings.TrimSpace(locale))
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func createTranslationLocaleOptions(locales []string, labels map[string]string) []map[string]any {
	if len(locales) == 0 {
		return nil
	}
	options := make([]map[string]any, 0, len(locales))
	for _, locale := range locales {
		label := createTranslationLocaleLabel(locale, labels)
		options = append(options, map[string]any{
			"value": locale,
			"label": label,
		})
	}
	return options
}

func createTranslationLocaleLabel(locale string, labels map[string]string) string {
	normalized := strings.ToLower(strings.TrimSpace(locale))
	if normalized == "" {
		return ""
	}
	if label := strings.TrimSpace(labels[normalized]); label != "" {
		return label
	}

	tag, err := language.Parse(normalized)
	if err == nil {
		if name := strings.TrimSpace(display.English.Tags().Name(tag)); name != "" && !strings.EqualFold(name, "unknown language") {
			return name
		}
	}

	return strings.ToUpper(normalized)
}

func normalizeTranslationLocaleLabels(labels map[string]string) map[string]string {
	if len(labels) == 0 {
		return nil
	}
	out := make(map[string]string, len(labels))
	for rawLocale, rawLabel := range labels {
		locale := strings.ToLower(strings.TrimSpace(rawLocale))
		label := strings.TrimSpace(rawLabel)
		if locale == "" || label == "" {
			continue
		}
		out[locale] = label
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeTraitWorkflowDefaultsOption(defaults map[string]string) map[string]string {
	if len(defaults) == 0 {
		return nil
	}
	out := map[string]string{}
	for rawTrait, rawWorkflowID := range defaults {
		trait := strings.ToLower(strings.TrimSpace(rawTrait))
		workflowID := strings.TrimSpace(rawWorkflowID)
		if trait == "" || workflowID == "" {
			continue
		}
		out[trait] = workflowID
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func resolveWorkflowConfigOptions(opts *adminOptions) error {
	if opts == nil {
		return nil
	}
	merged := WorkflowConfig{}
	hasConfig := false
	if opts.workflowConfigSet {
		merged = NormalizeWorkflowConfig(opts.workflowConfig)
		hasConfig = true
	}
	if path := strings.TrimSpace(opts.workflowConfigPath); path != "" {
		loaded, err := LoadWorkflowConfigFile(path)
		if err != nil {
			return err
		}
		if hasConfig {
			merged = MergeWorkflowConfigs(merged, loaded)
		} else {
			merged = NormalizeWorkflowConfig(loaded)
		}
		hasConfig = true
	}
	if !hasConfig {
		return nil
	}
	if len(opts.traitWorkflowDefaults) > 0 {
		merged.TraitDefaults = mergeTraitWorkflowDefaults(merged.TraitDefaults, opts.traitWorkflowDefaults)
		merged = NormalizeWorkflowConfig(merged)
	}
	if err := ValidateWorkflowConfig(merged); err != nil {
		return err
	}

	definitions := WorkflowDefinitionsFromConfig(merged)
	workflowEngine, err := resolveWorkflowConfigEngine(opts.deps.Workflow, definitions)
	if err != nil {
		return err
	}
	traitDefaults := WorkflowTraitDefaultsFromConfig(merged)
	if err := validateWorkflowTraitDefaultsReferences(traitDefaults, definitions, workflowEngine); err != nil {
		return err
	}

	opts.workflowConfig = merged
	opts.workflowConfigSet = true
	opts.deps.Workflow = workflowEngine
	opts.traitWorkflowDefaults = mergeTraitWorkflowDefaults(opts.traitWorkflowDefaults, traitDefaults)
	if opts.workflowRuntime != nil {
		if err := SeedWorkflowRuntimeFromConfig(context.Background(), opts.workflowRuntime, merged); err != nil {
			return err
		}
	}
	return nil
}

func resolveWorkflowConfigEngine(existing admin.WorkflowEngine, definitions map[string]admin.WorkflowDefinition) (admin.WorkflowEngine, error) {
	if len(definitions) == 0 {
		return existing, nil
	}
	engine := existing
	if engine == nil {
		engine = admin.NewFSMWorkflowEngine()
	}
	registrar, ok := engine.(admin.WorkflowRegistrar)
	if !ok {
		return nil, workflowConfigError{
			Reason: "workflow definitions provided but workflow engine does not support registration",
		}
	}
	for _, workflowID := range sortedKeys(definitions) {
		definition := definitions[workflowID]
		if err := registrar.RegisterWorkflow(workflowID, definition); err != nil {
			return nil, workflowConfigError{
				Reason: "failed to register workflow definition " + workflowID + ": " + err.Error(),
			}
		}
	}
	return engine, nil
}

func mergeTraitWorkflowDefaults(base map[string]string, override map[string]string) map[string]string {
	base = normalizeTraitWorkflowDefaultsOption(base)
	override = normalizeTraitWorkflowDefaultsOption(override)
	out := map[string]string{}
	for _, key := range sortedKeys(base) {
		out[key] = base[key]
	}
	for _, key := range sortedKeys(override) {
		out[key] = override[key]
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
