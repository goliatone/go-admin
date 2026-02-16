/**
 * E-Sign Formatters
 * Common formatting utilities for dates, file sizes, and document metadata
 */

/**
 * Format bytes to human-readable file size
 */
export function formatFileSize(bytes: number | string | undefined | null): string {
  if (bytes === undefined || bytes === null || bytes === '' || bytes === 0) return '-';
  const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (!Number.isFinite(numBytes) || numBytes <= 0) return '-';

  if (numBytes < 1024) return `${numBytes} B`;
  if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
  return `${(numBytes / (1024 * 1024)).toFixed(2)} MB`;
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
