# Permission Matrix Guide

This guide explains the `permission-matrix` form component used by Roles in `go-admin`, including the split role permission model, chips-based additional permissions, and customization hooks.

## What it provides

- Grid-based permission editing by resource x action.
- Split-role permission handling for main, debug, and translation permission groups.
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
3. Preserves compatibility with newline-delimited submit payloads.

## 2. Default Role Permission Layout

Roles use three permission-matrix fields:

- `permissions`: primary grid (`view/create/import/edit/delete`) across core admin resources.
- `permissions_debug`: dedicated debug row (`repl`, `repl.exec`), `showExtra: false`.
- `permissions_translation`: dedicated translation row (`view/edit/manage/assign/approve/claim/export/import.*`), `showExtra: false`.

In the primary `permissions` matrix, `extraIgnorePrefixes` excludes debug and translation permission namespaces so they do not appear in Additional permissions when those permissions are handled in dedicated rows.

## 3. Component Options

`componentOptions` supported by `permission-matrix`:

| Option | Type | Default | Description |
| ---- | ---- | ---- | ---- |
| `resources` | `[]string` | built-in defaults | Resource prefixes for rows (for example `admin.users`). |
| `actions` | `[]string` | built-in defaults | Action suffixes for columns (for example `view`, `edit`). |
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
- Unknown/custom permission strings remain supported through the Add input.
- Final payload remains newline-delimited in the hidden `name="{{ field_name }}"` input.

## 5. Quickstart Wiring

Roles form schema defaults are provided by the Users module and include all three permission matrix fields.

Primary locations:

- `admin/users_module.go`: default role schema and matrix config.
- `pkg/client/openapi/uischema/roles.yaml`: UI schema overlays for create/update role operations.

## 6. Custom Registration

If you build a custom form generator registry:

```go
componentRegistry := components.New()
componentRegistry.MustRegister("permission-matrix", admin.PermissionMatrixDescriptor(cfg.BasePath))
```

Then pass the registry to formgen vanilla renderer construction (or quickstart merge helpers).

## 7. Template and Runtime Requirements

For chips hydration in Additional permissions:

1. Include `runtime/formgen-relationships.min.js`.
2. Call `window.FormgenRelationships.initRelationships(...)` on page load.

Roles form template includes this initialization in:

- `pkg/client/templates/resources/roles/form.html`

Without relationship runtime initialization, the select still works as a plain `<select multiple>`, but chips UI will not render.

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

**Incoming value format mismatch**
- Parser supports multiple legacy forms: newline list, comma-separated list, JSON array string, and bracketed slice-style string.

## 9. Key Files

- `admin/permission_matrix.go`
- `admin/permission_matrix_test.go`
- `admin/users_module.go`
- `pkg/client/templates/formgen/vanilla/templates/components/permission_matrix.tmpl`
- `pkg/client/assets/src/formgen/permission_matrix.ts`
- `pkg/client/templates/resources/roles/form.html`
- `pkg/client/openapi/uischema/roles.yaml`

## 10. See Also

- `GUIDE_MODULES.md`
- `GUIDE_VIEW_CUSTOMIZATION.md`
- `GUIDE_FEATURE_GATES.md`
- `../quickstart/README.md`
