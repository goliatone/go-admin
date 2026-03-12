import type { AgreementTitleSourceShape } from './bootstrap-config';
import type { AgreementFormRefs } from './refs';
import type { ParticipantsController } from './participants';
import type { FieldDefinitionsController } from './field-definitions';
import type { PlacementEditorController } from './placement-editor';
import type { DocumentPreviewCard } from './preview-card';
import type { WizardNavigationController } from './wizard-navigation';

interface AgreementStateShape {
  document?: {
    id?: string | null;
    title?: string | null;
    pageCount?: number | null;
  } | null;
}

interface StateBindingStateManager {
  getState(): AgreementStateShape;
  setTitleSource(source: string): void;
}

interface StateBindingControllerOptions {
  titleSource: AgreementTitleSourceShape;
  stateManager: StateBindingStateManager;
  trackWizardStateChanges(): void;
  participantsController: ParticipantsController;
  fieldDefinitionsController: FieldDefinitionsController;
  placementController: PlacementEditorController;
  updateFieldParticipantOptions(): void;
  previewCard: DocumentPreviewCard;
  wizardNavigationController: WizardNavigationController;
  documentIdInput: HTMLInputElement;
  documentPageCountInput: HTMLInputElement | null;
  selectedDocumentTitle: HTMLElement | null;
  agreementRefs: AgreementFormRefs;
  parsePositiveInt(value: unknown, fallback?: number): number;
  isEditMode: boolean;
}

export interface AgreementStateBindingController {
  bindChangeTracking(): void;
  debouncedTrackChanges(): void;
  renderInitialWizardUI(): void;
}

declare global {
  interface Window {
    _resumeToStep?: number;
  }
}

export function createAgreementStateBindingController(
  options: StateBindingControllerOptions,
): AgreementStateBindingController {
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

  let trackingTimeout: ReturnType<typeof setTimeout> | null = null;

  function debouncedTrackChanges(): void {
    if (trackingTimeout !== null) clearTimeout(trackingTimeout);
    trackingTimeout = setTimeout(() => {
      trackWizardStateChanges();
    }, 500);
  }

  function restoreParticipantsFromState(): void {
    participantsController.restoreFromState(stateManager.getState());
  }

  function restoreFieldDefinitionsFromState(): void {
    fieldDefinitionsController.restoreFieldDefinitionsFromState(stateManager.getState());
  }

  function restoreFieldRulesFromState(): void {
    fieldDefinitionsController.restoreFieldRulesFromState(stateManager.getState());
  }

  function restoreFieldPlacementsFromState(): void {
    placementController.restoreFieldPlacementsFromState(stateManager.getState());
  }

  function bindChangeTracking(): void {
    if (documentIdInput) {
      const observer = new MutationObserver(() => {
        trackWizardStateChanges();
      });
      observer.observe(documentIdInput, { attributes: true, attributeFilter: ['value'] });
    }

    const titleInput = document.getElementById('title');
    const messageInput = document.getElementById('message');

    if (titleInput instanceof HTMLInputElement) {
      titleInput.addEventListener('input', () => {
        const nextSource = String(titleInput.value || '').trim() === ''
          ? titleSource.AUTOFILL
          : titleSource.USER;
        stateManager.setTitleSource(nextSource);
        debouncedTrackChanges();
      });
    }

    if (messageInput instanceof HTMLInputElement || messageInput instanceof HTMLTextAreaElement) {
      messageInput.addEventListener('input', debouncedTrackChanges);
    }

    participantsController.refs.participantsContainer?.addEventListener('input', debouncedTrackChanges);
    participantsController.refs.participantsContainer?.addEventListener('change', debouncedTrackChanges);

    fieldDefinitionsController.refs.fieldDefinitionsContainer?.addEventListener('input', debouncedTrackChanges);
    fieldDefinitionsController.refs.fieldDefinitionsContainer?.addEventListener('change', debouncedTrackChanges);
    fieldDefinitionsController.refs.fieldRulesContainer?.addEventListener('input', debouncedTrackChanges);
    fieldDefinitionsController.refs.fieldRulesContainer?.addEventListener('change', debouncedTrackChanges);
  }

  function renderInitialWizardUI(): void {
    if (window._resumeToStep) {
      restoreParticipantsFromState();
      restoreFieldDefinitionsFromState();
      restoreFieldRulesFromState();
      updateFieldParticipantOptions();
      restoreFieldPlacementsFromState();

      const state = stateManager.getState();
      if (state.document?.id) {
        previewCard.setDocument(
          state.document.id,
          state.document.title || null,
          state.document.pageCount ?? null,
        );
      }

      wizardNavigationController.setCurrentStep(window._resumeToStep);
      wizardNavigationController.updateWizardUI();
      delete window._resumeToStep;
    } else {
      wizardNavigationController.updateWizardUI();

      if (documentIdInput.value) {
        const docTitle = selectedDocumentTitle?.textContent || null;
        const docPages = parsePositiveInt(documentPageCountInput?.value, 0) || null;
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
