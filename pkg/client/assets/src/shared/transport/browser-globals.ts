import { httpRequestWith, readCSRFToken } from './http-client.js';

type GoAdminWindow = Window & typeof globalThis & {
  goAdminGetCSRFToken?: typeof readCSRFToken;
  goAdminCSRFHeaders?: (headers?: HeadersInit) => Headers;
  goAdminFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

export function goAdminCSRFHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers || {});
  const token = readCSRFToken();
  if (token && !merged.has('X-CSRF-Token')) {
    merged.set('X-CSRF-Token', token);
  }
  return merged;
}

export function goAdminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return httpRequestWith(fetch.bind(globalThis), input, init);
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
