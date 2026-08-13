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

Completion callbacks are post-commit observers, not part of the import
transport. If `onComplete` fails, the modal remains complete and cannot replay
the apply; it shows localized `completionError` copy and reports the observer
failure through optional `onCompletionError` hooks.

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
