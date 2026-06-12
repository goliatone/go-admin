# go-admin Auth/Authz Guide

This guide covers how authentication and authorization are wired inside
go-admin and how consumers should configure them. It is split into two sections:
**Development (extending go-admin)** and **Consumers (using go-admin in an
app)**.

For the dedicated operator guide that covers permissions, roles, scope,
debugging with the debug console, doctor checks, and permissions panels, see
`GUIDE_AUTH_PERMISSIONS.md`.

## Development (extending go-admin)

- **Core contracts**
  - `Authenticator` interface: `Wrap(router.Context) error` guards routes; wire via `Admin.WithAuth(authenticator, *AuthConfig)`.
  - `Authorizer` interface: `Can(ctx context.Context, action, resource string) bool`; set via `Admin.WithAuthorizer(authz)`. All permission checks flow through this.
  - `AdminContext`: carries `Context`, `UserID`, `TenantID`, `OrgID`, `Locale`, and `Theme`. Use `withTheme` or `newAdminContextFromRouter` helpers; tenant/org are sourced from auth claims metadata (or `tenant_id`/`org_id` query params).
  - `GoAuthAuthenticator`: helper that adapts a `go-auth` `RouteAuthenticator` + Config into the admin `Authenticator` interface (`admin.NewGoAuthAuthenticator(routeAuth, cfg)`).
  - `GoAuthAuthorizer`: maps permission strings (`admin.<resource>.<action>`) to go-auth claims (`read/edit/create/delete`, plus aliases for `view/update/trigger/run`). Supply a default resource via `admin.GoAuthAuthorizerConfig` when permissions omit one. When a resolver is configured, stored grants such as `admin.*` or `admin.translations.*` are checked before go-auth resource roles. Split checks like `Can(ctx, "delete", "users")` map to admin permissions only for known admin resource aliases; host apps can add aliases with `GoAuthAuthorizerConfig.AdminResourceAliases`.
- **Route protection**
  - `Initialize` attaches `Authenticator` to base routes (e.g., `/admin/health`); panels, search, settings, notifications, jobs reuse the same middleware.
  - When adding new routes, wrap with the authenticator and check permissions via `requirePermission` or direct `Authorizer.Can`.
  - Notifications and jobs routes respect `Config.NotificationsPermission`/`Config.NotificationsUpdatePermission` and `Config.JobsPermission`/`Config.JobsTriggerPermission` before dispatching to services/commands.
- **Panels/actions**
  - `PanelBuilder` uses the admin-level `Authorizer` for CRUD/action/bulk guards. When adding new panel actions or hooks, ensure permissions are checked consistently (e.g., `Permission` on `Action`, `BulkAction`).
  - Use `Admin.requirePermission` in any new handlers that mutate data (settings, jobs, export, bulk, custom APIs).
  - Workflow transitions can be guarded separately with `WorkflowAuthorizer` (use `PanelBuilder.WithWorkflowAuthorizer` or `WithContentTypeBuilderWorkflowAuthorizer` for the content type builder). `RoleWorkflowAuthorizer` enforces a minimum role and optional permission checks.
- **Navigation**
  - `Navigation.Resolve` evaluates menu item `Permissions` using the `Authorizer`. When contributing menu items (modules or host seeds), populate `Permissions` with role/feature strings; filtering happens at resolve time.
  - Denied entries are hidden by default. Set `admin.Config.NavPermissionDeniedMode` or quickstart `WithNavPermissionDeniedMode(admin.NavigationPermissionDeniedModeDisable)` to retain denied entries as disabled diagnostics.
  - Use `disable` in local, development, or staging environments when you need to see missing menu permissions. Use `hide` in production when restricted feature names should not be exposed.
  - Support multiple menu groups by using distinct menu codes (e.g., `admin.main`, `admin.section_a`) and exposing a route parameter to select the code. Always filter via the `Authorizer`.
- **Search**
  - Search adapters can expose a `Permission()` method (pattern already used); the search engine consults the `Authorizer` to filter results. Ensure new adapters return a permission string when results should be gated.
- **Settings/commands/jobs**
  - Settings routes call `requirePermission` with `SettingsPermission` or `SettingsUpdatePermission`.
  - Command handlers should enforce guards before mutating state; reuse go-auth/go-users patterns.
  - Jobs triggered via API should check permissions before dispatch.
- **Modules**
  - Modules should not store auth logic; instead, declare required permissions on panels, actions, and menu items. The host-provided `Authorizer` enforces them.
  - For optional modules, declare `Manifest.FeatureFlags` so feature gates can block registration. Feature-disabled modules fail fast with `FeatureDisabledError`.
  - If you want feature-disabled modules to be skipped instead of erroring, use the quickstart module registrar (it uses `adm.FeatureGate()` by default, or pass a custom gate via `WithModuleFeatureGates(...)`).
  - Document the module's permission strings so host apps can register them in their auth system.
  - When adding module registration, pass the host `Authorizer` and `Authenticator` through the orchestrator; avoid hard dependencies on concrete auth packages.
- **go-cms and other packages**
  - go-admin defers transport/middleware to `go-router` and auth checks to `go-auth`-style `Authenticator`/`Authorizer`. When integrating go-cms routes or widgets, wrap with the same authenticator and guard edits with `Authorizer.Can`.
- **Testing**
  - Provide allow/deny stub authorizers in tests to assert filtering (navigation, search, panels).
  - Add authz-focused tests for new modules, menu contributions, and routes to ensure denied access is filtered out (expect 403/empty results as appropriate).

## Consumers (using go-admin)

- **Wire authentication**
  - Implement `Authenticator` (often a go-auth middleware) that validates the session/JWT and injects user identity into the request context.
  - Call `adm.WithAuth(authenticator, &admin.AuthConfig{LoginPath, LogoutPath, RedirectPath})` before `adm.Initialize(router)`.
- **Wire authorization**
  - Implement `Authorizer` to map your roles/permissions: `Can(ctx, action, resource) bool`.
  - Pass it to `adm.WithAuthorizer(authz)` so panels, navigation, search, and settings can filter automatically.
  - If you need stricter publish/transition rules, add a `WorkflowAuthorizer` (for example `NewRoleWorkflowAuthorizer("admin")` with `WithWorkflowPermission(...)`) to the relevant panels or modules.
- **Define permissions**
  - Panels/actions: set `Permission` on actions/bulk actions; define your own permission strings (e.g., `admin.users.view`, `admin.users.edit`).
  - Navigation: set `Permissions` on menu items; unauthorized items are hidden by default or rendered disabled when the navigation permission-denial mode is `disable`. Public site CMS menu permissions are checked against the `navigation` resource for compatibility with existing site role grants.
  - Search adapters: expose permissions so results are hidden when unauthorized.
- **Register permissions with your auth system**
  - Seed or register the permission strings that go-admin uses (defaults listed below) plus any module-specific permissions you add.
  - For go-auth, ensure issued claims grant `read/edit/create/delete` on the resource derived from the permission string (e.g., `admin.users.view` -> resource `users`, action `read`).
  - For go-users-backed role data, store wildcard grants as normal role permission strings. `go-users` persists the data; `go-admin` interprets `admin.*` as any permission under the `admin.` namespace.
  - Use `admin.*` for superadmin-style roles that should receive current and future admin permissions. Do not rely on the primary `owner` role name to imply superadmin access unless the assigned managed role also grants it.
  - If you omit the resource in permission strings, set `GoAuthAuthorizerConfig.DefaultResource`.
  - When enabling preferences with quickstart helpers, call `quickstart.RegisterPreferencesPermissions(...)` so go-auth/go-users know about `admin.preferences.view`, `admin.preferences.edit`, and the optional manage permissions.
- **Default permission strings (built-ins)**
  - Settings: `admin.settings.view`, `admin.settings.edit`
  - Notifications: `admin.notifications.view`, `admin.notifications.update`
  - Jobs: `admin.jobs.view`, `admin.jobs.trigger`
  - Preferences: `admin.preferences.view`, `admin.preferences.edit` (optional: `admin.preferences.manage_tenant`, `admin.preferences.manage_org`, `admin.preferences.manage_system`)
  - See `docs/GUIDE_MOD_PREFERENCES.md` for module behavior, clear semantics, and API details.
  - Profile: `admin.profile.view`, `admin.profile.edit`
  - Users: `admin.users.view`, `admin.users.create`, `admin.users.import`, `admin.users.edit`, `admin.users.delete`
  - Roles: `admin.roles.view`, `admin.roles.create`, `admin.roles.edit`, `admin.roles.delete`
  - Tenants: `admin.tenants.view`, `admin.tenants.create`, `admin.tenants.edit`, `admin.tenants.delete`
  - Organizations: `admin.organizations.view`, `admin.organizations.create`, `admin.organizations.edit`, `admin.organizations.delete`
- **Preferences API notes**
  - Read query params: `levels`, `keys`, `include_traces`, `include_versions`, `tenant_id`, `org_id`.
  - Clear/delete semantics: send `clear`/`clear_keys` or empty values for known keys to delete user-level overrides.
- **User roles vs custom role assignments**
  - `UserRecord.Role` is the primary/system role string (e.g., `member`, `admin`).
  - `UserRecord.Roles` is for custom role assignments (typically UUIDs when using go-users).
  - When wiring go-users adapters, go-admin defaults to UUID-only assignment via `UUIDRoleAssignmentLookup` so system roles are not treated as custom assignments.
  - If your custom role IDs are not UUIDs, inject a lookup override:
    - `adm.WithRoleAssignmentLookup(admin.RoleRepositoryLookup{Roles: roleRepo})`
- **Menu groups**
  - Seed menus via `MenuService` (e.g., `admin.main`, `admin.section_a`) or through modules exposing `MenuItems`.
  - If you expose multiple menus, add a `code` query param (or distinct endpoints) and pass it to your navigation resolver; the `Authorizer` filters items per user.
- **Modules**
  - Register modules before `Initialize` (`adm.RegisterModule(module)`), and supply an authorizer; modules contribute panels/routes/menus with their own permission strings.
  - Ensure module menu items include `Permissions` as needed; the host authorizer enforces them.
  - Ensure module feature flags are enabled via the configured FeatureGate defaults/overrides. If a module's `Manifest.FeatureFlags` is disabled, `Initialize` returns a `FeatureDisabledError` and the routes will not exist.
  - When using quickstart, prefer `quickstart.NewModuleRegistrar` (uses `adm.FeatureGate()` by default) so disabled modules are filtered before registration.
- **Settings, jobs, commands**
  - Configure `SettingsPermission` and `SettingsUpdatePermission` in `admin.Config` to guard settings read/write.
  - For job triggers or custom commands exposed over HTTP, guard with appropriate permissions in handlers.
- **Theme/context**
  - Auth middleware should inject user identity into the request context so `AdminContext` can carry `UserID`, tenant/org, and locale; authorizer decisions can then use user/role info.
  - If you rely on scoped preferences, include `tenant_id`/`organization_id` (or `org_id`) in claims metadata so preferences resolve the correct scope.
  - Quickstart scope defaults: set `Config.ScopeMode` + `Config.DefaultTenantID`/`DefaultOrgID` (or use `quickstart.WithScopeConfig(...)`).
    - `single` mode injects default tenant/org into claims/session when missing.
    - `multi` mode never injects defaults; scope must come from auth claims/metadata.
  - For standard quickstart go-users-backed users, roles, and profiles, an omitted `ScopeResolver` defaults to `quickstart.ScopeBuilder(cfg)`. If you wire adapters manually or call go-users directly from custom handlers, pass `quickstart.ScopeBuilder(cfg)` or an equivalent config-aware resolver. A raw helper that only reads actor/claims metadata will not apply single-tenant defaults.
- **Verification**
  - Smoke-test with a deny-all authorizer to confirm restricted surfaces disappear (navigation/search/items).
  - Test role-specific visibility by toggling permissions and verifying `/admin/api/navigation`, search responses, and panel action availability.
  - Troubleshoot with `GoAuthAuthorizerConfig.Debug=true` to log permission decisions; a 404 usually means the module was not registered or feature-gated, while a 403 typically means the permission is missing or claims are absent.

## Troubleshooting

- **Scenario: `/admin/api/preferences` returns 404**
  - **Likely cause**: preferences feature not enabled or module never registered.
  - **Resolution**: enable the `preferences` feature in your FeatureGate defaults/overrides, then register modules before `Initialize` (or use `quickstart.NewModuleRegistrar`, which uses `adm.FeatureGate()` by default). If using `quickstart.NewAdmin`, pass `quickstart.EnablePreferences()` or include it in `WithFeatureDefaults`.
- **Scenario: `/admin/api/preferences` returns 403**
  - **Likely cause**: permission checks failing (`admin.preferences.view` or `admin.preferences.edit` missing in claims).
  - **Resolution**: register/seed the permissions in your auth system and ensure claims grant the resource action; enable `GoAuthAuthorizerConfig.Debug=true` to see the permission mapping.
- **Scenario: preferences save works but is not persisted**
  - **Likely cause**: preferences store not wired, so the in-memory fallback is used.
  - **Resolution**: wire `admin.Dependencies.PreferencesStore` (e.g., `quickstart.NewGoUsersPreferencesStore(repo)`), then rebuild admin.
- **Scenario: module routes or navigation missing after adding a module**
  - **Likely cause**: module registered after `Initialize`, or feature gate disabled.
  - **Resolution**: register modules before `Initialize` and enable any `Manifest.FeatureFlags` via FeatureGate defaults/overrides; with quickstart use `NewModuleRegistrar` (default gate) or pass `WithModuleFeatureGates(...)` to filter deterministically.
- **Scenario: module navigation item exists in CMS, but user can't see it**
  - **Likely cause**: menu item `Permissions` filtered by authorizer.
  - **Resolution**: verify the permission string is issued for that user; temporarily test with an allow-all authorizer to confirm the nav seed is correct.
- **Scenario: module routes exist, but nav links go to 404s**
  - **Likely cause**: CMS-persisted menu row drifted from code/config (stale `target.path`, missing `base_path`, or empty `permissions`).
  - **Resolution**: inspect the CMS menu record and ensure `target.path` and `permissions` match the current config; reset/reseed the menu or patch the row if it is stale.
- **Scenario: admin returns 401/403 or navigation/search is unexpectedly empty**
  - **Likely cause**: stale/expired token or missing claims, so the authenticator/authorizer cannot resolve permissions.
  - **Resolution**: re-authenticate or refresh the token; verify your auth middleware injects claims into the request context and that `/admin/api/session` (or your session endpoint) reflects the expected roles/permissions.
- **Scenario: roles/profiles are empty but seeded data exists**
  - **Likely cause**: scope mismatch (global seeds but tenant/org-scoped session, multi-tenant mode without tenant/org claims, or a custom scope resolver that ignores configured single-tenant defaults).
  - **Resolution**: set scope config to single-tenant defaults (`Config.ScopeMode=single` plus default tenant/org IDs), omit `ScopeResolver` from standard `quickstart.WithGoUsersUserManagement` or pass `quickstart.ScopeBuilder(cfg)` explicitly, and use the same resolver for custom role/user repositories. In multi-tenant mode, ensure claims + seeded data use the same tenant/org IDs.

## Auth Alignment Notes (go-auth/go-users pattern)

- Use the same middleware chain you use for go-users/go-auth: session/JWT validation, context enrichment (user ID/roles/permissions), then pass control to admin routes. `Authenticator.Wrap` should mimic the go-users middleware signature (set user info on context).
- AdminContext prefers `auth.ActorFromRouterContext` for `UserID` when middleware populates it; header fallbacks remain for tests/simple mocks.
- Authorization should be role/permission-based via the shared `Authorizer`. Keep permission strings consistent across admin and your core services.
- Routing: go-admin uses the go-router HTTP adapter; WebSocket handlers are not registered by default. If you expose WebSocket endpoints, mirror go-router’s WS registration and wrap them with the same auth middleware.
- Always propagate locale and user identity into the context so modules/panels/search can evaluate permissions and i18n keys correctly.
