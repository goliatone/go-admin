export type TranslationProfile =
  | 'none'
  | 'core'
  | 'core+exchange'
  | 'core+queue'
  | 'full';

export type TranslationCapabilityMode = TranslationProfile;

export type TranslationModuleKey = 'exchange' | 'queue';

export type DisabledReasonCode =
  | 'TRANSLATION_MISSING'
  | 'INVALID_STATUS'
  | 'PERMISSION_DENIED'
  | 'MISSING_CONTEXT'
  | 'FEATURE_DISABLED'
  | 'RESOURCE_IN_USE'
  | 'PRECONDITION_FAILED'
  | 'INVALID_SELECTION'
  | 'RATE_LIMITED'
  | 'TEMPORARILY_UNAVAILABLE';

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
  module: 'exchange' | 'queue' | 'core';
  enabled: boolean;
  description?: string;
  disabledReason?: string;
  disabledReasonCode?: string;
  permission?: string;
  badge?: string;
  badgeVariant?: 'info' | 'warning' | 'success' | 'danger';
}

export interface TranslationOpenAPIArtifact {
  schema_version: number;
  artifact_path: string;
  artifact_bytes: number;
}

export const EMPTY_TRANSLATION_CAPABILITIES: TranslationCapabilities = {
  profile: 'none',
  capability_mode: 'none',
  supported_profiles: ['none', 'core', 'core+exchange', 'core+queue', 'full'],
  schema_version: 1,
  modules: {
    exchange: { enabled: false, visible: false, entry: { enabled: false }, actions: {} },
    queue: { enabled: false, visible: false, entry: { enabled: false }, actions: {} },
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

export function normalizeTranslationProfile(value: unknown): TranslationProfile {
  if (typeof value !== 'string') return 'none';
  const normalized = value.toLowerCase().trim();
  const valid: TranslationProfile[] = ['none', 'core', 'core+exchange', 'core+queue', 'full'];
  return valid.includes(normalized as TranslationProfile)
    ? (normalized as TranslationProfile)
    : 'none';
}

export function normalizeTranslationActionState(value: unknown): TranslationActionState | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  return {
    enabled: raw.enabled === true,
    reason: typeof raw.reason === 'string' ? raw.reason : undefined,
    reason_code: typeof raw.reason_code === 'string' ? raw.reason_code : undefined,
    permission: typeof raw.permission === 'string' ? raw.permission : undefined,
  };
}

export function normalizeTranslationModuleState(value: unknown): TranslationModuleState {
  if (typeof value === 'boolean') {
    return {
      enabled: value,
      visible: value,
      entry: { enabled: value },
      actions: {},
    };
  }
  if (!value || typeof value !== 'object') {
    return { enabled: false, visible: false, entry: { enabled: false }, actions: {} };
  }
  const obj = value as Record<string, unknown>;
  const enabled = obj.enabled === true;
  const entry = normalizeTranslationActionState(obj.entry);
  const visible = typeof obj.visible === 'boolean'
    ? obj.visible
    : enabled && (entry ? entry.enabled : true);
  const actionsRaw = obj.actions && typeof obj.actions === 'object'
    ? obj.actions as Record<string, unknown>
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

export function normalizeTranslationRoutes(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const raw = value as Record<string, unknown>;
  const routes: Record<string, string> = {};
  for (const [key, candidate] of Object.entries(raw)) {
    const route = typeof candidate === 'string' ? candidate.trim() : '';
    if (!route) continue;
    routes[key] = route;
  }
  return routes;
}

export function normalizeTranslationCapabilities(raw: unknown): TranslationCapabilities {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_TRANSLATION_CAPABILITIES };
  }
  const data = raw as Record<string, unknown>;
  const modules = typeof data.modules === 'object' && data.modules
    ? data.modules as Record<string, unknown>
    : {};
  const features = typeof data.features === 'object' && data.features
    ? data.features as Record<string, unknown>
    : {};
  return {
    profile: normalizeTranslationProfile(data.profile ?? data.capability_mode),
    capability_mode: normalizeTranslationProfile(data.capability_mode ?? data.profile),
    supported_profiles: Array.isArray(data.supported_profiles)
      ? data.supported_profiles
          .map(normalizeTranslationProfile)
          .filter((value, index, values) => values.indexOf(value) === index)
      : [...EMPTY_TRANSLATION_CAPABILITIES.supported_profiles],
    schema_version: typeof data.schema_version === 'number' ? data.schema_version : 1,
    modules: {
      exchange: normalizeTranslationModuleState(modules.exchange),
      queue: normalizeTranslationModuleState(modules.queue),
    },
    features: {
      cms: typeof features.cms === 'boolean' ? features.cms : false,
      dashboard: typeof features.dashboard === 'boolean' ? features.dashboard : false,
    },
    routes: normalizeTranslationRoutes(data.routes),
    panels: Array.isArray(data.panels) ? data.panels.filter(p => typeof p === 'string') : [],
    resolver_keys: Array.isArray(data.resolver_keys)
      ? data.resolver_keys.filter(k => typeof k === 'string')
      : [],
    warnings: Array.isArray(data.warnings) ? data.warnings.filter(w => typeof w === 'string') : [],
    contracts: typeof data.contracts === 'object' && data.contracts ? data.contracts as Record<string, unknown> : undefined,
  };
}
