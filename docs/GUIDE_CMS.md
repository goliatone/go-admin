# CMS Module Development Guide

This guide explains how to use and extend the CMS module in `go-admin`. It covers localization, approval workflows, content previews, and public delivery APIs.

## What it provides

- **Localizable Content**: Support for multi-language content via `go-i18n`.
- **Approval Workflows**: State-machine based lifecycle for content (e.g., draft -> published).
- **Secure Previews**: HMAC or JWT-signed tokens for temporary access to non-published content.
- **Public API**: Read-only JSON endpoints for frontend content delivery.
- **Menu Management**: CMS-backed menus with location support and content linking.
- **Service Abstractions**: Pluggable interfaces for content, menus, and widgets.

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Localization Strategy](#2-localization-strategy)
3. [Slug Rules & Content Types](#3-slug-rules--content-types)
4. [Schema Validation](#4-schema-validation)
5. [Approval Workflow](#5-approval-workflow)
6. [Content Preview Mechanism](#6-content-preview-mechanism)
7. [Public Content Delivery API](#7-public-content-delivery-api)
8. [Menu Management](#8-menu-management)
9. [GraphQL Prerequisites](#9-graphql-prerequisites)
10. [API Endpoints](#10-api-endpoints)
11. [Configuration](#11-configuration)
12. [Best Practices](#12-best-practices)
13. [Key Files](#13-key-files)
14. [Example Implementation](#14-example-implementation)
15. [Admin Read Model (Pages)](#15-admin-read-model-pages)
16. [See Also](#16-see-also)
17. [Translation Workflow Operations](#17-translation-workflow-operations)
18. [Translation Queue Operations](#18-translation-queue-operations)

---

## 1. Architecture Overview

The CMS module is built on top of the `go-admin` orchestration layer. it coordinates several services to provide a complete content management solution.

### Key Interfaces

- **`CMSContentService`**: Manages pages, posts, and blocks.
- **`CMSMenuService`**: Manages navigation menus.
- **`WorkflowEngine`**: Handles state transitions for content entities.
- **`Translator`**: Resolves i18n keys into localized strings.

### Data Flow

1. **Admin UI**: Editors create and manage content via Panels.
2. **Workflow**: Content moves through states (e.g., `draft` -> `pending_approval` -> `published`).
3. **Preview**: Non-published content can be viewed using signed tokens.
4. **Public API**: Frontends consume published content via JSON endpoints.

---

## 2. Localization Strategy

### Content Localization

Content follows a "One Record per Locale" pattern. Each translation is a separate record linked by a shared `translation_group_id`.

- **Locale Field**: All localizable entities (Pages, Posts) must have a `locale` field.
- **Translation Group**: The `translation_group_id` field ties related locale variants together.
- **Create Translation Action**: Panels expose a `create_translation` action to seed new locale variants.
- **Automatic Translation**: When a `Translator` is provided to `Admin`, field labels, options, and actions are automatically translated if they provide a `LabelKey`.

### The `Translator` Interface

Updated to match `go-i18n` conventions:

```go
type Translator interface {
    Translate(locale, key string, args ...any) (string, error)
}
```

---

## 3. Slug Rules & Content Types

Content types are first-class CMS entities and require `name`, `slug`, and `schema`.

### Content Type Slug Rules

- Slugs are **required** and must be unique across all content types.
- Slugs are normalized to lowercase.
- Spaces and underscores are normalized to hyphens.
- Only `a-z`, `0-9`, and `-` are accepted after normalization.
- Leading/trailing hyphens are trimmed.

Examples:

- `Blog Posts` → `blog-posts`
- `case_study` → `case-study`
- `news@2024` → invalid (contains `@`)

### Page Paths vs Slugs

- Pages are routed by `path` (falling back to `slug` when `path` is empty).
- Page `path` must be unique **per locale** to avoid routing collisions.
- Preview URLs use `path` when present and fall back to the page slug.

### Content Type Activation & Pages/Posts Sync

go-admin only creates dynamic panels (and the content entry UI) for content types
that are **active**. If a content type is still in `draft` or has been
`deprecated`, the panel is not registered and the admin UI routes will not
resolve.

Pages and Posts are now standard content types, with content entries as the
single source of truth. To keep the legacy Pages/Posts experience:

- Ensure the `page` and `post` content types are `active` (and seeded as such).
- Use capabilities to wire workflows + permissions (for example,
  `workflow=pages`, `permissions=admin.pages` for `page`, and `workflow=posts`,
  `permissions=admin.posts` for `post`).
- Use the `panel_slug` capability to map content types onto existing panel
  names. For example, `blog_post` with `panel_slug=posts` renders the Posts
  panel and inherits `/admin/content/posts` routes.

---

## 4. Schema Validation

Content type schemas are used to generate forms and to validate payloads at write time
when backed by go-cms.

### Supported Schema Shapes

1. **JSON Schema** (recommended) — object schema with `properties` and optional `required`:

```json
{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "body": { "type": "string" },
    "category": { "type": "string", "enum": ["news", "blog"] }
  },
  "required": ["title"]
}
```

2. **Custom `fields` list** — a lightweight schema for simple forms:

```json
{
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "body", "type": "textarea" }
  ]
}
```

### Validation Errors

Schema validation errors are surfaced as `VALIDATION_ERROR` responses with
field-level metadata:

```json
{
  "error": {
    "message": "validation failed",
    "metadata": {
      "fields": {
        "title": "required"
      }
    }
  }
}
```

### Embedded Blocks Migration (Dual-Write)

When CMS entities use modular blocks, go-admin writes embedded `blocks[]` arrays
directly into page/content payloads. When the backing container is go-cms, the
embedded blocks bridge keeps legacy block instances in sync so older readers and
APIs remain compatible during migration.

Key behaviors:

- **Dual-write**: embedded blocks are synced into legacy block instances on
  create/update to keep both representations aligned.
- **Read fallback**: delivery/preview endpoints prefer embedded blocks and fall
  back to legacy instances when embedded data is missing.
- **Backfill + conflicts**: use go-cms’s embedded block backfill to populate
  `blocks[]` on existing content, and review the Block Conflicts panel in admin
  to spot mismatches before turning off legacy writes.

Recommended migration flow:

1. Enable embedded blocks + dual-write.
2. Backfill `blocks[]` from legacy instances.
3. Resolve conflicts (embedded vs legacy).
4. Treat embedded blocks as canonical and retire legacy reads when safe.

---

## 5. Approval Workflow

The CMS module includes a state-machine based workflow engine to manage content lifecycles.

### States and Transitions

Typical states include:

- `draft`: Initial state, visible only in admin.
- `pending_approval`: Content is locked and waiting for review.
- `published`: Content is live and accessible via public APIs.
- `archived`: Content is no longer live but preserved.

### `SimpleWorkflowEngine`

`go-admin` provides a reference implementation for state transitions:

```go
workflow := admin.NewSimpleWorkflowEngine()
workflow.RegisterWorkflow("pages", admin.WorkflowDefinition{
    EntityType: "pages",
    Transitions: []admin.WorkflowTransition{
        {Name: "request_approval", From: "draft", To: "pending_approval"},
        {Name: "approve", From: "pending_approval", To: "published"},
    },
})
```

Transitions are exposed as Panel actions and enforced during updates. Workflow enforcement runs inside panel update hooks so status changes always pass through the workflow engine.
CMS demo panels default to the `submit_for_approval` and `publish` actions. Override them with `adm.WithCMSWorkflowActions(...)` (use `admin.DefaultCMSWorkflowActions()` as a base).

### Row Action Availability Contract (`_action_state`)

List responses now include per-record action availability metadata under
`_action_state`. The UI uses this to disable actions that are not valid for the
current record state.

Example record fragment:

```json
{
  "id": "post_123",
  "status": "published",
  "_action_state": {
    "submit_for_approval": {
      "enabled": false,
      "reason_code": "workflow_transition_not_available",
      "reason": "transition \"submit_for_approval\" is not available from state \"published\"",
      "available_transitions": ["unpublish"]
    },
    "publish": {
      "enabled": false,
      "reason_code": "workflow_transition_not_available"
    },
    "unpublish": {
      "enabled": true,
      "available_transitions": ["unpublish"]
    }
  }
}
```

Current `reason_code` values:

- `workflow_transition_not_available`
- `workflow_not_configured`
- `workflow_transitions_unavailable`
- `record_id_missing`
- `missing_context_required`
- `permission_denied`

### Action Execution Error Semantics

Workflow-backed row actions now return workflow-specific errors instead of a
generic action lookup failure:

- `WORKFLOW_INVALID_TRANSITION` when the action is defined but not available in
  the current state.
- `WORKFLOW_NOT_FOUND` (or repository lookup errors like `NOT_FOUND`) when
  workflow/record lookup fails for a workflow-backed action.

Command-backed actions still use command dispatch fallback behavior.

### Boot-Time Action Wiring Validation

`Admin.Prepare(...)` validates panel action wiring before routes are used.
Validation fails fast when:

- a row/bulk action references an unregistered command factory
- a workflow action exists but no workflow is configured
- a workflow action exists but no matching workflow transition is registered

This is intended to catch configuration drift at startup instead of at request
time.

### Block Definitions Workflow

The Content Type Builder module also publishes and deprecates block definitions.
Those actions use workflow transitions, so ensure a workflow is registered for
`block_definitions` with the expected states:

```go
workflow.RegisterWorkflow("block_definitions", admin.WorkflowDefinition{
    EntityType:   "block_definitions",
    InitialState: "draft",
    Transitions: []admin.WorkflowTransition{
        {Name: "publish", From: "draft", To: "active"},
        {Name: "deprecate", From: "active", To: "deprecated"},
        {Name: "republish", From: "deprecated", To: "active"},
    },
})
```

When you do not provide a custom workflow engine, go-admin registers the default
CMS workflow set (content, pages, block definitions, and content types) for you.
To start from defaults and override only a subset, call `admin.RegisterDefaultCMSWorkflows(workflow)` before registering your overrides, or
use `adm.WithWorkflow(workflow).WithCMSWorkflowDefaults()` to fill missing defaults when the engine can report existing definitions.

### Workflow Authorization

Workflow transitions can be guarded separately from CRUD permissions using a
`WorkflowAuthorizer`. For panels, attach one with `PanelBuilder.WithWorkflowAuthorizer`.
For the Content Type Builder module, use `WithContentTypeBuilderWorkflowAuthorizer`:

```go
workflowAuth := admin.NewRoleWorkflowAuthorizer(
    "admin",
    admin.WithWorkflowPermission("admin", "edit"),
)

builder := admin.NewContentTypeBuilderModule(
    admin.WithContentTypeBuilderWorkflow(workflow),
    admin.WithContentTypeBuilderWorkflowAuthorizer(workflowAuth),
)
```

Use `WithWorkflowExtraCheck` to add custom checks when role and permission
checks are not enough.

---

## 6. Content Preview Mechanism

The preview mechanism allows stakeholders to view content before it is published without making it public.

### Preview Tokens

Tokens can be either:

- **HMAC tokens** (default): Custom signed payloads.
- **JWT tokens**: HS256-signed JWTs.

Both formats carry:

- `content_id`: The ID of the record.
- `entity_type`: The panel name (e.g., "pages").
- `expiry`: Unix timestamp.

### Usage

1. **Generate**: Call `admin.Preview().Generate(entity, id, duration)` or `GenerateJWT(...)`.
2. **Admin URL**: `/admin/api/:panel/:id/preview?format=jwt` (or `?token_type=jwt`) returns a JWT token.
3. **Public URL**: `/api/v1/preview/<token>` (or `/admin/api/preview/<token>`) resolves the content. The admin preview route is always registered when preview is enabled, even if `EnablePublicAPI` is false.
4. **Validate**: The public API or site handler calls `Validate(token)` to retrieve content regardless of status.

---

## 7. Public Content Delivery API

The `Admin` orchestrator can expose read-only endpoints for frontend consumption.

### Available Endpoints

- `GET /api/v1/content/pages/:slug`: Retrieve a published page by slug.
- `GET /api/v1/content/posts`: List published posts (filterable by category).
- `GET /api/v1/menus/:location`: Retrieve a menu tree for a specific site area.
- `GET /api/v1/preview/:token`: Securely view non-published content.
- `GET /admin/api/preview/:token`: Admin-scoped preview endpoint (JWT + HMAC).

### Registration

Enable the public API in your configuration:

```go
cfg := admin.Config{
    EnablePublicAPI: true,
    PreviewSecret:   "your-secure-secret",
}
```

---

## 8. Menu Management

Menus are backed by the `CMSMenuService` and support hierarchical structures.

### Menu Locations

Menus can be assigned to "Locations" (e.g., `main-nav`, `footer-links`) to help frontends resolve the correct menu for a specific UI area. If a location is not set, the public API falls back to the menu code.

### Content Linking

Menu targets can reference CMS content using:

- `page_id`: Links to a CMS page by ID.
- `content_id`: Links to a CMS content entry (e.g. posts).

When a menu target lacks an explicit `url`, the public API resolves it from the linked content (`page_id` or `content_id`) and falls back to the content slug if needed.

```go
type Menu struct {
    ID       string
    Code     string
    Location string
    Items    []MenuItem
}
```

---

## 9. GraphQL Prerequisites

go-admin exposes GraphQL adapters via the `go-crud/gql` registry. To enable it:

1. **Register schemas** before generation:
   - `admin.RegisterDeliveryGraphQLSchemas()`
   - `admin.RegisterManagementGraphQLSchemas()`
2. **Provide services** backed by CMS:
   - `admin.NewDeliveryServices(container, admin.DeliveryOptions{DefaultLocale: "en"})`
   - `admin.NewManagementServices(container, admin.DeliveryOptions{DefaultLocale: "en"})`
3. **Wire go-crud/gql** into your transport (GraphQL server/router of choice).
4. **Ensure content type schemas are valid JSON Schema** so GraphQL types can be generated.

Preview and draft access can be enabled with query flags on the management API:

- `preview=true` or `include_drafts=true` to bypass published-only filters.

---

## 10. API Endpoints

### Public API (Content Delivery)

| Method | Path                          | Description                  |
| ------ | ----------------------------- | ---------------------------- |
| GET    | `/api/v1/content/pages/:slug` | Published page by slug       |
| GET    | `/api/v1/content/posts`       | List of published posts      |
| GET    | `/api/v1/menus/:location`     | Menu tree by location        |
| GET    | `/api/v1/preview/:token`      | Secure non-published content |

### Admin API (CMS Management)

| Method | Path                                         | Description                            |
| ------ | -------------------------------------------- | -------------------------------------- |
| GET    | `/admin/api/:panel/:id/preview`              | Generate preview token (`?format=jwt`) |
| GET    | `/admin/api/preview/:token`                  | Resolve preview token                  |
| POST   | `/admin/api/:panel/actions/request_approval` | Submit for review                      |
| POST   | `/admin/api/:panel/actions/approve`          | Approve and publish                    |

### Admin UI Routes (Content Entry UI + Aliases)

Content entry screens mount under `/admin/content/:panel` when you register
`quickstart.RegisterContentEntryUIRoutes` (or the equivalent wiring in your app).
Common route options:

- `quickstart.WithContentEntryUIBasePath(...)`
- `quickstart.WithContentEntryUITemplates(list, form, detail)`
- `quickstart.WithContentEntryUIViewContext(...)`
- `quickstart.WithContentEntryUIPermission(...)`
- `quickstart.WithContentEntryUIAuthResource(...)`
- `quickstart.WithContentEntryFormRenderer(...)`
- `quickstart.WithContentEntryUITemplateFS(...)`
- `quickstart.WithContentEntryUITemplateExists(...)`
- `quickstart.WithContentEntryDefaultRenderers(map[string]string{...})` (replace configured map)
- `quickstart.WithContentEntryMergeDefaultRenderers(map[string]string{...})` (merge/override configured map)
- `quickstart.WithContentEntryRecommendedDefaults()` (opt-in recommended renderer defaults)

Common routes include:

- `/admin/content/:panel` (list)
- `/admin/content/:panel/new` (create)
- `/admin/content/:panel/:id` (detail)
- `/admin/content/:panel/:id/edit` (edit)

go-admin also registers alias routes for Pages/Posts when CMS is enabled:

- `/admin/pages` → `/admin/content/pages`
- `/admin/posts` → `/admin/content/posts`

Alias resolution uses the `panel_slug` capability, so a content type like
`blog_post` with `panel_slug=posts` is served by the Posts panel. Query
parameters (including `env`) are preserved during the redirect.

### Content Entry List/Detail Rendering Mechanics

The content-entry list columns are derived from panel `ListFields`, and filter
metadata comes from panel `Filters`. When `Filters` are empty, the UI
automatically falls back to list-field based filters.

List columns now support renderer metadata:

- `renderer`: named DataGrid renderer (for example `_array`, `_object`).
- `renderer_options`: options passed to the renderer.

List templates should consume DataGrid wiring from `datagrid_config` (template
view context) instead of hardcoded table IDs or endpoints. Canonical keys:

- `datagrid_config.table_id`
- `datagrid_config.api_endpoint`
- `datagrid_config.action_base`
- `datagrid_config.column_storage_key`
- `datagrid_config.export_config`

Compatibility keys (`datatable_id`, `list_api`, `action_base`, `export_config`)
are still provided for legacy templates, but should be treated as fallback-only.

Built-in list renderer fallback:

- array-like fields (`array`, `multiselect`, `tags`, `blocks`, `block-library-picker`) -> `_array`
- object-like fields (`json`, `jsonschema`, `object`) -> `_object`

Optional quickstart defaults can be configured by field type:

- `WithContentEntryDefaultRenderers(...)` replaces the configured defaults map.
- `WithContentEntryMergeDefaultRenderers(...)` merges into the configured map.
- `WithContentEntryRecommendedDefaults()` merges this recommended map:
  `{"blocks":"blocks_chips","block-library-picker":"blocks_chips"}`.

Renderer resolution order:

1. `ui_schema.fields.<field>.renderer` (or aliases like `cell_renderer`)
2. configured quickstart defaults (`defaultRenderers[fieldType]`)
3. built-in fallback mapping (`_array`, `_object`, etc.)

You can override render behavior per field using `ui_schema.fields.<field>` (or
`ui_schema.fields./<field>`). Supported hint keys:

- `renderer` / `cell_renderer` / `cellRenderer`
- `renderer_options` / `rendererOptions`
- `display_key` / `displayKey`
- `display_keys` / `displayKeys`

Nested scopes are supported under `table`, `list`, `datagrid`, or `data_grid`
inside each field hint.

Detail view formatting is scalar-safe by default:

- arrays render as comma-separated summaries;
- objects use `display_key`/`display_keys` first, then common label keys
  (`name`, `label`, `title`, `slug`, `id`, etc.);
- unresolved objects fall back to compact JSON, preventing raw reflect output.

### blocks_chips Renderer

The `blocks_chips` renderer displays block arrays as styled chips with icons,
providing a compact visualization of content blocks in list views.

**Renderer name:** `blocks_chips`

**Supported options** (snake_case and camelCase accepted):

| Option            | Type              | Default       | Description                                      |
| ----------------- | ----------------- | ------------- | ------------------------------------------------ |
| `max_visible`     | number            | `3`           | Maximum chips shown before overflow badge        |
| `show_count`      | boolean           | `true`        | Show "+N more" badge when blocks exceed max      |
| `chip_variant`    | string            | `"default"`   | Chip styling variant (`default`, `muted`, `outline`) |
| `block_icons_map` | `Record<string, string>` | server-provided | Map of block type to icon reference     |

**Block label resolution order:**

1. `_type` field
2. `type` field
3. `blockType` field
4. `block_type` field
5. String value fallback (for legacy string arrays)

**Icon resolution order:**

1. `block_icons_map[label]` from renderer options
2. Default: `iconoir:view-grid`

**Server behavior:**

- When a column uses `renderer: "blocks_chips"`, the server automatically
  attaches `block_icons_map` to `renderer_options` by querying block
  definitions for the current environment.
- If `block_icons_map` is already provided in `ui_schema`, the server value
  is not applied (user override wins).
- Block definition fetch failures do not fail the list response; chips render
  without icons and errors are logged once per request path.

**Example ui_schema configuration:**

```json
{
  "fields": {
    "blocks": {
      "renderer": "blocks_chips",
      "renderer_options": {
        "max_visible": 4,
        "show_count": true,
        "chip_variant": "muted"
      }
    }
  }
}
```

**Payload shapes supported:**

- Embedded objects array: `[{"_type": "hero", ...}, {"_type": "text", ...}]`
- Legacy string array: `["hero", "text", "gallery"]`

---

## 11. Configuration

Key configuration fields in `admin.Config`:

| Field             | Description                                     | Default                          |
| ----------------- | ----------------------------------------------- | -------------------------------- |
| `DefaultLocale`   | Default language code.                          | `en`                             |
| `EnablePublicAPI` | Whether to mount `/api/v1` routes.              | `false`                          |
| `PreviewSecret`   | Secret key for signing HMAC/JWT preview tokens. | `admin-preview-secret-change-me` |

---

## 12. Best Practices

1. **Use `LabelKey` for Fields** — Always provide a `LabelKey` in panel field definitions to enable automatic i18n translation.
2. **Define Clear Workflows** — Register workflows for all localizable content and for `block_definitions` when using the block library.
3. **Secure the Preview Secret** — Use a strong, environment-specific `PreviewSecret` in production.
4. **Leverage Menu Locations** — Assign menus to locations (e.g., `main-nav`) rather than hardcoding slugs in the frontend.
5. **Handle Content Errors** — Use `writeError` helpers to return standard CMS error responses (e.g., `ErrNotFound`).

---

## 13. Key Files

| File                              | Description                                       |
| --------------------------------- | ------------------------------------------------- |
| `admin/public_api.go`             | Public content delivery routes and handlers       |
| `admin/preview.go`                | Preview token generation and validation           |
| `admin/cms_workflow.go`           | Default CMS workflow registrations                |
| `admin/workflow_simple.go`        | Reference state-machine workflow engine           |
| `admin/workflow_authorizer.go`    | Workflow authorization helpers                    |
| `admin/content_type_builder_module.go` | Content type builder module wiring          |
| `admin/internal/cmsboot/types.go` | Core CMS entity definitions (Page, Content, Menu) |
| `admin/admin.go`                  | Service orchestration and translator integration  |

---

## 14. Example Implementation

See `examples/web/main.go` for a full implementation featuring:

- `go-i18n` integration.
- Custom workflows for Pages and Posts.
- Preview integration in site handlers.
- Public API enablement.

---

## 15. Admin Read Model (Pages)

Admin list and detail reads should use a single contract, `AdminPageRecord`, exposed via `AdminPageReadService`. `PageApplicationService` composes this read service with the write service so HTML handlers and JSON CRUD share the same mapping and workflow behavior.

### Read/write split

- Reads: `AdminPageReadService.List`/`Get` return `AdminPageRecord`.
- Writes: `AdminPageWriteService.Create/Update/Delete/Publish/Unpublish`.
- `PageApplicationService` applies include defaults (list minimal, get full) and workflow transitions.

### Include flags (AdminPageListOptions / AdminPageGetOptions)

- `IncludeContent`: include the localized content body (string or structured) in `Content`.
- `IncludeBlocks`: include the embedded blocks payload in `Blocks` (omitted when false).
- `IncludeData`: include a normalized `Data` map for UI hydration (path/meta/summary/tags/content/blocks).

`PageApplicationService` defaults list reads to minimal includes and detail reads to full includes unless overridden.

### Locale resolution + missing translations

- `RequestedLocale` is always set to the incoming locale (even when no translation exists).
- `ResolvedLocale` is the locale actually used (requested locale if available, otherwise `FallbackLocale`).
- When `AllowMissingTranslations` is true and no translation exists, localized fields can be empty while identifiers/status still return. When false, missing translations may be treated as not found.

### Blocks payload contract

- `Blocks` prefers embedded blocks arrays (objects with `_type` + fields).
- If embedded blocks are absent, fall back to legacy block ID arrays.
- When `IncludeData` is true, `Data["blocks"]` should mirror the selected payload.

### Read service selection (go-cms vs view-backed)

- Preferred: use the go-cms admin read service when your CMS container exposes `AdminPageReadService` (or a compatible method) via `Config.CMS.Container`, `Config.CMS.ContainerBuilder`, or `Config.CMS.GoCMSConfig`.
- Fallback: a view-backed adapter (for example, `examples/web/stores.AdminPageStoreAdapter`) can read from `admin_page_records` for list performance and hydrate missing fields from the CMS store for detail/edit.

---

## 16. See Also

- [Module Development Guide](GUIDE_MODULES.md) — Creating and registering modules.
- [View Customization Guide](GUIDE_VIEW_CUSTOMIZATION.md) — Theming and templates.
- [Block Editor Guide](GUIDE_BLOCK_EDITOR.md) — Block editor setup, drag/drop, icon picker, and custom icon tabs.
- [CMS TDD](../CMS_TDD.md) — Technical design document for the CMS extension.

---

## 17. Translation Workflow Operations

This section documents the production contract for translation workflow
enforcement and rollout.

### 17.1 Translation policy configuration

Quickstart enforces translation requirements during workflow transitions when
`WithTranslationPolicyConfig(...)` is provided (or when policy settings are
present in config).

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
          production:
            locales: ["en", "es", "fr"]
    posts:
      publish:
        locales: ["en"]
        required_fields:
          en: ["title", "path"]
```

Rules:
- `required` keys map to policy entities (`pages`, `posts`, or a custom
  `policy_entity` override from action payload/query).
- `environment`-specific requirements override transition defaults.
- If `required_fields` exists and `locales` is empty, locales derive from
  required-field locale keys.
- `deny_by_default=true` blocks transitions without an explicit matching rule.

### 17.2 UI behavior contract (operator view)

When a transition is blocked, backend returns `TRANSLATION_MISSING` with:
- `missing_locales` (always present; empty array when none).
- `transition`.
- entity context keys: `entity_type`, `policy_entity`, `entity_id`,
  `environment`, `requested_locale`.
- optional `missing_fields_by_locale` when required-field checks were evaluated.

Expected UI flow:
- Workflow action (for example `publish`) is attempted from list/detail row
  actions.
- UI shows actionable blocker guidance using `missing_locales` and optional
  field hints.
- User runs remediation (`create_translation`) and retries transition.

### 17.3 Troubleshooting workflow

1. Reproduce with the same context used by UI:
   - `locale`, `environment`/`env`, and optional `policy_entity`.
2. Inspect the API error payload and confirm `text_code=TRANSLATION_MISSING`.
3. Verify blocker metadata contains at least:
   - `missing_locales`, `transition`, `entity_type`, `entity_id`.
4. Check structured logs:
   - blocker event: `translation.transition.blocked`.
   - remediation event: `translation.remediation.action`.
5. Check counters:
   - `admin_translation_blocked_transition_count`
   - `admin_translation_create_action_count`
6. Confirm policy config matches the intended entity/transition/environment
   mapping and required-field keys.
7. Re-run the transition after creating missing locale variants.

### 17.4 Rollout checklist

#### Staging validation
- Deploy with translation policy config enabled in staging first.
- Validate `publish` and `promote` paths for both `pages` and `posts`.
- Confirm expected blocker and remediation flows:
  - blocked publish returns `TRANSLATION_MISSING`.
  - `create_translation` creates the target locale draft in the same
    `translation_group_id`.
  - transition succeeds after remediation.

#### Policy dry-run checks
- Run representative workflow actions using staging data before production cutover.
- Capture and review:
  - blocker frequency (`admin_translation_blocked_transition_count`),
  - create-translation outcomes (`admin_translation_create_action_count`),
  - blocker/remediation structured logs.
- Validate configured entity keys, transition names, environments, and required
  field keys against real content.

#### Production enablement
- Roll out policy config in a controlled window.
- Confirm no unexpected spikes in blocked transitions after enablement.
- Confirm operators can remediate blocked transitions via `create_translation`
  without manual DB intervention.

#### Rollback plan
- Keep previous translation policy config available for immediate restore.
- If blocker volume or false positives exceed threshold, revert to last known
  stable config and re-run validation in staging.
- Preserve logs/counter snapshots from the failed rollout window for follow-up.

### 17.5 API contract table

#### Error/status matrix

| Scenario | HTTP status | `text_code` | Required metadata keys | Client handling |
| --- | --- | --- | --- | --- |
| Transition blocked: missing locales only | `409 Conflict` | `TRANSLATION_MISSING` | `missing_locales`, `transition`, `entity_type`, `policy_entity`, `entity_id`, `environment`, `requested_locale` | Show translation blocker UI with missing locale actions. |
| Transition blocked: required fields missing in one or more locales | `422 Unprocessable Entity` | `TRANSLATION_MISSING` | All keys above plus `missing_fields_by_locale` | Show blocker UI with per-locale missing-field hints. |
| Duplicate translation create attempt | `409 Conflict` | `TRANSLATION_EXISTS` | `panel`, `entity_id`, `locale`, `source_locale`, `translation_group_id` | Keep row/detail state, show deterministic duplicate-locale feedback. |

#### Legacy payload fallback behavior

| Payload shape | Required fallback behavior |
| --- | --- |
| Structured error missing metadata keys | Client falls back to message-level handling and generic error toast. |
| `TRANSLATION_MISSING` without `missing_fields_by_locale` | Client still renders locale blockers and remediation actions using `missing_locales` only. |
| Legacy message-only error envelope | Client extracts best-effort message text and preserves existing non-structured behavior. |

### 17.6 Go/No-Go release gates

Use this checklist before enabling translation workflow enforcement in production.

#### Sign-off matrix

| Gate | Owner | Required evidence |
| --- | --- | --- |
| Backend contract gate | Backend | Translation blocker status/metadata contract tests pass; create-translation action contract is stable. |
| Frontend behavior gate | Frontend | Blocker UX flow validated (blocked -> remediate -> retry success); legacy payload fallback verified. |
| QA scenario gate | QA | Pages + posts scenarios pass in staging across locales/environments (including duplicate create attempts). |
| Ops readiness gate | Ops | Metrics/log dashboards available, rollout checklist rehearsed, rollback config ready. |

#### Final release checklist

- [ ] Backend sign-off complete.
- [ ] Frontend sign-off complete.
- [ ] QA sign-off complete.
- [ ] Ops sign-off complete.
- [ ] Milestone completion criteria for translation workflow are met.
- [ ] Rollback owner and rollback window are confirmed.

### 17.7 Translation productization contract

This subsection defines migration, rollback, schema-version, and feature-flag
semantics for the productized quickstart API:

- `quickstart.WithTranslationProfile(...)`
- `quickstart.WithTranslationProductConfig(...)`

#### Migration and compatibility

Coexistence is supported during migration:

1. Profile baseline (`core` default when `cms` is enabled, otherwise `none`).
2. Product module overrides (`TranslationProductConfig.Exchange` / `Queue`).
3. Legacy module options (`WithTranslationExchangeConfig(...)`,
   `WithTranslationQueueConfig(...)`) as final compatibility overrides.

When product+legacy options are mixed, capabilities include warning
`translation.productization.legacy_override`.

Manual wiring options remain supported for at least two minor releases after
product API GA.

#### Rollback and data retention

Queue/exchange disable is runtime exposure rollback only:

- disabled modules do not register runtime routes/panels/commands,
- persisted queue/exchange data in host repositories/stores is retained,
- re-enabling restores runtime access to retained data.

#### Schema-version compatibility

- `TranslationProductConfig.SchemaVersion` default is `1`.
- `SchemaVersion=0` is accepted as legacy input and normalized to `1`.
- Unknown future schema versions fail startup with
  `translation.productization.schema.unsupported`.

#### Feature interaction matrix

Final capability resolution is deterministic across profile/module config and
feature defaults (`cms`, `dashboard`, `translations.exchange`,
`translations.queue`):

1. `cms=false` with effective translation modules enabled is startup error
   `translation.productization.requires_cms`.
2. `dashboard=false` suppresses dashboard exposure only; it does not disable
   translation policy enforcement or exchange/queue registration by itself.
3. Explicit translation module feature overrides are applied before dependency
   validation.
4. Startup diagnostics publish one final capability snapshot (`profile`,
   `schema_version`, module enablement, feature states, routes, panels,
   resolver keys, warnings).

### 17.8 Translation exchange schema, safety, and trigger contract

Translation exchange is transport-adapted but command-driven. HTTP, CLI, and
job triggers must compose the same typed command inputs.

#### HTTP contract

Routes:
- `POST /admin/api/translations/export`
- `GET /admin/api/translations/template`
- `POST /admin/api/translations/import/validate`
- `POST /admin/api/translations/import/apply`

Row linkage contract (`rows[*]`):
- `resource`
- `entity_id`
- `translation_group_id`
- `target_locale`
- `field_path`

Optional row fields:
- `source_locale`
- `source_text`
- `translated_text` (required for apply)
- `source_hash`

#### Safety rules

1. Validate-before-apply is the normative flow (`validate` then `apply`).
2. Import apply never auto-publishes; applied rows are persisted as draft state.
3. Missing target locale writes require explicit create intent
   (`create_translation` / `allow_create_missing`).
4. `source_hash` conflicts are deterministic (`stale_source_hash`) unless
   explicit override is enabled.
5. Duplicate linkage rows inside one payload are deterministic row conflicts
   (`duplicate_row`) and do not write duplicate changes.

#### Quickstart opt-in

Quickstart keeps exchange disabled by default. Enable with:

- `quickstart.WithTranslationExchangeConfig(...)`

Required minimum wiring:
- `Enabled: true`
- `Store` implementing `admin.TranslationExchangeStore`

#### Trigger usage (HTTP/CLI/jobs)

Transport adapters must reuse typed commands:
- `admin.translations.exchange.export`
- `admin.translations.exchange.import.validate`
- `admin.translations.exchange.import.apply`
- `admin.translations.exchange.import.run`

Job trigger command:
- `jobs.translations.exchange.import.run`

Example wrapper in `examples/web/jobs`:
- `jobs.NewTranslationImportRunJob(schedule, provider)`
  dispatches typed `TranslationImportRunInput` via the same run command path as
  other triggers.

## 18. Translation Queue Operations

Queue management is a phase-2 extension for coordinating translation work across
teams. Queue entries are coordination records and do not replace locale variant
content records.

### 18.1 State machine and lifecycle

Statuses:
- `pending`
- `assigned`
- `in_progress`
- `review`
- `rejected`
- `approved`
- `published`
- `archived`

Normative transitions:
1. `pending -> assigned`
2. `pending (open_pool) -> in_progress` (claim)
3. `assigned -> in_progress`
4. `in_progress -> review`
5. `review -> approved`
6. `review -> rejected`
7. `rejected -> in_progress`
8. `approved -> published`
9. Any non-terminal state -> `archived`

Terminal statuses: `published`, `archived`.

### 18.2 Command names and routing

Single commands:
- `translation.queue.claim`
- `translation.queue.assign`
- `translation.queue.release`
- `translation.queue.submit_review`
- `translation.queue.approve`
- `translation.queue.reject`
- `translation.queue.archive`

Bulk commands:
- `translation.queue.bulk_assign`
- `translation.queue.bulk_release`
- `translation.queue.bulk_priority`
- `translation.queue.bulk_archive`

Route key usage:
- resolver group: `admin`
- queue route key: `translations.queue`
- default URLKit mapping: `translations.queue -> /content/translations`
- default queue UI path: `/admin/content/translations`
- semantic queue links use resolver queries (`assignee_id`, `status`,
  `assignment_type`, `overdue`) instead of hardcoded `/admin/...` URLs.

### 18.3 Permission matrix

Queue permissions are scoped to `admin.translations.*`:
- `admin.translations.view`
- `admin.translations.edit`
- `admin.translations.manage`
- `admin.translations.assign`
- `admin.translations.approve`
- `admin.translations.claim`

Action mapping:
- claim: `admin.translations.claim`
- assign/release: `admin.translations.assign`
- submit_review: `admin.translations.edit`
- approve/reject: `admin.translations.approve`
- archive + bulk lifecycle operations: `admin.translations.manage`

### 18.4 Quickstart opt-in behavior

Queue feature gate key: `translations.queue` (default disabled).

Enable via:
- `quickstart.WithTranslationQueueConfig(...)`

Quickstart wiring responsibilities:
1. Register queue panel + tabs (`pages`, `posts`) with queue context filters.
2. Register queue command handlers and message factories.
3. Register queue permissions when host permission registration callback is provided.

Locale alignment contract:
1. If `supported_locales` is unset, locales derive from translation policy requirements.
2. If `supported_locales` is explicit and policy locales are available, sets must match; mismatches fail startup.

### 18.5 Operational playbook

Conflict handling:
- `TRANSLATION_QUEUE_CONFLICT`:
  - Active uniqueness conflict on key:
    `translation_group_id + entity_type + source_locale + target_locale`.
  - Reuse active assignment or archive obsolete non-terminal assignment before replacement.
- `TRANSLATION_QUEUE_VERSION_CONFLICT`:
  - Optimistic lock mismatch on stale `expected_version`.
  - Refetch assignment, reconcile state, retry with current version.

Overdue handling:
1. Filter queue using `overdue=true`.
2. Reprioritize or reassign stale work by status (`assigned`, `in_progress`, `review`).
3. Archive obsolete non-terminal assignments tied to canceled or superseded content work.
4. Monitor queue dashboard summary metrics (`active`, `review`, `overdue`) during daily triage.
