// Application preview requests over the Data module's named preview routes.
// URLs come from the page bootstrap (`extensions.data_preview`), resolved by
// the server; the browser only fills the session locator into the declared
// templates. Reads are bounded, cancellable GETs. Open and close are POSTs
// through the shared HTTP client, which adds the page's CSRF token. Failures
// are classified into safe kinds by status and the envelope's text code and
// never carry a partial payload.

import { httpRequest, readExpectedHTTPJSON } from '../../shared/transport/http-client.js';
import { isRecord, selectionWire, str, type ExploreSelection } from '../data-explorer/contract.js';
import { EXPLORER_TIMEOUT_MS, classifyStatus, type ExplorerFailureKind } from '../data-explorer/transport.js';
import {
  openWire,
  parseCapability,
  parseSession,
  type PreviewCapability,
  type PreviewOpenInput,
  type PreviewSession,
} from './contract.js';

export type PreviewRoutes = {
  capabilities: string;
  open: string;
  /** Template with a `:session` placeholder. */
  session: string;
  /** Template with a `:session` placeholder. */
  close: string;
};

/**
 * Explorer failure kinds plus the management outcomes a launch can meet:
 * `busy` (the actor's open previews are at the host's limit) and `conflict`
 * (the request ID was already used with other input).
 */
export type PreviewFailureKind = ExplorerFailureKind | 'busy' | 'conflict';

export type PreviewFailure = { kind: PreviewFailureKind; status: number };

/**
 * `serverTime` is the answer's HTTP `Date` (ms), when it sent a valid one: it
 * lets expiry decisions follow the server's clock rather than this browser's.
 */
export type PreviewResult<T> = { ok: true; value: T; serverTime?: number } | { ok: false; failure: PreviewFailure };

/** The exact session a lookup or close expects. */
export type PreviewLocator = { sessionId: string; selection: ExploreSelection; surfaceId: string };

/** The preview request seam; tests and other hosts may supply their own. */
export type PreviewTransport = {
  capabilities(selection: ExploreSelection, signal: AbortSignal): Promise<PreviewResult<PreviewCapability>>;
  open(input: PreviewOpenInput, signal: AbortSignal): Promise<PreviewResult<PreviewSession>>;
  session(locator: PreviewLocator, signal: AbortSignal): Promise<PreviewResult<PreviewSession>>;
  close(locator: PreviewLocator, signal: AbortSignal): Promise<PreviewResult<PreviewSession>>;
};

/** Request budget: the host's own preview timeout is 10s. */
export const PREVIEW_TIMEOUT_MS = EXPLORER_TIMEOUT_MS;

/** Failure kind of a non-2xx answer; a 409 is told apart by its lifecycle text code. */
export function classifyPreviewFailure(status: number, textCode = ''): PreviewFailureKind {
  const code = textCode.trim().toLowerCase();
  if (status === 409) {
    if (code === 'busy') return 'busy';
    if (code === 'fingerprint_conflict') return 'conflict';
    return 'stale';
  }
  // A rejected CSRF token means the page's form token is no longer valid.
  if (status === 400 && code.includes('csrf')) return 'expired';
  return classifyStatus(status);
}

async function failureTextCode(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const error = isRecord(body) && isRecord(body.error) ? body.error : {};
    return str(error.text_code).slice(0, 64);
  } catch {
    return '';
  }
}

type PreviewRequest = { method: 'GET' | 'POST'; json?: unknown; signal: AbortSignal };

async function request<T>(url: string, options: PreviewRequest, parse: (value: unknown) => T | null): Promise<PreviewResult<T>> {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  if (options.signal.aborted) abort();
  else options.signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, PREVIEW_TIMEOUT_MS);
  try {
    const response = await httpRequest(url, {
      method: options.method,
      credentials: 'same-origin',
      signal: controller.signal,
      ...(options.json === undefined ? {} : { json: options.json }),
    });
    if (!response.ok) {
      return { ok: false, failure: { kind: classifyPreviewFailure(response.status, await failureTextCode(response)), status: response.status } };
    }
    const value = parse(await readExpectedHTTPJSON<unknown>(response));
    if (value === null) return { ok: false, failure: { kind: 'malformed', status: response.status } };
    const serverTime = Date.parse(response.headers.get('date') || '');
    return Number.isFinite(serverTime) ? { ok: true, value, serverTime } : { ok: true, value };
  } catch (error) {
    if (options.signal.aborted) return { ok: false, failure: { kind: 'canceled', status: 0 } };
    if (controller.signal.aborted) return { ok: false, failure: { kind: 'timeout', status: 0 } };
    const name = error && typeof error === 'object' ? (error as { name?: string }).name : '';
    if (name === 'HTTPAuthenticationRequiredError') return { ok: false, failure: { kind: 'expired', status: 401 } };
    // An answer that is not the declared JSON: the request may still have been received.
    if (name === 'HTTPResponseProtocolError') return { ok: false, failure: { kind: 'malformed', status: (error as { status?: number }).status || 0 } };
    return { ok: false, failure: { kind: 'network', status: 0 } };
  } finally {
    clearTimeout(timer);
    options.signal.removeEventListener('abort', abort);
  }
}

function withSelection(path: string, selection: ExploreSelection): string {
  const query = `selection=${encodeURIComponent(JSON.stringify(selectionWire(selection)))}`;
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}

/** Fill the declared `:session` placeholder with an encoded locator. */
export function sessionPath(template: string, sessionId: string): string {
  return template.replace(/:session(?=$|[/?#])/, () => encodeURIComponent(sessionId));
}

export function createHTTPPreviewTransport(routes: PreviewRoutes): PreviewTransport {
  return {
    capabilities(selection, signal) {
      return request(withSelection(routes.capabilities, selection), { method: 'GET', signal }, parseCapability);
    },
    open(input, signal) {
      return request(routes.open, { method: 'POST', json: openWire(input), signal }, (value) => parseSession(value, input.selection, input.surface_id));
    },
    session(locator, signal) {
      return request(sessionPath(routes.session, locator.sessionId), { method: 'GET', signal },
        (value) => parseSession(value, locator.selection, locator.surfaceId, locator.sessionId));
    },
    close(locator, signal) {
      return request(sessionPath(routes.close, locator.sessionId), { method: 'POST', json: {}, signal },
        (value) => parseSession(value, locator.selection, locator.surfaceId, locator.sessionId));
    },
  };
}

const unconfigured = <T>(): Promise<PreviewResult<T>> => Promise.resolve({ ok: false, failure: { kind: 'unconfigured', status: 0 } });

/** Transport for a page that offers no preview routes: everything is unsupported. */
export const unconfiguredPreviewTransport: PreviewTransport = {
  capabilities: () => unconfigured(),
  open: () => unconfigured(),
  session: () => unconfigured(),
  close: () => unconfigured(),
};
