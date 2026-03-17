import type { AgreementProgressState, AgreementTitleSourceShape } from './bootstrap-config';
import type { AgreementFormRefs } from './refs';
import type { ParticipantStateRecord, ParticipantsController } from './participants';
import type { FieldDefinitionsController } from './field-definitions';
import type { PlacementEditorController } from './placement-editor';
import type { DocumentPreviewCard } from './preview-card';
import type { WizardNavigationController } from './wizard-navigation';
import type { FieldRuleState, NormalizedPlacementInstance, ReviewConfigState } from './contracts';

interface FieldDefinitionStateRecord {
  tempId: string;
  type: string;
  participantTempId: string;
  page: number;
  required: boolean;
}

interface AgreementDetailsState {
  title?: unknown;
  message?: unknown;
}

interface AgreementStateShape extends AgreementProgressState {
  document?: {
    id?: string | null;
    title?: string | null;
    pageCount?: number | null;
  } | null;
  details?: AgreementDetailsState | null;
  participants?: ParticipantStateRecord[];
  fieldDefinitions?: FieldDefinitionStateRecord[];
  fieldRules?: FieldRuleState[];
  fieldPlacements?: NormalizedPlacementInstance[];
  review?: Partial<ReviewConfigState> | null;
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
  reviewConfigController: {
    restoreFromState(state: { review?: Partial<ReviewConfigState> | null } | null | undefined): void;
  };
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
  applyStateToUI(
    state: AgreementStateShape | null | undefined,
    options?: {
      step?: number;
      updatePreview?: boolean;
      silent?: boolean;
    },
  ): void;
  renderInitialWizardUI(): void;
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
    reviewConfigController,
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
  let isApplyingState = false;

  function withStateApplicationGuard<T>(callback: () => T): T {
    isApplyingState = true;
    try {
      return callback();
    } finally {
      isApplyingState = false;
    }
  }

  function restoreDocumentState(state: AgreementStateShape | null | undefined): void {
    const documentState = state?.document;
    const selectedDoc = document.getElementById('selected-document');
    const docPicker = document.getElementById('document-picker');
    const docInfo = document.getElementById('selected-document-info');

    documentIdInput.value = String(documentState?.id || '').trim();
    if (documentPageCountInput) {
      const pageCount = parsePositiveInt(documentState?.pageCount, 0) || 0;
      documentPageCountInput.value = pageCount > 0 ? String(pageCount) : '';
    }
    if (selectedDocumentTitle) {
      selectedDocumentTitle.textContent = String(documentState?.title || '').trim();
    }
    if (docInfo instanceof HTMLElement) {
      const pageCount = parsePositiveInt(documentState?.pageCount, 0) || 0;
      docInfo.textContent = pageCount > 0 ? `${pageCount} pages` : '';
    }

    if (documentIdInput.value) {
      selectedDoc?.classList.remove('hidden');
      docPicker?.classList.add('hidden');
      return;
    }

    selectedDoc?.classList.add('hidden');
    docPicker?.classList.remove('hidden');
  }

  function restoreDetailsState(state: AgreementStateShape | null | undefined): void {
    agreementRefs.form.titleInput.value = String(state?.details?.title || '');
    agreementRefs.form.messageInput.value = String(state?.details?.message || '');
  }

  function debouncedTrackChanges(): void {
    if (isApplyingState) return;
    if (trackingTimeout !== null) clearTimeout(trackingTimeout);
    trackingTimeout = setTimeout(() => {
      trackWizardStateChanges();
    }, 500);
  }

  function restoreParticipantsFromState(state: AgreementStateShape | null | undefined): void {
    participantsController.restoreFromState(state);
  }

  function restoreFieldDefinitionsFromState(state: AgreementStateShape | null | undefined): void {
    fieldDefinitionsController.restoreFieldDefinitionsFromState(state);
  }

  function restoreFieldRulesFromState(state: AgreementStateShape | null | undefined): void {
    fieldDefinitionsController.restoreFieldRulesFromState(state);
  }

  function restoreFieldPlacementsFromState(state: AgreementStateShape | null | undefined): void {
    placementController.restoreFieldPlacementsFromState(state);
  }

  function restoreReviewState(state: AgreementStateShape | null | undefined): void {
    reviewConfigController.restoreFromState(state);
  }

  function bindChangeTracking(): void {
    if (documentIdInput) {
      const observer = new MutationObserver(() => {
        if (isApplyingState) return;
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

  function applyStateToUI(
    state: AgreementStateShape | null | undefined,
    options: {
      step?: number;
      updatePreview?: boolean;
      silent?: boolean;
    } = {},
  ): void {
    withStateApplicationGuard(() => {
      restoreDocumentState(state);
      restoreDetailsState(state);
      restoreParticipantsFromState(state);
      restoreFieldDefinitionsFromState(state);
      restoreFieldRulesFromState(state);
      updateFieldParticipantOptions();
      restoreFieldPlacementsFromState(state);
      restoreReviewState(state);

      if (options.updatePreview !== false) {
        const documentState = state?.document;
        if (documentState?.id) {
          previewCard.setDocument(
            documentState.id,
            documentState.title || null,
            documentState.pageCount ?? null,
          );
        } else {
          previewCard.clear();
        }
      }

      const nextStep = parsePositiveInt(
        options.step ?? state?.currentStep,
        wizardNavigationController.getCurrentStep(),
      ) || 1;
      wizardNavigationController.setCurrentStep(nextStep);
      wizardNavigationController.updateWizardUI();
    });
  }

  function renderInitialWizardUI(): void {
    wizardNavigationController.updateWizardUI();

    if (documentIdInput.value) {
      const docTitle = selectedDocumentTitle?.textContent || null;
      const docPages = parsePositiveInt(documentPageCountInput?.value, 0) || null;
      previewCard.setDocument(documentIdInput.value, docTitle, docPages);
    } else {
      previewCard.clear();
    }

    if (isEditMode) {
      agreementRefs.sync.indicator?.classList.add('hidden');
    }
  }

  return {
    bindChangeTracking,
    debouncedTrackChanges,
    applyStateToUI,
    renderInitialWizardUI,
  };
}
