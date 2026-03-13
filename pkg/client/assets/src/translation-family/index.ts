import { escapeAttribute, escapeHTML } from '../shared/html.js';
import { httpRequest } from '../shared/transport/http-client.js';
import { extractStructuredError } from '../toast/error-helpers.js';

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
  sourceLocale: string;
  targetLocale: string;
  workScope: string;
  status: string;
  assigneeId: string;
  reviewerId: string;
  priority: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
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
  environment: string;
}

export interface TranslationFamilyFilters {
  contentType: string;
  readinessState: string;
  blockerCode: string;
  missingLocale: string;
  page: number;
  perPage: number;
  environment: string;
}

export interface ReadinessChip {
  state: FamilyReadinessState;
  label: string;
  tone: 'success' | 'warning';
}

export interface TranslationFamilyClient {
  list(filters?: Partial<TranslationFamilyFilters>): Promise<TranslationFamilyListResponse>;
  detail(familyId: string, environment?: string): Promise<TranslationFamilyDetail>;
  createLocale(familyId: string, input?: Partial<TranslationCreateLocaleRequest>): Promise<TranslationCreateLocaleResult>;
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
}

export interface TranslationFamilyDetailRenderOptions {
  basePath?: string;
  contentBasePath?: string;
}

export interface TranslationCreateLocaleError extends Error {
  statusCode?: number;
  textCode?: string | null;
  requestId?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

export interface TranslationCreateLocaleRequest {
  locale: string;
  autoCreateAssignment: boolean;
  assigneeId: string;
  priority: string;
  dueDate: string;
  environment: string;
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

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === '1';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function requestTraceID(headers: Headers): string {
  return asString(
    headers.get('x-trace-id') ||
      headers.get('x-correlation-id') ||
      headers.get('traceparent')
  );
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asString(entry))
    .filter((entry) => entry.length > 0);
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

function normalizeStringMap(value: unknown): Record<string, string> {
  const record = asRecord(value);
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(record)) {
    const normalized = asString(entry);
    if (key.trim() !== '' && normalized !== '') out[key] = normalized;
  }
  return out;
}

export function createFamilyFilters(input: Partial<TranslationFamilyFilters> = {}): TranslationFamilyFilters {
  return {
    contentType: asString(input.contentType),
    readinessState: asString(input.readinessState),
    blockerCode: asString(input.blockerCode),
    missingLocale: asString(input.missingLocale),
    page: Math.max(1, asNumber(input.page, 1)),
    perPage: Math.max(1, asNumber(input.perPage, 50)),
    environment: asString(input.environment),
  };
}

export function buildFamilyListQuery(input: Partial<TranslationFamilyFilters> = {}): URLSearchParams {
  const filters = createFamilyFilters(input);
  const params = new URLSearchParams();
  if (filters.contentType) params.set('content_type', filters.contentType);
  if (filters.readinessState) params.set('readiness_state', filters.readinessState);
  if (filters.blockerCode) params.set('blocker_code', filters.blockerCode);
  if (filters.missingLocale) params.set('missing_locale', filters.missingLocale);
  if (filters.environment) params.set('environment', filters.environment);
  params.set('page', String(filters.page));
  params.set('per_page', String(filters.perPage));
  return params;
}

export function buildFamilyListURL(basePath: string, filters: Partial<TranslationFamilyFilters> = {}): string {
  const path = `${trimTrailingSlash(basePath)}/translations/families`;
  const query = buildFamilyListQuery(filters).toString();
  return query ? `${path}?${query}` : path;
}

export function buildFamilyDetailURL(basePath: string, familyId: string, environment = ''): string {
  const id = encodeURIComponent(asString(familyId));
  const path = `${trimTrailingSlash(basePath)}/translations/families/${id}`;
  const query = new URLSearchParams();
  if (asString(environment)) query.set('environment', asString(environment));
  const encoded = query.toString();
  return encoded ? `${path}?${encoded}` : path;
}

export function createTranslationCreateLocaleRequest(
  input: Partial<TranslationCreateLocaleRequest> = {}
): TranslationCreateLocaleRequest {
  return {
    locale: asString(input.locale).toLowerCase(),
    autoCreateAssignment: asBoolean(input.autoCreateAssignment),
    assigneeId: asString(input.assigneeId),
    priority: asString(input.priority).toLowerCase(),
    dueDate: asString(input.dueDate),
    environment: asString(input.environment),
    idempotencyKey: asString(input.idempotencyKey),
  };
}

export function buildCreateLocaleURL(basePath: string, familyId: string, environment = ''): string {
  const id = encodeURIComponent(asString(familyId));
  const path = `${trimTrailingSlash(basePath)}/translations/families/${id}/variants`;
  const query = new URLSearchParams();
  if (asString(environment)) query.set('environment', asString(environment));
  const encoded = query.toString();
  return encoded ? `${path}?${encoded}` : path;
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
  if (request.environment) payload.environment = request.environment;

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
    endpoint: buildCreateLocaleURL(asString(input.basePath) || '/admin/api', familyId, request.environment),
    headers,
    request,
  };
}

export function normalizeFamilyListRow(input: Record<string, unknown>): TranslationFamilyListItem {
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
    environment: asString(summary.environment),
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
    fields: normalizeStringMap(input.fields),
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

function normalizeAssignment(input: Record<string, unknown>): TranslationFamilyAssignment {
  return {
    id: asString(input.id),
    familyId: asString(input.family_id),
    variantId: asString(input.variant_id),
    sourceLocale: asString(input.source_locale),
    targetLocale: asString(input.target_locale),
    workScope: asString(input.work_scope),
    status: asString(input.status),
    assigneeId: asString(input.assignee_id),
    reviewerId: asString(input.reviewer_id),
    priority: asString(input.priority),
    dueDate: asString(input.due_date),
    createdAt: asString(input.created_at),
    updatedAt: asString(input.updated_at),
  };
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
      sourceLocale: detail.sourceLocale,
      targetLocale: result.assignment.targetLocale || locale,
      workScope: result.assignment.workScope || detail.quickCreate.defaultAssignment.workScope,
      status: result.assignment.status,
      assigneeId: result.assignment.assigneeId,
      reviewerId: '',
      priority: result.assignment.priority,
      dueDate: result.assignment.dueDate,
      createdAt: '',
      updatedAt: '',
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
    next.translation_group_id ||
    readiness.family_id ||
    readiness.translation_group_id
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

function formatTimestamp(value: string): string {
  const normalized = asString(value);
  if (!normalized) return '';
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return parsed.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function sentenceCase(value: string): string {
  const normalized = asString(value).replace(/_/g, ' ');
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function variantTone(status: string): string {
  switch (asString(status)) {
    case 'published':
    case 'approved':
      return 'bg-emerald-100 text-emerald-700';
    case 'in_review':
      return 'bg-amber-100 text-amber-700';
    case 'in_progress':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function assignmentTone(status: string): string {
  switch (asString(status)) {
    case 'in_review':
      return 'bg-amber-100 text-amber-700';
    case 'in_progress':
    case 'assigned':
      return 'bg-sky-100 text-sky-700';
    case 'changes_requested':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function blockerTone(code: string): string {
  switch (asString(code)) {
    case 'missing_locale':
      return 'bg-rose-100 text-rose-700';
    case 'missing_field':
      return 'bg-amber-100 text-amber-700';
    case 'pending_review':
      return 'bg-sky-100 text-sky-700';
    case 'outdated_source':
      return 'bg-violet-100 text-violet-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
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
          : `Variant entered ${sentenceCase(variant.status)} state.`,
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
      title: `${assignment.targetLocale.toUpperCase()} assignment ${sentenceCase(assignment.status)}`,
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
        <div class="rounded-xl border border-gray-200 bg-white p-4">
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
    const disabled = !detail.quickCreate.enabled;
    return `
      <button
        type="button"
        class="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${
          disabled
            ? 'cursor-not-allowed bg-gray-200 text-gray-500'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }"
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
    const openLink = href
      ? `<a href="${escapeAttribute(href)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>`
      : `<span class="text-sm text-gray-400">No content route</span>`;
    const title = variant.fields.title || variant.fields.slug || `${detail.contentType} ${variant.locale.toUpperCase()}`;
    return `
      <li class="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${escapeHTML(variant.locale.toUpperCase())}</span>
            ${variant.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ''}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${variantTone(variant.status)}">${escapeHTML(sentenceCase(variant.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${escapeHTML(title)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${escapeHTML(formatTimestamp(variant.updatedAt || variant.createdAt)) || 'n/a'}</p>
        </div>
        <div class="flex-shrink-0">${openLink}</div>
      </li>
    `;
  });

  for (const locale of missingLocales) {
    rows.push(`
      <li class="flex items-start justify-between gap-4 rounded-xl border border-dashed border-rose-300 bg-rose-50 p-4">
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
    <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-locales">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 id="translation-family-locales" class="text-lg font-semibold text-gray-900">Locale coverage</h2>
          <p class="mt-1 text-sm text-gray-500">Server-authored locale availability and variant state for this family.</p>
        </div>
      </div>
      <ul class="mt-5 space-y-3" role="list">
        ${rows.join('') || '<li class="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">No locale variants available.</li>'}
      </ul>
    </section>
  `;
}

function renderAssignmentPanel(detail: TranslationFamilyDetail): string {
  if (!detail.activeAssignments.length) {
    return `
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
      </section>
    `;
  }

  return `
    <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${detail.activeAssignments
          .map((assignment) => {
            const dueState = deriveDueState(assignment.dueDate);
            const dueLabel = dueState === 'none' ? 'No due date' : sentenceCase(dueState);
            const dueTone =
              dueState === 'overdue'
                ? 'bg-rose-100 text-rose-700'
                : dueState === 'due_soon'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-700';
            return `
              <li class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-gray-900">${escapeHTML(assignment.targetLocale.toUpperCase())}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${assignmentTone(assignment.status)}">${escapeHTML(sentenceCase(assignment.status))}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${dueTone}">${escapeHTML(dueLabel)}</span>
                </div>
                <p class="mt-2 text-sm text-gray-600">
                  ${escapeHTML(assignment.assigneeId || 'Unassigned')}
                  <span class="text-gray-400">·</span>
                  Priority ${escapeHTML(assignment.priority || 'normal')}
                </p>
                <p class="mt-1 text-xs text-gray-500">Updated ${escapeHTML(formatTimestamp(assignment.updatedAt || assignment.createdAt)) || 'n/a'}</p>
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
            <li class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium ${blockerTone(blocker.blockerCode)}">${escapeHTML(sentenceCase(blocker.blockerCode))}</span>
              ${scope ? `<span class="text-sm text-gray-600">${escapeHTML(scope)}</span>` : ''}
            </li>
          `;
        })
        .join('')
    : '<li class="text-sm text-gray-500">No blockers recorded.</li>';

  return `
    <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${detail.publishGate.allowed ? 'border border-emerald-200 bg-emerald-50' : 'border border-amber-200 bg-amber-50'} p-4">
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
      <div class="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Blockers</h3>
          <ul class="mt-3 space-y-2" role="list">${blockers}</ul>
        </div>
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Policy</h3>
          <ul class="mt-3 space-y-2 text-sm text-gray-600" role="list">
            <li>Review required: <strong class="text-gray-900">${detail.publishGate.reviewRequired ? 'Yes' : 'No'}</strong></li>
            <li>Override allowed: <strong class="text-gray-900">${detail.publishGate.overrideAllowed ? 'Yes' : 'No'}</strong></li>
            <li>Available locales: <strong class="text-gray-900">${escapeHTML(detail.readinessSummary.availableLocales.join(', ') || 'None')}</strong></li>
          </ul>
        </div>
      </div>
    </section>
  `;
}

function renderActivityPanel(detail: TranslationFamilyDetail): string {
  const items = buildFamilyActivityPreview(detail);
  return `
    <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${
        items.length
          ? `<ol class="mt-5 space-y-3" role="list">
              ${items
                .map(
                  (item) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${escapeHTML(item.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.tone === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.tone === 'warning'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                        }">${escapeHTML(formatTimestamp(item.timestamp))}</span>
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
    <div class="flex items-center justify-center py-16" aria-busy="true" aria-label="Loading">
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
      <div class="max-w-md rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
        <h2 class="text-lg font-semibold text-gray-900">${escapeHTML(title)}</h2>
        <p class="mt-2 text-sm text-gray-500">${escapeHTML(message)}</p>
      </div>
    </div>
  `;
}

function renderFamilyErrorState(title: string, message: string): string {
  return `
    <div class="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
      <h2 class="text-lg font-semibold text-rose-900">${escapeHTML(title)}</h2>
      <p class="mt-2 text-sm text-rose-700">${escapeHTML(message)}</p>
      <button type="button" class="ui-state-retry-btn mt-4 inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm ring-1 ring-inset ring-rose-200 hover:bg-rose-100">
        Reload family detail
      </button>
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
        ${renderFamilyErrorState(title, message)}
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
    ? detail.readinessSummary.blockerCodes.map(sentenceCase).join(', ')
    : 'No blockers';
  const quickCreateDisabled = !detail.quickCreate.enabled;
  const createLocaleCTA = detail.quickCreate.recommendedLocale
    ? `
      <button
        type="button"
        class="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${
          quickCreateDisabled
            ? 'cursor-not-allowed bg-gray-200 text-gray-500'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }"
        data-family-create-locale="true"
        data-locale="${escapeAttribute(detail.quickCreate.recommendedLocale)}"
        ${quickCreateDisabled ? 'aria-disabled="true"' : ''}
        title="${escapeAttribute(quickCreateDisabled ? detail.quickCreate.disabledReason || 'Locale creation is unavailable.' : `Create ${detail.quickCreate.recommendedLocale.toUpperCase()} locale`)}"
      >
        Create ${escapeHTML(detail.quickCreate.recommendedLocale.toUpperCase())}
      </button>
    `
    : '';

  return `
    <div class="translation-family-detail space-y-6" data-family-id="${escapeAttribute(detail.familyId)}" data-readiness-state="${escapeAttribute(detail.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Translation family</p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight text-gray-900">${escapeHTML(sourceTitle)}</h1>
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
      return {
        status: response.status === 409 ? 'conflict' : 'error',
        message: structured.message,
        requestId,
        traceId,
        statusCode: response.status,
        errorCode: structured.textCode,
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

export function renderTranslationFamilyDetailPage(
  root: HTMLElement | { innerHTML: string; dataset?: DOMStringMap | Record<string, string | undefined> },
  state: TranslationFamilyDetailLoadState,
  options: TranslationFamilyDetailRenderOptions = {}
): void {
  root.innerHTML = renderTranslationFamilyDetailState(state, options);
}

function globalToast(kind: 'success' | 'error' | 'warning' | 'info', message: string): void {
  const manager = (globalThis as { toastManager?: Record<string, (input: string) => void> }).toastManager;
  const handler = manager?.[kind];
  if (typeof handler === 'function') {
    handler(message);
  }
}

function parseJSONAttribute<T>(value: string, fallback: T): T {
  const normalized = asString(value);
  if (!normalized) return fallback;
  try {
    return JSON.parse(normalized) as T;
  } catch {
    return fallback;
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
  overlay.className = 'fixed inset-0 z-[80] flex items-center justify-center bg-gray-900/50 p-4';
  overlay.setAttribute('data-translation-create-locale-modal', 'true');
  overlay.innerHTML = `
    <div class="w-full max-w-xl rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${escapeHTML(config.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${escapeHTML(config.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-200">Close</button>
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
          <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <p><strong>Required for publish:</strong> ${escapeHTML(quickCreate.requiredForPublish.join(', ') || 'None')}</p>
            <p class="mt-2"><strong>Recommended locale:</strong> ${escapeHTML(quickCreate.recommendedLocale.toUpperCase() || 'N/A')}</p>
            <p class="mt-2"><strong>Default work scope:</strong> ${escapeHTML(quickCreate.defaultAssignment.workScope || '__all__')}</p>
          </div>
          <label class="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
            <input type="checkbox" name="auto_create_assignment" class="h-4 w-4 rounded border-gray-300 text-sky-600" ${quickCreate.defaultAssignment.autoCreateAssignment ? 'checked' : ''}>
            <span class="text-sm text-gray-800">Seed an assignment now</span>
          </label>
          <div data-assignment-fields="true" class="grid gap-4 rounded-2xl border border-gray-200 p-4">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Assignee</span>
              <input type="text" name="assignee_id" value="${escapeAttribute(quickCreate.defaultAssignment.assigneeId)}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Priority</span>
              <select name="priority" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                ${['low', 'normal', 'high', 'urgent'].map((priority) => `
                  <option value="${priority}" ${priority === (quickCreate.defaultAssignment.priority || 'normal') ? 'selected' : ''}>${sentenceCase(priority)}</option>
                `).join('')}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${escapeAttribute(toDateTimeLocalInputValue(quickCreate.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">Cancel</button>
          <button type="submit" class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">${escapeHTML(config.submitLabel || 'Create locale')}</button>
        </div>
      </form>
    </div>
  `;
  doc.body.appendChild(overlay);

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
    overlay.remove();
  };
  const syncAssignmentFields = (): void => {
    if (!assignmentFields || !autoCreateAssignmentField) return;
    assignmentFields.hidden = !autoCreateAssignmentField.checked;
  };

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
    familyId: asString(element.dataset.translationGroupId),
    requestedLocale: asString(element.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: asString(element.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: asString(element.dataset.apiBasePath || '/admin/api'),
    quickCreate: normalizeQuickCreateHints(
      parseJSONAttribute<Record<string, unknown>>(element.dataset.quickCreate || '', {}),
      {}
    ),
    localeURLs: parseJSONAttribute<Record<string, string>>(element.dataset.localeUrls || '', {}),
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
          openCreateLocaleDialog({
            familyId: detail.familyId,
            quickCreate: detail.quickCreate,
            initialLocale: locale,
            heading: `Create ${locale.toUpperCase()} locale`,
            onSubmit: (input) => client.createLocale(detail.familyId, input),
            onSuccess: async (result) => {
              globalToast('success', `${result.locale.toUpperCase()} locale created.`);
              await initTranslationFamilyDetailPage(root as HTMLElement, { ...options, ...renderOptions, endpoint });
            },
          });
        });
      });
    }
    const retryButton = (root as HTMLElement).querySelector<HTMLButtonElement>('.ui-state-retry-btn');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        void initTranslationFamilyDetailPage(root as HTMLElement, { ...options, ...renderOptions, endpoint });
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

  return {
    async list(filters = {}) {
      const response = await fetchImpl(buildFamilyListURL(basePath, filters), {
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json() as Record<string, unknown>;
      return normalizeFamilyListResponse(payload);
    },

    async detail(familyId, environment = '') {
      const response = await fetchImpl(buildFamilyDetailURL(basePath, familyId, environment), {
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json() as Record<string, unknown>;
      return normalizeFamilyDetail(payload);
    },

    async createLocale(familyId, input = {}) {
      const action = createTranslationCreateLocaleActionModel({
        ...input,
        familyId,
        basePath,
      });
      const response = await fetchImpl(action.endpoint, {
        method: 'POST',
        headers: action.headers,
        body: JSON.stringify(serializeCreateLocaleRequest(action.request)),
      });
      if (!response.ok) {
        throw await createLocaleErrorFromResponse(response);
      }
      const payload = await response.json() as Record<string, unknown>;
      return normalizeCreateLocaleResult(payload);
    },
  };
}

function trimTrailingSlash(value: string): string {
  const trimmed = asString(value);
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}
