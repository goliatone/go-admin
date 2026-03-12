// @ts-nocheck

export function createAgreementStateBindingController(options = {}) {
  const {
    titleSource,
    stateManager,
    trackWizardStateChanges,
    participantsController,
    fieldDefinitionsController,
    placementController,
    updateFieldParticipantOptions,
    previewCard,
    wizardNavigationController,
    documentIdInput,
    documentPageCountInput,
    selectedDocumentTitle,
    agreementRefs,
    parsePositiveInt,
    isEditMode,
  } = options;

  let trackingTimeout = null;

  function debouncedTrackChanges() {
    if (trackingTimeout) clearTimeout(trackingTimeout);
    trackingTimeout = setTimeout(() => {
      trackWizardStateChanges();
    }, 500);
  }

  function restoreParticipantsFromState() {
    participantsController.restoreFromState(stateManager.getState());
  }

  function restoreFieldDefinitionsFromState() {
    fieldDefinitionsController.restoreFieldDefinitionsFromState(stateManager.getState());
  }

  function restoreFieldRulesFromState() {
    fieldDefinitionsController.restoreFieldRulesFromState(stateManager.getState());
  }

  function restoreFieldPlacementsFromState() {
    placementController.restoreFieldPlacementsFromState(stateManager.getState());
  }

  function bindChangeTracking() {
    if (documentIdInput) {
      const observer = new MutationObserver(() => {
        trackWizardStateChanges();
      });
      observer.observe(documentIdInput, { attributes: true, attributeFilter: ['value'] });
    }

    const titleInput = document.getElementById('title');
    const messageInput = document.getElementById('message');

    titleInput?.addEventListener('input', () => {
      const nextSource = String(titleInput?.value || '').trim() === ''
        ? titleSource.AUTOFILL
        : titleSource.USER;
      stateManager.setTitleSource(nextSource);
      debouncedTrackChanges();
    });
    messageInput?.addEventListener('input', debouncedTrackChanges);

    participantsController.refs.participantsContainer.addEventListener('input', debouncedTrackChanges);
    participantsController.refs.participantsContainer.addEventListener('change', debouncedTrackChanges);

    fieldDefinitionsController.refs.fieldDefinitionsContainer.addEventListener('input', debouncedTrackChanges);
    fieldDefinitionsController.refs.fieldDefinitionsContainer.addEventListener('change', debouncedTrackChanges);
    fieldDefinitionsController.refs.fieldRulesContainer?.addEventListener('input', debouncedTrackChanges);
    fieldDefinitionsController.refs.fieldRulesContainer?.addEventListener('change', debouncedTrackChanges);
  }

  function renderInitialWizardUI() {
    if (window._resumeToStep) {
      restoreParticipantsFromState();
      restoreFieldDefinitionsFromState();
      restoreFieldRulesFromState();
      updateFieldParticipantOptions();
      restoreFieldPlacementsFromState();

      const state = stateManager.getState();
      if (state.document?.id) {
        previewCard.setDocument(state.document.id, state.document.title, state.document.pageCount);
      }

      wizardNavigationController.setCurrentStep(window._resumeToStep);
      wizardNavigationController.updateWizardUI();
      delete window._resumeToStep;
    } else {
      wizardNavigationController.updateWizardUI();

      if (documentIdInput.value) {
        const docTitle = selectedDocumentTitle?.textContent || null;
        const docPages = parsePositiveInt(documentPageCountInput.value, null);
        previewCard.setDocument(documentIdInput.value, docTitle, docPages);
      }
    }

    if (isEditMode) {
      agreementRefs.sync.indicator?.classList.add('hidden');
    }
  }

  return {
    bindChangeTracking,
    debouncedTrackChanges,
    renderInitialWizardUI,
  };
}
