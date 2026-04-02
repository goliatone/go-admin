import { appendCSRFHeader, readCSRFToken } from './http-client.js';

type GoAdminWindow = Window & typeof globalThis & {
  goAdminGetCSRFToken?: typeof readCSRFToken;
  goAdminCSRFHeaders?: (headers?: HeadersInit) => Headers;
  goAdminFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

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
  if (input && typeof input === 'object' && 'url' in input && typeof input.url === 'string') {
    return input.url;
  }
  return '';
}

function resolveRequestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (typeof init?.method === 'string' && init.method.trim()) {
    return init.method;
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.method;
  }
  if (input && typeof input === 'object' && 'method' in input && typeof input.method === 'string') {
    return input.method;
  }
  return 'GET';
}

function requestHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  if (init?.headers) {
    return new Headers(init.headers);
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return new Headers(input.headers);
  }
  if (input && typeof input === 'object' && 'headers' in input && input.headers) {
    return new Headers(input.headers as HeadersInit);
  }
  return new Headers();
}

export function goAdminCSRFHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers || {});
  const token = readCSRFToken();
  if (token && !merged.has('X-CSRF-Token')) {
    merged.set('X-CSRF-Token', token);
  }
  return merged;
}

export function goAdminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const options = init ? { ...init } : {};
  const headers = requestHeaders(input, options);
  appendCSRFHeader(resolveRequestURL(input), { method: resolveRequestMethod(input, options) }, headers);
  options.headers = headers;
  return fetch(input, options);
}

export function installBrowserCSRFGlobals(target: GoAdminWindow = window as GoAdminWindow): GoAdminWindow {
  target.goAdminGetCSRFToken = readCSRFToken;
  target.goAdminCSRFHeaders = goAdminCSRFHeaders;
  target.goAdminFetch = goAdminFetch;
  return target;
}

if (typeof window !== 'undefined' && typeof fetch === 'function') {
  installBrowserCSRFGlobals(window as GoAdminWindow);
}
