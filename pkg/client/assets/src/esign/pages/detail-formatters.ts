/**
 * E-Sign Detail Page Formatters
 * Applies client-side formatting to detail page elements
 */

import { formatFileSize, formatDateTime } from '../utils/formatters.js';
import { onReady, qsa, qs } from '../utils/dom-helpers.js';

/**
 * Apply file size formatting to elements with data-size-bytes attribute
 */
export function formatSizeElements(parent: ParentNode = document): void {
  qsa<HTMLElement>('[data-size-bytes]', parent).forEach((el) => {
    const bytes = el.getAttribute('data-size-bytes');
    if (bytes) {
      el.textContent = formatFileSize(bytes);
    }
  });
}

/**
 * Apply timestamp formatting to elements with data-timestamp attribute
 */
export function formatTimestampElements(parent: ParentNode = document): void {
  qsa<HTMLElement>('[data-timestamp]', parent).forEach((el) => {
    const ts = el.getAttribute('data-timestamp');
    if (ts) {
      el.textContent = formatDateTime(ts);
    }
  });
}

/**
 * Apply all detail page formatters
 */
export function applyDetailFormatters(parent: ParentNode = document): void {
  formatSizeElements(parent);
  formatTimestampElements(parent);
}

/**
 * Initialize detail page formatters on DOM ready
 */
export function initDetailFormatters(): void {
  onReady(() => {
    applyDetailFormatters();
  });
}

// Auto-init on module load
if (typeof document !== 'undefined') {
  initDetailFormatters();
}
