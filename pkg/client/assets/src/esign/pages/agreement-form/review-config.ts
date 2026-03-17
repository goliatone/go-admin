import type { ReviewConfigState, ReviewParticipantState } from './contracts';
import type { SignerParticipantSummary } from './participants';

interface ReviewConfigControllerOptions {
  getSignerParticipants(): SignerParticipantSummary[];
  setPrimaryActionLabel(label: string): void;
  onChanged?(): void;
}

export interface ReviewConfigController {
  bindEvents(): void;
  collectReviewConfigForState(): ReviewConfigState;
  restoreFromState(state: { review?: Partial<ReviewConfigState> | null } | null | undefined): void;
  refreshRecipientReviewers(): void;
  isStartReviewEnabled(): boolean;
}

function boolAttr(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeReviewState(state: Partial<ReviewConfigState> | null | undefined): ReviewConfigState {
  const participants = Array.isArray(state?.participants) ? state?.participants : [];
  return {
    enabled: Boolean(state?.enabled),
    gate: String(state?.gate || 'approve_before_send').trim() || 'approve_before_send',
    commentsEnabled: Boolean(state?.commentsEnabled),
    participants: participants.map((participant) => ({
      participantType: String(participant?.participantType || '').trim() || 'recipient',
      participantTempId: String(participant?.participantTempId || '').trim() || undefined,
      recipientTempId: String(participant?.recipientTempId || '').trim() || undefined,
      recipientId: String(participant?.recipientId || '').trim() || undefined,
      email: String(participant?.email || '').trim() || undefined,
      displayName: String(participant?.displayName || '').trim() || undefined,
      canComment: boolAttr(participant?.canComment, true),
      canApprove: boolAttr(participant?.canApprove, true),
    })),
  };
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function createReviewConfigController(
  options: ReviewConfigControllerOptions,
): ReviewConfigController {
  const {
    getSignerParticipants,
    setPrimaryActionLabel,
    onChanged,
  } = options;

  const modeSendInput = document.getElementById('agreement-review-mode-send');
  const modeStartInput = document.getElementById('agreement-review-mode-start');
  const reviewConfigPanel = document.getElementById('agreement-start-review-config');
  const reviewGateSelect = document.getElementById('agreement-review-gate');
  const reviewCommentsEnabledInput = document.getElementById('agreement-review-comments-enabled');
  const recipientReviewersContainer = document.getElementById('agreement-review-recipient-reviewers');
  const externalReviewersContainer = document.getElementById('agreement-review-external-reviewers');
  const externalReviewersEmpty = document.getElementById('agreement-review-external-reviewers-empty');
  const externalReviewerTemplate = document.getElementById('agreement-review-external-reviewer-template');
  const addExternalReviewerBtn = document.getElementById('agreement-add-external-reviewer-btn');

  function isStartReviewEnabled(): boolean {
    return modeStartInput instanceof HTMLInputElement ? modeStartInput.checked : false;
  }

  function syncPrimaryActionLabel(): void {
    setPrimaryActionLabel(isStartReviewEnabled() ? 'Start Review' : 'Send for Signature');
  }

  function syncExternalReviewersEmptyState(): void {
    const hasRows = Boolean(externalReviewersContainer?.querySelector('[data-review-external-row]'));
    externalReviewersEmpty?.classList.toggle('hidden', hasRows);
  }

  function syncReviewModeUI(): void {
    reviewConfigPanel?.classList.toggle('hidden', !isStartReviewEnabled());
    syncPrimaryActionLabel();
  }

  function appendExternalReviewerRow(participant?: Partial<ReviewParticipantState>): void {
    if (!(externalReviewerTemplate instanceof HTMLTemplateElement) || !externalReviewersContainer) {
      return;
    }
    const fragment = externalReviewerTemplate.content.cloneNode(true) as DocumentFragment;
    const row = fragment.querySelector<HTMLElement>('[data-review-external-row]');
    if (!row) {
      return;
    }
    const nameInput = row.querySelector<HTMLInputElement>('[data-review-external-name]');
    const emailInput = row.querySelector<HTMLInputElement>('[data-review-external-email]');
    const commentInput = row.querySelector<HTMLInputElement>('[data-review-external-comment]');
    const approveInput = row.querySelector<HTMLInputElement>('[data-review-external-approve]');
    if (nameInput) {
      nameInput.value = String(participant?.displayName || '').trim();
    }
    if (emailInput) {
      emailInput.value = String(participant?.email || '').trim();
    }
    if (commentInput) {
      commentInput.checked = boolAttr(participant?.canComment, true);
    }
    if (approveInput) {
      approveInput.checked = boolAttr(participant?.canApprove, true);
    }
    externalReviewersContainer.appendChild(fragment);
    syncExternalReviewersEmptyState();
  }

  function selectedReviewState(): ReviewConfigState {
    const recipientParticipants: ReviewParticipantState[] = [];
    recipientReviewersContainer?.querySelectorAll<HTMLElement>('[data-review-recipient-row]').forEach((row) => {
      const enabledInput = row.querySelector<HTMLInputElement>('[data-review-recipient-enabled]');
      if (!enabledInput?.checked) {
        return;
      }
      recipientParticipants.push({
        participantType: 'recipient',
        participantTempId: String(row.dataset.participantTempId || '').trim() || undefined,
        recipientTempId: String(row.dataset.participantTempId || '').trim() || undefined,
        email: String(row.dataset.email || '').trim() || undefined,
        displayName: String(row.dataset.name || '').trim() || undefined,
        canComment: row.querySelector<HTMLInputElement>('[data-review-recipient-comment]')?.checked !== false,
        canApprove: row.querySelector<HTMLInputElement>('[data-review-recipient-approve]')?.checked !== false,
      });
    });

    const externalParticipants: ReviewParticipantState[] = [];
    externalReviewersContainer?.querySelectorAll<HTMLElement>('[data-review-external-row]').forEach((row) => {
      const email = String(row.querySelector<HTMLInputElement>('[data-review-external-email]')?.value || '').trim();
      if (email === '') {
        return;
      }
      externalParticipants.push({
        participantType: 'external',
        email,
        displayName: String(row.querySelector<HTMLInputElement>('[data-review-external-name]')?.value || '').trim() || undefined,
        canComment: row.querySelector<HTMLInputElement>('[data-review-external-comment]')?.checked !== false,
        canApprove: row.querySelector<HTMLInputElement>('[data-review-external-approve]')?.checked !== false,
      });
    });

    return {
      enabled: isStartReviewEnabled(),
      gate: String(reviewGateSelect instanceof HTMLSelectElement ? reviewGateSelect.value : 'approve_before_send').trim() || 'approve_before_send',
      commentsEnabled: reviewCommentsEnabledInput instanceof HTMLInputElement ? reviewCommentsEnabledInput.checked : false,
      participants: [...recipientParticipants, ...externalParticipants],
    };
  }

  function renderRecipientReviewers(state?: Partial<ReviewConfigState> | null): void {
    if (!recipientReviewersContainer) {
      return;
    }
    const normalized = normalizeReviewState(state);
    const selectedByParticipantID = new Map<string, ReviewParticipantState>();
    normalized.participants
      .filter((participant) => String(participant.participantType || '').trim() === 'recipient')
      .forEach((participant) => {
        const key = String(participant.participantTempId || participant.recipientTempId || participant.recipientId || '').trim();
        if (key !== '') {
          selectedByParticipantID.set(key, participant);
        }
      });

    const signers = getSignerParticipants();
    recipientReviewersContainer.innerHTML = signers.map((signer) => {
      const key = String(signer.id || '').trim();
      const participant = selectedByParticipantID.get(key);
      const enabled = Boolean(participant);
      const canComment = participant ? boolAttr(participant.canComment, true) : true;
      const canApprove = participant ? boolAttr(participant.canApprove, true) : true;
      return `
        <div class="rounded-lg border border-gray-200 bg-white p-3" data-review-recipient-row data-participant-temp-id="${escapeHtml(key)}" data-email="${escapeHtml(signer.email)}" data-name="${escapeHtml(signer.name)}">
          <div class="flex items-start justify-between gap-3">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600" data-review-recipient-enabled ${enabled ? 'checked' : ''}>
              <span>
                <span class="block text-sm font-medium text-gray-900">${escapeHtml(signer.name || signer.email || 'Signer')}</span>
                <span class="block text-xs text-gray-500">${escapeHtml(signer.email)}</span>
              </span>
            </label>
            <div class="flex flex-col gap-1.5 text-xs">
              <label class="flex items-center gap-2 cursor-pointer" title="Allow this reviewer to add comments">
                <input type="checkbox" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" data-review-recipient-comment ${canComment ? 'checked' : ''}>
                <span class="text-gray-600">Comment</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer" title="Allow this reviewer to approve or request changes">
                <input type="checkbox" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" data-review-recipient-approve ${canApprove ? 'checked' : ''}>
                <span class="text-gray-600">Approve</span>
              </label>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function refreshRecipientReviewers(): void {
    renderRecipientReviewers(selectedReviewState());
  }

  function restoreFromState(state: { review?: Partial<ReviewConfigState> | null } | null | undefined): void {
    const normalized = normalizeReviewState(state?.review);
    if (modeSendInput instanceof HTMLInputElement) {
      modeSendInput.checked = !normalized.enabled;
    }
    if (modeStartInput instanceof HTMLInputElement) {
      modeStartInput.checked = normalized.enabled;
    }
    if (reviewGateSelect instanceof HTMLSelectElement) {
      reviewGateSelect.value = normalized.gate;
    }
    if (reviewCommentsEnabledInput instanceof HTMLInputElement) {
      reviewCommentsEnabledInput.checked = normalized.commentsEnabled;
    }
    renderRecipientReviewers(normalized);
    if (externalReviewersContainer) {
      externalReviewersContainer.innerHTML = '';
      normalized.participants
        .filter((participant) => String(participant.participantType || '').trim() === 'external')
        .forEach((participant) => appendExternalReviewerRow(participant));
      syncExternalReviewersEmptyState();
    }
    syncReviewModeUI();
  }

  function bindEvents(): void {
    [modeSendInput, modeStartInput].forEach((input) => {
      input?.addEventListener('change', () => {
        syncReviewModeUI();
        onChanged?.();
      });
    });
    reviewGateSelect?.addEventListener('change', () => onChanged?.());
    reviewCommentsEnabledInput?.addEventListener('change', () => onChanged?.());
    recipientReviewersContainer?.addEventListener('change', () => onChanged?.());
    externalReviewersContainer?.addEventListener('input', () => onChanged?.());
    externalReviewersContainer?.addEventListener('change', () => onChanged?.());
    externalReviewersContainer?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches('[data-review-external-remove]')) {
        return;
      }
      target.closest('[data-review-external-row]')?.remove();
      syncExternalReviewersEmptyState();
      onChanged?.();
    });
    addExternalReviewerBtn?.addEventListener('click', () => {
      appendExternalReviewerRow();
      onChanged?.();
    });
    syncReviewModeUI();
    syncExternalReviewersEmptyState();
  }

  return {
    bindEvents,
    collectReviewConfigForState: selectedReviewState,
    restoreFromState,
    refreshRecipientReviewers,
    isStartReviewEnabled,
  };
}
