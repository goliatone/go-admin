# Roles Guide

This guide explains how roles work in go-admin, how to wire the roles UI, and how
to seed role definitions and assignments. For the broader authentication and
authorization contract, see `AUTH.md`. For the role form permission editor, see
`GUIDES_PERMISSION_MATRIX.md`.

## Overview

Roles group permission strings. Permission strings are what the admin runtime
checks when it decides whether a user can see navigation, open a panel, run an
action, trigger a job, or call a protected route.

The important distinction is:

- `UserRecord.Role` is the user's primary/system role string, such as `admin`
  or `member`.
- `UserRecord.Roles` is the list of assigned custom role IDs.
- `RoleRecord` is a managed role definition with a role key and permission list.
- `Authorizer.Can(ctx, action, resource)` is still the final authorization
  decision point.

Most go-admin surfaces do not check role names directly. They check permission
strings such as `admin.users.view`, `admin.roles.edit`, or
`admin.translations.import.apply`.

## Data Model

`admin.UserRecord` carries both primary and assigned roles:

```go
type UserRecord struct {
    Role  string
    Roles []string
}
```

`admin.RoleRecord` is the admin-facing role definition:

```go
type RoleRecord struct {
    ID          string
    Name        string
    RoleKey     string
    Description string
    Permissions []string
    Metadata    map[string]any
    IsSystem    bool
}
```

The role repository contract supports role CRUD plus assignment helpers:

- `List`, `Get`, `Create`, `Update`, `Delete`
- `Assign`, `Unassign`
- `RolesForUser`

`UserManagementService` wraps the user and role repositories, deduplicates role
permissions on save, records activity, and blocks deletion of system roles.

## Authorization Flow

Role definitions are useful only after their permissions reach the configured
authorizer. The normal flow is:

1. Authentication identifies the user and attaches claims/session data.
2. The host app resolves primary role, assigned roles, and direct permissions.
3. The configured `Authorizer` answers permission checks.
4. Panels, routes, navigation, search, settings, jobs, commands, and modules use
   that authorizer to allow, deny, or filter surfaces.

When using go-auth/go-users, role definitions usually come from the go-users role
registry. go-admin adapts those definitions into `RoleRecord` values for the UI
and repository contracts.

## Built-In Role Surfaces

The users feature registers both user and role management through
`NewUserManagementModule`.

Users panel:

- Uses feature key `users`.
- Uses permissions from `admin.Config`: `UsersPermission`,
  `UsersCreatePermission`, `UsersUpdatePermission`, and `UsersDeletePermission`.
- Exposes `role` as the primary role field.
- Exposes `roles` as assigned custom roles.

Roles panel:

- Uses panel ID `roles`.
- Uses permissions from `admin.Config`: `RolesPermission`,
  `RolesCreatePermission`, `RolesUpdatePermission`, and `RolesDeletePermission`.
- Uses custom UI routes for list, create, detail, edit, update, and delete.
- Stores permissions as a single deduplicated role permission list.

For the default role management UI, the effective permissions are:

| Operation | Permission |
| --- | --- |
| List/detail roles | `admin.roles.view` |
| Create role | `admin.roles.create` |
| Edit role | `admin.roles.edit` |
| Delete role | `admin.roles.delete` |
| Assign/unassign user roles | `admin.users.edit` |

## Role Form Permissions

The default roles form uses three permission matrix fields:

- `permissions`: primary admin resources and common actions.
- `permissions_debug`: debug permissions under `admin.debug.`.
- `permissions_translation`: translation permissions under `admin.translations.`.

The canonical role record conversion merges those fields back into
`RoleRecord.Permissions` and deduplicates the result. If a host renders the
embedded Roles schema through a custom handler, that handler must read and merge
all split permission fields it exposes. The split keeps debug and translation
permissions from being buried in the primary grid while preserving one role
permission list in storage.

Default primary resources include:

- `admin.dashboard`
- `admin.settings`
- `admin.users`
- `admin.roles`
- `admin.activity`
- `admin.jobs`
- `admin.search`
- `admin.preferences`
- `admin.profile`
- `admin.debug`

Default primary actions are `view`, `create`, `import`, `edit`, and `delete`.
See `GUIDES_PERMISSION_MATRIX.md` for matrix component options, extra permission
chips, and frontend runtime requirements.

## Quickstart Wiring

At minimum, a host app needs:

1. The users feature enabled.
2. A user repository and role repository, or go-users repositories.
3. An authenticator attached with `Admin.WithAuth(...)`.
4. An authorizer attached with `Admin.WithAuthorizer(...)`.
5. A config-aware scope resolver for custom or direct go-users repository calls.
6. The users module registered before `Initialize`.
7. Role UI routes registered when using quickstart HTML routes.

Typical quickstart wiring uses the admin setup helpers, registers
`NewUserManagementModule`, and calls `quickstart.RegisterRolesUIRoutes(...)` for
HTML role management. API/panel routes still rely on the same auth wrapper and
permission checks.

For go-users-backed role storage, quickstart wires the same effective scope
resolver into user, role, and profile adapters. If `ScopeResolver` is omitted,
`WithGoUsersUserManagement` defaults it to `quickstart.ScopeBuilder(adminCfg)`:

```go
scopeResolver := quickstart.ScopeBuilder(adminCfg)

adm, _, err := quickstart.NewAdmin(
    adminCfg,
    hooks,
    quickstart.WithGoUsersUserManagement(quickstart.GoUsersUserManagementConfig{
        AuthRepo:      authRepo,
        InventoryRepo: inventoryRepo,
        RoleRegistry:  roleRegistry,
        ProfileRepo:   profileRepo,
        ScopeResolver: scopeResolver, // optional; omitted uses ScopeBuilder(adminCfg)
    }),
)
```

`quickstart.ScopeBuilder(adminCfg)` first extracts tenant/org from actor or
claims metadata, then applies `admin.Config` defaults when `ScopeMode` is
`single`. A raw helper that only reads request metadata is not equivalent for
custom handlers or repositories that call go-users directly.

## Seeding Roles

Seed roles by role key, not by display name. A seed should contain:

- `role_key`: stable identifier, such as `admin` or `editor`.
- `name`: display label.
- `permissions`: permission strings granted by the role.
- `scope`: system, tenant, or org scope when using go-users.

Recommended seed behavior:

1. Normalize and validate the role key.
2. Look up an existing role by `role_key`, including system roles when needed.
3. Create the role if it does not exist.
4. If it exists, merge required permissions into the existing list.
5. Do not remove unknown permissions during seed repair unless the operation is
   explicitly destructive.
6. Preserve the existing role scope when updating.

Example seed shape:

```go
roleSeeds := []struct {
    Key         string
    Name        string
    Permissions []string
}{
    {
        Key:  "admin",
        Name: "Admin",
        Permissions: []string{
            "admin.dashboard.view",
            "admin.users.view",
            "admin.users.create",
            "admin.users.edit",
            "admin.roles.view",
            "admin.roles.create",
            "admin.roles.edit",
            "admin.settings.view",
            "admin.search.view",
            "admin.profile.view",
            "admin.profile.edit",
        },
    },
    {
        Key:  "editor",
        Name: "Editor",
        Permissions: []string{
            "admin.dashboard.view",
            "admin.pages.view",
            "admin.posts.view",
            "admin.search.view",
            "admin.profile.view",
            "admin.profile.edit",
        },
    },
}
```

After roles exist, assign role IDs to users:

```go
if err := registry.AssignRole(ctx, user.ID, role.ID, role.Scope, actorID); err != nil {
    return err
}
```

Keep seeds idempotent. Re-running setup should converge missing permissions and
assignments without duplicating rows.

## Recommended Permission Sets

Use these as starting points, then adjust for the host app.

Viewer:

- `admin.dashboard.view`
- `admin.profile.view`
- `admin.profile.edit`

Editor:

- Viewer permissions.
- `admin.pages.view`
- `admin.posts.view`
- `admin.search.view`

Admin:

- Editor permissions.
- `admin.users.view`
- `admin.users.create`
- `admin.users.edit`
- `admin.roles.view`
- `admin.roles.create`
- `admin.roles.edit`
- `admin.activity.view`
- `admin.settings.view`
- `admin.preferences.view`

Owner or superadmin:

- Admin permissions.
- destructive user/role permissions when appropriate.
- feature-specific management permissions.
- debug permissions only in trusted environments.

Translation operation permissions:

- `admin.translations.view`
- `admin.translations.edit`
- `admin.translations.manage`
- `admin.translations.assign`
- `admin.translations.approve`
- `admin.translations.claim`
- `admin.translations.export`
- `admin.translations.import.view`
- `admin.translations.import.validate`
- `admin.translations.import.apply`

Content navigation permissions commonly used by the example app:

- `admin.pages.view`
- `admin.posts.view`
- `admin.media.view`
- `admin.content_types.view`
- `admin.block_definitions.view`

## Scopes

When using scoped roles, the authenticated user's tenant/org context must match
the scope used by seeded data. If roles are seeded globally but the session is
tenant-scoped, or roles are tenant-scoped but the session has no tenant claim,
role lists and assignments can appear empty.

Use the same config-aware resolver or scope defaults for:

- role seed lookup and creation.
- assignment creation.
- permission resolution.
- authenticated request context.
- user, role, and profile repositories.
- any custom role/user handlers that call go-users repositories directly.

For single-tenant apps, configure default tenant/org values consistently. For
multi-tenant apps, require tenant/org claims in auth metadata and seed roles for
the same scope.

### Single-Tenant Default Scope

In single-tenant mode, configured defaults are applied by the resolver, not by
the go-users registry. The standard quickstart resolver is:

```go
scopeResolver := quickstart.ScopeBuilder(adminCfg)
```

Quickstart uses that resolver automatically for `WithGoUsersUserManagement`
when `ScopeResolver` is omitted. Use the same resolver when constructing
adapters manually:

- `admin.NewGoUsersUserRepository(..., scopeResolver)`
- `admin.NewGoUsersRoleRepository(..., scopeResolver)`
- `admin.NewGoUsersProfileStore(..., scopeResolver)`
- `quickstart.WithGoUsersUserManagement(... ScopeResolver: scopeResolver)` when
  you need an explicit resolver override

Also use the same resolver in custom app repositories or handlers before calling
`RoleRegistry.ListRoles`, `RoleRegistry.AssignRole`, or profile/user inventory
methods that are scoped.

Do not use a raw `ScopeFromContext(ctx)`-style helper for scoped DB reads unless
it also applies `admin.Config.ScopeMode`, `DefaultTenantID`, and `DefaultOrgID`.
That helper may return an empty tenant/org scope for a valid authenticated user
whose JWT does not carry tenant/org claims.

For seeds, use the same default scope as runtime reads. In quickstart-style apps,
`quickstart.DefaultScopeFilter(adminCfg)` returns the default single-tenant
scope; in custom apps, the seed scope should be built from the same tenant/org
config consumed by the runtime scope resolver.

### Scope Wiring Checklist

Before debugging seed data, verify this wiring:

- `admin.Config.ScopeMode` is `single` when single-tenant defaults should apply.
- `admin.Config.DefaultTenantID` and `admin.Config.DefaultOrgID` match seed data.
- The standard quickstart go-users option either omits `ScopeResolver` or passes
  `quickstart.ScopeBuilder(adminCfg)`.
- Manually constructed go-users user and role repositories receive the same
  config-aware resolver.
- The profile store receives the same resolver when profiles are enabled.
- Custom role/user list handlers use the same resolver instead of raw context
  extraction.
- Login/session/JWT metadata either includes tenant/org or the resolver applies
  configured defaults.

## Role Assignment Lookup

go-admin validates custom role assignment IDs before saving users or applying
bulk assignment changes.

Default behavior:

- For `GoUsersRoleRepository`, only UUID role IDs are treated as assignable.
- This prevents primary/system role strings from being mistaken for custom role
  assignment IDs.

If a host app uses non-UUID role IDs, provide an explicit lookup:

```go
adm.WithRoleAssignmentLookup(admin.RoleRepositoryLookup{Roles: roleRepo})
```

`RoleRepositoryLookup` asks the configured role repository whether the role ID
exists. Use this when custom role IDs are meaningful strings instead of UUIDs.

## Bulk Assignment

Quickstart exposes bulk assign and unassign endpoints when the users feature is
enabled. They require user edit permission.

Payload:

```json
{
  "role_id": "role-uuid",
  "ids": ["user-1", "user-2"],
  "replace": false
}
```

Behavior:

- `assign` adds the role to each user.
- `unassign` removes the role from each user.
- `replace` removes existing assignable custom roles before assigning the new
  role.
- The response includes processed, succeeded, failed, and skipped counts.

## Testing

Cover these cases when adding or changing role behavior:

- Seeded privileged roles include required permissions.
- Lower-privilege roles do not receive privileged permissions.
- Permission resolution includes assigned role permissions.
- Navigation and panels are filtered when permissions are missing.
- Role creation/update deduplicates permissions.
- System roles cannot be deleted.
- Assignment lookup rejects invalid role IDs.
- Scoped sessions can see scoped seeded roles.

Focused tests already exist around seed permission repair, role assignment
lookup, role UI behavior, and bulk role changes. Follow those patterns for new
host-specific role behavior.

## Troubleshooting

Roles page returns `403`:

- The user is missing `admin.roles.view`, or auth claims were not attached to the
  request context.

Create/edit/delete role returns `403`:

- The user is missing the matching role mutation permission.
- Deleting a system role is forbidden even when the user has delete permission.

Role list is empty:

- The role repository is not wired.
- The users feature is disabled.
- The authenticated context scope does not match seeded role scope.
- The app passed a raw context-only scope helper into custom go-users reads
  instead of `quickstart.ScopeBuilder(adminCfg)` or an equivalent config-aware
  resolver.
- In single-tenant mode, the JWT may omit tenant/org safely only if the runtime
  resolver applies `DefaultTenantID` and `DefaultOrgID`.

Roles are seeded but `/admin/roles` and `/admin/api/panels/roles` both return
empty records:

- Compare the seed scope with the runtime list scope.
- If seeded rows use the default tenant/org but runtime reads use nil/zero
  tenant/org, fix scope resolver wiring. Do not reseed.
- Ensure custom role repositories call the same config-aware resolver used by
  `NewGoUsersRoleRepository`.

Assigned role does not change navigation:

- The role assignment exists, but permission resolution is not adding role
  permissions to the authorizer's effective claims.
- The menu item may require a different permission string than the role grants.

Custom role ID is ignored:

- With go-users, the default assignment lookup accepts UUID IDs only.
- Use `WithRoleAssignmentLookup(...)` if custom IDs are not UUIDs.

Permission appears in the wrong role form section:

- Debug permissions should use `admin.debug.`.
- Translation permissions should use `admin.translations.`.
- Update the permission matrix config if adding a new dedicated namespace.

Seeded data exists but roles/profiles are empty:

- Check scope. Seed scope, assignment scope, permission resolution scope, and
  auth claims must agree.

## Key Files

- `admin/users.go`
- `admin/users_module.go`
- `admin/role_assignment_lookup.go`
- `quickstart/roles_ui.go`
- `quickstart/user_role_routes.go`
- `quickstart/user_roles_context.go`
- `examples/web/setup/users.go`
- `docs/AUTH.md`
- `docs/GUIDES_PERMISSION_MATRIX.md`
