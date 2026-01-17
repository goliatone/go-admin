// Shared requests panel renderer
// Used by both the full debug console and the debug toolbar

import type { RequestEntry, PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
import {
  escapeHTML,
  formatTimestamp,
  formatDuration,
  truncate,
} from '../utils.js';

/**
 * Options for rendering the requests panel
 */
export type RequestsPanelOptions = PanelOptions & {
  /** Maximum number of entries to display. Defaults to 50 for toolbar, unlimited for console. */
  maxEntries?: number;
  /** Whether to show the sort toggle control. Defaults to true for toolbar, false for console. */
  showSortToggle?: boolean;
  /** Whether to truncate the path. Defaults to true for toolbar, false for console. */
  truncatePath?: boolean;
  /** Maximum path length before truncation. Defaults to 50. */
  maxPathLength?: number;
};

/**
 * Render the sort toggle control for the requests panel
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
 * Render a single request row
 */
function renderRequestRow(
  entry: RequestEntry,
  styles: StyleConfig,
  options: RequestsPanelOptions
): string {
  const method = entry.method || 'GET';
  const path = entry.path || '';
  const statusCode = entry.status || 0;
  const duration = formatDuration(entry.duration, options.slowThresholdMs);

  const methodClass = styles.badgeMethod(method);
  const statusClass = styles.badgeStatus(statusCode);
  const durationClass = duration.isSlow ? styles.durationSlow : '';
  const rowClass = statusCode >= 400 ? styles.rowError : '';

  const displayPath = options.truncatePath
    ? truncate(path, options.maxPathLength || 50)
    : path;

  return `
    <tr class="${rowClass}">
      <td><span class="${methodClass}">${escapeHTML(method)}</span></td>
      <td class="${styles.path}" title="${escapeHTML(path)}">${escapeHTML(displayPath)}</td>
      <td><span class="${statusClass}">${escapeHTML(statusCode || '-')}</span></td>
      <td class="${styles.duration} ${durationClass}">${duration.text}</td>
      <td class="${styles.timestamp}">${escapeHTML(formatTimestamp(entry.timestamp))}</td>
    </tr>
  `;
}

/**
 * Render the requests panel table
 *
 * @param requests - Array of request entries to render
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the requests panel
 */
export function renderRequestsPanel(
  requests: RequestEntry[],
  styles: StyleConfig,
  options: RequestsPanelOptions = {}
): string {
  const {
    newestFirst = true,
    slowThresholdMs = 50,
    maxEntries,
    showSortToggle = false,
    truncatePath = true,
    maxPathLength = 50,
  } = options;

  const sortToggle = showSortToggle ? renderSortToggle('requests', newestFirst, styles) : '';

  if (!requests.length) {
    return sortToggle + `<div class="${styles.emptyState}">No requests captured</div>`;
  }

  // Apply max entries limit if specified
  let items = maxEntries ? requests.slice(-maxEntries) : requests;

  // Apply sort order
  if (newestFirst) {
    items = [...items].reverse();
  }

  const rows = items
    .map((entry) =>
      renderRequestRow(entry, styles, {
        ...options,
        slowThresholdMs,
        truncatePath,
        maxPathLength,
      })
    )
    .join('');

  return `
    ${sortToggle}
    <table class="${styles.table}">
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
