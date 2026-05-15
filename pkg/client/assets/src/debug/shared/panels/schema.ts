import type { StyleConfig } from '../styles.js';
import type { ServerPanelDefinition, ServerPanelUIView } from '../types.js';
import { escapeHTML, formatNumber, formatTimestamp } from '../utils.js';
import { renderJSONPanel } from './json.js';

type SchemaItem = Record<string, unknown>;

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
            const value = raw === undefined || raw === null || raw === '' ? empty : formatValue(raw, item.format);
            return `<tr><th>${escapeHTML(label)}</th><td>${escapeHTML(value)}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </section>
  `;
}

export function renderSchemaTable(
  title: string,
  data: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig
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
  return `
    <section class="${styles.jsonPanel}">
      ${renderTitle(title, styles)}
      <table class="${styles.table}">
        <thead>
          <tr>${effectiveColumns.map((column) => `<th>${escapeHTML(text(column.label || column.bind))}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${effectiveColumns.map((column) => `<td>${escapeHTML(formatValue(pathValue(row, column.bind), column.format))}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `;
}

export function renderSchemaStatusList(
  title: string,
  data: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig
): string {
  const rows = dataArray(data);
  if (rows.length === 0) {
    return `<div class="${styles.emptyState}">No ${escapeHTML(title.toLowerCase())} statuses available</div>`;
  }
  return `
    <section class="${styles.jsonPanel}">
      ${renderTitle(title, styles)}
      <table class="${styles.table}">
        <tbody>
          ${rows.map((row) => {
            const label = text(pathValue(row, view?.options?.label_bind || 'label') || pathValue(row, 'name') || pathValue(row, 'key'));
            const description = text(pathValue(row, view?.options?.description_bind || 'description') || pathValue(row, 'message'));
            const status = text(pathValue(row, view?.options?.status_bind || 'status') || pathValue(row, 'severity'));
            return `
              <tr>
                <td><span class="${styles.badge}">${escapeHTML(status || 'status')}</span></td>
                <td><strong>${escapeHTML(label)}</strong>${description ? `<div class="${styles.muted}">${escapeHTML(description)}</div>` : ''}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </section>
  `;
}

export function renderSchemaTimeline(
  title: string,
  data: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig
): string {
  const rows = dataArray(data);
  if (rows.length === 0) {
    return `<div class="${styles.emptyState}">No ${escapeHTML(title.toLowerCase())} events available</div>`;
  }
  return `
    <section class="${styles.jsonPanel}">
      ${renderTitle(title, styles)}
      <table class="${styles.table}">
        <tbody>
          ${rows.map((row) => {
            const timestamp = formatTimestamp(pathValue(row, view?.options?.timestamp_bind || 'timestamp'));
            const message = text(pathValue(row, view?.options?.message_bind || 'message') || pathValue(row, 'title'));
            const level = text(pathValue(row, view?.options?.level_bind || 'level') || pathValue(row, 'severity'));
            return `
              <tr>
                <td class="${styles.timestamp}">${escapeHTML(timestamp)}</td>
                <td>${level ? `<span class="${styles.badge}">${escapeHTML(level)}</span> ` : ''}${escapeHTML(message)}</td>
              </tr>
            `;
          }).join('')}
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
  useIconCopyButton: boolean
): string {
  const sections = Array.isArray(view?.sections) ? view.sections : [];
  if (sections.length === 0) {
    return renderJSONPanel(text(view?.title || serverDef.label || serverDef.id || 'Panel'), data, styles, { useIconCopyButton });
  }
  return sections
    .map((section) => renderSchemaPanelView(serverDef, section, data, styles, useIconCopyButton))
    .join('');
}

export function renderSchemaPanelView(
  serverDef: ServerPanelDefinition,
  view: ServerPanelUIView | undefined,
  data: unknown,
  styles: StyleConfig,
  useIconCopyButton = false
): string {
  const title = text(view?.title || serverDef.label || serverDef.id || 'Panel');
  const displayData = pathValue(data, view?.bind);
  switch (text(view?.renderer).toLowerCase()) {
    case 'metrics':
      return renderSchemaMetrics(title, displayData, view, styles);
    case 'key_value':
      return renderSchemaKeyValue(title, displayData, view, styles);
    case 'table':
      return renderSchemaTable(title, displayData, view, styles);
    case 'status_list':
      return renderSchemaStatusList(title, displayData, view, styles);
    case 'timeline':
      return renderSchemaTimeline(title, displayData, view, styles);
    case 'stack':
      return renderSchemaStack(serverDef, data, view, styles, useIconCopyButton);
    case 'json':
    default:
      return renderJSONPanel(title, displayData ?? {}, styles, { useIconCopyButton });
  }
}
