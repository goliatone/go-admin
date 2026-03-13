import {
  normalizeTranslationActionState,
  type TranslationActionState,
} from '../translation-contracts/index.js';
import { escapeAttribute, escapeHTML } from '../shared/html.js';
import { httpRequest, readHTTPError } from '../shared/transport/http-client.js';
import { extractStructuredError } from '../toast/error-helpers.js';

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

export interface TranslationEditorScreenConfig {
  endpoint: string;
  variantEndpointBase: string;
  actionEndpointBase: string;
  basePath?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asStringMap(value: unknown): Record<string, string> {
  const record = asRecord(value);
  const out: Record<string, string> = {};
  for (const [key, candidate] of Object.entries(record)) {
    const normalized = asString(candidate);
    if (!key.trim()) continue;
    out[key.trim()] = normalized;
  }
  return out;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => asString(entry)).filter(Boolean);
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
        return {
          path,
          label: asString(field.label) || path,
          input_type: asString(field.input_type) || 'text',
          required: asBoolean(field.required),
          source_value: asString(field.source_value) || sourceFields[path] || '',
          target_value: asString(field.target_value) || targetFields[path] || '',
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
  const sourceFields = asStringMap(record.source_fields);
  const targetFields = asStringMap(record.target_fields ?? record.fields);
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
    fields: asStringMap(record.fields),
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
): { tone: string; text: string; state: string } {
  if (editorState?.autosave.conflict) {
    return { tone: 'bg-rose-100 text-rose-700', text: 'Conflict detected', state: 'conflict' };
  }
  if (editorState?.autosave.pending) {
    return { tone: 'bg-amber-100 text-amber-700', text: 'Autosaving draft…', state: 'saving' };
  }
  if (hasDirtyFields) {
    return { tone: 'bg-slate-100 text-slate-700', text: 'Unsaved changes', state: 'dirty' };
  }
  if (lastSavedMessage) {
    return { tone: 'bg-emerald-100 text-emerald-700', text: lastSavedMessage, state: 'saved' };
  }
  return { tone: 'bg-slate-100 text-slate-700', text: 'No pending changes', state: 'idle' };
}

function renderDiagnostics(state: TranslationEditorLoadState): string {
  const parts = [
    state.requestId ? `Request ${escapeHTML(state.requestId)}` : '',
    state.traceId ? `Trace ${escapeHTML(state.traceId)}` : '',
    state.errorCode ? `Code ${escapeHTML(state.errorCode)}` : '',
  ].filter(Boolean);
  if (!parts.length) return '';
  return `<p class="mt-3 text-xs text-slate-500">${parts.join(' · ')}</p>`;
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
    <div class="rounded-2xl border px-4 py-3 text-sm font-medium ${tone}" data-editor-feedback-kind="${escapeAttribute(feedback.kind)}" role="status" aria-live="polite">
      ${escapeHTML(feedback.message)}
    </div>
  `;
}

function renderLoadingState(): string {
  return `
    <section class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm" aria-busy="true">
      <p class="text-sm font-medium text-slate-500">Loading translation assignment…</p>
    </section>
  `;
}

function renderEmptyState(title: string, message: string): string {
  return `
    <section class="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <h2 class="text-lg font-semibold text-slate-900">${escapeHTML(title)}</h2>
      <p class="mt-2 text-sm text-slate-500">${escapeHTML(message)}</p>
    </section>
  `;
}

function renderErrorState(title: string, message: string, state: TranslationEditorLoadState): string {
  return `
    <section class="rounded-3xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
      <h2 class="text-lg font-semibold text-rose-900">${escapeHTML(title)}</h2>
      <p class="mt-2 text-sm text-rose-700">${escapeHTML(message)}</p>
      ${renderDiagnostics(state)}
    </section>
  `;
}

function renderHeader(
  detail: TranslationAssignmentEditorDetail,
  autosaveLabel: { tone: string; text: string; state: string },
  hasDirtyFields: boolean,
  submitting: boolean,
  saving: boolean
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
    <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Assignment editor</p>
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-slate-950">${escapeHTML(assignment.source_title || 'Translation assignment')}</h1>
            <p class="mt-2 text-sm text-slate-600">
              ${escapeHTML(sourceLocale)} to ${escapeHTML(targetLocale)} • ${escapeHTML(sentenceCase(detail.status || assignment.status || 'draft'))} • Priority ${escapeHTML(detail.priority || 'normal')}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-slate-600">
            <span class="rounded-full bg-slate-100 px-3 py-1 font-medium">Assignee ${escapeHTML(assignment.assignee_id || 'Unassigned')}</span>
            <span class="rounded-full bg-slate-100 px-3 py-1 font-medium">Reviewer ${escapeHTML(assignment.reviewer_id || 'Not set')}</span>
            <span class="rounded-full px-3 py-1 font-medium ${autosaveLabel.tone}" data-autosave-state="${escapeAttribute(autosaveLabel.state)}">${escapeHTML(autosaveLabel.text)}</span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 ${saveDisabled ? 'cursor-not-allowed opacity-60' : 'hover:border-slate-400 hover:text-slate-900'}"
            data-action="save-draft"
            ${saveDisabled ? 'disabled aria-disabled="true"' : ''}
          >
            ${saving ? 'Saving…' : 'Save draft'}
          </button>
          <button
            type="button"
            class="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white ${submitDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-sky-700'}"
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

function renderDriftNotice(entry: TranslationEditorFieldEntry): string {
  if (!entry.drift.changed) return '';
  return `
    <div class="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${escapeAttribute(entry.path)}">
      <p class="font-semibold">Source changed since the last synced draft.</p>
      <p class="mt-1"><span class="font-medium">Before:</span> ${escapeHTML(entry.drift.previous_source_value || 'Unavailable')}</p>
      <p class="mt-1"><span class="font-medium">Current:</span> ${escapeHTML(entry.drift.current_source_value || entry.source_value || 'Unavailable')}</p>
    </div>
  `;
}

function renderGlossaryHits(entry: TranslationEditorFieldEntry): string {
  const hits = Array.isArray(entry.glossary_hits) ? entry.glossary_hits : [];
  if (!hits.length) return '';
  return `
    <div class="mt-3 flex flex-wrap gap-2">
      ${hits.map((hit) => `
        <span class="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
          ${escapeHTML(asString(hit.term))} → ${escapeHTML(asString(hit.preferred_translation))}
        </span>
      `).join('')}
    </div>
  `;
}

function renderFieldList(detail: TranslationAssignmentEditorDetail): string {
  return `
    <section class="space-y-4">
      ${detail.fields.map((entry) => `
        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-editor-field="${escapeAttribute(entry.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-950">${escapeHTML(entry.label)}</h2>
              <p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">${escapeHTML(entry.path)}${entry.required ? ' • Required' : ''}</p>
            </div>
            <button
              type="button"
              class="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
              data-copy-source="${escapeAttribute(entry.path)}"
            >
              Copy source
            </button>
          </div>
          <div class="mt-4 grid gap-4 xl:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-slate-800">${escapeHTML(entry.source_value || 'No source text')}</div>
            </div>
            <div class="rounded-2xl border ${entry.validation.valid ? 'border-slate-200' : 'border-rose-200'} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500" for="editor-field-${escapeAttribute(entry.path)}">Translation</label>
              ${entry.input_type === 'textarea'
                ? `<textarea id="editor-field-${escapeAttribute(entry.path)}" class="mt-2 min-h-[140px] w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${escapeAttribute(entry.path)}">${escapeHTML(entry.target_value)}</textarea>`
                : `<input id="editor-field-${escapeAttribute(entry.path)}" type="text" class="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${escapeAttribute(entry.path)}" value="${escapeAttribute(entry.target_value)}" />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${entry.completeness.missing ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">
                  ${entry.completeness.missing ? 'Missing required content' : 'Ready to submit'}
                </span>
                ${entry.drift.changed ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ''}
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

function renderAssistPanel(detail: TranslationAssignmentEditorDetail): string {
  const glossary = detail.assist.glossary_matches;
  const styleGuide = detail.assist.style_guide_summary;
  return `
    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-semibold text-slate-950">Assist</h2>
      <div class="mt-4 space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-slate-800">Glossary</h3>
          ${glossary.length
            ? `<ul class="mt-3 space-y-2">${glossary.map((entry) => `
                <li class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <strong class="text-slate-950">${escapeHTML(entry.term)}</strong> → ${escapeHTML(entry.preferred_translation)}
                  ${entry.notes ? `<p class="mt-1 text-xs text-slate-500">${escapeHTML(entry.notes)}</p>` : ''}
                </li>
              `).join('')}</ul>`
            : '<p class="mt-3 text-sm text-slate-500">Glossary matches unavailable for this assignment.</p>'}
        </div>
        <div>
          <h3 class="text-sm font-semibold text-slate-800">Style guide</h3>
          ${styleGuide.available
            ? `
              <div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p class="text-sm font-semibold text-slate-900">${escapeHTML(styleGuide.title)}</p>
                <p class="mt-2 text-sm text-slate-700">${escapeHTML(styleGuide.summary)}</p>
                <ul class="mt-3 space-y-2 text-sm text-slate-700">
                  ${styleGuide.rules.map((rule) => `<li>• ${escapeHTML(rule)}</li>`).join('')}
                </ul>
              </div>
            `
            : '<p class="mt-3 text-sm text-slate-500">Style-guide guidance is unavailable. Editing remains enabled.</p>'}
        </div>
      </div>
    </section>
  `;
}

function renderReviewFeedbackPanel(detail: TranslationAssignmentEditorDetail): string {
  const comments = detail.review_feedback.comments;
  if (!comments.length && !detail.last_rejection_reason) {
    return '';
  }
  return `
    <section class="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <h2 class="text-lg font-semibold text-amber-950">Reviewer feedback</h2>
      ${detail.last_rejection_reason
        ? `<p class="mt-3 rounded-2xl bg-white/70 px-3 py-3 text-sm text-amber-900">${escapeHTML(detail.last_rejection_reason)}</p>`
        : ''}
      ${comments.length
        ? `<ol class="mt-4 space-y-3">${comments.map((entry) => `
            <li class="rounded-2xl border border-amber-200 bg-white px-3 py-3 text-sm text-amber-900">
              <p>${escapeHTML(entry.body || 'Feedback unavailable')}</p>
              <p class="mt-2 text-xs text-amber-700">${escapeHTML(entry.author_id || 'Reviewer')}${entry.created_at ? ` • ${escapeHTML(formatTimestamp(entry.created_at))}` : ''}</p>
            </li>
          `).join('')}</ol>`
        : ''}
    </section>
  `;
}

function renderQAPanel(detail: TranslationAssignmentEditorDetail): string {
  const qa = detail.qa_results;
  if (!qa.enabled) {
    return '';
  }
  const findings = qa.findings;
  return `
    <section class="rounded-3xl border ${qa.submit_blocked ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'} p-5 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-950">QA checks</h2>
          <p class="mt-1 text-sm ${qa.submit_blocked ? 'text-rose-700' : 'text-slate-600'}">
            ${qa.submit_blocked ? 'Submit is blocked until blockers are resolved.' : 'Warnings are advisory; blockers must be resolved before submit.'}
          </p>
        </div>
        <span class="rounded-full ${qa.submit_blocked ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'} px-3 py-1 text-xs font-semibold">
          ${qa.summary.finding_count} findings
        </span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 text-xs">
        <span class="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">Warnings ${qa.summary.warning_count}</span>
        <span class="rounded-full bg-rose-100 px-3 py-1 font-medium text-rose-800">Blockers ${qa.summary.blocker_count}</span>
      </div>
      ${findings.length
        ? `<ol class="mt-4 space-y-3">${findings.map((finding) => `
            <li class="rounded-2xl border ${finding.severity === 'blocker' ? 'border-rose-200 bg-white text-rose-900' : 'border-amber-200 bg-white text-amber-900'} px-3 py-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <strong>${escapeHTML(sentenceCase(finding.category))}</strong>
                <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${finding.severity === 'blocker' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">${escapeHTML(finding.severity)}</span>
              </div>
              <p class="mt-2">${escapeHTML(finding.message)}</p>
              ${finding.field_path ? `<p class="mt-2 text-xs opacity-80">Field ${escapeHTML(finding.field_path)}</p>` : ''}
            </li>
          `).join('')}</ol>`
        : '<p class="mt-4 text-sm text-slate-500">No QA findings for this assignment.</p>'}
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
      label: 'Reject',
      state: rejectState,
      tone: 'border-rose-300 text-rose-700',
    },
  ];
  return `
    <section
      class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      data-editor-panel="review-actions"
      aria-label="Review actions"
    >
      <h2 class="text-lg font-semibold text-slate-950">Review actions</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        ${actions.map((action) => {
          const disabled = !action.state?.enabled || submitting;
          return `
            <button
              type="button"
              class="rounded-xl border px-4 py-2 text-sm font-semibold ${action.tone} ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50'}"
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

function renderManagementActionsPanel(detail: TranslationAssignmentEditorDetail, submitting: boolean): string {
  if (!shouldShowManagementActions(detail)) {
    return '';
  }
  const archiveState = detail.assignment_action_states.archive;
  const disabled = !archiveState?.enabled || submitting;
  return `
    <section
      class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      data-editor-panel="management-actions"
      aria-label="Management actions"
    >
      <h2 class="text-lg font-semibold text-slate-950">Management actions</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50'}"
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
    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-slate-950">Attachments</h2>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">${detail.attachment_summary.total}</span>
      </div>
      ${detail.attachments.length
        ? `<ul class="mt-4 space-y-3">${detail.attachments.map((attachment) => `
            <li class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-slate-900">${escapeHTML(attachment.filename)}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">${escapeHTML(attachment.kind)}</p>
                </div>
                <span class="text-xs text-slate-500">${escapeHTML(byteSizeLabel(attachment.byte_size))}</span>
              </div>
              ${attachment.description ? `<p class="mt-2 text-xs text-slate-500">${escapeHTML(attachment.description)}</p>` : ''}
              ${attachment.uploaded_at ? `<p class="mt-2 text-xs text-slate-500">Uploaded ${escapeHTML(formatTimestamp(attachment.uploaded_at))}</p>` : ''}
            </li>
          `).join('')}</ul>`
        : '<p class="mt-4 text-sm text-slate-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}

function renderHistoryPanel(detail: TranslationAssignmentEditorDetail): string {
  const history = detail.history;
  return `
    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-slate-950">History</h2>
        <span class="text-xs text-slate-500">Page ${history.page} of ${Math.max(1, Math.ceil(history.total / Math.max(1, history.per_page)))}</span>
      </div>
      ${history.items.length
        ? `<ol class="mt-4 space-y-3">${history.items.map((entry) => `
            <li class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700" data-history-entry="${escapeAttribute(entry.id)}">
              <div class="flex items-start justify-between gap-3">
                <p class="font-semibold text-slate-900">${escapeHTML(entry.title || sentenceCase(entry.entry_type))}</p>
                <span class="text-xs text-slate-500">${escapeHTML(formatTimestamp(entry.created_at))}</span>
              </div>
              ${entry.body ? `<p class="mt-2 text-sm text-slate-700">${escapeHTML(entry.body)}</p>` : ''}
              ${entry.action ? `<p class="mt-2 text-xs text-slate-500">Action ${escapeHTML(entry.action)}</p>` : ''}
            </li>
          `).join('')}</ol>`
        : '<p class="mt-4 text-sm text-slate-500">No history entries available.</p>'}
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400" data-history-prev="true" ${history.page <= 1 ? 'disabled aria-disabled="true"' : ''}>Previous</button>
        <button type="button" class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400" data-history-next="true" ${!history.has_more ? 'disabled aria-disabled="true"' : ''}>Next</button>
      </div>
    </section>
  `;
}

export function renderTranslationEditorState(
  loadState: TranslationEditorLoadState,
  editorState?: TranslationEditorState | null,
  options: TranslationEditorRenderOptions = {},
  runtime: {
    feedback?: { kind: 'success' | 'error' | 'conflict'; message: string } | null;
    lastSavedMessage?: string;
    saving?: boolean;
    submitting?: boolean;
  } = {}
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
      ${renderHeader(detail, autosaveLabel, hasDirtyFields, runtime.submitting === true, runtime.saving === true)}
      ${conflictState ? `
        <section class="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-amber-900">Autosave conflict</h2>
              <p class="mt-1 text-sm text-amber-800">A newer server draft exists. Reload it before continuing.</p>
            </div>
            <button type="button" class="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700" data-action="reload-server-state">Reload server draft</button>
          </div>
        </section>
      ` : ''}
      <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div class="space-y-6">
          ${renderFieldList(detail)}
        </div>
        <aside class="space-y-6">
          ${renderReviewActionsPanel(detail, runtime.submitting === true)}
          ${renderManagementActionsPanel(detail, runtime.submitting === true)}
          ${renderReviewFeedbackPanel(detail)}
          ${renderQAPanel(detail)}
          ${renderAssistPanel(detail)}
          ${renderAttachmentPanel(detail)}
          ${renderHistoryPanel(detail)}
          ${renderDiagnostics(loadState)}
        </aside>
      </div>
    </div>
  `;
}

export function renderTranslationEditorPage(
  root: HTMLElement,
  loadState: TranslationEditorLoadState,
  editorState?: TranslationEditorState | null,
  options: TranslationEditorRenderOptions = {},
  runtime: {
    feedback?: { kind: 'success' | 'error' | 'conflict'; message: string } | null;
    lastSavedMessage?: string;
    saving?: boolean;
    submitting?: boolean;
  } = {}
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
  private saving = false;
  private submitting = false;

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
    this.render();
    void this.load();
  }

  unmount(): void {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
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
    });
    this.attachEventListeners();
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
      void this.runReviewAction('reject');
    });
    this.container.querySelector<HTMLElement>('[data-action="archive"]')?.addEventListener('click', () => {
      void this.runReviewAction('archive');
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
        const conflictPayload = await response.json().catch(async () => ({ error: { message: await readHTTPError(response, 'Autosave conflict') } }));
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
    this.lastSavedMessage = isAutosave ? 'Draft saved automatically' : 'Draft saved';
    if (!isAutosave) {
      this.feedback = { kind: 'success', message: 'Draft saved.' };
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
          ? 'Resolve QA blockers before submitting for review.'
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
      message: status === 'approved'
        ? 'Submitted and auto-approved.'
        : 'Submitted for review.',
    };
    this.submitting = false;
    await this.load(this.editorState.detail.history.page);
  }

  private async runReviewAction(action: 'approve' | 'reject' | 'archive'): Promise<void> {
    if (!this.editorState || this.submitting) return;
    const detail = this.editorState.detail;
    const actionState = action === 'archive'
      ? detail.assignment_action_states.archive
      : detail.review_action_states[action];
    if (!actionState?.enabled) {
      this.feedback = { kind: 'error', message: actionState?.reason || `${sentenceCase(action)} is unavailable.` };
      this.render();
      return;
    }
    const request: Record<string, unknown> = {
      expected_version: detail.translation_assignment.version,
    };
    if (action === 'reject') {
      const reason = typeof window !== 'undefined'
        ? window.prompt('Reject reason')
        : '';
      if (!reason || !reason.trim()) {
        this.feedback = { kind: 'error', message: 'Reject reason is required.' };
        this.render();
        return;
      }
      request.reason = reason.trim();
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
          ? 'Assignment rejected.'
          : 'Assignment archived.',
    };
    this.submitting = false;
    await this.load(this.editorState.detail.history.page);
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
