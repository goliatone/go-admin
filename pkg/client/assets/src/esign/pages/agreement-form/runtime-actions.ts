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
  dispose(draftId: string): Promise<unknown>;
  load(draftId: string): Promise<{ id: string; revision: number; wizard_state?: RuntimeActionsStateShape | null }>;
}

interface RuntimeActionsSyncOrchestrator {
  scheduleSync(): void;
  broadcastStateUpdate(): void;
  broadcastDraftDisposed?(draftId: string, reason?: string): void;
  refreshCurrentDraft?(options?: { preserveDirty?: boolean; force?: boolean }): Promise<Record<string, unknown>>;
  manualRetry(): Promise<Record<string, unknown>> | Record<string, unknown>;
  performSync(): Promise<Record<string, unknown>>;
}

interface RuntimeActionsControllerOptions {
  createSuccess?: boolean;
  enableServerSync?: boolean;
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
}

export function createAgreementRuntimeActionsController(options: RuntimeActionsControllerOptions) {
  const {
    createSuccess,
    enableServerSync = true,
    stateManager,
    syncOrchestrator,
    syncService,
    applyStateToUI,
    surfaceSyncOutcome,
    announceError,
    getCurrentStep,
    reviewStep,
    onReviewStepRequested,
  } = options;

  function trackWizardStateChanges() {
    const formState = stateManager.collectFormState();
    if (!enableServerSync) {
      stateManager.setState({
        ...stateManager.getState(),
        ...formState,
        syncPending: false,
      }, { syncPending: false });
      return;
    }
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
      syncOrchestrator.broadcastDraftDisposed?.(serverDraftId, 'agreement_created');
      syncService.dispose(serverDraftId).catch((error: unknown) => {
        console.warn('Failed to dispose sync draft after successful create:', error);
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
      if (syncOrchestrator.refreshCurrentDraft) {
        await syncOrchestrator.refreshCurrentDraft({ preserveDirty: false, force: true });
        applyStateToUI(stateManager.getState());
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

  return {
    bindRetryAndConflictHandlers,
    handleCreateSuccessCleanup,
    trackWizardStateChanges,
  };
}
