import {
  renderSchemaPanelView,
  isSchemaListRenderer,
  renderSchemaListRow,
  schemaRowKey,
} from './panels/schema.js';
import {
  defaultGetCount,
  defaultHandleEvent,
  panelRegistry,
  type PanelDefinition,
} from './panel-registry.js';
import type { StyleConfig } from './styles.js';
import type {
  ServerPanelDefinition,
  ServerPanelDefinitionsResponse,
  ServerPanelUI,
  ServerPanelUIView,
} from './types.js';
import { escapeHTML } from './utils.js';
import { httpRequest, readExpectedHTTPJSON } from '../../shared/transport/http-client.js';
import {
  attachCommandRunsInteractions,
  commandRunKey,
  commandRunRevision,
  commandRunsEvicted,
  commandRunTerminal,
  renderCommandRunRow,
  renderCommandRunsPanel,
  restoreCommandRunsInteractions,
} from './panels/command-runs.js';

const SUPPORTED_RENDERERS = new Set(['metrics', 'key_value', 'identity', 'table', 'status_list', 'timeline', 'json', 'stack']);
const SUPPORTED_SCHEMA_VERSION = '1';
const PANEL_DEFINITION_FETCH_TIMEOUT_MS = 3000;
const hydrationPromises = new Map<string, Promise<number>>();

function normalizeDebugPath(debugPath: string): string {
  const trimmed = (debugPath || '').trim().replace(/\/+$/g, '');
  return trimmed || '/admin/debug';
}

function normalizeID(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEventTypes(value: unknown, fallback: string): string[] {
  if (!Array.isArray(value)) {
    return fallback ? [fallback] : [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  value.forEach((item) => {
    const normalized = normalizeID(item);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  });
  return out.length > 0 ? out : fallback ? [fallback] : [];
}

function isSupportedView(view: ServerPanelUIView | undefined): boolean {
  const renderer = normalizeID(view?.renderer);
  return renderer !== '' && SUPPORTED_RENDERERS.has(renderer);
}

function unsupportedUIReason(ui: ServerPanelUI | undefined): string | null {
  if (!ui || typeof ui !== 'object') {
    return null;
  }
  const schemaVersion = normalizeText(ui.schema_version);
  if (schemaVersion !== '' && schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    return `Unsupported panel UI schema version "${schemaVersion}". Rendering JSON fallback.`;
  }
  if (!isSupportedView(ui.views?.console) && !isSupportedView(ui.views?.toolbar)) {
    return 'Panel UI schema does not declare a supported renderer. Rendering JSON fallback.';
  }
  return null;
}

function isSupportedUI(ui: ServerPanelUI | undefined): boolean {
  if (!ui || typeof ui !== 'object') {
    return false;
  }
  if (unsupportedUIReason(ui) !== null) {
    return false;
  }
  return isSupportedView(ui.views?.console) || isSupportedView(ui.views?.toolbar);
}

function getPathValue(data: unknown, bind: string | undefined): unknown {
  const path = normalizeText(bind).replace(/^\$\./, '');
  if (!path) {
    return data;
  }
  return path.split('.').filter(Boolean).reduce<unknown>((current, part) => {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    return (current as Record<string, unknown>)[part];
  }, data);
}

function getViewData(data: unknown, view: ServerPanelUIView | undefined): unknown {
  if (!view) {
    return data;
  }
  return getPathValue(data, view.bind);
}

function getCountForPolicy(data: unknown, ui: ServerPanelUI | undefined): number {
  const policy = ui?.count;
  const value = getPathValue(data, policy?.bind);
  switch (normalizeID(policy?.mode)) {
    case 'object_keys':
      return value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).length : 0;
    case 'truthy':
      return value ? 1 : 0;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    case 'array_length':
      return Array.isArray(value) ? value.length : 0;
    default:
      return defaultGetCount(value);
  }
}

function applyEventPolicy(currentData: unknown, eventPayload: unknown, ui: ServerPanelUI | undefined): unknown {
  const policy = ui?.events;
  const mode = normalizeID(policy?.mode);
  const maxEntries = typeof policy?.max_entries === 'number' ? policy.max_entries : 500;
  const payload = getPathValue(eventPayload, policy?.bind);

  if (mode === 'append') {
    const next = Array.isArray(currentData) ? [...currentData, payload] : [payload];
    return maxEntries > 0 ? next.slice(-maxEntries) : next;
  }
  if (mode === 'merge') {
    if (currentData && typeof currentData === 'object' && payload && typeof payload === 'object') {
      return { ...(currentData as Record<string, unknown>), ...(payload as Record<string, unknown>) };
    }
    return payload;
  }
  if (mode === 'upsert') {
    const key = normalizeText(policy?.key);
    if (!key || !Array.isArray(currentData) || !payload || typeof payload !== 'object') {
      return defaultHandleEvent(currentData, payload, maxEntries);
    }
    const payloadKey = getPathValue(payload, key);
    const next = [...currentData];
    const index = next.findIndex((item) => getPathValue(item, key) === payloadKey);
    if (index >= 0) {
      const existing = next[index];
      const incomingRevision = Number(getPathValue(payload, 'revision') || 0);
      const existingRevision = Number(getPathValue(existing, 'revision') || 0);
      const existingPhase = normalizeID(getPathValue(existing, 'phase'));
      const incomingPhase = normalizeID(getPathValue(payload, 'phase'));
      const terminal = new Set(['succeeded', 'failed', 'canceled', 'rejected']);
      if (incomingRevision > 0 && existingRevision > 0 && incomingRevision <= existingRevision) return next;
      if (terminal.has(existingPhase) && !terminal.has(incomingPhase)) return next;
      next[index] = payload;
    } else {
      next.push(payload);
    }
    return maxEntries > 0 ? next.slice(-maxEntries) : next;
  }
  return payload;
}

function defaultFilterState(ui: ServerPanelUI | undefined): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  (ui?.filters || []).forEach((filter) => {
    const id = normalizeID(filter.id);
    if (!id) {
      return;
    }
    state[id] = normalizeID(filter.kind) === 'checkbox' ? false : '';
  });
  return state;
}

function renderFilterControls(ui: ServerPanelUI | undefined, state: unknown): string {
  const current = state && typeof state === 'object' ? state as Record<string, unknown> : {};
  const filters = ui?.filters || [];
  if (filters.length === 0) {
    return '';
  }
  return filters.map((filter) => {
    const id = normalizeID(filter.id);
    const kind = normalizeID(filter.kind);
    if (!id) {
      return '';
    }
    const label = normalizeText(filter.label) || id;
    const value = current[id];
    if (kind === 'select') {
      const options = Array.isArray(filter.options) ? filter.options : [];
      return `
        <div class="debug-filter">
          <label>${escapeHTML(label)}</label>
          <select data-filter="${escapeHTML(id)}">
            <option value="">All</option>
            ${options.map((option) => {
              const optionValue = normalizeText(option);
              return `<option value="${escapeHTML(optionValue)}" ${value === optionValue ? 'selected' : ''}>${escapeHTML(optionValue)}</option>`;
            }).join('')}
          </select>
        </div>
      `;
    }
    if (kind === 'checkbox') {
      return `
        <label class="debug-btn">
          <input type="checkbox" data-filter="${escapeHTML(id)}" ${value ? 'checked' : ''} />
          <span>${escapeHTML(label)}</span>
        </label>
      `;
    }
    return `
      <div class="debug-filter debug-filter--grow">
        <label>${escapeHTML(label)}</label>
        <input type="search" data-filter="${escapeHTML(id)}" value="${escapeHTML(textValue(value))}" />
      </div>
    `;
  }).join('');
}

function textValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function rowMatchesFilter(row: unknown, filter: NonNullable<ServerPanelUI['filters']>[number], value: unknown): boolean {
  const kind = normalizeID(filter.kind);
  const bindValue = getPathValue(row, filter.bind);
  if (kind === 'checkbox') {
    return value ? Boolean(bindValue) : true;
  }
  const expected = textValue(value).trim();
  if (!expected) {
    return true;
  }
  const actual = textValue(bindValue || row).toLowerCase();
  if (kind === 'select') {
    return textValue(bindValue).toLowerCase() === expected.toLowerCase();
  }
  return actual.includes(expected.toLowerCase());
}

function applyDeclaredFilters(data: unknown, state: unknown, ui: ServerPanelUI | undefined): unknown {
  const filters = ui?.filters || [];
  if (filters.length === 0 || !state || typeof state !== 'object') {
    return data;
  }
  const current = state as Record<string, unknown>;
  if (Array.isArray(data)) {
    return data.filter((row) => filters.every((filter) => rowMatchesFilter(row, filter, current[normalizeID(filter.id)])));
  }
  if (data && typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>).filter(([key, value]) => {
      const row = { key, value };
      return filters.every((filter) => rowMatchesFilter(row, filter, current[normalizeID(filter.id)]));
    });
    return Object.fromEntries(entries);
  }
  return data;
}

function renderServerPanelView(
  serverDef: ServerPanelDefinition,
  view: ServerPanelUIView | undefined,
  data: unknown,
  styles: StyleConfig,
  useIconCopyButton: boolean,
  degradedReason?: string | null,
  newestFirst = false
): string {
  let body = '';
  if (view && isSupportedView(view)) {
    body = renderSchemaPanelView(serverDef, view, data, styles, useIconCopyButton, newestFirst);
  } else {
    body = renderSchemaPanelView(
      serverDef,
      { renderer: 'json', title: normalizeText(serverDef.label) || normalizeID(serverDef.id) || 'Panel' },
      getViewData(data, view),
      styles,
      useIconCopyButton
    );
  }
  return `${renderPanelActionControls(serverDef, styles)}${renderDegradedNotice(serverDef, styles, degradedReason)}${body}<div data-panel-action-result="${escapeHTML(normalizeID(serverDef.id))}"></div>`;
}

function renderDegradedNotice(
  serverDef: ServerPanelDefinition,
  styles: StyleConfig,
  reason?: string | null
): string {
  if (!reason) {
    return '';
  }
  const panelID = normalizeID(serverDef.id);
  return `<div class="${styles.emptyState}" data-panel-degraded="${escapeHTML(panelID)}"><strong>Panel UI degraded.</strong> ${escapeHTML(reason)}</div>`;
}

function renderPanelActionControls(serverDef: ServerPanelDefinition, styles: StyleConfig): string {
  const panelID = normalizeID(serverDef.id);
  const actions = (serverDef.ui?.actions || []).filter((action) => action.hidden !== true);
  if (!panelID || actions.length === 0) {
    return '';
  }
  const layoutMode = normalizeID(serverDef.ui?.action_layout?.mode) || 'list';
  if (layoutMode === 'select') {
    const pickerLabel = normalizeText(serverDef.ui?.action_layout?.picker_label) || 'Action';
    const emptyText = normalizeText(serverDef.ui?.action_layout?.empty_text) || 'Select an action to continue.';
    return `
      <div class="${styles.panelControls}" data-panel-action-launcher="${escapeHTML(panelID)}" style="display:flex;flex-direction:column;gap:0.75rem;align-items:stretch">
        <div class="debug-filter debug-filter--grow">
          <label>${escapeHTML(pickerLabel)}</label>
          <select data-panel-action-picker="${escapeHTML(panelID)}">
            <option value="">${escapeHTML(emptyText)}</option>
            ${actions.map((action) => {
              const actionID = normalizeID(action.id);
              const label = normalizeText(action.label) || actionID;
              return actionID ? `<option value="${escapeHTML(actionID)}">${escapeHTML(label)}</option>` : '';
            }).join('')}
          </select>
        </div>
        ${actions.map((action) => {
          const actionID = normalizeID(action.id);
          if (!actionID) {
            return '';
          }
          return `<div data-panel-action-choice="${escapeHTML(actionID)}" hidden>${renderPanelActionControl(panelID, actionID, action, styles)}</div>`;
        }).join('')}
      </div>
    `;
  }
  return `
    <div class="${styles.panelControls}">
      ${actions.map((action) => {
        const actionID = normalizeID(action.id);
        if (!actionID) {
          return '';
        }
        return renderPanelActionControl(panelID, actionID, action, styles);
      }).join('')}
    </div>
  `;
}

function renderPanelActionControl(
  panelID: string,
  actionID: string,
  action: NonNullable<ServerPanelUI['actions']>[number],
  styles: StyleConfig
): string {
  const payload = renderActionPayload(action.payload);
  const fields = Array.isArray(action.fields) ? action.fields : [];
  const submitLabel = normalizeText(action.submit_label) || normalizeText(action.label) || actionID;
  if (fields.length > 0) {
    return `
      <form
        data-panel-action-form
        data-panel-id="${escapeHTML(panelID)}"
        data-action-id="${escapeHTML(actionID)}"
        data-action-confirm="${escapeHTML(normalizeText(action.confirm_text))}"
        data-action-requires-confirm="${action.requires_confirm ? 'true' : 'false'}"
        data-action-payload='${payload}'
        style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:flex-end"
      >
        ${fields.map((field, index) => renderPanelActionField(panelID, actionID, field, index)).join('')}
        <button type="submit" class="${styles.sortToggle}">${escapeHTML(submitLabel)}</button>
      </form>
    `;
  }
  return `
    <button
      type="button"
      class="${styles.sortToggle}"
      data-panel-action
      data-panel-id="${escapeHTML(panelID)}"
      data-action-id="${escapeHTML(actionID)}"
      data-action-confirm="${escapeHTML(normalizeText(action.confirm_text))}"
      data-action-requires-confirm="${action.requires_confirm ? 'true' : 'false'}"
      data-action-payload='${payload}'
    >${escapeHTML(submitLabel)}</button>
  `;
}

function renderActionPayload(payload: Record<string, unknown> | undefined): string {
  if (!payload) {
    return '';
  }
  return escapeHTML(JSON.stringify(payload)).replace(/'/g, '&#39;');
}

function renderPanelActionField(
  panelID: string,
  actionID: string,
  field: NonNullable<NonNullable<ServerPanelUI['actions']>[number]['fields']>[number],
  index: number
): string {
  const name = normalizeID(field.name);
  if (!name) {
    return '';
  }
  const kind = normalizeID(field.kind) || 'text';
  const label = normalizeText(field.label) || name;
  const fieldID = `debug-action-${panelID}-${actionID}-${name}-${index}`;
  const payloadPath = normalizeText(field.payload_path) || name;
  const required = field.required ? ' required' : '';
  const placeholder = normalizeText(field.placeholder);
  const placeholderAttr = placeholder ? ` placeholder="${escapeHTML(placeholder)}"` : '';
  const description = normalizeText(field.description);
  const help = normalizeText(field.help);
  const sensitive = field.sensitive === true;
  const baseAttrs = `id="${escapeHTML(fieldID)}" data-action-field="${escapeHTML(name)}" data-action-field-kind="${escapeHTML(kind)}" data-action-field-path="${escapeHTML(payloadPath)}"${sensitive ? ' data-action-field-sensitive="true"' : ''}${required}`;
  const options = Array.isArray(field.options) ? field.options.map((option) => normalizeText(option)).filter(Boolean) : [];
  const optionItems = Array.isArray(field.option_items)
    ? field.option_items
      .map((option) => ({
        value: normalizeText(option?.value),
        label: normalizeText(option?.label) || normalizeText(option?.value),
        disabled: option?.disabled === true,
      }))
      .filter((option) => option.value)
    : [];
  let control = '';
  if (sensitive) {
    control = `<input type="password" ${baseAttrs}${placeholderAttr} autocomplete="new-password" spellcheck="false">`;
  } else if (kind === 'boolean' || kind === 'checkbox') {
    control = `<input type="checkbox" ${baseAttrs}>`;
  } else if (kind === 'select' || optionItems.length > 0 || options.length > 0) {
    const renderedOptions = optionItems.length > 0
      ? optionItems.map((option) => `<option value="${escapeHTML(option.value)}"${option.disabled ? ' disabled' : ''}>${escapeHTML(option.label)}</option>`).join('')
      : options.map((option) => `<option value="${escapeHTML(option)}">${escapeHTML(option)}</option>`).join('');
    control = `<select ${baseAttrs}><option value=""></option>${renderedOptions}</select>`;
  } else if (kind === 'number' || kind === 'integer') {
    control = `<input type="number" ${baseAttrs}${placeholderAttr}>`;
  } else if (kind === 'textarea' || kind === 'json' || kind === 'string_list') {
    control = `<textarea ${baseAttrs}${placeholderAttr} rows="2"></textarea>`;
  } else {
    control = `<input type="text" ${baseAttrs}${placeholderAttr}>`;
  }
  return `
    <label for="${escapeHTML(fieldID)}" style="display:flex;flex-direction:column;gap:0.25rem;font-size:0.8125rem">
      <span>${escapeHTML(label)}</span>
      ${control}
      <small
        data-action-field-error="${escapeHTML(payloadPath)}"
        data-action-field-name="${escapeHTML(name)}"
        data-action-id="${escapeHTML(actionID)}"
        hidden
      ></small>
      ${description ? `<small>${escapeHTML(description)}</small>` : ''}
      ${help && help !== description ? `<small>${escapeHTML(help)}</small>` : ''}
    </label>
  `;
}

/**
 * Context handed to a custom console renderer override.
 * `def` is the validated server definition (including `ui.actions`), `data` is
 * the live snapshot payload for the panel.
 */
export type ServerPanelConsoleRendererContext = {
  def: ServerPanelDefinition;
  data: unknown;
  styles: StyleConfig;
  useIconCopyButton: boolean;
};

export type ServerPanelConsoleRenderer = (ctx: ServerPanelConsoleRendererContext) => string;

const serverPanelConsoleRenderers = new Map<string, ServerPanelConsoleRenderer>();

/**
 * Register a bespoke console renderer for a specific server panel id.
 *
 * The override only replaces the full debug-console render for that panel; the
 * toolbar continues to use the generic schema renderer, and every other panel
 * is untouched. The override still receives the validated `ui` (with its action
 * contract) so it can emit the existing `data-panel-action-*` form markup and
 * reuse the shared dispatch wiring.
 */
export function registerServerPanelConsoleRenderer(panelID: string, renderer: ServerPanelConsoleRenderer): void {
  const id = normalizeID(panelID);
  if (id && typeof renderer === 'function') {
    serverPanelConsoleRenderers.set(id, renderer);
  }
}

export function panelDefinitionFromServer(serverDef: ServerPanelDefinition): PanelDefinition | null {
  const id = normalizeID(serverDef.id);
  if (!id) {
    return null;
  }
  const label = normalizeText(serverDef.label) || id;
  const snapshotKey = normalizeID(serverDef.snapshot_key) || id;
  const degradedReason = unsupportedUIReason(serverDef.ui);
  const ui = degradedReason === null && isSupportedUI(serverDef.ui) ? serverDef.ui : undefined;
  const renderDef = ui ? serverDef : { ...serverDef, ui: undefined };
  const commandRunsOverride: ServerPanelConsoleRenderer | undefined = id === 'command_runs' && ui
    ? ({ data, styles }) => renderCommandRunsPanel(data, styles)
    : undefined;
  const consoleOverride = commandRunsOverride || (ui ? serverPanelConsoleRenderers.get(id) : undefined);
  const renderConsoleOverride = consoleOverride
    ? (data: unknown, styles: StyleConfig) => consoleOverride({ def: renderDef, data, styles, useIconCopyButton: true })
    : undefined;

  // Opt single-list append panels into incremental ("live list") rendering. The
  // schema list renderers emit `[data-live-list]` + keyed rows, so the host can
  // append/evict individual rows instead of rebuilding the whole table. Only
  // `append` is auto-wired; `upsert`/`merge`/`stack` stay on full render.
  const primaryView = ui?.views?.console || ui?.views?.toolbar;
  // A `table` view without declared columns derives its columns from the first
  // row at full-render time; a per-row incremental append cannot reproduce that
  // (it would derive columns from each item), so only opt such tables in when
  // columns are declared. status_list/timeline use fixed bindings and are safe.
  const tableColumnsOk = normalizeID(primaryView?.renderer) !== 'table'
    || (Array.isArray(primaryView?.options?.columns) && primaryView.options.columns.length > 0);
  // Single source of truth for sort direction across the FULL render (baked into
  // the render closures below) and the INCREMENTAL append (carried on
  // `liveList.newestFirst`). Schema panels currently render in chronological
  // array order (newest last), so this is `false`; an event policy can opt into
  // newest-first and both paths flip together — they can never diverge.
  const liveNewestFirst = normalizeID(ui?.events?.order) === 'newest_first';
  const eventMode = normalizeID(ui?.events?.mode);
  const liveList = ui && primaryView && eventMode === 'append'
    && isSchemaListRenderer(primaryView.renderer) && tableColumnsOk
    ? {
        renderRow: (item: unknown, styles: StyleConfig) =>
          renderSchemaListRow(primaryView.renderer, item, primaryView, styles),
        keyOf: (item: unknown) => schemaRowKey(item, primaryView.options?.key_bind),
        getMaxEntries: () =>
          typeof ui.events?.max_entries === 'number' ? ui.events.max_entries : 500,
        newestFirst: liveNewestFirst,
      }
    : undefined;
  const commandRunsLiveList = ui && id === 'command_runs' && eventMode === 'upsert'
    ? {
        updateMode: 'upsert' as const,
        renderRow: (item: unknown, styles: StyleConfig) => renderCommandRunRow(item, styles),
        keyOf: commandRunKey,
        revisionOf: commandRunRevision,
        terminalOf: commandRunTerminal,
        getMaxEntries: () => typeof ui.events?.max_entries === 'number' ? ui.events.max_entries : 500,
        newestFirst: liveNewestFirst,
        onAdopt: attachCommandRunsInteractions,
        onRestore: restoreCommandRunsInteractions,
        onEvict: commandRunsEvicted,
      }
    : undefined;

  return {
    id,
    label,
    icon: normalizeText(serverDef.icon) || undefined,
    snapshotKey,
    eventTypes: normalizeEventTypes(serverDef.event_types, snapshotKey),
    supportsToolbar: serverDef.supports_toolbar !== false,
    category: normalizeText(serverDef.category) || 'custom',
    order: typeof serverDef.order === 'number' ? serverDef.order : 100,
    getCount: ui?.count ? (data) => getCountForPolicy(data, ui) : undefined,
    handleEvent: ui?.events ? (current, payload) => applyEventPolicy(current, payload, ui) : undefined,
    renderFilters: ui?.filters?.length ? (state) => renderFilterControls(ui, state) : undefined,
    defaultFilters: ui?.filters?.length ? defaultFilterState(ui) : undefined,
    applyFilters: ui?.filters?.length ? (data, state) => applyDeclaredFilters(data, state, ui) : undefined,
    render: renderConsoleOverride || ((data, styles) => renderServerPanelView(renderDef, ui?.views?.console || ui?.views?.toolbar, data, styles, true, degradedReason, liveNewestFirst)),
    renderConsole: renderConsoleOverride || ((data, styles) => renderServerPanelView(renderDef, ui?.views?.console || ui?.views?.toolbar, data, styles, true, degradedReason, liveNewestFirst)),
    renderToolbar: (data, styles) => renderServerPanelView(renderDef, ui?.views?.toolbar || ui?.views?.console, data, styles, false, degradedReason, liveNewestFirst),
    // Custom console panels own their own filtering, so the generic object-key
    // search must not be applied to their structured snapshot payload.
    showFilters: consoleOverride && id !== 'command_runs' ? false : Boolean(ui?.filters?.length),
    liveList: commandRunsLiveList || liveList,
  };
}

export async function fetchServerPanelDefinitions(
  debugPath: string,
  timeoutMs = PANEL_DEFINITION_FETCH_TIMEOUT_MS
): Promise<ServerPanelDefinition[]> {
  let timeoutID: ReturnType<typeof setTimeout> | undefined;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  try {
    const base = normalizeDebugPath(debugPath);
    if (controller && timeoutMs > 0) {
      timeoutID = setTimeout(() => controller.abort(), timeoutMs);
    }
    const response = await httpRequest(`${base}/api/panels`, {
      credentials: 'same-origin',
      signal: controller?.signal,
    });
    if (!response.ok) {
      return [];
    }
    const payload = await readExpectedHTTPJSON<ServerPanelDefinitionsResponse>(response);
    return Array.isArray(payload.panels) ? payload.panels : [];
  } catch {
    return [];
  } finally {
    if (timeoutID !== undefined) {
      clearTimeout(timeoutID);
    }
  }
}

export async function hydrateServerPanelDefinitions(debugPath: string): Promise<number> {
  const base = normalizeDebugPath(debugPath);
  const existing = hydrationPromises.get(base);
  if (existing) {
    return existing;
  }

  const promise = fetchServerPanelDefinitions(base).then((defs) => {
    let registered = 0;
    defs.forEach((def) => {
      const panel = panelDefinitionFromServer(def);
      if (panel && panelRegistry.registerServerDefinition(panel)) {
        registered += 1;
      }
    });
    return registered;
  });
  hydrationPromises.set(base, promise);
  return promise;
}
