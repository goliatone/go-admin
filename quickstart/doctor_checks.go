package quickstart

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func registerQuickstartDoctorChecks(adm *admin.Admin, cfg admin.Config, result AdapterResult, options adminOptions) {
	if adm == nil {
		return
	}
	checks := defaultQuickstartDoctorChecks(cfg, result)
	if len(options.doctorChecks) > 0 {
		checks = append(checks, options.doctorChecks...)
	}
	adm.RegisterDoctorChecks(checks...)
}

func defaultQuickstartDoctorChecks(cfg admin.Config, result AdapterResult) []admin.DoctorCheck {
	return []admin.DoctorCheck{
		quickstartDoctorAdaptersCheck(result),
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
		Run: func(_ context.Context, adm *admin.Admin) admin.DoctorCheckOutput {
			if adm == nil {
				return admin.DoctorCheckOutput{}
			}
			caps := TranslationCapabilities(adm)
			if len(caps) == 0 {
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

			modules, _ := caps["modules"].(map[string]any)
			routes := translationRoutesToStrings(caps["routes"])
			warnings := translationStringSlice(caps["warnings"])
			profile := strings.TrimSpace(fmt.Sprint(caps["profile"]))
			schemaVersion := strings.TrimSpace(fmt.Sprint(caps["schema_version"]))
			apiGroup := strings.TrimSpace(adm.AdminAPIGroup())
			if apiGroup == "" {
				apiGroup = "admin.api"
			}

			findings := []admin.DoctorFinding{}
			if translationModuleEnabled(modules, "exchange") {
				if strings.TrimSpace(routes["admin.translations.exchange"]) == "" {
					findings = append(findings, admin.DoctorFinding{
						Severity:  admin.DoctorSeverityWarn,
						Code:      "quickstart.translation.exchange_route_missing",
						Component: "translation.exchange",
						Message:   "Exchange module is enabled but exchange UI route is missing",
						Hint:      "Register translation exchange routing or disable exchange module",
					})
				}
			}
			if translationModuleEnabled(modules, "queue") {
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
			}
			for _, warning := range warnings {
				warning = strings.TrimSpace(warning)
				if warning == "" {
					continue
				}
				findings = append(findings, admin.DoctorFinding{
					Severity:  admin.DoctorSeverityInfo,
					Code:      "quickstart.translation.warning",
					Component: "translation",
					Message:   warning,
				})
			}

			return admin.DoctorCheckOutput{
				Findings: findings,
				Metadata: map[string]any{
					"profile":        profile,
					"schema_version": schemaVersion,
					"warnings_count": len(warnings),
					"routes_count":   len(routes),
				},
			}
		},
	}
}

func quickstartDoctorBlockDefinitionsCheck() admin.DoctorCheck {
	return admin.DoctorCheck{
		ID:          "quickstart.blocks.seeded_defaults",
		Label:       "Block Library Seed Definitions",
		Description: "Validates required seeded block definitions in the default environment.",
		Help:        "Checks that canonical example block definitions (hero and rich_text) exist in the default environment. Missing entries usually indicate environment mismatch or incomplete seeding.",
		Action: admin.NewManualDoctorAction(
			"Seed block definitions in the default environment and verify the Block Library environment selector is set to default.",
			"Seed default block definitions",
		),
		Run: func(_ context.Context, adm *admin.Admin) admin.DoctorCheckOutput {
			if adm == nil {
				return admin.DoctorCheckOutput{}
			}
			content := adm.ContentService()
			if content == nil {
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

			required := []string{"hero", "rich_text"}
			requiredSet := map[string]bool{}
			for _, key := range required {
				requiredSet[key] = true
			}

			effectiveEnv := defaultEnvironmentKey
			defs, err := content.BlockDefinitions(admin.WithEnvironment(context.Background(), effectiveEnv))
			if err != nil {
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
						"effective_environment": effectiveEnv,
					},
				}
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
			metadata := map[string]any{
				"effective_environment": effectiveEnv,
				"required":              required,
				"available_count":       len(availableList),
				"available_types":       availableList,
			}

			if len(missing) == 0 {
				return admin.DoctorCheckOutput{
					Summary:  "Required default block definitions are present",
					Metadata: metadata,
				}
			}

			return admin.DoctorCheckOutput{
				Findings: []admin.DoctorFinding{
					{
						Severity:  admin.DoctorSeverityError,
						Code:      "quickstart.blocks.seed_missing",
						Component: "cms.blocks",
						Message:   fmt.Sprintf("Missing required default block definitions: %s", strings.Join(missing, ", ")),
						Hint:      "Seed missing block definitions into the default environment or switch the Block Library back to default",
						Metadata: map[string]any{
							"missing": missing,
						},
					},
				},
				Metadata: metadata,
			}
		},
	}
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
