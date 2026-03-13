import {
  buildSendDebugFields,
  logSendInfo,
  logSendWarn,
} from './send-debug';
import type { SendDebugOwnershipState } from './send-debug';

interface ResumeDocumentState {
  id?: string | null;
  title?: string | null;
}

interface ResumeDetailsState {
  title?: string;
}

interface ResumeWizardState {
  currentStep?: number;
  updatedAt?: string | null;
  syncPending?: boolean;
  serverDraftId?: string | null;
  serverRevision?: number;
  lastSyncedAt?: string | null;
  titleSource?: string;
  document?: ResumeDocumentState | null;
  details?: ResumeDetailsState | null;
  participants?: unknown[];
  fieldDefinitions?: unknown[];
  fieldPlacements?: Array<Record<string, unknown> | null | undefined>;
  fieldRules?: unknown[];
  [key: string]: unknown;
}

interface ResumeStateManager {
  getState(): ResumeWizardState;
  normalizeLoadedState(state: ResumeWizardState): ResumeWizardState;
  setState(
    nextState: ResumeWizardState,
    options?: { syncPending?: boolean; notify?: boolean; save?: boolean },
  ): void;
  clear(): void;
  collectFormState(): ResumeWizardState;
  hasResumableState(): boolean;
}

interface ResumeDraftRecord {
  id?: string;
  revision?: number;
  updated_at?: string;
  updatedAt?: string;
  resource_ref?: any;
  wizard_state?: ResumeWizardState | null;
}

interface ResumeSyncService {
  bootstrap(): Promise<{ resourceRef: any; snapshot: { ref: any; data: Record<string, unknown>; revision: number; updatedAt: string } }>;
  create(state: Record<string, unknown>): Promise<ResumeDraftRecord>;
  load(draftId: string): Promise<ResumeDraftRecord>;
  dispose(draftId: string): Promise<void>;
}

interface ResumeSyncOrchestrator {
  broadcastStateUpdate(): void;
  broadcastDraftDisposed?(draftId: string, reason?: string): void;
  scheduleSync(): void;
}

interface ResumeTelemetryFields {
  step: number;
  has_server_draft: boolean;
}

interface ResumeControllerOptions {
  isEditMode: boolean;
  storageKey: string;
  stateManager: ResumeStateManager;
  syncOrchestrator: ResumeSyncOrchestrator;
  syncService: ResumeSyncService;
  applyResumedState(state: ResumeWizardState): void;
  hasMeaningfulWizardProgress(state: ResumeWizardState): boolean;
  formatRelativeTime(value?: string | null): string;
  emitWizardTelemetry(eventName: string, fields?: ResumeTelemetryFields): void;
  getActiveTabDebugState?(): SendDebugOwnershipState | null;
}

type ResumeAction = 'continue' | 'start_new' | 'proceed' | 'discard';

export interface AgreementResumeController {
  bindEvents(): void;
  reconcileBootstrapState(): Promise<ResumeWizardState>;
  maybeShowResumeDialog(): Promise<void>;
}

export function createAgreementResumeController(
  options: ResumeControllerOptions,
): AgreementResumeController {
  const {
    isEditMode,
    storageKey,
    stateManager,
    syncOrchestrator,
    syncService,
    applyResumedState,
    hasMeaningfulWizardProgress,
    formatRelativeTime,
    emitWizardTelemetry,
    getActiveTabDebugState,
  } = options;

  function mergeUnsyncedLocalOntoServer(
    localState: ResumeWizardState,
    serverState: ResumeWizardState,
  ): ResumeWizardState {
    return stateManager.normalizeLoadedState({
      ...serverState,
      currentStep: localState.currentStep,
      document: localState.document,
      details: localState.details,
      participants: localState.participants,
      fieldDefinitions: localState.fieldDefinitions,
      fieldPlacements: localState.fieldPlacements,
      fieldRules: localState.fieldRules,
      titleSource: localState.titleSource,
      syncPending: true,
      serverDraftId: serverState.serverDraftId,
      serverRevision: serverState.serverRevision,
      lastSyncedAt: serverState.lastSyncedAt,
    });
  }

  async function reconcileBootstrapState(): Promise<ResumeWizardState> {
    if (isEditMode) return stateManager.getState();
    const localState = stateManager.normalizeLoadedState(stateManager.getState());
    logSendInfo('resume_reconcile_start', buildSendDebugFields({
      state: localState,
      storageKey,
      ownership: getActiveTabDebugState?.() || undefined,
      sendAttemptId: null,
      extra: {
        source: 'local_bootstrap',
      },
    }));
    const localDraftID = String(localState?.serverDraftId || '').trim();
    if (!localDraftID) {
      if (!hasMeaningfulWizardProgress(localState)) {
        try {
          const bootstrapped = await syncService.bootstrap();
          stateManager.setState({
            ...(bootstrapped.snapshot?.data?.wizard_state && typeof bootstrapped.snapshot.data.wizard_state === 'object'
              ? bootstrapped.snapshot.data.wizard_state
              : {}),
            resourceRef: bootstrapped.resourceRef,
            serverDraftId: String(bootstrapped.snapshot?.ref?.id || '').trim() || null,
            serverRevision: Number(bootstrapped.snapshot?.revision || 0),
            lastSyncedAt: String(bootstrapped.snapshot?.updatedAt || '').trim() || null,
            syncPending: false,
          }, { syncPending: false, notify: false });
          return stateManager.getState();
        } catch (error: unknown) {
          logSendWarn('resume_reconcile_bootstrap_failed', buildSendDebugFields({
            state: localState,
            storageKey,
            ownership: getActiveTabDebugState?.() || undefined,
            sendAttemptId: null,
            extra: {
              source: 'bootstrap_failed_keep_local',
            },
          }));
        }
      }
      stateManager.setState(localState, { syncPending: Boolean(localState.syncPending), notify: false });
      logSendInfo('resume_reconcile_complete', buildSendDebugFields({
        state: localState,
        storageKey,
        ownership: getActiveTabDebugState?.() || undefined,
        sendAttemptId: null,
        extra: {
          source: 'local_only',
        },
      }));
      return stateManager.getState();
    }

    try {
      const serverDraft = await syncService.load(localDraftID);
      const serverState = stateManager.normalizeLoadedState({
        ...(serverDraft?.wizard_state && typeof serverDraft.wizard_state === 'object' ? serverDraft.wizard_state : {}),
        resourceRef: serverDraft?.resource_ref || localState.resourceRef || null,
        serverDraftId: String(serverDraft?.id || localDraftID).trim() || localDraftID,
        serverRevision: Number(serverDraft?.revision || 0),
        lastSyncedAt: String(serverDraft?.updated_at || serverDraft?.updatedAt || '').trim() || localState.lastSyncedAt,
        syncPending: false,
      });
      const sameDraft = String(localState.serverDraftId || '').trim() === String(serverState.serverDraftId || '').trim();
      const reconciled = (sameDraft && localState.syncPending === true)
        ? mergeUnsyncedLocalOntoServer(localState, serverState)
        : serverState;
      stateManager.setState(reconciled, { syncPending: Boolean(reconciled.syncPending), notify: false });
      logSendInfo('resume_reconcile_complete', buildSendDebugFields({
        state: reconciled,
        storageKey,
        ownership: getActiveTabDebugState?.() || undefined,
        sendAttemptId: null,
        extra: {
          source: sameDraft && localState.syncPending === true ? 'merged_local_over_remote' : 'remote_draft',
          loadedDraftId: String(serverDraft?.id || localDraftID).trim() || null,
          loadedRevision: Number(serverDraft?.revision || 0),
        },
      }));
      return stateManager.getState();
    } catch (error: unknown) {
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status?: unknown }).status || 0)
        : 0;
      if (status === 404) {
        const localOnlyState = stateManager.normalizeLoadedState({
          ...localState,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null,
        });
        stateManager.setState(localOnlyState, { syncPending: Boolean(localOnlyState.syncPending), notify: false });
        logSendWarn('resume_reconcile_remote_missing', buildSendDebugFields({
          state: localOnlyState,
          storageKey,
          ownership: getActiveTabDebugState?.() || undefined,
          sendAttemptId: null,
          extra: {
            source: 'remote_missing_reset_local',
            staleDraftId: localDraftID,
            status,
          },
        }));
        return stateManager.getState();
      }
      logSendWarn('resume_reconcile_failed', buildSendDebugFields({
        state: localState,
        storageKey,
        ownership: getActiveTabDebugState?.() || undefined,
        sendAttemptId: null,
        extra: {
          source: 'reconcile_failed_keep_local',
          staleDraftId: localDraftID,
          status,
        },
      }));
      return stateManager.getState();
    }
  }

  function textElement(id: string): HTMLElement | null {
    return document.getElementById(id);
  }

  function showResumeDialog(): void {
    const modal = document.getElementById('resume-dialog-modal');
    const state = stateManager.getState();
    const resumeDocumentName = String(state?.document?.title || '').trim()
      || String(state?.document?.id || '').trim()
      || 'Unknown document';

    const title = textElement('resume-draft-title');
    const documentName = textElement('resume-draft-document');
    const step = textElement('resume-draft-step');
    const time = textElement('resume-draft-time');

    if (title) title.textContent = state.details?.title || 'Untitled Agreement';
    if (documentName) documentName.textContent = resumeDocumentName;
    if (step) step.textContent = String(state.currentStep || 1);
    if (time) time.textContent = formatRelativeTime(state.updatedAt);

    modal?.classList.remove('hidden');
    emitWizardTelemetry('wizard_resume_prompt_shown', {
      step: Number(state.currentStep || 1),
      has_server_draft: Boolean(state.serverDraftId),
    });
  }

  async function clearSavedResumeState(options: { deleteServerDraft?: boolean } = {}): Promise<void> {
    const deleteServerDraft = options.deleteServerDraft === true;
    const staleServerDraftID = String(stateManager.getState()?.serverDraftId || '').trim();

    stateManager.clear();
    syncOrchestrator.broadcastStateUpdate();
    if (staleServerDraftID) {
      syncOrchestrator.broadcastDraftDisposed?.(staleServerDraftID, deleteServerDraft ? 'resume_clear_delete' : 'resume_clear_local');
    }

    if (!deleteServerDraft || !staleServerDraftID) {
      return;
    }
    try {
      await syncService.dispose(staleServerDraftID);
    } catch (error: unknown) {
      console.warn('Failed to delete server draft:', error);
    }
  }

  function collectCurrentFormSnapshot(): ResumeWizardState {
    return stateManager.normalizeLoadedState({
      ...stateManager.getState(),
      ...stateManager.collectFormState(),
      syncPending: true,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
    });
  }

  function persistSnapshotIfMeaningful(snapshot: ResumeWizardState): void {
    if (!hasMeaningfulWizardProgress(snapshot)) {
      return;
    }
    stateManager.setState(snapshot, { syncPending: true });
    syncOrchestrator.scheduleSync();
    syncOrchestrator.broadcastStateUpdate();
  }

  async function handleResumeAction(action: ResumeAction): Promise<void> {
    document.getElementById('resume-dialog-modal')?.classList.add('hidden');
    const currentSnapshot = collectCurrentFormSnapshot();

    switch (action) {
      case 'continue':
        if (!String(stateManager.getState()?.serverDraftId || '').trim() && hasMeaningfulWizardProgress(currentSnapshot)) {
          await syncService.create(currentSnapshot);
        }
        applyResumedState(stateManager.getState());
        return;
      case 'start_new':
        await clearSavedResumeState({ deleteServerDraft: false });
        if (hasMeaningfulWizardProgress(currentSnapshot)) {
          await syncService.create(currentSnapshot);
        } else {
          await reconcileBootstrapState();
        }
        applyResumedState(stateManager.getState());
        return;
      case 'proceed':
        await clearSavedResumeState({ deleteServerDraft: true });
        if (hasMeaningfulWizardProgress(currentSnapshot)) {
          await syncService.create(currentSnapshot);
        } else {
          await reconcileBootstrapState();
        }
        applyResumedState(stateManager.getState());
        return;
      case 'discard':
        await clearSavedResumeState({ deleteServerDraft: true });
        await reconcileBootstrapState();
        applyResumedState(stateManager.getState());
        return;
      default:
        return;
    }
  }

  function bindEvents(): void {
    document.getElementById('resume-continue-btn')?.addEventListener('click', () => {
      void handleResumeAction('continue');
    });
    document.getElementById('resume-proceed-btn')?.addEventListener('click', () => {
      void handleResumeAction('proceed');
    });
    document.getElementById('resume-new-btn')?.addEventListener('click', () => {
      void handleResumeAction('start_new');
    });
    document.getElementById('resume-discard-btn')?.addEventListener('click', () => {
      void handleResumeAction('discard');
    });
  }

  async function maybeShowResumeDialog(): Promise<void> {
    if (isEditMode) return;
    await reconcileBootstrapState();
    if (!stateManager.hasResumableState()) return;
    showResumeDialog();
  }

  return {
    bindEvents,
    reconcileBootstrapState,
    maybeShowResumeDialog,
  };
}
