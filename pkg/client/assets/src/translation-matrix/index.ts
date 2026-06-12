import {
  normalizeTranslationActionState,
  type TranslationActionState,
} from '../translation-contracts/index.js';
import {
  asBoolean,
  asNumberish as asNumber,
  asRecord,
  asString,
  asUniqueStringArray as asStringArray,
} from '../shared/coercion.js';
import {
  deriveBasePathFromAPIEndpoint,
  trimTrailingSlash,
} from '../shared/path-normalization.js';
import {
  buildEndpointURL,
  getNumberSearchParam,
  getStringSearchParam,
  readLocationSearchParams,
  setJoinedSearchParam,
  setNumberSearchParam,
  setSearchParam,
} from '../shared/query-state/url-state.js';
import { StatefulController } from '../shared/stateful-controller.js';
import { escapeAttribute, escapeHTML } from '../shared/html.js';
import { getStatusLabel, renderStatusChip } from '../shared/status-vocabulary.js';
import { readHTTPError } from '../shared/transport/http-client.js';
import { renderPanelLoadingState, renderPanelState } from '../services/ui-states.js';
import { extractStructuredError } from '../toast/error-helpers.js';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
  BTN_DANGER,
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
    channel: string;
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
    channel: string;
    contracts: TranslationMatrixContracts | Record<string, unknown>;
  };
}

export interface TranslationMatrixQuery {
  channel?: string;
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

function asObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => asRecord(item))
    .filter((item) => Object.keys(item).length > 0);
}

function resolveMatrixBasePath(basePath: string, endpoint: string): string {
  const explicit = trimTrailingSlash(asString(basePath));
  if (explicit) {
    return explicit;
  }
  const derived = deriveBasePathFromAPIEndpoint(asString(endpoint));
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
      channel: asString(meta.channel),
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
      channel: asString(asRecord(raw.meta).channel),
      contracts: normalizeTranslationMatrixContracts(asRecord(raw.meta).contracts),
    },
  };
}

export function buildTranslationMatrixURL(endpoint: string, query: TranslationMatrixQuery = {}): string {
  const params = new URLSearchParams();
  setSearchParam(params, 'channel', query.channel);
  setSearchParam(params, 'tenant_id', query.tenantId);
  setSearchParam(params, 'org_id', query.orgId);
  setSearchParam(params, 'family_id', query.familyId);
  setSearchParam(params, 'content_type', query.contentType);
  setSearchParam(params, 'readiness_state', query.readinessState);
  setSearchParam(params, 'blocker_code', query.blockerCode);
  setJoinedSearchParam(params, 'locales', query.locales);
  setNumberSearchParam(params, 'page', query.page);
  setNumberSearchParam(params, 'per_page', query.perPage);
  setNumberSearchParam(params, 'locale_offset', query.localeOffset, { min: 0 });
  setNumberSearchParam(params, 'locale_limit', query.localeLimit, { min: 0 });
  return buildEndpointURL(endpoint, params);
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

function parseLocaleInput(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry, index, list) => entry && list.indexOf(entry) === index);
}

function readQueryFromLocation(): TranslationMatrixQuery {
  const params = readLocationSearchParams(globalThis.location);
  if (!params) {
    return {};
  }
  const locales = parseLocaleInput(getStringSearchParam(params, 'locales') ?? getStringSearchParam(params, 'locale') ?? '');
  return {
    channel: getStringSearchParam(params, 'channel') ?? '',
    tenantId: getStringSearchParam(params, 'tenant_id') ?? '',
    orgId: getStringSearchParam(params, 'org_id') ?? '',
    contentType: getStringSearchParam(params, 'content_type') ?? '',
    readinessState: getStringSearchParam(params, 'readiness_state') ?? '',
    blockerCode: getStringSearchParam(params, 'blocker_code') ?? '',
    locales,
    page: getNumberSearchParam(params, 'page'),
    perPage: getNumberSearchParam(params, 'per_page'),
    localeLimit: getNumberSearchParam(params, 'locale_limit'),
    localeOffset: getNumberSearchParam(params, 'locale_offset'),
  };
}

function summarizeScope(query: TranslationMatrixQuery): string {
  const parts = [
    query.channel ? `Channel ${query.channel}` : '',
    query.tenantId ? `Tenant ${query.tenantId}` : '',
    query.orgId ? `Org ${query.orgId}` : '',
  ].filter(Boolean);
  return parts.join(' • ');
}

/** Truncated identifier for display: first 8 + last 4 characters. */
function shortMatrixId(id: string): string {
  const trimmed = asString(id).trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }
  return `${trimmed.slice(0, 8)}…${trimmed.slice(-4)}`;
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
  return `<button type="button" class="btn btn-secondary btn-sm ${action.enabled ? '' : 'cursor-not-allowed opacity-50'}" ${attrText} ${action.enabled ? '' : 'disabled'} title="${escapeAttribute(action.enabled ? action.description || label : disabledReason)}">${escapeHTML(label)}</button>`;
}

function renderMatrixCellSummary(cell: TranslationMatrixCell): string {
  // Cell state renders as the shared registry-backed chip; the workflow status
  // appears as a second chip only when it adds information beyond the state.
  const workflowStatus = asString(cell.assignment?.status || cell.variant?.status).toLowerCase();
  const showWorkflow = Boolean(workflowStatus) && workflowStatus !== cell.state;
  return `
    <div class="flex flex-wrap items-center gap-1.5">
      ${renderStatusChip(cell.state)}
      ${showWorkflow ? renderStatusChip(workflowStatus, { showIcon: false }) : ''}
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
            <th scope="col" class="${MATRIX_CORNER_CELL} border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-500">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" data-matrix-toggle-all-families="true" ${selection.family_ids.length === rows.length && rows.length > 0 ? 'checked' : ''}>
                <span>Families</span>
              </label>
            </th>
            ${columns.map((column) => {
              const policy = payload.meta.locale_policy.find((entry) => entry.locale === column.locale);
              const selected = selection.locales.includes(column.locale);
              const optionalCount = policy?.optional_family_count ?? 0;
              return `
                <th scope="col" class="border-b border-gray-200 bg-white px-3 py-3 text-left align-top">
                  <button type="button" data-matrix-locale-toggle="${escapeAttribute(column.locale)}" class="flex w-full flex-col rounded-xl border px-3 py-2 text-left transition ${selected ? 'border-sky-300 bg-sky-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}">
                    <span class="text-sm font-semibold text-gray-900">${escapeHTML(column.label)}</span>
                    <span class="mt-1 text-[11px] text-gray-500">${escapeHTML(column.source_locale ? 'Source locale' : `${policy?.required_by_count ?? column.required_by_count} required families`)}</span>
                    ${optionalCount > 0 ? `<span class="mt-1 text-[11px] text-gray-400">${escapeHTML(`${optionalCount} optional`)}</span>` : ''}
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
                      <a class="text-sm font-semibold text-gray-900 hover:text-sky-700 hover:underline" href="${escapeAttribute(row.links.family?.href || '#')}">${escapeHTML(row.source_title || shortMatrixId(row.family_id))}</a>
                      <span class="status-chip status-chip--neutral">${escapeHTML(row.content_type)}</span>
                    </div>
                    <p class="mt-1 text-xs text-gray-500" title="${escapeAttribute(row.family_id)}">
                      <span>${escapeHTML(shortMatrixId(row.family_id))}</span>
                      <button type="button" class="ml-1 align-middle text-gray-400 transition-colors hover:text-gray-700" data-matrix-copy-id="${escapeAttribute(row.family_id)}" title="Copy family ID" aria-label="Copy family ID">
                        <i class="iconoir-copy" aria-hidden="true"></i>
                      </button>
                    </p>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs">
                      ${row.links.content_detail?.href ? `<a class="btn btn-secondary btn-sm" href="${escapeAttribute(row.links.content_detail.href)}">Source</a>` : ''}
                      ${row.links.content_edit?.href ? `<a class="btn btn-secondary btn-sm" href="${escapeAttribute(row.links.content_edit.href)}">Edit source</a>` : ''}
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
  const createDisabled = !createState?.enabled || noSelection || working;
  const exportDisabled = !exportState?.enabled || noSelection || working;
  return `
    <section class="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm shadow-sm" data-matrix-bulk-toolbar="true">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p class="text-sm font-semibold text-gray-900">Bulk actions</p>
          <p class="mt-1 text-sm text-gray-500">Selected families: <strong class="text-gray-900">${escapeHTML(String(selection.family_ids.length))}</strong> · Selected locales: <strong class="text-gray-900">${escapeHTML(selection.locales.length > 0 ? selection.locales.join(', ') : 'auto')}</strong></p>
          ${feedback ? `<p class="mt-2 text-xs font-medium text-emerald-700" data-matrix-feedback="true">${escapeHTML(feedback)}</p>` : ''}
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" data-matrix-bulk-action="create_missing" class="${BTN_PRIMARY} ${createDisabled ? 'cursor-not-allowed opacity-50' : ''}" ${createDisabled ? 'disabled' : ''} title="${escapeAttribute(createDisabledReason || 'Create missing locale work')}">${escapeHTML(working ? 'Working…' : 'Create missing')}</button>
          <button type="button" data-matrix-bulk-action="export_selected" class="${BTN_SECONDARY} ${exportDisabled ? 'cursor-not-allowed opacity-50' : ''}" ${exportDisabled ? 'disabled' : ''} title="${escapeAttribute(exportDisabledReason || 'Export selected locale work')}">${escapeHTML(working ? 'Working…' : 'Export selected')}</button>
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
          <p class="text-sm font-semibold text-gray-900">Viewport</p>
          <p class="mt-1 text-sm text-gray-600">Rows ${escapeHTML(String(payload.data.rows.length))} of ${escapeHTML(String(payload.meta.total))} · Locales ${escapeHTML(String(payload.meta.locale_offset + 1))}-${escapeHTML(String(Math.min(payload.meta.locale_offset + payload.meta.locale_limit, payload.meta.total_locales)))} of ${escapeHTML(String(payload.meta.total_locales))}</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" data-matrix-page="prev" class="${BTN_SECONDARY_SM}" ${previousPageDisabled ? 'disabled' : ''}>Prev families</button>
          <button type="button" data-matrix-page="next" class="${BTN_SECONDARY_SM}" ${nextPageDisabled ? 'disabled' : ''}>Next families</button>
          <button type="button" data-matrix-locales="prev" class="${BTN_SECONDARY_SM}" ${previousLocaleDisabled ? 'disabled' : ''}>Prev locales</button>
          <button type="button" data-matrix-locales="next" class="${BTN_SECONDARY_SM}" ${nextLocaleDisabled ? 'disabled' : ''}>Next locales</button>
        </div>
      </div>
    </section>
  `;
}

interface MatrixQuickFilterOption {
  value: string;
  label: string;
  tone: 'neutral' | 'success' | 'error';
}

const MATRIX_READINESS_FILTERS: MatrixQuickFilterOption[] = [
  { value: '', label: 'All', tone: 'neutral' },
  { value: 'ready', label: 'Ready', tone: 'success' },
  { value: 'blocked', label: 'Blocked', tone: 'error' },
];

/** Blocker codes the matrix API understands; labels come from the registry. */
const MATRIX_BLOCKER_CODES = [
  'missing_locale',
  'missing_field',
  'pending_review',
  'outdated_source',
  'qa_blocked',
];

// Mirrors the quick-filter classes from partials/quick-filters.html so the
// CSR matrix renders the same filter chips as the SSR Queue/Families pages.
function quickFilterClass(tone: MatrixQuickFilterOption['tone'], active: boolean): string {
  const base = 'quick-filter inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors';
  const palette: Record<MatrixQuickFilterOption['tone'], { active: string; idle: string }> = {
    neutral: { active: 'bg-gray-200 text-gray-900 ring-2 ring-gray-500 ring-offset-1', idle: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
    success: { active: 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500 ring-offset-1', idle: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
    error: { active: 'bg-rose-100 text-rose-800 ring-2 ring-rose-500 ring-offset-1', idle: 'bg-rose-50 text-rose-700 hover:bg-rose-100' },
  };
  return `${base} ${active ? palette[tone].active : palette[tone].idle}`;
}

function renderMatrixFilters(
  query: TranslationMatrixQuery,
  payload: TranslationMatrixResponse | null,
  busy = false
): string {
  const currentReadiness = asString(query.readinessState);
  const quickFilters = MATRIX_READINESS_FILTERS.map((option) => `
    <button type="button"
            class="${quickFilterClass(option.tone, currentReadiness === option.value)}"
            data-matrix-quick-filter="${escapeAttribute(option.value)}"
            ${currentReadiness === option.value ? 'aria-current="true"' : ''}
            ${busy ? 'disabled' : ''}>
      ${escapeHTML(option.label)}
    </button>
  `).join('');

  const blockerOptions = MATRIX_BLOCKER_CODES.map((code) => `
    <option value="${escapeAttribute(code)}" ${query.blockerCode === code ? 'selected' : ''}>${escapeHTML(getStatusLabel(code))}</option>
  `).join('');

  const localePolicies = payload ? buildTranslationMatrixLocalePolicyMetadata(payload) : [];
  const selectedLocales = query.locales || [];
  const knownLocales = new Set(localePolicies.map((policy) => policy.locale));
  const extraSelected = selectedLocales.filter((locale) => !knownLocales.has(locale));
  const localeChips = [
    ...localePolicies.map((policy) => ({ locale: policy.locale, label: policy.label || policy.locale.toUpperCase() })),
    ...extraSelected.map((locale) => ({ locale, label: locale.toUpperCase() })),
  ].map(({ locale, label }) => {
    const active = selectedLocales.includes(locale);
    return `
      <button type="button"
              class="${quickFilterClass('neutral', active)}"
              data-matrix-filter-locale="${escapeAttribute(locale)}"
              aria-pressed="${active ? 'true' : 'false'}"
              ${busy ? 'disabled' : ''}>
        ${escapeHTML(label)}
      </button>
    `;
  }).join('');

  const activeCount = [query.contentType, query.blockerCode].filter(Boolean).length + (selectedLocales.length > 0 ? 1 : 0);

  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" data-matrix-filters="true">
      <div class="quick-filters flex flex-wrap items-center gap-3" data-quick-filters>
        <span class="quick-filters__label text-xs font-semibold uppercase tracking-wide text-gray-500">Readiness</span>
        <div class="quick-filters__items inline-flex flex-wrap items-center gap-2" role="group" aria-label="Readiness filters">
          ${quickFilters}
        </div>
      </div>
      <details class="filter-panel mt-4 rounded-lg border border-gray-200 bg-gray-50" data-filter-panel ${activeCount > 0 ? 'open' : ''}>
        <summary class="filter-panel__trigger cursor-pointer select-none list-none px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100">
          <span class="inline-flex items-center gap-2">
            <i class="iconoir-filter text-gray-500" aria-hidden="true"></i>
            <span>Advanced Filters</span>
            ${activeCount > 0 ? `<span class="filter-panel__badge rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">${activeCount}</span>` : ''}
            <i class="iconoir-nav-arrow-down text-gray-400 transition-transform" aria-hidden="true"></i>
          </span>
        </summary>
        <form data-matrix-filter-form="true" class="filter-panel__form border-t border-gray-200 p-4">
          <div class="filter-panel__grid grid gap-3 md:grid-cols-3">
            <label class="filter-panel__field grid gap-1 text-sm">
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Content type</span>
              <input name="content_type" value="${escapeAttribute(query.contentType || '')}" class="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. pages" data-filter-field="content_type">
            </label>
            <label class="filter-panel__field grid gap-1 text-sm">
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Blocker</span>
              <select name="blocker_code" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" data-filter-field="blocker_code">
                <option value="">All</option>
                ${blockerOptions}
              </select>
            </label>
            <div class="filter-panel__actions flex items-end gap-2">
              <button type="submit" class="${BTN_PRIMARY} flex-1" ${busy ? 'disabled' : ''}>${escapeHTML(busy ? 'Loading…' : 'Apply')}</button>
            </div>
          </div>
          ${localeChips ? `
          <div class="mt-4">
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Locales</span>
            <div class="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Locale filters">
              ${localeChips}
            </div>
          </div>
          ` : ''}
        </form>
      </details>
    </section>
  `;
}

function renderLoadingState(): string {
  return renderPanelLoadingState({
    tag: 'section',
    text: 'Loading translation matrix…',
    showSpinner: false,
    containerClass: `${LOADING_STATE} p-8 shadow-sm`,
    attributes: {
      'data-matrix-loading': 'true',
    },
    ariaLive: 'polite',
  });
}

function renderEmptyState(): string {
  return renderPanelState({
    tag: 'section',
    containerClass: `${EMPTY_STATE} p-8 shadow-sm`,
    bodyClass: '',
    contentClass: '',
    title: 'No rows',
    titleClass: EMPTY_STATE_TITLE,
    heading: 'No families match this matrix scope.',
    headingTag: 'h2',
    headingClass: 'mt-2 text-xl font-semibold text-gray-900',
    message: 'Adjust the filters, widen the locale window, or clear blocker constraints to inspect additional family coverage.',
    messageClass: `${EMPTY_STATE_TEXT} mt-3 max-w-2xl leading-6`,
    attributes: {
      'data-matrix-empty': 'true',
    },
    ariaLive: 'polite',
  });
}

function renderErrorState(error: unknown): string {
  const requestId = error instanceof TranslationMatrixRequestError ? error.requestId : '';
  const traceId = error instanceof TranslationMatrixRequestError ? error.traceId : '';
  return renderPanelState({
    tag: 'section',
    containerClass: `${ERROR_STATE} p-6 shadow-sm`,
    bodyClass: '',
    contentClass: '',
    title: 'Matrix unavailable',
    titleClass: ERROR_STATE_TITLE,
    heading: 'The matrix payload could not be loaded.',
    headingTag: 'h2',
    headingClass: 'mt-2 text-xl font-semibold text-rose-900',
    message: error instanceof Error ? error.message : 'Failed to load the translation matrix',
    messageClass: `${ERROR_STATE_TEXT} mt-3 leading-6`,
    metadata: (requestId || traceId) ? [requestId ? `Request ${requestId}` : '', traceId ? `Trace ${traceId}` : ''].filter(Boolean).join(' • ') : '',
    metadataClass: 'mt-3 text-xs font-medium text-rose-700',
    actionsHtml: `<div class="mt-4"><button type="button" data-matrix-retry="true" class="${BTN_DANGER}">Retry matrix</button></div>`,
    role: 'alert',
    attributes: {
      'data-matrix-error': 'true',
    },
  });
}

function renderMatrixPage(
  query: TranslationMatrixQuery,
  payload: TranslationMatrixResponse | null,
  state: TranslationMatrixPageState,
  selection: TranslationMatrixSelectionState,
  feedback: string,
  error: unknown,
  working = false
): string {
  // The page header (title, breadcrumbs, description) is owned by the SSR
  // template (resources/translations/matrix.html); this module renders only
  // the working surface to avoid duplicated titles.
  const summary = summarizeScope(query);
  const body = payload == null
    ? (state === 'loading' ? renderLoadingState() : renderErrorState(error))
    : payload.data.rows.length === 0
      ? renderEmptyState()
      : `${renderBulkToolbar(payload, selection, feedback, working)}<div class="grid gap-5">${renderViewportControls(payload)}${renderMatrixGrid(payload, selection)}</div>`;
  return `
    <div class="grid gap-5" data-translation-matrix="true">
      ${summary ? `<p class="text-xs font-medium text-gray-500" data-matrix-scope="true">${escapeHTML(summary)}</p>` : ''}
      ${renderMatrixFilters(query, payload, state === 'loading' || working)}
      ${body}
    </div>
  `;
}

export class TranslationMatrixPage extends StatefulController<TranslationMatrixPageState> {
  private config: TranslationMatrixPageConfig;
  private client: TranslationMatrixClient;
  private root: HTMLElement | null = null;
  private payload: TranslationMatrixResponse | null = null;
  private error: unknown = null;
  private query: TranslationMatrixQuery;
  private selection: TranslationMatrixSelectionState = createTranslationMatrixSelectionState();
  private feedback = '';
  private working = false;
  private hasServerRenderedContent = false;

  constructor(config: TranslationMatrixPageConfig) {
    super('loading');
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
    this.hasServerRenderedContent = root.dataset.translationMatrixSsr === 'true' && root.innerHTML.trim().length > 0;
    if (!this.hasServerRenderedContent) {
      this.render();
    }
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
  async refresh(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    const previousPayload = this.payload;
    const preserveServerRenderedContent = this.hasServerRenderedContent && previousPayload == null;
    this.state = 'loading';
    this.error = null;
    if (!preserveServerRenderedContent) {
      this.render();
    }
    try {
      const payload = await this.client.fetchMatrix(this.query);
      this.payload = payload;
      this.hasServerRenderedContent = false;
      this.selection = createTranslationMatrixSelectionState({
        family_ids: this.selection.family_ids.filter((id) => payload.data.rows.some((row) => row.family_id === id)),
        locales: this.selection.locales.filter((locale) => payload.data.columns.some((column) => column.locale === locale)),
        bulk_actions: payload.data.selection.bulk_actions,
      });
      this.state = payload.data.rows.length === 0 ? 'empty' : 'ready';
    } catch (error) {
      this.error = error;
      if (previousPayload) {
        this.payload = previousPayload;
        this.state = previousPayload.data.rows.length === 0 ? 'empty' : 'ready';
        this.feedback = error instanceof Error ? error.message : 'Matrix refresh failed.';
        this.render();
        return;
      }
      this.payload = null;
      this.state = 'error';
      if (preserveServerRenderedContent) {
        this.renderServerRenderedError(error);
        return;
      }
    }
    this.render();
  }

  private renderServerRenderedError(error: unknown): void {
    if (!this.root) {
      return;
    }
    this.root.querySelector('[data-matrix-ssr-error-banner]')?.remove();
    const message = error instanceof Error ? error.message : 'Failed to load the translation matrix.';
    this.root.insertAdjacentHTML('afterbegin', `
      <section class="${ERROR_STATE} mb-4 p-4 shadow-sm" data-matrix-ssr-error-banner="true" role="alert">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="${ERROR_STATE_TITLE}">Matrix refresh failed</h2>
            <p class="${ERROR_STATE_TEXT} mt-1">${escapeHTML(message)}</p>
          </div>
          <button type="button" data-matrix-retry="true" class="${BTN_DANGER}">Retry</button>
        </div>
      </section>
    `);
  }

  private render(): void {
    if (!this.root) {
      return;
    }
    this.root.innerHTML = renderMatrixPage(
      this.query,
      this.payload,
      this.state,
      this.selection,
      this.feedback,
      this.error,
      this.working
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
    // Readiness and locales are chip toggles handled in handleClick; the form
    // applies the remaining text/select fields.
    this.updateQuery({
      contentType: asString(data.get('content_type')),
      blockerCode: asString(data.get('blocker_code')),
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
    const quickFilter = target.closest<HTMLElement>('[data-matrix-quick-filter]');
    if (quickFilter) {
      this.updateQuery({
        readinessState: quickFilter.dataset.matrixQuickFilter || '',
        page: 1,
        localeOffset: 0,
      });
      void this.load();
      return;
    }
    const localeFilter = target.closest<HTMLElement>('[data-matrix-filter-locale]');
    if (localeFilter) {
      const locale = localeFilter.dataset.matrixFilterLocale || '';
      const next = new Set(this.query.locales || []);
      if (next.has(locale)) {
        next.delete(locale);
      } else {
        next.add(locale);
      }
      this.updateQuery({
        locales: Array.from(next).sort(),
        page: 1,
        localeOffset: 0,
      });
      void this.load();
      return;
    }
    const copyId = target.closest<HTMLElement>('[data-matrix-copy-id]');
    if (copyId) {
      const value = copyId.dataset.matrixCopyId || '';
      if (value && globalThis.navigator?.clipboard?.writeText) {
        void globalThis.navigator.clipboard.writeText(value);
      }
      return;
    }
    const familyToggle = target.closest<HTMLInputElement>('[data-matrix-family-toggle]');
    if (familyToggle) {
      if (!this.payload && this.hasServerRenderedContent) {
        return;
      }
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
        channel: this.query.channel,
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
