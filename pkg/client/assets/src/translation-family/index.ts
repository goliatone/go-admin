import { escapeAttribute, escapeHTML } from '../shared/html.js';
import {
  asLooseBoolean as asBoolean,
  asNumberish as asNumber,
  asRecord,
  asString,
  asStringArray,
} from '../shared/coercion.js';
import { appendCSRFHeader, httpRequest, readHTTPJSON } from '../shared/transport/http-client.js';
import { normalizeStringRecord } from '../shared/record-normalization.js';
import { trimTrailingSlash } from '../shared/path-normalization.js';
import {
  buildURL,
  getNumberSearchParam,
  getStringSearchParam,
  readLocationSearchParams,
  setNumberSearchParam,
  setSearchParam,
} from '../shared/query-state/url-state.js';
import { parseJSONValue } from '../shared/json-parse.js';
import { extractStructuredError } from '../toast/error-helpers.js';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_GHOST,
  HEADER_PRETITLE,
  HEADER_TITLE,
  EMPTY_STATE,
  EMPTY_STATE_TITLE,
  EMPTY_STATE_TEXT,
  ERROR_STATE,
  ERROR_STATE_TITLE,
  ERROR_STATE_TEXT,
  LOADING_STATE,
  CARD,
  MODAL_OVERLAY,
  MODAL_CONTENT,
  formatTranslationTimestampUTC,
  sentenceCaseToken,
  trapFocus,
  getStatusColorClass,
} from '../translation-shared/index.js';

export type FamilyReadinessState = 'ready' | 'blocked';

export type FamilyBlockerCode =
  | 'missing_locale'
  | 'missing_field'
  | 'pending_review'
  | 'outdated_source'
  | 'policy_denied';

export interface TranslationFamilyListItem {
  familyId: string;
  tenantId: string;
  orgId: string;
  contentType: string;
  sourceLocale: string;
  sourceVariantId: string;
  sourceRecordId: string;
  sourceTitle: string;
  readinessState: FamilyReadinessState;
  missingRequiredLocaleCount: number;
  pendingReviewCount: number;
  outdatedLocaleCount: number;
  blockerCodes: FamilyBlockerCode[];
  blockerLabels: Record<string, string>;
  missingLocales: string[];
  availableLocales: string[];
}

export interface TranslationFamilyVariant {
  id: string;
  familyId: string;
  locale: string;
  status: string;
  isSource: boolean;
  sourceRecordId: string;
  sourceHashAtLastSync: string;
  fields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface TranslationFamilyBlocker {
  id: string;
  familyId: string;
  blockerCode: FamilyBlockerCode;
  locale: string;
  fieldPath: string;
  details: Record<string, unknown>;
}

export interface TranslationFamilyAssignment {
  id: string;
  familyId: string;
  variantId: string;
  targetRecordId: string;
  sourceLocale: string;
  targetLocale: string;
  workScope: string;
  assignmentType: string;
  status: string;
  assigneeId: string;
  assigneeLabel: string;
  reviewerId: string;
  reviewerLabel: string;
  priority: string;
  dueDate: string;
  dueState: string;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
  links: TranslationFamilyAssignmentLinks;
  actions: TranslationFamilyLocaleAssignmentActions;
}

export interface TranslationFamilyAssignmentLink {
  href: string;
  label: string;
  description: string;
  relation: string;
  entityType: string;
  entityId: string;
}

export interface TranslationFamilyAssignmentLinks {
  editor: TranslationFamilyAssignmentLink | null;
}

export interface TranslationFamilyAssignmentActionState {
  enabled: boolean;
  permission: string;
  endpoint: string;
  href: string;
  label: string;
  reason: string;
  reasonCode: string;
  requiredFields: string[];
  payload: Record<string, unknown>;
  assignmentId: string;
  expectedVersion: number;
}

export interface TranslationFamilyLocaleAssignmentActions {
  assignToMe: TranslationFamilyAssignmentActionState;
  assignToUser: TranslationFamilyAssignmentActionState;
  claim: TranslationFamilyAssignmentActionState;
  openEditor: TranslationFamilyAssignmentActionState;
}

export interface TranslationFamilyLocaleAssignment {
  locale: string;
  workScope: string;
  state: string;
  assignment: TranslationFamilyAssignment | null;
  actions: TranslationFamilyLocaleAssignmentActions;
}

export interface TranslationFamilyActivityPreviewItem {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  tone: 'neutral' | 'success' | 'warning';
}

export interface TranslationFamilyDetail {
  familyId: string;
  contentType: string;
  sourceLocale: string;
  readinessState: FamilyReadinessState;
  sourceVariant: TranslationFamilyVariant | null;
  localeVariants: TranslationFamilyVariant[];
  blockers: TranslationFamilyBlocker[];
  activeAssignments: TranslationFamilyAssignment[];
  localeAssignments: Record<string, TranslationFamilyLocaleAssignment>;
  publishGate: {
    allowed: boolean;
    overrideAllowed: boolean;
    blockedBy: string[];
    reviewRequired: boolean;
  };
  readinessSummary: {
    state: FamilyReadinessState;
    requiredLocales: string[];
    missingLocales: string[];
    availableLocales: string[];
    blockerCodes: string[];
    missingRequiredLocaleCount: number;
    pendingReviewCount: number;
    outdatedLocaleCount: number;
    publishReady: boolean;
  };
  quickCreate: TranslationFamilyQuickCreateHints;
}

export interface TranslationFamilyQuickCreateDefaultAssignment {
  autoCreateAssignment: boolean;
  workScope: string;
  priority: string;
  assigneeId: string;
  dueDate: string;
}

export interface TranslationFamilyQuickCreateHints {
  enabled: boolean;
  missingLocales: string[];
  recommendedLocale: string;
  requiredForPublish: string[];
  defaultAssignment: TranslationFamilyQuickCreateDefaultAssignment;
  disabledReasonCode: string;
  disabledReason: string;
}

export interface TranslationFamilyListResponse {
  items: TranslationFamilyListItem[];
  total: number;
  page: number;
  perPage: number;
  channel: string;
}

export interface TranslationFamilyFilters {
  contentType: string;
  readinessState: string;
  blockerCode: string;
  missingLocale: string;
  page: number;
  perPage: number;
  channel: string;
}

export interface ReadinessChip {
  state: FamilyReadinessState;
  label: string;
  tone: 'success' | 'warning';
}

export interface TranslationFamilyClient {
  list(filters?: Partial<TranslationFamilyFilters>): Promise<TranslationFamilyListResponse>;
  detail(familyId: string, channel?: string): Promise<TranslationFamilyDetail>;
  createLocale(familyId: string, input?: Partial<TranslationCreateLocaleRequest>): Promise<TranslationCreateLocaleResult>;
  createAssignment(familyId: string, input?: Partial<TranslationFamilyAssignmentRequest>): Promise<Record<string, unknown>>;
}

interface TranslationFamilyClientOptions {
  basePath?: string;
  fetch?: typeof fetch;
}

interface TranslationFamilyDetailFetchOptions {
  fetch?: typeof fetch;
}

export interface TranslationFamilyDetailLoadState {
  status: 'loading' | 'ready' | 'empty' | 'error' | 'conflict';
  detail?: TranslationFamilyDetail;
  message?: string;
  requestId?: string;
  traceId?: string;
  statusCode?: number;
  errorCode?: string | null;
  syncRecovery?: TranslationFamilySyncRecoveryCapability | null;
  syncStatus?: 'idle' | 'syncing' | 'completed' | 'failed';
  syncMessage?: string;
}

export interface TranslationFamilyDetailRenderOptions {
  basePath?: string;
  contentBasePath?: string;
}

export interface TranslationFamilySyncRecoveryCapability {
  canSync: boolean;
  permission: string;
  commandName: string;
  rpcInvokePath: string;
  environment: string;
  familyId: string;
}

export interface TranslationFamilySyncDispatchOptions {
  fetch?: typeof fetch;
  correlationId?: string;
}

export interface TranslationCreateLocaleError extends Error {
  statusCode?: number;
  textCode?: string | null;
  requestId?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

export function normalizeTranslationFamilySyncRecoveryCapability(
  input: unknown,
  fallback: Partial<TranslationFamilySyncRecoveryCapability> = {}
): TranslationFamilySyncRecoveryCapability | null {
  const raw = asRecord(input);
  const canSync = asBoolean(raw.can_sync ?? raw.canSync);
  const familyId = asString(raw.family_id ?? raw.familyId ?? fallback.familyId);
  const commandName = asString((raw.command_name ?? raw.commandName ?? fallback.commandName) || 'translation.families.sync');
  const rpcInvokePath = asString(raw.rpc_invoke_path ?? raw.rpcInvokePath ?? fallback.rpcInvokePath);
  const environment = asString((raw.environment ?? raw.channel ?? fallback.environment) || 'default');
  if (!canSync || !familyId || !commandName || !rpcInvokePath) {
    return null;
  }
  return {
    canSync,
    permission: asString((raw.permission ?? fallback.permission) || 'admin.translations.sync'),
    commandName,
    rpcInvokePath,
    environment,
    familyId,
  };
}

export function buildTranslationFamilySyncRPCRequest(
  recovery: TranslationFamilySyncRecoveryCapability,
  correlationId = ''
): Record<string, unknown> {
  const trimmedCorrelationId = asString(correlationId);
  const idempotencyKey = buildTranslationFamilySyncIdempotencyKey(recovery);
  return {
    method: 'admin.commands.dispatch',
    params: {
      data: {
        name: recovery.commandName,
        ids: recovery.familyId ? [recovery.familyId] : [],
        payload: {
          family_id: recovery.familyId,
          environment: recovery.environment,
          channel: recovery.environment,
        },
        options: {
          Mode: 'inline',
          IdempotencyKey: idempotencyKey,
          CorrelationID: trimmedCorrelationId,
          Metadata: {
            correlation_id: trimmedCorrelationId,
            idempotency_key: idempotencyKey,
          },
        },
      },
      meta: {
        correlationId: trimmedCorrelationId,
      },
    },
  };
}

function buildTranslationFamilySyncIdempotencyKey(recovery: TranslationFamilySyncRecoveryCapability): string {
  const segments = [
    recovery.commandName || 'translation.families.sync',
    recovery.environment || 'default',
    recovery.familyId || 'all',
  ].map((segment) => encodeURIComponent(asString(segment).trim() || 'default'));
  return segments.join(':');
}

function normalizeTranslationFamilySyncReceipt(input: unknown, commandName: string): Record<string, unknown> | null {
  const receipt = asRecord(input);
  if (Object.keys(receipt).length === 0) {
    return null;
  }
  const acceptedRaw = receipt.accepted ?? receipt.Accepted;
  if (!asBoolean(acceptedRaw)) {
    return null;
  }
  const receiptCommand = asString(
    receipt.command_id ??
    receipt.commandId ??
    receipt.CommandID ??
    receipt.command_name ??
    receipt.commandName
  );
  if (receiptCommand !== commandName) {
    return null;
  }
  return receipt;
}

export async function dispatchTranslationFamilySync(
  recovery: TranslationFamilySyncRecoveryCapability,
  options: TranslationFamilySyncDispatchOptions = {}
): Promise<Record<string, unknown>> {
  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!fetchImpl) {
    throw new Error('translation family sync requires fetch');
  }
  if (!recovery.canSync) {
    throw new Error('translation family sync is not available for this request');
  }
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
  const init: RequestInit = {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: JSON.stringify(buildTranslationFamilySyncRPCRequest(recovery, options.correlationId)),
  };
  appendCSRFHeader(recovery.rpcInvokePath, init, headers);
  const response = await fetchImpl(recovery.rpcInvokePath, init);
  if (!response.ok) {
    const structured = await extractStructuredError(response);
    throw new Error(structured.message || 'Failed to sync translation families.');
  }
  const payload = asRecord(await response.json().catch(() => ({})));
  const errorPayload = asRecord(payload.error);
  if (Object.keys(errorPayload).length > 0) {
    throw new Error(asString(errorPayload.message) || 'Failed to sync translation families.');
  }
  const data = asRecord(payload.data);
  const receipt = normalizeTranslationFamilySyncReceipt(data.receipt, recovery.commandName);
  if (!receipt) {
    throw new Error('Translation family sync did not return a valid dispatch receipt.');
  }
  return {
    ...data,
    receipt,
  };
}

export interface TranslationCreateLocaleRequest {
  locale: string;
  autoCreateAssignment: boolean;
  assigneeId: string;
  priority: string;
  dueDate: string;
  channel: string;
  idempotencyKey: string;
}

export interface TranslationFamilyAssignmentRequest {
  targetLocale: string;
  assigneeId: string;
  openPool: boolean;
  priority: string;
  dueDate: string;
  workScope: string;
  channel: string;
  idempotencyKey: string;
}

export interface TranslationCreateLocaleAssignment {
  assignmentId: string;
  status: string;
  targetLocale: string;
  workScope: string;
  assigneeId: string;
  priority: string;
  dueDate: string;
}

export interface TranslationCreateLocaleResult {
  variantId: string;
  familyId: string;
  locale: string;
  status: string;
  recordId: string;
  contentType: string;
  assignment: TranslationCreateLocaleAssignment | null;
  idempotencyHit: boolean;
  assignmentReused: boolean;
  family: {
    familyId: string;
    readinessState: FamilyReadinessState;
    missingRequiredLocaleCount: number;
    pendingReviewCount: number;
    outdatedLocaleCount: number;
    blockerCodes: string[];
    missingLocales: string[];
    availableLocales: string[];
    quickCreate: TranslationFamilyQuickCreateHints;
  };
  refresh: {
    familyDetail: boolean;
    familyList: boolean;
    contentSummary: boolean;
  };
  navigation: {
    contentDetailURL: string;
    contentEditURL: string;
  };
}

export interface TranslationCreateLocaleActionInput extends Partial<TranslationCreateLocaleRequest> {
  familyId: string;
  basePath?: string;
}

export interface TranslationCreateLocaleActionModel {
  familyId: string;
  endpoint: string;
  headers: Record<string, string>;
  request: TranslationCreateLocaleRequest;
}

function requestTraceID(headers: Headers): string {
  return asString(
    headers.get('x-trace-id') ||
      headers.get('x-correlation-id') ||
      headers.get('traceparent')
  );
}

function normalizeReadinessState(value: unknown): FamilyReadinessState {
  return asString(value) === 'ready' ? 'ready' : 'blocked';
}

function normalizeBlockerCode(value: unknown): FamilyBlockerCode {
  const normalized = asString(value) as FamilyBlockerCode;
  switch (normalized) {
    case 'missing_locale':
    case 'missing_field':
    case 'pending_review':
    case 'outdated_source':
    case 'policy_denied':
      return normalized;
    default:
      return 'policy_denied';
  }
}

export function createFamilyFilters(input: Partial<TranslationFamilyFilters> = {}): TranslationFamilyFilters {
  const channel = asString(input.channel);
  return {
    contentType: asString(input.contentType),
    readinessState: asString(input.readinessState),
    blockerCode: asString(input.blockerCode),
    missingLocale: asString(input.missingLocale),
    page: Math.max(1, asNumber(input.page, 1)),
    perPage: Math.max(1, asNumber(input.perPage, 50)),
    channel,
  };
}

export function buildFamilyListQuery(input: Partial<TranslationFamilyFilters> = {}): URLSearchParams {
  const filters = createFamilyFilters(input);
  const params = new URLSearchParams();
  setSearchParam(params, 'content_type', filters.contentType);
  setSearchParam(params, 'readiness_state', filters.readinessState);
  setSearchParam(params, 'blocker_code', filters.blockerCode);
  setSearchParam(params, 'missing_locale', filters.missingLocale);
  setSearchParam(params, 'channel', filters.channel);
  setNumberSearchParam(params, 'page', filters.page, { min: 1 });
  setNumberSearchParam(params, 'per_page', filters.perPage, { min: 1 });
  return params;
}

function buildFamilyPath(basePath: string, familyId = '', suffix = ''): string {
  const normalizedBasePath = trimTrailingSlash(basePath);
  if (!familyId) {
    return `${normalizedBasePath}/translations/families`;
  }
  const encodedID = encodeURIComponent(asString(familyId));
  return `${normalizedBasePath}/translations/families/${encodedID}${suffix}`;
}

export function buildFamilyListURL(basePath: string, filters: Partial<TranslationFamilyFilters> = {}): string {
  return buildURL(buildFamilyPath(basePath), buildFamilyListQuery(filters));
}

export function buildFamilyDetailURL(basePath: string, familyId: string, channel = ''): string {
  const query = new URLSearchParams();
  setSearchParam(query, 'channel', channel);
  return buildURL(buildFamilyPath(basePath, familyId), query);
}

export function createTranslationCreateLocaleRequest(
  input: Partial<TranslationCreateLocaleRequest> = {}
): TranslationCreateLocaleRequest {
  const channel = asString(input.channel);
  return {
    locale: asString(input.locale).toLowerCase(),
    autoCreateAssignment: asBoolean(input.autoCreateAssignment),
    assigneeId: asString(input.assigneeId),
    priority: asString(input.priority).toLowerCase(),
    dueDate: asString(input.dueDate),
    channel,
    idempotencyKey: asString(input.idempotencyKey),
  };
}

export function buildCreateLocaleURL(basePath: string, familyId: string, channel = ''): string {
  const query = new URLSearchParams();
  setSearchParam(query, 'channel', channel);
  return buildURL(buildFamilyPath(basePath, familyId, '/variants'), query);
}

export function serializeCreateLocaleRequest(
  input: Partial<TranslationCreateLocaleRequest> = {}
): Record<string, unknown> {
  const request = createTranslationCreateLocaleRequest(input);
  const payload: Record<string, unknown> = {
    locale: request.locale,
  };

  if (request.autoCreateAssignment) payload.auto_create_assignment = true;
  if (request.assigneeId) payload.assignee_id = request.assigneeId;
  if (request.priority) payload.priority = request.priority;
  if (request.dueDate) payload.due_date = request.dueDate;
  if (request.channel) payload.channel = request.channel;

  return payload;
}

export function createTranslationFamilyAssignmentRequest(
  input: Partial<TranslationFamilyAssignmentRequest> = {}
): TranslationFamilyAssignmentRequest {
  return {
    targetLocale: asString(input.targetLocale).toLowerCase(),
    assigneeId: asString(input.assigneeId),
    openPool: asBoolean(input.openPool),
    priority: asString(input.priority).toLowerCase(),
    dueDate: asString(input.dueDate),
    workScope: asString(input.workScope),
    channel: asString(input.channel),
    idempotencyKey: asString(input.idempotencyKey),
  };
}

export function buildFamilyAssignmentURL(basePath: string, familyId: string, channel = ''): string {
  const query = new URLSearchParams();
  setSearchParam(query, 'channel', channel);
  return buildURL(buildFamilyPath(basePath, familyId, '/assignments'), query);
}

export function serializeFamilyAssignmentRequest(
  input: Partial<TranslationFamilyAssignmentRequest> = {}
): Record<string, unknown> {
  const request = createTranslationFamilyAssignmentRequest(input);
  const payload: Record<string, unknown> = {
    target_locale: request.targetLocale,
  };

  if (request.assigneeId) payload.assignee_id = request.assigneeId;
  if (request.openPool) payload.open_pool = true;
  if (request.priority) payload.priority = request.priority;
  if (request.dueDate) payload.due_date = request.dueDate;
  if (request.workScope) payload.work_scope = request.workScope;
  if (request.channel) payload.channel = request.channel;

  return payload;
}

function normalizeCreateLocaleAssignment(input: Record<string, unknown>): TranslationCreateLocaleAssignment {
  return {
    assignmentId: asString(input.assignment_id),
    status: asString(input.status),
    targetLocale: asString(input.target_locale),
    workScope: asString(input.work_scope),
    assigneeId: asString(input.assignee_id),
    priority: asString(input.priority),
    dueDate: asString(input.due_date),
  };
}

function normalizeQuickCreateDefaultAssignment(
  input: Record<string, unknown>
): TranslationFamilyQuickCreateDefaultAssignment {
  return {
    autoCreateAssignment: asBoolean(input.auto_create_assignment),
    workScope: asString(input.work_scope),
    priority: asString(input.priority) || 'normal',
    assigneeId: asString(input.assignee_id),
    dueDate: asString(input.due_date),
  };
}

export function normalizeQuickCreateHints(
  input: Record<string, unknown>,
  fallback: Partial<TranslationFamilyQuickCreateHints> = {}
): TranslationFamilyQuickCreateHints {
  const defaultAssignment = asRecord(input.default_assignment);
  const missingLocales = asStringArray(input.missing_locales ?? fallback.missingLocales);
  const requiredForPublish = asStringArray(input.required_for_publish ?? fallback.requiredForPublish);
  const recommendedLocale = asString(input.recommended_locale || fallback.recommendedLocale);
  const enabled = typeof input.enabled === 'boolean'
    ? asBoolean(input.enabled)
    : missingLocales.length > 0;
  return {
    enabled,
    missingLocales,
    recommendedLocale,
    requiredForPublish,
    defaultAssignment: normalizeQuickCreateDefaultAssignment({
      auto_create_assignment: defaultAssignment.auto_create_assignment ?? fallback.defaultAssignment?.autoCreateAssignment,
      work_scope: defaultAssignment.work_scope ?? fallback.defaultAssignment?.workScope,
      priority: defaultAssignment.priority ?? fallback.defaultAssignment?.priority,
      assignee_id: defaultAssignment.assignee_id ?? fallback.defaultAssignment?.assigneeId,
      due_date: defaultAssignment.due_date ?? fallback.defaultAssignment?.dueDate,
    }),
    disabledReasonCode: asString(input.disabled_reason_code || fallback.disabledReasonCode),
    disabledReason: asString(input.disabled_reason || fallback.disabledReason),
  };
}

export function normalizeCreateLocaleResult(input: Record<string, unknown>): TranslationCreateLocaleResult {
  const data = asRecord(input.data);
  const meta = asRecord(input.meta);
  const family = asRecord(meta.family);
  const refresh = asRecord(meta.refresh);
  const navigation = asRecord(data.navigation);
  const familyQuickCreate = normalizeQuickCreateHints(asRecord(family.quick_create), {
    missingLocales: asStringArray(family.missing_locales),
  });

  return {
    variantId: asString(data.variant_id),
    familyId: asString(data.family_id) || asString(family.family_id),
    locale: asString(data.locale).toLowerCase(),
    status: asString(data.status),
    recordId: asString(data.record_id),
    contentType: asString(data.content_type),
    assignment: data.assignment ? normalizeCreateLocaleAssignment(asRecord(data.assignment)) : null,
    idempotencyHit: asBoolean(meta.idempotency_hit),
    assignmentReused: asBoolean(meta.assignment_reused),
    family: {
      familyId: asString(family.family_id),
      readinessState: normalizeReadinessState(family.readiness_state),
      missingRequiredLocaleCount: asNumber(family.missing_required_locale_count),
      pendingReviewCount: asNumber(family.pending_review_count),
      outdatedLocaleCount: asNumber(family.outdated_locale_count),
      blockerCodes: asStringArray(family.blocker_codes),
      missingLocales: asStringArray(family.missing_locales),
      availableLocales: asStringArray(family.available_locales),
      quickCreate: familyQuickCreate,
    },
    refresh: {
      familyDetail: asBoolean(refresh.family_detail),
      familyList: asBoolean(refresh.family_list),
      contentSummary: asBoolean(refresh.content_summary),
    },
    navigation: {
      contentDetailURL: asString(navigation.content_detail_url),
      contentEditURL: asString(navigation.content_edit_url),
    },
  };
}

export function createTranslationCreateLocaleActionModel(
  input: TranslationCreateLocaleActionInput
): TranslationCreateLocaleActionModel {
  const familyId = asString(input.familyId);
  const request = createTranslationCreateLocaleRequest(input);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (request.idempotencyKey) {
    headers['X-Idempotency-Key'] = request.idempotencyKey;
  }
  return {
    familyId,
    endpoint: buildCreateLocaleURL(asString(input.basePath) || '/admin/api', familyId, request.channel),
    headers,
    request,
  };
}

export function normalizeFamilyListRow(input: Record<string, unknown>): TranslationFamilyListItem {
  const blockerLabels: Record<string, string> = {};
  for (const [key, label] of Object.entries(asRecord(input.blocker_labels))) {
    const code = asString(key);
    const text = asString(label);
    if (code && text) {
      blockerLabels[code] = text;
    }
  }
  return {
    familyId: asString(input.family_id),
    tenantId: asString(input.tenant_id),
    orgId: asString(input.org_id),
    contentType: asString(input.content_type),
    sourceLocale: asString(input.source_locale),
    sourceVariantId: asString(input.source_variant_id),
    sourceRecordId: asString(input.source_record_id),
    sourceTitle: asString(input.source_title),
    readinessState: normalizeReadinessState(input.readiness_state),
    missingRequiredLocaleCount: asNumber(input.missing_required_locale_count),
    pendingReviewCount: asNumber(input.pending_review_count),
    outdatedLocaleCount: asNumber(input.outdated_locale_count),
    blockerCodes: asStringArray(input.blocker_codes).map(normalizeBlockerCode),
    blockerLabels,
    missingLocales: asStringArray(input.missing_locales),
    availableLocales: asStringArray(input.available_locales),
  };
}

export function normalizeFamilyListResponse(input: Record<string, unknown>): TranslationFamilyListResponse {
  const data = asRecord(input.data);
  const meta = asRecord(input.meta);
  const body = Object.keys(data).length ? data : input;
  const summary = Object.keys(meta).length ? meta : input;
  const rawRows = body.items ?? body.families;
  const rows: unknown[] = Array.isArray(rawRows) ? rawRows : [];
  return {
    items: rows.map((row) => normalizeFamilyListRow(asRecord(row))),
    total: asNumber(summary.total),
    page: asNumber(summary.page, 1),
    perPage: asNumber(summary.per_page, 50),
    channel: asString(summary.channel),
  };
}

function normalizeVariant(input: Record<string, unknown>): TranslationFamilyVariant {
  return {
    id: asString(input.id),
    familyId: asString(input.family_id),
    locale: asString(input.locale),
    status: asString(input.status),
    isSource: asBoolean(input.is_source),
    sourceRecordId: asString(input.source_record_id),
    sourceHashAtLastSync: asString(input.source_hash_at_last_sync),
    fields: normalizeStringRecord(input.fields, { omitBlankKeys: true, omitEmptyValues: true }),
    createdAt: asString(input.created_at),
    updatedAt: asString(input.updated_at),
    publishedAt: asString(input.published_at),
  };
}

function normalizeBlocker(input: Record<string, unknown>): TranslationFamilyBlocker {
  return {
    id: asString(input.id),
    familyId: asString(input.family_id),
    blockerCode: normalizeBlockerCode(input.blocker_code),
    locale: asString(input.locale),
    fieldPath: asString(input.field_path),
    details: asRecord(input.details),
  };
}

function normalizeAssignmentActionState(input: Record<string, unknown>): TranslationFamilyAssignmentActionState {
  const link = asRecord(input.link);
  return {
    enabled: asBoolean(input.enabled),
    permission: asString(input.permission),
    endpoint: asString(input.endpoint),
    href: asString(input.href || link.href),
    label: asString(input.label || link.label),
    reason: asString(input.reason),
    reasonCode: asString(input.reason_code ?? input.reasonCode),
    requiredFields: asStringArray(input.required_fields ?? input.requiredFields),
    payload: asRecord(input.payload),
    assignmentId: asString(input.assignment_id ?? input.assignmentId),
    expectedVersion: asNumber(input.expected_version ?? input.expectedVersion),
  };
}

function normalizeLocaleAssignmentActions(input: Record<string, unknown>): TranslationFamilyLocaleAssignmentActions {
  return {
    assignToMe: normalizeAssignmentActionState(asRecord(input.assign_to_me ?? input.assignToMe)),
    assignToUser: normalizeAssignmentActionState(asRecord(input.assign_to_user ?? input.assignToUser)),
    claim: normalizeAssignmentActionState(asRecord(input.claim)),
    openEditor: normalizeAssignmentActionState(asRecord(input.open_editor ?? input.openEditor)),
  };
}

function normalizeAssignment(input: Record<string, unknown>): TranslationFamilyAssignment {
  return {
    id: asString(input.id),
    familyId: asString(input.family_id),
    variantId: asString(input.variant_id),
    targetRecordId: asString(input.target_record_id),
    sourceLocale: asString(input.source_locale),
    targetLocale: asString(input.target_locale),
    workScope: asString(input.work_scope),
    assignmentType: asString(input.assignment_type),
    status: asString(input.status) || asString(input.queue_state),
    assigneeId: asString(input.assignee_id),
    assigneeLabel: asString(input.assignee_label),
    reviewerId: asString(input.reviewer_id),
    reviewerLabel: asString(input.reviewer_label),
    priority: asString(input.priority),
    dueDate: asString(input.due_date),
    dueState: asString(input.due_state),
    rowVersion: asNumber(input.row_version ?? input.version),
    createdAt: asString(input.created_at),
    updatedAt: asString(input.updated_at),
    links: normalizeAssignmentLinks(asRecord(input.links)),
    actions: normalizeLocaleAssignmentActions(asRecord(input.actions)),
  };
}

function normalizeAssignmentLink(input: Record<string, unknown>): TranslationFamilyAssignmentLink | null {
  const href = asString(input.href);
  if (!href) {
    return null;
  }
  return {
    href,
    label: asString(input.label) || 'Open editor',
    description: asString(input.description),
    relation: asString(input.relation),
    entityType: asString(input.entity_type),
    entityId: asString(input.entity_id),
  };
}

function normalizeAssignmentLinks(input: Record<string, unknown>): TranslationFamilyAssignmentLinks {
  return {
    editor: normalizeAssignmentLink(asRecord(input.editor)),
  };
}

function normalizeLocaleAssignment(input: Record<string, unknown>): TranslationFamilyLocaleAssignment {
  return {
    locale: asString(input.locale).toLowerCase(),
    workScope: asString(input.work_scope),
    state: asString(input.state),
    assignment: input.assignment ? normalizeAssignment(asRecord(input.assignment)) : null,
    actions: normalizeLocaleAssignmentActions(asRecord(input.actions)),
  };
}

function normalizeLocaleAssignments(input: Record<string, unknown>): Record<string, TranslationFamilyLocaleAssignment> {
  const out: Record<string, TranslationFamilyLocaleAssignment> = {};
  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = asString(key).toLowerCase();
    if (!normalizedKey) continue;
    out[normalizedKey] = normalizeLocaleAssignment(asRecord(value));
  }
  return out;
}

export function normalizeFamilyDetail(input: Record<string, unknown>): TranslationFamilyDetail {
  const data = asRecord(input.data);
  const body = Object.keys(data).length ? data : input;
  const sourceVariant = body.source_variant ? normalizeVariant(asRecord(body.source_variant)) : null;
  const blockers = Array.isArray(body.blockers) ? body.blockers.map((row) => normalizeBlocker(asRecord(row))) : [];
  const localeVariants = Array.isArray(body.locale_variants)
    ? body.locale_variants.map((row) => normalizeVariant(asRecord(row)))
    : [];
  const activeAssignments = Array.isArray(body.active_assignments)
    ? body.active_assignments.map((row) => normalizeAssignment(asRecord(row)))
    : [];
  const localeAssignments = normalizeLocaleAssignments(asRecord(body.locale_assignments ?? body.localeAssignments));
  const publishGate = asRecord(body.publish_gate);
  const readinessSummary = asRecord(body.readiness_summary);
  const quickCreate = normalizeQuickCreateHints(asRecord(body.quick_create), {
    missingLocales: asStringArray(readinessSummary.missing_locales),
    recommendedLocale: asString(readinessSummary.recommended_locale),
    requiredForPublish: asStringArray(readinessSummary.required_for_publish ?? readinessSummary.required_locales),
  });

  return {
    familyId: asString(body.family_id),
    contentType: asString(body.content_type),
    sourceLocale: asString(body.source_locale),
    readinessState: normalizeReadinessState(body.readiness_state),
    sourceVariant,
    localeVariants,
    blockers,
    activeAssignments,
    localeAssignments,
    publishGate: {
      allowed: asBoolean(publishGate.allowed),
      overrideAllowed: asBoolean(publishGate.override_allowed),
      blockedBy: asStringArray(publishGate.blocked_by),
      reviewRequired: asBoolean(publishGate.review_required),
    },
    readinessSummary: {
      state: normalizeReadinessState(readinessSummary.state),
      requiredLocales: asStringArray(readinessSummary.required_locales),
      missingLocales: asStringArray(readinessSummary.missing_locales),
      availableLocales: asStringArray(readinessSummary.available_locales),
      blockerCodes: asStringArray(readinessSummary.blocker_codes),
      missingRequiredLocaleCount: asNumber(readinessSummary.missing_required_locale_count),
      pendingReviewCount: asNumber(readinessSummary.pending_review_count),
      outdatedLocaleCount: asNumber(readinessSummary.outdated_locale_count),
      publishReady: asBoolean(readinessSummary.publish_ready),
    },
    quickCreate,
  };
}

function uniqueLocaleList(...parts: string[][]): string[] {
  const values = new Set<string>();
  for (const part of parts) {
    for (const entry of part) {
      const normalized = asString(entry).toLowerCase();
      if (normalized) values.add(normalized);
    }
  }
  return Array.from(values).sort();
}

function withoutLocale(values: string[], locale: string): string[] {
  const target = asString(locale).toLowerCase();
  return values
    .map((entry) => asString(entry).toLowerCase())
    .filter((entry) => entry && entry !== target);
}

function familyCreateLocaleCandidates(detail: TranslationFamilyDetail): string[] {
  return uniqueLocaleList(detail.quickCreate.missingLocales, detail.readinessSummary.missingLocales);
}

function familyCreateLocaleBlockedByPolicyUnavailable(detail: TranslationFamilyDetail): boolean {
  return detail.blockers.some(isPolicyUnavailableBlocker);
}

function canCreateFamilyLocale(detail: TranslationFamilyDetail, locale: string): boolean {
  const target = asString(locale).toLowerCase();
  if (!target) return false;
  if (familyCreateLocaleBlockedByPolicyUnavailable(detail)) return false;
  return familyCreateLocaleCandidates(detail).includes(target);
}

function quickCreateHintsForFamilyLocale(detail: TranslationFamilyDetail, locale: string): TranslationFamilyQuickCreateHints {
  const candidates = familyCreateLocaleCandidates(detail);
  const target = asString(locale).toLowerCase();
  const canCreate = canCreateFamilyLocale(detail, target);
  return {
    ...detail.quickCreate,
    enabled: canCreate,
    missingLocales: candidates,
    recommendedLocale: candidates.includes(target) ? target : detail.quickCreate.recommendedLocale,
    disabledReason: canCreate ? '' : detail.quickCreate.disabledReason,
    disabledReasonCode: canCreate ? '' : detail.quickCreate.disabledReasonCode,
  };
}

export function applyCreateLocaleToFamilyDetail(
  detail: TranslationFamilyDetail,
  result: TranslationCreateLocaleResult
): TranslationFamilyDetail {
  if (!detail || !result || !result.familyId || detail.familyId !== result.familyId) {
    return detail;
  }

  const locale = asString(result.locale).toLowerCase();
  const localeVariants = detail.localeVariants.some((variant) => variant.locale === locale)
    ? detail.localeVariants.map((variant) => (
      variant.locale === locale
        ? { ...variant, id: variant.id || result.variantId, status: result.status || variant.status }
        : { ...variant }
    ))
    : [
      ...detail.localeVariants.map((variant) => ({ ...variant })),
      {
        id: result.variantId,
        familyId: detail.familyId,
        locale,
        status: result.status,
        isSource: false,
        sourceRecordId: detail.sourceVariant?.sourceRecordId || '',
        sourceHashAtLastSync: '',
        fields: {},
        createdAt: '',
        updatedAt: '',
        publishedAt: '',
      },
    ].sort((left, right) => left.locale.localeCompare(right.locale));

  let activeAssignments = detail.activeAssignments.map((assignment) => ({ ...assignment }));
  if (result.assignment) {
    const nextAssignment: TranslationFamilyAssignment = {
      id: result.assignment.assignmentId,
      familyId: detail.familyId,
      variantId: result.variantId,
      targetRecordId: '',
      sourceLocale: detail.sourceLocale,
      targetLocale: result.assignment.targetLocale || locale,
      workScope: result.assignment.workScope || detail.quickCreate.defaultAssignment.workScope,
      assignmentType: '',
      status: result.assignment.status,
      assigneeId: result.assignment.assigneeId,
      assigneeLabel: result.assignment.assigneeId,
      reviewerId: '',
      reviewerLabel: '',
      priority: result.assignment.priority,
      dueDate: result.assignment.dueDate,
      dueState: '',
      rowVersion: 0,
      createdAt: '',
      updatedAt: '',
      links: { editor: null },
      actions: normalizeLocaleAssignmentActions({}),
    };
    const matchIndex = activeAssignments.findIndex((assignment) =>
      assignment.id === nextAssignment.id || assignment.targetLocale === nextAssignment.targetLocale
    );
    if (matchIndex >= 0) {
      activeAssignments[matchIndex] = nextAssignment;
    } else {
      activeAssignments = [...activeAssignments, nextAssignment].sort((left, right) =>
        left.targetLocale.localeCompare(right.targetLocale)
      );
    }
  }

  const blockers = detail.blockers
    .map((blocker) => ({ ...blocker }))
    .filter((blocker) => !(blocker.blockerCode === 'missing_locale' && blocker.locale === locale));

  const availableLocales = uniqueLocaleList(detail.readinessSummary.availableLocales, result.family.availableLocales, [locale]);
  const missingLocales = withoutLocale(
    uniqueLocaleList(detail.readinessSummary.missingLocales, result.family.missingLocales),
    locale
  );

  return {
    ...detail,
    readinessState: result.family.readinessState,
    localeVariants,
    blockers,
    activeAssignments,
    publishGate: {
      allowed: result.family.readinessState === 'ready',
      overrideAllowed: detail.publishGate.overrideAllowed,
      blockedBy: [...result.family.blockerCodes],
      reviewRequired: detail.publishGate.reviewRequired,
    },
    readinessSummary: {
      ...detail.readinessSummary,
      state: result.family.readinessState,
      availableLocales,
      missingLocales,
      blockerCodes: [...result.family.blockerCodes],
      missingRequiredLocaleCount: result.family.missingRequiredLocaleCount,
      pendingReviewCount: result.family.pendingReviewCount,
      outdatedLocaleCount: result.family.outdatedLocaleCount,
      publishReady: result.family.readinessState === 'ready',
    },
    quickCreate: { ...result.family.quickCreate },
  };
}

export function applyCreateLocaleToSummaryState(
  summary: Record<string, unknown>,
  result: TranslationCreateLocaleResult
): Record<string, unknown> {
  const next = { ...summary };
  const readiness = { ...asRecord(next.translation_readiness) };
  const locale = asString(result.locale).toLowerCase();
  const requestedLocale = asString(next.requested_locale).toLowerCase();

  const summaryFamilyID = asString(
    next.translation_family_id ||
    next.family_id ||
    readiness.family_id ||
    readiness.family_id
  );
  if (summaryFamilyID && summaryFamilyID !== result.familyId) {
    return next;
  }

  const availableLocales = uniqueLocaleList(
    asStringArray(next.available_locales),
    asStringArray(readiness.available_locales),
    result.family.availableLocales,
    [locale]
  );
  const missingLocales = withoutLocale(
    uniqueLocaleList(
      asStringArray(next.missing_required_locales),
      asStringArray(readiness.missing_required_locales),
      result.family.missingLocales
    ),
    locale
  );

  next.available_locales = availableLocales;
  next.missing_required_locales = missingLocales;
  next.translation_family_id = summaryFamilyID || result.familyId;

  readiness.family_id = summaryFamilyID || result.familyId;
  readiness.state = result.family.readinessState;
  readiness.available_locales = availableLocales;
  readiness.missing_required_locales = missingLocales;
  readiness.blocker_codes = [...result.family.blockerCodes];
  readiness.missing_required_locale_count = result.family.missingRequiredLocaleCount;
  readiness.pending_review_count = result.family.pendingReviewCount;
  readiness.outdated_locale_count = result.family.outdatedLocaleCount;
  readiness.missing_locales = [...result.family.quickCreate.missingLocales];
  readiness.recommended_locale = result.family.quickCreate.recommendedLocale;
  readiness.required_for_publish = [...result.family.quickCreate.requiredForPublish];
  readiness.default_assignment = {
    auto_create_assignment: result.family.quickCreate.defaultAssignment.autoCreateAssignment,
    work_scope: result.family.quickCreate.defaultAssignment.workScope,
    priority: result.family.quickCreate.defaultAssignment.priority,
    assignee_id: result.family.quickCreate.defaultAssignment.assigneeId,
    due_date: result.family.quickCreate.defaultAssignment.dueDate,
  };
  readiness.quick_create = {
    enabled: result.family.quickCreate.enabled,
    missing_locales: [...result.family.quickCreate.missingLocales],
    recommended_locale: result.family.quickCreate.recommendedLocale,
    required_for_publish: [...result.family.quickCreate.requiredForPublish],
    default_assignment: {
      auto_create_assignment: result.family.quickCreate.defaultAssignment.autoCreateAssignment,
      work_scope: result.family.quickCreate.defaultAssignment.workScope,
      priority: result.family.quickCreate.defaultAssignment.priority,
      assignee_id: result.family.quickCreate.defaultAssignment.assigneeId,
      due_date: result.family.quickCreate.defaultAssignment.dueDate,
    },
    disabled_reason_code: result.family.quickCreate.disabledReasonCode,
    disabled_reason: result.family.quickCreate.disabledReason,
  };
  next.translation_readiness = readiness;

  if (requestedLocale && requestedLocale === locale) {
    next.missing_requested_locale = false;
    next.fallback_used = false;
    next.resolved_locale = locale;
  }

  return next;
}

export function getReadinessChip(state: string): ReadinessChip {
  const normalized = normalizeReadinessState(state);
  if (normalized === 'ready') {
    return { state: normalized, label: 'Ready', tone: 'success' };
  }
  return { state: normalized, label: 'Blocked', tone: 'warning' };
}

export function renderReadinessChip(state: string): string {
  const chip = getReadinessChip(state);
  return `<span class="translation-family-chip translation-family-chip--${chip.tone}" data-readiness-state="${chip.state}">${chip.label}</span>`;
}

async function createLocaleErrorFromResponse(response: Response): Promise<TranslationCreateLocaleError> {
  const structured = await extractStructuredError(response);
  const error = new Error(structured.message || 'Failed to create locale.') as TranslationCreateLocaleError;
  error.statusCode = response.status;
  error.textCode = structured.textCode;
  error.requestId = asString(response.headers.get('x-request-id'));
  error.traceId = requestTraceID(response.headers);
  error.metadata = asRecord(structured.metadata);
  return error;
}

async function assignmentActionErrorFromResponse(response: Response): Promise<TranslationCreateLocaleError> {
  const structured = await extractStructuredError(response);
  const error = new Error(structured.message || 'Failed to update assignment.') as TranslationCreateLocaleError;
  error.statusCode = response.status;
  error.textCode = structured.textCode;
  error.requestId = asString(response.headers.get('x-request-id'));
  error.traceId = requestTraceID(response.headers);
  error.metadata = asRecord(structured.metadata);
  return error;
}

async function postTranslationFamilyAssignmentAction(
  action: TranslationFamilyAssignmentActionState,
  payload: Record<string, unknown> = {},
  options: TranslationFamilyDetailFetchOptions = {}
): Promise<Record<string, unknown>> {
  const endpoint = asString(action.endpoint);
  if (!endpoint) {
    throw new Error('Assignment action endpoint is unavailable.');
  }
  const body: Record<string, unknown> = {
    ...action.payload,
    ...payload,
  };
  if (action.expectedVersion > 0 && body.expected_version == null && body.expectedVersion == null) {
    body.expected_version = action.expectedVersion;
  }
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
  const init: RequestInit = {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: JSON.stringify(body),
  };
  appendCSRFHeader(endpoint, init, headers);
  const response = await (options.fetch ? options.fetch(endpoint, init) : httpRequest(endpoint, init));
  if (!response.ok) {
    throw await assignmentActionErrorFromResponse(response);
  }
  return readHTTPJSON<Record<string, unknown>>(response);
}

function variantStatusSeverity(status: string): string {
  switch (asString(status)) {
    case 'published':
    case 'approved':
      return 'success';
    case 'in_review':
      return 'warning';
    case 'in_progress':
      return 'info';
    default:
      return 'neutral';
  }
}

function variantTone(status: string): string {
  return getStatusColorClass(variantStatusSeverity(status));
}

function assignmentStatusSeverity(status: string): string {
  switch (asString(status)) {
    case 'in_review':
      return 'warning';
    case 'in_progress':
    case 'assigned':
      return 'info';
    case 'changes_requested':
      return 'error';
    default:
      return 'neutral';
  }
}

function assignmentTone(status: string): string {
  return getStatusColorClass(assignmentStatusSeverity(status));
}

function blockerCodeSeverity(code: string): string {
  switch (asString(code)) {
    case 'missing_locale':
      return 'error';
    case 'missing_field':
      return 'warning';
    case 'pending_review':
      return 'info';
    case 'outdated_source':
      return 'purple';
    default:
      return 'neutral';
  }
}

function blockerTone(code: string): string {
  return getStatusColorClass(blockerCodeSeverity(code));
}

function blockerDetailValue(details: Record<string, unknown>, key: string): string {
  return asString(details[key]);
}

function isPolicyUnavailableBlocker(blocker: TranslationFamilyBlocker): boolean {
  if (blocker.blockerCode !== 'policy_denied') {
    return false;
  }
  const reason = blockerDetailValue(blocker.details, 'reason').toLowerCase();
  const reasonCode = blockerDetailValue(blocker.details, 'reason_code').toLowerCase();
  if (reason === 'policy_unavailable' || reasonCode === 'policy_unavailable') {
    return true;
  }
  if (reason === 'host_policy' || reasonCode === 'host_policy') {
    return false;
  }
  const hasPolicyScope = Boolean(blockerDetailValue(blocker.details, 'content_type') || blockerDetailValue(blocker.details, 'environment'));
  const hasHostMessage = Boolean(blockerDetailValue(blocker.details, 'message') || blockerDetailValue(blocker.details, 'policy_reason'));
  return hasPolicyScope && !reason && !hasHostMessage;
}

function blockerDisplayLabel(blocker: TranslationFamilyBlocker): string {
  if (isPolicyUnavailableBlocker(blocker)) {
    return 'Policy unavailable';
  }
  return sentenceCaseToken(blocker.blockerCode);
}

function blockerDetailRows(blocker: TranslationFamilyBlocker): Array<[string, string]> {
  const details = blocker.details || {};
  const rows: Array<[string, string]> = [
    ['Code', blocker.blockerCode],
    ['Locale', blocker.locale.toUpperCase()],
    ['Field', blocker.fieldPath],
    ['Content type', blockerDetailValue(details, 'content_type')],
    ['Environment', blockerDetailValue(details, 'environment')],
  ];
  const reason = blockerDetailValue(details, 'reason');
  const message = blockerDetailValue(details, 'message');
  const remediation = blockerDetailValue(details, 'remediation');
  if (isPolicyUnavailableBlocker(blocker)) {
    rows.push(['Reason', 'Policy unavailable']);
  } else if (reason) {
    rows.push(['Reason', reason]);
  }
  if (message && message !== reason) {
    rows.push(['Message', message]);
  }
  if (remediation) {
    rows.push(['Remediation', remediation]);
  }
  return rows.filter(([, value]) => value.trim() !== '');
}

function renderBlockerDetailRows(blocker: TranslationFamilyBlocker): string {
  const rows = blockerDetailRows(blocker);
  if (!rows.length) {
    return '';
  }
  return `
    <dl class="mt-2 grid gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-[7rem_minmax(0,1fr)]">
      ${rows
        .map(([label, value]) => `
          <dt class="font-medium text-gray-500">${escapeHTML(label)}</dt>
          <dd class="min-w-0 break-words text-gray-700">${escapeHTML(value)}</dd>
        `)
        .join('')}
    </dl>
  `;
}

function dueStateSeverity(dueState: string): string {
  switch (dueState) {
    case 'overdue':
      return 'error';
    case 'due_soon':
      return 'warning';
    default:
      return 'neutral';
  }
}

function dueTone(dueState: string): string {
  return getStatusColorClass(dueStateSeverity(dueState));
}

function buildContentLink(contentBasePath: string, detail: TranslationFamilyDetail, variant: TranslationFamilyVariant): string {
  const base = trimTrailingSlash(contentBasePath);
  const recordID = asString(variant.sourceRecordId);
  if (!base || !recordID || !detail.contentType) return '';
  return `${base}/${encodeURIComponent(detail.contentType)}/${encodeURIComponent(recordID)}?locale=${encodeURIComponent(variant.locale)}`;
}

function deriveDueState(dueDate: string): 'none' | 'on_track' | 'due_soon' | 'overdue' {
  const normalized = asString(dueDate);
  if (!normalized) return 'none';
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return 'none';
  const diffMs = parsed.getTime() - Date.now();
  if (diffMs < 0) return 'overdue';
  if (diffMs <= 48 * 60 * 60 * 1000) return 'due_soon';
  return 'on_track';
}

function translationFamilyLocaleAssignmentKey(locale: string, workScope = ''): string {
  const normalizedLocale = asString(locale).toLowerCase();
  const normalizedScope = asString(workScope) || '__all__';
  return `${normalizedLocale}:${normalizedScope}`;
}

function localeAssignmentFor(
  detail: TranslationFamilyDetail,
  locale: string,
  workScope = ''
): TranslationFamilyLocaleAssignment | null {
  const normalizedLocale = asString(locale).toLowerCase();
  if (!normalizedLocale) return null;
  const exactKey = translationFamilyLocaleAssignmentKey(normalizedLocale, workScope);
  if (detail.localeAssignments[exactKey]) return detail.localeAssignments[exactKey];
  for (const [key, value] of Object.entries(detail.localeAssignments)) {
    if (key.startsWith(`${normalizedLocale}:`)) {
      return value;
    }
  }
  return null;
}

function assignmentOwnerLabel(assignment: TranslationFamilyAssignment | null): string {
  if (!assignment) return 'Unassigned';
  return assignment.assigneeLabel || assignment.assigneeId || 'Unassigned';
}

function localeAssignmentReason(localeAssignment: TranslationFamilyLocaleAssignment | null): string {
  if (!localeAssignment) return '';
  const actions = localeAssignment.actions;
  return actions.assignToMe.reason ||
    actions.assignToUser.reason ||
    actions.claim.reason ||
    actions.openEditor.reason ||
    '';
}

function hasEnabledLocaleAssignmentAction(localeAssignment: TranslationFamilyLocaleAssignment | null): boolean {
  if (!localeAssignment) return false;
  const actions = localeAssignment.actions;
  return actions.assignToMe.enabled || actions.assignToUser.enabled || actions.claim.enabled || actions.openEditor.enabled;
}

function renderLocaleAssignmentSummary(localeAssignment: TranslationFamilyLocaleAssignment | null): string {
  if (!localeAssignment || localeAssignment.state === 'source_locale') {
    return '';
  }
  const assignment = localeAssignment.assignment;
  if (!assignment) {
    return `<p class="mt-1 text-xs text-gray-500" data-family-locale-assignment-state="${escapeAttribute(localeAssignment.state)}">No active assignment.</p>`;
  }
  const dueState = assignment.dueState || deriveDueState(assignment.dueDate);
  const dueLabel = dueState === 'none' ? 'No due date' : sentenceCaseToken(dueState);
  return `
    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500" data-family-locale-assignment-state="${escapeAttribute(localeAssignment.state)}">
      <span class="rounded-full px-2 py-0.5 font-medium ${assignmentTone(assignment.status)}">${escapeHTML(sentenceCaseToken(assignment.status))}</span>
      <span>${escapeHTML(assignmentOwnerLabel(assignment))}</span>
      <span class="text-gray-300">·</span>
      <span>Priority ${escapeHTML(assignment.priority || 'normal')}</span>
      <span class="rounded-full px-2 py-0.5 font-medium ${dueTone(dueState)}">${escapeHTML(dueLabel)}</span>
    </div>
  `;
}

function renderLocaleAssignmentActions(localeAssignment: TranslationFamilyLocaleAssignment | null): string {
  if (!localeAssignment || localeAssignment.state === 'source_locale') {
    return '';
  }
  const key = translationFamilyLocaleAssignmentKey(localeAssignment.locale, localeAssignment.workScope);
  const actions = localeAssignment.actions;
  const enabledActions: string[] = [];
  if (actions.assignToMe.enabled) {
    enabledActions.push(`
      <button type="button" class="${BTN_SECONDARY}" data-family-assign-to-me="true" data-locale-assignment-key="${escapeAttribute(key)}">
        Assign to me
      </button>
    `);
  }
  if (actions.assignToUser.enabled) {
    enabledActions.push(`
      <div class="flex min-w-[16rem] flex-wrap items-center gap-2">
        <input
          type="text"
          class="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          data-family-assignee-input="${escapeAttribute(key)}"
          placeholder="Assignee ID"
          aria-label="Assignee ID"
        >
        <button type="button" class="${BTN_SECONDARY}" data-family-assign-to-user="true" data-locale-assignment-key="${escapeAttribute(key)}">
          Assign
        </button>
      </div>
    `);
  }
  if (actions.claim.enabled) {
    enabledActions.push(`
      <button type="button" class="${BTN_SECONDARY}" data-family-claim-assignment="true" data-locale-assignment-key="${escapeAttribute(key)}">
        Claim
      </button>
    `);
  }
  if (actions.openEditor.enabled && actions.openEditor.href) {
    enabledActions.push(`
      <a
        class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        data-family-locale-editor-link="${escapeAttribute(key)}"
        href="${escapeAttribute(actions.openEditor.href)}"
      >${escapeHTML(actions.openEditor.label || 'Open editor')}</a>
    `);
  }
  if (enabledActions.length > 0) {
    return `<div class="flex flex-wrap items-center justify-end gap-2">${enabledActions.join('')}</div>`;
  }
  const reason = localeAssignmentReason(localeAssignment);
  return reason
    ? `<p class="max-w-xs text-right text-xs text-gray-500" data-family-assignment-action-reason="${escapeAttribute(key)}">${escapeHTML(reason)}</p>`
    : '';
}

function assignableLocaleAssignments(detail: TranslationFamilyDetail): Array<[string, TranslationFamilyLocaleAssignment]> {
  return Object.entries(detail.localeAssignments)
    .filter(([, localeAssignment]) => localeAssignment.state !== 'source_locale')
    .filter(([, localeAssignment]) => hasEnabledLocaleAssignmentAction(localeAssignment))
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
}

export function buildFamilyActivityPreview(
  detail: TranslationFamilyDetail,
  limit = 5
): TranslationFamilyActivityPreviewItem[] {
  const items: TranslationFamilyActivityPreviewItem[] = [];

  for (const variant of detail.localeVariants) {
    if (variant.createdAt) {
      items.push({
        id: `variant-created-${variant.id}`,
        timestamp: variant.createdAt,
        title: `${variant.locale.toUpperCase()} variant created`,
        detail: variant.isSource
          ? 'Source locale registered for this family.'
          : `Variant entered ${sentenceCaseToken(variant.status)} state.`,
        tone: variant.isSource ? 'neutral' : 'success',
      });
    }
    if (variant.publishedAt) {
      items.push({
        id: `variant-published-${variant.id}`,
        timestamp: variant.publishedAt,
        title: `${variant.locale.toUpperCase()} variant published`,
        detail: 'Locale is published and available for delivery.',
        tone: 'success',
      });
    }
  }

  for (const assignment of detail.activeAssignments) {
    const timestamp = assignment.updatedAt || assignment.createdAt;
    if (!timestamp) continue;
    const owner = assignment.assigneeId
      ? `Assigned to ${assignment.assigneeId}.`
      : 'Currently unassigned.';
    items.push({
      id: `assignment-${assignment.id}`,
      timestamp,
      title: `${assignment.targetLocale.toUpperCase()} assignment ${sentenceCaseToken(assignment.status)}`,
      detail: `${owner} Priority ${assignment.priority || 'normal'}.`,
      tone: assignment.status === 'changes_requested' ? 'warning' : 'neutral',
    });
  }

  return items
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, Math.max(1, limit));
}

function renderFamilySummaryMetrics(detail: TranslationFamilyDetail): string {
  const metrics = [
    {
      label: 'Required locales',
      value: detail.readinessSummary.requiredLocales.length,
      tone: 'text-gray-900',
    },
    {
      label: 'Missing locales',
      value: detail.readinessSummary.missingRequiredLocaleCount,
      tone: detail.readinessSummary.missingRequiredLocaleCount > 0 ? 'text-rose-700' : 'text-gray-900',
    },
    {
      label: 'Pending review',
      value: detail.readinessSummary.pendingReviewCount,
      tone: detail.readinessSummary.pendingReviewCount > 0 ? 'text-amber-700' : 'text-gray-900',
    },
    {
      label: 'Outdated locales',
      value: detail.readinessSummary.outdatedLocaleCount,
      tone: detail.readinessSummary.outdatedLocaleCount > 0 ? 'text-violet-700' : 'text-gray-900',
    },
  ];

  return metrics
    .map(
      (metric) => `
        <div class="rounded-xl border border-gray-200 bg-white p-6">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">${escapeHTML(metric.label)}</div>
          <div class="mt-2 text-2xl font-semibold ${metric.tone}">${escapeHTML(metric.value)}</div>
        </div>
      `
    )
    .join('');
}

function renderLocalePanel(detail: TranslationFamilyDetail, options: TranslationFamilyDetailRenderOptions): string {
  const contentBasePath = trimTrailingSlash(options.contentBasePath || `${trimTrailingSlash(options.basePath || '/admin')}/content`);
  const missingLocales = detail.readinessSummary.missingLocales;
  const quickCreateReason = detail.quickCreate.disabledReason || 'Locale creation is unavailable for this family.';
  const createLocaleButton = (locale: string): string => {
    const disabled = !canCreateFamilyLocale(detail, locale);
    return `
      <button
        type="button"
        class="${BTN_PRIMARY}${disabled ? ' opacity-60 cursor-not-allowed' : ''}"
        data-family-create-locale="true"
        data-locale="${escapeAttribute(locale)}"
        ${disabled ? 'aria-disabled="true"' : ''}
        title="${escapeAttribute(disabled ? quickCreateReason : `Create ${locale.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  };
  const rows = detail.localeVariants.map((variant) => {
    const href = buildContentLink(contentBasePath, detail, variant);
    const localeAssignment = localeAssignmentFor(detail, variant.locale);
    const openLink = href
      ? `<a href="${escapeAttribute(href)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>`
      : `<span class="text-sm text-gray-400">No content route</span>`;
    const title = variant.fields.title || variant.fields.slug || `${detail.contentType} ${variant.locale.toUpperCase()}`;
    return `
      <li class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${escapeHTML(variant.locale.toUpperCase())}</span>
            ${variant.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ''}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${variantTone(variant.status)}">${escapeHTML(sentenceCaseToken(variant.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${escapeHTML(title)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${escapeHTML(formatTranslationTimestampUTC(variant.updatedAt || variant.createdAt)) || 'n/a'}</p>
          ${renderLocaleAssignmentSummary(localeAssignment)}
        </div>
        <div class="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
          ${renderLocaleAssignmentActions(localeAssignment)}
          ${openLink}
        </div>
      </li>
    `;
  });

  for (const locale of missingLocales) {
    rows.push(`
      <li class="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-6">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-rose-900">${escapeHTML(locale.toUpperCase())}</span>
            <span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Missing required locale</span>
          </div>
          <p class="mt-2 text-sm text-rose-800">This locale is required by policy before the family is publish-ready.</p>
        </div>
        <div class="flex-shrink-0">${createLocaleButton(locale)}</div>
      </li>
    `);
  }

  return `
    <section class="${CARD} p-6 shadow-sm" aria-labelledby="translation-family-locales">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 id="translation-family-locales" class="text-lg font-semibold text-gray-900">Locale coverage</h2>
          <p class="mt-1 text-sm text-gray-500">Server-authored locale availability and variant state for this family.</p>
        </div>
      </div>
      <ul class="mt-5 space-y-3" role="list">
        ${rows.join('') || '<li class="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">No locale variants available.</li>'}
      </ul>
    </section>
  `;
}

function renderAssignmentPanel(detail: TranslationFamilyDetail): string {
  if (!detail.activeAssignments.length) {
    const assignable = assignableLocaleAssignments(detail);
    const startControls = assignable.length
      ? `
        <div class="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4" data-family-empty-assignment-controls="true">
          <div class="grid gap-3 lg:grid-cols-[minmax(10rem,0.8fr)_minmax(12rem,1fr)_auto_auto] lg:items-end">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Locale</span>
              <select class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" data-family-assignment-locale-select="true">
                ${assignable.map(([key, localeAssignment]) => `
                  <option value="${escapeAttribute(key)}">${escapeHTML(localeAssignment.locale.toUpperCase())} · ${escapeHTML(localeAssignment.workScope || '__all__')}</option>
                `).join('')}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Assignee</span>
              <input type="text" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" data-family-assignee-input="__empty_panel__" placeholder="Assignee ID">
            </label>
            <button type="button" class="${BTN_SECONDARY}" data-family-assign-to-me="true" data-locale-assignment-source="empty-panel">
              Assign to me
            </button>
            <button type="button" class="${BTN_PRIMARY}" data-family-assign-to-user="true" data-locale-assignment-source="empty-panel">
              Assign
            </button>
          </div>
        </div>
      `
      : (() => {
          const first = Object.values(detail.localeAssignments).find((entry) => entry.state !== 'source_locale') || null;
          const reason = localeAssignmentReason(first) || 'No assignable locale is available for this family.';
          return `<p class="mt-4 text-sm text-gray-500" data-family-assignment-action-reason="empty">${escapeHTML(reason)}</p>`;
        })();
    return `
      <section class="${CARD} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
        ${startControls}
      </section>
    `;
  }

  return `
    <section class="${CARD} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${detail.activeAssignments
          .map((assignment) => {
            const dueState = deriveDueState(assignment.dueDate);
            const dueLabel = dueState === 'none' ? 'No due date' : sentenceCaseToken(dueState);
            const editorLink = assignment.links.editor;
            return `
              <li class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">${escapeHTML(assignment.targetLocale.toUpperCase())}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${assignmentTone(assignment.status)}">${escapeHTML(sentenceCaseToken(assignment.status))}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${dueTone(dueState)}">${escapeHTML(dueLabel)}</span>
                  </div>
                  <p class="mt-2 text-sm text-gray-600">
                    ${escapeHTML(assignmentOwnerLabel(assignment))}
                    <span class="text-gray-400">·</span>
                    Priority ${escapeHTML(assignment.priority || 'normal')}
                  </p>
                  <p class="mt-1 text-xs text-gray-500">Updated ${escapeHTML(formatTranslationTimestampUTC(assignment.updatedAt || assignment.createdAt)) || 'n/a'}</p>
                </div>
                ${editorLink ? `
                  <a
                    class="inline-flex flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                    data-family-assignment-editor-link="${escapeAttribute(assignment.id)}"
                    href="${escapeAttribute(editorLink.href)}"
                    title="${escapeAttribute(editorLink.description || editorLink.label)}"
                  >${escapeHTML(editorLink.label || 'Open editor')}</a>
                ` : ''}
              </li>
            `;
          })
          .join('')}
      </ul>
    </section>
  `;
}

function renderPublishGatePanel(detail: TranslationFamilyDetail): string {
  const blockers = detail.blockers.length
    ? detail.blockers
        .map((blocker) => {
          const scope = [blocker.locale && blocker.locale.toUpperCase(), blocker.fieldPath].filter(Boolean).join(' · ');
          return `
            <li class="rounded-lg border border-gray-200 bg-white p-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium ${blockerTone(blocker.blockerCode)}">${escapeHTML(blockerDisplayLabel(blocker))}</span>
                ${scope ? `<span class="text-sm text-gray-600">${escapeHTML(scope)}</span>` : ''}
              </div>
              ${renderBlockerDetailRows(blocker)}
            </li>
          `;
        })
        .join('')
    : '<li class="text-sm text-gray-500">No blockers recorded.</li>';

  return `
    <section class="${CARD} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${detail.publishGate.allowed ? 'border border-emerald-200 bg-emerald-50' : 'border border-amber-200 bg-amber-50'} p-6">
        <div class="flex flex-wrap items-center gap-3">
          ${renderReadinessChip(detail.readinessState)}
          <span class="text-sm font-medium ${detail.publishGate.allowed ? 'text-emerald-800' : 'text-amber-800'}">
            ${detail.publishGate.allowed ? 'Eligible to publish.' : 'Publishing is blocked until blockers are cleared.'}
          </span>
        </div>
        <p class="mt-2 text-sm ${detail.publishGate.allowed ? 'text-emerald-700' : 'text-amber-700'}">
          ${detail.publishGate.overrideAllowed
            ? 'Policy allows an explicit publish override once the review owner supplies a rationale.'
            : 'No override path is available for this family.'}
        </p>
      </div>
      <div class="mt-5 grid gap-5">
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Policy</h3>
          <ul class="mt-3 space-y-2 text-sm text-gray-600" role="list">
            <li>Review required: <strong class="text-gray-900">${detail.publishGate.reviewRequired ? 'Yes' : 'No'}</strong></li>
            <li>Override allowed: <strong class="text-gray-900">${detail.publishGate.overrideAllowed ? 'Yes' : 'No'}</strong></li>
            <li>Available locales: <strong class="text-gray-900">${escapeHTML(detail.readinessSummary.availableLocales.join(', ') || 'None')}</strong></li>
          </ul>
        </div>
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Blockers</h3>
          <ul class="mt-3 space-y-2" role="list">${blockers}</ul>
        </div>
      </div>
    </section>
  `;
}

function renderActivityPanel(detail: TranslationFamilyDetail): string {
  const items = buildFamilyActivityPreview(detail);
  return `
    <section class="${CARD} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${
        items.length
          ? `<ol class="mt-5 space-y-3" role="list">
              ${items
                .map(
                  (item) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${escapeHTML(item.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.tone === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.tone === 'warning'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                        }">${escapeHTML(formatTranslationTimestampUTC(item.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-gray-600">${escapeHTML(item.detail)}</p>
                    </li>
                  `
                )
                .join('')}
            </ol>`
          : '<p class="mt-4 text-sm text-gray-500">No activity timestamps are available for this family yet.</p>'
      }
    </section>
  `;
}

function renderDiagnostics(state: TranslationFamilyDetailLoadState): string {
  const chips = [
    state.requestId ? `Request ${escapeHTML(state.requestId)}` : '',
    state.traceId ? `Trace ${escapeHTML(state.traceId)}` : '',
    state.errorCode ? `Code ${escapeHTML(state.errorCode)}` : '',
  ].filter(Boolean);
  if (!chips.length) return '';
  return `
    <div class="mt-4 flex flex-wrap gap-2" aria-label="Diagnostics">
      ${chips
        .map(
          (chip) => `<span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">${chip}</span>`
        )
        .join('')}
    </div>
  `;
}

function renderFamilyLoadingState(message: string): string {
  return `
    <div class="${LOADING_STATE}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></span>
        <span class="text-sm">${escapeHTML(message)}</span>
      </div>
    </div>
  `;
}

function renderFamilyEmptyState(title: string, message: string): string {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md ${EMPTY_STATE} p-8 text-center shadow-sm">
        <h2 class="${EMPTY_STATE_TITLE}">${escapeHTML(title)}</h2>
        <p class="${EMPTY_STATE_TEXT} mt-2">${escapeHTML(message)}</p>
      </div>
    </div>
  `;
}

function renderFamilyErrorState(title: string, message: string, state: TranslationFamilyDetailLoadState): string {
  const recovery = state.syncRecovery;
  const syncAction = recovery?.canSync && state.syncStatus !== 'completed'
    ? `
      <button
        type="button"
        class="mt-4 ${BTN_PRIMARY}"
        data-family-sync-action="true"
        data-family-sync-rpc="${escapeAttribute(recovery.rpcInvokePath)}"
        data-family-sync-command="${escapeAttribute(recovery.commandName)}"
        data-family-sync-family-id="${escapeAttribute(recovery.familyId)}"
        data-family-sync-environment="${escapeAttribute(recovery.environment)}"
      >
        Sync translation families
      </button>
    `
    : '';
  const syncFeedback = state.syncMessage
    ? escapeHTML(state.syncMessage)
    : '';
  return `
    <div class="${ERROR_STATE} p-6" role="alert">
      <h2 class="${ERROR_STATE_TITLE}">${escapeHTML(title)}</h2>
      <p class="${ERROR_STATE_TEXT} mt-2">${escapeHTML(message)}</p>
      <p
        data-family-sync-feedback="true"
        class="mt-3 text-sm ${state.syncStatus === 'failed' ? 'text-rose-700' : 'text-amber-700'}"
        ${syncFeedback ? '' : 'hidden'}
      >${syncFeedback}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" class="ui-state-retry-btn ${BTN_SECONDARY}">
          Reload family detail
        </button>
        ${syncAction}
      </div>
    </div>
  `;
}

export function renderTranslationFamilyDetailState(
  state: TranslationFamilyDetailLoadState,
  options: TranslationFamilyDetailRenderOptions = {}
): string {
  if (state.status === 'loading') {
    return renderFamilyLoadingState('Loading translation family...');
  }

  if (state.status === 'empty') {
    return `
      ${renderFamilyEmptyState(
        'Family detail unavailable',
        state.message || 'This family detail view does not have a backing payload yet.'
      )}
      ${renderDiagnostics(state)}
    `;
  }

  if (state.status === 'error' || state.status === 'conflict') {
    const title = state.status === 'conflict' ? 'Family detail conflict' : 'Family detail failed to load';
    const message = state.message || (state.status === 'conflict'
      ? 'The family detail payload is out of date. Reload to fetch the latest state.'
      : 'The translation family detail request failed.');
    return `
      <div class="translation-family-detail-error">
        ${renderFamilyErrorState(title, message, state)}
        ${renderDiagnostics(state)}
      </div>
    `;
  }

  const detail = state.detail;
  if (!detail) {
    return renderFamilyEmptyState('Family detail unavailable', 'No family detail payload was returned.');
  }

  const sourceTitle =
    detail.sourceVariant?.fields.title ||
    detail.sourceVariant?.fields.slug ||
    `${detail.contentType} family`;
  const blockerSummary = detail.readinessSummary.blockerCodes.length
    ? detail.readinessSummary.blockerCodes.map(sentenceCaseToken).join(', ')
    : 'No blockers';
  const createLocaleCandidates = familyCreateLocaleCandidates(detail);
  const recommendedCreateLocale = detail.quickCreate.recommendedLocale || createLocaleCandidates[0] || '';
  const quickCreateDisabled = !canCreateFamilyLocale(detail, recommendedCreateLocale);
  const createLocaleCTA = recommendedCreateLocale
    ? `
      <button
        type="button"
        class="${BTN_PRIMARY}${quickCreateDisabled ? ' opacity-60 cursor-not-allowed' : ''}"
        data-family-create-locale="true"
        data-locale="${escapeAttribute(recommendedCreateLocale)}"
        ${quickCreateDisabled ? 'aria-disabled="true"' : ''}
        title="${escapeAttribute(quickCreateDisabled ? detail.quickCreate.disabledReason || 'Locale creation is unavailable.' : `Create ${recommendedCreateLocale.toUpperCase()} locale`)}"
      >
        Create ${escapeHTML(recommendedCreateLocale.toUpperCase())}
      </button>
    `
    : '';
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${escapeAttribute(detail.familyId)}" data-readiness-state="${escapeAttribute(detail.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="${HEADER_PRETITLE}">Translation family</p>
            <h1 class="${HEADER_TITLE} mt-2">${escapeHTML(sourceTitle)}</h1>
            <p class="mt-2 text-sm text-gray-600">${escapeHTML(detail.contentType)} · Source locale ${escapeHTML(detail.sourceLocale.toUpperCase())} · Family ${escapeHTML(detail.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${renderReadinessChip(detail.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${escapeHTML(blockerSummary)}</span>
            ${createLocaleCTA}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${renderFamilySummaryMetrics(detail)}
        </div>
        ${renderDiagnostics(state)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${renderLocalePanel(detail, options)}
          ${renderAssignmentPanel(detail)}
        </div>
        <div class="space-y-6">
          ${renderPublishGatePanel(detail)}
          ${renderActivityPanel(detail)}
        </div>
      </div>
    </div>
  `;
}

export async function fetchTranslationFamilyDetailState(
  endpoint: string,
  options: TranslationFamilyDetailFetchOptions = {}
): Promise<TranslationFamilyDetailLoadState> {
  const url = asString(endpoint);
  if (!url) {
    return {
      status: 'empty',
      message: 'The family detail route is missing its backing API endpoint.',
    };
  }

  try {
    const response = await (options.fetch
      ? options.fetch(url, { headers: { Accept: 'application/json' } })
      : httpRequest(url, { headers: { Accept: 'application/json' } }));
    const requestId = asString(response.headers.get('x-request-id'));
    const traceId = requestTraceID(response.headers);

    if (!response.ok) {
      const structured = await extractStructuredError(response);
      const recoveryMetadata = asRecord(structured.metadata?.sync_recovery);
      const syncableNotFound = structured.textCode === 'NOT_FOUND' || asBoolean(recoveryMetadata.syncable);
      return {
        status: response.status === 409 ? 'conflict' : 'error',
        message: structured.message,
        requestId,
        traceId,
        statusCode: response.status,
        errorCode: structured.textCode,
        syncRecovery: syncableNotFound
          ? normalizeTranslationFamilySyncRecoveryCapability(
              recoveryMetadata,
              { familyId: asString(structured.metadata?.family_id) }
            )
          : null,
      };
    }

    const payload = asRecord(await response.json());
    const detail = normalizeFamilyDetail(payload);
    if (!detail.familyId) {
      return {
        status: 'empty',
        message: 'The family detail payload did not include a family identifier.',
        requestId,
        traceId,
        statusCode: response.status,
      };
    }

    return {
      status: 'ready',
      detail,
      requestId,
      traceId,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to load translation family detail.',
    };
  }
}

function translationFamilyDetailChannel(endpoint: string): string {
  const locationParams = readLocationSearchParams();
  const locationChannel = locationParams ? getStringSearchParam(locationParams, 'channel') : '';
  if (locationChannel) {
    return locationChannel;
  }
  try {
    const endpointURL = new URL(asString(endpoint), 'http://localhost');
    return getStringSearchParam(endpointURL.searchParams, 'channel') || '';
  } catch {
    return '';
  }
}

export function renderTranslationFamilyDetailPage(
  root: HTMLElement | { innerHTML: string; dataset?: DOMStringMap | Record<string, string | undefined> },
  state: TranslationFamilyDetailLoadState,
  options: TranslationFamilyDetailRenderOptions = {}
): void {
  root.innerHTML = renderTranslationFamilyDetailState(state, options);
}

export interface TranslationFamilyListLoadState {
  status: 'loading' | 'ready' | 'empty' | 'error';
  filters: TranslationFamilyFilters;
  response?: TranslationFamilyListResponse;
  message?: string;
  requestURL?: string;
  requestId?: string;
  traceId?: string;
  statusCode?: number;
  errorCode?: string | null;
}

export interface TranslationFamilyListRenderOptions {
  endpoint?: string;
  basePath?: string;
  familyBasePath?: string;
  matrixPath?: string;
  queuePath?: string;
}

export interface TranslationFamilyListPageOptions extends TranslationFamilyListRenderOptions {
  fetch?: typeof fetch;
}

const FAMILY_LIST_QUERY_KEYS = [
  'channel',
  'content_type',
  'readiness_state',
  'blocker_code',
  'missing_locale',
  'page',
  'per_page',
];

export function parseFamilyListFiltersFromSearchParams(params: URLSearchParams | null | undefined): TranslationFamilyFilters {
  const source = params ?? new URLSearchParams();
  return createFamilyFilters({
    channel: getStringSearchParam(source, 'channel') || '',
    contentType: getStringSearchParam(source, 'content_type') || '',
    readinessState: getStringSearchParam(source, 'readiness_state') || '',
    blockerCode: getStringSearchParam(source, 'blocker_code') || '',
    missingLocale: getStringSearchParam(source, 'missing_locale') || '',
    page: getNumberSearchParam(source, 'page') || 1,
    perPage: getNumberSearchParam(source, 'per_page') || 50,
  });
}

export function readFamilyListFiltersFromLocation(
  locationLike: { search?: string | null } | null | undefined = globalThis.location
): TranslationFamilyFilters {
  return parseFamilyListFiltersFromSearchParams(readLocationSearchParams(locationLike));
}

export function buildFamilyListBrowserSearch(
  currentParams: URLSearchParams | null | undefined,
  filters: Partial<TranslationFamilyFilters>
): string {
  const params = new URLSearchParams(currentParams ?? undefined);
  for (const key of FAMILY_LIST_QUERY_KEYS) {
    params.delete(key);
  }
  const next = buildFamilyListQuery(filters);
  next.forEach((value, key) => params.set(key, value));
  return params.toString();
}

function deriveFamilyAPIBasePath(endpoint: string, fallbackBasePath = '/admin'): string {
  const normalizedEndpoint = trimTrailingSlash(endpoint);
  const suffix = '/translations/families';
  if (normalizedEndpoint.endsWith(suffix)) {
    return normalizedEndpoint.slice(0, -suffix.length) || '/';
  }
  return `${trimTrailingSlash(fallbackBasePath || '/admin')}/api`;
}

function defaultFamilyBasePath(basePath = '/admin'): string {
  return `${trimTrailingSlash(basePath || '/admin')}/translations/families`;
}

export function buildFamilyDetailUIURL(familyBasePath: string, familyId: string, channel = ''): string {
  const base = trimTrailingSlash(familyBasePath || defaultFamilyBasePath('/admin'));
  const query = new URLSearchParams();
  setSearchParam(query, 'channel', channel);
  return buildURL(`${base}/${encodeURIComponent(asString(familyId))}`, query);
}

function buildFamilyContextURL(pathname: string, params: Record<string, string>): string {
  const base = asString(pathname);
  if (!base) return '';
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    setSearchParam(query, key, value);
  }
  return buildURL(base, query);
}

export function buildFamilyMatrixURL(
  matrixPath: string,
  row: TranslationFamilyListItem,
  filters: Partial<TranslationFamilyFilters> = {}
): string {
  return buildFamilyContextURL(matrixPath, {
    family_id: row.familyId,
    channel: asString(filters.channel),
    content_type: row.contentType || asString(filters.contentType),
    readiness_state: row.readinessState || asString(filters.readinessState),
    blocker_code: asString(filters.blockerCode),
    missing_locale: asString(filters.missingLocale),
  });
}

export function buildFamilyQueueURL(
  queuePath: string,
  row: TranslationFamilyListItem,
  filters: Partial<TranslationFamilyFilters> = {}
): string {
  return buildFamilyContextURL(queuePath, {
    family_id: row.familyId,
    channel: asString(filters.channel),
  });
}

function familyDisplayTitle(row: TranslationFamilyListItem): string {
  return row.sourceTitle || row.sourceRecordId || row.familyId || 'Translation family';
}

function renderFilterOption(value: string, label: string, selected: string): string {
  return `<option value="${escapeAttribute(value)}" ${value === selected ? 'selected' : ''}>${escapeHTML(label)}</option>`;
}

function renderTranslationFamilyListFilters(filters: TranslationFamilyFilters): string {
  const perPage = String(filters.perPage || 50);
  return `
    <form class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" data-family-list-filters="true">
      <div class="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <label class="block text-sm font-medium text-gray-700">
          <span>Channel</span>
          <input name="channel" value="${escapeAttribute(filters.channel)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="default">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Readiness</span>
          <select name="readiness_state" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${renderFilterOption('', 'Any', filters.readinessState)}
            ${renderFilterOption('blocked', 'Blocked', filters.readinessState)}
            ${renderFilterOption('ready', 'Ready', filters.readinessState)}
          </select>
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Blocker</span>
          <select name="blocker_code" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${renderFilterOption('', 'Any', filters.blockerCode)}
            ${renderFilterOption('missing_locale', 'Missing locale', filters.blockerCode)}
            ${renderFilterOption('missing_field', 'Missing field', filters.blockerCode)}
            ${renderFilterOption('pending_review', 'Pending review', filters.blockerCode)}
            ${renderFilterOption('outdated_source', 'Outdated source', filters.blockerCode)}
            ${renderFilterOption('policy_denied', 'Policy issue', filters.blockerCode)}
          </select>
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Missing locale</span>
          <input name="missing_locale" value="${escapeAttribute(filters.missingLocale)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="fr">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Content type</span>
          <input name="content_type" value="${escapeAttribute(filters.contentType)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="pages">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Per page</span>
          <select name="per_page" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${['10', '25', '50', '100'].map((value) => renderFilterOption(value, value, perPage)).join('')}
          </select>
        </label>
        <div class="flex items-end gap-2">
          <button type="submit" class="${BTN_PRIMARY} w-full">Apply</button>
        </div>
      </div>
      <input type="hidden" name="page" value="${escapeAttribute(filters.page)}">
    </form>
  `;
}

function renderLocaleList(locales: string[], empty = 'None'): string {
  if (!locales.length) {
    return `<span class="text-gray-400">${escapeHTML(empty)}</span>`;
  }
  return `
    <span class="flex flex-wrap gap-1">
      ${locales.map((locale) => `<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">${escapeHTML(locale.toUpperCase())}</span>`).join('')}
    </span>
  `;
}

function renderFamilyBlockers(row: TranslationFamilyListItem): string {
  if (!row.blockerCodes.length) {
    return '<span class="text-gray-400">No blockers</span>';
  }
  const renderedLabels = new Set<string>();
	const chips: Array<{ code: string; label: string }> = row.blockerCodes.map((code) => {
    const label = row.blockerLabels[code] || sentenceCaseToken(code);
    renderedLabels.add(label.toLowerCase());
    return { code, label };
  });
  for (const [code, label] of Object.entries(row.blockerLabels)) {
    const normalizedLabel = label.toLowerCase();
    if (row.blockerCodes.includes(code as FamilyBlockerCode) || renderedLabels.has(normalizedLabel)) {
      continue;
    }
    renderedLabels.add(normalizedLabel);
    chips.push({ code: asString(code), label });
  }
  return chips
    .map(({ code, label }) => `<span class="rounded-full px-2 py-0.5 text-xs font-medium ${blockerTone(code)}">${escapeHTML(label)}</span>`)
    .join(' ');
}

function renderFamilyMetric(value: number, label: string, tone = 'text-gray-900'): string {
  return `
    <span class="inline-flex min-w-[4.25rem] flex-col rounded-md bg-gray-50 px-2 py-1">
      <span class="text-sm font-semibold ${tone}">${escapeHTML(value)}</span>
      <span class="text-[11px] font-medium uppercase tracking-wide text-gray-500">${escapeHTML(label)}</span>
    </span>
  `;
}

function renderFamilyListRows(
  rows: TranslationFamilyListItem[],
  filters: TranslationFamilyFilters,
  options: TranslationFamilyListRenderOptions
): string {
  const familyBasePath = options.familyBasePath || defaultFamilyBasePath(options.basePath || '/admin');
  return rows.map((row) => {
    const detailURL = buildFamilyDetailUIURL(familyBasePath, row.familyId, filters.channel);
    const matrixURL = options.matrixPath ? buildFamilyMatrixURL(options.matrixPath, row, filters) : '';
    const queueURL = options.queuePath ? buildFamilyQueueURL(options.queuePath, row, filters) : '';
    const title = familyDisplayTitle(row);
    return `
      <tr class="border-b border-gray-200 last:border-0" data-family-id="${escapeAttribute(row.familyId)}">
        <td class="max-w-[22rem] px-4 py-4 align-top">
          <div class="min-w-0">
            <a href="${escapeAttribute(detailURL)}" class="font-semibold text-gray-900 hover:text-sky-700">${escapeHTML(title)}</a>
            <p class="mt-1 break-all text-xs text-gray-500">${escapeHTML(row.familyId)}</p>
            <p class="mt-2 text-xs text-gray-500">${escapeHTML(row.contentType || 'unknown')} · Source ${escapeHTML(row.sourceLocale.toUpperCase() || 'n/a')}</p>
          </div>
        </td>
        <td class="px-4 py-4 align-top">${renderReadinessChip(row.readinessState)}</td>
        <td class="px-4 py-4 align-top">${renderFamilyBlockers(row)}</td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-wrap gap-2">
            ${renderFamilyMetric(row.missingRequiredLocaleCount, 'Missing', row.missingRequiredLocaleCount > 0 ? 'text-rose-700' : 'text-gray-900')}
            ${renderFamilyMetric(row.pendingReviewCount, 'Review', row.pendingReviewCount > 0 ? 'text-amber-700' : 'text-gray-900')}
            ${renderFamilyMetric(row.outdatedLocaleCount, 'Outdated', row.outdatedLocaleCount > 0 ? 'text-violet-700' : 'text-gray-900')}
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="space-y-2 text-sm">
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Available</span>${renderLocaleList(row.availableLocales)}</div>
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Missing</span>${renderLocaleList(row.missingLocales)}</div>
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-col gap-2">
            <a href="${escapeAttribute(detailURL)}" class="${BTN_PRIMARY} text-center" data-family-primary-action="true">Open family</a>
            ${matrixURL ? `<a href="${escapeAttribute(matrixURL)}" class="${BTN_SECONDARY} text-center">Matrix</a>` : ''}
            ${queueURL ? `<a href="${escapeAttribute(queueURL)}" class="${BTN_GHOST} text-center">Queue</a>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderTranslationFamilyListTable(
  response: TranslationFamilyListResponse,
  filters: TranslationFamilyFilters,
  options: TranslationFamilyListRenderOptions
): string {
  const start = response.items.length ? ((response.page - 1) * response.perPage) + 1 : 0;
  const end = Math.min(response.total, (response.page - 1) * response.perPage + response.items.length);
  const hasPrevious = response.page > 1;
  const hasNext = response.page * response.perPage < response.total;
  return `
    <section class="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm" aria-labelledby="translation-family-list-results">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 id="translation-family-list-results" class="text-base font-semibold text-gray-900">Families</h2>
          <p class="text-sm text-gray-500">${escapeHTML(start)}-${escapeHTML(end)} of ${escapeHTML(response.total)} families</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="${BTN_SECONDARY}" data-family-list-page="prev" ${hasPrevious ? '' : 'disabled'}>Previous</button>
          <span class="text-sm text-gray-500">Page ${escapeHTML(response.page)}</span>
          <button type="button" class="${BTN_SECONDARY}" data-family-list-page="next" ${hasNext ? '' : 'disabled'}>Next</button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <caption class="sr-only">Translation families with readiness, blockers, locale coverage, and row actions.</caption>
          <thead class="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" class="px-4 py-3">Family</th>
              <th scope="col" class="px-4 py-3">Readiness</th>
              <th scope="col" class="px-4 py-3">Blockers</th>
              <th scope="col" class="px-4 py-3">Pressure</th>
              <th scope="col" class="px-4 py-3">Locales</th>
              <th scope="col" class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            ${renderFamilyListRows(response.items, filters, options)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderTranslationFamilyListError(state: TranslationFamilyListLoadState): string {
  return `
    <div class="${ERROR_STATE} mt-6 p-6" role="alert">
      <h2 class="${ERROR_STATE_TITLE}">Families failed to load</h2>
      <p class="${ERROR_STATE_TEXT} mt-2">${escapeHTML(state.message || 'The translation families request failed.')}</p>
      ${state.requestURL ? `<p class="mt-3 break-all text-xs text-gray-500">Request ${escapeHTML(state.requestURL)}</p>` : ''}
      ${renderDiagnostics({
        status: 'error',
        requestId: state.requestId,
        traceId: state.traceId,
        errorCode: state.errorCode,
      })}
      <button type="button" class="ui-state-retry-btn mt-4 ${BTN_SECONDARY}">Retry</button>
    </div>
  `;
}

export function renderTranslationFamilyListState(
  state: TranslationFamilyListLoadState,
  options: TranslationFamilyListRenderOptions = {}
): string {
  const filters = state.filters;
  const controls = renderTranslationFamilyListFilters(filters);
  if (state.status === 'loading') {
    return `${controls}${renderFamilyLoadingState('Loading translation families...')}`;
  }
  if (state.status === 'error') {
    return `${controls}${renderTranslationFamilyListError(state)}`;
  }
  const response = state.response;
  if (!response || state.status === 'empty' || response.items.length === 0) {
    return `${controls}${renderFamilyEmptyState('No translation families found', 'No families match the current filters.')}`;
  }
  return `${controls}${renderTranslationFamilyListTable(response, filters, options)}`;
}

export function renderTranslationFamilyListPage(
  root: HTMLElement | { innerHTML: string; dataset?: DOMStringMap | Record<string, string | undefined> },
  state: TranslationFamilyListLoadState,
  options: TranslationFamilyListRenderOptions = {}
): void {
  root.innerHTML = renderTranslationFamilyListState(state, options);
}

export async function fetchTranslationFamilyListState(
  endpoint: string,
  filters: TranslationFamilyFilters,
  options: TranslationFamilyDetailFetchOptions & { basePath?: string } = {}
): Promise<TranslationFamilyListLoadState> {
  const apiBasePath = deriveFamilyAPIBasePath(endpoint, options.basePath);
  const requestURL = buildFamilyListURL(apiBasePath, filters);
  const fetchImpl = options.fetch;
  try {
    const response = await (fetchImpl
      ? fetchImpl(requestURL, { headers: { Accept: 'application/json' } })
      : httpRequest(requestURL, { headers: { Accept: 'application/json' } }));
    const requestId = asString(response.headers.get('x-request-id'));
    const traceId = requestTraceID(response.headers);
    if (!response.ok) {
      const structured = await extractStructuredError(response);
      return {
        status: 'error',
        filters,
        message: structured.message,
        requestURL,
        requestId,
        traceId,
        statusCode: response.status,
        errorCode: structured.textCode,
      };
    }
    const payload = asRecord(await response.json());
    const list = normalizeFamilyListResponse(payload);
    return {
      status: list.items.length ? 'ready' : 'empty',
      filters,
      response: list,
      requestURL,
      requestId,
      traceId,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      status: 'error',
      filters,
      message: error instanceof Error ? error.message : 'Failed to load translation families.',
      requestURL,
    };
  }
}

function familyFiltersFromForm(form: HTMLFormElement, fallback: TranslationFamilyFilters): TranslationFamilyFilters {
  const data = new FormData(form);
  const stringValue = (name: string, fallbackValue: string): string =>
    data.has(name) ? asString(data.get(name)) : fallbackValue;
  const numberValue = (name: string, fallbackValue: number): number =>
    data.has(name) ? asNumber(data.get(name), fallbackValue) : fallbackValue;
  return createFamilyFilters({
    channel: stringValue('channel', fallback.channel),
    contentType: stringValue('content_type', fallback.contentType),
    readinessState: stringValue('readiness_state', fallback.readinessState),
    blockerCode: stringValue('blocker_code', fallback.blockerCode),
    missingLocale: stringValue('missing_locale', fallback.missingLocale),
    page: numberValue('page', fallback.page),
    perPage: numberValue('per_page', fallback.perPage),
  });
}

function updateFamilyListBrowserURL(filters: TranslationFamilyFilters): void {
  if (typeof window === 'undefined' || !window.history || !window.location) return;
  const current = new URLSearchParams(window.location.search);
  const search = buildFamilyListBrowserSearch(current, filters);
  const nextURL = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash || ''}`;
  window.history.pushState({}, '', nextURL);
}

export async function initTranslationFamilyListPage(
  root: HTMLElement | null,
  options: TranslationFamilyListPageOptions = {}
): Promise<TranslationFamilyListLoadState | null> {
  if (!root) return null;
  const dataset = root.dataset || {};
  const renderOptions: TranslationFamilyListRenderOptions = {
    endpoint: asString(options.endpoint || dataset.endpoint),
    basePath: asString(options.basePath || dataset.basePath || '/admin'),
    familyBasePath: asString(options.familyBasePath || dataset.familyBasePath),
    matrixPath: asString(options.matrixPath || dataset.matrixPath),
    queuePath: asString(options.queuePath || dataset.queuePath),
  };
  if (!renderOptions.familyBasePath) {
    renderOptions.familyBasePath = defaultFamilyBasePath(renderOptions.basePath);
  }

  let filters = readFamilyListFiltersFromLocation();
  let lastState: TranslationFamilyListLoadState | null = null;

  const load = async (nextFilters: TranslationFamilyFilters, pushURL = false): Promise<TranslationFamilyListLoadState> => {
    filters = createFamilyFilters(nextFilters);
    if (pushURL) {
      updateFamilyListBrowserURL(filters);
    }
    renderTranslationFamilyListPage(root, { status: 'loading', filters }, renderOptions);
    const state = await fetchTranslationFamilyListState(asString(renderOptions.endpoint), filters, {
      fetch: options.fetch,
      basePath: renderOptions.basePath,
    });
    lastState = state;
    renderTranslationFamilyListPage(root, state, renderOptions);
    bindTranslationFamilyListPage(root, state, load);
    return state;
  };

  lastState = await load(filters, false);
  return lastState;
}

function bindTranslationFamilyListPage(
  root: HTMLElement,
  state: TranslationFamilyListLoadState,
  load: (filters: TranslationFamilyFilters, pushURL?: boolean) => Promise<TranslationFamilyListLoadState>
): void {
  const form = root.querySelector<HTMLFormElement>('[data-family-list-filters="true"]');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const next = familyFiltersFromForm(form, state.filters);
      void load({ ...next, page: 1 }, true);
    });
    form.querySelectorAll<HTMLSelectElement>('select').forEach((select) => {
      select.addEventListener('change', () => {
        const next = familyFiltersFromForm(form, state.filters);
        void load({ ...next, page: 1 }, true);
      });
    });
  }
  root.querySelector<HTMLButtonElement>('.ui-state-retry-btn')?.addEventListener('click', () => {
    void load(state.filters, false);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-family-list-page]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      const direction = button.dataset.familyListPage;
      const delta = direction === 'next' ? 1 : -1;
      void load({ ...state.filters, page: Math.max(1, state.filters.page + delta) }, true);
    });
  });
}

function globalToast(kind: 'success' | 'error' | 'warning' | 'info', message: string): void {
  const manager = (globalThis as { toastManager?: Record<string, (input: string) => void> }).toastManager;
  const handler = manager?.[kind];
  if (typeof handler === 'function') {
    handler.call(manager, message);
  }
}

function createLocaleErrorMessage(error: TranslationCreateLocaleError, locale: string): string {
  switch (error.textCode) {
    case 'TRANSLATION_EXISTS':
      return `${locale.toUpperCase()} already exists. Reload to open the existing locale.`;
    case 'POLICY_BLOCKED':
      return 'Policy blocked locale creation for this family.';
    case 'VERSION_CONFLICT':
      return 'The family changed while you were creating the locale. Reload and try again.';
    default:
      return error.message || 'Failed to create locale.';
  }
}

export function toDateTimeLocalInputValue(value: string): string {
  const normalized = asString(value);
  if (!normalized) return '';
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toRFC3339(value: string): string {
  const normalized = asString(value);
  if (!normalized) return '';
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function resolveCreateLocaleNavigationTarget(
  result: TranslationCreateLocaleResult,
  localeURLs: Record<string, string>,
  requestedLocale: string,
  preferEdit: boolean
): string {
  const locale = asString(result.locale).toLowerCase();
  const requested = asString(requestedLocale).toLowerCase();
  const preferredNavigation = preferEdit
    ? result.navigation.contentEditURL || result.navigation.contentDetailURL
    : result.navigation.contentDetailURL || result.navigation.contentEditURL;
  if (requested && requested === locale && preferredNavigation) {
    return preferredNavigation;
  }
  if (locale && localeURLs[locale]) {
    return localeURLs[locale];
  }
  return preferredNavigation;
}

interface CreateLocaleDialogConfig {
  familyId: string;
  quickCreate: TranslationFamilyQuickCreateHints;
  initialLocale?: string;
  heading: string;
  submitLabel?: string;
  onSubmit: (input: Partial<TranslationCreateLocaleRequest>) => Promise<TranslationCreateLocaleResult>;
  onSuccess?: (result: TranslationCreateLocaleResult) => Promise<void> | void;
}

function openCreateLocaleDialog(config: CreateLocaleDialogConfig): void {
  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc) return;
  const quickCreate = config.quickCreate;
  if (!quickCreate.enabled || quickCreate.missingLocales.length === 0) {
    globalToast('warning', quickCreate.disabledReason || 'Locale creation is unavailable.');
    return;
  }

  const recommendedLocale = asString(config.initialLocale || quickCreate.recommendedLocale || quickCreate.missingLocales[0]).toLowerCase();
  const selectedLocale = quickCreate.missingLocales.includes(recommendedLocale)
    ? recommendedLocale
    : quickCreate.missingLocales[0];

  const overlay = doc.createElement('div');
  overlay.className = MODAL_OVERLAY;
  overlay.setAttribute('data-translation-create-locale-modal', 'true');
  overlay.innerHTML = `
    <div class="${MODAL_CONTENT}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${escapeHTML(config.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${escapeHTML(config.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${BTN_GHOST}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${quickCreate.missingLocales.map((locale) => `
                <option value="${escapeAttribute(locale)}" ${locale === selectedLocale ? 'selected' : ''}>
                  ${escapeHTML(locale.toUpperCase())}${locale === quickCreate.recommendedLocale ? ' (recommended)' : ''}
                </option>
              `).join('')}
            </select>
          </label>
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">
            <p><strong>Required for publish:</strong> ${escapeHTML(quickCreate.requiredForPublish.join(', ') || 'None')}</p>
            <p class="mt-2"><strong>Recommended locale:</strong> ${escapeHTML(quickCreate.recommendedLocale.toUpperCase() || 'N/A')}</p>
            <p class="mt-2"><strong>Default work scope:</strong> ${escapeHTML(quickCreate.defaultAssignment.workScope || '__all__')}</p>
          </div>
          <label class="flex items-center gap-3 rounded-xl border border-gray-200 px-6 py-4">
            <input type="checkbox" name="auto_create_assignment" class="h-4 w-4 rounded border-gray-300 text-sky-600" ${quickCreate.defaultAssignment.autoCreateAssignment ? 'checked' : ''}>
            <span class="text-sm text-gray-800">Seed an assignment now</span>
          </label>
          <div data-assignment-fields="true" class="grid gap-4 rounded-xl border border-gray-200 p-6">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Assignee</span>
              <input type="text" name="assignee_id" value="${escapeAttribute(quickCreate.defaultAssignment.assigneeId)}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Priority</span>
              <select name="priority" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                ${['low', 'normal', 'high', 'urgent'].map((priority) => `
                  <option value="${priority}" ${priority === (quickCreate.defaultAssignment.priority || 'normal') ? 'selected' : ''}>${sentenceCaseToken(priority)}</option>
                `).join('')}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${escapeAttribute(toDateTimeLocalInputValue(quickCreate.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${BTN_SECONDARY}">Cancel</button>
          <button type="submit" class="${BTN_PRIMARY}">${escapeHTML(config.submitLabel || 'Create locale')}</button>
        </div>
      </form>
    </div>
  `;
  doc.body.appendChild(overlay);

  const modalContent = overlay.querySelector<HTMLElement>('[role="dialog"]');
  const form = overlay.querySelector('form');
  const localeField = overlay.querySelector<HTMLSelectElement>('select[name="locale"]');
  const autoCreateAssignmentField = overlay.querySelector<HTMLInputElement>('input[name="auto_create_assignment"]');
  const assigneeField = overlay.querySelector<HTMLInputElement>('input[name="assignee_id"]');
  const priorityField = overlay.querySelector<HTMLSelectElement>('select[name="priority"]');
  const dueDateField = overlay.querySelector<HTMLInputElement>('input[name="due_date"]');
  const assignmentFields = overlay.querySelector<HTMLElement>('[data-assignment-fields="true"]');
  const feedback = overlay.querySelector<HTMLElement>('[data-create-locale-feedback="true"]');
  const submitButton = overlay.querySelector<HTMLButtonElement>('button[type="submit"]');

  const close = (): void => {
    cleanupFocusTrap();
    overlay.remove();
  };
  const syncAssignmentFields = (): void => {
    if (!assignmentFields || !autoCreateAssignmentField) return;
    assignmentFields.hidden = !autoCreateAssignmentField.checked;
  };

  // Set up focus trapping with Escape key handling
  const cleanupFocusTrap = modalContent ? trapFocus(modalContent, close) : () => {};

  syncAssignmentFields();
  autoCreateAssignmentField?.addEventListener('change', syncAssignmentFields);
  overlay.querySelectorAll<HTMLElement>('[data-close-modal="true"]').forEach((element) => {
    element.addEventListener('click', close);
  });
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!localeField || !submitButton) return;
    if (feedback) {
      feedback.hidden = true;
      feedback.textContent = '';
    }
    submitButton.disabled = true;
    submitButton.classList.add('opacity-60', 'cursor-not-allowed');
    const locale = asString(localeField.value).toLowerCase();
    try {
      const result = await config.onSubmit({
        locale,
        autoCreateAssignment: autoCreateAssignmentField?.checked,
        assigneeId: assigneeField?.value,
        priority: priorityField?.value,
        dueDate: toRFC3339(dueDateField?.value || ''),
      });
      close();
      await config.onSuccess?.(result);
    } catch (error) {
      const typed = error as TranslationCreateLocaleError;
      const message = createLocaleErrorMessage(typed, locale);
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = message;
      }
      globalToast('error', message);
    } finally {
      submitButton.disabled = false;
      submitButton.classList.remove('opacity-60', 'cursor-not-allowed');
    }
  });
}

interface TranslationSummaryCardConfig {
  familyId: string;
  requestedLocale: string;
  resolvedLocale: string;
  apiBasePath: string;
  quickCreate: TranslationFamilyQuickCreateHints;
  localeURLs: Record<string, string>;
}

function translationSummaryCardConfig(element: HTMLElement): TranslationSummaryCardConfig {
  return {
    familyId: asString(element.dataset.familyId),
    requestedLocale: asString(element.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: asString(element.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: asString(element.dataset.apiBasePath || '/admin/api'),
    quickCreate: normalizeQuickCreateHints(
      parseJSONValue<Record<string, unknown>>(element.dataset.quickCreate, {}),
      {}
    ),
    localeURLs: parseJSONValue<Record<string, string>>(element.dataset.localeUrls, {}),
  };
}

export function initTranslationSummaryCards(root: ParentNode = document): void {
  if (typeof document === 'undefined') return;
  root.querySelectorAll<HTMLElement>('[data-translation-summary-card="true"]').forEach((card) => {
    if (card.dataset.translationCreateBound === 'true') return;
    card.dataset.translationCreateBound = 'true';
    const config = translationSummaryCardConfig(card);
    const client = createTranslationFamilyClient({ basePath: config.apiBasePath });
    card.querySelectorAll<HTMLElement>('[data-action="create-locale"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const preferredLocale = asString(button.dataset.locale).toLowerCase() || config.quickCreate.recommendedLocale;
        openCreateLocaleDialog({
          familyId: config.familyId,
          quickCreate: config.quickCreate,
          initialLocale: preferredLocale,
          heading: `Create ${preferredLocale.toUpperCase() || config.quickCreate.recommendedLocale.toUpperCase()} locale`,
          onSubmit: (input) => client.createLocale(config.familyId, input),
          onSuccess: async (result) => {
            globalToast('success', `${result.locale.toUpperCase()} locale created.`);
            const preferEdit = typeof window !== 'undefined' && window.location.pathname.endsWith('/edit');
            const target = resolveCreateLocaleNavigationTarget(result, config.localeURLs, config.requestedLocale, preferEdit);
            if (target && typeof window !== 'undefined') {
              window.location.href = target;
              return;
            }
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          },
        });
      });
    });
  });
}

function selectedLocaleAssignmentKey(root: HTMLElement, trigger: HTMLElement): string {
  const explicit = asString(trigger.dataset.localeAssignmentKey).toLowerCase();
  if (explicit) return explicit;
  if (asString(trigger.dataset.localeAssignmentSource) === 'empty-panel') {
    const select = root.querySelector<HTMLSelectElement>('[data-family-assignment-locale-select="true"]');
    return asString(select?.value).toLowerCase();
  }
  return '';
}

function assignmentActionForKind(
  localeAssignment: TranslationFamilyLocaleAssignment,
  kind: 'self' | 'user' | 'claim'
): TranslationFamilyAssignmentActionState {
  switch (kind) {
    case 'self':
      return localeAssignment.actions.assignToMe;
    case 'user':
      return localeAssignment.actions.assignToUser;
    case 'claim':
      return localeAssignment.actions.claim;
  }
}

function assigneeInputForAction(root: HTMLElement, key: string, trigger: HTMLElement): HTMLInputElement | null {
  if (asString(trigger.dataset.localeAssignmentSource) === 'empty-panel') {
    return root.querySelector<HTMLInputElement>('[data-family-assignee-input="__empty_panel__"]');
  }
  for (const input of Array.from(root.querySelectorAll<HTMLInputElement>('[data-family-assignee-input]'))) {
    if (asString(input.dataset.familyAssigneeInput).toLowerCase() === key) return input;
  }
  return null;
}

export async function initTranslationFamilyDetailPage(
  root: HTMLElement | null,
  options: TranslationFamilyDetailRenderOptions & {
    endpoint?: string;
    fetch?: typeof fetch;
  } = {}
): Promise<TranslationFamilyDetailLoadState | null> {
  if (!root) return null;
  const dataset = root.dataset || {};
  const endpoint = asString(options.endpoint || dataset.endpoint);
  const renderOptions: TranslationFamilyDetailRenderOptions = {
    basePath: asString(options.basePath || dataset.basePath || '/admin'),
    contentBasePath: asString(options.contentBasePath || dataset.contentBasePath),
  };

  renderTranslationFamilyDetailPage(root, { status: 'loading' }, renderOptions);
  const state = await fetchTranslationFamilyDetailState(endpoint, { fetch: options.fetch });
  renderTranslationFamilyDetailPage(root, state, renderOptions);
  const channel = translationFamilyDetailChannel(endpoint);

  if (typeof (root as HTMLElement).querySelector === 'function') {
    if (state.status === 'ready' && state.detail) {
      const apiBasePath = `${trimTrailingSlash(renderOptions.basePath || '/admin')}/api`;
      const client = createTranslationFamilyClient({ basePath: apiBasePath, fetch: options.fetch });
      (root as HTMLElement).querySelectorAll<HTMLElement>('[data-family-create-locale="true"]').forEach((button) => {
        if (button.dataset.translationCreateBound === 'true') return;
        button.dataset.translationCreateBound = 'true';
        button.addEventListener('click', (event) => {
          event.preventDefault();
          const detail = state.detail;
          if (!detail) {
            globalToast('error', 'Translation family detail is unavailable.');
            return;
          }
          if (button.getAttribute('aria-disabled') === 'true') {
            globalToast('warning', detail.quickCreate.disabledReason || 'Locale creation is unavailable.');
            return;
          }
          const locale = asString(button.dataset.locale).toLowerCase() || detail.quickCreate.recommendedLocale || '';
          const quickCreate = quickCreateHintsForFamilyLocale(detail, locale);
          openCreateLocaleDialog({
            familyId: detail.familyId,
            quickCreate,
            initialLocale: locale,
            heading: `Create ${locale.toUpperCase()} locale`,
            onSubmit: (input) => client.createLocale(detail.familyId, { ...input, channel }),
            onSuccess: async (result) => {
              globalToast('success', `${result.locale.toUpperCase()} locale created.`);
              await initTranslationFamilyDetailPage(root as HTMLElement, { ...options, ...renderOptions, endpoint });
            },
          });
        });
      });

      const runLocaleAssignmentAction = async (
        button: HTMLButtonElement,
        kind: 'self' | 'user' | 'claim'
      ): Promise<void> => {
        const detail = state.detail;
        if (!detail) {
          globalToast('error', 'Translation family detail is unavailable.');
          return;
        }
        const key = selectedLocaleAssignmentKey(root as HTMLElement, button);
        const localeAssignment = key ? detail.localeAssignments[key] : null;
        if (!localeAssignment) {
          globalToast('error', 'Assignment action metadata is unavailable.');
          return;
        }
        const action = assignmentActionForKind(localeAssignment, kind);
        if (!action.enabled) {
          globalToast('warning', action.reason || 'Assignment action is unavailable.');
          return;
        }
        const payload: Record<string, unknown> = {};
        if (kind === 'user') {
          const input = assigneeInputForAction(root as HTMLElement, key, button);
          const assigneeID = asString(input?.value);
          if (!assigneeID) {
            globalToast('warning', 'Assignee ID is required.');
            input?.focus();
            return;
          }
          payload.assignee_id = assigneeID;
        }
        if (kind !== 'claim' && channel) {
          payload.channel = channel;
        }
        button.disabled = true;
        button.classList.add('opacity-60', 'cursor-not-allowed');
        try {
          await postTranslationFamilyAssignmentAction(action, payload, { fetch: options.fetch });
          globalToast('success', kind === 'claim' ? 'Assignment claimed.' : 'Assignment updated.');
          await initTranslationFamilyDetailPage(root as HTMLElement, { ...options, ...renderOptions, endpoint });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update assignment.';
          globalToast('error', message);
          button.disabled = false;
          button.classList.remove('opacity-60', 'cursor-not-allowed');
        }
      };

      (root as HTMLElement).querySelectorAll<HTMLButtonElement>('[data-family-assign-to-me="true"]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          void runLocaleAssignmentAction(button, 'self');
        });
      });
      (root as HTMLElement).querySelectorAll<HTMLButtonElement>('[data-family-assign-to-user="true"]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          void runLocaleAssignmentAction(button, 'user');
        });
      });
      (root as HTMLElement).querySelectorAll<HTMLButtonElement>('[data-family-claim-assignment="true"]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          void runLocaleAssignmentAction(button, 'claim');
        });
      });
    }
    const attachRetryButton = () => {
      const retryButton = (root as HTMLElement).querySelector<HTMLButtonElement>('.ui-state-retry-btn');
      if (!retryButton) return;
      retryButton.addEventListener('click', () => {
        void initTranslationFamilyDetailPage(root as HTMLElement, { ...options, ...renderOptions, endpoint });
      });
    };
    attachRetryButton();
    const syncButton = (root as HTMLElement).querySelector<HTMLButtonElement>('[data-family-sync-action="true"]');
    if (syncButton && state.syncRecovery?.canSync) {
      syncButton.addEventListener('click', async (event) => {
        event.preventDefault();
        syncButton.disabled = true;
        syncButton.classList.add('opacity-60', 'cursor-not-allowed');
        try {
          const recovery = state.syncRecovery;
          if (!recovery) return;
          await dispatchTranslationFamilySync(recovery, {
            fetch: options.fetch,
            correlationId: state.requestId || '',
          });
          const refreshed = await fetchTranslationFamilyDetailState(endpoint, { fetch: options.fetch });
          if (refreshed.status === 'error' && (refreshed.errorCode === 'NOT_FOUND' || refreshed.statusCode === 404)) {
            renderTranslationFamilyDetailPage(root as HTMLElement, {
              ...refreshed,
              syncRecovery: recovery,
              syncStatus: 'completed',
              syncMessage: 'Sync completed; family detail still returned NOT_FOUND.',
            }, renderOptions);
            attachRetryButton();
            return;
          }
          if (refreshed.status !== 'ready') {
            const message = refreshed.message || 'Sync completed, but family detail reload failed.';
            renderTranslationFamilyDetailPage(root as HTMLElement, {
              ...refreshed,
              syncRecovery: recovery,
              syncStatus: 'failed',
              syncMessage: message,
            }, renderOptions);
            attachRetryButton();
            globalToast('error', message);
            return;
          }
          globalToast('success', 'Translation families synced.');
          await initTranslationFamilyDetailPage(root as HTMLElement, { ...options, ...renderOptions, endpoint });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to sync translation families.';
          const feedback = (root as HTMLElement).querySelector<HTMLElement>('[data-family-sync-feedback="true"]');
          if (feedback) {
            feedback.hidden = false;
            feedback.textContent = message;
          }
          syncButton.disabled = false;
          syncButton.classList.remove('opacity-60', 'cursor-not-allowed');
          globalToast('error', message);
        }
      });
    }
  }

  return state;
}

export function createTranslationFamilyClient(options: TranslationFamilyClientOptions = {}): TranslationFamilyClient {
  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!fetchImpl) {
    throw new Error('translation-family client requires fetch');
  }
  const basePath = trimTrailingSlash(options.basePath || '/admin/api');

  async function readTranslationFamilyClientRecord(response: Response): Promise<Record<string, unknown>> {
    return readHTTPJSON<Record<string, unknown>>(response);
  }

  return {
    async list(filters = {}) {
      const response = await fetchImpl(buildFamilyListURL(basePath, filters), {
        headers: { Accept: 'application/json' },
      });
      const payload = await readTranslationFamilyClientRecord(response);
      return normalizeFamilyListResponse(payload);
    },

    async detail(familyId, channel = '') {
      const response = await fetchImpl(buildFamilyDetailURL(basePath, familyId, channel), {
        headers: { Accept: 'application/json' },
      });
      const payload = await readTranslationFamilyClientRecord(response);
      return normalizeFamilyDetail(payload);
    },

    async createLocale(familyId, input = {}) {
      const action = createTranslationCreateLocaleActionModel({
        ...input,
        familyId,
        basePath,
      });
      const headers = new Headers(action.headers);
      const init: RequestInit = {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify(serializeCreateLocaleRequest(action.request)),
      };
      appendCSRFHeader(action.endpoint, init, headers);
      const response = await fetchImpl(action.endpoint, init);
      if (!response.ok) {
        throw await createLocaleErrorFromResponse(response);
      }
      const payload = await readTranslationFamilyClientRecord(response);
      return normalizeCreateLocaleResult(payload);
    },

    async createAssignment(familyId, input = {}) {
      const request = createTranslationFamilyAssignmentRequest(input);
      const endpoint = buildFamilyAssignmentURL(basePath, familyId, request.channel);
      const headers = new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      });
      if (request.idempotencyKey) {
        headers.set('X-Idempotency-Key', request.idempotencyKey);
      }
      const init: RequestInit = {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify(serializeFamilyAssignmentRequest(request)),
      };
      appendCSRFHeader(endpoint, init, headers);
      const response = await fetchImpl(endpoint, init);
      if (!response.ok) {
        throw await assignmentActionErrorFromResponse(response);
      }
      return readTranslationFamilyClientRecord(response);
    },
  };
}
