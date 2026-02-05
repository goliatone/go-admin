// Shared JS errors panel renderer
// Used by both the full debug console and the debug toolbar

import type { JSErrorEntry, PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
import { escapeHTML, formatTimestamp } from '../utils.js';

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
    default:
      return type || 'Error';
  }
}

/**
 * Render a single JS error row.
 */
function renderErrorRow(
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
  const location =
    entry.type === 'network_error' && entry.extra?.request_url
      ? String(entry.extra.request_url)
      : source && entry.line
        ? `${source}:${entry.line}${entry.column ? ':' + entry.column : ''}`
        : source || '';

  const expandIcon = hasStack ? `<span class="${styles.expandIcon}">&#9654;</span>` : '';
  const expandableClass = hasStack ? styles.expandableRow : '';

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

  let stackRow = '';
  if (hasStack) {
    stackRow = `
      <tr class="${styles.expansionRow}">
        <td colspan="${options.compact ? 3 : 5}">
          <div class="${styles.expandedContent}">
            <pre style="margin:0;white-space:pre-wrap;word-break:break-all;font-size:0.8em;opacity:0.85">${escapeHTML(entry.stack)}</pre>
          </div>
        </td>
      </tr>
    `;
  }

  return `
    <tr class="${styles.rowError} ${expandableClass}">
      <td>${expandIcon}<span class="${typeClass}">${escapeHTML(type)}</span></td>
      <td class="${styles.timestamp}">${escapeHTML(formatTimestamp(entry.timestamp))}</td>
      <td class="${styles.message}" title="${escapeHTML(message)}">${displayMessage}</td>
      ${locationCell}
      ${urlCell}
    </tr>
    ${stackRow}
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
      <tbody>${rows}</tbody>
    </table>
  `;
}
