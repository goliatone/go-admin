interface RuntimeActionsStateShape {
  serverDraftId?: string;
  serverRevision?: number;
  syncPending?: boolean;
  [key: string]: unknown;
}

interface RuntimeActionsStateManager {
  collectFormState(): Record<string, unknown>;
  updateState(nextState: Record<string, unknown>): void;
  getState(): RuntimeActionsStateShape;
  clear(): void;
  setState(nextState: RuntimeActionsStateShape, options?: Record<string, unknown>): void;
}

interface RuntimeActionsSyncService {
  delete(draftId: string): Promise<unknown>;
  load(draftId: string): Promise<{ id: string; revision: number; wizard_state?: RuntimeActionsStateShape | null }>;
}

interface RuntimeActionsSyncOrchestrator {
  scheduleSync(): void;
  broadcastStateUpdate(): void;
  manualRetry(): Promise<Record<string, unknown>> | Record<string, unknown>;
  performSync(): Promise<Record<string, unknown>>;
  takeControl(): boolean;
}

interface RuntimeActionsControllerOptions {
  createSuccess?: boolean;
  stateManager: RuntimeActionsStateManager;
  syncOrchestrator: RuntimeActionsSyncOrchestrator;
  syncService: RuntimeActionsSyncService;
  applyStateToUI(state: RuntimeActionsStateShape): void;
  surfaceSyncOutcome(
    resultPromise: Promise<Record<string, unknown>> | Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> | Record<string, unknown>;
  announceError(message: string, code?: string): void;
  getCurrentStep(): number;
  reviewStep: number;
  onReviewStepRequested(): void;
  updateActiveTabOwnershipUI(state?: Record<string, unknown>): void;
}

export function createAgreementRuntimeActionsController(options: RuntimeActionsControllerOptions) {
  const {
    createSuccess,
    stateManager,
    syncOrchestrator,
    syncService,
    applyStateToUI,
    surfaceSyncOutcome,
    announceError,
    getCurrentStep,
    reviewStep,
    onReviewStepRequested,
    updateActiveTabOwnershipUI,
  } = options;

  function trackWizardStateChanges() {
    const formState = stateManager.collectFormState();
    stateManager.updateState(formState);
    syncOrchestrator.scheduleSync();
    syncOrchestrator.broadcastStateUpdate();
  }

  function handleCreateSuccessCleanup() {
    if (!createSuccess) {
      return;
    }
    const state = stateManager.getState();
    const serverDraftId = state?.serverDraftId;
    stateManager.clear();
    syncOrchestrator.broadcastStateUpdate();

    if (serverDraftId) {
      syncService.delete(serverDraftId).catch((error: unknown) => {
        console.warn('Failed to delete server draft after successful create:', error);
      });
    }
  }

  function bindRetryAndConflictHandlers() {
    document.getElementById('sync-retry-btn')?.addEventListener('click', async () => {
      await surfaceSyncOutcome(syncOrchestrator.manualRetry(), {
        errorMessage: 'Unable to sync latest draft changes. Please try again.',
      });
    });

    document.getElementById('conflict-reload-btn')?.addEventListener('click', async () => {
      const state = stateManager.getState();
      if (state.serverDraftId) {
        try {
          const serverDraft = await syncService.load(state.serverDraftId);
          if (serverDraft.wizard_state) {
            const nextState = {
              ...serverDraft.wizard_state,
              serverDraftId: serverDraft.id,
              serverRevision: serverDraft.revision,
              syncPending: false,
            };
            stateManager.setState(nextState, { syncPending: false });
            applyStateToUI(nextState);
          }
        } catch (error: unknown) {
          console.error('Failed to load server draft:', error);
        }
      }
      document.getElementById('conflict-dialog-modal')?.classList.add('hidden');
    });

    document.getElementById('conflict-force-btn')?.addEventListener('click', async () => {
      const serverRevision = parseInt(document.getElementById('conflict-server-revision')?.textContent || '0', 10);
      stateManager.setState({
        ...stateManager.getState(),
        serverRevision,
        syncPending: true,
      }, { syncPending: true });
      const syncResult = await surfaceSyncOutcome(syncOrchestrator.performSync(), {
        errorMessage: 'Unable to sync latest draft changes. Please try again.',
      });
      if (syncResult?.success || syncResult?.skipped) {
        document.getElementById('conflict-dialog-modal')?.classList.add('hidden');
      }
    });

    document.getElementById('conflict-dismiss-btn')?.addEventListener('click', () => {
      document.getElementById('conflict-dialog-modal')?.classList.add('hidden');
    });
  }

  function bindOwnershipHandlers() {
    document.getElementById('active-tab-take-control-btn')?.addEventListener('click', async () => {
      if (!syncOrchestrator.takeControl()) {
        announceError('This agreement is active in another tab. Take control here before saving or sending.', 'ACTIVE_TAB_OWNERSHIP_REQUIRED');
        return;
      }
      updateActiveTabOwnershipUI({ isOwner: true });
      if (stateManager.getState()?.syncPending) {
        await surfaceSyncOutcome(syncOrchestrator.manualRetry(), {
          errorMessage: 'Unable to sync latest draft changes. Please try again.',
        });
      }
      if (getCurrentStep() === reviewStep) {
        onReviewStepRequested();
      }
    });

    document.getElementById('active-tab-reload-btn')?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  return {
    bindOwnershipHandlers,
    bindRetryAndConflictHandlers,
    handleCreateSuccessCleanup,
    trackWizardStateChanges,
  };
}
