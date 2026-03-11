// @ts-nocheck

import {
  PLACEMENT_SOURCE,
  PREVIEW_CARD_VISIBLE_STEPS,
  TOTAL_WIZARD_STEPS,
  WIZARD_NEXT_STEP_LABELS,
  WIZARD_STEP,
} from './agreement-form/constants';
import { createPreviewCard, DocumentPreviewCard } from './agreement-form/preview-card';
import {
  createLinkGroupState,
  addLinkGroup,
  createLinkGroup,
  setLinkGroupTemplatePosition,
  computeLinkedPlacementForPage,
  convertToManualPlacement,
  isLinkedPlacement,
  isFieldLinked,
  getFieldLinkGroup,
  getLinkedSiblings,
  unlinkField,
  relinkField,
  createLinkGroupsFromRules,
  serializeLinkGroupState,
  deserializeLinkGroupState,
  type LinkGroupState,
} from './agreement-form/linked-placement';
import {
  clampPageNumber,
  computeEffectiveRulePages,
  expandRuleDefinitionsForPreview,
  formatEffectivePageRange,
  normalizeDocumentOption,
  normalizeFieldRuleState,
  normalizePlacementInstance,
  parseExcludePagesCSV,
  parsePositiveInt,
  toFieldRuleFormPayload,
  toPlacementFormPayload,
} from './agreement-form/normalization';

export interface AgreementFormRuntimeConfig {
  base_path?: string;
  api_base_path?: string;
  user_id?: string;
  is_edit?: boolean;
  create_success?: boolean;
  submit_mode?: 'form' | 'json' | string;
  routes?: { index?: string; documents?: string; create?: string; documents_upload_url?: string };
  initial_participants?: Array<Record<string, any>>;
  initial_field_instances?: Array<Record<string, any>>;
}

export function initAgreementFormRuntime(inputConfig: AgreementFormRuntimeConfig = {}): void {
  if (typeof window !== 'undefined') {
    if (window.__esignAgreementRuntimeInitialized) {
      return;
    }
    window.__esignAgreementRuntimeInitialized = true;
  }
  const config = inputConfig || {};
  const basePath = String(config.base_path || '').trim();
  const apiBase = String(config.api_base_path || '').trim() || `${basePath}/api`;
  const normalizedAPIBase = apiBase.replace(/\/+$/, '');
  const apiVersionBase = /\/v\d+$/i.test(normalizedAPIBase) ? normalizedAPIBase : `${normalizedAPIBase}/v1`;
  const draftsEndpoint = `${apiVersionBase}/esign/drafts`;
  const isEditMode = Boolean(config.is_edit);
  const createSuccess = Boolean(config.create_success);
  const currentUserID = String(config.user_id || '').trim();
  const submitMode = String(config.submit_mode || 'json').trim().toLowerCase();
  const documentsUploadURL = String(config.routes?.documents_upload_url || '').trim() || `${basePath}/content/esign_documents/new`;
  const initialParticipants = Array.isArray(config.initial_participants) ? config.initial_participants : [];
  const initialFieldInstances = Array.isArray(config.initial_field_instances) ? config.initial_field_instances : [];
  function draftEndpointWithUserID(url) {
    if (!currentUserID) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}user_id=${encodeURIComponent(currentUserID)}`;
  }

  function draftRequestHeaders(includeContentType = true) {
    const headers = { 'Accept': 'application/json' };
    if (includeContentType) headers['Content-Type'] = 'application/json';
    if (currentUserID) headers['X-User-ID'] = currentUserID;
    return headers;
  }

  // =============================================================================
  // Wizard State Persistence (Phase 30)
  // =============================================================================

  const WIZARD_STATE_VERSION = 1;
  const wizardModeToken = isEditMode ? 'edit' : 'create';
  const wizardRouteToken = String(
    config.routes?.create
      || config.routes?.index
      || (typeof window !== 'undefined' ? window.location.pathname : '')
      || 'agreement-form'
  ).trim().toLowerCase();
  const wizardScopeToken = [
    wizardModeToken,
    currentUserID || 'anonymous',
    wizardRouteToken || 'agreement-form',
  ].join('|');
  const WIZARD_STORAGE_KEY = `esign_wizard_state_v1:${encodeURIComponent(wizardScopeToken)}`;
  const WIZARD_CHANNEL_NAME = `esign_wizard_sync:${encodeURIComponent(wizardScopeToken)}`;
  const LEGACY_WIZARD_STORAGE_KEY = 'esign_wizard_state_v1';
  const SYNC_DEBOUNCE_MS = 2000;
  const SYNC_RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000];
  const WIZARD_STORAGE_MIGRATION_VERSION = 1;
  const TITLE_SOURCE = {
    USER: 'user',
    AUTOFILL: 'autofill',
    SERVER_SEED: 'server_seed',
  } as const;

  function emitWizardTelemetry(eventName, fields = {}) {
    const normalizedEvent = String(eventName || '').trim();
    if (!normalizedEvent || typeof window === 'undefined') return;
    const counters = (window.__esignWizardTelemetryCounters = window.__esignWizardTelemetryCounters || {});
    counters[normalizedEvent] = Number(counters[normalizedEvent] || 0) + 1;
    window.dispatchEvent(new CustomEvent('esign:wizard-telemetry', {
      detail: {
        event: normalizedEvent,
        count: counters[normalizedEvent],
        fields,
        at: new Date().toISOString(),
      },
    }));
  }

  function hasMeaningfulParticipantProgress(participant, index = 0) {
    if (!participant || typeof participant !== 'object') return false;

    const name = String(participant.name ?? '').trim();
    const email = String(participant.email ?? '').trim();
    const role = String(participant.role ?? 'signer').trim().toLowerCase();
    const signingStage = Number.parseInt(String(participant.signingStage ?? participant.signing_stage ?? 1), 10);
    const notify = participant.notify !== false;

    if (name !== '' || email !== '') return true;
    if (role !== '' && role !== 'signer') return true;
    if (Number.isFinite(signingStage) && signingStage > 1) return true;
    if (!notify) return true;
    return index > 0;
  }

  function hasMeaningfulWizardProgress(state) {
    if (!state || typeof state !== 'object') return false;

    const currentStep = Number.parseInt(String(state.currentStep ?? 1), 10);
    if (Number.isFinite(currentStep) && currentStep > 1) return true;

    const documentID = String(state.document?.id ?? '').trim();
    if (documentID !== '') return true;

    const title = String(state.details?.title ?? '').trim();
    const message = String(state.details?.message ?? '').trim();
    if (title !== '' || message !== '') return true;

    const participants = Array.isArray(state.participants) ? state.participants : [];
    if (participants.some((participant, index) => hasMeaningfulParticipantProgress(participant, index))) return true;

    if (Array.isArray(state.fieldDefinitions) && state.fieldDefinitions.length > 0) return true;
    if (Array.isArray(state.fieldPlacements) && state.fieldPlacements.length > 0) return true;
    if (Array.isArray(state.fieldRules) && state.fieldRules.length > 0) return true;

    return false;
  }

  function normalizeTitleSource(value, fallback = TITLE_SOURCE.AUTOFILL) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === TITLE_SOURCE.USER) return TITLE_SOURCE.USER;
    if (normalized === TITLE_SOURCE.SERVER_SEED) return TITLE_SOURCE.SERVER_SEED;
    if (normalized === TITLE_SOURCE.AUTOFILL) return TITLE_SOURCE.AUTOFILL;
    return fallback;
  }

  /**
   * WizardSessionState schema (v1)
   * @typedef {Object} WizardSessionState
   * @property {string} wizardId - Unique wizard session ID
   * @property {number} version - Schema version for migrations
   * @property {string} createdAt - ISO timestamp
   * @property {string} updatedAt - ISO timestamp
   * @property {number} currentStep - 1-6
   * @property {Object} document - Step 1 data
   * @property {Object} details - Step 2 data
   * @property {Array} participants - Step 3 data
   * @property {Array} fieldDefinitions - Step 4 data
   * @property {Array} fieldPlacements - Step 5 data
   * @property {string|null} serverDraftId - Server draft ID
   * @property {number} serverRevision - Server revision for optimistic concurrency
   * @property {string|null} lastSyncedAt - Last successful server sync
   * @property {boolean} syncPending - Dirty flag for sync
   */

  /**
   * WizardStateManager - handles sessionStorage persistence and state management
   */
  class WizardStateManager {
    constructor() {
      this.state = null;
      this.listeners = [];
      this.init();
    }

    init() {
      this.migrateLegacyStateIfNeeded();
      this.state = this.loadFromSession() || this.createInitialState();
    }

    createInitialState() {
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
        fieldRules: [],
        titleSource: TITLE_SOURCE.AUTOFILL,
        storageMigrationVersion: WIZARD_STORAGE_MIGRATION_VERSION,
        serverDraftId: null,
        serverRevision: 0,
        lastSyncedAt: null,
        syncPending: false
      };
    }

    generateWizardId() {
      return `wizard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    migrateLegacyStateIfNeeded() {
      try {
        const scopedRaw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
        const legacyRaw = sessionStorage.getItem(LEGACY_WIZARD_STORAGE_KEY);
        if (!legacyRaw) return;
        if (scopedRaw) {
          // Scoped key is authoritative once present.
          sessionStorage.removeItem(LEGACY_WIZARD_STORAGE_KEY);
          return;
        }
        const parsedLegacy = JSON.parse(legacyRaw);
        const migrated = this.normalizeLoadedState({
          ...parsedLegacy,
          storageMigrationVersion: WIZARD_STORAGE_MIGRATION_VERSION,
        });
        sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(migrated));
        sessionStorage.removeItem(LEGACY_WIZARD_STORAGE_KEY);
        emitWizardTelemetry('wizard_resume_migration_used', {
          from: LEGACY_WIZARD_STORAGE_KEY,
          to: WIZARD_STORAGE_KEY,
        });
      } catch (error) {
        // Corrupt legacy cache should not block clean bootstrap.
        sessionStorage.removeItem(LEGACY_WIZARD_STORAGE_KEY);
      }
    }

    loadFromSession() {
      try {
        const stored = sessionStorage.getItem(WIZARD_STORAGE_KEY);
        if (!stored) return null;

        const state = JSON.parse(stored);

        // Schema version check
        if (state.version !== WIZARD_STATE_VERSION) {
          console.warn('Wizard state version mismatch, migrating...');
          return this.migrateState(state);
        }

        return this.normalizeLoadedState(state);
      } catch (error) {
        console.error('Failed to load wizard state from session:', error);
        return null;
      }
    }

    normalizeLoadedState(state) {
      if (!state || typeof state !== 'object') {
        return this.createInitialState();
      }

      const initial = this.createInitialState();
      const normalized = { ...initial, ...state };

      const parsedStep = Number.parseInt(String(state.currentStep ?? initial.currentStep), 10);
      normalized.currentStep = Number.isFinite(parsedStep)
        ? Math.min(Math.max(parsedStep, 1), TOTAL_WIZARD_STEPS)
        : initial.currentStep;

      const documentState = (state.document && typeof state.document === 'object') ? state.document : {};
      const rawDocumentID = documentState.id;
      normalized.document = {
        id: rawDocumentID == null ? null : (String(rawDocumentID).trim() || null),
        title: String(documentState.title ?? '').trim() || null,
        pageCount: parsePositiveInt(documentState.pageCount, 0) || null
      };

      const detailsState = (state.details && typeof state.details === 'object') ? state.details : {};
      const parsedTitle = String(detailsState.title ?? '').trim();
      const inferredTitleSource = parsedTitle === '' ? TITLE_SOURCE.AUTOFILL : TITLE_SOURCE.USER;
      normalized.details = {
        title: parsedTitle,
        message: String(detailsState.message ?? '')
      };

      normalized.participants = Array.isArray(state.participants) ? state.participants : [];
      normalized.fieldDefinitions = Array.isArray(state.fieldDefinitions) ? state.fieldDefinitions : [];
      normalized.fieldPlacements = Array.isArray(state.fieldPlacements) ? state.fieldPlacements : [];
      normalized.fieldRules = Array.isArray(state.fieldRules) ? state.fieldRules : [];

      const wizardID = String(state.wizardId ?? '').trim();
      normalized.wizardId = wizardID || initial.wizardId;
      normalized.version = WIZARD_STATE_VERSION;
      normalized.createdAt = String(state.createdAt ?? initial.createdAt);
      normalized.updatedAt = String(state.updatedAt ?? initial.updatedAt);
      normalized.titleSource = normalizeTitleSource(state.titleSource, inferredTitleSource);
      normalized.storageMigrationVersion = parsePositiveInt(
        state.storageMigrationVersion,
        WIZARD_STORAGE_MIGRATION_VERSION,
      ) || WIZARD_STORAGE_MIGRATION_VERSION;

      const serverDraftID = String(state.serverDraftId ?? '').trim();
      normalized.serverDraftId = serverDraftID || null;
      normalized.serverRevision = parsePositiveInt(state.serverRevision, 0);
      normalized.lastSyncedAt = String(state.lastSyncedAt ?? '').trim() || null;
      normalized.syncPending = Boolean(state.syncPending);

      return normalized;
    }

    migrateState(oldState) {
      // Future migrations can be added here
      // For v1, just reset if version doesn't match
      console.warn('Discarding incompatible wizard state');
      return null;
    }

    saveToSession() {
      try {
        this.state.updatedAt = new Date().toISOString();
        this.state.storageMigrationVersion = WIZARD_STORAGE_MIGRATION_VERSION;
        sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(this.state));
      } catch (error) {
        console.error('Failed to save wizard state to session:', error);
      }
    }

    getState() {
      return this.state;
    }

    setState(nextState, options = {}) {
      this.state = this.normalizeLoadedState(nextState);
      if (options.syncPending === true) {
        this.state.syncPending = true;
      } else if (options.syncPending === false) {
        this.state.syncPending = false;
      }
      if (options.save !== false) {
        this.saveToSession();
      }
      if (options.notify !== false) {
        this.notifyListeners();
      }
    }

    updateState(partial) {
      this.setState(
        { ...this.state, ...partial, syncPending: true, updatedAt: new Date().toISOString() },
        { syncPending: true }
      );
    }

    updateStep(step) {
      this.updateState({ currentStep: step });
    }

    updateDocument(doc) {
      this.updateState({ document: { ...this.state.document, ...doc } });
    }

    updateDetails(details, options = {}) {
      const patch = {
        details: { ...this.state.details, ...details },
      };
      if (Object.prototype.hasOwnProperty.call(options, 'titleSource')) {
        patch.titleSource = normalizeTitleSource(options.titleSource, this.state.titleSource);
      } else if (Object.prototype.hasOwnProperty.call(details || {}, 'title')) {
        patch.titleSource = TITLE_SOURCE.USER;
      }
      this.updateState(patch);
    }

    setTitleSource(source, options = {}) {
      const nextSource = normalizeTitleSource(source, this.state.titleSource);
      if (nextSource === this.state.titleSource) return;
      if (options.syncPending === false) {
        this.setState({ ...this.state, titleSource: nextSource }, { syncPending: false });
        return;
      }
      this.updateState({ titleSource: nextSource });
    }

    updateParticipants(participants) {
      this.updateState({ participants });
    }

    updateFieldDefinitions(fieldDefinitions) {
      this.updateState({ fieldDefinitions });
    }

    updateFieldPlacements(fieldPlacements) {
      this.updateState({ fieldPlacements });
    }

    markSynced(serverDraftId, serverRevision) {
      this.setState({
        ...this.state,
        serverDraftId,
        serverRevision,
        lastSyncedAt: new Date().toISOString(),
        syncPending: false,
      }, { syncPending: false });
    }

    clear() {
      this.state = this.createInitialState();
      sessionStorage.removeItem(WIZARD_STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_WIZARD_STORAGE_KEY);
      this.notifyListeners();
    }

    hasResumableState() {
      return hasMeaningfulWizardProgress(this.state);
    }

    onStateChange(callback) {
      this.listeners.push(callback);
      return () => {
        this.listeners = this.listeners.filter(l => l !== callback);
      };
    }

    notifyListeners() {
      this.listeners.forEach(cb => cb(this.state));
    }

	    collectFormState() {
      // Collect current form state into wizard state
      const docId = document.getElementById('document_id')?.value || null;
      const docTitle = document.getElementById('selected-document-title')?.textContent?.trim() || null;

	      const titleInput = document.getElementById('title');
	      const messageInput = document.getElementById('message');
	      const activeTitleSource = normalizeTitleSource(
	        this.state?.titleSource,
	        String(titleInput?.value || '').trim() === '' ? TITLE_SOURCE.AUTOFILL : TITLE_SOURCE.USER,
	      );

      const participants = [];
      document.querySelectorAll('.participant-entry').forEach(entry => {
        const id = entry.getAttribute('data-participant-id');
        const name = entry.querySelector('input[name*=".name"]')?.value || '';
        const email = entry.querySelector('input[name*=".email"]')?.value || '';
        const role = entry.querySelector('select[name*=".role"]')?.value || 'signer';
        const signingStage = parseInt(entry.querySelector('.signing-stage-input')?.value || '1', 10);
        const notify = entry.querySelector('.notify-input')?.checked !== false;
        participants.push({ tempId: id, name, email, role, notify, signingStage });
      });

      const fieldDefinitions = [];
      document.querySelectorAll('.field-definition-entry').forEach(entry => {
        const id = entry.getAttribute('data-field-definition-id');
        const type = entry.querySelector('.field-type-select')?.value || 'signature';
        const participantId = entry.querySelector('.field-participant-select')?.value || '';
        const page = parseInt(entry.querySelector('input[name*=".page"]')?.value || '1', 10);
        const required = entry.querySelector('input[name*=".required"]')?.checked ?? true;
        fieldDefinitions.push({ tempId: id, type, participantTempId: participantId, page, required });
      });

      const fieldRules = collectFieldRulesForState();

      const documentPageCount = parseInt(documentPageCountInput?.value || '0', 10) || null;

	      return {
	        document: { id: docId, title: docTitle, pageCount: documentPageCount },
	        details: {
	          title: titleInput?.value || '',
	          message: messageInput?.value || ''
	        },
	        titleSource: activeTitleSource,
	        participants,
	        fieldDefinitions,
	        fieldPlacements: placementState?.fieldInstances || [],
        fieldRules
      };
    }

    restoreFormState() {
      const state = this.state;
      if (!state) return;

      // Restore document selection
      if (state.document.id) {
        const docIdInput = document.getElementById('document_id');
        const selectedDoc = document.getElementById('selected-document');
        const docPicker = document.getElementById('document-picker');
        const docTitle = document.getElementById('selected-document-title');
        const docInfo = document.getElementById('selected-document-info');

        if (docIdInput) docIdInput.value = state.document.id;
        if (docTitle) docTitle.textContent = state.document.title || 'Selected Document';
        if (docInfo) docInfo.textContent = state.document.pageCount ? `${state.document.pageCount} pages` : '';
        if (documentPageCountInput && state.document.pageCount) {
          documentPageCountInput.value = String(state.document.pageCount);
        }
        if (selectedDoc) selectedDoc.classList.remove('hidden');
        if (docPicker) docPicker.classList.add('hidden');
      }

	      // Restore details
	      const titleInput = document.getElementById('title');
	      const messageInput = document.getElementById('message');
	      if (titleInput) titleInput.value = state.details.title || '';
	      if (messageInput) messageInput.value = state.details.message || '';

      // Participants and field definitions will be restored after their respective
      // initialization code runs, via restoreParticipants() and restoreFieldDefinitions()
    }
  }

  /**
   * DraftSyncService - handles server draft persistence
   */
  class DraftSyncService {
    constructor(stateManager) {
      this.stateManager = stateManager;
      this.pendingSync = null;
      this.retryCount = 0;
      this.retryTimeout = null;
    }

    async create(state) {
      const payload = {
        wizard_id: state.wizardId,
        wizard_state: state,
        title: state.details.title || 'Untitled Agreement',
        current_step: state.currentStep,
        document_id: state.document.id || null,
        created_by_user_id: currentUserID
      };

      const response = await fetch(draftEndpointWithUserID(draftsEndpoint), {
        method: 'POST',
        credentials: 'same-origin',
        headers: draftRequestHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      return response.json();
    }

    async update(draftId, state, expectedRevision) {
      const payload = {
        expected_revision: expectedRevision,
        wizard_state: state,
        title: state.details.title || 'Untitled Agreement',
        current_step: state.currentStep,
        document_id: state.document.id || null,
        updated_by_user_id: currentUserID
      };

      const response = await fetch(draftEndpointWithUserID(`${draftsEndpoint}/${draftId}`), {
        method: 'PUT',
        credentials: 'same-origin',
        headers: draftRequestHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.status === 409) {
        const error = await response.json().catch(() => ({}));
        const err = new Error('stale_revision');
        err.code = 'stale_revision';
        err.currentRevision = error.error?.details?.current_revision;
        throw err;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      return response.json();
    }

    async load(draftId) {
      const response = await fetch(draftEndpointWithUserID(`${draftsEndpoint}/${draftId}`), {
        credentials: 'same-origin',
        headers: draftRequestHeaders(false)
      });

      if (!response.ok) {
        const err = new Error(`HTTP ${response.status}`);
        err.status = response.status;
        throw err;
      }

      return response.json();
    }

    async delete(draftId) {
      const response = await fetch(draftEndpointWithUserID(`${draftsEndpoint}/${draftId}`), {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: draftRequestHeaders(false)
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP ${response.status}`);
      }
    }

    async list() {
      const response = await fetch(draftEndpointWithUserID(`${draftsEndpoint}?limit=10`), {
        credentials: 'same-origin',
        headers: draftRequestHeaders(false)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    }

    async sync() {
      const state = this.stateManager.getState();
      if (!state.syncPending) return;

      try {
        let result;
        if (state.serverDraftId) {
          result = await this.update(state.serverDraftId, state, state.serverRevision);
        } else {
          result = await this.create(state);
        }

        this.stateManager.markSynced(result.id, result.revision);
        this.retryCount = 0;
        return { success: true, result };
      } catch (error) {
        if (error.code === 'stale_revision') {
          return { success: false, conflict: true, currentRevision: error.currentRevision };
        }
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * SyncOrchestrator - coordinates sync timing and retry logic
   */
  class SyncOrchestrator {
    constructor(stateManager, syncService, statusUpdater) {
      this.stateManager = stateManager;
      this.syncService = syncService;
      this.statusUpdater = statusUpdater;
      this.debounceTimer = null;
      this.retryTimer = null;
      this.retryCount = 0;
      this.isSyncing = false;
      this.channel = null;
      this.isOwner = true;

      this.initBroadcastChannel();
      this.initEventListeners();
    }

    initBroadcastChannel() {
      if (typeof BroadcastChannel === 'undefined') return;

      try {
        this.channel = new BroadcastChannel(WIZARD_CHANNEL_NAME);
        this.channel.onmessage = (event) => this.handleChannelMessage(event.data);
        // Announce presence
        this.channel.postMessage({ type: 'presence', tabId: this.getTabId() });
      } catch (error) {
        console.warn('BroadcastChannel not available:', error);
      }
    }

    getTabId() {
      if (!window._wizardTabId) {
        window._wizardTabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      return window._wizardTabId;
    }

    handleChannelMessage(data) {
      switch (data.type) {
        case 'presence':
          // Another tab is active, negotiate ownership
          if (data.tabId !== this.getTabId()) {
            this.channel?.postMessage({ type: 'ownership_claim', tabId: this.getTabId() });
          }
          break;
        case 'ownership_claim':
          // Yield ownership to the newer tab
          this.isOwner = false;
          break;
        case 'state_updated':
          // Another tab updated state, reload from session
          if (data.tabId !== this.getTabId()) {
            const state = this.stateManager.loadFromSession();
            if (state) {
              this.stateManager.setState(state, { syncPending: Boolean(state.syncPending), notify: false });
              void reconcileBootstrapState({ reason: 'state_updated' }).then(() => {
                this.stateManager.notifyListeners();
              });
            }
          }
          break;
        case 'sync_completed':
          // Another tab completed sync, update our state
          if (data.tabId !== this.getTabId() && data.draftId && data.revision) {
            this.stateManager.markSynced(data.draftId, data.revision);
          }
          break;
      }
    }

    broadcastStateUpdate() {
      this.channel?.postMessage({
        type: 'state_updated',
        tabId: this.getTabId()
      });
    }

    broadcastSyncCompleted(draftId, revision) {
      this.channel?.postMessage({
        type: 'sync_completed',
        tabId: this.getTabId(),
        draftId,
        revision
      });
    }

    initEventListeners() {
      // Force sync on visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.forceSync({ keepalive: true });
        }
      });

      // Force sync on page hide
      window.addEventListener('pagehide', () => {
        this.forceSync({ keepalive: true });
      });

      // Force sync on beforeunload
      window.addEventListener('beforeunload', () => {
        this.forceSync({ keepalive: true });
      });
    }

    scheduleSync() {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.statusUpdater('pending');

      this.debounceTimer = setTimeout(() => {
        this.performSync();
      }, SYNC_DEBOUNCE_MS);
    }

    async forceSync(options = {}) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      const useKeepalive = options && options.keepalive === true;
      const state = this.stateManager.getState();
      if (!useKeepalive) {
        await this.performSync();
        return;
      }

      // Use keepalive PUT so route method remains canonical on unload/pagehide.
      if (state.syncPending && state.serverDraftId) {
        const payload = JSON.stringify({
          expected_revision: state.serverRevision,
          wizard_state: state,
          title: state.details.title || 'Untitled Agreement',
          current_step: state.currentStep,
          document_id: state.document.id || null,
          updated_by_user_id: currentUserID
        });
        try {
          const response = await fetch(draftEndpointWithUserID(`${draftsEndpoint}/${state.serverDraftId}`), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: draftRequestHeaders(),
            body: payload,
            keepalive: true
          });

          if (response.status === 409) {
            const error = await response.json().catch(() => ({}));
            const currentRevision = Number(error?.error?.details?.current_revision || 0);
            this.statusUpdater('conflict');
            this.showConflictDialog(currentRevision > 0 ? currentRevision : state.serverRevision);
            return;
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json().catch(() => ({}));
          const syncedDraftID = String(data?.id || data?.draft_id || state.serverDraftId || '').trim();
          const syncedRevision = Number(data?.revision || 0);
          if (syncedDraftID && Number.isFinite(syncedRevision) && syncedRevision > 0) {
            this.stateManager.markSynced(syncedDraftID, syncedRevision);
            this.statusUpdater('saved');
            this.retryCount = 0;
            this.broadcastSyncCompleted(syncedDraftID, syncedRevision);
            return;
          }
        } catch (error) {
          // Fall back to canonical sync path.
        }
      }

      await this.performSync();
    }

    async performSync() {
      if (this.isSyncing) return;
      if (!this.isOwner) return;

      const state = this.stateManager.getState();
      if (!state.syncPending) {
        this.statusUpdater('saved');
        return;
      }

      this.isSyncing = true;
      this.statusUpdater('saving');

      const result = await this.syncService.sync();

      this.isSyncing = false;

      if (result.success) {
        this.statusUpdater('saved');
        this.retryCount = 0;
        this.broadcastSyncCompleted(result.result.id, result.result.revision);
      } else if (result.conflict) {
        this.statusUpdater('conflict');
        this.showConflictDialog(result.currentRevision);
      } else {
        this.statusUpdater('error');
        this.scheduleRetry();
      }
    }

    scheduleRetry() {
      if (this.retryCount >= SYNC_RETRY_DELAYS.length) {
        console.error('Max sync retries reached');
        return;
      }

      const delay = SYNC_RETRY_DELAYS[this.retryCount];
      this.retryCount++;

      this.retryTimer = setTimeout(() => {
        this.performSync();
      }, delay);
    }

    manualRetry() {
      this.retryCount = 0;
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      this.performSync();
    }

    showConflictDialog(serverRevision) {
      const modal = document.getElementById('conflict-dialog-modal');
      const state = this.stateManager.getState();

      document.getElementById('conflict-local-time').textContent = formatRelativeTime(state.updatedAt);
      document.getElementById('conflict-server-revision').textContent = serverRevision;
      document.getElementById('conflict-server-time').textContent = 'newer version';

      modal?.classList.remove('hidden');
    }
  }

  // Helper function for relative time formatting
  function formatRelativeTime(isoString) {
    if (!isoString) return 'unknown';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  // Sync status UI updater
  function updateSyncStatus(status) {
    const indicator = document.getElementById('sync-status-indicator');
    const icon = document.getElementById('sync-status-icon');
    const text = document.getElementById('sync-status-text');
    const retryBtn = document.getElementById('sync-retry-btn');

    if (!indicator || !icon || !text) return;

    indicator.classList.remove('hidden');

    switch (status) {
      case 'saved':
        icon.className = 'w-2 h-2 rounded-full bg-green-500';
        text.textContent = 'Saved';
        text.className = 'text-gray-600';
        retryBtn?.classList.add('hidden');
        break;
      case 'saving':
        icon.className = 'w-2 h-2 rounded-full bg-blue-500 animate-pulse';
        text.textContent = 'Saving...';
        text.className = 'text-gray-600';
        retryBtn?.classList.add('hidden');
        break;
      case 'pending':
        icon.className = 'w-2 h-2 rounded-full bg-gray-400';
        text.textContent = 'Unsaved changes';
        text.className = 'text-gray-500';
        retryBtn?.classList.add('hidden');
        break;
      case 'error':
        icon.className = 'w-2 h-2 rounded-full bg-amber-500';
        text.textContent = 'Not synced';
        text.className = 'text-amber-600';
        retryBtn?.classList.remove('hidden');
        break;
      case 'conflict':
        icon.className = 'w-2 h-2 rounded-full bg-red-500';
        text.textContent = 'Conflict';
        text.className = 'text-red-600';
        retryBtn?.classList.add('hidden');
        break;
      default:
        indicator.classList.add('hidden');
    }
  }

  // Initialize state manager and sync service
  const stateManager = new WizardStateManager();
  const syncService = new DraftSyncService(stateManager);
  const syncOrchestrator = new SyncOrchestrator(stateManager, syncService, updateSyncStatus);

  // Initialize document preview card (Phase 2)
  const previewCard = createPreviewCard({
    apiBasePath: apiVersionBase,
    basePath: basePath,
  });

  if (createSuccess) {
    const state = stateManager.getState();
    const serverDraftId = state?.serverDraftId;
    stateManager.clear();
    syncOrchestrator.broadcastStateUpdate();

    if (serverDraftId) {
      syncService.delete(serverDraftId).catch((error) => {
        console.warn('Failed to delete server draft after successful create:', error);
      });
    }
  }

  // Wire up retry button
  document.getElementById('sync-retry-btn')?.addEventListener('click', () => {
    syncOrchestrator.manualRetry();
  });

  // Wire up conflict dialog buttons
  document.getElementById('conflict-reload-btn')?.addEventListener('click', async () => {
    const state = stateManager.getState();
    if (state.serverDraftId) {
      try {
        const serverDraft = await syncService.load(state.serverDraftId);
        if (serverDraft.wizard_state) {
          stateManager.setState({
            ...serverDraft.wizard_state,
            serverDraftId: serverDraft.id,
            serverRevision: serverDraft.revision,
            syncPending: false,
          }, { syncPending: false });
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to load server draft:', error);
      }
    }
    document.getElementById('conflict-dialog-modal')?.classList.add('hidden');
  });

  document.getElementById('conflict-force-btn')?.addEventListener('click', async () => {
    // Force overwrite by incrementing to current server revision
    const serverRevision = parseInt(document.getElementById('conflict-server-revision')?.textContent || '0', 10);
    stateManager.setState({
      ...stateManager.getState(),
      serverRevision,
      syncPending: true,
    }, { syncPending: true });
    syncOrchestrator.performSync();
    document.getElementById('conflict-dialog-modal')?.classList.add('hidden');
  });

  document.getElementById('conflict-dismiss-btn')?.addEventListener('click', () => {
    document.getElementById('conflict-dialog-modal')?.classList.add('hidden');
  });

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

  async function reconcileBootstrapState(options = {}) {
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
        // Stale server pointer should be dropped, but local progress can still be resumed explicitly.
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

  // Resume dialog handlers
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
        // Navigate to saved step after form is initialized
        window._resumeToStep = stateManager.getState().currentStep;
        return;
      case 'start_new':
        await clearSavedResumeState({ deleteServerDraft: false });
        // Keep current unsaved form as the new baseline; no server delete.
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

  async function maybeShowResumeDialog() {
    if (isEditMode) return;
    await reconcileBootstrapState({ reason: 'initial' });
    if (!stateManager.hasResumableState()) return;
    showResumeDialog();
  }

  // Check for resumable state on load (only for create mode, not edit).
  void maybeShowResumeDialog();

  // Track state changes for persistence
  function trackWizardStateChanges() {
    // Collect and update state when form changes
    const formState = stateManager.collectFormState();
    stateManager.updateState(formState);
    syncOrchestrator.scheduleSync();
    syncOrchestrator.broadcastStateUpdate();
  }

  // Document Selection
  const documentIdInput = document.getElementById('document_id');
  const selectedDocument = document.getElementById('selected-document');
  const documentPicker = document.getElementById('document-picker');
  const documentSearch = document.getElementById('document-search');
  const documentList = document.getElementById('document-list');
  const changeDocumentBtn = document.getElementById('change-document-btn');
  const selectedDocumentTitle = document.getElementById('selected-document-title');
  const selectedDocumentInfo = document.getElementById('selected-document-info');
  const documentPageCountInput = document.getElementById('document_page_count');
  const documentRemediationPanel = document.getElementById('document-remediation-panel');
  const documentRemediationMessage = document.getElementById('document-remediation-message');
  const documentRemediationStatus = document.getElementById('document-remediation-status');
  const documentRemediationTriggerBtn = document.getElementById('document-remediation-trigger-btn');
  const documentRemediationDismissBtn = document.getElementById('document-remediation-dismiss-btn');
  const agreementTitleInput = document.getElementById('title') as HTMLInputElement | null;

  if (!isEditMode && agreementTitleInput && agreementTitleInput.value.trim() !== '' && !stateManager.hasResumableState()) {
    // In create mode, non-empty template seed should be treated as non-user title so document selection can override it.
    stateManager.setTitleSource(TITLE_SOURCE.SERVER_SEED, { syncPending: false });
  }

  let documents = [];
  let pendingRemediationDocument = null;
  const remediationInFlightByDocument = new Set<string>();
  const remediationIdempotencyByDocument = new Map<string, string>();

  function normalizeDocumentCompatibilityTier(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normalizeDocumentCompatibilityReason(value) {
    return String(value || '').trim().toLowerCase();
  }

  function isDocumentCompatibilityUnsupported(value) {
    return normalizeDocumentCompatibilityTier(value) === 'unsupported';
  }

  function clearSelectedDocumentSelection() {
    if (documentIdInput) {
      documentIdInput.value = '';
    }
    if (selectedDocumentTitle) {
      selectedDocumentTitle.textContent = '';
    }
    if (selectedDocumentInfo) {
      selectedDocumentInfo.textContent = '';
    }
    setDocumentPageCountValue(0);
    stateManager.updateDocument({
      id: null,
      title: null,
      pageCount: null,
    });
    void previewCard.setDocument(null, null, null);
  }

  function buildPDFUnsupportedDocumentMessage(reason = '') {
    const base = 'This document cannot be used because its PDF is incompatible with online signing.';
    const normalizedReason = normalizeDocumentCompatibilityReason(reason);
    if (!normalizedReason) {
      return `${base} Select another document or upload a remediated PDF.`;
    }
    return `${base} Reason: ${normalizedReason}. Select another document or upload a remediated PDF.`;
  }

  function resetDocumentRemediationState() {
    pendingRemediationDocument = null;
    if (documentRemediationStatus) {
      documentRemediationStatus.textContent = '';
      documentRemediationStatus.className = 'mt-2 text-xs text-amber-800';
    }
    if (documentRemediationPanel) {
      documentRemediationPanel.classList.add('hidden');
    }
    if (documentRemediationTriggerBtn) {
      (documentRemediationTriggerBtn as HTMLButtonElement).disabled = false;
      documentRemediationTriggerBtn.textContent = 'Remediate PDF';
    }
  }

  function setDocumentRemediationStatus(message, type = 'info') {
    if (!documentRemediationStatus) return;
    const text = String(message || '').trim();
    documentRemediationStatus.textContent = text;
    const tone = type === 'error' ? 'text-red-700' : (type === 'success' ? 'text-green-700' : 'text-amber-800');
    documentRemediationStatus.className = `mt-2 text-xs ${tone}`;
  }

  function showDocumentRemediationPanel(doc, reason = '') {
    if (!doc || !documentRemediationPanel || !documentRemediationMessage) return;
    pendingRemediationDocument = {
      id: String(doc.id || '').trim(),
      title: String(doc.title || '').trim(),
      pageCount: parsePositiveInt(doc.pageCount, 0),
      compatibilityReason: normalizeDocumentCompatibilityReason(reason || doc.compatibilityReason || ''),
    };
    if (!pendingRemediationDocument.id) {
      return;
    }
    documentRemediationMessage.textContent = buildPDFUnsupportedDocumentMessage(pendingRemediationDocument.compatibilityReason);
    setDocumentRemediationStatus('Run remediation to make this document signable.');
    documentRemediationPanel.classList.remove('hidden');
  }

  function applySelectedDocument(id, title, pages) {
    documentIdInput.value = id;
    selectedDocumentTitle.textContent = title || '';
    selectedDocumentInfo.textContent = `${pages} pages`;
    setDocumentPageCountValue(pages);
    selectedDocument.classList.remove('hidden');
    documentPicker.classList.add('hidden');
    renderFieldRulePreview();
    autoPopulateAgreementTitle(title);
    const pageCount = parsePositiveInt(pages, 0);
    stateManager.updateDocument({
      id,
      title,
      pageCount,
    });
    previewCard.setDocument(id, title, pageCount);
    resetDocumentRemediationState();
  }

  async function pollRemediationStatus(statusURL, dispatchID, documentID) {
    const normalizedStatusURL = String(statusURL || '').trim();
    if (!normalizedStatusURL) return;
    const startedAt = Date.now();
    const timeoutMS = 120000;
    const pollIntervalMS = 1250;
    while (Date.now() - startedAt < timeoutMS) {
      const response = await fetch(normalizedStatusURL, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) {
        const apiError = await parseAPIError(response, 'Failed to read remediation status');
        throw apiError;
      }
      const payload = await response.json();
      const dispatch = payload?.dispatch || {};
      const rawStatus = String(dispatch?.status || '').trim().toLowerCase();
      if (rawStatus === 'succeeded') {
        setDocumentRemediationStatus('Remediation completed. Refreshing document compatibility...', 'success');
        return;
      }
      if (rawStatus === 'failed' || rawStatus === 'canceled' || rawStatus === 'dead_letter') {
        const terminalReason = String(dispatch?.terminal_reason || '').trim();
        const errorMessage = terminalReason
          ? `Remediation failed: ${terminalReason}`
          : 'Remediation did not complete. Please upload a new document or try again.';
        throw { message: errorMessage, code: 'REMEDIATION_FAILED', status: 422 };
      }
      const stageMessage = rawStatus === 'retrying'
        ? 'Remediation is retrying in the queue...'
        : (rawStatus === 'running'
          ? 'Remediation is running...'
          : 'Remediation accepted and waiting for worker...');
      setDocumentRemediationStatus(stageMessage);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMS));
    }
    throw { message: `Timed out waiting for remediation dispatch ${dispatchID} (${documentID})`, code: 'REMEDIATION_TIMEOUT', status: 504 };
  }

  async function triggerPendingDocumentRemediation() {
    const pending = pendingRemediationDocument;
    if (!pending || !pending.id) return;
    const documentID = String(pending.id || '').trim();
    if (!documentID || remediationInFlightByDocument.has(documentID)) return;
    remediationInFlightByDocument.add(documentID);
    if (documentRemediationTriggerBtn) {
      (documentRemediationTriggerBtn as HTMLButtonElement).disabled = true;
      documentRemediationTriggerBtn.textContent = 'Remediating...';
    }
    try {
      let idempotencyKey = remediationIdempotencyByDocument.get(documentID) || '';
      if (!idempotencyKey) {
        idempotencyKey = `esign-remediate-${documentID}-${Date.now()}`;
        remediationIdempotencyByDocument.set(documentID, idempotencyKey);
      }
      const triggerURL = `${apiVersionBase}/esign/documents/${encodeURIComponent(documentID)}/remediate`;
      const triggerResponse = await fetch(triggerURL, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
      });
      if (!triggerResponse.ok) {
        const apiError = await parseAPIError(triggerResponse, 'Failed to trigger remediation');
        throw apiError;
      }
      const triggerPayload = await triggerResponse.json();
      const receipt = triggerPayload?.receipt || {};
      const dispatchID = String(receipt?.dispatch_id || triggerPayload?.dispatch_id || '').trim();
      const mode = String(receipt?.mode || triggerPayload?.mode || '').trim().toLowerCase();
      let statusURL = String(triggerPayload?.dispatch_status_url || '').trim();
      if (!statusURL && dispatchID) {
        statusURL = `${apiVersionBase}/esign/dispatches/${encodeURIComponent(dispatchID)}`;
      }
      if (mode === 'queued' && dispatchID && statusURL) {
        setDocumentRemediationStatus('Remediation queued. Monitoring progress...');
        await pollRemediationStatus(statusURL, dispatchID, documentID);
      }
      await loadDocuments();
      const refreshedDoc = findDocumentByID(documentID);
      if (!refreshedDoc || isDocumentCompatibilityUnsupported(refreshedDoc.compatibilityTier)) {
        setDocumentRemediationStatus('Remediation finished, but this PDF is still incompatible.', 'error');
        announceError('Document remains incompatible after remediation. Upload another PDF.');
        return;
      }
      applySelectedDocument(refreshedDoc.id, refreshedDoc.title, refreshedDoc.pageCount);
      if (window.toastManager) {
        window.toastManager.success('Document remediated successfully. You can continue.');
      } else {
        showToast('Document remediated successfully. You can continue.', 'success');
      }
    } catch (error) {
      setDocumentRemediationStatus(String(error?.message || 'Remediation failed').trim(), 'error');
      announceError(error?.message || 'Failed to remediate document', error?.code || '', error?.status || 0);
    } finally {
      remediationInFlightByDocument.delete(documentID);
      if (documentRemediationTriggerBtn) {
        (documentRemediationTriggerBtn as HTMLButtonElement).disabled = false;
        documentRemediationTriggerBtn.textContent = 'Remediate PDF';
      }
    }
  }

  function findDocumentByID(documentID) {
    const targetID = String(documentID || '').trim();
    if (targetID === '') return null;
    const fromMainList = documents.find((doc) => String(doc.id || '').trim() === targetID);
    if (fromMainList) return fromMainList;
    const fromRecent = typeaheadState.recentDocuments.find((doc) => String(doc.id || '').trim() === targetID);
    if (fromRecent) return fromRecent;
    const fromSearch = typeaheadState.searchResults.find((doc) => String(doc.id || '').trim() === targetID);
    if (fromSearch) return fromSearch;
    return null;
  }

  function ensureSelectedDocumentCompatibility() {
    const selectedDoc = findDocumentByID(documentIdInput?.value || '');
    if (!selectedDoc) return true;
    const compatibilityTier = normalizeDocumentCompatibilityTier(selectedDoc.compatibilityTier);
    if (!isDocumentCompatibilityUnsupported(compatibilityTier)) {
      resetDocumentRemediationState();
      return true;
    }
    showDocumentRemediationPanel(selectedDoc, selectedDoc.compatibilityReason || '');
    clearSelectedDocumentSelection();
    announceError(buildPDFUnsupportedDocumentMessage(selectedDoc.compatibilityReason || ''));
    if (selectedDocument) {
      selectedDocument.classList.add('hidden');
    }
    if (documentPicker) {
      documentPicker.classList.remove('hidden');
    }
    documentSearch?.focus();
    return false;
  }

  function setDocumentPageCountValue(value) {
    const resolved = parsePositiveInt(value, 0);
    if (documentPageCountInput) {
      documentPageCountInput.value = String(resolved);
    }
  }

  function hydrateSelectedDocumentFromList() {
    const currentID = (documentIdInput?.value || '').trim();
    if (!currentID) return;
    const selected = documents.find((doc) => String(doc.id || '').trim() === currentID);
    if (!selected) return;

    if (!selectedDocumentTitle.textContent.trim()) {
      selectedDocumentTitle.textContent = selected.title || 'Untitled';
    }
    if (!selectedDocumentInfo.textContent.trim() || selectedDocumentInfo.textContent.trim() === 'pages') {
      selectedDocumentInfo.textContent = `${selected.pageCount || 0} pages`;
    }
    setDocumentPageCountValue(selected.pageCount || 0);
    selectedDocument.classList.remove('hidden');
    documentPicker.classList.add('hidden');
  }

  async function loadDocuments() {
    try {
      const params = new URLSearchParams({
        per_page: '100',
        sort: 'created_at',
        sort_desc: 'true',
      });
      const response = await fetch(`${apiBase}/panels/esign_documents?${params.toString()}`, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        const apiError = await parseAPIError(response, 'Failed to load documents');
        throw apiError;
      }
      const data = await response.json();
      const rawDocuments = Array.isArray(data?.records)
        ? data.records
        : (Array.isArray(data?.items) ? data.items : []);
      const sortedRawDocuments = rawDocuments.slice().sort((left, right) => {
        const leftDate = Date.parse(String(
          left?.created_at ?? left?.createdAt ?? left?.updated_at ?? left?.updatedAt ?? ''
        ));
        const rightDate = Date.parse(String(
          right?.created_at ?? right?.createdAt ?? right?.updated_at ?? right?.updatedAt ?? ''
        ));
        const leftTs = Number.isFinite(leftDate) ? leftDate : 0;
        const rightTs = Number.isFinite(rightDate) ? rightDate : 0;
        return rightTs - leftTs;
      });
      documents = sortedRawDocuments
        .map((record) => normalizeDocumentOption(record))
        .filter((record) => record.id !== '');
      renderDocumentList(documents);
      hydrateSelectedDocumentFromList();
    } catch (error) {
      const userMessage = mapUserFacingError(error?.message || 'Failed to load documents', error?.code || '', error?.status || 0);
      documentList.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${escapeHtml(userMessage)}</div>`;
    }
  }

  function renderDocumentList(docs) {
    if (docs.length === 0) {
      documentList.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${escapeHtml(documentsUploadURL)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }

    documentList.innerHTML = docs.map((doc, index) => {
      const safeID = escapeHtml(String(doc.id || '').trim());
      const safeTitle = escapeHtml(String(doc.title || '').trim());
      const safePageCount = String(parsePositiveInt(doc.pageCount, 0));
      const compatibilityTier = normalizeDocumentCompatibilityTier(doc.compatibilityTier);
      const compatibilityReason = normalizeDocumentCompatibilityReason(doc.compatibilityReason);
      const safeCompatibilityTier = escapeHtml(compatibilityTier);
      const safeCompatibilityReason = escapeHtml(compatibilityReason);
      const isUnsupported = isDocumentCompatibilityUnsupported(compatibilityTier);
      const unsupportedBadge = isUnsupported
        ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>'
        : '';
      return `
      <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              role="option"
              aria-selected="false"
              tabindex="${index === 0 ? '0' : '-1'}"
              data-document-id="${safeID}"
              data-document-title="${safeTitle}"
              data-document-pages="${safePageCount}"
              data-document-compatibility-tier="${safeCompatibilityTier}"
              data-document-compatibility-reason="${safeCompatibilityReason}">
        <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 truncate">${safeTitle}</div>
          <div class="text-xs text-gray-500">${safePageCount} pages ${unsupportedBadge}</div>
        </div>
      </button>
    `;
    }).join('');

    // Attach click and keyboard handlers
    const options = documentList.querySelectorAll('.document-option');
    options.forEach((btn, index) => {
      btn.addEventListener('click', () => selectDocument(btn));
      btn.addEventListener('keydown', (e) => {
        let nextIndex = index;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          nextIndex = Math.min(index + 1, options.length - 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          nextIndex = Math.max(index - 1, 0);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectDocument(btn);
          return;
        } else if (e.key === 'Home') {
          e.preventDefault();
          nextIndex = 0;
        } else if (e.key === 'End') {
          e.preventDefault();
          nextIndex = options.length - 1;
        }
        if (nextIndex !== index) {
          options[nextIndex].focus();
          options[nextIndex].setAttribute('tabindex', '0');
          btn.setAttribute('tabindex', '-1');
        }
      });
    });
  }

  function selectDocument(btn) {
    const id = btn.getAttribute('data-document-id');
    const title = btn.getAttribute('data-document-title');
    const pages = btn.getAttribute('data-document-pages');
    const compatibilityTier = normalizeDocumentCompatibilityTier(
      btn.getAttribute('data-document-compatibility-tier')
    );
    const compatibilityReason = normalizeDocumentCompatibilityReason(
      btn.getAttribute('data-document-compatibility-reason')
    );

    if (isDocumentCompatibilityUnsupported(compatibilityTier)) {
      showDocumentRemediationPanel({ id, title, pageCount: pages, compatibilityReason });
      clearSelectedDocumentSelection();
      announceError(buildPDFUnsupportedDocumentMessage(compatibilityReason));
      documentSearch?.focus();
      return;
    }
    applySelectedDocument(id, title, pages);
  }

  /**
   * Auto-populate agreement title from selected document unless user explicitly owns the title.
   */
  function autoPopulateAgreementTitle(documentTitle: string | null): void {
    const titleInput = document.getElementById('title') as HTMLInputElement | null;
    if (!titleInput) return;

    const state = stateManager.getState();
    const currentTitle = titleInput.value.trim();
    const titleSource = normalizeTitleSource(
      state?.titleSource,
      currentTitle === '' ? TITLE_SOURCE.AUTOFILL : TITLE_SOURCE.USER,
    );
    if (currentTitle && titleSource === TITLE_SOURCE.USER) {
      return;
    }

    const suggestedTitle = String(documentTitle || '').trim();
    if (!suggestedTitle) return;

    titleInput.value = suggestedTitle;

    // Update wizard state to reflect the auto-populated title
    stateManager.updateDetails({
      title: suggestedTitle,
      message: stateManager.getState().details.message || '',
    }, { titleSource: TITLE_SOURCE.AUTOFILL });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  if (changeDocumentBtn) {
    changeDocumentBtn.addEventListener('click', () => {
      selectedDocument.classList.add('hidden');
      documentPicker.classList.remove('hidden');
      resetDocumentRemediationState();
      // Focus the search input and show recent documents
      documentSearch?.focus();
      openTypeaheadDropdown();
    });
  }

  if (documentRemediationTriggerBtn) {
    documentRemediationTriggerBtn.addEventListener('click', () => {
      void triggerPendingDocumentRemediation();
    });
  }
  if (documentRemediationDismissBtn) {
    documentRemediationDismissBtn.addEventListener('click', () => {
      resetDocumentRemediationState();
      documentSearch?.focus();
    });
  }

  // =============================================================================
  // Document Typeahead (Phase 1.8)
  // =============================================================================

  const TYPEAHEAD_DEBOUNCE_MS = 300;
  const RECENT_DOCUMENTS_LIMIT = 5;
  const SEARCH_RESULTS_LIMIT = 10;

  // Typeahead DOM elements
  const documentTypeahead = document.getElementById('document-typeahead');
  const documentTypeaheadDropdown = document.getElementById('document-typeahead-dropdown');
  const documentRecentSection = document.getElementById('document-recent-section');
  const documentRecentList = document.getElementById('document-recent-list');
  const documentSearchSection = document.getElementById('document-search-section');
  const documentSearchList = document.getElementById('document-search-list');
  const documentEmptyState = document.getElementById('document-empty-state');
  const documentDropdownLoading = document.getElementById('document-dropdown-loading');
  const documentSearchLoading = document.getElementById('document-search-loading');

  // Typeahead state
  interface TypeaheadState {
    isOpen: boolean;
    query: string;
    recentDocuments: Array<{ id: string; title: string; pageCount: number; compatibilityTier?: string; compatibilityReason?: string; createdAt?: string }>;
    searchResults: Array<{ id: string; title: string; pageCount: number; compatibilityTier?: string; compatibilityReason?: string }>;
    selectedIndex: number;
    isLoading: boolean;
    isSearchMode: boolean;
  }

  const typeaheadState: TypeaheadState = {
    isOpen: false,
    query: '',
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: false,
    isSearchMode: false,
  };
  let typeaheadSearchRequestID = 0;
  let typeaheadSearchAbortController: AbortController | null = null;

  /**
   * Simple debounce utility for typeahead search
   */
  function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = null;
      }, delay);
    };
  }

  /**
   * Load recent documents for the current user
   * Fetches up to 5 documents sorted by updated_at descending
   */
  async function loadRecentDocuments(): Promise<void> {
    try {
      const params = new URLSearchParams({
        sort: 'updated_at',
        sort_desc: 'true',
        per_page: String(RECENT_DOCUMENTS_LIMIT),
      });
      // Add user_id for filtering by creator if available
      if (currentUserID) {
        params.set('created_by_user_id', currentUserID);
      }
      const response = await fetch(`${apiBase}/panels/esign_documents?${params}`, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) {
        console.warn('Failed to load recent documents:', response.status);
        return;
      }
      const data = await response.json();
      const rawDocuments = Array.isArray(data?.records)
        ? data.records
        : (Array.isArray(data?.items) ? data.items : []);
      typeaheadState.recentDocuments = rawDocuments
        .map((record) => normalizeDocumentOption(record))
        .filter((record) => record.id !== '')
        .slice(0, RECENT_DOCUMENTS_LIMIT);
    } catch (error) {
      console.warn('Error loading recent documents:', error);
    }
  }

  /**
   * Search documents by title with debounced API call
   */
  async function searchDocuments(query: string): Promise<void> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      if (typeaheadSearchAbortController) {
        typeaheadSearchAbortController.abort();
        typeaheadSearchAbortController = null;
      }
      typeaheadState.isSearchMode = false;
      typeaheadState.searchResults = [];
      renderTypeaheadDropdown();
      return;
    }

    const requestID = ++typeaheadSearchRequestID;
    if (typeaheadSearchAbortController) {
      typeaheadSearchAbortController.abort();
    }
    typeaheadSearchAbortController = new AbortController();

    typeaheadState.isLoading = true;
    typeaheadState.isSearchMode = true;
    renderTypeaheadDropdown();

    try {
      const params = new URLSearchParams({
        q: trimmedQuery,
        sort: 'updated_at',
        sort_desc: 'true',
        per_page: String(SEARCH_RESULTS_LIMIT),
      });
      const response = await fetch(`${apiBase}/panels/esign_documents?${params}`, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
        signal: typeaheadSearchAbortController.signal,
      });
      if (requestID !== typeaheadSearchRequestID) {
        return;
      }
      if (!response.ok) {
        console.warn('Failed to search documents:', response.status);
        typeaheadState.searchResults = [];
        typeaheadState.isLoading = false;
        renderTypeaheadDropdown();
        return;
      }
      const data = await response.json();
      const rawDocuments = Array.isArray(data?.records)
        ? data.records
        : (Array.isArray(data?.items) ? data.items : []);
      typeaheadState.searchResults = rawDocuments
        .map((record) => normalizeDocumentOption(record))
        .filter((record) => record.id !== '')
        .slice(0, SEARCH_RESULTS_LIMIT);
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      console.warn('Error searching documents:', error);
      typeaheadState.searchResults = [];
    } finally {
      if (requestID === typeaheadSearchRequestID) {
        typeaheadState.isLoading = false;
        renderTypeaheadDropdown();
      }
    }
  }

  const debouncedSearchDocuments = debounce(searchDocuments, TYPEAHEAD_DEBOUNCE_MS);

  /**
   * Open the typeahead dropdown
   */
  function openTypeaheadDropdown(): void {
    if (!documentTypeaheadDropdown) return;
    typeaheadState.isOpen = true;
    typeaheadState.selectedIndex = -1;
    documentTypeaheadDropdown.classList.remove('hidden');
    documentSearch?.setAttribute('aria-expanded', 'true');
    // Hide the fallback document list when typeahead is open
    documentList?.classList.add('hidden');
    renderTypeaheadDropdown();
  }

  /**
   * Close the typeahead dropdown
   */
  function closeTypeaheadDropdown(): void {
    if (!documentTypeaheadDropdown) return;
    typeaheadState.isOpen = false;
    typeaheadState.selectedIndex = -1;
    documentTypeaheadDropdown.classList.add('hidden');
    documentSearch?.setAttribute('aria-expanded', 'false');
    // Show the fallback document list when typeahead is closed
    documentList?.classList.remove('hidden');
  }

  /**
   * Render the typeahead dropdown content
   */
  function renderTypeaheadDropdown(): void {
    if (!documentTypeaheadDropdown) return;

    // Handle loading state
    if (typeaheadState.isLoading) {
      documentDropdownLoading?.classList.remove('hidden');
      documentRecentSection?.classList.add('hidden');
      documentSearchSection?.classList.add('hidden');
      documentEmptyState?.classList.add('hidden');
      documentSearchLoading?.classList.remove('hidden');
      return;
    }

    documentDropdownLoading?.classList.add('hidden');
    documentSearchLoading?.classList.add('hidden');

    if (typeaheadState.isSearchMode) {
      // Show search results
      documentRecentSection?.classList.add('hidden');
      if (typeaheadState.searchResults.length > 0) {
        documentSearchSection?.classList.remove('hidden');
        documentEmptyState?.classList.add('hidden');
        renderTypeaheadList(documentSearchList, typeaheadState.searchResults, 'search');
      } else {
        documentSearchSection?.classList.add('hidden');
        documentEmptyState?.classList.remove('hidden');
      }
    } else {
      // Show recent documents
      documentSearchSection?.classList.add('hidden');
      if (typeaheadState.recentDocuments.length > 0) {
        documentRecentSection?.classList.remove('hidden');
        documentEmptyState?.classList.add('hidden');
        renderTypeaheadList(documentRecentList, typeaheadState.recentDocuments, 'recent');
      } else {
        documentRecentSection?.classList.add('hidden');
        documentEmptyState?.classList.remove('hidden');
        if (documentEmptyState) {
          documentEmptyState.textContent = 'No recent documents';
        }
      }
    }
  }

  /**
   * Render a list of documents in the typeahead dropdown
   */
  function renderTypeaheadList(
    container: HTMLElement | null,
    docs: Array<{ id: string; title: string; pageCount: number; compatibilityTier?: string; compatibilityReason?: string; createdAt?: string }>,
    listType: 'recent' | 'search'
  ): void {
    if (!container) return;

    container.innerHTML = docs.map((doc, index) => {
      const globalIndex = listType === 'search' ? index : index;
      const isSelected = typeaheadState.selectedIndex === globalIndex;
      const safeID = escapeHtml(String(doc.id || '').trim());
      const safeTitle = escapeHtml(String(doc.title || '').trim());
      const safePageCount = String(parsePositiveInt(doc.pageCount, 0));
      const compatibilityTier = normalizeDocumentCompatibilityTier(doc.compatibilityTier);
      const compatibilityReason = normalizeDocumentCompatibilityReason(doc.compatibilityReason);
      const safeCompatibilityTier = escapeHtml(compatibilityTier);
      const safeCompatibilityReason = escapeHtml(compatibilityReason);
      const isUnsupported = isDocumentCompatibilityUnsupported(compatibilityTier);
      const unsupportedBadge = isUnsupported
        ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>'
        : '';
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${isSelected ? 'bg-blue-50' : ''}"
          role="option"
          aria-selected="${isSelected}"
          tabindex="-1"
          data-document-id="${safeID}"
          data-document-title="${safeTitle}"
          data-document-pages="${safePageCount}"
          data-document-compatibility-tier="${safeCompatibilityTier}"
          data-document-compatibility-reason="${safeCompatibilityReason}"
          data-typeahead-index="${globalIndex}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${safeTitle}</div>
            <div class="text-xs text-gray-500">${safePageCount} pages ${unsupportedBadge}</div>
          </div>
        </button>
      `;
    }).join('');

    // Attach click handlers to typeahead options
    container.querySelectorAll('.typeahead-option').forEach((btn) => {
      btn.addEventListener('click', () => selectDocumentFromTypeahead(btn as HTMLElement));
    });
  }

  /**
   * Select a document from the typeahead dropdown
   */
  function selectDocumentFromTypeahead(btn: HTMLElement): void {
    const id = btn.getAttribute('data-document-id');
    const title = btn.getAttribute('data-document-title');
    const pages = btn.getAttribute('data-document-pages');
    const compatibilityTier = normalizeDocumentCompatibilityTier(
      btn.getAttribute('data-document-compatibility-tier')
    );
    const compatibilityReason = normalizeDocumentCompatibilityReason(
      btn.getAttribute('data-document-compatibility-reason')
    );

    if (!id) return;
    if (isDocumentCompatibilityUnsupported(compatibilityTier)) {
      showDocumentRemediationPanel({ id, title, pageCount: pages, compatibilityReason });
      clearSelectedDocumentSelection();
      announceError(buildPDFUnsupportedDocumentMessage(compatibilityReason));
      documentSearch?.focus();
      return;
    }
    applySelectedDocument(id, title, pages);
    closeTypeaheadDropdown();
    if (documentSearch) {
      (documentSearch as HTMLInputElement).value = '';
    }
    typeaheadState.query = '';
    typeaheadState.isSearchMode = false;
    typeaheadState.searchResults = [];
  }

  /**
   * Handle keyboard navigation in typeahead
   */
  function handleTypeaheadKeydown(e: KeyboardEvent): void {
    if (!typeaheadState.isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        openTypeaheadDropdown();
      }
      return;
    }

    const currentList = typeaheadState.isSearchMode
      ? typeaheadState.searchResults
      : typeaheadState.recentDocuments;
    const maxIndex = currentList.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        typeaheadState.selectedIndex = Math.min(typeaheadState.selectedIndex + 1, maxIndex);
        renderTypeaheadDropdown();
        scrollToSelectedOption();
        break;
      case 'ArrowUp':
        e.preventDefault();
        typeaheadState.selectedIndex = Math.max(typeaheadState.selectedIndex - 1, 0);
        renderTypeaheadDropdown();
        scrollToSelectedOption();
        break;
      case 'Enter':
        e.preventDefault();
        if (typeaheadState.selectedIndex >= 0 && typeaheadState.selectedIndex <= maxIndex) {
          const selectedDoc = currentList[typeaheadState.selectedIndex];
          if (selectedDoc) {
            // Create a mock button element with the document data
            const mockBtn = document.createElement('button');
            mockBtn.setAttribute('data-document-id', selectedDoc.id);
            mockBtn.setAttribute('data-document-title', selectedDoc.title);
            mockBtn.setAttribute('data-document-pages', String(selectedDoc.pageCount));
            mockBtn.setAttribute('data-document-compatibility-tier', String(selectedDoc.compatibilityTier || ''));
            mockBtn.setAttribute('data-document-compatibility-reason', String(selectedDoc.compatibilityReason || ''));
            selectDocumentFromTypeahead(mockBtn);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeTypeaheadDropdown();
        break;
      case 'Tab':
        closeTypeaheadDropdown();
        break;
      case 'Home':
        e.preventDefault();
        typeaheadState.selectedIndex = 0;
        renderTypeaheadDropdown();
        scrollToSelectedOption();
        break;
      case 'End':
        e.preventDefault();
        typeaheadState.selectedIndex = maxIndex;
        renderTypeaheadDropdown();
        scrollToSelectedOption();
        break;
    }
  }

  /**
   * Scroll the dropdown to show the selected option
   */
  function scrollToSelectedOption(): void {
    if (!documentTypeaheadDropdown) return;
    const selectedOption = documentTypeaheadDropdown.querySelector(`[data-typeahead-index="${typeaheadState.selectedIndex}"]`);
    if (selectedOption) {
      selectedOption.scrollIntoView({ block: 'nearest' });
    }
  }

  // Typeahead event listeners
  if (documentSearch) {
    // Handle input for search
    documentSearch.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const term = target.value;
      typeaheadState.query = term;

      if (!typeaheadState.isOpen) {
        openTypeaheadDropdown();
      }

      if (term.trim()) {
        typeaheadState.isLoading = true;
        renderTypeaheadDropdown();
        debouncedSearchDocuments(term);
      } else {
        typeaheadState.isSearchMode = false;
        typeaheadState.searchResults = [];
        renderTypeaheadDropdown();
      }

      // Also filter the fallback list for backward compatibility
      const filtered = documents.filter((doc) =>
        String(doc.title || '').toLowerCase().includes(term.toLowerCase())
      );
      renderDocumentList(filtered);
    });

    // Handle focus to show dropdown
    documentSearch.addEventListener('focus', () => {
      openTypeaheadDropdown();
    });

    // Handle keyboard navigation
    documentSearch.addEventListener('keydown', handleTypeaheadKeydown);
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (documentTypeahead && !documentTypeahead.contains(target)) {
      closeTypeaheadDropdown();
    }
  });

  // Load documents on page load
  loadDocuments();

  // Load recent documents for typeahead
  loadRecentDocuments();

  // Participants Management (v2 ID-based)
  const participantsContainer = document.getElementById('participants-container');
  const participantTemplate = document.getElementById('participant-template');
  const addParticipantBtn = document.getElementById('add-participant-btn');
  let participantCounter = 0;
  let participantFormIndex = 0;

  function generateParticipantId() {
    // Generate a temporary client-side ID for new participants
    // Backend will assign permanent IDs on save
    return `temp_${Date.now()}_${participantCounter++}`;
  }

  function addParticipant(data = {}) {
    const clone = participantTemplate.content.cloneNode(true);
    const entry = clone.querySelector('.participant-entry');

    // Use existing ID or generate a new one
    const participantId = data.id || generateParticipantId();
    entry.setAttribute('data-participant-id', participantId);

    const idInput = entry.querySelector('.participant-id-input');
    const nameInput = entry.querySelector('input[name="participants[].name"]');
    const emailInput = entry.querySelector('input[name="participants[].email"]');
    const roleSelect = entry.querySelector('select[name="participants[].role"]');
    const signingStageInput = entry.querySelector('input[name="participants[].signing_stage"]');
    const notifyInput = entry.querySelector('input[name="participants[].notify"]');
    const signingStageWrapper = entry.querySelector('.signing-stage-wrapper');

    // Use stable entity IDs in values while preserving index-addressed form arrays.
    const formIndex = participantFormIndex++;
    idInput.name = `participants[${formIndex}].id`;
    idInput.value = participantId;
    nameInput.name = `participants[${formIndex}].name`;
    emailInput.name = `participants[${formIndex}].email`;
    roleSelect.name = `participants[${formIndex}].role`;
    if (signingStageInput) {
      signingStageInput.name = `participants[${formIndex}].signing_stage`;
    }
    if (notifyInput) {
      notifyInput.name = `participants[${formIndex}].notify`;
    }

    if (data.name) nameInput.value = data.name;
    if (data.email) emailInput.value = data.email;
    if (data.role) roleSelect.value = data.role;
    if (signingStageInput && data.signing_stage) {
      signingStageInput.value = data.signing_stage;
    }
    if (notifyInput) {
      notifyInput.checked = data.notify !== false;
    }

    const syncSigningStageVisibility = () => {
      if (!signingStageWrapper || !signingStageInput) return;
      const isSigner = roleSelect.value === 'signer';
      signingStageWrapper.classList.toggle('hidden', !isSigner);
      if (!isSigner) {
        signingStageInput.value = '';
      } else if (!signingStageInput.value) {
        signingStageInput.value = '1';
      }
    };
    syncSigningStageVisibility();

    entry.querySelector('.remove-participant-btn').addEventListener('click', () => {
      entry.remove();
      updateFieldParticipantOptions();
    });

    roleSelect.addEventListener('change', () => {
      syncSigningStageVisibility();
      updateFieldParticipantOptions();
    });

    participantsContainer.appendChild(clone);
  }

  addParticipantBtn.addEventListener('click', () => addParticipant());

  // Initialize with existing participants or add one empty.
  if (initialParticipants.length > 0) {
    initialParticipants.forEach((participant) => {
      addParticipant({
        id: String(participant.id || '').trim(),
        name: String(participant.name || '').trim(),
        email: String(participant.email || '').trim(),
        role: String(participant.role || 'signer').trim() || 'signer',
        notify: participant.notify !== false,
        signing_stage: Number(participant.signing_stage || participant.signingStage || 1) || 1,
      });
    });
  } else {
    addParticipant();
  }

  // Field Definitions Management (v2 ID-based)
  const fieldDefinitionsContainer = document.getElementById('field-definitions-container');
  const fieldDefinitionTemplate = document.getElementById('field-definition-template');
  const addFieldBtn = document.getElementById('add-field-btn');
  const addFieldBtnContainer = document.getElementById('add-field-btn-container');
  const addFieldDefinitionEmptyBtn = document.getElementById('add-field-definition-empty-btn');
  const fieldDefinitionsEmptyState = document.getElementById('field-definitions-empty-state');
  const fieldRulesContainer = document.getElementById('field-rules-container');
  const fieldRuleTemplate = document.getElementById('field-rule-template');
  const addFieldRuleBtn = document.getElementById('add-field-rule-btn');
  const fieldRulesEmptyState = document.getElementById('field-rules-empty-state');
  const fieldRulesPreview = document.getElementById('field-rules-preview');
  const fieldRulesJSONInput = document.getElementById('field_rules_json');
  const fieldPlacementsJSONInput = document.getElementById('field_placements_json');
  let fieldDefinitionCounter = 0;
  let fieldInstanceFormIndex = 0;
  let fieldRuleFormIndex = 0;

  function generateFieldDefinitionId() {
    // Generate a temporary client-side ID for new field definitions
    // Backend will assign permanent IDs on save
    return `temp_field_${Date.now()}_${fieldDefinitionCounter++}`;
  }

  function generateFieldRuleId() {
    return `rule_${Date.now()}_${fieldRuleFormIndex}`;
  }

  function getSignerParticipants() {
    const entries = participantsContainer.querySelectorAll('.participant-entry');
    const signers = [];
    entries.forEach((entry) => {
      const participantId = entry.getAttribute('data-participant-id');
      const roleSelect = entry.querySelector('select[name*=".role"]');
      const nameInput = entry.querySelector('input[name*=".name"]');
      const emailInput = entry.querySelector('input[name*=".email"]');
      if (roleSelect.value === 'signer') {
        signers.push({
          id: participantId,
          name: nameInput.value || emailInput.value || `Signer`,
          email: emailInput.value
        });
      }
    });
    return signers;
  }

  function resolveSignerSelection(preferredValue, signers) {
    const preferred = String(preferredValue || '').trim();
    if (preferred && signers.some((signer) => signer.id === preferred)) {
      return preferred;
    }
    if (signers.length === 1) {
      // Phase 1.4: Deterministic auto-assignment when only one signer exists.
      return signers[0].id;
    }
    return '';
  }

  function syncSignerSelectOptions(select, signers, preferredValue = '') {
    if (!select) return;
    const resolvedSelection = resolveSignerSelection(preferredValue, signers);
    select.innerHTML = '<option value="">Select signer...</option>';
    signers.forEach((signer) => {
      const option = document.createElement('option');
      option.value = signer.id;
      option.textContent = signer.name;
      select.appendChild(option);
    });
    select.value = resolvedSelection;
  }

  function reconcileStep4SignerSelects(signers = getSignerParticipants()) {
    const participantSelects = fieldDefinitionsContainer.querySelectorAll('.field-participant-select');
    const ruleParticipantSelects = fieldRulesContainer
      ? fieldRulesContainer.querySelectorAll('.field-rule-participant-select')
      : [];

    participantSelects.forEach((select) => {
      syncSignerSelectOptions(select, signers, select.value);
    });
    ruleParticipantSelects.forEach((select) => {
      syncSignerSelectOptions(select, signers, select.value);
    });
  }

  function updateFieldParticipantOptions() {
    const signers = getSignerParticipants();
    reconcileStep4SignerSelects(signers);

    renderFieldRulePreview();
  }

  function getCurrentDocumentPageCount() {
    const explicit = parsePositiveInt(documentPageCountInput?.value || '0', 0);
    if (explicit > 0) return explicit;
    const match = String(selectedDocumentInfo?.textContent || '').match(/(\d+)\s+pages?/i);
    if (match) {
      const parsed = parsePositiveInt(match[1], 0);
      if (parsed > 0) return parsed;
    }
    return 1;
  }

  function updateFieldRulesEmptyState() {
    if (!fieldRulesContainer || !fieldRulesEmptyState) return;
    const rows = fieldRulesContainer.querySelectorAll('.field-rule-entry');
    fieldRulesEmptyState.classList.toggle('hidden', rows.length > 0);
  }

  function collectFieldRulesForState() {
    if (!fieldRulesContainer) return [];
    const terminalPage = getCurrentDocumentPageCount();
    const rows = fieldRulesContainer.querySelectorAll('.field-rule-entry');
    const out = [];
    rows.forEach((row) => {
      const rule = normalizeFieldRuleState({
        id: row.getAttribute('data-field-rule-id') || '',
        type: row.querySelector('.field-rule-type-select')?.value || '',
        participantId: row.querySelector('.field-rule-participant-select')?.value || '',
        fromPage: row.querySelector('.field-rule-from-page-input')?.value || '',
        toPage: row.querySelector('.field-rule-to-page-input')?.value || '',
        page: row.querySelector('.field-rule-page-input')?.value || '',
        excludeLastPage: Boolean(row.querySelector('.field-rule-exclude-last-input')?.checked),
        excludePages: parseExcludePagesCSV(row.querySelector('.field-rule-exclude-pages-input')?.value || ''),
        required: (row.querySelector('.field-rule-required-select')?.value || '1') !== '0',
      }, terminalPage);
      if (!rule.type) return;
      out.push(rule);
    });
    return out;
  }

  function collectFieldRulesForForm() {
    return collectFieldRulesForState().map((rule) => toFieldRuleFormPayload(rule));
  }

  function expandRulesForPreview(rules, terminalPage) {
    return expandRuleDefinitionsForPreview(rules, terminalPage);
  }

  function renderFieldRulePreview() {
    if (!fieldRulesPreview) return;
    const rules = collectFieldRulesForState();
    const terminalPage = getCurrentDocumentPageCount();
    const expanded = expandRulesForPreview(rules, terminalPage);
    const signers = getSignerParticipants();
    const signerNames = new Map(signers.map((signer) => [String(signer.id), signer.name]));

    if (fieldRulesJSONInput) {
      fieldRulesJSONInput.value = JSON.stringify(collectFieldRulesForForm());
    }

    if (!expanded.length) {
      fieldRulesPreview.innerHTML = '<p>No rules configured.</p>';
      return;
    }

    const byType = expanded.reduce((acc, field) => {
      const key = field.type;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const rows = expanded.slice(0, 8).map((field) => {
      const signerName = signerNames.get(String(field.participantId)) || 'Unassigned signer';
      return `<li class="flex items-center justify-between"><span>${field.type === 'initials' ? 'Initials' : 'Signature'} on page ${field.page}</span><span class="text-gray-500">${escapeHtml(String(signerName))}</span></li>`;
    }).join('');
    const moreCount = expanded.length - 8;

    fieldRulesPreview.innerHTML = `
      <p class="text-gray-700">${expanded.length} generated field${expanded.length !== 1 ? 's' : ''} (${byType.initials || 0} initials, ${byType.signature || 0} signatures)</p>
      <ul class="space-y-1">${rows}</ul>
      ${moreCount > 0 ? `<p class="text-gray-500">+${moreCount} more</p>` : ''}
    `;
  }

  function collectPlacementFieldDefinitions() {
    const signers = getSignerParticipants();
    const signerNames = new Map(signers.map((signer) => [String(signer.id), signer.name || signer.email || 'Signer']));
    const definitions = [];

    const manualFieldEntries = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
    manualFieldEntries.forEach((field) => {
      const definitionId = String(field.getAttribute('data-field-definition-id') || '').trim();
      const typeSelect = field.querySelector('.field-type-select');
      const participantSelect = field.querySelector('.field-participant-select');
      const pageInput = field.querySelector('input[name*=".page"]');
      const fieldType = String(typeSelect?.value || 'text').trim() || 'text';
      const participantId = String(participantSelect?.value || '').trim();
      const page = parseInt(String(pageInput?.value || '1'), 10) || 1;
      definitions.push({
        definitionId,
        fieldType,
        participantId,
        participantName: signerNames.get(participantId) || 'Unassigned',
        page,
      });
    });

    const generatedRuleFields = expandRulesForPreview(collectFieldRulesForState(), getCurrentDocumentPageCount());

    // Phase 3: Create link groups from rules that generate multiple fields
    const fieldsByRuleId = new Map<string, string[]>();
    generatedRuleFields.forEach((field) => {
      const ruleId = String((field as any).ruleId || '').trim();
      const definitionId = String(field.id || '').trim();
      if (ruleId && definitionId) {
        const existing = fieldsByRuleId.get(ruleId) || [];
        existing.push(definitionId);
        fieldsByRuleId.set(ruleId, existing);
      }
    });

    // Create link groups for rules with multiple fields
    let newLinkState = placementState.linkGroupState;
    fieldsByRuleId.forEach((fieldIds, ruleId) => {
      if (fieldIds.length > 1) {
        const existingGroup = placementState.linkGroupState.groups.get(`rule_${ruleId}`);
        if (!existingGroup) {
          const linkGroup = createLinkGroup(fieldIds, `Rule ${ruleId}`);
          linkGroup.id = `rule_${ruleId}`; // Use deterministic ID based on rule
          newLinkState = addLinkGroup(newLinkState, linkGroup);
        }
      }
    });
    placementState.linkGroupState = newLinkState;

    generatedRuleFields.forEach((field) => {
      const definitionId = String(field.id || '').trim();
      if (!definitionId) return;
      const participantId = String(field.participantId || '').trim();
      const page = parseInt(String(field.page || '1'), 10) || 1;
      const ruleId = String((field as any).ruleId || '').trim();
      definitions.push({
        definitionId,
        fieldType: String(field.type || 'text').trim() || 'text',
        participantId,
        participantName: signerNames.get(participantId) || 'Unassigned',
        page,
        linkGroupId: ruleId ? `rule_${ruleId}` : undefined,
      });
    });

    const seen = new Set();
    const uniqueDefinitions = definitions.filter((definition) => {
      const key = String(definition.definitionId || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by page ascending, then by definitionId for deterministic ordering
    uniqueDefinitions.sort((a, b) => {
      if (a.page !== b.page) {
        return a.page - b.page;
      }
      return a.definitionId.localeCompare(b.definitionId);
    });

    return uniqueDefinitions;
  }

  function updateFieldRuleRowUI(entry) {
    const typeSelect = entry.querySelector('.field-rule-type-select');
    const rangeStart = entry.querySelector('.field-rule-range-start-wrap');
    const rangeEnd = entry.querySelector('.field-rule-range-end-wrap');
    const pageWrap = entry.querySelector('.field-rule-page-wrap');
    const excludeLastWrap = entry.querySelector('.field-rule-exclude-last-wrap');
    const excludePagesWrap = entry.querySelector('.field-rule-exclude-pages-wrap');
    const summary = entry.querySelector('.field-rule-summary');
    const fromPageInput = entry.querySelector('.field-rule-from-page-input');
    const toPageInput = entry.querySelector('.field-rule-to-page-input');
    const pageInput = entry.querySelector('.field-rule-page-input');
    const excludeLastInput = entry.querySelector('.field-rule-exclude-last-input');
    const excludePagesInput = entry.querySelector('.field-rule-exclude-pages-input');
    const terminalPage = getCurrentDocumentPageCount();
    const normalizedRule = normalizeFieldRuleState({
      type: typeSelect?.value || '',
      fromPage: fromPageInput?.value || '',
      toPage: toPageInput?.value || '',
      page: pageInput?.value || '',
      excludeLastPage: Boolean(excludeLastInput?.checked),
      excludePages: parseExcludePagesCSV(excludePagesInput?.value || ''),
      required: true,
    }, terminalPage);
    const fromPage = normalizedRule.fromPage > 0 ? normalizedRule.fromPage : 1;
    const toPage = normalizedRule.toPage > 0 ? normalizedRule.toPage : terminalPage;
    const page = normalizedRule.page > 0
      ? normalizedRule.page
      : (normalizedRule.toPage > 0 ? normalizedRule.toPage : terminalPage);
    const excludeLast = normalizedRule.excludeLastPage;
    const excludePages = normalizedRule.excludePages.join(',');

    const isInitials = typeSelect?.value === 'initials_each_page';
    rangeStart.classList.toggle('hidden', !isInitials);
    rangeEnd.classList.toggle('hidden', !isInitials);
    excludeLastWrap.classList.toggle('hidden', !isInitials);
    excludePagesWrap.classList.toggle('hidden', !isInitials);
    pageWrap.classList.toggle('hidden', isInitials);

    if (fromPageInput) fromPageInput.value = String(fromPage);
    if (toPageInput) toPageInput.value = String(toPage);
    if (pageInput) pageInput.value = String(page);
    if (excludePagesInput) excludePagesInput.value = excludePages;
    if (excludeLastInput) excludeLastInput.checked = excludeLast;

    if (isInitials) {
      // Compute effective pages to show explicit derived range preview
      const effectiveResult = computeEffectiveRulePages(
        fromPage,
        toPage,
        terminalPage,
        excludeLast,
        normalizedRule.excludePages,
      );
      const effectiveRangeText = formatEffectivePageRange(effectiveResult);
      if (effectiveResult.isEmpty) {
        summary.textContent = `Warning: No initials fields will be generated ${effectiveRangeText}.`;
      } else {
        summary.textContent = `Generates initials fields on ${effectiveRangeText}.`;
      }
    } else {
      summary.textContent = `Generates one signature field on page ${page}.`;
    }
  }

  function addFieldRule(data = {}) {
    if (!fieldRuleTemplate || !fieldRulesContainer) return;
    const clone = fieldRuleTemplate.content.cloneNode(true);
    const entry = clone.querySelector('.field-rule-entry');
    const ruleID = data.id || generateFieldRuleId();
    const formIndex = fieldRuleFormIndex++;
    const terminalPage = getCurrentDocumentPageCount();

    entry.setAttribute('data-field-rule-id', ruleID);
    const idInput = entry.querySelector('.field-rule-id-input');
    const typeSelect = entry.querySelector('.field-rule-type-select');
    const participantSelect = entry.querySelector('.field-rule-participant-select');
    const fromPageInput = entry.querySelector('.field-rule-from-page-input');
    const toPageInput = entry.querySelector('.field-rule-to-page-input');
    const pageInput = entry.querySelector('.field-rule-page-input');
    const requiredSelect = entry.querySelector('.field-rule-required-select');
    const excludeLastInput = entry.querySelector('.field-rule-exclude-last-input');
    const excludePagesInput = entry.querySelector('.field-rule-exclude-pages-input');
    const removeBtn = entry.querySelector('.remove-field-rule-btn');

    idInput.name = `field_rules[${formIndex}].id`;
    idInput.value = ruleID;
    typeSelect.name = `field_rules[${formIndex}].type`;
    participantSelect.name = `field_rules[${formIndex}].participant_id`;
    fromPageInput.name = `field_rules[${formIndex}].from_page`;
    toPageInput.name = `field_rules[${formIndex}].to_page`;
    pageInput.name = `field_rules[${formIndex}].page`;
    requiredSelect.name = `field_rules[${formIndex}].required`;
    excludeLastInput.name = `field_rules[${formIndex}].exclude_last_page`;
    excludePagesInput.name = `field_rules[${formIndex}].exclude_pages`;

    const normalizedData = normalizeFieldRuleState(data, terminalPage);
    typeSelect.value = normalizedData.type || 'initials_each_page';
    syncSignerSelectOptions(participantSelect, getSignerParticipants(), normalizedData.participantId);
    fromPageInput.value = String(normalizedData.fromPage > 0 ? normalizedData.fromPage : 1);
    toPageInput.value = String(normalizedData.toPage > 0 ? normalizedData.toPage : terminalPage);
    pageInput.value = String(normalizedData.page > 0 ? normalizedData.page : terminalPage);
    requiredSelect.value = normalizedData.required ? '1' : '0';
    excludeLastInput.checked = normalizedData.excludeLastPage;
    excludePagesInput.value = normalizedData.excludePages.join(',');

    const onRuleInput = () => {
      updateFieldRuleRowUI(entry);
      renderFieldRulePreview();
      debouncedTrackChanges();
    };

    // Clamp page inputs to [1, documentPageCount] range
    const clampRulePageInputs = () => {
      const maxPage = getCurrentDocumentPageCount();
      if (fromPageInput) {
        const val = parseInt(fromPageInput.value, 10);
        if (Number.isFinite(val)) {
          fromPageInput.value = String(clampPageNumber(val, maxPage, 1));
        }
      }
      if (toPageInput) {
        const val = parseInt(toPageInput.value, 10);
        if (Number.isFinite(val)) {
          toPageInput.value = String(clampPageNumber(val, maxPage, 1));
        }
      }
      if (pageInput) {
        const val = parseInt(pageInput.value, 10);
        if (Number.isFinite(val)) {
          pageInput.value = String(clampPageNumber(val, maxPage, 1));
        }
      }
    };

    // Wrap onRuleInput to clamp before updating UI
    const onRulePageInput = () => {
      clampRulePageInputs();
      onRuleInput();
    };

    typeSelect.addEventListener('change', onRuleInput);
    participantSelect.addEventListener('change', onRuleInput);
    fromPageInput.addEventListener('input', onRulePageInput);
    fromPageInput.addEventListener('change', onRulePageInput);
    toPageInput.addEventListener('input', onRulePageInput);
    toPageInput.addEventListener('change', onRulePageInput);
    pageInput.addEventListener('input', onRulePageInput);
    pageInput.addEventListener('change', onRulePageInput);
    requiredSelect.addEventListener('change', onRuleInput);
    // When "Exclude last page" is checked, update toPage to N-1
    excludeLastInput.addEventListener('change', () => {
      const maxPage = getCurrentDocumentPageCount();
      if (excludeLastInput.checked) {
        // Set toPage to maxPage - 1 when excluding last page
        const newToPage = Math.max(1, maxPage - 1);
        toPageInput.value = String(newToPage);
      } else {
        // Restore toPage to maxPage when unchecking
        toPageInput.value = String(maxPage);
      }
      onRuleInput();
    });
    excludePagesInput.addEventListener('input', onRuleInput);
    removeBtn.addEventListener('click', () => {
      entry.remove();
      updateFieldRulesEmptyState();
      renderFieldRulePreview();
      debouncedTrackChanges();
    });

    fieldRulesContainer.appendChild(clone);
    updateFieldRuleRowUI(fieldRulesContainer.lastElementChild);
    updateFieldRulesEmptyState();
    renderFieldRulePreview();
  }

  function addFieldDefinition(data = {}) {
    const clone = fieldDefinitionTemplate.content.cloneNode(true);
    const entry = clone.querySelector('.field-definition-entry');

    // Use existing ID or generate a new one
    const fieldDefinitionId = data.id || generateFieldDefinitionId();
    entry.setAttribute('data-field-definition-id', fieldDefinitionId);

    const idInput = entry.querySelector('.field-definition-id-input');
    const typeSelect = entry.querySelector('select[name="field_definitions[].type"]');
    const participantSelect = entry.querySelector('select[name="field_definitions[].participant_id"]');
    const pageInput = entry.querySelector('input[name="field_definitions[].page"]');
    const requiredCheckbox = entry.querySelector('input[name="field_definitions[].required"]');
    const dateSignedInfo = entry.querySelector('.field-date-signed-info');

    // Use stable entity IDs in values while preserving index-addressed form arrays.
    const formIndex = fieldInstanceFormIndex++;
    idInput.name = `field_instances[${formIndex}].id`;
    idInput.value = fieldDefinitionId;
    typeSelect.name = `field_instances[${formIndex}].type`;
    participantSelect.name = `field_instances[${formIndex}].participant_id`;
    pageInput.name = `field_instances[${formIndex}].page`;
    requiredCheckbox.name = `field_instances[${formIndex}].required`;

    if (data.type) typeSelect.value = data.type;
    if (data.page) {
      pageInput.value = String(clampPageNumber(data.page, getCurrentDocumentPageCount(), 1));
    }
    if (data.required !== undefined) requiredCheckbox.checked = data.required;

    const preferredParticipantID = String(data.participant_id || data.participantId || '').trim();
    syncSignerSelectOptions(participantSelect, getSignerParticipants(), preferredParticipantID);

    // Show date_signed info when that type is selected
    typeSelect.addEventListener('change', () => {
      if (typeSelect.value === 'date_signed') {
        dateSignedInfo.classList.remove('hidden');
      } else {
        dateSignedInfo.classList.add('hidden');
      }
    });
    // Initialize date_signed info visibility
    if (typeSelect.value === 'date_signed') {
      dateSignedInfo.classList.remove('hidden');
    }

    entry.querySelector('.remove-field-definition-btn').addEventListener('click', () => {
      entry.remove();
      updateFieldDefinitionsEmptyState();
    });

    // Field page input clamping
    const fieldPageInput = entry.querySelector('input[name*=".page"]');

    const clampFieldPageInput = () => {
      if (!fieldPageInput) return;
      fieldPageInput.value = String(clampPageNumber(fieldPageInput.value, getCurrentDocumentPageCount(), 1));
    };
    clampFieldPageInput();
    fieldPageInput?.addEventListener('input', clampFieldPageInput);
    fieldPageInput?.addEventListener('change', clampFieldPageInput);

    fieldDefinitionsContainer.appendChild(clone);
    updateFieldDefinitionsEmptyState();
  }

  function updateFieldDefinitionsEmptyState() {
    const fields = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
    if (fields.length === 0) {
      fieldDefinitionsEmptyState.classList.remove('hidden');
      addFieldBtnContainer?.classList.add('hidden');
    } else {
      fieldDefinitionsEmptyState.classList.add('hidden');
      addFieldBtnContainer?.classList.remove('hidden');
    }
  }

  // Watch for participant changes to update field assignments
  const participantObserver = new MutationObserver(() => {
    updateFieldParticipantOptions();
  });
  participantObserver.observe(participantsContainer, { childList: true, subtree: true });

  // Also update when role changes
  participantsContainer.addEventListener('change', (e) => {
    if (e.target.matches('select[name*=".role"]') || e.target.matches('input[name*=".name"]') || e.target.matches('input[name*=".email"]')) {
      updateFieldParticipantOptions();
    }
  });
  participantsContainer.addEventListener('input', (e) => {
    if (e.target.matches('input[name*=".name"]') || e.target.matches('input[name*=".email"]')) {
      updateFieldParticipantOptions();
    }
  });

  addFieldBtn.addEventListener('click', () => addFieldDefinition());
  addFieldDefinitionEmptyBtn.addEventListener('click', () => addFieldDefinition());
  addFieldRuleBtn?.addEventListener('click', () => addFieldRule({ to_page: getCurrentDocumentPageCount() }));

  window._initialFieldPlacementsData = [];

  // Initialize with existing field instances.
  initialFieldInstances.forEach((fieldDef) => {
    const id = String(fieldDef.id || '').trim();
    if (!id) return;
    const type = String(fieldDef.type || 'signature').trim() || 'signature';
    const participantID = String(fieldDef.participant_id || fieldDef.participantId || '').trim();
    const page = Number(fieldDef.page || 1) || 1;
    const required = Boolean(fieldDef.required);
    addFieldDefinition({
      id,
      type,
      participant_id: participantID,
      page,
      required,
    });
    window._initialFieldPlacementsData.push(normalizePlacementInstance({
      id,
      definitionId: id,
      type,
      participantId: participantID,
      participantName: String(fieldDef.participant_name || fieldDef.participantName || '').trim(),
      page,
      x: Number(fieldDef.x || fieldDef.pos_x || 0) || 0,
      y: Number(fieldDef.y || fieldDef.pos_y || 0) || 0,
      width: Number(fieldDef.width || 150) || 150,
      height: Number(fieldDef.height || 32) || 32,
      placementSource: String(fieldDef.placement_source || fieldDef.placementSource || PLACEMENT_SOURCE.MANUAL).trim() || PLACEMENT_SOURCE.MANUAL,
    }, window._initialFieldPlacementsData.length));
  });
  updateFieldDefinitionsEmptyState();
  updateFieldParticipantOptions();
  updateFieldRulesEmptyState();
  renderFieldRulePreview();

  // Form submission
  const form = document.getElementById('agreement-form');
  const submitBtn = document.getElementById('submit-btn');
  const formAnnouncements = document.getElementById('form-announcements');

  function mapUserFacingError(message, code = '', status = 0) {
    const normalizedCode = String(code || '').trim().toUpperCase();
    const normalizedMessage = String(message || '').trim().toLowerCase();
    if (normalizedCode === 'SCOPE_DENIED' || normalizedMessage.includes('scope denied')) {
      return "You don't have access to this organization's resources.";
    }
    if (
      normalizedCode === 'TRANSPORT_SECURITY' ||
      normalizedCode === 'TRANSPORT_SECURITY_REQUIRED' ||
      normalizedMessage.includes('tls transport required') ||
      Number(status) === 426
    ) {
      return 'This action requires a secure connection. Please access the app using HTTPS.';
    }
    if (
      normalizedCode === 'PDF_UNSUPPORTED' ||
      normalizedMessage === 'pdf compatibility unsupported'
    ) {
      return 'This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF.';
    }
    if (String(message || '').trim() !== '') {
      return String(message).trim();
    }
    return 'Something went wrong. Please try again.';
  }

  async function parseAPIError(response, fallbackMessage) {
    const status = Number(response?.status || 0);
    let code = '';
    let message = '';
    try {
      const payload = await response.json();
      code = String(payload?.error?.code || payload?.code || '').trim();
      message = String(payload?.error?.message || payload?.message || '').trim();
    } catch (_) {
      message = '';
    }
    if (message === '') {
      message = fallbackMessage || `Request failed (${status || 'unknown'})`;
    }
    return {
      status,
      code,
      message: mapUserFacingError(message, code, status),
    };
  }

  function announceError(message, code = '', status = 0) {
    const userMessage = mapUserFacingError(message, code, status);
    if (formAnnouncements) {
      formAnnouncements.textContent = userMessage;
    }
    if (window.toastManager) {
      window.toastManager.error(userMessage);
    } else {
      alert(userMessage);
    }
  }

  function buildCanonicalAgreementPayload() {
    const participants = [];
    participantsContainer.querySelectorAll('.participant-entry').forEach((entry) => {
      const participantId = String(entry.getAttribute('data-participant-id') || '').trim();
      const name = String(entry.querySelector('input[name*=".name"]')?.value || '').trim();
      const email = String(entry.querySelector('input[name*=".email"]')?.value || '').trim();
      const role = String(entry.querySelector('select[name*=".role"]')?.value || 'signer').trim();
      const notify = entry.querySelector('.notify-input')?.checked !== false;
      const signingStageRaw = String(entry.querySelector('.signing-stage-input')?.value || '').trim();
      const signingStage = Number(signingStageRaw || '1') || 1;
      participants.push({
        id: participantId,
        name,
        email,
        role,
        notify,
        signing_stage: role === 'signer' ? signingStage : 0,
      });
    });

    const fieldInstances = [];
    fieldDefinitionsContainer.querySelectorAll('.field-definition-entry').forEach((entry) => {
      const id = String(entry.getAttribute('data-field-definition-id') || '').trim();
      const type = String(entry.querySelector('.field-type-select')?.value || 'signature').trim();
      const participantID = String(entry.querySelector('.field-participant-select')?.value || '').trim();
      const page = Number(entry.querySelector('input[name*=".page"]')?.value || '1') || 1;
      const required = Boolean(entry.querySelector('input[name*=".required"]')?.checked);
      if (!id) return;
      fieldInstances.push({
        id,
        type,
        participant_id: participantID,
        page,
        required,
      });
    });

    const fieldPlacements = [];
    if (placementState && Array.isArray(placementState.fieldInstances)) {
      placementState.fieldInstances.forEach((instance, index) => {
        fieldPlacements.push(toPlacementFormPayload(instance, index));
      });
    }
    const serializedPlacements = JSON.stringify(fieldPlacements);
    if (fieldPlacementsJSONInput) {
      fieldPlacementsJSONInput.value = serializedPlacements;
    }

    return {
      document_id: String(documentIdInput?.value || '').trim(),
      title: String(document.getElementById('title')?.value || '').trim(),
      message: String(document.getElementById('message')?.value || '').trim(),
      participants,
      field_instances: fieldInstances,
      field_placements: fieldPlacements,
      field_placements_json: serializedPlacements,
      field_rules: collectFieldRulesForForm(),
      field_rules_json: String(fieldRulesJSONInput?.value || '[]'),
      send_for_signature: currentStep === TOTAL_WIZARD_STEPS ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(documentPageCountInput?.value || '0') || 0,
    };
  }

  function findSignersMissingRequiredSignatureField() {
    const signers = getSignerParticipants();
    const signerSignatureFields = new Map(); // participantId -> hasSignatureField

    signers.forEach((signer) => {
      signerSignatureFields.set(signer.id, false);
    });

    const fieldDefinitionEntries = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
    fieldDefinitionEntries.forEach((field) => {
      const typeSelect = field.querySelector('.field-type-select');
      const participantSelect = field.querySelector('.field-participant-select');
      const requiredCheckbox = field.querySelector('input[name*=".required"]');
      if (typeSelect?.value === 'signature' && participantSelect?.value && requiredCheckbox?.checked) {
        signerSignatureFields.set(participantSelect.value, true);
      }
    });

    const expandedRuleFields = expandRulesForPreview(collectFieldRulesForState(), getCurrentDocumentPageCount());
    expandedRuleFields.forEach((field) => {
      if (field.type === 'signature' && field.participantId && field.required) {
        signerSignatureFields.set(field.participantId, true);
      }
    });

    return signers.filter((signer) => !signerSignatureFields.get(signer.id));
  }

  function missingSignatureFieldMessage(missingSigners) {
    if (!Array.isArray(missingSigners) || missingSigners.length === 0) {
      return 'Each signer requires at least one required signature field.';
    }
    const names = missingSigners
      .map((signer) => signer?.name?.trim())
      .filter((name) => Boolean(name));
    if (names.length === 0) {
      return 'Each signer requires at least one required signature field.';
    }
    return `Each signer requires at least one required signature field. Missing: ${names.join(', ')}`;
  }

  form.addEventListener('submit', function(e) {
    renderFieldRulePreview();

    // Validate document selected
    if (!documentIdInput.value) {
      e.preventDefault();
      announceError('Please select a document');
      documentSearch.focus();
      return;
    }
    if (!ensureSelectedDocumentCompatibility()) {
      e.preventDefault();
      return;
    }

    // Validate at least one participant
    const participantEntries = participantsContainer.querySelectorAll('.participant-entry');
    if (participantEntries.length === 0) {
      e.preventDefault();
      announceError('Please add at least one participant');
      addParticipantBtn.focus();
      return;
    }

    // Validate at least one signer
    let hasSigners = false;
    participantEntries.forEach(entry => {
      const roleSelect = entry.querySelector('select[name*=".role"]');
      if (roleSelect.value === 'signer') {
        hasSigners = true;
      }
    });

    if (!hasSigners) {
      e.preventDefault();
      announceError('At least one signer is required');
      const firstRoleSelect = participantEntries[0]?.querySelector('select[name*=".role"]');
      if (firstRoleSelect) firstRoleSelect.focus();
      return;
    }

    const fieldDefinitionEntries = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
    const missingSigners = findSignersMissingRequiredSignatureField();
    if (missingSigners.length > 0) {
      e.preventDefault();
      announceError(missingSignatureFieldMessage(missingSigners));
      goToStep(WIZARD_STEP.FIELDS);
      addFieldBtn.focus();
      return;
    }

    // Validate that all field participant assignments are valid
    let invalidFieldAssignment = false;
    fieldDefinitionEntries.forEach(field => {
      const participantSelect = field.querySelector('.field-participant-select');
      if (!participantSelect.value) {
        invalidFieldAssignment = true;
      }
    });

    if (invalidFieldAssignment) {
      e.preventDefault();
      announceError('Please assign all fields to a signer');
      const firstUnassigned = fieldDefinitionsContainer.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
      if (firstUnassigned) firstUnassigned.focus();
      return;
    }

    const rules = collectFieldRulesForState();
    const invalidRuleAssignment = rules.some((rule) => !rule.participantId);
    if (invalidRuleAssignment) {
      e.preventDefault();
      announceError('Please assign all automation rules to a signer');
      const firstUnassignedRule = Array.from(fieldRulesContainer?.querySelectorAll('.field-rule-participant-select') || [])
        .find((select) => !select.value);
      firstUnassignedRule?.focus();
      return;
    }

    const hasSaveAsDraftIntent = Boolean(form.querySelector('input[name="save_as_draft"]'));
    const shouldSendForSignature = currentStep === TOTAL_WIZARD_STEPS && !hasSaveAsDraftIntent;

    if (shouldSendForSignature) {
      let sendIntentInput = form.querySelector('input[name="send_for_signature"]');
      if (!sendIntentInput) {
        sendIntentInput = document.createElement('input');
        sendIntentInput.type = 'hidden';
        sendIntentInput.name = 'send_for_signature';
        form.appendChild(sendIntentInput);
      }
      sendIntentInput.value = '1';
    } else {
      form.querySelector('input[name="send_for_signature"]')?.remove();
    }

    if (submitMode === 'json') {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${shouldSendForSignature ? 'Sending...' : 'Saving...'}
      `;
      void (async () => {
        try {
          // Ensure canonical payload is refreshed from current placement state.
          buildCanonicalAgreementPayload();

          // Persist the latest wizard state before send/save transition.
          stateManager.updateState(stateManager.collectFormState());
          await syncOrchestrator.forceSync();

          const syncedState = stateManager.getState();
          if (syncedState?.syncPending) {
            throw new Error('Unable to sync latest draft changes');
          }
          const draftID = String(syncedState?.serverDraftId || '').trim();
          if (!draftID) {
            throw new Error('Draft session not available. Please try again.');
          }

          const indexRoute = String(config.routes?.index || '').trim();
          if (!shouldSendForSignature) {
            if (indexRoute) {
              window.location.href = indexRoute;
              return;
            }
            window.location.reload();
            return;
          }

          const response = await fetch(
            draftEndpointWithUserID(`${draftsEndpoint}/${encodeURIComponent(draftID)}/send`),
            {
              method: 'POST',
              credentials: 'same-origin',
              headers: draftRequestHeaders(),
              body: JSON.stringify({
                expected_revision: Number(syncedState?.serverRevision || 0),
                created_by_user_id: currentUserID,
              }),
            }
          );
          if (!response.ok) {
            const apiError = await parseAPIError(response, 'Failed to send agreement');
            throw apiError;
          }
          const payload = await response.json();
          const agreementID = String(payload?.agreement_id || payload?.id || payload?.data?.id || '').trim();

          stateManager.clear();
          syncOrchestrator.broadcastStateUpdate();

          if (agreementID && indexRoute) {
            window.location.href = `${indexRoute}/${encodeURIComponent(agreementID)}`;
            return;
          }
          if (indexRoute) {
            window.location.href = indexRoute;
            return;
          }
          window.location.reload();
        } catch (error) {
          const message = String(error?.message || 'Failed to process agreement').trim();
          const code = String(error?.code || '').trim();
          const status = Number(error?.status || 0);
          announceError(message, code, status);
          submitBtn.disabled = false;
          submitBtn.innerHTML = `
            <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            Send for Signature
          `;
        }
      })();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${shouldSendForSignature ? 'Sending...' : 'Saving...'}
    `;
  });

  // =============================================================================
  // Wizard Navigation
  // =============================================================================
  let currentStep = 1;

  const wizardStepBtns = document.querySelectorAll('.wizard-step-btn');
  const wizardSteps = document.querySelectorAll('.wizard-step');
  const wizardConnectors = document.querySelectorAll('.wizard-connector');
  const wizardPrevBtn = document.getElementById('wizard-prev-btn');
  const wizardNextBtn = document.getElementById('wizard-next-btn');
  const wizardSaveBtn = document.getElementById('wizard-save-btn');

  function updateWizardUI() {
    // Update step buttons and connectors
    wizardStepBtns.forEach((btn, index) => {
      const stepNum = index + 1;
      const stepNumber = btn.querySelector('.wizard-step-number');

      if (stepNum < currentStep) {
        // Completed step
        btn.classList.remove('text-gray-500', 'text-blue-600');
        btn.classList.add('text-green-600');
        stepNumber.classList.remove('bg-gray-300', 'text-gray-600', 'bg-blue-600', 'text-white');
        stepNumber.classList.add('bg-green-600', 'text-white');
        btn.removeAttribute('aria-current');
      } else if (stepNum === currentStep) {
        // Current step
        btn.classList.remove('text-gray-500', 'text-green-600');
        btn.classList.add('text-blue-600');
        stepNumber.classList.remove('bg-gray-300', 'text-gray-600', 'bg-green-600');
        stepNumber.classList.add('bg-blue-600', 'text-white');
        btn.setAttribute('aria-current', 'step');
      } else {
        // Future step
        btn.classList.remove('text-blue-600', 'text-green-600');
        btn.classList.add('text-gray-500');
        stepNumber.classList.remove('bg-blue-600', 'text-white', 'bg-green-600');
        stepNumber.classList.add('bg-gray-300', 'text-gray-600');
        btn.removeAttribute('aria-current');
      }
    });

    // Update connectors
    wizardConnectors.forEach((connector, index) => {
      if (index < currentStep - 1) {
        connector.classList.remove('bg-gray-300');
        connector.classList.add('bg-green-600');
      } else {
        connector.classList.remove('bg-green-600');
        connector.classList.add('bg-gray-300');
      }
    });

    // Show/hide step content
    wizardSteps.forEach(step => {
      const stepNum = parseInt(step.dataset.step, 10);
      if (stepNum === currentStep) {
        step.classList.remove('hidden');
      } else {
        step.classList.add('hidden');
      }
    });

    // Update navigation buttons
    wizardPrevBtn.classList.toggle('hidden', currentStep === 1);
    wizardNextBtn.classList.toggle('hidden', currentStep === TOTAL_WIZARD_STEPS);
    wizardSaveBtn.classList.toggle('hidden', currentStep !== TOTAL_WIZARD_STEPS);
    submitBtn.classList.toggle('hidden', currentStep !== TOTAL_WIZARD_STEPS);

    // Update next button text based on step
    if (currentStep < TOTAL_WIZARD_STEPS) {
      const nextStepName = WIZARD_NEXT_STEP_LABELS[currentStep] || 'Next';
      wizardNextBtn.innerHTML = `
        ${nextStepName}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `;
    }

    // Run step-specific initialization
    if (currentStep === WIZARD_STEP.PLACEMENT) {
      initPlacementEditor();
    } else if (currentStep === WIZARD_STEP.REVIEW) {
      initSendReadinessCheck();
    }

    // Update document preview card visibility (Phase 2)
    previewCard.updateVisibility(currentStep);
  }

  function validateStep(stepNum) {
    switch (stepNum) {
      case 1:
        if (!documentIdInput.value) {
          announceError('Please select a document');
          return false;
        }
        if (!ensureSelectedDocumentCompatibility()) {
          return false;
        }
        return true;

      case 2:
        const titleInput = document.getElementById('title');
        if (!titleInput.value.trim()) {
          announceError('Please enter an agreement title');
          titleInput.focus();
          return false;
        }
        return true;

      case 3:
        const participantEntries = participantsContainer.querySelectorAll('.participant-entry');
        if (participantEntries.length === 0) {
          announceError('Please add at least one participant');
          return false;
        }
        let hasSigners = false;
        participantEntries.forEach(entry => {
          const roleSelect = entry.querySelector('select[name*=".role"]');
          if (roleSelect.value === 'signer') hasSigners = true;
        });
        if (!hasSigners) {
          announceError('At least one signer is required');
          return false;
        }
        return true;

      case 4:
        // Field definitions are optional but if present, must be assigned
        const fieldEntries = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
        for (const field of fieldEntries) {
          const participantSelect = field.querySelector('.field-participant-select');
          if (!participantSelect.value) {
            announceError('Please assign all fields to a signer');
            participantSelect.focus();
            return false;
          }
        }
        const rules = collectFieldRulesForState();
        const unassignedRule = rules.find((rule) => !rule.participantId);
        if (unassignedRule) {
          announceError('Please assign all automation rules to a signer');
          fieldRulesContainer?.querySelector('.field-rule-participant-select')?.focus();
          return false;
        }
        const missingSigners = findSignersMissingRequiredSignatureField();
        if (missingSigners.length > 0) {
          announceError(missingSignatureFieldMessage(missingSigners));
          addFieldBtn.focus();
          return false;
        }
        return true;

      case 5:
        // Placement validation - warn but don't block
        return true;

      default:
        return true;
    }
  }

  function goToStep(stepNum) {
    if (stepNum < WIZARD_STEP.DOCUMENT || stepNum > TOTAL_WIZARD_STEPS) return;

    // Validate current step before moving forward
    if (stepNum > currentStep) {
      for (let i = currentStep; i < stepNum; i++) {
        if (!validateStep(i)) return;
      }
    }

    currentStep = stepNum;
    updateWizardUI();

    // Persist step change
    stateManager.updateStep(stepNum);
    trackWizardStateChanges();
    syncOrchestrator.forceSync(); // Force sync on step change

    // Scroll to top of form
    document.querySelector('.wizard-step:not(.hidden)')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Wizard step button clicks
  wizardStepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetStep = parseInt(btn.dataset.step, 10);
      goToStep(targetStep);
    });
  });

  // Previous/Next button handlers
  wizardPrevBtn.addEventListener('click', () => goToStep(currentStep - 1));
  wizardNextBtn.addEventListener('click', () => goToStep(currentStep + 1));

  // Save Draft button
  wizardSaveBtn.addEventListener('click', () => {
    // Submit form as draft
    const draftInput = document.createElement('input');
    draftInput.type = 'hidden';
    draftInput.name = 'save_as_draft';
    draftInput.value = '1';
    form.appendChild(draftInput);
    form.submit();
  });

  // =============================================================================
  // Step 5: Placement Editor (PDF Viewer + Drag/Resize Field Overlays)
  // =============================================================================
  const initialPlacementInstances = Array.isArray(window._initialFieldPlacementsData)
    ? window._initialFieldPlacementsData.map((instance, index) => normalizePlacementInstance(instance, index))
    : [];

  let placementState = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1.0,
    fieldInstances: initialPlacementInstances, // { id, definitionId, type, participantId, page, x, y, width, height }
    selectedFieldId: null,
    isDragging: false,
    isResizing: false,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: false,
    loadRequestVersion: 0,
    // Phase 3: Linked field placement state
    linkGroupState: createLinkGroupState(),
  };

  const TYPE_COLORS = {
    signature: { bg: 'bg-blue-500', border: 'border-blue-500', fill: 'rgba(59, 130, 246, 0.2)' },
    name: { bg: 'bg-green-500', border: 'border-green-500', fill: 'rgba(34, 197, 94, 0.2)' },
    date_signed: { bg: 'bg-purple-500', border: 'border-purple-500', fill: 'rgba(168, 85, 247, 0.2)' },
    text: { bg: 'bg-gray-500', border: 'border-gray-500', fill: 'rgba(107, 114, 128, 0.2)' },
    checkbox: { bg: 'bg-indigo-500', border: 'border-indigo-500', fill: 'rgba(99, 102, 241, 0.2)' },
    initials: { bg: 'bg-orange-500', border: 'border-orange-500', fill: 'rgba(249, 115, 22, 0.2)' }
  };

  const DEFAULT_FIELD_SIZES = {
    signature: { width: 200, height: 50 },
    name: { width: 180, height: 30 },
    date_signed: { width: 120, height: 30 },
    text: { width: 150, height: 30 },
    checkbox: { width: 24, height: 24 },
    initials: { width: 80, height: 40 }
  };

  async function initPlacementEditor() {
    const placementLoading = document.getElementById('placement-loading');
    const placementNoDocument = document.getElementById('placement-no-document');
    const placementFieldsList = document.getElementById('placement-fields-list');
    const placementTotalFields = document.getElementById('placement-total-fields');
    const placementPlacedCount = document.getElementById('placement-placed-count');
    const placementUnplacedCount = document.getElementById('placement-unplaced-count');
    const placementViewer = document.getElementById('placement-viewer');
    const placementCanvas = document.getElementById('placement-pdf-canvas');
    const placementOverlays = document.getElementById('placement-overlays-container');
    const placementCanvasContainer = document.getElementById('placement-canvas-container');
    const currentPageSpan = document.getElementById('placement-current-page');
    const totalPagesSpan = document.getElementById('placement-total-pages');
    const zoomLevelSpan = document.getElementById('placement-zoom-level');

    if (!documentIdInput.value) {
      placementLoading.classList.add('hidden');
      placementNoDocument.classList.remove('hidden');
      return;
    }

    // Show loading state
    placementLoading.classList.remove('hidden');
    placementNoDocument.classList.add('hidden');

    // Load manual + generated field definitions into the placement panel.
    const placementDefinitions = collectPlacementFieldDefinitions();
    const validDefinitionIDs = new Set(
      placementDefinitions.map((definition) => String(definition.definitionId || '').trim()).filter((id) => id)
    );
    placementState.fieldInstances = placementState.fieldInstances.filter((instance) =>
      validDefinitionIDs.has(String(instance.definitionId || '').trim())
    );

    placementFieldsList.innerHTML = '';

    // Phase 3.2: Track link groups to add toggle icons
    const hasLinkGroups = placementState.linkGroupState.groups.size > 0;
    const linkBatchActions = document.getElementById('link-batch-actions');
    if (linkBatchActions) {
      linkBatchActions.classList.toggle('hidden', !hasLinkGroups);
    }

    // Build array of definitions with their link info for rendering
    const defsWithLinks = placementDefinitions.map((definition) => {
      const definitionId = String(definition.definitionId || '').trim();
      const linkGroupId = placementState.linkGroupState.definitionToGroup.get(definitionId) || '';
      const isUnlinked = placementState.linkGroupState.unlinkedDefinitions.has(definitionId);
      return { ...definition, definitionId, linkGroupId, isUnlinked };
    });

    defsWithLinks.forEach((definition, index) => {
      const definitionId = definition.definitionId;
      const fieldType = String(definition.fieldType || 'text').trim() || 'text';
      const participantId = String(definition.participantId || '').trim();
      const participantName = String(definition.participantName || 'Unassigned').trim() || 'Unassigned';
      const page = parseInt(String(definition.page || '1'), 10) || 1;
      const linkGroupId = definition.linkGroupId;
      const isUnlinked = definition.isUnlinked;
      if (!definitionId) return;

      placementState.fieldInstances.forEach(instance => {
        if (instance.definitionId === definitionId) {
          instance.type = fieldType;
          instance.participantId = participantId;
          instance.participantName = participantName;
        }
      });

      const colors = TYPE_COLORS[fieldType] || TYPE_COLORS.text;
      const isPlaced = placementState.fieldInstances.some(f => f.definitionId === definitionId);

      const fieldItem = document.createElement('div');
      fieldItem.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${isPlaced ? 'opacity-50' : ''}`;
      fieldItem.draggable = !isPlaced;
      fieldItem.dataset.definitionId = definitionId;
      fieldItem.dataset.fieldType = fieldType;
      fieldItem.dataset.participantId = participantId;
      fieldItem.dataset.participantName = participantName;
      fieldItem.dataset.page = String(page);
      if (linkGroupId) {
        fieldItem.dataset.linkGroupId = linkGroupId;
      }
      const colorDot = document.createElement('span');
      colorDot.className = `w-3 h-3 rounded ${colors.bg}`;

      const details = document.createElement('div');
      details.className = 'flex-1 text-xs';

      const typeLabel = document.createElement('div');
      typeLabel.className = 'font-medium capitalize';
      typeLabel.textContent = fieldType.replace(/_/g, ' ');

      const participantLabel = document.createElement('div');
      participantLabel.className = 'text-gray-500';
      participantLabel.textContent = participantName;

      const status = document.createElement('span');
      status.className = `placement-status text-xs ${isPlaced ? 'text-green-600' : 'text-amber-600'}`;
      status.textContent = isPlaced ? 'Placed' : 'Not placed';

      details.appendChild(typeLabel);
      details.appendChild(participantLabel);
      fieldItem.appendChild(colorDot);
      fieldItem.appendChild(details);
      fieldItem.appendChild(status);

      // Drag start handler
      fieldItem.addEventListener('dragstart', (e) => {
        if (isPlaced) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('application/json', JSON.stringify({
          definitionId,
          fieldType,
          participantId,
          participantName
        }));
        e.dataTransfer.effectAllowed = 'copy';
        fieldItem.classList.add('opacity-50');
      });

      fieldItem.addEventListener('dragend', () => {
        fieldItem.classList.remove('opacity-50');
      });

      placementFieldsList.appendChild(fieldItem);

      // Phase 3.2: Add link toggle between adjacent linked fields
      const nextDef = defsWithLinks[index + 1];
      if (linkGroupId && nextDef && nextDef.linkGroupId === linkGroupId) {
        const linkToggle = createLinkToggle(definitionId, !isUnlinked);
        placementFieldsList.appendChild(linkToggle);
      }
    });

    // Phase 3.2: Setup batch link/unlink button handlers
    setupLinkBatchActions();

    const loadRequestVersion = ++placementState.loadRequestVersion;
    const selectedDocumentID = String(documentIdInput.value || '').trim();
    const encodedDocumentID = encodeURIComponent(selectedDocumentID);
    const pdfUrl = `${apiBase}/panels/esign_documents/${encodedDocumentID}/source/pdf`;

    // Try to load PDF
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument !== 'function') {
        throw new Error('PDF preview library is unavailable');
      }

      // Load PDF document from canonical panel subresource route.
      const loadingTask = window.pdfjsLib.getDocument({
        url: pdfUrl,
        withCredentials: true,
        disableWorker: true,
      });
      const pdfDoc = await loadingTask.promise;
      if (loadRequestVersion !== placementState.loadRequestVersion) {
        return;
      }
      placementState.pdfDoc = pdfDoc;
      placementState.totalPages = placementState.pdfDoc.numPages;
      placementState.currentPage = 1;

      // Update page count
      totalPagesSpan.textContent = placementState.totalPages;

      // Render first page
      await renderPage(placementState.currentPage);

      // Hide loading
      placementLoading.classList.add('hidden');

      if (!placementState.uiHandlersBound) {
        // Bind these handlers once to avoid duplicate listeners when step 5 is revisited.
        setupDropZone(placementViewer, placementOverlays);
        setupPageNavigation();
        setupZoomControls();
        placementState.uiHandlersBound = true;
      }

      // Render existing field instances
      renderFieldOverlays();

    } catch (error) {
      if (loadRequestVersion !== placementState.loadRequestVersion) {
        return;
      }
      console.error('Failed to load PDF:', error);
      placementLoading.classList.add('hidden');
      placementNoDocument.classList.remove('hidden');
      placementNoDocument.textContent = `Failed to load PDF: ${mapUserFacingError(error?.message || 'Failed to load PDF')}`;
    }

    updatePlacementStats();
    updateFieldInstancesFormData();
  }

  /**
   * Phase 3.2: Create a link toggle icon element between linked fields
   */
  function createLinkToggle(definitionId: string, isLinked: boolean): HTMLElement {
    const toggle = document.createElement('div');
    toggle.className = 'link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors';
    toggle.dataset.definitionId = definitionId;
    toggle.dataset.isLinked = String(isLinked);
    toggle.title = isLinked ? 'Click to unlink this field' : 'Click to re-link this field';
    toggle.setAttribute('role', 'button');
    toggle.setAttribute('aria-label', isLinked ? 'Unlink field from group' : 'Re-link field to group');
    toggle.setAttribute('tabindex', '0');

    // Chain icon (linked) or broken chain icon (unlinked)
    if (isLinked) {
      toggle.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>`;
    } else {
      toggle.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`;
    }

    // Click handler
    toggle.addEventListener('click', () => toggleFieldLink(definitionId, isLinked));
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFieldLink(definitionId, isLinked);
      }
    });

    return toggle;
  }

  /**
   * Phase 3.2: Toggle link state for a field
   */
  function toggleFieldLink(definitionId: string, currentlyLinked: boolean): void {
    if (currentlyLinked) {
      placementState.linkGroupState = unlinkField(placementState.linkGroupState, definitionId);
      if (window.toastManager) {
        window.toastManager.info('Field unlinked');
      }
    } else {
      placementState.linkGroupState = relinkField(placementState.linkGroupState, definitionId);
      if (window.toastManager) {
        window.toastManager.info('Field re-linked');
      }
    }

    // Re-render sidebar to update toggle states
    refreshPlacementSidebar();
  }

  /**
   * Phase 3.2: Setup batch link/unlink button handlers
   */
  function setupLinkBatchActions(): void {
    const linkAllBtn = document.getElementById('link-all-btn');
    const unlinkAllBtn = document.getElementById('unlink-all-btn');

    if (linkAllBtn && !linkAllBtn.dataset.bound) {
      linkAllBtn.dataset.bound = 'true';
      linkAllBtn.addEventListener('click', () => {
        // Re-link all unlinked definitions
        const unlinkedCount = placementState.linkGroupState.unlinkedDefinitions.size;
        if (unlinkedCount === 0) return;

        for (const defId of placementState.linkGroupState.unlinkedDefinitions) {
          placementState.linkGroupState = relinkField(placementState.linkGroupState, defId);
        }

        if (window.toastManager) {
          window.toastManager.success(`Re-linked ${unlinkedCount} field${unlinkedCount > 1 ? 's' : ''}`);
        }
        refreshPlacementSidebar();
      });
    }

    if (unlinkAllBtn && !unlinkAllBtn.dataset.bound) {
      unlinkAllBtn.dataset.bound = 'true';
      unlinkAllBtn.addEventListener('click', () => {
        // Unlink all linked definitions
        let unlinkedCount = 0;
        for (const defId of placementState.linkGroupState.definitionToGroup.keys()) {
          if (!placementState.linkGroupState.unlinkedDefinitions.has(defId)) {
            placementState.linkGroupState = unlinkField(placementState.linkGroupState, defId);
            unlinkedCount++;
          }
        }

        if (unlinkedCount > 0 && window.toastManager) {
          window.toastManager.success(`Unlinked ${unlinkedCount} field${unlinkedCount > 1 ? 's' : ''}`);
        }
        refreshPlacementSidebar();
      });
    }

    // Update button states
    updateLinkBatchButtonStates();
  }

  /**
   * Phase 3.2: Update enabled/disabled states of batch link buttons
   */
  function updateLinkBatchButtonStates(): void {
    const linkAllBtn = document.getElementById('link-all-btn') as HTMLButtonElement;
    const unlinkAllBtn = document.getElementById('unlink-all-btn') as HTMLButtonElement;

    if (linkAllBtn) {
      const hasUnlinked = placementState.linkGroupState.unlinkedDefinitions.size > 0;
      linkAllBtn.disabled = !hasUnlinked;
    }

    if (unlinkAllBtn) {
      let hasLinked = false;
      for (const defId of placementState.linkGroupState.definitionToGroup.keys()) {
        if (!placementState.linkGroupState.unlinkedDefinitions.has(defId)) {
          hasLinked = true;
          break;
        }
      }
      unlinkAllBtn.disabled = !hasLinked;
    }
  }

  /**
   * Phase 3.2: Refresh the placement sidebar to reflect link state changes
   */
  function refreshPlacementSidebar(): void {
    const placementFieldsList = document.getElementById('placement-fields-list');
    if (!placementFieldsList) return;

    // Re-collect and re-render field definitions
    const placementDefinitions = collectPlacementFieldDefinitions();
    placementFieldsList.innerHTML = '';

    const defsWithLinks = placementDefinitions.map((definition) => {
      const definitionId = String(definition.definitionId || '').trim();
      const linkGroupId = placementState.linkGroupState.definitionToGroup.get(definitionId) || '';
      const isUnlinked = placementState.linkGroupState.unlinkedDefinitions.has(definitionId);
      return { ...definition, definitionId, linkGroupId, isUnlinked };
    });

    defsWithLinks.forEach((definition, index) => {
      const definitionId = definition.definitionId;
      const fieldType = String(definition.fieldType || 'text').trim() || 'text';
      const participantId = String(definition.participantId || '').trim();
      const participantName = String(definition.participantName || 'Unassigned').trim() || 'Unassigned';
      const page = parseInt(String(definition.page || '1'), 10) || 1;
      const linkGroupId = definition.linkGroupId;
      const isUnlinked = definition.isUnlinked;
      if (!definitionId) return;

      const colors = TYPE_COLORS[fieldType] || TYPE_COLORS.text;
      const isPlaced = placementState.fieldInstances.some(f => f.definitionId === definitionId);

      const fieldItem = document.createElement('div');
      fieldItem.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${isPlaced ? 'opacity-50' : ''}`;
      fieldItem.draggable = !isPlaced;
      fieldItem.dataset.definitionId = definitionId;
      fieldItem.dataset.fieldType = fieldType;
      fieldItem.dataset.participantId = participantId;
      fieldItem.dataset.participantName = participantName;
      fieldItem.dataset.page = String(page);
      if (linkGroupId) {
        fieldItem.dataset.linkGroupId = linkGroupId;
      }

      const colorDot = document.createElement('span');
      colorDot.className = `w-3 h-3 rounded ${colors.bg}`;

      const details = document.createElement('div');
      details.className = 'flex-1 text-xs';

      const typeLabel = document.createElement('div');
      typeLabel.className = 'font-medium capitalize';
      typeLabel.textContent = fieldType.replace(/_/g, ' ');

      const participantLabel = document.createElement('div');
      participantLabel.className = 'text-gray-500';
      participantLabel.textContent = participantName;

      const status = document.createElement('span');
      status.className = `placement-status text-xs ${isPlaced ? 'text-green-600' : 'text-amber-600'}`;
      status.textContent = isPlaced ? 'Placed' : 'Not placed';

      details.appendChild(typeLabel);
      details.appendChild(participantLabel);
      fieldItem.appendChild(colorDot);
      fieldItem.appendChild(details);
      fieldItem.appendChild(status);

      // Drag start handler
      fieldItem.addEventListener('dragstart', (e) => {
        if (isPlaced) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('application/json', JSON.stringify({
          definitionId,
          fieldType,
          participantId,
          participantName
        }));
        e.dataTransfer.effectAllowed = 'copy';
        fieldItem.classList.add('opacity-50');
      });

      fieldItem.addEventListener('dragend', () => {
        fieldItem.classList.remove('opacity-50');
      });

      placementFieldsList.appendChild(fieldItem);

      // Phase 3.2: Add link toggle between adjacent linked fields
      const nextDef = defsWithLinks[index + 1];
      if (linkGroupId && nextDef && nextDef.linkGroupId === linkGroupId) {
        const linkToggle = createLinkToggle(definitionId, !isUnlinked);
        placementFieldsList.appendChild(linkToggle);
      }
    });

    updateLinkBatchButtonStates();
  }

  async function renderPage(pageNum) {
    if (!placementState.pdfDoc) return;

    const canvas = document.getElementById('placement-pdf-canvas');
    const container = document.getElementById('placement-canvas-container');
    const ctx = canvas.getContext('2d');

    const page = await placementState.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: placementState.scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    // Update page number display
    document.getElementById('placement-current-page').textContent = pageNum;

    // Update field overlays for current page
    renderFieldOverlays();
  }

  function setupDropZone(viewer, overlaysContainer) {
    const canvas = document.getElementById('placement-pdf-canvas');

    viewer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      canvas.classList.add('ring-2', 'ring-blue-500', 'ring-inset');
    });

    viewer.addEventListener('dragleave', (e) => {
      canvas.classList.remove('ring-2', 'ring-blue-500', 'ring-inset');
    });

    viewer.addEventListener('drop', (e) => {
      e.preventDefault();
      canvas.classList.remove('ring-2', 'ring-blue-500', 'ring-inset');

      const data = e.dataTransfer.getData('application/json');
      if (!data) return;

      const fieldData = JSON.parse(data);

      // Calculate drop position relative to canvas
      const canvasRect = canvas.getBoundingClientRect();
      const x = (e.clientX - canvasRect.left) / placementState.scale;
      const y = (e.clientY - canvasRect.top) / placementState.scale;

      // Add field instance
      addFieldInstance(fieldData, x, y);
    });
  }

  function addFieldInstance(fieldData, x, y, options = {}) {
    const sizes = DEFAULT_FIELD_SIZES[fieldData.fieldType] || DEFAULT_FIELD_SIZES.text;
    const instanceId = `fi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const placementSource = options.placementSource || PLACEMENT_SOURCE.MANUAL;
    const linkGroupId = options.linkGroupId || getFieldLinkGroup(placementState.linkGroupState, fieldData.definitionId)?.id;

    const instance = {
      id: instanceId,
      definitionId: fieldData.definitionId,
      type: fieldData.fieldType,
      participantId: fieldData.participantId,
      participantName: fieldData.participantName,
      page: placementState.currentPage,
      x: Math.max(0, x - sizes.width / 2),
      y: Math.max(0, y - sizes.height / 2),
      width: sizes.width,
      height: sizes.height,
      placementSource,
      linkGroupId,
      linkedFromFieldId: options.linkedFromFieldId,
    };

    placementState.fieldInstances.push(instance);

    // Mark field as placed in the panel
    markFieldAsPlaced(fieldData.definitionId);

    // Phase 3: If this is a manual placement and field belongs to a link group,
    // automatically place linked siblings
    if (placementSource === PLACEMENT_SOURCE.MANUAL && linkGroupId) {
      triggerLinkedPlacements(instance);
    }

    renderFieldOverlays();
    updatePlacementStats();
    updateFieldInstancesFormData();
  }

  /**
   * Mark a field as placed in the sidebar panel
   * @param definitionId The field definition ID
   * @param isAutoLinked If true, adds flash animation class for auto-linked fields
   */
  function markFieldAsPlaced(definitionId: string, isAutoLinked: boolean = false): void {
    const fieldItem = document.querySelector(`.placement-field-item[data-definition-id="${definitionId}"]`);
    if (fieldItem) {
      fieldItem.classList.add('opacity-50');
      (fieldItem as HTMLElement).draggable = false;
      const status = fieldItem.querySelector('.placement-status');
      if (status) {
        status.textContent = 'Placed';
        status.classList.remove('text-amber-600');
        status.classList.add('text-green-600');
      }
      // Phase 3.2: Mark for flash animation if auto-linked
      if (isAutoLinked) {
        fieldItem.classList.add('just-linked');
      }
    }
  }

  /**
   * Phase 3: Set template position when first field in a link group is manually placed.
   * Does NOT place siblings immediately - they are placed on page navigation.
   */
  function setLinkedPlacementTemplate(sourcePlacement: any): void {
    const result = setLinkGroupTemplatePosition(
      placementState.linkGroupState,
      sourcePlacement
    );

    if (!result) return;

    // Update link group with template position
    placementState.linkGroupState = addLinkGroup(placementState.linkGroupState, result.updatedGroup);
  }

  /**
   * Phase 3: Auto-place linked fields for the current page.
   * Called when navigating to a new page to place unplaced linked fields at the template position.
   */
  function autoPlaceLinkedFieldsForPage(targetPage: number): void {
    // Build field definitions map including page information
    const fieldDefinitions = new Map<string, { type: string; participantId: string; participantName: string; page: number; linkGroupId?: string }>();
    const placementFieldItems = document.querySelectorAll('.placement-field-item');
    placementFieldItems.forEach((item) => {
      const defId = (item as HTMLElement).dataset.definitionId;
      const pageStr = (item as HTMLElement).dataset.page;
      if (defId) {
        const groupId = placementState.linkGroupState.definitionToGroup.get(defId);
        fieldDefinitions.set(defId, {
          type: (item as HTMLElement).dataset.fieldType || 'text',
          participantId: (item as HTMLElement).dataset.participantId || '',
          participantName: (item as HTMLElement).dataset.participantName || 'Unknown',
          page: pageStr ? parseInt(pageStr, 10) : 1,
          linkGroupId: groupId,
        });
      }
    });

    // Keep placing fields until no more can be placed for this page
    let placedCount = 0;
    const maxPlacements = 10; // Prevent infinite loops
    while (placedCount < maxPlacements) {
      const result = computeLinkedPlacementForPage(
        placementState.linkGroupState,
        targetPage,
        placementState.fieldInstances,
        fieldDefinitions
      );

      if (!result || !result.newPlacement) break;

      // Add the new placement
      placementState.fieldInstances.push(result.newPlacement);
      markFieldAsPlaced(result.newPlacement.definitionId, true); // true = auto-linked
      placedCount++;
    }

    if (placedCount > 0) {
      renderFieldOverlays();
      updatePlacementStats();
      updateFieldInstancesFormData();

      // Phase 3.2: Flash animation + count announcement
      announceLinkedPlacements(placedCount);
    }
  }

  /**
   * Phase 3.2: Announce auto-placed linked fields with toast and flash animation
   */
  function announceLinkedPlacements(count: number): void {
    // Toast notification
    const message = count === 1
      ? 'Auto-placed 1 linked field'
      : `Auto-placed ${count} linked fields`;

    if (window.toastManager) {
      window.toastManager.info(message);
    }

    // Screen reader announcement
    const srAnnouncement = document.createElement('div');
    srAnnouncement.setAttribute('role', 'status');
    srAnnouncement.setAttribute('aria-live', 'polite');
    srAnnouncement.className = 'sr-only';
    srAnnouncement.textContent = message;
    document.body.appendChild(srAnnouncement);
    setTimeout(() => srAnnouncement.remove(), 1000);

    // Flash animation on sidebar items for newly placed fields
    flashLinkedSidebarItems();
  }

  /**
   * Phase 3.2: Flash animation on sidebar items that were just auto-placed
   */
  function flashLinkedSidebarItems(): void {
    const items = document.querySelectorAll('.placement-field-item.just-linked');
    items.forEach(item => {
      item.classList.add('linked-flash');
      setTimeout(() => {
        item.classList.remove('linked-flash', 'just-linked');
      }, 600);
    });
  }

  /**
   * @deprecated Use setLinkedPlacementTemplate instead.
   * Kept for backwards compatibility with existing code paths.
   */
  function triggerLinkedPlacements(sourcePlacement: any): void {
    setLinkedPlacementTemplate(sourcePlacement);
  }

  function renderFieldOverlays() {
    const container = document.getElementById('placement-overlays-container');
    container.innerHTML = '';
    container.style.pointerEvents = 'auto';

    placementState.fieldInstances
      .filter(f => f.page === placementState.currentPage)
      .forEach(instance => {
        const colors = TYPE_COLORS[instance.type] || TYPE_COLORS.text;
        const isSelected = placementState.selectedFieldId === instance.id;
        const isAutoLinked = instance.placementSource === PLACEMENT_SOURCE.AUTO_LINKED;

        const overlay = document.createElement('div');
        // Auto-linked fields get dashed border to distinguish from manual placements
        const borderStyle = isAutoLinked ? 'border-dashed' : 'border-solid';
        overlay.className = `field-overlay absolute cursor-move ${colors.border} border-2 ${borderStyle} rounded`;
        overlay.style.cssText = `
          left: ${instance.x * placementState.scale}px;
          top: ${instance.y * placementState.scale}px;
          width: ${instance.width * placementState.scale}px;
          height: ${instance.height * placementState.scale}px;
          background-color: ${colors.fill};
          ${isSelected ? 'box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);' : ''}
        `;
        overlay.dataset.instanceId = instance.id;

        // Label
        const label = document.createElement('div');
        label.className = 'absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white ' + colors.bg;
        label.textContent = `${instance.type.replace('_', ' ')} - ${instance.participantName}`;
        overlay.appendChild(label);

        // Link badge for auto-linked placements (Phase 3.2)
        if (isAutoLinked) {
          const linkBadge = document.createElement('div');
          linkBadge.className = 'absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center';
          linkBadge.title = 'Auto-linked from template';
          linkBadge.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`;
          overlay.appendChild(linkBadge);
        }

        // Resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize';
        resizeHandle.style.cssText = 'transform: translate(50%, 50%);';
        overlay.appendChild(resizeHandle);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeFieldInstance(instance.id);
        });
        overlay.appendChild(deleteBtn);

        // Drag handlers
        overlay.addEventListener('mousedown', (e) => {
          if (e.target === resizeHandle) {
            startResize(e, instance);
          } else if (e.target !== deleteBtn) {
            startDrag(e, instance, overlay);
          }
        });

        overlay.addEventListener('click', () => {
          placementState.selectedFieldId = instance.id;
          renderFieldOverlays();
        });

        container.appendChild(overlay);
      });
  }

  function startDrag(e, instance, overlay) {
    e.preventDefault();
    placementState.isDragging = true;
    placementState.selectedFieldId = instance.id;

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = instance.x * placementState.scale;
    const startTop = instance.y * placementState.scale;

    function onMouseMove(e) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      instance.x = Math.max(0, (startLeft + dx) / placementState.scale);
      instance.y = Math.max(0, (startTop + dy) / placementState.scale);
      instance.placementSource = PLACEMENT_SOURCE.MANUAL;

      overlay.style.left = `${instance.x * placementState.scale}px`;
      overlay.style.top = `${instance.y * placementState.scale}px`;
    }

    function onMouseUp() {
      placementState.isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      updateFieldInstancesFormData();
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function startResize(e, instance) {
    e.preventDefault();
    e.stopPropagation();
    placementState.isResizing = true;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = instance.width;
    const startHeight = instance.height;

    function onMouseMove(e) {
      const dx = (e.clientX - startX) / placementState.scale;
      const dy = (e.clientY - startY) / placementState.scale;

      instance.width = Math.max(30, startWidth + dx);
      instance.height = Math.max(20, startHeight + dy);
      instance.placementSource = PLACEMENT_SOURCE.MANUAL;

      renderFieldOverlays();
    }

    function onMouseUp() {
      placementState.isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      updateFieldInstancesFormData();
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function removeFieldInstance(instanceId) {
    const instance = placementState.fieldInstances.find(f => f.id === instanceId);
    if (!instance) return;

    placementState.fieldInstances = placementState.fieldInstances.filter(f => f.id !== instanceId);

    // Unmark field in panel
    const fieldItem = document.querySelector(`.placement-field-item[data-definition-id="${instance.definitionId}"]`);
    if (fieldItem) {
      fieldItem.classList.remove('opacity-50');
      fieldItem.draggable = true;
      const status = fieldItem.querySelector('.placement-status');
      if (status) {
        status.textContent = 'Not placed';
        status.classList.remove('text-green-600');
        status.classList.add('text-amber-600');
      }
    }

    renderFieldOverlays();
    updatePlacementStats();
    updateFieldInstancesFormData();
  }

  function setupPageNavigation() {
    const prevBtn = document.getElementById('placement-prev-page');
    const nextBtn = document.getElementById('placement-next-page');

    prevBtn.addEventListener('click', async () => {
      if (placementState.currentPage > 1) {
        placementState.currentPage--;
        // Phase 3: Auto-place linked fields for this page
        autoPlaceLinkedFieldsForPage(placementState.currentPage);
        await renderPage(placementState.currentPage);
      }
    });

    nextBtn.addEventListener('click', async () => {
      if (placementState.currentPage < placementState.totalPages) {
        placementState.currentPage++;
        // Phase 3: Auto-place linked fields for this page
        autoPlaceLinkedFieldsForPage(placementState.currentPage);
        await renderPage(placementState.currentPage);
      }
    });
  }

  function setupZoomControls() {
    const zoomIn = document.getElementById('placement-zoom-in');
    const zoomOut = document.getElementById('placement-zoom-out');
    const zoomFit = document.getElementById('placement-zoom-fit');
    const zoomLevel = document.getElementById('placement-zoom-level');

    zoomIn.addEventListener('click', async () => {
      placementState.scale = Math.min(3.0, placementState.scale + 0.25);
      zoomLevel.textContent = `${Math.round(placementState.scale * 100)}%`;
      await renderPage(placementState.currentPage);
    });

    zoomOut.addEventListener('click', async () => {
      placementState.scale = Math.max(0.5, placementState.scale - 0.25);
      zoomLevel.textContent = `${Math.round(placementState.scale * 100)}%`;
      await renderPage(placementState.currentPage);
    });

    zoomFit.addEventListener('click', async () => {
      const viewer = document.getElementById('placement-viewer');
      const page = await placementState.pdfDoc.getPage(placementState.currentPage);
      const viewport = page.getViewport({ scale: 1.0 });
      placementState.scale = (viewer.clientWidth - 40) / viewport.width;
      zoomLevel.textContent = `${Math.round(placementState.scale * 100)}%`;
      await renderPage(placementState.currentPage);
    });
  }

  function updatePlacementStats() {
    const paletteItems = Array.from(document.querySelectorAll('.placement-field-item'));
    const totalFields = paletteItems.length;
    const activeDefinitionIDs = new Set(
      paletteItems.map((item) => String(item.dataset.definitionId || '').trim()).filter((id) => id)
    );
    const placedDefinitionIDs = new Set();
    placementState.fieldInstances.forEach((instance) => {
      const definitionID = String(instance.definitionId || '').trim();
      if (activeDefinitionIDs.has(definitionID)) {
        placedDefinitionIDs.add(definitionID);
      }
    });
    const placedCount = placedDefinitionIDs.size;
    const unplacedCount = Math.max(0, totalFields - placedCount);

    document.getElementById('placement-total-fields').textContent = totalFields;
    document.getElementById('placement-placed-count').textContent = placedCount;
    document.getElementById('placement-unplaced-count').textContent = unplacedCount;
  }

  function updateFieldInstancesFormData() {
    const container = document.getElementById('field-instances-container');
    container.innerHTML = '';
    const placementEntries = placementState.fieldInstances.map((instance, index) => toPlacementFormPayload(instance, index));

    if (fieldPlacementsJSONInput) {
      fieldPlacementsJSONInput.value = JSON.stringify(placementEntries);
    }
  }

  // Ensure placement geometry is included in form posts before any interaction.
  updateFieldInstancesFormData();

  // =============================================================================
  // Auto-Placement Engine Integration (Phase 27)
  // =============================================================================

  let autoPlaceState = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: false
  };

  // Auto-place button handler - wired to placement orchestrator
  const autoPlaceBtn = document.getElementById('auto-place-btn');
  if (autoPlaceBtn) {
    autoPlaceBtn.addEventListener('click', async () => {
      if (autoPlaceState.isRunning) return;

      const unplacedFields = document.querySelectorAll('.placement-field-item:not(.opacity-50)');
      if (unplacedFields.length === 0) {
        showToast('All fields are already placed', 'info');
        return;
      }

      const agreementId = document.querySelector('input[name="id"]')?.value;
      if (!agreementId) {
        // Fallback to simple placement for unsaved agreements
        autoPlaceFallback();
        return;
      }

      autoPlaceState.isRunning = true;
      autoPlaceBtn.disabled = true;
      autoPlaceBtn.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analyzing...
      `;

      try {
        // Call placement orchestrator API
        const response = await fetch(`${apiVersionBase}/esign/agreements/${agreementId}/auto-place`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            policy_preset: getSelectedPolicyPreset()
          })
        });

        if (!response.ok) {
          const apiError = await parseAPIError(response, 'Auto-placement failed');
          throw apiError;
        }

        const result = await response.json();
        const run = (result && typeof result === 'object' && result.run && typeof result.run === 'object')
          ? result.run
          : result;
        autoPlaceState.currentRunId = run?.run_id || run?.id || null;
        autoPlaceState.suggestions = run?.suggestions || [];
        autoPlaceState.resolverScores = run?.resolver_scores || [];

        if (autoPlaceState.suggestions.length === 0) {
          showToast('No placement suggestions found. Try placing fields manually.', 'warning');
          autoPlaceFallback();
        } else {
          openSuggestionsModal(result);
        }

      } catch (error) {
        console.error('Auto-place error:', error);
        const userMessage = mapUserFacingError(error?.message || 'Auto-placement failed', error?.code || '', error?.status || 0);
        showToast(`Auto-placement failed: ${userMessage}`, 'error');
        // Fallback to simple placement
        autoPlaceFallback();
      } finally {
        autoPlaceState.isRunning = false;
        autoPlaceBtn.disabled = false;
        autoPlaceBtn.innerHTML = `
          <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Auto-place
        `;
      }
    });
  }

  function getSelectedPolicyPreset() {
    const policySelect = document.getElementById('placement-policy-preset');
    return policySelect?.value || 'balanced';
  }

  function autoPlaceFallback() {
    // Simple auto-placement: stack fields vertically on the last page
    const unplacedFields = document.querySelectorAll('.placement-field-item:not(.opacity-50)');
    let yOffset = 100;

    unplacedFields.forEach(fieldItem => {
      const fieldData = {
        definitionId: fieldItem.dataset.definitionId,
        fieldType: fieldItem.dataset.fieldType,
        participantId: fieldItem.dataset.participantId,
        participantName: fieldItem.dataset.participantName
      };

      const sizes = DEFAULT_FIELD_SIZES[fieldData.fieldType] || DEFAULT_FIELD_SIZES.text;

      // Place on last page
      placementState.currentPage = placementState.totalPages;
      addFieldInstance(fieldData, 300, yOffset + sizes.height / 2, { placementSource: PLACEMENT_SOURCE.AUTO_FALLBACK });
      yOffset += sizes.height + 20;
    });

    // Render the last page
    if (placementState.pdfDoc) {
      renderPage(placementState.totalPages);
    }

    showToast('Fields placed using fallback layout', 'info');
  }

  function openSuggestionsModal(result) {
    // Create or get modal
    let modal = document.getElementById('placement-suggestions-modal');
    if (!modal) {
      modal = createSuggestionsModal();
      document.body.appendChild(modal);
    }

    // Populate suggestions
    const suggestionsContainer = modal.querySelector('#suggestions-list');
    const resolverInfo = modal.querySelector('#resolver-info');
    const runStats = modal.querySelector('#run-stats');

    // Show resolver scores
    resolverInfo.innerHTML = autoPlaceState.resolverScores.map(rs => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${escapeHtml(String(rs?.resolver_id || '').replace(/_/g, ' '))}</span>
        <div class="flex items-center gap-2">
          ${rs.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${getScoreBadgeClass(rs.score)}">
              ${(Number(rs?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join('');

    // Show run stats
    runStats.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${escapeHtml(String(result?.run_id || '').slice(0, 8) || 'N/A')}</code></span>
        <span>Status: <span class="font-medium ${result.status === 'completed' ? 'text-green-600' : 'text-amber-600'}">${escapeHtml(String(result?.status || 'unknown'))}</span></span>
        <span>Time: ${Math.max(0, Number(result?.elapsed_ms || 0))}ms</span>
      </div>
    `;

    // Render suggestions with accept/reject controls
    suggestionsContainer.innerHTML = autoPlaceState.suggestions.map((suggestion, index) => {
      const fieldDef = getFieldDefinitionById(suggestion.field_definition_id);
      const colors = TYPE_COLORS[fieldDef?.type] || TYPE_COLORS.text;
      const safeType = escapeHtml(String(fieldDef?.type || 'field').replace(/_/g, ' '));
      const safeSuggestionID = escapeHtml(String(suggestion?.id || ''));
      const safePageNumber = Math.max(1, Number(suggestion?.page_number || 1));
      const safeX = Math.round(Number(suggestion?.x || 0));
      const safeY = Math.round(Number(suggestion?.y || 0));
      const safeConfidence = Math.max(0, Number(suggestion?.confidence || 0));
      const safeResolverLabel = escapeHtml(formatResolverLabel(String(suggestion?.resolver_id || '')));

      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${index}" data-suggestion-id="${safeSuggestionID}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${colors.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${safeType}</div>
                <div class="text-xs text-gray-500">Page ${safePageNumber}, (${safeX}, ${safeY})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceBadgeClass(suggestion.confidence)}">
                ${(safeConfidence * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${safeResolverLabel}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button type="button" class="accept-suggestion-btn flex-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors" data-index="${index}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Accept
            </button>
            <button type="button" class="reject-suggestion-btn flex-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors" data-index="${index}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Reject
            </button>
            <button type="button" class="preview-suggestion-btn px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors" data-index="${index}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Preview
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind suggestion action handlers
    bindSuggestionActions(modal);

    // Show modal
    modal.classList.remove('hidden');
  }

  function createSuggestionsModal() {
    const modal = document.createElement('div');
    modal.id = 'placement-suggestions-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 hidden';
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Smart Placement Suggestions</h2>
            <p class="text-sm text-gray-500 mt-0.5">Review and apply AI-generated field placements</p>
          </div>
          <button type="button" id="close-suggestions-modal" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div id="run-stats"></div>
            <div class="flex items-center gap-2">
              <button type="button" id="accept-all-btn" class="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors">
                Accept All
              </button>
              <button type="button" id="reject-all-btn" class="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 transition-colors">
                Reject All
              </button>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div class="grid grid-cols-2 gap-4 p-6">
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-3">Suggestions</h3>
              <div id="suggestions-list" class="space-y-3"></div>
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-3">Resolver Ranking</h3>
              <div id="resolver-info" class="bg-gray-50 rounded-lg p-3"></div>

              <h3 class="text-sm font-medium text-gray-700 mt-4 mb-3">Policy Preset</h3>
              <select id="placement-policy-preset-modal" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="balanced">Balanced (Recommended)</option>
                <option value="accuracy-first">Accuracy First</option>
                <option value="cost-first">Cost Optimized</option>
                <option value="speed-first">Speed Optimized</option>
              </select>
              <p class="text-xs text-gray-500 mt-1">Change preset and re-run for different results</p>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" id="rerun-placement-btn" class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            Re-run with New Policy
          </button>
          <button type="button" id="apply-suggestions-btn" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Apply Selected
          </button>
        </div>
      </div>
    `;

    // Close button handler
    modal.querySelector('#close-suggestions-modal').addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });

    // Accept all handler
    modal.querySelector('#accept-all-btn').addEventListener('click', () => {
      modal.querySelectorAll('.suggestion-item').forEach(item => {
        item.classList.add('border-green-500', 'bg-green-50');
        item.classList.remove('border-red-500', 'bg-red-50');
        item.dataset.accepted = 'true';
      });
    });

    // Reject all handler
    modal.querySelector('#reject-all-btn').addEventListener('click', () => {
      modal.querySelectorAll('.suggestion-item').forEach(item => {
        item.classList.add('border-red-500', 'bg-red-50');
        item.classList.remove('border-green-500', 'bg-green-50');
        item.dataset.accepted = 'false';
      });
    });

    // Apply suggestions handler
    modal.querySelector('#apply-suggestions-btn').addEventListener('click', () => {
      applyAcceptedSuggestions();
      modal.classList.add('hidden');
    });

    // Re-run handler
    modal.querySelector('#rerun-placement-btn').addEventListener('click', () => {
      modal.classList.add('hidden');
      // Sync policy preset
      const modalPreset = modal.querySelector('#placement-policy-preset-modal');
      const mainPreset = document.getElementById('placement-policy-preset');
      if (mainPreset && modalPreset) {
        mainPreset.value = modalPreset.value;
      }
      // Trigger auto-place again
      autoPlaceBtn?.click();
    });

    return modal;
  }

  function bindSuggestionActions(modal) {
    // Accept single suggestion
    modal.querySelectorAll('.accept-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.suggestion-item');
        item.classList.add('border-green-500', 'bg-green-50');
        item.classList.remove('border-red-500', 'bg-red-50');
        item.dataset.accepted = 'true';
      });
    });

    // Reject single suggestion
    modal.querySelectorAll('.reject-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.suggestion-item');
        item.classList.add('border-red-500', 'bg-red-50');
        item.classList.remove('border-green-500', 'bg-green-50');
        item.dataset.accepted = 'false';
      });
    });

    // Preview suggestion
    modal.querySelectorAll('.preview-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index, 10);
        const suggestion = autoPlaceState.suggestions[index];
        if (suggestion) {
          previewSuggestionOnDocument(suggestion);
        }
      });
    });
  }

  function previewSuggestionOnDocument(suggestion) {
    // Navigate to the page and highlight the suggested position
    if (suggestion.page_number !== placementState.currentPage) {
      placementState.currentPage = suggestion.page_number;
      renderPage(suggestion.page_number);
    }

    // Create temporary highlight overlay
    const overlaysContainer = document.getElementById('placement-overlays-container');
    const existingPreview = document.getElementById('suggestion-preview-overlay');
    if (existingPreview) existingPreview.remove();

    const preview = document.createElement('div');
    preview.id = 'suggestion-preview-overlay';
    preview.className = 'absolute pointer-events-none animate-pulse';
    preview.style.cssText = `
      left: ${suggestion.x * placementState.scale}px;
      top: ${suggestion.y * placementState.scale}px;
      width: ${suggestion.width * placementState.scale}px;
      height: ${suggestion.height * placementState.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `;
    overlaysContainer.appendChild(preview);

    // Remove preview after 3 seconds
    setTimeout(() => preview.remove(), 3000);
  }

  function applyAcceptedSuggestions() {
    const modal = document.getElementById('placement-suggestions-modal');
    const acceptedItems = modal.querySelectorAll('.suggestion-item[data-accepted="true"]');

    acceptedItems.forEach(item => {
      const index = parseInt(item.dataset.index, 10);
      const suggestion = autoPlaceState.suggestions[index];
      if (!suggestion) return;

      const fieldDef = getFieldDefinitionById(suggestion.field_definition_id);
      if (!fieldDef) return;

      // Find the placement field item
      const fieldItem = document.querySelector(`.placement-field-item[data-definition-id="${suggestion.field_definition_id}"]`);
      if (!fieldItem || fieldItem.classList.contains('opacity-50')) return;

      const fieldData = {
        definitionId: suggestion.field_definition_id,
        fieldType: fieldDef.type,
        participantId: fieldDef.participant_id,
        participantName: fieldItem.dataset.participantName
      };

      // Set current page and add instance
      placementState.currentPage = suggestion.page_number;
      addFieldInstanceFromSuggestion(fieldData, suggestion);
    });

    // Render current page
    if (placementState.pdfDoc) {
      renderPage(placementState.currentPage);
    }

    // Send feedback to API for future improvement
    sendPlacementFeedback(acceptedItems.length, autoPlaceState.suggestions.length - acceptedItems.length);

    showToast(`Applied ${acceptedItems.length} placement${acceptedItems.length !== 1 ? 's' : ''}`, 'success');
  }

  function addFieldInstanceFromSuggestion(fieldData, suggestion) {
    const instance = {
      id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: fieldData.definitionId,
      type: fieldData.fieldType,
      participantId: fieldData.participantId,
      participantName: fieldData.participantName,
      page: suggestion.page_number,
      x: suggestion.x,
      y: suggestion.y,
      width: suggestion.width,
      height: suggestion.height,
      // Track placement source for audit
      placementSource: PLACEMENT_SOURCE.AUTO,
      resolverId: suggestion.resolver_id,
      confidence: suggestion.confidence,
      placementRunId: autoPlaceState.currentRunId
    };

    placementState.fieldInstances.push(instance);

    // Mark field as placed in panel
    const fieldItem = document.querySelector(`.placement-field-item[data-definition-id="${fieldData.definitionId}"]`);
    if (fieldItem) {
      fieldItem.classList.add('opacity-50');
      fieldItem.draggable = false;
      const status = fieldItem.querySelector('.placement-status');
      if (status) {
        status.textContent = 'Placed';
        status.classList.remove('text-amber-600');
        status.classList.add('text-green-600');
      }
    }

    renderFieldOverlays();
    updatePlacementStats();
    updateFieldInstancesFormData();
  }

  function getFieldDefinitionById(definitionId) {
    const fieldEntry = document.querySelector(`.field-definition-entry[data-field-definition-id="${definitionId}"]`);
    if (!fieldEntry) return null;

    return {
      id: definitionId,
      type: fieldEntry.querySelector('.field-type-select')?.value || 'text',
      participant_id: fieldEntry.querySelector('.field-participant-select')?.value || ''
    };
  }

  function getConfidenceBadgeClass(confidence) {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800';
    if (confidence >= 0.7) return 'bg-blue-100 text-blue-800';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  function getScoreBadgeClass(score) {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-blue-100 text-blue-800';
    if (score >= 0.4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-600';
  }

  function formatResolverLabel(resolverId) {
    if (!resolverId) return 'Unknown';
    return resolverId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  async function sendPlacementFeedback(acceptedCount, rejectedCount) {
    void acceptedCount;
    void rejectedCount;
    // Feedback transport endpoint is not implemented in the current admin API.
    // Keep this as a no-op to avoid noisy 404s during placement workflows.
    return;
  }

  function showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      type === 'warning' ? 'bg-amber-500 text-white' :
      'bg-gray-800 text-white'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // =============================================================================
  // Step 6: Send Readiness Check
  // =============================================================================
  function initSendReadinessCheck() {
    const sendReadinessLoading = document.getElementById('send-readiness-loading');
    const sendReadinessResults = document.getElementById('send-readiness-results');
    const sendValidationStatus = document.getElementById('send-validation-status');
    const sendValidationIssues = document.getElementById('send-validation-issues');
    const sendIssuesList = document.getElementById('send-issues-list');
    const sendConfirmation = document.getElementById('send-confirmation');

    const reviewAgreementTitle = document.getElementById('review-agreement-title');
    const reviewDocumentTitle = document.getElementById('review-document-title');
    const reviewParticipantCount = document.getElementById('review-participant-count');
    const reviewStageCount = document.getElementById('review-stage-count');
    const reviewParticipantsList = document.getElementById('review-participants-list');
    const reviewFieldsSummary = document.getElementById('review-fields-summary');

    // Gather data from form
    const title = document.getElementById('title').value || 'Untitled';
    const docTitle = selectedDocumentTitle.textContent || 'No document';
    const participantEntries = participantsContainer.querySelectorAll('.participant-entry');
    const fieldEntries = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
    const expandedRuleFields = expandRulesForPreview(collectFieldRulesForState(), getCurrentDocumentPageCount());
    const signers = getSignerParticipants();

    // Calculate stages
    const stages = new Set();
    participantEntries.forEach(entry => {
      const stageInput = entry.querySelector('.signing-stage-input');
      const roleSelect = entry.querySelector('select[name*=".role"]');
      if (roleSelect.value === 'signer' && stageInput?.value) {
        stages.add(parseInt(stageInput.value, 10));
      }
    });

    // Populate summary
    reviewAgreementTitle.textContent = title;
    reviewDocumentTitle.textContent = docTitle;
    reviewParticipantCount.textContent = `${participantEntries.length} (${signers.length} signers)`;
    reviewStageCount.textContent = stages.size > 0 ? stages.size : '1';

    // Populate participants list
    reviewParticipantsList.innerHTML = '';
    participantEntries.forEach(entry => {
      const nameInput = entry.querySelector('input[name*=".name"]');
      const emailInput = entry.querySelector('input[name*=".email"]');
      const roleSelect = entry.querySelector('select[name*=".role"]');
      const stageInput = entry.querySelector('.signing-stage-input');
      const notifyInput = entry.querySelector('.notify-input');

      const div = document.createElement('div');
      div.className = 'flex items-center justify-between text-sm';
      div.innerHTML = `
        <div>
          <span class="font-medium">${escapeHtml(nameInput.value || emailInput.value)}</span>
          <span class="text-gray-500 ml-2">${escapeHtml(emailInput.value)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${roleSelect.value === 'signer' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}">
            ${roleSelect.value === 'signer' ? 'Signer' : 'CC'}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${notifyInput?.checked !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
            ${notifyInput?.checked !== false ? 'Notify' : 'No Notify'}
          </span>
          ${roleSelect.value === 'signer' && stageInput?.value ? `<span class="text-xs text-gray-500">Stage ${stageInput.value}</span>` : ''}
        </div>
      `;
      reviewParticipantsList.appendChild(div);
    });

    // Populate fields summary
    const totalFields = fieldEntries.length + expandedRuleFields.length;
    reviewFieldsSummary.textContent = `${totalFields} field${totalFields !== 1 ? 's' : ''} defined (${fieldEntries.length} manual, ${expandedRuleFields.length} generated)`;

    // Validation
    const issues = [];

    // Check for document
    if (!documentIdInput.value) {
      issues.push({ severity: 'error', message: 'No document selected', action: 'Go to Step 1', step: 1 });
    }

    // Check for signers
    if (signers.length === 0) {
      issues.push({ severity: 'error', message: 'No signers added', action: 'Go to Step 3', step: 3 });
    }

    // Check each signer has a required signature field
    const missingSigners = findSignersMissingRequiredSignatureField();
    missingSigners.forEach((signer) => {
      issues.push({
        severity: 'error',
        message: `${signer.name} has no required signature field`,
        action: 'Add signature field',
        step: 4
      });
    });

    // Check stage continuity
    const stageArray = Array.from(stages).sort((a, b) => a - b);
    for (let i = 0; i < stageArray.length; i++) {
      if (stageArray[i] !== i + 1) {
        issues.push({
          severity: 'warning',
          message: 'Signing stages should be sequential starting from 1',
          action: 'Review stages',
          step: 3
        });
        break;
      }
    }

    // Display validation results
    const hasErrors = issues.some(i => i.severity === 'error');
    const hasWarnings = issues.some(i => i.severity === 'warning');

    if (hasErrors) {
      sendValidationStatus.className = 'p-4 rounded-lg bg-red-50 border border-red-200';
      sendValidationStatus.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `;
      sendConfirmation.classList.add('hidden');
      submitBtn.disabled = true;
    } else if (hasWarnings) {
      sendValidationStatus.className = 'p-4 rounded-lg bg-amber-50 border border-amber-200';
      sendValidationStatus.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `;
      sendConfirmation.classList.remove('hidden');
      submitBtn.disabled = false;
    } else {
      sendValidationStatus.className = 'p-4 rounded-lg bg-green-50 border border-green-200';
      sendValidationStatus.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `;
      sendConfirmation.classList.remove('hidden');
      submitBtn.disabled = false;
    }

    // Display issues
    if (issues.length > 0) {
      sendValidationIssues.classList.remove('hidden');
      sendIssuesList.innerHTML = '';
      issues.forEach(issue => {
        const li = document.createElement('li');
        li.className = `p-3 rounded-lg flex items-center justify-between ${issue.severity === 'error' ? 'bg-red-50' : 'bg-amber-50'}`;
        li.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${issue.severity === 'error' ? 'text-red-500' : 'text-amber-500'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${issue.severity === 'error' ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'}"/>
            </svg>
            <span class="text-sm">${escapeHtml(issue.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${issue.step}">
            ${escapeHtml(issue.action)}
          </button>
        `;
        sendIssuesList.appendChild(li);
      });

      sendIssuesList.querySelectorAll('[data-go-to-step]').forEach((button) => {
        button.addEventListener('click', () => {
          const step = Number(button.getAttribute('data-go-to-step'));
          if (Number.isFinite(step)) {
            goToStep(step);
          }
        });
      });
    } else {
      sendValidationIssues.classList.add('hidden');
    }

    // Hide loading, show results
    sendReadinessLoading.classList.add('hidden');
    sendReadinessResults.classList.remove('hidden');
  }

  // =============================================================================
  // Wire up state change tracking
  // =============================================================================

  // Debounced tracking function for input events
  let trackingTimeout = null;
  function debouncedTrackChanges() {
    if (trackingTimeout) clearTimeout(trackingTimeout);
    trackingTimeout = setTimeout(() => {
      trackWizardStateChanges();
    }, 500);
  }

  // Track document selection changes (documentIdInput already declared above)
  if (documentIdInput) {
    const observer = new MutationObserver(() => {
      trackWizardStateChanges();
    });
    observer.observe(documentIdInput, { attributes: true, attributeFilter: ['value'] });
  }

  // Track agreement details changes
  const titleInput = document.getElementById('title');
  const messageInput = document.getElementById('message');
  titleInput?.addEventListener('input', () => {
    const nextSource = String(titleInput?.value || '').trim() === ''
      ? TITLE_SOURCE.AUTOFILL
      : TITLE_SOURCE.USER;
    stateManager.setTitleSource(nextSource);
    debouncedTrackChanges();
  });
  messageInput?.addEventListener('input', debouncedTrackChanges);

  // Track participant changes (handled via MutationObserver and change events)
  participantsContainer.addEventListener('input', debouncedTrackChanges);
  participantsContainer.addEventListener('change', debouncedTrackChanges);

  // Track field definition changes
  fieldDefinitionsContainer.addEventListener('input', debouncedTrackChanges);
  fieldDefinitionsContainer.addEventListener('change', debouncedTrackChanges);
  fieldRulesContainer?.addEventListener('input', debouncedTrackChanges);
  fieldRulesContainer?.addEventListener('change', debouncedTrackChanges);

  // Track placement changes (already have updateFieldInstancesFormData)
  const originalUpdateFieldInstancesFormData = updateFieldInstancesFormData;
  updateFieldInstancesFormData = function() {
    originalUpdateFieldInstancesFormData();
    trackWizardStateChanges();
  };

  // Restore participants from state if resuming
  function restoreParticipantsFromState() {
    const state = stateManager.getState();
    if (!state.participants || state.participants.length === 0) return;

    // Clear existing participants (the default one added)
    participantsContainer.innerHTML = '';
    participantFormIndex = 0;

    // Restore from state
    state.participants.forEach(p => {
      addParticipant({
        id: p.tempId,
        name: p.name,
        email: p.email,
        role: p.role,
        notify: p.notify !== false,
        signing_stage: p.signingStage
      });
    });
  }

  // Restore field definitions from state if resuming
  function restoreFieldDefinitionsFromState() {
    const state = stateManager.getState();
    if (!state.fieldDefinitions || state.fieldDefinitions.length === 0) return;

    // Clear existing field definitions
    fieldDefinitionsContainer.innerHTML = '';
    fieldInstanceFormIndex = 0;

    // Restore from state
    state.fieldDefinitions.forEach(f => {
      addFieldDefinition({
        id: f.tempId,
        type: f.type,
        participant_id: f.participantTempId,
        page: f.page,
        required: f.required
      });
    });

    updateFieldDefinitionsEmptyState();
  }

  function restoreFieldRulesFromState() {
    const state = stateManager.getState();
    if (!Array.isArray(state.fieldRules) || state.fieldRules.length === 0) return;
    if (!fieldRulesContainer) return;
    fieldRulesContainer.querySelectorAll('.field-rule-entry').forEach((entry) => entry.remove());
    fieldRuleFormIndex = 0;
    state.fieldRules.forEach((rule) => {
      addFieldRule({
        id: rule.id,
        type: rule.type,
        participantId: rule.participantId || rule.participantTempId,
        fromPage: rule.fromPage,
        toPage: rule.toPage,
        page: rule.page,
        excludeLastPage: rule.excludeLastPage,
        excludePages: rule.excludePages,
        required: rule.required,
      });
    });
    updateFieldRulesEmptyState();
    renderFieldRulePreview();
  }

  function restoreFieldPlacementsFromState() {
    const state = stateManager.getState();
    if (!Array.isArray(state.fieldPlacements) || state.fieldPlacements.length === 0) return;
    placementState.fieldInstances = state.fieldPlacements.map((instance, index) => normalizePlacementInstance(instance, index));
    updateFieldInstancesFormData();
  }

  // Check if we need to restore state after initialization
  if (window._resumeToStep) {
    // Restore participants and field definitions
    restoreParticipantsFromState();
    restoreFieldDefinitionsFromState();
    restoreFieldRulesFromState();
    updateFieldParticipantOptions();
    restoreFieldPlacementsFromState();

    // Restore document preview card if document exists (Phase 2)
    const state = stateManager.getState();
    if (state.document?.id) {
      previewCard.setDocument(state.document.id, state.document.title, state.document.pageCount);
    }

    // Navigate to saved step
    currentStep = window._resumeToStep;
    updateWizardUI();
    delete window._resumeToStep;
  } else {
    // Initialize wizard normally
    updateWizardUI();

    // Load document preview if document is already selected (Phase 2)
    if (documentIdInput.value) {
      const docTitle = selectedDocumentTitle?.textContent || null;
      const docPages = parsePositiveInt(documentPageCountInput.value, null);
      previewCard.setDocument(documentIdInput.value, docTitle, docPages);
    }
  }

  // If editing an existing agreement, don't show sync indicator until changes are made
  if (isEditMode) {
    document.getElementById('sync-status-indicator')?.classList.add('hidden');
  }
}
