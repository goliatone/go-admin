/**
 * Formatting utilities for tab panels
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHTML(raw: unknown): string {
  const text = String(raw || '');
  return text.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m] || m));
}

/**
 * Format a number with locale-specific separators
 */
export function formatNumber(value: unknown): string {
  if (typeof value === 'number') return value.toLocaleString();
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Parse a timestamp string into a Date object
 */
export function parseTimestamp(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format a timestamp as an absolute date/time string
 */
export function formatAbsoluteTime(value: unknown): string {
  const parsed = parseTimestamp(value);
  if (!parsed) return String(value || '');
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

/**
 * Format a timestamp as a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(value: unknown): string {
  const parsed = parseTimestamp(value);
  if (!parsed) return String(value || '');

  const diffMs = parsed.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  const second = 1000;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  if (absMs < minute) return rtf.format(Math.round(diffMs / second), 'second');
  if (absMs < hour) return rtf.format(Math.round(diffMs / minute), 'minute');
  if (absMs < day) return rtf.format(Math.round(diffMs / hour), 'hour');
  if (absMs < month) return rtf.format(Math.round(diffMs / day), 'day');
  if (absMs < year) return rtf.format(Math.round(diffMs / month), 'month');
  return rtf.format(Math.round(diffMs / year), 'year');
}

/**
 * Hydrate time elements in a container with formatted timestamps
 */
export function hydrateTimeElements(root?: Element | Document | null): void {
  const scope = root || document;

  scope.querySelectorAll('[data-relative-time]').forEach((node) => {
    const raw = node.getAttribute('data-relative-time');
    if (!raw) return;
    node.textContent = formatRelativeTime(raw);
    const absolute = formatAbsoluteTime(raw);
    if (absolute) node.setAttribute('title', absolute);
  });

  scope.querySelectorAll('[data-absolute-time]').forEach((node) => {
    const raw = node.getAttribute('data-absolute-time');
    if (!raw) return;
    const absolute = formatAbsoluteTime(raw);
    node.textContent = absolute;
    if (absolute) node.setAttribute('title', absolute);
  });
}

/**
 * Check if a value is empty
 */
export function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}
