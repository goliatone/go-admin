// @ts-nocheck

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
  const submitMode = String(config.submit_mode || 'form').trim().toLowerCase();
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
  const WIZARD_STORAGE_KEY = 'esign_wizard_state_v1';
  const WIZARD_CHANNEL_NAME = 'esign_wizard_sync';
  const SYNC_DEBOUNCE_MS = 2000;
  const SYNC_RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000];

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
        serverDraftId: null,
        serverRevision: 0,
        lastSyncedAt: null,
        syncPending: false
      };
    }

    generateWizardId() {
      return `wizard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

        if (!Array.isArray(state.fieldRules)) {
          state.fieldRules = [];
        }

        return state;
      } catch (error) {
        console.error('Failed to load wizard state from session:', error);
        return null;
      }
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
        sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(this.state));
      } catch (error) {
        console.error('Failed to save wizard state to session:', error);
      }
    }

    getState() {
      return this.state;
    }

    updateState(partial) {
      this.state = { ...this.state, ...partial, syncPending: true, updatedAt: new Date().toISOString() };
      this.saveToSession();
      this.notifyListeners();
    }

    updateStep(step) {
      this.updateState({ currentStep: step });
    }

    updateDocument(doc) {
      this.updateState({ document: { ...this.state.document, ...doc } });
    }

    updateDetails(details) {
      this.updateState({ details: { ...this.state.details, ...details } });
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
      this.state.serverDraftId = serverDraftId;
      this.state.serverRevision = serverRevision;
      this.state.lastSyncedAt = new Date().toISOString();
      this.state.syncPending = false;
      this.saveToSession();
      this.notifyListeners();
    }

    clear() {
      this.state = this.createInitialState();
      sessionStorage.removeItem(WIZARD_STORAGE_KEY);
      this.notifyListeners();
    }

    hasResumableState() {
      if (!this.state) return false;
      return (
        this.state.currentStep > 1 ||
        this.state.document.id !== null ||
        this.state.participants.length > 0 ||
        this.state.details.title.trim() !== ''
      );
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

      const participants = [];
      document.querySelectorAll('.participant-entry').forEach(entry => {
        const id = entry.getAttribute('data-participant-id');
        const name = entry.querySelector('input[name*=".name"]')?.value || '';
        const email = entry.querySelector('input[name*=".email"]')?.value || '';
        const role = entry.querySelector('select[name*=".role"]')?.value || 'signer';
        const signingStage = parseInt(entry.querySelector('.signing-stage-input')?.value || '1', 10);
        participants.push({ tempId: id, name, email, role, signingStage });
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
      if (titleInput && state.details.title) titleInput.value = state.details.title;
      if (messageInput && state.details.message) messageInput.value = state.details.message;

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
        throw new Error(`HTTP ${response.status}`);
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
              this.stateManager.state = state;
              this.stateManager.notifyListeners();
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
          stateManager.state = { ...serverDraft.wizard_state, serverDraftId: serverDraft.id, serverRevision: serverDraft.revision };
          stateManager.saveToSession();
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
    stateManager.state.serverRevision = serverRevision;
    stateManager.state.syncPending = true;
    stateManager.saveToSession();
    syncOrchestrator.performSync();
    document.getElementById('conflict-dialog-modal')?.classList.add('hidden');
  });

  document.getElementById('conflict-dismiss-btn')?.addEventListener('click', () => {
    document.getElementById('conflict-dialog-modal')?.classList.add('hidden');
  });

  // Resume dialog handlers
  function showResumeDialog() {
    const modal = document.getElementById('resume-dialog-modal');
    const state = stateManager.getState();

    document.getElementById('resume-draft-title').textContent = state.details.title || 'Untitled Agreement';
    document.getElementById('resume-draft-step').textContent = state.currentStep;
    document.getElementById('resume-draft-time').textContent = formatRelativeTime(state.updatedAt);

    modal?.classList.remove('hidden');
  }

  document.getElementById('resume-continue-btn')?.addEventListener('click', () => {
    document.getElementById('resume-dialog-modal')?.classList.add('hidden');
    stateManager.restoreFormState();
    // Navigate to saved step after form is initialized
    window._resumeToStep = stateManager.getState().currentStep;
  });

  document.getElementById('resume-new-btn')?.addEventListener('click', () => {
    // Keep local state but don't restore - user will start fresh
    document.getElementById('resume-dialog-modal')?.classList.add('hidden');
    stateManager.clear();
  });

  document.getElementById('resume-discard-btn')?.addEventListener('click', async () => {
    const state = stateManager.getState();
    if (state.serverDraftId) {
      try {
        await syncService.delete(state.serverDraftId);
      } catch (error) {
        console.warn('Failed to delete server draft:', error);
      }
    }
    stateManager.clear();
    document.getElementById('resume-dialog-modal')?.classList.add('hidden');
  });

  // Check for resumable state on load (only for create mode, not edit)
  if (!isEditMode && stateManager.hasResumableState()) {
    showResumeDialog();
  }

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

  let documents = [];

  function setDocumentPageCountValue(value) {
    const parsed = parseInt(value || '0', 10);
    const resolved = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    if (documentPageCountInput) {
      documentPageCountInput.value = String(resolved);
    }
  }

  function hydrateSelectedDocumentFromList() {
    const currentID = (documentIdInput?.value || '').trim();
    if (!currentID) return;
    const selected = documents.find(doc => String(doc.id || '').trim() === currentID);
    if (!selected) return;

    if (!selectedDocumentTitle.textContent.trim()) {
      selectedDocumentTitle.textContent = selected.title || 'Untitled';
    }
    if (!selectedDocumentInfo.textContent.trim() || selectedDocumentInfo.textContent.trim() === 'pages') {
      selectedDocumentInfo.textContent = `${selected.page_count || 0} pages`;
    }
    setDocumentPageCountValue(selected.page_count || 0);
    selectedDocument.classList.remove('hidden');
    documentPicker.classList.add('hidden');
  }

  async function loadDocuments() {
    try {
      const response = await fetch(`${apiBase}/panels/esign_documents?per_page=100`, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        const apiError = await parseAPIError(response, 'Failed to load documents');
        throw apiError;
      }
      const data = await response.json();
      documents = data.records || data.items || [];
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

    documentList.innerHTML = docs.map((doc, index) => `
      <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              role="option"
              aria-selected="false"
              tabindex="${index === 0 ? '0' : '-1'}"
              data-document-id="${doc.id}"
              data-document-title="${escapeHtml(doc.title || 'Untitled')}"
              data-document-pages="${doc.page_count || 0}">
        <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 truncate">${escapeHtml(doc.title || 'Untitled')}</div>
          <div class="text-xs text-gray-500">${doc.page_count || 0} pages</div>
        </div>
      </button>
    `).join('');

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

    documentIdInput.value = id;
    selectedDocumentTitle.textContent = title;
    selectedDocumentInfo.textContent = `${pages} pages`;
    setDocumentPageCountValue(pages);

    selectedDocument.classList.remove('hidden');
    documentPicker.classList.add('hidden');
    renderFieldRulePreview();
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
    });
  }

  if (documentSearch) {
    documentSearch.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = documents.filter(doc =>
        (doc.title || '').toLowerCase().includes(term)
      );
      renderDocumentList(filtered);
    });
  }

  // Load documents on page load
  loadDocuments();

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

    if (data.name) nameInput.value = data.name;
    if (data.email) emailInput.value = data.email;
    if (data.role) roleSelect.value = data.role;
    if (signingStageInput && data.signing_stage) {
      signingStageInput.value = data.signing_stage;
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
  const addFieldDefinitionEmptyBtn = document.getElementById('add-field-definition-empty-btn');
  const fieldDefinitionsEmptyState = document.getElementById('field-definitions-empty-state');
  const fieldRulesContainer = document.getElementById('field-rules-container');
  const fieldRuleTemplate = document.getElementById('field-rule-template');
  const addFieldRuleBtn = document.getElementById('add-field-rule-btn');
  const fieldRulesEmptyState = document.getElementById('field-rules-empty-state');
  const fieldRulesPreview = document.getElementById('field-rules-preview');
  const fieldRulesJSONInput = document.getElementById('field_rules_json');
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

  function updateFieldParticipantOptions() {
    const signers = getSignerParticipants();
    const participantSelects = fieldDefinitionsContainer.querySelectorAll('.field-participant-select');
    const ruleParticipantSelects = fieldRulesContainer ? fieldRulesContainer.querySelectorAll('.field-rule-participant-select') : [];

    participantSelects.forEach(select => {
      const currentValue = select.value;
      select.innerHTML = '<option value="">Select signer...</option>';
      signers.forEach(signer => {
        const option = document.createElement('option');
        option.value = signer.id;
        option.textContent = signer.name;
        select.appendChild(option);
      });
      // Restore selection if still valid
      if (currentValue && signers.some(s => s.id === currentValue)) {
        select.value = currentValue;
      }
    });

    ruleParticipantSelects.forEach((select) => {
      const currentValue = select.value;
      select.innerHTML = '<option value="">Select signer...</option>';
      signers.forEach((signer) => {
        const option = document.createElement('option');
        option.value = signer.id;
        option.textContent = signer.name;
        select.appendChild(option);
      });
      if (currentValue && signers.some((signer) => signer.id === currentValue)) {
        select.value = currentValue;
      }
    });

    renderFieldRulePreview();
  }

  function getCurrentDocumentPageCount() {
    const explicit = parseInt(documentPageCountInput?.value || '0', 10);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const match = String(selectedDocumentInfo?.textContent || '').match(/(\d+)\s+pages?/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return 1;
  }

  function updateFieldRulesEmptyState() {
    if (!fieldRulesContainer || !fieldRulesEmptyState) return;
    const rows = fieldRulesContainer.querySelectorAll('.field-rule-entry');
    fieldRulesEmptyState.classList.toggle('hidden', rows.length > 0);
  }

  function parseRuleExcludePages(raw) {
    if (!raw) return [];
    return raw
      .split(',')
      .map((value) => parseInt(value.trim(), 10))
      .filter((value) => Number.isFinite(value) && value > 0);
  }

  function collectFieldRulesForState() {
    if (!fieldRulesContainer) return [];
    const rows = fieldRulesContainer.querySelectorAll('.field-rule-entry');
    const out = [];
    rows.forEach((row) => {
      const id = row.getAttribute('data-field-rule-id') || '';
      const type = row.querySelector('.field-rule-type-select')?.value || '';
      const participantId = row.querySelector('.field-rule-participant-select')?.value || '';
      const fromPage = parseInt(row.querySelector('.field-rule-from-page-input')?.value || '0', 10) || 0;
      const toPage = parseInt(row.querySelector('.field-rule-to-page-input')?.value || '0', 10) || 0;
      const page = parseInt(row.querySelector('.field-rule-page-input')?.value || '0', 10) || 0;
      const excludeLastPage = Boolean(row.querySelector('.field-rule-exclude-last-input')?.checked);
      const excludePages = parseRuleExcludePages(row.querySelector('.field-rule-exclude-pages-input')?.value || '');
      const required = (row.querySelector('.field-rule-required-select')?.value || '1') !== '0';
      if (!type) return;
      out.push({
        id,
        type,
        participantId,
        participantTempId: participantId,
        fromPage,
        toPage,
        page,
        excludeLastPage,
        excludePages,
        required,
      });
    });
    return out;
  }

  function collectFieldRulesForForm() {
    return collectFieldRulesForState().map((rule) => ({
      id: rule.id,
      type: rule.type,
      participant_id: rule.participantId,
      from_page: rule.fromPage,
      to_page: rule.toPage,
      page: rule.page,
      exclude_last_page: rule.excludeLastPage,
      exclude_pages: rule.excludePages,
      required: rule.required,
    }));
  }

  function resolveRuleExpansionBaseID(rule, index) {
    const explicitID = String(rule?.id || '').trim();
    if (explicitID) return explicitID;
    return `rule-${index + 1}`;
  }

  function expandRulesForPreview(rules, terminalPage) {
    const expanded = [];
    rules.forEach((rule, index) => {
      const baseRuleID = resolveRuleExpansionBaseID(rule, index);
      if (rule.type === 'initials_each_page') {
        let start = rule.fromPage > 0 ? rule.fromPage : 1;
        let end = rule.toPage > 0 ? rule.toPage : terminalPage;
        if (end < start) [start, end] = [end, start];
        const excluded = new Set(rule.excludePages || []);
        if (rule.excludeLastPage) excluded.add(terminalPage);
        for (let page = start; page <= end; page++) {
          if (excluded.has(page)) continue;
          expanded.push({
            id: `${baseRuleID}-initials-${page}`,
            type: 'initials',
            page,
            participantId: rule.participantId,
            required: rule.required !== false,
          });
        }
      } else if (rule.type === 'signature_once') {
        let page = rule.page > 0 ? rule.page : (rule.toPage > 0 ? rule.toPage : terminalPage);
        if (page <= 0) page = 1;
        expanded.push({
          id: `${baseRuleID}-signature-${page}`,
          type: 'signature',
          page,
          participantId: rule.participantId,
          required: rule.required !== false,
        });
      }
    });
    expanded.sort((left, right) => {
      if (left.page !== right.page) return left.page - right.page;
      return String(left.id).localeCompare(String(right.id));
    });
    return expanded;
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
      const fieldType = String(typeSelect?.value || 'text').trim() || 'text';
      const participantId = String(participantSelect?.value || '').trim();
      definitions.push({
        definitionId,
        fieldType,
        participantId,
        participantName: signerNames.get(participantId) || 'Unassigned',
      });
    });

    const generatedRuleFields = expandRulesForPreview(collectFieldRulesForState(), getCurrentDocumentPageCount());
    generatedRuleFields.forEach((field) => {
      const definitionId = String(field.id || '').trim();
      if (!definitionId) return;
      const participantId = String(field.participantId || '').trim();
      definitions.push({
        definitionId,
        fieldType: String(field.type || 'text').trim() || 'text',
        participantId,
        participantName: signerNames.get(participantId) || 'Unassigned',
      });
    });

    const seen = new Set();
    return definitions.filter((definition) => {
      const key = String(definition.definitionId || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function updateFieldRuleRowUI(entry) {
    const typeSelect = entry.querySelector('.field-rule-type-select');
    const rangeStart = entry.querySelector('.field-rule-range-start-wrap');
    const rangeEnd = entry.querySelector('.field-rule-range-end-wrap');
    const pageWrap = entry.querySelector('.field-rule-page-wrap');
    const excludeLastWrap = entry.querySelector('.field-rule-exclude-last-wrap');
    const excludePagesWrap = entry.querySelector('.field-rule-exclude-pages-wrap');
    const summary = entry.querySelector('.field-rule-summary');
    const fromPage = parseInt(entry.querySelector('.field-rule-from-page-input')?.value || '1', 10) || 1;
    const toPage = parseInt(entry.querySelector('.field-rule-to-page-input')?.value || '1', 10) || 1;
    const page = parseInt(entry.querySelector('.field-rule-page-input')?.value || '1', 10) || 1;
    const excludeLast = Boolean(entry.querySelector('.field-rule-exclude-last-input')?.checked);
    const excludePages = entry.querySelector('.field-rule-exclude-pages-input')?.value || '';

    const isInitials = typeSelect?.value === 'initials_each_page';
    rangeStart.classList.toggle('hidden', !isInitials);
    rangeEnd.classList.toggle('hidden', !isInitials);
    excludeLastWrap.classList.toggle('hidden', !isInitials);
    excludePagesWrap.classList.toggle('hidden', !isInitials);
    pageWrap.classList.toggle('hidden', isInitials);

    if (isInitials) {
      summary.textContent = `Generates initials fields from page ${fromPage} to ${toPage}${excludeLast ? ' (excluding last page)' : ''}${excludePages ? `; excluding ${excludePages}` : ''}.`;
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

    const signers = getSignerParticipants();
    participantSelect.innerHTML = '<option value="">Select signer...</option>';
    signers.forEach((signer) => {
      const option = document.createElement('option');
      option.value = signer.id;
      option.textContent = signer.name;
      participantSelect.appendChild(option);
    });

    typeSelect.value = data.type || 'initials_each_page';
    participantSelect.value = data.participant_id || data.participantId || '';
    fromPageInput.value = String(data.from_page || data.fromPage || 1);
    toPageInput.value = String(data.to_page || data.toPage || terminalPage);
    pageInput.value = String(data.page || 1);
    requiredSelect.value = data.required === false ? '0' : '1';
    excludeLastInput.checked = Boolean(data.exclude_last_page || data.excludeLastPage);
    const excludePages = data.exclude_pages || data.excludePages || [];
    excludePagesInput.value = Array.isArray(excludePages) ? excludePages.join(',') : String(excludePages || '');

    const onRuleInput = () => {
      updateFieldRuleRowUI(entry);
      renderFieldRulePreview();
      debouncedTrackChanges();
    };

    typeSelect.addEventListener('change', onRuleInput);
    participantSelect.addEventListener('change', onRuleInput);
    fromPageInput.addEventListener('input', onRuleInput);
    toPageInput.addEventListener('input', onRuleInput);
    pageInput.addEventListener('input', onRuleInput);
    requiredSelect.addEventListener('change', onRuleInput);
    excludeLastInput.addEventListener('change', onRuleInput);
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
    if (data.page) pageInput.value = data.page;
    if (data.required !== undefined) requiredCheckbox.checked = data.required;

    // Populate participant options
    const signers = getSignerParticipants();
    participantSelect.innerHTML = '<option value="">Select signer...</option>';
    signers.forEach(signer => {
      const option = document.createElement('option');
      option.value = signer.id;
      option.textContent = signer.name;
      participantSelect.appendChild(option);
    });
    // Set participant_id when provided.
    if (data.participant_id) {
      participantSelect.value = data.participant_id;
    }

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

    // Jump to Place button - navigates to Step 5 and sets the PDF viewer to the field's target page
    const fieldPageInput = entry.querySelector('input[name*=".page"]');
    const jumpToPlaceBtn = entry.querySelector('.jump-to-place-btn');

    jumpToPlaceBtn.addEventListener('click', async () => {
      const targetPage = parseInt(fieldPageInput?.value || '1', 10);
      const fieldId = entry.getAttribute('data-field-definition-id');

      // Navigate to Step 5 (placement)
      goToStep(5);

      // Wait for placement editor to initialize if needed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Set the current page in the placement viewer
      if (typeof placementState !== 'undefined' && placementState.pdfDoc) {
        const validPage = Math.max(1, Math.min(targetPage, placementState.totalPages || 1));
        if (placementState.currentPage !== validPage) {
          placementState.currentPage = validPage;
          await renderPage(validPage);
        }

        // Highlight the corresponding field in the placement panel
        const fieldItems = document.querySelectorAll('.placement-field-item');
        fieldItems.forEach(item => item.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50'));
        const targetFieldItem = document.querySelector(`.placement-field-item[data-definition-id="${fieldId}"]`);
        if (targetFieldItem) {
          targetFieldItem.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');
          targetFieldItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Remove highlight after 3 seconds
          setTimeout(() => {
            targetFieldItem.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50');
          }, 3000);
        }
      }
    });

    // Update the jump-to-place button tooltip when page number changes
    const updateJumpBtnTooltip = () => {
      const page = fieldPageInput?.value || '1';
      jumpToPlaceBtn.title = `Place on page ${page}`;
      jumpToPlaceBtn.setAttribute('aria-label', `Jump to place this field on page ${page}`);
    };
    updateJumpBtnTooltip();
    fieldPageInput?.addEventListener('input', updateJumpBtnTooltip);
    fieldPageInput?.addEventListener('change', updateJumpBtnTooltip);

    fieldDefinitionsContainer.appendChild(clone);
    updateFieldDefinitionsEmptyState();
  }

  function updateFieldDefinitionsEmptyState() {
    const fields = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
    if (fields.length === 0) {
      fieldDefinitionsEmptyState.classList.remove('hidden');
    } else {
      fieldDefinitionsEmptyState.classList.add('hidden');
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
    window._initialFieldPlacementsData.push({
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
      placementSource: String(fieldDef.placement_source || fieldDef.placementSource || 'manual').trim() || 'manual',
    });
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
      const signingStageRaw = String(entry.querySelector('.signing-stage-input')?.value || '').trim();
      const signingStage = Number(signingStageRaw || '1') || 1;
      participants.push({
        id: participantId,
        name,
        email,
        role,
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
      placementState.fieldInstances.forEach((instance) => {
        fieldPlacements.push({
          id: String(instance.id || '').trim(),
          definition_id: String(instance.definitionId || '').trim(),
          page: Number(instance.page || 1) || 1,
          x: Number(instance.x || 0) || 0,
          y: Number(instance.y || 0) || 0,
          width: Number(instance.width || 0) || 0,
          height: Number(instance.height || 0) || 0,
        });
      });
    }

    return {
      document_id: String(documentIdInput?.value || '').trim(),
      title: String(document.getElementById('title')?.value || '').trim(),
      message: String(document.getElementById('message')?.value || '').trim(),
      participants,
      field_instances: fieldInstances,
      field_placements: fieldPlacements,
      field_rules: collectFieldRulesForForm(),
      field_rules_json: String(fieldRulesJSONInput?.value || '[]'),
      send_for_signature: currentStep === TOTAL_STEPS ? 1 : 0,
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
      goToStep(4);
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
    const shouldSendForSignature = currentStep === TOTAL_STEPS && !hasSaveAsDraftIntent;

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
      const payload = buildCanonicalAgreementPayload();
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${shouldSendForSignature ? 'Sending...' : 'Saving...'}
      `;

      fetch(`${apiVersionBase}/panels/esign_agreements`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(currentUserID ? { 'X-User-ID': currentUserID } : {}),
        },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        if (!response.ok) {
          const apiError = await parseAPIError(response, 'Failed to create agreement');
          throw apiError;
        }
        return response.json();
      }).then((created) => {
        const createdID = String(created?.id || created?.data?.id || '').trim();
        const indexRoute = String(config.routes?.index || '').trim();
        if (createdID && indexRoute) {
          window.location.href = `${indexRoute}/${encodeURIComponent(createdID)}`;
          return;
        }
        if (indexRoute) {
          window.location.href = indexRoute;
          return;
        }
        window.location.reload();
      }).catch((error) => {
        const message = String(error?.message || 'Failed to create agreement').trim();
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
      });
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
  const TOTAL_STEPS = 6;
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
    wizardNextBtn.classList.toggle('hidden', currentStep === TOTAL_STEPS);
    wizardSaveBtn.classList.toggle('hidden', currentStep !== TOTAL_STEPS);
    submitBtn.classList.toggle('hidden', currentStep !== TOTAL_STEPS);

    // Update next button text based on step
    if (currentStep < TOTAL_STEPS) {
      const nextStepName = ['Details', 'Participants', 'Fields', 'Placement', 'Review'][currentStep - 1] || 'Next';
      wizardNextBtn.innerHTML = `
        ${nextStepName}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `;
    }

    // Run step-specific initialization
    if (currentStep === 5) {
      initPlacementEditor();
    } else if (currentStep === 6) {
      initSendReadinessCheck();
    }
  }

  function validateStep(stepNum) {
    switch (stepNum) {
      case 1:
        if (!documentIdInput.value) {
          announceError('Please select a document');
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
    if (stepNum < 1 || stepNum > TOTAL_STEPS) return;

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
  function normalizePlacementInstance(instance, index) {
    const raw = instance || {};
    const id = String(raw.id || `fi_init_${index || 0}`);
    const definitionId = String(raw.definitionId || raw.definition_id || raw.field_definition_id || id);
    const page = parseInt(raw.page || raw.page_number || '1', 10);
    const x = parseFloat(raw.x || raw.pos_x || '0');
    const y = parseFloat(raw.y || raw.pos_y || '0');
    const width = parseFloat(raw.width || '150');
    const height = parseFloat(raw.height || '32');
    return {
      id,
      definitionId,
      type: String(raw.type || 'text'),
      participantId: String(raw.participantId || raw.participant_id || ''),
      participantName: String(raw.participantName || raw.participant_name || 'Unassigned'),
      page: Number.isFinite(page) && page > 0 ? page : 1,
      x: Number.isFinite(x) && x >= 0 ? x : 0,
      y: Number.isFinite(y) && y >= 0 ? y : 0,
      width: Number.isFinite(width) && width > 0 ? width : 150,
      height: Number.isFinite(height) && height > 0 ? height : 32,
      placementSource: String(raw.placementSource || raw.placement_source || 'manual')
    };
  }

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
    uiHandlersBound: false
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

    placementDefinitions.forEach((definition) => {
      const definitionId = String(definition.definitionId || '').trim();
      const fieldType = String(definition.fieldType || 'text').trim() || 'text';
      const participantId = String(definition.participantId || '').trim();
      const participantName = String(definition.participantName || 'Unassigned').trim() || 'Unassigned';
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

      fieldItem.innerHTML = `
        <span class="w-3 h-3 rounded ${colors.bg}"></span>
        <div class="flex-1 text-xs">
          <div class="font-medium capitalize">${fieldType.replace('_', ' ')}</div>
          <div class="text-gray-500">${participantName}</div>
        </div>
        <span class="placement-status text-xs ${isPlaced ? 'text-green-600' : 'text-amber-600'}">
          ${isPlaced ? 'Placed' : 'Not placed'}
        </span>
      `;

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
    });

    // Try to load PDF
    try {
      // Load PDF.js from CDN if not already loaded
      if (!window.pdfjsLib) {
        await loadPdfJs();
      }

      // Fetch document PDF URL
      const docResponse = await fetch(`${apiBase}/panels/esign_documents/${documentIdInput.value}`, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });
      if (!docResponse.ok) {
        throw new Error(`Failed to load document metadata (${docResponse.status})`);
      }
      const docPayload = await docResponse.json();
      const docData = (docPayload && typeof docPayload === 'object' && docPayload.data && typeof docPayload.data === 'object')
        ? docPayload.data
        : docPayload;
      const sourceObjectKey = String(docData?.source_object_key || '').trim().replace(/^\/+/, '');
      const sourceAssetUrl = sourceObjectKey
        ? `${basePath}/assets/${sourceObjectKey.split('/').map(encodeURIComponent).join('/')}`
        : '';
      const pdfUrl = String(
        docData?.file_url ||
        docData?.url ||
        docData?.source_url ||
        docData?.download_url ||
        sourceAssetUrl
      ).trim();

      if (!pdfUrl) {
        throw new Error('No PDF URL found');
      }

      // Load PDF document
      const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
      placementState.pdfDoc = await loadingTask.promise;
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
      console.error('Failed to load PDF:', error);
      placementLoading.innerHTML = `
        <div class="text-center py-8">
          <svg class="w-16 h-16 mx-auto text-red-300 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <p class="text-sm text-red-600 mb-2">Failed to load PDF</p>
          <p class="text-xs text-gray-400">${error.message}</p>
        </div>
      `;
    }

    updatePlacementStats();
    updateFieldInstancesFormData();
  }

  async function loadPdfJs() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
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
    const placementSource = options.placementSource || 'manual';

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
      placementSource
    };

    placementState.fieldInstances.push(instance);

    // Mark field as placed in the panel
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

  function renderFieldOverlays() {
    const container = document.getElementById('placement-overlays-container');
    container.innerHTML = '';
    container.style.pointerEvents = 'auto';

    placementState.fieldInstances
      .filter(f => f.page === placementState.currentPage)
      .forEach(instance => {
        const colors = TYPE_COLORS[instance.type] || TYPE_COLORS.text;
        const isSelected = placementState.selectedFieldId === instance.id;

        const overlay = document.createElement('div');
        overlay.className = `field-overlay absolute cursor-move ${colors.border} border-2 rounded`;
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
      instance.placementSource = 'manual';

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
      instance.placementSource = 'manual';

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
        await renderPage(placementState.currentPage);
      }
    });

    nextBtn.addEventListener('click', async () => {
      if (placementState.currentPage < placementState.totalPages) {
        placementState.currentPage++;
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

    placementState.fieldInstances.forEach((instance, index) => {
      const inputs = [
        { name: `field_placements[${index}].id`, value: instance.id },
        { name: `field_placements[${index}].definition_id`, value: instance.definitionId },
        { name: `field_placements[${index}].page`, value: instance.page },
        { name: `field_placements[${index}].x`, value: Math.round(instance.x) },
        { name: `field_placements[${index}].y`, value: Math.round(instance.y) },
        { name: `field_placements[${index}].width`, value: Math.round(instance.width) },
        { name: `field_placements[${index}].height`, value: Math.round(instance.height) }
      ];

      inputs.forEach(({ name, value }) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        container.appendChild(input);
      });
    });
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
      addFieldInstance(fieldData, 300, yOffset + sizes.height / 2, { placementSource: 'auto_fallback' });
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
        <span class="font-medium capitalize">${rs.resolver_id.replace(/_/g, ' ')}</span>
        <div class="flex items-center gap-2">
          ${rs.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${getScoreBadgeClass(rs.score)}">
              ${(rs.score * 100).toFixed(0)}%
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
        <span>Run: <code class="bg-gray-100 px-1 rounded">${result.run_id?.slice(0, 8) || 'N/A'}</code></span>
        <span>Status: <span class="font-medium ${result.status === 'completed' ? 'text-green-600' : 'text-amber-600'}">${result.status || 'unknown'}</span></span>
        <span>Time: ${result.elapsed_ms || 0}ms</span>
      </div>
    `;

    // Render suggestions with accept/reject controls
    suggestionsContainer.innerHTML = autoPlaceState.suggestions.map((suggestion, index) => {
      const fieldDef = getFieldDefinitionById(suggestion.field_definition_id);
      const colors = TYPE_COLORS[fieldDef?.type] || TYPE_COLORS.text;

      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${index}" data-suggestion-id="${suggestion.id}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${colors.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${(fieldDef?.type || 'field').replace('_', ' ')}</div>
                <div class="text-xs text-gray-500">Page ${suggestion.page_number}, (${Math.round(suggestion.x)}, ${Math.round(suggestion.y)})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceBadgeClass(suggestion.confidence)}">
                ${(suggestion.confidence * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${formatResolverLabel(suggestion.resolver_id)}
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
      placementSource: 'auto',
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
  titleInput?.addEventListener('input', debouncedTrackChanges);
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

    // Navigate to saved step
    currentStep = window._resumeToStep;
    updateWizardUI();
    delete window._resumeToStep;
  } else {
    // Initialize wizard normally
    updateWizardUI();
  }

  // If editing an existing agreement, don't show sync indicator until changes are made
  if (isEditMode) {
    document.getElementById('sync-status-indicator')?.classList.add('hidden');
  }
}
