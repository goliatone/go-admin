// Shared utility functions for debug panels
// Used by both the full debug console and the debug toolbar

import type { DurationResult } from './types.js';

/**
 * Escape HTML special characters to prevent XSS
 */
export const escapeHTML = (value: unknown): string => {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Format a timestamp value to a locale time string
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
 * Format a duration value (in nanoseconds) to a human-readable string.
 * Returns both the formatted text and whether it exceeds the slow threshold.
 *
 * Accepts preformatted string durations and returns them verbatim (with isSlow=false).
 */
export const formatDuration = (value: unknown, slowThresholdMs = 50): DurationResult => {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return { text: '0ms', isSlow: false };
  }

  // Accept preformatted string durations (pass-through)
  if (typeof value === 'string') {
    const ms = parseDurationMsFromString(value);
    const isSlow = ms !== null && ms >= slowThresholdMs;
    return { text: value, isSlow };
  }

  const nanos = Number(value);
  if (Number.isNaN(nanos)) {
    return { text: '0ms', isSlow: false };
  }

  const ms = nanos / 1e6;
  const isSlow = ms >= slowThresholdMs;

  if (ms < 1) {
    const micros = nanos / 1e3;
    return { text: `${micros.toFixed(1)}µs`, isSlow };
  }
  if (ms < 1000) {
    return { text: `${ms.toFixed(2)}ms`, isSlow };
  }
  return { text: `${(ms / 1000).toFixed(2)}s`, isSlow };
};

/**
 * Format a duration value to just the text string (for backwards compatibility)
 */
export const formatDurationText = (value: unknown, slowThresholdMs = 50): string => {
  return formatDuration(value, slowThresholdMs).text;
};

/**
 * Check if a duration value exceeds the slow threshold
 */
export const isSlowDuration = (value: unknown, slowThresholdMs = 50): boolean => {
  const ms = parseDurationMs(value);
  if (ms === null) {
    return false;
  }
  return ms >= slowThresholdMs;
};

/**
 * Options for formatJSON
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
 * Truncate a string to a maximum length, adding ellipsis if truncated
 */
export const truncate = (str: string, len: number): string => {
  if (!str) {
    return '';
  }
  return str.length > len ? str.substring(0, len) + '...' : str;
};

const parseDurationMsFromString = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^([0-9]*\.?[0-9]+)\s*(ns|µs|us|ms|s)?$/i);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  if (Number.isNaN(amount)) {
    return null;
  }
  const unit = (match[2] || 'ms').toLowerCase();
  switch (unit) {
    case 'ns':
      return amount / 1e6;
    case 'us':
    case 'µs':
      return amount / 1e3;
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    default:
      return null;
  }
};

const parseDurationMs = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return parseDurationMsFromString(value);
  }
  const nanos = Number(value);
  if (Number.isNaN(nanos)) {
    return null;
  }
  return nanos / 1e6;
};

/**
 * Format a number with locale-specific thousands separators
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
 * Count the number of items in a value (array length, object keys, or 1 for primitives)
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

/**
 * Get a CSS class suffix based on HTTP status code
 */
export const getStatusClass = (status: number | undefined): string => {
  if (!status) {
    return '';
  }
  if (status >= 500) {
    return 'error';
  }
  if (status >= 400) {
    return 'warn';
  }
  return '';
};

/**
 * Get a CSS class suffix based on log level
 */
export const getLevelClass = (level: string | undefined): string => {
  if (!level) {
    return 'info';
  }
  const l = level.toLowerCase();
  if (l === 'error' || l === 'fatal') {
    return 'error';
  }
  if (l === 'warn' || l === 'warning') {
    return 'warn';
  }
  if (l === 'debug' || l === 'trace') {
    return 'debug';
  }
  return 'info';
};

/**
 * Ensure a value is an array (returns empty array if not)
 */
export const ensureArray = <T>(value: unknown): T[] => {
  return Array.isArray(value) ? value : [];
};
