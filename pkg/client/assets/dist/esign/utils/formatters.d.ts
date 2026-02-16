/**
 * E-Sign Formatters
 * Common formatting utilities for dates, file sizes, and document metadata
 */
/**
 * Format bytes to human-readable file size
 */
export declare function formatFileSize(bytes: number | string | undefined | null): string;
/**
 * Format page count with proper pluralization
 */
export declare function formatPageCount(count: number | string | undefined | null): string;
/**
 * Format date/time for display
 */
export declare function formatDateTime(value: string | Date | undefined | null, options?: Intl.DateTimeFormatOptions): string;
/**
 * Format date only (no time)
 */
export declare function formatDate(value: string | Date | undefined | null, options?: Intl.DateTimeFormatOptions): string;
/**
 * Format time only (no date)
 */
export declare function formatTime(value: string | Date | undefined | null, options?: Intl.DateTimeFormatOptions): string;
/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export declare function formatRelativeTime(value: string | Date | undefined | null): string;
/**
 * Format recipient count with proper pluralization
 */
export declare function formatRecipientCount(count: number | undefined | null): string;
/**
 * Capitalize first letter of a string
 */
export declare function capitalize(str: string): string;
/**
 * Convert snake_case to Title Case
 */
export declare function snakeToTitle(str: string): string;
/**
 * Truncate string with ellipsis
 */
export declare function truncate(str: string, maxLength: number): string;
//# sourceMappingURL=formatters.d.ts.map