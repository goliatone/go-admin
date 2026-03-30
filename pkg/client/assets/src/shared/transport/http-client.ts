export interface HTTPRequestOptions extends RequestInit {
  json?: unknown;
  idempotencyKey?: string;
  accept?: string;
}

type HTTPErrorPayload = {
  code?: unknown;
  message?: unknown;
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  } | string | unknown;
};

export interface HTTPErrorReadResult {
  message: string;
  payload: unknown;
  rawText: string;
}

export interface HTTPResponsePayloadReadResult {
  payload: unknown;
  rawText: string;
  contentType: string;
}

export interface HTTPStructuredErrorReadResult extends HTTPErrorReadResult {
  code: string;
  details: Record<string, unknown>;
}

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function readCSRFToken(): string {
  if (typeof document === 'undefined' || !document?.querySelector) {
    return '';
  }
  return document
    .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
    ?.getAttribute('content')
    ?.trim() || '';
}

function isUnsafeMethod(method?: string): boolean {
  const normalized = String(method || 'GET').trim().toUpperCase() || 'GET';
  return unsafeMethods.has(normalized);
}

function isSameOriginRequest(input: string): boolean {
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(input)) {
    return true;
  }
  if (typeof location === 'undefined' || !location?.origin) {
    return false;
  }
  try {
    return new URL(input, location.origin).origin === location.origin;
  } catch {
    return false;
  }
}

export function appendCSRFHeader(input: string, options: RequestInit, headers: Headers): void {
  if (!isUnsafeMethod(options.method) || headers.has('X-CSRF-Token') || !isSameOriginRequest(input)) {
    return;
  }
  const token = readCSRFToken();
  if (token) {
    headers.set('X-CSRF-Token', token);
  }
}

export async function httpRequest(input: string, options: HTTPRequestOptions = {}): Promise<Response> {
  const {
    json,
    idempotencyKey,
    accept,
    headers,
    ...rest
  } = options;

  const mergedHeaders = new Headers(headers || {});
  if (accept) {
    mergedHeaders.set('Accept', accept);
  } else if (!mergedHeaders.has('Accept')) {
    mergedHeaders.set('Accept', 'application/json');
  }

  if (idempotencyKey && idempotencyKey.trim()) {
    mergedHeaders.set('X-Idempotency-Key', idempotencyKey.trim());
  }

  let body = rest.body;
  if (json !== undefined) {
    if (!mergedHeaders.has('Content-Type')) {
      mergedHeaders.set('Content-Type', 'application/json');
    }
    body = JSON.stringify(json);
  }
  appendCSRFHeader(input, rest, mergedHeaders);

  return fetch(input, {
    ...rest,
    headers: mergedHeaders,
    body,
  });
}

function extractHTTPErrorMessage(payload: HTTPErrorPayload | null | undefined): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }
  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error.trim();
  }
  if (payload.error && typeof payload.error === 'object') {
    const nestedMessage = (payload.error as { message?: unknown }).message;
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      return nestedMessage.trim();
    }
  }
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }
  return '';
}

function extractHTTPErrorCode(payload: HTTPErrorPayload | null | undefined): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }
  if (payload.error && typeof payload.error === 'object') {
    const nestedCode = (payload.error as { code?: unknown }).code;
    if (typeof nestedCode === 'string' && nestedCode.trim()) {
      return nestedCode.trim();
    }
  }
  if (typeof payload.code === 'string' && payload.code.trim()) {
    return payload.code.trim();
  }
  return '';
}

function extractHTTPErrorDetails(payload: HTTPErrorPayload | null | undefined): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || !payload.error || typeof payload.error !== 'object') {
    return {};
  }
  const nestedDetails = (payload.error as { details?: unknown }).details;
  if (nestedDetails && typeof nestedDetails === 'object' && !Array.isArray(nestedDetails)) {
    return nestedDetails as Record<string, unknown>;
  }
  return {};
}

function parseHTTPErrorPayload(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function readHTTPResponsePayload(
  response: Response,
): Promise<HTTPResponsePayloadReadResult> {
  const contentType = response.headers.get('content-type') ?? '';
  try {
    const text = await response.text();
    const normalized = text.trim();
    if (!normalized) {
      return {
        payload: null,
        rawText: '',
        contentType,
      };
    }
    if (contentType.includes('json')) {
      const payload = parseHTTPErrorPayload(normalized);
      if (payload !== null) {
        return {
          payload,
          rawText: normalized,
          contentType,
        };
      }
    }
    return {
      payload: normalized,
      rawText: normalized,
      contentType,
    };
  } catch {
    return {
      payload: null,
      rawText: '',
      contentType,
    };
  }
}

export async function readHTTPJSONValue<T>(
  response: Response,
  fallback: T,
): Promise<T> {
  try {
    const payload = await response.json();
    return (payload === undefined ? fallback : payload) as T;
  } catch {
    return fallback;
  }
}

export async function readHTTPJSON<T>(
  response: Response,
): Promise<T> {
  return await response.json() as T;
}

export async function readHTTPJSONObject(
  response: Response,
): Promise<Record<string, unknown>> {
  const payload = await readHTTPJSONValue<unknown>(response, {});
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }
  return payload as Record<string, unknown>;
}

export async function readHTTPErrorResult(
  response: Response,
  fallback: string = 'Request failed',
  options: { appendStatusToFallback?: boolean } = {}
): Promise<HTTPErrorReadResult> {
  const appendStatusToFallback = options.appendStatusToFallback !== false;
  try {
    const text = await response.text();
    const normalized = text.trim();
    if (normalized) {
      const payload = parseHTTPErrorPayload(normalized);
      if (payload && typeof payload === 'object') {
        const extracted = extractHTTPErrorMessage(payload as HTTPErrorPayload);
        if (extracted) {
          return {
            message: extracted,
            payload,
            rawText: normalized,
          };
        }
      }
      return {
        message: normalized,
        payload,
        rawText: normalized,
      };
    }
  } catch {
    // Ignore read errors and use fallback below.
  }
  return {
    message: appendStatusToFallback ? `${fallback}: ${response.status}` : fallback,
    payload: null,
    rawText: '',
  };
}

export async function readHTTPError(
  response: Response,
  fallback: string = 'Request failed',
  options: { appendStatusToFallback?: boolean } = {}
): Promise<string> {
  return (await readHTTPErrorResult(response, fallback, options)).message;
}

export async function readHTTPStructuredErrorResult(
  response: Response,
  fallback: string = 'Request failed',
  options: { appendStatusToFallback?: boolean } = {}
): Promise<HTTPStructuredErrorReadResult> {
  const result = await readHTTPErrorResult(response, fallback, options);
  const payload = result.payload && typeof result.payload === 'object'
    ? result.payload as HTTPErrorPayload
    : null;
  return {
    ...result,
    code: extractHTTPErrorCode(payload),
    details: extractHTTPErrorDetails(payload),
  };
}

export async function httpJSON<T = unknown>(input: string, options: HTTPRequestOptions = {}): Promise<T> {
  const response = await httpRequest(input, options);
  if (!response.ok) {
    throw new Error(await readHTTPError(response));
  }
  return readHTTPJSON<T>(response);
}
