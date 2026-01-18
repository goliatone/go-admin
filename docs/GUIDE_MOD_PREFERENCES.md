# Preferences Module Guide

This guide explains how the Preferences module works in go-admin, what it provides, and how to wire it in a host application.

## What it provides

- A feature-gated Preferences module (`FeaturePreferences`) that registers a panel and a navigation entry.
- A `PreferencesService` that resolves multi-scope preferences (system → tenant → org → user) with admin defaults applied as a base layer.
- A resolver-based persistence contract (`PreferencesStore`) with an in-memory fallback.
- API endpoints for self-service read/write of preferences, plus optional traces/versions for clients that request them.
- Deterministic scope resolution: tenant/org from `AdminContext` (auth claims) first, then query params.
- Theme selection and dashboard layout preferences integration.
- Support for safe, namespaced UI preferences via `raw` keys (`ui.*`).

## Feature gate and permissions

Enable the module and permissions before initialization:

- Feature gate: set `cfg.Features.Preferences = true` or `cfg.FeatureFlags["preferences"] = true`.
- Default permissions:
  - `admin.preferences.view`
  - `admin.preferences.edit`
- Optional permissions for non-user writes:
  - `admin.preferences.manage_tenant`
  - `admin.preferences.manage_org`
  - `admin.preferences.manage_system`

Quickstart helper for permissions:

```go
if err := quickstart.RegisterPreferencesPermissions(registerPermission); err != nil {
    // handle error
}
```

If permissions are missing, `/admin/api/preferences` returns 403. If the feature is disabled or the module is not registered, it returns 404.

## Module anatomy

The Preferences module is implemented as a panel module:

- Module ID: `preferences`
- Panel route: `/admin/preferences`
- Panel API: `/admin/api/preferences` and `/admin/api/preferences/:id`
- Panel fields:
  - `theme` (select)
  - `theme_variant` (select)
  - `dashboard_layout` (read-only detail field)

The repository enforces **self-service** for user-level operations: the authenticated user can only read/write their own preferences. `DELETE` is not allowed; use the clear flow described below. Non-user writes (tenant/org/system) require the manage permissions above and are not exposed by the default UI.

See:

- `admin/preferences_module.go`
- `admin/preferences.go`

## Preferences data model

The service stores a small set of known keys and exposes a safe `raw` namespace for UI-specific preferences.

Built-in keys:

- `theme`
- `theme_variant`
- `dashboard_layout`
- `dashboard_overrides`

Raw keys:

- Only keys with the `ui.` prefix are allowed.
- Keys `id` and `raw` are rejected.
- Allowed characters: letters, digits, dot, dash, underscore.

Example request body (POST/PUT):

```json
{
  "theme": "teal",
  "theme_variant": "dark",
  "raw": {
    "ui.datagrid.users.columns": {
      "version": 2,
      "order": ["email", "username"],
      "visibility": {"email": true}
    }
  }
}
```

The response includes `raw` filtered to allowed keys. API responses use `snake_case` keys.

## API surface

Preferences panel endpoints:

- `GET /admin/api/preferences`
- `POST /admin/api/preferences`
- `PUT /admin/api/preferences/:id`

Dashboard-specific preferences endpoint (go-dashboard binding):

- `GET /admin/api/dashboard/preferences`
- `POST /admin/api/dashboard/preferences`

The dashboard endpoint stores layout overrides via the Preferences service.

Read query params:

- `levels=system,tenant,org,user` (override resolution order/levels)
- `keys=theme,theme_variant` (limit keys)
- `include_traces=1` (include resolution traces)
- `include_versions=1` (include version metadata)
- `tenant_id=<id>` (scope override when not in claims)
- `org_id=<id>` (scope override when not in claims)

Response shape remains compatible (theme fields at top), but can include extra fields when requested:

```json
{
  "id": "user-id",
  "theme": "dark",
  "theme_variant": "night",
  "raw": {"ui.datagrid.users.columns": {"version": 2}},
  "effective": {"theme": "dark"},
  "traces": [],
  "versions": {"theme": 3}
}
```

List responses continue to return `{"records":[record], "total":1}`; detail/update endpoints return the record map directly.

## Clearing preferences

Use the `clear` (or `clear_keys`) field to remove stored keys (built-in keys or allowed `ui.*` keys):

```json
{
  "clear": ["theme", "ui.datagrid.users.columns"]
}
```

Clear applies delete semantics in the backing store so removed keys fall back to inherited defaults. For known fields, empty string or `null` values are treated as clears at the user level.

## How storage works

The persistence contract is resolver-based:

```go
type PreferencesStore interface {
    Resolve(ctx context.Context, input PreferencesResolveInput) (PreferenceSnapshot, error)
    Upsert(ctx context.Context, input PreferencesUpsertInput) (PreferenceSnapshot, error)
    Delete(ctx context.Context, input PreferencesDeleteInput) error
}
```

Key concepts:

- `PreferenceScope` includes `UserID`, `TenantID`, and `OrgID`.
- `PreferenceLevel` includes `system`, `tenant`, `org`, `user`.
- `Resolve` returns `Effective` values and optional `Traces`/`Versions`.
- Admin defaults (`Config.Theme`, `Config.ThemeVariant`) are applied as a base layer.
- The in-memory store resolves `system → tenant → org → user` for development/testing.

## go-users integration

The quickstart package provides a bridge to go-users preferences:

- `quickstart.NewGoUsersPreferencesStore(repo)` implements `PreferencesStore`.
- `Resolve` uses the go-users resolver to return effective values and optional traces/versions.
- `Upsert`/`Delete` map to go-users preference commands so clears fall back to lower scopes.
- `quickstart.NewAdminWithGoUsersPreferences(cfg, repo, quickstart.EnablePreferences())` wires the store and enables the feature.

Reference: go-users guide `../../go-users/docs/GUIDE_PROFILES_PREFERENCES.md` (profiles, scoped preference levels, resolver behavior, and delete semantics).

## Quickstart recipe

Minimal wiring with go-users and the preferences feature gate:

```go
prefsStore, err := quickstart.NewGoUsersPreferencesStore(preferenceRepo)
if err != nil {
	return err
}

cfg.Features.Preferences = true
adm, err := admin.New(cfg, admin.Dependencies{
	PreferencesStore: prefsStore,
})
if err != nil {
	return err
}
_ = adm
```

Quickstart helper (enables the feature automatically):

```go
adm, err := quickstart.NewAdminWithGoUsersPreferences(
	cfg,
	preferenceRepo,
	quickstart.EnablePreferences(),
)
if err != nil {
	return err
}
_ = adm
```

Permissions registration:

```go
err := quickstart.RegisterPreferencesPermissions(func(def quickstart.PermissionDefinition) error {
	return permissions.Register(def.Key, def.Description)
})
if err != nil {
	return err
}
```

## Theme and dashboard integration

Theme resolution reads preferences when enabled:

- `Admin.Theme(ctx)` merges config defaults with stored preferences and optional request overrides.

Dashboard layout persistence:

- `PreferencesService.SaveDashboardLayout` stores widget layout in `dashboard_layout`.
- `PreferencesService.SaveDashboardOverrides` stores go-dashboard layout overrides in `dashboard_overrides`.
- `/admin/api/dashboard/preferences` saves layout overrides for the current user.

## Does it use go-options?

The go-admin Preferences module does not use go-options directly. When wired to go-users, the go-users resolver uses go-options internally to merge levels; go-admin simply consumes the resolver output.

## Alignment with go-users profiles/preferences

The go-users guide describes profiles plus multi-scope preference resolution (system/tenant/org/user), traces, and version tracking. The go-admin Preferences module aligns with that behavior for resolution, while keeping the UI focused on self-service:

- **Scope levels**: read resolution includes system/tenant/org/user by default.
- **Traces/versions**: optional via query params (`include_traces`, `include_versions`).
- **Delete semantics**: go-admin `clear` mirrors go-users `PreferenceDelete`.
- **UI surface**: the default panel remains user-focused; tenant/org/system writes require explicit permissions and custom UI.

If you need dedicated tenant/org/system management UIs, build a custom module or use go-users services directly.

## Common troubleshooting

- `404 /admin/api/preferences`: feature disabled or module not registered.
- `403 /admin/api/preferences`: missing `admin.preferences.view` or `admin.preferences.edit` in claims.
- Preferences not persisting: no store wired (in-memory fallback is in use).
- Effective values missing expected tenant/org defaults: ensure `tenant_id`/`org_id` are present in auth claims or supplied via query params.

## Key files

- `admin/preferences.go` (service, defaults, in-memory store)
- `admin/preferences_module.go` (module, panel repo, raw filtering)
- `quickstart/go_users_preferences.go` (go-users adapter)
- `quickstart/preferences_quickstart.go` (wiring helper)
- `quickstart/preferences_permissions.go` (default permissions)
- `docs/AUTH.md` (permissions + troubleshooting)
