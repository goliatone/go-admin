/**
 * E-Sign Formatters
 * Common formatting utilities for dates, file sizes, and document metadata
 */

import { escapeHTML as escapeHtml } from '../../shared/html.js';
import { formatByteSize } from '../../shared/size-formatters.js';

/**
 * Format bytes to human-readable file size
 */
export function formatFileSize(bytes: number | string | undefined | null): string {
  return formatByteSize(bytes, {
    emptyFallback: '-',
    zeroFallback: '-',
    invalidFallback: '-',
    precisionByUnit: [0, 1, 2, 2],
  }) as string;
}

/**
 * Format page count with proper pluralization
 */
export function formatPageCount(count: number | string | undefined | null): string {
  if (!count) return '-';
  const numCount = typeof count === 'string' ? parseInt(count, 10) : count;
  if (!Number.isFinite(numCount) || numCount <= 0) return '-';
  return numCount === 1 ? '1 page' : `${numCount} pages`;
}

/**
 * Format date/time for display
 */
export function formatDateTime(
  value: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '-';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '-';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      dateStyle: 'short',
      timeStyle: 'short',
    };

    return date.toLocaleString(undefined, options || defaultOptions);
  } catch {
    return String(value);
  }
}

/**
 * Format date/time using the compact page-controller style used by legacy e-sign pages.
 */
export function formatCompactDateTime(
  value: string | Date | undefined | null
): string {
  if (!value) return '-';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '-';

    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return String(value);
  }
}

/**
 * Format date only (no time)
 */
export function formatDate(
  value: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '-';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '-';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      dateStyle: 'medium',
    };

    return date.toLocaleDateString(undefined, options || defaultOptions);
  } catch {
    return String(value);
  }
}

/**
 * Format time only (no date)
 */
export function formatTime(
  value: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '-';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '-';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    return date.toLocaleTimeString(undefined, options || defaultOptions);
  } catch {
    return String(value);
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(value: string | Date | undefined | null): string {
  if (!value) return '-';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '-';

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

    if (Math.abs(diffDay) >= 1) {
      return rtf.format(diffDay, 'day');
    }
    if (Math.abs(diffHour) >= 1) {
      return rtf.format(diffHour, 'hour');
    }
    if (Math.abs(diffMin) >= 1) {
      return rtf.format(diffMin, 'minute');
    }
    return rtf.format(diffSec, 'second');
  } catch {
    return String(value);
  }
}

/**
 * Format date/time for source-management runtime display, preserving escaped
 * invalid input and the existing locale-string rendering shape.
 */
export function formatSourceManagementDateTime(
  value: string | Date | undefined | null
): string {
  const input = String(value ?? '').trim();
  if (!input) return '-';

  const date = value instanceof Date ? value : new Date(input);
  if (Number.isNaN(date.getTime())) return escapeHtml(input);

  return escapeHtml(date.toLocaleString());
}

/**
 * Format relative time for source-management runtime display.
 */
export function formatSourceManagementRelativeTime(
  value: string | Date | undefined | null
): string {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format a date/time string for lineage presentation view models. Invalid or
 * empty input returns `undefined` to preserve optional display fields.
 */
export function formatLineageDateTime(
  value: string | Date | undefined | null
): string | undefined {
  if (!value) return undefined;

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toLocaleString();
  } catch {
    return undefined;
  }
}

/**
 * Format a Google Drive modified date using the legacy date-only display
 * contract expected by the Drive picker and related helpers.
 */
export function formatGoogleDriveDate(
  value: string | Date | undefined | null
): string {
  if (!value) return '-';

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString();
  } catch {
    return String(value);
  }
}

/**
 * Format recipient count with proper pluralization
 */
export function formatRecipientCount(count: number | undefined | null): string {
  if (count === undefined || count === null) return '0 recipients';
  return count === 1 ? '1 recipient' : `${count} recipients`;
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitle(str: string): string {
  if (!str) return '';
  return str
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}
