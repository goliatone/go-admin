// Bespoke console renderer for the "commands" debug panel (command launcher).
//
// The generic schema renderer turned the formgen-style argument form into a
// single wrapping flex row plus a redundant dropdown + read-only catalog table.
// This module replaces the full console render for the `commands` panel with a
// master-detail launcher: a searchable, grouped command catalog embeds the
// server-rendered formgen fields and drives a structured result panel.
//
// It deliberately reuses the existing dispatch contract: each command form
// carries the same `data-panel-action-*` markup the server already emits, so
// `DebugPanel.runPanelAction` dispatches it unchanged. Only the rendering and
// the result presentation are bespoke. The toolbar and every other panel keep
// the generic renderer.

import { escapeHTML } from '../utils.js';
import { registerServerPanelConsoleRenderer, type ServerPanelConsoleRendererContext } from '../server-definitions.js';
import { panelActionHasSensitiveFields } from '../panel-actions.js';
import { readCSRFToken } from '../../../shared/transport/http-client.js';

const COMMAND_LAUNCHER_PANEL_ID = 'commands';
const COMMAND_OPTION_ENDPOINT_SCHEME = 'command-options://';

type ServerAction = {
  id?: string;
  label?: string;
  submit_label?: string;
  confirm_text?: string;
  requires_confirm?: boolean;
  payload?: Record<string, unknown>;
  form?: ServerActionForm;
};

type ServerActionForm = {
  renderer?: string;
  operation_id?: string;
  html?: string;
  model_version?: string;
  sensitive?: boolean;
};

type DescriptorLike = {
  id?: string;
  label?: string;
  summary?: string;
  group?: string;
  tags?: string[];
  mutating?: boolean;
  execution_mode?: string;
};

type DiagnosticLike = {
  code?: string;
  severity?: string;
  message?: string;
};

type CatalogEntry = {
  // Stable selection key: the action id when the command is executable, else a
  // `cmd:<commandId>` synthetic key so visible-but-not-executable commands can
  // still be selected and described.
  key: string;
  actionId: string;
  commandId: string;
  label: string;
  action?: ServerAction;
  descriptor?: DescriptorLike;
  group: string;
  search: string;
  executable: boolean;
};

// Session state that must survive a panel re-render (snapshot updates,
// post-dispatch refresh, live events). The debug console rebuilds the panel's
// innerHTML on every snapshot, so any in-progress interaction would otherwise be
// discarded. We keep the selected command, the filter text, and a per-command
// form draft in module scope and rehydrate them on every attach.
let selectedActionId = '';
let filterText = '';
const formDrafts = new Map<string, Record<string, unknown>>();

type FormgenController = {
  getValues(): Record<string, unknown>;
  setValues(values: Record<string, unknown>): void;
  reset(): void;
  setErrors(errors: Record<string, string | string[]>): void;
  clearErrors(names?: string[]): void;
  onChange(callback: (values: Record<string, unknown>, event: Event) => void): () => void;
  focus(name: string): boolean;
  destroy(): void;
};

type FormgenRegistry = { destroy(root?: HTMLElement): void };
type FormgenRuntime = {
  initFormgenRoot?: (root: HTMLElement, config?: Record<string, unknown>) => Promise<FormgenRegistry>;
  Formgen?: { attach(root: HTMLElement, options?: { registry?: FormgenRegistry }): FormgenController };
};

type FormgenResolverContext = {
	element: HTMLElement;
	request: { url: string; init: RequestInit };
};

type FormgenControllerSession = {
  form: HTMLElement;
  root: HTMLElement;
  controller: FormgenController;
  unsubscribe: () => void;
};

const formgenControllers = new Map<string, FormgenControllerSession>();

// Operator-chosen master-list width (app-shell splitter). The panel rebuilds its
// innerHTML on every snapshot, so the width lives in module scope (mirrored to
// localStorage) and is re-applied on every attach, like the selection/filter.
let sidebarWidth = 0; // 0 == unset → fall back to the CSS default track width.
const SIDEBAR_DEFAULT_PX = 230;
const SIDEBAR_MIN_PX = 180;
const SIDEBAR_MAX_FALLBACK_PX = 640;
const DETAIL_MIN_PX = 280;
const SIDEBAR_KEYBOARD_STEP_PX = 24;
const SIDEBAR_WIDTH_KEY = 'cmdl:sidebar-width';

// Live command status received over the debug WebSocket (Phase 3 T11), keyed by
// correlation id. The result card reflects the latest state for the command it
// is showing — including completion pushed later by a host queue worker.
export type CommandLiveStatus = {
  state: string;
  message: string;
  at: string;
  code: string;
  runID: string;
  correlationID: string;
  dispatchID: string;
};
const commandStatusByCorrelation = new Map<string, CommandLiveStatus>();

// Clears session-scoped launcher state (selected command, filter text, form
// drafts, live statuses). Exposed so a host can reset the launcher when the
// debug session resets, and used by tests to isolate cases.
export function resetCommandLauncherState(): void {
  destroyFormgenControllers();
  selectedActionId = '';
  filterText = '';
  sidebarWidth = 0;
  formDrafts.clear();
  commandStatusByCorrelation.clear();
}

const LIVE_STATE_ORDER: Record<string, number> = {
  submitting: 0,
  accepted: 1,
  running: 2,
  completed: 3,
  failed: 3,
  canceled: 3,
  cancelled: 3,
  rejected: 3,
};

// Store a command_status event. Later events win, but never regress a terminal
// state (completed/failed) back to an earlier one from a stray/late event.
export function applyCommandLauncherStatusEvent(payload: unknown): void {
  const event = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const identifiers = Array.from(new Set([
    str(event.correlation_id) || str(event.CorrelationID),
    str(event.run_id) || str(event.RunID),
    str(event.dispatch_id) || str(event.DispatchID),
  ].filter(Boolean)));
  const state = lower(event.state) || lower(event.State);
  if (identifiers.length === 0 || !state) {
    return;
  }
  const runID = str(event.run_id) || str(event.RunID);
  const correlationID = str(event.correlation_id) || str(event.CorrelationID);
  const dispatchID = str(event.dispatch_id) || str(event.DispatchID);
  identifiers.forEach((identifier) => {
    const existing = commandStatusByCorrelation.get(identifier);
    if (existing && (LIVE_STATE_ORDER[existing.state] ?? -1) > (LIVE_STATE_ORDER[state] ?? -1)) {
      return;
    }
    commandStatusByCorrelation.set(identifier, {
      state,
      message: str(event.message) || str(event.Message),
      at: str(event.at) || str(event.At),
      code: str(event.code) || str(event.Code),
      runID,
      correlationID,
      dispatchID,
    });
  });
}

export function getCommandLauncherLiveStatus(correlationId: string): CommandLiveStatus | undefined {
  return correlationId ? commandStatusByCorrelation.get(correlationId) : undefined;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function lower(value: unknown): string {
  return str(value).toLowerCase();
}

function serializePayloadAttr(payload: Record<string, unknown> | undefined): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }
  return escapeHTML(JSON.stringify(payload)).replace(/'/g, '&#39;');
}

function presentationString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function executionClass(mode: string): string {
  const normalized = lower(mode);
  if (normalized === 'inline' || normalized === 'sync') {
    return 'inline';
  }
  if (normalized === 'queued' || normalized === 'async' || normalized === 'background') {
    return 'queued';
  }
  return 'other';
}

// ============================================================================
// Catalog assembly
// ============================================================================

function buildCatalog(def: ServerPanelConsoleRendererContext['def'], data: unknown): { entries: CatalogEntry[]; diagnostics: DiagnosticLike[] } {
  const snapshot = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const commands = Array.isArray(snapshot.commands) ? (snapshot.commands as DescriptorLike[]) : [];
  const diagnostics = Array.isArray(snapshot.diagnostics) ? (snapshot.diagnostics as DiagnosticLike[]) : [];
  const actions = Array.isArray(def.ui?.actions) ? (def.ui!.actions as ServerAction[]) : [];

  const descriptorById = new Map<string, DescriptorLike>();
  commands.forEach((descriptor) => {
    const id = str(descriptor?.id);
    if (id) {
      descriptorById.set(id, descriptor);
    }
  });

  const actionByCommand = new Map<string, ServerAction>();
  actions.forEach((action) => {
    const actionId = lower(action?.id);
    const commandId = str((action.payload as Record<string, unknown> | undefined)?.command_id);
    if (actionId && commandId && !actionByCommand.has(commandId)) {
      actionByCommand.set(commandId, action);
    }
  });

  // Union of visible descriptors (snapshot `commands`, i.e. read-permitted) and
  // executable actions (dispatch-permitted). The snapshot can include commands
  // the operator may see but not run; iterating actions alone would drop them.
  const commandIds: string[] = [];
  const seen = new Set<string>();
  const remember = (id: string) => {
    if (id && !seen.has(id)) {
      seen.add(id);
      commandIds.push(id);
    }
  };
  commands.forEach((descriptor) => remember(str(descriptor?.id)));
  actions.forEach((action) => remember(str((action.payload as Record<string, unknown> | undefined)?.command_id)));

  const entries: CatalogEntry[] = commandIds.map((commandId) => {
    const descriptor = descriptorById.get(commandId);
    const action = actionByCommand.get(commandId);
    const actionId = action ? lower(action.id) : '';
    const executable = Boolean(action && actionId && lower(action.form?.renderer) === 'formgen');
    const label = str(action?.label) || str(descriptor?.label) || commandId;
    const group = str(descriptor?.group) || 'Other';
    const tags = Array.isArray(descriptor?.tags) ? descriptor!.tags!.map(str).filter(Boolean) : [];
    const search = `${commandId} ${label} ${group} ${tags.join(' ')}${executable ? '' : ' no-access locked'}`.toLowerCase();
    return {
      key: executable ? actionId : `cmd:${commandId}`,
      actionId,
      commandId,
      label,
      action: executable ? action : undefined,
      descriptor,
      group,
      search,
      executable,
    };
  });

  return { entries, diagnostics };
}

function groupEntries(entries: CatalogEntry[]): Array<{ group: string; items: CatalogEntry[] }> {
  const groups = new Map<string, CatalogEntry[]>();
  entries.forEach((entry) => {
    if (!groups.has(entry.group)) {
      groups.set(entry.group, []);
    }
    groups.get(entry.group)!.push(entry);
  });
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, items]) => ({
      group,
      items: items.sort((a, b) => (a.commandId || a.label).localeCompare(b.commandId || b.label)),
    }));
}

// ============================================================================
// List (master) rendering
// ============================================================================

function renderListItem(entry: CatalogEntry): string {
  const execMode = str(entry.descriptor?.execution_mode);
  const execClass = executionClass(execMode);
  const dotTitle = execMode ? `Execution: ${execMode}` : 'Execution mode unknown';
  const mutating = entry.descriptor?.mutating === true;
  let flag: string;
  if (!entry.executable) {
    flag = '<span class="cmdl-item__flag cmdl-item__flag--locked" title="You can view this command but lack permission to run it">no access</span>';
  } else if (mutating) {
    flag = '<span class="cmdl-item__flag cmdl-item__flag--mutating" title="Mutating — writes data">writes</span>';
  } else {
    flag = '<span class="cmdl-item__flag cmdl-item__flag--read" title="Read-only">read</span>';
  }
  return `
    <button type="button" class="cmdl-item${entry.executable ? '' : ' cmdl-item--locked'}" role="option" aria-selected="false"
      data-cmdl-item="${escapeHTML(entry.key)}"
      data-cmdl-search="${escapeHTML(entry.search)}"
      title="${escapeHTML(entry.commandId || entry.label)}">
      <span class="cmdl-item__dot cmdl-item__dot--${execClass}" title="${escapeHTML(dotTitle)}" aria-hidden="true"></span>
      <span class="cmdl-item__name">${escapeHTML(entry.commandId || entry.label)}</span>
      ${flag}
    </button>`;
}

function renderList(grouped: Array<{ group: string; items: CatalogEntry[] }>, total: number): string {
  const groups = grouped
    .map(
      (group) => `
      <div class="cmdl-group" data-cmdl-group role="group" aria-label="${escapeHTML(group.group)}">
        <div class="cmdl-group__label" aria-hidden="true">${escapeHTML(group.group)}</div>
        ${group.items.map(renderListItem).join('')}
      </div>`
    )
    .join('');
  return `
    <aside class="cmdl__list">
      <div class="cmdl__search">
        <input type="search" class="cmdl__search-input" data-cmdl-filter
          placeholder="Filter ${total} command${total === 1 ? '' : 's'}…"
          aria-label="Filter commands" autocomplete="off" spellcheck="false">
      </div>
      <div class="cmdl__groups" role="listbox" aria-label="Commands" data-cmdl-groups>
        ${groups}
        <div class="cmdl__noresults" data-cmdl-noresults hidden>No commands match your filter.</div>
      </div>
    </aside>`;
}

// ============================================================================
// Detail + form rendering
// ============================================================================

function normalizedPayloadPath(value: string): string {
  return value.trim().replace(/^payload\./, '');
}
function renderForm(entry: CatalogEntry): string {
  const action = entry.action;
  if (!action) {
    return '';
  }
  const generated = action.form!;
  const generatedHTML = typeof generated.html === 'string' ? generated.html : '';
  const hasArguments = generatedHTML.trim() !== '';
  const submitLabel = str(action.submit_label) || 'Run command';
  const confirm = str(action.confirm_text);
  const requiresConfirm = action.requires_confirm === true;
  const mutating = entry.descriptor?.mutating === true;
  const hasSensitiveFields = generated.sensitive === true;
  const body = `${hasArguments && !hasSensitiveFields ? `<div class="cmdl-recall" data-cmdl-recall data-cmdl-command="${escapeHTML(entry.commandId)}">
      <div class="cmdl-recall__list" data-cmdl-recall-list></div>
      <button type="button" class="cmdl-recall__save" data-cmdl-save-preset>Save preset</button>
    </div>` : ''}
    <div class="cmdl-form__fields" data-cmdl-fields data-cmdl-formgen-root data-operation-id="${escapeHTML(str(generated.operation_id))}">
      ${hasArguments ? generatedHTML : '<p class="cmdl-form__noargs">This command takes no arguments. Run it as-is.</p>'}
    </div>
    <input type="hidden" data-action-field="__payload__" data-action-field-kind="json" data-action-field-path="payload"
      data-cmdl-controller-payload${hasSensitiveFields ? ' data-action-field-sensitive="true"' : ''} value="{}">
    ${hasArguments && !hasSensitiveFields ? `<div class="cmdl-form__json" data-cmdl-json hidden>
      <textarea class="cmdl-json-editor" data-cmdl-json-editor rows="10" spellcheck="false" aria-label="Raw JSON payload"></textarea>
      <div class="cmdl-json-error" data-cmdl-json-error hidden></div>
    </div>` : ''}`;

  // Mutating / confirm-required commands gate dispatch with an inline two-step
  // confirmation in the action bar instead of a blocking browser dialog. The
  // launcher owns this UX, so it tells the host (DebugPanel.runPanelAction) to
  // skip its native window.confirm via data-action-confirm-inline; the server's
  // requires_confirm signal is still surfaced honestly on the form.
  const needsConfirm = requiresConfirm || confirm !== '';
  const note = mutating
    ? '<span class="cmdl-form__note">Confirms before running</span>'
    : '';
  const jsonToggle = hasArguments && !hasSensitiveFields
    ? '<button type="button" class="cmdl-btn cmdl-btn--ghost cmdl-btn--json" data-cmdl-json-toggle title="Edit the raw JSON payload">JSON</button>'
    : '';
  const sensitiveNote = hasSensitiveFields
    ? '<span class="cmdl-form__note">Sensitive values are never saved and must be re-entered</span>'
    : '';
  const confirmRow = needsConfirm
    ? `
        <div class="cmdl-form__confirm" data-cmdl-confirm-row hidden>
          <span class="cmdl-form__confirm-msg">${escapeHTML(confirm || 'Run this command?')}</span>
          <button type="submit" class="cmdl-btn cmdl-btn--run cmdl-btn--confirm" data-cmdl-confirm-run>Confirm run</button>
          <button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-cancel>Cancel</button>
        </div>`
    : '';

  return `
    <form class="cmdl-form" data-panel-action-form data-cmdl-mode="form" data-cmdl-command="${escapeHTML(entry.commandId)}"
      data-panel-id="${escapeHTML(COMMAND_LAUNCHER_PANEL_ID)}"
      data-action-id="${escapeHTML(entry.actionId)}"
      data-action-confirm="${escapeHTML(confirm)}"
      data-action-requires-confirm="${requiresConfirm ? 'true' : 'false'}"
      data-cmdl-confirm="${needsConfirm ? 'true' : 'false'}"
      ${needsConfirm ? 'data-action-confirm-inline="true"' : ''}
      data-action-payload='${serializePayloadAttr(action.payload)}'>
      ${body}
      <div class="cmdl-form__bar" data-cmdl-bar>
        <div class="cmdl-form__bar-main" data-cmdl-bar-main>
		  <button type="submit" class="cmdl-btn cmdl-btn--run" disabled data-cmdl-formgen-submit>${escapeHTML(submitLabel)}</button>
          <button type="reset" class="cmdl-btn cmdl-btn--ghost">Reset</button>
          ${jsonToggle}
          ${note}
          ${sensitiveNote}
        </div>${confirmRow}
      </div>
    </form>`;
}

function renderDetailBlock(entry: CatalogEntry): string {
  const execMode = str(entry.descriptor?.execution_mode);
  const mutating = entry.descriptor?.mutating === true;
  const summary = str(entry.descriptor?.summary);
  const chips: string[] = [];
  chips.push(`<span class="cmdl-chip">${escapeHTML(entry.group)}</span>`);
  if (execMode) {
    chips.push(`<span class="cmdl-chip cmdl-chip--${executionClass(execMode)}">${escapeHTML(execMode)}</span>`);
  }
  chips.push(
    mutating
      ? '<span class="cmdl-chip cmdl-chip--mutating">mutating</span>'
      : '<span class="cmdl-chip cmdl-chip--read">read-only</span>'
  );
  if (!entry.executable) {
    chips.push('<span class="cmdl-chip cmdl-chip--locked">no dispatch permission</span>');
  }

  let body: string;
  if (!entry.executable) {
    body = `<div class="cmdl-locked-note">You can view this command in the catalog, but you do not have permission to run it. Dispatch requires the command's own permission plus <code>admin.commands.dispatch</code>.</div>`;
  } else {
    const callout = mutating
      ? `<div class="cmdl-callout">
          <strong>This command writes data.</strong> Review the arguments before running — it confirms first, but the effect is not automatically reversible.
        </div>`
      : '';
    body = `${callout}${renderForm(entry)}`;
  }

  return `
    <div class="cmdl-cmd" data-cmdl-detail="${escapeHTML(entry.key)}" hidden>
      <div class="cmdl-cmd__head">
        <div class="cmdl-cmd__title">${escapeHTML(entry.commandId || entry.label)}</div>
        ${summary ? `<div class="cmdl-cmd__summary">${escapeHTML(summary)}</div>` : ''}
        <div class="cmdl-cmd__chips">${chips.join('')}</div>
      </div>
      ${body}
    </div>`;
}

function renderDiagnostics(diagnostics: DiagnosticLike[]): string {
  if (!diagnostics.length) {
    return '';
  }
  const rows = diagnostics
    .map((diagnostic) => {
      const severity = lower(diagnostic.severity) || 'info';
      const message = str(diagnostic.message);
      const code = str(diagnostic.code);
      return `
        <li class="cmdl-diag cmdl-diag--${escapeHTML(severity)}">
          <span class="cmdl-diag__sev">${escapeHTML(severity)}</span>
          <span class="cmdl-diag__msg">${escapeHTML(message)}${code ? ` <span class="cmdl-diag__code">${escapeHTML(code)}</span>` : ''}</span>
        </li>`;
    })
    .join('');
  return `<ul class="cmdl-diagnostics">${rows}</ul>`;
}

// ============================================================================
// Main console renderer
// ============================================================================

export function renderCommandLauncherConsole(ctx: ServerPanelConsoleRendererContext): string {
  const { def, data } = ctx;
  const { entries, diagnostics } = buildCatalog(def, data);
  const metadata = def.ui?.metadata && typeof def.ui.metadata === 'object' ? def.ui.metadata as Record<string, unknown> : {};
  const resolverAction = str(metadata.option_resolver_action);
  const resolverAttr = resolverAction ? ` data-cmdl-option-resolver="${escapeHTML(resolverAction)}"` : '';

  if (entries.length === 0) {
    return `
      <div class="cmdl" data-cmdl-root${resolverAttr}>
        <div class="cmdl__empty-panel">No commands are available to run.</div>
        ${renderDiagnostics(diagnostics)}
        <div class="cmdl-result" data-panel-action-result="${escapeHTML(COMMAND_LAUNCHER_PANEL_ID)}"></div>
      </div>`;
  }

  const grouped = groupEntries(entries);
  const details = entries.map(renderDetailBlock).join('');

  return `
    <div class="cmdl" data-cmdl-root${resolverAttr}>
      <div class="cmdl__body" data-cmdl-body>
        ${renderList(grouped, entries.length)}
        <div class="cmdl__resizer" data-cmdl-resizer role="separator" aria-orientation="vertical"
          aria-label="Resize command list" tabindex="0"></div>
        <section class="cmdl__detail" data-cmdl-detailcol>
          <div class="cmdl-detail__empty" data-cmdl-empty>Select a command from the list to configure and run it.</div>
          ${details}
          <!-- Result lives in the detail column (beside the list, below the form it
               belongs to) so it appears next to where the command was run, not as a
               full-width strip under the whole console. Empty == hidden via CSS. -->
          <div class="cmdl-result" data-panel-action-result="${escapeHTML(COMMAND_LAUNCHER_PANEL_ID)}"></div>
        </section>
      </div>
      ${renderDiagnostics(diagnostics)}
    </div>`;
}

// ============================================================================
// Structured result (consumed by DebugPanel.renderStoredPanelActionResult)
// ============================================================================

// A go-errors style rich error envelope (the `error` object the server returns on
// failures). Everything is optional/defensive — only present fields render.
export type RichCommandErrorFrame = {
  func: string;
  funcTitle: string;
  loc: string;
  locTitle: string;
  app: boolean;
};

export type RichCommandError = {
  category: string;
  textCode: string;
  source: string;
  severity: string;
  timestamp: string;
  httpCode: string;
  metadata: Array<{ key: string; value: string }>;
  location: string;
  locationTitle: string;
  stackTrace: RichCommandErrorFrame[];
};

export type ParsedCommandResult = {
  kind: 'ok' | 'invalid' | 'error';
  message: string;
  code: string;
  correlationId: string;
  runId: string;
  mode: string;
  dispatchId: string;
  statusReference: string;
  accepted: boolean | undefined;
  validationErrors: Array<{ path: string; message: string; code: string }>;
  richError: RichCommandError | null;
  hasRaw: boolean;
  rawJSON: string;
};

function pick(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return '';
}

const RICH_ERROR_MARKERS = ['category', 'text_code', 'source', 'stack_trace', 'severity', 'location', 'metadata'];

// Locate the rich error object across the shapes failures arrive in: an HTTP
// error body `{ error: {...} }`, a structured `errors` field, or the object
// passed directly. Returns the first candidate carrying rich-error markers.
function findRichErrorObject(data: unknown, errors: unknown): Record<string, unknown> | null {
  const candidates: unknown[] = [];
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    candidates.push((data as Record<string, unknown>).error, data);
  }
  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    candidates.push((errors as Record<string, unknown>).error, errors);
  }
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const obj = candidate as Record<string, unknown>;
      if (RICH_ERROR_MARKERS.some((marker) => marker in obj)) {
        return obj;
      }
    }
  }
  return null;
}

// `github.com/goliatone/go-admin/admin.presentError` -> `admin.presentError`.
function shortFunc(fn: string): string {
  const slash = fn.lastIndexOf('/');
  return slash >= 0 ? fn.slice(slash + 1) : fn;
}

// Keep the last two path segments so frames stay readable (full path on hover).
function shortFile(file: string): string {
  const parts = file.split('/').filter(Boolean);
  return parts.length > 2 ? parts.slice(-2).join('/') : file;
}

function frameLine(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseRichError(obj: Record<string, unknown>): RichCommandError {
  const metaObj = obj.metadata && typeof obj.metadata === 'object' && !Array.isArray(obj.metadata)
    ? (obj.metadata as Record<string, unknown>)
    : {};
  const metadata = Object.entries(metaObj)
    .map(([key, value]) => ({ key, value: presentationString(value) || safeStringify(value) }))
    .filter((entry) => entry.value);

  const rawStack = Array.isArray(obj.stack_trace) ? (obj.stack_trace as Array<Record<string, unknown>>) : [];
  const stackTrace: RichCommandErrorFrame[] = rawStack
    .map((frame) => {
      const fn = str(frame.function);
      const file = str(frame.file);
      const line = frameLine(frame.line);
      return {
        func: shortFunc(fn),
        funcTitle: fn,
        loc: file ? `${shortFile(file)}${line ? `:${line}` : ''}` : '',
        locTitle: file ? `${file}${line ? `:${line}` : ''}` : '',
        // Frames outside the Go module cache are first-party (the operator's own
        // code) — the actionable ones, so they get highlighted.
        app: file !== '' && !file.includes('/pkg/mod/'),
      };
    })
    .filter((frame) => frame.func || frame.loc);

  const locObj = obj.location && typeof obj.location === 'object' && !Array.isArray(obj.location)
    ? (obj.location as Record<string, unknown>)
    : {};
  const locFile = str(locObj.file);
  const locFunc = str(locObj.function);
  const locLine = frameLine(locObj.line);
  const locShort = locFile ? `${shortFile(locFile)}${locLine ? `:${locLine}` : ''}` : '';
  const location = [shortFunc(locFunc), locShort ? `(${locShort})` : ''].filter(Boolean).join(' ');
  const locationTitle = [locFunc, locFile ? `${locFile}${locLine ? `:${locLine}` : ''}` : ''].filter(Boolean).join(' ');

  return {
    category: str(obj.category),
    textCode: str(obj.text_code),
    source: str(obj.source),
    severity: str(obj.severity),
    timestamp: str(obj.timestamp),
    httpCode: typeof obj.code === 'number' ? String(obj.code) : str(obj.code),
    metadata,
    location,
    locationTitle,
    stackTrace,
  };
}

export function extractCommandLauncherResult(
  status: 'ok' | 'error',
  message: string,
  data: unknown,
  errors?: Record<string, unknown>
): ParsedCommandResult {
  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const receipt = d.receipt && typeof d.receipt === 'object' ? (d.receipt as Record<string, unknown>) : {};
  const rawValidation = Array.isArray(d.validation_errors) ? (d.validation_errors as Array<Record<string, unknown>>) : [];
  const validationErrors = rawValidation
    .map((entry) => ({
      path: str(entry.path),
      message: str(entry.message),
      code: str(entry.code),
    }))
    .filter((entry) => entry.message || entry.path);

  const acceptedRaw = receipt.Accepted ?? receipt.accepted;
  const accepted = typeof acceptedRaw === 'boolean' ? acceptedRaw : undefined;

  let kind: ParsedCommandResult['kind'] = 'ok';
  if (status === 'error') {
    kind = 'error';
  } else if (validationErrors.length > 0 || accepted === false) {
    kind = 'invalid';
  }

  const richErrorObject = kind === 'error' ? findRichErrorObject(data, errors) : null;
  const richError = richErrorObject ? parseRichError(richErrorObject) : null;

  let code = '';
  if (validationErrors.length > 0) {
    code = 'VALIDATION_ERROR';
  } else if (kind === 'error') {
    code = (richError && richError.textCode)
      || pick((errors || {}) as Record<string, unknown>, ['code', 'text_code'])
      || (richError ? richError.httpCode : '');
  }

  const hasRaw = data !== undefined && data !== null && (typeof data !== 'object' || Object.keys(d).length > 0);

  return {
    kind,
    message: str(message) || (kind === 'error' ? 'Command failed' : 'Command dispatched'),
    code,
    correlationId: pick(receipt, ['CorrelationID', 'correlation_id']),
    runId: pick(receipt, ['RunID', 'run_id']) || pick(d, ['run_id', 'RunID']),
    mode: pick(receipt, ['Mode', 'mode']),
    dispatchId: pick(receipt, ['DispatchID', 'dispatch_id']),
    statusReference: str(d.status_reference) || str((d as Record<string, unknown>).statusReference),
    accepted,
    validationErrors,
    richError,
    hasRaw,
    rawJSON: hasRaw ? safeStringify(data) : '',
  };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '';
  }
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function formatClockTime(at: number): string {
  try {
    return new Date(at).toLocaleTimeString();
  } catch {
    return '';
  }
}

function metaChip(icon: string, label: string, value: string): string {
  if (!value) {
    return '';
  }
  return `<span class="cmdl-meta" title="${escapeHTML(label)}"><span class="cmdl-meta__k">${escapeHTML(icon)}</span>${escapeHTML(value)}</span>`;
}

export function renderCommandLauncherResultCard(
  parsed: ParsedCommandResult,
  options: { canRetry?: boolean; at?: number; durationMs?: number; liveStatus?: CommandLiveStatus; commandRunsHref?: string } = {}
): string {
  const statusLabel = parsed.kind === 'error'
    ? 'Dispatch failed'
    : parsed.kind === 'invalid'
      ? (parsed.validationErrors.length ? 'Validation failed' : 'Not accepted')
      : 'Command dispatched';
  const codePill = parsed.code ? `<span class="cmdl-result__code">${escapeHTML(parsed.code)}</span>` : '';
  const live = options.liveStatus;
  const livePill = live
    ? `<span class="cmdl-result__live cmdl-result__live--${escapeHTML(live.state)}" title="Live status${live.at ? ` · ${escapeHTML(live.at)}` : ''}">${escapeHTML(live.state)}</span>`
    : '';

  const rich = parsed.richError;
  const meta = [
    metaChip('id', 'Correlation ID', parsed.correlationId),
    metaChip('mode', 'Execution mode', parsed.mode),
    metaChip('dispatch', 'Dispatch ID', parsed.dispatchId),
    metaChip('status', 'Status reference', parsed.statusReference),
    metaChip('took', 'Round-trip duration', typeof options.durationMs === 'number' ? formatDurationMs(options.durationMs) : ''),
    metaChip('at', 'Dispatched at', typeof options.at === 'number' && options.at > 0 ? formatClockTime(options.at) : ''),
    rich ? metaChip('category', 'Category', rich.category) : '',
    rich ? metaChip('severity', 'Severity', rich.severity) : '',
    rich ? metaChip('http', 'HTTP status', rich.httpCode) : '',
    ...(rich ? rich.metadata.map((entry) => metaChip(entry.key, entry.key, entry.value)) : []),
    rich ? metaChip('when', 'Timestamp', rich.timestamp) : '',
    rich ? metaChip('at', rich.locationTitle || 'Origin', rich.location) : '',
  ]
    .filter(Boolean)
    .join('');
  const metaRow = meta ? `<div class="cmdl-result__meta">${meta}</div>` : '';

  // The `source` is the underlying cause (often the real, actionable message);
  // surface it prominently when it adds something beyond the headline message.
  const cause = rich && rich.source && rich.source !== parsed.message
    ? `<div class="cmdl-result__cause"><span class="cmdl-result__cause-k">Cause</span><code class="cmdl-result__cause-v">${escapeHTML(rich.source)}</code></div>`
    : '';

  const trace = rich && rich.stackTrace.length
    ? `<details class="cmdl-result__trace"><summary>Stack trace · ${rich.stackTrace.length} frame${rich.stackTrace.length === 1 ? '' : 's'}</summary><ol class="cmdl-trace">${rich.stackTrace
        .map(
          (frame) =>
            `<li class="cmdl-trace__frame${frame.app ? ' cmdl-trace__frame--app' : ''}"><span class="cmdl-trace__fn" title="${escapeHTML(frame.funcTitle)}">${escapeHTML(frame.func)}</span>${frame.loc ? `<span class="cmdl-trace__loc" title="${escapeHTML(frame.locTitle)}">${escapeHTML(frame.loc)}</span>` : ''}</li>`
        )
        .join('')}</ol></details>`
    : '';

  const validation = parsed.validationErrors.length
    ? `<ul class="cmdl-result__validation">${parsed.validationErrors
        .map(
          (entry) =>
            `<li><span class="cmdl-result__path">${escapeHTML(entry.path || 'payload')}</span><span class="cmdl-result__vmsg">${escapeHTML(entry.message || entry.code)}</span></li>`
        )
        .join('')}</ul>`
    : '';

  const raw = parsed.hasRaw
    ? `<details class="cmdl-result__raw"><summary>Raw response</summary><pre>${escapeHTML(parsed.rawJSON)}</pre></details>`
    : '';
  const commandRunsLink = options.commandRunsHref
    ? `<a class="cmdl-btn cmdl-btn--ghost" data-cmdl-command-runs href="${escapeHTML(options.commandRunsHref)}">View command run</a>`
    : '';
  const retry = options.canRetry
    ? '<button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-retry>Retry</button>'
    : '';
  const actions = commandRunsLink || retry
    ? `<div class="cmdl-result__actions">${commandRunsLink}${retry}</div>`
    : '';

  return `
    <div class="cmdl-result__card cmdl-result__card--${parsed.kind}">
      <div class="cmdl-result__head">
        <span class="cmdl-result__status">${escapeHTML(statusLabel)}</span>
        ${codePill}${livePill}
        <button type="button" class="cmdl-result__dismiss" data-cmdl-dismiss aria-label="Dismiss result" title="Dismiss result">×</button>
      </div>
      <div class="cmdl-result__msg">${escapeHTML(parsed.message)}</div>
      ${cause}
      ${metaRow}
      ${validation}
      ${trace}
      ${actions}
      ${raw}
    </div>`;
}

// ============================================================================
// Interactions (called by DebugPanel after the panel HTML is mounted)
// ============================================================================

const formgenControllerPending = new WeakMap<HTMLElement, Promise<void>>();

function destroyFormgenControllers(): void {
	formgenControllers.forEach((session) => {
		try { session.unsubscribe(); } catch { /* teardown is best-effort */ }
		try { session.controller.destroy(); } catch { /* teardown is best-effort */ }
	});
	formgenControllers.clear();
}

export function detachCommandLauncherControllers(): void {
	destroyFormgenControllers();
}

function destroyInactiveFormgenControllers(activeActionId: string): void {
	formgenControllers.forEach((session, actionId) => {
		if (actionId === activeActionId) {
			return;
		}
		try { session.unsubscribe(); } catch { /* teardown is best-effort */ }
		try { session.controller.destroy(); } catch { /* teardown is best-effort */ }
		formgenControllers.delete(actionId);
	});
}

function formgenRuntime(): FormgenRuntime | null {
	const scope = globalThis as unknown as Record<string, unknown>;
	const exported = scope.FormgenRelationships && typeof scope.FormgenRelationships === 'object'
		? scope.FormgenRelationships as FormgenRuntime
		: {};
	const globalController = scope.Formgen && typeof scope.Formgen === 'object'
		? scope.Formgen as FormgenRuntime['Formgen']
		: undefined;
	return {
		...exported,
		Formgen: exported.Formgen || globalController,
	};
}

function controllerSession(form: HTMLElement): FormgenControllerSession | undefined {
	const actionId = lower(form.dataset.actionId || '');
	return actionId ? formgenControllers.get(actionId) : undefined;
}

export function applyCommandLauncherControllerErrors(actionId: string, errors: Record<string, unknown>): boolean {
	const session = formgenControllers.get(lower(actionId));
	if (!session) {
		return false;
	}
	const normalized: Record<string, string | string[]> = {};
	Object.entries(errors || {}).forEach(([rawPath, value]) => {
		const path = normalizedPayloadPath(rawPath).replace(/^payload\./, '');
		if (!path) {
			return;
		}
		if (typeof value === 'string') {
			normalized[path] = value;
		} else if (Array.isArray(value)) {
			const messages = value.map(presentationString).filter(Boolean);
			if (messages.length > 0) normalized[path] = messages;
		}
	});
	session.controller.clearErrors();
	if (Object.keys(normalized).length === 0) {
		return true;
	}
	session.controller.setErrors(normalized);
	const first = Object.keys(normalized)[0];
	session.controller.focus(first);
	return true;
}

export function loadCommandLauncherControllerValues(actionId: string, envelope: Record<string, unknown>): boolean {
	const session = formgenControllers.get(lower(actionId));
	if (!session) {
		return false;
	}
	const inner = envelope.payload && typeof envelope.payload === 'object' && !Array.isArray(envelope.payload)
		? envelope.payload as Record<string, unknown>
		: envelope;
	session.controller.setValues(inner);
	const values = session.controller.getValues();
	syncControllerPayload(session.form, values);
	controllerDraft(session.form, values);
	return true;
}

function syncControllerPayload(form: HTMLElement, values: Record<string, unknown>): void {
	const bridge = form.querySelector<HTMLInputElement>('[data-cmdl-controller-payload]');
	if (bridge) {
		bridge.value = JSON.stringify(values || {});
	}
}

function controllerDraft(form: HTMLElement, values: Record<string, unknown>): void {
	const actionId = lower(form.dataset.actionId || '');
	if (!actionId || panelActionHasSensitiveFields(form)) {
		return;
	}
	formDrafts.set(actionId, structuredCloneSafe(values));
}

function structuredCloneSafe(values: Record<string, unknown>): Record<string, unknown> {
	try {
		return JSON.parse(JSON.stringify(values)) as Record<string, unknown>;
	} catch {
		return { ...values };
	}
}

function markFormgenReady(form: HTMLElement, ready: boolean, message = ''): void {
	form.dataset.cmdlFormgenReady = ready ? 'true' : 'false';
	form.querySelectorAll<HTMLButtonElement>('[data-cmdl-formgen-submit]').forEach((button) => {
		button.disabled = !ready;
	});
	let error = form.querySelector<HTMLElement>('[data-cmdl-formgen-error]');
	if (message && !error) {
		error = document.createElement('div');
		error.dataset.cmdlFormgenError = '';
		error.className = 'cmdl-form__runtime-error';
		form.querySelector<HTMLElement>('[data-cmdl-fields]')?.insertAdjacentElement('afterend', error);
	}
	if (error) {
		error.textContent = message;
		error.hidden = message === '';
	}
}

function commandOptionResolverConfig(form: HTMLElement): Record<string, unknown> {
	return {
		beforeFetch(context: FormgenResolverContext) {
			const sentinel = commandOptionSentinel(context.request.url);
			if (!sentinel) {
				return;
			}
			const launcher = form.closest<HTMLElement>('[data-cmdl-root]');
			const debugPath = str(launcher?.dataset.cmdlDebugPath);
			const actionId = str(launcher?.dataset.cmdlOptionResolver);
			if (!debugPath || !actionId) {
				throw new Error('Dynamic command options are unavailable because no protected resolver action is configured.');
			}
			const commandId = sentinel.searchParams.get('command_id') || str(form.dataset.cmdlCommand);
			const fieldPath = sentinel.searchParams.get('field_path') || '';
			const sourceId = sentinel.searchParams.get('source_id') || '';
			if (!commandId || !fieldPath || !sourceId) {
				throw new Error('Dynamic command option metadata is incomplete.');
			}
			const values = controllerSession(form)?.controller.getValues() || collectControllerBridgeValues(form);
			const headers = new Headers(context.request.init.headers || {});
			headers.set('Accept', 'application/json');
			headers.set('Content-Type', 'application/json');
			const csrf = readCSRFToken();
			if (csrf) headers.set('X-CSRF-Token', csrf);
			context.request.url = `${debugPath}/api/panels/${COMMAND_LAUNCHER_PANEL_ID}/actions/${encodeURIComponent(actionId)}`;
			context.request.init.method = 'POST';
			context.request.init.credentials = 'same-origin';
			context.request.init.headers = headers;
			context.request.init.body = JSON.stringify({
				command_id: commandId,
				field_path: fieldPath,
				source_id: sourceId,
				payload: values,
			});
		},
	};
}

function commandOptionSentinel(rawURL: string): URL | null {
	// go-formgen releases before the absolute-URI normalization fix converted a
	// synthetic endpoint into `/command-options://...`. Accept that one exact
	// legacy representation as well as the canonical scheme so mixed asset
	// deployments cannot leak either form into the application router.
	const candidate = rawURL.startsWith(`/${COMMAND_OPTION_ENDPOINT_SCHEME}`)
		? rawURL.slice(1)
		: rawURL;
	if (!candidate.startsWith(COMMAND_OPTION_ENDPOINT_SCHEME)) {
		return null;
	}
	try {
		return new URL(candidate);
	} catch {
		throw new Error('Dynamic command option metadata contains an invalid resolver URL.');
	}
}

function ensureFormgenController(form: HTMLElement): Promise<void> {
	if (!form.querySelector('[data-cmdl-formgen-root]')) {
		return Promise.resolve();
	}
	const pending = formgenControllerPending.get(form);
	if (pending) {
		return pending;
	}
	if (controllerSession(form) && form.dataset.cmdlFormgenReady === 'true') {
		return Promise.resolve();
	}
	const task = (async () => {
		const actionId = lower(form.dataset.actionId || '');
		const wrapper = form.querySelector<HTMLElement>('[data-cmdl-formgen-root]');
		const runtime = formgenRuntime();
		if (!actionId || !wrapper || !runtime?.initFormgenRoot || !runtime.Formgen?.attach) {
			markFormgenReady(form, false, 'The form runtime is unavailable. Refresh after loading the formgen assets.');
			return;
		}
		const runtimeRoot = wrapper.querySelector<HTMLElement>('[data-formgen-auto-init]') || wrapper;
		try {
			const bootstrap = runtime.Formgen.attach(runtimeRoot);
			const draft = formDrafts.get(actionId);
			if (draft && !panelActionHasSensitiveFields(form)) {
				bootstrap.setValues(draft);
			}
			formgenControllers.set(actionId, { form, root: runtimeRoot, controller: bootstrap, unsubscribe: () => {} });
			syncControllerPayload(form, bootstrap.getValues());
			const registry = await runtime.initFormgenRoot(runtimeRoot, commandOptionResolverConfig(form));
			if (!form.isConnected || selectedActionId !== actionId) {
				bootstrap.destroy();
				registry.destroy(runtimeRoot);
				formgenControllers.delete(actionId);
				return;
			}
			bootstrap.destroy();
			const controller = runtime.Formgen.attach(runtimeRoot, { registry });
			if (draft && !panelActionHasSensitiveFields(form)) {
				controller.setValues(draft);
			}
			const unsubscribe = controller.onChange((values) => {
				syncControllerPayload(form, values);
				controllerDraft(form, values);
			});
			formgenControllers.set(actionId, { form, root: runtimeRoot, controller, unsubscribe });
			const values = controller.getValues();
			syncControllerPayload(form, values);
			controllerDraft(form, values);
			markFormgenReady(form, true);
		} catch (error) {
			const session = formgenControllers.get(actionId);
			if (session?.form === form) {
				try { session.unsubscribe(); } catch { /* teardown is best-effort */ }
				try { session.controller.destroy(); } catch { /* teardown is best-effort */ }
				formgenControllers.delete(actionId);
			}
			const message = error instanceof Error ? error.message : 'Unable to initialize the generated form.';
			markFormgenReady(form, false, message);
		} finally {
			formgenControllerPending.delete(form);
		}
	})();
	formgenControllerPending.set(form, task);
	return task;
}

function selectCommand(root: HTMLElement, actionId: string): void {
  selectedActionId = actionId;
	destroyInactiveFormgenControllers(actionId);
  const empty = root.querySelector<HTMLElement>('[data-cmdl-empty]');
  if (empty) {
    empty.hidden = Boolean(actionId);
  }
  root.querySelectorAll<HTMLElement>('[data-cmdl-detail]').forEach((block) => {
    block.hidden = block.dataset.cmdlDetail !== actionId;
  });
  root.querySelectorAll<HTMLElement>('[data-cmdl-item]').forEach((item) => {
    const active = item.dataset.cmdlItem === actionId;
    item.classList.toggle('cmdl-item--active', active);
    item.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  const detail = root.querySelector<HTMLElement>(`[data-cmdl-detail="${attrValueEscape(actionId)}"]`);
  if (detail) {
	const form = detail.querySelector<HTMLElement>('[data-panel-action-form]');
	if (form) void ensureFormgenController(form);
  }
}

function applyFilter(root: HTMLElement, term: string): void {
  const needle = term.trim().toLowerCase();
  let anyVisible = false;
  root.querySelectorAll<HTMLElement>('[data-cmdl-item]').forEach((item) => {
    const haystack = item.dataset.cmdlSearch || '';
    const visible = needle === '' || haystack.includes(needle);
    item.hidden = !visible;
    if (visible) {
      anyVisible = true;
    }
  });
  root.querySelectorAll<HTMLElement>('[data-cmdl-group]').forEach((group) => {
    const hasVisible = Array.from(group.querySelectorAll<HTMLElement>('[data-cmdl-item]')).some((item) => !item.hidden);
    group.hidden = !hasVisible;
  });
  const noresults = root.querySelector<HTMLElement>('[data-cmdl-noresults]');
  if (noresults) {
    noresults.hidden = anyVisible;
  }
}

function visibleItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-cmdl-item]')).filter((item) => !item.hidden);
}

function captureFormDraft(form: HTMLElement): void {
  const actionId = lower(form.dataset.actionId || '');
  if (!actionId) {
    return;
  }
	const controller = controllerSession(form)?.controller;
	const values = controller?.getValues() || collectControllerBridgeValues(form);
	syncControllerPayload(form, values);
	controllerDraft(form, values);
}

// ============================================================================
// Recent & saved invocations (Phase 3 T12) — client-local, defensive storage
// ============================================================================

const RECENT_LIMIT = 6;

function launcherStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readInvocationStore(key: string): Array<Record<string, unknown>> {
  const store = launcherStorage();
  if (!store) {
    return [];
  }
  try {
    const raw = store.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInvocationStore(key: string, value: unknown): void {
  const store = launcherStorage();
  if (!store) {
    return;
  }
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable or over quota — recall is best-effort.
  }
}

function recentKey(commandId: string): string {
  return `cmdl:recent:${commandId}`;
}
function presetKey(commandId: string): string {
  return `cmdl:preset:${commandId}`;
}

// Record a dispatched invocation (its inner field payload) for quick recall.
export function recordCommandLauncherInvocation(envelope: unknown): void {
  const data = envelope && typeof envelope === 'object' ? (envelope as Record<string, unknown>) : {};
  const commandId = str(data.command_id);
  const inner = data.payload && typeof data.payload === 'object' ? (data.payload as Record<string, unknown>) : {};
  if (!commandId || Object.keys(inner).length === 0) {
    return;
  }
  const key = recentKey(commandId);
  const signature = JSON.stringify(inner);
  const existing = readInvocationStore(key).filter((entry) => JSON.stringify(entry.payload) !== signature);
  existing.unshift({ at: Date.now(), payload: inner });
  writeInvocationStore(key, existing.slice(0, RECENT_LIMIT));
}

// Read the active form's inner field payload (skips the suspended JSON editor).
function collectFormPayload(form: HTMLElement): Record<string, unknown> {
	if (panelActionHasSensitiveFields(form)) return {};
	return controllerSession(form)?.controller.getValues() || collectControllerBridgeValues(form);
}

function collectControllerBridgeValues(form: HTMLElement): Record<string, unknown> {
	const bridge = form.querySelector<HTMLInputElement>('[data-cmdl-controller-payload]');
	if (!bridge?.value) {
		return {};
	}
	try {
		const parsed = JSON.parse(bridge.value);
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
	} catch {
		return {};
	}
}

function loadInvocationIntoForm(form: HTMLElement, inner: Record<string, unknown>): void {
	const session = controllerSession(form);
	if (session) {
		session.controller.setValues(inner);
		syncControllerPayload(form, session.controller.getValues());
		controllerDraft(form, session.controller.getValues());
		return;
	}
	const actionId = lower(form.dataset.actionId || '');
	if (actionId && !panelActionHasSensitiveFields(form)) {
		formDrafts.set(actionId, structuredCloneSafe(inner));
	}
	void ensureFormgenController(form);
}

function renderRecallBar(container: HTMLElement): void {
  const commandId = str(container.dataset.cmdlCommand);
  const list = container.querySelector<HTMLElement>('[data-cmdl-recall-list]');
  if (!commandId || !list) {
    return;
  }
  const recents = readInvocationStore(recentKey(commandId));
  const presets = readInvocationStore(presetKey(commandId));
  const chips: string[] = [];
  recents.forEach((_entry, index) => {
    chips.push(`<button type="button" class="cmdl-recall__chip" data-cmdl-load="recent:${index}" title="Reload recent invocation ${index + 1}">↻ recent ${index + 1}</button>`);
  });
  presets.forEach((entry, index) => {
    const name = str(entry.name) || `preset ${index + 1}`;
    chips.push(`<span class="cmdl-recall__preset"><button type="button" class="cmdl-recall__chip cmdl-recall__chip--preset" data-cmdl-load="preset:${index}" title="Load saved preset">★ ${escapeHTML(name)}</button><button type="button" class="cmdl-recall__del" data-cmdl-del-preset="${index}" aria-label="Delete preset ${escapeHTML(name)}">×</button></span>`);
  });
  list.innerHTML = chips.length ? chips.join('') : '<span class="cmdl-recall__empty">No recent runs yet.</span>';
}

function handleRecallAction(target: HTMLElement, root: HTMLElement): boolean {
  const loadBtn = target.closest<HTMLElement>('[data-cmdl-load]');
  if (loadBtn) {
    const form = loadBtn.closest<HTMLElement>('[data-panel-action-form]');
    const container = loadBtn.closest<HTMLElement>('[data-cmdl-recall]');
    const commandId = str(container?.dataset.cmdlCommand);
    const [kind, rawIndex] = (loadBtn.dataset.cmdlLoad || '').split(':');
    const index = Number(rawIndex);
    if (form && commandId && Number.isInteger(index)) {
      const store = readInvocationStore(kind === 'preset' ? presetKey(commandId) : recentKey(commandId));
      const inner = store[index]?.payload;
      if (inner && typeof inner === 'object') {
        loadInvocationIntoForm(form, inner as Record<string, unknown>);
      }
    }
    return true;
  }

  const saveBtn = target.closest<HTMLElement>('[data-cmdl-save-preset]');
  if (saveBtn) {
    const form = saveBtn.closest<HTMLElement>('[data-panel-action-form]');
    const container = saveBtn.closest<HTMLElement>('[data-cmdl-recall]');
    const commandId = str(container?.dataset.cmdlCommand);
    if (form && container && commandId) {
      const name = (typeof window !== 'undefined' && typeof window.prompt === 'function' ? window.prompt('Preset name') : '') || '';
      if (name.trim()) {
        const presets = readInvocationStore(presetKey(commandId)).filter((entry) => str(entry.name) !== name.trim());
        presets.unshift({ name: name.trim(), payload: collectFormPayload(form) });
        writeInvocationStore(presetKey(commandId), presets);
        renderRecallBar(container);
      }
    }
    return true;
  }

  const delBtn = target.closest<HTMLElement>('[data-cmdl-del-preset]');
  if (delBtn) {
    const container = delBtn.closest<HTMLElement>('[data-cmdl-recall]');
    const commandId = str(container?.dataset.cmdlCommand);
    const index = Number(delBtn.dataset.cmdlDelPreset);
    if (container && commandId && Number.isInteger(index)) {
      const presets = readInvocationStore(presetKey(commandId));
      presets.splice(index, 1);
      writeInvocationStore(presetKey(commandId), presets);
      renderRecallBar(container);
    }
    return true;
  }
  return false;
}

// ============================================================================
// JSON ↔ form power mode (Phase 3 T13)
// ============================================================================

function setJsonMode(form: HTMLElement, on: boolean): void {
  if (panelActionHasSensitiveFields(form)) {
    return;
  }
  const fields = form.querySelector<HTMLElement>('[data-cmdl-fields]');
  const jsonBox = form.querySelector<HTMLElement>('[data-cmdl-json]');
  const editor = form.querySelector<HTMLTextAreaElement>('[data-cmdl-json-editor]');
  const toggle = form.querySelector<HTMLElement>('[data-cmdl-json-toggle]');
  const error = form.querySelector<HTMLElement>('[data-cmdl-json-error]');
  if (!fields || !jsonBox || !editor) {
    return;
  }
  if (on) {
    editor.value = JSON.stringify(collectFormPayload(form), null, 2);
    if (error) {
      error.hidden = true;
    }
    fields.hidden = true;
    jsonBox.hidden = false;
    form.dataset.cmdlMode = 'json';
    if (toggle) {
      toggle.textContent = 'Form';
    }
    return;
  }
  // JSON → form: parse and apply; stay in JSON mode on invalid input.
  let parsed: unknown;
  try {
    parsed = editor.value.trim() ? JSON.parse(editor.value) : {};
  } catch (err) {
    if (error) {
      error.textContent = `Invalid JSON: ${(err as Error).message}`;
      error.hidden = false;
    }
    return;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    if (error) {
      error.textContent = 'Payload must be a JSON object.';
      error.hidden = false;
    }
    return;
  }
  loadInvocationIntoForm(form, parsed as Record<string, unknown>);
  fields.hidden = false;
  jsonBox.hidden = true;
  form.dataset.cmdlMode = 'form';
  if (toggle) {
    toggle.textContent = 'JSON';
  }
}

// ============================================================================
// Master-list resize (app-shell splitter)
// ============================================================================

function readStoredSidebarWidth(): number {
  const store = launcherStorage();
  if (!store) {
    return 0;
  }
  try {
    const raw = Number(store.getItem(SIDEBAR_WIDTH_KEY));
    return Number.isFinite(raw) && raw >= SIDEBAR_MIN_PX ? raw : 0;
  } catch {
    return 0;
  }
}

// Upper bound keeps a usable detail column; falls back when layout width is not
// yet measurable (e.g. before first paint or in a headless DOM).
function sidebarMaxWidth(body: HTMLElement): number {
  const available = body.clientWidth || 0;
  return available > 0 ? Math.max(SIDEBAR_MIN_PX, available - DETAIL_MIN_PX) : SIDEBAR_MAX_FALLBACK_PX;
}

function applySidebarWidth(body: HTMLElement, width: number): number {
  const clamped = Math.min(Math.max(Math.round(width), SIDEBAR_MIN_PX), sidebarMaxWidth(body));
  sidebarWidth = clamped;
  body.style.setProperty('--cmdl-sidebar-w', `${clamped}px`);
  const store = launcherStorage();
  if (store) {
    try {
      store.setItem(SIDEBAR_WIDTH_KEY, String(clamped));
    } catch {
      // best-effort persistence
    }
  }
  return clamped;
}

function restoreSidebarWidth(body: HTMLElement): void {
  if (!sidebarWidth) {
    sidebarWidth = readStoredSidebarWidth();
  }
  if (sidebarWidth) {
    body.style.setProperty('--cmdl-sidebar-w', `${sidebarWidth}px`);
  }
}

// The panel re-renders innerHTML on every snapshot, so the splitter is re-wired
// (and the persisted width re-applied) on each attach, like the selection/filter.
function wireSidebarResizer(root: HTMLElement): void {
  const resizer = root.querySelector<HTMLElement>('[data-cmdl-resizer]');
  const body = root.querySelector<HTMLElement>('[data-cmdl-body]');
  if (!resizer || !body) {
    return;
  }
  restoreSidebarWidth(body);

  resizer.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth || SIDEBAR_DEFAULT_PX;
    if (typeof resizer.setPointerCapture === 'function') {
      try { resizer.setPointerCapture(event.pointerId); } catch { /* capture unsupported */ }
    }
    const onMove = (move: PointerEvent) => applySidebarWidth(body, startWidth + (move.clientX - startX));
    const onUp = (up: PointerEvent) => {
      applySidebarWidth(body, startWidth + (up.clientX - startX));
      resizer.removeEventListener('pointermove', onMove);
      resizer.removeEventListener('pointerup', onUp);
      resizer.removeEventListener('pointercancel', onUp);
    };
    resizer.addEventListener('pointermove', onMove);
    resizer.addEventListener('pointerup', onUp);
    resizer.addEventListener('pointercancel', onUp);
  });

  resizer.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const current = sidebarWidth || SIDEBAR_DEFAULT_PX;
    applySidebarWidth(body, current + (event.key === 'ArrowRight' ? SIDEBAR_KEYBOARD_STEP_PX : -SIDEBAR_KEYBOARD_STEP_PX));
  });
}

// ============================================================================
// Inline command confirmation (replaces the native window.confirm dialog)
// ============================================================================

function setConfirmRow(form: HTMLElement, show: boolean): void {
  const main = form.querySelector<HTMLElement>('[data-cmdl-bar-main]');
  const confirmRow = form.querySelector<HTMLElement>('[data-cmdl-confirm-row]');
  if (!main || !confirmRow) {
    return;
  }
  main.hidden = show;
  confirmRow.hidden = !show;
  const focusTarget = show
    ? confirmRow.querySelector<HTMLElement>('[data-cmdl-confirm-run]')
    : main.querySelector<HTMLElement>('button');
  if (focusTarget && typeof focusTarget.focus === 'function') {
    try { focusTarget.focus(); } catch { /* focus best-effort */ }
  }
}

export function attachCommandLauncherListeners(container: HTMLElement, options: { debugPath?: string } = {}): void {
  const root = container.querySelector<HTMLElement>('[data-cmdl-root]');
  if (!root) {
    return;
  }
	destroyFormgenControllers();
  root.dataset.cmdlDebugPath = str(options.debugPath);
  // Re-apply the persisted master-list width and re-wire the resize handle.
  wireSidebarResizer(root);

  // Populate recent/preset recall bars from client-local storage.
  root.querySelectorAll<HTMLElement>('[data-cmdl-recall]').forEach((bar) => renderRecallBar(bar));

  // Restore filter text and the previously selected command across re-renders.
  const filter = root.querySelector<HTMLInputElement>('[data-cmdl-filter]');
  if (filter && filterText) {
    filter.value = filterText;
    applyFilter(root, filterText);
  }
  if (selectedActionId && root.querySelector(`[data-cmdl-item="${attrValueEscape(selectedActionId)}"]`)) {
    selectCommand(root, selectedActionId);
  }

  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    // Recent/preset recall + JSON power-mode toggle (Phase 3 T12/T13).
    if (handleRecallAction(target, root)) {
      return;
    }
    const jsonToggle = target.closest<HTMLElement>('[data-cmdl-json-toggle]');
    if (jsonToggle) {
      const form = jsonToggle.closest<HTMLElement>('[data-panel-action-form]');
      if (form) {
        setJsonMode(form, form.dataset.cmdlMode !== 'json');
      }
      return;
    }

    // Inline confirmation: arm the form so the submit gate lets this dispatch
    // through. Do NOT preventDefault — the button is type=submit and the native
    // submit must proceed to the host dispatcher.
    const confirmRun = target.closest<HTMLElement>('[data-cmdl-confirm-run]');
    if (confirmRun) {
      const form = confirmRun.closest<HTMLElement>('[data-panel-action-form]');
      if (form) {
        form.dataset.cmdlArmed = 'true';
      }
      return;
    }
    const cancelConfirm = target.closest<HTMLElement>('[data-cmdl-cancel]');
    if (cancelConfirm) {
      const form = cancelConfirm.closest<HTMLElement>('[data-panel-action-form]');
      if (form) {
        delete form.dataset.cmdlArmed;
        setConfirmRow(form, false);
      }
      return;
    }

    const item = target.closest<HTMLElement>('[data-cmdl-item]');
    if (item) {
      selectCommand(root, item.dataset.cmdlItem || '');
      return;
    }

  });

  if (filter) {
    filter.addEventListener('input', () => {
      filterText = filter.value;
      applyFilter(root, filter.value);
    });
    filter.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        const first = visibleItems(root)[0];
        if (first) {
          event.preventDefault();
          if (event.key === 'Enter') {
            selectCommand(root, first.dataset.cmdlItem || '');
          } else {
            first.focus();
          }
        }
      }
    });
  }

  // Capture phase runs before the form's own bubble-phase submit handler (the
  // host dispatcher), so this is where the launcher gates and prepares a submit.
  root.addEventListener('submit', (event) => {
    const target = event.target as HTMLElement | null;
    const form = target?.closest<HTMLElement>('[data-panel-action-form]');
    if (!form) {
      return;
    }
	if (form.dataset.cmdlFormgenReady !== 'true') {
		event.preventDefault();
		event.stopImmediatePropagation();
		void ensureFormgenController(form);
		return;
	}
    // Inline confirmation gate: the first submit of a confirm-required command
    // reveals the Confirm/Cancel row instead of dispatching. Pressing Enter in a
    // field reaches this same path, so the confirmation cannot be bypassed.
    if (form.dataset.cmdlConfirm === 'true' && form.dataset.cmdlArmed !== 'true') {
      event.preventDefault();
      event.stopImmediatePropagation();
      setConfirmRow(form, true);
      return;
    }
    // Armed (or no confirmation needed): snapshot the draft, then let the host
    // dispatch. Reset the inline confirm UI so a later
    // run on the same (un-refreshed) form re-confirms.
    captureFormDraft(form);
    if (form.dataset.cmdlConfirm === 'true') {
      delete form.dataset.cmdlArmed;
      setConfirmRow(form, false);
    }
  }, true);

  root.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;

    const item = target.closest<HTMLElement>('[data-cmdl-item]');
    if (item && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const items = visibleItems(root);
      const index = items.indexOf(item);
      const next = items[event.key === 'ArrowDown' ? index + 1 : index - 1];
      if (next) {
        next.focus();
      } else if (event.key === 'ArrowUp' && filter) {
        filter.focus();
      }
      return;
    }
    if (item && event.key === 'Enter') {
      event.preventDefault();
      selectCommand(root, item.dataset.cmdlItem || '');
    }
  });

  // After a native form reset, drop the saved draft and re-sync the controller.
  root.addEventListener('reset', (event) => {
    const form = event.target as HTMLElement;
    const actionId = lower(form.dataset.actionId || '');
    if (actionId) {
      formDrafts.delete(actionId);
    }
    window.setTimeout(() => {
		const session = controllerSession(form);
		if (session) {
			session.controller.reset();
			const values = session.controller.getValues();
			syncControllerPayload(form, values);
			controllerDraft(form, values);
		}
    }, 0);
  });
}

// Escape a value for use inside a double-quoted attribute selector. CSS.escape
// targets identifier context and would corrupt quoted values such as `cmd:foo`,
// so only backslashes and double quotes need escaping here.
function attrValueEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

// Register the console override for the command launcher panel. Importing this
// module (the console bundle does, via debug-panel) wires the override before
// server panel hydration runs.
registerServerPanelConsoleRenderer(COMMAND_LAUNCHER_PANEL_ID, renderCommandLauncherConsole);
