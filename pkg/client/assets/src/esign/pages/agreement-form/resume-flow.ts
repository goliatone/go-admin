// @ts-nocheck

export function createAgreementResumeController(options = {}) {
  const {
    isEditMode,
    stateManager,
    syncOrchestrator,
    syncService,
    hasMeaningfulWizardProgress,
    formatRelativeTime,
    emitWizardTelemetry,
  } = options;

  function mergeUnsyncedLocalOntoServer(localState, serverState) {
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

  async function reconcileBootstrapState() {
    if (isEditMode) return stateManager.getState();
    const localState = stateManager.normalizeLoadedState(stateManager.getState());
    const localDraftID = String(localState?.serverDraftId || '').trim();
    if (!localDraftID) {
      stateManager.setState(localState, { syncPending: Boolean(localState.syncPending), notify: false });
      return stateManager.getState();
    }

    try {
      const serverDraft = await syncService.load(localDraftID);
      const serverState = stateManager.normalizeLoadedState({
        ...(serverDraft?.wizard_state && typeof serverDraft.wizard_state === 'object' ? serverDraft.wizard_state : {}),
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
      return stateManager.getState();
    } catch (error) {
      if (Number(error?.status || 0) === 404) {
        const localOnlyState = stateManager.normalizeLoadedState({
          ...localState,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null,
        });
        stateManager.setState(localOnlyState, { syncPending: Boolean(localOnlyState.syncPending), notify: false });
        return stateManager.getState();
      }
      return stateManager.getState();
    }
  }

  function showResumeDialog() {
    const modal = document.getElementById('resume-dialog-modal');
    const state = stateManager.getState();
    const resumeDocumentName = String(state?.document?.title || '').trim()
      || String(state?.document?.id || '').trim()
      || 'Unknown document';

    document.getElementById('resume-draft-title').textContent = state.details.title || 'Untitled Agreement';
    document.getElementById('resume-draft-document').textContent = resumeDocumentName;
    document.getElementById('resume-draft-step').textContent = state.currentStep;
    document.getElementById('resume-draft-time').textContent = formatRelativeTime(state.updatedAt);

    modal?.classList.remove('hidden');
    emitWizardTelemetry('wizard_resume_prompt_shown', {
      step: Number(state.currentStep || 1),
      has_server_draft: Boolean(state.serverDraftId),
    });
  }

  async function clearSavedResumeState(options = {}) {
    const deleteServerDraft = options.deleteServerDraft === true;
    const staleServerDraftID = String(stateManager.getState()?.serverDraftId || '').trim();

    stateManager.clear();
    syncOrchestrator.broadcastStateUpdate();

    if (!deleteServerDraft || !staleServerDraftID) {
      return;
    }
    try {
      await syncService.delete(staleServerDraftID);
    } catch (error) {
      console.warn('Failed to delete server draft:', error);
    }
  }

  function collectCurrentFormSnapshot() {
    return stateManager.normalizeLoadedState({
      ...stateManager.getState(),
      ...stateManager.collectFormState(),
      syncPending: true,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
    });
  }

  function persistSnapshotIfMeaningful(snapshot) {
    if (!hasMeaningfulWizardProgress(snapshot)) {
      return;
    }
    stateManager.setState(snapshot, { syncPending: true });
    syncOrchestrator.scheduleSync();
    syncOrchestrator.broadcastStateUpdate();
  }

  async function handleResumeAction(action) {
    document.getElementById('resume-dialog-modal')?.classList.add('hidden');
    const currentSnapshot = collectCurrentFormSnapshot();

    switch (action) {
      case 'continue':
        stateManager.restoreFormState();
        window._resumeToStep = stateManager.getState().currentStep;
        return;
      case 'start_new':
        await clearSavedResumeState({ deleteServerDraft: false });
        persistSnapshotIfMeaningful(currentSnapshot);
        return;
      case 'proceed':
        await clearSavedResumeState({ deleteServerDraft: true });
        persistSnapshotIfMeaningful(currentSnapshot);
        return;
      case 'discard':
        await clearSavedResumeState({ deleteServerDraft: true });
        return;
      default:
        return;
    }
  }

  function bindEvents() {
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

  async function maybeShowResumeDialog() {
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
