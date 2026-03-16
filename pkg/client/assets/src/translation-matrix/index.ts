import {
  normalizeTranslationActionState,
  type TranslationActionState,
} from '../translation-contracts/index.js';
import { escapeAttribute, escapeHTML } from '../shared/html.js';
import { readHTTPError } from '../shared/transport/http-client.js';
import { extractStructuredError } from '../toast/error-helpers.js';
import {
  BTN_PRIMARY,
  BTN_SECONDARY_SM,
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
  MATRIX_GRID_CONTAINER,
  MATRIX_TABLE,
  MATRIX_HEADER_ROW,
  MATRIX_STICKY_CELL,
  MATRIX_CORNER_CELL,
  MATRIX_CELL,
} from '../translation-shared/index.js';

export type TranslationMatrixCellState =
  | 'ready'
  | 'missing'
  | 'in_progress'
  | 'in_review'
  | 'fallback'
  | 'not_required';

export type TranslationMatrixBulkActionId = 'create_missing' | 'export_selected';
export type TranslationMatrixBulkResultStatus = 'created' | 'export_ready' | 'skipped' | 'failed';

export interface TranslationMatrixVariantSummary {
  id: string;
  locale: string;
  status: string;
  is_source: boolean;
  source_record_id: string;
}

export interface TranslationMatrixAssignmentSummary {
  id: string;
  status: string;
  assignee_id: string;
  reviewer_id: string;
  work_scope: string;
}

export interface TranslationMatrixCell {
  locale: string;
  state: TranslationMatrixCellState;
  required: boolean;
  not_required: boolean;
  fallback: boolean;
  blocker_codes: string[];
  variant: TranslationMatrixVariantSummary | null;
  assignment: TranslationMatrixAssignmentSummary | null;
  quick_actions: Record<string, TranslationMatrixQuickAction>;
}

export interface TranslationMatrixColumn {
  locale: string;
  label: string;
  required_by_count: number;
  source_count: number;
  source_locale: boolean;
  sticky: boolean;
}

export interface TranslationMatrixRow {
  family_id: string;
  content_type: string;
  source_locale: string;
  source_record_id: string;
  source_title: string;
  readiness_state: string;
  blocker_codes: string[];
  links: Record<string, TranslationMatrixLink>;
  cells: Record<string, TranslationMatrixCell>;
}

export interface TranslationMatrixQueryModel {
  id: string;
  description: string;
  scope_fields: string[];
  supported_filters: string[];
  stable_sort_keys: string[];
  default_page_size: number;
  max_page_size: number;
  default_locale_limit: number;
  max_locale_limit: number;
  viewport_target: {
    rows: number;
    locales: number;
  };
  index_hints: string[];
  ui_route: string;
  api_route: string;
  resolver_keys: string[];
}

export interface TranslationMatrixContracts {
  schema_version: number;
  cell_states: TranslationMatrixCellState[];
  latency_target_ms: number;
  query_model: TranslationMatrixQueryModel;
  bulk_actions: Record<string, {
    id: string;
    permission: string;
    endpoint_route: string;
    resolver_key: string;
    required_fields: string[];
    optional_fields: string[];
    result_statuses: string[];
    selection_required: boolean;
  }>;
}

export interface TranslationMatrixSelection {
  bulk_actions: Record<string, TranslationActionState>;
}

export interface TranslationMatrixResponse {
  data: {
    columns: TranslationMatrixColumn[];
    rows: TranslationMatrixRow[];
    selection: TranslationMatrixSelection;
  };
  meta: {
    environment: string;
    page: number;
    per_page: number;
    total: number;
    total_locales: number;
    locale_offset: number;
    locale_limit: number;
    has_more_locales: boolean;
    latency_target_ms: number;
    query_model: TranslationMatrixQueryModel;
    contracts: TranslationMatrixContracts | Record<string, unknown>;
    scope: Record<string, string>;
    locale_policy: TranslationMatrixLocalePolicyMetadata[];
    quick_action_targets: Record<string, TranslationMatrixQuickActionTarget>;
  };
}

export interface TranslationMatrixBulkActionResult {
  family_id: string;
  content_type: string;
  source_record_id: string;
  requested_locales: string[];
  status: TranslationMatrixBulkResultStatus;
  created: Record<string, unknown>[];
  skipped: Record<string, unknown>[];
  failures: Record<string, unknown>[];
  exportable_locales: string[];
  estimated_rows: number;
}

export interface TranslationMatrixBulkActionResponse {
  data: {
    action: TranslationMatrixBulkActionId;
    summary: Record<string, number>;
    results: TranslationMatrixBulkActionResult[];
    export_request?: Record<string, unknown>;
    preview_rows?: Record<string, unknown>[];
  };
  meta: {
    environment: string;
    contracts: TranslationMatrixContracts | Record<string, unknown>;
  };
}

export interface TranslationMatrixQuery {
  environment?: string;
  tenantId?: string;
  orgId?: string;
  familyId?: string;
  contentType?: string;
  readinessState?: string;
  blockerCode?: string;
  locales?: string[];
  page?: number;
  perPage?: number;
  localeOffset?: number;
  localeLimit?: number;
}

export interface TranslationMatrixSelectionState {
  family_ids: string[];
  locales: string[];
  bulk_actions: Record<string, TranslationActionState>;
}

export interface TranslationMatrixLocalePolicyMetadata {
  locale: string;
  label: string;
  sticky: boolean;
  source_locale: boolean;
  required_by_count: number;
  optional_family_count: number;
  not_required_family_ids: string[];
}

export interface TranslationMatrixLink {
  href: string;
  route: string;
  resolver_key: string;
  key: string;
  label: string;
  description: string;
  relation: string;
}

export interface TranslationMatrixQuickAction {
  enabled: boolean;
  label: string;
  description: string;
  href: string;
  endpoint: string;
  method: string;
  route: string;
  resolver_key: string;
  permission: string;
  reason: string;
  reason_code: string;
  payload: Record<string, unknown>;
}

export interface TranslationMatrixQuickActionTarget {
  endpoint: string;
  method: string;
  route: string;
  resolver_key: string;
  base_path: string;
  type: string;
}

export interface TranslationMatrixPageConfig {
  endpoint: string;
  fetch?: typeof fetch;
  title?: string;
  basePath?: string;
}

export type TranslationMatrixPageState = 'loading' | 'ready' | 'empty' | 'error';

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asBoolean(value: unknown): boolean {
  return value === true;
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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: string[] = [];
  for (const item of value) {
    const normalized = asString(item);
    if (normalized && !out.includes(normalized)) {
      out.push(normalized);
    }
  }
  return out;
}

function asObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => asRecord(item))
    .filter((item) => Object.keys(item).length > 0);
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function deriveBasePathFromEndpoint(endpoint: string): string {
  const candidate = asString(endpoint);
  if (!candidate) {
    return '';
  }
  const pathname = candidate.startsWith('http://') || candidate.startsWith('https://')
    ? new URL(candidate).pathname
    : candidate;
  return trimTrailingSlash(pathname.replace(/\/api(?:\/.*)?$/, ''));
}

function resolveMatrixBasePath(basePath: string, endpoint: string): string {
  const explicit = trimTrailingSlash(asString(basePath));
  if (explicit) {
    return explicit;
  }
  const derived = deriveBasePathFromEndpoint(endpoint);
  return derived || '/admin';
}

function normalizeTranslationMatrixLink(value: unknown): TranslationMatrixLink | null {
  const raw = asRecord(value);
  const href = asString(raw.href);
  const label = asString(raw.label);
  if (!href && !label) {
    return null;
  }
  return {
    href,
    route: asString(raw.route),
    resolver_key: asString(raw.resolver_key),
    key: asString(raw.key),
    label,
    description: asString(raw.description),
    relation: asString(raw.relation),
  };
}

function normalizeTranslationMatrixQuickAction(value: unknown): TranslationMatrixQuickAction {
  const raw = asRecord(value);
  return {
    enabled: asBoolean(raw.enabled),
    label: asString(raw.label),
    description: asString(raw.description),
    href: asString(raw.href),
    endpoint: asString(raw.endpoint),
    method: asString(raw.method).toUpperCase() || 'POST',
    route: asString(raw.route),
    resolver_key: asString(raw.resolver_key),
    permission: asString(raw.permission),
    reason: asString(raw.reason),
    reason_code: asString(raw.reason_code),
    payload: asRecord(raw.payload),
  };
}

function normalizeTranslationMatrixQuickActionMap(value: unknown): Record<string, TranslationMatrixQuickAction> {
  const actions: Record<string, TranslationMatrixQuickAction> = {};
  for (const [key, candidate] of Object.entries(asRecord(value))) {
    actions[key] = normalizeTranslationMatrixQuickAction(candidate);
  }
  return actions;
}

function normalizeTranslationMatrixQuickActionTarget(value: unknown): TranslationMatrixQuickActionTarget {
  const raw = asRecord(value);
  return {
    endpoint: asString(raw.endpoint),
    method: asString(raw.method).toUpperCase(),
    route: asString(raw.route),
    resolver_key: asString(raw.resolver_key),
    base_path: asString(raw.base_path),
    type: asString(raw.type),
  };
}

export function normalizeTranslationMatrixCellState(value: unknown): TranslationMatrixCellState {
  const normalized = asString(value).toLowerCase();
  switch (normalized) {
    case 'ready':
    case 'missing':
    case 'in_progress':
    case 'in_review':
    case 'fallback':
    case 'not_required':
      return normalized;
    default:
      return 'missing';
  }
}

export function normalizeTranslationMatrixColumn(value: unknown): TranslationMatrixColumn {
  const raw = asRecord(value);
  return {
    locale: asString(raw.locale),
    label: asString(raw.label) || asString(raw.locale).toUpperCase(),
    required_by_count: asNumber(raw.required_by_count),
    source_count: asNumber(raw.source_count),
    source_locale: asBoolean(raw.source_locale),
    sticky: asBoolean(raw.sticky),
  };
}

function normalizeTranslationMatrixVariantSummary(value: unknown): TranslationMatrixVariantSummary | null {
  const raw = asRecord(value);
  const id = asString(raw.id);
  const locale = asString(raw.locale);
  if (!id && !locale) {
    return null;
  }
  return {
    id,
    locale,
    status: asString(raw.status),
    is_source: asBoolean(raw.is_source),
    source_record_id: asString(raw.source_record_id),
  };
}

function normalizeTranslationMatrixAssignmentSummary(value: unknown): TranslationMatrixAssignmentSummary | null {
  const raw = asRecord(value);
  const id = asString(raw.id);
  if (!id) {
    return null;
  }
  return {
    id,
    status: asString(raw.status),
    assignee_id: asString(raw.assignee_id),
    reviewer_id: asString(raw.reviewer_id),
    work_scope: asString(raw.work_scope),
  };
}

export function normalizeTranslationMatrixCell(value: unknown): TranslationMatrixCell {
  const raw = asRecord(value);
  const state = normalizeTranslationMatrixCellState(raw.state);
  return {
    locale: asString(raw.locale),
    state,
    required: asBoolean(raw.required),
    not_required: asBoolean(raw.not_required) || state === 'not_required',
    fallback: asBoolean(raw.fallback) || state === 'fallback',
    blocker_codes: asStringArray(raw.blocker_codes),
    variant: normalizeTranslationMatrixVariantSummary(raw.variant),
    assignment: normalizeTranslationMatrixAssignmentSummary(raw.assignment),
    quick_actions: normalizeTranslationMatrixQuickActionMap(raw.quick_actions),
  };
}

export function normalizeTranslationMatrixRow(value: unknown): TranslationMatrixRow {
  const raw = asRecord(value);
  const cellsRaw = asRecord(raw.cells);
  const cells: Record<string, TranslationMatrixCell> = {};
  for (const [locale, cellValue] of Object.entries(cellsRaw)) {
    cells[locale] = normalizeTranslationMatrixCell({ locale, ...asRecord(cellValue) });
  }
  return {
    family_id: asString(raw.family_id),
    content_type: asString(raw.content_type),
    source_locale: asString(raw.source_locale),
    source_record_id: asString(raw.source_record_id),
    source_title: asString(raw.source_title),
    readiness_state: asString(raw.readiness_state),
    blocker_codes: asStringArray(raw.blocker_codes),
    links: Object.fromEntries(
      Object.entries(asRecord(raw.links))
        .map(([key, candidate]) => [key, normalizeTranslationMatrixLink(candidate)])
        .filter(([, candidate]) => candidate)
    ) as Record<string, TranslationMatrixLink>,
    cells,
  };
}

function normalizeTranslationMatrixQueryModel(value: unknown): TranslationMatrixQueryModel {
  const raw = asRecord(value);
  const viewportTarget = asRecord(raw.viewport_target);
  return {
    id: asString(raw.id),
    description: asString(raw.description),
    scope_fields: asStringArray(raw.scope_fields),
    supported_filters: asStringArray(raw.supported_filters),
    stable_sort_keys: asStringArray(raw.stable_sort_keys),
    default_page_size: asNumber(raw.default_page_size),
    max_page_size: asNumber(raw.max_page_size),
    default_locale_limit: asNumber(raw.default_locale_limit),
    max_locale_limit: asNumber(raw.max_locale_limit),
    viewport_target: {
      rows: asNumber(viewportTarget.rows),
      locales: asNumber(viewportTarget.locales),
    },
    index_hints: asStringArray(raw.index_hints),
    ui_route: asString(raw.ui_route),
    api_route: asString(raw.api_route),
    resolver_keys: asStringArray(raw.resolver_keys),
  };
}

function normalizeTranslationMatrixContracts(value: unknown): TranslationMatrixContracts | Record<string, unknown> {
  const raw = asRecord(value);
  if (Object.keys(raw).length === 0) {
    return {};
  }
  const bulkActionsRaw = asRecord(raw.bulk_actions);
  const bulkActions: TranslationMatrixContracts['bulk_actions'] = {};
  for (const [key, candidate] of Object.entries(bulkActionsRaw)) {
    const action = asRecord(candidate);
    bulkActions[key] = {
      id: asString(action.id) || key,
      permission: asString(action.permission),
      endpoint_route: asString(action.endpoint_route),
      resolver_key: asString(action.resolver_key),
      required_fields: asStringArray(action.required_fields),
      optional_fields: asStringArray(action.optional_fields),
      result_statuses: asStringArray(action.result_statuses),
      selection_required: asBoolean(action.selection_required),
    };
  }
  return {
    schema_version: asNumber(raw.schema_version),
    cell_states: asStringArray(raw.cell_states).map((state) => normalizeTranslationMatrixCellState(state)),
    latency_target_ms: asNumber(raw.latency_target_ms),
    query_model: normalizeTranslationMatrixQueryModel(raw.query_model),
    bulk_actions: bulkActions,
  };
}

function normalizeTranslationMatrixSelection(value: unknown): TranslationMatrixSelection {
  const raw = asRecord(value);
  const bulkActionsRaw = asRecord(raw.bulk_actions);
  const bulkActions: Record<string, TranslationActionState> = {};
  for (const [key, candidate] of Object.entries(bulkActionsRaw)) {
    const normalized = normalizeTranslationActionState(candidate);
    if (normalized) {
      bulkActions[key] = normalized;
    }
  }
  return { bulk_actions: bulkActions };
}

export function normalizeTranslationMatrixResponse(value: unknown): TranslationMatrixResponse {
  const raw = asRecord(value);
  const data = asRecord(raw.data);
  const meta = asRecord(raw.meta);
  const columns = asObjectArray(data.columns).map(normalizeTranslationMatrixColumn);
  const rows = asObjectArray(data.rows).map(normalizeTranslationMatrixRow);
  const quickActionTargets: Record<string, TranslationMatrixQuickActionTarget> = {};
  for (const [key, candidate] of Object.entries(asRecord(meta.quick_action_targets))) {
    quickActionTargets[key] = normalizeTranslationMatrixQuickActionTarget(candidate);
  }
  return {
    data: {
      columns,
      rows,
      selection: normalizeTranslationMatrixSelection(data.selection),
    },
    meta: {
      environment: asString(meta.environment),
      page: asNumber(meta.page, 1),
      per_page: asNumber(meta.per_page, 25),
      total: asNumber(meta.total),
      total_locales: asNumber(meta.total_locales),
      locale_offset: asNumber(meta.locale_offset),
      locale_limit: asNumber(meta.locale_limit),
      has_more_locales: asBoolean(meta.has_more_locales),
      latency_target_ms: asNumber(meta.latency_target_ms),
      query_model: normalizeTranslationMatrixQueryModel(meta.query_model),
      contracts: normalizeTranslationMatrixContracts(meta.contracts),
      scope: Object.fromEntries(
        Object.entries(asRecord(meta.scope)).map(([key, candidate]) => [key, asString(candidate)])
      ),
      locale_policy: asObjectArray(meta.locale_policy).map((candidate) => {
        const raw = asRecord(candidate);
        return {
          locale: asString(raw.locale),
          label: asString(raw.label),
          sticky: asBoolean(raw.sticky),
          source_locale: asBoolean(raw.source_locale),
          required_by_count: asNumber(raw.required_by_count),
          optional_family_count: asNumber(raw.optional_family_count),
          not_required_family_ids: asStringArray(raw.not_required_family_ids),
        };
      }),
      quick_action_targets: quickActionTargets,
    },
  };
}

function normalizeTranslationMatrixBulkResult(value: unknown): TranslationMatrixBulkActionResult {
  const raw = asRecord(value);
  const status = asString(raw.status) as TranslationMatrixBulkResultStatus;
  return {
    family_id: asString(raw.family_id),
    content_type: asString(raw.content_type),
    source_record_id: asString(raw.source_record_id),
    requested_locales: asStringArray(raw.requested_locales),
    status: status || 'failed',
    created: asObjectArray(raw.created),
    skipped: asObjectArray(raw.skipped),
    failures: asObjectArray(raw.failures),
    exportable_locales: asStringArray(raw.exportable_locales),
    estimated_rows: asNumber(raw.estimated_rows),
  };
}

export function normalizeTranslationMatrixBulkActionResponse(value: unknown): TranslationMatrixBulkActionResponse {
  const raw = asRecord(value);
  const data = asRecord(raw.data);
  const summaryRaw = asRecord(data.summary);
  const summary: Record<string, number> = {};
  for (const [key, candidate] of Object.entries(summaryRaw)) {
    summary[key] = asNumber(candidate);
  }
  const action = asString(data.action) as TranslationMatrixBulkActionId;
  return {
    data: {
      action: action || 'create_missing',
      summary,
      results: asObjectArray(data.results).map(normalizeTranslationMatrixBulkResult),
      export_request: Object.keys(asRecord(data.export_request)).length > 0 ? asRecord(data.export_request) : undefined,
      preview_rows: asObjectArray(data.preview_rows),
    },
    meta: {
      environment: asString(asRecord(raw.meta).environment),
      contracts: normalizeTranslationMatrixContracts(asRecord(raw.meta).contracts),
    },
  };
}

export function buildTranslationMatrixURL(endpoint: string, query: TranslationMatrixQuery = {}): string {
  const url = new URL(endpoint, 'http://localhost');
  if (query.environment) url.searchParams.set('environment', query.environment);
  if (query.tenantId) url.searchParams.set('tenant_id', query.tenantId);
  if (query.orgId) url.searchParams.set('org_id', query.orgId);
  if (query.familyId) url.searchParams.set('family_id', query.familyId);
  if (query.contentType) url.searchParams.set('content_type', query.contentType);
  if (query.readinessState) url.searchParams.set('readiness_state', query.readinessState);
  if (query.blockerCode) url.searchParams.set('blocker_code', query.blockerCode);
  if (query.locales && query.locales.length > 0) url.searchParams.set('locales', query.locales.join(','));
  if (typeof query.page === 'number') url.searchParams.set('page', String(query.page));
  if (typeof query.perPage === 'number') url.searchParams.set('per_page', String(query.perPage));
  if (typeof query.localeOffset === 'number') url.searchParams.set('locale_offset', String(query.localeOffset));
  if (typeof query.localeLimit === 'number') url.searchParams.set('locale_limit', String(query.localeLimit));
  return `${url.pathname}${url.search}`;
}

export function createTranslationMatrixSelectionState(
  seed: Partial<TranslationMatrixSelectionState> = {}
): TranslationMatrixSelectionState {
  const familyIds = asStringArray(seed.family_ids);
  const locales = asStringArray(seed.locales);
  const bulkActions: Record<string, TranslationActionState> = {};
  for (const [key, value] of Object.entries(asRecord(seed.bulk_actions))) {
    const normalized = normalizeTranslationActionState(value);
    if (normalized) {
      bulkActions[key] = normalized;
    }
  }
  return {
    family_ids: familyIds,
    locales,
    bulk_actions: bulkActions,
  };
}

export function toggleTranslationMatrixFamilySelection(
  state: TranslationMatrixSelectionState,
  familyId: string
): TranslationMatrixSelectionState {
  const normalized = asString(familyId);
  if (!normalized) {
    return createTranslationMatrixSelectionState(state);
  }
  const next = new Set(state.family_ids);
  if (next.has(normalized)) {
    next.delete(normalized);
  } else {
    next.add(normalized);
  }
  return {
    ...createTranslationMatrixSelectionState(state),
    family_ids: Array.from(next).sort(),
  };
}

export function setTranslationMatrixSelectedLocales(
  state: TranslationMatrixSelectionState,
  locales: string[]
): TranslationMatrixSelectionState {
  return {
    ...createTranslationMatrixSelectionState(state),
    locales: asStringArray(locales),
  };
}

export function buildTranslationMatrixBulkActionPayload(
  state: TranslationMatrixSelectionState,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    family_ids: [...state.family_ids],
    locales: [...state.locales],
    ...extra,
  };
}

export function isTranslationMatrixNotRequiredCell(cell: TranslationMatrixCell | null | undefined): boolean {
  return Boolean(cell && cell.state === 'not_required');
}

export function buildTranslationMatrixLocalePolicyMetadata(
  response: TranslationMatrixResponse
): TranslationMatrixLocalePolicyMetadata[] {
  if (response.meta.locale_policy.length > 0) {
    return response.meta.locale_policy;
  }
  return response.data.columns.map((column) => {
    const notRequiredFamilyIds: string[] = [];
    for (const row of response.data.rows) {
      if (isTranslationMatrixNotRequiredCell(row.cells[column.locale])) {
        notRequiredFamilyIds.push(row.family_id);
      }
    }
    return {
      locale: column.locale,
      label: column.label,
      sticky: column.sticky,
      source_locale: column.source_locale,
      required_by_count: column.required_by_count,
      optional_family_count: notRequiredFamilyIds.length,
      not_required_family_ids: notRequiredFamilyIds,
    };
  });
}

export class TranslationMatrixRequestError extends Error {
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
    this.name = 'TranslationMatrixRequestError';
    this.status = input.status;
    this.code = input.code ?? null;
    this.requestId = input.requestId;
    this.traceId = input.traceId;
    this.metadata = input.metadata ?? null;
  }
}

export interface TranslationMatrixClient {
  fetchMatrix(query?: TranslationMatrixQuery): Promise<TranslationMatrixResponse>;
  runBulkAction(
    target: TranslationMatrixQuickActionTarget | null | undefined,
    payload: Record<string, unknown>
  ): Promise<TranslationMatrixBulkActionResponse>;
}

function normalizeEndpoint(endpoint: string): string {
  return asString(endpoint);
}

function buildBulkActionTargetFromEndpoint(endpoint: string, action: TranslationMatrixBulkActionId): TranslationMatrixQuickActionTarget {
  const normalizedEndpoint = normalizeEndpoint(endpoint).replace(/\/$/, '');
  return {
    endpoint: `${normalizedEndpoint}/actions/${action === 'create_missing' ? 'create-missing' : 'export-selected'}`,
    method: 'POST',
    route: `translations.matrix.actions.${action}`,
    resolver_key: `admin.api.translations.matrix.actions.${action}`,
    base_path: '',
    type: '',
  };
}

export function createTranslationMatrixClient(options: TranslationMatrixPageConfig): TranslationMatrixClient {
  const endpoint = normalizeEndpoint(options.endpoint);
  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!fetchImpl) {
    throw new Error('Fetch is not available for the translation matrix client.');
  }
  return {
    async fetchMatrix(query: TranslationMatrixQuery = {}): Promise<TranslationMatrixResponse> {
      const target = buildTranslationMatrixURL(endpoint, query);
      const response = await fetchImpl(target, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        const structured = await extractStructuredError(response);
        throw new TranslationMatrixRequestError({
          message: structured.message || await readHTTPError(response, 'Failed to load translation matrix'),
          status: response.status,
          code: structured.textCode,
          requestId: response.headers.get('x-request-id') ?? undefined,
          traceId: response.headers.get('x-trace-id') ?? undefined,
          metadata: structured.metadata,
        });
      }
      return normalizeTranslationMatrixResponse(await response.json());
    },
    async runBulkAction(
      target: TranslationMatrixQuickActionTarget | null | undefined,
      payload: Record<string, unknown>
    ): Promise<TranslationMatrixBulkActionResponse> {
      const resolvedTarget = target ?? buildBulkActionTargetFromEndpoint(endpoint, 'create_missing');
      const actionEndpoint = asString(resolvedTarget.endpoint);
      if (!actionEndpoint) {
        throw new Error('Matrix bulk action endpoint is not configured.');
      }
      const response = await fetchImpl(actionEndpoint, {
        method: asString(resolvedTarget.method) || 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const structured = await extractStructuredError(response);
        throw new TranslationMatrixRequestError({
          message: structured.message || await readHTTPError(response, 'Matrix action failed'),
          status: response.status,
          code: structured.textCode,
          requestId: response.headers.get('x-request-id') ?? undefined,
          traceId: response.headers.get('x-trace-id') ?? undefined,
          metadata: structured.metadata,
        });
      }
      return normalizeTranslationMatrixBulkActionResponse(await response.json());
    },
  };
}

function formatLabel(value: string): string {
  return asString(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseLocaleInput(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry, index, list) => entry && list.indexOf(entry) === index);
}

function readQueryFromLocation(): TranslationMatrixQuery {
  if (!globalThis.location) {
    return {};
  }
  const params = new URLSearchParams(globalThis.location.search);
  const locales = parseLocaleInput(params.get('locales') ?? params.get('locale') ?? '');
  return {
    environment: asString(params.get('environment')),
    tenantId: asString(params.get('tenant_id')),
    orgId: asString(params.get('org_id')),
    contentType: asString(params.get('content_type')),
    readinessState: asString(params.get('readiness_state')),
    blockerCode: asString(params.get('blocker_code')),
    locales,
    page: params.get('page') ? asNumber(params.get('page')) : undefined,
    perPage: params.get('per_page') ? asNumber(params.get('per_page')) : undefined,
    localeLimit: params.get('locale_limit') ? asNumber(params.get('locale_limit')) : undefined,
    localeOffset: params.get('locale_offset') ? asNumber(params.get('locale_offset')) : undefined,
  };
}

function summarizeScope(query: TranslationMatrixQuery): string {
  const parts = [
    query.environment ? `Env ${query.environment}` : '',
    query.tenantId ? `Tenant ${query.tenantId}` : '',
    query.orgId ? `Org ${query.orgId}` : '',
  ].filter(Boolean);
  return parts.join(' • ');
}

function renderActionButton(
  action: TranslationMatrixQuickAction,
  attrs: Record<string, string>,
  fallbackLabel = 'Action'
): string {
  const label = action.label || fallbackLabel;
  const attrText = Object.entries(attrs)
    .map(([key, value]) => `${escapeAttribute(key)}="${escapeAttribute(value)}"`)
    .join(' ');
  const disabledReason = action.reason || 'Action unavailable';
  const tone = action.enabled
    ? 'border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-400 hover:bg-sky-100'
    : 'border-gray-200 bg-gray-100 text-gray-500';
  return `<button type="button" class="inline-flex min-h-[2.5rem] min-w-[6rem] items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${tone}" ${attrText} ${action.enabled ? '' : 'disabled'} title="${escapeAttribute(action.enabled ? action.description || label : disabledReason)}">${escapeHTML(label)}</button>`;
}

function renderMatrixCellSummary(cell: TranslationMatrixCell): string {
  const tone = {
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    missing: 'border-rose-200 bg-rose-50 text-rose-800',
    in_progress: 'border-amber-200 bg-amber-50 text-amber-800',
    in_review: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    fallback: 'border-orange-200 bg-orange-50 text-orange-800',
    not_required: 'border-gray-200 bg-gray-100 text-gray-600',
  }[cell.state];
  const detail = cell.assignment?.status || cell.variant?.status || formatLabel(cell.state);
  return `
    <div class="flex items-center justify-between gap-2">
      <span class="inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${escapeAttribute(tone)}">${escapeHTML(formatLabel(cell.state))}</span>
      <span class="truncate text-[11px] text-gray-500">${escapeHTML(formatLabel(detail))}</span>
    </div>
  `;
}

function preferredCellAction(cell: TranslationMatrixCell): TranslationMatrixQuickAction {
  return cell.quick_actions.open?.enabled
    ? cell.quick_actions.open
    : cell.quick_actions.create ?? cell.quick_actions.open ?? normalizeTranslationMatrixQuickAction({});
}

function renderMatrixGrid(payload: TranslationMatrixResponse, selection: TranslationMatrixSelectionState): string {
  const columns = payload.data.columns;
  const rows = payload.data.rows;
  return `
    <div class="${MATRIX_GRID_CONTAINER}" data-matrix-grid="true">
      <table class="${MATRIX_TABLE}">
        <thead class="${MATRIX_HEADER_ROW}">
          <tr>
            <th scope="col" class="${MATRIX_CORNER_CELL} border-b border-gray-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" data-matrix-toggle-all-families="true" ${selection.family_ids.length === rows.length && rows.length > 0 ? 'checked' : ''}>
                <span>Families</span>
              </label>
            </th>
            ${columns.map((column) => {
              const policy = payload.meta.locale_policy.find((entry) => entry.locale === column.locale);
              const selected = selection.locales.includes(column.locale);
              return `
                <th scope="col" class="border-b border-gray-200 bg-white px-3 py-3 text-left align-top">
                  <button type="button" data-matrix-locale-toggle="${escapeAttribute(column.locale)}" class="flex w-full flex-col rounded-xl border px-3 py-2 text-left transition ${selected ? 'border-sky-300 bg-sky-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}">
                    <span class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-700">${escapeHTML(column.label)}</span>
                    <span class="mt-1 text-[11px] text-gray-500">${escapeHTML(column.source_locale ? 'Source locale' : `${policy?.required_by_count ?? column.required_by_count} required families`)}</span>
                    <span class="mt-1 text-[11px] text-gray-400">${escapeHTML(policy && policy.optional_family_count > 0 ? `${policy.optional_family_count} optional` : 'Header action')}</span>
                  </button>
                </th>
              `;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, rowIndex) => `
            <tr data-matrix-row="${escapeAttribute(row.family_id)}">
              <th scope="row" class="${MATRIX_STICKY_CELL} border-b border-gray-200 px-4 py-4 text-left align-top">
                <div class="flex items-start gap-3">
                  <input type="checkbox" data-matrix-family-toggle="${escapeAttribute(row.family_id)}" ${selection.family_ids.includes(row.family_id) ? 'checked' : ''} class="mt-1">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <a class="text-sm font-semibold text-gray-900 hover:text-sky-700 hover:underline" href="${escapeAttribute(row.links.family?.href || '#')}">${escapeHTML(row.source_title || row.family_id)}</a>
                      <span class="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">${escapeHTML(row.content_type)}</span>
                    </div>
                    <p class="mt-1 text-xs text-gray-500">${escapeHTML(row.family_id)}</p>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs">
                      ${row.links.content_detail?.href ? `<a class="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 hover:border-gray-300 hover:text-gray-900" href="${escapeAttribute(row.links.content_detail.href)}">Source</a>` : ''}
                      ${row.links.content_edit?.href ? `<a class="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 hover:border-gray-300 hover:text-gray-900" href="${escapeAttribute(row.links.content_edit.href)}">Edit source</a>` : ''}
                    </div>
                  </div>
                </div>
              </th>
              ${columns.map((column, columnIndex) => {
                const cell = row.cells[column.locale];
                const action = preferredCellAction(cell);
                return `
                  <td class="${MATRIX_CELL}">
                    <div class="min-w-[10rem] rounded-xl border border-gray-200 bg-gray-50 p-3">
                      ${renderMatrixCellSummary(cell)}
                      <div class="mt-3">
                        ${renderActionButton(action, {
                          'data-matrix-cell-action': 'true',
                          'data-family-id': row.family_id,
                          'data-locale': column.locale,
                          'data-row-index': String(rowIndex),
                          'data-col-index': String(columnIndex),
                          'data-action-kind': action.enabled && action.href ? 'open' : 'create',
                        }, action.enabled && action.href ? 'Open' : 'Create')}
                      </div>
                      ${(action.reason && !action.enabled) ? `<p class="mt-2 text-[11px] leading-5 text-gray-400">${escapeHTML(action.reason)}</p>` : ''}
                    </div>
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderBulkToolbar(
  payload: TranslationMatrixResponse,
  selection: TranslationMatrixSelectionState,
  feedback: string,
  working = false
): string {
  const createState = selection.bulk_actions.create_missing ?? normalizeTranslationActionState(null);
  const exportState = selection.bulk_actions.export_selected ?? normalizeTranslationActionState(null);
  const noSelection = selection.family_ids.length === 0;
  const createDisabledReason = !createState?.enabled
    ? createState?.reason || 'Create missing is unavailable.'
    : noSelection
      ? 'Select at least one family row.'
      : '';
  const exportDisabledReason = !exportState?.enabled
    ? exportState?.reason || 'Export selected is unavailable.'
    : noSelection
      ? 'Select at least one family row.'
      : '';
  return `
    <section class="rounded-xl border border-gray-200 bg-gray-900 px-5 py-4 text-sm text-gray-100 shadow-sm" data-matrix-bulk-toolbar="true">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Bulk Actions</p>
          <p class="mt-2 text-sm text-gray-300">Selected families: <strong class="text-white">${escapeHTML(String(selection.family_ids.length))}</strong> · Selected locales: <strong class="text-white">${escapeHTML(selection.locales.length > 0 ? selection.locales.join(', ') : 'auto')}</strong></p>
          ${feedback ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-300" data-matrix-feedback="true">${escapeHTML(feedback)}</p>` : ''}
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" data-matrix-bulk-action="create_missing" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${(!createState?.enabled || noSelection || working) ? 'cursor-not-allowed bg-white/10 text-gray-400' : 'bg-sky-500 text-white hover:bg-sky-400'}" ${(!createState?.enabled || noSelection || working) ? 'disabled' : ''} title="${escapeAttribute(createDisabledReason || 'Create missing locale work')}">${escapeHTML(working ? 'Working…' : 'Create Missing')}</button>
          <button type="button" data-matrix-bulk-action="export_selected" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${(!exportState?.enabled || noSelection || working) ? 'cursor-not-allowed bg-white/10 text-gray-400' : 'bg-white text-gray-900 hover:bg-gray-100'}" ${(!exportState?.enabled || noSelection || working) ? 'disabled' : ''} title="${escapeAttribute(exportDisabledReason || 'Export selected locale work')}">${escapeHTML(working ? 'Working…' : 'Export Selected')}</button>
        </div>
      </div>
    </section>
  `;
}

function renderViewportControls(payload: TranslationMatrixResponse): string {
  const previousPageDisabled = payload.meta.page <= 1;
  const nextPageDisabled = payload.meta.page * payload.meta.per_page >= payload.meta.total;
  const previousLocaleDisabled = payload.meta.locale_offset <= 0;
  const nextLocaleDisabled = !payload.meta.has_more_locales;
  return `
    <section class="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm" data-matrix-viewport="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Viewport</p>
          <p class="mt-2 text-sm text-gray-600">Rows ${escapeHTML(String(payload.data.rows.length))} of ${escapeHTML(String(payload.meta.total))} · Locales ${escapeHTML(String(payload.meta.locale_offset + 1))}-${escapeHTML(String(Math.min(payload.meta.locale_offset + payload.meta.locale_limit, payload.meta.total_locales)))} of ${escapeHTML(String(payload.meta.total_locales))}</p>
        </div>
        <div class="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
          <button type="button" data-matrix-page="prev" class="${BTN_SECONDARY_SM}" ${previousPageDisabled ? 'disabled' : ''}>Prev families</button>
          <button type="button" data-matrix-page="next" class="${BTN_SECONDARY_SM}" ${nextPageDisabled ? 'disabled' : ''}>Next families</button>
          <button type="button" data-matrix-locales="prev" class="${BTN_SECONDARY_SM}" ${previousLocaleDisabled ? 'disabled' : ''}>Prev locales</button>
          <button type="button" data-matrix-locales="next" class="${BTN_SECONDARY_SM}" ${nextLocaleDisabled ? 'disabled' : ''}>Next locales</button>
        </div>
      </div>
    </section>
  `;
}

function renderFilters(query: TranslationMatrixQuery, busy = false): string {
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" data-matrix-filters="true">
      <form data-matrix-filter-form="true" class="grid gap-4 lg:grid-cols-5">
        <label class="text-sm text-gray-600">Content type
          <input name="content_type" value="${escapeAttribute(query.contentType || '')}" class="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" placeholder="pages, news">
        </label>
        <label class="text-sm text-gray-600">Readiness
          <select name="readiness_state" class="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900">
            <option value="">All</option>
            <option value="ready" ${query.readinessState === 'ready' ? 'selected' : ''}>Ready</option>
            <option value="blocked" ${query.readinessState === 'blocked' ? 'selected' : ''}>Blocked</option>
          </select>
        </label>
        <label class="text-sm text-gray-600">Blocker code
          <input name="blocker_code" value="${escapeAttribute(query.blockerCode || '')}" class="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" placeholder="missing_locale">
        </label>
        <label class="text-sm text-gray-600">Locales
          <input name="locales" value="${escapeAttribute((query.locales || []).join(', '))}" class="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" placeholder="fr, es">
        </label>
        <div class="flex items-end gap-3">
          <button type="submit" class="${BTN_PRIMARY} w-full" ${busy ? 'disabled' : ''}>${escapeHTML(busy ? 'Loading…' : 'Apply filters')}</button>
        </div>
      </form>
    </section>
  `;
}

function renderLoadingState(): string {
  return `<section class="${LOADING_STATE} p-8 shadow-sm" data-matrix-loading="true" role="status" aria-live="polite">Loading translation matrix…</section>`;
}

function renderEmptyState(): string {
  return `<section class="${EMPTY_STATE} p-8 shadow-sm" data-matrix-empty="true" role="status" aria-live="polite"><p class="${EMPTY_STATE_TITLE}">No rows</p><h2 class="mt-2 text-xl font-semibold text-gray-900">No families match this matrix scope.</h2><p class="${EMPTY_STATE_TEXT} mt-3 max-w-2xl leading-6">Adjust the filters, widen the locale window, or clear blocker constraints to inspect additional family coverage.</p></section>`;
}

function renderErrorState(error: unknown): string {
  const requestId = error instanceof TranslationMatrixRequestError ? error.requestId : '';
  const traceId = error instanceof TranslationMatrixRequestError ? error.traceId : '';
  return `
    <section class="${ERROR_STATE} p-6 shadow-sm" data-matrix-error="true" role="alert">
      <p class="${ERROR_STATE_TITLE}">Matrix unavailable</p>
      <h2 class="mt-2 text-xl font-semibold text-rose-900">The matrix payload could not be loaded.</h2>
      <p class="${ERROR_STATE_TEXT} mt-3 leading-6">${escapeHTML(error instanceof Error ? error.message : 'Failed to load the translation matrix')}</p>
      ${(requestId || traceId) ? `<p class="mt-3 text-xs uppercase tracking-[0.16em] text-rose-700">${escapeHTML([requestId ? `Request ${requestId}` : '', traceId ? `Trace ${traceId}` : ''].filter(Boolean).join(' • '))}</p>` : ''}
      <div class="mt-4">
        <button type="button" data-matrix-retry="true" class="${BTN_DANGER}">Retry matrix</button>
      </div>
    </section>
  `;
}

function renderMatrixPage(
  title: string,
  query: TranslationMatrixQuery,
  payload: TranslationMatrixResponse | null,
  state: TranslationMatrixPageState,
  selection: TranslationMatrixSelectionState,
  feedback: string,
  error: unknown,
  working = false,
  basePath = '/admin'
): string {
  const summary = summarizeScope(query);
  const body = payload == null
    ? (state === 'loading' ? renderLoadingState() : renderErrorState(error))
    : payload.data.rows.length === 0
      ? renderEmptyState()
      : `${renderBulkToolbar(payload, selection, feedback, working)}<div class="grid gap-5">${renderViewportControls(payload)}${renderMatrixGrid(payload, selection)}</div>`;
  return `
    <div class="grid gap-5" data-translation-matrix="true">
      <section class="rounded-xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-sky-50 px-6 py-6 shadow-sm" data-matrix-hero="true">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="${HEADER_PRETITLE}">Translation Coverage</p>
            <h1 class="${HEADER_TITLE} mt-2">${escapeHTML(title)}</h1>
            <p class="${HEADER_DESCRIPTION} mt-3 max-w-3xl leading-6">Dense family-by-locale coverage with sticky headers, row pagination, locale windows, and quick actions for missing or in-flight work.</p>
          </div>
          ${summary ? `<p class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">${escapeHTML(summary)}</p>` : ''}
        </div>
      </section>
      ${renderFilters(query, state === 'loading' || working)}
      ${body}
    </div>
  `;
}

export class TranslationMatrixPage {
  private config: TranslationMatrixPageConfig;
  private client: TranslationMatrixClient;
  private root: HTMLElement | null = null;
  private payload: TranslationMatrixResponse | null = null;
  private state: TranslationMatrixPageState = 'loading';
  private error: unknown = null;
  private query: TranslationMatrixQuery;
  private selection: TranslationMatrixSelectionState = createTranslationMatrixSelectionState();
  private feedback = '';
  private working = false;

  constructor(config: TranslationMatrixPageConfig) {
    const basePath = resolveMatrixBasePath(config.basePath || '', config.endpoint);
    this.config = {
      ...config,
      basePath,
      title: config.title || 'Translation Matrix',
    };
    this.client = createTranslationMatrixClient(this.config);
    this.query = readQueryFromLocation();
  }

  mount(root: HTMLElement): void {
    this.root = root;
    this.render();
    void this.load();
    root.addEventListener('click', this.handleClick);
    root.addEventListener('submit', this.handleSubmit);
    root.addEventListener('keydown', this.handleKeydown);
  }

  unmount(): void {
    if (!this.root) {
      return;
    }
    this.root.removeEventListener('click', this.handleClick);
    this.root.removeEventListener('submit', this.handleSubmit);
    this.root.removeEventListener('keydown', this.handleKeydown);
    this.root = null;
  }

  getState(): TranslationMatrixPageState {
    return this.state;
  }

  async refresh(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.state = 'loading';
    this.error = null;
    this.render();
    try {
      const payload = await this.client.fetchMatrix(this.query);
      this.payload = payload;
      this.selection = createTranslationMatrixSelectionState({
        family_ids: this.selection.family_ids.filter((id) => payload.data.rows.some((row) => row.family_id === id)),
        locales: this.selection.locales.filter((locale) => payload.data.columns.some((column) => column.locale === locale)),
        bulk_actions: payload.data.selection.bulk_actions,
      });
      this.state = payload.data.rows.length === 0 ? 'empty' : 'ready';
    } catch (error) {
      this.payload = null;
      this.state = 'error';
      this.error = error;
    }
    this.render();
  }

  private render(): void {
    if (!this.root) {
      return;
    }
    this.root.innerHTML = renderMatrixPage(
      this.config.title || 'Translation Matrix',
      this.query,
      this.payload,
      this.state,
      this.selection,
      this.feedback,
      this.error,
      this.working,
      this.config.basePath
    );
  }

  private updateQuery(next: Partial<TranslationMatrixQuery>): void {
    this.query = {
      ...this.query,
      ...next,
    };
  }

  private readonly handleSubmit = (event: Event): void => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.dataset.matrixFilterForm !== 'true') {
      return;
    }
    event.preventDefault();
    const data = new FormData(form);
    this.updateQuery({
      contentType: asString(data.get('content_type')),
      readinessState: asString(data.get('readiness_state')),
      blockerCode: asString(data.get('blocker_code')),
      locales: parseLocaleInput(asString(data.get('locales'))),
      page: 1,
      localeOffset: 0,
    });
    void this.load();
  };

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const retry = target.closest<HTMLElement>('[data-matrix-retry="true"]');
    if (retry) {
      void this.load();
      return;
    }
    const familyToggle = target.closest<HTMLInputElement>('[data-matrix-family-toggle]');
    if (familyToggle) {
      this.selection = toggleTranslationMatrixFamilySelection(this.selection, familyToggle.dataset.matrixFamilyToggle || '');
      this.render();
      return;
    }
    const toggleAll = target.closest<HTMLInputElement>('[data-matrix-toggle-all-families="true"]');
    if (toggleAll && this.payload) {
      this.selection = createTranslationMatrixSelectionState({
        family_ids: this.selection.family_ids.length === this.payload.data.rows.length
          ? []
          : this.payload.data.rows.map((row) => row.family_id),
        locales: this.selection.locales,
        bulk_actions: this.selection.bulk_actions,
      });
      this.render();
      return;
    }
    const localeToggle = target.closest<HTMLElement>('[data-matrix-locale-toggle]');
    if (localeToggle) {
      const locale = localeToggle.dataset.matrixLocaleToggle || '';
      const next = new Set(this.selection.locales);
      if (next.has(locale)) {
        next.delete(locale);
      } else {
        next.add(locale);
      }
      this.selection = setTranslationMatrixSelectedLocales(this.selection, Array.from(next));
      this.render();
      return;
    }
    const pageButton = target.closest<HTMLElement>('[data-matrix-page]');
    if (pageButton) {
      this.updateQuery({
        page: (this.query.page ?? this.payload?.meta.page ?? 1) + (pageButton.dataset.matrixPage === 'next' ? 1 : -1),
      });
      void this.load();
      return;
    }
    const localeButton = target.closest<HTMLElement>('[data-matrix-locales]');
    if (localeButton && this.payload) {
      const direction = localeButton.dataset.matrixLocales === 'next' ? 1 : -1;
      this.updateQuery({
        localeOffset: Math.max(0, (this.query.localeOffset ?? this.payload.meta.locale_offset ?? 0) + direction * (this.query.localeLimit ?? this.payload.meta.locale_limit ?? 0)),
      });
      void this.load();
      return;
    }
    const bulkButton = target.closest<HTMLElement>('[data-matrix-bulk-action]');
    if (bulkButton) {
      const action = bulkButton.dataset.matrixBulkAction as TranslationMatrixBulkActionId;
      void this.runBulkAction(action);
      return;
    }
    const cellActionButton = target.closest<HTMLElement>('[data-matrix-cell-action="true"]');
    if (cellActionButton) {
      const familyID = cellActionButton.dataset.familyId || '';
      const locale = cellActionButton.dataset.locale || '';
      void this.runCellAction(familyID, locale);
    }
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.dataset.matrixCellAction !== 'true') {
      return;
    }
    const rowIndex = asNumber(target.dataset.rowIndex, -1);
    const colIndex = asNumber(target.dataset.colIndex, -1);
    if (rowIndex < 0 || colIndex < 0 || !this.root) {
      return;
    }
    let nextRow = rowIndex;
    let nextCol = colIndex;
    switch (event.key) {
      case 'ArrowRight':
        nextCol += 1;
        break;
      case 'ArrowLeft':
        nextCol -= 1;
        break;
      case 'ArrowDown':
        nextRow += 1;
        break;
      case 'ArrowUp':
        nextRow -= 1;
        break;
      default:
        return;
    }
    const next = this.root.querySelector<HTMLElement>(`[data-matrix-cell-action="true"][data-row-index="${nextRow}"][data-col-index="${nextCol}"]`);
    if (next) {
      event.preventDefault();
      next.focus();
    }
  };

  private async runBulkAction(action: TranslationMatrixBulkActionId): Promise<void> {
    if (!this.payload) {
      return;
    }
    const targets = this.payload.meta.quick_action_targets;
    const fallbackTarget = buildBulkActionTargetFromEndpoint(this.config.endpoint, action);
    const target = targets[action] ?? fallbackTarget;
    this.working = true;
    this.feedback = '';
    this.render();
    try {
      const response = await this.client.runBulkAction(target, buildTranslationMatrixBulkActionPayload(this.selection, {
        environment: this.query.environment,
      }));
      const summary = response.data.summary[action === 'create_missing' ? 'created' : 'export_ready'] ?? 0;
      this.feedback = action === 'create_missing'
        ? `Created ${summary} locale variants from the current matrix selection.`
        : `Prepared ${summary} export groups from the current matrix selection.`;
      await this.load();
    } catch (error) {
      this.error = error;
      this.feedback = error instanceof Error ? error.message : 'Matrix action failed.';
      this.render();
    } finally {
      this.working = false;
      this.render();
    }
  }

  private async runCellAction(familyID: string, locale: string): Promise<void> {
    if (!this.payload) {
      return;
    }
    const row = this.payload.data.rows.find((candidate) => candidate.family_id === familyID);
    const cell = row?.cells[locale];
    const action = cell ? preferredCellAction(cell) : null;
    if (!action) {
      return;
    }
    if (action.enabled && action.href) {
      if (globalThis.location && typeof globalThis.location.assign === 'function') {
        globalThis.location.assign(action.href);
      }
      return;
    }
    if (!action.enabled || !action.endpoint) {
      this.feedback = action.reason || 'Matrix action unavailable.';
      this.render();
      return;
    }
    this.working = true;
    this.feedback = '';
    this.render();
    try {
      const target = normalizeTranslationMatrixQuickActionTarget({
        endpoint: action.endpoint,
        method: action.method,
        route: action.route,
        resolver_key: action.resolver_key,
      });
      const response = await this.client.runBulkAction(target, action.payload);
      const created = response.data.summary.created ?? 0;
      this.feedback = `Created ${created} locale variant${created === 1 ? '' : 's'} for ${locale.toUpperCase()}.`;
      await this.load();
    } catch (error) {
      this.feedback = error instanceof Error ? error.message : 'Matrix action failed.';
      this.render();
    } finally {
      this.working = false;
      this.render();
    }
  }
}

export function initTranslationMatrixPage(root: HTMLElement, options: Partial<TranslationMatrixPageConfig> = {}): TranslationMatrixPage | null {
  const endpoint = asString(options.endpoint) || asString(root.dataset.endpoint);
  if (!endpoint) {
    root.innerHTML = `<section class="${EMPTY_STATE} p-6" data-matrix-empty="true"><p class="${EMPTY_STATE_TITLE}">Configuration required</p><p class="${EMPTY_STATE_TEXT} mt-2">Configure a matrix endpoint before initializing the translation matrix page.</p></section>`;
    return null;
  }
  const page = new TranslationMatrixPage({
    endpoint,
    fetch: options.fetch,
    title: options.title || asString(root.dataset.title) || 'Translation Matrix',
    basePath: options.basePath || asString(root.dataset.basePath),
  });
  page.mount(root);
  return page;
}
