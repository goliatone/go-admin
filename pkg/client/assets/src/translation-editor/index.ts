import {
  normalizeTranslationActionState,
  type TranslationActionState,
} from '../translation-contracts/index.js';

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
}

export interface TranslationAssignmentEditorDetail {
  assignment_id: string;
  variant_id: string;
  family_id: string;
  row_version: number;
  source_fields: Record<string, string>;
  target_fields: Record<string, string>;
  fields: TranslationEditorFieldEntry[];
  field_completeness: Record<string, TranslationEditorFieldCompleteness>;
  field_drift: Record<string, TranslationEditorFieldDrift>;
  field_validations: Record<string, TranslationEditorFieldValidation>;
  assist: TranslationEditorAssistPayload;
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
  assignment_action_states: Record<string, TranslationActionState>;
  review_action_states: Record<string, TranslationActionState>;
}

export interface TranslationEditorState {
  detail: TranslationAssignmentEditorDetail;
  dirty_fields: Record<string, string>;
  row_version: number;
  can_submit_review: boolean;
  autosave: {
    pending: boolean;
    conflict: Record<string, unknown> | null;
  };
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

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
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
  return {
    assignment_id: asString(record.assignment_id),
    variant_id: asString(record.variant_id),
    family_id: asString(record.family_id),
    row_version: asNumber(record.row_version || record.version),
    source_fields: sourceFields,
    target_fields: targetFields,
    fields: normalizeFieldEntries(record, sourceFields, targetFields, completeness, drift, validations),
    field_completeness: completeness,
    field_drift: drift,
    field_validations: validations,
    assist: normalizeEditorAssistPayload(record.assist, record),
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
    can_submit_review: computeCanSubmitReview(nextDetail),
  };
}

export function markEditorAutosavePending(state: TranslationEditorState): TranslationEditorState {
  return {
    ...state,
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
    assignment_action_states: update.assignment_action_states,
    review_action_states: update.review_action_states,
  };
  nextDetail.fields = rebuildFieldEntries(nextDetail);
  return {
    ...state,
    detail: nextDetail,
    dirty_fields: {},
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
    autosave: {
      pending: false,
      conflict: asRecord(metadata.latest_server_state_record),
    },
  };
}
