// Shared SQL panel renderer
// Used by both the full debug console and the debug toolbar

import type { SQLEntry, PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
import {
  escapeHTML,
  formatTimestamp,
  formatDuration,
  formatNumber,
} from '../utils.js';
import { highlightSQL } from '../../syntax-highlight.js';

/**
 * Options for rendering the SQL panel
 */
export type SQLPanelOptions = PanelOptions & {
  /** Maximum number of entries to display. Defaults to 50 for toolbar, 200 for console. */
  maxEntries?: number;
  /** Whether to show the sort toggle control. Defaults to true for toolbar, false for console. */
  showSortToggle?: boolean;
  /** Whether to use icon-based copy button (console) vs SVG-based (toolbar). Defaults to false. */
  useIconCopyButton?: boolean;
};

/**
 * Render the sort toggle control for the SQL panel
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
 * Render the copy button based on style (icon vs SVG)
 */
function renderCopyButton(styles: StyleConfig, useIcon: boolean, rowId: string): string {
  if (useIcon) {
    return `
      <button class="${styles.copyBtnSm}" data-copy-trigger="${rowId}" title="Copy SQL">
        <i class="iconoir-copy"></i> Copy
      </button>
    `;
  }

  return `
    <button class="${styles.copyBtn}" data-copy-trigger title="Copy SQL">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
}

/**
 * Render a single SQL query row with expansion
 */
function renderSQLRow(
  entry: SQLEntry,
  index: number,
  styles: StyleConfig,
  options: SQLPanelOptions
): string {
  const duration = formatDuration(entry.duration, options.slowThresholdMs);
  const isSlow = duration.isSlow;
  const hasError = !!entry.error;
  const rowId = `sql-row-${index}`;
  const rawQuery = entry.query || '';
  const highlightedSQL = highlightSQL(rawQuery, true);

  const rowClasses = [styles.expandableRow];
  if (isSlow) rowClasses.push(styles.slowQuery);
  if (hasError) rowClasses.push(styles.errorQuery);
  const durationClass = isSlow ? styles.durationSlow : '';

  const copyButton = renderCopyButton(styles, options.useIconCopyButton || false, rowId);

  return `
    <tr class="${rowClasses.join(' ')}" data-row-id="${rowId}">
      <td class="${styles.duration} ${durationClass}">${duration.text}</td>
      <td>${escapeHTML(formatNumber(entry.row_count ?? '-'))}</td>
      <td class="${styles.timestamp}">${escapeHTML(formatTimestamp(entry.timestamp))}</td>
      <td>${hasError ? `<span class="${styles.badgeError}">Error</span>` : ''}</td>
      <td class="${styles.queryText}"><span class="${styles.expandIcon}">&#9654;</span>${escapeHTML(rawQuery)}</td>
    </tr>
    <tr class="${styles.expansionRow}" data-expansion-for="${rowId}">
      <td colspan="5">
        <div class="${styles.expandedContent}" data-copy-content="${escapeHTML(rawQuery)}">
          <div class="${styles.expandedContentHeader}">
            ${copyButton}
          </div>
          <pre>${highlightedSQL}</pre>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Render the SQL panel table
 *
 * @param queries - Array of SQL entries to render
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the SQL panel
 */
export function renderSQLPanel(
  queries: SQLEntry[],
  styles: StyleConfig,
  options: SQLPanelOptions = {}
): string {
  const {
    newestFirst = true,
    slowThresholdMs = 50,
    maxEntries = 50,
    showSortToggle = false,
    useIconCopyButton = false,
  } = options;

  const sortToggle = showSortToggle ? renderSortToggle('sql', newestFirst, styles) : '';

  if (!queries.length) {
    return sortToggle + `<div class="${styles.emptyState}">No SQL queries captured</div>`;
  }

  // Apply max entries limit
  let items = maxEntries ? queries.slice(-maxEntries) : queries;

  // Apply sort order
  if (newestFirst) {
    items = [...items].reverse();
  }

  const rows = items
    .map((entry, index) =>
      renderSQLRow(entry, index, styles, {
        ...options,
        slowThresholdMs,
        useIconCopyButton,
      })
    )
    .join('');

  return `
    ${sortToggle}
    <table class="${styles.table}">
      <thead>
        <tr>
          <th>Duration</th>
          <th>Rows</th>
          <th>Time</th>
          <th>Status</th>
          <th>Query</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
