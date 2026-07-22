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
	queue := translationCapabilityModuleState(
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
			"suggest":       PermAdminTranslationsSuggest,
			"approve":       PermAdminTranslationsApprove,
			"reject":        PermAdminTranslationsApprove,
			"archive":       PermAdminTranslationsManage,
		},
	)
	if actions := extractMap(queue["actions"]); len(actions) > 0 {
		actions["suggest"] = translationSuggestionCapabilityActionState(adm, reqCtx, queueEnabled)
		queue["actions"] = actions
	}
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
		"queue": queue,
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
	if adm == nil {
		return false
	}
	return permissionAllowed(adm.authorizer, reqCtx, permission, resource)
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
		"cms":         featureEnabled(adm.featureGate, FeatureCMS),
		"dashboard":   featureEnabled(adm.featureGate, FeatureDashboard),
		"suggestions": translationSuggestionCapability(adm),
	}
}

func translationSuggestionCapability(adm *Admin) map[string]any {
	serviceConfigured := adm != nil && adm.TranslationSuggestionService() != nil
	queueEnabled := adm != nil && featureEnabled(adm.featureGate, FeatureTranslationQueue)
	rpcAllowed := false
	commandRegistration := translationSuggestionCommandRegistration(adm)
	inlineResultSupported := commandRegistration.SupportsInlineResult()
	if adm != nil {
		_, rpcAllowed = adm.config.Commands.RPC.ResolveRule(TranslationSuggestionGenerateCommandName)
	}
	state := map[string]any{
		"enabled":                 serviceConfigured && queueEnabled && rpcAllowed && inlineResultSupported,
		"service_configured":      serviceConfigured,
		"queue_enabled":           queueEnabled,
		"permission":              PermAdminTranslationsSuggest,
		"command_name":            TranslationSuggestionGenerateCommandName,
		"command_registered":      commandRegistration.Registered(),
		"command_dispatchable":    commandRegistration.CanDispatch(),
		"inline_result_supported": inlineResultSupported,
		"rpc_allowed":             rpcAllowed,
	}
	if !queueEnabled {
		state["reason"] = "translation queue module disabled"
		state["reason_code"] = ActionDisabledReasonCodeFeatureDisabled
	} else if !serviceConfigured {
		state["reason"] = "translation suggestion service not configured"
		state["reason_code"] = ActionDisabledReasonCodeFeatureDisabled
	} else if !rpcAllowed {
		state["reason"] = "translation suggestion RPC transport is not configured"
		state["reason_code"] = "transport_unavailable"
	} else if !commandRegistration.Registered() {
		state["reason"] = "translation suggestion command is not registered"
		state["reason_code"] = "command_unavailable"
	} else if !inlineResultSupported {
		state["reason"] = "translation suggestion command does not support inline results"
		state["reason_code"] = "command_result_unavailable"
	}
	return state
}

func translationSuggestionCapabilityActionState(adm *Admin, reqCtx context.Context, moduleEnabled bool) map[string]any {
	serviceConfigured := adm != nil && adm.TranslationSuggestionService() != nil
	commandRegistration := translationSuggestionCommandRegistration(adm)
	inlineResultSupported := commandRegistration.SupportsInlineResult()
	rpcAllowed := false
	state := map[string]any{
		"enabled":                 false,
		"permission":              PermAdminTranslationsSuggest,
		"command_name":            TranslationSuggestionGenerateCommandName,
		"service_configured":      serviceConfigured,
		"command_registered":      commandRegistration.Registered(),
		"command_dispatchable":    commandRegistration.CanDispatch(),
		"inline_result_supported": inlineResultSupported,
		"rpc_allowed":             rpcAllowed,
	}
	if adm != nil {
		_, rpcAllowed = adm.config.Commands.RPC.ResolveRule(TranslationSuggestionGenerateCommandName)
		state["rpc_allowed"] = rpcAllowed
	}
	if !moduleEnabled {
		state["reason"] = "module disabled by capability mode"
		state["reason_code"] = ActionDisabledReasonCodeFeatureDisabled
		return state
	}
	if !serviceConfigured {
		state["reason"] = "translation suggestion service not configured"
		state["reason_code"] = ActionDisabledReasonCodeFeatureDisabled
		return state
	}
	if !rpcAllowed {
		state["reason"] = "translation suggestion RPC transport is not configured"
		state["reason_code"] = "transport_unavailable"
		return state
	}
	if !commandRegistration.Registered() {
		state["reason"] = "translation suggestion command is not registered"
		state["reason_code"] = "command_unavailable"
		return state
	}
	if !inlineResultSupported {
		state["reason"] = "translation suggestion command does not support inline results"
		state["reason_code"] = "command_result_unavailable"
		return state
	}
	allowed := translationCapabilityPermissionAllowed(adm, reqCtx, PermAdminTranslationsSuggest, "translations")
	if !allowed {
		state["reason"] = "missing permission: " + PermAdminTranslationsSuggest
		state["reason_code"] = ActionDisabledReasonCodePermissionDenied
		return state
	}
	state["enabled"] = true
	delete(state, "reason")
	delete(state, "reason_code")
	return state
}

func translationSuggestionCommandRegistration(adm *Admin) CommandRegistrationState {
	if adm == nil || adm.Commands() == nil {
		return CommandRegistrationState{}
	}
	return adm.Commands().CommandRegistration(TranslationSuggestionGenerateCommandName)
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
		path := ""
		if routes, ok := adm.URLs().(interface {
			RoutePath(string, string) (string, error)
		}); ok {
			if routePath, err := routes.RoutePath(group, route); err == nil {
				path = strings.TrimSpace(routePath)
			}
		}
		if path == "" {
			path = strings.TrimSpace(resolveURLWith(adm.URLs(), group, route, nil, nil))
		}
		if path == "" {
			return
		}
		keys = append(keys, key)
		routes[key] = path
	}

	for _, route := range translationCapabilityRouteSpecs(adminGroup, adminAPIGroup) {
		register(route.group, route.route, route.key)
	}

	sort.Strings(keys)
	return routes, keys
}

type translationCapabilityRouteSpec struct {
	group string
	route string
	key   string
}

func translationCapabilityRouteSpecs(adminGroup, adminAPIGroup string) []translationCapabilityRouteSpec {
	routes := []translationCapabilityRouteSpec{
		{group: adminGroup, route: "translations.queue", key: "admin.translations.queue"},
		{group: adminGroup, route: "translations.dashboard", key: "admin.translations.dashboard"},
		{group: adminGroup, route: "translations.exchange", key: "admin.translations.exchange"},
		{group: adminGroup, route: "translations.matrix", key: "admin.translations.matrix"},
		{group: adminGroup, route: "translations.families", key: "admin.translations.families"},
		{group: adminGroup, route: "translations.families.id", key: "admin.translations.families.id"},
		{group: adminGroup, route: "translations.families.assignments", key: "admin.translations.families.assignments"},
		{group: adminGroup, route: "translations.assignments", key: "admin.translations.assignments"},
		{group: adminGroup, route: "translations.assignments.edit", key: "admin.translations.assignments.edit"},
	}
	for _, route := range []string{
		"translations.export",
		"translations.template",
		"translations.dashboard",
		"translations.matrix",
		"translations.matrix.actions.create_missing",
		"translations.matrix.actions.export_selected",
		"translations.families",
		"translations.families.id",
		"translations.families.variants",
		"translations.families.assignments",
		"translations.sync.resources.id",
		"translations.assignments",
		"translations.assignments.family_assignments",
		"translations.assignments.id",
		"translations.assignments.preview",
		"translations.assignments.bulk_snapshot",
		"translations.assignments.bulk_actions",
		"translations.assignments.actions",
		"translations.my_work",
		"translations.queue",
		"translations.jobs.id",
		"translations.import.validate",
		"translations.import.apply",
	} {
		routes = append(routes, translationCapabilityRouteSpec{
			group: adminAPIGroup,
			route: route,
			key:   fmt.Sprintf("%s.%s", adminAPIGroup, route),
		})
	}
	return routes
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
	return toBool(typed["enabled"])
}

func translationCapabilityFeatureEnabled(features map[string]any, feature string) bool {
	if len(features) == 0 {
		return false
	}
	return toBool(features[strings.TrimSpace(feature)])
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
