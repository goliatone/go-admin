import type { AgreementFormRefs } from './refs';
import { formatRelativeTimeVerbosePast } from '../../../shared/time-formatters.js';
import { readHTTPStructuredErrorResult } from '../../../shared/transport/http-client.js';

interface FeedbackStateShape {
  updatedAt?: string;
  syncPending?: boolean;
}

interface FeedbackStateManager {
  getState(): FeedbackStateShape;
}

export interface AgreementFeedbackAPIError {
  status: number;
  code: string;
  details: Record<string, unknown>;
  message: string;
}

interface FeedbackSyncOutcome {
  blocked?: boolean;
  reason?: string;
  error?: unknown;
  [key: string]: unknown;
}

interface SurfaceSyncOutcomeOptions {
  errorMessage?: string;
}

interface AgreementFeedbackControllerOptions {
  agreementRefs: AgreementFormRefs;
  formAnnouncements?: HTMLElement | null;
  stateManager: FeedbackStateManager;
}

export interface AgreementFeedbackController {
  announceError(message: string, code?: string, status?: number): void;
  formatRelativeTime(isoString?: string | null): string;
  mapUserFacingError(message: string, code?: string, status?: number): string;
  parseAPIError(response: Response, fallbackMessage?: string): Promise<AgreementFeedbackAPIError>;
  restoreSyncStatusFromState(): void;
  showSyncConflictDialog(serverRevision?: number | string): void;
  surfaceSyncOutcome(
    resultPromise: Promise<FeedbackSyncOutcome> | FeedbackSyncOutcome,
    options?: SurfaceSyncOutcomeOptions,
  ): Promise<FeedbackSyncOutcome>;
  updateSyncStatus(status?: string): void;
}

export function createAgreementFeedbackController(
  options: AgreementFeedbackControllerOptions,
): AgreementFeedbackController {
  const {
    agreementRefs,
    formAnnouncements,
    stateManager,
  } = options;

  let currentSyncStatus = 'saved';

  function formatRelativeTime(isoString?: string | null): string {
    return formatRelativeTimeVerbosePast(isoString, {
      emptyFallback: 'unknown',
      invalidFallback: 'Invalid Date',
    });
  }

  function restoreSyncStatusFromState(): void {
    const state = stateManager.getState();
    if (currentSyncStatus !== 'paused') {
      return;
    }
    updateSyncStatus(state?.syncPending ? 'pending' : 'saved');
  }

  function updateSyncStatus(status?: string): void {
    currentSyncStatus = String(status || '').trim() || 'saved';
    const indicator = agreementRefs.sync.indicator;
    const icon = agreementRefs.sync.icon;
    const text = agreementRefs.sync.text;
    const retryBtn = agreementRefs.sync.retryBtn;

    if (!indicator || !icon || !text) return;

    indicator.classList.remove('hidden');

    switch (status) {
      case 'saved':
        icon.className = 'w-2 h-2 rounded-full bg-green-500';
        text.textContent = 'Saved';
        text.className = 'text-gray-600';
        retryBtn?.classList.add('hidden');
        break;
      case 'saving':
        icon.className = 'w-2 h-2 rounded-full bg-blue-500 animate-pulse';
        text.textContent = 'Saving...';
        text.className = 'text-gray-600';
        retryBtn?.classList.add('hidden');
        break;
      case 'pending':
        icon.className = 'w-2 h-2 rounded-full bg-gray-400';
        text.textContent = 'Unsaved changes';
        text.className = 'text-gray-500';
        retryBtn?.classList.add('hidden');
        break;
      case 'error':
        icon.className = 'w-2 h-2 rounded-full bg-amber-500';
        text.textContent = 'Not synced';
        text.className = 'text-amber-600';
        retryBtn?.classList.remove('hidden');
        break;
      case 'paused':
        icon.className = 'w-2 h-2 rounded-full bg-slate-400';
        text.textContent = 'Open in another tab';
        text.className = 'text-slate-600';
        retryBtn?.classList.add('hidden');
        break;
      case 'conflict':
        icon.className = 'w-2 h-2 rounded-full bg-red-500';
        text.textContent = 'Conflict';
        text.className = 'text-red-600';
        retryBtn?.classList.add('hidden');
        break;
      default:
        indicator.classList.add('hidden');
    }
  }

  function showSyncConflictDialog(serverRevision?: number | string): void {
    const state = stateManager.getState();
    if (agreementRefs.conflict.localTime) {
      agreementRefs.conflict.localTime.textContent = formatRelativeTime(state.updatedAt);
    }
    if (agreementRefs.conflict.serverRevision) {
      agreementRefs.conflict.serverRevision.textContent = String(serverRevision || 0);
    }
    if (agreementRefs.conflict.serverTime) {
      agreementRefs.conflict.serverTime.textContent = 'newer version';
    }
    agreementRefs.conflict.modal?.classList.remove('hidden');
  }

  function mapUserFacingError(message: string, code = '', status = 0): string {
    const normalizedCode = String(code || '').trim().toUpperCase();
    const normalizedMessage = String(message || '').trim().toLowerCase();
    if (normalizedCode === 'STALE_REVISION') {
      return 'A newer version of this draft exists. Reload the latest draft or force your changes.';
    }
    if (normalizedCode === 'DRAFT_SEND_NOT_FOUND' || normalizedCode === 'DRAFT_SESSION_STALE') {
      return 'Your saved draft session was replaced or expired. Please review and click Send again.';
    }
    if (normalizedCode === 'ACTIVE_TAB_OWNERSHIP_REQUIRED') {
      return 'This agreement is active in another tab. Take control in this tab before saving or sending.';
    }
    if (normalizedCode === 'SCOPE_DENIED' || normalizedMessage.includes('scope denied')) {
      return "You don't have access to this organization's resources.";
    }
    if (
      normalizedCode === 'TRANSPORT_SECURITY' ||
      normalizedCode === 'TRANSPORT_SECURITY_REQUIRED' ||
      normalizedMessage.includes('tls transport required') ||
      Number(status) === 426
    ) {
      return 'This action requires a secure connection. Please access the app using HTTPS.';
    }
    if (
      normalizedCode === 'PDF_UNSUPPORTED' ||
      normalizedMessage === 'pdf compatibility unsupported'
    ) {
      return 'This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF.';
    }
    if (String(message || '').trim() !== '') {
      return String(message).trim();
    }
    return 'Something went wrong. Please try again.';
  }

  async function parseAPIError(response: Response, fallbackMessage = ''): Promise<AgreementFeedbackAPIError> {
    const status = Number(response?.status || 0);
    const parsed = await readHTTPStructuredErrorResult(
      response,
      fallbackMessage || `Request failed (${status || 'unknown'})`,
      { appendStatusToFallback: false },
    );
    let code = parsed.code;
    let message = parsed.message;
    const details = parsed.details;
    const entity = String(details?.entity || '').trim().toLowerCase();
    if (entity === 'drafts' && String(code).trim().toUpperCase() === 'NOT_FOUND') {
      code = 'DRAFT_SEND_NOT_FOUND';
      if (message === '') {
        message = 'Draft not found';
      }
    }
    if (message === '') {
      message = fallbackMessage || `Request failed (${status || 'unknown'})`;
    }
    return {
      status,
      code,
      details,
      message: mapUserFacingError(message, code, status),
    };
  }

  function announceError(message: string, code = '', status = 0): void {
    const userMessage = mapUserFacingError(message, code, status);
    if (formAnnouncements) {
      formAnnouncements.textContent = userMessage;
    }
    if (window.toastManager?.error) {
      window.toastManager.error(userMessage);
    } else {
      alert(userMessage);
    }
  }

  async function surfaceSyncOutcome(
    resultPromise: Promise<FeedbackSyncOutcome> | FeedbackSyncOutcome,
    options: SurfaceSyncOutcomeOptions = {},
  ): Promise<FeedbackSyncOutcome> {
    const result = await resultPromise;
    if (result?.blocked && result.reason === 'passive_tab') {
      announceError(
        'This agreement is active in another tab. Take control in this tab before saving or sending.',
        'ACTIVE_TAB_OWNERSHIP_REQUIRED',
      );
      return result;
    }
    if (result?.error && String(options.errorMessage || '').trim() !== '') {
      announceError(options.errorMessage || '');
    }
    return result;
  }

  return {
    announceError,
    formatRelativeTime,
    mapUserFacingError,
    parseAPIError,
    restoreSyncStatusFromState,
    showSyncConflictDialog,
    surfaceSyncOutcome,
    updateSyncStatus,
  };
}
