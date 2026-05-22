# Permission Matrix Guide

This guide explains the `permission-matrix` form component used by Roles and other generated forms in `go-admin`, including the split role permission model, chips-based additional permissions, and customization hooks.

## What it provides

- Grid-based permission editing by resource x action.
- Split-role permission handling for main, debug REPL, and translation permission groups.
- Chips UI for additional permissions with support for custom values.
- Component options for resource/action scope and extra permission filtering.
- Quickstart and custom form generator registration examples.

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Default Role Permission Layout](#2-default-role-permission-layout)
3. [Component Options](#3-component-options)
4. [Chips-Based Additional Permissions](#4-chips-based-additional-permissions)
5. [Quickstart Wiring](#5-quickstart-wiring)
6. [Custom Registration](#6-custom-registration)
7. [Template and Runtime Requirements](#7-template-and-runtime-requirements)
8. [Troubleshooting](#8-troubleshooting)
9. [Key Files](#9-key-files)
10. [See Also](#10-see-also)

---

## 1. Architecture Overview

`permission-matrix` is a custom go-formgen vanilla component registered in go-admin.

At render time it:

1. Builds a checkbox matrix from configured `resources` and `actions`.
2. Marks checkboxes as selected from current role permissions.
3. Derives "extra" permissions that are not represented by the grid.
4. Renders a hidden field that serializes the final permission set for submit.

At runtime (`permission_matrix.ts`) it:

1. Syncs checkbox changes and extras into the hidden field.
2. Deduplicates permissions.
3. Converts any added extra that matches a known grid permission into the matching checkbox.
4. Preserves compatibility with newline-delimited submit payloads.

## 2. Default Role Permission Layout

Roles use three permission-matrix fields. The Users module schema in `admin/users_module.go` and the embedded Roles UI schema in `pkg/client/openapi/uischema/roles.yaml` are aligned:

| Field | Resources | Actions | Notes |
| ---- | ---- | ---- | ---- |
| `permissions` | `admin.dashboard`, `admin.settings`, `admin.users`, `admin.roles`, `admin.activity`, `admin.jobs`, `admin.search`, `admin.preferences`, `admin.profile`, `admin.debug` | `view`, `create`, `import`, `edit`, `delete` | Primary role grid. `admin.debug.view` is edited here because `admin.debug` is a resource row. |
| `permissions_debug` | `admin.debug` | `repl`, `repl.exec` | Dedicated debug REPL row with `showExtra: false`. |
| `permissions_translation` | `admin.translations` | `view`, `edit`, `manage`, `assign`, `approve`, `claim`, `export`, `import.view`, `import.validate`, `import.apply` | Dedicated translation row with `showExtra: false`. |

Role records still store one merged permission list. `roleToRecord` splits `admin.debug.*` and `admin.translations.*` into the dedicated form fields for editing, and `recordToRole` merges `permissions`, `permissions_debug`, and `permissions_translation` back together on save.

The primary `permissions` matrix sets `extraIgnorePrefixes` for:

- `admin.debug.`
- `admin.translations.`

This keeps dedicated debug and translation permissions out of the primary Additional permissions chips.

Important: a matrix with `showExtra: false` only round-trips permissions represented by its configured resource/action grid after the browser runtime syncs the hidden input. If a host app adds new `admin.debug.*` or `admin.translations.*` permissions, add the corresponding actions to the dedicated matrix, or do not suppress that namespace from the primary matrix.

### Component Fallback Defaults

If a caller uses `permission-matrix` without passing `resources` or `actions`, the renderer falls back to broader package defaults in `admin/permission_matrix.go`:

- Resources: `admin.dashboard`, `admin.settings`, `admin.users`, `admin.roles`, `admin.activity`, `admin.jobs`, `admin.search`, `admin.preferences`, `admin.profile`, `admin.debug`, `admin.translations`, `admin.esign`
- Actions: `view`, `create`, `import`, `edit`, `delete`, `send`, `void`, `download`, `settings`, `claim`, `assign`, `approve`, `manage`, `export`, `import.validate`, `import.apply`, `import.view`

The Roles UI does not rely on those fallback defaults; it passes the narrower split configuration above.

## 3. Component Options

`componentOptions` supported by `permission-matrix`:

| Option | Type | Default | Description |
| ---- | ---- | ---- | ---- |
| `resources` | `[]string` | package fallback defaults | Resource prefixes for rows (for example `admin.users`). |
| `actions` | `[]string` | package fallback defaults | Action suffixes for columns (for example `view`, `edit`). |
| `showExtra` | `bool` | `true` | Shows/hides the Additional permissions block. |
| `extraIgnore` | `[]string` | `nil` | Exact extra permission keys to suppress from Additional permissions. |
| `extraIgnorePrefixes` | `[]string` | `nil` | Extra permission prefixes to suppress. |
| `extraOptions` | `[]string` | `nil` | Seed option list for Additional permissions chips. |

Example:

```yaml
permissions:
  component: permission-matrix
  componentOptions:
    resources: [admin.dashboard, admin.users, admin.roles]
    actions: [view, create, edit, delete]
    extraIgnorePrefixes:
      - admin.debug.
      - admin.translations.
    extraOptions:
      - admin.media.view
      - admin.pages.view
```

## 4. Chips-Based Additional Permissions

When `showExtra` is enabled, Additional permissions uses a chips-enabled multi-select:

- Existing extras are rendered as selected chips.
- You can add custom permissions through the "Add permission" input/button.
- If an added permission matches a known grid permission, it is moved into the checkbox grid automatically.

Notes:

- `extraOptions` provides curated suggestions.
- Current extra permissions are merged into the option list so existing values remain visible.
- Unknown/custom permission strings remain supported through the Add input.
- Final payload remains newline-delimited in the hidden `name="{{ field_name }}"` input.

## 5. Quickstart Wiring

The default quickstart roles UI uses `admin.NewRoleFormGenerator(cfg)`, which registers `permission-matrix` and loads the embedded Roles OpenAPI and UI schema.

Primary locations:

- `admin/roles_formgen.go`: constructs the Roles form generator and registers `admin.PermissionMatrixDescriptor(cfg.BasePath)`.
- `admin/users_module.go`: default Users module role panel schema and split matrix config.
- `pkg/client/openapi/uischema/roles.yaml`: UI schema overlays for create/update role operations.
- `pkg/client/openapi/roles.json`: Roles payload fields, including `permissions_debug` and `permissions_translation`.
- `quickstart/roles_ui.go`: quickstart route handlers that use the role form generator.

For content-type generated forms, `admin.NewFormgenSchemaValidatorWithAPIBase(...)` also registers `permission-matrix` so schema previews can render the component.

## 6. Custom Registration

If you build a custom form generator registry:

```go
componentRegistry := components.New()
componentRegistry.MustRegister("permission-matrix", admin.PermissionMatrixDescriptor(cfg.BasePath))
```

Then pass the registry to formgen vanilla renderer construction, or merge it through quickstart helpers. `admin.NewRoleFormGenerator` already performs this registration for the built-in Roles UI.

## 7. Template and Runtime Requirements

The component descriptor adds the browser runtime script:

- `assets/dist/formgen/permission_matrix.js`

For chips hydration in Additional permissions, the host page must also load the relationships runtime:

1. Include `runtime/formgen-relationships.min.js`.
2. Call `window.FormgenRelationships.initRelationships(...)` on page load.

Roles form template includes this initialization in:

- `pkg/client/templates/resources/roles/form.html`

Without relationship runtime initialization, the select still works as a plain `<select multiple>`, but chips UI will not render. Without `permission_matrix.js`, checkbox and Add input changes will not resync the hidden submitted value.

## 8. Troubleshooting

**Additional permissions show as plain select, not chips**
- Verify `runtime/formgen-relationships.min.js` is loaded.
- Verify `initRelationships(...)` is executed after DOM ready.

**Permissions duplicated on submit**
- Ensure only the hidden `.permission-matrix-value` field is bound for server reads.
- Do not parse both visible extras and hidden value server-side.

**Debug/translation permissions appearing in main extras**
- Add/update `extraIgnorePrefixes` on primary `permissions` matrix:
  - `admin.debug.`
  - `admin.translations.`

**Debug/translation permissions disappear after saving**
- Ensure every suppressed namespace permission is represented in its dedicated matrix.
- For example, `admin.debug.repl.exec` is covered by `permissions_debug`, but a custom `admin.debug.session.attach` action must be added to that matrix before suppressing `admin.debug.` from main extras.

**Incoming value format mismatch**
- Parser supports multiple legacy forms: newline list, comma-separated list, JSON array string, and bracketed slice-style string.

## 9. Key Files

- `admin/permission_matrix.go`
- `admin/permission_matrix_test.go`
- `admin/users_module.go`
- `admin/users_module_test.go`
- `admin/roles_formgen.go`
- `admin/translation_permissions.go`
- `pkg/client/templates/formgen/vanilla/templates/components/permission_matrix.tmpl`
- `pkg/client/assets/src/formgen/permission_matrix.ts`
- `pkg/client/templates/resources/roles/form.html`
- `pkg/client/openapi/roles.json`
- `pkg/client/openapi/uischema/roles.yaml`
- `quickstart/roles_ui.go`

## 10. See Also

- `GUIDE_MODULES.md`
- `GUIDE_ROLES.md`
- `GUIDE_VIEW_CUSTOMIZATION.md`
- `GUIDE_FEATURE_GATES.md`
- `../quickstart/README.md`
