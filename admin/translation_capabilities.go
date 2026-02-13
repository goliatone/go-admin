package admin

import (
	"fmt"
	"sort"
	"strings"
)

const translationCapabilitiesSchemaVersionCurrent = 1

// TranslationCapabilities returns a translation capability snapshot for the admin instance.
// The payload shape is stable for template/frontend gating:
// - profile
// - schema_version
// - modules
// - features
// - routes
// - panels
// - resolver_keys
// - warnings
func TranslationCapabilities(adm *Admin) map[string]any {
	if adm == nil {
		return map[string]any{}
	}

	modules := translationCapabilityModules(adm)
	features := translationCapabilityFeatures(adm)
	routes, resolverKeys := translationCapabilityRoutes(adm)
	panels := translationCapabilityPanels(adm)

	cmsEnabled := translationCapabilityFeatureEnabled(features, "cms")
	exchangeEnabled := translationCapabilityModuleEnabled(modules, "exchange")
	queueEnabled := translationCapabilityModuleEnabled(modules, "queue")

	return map[string]any{
		"profile":        inferTranslationCapabilityProfile(cmsEnabled, exchangeEnabled, queueEnabled),
		"schema_version": translationCapabilitiesSchemaVersionCurrent,
		"modules":        modules,
		"features":       features,
		"routes":         routes,
		"panels":         panels,
		"resolver_keys":  resolverKeys,
		"warnings":       []string{},
	}
}

func translationCapabilityModules(adm *Admin) map[string]any {
	if adm == nil {
		return map[string]any{}
	}
	return map[string]any{
		"exchange": map[string]any{
			"enabled": featureEnabled(adm.featureGate, FeatureTranslationExchange),
		},
		"queue": map[string]any{
			"enabled": featureEnabled(adm.featureGate, FeatureTranslationQueue),
		},
	}
}

func translationCapabilityFeatures(adm *Admin) map[string]any {
	if adm == nil {
		return map[string]any{}
	}
	return map[string]any{
		"cms":       featureEnabled(adm.featureGate, FeatureCMS),
		"dashboard": featureEnabled(adm.featureGate, FeatureDashboard),
	}
}

func translationCapabilityRoutes(adm *Admin) (map[string]string, []string) {
	routes := map[string]string{}
	keys := []string{}
	if adm == nil || adm.URLs() == nil {
		return routes, keys
	}

	adminGroup := "admin"
	adminAPIGroup := strings.TrimSpace(adm.AdminAPIGroup())
	if adminAPIGroup == "" {
		adminAPIGroup = "admin.api"
	}

	register := func(group, route, key string) {
		if strings.TrimSpace(group) == "" || strings.TrimSpace(route) == "" || strings.TrimSpace(key) == "" {
			return
		}
		path := strings.TrimSpace(resolveURLWith(adm.URLs(), group, route, nil, nil))
		if path == "" {
			return
		}
		keys = append(keys, key)
		routes[key] = path
	}

	register(adminGroup, "translations.queue", "admin.translations.queue")
	register(adminGroup, "translations.exchange", "admin.translations.exchange")
	register(adminAPIGroup, "translations.export", fmt.Sprintf("%s.%s", adminAPIGroup, "translations.export"))
	register(adminAPIGroup, "translations.template", fmt.Sprintf("%s.%s", adminAPIGroup, "translations.template"))
	register(adminAPIGroup, "translations.import.validate", fmt.Sprintf("%s.%s", adminAPIGroup, "translations.import.validate"))
	register(adminAPIGroup, "translations.import.apply", fmt.Sprintf("%s.%s", adminAPIGroup, "translations.import.apply"))

	sort.Strings(keys)
	return routes, keys
}

func translationCapabilityPanels(adm *Admin) []string {
	if adm == nil || adm.Registry() == nil {
		return nil
	}

	out := []string{}
	for key := range adm.Registry().Panels() {
		if strings.Contains(strings.ToLower(strings.TrimSpace(key)), "translation") {
			out = append(out, key)
		}
	}
	sort.Strings(out)
	return out
}

func translationCapabilityModuleEnabled(modules map[string]any, module string) bool {
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

func translationCapabilityFeatureEnabled(features map[string]any, feature string) bool {
	if len(features) == 0 {
		return false
	}
	enabled, _ := features[strings.TrimSpace(feature)].(bool)
	return enabled
}

func inferTranslationCapabilityProfile(cmsEnabled, exchangeEnabled, queueEnabled bool) string {
	switch {
	case exchangeEnabled && queueEnabled:
		return "full"
	case exchangeEnabled:
		return "core+exchange"
	case queueEnabled:
		return "core+queue"
	case cmsEnabled:
		return "core"
	default:
		return "none"
	}
}
