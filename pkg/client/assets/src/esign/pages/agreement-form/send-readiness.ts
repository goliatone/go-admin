interface SendReadinessIssue {
  severity: 'error' | 'warning';
  message: string;
  action: string;
  step: number;
}

interface SendReadinessSigner {
  id?: string | null;
  name: string;
  email: string;
}

interface SendReadinessControllerOptions {
  documentIdInput: HTMLInputElement | null;
  selectedDocumentTitle: HTMLElement | null;
  participantsContainer: ParentNode;
  fieldDefinitionsContainer: ParentNode;
  submitBtn: HTMLButtonElement | HTMLElement;
  escapeHtml(value: unknown): string;
  getSignerParticipants(): SendReadinessSigner[];
  getCurrentDocumentPageCount(): number;
  collectFieldRulesForState(): Record<string, unknown>[];
  expandRulesForPreview(rules: Record<string, unknown>[], terminalPage: number): unknown[];
  findSignersMissingRequiredSignatureField(): SendReadinessSigner[];
  goToStep(step: number): void;
}

export interface SendReadinessController {
  initSendReadinessCheck(): void;
}

function requireElement<T extends HTMLElement>(id: string): T | null {
  const element = document.getElementById(id);
  return element instanceof HTMLElement ? element as T : null;
}

function inputValue(root: ParentNode, selector: string, fallback = ''): string {
  const element = root.querySelector(selector);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return element.value || fallback;
  }
  return fallback;
}

function checkboxChecked(root: ParentNode, selector: string, fallback = false): boolean {
  const element = root.querySelector(selector);
  return element instanceof HTMLInputElement ? element.checked : fallback;
}

function setSubmitDisabled(submitBtn: HTMLElement | HTMLButtonElement, disabled: boolean): void {
  if (submitBtn instanceof HTMLButtonElement) {
    submitBtn.disabled = disabled;
  }
}

export function createSendReadinessController(
  options: SendReadinessControllerOptions,
): SendReadinessController {
  const {
    documentIdInput,
    selectedDocumentTitle,
    participantsContainer,
    fieldDefinitionsContainer,
    submitBtn,
    escapeHtml,
    getSignerParticipants,
    getCurrentDocumentPageCount,
    collectFieldRulesForState,
    expandRulesForPreview,
    findSignersMissingRequiredSignatureField,
    goToStep,
  } = options;

  function initSendReadinessCheck() {
    const sendReadinessLoading = requireElement<HTMLElement>('send-readiness-loading');
    const sendReadinessResults = requireElement<HTMLElement>('send-readiness-results');
    const sendValidationStatus = requireElement<HTMLElement>('send-validation-status');
    const sendValidationIssues = requireElement<HTMLElement>('send-validation-issues');
    const sendIssuesList = requireElement<HTMLElement>('send-issues-list');
    const sendConfirmation = requireElement<HTMLElement>('send-confirmation');

    const reviewAgreementTitle = requireElement<HTMLElement>('review-agreement-title');
    const reviewDocumentTitle = requireElement<HTMLElement>('review-document-title');
    const reviewParticipantCount = requireElement<HTMLElement>('review-participant-count');
    const reviewStageCount = requireElement<HTMLElement>('review-stage-count');
    const reviewParticipantsList = requireElement<HTMLElement>('review-participants-list');
    const reviewFieldsSummary = requireElement<HTMLElement>('review-fields-summary');
    const titleInput = document.getElementById('title');

    if (
      !sendReadinessLoading ||
      !sendReadinessResults ||
      !sendValidationStatus ||
      !sendValidationIssues ||
      !sendIssuesList ||
      !sendConfirmation ||
      !reviewAgreementTitle ||
      !reviewDocumentTitle ||
      !reviewParticipantCount ||
      !reviewStageCount ||
      !reviewParticipantsList ||
      !reviewFieldsSummary ||
      !(titleInput instanceof HTMLInputElement)
    ) {
      return;
    }

    const title = titleInput.value || 'Untitled';
    const docTitle = selectedDocumentTitle?.textContent || 'No document';
    const participantEntries = participantsContainer.querySelectorAll('.participant-entry');
    const fieldEntries = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
    const expandedRuleFields = expandRulesForPreview(collectFieldRulesForState(), getCurrentDocumentPageCount());
    const signers = getSignerParticipants();

    const stages = new Set<number>();
    participantEntries.forEach((entry) => {
      const stageInput = entry.querySelector('.signing-stage-input');
      const roleSelect = entry.querySelector('select[name*=".role"]');
      if (
        roleSelect instanceof HTMLSelectElement &&
        roleSelect.value === 'signer' &&
        stageInput instanceof HTMLInputElement &&
        stageInput.value
      ) {
        stages.add(Number.parseInt(stageInput.value, 10));
      }
    });

    reviewAgreementTitle.textContent = title;
    reviewDocumentTitle.textContent = docTitle;
    reviewParticipantCount.textContent = `${participantEntries.length} (${signers.length} signers)`;
    reviewStageCount.textContent = String(stages.size > 0 ? stages.size : 1);

    reviewParticipantsList.innerHTML = '';
    participantEntries.forEach((entry) => {
      const name = inputValue(entry, 'input[name*=".name"]');
      const email = inputValue(entry, 'input[name*=".email"]');
      const role = inputValue(entry, 'select[name*=".role"]', 'signer');
      const stage = inputValue(entry, '.signing-stage-input');
      const notify = checkboxChecked(entry, '.notify-input', true);

      const div = document.createElement('div');
      div.className = 'flex items-center justify-between text-sm';
      div.innerHTML = `
        <div>
          <span class="font-medium">${escapeHtml(name || email)}</span>
          <span class="text-gray-500 ml-2">${escapeHtml(email)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${role === 'signer' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}">
            ${role === 'signer' ? 'Signer' : 'CC'}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${notify ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
            ${notify ? 'Notify' : 'No Notify'}
          </span>
          ${role === 'signer' && stage ? `<span class="text-xs text-gray-500">Stage ${stage}</span>` : ''}
        </div>
      `;
      reviewParticipantsList.appendChild(div);
    });

    const totalFields = fieldEntries.length + expandedRuleFields.length;
    reviewFieldsSummary.textContent = `${totalFields} field${totalFields !== 1 ? 's' : ''} defined (${fieldEntries.length} manual, ${expandedRuleFields.length} generated)`;

    const issues: SendReadinessIssue[] = [];

    if (!documentIdInput?.value) {
      issues.push({ severity: 'error', message: 'No document selected', action: 'Go to Step 1', step: 1 });
    }

    if (signers.length === 0) {
      issues.push({ severity: 'error', message: 'No signers added', action: 'Go to Step 3', step: 3 });
    }

    const missingSigners = findSignersMissingRequiredSignatureField();
    missingSigners.forEach((signer) => {
      issues.push({
        severity: 'error',
        message: `${signer.name} has no required signature field`,
        action: 'Add signature field',
        step: 4,
      });
    });

    const stageArray = Array.from(stages).sort((a, b) => a - b);
    for (let i = 0; i < stageArray.length; i++) {
      if (stageArray[i] !== i + 1) {
        issues.push({
          severity: 'warning',
          message: 'Signing stages should be sequential starting from 1',
          action: 'Review stages',
          step: 3,
        });
        break;
      }
    }

    const hasErrors = issues.some((issue) => issue.severity === 'error');
    const hasWarnings = issues.some((issue) => issue.severity === 'warning');

    if (hasErrors) {
      sendValidationStatus.className = 'p-4 rounded-lg bg-red-50 border border-red-200';
      sendValidationStatus.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `;
      sendConfirmation.classList.add('hidden');
      setSubmitDisabled(submitBtn, true);
    } else if (hasWarnings) {
      sendValidationStatus.className = 'p-4 rounded-lg bg-amber-50 border border-amber-200';
      sendValidationStatus.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `;
      sendConfirmation.classList.remove('hidden');
      setSubmitDisabled(submitBtn, false);
    } else {
      sendValidationStatus.className = 'p-4 rounded-lg bg-green-50 border border-green-200';
      sendValidationStatus.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `;
      sendConfirmation.classList.remove('hidden');
      setSubmitDisabled(submitBtn, false);
    }

    if (issues.length > 0) {
      sendValidationIssues.classList.remove('hidden');
      sendIssuesList.innerHTML = '';
      issues.forEach((issue) => {
        const li = document.createElement('li');
        li.className = `p-3 rounded-lg flex items-center justify-between ${issue.severity === 'error' ? 'bg-red-50' : 'bg-amber-50'}`;
        li.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${issue.severity === 'error' ? 'text-red-500' : 'text-amber-500'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${issue.severity === 'error' ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'}"/>
            </svg>
            <span class="text-sm">${escapeHtml(issue.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${issue.step}">
            ${escapeHtml(issue.action)}
          </button>
        `;
        sendIssuesList.appendChild(li);
      });

      sendIssuesList.querySelectorAll('[data-go-to-step]').forEach((button) => {
        button.addEventListener('click', () => {
          const step = Number((button as HTMLElement).getAttribute('data-go-to-step'));
          if (Number.isFinite(step)) {
            goToStep(step);
          }
        });
      });
    } else {
      sendValidationIssues.classList.add('hidden');
    }

    sendReadinessLoading.classList.add('hidden');
    sendReadinessResults.classList.remove('hidden');
  }

  return {
    initSendReadinessCheck,
  };
}
