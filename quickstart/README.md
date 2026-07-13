# Quickstart Defaults

The quickstart package (module `github.com/goliatone/go-admin/quickstart`) bundles opt-in defaults for go-admin so hosts can get a working admin with minimal wiring while keeping override hooks.

## Bootstrap helpers
Each helper is optional and composable.

### Temporary bootstrap passwords

For first-instance provisioning, keep orchestration in `go-users` and enforcement in `go-auth`:

1. Generate a one-time password and hash it with `auth.HashPassword`.
2. Execute `service.Commands().UserBootstrapPassword` with the target user, hash, actor, and optional TTL. The default TTL is 24 hours.
3. Wire login with `auth.NewUserProvider(repoManager.Users())` or an equivalent provider that reads go-auth user metadata.
4. Add `auth.TemporaryPasswordClaimsDecorator()` to the authenticator when the UI needs a compact `password_change_required` session/JWT hint.
5. Add `TemporaryPasswordGateForAdmin` or `TemporaryPasswordGate` after auth middleware so temporary sessions can only reach password-change/reset routes.
6. When the user sets a permanent password, run the normal `UserPasswordReset`/confirm path; temporary-password metadata is cleared when the repository supports it, and the reset token is claimed/finalized through the password-reset lifecycle repository so concurrent confirms cannot double-apply the password.

The metadata contract is migration-free: `password_temporary`, `password_change_required`, `password_temporary_issued_at`, and `password_temporary_expires_at`. Expired temporary passwords are rejected by local `go-auth` password verification.

The admin temporary password guide covers the full provisioning, auth wiring,
password-change gate, and recovery flow.

## Storage-backed uploads
- `NewStorageBundle(ctx context.Context, cfg StorageBundleConfig) (*StorageBundle, error)` - Inputs: shared `go-uploader` provider config, optional validator/logger/startup validation toggle. Outputs: configured storage provider plus uploader manager for host apps.
- `StorageBundleConfig` reuses `go-uploader` provider config so host apps can select `fs`, `s3`, or `multi` without embedding backend-specific construction logic into app modules.

- `NewAdminConfig(basePath, title, defaultLocale string, opts ...AdminConfigOption) admin.Config` - Inputs: base path/title/locale plus option setters. Outputs: `admin.Config` with quickstart defaults and overrides applied.
- `DefaultMinimalFeatures() map[string]bool` - Outputs: minimal Stage 1 feature set (`dashboard` + `cms`) intended for `WithFeatureSet(...)` or custom feature-gate construction.
- `WithDebugConfig(cfg admin.DebugConfig) AdminConfigOption` - Inputs: debug config; outputs: option that applies debug config (used to derive debug gate defaults).
- `WithDebugOptions(opt DebugOption) AdminConfigOption` - Inputs: explicit debug option overrides; outputs: option that applies targeted debug fields.
- `WithErrorConfig(cfg admin.ErrorConfig) AdminConfigOption` - Inputs: error config; outputs: option that applies error presentation defaults.
- `WithErrorOptions(opt ErrorOption) AdminConfigOption` - Inputs: explicit error option overrides; outputs: option that applies targeted error fields.
- `WithThemeAssetURLs(assets map[string]string) AdminConfigOption` - Inputs: resolved asset URLs/paths keyed by theme asset name; outputs: option that overlays final admin theme assets such as `logo`, `icon`, and `favicon`.
- `WithRoutingConfig(cfg routing.Config) AdminConfigOption` - Inputs: routing roots/module mount overrides; outputs: option that applies explicit routing policy overrides during quickstart config assembly.
- `WithScopeConfig(scope ScopeConfig) AdminConfigOption` - Inputs: scope config; outputs: option that applies single/multi-tenant defaults.
- `WithScopeMode(mode ScopeMode) AdminConfigOption` - Inputs: scope mode (`single` or `multi`); outputs: option that sets the mode.
- `WithDefaultScope(tenantID, orgID string) AdminConfigOption` - Inputs: default tenant/org IDs; outputs: option that sets defaults for single-tenant mode.
- `NewAdmin(cfg admin.Config, hooks AdapterHooks, opts ...AdminOption) (*admin.Admin, AdapterResult, error)` - Inputs: config, adapter hooks, optional context/dependencies. Outputs: admin instance, adapter result summary, error.
- `WithAdapterFlags(flags AdapterFlags) AdminOption` - Inputs: adapter flags; outputs: option that applies explicit adapter toggles.
- `WithFeatureDefaults(defaults map[string]bool) AdminOption` - Inputs: feature override map; outputs: compatibility option that merges overrides into `DefaultAdminFeatures()`.
- `WithFeatureOverrides(defaults map[string]bool) AdminOption` - Inputs: feature override map; outputs: explicit merge-style option for quickstart feature defaults.
- `WithFeatureSet(defaults map[string]bool) AdminOption` - Inputs: full feature default map; outputs: option that replaces `DefaultAdminFeatures()` as the base set used by `NewAdmin`.
- `WithMinimalFeatures() AdminOption` - Outputs: option that replaces the default quickstart feature set with `DefaultMinimalFeatures()`.
- `WithStartupPolicy(policy StartupPolicy) AdminOption` - Inputs: startup policy (`enforce` or `warn`); outputs: option controlling module startup validation handling.
- `WithCommandExecutionPolicy(policy admin.CommandExecutionPolicy) AdminOption` - Inputs: command execution policy (global default + per-command overrides); outputs: option that injects command routing policy into bootstrap.
- `WithCommandQueueRouting(cfg CommandQueueRoutingConfig) AdminOption` - Inputs: queue routing config (`enabled`, `enqueuer`, optional command registry + dedupe store); outputs: option that attaches the queued dispatcher executor.
- `WithRPCTransport(cfg RPCTransportConfig) AdminOption` - Inputs: RPC transport config (`enabled`, optional `invoke_path`, `require_auth`, explicit `allow_unauthenticated` opt-out, `discovery_enabled`, optional command rules/policy hook); outputs: option that mounts Fiber RPC invoke routes and wires admin RPC command policy defaults.
- `TranslationExchangeCommandIDs() []string` - Outputs: canonical translation-exchange command ids for policy configuration.
- `TranslationQueueCommandIDs() []string` - Outputs: canonical translation-queue command ids for policy configuration.
- `WithTranslationProfile(profile TranslationProfile) AdminOption` - Inputs: profile (`none`, `core`, `core+exchange`, `core+queue`, `full`); outputs: option that applies productized translation defaults.
- `WithTranslationProductConfig(cfg TranslationProductConfig) AdminOption` - Inputs: product config (`SchemaVersion`, `Profile`, optional module overrides); outputs: option that resolves effective translation module wiring with deterministic precedence.
- `TranslationCapabilities(adm *admin.Admin) map[string]any` - Inputs: admin instance; outputs: resolved translation capability metadata (`profile`, `schema_version`, module enablement, feature flags, routes, resolver keys, panels, warnings).
- `WithTranslationPolicyConfig(cfg TranslationPolicyConfig) AdminOption` - Inputs: workflow transition requirements by policy entity/content type; outputs: option that wires the default translation policy and reports missing suitable checker services.
- `WithTranslationPolicyServices(services TranslationPolicyServices) AdminOption` - Inputs: page/content services implementing `CheckTranslations`; outputs: explicit checker overrides for hosts whose CMS container is not discoverable.
- `ValidateTranslationPolicyCoverage(cfg TranslationPolicyConfig, contentTypes []string) (TranslationPolicyValidationResult, error)` - Inputs: policy config plus content types included in family readiness; outputs: validation warnings/error for missing policy coverage.
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
- `WithThemeContext(ctx router.ViewContext, adm *admin.Admin, req router.Context) router.ViewContext` - Inputs: view context, admin, request. Outputs: context enriched with theme tokens/selection and query-string theme preview overrides.
- `WithNav(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext` - Inputs: base view context + admin/config/request state. Outputs: context enriched with feature flags (`activity_enabled`, `activity_feature_enabled`, `translation_capabilities`, `body_classes`), session user payload, nav items, theme payload, and path helpers.
- `WithNavPlacements(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, placements PlacementConfig, placement MenuPlacementKey, active string, reqCtx context.Context) router.ViewContext` - Inputs: same as `WithNav`, plus placement mapping. Outputs: placement-aware nav context for non-sidebar menus while preserving the same feature/session/theme enrichment.
- `ResolveDashboardArea(placements PlacementConfig, placement placement.DashboardPlacementKey, fallback string) string` - Inputs: placement config, shared dashboard placement key, fallback area code. Outputs: resolved dashboard area code for quickstart-owned widget wiring.
- `BuildPanelExportConfig(cfg admin.Config, opts PanelViewCapabilityOptions) map[string]any` - Inputs: admin config and panel capability options. Outputs: normalized `export_config` payload (`endpoint`, `definition`, optional `variant`).
- `BuildPanelDataGridConfig(opts PanelDataGridConfigOptions) map[string]any` - Inputs: datagrid options. Outputs: normalized `datagrid_config` payload (`table_id`, `api_endpoint`, `action_base`, optional `preferences_endpoint`, `column_storage_key`, optional translation/grouped-mode keys, `state_store`, and `url_state`).
- `BuildPanelViewCapabilities(cfg admin.Config, opts PanelViewCapabilityOptions) router.ViewContext` - Inputs: admin config and panel capability options. Outputs: template capability context including `export_config` and `datagrid_config`.
- `PathViewContext(cfg admin.Config, pathCfg PathViewContextConfig) router.ViewContext` - Inputs: config + path resolver hints. Outputs: normalized `base_path`, `api_base_path`, `asset_base_path`, `preferences_api_path`.
- `WithPathViewContext(ctx router.ViewContext, cfg admin.Config, pathCfg PathViewContextConfig) router.ViewContext` - Inputs: existing context + path resolver hints. Outputs: merged context with canonical path keys.
- `WithThemeSelector(selector theme.ThemeSelector, manifest *theme.Manifest) AdminOption` - Inputs: admin go-theme selector + manifest; outputs: option that wires admin theme selection + manifest into `NewAdmin` (including Preferences variant options).
- `NewFiberServer(viewEngine fiber.Views, cfg admin.Config, adm *admin.Admin, isDev bool, opts ...FiberServerOption) (router.Server[*fiber.App], router.Router[*fiber.App])` - Inputs: views, config, admin, dev flag, server options. Outputs: go-router server adapter and router.
- `NewThemeSelector(name, variant string, tokenOverrides map[string]string, opts ...ThemeOption) (theme.Selector, *theme.Manifest, error)` - Inputs: theme name/variant, token overrides, theme options. Outputs: selector, manifest, error.
- `NewStaticAssets(r router.Router[T], cfg admin.Config, assetsFS fs.FS, opts ...StaticAssetsOption)` - Inputs: router, config, host assets FS, asset options. Outputs: none (registers static routes).
- `ResolveDashboardShellAssetsPrefix(cfg admin.Config, opts ...StaticAssetsOption) string` - Inputs: admin config and the same static asset options passed to `NewStaticAssets`. Outputs: resolved go-dashboard shell asset prefix for content-builder UI route registration.
- `WithContentTypeBuilderUIStaticAssetOptions(cfg admin.Config, opts ...StaticAssetsOption) ContentTypeBuilderUIOption` - Inputs: admin config and the same static asset options passed to `NewStaticAssets`. Outputs: content-builder UI option that keeps rendered shell asset URLs aligned with the mounted shell prefix.
- `ResolveDiskAssetsDir(marker string, candidates ...string) string` - Inputs: marker file + candidate directories. Outputs: first matching directory.
- `RegisterAdminUIRoutes(r router.Router[T], cfg admin.Config, adm *admin.Admin, auth admin.HandlerAuthenticator, opts ...UIRouteOption) error` - Inputs: router/config/admin/auth wrapper + options. Outputs: error (registers dashboard + notifications UI routes, and injects feature-aware view context such as `activity_enabled` + `body_classes`).
- `WithContentEntryDataGridStateStore(cfg PanelDataGridStateStoreOptions) ContentEntryUIOption` - Inputs: DataGrid state-store config for content-entry list templates. Outputs: content-entry route option (default mode remains localStorage when unset).
- `WithContentEntryDataGridURLState(cfg PanelDataGridURLStateOptions) ContentEntryUIOption` - Inputs: URL sync limits/token config for content-entry list templates. Outputs: content-entry route option.
- `WithContentEntryUpdateIntentPolicy(policy ContentEntryUpdateIntentPolicy) ContentEntryUIOption` - Inputs: nested-array update-intent policy. Outputs: content-entry route option that patches configured array paths before persistence.
- Nested object-array patch/preserve behavior for CMS content-entry forms is an explicit opt-in contract, not the default. Use schema/UI schema/capability metadata or `WithContentEntryUpdateIntentPolicy(...)`; custom renderers must submit the same row and array markers as generated go-formgen repeatable arrays.
- `RegisterAuthUIRoutes(r router.Router[T], cfg admin.Config, routeAuth *auth.RouteAuthenticator, opts ...AuthUIOption) error` - Inputs: router/config/go-auth route authenticator + options. Outputs: error (registers login/reset UI routes plus `POST /logout`; `GET /logout` is registered only when `WithAuthUILogoutGET(true)` is passed).
- `RegisterRegistrationUIRoutes(r router.Router[T], cfg admin.Config, opts ...RegistrationUIOption) error` - Inputs: router/config + options. Outputs: error (registers signup UI route).
- `AuthUIViewContext(cfg admin.Config, state AuthUIState, paths AuthUIPaths) router.ViewContext` - Inputs: config/state/paths; outputs: view context with auth flags + paths (`base_path`, `api_base_path`, `asset_base_path`, `preferences_api_path`).
- Browser/admin routes rendered through quickstart now carry CSRF helpers automatically. Generated forms should include the hidden `_token` field, and same-origin JavaScript writes should send `X-CSRF-Token` from `meta[name="csrf-token"]`.
- For cookie-backed browser pages, prefer the package-managed browser protection path instead of a custom CSRF wrapper so origin checks, CSRF header emission, and session-key resolution stay aligned with `go-auth`.
- `RegisterAuthUIRoutes` applies standalone Auth UI CSRF middleware to login and password-reset forms. Use `WithAuthUICSRFSecureKey(...)` when you need a stable stateless CSRF signing key across restarts or multi-instance deployments.
- When an authenticated admin shell renders logout, use a POST form with the page's ambient `csrf_field`, and pass `WithAuthUILogoutAuthenticator(authn)` or `WithAuthUILogoutMiddleware(mw)` so `/logout` validates with the same browser auth/CSRF contract that produced the token. Login and password reset remain on the standalone Auth UI CSRF path.
- `WithAuthUILogoutGET(true)` remains an opt-in compatibility route. If a logout authenticator or middleware is configured, the GET route is wrapped by the same middleware; new shells should keep POST logout canonical. Without that option, `GET /admin/logout` is a route miss.
- `WithProtectedAppAuth(routeAuth *auth.RouteAuthenticator, cfg auth.Config, opts ...admin.GoAuthAuthenticatorOption) *admin.GoAuthAuthenticator` - Inputs: shared go-auth route authenticator plus canonical admin config with protected-app roots. Outputs: a protected-app browser/API authenticator that reuses the same actor/session and CSRF model as admin routes.
- `AttachDebugMiddleware(r router.Router[T], cfg admin.Config, adm *admin.Admin)` - Inputs: router/config/admin; outputs: none (registers debug request capture middleware).
- `AttachDebugLogHandler(cfg admin.Config, adm *admin.Admin)` - Inputs: config/admin; outputs: none (wires slog debug handler).
- `ConfigureExportRenderers(bundle *ExportBundle, templatesFS fs.FS, opts ...ExportTemplateOption) error` - Inputs: export bundle + templates FS + options. Outputs: error (registers template/PDF renderers).
- `NewModuleRegistrar(adm *admin.Admin, cfg admin.Config, modules []admin.Module, isDev bool, opts ...ModuleRegistrarOption) error` - Inputs: admin, config, module list, dev flag, options. Outputs: error.
- `WithModuleFeatureGates(gates gate.FeatureGate) ModuleRegistrarOption` - Inputs: feature gate; outputs: option to filter modules/menu items.
- `WithModuleFeatureDisabledHandler(handler func(feature, moduleID string) error) ModuleRegistrarOption` - Inputs: handler; outputs: option for disabled modules.
- `WithTranslationCapabilityMenuMode(mode TranslationCapabilityMenuMode) ModuleRegistrarOption` - Inputs: translation menu seeding mode (`tools` default, `none` opt-out); outputs: option controlling whether translation dashboard/queue/exchange links are added to server-seeded navigation.
- `BuildMenuSeedPlan(opts MenuSeedPlanOptions) (MenuSeedPlan, error)` - Inputs: menu code/locale, module contributors, optional parent replacement, module/target parent overrides, base item transforms, module item transforms, and extra base items. Outputs: deterministic expected generated menu rows used by quickstart seeding and reconciliation.
- `WithMenuSeedPlanOptions(mutator func(*MenuSeedPlanOptions)) ModuleRegistrarOption` - Inputs: mutator for the expected menu seed plan. Outputs: option for advanced host layout control before generated rows are reconciled.
- `WithMenuSeedParents(parents ...admin.MenuItem) ModuleRegistrarOption` - Inputs: host-defined parent/group rows. Outputs: option that replaces default quickstart parent groups for the primary menu while retaining module and translation capability collection.
- `WithMenuSeedTargetParentOverride(targetKey, parentID string) ModuleRegistrarOption` - Inputs: stable menu target key and parent ID. Outputs: option that moves matching generated rows without copying quickstart seed internals.
- `WithMenuSeedModuleParentOverride(moduleID, parentID string) ModuleRegistrarOption` - Inputs: module ID and parent ID. Outputs: option that moves all menu rows contributed by that module under the given parent.
- `WithMenuSeedBaseItemTransform(transforms ...MenuSeedBaseItemTransform) ModuleRegistrarOption` - Inputs: transforms for quickstart base/capability rows such as translation dashboard, queue, assignments, and exchange links. Outputs: option for host label, target, permission, parent, or sparse sort-weight tweaks before generated rows are reconciled.
- `WithMenuSeedItemTransform(transforms ...MenuSeedItemTransform) ModuleRegistrarOption` - Inputs: transforms for module-contributed menu rows. Outputs: option for host label, permission, parent, or sparse sort-weight tweaks before generated rows are reconciled.
- `ReconcileGeneratedNavigation(ctx context.Context, opts NavigationReconcileOptions) (NavigationReconcileReport, error)` - Inputs: menu service, expected items, locale, menu code, apply/dry-run mode, raw-inventory scope, and optional destructive cleanup. Outputs: creates, updates, preserved user rows, duplicate identities, destructive candidates, stale target cleanup, route failures, capability omissions, permission-filtered rows, preserved generated fields, parent-prune diagnostics, raw-inventory availability, raw-present-but-not-rendered rows, and coordination support diagnostics.
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
- The form generation guide covers the end-to-end form generation pipeline, UI schema overlays, component registration, submission parsing, and nested-array update-intent contract.

- `DefaultSecureLinkConfig(basePath string) SecureLinkConfig` - Inputs: base path; outputs: securelink defaults.
- `DefaultSecureLinkRoutes(basePath string) map[string]string` - Inputs: base path; outputs: securelink routes map.
- `NewSecureLinkManager(cfg SecureLinkConfig) (types.SecureLinkManager, error)` - Inputs: securelink config; outputs: go-users securelink manager.
- `NewNotificationsSecureLinkManager(cfg SecureLinkConfig) (links.SecureLinkManager, error)` - Inputs: securelink config; outputs: go-notifications securelink manager (delegates to `go-notifications/adapters/securelink.NewManager`).
- `ApplySecureLinkManager(cfg *userssvc.Config, manager types.SecureLinkManager, opts ...SecureLinkUsersOption)` - Inputs: go-users config + manager; outputs: config mutated with securelink routes/manager.
- `NewSecureLinkNotificationBuilder(manager links.SecureLinkManager, opts ...linksecure.Option) links.LinkBuilder` - Inputs: notification manager + options; outputs: notification link builder.
- `RegisterOnboardingRoutes(r router.Router[T], cfg admin.Config, handlers OnboardingHandlers, opts ...OnboardingRouteOption) error` - Inputs: router/config/handlers; outputs: error (registers onboarding API routes).
- `RegisterUserMigrations(client *persistence.Client, opts ...UserMigrationsOption) error` - Inputs: persistence client + options; outputs: error (registers go-auth/go-users migrations using canonical profiles + source labels).

## Routing policy overrides
Quickstart exposes the `admin/routing` policy directly. Host roots and per-module mount overrides remain explicit, and startup logs plus doctor output now include effective roots, resolved module mounts, and conflicts.

Release policy for quickstart matches core:

- mounted modules must expose `RouteContract() routing.ModuleContract`
- routing validation is strict fail-fast in every environment
- public API exposure is opt-in through `PublicAPIRoutes`
- the supported diagnostics surfaces are `adm.RoutingReport()`,
  `adm.RoutingPlanner().Manifest()`, startup logs, and the `quickstart.routing`
  doctor check

The routing guide covers the published external-module contract,
manifest-diff workflow, and PR review guidance.

```go
cfg := quickstart.NewAdminConfig(
	"/admin",
	"Admin",
	"en",
	quickstart.WithRoutingConfig(routing.Config{
		Roots: routing.RootsConfig{
			AdminRoot:     "/control",
			APIRoot:       "/ops/admin/api",
			PublicAPIRoot: "/api/v2",
		},
		Modules: map[string]routing.ModuleConfig{
			"preferences": {
				Mount: routing.ModuleMountOverride{
					UIBase: "/control/workbench/preferences",
				},
			},
			"partner_tools": {
				Mount: routing.ModuleMountOverride{
					UIBase:  "/control/workbench/partner-tools",
					APIBase: "/ops/admin/api/modules/partner-tools",
				},
			},
		},
	}),
)
```

External-style modules keep declaring relative contracts and let the host compute absolute paths:

```go
type PartnerToolsModule struct{}

func (*PartnerToolsModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{ID: "partner.tools"}
}

func (*PartnerToolsModule) RouteContract() routing.ModuleContract {
	return routing.ModuleContract{
		Slug: "partner_tools",
		UIRoutes: map[string]string{
			"partner_tools.index": "/",
		},
		APIRoutes: map[string]string{
			"partner_tools.ping": "/ping",
		},
	}
}

func (*PartnerToolsModule) Register(ctx admin.ModuleContext) error {
	ctx.Router.Get(ctx.Routing.RoutePath(routing.SurfaceUI, "partner_tools.index"), handler)
	ctx.ProtectedRouter.Get(ctx.Routing.RoutePath(routing.SurfaceAPI, "partner_tools.ping"), apiHandler)
	return nil
}
```

Fiber runtime route options can relax adapter behavior for path matching, but they do not disable `admin/routing` startup validation. Route ownership and path conflicts still fail before router mutation.

## Protected app quickstart

Protected-app support extends the existing host-router surface model instead of introducing a second application container.

- Enable it explicitly with `cfg.Routing.ProtectedAppEnabled = true`.
- Omit roots to use the canonical defaults `/app` and `/app/api`.
- Root overrides are only active when `ProtectedAppEnabled` is true; stale `/app` values do not reserve the surface by themselves.
- Map host runtime config such as `protected_app.enabled`, `protected_app.root`, and `protected_app.api_root` into `cfg.Routing`; quickstart does not read `app.json` directly.
- Use `host.ProtectedAppUI()` and `host.ProtectedAppAPI()` for explicit route ownership.
- Use `WithProtectedAppAuth(...)` for browser/API auth semantics on `/app` and `/app/api`.
- Use `quickstart/protectedapp` helpers for shell registration, bundle mounting, reserved-prefix derivation, and SPA history fallback.

Example:

```go
cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")
cfg.Routing.ProtectedAppEnabled = true

host := quickstart.NewHostRouter(server.Router(), cfg)

host.ProtectedAppAPI().Get("/app/api/me", apiHandler)

appAuth := quickstart.WithProtectedAppAuth(routeAuth, authCfg)
host.ProtectedAppUI().Get("/app/settings", appAuth.WrapHandler(settingsPage))

if err := protectedapp.RegisterShell(host.ProtectedAppUI(), cfg, appAuth.WrapHandler(appShell)); err != nil {
	panic(err)
}
if err := protectedapp.MountBundle(host.Static(), cfg, "/app/assets", "./dist"); err != nil {
	panic(err)
}
if err := protectedapp.RegisterHistoryFallback(
	host.ProtectedAppUI(),
	cfg,
	appAuth.WrapHandler(appShell),
	"/app/assets",
	"/admin",
	"/api",
	"/static",
	"/.well-known",
); err != nil {
	panic(err)
}
```

Notes:

- Existing hosts that do not enable protected-app routing keep their current `/app` behavior unchanged.
- `WithProtectedSurfaceRoots(...)` inherits canonical roots for the side you do not override, so partial overrides keep browser/API split semantics intact.
- `protectedapp.RegisterHistoryFallback(...)` is intended for Fiber-backed quickstart hosts. On `httprouter`-backed hosts, use explicit app routes instead of the SPA history-fallback helper.
- `quickstart.BuildSessionUser(...)` reads the authenticated actor/claims from the same protected-app request context, so app handlers can project session metadata without a second auth adapter.

Split deployment:

- The same primitives work if you split surfaces later. A public-site deployment only mounts `PublicSite()` plus site fallback. A protected-app deployment mounts `ProtectedAppUI()`, `ProtectedAppAPI()`, and `WithProtectedAppAuth(...)`. An admin deployment mounts `AdminUI()`, `AdminAPI()`, and the existing admin auth wiring.
- Keep the configured roots aligned across deployments. The public site should still reserve the protected-app and admin prefixes, while the protected-app deployment should own its own `/app` and `/app/api` surfaces directly instead of reintroducing a different routing model.

## Command routing
Quickstart defaults to inline command execution. To opt into queued execution, configure policy and queue wiring explicitly.

## RPC transport hardening defaults
- RPC transport is opt-in (`WithRPCTransport`).
- When enabled, quickstart requires an authenticator by default and fails startup when RPC routes are mounted if missing.
- Unauthenticated RPC transport must be opted into explicitly with `allow_unauthenticated=true`.
- Discovery route mounting is disabled by default (`discovery_enabled=false`).
- Admin command RPC dispatch is deny-by-default until command rules are configured (`command_rules` / `commands.rpc.commands`).
- Command RPC permission checks use resource-role authorization by default. Set `permission_mode=exact` on the transport or individual command rules when commands require explicit grants such as operational permissions.

The RPC guide covers the full transport, command dispatch, and workflow RPC
contract.

### Dev inline (default)
```go
adm, _, err := quickstart.NewAdmin(
	cfg,
	quickstart.AdapterHooks{},
	quickstart.WithCommandExecutionPolicy(admin.CommandExecutionPolicy{
		DefaultMode: command.ExecutionModeInline,
	}),
)
```

### Dev local queue (same process API + worker)
```go
queueRegistry := queuecommand.NewRegistry()
_ = commandregistry.AddResolver("queue", queuecommand.QueueResolver(queueRegistry))

queueStorage := queuepostgres.NewStorage(db)
queueAdapter := queuepostgres.NewAdapter(queueStorage)

adm, _, err := quickstart.NewAdmin(
	cfg,
	quickstart.AdapterHooks{},
	quickstart.WithCommandExecutionPolicy(admin.CommandExecutionPolicy{
		PerCommand: map[string]command.ExecutionMode{
			"esign.pdf.remediate": command.ExecutionModeQueued,
		},
	}),
	quickstart.WithCommandQueueRouting(quickstart.CommandQueueRoutingConfig{
		Enabled:  true,
		Enqueuer: queueAdapter,
		Registry: queueRegistry,
	}),
)
if err != nil {
	return err
}
if err := commandregistry.Start(context.Background()); err != nil {
	return err
}
worker, err := queuecommand.StartLocalWorker(context.Background(), queueAdapter, queueRegistry, queuecommand.LocalWorkerConfig{})
if err != nil {
	return err
}
defer worker.Stop(context.Background())
```

### Prod remote worker (API process only)
```go
queueRegistry := queuecommand.NewRegistry()
_ = commandregistry.AddResolver("queue", queuecommand.QueueResolver(queueRegistry))

queueStorage := queuepostgres.NewStorage(db)
queueAdapter := queuepostgres.NewAdapter(queueStorage)

adm, _, err := quickstart.NewAdmin(
	cfg,
	quickstart.AdapterHooks{},
	quickstart.WithCommandExecutionPolicy(admin.CommandExecutionPolicy{
		PerCommand: map[string]command.ExecutionMode{
			"esign.pdf.remediate": command.ExecutionModeQueued,
		},
	}),
	quickstart.WithCommandQueueRouting(quickstart.CommandQueueRoutingConfig{
		Enabled:  true,
		Enqueuer: queueAdapter,
		Registry: queueRegistry,
	}),
)
if err != nil {
	return err
}
if err := commandregistry.Start(context.Background()); err != nil {
	return err
}
```

Run workers in a separate process with the same queue adapter + command registry wiring (`queuecommand.RegisterAll`/`StartLocalWorker`).

Translation quickstart modules keep their existing async options and can now reuse command policy primitives:
- `TranslationExchangeConfig.CommandExecutionMode`
- `TranslationQueueConfig.CommandExecutionMode`

### Command routing observability

When using queued routing (for example `esign.pdf.remediate`), quickstart + e-sign emit structured dispatch logs with canonical routing fields:
- `command_id`
- `execution_mode`
- `dispatch_id`
- `correlation_id`
- `accepted`

Runtime counters are exposed through `examples/esign/observability.Snapshot()` including:
- `CommandDispatchAcceptedTotal`, `CommandDispatchRejectedTotal`, `CommandDispatchAcceptedByMode`
- `DedupStoreMissTotal`, `DedupStoreMissByCommandID`
- `RemediationCandidateTotal`, `RemediationSucceededTotal`, `RemediationFailedTotal`
- `RemediationRetryingTotal`, `RemediationDeadLetterTotal`
- `RemediationLockContentionTotal`, `RemediationLockTimeoutTotal`

Alert evaluation (`observability.EvaluateAlerts`) now includes:
- `command.dedup_store_miss_detected`
- `pdf.remediation_retrying_high`
- `pdf.remediation_dead_letter_high`
- `pdf.remediation_lock_contention_high`
- `pdf.remediation_lock_timeout_high`

## User management
Quickstart can wire go-users repositories and expose the built-in users module. The `users` feature flag is enabled by default in `DefaultAdminFeatures()`; if you disable it, the users module is skipped and user/role endpoints return `FeatureDisabledError`.

Use `WithGoUsersUserManagement` to provide the required repositories (`AuthRepo`, `InventoryRepo`, `RoleRegistry`) and optional `ProfileRepo` + `ScopeResolver`. This wires `UserRepository`, `RoleRepository`, and (when provided) `ProfileStore`. When `ScopeResolver` is omitted, quickstart uses `ScopeBuilder(cfg)` so single-tenant defaults apply to the standard go-users user, role, and profile adapters. Explicit resolvers still win.

Bulk role operations should use panel bulk routes (`/panels/:panel/bulk/:action`, e.g. `/admin/api/panels/users/bulk/assign-role`). Legacy static routes are disabled by default; enable them only for compatibility:

```go
quickstart.WithLegacyUserRoleBulkRoutes()
```

Quickstart Fiber defaults use `prefer_static` path conflict resolution, so absolute static routes (for example `/users/bulk/assign-role`) can coexist with wildcard siblings (for example `/users/bulk/:action`) deterministically. Override path conflict behavior with `WithFiberAdapterConfig(...)`.
Quickstart also defaults Fiber request-header `ReadBufferSize` to `16KB`; override with `WithFiberConfig(...)` when your deployment needs a different limit.

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
\t\tScopeResolver: scopeResolver, // optional; omitted uses quickstart.ScopeBuilder(cfg)
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
- `RegisterContentEntryUIRoutes` must register concrete canonical routes before the
  generic `/content/:name/*` handlers. Reordering them can cause paths like
  `/admin/content/documents/new` to be captured by the generic matcher and skip
  the intended browser handler.
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

The CMS guide contains the detailed translation productization contract and
rollout rules.

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
  - `admin.translations.export` -> `POST /admin/api/translations/exchange/export`
  - `admin.translations.import.view` -> `GET /admin/api/translations/exchange/template`
  - `admin.translations.import.validate` -> `POST /admin/api/translations/exchange/import/validate`
  - `admin.translations.import.apply` -> `POST /admin/api/translations/exchange/import/apply`

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
- `POST /admin/api/translations/exchange/export`
- `GET /admin/api/translations/exchange/template`
- `POST /admin/api/translations/exchange/import/validate`
- `POST /admin/api/translations/exchange/import/apply`

Row linkage fields (`rows[*]`):
- `resource`
- `entity_id`
- `family_id`
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

### Grouped translation-family lists

Quickstart grouped translation UX expects sibling locale rows to exist as real
list records.

Behavior:
- `locale=en` stays locale-scoped.
- `locale=all` requests wildcard list reads for translation-enabled panels.
- `group_by=family_id` groups already-expanded sibling rows into one family row
  with locale children.
- `family_id=<id>` without an explicit locale returns all siblings for that
  family.

This contract applies to both structured content panels and page-backed panels
when their repositories/read adapters use the CMS translation-family expansion
path.

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
- After changing role permissions, reload the page so permission checks and diagnostics reflect current role assignments.

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

The standard `WithGoUsersUserManagement` path uses these rules automatically
when `ScopeResolver` is omitted. Custom repositories, handlers, or direct
go-users registry calls must use `quickstart.ScopeBuilder(cfg)` or an
equivalent config-aware resolver themselves.

The authentication and permissions guide covers the broader role, scope, debug
console, doctor, and permissions-panel workflow.

go-admin request and service paths should resolve trusted tenant/org scope
through `Admin.EffectiveScope(...)` or `Admin.EffectiveScopeFromRequest(...)`.
These helpers preserve explicit trusted scope, apply configured defaults only in
single-tenant mode, and ignore browser query `tenant_id` / `org_id` values for
authenticated actor scope. Repository code should receive the resolved scope and
apply explicit predicates; do not add global persistence hooks that inject scope
into every query.

Defaults:
- tenant: `11111111-1111-1111-1111-111111111111`
- org: `22222222-2222-2222-2222-222222222222`

Explicit config:

```go
cfg := quickstart.NewAdminConfig("/admin", "Admin", "en",
	quickstart.WithScopeConfig(quickstart.ScopeConfig{
		Mode:            quickstart.ScopeModeSingle,
		DefaultTenantID: "11111111-1111-1111-1111-111111111111",
		DefaultOrgID:    "22222222-2222-2222-2222-222222222222",
	}),
)
```

Quickstart registers a `quickstart.scope_drift` doctor check for single-tenant
translation data. Hosts can wire it with:

```go
adm, _, err := quickstart.NewAdmin(
	cfg,
	hooks,
	quickstart.WithScopeDriftInspector(quickstart.NewBunScopeDriftInspector(db)),
)
```

The check inspects the allowlisted translation tables `content_families`,
`locale_variants`, `family_blockers`, and `translation_assignments` for blank
tenant/org rows. It reports counts and default scope metadata, skips
multi-tenant mode, reports unavailable/missing tables as informational findings,
and never mutates data.

When the same Bun inspector is wired, quickstart also registers the explicit
command `quickstart.scope_drift.repair`. Dispatch without `apply` to dry-run the
allowlisted tables; dispatch with `apply: true` to backfill blank tenant/org
values to the configured single-tenant defaults. Apply mode rejects multi-tenant
configurations and never updates tables outside the allowlist.

## Template functions
`NewViewEngine` wires `DefaultTemplateFuncs()` when no template functions are supplied. Prefer `WithViewURLResolver(adm.URLs())` (or `WithTemplateURLResolver(adm.URLs())`) so `adminURL` resolves via URLKit; `WithViewBasePath(cfg.BasePath)` remains as a fallback for legacy setups. `WithViewTemplateFuncs` is a strict override; use `MergeTemplateFuncs` if you want to keep defaults and add/override a subset.
The go-router Pongo2 engine treats these helpers as functions (globals), not filters, so call them like `{{ singularize(resource_label|default:resource)|title }}` instead of `{{ resource_label|singularize }}`.

`adminURL` is available by default. Use it for admin-relative links and admin-hosted assets such as `{{ adminURL("login") }}` or `{{ adminURL("assets/dist/dashboard/index.js") }}`. When a template intentionally supports a separate asset host or CDN, prefer `asset_base_path` instead of `adminURL`.

Template function options let you override widget title labels without touching the core map:
- `WithWidgetTitleOverrides(overrides map[string]string) TemplateFuncOption` - merges label overrides into defaults.
- `WithWidgetTitleMap(titles map[string]string) TemplateFuncOption` - replaces the default map entirely.
- `WithWidgetTitleFunc(fn func(string) string) TemplateFuncOption` - provides a custom resolver.
- Widget definition constants are available via `admin.Widget...`, for example `admin.WidgetUserProfileOverview`.
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
		admin.WidgetUserProfileOverview: "Profile Overview",
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
	routeAuth,
	quickstart.WithAuthUILogoutAuthenticator(authn),
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
- `datagrid_config.translation_ux_enabled` (optional)
- `datagrid_config.enable_grouped_mode`, `default_view_mode`, `group_by_field` (optional)
- `datagrid_config.state_store` (optional: `{mode, resource, sync_debounce_ms, hydrate_timeout_ms, max_share_entries}`)
- `datagrid_config.url_state` (optional: `{max_url_length, max_filters_length, enable_state_token}`)
- `datagrid_config.export_config`

State persistence behavior:
- default mode is localStorage (`state_store` omitted or `mode=local`).
- optional preferences mode (`mode=preferences`) hydrates/syncs user state through `/api/panels/preferences`, with local cache fallback.
- URL sync writes compact query state; when limits are exceeded, DataGrid can fallback to `state=<token>` instead of writing large query payloads.

Compatibility keys (`datatable_id`, `list_api`, `action_base`, `export_config`) are still present for legacy templates, but new/updated templates should read from `datagrid_config` first.

The CRUD guide covers the full CRUD/DataGrid/action wiring contract. The search
guide covers admin global search, public site search, `go-search` adapter
wiring, and panel DataGrid search distinctions.

Password reset UI defaults to two pages:

- Request: `/admin/password-reset` (template `password_reset`)
- Confirm: `/admin/password-reset/confirm` (template `password_reset_confirm`)

Override the confirm route or template with `WithAuthUIPasswordResetConfirmPath` and
`WithAuthUIPasswordResetConfirmTemplate`.

### Auth UI SSO provider context
The default login template reads optional `sso_providers` from auth UI view
context. Integrations such as `go-auth/adapters/goadmin` can inject it with
`WithAuthUIViewContextBuilder(...)`; go-admin does not discover providers,
configure OIDC, handle callbacks, or receive secrets.

Each provider entry is a display-safe map:

- `key`: stable non-secret provider identifier.
- `label`: required user-facing provider name.
- `login_url`: required begin-login URL for enabled providers.
- `icon_class`: optional CSS/icon class metadata.
- `icon_url`: optional image/icon asset URL.
- `disabled_reason`: optional non-secret reason for unavailable providers.

Entries without a usable `label` are ignored. Entries with `label`,
`login_url`, and no `disabled_reason` render as sign-in links. Entries with a
`disabled_reason` render disabled without `href`. A usable `login_url` is a
non-empty relative URL or `http`/`https` URL without control characters; blank
URLs and unsafe schemes never produce active links. Missing, empty, or fully
malformed provider lists omit the SSO divider and provider section.

```go
quickstart.WithAuthUIViewContextBuilder(func(ctx router.ViewContext, c router.Context) router.ViewContext {
	ctx["sso_providers"] = []map[string]any{
		{
			"key":       "acme",
			"label":     "Acme ID",
			"login_url": "/admin/auth/sso/acme",
		},
	}
	return ctx
})
```

### Theme assets for auth UI
Auth and registration UI routes support theme assets (`logo`, `icon`, `favicon`) via dedicated options. Assets are exposed in templates as `theme.assets.logo`, `theme.assets.icon`, `theme.assets.favicon`, etc. Relative filenames are joined with the provided prefix; already resolved absolute URLs/paths are preserved.

Reserved branding semantics:

- `logo`: expanded sidebar / horizontal lockup
- `icon`: compact sidebar mark and auth-card icon
- `favicon`: browser/app icon

```go
authThemeAssets := map[string]string{
	"icon":    "icon.svg",
	"logo":    "logo.svg",
	"favicon": "favicon.svg",
}
authThemeAssetPrefix := path.Join(cfg.BasePath, "assets")

if err := quickstart.RegisterAuthUIRoutes(
	router,
	cfg,
	routeAuth,
	quickstart.WithAuthUILogoutAuthenticator(authn),
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

Auth templates prefer `theme.assets.icon` when it exists and fall back to `theme.assets.logo`.

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
Quickstart wires CMS workflows through the shared go-admin workflow system. This
section covers startup helpers; the workflow guide covers the full
workflow/state-machine contract.

To start from defaults and override only a subset, register defaults before your
overrides or opt in to default registration on a custom engine:

```go
workflow := admin.NewFSMWorkflowEngine()
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
3. persisted workflow runtime binding (`content_type`, then `trait`, then `global`)
4. no workflow

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
2. Add runtime bindings for shared defaults.
3. Add explicit `workflow_id` for content types that must override defaults.
4. Remove legacy `workflow` after validation.

External workflow config (YAML/JSON) can be loaded at startup:

```yaml
schema_version: 1
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
bindings:
  - scope_type: trait
    scope_ref: editorial
    workflow_id: editorial.default
    priority: 100
    status: active
```

```go
adm, _, err := quickstart.NewAdmin(
    cfg,
    hooks,
    quickstart.WithWorkflowConfigFile("workflow_config.yaml"),
)
```

Definitions are registered into the configured workflow engine during startup.
Bindings are seeded when `WithWorkflowRuntime(...)` is also provided.

Validation fails fast with actionable field errors for:
- unsupported schema versions
- invalid workflow definitions (missing `initial_state`, transition fields, duplicate transition names)
- bindings referencing unknown workflow IDs

Persisted workflow runtime can be wired for dynamic workflow and binding management:

```go
runtime := admin.NewWorkflowRuntimeService(
    admin.NewInMemoryWorkflowDefinitionRepository(),
    admin.NewInMemoryWorkflowBindingRepository(),
)

adm, _, err := quickstart.NewAdmin(
    cfg,
    hooks,
    quickstart.WithAdminDependencies(admin.Dependencies{
        Workflow: admin.NewFSMWorkflowEngine(),
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

The workflow guide covers operational migration, rollback, and persistence
details.

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
  page_entities: ["landing_pages"] # optional: additional entities that use page checker
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
- `pages` is the go-cms Pages service policy entity and uses the page checker by
  default; `page` is the backing content type slug used when page records are
  bridged through generic content APIs. Other entities use the content checker
  unless listed in `page_entities`; quickstart does not use a page checker as
  fallback for content entities or a content checker as fallback for page
  entities.
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
- Every content type included in translation family readiness needs effective
  `publish` requirements. Use `ValidateTranslationPolicyCoverage` when hosts
  know the family content types at startup; an entity key without publish
  locales or required fields is not enough.
- The default policy needs page/content services that implement
  `CheckTranslations`. Quickstart discovers them from go-cms wiring when
  possible; use `WithTranslationPolicyServices` when the CMS container is not
  discoverable or when custom entity routing needs explicit page/content
  services.
- Family readiness is persisted by sync. After policy, checker-service, or CMS
  fixture changes, rerun family sync so `content_families`, `locale_variants`,
  and `family_blockers` match the current policy.
- `policy_denied` with `details.reason=policy_unavailable` means policy
  configuration or checker wiring is missing; it is not a missing-translation
  task for editors.
- The CMS guide covers the operational contract and troubleshooting workflow.

Wiring example:

```go
policyCfg := quickstart.TranslationPolicyConfig{
	Required: map[string]quickstart.TranslationPolicyEntityConfig{
		"articles": {
			"publish": {Locales: []string{"en", "es"}},
		},
	},
}

if _, err := quickstart.ValidateTranslationPolicyCoverage(policyCfg, []string{"articles"}); err != nil {
	return err
}

adm, _, err := quickstart.NewAdmin(
	cfg,
	hooks,
	quickstart.WithTranslationPolicyConfig(policyCfg),
	// Use explicit services when go-cms checkers are not auto-discoverable.
	quickstart.WithTranslationPolicyServices(quickstart.TranslationPolicyServices{
		Pages:   pageService,
		Content: contentService,
	}),
)
if err != nil {
	return err
}
```

### Theme selector + manifest
When using go-theme, pass the selector + manifest into quickstart so the
Preferences UI can list available variants. The theme guide covers the full
theme contract, resolution order, and payload shape.

```go
selector, manifest, err := quickstart.NewThemeSelector(
	cfg.Theme,
	cfg.ThemeVariant,
	cfg.ThemeTokens,
	quickstart.WithThemeAssets(path.Join(cfg.BasePath, "assets"), map[string]string{
		"logo":    "logo.light.svg",
		"icon":    "icon.light.svg",
		"favicon": "favicon.svg",
	}),
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

If you build the admin manually, call `adm.WithAdminTheme(selector)` and
`adm.WithThemeManifest(manifest)` after initialization. Public-site theme
selection is separate; attach it with `quicksite.WithSiteTheme(selector)` or
`SiteConfig.ThemeProvider`.

The default quickstart manifest also exposes these sidebar brand tokens:

- `sidebar-brand-max-height`
- `sidebar-brand-max-width`
- `sidebar-brand-collapsed-size`
- `sidebar-brand-align`

Use `WithThemeAssets(...)` for manifest-relative theme assets and `WithThemeAssetURLs(...)` / `admin.Config.ThemeAssets` for final resolved URL overrides supplied by host config.

If you have local CSS that forces the sidebar logo to `width: 100%`, remove that override and configure branding through `logo`, `icon`, and the sidebar brand tokens instead.

## Public-site theme precedence

For `quickstart/site`, the packaged theme should be the primary public-site HTML
source and host-local wrappers should stay limited to compatibility glue. The
supported diagnostics surfaces are:

- `site_theme.manifest_partials` plus `site_theme.partials` in request/view context
- `site_theme.baseline` for selected-versus-approved variant checks
- `site.ResolveSiteThemeTemplateDiagnostics(...)` for concrete template winner and shadowed-source reporting

When mounting template filesystems, label them so precedence diagnostics stay readable:

```go
siteCfg.Views.TemplateFS = []fs.FS{
	site.LabelTemplateFS(themeFS, "garchen-archive-site", site.TemplateSourcePackagedTheme),
	site.LabelTemplateFS(hostOverlayFS, "host-overlay", site.TemplateSourceHostOverlay),
}
```

Use `site.home.page` when the public root route needs a dedicated homepage. If the host leaves `SiteThemeConfig.Variant` empty, the selector resolves the theme package `defaultVariant`; use `SiteThemeConfig.BaselineVariant` to warn when a downstream app forces a non-approved public baseline.

## Public-site error rendering policy

`quickstart/site` supports ordered concrete and theme-backed HTML error templates while preserving the legacy `ErrorTemplate`, `ErrorTemplatesByStatus`, and `ErrorTemplatesByCode` fields. Explicit policy references run before the matching legacy candidates; selection remains code-specific, then status-specific, then generic fallback.

```go
siteCfg.Views.ErrorPolicy = site.SiteErrorTemplatePolicy{
	ByStatus: map[int][]site.SiteTemplateRef{
		http.StatusNotFound: {
			{
				ThemeKey:        "site.error.404_page",
				DefaultTemplate: "site/error/404",
			},
		},
	},
	Fallback: []site.SiteTemplateRef{
		{Template: "site/error"},
	},
}
```

Theme keys resolve after request theme context is available through `site_theme.manifest_partials` and the existing aliases. A stable default is used only when the key is absent; unsafe or invalid resolved targets advance to the next reference. Every template attempt is rendered into an isolated router response capture, so missing templates and nested include failures cannot leak partial bytes into the selected fallback.

- `site.RenderSiteErrorHTML` is the HTML-only host API. Keep application-specific JSON negotiation and payloads in the host, then call the shared renderer for HTML.
- `site.SiteErrorContextProvider` lets registered site modules add safe localized fields after normal request context has run. Normal `SiteModule.ViewContext` methods are not rerun.
- The base `site_error` model contains only normalized `code`, `status`, and locale/base-path-aware `home_href`. Providers own any visitor copy or compatibility projections.
- `site.SiteErrorRenderObserver` receives sanitized attempt/selection provenance without view data, rendered bytes, tokens, or stack traces. Observer panics cannot change the visitor response.
- `site.ResolveSitePublicPath` converts a canonical path into the configured locale/base-path public path and avoids duplicate locale prefixes.
- `HEAD` preserves the requested status and headers without a body. If every candidate fails, the response contains only the requested status.

Legacy configuration remains valid. Use `ErrorPolicy` when candidate ordering needs theme keys or multiple fallbacks; existing single-template fields do not require migration.

## Public-site render cache

`quickstart/site.WithRenderCache(store, policy)` enables anonymous rendered HTML caching for public CMS delivery routes. `quickstart/site` owns policy, keying, eligibility, response replay, and unsafe-header filtering; host apps own rollout, host-specific policy mapping, and application-specific invalidation wiring.

- Use `site.NewRenderCacheRuntime(ctx, cfg, policy)` when the host wants quickstart-owned memory or Valkey store construction, startup diagnostics, diagnostic observation, and debug-panel state. Hosts that already own a custom backend can still pass it directly through `WithRenderCache`.
- `site.RenderCacheConfig` controls backend setup (`memory` or `valkey`), debug flags, fail-open/fail-closed startup behavior, tag-index requirements, capture limits, render version, and sanitized diagnostic config. `site.RenderCachePolicy` remains the public-site eligibility and keying policy.
- When runtime config and policy overlap, the runtime config is authoritative in the returned `RenderCacheRuntime.Policy`; use the incoming policy for host-specific eligibility inputs such as namespaces not represented in config, allowlists, auth cookie names, bypass predicates, template renderers, and stale revalidators.
- Valkey setup supports URL parsing, address fallback, username/password, DB selection, TLS, TLS skip verify, single-client mode, and disabled client-side cache. Startup diagnostics redact URL userinfo and credential-bearing query values.
- `site.RegisterRenderCacheDebugPanel(runtime)` registers the built-in `site-render-cache` debug panel backend. The debug console and toolbar include the matching built-in client renderer, so enabled hosts get the purpose-built panel instead of generic JSON.
- The runtime snapshot is process-local by design. It reports configured/active state, backend, status, scope, startup errors, sanitized config, capabilities, counters, latest cached metadata, observed key metadata, recent operations/errors, and the last clear command.
- Clear commands use the existing debug clear-panel transport and record results in the follow-up snapshot. Shared invalidation targets are exported as `site.RenderCacheAllSiteTag` and `site.RenderCacheKeyPrefix`; app-specific CMS invalidation should use the same values as the debug clear path.
- Standard go-router Fiber and HTTPRouter site contexts use router-backed response capture by default, so hosts do not need to provide `RenderCachePolicy.TemplateRenderer` for the common path.
- `RenderCachePolicy.TemplateRenderer` remains an optional override for tests, custom render stacks, and router contexts that cannot use non-committing template capture. Unsupported contexts bypass storage with an observable reason unless an override is configured.
- `RenderCachePolicy.MaxCaptureBodySize` defaults to `router.DefaultMaxCapturedBodySize`; oversized captures bypass storage and then use the normal template response path without committing a partial response.
- Cache hits replay stored `site.RenderedSiteResponse` values through the site-owned replay path. `quickstart/site` does not store or replay raw `router.CapturedResponse` values, so safe-header filtering, `HEAD` handling, debug headers, and freshness metadata stay under site-cache policy.
- `RenderCachePolicy.StaleTTL` enables stale-while-revalidate. Entries are stored for `FreshTTL + StaleTTL`; hits before `FreshUntil` report `hit`, hits through `StaleUntil` report `stale` and replay the stale response, and entries past `StaleUntil` are deleted and refreshed as misses. Use `RenderCachePolicy.StaleRevalidator` to schedule host-owned background regeneration without reusing a live router context. Stale revalidation is keyed per process so duplicate stale hits do not stampede one runtime, and callback panics are recovered.
- Use `RenderCachePolicy.AuthCookieNames` for host-specific auth cookies and `RenderCachePolicy.BypassPredicates` for application-specific auth, session, tenant, cart, A/B, or personalization signals. Built-in checks already cover Authorization, admin authenticated request context, go-auth claims/actor context, and common session/JWT cookie names such as `session_id` and `jwt`.
- `quickstart/render_cache_gocache_compat_test.go` compiles and exercises a real `github.com/goliatone/go-cache/stores/memory` store as a `site.RenderCacheStore`, including local tag API compatibility. The higher-level runtime API imports `go-cache` so hosts do not need to duplicate memory/Valkey construction.
- Use `RenderCachePolicy.RequireTagIndex: true` only with a shared non-memory backend for production tag invalidation. With this guard enabled, memory backends bypass caching, stores must implement `site.RenderCacheBackendDescriber` with a non-memory backend kind, stores without `site.RenderCacheTagInvalidator` bypass caching, and tag attachment failures remove the just-written entry before it can be served.
- Staging defaults: memory backend, `FreshTTL` around 30s-60s, `DebugHeaders: true`, and `DebugKeys` only in safe local/staging environments.
- Production defaults: shared backend or shared render-version source, `FreshTTL` around 5m-10m, active invalidation through render-version bumps or tag/prefix-capable stores before broad rollout.
- Static asset caching is separate from rendered HTML caching and should stay on the asset/CDN path.

Example:

```go
policy := quicksite.RenderCachePolicy{
	Enabled:              true,
	ApplicationNamespace: "archive-admin",
	EnvironmentNamespace: "staging",
	SiteNamespace:        "public-site",
	FreshTTL:             30 * time.Second,
	DebugHeaders:         true,
	AuthCookieNames:      []string{"admin_session", "debug_session"},
}

runtime, err := quicksite.NewRenderCacheRuntime(ctx, quicksite.RenderCacheConfig{
	Enabled:         true,
	Backend:         quicksite.RenderCacheBackendValkey,
	DebugHeaders:    true,
	RequireTagIndex: true,
	Valkey: quicksite.RenderCacheValkeyConfig{
		Address:   "127.0.0.1:6379",
		Namespace: "archive:staging:site-render-cache",
	},
}, policy)
if err != nil {
	return err
}
if err := quicksite.RegisterRenderCacheDebugPanel(runtime); err != nil {
	return err
}
quicksite.RegisterSiteRoutes(router, siteCfg, quicksite.WithRenderCache(runtime.Store, runtime.Policy))
```

## Routing migration notes

When migrating a host from the old shared-root quickstart/site setup to the explicit ownership model:

- register system, internal-ops, admin UI, admin API, public API, public site, and static routes through `quickstart.NewHostRouter(...)`; do not rely on calling `RegisterSiteRoutes(...)` before or after admin wiring to make ownership work
- replace callback matchers or magic fallback mode strings with `quicksite.SiteFallbackPolicy` plus the exported mode constants (`SiteFallbackModeDisabled`, `SiteFallbackModePublicContentOnly`, `SiteFallbackModeExplicitPathsOnly`)
- remove handler-level prefix guards for `/admin`, `/api`, `/.well-known`, `/assets`, and `/static`; reserved-prefix enforcement now belongs in the grouped router surfaces and the declarative fallback policy
- migrate old shared theme wiring from `adm.WithGoTheme(...)` to `adm.WithAdminTheme(...)`, and attach the public-site selector separately with `quicksite.WithSiteTheme(...)` or `SiteConfig.ThemeProvider`
- keep `/healthz` and `/status` on the internal-ops surface when enabled so those endpoints never resolve through site fallback

Recommended QA after migration:

- `GET /search` renders with the site theme surface
- an allowed unknown public content path resolves through site fallback
- `GET /admin/missing` returns the admin 404 behavior rather than a site page
- `GET /.well-known/...` bypasses site templates entirely
- enabled `/healthz` and `/status` endpoints return host-owned diagnostics payloads

The search guide covers route ownership and request/response contracts.

## Onboarding + secure links

Quickstart wires onboarding routes and securelink helpers so hosts can opt in with minimal setup.

Feature gate keys (system scope) used by onboarding flows:

- `users.invite`
- `users.password_reset`
- `users.signup`

Enable these via gate defaults (for example `WithFeatureDefaults`) or runtime overrides.
Alias policy: `users.self_registration` is not supported; use `users.signup`.

Securelink config defaults:

- `quickstart.DefaultSecureLinkConfig(basePath)` returns:
- `SigningKey=""` (manager disabled until a key is provided)
- `BaseURL="http://localhost:8080"`
- `QueryKey="token"`
- `AsQuery=true`
- `Expiration=72h`

Route helpers:

- `RegisterOnboardingRoutes` (API endpoints under `/admin/api/onboarding` by default)
- `RegisterAuthUIRoutes` + `RegisterRegistrationUIRoutes` (UI pages)

See `docs/GUIDE_ONBOARDING.md` for token lifecycle details, error response shape, and
override hook examples.

## User migrations

Quickstart registers the `combined` profile by default (`go-auth -> go-users`):

```go
if err := quickstart.RegisterUserMigrations(client); err != nil {
	return err
}
```

Canonical profiles:

- `quickstart.UserMigrationsProfileAuthOnly` -> `go-auth`
- `quickstart.UserMigrationsProfileCombined` -> `go-auth -> go-users`
- `quickstart.UserMigrationsProfileUsersStandalone` -> `go-users-auth -> go-users-auth-extras -> go-users`

Canonical source labels:

- `quickstart.UserMigrationsSourceLabelAuth`
- `quickstart.UserMigrationsSourceLabelUsersCore`
- `quickstart.UserMigrationsSourceLabelUsersAuthBootstrap`
- `quickstart.UserMigrationsSourceLabelUsersAuthExtras`

The wrapper uses source-stable ordered migration identity. Source keys and order
values are durable migration ABI:

- `go-auth`: key `go-auth`, order `10`
- `go-users-auth`: key `go-users-auth`, order `20`
- `go-users-auth-extras`: key `go-users-auth-extras`, order `30`, depends on `go-users-auth` when present
- `go-users`: key `go-users`, order `40`, depends on `go-auth` in combined mode or `go-users-auth-extras` in standalone mode

When optional sources are disabled, dependency edges are pruned to the selected
source graph. Existing databases with positional `ord_*` markers must run the
`go-persistence-bun` stable-marker backfill before deploying wrapper behavior
that generates `ordsrc_*` names.

Example: register users standalone mode (no go-auth migrations):

```go
if err := quickstart.RegisterUserMigrations(
	client,
	quickstart.WithUserMigrationsProfile(quickstart.UserMigrationsProfileUsersStandalone),
); err != nil {
	return err
}
```

Services module migration registration uses `services-stack` (`go-auth -> go-users -> go-services -> app-local`) by default via `modules/services.RegisterServiceMigrations`.

## Static assets (opt-in disk fallback)
```go
diskAssetsDir := quickstart.ResolveDiskAssetsDir(
	"output.css",
	"path/to/pkg/client/assets",
	"assets",
)
quickstart.NewStaticAssets(r, cfg, client.Assets(), quickstart.WithDiskAssetsDir(diskAssetsDir))
quickstart.RegisterContentTypeBuilderUIRoutes(
	r,
	cfg,
	adm,
	authn,
	quickstart.WithContentTypeBuilderUIStaticAssetOptions(cfg, quickstart.WithDiskAssetsDir(diskAssetsDir)),
)
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
	quickstart.WithMinimalFeatures(),
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

The formgen guide covers full customization guidance.

## Debug quickstart
Debug is opt-in and requires module registration plus middleware/log wiring. Configure panels before constructing the admin; attach middleware/log helpers after the debug module is registered so the collector is available.

Use explicit option structs:
- `quickstart.WithDebugOptions(quickstart.DebugOption{...})` for debug fields.
- `quickstart.WithErrorOptions(quickstart.ErrorOption{...})` for error presentation fields.

```go
cfg := quickstart.NewAdminConfig(
	"/admin",
	"Admin",
	"en",
	quickstart.WithDebugOptions(quickstart.DebugOption{
		Enabled:     admin.BoolPtr(true),
		LayoutMode:  "admin",
		ReplEnabled: admin.BoolPtr(true),
	}),
	quickstart.WithErrorOptions(quickstart.ErrorOption{
		DevMode:               admin.BoolPtr(true),
		IncludeStackTrace:     admin.BoolPtr(true),
		ExposeInternalMessage: admin.BoolPtr(true),
	}),
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

### Go-only rich debug panels
Go applications can register operator-friendly debug panels without shipping app-side JavaScript by adding a declarative `debug.PanelUI` schema to `debug.PanelConfig`.

```go
_ = debug.RegisterPanel("queue", debug.PanelConfig{
	Label:           "Queue",
	SnapshotKey:     "queue",
	SupportsToolbar: admin.BoolPtr(true),
	UI: debug.NewPanelUI(
		debug.TableView("jobs"),
		debug.MetricsView("summary"),
	),
	Snapshot: func(ctx context.Context) any {
		return map[string]any{
			"summary": map[string]any{"pending": 3},
			"jobs": []map[string]any{
				{"id": "job-1", "status": "pending"},
			},
		}
	},
})
```

Supported schema renderers are `metrics`, `key_value`, `table`, `status_list`, `timeline`, `json`, and `stack`. `count`, `filters`, and `events` configure badges, console filtering, and live-event update behavior. `actions` render buttons that post to `/admin/debug/api/panels/:panel/actions/:action` and must be backed by `debug.PanelActionHandler` entries in the same registration.

The panel ID must still be present in `DebugConfig.Panels`; toolbar rendering also requires `supports_toolbar` plus the toolbar panel configuration. Panels without a schema, malformed schema, or unsupported renderer names fall back to escaped JSON rendering. Use a TypeScript `panelRegistry.register(...)` renderer when a panel needs bespoke browser interaction beyond the declarative catalog.

### Scope debug (optional)
Scope debug captures the raw/resolved tenant/org scope for requests, adds an `X-Admin-Resolved-Scope` header, and exposes a JSON snapshot endpoint. When enabled through `ConfigureDebugPanels`, it also registers a Go-only rich debug panel using the declarative schema described above.

Scope debug is explicit:
- choose whether scope capture is enabled in your host config
- set a ring buffer size (default `200`)

```go
scopeDebugEnabled := true
var scopeDebugBuffer *quickstart.ScopeDebugBuffer
if scopeDebugEnabled {
	scopeDebugBuffer = quickstart.NewScopeDebugBuffer(200)
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
- `FeaturePreferences` remains opt-in: pass `EnablePreferences()` or supply `WithFeatureOverrides(map[string]bool{"preferences": true})` when building the admin gate.
- A 403 on `/admin/api/panels/preferences` usually means the default permissions are missing (`admin.preferences.view`, `admin.preferences.edit`).
- Read query params: `levels`, `keys`, `include_traces`, `include_versions`, `tenant_id`, `org_id`.
- Clear/delete semantics: send `clear_raw_keys` or `clear: true` (for all raw keys), plus empty values for known keys to delete user-level overrides.
- Non-user writes (tenant/org/system) require `admin.preferences.manage_tenant`, `admin.preferences.manage_org`, `admin.preferences.manage_system`.
- Dashboard preferences endpoints default to preferences permissions; override with `cfg.DashboardPreferencesPermission` / `cfg.DashboardPreferencesUpdatePermission` if needed.
- The preferences guide covers module behavior, traces, and clear semantics.
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
- Build config with `NewAdminConfig(...)` and pass `WithMinimalFeatures()` or `WithFeatureSet(DefaultMinimalFeatures())` to `NewAdmin`.
- Resolve adapter flags from config and pass via `WithAdapterFlags(...)`.
- Register modules with `NewModuleRegistrar` (uses `adm.FeatureGate()` by default).
- Wire auth with `WithGoAuth(...)` (include `*admin.AuthConfig` when needed).
- Enable dashboard SSR with `WithDefaultDashboardRenderer(...)` (override templates as needed).

## Translation Profile Operational Runbook

### Config-based Configuration

Configure translation profiles via `WithTranslationProductConfig(...)`:

| Field | Values | Default | Description |
|----------|--------|---------|-------------|
| `Profile` | `none`, `core`, `core+exchange`, `core+queue`, `full` | Empty (resolves to `core` when CMS enabled) | Sets the baseline translation capability profile |
| `Exchange.Enabled` | `true`, `false` | Profile default | Overrides exchange module enablement |
| `Queue.Enabled` | `true`, `false` | Profile default | Overrides queue module enablement |

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

```go
adm, _, err := quickstart.NewAdmin(
	cfg,
	hooks,
	quickstart.WithTranslationProductConfig(quickstart.TranslationProductConfig{
		SchemaVersion: quickstart.TranslationProductSchemaVersionCurrent,
		Profile:       quickstart.TranslationProfileFull,
		Exchange:      &quickstart.TranslationExchangeConfig{Enabled: true},
		Queue:         &quickstart.TranslationQueueConfig{Enabled: true},
	}),
)
if err != nil {
	return err
}
```

Check startup logs for `translation.capabilities.startup` and verify:
- `profile` is the expected resolved value.
- `modules.exchange.enabled` and `modules.queue.enabled` match the final intended state.
- `routes` includes enabled module routes only.
- `resolver_keys` include route keys expected by UI entrypoints.

### Route/Capability Expectations

Expected runtime routes when modules are enabled:
- Exchange UI route: `/admin/translations/exchange`
- Queue UI route: `/admin/translations/queue`
- Queue compatibility alias: `/admin/content/translations`
- Exchange API routes: `/admin/api/translations/exchange/export`, `/admin/api/translations/exchange/import/validate`, `/admin/api/translations/exchange/import/apply`
- Queue API routes: `/admin/api/translations/queue`, `/admin/api/translations/my-work`
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
| Exchange routes not registered | Exchange module not enabled | Set `TranslationProductConfig.Exchange.Enabled=true` or use `core+exchange`/`full` profile |
| `exchange.handlers_missing` error | Exchange store not configured | Provide `TranslationExchangeConfig.Store` implementation |
| `queue.locales_invalid` error | Queue enabled without supported locales | Set `TranslationQueueConfig.SupportedLocales` or configure translation policy |
| `quickstart.translation_policy.services_missing` warning/error | Policy has explicit requirements but no page/content checker service was resolved | Expose go-cms services through `CMSOptions.GoCMSConfig` or pass `WithTranslationPolicyServices` |
| Family row shows `Policy unavailable` | Family sync could not resolve policy/checker wiring for that content type | Cover the content type in `TranslationPolicyConfig`, provide checker services, then rerun family sync |
| Translation UI not visible | Feature gate disabled | Check `FeatureTranslationExchange` in feature gate |

### Runtime Validation

After admin initialization, call `quickstart.TranslationCapabilities(adm)` to get resolved capabilities:

```go
caps := quickstart.TranslationCapabilities(adm)
log.Printf("Translation profile: %s", caps["profile"])
log.Printf("Exchange enabled: %v", caps["modules"].(map[string]any)["exchange"].(map[string]any)["enabled"])
log.Printf("Registered routes: %v", caps["routes"])
```

## Compatibility note
If you previously imported quickstart as part of the root module, keep the same import path but add a direct `require` on `github.com/goliatone/go-admin/quickstart` in your `go.mod` (or use a local `replace`/`go.work` entry during dev). The APIs are unchanged; only the module boundary moved.

## What’s included
- Navigation: slug-derived menu IDs/lookup, parent scaffolder for grouped/collapsible defaults, canonical content-parent permission helper (`DefaultContentParentPermissions`), idempotent seeding (`SeedNavigation`), deterministic ordering, permission filtering, collapsible state, and view helpers (`WithNav`, `BuildNavItems`).
- Sidebar: embedded templates/partials and assets (CSS/JS) with collapse + submenu persistence; apps can override by adding their own template/assets FS ahead of the defaults.
- Error handling: Fiber error handler that returns JSON for API paths and renders the branded error page (with nav/theme/session) for HTML routes.
- Adapters: explicit `AdapterFlags` wiring for persistent CMS, go-options settings, and go-users activity sink with safe in-memory fallbacks.
- Auth debug: `GoAuthAuthorizer` supports explicit config debug mode for structured decision logging (logger injectable).

## Adapter and runtime toggles
- Set adapter switches with `quickstart.WithAdapterFlags(quickstart.AdapterFlags{...})`.
- For navigation reset/debug behavior, pass explicit host runtime config to your setup layer (for example `examples/web/setup.ConfigureRuntime(...)`).
- For authz diagnostics, set `admin.GoAuthAuthorizerConfig.Debug` explicitly when constructing the authorizer.

## Overrides
- Templates/Assets: prepend your own FS via `WithViewTemplatesFS`/`WithViewAssetsFS` to override the embedded sidebar.
- Navigation seed: pass custom items to `SeedNavigation`; module menu contributions flow through `BuildMenuSeedPlan` and generated-menu reconciliation.
- Module gating: `WithModuleFeatureGates(customGate)` with optional `WithModuleFeatureDisabledHandler`.
- Translation nav seeding: `WithTranslationCapabilityMenuMode(TranslationCapabilityMenuModeTools)` adds dashboard/queue/exchange links into a dedicated `Translations` menu group in server-seeded navigation.
- Dashboard SSR: provide `WithDashboardTemplatesFS` and/or disable embedded templates via `WithDashboardEmbeddedTemplates(false)`.
- Dashboard widget contract: handlers should return typed `admin.WidgetPayload` models consumed by both SSR and client hydration; avoid render-mode payload branching and disallow `chart_html`/full-document/script blobs in payload data.
- Error handler: swap `quickstart.NewFiberErrorHandler` with your own if needed.

## Generated navigation reconciliation

`NewModuleRegistrar` computes the expected primary and utility menu rows with
`BuildMenuSeedPlan`, then calls `SeedNavigation` in reconciliation mode. This
keeps quickstart-owned menu rows current without replacing host-authored rows.

Generated rows are normalized before persistence:

- `target._generated_by` is set to `quickstart`.
- `target._generated_id` stores the stable generated identity.
- request-scoped target state such as `enabled`, `disabled`,
  `disabled_reason`, and `missing_permission` is removed before comparison.

Use seed-plan options when a host owns the sidebar layout but still wants
quickstart to collect module and translation menu contributions:

```go
quickstart.NewModuleRegistrar(
    adm, cfg, modules, isDev,
    quickstart.WithMenuSeedParents(admin.MenuItem{
        ID:          "host.nav",
        Type:        admin.MenuItemTypeGroup,
        GroupTitle:  "Host Navigation",
        Collapsible: true,
    }),
    quickstart.WithMenuSeedTargetParentOverride("translation_queue", "host.nav"),
    quickstart.WithMenuSeedBaseItemTransform(func(item *admin.MenuItem) {
        if item == nil || item.Target == nil || item.Target["key"] != "translation_dashboard" {
            return
        }
        item.Label = "Translations"
        item.LabelKey = "menu.translations.overview"
        item.Target["name"] = "admin.translations.overview"
        item.Target["breadcrumb_label"] = "Translation Center"
    }),
    quickstart.WithMenuSeedModuleParentOverride("reports", "host.nav"),
    quickstart.WithMenuSeedItemTransform(func(moduleID string, item *admin.MenuItem) {
        if moduleID == "reports" && item != nil {
            item.Label = "Analytics"
        }
    }),
)
```

Use `WithMenuSeedBaseItemTransform` for quickstart-owned base/capability rows,
including translation capability links. Use `WithMenuSeedItemTransform` for
rows returned by module `MenuItems(locale)` contributors. Hosts that pin
`github.com/goliatone/go-admin` and `github.com/goliatone/go-admin/quickstart`
separately should upgrade both modules together when adopting base-item
transforms so the seed-plan API and generated navigation reconciliation stay in
sync.

Use `ReconcileGeneratedNavigation` directly when you need a dry-run report
before applying changes:

```go
report, err := quickstart.ReconcileGeneratedNavigation(ctx, quickstart.NavigationReconcileOptions{
    MenuSvc:  adm.MenuService(),
    MenuCode: cfg.NavMenuCode,
    Locale:   cfg.DefaultLocale,
    Items:    expectedItems,
    Apply:    false,
    RawInventory: admin.NavigationRawInventoryOptions{
        MenuCode:          cfg.NavMenuCode,
        Environment:       cfg.NavEnvironment,
        EnvironmentSource: "config.nav_environment",
    },
})
```

Generated navigation treats `admin.MenuItem.Position` as a sparse sort weight.
This lets independent modules reserve ordering bands without knowing current
sibling counts. Before writing to CMS-backed menu storage, quickstart sorts
siblings by sparse weight and stable identity, then writes compact per-parent
`0..n-1` positions because CMS/menu-builder APIs treat `position` as an
insertion index. Generated leaf targets keep the original sparse weight in
`_generated_sort_order` for diagnostics.

The report separates normal updates from operational diagnostics:

- `Creates` and `Updates` are generated rows that would be inserted or updated.
- `PreservedUserRows` are non-generated rows that are intentionally left alone.
- `DuplicateIdentities` reports duplicate or ambiguous generated identities; in
  apply mode ambiguous legacy matches are skipped.
- `DestructiveCandidates` reports stale generated rows whose identity no longer
  appears in the expected plan. They are not deleted unless the caller opts into
  destructive behavior.
- `StaleTargetStateCleanup` reports generated rows that carried transient
  request/permission state and will be cleaned by an update.
- `CapabilityOmissions`, `PermissionFilteredItems`, `ParentPrunedItems`, and
  `RouteResolutionFailures` are diagnostics for missing capabilities,
  permission-filtered rows, empty generated parents, or unresolved route data.
- `RawInventoryUnavailable` records scoped raw inventory failures. In dry-run
  mode this is a diagnostic; in apply mode a raw-inventory error returns before
  any create, update, delete, or managed-exclusion mutation.
- `RawPresentButNotRendered` reports generated rows present in raw storage but
  absent from the rendered menu, usually because render filtering or malformed
  target data hid a row that still affects convergence.
- `CoordinationBackend`, `CoordinationScope`, `CoordinationSupported`, and
  `CoordinationWarning` describe whether the menu backend coordinated
  convergence beyond this process. Treat unsupported coordination as an
  operational warning for multi-process or blue-green startup.

Set `Apply: true` to converge rows. Keep `AllowDestructive` off unless the host
has explicitly reviewed the destructive candidates; generated rows are
update-safe by default, but deleting or replacing rows can affect host-specific
navigation customizations.
