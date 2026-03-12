import type { NormalizedAgreementFormConfig } from './context';

export interface AgreementFormRuntimeInputConfig {
  base_path?: string;
  api_base_path?: string;
  user_id?: string;
  is_edit?: boolean;
  create_success?: boolean;
  submit_mode?: string;
  routes?: {
    index?: string;
    documents?: string;
    create?: string;
    documents_upload_url?: string;
  };
  initial_participants?: Array<Record<string, unknown>>;
  initial_field_instances?: Array<Record<string, unknown>>;
}

export interface AgreementTitleSourceShape {
  USER: string;
  AUTOFILL: string;
  SERVER_SEED: string;
}

export interface AgreementProgressState {
  currentStep?: number | string;
  document?: { id?: unknown } | null;
  details?: { title?: unknown; message?: unknown } | null;
  titleSource?: unknown;
  participants?: unknown[];
  fieldDefinitions?: unknown[];
  fieldPlacements?: unknown[];
  fieldRules?: unknown[];
}

interface ParticipantProgressShape {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  signingStage?: unknown;
  signing_stage?: unknown;
  notify?: unknown;
}

export interface AgreementProgressOptions {
  normalizeTitleSource?: (value: unknown, fallback?: string) => string;
  titleSource?: AgreementTitleSourceShape;
}

export interface AgreementFormConfigNormalizationResult {
  config: AgreementFormRuntimeInputConfig;
  normalizedConfig: NormalizedAgreementFormConfig;
  basePath: string;
  apiBase: string;
  apiVersionBase: string;
  draftsEndpoint: string;
  isEditMode: boolean;
  createSuccess: boolean;
  currentUserID: string;
  submitMode: string;
  documentsUploadURL: string;
  initialParticipants: Array<Record<string, unknown>>;
  initialFieldInstances: Array<Record<string, unknown>>;
}

export interface DraftRequestHelpers {
  draftEndpointWithUserID(url: string): string;
  draftRequestHeaders(includeContentType?: boolean): Record<string, string>;
}

export interface AgreementWizardPersistenceSettings {
  WIZARD_STATE_VERSION: number;
  WIZARD_STORAGE_KEY: string;
  WIZARD_CHANNEL_NAME: string;
  LEGACY_WIZARD_STORAGE_KEY: string;
  SYNC_DEBOUNCE_MS: number;
  SYNC_RETRY_DELAYS: number[];
  WIZARD_STORAGE_MIGRATION_VERSION: number;
  ACTIVE_TAB_STORAGE_KEY: string;
  ACTIVE_TAB_HEARTBEAT_MS: number;
  ACTIVE_TAB_STALE_MS: number;
  TITLE_SOURCE: typeof AGREEMENT_TITLE_SOURCE;
}

export const AGREEMENT_TITLE_SOURCE = {
  USER: 'user',
  AUTOFILL: 'autofill',
  SERVER_SEED: 'server_seed',
} as const;

export function normalizeAgreementTitleSource(
  value: unknown,
  fallback: string = AGREEMENT_TITLE_SOURCE.AUTOFILL,
): string {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === AGREEMENT_TITLE_SOURCE.USER) return AGREEMENT_TITLE_SOURCE.USER;
  if (normalized === AGREEMENT_TITLE_SOURCE.SERVER_SEED) return AGREEMENT_TITLE_SOURCE.SERVER_SEED;
  if (normalized === AGREEMENT_TITLE_SOURCE.AUTOFILL) return AGREEMENT_TITLE_SOURCE.AUTOFILL;
  return fallback;
}

export function hasMeaningfulParticipantProgress(participant: unknown, index = 0): boolean {
  if (!participant || typeof participant !== 'object') return false;
  const candidate = participant as ParticipantProgressShape;

  const name = String(candidate.name ?? '').trim();
  const email = String(candidate.email ?? '').trim();
  const role = String(candidate.role ?? 'signer').trim().toLowerCase();
  const signingStage = Number.parseInt(String(candidate.signingStage ?? candidate.signing_stage ?? 1), 10);
  const notify = candidate.notify !== false;

  if (name !== '' || email !== '') return true;
  if (role !== '' && role !== 'signer') return true;
  if (Number.isFinite(signingStage) && signingStage > 1) return true;
  if (!notify) return true;
  return index > 0;
}

export function hasMeaningfulWizardProgress(
  state: AgreementProgressState | null | undefined,
  options: AgreementProgressOptions = {},
): boolean {
  const {
    normalizeTitleSource = normalizeAgreementTitleSource,
    titleSource = AGREEMENT_TITLE_SOURCE,
  } = options;

  if (!state || typeof state !== 'object') return false;

  const currentStep = Number.parseInt(String(state.currentStep ?? 1), 10);
  if (Number.isFinite(currentStep) && currentStep > 1) return true;

  const documentID = String(state.document?.id ?? '').trim();
  if (documentID !== '') return true;

  const title = String(state.details?.title ?? '').trim();
  const message = String(state.details?.message ?? '').trim();
  const resolvedTitleSource = normalizeTitleSource(
    state.titleSource,
    title === '' ? titleSource.AUTOFILL : titleSource.USER,
  );
  const meaningfulTitle = title !== '' && resolvedTitleSource !== titleSource.SERVER_SEED;
  if (meaningfulTitle || message !== '') return true;

  const participants = Array.isArray(state.participants) ? state.participants : [];
  if (participants.some((participant, index) => hasMeaningfulParticipantProgress(participant, index))) return true;

  if (Array.isArray(state.fieldDefinitions) && state.fieldDefinitions.length > 0) return true;
  if (Array.isArray(state.fieldPlacements) && state.fieldPlacements.length > 0) return true;
  if (Array.isArray(state.fieldRules) && state.fieldRules.length > 0) return true;

  return false;
}

export function normalizeAgreementFormConfig(
  inputConfig: AgreementFormRuntimeInputConfig = {},
): AgreementFormConfigNormalizationResult {
  const config = inputConfig || {};
  const basePath = String(config.base_path || '').trim();
  const apiBase = String(config.api_base_path || '').trim() || `${basePath}/api`;
  const normalizedAPIBase = apiBase.replace(/\/+$/, '');
  const apiVersionBase = /\/v\d+$/i.test(normalizedAPIBase) ? normalizedAPIBase : `${normalizedAPIBase}/v1`;
  const draftsEndpoint = `${apiVersionBase}/esign/drafts`;
  const isEditMode = Boolean(config.is_edit);
  const createSuccess = Boolean(config.create_success);
  const currentUserID = String(config.user_id || '').trim();
  const submitMode = String(config.submit_mode || 'json').trim().toLowerCase();
  const documentsUploadURL = String(config.routes?.documents_upload_url || '').trim() || `${basePath}/content/esign_documents/new`;
  const initialParticipants = Array.isArray(config.initial_participants) ? config.initial_participants : [];
  const initialFieldInstances = Array.isArray(config.initial_field_instances) ? config.initial_field_instances : [];

  const normalizedConfig: NormalizedAgreementFormConfig = {
    base_path: basePath,
    api_base_path: apiBase,
    user_id: currentUserID,
    is_edit: isEditMode,
    create_success: createSuccess,
    submit_mode: submitMode,
    routes: {
      index: String(config.routes?.index || '').trim(),
      documents: String(config.routes?.documents || '').trim(),
      create: String(config.routes?.create || '').trim(),
      documents_upload_url: documentsUploadURL,
    },
    initial_participants: initialParticipants,
    initial_field_instances: initialFieldInstances,
  };

  return {
    config,
    normalizedConfig,
    basePath,
    apiBase,
    apiVersionBase,
    draftsEndpoint,
    isEditMode,
    createSuccess,
    currentUserID,
    submitMode,
    documentsUploadURL,
    initialParticipants,
    initialFieldInstances,
  };
}

export function createDraftRequestHelpers(currentUserID: string): DraftRequestHelpers {
  function draftEndpointWithUserID(url: string): string {
    if (!currentUserID) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}user_id=${encodeURIComponent(currentUserID)}`;
  }

  function draftRequestHeaders(includeContentType = true): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (includeContentType) headers['Content-Type'] = 'application/json';
    if (currentUserID) headers['X-User-ID'] = currentUserID;
    return headers;
  }

  return {
    draftEndpointWithUserID,
    draftRequestHeaders,
  };
}

export function createAgreementWizardPersistenceSettings(options: {
  config?: AgreementFormRuntimeInputConfig;
  currentUserID?: string;
  isEditMode?: boolean;
} = {}): AgreementWizardPersistenceSettings {
  const {
    config = {},
    currentUserID = '',
    isEditMode = false,
  } = options;

  const wizardModeToken = isEditMode ? 'edit' : 'create';
  const wizardRouteToken = String(
    config.routes?.create
      || config.routes?.index
      || (typeof window !== 'undefined' ? window.location.pathname : '')
      || 'agreement-form',
  ).trim().toLowerCase();
  const wizardScopeToken = [
    wizardModeToken,
    currentUserID || 'anonymous',
    wizardRouteToken || 'agreement-form',
  ].join('|');

  return {
    WIZARD_STATE_VERSION: 1,
    WIZARD_STORAGE_KEY: `esign_wizard_state_v1:${encodeURIComponent(wizardScopeToken)}`,
    WIZARD_CHANNEL_NAME: `esign_wizard_sync:${encodeURIComponent(wizardScopeToken)}`,
    LEGACY_WIZARD_STORAGE_KEY: 'esign_wizard_state_v1',
    SYNC_DEBOUNCE_MS: 2000,
    SYNC_RETRY_DELAYS: [1000, 2000, 5000, 10000, 30000],
    WIZARD_STORAGE_MIGRATION_VERSION: 1,
    ACTIVE_TAB_STORAGE_KEY: `esign_wizard_active_tab_v1:${encodeURIComponent(wizardScopeToken)}`,
    ACTIVE_TAB_HEARTBEAT_MS: 5000,
    ACTIVE_TAB_STALE_MS: 20000,
    TITLE_SOURCE: AGREEMENT_TITLE_SOURCE,
  };
}
