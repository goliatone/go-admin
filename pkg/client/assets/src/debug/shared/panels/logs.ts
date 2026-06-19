// Shared logs panel renderer
// Used by both the full debug console and the debug toolbar

import type { LogEntry, PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
import { escapeHTML, formatTimestamp, getLevelClass, truncate } from '../utils.js';
import { escapeAttribute } from '../../../shared/html.js';
import { hashString } from './live-list-view.js';

/**
 * Stable identity for a log row. Log entries have no server id, so this is a
 * deterministic hash of the entry's content. Logs carry no per-row interaction
 * state — the key only lets `LiveListView` identify and evict primary rows — so
 * collisions between identical lines are harmless (eviction is positional).
 */
export function logRowKey(entry: LogEntry): string {
  return `log-${hashString(`${entry.timestamp || ''}|${entry.level || ''}|${entry.source || ''}|${entry.message || ''}`)}`;
}

/**
 * Options for rendering the logs panel
 */
export type LogsPanelOptions = PanelOptions & {
  /** Maximum number of entries to display. Defaults to 100 for toolbar, 500 for console. */
  maxEntries?: number;
  /** Whether to show the sort toggle control. Defaults to false (logs typically don't have toggle in toolbar). */
  showSortToggle?: boolean;
  /** Whether to show the source column. Defaults to true for console, false for toolbar. */
  showSource?: boolean;
  /** Whether to truncate the message. Defaults to true for toolbar, false for console. */
  truncateMessage?: boolean;
  /** Maximum message length before truncation. Defaults to 100. */
  maxMessageLength?: number;
};

/**
 * Render the sort toggle control for the logs panel
 */
function renderSortToggle(panelId: string, newestFirst: boolean, styles: StyleConfig): string {
  return `
    <div class="${styles.panelControls}">
      <label class="${styles.sortToggle}">
        <input type="checkbox" data-sort-toggle="${panelId}" ${newestFirst ? 'checked' : ''}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}

/**
 * Render a single log row. Carries a stable `data-row-key` so `LiveListView`
 * can append/evict it incrementally instead of rebuilding the whole table.
 */
export function renderLogRow(
  entry: LogEntry,
  styles: StyleConfig,
  options: LogsPanelOptions
): string {
  const rawLevel = entry.level || 'INFO';
  const level = String(rawLevel).toUpperCase();
  const levelClassName = getLevelClass(String(rawLevel));
  const message = entry.message || '';
  const source = entry.source || '';

  const levelClass = styles.badgeLevel(levelClassName);
  const isError = levelClassName === 'error';
  const rowClass = isError ? styles.rowError : '';

  const displayMessage = options.truncateMessage
    ? truncate(message, options.maxMessageLength || 100)
    : message;

  const sourceColumn = options.showSource
    ? `<td class="${styles.timestamp}">${escapeHTML(source)}</td>`
    : '';

  return `
    <tr class="${rowClass}" data-row-key="${escapeAttribute(logRowKey(entry))}">
      <td><span class="${levelClass}">${escapeHTML(level)}</span></td>
      <td class="${styles.timestamp}">${escapeHTML(formatTimestamp(entry.timestamp))}</td>
      <td class="${styles.message}" title="${escapeHTML(message)}">${escapeHTML(displayMessage)}</td>
      ${sourceColumn}
    </tr>
  `;
}

/**
 * Render the logs panel table
 *
 * @param logs - Array of log entries to render
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the logs panel
 */
export function renderLogsPanel(
  logs: LogEntry[],
  styles: StyleConfig,
  options: LogsPanelOptions = {}
): string {
  const {
    newestFirst = true,
    maxEntries = 100,
    showSortToggle = false,
    showSource = false,
    truncateMessage = true,
    maxMessageLength = 100,
  } = options;

  const sortToggle = showSortToggle ? renderSortToggle('logs', newestFirst, styles) : '';

  if (!logs.length) {
    return sortToggle + `<div class="${styles.emptyState}">No logs captured</div>`;
  }

  // Apply max entries limit
  let items = maxEntries ? logs.slice(-maxEntries) : logs;

  // Apply sort order
  if (newestFirst) {
    items = [...items].reverse();
  }

  const rows = items
    .map((entry) =>
      renderLogRow(entry, styles, {
        ...options,
        showSource,
        truncateMessage,
        maxMessageLength,
      })
    )
    .join('');

  const sourceHeader = showSource ? '<th>Source</th>' : '';

  return `
    ${sortToggle}
    <table class="${styles.table}">
      <thead>
        <tr>
          <th>Level</th>
          <th>Time</th>
          <th>Message</th>
          ${sourceHeader}
        </tr>
      </thead>
      <tbody data-live-list>${rows}</tbody>
    </table>
  `;
}
