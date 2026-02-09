/**
 * Formatting utilities for tab panels
 */
/**
 * Escape HTML special characters to prevent XSS
 */
export declare function escapeHTML(raw: unknown): string;
/**
 * Format a number with locale-specific separators
 */
export declare function formatNumber(value: unknown): string;
/**
 * Parse a timestamp string into a Date object
 */
export declare function parseTimestamp(value: unknown): Date | null;
/**
 * Format a timestamp as an absolute date/time string
 */
export declare function formatAbsoluteTime(value: unknown): string;
/**
 * Format a timestamp as a relative time string (e.g., "2 hours ago")
 */
export declare function formatRelativeTime(value: unknown): string;
/**
 * Hydrate time elements in a container with formatted timestamps
 */
export declare function hydrateTimeElements(root?: Element | Document | null): void;
/**
 * Check if a value is empty
 */
export declare function isEmptyValue(value: unknown): boolean;
//# sourceMappingURL=formatters.d.ts.map