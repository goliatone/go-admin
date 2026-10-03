// Explorer reads over the Data module's named explore routes. URLs come from
// the page bootstrap (`extensions.data_explorer`), resolved by the server;
// the browser never concatenates admin prefixes. Every read is a bounded,
// cancellable GET; failures are classified by HTTP status into safe kinds and
// never carry a partial payload.

import { consoleRequest } from '../http.js';
import {
  EXPLORE_LIMITS,
  isRecord,
  parseMetadata,
  parseSamples,
  selectionWire,
  str,
  type ExploreMetadata,
  type ExploreSamples,
  type ExploreSelection,
} from './contract.js';

export type ExplorerRoutes = { metadata: string; samples: string; related: string };

export type ExplorerFailureKind =
  | 'unconfigured'
  | 'invalid'
  | 'expired'
  | 'denied'
  | 'gone'
  | 'stale'
  | 'unavailable'
  | 'timeout'
  | 'network'
  | 'malformed'
  | 'failed'
  | 'canceled';

export type ExplorerFailure = { kind: ExplorerFailureKind; status: number };

export type ExplorerResult<T> = { ok: true; value: T } | { ok: false; failure: ExplorerFailure };

export type SamplesRequest = { selection: ExploreSelection; entityId: string; cursor?: string; limit?: number };

/** A depth-one related read; `relatedEntityId` is the relationship's declared target. */
export type RelatedRequest = SamplesRequest & { recordKey: string; relationshipId: string; relatedEntityId: string };

/** The explorer's read seam; tests and other hosts may supply their own. */
export type ExplorerTransport = {
  metadata(selection: ExploreSelection, signal: AbortSignal): Promise<ExplorerResult<ExploreMetadata>>;
  samples(request: SamplesRequest, signal: AbortSignal): Promise<ExplorerResult<ExploreSamples>>;
  related(request: RelatedRequest, signal: AbortSignal): Promise<ExplorerResult<ExploreSamples>>;
};

/** Request budget: the host's own explore timeout is 10s. */
export const EXPLORER_TIMEOUT_MS = 10000;

const BOOTSTRAP_SELECTOR = 'script[type="application/json"][data-console-bootstrap]';

function routePath(value: unknown): string {
  const path = str(value);
  // Server-resolved, same-origin paths only.
  return path.startsWith('/') && !path.startsWith('//') ? path : '';
}

/** A declared bootstrap extension of this root (never a nested root's), or {}. */
function bootstrapExtension(root: HTMLElement, name: string): Record<string, unknown> {
  const script = Array.from(root.querySelectorAll<HTMLScriptElement>(BOOTSTRAP_SELECTOR))
    .find((candidate) => candidate.closest('[data-console-root]') === root);
  if (!script) return {};
  try {
    const bootstrap: unknown = JSON.parse(script.textContent || '');
    const extensions = isRecord(bootstrap) && isRecord(bootstrap.extensions) ? bootstrap.extensions : {};
    return isRecord(extensions[name]) ? extensions[name] : {};
  } catch {
    return {};
  }
}

/** Explore routes from this root's own bootstrap, or null when not offered. */
export function readExplorerRoutes(root: HTMLElement): ExplorerRoutes | null {
  const declared = bootstrapExtension(root, 'data_explorer');
  const routes = { metadata: routePath(declared.metadata), samples: routePath(declared.samples), related: routePath(declared.related) };
  return routes.metadata && routes.samples && routes.related ? routes : null;
}

/** Insight routes from this root's own bootstrap (`extensions.data_insights`), or null. */
export function readInsightsRoutes(root: HTMLElement): { insights: string; compare: string; metricSetID: string } | null {
  const declared = bootstrapExtension(root, 'data_insights');
  const routes = { insights: routePath(declared.insights), compare: routePath(declared.compare), metricSetID: str(declared.metric_set_id) };
  return routes.insights && routes.compare ? routes : null;
}

/**
 * Application preview management routes from this root's own bootstrap
 * (`extensions.data_preview`), or null. Session and close routes are
 * templates whose `:session` placeholder the browser fills with a locator.
 */
export function readPreviewRoutes(root: HTMLElement): { capabilities: string; open: string; session: string; close: string } | null {
  const declared = bootstrapExtension(root, 'data_preview');
  const routes = { capabilities: routePath(declared.capabilities), open: routePath(declared.open), session: routePath(declared.session), close: routePath(declared.close) };
  const located = (path: string): boolean => /:session(?=$|[/?#])/.test(path);
  return routes.capabilities && routes.open && located(routes.session) && located(routes.close) ? routes : null;
}

export function classifyStatus(status: number): ExplorerFailureKind {
  switch (status) {
    case 0: return 'network';
    case 400: return 'invalid';
    case 401: return 'expired';
    case 403: return 'denied';
    case 404:
    case 410: return 'gone';
    case 408: return 'canceled';
    case 409: return 'stale';
    case 503: return 'unavailable';
    case 504: return 'timeout';
    default: return 'failed';
  }
}

function withQuery(path: string, params: Array<[string, string]>): string {
  const query = params
    .filter(([, value]) => value !== '')
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('&');
  if (!query) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}

function sampleParams(request: SamplesRequest): Array<[string, string]> {
  const limit = Math.min(Math.max(Math.floor(request.limit || EXPLORE_LIMITS.sampleDefault), 1), EXPLORE_LIMITS.sampleMax);
  return [
    ['selection', JSON.stringify(selectionWire(request.selection))],
    ['entity_id', request.entityId],
    ['cursor', request.cursor || ''],
    ['limit', String(limit)],
  ];
}

async function read<T>(url: string, signal: AbortSignal, parse: (value: unknown) => T | null): Promise<ExplorerResult<T>> {
  const result = await consoleRequest<unknown>(url, {
    method: 'GET',
    signal,
    timeoutMs: EXPLORER_TIMEOUT_MS,
    fallbackError: 'Exploration is unavailable.',
  });
  if (signal.aborted) return { ok: false, failure: { kind: 'canceled', status: 0 } };
  if (!result.ok) return { ok: false, failure: { kind: classifyStatus(result.status), status: result.status } };
  const value = parse(result.value);
  return value === null
    ? { ok: false, failure: { kind: 'malformed', status: result.status } }
    : { ok: true, value };
}

export function createHTTPExplorerTransport(routes: ExplorerRoutes): ExplorerTransport {
  return {
    metadata(selection, signal) {
      const url = withQuery(routes.metadata, [['selection', JSON.stringify(selectionWire(selection))]]);
      return read(url, signal, (value) => parseMetadata(value, selection));
    },
    samples(request, signal) {
      return read(withQuery(routes.samples, sampleParams(request)), signal, (value) => parseSamples(value, request.selection, [request.entityId]));
    },
    related(request, signal) {
      const params = [...sampleParams(request), ['record_key', request.recordKey], ['relationship_id', request.relationshipId]] as Array<[string, string]>;
      return read(withQuery(routes.related, params), signal, (value) => parseSamples(value, request.selection, [request.relatedEntityId, request.entityId]));
    },
  };
}

const unconfigured = <T>(): Promise<ExplorerResult<T>> => Promise.resolve({ ok: false, failure: { kind: 'unconfigured', status: 0 } });

/** Transport for a page that offers no explore routes: everything is unsupported. */
export const unconfiguredExplorerTransport: ExplorerTransport = {
  metadata: () => unconfigured(),
  samples: () => unconfigured(),
  related: () => unconfigured(),
};
