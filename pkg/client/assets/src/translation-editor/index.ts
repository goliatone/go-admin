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
import { normalizeStringRecord } from '../shared/record-normalization.js';
import { httpRequest, readHTTPError, readHTTPErrorResult } from '../shared/transport/http-client.js';
import { renderPanelLoadingState, renderPanelState } from '../services/ui-states.js';
import { extractStructuredError } from '../toast/error-helpers.js';
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
  reviewer_id: string;
  due_state: string;
  due_date: string;
  version: number;
  row_version: number;
  updated_at: string;
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
}

export interface TranslationEditorUpdateResponse {
  variant_id: string;
  row_version: number;
  fields: Record<string, string>;
  field_completeness: Record<string, TranslationEditorFieldCompleteness>;
  field_drift: Record<string, TranslationEditorFieldDrift>;
  field_validations: Record<string, TranslationEditorFieldValidation>;
  assist: TranslationEditorAssistPayload;
  qa_results: TranslationEditorQAResults;
  assignment_action_states: Record<string, TranslationActionState>;
  review_action_states: Record<string, TranslationActionState>;
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
  rejectDraft?: TranslationEditorRejectDraft | null;
  // T13: Active sidebar tab
  activeSidebarTab?: 'actions' | 'qa' | 'assist' | 'files' | 'history';
}

export interface TranslationEditorScreenConfig {
  endpoint: string;
  variantEndpointBase: string;
  actionEndpointBase: string;
  basePath?: string;
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
    reviewer_id: asString(record.reviewer_id),
    due_state: asString(record.due_state),
    due_date: asString(record.due_date),
    version: asNumber(record.version || record.row_version),
    row_version: asNumber(record.row_version || record.version),
    updated_at: asString(record.updated_at),
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

function normalizeFieldEntries(
  record: Record<string, unknown>,
  sourceFields: Record<string, string>,
  targetFields: Record<string, string>,
  completeness: Record<string, TranslationEditorFieldCompleteness>,
  drift: Record<string, TranslationEditorFieldDrift>,
  validations: Record<string, TranslationEditorFieldValidation>
): TranslationEditorFieldEntry[] {
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
  };
}

export function normalizeEditorUpdateResponse(raw: unknown): TranslationEditorUpdateResponse {
  const envelope = asRecord(raw);
  const record = asRecord(envelope.data && typeof envelope.data === 'object' ? envelope.data : raw);
  return {
    variant_id: asString(record.variant_id),
    row_version: asNumber(record.row_version || record.version),
    fields: normalizeStringRecord(record.fields, { trimKeys: true, omitBlankKeys: true }),
    field_completeness: normalizeFieldMap(record.field_completeness, normalizeFieldCompleteness),
    field_drift: normalizeFieldMap(record.field_drift, normalizeFieldDrift),
    field_validations: normalizeFieldMap(record.field_validations, normalizeFieldValidation),
    assist: normalizeEditorAssistPayload(record.assist, record),
    qa_results: normalizeQAResults(record.qa_results),
    assignment_action_states: normalizeActionStateMap(record.assignment_action_states),
    review_action_states: normalizeActionStateMap(record.review_action_states),
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
    assist: update.assist,
    qa_results: update.qa_results,
    assignment_action_states: update.assignment_action_states,
    review_action_states: update.review_action_states,
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

export function applyEditorAutosaveConflict(
  state: TranslationEditorState,
  payload: unknown
): TranslationEditorState {
  const metadata = asRecord(asRecord(asRecord(payload).error).metadata);
  return {
    ...state,
    assignment_row_version: state.assignment_row_version,
    autosave: {
      pending: false,
      conflict: asRecord(metadata.latest_server_state_record),
    },
  };
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

async function readEditorAutosaveConflictPayload(response: Response): Promise<Record<string, unknown>> {
  const result = await readHTTPErrorResult(response, 'Autosave conflict', {
    appendStatusToFallback: false,
  });
  if (result.payload && typeof result.payload === 'object') {
    return result.payload as Record<string, unknown>;
  }
  return {
    error: {
      message: result.message,
    },
  };
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

function shouldShowReviewActions(detail: TranslationAssignmentEditorDetail): boolean {
  const status = assignmentLifecycleStatus(detail);
  if (isReviewLifecycleStatus(status)) return true;
  return Boolean(detail.review_action_states.approve?.enabled || detail.review_action_states.reject?.enabled);
}

function shouldShowManagementActions(detail: TranslationAssignmentEditorDetail): boolean {
  return Boolean(detail.assignment_action_states.archive?.enabled);
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
  basePath = ''
): string {
  const submitState = detail.assignment_action_states.submit_review;
  const submitDisabled = !submitState?.enabled || saving || submitting || detail.qa_results.submit_blocked;
  const saveDisabled = saving || !hasDirtyFields;
  const sourceLocale = (detail.source_locale || 'source').toUpperCase();
  const targetLocale = (detail.target_locale || 'target').toUpperCase();
  const assignment = detail.translation_assignment;
  const submitTitle = detail.qa_results.submit_blocked
    ? 'Resolve QA blockers before submitting for review.'
    : (submitState?.reason || '');
  return `
    <section class="${CARD} p-6 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="${HEADER_PRETITLE}">Assignment editor</p>
          <div>
            <h1 class="${HEADER_TITLE}">${escapeHTML(assignment.source_title || 'Translation assignment')}</h1>
            <p class="mt-2 text-sm text-gray-600">
              ${escapeHTML(sourceLocale)} to ${escapeHTML(targetLocale)} • ${escapeHTML(sentenceCaseToken(detail.status || assignment.status || 'draft'))} • Priority ${escapeHTML(detail.priority || 'normal')}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Assignee ${escapeHTML(assignment.assignee_id || 'Unassigned')}</span>
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Reviewer ${escapeHTML(assignment.reviewer_id || 'Not set')}</span>
            <span class="rounded-full px-3 py-1 font-medium ${autosaveLabel.tone}" data-autosave-state="${escapeAttribute(autosaveLabel.state)}">${escapeHTML(autosaveLabel.text)}</span>
            ${qaSummaryChips(detail)}
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="${BTN_SECONDARY}"
            data-action="save-draft"
            ${saveDisabled ? 'disabled aria-disabled="true"' : ''}
          >
            ${saving ? 'Saving…' : 'Save draft'}
          </button>
          <button
            type="button"
            class="${BTN_PRIMARY}"
            data-action="submit-review"
            title="${escapeAttribute(submitTitle)}"
            ${submitDisabled ? 'disabled aria-disabled="true"' : ''}
          >
            ${submitting ? 'Submitting…' : (submitState?.enabled ? 'Submit for review' : 'Submit unavailable')}
          </button>
        </div>
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

  let completeFields = 0;
  let missingRequiredFields = 0;
  let sourceChangedFields = 0;
  let validationErrors = 0;
  let firstIssuePath: string | null = null;

  for (const field of fields) {
    // Count completeness
    if (field.completeness.complete && !field.completeness.missing) {
      completeFields++;
    }

    // Count missing required
    if (field.completeness.required && field.completeness.missing) {
      missingRequiredFields++;
      if (!firstIssuePath) firstIssuePath = field.path;
    }

    // Count source drift
    if (field.drift.changed) {
      sourceChangedFields++;
      if (!firstIssuePath) firstIssuePath = field.path;
    }

    // Count validation errors
    if (!field.validation.valid) {
      validationErrors++;
      if (!firstIssuePath) firstIssuePath = field.path;
    }
  }

  // If no field-level issues but we have QA blockers, use first QA finding path
  if (!firstIssuePath && qa.enabled && qa.summary.blocker_count > 0 && qa.findings.length > 0) {
    const blockerFinding = qa.findings.find(f => f.severity === 'blocker');
    if (blockerFinding?.field_path) {
      firstIssuePath = blockerFinding.field_path;
    }
  }

  return {
    totalFields: fields.length,
    completeFields,
    missingRequiredFields,
    sourceChangedFields,
    validationErrors,
    qaBlockers: qa.enabled ? qa.summary.blocker_count : 0,
    qaWarnings: qa.enabled ? qa.summary.warning_count : 0,
    firstIssuePath,
  };
}

// T12: Render field issue summary bar
function renderFieldIssueSummary(summary: EditorFieldIssueSummary): string {
  const hasIssues = summary.missingRequiredFields > 0
    || summary.sourceChangedFields > 0
    || summary.validationErrors > 0
    || summary.qaBlockers > 0;

  const isReadyToSubmit = summary.completeFields === summary.totalFields
    && summary.missingRequiredFields === 0
    && summary.validationErrors === 0
    && summary.qaBlockers === 0;

  // Build summary chips with Tailwind classes
  const chips: string[] = [];

  // Total/complete chip
  const completeClass = isReadyToSubmit
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-gray-100 text-gray-700 border-gray-200';
  chips.push(`<span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${completeClass}">${summary.completeFields}/${summary.totalFields} complete</span>`);

  // Missing required
  if (summary.missingRequiredFields > 0) {
    chips.push(`<span class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">${summary.missingRequiredFields} missing required</span>`);
  }

  // Source changed
  if (summary.sourceChangedFields > 0) {
    chips.push(`<span class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">${summary.sourceChangedFields} source changed</span>`);
  }

  // Validation errors
  if (summary.validationErrors > 0) {
    chips.push(`<span class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">${summary.validationErrors} validation ${summary.validationErrors === 1 ? 'error' : 'errors'}</span>`);
  }

  // QA blockers
  if (summary.qaBlockers > 0) {
    chips.push(`<span class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">${summary.qaBlockers} QA ${summary.qaBlockers === 1 ? 'blocker' : 'blockers'}</span>`);
  }

  // QA warnings
  if (summary.qaWarnings > 0) {
    chips.push(`<span class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">${summary.qaWarnings} QA ${summary.qaWarnings === 1 ? 'warning' : 'warnings'}</span>`);
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
        <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 4a.5.5 0 0 1 .5.5v5.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L7.5 10.293V4.5A.5.5 0 0 1 8 4z"/>
        </svg>
      </button>`
    : '';

  return `
    <section class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${barClass}" aria-label="Field progress summary" data-editor-summary="true">
      <div class="flex flex-wrap items-center gap-2">${chips.join('')}</div>
      ${jumpButton}
    </section>
  `;
}

// T12: Render contextual empty source state
function renderSourceValue(entry: TranslationEditorFieldEntry): string {
  if (entry.source_value && entry.source_value.trim()) {
    return escapeHTML(entry.source_value);
  }

  // Contextual empty state based on field type and required status
  if (entry.required) {
    return '<span class="text-amber-600 italic">Source text pending - required field</span>';
  }
  return '<span class="text-gray-400 italic">Optional source content not provided</span>';
}

function renderFieldList(detail: TranslationAssignmentEditorDetail): string {
  const summary = computeFieldIssueSummary(detail);

  return `
    <section class="space-y-4">
      ${renderFieldIssueSummary(summary)}
      ${detail.fields.map((entry) => `
        <article class="rounded-xl border border-gray-200 bg-white p-5" data-editor-field="${escapeAttribute(entry.path)}" id="field-${escapeAttribute(entry.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">${escapeHTML(entry.label)}</h2>
              <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${escapeHTML(entry.path)}${entry.required ? ' • Required' : ''}</p>
            </div>
            <button
              type="button"
              class="${BTN_GHOST}"
              data-copy-source="${escapeAttribute(entry.path)}"
              aria-label="Copy source text to translation field for ${escapeAttribute(entry.label)}"
            >
              Copy source
            </button>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-gray-800">${renderSourceValue(entry)}</div>
            </div>
            <div class="rounded-xl border ${entry.validation.valid ? 'border-gray-200' : 'border-rose-200'} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500" for="editor-field-${escapeAttribute(entry.path)}">Translation</label>
              ${entry.input_type === 'textarea'
                ? `<textarea id="editor-field-${escapeAttribute(entry.path)}" class="mt-2 min-h-[140px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${escapeAttribute(entry.path)}">${escapeHTML(entry.target_value)}</textarea>`
                : `<input id="editor-field-${escapeAttribute(entry.path)}" type="text" class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${escapeAttribute(entry.path)}" value="${escapeAttribute(entry.target_value)}" />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${entry.completeness.missing ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">
                  ${entry.completeness.missing ? 'Missing required content' : 'Ready to submit'}
                </span>
                ${shouldRenderFieldDriftDetail(entry) ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ''}
              </div>
              ${entry.validation.valid ? '' : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${escapeAttribute(entry.path)}">${escapeHTML(entry.validation.message || 'Validation error')}</p>`}
              ${renderDriftNotice(entry)}
              ${renderGlossaryHits(entry)}
            </div>
          </div>
        </article>
      `).join('')}
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
            ${finding.field_path ? `<p class="mt-2 text-xs opacity-80">Field ${escapeHTML(finding.field_path)}</p>` : ''}
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
      tone: 'border-emerald-300 text-emerald-700',
    },
    {
      key: 'reject',
      label: 'Request changes',
      state: rejectState,
      tone: 'border-rose-300 text-rose-700',
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
              class="rounded-lg border px-4 py-2 text-sm font-semibold ${action.tone} ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'}"
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

function renderRejectModal(rejectDraft: TranslationEditorRejectDraft | null, submitting: boolean): string {
  if (!rejectDraft) {
    return '';
  }
  return `
    <div class="${MODAL_OVERLAY}" data-reject-modal="true">
      <section class="${MODAL_CONTENT}" role="dialog" aria-modal="true" aria-labelledby="translation-reject-title">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Review action</p>
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
                  <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${escapeHTML(attachment.kind)}</p>
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

// T13: Compute sidebar tab badges
function computeSidebarTabBadges(detail: TranslationAssignmentEditorDetail): Record<SidebarTab, string | null> {
  const hasReviewActions = shouldShowReviewActions(detail);
  const hasManagementActions = shouldShowManagementActions(detail);
  const qaCount = detail.qa_results.enabled ? detail.qa_results.summary.finding_count : 0;
  const tmCount = normalizeTranslationMemorySuggestions(detail.assist.translation_memory_suggestions).length;
  const glossaryCount = detail.assist.glossary_matches.length;
  const fileCount = detail.attachment_summary.total;
  const historyCount = detail.history.total;

  return {
    actions: (hasReviewActions || hasManagementActions) ? null : null,
    qa: qaCount > 0 ? String(qaCount) : null,
    assist: (tmCount + glossaryCount) > 0 ? String(tmCount + glossaryCount) : null,
    files: fileCount > 0 ? String(fileCount) : null,
    history: historyCount > 0 ? String(historyCount) : null,
  };
}

// T13: Render tabbed sidebar
function renderTabbedSidebar(detail: TranslationAssignmentEditorDetail, submitting: boolean, activeTab: SidebarTab = 'actions', loadState?: TranslationEditorLoadState): string {
  const badges = computeSidebarTabBadges(detail);
  const hasReviewActions = shouldShowReviewActions(detail);
  const hasManagementActions = shouldShowManagementActions(detail);
  const hasActions = hasReviewActions || hasManagementActions;

  // Tab definitions
  const tabs: Array<{ id: SidebarTab; label: string; icon: string; badge: string | null }> = [
    {
      id: 'actions',
      label: 'Actions',
      icon: '<svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>',
      badge: badges.actions,
    },
    {
      id: 'qa',
      label: 'QA',
      icon: '<svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM6.5 7.5a.5.5 0 0 1 1 0v2.5a.5.5 0 0 1-1 0V7.5zm2 0a.5.5 0 0 1 1 0v2.5a.5.5 0 0 1-1 0V7.5z"/></svg>',
      badge: badges.qa,
    },
    {
      id: 'assist',
      label: 'Assist',
      icon: '<svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a3 3 0 0 0-3 3v2H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1V4a3 3 0 0 0-3-3zM6 4a2 2 0 1 1 4 0v2H6V4z"/></svg>',
      badge: badges.assist,
    },
    {
      id: 'files',
      label: 'Files',
      icon: '<svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M4 0h5.5v1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h1V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/><path d="M9.5 3V0L14 4.5h-3A1.5 1.5 0 0 1 9.5 3z"/></svg>',
      badge: badges.files,
    },
    {
      id: 'history',
      label: 'History',
      icon: '<svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zM8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1a6 6 0 1 1 0 12A6 6 0 0 1 8 2z"/><path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z"/></svg>',
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
          ${tab.icon}
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
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true">
      ${renderFeedback(runtime.feedback || null)}
      ${renderHeader(detail, autosaveLabel, hasDirtyFields, runtime.submitting === true, runtime.saving === true, options.basePath || '')}
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
          ${renderFieldList(detail)}
        </div>
        <div class="order-2">
          ${renderTabbedSidebar(detail, runtime.submitting === true, runtime.activeSidebarTab || 'actions', loadState)}
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
  private rejectDraft: TranslationEditorRejectDraft | null = null;
  // T13: Active sidebar tab
  private activeSidebarTab: SidebarTab = 'actions';

  constructor(config: TranslationEditorScreenConfig) {
    this.config = {
      endpoint: config.endpoint,
      variantEndpointBase: config.variantEndpointBase,
      actionEndpointBase: config.actionEndpointBase,
      basePath: config.basePath || '/admin',
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
    } else {
      this.editorState = null;
    }
    this.render();
  }

  private render(): void {
    if (!this.container) return;
    renderTranslationEditorPage(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
      feedback: this.feedback,
      lastSavedMessage: this.lastSavedMessage,
      saving: this.saving,
      submitting: this.submitting,
      rejectDraft: this.rejectDraft,
      activeSidebarTab: this.activeSidebarTab,
    });
    this.attachEventListeners();
    // Set up logical tab order for translation fields
    setupFieldTabOrder(this.container);
  }

  private attachEventListeners(): void {
    if (!this.container || !this.editorState) return;
    this.container.querySelectorAll<HTMLElement>('[data-field-input]').forEach((element) => {
      element.addEventListener('input', (event) => {
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
      element.addEventListener('click', () => {
        const path = element.dataset.copySource || '';
        const entry = this.editorState?.detail.fields.find((item) => item.path === path);
        if (!entry || !this.editorState) return;
        this.editorState = applyEditorFieldChange(this.editorState, path, entry.source_value);
        this.scheduleAutosave();
        this.render();
      });
    });
    this.container.querySelector<HTMLElement>('[data-action="save-draft"]')?.addEventListener('click', () => {
      void this.saveDirtyFields(false);
    });
    this.container.querySelector<HTMLElement>('[data-action="submit-review"]')?.addEventListener('click', () => {
      void this.submitForReview();
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
      this.feedback = { kind: 'conflict', message: 'Reloaded the latest server draft.' };
      void this.load(this.editorState?.detail.history.page);
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
    this.container.querySelector<HTMLElement>('[data-jump-to-field]')?.addEventListener('click', (event) => {
      const button = event.currentTarget as HTMLElement;
      const fieldPath = button.dataset.jumpToField;
      if (!fieldPath || !this.container) return;
      const fieldElement = this.container.querySelector<HTMLElement>(`[data-editor-field="${CSS.escape(fieldPath)}"]`);
      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus the input field within
        const input = fieldElement.querySelector<HTMLInputElement | HTMLTextAreaElement>('[data-field-input]');
        if (input) {
          setTimeout(() => input.focus(), 300);
        }
      }
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

  private scheduleAutosave(): void {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      void this.saveDirtyFields(true);
    }, 600);
  }

  private async saveDirtyFields(isAutosave: boolean): Promise<boolean> {
    if (!this.editorState || !Object.keys(this.editorState.dirty_fields).length || this.saving) return true;
    this.saving = true;
    this.editorState = markEditorAutosavePending(this.editorState);
    this.render();
    const detail = this.editorState.detail;
    const response = await httpRequest(buildURLWithParams(`${this.config.variantEndpointBase}/${encodeURIComponent(detail.variant_id)}`, {}), {
      method: 'PATCH',
      json: {
        expected_version: this.editorState.row_version,
        autosave: isAutosave,
        fields: this.editorState.dirty_fields,
      },
    });
    if (!response.ok) {
      if (response.status === 409) {
        const conflictPayload = await readEditorAutosaveConflictPayload(response);
        this.editorState = applyEditorAutosaveConflict(this.editorState, conflictPayload);
        this.feedback = { kind: 'conflict', message: 'Autosave conflict detected. Reload the latest server draft.' };
        this.saving = false;
        this.render();
        return false;
      }
      const error = await buildEditorRequestError(response, 'Failed to save draft');
      this.feedback = { kind: 'error', message: error.message };
      this.saving = false;
      this.render();
      return false;
    }
    const payload = await response.json();
    this.editorState = applyEditorUpdateResponse(this.editorState, payload);
    const qaFeedback = buildSaveFeedbackMessage(this.editorState.detail.qa_results, isAutosave);
    this.lastSavedMessage = qaFeedback.lastSaved;
    if (!isAutosave || qaFeedback.kind === 'conflict') {
      this.feedback = { kind: qaFeedback.kind, message: qaFeedback.message };
    }
    this.saving = false;
    this.render();
    return true;
  }

  private async submitForReview(): Promise<void> {
    if (!this.editorState || this.submitting) return;
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
    const assignmentVersion = this.editorState.detail.translation_assignment.version;
    const response = await httpRequest(`${this.config.actionEndpointBase}/${encodeURIComponent(this.editorState.detail.assignment_id)}/actions/submit_review`, {
      method: 'POST',
      json: { expected_version: assignmentVersion },
    });
    if (!response.ok) {
      const error = await buildEditorRequestError(response, 'Failed to submit assignment');
      this.feedback = {
        kind: error.code === 'VERSION_CONFLICT' || error.code === 'POLICY_BLOCKED' ? 'conflict' : 'error',
        message: error.message,
      };
      this.submitting = false;
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
    await this.load(this.editorState.detail.history.page);
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
    const response = await httpRequest(`${this.config.actionEndpointBase}/${encodeURIComponent(detail.assignment_id)}/actions/${action}`, {
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
  screen.mount(root);
  return screen;
}
