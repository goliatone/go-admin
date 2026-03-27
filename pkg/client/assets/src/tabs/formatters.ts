export { escapeHTML } from '../shared/html.js';
import {
  formatAbsoluteDateTime,
  formatRelativeTimeNatural,
  parseTimeValue,
} from '../shared/time-formatters.js';

/**
 * Formatting utilities for tab panels
 */

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
  return parseTimeValue(value);
}

/**
 * Format a timestamp as an absolute date/time string
 */
export function formatAbsoluteTime(value: unknown): string {
  return formatAbsoluteDateTime(value, {
    emptyFallback: '',
    invalidFallback: '__ORIGINAL__',
  });
}

/**
 * Format a timestamp as a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(value: unknown): string {
  return formatRelativeTimeNatural(value, {
    emptyFallback: '',
    invalidFallback: '__ORIGINAL__',
    numeric: 'auto',
    direction: 'bidirectional',
  });
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
