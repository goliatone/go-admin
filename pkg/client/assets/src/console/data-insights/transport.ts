// Insight reads over the Data module's named insights routes. URLs come from
// the page bootstrap (`extensions.data_insights`), resolved by the server; the
// browser never concatenates admin prefixes. Every read is a bounded,
// cancellable GET; failures map to the explorer's safe kinds by HTTP status
// and never carry a partial payload. An insights read without a metric set
// lets the server choose the provider's registered set and name it; a
// comparison always names the set learned for the shown selection.

import { consoleRequest } from '../http.js';
import { selectionWire, type ExploreSelection } from '../data-explorer/contract.js';
import { EXPLORER_TIMEOUT_MS, classifyStatus, type ExplorerResult } from '../data-explorer/transport.js';
import { parseComparison, parseInsights, type ExploreInsights, type SelectionComparison } from './contract.js';
import type { ComparePair } from './compare.js';

export type InsightsRoutes = {
  insights: string;
  compare: string;
  /** Metric set the page names, '' when the server chooses the provider's set. */
  metricSetID: string;
};

/** The insights read seam; tests and other hosts may supply their own. */
export type InsightsTransport = {
  insights(selection: ExploreSelection, metricSetID: string, signal: AbortSignal): Promise<ExplorerResult<ExploreInsights>>;
  compare(pair: ComparePair, metricSetID: string, signal: AbortSignal): Promise<ExplorerResult<SelectionComparison>>;
};

function withQuery(path: string, params: Array<[string, string]>): string {
  const query = params
    .filter(([, value]) => value !== '')
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('&');
  if (!query) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}

async function read<T>(url: string, signal: AbortSignal, parse: (value: unknown) => T | null): Promise<ExplorerResult<T>> {
  const result = await consoleRequest<unknown>(url, {
    method: 'GET',
    signal,
    timeoutMs: EXPLORER_TIMEOUT_MS,
    fallbackError: 'Insights are unavailable.',
  });
  if (signal.aborted) return { ok: false, failure: { kind: 'canceled', status: 0 } };
  if (!result.ok) return { ok: false, failure: { kind: classifyStatus(result.status), status: result.status } };
  const value = parse(result.value);
  return value === null
    ? { ok: false, failure: { kind: 'malformed', status: result.status } }
    : { ok: true, value };
}

export function createHTTPInsightsTransport(routes: InsightsRoutes): InsightsTransport {
  return {
    insights(selection, metricSetID, signal) {
      const set = metricSetID || routes.metricSetID;
      const url = withQuery(routes.insights, [['selection', JSON.stringify(selectionWire(selection))], ['metric_set_id', set]]);
      return read(url, signal, (value) => parseInsights(value, selection, set));
    },
    compare(pair, metricSetID, signal) {
      const url = withQuery(routes.compare, [
        ['left', JSON.stringify(selectionWire(pair.left))],
        ['right', JSON.stringify(selectionWire(pair.right))],
        ['metric_set_id', metricSetID],
      ]);
      return read(url, signal, (value) => parseComparison(value, pair.left, pair.right, metricSetID));
    },
  };
}
