import type { DurationResult } from './types.js';
/**
 * Escape HTML special characters to prevent XSS
 */
export declare const escapeHTML: (value: unknown) => string;
/**
 * Format a timestamp value to a locale time string
 */
export declare const formatTimestamp: (value: unknown) => string;
/**
 * Format a duration value (in nanoseconds) to a human-readable string.
 * Returns both the formatted text and whether it exceeds the slow threshold.
 *
 * Accepts preformatted string durations and returns them verbatim (with isSlow=false).
 */
export declare const formatDuration: (value: unknown, slowThresholdMs?: number) => DurationResult;
/**
 * Format a duration value to just the text string (for backwards compatibility)
 */
export declare const formatDurationText: (value: unknown, slowThresholdMs?: number) => string;
/**
 * Check if a duration value exceeds the slow threshold
 */
export declare const isSlowDuration: (value: unknown, slowThresholdMs?: number) => boolean;
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
export declare const formatJSON: (value: unknown, options?: FormatJSONOptions) => string;
/**
 * Truncate a string to a maximum length, adding ellipsis if truncated
 */
export declare const truncate: (str: string, len: number) => string;
/**
 * Format a number with locale-specific thousands separators
 */
export declare const formatNumber: (value: unknown) => string;
/**
 * Count the number of items in a value (array length, object keys, or 1 for primitives)
 */
export declare const countPayload: (value: unknown) => number;
/**
 * Get a CSS class suffix based on HTTP status code
 */
export declare const getStatusClass: (status: number | undefined) => string;
/**
 * Get a CSS class suffix based on log level
 */
export declare const getLevelClass: (level: string | undefined) => string;
/**
 * Format a byte count as a human-readable string (e.g., "1.2 KB", "3.5 MB")
 */
export declare const formatBytes: (bytes: number | undefined) => string;
/**
 * Ensure a value is an array (returns empty array if not)
 */
export declare const ensureArray: <T>(value: unknown) => T[];
//# sourceMappingURL=utils.d.ts.map