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
export async function poll<T>(options: PollOptions<T>): Promise<PollResult<T>> {
  const {
    fn,
    until,
    interval = 2000,
    timeout = 60000,
    maxAttempts = 30,
    onProgress,
    signal,
  } = options;

  const startTime = Date.now();
  let attempts = 0;
  let lastResult: T;

  while (attempts < maxAttempts) {
    if (signal?.aborted) {
      throw new DOMException('Polling aborted', 'AbortError');
    }

    const elapsedTime = Date.now() - startTime;
    if (elapsedTime >= timeout) {
      return {
        result: lastResult!,
        attempts,
        stopped: false,
        timedOut: true,
      };
    }

    attempts++;
    lastResult = await fn();

    if (onProgress) {
      onProgress(lastResult, attempts);
    }

    if (until(lastResult)) {
      return {
        result: lastResult,
        attempts,
        stopped: true,
        timedOut: false,
      };
    }

    // Wait before next poll
    await sleep(interval, signal);
  }

  return {
    result: lastResult!,
    attempts,
    stopped: false,
    timedOut: false,
  };
}

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
export async function retry<T>(options: RetryOptions<T>): Promise<T> {
  const {
    fn,
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    exponentialBackoff = true,
    shouldRetry = () => true,
    onRetry,
    signal,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Retry aborted', 'AbortError');
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      const delay = exponentialBackoff
        ? Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
        : baseDelay;

      if (onRetry) {
        onRetry(error, attempt, delay);
      }

      await sleep(delay, signal);
    }
  }

  throw lastError;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Sleep aborted', 'AbortError'));
      return;
    }

    const timeoutId = setTimeout(resolve, ms);

    if (signal) {
      const abortHandler = () => {
        clearTimeout(timeoutId);
        reject(new DOMException('Sleep aborted', 'AbortError'));
      };
      signal.addEventListener('abort', abortHandler, { once: true });
    }
  });
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(
        () => {
          lastCall = Date.now();
          timeoutId = null;
          fn(...args);
        },
        delay - (now - lastCall)
      );
    }
  };
}

/**
 * Create an AbortController with timeout
 */
export function createTimeoutController(
  timeoutMs: number
): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  };
}

/**
 * Race a promise against a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}
