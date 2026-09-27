# Guide: Actions

This guide documents the shipped action availability and action UX system for
`go-admin`.

For workflow definitions, state-machine execution, and persisted workflow
bindings, see `docs/GUIDE_WORKFLOW.md`.

For custom page commands that use the shared RPC transport instead of canonical
panel action routes, see `docs/GUIDE_RPC.md`.

For the broader frontend reuse and server-command decision path, see
`docs/GUIDE_FRONTEND.md`.

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

## Enhanced SSR Actions

Use enhanced SSR actions when a server-rendered page needs a mutation to update
small page sections without a full reload. The HTML must remain a valid normal
form first; JavaScript enhancement is an optional fetch path.

### Server layering

Keep one mutation path:

- HTTP handler maps request fields into a command input.
- Command adapter executes transport-neutral business logic and returns a typed
  result.
- Presenter loads the current SSR view model and builds fragments/toasts.
- Responder chooses enhanced JSON, normal HTML redirect/flash, or the existing
  JSON API shape.

Do not put templates, DOM selectors, request headers, flash, or toast concepts
inside command inputs/results.

### Request negotiation

go-crud provides the transport detection helpers:

- `X-Enhanced-Action: 1`
- `Accept: application/vnd.admin.enhanced+json`
- form content with HTML-oriented `Accept`
- JSON clients without the enhanced marker

go-admin consumes that result through `EnhancedMutationResponder`.

Apps that do not want to expose the default marker names can configure both the
server and browser runtime:

```go
adm.WithEnhancedActionNegotiation(admin.EnhancedActionNegotiationConfig{
    RequestHeader:      "X-App-Action",
    RequestHeaderValue: "opaque-marker",
    RequestMediaTypes:  []string{"application/vnd.example.action+json"},
    ResponseMediaType:  "application/vnd.example.action+json",
})
```

Pass the same values to `initEnhancedActions` or page initializers that expose an
`enhancedAction` option.

Normal form posts redirect with flash headers:

- `X-GoAdmin-Flash-Type`
- `X-GoAdmin-Flash-Message`

Enhanced requests return an envelope shaped like:

```json
{
  "version": 1,
  "ok": true,
  "toasts": [{ "type": "success", "message": "Assignment updated." }],
  "fragments": [
    {
      "selector": "[data-family-assignments]",
      "mode": "replace",
      "html": "<section data-family-assignments>...</section>"
    }
  ],
  "focus": "[data-family-assignment-row=\"fr:localization\"]",
  "redirect": "/admin/translations/families/example"
}
```

Errors use the same envelope with `ok: false`, `error.message`,
`error.fields`, and status-specific HTTP codes. The client keeps form values and
renders field/action errors into `data-enhance-error-target` when present.

An error envelope may also carry `fragments`. The client applies them before it
renders the error, so a `409` can refresh stale state (for example a hidden
expected revision) and let the user retry. Build these responses with
`Respond` and a presentation that sets `OK: false`, `Status` and `Error`;
`RespondError` does not attach fragments.

### Markup and client attributes

Use semantic forms:

```html
<form method="post"
      action="/admin/api/translations/families/example/assignments"
      data-enhance-action="true"
      data-enhance-error-target="[data-family-assignment-error-for='fr:localization']">
  {{ csrf_field|safe }}
  <input type="hidden" name="target_locale" value="fr">
  <input type="hidden" name="work_scope" value="localization">
  <input type="hidden" name="assignee_id" value="translator-1">
  <button type="submit"
          data-busy-button
          data-busy-label="Assigning...">
    <span data-busy-spinner hidden></span>
    <span data-busy-label-target>Assign</span>
  </button>
  <div data-family-assignment-error-for="fr:localization" hidden></div>
</form>
```

The shared runtime lives in `pkg/client/assets/src/shared/enhanced-action.ts`.
Page modules import `initEnhancedActions(...)`. Enhanced actions reuse the
shared busy behavior from `pkg/client/assets/src/shared/behaviors/`, so forms
and submitters may use the canonical `data-busy-*` attributes documented in
`docs/GUIDE_UI_PRIMITIVES.md`. Do not add `data-behavior="submit-busy"` to
Enhanced SSR forms; the enhanced runtime owns submit interception and starts
shared busy state directly.

After fragment replacement, the enhanced runtime initializes behavior hooks for
the applied roots and then emits `go-admin:enhanced-fragments-applied` with the
same roots. Page modules should use `onFragmentsApplied` for page-specific
widgets only.

### Request encoding

Enhanced submissions send what the native form would: an
`application/x-www-form-urlencoded` body unless the form (or the submitter's
`formenctype`) declares `multipart/form-data`. Submitter `name`/`value` pairs
are included either way, and GET forms serialize their fields into the URL.

### Busy indicators in multi-button forms

Forms with many submit buttons (a list of per-row actions) can add
`data-busy-indicator="submitter"`. Every submit control is still disabled while
the request runs, but busy labels and spinners appear only on the button that
submitted.

### Live GET forms

A GET form marked `data-enhance-action data-enhance-live` submits as the user
types. Use it for option lists and search results that the server renders:

```html
<form id="options-search" method="get" action="/app/options"
      data-enhance-action data-enhance-live
      data-enhance-live-debounce="180" data-enhance-live-min="2">
  <input type="hidden" name="kind" value="task">
</form>
<input type="search" name="q" form="options-search">
<ul id="options">...</ul>
```

- `input` events from the form's controls (including controls associated
  through `form=`) schedule a request after `data-enhance-live-debounce`
  milliseconds (default 180).
- Non-empty text shorter than `data-enhance-live-min` (default 1) does not
  request; clearing the field does.
- A newer request aborts the previous one, and a late response is ignored.
  Repeating the same URL does not request again.
- While a request is in flight the form carries `aria-busy="true"` and
  `data-enhance-live-pending="true"`; controls stay enabled.
- The response is a normal enhanced envelope; its fragments replace the
  results region. Errors render into `data-enhance-error-target` and keep the
  previous results.

### Using the runtime outside the admin shell

Hosts that render their own pages import the runtime from the public client
package, installed from the release tarball:

```ts
import { initEnhancedActions } from '@goliatone/go-admin-client/shared/enhanced-action';

initEnhancedActions(document, {
  toast: { success: announce, error: announce, info: announce },
  onFragmentsApplied: () => remountPageWidgets(),
});
```

- Initialize once on `document`; the submit and input listeners are
  delegated, so forms inserted later are covered.
- Pass a `toast` sink. Outside the shell there is no `window.toastManager`.
- CSRF travels as a form field in the body, or as `X-CSRF-Token` when the page
  renders `<meta name="csrf-token">`.
- Listen for `go-admin:enhanced-fragments-applied` (or use
  `onFragmentsApplied`) to re-bind page widgets inside replaced fragments.
- Style the busy contract (`aria-busy`, `data-busy`, `[data-busy-spinner]`,
  `data-busy-label`) with the host's own CSS; the runtime only toggles
  attributes and text.

### Fragment rules

- Fragments are server-rendered trusted HTML.
- Use server-authored selectors from a known page registry.
- Use `replace` mode until a page has a proven append/prepend need.
- Do not execute inline scripts from fragments.
- Do not use inline scripts or inline event handlers as behavior-extension
  mechanisms; ship behavior through shared or page-specific bundles.
- Reuse the same presenter data as first-paint SSR.

The translation family pilot uses:

- `[data-family-locale-coverage]`
- `[data-family-assignments]`
- `[data-family-publish-gate]`
- `[data-family-activity]`

### Tests

For each enhanced action, cover:

- command adapter execution without router context
- enhanced response with fragments/toast/focus
- normal form redirect and flash
- JSON compatibility without the enhanced marker
- template roots and valid CSRF form markup
- client headers, busy state, fragment replacement, toast, focus, validation
  errors, and no reload on success
- example app or host smoke proving required dist assets are served

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
go test ./admin -run 'TestActionPhase8'
go test ./examples/web -run 'TestActionPhase8'
```

Coverage expectations:

- workflow-driven disablement still works on row and detail surfaces
- translation-driven disablement still works on row and detail surfaces
- domain-rule disablement works proactively and reactively
- stale action execution returns structured failures
- `examples/web` demonstrates row/detail parity
