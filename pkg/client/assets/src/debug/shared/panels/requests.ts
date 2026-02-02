// Shared requests panel renderer
// Used by both the full debug console and the debug toolbar

import type { RequestEntry, PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
import {
  escapeHTML,
  formatTimestamp,
  formatDuration,
  formatBytes,
  truncate,
} from '../utils.js';
import { highlightJSON } from '../../syntax-highlight.js';

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
  /** Set of expanded request IDs (preserved across re-renders). */
  expandedRequestIds?: Set<string>;
  /** Placeholder string used for masked values. Defaults to '***'. */
  maskPlaceholder?: string;
  /** Maximum length for header/query values in the detail pane (toolbar truncation). */
  maxDetailLength?: number;
};

/**
 * Generate a stable key for a request entry.
 * Uses entry.id if available, otherwise falls back to timestamp + index.
 */
export function getRequestKey(entry: RequestEntry, index: number): string {
  if (entry.id) return entry.id;
  return `${entry.timestamp || ''}-${index}`;
}

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
 * Render the detail pane content for a single request entry.
 * Shows: Metadata line, Request Headers, Query Parameters,
 * Request Body, Response Headers, Response Body, and Error.
 * Sections are omitted when data is absent.
 */
export function renderRequestDetail(
  entry: RequestEntry,
  styles: StyleConfig,
  options: { maskPlaceholder?: string; maxDetailLength?: number } = {}
): string {
  const { maskPlaceholder = '***', maxDetailLength } = options;
  const sections: string[] = [];

  // 1. Metadata line (Request ID + Remote IP + Content-Type)
  const metaParts: string[] = [];
  if (entry.id) {
    metaParts.push(`<span>ID: <code>${escapeHTML(entry.id)}</code></span>`);
  }
  if (entry.remote_ip) {
    metaParts.push(`<span>IP: <code>${escapeHTML(entry.remote_ip)}</code></span>`);
  }
  if (entry.content_type) {
    metaParts.push(`<span>Content-Type: <code>${escapeHTML(entry.content_type)}</code></span>`);
  }
  if (metaParts.length > 0) {
    sections.push(`<div class="${styles.detailMetadataLine}">${metaParts.join('')}</div>`);
  }

  // 2. Request Headers
  if (entry.headers && Object.keys(entry.headers).length > 0) {
    const items = Object.entries(entry.headers)
      .map(([key, value]) => {
        const displayValue =
          maxDetailLength && value.length > maxDetailLength
            ? truncate(value, maxDetailLength)
            : value;
        const maskedIndicator =
          value === maskPlaceholder
            ? ` <span class="${styles.detailMasked}">(masked)</span>`
            : '';
        return `<dt>${escapeHTML(key)}</dt><dd>${escapeHTML(displayValue)}${maskedIndicator}</dd>`;
      })
      .join('');
    sections.push(`
      <div class="${styles.detailSection}">
        <span class="${styles.detailLabel}">Request Headers</span>
        <dl class="${styles.detailKeyValueTable}">${items}</dl>
      </div>
    `);
  }

  // 3. Query Parameters
  if (entry.query && Object.keys(entry.query).length > 0) {
    const items = Object.entries(entry.query)
      .map(([key, value]) => {
        const maskedIndicator =
          value === maskPlaceholder
            ? ` <span class="${styles.detailMasked}">(masked)</span>`
            : '';
        return `<dt>${escapeHTML(key)}</dt><dd>${escapeHTML(value)}${maskedIndicator}</dd>`;
      })
      .join('');
    sections.push(`
      <div class="${styles.detailSection}">
        <span class="${styles.detailLabel}">Query Parameters</span>
        <dl class="${styles.detailKeyValueTable}">${items}</dl>
      </div>
    `);
  }

  // 4. Request Body
  if (entry.request_body) {
    const sizeLabel = entry.request_size ? ` (${formatBytes(entry.request_size)})` : '';
    const truncatedLabel = entry.body_truncated ? ' <span class="' + styles.detailMasked + '">(truncated)</span>' : '';
    let bodyContent: string;
    try {
      const parsed = JSON.parse(entry.request_body);
      bodyContent = highlightJSON(parsed, true);
    } catch {
      bodyContent = escapeHTML(entry.request_body);
    }
    sections.push(`
      <div class="${styles.detailSection}">
        <span class="${styles.detailLabel}">Request Body${sizeLabel}${truncatedLabel}</span>
        <div class="${styles.detailBody}">
          <pre>${bodyContent}</pre>
        </div>
        <button class="${styles.copyBtnSm}" data-copy-trigger="${escapeHTML(entry.request_body)}">Copy</button>
      </div>
    `);
  }

  // 5. Response Headers
  if (entry.response_headers && Object.keys(entry.response_headers).length > 0) {
    const items = Object.entries(entry.response_headers)
      .map(([key, value]) => {
        const displayValue =
          maxDetailLength && value.length > maxDetailLength
            ? truncate(value, maxDetailLength)
            : value;
        return `<dt>${escapeHTML(key)}</dt><dd>${escapeHTML(displayValue)}</dd>`;
      })
      .join('');
    sections.push(`
      <div class="${styles.detailSection}">
        <span class="${styles.detailLabel}">Response Headers</span>
        <dl class="${styles.detailKeyValueTable}">${items}</dl>
      </div>
    `);
  }

  // 6. Response Body
  if (entry.response_body) {
    const sizeLabel = entry.response_size ? ` (${formatBytes(entry.response_size)})` : '';
    let bodyContent: string;
    try {
      const parsed = JSON.parse(entry.response_body);
      bodyContent = highlightJSON(parsed, true);
    } catch {
      bodyContent = escapeHTML(entry.response_body);
    }
    sections.push(`
      <div class="${styles.detailSection}">
        <span class="${styles.detailLabel}">Response Body${sizeLabel}</span>
        <div class="${styles.detailBody}">
          <pre>${bodyContent}</pre>
        </div>
        <button class="${styles.copyBtnSm}" data-copy-trigger="${escapeHTML(entry.response_body)}">Copy</button>
      </div>
    `);
  }

  // 7. Error
  if (entry.error) {
    sections.push(`
      <div class="${styles.detailSection}">
        <div class="${styles.detailError}">${escapeHTML(entry.error)}</div>
      </div>
    `);
  }

  if (sections.length === 0) {
    return `<div class="${styles.detailPane}"><span class="${styles.muted}">No additional details available</span></div>`;
  }

  return `<div class="${styles.detailPane}">${sections.join('')}</div>`;
}

/**
 * Render a single request row with its hidden detail row
 */
function renderRequestRow(
  entry: RequestEntry,
  index: number,
  styles: StyleConfig,
  options: RequestsPanelOptions
): string {
  const method = entry.method || 'GET';
  const path = entry.path || '';
  const statusCode = entry.status || 0;
  const duration = formatDuration(entry.duration, options.slowThresholdMs);
  const requestKey = getRequestKey(entry, index);
  const isExpanded = options.expandedRequestIds?.has(requestKey) || false;

  const methodClass = styles.badgeMethod(method);
  const statusClass = styles.badgeStatus(statusCode);
  const durationClass = duration.isSlow ? styles.durationSlow : '';
  const rowClass = statusCode >= 400 ? styles.rowError : '';

  const displayPath = options.truncatePath
    ? truncate(path, options.maxPathLength || 50)
    : path;

  // Content-Type badge for POST/PUT/PATCH
  let contentTypeBadge = '';
  const methodUpper = method.toUpperCase();
  if (methodUpper === 'POST' || methodUpper === 'PUT' || methodUpper === 'PATCH') {
    const contentType =
      entry.content_type ||
      entry.headers?.['Content-Type'] ||
      entry.headers?.['content-type'] ||
      '';
    const shortType = contentType.split(';')[0].trim();
    if (shortType) {
      contentTypeBadge = ` <span class="${styles.badgeContentType}">${escapeHTML(shortType)}</span>`;
    }
  }

  // Expand chevron indicator
  const expandIcon = `<span class="${styles.expandIcon}" data-expand-icon>${isExpanded ? '\u25BC' : '\u25B6'}</span>`;

  // Detail row
  const detailDisplay = isExpanded ? 'table-row' : 'none';
  const detailHTML = renderRequestDetail(entry, styles, {
    maskPlaceholder: options.maskPlaceholder,
    maxDetailLength: options.maxDetailLength,
  });

  return `
    <tr class="${rowClass}" data-request-id="${escapeHTML(requestKey)}" style="cursor:pointer">
      <td>${expandIcon}<span class="${methodClass}">${escapeHTML(method)}</span>${contentTypeBadge}</td>
      <td class="${styles.path}" title="${escapeHTML(path)}">${escapeHTML(displayPath)}</td>
      <td><span class="${statusClass}">${escapeHTML(statusCode || '-')}</span></td>
      <td class="${styles.duration} ${durationClass}">${duration.text}</td>
      <td class="${styles.timestamp}">${escapeHTML(formatTimestamp(entry.timestamp))}</td>
    </tr>
    <tr class="${styles.detailRow}" data-detail-for="${escapeHTML(requestKey)}" style="display:${detailDisplay}">
      <td colspan="5">${detailHTML}</td>
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
  const startIndex = maxEntries ? Math.max(0, requests.length - maxEntries) : 0;
  let items = maxEntries ? requests.slice(-maxEntries) : requests;

  // Map entries with their original indices for stable keys
  let indexed = items.map((entry, i) => ({ entry, originalIndex: startIndex + i }));

  // Apply sort order
  if (newestFirst) {
    indexed = [...indexed].reverse();
  }

  const rows = indexed
    .map(({ entry, originalIndex }) =>
      renderRequestRow(entry, originalIndex, styles, {
        ...options,
        slowThresholdMs,
        truncatePath,
        maxPathLength,
      })
    )
    .join('');

  return `
    ${sortToggle}
    <table class="${styles.table}" data-request-table>
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
