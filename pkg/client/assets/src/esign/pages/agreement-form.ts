/**
 * E-Sign Agreement Form Page Controller
 * Handles the 6-step wizard for creating/editing agreements
 *
 * Wizard Steps:
 * 1. Document Selection
 * 2. Agreement Details
 * 3. Participants (Recipients)
 * 4. Field Definitions
 * 5. Field Placement
 * 6. Review & Send
 */

import { qs, qsa, show, hide, onReady, announce } from '../utils/dom-helpers.js';
import { debounce } from '../utils/async-helpers.js';
import { formatDateTime, formatFileSize } from '../utils/formatters.js';

// =============================================================================
// Types
// =============================================================================

export interface AgreementFormConfig {
  basePath: string;
  apiBasePath?: string;
  isEditMode: boolean;
  createSuccess?: boolean;
  agreementId?: string;
  routes: {
    index: string;
    documents?: string;
    create?: string;
  };
}

interface WizardSessionState {
  wizardId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  currentStep: number;
  document: {
    id: string | null;
    title: string | null;
    pageCount: number | null;
  };
  details: {
    title: string;
    message: string;
  };
  participants: Participant[];
  fieldDefinitions: FieldDefinition[];
  fieldPlacements: FieldPlacement[];
  serverDraftId: string | null;
  serverRevision: number;
  lastSyncedAt: string | null;
  syncPending: boolean;
}

interface Participant {
  tempId: string;
  name: string;
  email: string;
  role: 'signer' | 'viewer' | 'approver';
  order: number;
}

interface FieldDefinition {
  id: string;
  tempId: string;
  type: string;
  participantTempId: string;
  page: number;
  required: boolean;
}

interface FieldPlacement {
  fieldId: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// =============================================================================
// Constants
// =============================================================================

const WIZARD_STATE_VERSION = 1;
const WIZARD_STORAGE_KEY = 'esign_wizard_state_v1';
const WIZARD_CHANNEL_NAME = 'esign_wizard_sync';
const SYNC_DEBOUNCE_MS = 2000;
const SYNC_RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000];

// =============================================================================
// WizardStateManager
// =============================================================================

class WizardStateManager {
  private state: WizardSessionState;
  private listeners: Array<(state: WizardSessionState) => void> = [];
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.state = this.loadFromSession() || this.createInitialState();
    this.setupBroadcastChannel();
  }

  private createInitialState(): WizardSessionState {
    return {
      wizardId: this.generateWizardId(),
      version: WIZARD_STATE_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 1,
      document: { id: null, title: null, pageCount: null },
      details: { title: '', message: '' },
      participants: [],
      fieldDefinitions: [],
      fieldPlacements: [],
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: false,
    };
  }

  private generateWizardId(): string {
    return `wizard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromSession(): WizardSessionState | null {
    try {
      const stored = sessionStorage.getItem(WIZARD_STORAGE_KEY);
      if (!stored) return null;

      const state = JSON.parse(stored) as WizardSessionState;

      // Schema version check
      if (state.version !== WIZARD_STATE_VERSION) {
        console.warn('Wizard state version mismatch, migrating...');
        return this.migrateState(state);
      }

      return state;
    } catch (error) {
      console.warn('Failed to load wizard state from session:', error);
      return null;
    }
  }

  private migrateState(oldState: WizardSessionState): WizardSessionState {
    // For now, just create a new state if version doesn't match
    return this.createInitialState();
  }

  private saveToSession(): void {
    try {
      this.state.updatedAt = new Date().toISOString();
      sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save wizard state to session:', error);
    }
  }

  private setupBroadcastChannel(): void {
    if (typeof BroadcastChannel === 'undefined') return;

    try {
      this.broadcastChannel = new BroadcastChannel(WIZARD_CHANNEL_NAME);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'state_update' && event.data.wizardId === this.state.wizardId) {
          // Another tab updated the state
          this.handleExternalUpdate(event.data.state);
        }
      };
    } catch (error) {
      console.debug('BroadcastChannel not available:', error);
    }
  }

  private handleExternalUpdate(externalState: WizardSessionState): void {
    // Merge or handle conflict
    if (externalState.updatedAt > this.state.updatedAt) {
      this.state = externalState;
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private broadcastStateUpdate(): void {
    if (!this.broadcastChannel) return;

    try {
      this.broadcastChannel.postMessage({
        type: 'state_update',
        wizardId: this.state.wizardId,
        state: this.state,
      });
    } catch (error) {
      console.debug('Failed to broadcast state update:', error);
    }
  }

  getState(): WizardSessionState {
    return this.state;
  }

  updateState(updates: Partial<WizardSessionState>): void {
    this.state = { ...this.state, ...updates, syncPending: true };
    this.saveToSession();
    this.broadcastStateUpdate();
    this.notifyListeners();
  }

  updateDocument(document: WizardSessionState['document']): void {
    this.state.document = document;
    this.saveToSession();
    this.broadcastStateUpdate();
    this.notifyListeners();
  }

  updateDetails(details: WizardSessionState['details']): void {
    this.state.details = details;
    this.saveToSession();
    this.broadcastStateUpdate();
    this.notifyListeners();
  }

  updateParticipants(participants: Participant[]): void {
    this.state.participants = participants;
    this.saveToSession();
    this.broadcastStateUpdate();
    this.notifyListeners();
  }

  updateFieldDefinitions(fieldDefinitions: FieldDefinition[]): void {
    this.state.fieldDefinitions = fieldDefinitions;
    this.saveToSession();
    this.broadcastStateUpdate();
    this.notifyListeners();
  }

  updateFieldPlacements(fieldPlacements: FieldPlacement[]): void {
    this.state.fieldPlacements = fieldPlacements;
    this.saveToSession();
    this.broadcastStateUpdate();
    this.notifyListeners();
  }

  setCurrentStep(step: number): void {
    this.state.currentStep = step;
    this.saveToSession();
    this.broadcastStateUpdate();
    this.notifyListeners();
  }

  markSynced(serverDraftId: string, revision: number): void {
    this.state.serverDraftId = serverDraftId;
    this.state.serverRevision = revision;
    this.state.lastSyncedAt = new Date().toISOString();
    this.state.syncPending = false;
    this.saveToSession();
  }

  subscribe(listener: (state: WizardSessionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  reset(): void {
    this.state = this.createInitialState();
    this.saveToSession();
    this.notifyListeners();
  }

  clearSession(): void {
    try {
      sessionStorage.removeItem(WIZARD_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear wizard session:', error);
    }
    this.state = this.createInitialState();
    this.notifyListeners();
  }

  hasSavedProgress(): boolean {
    const saved = this.loadFromSession();
    return saved !== null && saved.currentStep > 1;
  }

  getSavedSummary(): { title: string; step: number; updatedAt: string } | null {
    const saved = this.loadFromSession();
    if (!saved) return null;

    return {
      title: saved.details.title || 'Untitled Agreement',
      step: saved.currentStep,
      updatedAt: saved.updatedAt,
    };
  }

  destroy(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.listeners = [];
  }
}

// =============================================================================
// ServerSyncManager
// =============================================================================

class ServerSyncManager {
  private stateManager: WizardStateManager;
  private apiBase: string;
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private isSyncing = false;
  private onStatusChange: (status: 'syncing' | 'synced' | 'error' | 'conflict') => void;
  private onConflict: (localTime: string, serverTime: string, serverRevision: number) => void;

  constructor(
    stateManager: WizardStateManager,
    apiBase: string,
    onStatusChange: (status: 'syncing' | 'synced' | 'error' | 'conflict') => void,
    onConflict: (localTime: string, serverTime: string, serverRevision: number) => void
  ) {
    this.stateManager = stateManager;
    this.apiBase = apiBase;
    this.onStatusChange = onStatusChange;
    this.onConflict = onConflict;
  }

  scheduleSave(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.syncTimeout = setTimeout(() => this.syncToServer(), SYNC_DEBOUNCE_MS);
  }

  async syncToServer(): Promise<void> {
    if (this.isSyncing) return;

    const state = this.stateManager.getState();
    if (!state.syncPending) return;

    this.isSyncing = true;
    this.onStatusChange('syncing');

    try {
      const payload = this.buildDraftPayload(state);
      const method = state.serverDraftId ? 'PUT' : 'POST';
      const url = state.serverDraftId
        ? `${this.apiBase}/esign/drafts/${state.serverDraftId}`
        : `${this.apiBase}/esign/drafts`;

      const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(state.serverDraftId ? { 'If-Match': String(state.serverRevision) } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 409) {
        // Conflict
        const data = await response.json();
        this.onStatusChange('conflict');
        this.onConflict(state.updatedAt, data.server_updated_at || '', data.revision || 0);
        return;
      }

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const data = await response.json();
      this.stateManager.markSynced(data.id || data.draft_id, data.revision || 1);
      this.retryCount = 0;
      this.onStatusChange('synced');
    } catch (error) {
      console.error('Server sync error:', error);
      this.onStatusChange('error');
      this.scheduleRetry();
    } finally {
      this.isSyncing = false;
    }
  }

  private scheduleRetry(): void {
    if (this.retryCount >= SYNC_RETRY_DELAYS.length) {
      console.warn('Max sync retries reached');
      return;
    }

    const delay = SYNC_RETRY_DELAYS[this.retryCount];
    this.retryCount++;

    setTimeout(() => this.syncToServer(), delay);
  }

  private buildDraftPayload(state: WizardSessionState): Record<string, unknown> {
    return {
      wizard_id: state.wizardId,
      current_step: state.currentStep,
      document_id: state.document.id,
      title: state.details.title,
      message: state.details.message,
      participants: state.participants,
      field_definitions: state.fieldDefinitions,
      field_placements: state.fieldPlacements,
    };
  }

  async forceOverwrite(): Promise<void> {
    const state = this.stateManager.getState();
    this.stateManager.updateState({ serverRevision: 0, syncPending: true });
    await this.syncToServer();
  }

  async loadServerVersion(): Promise<void> {
    const state = this.stateManager.getState();
    if (!state.serverDraftId) return;

    try {
      const response = await fetch(`${this.apiBase}/esign/drafts/${state.serverDraftId}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to load draft: ${response.status}`);
      }

      const data = await response.json();
      // Update state from server
      this.stateManager.updateState({
        document: {
          id: data.document_id,
          title: data.document_title,
          pageCount: data.document_page_count,
        },
        details: {
          title: data.title || '',
          message: data.message || '',
        },
        participants: data.participants || [],
        fieldDefinitions: data.field_definitions || [],
        fieldPlacements: data.field_placements || [],
        serverRevision: data.revision || 0,
        syncPending: false,
      });
      this.onStatusChange('synced');
    } catch (error) {
      console.error('Failed to load server version:', error);
      this.onStatusChange('error');
    }
  }

  destroy(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
  }
}

// =============================================================================
// AgreementFormController
// =============================================================================

export class AgreementFormController {
  private readonly config: AgreementFormConfig;
  private readonly apiBase: string;
  private stateManager: WizardStateManager;
  private syncManager: ServerSyncManager;
  private currentStep = 1;

  private readonly elements: {
    // Navigation
    wizardSteps: HTMLElement[];
    prevBtn: HTMLElement | null;
    nextBtn: HTMLElement | null;
    submitBtn: HTMLElement | null;
    // Sync status
    syncStatusIndicator: HTMLElement | null;
    syncStatusIcon: HTMLElement | null;
    syncStatusText: HTMLElement | null;
    syncRetryBtn: HTMLElement | null;
    // Step panels
    stepPanels: HTMLElement[];
    // Resume dialog
    resumeDialogModal: HTMLElement | null;
    resumeDraftTitle: HTMLElement | null;
    resumeDraftStep: HTMLElement | null;
    resumeDraftTime: HTMLElement | null;
    resumeContinueBtn: HTMLElement | null;
    resumeNewBtn: HTMLElement | null;
    resumeDiscardBtn: HTMLElement | null;
    // Conflict dialog
    conflictDialogModal: HTMLElement | null;
    conflictLocalTime: HTMLElement | null;
    conflictServerTime: HTMLElement | null;
    conflictServerRevision: HTMLElement | null;
    conflictReloadBtn: HTMLElement | null;
    conflictForceBtn: HTMLElement | null;
    conflictDismissBtn: HTMLElement | null;
    // Step 1: Document
    documentSearch: HTMLInputElement | null;
    documentList: HTMLElement | null;
    selectedDocumentDisplay: HTMLElement | null;
    // Step 2: Details
    titleInput: HTMLInputElement | null;
    messageInput: HTMLTextAreaElement | null;
    // Step 3: Participants
    participantsList: HTMLElement | null;
    addParticipantBtn: HTMLElement | null;
    // Step 4: Field definitions
    fieldDefinitionsList: HTMLElement | null;
    addFieldBtn: HTMLElement | null;
    // Step 5: Field placements
    pdfViewer: HTMLElement | null;
    fieldPalette: HTMLElement | null;
    // Form
    form: HTMLFormElement | null;
    announcements: HTMLElement | null;
  };

  constructor(config: AgreementFormConfig) {
    this.config = config;
    this.apiBase = config.apiBasePath || `${config.basePath}/api/v1`;
    this.stateManager = new WizardStateManager();
    this.syncManager = new ServerSyncManager(
      this.stateManager,
      this.apiBase,
      (status) => this.updateSyncStatusUI(status),
      (localTime, serverTime, serverRevision) =>
        this.showConflictDialog(localTime, serverTime, serverRevision)
    );

    this.elements = {
      // Navigation
      wizardSteps: qsa<HTMLElement>('.wizard-step'),
      prevBtn: qs('#prev-btn'),
      nextBtn: qs('#next-btn'),
      submitBtn: qs('#submit-btn'),
      // Sync status
      syncStatusIndicator: qs('#sync-status-indicator'),
      syncStatusIcon: qs('#sync-status-icon'),
      syncStatusText: qs('#sync-status-text'),
      syncRetryBtn: qs('#sync-retry-btn'),
      // Step panels
      stepPanels: qsa<HTMLElement>('.step-panel'),
      // Resume dialog
      resumeDialogModal: qs('#resume-dialog-modal'),
      resumeDraftTitle: qs('#resume-draft-title'),
      resumeDraftStep: qs('#resume-draft-step'),
      resumeDraftTime: qs('#resume-draft-time'),
      resumeContinueBtn: qs('#resume-continue-btn'),
      resumeNewBtn: qs('#resume-new-btn'),
      resumeDiscardBtn: qs('#resume-discard-btn'),
      // Conflict dialog
      conflictDialogModal: qs('#conflict-dialog-modal'),
      conflictLocalTime: qs('#conflict-local-time'),
      conflictServerTime: qs('#conflict-server-time'),
      conflictServerRevision: qs('#conflict-server-revision'),
      conflictReloadBtn: qs('#conflict-reload-btn'),
      conflictForceBtn: qs('#conflict-force-btn'),
      conflictDismissBtn: qs('#conflict-dismiss-btn'),
      // Step 1
      documentSearch: qs<HTMLInputElement>('#document-search'),
      documentList: qs('#document-list'),
      selectedDocumentDisplay: qs('#selected-document-display'),
      // Step 2
      titleInput: qs<HTMLInputElement>('#agreement-title'),
      messageInput: qs<HTMLTextAreaElement>('#agreement-message'),
      // Step 3
      participantsList: qs('#participants-list'),
      addParticipantBtn: qs('#add-participant-btn'),
      // Step 4
      fieldDefinitionsList: qs('#field-definitions-list'),
      addFieldBtn: qs('#add-field-btn'),
      // Step 5
      pdfViewer: qs('#pdf-viewer'),
      fieldPalette: qs('#field-palette'),
      // Form
      form: qs<HTMLFormElement>('#agreement-form'),
      announcements: qs('#agreement-announcements'),
    };
  }

  async init(): Promise<void> {
    this.setupEventListeners();
    this.checkForSavedProgress();

    // Subscribe to state changes
    this.stateManager.subscribe(() => {
      this.syncManager.scheduleSave();
    });

    // Restore state if in edit mode or resuming
    const state = this.stateManager.getState();
    if (state.currentStep > 1) {
      this.currentStep = state.currentStep;
    }

    this.updateWizardUI();

    // Hide sync indicator in edit mode until changes are made
    if (this.config.isEditMode) {
      if (this.elements.syncStatusIndicator) {
        hide(this.elements.syncStatusIndicator);
      }
    }
  }

  private setupEventListeners(): void {
    // Navigation buttons
    if (this.elements.prevBtn) {
      this.elements.prevBtn.addEventListener('click', () => this.goToPreviousStep());
    }
    if (this.elements.nextBtn) {
      this.elements.nextBtn.addEventListener('click', () => this.goToNextStep());
    }

    // Wizard step clicks
    this.elements.wizardSteps.forEach((step, index) => {
      step.addEventListener('click', () => {
        if (this.canNavigateToStep(index + 1)) {
          this.goToStep(index + 1);
        }
      });
    });

    // Sync retry
    if (this.elements.syncRetryBtn) {
      this.elements.syncRetryBtn.addEventListener('click', () => {
        this.syncManager.syncToServer();
      });
    }

    // Resume dialog
    if (this.elements.resumeContinueBtn) {
      this.elements.resumeContinueBtn.addEventListener('click', () => {
        this.resumeSavedProgress();
      });
    }
    if (this.elements.resumeNewBtn) {
      this.elements.resumeNewBtn.addEventListener('click', () => {
        this.stateManager.reset();
        this.hideResumeDialog();
        this.currentStep = 1;
        this.updateWizardUI();
      });
    }
    if (this.elements.resumeDiscardBtn) {
      this.elements.resumeDiscardBtn.addEventListener('click', () => {
        this.stateManager.clearSession();
        this.hideResumeDialog();
      });
    }

    // Conflict dialog
    if (this.elements.conflictReloadBtn) {
      this.elements.conflictReloadBtn.addEventListener('click', async () => {
        await this.syncManager.loadServerVersion();
        this.hideConflictDialog();
        this.updateWizardUI();
      });
    }
    if (this.elements.conflictForceBtn) {
      this.elements.conflictForceBtn.addEventListener('click', async () => {
        await this.syncManager.forceOverwrite();
        this.hideConflictDialog();
      });
    }
    if (this.elements.conflictDismissBtn) {
      this.elements.conflictDismissBtn.addEventListener('click', () => {
        this.hideConflictDialog();
      });
    }

    // Step 2: Details inputs
    if (this.elements.titleInput) {
      this.elements.titleInput.addEventListener(
        'input',
        debounce(() => this.handleDetailsChange(), 300)
      );
    }
    if (this.elements.messageInput) {
      this.elements.messageInput.addEventListener(
        'input',
        debounce(() => this.handleDetailsChange(), 300)
      );
    }

    // Form submission
    if (this.elements.form) {
      this.elements.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }
  }

  private checkForSavedProgress(): void {
    if (this.config.isEditMode) return; // Don't show resume dialog in edit mode

    const summary = this.stateManager.getSavedSummary();
    if (summary && summary.step > 1) {
      this.showResumeDialog(summary);
    }
  }

  private showResumeDialog(summary: { title: string; step: number; updatedAt: string }): void {
    const { resumeDialogModal, resumeDraftTitle, resumeDraftStep, resumeDraftTime } = this.elements;

    if (resumeDraftTitle) resumeDraftTitle.textContent = summary.title;
    if (resumeDraftStep) resumeDraftStep.textContent = String(summary.step);
    if (resumeDraftTime) resumeDraftTime.textContent = formatDateTime(summary.updatedAt);

    if (resumeDialogModal) show(resumeDialogModal);
  }

  private hideResumeDialog(): void {
    if (this.elements.resumeDialogModal) hide(this.elements.resumeDialogModal);
  }

  private resumeSavedProgress(): void {
    const state = this.stateManager.getState();
    this.currentStep = state.currentStep;
    this.restoreStateToUI();
    this.hideResumeDialog();
    this.updateWizardUI();
  }

  private restoreStateToUI(): void {
    const state = this.stateManager.getState();

    // Restore step 2 details
    if (this.elements.titleInput) {
      this.elements.titleInput.value = state.details.title;
    }
    if (this.elements.messageInput) {
      this.elements.messageInput.value = state.details.message;
    }

    // Other steps would restore their state here...
    // This would be extended to restore participants, field definitions, etc.
  }

  private showConflictDialog(localTime: string, serverTime: string, serverRevision: number): void {
    const { conflictDialogModal, conflictLocalTime, conflictServerTime, conflictServerRevision } =
      this.elements;

    if (conflictLocalTime) conflictLocalTime.textContent = formatDateTime(localTime);
    if (conflictServerTime) conflictServerTime.textContent = formatDateTime(serverTime);
    if (conflictServerRevision) conflictServerRevision.textContent = String(serverRevision);

    if (conflictDialogModal) show(conflictDialogModal);
  }

  private hideConflictDialog(): void {
    if (this.elements.conflictDialogModal) hide(this.elements.conflictDialogModal);
  }

  private updateSyncStatusUI(status: 'syncing' | 'synced' | 'error' | 'conflict'): void {
    const { syncStatusIndicator, syncStatusIcon, syncStatusText, syncRetryBtn } = this.elements;

    if (!syncStatusIndicator || !syncStatusIcon || !syncStatusText) return;

    show(syncStatusIndicator);

    switch (status) {
      case 'syncing':
        syncStatusIcon.className = 'w-2 h-2 rounded-full bg-blue-500 animate-pulse';
        syncStatusText.textContent = 'Saving...';
        if (syncRetryBtn) hide(syncRetryBtn);
        break;
      case 'synced':
        syncStatusIcon.className = 'w-2 h-2 rounded-full bg-green-500';
        syncStatusText.textContent = 'Saved';
        if (syncRetryBtn) hide(syncRetryBtn);
        break;
      case 'error':
        syncStatusIcon.className = 'w-2 h-2 rounded-full bg-red-500';
        syncStatusText.textContent = 'Save failed';
        if (syncRetryBtn) show(syncRetryBtn);
        break;
      case 'conflict':
        syncStatusIcon.className = 'w-2 h-2 rounded-full bg-amber-500';
        syncStatusText.textContent = 'Conflict';
        if (syncRetryBtn) hide(syncRetryBtn);
        break;
    }
  }

  private handleDetailsChange(): void {
    const title = this.elements.titleInput?.value || '';
    const message = this.elements.messageInput?.value || '';

    this.stateManager.updateDetails({ title, message });
  }

  private canNavigateToStep(step: number): boolean {
    // Can always go back
    if (step < this.currentStep) return true;

    // Check if current step is complete before allowing forward navigation
    // This would have more complex validation per step
    return step <= this.currentStep + 1;
  }

  private goToStep(step: number): void {
    if (step < 1 || step > 6) return;
    if (!this.canNavigateToStep(step)) return;

    this.currentStep = step;
    this.stateManager.setCurrentStep(step);
    this.updateWizardUI();
    announce(`Step ${step} of 6`);
  }

  private goToNextStep(): void {
    if (this.currentStep < 6) {
      this.goToStep(this.currentStep + 1);
    }
  }

  private goToPreviousStep(): void {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    }
  }

  private updateWizardUI(): void {
    // Update step indicators
    this.elements.wizardSteps.forEach((step, index) => {
      const stepNum = index + 1;
      const isActive = stepNum === this.currentStep;
      const isComplete = stepNum < this.currentStep;

      step.classList.toggle('active', isActive);
      step.classList.toggle('completed', isComplete);
      step.setAttribute('aria-current', isActive ? 'step' : 'false');
    });

    // Update step panels
    this.elements.stepPanels.forEach((panel, index) => {
      const stepNum = index + 1;
      if (stepNum === this.currentStep) {
        show(panel);
      } else {
        hide(panel);
      }
    });

    // Update navigation buttons
    if (this.elements.prevBtn) {
      if (this.currentStep === 1) {
        hide(this.elements.prevBtn);
      } else {
        show(this.elements.prevBtn);
      }
    }

    if (this.elements.nextBtn) {
      if (this.currentStep === 6) {
        hide(this.elements.nextBtn);
      } else {
        show(this.elements.nextBtn);
      }
    }

    if (this.elements.submitBtn) {
      if (this.currentStep === 6) {
        show(this.elements.submitBtn);
      } else {
        hide(this.elements.submitBtn);
      }
    }
  }

  private async handleFormSubmit(e: Event): Promise<void> {
    e.preventDefault();

    // Final validation and submission logic would go here
    const state = this.stateManager.getState();

    try {
      const response = await fetch(`${this.apiBase}/esign/agreements`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          document_id: state.document.id,
          title: state.details.title,
          message: state.details.message,
          participants: state.participants,
          field_definitions: state.fieldDefinitions,
          field_placements: state.fieldPlacements,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create agreement');
      }

      const data = await response.json();

      // Clear wizard state on successful submission
      this.stateManager.clearSession();

      // Redirect to agreement detail or list
      if (data.id) {
        window.location.href = `${this.config.routes.index}/${data.id}`;
      } else {
        window.location.href = this.config.routes.index;
      }
    } catch (error) {
      console.error('Agreement submission error:', error);
      announce(`Error: ${error instanceof Error ? error.message : 'Submission failed'}`);
    }
  }

  destroy(): void {
    this.stateManager.destroy();
    this.syncManager.destroy();
  }
}

// =============================================================================
// Initialization
// =============================================================================

export function initAgreementForm(config: AgreementFormConfig): AgreementFormController {
  const controller = new AgreementFormController(config);
  onReady(() => controller.init());
  return controller;
}

export function bootstrapAgreementForm(config: {
  basePath: string;
  apiBasePath?: string;
  isEditMode?: boolean;
  createSuccess?: boolean;
  agreementId?: string;
  routes: {
    index: string;
    documents?: string;
    create?: string;
  };
}): void {
  const pageConfig: AgreementFormConfig = {
    basePath: config.basePath,
    apiBasePath: config.apiBasePath || `${config.basePath}/api/v1`,
    isEditMode: config.isEditMode || false,
    createSuccess: config.createSuccess,
    agreementId: config.agreementId,
    routes: config.routes,
  };

  const controller = new AgreementFormController(pageConfig);
  onReady(() => controller.init());

  // Export for testing
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).esignAgreementFormController = controller;
  }
}

// Auto-init if page marker is present
if (typeof document !== 'undefined') {
  onReady(() => {
    const pageEl = document.querySelector('[data-esign-page="agreement-form"]');
    if (pageEl) {
      const configScript = document.getElementById('esign-page-config');
      if (configScript) {
        try {
          const config = JSON.parse(configScript.textContent || '{}');
          if (config.basePath || config.routes?.index) {
            const controller = new AgreementFormController({
              basePath: config.base_path || config.basePath || '',
              apiBasePath: config.api_base_path || config.apiBasePath,
              isEditMode: config.is_edit || config.isEditMode || false,
              createSuccess: config.create_success || config.createSuccess,
              routes: config.routes || { index: '' },
            });
            controller.init();
          }
        } catch (e) {
          console.warn('Failed to parse agreement form page config:', e);
        }
      }
    }
  });
}
