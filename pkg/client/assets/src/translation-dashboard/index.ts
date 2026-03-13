import { escapeAttribute, escapeHTML } from '../shared/html.js';
import { readHTTPError } from '../shared/transport/http-client.js';
import { extractStructuredError } from '../toast/error-helpers.js';

export type DashboardAlertState = 'ok' | 'warning' | 'critical' | 'degraded';
export type TranslationDashboardScreenState = 'idle' | 'loading' | 'ready' | 'error';

export interface TranslationDashboardLink {
  href: string;
  group: string;
  route: string;
  resolverKey: string;
  params: Record<string, string>;
  query: Record<string, string>;
  key: string;
  label: string;
  description: string;
  relation: string;
  tableId: string;
  entityType: string;
  entityId: string;
}

export interface TranslationDashboardLinkTemplate {
  key: string;
  label: string;
  description: string;
  relation: string;
  group: string;
  route: string;
  resolverKey: string;
  entityType: string;
}

export interface TranslationDashboardCard {
  id: string;
  label: string;
  description: string;
  count: number;
  breakdown: Record<string, number>;
  alert: {
    state: DashboardAlertState;
    message: string;
  };
  drilldown: TranslationDashboardLink | null;
  metricKey: string;
  runbookId: string;
}

export interface TranslationDashboardTableRow {
  [key: string]: unknown;
  links: Record<string, TranslationDashboardLink>;
}

export interface TranslationDashboardTable {
  id: string;
  label: string;
  total: number;
  limit: number;
  rows: TranslationDashboardTableRow[];
}

export interface TranslationDashboardAlert {
  state: DashboardAlertState;
  code: string;
  message: string;
  cardId: string;
  runbookId: string;
}

export interface TranslationDashboardRunbook {
  id: string;
  title: string;
  description: string;
  route: string;
  resolverKey: string;
  href: string;
  query: Record<string, string>;
}

export interface TranslationDashboardMetric {
  key: string;
  unit: string;
  sloP95Ms: number | null;
}

export interface TranslationDashboardQueryModel {
  id: string;
  description: string;
  scopeFields: string[];
  stableSortKeys: string[];
  indexHints: string[];
  supportedFilters: string[];
  defaultLimit: number;
  drilldownRoute: string;
  queueRoute: string;
  apiRoute: string;
  resolverKeys: string[];
  drilldownLinks: Record<string, TranslationDashboardLinkTemplate>;
}

export interface TranslationDashboardContracts {
  cardIds: string[];
  tableIds: string[];
  alertStates: DashboardAlertState[];
  defaultLimits: Record<string, number>;
  queryModels: Record<string, TranslationDashboardQueryModel>;
  runbooks: TranslationDashboardRunbook[];
}

export interface TranslationDashboardPayload {
  cards: TranslationDashboardCard[];
  tables: Record<string, TranslationDashboardTable>;
  alerts: TranslationDashboardAlert[];
  runbooks: TranslationDashboardRunbook[];
  summary: Record<string, number>;
}

export interface TranslationDashboardMeta {
  environment: string;
  generatedAt: string;
  refreshIntervalMs: number;
  latencyTargetMs: number;
  degraded: boolean;
  degradedReasons: Array<{ component: string; message: string }>;
  familyReport: Record<string, unknown>;
  scope: Record<string, string>;
  metrics: TranslationDashboardMetric[];
  queryModels: Record<string, TranslationDashboardQueryModel>;
  contracts: TranslationDashboardContracts;
}

export interface TranslationDashboardResponse {
  data: TranslationDashboardPayload;
  meta: TranslationDashboardMeta;
}

export interface TranslationDashboardQuery {
  environment?: string;
  tenantId?: string;
  orgId?: string;
  overdueLimit?: number;
  blockedLimit?: number;
}

export interface TranslationDashboardClient {
  fetchDashboard(query?: TranslationDashboardQuery): Promise<TranslationDashboardResponse>;
}

export interface TranslationDashboardClientOptions {
  endpoint: string;
  fetch?: typeof fetch;
}

export interface TranslationDashboardRefreshController {
  start(): Promise<void>;
  stop(): void;
  refresh(): Promise<TranslationDashboardResponse>;
  isRunning(): boolean;
}

export interface TranslationDashboardRefreshOptions {
  load: () => Promise<TranslationDashboardResponse>;
  intervalMs?: number;
  onData?: (payload: TranslationDashboardResponse) => void;
  onError?: (error: unknown) => void;
}

export interface TranslationDashboardPageConfig extends TranslationDashboardClientOptions {
  queueEndpoint?: string;
  familiesEndpoint?: string;
  refreshInterval?: number;
  title?: string;
}

export class TranslationDashboardRequestError extends Error {
  status: number;
  code: string | null;
  requestId?: string;
  traceId?: string;
  metadata: Record<string, unknown> | null;

  constructor(input: {
    message: string;
    status: number;
    code?: string | null;
    requestId?: string;
    traceId?: string;
    metadata?: Record<string, unknown> | null;
  }) {
    super(input.message);
    this.name = 'TranslationDashboardRequestError';
    this.status = input.status;
    this.code = input.code ?? null;
    this.requestId = input.requestId;
    this.traceId = input.traceId;
    this.metadata = input.metadata ?? null;
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asStringRecord(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, candidate] of Object.entries(asRecord(value))) {
    const normalized = asString(candidate);
    if (normalized) {
      out[key] = normalized;
    }
  }
  return out;
}

function asNumberRecord(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, candidate] of Object.entries(asRecord(value))) {
    out[key] = asNumber(candidate);
  }
  return out;
}

function asList<T>(value: unknown, map: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: T[] = [];
  for (const item of value) {
    const normalized = map(item);
    if (normalized) {
      out.push(normalized);
    }
  }
  return out;
}

function normalizeAlertState(value: unknown): DashboardAlertState {
  const normalized = asString(value).toLowerCase();
  switch (normalized) {
    case 'warning':
    case 'critical':
    case 'degraded':
      return normalized;
    default:
      return 'ok';
  }
}

export function normalizeTranslationDashboardLink(value: unknown): TranslationDashboardLink | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const raw = value as Record<string, unknown>;
  return {
    href: asString(raw.href),
    group: asString(raw.group),
    route: asString(raw.route),
    resolverKey: asString(raw.resolver_key),
    params: asStringRecord(raw.params),
    query: asStringRecord(raw.query),
    key: asString(raw.key),
    label: asString(raw.label),
    description: asString(raw.description),
    relation: asString(raw.relation),
    tableId: asString(raw.table_id),
    entityType: asString(raw.entity_type),
    entityId: asString(raw.entity_id),
  };
}

function normalizeTranslationDashboardLinkTemplate(value: unknown): TranslationDashboardLinkTemplate | null {
  const raw = asRecord(value);
  const key = asString(raw.key);
  if (!key) {
    return null;
  }
  return {
    key,
    label: asString(raw.label),
    description: asString(raw.description),
    relation: asString(raw.relation),
    group: asString(raw.group),
    route: asString(raw.route),
    resolverKey: asString(raw.resolver_key),
    entityType: asString(raw.entity_type),
  };
}

export function normalizeTranslationDashboardCard(value: unknown): TranslationDashboardCard | null {
  const raw = asRecord(value);
  const id = asString(raw.id);
  if (!id) {
    return null;
  }
  const alert = asRecord(raw.alert);
  return {
    id,
    label: asString(raw.label),
    description: asString(raw.description),
    count: asNumber(raw.count),
    breakdown: asNumberRecord(raw.breakdown),
    alert: {
      state: normalizeAlertState(alert.state),
      message: asString(alert.message),
    },
    drilldown: normalizeTranslationDashboardLink(raw.drilldown),
    metricKey: asString(raw.metric_key),
    runbookId: asString(raw.runbook_id),
  };
}

export function normalizeTranslationDashboardTableRow(value: unknown): TranslationDashboardTableRow | null {
  const raw = asRecord(value);
  if (Object.keys(raw).length === 0) {
    return null;
  }
  const links: Record<string, TranslationDashboardLink> = {};
  for (const [key, candidate] of Object.entries(asRecord(raw.links))) {
    const link = normalizeTranslationDashboardLink(candidate);
    if (link) {
      links[key] = link;
    }
  }
  return {
    ...raw,
    links,
  };
}

export function normalizeTranslationDashboardTable(value: unknown, fallbackID = ''): TranslationDashboardTable {
  const raw = asRecord(value);
  const rows = asList(raw.rows, normalizeTranslationDashboardTableRow);
  return {
    id: asString(raw.id) || fallbackID,
    label: asString(raw.label) || fallbackID,
    total: asNumber(raw.total, rows.length),
    limit: asNumber(raw.limit, rows.length),
    rows,
  };
}

export function normalizeTranslationDashboardRunbook(value: unknown): TranslationDashboardRunbook | null {
  const raw = asRecord(value);
  const id = asString(raw.id);
  if (!id) {
    return null;
  }
  return {
    id,
    title: asString(raw.title),
    description: asString(raw.description),
    route: asString(raw.route),
    resolverKey: asString(raw.resolver_key),
    href: asString(raw.href),
    query: asStringRecord(raw.query),
  };
}

export function normalizeTranslationDashboardQueryModel(value: unknown): TranslationDashboardQueryModel | null {
  const raw = asRecord(value);
  const id = asString(raw.id);
  if (!id) {
    return null;
  }
  const drilldownLinks: Record<string, TranslationDashboardLinkTemplate> = {};
  for (const [key, candidate] of Object.entries(asRecord(raw.drilldown_links))) {
    const link = normalizeTranslationDashboardLinkTemplate(candidate);
    if (link) {
      drilldownLinks[key] = link;
    }
  }
  return {
    id,
    description: asString(raw.description),
    scopeFields: asList(raw.scope_fields, (item) => asString(item) || null),
    stableSortKeys: asList(raw.stable_sort_keys, (item) => asString(item) || null),
    indexHints: asList(raw.index_hints, (item) => asString(item) || null),
    supportedFilters: asList(raw.supported_filters, (item) => asString(item) || null),
    defaultLimit: asNumber(raw.default_limit),
    drilldownRoute: asString(raw.drilldown_route),
    queueRoute: asString(raw.queue_route),
    apiRoute: asString(raw.api_route),
    resolverKeys: asList(raw.resolver_keys, (item) => asString(item) || null),
    drilldownLinks,
  };
}

function normalizeTranslationDashboardContracts(value: unknown): TranslationDashboardContracts {
  const raw = asRecord(value);
  const queryModels: Record<string, TranslationDashboardQueryModel> = {};
  for (const [key, candidate] of Object.entries(asRecord(raw.query_models))) {
    const model = normalizeTranslationDashboardQueryModel(candidate);
    if (model) {
      queryModels[key] = model;
    }
  }
  return {
    cardIds: asList(raw.card_ids, (item) => asString(item) || null),
    tableIds: asList(raw.table_ids, (item) => asString(item) || null),
    alertStates: asList(raw.alert_states, (item) => normalizeAlertState(item)),
    defaultLimits: asNumberRecord(raw.default_limits),
    queryModels,
    runbooks: asList(raw.runbooks, normalizeTranslationDashboardRunbook),
  };
}

function normalizeTranslationDashboardAlert(value: unknown): TranslationDashboardAlert | null {
  const raw = asRecord(value);
  const code = asString(raw.code);
  if (!code) {
    return null;
  }
  return {
    state: normalizeAlertState(raw.state),
    code,
    message: asString(raw.message),
    cardId: asString(raw.card_id),
    runbookId: asString(raw.runbook_id),
  };
}

function sortCardsByContract(cards: TranslationDashboardCard[], contracts: TranslationDashboardContracts): TranslationDashboardCard[] {
  if (contracts.cardIds.length === 0) {
    return cards;
  }
  const rank = new Map<string, number>();
  contracts.cardIds.forEach((id, index) => rank.set(id, index));
  return [...cards].sort((left, right) => {
    return (rank.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right.id) ?? Number.MAX_SAFE_INTEGER);
  });
}

export function normalizeTranslationDashboardResponse(value: unknown): TranslationDashboardResponse {
  const root = asRecord(value);
  const data = asRecord(root.data);
  const meta = asRecord(root.meta);
  const contracts = normalizeTranslationDashboardContracts(meta.contracts);

  const cards = sortCardsByContract(
    asList(data.cards, normalizeTranslationDashboardCard),
    contracts
  );

  const tables: Record<string, TranslationDashboardTable> = {};
  for (const [key, candidate] of Object.entries(asRecord(data.tables))) {
    tables[key] = normalizeTranslationDashboardTable(candidate, key);
  }

  const queryModels: Record<string, TranslationDashboardQueryModel> = { ...contracts.queryModels };
  for (const [key, candidate] of Object.entries(asRecord(meta.query_models))) {
    const model = normalizeTranslationDashboardQueryModel(candidate);
    if (model) {
      queryModels[key] = model;
    }
  }

  return {
    data: {
      cards,
      tables,
      alerts: asList(data.alerts, normalizeTranslationDashboardAlert),
      runbooks: asList(data.runbooks, normalizeTranslationDashboardRunbook),
      summary: asNumberRecord(data.summary),
    },
    meta: {
      environment: asString(meta.environment),
      generatedAt: asString(meta.generated_at),
      refreshIntervalMs: asNumber(meta.refresh_interval_ms, 30000),
      latencyTargetMs: asNumber(meta.latency_target_ms, 0),
      degraded: meta.degraded === true,
      degradedReasons: asList(meta.degraded_reasons, (item) => {
        const record = asRecord(item);
        const component = asString(record.component);
        const message = asString(record.message);
        if (!component && !message) {
          return null;
        }
        return { component, message };
      }),
      familyReport: asRecord(meta.family_report),
      scope: asStringRecord(meta.scope),
      metrics: asList(meta.metrics, (item) => {
        const record = asRecord(item);
        const key = asString(record.key);
        if (!key) {
          return null;
        }
        return {
          key,
          unit: asString(record.unit),
          sloP95Ms: record.slo_p95_ms === undefined ? null : asNumber(record.slo_p95_ms),
        };
      }),
      queryModels,
      contracts: {
        ...contracts,
        queryModels,
      },
    },
  };
}

export function buildTranslationDashboardURL(endpoint: string, query: TranslationDashboardQuery = {}): string {
  const normalizedEndpoint = asString(endpoint);
  if (!normalizedEndpoint) {
    return '';
  }
  const base = normalizedEndpoint.startsWith('http://') || normalizedEndpoint.startsWith('https://')
    ? undefined
    : 'http://localhost';
  const url = new URL(normalizedEndpoint, base);
  const pairs: Array<[string, string]> = [
    ['environment', asString(query.environment)],
    ['tenant_id', asString(query.tenantId)],
    ['org_id', asString(query.orgId)],
    ['overdue_limit', query.overdueLimit != null ? String(query.overdueLimit) : ''],
    ['blocked_limit', query.blockedLimit != null ? String(query.blockedLimit) : ''],
  ];
  for (const [key, value] of pairs) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return base ? `${url.pathname}${url.search}` : url.toString();
}

export function createTranslationDashboardClient(options: TranslationDashboardClientOptions): TranslationDashboardClient {
  const endpoint = asString(options.endpoint);
  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
  return {
    async fetchDashboard(query: TranslationDashboardQuery = {}): Promise<TranslationDashboardResponse> {
      if (!endpoint) {
        throw new TranslationDashboardRequestError({
          message: 'Translation dashboard endpoint is not configured',
          status: 0,
          code: 'MISSING_CONTEXT',
        });
      }
      const target = buildTranslationDashboardURL(endpoint, query);
      if (!fetchImpl) {
        throw new TranslationDashboardRequestError({
          message: 'Fetch implementation is not available',
          status: 0,
          code: 'MISSING_CONTEXT',
        });
      }
      const response = await fetchImpl(target, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        const structured = await extractStructuredError(response.clone());
        throw new TranslationDashboardRequestError({
          message: structured.message || await readHTTPError(response, 'Failed to load translation dashboard'),
          status: response.status,
          code: structured.textCode,
          requestId: response.headers.get('x-request-id') ?? response.headers.get('X-Request-ID') ?? undefined,
          traceId: response.headers.get('x-trace-id') ?? response.headers.get('x-correlation-id') ?? undefined,
          metadata: structured.metadata,
        });
      }
      return normalizeTranslationDashboardResponse(await response.json());
    },
  };
}

export function createTranslationDashboardRefreshController(options: TranslationDashboardRefreshOptions): TranslationDashboardRefreshController {
  const intervalMs = Math.max(0, options.intervalMs ?? 30000);
  let timer: ReturnType<typeof setInterval> | null = null;
  let inFlight: Promise<TranslationDashboardResponse> | null = null;

  const run = async (): Promise<TranslationDashboardResponse> => {
    if (inFlight) {
      return inFlight;
    }
    inFlight = (async () => {
      try {
        const payload = await options.load();
        options.onData?.(payload);
        return payload;
      } catch (error) {
        options.onError?.(error);
        throw error;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  };

  return {
    async start() {
      await run();
      if (intervalMs > 0 && timer == null) {
        timer = globalThis.setInterval(() => {
          void run().catch(() => undefined);
        }, intervalMs);
      }
    },
    stop() {
      if (timer != null) {
        globalThis.clearInterval(timer);
        timer = null;
      }
    },
    refresh: run,
    isRunning() {
      return timer != null;
    },
  };
}

function formatMetricLabel(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderLink(label: string, link: TranslationDashboardLink | null, fallbackClass = ''): string {
  const safeLabel = escapeHTML(label);
  if (link?.href) {
    return `<a class="${escapeAttribute(fallbackClass)} text-sky-700 hover:text-sky-900 hover:underline" href="${escapeAttribute(link.href)}">${safeLabel}</a>`;
  }
  return `<span class="${escapeAttribute(fallbackClass)}">${safeLabel}</span>`;
}

function sortLinksByRelation(links: TranslationDashboardLink[]): TranslationDashboardLink[] {
  return [...links].sort((left, right) => {
    const rank = (value: string): number => value === 'primary' ? 0 : 1;
    return rank(left.relation) - rank(right.relation);
  });
}

function renderLinkedActions(links: TranslationDashboardLink[], emptyLabel = 'No drill-downs'): string {
  if (links.length === 0) {
    return `<span class="text-gray-400">${escapeHTML(emptyLabel)}</span>`;
  }
  return sortLinksByRelation(links)
    .map((link) => {
      const label = link.label || 'Open';
      if (link.href) {
        return `<a class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900" data-dashboard-link="${escapeAttribute(link.key || label.toLowerCase())}" href="${escapeAttribute(link.href)}">${escapeHTML(label)}</a>`;
      }
      return `<span class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400">${escapeHTML(label)}</span>`;
    })
    .join('');
}

function renderCard(card: TranslationDashboardCard): string {
  const breakdown = Object.entries(card.breakdown)
    .map(([key, value]) => `
      <li class="flex items-center justify-between gap-3 text-xs text-gray-600">
        <span>${escapeHTML(formatMetricLabel(key))}</span>
        <span class="font-semibold text-gray-900">${escapeHTML(String(value))}</span>
      </li>
    `)
    .join('');

  return `
    <article class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" data-dashboard-card="${escapeAttribute(card.id)}">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">${escapeHTML(card.label)}</p>
          <p class="mt-2 text-3xl font-semibold tracking-tight text-gray-900">${escapeHTML(String(card.count))}</p>
        </div>
        <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${escapeAttribute(alertToneClass(card.alert.state))}">
          ${escapeHTML(card.alert.message || card.alert.state)}
        </span>
      </div>
      <p class="mt-3 text-sm leading-6 text-gray-600">${escapeHTML(card.description)}</p>
      ${breakdown ? `<ul class="mt-4 space-y-2">${breakdown}</ul>` : ''}
      <div class="mt-4 flex items-center justify-between gap-3 text-sm">
        ${renderLink(card.drilldown?.label || 'Open drilldown', card.drilldown)}
        <span class="text-xs text-gray-400">${escapeHTML(card.metricKey)}</span>
      </div>
    </article>
  `;
}

function renderAlerts(alerts: TranslationDashboardAlert[]): string {
  if (alerts.length === 0) {
    return '';
  }
  return `
    <section class="space-y-3" data-dashboard-alerts="true">
      ${alerts.map((alert) => `
        <div class="rounded-2xl border px-4 py-3 text-sm ${escapeAttribute(alertToneContainerClass(alert.state))}" role="${escapeAttribute(alert.state === 'critical' ? 'alert' : 'status')}">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="font-semibold">${escapeHTML(alert.code)}</p>
              <p class="mt-1">${escapeHTML(alert.message)}</p>
            </div>
            ${alert.runbookId ? `<span class="text-xs uppercase tracking-[0.22em]">${escapeHTML(alert.runbookId)}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </section>
  `;
}

function renderTopOverdueTable(table: TranslationDashboardTable): string {
  return `
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <caption class="sr-only">Top overdue assignments with assignment and queue drill-down actions.</caption>
      <thead class="bg-gray-50 text-left text-xs uppercase tracking-[0.2em] text-gray-500">
        <tr>
          <th scope="col" class="px-4 py-3">Assignment</th>
          <th scope="col" class="px-4 py-3">Locale</th>
          <th scope="col" class="px-4 py-3">Priority</th>
          <th scope="col" class="px-4 py-3">Status</th>
          <th scope="col" class="px-4 py-3 text-right">Overdue</th>
          <th scope="col" class="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        ${table.rows.map((row) => `
          <tr>
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${renderLink(asString(row.source_title) || asString(row.assignment_id), row.links.assignment)}</div>
              <div class="mt-1 text-xs text-gray-500">${escapeHTML(asString(row.assignment_id))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${escapeHTML(`${asString(row.source_locale).toUpperCase()} -> ${asString(row.target_locale).toUpperCase()}`)}</td>
            <td class="px-4 py-3 text-gray-600">${escapeHTML(formatMetricLabel(asString(row.priority)))}</td>
            <td class="px-4 py-3 text-gray-600">${escapeHTML(formatMetricLabel(asString(row.status)))}</td>
            <td class="px-4 py-3 text-right font-medium text-rose-700">${escapeHTML(`${asNumber(row.overdue_minutes)}m`)}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Assignment drill-down actions">${renderLinkedActions(Object.values(row.links || {}))}</div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderBlockedFamiliesTable(table: TranslationDashboardTable): string {
  return `
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <caption class="sr-only">Blocked families with family detail and blocker feed drill-down actions.</caption>
      <thead class="bg-gray-50 text-left text-xs uppercase tracking-[0.2em] text-gray-500">
        <tr>
          <th scope="col" class="px-4 py-3">Family</th>
          <th scope="col" class="px-4 py-3">Readiness</th>
          <th scope="col" class="px-4 py-3 text-right">Missing</th>
          <th scope="col" class="px-4 py-3 text-right">Review</th>
          <th scope="col" class="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        ${table.rows.map((row) => `
          <tr>
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${renderLink(asString(row.family_id), row.links.family)}</div>
              <div class="mt-1 text-xs text-gray-500">${escapeHTML(asString(row.content_type))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${escapeHTML(formatMetricLabel(asString(row.readiness_state)))}</td>
            <td class="px-4 py-3 text-right font-medium text-amber-700">${escapeHTML(String(asNumber(row.missing_required_locale_count)))}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-700">${escapeHTML(String(asNumber(row.pending_review_count)))}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Family drill-down actions">${renderLinkedActions(Object.values(row.links || {}))}</div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderTable(table: TranslationDashboardTable): string {
  const content = table.id === 'top_overdue_assignments'
    ? renderTopOverdueTable(table)
    : renderBlockedFamiliesTable(table);
  return `
    <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" data-dashboard-table="${escapeAttribute(table.id)}">
      <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">${escapeHTML(table.label)}</h2>
          <p class="mt-1 text-xs text-gray-500">Showing ${escapeHTML(String(table.rows.length))} of ${escapeHTML(String(table.total))}</p>
        </div>
      </header>
      <div class="overflow-x-auto">${content}</div>
    </section>
  `;
}

function renderRunbooks(runbooks: TranslationDashboardRunbook[]): string {
  if (runbooks.length === 0) {
    return '';
  }
  return `
    <section class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" data-dashboard-runbooks="true">
      <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">Runbooks</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        ${runbooks.map((runbook) => `
          <article class="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h3 class="text-sm font-semibold text-gray-900">${runbook.href ? `<a class="hover:underline" href="${escapeAttribute(runbook.href)}">${escapeHTML(runbook.title)}</a>` : escapeHTML(runbook.title)}</h3>
            <p class="mt-2 text-sm leading-6 text-gray-600">${escapeHTML(runbook.description)}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function alertToneClass(state: DashboardAlertState): string {
  switch (state) {
    case 'critical':
      return 'bg-rose-100 text-rose-700';
    case 'warning':
      return 'bg-amber-100 text-amber-700';
    case 'degraded':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-emerald-100 text-emerald-700';
  }
}

function alertToneContainerClass(state: DashboardAlertState): string {
  switch (state) {
    case 'critical':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'degraded':
      return 'border-gray-200 bg-gray-50 text-gray-800';
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
}

function renderSummaryMeta(payload: TranslationDashboardResponse): string {
  const scopeParts = Object.entries(payload.meta.scope)
    .filter(([, value]) => value)
    .map(([key, value]) => `${formatMetricLabel(key)}: ${value}`);
  return `
    <section class="rounded-2xl border border-gray-200 bg-gray-900 px-5 py-4 text-sm text-gray-200 shadow-sm" data-dashboard-meta="true">
      <div class="flex flex-wrap items-center gap-4">
        <span><strong class="font-semibold text-white">Environment:</strong> ${escapeHTML(payload.meta.environment || 'default')}</span>
        <span><strong class="font-semibold text-white">Refresh:</strong> ${escapeHTML(String(payload.meta.refreshIntervalMs))}ms</span>
        <span><strong class="font-semibold text-white">Latency target:</strong> ${escapeHTML(String(payload.meta.latencyTargetMs))}ms p95</span>
      </div>
      ${scopeParts.length > 0 ? `<p class="mt-2 text-xs uppercase tracking-[0.18em] text-gray-400">${escapeHTML(scopeParts.join(' • '))}</p>` : ''}
    </section>
  `;
}

function renderToolbar(payload: TranslationDashboardResponse | null, refreshing = false): string {
  const generatedAt = payload?.meta.generatedAt
    ? new Date(payload.meta.generatedAt).toLocaleString()
    : 'Unavailable';
  return `
    <section class="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm" data-dashboard-toolbar="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Manager Monitoring</p>
          <h2 class="mt-2 text-xl font-semibold tracking-tight text-gray-900">Queue health and publish blockers</h2>
          <p class="mt-2 text-sm text-gray-600">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs uppercase tracking-[0.18em] text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
            ${escapeHTML(refreshing ? 'Refreshing dashboard…' : `Last updated ${generatedAt}`)}
          </span>
          <button type="button" class="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400" data-dashboard-refresh-button="true" aria-label="Refresh translation dashboard" ${refreshing ? 'disabled' : ''}>
            ${escapeHTML(refreshing ? 'Refreshing…' : 'Refresh dashboard')}
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderEmptyState(payload: TranslationDashboardResponse): string {
  const runbook = payload.data.runbooks[0];
  const action = runbook?.href
    ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${escapeAttribute(runbook.href)}">${escapeHTML(runbook.title || 'Open runbook')}</a>`
    : '';
  return `
    <section class="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600 shadow-sm" data-dashboard-empty="true" role="status" aria-live="polite">
      <p class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">No active pressure</p>
      <h3 class="mt-2 text-xl font-semibold text-gray-900">This scope is clear right now.</h3>
      <p class="mt-3 max-w-2xl leading-6">Managers can refresh the aggregate snapshot to confirm the latest state or jump into a runbook if activity is expected to resume.</p>
      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800" data-dashboard-refresh-button="true">Refresh dashboard</button>
        ${action}
      </div>
    </section>
  `;
}

function renderInlineError(error: unknown): string {
  const requestID = error instanceof TranslationDashboardRequestError ? error.requestId : undefined;
  const traceID = error instanceof TranslationDashboardRequestError ? error.traceId : undefined;
  const metadata = [requestID ? `Request ${requestID}` : '', traceID ? `Trace ${traceID}` : ''].filter(Boolean).join(' • ');
  return `
    <section class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" data-dashboard-inline-error="true" role="alert">
      <p class="font-semibold">Latest refresh failed</p>
      <p class="mt-2">${escapeHTML(error instanceof Error ? error.message : 'Failed to load translation dashboard')}</p>
      ${metadata ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-rose-700">${escapeHTML(metadata)}</p>` : ''}
    </section>
  `;
}

function renderError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Failed to load translation dashboard';
  const requestID = error instanceof TranslationDashboardRequestError ? error.requestId : undefined;
  const traceID = error instanceof TranslationDashboardRequestError ? error.traceId : undefined;
  const metadata = [requestID ? `Request ${requestID}` : '', traceID ? `Trace ${traceID}` : ''].filter(Boolean).join(' • ');
  return `
    <section class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" data-dashboard-error="true" role="alert">
      <p class="font-semibold">Translation dashboard unavailable</p>
      <p class="mt-2">Managers can retry the aggregate request and return to queue-health monitoring once the endpoint recovers.</p>
      <p class="mt-2">${escapeHTML(message)}</p>
      ${metadata ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-rose-700">${escapeHTML(metadata)}</p>` : ''}
      <div class="mt-4">
        <button type="button" class="inline-flex items-center rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800" data-dashboard-refresh-button="true">Retry dashboard</button>
      </div>
    </section>
  `;
}

function renderUnconfiguredState(): string {
  return `
    <section class="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600" data-dashboard-empty="true">
      <p class="font-semibold text-gray-900">Dashboard contract route is not wired.</p>
      <p class="mt-2">Set a dashboard aggregate endpoint before initializing the dashboard client.</p>
    </section>
  `;
}

function renderLoadingState(): string {
  return `
    <section class="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600" data-dashboard-loading="true" role="status" aria-live="polite">
      Loading translation dashboard aggregates...
    </section>
  `;
}

export class TranslationDashboardPage {
  private config: TranslationDashboardPageConfig;
  private client: TranslationDashboardClient;
  private refreshController: TranslationDashboardRefreshController | null = null;
  private container: HTMLElement | null = null;
  private state: TranslationDashboardScreenState = 'idle';
  private payload: TranslationDashboardResponse | null = null;
  private refreshing = false;
  private lastError: unknown = null;

  constructor(config: TranslationDashboardPageConfig) {
    this.config = {
      refreshInterval: 30000,
      title: 'Translation Dashboard',
      ...config,
    };
    this.client = createTranslationDashboardClient(config);
  }

  mount(container: HTMLElement): void {
    this.container = container;
    if (!asString(this.config.endpoint)) {
      this.state = 'error';
      container.innerHTML = renderUnconfiguredState();
      return;
    }
    this.state = 'loading';
    this.refreshing = false;
    this.lastError = null;
    container.innerHTML = renderLoadingState();
    this.refreshController = createTranslationDashboardRefreshController({
      intervalMs: this.config.refreshInterval,
      load: () => this.client.fetchDashboard(),
      onData: (payload) => {
        this.payload = payload;
        this.state = 'ready';
        this.refreshing = false;
        this.lastError = null;
        this.render();
      },
      onError: (error) => {
        this.refreshing = false;
        this.lastError = error;
        if (this.payload) {
          this.state = 'ready';
          this.render();
          return;
        }
        this.state = 'error';
        if (this.container) {
          this.container.innerHTML = renderError(error);
          this.bindActions();
        }
      },
    });
    void this.refreshController.start().catch(() => undefined);
  }

  unmount(): void {
    this.refreshController?.stop();
    this.refreshController = null;
    this.container = null;
  }

  getState(): TranslationDashboardScreenState {
    return this.state;
  }

  getData(): TranslationDashboardResponse | null {
    return this.payload;
  }

  async refresh(): Promise<TranslationDashboardResponse> {
    this.lastError = null;
    this.refreshing = true;
    if (this.payload) {
      this.render();
    } else if (this.container) {
      this.state = 'loading';
      this.container.innerHTML = renderLoadingState();
    }
    if (!this.refreshController) {
      const payload = await this.client.fetchDashboard();
      this.payload = payload;
      this.state = 'ready';
      this.refreshing = false;
      this.render();
      return payload;
    }
    try {
      return await this.refreshController.refresh();
    } finally {
      this.refreshing = false;
    }
  }

  private render(): void {
    if (!this.container || !this.payload) {
      return;
    }
    const payload = this.payload;
    const cards = payload.data.cards.map(renderCard).join('');
    const tables = Object.values(payload.data.tables).map(renderTable).join('');
    const empty = Object.values(payload.data.summary).every((value) => value === 0)
      && Object.values(payload.data.tables).every((table) => table.rows.length === 0);
    const degraded = payload.meta.degraded
      ? `
        <section class="rounded-2xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${escapeHTML(payload.meta.degradedReasons.map((item) => `${item.component}: ${item.message}`).join(' | ') || 'Retry the dashboard request to refresh family blocker data.')}</p>
        </section>
      `
      : '';
    const inlineError = this.lastError ? renderInlineError(this.lastError) : '';

    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${renderToolbar(payload, this.refreshing)}
        ${renderSummaryMeta(payload)}
        ${inlineError}
        ${degraded}
        ${renderAlerts(payload.data.alerts)}
        ${empty
          ? renderEmptyState(payload)
          : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${cards}</section>
            <section class="grid gap-4 xl:grid-cols-2">${tables}</section>
          `}
        ${renderRunbooks(payload.data.runbooks)}
      </div>
    `;
    this.bindActions();
  }

  private bindActions(): void {
    if (!this.container || typeof this.container.querySelectorAll !== 'function') {
      return;
    }
    const buttons = this.container.querySelectorAll<HTMLButtonElement>('[data-dashboard-refresh-button]');
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        void this.refresh().catch(() => undefined);
      });
    });
  }
}

export function initTranslationDashboardPage(root: HTMLElement, options: Partial<TranslationDashboardPageConfig> = {}): TranslationDashboardPage | null {
  if (!root) {
    return null;
  }
  const page = new TranslationDashboardPage({
    endpoint: options.endpoint ?? root.dataset.endpoint ?? '',
    queueEndpoint: options.queueEndpoint ?? root.dataset.queueEndpoint ?? '',
    familiesEndpoint: options.familiesEndpoint ?? root.dataset.familiesEndpoint ?? '',
    refreshInterval: options.refreshInterval ?? asNumber(root.dataset.refreshInterval, 30000),
    title: options.title ?? root.dataset.title ?? 'Translation Dashboard',
    fetch: options.fetch,
  });
  page.mount(root);
  return page;
}
