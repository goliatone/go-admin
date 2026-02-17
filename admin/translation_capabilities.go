package admin

import (
	"context"
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
// - contracts
func TranslationCapabilities(adm *Admin) map[string]any {
	return TranslationCapabilitiesForContext(adm, nil)
}

// TranslationCapabilitiesForContext returns a translation capability snapshot
// with request-scoped permission states when context is available.
func TranslationCapabilitiesForContext(adm *Admin, reqCtx context.Context) map[string]any {
	if adm == nil {
		return map[string]any{}
	}

	modules := translationCapabilityModules(adm, reqCtx)
	features := translationCapabilityFeatures(adm)
	routes, resolverKeys := translationCapabilityRoutes(adm)
	panels := translationCapabilityPanels(adm)

	cmsEnabled := translationCapabilityFeatureEnabled(features, "cms")
	exchangeEnabled := translationCapabilityModuleEnabled(modules, "exchange")
	queueEnabled := translationCapabilityModuleEnabled(modules, "queue")
	profile := inferTranslationCapabilityProfile(cmsEnabled, exchangeEnabled, queueEnabled)

	return map[string]any{
		"profile":            profile,
		"capability_mode":    profile,
		"supported_profiles": []string{"none", "core", "core+exchange", "core+queue", "full"},
		"schema_version":     translationCapabilitiesSchemaVersionCurrent,
		"modules":            modules,
		"features":           features,
		"routes":             routes,
		"panels":             panels,
		"resolver_keys":      resolverKeys,
		"warnings":           []string{},
		"contracts":          TranslationSharedContractsPayload(),
	}
}

func translationCapabilityModules(adm *Admin, reqCtx context.Context) map[string]any {
	if adm == nil {
		return map[string]any{}
	}
	exchangeEnabled := featureEnabled(adm.featureGate, FeatureTranslationExchange)
	queueEnabled := featureEnabled(adm.featureGate, FeatureTranslationQueue)
	return map[string]any{
		"exchange": translationCapabilityModuleState(
			adm,
			reqCtx,
			"translations",
			exchangeEnabled,
			PermAdminTranslationsImportView,
			map[string]string{
				"export":          PermAdminTranslationsExport,
				"import.view":     PermAdminTranslationsImportView,
				"import.validate": PermAdminTranslationsImportValidate,
				"import.apply":    PermAdminTranslationsImportApply,
			},
		),
		"queue": translationCapabilityModuleState(
			adm,
			reqCtx,
			"translations",
			queueEnabled,
			PermAdminTranslationsView,
			map[string]string{
				"view":          PermAdminTranslationsView,
				"claim":         PermAdminTranslationsClaim,
				"assign":        PermAdminTranslationsAssign,
				"release":       PermAdminTranslationsAssign,
				"submit_review": PermAdminTranslationsEdit,
				"approve":       PermAdminTranslationsApprove,
				"reject":        PermAdminTranslationsApprove,
				"archive":       PermAdminTranslationsManage,
			},
		),
	}
}

func translationCapabilityModuleState(adm *Admin, reqCtx context.Context, resource string, enabled bool, entryPermission string, actionPermissions map[string]string) map[string]any {
	resource = strings.TrimSpace(resource)
	if resource == "" {
		resource = "translations"
	}
	entryAllowed := translationCapabilityPermissionAllowed(adm, reqCtx, entryPermission, resource)
	out := map[string]any{
		"enabled": enabled,
		"visible": enabled && entryAllowed,
		"entry":   translationCapabilityActionState(enabled, entryAllowed, entryPermission),
	}

	actions := map[string]any{}
	actionNames := make([]string, 0, len(actionPermissions))
	for name := range actionPermissions {
		actionNames = append(actionNames, strings.TrimSpace(name))
	}
	sort.Strings(actionNames)
	for _, name := range actionNames {
		if name == "" {
			continue
		}
		permission := strings.TrimSpace(actionPermissions[name])
		allowed := translationCapabilityPermissionAllowed(adm, reqCtx, permission, resource)
		actions[name] = translationCapabilityActionState(enabled, allowed, permission)
	}
	out["actions"] = actions

	return out
}

func translationCapabilityPermissionAllowed(adm *Admin, reqCtx context.Context, permission, resource string) bool {
	if strings.TrimSpace(permission) == "" {
		return true
	}
	if adm == nil || adm.authorizer == nil {
		return true
	}
	if reqCtx == nil {
		return true
	}
	return adm.authorizer.Can(reqCtx, strings.TrimSpace(permission), strings.TrimSpace(resource))
}

func translationCapabilityActionState(moduleEnabled, permissionAllowed bool, permission string) map[string]any {
	out := map[string]any{
		"enabled": moduleEnabled && permissionAllowed,
	}
	permission = strings.TrimSpace(permission)
	if permission != "" {
		out["permission"] = permission
	}
	if moduleEnabled && permissionAllowed {
		return out
	}
	if !moduleEnabled {
		out["reason"] = "module disabled by capability mode"
		out["reason_code"] = ActionDisabledReasonCodeFeatureDisabled
		return out
	}
	out["reason"] = "missing permission: " + permission
	out["reason_code"] = ActionDisabledReasonCodePermissionDenied
	return out
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
	register(adminAPIGroup, "translations.my_work", fmt.Sprintf("%s.%s", adminAPIGroup, "translations.my_work"))
	register(adminAPIGroup, "translations.queue", fmt.Sprintf("%s.%s", adminAPIGroup, "translations.queue"))
	register(adminAPIGroup, "translations.jobs.id", fmt.Sprintf("%s.%s", adminAPIGroup, "translations.jobs.id"))
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
