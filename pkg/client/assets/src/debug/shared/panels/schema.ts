import type { StyleConfig } from '../styles.js';
import type { ServerPanelDefinition, ServerPanelUIView } from '../types.js';
import { escapeHTML, formatNumber, formatTimestamp } from '../utils.js';
import { escapeAttribute } from '../../../shared/html.js';
import { hashString } from './live-list-view.js';
import { renderJSONPanel } from './json.js';
import { normalizeDeploymentPersona, renderDeploymentPersonaAvatar } from '../deployment-persona.js';

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

/**
 * Only normalized six-digit hex colors ever reach CSS. Server payloads are
 * validated before serialization; this is the second gate so an older or
 * hand-crafted payload can never inject a CSS value.
 */
function safeColor(value: unknown): string | null {
  const raw = text(value).trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(raw) ? raw : null;
}

function formatValue(value: unknown, format: unknown): string {
  const kind = typeof format === 'string' ? format.trim().toLowerCase() : '';
  if (kind === 'number') {
    return formatNumber(value);
  }
  if (kind === 'timestamp' || kind === 'time' || kind === 'date') {
    return formatTimestamp(value);
  }
  if (kind === 'datetime') {
    return formatDateTime(value);
  }
  if (kind === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return text(value);
}

/**
 * Absolute date and time. `timestamp` drops the date, which is right for a
 * request or log row but loses meaning for a build or process-start instant.
 */
function formatDateTime(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const date = typeof value === 'number' ? new Date(value) : new Date(text(value));
  return Number.isNaN(date.getTime()) ? text(value) : date.toLocaleString();
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/** Muted placeholder so absent optional metadata reads as unknown, not empty. */
function renderUnavailable(empty: string): string {
  const label = empty || 'Unavailable';
  return `<span class="debug-kv__empty">${escapeHTML(label)}</span>`;
}

/**
 * Render one declared value. `label` is only used to give copy controls an
 * accessible name; it never carries markup.
 */
function renderKeyValue(
  value: unknown,
  format: unknown,
  empty: string,
  styles: StyleConfig,
  label = ''
): string {
  const kind = typeof format === 'string' ? format.trim().toLowerCase() : '';
  if (isBlank(value)) {
    return renderUnavailable(empty);
  }
  const raw = formatValue(value, format);
  if (raw === '') {
    return renderUnavailable(empty);
  }
  switch (kind) {
    case 'copy':
      return renderCopyValue(raw, styles, label);
    case 'color': {
      const color = safeColor(raw);
      if (!color) {
        return renderUnavailable(empty);
      }
      return `<span class="debug-kv__swatch" style="--debug-swatch-color:${escapeAttribute(color)}"><span class="debug-kv__swatch-dot" aria-hidden="true"></span><code>${escapeHTML(color.toUpperCase())}</code></span>`;
    }
    case 'badge':
      return `<span class="${styles.badge}">${escapeHTML(raw)}</span>`;
    case 'mono':
      return `<code class="debug-kv__mono">${escapeHTML(raw)}</code>`;
    default:
      return escapeHTML(raw);
  }
}

/** Copy affordance. Keeps the shared `data-copy-*` contract intact. */
function renderCopyValue(raw: string, styles: StyleConfig, label = ''): string {
  const action = label ? `Copy ${label}` : 'Copy to clipboard';
  return `<span class="debug-kv__copy" data-copy-content="${escapeAttribute(raw)}"><code class="debug-kv__mono">${escapeHTML(raw)}</code><button type="button" class="${styles.copyBtnSm} debug-kv__copy-btn" data-copy-trigger title="${escapeAttribute(action)}" aria-label="${escapeAttribute(action)}">Copy</button></span>`;
}

/**
 * Section heading. Emitting the surface's existing header wrapper lets the
 * console and toolbar stylesheets style declarative sections exactly like
 * hand-written panels instead of leaving a bare `<h3>`.
 */
function renderTitle(title: string, styles: StyleConfig): string {
  if (!title) {
    return '';
  }
  return `<div class="${styles.jsonHeader}"><h3 class="${styles.jsonViewerTitle}">${escapeHTML(title)}</h3></div>`;
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
      <dl class="debug-kv">
        ${items.map((item) => {
          const label = text(item.label || item.bind);
          const raw = pathValue(data, item.bind);
          const empty = text(item.empty || '');
          return `<dt>${escapeHTML(label)}</dt><dd>${renderKeyValue(raw, item.format, empty, styles, label)}</dd>`;
        }).join('')}
      </dl>
    </section>
  `;
}

/**
 * Summary header for a panel: one accent color, an eyebrow chip, a primary
 * title, an optional subtitle, and supporting chips. Generic on purpose — any
 * panel can declare the value an operator should recognize first.
 */
export function renderSchemaIdentity(
  title: string,
  data: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig
): string {
  const options = view?.options || {};
  // An absent bind must resolve to nothing; `pathValue` returns the whole
  // payload for an empty path, which would serialize the object into the slot.
  const bound = (bind: unknown): unknown =>
    (typeof bind === 'string' && bind.trim() !== '' ? pathValue(data, bind) : undefined);
  const accent = safeColor(bound(options.color_bind));
  const eyebrow = text(bound(options.eyebrow_bind)).trim();
  const primaryHeading = text(bound(options.title_bind)).trim();
  const fallbackHeading = text(bound(options.title_fallback_bind)).trim();
  const heading = primaryHeading || fallbackHeading;
  const subtitle = text(bound(options.subtitle_bind)).trim();
  const chips = optionItems(view, 'chips').filter((chip) => !isBlank(bound(chip.bind)));
  const avatarValue = bound(options.avatar_bind);
  const avatarName = text(bound(options.avatar_name_bind)).trim();
  const avatarPersona = normalizeDeploymentPersona(
    avatarValue && typeof avatarValue === 'object'
      ? { name: avatarName || heading, visual: avatarValue }
      : undefined
  );
  const avatar = renderDeploymentPersonaAvatar(avatarPersona, 'debug-identity__avatar');
  if (!eyebrow && !heading && chips.length === 0) {
    return `<div class="${styles.emptyState}">No ${escapeHTML((title || 'identity').toLowerCase())} details available</div>`;
  }
  const titleFormat = text(options.title_format);
  const titleLabel = primaryHeading
    ? text(options.title_label)
    : text(options.title_fallback_label);
  const headingValue = heading
    ? (titleFormat === 'copy'
        ? renderCopyValue(heading, styles, titleLabel || title || 'value')
        : `<span class="debug-identity__value">${escapeHTML(heading)}</span>`)
    : renderUnavailable(text(options.empty));
  return `
    <section class="debug-identity"${accent ? ` style="--debug-identity-color:${escapeAttribute(accent)}"` : ''}${accent ? '' : ' data-accent="none"'}>
      <div class="debug-identity__lead">
        ${avatar}
        ${eyebrow
          ? `<span class="debug-identity__env"><span class="debug-identity__dot" aria-hidden="true"></span>${escapeHTML(eyebrow.toUpperCase())}</span>`
          : ''}
        <div class="debug-identity__names">
          ${title ? `<span class="debug-identity__label">${escapeHTML(title)}</span>` : ''}
          <span class="debug-identity__title">${headingValue}</span>
          ${subtitle ? `<span class="debug-identity__subtitle">${escapeHTML(subtitle)}</span>` : ''}
        </div>
      </div>
      ${chips.length > 0
        ? `<dl class="debug-identity__chips">${chips.map((chip) => {
            const label = text(chip.label || chip.bind);
            const value = renderKeyValue(bound(chip.bind), chip.format, text(chip.empty || ''), styles, label);
            return `<div class="debug-identity__chip"><dt>${escapeHTML(label)}</dt><dd>${value}</dd></div>`;
          }).join('')}</dl>`
        : ''}
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
  const body = sections
    .map((section) => renderSchemaPanelView(serverDef, section, data, styles, useIconCopyButton, newestFirst))
    .join('');
  // Opt-in column flow. Sections keep their natural height instead of
  // stretching to the tallest peer, so grouped detail reads as one block.
  if (text(view?.options?.layout).toLowerCase() === 'grid') {
    return `<div class="debug-schema-grid">${body}</div>`;
  }
  return body;
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
    case 'identity':
      return renderSchemaIdentity(text(view?.title), displayData, view, styles);
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
