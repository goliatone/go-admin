import { renderVocabularyStatusBadge } from '../datatable/translation-status-vocabulary.js';
import {
  type TranslationActionState,
} from '../translation-contracts/index.js';
import {
  type ViewMode,
  type GroupedData,
  type RecordGroup,
  normalizeBackendGroupedRows,
  getPersistedViewMode,
  persistViewMode,
  getPersistedExpandState,
  persistExpandState,
  toggleGroupExpand,
  expandAllGroups,
  collapseAllGroups,
  getExpandedGroupIds,
  renderGroupHeaderSummary,
} from '../datatable/grouped-mode.js';
import { asNumber, asRecord, asString, asStringArray } from '../shared/coercion.js';
import {
  buildEndpointURL,
  getStringSearchParam,
  readLocationSearchParams,
  setNumberSearchParam,
  setSearchParam,
} from '../shared/query-state/url-state.js';
import { StatefulController } from '../shared/stateful-controller.js';
import { normalizeNumberRecord } from '../shared/record-normalization.js';
import { httpRequest, readHTTPError } from '../shared/transport/http-client.js';
import {
  SearchBox,
  ApiResolver,
  SimpleRenderer,
  UserRenderer,
  EntityRenderer,
  type ResultRenderer,
  type SearchResult,
} from '../searchbox/index.js';
import {
  buildAssignmentActionURL,
  initAssignmentSSRRowActions,
} from '../translation-actions/assignment-row-actions.js';
import { extractStructuredError, type StructuredError } from '../toast/error-helpers.js';
import { escapeHTML as escapeHtml } from '../shared/html.js';
import { escapeAttribute as escapeAttr } from '../shared/html.js';
import {
  BTN_PRIMARY_SM,
  BTN_SECONDARY_SM,
  BTN_DANGER_SM,
  BTN_GHOST,
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
  formatTranslationShortDateTime,
} from '../translation-shared/index.js';

export {
  buildAssignmentActionURL,
  initAssignmentSSRRowActions,
} from '../translation-actions/assignment-row-actions.js';

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
  entityType?: string;
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
  entity_type?: string;
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

export type AssignmentQueueFilterControlRenderer = 'simple' | 'user' | 'entity' | 'family';
export type AssignmentQueueFilterControlFallback = 'raw';

export interface AssignmentQueueFilterControlOption {
  value: string;
  label: string;
  description?: string;
}

export interface AssignmentQueueFilterControlMetadata {
  key: string;
  name: string;
  label: string;
  value: string;
  current_value: string;
  placeholder: string;
  clear_url?: string;
  type: string;
  options: AssignmentQueueFilterControlOption[];
  enhanced: boolean;
  endpoint_url?: string;
  endpoint_search_param?: string;
  endpoint_hydrate_param?: string;
  endpoint_value_field?: string;
  endpoint_label_field?: string;
  renderer?: AssignmentQueueFilterControlRenderer;
  fallback?: AssignmentQueueFilterControlFallback;
}

export interface AssignmentListQueryState extends AssignmentListFilters {
  page?: number;
  perPage?: number;
  sort?: AssignmentSortKey;
  order?: 'asc' | 'desc';
  groupBy?: 'family_id';
  groupStrategy?: 'page_local' | 'server_family';
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
  assignee_label?: string;
  reviewer_id: string;
  reviewer_label?: string;
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

export interface AssignmentListGroupingMeta {
  enabled: boolean;
  mode: string;
  group_by: string;
  scope: string;
  row_count: number;
  group_count: number;
  assignment_count: number;
  family_total?: number;
  assignment_total?: number;
  supported_modes: string[];
  supported_sort_keys?: AssignmentSortKey[];
  strategy: string;
  capabilities?: {
    server_family?: {
      supported: boolean;
      reason_code?: string;
    };
  };
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
  enhanced_filter_selects: boolean;
  filter_controls: AssignmentQueueFilterControlMetadata[];
  review_actor_id?: string;
  review_aggregate_counts: Record<string, number>;
  review_aggregate_counts_unavailable: string[];
  review_aggregate_counts_degraded: string[];
  grouping?: AssignmentListGroupingMeta;
  family_total?: number;
  assignment_total?: number;
}

export interface AssignmentListResponse {
  meta: AssignmentListMeta;
  data: AssignmentListRow[];
}

interface ServerFamilyExpansion {
  href: string;
  route: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
}

interface ServerFamilyParentRow {
  id: string;
  row_type: 'family';
  family_id: string;
  family_label: string;
  entity_type: string;
  source_record_id: string;
  source_locale: string;
  source_title: string;
  source_path: string;
  assignment_count: number;
  locale_count: number;
  target_locales: string[];
  status_counts: Record<string, number>;
  due_state_counts: Record<string, number>;
  priority_counts: Record<string, number>;
  family_blocker_count: number | null;
  family_blocker_count_available: boolean;
  family_blocker_count_reason: string;
  action_hints: Record<string, number>;
  expansion: ServerFamilyExpansion;
  expanded: boolean;
  children: AssignmentListRow[];
  childMeta?: {
    page: number;
    per_page: number;
    total: number;
    has_next: boolean;
  };
  loading?: boolean;
  error?: string;
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
  channel?: string;
}

// T10: Bulk action types
export interface BulkActionItem {
  assignmentId: string;
  expectedVersion: number;
}

export interface BulkActionRequest {
  action: 'assign' | 'release' | 'priority' | 'archive';
  assignments?: BulkActionItem[];
  selectionScope?: 'current_page' | 'filter_snapshot';
  snapshotId?: string;
  assigneeId?: string;
  idempotencyKey?: string;
  reason?: string;
  priority?: AssignmentPriority;
}

export interface BulkActionResultItem {
  assignmentId: string;
  success: boolean;
  error?: string;
  errorCode?: string;
  assignment?: AssignmentListRow;
}

export interface BulkActionResponse {
  data: {
    action: string;
    requested: number;
    succeeded: number;
    failed: number;
    partial: boolean;
    selectionScope: string;
    results: BulkActionResultItem[];
  };
  meta: {
    action: string;
    requested: number;
    succeeded: number;
    failed: number;
    partial: boolean;
    selection_scope: string;
    snapshot_id?: string;
    filters?: Record<string, unknown>;
    filter_summary?: string[];
  };
}

export interface BulkFilterSnapshot {
  selectionScope: 'filter_snapshot';
  snapshotId: string;
  requested: number;
  filters: Record<string, unknown>;
  filterSummary: string[];
  createdAt: string;
  expiresAt: string;
}

export interface AssignmentQueueScreenConfig {
  endpoint: string;
  bulkActionEndpoint?: string;
  bulkSnapshotEndpoint?: string;
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
      entity_type: asString(queryRaw.entity_type) || undefined,
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

function normalizeQueueFilterControlOption(value: unknown): AssignmentQueueFilterControlOption | null {
  const raw = asRecord(value);
  const optionValue = asString(raw.value);
  const label = asString(raw.label) || optionValue;
  if (!optionValue) {
    return null;
  }
  return {
    value: optionValue,
    label,
    description: asString(raw.description) || undefined,
  };
}

function normalizeQueueFilterControl(value: unknown): AssignmentQueueFilterControlMetadata | null {
  const raw = asRecord(value);
  const key = asString(raw.key || raw.name);
  const name = asString(raw.name || raw.key);
  if (!key || !name) {
    return null;
  }
  const options = Array.isArray(raw.options)
    ? raw.options
        .map((option) => normalizeQueueFilterControlOption(option))
        .filter((option): option is AssignmentQueueFilterControlOption => option !== null)
    : [];
  const renderer = asString(raw.renderer) as AssignmentQueueFilterControlRenderer;
  const fallback = asString(raw.fallback) as AssignmentQueueFilterControlFallback;
  return {
    key,
    name,
    label: asString(raw.label) || humanizeToken(name),
    value: asString(raw.value),
    current_value: asString(raw.current_value || raw.value),
    placeholder: asString(raw.placeholder),
    clear_url: asString(raw.clear_url) || undefined,
    type: asString(raw.type) || (options.length ? 'select' : 'text'),
    options,
    enhanced: raw.enhanced === true,
    endpoint_url: asString(raw.endpoint_url) || undefined,
    endpoint_search_param: asString(raw.endpoint_search_param) || undefined,
    endpoint_hydrate_param: asString(raw.endpoint_hydrate_param) || undefined,
    endpoint_value_field: asString(raw.endpoint_value_field) || undefined,
    endpoint_label_field: asString(raw.endpoint_label_field) || undefined,
    renderer: renderer || undefined,
    fallback: fallback || undefined,
  };
}

function normalizeQueueFilterControls(value: unknown): AssignmentQueueFilterControlMetadata[] {
  const items = Array.isArray(value) ? value : [];
  return items
    .map((item) => normalizeQueueFilterControl(item))
    .filter((item): item is AssignmentQueueFilterControlMetadata => item !== null);
}

function uniqueFilterOptions(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => asString(value)).filter(Boolean)));
}

type QueueFilterOptionRecord = Record<string, unknown>;

interface QueueFilterEnhancerMetadata {
  controlType: string;
  name: string;
  endpointURL: string;
  searchParam: string;
  hydrateParam: string;
  valueField: string;
  labelField: string;
  renderer: AssignmentQueueFilterControlRenderer;
  fallback: AssignmentQueueFilterControlFallback;
}

function queueFilterOptionFromRecord(
  item: QueueFilterOptionRecord,
  metadata: Pick<QueueFilterEnhancerMetadata, 'valueField' | 'labelField'>,
): SearchResult<QueueFilterOptionRecord> | null {
  const id = asString(item[metadata.valueField] ?? item.value ?? item.id);
  if (!id) return null;
  const label = asString(item[metadata.labelField] ?? item.label ?? item.name) || id;
  return {
    id,
    label,
    description: asString(item.description) || undefined,
    icon: asString(item.icon || item.avatar_url || item.avatar) || undefined,
    metadata: item,
    data: item,
  };
}

function queueFilterOptionsFromResponse(
  response: unknown,
  metadata: Pick<QueueFilterEnhancerMetadata, 'valueField' | 'labelField'>,
): SearchResult<QueueFilterOptionRecord>[] {
  const raw = asRecord(response);
  const items = Array.isArray(response)
    ? response
    : Array.isArray(raw.data)
      ? raw.data
      : Array.isArray(raw.options)
        ? raw.options
        : [];
  return items
    .map((item) => queueFilterOptionFromRecord(asRecord(item), metadata))
    .filter((item): item is SearchResult<QueueFilterOptionRecord> => item !== null);
}

function queueFilterRenderer(
  renderer: AssignmentQueueFilterControlRenderer,
): ResultRenderer<QueueFilterOptionRecord> {
  if (renderer === 'user') {
    return new UserRenderer<QueueFilterOptionRecord>({
      avatarField: 'avatar_url',
      emailField: 'email',
      roleField: 'role',
    });
  }
  if (renderer === 'entity' || renderer === 'family') {
    return new EntityRenderer<QueueFilterOptionRecord>({
      showIcon: renderer === 'entity',
      metadataFields: renderer === 'family' ? ['entity_type'] : [],
    });
  }
  return new SimpleRenderer<QueueFilterOptionRecord>();
}

function queueFilterMetadataFromElement(control: HTMLElement): QueueFilterEnhancerMetadata | null {
  const name = asString(control.dataset.filterName);
  const endpointURL = asString(control.dataset.filterEndpointUrl);
  if (!name || !endpointURL) {
    return null;
  }
  const renderer = asString(control.dataset.filterRenderer) as AssignmentQueueFilterControlRenderer;
  const fallback = asString(control.dataset.filterFallback) as AssignmentQueueFilterControlFallback;
  return {
    controlType: asString(control.dataset.filterControlType) || 'typeahead',
    name,
    endpointURL,
    searchParam: asString(control.dataset.filterSearchParam) || 'search',
    hydrateParam: asString(control.dataset.filterHydrateParam) || 'selected',
    valueField: asString(control.dataset.filterValueField) || 'value',
    labelField: asString(control.dataset.filterLabelField) || 'label',
    renderer: renderer || 'simple',
    fallback: fallback || 'raw',
  };
}

function dispatchQueueFilterChange(
  control: HTMLElement,
  metadata: QueueFilterEnhancerMetadata,
  value: string,
): void {
  control.dispatchEvent(new CustomEvent('queue-filter-change', {
    bubbles: true,
    detail: {
      name: metadata.name,
      value,
    },
  }));
}

async function hydrateQueueFilterInput(
  input: HTMLInputElement,
  canonicalInput: HTMLInputElement,
  metadata: QueueFilterEnhancerMetadata,
): Promise<void> {
  const selected = canonicalInput.value.trim();
  if (!selected) {
    return;
  }
  const url = new URL(metadata.endpointURL, window.location.origin);
  url.searchParams.set(metadata.hydrateParam, selected);
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Hydration failed: ${response.status}`);
    }
    const options = queueFilterOptionsFromResponse(await response.json(), metadata);
    const option = options.find((item) => item.id === selected);
    if (!option) {
      return;
    }
    if (canonicalInput.value.trim() !== selected) {
      return;
    }
    canonicalInput.value = option.id;
    input.value = option.label || option.id;
  } catch {
    input.dataset.filterEnhancedState = 'error';
  }
}

function enhanceQueueFilterControl(control: HTMLElement): boolean {
  if (control.dataset.filterEnhancedInitialized === 'true') {
    return false;
  }
  const metadata = queueFilterMetadataFromElement(control);
  const input = control.querySelector<HTMLInputElement>('[data-filter-enhanced-input="true"]');
  if (!metadata || !input || !input.name) {
    return false;
  }

  const canonicalInput = document.createElement('input');
  canonicalInput.type = 'hidden';
  canonicalInput.name = metadata.name;
  canonicalInput.value = input.value;
  canonicalInput.dataset.filterCanonicalInput = 'true';
  input.removeAttribute('name');
  input.dataset.filterDisplayInput = 'true';
  input.setAttribute('aria-expanded', 'false');
  control.appendChild(canonicalInput);

  const resolver = new ApiResolver<QueueFilterOptionRecord>({
    endpoint: metadata.endpointURL,
    queryParam: metadata.searchParam,
    params: metadata.controlType === 'remote_select' ? { per_page: '25' } : { per_page: '10' },
    transform: (response) => queueFilterOptionsFromResponse(response, metadata),
  });
  input.addEventListener('input', () => {
    canonicalInput.value = input.value.trim();
    input.dataset.filterEnhancedState = '';
  });

  const searchBox = new SearchBox<QueueFilterOptionRecord>({
    input,
    container: control,
    resolver,
    renderer: queueFilterRenderer(metadata.renderer),
    minChars: metadata.controlType === 'remote_select' ? 0 : 1,
    debounceMs: 200,
    maxResults: metadata.controlType === 'remote_select' ? 25 : 10,
    emptyText: 'No matching options',
    loadingText: 'Loading options...',
    onSelect: (result) => {
      canonicalInput.value = result.id;
      input.dataset.filterEnhancedState = 'selected';
      dispatchQueueFilterChange(control, metadata, canonicalInput.value);
    },
    onClear: () => {
      canonicalInput.value = '';
      input.dataset.filterEnhancedState = '';
      dispatchQueueFilterChange(control, metadata, '');
    },
    onError: () => {
      input.dataset.filterEnhancedState = 'error';
    },
  });
  try {
    searchBox.init();
  } catch {
    canonicalInput.remove();
    input.name = metadata.name;
    delete input.dataset.filterDisplayInput;
    return false;
  }
  input.addEventListener('focus', () => {
    if (metadata.controlType === 'remote_select' && !input.value.trim()) {
      void searchBox.search('');
    }
  });
  input.addEventListener('change', () => {
    if (input.dataset.filterEnhancedState === 'selected') {
      return;
    }
    canonicalInput.value = input.value.trim();
    dispatchQueueFilterChange(control, metadata, canonicalInput.value);
  });

  control.dataset.filterEnhancedInitialized = 'true';
  void hydrateQueueFilterInput(input, canonicalInput, metadata);
  return true;
}

export function initAssignmentQueueFilterTypeaheads(container?: ParentNode): number {
  if (typeof document === 'undefined') {
    return 0;
  }
  const root = container ?? document;
  return Array.from(root.querySelectorAll<HTMLElement>('[data-filter-enhanced="true"]'))
    .reduce((count, control) => count + (enhanceQueueFilterControl(control) ? 1 : 0), 0);
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
    enhanced_filter_selects: raw.enhanced_filter_selects === true,
    filter_controls: normalizeQueueFilterControls(raw.filter_controls),
    review_actor_id: asString(raw.review_actor_id) || undefined,
    review_aggregate_counts: normalizeNumberRecord(raw.review_aggregate_counts, { trimKeys: true, omitBlankKeys: true }),
    review_aggregate_counts_unavailable: asStringArray(raw.review_aggregate_counts_unavailable),
    review_aggregate_counts_degraded: asStringArray(raw.review_aggregate_counts_degraded),
    grouping: normalizeAssignmentListGroupingMeta(raw.grouping),
    family_total: asNumber(raw.family_total) || undefined,
    assignment_total: asNumber(raw.assignment_total) || undefined,
  };
}

function normalizeAssignmentListGroupingMeta(value: unknown): AssignmentListGroupingMeta | undefined {
  const raw = asRecord(value);
  if (!raw) {
    return undefined;
  }
  const capabilitiesRaw = asRecord(raw.capabilities);
  const serverFamilyRaw = asRecord(capabilitiesRaw.server_family);
  const supportedSortKeys = Array.isArray(raw.supported_sort_keys)
    ? raw.supported_sort_keys.map((entry) => asString(entry)).filter((entry): entry is AssignmentSortKey => Boolean(entry))
    : undefined;
  return {
    enabled: raw.enabled === true,
    mode: asString(raw.mode) || 'family_id',
    group_by: asString(raw.group_by) || 'family_id',
    scope: asString(raw.scope) || 'current_page',
    row_count: asNumber(raw.row_count),
    group_count: asNumber(raw.group_count),
    assignment_count: asNumber(raw.assignment_count),
    family_total: asNumber(raw.family_total) || undefined,
    assignment_total: asNumber(raw.assignment_total) || undefined,
    supported_modes: Array.isArray(raw.supported_modes)
      ? raw.supported_modes.map((m) => asString(m)).filter(Boolean)
      : ['family_id'],
    supported_sort_keys: supportedSortKeys,
    strategy: asString(raw.strategy) || 'page_local',
    capabilities: {
      server_family: {
        supported: serverFamilyRaw.supported === true,
        reason_code: asString(serverFamilyRaw.reason_code) || undefined,
      },
    },
  };
}

function normalizeBulkFilterSnapshot(value: unknown): BulkFilterSnapshot {
  const raw = asRecord(value);
  const summaryRaw = Array.isArray(raw.filter_summary) ? raw.filter_summary : [];
  return {
    selectionScope: 'filter_snapshot',
    snapshotId: asString(raw.snapshot_id),
    requested: asNumber(raw.requested),
    filters: asRecord(raw.filters),
    filterSummary: summaryRaw.map((item) => asString(item)).filter(Boolean),
    createdAt: asString(raw.created_at),
    expiresAt: asString(raw.expires_at),
  };
}

function normalizeAssignmentPriority(value: unknown): AssignmentPriority | '' {
  const normalized = asString(value).toLowerCase();
  return normalized === 'low' || normalized === 'normal' || normalized === 'high' || normalized === 'urgent'
    ? normalized
    : '';
}

function filterSnapshotBulkIdempotencyKey(snapshotId: string, action: string, options: { assigneeId?: string; priority?: AssignmentPriority } = {}): string {
  return [
    'translation_queue_filter_snapshot',
    asString(snapshotId),
    asString(action),
    asString(options.assigneeId),
    asString(options.priority),
  ].join(':');
}

export function buildAssignmentListQuery(state: AssignmentListQueryState = {}): string {
  const params = new URLSearchParams();
  setSearchParam(params, 'status', state.status);
  setSearchParam(params, 'assignee_id', state.assigneeId);
  setSearchParam(params, 'reviewer_id', state.reviewerId);
  setSearchParam(params, 'due_state', state.dueState);
  setSearchParam(params, 'locale', state.locale);
  setSearchParam(params, 'priority', state.priority);
  setSearchParam(params, 'entity_type', state.entityType);
  setSearchParam(params, 'review_state', state.reviewState);
  setSearchParam(params, 'family_id', state.familyId);
  setNumberSearchParam(params, 'page', state.page, { min: 1 });
  setNumberSearchParam(params, 'per_page', state.perPage, { min: 1 });
  setSearchParam(params, 'sort', state.sort);
  setSearchParam(params, 'order', state.order);
  setSearchParam(params, 'group_by', state.groupBy);
  setSearchParam(params, 'group_strategy', state.groupStrategy);
  return params.toString();
}

export function snapshotFiltersFromQueryState(state: AssignmentListQueryState = {}): Record<string, string> {
  const filters: Record<string, string> = {};
  const assign = (key: string, value: unknown) => {
    const normalized = asString(value);
    if (normalized) {
      filters[key] = normalized;
    }
  };
  assign('status', state.status);
  assign('assignee_id', state.assigneeId);
  assign('reviewer_id', state.reviewerId);
  assign('due_state', state.dueState);
  assign('locale', state.locale);
  assign('priority', state.priority);
  assign('entity_type', state.entityType);
  assign('review_state', state.reviewState);
  assign('family_id', state.familyId);
  assign('sort', state.sort);
  assign('order', state.order);
  return filters;
}

export function buildAssignmentListURL(endpoint: string, state: AssignmentListQueryState = {}): string {
  const query = buildAssignmentListQuery(state);
  if (!query) {
    return endpoint;
  }
  return buildEndpointURL(endpoint, new URLSearchParams(query), { preserveAbsolute: true });
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
    assignee_label: asString(raw.assignee_label) || undefined,
    reviewer_id: asString(raw.reviewer_id),
    reviewer_label: asString(raw.reviewer_label) || undefined,
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

function normalizeServerFamilyParentRow(value: unknown, expandedGroups: Set<string>): ServerFamilyParentRow {
  const raw = asRecord(value);
  const expansionRaw = asRecord(raw.expansion);
  const paramsRaw = asRecord(expansionRaw.params);
  const familyID = asString(raw.family_id);
  return {
    id: asString(raw.id) || `family:${familyID}`,
    row_type: 'family',
    family_id: familyID,
    family_label: asString(raw.family_label) || asString(raw.source_title) || familyID,
    entity_type: asString(raw.entity_type),
    source_record_id: asString(raw.source_record_id),
    source_locale: asString(raw.source_locale),
    source_title: asString(raw.source_title),
    source_path: asString(raw.source_path),
    assignment_count: asNumber(raw.assignment_count),
    locale_count: asNumber(raw.locale_count),
    target_locales: Array.isArray(raw.target_locales) ? raw.target_locales.map((item) => asString(item)).filter(Boolean) : [],
    status_counts: normalizeNumberRecord(raw.status_counts, { trimKeys: true, omitBlankKeys: true }),
    due_state_counts: normalizeNumberRecord(raw.due_state_counts, { trimKeys: true, omitBlankKeys: true }),
    priority_counts: normalizeNumberRecord(raw.priority_counts, { trimKeys: true, omitBlankKeys: true }),
    family_blocker_count: raw.family_blocker_count === null || raw.family_blocker_count === undefined ? null : asNumber(raw.family_blocker_count),
    family_blocker_count_available: raw.family_blocker_count_available === true,
    family_blocker_count_reason: asString(raw.family_blocker_count_reason),
    action_hints: normalizeNumberRecord(raw.action_hints, { trimKeys: true, omitBlankKeys: true }),
    expansion: {
      href: asString(expansionRaw.href),
      route: asString(expansionRaw.route),
      params: Object.fromEntries(Object.entries(paramsRaw).map(([key, item]) => [key, asString(item)])),
      query: asRecord(expansionRaw.query),
    },
    expanded: expandedGroups.has(familyID),
    children: [],
  };
}

export function normalizeAssignmentListResponse(value: unknown): AssignmentListResponse {
  const raw = asRecord(value);
  const meta = normalizeAssignmentListMeta(raw.meta);
  const data = Array.isArray(raw.data) ? raw.data : [];
  if (meta.grouping?.enabled) {
    const rawRows = data
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row))
      .map((row) => ({ ...row }));
    return {
      data: rawRows as unknown as AssignmentListRow[],
      meta,
    };
  }
  return {
    data: data.map((row) => normalizeAssignmentListRow(row)),
    meta,
  };
}

async function fetchServerFamilyChildren(expansion: ServerFamilyExpansion): Promise<{ rows: AssignmentListRow[]; meta: ServerFamilyParentRow['childMeta'] }> {
  const response = await httpRequest(expansion.href, { method: 'GET' });
  if (!response.ok) {
    throw await buildQueueRequestError(response, 'Failed to load family assignments');
  }
  const raw = asRecord(await response.json());
  const metaRaw = asRecord(raw.meta);
  const data = Array.isArray(raw.data) ? raw.data : [];
  return {
    rows: data.map((row) => normalizeAssignmentListRow(row)),
    meta: {
      page: asNumber(metaRaw.page) || 1,
      per_page: asNumber(metaRaw.per_page) || 25,
      total: asNumber(metaRaw.total),
      has_next: metaRaw.has_next === true,
    },
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
  if (request.channel) {
    payload.channel = request.channel;
  }
  const response = await httpRequest(buildAssignmentActionURL(endpoint, assignmentId, action), {
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
    entityType: preset.query.entity_type,
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

// T06: Action overflow menu types
type QueueActionType = 'claim' | 'release' | 'approve' | 'reject' | 'archive';
type QueueActionCategory = 'lifecycle' | 'review' | 'management';

interface QueueAction {
  type: QueueActionType;
  category: QueueActionCategory;
  label: string;
  enabled: boolean;
  disabledReason: string;
  pending: boolean;
  pendingLabel: string;
  dataAction: string;
  ariaLabel: string;
  buttonClass: string;
}

// T06: Build list of available actions from row state
function buildRowActions(row: AssignmentListRow, pendingActions: Set<string>): QueueAction[] {
  const actions: QueueAction[] = [];
  const pendingClaim = pendingActions.has(`claim:${row.id}`);
  const pendingRelease = pendingActions.has(`release:${row.id}`);
  const pendingApprove = pendingActions.has(`approve:${row.id}`);
  const pendingReject = pendingActions.has(`reject:${row.id}`);
  const pendingArchive = pendingActions.has(`archive:${row.id}`);

  // Lifecycle actions
  const claimEnabled = row.actions.claim.enabled && !pendingClaim;
  actions.push({
    type: 'claim',
    category: 'lifecycle',
    label: pendingClaim ? 'Claiming…' : 'Claim',
    enabled: claimEnabled,
    disabledReason: row.actions.claim.reason || 'Claim assignment',
    pending: pendingClaim,
    pendingLabel: 'Claiming assignment…',
    dataAction: 'claim',
    ariaLabel: claimEnabled ? 'Claim assignment' : row.actions.claim.reason || 'Cannot claim assignment',
    buttonClass: BTN_SECONDARY_SM,
  });

  const releaseEnabled = row.actions.release.enabled && !pendingRelease;
  actions.push({
    type: 'release',
    category: 'lifecycle',
    label: pendingRelease ? 'Releasing…' : 'Release',
    enabled: releaseEnabled,
    disabledReason: row.actions.release.reason || 'Release assignment',
    pending: pendingRelease,
    pendingLabel: 'Releasing assignment…',
    dataAction: 'release',
    ariaLabel: releaseEnabled ? 'Release assignment' : row.actions.release.reason || 'Cannot release assignment',
    buttonClass: BTN_SECONDARY_SM,
  });

  // Review actions (if visible)
  if (shouldShowQueueReviewActions(row)) {
    const approveEnabled = row.review_actions.approve.enabled && !pendingApprove;
    actions.push({
      type: 'approve',
      category: 'review',
      label: pendingApprove ? 'Approving…' : 'Approve',
      enabled: approveEnabled,
      disabledReason: row.review_actions.approve.reason || 'Approve assignment',
      pending: pendingApprove,
      pendingLabel: 'Approving assignment…',
      dataAction: 'approve',
      ariaLabel: approveEnabled ? 'Approve assignment' : row.review_actions.approve.reason || 'Cannot approve assignment',
      buttonClass: BTN_PRIMARY_SM,
    });

    const rejectEnabled = row.review_actions.reject.enabled && !pendingReject;
    actions.push({
      type: 'reject',
      category: 'review',
      label: pendingReject ? 'Rejecting…' : 'Reject',
      enabled: rejectEnabled,
      disabledReason: row.review_actions.reject.reason || 'Reject assignment',
      pending: pendingReject,
      pendingLabel: 'Rejecting assignment…',
      dataAction: 'reject',
      ariaLabel: rejectEnabled ? 'Reject assignment' : row.review_actions.reject.reason || 'Cannot reject assignment',
      buttonClass: BTN_DANGER_SM,
    });
  }

  // Management actions (if visible)
  if (shouldShowQueueManagementActions(row)) {
    const archiveEnabled = row.review_actions.archive.enabled && !pendingArchive;
    actions.push({
      type: 'archive',
      category: 'management',
      label: pendingArchive ? 'Archiving…' : 'Archive',
      enabled: archiveEnabled,
      disabledReason: row.review_actions.archive.reason || 'Archive assignment',
      pending: pendingArchive,
      pendingLabel: 'Archiving assignment…',
      dataAction: 'archive',
      ariaLabel: archiveEnabled ? 'Archive assignment' : row.review_actions.archive.reason || 'Cannot archive assignment',
      buttonClass: BTN_SECONDARY_SM,
    });
  }

  return actions;
}

// T06: Select primary action using priority rules
function selectPrimaryAction(actions: QueueAction[], row: AssignmentListRow): QueueAction {
  // Priority 1: Enabled review action when row is in review workflow
  const inReviewWorkflow = isReviewQueueState(queueLifecycleState(row));
  if (inReviewWorkflow) {
    const enabledReview = actions.find(a => a.category === 'review' && a.enabled);
    if (enabledReview) return enabledReview;
  }

  // Priority 2: Enabled claim action
  const enabledClaim = actions.find(a => a.type === 'claim' && a.enabled);
  if (enabledClaim) return enabledClaim;

  // Priority 3: First enabled lifecycle or management action
  const firstEnabled = actions.find(a => a.enabled);
  if (firstEnabled) return firstEnabled;

  // Priority 4: First action (disabled) when all disabled
  return actions[0];
}

// T06: Render action overflow menu
function renderActionOverflow(row: AssignmentListRow, actions: QueueAction[], primaryAction: QueueAction): string {
  // Helper to map category to data-action-group value
  const getActionGroup = (category: string): string => {
    if (category === 'review') return 'review';
    if (category === 'management') return 'manage';
    return 'lifecycle';
  };

  // If 2 or fewer actions, render inline
  if (actions.length <= 2) {
    return actions.map(action => `
      <button
        type="button"
        class="${action.buttonClass}"
        data-action="${escapeAttr(action.dataAction)}"
        data-action-group="${escapeAttr(getActionGroup(action.category))}"
        data-assignment-id="${escapeAttr(row.id)}"
        ${action.enabled ? '' : 'disabled'}
        aria-disabled="${action.enabled ? 'false' : 'true'}"
        title="${escapeAttr(action.pending ? action.pendingLabel : action.disabledReason)}"
      >
        ${escapeHtml(action.label)}
      </button>
    `).join('');
  }

  // 3+ actions: Show primary + overflow
  const remainingActions = actions.filter(a => a !== primaryAction);
  const menuId = `menu-${row.id}`;

  return `
    <div class="queue-action-overflow-container">
      <button
        type="button"
        class="${primaryAction.buttonClass}"
        data-action="${escapeAttr(primaryAction.dataAction)}"
        data-action-group="${escapeAttr(getActionGroup(primaryAction.category))}"
        data-assignment-id="${escapeAttr(row.id)}"
        ${primaryAction.enabled ? '' : 'disabled'}
        aria-disabled="${primaryAction.enabled ? 'false' : 'true'}"
        title="${escapeAttr(primaryAction.pending ? primaryAction.pendingLabel : primaryAction.disabledReason)}"
      >
        ${escapeHtml(primaryAction.label)}
      </button>
      <button
        type="button"
        class="queue-action-overflow-trigger"
        data-overflow-menu="${escapeAttr(row.id)}"
        aria-label="More actions"
        aria-haspopup="true"
        aria-expanded="false"
      >
        ⋮
      </button>
      <div
        class="queue-action-overflow-menu"
        id="${escapeAttr(menuId)}"
        role="menu"
        hidden
      >
        ${remainingActions.map(action => `
          <button
            type="button"
            role="menuitem"
            class="queue-action-menu-item"
            data-action="${escapeAttr(action.dataAction)}"
            data-action-group="${escapeAttr(getActionGroup(action.category))}"
            data-assignment-id="${escapeAttr(row.id)}"
            ${action.enabled ? '' : 'disabled'}
            aria-disabled="${action.enabled ? 'false' : 'true'}"
            title="${escapeAttr(action.pending ? action.pendingLabel : action.disabledReason)}"
          >
            ${escapeHtml(action.label)}
            ${action.pending ? `<span class="action-pending-label">${escapeHtml(action.pendingLabel)}</span>` : ''}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

// T10: Selection state entry
interface SelectionEntry {
  assignmentId: string;
  expectedVersion: number;
}

function isNestedInteractiveTarget(event: Event, owner: HTMLElement): boolean {
  const target = event.target as HTMLElement | null;
  return Boolean(
    target &&
    target !== owner &&
    target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"]')
  );
}

export class AssignmentQueueScreen extends StatefulController<AssignmentQueueScreenState> {
  private config: Required<AssignmentQueueScreenConfig>;
  private container: HTMLElement | null = null;
  private response: AssignmentListResponse | null = null;
  private rows: AssignmentListRow[] = [];
  private queryState: AssignmentListQueryState;
  private activePresetId: string;
  private activeReviewPresetId = '';
  private activeReviewState: AssignmentQueueReviewState | null = null;
  private feedback: AssignmentQueueFeedback | null = null;
  private error: AssignmentQueueRequestError | Error | null = null;
  private pendingActions = new Set<string>();

  // T10: Selection state
  private selectedRows = new Map<string, SelectionEntry>();
  private bulkActionPending = false;
  private bulkSnapshotPending = false;
  private filterSnapshot: BulkFilterSnapshot | null = null;

  // T11: View mode and grouped data state
  private viewMode: ViewMode = 'flat';
  private groupedData: GroupedData | null = null;
  private serverFamilyRows: ServerFamilyParentRow[] = [];
  private expandedGroups = new Set<string>();
  private static readonly PANEL_ID = 'translation-queue';

  // Filter panel state
  private filtersExpanded = false;
  private static readonly FILTERS_STORAGE_KEY = 'go-admin:queue-filters-expanded';

  constructor(config: AssignmentQueueScreenConfig) {
    super('loading');
    const requestedPresetId = asString(config.initialPresetId);
    this.config = {
      endpoint: config.endpoint,
      bulkActionEndpoint: config.bulkActionEndpoint || resolveAssignmentBulkActionEndpoint(config.endpoint),
      bulkSnapshotEndpoint: config.bulkSnapshotEndpoint || resolveAssignmentBulkSnapshotEndpoint(config.endpoint),
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

    // T11: Restore persisted view mode and expanded groups
    const persistedViewMode = getPersistedViewMode(AssignmentQueueScreen.PANEL_ID);
    if (persistedViewMode) {
      this.viewMode = persistedViewMode;
      if (this.viewMode === 'grouped') {
        this.queryState.groupBy = 'family_id';
      } else if (this.viewMode === 'server_family') {
        this.queryState.groupBy = 'family_id';
        this.queryState.groupStrategy = 'server_family';
      }
    }
    this.expandedGroups = getPersistedExpandState(AssignmentQueueScreen.PANEL_ID);
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.loadFiltersExpandedState();
    this.render();
    void this.load();
  }

  unmount(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
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

  // T10: Selection getters
  getSelectedCount(): number {
    return this.selectedRows.size;
  }

  getSelectedIds(): string[] {
    return Array.from(this.selectedRows.keys());
  }

  isRowSelected(assignmentId: string): boolean {
    return this.selectedRows.has(assignmentId);
  }

  isAllPageSelected(): boolean {
    if (this.rows.length === 0) return false;
    return this.rows.every((row) => this.selectedRows.has(row.id));
  }

  // T10: Selection actions
  toggleRowSelection(assignmentId: string): void {
    const row = this.rows.find((r) => r.id === assignmentId);
    if (!row) return;

    this.filterSnapshot = null;
    if (this.selectedRows.has(assignmentId)) {
      this.selectedRows.delete(assignmentId);
    } else {
      this.selectedRows.set(assignmentId, {
        assignmentId: row.id,
        expectedVersion: row.version,
      });
    }
    this.render();
  }

  selectAllPage(): void {
    this.filterSnapshot = null;
    for (const row of this.rows) {
      this.selectedRows.set(row.id, {
        assignmentId: row.id,
        expectedVersion: row.version,
      });
    }
    this.render();
  }

  clearSelection(): void {
    this.selectedRows.clear();
    this.filterSnapshot = null;
    this.render();
  }

  private replaceCachedRow(row: AssignmentListRow): void {
    for (const family of this.serverFamilyRows) {
      const index = family.children.findIndex((child) => child.id === row.id);
      if (index >= 0) {
        family.children[index] = cloneRow(row);
      }
    }
  }

  async selectAllMatchingFilters(): Promise<void> {
    this.bulkSnapshotPending = true;
    this.feedback = null;
    this.render();

    try {
      const response = await httpRequest(this.config.bulkSnapshotEndpoint || resolveAssignmentBulkSnapshotEndpoint(this.config.endpoint), {
        method: 'POST',
        json: {
          filters: snapshotFiltersFromQueryState(this.queryState),
        },
      });

      if (!response.ok) {
        throw await buildQueueRequestError(response, 'Filter snapshot failed');
      }

      const raw = asRecord(await response.json());
      const snapshot = normalizeBulkFilterSnapshot(asRecord(raw.data));
      if (!snapshot.snapshotId) {
        throw new AssignmentQueueRequestError({
          message: 'Filter snapshot response did not include a snapshot id.',
          status: 500,
          code: 'INVALID_SNAPSHOT_RESPONSE',
        });
      }
      this.selectedRows.clear();
      this.filterSnapshot = snapshot;
      this.feedback = {
        kind: 'success',
        message: `${snapshot.requested} matching assignment${snapshot.requested !== 1 ? 's' : ''} selected.`,
      };
    } catch (error) {
      this.feedback = formatQueueActionError(error, 'Filter snapshot failed.');
    } finally {
      this.bulkSnapshotPending = false;
      this.render();
    }
  }

  // T10: Bulk action execution
  async runBulkAction(action: 'assign' | 'release' | 'priority' | 'archive', options?: { priority?: AssignmentPriority; reason?: string }): Promise<void> {
    if (this.selectedRows.size === 0) {
      this.feedback = { kind: 'error', message: 'No assignments selected.' };
      this.render();
      return;
    }

    const assignments: BulkActionItem[] = Array.from(this.selectedRows.values());
    this.bulkActionPending = true;
    this.feedback = null;
    this.render();

    try {
      const response = await this.executeBulkAction({
        action,
        assignments,
        reason: options?.reason,
        priority: options?.priority,
      });

      // Update rows with results
      for (const result of response.data.results) {
        if (result.success && result.assignment) {
          const index = this.rows.findIndex((r) => r.id === result.assignmentId);
          if (index >= 0) {
            this.rows[index] = cloneRow(result.assignment);
          }
          // Remove from selection on success
          this.selectedRows.delete(result.assignmentId);
        }
      }

      if (response.data.failed > 0) {
        const failedIds = response.data.results
          .filter((r) => !r.success)
          .map((r) => r.assignmentId)
          .slice(0, 3);
        this.feedback = {
          kind: 'error',
          message: `${response.data.succeeded} succeeded, ${response.data.failed} failed. Failed: ${failedIds.join(', ')}${response.data.failed > 3 ? '...' : ''}`,
        };
      } else {
        this.feedback = {
          kind: 'success',
          message: `${response.data.succeeded} assignment${response.data.succeeded !== 1 ? 's' : ''} updated.`,
        };
      }
    } catch (error) {
      this.feedback = formatQueueActionError(error, `Bulk ${action} failed.`);
    } finally {
      this.bulkActionPending = false;
      this.render();
    }
  }

  async runFilterSnapshotBulkAction(action: 'assign' | 'release' | 'priority' | 'archive', options?: { assigneeId?: string; priority?: AssignmentPriority }): Promise<void> {
    const snapshot = this.filterSnapshot;
    if (!snapshot) {
      this.feedback = { kind: 'error', message: 'No filter snapshot selected.' };
      this.render();
      return;
    }
    const actionOptions = options || this.promptFilterSnapshotActionOptions(action);
    if (actionOptions === null) {
      return;
    }
    const filterSummary = snapshot.filterSummary || [];
    const summary = filterSummary.length ? `\n\n${filterSummary.join('\n')}` : '';
    const confirmed = typeof window === 'undefined' || typeof window.confirm !== 'function'
      ? true
      : window.confirm(`Apply ${action} to ${snapshot.requested} matching assignment${snapshot.requested !== 1 ? 's' : ''}?${summary}`);
    if (!confirmed) {
      return;
    }

    this.bulkActionPending = true;
    this.feedback = null;
    this.render();

    try {
      const response = await this.executeBulkAction({
        action,
        selectionScope: 'filter_snapshot',
        snapshotId: snapshot.snapshotId,
        assigneeId: actionOptions.assigneeId,
        priority: actionOptions.priority,
        idempotencyKey: filterSnapshotBulkIdempotencyKey(snapshot.snapshotId, action, actionOptions),
      });

      if (response.data.failed > 0) {
        this.feedback = {
          kind: 'error',
          message: `${response.data.succeeded} succeeded, ${response.data.failed} failed.`,
        };
      } else {
        this.feedback = {
          kind: 'success',
          message: `${response.data.succeeded} assignment${response.data.succeeded !== 1 ? 's' : ''} updated.`,
        };
      }
      this.filterSnapshot = null;
      this.selectedRows.clear();
      await this.load();
    } catch (error) {
      this.feedback = formatQueueActionError(error, `Bulk ${action} failed.`);
    } finally {
      this.bulkActionPending = false;
      this.render();
    }
  }

  private promptFilterSnapshotActionOptions(action: 'assign' | 'release' | 'priority' | 'archive'): { assigneeId?: string; priority?: AssignmentPriority } | null {
    if (action === 'assign') {
      const fallback = this.queryState.assigneeId && this.queryState.assigneeId !== '__me__' ? this.queryState.assigneeId : '';
      const value = typeof window === 'undefined' || typeof window.prompt !== 'function'
        ? fallback
        : window.prompt('Assign matching assignments to', fallback);
      const assigneeId = asString(value);
      if (!assigneeId) {
        return null;
      }
      return { assigneeId };
    }
    if (action === 'priority') {
      const fallback = normalizeAssignmentPriority(this.queryState.priority || 'normal');
      const value = typeof window === 'undefined' || typeof window.prompt !== 'function'
        ? fallback
        : window.prompt('Set matching assignments priority', fallback);
      const priority = normalizeAssignmentPriority(asString(value));
      if (!priority) {
        this.feedback = { kind: 'error', message: 'Priority must be low, normal, high, or urgent.' };
        this.render();
        return null;
      }
      return { priority };
    }
    return {};
  }

  private async executeBulkAction(request: BulkActionRequest): Promise<BulkActionResponse> {
    const response = await httpRequest(this.config.bulkActionEndpoint || resolveAssignmentBulkActionEndpoint(this.config.endpoint), {
      method: 'POST',
      json: {
        action: request.action,
        selection_scope: request.selectionScope || 'current_page',
        snapshot_id: request.snapshotId,
        idempotency_key: request.idempotencyKey,
        assignments: (request.assignments || []).map((a) => ({
          assignment_id: a.assignmentId,
          expected_version: a.expectedVersion,
        })),
        assignee_id: request.assigneeId,
        reason: request.reason,
        priority: request.priority,
      },
    });

    if (!response.ok) {
      throw await buildQueueRequestError(response, `Bulk ${request.action} failed`);
    }

    const raw = asRecord(await response.json());
    const data = asRecord(raw.data);
    const meta = asRecord(raw.meta);
    const results = Array.isArray(data.results) ? data.results : [];
    const requested = asNumber(meta.requested);
    const succeeded = asNumber(meta.succeeded);
    const failed = asNumber(meta.failed);
    const partial = meta.partial === true;
    const selectionScope = asString(meta.selection_scope) || 'current_page';

    return {
      data: {
        action: asString(data.action) || request.action,
        requested,
        succeeded,
        failed,
        partial,
        selectionScope,
        results: results.map((item: unknown) => {
          const r = asRecord(item);
          const error = asRecord(r.error);
          return {
            assignmentId: asString(r.assignment_id),
            success: asString(r.status) === 'succeeded',
            error: asString(error.message) || asString(r.error) || undefined,
            errorCode: asString(error.code) || asString(r.error_code) || undefined,
            assignment: r.assignment ? normalizeAssignmentListRow(r.assignment) : undefined,
          };
        }),
      },
      meta: {
        action: asString(data.action) || request.action,
        requested,
        succeeded,
        failed,
        partial,
        selection_scope: selectionScope,
      },
    };
  }

  async load(): Promise<void> {
    this.state = 'loading';
    this.error = null;
    this.render();
    try {
      const response = await fetchAssignmentList(this.config.endpoint, this.queryState);
      this.response = response;

      if (this.viewMode === 'server_family' && response.meta.grouping?.strategy === 'server_family') {
        this.groupedData = null;
        this.serverFamilyRows = (response.data as unknown[]).map((row) => normalizeServerFamilyParentRow(row, this.expandedGroups));
        this.rows = this.serverFamilyRows.flatMap((row) => row.children.map((child) => cloneRow(child)));
        this.state = this.serverFamilyRows.length ? 'ready' : 'empty';
        this.render();
        return;
      }

      this.serverFamilyRows = [];
      // T11: Handle grouped responses
      if (this.viewMode === 'grouped' && response.meta.grouping?.enabled) {
        const grouped = normalizeBackendGroupedRows(
          response.data as unknown as Record<string, unknown>[],
          {
            defaultExpanded: true,
            expandMode: 'explicit',
            expandedGroups: this.expandedGroups,
          }
        );
        if (grouped) {
          this.groupedData = grouped;
          // Extract all child rows for flat access (needed for selection state)
          this.rows = [];
          for (const group of grouped.groups) {
            for (const record of group.records) {
              this.rows.push(normalizeAssignmentListRow(record));
            }
          }
          for (const record of grouped.ungrouped) {
            this.rows.push(normalizeAssignmentListRow(record));
          }
        } else {
          // Fallback to flat if grouped parsing fails
          this.groupedData = null;
          this.rows = response.data.map((row) => cloneRow(row));
        }
      } else {
        this.groupedData = null;
        this.rows = response.data.map((row) => cloneRow(row));
      }

      this.state = this.rows.length ? 'ready' : 'empty';
    } catch (error) {
      this.error = error instanceof Error ? error : new Error(String(error));
      this.state = error instanceof AssignmentQueueRequestError && error.code === 'VERSION_CONFLICT'
        ? 'conflict'
        : 'error';
    }
    this.render();
  }

  // T11: View mode methods
  getViewMode(): ViewMode {
    return this.viewMode;
  }

  setViewMode(mode: ViewMode): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    persistViewMode(AssignmentQueueScreen.PANEL_ID, mode);

    // Update query state for grouped mode
    if (mode === 'grouped') {
      const { groupStrategy: _, ...rest } = this.queryState;
      this.queryState = { ...rest, groupBy: 'family_id' };
    } else if (mode === 'server_family') {
      const supportedServerSort = ['updated_at', 'created_at', 'due_date', 'due_state', 'priority'];
      const sort = this.queryState.sort && supportedServerSort.includes(this.queryState.sort) ? this.queryState.sort : 'updated_at';
      this.queryState = { ...this.queryState, groupBy: 'family_id', groupStrategy: 'server_family', sort, perPage: Math.min(this.queryState.perPage || 25, 100) };
    } else {
      const { groupBy: _, groupStrategy: __, ...rest } = this.queryState;
      this.queryState = rest;
    }

    this.feedback = null;
    this.clearSelection();
    void this.load();
  }

  toggleGroupExpansion(groupId: string): void {
    if (this.viewMode === 'server_family') {
      void this.toggleServerFamilyExpansion(groupId);
      return;
    }
    if (!this.groupedData) return;

    this.groupedData = toggleGroupExpand(this.groupedData, groupId);
    this.expandedGroups = getExpandedGroupIds(this.groupedData);
    persistExpandState(AssignmentQueueScreen.PANEL_ID, this.expandedGroups);
    this.render();
  }

  private async toggleServerFamilyExpansion(groupId: string): Promise<void> {
    const row = this.serverFamilyRows.find((item) => item.family_id === groupId);
    if (!row) return;
    row.expanded = !row.expanded;
    if (row.expanded) {
      this.expandedGroups.add(groupId);
    } else {
      this.expandedGroups.delete(groupId);
    }
    persistExpandState(AssignmentQueueScreen.PANEL_ID, this.expandedGroups);
    if (!row.expanded || row.children.length || row.loading) {
      this.rows = this.serverFamilyRows.flatMap((item) => item.children.map((child) => cloneRow(child)));
      this.render();
      return;
    }
    row.loading = true;
    row.error = '';
    this.render();
    try {
      const result = await fetchServerFamilyChildren(row.expansion);
      row.children = result.rows;
      row.childMeta = result.meta;
      this.rows = this.serverFamilyRows.flatMap((item) => item.children.map((child) => cloneRow(child)));
    } catch (error) {
      row.error = error instanceof Error ? error.message : 'Failed to load family assignments.';
    } finally {
      row.loading = false;
      this.render();
    }
  }

  expandAllFamilyGroups(): void {
    if (this.viewMode === 'server_family') {
      for (const row of this.serverFamilyRows) {
        this.expandedGroups.add(row.family_id);
        row.expanded = true;
      }
      persistExpandState(AssignmentQueueScreen.PANEL_ID, this.expandedGroups);
      this.render();
      return;
    }
    if (!this.groupedData) return;

    this.groupedData = expandAllGroups(this.groupedData);
    this.expandedGroups = getExpandedGroupIds(this.groupedData);
    persistExpandState(AssignmentQueueScreen.PANEL_ID, this.expandedGroups);
    this.render();
  }

  collapseAllFamilyGroups(): void {
    if (this.viewMode === 'server_family') {
      this.expandedGroups.clear();
      for (const row of this.serverFamilyRows) {
        row.expanded = false;
      }
      persistExpandState(AssignmentQueueScreen.PANEL_ID, this.expandedGroups);
      this.render();
      return;
    }
    if (!this.groupedData) return;

    this.groupedData = collapseAllGroups(this.groupedData);
    this.expandedGroups = getExpandedGroupIds(this.groupedData);
    persistExpandState(AssignmentQueueScreen.PANEL_ID, this.expandedGroups);
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
    this.replaceCachedRow(this.rows[index]);
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
      this.replaceCachedRow(this.rows[index]);
      this.feedback = {
        kind: 'success',
        message: action === 'claim' ? 'Assignment claimed.' : 'Assignment released back to the pool.',
      };
    } catch (error) {
      this.rows[index] = previous;
      this.replaceCachedRow(previous);
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
      this.replaceCachedRow(this.rows[index]);
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
    this.filterSnapshot = null;
    this.selectedRows.clear();
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
    this.filterSnapshot = null;
    this.selectedRows.clear();
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
    this.filterSnapshot = null;
    this.selectedRows.clear();
    this.feedback = null;
    void this.load();
  }

  private updateNamedFilter(name: string, value: string): void {
    const normalized = value.trim();
    switch (name) {
      case 'status':
        this.updateFilter({ status: normalized || undefined });
        break;
      case 'due_state':
        this.updateFilter({ dueState: (normalized || undefined) as AssignmentDueState | undefined });
        break;
      case 'priority':
        this.updateFilter({ priority: normalized || undefined });
        break;
      case 'entity_type':
        this.updateFilter({ entityType: normalized || undefined });
        break;
      case 'locale':
        this.updateFilter({ locale: normalized || undefined });
        break;
      case 'assignee_id':
        this.updateFilter({ assigneeId: normalized || undefined });
        break;
      case 'reviewer_id':
        this.updateFilter({ reviewerId: normalized || undefined });
        break;
      case 'family_id':
        this.updateFilter({ familyId: normalized || undefined });
        break;
      case 'sort':
        this.updateFilter({ sort: (normalized || undefined) as AssignmentSortKey | undefined });
        break;
      case 'order':
        this.updateFilter({ order: (normalized || undefined) as 'asc' | 'desc' | undefined });
        break;
    }
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

  private getActiveFilterCount(): number {
    let count = 0;
    if (this.queryState.status) count++;
    if (this.queryState.dueState) count++;
    if (this.queryState.priority) count++;
    if (this.queryState.entityType) count++;
    if (this.queryState.locale) count++;
    if (this.queryState.assigneeId) count++;
    if (this.queryState.reviewerId) count++;
    if (this.queryState.familyId) count++;
    if (this.activeReviewState) count++;
    if (this.queryState.sort && this.queryState.sort !== (this.response?.meta.default_sort.key ?? 'updated_at')) count++;
    if (this.queryState.order && this.queryState.order !== (this.response?.meta.default_sort.order ?? 'desc')) count++;
    return count;
  }

  private removeFilter(filterName: string): void {
    const updates: Partial<AssignmentListQueryState> = {};
    switch (filterName) {
      case 'status':
        updates.status = undefined;
        break;
      case 'due_state':
        updates.dueState = undefined;
        break;
      case 'priority':
        updates.priority = undefined;
        break;
      case 'entity_type':
        updates.entityType = undefined;
        break;
      case 'locale':
        updates.locale = undefined;
        break;
      case 'assignee_id':
        updates.assigneeId = undefined;
        break;
      case 'reviewer_id':
        updates.reviewerId = undefined;
        break;
      case 'family_id':
        updates.familyId = undefined;
        break;
      case 'sort':
        updates.sort = undefined;
        break;
      case 'order':
        updates.order = undefined;
        break;
    }
    this.updateFilter(updates);
  }

  private renderFilterChips(): string {
    const activeFilters: Array<{ name: string; label: string; value: string }> = [];

    if (this.queryState.status) {
      activeFilters.push({
        name: 'status',
        label: 'Status',
        value: humanizeToken(this.queryState.status),
      });
    }
    if (this.queryState.dueState) {
      activeFilters.push({
        name: 'due_state',
        label: 'Due State',
        value: humanizeToken(this.queryState.dueState),
      });
    }
    if (this.queryState.priority) {
      activeFilters.push({
        name: 'priority',
        label: 'Priority',
        value: humanizeToken(this.queryState.priority),
      });
    }
    if (this.queryState.entityType) {
      activeFilters.push({
        name: 'entity_type',
        label: 'Type',
        value: humanizeToken(this.queryState.entityType),
      });
    }
    if (this.queryState.locale) {
      activeFilters.push({
        name: 'locale',
        label: 'Locale',
        value: this.queryState.locale,
      });
    }
    if (this.queryState.assigneeId) {
      activeFilters.push({
        name: 'assignee_id',
        label: 'Assignee',
        value: this.queryState.assigneeId,
      });
    }
    if (this.queryState.reviewerId) {
      activeFilters.push({
        name: 'reviewer_id',
        label: 'Reviewer',
        value: this.queryState.reviewerId,
      });
    }
    if (this.queryState.familyId) {
      activeFilters.push({
        name: 'family_id',
        label: 'Family',
        value: this.queryState.familyId,
      });
    }
    if (this.activeReviewState) {
      activeFilters.push({
        name: 'review_state',
        label: 'Review State',
        value: humanizeToken(this.activeReviewState),
      });
    }
    if (this.queryState.sort && this.queryState.sort !== (this.response?.meta.default_sort.key ?? 'updated_at')) {
      activeFilters.push({
        name: 'sort',
        label: 'Sort',
        value: humanizeToken(this.queryState.sort),
      });
    }
    if (this.queryState.order && this.queryState.order !== (this.response?.meta.default_sort.order ?? 'desc')) {
      activeFilters.push({
        name: 'order',
        label: 'Order',
        value: this.queryState.order === 'asc' ? 'Ascending' : 'Descending',
      });
    }

    if (activeFilters.length === 0) {
      return '';
    }

    return `
      <div class="queue-filter-chips-container">
        <div class="queue-filter-chips">
          ${activeFilters.map((filter) => `
            <button
              type="button"
              class="queue-filter-chip"
              data-remove-filter="${escapeAttr(filter.name)}"
              aria-label="${escapeAttr(`Remove ${filter.label} filter: ${filter.value}`)}"
              title="${escapeAttr(`Remove ${filter.label}: ${filter.value}`)}"
            >
              <span class="queue-filter-chip-label">${escapeHtml(filter.label)}:</span>
              <span class="queue-filter-chip-value">${escapeHtml(filter.value)}</span>
              <svg class="queue-filter-chip-remove" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          `).join('')}
          <button
            type="button"
            class="queue-filter-chip queue-filter-chip-clear-all"
            data-clear-filters="true"
            aria-label="Clear all filters"
            title="Clear all filters"
          >
            <span>Clear all</span>
          </button>
        </div>
      </div>
    `;
  }

  private toggleFiltersExpanded(): void {
    this.filtersExpanded = !this.filtersExpanded;
    this.persistFiltersExpanded();
    this.render();
  }

  private toggleReviewSelectorDropdown(): void {
    const menu = this.container?.querySelector<HTMLElement>('[data-review-selector-menu]');
    const toggle = this.container?.querySelector<HTMLElement>('[data-review-selector-toggle]');
    const chevron = this.container?.querySelector<HTMLElement>('[data-review-selector-chevron]');

    if (!menu || !toggle) return;

    const isHidden = menu.classList.contains('hidden');

    if (isHidden) {
      // Open dropdown
      menu.classList.remove('hidden');
      toggle.setAttribute('aria-expanded', 'true');
      if (chevron) chevron.classList.add('rotate-180');

      // Add document listener for outside clicks
      const closeOnOutsideClick = (event: MouseEvent) => {
        const target = event.target as Node;
        const container = this.container?.querySelector<HTMLElement>('[data-review-selector-container]');
        if (container && !container.contains(target)) {
          this.closeReviewSelectorDropdown();
          document.removeEventListener('click', closeOnOutsideClick);
        }
      };

      // Add document listener for Escape key
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          this.closeReviewSelectorDropdown();
          document.removeEventListener('keydown', closeOnEscape);
          toggle.focus();
        }
      };

      // Delay to avoid immediate close from the same click
      setTimeout(() => {
        document.addEventListener('click', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
      }, 0);
    } else {
      this.closeReviewSelectorDropdown();
    }
  }

  private closeReviewSelectorDropdown(): void {
    const menu = this.container?.querySelector<HTMLElement>('[data-review-selector-menu]');
    const toggle = this.container?.querySelector<HTMLElement>('[data-review-selector-toggle]');
    const chevron = this.container?.querySelector<HTMLElement>('[data-review-selector-chevron]');

    if (!menu) return;

    menu.classList.add('hidden');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (chevron) chevron.classList.remove('rotate-180');
  }

  private persistFiltersExpanded(): void {
    try {
      localStorage.setItem(AssignmentQueueScreen.FILTERS_STORAGE_KEY, this.filtersExpanded ? 'true' : 'false');
    } catch {
      // Ignore storage errors
    }
  }

  private loadFiltersExpandedState(): void {
    try {
      this.filtersExpanded = localStorage.getItem(AssignmentQueueScreen.FILTERS_STORAGE_KEY) === 'true';
    } catch {
      this.filtersExpanded = false;
    }
  }

  private clearAllFilters(): void {
    this.queryState = {
      ...this.queryState,
      status: undefined,
      dueState: undefined,
      priority: undefined,
      entityType: undefined,
      locale: undefined,
      assigneeId: undefined,
      reviewerId: undefined,
      familyId: undefined,
      sort: undefined,
      order: undefined,
      page: 1,
    };
    this.activePresetId = 'custom';
    this.activeReviewPresetId = '';
    this.activeReviewState = null;
    this.filterSnapshot = null;
    this.selectedRows.clear();
    void this.load();
  }

  private render(): void {
    if (!this.container) {
      return;
    }

    this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        ${this.renderFeedback()}
        ${this.renderBulkActionBar()}
        ${this.renderFilterSnapshotBar()}
        ${this.renderReviewStateBar()}
        ${this.renderPresetBar()}
        ${this.renderFilters()}
        ${this.renderContextBar()}
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

  // T10: Bulk action bar - uses floating overlay pattern from input.css
  private renderBulkActionBar(): string {
    const selectedCount = this.selectedRows.size;
    const isPending = this.bulkActionPending;
    const hiddenClass = selectedCount === 0 ? 'hidden' : '';

    return `
      <div class="bulk-actions-overlay ${hiddenClass}" data-bulk-action-bar="true">
        <div class="bulk-actions-bar" role="toolbar" aria-label="Bulk actions for ${selectedCount} selected assignment${selectedCount !== 1 ? 's' : ''}">
          <button type="button" class="bulk-close-btn" data-bulk-clear="true" ${isPending ? 'disabled' : ''} title="Clear selection">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            <span class="sr-only">Clear selection</span>
          </button>
          <span class="bulk-count-text"><span id="selected-count">${selectedCount}</span> selected</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="bulk-action-btn"
              data-bulk-action="release"
              ${isPending ? 'disabled' : ''}
              title="Release selected assignments back to the pool"
            >
              ${isPending ? 'Processing…' : 'Release'}
            </button>
            <button
              type="button"
              class="bulk-action-btn bulk-action-btn--danger"
              data-bulk-action="archive"
              ${isPending ? 'disabled' : ''}
              title="Archive selected assignments"
            >
              ${isPending ? 'Processing…' : 'Archive'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderFilterSnapshotBar(): string {
    // T05: Filter snapshot bar now only handles bulk selection state
    // The context bar handles regular result counts to avoid duplication
    const snapshot = this.filterSnapshot;
    if (!snapshot) {
      return '';
    }
    const isPending = this.bulkSnapshotPending || this.bulkActionPending;
    const summary = (snapshot.filterSummary || []).slice(0, 4);
    return `
      <section class="filter-snapshot-bar" data-filter-snapshot-bar="true" aria-label="All matching filter selection">
        <div class="filter-snapshot-copy">
          <strong>${snapshot.requested} matching assignment${snapshot.requested !== 1 ? 's' : ''} selected</strong>
          ${summary.length ? `<span>${summary.map((item) => escapeHtml(item)).join(' · ')}</span>` : ''}
        </div>
        <div class="filter-snapshot-actions">
          <button type="button" class="${BTN_SECONDARY_SM}" data-filter-snapshot-clear="true" ${isPending ? 'disabled' : ''}>Clear</button>
          <button type="button" class="${BTN_SECONDARY_SM}" data-filter-snapshot-action="assign" ${isPending || snapshot.requested === 0 ? 'disabled' : ''}>Assign</button>
          <button type="button" class="${BTN_SECONDARY_SM}" data-filter-snapshot-action="release" ${isPending || snapshot.requested === 0 ? 'disabled' : ''}>Release</button>
          <button type="button" class="${BTN_SECONDARY_SM}" data-filter-snapshot-action="priority" ${isPending || snapshot.requested === 0 ? 'disabled' : ''}>Priority</button>
          <button type="button" class="${BTN_SECONDARY_SM}" data-filter-snapshot-action="archive" ${isPending || snapshot.requested === 0 ? 'disabled' : ''}>Archive</button>
        </div>
      </section>
    `;
  }

  private renderPresetBar(): string {
    return `
      <div class="panel-tabs" role="group" aria-label="Saved queue filters">
        <div class="panel-tabs-container">
          ${this.savedFilterPresets.map((preset) => `
            <button
              type="button"
              class="panel-tab ${this.activePresetId === preset.id ? 'panel-tab-active' : ''}"
              data-preset-id="${escapeAttr(preset.id)}"
              aria-pressed="${this.activePresetId === preset.id ? 'true' : 'false'}"
              title="${escapeAttr(preset.description || preset.label)}"
            >
              <span class="panel-tab-label">${escapeHtml(preset.label)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderReviewStateBar(): string {
    // This method is kept for backwards compatibility during transition
    // The review selector will be integrated into the toolbar in T04
    return '';
  }

  private renderReviewSelector(): string {
    if (!this.savedReviewFilterPresets.length) {
      return '';
    }
    const counts = this.response?.meta.review_aggregate_counts || {};
    const actorID = this.response?.meta.review_actor_id;
    const reviewerStateEnabled = Boolean(actorID);
    const activePreset = this.savedReviewFilterPresets.find(p => p.id === this.activeReviewPresetId);
    const buttonLabel = activePreset ? activePreset.label : 'Review State';
    const activeCount = activePreset ? (counts[activePreset.id] ?? 0) : 0;

    return `
      <div class="relative" data-review-selector-container="true">
        <h2 class="sr-only">Reviewer states</h2>
        <button
          type="button"
          class="${BTN_SECONDARY_SM} ${!reviewerStateEnabled ? 'opacity-50 cursor-not-allowed' : ''}"
          data-review-selector-toggle="true"
          aria-expanded="false"
          aria-haspopup="true"
          aria-label="Select review state filter"
          ${reviewerStateEnabled ? '' : 'disabled aria-disabled="true"'}
          title="${escapeAttr(reviewerStateEnabled ? 'Filter by review state' : 'Reviewer metadata is required to use review filters.')}"
        >
          <span>${escapeHtml(buttonLabel)}</span>
          ${activePreset ? `<span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">${activeCount}</span>` : ''}
          <svg class="h-4 w-4 transition-transform" data-review-selector-chevron="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div
          class="hidden absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-50"
          data-review-selector-menu="true"
          role="menu"
          aria-orientation="vertical"
        >
          <div class="py-1">
            ${this.savedReviewFilterPresets.map((preset) => `
              <button
                type="button"
                class="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${
                  this.activeReviewPresetId === preset.id ? 'bg-blue-50 text-blue-700' : ''
                }"
                data-review-preset-id="${escapeAttr(preset.id)}"
                role="menuitem"
                title="${escapeAttr(preset.description || preset.label)}"
              >
                <span>${escapeHtml(preset.label)}</span>
                <span class="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                  this.activeReviewPresetId === preset.id
                    ? 'bg-blue-200 text-blue-900'
                    : 'bg-gray-100 text-gray-700'
                }">${counts[preset.id] ?? 0}</span>
              </button>
            `).join('')}
          </div>
          ${!reviewerStateEnabled ? `
            <div class="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
              Reviewer queue states are available when reviewer metadata is present.
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }


  // T05: Context bar - result counts and view-mode controls
  private renderContextBar(): string {
    const total = this.response?.meta.total ?? 0;
    const pageCount = this.visibleRows.length;
    const isGrouped = this.viewMode === 'grouped';
    const isServerFamily = this.viewMode === 'server_family';
    const isFlat = !isGrouped && !isServerFamily;
    const groupCount = this.groupedData?.totalGroups ?? 0;
    const assignmentCount = this.response?.meta.grouping?.assignment_count ?? this.rows.length;
    const serverFamilySupported = this.response?.meta.grouping?.capabilities?.server_family?.supported === true;
    const serverFamilyCount = this.response?.meta.grouping?.family_total ?? this.response?.meta.family_total ?? this.serverFamilyRows.length;
    const serverAssignmentCount = this.response?.meta.grouping?.assignment_total ?? this.response?.meta.assignment_total ?? 0;

    // Build count text based on view mode
    let countText = '';
    let scopeText = '';

    if (isServerFamily) {
      countText = `${this.serverFamilyRows.length} of ${serverFamilyCount} ${serverFamilyCount === 1 ? 'family' : 'families'} · ${serverAssignmentCount} assignments`;
      scopeText = '(server-side family pages)';
    } else if (isGrouped && this.groupedData) {
      countText = `${groupCount} ${groupCount === 1 ? 'family' : 'families'} · ${assignmentCount} assignments`;
      scopeText = '(page-local counts)';
    } else {
      countText = `Showing ${pageCount} of ${total} ${total === 1 ? 'assignment' : 'assignments'}`;
      scopeText = '';
    }

    return `
      <div class="bg-white border-b border-gray-200 px-6 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3 text-sm">
            <span class="font-medium text-gray-700">${countText}</span>
            ${scopeText ? `<span class="text-gray-500">${scopeText}</span>` : ''}
          </div>
          <div class="flex items-center gap-3">
            ${(isGrouped || isServerFamily) ? `
              <button type="button" class="${BTN_SECONDARY_SM}" data-expand-all="true" title="Expand all ${isServerFamily ? 'visible families' : 'groups'}">
                Expand all
              </button>
              <button type="button" class="${BTN_SECONDARY_SM}" data-collapse-all="true" title="Collapse all ${isServerFamily ? 'visible families' : 'groups'}">
                Collapse all
              </button>
            ` : ''}
            <div role="group" aria-label="View mode" class="inline-flex rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors ${isFlat ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}"
                data-view-mode="flat"
                aria-pressed="${isFlat}"
                title="Show assignments as a flat list"
              >
                <svg class="h-4 w-4 inline-block" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M2 3h12v2H2zM2 7h12v2H2zM2 11h12v2H2z"/>
                </svg>
                <span class="ml-1">List</span>
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${isGrouped ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}"
                data-view-mode="grouped"
                aria-pressed="${isGrouped}"
                title="Group assignments by translation family"
              >
                <svg class="h-4 w-4 inline-block" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M2 2h4v4H2zM2 10h4v4H2zM8 2h6v2H8zM8 6h6v2H8zM8 10h6v2H8zM8 14h6v2H8z"/>
                </svg>
                <span class="ml-1">Grouped</span>
              </button>
              ${(serverFamilySupported || isServerFamily) ? `
                <button
                  type="button"
                  class="px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${isServerFamily ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'} ${serverFamilySupported ? '' : 'opacity-50 cursor-not-allowed'}"
                  data-view-mode="server_family"
                  aria-pressed="${isServerFamily}"
                  title="${escapeAttr(serverFamilySupported ? 'Use server-side family pagination' : 'Server-side family grouping is unavailable for this repository')}"
                  ${serverFamilySupported ? '' : 'disabled aria-disabled="true"'}
                >
                  <svg class="h-4 w-4 inline-block" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M3 2h10v3H3zM2 7h5v3H2zM9 7h5v3H9zM2 12h5v3H2zM9 12h5v3H9z"/>
                  </svg>
                  <span class="ml-1">Families</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderFilters(): string {
    const rows = this.visibleRows;
    const statuses = ['', 'open', 'assigned', 'in_progress', 'in_review', 'changes_requested', 'approved', 'archived'];
    const dueStates: AssignmentDueState[] = ['none', 'on_track', 'due_soon', 'overdue'];
    const priorities = ['', 'low', 'normal', 'high', 'urgent'];
    const locales = ['', ...uniqueFilterOptions(rows.map((row) => row.target_locale))];
    const entityTypes = ['', ...uniqueFilterOptions(rows.map((row) => row.entity_type))];
    const assignees = ['', ...uniqueFilterOptions(rows.map((row) => row.assignee_id))];
    const reviewers = ['', ...uniqueFilterOptions(rows.map((row) => row.reviewer_id))];
    const sortKeys = this.response?.meta.supported_sort_keys?.length
      ? this.response.meta.supported_sort_keys
      : ['updated_at', 'due_date', 'priority', 'status', 'locale'];
    const activeFilterCount = this.getActiveFilterCount();
    const chevronRotation = this.filtersExpanded ? 'rotate-180' : '';

    return `
      <div class="bg-white border-b border-gray-200 px-6 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="${BTN_SECONDARY_SM}"
              data-filters-toggle="true"
              aria-expanded="${this.filtersExpanded}"
              aria-controls="queue-filters-panel"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
              </svg>
              <span>Filters</span>
              ${activeFilterCount > 0 ? `<span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">${activeFilterCount}</span>` : ''}
              <svg class="h-4 w-4 transition-transform ${chevronRotation}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            ${this.renderReviewSelector()}
          </div>
          <div class="flex items-center gap-3">
            ${this.renderSortControls(sortKeys)}
          </div>
        </div>
        ${this.renderFilterChips()}
        <form
          id="queue-filters-panel"
          class="${this.filtersExpanded ? '' : 'hidden'} mt-4 pt-4 border-t border-gray-100"
          data-queue-filters="true"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${this.renderSelect('status', 'Status', statuses, this.queryState.status || '')}
            ${this.renderQueueFilterControl('due_state', 'Due State', ['', ...dueStates], this.queryState.dueState || '')}
            ${this.renderSelect('priority', 'Priority', priorities, this.queryState.priority || '')}
            ${this.renderQueueFilterControl('entity_type', 'Type', entityTypes, this.queryState.entityType || '')}
            ${this.renderQueueFilterControl('locale', 'Target Locale', locales, this.queryState.locale || '')}
            ${this.renderQueueFilterControl('assignee_id', 'Assignee', assignees, this.queryState.assigneeId || '')}
            ${this.renderQueueFilterControl('reviewer_id', 'Reviewer', reviewers, this.queryState.reviewerId || '')}
            ${this.renderQueueFilterControl('family_id', 'Family', ['', ...uniqueFilterOptions(rows.map((row) => row.family_id))], this.queryState.familyId || '')}
          </div>
          ${activeFilterCount > 0 ? `
            <div class="mt-4 flex items-center gap-2">
              <button type="button" class="${BTN_SECONDARY_SM}" data-clear-filters="true">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Clear filters
              </button>
            </div>
          ` : ''}
        </form>
      </div>
    `;
  }

  private renderSortControls(sortKeys: string[]): string {
    const currentSort = this.queryState.sort || (this.response?.meta.default_sort.key ?? 'updated_at');
    const currentOrder = this.queryState.order || (this.response?.meta.default_sort.order ?? 'desc');
    return `
      <label class="flex items-center gap-2 text-sm text-gray-600">
        <span class="text-gray-500">Sort by</span>
        <select
          data-filter-name="sort"
          class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          ${sortKeys.map((key) => `
            <option value="${escapeAttr(key)}" ${key === currentSort ? 'selected' : ''}>
              ${escapeHtml(humanizeToken(key))}
            </option>
          `).join('')}
        </select>
      </label>
      <button
        type="button"
        class="${BTN_GHOST}"
        data-toggle-sort-order="true"
        title="${currentOrder === 'asc' ? 'Ascending (click for descending)' : 'Descending (click for ascending)'}"
        aria-label="${currentOrder === 'asc' ? 'Sort ascending, click to sort descending' : 'Sort descending, click to sort ascending'}"
      >
        ${currentOrder === 'asc'
          ? `<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/></svg>`
          : `<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"/></svg>`
        }
      </button>
      <button
        type="button"
        class="${BTN_GHOST}"
        data-queue-refresh="true"
        title="Refresh queue"
        aria-label="Refresh assignment queue"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
    `;
  }

  private renderSelect(name: string, label: string, values: string[], activeValue: string): string {
    const options = values.map((value) => ({
      value,
      label: value ? humanizeToken(value) : `All ${label.toLowerCase()}`,
    }));
    return this.renderSelectOptions(name, label, options, activeValue);
  }

  private renderSelectOptions(
    name: string,
    label: string,
    values: AssignmentQueueFilterControlOption[],
    activeValue: string,
    placeholder?: string,
  ): string {
    const options = values.map((option) => ({ ...option }));
    if (!options.some((option) => option.value === '')) {
      options.unshift({ value: '', label: placeholder || `All ${label.toLowerCase()}` });
    }
    if (activeValue && !options.some((option) => option.value === activeValue)) {
      options.push({ value: activeValue, label: humanizeToken(activeValue) });
    }
    return `
      <label class="queue-filter-field">
        <span>${escapeHtml(label)}</span>
        <select data-filter-name="${escapeAttr(name)}">
          ${options.map((option) => `
            <option value="${escapeAttr(option.value)}" ${option.value === activeValue ? 'selected' : ''}>
              ${escapeHtml(option.label || option.value || placeholder || `All ${label.toLowerCase()}`)}
            </option>
          `).join('')}
        </select>
      </label>
    `;
  }

  private queueFilterControl(name: string): AssignmentQueueFilterControlMetadata | null {
    const meta = this.response?.meta;
    if (!meta) {
      return null;
    }
    const aliases = this.queueFilterControlAliases(name);
    return meta.filter_controls.find((control) => aliases.includes(control.name) || aliases.includes(control.key)) || null;
  }

  private canonicalQueueFilterName(name: string): string {
    switch (name) {
      case 'content_type':
      case 'type':
        return 'entity_type';
      case 'target_locale':
        return 'locale';
      default:
        return name;
    }
  }

  private queueFilterControlAliases(name: string): string[] {
    const canonical = this.canonicalQueueFilterName(name);
    switch (canonical) {
      case 'entity_type':
        return ['entity_type', 'content_type', 'type'];
      case 'locale':
        return ['locale', 'target_locale'];
      default:
        return [canonical];
    }
  }

  private renderQueueFilterControl(name: string, label: string, values: string[], activeValue: string): string {
    const control = this.queueFilterControl(name);
    if (control?.type === 'select' && control.options.length > 0) {
      return this.renderSelectOptions(
        control.name || name,
        control.label || label,
        control.options,
        activeValue,
        control.placeholder || `All ${(control.label || label).toLowerCase()}`,
      );
    }
    const enhancedFilterSelects = this.response?.meta.enhanced_filter_selects === true;
    if (!enhancedFilterSelects || !control?.enhanced || !control.endpoint_url || (control.type !== 'typeahead' && control.type !== 'remote_select')) {
      return this.renderSelect(name, label, values, activeValue);
    }
    const controlLabel = control.label || label;
    const controlName = this.canonicalQueueFilterName(control.name || control.key || name);
    const placeholder = control.placeholder || controlLabel;
    return `
      <label class="queue-filter-field">
        <span>${escapeHtml(controlLabel)}</span>
        <div class="filter-panel__enhanced-control"
             data-filter-enhanced="true"
             data-filter-control-type="${escapeAttr(control.type)}"
             data-filter-name="${escapeAttr(controlName)}"
             data-filter-endpoint-url="${escapeAttr(control.endpoint_url)}"
             data-filter-search-param="${escapeAttr(control.endpoint_search_param || 'search')}"
             data-filter-hydrate-param="${escapeAttr(control.endpoint_hydrate_param || 'selected')}"
             data-filter-value-field="${escapeAttr(control.endpoint_value_field || 'value')}"
             data-filter-label-field="${escapeAttr(control.endpoint_label_field || 'label')}"
             data-filter-renderer="${escapeAttr(control.renderer || 'simple')}"
             data-filter-fallback="${escapeAttr(control.fallback || 'raw')}">
          <input
            type="text"
            name="${escapeAttr(controlName)}"
            value="${escapeAttr(activeValue)}"
            placeholder="${escapeAttr(placeholder)}"
            autocomplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="false"
            data-filter-enhanced-input="true"
          />
        </div>
      </label>
    `;
  }

  private renderBody(): string {
    const rows = this.visibleRows;
    if (this.state === 'loading' && !this.rows.length) {
      return `
        <div class="${LOADING_STATE}" data-queue-state="loading">
          <svg class="animate-spin h-8 w-8 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-4 text-sm text-gray-500">Loading queue assignments...</p>
        </div>
      `;
    }
    if (this.state === 'error' && !this.rows.length) {
      return this.renderErrorState('error', this.error?.message || 'Failed to load queue assignments.');
    }
    if (this.state === 'conflict' && !this.rows.length) {
      return this.renderErrorState('conflict', this.error?.message || 'The queue response is stale. Refresh and try again.');
    }
    if (this.viewMode === 'server_family') {
      if (!this.serverFamilyRows.length) {
        return this.renderEmptyState('families');
      }
      return this.renderServerFamilyBody();
    }
    if (!rows.length) {
      return this.renderEmptyState('assignments');
    }

    // T11: Handle grouped mode rendering
    if (this.viewMode === 'grouped' && this.groupedData) {
      return this.renderGroupedBody();
    }

    const allSelected = this.isAllPageSelected();
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
              <th scope="col" class="queue-select-col">
                <input
                  type="checkbox"
                  class="queue-select-all"
                  data-select-all="true"
                  ${allSelected ? 'checked' : ''}
                  aria-label="Select all assignments on this page"
                />
              </th>
              <th scope="col" class="queue-content-col">Content</th>
              <th scope="col" class="queue-locale-col">Locale</th>
              <th scope="col" class="queue-status-col">Status</th>
              <th scope="col" class="queue-owner-col">Owners</th>
              <th scope="col" class="queue-due-col">Due</th>
              <th scope="col" class="queue-priority-col">Priority</th>
              <th scope="col" class="queue-action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => this.renderRow(row)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderServerFamilyBody(): string {
    const colSpan = 8;
    return `
      <div class="flex flex-col gap-3 sm:hidden" data-queue-mobile-view="true" data-queue-grouped="true" data-server-family="true">
        ${this.serverFamilyRows.map((family) => this.renderServerFamilyMobile(family)).join('')}
      </div>
      <div class="assignment-queue-table-wrap hidden sm:block">
        <table class="assignment-queue-table assignment-queue-table-grouped" aria-label="Translation assignment queue families">
          <thead>
            <tr>
              <th scope="col" class="queue-select-col"></th>
              <th scope="col">Family</th>
              <th scope="col">Locales</th>
              <th scope="col">Status</th>
              <th scope="col">Owners</th>
              <th scope="col">Due</th>
              <th scope="col">Priority</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.serverFamilyRows.map((family) => this.renderServerFamilyRows(family, colSpan)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderServerFamilyRows(family: ServerFamilyParentRow, colSpan: number): string {
    const expandIcon = family.expanded ? '▼' : '▶';
    const blocker = this.renderServerFamilyBlocker(family);
    const childRows = family.expanded
      ? family.loading
        ? `<tr class="family-group-child"><td></td><td colspan="${colSpan - 1}">Loading family assignments…</td></tr>`
        : family.error
          ? `<tr class="family-group-child"><td></td><td colspan="${colSpan - 1}">${escapeHtml(family.error)}</td></tr>`
          : family.children.map((row) => this.renderGroupChildRow(row, family.family_id)).join('')
      : '';
    return `
      <tr class="family-group-header server-family-header ${family.expanded ? 'is-expanded' : 'is-collapsed'}"
          data-group-id="${escapeAttr(family.family_id)}"
          data-group-expanded="${family.expanded}"
          role="row"
          aria-expanded="${family.expanded}"
          tabindex="0">
        <td class="queue-select-col"></td>
        <td colspan="${colSpan - 1}">
          <div class="family-group-header-content">
            <button type="button" class="family-group-toggle" data-toggle-group="${escapeAttr(family.family_id)}" aria-label="${family.expanded ? 'Collapse' : 'Expand'} family">
              <span class="family-group-expand-icon" aria-hidden="true">${expandIcon}</span>
            </button>
            <div class="family-group-info">
              <strong class="family-group-label">${escapeHtml(family.family_label || family.family_id)}</strong>
              <span class="family-group-count">${family.assignment_count} ${family.assignment_count === 1 ? 'assignment' : 'assignments'} · ${family.locale_count} ${family.locale_count === 1 ? 'locale' : 'locales'}</span>
            </div>
            <div class="family-group-summary server-family-summary">
              ${this.renderCountPills(family.status_counts)}
              ${this.renderPriorityPills(family.priority_counts)}
              ${blocker}
            </div>
          </div>
        </td>
      </tr>
      ${childRows}
    `;
  }

  private renderServerFamilyMobile(family: ServerFamilyParentRow): string {
    const expandIcon = family.expanded ? '▼' : '▶';
    const children = family.expanded
      ? family.loading
        ? '<div class="family-group-mobile-child">Loading family assignments…</div>'
        : family.error
          ? `<div class="family-group-mobile-child">${escapeHtml(family.error)}</div>`
          : family.children.map((row) => `<div class="family-group-mobile-child">${this.renderMobileCard(row)}</div>`).join('')
      : '';
    return `
      <div class="family-group-mobile-header ${family.expanded ? 'is-expanded' : 'is-collapsed'}"
           data-group-id="${escapeAttr(family.family_id)}"
           data-group-expanded="${family.expanded}">
        <button type="button" class="family-group-mobile-toggle" data-toggle-group="${escapeAttr(family.family_id)}">
          <span class="family-group-expand-icon">${expandIcon}</span>
          <span class="family-group-mobile-label">${escapeHtml(family.family_label || family.family_id)}</span>
          <span class="family-group-mobile-count">${family.assignment_count} assignments · ${family.locale_count} locales</span>
        </button>
        <div class="server-family-mobile-summary">${this.renderServerFamilyBlocker(family)}</div>
      </div>
      ${children}
    `;
  }

  private renderCountPills(counts: Record<string, number>): string {
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .slice(0, 4)
      .map(([key, count]) => `<span class="family-summary-pill">${escapeHtml(humanizeToken(key))} ${count}</span>`)
      .join('');
  }

  private renderPriorityPills(counts: Record<string, number>): string {
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .slice(0, 2)
      .map(([key, count]) => `<span class="family-summary-pill priority-${escapeAttr(key)}">${escapeHtml(humanizeToken(key))} ${count}</span>`)
      .join('');
  }

  private renderServerFamilyBlocker(family: ServerFamilyParentRow): string {
    if (!family.family_blocker_count_available) {
      const reason = family.family_blocker_count_reason || 'persisted_blockers_unavailable';
      return `<span class="family-summary-pill is-degraded" title="${escapeAttr(reason)}">Blockers unavailable</span>`;
    }
    const count = family.family_blocker_count ?? 0;
    return `<span class="family-summary-pill ${count > 0 ? 'is-blocked' : ''}">${count} persisted ${count === 1 ? 'blocker' : 'blockers'}</span>`;
  }

  // T11: Grouped body rendering
  private renderGroupedBody(): string {
    if (!this.groupedData) return '';

    const allSelected = this.isAllPageSelected();
    const colSpan = 8; // Number of columns in the table

    return `
      <!-- Mobile Card View - Grouped (visible on small screens) -->
      <div class="flex flex-col gap-3 sm:hidden" data-queue-mobile-view="true" data-queue-grouped="true">
        ${this.groupedData.groups.map((group) => this.renderGroupedMobileCards(group)).join('')}
        ${this.groupedData.ungrouped.map((record) => this.renderMobileCard(normalizeAssignmentListRow(record))).join('')}
      </div>
      <!-- Desktop Table View - Grouped (hidden on small screens) -->
      <div class="assignment-queue-table-wrap hidden sm:block">
        <table class="assignment-queue-table assignment-queue-table-grouped" aria-label="Translation assignment queue (grouped by family)">
          <thead>
            <tr>
              <th scope="col" class="queue-select-col">
                <input
                  type="checkbox"
                  class="queue-select-all"
                  data-select-all="true"
                  ${allSelected ? 'checked' : ''}
                  aria-label="Select all assignments on this page"
                />
              </th>
              <th scope="col" class="queue-content-col">Content</th>
              <th scope="col" class="queue-locale-col">Locale</th>
              <th scope="col" class="queue-status-col">Status</th>
              <th scope="col" class="queue-owner-col">Owners</th>
              <th scope="col" class="queue-due-col">Due</th>
              <th scope="col" class="queue-priority-col">Priority</th>
              <th scope="col" class="queue-action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.groupedData.groups.map((group) => this.renderFamilyGroupRows(group, colSpan)).join('')}
            ${this.groupedData.ungrouped.map((record) => this.renderRow(normalizeAssignmentListRow(record))).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // T11: Render family group header and child rows
  private renderFamilyGroupRows(group: RecordGroup, colSpan: number): string {
    const summaryHtml = renderGroupHeaderSummary(group, { size: 'sm' });
    const groupLabel = escapeHtml(group.displayLabel || this.deriveFamilyGroupLabel(group));
    const childCount = group.records.length;
    const expandIcon = group.expanded ? '▼' : '▶';

    // Render parent row
    const parentRow = `
      <tr class="family-group-header ${group.expanded ? 'is-expanded' : 'is-collapsed'}"
          data-group-id="${escapeAttr(group.groupId)}"
          data-group-expanded="${group.expanded}"
          role="row"
          aria-expanded="${group.expanded}"
          tabindex="0">
        <td class="queue-select-col">
          <!-- Group parent doesn't have selection checkbox -->
        </td>
        <td colspan="${colSpan - 1}">
          <div class="family-group-header-content">
            <button type="button" class="family-group-toggle" data-toggle-group="${escapeAttr(group.groupId)}" aria-label="${group.expanded ? 'Collapse' : 'Expand'} family group">
              <span class="family-group-expand-icon" aria-hidden="true">${expandIcon}</span>
            </button>
            <div class="family-group-info">
              <strong class="family-group-label">${groupLabel}</strong>
              <span class="family-group-count">${childCount} ${childCount === 1 ? 'locale' : 'locales'}</span>
            </div>
            <div class="family-group-summary">
              ${summaryHtml}
            </div>
          </div>
        </td>
      </tr>
    `;

    // Render child rows if expanded
    const childRows = group.expanded
      ? group.records.map((record) => {
          const row = normalizeAssignmentListRow(record);
          return this.renderGroupChildRow(row, group.groupId);
        }).join('')
      : '';

    return parentRow + childRows;
  }

  // T11: Render a child row within a group (slightly indented)
  private renderGroupChildRow(row: AssignmentListRow, groupId: string): string {
    const hasAssignee = Boolean(row.assignee_id);
    const hasReviewer = Boolean(row.reviewer_id);
    const hasDueDate = Boolean(row.due_date);
    const showDueState = hasDueDate || row.due_state === 'overdue' || row.due_state === 'due_soon';

    const isSelected = this.isRowSelected(row.id);

    return `
      <tr class="assignment-queue-row family-group-child ${isSelected ? 'is-selected' : ''}"
          data-assignment-id="${escapeAttr(row.id)}"
          data-parent-group="${escapeAttr(groupId)}"
          data-assignment-row="true"
          data-assignment-nav-group="table"
          tabindex="0"
          aria-label="${escapeAttr(buildRowAriaLabel(row))}">
        <td class="queue-select-col">
          <input
            type="checkbox"
            class="queue-row-select"
            data-select-row="${escapeAttr(row.id)}"
            ${isSelected ? 'checked' : ''}
            aria-label="Select assignment ${escapeAttr(row.source_title || row.id)}"
          />
        </td>
        <td class="queue-content-col">
          <div class="queue-content-cell queue-content-cell-grouped">
            <span class="queue-content-indent"></span>
            <span class="queue-content-title-small" title="${escapeAttr(row.source_title && row.source_path ? `${row.source_title} — ${row.source_path}` : row.source_title || row.source_path || row.id)}">${escapeHtml(row.source_title || row.source_path || row.id)}</span>
          </div>
        </td>
        <td class="queue-locale-col">
          <div class="queue-locale-cell">
            <span class="locale-code">${escapeHtml(row.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-code locale-target">${escapeHtml(row.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td class="queue-status-col">
          <div class="queue-status-cell">
            ${renderVocabularyStatusBadge(row.queue_state, { domain: 'queue', size: 'sm' })}
            ${row.qa_summary?.enabled && row.qa_summary.finding_count > 0 ? `
              <span class="queue-qa-chip ${row.qa_summary.blocker_count > 0 ? 'is-blocked' : ''}">
                QA ${row.qa_summary.finding_count}
              </span>
            ` : ''}
          </div>
        </td>
        <td class="queue-owner-col">
          <div class="queue-owner-cell">
            ${hasAssignee
              ? renderOwnerToken('queue-owner-value', 'Assignee', row.assignee_id, row.assignee_label)
              : ''}
            ${hasReviewer
              ? renderOwnerToken('queue-reviewer-value', 'Reviewer', row.reviewer_id, row.reviewer_label)
              : ''}
          </div>
        </td>
        <td class="queue-due-col">
          <div class="queue-due-cell">
            ${showDueState
              ? `<span class="due-pill due-${escapeAttr(row.due_state)}">${escapeHtml(humanizeToken(row.due_state))}</span>`
              : ''}
            ${hasDueDate
              ? `<span class="queue-due-date">${escapeHtml(formatTranslationShortDateTime(row.due_date, ''))}</span>`
              : ''}
          </div>
        </td>
        <td class="queue-priority-col">
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${escapeAttr(row.priority)}" aria-label="${escapeAttr('Priority: ' + humanizeToken(row.priority))}"></span>
            <span class="priority-label">${escapeHtml(humanizeToken(row.priority))}</span>
          </div>
        </td>
        <td class="queue-action-col">
          <div class="queue-action-cell">
            ${(() => {
              const actions = buildRowActions(row, this.pendingActions);
              const primaryAction = selectPrimaryAction(actions, row);
              return renderActionOverflow(row, actions, primaryAction);
            })()}
          </div>
        </td>
      </tr>
    `;
  }

  // T11: Render grouped mobile cards
  private renderGroupedMobileCards(group: RecordGroup): string {
    const groupLabel = escapeHtml(group.displayLabel || this.deriveFamilyGroupLabel(group));
    const childCount = group.records.length;
    const expandIcon = group.expanded ? '▼' : '▶';

    const headerCard = `
      <div class="family-group-mobile-header ${group.expanded ? 'is-expanded' : 'is-collapsed'}"
           data-group-id="${escapeAttr(group.groupId)}"
           data-group-expanded="${group.expanded}">
        <button type="button" class="family-group-mobile-toggle" data-toggle-group="${escapeAttr(group.groupId)}">
          <span class="family-group-expand-icon">${expandIcon}</span>
          <span class="family-group-mobile-label">${groupLabel}</span>
          <span class="family-group-mobile-count">${childCount} ${childCount === 1 ? 'locale' : 'locales'}</span>
        </button>
      </div>
    `;

    const childCards = group.expanded
      ? group.records.map((record) => {
          const row = normalizeAssignmentListRow(record);
          return `<div class="family-group-mobile-child">${this.renderMobileCard(row)}</div>`;
        }).join('')
      : '';

    return headerCard + childCards;
  }

  // T11: Derive family group label from group data
  private deriveFamilyGroupLabel(group: RecordGroup): string {
    if (group.displayLabel) return group.displayLabel;

    // Try to get label from first record
    if (group.records.length > 0) {
      const first = group.records[0];
      const candidates = [
        asString((first as Record<string, unknown>).source_title),
        asString((first as Record<string, unknown>).source_path),
        asString((first as Record<string, unknown>).source_record_id),
      ];
      for (const candidate of candidates) {
        if (candidate) return candidate;
      }
    }

    // Fallback to group ID
    const shortId = group.groupId.length > 20 ? group.groupId.slice(0, 17) + '...' : group.groupId;
    return `Family ${shortId}`;
  }

  private renderEmptyState(type: 'assignments' | 'families'): string {
    const title = type === 'families' ? 'No families found' : 'No assignments found';
    const message = type === 'families'
      ? 'No families match the current filters. Try adjusting your filters or check back later.'
      : 'No assignments match the current filters. Try adjusting your filters or selecting a different preset.';
    const activeFilters = this.getActiveFilterCount();

    return `
      <div class="${EMPTY_STATE}" data-queue-state="empty">
        <svg class="h-12 w-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
        <h3 class="${EMPTY_STATE_TITLE} mt-4">${escapeHtml(title)}</h3>
        <p class="${EMPTY_STATE_TEXT} max-w-md mx-auto">${escapeHtml(message)}</p>
        <div class="mt-5 flex items-center justify-center gap-3">
          ${activeFilters > 0 ? `
            <button type="button" class="${BTN_SECONDARY_SM}" data-clear-filters="true">
              Clear filters
            </button>
          ` : ''}
          <button type="button" class="${BTN_SECONDARY_SM}" data-queue-refresh="true">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
        </div>
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
    // T05: Mute empty owner/due states
    const hasAssignee = Boolean(row.assignee_id);
    const hasReviewer = Boolean(row.reviewer_id);
    const hasDueDate = Boolean(row.due_date);
    const showDueState = hasDueDate || row.due_state === 'overdue' || row.due_state === 'due_soon';

    // T09: Build compact metadata line
    const metaParts: string[] = [];
    if (row.entity_type) metaParts.push(row.entity_type);
    if (row.family_id && row.family_id !== row.source_path) metaParts.push(row.family_id);
    const metaLine = metaParts.join(' · ');

    const isSelected = this.isRowSelected(row.id);

    return `
      <tr class="assignment-queue-row ${isSelected ? 'is-selected' : ''}" tabindex="0" data-assignment-id="${escapeAttr(row.id)}" data-assignment-row="true" data-assignment-nav-group="table" aria-label="${escapeAttr(buildRowAriaLabel(row))}">
        <td class="queue-select-col">
          <input
            type="checkbox"
            class="queue-row-select"
            data-select-row="${escapeAttr(row.id)}"
            ${isSelected ? 'checked' : ''}
            aria-label="Select assignment ${escapeAttr(row.source_title || row.id)}"
          />
        </td>
        <td class="queue-content-col">
          <div class="queue-content-cell">
            <strong class="queue-content-title" title="${escapeAttr(row.source_title || row.source_path || row.id)}">${escapeHtml(row.source_title || row.source_path || row.id)}</strong>
            ${row.source_path && row.source_title ? `<span class="queue-content-path" title="${escapeAttr(row.source_path)}">${escapeHtml(row.source_path)}</span>` : ''}
            ${metaLine ? `<span class="queue-content-meta" title="${escapeAttr(metaLine)}">${escapeHtml(metaLine)}</span>` : ''}
          </div>
        </td>
        <td class="queue-locale-col">
          <div class="queue-locale-cell">
            <span class="locale-code">${escapeHtml(row.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-code locale-target">${escapeHtml(row.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td class="queue-status-col">
          <div class="queue-status-cell">
            ${renderVocabularyStatusBadge(row.queue_state, { domain: 'queue', size: 'sm' })}
            ${row.qa_summary?.enabled && row.qa_summary.finding_count > 0 ? `
              <span class="queue-qa-chip ${row.qa_summary.blocker_count > 0 ? 'is-blocked' : ''}">
                QA ${row.qa_summary.finding_count}
              </span>
            ` : ''}
          </div>
        </td>
        <td class="queue-owner-col">
          <div class="queue-owner-cell">
            ${hasAssignee
              ? renderOwnerToken('queue-owner-value', 'Assignee', row.assignee_id, row.assignee_label)
              : ''}
            ${hasReviewer
              ? renderOwnerToken('queue-reviewer-value', 'Reviewer', row.reviewer_id, row.reviewer_label)
              : ''}
            ${row.last_rejection_reason ? `<span class="queue-feedback-note">${escapeHtml(row.last_rejection_reason)}</span>` : ''}
          </div>
        </td>
        <td class="queue-due-col">
          <div class="queue-due-cell">
            ${showDueState
              ? `<span class="due-pill due-${escapeAttr(row.due_state)}">${escapeHtml(humanizeToken(row.due_state))}</span>`
              : ''}
            ${hasDueDate
              ? `<span class="queue-due-date">${escapeHtml(formatTranslationShortDateTime(row.due_date, ''))}</span>`
              : ''}
          </div>
        </td>
        <td class="queue-priority-col">
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${escapeAttr(row.priority)}" aria-label="${escapeAttr('Priority: ' + humanizeToken(row.priority))}"></span>
            <span class="priority-label">${escapeHtml(humanizeToken(row.priority))}</span>
          </div>
        </td>
        <td class="queue-action-col">
          <div class="queue-action-cell">
            ${(() => {
              const actions = buildRowActions(row, this.pendingActions);
              const primaryAction = selectPrimaryAction(actions, row);
              return renderActionOverflow(row, actions, primaryAction);
            })()}
          </div>
        </td>
      </tr>
    `;
  }

  private renderMobileCard(row: AssignmentListRow): string {
    // T05: Mute empty owner/due states for mobile
    const hasAssignee = Boolean(row.assignee_id);
    const hasReviewer = Boolean(row.reviewer_id);
    const hasDueDate = Boolean(row.due_date);
    const showDueState = hasDueDate || row.due_state === 'overdue' || row.due_state === 'due_soon';

    // T10: Selection state
    const isSelected = this.isRowSelected(row.id);

    return `
      <article
        class="${MOBILE_CARD} ${isSelected ? 'is-selected' : ''}"
        data-assignment-id="${escapeAttr(row.id)}"
        data-assignment-card="true"
        data-assignment-nav-group="mobile"
        tabindex="0"
        role="button"
        aria-label="${escapeAttr(buildRowAriaLabel(row))}"
      >
        <div class="${MOBILE_CARD_HEADER}">
          <div class="mobile-card-select">
            <input
              type="checkbox"
              class="queue-row-select"
              data-select-row="${escapeAttr(row.id)}"
              ${isSelected ? 'checked' : ''}
              aria-label="Select assignment ${escapeAttr(row.source_title || row.id)}"
            />
          </div>
          <div class="mobile-card-title-group">
            <h3 class="${MOBILE_CARD_TITLE}" title="${escapeAttr(row.source_title || row.source_path || row.id)}">${escapeHtml(row.source_title || row.source_path || row.id)}</h3>
            <p class="${MOBILE_CARD_SUBTITLE}" title="${escapeAttr(row.source_path && row.source_title ? row.source_path : (row.entity_type || row.family_id))}">${escapeHtml(row.source_path && row.source_title ? row.source_path : (row.entity_type || row.family_id))}</p>
          </div>
          ${renderVocabularyStatusBadge(row.queue_state, { domain: 'queue', size: 'sm' })}
        </div>
        <div class="${MOBILE_CARD_BODY}">
          <div class="${MOBILE_CARD_ROW}">
            <span class="${MOBILE_CARD_LABEL}">Locale</span>
            <span class="${MOBILE_CARD_VALUE}">
              <span class="locale-code">${escapeHtml(row.source_locale.toUpperCase())}</span>
              <span class="locale-arrow">→</span>
              <span class="locale-code locale-target">${escapeHtml(row.target_locale.toUpperCase())}</span>
            </span>
          </div>
          ${hasAssignee ? `
          <div class="${MOBILE_CARD_ROW}">
            <span class="${MOBILE_CARD_LABEL}">Assignee</span>
            <span class="${MOBILE_CARD_VALUE}" title="${escapeAttr(ownerTitle('Assignee', row.assignee_id, row.assignee_label))}">${escapeHtml(ownerDisplay(row.assignee_id, row.assignee_label))}</span>
          </div>
          ` : ''}
          ${hasReviewer ? `
          <div class="${MOBILE_CARD_ROW}">
            <span class="${MOBILE_CARD_LABEL}">Reviewer</span>
            <span class="${MOBILE_CARD_VALUE}" title="${escapeAttr(ownerTitle('Reviewer', row.reviewer_id, row.reviewer_label))}">${escapeHtml(ownerDisplay(row.reviewer_id, row.reviewer_label))}</span>
          </div>
          ` : ''}
          ${hasDueDate || showDueState ? `
          <div class="${MOBILE_CARD_ROW}">
            <span class="${MOBILE_CARD_LABEL}">Due</span>
            <span class="${MOBILE_CARD_VALUE}">
              ${showDueState ? `<span class="due-pill due-${escapeAttr(row.due_state)}">${escapeHtml(humanizeToken(row.due_state))}</span>` : ''}
              ${hasDueDate ? `<span class="text-gray-600 ml-1">${escapeHtml(formatTranslationShortDateTime(row.due_date, ''))}</span>` : ''}
            </span>
          </div>
          ` : ''}
          <div class="${MOBILE_CARD_ROW}">
            <span class="${MOBILE_CARD_LABEL}">Priority</span>
            <span class="${MOBILE_CARD_VALUE}">
              <span class="priority-indicator priority-${escapeAttr(row.priority)}"></span>
              <span class="priority-label">${escapeHtml(humanizeToken(row.priority))}</span>
            </span>
          </div>
        </div>
        <div class="${MOBILE_CARD_ACTIONS}">
          ${(() => {
            const actions = buildRowActions(row, this.pendingActions);
            const primaryAction = selectPrimaryAction(actions, row);
            return renderActionOverflow(row, actions, primaryAction);
          })()}
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
          // Close dropdown if it's from a menu item
          const menu = this.container?.querySelector<HTMLElement>('[data-review-selector-menu]');
          if (menu && !menu.classList.contains('hidden')) {
            this.closeReviewSelectorDropdown();
          }
        }
      });
    });

    // Review selector dropdown toggle
    this.container.querySelectorAll<HTMLElement>('[data-review-selector-toggle]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleReviewSelectorDropdown();
      });
    });

    this.container.querySelectorAll<HTMLSelectElement>('select[data-filter-name]').forEach((select) => {
      select.addEventListener('change', () => {
        const name = select.dataset.filterName;
        if (!name) {
          return;
        }
        this.updateNamedFilter(name, select.value);
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-filter-enhanced="true"]').forEach((control) => {
      control.addEventListener('queue-filter-change', (event) => {
        const detail = (event as CustomEvent<{ name?: string; value?: string }>).detail || {};
        if (detail.name) {
          this.updateNamedFilter(detail.name, asString(detail.value));
        }
      });
    });
    initAssignmentQueueFilterTypeaheads(this.container);

    // Refresh button - supports both new (data-translation-refresh) and legacy (data-queue-refresh) conventions
    this.container.querySelectorAll<HTMLElement>('[data-translation-refresh], [data-queue-refresh]').forEach((button) => {
      button.addEventListener('click', () => {
        void this.load();
      });
    });

    // Filter panel toggle
    this.container.querySelectorAll<HTMLElement>('[data-filters-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        this.toggleFiltersExpanded();
      });
    });

    // Clear filters button
    this.container.querySelectorAll<HTMLElement>('[data-clear-filters]').forEach((button) => {
      button.addEventListener('click', () => {
        this.clearAllFilters();
      });
    });

    // Individual filter chip removal
    this.container.querySelectorAll<HTMLElement>('[data-remove-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        const filterName = button.dataset.removeFilter;
        if (filterName) {
          this.removeFilter(filterName);
        }
      });
    });

    // Sort order toggle
    this.container.querySelectorAll<HTMLElement>('[data-toggle-sort-order]').forEach((button) => {
      button.addEventListener('click', () => {
        const currentOrder = this.queryState.order || 'desc';
        this.updateFilter({ order: currentOrder === 'asc' ? 'desc' : 'asc' });
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

    // T10: Selection event handlers - supports both new (data-translation-*) and legacy (data-select-*) conventions
    const selectAllCheckbox = this.container.querySelector<HTMLInputElement>('[data-translation-select-all], [data-select-all]');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', () => {
        if (selectAllCheckbox.checked) {
          this.selectAllPage();
        } else {
          this.clearSelection();
        }
      });
    }

    this.container.querySelectorAll<HTMLInputElement>('[data-translation-select-row], [data-select-row]').forEach((checkbox) => {
      checkbox.addEventListener('change', (event) => {
        event.stopPropagation();
        const assignmentId = checkbox.dataset.translationSelectRow || checkbox.dataset.selectRow;
        if (assignmentId) {
          this.toggleRowSelection(assignmentId);
        }
      });
      checkbox.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    });

    // T10: Bulk action handlers
    const clearButton = this.container.querySelector<HTMLButtonElement>('[data-bulk-clear]');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.clearSelection();
      });
    }

    const selectAllMatchingButton = this.container.querySelector<HTMLButtonElement>('[data-select-all-matching]');
    if (selectAllMatchingButton) {
      selectAllMatchingButton.addEventListener('click', () => {
        void this.selectAllMatchingFilters();
      });
    }

    const clearSnapshotButton = this.container.querySelector<HTMLButtonElement>('[data-filter-snapshot-clear]');
    if (clearSnapshotButton) {
      clearSnapshotButton.addEventListener('click', () => {
        this.clearSelection();
      });
    }

    this.container.querySelectorAll<HTMLButtonElement>('[data-filter-snapshot-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.filterSnapshotAction;
        if (action === 'assign' || action === 'release' || action === 'priority' || action === 'archive') {
          void this.runFilterSnapshotBulkAction(action);
        }
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-bulk-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.bulkAction;
        if (action === 'release' || action === 'archive') {
          void this.runBulkAction(action);
        }
      });
    });

    // T11: View mode toggle handlers
    this.container.querySelectorAll<HTMLButtonElement>('[data-view-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.viewMode;
        if (mode === 'flat' || mode === 'grouped' || mode === 'server_family') {
          this.setViewMode(mode);
        }
      });
    });

    // T11: Group expansion handlers
    this.container.querySelectorAll<HTMLButtonElement>('[data-toggle-group]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const groupId = button.dataset.toggleGroup;
        if (groupId) {
          this.toggleGroupExpansion(groupId);
        }
      });
    });

    // T06: Overflow menu interaction handlers
    const overflowTriggers = this.container.querySelectorAll<HTMLButtonElement>('[data-overflow-menu]');
    overflowTriggers.forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        const menuId = trigger.dataset.overflowMenu;
        if (!menuId) {
          return;
        }

        // Try to find menu within the same overflow container first
        const overflowContainer = trigger.closest('.queue-action-overflow-container');
        let menu = overflowContainer?.querySelector<HTMLElement>(`#menu-${menuId}`);

        // Fallback to global search if not found
        if (!menu) {
          menu = this.container?.querySelector<HTMLElement>(`#menu-${menuId}`) || null;
        }

        if (!menu) {
          return;
        }

        const isOpen = menu.hidden === false;

        // Close all other menus
        this.container?.querySelectorAll<HTMLElement>('.queue-action-overflow-menu').forEach((m) => {
          m.hidden = true;
        });
        this.container?.querySelectorAll<HTMLButtonElement>('[data-overflow-menu]').forEach((t) => {
          t.setAttribute('aria-expanded', 'false');
        });

        if (isOpen) {
          // Close this menu
          menu.hidden = true;
          trigger.setAttribute('aria-expanded', 'false');
        } else {
          // Open this menu
          menu.hidden = false;
          trigger.setAttribute('aria-expanded', 'true');
          // Focus first menu item
          const firstItem = menu.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
          firstItem?.focus();
        }
      });
    });

    // T06: Close menu on outside click
    if (this.container && typeof this.container.addEventListener === 'function') {
      this.container.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.queue-action-overflow-container')) {
          // Close all menus
          this.container?.querySelectorAll<HTMLElement>('.queue-action-overflow-menu').forEach((menu) => {
            menu.hidden = true;
          });
          this.container?.querySelectorAll<HTMLButtonElement>('[data-overflow-menu]').forEach((trigger) => {
            trigger.setAttribute('aria-expanded', 'false');
          });
        }
      });
    }

    // T06: Keyboard navigation for menus (Escape, Arrow keys)
    this.container.querySelectorAll<HTMLElement>('.queue-action-overflow-menu').forEach((menu) => {
      menu.addEventListener('keydown', (event) => {
        const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
        const currentIndex = items.findIndex((item) => item === document.activeElement);

        switch (event.key) {
          case 'Escape':
            event.preventDefault();
            menu.hidden = true;
            const trigger = menu.closest('.queue-action-overflow-container')?.querySelector<HTMLButtonElement>('[data-overflow-menu]');
            if (trigger) {
              trigger.setAttribute('aria-expanded', 'false');
              trigger.focus();
            }
            break;
          case 'ArrowDown':
            event.preventDefault();
            if (currentIndex < items.length - 1) {
              items[currentIndex + 1]?.focus();
            } else {
              items[0]?.focus();
            }
            break;
          case 'ArrowUp':
            event.preventDefault();
            if (currentIndex > 0) {
              items[currentIndex - 1]?.focus();
            } else {
              items[items.length - 1]?.focus();
            }
            break;
          case 'Tab':
            // Allow tab but close menu
            menu.hidden = true;
            const tabTrigger = menu.closest('.queue-action-overflow-container')?.querySelector<HTMLButtonElement>('[data-overflow-menu]');
            if (tabTrigger) {
              tabTrigger.setAttribute('aria-expanded', 'false');
            }
            break;
        }
      });
    });

    // T11: Expand/collapse all handlers
    const expandAllButton = this.container.querySelector<HTMLButtonElement>('[data-expand-all]');
    if (expandAllButton) {
      expandAllButton.addEventListener('click', () => {
        this.expandAllFamilyGroups();
      });
    }

    const collapseAllButton = this.container.querySelector<HTMLButtonElement>('[data-collapse-all]');
    if (collapseAllButton) {
      collapseAllButton.addEventListener('click', () => {
        this.collapseAllFamilyGroups();
      });
    }

    // T11: Group header click for expansion
    this.container.querySelectorAll<HTMLElement>('[data-group-id]').forEach((header) => {
      if (header.tagName.toLowerCase() === 'tr' || header.classList.contains('family-group-mobile-header')) {
        header.addEventListener('click', (event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest('button, a, input, select, textarea')) {
            return;
          }
          const groupId = header.dataset.groupId;
          if (groupId) {
            this.toggleGroupExpansion(groupId);
          }
        });
        header.addEventListener('keydown', (event) => {
          if (isNestedInteractiveTarget(event, header)) {
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const groupId = header.dataset.groupId;
            if (groupId) {
              this.toggleGroupExpansion(groupId);
            }
          }
        });
      }
    });

    // Navigation targets - supports both new (data-translation-*) and legacy (data-assignment-*) conventions
    this.attachAssignmentNavigationTargets('[data-translation-row], [data-assignment-row]');
    this.attachAssignmentNavigationTargets('[data-assignment-card]');
  }

  private attachAssignmentNavigationTargets(selector: string): void {
    if (!this.container) {
      return;
    }
    this.container.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      // Get row ID from either new (data-translation-row-id) or legacy (data-assignment-id) convention
      const getRowId = () => element.dataset.translationRowId || element.dataset.assignmentId || '';
      element.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('button, a, input, select, textarea')) {
          return;
        }
        this.openAssignment(getRowId());
      });
      element.addEventListener('keydown', (event) => {
        if (isNestedInteractiveTarget(event, element)) {
          return;
        }
        const key = event.key;
        if (key === 'Enter' || key === ' ') {
          event.preventDefault();
          this.openAssignment(getRowId());
          return;
        }
        if (key !== 'ArrowDown' && key !== 'ArrowUp') {
          return;
        }
        // Get nav group from either new (data-translation-nav-group) or legacy (data-assignment-nav-group) convention
        const group = element.dataset.translationNavGroup || element.dataset.assignmentNavGroup;
        if (!group) {
          return;
        }
        event.preventDefault();
        // Query for both conventions
        const elements = Array.from(
          this.container?.querySelectorAll<HTMLElement>(`[data-translation-nav-group="${group}"], [data-assignment-nav-group="${group}"]`) || []
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

function ownerDisplay(id: string, label?: string): string {
  return (label || id || '').trim();
}

function ownerTitle(role: string, id: string, label?: string): string {
  const display = ownerDisplay(id, label);
  if (!display) {
    return '';
  }
  const trimmedId = (id || '').trim();
  if (!trimmedId || display === trimmedId) {
    return `${role}: ${display}`;
  }
  return `${role}: ${display} (${trimmedId})`;
}

function renderOwnerToken(className: string, role: string, id: string, label?: string): string {
  const display = ownerDisplay(id, label);
  if (!display) {
    return '';
  }
  const title = ownerTitle(role, id, label);
  return `<span class="${escapeAttr(className)}" title="${escapeAttr(title)}" aria-label="${escapeAttr(title)}">${escapeHtml(display)}</span>`;
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

    /* Filter field styling */
    .queue-filter-field select,
    .queue-filter-field input[type="text"] {
      border-radius: 0.5rem;
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #111827;
      font: inherit;
      padding: 0.5rem 0.75rem;
      width: 100%;
    }

    .queue-filter-field select:focus,
    .queue-filter-field input[type="text"]:focus {
      border-color: #3b82f6;
      outline: none;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
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

    /* Legacy preset/filter styles removed - now using panel-tabs and tailwind grid from design system */

    .queue-filter-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      color: #374151;
      font-size: 0.875rem;
    }

    .queue-filter-field span {
      font-weight: 500;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
    }

    /* Filter chips */
    .queue-filter-chips-container {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e5e7eb;
    }

    .queue-filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .queue-filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.625rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      color: #1e40af;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .queue-filter-chip:hover {
      background: #dbeafe;
      border-color: #93c5fd;
    }

    .queue-filter-chip:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    }

    .queue-filter-chip-label {
      color: #64748b;
      font-weight: 500;
    }

    .queue-filter-chip-value {
      color: #1e40af;
      font-weight: 600;
    }

    .queue-filter-chip-remove {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      margin-left: 0.125rem;
    }

    .queue-filter-chip-clear-all {
      background: #f3f4f6;
      border-color: #d1d5db;
      color: #374151;
    }

    .queue-filter-chip-clear-all:hover {
      background: #e5e7eb;
      border-color: #9ca3af;
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
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--translation-border-default, #e5e7eb);
      text-align: left;
      vertical-align: middle;
    }

    .assignment-queue-table th {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--translation-text-muted, #6b7280);
      background: var(--translation-surface-muted, #f9fafb);
    }

    .assignment-queue-row {
      outline: none;
      transition: background-color 0.15s ease;
    }

    .assignment-queue-row:hover {
      background-color: var(--translation-surface-muted, #f9fafb);
    }

    .assignment-queue-row:focus-within {
      background-color: #eff6ff;
    }

    .assignment-queue-row.is-selected {
      background-color: #eff6ff;
    }

    /* Checkbox column alignment */
    .queue-select-col {
      width: 3rem;
      padding: 0.75rem 0.5rem !important;
      text-align: center;
      vertical-align: middle;
    }

    .queue-select-col input[type="checkbox"] {
      width: 1rem;
      height: 1rem;
      margin: 0;
      cursor: pointer;
      accent-color: #2563eb;
    }

    .queue-content-cell,
    .queue-owner-cell,
    .queue-due-cell,
    .queue-status-cell {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    /* T09: Content cell hierarchy */
    .queue-content-title {
      display: block;
      font-weight: 600;
      color: #111827;
      line-height: 1.3;
      max-width: 28rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .queue-content-path {
      display: block;
      font-size: 0.82rem;
      color: #6b7280;
      margin-top: 0.15rem;
      max-width: 28rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .queue-content-meta {
      display: block;
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 0.1rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      max-width: 28rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .queue-content-title-small {
      display: block;
      font-weight: 500;
      color: #111827;
      font-size: 0.875rem;
      max-width: 24rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* T09: Locale codes (neutral, no flags) */
    .queue-locale-cell {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .locale-code {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.78rem;
      font-weight: 600;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace;
      background: #f3f4f6;
      color: #374151;
    }

    .locale-code.locale-target {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .locale-arrow {
      color: #9ca3af;
      font-size: 0.75rem;
    }

    /* T09: Owner cell - mute empty states */
    .queue-owner-value {
      display: block;
      max-width: 11rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #374151;
      font-size: 0.88rem;
    }

    .queue-reviewer-value {
      display: block;
      max-width: 11rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #6b7280;
      font-size: 0.82rem;
    }

    .queue-owner-empty {
      display: block;
      color: #d1d5db;
      font-size: 0.82rem;
      font-style: italic;
    }

    /* T09: Due cell - mute empty states */
    .queue-due-date {
      display: block;
      color: #374151;
      font-size: 0.88rem;
    }

    .queue-due-empty {
      display: block;
      color: #d1d5db;
      font-size: 0.88rem;
    }

    .due-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    /* T09: Priority cell with visual indicator */
    .queue-priority-cell {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .priority-indicator {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .priority-indicator.priority-low {
      background: #d1d5db;
    }

    .priority-indicator.priority-normal {
      background: #3b82f6;
    }

    .priority-indicator.priority-high {
      background: #f59e0b;
    }

    .priority-indicator.priority-urgent {
      background: #ef4444;
      animation: pulse-urgent 1.5s ease-in-out infinite;
    }

    @keyframes pulse-urgent {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .priority-label {
      font-size: 0.82rem;
      color: #374151;
    }

    /* Legacy priority-pill support for mobile cards */
    .priority-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.5rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
    }

    .priority-pill.priority-low {
      background: #f1f5f9;
      color: #4b5563;
    }

    .priority-pill.priority-normal {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .priority-pill.priority-high {
      background: #fef3c7;
      color: #b45309;
    }

    .priority-pill.priority-urgent {
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

    /* T10: Selection styles */
    .queue-select-col {
      width: 3rem;
      padding: 0.75rem !important;
      text-align: center;
    }

    .queue-row-select,
    .queue-select-all {
      width: 1rem;
      height: 1rem;
      cursor: pointer;
      accent-color: #2563eb;
    }

    .assignment-queue-row.is-selected {
      background: #eff6ff;
    }

    .assignment-queue-row.is-selected:hover,
    .assignment-queue-row.is-selected:focus {
      background: #dbeafe;
    }

    /* T10: Bulk action styles now in input.css via .bulk-actions-overlay and .bulk-actions-bar */

    .filter-snapshot-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: 1px solid #dbeafe;
      border-radius: 0.5rem;
      background: #eff6ff;
      color: #1e3a8a;
    }

    .filter-snapshot-copy {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
      font-size: 0.875rem;
    }

    .filter-snapshot-copy span {
      color: #1d4ed8;
      overflow-wrap: anywhere;
    }

    .filter-snapshot-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    /* T10: Mobile card selection */
    .mobile-card-select {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      padding-right: 0.5rem;
    }

    .mobile-card-title-group {
      flex: 1;
      min-width: 0;
    }

    [data-assignment-card].is-selected {
      border-color: #3b82f6;
      background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
    }

    /* T11: View mode toggle */
    .assignment-queue-view-mode {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 0.5rem 0;
    }

    .view-mode-buttons {
      display: flex;
      gap: 0.25rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 0.2rem;
      background: #f9fafb;
    }

    .view-mode-button {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.75rem;
      border: none;
      border-radius: 0.35rem;
      background: transparent;
      color: #6b7280;
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .view-mode-button:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .view-mode-button.is-active {
      background: #111827;
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .view-mode-icon {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
    }

    .view-mode-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
    }

    .view-mode-count {
      color: #374151;
      font-weight: 500;
    }

    .view-mode-scope {
      color: #9ca3af;
      font-size: 0.8rem;
    }

    .view-mode-expand-all,
    .view-mode-collapse-all {
      background: transparent;
      border: none;
      color: #2563eb;
      font: inherit;
      font-size: 0.8rem;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }

    .view-mode-expand-all:hover,
    .view-mode-collapse-all:hover {
      color: #1d4ed8;
    }

    /* T11: Family group header row */
    .family-group-header {
      background: linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .family-group-header:hover {
      background: linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%);
    }

    .family-group-header:focus {
      outline: 2px solid #2563eb;
      outline-offset: -2px;
    }

    .family-group-header-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .family-group-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      border: none;
      border-radius: 0.35rem;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .family-group-toggle:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .family-group-expand-icon {
      font-size: 0.75rem;
      transition: transform 0.2s ease;
    }

    .family-group-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .family-group-label {
      font-weight: 600;
      color: #111827;
      font-size: 0.95rem;
    }

    .family-group-count {
      font-size: 0.78rem;
      color: #6b7280;
    }

    .family-group-summary {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .server-family-summary {
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .family-summary-pill {
      display: inline-flex;
      align-items: center;
      min-height: 1.5rem;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: #eef2ff;
      color: #3730a3;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .family-summary-pill.is-blocked {
      background: #fef2f2;
      color: #991b1b;
    }

    .family-summary-pill.is-degraded {
      background: #fffbeb;
      color: #92400e;
    }

    .server-family-mobile-summary {
      padding: 0 0.75rem 0.75rem;
    }

    /* T11: Family group child row */
    .family-group-child {
      background: #ffffff;
    }

    .family-group-child:hover {
      background: #f9fafb;
    }

    .queue-content-cell-grouped {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .queue-content-indent {
      width: 1.5rem;
      flex-shrink: 0;
      border-left: 2px solid #e5e7eb;
      height: 1rem;
      margin-left: 0.5rem;
    }

    .queue-content-title-small {
      font-weight: 500;
      color: #374151;
      font-size: 0.9rem;
    }

    /* T11: Mobile grouped cards */
    .family-group-mobile-header {
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      background: linear-gradient(135deg, #f3f4f6 0%, #ffffff 100%);
      overflow: hidden;
    }

    .family-group-mobile-toggle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.85rem 1rem;
      border: none;
      background: transparent;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .family-group-mobile-label {
      flex: 1;
      font-weight: 600;
      color: #111827;
      font-size: 0.95rem;
    }

    .family-group-mobile-count {
      color: #6b7280;
      font-size: 0.82rem;
    }

    .family-group-mobile-child {
      margin-left: 1rem;
      border-left: 2px solid #e5e7eb;
      padding-left: 0.5rem;
    }

    /* T11: Collapsed state styling */
    .family-group-header.is-collapsed + .family-group-child,
    .family-group-mobile-header.is-collapsed + .family-group-mobile-child {
      display: none;
    }

    /* T06: Action overflow menu styles */
    .queue-action-overflow-container {
      display: flex;
      gap: 0.25rem;
      align-items: center;
      position: relative;
    }

    .queue-action-overflow-trigger {
      padding: 0.25rem 0.5rem;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 1.125rem;
      line-height: 1;
      color: #374151;
      transition: background-color 0.15s ease;
    }

    .queue-action-overflow-trigger:hover:not([disabled]) {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    .queue-action-overflow-trigger:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .queue-action-overflow-trigger[aria-expanded="true"] {
      background: #f3f4f6;
      border-color: #6b7280;
    }

    .queue-action-overflow-menu {
      position: absolute;
      top: 100%;
      right: 0;
      z-index: 1000;
      min-width: 10rem;
      margin-top: 0.25rem;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      padding: 0.25rem 0;
      display: none;
    }

    .queue-action-overflow-menu[hidden] {
      display: none !important;
    }

    .queue-action-overflow-menu:not([hidden]) {
      display: block;
    }

    .queue-action-menu-item {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.5rem 1rem;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: #374151;
      transition: background-color 0.15s ease;
    }

    .queue-action-menu-item:hover:not([disabled]) {
      background: #f3f4f6;
    }

    .queue-action-menu-item:focus {
      background: #e5e7eb;
      outline: none;
    }

    .queue-action-menu-item[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
      color: #9ca3af;
    }

    .action-pending-label {
      display: block;
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.125rem;
    }

    /* Mobile card action overflow adjustments */
    .mobile-card-actions .queue-action-overflow-container {
      width: 100%;
    }

    .mobile-card-actions .queue-action-overflow-container > button:first-child {
      flex: 1;
    }

    /* Responsive column hiding for narrower viewports */
    @media (max-width: 1440px) {
      .queue-priority-col {
        display: none;
      }
    }

    @media (max-width: 1280px) {
      .queue-priority-col,
      .queue-due-col {
        display: none;
      }
    }

    @media (max-width: 1024px) {
      .queue-priority-col,
      .queue-due-col,
      .queue-owner-col {
        display: none;
      }
    }

    @media (max-width: 900px) {
      .assignment-queue-screen {
        padding: 1rem;
      }

      .assignment-queue-table {
        min-width: 760px;
      }

      .assignment-queue-view-mode {
        flex-direction: column;
        align-items: flex-start;
      }

      .view-mode-info {
        flex-wrap: wrap;
      }

      .queue-priority-col,
      .queue-due-col,
      .queue-owner-col,
      .queue-locale-col {
        display: none;
      }

      /* T06: Touch-friendly overflow menu for mobile */
      .queue-action-overflow-menu {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        top: auto;
        border-radius: 0.75rem 0.75rem 0 0;
        max-height: 60vh;
        overflow-y: auto;
      }

      .queue-action-menu-item {
        padding: 1rem;
        min-height: 44px;
        font-size: 1rem;
      }

      .queue-action-overflow-trigger {
        min-width: 44px;
        min-height: 44px;
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

function bindAssignmentQueueSSR(container: HTMLElement, endpoint: string): void {
  if (!container || container.dataset.assignmentQueueEnhanced === 'true') {
    return;
  }
  container.dataset.assignmentQueueEnhanced = 'true';
  initAssignmentSSRRowActions(container, { endpoint: container.dataset.actionEndpoint || endpoint });
  initAssignmentQueueFilterTypeaheads(container);
}

function shouldUseTranslationClientRender(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const params = readLocationSearchParams(window.location) ?? new URLSearchParams();
  const value = params.get('translation_client_render');
  return value === '1' || value === 'true';
}

export function initAssignmentQueueScreen(container: HTMLElement): AssignmentQueueScreen | null {
  const endpoint = container.dataset.endpoint || container.dataset.assignmentListEndpoint || '';
  if (!endpoint) {
    return null;
  }
  if (container.dataset.ssrEnhanced === 'true' && !shouldUseTranslationClientRender()) {
    bindAssignmentQueueSSR(container, endpoint);
    return null;
  }
  const locationSearch = typeof window !== 'undefined'
    ? readLocationSearchParams(window.location)
    : null;
  return createAssignmentQueueScreen(container, {
    endpoint,
    bulkActionEndpoint: container.dataset.bulkActionEndpoint || container.dataset.bulkActionsEndpoint || '',
    bulkSnapshotEndpoint: container.dataset.bulkSnapshotEndpoint || '',
    editorBasePath: container.dataset.editorBasePath || '',
    title: container.dataset.title,
    description: container.dataset.description,
    initialPresetId: container.dataset.initialPresetId || getStringSearchParam(locationSearch ?? new URLSearchParams(), 'preset') || '',
  });
}

export function resolveAssignmentBulkActionEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    return '/admin/api/translations/assignment-actions/bulk';
  }
  const marker = '/translations/assignments';
  const index = trimmed.indexOf(marker);
  if (index >= 0) {
    return `${trimmed.slice(0, index)}/translations/assignment-actions/bulk`;
  }
  return '/admin/api/translations/assignment-actions/bulk';
}

export function resolveAssignmentBulkSnapshotEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    return '/admin/api/translations/assignment-actions/snapshot';
  }
  const marker = '/translations/assignments';
  const index = trimmed.indexOf(marker);
  if (index >= 0) {
    return `${trimmed.slice(0, index)}/translations/assignment-actions/snapshot`;
  }
  return '/admin/api/translations/assignment-actions/snapshot';
}
