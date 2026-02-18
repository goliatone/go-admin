# Quickstart Defaults

The quickstart package (module `github.com/goliatone/go-admin/quickstart`) bundles opt-in defaults for go-admin so hosts can get a working admin with minimal wiring while keeping override hooks.

## Bootstrap helpers
Each helper is optional and composable.

- `NewAdminConfig(basePath, title, defaultLocale string, opts ...AdminConfigOption) admin.Config` - Inputs: base path/title/locale plus option setters. Outputs: `admin.Config` with quickstart defaults and overrides applied.
- `DefaultMinimalFeatures() map[string]bool` - Outputs: minimal Stage 1 feature set (`dashboard` + `cms`).
- `WithDebugConfig(cfg admin.DebugConfig) AdminConfigOption` - Inputs: debug config; outputs: option that applies debug config (used to derive debug gate defaults).
- `WithDebugFromEnv(opts ...DebugEnvOption) AdminConfigOption` - Inputs: env mapping overrides; outputs: option that applies ADMIN_DEBUG* config/envs to debug config.
- `WithErrorConfig(cfg admin.ErrorConfig) AdminConfigOption` - Inputs: error config; outputs: option that applies error presentation defaults.
- `WithErrorsFromEnv(opts ...ErrorEnvOption) AdminConfigOption` - Inputs: env mapping overrides; outputs: option that applies ADMIN_ERROR* config/envs to error config.
- `WithScopeConfig(scope ScopeConfig) AdminConfigOption` - Inputs: scope config; outputs: option that applies single/multi-tenant defaults.
- `WithScopeMode(mode ScopeMode) AdminConfigOption` - Inputs: scope mode (`single` or `multi`); outputs: option that sets the mode.
- `WithDefaultScope(tenantID, orgID string) AdminConfigOption` - Inputs: default tenant/org IDs; outputs: option that sets defaults for single-tenant mode.
- `WithScopeFromEnv() AdminConfigOption` - Inputs: none; outputs: option that reads `ADMIN_SCOPE_*` env vars.
- `NewAdmin(cfg admin.Config, hooks AdapterHooks, opts ...AdminOption) (*admin.Admin, AdapterResult, error)` - Inputs: config, adapter hooks, optional context/dependencies. Outputs: admin instance, adapter result summary, error.
- `WithAdapterFlags(flags AdapterFlags) AdminOption` - Inputs: adapter flags; outputs: option that bypasses env resolution.
- `WithFeatureDefaults(defaults map[string]bool) AdminOption` - Inputs: feature default map; outputs: option that extends gate defaults used by `NewAdmin`.
- `WithStartupPolicy(policy StartupPolicy) AdminOption` - Inputs: startup policy (`enforce` or `warn`); outputs: option controlling module startup validation handling.
- `WithTranslationProfile(profile TranslationProfile) AdminOption` - Inputs: profile (`none`, `core`, `core+exchange`, `core+queue`, `full`); outputs: option that applies productized translation defaults.
- `WithTranslationProductConfig(cfg TranslationProductConfig) AdminOption` - Inputs: product config (`SchemaVersion`, `Profile`, optional module overrides); outputs: option that resolves effective translation module wiring with deterministic precedence.
- `TranslationCapabilities(adm *admin.Admin) map[string]any` - Inputs: admin instance; outputs: resolved translation capability metadata (`profile`, `schema_version`, module enablement, feature flags, routes, resolver keys, panels, warnings).
- `WithTranslationExchangeConfig(cfg TranslationExchangeConfig) AdminOption` - Inputs: exchange config (disabled by default); outputs: option that enables exchange feature + command wiring when configured.
- `WithTranslationQueueConfig(cfg TranslationQueueConfig) AdminOption` - Inputs: queue config (disabled by default); outputs: option that enables queue feature + panel/command wiring when configured.
- `EnablePreferences() AdminOption` - Inputs: none; outputs: option to enable `FeaturePreferences`.
- `EnableFeature(feature admin.FeatureKey) AdminOption` - Inputs: feature key; outputs: option to enable a single feature gate key.
- `RegisterTranslationExchangeWiring(adm *admin.Admin, cfg TranslationExchangeConfig) error` - Inputs: admin + exchange config; outputs: error (registers exchange commands and optional permission entries).
- `RegisterTranslationQueueWiring(adm *admin.Admin, cfg TranslationQueueConfig, policyCfg TranslationPolicyConfig, hasPolicyCfg bool) error` - Inputs: admin + queue config + policy context; outputs: error (registers queue panel, tabs, commands, and optional permission entries).
- `WithGoUsersPreferencesRepository(repo types.PreferenceRepository) AdminOption` - Inputs: go-users preferences repo; outputs: option that wires a PreferencesStore via the adapter when one is not already set.
- `WithGoUsersPreferencesRepositoryFactory(factory func() (types.PreferenceRepository, error)) AdminOption` - Inputs: repo builder; outputs: option to lazily construct a preferences repo (used when dependencies do not already supply a PreferencesStore).
- `WithGoUsersUserManagement(cfg GoUsersUserManagementConfig) AdminOption` - Inputs: go-users auth/inventory/role repositories (plus optional profile repo and scope resolver); outputs: option that wires user/role/profile dependencies.
- `WithLegacyUserRoleBulkRoutes() AdminOption` - Inputs: none; outputs: option that enables deprecated static user bulk role routes (`/users/bulk/assign-role`, `/users/bulk/unassign-role`) for compatibility.
- `NewUsersModule(opts ...admin.UserManagementModuleOption) *admin.UserManagementModule` - Inputs: user module options; outputs: configured built-in users module.
- `NewExportBundle(opts ...ExportBundleOption) *ExportBundle` - Inputs: go-export options (store/guard/actor/base path overrides). Outputs: runner/service plus go-admin registry/registrar/metadata adapters.
- `PreferencesPermissions() []PermissionDefinition` - Outputs: default preferences permission definitions.
- `RegisterPreferencesPermissions(register PermissionRegisterFunc) error` - Inputs: register func; outputs: error (registers default preferences permissions).
- `TranslationExchangePermissions() []PermissionDefinition` - Outputs: default translation exchange permission definitions.
- `RegisterTranslationExchangePermissions(register PermissionRegisterFunc) error` - Inputs: register func; outputs: error (registers translation exchange permissions).
- `TranslationQueuePermissions() []PermissionDefinition` - Outputs: default translation queue permission definitions.
- `RegisterTranslationQueuePermissions(register PermissionRegisterFunc) error` - Inputs: register func; outputs: error (registers translation queue permissions).
- `NewPreferencesModule(cfg admin.Config, menuParent string, opts ...PreferencesModuleOption) admin.Module` - Inputs: admin config, optional menu parent, preferences module options. Outputs: configured Preferences module.
- `WithPreferencesSchemaPath(path string) PreferencesModuleOption` - Inputs: schema path (file or directory); outputs: option that overrides the Preferences form schema.
- `WithPreferencesJSONEditorStrict(strict bool) PreferencesModuleOption` - Inputs: strict toggle; outputs: option that enforces client-side JSON validation for `raw_ui`.
- `NewFiberErrorHandler(adm *admin.Admin, cfg admin.Config, isDev bool, opts ...FiberErrorHandlerOption) fiber.ErrorHandler` - Inputs: admin, config, dev flag + options. Outputs: Fiber error handler.
- `WithFiberErrorMappers(mappers ...goerrors.ErrorMapper) FiberErrorHandlerOption` - Inputs: extra mappers; outputs: error handler option (appended to defaults).
- `NewViewEngine(baseFS fs.FS, opts ...ViewEngineOption) (fiber.Views, error)` - Inputs: base FS and view options. Outputs: Fiber views engine and error.
- `DefaultTemplateFuncs(opts ...TemplateFuncOption) map[string]any` - Outputs: default template helpers (JSON, dict, singularize/pluralize, adminURL, widget titles, etc.).
- `MergeTemplateFuncs(overrides map[string]any, opts ...TemplateFuncOption) map[string]any` - Inputs: overrides + optional template options. Outputs: merged map for `WithViewTemplateFuncs`.
- `WithTemplateURLResolver(urls urlkit.Resolver) TemplateFuncOption` - Inputs: URLKit resolver; outputs: option that configures `adminURL` to resolve via URLKit.
- `WithViewURLResolver(urls urlkit.Resolver) ViewEngineOption` - Inputs: URLKit resolver; outputs: option that configures `adminURL` to resolve via URLKit.
- `WithThemeContext(ctx router.ViewContext, adm *admin.Admin, req router.Context) router.ViewContext` - Inputs: view context, admin, request. Outputs: context enriched with theme tokens/selection.
- `WithNav(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext` - Inputs: base view context + admin/config/request state. Outputs: context enriched with feature flags (`activity_enabled`, `activity_feature_enabled`, `translation_capabilities`, `body_classes`), session user payload, nav items, theme payload, and path helpers.
- `WithNavPlacements(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, placements PlacementConfig, placement string, active string, reqCtx context.Context) router.ViewContext` - Inputs: same as `WithNav`, plus placement mapping. Outputs: placement-aware nav context for non-sidebar menus while preserving the same feature/session/theme enrichment.
- `BuildPanelExportConfig(cfg admin.Config, opts PanelViewCapabilityOptions) map[string]any` - Inputs: admin config and panel capability options. Outputs: normalized `export_config` payload (`endpoint`, `definition`, optional `variant`).
- `BuildPanelDataGridConfig(opts PanelDataGridConfigOptions) map[string]any` - Inputs: datagrid options. Outputs: normalized `datagrid_config` payload (`table_id`, `api_endpoint`, `action_base`, optional `preferences_endpoint`, `column_storage_key`, optional `state_store` and `url_state`).
- `BuildPanelViewCapabilities(cfg admin.Config, opts PanelViewCapabilityOptions) router.ViewContext` - Inputs: admin config and panel capability options. Outputs: template capability context including `export_config` and `datagrid_config`.
- `PathViewContext(cfg admin.Config, pathCfg PathViewContextConfig) router.ViewContext` - Inputs: config + path resolver hints. Outputs: normalized `base_path`, `api_base_path`, `asset_base_path`, `preferences_api_path`.
- `WithPathViewContext(ctx router.ViewContext, cfg admin.Config, pathCfg PathViewContextConfig) router.ViewContext` - Inputs: existing context + path resolver hints. Outputs: merged context with canonical path keys.
- `WithThemeSelector(selector theme.ThemeSelector, manifest *theme.Manifest) AdminOption` - Inputs: go-theme selector + manifest; outputs: option that wires theme selection + manifest into `NewAdmin` (including Preferences variant options).
- `NewFiberServer(viewEngine fiber.Views, cfg admin.Config, adm *admin.Admin, isDev bool, opts ...FiberServerOption) (router.Server[*fiber.App], router.Router[*fiber.App])` - Inputs: views, config, admin, dev flag, server options. Outputs: go-router server adapter and router.
- `NewThemeSelector(name, variant string, tokenOverrides map[string]string, opts ...ThemeOption) (theme.Selector, *theme.Manifest, error)` - Inputs: theme name/variant, token overrides, theme options. Outputs: selector, manifest, error.
- `NewStaticAssets(r router.Router[T], cfg admin.Config, assetsFS fs.FS, opts ...StaticAssetsOption)` - Inputs: router, config, host assets FS, asset options. Outputs: none (registers static routes).
- `ResolveDiskAssetsDir(marker string, candidates ...string) string` - Inputs: marker file + candidate directories. Outputs: first matching directory.
- `RegisterAdminUIRoutes(r router.Router[T], cfg admin.Config, adm *admin.Admin, auth admin.HandlerAuthenticator, opts ...UIRouteOption) error` - Inputs: router/config/admin/auth wrapper + options. Outputs: error (registers dashboard + notifications UI routes, and injects feature-aware view context such as `activity_enabled` + `body_classes`).
- `WithContentEntryDataGridStateStore(cfg PanelDataGridStateStoreOptions) ContentEntryUIOption` - Inputs: DataGrid state-store config for content-entry list templates. Outputs: content-entry route option (default mode remains localStorage when unset).
- `WithContentEntryDataGridURLState(cfg PanelDataGridURLStateOptions) ContentEntryUIOption` - Inputs: URL sync limits/token config for content-entry list templates. Outputs: content-entry route option.
- `RegisterAuthUIRoutes(r router.Router[T], cfg admin.Config, auther *auth.Auther, cookieName string, opts ...AuthUIOption) error` - Inputs: router/config/go-auth auther/cookie name + options. Outputs: error (registers login/logout/reset UI routes).
- `RegisterRegistrationUIRoutes(r router.Router[T], cfg admin.Config, opts ...RegistrationUIOption) error` - Inputs: router/config + options. Outputs: error (registers signup UI route).
- `AuthUIViewContext(cfg admin.Config, state AuthUIState, paths AuthUIPaths) router.ViewContext` - Inputs: config/state/paths; outputs: view context with auth flags + paths (`base_path`, `api_base_path`, `asset_base_path`, `preferences_api_path`).
- `AttachDebugMiddleware(r router.Router[T], cfg admin.Config, adm *admin.Admin)` - Inputs: router/config/admin; outputs: none (registers debug request capture middleware).
- `AttachDebugLogHandler(cfg admin.Config, adm *admin.Admin)` - Inputs: config/admin; outputs: none (wires slog debug handler).
- `ConfigureExportRenderers(bundle *ExportBundle, templatesFS fs.FS, opts ...ExportTemplateOption) error` - Inputs: export bundle + templates FS + options. Outputs: error (registers template/PDF renderers).
- `NewModuleRegistrar(adm *admin.Admin, cfg admin.Config, modules []admin.Module, isDev bool, opts ...ModuleRegistrarOption) error` - Inputs: admin, config, module list, dev flag, options. Outputs: error.
- `WithModuleFeatureGates(gates gate.FeatureGate) ModuleRegistrarOption` - Inputs: feature gate; outputs: option to filter modules/menu items.
- `WithModuleFeatureDisabledHandler(handler func(feature, moduleID string) error) ModuleRegistrarOption` - Inputs: handler; outputs: option for disabled modules.
- `WithTranslationCapabilityMenuMode(mode TranslationCapabilityMenuMode) ModuleRegistrarOption` - Inputs: translation menu seeding mode (`tools` default, `none` opt-out); outputs: option controlling whether translation dashboard/queue/exchange links are added to server-seeded navigation.
- `DefaultContentParentPermissions() []string` - Outputs: canonical permission set used by the default sidebar `Content` parent (`media`, `content_types`, `block_definitions`).
- `WithGoAuth(adm *admin.Admin, routeAuth *auth.RouteAuthenticator, cfg auth.Config, authz admin.GoAuthAuthorizerConfig, authCfg *admin.AuthConfig, opts ...admin.GoAuthAuthenticatorOption) (*admin.GoAuthAuthenticator, *admin.GoAuthAuthorizer)` - Inputs: admin, route auth, auth config, authz config, admin auth config, options. Outputs: adapters.
- `WithDefaultDashboardRenderer(adm *admin.Admin, viewEngine fiber.Views, cfg admin.Config, opts ...DashboardRendererOption) error` - Inputs: admin, view engine, config, renderer options. Outputs: error.
- `WithDashboardTemplatesFS(fsys fs.FS) DashboardRendererOption` - Inputs: template FS; outputs: renderer option for overrides.
- `WithDashboardEmbeddedTemplates(enabled bool) DashboardRendererOption` - Inputs: boolean; outputs: renderer option to enable/disable embedded templates.
- `NewCompositeActivitySink(primary admin.ActivitySink, hooks dashboardactivity.Hooks, cfg dashboardactivity.Config) admin.ActivitySink` - Inputs: primary sink, dashboard hooks/config. Outputs: activity sink bridge.
- `NewGoAuthActivitySink(sink admin.ActivitySink, opts ...GoAuthActivitySinkOption) auth.ActivitySink` - Inputs: admin sink + options. Outputs: go-auth activity adapter.
- `NewSharedActivitySinks(primary admin.ActivitySink, hooks dashboardactivity.Hooks, cfg dashboardactivity.Config, opts ...GoAuthActivitySinkOption) SharedActivitySinks` - Inputs: primary sink + dashboard hooks/config. Outputs: shared admin/go-auth sinks.
- `NewFormGenerator(openapiFS fs.FS, templatesFS fs.FS, opts ...FormGeneratorOption) (*formgenorchestrator.Orchestrator, error)` - Inputs: OpenAPI FS, templates FS, optional configuration. Outputs: form generator orchestrator and error.
- `WithComponentRegistry(reg *components.Registry) FormGeneratorOption` - Inputs: custom registry; outputs: option that replaces default components (clean replace).
- `WithComponentRegistryMergeDefaults(reg *components.Registry) FormGeneratorOption` - Inputs: custom registry; outputs: option that merges into defaults, overriding matching names.
- `WithVanillaOption(opt formgenvanilla.Option) FormGeneratorOption` - Inputs: vanilla renderer option; outputs: option applied last so it can override templates/styles/registry.

- `SecureLinkConfigFromEnv(basePath string) SecureLinkConfig` - Inputs: base path; outputs: securelink config (env-driven).
- `DefaultSecureLinkRoutes(basePath string) map[string]string` - Inputs: base path; outputs: securelink routes map.
- `NewSecureLinkManager(cfg SecureLinkConfig) (types.SecureLinkManager, error)` - Inputs: securelink config; outputs: go-users securelink manager.
- `NewNotificationsSecureLinkManager(cfg SecureLinkConfig) (links.SecureLinkManager, error)` - Inputs: securelink config; outputs: go-notifications securelink manager (delegates to `go-notifications/adapters/securelink.NewManager`).
- `ApplySecureLinkManager(cfg *userssvc.Config, manager types.SecureLinkManager, opts ...SecureLinkUsersOption)` - Inputs: go-users config + manager; outputs: config mutated with securelink routes/manager.
- `NewSecureLinkNotificationBuilder(manager links.SecureLinkManager, opts ...linksecure.Option) links.LinkBuilder` - Inputs: notification manager + options; outputs: notification link builder.
- `RegisterOnboardingRoutes(r router.Router[T], cfg admin.Config, handlers OnboardingHandlers, opts ...OnboardingRouteOption) error` - Inputs: router/config/handlers; outputs: error (registers onboarding API routes).
- `RegisterUserMigrations(client *persistence.Client, opts ...UserMigrationsOption) error` - Inputs: persistence client + options; outputs: error (registers go-auth + go-users migrations).

## User management
Quickstart can wire go-users repositories and expose the built-in users module. The `users` feature flag is enabled by default in `DefaultAdminFeatures()`; if you disable it, the users module is skipped and user/role endpoints return `FeatureDisabledError`.

Use `WithGoUsersUserManagement` to provide the required repositories (`AuthRepo`, `InventoryRepo`, `RoleRegistry`) and optional `ProfileRepo` + `ScopeResolver`. This wires `UserRepository`, `RoleRepository`, and (when provided) `ProfileStore`.

Bulk role operations should use panel bulk routes (`/panels/:panel/bulk/:action`, e.g. `/admin/api/panels/users/bulk/assign-role`). Legacy static routes are disabled by default; enable them only for compatibility:

```go
quickstart.WithLegacyUserRoleBulkRoutes()
```

Quickstart Fiber defaults now use `ADMIN_ROUTE_PATH_CONFLICT_MODE=prefer_static`, so absolute static routes (for example `/users/bulk/assign-role`) can coexist with wildcard siblings (for example `/users/bulk/:action`) deterministically; set `ADMIN_ROUTE_PATH_CONFLICT_MODE=strict` to restore strict conflict behavior.

```go
cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")

adm, _, err := quickstart.NewAdmin(
\tcfg,
\tquickstart.AdapterHooks{},
\tquickstart.WithGoUsersUserManagement(quickstart.GoUsersUserManagementConfig{
\t\tAuthRepo:      authRepo,
\t\tInventoryRepo: inventoryRepo,
\t\tRoleRegistry:  roleRegistry,
\t\tProfileRepo:   profileRepo,   // optional
\t\tScopeResolver: scopeResolver, // optional
\t}),
)
if err != nil {
\treturn err
}

_ = adm.RegisterModule(quickstart.NewUsersModule(
\tadmin.WithUserMenuParent("main"),
\tadmin.WithUserProfilesPanel(), // opt-in managed profiles panel
\tadmin.WithUserPanelTabs(admin.PanelTab{
\t\tID:     "activity",
\t\tLabel:  "Activity",
\t\tScope:  admin.PanelTabScopeDetail,
\t\tTarget: admin.PanelTabTarget{Type: "path", Path: "/admin/users/:id/activity"},
\t}),
))
```

The managed profiles panel and activity tab are opt-in; omit `WithUserProfilesPanel` or `WithUserPanelTabs` to keep the default users panel.

All user management URLs should resolve via URLKit (admin namespace). Defaults:
- `adm.URLs().Resolve("admin.users")` -> `/admin/users`
- `adm.URLs().Resolve("admin.roles")` -> `/admin/roles`
- Panel API collection endpoints are canonical under `/admin/api/panels/<panel>` (for example `/admin/api/panels/users`, `/admin/api/panels/roles`).
- Panel API detail endpoints are canonical under `/admin/api/panels/<panel>/<id>`.
- `adm.URLs().Resolve("admin.user_profiles")` -> `/admin/user-profiles` (when the profiles panel is enabled)

Panel entry behavior:
- Canonical panel UI routes (registered by `RegisterContentEntryUIRoutes`) now
  honor `PanelBuilder.WithEntryMode(...)`.
- `profile` defaults to `admin.PanelEntryModeDetailCurrentUser`, so
  `GET /admin/profile` resolves to the current user detail view instead of the
  profile datagrid/list.
- Panels without explicit entry mode use `admin.PanelEntryModeList`.

To opt a panel into a different canonical entry point:

```go
usersModule := quickstart.NewUsersModule(
	admin.WithUsersPanelConfigurer(func(builder *admin.PanelBuilder) *admin.PanelBuilder {
		if builder == nil {
			return nil
		}
		return builder.WithEntryMode(admin.PanelEntryModeDetailCurrentUser)
	}),
)
_ = usersModule
```

Bulk role routes are auto-registered by quickstart when `users` is enabled:
- `adm.URLs().Resolve("admin.api.users.bulk.assign_role")` -> `/admin/api/users/bulk/assign-role`
- `adm.URLs().Resolve("admin.api.users.bulk.unassign_role")` -> `/admin/api/users/bulk/unassign-role`

## Translation exchange (opt-in)
Translation exchange is disabled by default in quickstart. Enable it explicitly with `WithTranslationExchangeConfig(...)`.

## Translation product profiles
Quickstart supports one product-level translation entry point:

```go
quickstart.WithTranslationProductConfig(quickstart.TranslationProductConfig{
	SchemaVersion: 1, // defaults to 1
	Profile:       quickstart.TranslationProfileCore, // default for cms-enabled apps
	Exchange:      nil, // optional module override
	Queue:         nil, // optional module override
})
```

Supported profiles:
- `none`
- `core`
- `core+exchange`
- `core+queue`
- `full`

Deterministic precedence order:
1. Profile baseline (`core` default when `cms` is enabled, otherwise `none`).
2. Product module overrides (`TranslationProductConfig.Exchange` / `Queue`).
3. Legacy options (`WithTranslationExchangeConfig`, `WithTranslationQueueConfig`) as final compatibility overrides.

When exchange is enabled through profiles, quickstart still validates that required exchange handlers are configured.
If `cms` is disabled, any effective profile/module enablement other than `none` fails startup with a typed translation product config error.
Quickstart publishes resolved translation metadata to both:
- `quickstart.TranslationCapabilities(adm)` for backend/example wiring.
- `translation_capabilities` in UI route view context and `quickstart.WithNav(...)` context for template/frontend gating.
- Startup diagnostics log event: `translation.capabilities.startup` (INFO) with `profile`, `schema_version`, module enablement, feature flags, routes, panels, resolver keys, and warnings.
- Validation failures log `translation.capabilities.startup` (ERROR) with deterministic fields: `error_code`, `error_message`, `hint`, `failed_checks`.
- `SchemaVersion=0` is treated as a supported legacy input and normalized to
  schema version `1` with warning
  `translation.productization.schema.upconverted`.
- Explicit translation module feature overrides in `WithFeatureDefaults` are
  honored (`translations.exchange`, `translations.queue`) before dependency
  validation.
- `dashboard=false` only suppresses dashboard exposure; it does not disable
  translation policy enforcement or queue/exchange wiring by itself.

### Migration and compatibility contract

Product wiring and legacy manual wiring can coexist during migration.

- Conflict handling is deterministic: legacy module options are applied after
  profile + product module overrides.
- Mixed product+legacy usage emits warning
  `translation.productization.legacy_override`.
- Switching to product config changes runtime wiring source only and must not
  mutate persisted translation records, exchange artifacts, or queue
  assignments.
- Legacy manual wiring options remain supported for at least two minor releases
  after product API GA.

Detailed contract and rollout rules:
`../docs/GUIDE_CMS.md#177-translation-productization-contract`.

Minimal in-process wiring:

```go
adm, _, err := quickstart.NewAdmin(
	cfg,
	quickstart.AdapterHooks{},
	quickstart.WithTranslationExchangeConfig(quickstart.TranslationExchangeConfig{
		Enabled: true,
		Store:   translationExchangeStore, // implements admin.TranslationExchangeStore
	}),
)
if err != nil {
	return err
}
```

Optional permission registration:

```go
err := quickstart.RegisterTranslationExchangePermissions(func(def quickstart.PermissionDefinition) error {
	// host permission catalog integration
	return permissionRegistry.Register(def.Key, def.Description)
})
```

Permission ownership:
- Quickstart defines and can register translation permission keys into a host permission catalog.
- Quickstart does not create roles or assign permissions to users.
- The host application must seed/assign permissions for every role that should access exchange/queue routes.
- Exchange endpoints require:
  - `admin.translations.export` -> `POST /admin/api/translations/export`
  - `admin.translations.import.view` -> `GET /admin/api/translations/template`
  - `admin.translations.import.validate` -> `POST /admin/api/translations/import/validate`
  - `admin.translations.import.apply` -> `POST /admin/api/translations/import/apply`

Optional async apply integration for production workers:

```go
quickstart.WithTranslationExchangeConfig(quickstart.TranslationExchangeConfig{
	Enabled: true,
	Store:   translationExchangeStore,
	AsyncApply: func(ctx context.Context, input admin.TranslationImportApplyInput) (admin.TranslationExchangeResult, error) {
		// enqueue job in external worker and return queued contract
		return admin.TranslationExchangeResult{
			Summary: admin.TranslationExchangeSummary{
				Processed: len(input.Rows),
			},
			Metadata: map[string]any{"queued": true},
		}, nil
	},
})
```

### Exchange contract and trigger reuse

Exchange adapters should preserve one command contract across HTTP, CLI, and
jobs.

HTTP routes:
- `POST /admin/api/translations/export`
- `GET /admin/api/translations/template`
- `POST /admin/api/translations/import/validate`
- `POST /admin/api/translations/import/apply`

Row linkage fields (`rows[*]`):
- `resource`
- `entity_id`
- `translation_group_id`
- `target_locale`
- `field_path`

Safety semantics:
- Run `validate` before `apply`.
- `apply` never auto-publishes imported rows.
- Missing locale variants require explicit create intent (`create_translation`).
- `source_hash` mismatch is a typed row conflict unless explicitly overridden.
- Duplicate linkage rows in one payload produce deterministic row conflicts and
  do not write duplicate changes.

Trigger command names:
- `admin.translations.exchange.import.run` (typed run command)
- `jobs.translations.exchange.import.run` (cron/manual trigger)

Job wrapper:
- `examples/web/jobs.NewTranslationImportRunJob(...)` builds a cron trigger
  command that dispatches the same typed run message contract.

## Translation queue (opt-in)
Translation queue is disabled by default in quickstart. Enable it with
`WithTranslationQueueConfig(...)`.

Minimal wiring:

```go
policyCfg := quickstart.TranslationPolicyConfig{
	Required: map[string]quickstart.TranslationPolicyEntityConfig{
		"catalog_items": {
			"publish": {Locales: []string{"en", "es"}},
		},
	},
}

adm, _, err := quickstart.NewAdmin(
	cfg,
	quickstart.AdapterHooks{},
	quickstart.WithTranslationPolicyConfig(policyCfg),
	quickstart.WithTranslationQueueConfig(quickstart.TranslationQueueConfig{
		Enabled: true,
		// Optional: provide repository/service overrides.
		// Repository: admin.NewInMemoryTranslationAssignmentRepository(),
	}),
)
if err != nil {
	return err
}
```

Locale alignment rule:
- If `supported_locales` is omitted, quickstart derives queue locales from active
  translation policy requirements.
- If `supported_locales` is explicitly set and policy locales are available,
  sets must match exactly or startup fails with `ErrTranslationQueueConfig`.

Optional permission registration:

```go
err := quickstart.RegisterTranslationQueuePermissions(func(def quickstart.PermissionDefinition) error {
	return permissionRegistry.Register(def.Key, def.Description)
})
```

Queue permission map:
- `admin.translations.view` -> queue list/detail read access.
- `admin.translations.assign` -> queue create/new and assign/release actions.
- `admin.translations.edit` -> submit-review/update flows.
- `admin.translations.approve` -> approve/reject review actions.
- `admin.translations.manage` -> archive/manage/bulk lifecycle actions.
- `admin.translations.claim` -> claim open-pool assignments.

Auth note:
- Non-CRUD permissions (for example `admin.translations.export` and `admin.translations.assign`) are checked as explicit permission strings.
- After changing role permissions, mint a new auth token (log out/in) so claims metadata contains updated permissions.

## URL configuration
Quickstart defaults still mount admin under `/admin` and the public API under
`/api/v1`, but the canonical URL surface now lives in `cfg.URLs`.

Example:

```go
cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")
cfg.URLs.Admin.BasePath = "/control"
cfg.URLs.Admin.APIPrefix = "api"
cfg.URLs.Public.APIVersion = "v2"
```

If you need full control, set `cfg.URLs.URLKit` to a custom URLKit config and
use `adm.URLs()` for template helpers and route registration.

For panel-backed navigation targets, prefer canonical panel URL helpers instead
of hardcoded paths:
- `quickstart.ResolveAdminPanelURL(adm.URLs(), cfg.BasePath, "<panel>")`

The helper resolves the canonical panel entry URL. When a panel opts into
`PanelEntryModeDetailCurrentUser`, that same URL opens detail for the current
authenticated user.

## Scope defaults (single vs multi-tenant)
Quickstart can enforce a single-tenant default scope or require explicit tenant/org
claims for multi-tenant projects.

Modes:
- `single` (default): injects default tenant/org IDs when claims are missing.
- `multi`: never injects defaults; scope must come from auth claims/metadata.

Defaults:
- tenant: `11111111-1111-1111-1111-111111111111`
- org: `22222222-2222-2222-2222-222222222222`

Environment variables:
- `ADMIN_SCOPE_MODE=single|multi`
- `ADMIN_DEFAULT_TENANT_ID=<uuid>`
- `ADMIN_DEFAULT_ORG_ID=<uuid>`
- Full `ADMIN_*` table (including route conflict flags `ADMIN_ROUTE_CONFLICT_POLICY`, `ADMIN_ROUTE_PATH_CONFLICT_MODE`, and `ADMIN_STRICT_ROUTES`): `../ENVS_REF.md`

Example:

```go
cfg := quickstart.NewAdminConfig("/admin", "Admin", "en",
	quickstart.WithScopeFromEnv(),
)
```

For explicit config:

```go
cfg := quickstart.NewAdminConfig("/admin", "Admin", "en",
	quickstart.WithScopeMode(quickstart.ScopeModeMulti),
)
```

## Template functions
`NewViewEngine` wires `DefaultTemplateFuncs()` when no template functions are supplied. Prefer `WithViewURLResolver(adm.URLs())` (or `WithTemplateURLResolver(adm.URLs())`) so `adminURL` resolves via URLKit; `WithViewBasePath(cfg.BasePath)` remains as a fallback for legacy setups. `WithViewTemplateFuncs` is a strict override; use `MergeTemplateFuncs` if you want to keep defaults and add/override a subset.
The go-router Pongo2 engine treats these helpers as functions (globals), not filters, so call them like `{{ singularize(resource_label|default:resource)|title }}` instead of `{{ resource_label|singularize }}`.

Template function options let you override widget title labels without touching the core map:
- `WithWidgetTitleOverrides(overrides map[string]string) TemplateFuncOption` - merges label overrides into defaults.
- `WithWidgetTitleMap(titles map[string]string) TemplateFuncOption` - replaces the default map entirely.
- `WithWidgetTitleFunc(fn func(string) string) TemplateFuncOption` - provides a custom resolver.
- `WithTemplateBasePath(basePath string) TemplateFuncOption` - sets the fallback base path used by the `adminURL` helper.
- `WithTemplateURLResolver(urls urlkit.Resolver) TemplateFuncOption` - configures the URLKit resolver used by `adminURL`.
- `WithTemplateFeatureGate(gate fggate.FeatureGate, opts ...fgtemplates.HelperOption) TemplateFuncOption` - registers feature gate template helpers (`featureEnabled`, `featureDisabled`, etc.) from go-featuregate.
- `WithTemplateIconRenderer(renderFunc func(ref string, variant string) string) TemplateFuncOption` - injects a custom icon renderer for `renderIcon` and `renderIconVariant` helpers; if not provided, templates use the built-in legacy icon rendering.

```go
funcs := quickstart.MergeTemplateFuncs(
	map[string]any{
		"titleize": strings.ToUpper,
	},
	quickstart.WithTemplateURLResolver(adm.URLs()),
	quickstart.WithTemplateBasePath(cfg.BasePath),
	quickstart.WithWidgetTitleOverrides(map[string]string{
		"admin.widget.user_profile_overview": "Profile Overview",
	}),
)

views, err := quickstart.NewViewEngine(
	os.DirFS("./web"),
	quickstart.WithViewTemplateFuncs(funcs),
)
if err != nil {
	return err
}
```

## UI routes
Quickstart includes opt-in helpers for common UI routes (admin shell, notifications, login/logout, password reset).

```go
if err := quickstart.RegisterAdminUIRoutes(router, cfg, adm, authn); err != nil {
	return err
}

if err := quickstart.RegisterAuthUIRoutes(
	router,
	cfg,
	auther,
	authCookieName,
	quickstart.WithAuthUITitles("Login", "Password Reset"),
); err != nil {
	return err
}

if err := quickstart.RegisterRegistrationUIRoutes(
	router,
	cfg,
	quickstart.WithRegistrationUITitle("Register"),
); err != nil {
	return err
}

if err := quickstart.RegisterContentEntryUIRoutes(
	router,
	cfg,
	adm,
	authn,
	quickstart.WithContentEntryDataGridStateStore(quickstart.PanelDataGridStateStoreOptions{
		Mode: "preferences", // optional; default is local storage when unset
	}),
	quickstart.WithContentEntryDataGridURLState(quickstart.PanelDataGridURLStateOptions{
		MaxURLLength:     1800,
		MaxFiltersLength: 600,
	}),
); err != nil {
	return err
}
```

When canonical panel UI routes are active (`PanelUIRouteModeCanonical`), the
base panel route (`/admin/<panel>`) uses the panel entry mode. For example,
`detail_current_user` renders detail for the authenticated user; default mode
remains list/datagrid.

### Panel list template contract
For list templates rendered from quickstart panel/content-entry routes, use `datagrid_config` as the canonical contract for DataGrid wiring:

- `datagrid_config.table_id`
- `datagrid_config.api_endpoint`
- `datagrid_config.action_base`
- `datagrid_config.preferences_endpoint` (optional; resolved panel preferences API path)
- `datagrid_config.column_storage_key`
- `datagrid_config.state_store` (optional: `{mode, resource, sync_debounce_ms, max_share_entries}`)
- `datagrid_config.url_state` (optional: `{max_url_length, max_filters_length, enable_state_token}`)
- `datagrid_config.export_config`

State persistence behavior:
- default mode is localStorage (`state_store` omitted or `mode=local`).
- optional preferences mode (`mode=preferences`) hydrates/syncs user state through `/api/panels/preferences`, with local cache fallback.
- URL sync writes compact query state; when limits are exceeded, DataGrid can fallback to `state=<token>` instead of writing large query payloads.

Compatibility keys (`datatable_id`, `list_api`, `action_base`, `export_config`) are still present for legacy templates, but new/updated templates should read from `datagrid_config` first.

Password reset UI defaults to two pages:

- Request: `/admin/password-reset` (template `password_reset`)
- Confirm: `/admin/password-reset/confirm` (template `password_reset_confirm`)

Override the confirm route or template with `WithAuthUIPasswordResetConfirmPath` and
`WithAuthUIPasswordResetConfirmTemplate`.

### Theme assets for auth UI
Auth and registration UI routes support theme assets (logo, favicon) via dedicated options. Assets are exposed in templates as `theme.assets.logo`, `theme.assets.favicon`, etc.

```go
authThemeAssets := map[string]string{
	"logo":    "logo.svg",
	"favicon": "favicon.svg",
}
authThemeAssetPrefix := path.Join(cfg.BasePath, "assets")

if err := quickstart.RegisterAuthUIRoutes(
	router,
	cfg,
	auther,
	authCookieName,
	quickstart.WithAuthUITitles("Login", "Password Reset"),
	quickstart.WithAuthUIThemeAssets(authThemeAssetPrefix, authThemeAssets),
); err != nil {
	return err
}

if err := quickstart.RegisterRegistrationUIRoutes(
	router,
	cfg,
	quickstart.WithRegistrationUITitle("Register"),
	quickstart.WithRegistrationUIThemeAssets(authThemeAssetPrefix, authThemeAssets),
); err != nil {
	return err
}
```

For manual route handlers, use `WithAuthUIViewThemeAssets` to merge theme assets into the view context:

```go
viewCtx := router.ViewContext{
	"title":     cfg.Title,
}
viewCtx = quickstart.WithPathViewContext(viewCtx, cfg, quickstart.PathViewContextConfig{
	BasePath: cfg.BasePath,
})
viewCtx = quickstart.WithAuthUIViewThemeAssets(viewCtx, authThemeAssets, authThemeAssetPrefix)
return c.Render("register", viewCtx)
```

For non-auth/public handlers, prefer the same path helper before rendering templates that link JS/CSS assets:

```go
viewCtx := quickstart.WithPathViewContext(nil, cfg, quickstart.PathViewContextConfig{
	BasePath:    cfg.BasePath,
	APIBasePath: "/api/v1/public",
})
```

Templates use a conditional fallback pattern:
```html
{% if theme and theme.assets and theme.assets.logo %}
<img src="{{ theme.assets.logo }}" alt="Logo" class="w-10 h-10" />
{% else %}
<!-- inline SVG fallback -->
{% endif %}
```

## CMS workflow defaults
Quickstart defaults wire CMS workflows for demo panels when you do not provide a custom engine. To start from defaults and override only a subset, register defaults before your overrides or opt in to default registration on a custom engine:

```go
workflow := admin.NewSimpleWorkflowEngine()
admin.RegisterDefaultCMSWorkflows(workflow)
workflow.RegisterWorkflow("content", admin.WorkflowDefinition{
    EntityType:   "content",
    InitialState: "draft",
    Transitions: []admin.WorkflowTransition{
        {Name: "submit_for_approval", From: "draft", To: "approval"},
        {Name: "publish", From: "approval", To: "published"},
    },
})

adm, _, err := quickstart.NewAdmin(
    cfg,
    hooks,
    quickstart.WithAdminDependencies(admin.Dependencies{
        Workflow: workflow,
    }),
)
if err != nil {
    return err
}
adm.WithCMSWorkflowDefaults()
```

Workflow capability precedence for dynamic content panels:

1. `workflow_id` (aliases: `workflowId`, `workflow-id`)
2. legacy `workflow`
3. trait default mapping configured through quickstart/admin options
4. no workflow

Configure trait defaults at bootstrap:

```go
adm, _, err := quickstart.NewAdmin(
    cfg,
    hooks,
    quickstart.WithAdminDependencies(admin.Dependencies{
        Workflow: workflow,
    }),
    quickstart.WithTraitWorkflowDefaults(map[string]string{
        "editorial": "editorial.default",
    }),
)
if err != nil {
    return err
}
```

Content type capability examples:

```json
{
  "panel_traits": ["editorial"],
  "workflow_id": "editorial.news"
}
```

```json
{
  "panel_traits": ["editorial"],
  "workflow": "editorial.default"
}
```

Migration guidance:

1. Keep legacy `workflow` keys initially.
2. Add trait defaults (`WithTraitWorkflowDefaults`) for shared defaults.
3. Add explicit `workflow_id` for content types that must override defaults.
4. Remove legacy `workflow` after validation.

External workflow config (YAML/JSON) can be loaded at startup:

```yaml
schema_version: 1
trait_defaults:
  editorial: editorial.default
workflows:
  editorial.default:
    initial_state: draft
    transitions:
      - name: submit_for_approval
        from: draft
        to: approval
      - name: publish
        from: approval
        to: published
  editorial.news:
    initial_state: draft
    transitions:
      - name: submit_for_approval
        from: draft
        to: approval
      - name: publish
        from: approval
        to: published
```

```go
adm, _, err := quickstart.NewAdmin(
    cfg,
    hooks,
    quickstart.WithWorkflowConfigFile("workflow_config.yaml"),
)
```

Validation fails fast with actionable field errors for:
- unsupported schema versions
- invalid workflow definitions (missing `initial_state`, transition fields, duplicate transition names)
- trait defaults referencing unknown workflow IDs

Persisted workflow runtime (Stage 3) can be wired for dynamic workflow and binding management:

```go
runtime := admin.NewWorkflowRuntimeService(
    admin.NewInMemoryWorkflowDefinitionRepository(),
    admin.NewInMemoryWorkflowBindingRepository(),
)

adm, _, err := quickstart.NewAdmin(
    cfg,
    hooks,
    quickstart.WithAdminDependencies(admin.Dependencies{
        Workflow: admin.NewSimpleWorkflowEngine(),
    }),
    quickstart.WithWorkflowRuntime(runtime),
)
```

Runtime binding resolution order is:
1. content type binding
2. trait binding
3. global binding

Capability precedence is unchanged: explicit `workflow_id`/`workflow` on the content type still wins over persisted bindings.

Workflow management API endpoints:
- `GET /admin/api/workflows`
- `POST /admin/api/workflows`
- `PUT /admin/api/workflows/:id` (`expected_version` required for updates; `rollback_to_version` enables rollback)
- `GET /admin/api/workflows/bindings`
- `POST /admin/api/workflows/bindings`
- `PUT /admin/api/workflows/bindings/:id` (`expected_version` required)
- `DELETE /admin/api/workflows/bindings/:id`

Operational migration/rollback details: `../docs/WORKFLOW_PERSISTENCE.md`.

CMS demo panels default to the `submit_for_approval` and `publish` actions. Override them with:

```go
adm.WithCMSWorkflowActions(
    admin.Action{Name: "submit_for_approval", Label: "Submit for approval"},
    admin.Action{Name: "publish", Label: "Publish"},
)
```

## Translation policy (workflow enforcement)
Quickstart can enforce translation completeness during workflow transitions
(publish/promote). Provide a `TranslationPolicyConfig` via
`WithTranslationPolicyConfig`; quickstart wires the default policy when the
config is present (or when `deny_by_default`/`required` are set).

Config example (YAML/JSON):

```yaml
translation_policy:
  deny_by_default: false
  required_fields_strategy: "error" # error|warn|ignore
  page_entities: ["landing_pages"] # optional: entities that should use page checker
  entity_aliases:
    article: news
  required:
    landing_pages:
      publish:
        locales: ["en", "es"]
      promote:
        environments:
          staging:
            locales: ["en"]
          prod:
            locales: ["en", "es", "fr"]
    articles:
      publish:
        locales: ["en"]
        required_fields:
          en: ["title", "path"]
```

Behavior notes:
- `required` keys map to policy entities (panel slug or content type slug). If a
  payload includes `policy_entity`/`policyEntity`, it overrides the entity lookup.
- When both page/content translation checkers are present, `page_entities` can
  declare which entities should prefer the page checker.
- Entity lookup is singular/plural tolerant (for example `item` vs `items`) using
  inflection-based matching against configured `required` keys.
- Use `entity_aliases` for irregular/legacy names that need explicit mapping.
- Transition names are the workflow transition names (`publish`, `promote`, etc.).
- If an `environment` match is present, it overrides transition-level
  `locales`/`required_fields` for that transition.
- `required_fields` is a map of locale → required field keys. If `locales` is
  empty but `required_fields` is set, locales are derived from the map keys.
- `required_fields_strategy` controls how unknown field keys are handled during
  validation (`error`, `warn`, `ignore`).
- `deny_by_default=true` blocks transitions when no requirements are configured
  for a transition.
- Operational contract and troubleshooting workflow: `../docs/GUIDE_CMS.md#17-translation-workflow-operations`.

Wiring example:

```go
policyCfg := quickstart.TranslationPolicyConfig{
	Required: map[string]quickstart.TranslationPolicyEntityConfig{
		"articles": {
			"publish": {Locales: []string{"en", "es"}},
		},
	},
}

adm, _, err := quickstart.NewAdmin(
	cfg,
	hooks,
	quickstart.WithTranslationPolicyConfig(policyCfg),
)
if err != nil {
	return err
}
```

### Theme selector + manifest
When using go-theme, pass the selector + manifest into quickstart so the Preferences UI can list available variants:

```go
selector, manifest, err := quickstart.NewThemeSelector(
	cfg.Theme,
	cfg.ThemeVariant,
	cfg.ThemeTokens,
)
if err != nil {
	return err
}

adm, _, err := quickstart.NewAdmin(
	cfg,
	hooks,
	quickstart.WithThemeSelector(selector, manifest),
)
if err != nil {
	return err
}
_ = adm
```

If you build the admin manually, call `adm.WithGoTheme(selector)` and `adm.WithThemeManifest(manifest)` after initialization.

## Onboarding + secure links

Quickstart wires onboarding routes and securelink helpers so hosts can opt in with minimal setup.

Feature gate keys (system scope) used by onboarding flows:

- `users.invite`
- `users.password_reset`
- `users.signup`

Enable these via gate defaults (for example `WithFeatureDefaults`) or runtime overrides.
Alias policy: `users.self_registration` is not supported; use `users.signup`.

Securelink env defaults:

- `ADMIN_SECURELINK_KEY` (required to enable manager in quickstart)
- `ADMIN_SECURELINK_BASE_URL` (default `http://localhost:8080`)
- `ADMIN_SECURELINK_QUERY_KEY` (default `token`)
- `ADMIN_SECURELINK_AS_QUERY` (default `true`)
- `ADMIN_SECURELINK_EXPIRATION` (default `72h`)

Route helpers:

- `RegisterOnboardingRoutes` (API endpoints under `/admin/api/onboarding` by default)
- `RegisterAuthUIRoutes` + `RegisterRegistrationUIRoutes` (UI pages)

See `docs/GUIDE_ONBOARDING.md` for token lifecycle details, error response shape, and
override hook examples.

## User migrations

Quickstart registers go-auth + go-users core migrations out of the box:

```go
if err := quickstart.RegisterUserMigrations(client); err != nil {
	return err
}
```

If you run without go-auth, disable auth migrations and enable go-users auth bootstrap/extras:

```go
if err := quickstart.RegisterUserMigrations(
	client,
	quickstart.WithUserMigrationsAuthEnabled(false),
	quickstart.WithUserMigrationsAuthBootstrapEnabled(true),
	quickstart.WithUserMigrationsAuthExtrasEnabled(true),
); err != nil {
	return err
}
```

## Static assets (opt-in disk fallback)
```go
diskAssetsDir := quickstart.ResolveDiskAssetsDir(
	"output.css",
	"path/to/pkg/client/assets",
	"assets",
)
quickstart.NewStaticAssets(r, cfg, client.Assets(), quickstart.WithDiskAssetsDir(diskAssetsDir))
```

## Usage example
```go
cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")
exportBundle := quickstart.NewExportBundle()
adm, adapters, err := quickstart.NewAdmin(cfg, quickstart.AdapterHooks{
	PersistentCMS: func(ctx context.Context, defaultLocale string) (admin.CMSOptions, string, error) {
		return admin.CMSOptions{}, "in-memory CMS", nil
	},
}, quickstart.WithAdminDependencies(admin.Dependencies{
	ExportRegistry:  exportBundle.Registry,
	ExportRegistrar: exportBundle.Registrar,
	ExportMetadata:  exportBundle.Metadata,
}))
if err != nil {
	return err
}

// Register definitions and row sources on exportBundle.Runner.
// exportBundle.Runner.Definitions.Register(...)
// exportBundle.Runner.RowSources.Register(...)

views, err := quickstart.NewViewEngine(os.DirFS("./web"))
if err != nil {
	return err
}

srv, r := quickstart.NewFiberServer(views, cfg, adm, true)
quickstart.NewStaticAssets(r, cfg, os.DirFS("./web"))
_ = quickstart.NewModuleRegistrar(adm, cfg, []admin.Module{}, true)

_ = adapters
_ = srv
```

```go
cfg := quickstart.NewAdminConfig(
	"/admin",
	"Admin",
	"en",
)
```

```go
flags := config.Admin.AdapterFlags
adm, adapters, err := quickstart.NewAdmin(
	cfg,
	hooks,
	quickstart.WithAdapterFlags(flags),
	quickstart.WithFeatureDefaults(quickstart.DefaultMinimalFeatures()),
)
if err != nil {
	return err
}
_ = adapters
_ = adm
```

```go
err = quickstart.NewModuleRegistrar(
	adm,
	cfg,
	modules,
	isDev,
)
if err != nil {
	return err
}
```

```go
authn, authz := quickstart.WithGoAuth(
	adm,
	routeAuth,
	authConfig,
	admin.GoAuthAuthorizerConfig{DefaultResource: "admin"},
	&admin.AuthConfig{
		LoginPath:    "/admin/login",
		LogoutPath:   "/admin/logout",
		RedirectPath: "/admin",
	},
)
_ = authn
_ = authz
```

```go
if err := quickstart.WithDefaultDashboardRenderer(adm, views, cfg); err != nil {
	return err
}
```

```go
formgen, err := quickstart.NewFormGenerator(os.DirFS("./openapi"), os.DirFS("./forms"))
if err != nil {
	return err
}
_ = formgen
```

```go
registry := components.New()
registry.MustRegister("permission-matrix", components.Descriptor{
	Renderer: permissionMatrixRenderer,
})

formgen, err := quickstart.NewFormGenerator(
	os.DirFS("./openapi"),
	os.DirFS("./forms"),
	quickstart.WithComponentRegistryMergeDefaults(registry),
	quickstart.WithVanillaOption(formgenvanilla.WithStylesheet("/admin/assets/forms.css")),
)
if err != nil {
	return err
}
_ = formgen
```

`WithVanillaOption(...)` is applied last, so it can override templates/styles/registry. Use `WithComponentRegistry(...)` instead of the merge option to replace defaults entirely.

## Debug quickstart
Debug is opt-in and requires module registration plus middleware/log wiring. Configure panels before constructing the admin; attach middleware/log helpers after the debug module is registered so the collector is available.

Environment mapping defaults:
- `ADMIN_DEBUG=true` enables `cfg.Debug.Enabled`, `ToolbarMode`, `CaptureSQL`, `CaptureLogs`, `CaptureJSErrors`, `CaptureRequestBody`, and sets the `debug` feature gate default.
- `ADMIN_DEBUG_ALLOWED_IPS=1.2.3.4,5.6.7.8` populates `cfg.Debug.AllowedIPs`.
- `ADMIN_DEBUG_ALLOWED_ORIGINS=https://app.example` populates `cfg.Debug.AllowedOrigins`.
- `ADMIN_DEBUG_APP_ID`, `ADMIN_DEBUG_APP_NAME`, and `ADMIN_DEBUG_ENVIRONMENT` populate the debug identity fields.
- `ADMIN_DEBUG_REMOTE=true` toggles remote debug endpoints.
- `ADMIN_DEBUG_TOKEN_TTL=15m` overrides the debug token TTL.
- `ADMIN_DEBUG_SESSION_TRACKING=true` toggles session tracking.
- `ADMIN_DEBUG_SESSION_GLOBAL_PANELS=false` toggles global panels in session views.
- `ADMIN_DEBUG_SESSION_COOKIE=admin_debug_session` overrides the session cookie name.
- `ADMIN_DEBUG_SESSION_EXPIRY=30m` overrides the session inactivity expiry.
- `ADMIN_DEBUG_SQL`, `ADMIN_DEBUG_LOGS`, `ADMIN_DEBUG_JS_ERRORS`, and `ADMIN_DEBUG_REQUEST_BODY` override the capture flags.
- `ADMIN_DEBUG_TOOLBAR` and `ADMIN_DEBUG_TOOLBAR_PANELS` override toolbar behavior/panels.
- `ADMIN_DEBUG_LAYOUT=admin|standalone` sets `cfg.Debug.LayoutMode`.
- `ADMIN_DEBUG_REPL` and `ADMIN_DEBUG_REPL_READONLY` configure the REPL.
- `ADMIN_DEV=true` enables `cfg.Errors.DevMode` (stack traces + internal messages by default).
- `ADMIN_ERROR_STACKTRACE=true` forces stack traces in non-dev environments.
- `ADMIN_ERROR_EXPOSE_INTERNAL=true` exposes internal error messages in responses.

```go
cfg := quickstart.NewAdminConfig(
	"/admin",
	"Admin",
	"en",
	quickstart.WithDebugFromEnv(),
)

quickstart.ConfigureDebugPanels(&cfg, quickstart.DebugPanelDeps{}, quickstart.DefaultDebugPanelCatalog())

adm, _, err := quickstart.NewAdmin(cfg, hooks, quickstart.WithAdminDependencies(deps))
if err != nil {
	return err
}

modules := []admin.Module{
	// core modules...
}
if cfg.Debug.Enabled {
	modules = append(modules, admin.NewDebugModule(cfg.Debug))
}

if err := quickstart.NewModuleRegistrar(
	adm,
	cfg,
	modules,
	isDev,
); err != nil {
	return err
}

if cfg.Debug.Enabled {
	quickstart.AttachDebugMiddleware(r, cfg, adm)
	quickstart.AttachDebugLogHandler(cfg, adm)
}

repoOptions := adm.DebugQueryHookOptions()
repo := repository.MustNewRepositoryWithOptions[*MyModel](db, handlers, repoOptions...)
```

### Scope debug (optional)
Scope debug captures the raw/resolved tenant/org scope for requests, adds an `X-Admin-Resolved-Scope` header, and exposes a JSON snapshot endpoint.

Environment mapping defaults:
- `ADMIN_DEBUG_SCOPE=true` enables the scope debug capture.
- `ADMIN_DEBUG_SCOPE_LIMIT=200` sets the in-memory buffer size (default 200).

```go
scopeDebugEnabled := quickstart.ScopeDebugEnabledFromEnv()
var scopeDebugBuffer *quickstart.ScopeDebugBuffer
if scopeDebugEnabled {
	scopeDebugBuffer = quickstart.NewScopeDebugBuffer(quickstart.ScopeDebugLimitFromEnv())
}

quickstart.ConfigureDebugPanels(
	&cfg,
	quickstart.DebugPanelDeps{ScopeBuffer: scopeDebugBuffer},
	quickstart.DefaultDebugPanelCatalog(),
)

wrapAuthed := authn.WrapHandler
if scopeDebugEnabled {
	wrapAuthed = quickstart.ScopeDebugWrap(authn, &cfg, scopeDebugBuffer)
}

r.Get(path.Join(cfg.BasePath, "api", "debug", "scope"), wrapAuthed(quickstart.ScopeDebugHandler(scopeDebugBuffer)))
```

## Preferences quickstart
- `FeaturePreferences` remains opt-in: pass `EnablePreferences()` or supply `WithFeatureDefaults(map[string]bool{"preferences": true})` when building the admin gate.
- A 403 on `/admin/api/panels/preferences` usually means the default permissions are missing (`admin.preferences.view`, `admin.preferences.edit`).
- Read query params: `levels`, `keys`, `include_traces`, `include_versions`, `tenant_id`, `org_id`.
- Clear/delete semantics: send `clear_raw_keys` or `clear: true` (for all raw keys), plus empty values for known keys to delete user-level overrides.
- Non-user writes (tenant/org/system) require `admin.preferences.manage_tenant`, `admin.preferences.manage_org`, `admin.preferences.manage_system`.
- Dashboard preferences endpoints default to preferences permissions; override with `cfg.DashboardPreferencesPermission` / `cfg.DashboardPreferencesUpdatePermission` if needed.
- See `../docs/GUIDE_MOD_PREFERENCES.md` for module behavior, traces, and clear semantics.
- If you want quickstart to build the repo (for example, to enable caching), pass `WithGoUsersPreferencesRepositoryFactory` to `NewAdmin`.
- Use `NewPreferencesModule` with `WithPreferencesSchemaPath` to override the form schema (file path or a directory containing `schema.json`).
- Use `WithPreferencesJSONEditorStrict(true)` to enforce client-side JSON validation of `raw_ui` (default is lenient; server-side validation still applies).

```go
prefsStore, err := quickstart.NewGoUsersPreferencesStore(preferenceRepo)
if err != nil {
	return err
}

adm, err := admin.New(cfg, admin.Dependencies{
	PreferencesStore: prefsStore,
})
if err != nil {
	return err
}
_ = adm
```

```go
adm, _, err := quickstart.NewAdmin(
	cfg,
	adapterHooks,
	quickstart.WithGoUsersPreferencesRepositoryFactory(func() (types.PreferenceRepository, error) {
		return preferences.NewRepository(
			preferences.RepositoryConfig{DB: client.DB()},
			preferences.WithCache(true),
		)
	}),
	quickstart.EnablePreferences(),
)
if err != nil {
	return err
}
_ = adm
```

```go
err := quickstart.RegisterPreferencesPermissions(func(def quickstart.PermissionDefinition) error {
	return permissions.Register(def.Key, def.Description)
})
if err != nil {
	return err
}
```

```go
modules := []admin.Module{
	quickstart.NewPreferencesModule(
		cfg,
		"",
		quickstart.WithPreferencesSchemaPath("./configs/preferences"),
		quickstart.WithPreferencesJSONEditorStrict(true),
	),
}
if err := quickstart.NewModuleRegistrar(adm, cfg, modules, isDev); err != nil {
	return err
}
```

## Stage 1 minimal flow
- Build config with `NewAdminConfig(...)` and pass `WithFeatureDefaults(DefaultMinimalFeatures())` to `NewAdmin`.
- Resolve adapter flags from config and pass via `WithAdapterFlags(...)`.
- Register modules with `NewModuleRegistrar` (uses `adm.FeatureGate()` by default).
- Wire auth with `WithGoAuth(...)` (include `*admin.AuthConfig` when needed).
- Enable dashboard SSR with `WithDefaultDashboardRenderer(...)` (override templates as needed).

## Translation Profile Operational Runbook

### Environment-based Configuration

Configure translation profiles via environment variables:

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `ADMIN_TRANSLATION_PROFILE` | `none`, `core`, `core+exchange`, `core+queue`, `full` | Empty (resolves to `core` when CMS enabled) | Sets the baseline translation capability profile |
| `ADMIN_TRANSLATION_EXCHANGE` | `true`, `false` | Profile default | Overrides exchange module enablement |
| `ADMIN_TRANSLATION_QUEUE` | `true`, `false` | Profile default | Overrides queue module enablement |

Profile capability matrix:

| Profile | Exchange | Queue | Use Case |
|---------|----------|-------|----------|
| `none` | - | - | Translation disabled |
| `core` | - | - | Basic translation readiness only |
| `core+exchange` | Yes | - | Import/export workflows |
| `core+queue` | - | Yes | Assignment management |
| `full` | Yes | Yes | Complete translation operations |

### Verification Checklist

1. Start the host app with the intended profile and overrides.
2. Validate the startup capability event and module flags.
3. Validate module route exposure for enabled modules.
4. Validate disabled modules are not exposed.

Example startup:

```bash
ADMIN_TRANSLATION_PROFILE=full \
ADMIN_TRANSLATION_EXCHANGE=true \
ADMIN_TRANSLATION_QUEUE=true \
go run ./examples/web
```

Check startup logs for `translation.capabilities.startup` and verify:
- `profile` is the expected resolved value.
- `modules.exchange.enabled` and `modules.queue.enabled` match the final intended state.
- `routes` includes enabled module routes only.
- `resolver_keys` include route keys expected by UI entrypoints.

### Route/Capability Expectations

Expected runtime routes when modules are enabled:
- Exchange UI route: `/admin/translations/exchange`
- Queue UI route: `/admin/content/translations`
- Exchange API routes: `/admin/api/translations/export`, `/admin/api/translations/import/validate`, `/admin/api/translations/import/apply`
- Queue panel API route: `/admin/api/panels/translations`

When a module is disabled:
- Exchange UI route is not registered.
- Exchange API endpoints are not registered.
- Queue panel/API routes are not registered.
- Capability metadata (`TranslationCapabilities(adm)`) reports the module as disabled.

### Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|--------------|------------|
| `translation product config invalid` at startup | Missing CMS feature for non-`none` profile | Enable `cms` feature or use profile `none` |
| Exchange routes not registered | Exchange module not enabled | Set `ADMIN_TRANSLATION_EXCHANGE=true` or use `core+exchange`/`full` profile |
| `exchange.handlers_missing` error | Exchange store not configured | Provide `TranslationExchangeConfig.Store` implementation |
| `queue.locales_invalid` error | Queue enabled without supported locales | Set `TranslationQueueConfig.SupportedLocales` or configure translation policy |
| Translation UI not visible | Feature gate disabled | Check `FeatureTranslationExchange` in feature gate |

### Runtime Validation

After admin initialization, call `quickstart.TranslationCapabilities(adm)` to get resolved capabilities:

```go
caps := quickstart.TranslationCapabilities(adm)
log.Printf("Translation profile: %s", caps["profile"])
log.Printf("Exchange enabled: %v", caps["modules"].(map[string]any)["exchange"].(map[string]any)["enabled"])
log.Printf("Registered routes: %v", caps["routes"])
```

## References
- `../QUICKBOOT_TDD.md`
- `../QUICKBOOT_TSK.md`

## Compatibility note
If you previously imported quickstart as part of the root module, keep the same import path but add a direct `require` on `github.com/goliatone/go-admin/quickstart` in your `go.mod` (or use a local `replace`/`go.work` entry during dev). The APIs are unchanged; only the module boundary moved.

## What’s included
- Navigation: slug-derived menu IDs/lookup, parent scaffolder for grouped/collapsible defaults, canonical content-parent permission helper (`DefaultContentParentPermissions`), idempotent seeding (`SeedNavigation`), deterministic ordering, permission filtering, collapsible state, `NAV_DEBUG` logging/JSON, and view helpers (`WithNav`, `BuildNavItems`).
- Sidebar: embedded templates/partials and assets (CSS/JS) with collapse + submenu persistence; apps can override by adding their own template/assets FS ahead of the defaults.
- Error handling: Fiber error handler that returns JSON for API paths and renders the branded error page (with nav/theme/session) for HTML routes.
- Adapters: config- or env-flagged wiring for persistent CMS (`USE_PERSISTENT_CMS`), go-options settings (`USE_GO_OPTIONS`), and go-users activity sink (`USE_GO_USERS_ACTIVITY`) with safe in-memory fallbacks.
- Auth debug: `GoAuthAuthorizer` supports `AUTH_DEBUG=true` or config flag for structured decision logging (logger injectable).

## Flags and debug
- `USE_PERSISTENT_CMS=true` – swap to persistent CMS via provided hook.
- `USE_GO_OPTIONS=true` – swap settings backend to go-options adapter.
- `USE_GO_USERS_ACTIVITY=true` – use go-users activity sink if available.
- `RESET_NAV_MENU=true` – reset target menu before seeding (backends must expose reset hook).
- `NAV_DEBUG=true` – include nav JSON in views; `NAV_DEBUG_LOG=true` – log nav payload.
- `AUTH_DEBUG=true` – emit structured auth decisions.

## Overrides
- Templates/Assets: prepend your own FS via `WithViewTemplatesFS`/`WithViewAssetsFS` to override the embedded sidebar.
- Navigation seed: pass custom items to `SeedNavigation`; module menu contributions are deduped by ID.
- Module gating: `WithModuleFeatureGates(customGate)` with optional `WithModuleFeatureDisabledHandler`.
- Translation nav seeding: `WithTranslationCapabilityMenuMode(TranslationCapabilityMenuModeTools)` adds dashboard/queue/exchange links into a dedicated `Translations` menu group in server-seeded navigation.
- Dashboard SSR: provide `WithDashboardTemplatesFS` and/or disable embedded templates via `WithDashboardEmbeddedTemplates(false)`.
- Error handler: swap `quickstart.NewFiberErrorHandler` with your own if needed.
