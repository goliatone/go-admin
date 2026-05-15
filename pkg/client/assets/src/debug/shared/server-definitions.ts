import { renderSchemaPanelView } from './panels/schema.js';
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

const SUPPORTED_RENDERERS = new Set(['metrics', 'key_value', 'table', 'status_list', 'timeline', 'json', 'stack']);
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
  degradedReason?: string | null
): string {
  let body = '';
  if (view && isSupportedView(view)) {
    body = renderSchemaPanelView(serverDef, view, data, styles, useIconCopyButton);
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
  const actions = serverDef.ui?.actions || [];
  if (!panelID || actions.length === 0) {
    return '';
  }
  return `
    <div class="${styles.panelControls}">
      ${actions.map((action) => {
        const actionID = normalizeID(action.id);
        if (!actionID) {
          return '';
        }
        const payload = action.payload ? escapeHTML(JSON.stringify(action.payload)).replace(/'/g, '&#39;') : '';
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
          >${escapeHTML(normalizeText(action.label) || actionID)}</button>
        `;
      }).join('')}
    </div>
  `;
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
    render: (data, styles) => renderServerPanelView(renderDef, ui?.views?.console || ui?.views?.toolbar, data, styles, true, degradedReason),
    renderConsole: (data, styles) => renderServerPanelView(renderDef, ui?.views?.console || ui?.views?.toolbar, data, styles, true, degradedReason),
    renderToolbar: (data, styles) => renderServerPanelView(renderDef, ui?.views?.toolbar || ui?.views?.console, data, styles, false, degradedReason),
    showFilters: Boolean(ui?.filters?.length),
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
    const response = await fetch(`${base}/api/panels`, {
      credentials: 'same-origin',
      signal: controller?.signal,
    });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as ServerPanelDefinitionsResponse;
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
