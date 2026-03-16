export type TranslationProfile =
  | "none"
  | "core"
  | "core+exchange"
  | "core+queue"
  | "full";

export type TranslationCapabilityMode = TranslationProfile;

export type TranslationModuleKey = "exchange" | "queue";

export type DisabledReasonCode =
  | "TRANSLATION_MISSING"
  | "INVALID_STATUS"
  | "PERMISSION_DENIED"
  | "MISSING_CONTEXT"
  | "FEATURE_DISABLED"
  | "RESOURCE_IN_USE"
  | "PRECONDITION_FAILED"
  | "INVALID_SELECTION"
  | "RATE_LIMITED"
  | "TEMPORARILY_UNAVAILABLE";

export interface TranslationActionState {
  enabled: boolean;
  reason?: string;
  reason_code?: string;
  severity?: string;
  kind?: string;
  permission?: string;
  metadata?: Record<string, unknown>;
  remediation?: {
    label?: string;
    href?: string;
    kind?: string;
  };
}

export interface TranslationModuleState {
  enabled: boolean;
  visible: boolean;
  entry: TranslationActionState;
  actions: Record<string, TranslationActionState>;
}

export interface TranslationCapabilities {
  profile: TranslationProfile;
  capability_mode: TranslationCapabilityMode;
  supported_profiles: TranslationProfile[];
  schema_version: number;
  modules: {
    exchange: TranslationModuleState;
    queue: TranslationModuleState;
  };
  features: {
    cms: boolean;
    dashboard: boolean;
  };
  routes: Record<string, string>;
  panels: string[];
  resolver_keys: string[];
  warnings: string[];
  contracts?: Record<string, unknown>;
}

export interface TranslationSuccessEnvelope<T> {
  data: T;
  meta: Record<string, unknown>;
}

export interface TranslationErrorEnvelope {
  error: {
    code?: string;
    text_code?: string;
    message: string;
    details?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    validation_errors?: Array<Record<string, unknown>>;
    request_id?: string;
  };
}

export interface TranslationEntrypoint {
  id: string;
  label: string;
  icon: string;
  href: string;
  module: "exchange" | "queue" | "core";
  enabled: boolean;
  description?: string;
  disabledReason?: string;
  disabledReasonCode?: string;
  permission?: string;
  badge?: string;
  badgeVariant?: "info" | "warning" | "success" | "danger";
}

export interface TranslationOpenAPIArtifact {
  schema_version: number;
  artifact_path: string;
  artifact_bytes: number;
}

export type TranslationExchangeJobKind =
  | "export"
  | "import_validate"
  | "import_apply";
export type TranslationExchangeJobStatus = "running" | "completed" | "failed";
export type TranslationExchangeUploadState =
  | "idle"
  | "selected"
  | "uploading"
  | "validated"
  | "error";
export type TranslationExchangeConflictType =
  | "missing_linkage"
  | "duplicate_row"
  | "stale_source_hash";

export interface TranslationExchangeJobProgress {
  total?: number;
  processed: number;
  succeeded: number;
  failed: number;
  conflicts?: number;
  skipped?: number;
}

export interface TranslationExchangeValidationSummary {
  processed: number;
  succeeded: number;
  failed: number;
  conflicts?: number;
  skipped?: number;
  partial_success?: boolean;
  by_status?: Record<string, number>;
  by_conflict?: Record<string, number>;
}

export interface TranslationExchangeConflictRow {
  index: number;
  resource: string;
  entity_id: string;
  translation_group_id: string;
  target_locale: string;
  field_path: string;
  status: "success" | "error" | "conflict" | "skipped";
  error?: string;
  conflict?: {
    type: TranslationExchangeConflictType;
    message?: string;
    current_source_hash?: string;
    provided_source_hash?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface TranslationExchangeJob {
  id: string;
  kind: TranslationExchangeJobKind;
  status: TranslationExchangeJobStatus;
  poll_endpoint: string;
  progress: TranslationExchangeJobProgress;
  request?: Record<string, unknown>;
  result?: Record<string, unknown>;
  request_id?: string;
  trace_id?: string;
  error?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TranslationExchangeValidationResult {
  summary: TranslationExchangeValidationSummary;
  results: TranslationExchangeConflictRow[];
  total_rows?: number;
  conflicts?: {
    total: number;
    by_type: Record<string, number>;
    rows?: Array<Record<string, unknown>>;
  };
  job?: TranslationExchangeJob;
}

export interface TranslationExchangeUploadDescriptor {
  state: TranslationExchangeUploadState;
  filename?: string;
  format?: "csv" | "json";
  row_count?: number;
  message?: string;
}

export const EMPTY_TRANSLATION_CAPABILITIES: TranslationCapabilities = {
  profile: "none",
  capability_mode: "none",
  supported_profiles: ["none", "core", "core+exchange", "core+queue", "full"],
  schema_version: 1,
  modules: {
    exchange: {
      enabled: false,
      visible: false,
      entry: { enabled: false },
      actions: {},
    },
    queue: {
      enabled: false,
      visible: false,
      entry: { enabled: false },
      actions: {},
    },
  },
  features: {
    cms: false,
    dashboard: false,
  },
  routes: {},
  panels: [],
  resolver_keys: [],
  warnings: [],
};

const EXCHANGE_JOB_KINDS: TranslationExchangeJobKind[] = [
  "export",
  "import_validate",
  "import_apply",
];
const EXCHANGE_JOB_STATUSES: TranslationExchangeJobStatus[] = [
  "running",
  "completed",
  "failed",
];
const EXCHANGE_UPLOAD_STATES: TranslationExchangeUploadState[] = [
  "idle",
  "selected",
  "uploading",
  "validated",
  "error",
];
const EXCHANGE_CONFLICT_TYPES: TranslationExchangeConflictType[] = [
  "missing_linkage",
  "duplicate_row",
  "stale_source_hash",
];

export function normalizeTranslationProfile(
  value: unknown,
): TranslationProfile {
  if (typeof value !== "string") return "none";
  const normalized = value.toLowerCase().trim();
  const valid: TranslationProfile[] = [
    "none",
    "core",
    "core+exchange",
    "core+queue",
    "full",
  ];
  return valid.includes(normalized as TranslationProfile)
    ? (normalized as TranslationProfile)
    : "none";
}

export function normalizeTranslationActionState(
  value: unknown,
): TranslationActionState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  return {
    enabled: raw.enabled === true,
    reason: typeof raw.reason === "string" ? raw.reason : undefined,
    reason_code:
      typeof raw.reason_code === "string" ? raw.reason_code : undefined,
    permission: typeof raw.permission === "string" ? raw.permission : undefined,
  };
}

export function normalizeTranslationModuleState(
  value: unknown,
): TranslationModuleState {
  if (typeof value === "boolean") {
    return {
      enabled: value,
      visible: value,
      entry: { enabled: value },
      actions: {},
    };
  }
  if (!value || typeof value !== "object") {
    return {
      enabled: false,
      visible: false,
      entry: { enabled: false },
      actions: {},
    };
  }
  const obj = value as Record<string, unknown>;
  const enabled = obj.enabled === true;
  const entry = normalizeTranslationActionState(obj.entry);
  const visible =
    typeof obj.visible === "boolean"
      ? obj.visible
      : enabled && (entry ? entry.enabled : true);
  const actionsRaw =
    obj.actions && typeof obj.actions === "object"
      ? (obj.actions as Record<string, unknown>)
      : {};
  const actions: Record<string, TranslationActionState> = {};
  for (const [key, actionValue] of Object.entries(actionsRaw)) {
    const actionState = normalizeTranslationActionState(actionValue);
    if (actionState) actions[key] = actionState;
  }
  return {
    enabled,
    visible,
    entry: entry ?? { enabled },
    actions,
  };
}

export function normalizeTranslationRoutes(
  value: unknown,
): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const raw = value as Record<string, unknown>;
  const routes: Record<string, string> = {};
  for (const [key, candidate] of Object.entries(raw)) {
    const route = typeof candidate === "string" ? candidate.trim() : "";
    if (!route) continue;
    routes[key] = route;
  }
  return routes;
}

export function normalizeTranslationCapabilities(
  raw: unknown,
): TranslationCapabilities {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_TRANSLATION_CAPABILITIES };
  }
  const data = raw as Record<string, unknown>;
  const modules =
    typeof data.modules === "object" && data.modules
      ? (data.modules as Record<string, unknown>)
      : {};
  const features =
    typeof data.features === "object" && data.features
      ? (data.features as Record<string, unknown>)
      : {};
  return {
    profile: normalizeTranslationProfile(data.profile ?? data.capability_mode),
    capability_mode: normalizeTranslationProfile(
      data.capability_mode ?? data.profile,
    ),
    supported_profiles: Array.isArray(data.supported_profiles)
      ? data.supported_profiles
          .map(normalizeTranslationProfile)
          .filter((value, index, values) => values.indexOf(value) === index)
      : [...EMPTY_TRANSLATION_CAPABILITIES.supported_profiles],
    schema_version:
      typeof data.schema_version === "number" ? data.schema_version : 1,
    modules: {
      exchange: normalizeTranslationModuleState(modules.exchange),
      queue: normalizeTranslationModuleState(modules.queue),
    },
    features: {
      cms: typeof features.cms === "boolean" ? features.cms : false,
      dashboard:
        typeof features.dashboard === "boolean" ? features.dashboard : false,
    },
    routes: normalizeTranslationRoutes(data.routes),
    panels: Array.isArray(data.panels)
      ? data.panels.filter((p) => typeof p === "string")
      : [],
    resolver_keys: Array.isArray(data.resolver_keys)
      ? data.resolver_keys.filter((k) => typeof k === "string")
      : [],
    warnings: Array.isArray(data.warnings)
      ? data.warnings.filter((w) => typeof w === "string")
      : [],
    contracts:
      typeof data.contracts === "object" && data.contracts
        ? (data.contracts as Record<string, unknown>)
        : undefined,
  };
}

export function normalizeTranslationExchangeJob(
  raw: unknown,
): TranslationExchangeJob | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const kind =
    typeof obj.kind === "string" &&
    EXCHANGE_JOB_KINDS.includes(obj.kind as TranslationExchangeJobKind)
      ? (obj.kind as TranslationExchangeJobKind)
      : "export";
  const status =
    typeof obj.status === "string" &&
    EXCHANGE_JOB_STATUSES.includes(obj.status as TranslationExchangeJobStatus)
      ? (obj.status as TranslationExchangeJobStatus)
      : "failed";
  const progressRaw =
    obj.progress && typeof obj.progress === "object"
      ? (obj.progress as Record<string, unknown>)
      : {};
  return {
    id: typeof obj.id === "string" ? obj.id : "",
    kind,
    status,
    poll_endpoint:
      typeof obj.poll_endpoint === "string" ? obj.poll_endpoint : "",
    progress: {
      total:
        typeof progressRaw.total === "number" ? progressRaw.total : undefined,
      processed:
        typeof progressRaw.processed === "number" ? progressRaw.processed : 0,
      succeeded:
        typeof progressRaw.succeeded === "number" ? progressRaw.succeeded : 0,
      failed: typeof progressRaw.failed === "number" ? progressRaw.failed : 0,
      conflicts:
        typeof progressRaw.conflicts === "number"
          ? progressRaw.conflicts
          : undefined,
      skipped:
        typeof progressRaw.skipped === "number"
          ? progressRaw.skipped
          : undefined,
    },
    request:
      typeof obj.request === "object" && obj.request
        ? (obj.request as Record<string, unknown>)
        : undefined,
    result:
      typeof obj.result === "object" && obj.result
        ? (obj.result as Record<string, unknown>)
        : undefined,
    request_id: typeof obj.request_id === "string" ? obj.request_id : undefined,
    trace_id: typeof obj.trace_id === "string" ? obj.trace_id : undefined,
    error: typeof obj.error === "string" ? obj.error : undefined,
    created_at: typeof obj.created_at === "string" ? obj.created_at : undefined,
    updated_at: typeof obj.updated_at === "string" ? obj.updated_at : undefined,
  };
}

export function normalizeTranslationExchangeValidationResult(
  raw: unknown,
): TranslationExchangeValidationResult {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const summaryRaw =
    obj.summary && typeof obj.summary === "object"
      ? (obj.summary as Record<string, unknown>)
      : {};
  const resultsRaw = Array.isArray(obj.results) ? obj.results : [];
  return {
    summary: {
      processed:
        typeof summaryRaw.processed === "number" ? summaryRaw.processed : 0,
      succeeded:
        typeof summaryRaw.succeeded === "number" ? summaryRaw.succeeded : 0,
      failed: typeof summaryRaw.failed === "number" ? summaryRaw.failed : 0,
      conflicts:
        typeof summaryRaw.conflicts === "number"
          ? summaryRaw.conflicts
          : undefined,
      skipped:
        typeof summaryRaw.skipped === "number" ? summaryRaw.skipped : undefined,
      partial_success: summaryRaw.partial_success === true,
      by_status:
        typeof summaryRaw.by_status === "object" && summaryRaw.by_status
          ? (summaryRaw.by_status as Record<string, number>)
          : undefined,
      by_conflict:
        typeof summaryRaw.by_conflict === "object" && summaryRaw.by_conflict
          ? (summaryRaw.by_conflict as Record<string, number>)
          : undefined,
    },
    results: resultsRaw.map((entry) => {
      const row =
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : {};
      const conflictRaw =
        row.conflict && typeof row.conflict === "object"
          ? (row.conflict as Record<string, unknown>)
          : undefined;
      const conflictType =
        conflictRaw &&
        typeof conflictRaw.type === "string" &&
        EXCHANGE_CONFLICT_TYPES.includes(
          conflictRaw.type as TranslationExchangeConflictType,
        )
          ? (conflictRaw.type as TranslationExchangeConflictType)
          : undefined;
      return {
        index: typeof row.index === "number" ? row.index : 0,
        resource: typeof row.resource === "string" ? row.resource : "",
        entity_id: typeof row.entity_id === "string" ? row.entity_id : "",
        translation_group_id:
          typeof row.translation_group_id === "string"
            ? row.translation_group_id
            : "",
        target_locale:
          typeof row.target_locale === "string" ? row.target_locale : "",
        field_path: typeof row.field_path === "string" ? row.field_path : "",
        status:
          row.status === "success" ||
          row.status === "error" ||
          row.status === "conflict" ||
          row.status === "skipped"
            ? row.status
            : "error",
        error: typeof row.error === "string" ? row.error : undefined,
        conflict: conflictType
          ? {
              type: conflictType,
              message:
                typeof conflictRaw?.message === "string"
                  ? conflictRaw.message
                  : undefined,
              current_source_hash:
                typeof conflictRaw?.current_source_hash === "string"
                  ? conflictRaw.current_source_hash
                  : undefined,
              provided_source_hash:
                typeof conflictRaw?.provided_source_hash === "string"
                  ? conflictRaw.provided_source_hash
                  : undefined,
            }
          : undefined,
        metadata:
          typeof row.metadata === "object" && row.metadata
            ? (row.metadata as Record<string, unknown>)
            : undefined,
      };
    }),
    total_rows: typeof obj.total_rows === "number" ? obj.total_rows : undefined,
    conflicts:
      typeof obj.conflicts === "object" && obj.conflicts
        ? (obj.conflicts as TranslationExchangeValidationResult["conflicts"])
        : undefined,
    job: normalizeTranslationExchangeJob(obj.job) ?? undefined,
  };
}

export function normalizeTranslationExchangeUploadDescriptor(
  raw: unknown,
): TranslationExchangeUploadDescriptor {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const state =
    typeof obj.state === "string" &&
    EXCHANGE_UPLOAD_STATES.includes(obj.state as TranslationExchangeUploadState)
      ? (obj.state as TranslationExchangeUploadState)
      : "idle";
  const format =
    obj.format === "csv" || obj.format === "json" ? obj.format : undefined;
  return {
    state,
    filename: typeof obj.filename === "string" ? obj.filename : undefined,
    format,
    row_count: typeof obj.row_count === "number" ? obj.row_count : undefined,
    message: typeof obj.message === "string" ? obj.message : undefined,
  };
}
