# go-admin Documentation Index

Use this index as the entry point for repository documentation. Prefer updating
the closest existing guide when conventions change.

## Start Here

| Need | Read |
|---|---|
| Development workflow, testing, logging, and docs hygiene | `GUIDE_DEVELOPMENT.md` |
| CI/CD, linting, release, and quality commands | `GUIDE_DEVELOPMENT_CICD.md` |
| Quickstart API and defaults | `../quickstart/README.md` |
| Package overview and high-level extension points | `../README.md` |

## Frontend, UI, And Actions

| Need | Read |
|---|---|
| Frontend reuse map, DataGrid/toast conventions, and server-command boundaries | `GUIDE_FRONTEND.md` |
| Reusable template partials and selector contracts | `GUIDE_UI_PRIMITIVES.md` |
| Panel CRUD, DataGrid wiring, list APIs, row actions, and bulk actions | `GUIDE_CRUD.md` |
| Action availability, enhanced SSR actions, fragments, and mutation feedback | `GUIDE_ACTIONS.md` |
| View engine layering, template overrides, and asset pipeline | `GUIDE_VIEW_CUSTOMIZATION.md` |
| Form generation, go-formgen integration, and UI schema overlays | `GUIDE_FORMGEN.md` |
| Block editor setup and content-type-builder UI | `GUIDE_BLOCK_EDITOR.md` |
| Tab widgets and tabbed detail surfaces | `GUIDE_TAB_WIDGETS.md` |
| Theme and go-theme integration | `GUIDE_THEME.md` |

## Server Transports, Commands, And Workflow

| Need | Read |
|---|---|
| RPC transport, command dispatch, allowlists, and command runtime wiring | `GUIDE_RPC.md` |
| Workflows, state machines, and panel workflow actions | `GUIDE_WORKFLOW.md` |
| Background command routing observability | `GUIDE_BKG_CMD_OBSERVABILITY.md` |
| Transaction hooks and outbox behavior | `GUIDE_TRANSACTION_OUTBOX.md` |
| Persisted workflow and application persistence | `PERSISTENCE_GUIDE_GO_ADMIN.md` |
| Error code reference | `ERROR_CODES.md` |

## Modules And Features

| Need | Read |
|---|---|
| Module creation, registration, routes, menus, and module conventions | `GUIDE_MODULES.md` |
| Dashboard widgets and widget providers/renderers | `GUIDE_DASHBOARD_WIDGETS.md` |
| Feature gates and capability dependencies | `GUIDE_FEATURE_GATES.md` |
| Routing policy, route ownership, and manifest review | `GUIDE_ROUTING.md` |
| Search and go-search adapters | `GUIDE_SEARCH.md` |
| Activity module and activity API | `GUIDE_ACTIVITY.md` |
| Media module configuration and delivery | `GUIDE_MODULE_MEDIA.md` |
| Preferences module behavior | `GUIDE_MOD_PREFERENCES.md` |
| Onboarding workflow | `GUIDE_ONBOARDING.md` |

## Auth, Roles, And Permissions

| Need | Read |
|---|---|
| Authentication, authorization, permission checks, scope, and diagnostics | `GUIDE_AUTH_PERMISSIONS.md` |
| Auth/authz reference | `AUTH.md` |
| Roles and role seeding | `GUIDE_ROLES.md` |
| Permission matrix | `GUIDES_PERMISSION_MATRIX.md` |
| Temporary admin password behavior | `GUIDE_ADMIN_TEMPORARY_PASSWORD.md` |

## CMS, Translation, And Content

| Need | Read |
|---|---|
| CMS module development and content CRUD alignment | `GUIDE_CMS.md` |
| CMS integration overview | `CMS_INTEGRATION.md` |
| Translation workflow and UI behavior | `GUIDE_TRANSLATION.md` |
| E-sign persistence operations | `ESIGN_PERSISTENCE_RUNBOOK.md` |
| E-sign contract ledger | `GUIDES_ESIGN_TRACK_C_CONTRACT_LEDGER.md` |

## Debugging And Operations

| Need | Read |
|---|---|
| Debug module backend configuration, capture, APIs, and troubleshooting | `GUIDE_DEBUG_MODULE.md` |
| Debug frontend architecture and panel renderers | `GUIDE_DEBUG_CLIENT.md` |
| Commerce example setup | `COMMERCE_SETUP.md` |

## Reference And Archive

Detailed design notes, historical implementation context, and lower-level
technical references live under `reference/`. Use them for background, but keep
current conventions in the top-level guides above.

Archived plans and completed task notes live under `archive/`. Do not treat
archive files as current implementation guidance unless a top-level guide
explicitly points to them.
