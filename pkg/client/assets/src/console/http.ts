// Small HTTP helpers for console hosts: bounded requests and safe structured
// errors. Cookie/CSRF mechanics come from the shared HTTP client.

import {
  httpRequest,
  readExpectedHTTPJSON,
  readHTTPStructuredErrorResult,
  type HTTPRequestOptions,
} from '../shared/transport/http-client.js';
import type { ConsoleError, ConsoleErrorAction } from './types.js';

export type ConsoleRequestResult<T> =
  | { ok: true; status: number; value: T }
  | { ok: false; status: number; error: ConsoleError };

const ERROR_ACTIONS = new Set<ConsoleErrorAction>(['retry', 'reload', 'none']);

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, string> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, message]) => {
    if (typeof message === 'string' && message.trim()) {
      out[key] = message.trim();
    } else if (Array.isArray(message)) {
      const joined = message.filter((item) => typeof item === 'string' && item.trim()).join('; ');
      if (joined) out[key] = joined;
    }
  });
  return out;
}

function defaultErrorAction(status: number): ConsoleErrorAction {
  if (status === 401) return 'reload';
  if (status === 0 || status === 408 || status === 429 || status >= 500) return 'retry';
  return 'none';
}

/** Build a safe console error. Never copies record payloads from the body. */
export async function readConsoleError(response: Response, fallback: string): Promise<ConsoleError> {
  const result = await readHTTPStructuredErrorResult(response, fallback, { appendStatusToFallback: false });
  const payload = result.payload && typeof result.payload === 'object' ? result.payload as Record<string, unknown> : {};
  const details = result.details || {};
  const fields = {
    ...stringRecord((payload as { fields?: unknown }).fields),
    ...stringRecord((details as { fields?: unknown }).fields),
  };
  const declared = String((details as { action?: unknown }).action ?? (payload as { action?: unknown }).action ?? '')
    .trim()
    .toLowerCase() as ConsoleErrorAction;
  const message = typeof result.message === 'string' && result.message.trim() && result.message.length <= 500
    ? result.message.trim()
    : fallback;
  return {
    status: response.status,
    code: result.code || (response.status === 401 ? 'UNAUTHORIZED' : response.status === 403 ? 'FORBIDDEN' : 'REQUEST_FAILED'),
    message,
    fields,
    action: ERROR_ACTIONS.has(declared) ? declared : defaultErrorAction(response.status),
  };
}

export function networkConsoleError(message: string): ConsoleError {
  return { status: 0, code: 'NETWORK_ERROR', message, fields: {}, action: 'retry' };
}

/** JSON request with a timeout and an optional external abort signal. */
export async function consoleRequest<T>(
  url: string,
  options: HTTPRequestOptions & { timeoutMs?: number; fallbackError: string },
): Promise<ConsoleRequestResult<T>> {
  const { timeoutMs = 10000, fallbackError, signal, ...rest } = options;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const abort = (): void => controller?.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (signal) {
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  }
  if (controller && timeoutMs > 0) {
    timer = setTimeout(abort, timeoutMs);
  }
  try {
    const response = await httpRequest(url, {
      credentials: 'same-origin',
      ...rest,
      signal: controller?.signal ?? signal,
    });
    if (!response.ok) {
      return { ok: false, status: response.status, error: await readConsoleError(response, fallbackError) };
    }
    const value = await readExpectedHTTPJSON<T>(response);
    return { ok: true, status: response.status, value };
  } catch (error) {
    if (error && typeof error === 'object' && (error as { name?: string }).name === 'HTTPAuthenticationRequiredError') {
      return {
        ok: false,
        status: 401,
        error: { status: 401, code: 'UNAUTHORIZED', message: 'Your session expired. Sign in again to continue.', fields: {}, action: 'reload' },
      };
    }
    return { ok: false, status: 0, error: networkConsoleError(fallbackError) };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

/**
 * Fill a server-provided route template. Supports `{panel_id}`-style and
 * `:panel`-style placeholders; values are always URI-encoded.
 */
export function fillRouteTemplate(template: string, values: Record<string, string>): string {
  let out = template;
  Object.entries(values).forEach(([name, value]) => {
    const encoded = encodeURIComponent(value);
    const short = name.replace(/_id$|_key$/, '');
    out = out
      .split(`{${name}}`).join(encoded)
      .split(`{${short}}`).join(encoded)
      .replace(new RegExp(`:${name}(?=$|[/?#.])`, 'g'), () => encoded)
      .replace(new RegExp(`:${short}(?=$|[/?#.])`, 'g'), () => encoded);
  });
  return out;
}
