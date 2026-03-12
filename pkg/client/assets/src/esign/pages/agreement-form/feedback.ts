// @ts-nocheck

export function createAgreementFeedbackController(options = {}) {
  const {
    agreementRefs,
    formAnnouncements,
    stateManager,
  } = options;

  let currentSyncStatus = 'saved';

  function formatRelativeTime(isoString) {
    if (!isoString) return 'unknown';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  function restoreSyncStatusFromState() {
    const state = stateManager.getState();
    if (currentSyncStatus !== 'paused') {
      return;
    }
    updateSyncStatus(state?.syncPending ? 'pending' : 'saved');
  }

  function updateSyncStatus(status) {
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

  function showSyncConflictDialog(serverRevision) {
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

  function mapUserFacingError(message, code = '', status = 0) {
    const normalizedCode = String(code || '').trim().toUpperCase();
    const normalizedMessage = String(message || '').trim().toLowerCase();
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

  async function parseAPIError(response, fallbackMessage) {
    const status = Number(response?.status || 0);
    let code = '';
    let message = '';
    let details = {};
    try {
      const payload = await response.json();
      code = String(payload?.error?.code || payload?.code || '').trim();
      message = String(payload?.error?.message || payload?.message || '').trim();
      details = (payload?.error?.details && typeof payload.error.details === 'object') ? payload.error.details : {};
      const entity = String(details?.entity || '').trim().toLowerCase();
      if (entity === 'drafts' && String(code).trim().toUpperCase() === 'NOT_FOUND') {
        code = 'DRAFT_SEND_NOT_FOUND';
        if (message === '') {
          message = 'Draft not found';
        }
      }
    } catch (_) {
      message = '';
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

  function announceError(message, code = '', status = 0) {
    const userMessage = mapUserFacingError(message, code, status);
    if (formAnnouncements) {
      formAnnouncements.textContent = userMessage;
    }
    if (window.toastManager) {
      window.toastManager.error(userMessage);
    } else {
      alert(userMessage);
    }
  }

  async function surfaceSyncOutcome(resultPromise, options = {}) {
    const result = await resultPromise;
    if (result?.blocked && result.reason === 'passive_tab') {
      announceError(
        'This agreement is active in another tab. Take control in this tab before saving or sending.',
        'ACTIVE_TAB_OWNERSHIP_REQUIRED',
      );
      return result;
    }
    if (result?.error && String(options.errorMessage || '').trim() !== '') {
      announceError(options.errorMessage);
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
