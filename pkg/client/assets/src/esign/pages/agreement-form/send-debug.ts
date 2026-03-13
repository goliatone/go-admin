export const ESIGN_SEND_LOG_PREFIX = '[esign-send]';

export interface SendDebugOwnershipState {
  isOwner?: boolean;
  claim?: {
    tabId?: string;
    claimedAt?: string;
    lastSeenAt?: string;
  } | null;
  blockedReason?: string;
}

export interface SendDebugWizardState {
  wizardId?: string | null;
  serverDraftId?: string | null;
  serverRevision?: number | string | null;
  currentStep?: number | string | null;
  syncPending?: boolean;
}

export interface SendDebugFieldOptions {
  state?: SendDebugWizardState | null;
  storageKey?: string;
  ownership?: SendDebugOwnershipState | null;
  sendAttemptId?: string | null;
  extra?: Record<string, unknown>;
}

function cleanString(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

function cleanNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createSendAttemptId(): string {
  return `send_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildSendDebugFields(options: SendDebugFieldOptions = {}): Record<string, unknown> {
  const {
    state,
    storageKey,
    ownership,
    sendAttemptId,
    extra = {},
  } = options;

  return {
    wizardId: cleanString(state?.wizardId),
    serverDraftId: cleanString(state?.serverDraftId),
    serverRevision: cleanNumber(state?.serverRevision),
    currentStep: cleanNumber(state?.currentStep),
    syncPending: state?.syncPending === true,
    storageKey: cleanString(storageKey),
    activeTabOwner: typeof ownership?.isOwner === 'boolean' ? ownership.isOwner : null,
    activeTabClaimTabId: cleanString(ownership?.claim?.tabId),
    activeTabClaimedAt: cleanString(ownership?.claim?.claimedAt),
    activeTabLastSeenAt: cleanString(ownership?.claim?.lastSeenAt),
    activeTabBlockedReason: cleanString(ownership?.blockedReason),
    sendAttemptId: cleanString(sendAttemptId),
    ...extra,
  };
}

export function logSendInfo(phase: string, fields: Record<string, unknown> = {}): void {
  console.info(ESIGN_SEND_LOG_PREFIX, phase, fields);
}

export function logSendWarn(phase: string, fields: Record<string, unknown> = {}): void {
  console.warn(ESIGN_SEND_LOG_PREFIX, phase, fields);
}
