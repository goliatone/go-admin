# Guide: Frontend Reuse And Server Commands

This guide defines the default reuse path for go-admin frontend work and
client-to-server interactions. Use it before adding new UI components, page
helpers, RPC endpoints, action handlers, or server-side business functions.

The goal is a consistent codebase:

- reuse shared components before creating page-local markup or scripts
- keep server mutations command-driven
- keep business logic transport-neutral
- let HTTP, RPC, widgets, jobs, CLI tools, and tests call the same command or
  use-case layer
- keep templates and browser code focused on presentation and interaction

For deeper implementation details, use these canonical guides:

- `docs/GUIDE_UI_PRIMITIVES.md`
- `docs/GUIDE_CRUD.md`
- `docs/GUIDE_ACTIONS.md`
- `docs/GUIDE_RPC.md`
- `docs/GUIDE_DASHBOARD_WIDGETS.md`
- `docs/reference/root/PKG_SYNC.md`

## Default Feature Flow

Before building a feature:

1. Search for an existing template partial, DataGrid behavior, service module,
   toast helper, command, or package.
2. Prefer a shared component with configuration over page-local markup.
3. Put business behavior in a command or service use case, not in an HTTP
   handler, RPC adapter, template, or browser controller.
4. Expose the command through the narrowest appropriate adapter:
   DataGrid/panel action, enhanced SSR action, RPC command runtime, dashboard
   widget action, background job, or CLI.
5. Use shared error formatting and toast behavior.
6. Refresh or reconcile affected UI from server-authored state after mutations.
7. Test the command/use case first, then adapter and UI behavior where needed.

Only add a new reusable component, helper, or package when the existing surface
cannot be configured or safely extended.

## Reuse Index

| Need | Prefer | Location / Guide |
|---|---|---|
| List, search, filters, sort, pagination, row actions, bulk actions | DataGrid | `pkg/client/assets/src/datatable/`, `docs/GUIDE_CRUD.md` |
| Shared list route config | `datagrid_config` | `docs/GUIDE_CRUD.md#datagrid-wiring` |
| Row/detail/bulk mutations for panels | Schema actions and panel action routes | `docs/GUIDE_CRUD.md`, `docs/GUIDE_ACTIONS.md` |
| Custom page command without full reload | Command runtime over RPC | `pkg/client/assets/src/services/command-runtime.ts`, `docs/GUIDE_RPC.md` |
| Progressive enhancement for server-rendered forms/actions | Enhanced SSR actions | `pkg/client/assets/src/shared/enhanced-action.ts`, `docs/GUIDE_ACTIONS.md` |
| Declarative button/form busy state | Shared behavior layer | `pkg/client/assets/src/shared/behaviors/`, `docs/GUIDE_UI_PRIMITIVES.md#busy-buttons-and-submit-feedback` |
| Toast notifications | Global toast manager / notifier contract | `pkg/client/assets/src/toast/`, `pkg/client/templates/partials/toast-container.html` |
| Structured error display | Toast error helpers | `pkg/client/assets/src/toast/error-helpers.ts` |
| Page headers, menus, filters, badges, tabs, metrics | Template partials | `pkg/client/templates/partials/`, `docs/GUIDE_UI_PRIMITIVES.md` |
| DataGrid state and column preferences | DataGrid state store / preferences mode | `pkg/client/assets/src/datatable/state-store.ts`, `docs/GUIDE_CRUD.md#datagrid-state-and-preferences` |
| Revision-safe sync, autosave, idempotency, conflict recovery | `pkg/go-sync` and `sync-core` | `pkg/go-sync/`, `docs/reference/root/PKG_SYNC.md` |
| Dashboard cards/widgets | Dashboard widget providers/renderers | `docs/GUIDE_DASHBOARD_WIDGETS.md` |

## Frontend Components

Use existing primitives before creating page-specific UI.

Shared template partials live under `pkg/client/templates/partials/`. Important
defaults include:

- `admin-page-header.html` and `admin-page-heading.html` for page titles and
  actions
- `action-menu.html` for row and contextual menus
- `bulk-action-overlay.html` for selection-based operations
- `quick-filters.html`, `filter-panel.html`, and `filter-summary.html` for
  list filtering
- `status-badge.html`, `locale-badge.html`, and `metric-card.html` for common
  display patterns
- `panel-tabs.html`, `tab-panel.html`, and `view-mode-switcher.html` for view
  navigation
- `toast-container.html` for global toast placement

Follow the selector contracts in `docs/GUIDE_UI_PRIMITIVES.md`. Do not rename
shared hooks such as `data-action`, `data-action-menu`, `data-bulk-action`,
`data-view-mode`, or `data-enhance-action` for page-local convenience. Add
page-specific metadata beside the shared selector when a page needs more data.

## DataGrid

Use DataGrid for tabular admin lists unless there is a specific product reason
to avoid it. Do not build a one-off table for normal list screens.

DataGrid covers:

- server-backed search
- filters and quick filters
- pagination
- sorting
- row selection
- row actions
- bulk actions
- export
- column visibility
- URL state and persisted user preferences
- grouped and translation-aware list modes where configured

New list templates should read `datagrid_config` first. The canonical keys and
initialization pattern are documented in `docs/GUIDE_CRUD.md#datagrid-wiring`.

Column definitions are a contract with the server. Mark a column `sortable` or
`filterable` only when the list API and repository understand that field. The
UI must not advertise filtering or sorting that the backend cannot honor.

After a row or bulk mutation, refresh the grid or affected server-authored
payload. Do not patch domain state only in the browser and assume it remains
authoritative.

## Toasts And Feedback

Use the shared toast system for transient success, error, warning, and info
messages. The global container is included by the base layouts, and the toast
runtime lives in `pkg/client/assets/src/toast/`.

Default rules:

- prefer injected `ToastNotifier` instances in reusable TypeScript modules
- use the global toast manager only at page boundaries
- use `pkg/client/assets/src/toast/error-helpers.ts` to extract and format
  structured backend errors
- use inline validation messages for field-specific failures
- use confirmation dialogs only for destructive or high-impact actions
- avoid page-local toast DOM unless the shared toast runtime is unavailable in
  that surface

Server enhanced actions should return toast data through the enhanced mutation
envelope rather than forcing browser code to infer success copy.

## Behavior Layer And Busy State

Use the shared behavior layer for small framework-free DOM behaviors that
should work across SSR pages, Enhanced SSR actions, RPC command controls, and
imperative page helpers. The behavior runtime lives in
`pkg/client/assets/src/shared/behaviors/`; the shipped Vite entry is
`shared/behaviors/index`.

Preferred form markup keeps native submit behavior intact and adds declarative
busy state only as an enhancement:

```html
<form method="post" action="/admin/example" data-behavior="submit-busy">
  <button type="submit"
          data-busy-button
          data-busy-label="Saving...">
    <span data-busy-spinner hidden></span>
    <span data-busy-label-target>Save</span>
  </button>
</form>
```

Use behavior attributes for visual interaction state. Use transport attributes
such as `data-enhance-action`, `data-command-*`, and DataGrid action metadata
for request dispatch, command identity, refresh targets, and server semantics.

Initialization rules:

- Existing transport runtimes call the low-level busy helpers directly.
- A page that relies only on declarative `data-behavior="submit-busy"` markup
  must load a bundle that calls `initBehaviors(...)` or
  `bootstrapBehaviors(...)`.
- Native submit-busy behavior ignores `form[data-enhance-action]`; Enhanced
  SSR forms should use `data-busy-*` submitter markup and let
  `initEnhancedActions(...)` own submission.
- Enhanced SSR fragment replacement reinitializes behavior hooks for applied
  fragment roots and emits `go-admin:enhanced-fragments-applied` with those
  roots.
- Fragments must not rely on inline scripts or inline event handlers as
  behavior-extension mechanisms.

Compatibility aliases remain for older login markup:
`data-submit-loading-form`, `submit-loading-button`,
`data-submit-loading-busy-label`, `data-submit-loading-label`, and
`.submit-loading-spinner`. Prefer the canonical `data-busy-*` attributes for
new templates.

## Client To Server Communication

Choose the transport by the shape of the interaction.

Use panel action routes when:

- the action belongs to a registered panel schema
- the action is row, detail, or bulk scoped
- the action should follow canonical DataGrid refresh behavior

Use enhanced SSR actions when:

- the page is server-rendered
- the form or button should work without JavaScript
- progressive enhancement should submit with `fetch`, replace server-rendered
  fragments, show toasts, focus updated controls, or render validation errors
  without a full reload

Use RPC command runtime when:

- the control is a custom page interaction
- the operation should dispatch an admin command directly
- the page needs declarative command markup with targeted refresh
- the command should also be callable from non-HTTP adapters

Use `pkg/go-sync` when:

- the resource is revisioned
- the client needs autosave
- retry or duplicate submission must be idempotent
- conflict detection and recovery are part of the workflow
- multiple UI surfaces need consistent refresh/invalidation behavior

Do not add a new fetch wrapper, endpoint shape, or command dispatch path until
the existing DataGrid, enhanced action, RPC, and sync contracts have been ruled
out.

## Command And Use-Case Layer

Business logic belongs in commands or service use cases. Transport adapters
should map input, call the command, and present the result.

Good command boundaries:

- accept typed input
- use `context.Context`
- validate domain input
- enforce permissions or call an authorization collaborator where appropriate
- use repositories/services through narrow interfaces
- return typed output or structured domain errors
- emit logs, activity, or metrics at the business boundary
- stay free of templates, DOM selectors, request headers, flash messages, and
  toast concepts

Adapters can include:

- HTTP handlers
- RPC method handlers
- DataGrid panel actions
- enhanced SSR responders
- dashboard widgets
- background jobs
- CLI commands
- tests

Avoid embedding business rules in:

- TypeScript page controllers
- Go HTTP handlers
- RPC transport handlers
- templates
- widget renderers
- repository convenience methods
- package-level helpers with hidden side effects

## RPC Command Runtime

The shared RPC path dispatches through the admin command bus. It is a transport
adapter, not a second business layer.

Use declarative command attributes for custom page controls:

```html
<button
  type="button"
  data-command-name="notify_reviewers"
  data-command-transport="rpc"
  data-command-dispatch="esign.agreements.notify_reviewers"
  data-command-payload-participant-id="participant_123"
  data-command-refresh="#agreement-review-status-panel,#review-participants-panel"
  data-busy-button
  data-busy-label="Notifying..."
>
  <span data-busy-spinner hidden></span>
  <span data-busy-label-target>Notify</span>
</button>
```

Rules:

- register the command and its message factory on the admin command bus
- allowlist the command in RPC transport configuration
- keep permission checks on the server
- return structured errors
- use targeted fragment refresh for affected server-rendered regions
- keep command names stable and domain-oriented

See `docs/GUIDE_RPC.md` for transport setup, allowlist rules, discovery,
payload shape, and browser CSRF behavior.

## Actions And Enhanced SSR

For panel resources, schema actions are the default mutation surface. Register
the action on the schema and register the matching command/message factory on
the admin command bus. DataGrid then owns rendering, disabled state,
confirmation, action dispatch, and refresh.

For custom server-rendered pages, enhanced SSR actions are the default
progressive-enhancement path. The HTML must remain a valid normal form first:
`method`, `action`, CSRF, submit control, and server redirect/flash fallback.
Browser JavaScript may then intercept forms marked with
`data-enhance-action="true"` and submit them through the shared runtime in
`pkg/client/assets/src/shared/enhanced-action.ts`.

Enhanced SSR actions should keep one mutation path:

1. HTTP handler maps request fields into command input.
2. Command executes transport-neutral business logic.
3. Presenter reloads server-authored view data.
4. Responder returns redirect/flash, enhanced fragments/toasts, or JSON.

Do not put fragment selectors, toast messages, or browser request headers in the
command input or result.

Use this for Rails/Turbolinks-like page refinement where the page remains
server-rendered, but a mutation can update known sections without a full
navigation. It is not a general whole-page navigation replacement layer.

## `pkg/go-sync`

Use `pkg/go-sync` for revision-safe, retry-safe interactions rather than
inventing per-page autosave or conflict handling.

The package is intentionally split:

- backend core under `pkg/go-sync`
- frontend `sync-core` under `pkg/go-sync/client/packages/sync-core`

Use it for:

- draft autosave
- optimistic writes with server-side revision checks
- idempotent actions
- stale revision conflict recovery
- bounded retry for transient failures
- explicit refresh after writes or focus

Do not use it as:

- a full offline-first database
- a CRDT/collaboration engine
- a transport-specific HTTP helper
- a substitute for server authorization

`pkg/go-sync` must stay transport-agnostic. HTTP, RPC, SSE, browser state, and
UI framework integrations belong in adapters.

## Error Handling

Prefer structured domain errors whenever the client needs to distinguish:

- validation failure
- permission or ownership failure
- conflict or stale state
- invalid selection
- missing runtime dependency
- retryable service failure

Server adapters should map domain errors into the standard response shape for
their transport. Browser code should use shared error helpers to display
messages and field errors. Do not return raw internal errors to the UI, and do
not parse backend error objects with ad hoc string logic.

After structured domain failures, reconcile from server-authored state:

- row/list actions refresh the grid
- detail actions refresh the detail payload or fragments
- bulk actions refresh selection-sensitive state and list data
- sync workflows reload or resolve conflicts through the sync runtime

## State And Refresh

Use the smallest state mechanism that preserves consistency:

- URL state for shareable list search/filter/sort/page state
- DataGrid preference state for user-specific column and view preferences
- enhanced action fragment replacement for server-rendered page regions
- RPC command runtime refresh selectors for custom command controls
- `pkg/go-sync` for revisioned mutable resources, autosave, idempotency, and
  conflict recovery

Avoid custom global event buses, one-off localStorage keys, and page-specific
cache invalidation when a shared state channel already exists.

## Testing Expectations

Test at the command/use-case layer first. That is where business behavior,
validation, permissions, transactions, idempotency, and structured errors
belong.

Add adapter and UI tests when the transport or interaction adds behavior:

- RPC payload shape and allowlist behavior
- enhanced mutation envelope, fragments, toasts, and focus
- DataGrid query, action, bulk action, and refresh behavior
- sync stale revision, retry, and idempotency behavior
- toast/error formatting for structured backend errors

Do not rely on browser-only tests to prove business logic.

## Anti-Patterns

Avoid:

- creating a one-off table instead of DataGrid
- creating page-local toast DOM instead of using the shared notifier
- adding a new fetch client for a shape already covered by DataGrid, enhanced
  actions, RPC, or sync
- putting business logic in handlers, templates, widgets, or browser
  controllers
- adding command behavior that cannot be called from tests or other adapters
- returning ad hoc error strings where structured errors are needed
- marking DataGrid fields sortable/filterable without backend support
- duplicating sync, autosave, retry, idempotency, or conflict handling
- creating broad `utils` or `helpers` packages before searching existing
  packages and services
