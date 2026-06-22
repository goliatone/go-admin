// Shared JS errors panel renderer
// Used by both the full debug console and the debug toolbar

import type { JSErrorEntry, PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
import { escapeHTML, formatTimestamp } from '../utils.js';
import { escapeAttribute } from '../../../shared/html.js';
import { hashString } from './live-list-view.js';

/**
 * Stable identity for a JS error row. Prefers the server id and falls back to a
 * deterministic content hash, so expansion state keyed by this survives
 * incremental updates and full re-renders.
 */
export function jsErrorRowKey(entry: JSErrorEntry): string {
  if (entry.id) return entry.id;
  return `jserr-${hashString(`${entry.timestamp || ''}|${entry.type || ''}|${entry.message || ''}|${entry.source || ''}|${entry.line ?? ''}`)}`;
}

/**
 * Options for rendering the JS errors panel
 */
export type JSErrorsPanelOptions = PanelOptions & {
  /** Maximum number of entries to display. */
  maxEntries?: number;
  /** Use compact rendering (toolbar mode). */
  compact?: boolean;
  /** Whether to show the sort toggle control. */
  showSortToggle?: boolean;
};

/**
 * Get a CSS class token for the error type badge.
 */
function getErrorTypeClass(type: string | undefined): string {
  switch ((type || '').toLowerCase()) {
    case 'uncaught':
      return 'error';
    case 'unhandled_rejection':
      return 'error';
    case 'console_error':
      return 'warn';
    case 'network_error':
      return 'warn';
    case 'network_abort':
      return 'warn';
    default:
      return 'error';
  }
}

/**
 * Format the error type for display.
 */
function formatErrorType(type: string | undefined): string {
  switch ((type || '').toLowerCase()) {
    case 'uncaught':
      return 'Uncaught';
    case 'unhandled_rejection':
      return 'Rejection';
    case 'console_error':
      return 'Console';
    case 'network_error':
      return 'Network';
    case 'network_abort':
      return 'Abort';
    default:
      return type || 'Error';
  }
}

function hasExtra(entry: JSErrorEntry): boolean {
  return !!entry.extra && Object.keys(entry.extra).length > 0;
}

function formatDetailValue(value: unknown): string {
  if (value == null) {
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

function collectDetailEntries(entry: JSErrorEntry): Array<[string, unknown]> {
  const rows: Array<[string, unknown]> = [];
  const seen = new Set<string>();

  const append = (key: string, value: unknown) => {
    if (value == null || value === '') {
      return;
    }
    rows.push([key, value]);
    seen.add(key);
  };

  const extra = entry.extra ?? {};
  for (const key of [
    'method',
    'request_url',
    'status',
    'status_text',
    'abort_reason',
    'aborted',
  ]) {
    append(key, extra[key]);
  }
  Object.keys(extra)
    .sort()
    .forEach((key) => {
      if (!seen.has(key)) {
        append(key, extra[key]);
      }
    });

  append('page_url', entry.url);
  append('user_agent', entry.user_agent);

  return rows;
}

function renderDetails(entry: JSErrorEntry, styles: StyleConfig): string {
  const parts: string[] = [];
  if (entry.stack) {
    parts.push(
      `<pre style="margin:0;white-space:pre-wrap;word-break:break-all;font-size:0.8em;opacity:0.85">${escapeHTML(entry.stack)}</pre>`
    );
  }

  const detailEntries = collectDetailEntries(entry);
  if (detailEntries.length > 0) {
    const rows = detailEntries
      .map(([key, value]) => {
        const text = formatDetailValue(value);
        return `
          <div style="font-weight:600;opacity:0.75">${escapeHTML(key)}</div>
          <div style="word-break:break-all">${escapeHTML(text)}</div>
        `;
      })
      .join('');
    parts.push(`
      <div style="display:grid;grid-template-columns:max-content minmax(0,1fr);gap:0.35rem 0.75rem;font-size:0.8em">
        ${rows}
      </div>
    `);
  }

  return `<div class="${styles.expandedContent}">${parts.join('')}</div>`;
}

/**
 * Render a single JS error row (summary `<tr>` plus an optional stack row).
 * Carries a stable `data-row-key` so `LiveListView` can append/evict it and
 * `attachRowExpansion` can persist its expanded state.
 */
export function renderErrorRow(
  entry: JSErrorEntry,
  styles: StyleConfig,
  options: JSErrorsPanelOptions
): string {
  const type = formatErrorType(entry.type);
  const typeClassName = getErrorTypeClass(entry.type);
  const typeClass = styles.badgeLevel(typeClassName);
  const message = entry.message || '';
  const source = entry.source || '';
  const hasStack = !!entry.stack;
  const hasDetails = hasStack || hasExtra(entry);
  const location =
    (entry.type === 'network_error' || entry.type === 'network_abort') && entry.extra?.request_url
      ? String(entry.extra.request_url)
      : source && entry.line
        ? `${source}:${entry.line}${entry.column ? ':' + entry.column : ''}`
        : source || '';

  const expandIcon = hasDetails ? `<span class="${styles.expandIcon}">&#9654;</span>` : '';
  const expandableClass = hasDetails ? styles.expandableRow : '';

  const displayMessage = options.compact
    ? escapeHTML(message.length > 100 ? message.slice(0, 100) + '...' : message)
    : escapeHTML(message);

  const locationCell =
    !options.compact && location
      ? `<td class="${styles.timestamp}" title="${escapeHTML(location)}">${escapeHTML(
          location.length > 60 ? '...' + location.slice(-57) : location
        )}</td>`
      : '';

  const urlCell =
    !options.compact && entry.url
      ? `<td class="${styles.timestamp}" title="${escapeHTML(entry.url)}">${escapeHTML(
          entry.url.length > 40 ? '...' + entry.url.slice(-37) : entry.url
        )}</td>`
      : '';

  let detailRow = '';
  if (hasDetails) {
    detailRow = `
      <tr class="${styles.expansionRow}">
        <td colspan="${options.compact ? 3 : 5}">
          ${renderDetails(entry, styles)}
        </td>
      </tr>
    `;
  }

  return `
    <tr class="${styles.rowError} ${expandableClass}" data-row-key="${escapeAttribute(jsErrorRowKey(entry))}">
      <td>${expandIcon}<span class="${typeClass}">${escapeHTML(type)}</span></td>
      <td class="${styles.timestamp}">${escapeHTML(formatTimestamp(entry.timestamp))}</td>
      <td class="${styles.message}" title="${escapeHTML(message)}">${displayMessage}</td>
      ${locationCell}
      ${urlCell}
    </tr>
    ${detailRow}
  `;
}

/**
 * Render the sort toggle control for the JS errors panel.
 */
function renderSortToggle(newestFirst: boolean, styles: StyleConfig): string {
  return `
    <div class="${styles.panelControls}">
      <label class="${styles.sortToggle}">
        <input type="checkbox" data-sort-toggle="jserrors" ${newestFirst ? 'checked' : ''}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}

/**
 * Render the JS errors panel table.
 *
 * @param errors - Array of JS error entries to render
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the JS errors panel
 */
export function renderJSErrorsPanel(
  errors: JSErrorEntry[],
  styles: StyleConfig,
  options: JSErrorsPanelOptions = {}
): string {
  const {
    newestFirst = true,
    maxEntries = 100,
    compact = false,
    showSortToggle = false,
  } = options;

  const sortToggle = showSortToggle ? renderSortToggle(newestFirst, styles) : '';

  if (!errors.length) {
    return sortToggle + `<div class="${styles.emptyState}">No JS errors captured</div>`;
  }

  let items = maxEntries ? errors.slice(-maxEntries) : errors;

  if (newestFirst) {
    items = [...items].reverse();
  }

  const rows = items
    .map((entry) => renderErrorRow(entry, styles, { ...options, compact }))
    .join('');

  const locationHeader = !compact ? '<th>Location</th>' : '';
  const urlHeader = !compact ? '<th>Page</th>' : '';

  return `
    ${sortToggle}
    <table class="${styles.table}">
      <thead>
        <tr>
          <th>Type</th>
          <th>Time</th>
          <th>Message</th>
          ${locationHeader}
          ${urlHeader}
        </tr>
      </thead>
      <tbody data-live-list>${rows}</tbody>
    </table>
  `;
}
