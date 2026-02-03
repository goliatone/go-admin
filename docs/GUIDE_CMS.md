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
15. [See Also](#15-see-also)

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

## 15. See Also

- [Module Development Guide](GUIDE_MODULES.md) — Creating and registering modules.
- [View Customization Guide](GUIDE_VIEW_CUSTOMIZATION.md) — Theming and templates.
- [Block Editor Guide](GUIDE_BLOCK_EDITOR.md) — Block editor setup, drag/drop, icon picker, and custom icon tabs.
- [CMS TDD](../CMS_TDD.md) — Technical design document for the CMS extension.
