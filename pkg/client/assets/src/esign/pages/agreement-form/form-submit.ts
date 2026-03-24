import type { AgreementFormRuntimeInputConfig } from './bootstrap-config';
import type { CanonicalAgreementPayload } from './form-payload';
import type { ExpandedRuleField, FieldRuleFormPayload, FieldRuleState, NormalizedPlacementInstance, ReviewConfigState } from './contracts';
import type { SignerParticipantSummary } from './participants';
import type { AgreementFeedbackAPIError } from './feedback';
import {
  buildSendDebugFields,
  createSendAttemptId,
  logSendInfo,
  logSendWarn,
} from './send-debug';
import type { SendDebugOwnershipState } from './send-debug';

interface WizardStepShape {
  FIELDS: number;
}

interface SubmitWizardState {
  wizardId?: string | null;
  currentStep?: number;
  syncPending?: boolean;
  serverDraftId?: string | null;
  serverRevision?: number;
  lastSyncedAt?: string | null;
  [key: string]: unknown;
}

interface SubmitDraftRecord {
  id?: string;
  revision?: number;
  status?: number;
}

interface SubmitSendPayload {
  agreement_id?: string;
  id?: string;
  draft_deleted?: boolean;
  data?: {
    id?: string;
    agreement_id?: string;
    draft_deleted?: boolean;
  };
}

interface SubmitSyncResult {
  blocked?: boolean;
  reason?: string;
}

interface SubmitStateManager {
  updateState(partial: Record<string, unknown>): void;
  collectFormState(): Record<string, unknown>;
  getState(): SubmitWizardState;
  markSynced(draftId: string, revision: number): void;
  setState(nextState: SubmitWizardState, options?: { syncPending?: boolean }): void;
  clear(): void;
}

interface SubmitSyncService {
  create(state: Record<string, unknown>): Promise<SubmitDraftRecord>;
  load(draftId: string): Promise<SubmitDraftRecord>;
  send(expectedRevision: number, idempotencyKey: string, metadata?: Record<string, unknown>): Promise<SubmitSendPayload>;
  startReview(expectedRevision: number, idempotencyKey: string, metadata?: Record<string, unknown>): Promise<SubmitSendPayload>;
}

interface SubmitSyncOrchestrator {
  forceSync(): Promise<SubmitSyncResult>;
  broadcastStateUpdate(): void;
  broadcastDraftDisposed?(draftId: string, reason?: string): void;
}

interface SubmitControllerError extends Error {
  code?: string;
  status?: number;
}

interface SubmitControllerOptions {
  config: AgreementFormRuntimeInputConfig;
  form: HTMLFormElement;
  submitBtn: HTMLButtonElement;
  documentIdInput: HTMLInputElement;
  documentSearch: HTMLInputElement;
  participantsContainer: HTMLElement;
  addParticipantBtn: HTMLElement;
  fieldDefinitionsContainer: HTMLElement;
  fieldRulesContainer?: HTMLElement | null;
  documentPageCountInput?: HTMLInputElement | null;
  fieldPlacementsJSONInput?: HTMLInputElement | HTMLTextAreaElement | null;
  fieldRulesJSONInput?: HTMLInputElement | HTMLTextAreaElement | null;
  storageKey: string;
  syncService: SubmitSyncService;
  syncOrchestrator: SubmitSyncOrchestrator;
  stateManager: SubmitStateManager;
  submitMode: string;
  totalWizardSteps: number;
  wizardStep: WizardStepShape;
  getCurrentStep(): number;
  getPlacementState?(): { fieldInstances?: NormalizedPlacementInstance[] } | null;
  getCurrentDocumentPageCount?(): number;
  ensureSelectedDocumentCompatibility(): boolean;
  collectFieldRulesForState(): FieldRuleState[];
  collectFieldRulesForForm?(): FieldRuleFormPayload[];
  expandRulesForPreview?(rules: Array<Partial<FieldRuleState>>, terminalPage: number): ExpandedRuleField[];
  findSignersMissingRequiredSignatureField(): SignerParticipantSummary[];
  missingSignatureFieldMessage(missingSigners: SignerParticipantSummary[]): string;
  getSignerParticipants?(): SignerParticipantSummary[];
  getReviewConfigForState(): ReviewConfigState;
  isStartReviewEnabled(): boolean;
  setPrimaryActionLabel(label: string): void;
  buildCanonicalAgreementPayload(): CanonicalAgreementPayload;
  announceError(message: string, code?: string, status?: number): void;
  emitWizardTelemetry(eventName: string, fields?: Record<string, unknown>): void;
  parseAPIError(response: Response, fallbackMessage: string): Promise<AgreementFeedbackAPIError>;
  goToStep(stepNum: number): void;
  showSyncConflictDialog?(serverRevision?: number | string): void;
  surfaceSyncOutcome?(
    resultPromise: Promise<Record<string, unknown>> | Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> | Record<string, unknown>;
  updateSyncStatus?(status?: string): void;
  activeTabOwnershipRequiredCode?: string;
  getActiveTabDebugState?(): SendDebugOwnershipState | null;
  addFieldBtn: HTMLElement;
}

export interface AgreementFormSubmitController {
  bindEvents(): void;
  ensureDraftReadyForSend(): Promise<{ draftID: string; revision: number }>;
  persistLatestWizardState(): Promise<SubmitWizardState>;
  resyncAfterSendNotFound(): Promise<void>;
}

function roleSelect(entry: ParentNode): HTMLSelectElement | null {
  return entry.querySelector('select[name*=".role"]') as HTMLSelectElement | null;
}

function fieldParticipantSelect(entry: ParentNode): HTMLSelectElement | null {
  return entry.querySelector('.field-participant-select') as HTMLSelectElement | null;
}

function isSubmitControllerError(error: unknown): error is { message?: unknown; code?: unknown; status?: unknown } {
  return typeof error === 'object' && error !== null;
}

function submitControllerError(
  code: string,
  message: string,
  extras: { status?: number; currentRevision?: number; conflict?: { currentRevision?: number } } = {},
): SubmitControllerError & { currentRevision?: number; conflict?: { currentRevision?: number } } {
  const error = new Error(message) as SubmitControllerError & {
    currentRevision?: number;
    conflict?: { currentRevision?: number };
  };
  error.code = String(code || '').trim();
  if (Number(extras.status || 0) > 0) {
    error.status = Number(extras.status || 0);
  }
  if (Number(extras.currentRevision || 0) > 0) {
    error.currentRevision = Number(extras.currentRevision || 0);
  }
  if (Number(extras.conflict?.currentRevision || 0) > 0) {
    error.conflict = {
      currentRevision: Number(extras.conflict?.currentRevision || 0),
    };
  }
  return error;
}

function resolveConflictRevision(error: unknown, fallback = 0): number {
  if (!isSubmitControllerError(error)) {
    return Number(fallback || 0);
  }
  const candidate = error as SubmitControllerError & {
    currentRevision?: unknown;
    conflict?: { currentRevision?: unknown } | null;
  };
  const direct = Number(candidate.currentRevision || 0);
  if (direct > 0) {
    return direct;
  }
  const conflictRevision = Number(candidate.conflict?.currentRevision || 0);
  if (conflictRevision > 0) {
    return conflictRevision;
  }
  return Number(fallback || 0);
}

export function createAgreementFormSubmitController(
  options: SubmitControllerOptions,
): AgreementFormSubmitController {
  const {
    config,
    form,
    submitBtn,
    documentIdInput,
    documentSearch,
    participantsContainer,
    addParticipantBtn,
    fieldDefinitionsContainer,
    fieldRulesContainer,
    documentPageCountInput,
    fieldPlacementsJSONInput,
    fieldRulesJSONInput,
    storageKey,
    syncService,
    syncOrchestrator,
    stateManager,
    submitMode,
    totalWizardSteps,
    wizardStep,
    getCurrentStep,
    getPlacementState,
    getCurrentDocumentPageCount,
    ensureSelectedDocumentCompatibility,
    collectFieldRulesForState,
    collectFieldRulesForForm,
    expandRulesForPreview,
    findSignersMissingRequiredSignatureField,
    missingSignatureFieldMessage,
    getSignerParticipants,
    getReviewConfigForState,
    isStartReviewEnabled,
    setPrimaryActionLabel,
    buildCanonicalAgreementPayload,
    announceError,
    emitWizardTelemetry,
    parseAPIError,
    goToStep,
    showSyncConflictDialog,
    surfaceSyncOutcome,
    updateSyncStatus,
    activeTabOwnershipRequiredCode = 'ACTIVE_TAB_OWNERSHIP_REQUIRED',
    getActiveTabDebugState,
    addFieldBtn,
  } = options;
  let activeSendAttemptID: string | null = null;

  function ownershipState(): SendDebugOwnershipState {
    return getActiveTabDebugState?.() || {};
  }

  function setSubmitButtonState(label: string, spinning = false): void {
    submitBtn.setAttribute('aria-busy', spinning ? 'true' : 'false');
    submitBtn.innerHTML = spinning
      ? `
          <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${label}
        `
      : `
          <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          ${label}
        `;
  }

  async function persistLatestWizardState(): Promise<SubmitWizardState> {
    logSendInfo('persist_latest_wizard_state_start', buildSendDebugFields({
      state: stateManager.getState(),
      storageKey,
      ownership: ownershipState(),
      sendAttemptId: activeSendAttemptID,
    }));
    stateManager.updateState(stateManager.collectFormState());
    const syncResult = await syncOrchestrator.forceSync();
    if (syncResult?.blocked && syncResult.reason === 'passive_tab') {
      logSendWarn('persist_latest_wizard_state_blocked', buildSendDebugFields({
        state: stateManager.getState(),
        storageKey,
        ownership: ownershipState(),
        sendAttemptId: activeSendAttemptID,
        extra: {
          reason: syncResult.reason,
        },
      }));
      throw {
        code: activeTabOwnershipRequiredCode,
        message: 'This agreement is active in another tab. Take control in this tab before saving or sending.',
      };
    }
    const syncedState = stateManager.getState();
    if (syncedState?.syncPending) {
      logSendWarn('persist_latest_wizard_state_unsynced', buildSendDebugFields({
        state: syncedState,
        storageKey,
        ownership: ownershipState(),
        sendAttemptId: activeSendAttemptID,
      }));
      throw new Error('Unable to sync latest draft changes');
    }
    logSendInfo('persist_latest_wizard_state_complete', buildSendDebugFields({
      state: syncedState,
      storageKey,
      ownership: ownershipState(),
      sendAttemptId: activeSendAttemptID,
    }));
    return syncedState;
  }

  async function ensureDraftReadyForSend(): Promise<{ draftID: string; revision: number }> {
    logSendInfo('ensure_draft_ready_for_send_start', buildSendDebugFields({
      state: stateManager.getState(),
      storageKey,
      ownership: ownershipState(),
      sendAttemptId: activeSendAttemptID,
    }));
    const syncedState = await persistLatestWizardState();
    const currentDraftID = String(syncedState?.serverDraftId || '').trim();
    if (!currentDraftID) {
      logSendWarn('ensure_draft_ready_for_send_missing_draft', buildSendDebugFields({
        state: syncedState,
        storageKey,
        ownership: ownershipState(),
        sendAttemptId: activeSendAttemptID,
        extra: {
          action: 'create_draft',
        },
      }));
      const created = await syncService.create(syncedState);
      const createdDraftID = String(created.id || '').trim();
      const createdRevision = Number(created.revision || 0);
      if (createdDraftID && createdRevision > 0) {
        stateManager.markSynced(createdDraftID, createdRevision);
      }
      logSendInfo('ensure_draft_ready_for_send_created', buildSendDebugFields({
        state: stateManager.getState(),
        storageKey,
        ownership: ownershipState(),
        sendAttemptId: activeSendAttemptID,
        extra: {
          loadedDraftId: createdDraftID,
          loadedRevision: createdRevision,
        },
      }));
      return {
        draftID: createdDraftID,
        revision: createdRevision,
      };
    }
    try {
      logSendInfo('ensure_draft_ready_for_send_loading', buildSendDebugFields({
        state: syncedState,
        storageKey,
        ownership: ownershipState(),
        sendAttemptId: activeSendAttemptID,
        extra: {
          targetDraftId: currentDraftID,
        },
      }));
      const loaded = await syncService.load(currentDraftID);
      const draftID = String(loaded?.id || currentDraftID).trim();
      const revision = Number(loaded?.revision || syncedState?.serverRevision || 0);
      if (draftID && revision > 0) {
        stateManager.markSynced(draftID, revision);
      }
      logSendInfo('ensure_draft_ready_for_send_loaded', buildSendDebugFields({
        state: stateManager.getState(),
        storageKey,
        ownership: ownershipState(),
        sendAttemptId: activeSendAttemptID,
        extra: {
          loadedDraftId: draftID,
          loadedRevision: revision,
        },
      }));
      return {
        draftID,
        revision: revision > 0 ? revision : Number(syncedState?.serverRevision || 0),
      };
    } catch (error: unknown) {
      if (Number(isSubmitControllerError(error) ? error.status || 0 : 0) !== 404) {
        logSendWarn('ensure_draft_ready_for_send_load_failed', buildSendDebugFields({
          state: syncedState,
          storageKey,
          ownership: ownershipState(),
          sendAttemptId: activeSendAttemptID,
          extra: {
            targetDraftId: currentDraftID,
            status: Number(isSubmitControllerError(error) ? error.status || 0 : 0),
          },
        }));
        throw error;
      }
      logSendWarn('ensure_draft_ready_for_send_missing_remote_draft', buildSendDebugFields({
        state: syncedState,
        storageKey,
        ownership: ownershipState(),
        sendAttemptId: activeSendAttemptID,
        extra: {
          targetDraftId: currentDraftID,
          status: 404,
        },
      }));
      emitWizardTelemetry('wizard_send_not_found', {
        draft_id: currentDraftID,
        status: 404,
        phase: 'pre_send',
      });
      await resyncAfterSendNotFound().catch(() => {});
      throw submitControllerError(
        'DRAFT_SEND_NOT_FOUND',
        'Draft not found',
        { status: 404 },
      );
    }
  }

  async function resyncAfterSendNotFound(): Promise<void> {
    const currentState = stateManager.getState();
    stateManager.setState({
      ...currentState,
      resourceRef: null,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: true,
    }, { syncPending: true });
    await syncOrchestrator.forceSync();
  }

  function bindEvents(): void {
    form.addEventListener('submit', function(e: SubmitEvent) {
      buildCanonicalAgreementPayload();

      if (!documentIdInput.value) {
        e.preventDefault();
        announceError('Please select a document');
        documentSearch.focus();
        return;
      }
      if (!ensureSelectedDocumentCompatibility()) {
        e.preventDefault();
        return;
      }

      const participantEntries = participantsContainer.querySelectorAll<HTMLElement>('.participant-entry');
      if (participantEntries.length === 0) {
        e.preventDefault();
        announceError('Please add at least one participant');
        addParticipantBtn.focus();
        return;
      }

      let hasSigners = false;
      participantEntries.forEach((entry) => {
        if (roleSelect(entry)?.value === 'signer') {
          hasSigners = true;
        }
      });

      if (!hasSigners) {
        e.preventDefault();
        announceError('At least one signer is required');
        const firstRoleSelect = participantEntries[0] ? roleSelect(participantEntries[0]) : null;
        if (firstRoleSelect) firstRoleSelect.focus();
        return;
      }

      const fieldDefinitionEntries = fieldDefinitionsContainer.querySelectorAll<HTMLElement>('.field-definition-entry');
      const missingSigners = findSignersMissingRequiredSignatureField();
      if (missingSigners.length > 0) {
        e.preventDefault();
        announceError(missingSignatureFieldMessage(missingSigners));
        goToStep(wizardStep.FIELDS);
        addFieldBtn.focus();
        return;
      }

      let invalidFieldAssignment = false;
      fieldDefinitionEntries.forEach((field) => {
        if (!fieldParticipantSelect(field)?.value) {
          invalidFieldAssignment = true;
        }
      });

      if (invalidFieldAssignment) {
        e.preventDefault();
        announceError('Please assign all fields to a signer');
        const firstUnassigned = fieldDefinitionsContainer.querySelector<HTMLSelectElement>('.field-participant-select:invalid, .field-participant-select[value=""]');
        if (firstUnassigned) firstUnassigned.focus();
        return;
      }

      const rules = collectFieldRulesForState();
      const invalidRuleAssignment = rules.some((rule) => !rule.participantId);
      if (invalidRuleAssignment) {
        e.preventDefault();
        announceError('Please assign all automation rules to a signer');
        const firstUnassignedRule = Array.from(fieldRulesContainer?.querySelectorAll<HTMLSelectElement>('.field-rule-participant-select') || [])
          .find((select) => !select.value);
        firstUnassignedRule?.focus();
        return;
      }

      const hasSaveAsDraftIntent = Boolean(form.querySelector('input[name="save_as_draft"]'));
      const startReviewEnabled = typeof isStartReviewEnabled === 'function' ? isStartReviewEnabled() : false;
      const shouldStartReview = getCurrentStep() === totalWizardSteps && !hasSaveAsDraftIntent && startReviewEnabled;
      const shouldSendForSignature = getCurrentStep() === totalWizardSteps && !hasSaveAsDraftIntent && !shouldStartReview;

      if (shouldSendForSignature) {
        let sendIntentInput = form.querySelector<HTMLInputElement>('input[name="send_for_signature"]');
        if (!sendIntentInput) {
          sendIntentInput = document.createElement('input');
          sendIntentInput.type = 'hidden';
          sendIntentInput.name = 'send_for_signature';
          form.appendChild(sendIntentInput);
        }
        sendIntentInput.value = '1';
      } else {
        form.querySelector('input[name="send_for_signature"]')?.remove();
      }

      if (submitMode === 'json') {
        e.preventDefault();
        submitBtn.disabled = true;
        setSubmitButtonState(shouldSendForSignature ? 'Sending...' : (shouldStartReview ? 'Starting Review...' : 'Saving...'), true);
        void (async () => {
          try {
            buildCanonicalAgreementPayload();

            const indexRoute = String(config.routes?.index || '').trim();
            if (!shouldSendForSignature && !shouldStartReview) {
              await persistLatestWizardState();
              if (indexRoute) {
                window.location.href = indexRoute;
                return;
              }
              window.location.reload();
              return;
            }

            if (shouldStartReview) {
              const reviewConfig = getReviewConfigForState();
              if (!reviewConfig.enabled) {
                throw new Error('Review mode is not enabled.');
              }
              if ((reviewConfig.participants || []).length === 0) {
                throw new Error('Add at least one reviewer before starting review.');
              }
            }

            activeSendAttemptID = createSendAttemptId();
            logSendInfo('send_submit_start', buildSendDebugFields({
              state: stateManager.getState(),
              storageKey,
              ownership: ownershipState(),
              sendAttemptId: activeSendAttemptID,
            }));
            const sendDraft = await ensureDraftReadyForSend();
            const draftID = String(sendDraft?.draftID || '').trim();
            const expectedRevision = Number(sendDraft?.revision || 0);
            if (!draftID || expectedRevision <= 0) {
              throw new Error('Draft session not available. Please try again.');
            }

            logSendInfo('send_request_start', buildSendDebugFields({
              state: stateManager.getState(),
              storageKey,
              ownership: ownershipState(),
              sendAttemptId: activeSendAttemptID,
              extra: {
                targetDraftId: draftID,
                expectedRevision,
                operation: shouldStartReview ? 'start_review' : 'send',
              },
            }));
            const payload = shouldStartReview
              ? await syncService.startReview(expectedRevision, activeSendAttemptID || draftID)
              : await syncService.send(expectedRevision, activeSendAttemptID || draftID);
            const agreementID = String(
              payload?.agreement_id
              || payload?.id
              || payload?.data?.agreement_id
              || payload?.data?.id
              || '',
            ).trim();
            logSendInfo('send_request_success', buildSendDebugFields({
              state: stateManager.getState(),
              storageKey,
              ownership: ownershipState(),
              sendAttemptId: activeSendAttemptID,
              extra: {
                targetDraftId: draftID,
                expectedRevision,
                agreementId: agreementID,
                operation: shouldStartReview ? 'start_review' : 'send',
              },
            }));

            stateManager.clear();
            syncOrchestrator.broadcastStateUpdate();
            syncOrchestrator.broadcastDraftDisposed?.(draftID, 'send_completed');
            activeSendAttemptID = null;

            if (agreementID && indexRoute) {
              window.location.href = `${indexRoute}/${encodeURIComponent(agreementID)}`;
              return;
            }
            if (indexRoute) {
              window.location.href = indexRoute;
              return;
            }
            window.location.reload();
          } catch (error: unknown) {
            const normalizedError = isSubmitControllerError(error) ? error : {};
            const message = String(normalizedError.message || 'Failed to process agreement').trim();
            let code = String(normalizedError.code || '').trim();
            const status = Number(normalizedError.status || 0);
            if (code.toUpperCase() === 'STALE_REVISION') {
              const currentRevision = resolveConflictRevision(error, Number(stateManager.getState()?.serverRevision || 0));
              updateSyncStatus?.('conflict');
              showSyncConflictDialog?.(currentRevision);
              emitWizardTelemetry('wizard_send_conflict', {
                draft_id: String(stateManager.getState()?.serverDraftId || '').trim(),
                current_revision: currentRevision,
                status: status || 409,
              });
              submitBtn.disabled = false;
              setPrimaryActionLabel(startReviewEnabled ? 'Start Review' : 'Send for Signature');
              activeSendAttemptID = null;
              return;
            }
            if (code.toUpperCase() === 'NOT_FOUND') {
              code = 'DRAFT_SEND_NOT_FOUND';
              emitWizardTelemetry('wizard_send_not_found', {
                draft_id: String(stateManager.getState()?.serverDraftId || '').trim(),
                status: status || 404,
              });
              await resyncAfterSendNotFound().catch(() => {});
            }
            logSendWarn('send_request_failed', buildSendDebugFields({
              state: stateManager.getState(),
              storageKey,
              ownership: ownershipState(),
              sendAttemptId: activeSendAttemptID,
              extra: {
                code: code || null,
                status,
                message,
              },
            }));
            announceError(message, code, status);
            submitBtn.disabled = false;
            setPrimaryActionLabel(startReviewEnabled ? 'Start Review' : 'Send for Signature');
            activeSendAttemptID = null;
          }
        })();
        return;
      }

      submitBtn.disabled = true;
      setSubmitButtonState(shouldSendForSignature ? 'Sending...' : (shouldStartReview ? 'Starting Review...' : 'Saving...'), true);
    });
  }

  return {
    bindEvents,
    ensureDraftReadyForSend,
    persistLatestWizardState,
    resyncAfterSendNotFound,
  };
}
