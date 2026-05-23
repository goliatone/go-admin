package quickstart

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/routing"
	"github.com/google/uuid"
)

func registerQuickstartDoctorChecks(adm *admin.Admin, cfg admin.Config, result AdapterResult, options adminOptions) {
	if adm == nil {
		return
	}
	checks := defaultQuickstartDoctorChecks(cfg, result, options)
	if len(options.doctorChecks) > 0 {
		checks = append(checks, options.doctorChecks...)
	}
	adm.RegisterDoctorChecks(checks...)
}

func defaultQuickstartDoctorChecks(cfg admin.Config, result AdapterResult, options adminOptions) []admin.DoctorCheck {
	return []admin.DoctorCheck{
		quickstartDoctorAdaptersCheck(result),
		quickstartDoctorGoUsersScopeCheck(cfg, options),
		quickstartDoctorRoutingCheck(),
		quickstartDoctorRoutesCheck(cfg),
		quickstartDoctorBlockDefinitionsCheck(),
		quickstartDoctorTranslationCheck(),
	}
}

func quickstartDoctorAdaptersCheck(result AdapterResult) admin.DoctorCheck {
	return admin.DoctorCheck{
		ID:          "quickstart.adapters",
		Label:       "Quickstart Adapters",
		Description: "Validates adapter flags against configured backends.",
		Help:        "Checks whether adapter feature flags resolved to the expected runtime backends. Warnings and errors indicate requested adapters that were not actually wired.",
		Action: admin.NewManualDoctorAction(
			"Align adapter env flags with provided hooks/dependencies and re-bootstrap quickstart wiring.",
			"Review adapter setup",
		),
		Run: func(_ context.Context, _ *admin.Admin) admin.DoctorCheckOutput {
			findings := []admin.DoctorFinding{}
			if result.Flags.UsePersistentCMS && !result.PersistentCMSSet {
				findings = append(findings, admin.DoctorFinding{
					Severity:  admin.DoctorSeverityError,
					Code:      "quickstart.adapters.persistent_cms",
					Component: "cms",
					Message:   "Persistent CMS was requested but is not configured",
					Hint:      "Wire AdapterHooks.PersistentCMS or disable USE_PERSISTENT_CMS",
					Metadata: map[string]any{
						"error": strings.TrimSpace(fmt.Sprint(result.PersistentCMSError)),
					},
				})
			}
			if result.Flags.UseGoOptions && strings.EqualFold(strings.TrimSpace(result.SettingsBackend), "in-memory settings") {
				findings = append(findings, admin.DoctorFinding{
					Severity:  admin.DoctorSeverityWarn,
					Code:      "quickstart.adapters.go_options",
					Component: "settings",
					Message:   "Go-options backend was requested but in-memory settings remain active",
					Hint:      "Wire AdapterHooks.GoOptions to switch settings backend",
				})
			}
			if result.Flags.UseGoUsersActivity && result.ActivitySink == nil {
				findings = append(findings, admin.DoctorFinding{
					Severity:  admin.DoctorSeverityWarn,
					Code:      "quickstart.adapters.go_users_activity",
					Component: "activity",
					Message:   "go-users activity backend was requested but no sink was attached",
					Hint:      "Wire AdapterHooks.GoUsersActivity or disable USE_GO_USERS_ACTIVITY",
				})
			}

			return admin.DoctorCheckOutput{
				Findings: findings,
				Metadata: map[string]any{
					"requested_flags": map[string]bool{
						"use_persistent_cms":    result.Flags.UsePersistentCMS,
						"use_go_options":        result.Flags.UseGoOptions,
						"use_go_users_activity": result.Flags.UseGoUsersActivity,
					},
					"backends": map[string]any{
						"cms":      strings.TrimSpace(result.CMSBackend),
						"settings": strings.TrimSpace(result.SettingsBackend),
						"activity": strings.TrimSpace(result.ActivityBackend),
					},
				},
			}
		},
	}
}

func quickstartDoctorGoUsersScopeCheck(cfg admin.Config, options adminOptions) admin.DoctorCheck {
	return admin.DoctorCheck{
		ID:          "quickstart.go_users_scope",
		Label:       "go-users Scope Wiring",
		Description: "Reports quickstart go-users adapter scope resolver wiring and single-tenant default coverage.",
		Help:        "Use this check when user or role lists look empty even though go-users seed data exists. It reports quickstart-owned resolver metadata and labels custom resolver behavior as best-effort.",
		Action: admin.NewManualDoctorAction(
			"Use quickstart.ScopeBuilder(adminCfg), or an equivalent config-aware resolver, for scoped go-users user, role, and profile reads.",
			"Review go-users scope wiring",
		),
		Run: func(ctx context.Context, _ *admin.Admin) admin.DoctorCheckOutput {
			metadata := goUsersScopeDoctorMetadata(ctx, cfg, options)
			findings := goUsersScopeDoctorFindings(metadata)
			if len(findings) == 0 {
				return admin.DoctorCheckOutput{
					Summary:  goUsersScopeDoctorSummary(metadata),
					Metadata: metadata,
				}
			}
			return admin.DoctorCheckOutput{
				Summary:  goUsersScopeDoctorSummary(metadata),
				Findings: findings,
				Metadata: metadata,
			}
		},
	}
}

func goUsersScopeDoctorMetadata(ctx context.Context, cfg admin.Config, options adminOptions) map[string]any {
	scopeCfg := ScopeConfigFromAdmin(cfg)
	rawScope := ScopeFromContext(ctx)
	resolvedScope := ScopeBuilder(cfg)(ctx)
	defaultScope := DefaultScopeFilter(cfg)
	defaultTenantPresent := defaultScope.TenantID != uuid.Nil
	defaultOrgPresent := defaultScope.OrgID != uuid.Nil
	wiring := goUsersScopeDoctorWiringMetadata(options)
	return map[string]any{
		"scope": map[string]any{
			"mode": scopeCfg.Mode,
			"raw": map[string]string{
				"tenant_id": formatUUID(rawScope.TenantID),
				"org_id":    formatUUID(rawScope.OrgID),
			},
			"resolved": map[string]string{
				"tenant_id": formatUUID(resolvedScope.TenantID),
				"org_id":    formatUUID(resolvedScope.OrgID),
			},
			"default": map[string]string{
				"tenant_id": formatUUID(defaultScope.TenantID),
				"org_id":    formatUUID(defaultScope.OrgID),
			},
			"defaults_present": map[string]bool{
				"tenant_id": defaultTenantPresent,
				"org_id":    defaultOrgPresent,
			},
			"defaults_applied": map[string]bool{
				"tenant_id": rawScope.TenantID == uuid.Nil && defaultScope.TenantID != uuid.Nil && resolvedScope.TenantID == defaultScope.TenantID,
				"org_id":    rawScope.OrgID == uuid.Nil && defaultScope.OrgID != uuid.Nil && resolvedScope.OrgID == defaultScope.OrgID,
			},
		},
		"wiring": wiring,
	}
}

func goUsersScopeDoctorWiringMetadata(options adminOptions) map[string]any {
	wiring := options.goUsersUserManagement
	userGoUsers, roleGoUsers, profileGoUsers := goUsersScopeDoctorAdapterFlags(options)
	userOwned, roleOwned, profileOwned := goUsersScopeDoctorOwnedFlags(options, wiring)
	source := goUsersScopeDoctorResolverSource(wiring, userGoUsers || roleGoUsers || profileGoUsers, userOwned || roleOwned || profileOwned)
	return map[string]any{
		"resolver_source":       source,
		"quickstart_configured": wiring != nil,
		"quickstart_owned": map[string]bool{
			"user_repository": userOwned,
			"role_repository": roleOwned,
			"profile_store":   profileOwned,
		},
		"go_users_adapters": map[string]bool{
			"user_repository": userGoUsers,
			"role_repository": roleGoUsers,
			"profile_store":   profileGoUsers,
		},
		"profile_configured": wiring != nil && wiring.profileWired,
		"resolver_finalized": wiring != nil && (wiring.explicit != nil || wiring.finalized),
	}
}

func goUsersScopeDoctorAdapterFlags(options adminOptions) (bool, bool, bool) {
	userGoUsers := false
	roleGoUsers := false
	profileGoUsers := false
	if _, ok := options.deps.UserRepository.(*admin.GoUsersUserRepository); ok {
		userGoUsers = true
	}
	if _, ok := options.deps.RoleRepository.(*admin.GoUsersRoleRepository); ok {
		roleGoUsers = true
	}
	if _, ok := options.deps.ProfileStore.(*admin.GoUsersProfileStore); ok {
		profileGoUsers = true
	}
	return userGoUsers, roleGoUsers, profileGoUsers
}

func goUsersScopeDoctorOwnedFlags(options adminOptions, wiring *goUsersUserManagementWiring) (bool, bool, bool) {
	userOwned := wiring != nil && options.deps.UserRepository == wiring.userRepo
	roleOwned := wiring != nil && options.deps.RoleRepository == wiring.roleRepo
	profileOwned := wiring != nil && wiring.profileStore != nil && options.deps.ProfileStore == wiring.profileStore
	return userOwned, roleOwned, profileOwned
}

func goUsersScopeDoctorResolverSource(wiring *goUsersUserManagementWiring, hasGoUsersAdapter bool, hasOwnedAdapter bool) string {
	source := "none"
	if hasGoUsersAdapter {
		source = goUsersScopeResolverSourceUnknown
	}
	if wiring != nil && hasOwnedAdapter {
		source = wiring.source
	}
	return source
}

func goUsersScopeDoctorFindings(metadata map[string]any) []admin.DoctorFinding {
	scope := mapFromMetadata(metadata, "scope")
	wiring := mapFromMetadata(metadata, "wiring")
	source := strings.TrimSpace(fmt.Sprint(wiring["resolver_source"]))
	mode := strings.TrimSpace(fmt.Sprint(scope["mode"]))
	if !goUsersScopeDoctorHasGoUsersAdapter(wiring) || mode != string(ScopeModeSingle) {
		return nil
	}
	defaultsPresent := boolMapFromMetadata(scope, "defaults_present")
	if !defaultsPresent["tenant_id"] || !defaultsPresent["org_id"] {
		return []admin.DoctorFinding{{
			Severity:  admin.DoctorSeverityWarn,
			Code:      "quickstart.go_users_scope.defaults_missing",
			Component: "users.scope",
			Message:   "Single-tenant go-users scope defaults are not fully configured",
			Hint:      "Configure DefaultTenantID and DefaultOrgID, or use quickstart.WithScopeConfig with single-tenant defaults.",
			Metadata: map[string]any{
				"resolver_source": source,
			},
		}}
	}
	if source == goUsersScopeResolverSourceUnknown {
		return []admin.DoctorFinding{{
			Severity:  admin.DoctorSeverityWarn,
			Code:      "quickstart.go_users_scope.unknown_resolver",
			Component: "users.scope",
			Message:   "go-users user management adapters are active, but quickstart cannot verify their scope resolver",
			Hint:      "Use quickstart.ScopeBuilder(adminCfg), or an equivalent config-aware resolver, for scoped go-users user, role, and profile reads.",
			Metadata: map[string]any{
				"resolver_source": source,
				"confidence":      "best_effort",
			},
		}}
	}
	return nil
}

func goUsersScopeDoctorSummary(metadata map[string]any) string {
	wiring := mapFromMetadata(metadata, "wiring")
	source := strings.TrimSpace(fmt.Sprint(wiring["resolver_source"]))
	if !goUsersScopeDoctorHasGoUsersAdapter(wiring) {
		return "No go-users user management adapters detected"
	}
	switch source {
	case goUsersScopeResolverSourceDefaulted:
		return "Quickstart go-users adapters use the config-aware default scope resolver"
	case goUsersScopeResolverSourceExplicit:
		return "Quickstart go-users adapters use an explicit resolver; resolver behavior is best-effort to diagnostics"
	case goUsersScopeResolverSourceUnknown:
		return "go-users adapters are active with resolver behavior that quickstart cannot inspect"
	default:
		return "go-users scope wiring metadata collected"
	}
}

func goUsersScopeDoctorHasGoUsersAdapter(wiring map[string]any) bool {
	adapters := boolMapFromMetadata(wiring, "go_users_adapters")
	return adapters["user_repository"] || adapters["role_repository"] || adapters["profile_store"]
}

func mapFromMetadata(metadata map[string]any, key string) map[string]any {
	if metadata == nil {
		return map[string]any{}
	}
	out, ok := metadata[key].(map[string]any)
	if !ok {
		return map[string]any{}
	}
	if out == nil {
		return map[string]any{}
	}
	return out
}

func boolMapFromMetadata(metadata map[string]any, key string) map[string]bool {
	out := map[string]bool{}
	if metadata == nil {
		return out
	}
	if raw, ok := metadata[key].(map[string]bool); ok {
		maps.Copy(out, raw)
		return out
	}
	raw, ok := metadata[key].(map[string]any)
	if !ok {
		return out
	}
	for k, v := range raw {
		if val, ok := v.(bool); ok {
			out[k] = val
		}
	}
	return out
}

func quickstartDoctorRoutesCheck(cfg admin.Config) admin.DoctorCheck {
	return admin.DoctorCheck{
		ID:          "quickstart.routes",
		Label:       "Quickstart Routes",
		Description: "Checks that critical admin and API routes resolve.",
		Help:        "Validates core admin and API route resolution through URLKit. Missing routes indicate incomplete bootstrap registration.",
		Action: admin.NewManualDoctorAction(
			"Verify route group configuration and module registration order so required admin/API paths resolve.",
			"Inspect route wiring",
		),
		Run: func(_ context.Context, adm *admin.Admin) admin.DoctorCheckOutput {
			if adm == nil {
				return admin.DoctorCheckOutput{}
			}
			urls := adm.URLs()
			if urls == nil {
				return admin.DoctorCheckOutput{
					Findings: []admin.DoctorFinding{
						{
							Severity:  admin.DoctorSeverityError,
							Code:      "quickstart.routes.urls_missing",
							Component: "routes",
							Message:   "URL resolver is unavailable",
							Hint:      "Ensure URL manager is configured before route diagnostics",
						},
					},
				}
			}

			required := []struct {
				Group string
				Route string
				Code  string
			}{
				{Group: "admin", Route: "dashboard", Code: "quickstart.routes.dashboard"},
				{Group: adminAPIGroupName(cfg), Route: "navigation", Code: "quickstart.routes.navigation"},
				{Group: adminAPIGroupName(cfg), Route: "errors", Code: "quickstart.routes.errors"},
			}
			findings := []admin.DoctorFinding{}
			resolved := map[string]string{}
			for _, route := range required {
				key := strings.TrimSpace(route.Group + "." + route.Route)
				path := strings.TrimSpace(resolveRoutePath(urls, route.Group, route.Route))
				if path == "" {
					findings = append(findings, admin.DoctorFinding{
						Severity:  admin.DoctorSeverityError,
						Code:      route.Code,
						Component: "routes",
						Message:   fmt.Sprintf("Route %q did not resolve", key),
						Hint:      "Verify boot route registration and URLKit group configuration",
					})
					continue
				}
				resolved[key] = path
			}

			return admin.DoctorCheckOutput{
				Findings: findings,
				Metadata: map[string]any{
					"resolved": resolved,
				},
			}
		},
	}
}

func quickstartDoctorRoutingCheck() admin.DoctorCheck {
	return admin.DoctorCheck{
		ID:          "quickstart.routing",
		Label:       "Quickstart Routing Policy",
		Description: "Validates routing roots, module mounts, and startup conflict state.",
		Help:        "Summarizes effective routing roots and resolved module mount bases. Conflicts here indicate startup should fail before router mutation even when runtime router options are relaxed.",
		Action: admin.NewManualDoctorAction(
			"Review routing roots, explicit module route contracts, and per-module mount overrides. Resolve any conflicts before retrying startup.",
			"Inspect routing policy",
		),
		Run: func(_ context.Context, adm *admin.Admin) admin.DoctorCheckOutput {
			if adm == nil {
				return admin.DoctorCheckOutput{}
			}

			report := adm.RoutingReport()
			findings := []admin.DoctorFinding{}
			roots := map[string]string{
				"admin":      strings.TrimSpace(report.EffectiveRoots.AdminRoot),
				"api":        strings.TrimSpace(report.EffectiveRoots.APIRoot),
				"public_api": strings.TrimSpace(report.EffectiveRoots.PublicAPIRoot),
			}
			for rootName, rootValue := range roots {
				if rootValue != "" {
					continue
				}
				findings = append(findings, admin.DoctorFinding{
					Severity:  admin.DoctorSeverityError,
					Code:      "quickstart.routing.root_missing",
					Component: "routing",
					Message:   fmt.Sprintf("Effective %s root is empty", rootName),
					Hint:      "Normalize routing roots before bootstrap and keep host-owned surfaces explicit",
					Metadata:  map[string]any{"root": rootName},
				})
			}
			for _, conflict := range report.Conflicts {
				findings = append(findings, admin.DoctorFinding{
					Severity:  admin.DoctorSeverityError,
					Code:      "quickstart.routing.conflict",
					Component: "routing",
					Message:   strings.TrimSpace(conflict.Message),
					Hint:      "Adjust module slugs or mount overrides so surfaces do not collide",
					Metadata: map[string]any{
						"kind":       strings.TrimSpace(conflict.Kind),
						"module":     strings.TrimSpace(conflict.Module),
						"method":     strings.TrimSpace(conflict.Method),
						"path":       strings.TrimSpace(conflict.Path),
						"route_name": strings.TrimSpace(conflict.RouteName),
					},
				})
			}
			for _, warning := range report.Warnings {
				warning = strings.TrimSpace(warning)
				if warning == "" {
					continue
				}
				findings = append(findings, admin.DoctorFinding{
					Severity:  admin.DoctorSeverityWarn,
					Code:      "quickstart.routing.warning",
					Component: "routing",
					Message:   warning,
					Hint:      "Review adapter/runtime capability warnings and keep routing diagnostics enabled during rollout",
				})
			}

			summary := fmt.Sprintf(
				"admin=%s api=%s public_api=%s modules=%d fallbacks=%d conflicts=%d",
				roots["admin"],
				roots["api"],
				roots["public_api"],
				len(report.Modules),
				len(report.Fallbacks),
				len(report.Conflicts),
			)

			return admin.DoctorCheckOutput{
				Summary:  summary,
				Findings: findings,
				Metadata: map[string]any{
					"roots":       roots,
					"summary":     routingDoctorSummaryMetadata(report.RouteSummary),
					"modules":     routingDoctorModuleMetadata(report.Modules),
					"fallbacks":   routingDoctorFallbackMetadata(report.Fallbacks),
					"conflicts":   routingDoctorConflictMetadata(report.Conflicts),
					"warnings":    append([]string{}, report.Warnings...),
					"report_text": routing.FormatStartupReport(report),
				},
			}
		},
	}
}

func quickstartDoctorTranslationCheck() admin.DoctorCheck {
	return admin.DoctorCheck{
		ID:          "quickstart.translation",
		Label:       "Translation Capabilities",
		Description: "Validates translation capability snapshot coherence.",
		Help:        "Compares translation capability modules with registered routes and startup warnings to detect partial translation product wiring.",
		Action: admin.NewManualDoctorAction(
			"Enable/disable translation modules consistently and ensure UI/API routes are registered for active modules.",
			"Review translation wiring",
		),
		Run: quickstartDoctorTranslationRun,
	}
}

func quickstartDoctorTranslationRun(_ context.Context, adm *admin.Admin) admin.DoctorCheckOutput {
	if adm == nil {
		return admin.DoctorCheckOutput{}
	}
	caps := TranslationCapabilities(adm)
	if len(caps) == 0 {
		return quickstartDoctorMissingTranslationCapabilities()
	}
	modules, ok := caps["modules"].(map[string]any)
	if !ok {
		modules = map[string]any{}
	}
	routes := translationRoutesToStrings(caps["routes"])
	warnings := translationStringSlice(caps["warnings"])
	findings := translationDoctorFindings(adm, modules, routes, warnings)
	return admin.DoctorCheckOutput{
		Findings: findings,
		Metadata: map[string]any{
			"profile":        strings.TrimSpace(fmt.Sprint(caps["profile"])),
			"schema_version": strings.TrimSpace(fmt.Sprint(caps["schema_version"])),
			"warnings_count": len(warnings),
			"routes_count":   len(routes),
		},
	}
}

func quickstartDoctorMissingTranslationCapabilities() admin.DoctorCheckOutput {
	return admin.DoctorCheckOutput{
		Findings: []admin.DoctorFinding{
			{
				Severity:  admin.DoctorSeverityWarn,
				Code:      "quickstart.translation.capabilities_missing",
				Component: "translation",
				Message:   "Translation capabilities snapshot is empty",
				Hint:      "Register translation capabilities during quickstart bootstrap",
			},
		},
	}
}

func translationDoctorFindings(adm *admin.Admin, modules map[string]any, routes map[string]string, warnings []string) []admin.DoctorFinding {
	findings := []admin.DoctorFinding{}
	findings = append(findings, translationDoctorExchangeFindings(modules, routes)...)
	findings = append(findings, translationDoctorQueueFindings(adm, modules, routes)...)
	for _, warning := range warnings {
		if warning = strings.TrimSpace(warning); warning != "" {
			findings = append(findings, admin.DoctorFinding{
				Severity:  admin.DoctorSeverityInfo,
				Code:      "quickstart.translation.warning",
				Component: "translation",
				Message:   warning,
			})
		}
	}
	return findings
}

func translationDoctorExchangeFindings(modules map[string]any, routes map[string]string) []admin.DoctorFinding {
	if !translationModuleEnabled(modules, "exchange") || strings.TrimSpace(routes["admin.translations.exchange"]) != "" {
		return nil
	}
	return []admin.DoctorFinding{{
		Severity:  admin.DoctorSeverityWarn,
		Code:      "quickstart.translation.exchange_route_missing",
		Component: "translation.exchange",
		Message:   "Exchange module is enabled but exchange UI route is missing",
		Hint:      "Register translation exchange routing or disable exchange module",
	}}
}

func translationDoctorQueueFindings(adm *admin.Admin, modules map[string]any, routes map[string]string) []admin.DoctorFinding {
	if !translationModuleEnabled(modules, "queue") {
		return nil
	}
	apiGroup := strings.TrimSpace(adm.AdminAPIGroup())
	if apiGroup == "" {
		apiGroup = "admin.api"
	}
	findings := []admin.DoctorFinding{}
	if strings.TrimSpace(routes["admin.translations.dashboard"]) == "" {
		findings = append(findings, admin.DoctorFinding{
			Severity:  admin.DoctorSeverityWarn,
			Code:      "quickstart.translation.queue_dashboard_missing",
			Component: "translation.queue",
			Message:   "Queue module is enabled but dashboard route is missing",
			Hint:      "Register translation queue dashboard routing",
		})
	}
	myWorkKey := fmt.Sprintf("%s.%s", apiGroup, "translations.my_work")
	if strings.TrimSpace(routes[myWorkKey]) == "" {
		findings = append(findings, admin.DoctorFinding{
			Severity:  admin.DoctorSeverityWarn,
			Code:      "quickstart.translation.queue_api_missing",
			Component: "translation.queue",
			Message:   "Queue module is enabled but my_work API route is missing",
			Hint:      "Register translation queue API routes and bindings",
		})
	}
	return findings
}

func quickstartDoctorBlockDefinitionsCheck() admin.DoctorCheck {
	return admin.DoctorCheck{
		ID:          "quickstart.blocks.seeded_defaults",
		Label:       "Block Library Seed Definitions",
		Description: "Validates required seeded block definitions and Block Library visibility consistency in the default content channel.",
		Help:        "Checks that canonical example block definitions (hero and rich_text) exist in the default content channel and verifies that list-path visibility matches raw content diagnostics for that same channel.",
		Action: admin.NewManualDoctorAction(
			"Seed block definitions in the default content channel and verify the Block Library channel selector is set to default.",
			"Seed default block definitions",
		),
		Run: quickstartDoctorBlockDefinitionsRun,
	}
}

func quickstartDoctorBlockDefinitionsRun(_ context.Context, adm *admin.Admin) admin.DoctorCheckOutput {
	if adm == nil {
		return admin.DoctorCheckOutput{}
	}
	content := adm.ContentService()
	if content == nil {
		return quickstartDoctorMissingContentService()
	}
	effectiveEnv := defaultChannelKey
	defs, err := content.BlockDefinitions(admin.WithContentChannel(context.Background(), effectiveEnv))
	if err != nil {
		return quickstartDoctorBlockDefinitionsFetchFailed(effectiveEnv, err)
	}
	required := []string{"hero", "rich_text"}
	availableList, missing := blockDefinitionAvailability(defs, required)
	findings := []admin.DoctorFinding{}
	metadata := map[string]any{
		"effective_channel": effectiveEnv,
		"required":          required,
		"available_count":   len(availableList),
		"available_types":   availableList,
		"service_total":     len(defs),
	}
	visibility := quickstartDoctorBlockVisibility(adm, content, effectiveEnv)
	applyBlockVisibilityMetadata(metadata, visibility)
	findings = append(findings, blockVisibilityFindings(effectiveEnv, len(defs), visibility)...)
	findings = append(findings, missingBlockDefinitionFindings(missing)...)
	if len(findings) == 0 {
		return admin.DoctorCheckOutput{
			Summary:  "Required default block definitions are present and list visibility is consistent",
			Metadata: metadata,
		}
	}
	return admin.DoctorCheckOutput{Findings: findings, Metadata: metadata}
}

func quickstartDoctorMissingContentService() admin.DoctorCheckOutput {
	return admin.DoctorCheckOutput{
		Findings: []admin.DoctorFinding{
			{
				Severity:  admin.DoctorSeverityWarn,
				Code:      "quickstart.blocks.content_service_missing",
				Component: "cms",
				Message:   "Content service is unavailable; block diagnostics skipped",
				Hint:      "Configure CMS content service before running block seed diagnostics",
			},
		},
	}
}

func quickstartDoctorBlockDefinitionsFetchFailed(effectiveEnv string, err error) admin.DoctorCheckOutput {
	return admin.DoctorCheckOutput{
		Findings: []admin.DoctorFinding{
			{
				Severity:  admin.DoctorSeverityError,
				Code:      "quickstart.blocks.fetch_failed",
				Component: "cms.blocks",
				Message:   "Failed to load block definitions for diagnostics",
				Hint:      "Verify CMS persistence wiring and block definition repository health",
				Metadata: map[string]any{
					"error": err.Error(),
				},
			},
		},
		Metadata: map[string]any{
			"effective_channel": effectiveEnv,
		},
	}
}

func blockDefinitionAvailability(defs []admin.CMSBlockDefinition, required []string) ([]string, []string) {
	requiredSet := map[string]bool{}
	for _, key := range required {
		requiredSet[key] = true
	}
	present := map[string]bool{}
	available := map[string]struct{}{}
	for _, def := range defs {
		for _, candidate := range blockDefinitionAliasKeys(def.ID, def.Slug, def.Type) {
			if candidate == "" {
				continue
			}
			available[candidate] = struct{}{}
			if requiredSet[candidate] {
				present[candidate] = true
			}
		}
	}
	missing := []string{}
	for _, key := range required {
		if !present[key] {
			missing = append(missing, key)
		}
	}
	availableList := make([]string, 0, len(available))
	for key := range available {
		availableList = append(availableList, key)
	}
	sort.Strings(availableList)
	return availableList, missing
}

type blockVisibilityDiagnostic struct {
	total        int
	source       string
	panelListErr error
	err          error
}

func quickstartDoctorBlockVisibility(adm *admin.Admin, content admin.CMSContentService, effectiveEnv string) blockVisibilityDiagnostic {
	diagnostic := blockVisibilityDiagnostic{total: -1}
	listCtx := admin.WithContentChannel(context.Background(), effectiveEnv)
	if total, err, ok := blockVisibilityFromPanel(adm, listCtx, effectiveEnv); ok {
		diagnostic.total = total
		diagnostic.source = "panel"
		return diagnostic
	} else if err != nil {
		diagnostic.panelListErr = err
	}
	total, err := blockVisibilityFromRepository(adm, content, listCtx, effectiveEnv)
	if err != nil {
		diagnostic.err = err
		return diagnostic
	}
	diagnostic.total = total
	diagnostic.source = "repository_fallback"
	return diagnostic
}

func blockVisibilityFromPanel(adm *admin.Admin, listCtx context.Context, effectiveEnv string) (int, error, bool) {
	registry := adm.Registry()
	if registry == nil {
		return -1, nil, false
	}
	panel, ok := registry.Panel("block_definitions")
	if !ok || panel == nil {
		return -1, nil, false
	}
	adminCtx := admin.AdminContext{
		Context:     listCtx,
		Environment: effectiveEnv,
		Locale:      strings.TrimSpace(adm.DefaultLocale()),
	}
	_, total, err := panel.List(adminCtx, admin.ListOptions{
		Page:    1,
		PerPage: 1,
		Filters: map[string]any{admin.ContentChannelScopeQueryParam: effectiveEnv},
	})
	return total, err, err == nil
}

func blockVisibilityFromRepository(adm *admin.Admin, content admin.CMSContentService, listCtx context.Context, effectiveEnv string) (int, error) {
	repo := admin.NewCMSBlockDefinitionRepository(content, adm.ContentTypeService())
	_, total, err := repo.List(listCtx, admin.ListOptions{
		Page:    1,
		PerPage: 1,
		Filters: map[string]any{admin.ContentChannelScopeQueryParam: effectiveEnv},
	})
	return total, err
}

func applyBlockVisibilityMetadata(metadata map[string]any, visibility blockVisibilityDiagnostic) {
	if visibility.panelListErr != nil {
		metadata["panel_list_error"] = visibility.panelListErr.Error()
	}
	if visibility.total >= 0 {
		metadata["visible_total"] = visibility.total
	}
	if visibility.source != "" {
		metadata["visibility_source"] = visibility.source
	}
}

func blockVisibilityFindings(effectiveEnv string, serviceTotal int, visibility blockVisibilityDiagnostic) []admin.DoctorFinding {
	if visibility.err != nil {
		visibilityErr := visibility.err
		if visibility.panelListErr != nil && !errors.Is(visibility.panelListErr, admin.ErrForbidden) {
			visibilityErr = fmt.Errorf("panel list failed: %w; repository fallback failed: %w", visibility.panelListErr, visibility.err)
		}
		return []admin.DoctorFinding{{
			Severity:  admin.DoctorSeverityWarn,
			Code:      "quickstart.blocks.visibility_check_unavailable",
			Component: "cms.blocks",
			Message:   "Could not run Block Library visibility consistency check",
			Hint:      "Ensure block_definitions panel and CMS repositories are healthy before relying on Block Library diagnostics",
			Metadata: map[string]any{
				"error": visibilityErr.Error(),
			},
		}}
	}
	if visibility.total < 0 || visibility.total == serviceTotal {
		return nil
	}
	return []admin.DoctorFinding{{
		Severity:  admin.DoctorSeverityError,
		Code:      "quickstart.blocks.visibility_mismatch",
		Component: "cms.blocks",
		Message:   fmt.Sprintf("Block Library visibility mismatch in %q channel: service=%d, visible=%d", effectiveEnv, serviceTotal, visibility.total),
		Hint:      "Align channel canonicalization between diagnostics and list-path filtering (blank vs default handling)",
		Metadata: map[string]any{
			"effective_channel": effectiveEnv,
			"service_total":     serviceTotal,
			"visible_total":     visibility.total,
			"visibility_source": visibility.source,
		},
	}}
}

func missingBlockDefinitionFindings(missing []string) []admin.DoctorFinding {
	if len(missing) == 0 {
		return nil
	}
	return []admin.DoctorFinding{{
		Severity:  admin.DoctorSeverityError,
		Code:      "quickstart.blocks.seed_missing",
		Component: "cms.blocks",
		Message:   fmt.Sprintf("Missing required default block definitions: %s", strings.Join(missing, ", ")),
		Hint:      "Seed missing block definitions into the default content channel or switch the Block Library back to default",
		Metadata: map[string]any{
			"missing": missing,
		},
	}}
}

func routingDoctorSummaryMetadata(summary routing.RouteSummary) map[string]any {
	return map[string]any{
		"total_routes":    summary.TotalRoutes,
		"host_routes":     summary.HostRoutes,
		"module_routes":   summary.ModuleRoutes,
		"fallback_routes": summary.FallbackRoutes,
		"modules":         append([]string{}, summary.Modules...),
	}
}

func routingDoctorModuleMetadata(modules []routing.ResolvedModule) []map[string]string {
	if len(modules) == 0 {
		return nil
	}
	entries := make([]map[string]string, 0, len(modules))
	for _, module := range modules {
		entries = append(entries, map[string]string{
			"slug":             strings.TrimSpace(module.Slug),
			"ui":               strings.TrimSpace(module.UIMountBase),
			"api":              strings.TrimSpace(module.APIMountBase),
			"public_api":       strings.TrimSpace(module.PublicAPIMountBase),
			"ui_group":         strings.TrimSpace(module.UIGroupPath),
			"api_group":        strings.TrimSpace(module.APIGroupPath),
			"public_api_group": strings.TrimSpace(module.PublicAPIGroupPath),
		})
	}
	return entries
}

func routingDoctorConflictMetadata(conflicts []routing.Conflict) []map[string]any {
	if len(conflicts) == 0 {
		return nil
	}
	entries := make([]map[string]any, 0, len(conflicts))
	for _, conflict := range conflicts {
		entries = append(entries, map[string]any{
			"kind":       strings.TrimSpace(conflict.Kind),
			"module":     strings.TrimSpace(conflict.Module),
			"method":     strings.TrimSpace(conflict.Method),
			"path":       strings.TrimSpace(conflict.Path),
			"route_name": strings.TrimSpace(conflict.RouteName),
			"message":    strings.TrimSpace(conflict.Message),
		})
	}
	return entries
}

func routingDoctorFallbackMetadata(fallbacks []routing.FallbackEntry) []map[string]any {
	if len(fallbacks) == 0 {
		return nil
	}
	entries := make([]map[string]any, 0, len(fallbacks))
	for _, fallback := range fallbacks {
		fallback = routing.NormalizeFallbackEntry(fallback)
		entries = append(entries, map[string]any{
			"owner":                 strings.TrimSpace(fallback.Owner),
			"surface":               strings.TrimSpace(fallback.Surface),
			"domain":                strings.TrimSpace(fallback.Domain),
			"base_path":             strings.TrimSpace(fallback.BasePath),
			"mode":                  strings.TrimSpace(fallback.Mode),
			"allow_root":            fallback.AllowRoot,
			"allowed_methods":       append([]string{}, fallback.AllowedMethods...),
			"allowed_exact_paths":   append([]string{}, fallback.AllowedExactPaths...),
			"allowed_path_prefixes": append([]string{}, fallback.AllowedPathPrefixes...),
			"reserved_prefixes":     append([]string{}, fallback.ReservedPrefixes...),
		})
	}
	return entries
}

func blockDefinitionAliasKeys(values ...string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values)*3)
	for _, raw := range values {
		base := strings.ToLower(strings.TrimSpace(raw))
		if base == "" {
			continue
		}
		candidates := []string{
			base,
			strings.ReplaceAll(base, "-", "_"),
			strings.ReplaceAll(base, "_", "-"),
		}
		for _, candidate := range candidates {
			if candidate == "" {
				continue
			}
			if _, ok := seen[candidate]; ok {
				continue
			}
			seen[candidate] = struct{}{}
			out = append(out, candidate)
		}
	}
	return out
}
