// Shared custom data panel renderer
// Used by both the full debug console and the debug toolbar

import type { CustomSnapshot, CustomLogEntry } from '../types.js';
import type { StyleConfig } from '../styles.js';
import { escapeHTML, formatTimestamp, formatJSON, formatNumber, countPayload } from '../utils.js';
import { highlightJSON } from '../../syntax-highlight.js';

/**
 * Options for rendering the custom panel
 */
export type CustomPanelOptions = {
  /** Maximum number of log entries to display. Defaults to 50. */
  maxLogEntries?: number;
  /** Whether to use icon-based copy button (console) vs SVG-based (toolbar). Defaults to false. */
  useIconCopyButton?: boolean;
  /** Whether to show key count. Defaults to true. */
  showCount?: boolean;
  /** Optional filter function for custom data (e.g., search in console). */
  dataFilterFn?: (data: Record<string, unknown>) => Record<string, unknown>;
};

/**
 * Render the copy button based on style (icon vs SVG)
 */
function renderCopyButton(styles: StyleConfig, useIcon: boolean): string {
  if (useIcon) {
    return `
      <button class="${styles.copyBtn}" data-copy-trigger="custom-data" title="Copy to clipboard">
        <i class="iconoir-copy"></i> Copy
      </button>
    `;
  }

  return `
    <button class="${styles.copyBtn}" data-copy-trigger title="Copy JSON">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
}

/**
 * Render a single custom log row
 */
function renderCustomLogRow(entry: CustomLogEntry, styles: StyleConfig): string {
  return `
    <tr>
      <td><span class="${styles.badgeCustom}">${escapeHTML(entry.category || 'custom')}</span></td>
      <td class="${styles.timestamp}">${escapeHTML(formatTimestamp(entry.timestamp))}</td>
      <td class="${styles.message}">${escapeHTML(entry.message || '')}</td>
    </tr>
  `;
}

/**
 * Render the custom data JSON section
 */
function renderCustomDataSection(
  data: Record<string, unknown>,
  styles: StyleConfig,
  options: CustomPanelOptions
): string {
  const { useIconCopyButton = false, showCount = true } = options;

  const rawJSON = formatJSON(data);
  const highlighted = highlightJSON(data, true);
  const copyButton = renderCopyButton(styles, useIconCopyButton);
  const countDisplay = showCount
    ? `<span class="${styles.muted}">${formatNumber(countPayload(data))} keys</span>`
    : '';

  return `
    <div class="${styles.jsonPanel}" data-copy-content="${escapeHTML(rawJSON)}">
      <div class="${styles.jsonHeader}">
        <span class="${styles.jsonViewerTitle}">Custom Data</span>
        <div class="${styles.jsonActions}">
          ${countDisplay}
          ${copyButton}
        </div>
      </div>
      <div class="${styles.jsonContent}">
        <pre>${highlighted}</pre>
      </div>
    </div>
  `;
}

/**
 * Render the custom logs table section
 */
function renderCustomLogsSection(
  logs: CustomLogEntry[],
  styles: StyleConfig,
  options: CustomPanelOptions
): string {
  const { maxLogEntries = 50 } = options;

  if (!logs.length) {
    return `<div class="${styles.emptyState}">No custom logs yet.</div>`;
  }

  const items = logs.slice(-maxLogEntries).reverse();
  const rows = items.map((entry) => renderCustomLogRow(entry, styles)).join('');

  return `
    <table class="${styles.table}">
      <thead>
        <tr>
          <th>Category</th>
          <th>Time</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/**
 * Render the custom panel with both data and logs sections
 *
 * @param custom - Custom snapshot containing data and logs
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the custom panel
 */
export function renderCustomPanel(
  custom: CustomSnapshot,
  styles: StyleConfig,
  options: CustomPanelOptions = {}
): string {
  const { dataFilterFn } = options;

  const rawData = custom.data || {};
  const data = dataFilterFn ? dataFilterFn(rawData) : rawData;
  const logs = custom.logs || [];

  const hasData = Object.keys(data).length > 0;
  const hasLogs = logs.length > 0;

  if (!hasData && !hasLogs) {
    return `<div class="${styles.emptyState}">No custom data captured</div>`;
  }

  let content = '';

  if (hasData) {
    content += renderCustomDataSection(data, styles, options);
  }

  if (hasLogs) {
    // Add logs section with header
    content += `
      <div class="${styles.jsonPanel}">
        <div class="${styles.jsonHeader}">
          <span class="${styles.jsonViewerTitle}">Custom Logs</span>
          <span class="${styles.muted}">${formatNumber(logs.length)} entries</span>
        </div>
        <div class="${styles.jsonContent}">
          ${renderCustomLogsSection(logs, styles, options)}
        </div>
      </div>
    `;
  }

  // Wrap in grid for side-by-side display when both sections exist
  if (hasData && hasLogs) {
    return `<div class="${styles.jsonGrid}">${content}</div>`;
  }

  return content;
}
