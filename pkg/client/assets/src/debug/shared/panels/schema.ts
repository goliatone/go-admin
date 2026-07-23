import type { StyleConfig } from '../styles.js';
import type { ServerPanelDefinition, ServerPanelUIView } from '../types.js';
import { escapeHTML, formatNumber, formatTimestamp } from '../utils.js';
import { escapeAttribute } from '../../../shared/html.js';
import { hashString } from './live-list-view.js';
import { renderJSONPanel } from './json.js';

type SchemaItem = Record<string, unknown>;

/**
 * Stable key for a schema list row. Uses the declared `key_bind` field when
 * present, otherwise a deterministic content hash. Used to mark `data-row-key`
 * so LiveListView can append/evict schema rows incrementally.
 */
export function schemaRowKey(row: unknown, keyBind?: unknown): string {
  if (keyBind) {
    const value = text(pathValue(row, keyBind));
    if (value) return value;
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(row) ?? '';
  } catch {
    serialized = text(row);
  }
  return `schema-${hashString(serialized)}`;
}

function text(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function pathValue(data: unknown, bind: unknown): unknown {
  const path = typeof bind === 'string' ? bind.trim().replace(/^\$\./, '') : '';
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

function optionItems(view: ServerPanelUIView | undefined, key: string): SchemaItem[] {
  const value = view?.options?.[key];
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as SchemaItem[] : [];
}

function dataArray(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>).map(([key, value]) => ({ key, value }));
  }
  return [];
}

function formatValue(value: unknown, format: unknown): string {
  const kind = typeof format === 'string' ? format.trim().toLowerCase() : '';
  if (kind === 'number') {
    return formatNumber(value);
  }
  if (kind === 'timestamp' || kind === 'time' || kind === 'date') {
    return formatTimestamp(value);
  }
  if (kind === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return text(value);
}

function renderKeyValue(value: unknown, format: unknown, empty: string, styles: StyleConfig): string {
  const raw = value === undefined || value === null || value === '' ? empty : formatValue(value, format);
  const kind = typeof format === 'string' ? format.trim().toLowerCase() : '';
  if (kind === 'copy' && raw && raw !== empty) {
    return `
      <div data-copy-content="${escapeAttribute(raw)}">
        <code>${escapeHTML(raw)}</code>
        <button type="button" class="${styles.copyBtnSm}" data-copy-trigger title="Copy to clipboard">Copy</button>
      </div>
    `;
  }
  if (kind === 'color' && /^#[0-9a-f]{6}$/i.test(raw)) {
    return `<span class="${styles.badge}" style="--debug-identity-color:${escapeAttribute(raw)}"><span aria-hidden="true" style="display:inline-block;width:.65em;height:.65em;border-radius:50%;background:var(--debug-identity-color);margin-right:.4em"></span>${escapeHTML(raw)}</span>`;
  }
  return escapeHTML(raw);
}

function renderTitle(title: string, styles: StyleConfig): string {
  return title ? `<h3 class="${styles.jsonViewerTitle}">${escapeHTML(title)}</h3>` : '';
}

export function renderSchemaMetrics(
  title: string,
  data: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig
): string {
  const metrics = optionItems(view, 'metrics');
  const items: SchemaItem[] = metrics.length > 0
    ? metrics
    : Object.entries((data && typeof data === 'object' && !Array.isArray(data) ? data : {}) as Record<string, unknown>)
        .map(([key]) => ({ label: key, bind: key }));
  if (items.length === 0) {
    return `<div class="${styles.emptyState}">No ${escapeHTML(title.toLowerCase())} metrics available</div>`;
  }
  return `
    <section class="${styles.jsonPanel}">
      ${renderTitle(title, styles)}
      <div class="${styles.jsonGrid}">
        ${items.map((item) => {
          const label = text(item.label || item.bind);
          const value = formatValue(pathValue(data, item.bind), item.format);
          const severity = text(pathValue(data, item.severity) || item.status || '');
          return `
            <div class="${styles.detailPane}" data-severity="${escapeHTML(severity)}">
              <div class="${styles.detailLabel}">${escapeHTML(label)}</div>
              <div class="${styles.detailValue}">${escapeHTML(value)}</div>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

export function renderSchemaKeyValue(
  title: string,
  data: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig
): string {
  const fields = optionItems(view, 'fields');
  const items: SchemaItem[] = fields.length > 0
    ? fields
    : Object.entries((data && typeof data === 'object' && !Array.isArray(data) ? data : {}) as Record<string, unknown>)
        .map(([key]) => ({ label: key, bind: key }));
  if (items.length === 0) {
    return `<div class="${styles.emptyState}">No ${escapeHTML(title.toLowerCase())} details available</div>`;
  }
  return `
    <section class="${styles.jsonPanel}">
      ${renderTitle(title, styles)}
      <table class="${styles.detailKeyValueTable || styles.table}">
        <tbody>
          ${items.map((item) => {
            const label = text(item.label || item.bind);
            const raw = pathValue(data, item.bind);
            const empty = text(item.empty || '');
            return `<tr><th>${escapeHTML(label)}</th><td>${renderKeyValue(raw, item.format, empty, styles)}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </section>
  `;
}

/** Render a single schema table row, keyed for incremental updates. */
export function renderSchemaTableRow(
  row: unknown,
  columns: SchemaItem[],
  keyBind?: unknown
): string {
  const effective: SchemaItem[] = columns.length > 0
    ? columns
    : Object.keys((row && typeof row === 'object' ? row : {}) as Record<string, unknown>)
        .map((key) => ({ label: key, bind: key }));
  return `
    <tr data-row-key="${escapeAttribute(schemaRowKey(row, keyBind))}">
      ${effective.map((column) => `<td>${escapeHTML(formatValue(pathValue(row, column.bind), column.format))}</td>`).join('')}
    </tr>
  `;
}

export function renderSchemaTable(
  title: string,
  data: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig,
  newestFirst = false
): string {
  const rows = dataArray(data);
  const columns = optionItems(view, 'columns');
  const effectiveColumns: SchemaItem[] = columns.length > 0
    ? columns
    : Object.keys((rows[0] && typeof rows[0] === 'object' ? rows[0] : {}) as Record<string, unknown>)
        .map((key) => ({ label: key, bind: key }));
  if (rows.length === 0 || effectiveColumns.length === 0) {
    return `<div class="${styles.emptyState}">No ${escapeHTML(title.toLowerCase())} rows available</div>`;
  }
  const keyBind = view?.options?.key_bind;
  const ordered = newestFirst ? [...rows].reverse() : rows;
  return `
    <section class="${styles.jsonPanel}">
      ${renderTitle(title, styles)}
      <table class="${styles.table}">
        <thead>
          <tr>${effectiveColumns.map((column) => `<th>${escapeHTML(text(column.label || column.bind))}</th>`).join('')}</tr>
        </thead>
        <tbody data-live-list>
          ${ordered.map((row) => renderSchemaTableRow(row, effectiveColumns, keyBind)).join('')}
        </tbody>
      </table>
    </section>
  `;
}

/** Render a single schema status-list row, keyed for incremental updates. */
export function renderSchemaStatusRow(
  row: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig
): string {
  const label = text(pathValue(row, view?.options?.label_bind || 'label') || pathValue(row, 'name') || pathValue(row, 'key'));
  const description = text(pathValue(row, view?.options?.description_bind || 'description') || pathValue(row, 'message'));
  const status = text(pathValue(row, view?.options?.status_bind || 'status') || pathValue(row, 'severity'));
  return `
    <tr data-row-key="${escapeAttribute(schemaRowKey(row, view?.options?.key_bind))}">
      <td><span class="${styles.badge}">${escapeHTML(status || 'status')}</span></td>
      <td><strong>${escapeHTML(label)}</strong>${description ? `<div class="${styles.muted}">${escapeHTML(description)}</div>` : ''}</td>
    </tr>
  `;
}

export function renderSchemaStatusList(
  title: string,
  data: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig,
  newestFirst = false
): string {
  const rows = dataArray(data);
  if (rows.length === 0) {
    return `<div class="${styles.emptyState}">No ${escapeHTML(title.toLowerCase())} statuses available</div>`;
  }
  const ordered = newestFirst ? [...rows].reverse() : rows;
  return `
    <section class="${styles.jsonPanel}">
      ${renderTitle(title, styles)}
      <table class="${styles.table}">
        <tbody data-live-list>
          ${ordered.map((row) => renderSchemaStatusRow(row, view, styles)).join('')}
        </tbody>
      </table>
    </section>
  `;
}

/** Render a single schema timeline row, keyed for incremental updates. */
export function renderSchemaTimelineRow(
  row: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig
): string {
  const timestamp = formatTimestamp(pathValue(row, view?.options?.timestamp_bind || 'timestamp'));
  const message = text(pathValue(row, view?.options?.message_bind || 'message') || pathValue(row, 'title'));
  const level = text(pathValue(row, view?.options?.level_bind || 'level') || pathValue(row, 'severity'));
  return `
    <tr data-row-key="${escapeAttribute(schemaRowKey(row, view?.options?.key_bind))}">
      <td class="${styles.timestamp}">${escapeHTML(timestamp)}</td>
      <td>${level ? `<span class="${styles.badge}">${escapeHTML(level)}</span> ` : ''}${escapeHTML(message)}</td>
    </tr>
  `;
}

export function renderSchemaTimeline(
  title: string,
  data: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig,
  newestFirst = false
): string {
  const rows = dataArray(data);
  if (rows.length === 0) {
    return `<div class="${styles.emptyState}">No ${escapeHTML(title.toLowerCase())} events available</div>`;
  }
  const ordered = newestFirst ? [...rows].reverse() : rows;
  return `
    <section class="${styles.jsonPanel}">
      ${renderTitle(title, styles)}
      <table class="${styles.table}">
        <tbody data-live-list>
          ${ordered.map((row) => renderSchemaTimelineRow(row, view, styles)).join('')}
        </tbody>
      </table>
    </section>
  `;
}

export function renderSchemaStack(
  serverDef: ServerPanelDefinition,
  data: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig,
  useIconCopyButton: boolean,
  newestFirst = false
): string {
  const sections = Array.isArray(view?.sections) ? view.sections : [];
  if (sections.length === 0) {
    return renderJSONPanel(text(view?.title || serverDef.label || serverDef.id || 'Panel'), data, styles, { useIconCopyButton });
  }
  return sections
    .map((section) => renderSchemaPanelView(serverDef, section, data, styles, useIconCopyButton, newestFirst))
    .join('');
}

export function renderSchemaPanelView(
  serverDef: ServerPanelDefinition,
  view: ServerPanelUIView | undefined,
  data: unknown,
  styles: StyleConfig,
  useIconCopyButton = false,
  newestFirst = false
): string {
  const title = text(view?.title || serverDef.label || serverDef.id || 'Panel');
  const displayData = pathValue(data, view?.bind);
  switch (text(view?.renderer).toLowerCase()) {
    case 'metrics':
      return renderSchemaMetrics(title, displayData, view, styles);
    case 'key_value':
      return renderSchemaKeyValue(title, displayData, view, styles);
    case 'table':
      return renderSchemaTable(title, displayData, view, styles, newestFirst);
    case 'status_list':
      return renderSchemaStatusList(title, displayData, view, styles, newestFirst);
    case 'timeline':
      return renderSchemaTimeline(title, displayData, view, styles, newestFirst);
    case 'stack':
      return renderSchemaStack(serverDef, data, view, styles, useIconCopyButton, newestFirst);
    case 'json':
    default:
      return renderJSONPanel(title, displayData ?? {}, styles, { useIconCopyButton });
  }
}

/** Whether a renderer kind is an incremental-capable list view. */
export function isSchemaListRenderer(renderer: unknown): boolean {
  const kind = text(renderer).toLowerCase();
  return kind === 'table' || kind === 'status_list' || kind === 'timeline';
}

/**
 * Render a single row for a schema list view (table/status_list/timeline), used
 * by the registry live-list path to append one item incrementally.
 */
export function renderSchemaListRow(
  renderer: unknown,
  item: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig
): string {
  switch (text(renderer).toLowerCase()) {
    case 'status_list':
      return renderSchemaStatusRow(item, view, styles);
    case 'timeline':
      return renderSchemaTimelineRow(item, view, styles);
    case 'table':
    default:
      return renderSchemaTableRow(item, optionItems(view, 'columns'), view?.options?.key_bind);
  }
}
