/**
 * E-Sign Async Helpers
 * Utilities for polling, retrying, and async operations
 */
export interface PollOptions<T> {
    /** Function to call on each poll */
    fn: () => Promise<T>;
    /** Function to check if polling should stop (return true to stop) */
    until: (result: T) => boolean;
    /** Interval between polls in milliseconds (default: 2000) */
    interval?: number;
    /** Maximum time to poll in milliseconds (default: 60000) */
    timeout?: number;
    /** Maximum number of poll attempts (default: 30) */
    maxAttempts?: number;
    /** Callback on each poll result */
    onProgress?: (result: T, attempt: number) => void;
    /** Abort signal for cancellation */
    signal?: AbortSignal;
}
export interface PollResult<T> {
    result: T;
    attempts: number;
    stopped: boolean;
    timedOut: boolean;
}
/**
 * Poll a function until a condition is met or timeout
 */
export declare function poll<T>(options: PollOptions<T>): Promise<PollResult<T>>;
export interface RetryOptions<T> {
    /** Function to retry */
    fn: () => Promise<T>;
    /** Maximum number of retry attempts (default: 3) */
    maxAttempts?: number;
    /** Base delay between retries in ms (default: 1000) */
    baseDelay?: number;
    /** Maximum delay between retries in ms (default: 30000) */
    maxDelay?: number;
    /** Whether to use exponential backoff (default: true) */
    exponentialBackoff?: boolean;
    /** Function to determine if error is retryable (default: all errors) */
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    /** Callback on each retry */
    onRetry?: (error: unknown, attempt: number, delay: number) => void;
    /** Abort signal for cancellation */
    signal?: AbortSignal;
}
/**
 * Retry a function with exponential backoff
 */
export declare function retry<T>(options: RetryOptions<T>): Promise<T>;
/**
 * Sleep for a specified duration
 */
export declare function sleep(ms: number, signal?: AbortSignal): Promise<void>;
/**
 * Debounce a function
 */
export declare function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void;
/**
 * Throttle a function
 */
export declare function throttle<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void;
/**
 * Create an AbortController with timeout
 */
export declare function createTimeoutController(timeoutMs: number): {
    controller: AbortController;
    cleanup: () => void;
};
/**
 * Race a promise against a timeout
 */
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage?: string): Promise<T>;
//# sourceMappingURL=async-helpers.d.ts.map