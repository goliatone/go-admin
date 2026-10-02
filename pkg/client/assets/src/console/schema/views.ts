// Declarative schema view renderers (schema version 1). Every value is escaped;
// only validated hex colors reach inline CSS custom properties.

import { blockPrefix, type StyleConfig } from '../style-config.js';
import type { ServerPanelDefinition, ServerPanelUIView } from '../types.js';
import {
  escapeAttribute,
  escapeHTML,
  formatNumber,
  formatTimestamp,
  hashString,
  pathValue,
  textValue as text,
} from '../format.js';
import { renderJSONPanel } from './json.js';
import { normalizePersona, renderPersonaAvatar } from './avatar.js';
import {
  normalizeTone,
  renderActionSlot,
  renderProgress,
  renderRelativeTime,
  renderSteps,
  renderToneBadge,
  truncateValue,
} from './rich.js';

type SchemaItem = Record<string, unknown>;

/**
 * Stable key for a schema list row. Uses the declared `key_bind` field when
 * present, otherwise a deterministic content hash. Used to mark `data-row-key`
 * so live views can append/evict schema rows incrementally.
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
function renderUnavailable(empty: string, styles: StyleConfig): string {
  const label = empty || 'Unavailable';
  return `<span class="${blockPrefix(styles)}-kv__empty">${escapeHTML(label)}</span>`;
}

/**
 * Render one declared value. `label` is only used to give copy controls an
 * accessible name; it never carries markup.
 */
/** Rich presentation hints of one declared column/field (all optional). */
type ValueExtras = {
  /** Server-computed tone for badge values. */
  tone?: unknown;
  /** Display length for mono/copy identifiers (the full value stays copyable). */
  truncate?: unknown;
};

function renderKeyValue(
  value: unknown,
  format: unknown,
  empty: string,
  styles: StyleConfig,
  label = '',
  extras: ValueExtras = {}
): string {
  const kind = typeof format === 'string' ? format.trim().toLowerCase() : '';
  const prefix = blockPrefix(styles);
  if (isBlank(value)) {
    return renderUnavailable(empty, styles);
  }
  // Structured formats render from the value itself, not its text form.
  if (kind === 'steps' || kind === 'progress' || kind === 'relative') {
    const rendered = kind === 'steps'
      ? renderSteps(value, styles)
      : kind === 'progress' ? renderProgress(value, styles) : renderRelativeTime(value, styles);
    return rendered || renderUnavailable(empty, styles);
  }
  const raw = formatValue(value, format);
  if (raw === '') {
    return renderUnavailable(empty, styles);
  }
  switch (kind) {
    case 'copy':
      return renderCopyValue(raw, styles, label, extras.truncate);
    case 'color': {
      const color = safeColor(raw);
      if (!color) {
        return renderUnavailable(empty, styles);
      }
      return `<span class="${prefix}-kv__swatch" style="--${prefix}-swatch-color:${escapeAttribute(color)}"><span class="${prefix}-kv__swatch-dot" aria-hidden="true"></span><code>${escapeHTML(color.toUpperCase())}</code></span>`;
    }
    case 'badge':
      return normalizeTone(extras.tone)
        ? renderToneBadge(raw, extras.tone, styles)
        : `<span class="${styles.badge}">${escapeHTML(raw)}</span>`;
    case 'mono': {
      const shown = truncateValue(raw, extras.truncate);
      const title = shown === raw ? '' : ` title="${escapeAttribute(raw)}"`;
      return `<code class="${prefix}-kv__mono"${title}>${escapeHTML(shown)}</code>`;
    }
    default:
      return escapeHTML(raw);
  }
}

/** Copy affordance. Keeps the shared `data-copy-*` contract intact. */
function renderCopyValue(raw: string, styles: StyleConfig, label = '', truncate?: unknown): string {
  const prefix = blockPrefix(styles);
  const action = label ? `Copy ${label}` : 'Copy to clipboard';
  const shown = truncateValue(raw, truncate);
  const title = shown === raw ? '' : ` title="${escapeAttribute(raw)}"`;
  return `<span class="${prefix}-kv__copy" data-copy-content="${escapeAttribute(raw)}"><code class="${prefix}-kv__mono"${title}>${escapeHTML(shown)}</code><button type="button" class="${styles.copyBtnSm} ${prefix}-kv__copy-btn" data-copy-trigger title="${escapeAttribute(action)}" aria-label="${escapeAttribute(action)}">Copy</button></span>`;
}

/** Placeholder for blank declared values: the column's `empty` text, else an em dash. */
const EMPTY_PLACEHOLDER = '—';

/**
 * A column opts into rich rendering by declaring any rich option. Legacy
 * columns keep their exact plain-text output (Debug parity).
 */
function isRichColumn(column: SchemaItem): boolean {
  return column.format !== undefined || column.empty !== undefined || column.tone_bind !== undefined
    || column.secondary_bind !== undefined || column.truncate !== undefined;
}

/** Shared cell formatter for full and incremental table renders. */
function renderTableCellContent(row: unknown, column: SchemaItem, styles: StyleConfig): string {
  const value = pathValue(row, column.bind);
  if (!isRichColumn(column)) {
    return escapeHTML(formatValue(value, column.format));
  }
  const label = text(column.label || column.bind);
  const empty = column.empty === undefined ? EMPTY_PLACEHOLDER : text(column.empty);
  const tone = typeof column.tone_bind === 'string' && column.tone_bind ? pathValue(row, column.tone_bind) : undefined;
  const primary = renderKeyValue(value, column.format, empty, styles, label, { tone, truncate: column.truncate });
  const secondaryBind = typeof column.secondary_bind === 'string' ? column.secondary_bind : '';
  const secondary = secondaryBind ? text(pathValue(row, secondaryBind)).trim() : '';
  if (!secondary) return primary;
  const prefix = blockPrefix(styles);
  return `<div class="${prefix}-cell-main"><span class="${prefix}-cell-title">${primary}</span><span class="${prefix}-cell-sub">${escapeHTML(secondary)}</span></div>`;
}

/** Neutral consoles label cells for the narrow row-card layout; Debug markup is unchanged. */
function responsiveCells(styles: StyleConfig): boolean {
  return blockPrefix(styles) !== 'debug';
}

/**
 * Section heading. Emitting the surface's existing header wrapper lets each
 * host stylesheet style declarative sections exactly like hand-written panels
 * instead of leaving a bare `<h3>`.
 */
function renderTitle(title: string, styles: StyleConfig, view?: ServerPanelUIView, serverDef?: ServerPanelDefinition): string {
  if (!title) {
    return '';
  }
  const prefix = blockPrefix(styles);
  const description = text(view?.description).trim();
  const linkPanel = text(view?.link?.panel_id).trim().toLowerCase();
  const linkLabel = text(view?.link?.label).trim();
  const link = linkPanel && linkLabel
    ? `<button type="button" class="${prefix}-link" data-console-panel-link="${escapeAttribute(linkPanel)}">${escapeHTML(linkLabel)}<span aria-hidden="true"> →</span></button>`
    : '';
  const actions = renderActionSlot(view?.actions, serverDef, styles);
  if (!description && !link && !actions) {
    return `<div class="${styles.jsonHeader}"><h3 class="${styles.jsonViewerTitle}">${escapeHTML(title)}</h3></div>`;
  }
  const heading = description
    ? `<div class="${prefix}-section-heading"><h3 class="${styles.jsonViewerTitle}">${escapeHTML(title)}</h3><p class="${prefix}-section-description">${escapeHTML(description)}</p></div>`
    : `<h3 class="${styles.jsonViewerTitle}">${escapeHTML(title)}</h3>`;
  return `<div class="${styles.jsonHeader}">${heading}${link || actions ? `<div class="${styles.jsonActions}">${link}${actions}</div>` : ''}</div>`;
}

/** The view's own empty-state copy, else the generic message. */
function renderEmpty(view: ServerPanelUIView | undefined, fallback: string, styles: StyleConfig): string {
  const declared = text(view?.empty).trim();
  return `<div class="${styles.emptyState}">${escapeHTML(declared || fallback)}</div>`;
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
      ${renderTitle(title, styles, view)}
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
      ${renderTitle(title, styles, view)}
      <dl class="${blockPrefix(styles)}-kv">
        ${items.map((item) => {
          const label = text(item.label || item.bind);
          const raw = pathValue(data, item.bind);
          const empty = text(item.empty || '');
          const tone = typeof item.tone_bind === 'string' && item.tone_bind ? pathValue(data, item.tone_bind) : undefined;
          return `<dt>${escapeHTML(label)}</dt><dd>${renderKeyValue(raw, item.format, empty, styles, label, { tone, truncate: item.truncate })}</dd>`;
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
  const prefix = blockPrefix(styles);
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
  const avatarPersona = normalizePersona(
    avatarValue && typeof avatarValue === 'object'
      ? { name: avatarName || heading, visual: avatarValue }
      : undefined
  );
  const avatar = renderPersonaAvatar(avatarPersona, `${prefix}-identity__avatar`);
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
        : `<span class="${prefix}-identity__value">${escapeHTML(heading)}</span>`)
    : renderUnavailable(text(options.empty), styles);
  return `
    <section class="${prefix}-identity"${accent ? ` style="--${prefix}-identity-color:${escapeAttribute(accent)}"` : ''}${accent ? '' : ' data-accent="none"'}>
      <div class="${prefix}-identity__lead">
        ${avatar}
        ${eyebrow
          ? `<span class="${prefix}-identity__env"><span class="${prefix}-identity__dot" aria-hidden="true"></span>${escapeHTML(eyebrow.toUpperCase())}</span>`
          : ''}
        <div class="${prefix}-identity__names">
          ${title ? `<span class="${prefix}-identity__label">${escapeHTML(title)}</span>` : ''}
          <span class="${prefix}-identity__title">${headingValue}</span>
          ${subtitle ? `<span class="${prefix}-identity__subtitle">${escapeHTML(subtitle)}</span>` : ''}
        </div>
      </div>
      ${chips.length > 0
        ? `<dl class="${prefix}-identity__chips">${chips.map((chip) => {
            const label = text(chip.label || chip.bind);
            const value = renderKeyValue(bound(chip.bind), chip.format, text(chip.empty || ''), styles, label);
            return `<div class="${prefix}-identity__chip"><dt>${escapeHTML(label)}</dt><dd>${value}</dd></div>`;
          }).join('')}</dl>`
        : ''}
    </section>
  `;
}

/** Rendering context for rich rows; absent for legacy callers. */
export type SchemaRowContext = {
  styles?: StyleConfig;
  serverDef?: ServerPanelDefinition;
  /** Record field holding this row's action references. */
  actionsBind?: unknown;
};

/** Render a single schema table row, keyed for incremental updates. */
export function renderSchemaTableRow(
  row: unknown,
  columns: SchemaItem[],
  keyBind?: unknown,
  context: SchemaRowContext = {}
): string {
  const effective: SchemaItem[] = columns.length > 0
    ? columns
    : Object.keys((row && typeof row === 'object' ? row : {}) as Record<string, unknown>)
        .map((key) => ({ label: key, bind: key }));
  const styles = context.styles;
  if (!styles) {
    return `
    <tr data-row-key="${escapeAttribute(schemaRowKey(row, keyBind))}">
      ${effective.map((column) => `<td>${escapeHTML(formatValue(pathValue(row, column.bind), column.format))}</td>`).join('')}
    </tr>
  `;
  }
  const labelled = responsiveCells(styles);
  const cells = effective.map((column) => {
    const label = labelled ? ` data-label="${escapeAttribute(text(column.label || column.bind))}"` : '';
    return `<td${label}>${renderTableCellContent(row, column, styles)}</td>`;
  }).join('');
  const actionsBind = typeof context.actionsBind === 'string' ? context.actionsBind : '';
  const actions = actionsBind
    ? `<td class="${blockPrefix(styles)}-cell-actions"${labelled ? ' data-label="Actions"' : ''}>${renderActionSlot(pathValue(row, actionsBind), context.serverDef, styles)}</td>`
    : '';
  return `
    <tr data-row-key="${escapeAttribute(schemaRowKey(row, keyBind))}">
      ${cells}${actions}
    </tr>
  `;
}

export function renderSchemaTable(
  title: string,
  data: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig,
  newestFirst = false,
  serverDef?: ServerPanelDefinition
): string {
  const rows = dataArray(data);
  const columns = optionItems(view, 'columns');
  const effectiveColumns: SchemaItem[] = columns.length > 0
    ? columns
    : Object.keys((rows[0] && typeof rows[0] === 'object' ? rows[0] : {}) as Record<string, unknown>)
        .map((key) => ({ label: key, bind: key }));
  if (rows.length === 0 || effectiveColumns.length === 0) {
    return renderEmpty(view, `No ${title.toLowerCase()} rows available`, styles);
  }
  const keyBind = view?.options?.key_bind;
  const actionsBind = view?.options?.actions_bind;
  const ordered = newestFirst ? [...rows].reverse() : rows;
  const prefix = blockPrefix(styles);
  const actionsHeader = typeof actionsBind === 'string' && actionsBind
    ? `<th class="${prefix}-cell-actions"><span class="${prefix}-sr-only">Actions</span></th>`
    : '';
  return `
    <section class="${styles.jsonPanel}">
      ${renderTitle(title, styles, view, serverDef)}
      <table class="${styles.table}">
        <thead>
          <tr>${effectiveColumns.map((column) => `<th>${escapeHTML(text(column.label || column.bind))}</th>`).join('')}${actionsHeader}</tr>
        </thead>
        <tbody data-live-list>
          ${ordered.map((row) => renderSchemaTableRow(row, effectiveColumns, keyBind, { styles, serverDef, actionsBind })).join('')}
        </tbody>
      </table>
    </section>
  `;
}

/**
 * Record cards: title, status chip, metadata fields and an action slot. Beyond
 * `max_cards` rows the declared `columns` render as a compact table instead.
 */
export function renderSchemaCards(
  title: string,
  data: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig,
  serverDef?: ServerPanelDefinition
): string {
  const rows = dataArray(data);
  const options = view?.options || {};
  if (rows.length === 0) {
    return renderEmpty(view, `No ${title.toLowerCase()} available`, styles);
  }
  const maxCards = typeof options.max_cards === 'number' && options.max_cards > 0 ? Math.floor(options.max_cards) : 0;
  if (maxCards > 0 && rows.length > maxCards && optionItems(view, 'columns').length > 0) {
    return renderSchemaTable(title, rows, view, styles, false, serverDef);
  }
  const prefix = blockPrefix(styles);
  const fields = optionItems(view, 'fields');
  const bound = (row: unknown, key: string): unknown => {
    const bind = options[key];
    return typeof bind === 'string' && bind ? pathValue(row, bind) : undefined;
  };
  const cards = rows.map((row) => {
    const heading = text(bound(row, 'title_bind')).trim();
    const subtitle = text(bound(row, 'subtitle_bind')).trim();
    const status = text(bound(row, 'status_bind')).trim();
    const meta = fields.map((field) => {
      const label = text(field.label || field.bind);
      const tone = typeof field.tone_bind === 'string' && field.tone_bind ? pathValue(row, field.tone_bind) : undefined;
      const empty = field.empty === undefined ? EMPTY_PLACEHOLDER : text(field.empty);
      return `<div><dt>${escapeHTML(label)}</dt><dd>${renderKeyValue(pathValue(row, field.bind), field.format, empty, styles, label, { tone, truncate: field.truncate })}</dd></div>`;
    }).join('');
    const eyebrow = text(bound(row, 'eyebrow_bind')).trim();
    const actions = renderActionSlot(bound(row, 'actions_bind'), serverDef, styles);
    const note = text(bound(row, 'note_bind')).trim();
    return `
      <article class="${prefix}-card" data-row-key="${escapeAttribute(schemaRowKey(row, options.key_bind))}">
        <header class="${prefix}-card__top">
          ${eyebrow ? `<span class="${prefix}-card__eyebrow">${escapeHTML(eyebrow)}</span>` : '<span></span>'}
          ${status ? renderToneBadge(status, bound(row, 'tone_bind'), styles) : ''}
        </header>
        ${heading ? `<h4 class="${prefix}-card__title">${escapeHTML(heading)}</h4>` : ''}
        ${subtitle ? `<p class="${prefix}-card__subtitle">${escapeHTML(subtitle)}</p>` : ''}
        ${meta ? `<dl class="${prefix}-card__meta">${meta}</dl>` : ''}
        ${note || actions ? `<footer class="${prefix}-card__foot">${note ? `<span class="${prefix}-muted">${escapeHTML(note)}</span>` : '<span></span>'}${actions}</footer>` : ''}
      </article>
    `;
  }).join('');
  return `
    <section class="${prefix}-card-section">
      ${title ? renderTitle(title, styles, view, serverDef).replace(styles.jsonHeader, `${styles.jsonHeader} ${prefix}-section-header`) : ''}
      <div class="${prefix}-cards">${cards}</div>
    </section>
  `;
}

/** Compact record rows: title, subtitle, status, progress, time and actions. */
export function renderSchemaList(
  title: string,
  data: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig,
  serverDef?: ServerPanelDefinition
): string {
  const options = view?.options || {};
  const limit = typeof options.limit === 'number' && options.limit > 0 ? Math.floor(options.limit) : 0;
  const all = dataArray(data);
  const rows = limit > 0 ? all.slice(0, limit) : all;
  if (rows.length === 0) {
    return renderEmpty(view, `No ${title.toLowerCase()} yet`, styles);
  }
  const prefix = blockPrefix(styles);
  const bound = (row: unknown, key: string): unknown => {
    const bind = options[key];
    return typeof bind === 'string' && bind ? pathValue(row, bind) : undefined;
  };
  const items = rows.map((row) => {
    const heading = text(bound(row, 'title_bind')).trim();
    const subtitle = text(bound(row, 'subtitle_bind')).trim();
    const status = text(bound(row, 'status_bind')).trim();
    const tone = normalizeTone(bound(row, 'tone_bind'));
    const progress = renderProgress(bound(row, 'progress_bind'), styles);
    const time = renderRelativeTime(bound(row, 'time_bind'), styles);
    const actions = renderActionSlot(bound(row, 'actions_bind'), serverDef, styles);
    const toneAttr = tone ? ` data-tone="${tone}"` : '';
    return `
      <li class="${prefix}-list__item" data-row-key="${escapeAttribute(schemaRowKey(row, options.key_bind))}"${toneAttr}>
        <div class="${prefix}-list__main">
          ${heading ? `<span class="${prefix}-list__title">${escapeHTML(heading)}</span>` : ''}
          ${subtitle ? `<span class="${prefix}-list__subtitle">${escapeHTML(subtitle)}</span>` : ''}
          ${progress ? `<span class="${prefix}-list__progress">${progress}</span>` : ''}
        </div>
        <div class="${prefix}-list__end">
          ${status ? renderToneBadge(status, tone, styles) : ''}
          ${time}
          ${actions}
        </div>
      </li>
    `;
  }).join('');
  return `
    <section class="${styles.jsonPanel}">
      ${renderTitle(title, styles, view, serverDef)}
      <ul class="${prefix}-list">${items}</ul>
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
    return renderEmpty(view, `No ${title.toLowerCase()} statuses available`, styles);
  }
  const ordered = newestFirst ? [...rows].reverse() : rows;
  return `
    <section class="${styles.jsonPanel}">
      ${renderTitle(title, styles, view)}
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
    return renderEmpty(view, `No ${title.toLowerCase()} events available`, styles);
  }
  const ordered = newestFirst ? [...rows].reverse() : rows;
  return `
    <section class="${styles.jsonPanel}">
      ${renderTitle(title, styles, view)}
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
    return `<div class="${blockPrefix(styles)}-schema-grid">${body}</div>`;
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
      return renderSchemaTable(title, displayData, view, styles, newestFirst, serverDef);
    case 'cards':
      return renderSchemaCards(text(view?.title), displayData, view, styles, serverDef);
    case 'list':
      return renderSchemaList(title, displayData, view, styles, serverDef);
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
 * by live-list hosts to append one item incrementally.
 */
export function renderSchemaListRow(
  renderer: unknown,
  item: unknown,
  view: ServerPanelUIView | undefined,
  styles: StyleConfig,
  serverDef?: ServerPanelDefinition
): string {
  switch (text(renderer).toLowerCase()) {
    case 'status_list':
      return renderSchemaStatusRow(item, view, styles);
    case 'timeline':
      return renderSchemaTimelineRow(item, view, styles);
    case 'table':
    default: {
      // Incremental rows share the full render's cell formatter.
      const columns = optionItems(view, 'columns');
      const rich = view?.options?.actions_bind !== undefined || columns.some(isRichColumn) || blockPrefix(styles) !== 'debug';
      return rich
        ? renderSchemaTableRow(item, columns, view?.options?.key_bind, { styles, serverDef, actionsBind: view?.options?.actions_bind })
        : renderSchemaTableRow(item, columns, view?.options?.key_bind);
    }
  }
}
