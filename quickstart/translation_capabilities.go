package quickstart

import (
	"fmt"
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

func registerTranslationCapabilities(adm *admin.Admin, productCfg TranslationProductConfig, warnings []string, modules translationCapabilityModuleState) {
	if adm == nil {
		return
	}
	caps := buildTranslationCapabilities(adm, productCfg, warnings, modules)
	translationCapabilitiesStore.Store(adm, caps)
}

func translationCapabilitiesForAdmin(adm *admin.Admin) map[string]any {
	if adm == nil {
		return map[string]any{}
	}
	if cached, ok := translationCapabilitiesStore.Load(adm); ok {
		if typed, ok := cached.(map[string]any); ok {
			return cloneAnyMap(typed)
		}
	}
	return buildTranslationCapabilities(adm, TranslationProductConfig{}, nil, translationCapabilityModuleState{})
}

func buildTranslationCapabilities(adm *admin.Admin, productCfg TranslationProductConfig, warnings []string, modules translationCapabilityModuleState) map[string]any {
	if adm == nil {
		return map[string]any{}
	}

	base := admin.TranslationCapabilities(adm)
	if len(base) == 0 {
		base = map[string]any{}
	}

	baseModules, _ := base["modules"].(map[string]any)
	exchangeEnabled := translationModuleEnabled(baseModules, "exchange")
	queueEnabled := translationModuleEnabled(baseModules, "queue")
	if modules.HasState {
		exchangeEnabled = modules.ExchangeEnabled
		queueEnabled = modules.QueueEnabled
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

	return map[string]any{
		"profile":        profile,
		"schema_version": schemaVersion,
		"modules": map[string]any{
			"exchange": map[string]any{"enabled": exchangeEnabled},
			"queue":    map[string]any{"enabled": queueEnabled},
		},
		"features": map[string]any{
			"cms":       cmsEnabled,
			"dashboard": dashboardEnabled,
		},
		"routes":        routes,
		"panels":        panels,
		"resolver_keys": resolverKeys,
		"warnings":      dedupeStringSlice(warnings),
	}
}

func translationCapabilityRoutes(adm *admin.Admin) (map[string]string, []string) {
	caps := admin.TranslationCapabilities(adm)
	return translationRoutesToStrings(caps["routes"]), translationStringSlice(caps["resolver_keys"])
}

func translationCapabilityPanels(adm *admin.Admin) []string {
	caps := admin.TranslationCapabilities(adm)
	return translationStringSlice(caps["panels"])
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
