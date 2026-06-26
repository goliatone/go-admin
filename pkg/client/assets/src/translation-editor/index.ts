import {
  normalizeTranslationActionState,
  type TranslationActionState,
} from '../translation-contracts/index.js';
import {
  asBoolean,
  asNumber,
  asRecord,
  asString,
  asStringArray,
} from '../shared/coercion.js';
import { escapeAttribute, escapeHTML } from '../shared/html.js';
import { renderIcon } from '../shared/icon-renderer.js';
import { getStatusLabel, renderStatusChip } from '../shared/status-vocabulary.js';
import { readLocationSearchParams } from '../shared/query-state/url-state.js';
import { normalizeStringRecord } from '../shared/record-normalization.js';
import { httpRequest, readCSRFToken, readHTTPError } from '../shared/transport/http-client.js';
import { renderPanelLoadingState, renderPanelState } from '../services/ui-states.js';
import { extractStructuredError, formatStructuredErrorForDisplay } from '../toast/error-helpers.js';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_SECONDARY_SM,
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
  trapFocus,
  setupFieldTabOrder,
  // Phase 6.3: Shared styling helpers
  getAutosaveStateClass,
  getAutosaveStateLabel,
  getMetaBadgeClass,
  getQAPanelClass,
  getQAFindingClasses,
  getTimelineEntryClasses,
  GLOSSARY_CHIP,
  GLOSSARY_CHIP_TERM,
  ICON_CLOCK,
  ICON_COPY,
  ICON_DOCUMENT,
  formatTranslationTimestampUTC,
  sentenceCaseToken,
  type AutosaveState,
  type QASeverity,
  type TimelineTone,
} from '../translation-shared/index.js';

export type TranslationEditorComparisonMode = 'snapshot' | 'hash_only';

export interface TranslationEditorFieldCompleteness {
  required: boolean;
  complete: boolean;
  missing: boolean;
}

export interface TranslationEditorFieldDrift {
  changed: boolean;
  comparison_mode: TranslationEditorComparisonMode;
  previous_source_value: string;
  current_source_value: string;
}

export interface TranslationEditorFieldValidation {
  valid: boolean;
  message: string;
}

export interface TranslationSuggestionActionState extends TranslationActionState {
  assignment_id: string;
  field_path: string;
  command_name: string;
  transport: string;
  rpc_method: string;
  endpoint: string;
  rpc_invoke_path: string;
  execution_mode: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
}

export interface TranslationEditorGlossaryMatch {
  term: string;
  preferred_translation: string;
  notes?: string;
  field_paths: string[];
}

export interface TranslationEditorStyleGuideSummary {
  available: boolean;
  title: string;
  summary: string;
  rules: string[];
}

export type TranslationEditorQASeverity = 'warning' | 'blocker';
export type TranslationEditorQACategory = 'terminology' | 'style';

export interface TranslationEditorQAFinding {
  id: string;
  category: TranslationEditorQACategory;
  severity: TranslationEditorQASeverity;
  field_path: string;
  message: string;
}

export interface TranslationEditorQACategorySummary {
  category: string;
  enabled: boolean;
  feature_flag?: string;
  finding_count: number;
  warning_count: number;
  blocker_count: number;
}

export interface TranslationEditorQAResults {
  enabled: boolean;
  summary: {
    finding_count: number;
    warning_count: number;
    blocker_count: number;
  };
  categories: Record<string, TranslationEditorQACategorySummary>;
  findings: TranslationEditorQAFinding[];
  save_blocked: boolean;
  submit_blocked: boolean;
}

interface TranslationEditorIssueTargets {
  missing: string | null;
  validation: string | null;
  qaBlocker: string | null;
  qaFinding: string | null;
  sourceDrift: string | null;
}

export interface TranslationEditorReviewFeedbackComment {
  id: string;
  body: string;
  kind: string;
  created_at: string;
  author_id?: string;
}

export interface TranslationEditorReviewFeedback {
  last_rejection_reason?: string;
  comments: TranslationEditorReviewFeedbackComment[];
}

export interface TranslationEditorAssistPayload {
  glossary_matches: TranslationEditorGlossaryMatch[];
  style_guide_summary: TranslationEditorStyleGuideSummary;
  translation_memory_suggestions: Record<string, unknown>[];
}

export interface TranslationEditorFieldEntry {
  path: string;
  label: string;
  input_type: string;
  required: boolean;
  source_value: string;
  target_value: string;
  completeness: TranslationEditorFieldCompleteness;
  drift: TranslationEditorFieldDrift;
  validation: TranslationEditorFieldValidation;
  glossary_hits: Record<string, unknown>[];
  suggest_translation_action: TranslationSuggestionActionState;
}

export interface TranslationEditorAttachment {
  id: string;
  kind: string;
  filename: string;
  byte_size: number;
  uploaded_at: string;
  description: string;
  url: string;
}

export interface TranslationEditorAttachmentSummary {
  total: number;
  kinds: Record<string, number>;
}

export type TranslationEditorHistoryEntryType = 'comment' | 'event';

export interface TranslationEditorHistoryEntry {
  id: string;
  entry_type: TranslationEditorHistoryEntryType;
  title: string;
  body: string;
  action: string;
  actor_id: string;
  author_id: string;
  created_at: string;
  kind: string;
  metadata: Record<string, unknown>;
}

export interface TranslationEditorHistoryPage {
  items: TranslationEditorHistoryEntry[];
  page: number;
  per_page: number;
  total: number;
  has_more: boolean;
  next_page: number;
}

export interface TranslationEditorAssignmentSummary {
  id: string;
  status: string;
  queue_state: string;
  source_title: string;
  source_path: string;
  assignee_id: string;
  assignee_label: string;
  display_assignee: string;
  reviewer_id: string;
  reviewer_label: string;
  display_reviewer: string;
  due_state: string;
  due_date: string;
  version: number;
  row_version: number;
  updated_at: string;
}

export interface TranslationEditorLocaleNavigationEntry {
  locale: string;
  label: string;
  current: boolean;
  source: boolean;
  enabled: boolean;
  disabled: boolean;
  reason: string;
  href?: string;
  assignment_id?: string;
  status?: string;
  work_scope?: string;
}

export interface TranslationEditorLocaleNavigation {
  family_id: string;
  current_locale: string;
  source_locale: string;
  current_work_scope: string;
  family_detail_url: string;
  locales: TranslationEditorLocaleNavigationEntry[];
}

export interface TranslationEditorPreviewAction {
  enabled: boolean;
  url?: string;
  reason: string;
  reason_code: string;
  assignment_id: string;
  entity_type: string;
  record_id: string;
  target_record_id: string;
  target_locale: string;
  channel: string;
}

export interface TranslationEditorContentNavigationEntry {
  content_type: string;
  record_id: string;
  locale: string;
  channel: string;
  detail_url: string;
  edit_url: string;
  content_detail_url: string;
  content_edit_url: string;
  can_view: boolean;
  can_edit: boolean;
  edit_disabled_reason: string;
  edit_disabled_reason_code: string;
  label: string;
  detail_label: string;
}

export interface TranslationEditorContentNavigation {
  source?: TranslationEditorContentNavigationEntry;
  target?: TranslationEditorContentNavigationEntry;
}

export interface TranslationAssignmentEditorDetail {
  assignment_id: string;
  assignment_row_version: number;
  variant_id: string;
  family_id: string;
  entity_type?: string;
  source_locale?: string;
  target_locale?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  row_version: number;
  source_fields: Record<string, string>;
  target_fields: Record<string, string>;
  fields: TranslationEditorFieldEntry[];
  field_completeness: Record<string, TranslationEditorFieldCompleteness>;
  field_drift: Record<string, TranslationEditorFieldDrift>;
  field_validations: Record<string, TranslationEditorFieldValidation>;
  source_target_drift?: Record<string, unknown>;
  history: TranslationEditorHistoryPage;
  attachments: TranslationEditorAttachment[];
  attachment_summary: TranslationEditorAttachmentSummary;
  translation_assignment: TranslationEditorAssignmentSummary;
  assist: TranslationEditorAssistPayload;
  last_rejection_reason?: string;
  review_feedback: TranslationEditorReviewFeedback;
  qa_results: TranslationEditorQAResults;
  assignment_action_states: Record<string, TranslationActionState>;
  review_action_states: Record<string, TranslationActionState>;
  suggest_translation_action: TranslationSuggestionActionState;
  locale_navigation: TranslationEditorLocaleNavigation;
  content_navigation: TranslationEditorContentNavigation;
  preview_action: TranslationEditorPreviewAction;
}

export interface TranslationEditorUpdateResponse {
  variant_id: string;
  row_version: number;
  fields: Record<string, string>;
  field_completeness: Record<string, TranslationEditorFieldCompleteness>;
  field_drift: Record<string, TranslationEditorFieldDrift>;
  field_validations: Record<string, TranslationEditorFieldValidation>;
  source_target_drift?: Record<string, unknown>;
  assist: TranslationEditorAssistPayload;
  qa_results: TranslationEditorQAResults;
  assignment_action_states: Record<string, TranslationActionState>;
  review_action_states: Record<string, TranslationActionState>;
  preview_action?: TranslationEditorPreviewAction;
}

export interface TranslationEditorState {
  detail: TranslationAssignmentEditorDetail;
  dirty_fields: Record<string, string>;
  assignment_row_version: number;
  row_version: number;
  can_submit_review: boolean;
  autosave: {
    pending: boolean;
    conflict: Record<string, unknown> | null;
  };
}

export interface TranslationEditorLoadState {
  status: 'loading' | 'ready' | 'empty' | 'error' | 'conflict';
  detail?: TranslationAssignmentEditorDetail;
  message?: string;
  requestId?: string;
  traceId?: string;
  statusCode?: number;
  errorCode?: string | null;
}

export interface TranslationEditorRenderOptions {
  basePath?: string;
}

export interface TranslationEditorRejectDraft {
  reason: string;
  comment: string;
  error?: string;
}

export interface TranslationEditorRuntimeState {
  feedback?: { kind: 'success' | 'error' | 'conflict'; message: string } | null;
  lastSavedMessage?: string;
  saving?: boolean;
  submitting?: boolean;
  previewing?: boolean;
  suggestingFields?: string[];
  rejectDraft?: TranslationEditorRejectDraft | null;
  // T13: Active sidebar tab
  activeSidebarTab?: 'actions' | 'qa' | 'assist' | 'files' | 'history';
}

export interface TranslationEditorScreenConfig {
  endpoint: string;
  variantEndpointBase?: string;
  actionEndpointBase: string;
  syncBaseURL?: string;
  syncClientBasePath?: string;
  syncResourceKind?: string;
  syncScope?: Record<string, string>;
  basePath?: string;
  initialDetail?: unknown;
}

interface TranslationEditorRenderViewportState {
  fieldPath: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  selectionDirection: 'forward' | 'backward' | 'none' | null;
  scrollX: number;
  scrollY: number;
}

interface TranslationEditorToastHost {
  toastManager?: {
    error?: (message: string, duration?: number) => void;
  };
  notify?: {
    error?: (message: string, duration?: number) => void;
  };
}

export interface TranslationSuggestionCommandResult {
  assignment_id: string;
  field_path: string;
  suggested_text: string;
  provider?: string;
  model?: string;
  diagnostics?: Record<string, unknown>;
}

const TRANSLATION_DRAFT_SYNC_RESOURCE_KIND = 'translation_variant_draft';
const TRANSLATION_DRAFT_SYNC_OPERATION = 'autosave';

interface TranslationSyncResourceRef {
  kind: string;
  id: string;
  scope?: Record<string, string>;
}

interface TranslationSyncResourceSnapshot<T = unknown> {
  ref: TranslationSyncResourceRef;
  data: T;
  revision: number;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

interface TranslationSyncMutationResponse<T = unknown> {
  snapshot: TranslationSyncResourceSnapshot<T>;
  applied: boolean;
  replay: boolean;
}

interface TranslationSyncConflict<T = unknown> {
  code: 'STALE_REVISION';
  message: string;
  currentRevision?: number;
  latestSnapshot: TranslationSyncResourceSnapshot<T> | null;
  staleSnapshot: TranslationSyncResourceSnapshot<T> | null;
}

interface TranslationSyncError<T = unknown> {
  code: string;
  message: string;
  details?: unknown;
  currentRevision?: number;
  resource?: TranslationSyncResourceSnapshot<T>;
  retriable?: boolean;
  conflict?: TranslationSyncConflict<T>;
}

interface TranslationSyncMutationInput<P = unknown> {
  ref?: TranslationSyncResourceRef;
  operation: string;
  payload: P;
  expectedRevision?: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

interface TranslationSyncResource<T = unknown, P = unknown> {
  load(): Promise<TranslationSyncResourceSnapshot<T>>;
  mutate(input: TranslationSyncMutationInput<P>): Promise<TranslationSyncMutationResponse<T>>;
  refresh(options?: { force?: boolean }): Promise<TranslationSyncResourceSnapshot<T>>;
  getSnapshot(): TranslationSyncResourceSnapshot<T> | null;
}

interface TranslationSyncTransport {
  load<T>(ref: TranslationSyncResourceRef): Promise<TranslationSyncResourceSnapshot<T>>;
  mutate<T, P>(input: TranslationSyncMutationInput<P> & { ref: TranslationSyncResourceRef }): Promise<TranslationSyncMutationResponse<T>>;
}

interface TranslationSyncCoreModule {
  createInMemoryCache(): {
    set<T>(ref: TranslationSyncResourceRef, snapshot: TranslationSyncResourceSnapshot<T> | null): unknown;
    clear(ref: TranslationSyncResourceRef): void;
  };
  createFetchSyncTransport(options?: Record<string, unknown>): TranslationSyncTransport;
  createSyncEngine(options: Record<string, unknown>): {
    resource<T, P = unknown>(ref: TranslationSyncResourceRef): TranslationSyncResource<T, P>;
  };
  parseReadEnvelope<T>(ref: TranslationSyncResourceRef, payload: unknown): TranslationSyncResourceSnapshot<T>;
}

declare global {
  interface Window {
    __translationSyncCoreLoader?: (clientBasePath: string) => Promise<TranslationSyncCoreModule>;
    __translationSyncCoreModule?: TranslationSyncCoreModule;
  }
}

const translationSyncCoreModuleCache = new Map<string, Promise<TranslationSyncCoreModule>>();

export async function loadTranslationSyncCoreModule(clientBasePath: string): Promise<TranslationSyncCoreModule> {
  const normalizedBasePath = normalizePathBase(clientBasePath);
  if (!normalizedBasePath) {
    throw new Error('syncClientBasePath is required to load sync-core');
  }
  if (typeof window !== 'undefined' && window.__translationSyncCoreModule) {
    return validateTranslationSyncCoreModule(window.__translationSyncCoreModule);
  }
  if (!translationSyncCoreModuleCache.has(normalizedBasePath)) {
    translationSyncCoreModuleCache.set(normalizedBasePath, importTranslationSyncCoreModule(normalizedBasePath));
  }
  return translationSyncCoreModuleCache.get(normalizedBasePath)!;
}

async function importTranslationSyncCoreModule(clientBasePath: string): Promise<TranslationSyncCoreModule> {
  if (typeof window !== 'undefined' && typeof window.__translationSyncCoreLoader === 'function') {
    return validateTranslationSyncCoreModule(await window.__translationSyncCoreLoader(clientBasePath));
  }
  const imported = await import(/* @vite-ignore */ `${clientBasePath}/index.js`);
  return validateTranslationSyncCoreModule(imported as TranslationSyncCoreModule);
}

function validateTranslationSyncCoreModule(module: TranslationSyncCoreModule): TranslationSyncCoreModule {
  if (
    !module
    || typeof module.createInMemoryCache !== 'function'
    || typeof module.createFetchSyncTransport !== 'function'
    || typeof module.createSyncEngine !== 'function'
    || typeof module.parseReadEnvelope !== 'function'
  ) {
    throw new TypeError('Invalid translation sync-core runtime module');
  }
  return module;
}

function normalizePathBase(value: string | undefined): string {
  return String(value || '').trim().replace(/\/+$/, '');
}

function deriveTranslationSyncBaseURL(
  variantEndpointBase: string,
  actionEndpointBase: string,
  detailEndpoint: string
): string {
  const variantBase = normalizePathBase(variantEndpointBase);
  if (/\/variants$/i.test(variantBase)) {
    return variantBase.replace(/\/variants$/i, '');
  }
  const actionBase = normalizePathBase(actionEndpointBase);
  if (/\/assignments$/i.test(actionBase)) {
    return actionBase.replace(/\/assignments$/i, '');
  }
  const endpoint = normalizePathBase(detailEndpoint);
  const assignmentMatch = endpoint.match(/^(.*)\/assignments(?:\/.*)?$/i);
  if (assignmentMatch) {
    return assignmentMatch[1];
  }
  return variantBase || actionBase || endpoint;
}

function deriveTranslationSyncClientBasePath(basePath: string): string {
  const normalized = normalizePathBase(basePath) || '/admin';
  return `${normalized}/sync-client/sync-core`;
}

function normalizeTranslationSyncScope(scope: Record<string, string> | undefined): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(scope || {})) {
    const normalizedKey = String(key || '').trim();
    const normalizedValue = String(value || '').trim();
    if (!normalizedKey || !normalizedValue) continue;
    normalized[normalizedKey] = normalizedValue;
  }
  return normalized;
}

const TRANSLATION_EDITOR_SCOPE_QUERY_KEYS = ['channel', 'tenant_id', 'org_id'] as const;

function translationScopeFromEndpoint(endpoint: string): Record<string, string> {
  try {
    const url = new URL(endpoint, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const scope: Record<string, string> = {};
    for (const key of TRANSLATION_EDITOR_SCOPE_QUERY_KEYS) {
      const value = String(url.searchParams.get(key) || '').trim();
      if (value) scope[key] = value;
    }
    return scope;
  } catch {
    return {};
  }
}

function deriveTranslationSyncScope(config: TranslationEditorScreenConfig): Record<string, string> {
  return normalizeTranslationSyncScope({
    ...translationScopeFromEndpoint(config.endpoint),
    ...(config.syncScope || {}),
  });
}

function translationSyncResourceKey(ref: TranslationSyncResourceRef): string {
  const scopeEntries = Object.entries(ref.scope || {})
    .filter(([key, value]) => key.trim() !== '' && value.trim() !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `${encodeURIComponent(ref.kind)}::${encodeURIComponent(ref.id)}::${scopeEntries}`;
}

function normalizeFieldCompleteness(value: unknown): TranslationEditorFieldCompleteness {
  const record = asRecord(value);
  return {
    required: asBoolean(record.required),
    complete: asBoolean(record.complete),
    missing: asBoolean(record.missing),
  };
}

function normalizeFieldDrift(value: unknown): TranslationEditorFieldDrift {
  const record = asRecord(value);
  const mode = asString(record.comparison_mode) === 'hash_only' ? 'hash_only' : 'snapshot';
  return {
    changed: asBoolean(record.changed),
    comparison_mode: mode,
    previous_source_value: asString(record.previous_source_value),
    current_source_value: asString(record.current_source_value),
  };
}

function normalizeFieldValidation(value: unknown): TranslationEditorFieldValidation {
  const record = asRecord(value);
  return {
    valid: record.valid !== false,
    message: asString(record.message),
  };
}

function normalizeFieldMap<T>(
  value: unknown,
  normalize: (entry: unknown) => T
): Record<string, T> {
  const record = asRecord(value);
  const out: Record<string, T> = {};
  for (const [key, candidate] of Object.entries(record)) {
    if (!key.trim()) continue;
    out[key.trim()] = normalize(candidate);
  }
  return out;
}

function normalizeGlossaryMatches(value: unknown): TranslationEditorGlossaryMatch[] {
  if (!Array.isArray(value)) return [];
  const out: TranslationEditorGlossaryMatch[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    const term = asString(record.term);
    const preferredTranslation = asString(record.preferred_translation);
    if (!term || !preferredTranslation) continue;
    out.push({
      term,
      preferred_translation: preferredTranslation,
      notes: asString(record.notes) || undefined,
      field_paths: asStringArray(record.field_paths),
    });
  }
  return out;
}

function normalizeStyleGuideSummary(value: unknown): TranslationEditorStyleGuideSummary {
  const record = asRecord(value);
  return {
    available: asBoolean(record.available),
    title: asString(record.title),
    summary: asString(record.summary) || asString(record.summary_markdown),
    rules: asStringArray(record.rules),
  };
}

function requestTraceID(headers: Headers): string {
  return asString(
    headers.get('x-trace-id')
    || headers.get('x-correlation-id')
    || headers.get('traceparent')
  );
}

function normalizeAttachment(value: unknown): TranslationEditorAttachment | null {
  const record = asRecord(value);
  const id = asString(record.id);
  const filename = asString(record.filename);
  if (!id && !filename) return null;
  return {
    id: id || filename || 'attachment',
    kind: asString(record.kind) || 'reference',
    filename: filename || id || 'attachment',
    byte_size: asNumber(record.byte_size),
    uploaded_at: asString(record.uploaded_at),
    description: asString(record.description),
    url: asString(record.url),
  };
}

function normalizeAttachments(value: unknown): TranslationEditorAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeAttachment(entry))
    .filter((entry): entry is TranslationEditorAttachment => entry !== null);
}

function normalizeAttachmentSummary(
  value: unknown,
  attachments: TranslationEditorAttachment[]
): TranslationEditorAttachmentSummary {
  const record = asRecord(value);
  const kindsRecord = asRecord(record.kinds);
  const kinds: Record<string, number> = {};
  for (const [key, candidate] of Object.entries(kindsRecord)) {
    const normalized = asNumber(candidate);
    if (!key.trim()) continue;
    kinds[key.trim()] = normalized;
  }
  if (!Object.keys(kinds).length) {
    for (const attachment of attachments) {
      kinds[attachment.kind] = (kinds[attachment.kind] || 0) + 1;
    }
  }
  return {
    total: asNumber(record.total, attachments.length),
    kinds,
  };
}

function normalizeHistoryEntryType(value: unknown): TranslationEditorHistoryEntryType {
  return asString(value) === 'comment' ? 'comment' : 'event';
}

function normalizeHistoryEntry(value: unknown): TranslationEditorHistoryEntry | null {
  const record = asRecord(value);
  const id = asString(record.id);
  if (!id) return null;
  return {
    id,
    entry_type: normalizeHistoryEntryType(record.entry_type),
    title: asString(record.title),
    body: asString(record.body),
    action: asString(record.action),
    actor_id: asString(record.actor_id),
    author_id: asString(record.author_id),
    created_at: asString(record.created_at),
    kind: asString(record.kind),
    metadata: asRecord(record.metadata),
  };
}

function normalizeHistoryPage(value: unknown): TranslationEditorHistoryPage {
  const record = asRecord(value);
  const items = Array.isArray(record.items)
    ? record.items
        .map((entry) => normalizeHistoryEntry(entry))
        .filter((entry): entry is TranslationEditorHistoryEntry => entry !== null)
    : [];
  return {
    items,
    page: asNumber(record.page, 1) || 1,
    per_page: asNumber(record.per_page, 10) || 10,
    total: asNumber(record.total, items.length),
    has_more: asBoolean(record.has_more),
    next_page: asNumber(record.next_page),
  };
}

function normalizeReviewFeedbackComment(value: unknown): TranslationEditorReviewFeedbackComment | null {
  const record = asRecord(value);
  const id = asString(record.id);
  const body = asString(record.body);
  if (!id && !body) return null;
  return {
    id: id || body || 'review-feedback',
    body,
    kind: asString(record.kind) || 'review_feedback',
    created_at: asString(record.created_at),
    author_id: asString(record.author_id) || undefined,
  };
}

function normalizeReviewFeedback(value: unknown, fallbackReason?: unknown): TranslationEditorReviewFeedback {
  const record = asRecord(value);
  const comments = Array.isArray(record.comments)
    ? record.comments
        .map((entry) => normalizeReviewFeedbackComment(entry))
        .filter((entry): entry is TranslationEditorReviewFeedbackComment => entry !== null)
    : [];
  const lastRejectionReason = asString(record.last_rejection_reason || fallbackReason) || undefined;
  if (!comments.length && lastRejectionReason) {
    comments.push({
      id: 'last-rejection-reason',
      body: lastRejectionReason,
      kind: 'review_feedback',
      created_at: '',
    });
  }
  return {
    last_rejection_reason: lastRejectionReason,
    comments,
  };
}

function normalizeQAFinding(value: unknown): TranslationEditorQAFinding | null {
  const record = asRecord(value);
  const id = asString(record.id);
  const message = asString(record.message);
  if (!id || !message) return null;
  return {
    id,
    category: asString(record.category) === 'style' ? 'style' : 'terminology',
    severity: asString(record.severity) === 'blocker' ? 'blocker' : 'warning',
    field_path: asString(record.field_path),
    message,
  };
}

function normalizeQACategorySummary(value: unknown, category: string): TranslationEditorQACategorySummary {
  const record = asRecord(value);
  return {
    category: asString(record.category) || category,
    enabled: asBoolean(record.enabled),
    feature_flag: asString(record.feature_flag) || undefined,
    finding_count: asNumber(record.finding_count),
    warning_count: asNumber(record.warning_count),
    blocker_count: asNumber(record.blocker_count),
  };
}

function normalizeQAResults(value: unknown): TranslationEditorQAResults {
  const record = asRecord(value);
  const summary = asRecord(record.summary);
  const categoriesRecord = asRecord(record.categories);
  const categories: Record<string, TranslationEditorQACategorySummary> = {};
  for (const [key, entry] of Object.entries(categoriesRecord)) {
    if (!key.trim()) continue;
    categories[key.trim()] = normalizeQACategorySummary(entry, key.trim());
  }
  const findings = Array.isArray(record.findings)
    ? record.findings
        .map((entry) => normalizeQAFinding(entry))
        .filter((entry): entry is TranslationEditorQAFinding => entry !== null)
    : [];
  return {
    enabled: asBoolean(record.enabled),
    summary: {
      finding_count: asNumber(summary.finding_count, findings.length),
      warning_count: asNumber(summary.warning_count),
      blocker_count: asNumber(summary.blocker_count),
    },
    categories,
    findings,
    save_blocked: asBoolean(record.save_blocked),
    submit_blocked: asBoolean(record.submit_blocked),
  };
}

function normalizeAssignmentSummary(value: unknown): TranslationEditorAssignmentSummary {
  const record = asRecord(value);
  return {
    id: asString(record.id || record.assignment_id),
    status: asString(record.status || record.queue_state),
    queue_state: asString(record.queue_state || record.status),
    source_title: asString(record.source_title),
    source_path: asString(record.source_path),
    assignee_id: asString(record.assignee_id),
    assignee_label: asString(record.assignee_label),
    display_assignee: asString(record.display_assignee || record.assignee_label || record.assignee_id),
    reviewer_id: asString(record.reviewer_id),
    reviewer_label: asString(record.reviewer_label),
    display_reviewer: asString(record.display_reviewer || record.reviewer_label || record.reviewer_id),
    due_state: asString(record.due_state),
    due_date: asString(record.due_date),
    version: asNumber(record.version || record.row_version),
    row_version: asNumber(record.row_version || record.version),
    updated_at: asString(record.updated_at),
  };
}

function normalizeLocaleNavigationEntry(value: unknown, currentLocale = ''): TranslationEditorLocaleNavigationEntry | null {
  const record = asRecord(value);
  const locale = asString(record.locale).trim().toLowerCase();
  if (!locale) return null;
  const href = asString(record.href).trim();
  const enabled = asBoolean(record.enabled) && href !== '';
  const reason = asString(record.reason || record.disabled_reason);
  return {
    locale,
    label: asString(record.label) || locale.toUpperCase(),
    current: asBoolean(record.current) || (currentLocale !== '' && locale === currentLocale),
    source: asBoolean(record.source),
    enabled,
    disabled: asBoolean(record.disabled) || !enabled,
    reason,
    href: enabled ? href : undefined,
    assignment_id: asString(record.assignment_id) || undefined,
    status: asString(record.status) || undefined,
    work_scope: asString(record.work_scope) || undefined,
  };
}

function normalizeLocaleNavigation(value: unknown, fallback: Record<string, unknown>): TranslationEditorLocaleNavigation {
  const record = asRecord(value);
  const currentLocale = (
    asString(record.current_locale)
    || asString(fallback.target_locale)
    || asString(fallback.locale)
  ).trim().toLowerCase();
  const sourceLocale = (
    asString(record.source_locale)
    || asString(fallback.source_locale)
  ).trim().toLowerCase();
  const locales = Array.isArray(record.locales)
    ? record.locales
        .map((entry) => normalizeLocaleNavigationEntry(entry, currentLocale))
        .filter((entry): entry is TranslationEditorLocaleNavigationEntry => entry !== null)
    : [];
  return {
    family_id: asString(record.family_id) || asString(fallback.family_id),
    current_locale: currentLocale,
    source_locale: sourceLocale,
    current_work_scope: asString(record.current_work_scope),
    family_detail_url: asString(record.family_detail_url),
    locales,
  };
}

function normalizePreviewAction(value: unknown, fallback: Record<string, unknown>): TranslationEditorPreviewAction {
  const record = asRecord(value);
  const enabled = asBoolean(record.enabled);
  const targetRecordID = asString(record.target_record_id) || asString(record.record_id) || asString(fallback.target_record_id);
  const reason = asString(record.reason);
  const reasonCode = asString(record.reason_code);
  return {
    enabled,
    url: asString(record.url) || undefined,
    reason: reason || (enabled ? '' : 'Preview is unavailable for this assignment.'),
    reason_code: reasonCode || (enabled ? '' : 'preview_unavailable'),
    assignment_id: asString(record.assignment_id) || asString(fallback.assignment_id),
    entity_type: asString(record.entity_type) || asString(fallback.entity_type),
    record_id: asString(record.record_id) || targetRecordID,
    target_record_id: targetRecordID,
    target_locale: asString(record.target_locale) || asString(fallback.target_locale),
    channel: asString(record.channel) || asString(fallback.channel),
  };
}

export function normalizeEditorAssistPayload(
  value: unknown,
  fallbackRoot?: unknown
): TranslationEditorAssistPayload {
  const assist = asRecord(value);
  const root = asRecord(fallbackRoot);
  return {
    glossary_matches: normalizeGlossaryMatches(
      assist.glossary_matches ?? root.glossary_matches
    ),
    style_guide_summary: normalizeStyleGuideSummary(
      assist.style_guide_summary ?? root.style_guide_summary
    ),
    translation_memory_suggestions: Array.isArray(assist.translation_memory_suggestions)
      ? assist.translation_memory_suggestions.filter((entry) => entry && typeof entry === 'object') as Record<string, unknown>[]
      : [],
  };
}

function normalizeActionStateMap(value: unknown): Record<string, TranslationActionState> {
  const record = asRecord(value);
  const out: Record<string, TranslationActionState> = {};
  for (const [key, candidate] of Object.entries(record)) {
    const normalized = normalizeTranslationActionState(candidate);
    if (!normalized || !key.trim()) continue;
    out[key.trim()] = normalized;
  }
  return out;
}

function normalizeSuggestionActionState(value: unknown, fallback: Partial<TranslationSuggestionActionState> = {}): TranslationSuggestionActionState {
  const raw = asRecord(value);
  const normalized = normalizeTranslationActionState(raw) || { enabled: false };
  const payload = asRecord(raw.payload ?? fallback.payload);
  const assignmentID = asString(raw.assignment_id ?? payload.assignment_id ?? fallback.assignment_id);
  const fieldPath = asString(raw.field_path ?? payload.field_path ?? fallback.field_path);
  const endpoint = asString(raw.endpoint ?? raw.rpc_invoke_path ?? fallback.endpoint ?? fallback.rpc_invoke_path);
  const executionMode = asString(raw.execution_mode ?? raw.executionMode ?? fallback.execution_mode);
  const idempotencyKey = asString(raw.idempotency_key ?? raw.idempotencyKey ?? payload.idempotency_key ?? payload.idempotencyKey ?? fallback.idempotency_key);
  return {
    ...normalized,
    assignment_id: assignmentID,
    field_path: fieldPath,
    command_name: asString(raw.command_name ?? fallback.command_name) || 'translations.suggestions.generate',
    transport: asString(raw.transport ?? fallback.transport) || 'rpc',
    rpc_method: asString(raw.rpc_method ?? fallback.rpc_method) || 'admin.commands.dispatch',
    endpoint,
    rpc_invoke_path: asString(raw.rpc_invoke_path ?? fallback.rpc_invoke_path) || endpoint,
    execution_mode: executionMode,
    idempotency_key: idempotencyKey,
    payload: {
      ...payload,
      ...(assignmentID ? { assignment_id: assignmentID } : {}),
      ...(fieldPath ? { field_path: fieldPath } : {}),
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
    },
  };
}

function normalizeContentNavigationEntry(value: unknown): TranslationEditorContentNavigationEntry | undefined {
  const record = asRecord(value);
  const recordID = asString(record.record_id);
  const detailURL = asString(record.detail_url ?? record.content_detail_url);
  const editURL = asString(record.edit_url ?? record.content_edit_url);
  if (!recordID || (!detailURL && !editURL)) return undefined;
  return {
    content_type: asString(record.content_type),
    record_id: recordID,
    locale: asString(record.locale),
    channel: asString(record.channel),
    detail_url: detailURL,
    edit_url: editURL,
    content_detail_url: asString(record.content_detail_url) || detailURL,
    content_edit_url: asString(record.content_edit_url) || editURL,
    can_view: Object.prototype.hasOwnProperty.call(record, 'can_view') ? asBoolean(record.can_view) : Boolean(detailURL),
    can_edit: Object.prototype.hasOwnProperty.call(record, 'can_edit') ? asBoolean(record.can_edit) : Boolean(editURL),
    edit_disabled_reason: asString(record.edit_disabled_reason),
    edit_disabled_reason_code: asString(record.edit_disabled_reason_code),
    label: asString(record.label) || 'Edit content',
    detail_label: asString(record.detail_label) || 'View content',
  };
}

function normalizeContentNavigation(value: unknown): TranslationEditorContentNavigation {
  const record = asRecord(value);
  return {
    source: normalizeContentNavigationEntry(record.source),
    target: normalizeContentNavigationEntry(record.target),
  };
}

function normalizeFieldEntries(
  record: Record<string, unknown>,
  sourceFields: Record<string, string>,
  targetFields: Record<string, string>,
  completeness: Record<string, TranslationEditorFieldCompleteness>,
  drift: Record<string, TranslationEditorFieldDrift>,
  validations: Record<string, TranslationEditorFieldValidation>
): TranslationEditorFieldEntry[] {
  const assignmentID = asString(record.assignment_id);
  const detailSuggestionAction = normalizeSuggestionActionState(record.suggest_translation_action, {
    assignment_id: assignmentID,
  });
  if (Array.isArray(record.fields)) {
    return record.fields
      .map((entry) => {
        const field = asRecord(entry);
        const path = asString(field.path);
        if (!path) return null;
        const hasTargetField = Object.prototype.hasOwnProperty.call(targetFields, path);
        return {
          path,
          label: asString(field.label) || path,
          input_type: asString(field.input_type) || 'text',
          required: asBoolean(field.required),
          source_value: asString(field.source_value) || sourceFields[path] || '',
          target_value: hasTargetField ? targetFields[path] : asString(field.target_value),
          completeness: normalizeFieldCompleteness(field.completeness ?? completeness[path]),
          drift: normalizeFieldDrift(field.drift ?? drift[path]),
          validation: normalizeFieldValidation(field.validation ?? validations[path]),
          glossary_hits: Array.isArray(field.glossary_hits)
            ? field.glossary_hits.filter((candidate) => candidate && typeof candidate === 'object') as Record<string, unknown>[]
            : [],
          suggest_translation_action: normalizeSuggestionActionState(field.suggest_translation_action, {
            ...detailSuggestionAction,
            assignment_id: assignmentID || detailSuggestionAction.assignment_id,
            field_path: path || detailSuggestionAction.field_path,
          }),
        };
      })
      .filter((entry): entry is TranslationEditorFieldEntry => Boolean(entry));
  }

  const keys = new Set<string>([
    ...Object.keys(sourceFields),
    ...Object.keys(targetFields),
    ...Object.keys(completeness),
    ...Object.keys(drift),
    ...Object.keys(validations),
  ]);
  return Array.from(keys).sort().map((path) => ({
    path,
    label: path,
    input_type: 'text',
    required: completeness[path]?.required === true,
    source_value: sourceFields[path] || '',
    target_value: targetFields[path] || '',
    completeness: completeness[path] ?? { required: false, complete: true, missing: false },
    drift: drift[path] ?? {
      changed: false,
      comparison_mode: 'snapshot',
      previous_source_value: '',
      current_source_value: sourceFields[path] || '',
    },
    validation: validations[path] ?? { valid: true, message: '' },
    glossary_hits: [],
    suggest_translation_action: normalizeSuggestionActionState(null, {
      ...detailSuggestionAction,
      assignment_id: assignmentID || detailSuggestionAction.assignment_id,
      field_path: path || detailSuggestionAction.field_path,
    }),
  }));
}

export function normalizeAssignmentEditorDetail(raw: unknown): TranslationAssignmentEditorDetail {
  const envelope = asRecord(raw);
  const record = asRecord(envelope.data && typeof envelope.data === 'object' ? envelope.data : raw);
  const sourceFields = normalizeStringRecord(record.source_fields, { trimKeys: true, omitBlankKeys: true });
  const targetFields = normalizeStringRecord(record.target_fields ?? record.fields, { trimKeys: true, omitBlankKeys: true });
  const completeness = normalizeFieldMap(record.field_completeness, normalizeFieldCompleteness);
  const drift = normalizeFieldMap(record.field_drift, normalizeFieldDrift);
  const validations = normalizeFieldMap(record.field_validations, normalizeFieldValidation);
  const attachments = normalizeAttachments(record.attachments);
  return {
    assignment_id: asString(record.assignment_id),
    assignment_row_version: asNumber(
      record.assignment_row_version
      || record.assignment_version
      || asRecord(record.translation_assignment).row_version
      || asRecord(record.translation_assignment).version
    ),
    variant_id: asString(record.variant_id),
    family_id: asString(record.family_id),
    entity_type: asString(record.entity_type) || undefined,
    source_locale: asString(record.source_locale) || undefined,
    target_locale: asString(record.target_locale) || undefined,
    status: asString(record.status) || undefined,
    priority: asString(record.priority) || undefined,
    due_date: asString(record.due_date) || undefined,
    row_version: asNumber(record.row_version || record.version),
    source_fields: sourceFields,
    target_fields: targetFields,
    fields: normalizeFieldEntries(record, sourceFields, targetFields, completeness, drift, validations),
    field_completeness: completeness,
    field_drift: drift,
    field_validations: validations,
    source_target_drift: asRecord(record.source_target_drift),
    history: normalizeHistoryPage(record.history),
    attachments,
    attachment_summary: normalizeAttachmentSummary(record.attachment_summary, attachments),
    translation_assignment: normalizeAssignmentSummary(record.translation_assignment),
    assist: normalizeEditorAssistPayload(record.assist, record),
    last_rejection_reason: asString(record.last_rejection_reason) || undefined,
    review_feedback: normalizeReviewFeedback(record.review_feedback, record.last_rejection_reason),
    qa_results: normalizeQAResults(record.qa_results),
    assignment_action_states: normalizeActionStateMap(
      record.assignment_action_states ?? record.editor_actions ?? record.actions
    ),
    review_action_states: normalizeActionStateMap(
      record.review_action_states ?? record.review_actions
    ),
    suggest_translation_action: normalizeSuggestionActionState(record.suggest_translation_action, {
      assignment_id: asString(record.assignment_id),
    }),
    locale_navigation: normalizeLocaleNavigation(record.locale_navigation, record),
    content_navigation: normalizeContentNavigation(record.content_navigation),
    preview_action: normalizePreviewAction(record.preview_action, record),
  };
}

export function normalizeEditorUpdateResponse(raw: unknown): TranslationEditorUpdateResponse {
  const envelope = asRecord(raw);
  const record = asRecord(envelope.data && typeof envelope.data === 'object' ? envelope.data : raw);
  const previewActionRecord = asRecord(record.preview_action);
  return {
    variant_id: asString(record.variant_id),
    row_version: asNumber(record.row_version || record.version),
    fields: normalizeStringRecord(record.fields ?? record.target_fields, { trimKeys: true, omitBlankKeys: true }),
    field_completeness: normalizeFieldMap(record.field_completeness, normalizeFieldCompleteness),
    field_drift: normalizeFieldMap(record.field_drift, normalizeFieldDrift),
    field_validations: normalizeFieldMap(record.field_validations, normalizeFieldValidation),
    source_target_drift: asRecord(record.source_target_drift),
    assist: normalizeEditorAssistPayload(record.assist, record),
    qa_results: normalizeQAResults(record.qa_results),
    assignment_action_states: normalizeActionStateMap(record.assignment_action_states),
    review_action_states: normalizeActionStateMap(record.review_action_states),
    preview_action: Object.keys(previewActionRecord).length
      ? normalizePreviewAction(previewActionRecord, record)
      : undefined,
  };
}

function rebuildFieldEntries(detail: TranslationAssignmentEditorDetail): TranslationEditorFieldEntry[] {
  return normalizeFieldEntries(
    { fields: detail.fields } as Record<string, unknown>,
    detail.source_fields,
    detail.target_fields,
    detail.field_completeness,
    detail.field_drift,
    detail.field_validations
  );
}

function computeCanSubmitReview(detail: TranslationAssignmentEditorDetail): boolean {
  const submit = detail.assignment_action_states.submit_review;
  if (!submit?.enabled) return false;
  if (detail.qa_results.submit_blocked) return false;
  for (const entry of Object.values(detail.field_completeness)) {
    if (entry.required && entry.missing) return false;
  }
  return true;
}

export function createTranslationEditorState(detail: TranslationAssignmentEditorDetail): TranslationEditorState {
  return {
    detail: {
      ...detail,
      fields: rebuildFieldEntries(detail),
    },
    dirty_fields: {},
    assignment_row_version: detail.assignment_row_version,
    row_version: detail.row_version,
    can_submit_review: computeCanSubmitReview(detail),
    autosave: {
      pending: false,
      conflict: null,
    },
  };
}

export function applyEditorFieldChange(
  state: TranslationEditorState,
  path: string,
  value: string
): TranslationEditorState {
  const fieldPath = path.trim();
  if (!fieldPath) return state;
  const nextTargetFields = {
    ...state.detail.target_fields,
    [fieldPath]: value.trim(),
  };
  const required = state.detail.field_completeness[fieldPath]?.required === true;
  const nextCompleteness = {
    ...state.detail.field_completeness,
    [fieldPath]: {
      required,
      complete: !required || value.trim() !== '',
      missing: required && value.trim() === '',
    },
  };
  const nextValidations = {
    ...state.detail.field_validations,
    [fieldPath]: {
      valid: !nextCompleteness[fieldPath].missing,
      message: nextCompleteness[fieldPath].missing
        ? state.detail.field_validations[fieldPath]?.message || `${fieldPath} is required`
        : '',
    },
  };
  const nextDetail: TranslationAssignmentEditorDetail = {
    ...state.detail,
    target_fields: nextTargetFields,
    field_completeness: nextCompleteness,
    field_validations: nextValidations,
  };
  nextDetail.fields = rebuildFieldEntries(nextDetail);
  return {
    ...state,
    detail: nextDetail,
    dirty_fields: {
      ...state.dirty_fields,
      [fieldPath]: value.trim(),
    },
    assignment_row_version: state.assignment_row_version,
    can_submit_review: computeCanSubmitReview(nextDetail),
  };
}

export function markEditorAutosavePending(state: TranslationEditorState): TranslationEditorState {
  return {
    ...state,
    assignment_row_version: state.assignment_row_version,
    autosave: {
      ...state.autosave,
      pending: true,
    },
  };
}

export function applyEditorUpdateResponse(
  state: TranslationEditorState,
  payload: unknown
): TranslationEditorState {
  const update = normalizeEditorUpdateResponse(payload);
  const assignmentActionStates = Object.keys(update.assignment_action_states).length
    ? update.assignment_action_states
    : state.detail.assignment_action_states;
  const reviewActionStates = Object.keys(update.review_action_states).length
    ? update.review_action_states
    : state.detail.review_action_states;
  const nextDetail: TranslationAssignmentEditorDetail = {
    ...state.detail,
    row_version: update.row_version,
    target_fields: {
      ...state.detail.target_fields,
      ...update.fields,
    },
    field_completeness: update.field_completeness,
    field_drift: update.field_drift,
    field_validations: update.field_validations,
    source_target_drift: Object.keys(asRecord(update.source_target_drift)).length
      ? update.source_target_drift
      : state.detail.source_target_drift,
    assist: update.assist,
    qa_results: update.qa_results,
    assignment_action_states: assignmentActionStates,
    review_action_states: reviewActionStates,
    preview_action: update.preview_action || state.detail.preview_action,
  };
  nextDetail.fields = rebuildFieldEntries(nextDetail);
  return {
    ...state,
    detail: nextDetail,
    dirty_fields: {},
    assignment_row_version: state.assignment_row_version,
    row_version: update.row_version,
    can_submit_review: computeCanSubmitReview(nextDetail),
    autosave: {
      pending: false,
      conflict: null,
    },
  };
}

function editorUpdatePayloadFromSyncSnapshot(
  snapshot: TranslationSyncResourceSnapshot<unknown>
): Record<string, unknown> {
  const data = asRecord(snapshot.data);
  const draftData = { ...data };
  delete draftData.assignment_action_states;
  delete draftData.editor_actions;
  delete draftData.actions;
  delete draftData.review_action_states;
  delete draftData.review_actions;
  const rowVersion = snapshot.revision || asNumber(data.row_version || data.version);
  return {
    data: {
      ...draftData,
      row_version: rowVersion,
      version: rowVersion,
    },
  };
}

function isUsableTranslationSyncSnapshot(snapshot: TranslationSyncResourceSnapshot<unknown> | null | undefined): boolean {
  return Object.keys(asRecord(snapshot?.data)).length > 0;
}

export function applyEditorAutosaveConflict(
  state: TranslationEditorState,
  payload: unknown
): TranslationEditorState {
  const record = asRecord(payload);
  const error = asRecord(record.error);
  const details = asRecord(error.details ?? record.details);
  const resource = asRecord(
    record.resource
    || details.resource
    || asRecord(record.conflict).latestSnapshot
    || asRecord(error.conflict).latestSnapshot
  );
  const latestData = resource.data && typeof resource.data === 'object'
    ? asRecord(resource.data)
    : {};
  const latestRevision = asNumber(resource.revision);
  const metadata = asRecord(error.metadata);
  const conflict = Object.keys(latestData).length
    ? {
        ...latestData,
        row_version: asNumber(latestData.row_version || latestData.version, latestRevision) || latestRevision,
      }
    : asRecord(metadata.latest_server_state_record);
  return {
    ...state,
    assignment_row_version: state.assignment_row_version,
    autosave: {
      pending: false,
      conflict,
    },
  };
}

function syncConflictPayloadFromError(error: unknown): Record<string, unknown> {
  const record = asRecord(error);
  const cause = asRecord(record.cause);
  const details = asRecord(record.details);
  const resource = record.resource || details.resource;
  if (record.code === 'STALE_REVISION') {
    return {
      error: {
        code: 'STALE_REVISION',
        message: asString(record.message) || 'stale revision',
        details: {
          current_revision: asNumber(record.currentRevision || details.current_revision),
          resource,
        },
      },
      resource,
      conflict: record.conflict,
    };
  }
  if (cause.code === 'STALE_REVISION') {
    return syncConflictPayloadFromError(cause);
  }
  return record;
}

function syncConflictLatestSnapshotFromError(error: unknown): TranslationSyncResourceSnapshot<unknown> | null {
  const record = asRecord(error);
  const details = asRecord(record.details);
  const conflict = asRecord(record.conflict);
  const resource = record.resource || details.resource || conflict.latestSnapshot;
  const resourceRecord = asRecord(resource);
  const latestData = asRecord(resourceRecord.data);
  const revision = asNumber(resourceRecord.revision || record.currentRevision || details.current_revision);
  const updatedAt = asString(resourceRecord.updatedAt || resourceRecord.updated_at) || new Date().toISOString();
  if (!Object.keys(latestData).length || revision <= 0) {
    return null;
  }
  return {
    ref: asRecord(resourceRecord.ref) as unknown as TranslationSyncResourceRef,
    data: latestData,
    revision,
    updatedAt,
    metadata: asRecord(resourceRecord.metadata),
  };
}

function currentSourceHashFromDetail(detail: TranslationAssignmentEditorDetail): string {
  return asString(asRecord(detail.source_target_drift).current_source_hash);
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

function isStaleRevisionError(error: unknown): error is TranslationSyncError {
  const record = asRecord(error);
  const cause = asRecord(record.cause);
  return record.code === 'STALE_REVISION' || cause.code === 'STALE_REVISION';
}

function buildURLWithParams(endpoint: string, params: Record<string, string | number | undefined>): string {
  const url = new URL(endpoint, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || `${value}`.trim() === '') continue;
    url.searchParams.set(key, String(value));
  }
  if (/^https?:\/\//i.test(endpoint)) {
    return url.toString();
  }
  return `${url.pathname}${url.search}`;
}

function closePreviewWindow(previewWindow: Window | null): void {
  if (!previewWindow || typeof previewWindow.close !== 'function') return;
  try {
    previewWindow.close();
  } catch {
    return;
  }
}

async function writeTextToClipboard(text: string): Promise<boolean> {
  const value = String(text || '');
  const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
  if (clipboard && typeof clipboard.writeText === 'function') {
    try {
      await clipboard.writeText(value);
      return true;
    } catch {
      // Fall back for browsers or contexts that expose but block Clipboard API.
    }
  }
  return fallbackWriteTextToClipboard(value);
}

function fallbackWriteTextToClipboard(text: string): boolean {
  if (typeof document === 'undefined' || !document.body || typeof document.execCommand !== 'function') {
    return false;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function navigatePreviewWindow(previewWindow: Window, url: string): void {
  try {
    if (previewWindow.location && typeof previewWindow.location.assign === 'function') {
      previewWindow.location.assign(url);
      return;
    }
  } catch {
    // Fall back to href assignment below.
  }
  previewWindow.location.href = url;
}

export class TranslationEditorRequestError extends Error {
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
    this.name = 'TranslationEditorRequestError';
    this.status = input.status;
    this.code = input.code ?? null;
    this.metadata = input.metadata ?? null;
    this.requestId = input.requestId;
    this.traceId = input.traceId;
  }
}

async function buildEditorRequestError(response: Response, fallback: string): Promise<TranslationEditorRequestError> {
  const structured = await extractStructuredError(response);
  return new TranslationEditorRequestError({
    message: structured.message || await readHTTPError(response, fallback),
    status: response.status,
    code: structured.textCode,
    metadata: structured.metadata,
    requestId: asString(response.headers.get('x-request-id')) || undefined,
    traceId: requestTraceID(response.headers) || undefined,
  });
}

export async function fetchTranslationEditorDetailState(endpoint: string): Promise<TranslationEditorLoadState> {
  const response = await httpRequest(endpoint, { method: 'GET' });
  const requestId = asString(response.headers.get('x-request-id')) || undefined;
  const traceId = requestTraceID(response.headers) || undefined;
  if (!response.ok) {
    const structured = await extractStructuredError(response);
    return {
      status: structured.textCode === 'VERSION_CONFLICT' ? 'conflict' : 'error',
      message: structured.message || `Failed to load assignment (${response.status})`,
      requestId,
      traceId,
      statusCode: response.status,
      errorCode: structured.textCode,
    };
  }
  const raw = await response.json();
  const detail = normalizeAssignmentEditorDetail(raw);
  if (!detail.assignment_id) {
    return {
      status: 'empty',
      message: 'Assignment detail payload was empty.',
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
}

function byteSizeLabel(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function assignmentLifecycleStatus(detail: TranslationAssignmentEditorDetail): string {
  return asString(detail.status || detail.translation_assignment.status || detail.translation_assignment.queue_state);
}

function isReviewLifecycleStatus(status: string): boolean {
  return status === 'review' || status === 'in_review';
}

function isChangesRequestedLifecycleStatus(status: string): boolean {
  return status === 'changes_requested';
}

function shouldShowResumeWorkAction(detail: TranslationAssignmentEditorDetail): boolean {
  return isChangesRequestedLifecycleStatus(assignmentLifecycleStatus(detail));
}

function shouldShowReviewActions(detail: TranslationAssignmentEditorDetail): boolean {
  const status = assignmentLifecycleStatus(detail);
  if (isReviewLifecycleStatus(status)) return true;
  return Boolean(detail.review_action_states.approve?.enabled || detail.review_action_states.reject?.enabled);
}

function shouldShowManagementActions(detail: TranslationAssignmentEditorDetail): boolean {
  return Boolean(detail.assignment_action_states.archive?.enabled);
}

function isTranslationEditorReadOnly(detail: TranslationAssignmentEditorDetail): boolean {
  const status = assignmentLifecycleStatus(detail);
  return status === 'review' || status === 'in_review' || status === 'approved' || status === 'archived';
}

function readOnlyEditorMessage(detail: TranslationAssignmentEditorDetail): string {
  const status = sentenceCaseToken(assignmentLifecycleStatus(detail) || 'unavailable').toLowerCase();
  return `This assignment is ${status} and can be inspected but not edited.`;
}

/**
 * Renders the muted field-key line under a field title. The key is omitted
 * when it would just repeat the label ("Excerpt" / "EXCERPT" duplication).
 */
function renderFieldKeyLine(label: string, path: string, required: boolean): string {
  const showKey = Boolean(path) && label.trim().toLowerCase() !== path.trim().toLowerCase();
  if (!showKey && !required) {
    return '';
  }
  const parts = [
    showKey ? escapeHTML(path) : '',
    required ? 'Required' : '',
  ].filter(Boolean);
  return `<p class="mt-1 text-xs text-gray-500">${parts.join(' • ')}</p>`;
}

/**
 * Renders the submit-review affordance. Workflow states (in review, approved,
 * archived, changes requested) render as registry-backed status chips — a
 * status must never look like a button. Mirrors the SSR template logic in
 * resources/translations/editor.html.
 */
function renderSubmitReviewControl(
  detail: TranslationAssignmentEditorDetail,
  submitting: boolean,
  submitDisabled: boolean,
  submitTitle: string
): string {
  if (detail.assignment_action_states.submit_review?.enabled) {
    return `
      <button
        type="button"
        class="${BTN_PRIMARY}"
        data-action="submit-review"
        title="${escapeAttribute(submitTitle)}"
        ${submitDisabled ? 'disabled aria-disabled="true"' : ''}
      >
        ${submitting ? 'Submitting...' : 'Submit review'}
      </button>
    `;
  }
  const status = assignmentLifecycleStatus(detail);
  if (status === 'review' || status === 'in_review' || status === 'approved' || status === 'archived' || status === 'changes_requested') {
    return renderStatusChip(status);
  }
  return `
    <button
      type="button"
      class="${BTN_PRIMARY}"
      data-action="submit-review"
      title="${escapeAttribute(submitTitle)}"
      disabled aria-disabled="true"
    >
      Submit review
    </button>
  `;
}

function autosaveStateLabel(
  editorState: TranslationEditorState | null,
  hasDirtyFields: boolean,
  lastSavedMessage: string
): { tone: string; text: string; state: AutosaveState } {
  let state: AutosaveState = 'idle';
  if (editorState?.autosave.conflict) state = 'conflict';
  else if (editorState?.autosave.pending) state = 'saving';
  else if (hasDirtyFields) state = 'dirty';
  else if (lastSavedMessage) state = 'saved';

  return {
    tone: getAutosaveStateClass(state),
    text: getAutosaveStateLabel(state, lastSavedMessage),
    state,
  };
}

function renderDiagnostics(state: TranslationEditorLoadState): string {
  const parts = [
    state.requestId ? `Request ${escapeHTML(state.requestId)}` : '',
    state.traceId ? `Trace ${escapeHTML(state.traceId)}` : '',
    state.errorCode ? `Code ${escapeHTML(state.errorCode)}` : '',
  ].filter(Boolean);
  if (!parts.length) return '';
  return `<p class="mt-3 text-xs text-gray-500">${parts.join(' · ')}</p>`;
}

function renderFeedback(
  feedback: { kind: 'success' | 'error' | 'conflict'; message: string } | null
): string {
  if (!feedback) return '';
  const tone = feedback.kind === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : feedback.kind === 'conflict'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-rose-200 bg-rose-50 text-rose-800';
  return `
    <div class="rounded-xl border px-4 py-3 text-sm font-medium ${tone}" data-editor-feedback-kind="${escapeAttribute(feedback.kind)}" role="status" aria-live="polite">
      ${escapeHTML(feedback.message)}
    </div>
  `;
}

function qaSummaryChips(detail: TranslationAssignmentEditorDetail): string {
  const qa = detail.qa_results;
  if (!qa.enabled || qa.summary.finding_count <= 0) return '';

  const blockerClass = qa.summary.blocker_count > 0
    ? getMetaBadgeClass('error')
    : getMetaBadgeClass('success');
  const blockerText = qa.summary.blocker_count > 0
    ? `Blockers ${qa.summary.blocker_count}`
    : 'No blockers';

  return `
    <span class="${getMetaBadgeClass('warning')}">Warnings ${qa.summary.warning_count}</span>
    <span class="${blockerClass}">${blockerText}</span>
  `;
}

function buildSaveFeedbackMessage(qa: TranslationEditorQAResults, isAutosave: boolean): { kind: 'success' | 'conflict'; message: string; lastSaved: string } {
  if (qa.summary.blocker_count > 0) {
    return {
      kind: 'conflict',
      message: `Draft saved with ${qa.summary.blocker_count} QA blocker${qa.summary.blocker_count === 1 ? '' : 's'} and ${qa.summary.warning_count} warning${qa.summary.warning_count === 1 ? '' : 's'}. Submit remains blocked.`,
      lastSaved: isAutosave ? `Autosaved · ${qa.summary.blocker_count} blocker${qa.summary.blocker_count === 1 ? '' : 's'} remain` : 'Draft saved',
    };
  }
  if (qa.summary.warning_count > 0) {
    return {
      kind: 'success',
      message: `Draft saved with ${qa.summary.warning_count} QA warning${qa.summary.warning_count === 1 ? '' : 's'}. Submit remains available.`,
      lastSaved: isAutosave ? `Autosaved · ${qa.summary.warning_count} warning${qa.summary.warning_count === 1 ? '' : 's'}` : 'Draft saved',
    };
  }
  return {
    kind: 'success',
    message: 'Draft saved.',
    lastSaved: isAutosave ? 'Draft saved automatically' : 'Draft saved',
  };
}

function buildSubmitBlockedMessage(detail: TranslationAssignmentEditorDetail): string {
  const qa = detail.qa_results;
  if (qa.submit_blocked) {
    return `Resolve ${qa.summary.blocker_count} QA blocker${qa.summary.blocker_count === 1 ? '' : 's'} before submitting for review. ${qa.summary.warning_count} warning${qa.summary.warning_count === 1 ? '' : 's'} remain advisory.`;
  }
  return 'Submit for review is unavailable.';
}

function buildSubmitSuccessMessage(detail: TranslationAssignmentEditorDetail, status: string): string {
  const qa = detail.qa_results;
  const suffix = qa.summary.warning_count > 0
    ? ` ${qa.summary.warning_count} QA warning${qa.summary.warning_count === 1 ? '' : 's'} remain visible to reviewers.`
    : '';
  if (status === 'approved') {
    return `Submitted and auto-approved.${suffix}`;
  }
  return `Submitted for review.${suffix}`;
}

function renderLoadingState(): string {
  return renderPanelLoadingState({
    tag: 'section',
    text: 'Loading translation assignment…',
    showSpinner: false,
    containerClass: `${LOADING_STATE} p-8 shadow-sm`,
    textClass: 'text-sm font-medium text-gray-500',
  });
}

function renderEmptyState(title: string, message: string): string {
  return renderPanelState({
    tag: 'section',
    containerClass: `${EMPTY_STATE} p-8 text-center shadow-sm`,
    bodyClass: '',
    contentClass: '',
    title,
    titleTag: 'h2',
    titleClass: EMPTY_STATE_TITLE,
    message,
    messageClass: `${EMPTY_STATE_TEXT} mt-2`,
  });
}

function renderErrorState(title: string, message: string, state: TranslationEditorLoadState): string {
  return renderPanelState({
    tag: 'section',
    containerClass: `${ERROR_STATE} p-8 shadow-sm`,
    bodyClass: '',
    contentClass: '',
    title,
    titleTag: 'h2',
    titleClass: ERROR_STATE_TITLE,
    message,
    messageClass: `${ERROR_STATE_TEXT} mt-2`,
    actionsHtml: renderDiagnostics(state),
    role: 'alert',
  });
}

function renderHeader(
  detail: TranslationAssignmentEditorDetail,
  autosaveLabel: { tone: string; text: string; state: string },
  hasDirtyFields: boolean,
  submitting: boolean,
  saving: boolean,
  previewing: boolean,
  hasConflict: boolean,
  readOnly: boolean,
  basePath = ''
): string {
  const submitState = detail.assignment_action_states.submit_review;
  const resumeState = detail.assignment_action_states.claim;
  const previewState = detail.preview_action;
  const showResume = shouldShowResumeWorkAction(detail);
  const resumeDisabled = !resumeState?.enabled || saving || submitting || hasConflict;
  const submitDisabled = readOnly || !submitState?.enabled || saving || submitting || detail.qa_results.submit_blocked;
  const previewDisabled = !previewState?.enabled || saving || submitting || previewing || hasConflict;
  const saveDisabled = readOnly || saving || !hasDirtyFields;
  const sourceLocale = (detail.source_locale || 'source').toUpperCase();
  const targetLocale = (detail.target_locale || 'target').toUpperCase();
  const assignment = detail.translation_assignment;
  const submitTitle = readOnly
    ? readOnlyEditorMessage(detail)
    : detail.qa_results.submit_blocked
    ? 'Resolve QA blockers before submitting for review.'
    : (submitState?.reason || '');
  const previewTitle = !previewState?.enabled
    ? (previewState?.reason || 'Preview is unavailable for this assignment.')
    : hasConflict
      ? 'Reload the latest server draft before opening preview.'
    : previewing
      ? 'Opening preview.'
      : 'Open preview in a new tab.';
  const resumeTitle = hasConflict
    ? 'Reload the latest server draft before resuming work.'
    : saving
      ? 'Wait for the current save to finish before resuming work.'
      : resumeState?.reason || 'Resume work on this assignment.';
  return `
    <section class="${CARD} p-6 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="${HEADER_PRETITLE}">Assignment editor</p>
          <div>
            <h1 class="${HEADER_TITLE}">${escapeHTML(assignment.source_title || 'Translation assignment')}</h1>
            <p class="mt-2 text-sm text-gray-600">
              ${escapeHTML(sourceLocale.toUpperCase())} → ${escapeHTML(targetLocale.toUpperCase())} • ${escapeHTML(getStatusLabel(detail.status || assignment.status || 'draft'))} • Priority ${escapeHTML(getStatusLabel(detail.priority || 'normal'))}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Assignee ${escapeHTML(assignment.display_assignee || assignment.assignee_label || assignment.assignee_id || 'Unassigned')}</span>
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Reviewer ${escapeHTML(assignment.display_reviewer || assignment.reviewer_label || assignment.reviewer_id || 'Not set')}</span>
            <span class="rounded-full px-3 py-1 font-medium ${autosaveLabel.tone}" data-autosave-state="${escapeAttribute(autosaveLabel.state)}">${escapeHTML(autosaveLabel.text)}</span>
            ${qaSummaryChips(detail)}
          </div>
        </div>
        <div class="flex flex-wrap items-start gap-3">
          <button
            type="button"
            class="${BTN_SECONDARY}"
            data-action="save-draft"
            ${saveDisabled ? 'disabled aria-disabled="true"' : ''}
          >
            ${saving ? 'Saving…' : 'Save draft'}
          </button>
          <div class="flex max-w-xs flex-col items-start gap-1">
            <button
              type="button"
              class="${BTN_SECONDARY}"
              data-action="preview-assignment"
              title="${escapeAttribute(previewTitle)}"
              data-preview-enabled="${previewState?.enabled ? 'true' : 'false'}"
              data-preview-reason-code="${escapeAttribute(previewState?.reason_code || '')}"
              ${previewDisabled ? 'disabled aria-disabled="true"' : ''}
            >
              ${previewing ? 'Opening...' : (previewState?.enabled ? 'Preview' : 'Preview unavailable')}
            </button>
            ${!previewState?.enabled && previewState?.reason ? `<p class="text-xs text-gray-500" data-preview-unavailable-reason="true">${escapeHTML(previewState.reason)}</p>` : ''}
          </div>
          ${showResume ? `
            <div class="flex max-w-xs flex-col items-start gap-1">
              <button
                type="button"
                class="${BTN_PRIMARY}"
                data-action="resume-work"
                title="${escapeAttribute(resumeTitle)}"
                ${resumeDisabled ? 'disabled aria-disabled="true"' : ''}
              >
                ${submitting && resumeState?.enabled ? 'Resuming...' : 'Resume work'}
              </button>
              ${resumeDisabled && resumeTitle ? `<p class="text-xs text-gray-500" data-resume-unavailable-reason="true">${escapeHTML(resumeTitle)}</p>` : ''}
            </div>
          ` : ''}
          <div class="flex max-w-xs flex-col items-start gap-1">
            ${renderSubmitReviewControl(detail, submitting, submitDisabled, submitTitle)}
            ${submitDisabled && submitTitle ? `<p class="text-xs text-gray-500" data-submit-unavailable-reason="true">${escapeHTML(submitTitle)}</p>` : ''}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderLocaleChip(entry: TranslationEditorLocaleNavigationEntry): string {
  const label = escapeHTML(entry.label || entry.locale.toUpperCase());
  const baseClass = 'inline-flex min-h-[24px] items-center rounded px-2 py-1 text-xs font-medium transition-colors';
  const currentClass = 'bg-blue-100 text-blue-700';
  const linkedClass = 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900';
  const disabledClass = 'cursor-not-allowed bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-200';
  const attrs = [
    `data-locale-chip="${escapeAttribute(entry.locale)}"`,
    entry.current ? 'data-locale-current="true"' : '',
    entry.disabled ? 'data-locale-disabled="true"' : '',
    entry.assignment_id ? `data-assignment-id="${escapeAttribute(entry.assignment_id)}"` : '',
  ].filter(Boolean).join(' ');

  if (entry.enabled && entry.href) {
    const toneClass = entry.current ? currentClass : linkedClass;
    const currentAttr = entry.current ? ' aria-current="page"' : '';
    return `<a href="${escapeAttribute(entry.href)}" class="${baseClass} ${toneClass}" ${attrs}${currentAttr} aria-label="Open ${escapeAttribute(entry.label || entry.locale.toUpperCase())} assignment">${label}</a>`;
  }
  if (entry.current) {
    return `<span class="${baseClass} ${currentClass}" ${attrs} aria-current="page">${label}</span>`;
  }
  const reason = entry.reason || 'No translation assignment exists for this locale.';
  return `<span class="${baseClass} ${disabledClass}" ${attrs} aria-disabled="true" title="${escapeAttribute(reason)}" aria-label="${escapeAttribute(`${entry.label || entry.locale.toUpperCase()} unavailable: ${reason}`)}">${label}</span>`;
}

function renderEditorLocaleSummary(detail: TranslationAssignmentEditorDetail): string {
  const navigation = detail.locale_navigation;
  const locales = navigation.locales;
  const currentLocale = navigation.current_locale || (detail.target_locale || '').toLowerCase();
  const currentLabel = (currentLocale || 'target').toUpperCase();
  if (!navigation.family_id && locales.length === 0 && !navigation.family_detail_url) {
    return '';
  }
  const chipEntries = locales.length > 0
    ? locales
    : [{
        locale: currentLocale,
        label: currentLabel,
        current: true,
        source: false,
        enabled: false,
        disabled: false,
        reason: '',
      }];
  return `
    <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" data-editor-locale-summary="true" data-family-id="${escapeAttribute(navigation.family_id || detail.family_id)}" data-current-locale="${escapeAttribute(currentLocale)}">
      <div class="p-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500">Locale</span>
            <div class="flex flex-wrap items-center gap-1" data-editor-locale-chips="true">
              ${chipEntries.map(renderLocaleChip).join('')}
            </div>
          </div>
        </div>
        ${navigation.family_detail_url ? `
          <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <p class="text-xs text-gray-500">Use the family detail view for blocker ordering, publish-gate rationale, and assignment context.</p>
            <a href="${escapeAttribute(navigation.family_detail_url)}" class="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800" data-family-detail-link="true" aria-label="Open translation family detail">
              Open family detail
              <span aria-hidden="true">›</span>
            </a>
          </div>
        ` : ''}
      </div>
    </section>
  `;
}

// T12: Suppress noisy drift details when before/current values are unavailable
function renderDriftNotice(entry: TranslationEditorFieldEntry): string {
  if (!shouldRenderFieldDriftDetail(entry)) return '';

  const hasPrevious = Boolean(entry.drift.previous_source_value && entry.drift.previous_source_value.trim());
  const hasCurrent = Boolean(entry.drift.current_source_value || entry.source_value);

  // If both values are unavailable, show a simplified notice
  if (!hasPrevious && !hasCurrent) {
    return `
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${escapeAttribute(entry.path)}">
        <p class="font-semibold">Source changed since the last synced draft.</p>
        <p class="mt-1 text-amber-700">Before/after values unavailable. Review the source field above.</p>
      </div>
    `;
  }

  // If only previous is unavailable, show a brief note
  if (!hasPrevious) {
    return `
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${escapeAttribute(entry.path)}">
        <p class="font-semibold">Source changed since the last synced draft.</p>
        <p class="mt-1 text-amber-700">Previous value unavailable. Review the current source text above.</p>
      </div>
    `;
  }

  // Full drift notice with before/after
  return `
    <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${escapeAttribute(entry.path)}">
      <p class="font-semibold">Source changed since the last synced draft.</p>
      <p class="mt-1"><span class="font-medium">Before:</span> ${escapeHTML(entry.drift.previous_source_value)}</p>
      <p class="mt-1"><span class="font-medium">Current:</span> ${escapeHTML(entry.drift.current_source_value || entry.source_value || 'Current value unavailable')}</p>
    </div>
  `;
}

function shouldRenderFieldDriftDetail(entry: TranslationEditorFieldEntry): boolean {
  if (!entry.drift.changed) return false;
  const hasPrevious = Boolean(entry.drift.previous_source_value && entry.drift.previous_source_value.trim());
  return entry.drift.comparison_mode !== 'hash_only' || hasPrevious;
}

function renderGlossaryHits(entry: TranslationEditorFieldEntry): string {
  const hits = Array.isArray(entry.glossary_hits) ? entry.glossary_hits : [];
  if (!hits.length) return '';
  return `
    <div class="mt-3 flex flex-wrap gap-2">
      ${hits.map((hit) => `
        <span class="${GLOSSARY_CHIP}">
          <span class="${GLOSSARY_CHIP_TERM}">${escapeHTML(asString(hit.term))}</span>
          → ${escapeHTML(asString(hit.preferred_translation))}
        </span>
      `).join('')}
    </div>
  `;
}

// T12: Editor issue summary interface
interface EditorFieldIssueSummary {
  totalFields: number;
  completeFields: number;
  missingRequiredFields: number;
  missingRequiredSourceFields: number;
  sourceChangedFields: number;
  validationErrors: number;
  qaBlockers: number;
  qaWarnings: number;
  firstIssuePath: string | null;
}

// T12: Compute field issue summary
function computeFieldIssueSummary(detail: TranslationAssignmentEditorDetail): EditorFieldIssueSummary {
  const fields = detail.fields || [];
  const qa = detail.qa_results;
  const targets: TranslationEditorIssueTargets = {
    missing: null,
    validation: null,
    qaBlocker: null,
    qaFinding: null,
    sourceDrift: null,
  };
  let firstMissingRequiredSourcePath: string | null = null;

  let completeFields = 0;
  let missingRequiredFields = 0;
  let missingRequiredSourceFields = 0;
  let sourceChangedFields = 0;
  let validationErrors = 0;

  for (const field of fields) {
    // Count completeness
    if (field.completeness.complete && !field.completeness.missing) {
      completeFields++;
    }

    // Count missing required
    if (field.completeness.required && field.completeness.missing) {
      missingRequiredFields++;
      if (!targets.missing) targets.missing = field.path;
    }

    if (field.required && !field.source_value.trim()) {
      missingRequiredSourceFields++;
      if (!firstMissingRequiredSourcePath) firstMissingRequiredSourcePath = field.path;
    }

    // Count source drift
    if (field.drift.changed) {
      sourceChangedFields++;
      if (!targets.sourceDrift) targets.sourceDrift = field.path;
    }

    // Count validation errors
    if (!field.validation.valid) {
      validationErrors++;
      if (!targets.validation) targets.validation = field.path;
    }
  }

  if (qa.enabled && qa.findings.length > 0) {
    const blockerFinding = qa.findings.find(f => f.severity === 'blocker');
    if (blockerFinding?.field_path) {
      targets.qaBlocker = blockerFinding.field_path;
    }
    const firstFinding = qa.findings.find(finding => finding.field_path);
    if (firstFinding?.field_path) {
      targets.qaFinding = firstFinding.field_path;
    }
  }

  return {
    totalFields: fields.length,
    completeFields,
    missingRequiredFields,
    missingRequiredSourceFields,
    sourceChangedFields,
    validationErrors,
    qaBlockers: qa.enabled ? qa.summary.blocker_count : 0,
    qaWarnings: qa.enabled ? qa.summary.warning_count : 0,
    firstIssuePath: firstMissingRequiredSourcePath || targets.missing || targets.validation || targets.qaBlocker || targets.qaFinding || targets.sourceDrift,
  };
}

function contentNavigationActionURL(entry?: TranslationEditorContentNavigationEntry): string {
  return asString(entry?.edit_url || entry?.content_edit_url || entry?.detail_url || entry?.content_detail_url);
}

function contentNavigationActionLabel(entry?: TranslationEditorContentNavigationEntry): string {
  if (!entry) return '';
  if (asString(entry.edit_url || entry.content_edit_url)) {
    return asString(entry.label) || 'Edit source content';
  }
  return asString(entry.detail_label) || 'View source content';
}

function renderSourceContentAction(
  entry: TranslationEditorContentNavigationEntry | undefined,
  placement: 'summary' | 'field',
  fieldLabel = ''
): string {
  const href = contentNavigationActionURL(entry);
  if (!href) return '';
  const label = contentNavigationActionLabel(entry);
  const context = fieldLabel ? ` for ${fieldLabel}` : '';
  const className = placement === 'summary'
    ? 'inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200'
    : 'mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 underline-offset-2 hover:text-amber-900 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-200';
  return `
    <a
      class="${className}"
      href="${escapeAttribute(href)}"
      data-source-content-action="${escapeAttribute(placement)}"
      aria-label="${escapeAttribute(`${label}${context}`)}"
    >
      ${placement === 'summary' ? renderEditorIcon(ICON_DOCUMENT, '14px') : ''}
      <span>${escapeHTML(label)}</span>
    </a>
  `;
}

// T12: Render field issue summary bar
function renderFieldIssueSummary(
  summary: EditorFieldIssueSummary,
  sourceNavigation?: TranslationEditorContentNavigationEntry
): string {
  const hasIssues = summary.missingRequiredFields > 0
    || summary.missingRequiredSourceFields > 0
    || summary.sourceChangedFields > 0
    || summary.validationErrors > 0
    || summary.qaBlockers > 0;

  const isReadyToSubmit = summary.completeFields === summary.totalFields
    && summary.missingRequiredFields === 0
    && summary.missingRequiredSourceFields === 0
    && summary.validationErrors === 0
    && summary.qaBlockers === 0;

  // Build summary chips with the shared status-chip anatomy (see input.css)
  const chips: string[] = [];
  const metaChip = (tone: string, text: string): string =>
    `<span class="status-chip status-chip--${tone}">${text}</span>`;

  chips.push(metaChip(isReadyToSubmit ? 'success' : 'neutral', `${summary.completeFields}/${summary.totalFields} complete`));

  if (summary.missingRequiredFields > 0) {
    chips.push(metaChip('error', `${summary.missingRequiredFields} missing required`));
  }

  if (summary.missingRequiredSourceFields > 0) {
    chips.push(metaChip('error', `${summary.missingRequiredSourceFields} source required pending`));
  }

  if (summary.sourceChangedFields > 0) {
    chips.push(metaChip('warning', `${summary.sourceChangedFields} source changed`));
  }

  if (summary.validationErrors > 0) {
    chips.push(metaChip('error', `${summary.validationErrors} validation ${summary.validationErrors === 1 ? 'error' : 'errors'}`));
  }

  if (summary.qaBlockers > 0) {
    chips.push(metaChip('error', `${summary.qaBlockers} QA ${summary.qaBlockers === 1 ? 'blocker' : 'blockers'}`));
  }

  if (summary.qaWarnings > 0) {
    chips.push(metaChip('warning', `${summary.qaWarnings} QA ${summary.qaWarnings === 1 ? 'warning' : 'warnings'}`));
  }

  // Summary bar background
  const barClass = isReadyToSubmit
    ? 'border-emerald-200 bg-emerald-50'
    : hasIssues
      ? 'border-amber-200 bg-amber-50'
      : 'border-gray-200 bg-gray-50';

  const jumpButton = summary.firstIssuePath
    ? `<button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        data-jump-to-field="${escapeAttribute(summary.firstIssuePath)}"
        title="Jump to first issue"
      >
        Jump to issue
        ${renderEditorIcon('iconoir:nav-arrow-down', '14px')}
      </button>`
    : '';
  const sourceAction = summary.missingRequiredSourceFields > 0
    ? renderSourceContentAction(sourceNavigation, 'summary')
    : '';

  return `
    <section class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${barClass}" aria-label="Field progress summary" data-editor-summary="true">
      <div class="flex flex-wrap items-center gap-2">${chips.join('')}</div>
      <div class="flex flex-wrap items-center gap-2">${sourceAction}${jumpButton}</div>
    </section>
  `;
}

// T12: Render contextual empty source state
function renderSourceValue(entry: TranslationEditorFieldEntry, sourceNavigation?: TranslationEditorContentNavigationEntry): string {
  if (entry.source_value && entry.source_value.trim()) {
    return escapeHTML(entry.source_value);
  }

  // Contextual empty state based on required status
  if (entry.required) {
    return `
      <span class="text-amber-600 italic">Source text pending - required field</span>
      ${renderSourceContentAction(sourceNavigation, 'field', entry.label)}
    `;
  }
  // Optional fields show minimal empty indicator
  return '<span class="text-gray-400 italic text-xs">Optional source content not provided</span>';
}

const COPY_SOURCE_BUTTON_CLASS =
  'inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium leading-4 text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-100';

function renderEditorIcon(icon: string, size = '16px'): string {
  return renderIcon(icon, { size, extraClass: 'text-current' });
}

function renderCopySourceIcon(): string {
  return renderEditorIcon(ICON_COPY, '12px');
}

export function buildTranslationSuggestionRPCRequest(
  action: TranslationSuggestionActionState,
  correlationId = ''
): Record<string, unknown> {
  const trimmedCorrelationId = asString(correlationId);
  const idempotencyKey = asString(action.idempotency_key || action.payload?.idempotency_key || action.payload?.idempotencyKey);
  const executionMode = asString(action.execution_mode);
  const metadata: Record<string, unknown> = {
    correlation_id: trimmedCorrelationId,
  };
  if (idempotencyKey) {
    metadata.idempotency_key = idempotencyKey;
  }
  const options: Record<string, unknown> = {
    CorrelationID: trimmedCorrelationId,
    Metadata: metadata,
  };
  if (executionMode) {
    options.Mode = executionMode;
  }
  if (idempotencyKey) {
    options.IdempotencyKey = idempotencyKey;
  }
  return {
    method: action.rpc_method || 'admin.commands.dispatch',
    params: {
      data: {
        name: action.command_name || 'translations.suggestions.generate',
        ids: action.assignment_id ? [action.assignment_id] : [],
        payload: {
          ...action.payload,
          assignment_id: action.assignment_id,
          field_path: action.field_path,
        },
        options,
      },
      meta: {
        correlationId: trimmedCorrelationId,
      },
    },
  };
}

function normalizeSuggestionCommandResult(input: unknown): TranslationSuggestionCommandResult | null {
  const result = asRecord(input);
  const assignmentID = asString(result.assignment_id ?? result.assignmentId);
  const fieldPath = asString(result.field_path ?? result.fieldPath);
  const suggestedText = asString(result.suggested_text ?? result.suggestedText);
  if (!assignmentID || !fieldPath || !suggestedText) return null;
  return {
    assignment_id: assignmentID,
    field_path: fieldPath,
    suggested_text: suggestedText,
    provider: asString(result.provider) || undefined,
    model: asString(result.model) || undefined,
    diagnostics: asRecord(result.diagnostics),
  };
}

function formatTranslationSuggestionErrorPayload(payload: Record<string, unknown>): string {
  const errorPayload = asRecord(payload.error);
  if (Object.keys(errorPayload).length === 0) {
    return '';
  }
  const metadata = {
    ...asRecord(errorPayload.metadata),
    ...asRecord(errorPayload.details),
  };
  return formatStructuredErrorForDisplay({
    textCode: asString(errorPayload.text_code ?? errorPayload.code) || null,
    message: asString(errorPayload.message) || 'Failed to generate translation suggestion.',
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
    fields: null,
    validationErrors: null,
  }, 'Failed to generate translation suggestion.');
}

export async function dispatchTranslationSuggestion(
  action: TranslationSuggestionActionState,
  correlationId = ''
): Promise<TranslationSuggestionCommandResult> {
  const endpoint = action.endpoint || action.rpc_invoke_path;
  if (!action.enabled) {
    throw new Error(action.reason || 'Translation suggestion is unavailable.');
  }
  if (!endpoint) {
    throw new Error('Translation suggestion RPC endpoint is not configured.');
  }
  const response = await httpRequest(endpoint, {
    method: 'POST',
    json: buildTranslationSuggestionRPCRequest(action, correlationId),
  });
  if (!response.ok) {
    const structured = await extractStructuredError(response);
    throw new Error(formatStructuredErrorForDisplay(structured, 'Failed to generate translation suggestion.'));
  }
  const payload = asRecord(await response.json().catch(() => ({})));
  const errorMessage = formatTranslationSuggestionErrorPayload(payload);
  if (errorMessage) {
    throw new Error(errorMessage);
  }
  const data = asRecord(payload.data);
  const result = normalizeSuggestionCommandResult(data.result ?? data.Result);
  if (!result) {
    throw new Error('Translation suggestion did not return suggested text.');
  }
  return result;
}

function shouldRenderSuggestionButton(action: TranslationSuggestionActionState): boolean {
  return action.enabled === true && Boolean(action.endpoint || action.rpc_invoke_path);
}

function renderSuggestTranslationButton(entry: TranslationEditorFieldEntry, readOnly: boolean, suggesting: boolean): string {
  const action = entry.suggest_translation_action;
  if (readOnly || !entry.source_value.trim() || !shouldRenderSuggestionButton(action)) return '';
  const disabled = suggesting;
  const title = suggesting
    ? 'Generating suggestion...'
    : `Generate translation suggestion for ${entry.label}`;
  const buttonContent = suggesting
    ? '<span class="h-3 w-3 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" aria-hidden="true"></span><span>Generating</span>'
    : `${renderEditorIcon('iconoir:spark', '12px')}<span>Generate suggestion</span>`;
  return `
    <button
      type="button"
      class="${COPY_SOURCE_BUTTON_CLASS}"
      data-suggest-translation="${escapeAttribute(entry.path)}"
      aria-label="Generate translation suggestion for ${escapeAttribute(entry.label)}"
      title="${escapeAttribute(title)}"
      ${disabled ? 'disabled aria-disabled="true"' : ''}
      ${suggesting ? 'aria-busy="true"' : ''}
    >
      ${buttonContent}
    </button>
  `;
}

function renderFieldList(detail: TranslationAssignmentEditorDetail, readOnly = false, suggestingFields: Set<string> = new Set()): string {
  const summary = computeFieldIssueSummary(detail);
  const sourceNavigation = detail.content_navigation?.source;
  const inputClass = readOnly
    ? 'mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600'
    : 'mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100';
  const textareaClass = readOnly
    ? 'mt-2 min-h-[140px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600'
    : 'mt-2 min-h-[140px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100';

  return `
    <section class="space-y-4">
      ${renderFieldIssueSummary(summary, sourceNavigation)}
      ${detail.fields.map((entry) => {
        const sourceHasText = Boolean(entry.source_value.trim());
        const copyDisabled = readOnly || !sourceHasText;
        return `
        <article class="rounded-xl border border-gray-200 bg-white p-5" data-editor-field="${escapeAttribute(entry.path)}" id="field-${escapeAttribute(entry.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">${escapeHTML(entry.label)}</h2>
              ${renderFieldKeyLine(entry.label, entry.path, entry.required)}
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="${COPY_SOURCE_BUTTON_CLASS}"
                data-copy-source="${escapeAttribute(entry.path)}"
                data-source-value="${escapeAttribute(entry.source_value)}"
                aria-label="Copy source text to translation field for ${escapeAttribute(entry.label)}"
                ${copyDisabled ? 'disabled aria-disabled="true"' : ''}
              >
                ${renderCopySourceIcon()}
                <span>Copy source</span>
              </button>
              ${renderSuggestTranslationButton(entry, readOnly, suggestingFields.has(entry.path))}
            </div>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-gray-800">${renderSourceValue(entry, sourceNavigation)}</div>
            </div>
            <div class="rounded-xl border ${entry.validation.valid ? 'border-gray-200' : 'border-rose-200'} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-wider text-gray-500" for="editor-field-${escapeAttribute(entry.path)}">Translation</label>
              ${entry.input_type === 'textarea'
                ? `<textarea id="editor-field-${escapeAttribute(entry.path)}" class="${textareaClass}" data-field-input="${escapeAttribute(entry.path)}" ${readOnly ? 'disabled aria-disabled="true"' : ''}>${escapeHTML(entry.target_value)}</textarea>`
                : `<input id="editor-field-${escapeAttribute(entry.path)}" type="text" class="${inputClass}" data-field-input="${escapeAttribute(entry.path)}" value="${escapeAttribute(entry.target_value)}" ${readOnly ? 'disabled aria-disabled="true"' : ''} />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${entry.completeness.missing ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">
                  ${entry.completeness.missing ? 'Missing required content' : 'Field complete'}
                </span>
                ${shouldRenderFieldDriftDetail(entry) ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ''}
              </div>
              ${entry.validation.valid ? '' : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${escapeAttribute(entry.path)}">${escapeHTML(entry.validation.message || 'Validation error')}</p>`}
              ${renderDriftNotice(entry)}
              ${renderGlossaryHits(entry)}
            </div>
          </div>
        </article>
      `;
      }).join('')}
    </section>
  `;
}

// T13: Translation memory suggestion interface
interface TranslationMemorySuggestion {
  id: string;
  score: number;
  sourceLabel: string;
  localePair: string;
  fieldPath: string;
  suggestedText: string;
  isStaleSource: boolean;
}

// T13: Normalize TM suggestions from backend
function normalizeTranslationMemorySuggestions(value: unknown): TranslationMemorySuggestion[] {
  if (!Array.isArray(value)) return [];
  const suggestions: TranslationMemorySuggestion[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    const suggestedText = asString(record.suggested_text) || asString(record.target_text);
    if (!suggestedText) continue;
    suggestions.push({
      id: asString(record.id) || `tm-${suggestions.length}`,
      score: normalizeTranslationMemoryScore(record.score, record.match_score),
      sourceLabel: asString(record.source_label) || asString(record.source) || 'Internal TM',
      localePair: asString(record.locale_pair) || '',
      fieldPath: asString(record.field_path) || '',
      suggestedText,
      isStaleSource: asBoolean(record.is_stale_source) || asBoolean(record.stale_source),
    });
  }
  return suggestions.sort((a, b) => b.score - a.score);
}

function normalizeTranslationMemoryScore(score: unknown, fallback?: unknown): number {
  const raw = asNumber(score) || asNumber(fallback);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  const percent = raw <= 1 ? raw * 100 : raw;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function translationMemoryScoreLabel(score: number): string {
  if (score >= 99) return 'Exact';
  if (score >= 80) return 'High';
  return 'Fuzzy';
}

// T13: Render translation memory suggestions section
function renderTranslationMemorySuggestions(suggestions: TranslationMemorySuggestion[]): string {
  if (!suggestions.length) {
    return `
      <div class="mt-4">
        <h3 class="text-sm font-semibold text-gray-800">Translation Memory</h3>
        <p class="mt-3 text-sm text-gray-500">No matching suggestions from translation memory.</p>
      </div>
    `;
  }

  return `
    <div class="mt-4" data-assist-section="tm">
      <h3 class="text-sm font-semibold text-gray-800">Translation Memory</h3>
      <ul class="mt-3 space-y-2">
        ${suggestions.map((suggestion) => `
          <li class="rounded-xl border ${suggestion.isStaleSource ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'} px-3 py-3 text-sm" data-tm-suggestion="${escapeAttribute(suggestion.id)}">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 break-words">${escapeHTML(suggestion.suggestedText)}</p>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span class="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">${translationMemoryScoreLabel(suggestion.score)} ${suggestion.score}%</span>
                  <span>${escapeHTML(suggestion.sourceLabel)}</span>
                  ${suggestion.localePair ? `<span class="text-gray-400">${escapeHTML(suggestion.localePair)}</span>` : ''}
                  ${suggestion.isStaleSource ? '<span class="text-amber-600">Source changed</span>' : ''}
                </div>
                ${suggestion.fieldPath ? `<p class="mt-1 text-xs text-gray-400">Field: ${escapeHTML(suggestion.fieldPath)}</p>` : ''}
              </div>
              <button
                type="button"
                class="flex-shrink-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-100"
                data-insert-tm="${escapeAttribute(suggestion.id)}"
                data-insert-text="${escapeAttribute(suggestion.suggestedText)}"
                data-insert-field="${escapeAttribute(suggestion.fieldPath)}"
                title="Insert this suggestion${suggestion.isStaleSource ? ' (source may have changed)' : ''}"
              >
                Insert
              </button>
            </div>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function renderAssistPanel(detail: TranslationAssignmentEditorDetail): string {
  const glossary = detail.assist.glossary_matches;
  const styleGuide = detail.assist.style_guide_summary;
  const tmSuggestions = normalizeTranslationMemorySuggestions(detail.assist.translation_memory_suggestions);

  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5" data-editor-panel="assist">
      <h2 class="text-lg font-semibold text-gray-900">Assist</h2>
      <div class="mt-4 space-y-4">
        ${renderTranslationMemorySuggestions(tmSuggestions)}
        <div data-assist-section="glossary">
          <h3 class="text-sm font-semibold text-gray-800">Glossary</h3>
          ${glossary.length
            ? `<ul class="mt-3 space-y-2">${glossary.map((entry) => `
                <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                  <strong class="text-gray-900">${escapeHTML(entry.term)}</strong> → ${escapeHTML(entry.preferred_translation)}
                  ${entry.notes ? `<p class="mt-1 text-xs text-gray-500">${escapeHTML(entry.notes)}</p>` : ''}
                </li>
              `).join('')}</ul>`
            : '<p class="mt-3 text-sm text-gray-500">Glossary matches unavailable for this assignment.</p>'}
        </div>
        <div data-assist-section="style-guide">
          <h3 class="text-sm font-semibold text-gray-800">Style guide</h3>
          ${styleGuide.available
            ? `
              <div class="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <p class="text-sm font-semibold text-gray-900">${escapeHTML(styleGuide.title)}</p>
                <p class="mt-2 text-sm text-gray-700">${escapeHTML(styleGuide.summary)}</p>
                <ul class="mt-3 space-y-2 text-sm text-gray-700">
                  ${styleGuide.rules.map((rule) => `<li>• ${escapeHTML(rule)}</li>`).join('')}
                </ul>
              </div>
            `
            : '<p class="mt-3 text-sm text-gray-500">Style-guide guidance is unavailable. Editing remains enabled.</p>'}
        </div>
      </div>
    </section>
  `;
}

interface TranslationEditorTimelineItem {
  id: string;
  title: string;
  body: string;
  created_at: string;
  badge: string;
  tone: TimelineTone;
}

function buildTimelineItems(detail: TranslationAssignmentEditorDetail): TranslationEditorTimelineItem[] {
  const items: TranslationEditorTimelineItem[] = detail.history.items.map((entry) => ({
    id: entry.id,
    title: entry.title || sentenceCaseToken(entry.entry_type),
    body: entry.body || '',
    created_at: entry.created_at,
    badge: entry.kind === 'review_feedback' ? 'Reviewer feedback' : entry.entry_type === 'comment' ? 'Comment' : 'Activity',
    tone: entry.kind === 'review_feedback' ? 'review' : 'event',
  }));

  if (detail.qa_results.enabled && detail.qa_results.summary.finding_count > 0) {
    items.push({
      id: 'timeline:qa-summary',
      title: 'Current QA findings',
      body: `${detail.qa_results.summary.blocker_count} blocker${detail.qa_results.summary.blocker_count === 1 ? '' : 's'} and ${detail.qa_results.summary.warning_count} warning${detail.qa_results.summary.warning_count === 1 ? '' : 's'} are active on this draft.`,
      created_at: detail.translation_assignment.updated_at || detail.due_date || '',
      badge: detail.qa_results.submit_blocked ? 'Submit blocked' : 'Warnings visible',
      tone: 'qa',
    });
  }

  if (detail.last_rejection_reason && !items.some((entry) => entry.body === detail.last_rejection_reason)) {
    items.push({
      id: 'timeline:last-rejection-reason',
      title: 'Reviewer feedback',
      body: detail.last_rejection_reason,
      created_at: detail.translation_assignment.updated_at || '',
      badge: 'Reviewer feedback',
      tone: 'review',
    });
  }

  return items.sort((left, right) => {
    const leftTime = left.created_at ? Date.parse(left.created_at) : 0;
    const rightTime = right.created_at ? Date.parse(right.created_at) : 0;
    return rightTime - leftTime;
  });
}

function renderQAPanel(detail: TranslationAssignmentEditorDetail): string {
  const qa = detail.qa_results;
  if (!qa.enabled) {
    return '';
  }
  const blockers = qa.findings.filter((finding) => finding.severity === 'blocker');
  const warnings = qa.findings.filter((finding) => finding.severity !== 'blocker');
  const renderFindings = (findings: TranslationEditorQAFinding[], severity: QASeverity): string => {
    if (!findings.length) {
      return '';
    }
    const classes = getQAFindingClasses(severity);
    return `
      <section data-qa-group="${escapeAttribute(severity === 'blocker' ? 'blockers' : 'warnings')}">
        <h3 class="text-sm font-semibold ${severity === 'blocker' ? 'text-rose-800' : 'text-amber-800'}">
          ${severity === 'blocker' ? `Blocking findings (${findings.length})` : `Warnings (${findings.length})`}
        </h3>
        <ol class="mt-3 space-y-3">${findings.map((finding) => `
          <li class="${classes.container}">
            <div class="flex items-center justify-between gap-3">
              <strong>${escapeHTML(sentenceCaseToken(finding.category))}</strong>
              <span class="${classes.badge}">${escapeHTML(finding.severity)}</span>
            </div>
            <p class="mt-2">${escapeHTML(finding.message)}</p>
            ${finding.field_path ? `
              <button
                type="button"
                class="mt-2 inline-flex items-center rounded-md border border-current px-2 py-1 text-xs font-medium opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current/20"
                data-jump-to-field="${escapeAttribute(finding.field_path)}"
                title="Jump to ${escapeAttribute(finding.field_path)}"
              >
                Field ${escapeHTML(finding.field_path)}
              </button>
            ` : ''}
          </li>
        `).join('')}</ol>
      </section>
    `;
  };
  return `
    <section class="${getQAPanelClass(qa.submit_blocked)}">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">QA checks</h2>
          <p class="mt-1 text-sm ${qa.submit_blocked ? 'text-rose-700' : 'text-gray-600'}">
            ${qa.submit_blocked ? 'Submit is blocked until blockers are resolved.' : 'Warnings are advisory; blockers must be resolved before submit.'}
          </p>
        </div>
        <span class="${qa.submit_blocked ? getMetaBadgeClass('error') : getMetaBadgeClass('neutral')}">
          ${qa.summary.finding_count} findings
        </span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 text-xs">
        <span class="${getMetaBadgeClass('warning')}">Warnings ${qa.summary.warning_count}</span>
        <span class="${getMetaBadgeClass('error')}">Blockers ${qa.summary.blocker_count}</span>
      </div>
      ${(blockers.length || warnings.length)
        ? `<div class="mt-4 space-y-4">${renderFindings(blockers, 'blocker')}${renderFindings(warnings, 'warning')}</div>`
        : '<p class="mt-4 text-sm text-gray-500">No QA findings for this assignment.</p>'}
    </section>
  `;
}

function renderReviewActionsPanel(detail: TranslationAssignmentEditorDetail, submitting: boolean): string {
  const approveState = detail.review_action_states.approve;
  const rejectState = detail.review_action_states.reject;
  if (!shouldShowReviewActions(detail)) {
    return '';
  }
  const actions = [
    {
      key: 'approve',
      label: 'Approve',
      state: approveState,
      tone: 'btn btn-success-outline',
    },
    {
      key: 'reject',
      label: 'Request changes',
      state: rejectState,
      tone: 'btn btn-danger-outline',
    },
  ];
  return `
    <section
      class="rounded-xl border border-gray-200 bg-white p-5"
      data-editor-panel="review-actions"
      aria-label="Review actions"
    >
      <h2 class="text-lg font-semibold text-gray-900">Review actions</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        ${actions.map((action) => {
          const disabled = !action.state?.enabled || submitting;
          return `
            <button
              type="button"
              class="${action.tone} ${disabled ? 'cursor-not-allowed opacity-60' : ''}"
              data-action="${escapeAttribute(action.key)}"
              title="${escapeAttribute(action.state?.reason || '')}"
              ${disabled ? 'disabled aria-disabled="true"' : ''}
            >
              ${escapeHTML(action.label)}
            </button>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderResumeWorkPanel(
  detail: TranslationAssignmentEditorDetail,
  submitting: boolean,
  saving: boolean,
  hasConflict: boolean
): string {
  if (!shouldShowResumeWorkAction(detail)) {
    return '';
  }
  const resumeState = detail.assignment_action_states.claim;
  const disabled = !resumeState?.enabled || saving || submitting || hasConflict;
  const disabledReason = hasConflict
    ? 'Reload the latest server draft before resuming work.'
    : saving
      ? 'Wait for the current save to finish before resuming work.'
      : submitting
        ? 'Resume is already in progress.'
        : resumeState?.reason || '';
  return `
    <section
      class="${CARD} p-5"
      data-editor-panel="resume-actions"
      aria-label="Resume work"
    >
      <h2 class="text-lg font-semibold text-gray-900">Resume work</h2>
      <p class="mt-2 text-sm text-gray-600">This assignment has requested changes. Resume it before submitting the updated draft for review.</p>
      <div class="mt-4 flex max-w-xs flex-col items-start gap-2">
        <button
          type="button"
          class="${BTN_PRIMARY}"
          data-action="resume-work"
          title="${escapeAttribute(disabledReason || 'Resume work on this assignment.')}"
          ${disabled ? 'disabled aria-disabled="true"' : ''}
        >
          ${submitting && resumeState?.enabled ? 'Resuming...' : 'Resume work'}
        </button>
        ${disabled && disabledReason ? `<p class="text-xs text-gray-500" data-resume-unavailable-reason="true">${escapeHTML(disabledReason)}</p>` : ''}
      </div>
    </section>
  `;
}

function renderRejectModal(rejectDraft: TranslationEditorRejectDraft | null, submitting: boolean): string {
  if (!rejectDraft) {
    return '';
  }
  return `
    <div class="${MODAL_OVERLAY}" data-reject-modal="true">
      <section class="${MODAL_CONTENT}" role="dialog" aria-modal="true" aria-labelledby="translation-reject-title">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Review action</p>
            <h2 id="translation-reject-title" class="mt-2 text-2xl font-semibold text-gray-900">Request changes</h2>
            <p class="mt-2 text-sm text-gray-600">Capture the rejection reason so translators can see it directly in the editor timeline.</p>
          </div>
          <button type="button" class="${BTN_GHOST}" data-action="cancel-reject">Close</button>
        </div>
        <label class="mt-5 block text-sm font-medium text-gray-700">
          Reject reason
          <textarea class="mt-2 min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100" data-reject-reason="true">${escapeHTML(rejectDraft.reason)}</textarea>
        </label>
        <label class="mt-4 block text-sm font-medium text-gray-700">
          Reviewer note
          <textarea class="mt-2 min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" data-reject-comment="true">${escapeHTML(rejectDraft.comment)}</textarea>
        </label>
        ${rejectDraft.error ? `<p class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-800">${escapeHTML(rejectDraft.error)}</p>` : ''}
        <div class="mt-5 flex items-center justify-end gap-3">
          <button type="button" class="${BTN_SECONDARY}" data-action="cancel-reject">Cancel</button>
          <button type="button" class="${BTN_DANGER}" data-action="confirm-reject" ${submitting ? 'disabled aria-disabled="true"' : ''}>${submitting ? 'Submitting…' : 'Request changes'}</button>
        </div>
      </section>
    </div>
  `;
}

function renderManagementActionsPanel(detail: TranslationAssignmentEditorDetail, submitting: boolean): string {
  if (!shouldShowManagementActions(detail)) {
    return '';
  }
  const archiveState = detail.assignment_action_states.archive;
  const disabled = !archiveState?.enabled || submitting;
  return `
    <section
      class="${CARD} p-5"
      data-editor-panel="management-actions"
      aria-label="Management actions"
    >
      <h2 class="text-lg font-semibold text-gray-900">Management actions</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="${BTN_SECONDARY}"
          data-action="archive"
          title="${escapeAttribute(archiveState?.reason || '')}"
          ${disabled ? 'disabled aria-disabled="true"' : ''}
        >
          Archive
        </button>
      </div>
    </section>
  `;
}

function renderAttachmentPanel(detail: TranslationAssignmentEditorDetail): string {
  return `
    <section class="${CARD} p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Attachments</h2>
        <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">${detail.attachment_summary.total}</span>
      </div>
      ${detail.attachments.length
        ? `<ul class="mt-4 space-y-3">${detail.attachments.map((attachment) => `
            <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-gray-900">${escapeHTML(attachment.filename)}</p>
                  <p class="mt-1 text-xs uppercase tracking-wider text-gray-500">${escapeHTML(attachment.kind)}</p>
                </div>
                <span class="text-xs text-gray-500">${escapeHTML(byteSizeLabel(attachment.byte_size))}</span>
              </div>
              ${attachment.description ? `<p class="mt-2 text-xs text-gray-500">${escapeHTML(attachment.description)}</p>` : ''}
              ${attachment.uploaded_at ? `<p class="mt-2 text-xs text-gray-500">Uploaded ${escapeHTML(formatTranslationTimestampUTC(attachment.uploaded_at))}</p>` : ''}
            </li>
          `).join('')}</ul>`
        : '<p class="mt-4 text-sm text-gray-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}

function renderTimelinePanel(detail: TranslationAssignmentEditorDetail): string {
  const history = detail.history;
  const items = buildTimelineItems(detail);
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Workflow timeline</h2>
        <span class="text-xs text-gray-500">Page ${history.page} of ${Math.max(1, Math.ceil(history.total / Math.max(1, history.per_page)))}</span>
      </div>
      ${items.length
        ? `<ol class="mt-4 space-y-3">${items.map((entry) => {
            const classes = getTimelineEntryClasses(entry.tone);
            return `
            <li class="${classes.container}" data-history-entry="${escapeAttribute(entry.id)}">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-2">
                  <p class="${classes.title}">${escapeHTML(entry.title)}</p>
                  <span class="${classes.badge}">${escapeHTML(entry.badge)}</span>
                </div>
                <span class="${classes.time}">${escapeHTML(formatTranslationTimestampUTC(entry.created_at) || 'Current')}</span>
              </div>
              ${entry.body ? `<p class="mt-2 text-sm">${escapeHTML(entry.body)}</p>` : ''}
            </li>
          `;
          }).join('')}</ol>`
        : '<p class="mt-4 text-sm text-gray-500">No workflow entries available.</p>'}
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="${BTN_SECONDARY_SM}" data-history-prev="true" ${history.page <= 1 ? 'disabled aria-disabled="true"' : ''}>Previous</button>
        <button type="button" class="${BTN_SECONDARY_SM}" data-history-next="true" ${!history.has_more ? 'disabled aria-disabled="true"' : ''}>Next</button>
      </div>
    </section>
  `;
}

// T13: Sidebar tab type
type SidebarTab = 'actions' | 'qa' | 'assist' | 'files' | 'history';

const SIDEBAR_TAB_ICONS: Record<SidebarTab, string> = {
  actions: 'iconoir:flash',
  qa: 'iconoir:shield',
  assist: 'iconoir:chat-bubble',
  files: ICON_DOCUMENT,
  history: ICON_CLOCK,
};

function renderSidebarTabIcon(tab: SidebarTab): string {
  return renderEditorIcon(SIDEBAR_TAB_ICONS[tab], '16px');
}

// T13: Compute sidebar tab badges
function computeSidebarTabBadges(detail: TranslationAssignmentEditorDetail): Record<SidebarTab, string | null> {
  const hasResumeAction = shouldShowResumeWorkAction(detail);
  const hasReviewActions = shouldShowReviewActions(detail);
  const hasManagementActions = shouldShowManagementActions(detail);
  const qaCount = detail.qa_results.enabled ? detail.qa_results.summary.finding_count : 0;
  const tmCount = normalizeTranslationMemorySuggestions(detail.assist.translation_memory_suggestions).length;
  const glossaryCount = detail.assist.glossary_matches.length;
  const fileCount = detail.attachment_summary.total;
  const historyCount = detail.history.total;

  return {
    actions: (hasResumeAction || hasReviewActions || hasManagementActions) ? null : null,
    qa: qaCount > 0 ? String(qaCount) : null,
    assist: (tmCount + glossaryCount) > 0 ? String(tmCount + glossaryCount) : null,
    files: fileCount > 0 ? String(fileCount) : null,
    history: historyCount > 0 ? String(historyCount) : null,
  };
}

// T13: Render tabbed sidebar
function renderTabbedSidebar(
  detail: TranslationAssignmentEditorDetail,
  submitting: boolean,
  activeTab: SidebarTab = 'actions',
  loadState?: TranslationEditorLoadState,
  saving = false,
  hasConflict = false
): string {
  const badges = computeSidebarTabBadges(detail);
  const hasResumeAction = shouldShowResumeWorkAction(detail);
  const hasReviewActions = shouldShowReviewActions(detail);
  const hasManagementActions = shouldShowManagementActions(detail);
  const hasActions = hasResumeAction || hasReviewActions || hasManagementActions;

  // Tab definitions
  const tabs: Array<{ id: SidebarTab; label: string; badge: string | null }> = [
    {
      id: 'actions',
      label: 'Actions',
      badge: badges.actions,
    },
    {
      id: 'qa',
      label: 'QA',
      badge: badges.qa,
    },
    {
      id: 'assist',
      label: 'Assist',
      badge: badges.assist,
    },
    {
      id: 'files',
      label: 'Files',
      badge: badges.files,
    },
    {
      id: 'history',
      label: 'History',
      badge: badges.history,
    },
  ];

  // Tab navigation
  const tabNav = `
    <nav class="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1" role="tablist" aria-label="Editor sidebar sections">
      ${tabs.map((tab) => `
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}"
          data-sidebar-tab="${escapeAttribute(tab.id)}"
          role="tab"
          aria-selected="${activeTab === tab.id}"
          aria-controls="sidebar-panel-${escapeAttribute(tab.id)}"
        >
          ${renderSidebarTabIcon(tab.id)}
          <span class="hidden sm:inline">${escapeHTML(tab.label)}</span>
          ${tab.badge ? `<span class="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">${escapeHTML(tab.badge)}</span>` : ''}
        </button>
      `).join('')}
    </nav>
  `;

  // Tab panels
  const panels: Record<SidebarTab, string> = {
    actions: `
      <div id="sidebar-panel-actions" class="space-y-4" role="tabpanel" data-sidebar-panel="actions" ${activeTab !== 'actions' ? 'hidden' : ''}>
        ${hasResumeAction ? renderResumeWorkPanel(detail, submitting, saving, hasConflict) : ''}
        ${hasReviewActions ? renderReviewActionsPanel(detail, submitting) : ''}
        ${hasManagementActions ? renderManagementActionsPanel(detail, submitting) : ''}
        ${!hasActions ? `
          <div class="rounded-xl border border-gray-200 bg-white p-5">
            <h2 class="text-lg font-semibold text-gray-900">Actions</h2>
            <p class="mt-3 text-sm text-gray-500">No actions available for this assignment in its current state.</p>
          </div>
        ` : ''}
      </div>
    `,
    qa: `
      <div id="sidebar-panel-qa" class="space-y-4" role="tabpanel" data-sidebar-panel="qa" ${activeTab !== 'qa' ? 'hidden' : ''}>
        ${renderQAPanel(detail)}
      </div>
    `,
    assist: `
      <div id="sidebar-panel-assist" class="space-y-4" role="tabpanel" data-sidebar-panel="assist" ${activeTab !== 'assist' ? 'hidden' : ''}>
        ${renderAssistPanel(detail)}
      </div>
    `,
    files: `
      <div id="sidebar-panel-files" class="space-y-4" role="tabpanel" data-sidebar-panel="files" ${activeTab !== 'files' ? 'hidden' : ''}>
        ${renderAttachmentPanel(detail)}
      </div>
    `,
    history: `
      <div id="sidebar-panel-history" class="space-y-4" role="tabpanel" data-sidebar-panel="history" ${activeTab !== 'history' ? 'hidden' : ''}>
        ${renderTimelinePanel(detail)}
        ${renderDiagnostics(loadState || { status: 'ready', detail })}
      </div>
    `,
  };

  return `
    <aside class="space-y-4 sm:space-y-6" data-editor-sidebar="true">
      ${tabNav}
      ${Object.values(panels).join('')}
    </aside>
  `;
}

export function renderTranslationEditorState(
  loadState: TranslationEditorLoadState,
  editorState?: TranslationEditorState | null,
  options: TranslationEditorRenderOptions = {},
  runtime: TranslationEditorRuntimeState = {}
): string {
  if (loadState.status === 'loading') return renderLoadingState();
  if (loadState.status === 'empty') return renderEmptyState('Assignment unavailable', loadState.message || 'No assignment detail payload was returned.');
  if (loadState.status === 'error') return renderErrorState('Editor unavailable', loadState.message || 'Unable to load the assignment editor.', loadState);
  if (loadState.status === 'conflict') return renderErrorState('Editor conflict', loadState.message || 'A newer version of this assignment is available.', loadState);
  const detail = (editorState?.detail || loadState.detail);
  if (!detail) return renderEmptyState('Assignment unavailable', 'No assignment detail payload was returned.');
  const hasDirtyFields = Boolean(editorState && Object.keys(editorState.dirty_fields).length);
  const autosaveLabel = autosaveStateLabel(editorState || null, hasDirtyFields, runtime.lastSavedMessage || '');
  const conflictState = editorState?.autosave.conflict;
  const readOnly = isTranslationEditorReadOnly(detail);
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true" data-editor-read-only="${readOnly ? 'true' : 'false'}">
      ${renderFeedback(runtime.feedback || null)}
      ${renderHeader(detail, autosaveLabel, hasDirtyFields, runtime.submitting === true, runtime.saving === true, runtime.previewing === true, Boolean(conflictState), readOnly, options.basePath || '')}
      ${renderEditorLocaleSummary(detail)}
      ${readOnly ? `
        <section class="rounded-xl border border-gray-200 bg-gray-50 p-4" data-editor-read-only-notice="true">
          <p class="text-sm font-medium text-gray-700">${escapeHTML(readOnlyEditorMessage(detail))}</p>
        </section>
      ` : ''}
      ${conflictState ? `
        <section class="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-amber-900">Autosave conflict</h2>
              <p class="mt-1 text-sm text-amber-800">A newer server draft exists. Reload it before continuing.</p>
            </div>
            <button type="button" class="${BTN_PRIMARY}" data-action="reload-server-state">Reload server draft</button>
          </div>
        </section>
      ` : ''}
      <div class="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div class="order-1 space-y-4 sm:space-y-6">
          ${renderFieldList(detail, readOnly, new Set(runtime.suggestingFields || []))}
        </div>
        <div class="order-2">
          ${renderTabbedSidebar(detail, runtime.submitting === true, runtime.activeSidebarTab || 'actions', loadState, runtime.saving === true, Boolean(conflictState))}
        </div>
      </div>
      ${renderRejectModal(runtime.rejectDraft || null, runtime.submitting === true)}
    </div>
  `;
}

export function renderTranslationEditorPage(
  root: HTMLElement,
  loadState: TranslationEditorLoadState,
  editorState?: TranslationEditorState | null,
  options: TranslationEditorRenderOptions = {},
  runtime: TranslationEditorRuntimeState = {}
): void {
  root.innerHTML = renderTranslationEditorState(loadState, editorState, options, runtime);
}

export class TranslationEditorScreen {
  private config: Required<TranslationEditorScreenConfig>;
  private container: HTMLElement | null = null;
  private loadState: TranslationEditorLoadState = { status: 'loading' };
  private editorState: TranslationEditorState | null = null;
  private feedback: { kind: 'success' | 'error' | 'conflict'; message: string } | null = null;
  private lastSavedMessage = '';
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private keyboardHandler: ((event: KeyboardEvent) => void) | null = null;
  private focusTrapCleanup: (() => void) | null = null;
  private saving = false;
  private submitting = false;
  private previewing = false;
  private rejectDraft: TranslationEditorRejectDraft | null = null;
  private syncCoreModulePromise: Promise<TranslationSyncCoreModule> | null = null;
  private syncCoreModule: TranslationSyncCoreModule | null = null;
  private syncCache: ReturnType<TranslationSyncCoreModule['createInMemoryCache']> | null = null;
  private syncEngine: ReturnType<TranslationSyncCoreModule['createSyncEngine']> | null = null;
  private syncResource: TranslationSyncResource<unknown, unknown> | null = null;
  private syncResourceKey = '';
  private syncLoadedResourceKey = '';
  private syncLoadedRevision: number | null = null;
  private syncConflictSnapshot: TranslationSyncResourceSnapshot<unknown> | null = null;
  private suggestingFields = new Set<string>();
  // T13: Active sidebar tab
  private activeSidebarTab: SidebarTab = 'actions';

  constructor(config: TranslationEditorScreenConfig) {
    const basePath = config.basePath || '/admin';
    this.config = {
      endpoint: config.endpoint,
      variantEndpointBase: config.variantEndpointBase || '',
      actionEndpointBase: config.actionEndpointBase,
      syncBaseURL: config.syncBaseURL || deriveTranslationSyncBaseURL(
        config.variantEndpointBase || '',
        config.actionEndpointBase,
        config.endpoint
      ),
      syncClientBasePath: config.syncClientBasePath || deriveTranslationSyncClientBasePath(basePath),
      syncResourceKind: config.syncResourceKind || TRANSLATION_DRAFT_SYNC_RESOURCE_KIND,
      syncScope: deriveTranslationSyncScope(config),
      basePath,
      initialDetail: config.initialDetail,
    };
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.keyboardHandler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        void this.saveDirtyFields(false);
      }
      if (event.key === 'Escape' && this.rejectDraft) {
        this.closeRejectDialog();
      }
    };
    document.addEventListener('keydown', this.keyboardHandler);
    this.render();
    void this.load();
  }

  mountWithInitialDetail(container: HTMLElement, rawDetail: unknown): void {
    this.container = container;
    this.keyboardHandler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        void this.saveDirtyFields(false);
      }
      if (event.key === 'Escape' && this.rejectDraft) {
        this.closeRejectDialog();
      }
    };
    document.addEventListener('keydown', this.keyboardHandler);
    const detail = normalizeAssignmentEditorDetail(rawDetail);
    this.loadState = { status: 'ready', detail };
    this.editorState = createTranslationEditorState(detail);
    this.render();
  }

  unmount(): void {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
    if (this.focusTrapCleanup) {
      this.focusTrapCleanup();
      this.focusTrapCleanup = null;
    }
    if (this.container) this.container.innerHTML = '';
    this.container = null;
    this.syncResource = null;
    this.syncResourceKey = '';
    this.syncLoadedResourceKey = '';
    this.syncLoadedRevision = null;
    this.syncConflictSnapshot = null;
    this.suggestingFields.clear();
  }

  async load(historyPage?: number): Promise<void> {
    this.loadState = { status: 'loading' };
    this.render();
    const endpoint = historyPage
      ? buildURLWithParams(this.config.endpoint, {
          history_page: historyPage,
          history_per_page: this.editorState?.detail.history.per_page || this.loadState.detail?.history.per_page || 10,
        })
      : this.config.endpoint;
    this.loadState = await fetchTranslationEditorDetailState(endpoint);
    if (this.loadState.status === 'ready' && this.loadState.detail) {
      this.editorState = createTranslationEditorState(this.loadState.detail);
      if (!isTranslationEditorReadOnly(this.loadState.detail)) {
        await this.hydrateDraftSyncFromRead(this.loadState.detail);
      }
    } else {
      this.editorState = null;
    }
    this.render();
  }

  private render(): void {
    if (!this.container) return;
    const viewportState = this.captureRenderViewportState();
    renderTranslationEditorPage(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
      feedback: this.feedback,
      lastSavedMessage: this.lastSavedMessage,
      saving: this.saving,
      submitting: this.submitting,
      previewing: this.previewing,
      suggestingFields: Array.from(this.suggestingFields),
      rejectDraft: this.rejectDraft,
      activeSidebarTab: this.activeSidebarTab,
    });
    this.attachEventListeners();
    // Set up logical tab order for translation fields
    setupFieldTabOrder(this.container);
    this.restoreRenderViewportState(viewportState);
  }

  private captureRenderViewportState(): TranslationEditorRenderViewportState | null {
    if (!this.container || typeof document === 'undefined') return null;
    const active = document.activeElement;
    const activeInput = typeof HTMLInputElement !== 'undefined' && active instanceof HTMLInputElement;
    const activeTextarea = typeof HTMLTextAreaElement !== 'undefined' && active instanceof HTMLTextAreaElement;
    if (
      !(activeInput || activeTextarea)
      || !this.container.contains(active)
      || !active.dataset.fieldInput
    ) {
      return null;
    }
    return {
      fieldPath: active.dataset.fieldInput,
      selectionStart: active.selectionStart,
      selectionEnd: active.selectionEnd,
      selectionDirection: active.selectionDirection as 'forward' | 'backward' | 'none' | null,
      scrollX: typeof window !== 'undefined' ? window.scrollX || window.pageXOffset || 0 : 0,
      scrollY: typeof window !== 'undefined' ? window.scrollY || window.pageYOffset || 0 : 0,
    };
  }

  private restoreRenderViewportState(state: TranslationEditorRenderViewportState | null): void {
    if (!state || !this.container) return;
    const input = Array.from(this.container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-field-input]'))
      .find((candidate) => candidate.dataset.fieldInput === state.fieldPath);
    if (!input) return;
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
    if (state.selectionStart !== null && state.selectionEnd !== null && typeof input.setSelectionRange === 'function') {
      const valueLength = input.value.length;
      const start = Math.min(state.selectionStart, valueLength);
      const end = Math.min(state.selectionEnd, valueLength);
      input.setSelectionRange(start, end, state.selectionDirection || 'none');
    }
    this.restoreWindowScroll(state);
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => this.restoreWindowScroll(state));
    }
  }

  private restoreWindowScroll(state: TranslationEditorRenderViewportState): void {
    if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') return;
    try {
      window.scrollTo(state.scrollX, state.scrollY);
    } catch {
      return;
    }
  }

  private isEditorReadOnly(): boolean {
    return this.editorState ? isTranslationEditorReadOnly(this.editorState.detail) : true;
  }

  private attachEventListeners(): void {
    if (!this.container || !this.editorState) return;
    this.container.querySelectorAll<HTMLElement>('[data-field-input]').forEach((element) => {
      element.addEventListener('input', (event) => {
        if (this.isEditorReadOnly()) return;
        const target = event.currentTarget as HTMLInputElement | HTMLTextAreaElement;
        const path = target.dataset.fieldInput || '';
        this.editorState = applyEditorFieldChange(this.editorState as TranslationEditorState, path, target.value);
        this.feedback = null;
        this.lastSavedMessage = '';
        this.scheduleAutosave();
        this.render();
      });
    });
    this.container.querySelectorAll<HTMLElement>('[data-copy-source]').forEach((element) => {
      element.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (this.isEditorReadOnly()) return;
        const path = element.dataset.copySource || '';
        const entry = this.editorState?.detail.fields.find((item) => item.path === path);
        if (!entry || !this.editorState) return;
        const sourceValue = (entry.source_value || element.dataset.sourceValue || '').trim();
        void writeTextToClipboard(sourceValue);
        this.editorState = applyEditorFieldChange(this.editorState, path, sourceValue);
        const input = this.container?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-field-input="${cssEscape(path)}"]`);
        if (input) {
          input.value = sourceValue;
          try {
            input.focus({ preventScroll: true });
          } catch {
            input.focus();
          }
          const selectionEnd = input.value.length;
          try {
            input.setSelectionRange(selectionEnd, selectionEnd);
          } catch {
            // Non-text inputs do not support selection ranges.
          }
        }
        this.feedback = null;
        this.lastSavedMessage = '';
        this.scheduleAutosave();
        this.render();
      });
    });
    this.container.querySelectorAll<HTMLElement>('[data-suggest-translation]').forEach((element) => {
      element.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const path = element.dataset.suggestTranslation || '';
        void this.generateSuggestion(path);
      });
    });
    this.container.querySelector<HTMLElement>('[data-action="save-draft"]')?.addEventListener('click', () => {
      if (this.isEditorReadOnly()) return;
      void this.saveDirtyFields(false);
    });
    this.container.querySelector<HTMLElement>('[data-action="submit-review"]')?.addEventListener('click', () => {
      void this.submitForReview();
    });
    this.container.querySelectorAll<HTMLElement>('[data-action="resume-work"]').forEach((element) => {
      element.addEventListener('click', () => {
        void this.resumeWork();
      });
    });
    this.container.querySelector<HTMLElement>('[data-action="preview-assignment"]')?.addEventListener('click', () => {
      const blockedMessage = this.previewBlockedBeforeOpenMessage();
      if (blockedMessage) {
        this.feedback = blockedMessage;
        this.render();
        return;
      }
      const previewWindow = this.openPreviewWindow();
      void this.previewAssignment(previewWindow);
    });
    this.container.querySelector<HTMLElement>('[data-action="approve"]')?.addEventListener('click', () => {
      void this.runReviewAction('approve');
    });
    this.container.querySelector<HTMLElement>('[data-action="reject"]')?.addEventListener('click', () => {
      this.openRejectDialog();
    });
    this.container.querySelector<HTMLElement>('[data-action="archive"]')?.addEventListener('click', () => {
      void this.runReviewAction('archive');
    });
    this.container.querySelectorAll<HTMLElement>('[data-action="cancel-reject"]').forEach((element) => {
      element.addEventListener('click', () => {
        this.closeRejectDialog();
      });
    });
    this.container.querySelector<HTMLElement>('[data-action="confirm-reject"]')?.addEventListener('click', () => {
      void this.confirmReject();
    });
    this.container.querySelector<HTMLTextAreaElement>('[data-reject-reason="true"]')?.addEventListener('input', (event) => {
      const target = event.currentTarget as HTMLTextAreaElement;
      if (!this.rejectDraft) return;
      this.rejectDraft = { ...this.rejectDraft, reason: target.value, error: '' };
    });
    this.container.querySelector<HTMLTextAreaElement>('[data-reject-comment="true"]')?.addEventListener('input', (event) => {
      const target = event.currentTarget as HTMLTextAreaElement;
      if (!this.rejectDraft) return;
      this.rejectDraft = { ...this.rejectDraft, comment: target.value };
    });
    this.container.querySelector<HTMLElement>('[data-action="reload-server-state"]')?.addEventListener('click', () => {
      void this.reloadServerDraft();
    });
    this.container.querySelector<HTMLElement>('[data-history-prev="true"]')?.addEventListener('click', () => {
      const page = (this.editorState?.detail.history.page || 1) - 1;
      if (page >= 1) void this.load(page);
    });
    this.container.querySelector<HTMLElement>('[data-history-next="true"]')?.addEventListener('click', () => {
      const history = this.editorState?.detail.history;
      if (history?.has_more) void this.load(history.next_page || history.page + 1);
    });

    // T12: Jump to first issue handler
    this.container.querySelectorAll<HTMLElement>('[data-jump-to-field]').forEach((element) => {
      element.addEventListener('click', (event) => {
        const button = event.currentTarget as HTMLElement;
        const fieldPath = button.dataset.jumpToField;
        if (!fieldPath || !this.container) return;
        const fieldElement = this.container.querySelector<HTMLElement>(`[data-editor-field="${cssEscape(fieldPath)}"]`);
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Focus the input field within
          const input = fieldElement.querySelector<HTMLInputElement | HTMLTextAreaElement>('[data-field-input]');
          if (input) {
            setTimeout(() => input.focus(), 300);
          }
        }
      });
    });

    // T13: Sidebar tab switching
    this.container.querySelectorAll<HTMLElement>('[data-sidebar-tab]').forEach((element) => {
      element.addEventListener('click', () => {
        const tab = element.dataset.sidebarTab as SidebarTab;
        if (tab && tab !== this.activeSidebarTab) {
          this.activeSidebarTab = tab;
          this.render();
        }
      });
    });

    // T13: TM suggestion insert handler
    this.container.querySelectorAll<HTMLElement>('[data-insert-tm]').forEach((element) => {
      element.addEventListener('click', () => {
        const fieldPath = element.dataset.insertField || '';
        const suggestedText = element.dataset.insertText || '';
        if (!fieldPath || !suggestedText || !this.editorState) return;
        this.editorState = applyEditorFieldChange(this.editorState, fieldPath, suggestedText);
        this.feedback = { kind: 'success', message: 'Translation memory suggestion inserted.' };
        this.scheduleAutosave();
        this.render();
      });
    });
  }

  private focusField(path: string): void {
    const input = this.container?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-field-input="${cssEscape(path)}"]`);
    if (!input) return;
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
    const selectionEnd = input.value.length;
    try {
      input.setSelectionRange(selectionEnd, selectionEnd);
    } catch {
      // Non-text inputs do not support selection ranges.
    }
  }

  private showSuggestionTransportError(message: string): void {
    const text = message.trim() || 'Failed to generate translation suggestion.';
    const host = typeof window !== 'undefined' ? window as unknown as TranslationEditorToastHost : null;
    if (typeof host?.toastManager?.error === 'function') {
      host.toastManager.error(text);
      return;
    }
    if (typeof host?.notify?.error === 'function') {
      host.notify.error(text);
      return;
    }
    this.feedback = { kind: 'error', message: text };
  }

  private showSuggestionInlineError(message: string): void {
    this.feedback = {
      kind: 'error',
      message: message.trim() || 'Failed to generate translation suggestion.',
    };
  }

  private async generateSuggestion(path: string): Promise<void> {
    const fieldPath = path.trim();
    if (!fieldPath || !this.editorState || this.suggestingFields.has(fieldPath)) return;
    if (this.isEditorReadOnly()) return;
    if (this.editorState.autosave.conflict) {
      this.feedback = { kind: 'conflict', message: 'Reload the latest server draft before generating a suggestion.' };
      this.render();
      return;
    }
    const entry = this.editorState.detail.fields.find((item) => item.path === fieldPath);
    const action = entry?.suggest_translation_action;
    if (!entry || !action?.enabled) {
      this.feedback = { kind: 'error', message: action?.reason || 'Translation suggestion is unavailable for this field.' };
      this.render();
      return;
    }
    const requestTargetValue = asString(this.editorState.detail.target_fields[fieldPath]);
    const requestRowVersion = this.editorState.detail.row_version;
    this.suggestingFields.add(fieldPath);
    this.feedback = null;
    this.render();
    let result: TranslationSuggestionCommandResult;
    try {
      result = await dispatchTranslationSuggestion(action, this.loadState.requestId || '');
    } catch (error) {
      this.showSuggestionTransportError(error instanceof Error ? error.message : 'Failed to generate translation suggestion.');
      this.render();
      this.suggestingFields.delete(fieldPath);
      this.render();
      return;
    }
    try {
      if (!this.editorState || result.assignment_id !== this.editorState.detail.assignment_id || result.field_path !== fieldPath) {
        throw new Error('Translation suggestion response did not match the requested field.');
      }
      if (this.editorState.autosave.conflict) {
        throw new Error('Reload the latest server draft before applying this suggestion.');
      }
      if (
        this.editorState.detail.row_version !== requestRowVersion ||
        asString(this.editorState.detail.target_fields[fieldPath]) !== requestTargetValue
      ) {
        throw new Error('The field changed while the suggestion was generating. Review the current draft and try again.');
      }
      this.editorState = applyEditorFieldChange(this.editorState, fieldPath, result.suggested_text);
      this.lastSavedMessage = '';
      this.feedback = { kind: 'success', message: 'Translation suggestion inserted.' };
      this.scheduleAutosave();
      this.render();
      this.focusField(fieldPath);
    } catch (error) {
      this.showSuggestionInlineError(error instanceof Error ? error.message : 'Failed to generate translation suggestion.');
      this.render();
    } finally {
      this.suggestingFields.delete(fieldPath);
      this.render();
    }
  }

  private scheduleAutosave(): void {
    if (this.isEditorReadOnly()) return;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      void this.saveDirtyFields(true);
    }, 600);
  }

  private async saveDirtyFields(isAutosave: boolean): Promise<boolean> {
    if (this.isEditorReadOnly()) return true;
    if (!this.editorState || !Object.keys(this.editorState.dirty_fields).length || this.saving) return true;
    this.saving = true;
    this.editorState = markEditorAutosavePending(this.editorState);
    this.render();
    const detail = this.editorState.detail;
    try {
      const response = await this.mutateDraftSync(detail, this.editorState.dirty_fields, isAutosave);
      this.syncLoadedRevision = response.snapshot.revision;
      this.syncConflictSnapshot = null;
      this.editorState = applyEditorUpdateResponse(this.editorState, editorUpdatePayloadFromSyncSnapshot(response.snapshot));
      const qaFeedback = buildSaveFeedbackMessage(this.editorState.detail.qa_results, isAutosave);
      this.lastSavedMessage = qaFeedback.lastSaved;
      if (!isAutosave || qaFeedback.kind === 'conflict') {
        this.feedback = { kind: qaFeedback.kind, message: qaFeedback.message };
      }
      this.saving = false;
      this.render();
      return true;
    } catch (error) {
      if (isStaleRevisionError(error)) {
        this.syncConflictSnapshot = syncConflictLatestSnapshotFromError(error);
        if (this.syncConflictSnapshot?.revision) {
          this.syncLoadedRevision = this.syncConflictSnapshot.revision;
        }
        this.editorState = applyEditorAutosaveConflict(this.editorState, syncConflictPayloadFromError(error));
        this.feedback = { kind: 'conflict', message: 'Autosave conflict detected. Reload the latest server draft.' };
        this.saving = false;
        this.render();
        return false;
      }
      this.feedback = {
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to save draft',
      };
      this.saving = false;
      this.render();
      return false;
    }
  }

  private async reloadServerDraft(): Promise<void> {
    if (!this.editorState) return;
    const latest = this.editorState.autosave.conflict;
    if (latest && Object.keys(latest).length > 0) {
      const snapshot = this.syncConflictSnapshot;
      this.editorState = snapshot
        ? applyEditorUpdateResponse(this.editorState, editorUpdatePayloadFromSyncSnapshot(snapshot))
        : applyEditorUpdateResponse(this.editorState, { data: latest });
      if (snapshot?.revision) {
        this.syncLoadedRevision = snapshot.revision;
      } else {
        const latestRevision = asNumber(asRecord(latest).row_version || asRecord(latest).version);
        if (latestRevision > 0) this.syncLoadedRevision = latestRevision;
      }
      this.syncConflictSnapshot = null;
      this.feedback = { kind: 'conflict', message: 'Reloaded the latest server draft.' };
      this.saving = false;
      this.render();
      return;
    }
    try {
      const resource = await this.ensureDraftSyncResource(this.editorState.detail);
      const snapshot = await resource.refresh({ force: true });
      if (!isUsableTranslationSyncSnapshot(snapshot)) {
        throw new Error('Sync refresh did not return a usable draft snapshot');
      }
      this.syncLoadedRevision = snapshot.revision;
      this.syncConflictSnapshot = null;
      this.editorState = applyEditorUpdateResponse(this.editorState, editorUpdatePayloadFromSyncSnapshot(snapshot));
      this.feedback = { kind: 'conflict', message: 'Reloaded the latest server draft.' };
      this.saving = false;
      this.render();
    } catch (error) {
      this.feedback = {
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to reload server draft',
      };
      this.saving = false;
      this.render();
    }
  }

  private async hydrateDraftSyncFromRead(detail: TranslationAssignmentEditorDetail): Promise<void> {
    if (!this.editorState) return;
    try {
      await this.ensureDraftSyncLoaded(detail);
    } catch (error) {
      this.feedback = {
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to load draft sync state',
      };
    }
  }

  private async mutateDraftSync(
    detail: TranslationAssignmentEditorDetail,
    fields: Record<string, string>,
    isAutosave: boolean
  ): Promise<TranslationSyncMutationResponse<unknown>> {
    await this.ensureDraftSyncLoaded(detail);
    const resource = await this.ensureDraftSyncResource(detail);
    const snapshotRevision = asNumber(resource.getSnapshot()?.revision);
    const expectedRevision = this.syncLoadedRevision || snapshotRevision || detail.row_version;
    const payload: Record<string, unknown> = {
      autosave: isAutosave,
      fields,
    };
    const currentSourceHash = currentSourceHashFromDetail(detail);
    if (currentSourceHash) {
      payload.acknowledged_source_hash = currentSourceHash;
    }
    return await resource.mutate({
      operation: TRANSLATION_DRAFT_SYNC_OPERATION,
      expectedRevision,
      payload,
      metadata: {
        autosave: isAutosave,
      },
    });
  }

  private async ensureDraftSyncResource(
    detail: TranslationAssignmentEditorDetail
  ): Promise<TranslationSyncResource<unknown, unknown>> {
    if (!this.syncCoreModule) {
      if (!this.syncCoreModulePromise) {
        this.syncCoreModulePromise = loadTranslationSyncCoreModule(this.config.syncClientBasePath);
      }
      this.syncCoreModule = await this.syncCoreModulePromise;
    }
    if (!this.syncCache) {
      this.syncCache = this.syncCoreModule.createInMemoryCache();
    }
    if (!this.syncEngine) {
      const transport = this.syncCoreModule.createFetchSyncTransport({
        baseURL: this.config.syncBaseURL,
        credentials: 'same-origin',
        fetch: typeof fetch === 'function' ? fetch.bind(globalThis) : undefined,
        headers: (context: { method?: string }) => {
          const headers: Record<string, string> = {};
          const method = String(context?.method || 'GET').toUpperCase();
          if (method !== 'GET') {
            const token = readCSRFToken();
            if (token) headers['X-CSRF-Token'] = token;
          }
          return headers;
        },
      });
      this.syncEngine = this.syncCoreModule.createSyncEngine({
        transport,
        cache: this.syncCache,
        retry: {
          maxAttempts: 1,
        },
      });
    }
    const resourceID = detail.variant_id;
    const ref: TranslationSyncResourceRef = {
      kind: this.config.syncResourceKind,
      id: resourceID,
      scope: Object.keys(this.config.syncScope).length > 0 ? this.config.syncScope : undefined,
    };
    const resourceKey = translationSyncResourceKey(ref);
    if (!this.syncResource || this.syncResourceKey !== resourceKey) {
      this.syncResourceKey = resourceKey;
      this.syncResource = this.syncEngine.resource(ref);
      this.syncLoadedRevision = null;
      this.syncConflictSnapshot = null;
    }
    return this.syncResource;
  }

  private async ensureDraftSyncLoaded(detail: TranslationAssignmentEditorDetail): Promise<void> {
    const resource = await this.ensureDraftSyncResource(detail);
    const resourceKey = this.syncResourceKey;
    if (this.syncLoadedResourceKey === resourceKey) return;

    const pendingDirtyFields = this.editorState ? { ...this.editorState.dirty_fields } : {};
    const snapshot = await resource.load();
    if (!isUsableTranslationSyncSnapshot(snapshot)) {
      throw new Error('Sync draft load did not return a usable draft snapshot');
    }
    if (!this.editorState || this.editorState.detail.variant_id !== detail.variant_id) return;

    let nextState = applyEditorUpdateResponse(this.editorState, editorUpdatePayloadFromSyncSnapshot(snapshot));
    for (const [fieldPath, fieldValue] of Object.entries(pendingDirtyFields)) {
      nextState = applyEditorFieldChange(nextState, fieldPath, fieldValue);
    }
    this.editorState = nextState;
    this.syncLoadedRevision = snapshot.revision;
    this.syncConflictSnapshot = null;
    this.loadState = {
      ...this.loadState,
      detail: this.editorState.detail,
    };
    this.syncLoadedResourceKey = resourceKey;
  }

  private async submitForReview(): Promise<void> {
    if (!this.editorState || this.submitting) return;
    if (this.isEditorReadOnly()) {
      this.feedback = { kind: 'error', message: readOnlyEditorMessage(this.editorState.detail) };
      this.render();
      return;
    }
    const submitState = this.editorState.detail.assignment_action_states.submit_review;
    if (!submitState?.enabled) {
      this.feedback = { kind: 'error', message: submitState?.reason || 'Submit for review is unavailable.' };
      this.render();
      return;
    }
    if (!this.editorState.can_submit_review) {
      const missingRequiredFields = Object.entries(this.editorState.detail.field_completeness)
        .filter(([, entry]) => entry.required && entry.missing)
        .map(([field]) => field);
      this.feedback = {
        kind: this.editorState.detail.qa_results.submit_blocked ? 'conflict' : 'error',
        message: this.editorState.detail.qa_results.submit_blocked
          ? buildSubmitBlockedMessage(this.editorState.detail)
          : missingRequiredFields.length
            ? `Complete required fields before submitting for review: ${missingRequiredFields.join(', ')}.`
            : 'Submit for review is unavailable.',
      };
      this.render();
      return;
    }
    if (Object.keys(this.editorState.dirty_fields).length) {
      const saved = await this.saveDirtyFields(false);
      if (!saved) return;
    }
    this.submitting = true;
    this.render();
    const historyPage = this.editorState.detail.history.page;
    const assignmentVersion = this.editorState.detail.translation_assignment.version;
    const response = await httpRequest(this.assignmentActionEndpoint(this.editorState.detail, 'submit_review'), {
      method: 'POST',
      json: { expected_version: assignmentVersion },
    });
    if (!response.ok) {
      const error = await buildEditorRequestError(response, 'Failed to submit assignment');
      this.feedback = {
        kind: error.status === 409 || error.code === 'VERSION_CONFLICT' || error.code === 'POLICY_BLOCKED' ? 'conflict' : 'error',
        message: error.message,
      };
      this.submitting = false;
      if (error.status === 409 || error.code === 'INVALID_STATUS_TRANSITION' || error.code === 'INVALID_STATUS') {
        await this.load(historyPage);
        return;
      }
      this.render();
      return;
    }
    const payload = await response.json();
    const status = asString(asRecord(payload).data && asRecord(asRecord(payload).data).status);
    this.feedback = {
      kind: 'success',
      message: buildSubmitSuccessMessage(this.editorState.detail, status),
    };
    this.submitting = false;
    await this.load(historyPage);
  }

  private assignmentActionEndpoint(detail: TranslationAssignmentEditorDetail, action: string): string {
    return buildURLWithParams(
      `${this.config.actionEndpointBase}/${encodeURIComponent(detail.assignment_id)}/actions/${action}`,
      this.config.syncScope
    );
  }

  private async resumeWork(): Promise<void> {
    if (!this.editorState || this.submitting) return;
    if (!shouldShowResumeWorkAction(this.editorState.detail)) {
      this.feedback = { kind: 'error', message: 'Resume work is unavailable for this assignment.' };
      this.render();
      return;
    }
    const resumeState = this.editorState.detail.assignment_action_states.claim;
    if (!resumeState?.enabled) {
      this.feedback = { kind: 'error', message: resumeState?.reason || 'Resume work is unavailable.' };
      this.render();
      return;
    }
    if (this.editorState.autosave.conflict) {
      this.feedback = { kind: 'conflict', message: 'Reload the latest server draft before resuming work.' };
      this.render();
      return;
    }
    if (Object.keys(this.editorState.dirty_fields).length) {
      const saved = await this.saveDirtyFields(false);
      if (!saved || !this.editorState) return;
    }
    this.submitting = true;
    this.render();
    const historyPage = this.editorState.detail.history.page;
    const assignmentVersion = this.editorState.detail.translation_assignment.version;
    const response = await httpRequest(this.assignmentActionEndpoint(this.editorState.detail, 'claim'), {
      method: 'POST',
      json: { expected_version: assignmentVersion },
    });
    if (!response.ok) {
      const error = await buildEditorRequestError(response, 'Failed to resume assignment');
      this.feedback = {
        kind: error.status === 409 || error.code === 'VERSION_CONFLICT' || error.code === 'POLICY_BLOCKED' ? 'conflict' : 'error',
        message: error.message,
      };
      this.submitting = false;
      if (error.status === 409 || error.code === 'INVALID_STATUS_TRANSITION' || error.code === 'INVALID_STATUS') {
        await this.load(historyPage);
        return;
      }
      this.render();
      return;
    }
    this.feedback = { kind: 'success', message: 'Assignment resumed.' };
    this.submitting = false;
    await this.load(historyPage);
  }

  private openPreviewWindow(): Window | null {
    if (typeof window === 'undefined' || typeof window.open !== 'function') {
      return null;
    }
    try {
      const previewWindow = window.open('about:blank', '_blank');
      if (previewWindow) {
        try {
          previewWindow.opener = null;
        } catch {
          // Some browser policies prevent assignment; preview can still proceed.
        }
      }
      return previewWindow;
    } catch {
      return null;
    }
  }

  private previewBlockedBeforeOpenMessage(): NonNullable<TranslationEditorRuntimeState['feedback']> | null {
    if (!this.editorState) {
      return { kind: 'error', message: 'Preview is unavailable for this assignment.' };
    }
    if (this.previewing) {
      return { kind: 'error', message: 'Preview is already opening.' };
    }
    if (this.saving) {
      return { kind: 'error', message: 'Wait for the current save to finish before opening preview.' };
    }
    if (this.submitting) {
      return { kind: 'error', message: 'Wait for the current action to finish before opening preview.' };
    }
    const previewAction = this.editorState.detail.preview_action;
    if (!previewAction.enabled) {
      return { kind: 'error', message: previewAction.reason || 'Preview is unavailable for this assignment.' };
    }
    if (this.editorState.autosave.conflict) {
      return { kind: 'conflict', message: 'Reload the latest server draft before opening preview.' };
    }
    return null;
  }

  private assignmentPreviewEndpoint(detail: TranslationAssignmentEditorDetail): string {
    return buildURLWithParams(
      `${this.config.actionEndpointBase}/${encodeURIComponent(detail.assignment_id)}/preview`,
      {
        ...this.config.syncScope,
        channel: detail.preview_action.channel || this.config.syncScope.channel,
      }
    );
  }

  private async previewAssignment(previewWindow: Window | null): Promise<void> {
    if (!this.editorState || this.previewing || this.saving || this.submitting) {
      closePreviewWindow(previewWindow);
      return;
    }
    const detail = this.editorState.detail;
    if (!detail.preview_action.enabled) {
      closePreviewWindow(previewWindow);
      this.feedback = { kind: 'error', message: detail.preview_action.reason || 'Preview is unavailable for this assignment.' };
      this.render();
      return;
    }
    if (!previewWindow) {
      this.feedback = { kind: 'error', message: 'Preview was blocked by the browser. Allow popups for this site and try again.' };
      this.render();
      return;
    }
    if (this.editorState.autosave.conflict) {
      closePreviewWindow(previewWindow);
      this.feedback = { kind: 'conflict', message: 'Reload the latest server draft before opening preview.' };
      this.render();
      return;
    }

    this.previewing = true;
    this.render();
    try {
      if (Object.keys(this.editorState.dirty_fields).length) {
        const saved = await this.saveDirtyFields(false);
        if (!saved || !this.editorState || this.editorState.autosave.conflict) {
          closePreviewWindow(previewWindow);
          this.previewing = false;
          this.render();
          return;
        }
      }

      const response = await httpRequest(this.assignmentPreviewEndpoint(this.editorState.detail), {
        method: 'GET',
      });
      if (!response.ok) {
        const error = await buildEditorRequestError(response, 'Failed to generate preview');
        closePreviewWindow(previewWindow);
        this.feedback = {
          kind: error.code === 'VERSION_CONFLICT' || error.code === 'POLICY_BLOCKED' ? 'conflict' : 'error',
          message: error.message,
        };
        this.previewing = false;
        this.render();
        return;
      }

      const payload = await response.json();
      const envelope = asRecord(payload);
      const previewAction = normalizePreviewAction(
        envelope.data && typeof envelope.data === 'object' ? envelope.data : payload,
        this.editorState.detail as unknown as Record<string, unknown>
      );
      if (!previewAction.enabled || !previewAction.url) {
        closePreviewWindow(previewWindow);
        this.feedback = { kind: 'error', message: previewAction.reason || 'Preview is unavailable for this assignment.' };
        this.previewing = false;
        this.render();
        return;
      }

      navigatePreviewWindow(previewWindow, previewAction.url);
      this.previewing = false;
      this.feedback = null;
      this.render();
    } catch (error) {
      closePreviewWindow(previewWindow);
      this.previewing = false;
      this.feedback = {
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to generate preview',
      };
      this.render();
    }
  }

  private async runReviewAction(action: 'approve' | 'reject' | 'archive', rejectInput?: { reason: string; comment?: string }): Promise<void> {
    if (!this.editorState || this.submitting) return;
    const detail = this.editorState.detail;
    const actionState = action === 'archive'
      ? detail.assignment_action_states.archive
      : detail.review_action_states[action];
    if (!actionState?.enabled) {
      this.feedback = { kind: 'error', message: actionState?.reason || `${sentenceCaseToken(action)} is unavailable.` };
      this.render();
      return;
    }
    const request: Record<string, unknown> = {
      expected_version: detail.translation_assignment.version,
    };
    if (action === 'reject') {
      const reason = rejectInput?.reason || '';
      if (!reason || !reason.trim()) {
        this.openRejectDialog('Reject reason is required.');
        this.render();
        return;
      }
      request.reason = reason.trim();
      if (rejectInput?.comment?.trim()) {
        request.comment = rejectInput.comment.trim();
      }
    }
    this.submitting = true;
    this.render();
    const response = await httpRequest(this.assignmentActionEndpoint(detail, action), {
      method: 'POST',
      json: request,
    });
    if (!response.ok) {
      const error = await buildEditorRequestError(response, `Failed to ${action} assignment`);
      this.feedback = {
        kind: error.code === 'VERSION_CONFLICT' || error.code === 'POLICY_BLOCKED' ? 'conflict' : 'error',
        message: error.message,
      };
      this.submitting = false;
      this.render();
      return;
    }
    this.feedback = {
      kind: 'success',
      message: action === 'approve'
        ? 'Assignment approved.'
        : action === 'reject'
          ? 'Changes requested.'
          : 'Assignment archived.',
    };
    this.rejectDraft = null;
    this.submitting = false;
    await this.load(this.editorState.detail.history.page);
  }

  private openRejectDialog(error = ''): void {
    this.rejectDraft = {
      reason: this.rejectDraft?.reason || '',
      comment: this.rejectDraft?.comment || '',
      error,
    };
    this.render();
    // Set up focus trapping for the reject modal
    const modal = this.container?.querySelector<HTMLElement>('[data-reject-modal] [role="dialog"]');
    if (modal) {
      this.focusTrapCleanup = trapFocus(modal, () => this.closeRejectDialog());
    }
  }

  private closeRejectDialog(): void {
    if (this.focusTrapCleanup) {
      this.focusTrapCleanup();
      this.focusTrapCleanup = null;
    }
    this.rejectDraft = null;
    this.render();
  }

  private async confirmReject(): Promise<void> {
    if (!this.rejectDraft) {
      return;
    }
    const reason = this.rejectDraft.reason.trim();
    const comment = this.rejectDraft.comment.trim();
    if (!reason) {
      this.rejectDraft = { ...this.rejectDraft, error: 'Reject reason is required.' };
      this.render();
      return;
    }
    await this.runReviewAction('reject', { reason, comment });
  }
}

export async function initTranslationEditorPage(
  root: HTMLElement,
  config: TranslationEditorScreenConfig
): Promise<TranslationEditorScreen> {
  const screen = new TranslationEditorScreen(config);
  const initialDetail = config.initialDetail || readTranslationEditorSSRDetail(root);
  if ((root.dataset.ssrEnhanced || '').trim() === 'true' && initialDetail && !shouldUseTranslationClientRender()) {
    root.dataset.translationEditorEnhanced = 'true';
    screen.mountWithInitialDetail(root, initialDetail);
  } else {
    screen.mount(root);
  }
  return screen;
}

function shouldUseTranslationClientRender(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const params = readLocationSearchParams(window.location) ?? new URLSearchParams();
  const value = params.get('translation_client_render');
  return value === '1' || value === 'true';
}

function readTranslationEditorSSRDetail(root: HTMLElement): unknown {
  const script = root.querySelector<HTMLScriptElement>('script[type="application/json"][data-translation-editor-initial-state]');
  const raw = script?.textContent?.trim() || '';
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
