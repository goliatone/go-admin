package quickstart

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"

	"github.com/goliatone/go-admin/admin"
)

var translationCapabilitiesStore sync.Map // map[*admin.Admin]map[string]any

type translationCapabilityModuleState struct {
	ExchangeEnabled bool
	QueueEnabled    bool
	HasState        bool
}

// TranslationCapabilities returns a stable translation capability snapshot for the admin instance.
func TranslationCapabilities(adm *admin.Admin) map[string]any {
	return translationCapabilitiesForAdmin(adm)
}

// TranslationCapabilitiesForContext returns a translation capability snapshot
// merged with request-scoped permission and action states.
func TranslationCapabilitiesForContext(adm *admin.Admin, reqCtx context.Context) map[string]any {
	return translationCapabilitiesForContext(adm, reqCtx)
}

func registerTranslationCapabilities(adm *admin.Admin, productCfg TranslationProductConfig, warnings []string, modules translationCapabilityModuleState) {
	if adm == nil {
		return
	}
	caps := buildTranslationCapabilities(adm, productCfg, warnings, modules)
	translationCapabilitiesStore.Store(adm, caps)
}

func translationCapabilitiesForAdmin(adm *admin.Admin) map[string]any {
	return translationCapabilitiesForContext(adm, nil)
}

func translationCapabilitiesForContext(adm *admin.Admin, reqCtx context.Context) map[string]any {
	if adm == nil {
		return map[string]any{}
	}
	base := admin.TranslationCapabilitiesForContext(adm, reqCtx)
	if len(base) == 0 {
		base = map[string]any{}
	}
	if cached, ok := translationCapabilitiesStore.Load(adm); ok {
		if typed, ok := cached.(map[string]any); ok {
			return mergeTranslationCapabilities(base, typed)
		}
	}
	return base
}

func buildTranslationCapabilities(adm *admin.Admin, productCfg TranslationProductConfig, warnings []string, modules translationCapabilityModuleState) map[string]any {
	if adm == nil {
		return map[string]any{}
	}

	base := admin.TranslationCapabilitiesForContext(adm, nil)
	if len(base) == 0 {
		base = map[string]any{}
	}

	baseModules, _ := base["modules"].(map[string]any)
	exchangeEnabled := translationModuleEnabled(baseModules, "exchange")
	queueEnabled := translationModuleEnabled(baseModules, "queue")
	if modules.HasState {
		exchangeEnabled = effectiveTranslationModuleEnabled(exchangeEnabled, modules.ExchangeEnabled)
		queueEnabled = effectiveTranslationModuleEnabled(queueEnabled, modules.QueueEnabled)
	}

	baseFeatures, _ := base["features"].(map[string]any)
	cmsEnabled := translationBool(baseFeatures["cms"])
	dashboardEnabled := translationBool(baseFeatures["dashboard"])

	schemaVersion, err := normalizeTranslationProductSchemaVersion(productCfg.SchemaVersion)
	if err != nil {
		schemaVersion = TranslationProductSchemaVersionCurrent
	}
	profile := strings.TrimSpace(string(productCfg.Profile))
	if profile == "" {
		profile = string(inferTranslationProfile(cmsEnabled, exchangeEnabled, queueEnabled))
	}

	routes := translationRoutesToStrings(base["routes"])
	resolverKeys := translationStringSlice(base["resolver_keys"])
	panels := translationStringSlice(base["panels"])
	out := map[string]any{
		"profile":            profile,
		"capability_mode":    profile,
		"supported_profiles": []string{"none", "core", "core+exchange", "core+queue", "full"},
		"schema_version":     schemaVersion,
		"modules":            cloneAnyMap(baseModules),
		"features": map[string]any{
			"cms":       cmsEnabled,
			"dashboard": dashboardEnabled,
		},
		"routes":        routes,
		"panels":        panels,
		"resolver_keys": resolverKeys,
		"warnings":      dedupeStringSlice(warnings),
		"contracts":     base["contracts"],
	}
	overrideModuleEnabled(out, "exchange", exchangeEnabled)
	overrideModuleEnabled(out, "queue", queueEnabled)
	applyTranslationCapabilityRouteFiltering(out)
	return out
}

func mergeTranslationCapabilities(base, overlay map[string]any) map[string]any {
	if len(base) == 0 {
		return cloneAnyMap(overlay)
	}
	out := cloneAnyMap(base)
	if out == nil {
		out = map[string]any{}
	}

	copyCapabilityField(out, overlay, "profile")
	copyCapabilityField(out, overlay, "capability_mode")
	copyCapabilityField(out, overlay, "supported_profiles")
	copyCapabilityField(out, overlay, "schema_version")
	copyCapabilityField(out, overlay, "warnings")
	copyCapabilityField(out, overlay, "contracts")
	copyCapabilityField(out, overlay, "features")
	copyCapabilityField(out, overlay, "routes")
	copyCapabilityField(out, overlay, "panels")
	copyCapabilityField(out, overlay, "resolver_keys")

	overlayModules, _ := overlay["modules"].(map[string]any)
	if len(overlayModules) > 0 {
		baseModules, _ := out["modules"].(map[string]any)
		mergedModules := cloneAnyMap(baseModules)
		if mergedModules == nil {
			mergedModules = map[string]any{}
		}
		for moduleName, rawModule := range overlayModules {
			moduleName = strings.TrimSpace(moduleName)
			if moduleName == "" {
				continue
			}
			moduleOverlay, ok := rawModule.(map[string]any)
			if !ok {
				continue
			}
			enabled, hasEnabled := moduleOverlay["enabled"].(bool)
			rawBaseModule, _ := mergedModules[moduleName].(map[string]any)
			baseModule := cloneAnyMap(rawBaseModule)
			if baseModule == nil {
				baseModule = map[string]any{}
			}
			if hasEnabled {
				effectiveEnabled := enabled
				if baseEnabled, ok := baseModule["enabled"].(bool); ok {
					effectiveEnabled = effectiveTranslationModuleEnabled(baseEnabled, enabled)
				}
				baseModule["enabled"] = effectiveEnabled
				applyModuleEntryState(baseModule, effectiveEnabled)
				applyModuleActionStates(baseModule, effectiveEnabled)
			}
			mergedModules[moduleName] = baseModule
		}
		out["modules"] = mergedModules
	}
	applyTranslationCapabilityRouteFiltering(out)

	return out
}

func copyCapabilityField(out, overlay map[string]any, key string) {
	key = strings.TrimSpace(key)
	if key == "" || len(overlay) == 0 {
		return
	}
	value, ok := overlay[key]
	if !ok || value == nil {
		return
	}
	out[key] = value
}

func overrideModuleEnabled(payload map[string]any, moduleName string, enabled bool) {
	if len(payload) == 0 {
		return
	}
	modules, _ := payload["modules"].(map[string]any)
	if modules == nil {
		modules = map[string]any{}
	}
	rawModule, _ := modules[moduleName].(map[string]any)
	module := cloneAnyMap(rawModule)
	if module == nil {
		module = map[string]any{}
	}
	module["enabled"] = enabled
	applyModuleEntryState(module, enabled)
	applyModuleActionStates(module, enabled)
	modules[moduleName] = module
	payload["modules"] = modules
}

func applyModuleEntryState(module map[string]any, moduleEnabled bool) {
	if len(module) == 0 {
		return
	}
	rawEntry, _ := module["entry"].(map[string]any)
	entry := cloneAnyMap(rawEntry)
	if entry == nil {
		entry = map[string]any{}
	}
	if !moduleEnabled {
		module["visible"] = false
		applyActionStateDisabled(entry, true)
	} else if _, ok := module["visible"].(bool); !ok {
		module["visible"] = true
	}
	module["entry"] = entry
}

func applyModuleActionStates(module map[string]any, moduleEnabled bool) {
	rawActions, _ := module["actions"].(map[string]any)
	actions := cloneAnyMap(rawActions)
	if actions == nil {
		if !moduleEnabled {
			module["actions"] = map[string]any{}
		}
		return
	}
	for actionName, rawAction := range actions {
		actionMap, _ := rawAction.(map[string]any)
		clonedAction := cloneAnyMap(actionMap)
		if clonedAction == nil {
			clonedAction = map[string]any{}
		}
		applyActionStateDisabled(clonedAction, !moduleEnabled)
		actions[actionName] = clonedAction
	}
	module["actions"] = actions
}

func applyActionStateDisabled(action map[string]any, disabled bool) {
	if !disabled {
		if _, ok := action["enabled"].(bool); !ok {
			action["enabled"] = true
		}
		return
	}
	action["enabled"] = false
	action["reason"] = "module disabled by capability mode"
	action["reason_code"] = admin.ActionDisabledReasonCodeFeatureDisabled
}

func translationCapabilityRoutes(adm *admin.Admin) (map[string]string, []string) {
	caps := translationCapabilitiesForAdmin(adm)
	return translationRoutesToStrings(caps["routes"]), translationStringSlice(caps["resolver_keys"])
}

func translationCapabilityPanels(adm *admin.Admin) []string {
	caps := translationCapabilitiesForAdmin(adm)
	return translationStringSlice(caps["panels"])
}

func effectiveTranslationModuleEnabled(featureEnabled, overlayEnabled bool) bool {
	return featureEnabled && overlayEnabled
}

func applyTranslationCapabilityRouteFiltering(payload map[string]any) {
	if len(payload) == 0 {
		return
	}
	modules, _ := payload["modules"].(map[string]any)
	queueEnabled := translationModuleEnabled(modules, "queue")
	exchangeEnabled := translationModuleEnabled(modules, "exchange")
	routes := filterTranslationCapabilityRoutes(translationRoutesToStrings(payload["routes"]), exchangeEnabled, queueEnabled)
	payload["routes"] = routes
	payload["resolver_keys"] = filterTranslationCapabilityResolverKeys(translationStringSlice(payload["resolver_keys"]), routes)
}

func filterTranslationCapabilityRoutes(routes map[string]string, exchangeEnabled, queueEnabled bool) map[string]string {
	if len(routes) == 0 {
		return map[string]string{}
	}
	out := map[string]string{}
	for key, path := range routes {
		key = strings.TrimSpace(key)
		path = strings.TrimSpace(path)
		if key == "" || path == "" {
			continue
		}
		module, hasModule := translationModuleForRouteKey(key)
		if !hasModule {
			out[key] = path
			continue
		}
		if module == "queue" && queueEnabled {
			out[key] = path
			continue
		}
		if module == "exchange" && exchangeEnabled {
			out[key] = path
		}
	}
	return out
}

func filterTranslationCapabilityResolverKeys(keys []string, routes map[string]string) []string {
	if len(keys) == 0 || len(routes) == 0 {
		return nil
	}
	out := make([]string, 0, len(keys))
	seen := map[string]struct{}{}
	for _, raw := range keys {
		key := strings.TrimSpace(raw)
		if key == "" {
			continue
		}
		if _, ok := routes[key]; !ok {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, key)
	}
	sort.Strings(out)
	return out
}

func translationModuleForRouteKey(routeKey string) (string, bool) {
	routeKey = strings.TrimSpace(routeKey)
	switch {
	case routeKey == "admin.translations.dashboard":
		return "queue", true
	case routeKey == "admin.translations.queue":
		return "queue", true
	case routeKey == "admin.translations.exchange":
		return "exchange", true
	case strings.HasSuffix(routeKey, ".translations.my_work"):
		return "queue", true
	case strings.HasSuffix(routeKey, ".translations.queue"):
		return "queue", true
	case strings.HasSuffix(routeKey, ".translations.export"):
		return "exchange", true
	case strings.HasSuffix(routeKey, ".translations.template"):
		return "exchange", true
	case strings.HasSuffix(routeKey, ".translations.jobs.id"):
		return "exchange", true
	case strings.HasSuffix(routeKey, ".translations.import.validate"):
		return "exchange", true
	case strings.HasSuffix(routeKey, ".translations.import.apply"):
		return "exchange", true
	default:
		return "", false
	}
}

func inferTranslationProfile(cmsEnabled, exchangeEnabled, queueEnabled bool) TranslationProfile {
	switch {
	case exchangeEnabled && queueEnabled:
		return TranslationProfileFull
	case exchangeEnabled:
		return TranslationProfileCoreExchange
	case queueEnabled:
		return TranslationProfileCoreQueue
	case cmsEnabled:
		return TranslationProfileCore
	default:
		return TranslationProfileNone
	}
}

func logTranslationCapabilitiesStartup(logger admin.Logger, caps map[string]any) {
	logger = ensureQuickstartLogger(logger)
	if logger == nil {
		return
	}
	modules, _ := caps["modules"].(map[string]any)
	features, _ := caps["features"].(map[string]any)
	routes := translationRoutesToAny(caps["routes"])
	panels := translationStringSlice(caps["panels"])
	resolverKeys := translationStringSlice(caps["resolver_keys"])
	warnings := translationStringSlice(caps["warnings"])
	profile := strings.TrimSpace(fmt.Sprint(caps["profile"]))
	schemaVersion := caps["schema_version"]

	logger.Info(
		"translation.capabilities.startup",
		"event", "translation.capabilities.startup",
		"profile", profile,
		"schema_version", schemaVersion,
		"modules.exchange.enabled", translationModuleEnabled(modules, "exchange"),
		"modules.queue.enabled", translationModuleEnabled(modules, "queue"),
		"features.cms.enabled", translationBool(features["cms"]),
		"features.dashboard.enabled", translationBool(features["dashboard"]),
		"routes", routes,
		"panels", panels,
		"resolver_keys", resolverKeys,
		"warnings", warnings,
	)
}

func logTranslationCapabilityValidationError(logger admin.Logger, err error) {
	logger = ensureQuickstartLogger(logger)
	if logger == nil {
		return
	}
	payload := translationProductErrorPayload(err)
	logger.Error(
		"translation.capabilities.startup",
		"event", "translation.capabilities.startup",
		"error_code", payload["error_code"],
		"error_message", payload["error_message"],
		"hint", payload["hint"],
		"failed_checks", payload["failed_checks"],
	)
}

func translationRoutesToAny(raw any) map[string]any {
	switch typed := raw.(type) {
	case map[string]string:
		out := map[string]any{}
		for key, value := range typed {
			out[key] = value
		}
		return out
	case map[string]any:
		return cloneAnyMap(typed)
	default:
		return map[string]any{}
	}
}

func translationRoutesToStrings(raw any) map[string]string {
	switch typed := raw.(type) {
	case map[string]string:
		return cloneStringMap(typed)
	case map[string]any:
		out := map[string]string{}
		for key, value := range typed {
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			path := strings.TrimSpace(fmt.Sprint(value))
			if path == "" {
				continue
			}
			out[key] = path
		}
		return out
	default:
		return map[string]string{}
	}
}

func translationStringSlice(raw any) []string {
	switch typed := raw.(type) {
	case []string:
		return append([]string{}, typed...)
	case []any:
		out := []string{}
		for _, value := range typed {
			candidate := strings.TrimSpace(fmt.Sprint(value))
			if candidate == "" {
				continue
			}
			out = append(out, candidate)
		}
		return out
	default:
		return nil
	}
}

func translationBool(value any) bool {
	enabled, _ := value.(bool)
	return enabled
}
