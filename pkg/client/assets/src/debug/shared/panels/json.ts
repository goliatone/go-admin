// Shared JSON panel renderer
// Used by both the full debug console and the debug toolbar
// Handles template, session, config, and similar JSON data panels

import type { StyleConfig } from '../styles.js';
import { escapeHTML, formatJSON, formatNumber, countPayload } from '../utils.js';
import { highlightJSON } from '../../syntax-highlight.js';

/**
 * Options for rendering the JSON panel
 */
export type JSONPanelOptions = {
  /** Whether to use icon-based copy button (console) vs SVG-based (toolbar). Defaults to false. */
  useIconCopyButton?: boolean;
  /** Optional pre-filter function for the data (e.g., JSONPath search in console). */
  filterFn?: (data: Record<string, unknown>) => Record<string, unknown>;
  /** Whether to show key/item count. Defaults to true. */
  showCount?: boolean;
};

/**
 * Render the copy button based on style (icon vs SVG)
 */
function renderCopyButton(styles: StyleConfig, useIcon: boolean, copyId: string): string {
  if (useIcon) {
    return `
      <button class="${styles.copyBtn}" data-copy-trigger="${copyId}" title="Copy to clipboard">
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
 * Render a JSON panel with syntax highlighting and copy functionality
 *
 * @param title - Panel title to display
 * @param data - The data object to render as JSON
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the JSON panel
 */
export function renderJSONPanel(
  title: string,
  data: Record<string, unknown> | unknown,
  styles: StyleConfig,
  options: JSONPanelOptions = {}
): string {
  const {
    useIconCopyButton = false,
    filterFn,
    showCount = true,
  } = options;

  // Determine data type
  const isObject = data && typeof data === 'object' && !Array.isArray(data);
  const isArray = Array.isArray(data);

  // Apply optional filter
  let displayData = data ?? {};
  if (isObject && filterFn) {
    displayData = filterFn(data as Record<string, unknown>);
  }

  // Check if empty
  const isEmpty =
    (isObject && Object.keys(displayData as Record<string, unknown>).length === 0) ||
    (isArray && (displayData as unknown[]).length === 0) ||
    (!isObject && !isArray && !displayData);

  if (isEmpty) {
    return `<div class="${styles.emptyState}">No ${title.toLowerCase()} data available</div>`;
  }

  const rawJSON = formatJSON(displayData);
  const highlighted = highlightJSON(displayData, true);
  const count = countPayload(displayData);
  const unit = isArray ? 'items' : isObject ? 'keys' : 'entries';
  const copyId = `copy-${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  const copyButton = renderCopyButton(styles, useIconCopyButton, copyId);
  const countDisplay = showCount
    ? `<span class="${styles.muted}">${formatNumber(count)} ${unit}</span>`
    : '';

  return `
    <section class="${styles.jsonPanel}" data-copy-content="${escapeHTML(rawJSON)}">
      <div class="${styles.jsonHeader}">
        <span class="${styles.jsonViewerTitle}">${escapeHTML(title)}</span>
        <div class="${styles.jsonActions}">
          ${countDisplay}
          ${copyButton}
        </div>
      </div>
      <pre>${highlighted}</pre>
    </section>
  `;
}

/**
 * Render a simple JSON viewer without title/header (for embedding in other panels)
 *
 * @param data - The data object to render as JSON
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the JSON viewer
 */
export function renderJSONViewer(
  data: Record<string, unknown> | unknown,
  styles: StyleConfig,
  options: JSONPanelOptions = {}
): string {
  const { useIconCopyButton = false } = options;

  if (!data || (typeof data === 'object' && Object.keys(data as object).length === 0)) {
    return '';
  }

  const rawJSON = formatJSON(data);
  const highlighted = highlightJSON(data, true);

  const copyButton = renderCopyButton(styles, useIconCopyButton, `viewer-${Date.now()}`);

  return `
    <div class="${styles.jsonViewer}" data-copy-content="${escapeHTML(rawJSON)}">
      <div class="${styles.jsonViewerHeader}">
        ${copyButton}
      </div>
      <pre>${highlighted}</pre>
    </div>
  `;
}
