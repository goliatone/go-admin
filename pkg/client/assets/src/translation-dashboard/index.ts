import { escapeAttribute, escapeHTML } from '../shared/html.js';
import { asNumberish as asNumber, asRecord, asString } from '../shared/coercion.js';
import { buildEndpointURL } from '../shared/query-state/url-state.js';
import { normalizeNumberRecord, normalizeStringRecord } from '../shared/record-normalization.js';
import { StatefulController } from '../shared/stateful-controller.js';
import { readHTTPError } from '../shared/transport/http-client.js';
import { renderPanelLoadingState, renderPanelState } from '../services/ui-states.js';
import { extractStructuredError } from '../toast/error-helpers.js';
import {
  BTN_PRIMARY,
  BTN_DANGER,
  HEADER_PRETITLE,
  HEADER_TITLE,
  HEADER_DESCRIPTION,
  EMPTY_STATE,
  EMPTY_STATE_TITLE,
  EMPTY_STATE_TEXT,
  ERROR_STATE,
  ERROR_STATE_TITLE,
  ERROR_STATE_TEXT,
  LOADING_STATE,
  CARD,
  getStatusColorClass,
} from '../translation-shared/index.js';

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

// Remediation context for blocked families (T08)
export interface TranslationDashboardReasonBreakdown {
  code: string;
  label: string;
  count: number;
  affectedLocales: string[];
}

export interface TranslationDashboardReasonData {
  state: 'available' | 'unavailable' | 'degraded';
  message: string;
}

export interface TranslationDashboardTableRow {
  [key: string]: unknown;
  links: Record<string, TranslationDashboardLink>;
  blockerCodes?: string[];
  blockerLabels?: Record<string, string>;
  reasonBreakdown?: TranslationDashboardReasonBreakdown[];
  affectedLocales?: string[];
  reasonData?: TranslationDashboardReasonData;
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
  channel: string;
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
  channel?: string;
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
    params: normalizeStringRecord(raw.params, { omitEmptyValues: true }),
    query: normalizeStringRecord(raw.query, { omitEmptyValues: true }),
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
    breakdown: normalizeNumberRecord(raw.breakdown),
    alert: {
      state: normalizeAlertState(alert.state),
      message: asString(alert.message),
    },
    drilldown: normalizeTranslationDashboardLink(raw.drilldown),
    metricKey: asString(raw.metric_key),
    runbookId: asString(raw.runbook_id),
  };
}

function normalizeReasonBreakdown(value: unknown): TranslationDashboardReasonBreakdown | null {
  const raw = asRecord(value);
  const code = asString(raw.code);
  if (!code) return null;
  return {
    code,
    label: asString(raw.label) || formatMetricLabel(code),
    count: asNumber(raw.count),
    affectedLocales: asList(raw.affected_locales, (item) => asString(item) || null),
  };
}

function normalizeReasonData(value: unknown): TranslationDashboardReasonData | undefined {
  const raw = asRecord(value);
  const state = asString(raw.state);
  if (!state || (state !== 'available' && state !== 'unavailable' && state !== 'degraded')) {
    return undefined;
  }
  return {
    state,
    message: asString(raw.message),
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

  // Parse remediation context fields (T08)
  const blockerCodes = asList(raw.blocker_codes, (item) => asString(item) || null);
  const blockerLabels: Record<string, string> = {};
  for (const [key, label] of Object.entries(asRecord(raw.blocker_labels))) {
    const labelStr = asString(label);
    if (labelStr) {
      blockerLabels[key] = labelStr;
    }
  }
  const reasonBreakdown = asList(raw.reason_breakdown, normalizeReasonBreakdown);
  const affectedLocales = asList(raw.affected_locales, (item) => asString(item) || null);
  const reasonData = normalizeReasonData(raw.reason_data);

  return {
    ...raw,
    links,
    blockerCodes: blockerCodes.length > 0 ? blockerCodes : undefined,
    blockerLabels: Object.keys(blockerLabels).length > 0 ? blockerLabels : undefined,
    reasonBreakdown: reasonBreakdown.length > 0 ? reasonBreakdown : undefined,
    affectedLocales: affectedLocales.length > 0 ? affectedLocales : undefined,
    reasonData,
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
    query: normalizeStringRecord(raw.query, { omitEmptyValues: true }),
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
    defaultLimits: normalizeNumberRecord(raw.default_limits),
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
      summary: normalizeNumberRecord(data.summary),
    },
    meta: {
      channel: asString(meta.channel),
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
      scope: normalizeStringRecord(meta.scope, { omitEmptyValues: true }),
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
  const params = new URLSearchParams();
  const pairs: Array<[string, string]> = [
    ['channel', asString(query.channel)],
    ['tenant_id', asString(query.tenantId)],
    ['org_id', asString(query.orgId)],
    ['overdue_limit', query.overdueLimit != null ? String(query.overdueLimit) : ''],
    ['blocked_limit', query.blockedLimit != null ? String(query.blockedLimit) : ''],
  ];
  for (const [key, value] of pairs) {
    if (value) {
      params.set(key, value);
    }
  }
  return buildEndpointURL(endpoint, params, { preserveAbsolute: true });
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
  // Strip TRANSLATIONS.DASHBOARD. prefix if present to avoid leaking raw metric keys
  const cleaned = value.replace(/^TRANSLATIONS\.DASHBOARD\./i, '');
  return cleaned
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Human-readable label lookups for dashboard elements (T07)
const CARD_LABELS: Record<string, { label: string; shortLabel?: string }> = {
  my_tasks: { label: 'My Tasks', shortLabel: 'Tasks' },
  needs_review: { label: 'Needs Review', shortLabel: 'Review' },
  overdue_tasks: { label: 'Overdue Tasks', shortLabel: 'Overdue' },
  blocked_families: { label: 'Blocked Families', shortLabel: 'Blocked' },
  missing_required_locales: { label: 'Missing Required Locales', shortLabel: 'Missing' },
};

const TABLE_LABELS: Record<string, string> = {
  top_overdue_assignments: 'Top Overdue Assignments',
  blocked_families: 'Blocked Families',
};

// Tab configuration for tables (Fix 2)
const TABLE_TAB_CONFIG: Record<string, { label: string; shortLabel: string; icon: string }> = {
  top_overdue_assignments: {
    label: 'Top Overdue Assignments',
    shortLabel: 'Overdue',
    icon: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  },
  blocked_families: {
    label: 'Blocked Families',
    shortLabel: 'Blocked',
    icon: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>',
  },
};

const RUNBOOK_LABELS: Record<string, { label: string; shortLabel: string; icon: string }> = {
  'translations.dashboard.overdue_triage': {
    label: 'Overdue Assignment Triage',
    shortLabel: 'Overdue Triage',
    icon: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  },
  'translations.dashboard.review_backlog': {
    label: 'Reviewer Backlog Triage',
    shortLabel: 'Review Backlog',
    icon: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>',
  },
  'translations.dashboard.publish_blockers': {
    label: 'Publish Blocker Remediation',
    shortLabel: 'Fix Blockers',
    icon: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
  },
};

const METRIC_KEY_LABELS: Record<string, string> = {
  'translations.dashboard.my_tasks': 'Actor Task Count',
  'translations.dashboard.needs_review': 'Review Queue Depth',
  'translations.dashboard.overdue_tasks': 'Overdue Assignment Count',
  'translations.dashboard.blocked_families': 'Blocked Family Count',
  'translations.dashboard.missing_required_locales': 'Missing Locale Count',
};

function getCardLabel(cardId: string, fallback: string): string {
  return CARD_LABELS[cardId]?.label || fallback || formatMetricLabel(cardId);
}

function getCardShortLabel(cardId: string, fallback: string): string {
  return CARD_LABELS[cardId]?.shortLabel || CARD_LABELS[cardId]?.label || fallback || formatMetricLabel(cardId);
}

function getTableLabel(tableId: string, fallback: string): string {
  return TABLE_LABELS[tableId] || fallback || formatMetricLabel(tableId);
}

function getRunbookLabel(runbookId: string, fallback: string): string {
  return RUNBOOK_LABELS[runbookId]?.label || fallback || formatMetricLabel(runbookId);
}

function getRunbookShortLabel(runbookId: string, fallback: string): string {
  return RUNBOOK_LABELS[runbookId]?.shortLabel || RUNBOOK_LABELS[runbookId]?.label || fallback || formatMetricLabel(runbookId);
}

function getRunbookIcon(runbookId: string): string {
  return RUNBOOK_LABELS[runbookId]?.icon || '';
}

// Button variant styles (Fix 4)
const BTN_SECONDARY = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors';
const BTN_GHOST = 'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors';

// UUID truncation helper (Fix 7)
function renderTruncatedUUID(uuid: string): string {
  const trimmed = uuid.trim();
  if (!trimmed || trimmed.length < 12) {
    return `<span class="font-mono text-xs text-gray-500">${escapeHTML(trimmed)}</span>`;
  }
  const truncated = `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
  return `
    <button type="button"
            class="inline-flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-gray-900 group cursor-pointer bg-transparent border-none p-0"
            data-copy-uuid="${escapeAttribute(trimmed)}"
            title="Click to copy: ${escapeAttribute(trimmed)}">
      <span>${escapeHTML(truncated)}</span>
      <svg class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
    </button>
  `;
}

function getMetricKeyLabel(metricKey: string): string {
  return METRIC_KEY_LABELS[metricKey] || formatMetricLabel(metricKey);
}

function formatRefreshInterval(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

function formatLatencyTarget(ms: number): string {
  if (ms <= 0) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
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

function renderCardDrilldown(card: TranslationDashboardCard): string {
  if (!card.drilldown?.href) {
    return `<span class="text-xs text-gray-400">No drilldown available</span>`;
  }
  return `
    <a
      href="${escapeAttribute(card.drilldown.href)}"
      class="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
      data-dashboard-drilldown="${escapeAttribute(card.id)}"
      title="${escapeAttribute(card.drilldown.description || card.drilldown.label || 'Open drilldown')}"
    >
      <span>${escapeHTML(card.drilldown.label || 'Open')}</span>
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    </a>
  `;
}

function renderCardRunbookLink(card: TranslationDashboardCard, runbooks: TranslationDashboardRunbook[]): string {
  if (!card.runbookId) return '';
  const runbook = runbooks.find((r) => r.id === card.runbookId);
  if (!runbook?.href) return '';
  const shortLabel = getRunbookShortLabel(card.runbookId, runbook.title);
  const icon = getRunbookIcon(card.runbookId);
  const fullLabel = getRunbookLabel(card.runbookId, runbook.title);
  return `
    <a
      href="${escapeAttribute(runbook.href)}"
      class="${BTN_GHOST}"
      data-dashboard-card-runbook="${escapeAttribute(card.id)}"
      title="${escapeAttribute(runbook.description || fullLabel)}"
    >
      ${icon || `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`}
      <span>${escapeHTML(shortLabel)}</span>
    </a>
  `;
}

function renderCard(card: TranslationDashboardCard, runbooks: TranslationDashboardRunbook[] = []): string {
  const cardShortLabel = getCardShortLabel(card.id, card.label);
  const cardFullLabel = getCardLabel(card.id, card.label);
  const titleText = card.description ? `${cardFullLabel} - ${card.description}` : cardFullLabel;

  return `
    <article class="${CARD} p-4 shadow-sm flex flex-col" data-dashboard-card="${escapeAttribute(card.id)}" title="${escapeAttribute(titleText)}">
      <div class="flex items-start justify-between gap-2">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 truncate">${escapeHTML(cardShortLabel)}</p>
        <span class="flex-shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${escapeAttribute(alertToneClass(card.alert.state))}">
          ${escapeHTML(card.alert.message || card.alert.state)}
        </span>
      </div>
      <div class="mt-3">
        <p class="text-3xl font-semibold tracking-tight text-gray-900">${escapeHTML(String(card.count))}</p>
      </div>
      <div class="mt-auto pt-4">
        ${renderCardDrilldown(card)}
      </div>
    </article>
  `;
}

// Get worst alert state (Fix 1)
function getWorstAlertState(alerts: TranslationDashboardAlert[]): DashboardAlertState {
  const severity: Record<DashboardAlertState, number> = {
    critical: 4,
    warning: 3,
    degraded: 2,
    ok: 1,
  };
  return alerts.reduce(
    (worst, alert) => (severity[alert.state] > severity[worst] ? alert.state : worst),
    'ok' as DashboardAlertState
  );
}

function renderDismissibleAlert(alert: TranslationDashboardAlert, cards: TranslationDashboardCard[]): string {
  const affectedCard = cards.find((c) => c.id === alert.cardId);
  const cardLabel = affectedCard ? getCardLabel(alert.cardId, affectedCard.label) : formatMetricLabel(alert.cardId);

  return `
    <div class="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/50"
         data-alert-code="${escapeAttribute(alert.code)}"
         role="${alert.state === 'critical' ? 'alert' : 'status'}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] ${escapeAttribute(alertToneClass(alert.state))}">${escapeHTML(cardLabel)}</span>
          <span class="text-xs font-medium text-gray-600">${escapeHTML(alert.state)}</span>
        </div>
        <p class="mt-1.5 text-sm text-gray-700">${escapeHTML(alert.message)}</p>
      </div>
      <button type="button"
              class="flex-shrink-0 p-1 rounded hover:bg-gray-200/50 transition-colors"
              data-dismiss-alert="${escapeAttribute(alert.code)}"
              aria-label="Dismiss alert for ${escapeHTML(cardLabel)}">
        <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;
}

function renderAlertSummaryBanner(
  alerts: TranslationDashboardAlert[],
  cards: TranslationDashboardCard[],
  expanded: boolean,
  dismissedSet: Set<string>
): string {
  const activeAlerts = alerts.filter((a) => !dismissedSet.has(a.code));
  if (activeAlerts.length === 0) {
    return '';
  }

  const worstState = getWorstAlertState(activeAlerts);
  const countBySeverity = activeAlerts.reduce((acc, a) => {
    acc[a.state] = (acc[a.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const summaryParts = Object.entries(countBySeverity)
    .filter(([, count]) => count > 0)
    .map(([state, count]) => `${count} ${state}`)
    .join(', ');

  // Render affected cards as chips in collapsed summary
  const affectedCardChips = activeAlerts
    .map((alert) => {
      const affectedCard = cards.find((c) => c.id === alert.cardId);
      const cardLabel = affectedCard ? getCardShortLabel(alert.cardId, affectedCard.label) : formatMetricLabel(alert.cardId);
      return `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-white/60 text-gray-700" data-alert-card="${escapeAttribute(alert.cardId)}">${escapeHTML(cardLabel)}</span>`;
    })
    .join('');

  const chevronRotation = expanded ? 'rotate-180' : '';

  return `
    <section class="rounded-xl border ${alertToneContainerClass(worstState)} shadow-sm overflow-hidden"
             data-dashboard-alerts-section="true"
             role="region"
             aria-label="Dashboard alerts">
      <button type="button"
              class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              data-alerts-toggle="true"
              aria-expanded="${expanded}">
        <div class="flex items-center gap-3 flex-wrap min-w-0 flex-1">
          <svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="text-sm font-semibold">${escapeHTML(summaryParts)}</span>
          ${!expanded ? `<div class="flex items-center gap-1.5 flex-wrap">${affectedCardChips}</div>` : ''}
        </div>
        <svg class="h-5 w-5 flex-shrink-0 transition-transform ${chevronRotation}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      <div class="${expanded ? '' : 'hidden'}" data-alerts-content="true">
        <div class="border-t border-current/20 px-4 py-3 space-y-2">
          ${activeAlerts.map((alert) => renderDismissibleAlert(alert, cards)).join('')}
        </div>
      </div>
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
              <div class="mt-1">${renderTruncatedUUID(asString(row.assignment_id))}</div>
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

function renderBlockerCodeChips(row: TranslationDashboardTableRow): string {
  const codes = row.blockerCodes || [];
  const labels = row.blockerLabels || {};
  if (codes.length === 0) return '';

  const renderedLabels = new Set<string>();
  const chips = codes.map((code) => {
    const label = labels[code] || formatMetricLabel(code);
    renderedLabels.add(label.toLowerCase());
    return { code, label };
  });
  for (const [code, label] of Object.entries(labels)) {
    const normalizedLabel = label.toLowerCase();
    if (codes.includes(code) || renderedLabels.has(normalizedLabel)) {
      continue;
    }
    renderedLabels.add(normalizedLabel);
    chips.push({ code, label });
  }

  return chips.map(({ code, label }) => {
    const colorClass = code === 'missing_locale' ? 'bg-amber-100 text-amber-800'
      : code === 'pending_review' ? 'bg-sky-100 text-sky-800'
      : code === 'outdated_source' ? 'bg-rose-100 text-rose-800'
      : 'bg-gray-100 text-gray-700';
    return `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${colorClass}" data-blocker-code="${escapeAttribute(code)}">${escapeHTML(label)}</span>`;
  }).join('');
}

function renderAffectedLocaleChips(row: TranslationDashboardTableRow): string {
  const locales = row.affectedLocales || [];
  if (locales.length === 0) return '';

  const maxVisible = 3;
  const visible = locales.slice(0, maxVisible);
  const remaining = locales.length - maxVisible;

  const chips = visible.map((locale) =>
    `<span class="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">${escapeHTML(locale.toUpperCase())}</span>`
  ).join('');

  const overflow = remaining > 0
    ? `<span class="inline-flex items-center text-xs text-gray-500">+${remaining}</span>`
    : '';

  return `<div class="flex flex-wrap items-center gap-1">${chips}${overflow}</div>`;
}

function renderReasonDataState(row: TranslationDashboardTableRow): string {
  const reasonData = row.reasonData;
  if (!reasonData) return '';

  if (reasonData.state === 'available') return '';

  const isDegraded = reasonData.state === 'degraded';
  const iconColor = isDegraded ? 'text-amber-500' : 'text-gray-400';
  const icon = isDegraded
    ? `<svg class="h-3.5 w-3.5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`
    : `<svg class="h-3.5 w-3.5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

  return `
    <span class="inline-flex items-center gap-1 text-xs text-gray-500" title="${escapeAttribute(reasonData.message || 'Reason data is ' + reasonData.state)}">
      ${icon}
      <span class="sr-only">${escapeHTML(reasonData.message || 'Reason data ' + reasonData.state)}</span>
    </span>
  `;
}

function renderBlockedFamiliesTable(table: TranslationDashboardTable): string {
  return `
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <caption class="sr-only">Blocked families with family detail, blocker codes, affected locales, and drill-down actions.</caption>
      <thead class="bg-gray-50 text-left text-xs uppercase tracking-[0.2em] text-gray-500">
        <tr>
          <th scope="col" class="px-4 py-3">Family</th>
          <th scope="col" class="px-4 py-3">Blockers</th>
          <th scope="col" class="px-4 py-3">Affected</th>
          <th scope="col" class="px-4 py-3 text-right">Missing</th>
          <th scope="col" class="px-4 py-3 text-right">Review</th>
          <th scope="col" class="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        ${table.rows.map((row) => `
          <tr data-family-row="${escapeAttribute(asString(row.family_id))}">
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${renderLink(asString(row.content_type) || 'Family', row.links.family)}</div>
              <div class="mt-1 flex items-center gap-2">
                ${renderTruncatedUUID(asString(row.family_id))}
                ${renderReasonDataState(row)}
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">${renderBlockerCodeChips(row)}</div>
            </td>
            <td class="px-4 py-3">
              ${renderAffectedLocaleChips(row)}
            </td>
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

function renderTable(
  table: TranslationDashboardTable,
  runbooks: TranslationDashboardRunbook[] = [],
  options: { embedded?: boolean } = {}
): string {
  const content = table.id === 'top_overdue_assignments'
    ? renderTopOverdueTable(table)
    : renderBlockedFamiliesTable(table);
  const tableLabel = getTableLabel(table.id, table.label);

  // Find contextual runbook for the table
  const tableRunbookMap: Record<string, string> = {
    top_overdue_assignments: 'translations.dashboard.overdue_triage',
    blocked_families: 'translations.dashboard.publish_blockers',
  };
  const runbookId = tableRunbookMap[table.id];
  const runbook = runbookId ? runbooks.find((r) => r.id === runbookId) : undefined;

  // When embedded in tabs, return just the header + content without the outer card
  if (options.embedded) {
    return `
      <div data-dashboard-table="${escapeAttribute(table.id)}">
        <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 bg-white">
          <div>
            <p class="text-xs text-gray-500">Showing top ${escapeHTML(String(table.rows.length))} of ${escapeHTML(String(table.total))}</p>
          </div>
          ${runbook?.href ? `
            <a
              href="${escapeAttribute(runbook.href)}"
              class="${BTN_SECONDARY}"
              data-dashboard-table-runbook="${escapeAttribute(table.id)}"
              title="${escapeAttribute(runbook.description || getRunbookLabel(runbookId || '', runbook.title))}"
            >
              ${getRunbookIcon(runbookId || '')}
              <span>${escapeHTML(getRunbookShortLabel(runbookId || '', runbook.title))}</span>
            </a>
          ` : ''}
        </header>
        <div class="overflow-x-auto">${content}</div>
      </div>
    `;
  }

  return `
    <section class="overflow-hidden ${CARD} shadow-sm" data-dashboard-table="${escapeAttribute(table.id)}">
      <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">${escapeHTML(tableLabel)}</h2>
          <p class="mt-1 text-xs text-gray-500">Showing top ${escapeHTML(String(table.rows.length))} of ${escapeHTML(String(table.total))}</p>
        </div>
        ${runbook?.href ? `
          <a
            href="${escapeAttribute(runbook.href)}"
            class="${BTN_SECONDARY}"
            data-dashboard-table-runbook="${escapeAttribute(table.id)}"
            title="${escapeAttribute(runbook.description || getRunbookLabel(runbookId || '', runbook.title))}"
          >
            ${getRunbookIcon(runbookId || '')}
            <span>${escapeHTML(getRunbookShortLabel(runbookId || '', runbook.title))}</span>
          </a>
        ` : ''}
      </header>
      <div class="overflow-x-auto">${content}</div>
    </section>
  `;
}

function renderTabbedTables(
  tables: Record<string, TranslationDashboardTable>,
  runbooks: TranslationDashboardRunbook[],
  activeTab: string
): string {
  const tableIds = Object.keys(tables);
  if (tableIds.length === 0) {
    return '';
  }

  // Single table - render without tabs
  if (tableIds.length === 1) {
    return `<section class="space-y-4">${renderTable(tables[tableIds[0]], runbooks)}</section>`;
  }

  const tabButtons = tableIds
    .map((id) => {
      const tabConfig = TABLE_TAB_CONFIG[id] || { label: getTableLabel(id, id), shortLabel: getTableLabel(id, id), icon: '' };
      const isActive = id === activeTab;
      const activeClasses = isActive
        ? 'text-blue-600 border-blue-600'
        : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300';

      return `
        <button type="button"
                class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${activeClasses}"
                data-table-tab="${escapeAttribute(id)}"
                role="tab"
                aria-selected="${isActive}"
                aria-controls="table-panel-${escapeAttribute(id)}">
          ${tabConfig.icon}
          <span>${escapeHTML(tabConfig.shortLabel)}</span>
          <span class="sr-only">${escapeHTML(tabConfig.label)}</span>
          <span class="ml-1 px-2 py-0.5 text-xs rounded-full ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}">
            ${tables[id]?.total || 0}
          </span>
        </button>
      `;
    })
    .join('');

  const panels = tableIds
    .map((id) => {
      const isActive = id === activeTab;
      return `
        <div id="table-panel-${escapeAttribute(id)}"
             role="tabpanel"
             ${isActive ? '' : 'hidden'}
             data-table-panel="${escapeAttribute(id)}">
          ${renderTable(tables[id], runbooks, { embedded: true })}
        </div>
      `;
    })
    .join('');

  return `
    <section class="${CARD} shadow-sm overflow-hidden" data-dashboard-tables="true">
      <nav class="flex border-b border-gray-200 bg-gray-50 px-4" role="tablist" aria-label="Data tables">
        ${tabButtons}
      </nav>
      <div class="p-0">
        ${panels}
      </div>
    </section>
  `;
}

function renderRunbooks(runbooks: TranslationDashboardRunbook[]): string {
  if (runbooks.length === 0) {
    return '';
  }
  return `
    <section class="${CARD} p-4 shadow-sm" data-dashboard-runbooks="true">
      <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">Runbooks</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        ${runbooks.map((runbook) => `
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 class="text-sm font-semibold text-gray-900">${runbook.href ? `<a class="hover:underline" href="${escapeAttribute(runbook.href)}">${escapeHTML(runbook.title)}</a>` : escapeHTML(runbook.title)}</h3>
            <p class="mt-2 text-sm leading-6 text-gray-600">${escapeHTML(runbook.description)}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function alertStateSeverity(state: DashboardAlertState): string {
  switch (state) {
    case 'critical':
      return 'error';
    case 'warning':
      return 'warning';
    case 'degraded':
      return 'neutral';
    default:
      return 'success';
  }
}

function alertToneClass(state: DashboardAlertState): string {
  return getStatusColorClass(alertStateSeverity(state));
}

function alertToneContainerClass(state: DashboardAlertState): string {
  return `border ${getStatusColorClass(alertStateSeverity(state))}`;
}

function renderCollapsibleMeta(payload: TranslationDashboardResponse, expanded: boolean): string {
  const scopeParts = Object.entries(payload.meta.scope)
    .filter(([, value]) => value)
    .filter(([key]) => key !== 'actor_id')
    .map(([key, value]) => ({ key: formatMetricLabel(key), value: String(value) }));

  const refreshDisplay = formatRefreshInterval(payload.meta.refreshIntervalMs);
  const latencyDisplay = formatLatencyTarget(payload.meta.latencyTargetMs);
  const channel = payload.meta.channel || 'default';
  const chevronRotation = expanded ? 'rotate-180' : '';

  return `
    <section class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden" data-dashboard-meta="true">
      <button type="button"
              class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset transition-colors"
              data-meta-toggle="true"
              aria-expanded="${expanded}">
        <div class="flex items-center gap-2">
          <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span class="text-sm font-medium text-gray-700">Technical Details</span>
        </div>
        <svg class="h-4 w-4 text-gray-400 transition-transform ${chevronRotation}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      <div class="${expanded ? '' : 'hidden'}" data-meta-content="true">
        <dl class="border-t border-gray-200 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <div>
            <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Channel</dt>
            <dd class="mt-1 text-sm font-medium text-gray-900">${escapeHTML(channel)}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Refresh</dt>
            <dd class="mt-1 text-sm font-medium text-gray-900">${escapeHTML(refreshDisplay)}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Latency</dt>
            <dd class="mt-1 text-sm font-medium text-gray-900">${escapeHTML(latencyDisplay)}</dd>
          </div>
          ${scopeParts.map(({ key, value }) => `
            <div>
              <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">${escapeHTML(key)}</dt>
              <dd class="mt-1 text-xs font-medium text-gray-900 font-mono">${escapeHTML(value)}</dd>
            </div>
          `).join('')}
        </dl>
      </div>
    </section>
  `;
}

function renderToolbar(payload: TranslationDashboardResponse | null, refreshing = false, metaExpanded = false): string {
  const generatedAt = payload?.meta.generatedAt
    ? new Date(payload.meta.generatedAt).toLocaleString()
    : 'Unavailable';

  const scopeParts = payload ? Object.entries(payload.meta.scope)
    .filter(([, value]) => value)
    .filter(([key]) => key !== 'actor_id')
    .map(([key, value]) => ({ key: formatMetricLabel(key), value: String(value) })) : [];

  const refreshDisplay = payload ? formatRefreshInterval(payload.meta.refreshIntervalMs) : 'N/A';
  const latencyDisplay = payload ? formatLatencyTarget(payload.meta.latencyTargetMs) : 'N/A';
  const channel = payload?.meta.channel || 'default';
  const chevronRotation = metaExpanded ? 'rotate-180' : '';

  return `
    <section class="${CARD} shadow-sm overflow-hidden" data-dashboard-toolbar="true">
      <div class="px-5 py-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="${HEADER_PRETITLE}">Manager Monitoring</p>
            <h2 class="${HEADER_TITLE} text-xl mt-2">Queue health and publish blockers</h2>
            <p class="${HEADER_DESCRIPTION} mt-2">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-xs uppercase tracking-[0.18em] text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
              ${escapeHTML(refreshing ? 'Refreshing dashboard…' : `Last updated ${generatedAt}`)}
            </span>
            <button type="button" class="${BTN_PRIMARY}" data-dashboard-refresh-button="true" aria-label="Refresh translation dashboard" ${refreshing ? 'disabled' : ''}>
              ${escapeHTML(refreshing ? 'Refreshing…' : 'Refresh dashboard')}
            </button>
          </div>
        </div>
      </div>
      ${payload ? `
        <div class="border-t border-gray-100 bg-gray-50 px-5 py-2">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-white rounded border border-gray-200" title="Dashboard channel">
                <svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                </svg>
                <span>${escapeHTML(channel)}</span>
              </span>
              <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-white rounded border border-gray-200" title="Refresh interval: ${escapeHTML(refreshDisplay)}">
                <svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>${escapeHTML(refreshDisplay)}</span>
              </span>
              <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-white rounded border border-gray-200" title="Latency target: ${escapeHTML(latencyDisplay)}">
                <svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <span>${escapeHTML(latencyDisplay)}</span>
              </span>
            </div>
            <button type="button"
                    class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    data-meta-toggle="true"
                    aria-expanded="${metaExpanded}"
                    aria-label="Toggle technical details">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Details</span>
              <svg class="h-3 w-3 transition-transform ${chevronRotation}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
          <div class="${metaExpanded ? 'mt-3' : 'hidden'}" data-meta-content="true">
            <dl class="border-t border-gray-200 pt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <div>
                <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Channel</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${escapeHTML(channel)}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Refresh Interval</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${escapeHTML(refreshDisplay)}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Latency Target</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${escapeHTML(latencyDisplay)}</dd>
              </div>
              ${scopeParts.map(({ key, value }) => `
                <div>
                  <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">${escapeHTML(key)}</dt>
                  <dd class="mt-1 text-xs font-medium text-gray-900 font-mono">${escapeHTML(value)}</dd>
                </div>
              `).join('')}
            </dl>
          </div>
        </div>
      ` : ''}
    </section>
  `;
}

// Health indicator icons (Fix 6)
const HEALTH_ICONS: Record<DashboardAlertState, string> = {
  ok: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  warning: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
  critical: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  degraded: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
};

function renderHealthIndicator(payload: TranslationDashboardResponse): string {
  const alerts = payload.data.alerts;
  const isDegraded = payload.meta.degraded;

  // Determine overall health
  let healthState: DashboardAlertState = 'ok';
  let healthLabel = 'Healthy';
  let healthDescription = 'All systems operating normally';

  if (isDegraded) {
    healthState = 'degraded';
    healthLabel = 'Degraded';
    healthDescription = 'Some metrics may be incomplete';
  }

  // Check alerts for worse states
  const criticalCount = alerts.filter((a) => a.state === 'critical').length;
  const warningCount = alerts.filter((a) => a.state === 'warning').length;

  if (criticalCount > 0) {
    healthState = 'critical';
    healthLabel = 'Critical';
    healthDescription = `${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} require${criticalCount === 1 ? 's' : ''} attention`;
  } else if (warningCount > 0) {
    healthState = 'warning';
    healthLabel = 'Warning';
    healthDescription = `${warningCount} warning${warningCount > 1 ? 's' : ''} detected`;
  }

  return `
    <div class="flex items-center gap-3 px-4 py-2 rounded-lg ${alertToneContainerClass(healthState)}"
         role="status"
         aria-label="Dashboard health: ${escapeAttribute(healthLabel)}"
         data-dashboard-health="true">
      ${HEALTH_ICONS[healthState]}
      <div class="flex-1 min-w-0">
        <span class="text-sm font-semibold">${escapeHTML(healthLabel)}</span>
        <span class="ml-2 text-sm opacity-80">${escapeHTML(healthDescription)}</span>
      </div>
    </div>
  `;
}

function renderEmptyState(payload: TranslationDashboardResponse): string {
  const runbook = payload.data.runbooks[0];
  const action = runbook?.href
    ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${escapeAttribute(runbook.href)}">${escapeHTML(runbook.title || 'Open runbook')}</a>`
    : '';
  return renderPanelState({
    tag: 'section',
    containerClass: `${EMPTY_STATE} p-6 shadow-sm`,
    bodyClass: '',
    contentClass: '',
    title: 'No active pressure',
    titleClass: EMPTY_STATE_TITLE,
    heading: 'This scope is clear right now.',
    headingTag: 'h3',
    headingClass: 'mt-2 text-xl font-semibold text-gray-900',
    message: 'Managers can refresh the aggregate snapshot to confirm the latest state or jump into a runbook if activity is expected to resume.',
    messageClass: `${EMPTY_STATE_TEXT} mt-3 max-w-2xl leading-6`,
    actionsHtml: `
      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="${BTN_PRIMARY}" data-dashboard-refresh-button="true">Refresh dashboard</button>
        ${action}
      </div>
    `,
    attributes: {
      'data-dashboard-empty': 'true',
    },
    ariaLive: 'polite',
  });
}

function renderInlineError(error: unknown): string {
  const requestID = error instanceof TranslationDashboardRequestError ? error.requestId : undefined;
  const traceID = error instanceof TranslationDashboardRequestError ? error.traceId : undefined;
  const metadata = [requestID ? `Request ${requestID}` : '', traceID ? `Trace ${traceID}` : ''].filter(Boolean).join(' • ');
  return renderPanelState({
    tag: 'section',
    containerClass: `${ERROR_STATE} p-4`,
    bodyClass: '',
    contentClass: '',
    title: 'Latest refresh failed',
    titleClass: ERROR_STATE_TITLE,
    message: error instanceof Error ? error.message : 'Failed to load translation dashboard',
    messageClass: `${ERROR_STATE_TEXT} mt-2`,
    metadata,
    metadataClass: 'mt-2 text-xs uppercase tracking-[0.16em] text-rose-700',
    role: 'alert',
    attributes: {
      'data-dashboard-inline-error': 'true',
    },
  });
}

function renderError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Failed to load translation dashboard';
  const requestID = error instanceof TranslationDashboardRequestError ? error.requestId : undefined;
  const traceID = error instanceof TranslationDashboardRequestError ? error.traceId : undefined;
  const metadata = [requestID ? `Request ${requestID}` : '', traceID ? `Trace ${traceID}` : ''].filter(Boolean).join(' • ');
  return renderPanelState({
    tag: 'section',
    containerClass: `${ERROR_STATE} p-4`,
    bodyClass: '',
    contentClass: '',
    title: 'Translation dashboard unavailable',
    titleClass: ERROR_STATE_TITLE,
    heading: 'Managers can retry the aggregate request and return to queue-health monitoring once the endpoint recovers.',
    headingTag: 'p',
    headingClass: `${ERROR_STATE_TEXT} mt-2`,
    message,
    messageClass: `${ERROR_STATE_TEXT} mt-2`,
    metadata,
    metadataClass: 'mt-2 text-xs uppercase tracking-[0.16em] text-rose-700',
    actionsHtml: `<div class="mt-4"><button type="button" class="${BTN_DANGER}" data-dashboard-refresh-button="true">Retry dashboard</button></div>`,
    role: 'alert',
    attributes: {
      'data-dashboard-error': 'true',
    },
  });
}

function renderUnconfiguredState(): string {
  return renderPanelState({
    tag: 'section',
    containerClass: `${EMPTY_STATE} p-5`,
    bodyClass: '',
    contentClass: '',
    title: 'Dashboard contract route is not wired.',
    titleClass: EMPTY_STATE_TITLE,
    message: 'Set a dashboard aggregate endpoint before initializing the dashboard client.',
    messageClass: `${EMPTY_STATE_TEXT} mt-2`,
    attributes: {
      'data-dashboard-empty': 'true',
    },
  });
}

function renderLoadingState(): string {
  return renderPanelLoadingState({
    tag: 'section',
    text: 'Loading translation dashboard aggregates...',
    showSpinner: false,
    containerClass: `${LOADING_STATE} p-5`,
    attributes: {
      'data-dashboard-loading': 'true',
    },
    ariaLive: 'polite',
  });
}

export class TranslationDashboardPage extends StatefulController<TranslationDashboardScreenState> {
  private config: TranslationDashboardPageConfig;
  private client: TranslationDashboardClient;
  private refreshController: TranslationDashboardRefreshController | null = null;
  private container: HTMLElement | null = null;
  private payload: TranslationDashboardResponse | null = null;
  private refreshing = false;
  private lastError: unknown = null;

  // UI state for collapsible sections
  private metaExpanded = false;
  private alertsExpanded = false;
  private dismissedAlerts: Set<string> = new Set();
  private activeTableTab: 'top_overdue_assignments' | 'blocked_families' = 'top_overdue_assignments';

  constructor(config: TranslationDashboardPageConfig) {
    super('idle');
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
    const runbooks = payload.data.runbooks;
    const cards = payload.data.cards.map((card) => renderCard(card, runbooks)).join('');
    const empty = Object.values(payload.data.summary).every((value) => value === 0)
      && Object.values(payload.data.tables).every((table) => table.rows.length === 0);
    const degraded = payload.meta.degraded
      ? `
        <section class="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${escapeHTML(payload.meta.degradedReasons.map((item) => `${item.component}: ${item.message}`).join(' | ') || 'Retry the dashboard request to refresh family blocker data.')}</p>
        </section>
      `
      : '';
    const inlineError = this.lastError ? renderInlineError(this.lastError) : '';

    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${renderToolbar(payload, this.refreshing, this.metaExpanded)}
        ${inlineError}
        ${degraded}
        ${renderAlertSummaryBanner(payload.data.alerts, payload.data.cards, this.alertsExpanded, this.dismissedAlerts)}
        ${empty
          ? renderEmptyState(payload)
          : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${cards}</section>
            ${renderTabbedTables(payload.data.tables, runbooks, this.activeTableTab)}
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

    // Meta toggle (Fix 5)
    const metaToggle = this.container.querySelector<HTMLButtonElement>('[data-meta-toggle]');
    if (metaToggle) {
      metaToggle.addEventListener('click', () => {
        this.metaExpanded = !this.metaExpanded;
        this.render();
      });
    }

    // Alerts toggle (Fix 1)
    const alertsToggle = this.container.querySelector<HTMLButtonElement>('[data-alerts-toggle]');
    if (alertsToggle) {
      alertsToggle.addEventListener('click', () => {
        this.alertsExpanded = !this.alertsExpanded;
        this.render();
      });
    }

    // Alert dismiss buttons (Fix 1)
    this.container.querySelectorAll<HTMLButtonElement>('[data-dismiss-alert]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const alertCode = btn.dataset.dismissAlert;
        if (alertCode) {
          this.dismissedAlerts.add(alertCode);
          this.render();
        }
      });
    });

    // Table tab switching (Fix 2)
    this.container.querySelectorAll<HTMLButtonElement>('[data-table-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tableTab as typeof this.activeTableTab;
        if (tabId && tabId !== this.activeTableTab) {
          this.activeTableTab = tabId;
          this.render();
        }
      });
    });

    // UUID copy buttons (Fix 7)
    this.container.querySelectorAll<HTMLButtonElement>('[data-copy-uuid]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const uuid = btn.dataset.copyUuid;
        if (!uuid) return;
        try {
          await navigator.clipboard.writeText(uuid);
          const originalHTML = btn.innerHTML;
          btn.innerHTML = `
            <span class="text-green-600">Copied!</span>
            <svg class="h-3 w-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          `;
          setTimeout(() => {
            btn.innerHTML = originalHTML;
          }, 1500);
        } catch {
          console.warn('Failed to copy UUID');
        }
      });
    });
  }
}

export function initTranslationDashboardPage(root: HTMLElement, options: Partial<TranslationDashboardPageConfig> = {}): TranslationDashboardPage | null {
  if (!root) {
    return null;
  }
  if (root.dataset?.ssrEnhanced === 'true') {
    root.dataset.translationDashboardEnhanced = 'true';
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
