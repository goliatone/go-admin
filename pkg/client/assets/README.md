# @goliatone/go-admin-client

Public browser contracts for applications built with go-admin.

The package publishes ESM JavaScript and TypeScript declarations through an explicit export map. Application-specific modules are intentionally excluded.

```ts
import { httpRequest } from '@goliatone/go-admin-client/shared/transport/http-client';
import { createSSEClient } from '@goliatone/go-admin-client/services/sse-client';
```

Panel list consumers can provide an explicit capability contract:

```ts
import { DataGrid, type DataGridCapabilities } from '@goliatone/go-admin-client/datatable';

const capabilities: DataGridCapabilities = {
  selection: false,
  bulk: false,
  export: false,
};

new DataGrid({ tableId, apiEndpoint, columns, capabilities });
```

Consumers that only need the grid and Go CRUD behaviors should prefer the
focused runtime so optional translation/workflow components are not part of the
initial graph:

```ts
import {
  DataGrid,
  GoCrudFilterBehavior,
  GoCrudPaginationBehavior,
} from '@goliatone/go-admin-client/datatable/runtime';
```

The broad `@goliatone/go-admin-client/datatable` export remains supported for
compatibility. Overlay filters can be deferred until their first activation:

```ts
import { mountFilterBuilderOnInteraction } from '@goliatone/go-admin-client/datatable/filter-builder-loader';

const filterMount = mountFilterBuilderOnInteraction({ fields, onApply });
// Call filterMount.destroy() when the owning page/controller is torn down.
```

The mount is single-flight, exposes `aria-busy` while loading, retries after a
failed chunk request, and suppresses construction after teardown. Focused
content-list and detail-action contracts are available through
`datatable/content-runtime` and `datatable/detail-runtime` respectively.

All three booleans are required when the object is present. DataGrid normalizes
`selection` to `bulk || export`, skips disabled structure and lifecycle binding,
and preserves the legacy all-enabled behavior when `capabilities` is omitted.

Row-action structure follows the configured action policy. Default actions and
their column remain enabled for compatibility. Set `useDefaultActions: false`
without a `rowActions` provider to omit the action header, filter, and body cells
and exclude that fixed column from loading, error, empty, and grouped colspans.
A custom `rowActions` provider retains the action column even when default
actions are disabled.

Use the typed `onStateChange` callback for application-specific loading, ready,
empty, and error announcements. The callback runs after ready, empty, and error
content is rendered, and it also reports loading when stale rows intentionally
remain visible. Callback failures are isolated from the grid refresh lifecycle.

```ts
new DataGrid({
  tableId,
  apiEndpoint,
  columns,
  onStateChange(state) {
    status.textContent = messages[state];
  },
});
```

See the repository compatibility matrix before coordinating browser-client and Go module upgrades.

## Logging

Client diagnostics are silent by default. Applications can inject their own
sink and choose a minimum level:

```ts
import {
  configureLogging,
  createLogger,
  type LoggerSink,
} from '@goliatone/go-admin-client/shared/logger';

const sink: LoggerSink = {
  warn: (...args) => applicationLogger.warn(...args),
  error: (...args) => applicationLogger.error(...args),
};
const restoreLogging = configureLogging({ sink, level: 'warn' });

createLogger('Orders').warn('Refresh delayed', { attempt: 2 });

// Restore the previous package-wide configuration during teardown.
restoreLogging();
```

For local development, console output must be enabled explicitly:

```ts
import { enableConsoleLogging } from '@goliatone/go-admin-client/shared/logger';

const restoreLogging = enableConsoleLogging('debug');
```

## Static analysis

Run the same production-source policy used by the test workflow:

```sh
npm run lint
```

ESLint rejects direct console ownership and imports through generated or
published package artifacts. Existing complexity and unused-code debt is
tracked by exact source location in `eslint-baseline.json`; new findings fail,
while resolved entries are reported as stale and can be removed. After
reviewing an intentional baseline change, regenerate the inventory with:

```sh
npm run lint:eslint:baseline
```

Review the generated diff before accepting it. Zero-tolerance errors are never
written to the baseline.

## Bundle budgets

Both the embedded runtime and public-package Vite builds enforce raw and gzip
JavaScript limits from `bundle-budgets.json`. Entrypoint limits include every
statically imported chunk once; dynamic chunks are covered by the per-chunk and
aggregate profile limits. New, removed, or renamed entries fail until their
budget coverage is reviewed.

Print current measurements and suggested limits without changing the committed
budget file:

```sh
npm run bundle:report
```

When a budget fails, reduce or split the dependency graph where practical. If
growth is intentional, update the corresponding absolute limit explicitly and
review the reported contributors. The build never updates limits automatically.

## Shared modal component

Use the same component from the package or the predictable embedded asset:

```ts
import {
  Modal,
  ConfirmModal,
  TextPromptModal,
  type ModalOptions,
} from '@goliatone/go-admin-client/components/modal';

// Embedded hosts use:
// import { Modal } from '/admin/assets/components/modal.js';
```

## Bulk import components

Bulk import is available from the matched embedded and package entries:

```ts
import {
  BulkImportModal,
  type ImportSourceDescriptor,
} from '@goliatone/go-admin-client/components/import-modal';
import '@goliatone/go-admin-client/components.css';

// Embedded hosts use /admin/assets/components/import-modal.js.
const source: ImportSourceDescriptor<File> = {
  key: 'contacts-file',
  label: 'CSV / JSON',
  kind: 'file',
  workflow: 'preview-apply',
  mode: {
    key: 'create-only',
    label: 'Create only',
    description: 'The application service creates new records and skips conflicts.',
  },
  file: { accept: '.csv,.json,text/csv,application/json' },
  preview: async (file, { signal, mode }) => appPreview(file, mode.key, signal),
  adaptPreview: response => ({
    state: response.receipt,
    report: adaptSafePreview(response),
    eligibility: response.applyEligibility,
  }),
  apply: async (file, receipt, { signal, mode, attempt }) =>
    appApply(file, receipt, mode.key, attempt.idempotencyKey, signal),
  adaptApply: adaptSafeApply,
};

const modal = new BulkImportModal({ root: document.body, sources: [source] });
await modal.show();
```

The mode key is inert presentation data. The application must independently
allowlist it and own authorization, parsing, validation, conflict policy,
persistence, transactions, receipts, idempotency, audit, and result redaction.
Preview/apply adapters receive one stable `ImportAttemptContext`; reuse its
idempotency key after retryable or unknown outcomes. Completed and terminal
attempts are retired: the operator must reset/import-another before applying
again, and a later apply receives a new context even when it uses another
source. Reports must contain only bounded safe references, allowlisted
fields/codes, and non-sensitive metadata.

### Compose and review phases

The dialog exposes `data-import-phase="compose"|"review"` and
`data-import-source="<key>"` on its container. Phase is derived from workflow
state plus real report presence, never from row counts:

- compose — idle, selected, submitting/previewing, and errors with no report.
  The modal body stays vertically scrollable so short viewports and 200% zoom
  reach every input and action.
- review — preview-ready, applying, complete, and errors that retain a report.
  The source panel collapses to a `[data-import-summary]` strip carrying the
  source, safe file name/size or bounds, mode, and a `[data-import-change]`
  action; `.go-admin-import__report-scroll` becomes the single bounded scroller.

`[data-import-banner]` sits above the metrics and table and carries eligibility
reasons, partial/replayed state, uncertain outcomes and errors, including errors
raised before any report exists. It takes `role="alert"` only for error tones;
routine transitions stay with the polite `[data-import-status]` footer region so
each change is announced once.

The file chooser renders mutually exclusive `[data-import-empty]` and
`[data-import-selected]` structures and mirrors them on `data-import-state`. The
drop target is not a `role="button"`: a dedicated `[data-import-browse]` control
opens the picker, and the selected-file card owns `[data-import-replace]` and
`[data-import-remove]` so one click performs exactly one action.

### Source-scoped report presentation

Report vocabulary belongs to the source, not the modal. Declare it through
`ImportSourceDescriptor.report`; modal-level `columns` and `filters` remain
fallbacks for sources that do not, and the active source's presentation is
reapplied on every source change so filters, labels and active filter state
never leak between tabs.

```ts
const source: ImportSourceDescriptor<File> = {
  // ...
  report: {
    columns: [
      { key: 'reference', label: 'Row', priority: 'primary' },
      { key: 'outcome', label: 'Outcome', priority: 'primary' },
      { key: 'codes', label: 'Codes', priority: 'secondary' },
    ],
    filters: [{ key: 'skipped', label: 'Skipped duplicates', outcome: 'skipped_duplicate' }],
    outcomeLabels: { would_create: 'Would create', skipped_duplicate: 'Skipped duplicate' },
    outcomeTones: { would_create: 'success', skipped_duplicate: 'warning' },
    runFields: [{ key: 'status', label: 'Run status' }],
    emptyState: 'This source reports bounded totals only.',
  },
};
```

- `outcomeLabels` resolve `outcome` and `action` cells, so tables show localized
  human text instead of raw application keys. `outcomeTones` emit a semantic
  `data-tone`; shared CSS styles the tone and never names an application key.
- `priority` drives narrow-layout column visibility through `data-priority`.
  Column order is never treated as meaning.
- `runFields` is an allowlist. `ImportReportData.run` stays open-ended safe
  metadata and is never enumerated into the DOM; only declared keys render, with
  localized labels and text-safe formatted values. Empty values are omitted.

Row detail and aggregate totals are **declared**, not inferred. Set
`ImportReportData.detailMode` to `'aggregate'` for sources that have no safe row
detail by design; it renders metrics, the `emptyState` explanation and allowed
run details, with no row table, row filters, or truncation claim. The default is
`'rows'`, and a row report with zero rows and a positive total stays a truthful
bounded row report rather than being relabelled. An aggregate payload that also
ships rows keeps its declared mode and is reported through the logging boundary.

Completion callbacks are post-commit observers, not part of the import
transport. If `onComplete` fails, the modal remains complete and cannot replay
the apply; it shows localized `completionError` copy and reports the observer
failure through optional `onCompletionError` hooks.

Header close, footer dismissal, Escape and backdrop all route through
`Modal.requestClose()`. Because that veto is synchronous and discard
confirmation is not, a dismissal with editable work starts one confirmation,
vetoes the current request, ignores repeated requests while pending, and
re-enters with a one-shot authorization once approved. Busy preview/apply work
vetoes dismissal and reports `busyDismissBlocked`; it is never described as
cancelled, because aborting the client does not cancel accepted server work. An
unresolved unknown/retryable apply is never discarded or retired by closing:
its attempt, input and report are preserved and reopening the same instance
shows the truthful uncertain state.

Footer controls are state-aware. Preview/Apply/Retry is present only while
actionable and is hidden — not left disabled — after complete or terminal
results, where Import another takes over as the primary action. The dismissal
control reads `cancel` while abandoning editable pre-apply work and `dismiss`
for settled or preserved results.

Changing a selectable mode invalidates its preview. Custom panels must call
`ImportSourcePanelAPI.inputChanged()` whenever application-owned input changes;
this clears stale preview state and eligibility. Provide `setInputDisabled`
when a custom panel has mutable controls so unresolved attempts can lock them
while retaining the exact retry input. Source changes with selected or
previewed work use `confirmDiscard` when supplied, otherwise the localized
discard confirmation from `BulkImportCopy`.

Pass every operator-visible and assistive string through `copy`, including
source/mode/sample labels, report filters and bounds, partial/replay flags,
preview/reconciliation states, and confirmation actions. The built-in English
values are fallbacks for hosts that do not provide localization.

`Modal` owns the outer dialog, backdrop, accessible name/description, initial
and fallback focus, topmost Tab/Escape handling, focus return, nested stacking,
body scroll locking, reduced motion, and cleanup. Product code owns content,
validation, permissions, transport, commands, redirects, and error mapping.

Every modal must provide `labelledBy` or `ariaLabel`. Use `describedBy` when a
description is present. `initialFocus` accepts a selector or an element and
falls back to the first focusable descendant, then the dialog itself. Override
`onBeforeHide()` to veto a requested close, `onAfterShow()` for post-mount data
loading, and `onAfterHide()` for product cleanup. Call `requestClose()` from
content controls so veto and shared cleanup are preserved; reserve `destroy()`
for immediate teardown.

The server-rendered form pattern keeps trusted markup in the host and replaces
only inner content after validation:

```ts
class CustomerFormModal extends Modal {
  protected renderContent(): string {
    return document.querySelector<HTMLTemplateElement>('#customer-form')!.innerHTML;
  }

  protected bindContentEvents(): void {
    this.container?.querySelector('form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const trustedValidationMarkup = await submitToApplicationEndpoint(event.currentTarget);
      this.replaceContent(trustedValidationMarkup, '#validation-summary');
    });
  }
}

const modal = new CustomerFormModal({
  labelledBy: 'customer-form-title',
  describedBy: 'customer-form-description',
  initialFocus: 'input[name="name"]',
});
```

`renderContent()` and `replaceContent()` assign `innerHTML`; they do not make
untrusted input safe. Use server markup only when the application already
establishes it as trusted, or escape values through
`@goliatone/go-admin-client/shared/html`. Add layout/theme classes through
`containerClass`; do not replace the backdrop, stack, or focus manager. The
shipped `go-admin-modal-container` class provides the default visual-viewport
height constraint. Any utility named in `containerClass` must exist in the
host stylesheet at build time; runtime-composed Tailwind arbitrary classes are
not generated automatically.

When migrating an existing modal, remove inner `role="dialog"`/`aria-modal`,
document Escape listeners, modal-specific focus traps/return, backdrop removal,
and body-scroll mutation. Keep specialized product state and lazy loading in
the subclass. The complete progressive-enhancement fixture is
`tests/fixtures/modal/server-rendered-form.html`.
