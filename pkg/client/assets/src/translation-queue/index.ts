import { renderVocabularyStatusBadge } from '../datatable/translation-status-vocabulary.js';
import {
  type TranslationActionState,
} from '../translation-contracts/index.js';
import { httpRequest, readHTTPError } from '../shared/transport/http-client.js';
import { extractStructuredError, type StructuredError } from '../toast/error-helpers.js';
import { escapeHTML as escapeHtml } from '../shared/html.js';
import { escapeAttribute as escapeAttr } from '../shared/html.js';
import {
  BTN_PRIMARY_SM,
  BTN_SECONDARY_SM,
  BTN_DANGER_SM,
  HEADER_TITLE,
  HEADER_PRETITLE,
  HEADER_DESCRIPTION,
  EMPTY_STATE,
  EMPTY_STATE_TITLE,
  EMPTY_STATE_TEXT,
  ERROR_STATE,
  ERROR_STATE_TITLE,
  ERROR_STATE_TEXT,
  LOADING_STATE,
  MOBILE_CARD,
  MOBILE_CARD_HEADER,
  MOBILE_CARD_TITLE,
  MOBILE_CARD_SUBTITLE,
  MOBILE_CARD_BODY,
  MOBILE_CARD_ROW,
  MOBILE_CARD_LABEL,
  MOBILE_CARD_VALUE,
  MOBILE_CARD_ACTIONS,
} from '../translation-shared/index.js';

export type AssignmentDueState = 'none' | 'on_track' | 'due_soon' | 'overdue';
export type AssignmentQueueState =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'archived';
export type AssignmentPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AssignmentQueueReviewState = 'qa_blocked';
export type AssignmentSortKey =
  | 'updated_at'
  | 'created_at'
  | 'due_date'
  | 'due_state'
  | 'status'
  | 'locale'
  | 'priority'
  | 'assignee_id'
  | 'reviewer_id';

export interface AssignmentListFilters {
  status?: string;
  assigneeId?: string;
  reviewerId?: string;
  dueState?: AssignmentDueState;
  locale?: string;
  priority?: string;
  reviewState?: AssignmentQueueReviewState;
  familyId?: string;
}

export interface AssignmentQueueSavedFilterQuery {
  status?: string;
  assignee_id?: string;
  reviewer_id?: string;
  due_state?: string;
  locale?: string;
  priority?: string;
  family_id?: string;
  sort?: AssignmentSortKey;
  order?: 'asc' | 'desc';
}

export interface AssignmentQueueSavedFilterPreset {
  id: string;
  label: string;
  description?: string;
  review_state?: AssignmentQueueReviewState;
  query: AssignmentQueueSavedFilterQuery;
}

export interface AssignmentListQueryState extends AssignmentListFilters {
  page?: number;
  perPage?: number;
  sort?: AssignmentSortKey;
  order?: 'asc' | 'desc';
}

export interface AssignmentActionStates {
  claim: TranslationActionState;
  release: TranslationActionState;
}

export interface AssignmentReviewActionStates {
  submit_review: TranslationActionState;
  approve: TranslationActionState;
  reject: TranslationActionState;
  archive: TranslationActionState;
}

export interface AssignmentReviewFeedback {
  last_rejection_reason?: string;
  last_reviewer_id?: string;
}

export interface AssignmentQASummary {
  enabled: boolean;
  warning_count: number;
  blocker_count: number;
  finding_count: number;
}

export interface AssignmentListRow {
  id: string;
  family_id: string;
  entity_type: string;
  source_record_id: string;
  target_record_id: string;
  source_locale: string;
  target_locale: string;
  work_scope?: string;
  source_title: string;
  source_path: string;
  assignee_id: string;
  reviewer_id: string;
  assignment_type: string;
  content_state: string;
  queue_state: AssignmentQueueState;
  status: AssignmentQueueState;
  priority: AssignmentPriority;
  due_state: AssignmentDueState;
  due_date?: string;
  row_version: number;
  version: number;
  updated_at: string;
  created_at: string;
  actions: AssignmentActionStates;
  review_actions: AssignmentReviewActionStates;
  last_rejection_reason?: string;
  review_feedback?: AssignmentReviewFeedback;
  qa_summary?: AssignmentQASummary;
}

export interface AssignmentListMeta {
  page: number;
  per_page: number;
  total: number;
  updated_at?: string;
  supported_sort_keys: AssignmentSortKey[];
  default_sort: {
    key: AssignmentSortKey;
    order: 'asc' | 'desc';
  };
  saved_filter_presets: AssignmentQueueSavedFilterPreset[];
  saved_review_filter_presets: AssignmentQueueSavedFilterPreset[];
  default_review_filter_preset?: string;
  review_actor_id?: string;
  review_aggregate_counts: Record<string, number>;
}

export interface AssignmentListResponse {
  meta: AssignmentListMeta;
  data: AssignmentListRow[];
}

export interface AssignmentActionResponseData {
  assignment_id: string;
  status: AssignmentQueueState;
  row_version: number;
  updated_at: string;
  assignment: AssignmentListRow;
}

export interface AssignmentActionResponse {
  data: AssignmentActionResponseData;
  meta: {
    idempotency_hit?: boolean;
  };
}

export interface AssignmentActionRequest {
  expected_version: number;
  idempotency_key?: string;
  reason?: string;
}

export interface AssignmentQueueScreenConfig {
  endpoint: string;
  editorBasePath?: string;
  title?: string;
  description?: string;
  initialPresetId?: string;
}

export type AssignmentQueueScreenState = 'loading' | 'ready' | 'empty' | 'error' | 'conflict';

export interface AssignmentQueueFeedback {
  kind: 'success' | 'error' | 'conflict';
  message: string;
  code?: string | null;
  requestId?: string;
  traceId?: string;
}

export class AssignmentQueueRequestError extends Error {
  status: number;
  code: string | null;
  metadata: Record<string, unknown> | null;
  requestId?: string;
  traceId?: string;

  constructor(input: {
    message: string;
    status: number;
    code?: string | null;
    metadata?: Record<string, unknown> | null;
    requestId?: string;
    traceId?: string;
  }) {
    super(input.message);
    this.name = 'AssignmentQueueRequestError';
    this.status = input.status;
    this.code = input.code ?? null;
    this.metadata = input.metadata ?? null;
    this.requestId = input.requestId;
    this.traceId = input.traceId;
  }
}

export const DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS: AssignmentQueueSavedFilterPreset[] = [
  {
    id: 'mine',
    label: 'Mine',
    description: 'Assignments currently assigned to the active actor.',
    query: { assignee_id: '__me__', sort: 'due_date', order: 'asc' },
  },
  {
    id: 'open',
    label: 'Open',
    description: 'Claimable or active assignments that still need translator work.',
    query: { status: 'open,assigned,in_progress,changes_requested', sort: 'updated_at', order: 'desc' },
  },
  {
    id: 'needs_review',
    label: 'Needs Review',
    description: 'Assignments awaiting review for the active actor.',
    query: { status: 'in_review', reviewer_id: '__me__', sort: 'due_date', order: 'asc' },
  },
  {
    id: 'overdue',
    label: 'Overdue',
    description: 'Past-due assignments across the visible queue scope.',
    query: { due_state: 'overdue', sort: 'due_date', order: 'asc' },
  },
  {
    id: 'high_priority',
    label: 'High Priority',
    description: 'Assignments marked high or urgent.',
    query: { priority: 'high,urgent', sort: 'due_date', order: 'asc' },
  },
];

export const DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS: AssignmentQueueSavedFilterPreset[] = [
  {
    id: 'review_inbox',
    label: 'Review Inbox',
    description: 'Assignments currently waiting on the active reviewer.',
    query: { status: 'in_review', reviewer_id: '__me__', sort: 'due_date', order: 'asc' },
  },
  {
    id: 'review_overdue',
    label: 'Review Overdue',
    description: 'Reviewer-owned assignments that are already overdue.',
    query: { status: 'in_review', reviewer_id: '__me__', due_state: 'overdue', sort: 'due_date', order: 'asc' },
  },
  {
    id: 'review_blocked',
    label: 'QA Blocked',
    description: 'Reviewer inbox items with blocking QA findings.',
    review_state: 'qa_blocked',
    query: { status: 'in_review', reviewer_id: '__me__', sort: 'due_date', order: 'asc' },
  },
  {
    id: 'review_changes_requested',
    label: 'Changes Requested',
    description: 'Assignments the active reviewer already sent back for fixes.',
    query: { status: 'changes_requested', reviewer_id: '__me__', sort: 'updated_at', order: 'desc' },
  },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeActionState(value: unknown): TranslationActionState {
  const raw = asRecord(value);
  return {
    enabled: raw.enabled === true,
    reason: asString(raw.reason) || undefined,
    reason_code: asString(raw.reason_code) || undefined,
    permission: asString(raw.permission) || undefined,
  };
}

function normalizeReviewFeedback(value: unknown): AssignmentReviewFeedback | undefined {
  const raw = asRecord(value);
  const lastRejectionReason = asString(raw.last_rejection_reason);
  const lastReviewerID = asString(raw.last_reviewer_id);
  if (!lastRejectionReason && !lastReviewerID) return undefined;
  return {
    last_rejection_reason: lastRejectionReason || undefined,
    last_reviewer_id: lastReviewerID || undefined,
  };
}

function normalizeQASummary(value: unknown): AssignmentQASummary | undefined {
  const raw = asRecord(value);
  const enabled = raw.enabled === true;
  const warningCount = asNumber(raw.warning_count);
  const blockerCount = asNumber(raw.blocker_count);
  const findingCount = asNumber(raw.finding_count);
  if (!enabled && warningCount <= 0 && blockerCount <= 0 && findingCount <= 0) return undefined;
  return {
    enabled,
    warning_count: warningCount,
    blocker_count: blockerCount,
    finding_count: findingCount,
  };
}

function normalizeQueueState(value: unknown): AssignmentQueueState {
  switch (asString(value)) {
    case 'pending':
      return 'open';
    case 'review':
      return 'in_review';
    case 'rejected':
      return 'changes_requested';
    case 'published':
      return 'archived';
    case 'open':
    case 'assigned':
    case 'in_progress':
    case 'in_review':
    case 'changes_requested':
    case 'approved':
    case 'archived':
      return asString(value) as AssignmentQueueState;
    default:
      return 'open';
  }
}

function readResponseToken(response: Response, name: string): string {
  const value = response.headers.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function extractTraceMetadata(response: Response): { requestId?: string; traceId?: string } {
  const requestId = readResponseToken(response, 'x-request-id');
  const correlationId = readResponseToken(response, 'x-correlation-id');
  const traceId = readResponseToken(response, 'x-trace-id') || correlationId || undefined;
  return {
    requestId: requestId || undefined,
    traceId,
  };
}

async function readStructuredQueueError(response: Response, fallback: string): Promise<StructuredError> {
  if (typeof response.clone === 'function') {
    return extractStructuredError(response.clone());
  }
  const message = await readHTTPError(response, fallback);
  return {
    textCode: null,
    message,
    metadata: null,
    fields: null,
    validationErrors: null,
  };
}

async function buildQueueRequestError(response: Response, fallback: string): Promise<AssignmentQueueRequestError> {
  const structured = await readStructuredQueueError(response, fallback);
  const trace = extractTraceMetadata(response);
  return new AssignmentQueueRequestError({
    message: structured.message || `${fallback}: ${response.status}`,
    status: response.status,
    code: structured.textCode,
    metadata: structured.metadata,
    requestId: trace.requestId,
    traceId: trace.traceId,
  });
}

function normalizeSavedFilterPreset(value: unknown): AssignmentQueueSavedFilterPreset | null {
  const raw = asRecord(value);
  const id = asString(raw.id);
  const label = asString(raw.label);
  if (!id || !label) {
    return null;
  }
  const queryRaw = asRecord(raw.query);
  return {
    id,
    label,
    description: asString(raw.description) || undefined,
    review_state: (asString(raw.review_state) || undefined) as AssignmentQueueReviewState | undefined,
    query: {
      status: asString(queryRaw.status) || undefined,
      assignee_id: asString(queryRaw.assignee_id) || undefined,
      reviewer_id: asString(queryRaw.reviewer_id) || undefined,
      due_state: asString(queryRaw.due_state) || undefined,
      locale: asString(queryRaw.locale) || undefined,
      priority: asString(queryRaw.priority) || undefined,
      family_id: asString(queryRaw.family_id) || undefined,
      sort: (asString(queryRaw.sort) || undefined) as AssignmentSortKey | undefined,
      order: (asString(queryRaw.order) || undefined) as 'asc' | 'desc' | undefined,
    },
  };
}

function normalizeSavedFilterPresets(
  values: unknown,
  fallback: AssignmentQueueSavedFilterPreset[] = DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS
): AssignmentQueueSavedFilterPreset[] {
  const items = Array.isArray(values) ? values : [];
  const normalized = items
    .map((value) => normalizeSavedFilterPreset(value))
    .filter((value): value is AssignmentQueueSavedFilterPreset => value !== null);
  return normalized.length ? normalized : fallback.map(cloneSavedFilterPreset);
}

function cloneSavedFilterPreset(preset: AssignmentQueueSavedFilterPreset): AssignmentQueueSavedFilterPreset {
  return {
    id: preset.id,
    label: preset.label,
    description: preset.description,
    review_state: preset.review_state,
    query: { ...preset.query },
  };
}

function normalizeAggregateCounts(value: unknown): Record<string, number> {
  const raw = asRecord(value);
  const out: Record<string, number> = {};
  for (const [key, candidate] of Object.entries(raw)) {
    const normalized = asNumber(candidate);
    if (!key.trim()) continue;
    out[key.trim()] = normalized;
  }
  return out;
}

function uniqueFilterOptions(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => asString(value)).filter(Boolean)));
}

export function normalizeAssignmentListMeta(value: unknown): AssignmentListMeta {
  const raw = asRecord(value);
  const supportedSortKeys = Array.isArray(raw.supported_sort_keys)
    ? raw.supported_sort_keys
        .map((entry) => asString(entry))
        .filter((entry): entry is AssignmentSortKey => Boolean(entry))
    : [];
  const defaultSortRaw = asRecord(raw.default_sort);
  return {
    page: asNumber(raw.page) || 1,
    per_page: asNumber(raw.per_page) || 25,
    total: asNumber(raw.total),
    updated_at: asString(raw.updated_at) || undefined,
    supported_sort_keys: supportedSortKeys.length ? supportedSortKeys : [
      'updated_at',
      'created_at',
      'due_date',
      'due_state',
      'status',
      'locale',
      'priority',
      'assignee_id',
      'reviewer_id',
    ],
    default_sort: {
      key: (asString(defaultSortRaw.key) || 'updated_at') as AssignmentSortKey,
      order: (asString(defaultSortRaw.order) || 'desc') as 'asc' | 'desc',
    },
    saved_filter_presets: normalizeSavedFilterPresets(raw.saved_filter_presets, DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS),
    saved_review_filter_presets: normalizeSavedFilterPresets(raw.saved_review_filter_presets, DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS),
    default_review_filter_preset: asString(raw.default_review_filter_preset) || undefined,
    review_actor_id: asString(raw.review_actor_id) || undefined,
    review_aggregate_counts: normalizeAggregateCounts(raw.review_aggregate_counts),
  };
}

export function buildAssignmentListQuery(state: AssignmentListQueryState = {}): string {
  const params = new URLSearchParams();
  if (state.status) params.set('status', state.status);
  if (state.assigneeId) params.set('assignee_id', state.assigneeId);
  if (state.reviewerId) params.set('reviewer_id', state.reviewerId);
  if (state.dueState) params.set('due_state', state.dueState);
  if (state.locale) params.set('locale', state.locale);
  if (state.priority) params.set('priority', state.priority);
  if (state.reviewState) params.set('review_state', state.reviewState);
  if (state.familyId) params.set('family_id', state.familyId);
  if (state.page && state.page > 0) params.set('page', String(state.page));
  if (state.perPage && state.perPage > 0) params.set('per_page', String(state.perPage));
  if (state.sort) params.set('sort', state.sort);
  if (state.order) params.set('order', state.order);
  return params.toString();
}

export function buildAssignmentListURL(endpoint: string, state: AssignmentListQueryState = {}): string {
  const query = buildAssignmentListQuery(state);
  if (!query) return endpoint;
  return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${query}`;
}

export function normalizeAssignmentListRow(value: unknown): AssignmentListRow {
  const raw = asRecord(value);
  return {
    id: asString(raw.id),
    family_id: asString(raw.family_id),
    entity_type: asString(raw.entity_type),
    source_record_id: asString(raw.source_record_id),
    target_record_id: asString(raw.target_record_id),
    source_locale: asString(raw.source_locale),
    target_locale: asString(raw.target_locale),
    work_scope: asString(raw.work_scope) || undefined,
    source_title: asString(raw.source_title),
    source_path: asString(raw.source_path),
    assignee_id: asString(raw.assignee_id),
    reviewer_id: asString(raw.reviewer_id),
    assignment_type: asString(raw.assignment_type),
    content_state: asString(raw.content_state),
    queue_state: normalizeQueueState(raw.queue_state),
    status: normalizeQueueState(raw.status),
    priority: (asString(raw.priority) || 'normal') as AssignmentPriority,
    due_state: (asString(raw.due_state) || 'none') as AssignmentDueState,
    due_date: asString(raw.due_date) || undefined,
    row_version: asNumber(raw.row_version || raw.version),
    version: asNumber(raw.version || raw.row_version),
    updated_at: asString(raw.updated_at),
    created_at: asString(raw.created_at),
    actions: {
      claim: normalizeActionState(asRecord(raw.actions).claim),
      release: normalizeActionState(asRecord(raw.actions).release),
    },
    review_actions: {
      submit_review: normalizeActionState(asRecord(raw.review_actions).submit_review),
      approve: normalizeActionState(asRecord(raw.review_actions).approve),
      reject: normalizeActionState(asRecord(raw.review_actions).reject),
      archive: normalizeActionState(asRecord(raw.review_actions).archive),
    },
    last_rejection_reason: asString(raw.last_rejection_reason) || undefined,
    review_feedback: normalizeReviewFeedback(raw.review_feedback),
    qa_summary: normalizeQASummary(raw.qa_summary),
  };
}

export function normalizeAssignmentListResponse(value: unknown): AssignmentListResponse {
  const raw = asRecord(value);
  const data = Array.isArray(raw.data) ? raw.data : [];
  return {
    data: data.map((row) => normalizeAssignmentListRow(row)),
    meta: normalizeAssignmentListMeta(raw.meta),
  };
}

export function normalizeAssignmentActionResponse(value: unknown): AssignmentActionResponse {
  const raw = asRecord(value);
  const meta = asRecord(raw.meta);
  const data = asRecord(raw.data);
  return {
    data: {
      assignment_id: asString(data.assignment_id),
      status: normalizeQueueState(data.status),
      row_version: asNumber(data.row_version),
      updated_at: asString(data.updated_at),
      assignment: normalizeAssignmentListRow(data.assignment),
    },
    meta: {
      idempotency_hit: meta.idempotency_hit === true,
    },
  };
}

export async function fetchAssignmentList(
  endpoint: string,
  state: AssignmentListQueryState = {},
): Promise<AssignmentListResponse> {
  const response = await httpRequest(buildAssignmentListURL(endpoint, state), { method: 'GET' });
  if (!response.ok) {
    throw await buildQueueRequestError(response, 'Failed to load assignments');
  }
  return normalizeAssignmentListResponse(await response.json());
}

async function runAssignmentAction(
  endpoint: string,
  assignmentId: string,
  action: 'claim' | 'release' | 'approve' | 'reject' | 'archive',
  request: AssignmentActionRequest,
): Promise<AssignmentActionResponse> {
  const payload: AssignmentActionRequest = {
    expected_version: request.expected_version,
  };
  if (request.idempotency_key) {
    payload.idempotency_key = request.idempotency_key;
  }
  if (request.reason) {
    payload.reason = request.reason;
  }
  const response = await httpRequest(`${endpoint}/${encodeURIComponent(assignmentId)}/actions/${action}`, {
    method: 'POST',
    json: payload,
  });
  if (!response.ok) {
    throw await buildQueueRequestError(response, `Failed to ${action} assignment`);
  }
  return normalizeAssignmentActionResponse(await response.json());
}

export function claimAssignment(
  endpoint: string,
  assignmentId: string,
  request: AssignmentActionRequest,
): Promise<AssignmentActionResponse> {
  return runAssignmentAction(endpoint, assignmentId, 'claim', request);
}

export function releaseAssignment(
  endpoint: string,
  assignmentId: string,
  request: AssignmentActionRequest,
): Promise<AssignmentActionResponse> {
  return runAssignmentAction(endpoint, assignmentId, 'release', request);
}

export function presetToQueryState(preset: AssignmentQueueSavedFilterPreset): AssignmentListQueryState {
  return {
    status: preset.query.status,
    assigneeId: preset.query.assignee_id,
    reviewerId: preset.query.reviewer_id,
    dueState: preset.query.due_state as AssignmentDueState | undefined,
    locale: preset.query.locale,
    priority: preset.query.priority,
    reviewState: preset.review_state,
    familyId: preset.query.family_id,
    sort: preset.query.sort,
    order: preset.query.order,
    page: 1,
  };
}

function buildActionIdempotencyKey(action: 'claim' | 'release', row: AssignmentListRow): string {
  return `queue-${action}-${row.id}-${row.version}-${Date.now()}`;
}

function buildReviewActionIdempotencyKey(action: 'approve' | 'reject' | 'archive', row: AssignmentListRow): string {
  return `queue-${action}-${row.id}-${row.version}-${Date.now()}`;
}

function findInitialQueuePreset(
  presetId: string,
): { kind: 'standard' | 'review'; preset: AssignmentQueueSavedFilterPreset } | null {
  const normalizedPresetId = asString(presetId);
  if (!normalizedPresetId) return null;

  const standardPreset = DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS.find((entry) => entry.id === normalizedPresetId);
  if (standardPreset) {
    return { kind: 'standard', preset: standardPreset };
  }

  const reviewPreset = DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS.find((entry) => entry.id === normalizedPresetId);
  if (reviewPreset) {
    return { kind: 'review', preset: reviewPreset };
  }

  return null;
}

function cloneRow(row: AssignmentListRow): AssignmentListRow {
  return {
    ...row,
    actions: {
      claim: { ...row.actions.claim },
      release: { ...row.actions.release },
    },
    review_actions: {
      submit_review: { ...row.review_actions.submit_review },
      approve: { ...row.review_actions.approve },
      reject: { ...row.review_actions.reject },
      archive: { ...row.review_actions.archive },
    },
    review_feedback: row.review_feedback ? { ...row.review_feedback } : undefined,
    qa_summary: row.qa_summary ? { ...row.qa_summary } : undefined,
  };
}

function disabledActionState(permission: string | undefined, reason: string): TranslationActionState {
  return {
    enabled: false,
    permission,
    reason,
    reason_code: 'INVALID_STATUS',
  };
}

export function applyOptimisticAssignmentAction(
  row: AssignmentListRow,
  action: 'claim' | 'release',
): AssignmentListRow {
  const next = cloneRow(row);
  if (action === 'claim') {
    next.queue_state = 'in_progress';
    next.status = 'in_progress';
    next.actions.claim = disabledActionState(row.actions.claim.permission, 'assignment must be open pool or already assigned to you before it can be claimed');
    next.actions.release = {
      enabled: true,
      permission: row.actions.release.permission,
    };
    next.review_actions.submit_review = {
      enabled: true,
      permission: row.review_actions.submit_review.permission,
    };
    return next;
  }

  next.assignment_type = 'open_pool';
  next.queue_state = 'open';
  next.status = 'open';
  next.assignee_id = '';
  next.actions.claim = {
    enabled: true,
    permission: row.actions.claim.permission,
  };
  next.actions.release = disabledActionState(row.actions.release.permission, 'assignment must be assigned or in progress before it can be released');
  next.review_actions.submit_review = disabledActionState(row.review_actions.submit_review.permission, 'assignment must be in progress');
  return next;
}

function formatQueueActionError(error: unknown, fallback: string): AssignmentQueueFeedback {
  if (error instanceof AssignmentQueueRequestError) {
    return {
      kind: error.code === 'VERSION_CONFLICT' ? 'conflict' : 'error',
      message: error.message || fallback,
      code: error.code,
      requestId: error.requestId,
      traceId: error.traceId,
    };
  }
  if (error instanceof Error) {
    return {
      kind: 'error',
      message: error.message || fallback,
    };
  }
  return {
    kind: 'error',
    message: fallback,
  };
}

function queueLifecycleState(row: AssignmentListRow): string {
  return asString(row.queue_state || row.status);
}

function isReviewQueueState(state: string): boolean {
  return state === 'review' || state === 'in_review';
}

function shouldShowQueueReviewActions(row: AssignmentListRow): boolean {
  const state = queueLifecycleState(row);
  if (isReviewQueueState(state)) return true;
  return Boolean(row.review_actions.approve.enabled || row.review_actions.reject.enabled);
}

function shouldShowQueueManagementActions(row: AssignmentListRow): boolean {
  return Boolean(row.review_actions.archive.enabled);
}

export class AssignmentQueueScreen {
  private config: Required<AssignmentQueueScreenConfig>;
  private container: HTMLElement | null = null;
  private state: AssignmentQueueScreenState = 'loading';
  private response: AssignmentListResponse | null = null;
  private rows: AssignmentListRow[] = [];
  private queryState: AssignmentListQueryState;
  private activePresetId: string;
  private activeReviewPresetId = '';
  private activeReviewState: AssignmentQueueReviewState | null = null;
  private feedback: AssignmentQueueFeedback | null = null;
  private error: AssignmentQueueRequestError | Error | null = null;
  private pendingActions = new Set<string>();

  constructor(config: AssignmentQueueScreenConfig) {
    const requestedPresetId = asString(config.initialPresetId);
    this.config = {
      endpoint: config.endpoint,
      editorBasePath: config.editorBasePath || '',
      title: config.title || 'Translation Queue',
      description: config.description || 'Filter assignments, claim open work, and release items back to the pool without leaving the queue.',
      initialPresetId: requestedPresetId || 'open',
    };
    const initialPreset = findInitialQueuePreset(requestedPresetId);
    if (initialPreset?.kind === 'review') {
      this.activePresetId = 'custom';
      this.activeReviewPresetId = initialPreset.preset.id;
      this.activeReviewState = initialPreset.preset.review_state || null;
      this.queryState = presetToQueryState(initialPreset.preset);
      return;
    }

    const preset = initialPreset?.preset
      || DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS[1]
      || DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS[0];
    this.activePresetId = preset?.id || 'open';
    this.queryState = preset ? presetToQueryState(preset) : { sort: 'updated_at', order: 'desc', page: 1 };
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
    void this.load();
  }

  unmount(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }

  getState(): AssignmentQueueScreenState {
    return this.state;
  }

  getData(): AssignmentListResponse | null {
    return this.response;
  }

  getRows(): AssignmentListRow[] {
    return this.rows.map((row) => cloneRow(row));
  }

  getFeedback(): AssignmentQueueFeedback | null {
    return this.feedback ? { ...this.feedback } : null;
  }

  getActivePresetId(): string {
    return this.activePresetId;
  }

  getActiveReviewPresetId(): string {
    return this.activeReviewPresetId;
  }

  async load(): Promise<void> {
    this.state = 'loading';
    this.error = null;
    this.render();
    try {
      const response = await fetchAssignmentList(this.config.endpoint, this.queryState);
      this.response = response;
      this.rows = response.data.map((row) => cloneRow(row));
      this.state = this.rows.length ? 'ready' : 'empty';
    } catch (error) {
      this.error = error instanceof Error ? error : new Error(String(error));
      this.state = error instanceof AssignmentQueueRequestError && error.code === 'VERSION_CONFLICT'
        ? 'conflict'
        : 'error';
    }
    this.render();
  }

  async runInlineAction(action: 'claim' | 'release', assignmentId: string): Promise<void> {
    const index = this.rows.findIndex((row) => row.id === assignmentId);
    if (index < 0) {
      return;
    }
    const current = this.rows[index];
    const actionState = current.actions[action];
    if (!actionState.enabled) {
      this.feedback = {
        kind: actionState.reason_code === 'PERMISSION_DENIED' ? 'error' : 'conflict',
        message: actionState.reason || `Cannot ${action} this assignment.`,
        code: actionState.reason_code || null,
      };
      this.render();
      return;
    }

    const previous = cloneRow(current);
    const pendingKey = `${action}:${assignmentId}`;
    this.pendingActions.add(pendingKey);
    this.feedback = null;
    this.rows[index] = applyOptimisticAssignmentAction(current, action);
    this.render();

    try {
      const response = action === 'claim'
        ? await claimAssignment(this.config.endpoint, assignmentId, {
            expected_version: previous.version,
            idempotency_key: buildActionIdempotencyKey('claim', previous),
          })
        : await releaseAssignment(this.config.endpoint, assignmentId, {
            expected_version: previous.version,
            idempotency_key: buildActionIdempotencyKey('release', previous),
          });
      this.rows[index] = cloneRow(response.data.assignment);
      this.feedback = {
        kind: 'success',
        message: action === 'claim' ? 'Assignment claimed.' : 'Assignment released back to the pool.',
      };
    } catch (error) {
      this.rows[index] = previous;
      this.feedback = formatQueueActionError(error, `Failed to ${action} assignment.`);
    } finally {
      this.pendingActions.delete(pendingKey);
      this.render();
    }
  }

  async runReviewAction(action: 'approve' | 'reject' | 'archive', assignmentId: string): Promise<void> {
    const index = this.rows.findIndex((row) => row.id === assignmentId);
    if (index < 0) return;
    const current = this.rows[index];
    const actionState = current.review_actions[action];
    if (!actionState?.enabled) {
      this.feedback = {
        kind: actionState?.reason_code === 'PERMISSION_DENIED' ? 'error' : 'conflict',
        message: actionState?.reason || `Cannot ${action} this assignment.`,
        code: actionState?.reason_code || null,
      };
      this.render();
      return;
    }
    const request: AssignmentActionRequest = {
      expected_version: current.version,
      idempotency_key: buildReviewActionIdempotencyKey(action, current),
    };
    if (action === 'reject') {
      const reason = typeof window !== 'undefined' ? window.prompt('Reject reason') : '';
      if (!reason || !reason.trim()) {
        this.feedback = {
          kind: 'error',
          message: 'Reject reason is required.',
          code: 'VALIDATION_ERROR',
        };
        this.render();
        return;
      }
      request.reason = reason.trim();
    }
    const pendingKey = `${action}:${assignmentId}`;
    this.pendingActions.add(pendingKey);
    this.feedback = null;
    this.render();
    try {
      const response = await runAssignmentAction(this.config.endpoint, assignmentId, action, request);
      this.rows[index] = cloneRow(response.data.assignment);
      this.feedback = {
        kind: 'success',
        message: action === 'approve'
          ? 'Assignment approved.'
          : action === 'reject'
            ? 'Changes requested.'
            : 'Assignment archived.',
      };
    } catch (error) {
      this.feedback = formatQueueActionError(error, `Failed to ${action} assignment.`);
    } finally {
      this.pendingActions.delete(pendingKey);
      this.render();
    }
  }

  private setActivePreset(presetId: string): void {
    const preset = this.savedFilterPresets.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }
    this.activePresetId = preset.id;
    this.activeReviewPresetId = '';
    this.activeReviewState = null;
    this.queryState = presetToQueryState(preset);
    this.feedback = null;
    void this.load();
  }

  private setActiveReviewPreset(presetId: string): void {
    const preset = this.savedReviewFilterPresets.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }
    this.activePresetId = 'custom';
    this.activeReviewPresetId = preset.id;
    this.activeReviewState = preset.review_state || null;
    this.queryState = presetToQueryState(preset);
    this.feedback = null;
    void this.load();
  }

  private updateFilter(next: Partial<AssignmentListQueryState>): void {
    this.activePresetId = 'custom';
    this.activeReviewPresetId = '';
    this.activeReviewState = null;
    this.queryState = {
      ...this.queryState,
      ...next,
      page: 1,
    };
    this.feedback = null;
    void this.load();
  }

  private get savedFilterPresets(): AssignmentQueueSavedFilterPreset[] {
    return this.response?.meta.saved_filter_presets?.length
      ? this.response.meta.saved_filter_presets.map(cloneSavedFilterPreset)
      : DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS.map(cloneSavedFilterPreset);
  }

  private get savedReviewFilterPresets(): AssignmentQueueSavedFilterPreset[] {
    return this.response?.meta.saved_review_filter_presets?.length
      ? this.response.meta.saved_review_filter_presets.map(cloneSavedFilterPreset)
      : DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS.map(cloneSavedFilterPreset);
  }

  private get visibleRows(): AssignmentListRow[] {
    return this.rows;
  }

  private render(): void {
    if (!this.container) {
      return;
    }

    this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        <section class="assignment-queue-header">
          <div>
            <p class="${HEADER_PRETITLE}">Assignment Queue</p>
            <h1 class="${HEADER_TITLE}">${escapeHtml(this.config.title)}</h1>
            <p class="${HEADER_DESCRIPTION} max-w-2xl">${escapeHtml(this.config.description)}</p>
          </div>
          <div class="assignment-queue-summary">
            <span class="summary-pill">Rows ${this.visibleRows.length}</span>
            <span class="summary-pill">Total ${this.response?.meta.total ?? 0}</span>
            <button type="button" class="${BTN_SECONDARY_SM}" data-queue-refresh="true">Refresh</button>
          </div>
        </section>
        ${this.renderFeedback()}
        ${this.renderReviewStateBar()}
        ${this.renderPresetBar()}
        ${this.renderFilters()}
        ${this.renderBody()}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderFeedback(): string {
    if (!this.feedback) {
      return '';
    }
    const tone = this.feedback.kind === 'success'
      ? 'feedback-success'
      : this.feedback.kind === 'conflict'
      ? 'feedback-conflict'
      : 'feedback-error';
    const meta = [
      this.feedback.code ? `Code ${escapeHtml(this.feedback.code)}` : '',
      this.feedback.requestId ? `Request ${escapeHtml(this.feedback.requestId)}` : '',
      this.feedback.traceId ? `Trace ${escapeHtml(this.feedback.traceId)}` : '',
    ].filter(Boolean);
    return `
      <div class="assignment-queue-feedback ${tone}" data-feedback-kind="${escapeAttr(this.feedback.kind)}" role="status" aria-live="polite">
        <strong>${escapeHtml(this.feedback.message)}</strong>
        ${meta.length ? `<span class="feedback-meta">${meta.join(' · ')}</span>` : ''}
      </div>
    `;
  }

  private renderPresetBar(): string {
    return `
      <div class="assignment-queue-presets" role="tablist" aria-label="Saved queue filters">
        ${this.savedFilterPresets.map((preset) => `
          <button
            type="button"
            class="${BTN_SECONDARY_SM} queue-preset-button ${this.activePresetId === preset.id ? 'is-active' : ''}"
            data-preset-id="${escapeAttr(preset.id)}"
            role="tab"
            aria-selected="${this.activePresetId === preset.id ? 'true' : 'false'}"
            title="${escapeAttr(preset.description || preset.label)}"
          >
            ${escapeHtml(preset.label)}
          </button>
        `).join('')}
      </div>
    `;
  }

  private renderReviewStateBar(): string {
    if (!this.savedReviewFilterPresets.length) {
      return '';
    }
    const counts = this.response?.meta.review_aggregate_counts || {};
    const actorID = this.response?.meta.review_actor_id;
    const reviewerStateEnabled = Boolean(actorID);
    return `
      <section class="assignment-review-presets" aria-label="Reviewer queue states">
        <div class="review-preset-copy">
          <p class="${HEADER_PRETITLE}">Reviewer states</p>
          <p class="review-preset-description">${escapeHtml(actorID ? `Signed in as ${actorID}` : 'Reviewer queue states are available when reviewer metadata is present.')}</p>
        </div>
        <div class="assignment-review-presets-grid">
          ${this.savedReviewFilterPresets.map((preset) => `
            <button
              type="button"
              class="review-preset-button ${this.activeReviewPresetId === preset.id ? 'is-active' : ''}"
              data-review-preset-id="${escapeAttr(preset.id)}"
              title="${escapeAttr(reviewerStateEnabled ? (preset.description || preset.label) : 'Reviewer metadata is required to use this preset.')}"
              ${reviewerStateEnabled ? '' : 'disabled aria-disabled="true"'}
            >
              <span>${escapeHtml(preset.label)}</span>
              <strong>${counts[preset.id] ?? 0}</strong>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  private renderFilters(): string {
    const rows = this.visibleRows;
    const statuses = ['', 'open', 'assigned', 'in_progress', 'in_review', 'changes_requested', 'approved', 'archived'];
    const dueStates: AssignmentDueState[] = ['none', 'on_track', 'due_soon', 'overdue'];
    const priorities = ['', 'low', 'normal', 'high', 'urgent'];
    const locales = ['', ...uniqueFilterOptions(rows.map((row) => row.target_locale))];
    const assignees = ['', ...uniqueFilterOptions(rows.map((row) => row.assignee_id))];
    const reviewers = ['', ...uniqueFilterOptions(rows.map((row) => row.reviewer_id))];
    const sortKeys = this.response?.meta.supported_sort_keys?.length
      ? this.response.meta.supported_sort_keys
      : ['updated_at', 'due_date', 'priority', 'status', 'locale'];
    return `
      <form class="assignment-queue-filters" data-queue-filters="true">
        ${this.renderSelect('status', 'Status', statuses, this.queryState.status || '')}
        ${this.renderSelect('due_state', 'Due State', ['', ...dueStates], this.queryState.dueState || '')}
        ${this.renderSelect('priority', 'Priority', priorities, this.queryState.priority || '')}
        ${this.renderSelect('locale', 'Locale', locales, this.queryState.locale || '')}
        ${this.renderSelect('assignee_id', 'Assignee', assignees, this.queryState.assigneeId || '')}
        ${this.renderSelect('reviewer_id', 'Reviewer', reviewers, this.queryState.reviewerId || '')}
        ${this.renderSelect('sort', 'Sort', sortKeys, this.queryState.sort || (this.response?.meta.default_sort.key ?? 'updated_at'))}
        ${this.renderSelect('order', 'Order', ['asc', 'desc'], this.queryState.order || (this.response?.meta.default_sort.order ?? 'desc'))}
      </form>
    `;
  }

  private renderSelect(name: string, label: string, values: string[], activeValue: string): string {
    const options = [...values];
    if (activeValue && !options.includes(activeValue)) {
      options.push(activeValue);
    }
    return `
      <label class="queue-filter-field">
        <span>${escapeHtml(label)}</span>
        <select data-filter-name="${escapeAttr(name)}">
          ${options.map((value) => `
            <option value="${escapeAttr(value)}" ${value === activeValue ? 'selected' : ''}>
              ${escapeHtml(value ? humanizeToken(value) : `All ${label.toLowerCase()}`)}
            </option>
          `).join('')}
        </select>
      </label>
    `;
  }

  private renderBody(): string {
    const rows = this.visibleRows;
    if (this.state === 'loading' && !this.rows.length) {
      return `<div class="assignment-queue-state" data-queue-state="loading">Loading queue…</div>`;
    }
    if (this.state === 'error' && !this.rows.length) {
      return this.renderErrorState('error', this.error?.message || 'Failed to load queue assignments.');
    }
    if (this.state === 'conflict' && !this.rows.length) {
      return this.renderErrorState('conflict', this.error?.message || 'The queue response is stale. Refresh and try again.');
    }
    if (!rows.length) {
      return `<div class="assignment-queue-state" data-queue-state="empty">No assignments match the current filters.</div>`;
    }
    return `
      <!-- Mobile Card View (visible on small screens) -->
      <div class="flex flex-col gap-3 sm:hidden" data-queue-mobile-view="true">
        ${rows.map((row) => this.renderMobileCard(row)).join('')}
      </div>
      <!-- Desktop Table View (hidden on small screens) -->
      <div class="assignment-queue-table-wrap hidden sm:block">
        <table class="assignment-queue-table" aria-label="Translation assignment queue">
          <thead>
            <tr>
              <th scope="col">Content</th>
              <th scope="col">Locale</th>
              <th scope="col">Status</th>
              <th scope="col">Owners</th>
              <th scope="col">Due</th>
              <th scope="col">Priority</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => this.renderRow(row)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderErrorState(kind: 'error' | 'conflict', message: string): string {
    const title = kind === 'conflict' ? 'Version conflict' : 'Queue unavailable';
    return `
      <div class="${ERROR_STATE} p-6" data-queue-state="${kind}" role="alert">
        <h2 class="${ERROR_STATE_TITLE}">${title}</h2>
        <p class="${ERROR_STATE_TEXT} mt-2">${escapeHtml(message)}</p>
        <div class="mt-4">
          <button type="button" class="${BTN_SECONDARY_SM}" data-queue-refresh="true">Retry</button>
        </div>
      </div>
    `;
  }

  private renderRow(row: AssignmentListRow): string {
    const pendingClaim = this.pendingActions.has(`claim:${row.id}`);
    const pendingRelease = this.pendingActions.has(`release:${row.id}`);
    const pendingApprove = this.pendingActions.has(`approve:${row.id}`);
    const pendingReject = this.pendingActions.has(`reject:${row.id}`);
    const pendingArchive = this.pendingActions.has(`archive:${row.id}`);
    const claimDisabled = pendingClaim || !row.actions.claim.enabled;
    const releaseDisabled = pendingRelease || !row.actions.release.enabled;
    const showReviewActions = shouldShowQueueReviewActions(row);
    const showManagementActions = shouldShowQueueManagementActions(row);
    return `
      <tr class="assignment-queue-row" tabindex="0" data-assignment-id="${escapeAttr(row.id)}" data-assignment-row="true" data-assignment-nav-group="table" aria-label="${escapeAttr(buildRowAriaLabel(row))}">
        <td>
          <div class="queue-content-cell">
            <strong>${escapeHtml(row.source_title || row.source_path || row.id)}</strong>
            <span>${escapeHtml(row.entity_type)} · ${escapeHtml(row.source_path || row.family_id)}</span>
          </div>
        </td>
        <td>
          <div class="queue-locale-cell">
            <span class="locale-pill">${escapeHtml(row.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-pill locale-target">${escapeHtml(row.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td>
          <div class="queue-status-cell">
            ${renderVocabularyStatusBadge(row.queue_state, { domain: 'queue', size: 'sm' })}
            <span class="queue-content-state">${escapeHtml(humanizeToken(row.content_state))}</span>
            ${row.qa_summary?.enabled ? `
              <span class="queue-qa-chip ${row.qa_summary.blocker_count > 0 ? 'is-blocked' : ''}">
                QA ${row.qa_summary.finding_count}
              </span>
            ` : ''}
          </div>
        </td>
        <td>
          <div class="queue-owner-cell">
            <span><strong>Assignee:</strong> ${escapeHtml(row.assignee_id || 'Open pool')}</span>
            <span><strong>Reviewer:</strong> ${escapeHtml(row.reviewer_id || 'Not set')}</span>
            ${row.last_rejection_reason ? `<span class="queue-feedback-note">${escapeHtml(row.last_rejection_reason)}</span>` : ''}
          </div>
        </td>
        <td>
          <div class="queue-due-cell">
            <span class="due-pill due-${escapeAttr(row.due_state)}">${escapeHtml(humanizeToken(row.due_state))}</span>
            <span>${escapeHtml(formatDueDate(row.due_date))}</span>
          </div>
        </td>
        <td>
          <span class="priority-pill priority-${escapeAttr(row.priority)}">${escapeHtml(humanizeToken(row.priority))}</span>
        </td>
        <td>
          <div class="queue-action-cell">
            <div class="queue-action-group" data-action-group="lifecycle">
              <button
                type="button"
                class="${BTN_SECONDARY_SM}"
                data-action="claim"
                data-assignment-id="${escapeAttr(row.id)}"
                ${claimDisabled ? 'disabled' : ''}
                aria-disabled="${claimDisabled ? 'true' : 'false'}"
                title="${escapeAttr(pendingClaim ? 'Claiming assignment…' : (row.actions.claim.reason || 'Claim assignment'))}"
              >
                ${pendingClaim ? 'Claiming…' : 'Claim'}
              </button>
              <button
                type="button"
                class="${BTN_SECONDARY_SM}"
                data-action="release"
                data-assignment-id="${escapeAttr(row.id)}"
                ${releaseDisabled ? 'disabled' : ''}
                aria-disabled="${releaseDisabled ? 'true' : 'false'}"
                title="${escapeAttr(pendingRelease ? 'Releasing assignment…' : (row.actions.release.reason || 'Release assignment'))}"
              >
                ${pendingRelease ? 'Releasing…' : 'Release'}
              </button>
            </div>
            ${showReviewActions ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${BTN_PRIMARY_SM}"
                  data-action="approve"
                  data-assignment-id="${escapeAttr(row.id)}"
                  ${pendingApprove || !row.review_actions.approve.enabled ? 'disabled' : ''}
                  aria-disabled="${pendingApprove || !row.review_actions.approve.enabled ? 'true' : 'false'}"
                  title="${escapeAttr(pendingApprove ? 'Approving assignment…' : (row.review_actions.approve.reason || 'Approve assignment'))}"
                >
                  ${pendingApprove ? 'Approving…' : 'Approve'}
                </button>
                <button
                  type="button"
                  class="${BTN_DANGER_SM}"
                  data-action="reject"
                  data-assignment-id="${escapeAttr(row.id)}"
                  ${pendingReject || !row.review_actions.reject.enabled ? 'disabled' : ''}
                  aria-disabled="${pendingReject || !row.review_actions.reject.enabled ? 'true' : 'false'}"
                  title="${escapeAttr(pendingReject ? 'Rejecting assignment…' : (row.review_actions.reject.reason || 'Reject assignment'))}"
                >
                  ${pendingReject ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            ` : ''}
            ${showManagementActions ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="${BTN_SECONDARY_SM}"
                  data-action="archive"
                  data-assignment-id="${escapeAttr(row.id)}"
                  ${pendingArchive || !row.review_actions.archive.enabled ? 'disabled' : ''}
                  aria-disabled="${pendingArchive || !row.review_actions.archive.enabled ? 'true' : 'false'}"
                  title="${escapeAttr(pendingArchive ? 'Archiving assignment…' : (row.review_actions.archive.reason || 'Archive assignment'))}"
                >
                  ${pendingArchive ? 'Archiving…' : 'Archive'}
                </button>
              </div>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  private renderMobileCard(row: AssignmentListRow): string {
    const pendingClaim = this.pendingActions.has(`claim:${row.id}`);
    const pendingRelease = this.pendingActions.has(`release:${row.id}`);
    const pendingApprove = this.pendingActions.has(`approve:${row.id}`);
    const pendingReject = this.pendingActions.has(`reject:${row.id}`);
    const pendingArchive = this.pendingActions.has(`archive:${row.id}`);
    const claimDisabled = pendingClaim || !row.actions.claim.enabled;
    const releaseDisabled = pendingRelease || !row.actions.release.enabled;
    const showReviewActions = shouldShowQueueReviewActions(row);
    const showManagementActions = shouldShowQueueManagementActions(row);
    return `
      <article
        class="${MOBILE_CARD}"
        data-assignment-id="${escapeAttr(row.id)}"
        data-assignment-card="true"
        data-assignment-nav-group="mobile"
        tabindex="0"
        role="button"
        aria-label="${escapeAttr(buildRowAriaLabel(row))}"
      >
        <div class="${MOBILE_CARD_HEADER}">
          <div>
            <h3 class="${MOBILE_CARD_TITLE}">${escapeHtml(row.source_title || row.source_path || row.id)}</h3>
            <p class="${MOBILE_CARD_SUBTITLE}">${escapeHtml(row.entity_type)} · ${escapeHtml(row.source_path || row.family_id)}</p>
          </div>
          ${renderVocabularyStatusBadge(row.queue_state, { domain: 'queue', size: 'sm' })}
        </div>
        <div class="${MOBILE_CARD_BODY}">
          <div class="${MOBILE_CARD_ROW}">
            <span class="${MOBILE_CARD_LABEL}">Locale</span>
            <span class="${MOBILE_CARD_VALUE}">
              <span class="locale-pill">${escapeHtml(row.source_locale.toUpperCase())}</span>
              <span class="locale-arrow">→</span>
              <span class="locale-pill locale-target">${escapeHtml(row.target_locale.toUpperCase())}</span>
            </span>
          </div>
          <div class="${MOBILE_CARD_ROW}">
            <span class="${MOBILE_CARD_LABEL}">Assignee</span>
            <span class="${MOBILE_CARD_VALUE}">${escapeHtml(row.assignee_id || 'Open pool')}</span>
          </div>
          <div class="${MOBILE_CARD_ROW}">
            <span class="${MOBILE_CARD_LABEL}">Due</span>
            <span class="${MOBILE_CARD_VALUE}">
              <span class="due-pill due-${escapeAttr(row.due_state)}">${escapeHtml(humanizeToken(row.due_state))}</span>
              ${row.due_date ? `<span class="text-gray-500 ml-1">${escapeHtml(formatDueDate(row.due_date))}</span>` : ''}
            </span>
          </div>
          <div class="${MOBILE_CARD_ROW}">
            <span class="${MOBILE_CARD_LABEL}">Priority</span>
            <span class="priority-pill priority-${escapeAttr(row.priority)}">${escapeHtml(humanizeToken(row.priority))}</span>
          </div>
        </div>
        <div class="${MOBILE_CARD_ACTIONS}">
          <button
            type="button"
            class="${BTN_SECONDARY_SM} flex-1"
            data-action="claim"
            data-assignment-id="${escapeAttr(row.id)}"
            ${claimDisabled ? 'disabled' : ''}
          >
            ${pendingClaim ? 'Claiming…' : 'Claim'}
          </button>
          <button
            type="button"
            class="${BTN_SECONDARY_SM} flex-1"
            data-action="release"
            data-assignment-id="${escapeAttr(row.id)}"
            ${releaseDisabled ? 'disabled' : ''}
          >
            ${pendingRelease ? 'Releasing…' : 'Release'}
          </button>
          ${showReviewActions ? `
            <button
              type="button"
              class="${BTN_PRIMARY_SM} flex-1"
              data-action="approve"
              data-assignment-id="${escapeAttr(row.id)}"
              ${pendingApprove || !row.review_actions.approve.enabled ? 'disabled' : ''}
            >
              ${pendingApprove ? 'Approving…' : 'Approve'}
            </button>
            <button
              type="button"
              class="${BTN_DANGER_SM} flex-1"
              data-action="reject"
              data-assignment-id="${escapeAttr(row.id)}"
              ${pendingReject || !row.review_actions.reject.enabled ? 'disabled' : ''}
            >
              ${pendingReject ? 'Rejecting…' : 'Reject'}
            </button>
          ` : ''}
          ${showManagementActions ? `
            <button
              type="button"
              class="${BTN_SECONDARY_SM}"
              data-action="archive"
              data-assignment-id="${escapeAttr(row.id)}"
              ${pendingArchive || !row.review_actions.archive.enabled ? 'disabled' : ''}
            >
              ${pendingArchive ? 'Archiving…' : 'Archive'}
            </button>
          ` : ''}
        </div>
      </article>
    `;
  }

  private attachEventListeners(): void {
    if (!this.container) {
      return;
    }

    this.container.querySelectorAll<HTMLElement>('[data-preset-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const presetId = button.dataset.presetId;
        if (presetId) {
          this.setActivePreset(presetId);
        }
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-review-preset-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const presetId = button.dataset.reviewPresetId;
        if (presetId) {
          this.setActiveReviewPreset(presetId);
        }
      });
    });

    this.container.querySelectorAll<HTMLSelectElement>('[data-filter-name]').forEach((select) => {
      select.addEventListener('change', () => {
        const name = select.dataset.filterName;
        if (!name) {
          return;
        }
        const value = select.value.trim();
        switch (name) {
          case 'status':
            this.updateFilter({ status: value || undefined });
            break;
          case 'due_state':
            this.updateFilter({ dueState: (value || undefined) as AssignmentDueState | undefined });
            break;
          case 'priority':
            this.updateFilter({ priority: value || undefined });
            break;
          case 'locale':
            this.updateFilter({ locale: value || undefined });
            break;
          case 'assignee_id':
            this.updateFilter({ assigneeId: value || undefined });
            break;
          case 'reviewer_id':
            this.updateFilter({ reviewerId: value || undefined });
            break;
          case 'sort':
            this.updateFilter({ sort: (value || undefined) as AssignmentSortKey | undefined });
            break;
          case 'order':
            this.updateFilter({ order: (value || undefined) as 'asc' | 'desc' | undefined });
            break;
        }
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-queue-refresh]').forEach((button) => {
      button.addEventListener('click', () => {
        void this.load();
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        const assignmentId = button.dataset.assignmentId;
        if ((action === 'claim' || action === 'release') && assignmentId) {
          void this.runInlineAction(action, assignmentId);
          return;
        }
        if ((action === 'approve' || action === 'reject' || action === 'archive') && assignmentId) {
          void this.runReviewAction(action, assignmentId);
        }
      });
    });

    this.attachAssignmentNavigationTargets('[data-assignment-row]');
    this.attachAssignmentNavigationTargets('[data-assignment-card]');
  }

  private attachAssignmentNavigationTargets(selector: string): void {
    if (!this.container) {
      return;
    }
    this.container.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      element.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('button, a, input, select, textarea')) {
          return;
        }
        this.openAssignment(element.dataset.assignmentId || '');
      });
      element.addEventListener('keydown', (event) => {
        const key = event.key;
        if (key === 'Enter' || key === ' ') {
          event.preventDefault();
          this.openAssignment(element.dataset.assignmentId || '');
          return;
        }
        if (key !== 'ArrowDown' && key !== 'ArrowUp') {
          return;
        }
        const group = element.dataset.assignmentNavGroup;
        if (!group) {
          return;
        }
        event.preventDefault();
        const elements = Array.from(
          this.container?.querySelectorAll<HTMLElement>(`[data-assignment-nav-group="${group}"]`) || []
        );
        const index = elements.indexOf(element);
        if (index < 0) {
          return;
        }
        const nextIndex = key === 'ArrowDown'
          ? Math.min(index + 1, elements.length - 1)
          : Math.max(index - 1, 0);
        elements[nextIndex]?.focus();
      });
    });
  }

  private openAssignment(assignmentId: string): void {
    const base = this.config.editorBasePath.trim().replace(/\/+$/, '');
    if (!base || !assignmentId || typeof window === 'undefined') {
      return;
    }
    window.location.href = `${base}/${encodeURIComponent(assignmentId)}/edit`;
  }
}

function buildRowAriaLabel(row: AssignmentListRow): string {
  return [
    row.source_title || row.source_path || row.id,
    `${row.source_locale.toUpperCase()} to ${row.target_locale.toUpperCase()}`,
    row.queue_state,
    row.due_state,
  ].filter(Boolean).join(', ');
}

function humanizeToken(value: string): string {
  if (!value) {
    return '';
  }
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(' ');
}

function formatDueDate(value?: string): string {
  if (!value) {
    return 'No due date';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}



export function getAssignmentQueueStyles(): string {
  return `
    .assignment-queue-screen {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      background: linear-gradient(180deg, #f9fafb 0%, #ffffff 40%);
      border-radius: 0.75rem;
      padding: 1rem;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
      border: 1px solid #e5e7eb;
    }

    .assignment-queue-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .assignment-queue-summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .summary-pill,
    .queue-filter-field select {
      border-radius: 999px;
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #111827;
      font: inherit;
    }

    .summary-pill {
      padding: 0.45rem 0.8rem;
      font-size: 0.85rem;
      color: #374151;
    }

    /* Preset button active state override for site btn classes */
    .queue-preset-button.is-active {
      background: #111827;
      border-color: #111827;
      color: #f9fafb;
    }

    .assignment-queue-feedback {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      border-radius: 0.9rem;
      padding: 0.9rem 1rem;
      border: 1px solid transparent;
      flex-wrap: wrap;
    }

    .feedback-success {
      background: #ecfdf5;
      border-color: #86efac;
      color: #166534;
    }

    .feedback-error {
      background: #fff1f2;
      border-color: #fda4af;
      color: #be123c;
    }

    .feedback-conflict {
      background: #fff7ed;
      border-color: #fdba74;
      color: #c2410c;
    }

    .feedback-meta {
      font-size: 0.85rem;
      opacity: 0.85;
    }

    .assignment-queue-presets {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .assignment-review-presets {
      display: grid;
      gap: 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 0.75rem;
      background:
        radial-gradient(circle at top left, rgba(14, 165, 233, 0.12), transparent 40%),
        linear-gradient(135deg, #f9fafb 0%, #eff6ff 100%);
    }

    .review-preset-copy {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .review-preset-description {
      margin: 0;
      font-size: 0.9rem;
      color: #374151;
    }

    .assignment-review-presets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.75rem;
    }

    .review-preset-button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      border-radius: 0.5rem;
      border: 1px solid #bfdbfe;
      background: rgba(255, 255, 255, 0.9);
      color: #111827;
      padding: 0.85rem 1rem;
      cursor: pointer;
      font: inherit;
      transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    }

    .review-preset-button strong {
      display: inline-flex;
      min-width: 2rem;
      justify-content: center;
      border-radius: 999px;
      background: #dbeafe;
      color: #1d4ed8;
      padding: 0.25rem 0.55rem;
      font-size: 0.82rem;
    }

    .review-preset-button:hover {
      border-color: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 12px 30px rgba(37, 99, 235, 0.12);
    }

    .review-preset-button.is-active {
      border-color: #111827;
      background: #111827;
      color: #f9fafb;
    }

    .review-preset-button.is-active strong {
      background: rgba(255, 255, 255, 0.14);
      color: #f9fafb;
    }

    .assignment-queue-filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.75rem;
    }

    .queue-filter-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      color: #374151;
      font-size: 0.9rem;
    }

    .queue-filter-field select {
      padding: 0.7rem 0.9rem;
    }

    .assignment-queue-state {
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 1.5rem;
      background: #f9fafb;
      color: #374151;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .assignment-queue-state.is-error {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }

    .assignment-queue-state.is-conflict {
      background: #fffbeb;
      border-color: #fcd34d;
      color: #92400e;
    }

    .assignment-queue-table-wrap {
      overflow-x: auto;
      border-radius: 0.75rem;
      border: 1px solid #e5e7eb;
      background: #ffffff;
    }

    .assignment-queue-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 960px;
    }

    .assignment-queue-table th,
    .assignment-queue-table td {
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
      vertical-align: middle;
    }

    .assignment-queue-table th {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      background: #f9fafb;
    }

    .assignment-queue-row {
      outline: none;
      transition: background 0.15s ease, box-shadow 0.15s ease;
    }

    .assignment-queue-row:hover,
    .assignment-queue-row:focus {
      background: #f9fafb;
      box-shadow: inset 3px 0 0 #2563eb;
    }

    .queue-content-cell,
    .queue-owner-cell,
    .queue-due-cell,
    .queue-status-cell {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .queue-content-cell span,
    .queue-owner-cell span,
    .queue-due-cell span,
    .queue-status-cell span {
      color: #4b5563;
      font-size: 0.88rem;
    }

    .queue-locale-cell {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .locale-pill,
    .priority-pill,
    .due-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.3rem 0.6rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .locale-pill {
      background: #e5e7eb;
      color: #111827;
    }

    .locale-pill.locale-target {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .locale-arrow {
      color: #6b7280;
      font-weight: 700;
    }

    .priority-low {
      background: #f1f5f9;
      color: #4b5563;
    }

    .priority-normal {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .priority-high {
      background: #fef3c7;
      color: #b45309;
    }

    .priority-urgent {
      background: #fee2e2;
      color: #b91c1c;
    }

    .due-none {
      background: #e5e7eb;
      color: #4b5563;
    }

    .due-on_track {
      background: #dcfce7;
      color: #166534;
    }

    .due-due_soon {
      background: #fef3c7;
      color: #b45309;
    }

    .due-overdue {
      background: #fee2e2;
      color: #b91c1c;
    }

    .queue-content-state {
      font-size: 0.82rem;
    }

    .queue-qa-chip {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      background: #fef3c7;
      color: #92400e;
      font-size: 0.74rem;
      font-weight: 700;
    }

    .queue-qa-chip.is-blocked {
      background: #fee2e2;
      color: #b91c1c;
    }

    .queue-feedback-note {
      color: #92400e;
      font-size: 0.82rem;
    }

    .queue-action-cell {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .queue-action-group {
      display: inline-flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    @media (max-width: 900px) {
      .assignment-queue-screen {
        padding: 1rem;
      }

      .assignment-queue-table {
        min-width: 760px;
      }
    }
  `;
}

function ensureAssignmentQueueStyles(): void {
  if (typeof document === 'undefined') {
    return;
  }
  const styleId = 'assignment-queue-styles';
  if (document.getElementById(styleId)) {
    return;
  }
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = getAssignmentQueueStyles();
  document.head.appendChild(style);
}

export function createAssignmentQueueScreen(
  container: HTMLElement,
  config: AssignmentQueueScreenConfig,
): AssignmentQueueScreen {
  ensureAssignmentQueueStyles();
  const screen = new AssignmentQueueScreen(config);
  screen.mount(container);
  return screen;
}

export function initAssignmentQueueScreen(container: HTMLElement): AssignmentQueueScreen | null {
  const endpoint = container.dataset.endpoint || container.dataset.assignmentListEndpoint || '';
  if (!endpoint) {
    return null;
  }
  const locationSearch = typeof window !== 'undefined' && window?.location?.search
    ? new URLSearchParams(window.location.search)
    : null;
  return createAssignmentQueueScreen(container, {
    endpoint,
    editorBasePath: container.dataset.editorBasePath || '',
    title: container.dataset.title,
    description: container.dataset.description,
    initialPresetId: container.dataset.initialPresetId || locationSearch?.get('preset') || '',
  });
}
