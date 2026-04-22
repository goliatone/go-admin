package quickstart

import (
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// ErrTranslationProductConfig indicates invalid translation product profile wiring.
var ErrTranslationProductConfig = errors.New("translation product config invalid")

// TranslationProductSchemaVersionCurrent is the supported quickstart product schema version.
const TranslationProductSchemaVersionCurrent = 1

// TranslationProductSchemaVersionMinimumSupported is the minimum schema version
// accepted for deterministic up-conversion into the current version.
const TranslationProductSchemaVersionMinimumSupported = 0

// TranslationProfile defines the quickstart translation capability profile.
type TranslationProfile string

const (
	TranslationProfileNone         TranslationProfile = "none"
	TranslationProfileCore         TranslationProfile = "core"
	TranslationProfileCoreExchange TranslationProfile = "core+exchange"
	TranslationProfileCoreQueue    TranslationProfile = "core+queue"
	TranslationProfileFull         TranslationProfile = "full"
)

// TranslationProductConfig configures productized translation capabilities.
type TranslationProductConfig struct {
	SchemaVersion int                        `json:"schema_version,omitempty"`
	Profile       TranslationProfile         `json:"profile,omitempty"`
	Exchange      *TranslationExchangeConfig `json:"exchange,omitempty"`
	Queue         *TranslationQueueConfig    `json:"queue,omitempty"`
}

type translationProductConfigError struct {
	Code         string   `json:"code"`
	Reason       string   `json:"reason"`
	Hint         string   `json:"hint"`
	FailedChecks []string `json:"failed_checks"`
	Cause        error    `json:"cause"`
}

func (e translationProductConfigError) Error() string {
	reason := strings.TrimSpace(e.Reason)
	if reason == "" && e.Cause != nil {
		reason = e.Cause.Error()
	}
	if reason == "" {
		return ErrTranslationProductConfig.Error()
	}
	return fmt.Sprintf("%s (%s)", ErrTranslationProductConfig.Error(), reason)
}

func (e translationProductConfigError) Unwrap() error {
	return e.Cause
}

func (e translationProductConfigError) Is(target error) bool {
	return target == ErrTranslationProductConfig || errors.Is(e.Cause, target)
}

func newTranslationProductConfigError(code, reason, hint string, failedChecks []string, cause error) error {
	return translationProductConfigError{
		Code:         strings.TrimSpace(code),
		Reason:       strings.TrimSpace(reason),
		Hint:         strings.TrimSpace(hint),
		FailedChecks: dedupeStringSlice(failedChecks),
		Cause:        cause,
	}
}

type translationProductResolution struct {
	Config    TranslationProductConfig  `json:"config"`
	Exchange  TranslationExchangeConfig `json:"exchange"`
	Queue     TranslationQueueConfig    `json:"queue"`
	Warnings  []string                  `json:"warnings"`
	HasConfig bool                      `json:"has_config"`
}

const translationProductLegacyOverrideWarning = "translation.productization.legacy_override"
const translationProductSchemaUpconvertWarning = "translation.productization.schema.upconverted"
const translationProductFeatureOverrideWarningPrefix = "translation.productization.feature_override."

// WithTranslationProfile applies a productized translation profile.
func WithTranslationProfile(profile TranslationProfile) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		cfg := opts.translationProductConfig
		cfg.Profile = profile
		opts.translationProductConfig = cfg
		opts.translationProductConfigSet = true
	}
}

// WithTranslationProductConfig applies productized translation module configuration.
func WithTranslationProductConfig(cfg TranslationProductConfig) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.translationProductConfig = cfg
		opts.translationProductConfigSet = true
	}
}

func resolveTranslationProductOptions(cfg admin.Config, opts *adminOptions) error {
	if opts == nil || !opts.translationProductConfigSet {
		return nil
	}
	resolution, err := buildTranslationProductResolution(cfg, *opts)
	if err != nil {
		return err
	}
	opts.translationProductConfig = resolution.Config
	opts.translationExchangeConfig = resolution.Exchange
	opts.translationExchangeConfigSet = resolution.HasConfig
	opts.translationQueueConfig = resolution.Queue
	opts.translationQueueConfigSet = resolution.HasConfig
	opts.translationProductWarnings = append([]string{}, resolution.Warnings...)
	if opts.featureDefaults == nil {
		opts.featureDefaults = map[string]bool{}
	}
	opts.featureDefaults[string(admin.FeatureTranslationExchange)] = resolution.Exchange.Enabled
	opts.featureDefaults[string(admin.FeatureTranslationQueue)] = resolution.Queue.Enabled
	return nil
}

func buildTranslationProductResolution(cfg admin.Config, opts adminOptions) (translationProductResolution, error) {
	productCfg := opts.translationProductConfig
	schemaVersion, schemaUpconverted, err := resolveTranslationProductSchemaVersion(productCfg.SchemaVersion)
	if err != nil {
		return translationProductResolution{}, err
	}
	warnings := []string{}
	if schemaUpconverted {
		warnings = append(warnings, translationProductSchemaUpconvertWarning)
	}
	cmsEnabled := translationProductCMSDefault(cfg, opts)
	profile, err := resolveTranslationProfile(productCfg.Profile, cmsEnabled)
	if err != nil {
		return translationProductResolution{}, err
	}
	if !cmsEnabled && profile != TranslationProfileNone {
		return translationProductResolution{}, newTranslationProductConfigError(
			"translation.productization.requires_cms",
			"translation profile requires cms feature enabled",
			"enable feature 'cms' or use profile 'none'",
			[]string{"feature.cms.enabled"},
			nil,
		)
	}
	exchangeCfg, queueCfg := translationProfileDefaults(profile)
	hasConfig := true

	exchangeCfg, queueCfg, warnings = applyTranslationProductOverrides(productCfg, opts, exchangeCfg, queueCfg, warnings)
	if !cmsEnabled && (exchangeCfg.Enabled || queueCfg.Enabled) {
		return translationProductResolution{}, newTranslationProductConfigError(
			"translation.productization.requires_cms",
			"translation modules require cms feature enabled",
			"enable feature 'cms' or disable translation modules",
			[]string{"feature.cms.enabled"},
			nil,
		)
	}

	if err := validateTranslationProductModules(exchangeCfg, queueCfg, opts); err != nil {
		return translationProductResolution{}, err
	}

	return translationProductResolution{
		Config: TranslationProductConfig{
			SchemaVersion: schemaVersion,
			Profile:       profile,
			Exchange:      productCfg.Exchange,
			Queue:         productCfg.Queue,
		},
		Exchange:  exchangeCfg,
		Queue:     queueCfg,
		Warnings:  dedupeStringSlice(warnings),
		HasConfig: hasConfig,
	}, nil
}

func applyTranslationProductOverrides(
	productCfg TranslationProductConfig,
	opts adminOptions,
	exchangeCfg TranslationExchangeConfig,
	queueCfg TranslationQueueConfig,
	warnings []string,
) (TranslationExchangeConfig, TranslationQueueConfig, []string) {
	if productCfg.Exchange != nil {
		exchangeCfg = mergeTranslationExchangeConfig(exchangeCfg, *productCfg.Exchange)
	}
	if productCfg.Queue != nil {
		queueCfg = mergeTranslationQueueConfig(queueCfg, *productCfg.Queue)
	}
	if opts.translationExchangeConfigSet {
		exchangeCfg = opts.translationExchangeConfig
		warnings = append(warnings, translationProductLegacyOverrideWarning)
	}
	if opts.translationQueueConfigSet {
		queueCfg = opts.translationQueueConfig
		warnings = append(warnings, translationProductLegacyOverrideWarning)
	}
	exchangeCfg, warnings = applyTranslationExchangeFeatureOverride(exchangeCfg, opts, warnings)
	queueCfg, warnings = applyTranslationQueueFeatureOverride(queueCfg, opts, warnings)
	return exchangeCfg, queueCfg, warnings
}

func applyTranslationExchangeFeatureOverride(cfg TranslationExchangeConfig, opts adminOptions, warnings []string) (TranslationExchangeConfig, []string) {
	enabled, ok := translationFeatureOverride(opts.featureDefaults, admin.FeatureTranslationExchange)
	if !ok {
		return cfg, warnings
	}
	if cfg.Enabled != enabled {
		warnings = append(warnings, translationProductFeatureOverrideWarning(admin.FeatureTranslationExchange))
	}
	cfg.Enabled = enabled
	return cfg, warnings
}

func applyTranslationQueueFeatureOverride(cfg TranslationQueueConfig, opts adminOptions, warnings []string) (TranslationQueueConfig, []string) {
	enabled, ok := translationFeatureOverride(opts.featureDefaults, admin.FeatureTranslationQueue)
	if !ok {
		return cfg, warnings
	}
	if cfg.Enabled != enabled {
		warnings = append(warnings, translationProductFeatureOverrideWarning(admin.FeatureTranslationQueue))
	}
	cfg.Enabled = enabled
	return cfg, warnings
}

func validateTranslationProductModules(exchangeCfg TranslationExchangeConfig, queueCfg TranslationQueueConfig, opts adminOptions) error {
	if exchangeCfg.Enabled {
		if _, _, _, _, err := resolveTranslationExchangeHandlers(exchangeCfg); err != nil {
			return newTranslationProductConfigError(
				"translation.productization.exchange.handlers_missing",
				"exchange module enabled without valid handlers",
				"provide Store or Exporter/Validator/Applier handlers",
				[]string{"module.exchange.handlers"},
				err,
			)
		}
	}
	if !queueCfg.Enabled {
		return nil
	}
	policyCfg, hasPolicyCfg := queuePolicyConfigFromOptions(opts)
	if _, err := resolveTranslationQueueSupportedLocales(queueCfg.SupportedLocales, policyCfg, hasPolicyCfg); err != nil {
		return newTranslationProductConfigError(
			"translation.productization.queue.locales_invalid",
			"queue module enabled without valid locale requirements",
			"set queue supported_locales or provide translation policy locale requirements",
			[]string{"module.queue.supported_locales"},
			err,
		)
	}
	if queueCfg.Repository == nil {
		return newTranslationProductConfigError(
			"translation.productization.queue.repository_missing",
			"queue module enabled without persistent assignment repository",
			"provide a translation queue repository",
			[]string{"module.queue.repository"},
			translationQueueConfigError{Missing: []string{"repository"}},
		)
	}
	return nil
}

func translationProductCMSDefault(_ admin.Config, opts adminOptions) bool {
	defaults := DefaultAdminFeatures()
	if len(opts.featureDefaults) > 0 {
		defaults = mergeFeatureDefaults(defaults, opts.featureDefaults)
	}
	return defaults[string(admin.FeatureCMS)]
}

func normalizeTranslationProductSchemaVersion(version int) (int, error) {
	normalized, _, err := resolveTranslationProductSchemaVersion(version)
	return normalized, err
}

func resolveTranslationProductSchemaVersion(version int) (int, bool, error) {
	if version == TranslationProductSchemaVersionMinimumSupported {
		return TranslationProductSchemaVersionCurrent, true, nil
	}
	if version < TranslationProductSchemaVersionMinimumSupported {
		return 0, false, newTranslationProductConfigError(
			"translation.productization.schema.invalid",
			fmt.Sprintf("schema_version must be >= %d; got %d", TranslationProductSchemaVersionMinimumSupported, version),
			fmt.Sprintf("use schema_version %d", TranslationProductSchemaVersionCurrent),
			[]string{"schema_version"},
			nil,
		)
	}
	if version > TranslationProductSchemaVersionCurrent {
		return 0, false, newTranslationProductConfigError(
			"translation.productization.schema.unsupported",
			fmt.Sprintf("unsupported future schema_version %d", version),
			fmt.Sprintf("use schema_version %d", TranslationProductSchemaVersionCurrent),
			[]string{"schema_version"},
			nil,
		)
	}
	return version, false, nil
}

func resolveTranslationProfile(profile TranslationProfile, cmsEnabled bool) (TranslationProfile, error) {
	normalized := TranslationProfile(strings.ToLower(strings.TrimSpace(string(profile))))
	if normalized == "" {
		if cmsEnabled {
			return TranslationProfileCore, nil
		}
		return TranslationProfileNone, nil
	}
	switch normalized {
	case TranslationProfileNone,
		TranslationProfileCore,
		TranslationProfileCoreExchange,
		TranslationProfileCoreQueue,
		TranslationProfileFull:
		return normalized, nil
	default:
		return "", newTranslationProductConfigError(
			"translation.productization.profile.unknown",
			fmt.Sprintf("unknown translation profile %q", string(profile)),
			"use one of: none, core, core+exchange, core+queue, full",
			[]string{"profile"},
			nil,
		)
	}
}

func translationProfileDefaults(profile TranslationProfile) (TranslationExchangeConfig, TranslationQueueConfig) {
	switch profile {
	case TranslationProfileCoreExchange:
		return TranslationExchangeConfig{Enabled: true}, TranslationQueueConfig{Enabled: false}
	case TranslationProfileCoreQueue:
		return TranslationExchangeConfig{Enabled: false}, TranslationQueueConfig{Enabled: true}
	case TranslationProfileFull:
		return TranslationExchangeConfig{Enabled: true}, TranslationQueueConfig{Enabled: true}
	default:
		return TranslationExchangeConfig{Enabled: false}, TranslationQueueConfig{Enabled: false}
	}
}

func mergeTranslationExchangeConfig(base, override TranslationExchangeConfig) TranslationExchangeConfig {
	out := base
	out.Enabled = override.Enabled
	if override.Store != nil {
		out.Store = override.Store
	}
	if override.Exporter != nil {
		out.Exporter = override.Exporter
	}
	if override.Validator != nil {
		out.Validator = override.Validator
	}
	if override.Applier != nil {
		out.Applier = override.Applier
	}
	if override.AsyncApply != nil {
		out.AsyncApply = override.AsyncApply
	}
	if override.PermissionRegister != nil {
		out.PermissionRegister = override.PermissionRegister
	}
	return out
}

func mergeTranslationQueueConfig(base, override TranslationQueueConfig) TranslationQueueConfig {
	out := base
	out.Enabled = override.Enabled
	out.EnableOpenPool = override.EnableOpenPool
	out.EnableDashboard = override.EnableDashboard
	out.EnableNotifications = override.EnableNotifications
	if strings.TrimSpace(override.DefaultPriority) != "" {
		out.DefaultPriority = strings.TrimSpace(override.DefaultPriority)
	}
	if len(override.SupportedLocales) > 0 {
		out.SupportedLocales = append([]string{}, override.SupportedLocales...)
	}
	if override.Repository != nil {
		out.Repository = override.Repository
	}
	if override.Service != nil {
		out.Service = override.Service
	}
	if override.PermissionRegister != nil {
		out.PermissionRegister = override.PermissionRegister
	}
	return out
}

func dedupeStringSlice(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func translationFeatureOverride(defaults map[string]bool, key admin.FeatureKey) (bool, bool) {
	if len(defaults) == 0 {
		return false, false
	}
	enabled, ok := defaults[string(key)]
	return enabled, ok
}

func translationProductFeatureOverrideWarning(key admin.FeatureKey) string {
	return translationProductFeatureOverrideWarningPrefix + strings.TrimSpace(string(key))
}

func resolvedTranslationCapabilityModules(
	productCfg TranslationProductConfig,
	exchangeCfg TranslationExchangeConfig,
	exchangeCfgSet bool,
	queueCfg TranslationQueueConfig,
	queueCfgSet bool,
) translationCapabilityModuleState {
	hasState := exchangeCfgSet || queueCfgSet || strings.TrimSpace(string(productCfg.Profile)) != "" || productCfg.Exchange != nil || productCfg.Queue != nil
	if !hasState {
		return translationCapabilityModuleState{}
	}

	profile := normalizeTranslationProfileForModules(productCfg.Profile)
	exchangeDefaults, queueDefaults := translationProfileDefaults(profile)
	exchangeEnabled := exchangeDefaults.Enabled
	queueEnabled := queueDefaults.Enabled
	if productCfg.Exchange != nil {
		exchangeEnabled = productCfg.Exchange.Enabled
	}
	if productCfg.Queue != nil {
		queueEnabled = productCfg.Queue.Enabled
	}
	if exchangeCfgSet {
		exchangeEnabled = exchangeCfg.Enabled
	}
	if queueCfgSet {
		queueEnabled = queueCfg.Enabled
	}

	return translationCapabilityModuleState{
		ExchangeEnabled: exchangeEnabled,
		QueueEnabled:    queueEnabled,
		HasState:        true,
	}
}

func normalizeTranslationProfileForModules(profile TranslationProfile) TranslationProfile {
	switch TranslationProfile(strings.ToLower(strings.TrimSpace(string(profile)))) {
	case TranslationProfileNone:
		return TranslationProfileNone
	case TranslationProfileCore:
		return TranslationProfileCore
	case TranslationProfileCoreExchange:
		return TranslationProfileCoreExchange
	case TranslationProfileCoreQueue:
		return TranslationProfileCoreQueue
	case TranslationProfileFull:
		return TranslationProfileFull
	default:
		return TranslationProfileNone
	}
}

func shouldValidateTranslationProductRuntime(opts adminOptions) bool {
	return opts.translationProductConfigSet || opts.translationExchangeConfigSet || opts.translationQueueConfigSet
}

func validateTranslationProductRuntime(
	adm *admin.Admin,
	productCfg TranslationProductConfig,
	warnings []string,
	moduleState translationCapabilityModuleState,
) error {
	if adm == nil {
		return newTranslationProductConfigError(
			"translation.productization.runtime.admin_missing",
			"translation runtime validation requires admin instance",
			"ensure quickstart.NewAdmin produced an admin instance before runtime validation",
			[]string{"runtime.admin"},
			nil,
		)
	}
	snapshot := buildTranslationCapabilities(adm, productCfg, warnings, moduleState)
	if len(snapshot) == 0 {
		return newTranslationProductConfigError(
			"translation.productization.runtime.capabilities_missing",
			"translation runtime capability metadata missing",
			"ensure translation capability metadata is registered during startup",
			[]string{"runtime.capabilities"},
			nil,
		)
	}

	modules, _ := snapshot["modules"].(map[string]any)
	routes, _ := snapshot["routes"].(map[string]string)
	failed := []string{}
	adminAPIGroup := strings.TrimSpace(adm.AdminAPIGroup())
	if adminAPIGroup == "" {
		adminAPIGroup = "admin.api"
	}

	failed = append(failed, validateTranslationExchangeRuntime(adm, routes, adminAPIGroup, translationModuleEnabled(modules, "exchange"))...)
	failed = append(failed, validateTranslationQueueRuntime(adm, routes, adminAPIGroup, translationModuleEnabled(modules, "queue"))...)

	if len(failed) > 0 {
		sort.Strings(failed)
		return newTranslationProductConfigError(
			"translation.productization.runtime.invalid",
			fmt.Sprintf("translation runtime validation failed (%s)", strings.Join(failed, ", ")),
			"verify translation module routes, bindings, panels, and capability metadata are wired",
			failed,
			nil,
		)
	}
	return nil
}

type translationRuntimeRouteCheck struct {
	Route          string
	Resolved       string
	Missing        string
	Resolver       string
	NotStatic      string
	Unexpected     string
	AllowCoherence bool
}

func validateTranslationExchangeRuntime(adm *admin.Admin, routes map[string]string, adminAPIGroup string, enabled bool) []string {
	checks := []translationRuntimeRouteCheck{
		{
			Route:      strings.TrimSpace(routes["admin.translations.exchange"]),
			Resolved:   resolveTranslationRoutePath(adm, "admin", "translations.exchange"),
			Missing:    "exchange.route.translations.exchange",
			Resolver:   "exchange.route.translations.exchange.resolver",
			NotStatic:  "exchange.route.translations.exchange.not_static",
			Unexpected: "exchange.route.translations.exchange.unexpected",
		},
		{
			Route:      strings.TrimSpace(routes[fmt.Sprintf("%s.%s", adminAPIGroup, "translations.export")]),
			Resolved:   resolveTranslationRoutePath(adm, adminAPIGroup, "translations.export"),
			Missing:    "exchange.route.translations.export",
			Resolver:   "exchange.route.translations.export.resolver",
			NotStatic:  "exchange.route.translations.export.not_static",
			Unexpected: "exchange.route.translations.export.unexpected",
		},
	}
	failed := validateRuntimeRouteChecks(checks, enabled)
	if enabled && adm.BootTranslationExchange() == nil {
		failed = append(failed, "exchange.binding")
	}
	return failed
}

func validateTranslationQueueRuntime(adm *admin.Admin, routes map[string]string, adminAPIGroup string, enabled bool) []string {
	checks := []translationRuntimeRouteCheck{
		{
			Route:          strings.TrimSpace(routes["admin.translations.dashboard"]),
			Resolved:       resolveTranslationRoutePath(adm, "admin", "translations.dashboard"),
			Missing:        "queue.route.translations.dashboard",
			Resolver:       "queue.route.translations.dashboard.resolver",
			NotStatic:      "queue.route.translations.dashboard.not_static",
			Unexpected:     "queue.route.translations.dashboard.unexpected",
			AllowCoherence: true,
		},
		{
			Route:      strings.TrimSpace(routes["admin.translations.queue"]),
			Resolved:   resolveTranslationRoutePath(adm, "admin", "translations.queue"),
			Missing:    "queue.route.translations.queue",
			Resolver:   "queue.route.translations.queue.resolver",
			NotStatic:  "queue.route.translations.queue.not_static",
			Unexpected: "queue.route.translations.queue.unexpected",
		},
		{
			Route:          strings.TrimSpace(routes[fmt.Sprintf("%s.%s", adminAPIGroup, "translations.my_work")]),
			Resolved:       resolveTranslationRoutePath(adm, adminAPIGroup, "translations.my_work"),
			Missing:        "queue.route.api.translations.my_work",
			Resolver:       "queue.route.api.translations.my_work.resolver",
			NotStatic:      "queue.route.api.translations.my_work.not_static",
			Unexpected:     "queue.route.api.translations.my_work.unexpected",
			AllowCoherence: true,
		},
		{
			Route:      strings.TrimSpace(routes[fmt.Sprintf("%s.%s", adminAPIGroup, "translations.queue")]),
			Resolved:   resolveTranslationRoutePath(adm, adminAPIGroup, "translations.queue"),
			Missing:    "queue.route.api.translations.queue",
			Resolver:   "queue.route.api.translations.queue.resolver",
			NotStatic:  "queue.route.api.translations.queue.not_static",
			Unexpected: "queue.route.api.translations.queue.unexpected",
		},
	}
	failed := validateRuntimeRouteChecks(checks, enabled)
	if enabled {
		failed = append(failed, validateTranslationQueueBindings(adm)...)
		failed = append(failed, validateTranslationQueueRouteCoherence(checks[0].Route, checks[2].Route)...)
	}
	return failed
}

func validateRuntimeRouteChecks(checks []translationRuntimeRouteCheck, enabled bool) []string {
	failed := []string{}
	for _, check := range checks {
		if !enabled {
			if check.Route != "" {
				failed = append(failed, check.Unexpected)
			}
			continue
		}
		if check.Route == "" {
			failed = append(failed, check.Missing)
		}
		if check.Resolved == "" {
			failed = append(failed, check.Resolver)
		}
		if check.Route != "" && !translationRuntimeRouteIsStatic(check.Route) {
			failed = append(failed, check.NotStatic)
		}
	}
	return failed
}

func validateTranslationQueueBindings(adm *admin.Admin) []string {
	failed := []string{}
	if adm.BootTranslationQueue() == nil {
		failed = append(failed, "queue.binding")
	}
	if adm.Registry() == nil {
		return append(failed, "queue.registry")
	}
	if _, ok := adm.Registry().Panel("translations"); !ok {
		failed = append(failed, "queue.panel.translations")
	}
	return failed
}

func validateTranslationQueueRouteCoherence(dashboardRoute, myWorkRoute string) []string {
	switch {
	case dashboardRoute != "" && myWorkRoute == "":
		return []string{"queue.coherence.dashboard_without_my_work_api"}
	case dashboardRoute == "" && myWorkRoute != "":
		return []string{"queue.coherence.my_work_api_without_dashboard"}
	default:
		return nil
	}
}

func resolveTranslationRoutePath(adm *admin.Admin, group, route string) string {
	if adm == nil {
		return ""
	}
	return strings.TrimSpace(resolveRoutePath(adm.URLs(), strings.TrimSpace(group), strings.TrimSpace(route)))
}

func translationRuntimeRouteIsStatic(path string) bool {
	path = strings.TrimSpace(path)
	if path == "" {
		return false
	}
	return !strings.Contains(path, ":") &&
		!strings.Contains(path, "*") &&
		!strings.Contains(path, "{") &&
		!strings.Contains(path, "}")
}

func translationModuleEnabled(modules map[string]any, module string) bool {
	if len(modules) == 0 {
		return false
	}
	raw, ok := modules[strings.TrimSpace(module)]
	if !ok {
		return false
	}
	typed, ok := raw.(map[string]any)
	if !ok {
		return false
	}
	enabled, _ := typed["enabled"].(bool)
	return enabled
}

func translationProductErrorPayload(err error) map[string]any {
	payload := map[string]any{
		"error_code":    "translation.productization.invalid",
		"error_message": strings.TrimSpace(firstNonEmpty(fmt.Sprint(err), ErrTranslationProductConfig.Error())),
		"hint":          "",
		"failed_checks": []string{},
	}
	if err == nil {
		payload["error_message"] = ErrTranslationProductConfig.Error()
		return payload
	}
	var cfgErr translationProductConfigError
	if !errors.As(err, &cfgErr) {
		return payload
	}
	if code := strings.TrimSpace(cfgErr.Code); code != "" {
		payload["error_code"] = code
	}
	if reason := strings.TrimSpace(cfgErr.Reason); reason != "" {
		payload["error_message"] = reason
	}
	payload["hint"] = strings.TrimSpace(cfgErr.Hint)
	payload["failed_checks"] = dedupeStringSlice(cfgErr.FailedChecks)
	return payload
}
