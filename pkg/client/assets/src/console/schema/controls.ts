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
import { escapeAttribute, escapeHTML, pathValue as getPathValue } from '../format.js';
import { defaultGetCount, defaultHandleEvent } from '../registry.js';
import { renderSchemaPanelView } from './views.js';
import { normalizeTone, renderSteps, severestTone } from './rich.js';
import { consoleActionState } from '../capabilities.js';

const SUPPORTED_RENDERERS = new Set(['metrics', 'key_value', 'identity', 'table', 'status_list', 'timeline', 'json', 'stack', 'cards', 'list']);
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
    case 'matching_rows':
      return matchingRows(data, policy?.bind).length;
    case 'none':
      return 0;
    default:
      return defaultGetCount(value);
  }
}

/** Rows (a records list) whose bound field is truthy. */
function matchingRows(data: unknown, bind: unknown): unknown[] {
  const rows = Array.isArray(data) ? data : [];
  return rows.filter((row) => Boolean(getPathValue(row, bind)));
}

/** Badge tone for a count policy: static, or the most severe matching row tone. */
export function getCountToneForPolicy(data: unknown, ui: ServerPanelUI | undefined): string {
  const policy = ui?.count;
  const fixed = normalizeTone(policy?.tone);
  if (fixed) return fixed;
  const toneBind = normalizeSchemaText(policy?.tone_bind);
  if (!toneBind || normalizeSchemaID(policy?.mode) !== 'matching_rows') return '';
  return severestTone(matchingRows(data, policy?.bind).map((row) => normalizeTone(getPathValue(row, toneBind))));
}

/** Whether a count policy hides the tab badge for this value. */
export function countHiddenForPolicy(count: number, ui: ServerPanelUI | undefined): boolean {
  const mode = normalizeSchemaID(ui?.count?.mode);
  return mode === 'none' || (mode === 'matching_rows' && count === 0);
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
  // Drawer layouts open forms from header, section, row and card slots.
  if (layoutMode === 'drawer' && prefix !== 'debug') {
    return '';
  }
  if (layoutMode === 'select' && prefix !== 'debug') {
    return renderConsoleActionLauncher(serverDef, panelID, actions, styles, options);
  }
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
        return prefix === 'debug'
          ? renderPanelActionControl(panelID, actionID, action, styles, options)
          : renderConsoleActionForm(panelID, actionID, action, styles, options, 'inline');
      }).join('')}
    </div>
  `;
}

/**
 * Select-layout launcher for neutral consoles: a labelled picker over classed
 * forms. Unavailable declarations stay listed, disabled, with their reason.
 */
function renderConsoleActionLauncher(
  serverDef: ServerPanelDefinition,
  panelID: string,
  actions: ServerPanelUIAction[],
  styles: StyleConfig,
  options: PanelOptions
): string {
  const prefix = blockPrefix(styles);
  const pickerLabel = normalizeSchemaText(serverDef.ui?.action_layout?.picker_label) || 'Action';
  const emptyText = normalizeSchemaText(serverDef.ui?.action_layout?.empty_text) || 'Select an action to continue.';
  const scope = normalizeSchemaText(options.idScope);
  const pickerID = `${prefix}-action-${scope ? `${scope}-` : ''}${panelID}-picker`;
  const choices = actions.map((action) => {
    const actionID = normalizeSchemaID(action.id);
    if (!actionID) return '';
    const state = consoleActionState(action);
    const label = normalizeSchemaText(action.label) || actionID;
    return `<option value="${escapeHTML(actionID)}"${state.executable ? '' : ' disabled'}>${escapeHTML(label)}${state.executable ? '' : ` — ${escapeHTML(state.reason)}`}</option>`;
  }).join('');
  const forms = actions.map((action) => {
    const actionID = normalizeSchemaID(action.id);
    if (!actionID || !consoleActionState(action).executable) return '';
    return `<div data-panel-action-choice="${escapeHTML(actionID)}" hidden>${renderConsoleActionForm(panelID, actionID, action, styles, options, 'inline')}</div>`;
  }).join('');
  return `
    <div class="${styles.panelControls} ${prefix}-action-launcher" data-panel-action-launcher="${escapeHTML(panelID)}">
      <div class="${prefix}-filter ${prefix}-filter--grow">
        <label for="${escapeAttribute(pickerID)}">${escapeHTML(pickerLabel)}</label>
        <select id="${escapeAttribute(pickerID)}" data-panel-action-picker="${escapeHTML(panelID)}">
          <option value="">${escapeHTML(emptyText)}</option>
          ${choices}
        </select>
      </div>
      ${forms}
    </div>
  `;
}

export type ConsoleActionFormMode = 'inline' | 'drawer';

/**
 * Classed action form for neutral consoles (ADR-0004). Unavailable or
 * unsupported declarations render a disabled control with their reason, never
 * a form. Generated request IDs are read-only and filled by the runtime's
 * request draft; hidden fields are set by the submitter at submission time.
 */
export function renderConsoleActionForm(
  panelID: string,
  actionID: string,
  action: ServerPanelUIAction,
  styles: StyleConfig,
  options: PanelOptions,
  mode: ConsoleActionFormMode
): string {
  const prefix = blockPrefix(styles);
  const state = consoleActionState(action);
  const label = normalizeSchemaText(action.label) || actionID;
  const submitLabel = normalizeSchemaText(action.submit_label) || label;
  const shared = `data-panel-id="${escapeHTML(panelID)}" data-action-id="${escapeHTML(actionID)}" data-action-confirm="${escapeHTML(normalizeSchemaText(action.confirm_text))}" data-action-requires-confirm="${action.requires_confirm || action.confirmation ? 'true' : 'false'}" data-action-payload='${renderActionPayload(action.payload)}'`;
  if (!state.executable) {
    return `<button type="button" class="${prefix}-btn" aria-disabled="true" data-action-unavailable="${escapeAttribute(state.availability)}" data-panel-id="${escapeHTML(panelID)}" data-action-id="${escapeHTML(actionID)}" title="${escapeAttribute(state.reason)}"><span>${escapeHTML(label)}</span><span class="${prefix}-sr-only"> — ${escapeHTML(state.reason)}</span></button>`;
  }
  // Hidden fields and the secondary submitter's field are set by the submit
  // path from the declaration, never edited.
  const secondaryField = normalizeSchemaID(action.secondary_submit?.field);
  const fields = (Array.isArray(action.fields) ? action.fields : [])
    .filter((field) => normalizeSchemaID(field.kind) !== 'hidden' && !(secondaryField && normalizeSchemaID(field.name) === secondaryField));
  if (fields.length === 0 && mode === 'inline' && !action.secondary_submit) {
    return `<button type="button" class="${prefix}-btn" data-panel-action ${shared}>${escapeHTML(submitLabel)}</button>`;
  }
  const regular = fields.filter((field) => !field.advanced && !field.generate);
  const advanced = fields.filter((field) => field.advanced || field.generate);
  const renderField = (field: ServerPanelUIActionField, index: number): string =>
    renderConsoleActionField(panelID, actionID, field, index, styles, options);
  // A button disclosure (not <details>) so modal focus containment reaches it;
  // collapsed fields stay in the form and in the payload.
  const advancedID = `${prefix}-advanced-${normalizeSchemaText(options.idScope) ? `${normalizeSchemaText(options.idScope)}-` : ''}${mode}-${panelID}-${actionID}`;
  const advancedBlock = advanced.length === 0
    ? ''
    : `<div class="${prefix}-advanced" data-expanded="false"><button type="button" class="${prefix}-advanced__toggle" aria-expanded="false" aria-controls="${escapeAttribute(advancedID)}" data-advanced-toggle>Advanced</button><div class="${prefix}-advanced__body" id="${escapeAttribute(advancedID)}">${advanced.map((field) => renderField(field, fields.indexOf(field))).join('')}</div></div>`;
  const secondaryLabel = normalizeSchemaText(action.secondary_submit?.label);
  const submitters = `${secondaryLabel ? `<button type="submit" class="${prefix}-btn" data-submitter="secondary">${escapeHTML(secondaryLabel)}</button>` : ''}<button type="submit" class="${prefix}-btn ${prefix}-btn--primary" data-submitter="primary">${escapeHTML(submitLabel)}</button>`;
  const intro = mode === 'drawer' ? renderDrawerIntro(action, styles) : '';
  const note = mode === 'drawer' && normalizeSchemaText(action.drawer?.note)
    ? `<p class="${prefix}-field__help">${escapeHTML(normalizeSchemaText(action.drawer?.note))}</p>`
    : '';
  const footer = mode === 'drawer'
    ? `<div class="${prefix}-drawer__footer"><button type="button" class="${prefix}-btn" data-drawer-cancel>Cancel</button>${submitters}</div>`
    : `<div class="${prefix}-form__actions">${submitters}</div>`;
  return `
    <form class="${prefix}-form ${prefix}-form--${mode}" data-panel-action-form data-action-mode="${mode}" ${shared} novalidate>
      ${mode === 'drawer' ? `<div class="${prefix}-drawer__body">` : ''}
      ${intro}
      ${regular.map((field) => renderField(field, fields.indexOf(field))).join('')}
      ${advancedBlock}
      <div class="${prefix}-request-status" data-request-status hidden></div>
      ${note}
      ${mode === 'drawer' ? '</div>' : ''}
      ${footer}
    </form>
  `;
}

function renderDrawerIntro(action: ServerPanelUIAction, styles: StyleConfig): string {
  const prefix = blockPrefix(styles);
  const drawer = action.drawer || {};
  const effect = normalizeSchemaText(drawer.effect);
  const tone = normalizeTone(drawer.effect_tone) || 'info';
  const steps = renderSteps(drawer.steps, styles);
  const details = Array.isArray(drawer.details)
    ? drawer.details
      .map((detail) => ({ label: normalizeSchemaText(detail?.label), value: normalizeSchemaText(detail?.value), format: normalizeSchemaID(detail?.format) }))
      .filter((detail) => detail.label)
    : [];
  return `
    ${effect ? `<div class="${prefix}-callout" data-tone="${tone}"><p>${escapeHTML(effect)}</p></div>` : ''}
    ${steps ? `<div class="${prefix}-drawer__steps">${steps}</div>` : ''}
    ${details.length > 0
      ? `<dl class="${prefix}-drawer__details">${details.map((detail) => `<dt>${escapeHTML(detail.label)}</dt><dd>${detail.format === 'mono' || detail.format === 'copy' ? `<code class="${prefix}-kv__mono">${escapeHTML(detail.value)}</code>` : escapeHTML(detail.value || '—')}</dd>`).join('')}</dl>`
      : ''}
  `;
}

type ConsoleFieldParts = {
  name: string;
  kind: string;
  label: string;
  fieldID: string;
  generated: boolean;
  attrs: string;
  help: string;
  error: string;
};

/** Shared attributes, help and error slots of one classed field. */
function consoleFieldParts(
  panelID: string,
  actionID: string,
  field: ServerPanelUIActionField,
  index: number,
  styles: StyleConfig,
  options: PanelOptions
): ConsoleFieldParts | null {
  const name = normalizeSchemaID(field.name);
  if (!name) return null;
  const prefix = blockPrefix(styles);
  const kind = normalizeSchemaID(field.kind) || 'text';
  const fieldID = actionFieldID(styles, options, panelID, actionID, name, index);
  const payloadPath = normalizeSchemaText(field.payload_path) || name;
  const description = normalizeSchemaText(field.description);
  const help = normalizeSchemaText(field.help);
  const helpText = [description, help && help !== description ? help : ''].filter(Boolean).join(' ');
  const generated = normalizeSchemaID(field.generate) === 'request_id';
  const numeric = kind === 'number' || kind === 'integer';
  const source = field.option_source;
  const attrs = [
    `id="${escapeHTML(fieldID)}"`,
    `data-action-field="${escapeHTML(name)}"`,
    `data-action-field-kind="${escapeHTML(generated ? 'text' : kind)}"`,
    `data-action-field-path="${escapeHTML(payloadPath)}"`,
    field.sensitive === true ? 'data-action-field-sensitive="true"' : '',
    generated ? 'data-action-field-generated="request_id" readonly' : '',
    field.required || generated ? 'required aria-required="true"' : '',
    `aria-describedby="${escapeAttribute(helpText ? `${fieldID}-help ${fieldID}-error` : `${fieldID}-error`)}"`,
    numeric && typeof field.min === 'number' ? `min="${field.min}"` : '',
    numeric && typeof field.max === 'number' ? `max="${field.max}"` : '',
    kind === 'integer' ? 'step="1" inputmode="numeric"' : '',
    source?.paginated === true ? `data-option-source="${escapeAttribute(normalizeSchemaID(source.id))}" data-option-paginated${source.searchable ? ' data-option-searchable' : ''}` : '',
  ].filter(Boolean).join(' ');
  return {
    name,
    kind,
    label: normalizeSchemaText(field.label) || name,
    fieldID,
    generated,
    attrs,
    help: helpText ? `<small class="${prefix}-field__help" id="${escapeAttribute(`${fieldID}-help`)}">${escapeHTML(helpText)}</small>` : '',
    error: `<small class="${prefix}-field__error" id="${escapeAttribute(`${fieldID}-error`)}" data-action-field-error="${escapeHTML(payloadPath)}" data-action-field-name="${escapeHTML(name)}" data-action-id="${escapeHTML(actionID)}" role="alert" hidden></small>`,
  };
}

/** Declared scalar default for editable, non-sensitive fields. */
function consoleFieldDefault(field: ServerPanelUIActionField): string {
  const value = field.default;
  if (field.sensitive === true || value === undefined || value === null || typeof value === 'object') return '';
  return String(value);
}

/** The editable control for a classed field (inputs, selects, generated IDs, option pages). */
function consoleFieldControl(field: ServerPanelUIActionField, parts: ConsoleFieldParts, styles: StyleConfig): string {
  const prefix = blockPrefix(styles);
  if (parts.generated) {
    return `<div class="${prefix}-field__generated"><input type="text" ${parts.attrs} value="" spellcheck="false" autocomplete="off"><button type="button" class="${prefix}-btn ${prefix}-btn--sm" data-copy-request-id aria-label="Copy ${escapeAttribute(parts.label)}">Copy</button><button type="button" class="${prefix}-btn ${prefix}-btn--sm ${prefix}-btn--ghost" data-new-request>New request</button></div>`;
  }
  const source = field.option_source;
  if (source?.paginated === true) {
    const search = source.searchable
      ? `<input type="search" class="${prefix}-field__search" data-option-search aria-label="Search ${escapeAttribute(parts.label)}" placeholder="Search">`
      : '';
    // A declared default is pinned on the first page load, so a preselected
    // retained receipt is shown even when it sits beyond page one.
    const preselected = consoleFieldDefault(field);
    const pending = preselected ? ` data-pending-value="${escapeAttribute(preselected)}"` : '';
    return `<select ${parts.attrs}${pending}><option value="">Loading…</option></select>${search}<button type="button" class="${prefix}-btn ${prefix}-btn--sm ${prefix}-btn--ghost" data-option-more hidden>Load more</button>`;
  }
  const placeholder = normalizeSchemaText(field.placeholder);
  const control = renderActionFieldControl(field, parts.kind, parts.attrs, placeholder ? ` placeholder="${escapeHTML(placeholder)}"` : '');
  const fallback = consoleFieldDefault(field);
  if (!fallback) return control;
  if (control.startsWith('<select')) {
    return control.replace(`<option value="${escapeHTML(fallback)}"`, `<option value="${escapeHTML(fallback)}" selected`);
  }
  if (control.startsWith('<textarea')) {
    return control.replace('></textarea>', `>${escapeHTML(fallback)}</textarea>`);
  }
  return control.replace(/>$/, ` value="${escapeAttribute(fallback)}">`);
}

function renderConsoleActionField(
  panelID: string,
  actionID: string,
  field: ServerPanelUIActionField,
  index: number,
  styles: StyleConfig,
  options: PanelOptions
): string {
  const parts = consoleFieldParts(panelID, actionID, field, index, styles, options);
  if (!parts) {
    return '';
  }
  const prefix = blockPrefix(styles);
  if (!parts.generated && (parts.kind === 'boolean' || parts.kind === 'checkbox')) {
    return `
      <div class="${prefix}-field ${prefix}-field--check" data-field-name="${escapeAttribute(parts.name)}">
        <label class="${prefix}-check" for="${escapeHTML(parts.fieldID)}"><input type="checkbox" ${parts.attrs}${field.default === true ? ' checked' : ''}><span>${escapeHTML(parts.label)}</span></label>
        ${parts.help}${parts.error}
      </div>
    `;
  }
  return `
    <div class="${prefix}-field" data-field-name="${escapeAttribute(parts.name)}">
      <label class="${prefix}-field__label" for="${escapeHTML(parts.fieldID)}">${escapeHTML(parts.label)}</label>
      ${consoleFieldControl(field, parts, styles)}
      ${parts.help}${parts.error}
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
