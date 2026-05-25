# Guide: Actions

This guide documents the shipped action availability and action UX system for
`go-admin`.

For workflow definitions, state-machine execution, and persisted workflow
bindings, see `docs/GUIDE_WORKFLOW.md`.

For custom page commands that use the shared RPC transport instead of canonical
panel action routes, see `docs/GUIDE_RPC.md`.

It covers:

- backend authoring with `Action.Guard`, `WithActionStateResolver(...)`, and
  `WithBulkActionStateResolver(...)`
- frontend consumption of canonical row/detail/bulk contracts
- disabled-reason rendering and structured failure handling
- diagnostics and release-readiness QA

## Canonical Contracts

Row and detail surfaces use the same per-record contract:

- list rows: `record._action_state`
- detail responses: `data._action_state`

Bulk surfaces use:

- list responses: `response.$meta.bulk_action_state`
- selection-sensitive refresh: `POST /admin/api/panels/{panel}/bulk-actions/state`

Shared code vocabulary:

- disabled affordances: `reason_code`
- execution failures: `error.text_code`

The same string values are reused across both paths where they overlap, for
example `RESOURCE_IN_USE`, `PRECONDITION_FAILED`, and `INVALID_SELECTION`.

## Backend

### Use `Action.Guard` for cheap record-local checks

Use `Action.Guard` when the decision can be made from one record plus request
context and should run for row, detail, or selection-aware bulk evaluation
without extra I/O.

Good fits:

- scope/context checks that are specific to one action
- simple business rules based on current record fields
- lightweight business-rule checks that do not replace auth

### Use `WithActionStateResolver(...)` for batch or I/O-backed state

Use a batch resolver when availability depends on repository/service lookups,
cross-record state, or data you want to fetch once for the whole record set.

Use cases:

- referenced-resource checks
- domain lookups that are too expensive for a per-action guard
- detail/list parity where the same lookup should drive both surfaces

Rules:

- resolver errors fail the request
- first disablement wins; later stages may enrich but not re-enable
- return canonical `ActionState` values only

### Use `WithBulkActionStateResolver(...)` for list-level bulk state

Use the bulk resolver for static list-level bulk availability that does not
depend on the current selection.

Use it for:

- page-wide permission or feature gating
- static business-rule blocks that apply regardless of which rows are selected

Selection-sensitive bulk state is driven by the shared endpoint and the same
row/detail evaluator path. Do not invent panel-specific bulk fetch behavior.

### Reason-code guidelines

Prefer canonical codes from `admin/action_state_reason_codes.go` and
`admin/error_codes.go`.

Use:

- `PERMISSION_DENIED` equivalent path via `ActionDisabledReasonCodePermissionDenied`
- `MISSING_CONTEXT` for missing required record data
- `INVALID_STATUS` for workflow/state-transition blocks
- `TRANSLATION_MISSING` for translation-readiness blocks
- `RESOURCE_IN_USE` for referenced-resource/business-rule conflicts
- `PRECONDITION_FAILED` for stateful business-rule checks that are not a pure
  workflow transition mismatch
- `INVALID_SELECTION` for bulk selection problems

Keep `reason` user-facing and concise. Put structured details in `metadata`.

### Runtime enforcement remains authoritative

Action state is an affordance contract, not the enforcement layer.

Always preserve runtime checks in delete handlers, command handlers, and bulk
operations. When runtime rejection is expected, return a structured error using
the existing `writeError(...)` envelope and a canonical `error.text_code`.

## Frontend

### Consume the shared normalized contracts

Use the shared normalization path in
`pkg/client/assets/src/datatable/action-contracts.ts`.

Primary helpers:

- `normalizeActionStateRecord(...)`
- `normalizeDetailActionStatePayload(...)`
- `normalizeBulkActionStateResponse(...)`
- `normalizeActionBlockCode(...)`

Do not add panel-specific parsers for `_action_state`, detail action payloads,
or `bulk_action_state`.

### Render canonical row and detail actions through shared builders

Use:

- `SchemaActionBuilder` for row/detail schema actions
- `initPanelDetailActions()` for canonical detail mounts

Behavioral rules:

- disabled actions remain visible
- row menus show reason text only
- detail surfaces may render remediation links from `remediation`
- structured failures should be formatted through
  `formatStructuredErrorForDisplay(...)`

### Reconcile after structured domain failures

When a canonical action fails with a structured domain error, refresh the
server-authored state instead of leaving stale affordances on screen.

Patterns:

- row/list actions: refresh the grid
- detail actions: refresh the detail payload
- bulk actions: refresh selection-sensitive bulk state and list data as needed

Delete paths should use the shared structured delete executor so delete and
POST-style actions do not diverge in error quality.

## Diagnostics

Phase 8 adds a shared diagnostics surface for action disablements, resolver
failures, and structured execution failures.

Available surfaces:

- Debug dashboard panel: `Actions`
- structured logger scope: `admin.actions`

Captured events include:

- final disablements with canonical `reason_code`
- resolver failures that fail row/detail/bulk state requests
- structured execution failures for delete, row/detail actions, and bulk actions

Use the debug panel during QA when you need to confirm why the server disabled
an action or why a stale action execution failed.

## QA

Recommended focused checks:

```bash
/opt/homebrew/bin/go test ./admin -run 'TestActionPhase8'
/opt/homebrew/bin/go test ./examples/web -run 'TestActionPhase8'
/opt/homebrew/bin/go test ./examples/esign/modules -run 'TestActionPhase8'
```

Coverage expectations:

- workflow-driven disablement still works on row and detail surfaces
- translation-driven disablement still works on row and detail surfaces
- domain-rule disablement works proactively and reactively
- stale action execution returns structured failures
- `examples/web` and `examples/esign` both demonstrate row/detail parity
