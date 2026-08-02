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
export interface RelativeTimeVerbosePastOptions {
    emptyFallback?: string;
    invalidFallback?: string;
}
export declare function parseTimeValue(value: unknown): Date | null;
export declare function formatAbsoluteDateTime(value: unknown, options?: AbsoluteTimeFormatOptions): string;
export declare function formatRelativeTimeCompactPast(value: unknown, options?: RelativeTimeCompactPastOptions): string;
export declare function formatRelativeTimeNatural(value: unknown, options?: RelativeTimeNaturalOptions): string;
export declare function formatRelativeTimeVerbosePast(value: unknown, options?: RelativeTimeVerbosePastOptions): string;
//# sourceMappingURL=time-formatters.d.ts.map