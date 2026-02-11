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
	Code         string
	Reason       string
	Hint         string
	FailedChecks []string
	Cause        error
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
	Config    TranslationProductConfig
	Exchange  TranslationExchangeConfig
	Queue     TranslationQueueConfig
	Warnings  []string
	HasConfig bool
}

const translationProductLegacyOverrideWarning = "translation.productization.legacy_override"

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
	schemaVersion, err := normalizeTranslationProductSchemaVersion(productCfg.SchemaVersion)
	if err != nil {
		return translationProductResolution{}, err
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

	if productCfg.Exchange != nil {
		exchangeCfg = mergeTranslationExchangeConfig(exchangeCfg, *productCfg.Exchange)
	}
	if productCfg.Queue != nil {
		queueCfg = mergeTranslationQueueConfig(queueCfg, *productCfg.Queue)
	}

	warnings := []string{}
	if opts.translationExchangeConfigSet {
		exchangeCfg = opts.translationExchangeConfig
		warnings = append(warnings, translationProductLegacyOverrideWarning)
	}
	if opts.translationQueueConfigSet {
		queueCfg = opts.translationQueueConfig
		warnings = append(warnings, translationProductLegacyOverrideWarning)
	}
	if !cmsEnabled && (exchangeCfg.Enabled || queueCfg.Enabled) {
		return translationProductResolution{}, newTranslationProductConfigError(
			"translation.productization.requires_cms",
			"translation modules require cms feature enabled",
			"enable feature 'cms' or disable translation modules",
			[]string{"feature.cms.enabled"},
			nil,
		)
	}

	if exchangeCfg.Enabled {
		if _, _, _, err := resolveTranslationExchangeHandlers(exchangeCfg); err != nil {
			return translationProductResolution{}, newTranslationProductConfigError(
				"translation.productization.exchange.handlers_missing",
				"exchange module enabled without valid handlers",
				"provide Store or Exporter/Validator/Applier handlers",
				[]string{"module.exchange.handlers"},
				err,
			)
		}
	}
	if queueCfg.Enabled {
		policyCfg, hasPolicyCfg := queuePolicyConfigFromOptions(opts)
		if _, err := resolveTranslationQueueSupportedLocales(queueCfg.SupportedLocales, policyCfg, hasPolicyCfg); err != nil {
			return translationProductResolution{}, newTranslationProductConfigError(
				"translation.productization.queue.locales_invalid",
				"queue module enabled without valid locale requirements",
				"set queue supported_locales or provide translation policy locale requirements",
				[]string{"module.queue.supported_locales"},
				err,
			)
		}
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

func translationProductCMSDefault(_ admin.Config, opts adminOptions) bool {
	defaults := DefaultAdminFeatures()
	if len(opts.featureDefaults) > 0 {
		defaults = mergeFeatureDefaults(defaults, opts.featureDefaults)
	}
	return defaults[string(admin.FeatureCMS)]
}

func normalizeTranslationProductSchemaVersion(version int) (int, error) {
	if version == 0 {
		return TranslationProductSchemaVersionCurrent, nil
	}
	if version < 0 {
		return 0, newTranslationProductConfigError(
			"translation.productization.schema.invalid",
			fmt.Sprintf("schema_version must be >= 0; got %d", version),
			fmt.Sprintf("use schema_version %d", TranslationProductSchemaVersionCurrent),
			[]string{"schema_version"},
			nil,
		)
	}
	if version > TranslationProductSchemaVersionCurrent {
		return 0, newTranslationProductConfigError(
			"translation.productization.schema.unsupported",
			fmt.Sprintf("unsupported schema_version %d", version),
			fmt.Sprintf("use schema_version %d", TranslationProductSchemaVersionCurrent),
			[]string{"schema_version"},
			nil,
		)
	}
	return version, nil
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

func shouldValidateTranslationProductRuntime(opts adminOptions) bool {
	return opts.translationProductConfigSet || opts.translationExchangeConfigSet || opts.translationQueueConfigSet
}

func validateTranslationProductRuntime(adm *admin.Admin, productCfg TranslationProductConfig, warnings []string) error {
	if adm == nil {
		return newTranslationProductConfigError(
			"translation.productization.runtime.admin_missing",
			"translation runtime validation requires admin instance",
			"ensure quickstart.NewAdmin produced an admin instance before runtime validation",
			[]string{"runtime.admin"},
			nil,
		)
	}
	snapshot := buildTranslationCapabilities(adm, productCfg, warnings)
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

	if translationModuleEnabled(modules, "exchange") {
		if adm.BootTranslationExchange() == nil {
			failed = append(failed, "exchange.binding")
		}
		exportKey := fmt.Sprintf("%s.%s", adm.AdminAPIGroup(), "translations.export")
		if strings.TrimSpace(routes[exportKey]) == "" {
			failed = append(failed, "exchange.route.translations.export")
		}
	}
	if translationModuleEnabled(modules, "queue") {
		if adm.Registry() == nil {
			failed = append(failed, "queue.registry")
		} else if _, ok := adm.Registry().Panel("translations"); !ok {
			failed = append(failed, "queue.panel.translations")
		}
		if strings.TrimSpace(routes["admin.translations.queue"]) == "" {
			failed = append(failed, "queue.route.translations.queue")
		}
	}

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
