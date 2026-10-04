// Neutral formatting and binding helpers used by console renderers.

export { escapeHTML, escapeAttribute } from '../shared/html.js';

/**
 * Format a timestamp value to a locale time string.
 */
export const formatTimestamp = (value: unknown): string => {
  if (!value) {
    return '';
  }
  if (typeof value === 'number') {
    return new Date(value).toLocaleTimeString();
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString();
    }
    return value;
  }
  return '';
};

/**
 * Options for formatJSON.
 */
export type FormatJSONOptions = {
  /** If true, return '{}' for null/undefined values. Defaults to true. */
  nullAsEmptyObject?: boolean;
  /** Indentation spaces. Defaults to 2. */
  indent?: number;
};

/**
 * Format a value as a JSON string.
 * Defaults to '{}' for null/undefined (configurable via options).
 */
export const formatJSON = (value: unknown, options?: FormatJSONOptions): string => {
  const { nullAsEmptyObject = true, indent = 2 } = options || {};

  if (value === undefined || value === null) {
    return nullAsEmptyObject ? '{}' : 'null';
  }

  try {
    return JSON.stringify(value, null, indent);
  } catch {
    return String(value ?? '');
  }
};

/**
 * Format a number with locale-specific thousands separators.
 */
export const formatNumber = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return String(value);
  }
  return num.toLocaleString();
};

/**
 * Count the number of items in a value (array length, object keys, or 1 for primitives).
 */
export const countPayload = (value: unknown): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (Array.isArray(value)) {
    return value.length;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length;
  }
  return 1;
};

/** Small, stable djb2 hash for deterministic fallback row keys. */
export function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/** Display text for an arbitrary JSON value. */
export function textValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Resolve a declarative bind path (`$.a.b` or `a.b`) against data. An empty
 * path resolves to the data itself.
 */
export function pathValue(data: unknown, bind: unknown): unknown {
  const path = typeof bind === 'string' ? bind.trim().replace(/^\$\./, '') : '';
  if (!path) {
    return data;
  }
  return path.split('.').filter(Boolean).reduce<unknown>((current, part) => {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    return (current as Record<string, unknown>)[part];
  }, data);
}

/**
 * Short form of a long identifier for prose: the first run of eight hex
 * digits (the distinctive part of "receipt-1071a4f9-…" or a UUID), else the
 * first eight characters. Identifiers of twelve characters or fewer stay whole.
 */
export function shortIdentifier(value: unknown): string {
  const id = textValue(value);
  if (id.length <= 12) return id;
  const match = /[0-9a-fA-F]{8}/.exec(id);
  return `${match ? match[0] : id.slice(0, 8)}…`;
}
