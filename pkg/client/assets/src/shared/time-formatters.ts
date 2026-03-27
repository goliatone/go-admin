/**
 * Shared time formatting helpers used by multiple frontend runtimes.
 */

export interface AbsoluteTimeFormatOptions {
  emptyFallback?: string;
  invalidFallback?: string;
}

export interface RelativeTimeCompactPastOptions {
  emptyFallback?: string;
  invalidFallback?: string;
}

export interface RelativeTimeNaturalOptions {
  emptyFallback?: string;
  invalidFallback?: string;
  locale?: string;
  numeric?: 'always' | 'auto';
  direction?: 'past-only' | 'bidirectional';
  maxRelativeDays?: number;
}

function resolveFallback(value: unknown, emptyFallback: string, invalidFallback: string): string {
  if (value === null || value === undefined || value === '') {
    return emptyFallback;
  }
  return invalidFallback === '__ORIGINAL__' ? String(value) : invalidFallback;
}

export function parseTimeValue(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;

  const parsed = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatAbsoluteDateTime(
  value: unknown,
  options: AbsoluteTimeFormatOptions = {}
): string {
  const {
    emptyFallback = '',
    invalidFallback = '__ORIGINAL__',
  } = options;

  const parsed = parseTimeValue(value);
  if (!parsed) return resolveFallback(value, emptyFallback, invalidFallback);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function formatRelativeTimeCompactPast(
  value: unknown,
  options: RelativeTimeCompactPastOptions = {}
): string {
  const {
    emptyFallback = '',
    invalidFallback = '__ORIGINAL__',
  } = options;

  const parsed = parseTimeValue(value);
  if (!parsed) return resolveFallback(value, emptyFallback, invalidFallback);

  const diffMs = Date.now() - parsed.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return parsed.toLocaleDateString();
}

export function formatRelativeTimeNatural(
  value: unknown,
  options: RelativeTimeNaturalOptions = {}
): string {
  const {
    emptyFallback = '',
    invalidFallback = '__ORIGINAL__',
    locale,
    numeric = 'auto',
    direction = 'bidirectional',
    maxRelativeDays,
  } = options;

  const parsed = parseTimeValue(value);
  if (!parsed) return resolveFallback(value, emptyFallback, invalidFallback);

  const diffMs =
    direction === 'past-only'
      ? Date.now() - parsed.getTime()
      : parsed.getTime() - Date.now();

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric });

  if (direction === 'past-only') {
    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return rtf.format(-diffMins, 'minute');
    if (diffHours < 24) return rtf.format(-diffHours, 'hour');
    if (diffDays < 7) return rtf.format(-diffDays, 'day');
    if (typeof maxRelativeDays === 'number' && diffDays < maxRelativeDays) {
      const weeks = Math.floor(diffDays / 7);
      return rtf.format(-weeks, 'week');
    }
    return parsed.toLocaleDateString();
  }

  const absMs = Math.abs(diffMs);
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
