# Authentication and Permissions Guide

This guide is the operational reference for authentication, authorization,
roles, permission strings, scope, and diagnostics in go-admin. Use it when a
surface returns `401` or `403`, a menu item disappears, a role looks correct but
does not work, or scoped data appears empty.

Related focused docs:

- `AUTH.md`: low-level auth/authz interfaces and extension notes.
- `GUIDE_ROLES.md`: role model, role UI, seeding, and assignment behavior.
- `GUIDES_PERMISSION_MATRIX.md`: role form permission editor.
- `GUIDE_DEBUG_MODULE.md`: debug console configuration and panel details.
- `GUIDE_FEATURE_GATES.md`: feature enablement vs permission checks.

## Mental Model

go-admin separates identity, authorization, feature registration, and scope:

1. The authenticator validates the request and attaches actor/claims metadata.
2. Scope resolution derives the trusted tenant/org context for the request.
3. Roles and direct grants resolve into permission strings.
4. The authorizer answers `Can(ctx, action, resource)`.
5. Features, modules, panels, routes, actions, navigation, search, settings,
   jobs, and debug tools either render, filter, or deny based on those checks.

Do not treat a visible role name as proof of access. The effective result is the
combination of authenticated claims, resolved permissions, scope, feature gates,
registered modules, and authorizer policy.

## Core Contracts

Authentication is configured with:

```go
adm.WithAuth(authenticator, &admin.AuthConfig{
    LoginPath:    "/admin/login",
    LogoutPath:   "/admin/logout",
    RedirectPath: "/admin",
})
```

Authorization is configured with:

```go
adm.WithAuthorizer(authorizer)
```

The important contracts are:

- `Authenticator.Wrap(router.Context) error`: protects admin routes.
- `HandlerAuthenticator.WrapHandler(...)`: preserves middleware semantics when
  a router needs handler wrapping.
- `RequestAuthenticator.AuthenticateRequest(...)`: authenticates request-level
  flows.
- `Authorizer.Can(ctx, action, resource) bool`: final permission decision.
- `ResolvedPermissions(ctx) []string`: optional diagnostic hook used by the
  debug permissions panel.

When using go-auth, `admin.NewGoAuthAuthenticator(...)` adapts the protected
route middleware, and `admin.NewGoAuthAuthorizer(...)` maps go-admin permission
strings to go-auth claims and resource roles.

## Permission Strings

Use stable permission strings. The common shape is:

```text
admin.<resource>.<action>
```

Examples:

- `admin.dashboard.view`
- `admin.users.edit`
- `admin.roles.delete`
- `admin.preferences.view`
- `admin.debug.repl.exec`
- `admin.translations.import.apply`

`GoAuthAuthorizer` maps common actions before checking claims:

| Permission action | Auth action |
| --- | --- |
| `view`, `read`, `list`, `get`, `search` | `read` |
| `edit`, `update`, `patch`, `manage` | `edit` |
| `create`, `add`, `new`, `import` | `create` |
| `delete`, `remove`, `destroy` | `delete` |
| `trigger`, `run`, `execute`, `dispatch` | `edit` |

Actions outside that mapping, such as `admin.debug.repl.exec` or
`admin.translations.import.apply`, require the permission resolver to return the
exact permission string, or an equivalent explicit grant accepted by the
authorizer.

### Admin Wildcard Grants

Use `admin.*` for managed superadmin-style roles that should receive all current
and future go-admin permissions. The grant is stored as normal role permission
data, usually in go-users, and interpreted by go-admin's authorizer. go-auth
continues to own resource/action claim checks; it does not define admin wildcard
semantics.

Wildcard grants are scoped to the `admin.` namespace:

- `admin.*` allows `admin.users.view`, `admin.users.delete`,
  `admin.translations.import.apply`, and future `admin.<resource>.<action>`
  strings.
- `admin.translations.*` allows only permissions under
  `admin.translations.`.
- `admin.*` does not allow non-admin permission strings.

Exact resolved-permission checks that intentionally avoid go-auth resource-role
inference still honor stored wildcard grants. For example, RPC exact permission
mode accepts `admin.*` for `admin.commands.dispatch` but still denies non-admin
permissions. Diagnostics show the stored grant, such as `admin.*`, instead of an
expanded generated list.

When callers use split checks such as `Can(ctx, "delete", "users")`,
`GoAuthAuthorizer` only maps short resource names into the `admin.` namespace
for known go-admin resources. Host apps that introduce custom admin resource
aliases can extend this mapping with `GoAuthAuthorizerConfig.AdminResourceAliases`.
Callers can always avoid alias ambiguity by passing the canonical permission
string, for example `Can(ctx, "admin.reports.inspect", "admin.reports")`.

## Required Wiring

A correctly protected admin needs all of these:

- `adm.WithAuth(...)` before route initialization.
- `adm.WithAuthorizer(...)` before modules, panels, navigation, and debug
  diagnostics are expected to make real decisions.
- An authenticator that attaches claims/actor metadata to request context.
- A permission resolver when custom permission strings are used.
- Idempotent role and permission seeds in the backing auth/user system.
- Matching tenant/org scope between seeds, claims, repositories, and runtime
  reads.
- Modules registered before `Initialize`.
- Feature gates enabled for features whose routes or panels should exist.

For quickstart go-users wiring, `WithGoUsersUserManagement(...)` wires users,
roles, and profiles. When `ScopeResolver` is omitted, quickstart uses
`quickstart.ScopeBuilder(cfg)`, which applies configured single-tenant defaults.
If custom handlers or repositories call go-users directly, pass the same
resolver or an equivalent config-aware resolver.

## Roles and Assignments

go-admin distinguishes primary roles from managed role assignments:

- `UserRecord.Role`: the user's primary/system role, such as `admin` or
  `member`.
- `UserRecord.Roles`: assigned custom role IDs.
- `RoleRecord.RoleKey`: stable role key.
- `RoleRecord.Permissions`: one deduplicated permission list for that role.

The role UI may split permissions into separate editor fields, but persistence
still stores one merged permission list. See `GUIDE_ROLES.md` and
`GUIDES_PERMISSION_MATRIX.md` before changing role form behavior.

Seed role definitions by stable key, not display name. Seed repair should add
required permissions and keep unknown permissions unless the operation is
explicitly destructive.

The primary/system role name is not the grant. An `owner` user is not
automatically equivalent to `superadmin`; full admin access should come from an
assigned managed role whose permissions include `admin.*`.

## Scope

Scope bugs commonly look like permission bugs. If the role rows exist but lists
are empty, assignments do not apply, or the authorizer denies a permission that
appears in the user's grants, verify tenant/org first.

For single-tenant apps:

- Set `Config.ScopeMode = "single"`.
- Set `Config.DefaultTenantID` and `Config.DefaultOrgID`.
- Use `quickstart.ScopeBuilder(cfg)` for go-users reads.
- Seed roles, assignments, profiles, and content with the same defaults.

For multi-tenant apps:

- Do not rely on defaults.
- Require tenant/org in trusted claims or actor metadata.
- Seed and query with the same tenant/org values.

Authenticated admin APIs must not trust browser query `tenant_id` or `org_id`
as actor scope. Use `Admin.EffectiveScope(...)` or
`Admin.EffectiveScopeFromRequest(...)` before scoped reads and writes.

## Navigation and Routes

Missing navigation can mean several different things:

- Feature disabled: the module or panel was not registered.
- Module registered too late: registration happened after `Initialize`.
- Route not owned: the module route contract does not declare the route.
- Permission filtered: the menu item exists but the authorizer denied it.
- CMS row drift: a persisted menu row has stale target path or permissions.

By default, denied navigation entries are hidden. For local debugging, set
`NavPermissionDeniedMode` to `disable` so denied entries remain visible as
disabled diagnostics. Keep the default hide behavior for production.

## Debugging Workflow

Start with the debug console when the environment allows it. The default debug
path is:

```text
/admin/debug
```

The debug module itself requires the debug feature and `admin.debug.view` unless
you override `DebugConfig.Permission`.

Recommended auth debugging panels:

- `permissions`: compares registered required permissions, resolved permission
  claims, authorizer checks, user info, and next actions.
- `session`: confirms the current user, claims, and session data are attached.
- `doctor`: runs setup diagnostics such as quickstart adapter, scope, routing,
  routes, blocks, and translation checks when registered.
- `routes`: confirms the route exists and which method/path was registered.
- `config`: confirms effective auth, scope, feature, and debug configuration.
- `logs`: shows `GoAuthAuthorizerConfig.Debug=true` decision logs when enabled.
- `actions`: shows action diagnostics for command/action dispatch surfaces.

Add panels explicitly when needed:

```go
cfg.Debug = admin.DebugConfig{
    Enabled:    true,
    Permission: "admin.debug.view",
    Panels: []string{
        "session",
        "permissions",
        "doctor",
        "routes",
        "config",
        "logs",
        "actions",
    },
}
```

Use the permissions panel verdict first:

| Verdict | Meaning | First fix |
| --- | --- | --- |
| `healthy` | Required permissions match authorizer decisions. | Look for feature, route, or UI state issues. |
| `missing_grants` | Required permission is neither resolved nor allowed. | Add the grant to the role or direct permission source. |
| `scope_mismatch` | Permission appears resolved, but authorizer denies. | Check tenant/org and policy resource binding. |
| `claims_stale` | Authorizer allows, but resolved permission list omits the key. | Refresh login/session and inspect resolver cache/output. |
| `error` | Diagnostic context is incomplete. | Verify auth, authorizer, and debug collector wiring. |

When a role stores `admin.*`, the permissions panel should list `admin.*` in
resolved permissions and treat required admin permissions as covered. It should
not report wildcard-authorized admin permissions as stale claims.

Use the doctor panel when setup feels inconsistent. The quickstart defaults can
register checks for adapters, go-users scope wiring, scope drift, routing,
registered routes, block definitions, and translation setup. You can also run
the same diagnostics in process:

```go
report := adm.RunDoctor(ctx)
```

For authorizer tracing, enable decision logs:

```go
adm.WithAuthorizer(admin.NewGoAuthAuthorizer(admin.GoAuthAuthorizerConfig{
    DefaultResource:    "admin",
    Debug:              true,
    ResolvePermissions: resolvePermissions,
}))
```

## Symptom Checklist

`401` from an admin route:

- The authenticator rejected or did not see a session/token.
- The browser did not send the expected cookie or CSRF token.
- The route was mounted outside the protected admin middleware chain.
- Login/logout paths do not match `AuthConfig`.

`403` from an admin route:

- The route exists, but the authorizer denied the permission.
- The permission string in config, panel, action, or menu does not match seeds.
- The resolver is missing custom permissions.
- The actor has the grant under a different tenant/org scope.

Menu item missing:

- Check feature gate and module registration first.
- Use the debug routes panel to confirm target route ownership.
- Use the debug permissions panel to confirm the menu permission.
- Temporarily switch navigation denied mode to `disable`.

Role page empty:

- Verify users feature and role repository wiring.
- Check `quickstart.go_users_scope` doctor output.
- Compare seed scope to runtime resolved scope.
- Confirm custom go-users reads use `quickstart.ScopeBuilder(cfg)`.

Permission was just added but still denied:

- Confirm seed repair ran against the correct role key and scope.
- Refresh the user's session or JWT.
- Check resolver cache behavior and `PermissionResolverMetrics`.
- Verify the authorizer receives the same context populated by auth middleware.

Debug console forbidden:

- Grant `admin.debug.view`.
- Verify debug feature gate and `DebugConfig.Enabled`.
- Verify `DebugConfig.AllowedIPs` when set.
- Keep `admin.debug.repl` and `admin.debug.repl.exec` separate from basic debug
  viewing; do not grant REPL permissions broadly.

## Security Defaults

- Keep production navigation denial mode as `hide`.
- Enable debug tools only for trusted environments or trusted operators.
- Treat `admin.debug.repl.exec` as highly privileged.
- Restrict debug access with both permission checks and IP allowlists when
  available.
- Use `admin.*` only for deliberately full-access superadmin roles.
- Keep owner/admin/editor roles explicit unless they are intentionally full
  access.
- Prefer explicit permission strings for operational actions and non-super
  roles.
- Log permission decisions only where logs are protected and retained
  appropriately.

## Testing

For auth-sensitive changes, add focused tests for:

- Denied route returns `403`.
- Missing authenticator/session returns `401` or redirects as expected.
- Navigation filters or disables denied entries.
- Required panel/action permissions are collected by diagnostics.
- Role seed repair adds required permissions without deleting unknown grants.
- Single-tenant defaults apply to scoped role/user/profile reads.
- Multi-tenant mode fails closed when tenant/org claims are absent.

Use allow-all and deny-all authorizer stubs to separate route registration bugs
from permission policy bugs.
