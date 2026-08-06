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

export class HTTPAuthenticationRequiredError extends Error {
  readonly loginURL: string;

  constructor(loginURL: string) {
    super('Authentication required. Please sign in and try again.');
    this.name = 'HTTPAuthenticationRequiredError';
    this.loginURL = loginURL;
  }
}

export class HTTPResponseProtocolError extends Error {
  readonly status: number;
  readonly contentType: string;
  readonly responseURL: string;

  constructor(message: string, response: Response, contentType: string) {
    super(message);
    this.name = 'HTTPResponseProtocolError';
    this.status = response.status;
    this.contentType = contentType;
    this.responseURL = response.url;
  }
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

function resolveRequestURL(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.url;
  }
  return '';
}

function resolveRequestMethod(input: RequestInfo | URL, options: RequestInit): string {
  if (typeof options.method === 'string' && options.method.trim()) {
    return options.method;
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.method;
  }
  return 'GET';
}

function resolveRequestHeaders(input: RequestInfo | URL, headers?: HeadersInit): Headers {
  if (headers !== undefined) {
    return new Headers(headers);
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return new Headers(input.headers);
  }
  return new Headers();
}

function isSameOriginRequest(input: RequestInfo | URL): boolean {
  const target = resolveRequestURL(input).trim();
  if (!target) {
    return false;
  }
  if (typeof location === 'undefined' || !location?.origin) {
    // Relative paths are useful in non-browser render/test environments, but
    // network-path and backslash variants must never be assumed same-origin.
    return !/^(?:[a-zA-Z][a-zA-Z\d+\-.]*:|[/\\]{2})/.test(target);
  }
  try {
    const base = typeof location.href === 'string' && location.href
      ? location.href
      : `${location.origin}/`;
    return new URL(target, base).origin === location.origin;
  } catch {
    return false;
  }
}

export function appendCSRFHeader(
  input: RequestInfo | URL,
  options: RequestInit,
  headers: Headers,
): void {
  if (
    !isUnsafeMethod(resolveRequestMethod(input, options))
    || headers.has('X-CSRF-Token')
    || !isSameOriginRequest(input)
  ) {
    return;
  }
  const token = readCSRFToken();
  if (token) {
    headers.set('X-CSRF-Token', token);
  }
}

export async function httpRequestWith(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  options: HTTPRequestOptions = {},
): Promise<Response> {
  const {
    json,
    idempotencyKey,
    accept,
    headers,
    ...rest
  } = options;

  const mergedHeaders = resolveRequestHeaders(input, headers);
  if (accept) {
    mergedHeaders.set('Accept', accept);
  } else if (!mergedHeaders.has('Accept')) {
    mergedHeaders.set('Accept', 'application/json');
  }

  if (idempotencyKey && idempotencyKey.trim()) {
    mergedHeaders.set('X-Idempotency-Key', idempotencyKey.trim());
  }

  if (json !== undefined) {
    if (!mergedHeaders.has('Content-Type')) {
      mergedHeaders.set('Content-Type', 'application/json');
    }
    rest.body = JSON.stringify(json);
  }
  appendCSRFHeader(input, rest, mergedHeaders);

  return fetchImpl(input, {
    ...rest,
    headers: mergedHeaders,
  });
}

export async function httpRequest(
  input: RequestInfo | URL,
  options: HTTPRequestOptions = {},
): Promise<Response> {
  return httpRequestWith(fetch.bind(globalThis), input, options);
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

// readExpectedHTTPJSON validates the response contract before parsing. Use it
// for JSON-only transports where a followed browser login redirect would
// otherwise turn HTML into a misleading JSON syntax error.
export async function readExpectedHTTPJSON<T>(
  response: Response,
): Promise<T> {
  const contentType = (response.headers.get('content-type') || '').trim().toLowerCase();
  const responseURL = String(response.url || '').trim();
  if (response.redirected && contentType.includes('text/html') && isLoginResponseURL(responseURL)) {
    throw new HTTPAuthenticationRequiredError(responseURL);
  }
  if (!isJSONContentType(contentType)) {
    const received = contentType || 'an unspecified content type';
    throw new HTTPResponseProtocolError(
      `Expected a JSON response but received ${received}.`,
      response,
      contentType,
    );
  }
  try {
    return await response.json() as T;
  } catch {
    throw new HTTPResponseProtocolError('Expected a valid JSON response.', response, contentType);
  }
}

function isJSONContentType(contentType: string): boolean {
  const mediaType = contentType.split(';', 1)[0]?.trim() || '';
  return mediaType === 'application/json' || mediaType.endsWith('+json');
}

function isLoginResponseURL(responseURL: string): boolean {
  if (!responseURL) {
    return false;
  }
  try {
    const base = typeof location !== 'undefined' && location?.origin
      ? location.origin
      : 'http://localhost';
    const pathname = new URL(responseURL, base).pathname.toLowerCase().replace(/\/+$/g, '');
    return pathname === '/login' || pathname.endsWith('/login') || pathname.endsWith('/sign-in') || pathname.endsWith('/signin');
  } catch {
    return false;
  }
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

export async function httpJSON<T = unknown>(
  input: RequestInfo | URL,
  options: HTTPRequestOptions = {},
): Promise<T> {
  const response = await httpRequest(input, options);
  if (!response.ok) {
    throw new Error(await readHTTPError(response));
  }
  return readHTTPJSON<T>(response);
}
