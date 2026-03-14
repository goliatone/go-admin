export interface ActionRemediation {
  label?: string;
  href?: string;
  kind?: string;
}

export interface ActionState {
  enabled: boolean;
  reason?: string;
  reason_code?: string;
  severity?: string;
  kind?: string;
  permission?: string;
  metadata?: Record<string, unknown> | null;
  remediation?: ActionRemediation | null;
  available_transitions?: string[];
}

export interface ActionStateMap {
  [actionName: string]: ActionState;
}

export interface ActionStateRecord {
  _action_state?: ActionStateMap;
}

export interface BulkActionStateMap {
  [actionName: string]: ActionState;
}

export interface ActionBlockCodeSource {
  reason_code?: unknown;
  textCode?: unknown;
  text_code?: unknown;
  error?: ActionBlockCodeSource | null;
}

export type ActionBlockCodeInput =
  | string
  | null
  | undefined
  | ActionBlockCodeSource;

function trimCode(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function trimText(value: unknown): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || undefined;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeActionRemediation(value: unknown): ActionRemediation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const source = value as Record<string, unknown>;
  const label = trimText(source.label);
  const href = trimText(source.href);
  const kind = trimText(source.kind);
  if (!label && !href && !kind) {
    return null;
  }
  return {
    ...(label ? { label } : {}),
    ...(href ? { href } : {}),
    ...(kind ? { kind } : {}),
  };
}

function normalizeActionTransitions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const transitions = value
    .map((entry) => trimText(entry))
    .filter((entry): entry is string => Boolean(entry));
  return transitions.length > 0 ? transitions : undefined;
}

function hasActionStateFields(source: Record<string, unknown>): boolean {
  return [
    'enabled',
    'reason',
    'reason_code',
    'severity',
    'kind',
    'permission',
    'metadata',
    'remediation',
    'available_transitions',
  ].some((key) => key in source);
}

function extractCodeFromSource(source: ActionBlockCodeSource | null | undefined, depth: number = 0): string {
  if (!source || depth > 2) {
    return '';
  }
  return (
    trimCode(source.reason_code) ||
    trimCode(source.textCode) ||
    trimCode(source.text_code) ||
    extractCodeFromSource(source.error ?? undefined, depth + 1)
  );
}

export function normalizeActionBlockCode(input: ActionBlockCodeInput): string | null {
  if (typeof input === 'string') {
    const normalized = input.trim().toUpperCase();
    return normalized || null;
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }
  const source = input as ActionBlockCodeSource;
  const code = extractCodeFromSource(source);
  if (!code) {
    return null;
  }
  return code.toUpperCase();
}

export function normalizeActionState(value: unknown): ActionState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  if (!hasActionStateFields(source)) {
    return null;
  }

  const reasonCode = normalizeActionBlockCode({ reason_code: source.reason_code });
  const state: ActionState = {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : false,
  };

  const reason = trimText(source.reason);
  const severity = trimText(source.severity);
  const kind = trimText(source.kind);
  const permission = trimText(source.permission);
  const metadata =
    source.metadata && typeof source.metadata === 'object' && !Array.isArray(source.metadata)
      ? source.metadata as Record<string, unknown>
      : null;
  const remediation = normalizeActionRemediation(source.remediation);
  const availableTransitions = normalizeActionTransitions(source.available_transitions);

  if (reason) {
    state.reason = reason;
  }
  if (reasonCode) {
    state.reason_code = reasonCode;
  }
  if (severity) {
    state.severity = severity;
  }
  if (kind) {
    state.kind = kind;
  }
  if (permission) {
    state.permission = permission;
  }
  if (metadata) {
    state.metadata = metadata;
  }
  if (remediation) {
    state.remediation = remediation;
  }
  if (availableTransitions) {
    state.available_transitions = availableTransitions;
  }

  return state;
}

export function normalizeActionStateMap(value: unknown): ActionStateMap {
  if (!isObjectRecord(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const out: ActionStateMap = {};
  for (const [actionName, candidate] of Object.entries(source)) {
    const normalizedName = trimText(actionName);
    const normalizedState = normalizeActionState(candidate);
    if (!normalizedName || !normalizedState) {
      continue;
    }
    out[normalizedName] = normalizedState;
  }
  return out;
}

export function normalizeBulkActionStateMap(value: unknown): BulkActionStateMap {
  return normalizeActionStateMap(value);
}

export function normalizeActionStateRecord<T extends Record<string, unknown>>(value: T | null | undefined): (T & ActionStateRecord) | null {
  if (!isObjectRecord(value)) {
    return null;
  }
  const stateMap = normalizeActionStateMap(value['_action_state']);
  if (Object.keys(stateMap).length === 0) {
    return { ...value };
  }
  return {
    ...value,
    _action_state: stateMap,
  };
}

export function normalizeActionStateMeta<T extends Record<string, unknown>>(value: T | null | undefined): T | null {
  if (!isObjectRecord(value)) {
    return null;
  }
  const bulkActionState = normalizeBulkActionStateMap(value.bulk_action_state);
  if (Object.keys(bulkActionState).length === 0) {
    return { ...value };
  }
  return {
    ...value,
    bulk_action_state: bulkActionState,
  } as T;
}

export function normalizeListActionStatePayload<T extends Record<string, unknown>>(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!isObjectRecord(payload)) {
    return null;
  }
  const recordsSource = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.records)
      ? payload.records
      : null;
  const normalizedRecords = recordsSource
    ? recordsSource.map((record) => normalizeActionStateRecord(record as Record<string, unknown>) ?? record)
    : recordsSource;
  const normalizedMeta = normalizeActionStateMeta(payload.$meta as Record<string, unknown> | undefined);

  const out: Record<string, unknown> = { ...payload };
  if (normalizedRecords) {
    if (Array.isArray(payload.data)) {
      out.data = normalizedRecords;
    }
    if (Array.isArray(payload.records)) {
      out.records = normalizedRecords;
    }
  }
  if (normalizedMeta) {
    out.$meta = normalizedMeta;
  }
  return out;
}

export function normalizeDetailActionStatePayload<T extends Record<string, unknown>>(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!isObjectRecord(payload)) {
    return null;
  }
  if (!isObjectRecord(payload.data)) {
    return { ...payload };
  }
  return {
    ...payload,
    data: normalizeActionStateRecord(payload.data),
  };
}

export function resolveActionState(
  record: Record<string, unknown>,
  actionName: string,
): ActionState | null {
  const normalizedName = trimText(actionName);
  if (!normalizedName) {
    return null;
  }
  const stateMap = normalizeActionStateMap(record['_action_state']);
  return stateMap[normalizedName] || null;
}
