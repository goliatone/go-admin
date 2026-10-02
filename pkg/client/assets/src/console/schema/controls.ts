// Declarative filters, count/event policies and typed action controls derived
// from a server panel schema. Rendering is escaped; actions only post through
// the host's resolved action route.

import { blockPrefix, type StyleConfig } from '../style-config.js';
import type {
  PanelOptions,
  ServerPanelDefinition,
  ServerPanelUI,
  ServerPanelUIAction,
  ServerPanelUIActionField,
  ServerPanelUIView,
} from '../types.js';
import { escapeHTML, pathValue as getPathValue } from '../format.js';
import { defaultGetCount, defaultHandleEvent } from '../registry.js';
import { renderSchemaPanelView } from './views.js';

const SUPPORTED_RENDERERS = new Set(['metrics', 'key_value', 'identity', 'table', 'status_list', 'timeline', 'json', 'stack']);
const SUPPORTED_SCHEMA_VERSION = '1';

export function normalizeSchemaID(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function normalizeSchemaText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isSupportedView(view: ServerPanelUIView | undefined): boolean {
  const renderer = normalizeSchemaID(view?.renderer);
  return renderer !== '' && SUPPORTED_RENDERERS.has(renderer);
}

/** Reason a declared UI cannot render, or null when it is usable. */
export function unsupportedUIReason(ui: ServerPanelUI | undefined): string | null {
  if (!ui || typeof ui !== 'object') {
    return null;
  }
  const schemaVersion = normalizeSchemaText(ui.schema_version);
  if (schemaVersion !== '' && schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    return `Unsupported panel UI schema version "${schemaVersion}". Rendering JSON fallback.`;
  }
  if (!isSupportedView(ui.views?.console) && !isSupportedView(ui.views?.toolbar)) {
    return 'Panel UI schema does not declare a supported renderer. Rendering JSON fallback.';
  }
  return null;
}

export function isSupportedUI(ui: ServerPanelUI | undefined): boolean {
  if (!ui || typeof ui !== 'object') {
    return false;
  }
  if (unsupportedUIReason(ui) !== null) {
    return false;
  }
  return isSupportedView(ui.views?.console) || isSupportedView(ui.views?.toolbar);
}

function getViewData(data: unknown, view: ServerPanelUIView | undefined): unknown {
  if (!view) {
    return data;
  }
  return getPathValue(data, view.bind);
}

export function getCountForPolicy(data: unknown, ui: ServerPanelUI | undefined): number {
  const policy = ui?.count;
  const value = getPathValue(data, policy?.bind);
  switch (normalizeSchemaID(policy?.mode)) {
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

export function applyEventPolicy(currentData: unknown, eventPayload: unknown, ui: ServerPanelUI | undefined): unknown {
  const policy = ui?.events;
  const mode = normalizeSchemaID(policy?.mode);
  const maxEntries = typeof policy?.max_entries === 'number' ? policy.max_entries : 500;
  const payload = getPathValue(eventPayload, policy?.bind);

  if (mode === 'append') {
    return capEntries(Array.isArray(currentData) ? [...currentData, payload] : [payload], maxEntries);
  }
  if (mode === 'merge') {
    return mergeEventPayload(currentData, payload);
  }
  if (mode === 'upsert') {
    return upsertEventPayload(currentData, payload, normalizeSchemaText(policy?.key), maxEntries);
  }
  return payload;
}

const TERMINAL_PHASES = new Set(['succeeded', 'failed', 'canceled', 'rejected']);

function capEntries(entries: unknown[], maxEntries: number): unknown[] {
  return maxEntries > 0 ? entries.slice(-maxEntries) : entries;
}

function mergeEventPayload(currentData: unknown, payload: unknown): unknown {
  if (currentData && typeof currentData === 'object' && payload && typeof payload === 'object') {
    return { ...(currentData as Record<string, unknown>), ...(payload as Record<string, unknown>) };
  }
  return payload;
}

/** An older revision or a non-terminal update of a terminal row never wins. */
function upsertSuperseded(existing: unknown, payload: unknown): boolean {
  const incomingRevision = Number(getPathValue(payload, 'revision') || 0);
  const existingRevision = Number(getPathValue(existing, 'revision') || 0);
  if (incomingRevision > 0 && existingRevision > 0 && incomingRevision <= existingRevision) return true;
  const existingPhase = normalizeSchemaID(getPathValue(existing, 'phase'));
  const incomingPhase = normalizeSchemaID(getPathValue(payload, 'phase'));
  return TERMINAL_PHASES.has(existingPhase) && !TERMINAL_PHASES.has(incomingPhase);
}

function upsertEventPayload(currentData: unknown, payload: unknown, key: string, maxEntries: number): unknown {
  if (!key || !payload || typeof payload !== 'object') {
    return defaultHandleEvent(currentData, payload, maxEntries);
  }
  const payloadKey = getPathValue(payload, key);
  const next = Array.isArray(currentData) ? [...currentData] : [];
  const index = next.findIndex((item) => getPathValue(item, key) === payloadKey);
  if (index >= 0) {
    if (upsertSuperseded(next[index], payload)) return next;
    next[index] = payload;
  } else {
    next.push(payload);
  }
  return capEntries(next, maxEntries);
}

export function defaultFilterState(ui: ServerPanelUI | undefined): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  (ui?.filters || []).forEach((filter) => {
    const id = normalizeSchemaID(filter.id);
    if (!id) {
      return;
    }
    state[id] = normalizeSchemaID(filter.kind) === 'checkbox' ? false : '';
  });
  return state;
}

function textValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

export function renderFilterControls(ui: ServerPanelUI | undefined, state: unknown, styles?: Pick<StyleConfig, 'blockPrefix'>): string {
  const current = state && typeof state === 'object' ? state as Record<string, unknown> : {};
  const filters = ui?.filters || [];
  if (filters.length === 0) {
    return '';
  }
  const prefix = blockPrefix(styles);
  return filters.map((filter) => {
    const id = normalizeSchemaID(filter.id);
    const kind = normalizeSchemaID(filter.kind);
    if (!id) {
      return '';
    }
    const label = normalizeSchemaText(filter.label) || id;
    const value = current[id];
    if (kind === 'select') {
      const options = Array.isArray(filter.options) ? filter.options : [];
      return `
        <div class="${prefix}-filter">
          <label>${escapeHTML(label)}</label>
          <select data-filter="${escapeHTML(id)}">
            <option value="">All</option>
            ${options.map((option) => {
              const optionValue = normalizeSchemaText(option);
              return `<option value="${escapeHTML(optionValue)}" ${value === optionValue ? 'selected' : ''}>${escapeHTML(optionValue)}</option>`;
            }).join('')}
          </select>
        </div>
      `;
    }
    if (kind === 'checkbox') {
      return `
        <label class="${prefix}-btn">
          <input type="checkbox" data-filter="${escapeHTML(id)}" ${value ? 'checked' : ''} />
          <span>${escapeHTML(label)}</span>
        </label>
      `;
    }
    return `
      <div class="${prefix}-filter ${prefix}-filter--grow">
        <label>${escapeHTML(label)}</label>
        <input type="search" data-filter="${escapeHTML(id)}" value="${escapeHTML(textValue(value))}" />
      </div>
    `;
  }).join('');
}

function rowMatchesFilter(row: unknown, filter: NonNullable<ServerPanelUI['filters']>[number], value: unknown): boolean {
  const kind = normalizeSchemaID(filter.kind);
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

export function applyDeclaredFilters(data: unknown, state: unknown, ui: ServerPanelUI | undefined): unknown {
  const filters = ui?.filters || [];
  if (filters.length === 0 || !state || typeof state !== 'object') {
    return data;
  }
  const current = state as Record<string, unknown>;
  if (Array.isArray(data)) {
    return data.filter((row) => filters.every((filter) => rowMatchesFilter(row, filter, current[normalizeSchemaID(filter.id)])));
  }
  if (data && typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>).filter(([key, value]) => {
      const row = { key, value };
      return filters.every((filter) => rowMatchesFilter(row, filter, current[normalizeSchemaID(filter.id)]));
    });
    return Object.fromEntries(entries);
  }
  return data;
}

export function renderDegradedNotice(
  serverDef: ServerPanelDefinition,
  styles: StyleConfig,
  reason?: string | null
): string {
  if (!reason) {
    return '';
  }
  const panelID = normalizeSchemaID(serverDef.id);
  return `<div class="${styles.emptyState}" data-panel-degraded="${escapeHTML(panelID)}"><strong>Panel UI degraded.</strong> ${escapeHTML(reason)}</div>`;
}

export function renderPanelActionControls(serverDef: ServerPanelDefinition, styles: StyleConfig, options: PanelOptions = {}): string {
  const panelID = normalizeSchemaID(serverDef.id);
  const actions = (serverDef.ui?.actions || []).filter((action) => action.hidden !== true);
  if (!panelID || actions.length === 0) {
    return '';
  }
  const prefix = blockPrefix(styles);
  const layoutMode = normalizeSchemaID(serverDef.ui?.action_layout?.mode) || 'list';
  if (layoutMode === 'select') {
    const pickerLabel = normalizeSchemaText(serverDef.ui?.action_layout?.picker_label) || 'Action';
    const emptyText = normalizeSchemaText(serverDef.ui?.action_layout?.empty_text) || 'Select an action to continue.';
    return `
      <div class="${styles.panelControls}" data-panel-action-launcher="${escapeHTML(panelID)}" style="display:flex;flex-direction:column;gap:0.75rem;align-items:stretch">
        <div class="${prefix}-filter ${prefix}-filter--grow">
          <label>${escapeHTML(pickerLabel)}</label>
          <select data-panel-action-picker="${escapeHTML(panelID)}">
            <option value="">${escapeHTML(emptyText)}</option>
            ${actions.map((action) => {
              const actionID = normalizeSchemaID(action.id);
              const label = normalizeSchemaText(action.label) || actionID;
              return actionID ? `<option value="${escapeHTML(actionID)}">${escapeHTML(label)}</option>` : '';
            }).join('')}
          </select>
        </div>
        ${actions.map((action) => {
          const actionID = normalizeSchemaID(action.id);
          if (!actionID) {
            return '';
          }
          return `<div data-panel-action-choice="${escapeHTML(actionID)}" hidden>${renderPanelActionControl(panelID, actionID, action, styles, options)}</div>`;
        }).join('')}
      </div>
    `;
  }
  return `
    <div class="${styles.panelControls}">
      ${actions.map((action) => {
        const actionID = normalizeSchemaID(action.id);
        if (!actionID) {
          return '';
        }
        return renderPanelActionControl(panelID, actionID, action, styles, options);
      }).join('')}
    </div>
  `;
}

function renderPanelActionControl(
  panelID: string,
  actionID: string,
  action: ServerPanelUIAction,
  styles: StyleConfig,
  options: PanelOptions
): string {
  const payload = renderActionPayload(action.payload);
  const fields = Array.isArray(action.fields) ? action.fields : [];
  const submitLabel = normalizeSchemaText(action.submit_label) || normalizeSchemaText(action.label) || actionID;
  if (fields.length > 0) {
    return `
      <form
        data-panel-action-form
        data-panel-id="${escapeHTML(panelID)}"
        data-action-id="${escapeHTML(actionID)}"
        data-action-confirm="${escapeHTML(normalizeSchemaText(action.confirm_text))}"
        data-action-requires-confirm="${action.requires_confirm ? 'true' : 'false'}"
        data-action-payload='${payload}'
        style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:flex-end"
      >
        ${fields.map((field, index) => renderPanelActionField(panelID, actionID, field, index, styles, options)).join('')}
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
      data-action-confirm="${escapeHTML(normalizeSchemaText(action.confirm_text))}"
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

function actionFieldID(
  styles: StyleConfig,
  options: PanelOptions,
  panelID: string,
  actionID: string,
  name: string,
  index: number
): string {
  const scope = normalizeSchemaText(options.idScope);
  return `${blockPrefix(styles)}-action-${scope ? `${scope}-` : ''}${panelID}-${actionID}-${name}-${index}`;
}

type ActionFieldOption = { value: string; label: string; disabled: boolean };

function actionFieldOptions(field: ServerPanelUIActionField): { items: ActionFieldOption[]; values: string[] } {
  const values = Array.isArray(field.options) ? field.options.map((option) => normalizeSchemaText(option)).filter(Boolean) : [];
  const items = Array.isArray(field.option_items)
    ? field.option_items
      .map((option) => ({
        value: normalizeSchemaText(option?.value),
        label: normalizeSchemaText(option?.label) || normalizeSchemaText(option?.value),
        disabled: option?.disabled === true,
      }))
      .filter((option) => option.value)
    : [];
  return { items, values };
}

function renderActionFieldControl(
  field: ServerPanelUIActionField,
  kind: string,
  baseAttrs: string,
  placeholderAttr: string
): string {
  if (field.sensitive === true) {
    return `<input type="password" ${baseAttrs}${placeholderAttr} autocomplete="new-password" spellcheck="false">`;
  }
  if (kind === 'boolean' || kind === 'checkbox') {
    return `<input type="checkbox" ${baseAttrs}>`;
  }
  const { items, values } = actionFieldOptions(field);
  if (kind === 'select' || items.length > 0 || values.length > 0) {
    const renderedOptions = items.length > 0
      ? items.map((option) => `<option value="${escapeHTML(option.value)}"${option.disabled ? ' disabled' : ''}>${escapeHTML(option.label)}</option>`).join('')
      : values.map((option) => `<option value="${escapeHTML(option)}">${escapeHTML(option)}</option>`).join('');
    return `<select ${baseAttrs}><option value=""></option>${renderedOptions}</select>`;
  }
  if (kind === 'number' || kind === 'integer') {
    return `<input type="number" ${baseAttrs}${placeholderAttr}>`;
  }
  if (kind === 'textarea' || kind === 'json' || kind === 'string_list') {
    return `<textarea ${baseAttrs}${placeholderAttr} rows="2"></textarea>`;
  }
  return `<input type="text" ${baseAttrs}${placeholderAttr}>`;
}

function renderPanelActionField(
  panelID: string,
  actionID: string,
  field: ServerPanelUIActionField,
  index: number,
  styles: StyleConfig,
  options: PanelOptions
): string {
  const name = normalizeSchemaID(field.name);
  if (!name) {
    return '';
  }
  const kind = normalizeSchemaID(field.kind) || 'text';
  const label = normalizeSchemaText(field.label) || name;
  const fieldID = actionFieldID(styles, options, panelID, actionID, name, index);
  const payloadPath = normalizeSchemaText(field.payload_path) || name;
  const required = field.required ? ' required' : '';
  const placeholder = normalizeSchemaText(field.placeholder);
  const placeholderAttr = placeholder ? ` placeholder="${escapeHTML(placeholder)}"` : '';
  const description = normalizeSchemaText(field.description);
  const help = normalizeSchemaText(field.help);
  const sensitive = field.sensitive === true;
  const baseAttrs = `id="${escapeHTML(fieldID)}" data-action-field="${escapeHTML(name)}" data-action-field-kind="${escapeHTML(kind)}" data-action-field-path="${escapeHTML(payloadPath)}"${sensitive ? ' data-action-field-sensitive="true"' : ''}${required}`;
  const control = renderActionFieldControl(field, kind, baseAttrs, placeholderAttr);
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
 * Data-only body for a schema view; unsupported views render the safe JSON
 * fallback with the degraded reason.
 */
export function renderServerPanelBody(
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
      { renderer: 'json', title: normalizeSchemaText(serverDef.label) || normalizeSchemaID(serverDef.id) || 'Panel' },
      getViewData(data, view),
      styles,
      useIconCopyButton
    );
  }
  return `${renderDegradedNotice(serverDef, styles, degradedReason)}${body}`;
}

/** Placeholder the host fills with the latest action outcome for a panel. */
export function renderPanelActionResultSlot(serverDef: ServerPanelDefinition): string {
  return `<div data-panel-action-result="${escapeHTML(normalizeSchemaID(serverDef.id))}"></div>`;
}

/** Complete panel view: action controls, degraded notice, body and result slot. */
export function renderServerPanelView(
  serverDef: ServerPanelDefinition,
  view: ServerPanelUIView | undefined,
  data: unknown,
  styles: StyleConfig,
  useIconCopyButton: boolean,
  degradedReason?: string | null,
  newestFirst = false,
  options: PanelOptions = {}
): string {
  return `${renderPanelActionControls(serverDef, styles, options)}${renderServerPanelBody(serverDef, view, data, styles, useIconCopyButton, degradedReason, newestFirst)}${renderPanelActionResultSlot(serverDef)}`;
}
