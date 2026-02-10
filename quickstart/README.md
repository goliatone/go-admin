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
- `WithTranslationExchangeConfig(cfg TranslationExchangeConfig) AdminOption` - Inputs: exchange config (disabled by default); outputs: option that enables exchange feature + command wiring when configured.
- `EnablePreferences() AdminOption` - Inputs: none; outputs: option to enable `FeaturePreferences`.
- `EnableFeature(feature admin.FeatureKey) AdminOption` - Inputs: feature key; outputs: option to enable a single feature gate key.
- `RegisterTranslationExchangeWiring(adm *admin.Admin, cfg TranslationExchangeConfig) error` - Inputs: admin + exchange config; outputs: error (registers exchange commands and optional permission entries).
- `WithGoUsersPreferencesRepository(repo types.PreferenceRepository) AdminOption` - Inputs: go-users preferences repo; outputs: option that wires a PreferencesStore via the adapter when one is not already set.
- `WithGoUsersPreferencesRepositoryFactory(factory func() (types.PreferenceRepository, error)) AdminOption` - Inputs: repo builder; outputs: option to lazily construct a preferences repo (used when dependencies do not already supply a PreferencesStore).
- `WithGoUsersUserManagement(cfg GoUsersUserManagementConfig) AdminOption` - Inputs: go-users auth/inventory/role repositories (plus optional profile repo and scope resolver); outputs: option that wires user/role repositories and enables bulk role route registration.
- `NewUsersModule(opts ...admin.UserManagementModuleOption) *admin.UserManagementModule` - Inputs: user module options; outputs: configured built-in users module.
- `NewExportBundle(opts ...ExportBundleOption) *ExportBundle` - Inputs: go-export options (store/guard/actor/base path overrides). Outputs: runner/service plus go-admin registry/registrar/metadata adapters.
- `PreferencesPermissions() []PermissionDefinition` - Outputs: default preferences permission definitions.
- `RegisterPreferencesPermissions(register PermissionRegisterFunc) error` - Inputs: register func; outputs: error (registers default preferences permissions).
- `TranslationExchangePermissions() []PermissionDefinition` - Outputs: default translation exchange permission definitions.
- `RegisterTranslationExchangePermissions(register PermissionRegisterFunc) error` - Inputs: register func; outputs: error (registers translation exchange permissions).
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
- `WithThemeSelector(selector theme.ThemeSelector, manifest *theme.Manifest) AdminOption` - Inputs: go-theme selector + manifest; outputs: option that wires theme selection + manifest into `NewAdmin` (including Preferences variant options).
- `NewFiberServer(viewEngine fiber.Views, cfg admin.Config, adm *admin.Admin, isDev bool, opts ...FiberServerOption) (router.Server[*fiber.App], router.Router[*fiber.App])` - Inputs: views, config, admin, dev flag, server options. Outputs: go-router server adapter and router.
- `NewThemeSelector(name, variant string, tokenOverrides map[string]string, opts ...ThemeOption) (theme.Selector, *theme.Manifest, error)` - Inputs: theme name/variant, token overrides, theme options. Outputs: selector, manifest, error.
- `NewStaticAssets(r router.Router[T], cfg admin.Config, assetsFS fs.FS, opts ...StaticAssetsOption)` - Inputs: router, config, host assets FS, asset options. Outputs: none (registers static routes).
- `ResolveDiskAssetsDir(marker string, candidates ...string) string` - Inputs: marker file + candidate directories. Outputs: first matching directory.
- `RegisterAdminUIRoutes(r router.Router[T], cfg admin.Config, adm *admin.Admin, auth admin.HandlerAuthenticator, opts ...UIRouteOption) error` - Inputs: router/config/admin/auth wrapper + options. Outputs: error (registers dashboard + notifications UI routes).
- `RegisterAuthUIRoutes(r router.Router[T], cfg admin.Config, auther *auth.Auther, cookieName string, opts ...AuthUIOption) error` - Inputs: router/config/go-auth auther/cookie name + options. Outputs: error (registers login/logout/reset UI routes).
- `RegisterRegistrationUIRoutes(r router.Router[T], cfg admin.Config, opts ...RegistrationUIOption) error` - Inputs: router/config + options. Outputs: error (registers signup UI route).
- `AuthUIViewContext(cfg admin.Config, state AuthUIState, paths AuthUIPaths) router.ViewContext` - Inputs: config/state/paths; outputs: view context with auth flags + paths.
- `AttachDebugMiddleware(r router.Router[T], cfg admin.Config, adm *admin.Admin)` - Inputs: router/config/admin; outputs: none (registers debug request capture middleware).
- `AttachDebugLogHandler(cfg admin.Config, adm *admin.Admin)` - Inputs: config/admin; outputs: none (wires slog debug handler).
- `ConfigureExportRenderers(bundle *ExportBundle, templatesFS fs.FS, opts ...ExportTemplateOption) error` - Inputs: export bundle + templates FS + options. Outputs: error (registers template/PDF renderers).
- `NewModuleRegistrar(adm *admin.Admin, cfg admin.Config, modules []admin.Module, isDev bool, opts ...ModuleRegistrarOption) error` - Inputs: admin, config, module list, dev flag, options. Outputs: error.
- `WithModuleFeatureGates(gates gate.FeatureGate) ModuleRegistrarOption` - Inputs: feature gate; outputs: option to filter modules/menu items.
- `WithModuleFeatureDisabledHandler(handler func(feature, moduleID string) error) ModuleRegistrarOption` - Inputs: handler; outputs: option for disabled modules.
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

Use `WithGoUsersUserManagement` to provide the required repositories (`AuthRepo`, `InventoryRepo`, `RoleRegistry`) and optional `ProfileRepo` + `ScopeResolver`. This wires `UserRepository`, `RoleRepository`, and (when provided) `ProfileStore`, and auto-registers bulk role routes when the `users` feature is enabled.

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
- `adm.URLs().Resolve("admin.api.users")` -> `/admin/api/users`
- `adm.URLs().Resolve("admin.api.roles")` -> `/admin/api/roles`
- `adm.URLs().Resolve("admin.user_profiles")` -> `/admin/user-profiles` (when the profiles panel is enabled)
- `adm.URLs().Resolve("admin.api.user_profiles")` -> `/admin/api/user-profiles` (when the profiles panel is enabled)

Bulk role routes are auto-registered by quickstart when `users` is enabled:
- `adm.URLs().Resolve("admin.api.users.bulk.assign_role")` -> `/admin/api/users/bulk/assign-role`
- `adm.URLs().Resolve("admin.api.users.bulk.unassign_role")` -> `/admin/api/users/bulk/unassign-role`

## Translation exchange (opt-in)
Translation exchange is disabled by default in quickstart. Enable it explicitly with `WithTranslationExchangeConfig(...)`.

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
); err != nil {
	return err
}
```

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
	"base_path": cfg.BasePath,
}
viewCtx = quickstart.WithAuthUIViewThemeAssets(viewCtx, authThemeAssets, authThemeAssetPrefix)
return c.Render("register", viewCtx)
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
workflow.RegisterWorkflow("pages", admin.WorkflowDefinition{
    EntityType:   "pages",
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
  required:
    pages:
      publish:
        locales: ["en", "es"]
      promote:
        environments:
          staging:
            locales: ["en"]
          prod:
            locales: ["en", "es", "fr"]
    posts:
      publish:
        locales: ["en"]
        required_fields:
          en: ["title", "path"]
```

Behavior notes:
- `required` keys map to policy entities (panel slug or content type slug). If a
  payload includes `policy_entity`/`policyEntity`, it overrides the entity lookup.
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
		"pages": {
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
- A 403 on `/admin/api/preferences` usually means the default permissions are missing (`admin.preferences.view`, `admin.preferences.edit`).
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

## References
- `../QUICKBOOT_TDD.md`
- `../QUICKBOOT_TSK.md`

## Compatibility note
If you previously imported quickstart as part of the root module, keep the same import path but add a direct `require` on `github.com/goliatone/go-admin/quickstart` in your `go.mod` (or use a local `replace`/`go.work` entry during dev). The APIs are unchanged; only the module boundary moved.

## What’s included
- Navigation: slug-derived menu IDs/lookup, parent scaffolder for grouped/collapsible defaults, idempotent seeding (`SeedNavigation`), deterministic ordering, permission filtering, collapsible state, `NAV_DEBUG` logging/JSON, and view helpers (`WithNav`, `BuildNavItems`).
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
- Dashboard SSR: provide `WithDashboardTemplatesFS` and/or disable embedded templates via `WithDashboardEmbeddedTemplates(false)`.
- Error handler: swap `quickstart.NewFiberErrorHandler` with your own if needed.
