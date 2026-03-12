// @ts-nocheck

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
  AgreementFormRuntime,
} from './context';
import { collectAgreementFormRefs } from './refs';
import { createOwnershipUIController } from './ownership-ui';
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
  createAgreementWizardPersistenceSettings,
  createDraftRequestHelpers,
  hasMeaningfulWizardProgress,
  normalizeAgreementFormConfig,
  normalizeAgreementTitleSource,
} from './bootstrap-config';
import { createLinkGroupState } from './linked-placement';
import { parsePositiveInt } from './normalization';
import { escapeHtml, showToast } from './ui-utils';

export function createAgreementFormRuntimeCoordinator(inputConfig = {}): AgreementFormRuntime {
  const {
    config,
    normalizedConfig,
    basePath,
    apiBase,
    apiVersionBase,
    draftsEndpoint,
    isEditMode,
    createSuccess,
    currentUserID,
    submitMode,
    documentsUploadURL,
    initialParticipants,
    initialFieldInstances,
  } = normalizeAgreementFormConfig(inputConfig);
  const {
    draftEndpointWithUserID,
    draftRequestHeaders,
  } = createDraftRequestHelpers(currentUserID);
  const agreementRefs = collectAgreementFormRefs(document);
  const {
    WIZARD_STATE_VERSION,
    WIZARD_STORAGE_KEY,
    WIZARD_CHANNEL_NAME,
    LEGACY_WIZARD_STORAGE_KEY,
    SYNC_DEBOUNCE_MS,
    SYNC_RETRY_DELAYS,
    WIZARD_STORAGE_MIGRATION_VERSION,
    ACTIVE_TAB_STORAGE_KEY,
    ACTIVE_TAB_HEARTBEAT_MS,
    ACTIVE_TAB_STALE_MS,
    TITLE_SOURCE,
  } = createAgreementWizardPersistenceSettings({
    config,
    currentUserID,
    isEditMode,
  });

  const emitWizardTelemetry = createAgreementTelemetryEmitter();
  const normalizeTitleSource = (value, fallback = TITLE_SOURCE.AUTOFILL) =>
    normalizeAgreementTitleSource(value, fallback);
  const hasMeaningfulProgress = (state) => hasMeaningfulWizardProgress(state, {
    normalizeTitleSource,
    titleSource: TITLE_SOURCE,
  });
  const previewCard = createPreviewCard({
    apiBasePath: apiVersionBase,
    basePath,
  });

  const form = agreementRefs.form.root;
  const submitBtn = agreementRefs.form.submitBtn;
  const formAnnouncements = agreementRefs.form.announcements;

  let participantsController;
  let fieldDefinitionsController;
  let placementController;
  let stateBindingController;
  let validationController;
  let resumeController;
  let feedbackController;
  let runtimeActionsController;
  let placementLinkGroupState = createLinkGroupState();

  const debouncedTrackChanges = () => stateBindingController?.debouncedTrackChanges?.();
  const trackWizardStateChanges = () => runtimeActionsController?.trackWizardStateChanges?.();
  const formatRelativeTime = (value) => feedbackController.formatRelativeTime(value);
  const restoreSyncStatusFromState = () => feedbackController.restoreSyncStatusFromState();
  const updateSyncStatus = (status) => feedbackController.updateSyncStatus(status);
  const showSyncConflictDialog = (serverRevision) => feedbackController.showSyncConflictDialog(serverRevision);
  const mapUserFacingError = (message, code = '', status = 0) =>
    feedbackController.mapUserFacingError(message, code, status);
  const parseAPIError = (response, fallbackMessage) =>
    feedbackController.parseAPIError(response, fallbackMessage);
  const announceError = (message, code = '', status = 0) =>
    feedbackController.announceError(message, code, status);
  const surfaceSyncOutcome = (resultPromise, options = {}) =>
    feedbackController.surfaceSyncOutcome(resultPromise, options);

  const ownershipUI = createOwnershipUIController(agreementRefs, {
    formatRelativeTime,
  });
  const updateActiveTabOwnershipUI = (context = {}) => ownershipUI.render(context);

  const stateManager = new WizardStateManager({
    storageKey: WIZARD_STORAGE_KEY,
    legacyStorageKey: LEGACY_WIZARD_STORAGE_KEY,
    stateVersion: WIZARD_STATE_VERSION,
    storageMigrationVersion: WIZARD_STORAGE_MIGRATION_VERSION,
    totalWizardSteps: TOTAL_WIZARD_STEPS,
    titleSource: TITLE_SOURCE,
    normalizeTitleSource,
    parsePositiveInt,
    hasMeaningfulWizardProgress: hasMeaningfulProgress,
    collectFormState: () => {
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
    restoreDocumentState: (state) => {
      if (!state?.document?.id) return;
      const selectedDoc = document.getElementById('selected-document');
      const docPicker = document.getElementById('document-picker');
      const docTitle = document.getElementById('selected-document-title');
      const docInfo = document.getElementById('selected-document-info');

      agreementRefs.form.documentIdInput.value = state.document.id;
      if (docTitle) docTitle.textContent = state.document.title || 'Selected Document';
      if (docInfo) docInfo.textContent = state.document.pageCount ? `${state.document.pageCount} pages` : '';
      if (agreementRefs.form.documentPageCountInput && state.document.pageCount) {
        agreementRefs.form.documentPageCountInput.value = String(state.document.pageCount);
      }
      if (selectedDoc) selectedDoc.classList.remove('hidden');
      if (docPicker) docPicker.classList.add('hidden');
    },
    restoreDetailsState: (state) => {
      agreementRefs.form.titleInput.value = state?.details?.title || '';
      agreementRefs.form.messageInput.value = state?.details?.message || '';
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
    currentUserID,
    draftsEndpoint,
    draftEndpointWithUserID,
    draftRequestHeaders,
  });

  let syncOrchestrator;
  const activeTabController = new ActiveTabController({
    storageKey: ACTIVE_TAB_STORAGE_KEY,
    channelName: WIZARD_CHANNEL_NAME,
    heartbeatMs: ACTIVE_TAB_HEARTBEAT_MS,
    staleMs: ACTIVE_TAB_STALE_MS,
    telemetry: emitWizardTelemetry,
    onOwnershipChange: (state) => {
      if (!state.isOwner) {
        updateSyncStatus('paused');
      } else {
        restoreSyncStatusFromState();
      }
      ownershipUI.render(state);
    },
    onRemoteState: (remoteState) => {
      const mergeResult = stateManager.applyRemoteState(remoteState, {
        save: true,
        notify: false,
      });
      if (mergeResult.replacedLocalState) {
        const reconcilePromise = resumeController?.reconcileBootstrapState?.({ reason: 'state_updated' });
        if (reconcilePromise && typeof reconcilePromise.then === 'function') {
          void reconcilePromise.then(() => {
            stateManager.notifyListeners();
          });
        } else {
          stateManager.notifyListeners();
        }
      } else {
        stateManager.notifyListeners();
      }
    },
    onRemoteSync: (draftId, revision) => {
      stateManager.applyRemoteSync(draftId, revision, {
        save: true,
        notify: true,
      });
    },
    onVisibilityHidden: () => {
      void syncOrchestrator?.forceSync({ keepalive: true });
    },
    onPageHide: () => {
      void syncOrchestrator?.forceSync({ keepalive: true });
    },
    onBeforeUnload: () => {
      void syncOrchestrator?.forceSync({ keepalive: true });
    },
  });

  syncOrchestrator = new SyncController({
    stateManager,
    syncService,
    activeTabController,
    statusUpdater: updateSyncStatus,
    showConflictDialog: showSyncConflictDialog,
    syncDebounceMs: SYNC_DEBOUNCE_MS,
    syncRetryDelays: SYNC_RETRY_DELAYS,
    currentUserID,
    draftsEndpoint,
    draftEndpointWithUserID,
    draftRequestHeaders,
  });

  const agreementFormContext: AgreementFormContext = {
    config: normalizedConfig,
    refs: agreementRefs,
    basePath,
    apiBase,
    apiVersionBase,
    draftsEndpoint,
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
        documentSelectionController.loadDocuments();
        documentSelectionController.loadRecentDocuments();
      },
      destroy() {
        ownershipUI.destroy();
        stateManager.destroy();
      },
    },
  });

  const documentSelectionController = createDocumentSelectionController({
    apiBase,
    apiVersionBase,
    currentUserID,
    documentsUploadURL,
    isEditMode,
    titleSource: TITLE_SOURCE,
    normalizeTitleSource,
    stateManager,
    previewCard,
    parseAPIError,
    announceError,
    showToast,
    mapUserFacingError,
    renderFieldRulePreview: () => fieldDefinitionsController?.renderFieldRulePreview?.(),
  });
  documentSelectionController.initializeTitleSourceSeed();
  documentSelectionController.bindEvents();

  const {
    documentIdInput,
    selectedDocument,
    documentPicker,
    documentSearch,
    documentList,
    selectedDocumentTitle,
    selectedDocumentInfo,
    documentPageCountInput,
  } = documentSelectionController.refs;
  const ensureSelectedDocumentCompatibility = documentSelectionController.ensureSelectedDocumentCompatibility;
  const getCurrentDocumentPageCount = documentSelectionController.getCurrentDocumentPageCount;

  participantsController = createParticipantsController({
    initialParticipants,
    onParticipantsChanged: () => fieldDefinitionsController?.updateFieldParticipantOptions?.(),
  });
  participantsController.initialize();
  participantsController.bindEvents();

  const participantsContainer = participantsController.refs.participantsContainer;
  const addParticipantBtn = participantsController.refs.addParticipantBtn;
  const getSignerParticipants = () => participantsController.getSignerParticipants();

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
    setPlacementLinkGroupState: (nextState) => {
      placementLinkGroupState = nextState || createLinkGroupState();
      placementController?.setLinkGroupState?.(placementLinkGroupState);
    },
  });
  fieldDefinitionsController.bindEvents();
  fieldDefinitionsController.initialize();

  const fieldDefinitionsContainer = fieldDefinitionsController.refs.fieldDefinitionsContainer;
  const fieldRulesContainer = fieldDefinitionsController.refs.fieldRulesContainer;
  const addFieldBtn = fieldDefinitionsController.refs.addFieldBtn;
  const fieldPlacementsJSONInput = fieldDefinitionsController.refs.fieldPlacementsJSONInput;
  const fieldRulesJSONInput = fieldDefinitionsController.refs.fieldRulesJSONInput;
  const collectFieldRulesForState = () => fieldDefinitionsController.collectFieldRulesForState();
  const collectFieldRulesForForm = () => fieldDefinitionsController.collectFieldRulesForForm();
  const expandRulesForPreview = (rules, terminalPage) => fieldDefinitionsController.expandRulesForPreview(rules, terminalPage);
  const updateFieldParticipantOptions = () => fieldDefinitionsController.updateFieldParticipantOptions();
  const collectPlacementFieldDefinitions = () => fieldDefinitionsController.collectPlacementFieldDefinitions();
  const getFieldDefinitionById = (definitionId) => fieldDefinitionsController.getFieldDefinitionById(definitionId);
  const findSignersMissingRequiredSignatureField = () => fieldDefinitionsController.findSignersMissingRequiredSignatureField();
  const missingSignatureFieldMessage = (missingSigners) => fieldDefinitionsController.missingSignatureFieldMessage(missingSigners);

  const sendReadinessController = createSendReadinessController({
    documentIdInput,
    selectedDocumentTitle,
    participantsContainer,
    fieldDefinitionsContainer,
    submitBtn,
    syncOrchestrator,
    escapeHtml,
    getSignerParticipants,
    getCurrentDocumentPageCount,
    collectFieldRulesForState,
    expandRulesForPreview,
    findSignersMissingRequiredSignatureField,
    goToStep: (stepNum) => wizardNavigationController.goToStep(stepNum),
  });

  placementController = createPlacementEditorController({
    apiBase,
    apiVersionBase,
    documentIdInput,
    fieldPlacementsJSONInput,
    initialFieldInstances: fieldDefinitionsController.buildInitialPlacementInstances(),
    initialLinkGroupState: placementLinkGroupState,
    collectPlacementFieldDefinitions,
    getFieldDefinitionById,
    parseAPIError,
    mapUserFacingError,
    showToast,
    escapeHtml,
    onPlacementsChanged: () => trackWizardStateChanges(),
  });
  placementController.bindEvents();
  placementLinkGroupState = placementController.getLinkGroupState();

  const wizardNavigationController = createWizardNavigationController({
    totalWizardSteps: TOTAL_WIZARD_STEPS,
    wizardStep: WIZARD_STEP,
    nextStepLabels: WIZARD_NEXT_STEP_LABELS,
    submitBtn,
    syncOrchestrator,
    previewCard,
    updateActiveTabOwnershipUI,
    validateStep: (stepNum) => validationController.validateStep(stepNum),
    onPlacementStep() {
      void placementController.initPlacementEditor();
    },
    onReviewStep() {
      sendReadinessController.initSendReadinessCheck();
    },
    onStepChanged(stepNum) {
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
    surfaceSyncOutcome,
    announceError,
    getCurrentStep: () => wizardNavigationController.getCurrentStep(),
    reviewStep: WIZARD_STEP.REVIEW,
    onReviewStepRequested: () => sendReadinessController.initSendReadinessCheck(),
    updateActiveTabOwnershipUI,
  });
  runtimeActionsController.handleCreateSuccessCleanup();
  runtimeActionsController.bindRetryAndConflictHandlers();
  runtimeActionsController.bindOwnershipHandlers();

  const payloadBuilder = createAgreementFormPayloadBuilder({
    documentIdInput,
    documentPageCountInput,
    titleInput: agreementRefs.form.titleInput,
    messageInput: agreementRefs.form.messageInput,
    participantsContainer,
    fieldDefinitionsContainer,
    fieldPlacementsJSONInput,
    fieldRulesJSONInput,
    collectFieldRulesForForm,
    buildPlacementFormEntries: () => placementController?.buildPlacementFormEntries?.() || [],
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
    stateManager,
    syncOrchestrator,
    syncService,
    hasMeaningfulWizardProgress,
    formatRelativeTime,
    emitWizardTelemetry,
  });
  resumeController.bindEvents();

  const formSubmitController = createAgreementFormSubmitController({
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
    currentUserID,
    draftsEndpoint,
    draftEndpointWithUserID,
    draftRequestHeaders,
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
    surfaceSyncOutcome,
    addFieldBtn,
  });
  formSubmitController.bindEvents();

  return agreementRuntime;
}
