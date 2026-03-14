import {
  PLACEMENT_SOURCE,
  TOTAL_WIZARD_STEPS,
  WIZARD_NEXT_STEP_LABELS,
  WIZARD_STEP,
} from './constants';
import { createPreviewCard } from './preview-card';
import { bootAgreementFormRuntime } from './boot';
import type {
  AgreementFormContext,
  NormalizedAgreementFormConfig,
  AgreementFormRuntime,
} from './context';
import { collectAgreementFormRefs } from './refs';
import { createCoordinationBannerController } from './ownership-ui';
import { WizardStateManager } from './state-manager';
import { DraftSyncService } from './draft-sync-service';
import { ActiveTabController } from './active-tab-controller';
import { SyncController } from './sync-controller';
import { createAgreementTelemetryEmitter } from './telemetry';
import { createSendReadinessController } from './send-readiness';
import { createWizardNavigationController } from './wizard-navigation';
import { createAgreementFormSubmitController } from './form-submit';
import { createDocumentSelectionController } from './document-selection';
import { createParticipantsController } from './participants';
import { createFieldDefinitionsController } from './field-definitions';
import { createPlacementEditorController } from './placement-editor';
import { createAgreementFormPayloadBuilder } from './form-payload';
import { createAgreementStateBindingController } from './state-binding';
import { createAgreementWizardValidationController } from './wizard-validation';
import { createAgreementResumeController } from './resume-flow';
import { createAgreementFeedbackController } from './feedback';
import { createAgreementRuntimeActionsController } from './runtime-actions';
import {
  type AgreementFormRuntimeInputConfig,
  type AgreementProgressState,
  type AgreementTitleSourceShape,
  createAgreementWizardPersistenceSettings,
  createSyncRequestHeaders,
  hasMeaningfulWizardProgress,
  normalizeAgreementFormConfig,
  normalizeAgreementTitleSource,
} from './bootstrap-config';
import { createLinkGroupState } from './linked-placement';
import type { LinkGroupState, ExpandedRuleField, FieldRuleFormPayload, FieldRuleState, NormalizedPlacementInstance } from './contracts';
import { parsePositiveInt } from './normalization';
import { escapeHtml, showToast } from './ui-utils';
import type { ParticipantStateRecord, ParticipantsController, SignerParticipantSummary } from './participants';
import type { FieldDefinitionsController } from './field-definitions';
import type { PlacementEditorController } from './placement-editor';
import type { AgreementStateBindingController } from './state-binding';
import type { AgreementWizardValidationController } from './wizard-validation';
import type { AgreementResumeController } from './resume-flow';
import type { AgreementFeedbackController, AgreementFeedbackAPIError } from './feedback';
import type { DocumentSelectionController } from './document-selection';
import type { WizardNavigationController } from './wizard-navigation';
import type { SendReadinessController } from './send-readiness';
import type { AgreementFormSubmitController } from './form-submit';
import type { AgreementTelemetryEmitter } from './telemetry';

interface CoordinatorWizardDocumentState {
  id?: string | null;
  title?: string | null;
  pageCount?: number | null;
}

interface CoordinatorWizardDetailsState {
  title?: string;
  message?: string;
}

interface CoordinatorWizardFieldDefinitionState {
  tempId: string;
  type: string;
  participantTempId: string;
  page: number;
  required: boolean;
}

interface CoordinatorWizardState extends AgreementProgressState {
  document?: CoordinatorWizardDocumentState | null;
  details?: CoordinatorWizardDetailsState | null;
  participants?: ParticipantStateRecord[];
  fieldDefinitions?: CoordinatorWizardFieldDefinitionState[];
  titleSource?: unknown;
  updatedAt?: string | null;
  syncPending?: boolean;
  serverDraftId?: string | null;
  serverRevision?: number;
  lastSyncedAt?: string | null;
  fieldPlacements?: NormalizedPlacementInstance[];
  fieldRules?: FieldRuleState[];
}

function requireElement<T>(value: T | null | undefined, label: string): T {
  if (!value) {
    throw new Error(`Agreement form boot failed: missing required ${label}`);
  }
  return value;
}

function requireButton(value: HTMLElement | null | undefined, label: string): HTMLButtonElement {
  if (!(value instanceof HTMLButtonElement)) {
    throw new Error(`Agreement form boot failed: missing required ${label}`);
  }
  return value;
}

export function createAgreementFormRuntimeCoordinator(
  inputConfig: AgreementFormRuntimeInputConfig = {},
): AgreementFormRuntime {
  const {
    config,
    normalizedConfig,
    syncConfig,
    basePath,
    apiBase,
    apiVersionBase,
    isEditMode,
    createSuccess,
    submitMode,
    documentsUploadURL,
    initialParticipants,
    initialFieldInstances,
  } = normalizeAgreementFormConfig(inputConfig);
  const agreementRefs = collectAgreementFormRefs(document);
  const {
    WIZARD_STATE_VERSION,
    WIZARD_STORAGE_KEY,
    WIZARD_CHANNEL_NAME,
    SYNC_DEBOUNCE_MS,
    SYNC_RETRY_DELAYS,
    TITLE_SOURCE,
  } = createAgreementWizardPersistenceSettings({
    config,
    isEditMode,
  });

  const emitWizardTelemetry: AgreementTelemetryEmitter = createAgreementTelemetryEmitter();
  const normalizeTitleSource = (value: unknown, fallback: string = TITLE_SOURCE.AUTOFILL): string =>
    normalizeAgreementTitleSource(value, fallback);
  const hasMeaningfulProgress = (state: CoordinatorWizardState | null | undefined): boolean => hasMeaningfulWizardProgress(state, {
    normalizeTitleSource,
    titleSource: TITLE_SOURCE,
  });
  const previewCard = createPreviewCard({
    apiBasePath: apiVersionBase,
    basePath,
  });

  const form = agreementRefs.form.root;
  const submitBtn = requireButton(agreementRefs.form.submitBtn, 'submit button');
  const formAnnouncements = agreementRefs.form.announcements;

  let participantsController: ParticipantsController | null = null;
  let fieldDefinitionsController: FieldDefinitionsController | null = null;
  let placementController: PlacementEditorController | null = null;
  let stateBindingController: AgreementStateBindingController | null = null;
  let validationController: AgreementWizardValidationController | null = null;
  let resumeController: AgreementResumeController | null = null;
  let feedbackController: AgreementFeedbackController | null = null;
  let runtimeActionsController: ReturnType<typeof createAgreementRuntimeActionsController> | null = null;
  let placementLinkGroupState: LinkGroupState = createLinkGroupState();
  const applyRehydratedState = (
    nextState: CoordinatorWizardState | null | undefined,
    options: { step?: number; updatePreview?: boolean; silent?: boolean } = {},
  ): void => {
    stateBindingController?.applyStateToUI(nextState, options);
  };

  const debouncedTrackChanges = () => stateBindingController?.debouncedTrackChanges?.();
  const trackWizardStateChanges = () => runtimeActionsController?.trackWizardStateChanges?.();
  const formatRelativeTime = (value?: string | null): string => feedbackController?.formatRelativeTime(value) || 'unknown';
  const restoreSyncStatusFromState = (): void => feedbackController?.restoreSyncStatusFromState();
  const updateSyncStatus = (status?: string): void => feedbackController?.updateSyncStatus(status);
  const showSyncConflictDialog = (serverRevision?: number | string): void => feedbackController?.showSyncConflictDialog(serverRevision);
  const mapUserFacingError = (message: string, code = '', status = 0): string =>
    feedbackController?.mapUserFacingError(message, code, status) || String(message || '').trim();
  const parseAPIError = (response: Response, fallbackMessage: string): Promise<AgreementFeedbackAPIError> =>
    feedbackController
      ? feedbackController.parseAPIError(response, fallbackMessage)
      : Promise.resolve({ status: Number(response.status || 0), code: '', details: {}, message: fallbackMessage });
  const announceError = (message: string, code = '', status = 0): void =>
    feedbackController?.announceError(message, code, status);
  const surfaceSyncOutcome = (
    resultPromise: Promise<Record<string, unknown>> | Record<string, unknown>,
    options: { errorMessage?: string } = {},
  ): Promise<Record<string, unknown>> =>
    feedbackController
      ? feedbackController.surfaceSyncOutcome(resultPromise, options)
      : Promise.resolve({});
  const getActiveTabDebugState = () => null;

  const coordinationBanner = createCoordinationBannerController(agreementRefs, {
    formatRelativeTime,
  });
  const updateCoordinationUI = () => coordinationBanner.render({ coordinationAvailable: true });
  const parseControllerAPIError = async (
    response: Response,
    fallbackMessage: string,
  ): Promise<Error & { code?: string; status?: number }> => {
    const apiError = await parseAPIError(response, fallbackMessage);
    const error = new Error(apiError.message) as Error & { code?: string; status?: number };
    error.code = apiError.code;
    error.status = apiError.status;
    return error;
  };
  const documentSelectionStateManager = {
    hasResumableState: (): boolean => stateManager.hasResumableState(),
    setTitleSource: (source: string, options?: { syncPending?: boolean }): void => stateManager.setTitleSource(source, options),
    updateDocument: (doc: { id: string | null; title: string | null; pageCount: number | null }): void => stateManager.updateDocument(doc),
    updateDetails: (details: { title?: string; message?: string }, options?: { titleSource?: string }): void =>
      stateManager.updateDetails(details, options),
    getState: (): { titleSource?: unknown; details: { message?: string } } => {
      const state = stateManager.getState();
      return {
        titleSource: state.titleSource,
        details: state.details && typeof state.details === 'object' ? state.details : {},
      };
    },
  };

  const stateManager = new WizardStateManager({
    storageKey: WIZARD_STORAGE_KEY,
    stateVersion: WIZARD_STATE_VERSION,
    totalWizardSteps: TOTAL_WIZARD_STEPS,
    titleSource: TITLE_SOURCE,
    normalizeTitleSource,
    parsePositiveInt,
    hasMeaningfulWizardProgress: hasMeaningfulProgress,
    collectFormState: (): CoordinatorWizardState => {
      const docId = agreementRefs.form.documentIdInput?.value || null;
      const docTitle = document.getElementById('selected-document-title')?.textContent?.trim() || null;
      const activeTitleSource = normalizeTitleSource(
        stateManager.getState()?.titleSource,
        String(agreementRefs.form.titleInput?.value || '').trim() === '' ? TITLE_SOURCE.AUTOFILL : TITLE_SOURCE.USER,
      );

      return {
        document: {
          id: docId,
          title: docTitle,
          pageCount: parseInt(agreementRefs.form.documentPageCountInput?.value || '0', 10) || null,
        },
        details: {
          title: agreementRefs.form.titleInput?.value || '',
          message: agreementRefs.form.messageInput?.value || '',
        },
        titleSource: activeTitleSource,
        participants: participantsController?.collectParticipantsForState?.() || [],
        fieldDefinitions: fieldDefinitionsController?.collectFieldDefinitionsForState?.() || [],
        fieldPlacements: placementController?.getState?.()?.fieldInstances || [],
        fieldRules: fieldDefinitionsController?.collectFieldRulesForState?.() || [],
      };
    },
    emitTelemetry: emitWizardTelemetry,
  });
  stateManager.start();

  feedbackController = createAgreementFeedbackController({
    agreementRefs,
    formAnnouncements,
    stateManager,
  });

  const syncService = new DraftSyncService({
    stateManager,
    requestHeaders: createSyncRequestHeaders,
    syncConfig,
  });

  let syncOrchestrator: SyncController;
  const activeTabController = new ActiveTabController({
    channelName: WIZARD_CHANNEL_NAME,
    onCoordinationAvailabilityChange: (available) => {
      restoreSyncStatusFromState();
      coordinationBanner.render({ coordinationAvailable: available });
    },
    onRemoteSync: (draftId) => {
      if (String(stateManager.getState()?.serverDraftId || '').trim() !== String(draftId || '').trim()) {
        return;
      }
      if (stateManager.getState()?.syncPending) {
        return;
      }
      void syncOrchestrator?.refreshCurrentDraft({ preserveDirty: true, force: true }).then(() => {
        applyRehydratedState(stateManager.getState() as CoordinatorWizardState, {
          step: Number(stateManager.getState()?.currentStep || 1),
        });
      });
    },
    onRemoteDraftDisposed: (draftId) => {
      if (String(stateManager.getState()?.serverDraftId || '').trim() !== String(draftId || '').trim()) {
        return;
      }
      if (stateManager.getState()?.syncPending) {
        return;
      }
      stateManager.setState({
        ...stateManager.getState(),
        serverDraftId: null,
        serverRevision: 0,
        lastSyncedAt: null,
        resourceRef: null,
      }, {
        notify: true,
        save: true,
        syncPending: false,
      });
    },
    onVisibilityHidden: () => {
      void syncOrchestrator?.forceSync();
    },
    onPageHide: () => {
      void syncOrchestrator?.forceSync();
    },
    onBeforeUnload: () => {
      void syncOrchestrator?.forceSync();
    },
  });

  syncOrchestrator = new SyncController({
    stateManager,
    syncService,
    activeTabController,
    storageKey: WIZARD_STORAGE_KEY,
    statusUpdater: updateSyncStatus,
    showConflictDialog: showSyncConflictDialog,
    syncDebounceMs: SYNC_DEBOUNCE_MS,
    syncRetryDelays: SYNC_RETRY_DELAYS,
    documentRef: document,
    windowRef: window,
  });

  const agreementFormContext: AgreementFormContext = {
    config: normalizedConfig,
    refs: agreementRefs,
    basePath,
    apiBase,
    apiVersionBase,
    previewCard,
    emitTelemetry: emitWizardTelemetry,
    stateManager,
    syncService,
    activeTabController,
    syncController: syncOrchestrator,
  };

  const agreementRuntime = bootAgreementFormRuntime({
    context: agreementFormContext,
    hooks: {
      renderInitialUI() {
        stateBindingController?.renderInitialWizardUI?.();
      },
      startSideEffects() {
        void resumeController?.maybeShowResumeDialog?.();
        void documentSelectionController.loadDocuments();
        void documentSelectionController.loadRecentDocuments();
      },
      destroy() {
        coordinationBanner.destroy();
        stateManager.destroy();
      },
    },
  });

  const documentSelectionController: DocumentSelectionController = createDocumentSelectionController({
    apiBase,
    apiVersionBase,
    documentsUploadURL,
    isEditMode,
    titleSource: TITLE_SOURCE,
    normalizeTitleSource,
    stateManager: documentSelectionStateManager,
    previewCard,
    parseAPIError: parseControllerAPIError,
    announceError,
    showToast,
    mapUserFacingError,
    renderFieldRulePreview: () => fieldDefinitionsController?.renderFieldRulePreview?.(),
  });
  documentSelectionController.initializeTitleSourceSeed();
  documentSelectionController.bindEvents();

  const documentIdInput = requireElement(documentSelectionController.refs.documentIdInput, 'document id input');
  const documentSearch = requireElement(documentSelectionController.refs.documentSearch, 'document search input');
  const selectedDocumentTitle = documentSelectionController.refs.selectedDocumentTitle;
  const documentPageCountInput = documentSelectionController.refs.documentPageCountInput;
  const ensureSelectedDocumentCompatibility = documentSelectionController.ensureSelectedDocumentCompatibility;
  const getCurrentDocumentPageCount = documentSelectionController.getCurrentDocumentPageCount;

  participantsController = createParticipantsController({
    initialParticipants,
    onParticipantsChanged: () => fieldDefinitionsController?.updateFieldParticipantOptions?.(),
  });
  participantsController.initialize();
  participantsController.bindEvents();

  const participantsContainer = requireElement(participantsController.refs.participantsContainer, 'participants container');
  const addParticipantBtn = requireElement(participantsController.refs.addParticipantBtn, 'add participant button');
  const getSignerParticipants = (): SignerParticipantSummary[] => participantsController?.getSignerParticipants() || [];

  fieldDefinitionsController = createFieldDefinitionsController({
    initialFieldInstances,
    placementSource: PLACEMENT_SOURCE,
    getCurrentDocumentPageCount,
    getSignerParticipants,
    escapeHtml,
    onDefinitionsChanged: () => debouncedTrackChanges(),
    onRulesChanged: () => debouncedTrackChanges(),
    onParticipantsChanged: () => fieldDefinitionsController?.updateFieldParticipantOptions?.(),
    getPlacementLinkGroupState: () => placementController?.getLinkGroupState?.() || placementLinkGroupState,
    setPlacementLinkGroupState: (nextState: LinkGroupState | null | undefined) => {
      placementLinkGroupState = nextState || createLinkGroupState();
      placementController?.setLinkGroupState?.(placementLinkGroupState);
    },
  });
  fieldDefinitionsController.bindEvents();
  fieldDefinitionsController.initialize();

  const fieldDefinitionsContainer = requireElement(fieldDefinitionsController.refs.fieldDefinitionsContainer, 'field definitions container');
  const fieldRulesContainer = fieldDefinitionsController.refs.fieldRulesContainer;
  const addFieldBtn = requireElement(fieldDefinitionsController.refs.addFieldBtn, 'add field button');
  const fieldPlacementsJSONInput = fieldDefinitionsController.refs.fieldPlacementsJSONInput;
  const fieldRulesJSONInput = fieldDefinitionsController.refs.fieldRulesJSONInput;
  const collectFieldRulesForState = (): FieldRuleState[] => fieldDefinitionsController?.collectFieldRulesForState() || [];
  const collectFieldRulesForReadiness = (): Record<string, unknown>[] =>
    (fieldDefinitionsController?.collectFieldRulesForState() || []) as unknown as Record<string, unknown>[];
  const collectFieldRulesForForm = (): FieldRuleFormPayload[] => fieldDefinitionsController?.collectFieldRulesForForm() || [];
  const expandRulesForPreview = (rules: Array<Partial<FieldRuleState>>, terminalPage: number): ExpandedRuleField[] =>
    fieldDefinitionsController?.expandRulesForPreview(rules, terminalPage) || [];
  const updateFieldParticipantOptions = (): void => fieldDefinitionsController?.updateFieldParticipantOptions();
  const collectPlacementFieldDefinitions = () => fieldDefinitionsController.collectPlacementFieldDefinitions();
  const getFieldDefinitionById = (definitionId: string) => fieldDefinitionsController?.getFieldDefinitionById(definitionId) || null;
  const findSignersMissingRequiredSignatureField = (): SignerParticipantSummary[] =>
    fieldDefinitionsController?.findSignersMissingRequiredSignatureField() || [];
  const missingSignatureFieldMessage = (missingSigners: SignerParticipantSummary[]): string =>
    fieldDefinitionsController?.missingSignatureFieldMessage(missingSigners) || '';

  const sendReadinessController: SendReadinessController = createSendReadinessController({
    documentIdInput,
    selectedDocumentTitle,
    participantsContainer,
    fieldDefinitionsContainer,
    submitBtn,
    escapeHtml,
    getSignerParticipants,
    getCurrentDocumentPageCount,
    collectFieldRulesForState: collectFieldRulesForReadiness,
    expandRulesForPreview,
    findSignersMissingRequiredSignatureField,
    goToStep: (stepNum) => wizardNavigationController.goToStep(stepNum),
  });

  placementController = createPlacementEditorController({
    apiBase,
    apiVersionBase,
    documentIdInput,
    fieldPlacementsJSONInput,
    initialFieldInstances: fieldDefinitionsController.buildInitialPlacementInstances() as unknown as Array<Record<string, unknown>>,
    initialLinkGroupState: placementLinkGroupState,
    collectPlacementFieldDefinitions,
    getFieldDefinitionById,
    parseAPIError: parseControllerAPIError,
    mapUserFacingError,
    showToast,
    escapeHtml,
    onPlacementsChanged: () => trackWizardStateChanges(),
  });
  placementController.bindEvents();
  placementLinkGroupState = placementController.getLinkGroupState();

  const wizardNavigationController: WizardNavigationController = createWizardNavigationController({
    totalWizardSteps: TOTAL_WIZARD_STEPS,
    wizardStep: WIZARD_STEP,
    nextStepLabels: WIZARD_NEXT_STEP_LABELS,
    submitBtn,
    previewCard,
    updateCoordinationUI,
    validateStep: (stepNum: number) => validationController?.validateStep(stepNum) !== false,
    onPlacementStep() {
      void placementController.initPlacementEditor();
    },
    onReviewStep() {
      sendReadinessController.initSendReadinessCheck();
    },
    onStepChanged(stepNum: number) {
      stateManager.updateStep(stepNum);
      trackWizardStateChanges();
      void syncOrchestrator.forceSync();
    },
  });
  wizardNavigationController.bindEvents();

  runtimeActionsController = createAgreementRuntimeActionsController({
    createSuccess,
    stateManager,
    syncOrchestrator,
    syncService,
    applyStateToUI: (nextState) => applyRehydratedState(nextState as CoordinatorWizardState, {
      step: Number((nextState as CoordinatorWizardState)?.currentStep || 1),
    }),
    surfaceSyncOutcome,
    announceError,
    getCurrentStep: () => wizardNavigationController.getCurrentStep(),
    reviewStep: WIZARD_STEP.REVIEW,
    onReviewStepRequested: () => sendReadinessController.initSendReadinessCheck(),
  });
  runtimeActionsController.handleCreateSuccessCleanup();
  runtimeActionsController.bindRetryAndConflictHandlers();

  const payloadBuilder = createAgreementFormPayloadBuilder({
    documentIdInput,
    documentPageCountInput,
    titleInput: agreementRefs.form.titleInput,
    messageInput: agreementRefs.form.messageInput,
    participantsContainer,
    fieldDefinitionsContainer,
    fieldPlacementsJSONInput,
    fieldRulesJSONInput,
    collectFieldRulesForForm: () => collectFieldRulesForForm() as unknown as Record<string, unknown>[],
    buildPlacementFormEntries: () =>
      (placementController?.buildPlacementFormEntries?.() || []) as unknown as Record<string, unknown>[],
    getCurrentStep: () => wizardNavigationController.getCurrentStep(),
    totalWizardSteps: TOTAL_WIZARD_STEPS,
  });
  const buildCanonicalAgreementPayload = () => payloadBuilder.buildCanonicalAgreementPayload();

  stateBindingController = createAgreementStateBindingController({
    titleSource: TITLE_SOURCE,
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
  });
  stateBindingController.bindChangeTracking();

  validationController = createAgreementWizardValidationController({
    documentIdInput,
    titleInput: agreementRefs.form.titleInput,
    participantsContainer,
    fieldDefinitionsContainer,
    fieldRulesContainer,
    addFieldBtn,
    ensureSelectedDocumentCompatibility,
    collectFieldRulesForState,
    findSignersMissingRequiredSignatureField,
    missingSignatureFieldMessage,
    announceError,
  });

  resumeController = createAgreementResumeController({
    isEditMode,
    storageKey: WIZARD_STORAGE_KEY,
    stateManager,
    syncOrchestrator,
    syncService,
    applyResumedState: (nextState) => applyRehydratedState(nextState as CoordinatorWizardState, {
      step: Number((nextState as CoordinatorWizardState)?.currentStep || 1),
    }),
    hasMeaningfulWizardProgress,
    formatRelativeTime,
    emitWizardTelemetry: (eventName, fields) => emitWizardTelemetry(eventName, fields as unknown as Record<string, unknown>),
    getActiveTabDebugState,
  });
  resumeController.bindEvents();

  const formSubmitController: AgreementFormSubmitController = createAgreementFormSubmitController({
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
    storageKey: WIZARD_STORAGE_KEY,
    syncService,
    syncOrchestrator,
    stateManager,
    submitMode,
    totalWizardSteps: TOTAL_WIZARD_STEPS,
    wizardStep: WIZARD_STEP,
    getCurrentStep: () => wizardNavigationController.getCurrentStep(),
    getPlacementState: () => placementController.getState(),
    getCurrentDocumentPageCount,
    ensureSelectedDocumentCompatibility,
    collectFieldRulesForState,
    collectFieldRulesForForm,
    expandRulesForPreview,
    findSignersMissingRequiredSignatureField,
    missingSignatureFieldMessage,
    getSignerParticipants,
    buildCanonicalAgreementPayload,
    announceError,
    emitWizardTelemetry,
    parseAPIError,
    goToStep: (stepNum) => wizardNavigationController.goToStep(stepNum),
    showSyncConflictDialog,
    surfaceSyncOutcome,
    updateSyncStatus,
    getActiveTabDebugState,
    addFieldBtn,
  });
  formSubmitController.bindEvents();

  return agreementRuntime;
}
