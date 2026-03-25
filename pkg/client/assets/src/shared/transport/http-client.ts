export interface HTTPRequestOptions extends RequestInit {
  json?: unknown;
  idempotencyKey?: string;
  accept?: string;
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

export async function readHTTPError(response: Response, fallback: string = 'Request failed'): Promise<string> {
  try {
    const text = await response.text();
    if (text && text.trim()) {
      return text.trim();
    }
  } catch {
    // Ignore read errors and use fallback below.
  }
  return `${fallback}: ${response.status}`;
}

export async function httpJSON<T = unknown>(input: string, options: HTTPRequestOptions = {}): Promise<T> {
  const response = await httpRequest(input, options);
  if (!response.ok) {
    throw new Error(await readHTTPError(response));
  }
  return response.json() as Promise<T>;
}
