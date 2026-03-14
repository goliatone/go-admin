import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(testFileDir, '../src/esign/pages/agreement-form');
const compiledModuleCache = new Map();

function agreementFormMarkup() {
  return `<!doctype html>
  <html>
    <body>
      <script id="esign-page-config" type="application/json">{}</script>
      <form id="agreement-form">
        <button id="submit-btn" type="button">Submit</button>
        <button id="wizard-save-btn" type="button">Save</button>
        <div id="form-announcements"></div>
        <input id="document_id" value="" />
        <input id="document_page_count" value="" />
        <input id="title" value="" />
        <textarea id="message"></textarea>
      </form>
      <div id="selected-document" class="hidden">
        <span id="selected-document-title"></span>
        <span id="selected-document-info"></span>
      </div>
      <div id="document-picker"></div>
      <div id="active-tab-banner" class="hidden"></div>
      <div id="active-tab-message"></div>
      <div id="sync-status-indicator"></div>
      <div id="sync-status-icon"></div>
      <div id="sync-status-text"></div>
      <button id="sync-retry-btn" type="button">Retry</button>
      <div id="conflict-dialog-modal"></div>
      <div id="conflict-local-time"></div>
      <div id="conflict-server-revision"></div>
      <div id="conflict-server-time"></div>
      <button id="conflict-reload-btn" type="button">Reload latest</button>
      <button id="conflict-force-btn" type="button">Force</button>
      <button id="conflict-dismiss-btn" type="button">Dismiss</button>
      <div id="resume-dialog-modal" class="hidden"></div>
      <div id="resume-draft-title"></div>
      <div id="resume-draft-document"></div>
      <div id="resume-draft-step"></div>
      <div id="resume-draft-time"></div>
      <button id="resume-continue-btn" type="button">Continue</button>
      <button id="resume-proceed-btn" type="button">Proceed</button>
      <button id="resume-new-btn" type="button">New</button>
      <button id="resume-discard-btn" type="button">Discard</button>
    </body>
  </html>`;
}

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Document = win.Document;
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.HTMLFormElement = win.HTMLFormElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  globalThis.Storage = win.Storage;
  globalThis.Event = win.Event;
  globalThis.CustomEvent = win.CustomEvent;
  globalThis.MessageEvent = win.MessageEvent;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: win.localStorage, configurable: true });
}

function setupDom(markup = agreementFormMarkup()) {
  const dom = new JSDOM(markup, { url: 'http://localhost:8082/admin/content/esign_agreements/new' });
  setGlobals(dom.window);
  Object.defineProperty(dom.window.document, 'visibilityState', {
    value: 'visible',
    configurable: true,
  });
  return dom;
}

async function importSourceModule(relativePath) {
  const sourcePath = path.resolve(sourceRoot, relativePath);
  const sourceStats = fs.statSync(sourcePath);
  const cacheKey = `${sourcePath}:${sourceStats.mtimeMs}`;

  if (!compiledModuleCache.has(cacheKey)) {
    const outputPath = path.join(
      os.tmpdir(),
      `go-admin-${path.basename(relativePath, path.extname(relativePath))}-${crypto.createHash('sha1').update(cacheKey).digest('hex')}.mjs`,
    );
    await build({
      entryPoints: [sourcePath],
      outfile: outputPath,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: ['es2020'],
      sourcemap: 'inline',
      logLevel: 'silent',
    });
    compiledModuleCache.set(cacheKey, outputPath);
  }

  const outputPath = compiledModuleCache.get(cacheKey);
  return import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);
}

function waitForAsyncHandlers() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function buildSubmitControllerFixture(overrides = {}) {
  const form = document.getElementById('agreement-form');
  const submitBtn = document.getElementById('submit-btn');
  const documentIdInput = document.getElementById('document_id');
  const documentSearch = document.createElement('input');
  const participantsContainer = document.createElement('div');
  const fieldDefinitionsContainer = document.createElement('div');
  const fieldRulesContainer = document.createElement('div');
  const addParticipantBtn = document.createElement('button');
  const addFieldBtn = document.createElement('button');

  documentIdInput.value = 'doc-1';

  const participantEntry = document.createElement('div');
  participantEntry.className = 'participant-entry';
  const participantRole = document.createElement('select');
  participantRole.name = 'participants.0.role';
  participantRole.innerHTML = '<option value="signer">Signer</option>';
  participantRole.value = 'signer';
  participantEntry.appendChild(participantRole);
  participantsContainer.appendChild(participantEntry);

  const fieldDefinitionEntry = document.createElement('div');
  fieldDefinitionEntry.className = 'field-definition-entry';
  const fieldParticipant = document.createElement('select');
  fieldParticipant.className = 'field-participant-select';
  fieldParticipant.innerHTML = '<option value="participant-1">Signer</option>';
  fieldParticipant.value = 'participant-1';
  fieldDefinitionEntry.appendChild(fieldParticipant);
  fieldDefinitionsContainer.appendChild(fieldDefinitionEntry);

  form.appendChild(participantsContainer);
  form.appendChild(fieldDefinitionsContainer);
  form.appendChild(fieldRulesContainer);

  const stateManager = overrides.stateManager || {
    state: {
      currentStep: 6,
      syncPending: false,
      serverDraftId: 'draft-1',
      serverRevision: 2,
    },
    updateState() {},
    collectFormState() {
      return this.state;
    },
    getState() {
      return this.state;
    },
    markSynced(draftId, revision) {
      this.state = {
        ...this.state,
        serverDraftId: draftId,
        serverRevision: revision,
        syncPending: false,
      };
    },
    setState(nextState) {
      this.state = {
        ...this.state,
        ...nextState,
      };
    },
    clear() {
      this.state = {};
    },
  };

  return {
    config: { routes: { index: '/admin/content/esign_agreements' } },
    form,
    submitBtn,
    documentIdInput,
    documentSearch,
    participantsContainer,
    addParticipantBtn,
    fieldDefinitionsContainer,
    fieldRulesContainer,
    documentPageCountInput: null,
    fieldPlacementsJSONInput: null,
    fieldRulesJSONInput: null,
    storageKey: 'wizard-state',
    syncService: {
      async create() {
        return { id: 'draft-new', revision: 1 };
      },
      async load() {
        return { id: 'draft-1', revision: 2 };
      },
      async send() {
        return { agreement_id: 'agreement-1' };
      },
      ...(overrides.syncService || {}),
    },
    syncOrchestrator: {
      async forceSync() {
        return { success: true };
      },
      broadcastStateUpdate() {},
      ...(overrides.syncOrchestrator || {}),
    },
    stateManager,
    submitMode: 'json',
    totalWizardSteps: 6,
    wizardStep: { FIELDS: 4 },
    getCurrentStep() {
      return 6;
    },
    getPlacementState() {
      return { fieldInstances: [] };
    },
    getCurrentDocumentPageCount() {
      return 1;
    },
    ensureSelectedDocumentCompatibility() {
      return true;
    },
    collectFieldRulesForState() {
      return [];
    },
    collectFieldRulesForForm() {
      return [];
    },
    expandRulesForPreview() {
      return [];
    },
    findSignersMissingRequiredSignatureField() {
      return [];
    },
    missingSignatureFieldMessage() {
      return '';
    },
    getSignerParticipants() {
      return [];
    },
    buildCanonicalAgreementPayload() {
      return {};
    },
    announceError() {},
    emitWizardTelemetry() {},
    async parseAPIError() {
      return { status: 500, code: '', details: {}, message: 'Request failed' };
    },
    goToStep() {},
    showSyncConflictDialog() {},
    updateSyncStatus() {},
    addFieldBtn,
    ...(overrides.options || {}),
  };
}

test('collectAgreementFormRefs returns required refs and throws targeted errors for missing required nodes', async () => {
  setupDom();
  const { collectAgreementFormRefs } = await importSourceModule('refs.ts');

  const refs = collectAgreementFormRefs(document);
  assert.equal(refs.form.root.id, 'agreement-form');
  assert.equal(refs.form.submitBtn.id, 'submit-btn');
  assert.equal(refs.coordination.banner?.id, 'active-tab-banner');

  document.getElementById('submit-btn')?.remove();
  assert.throws(
    () => collectAgreementFormRefs(document),
    /Agreement form boot failed: missing required submit button element/,
  );
});

test('coordination banner controller keeps authoring actions enabled for coordinated tabs', async () => {
  setupDom();
  const [{ collectAgreementFormRefs }, { createCoordinationBannerController }] = await Promise.all([
    importSourceModule('refs.ts'),
    importSourceModule('ownership-ui.ts'),
  ]);

  const refs = collectAgreementFormRefs(document);
  const controller = createCoordinationBannerController(refs, {
    formatRelativeTime: () => 'moments ago',
  });

  controller.render({
    coordinationAvailable: true,
    lastSeenAt: '2026-03-12T10:00:00Z',
  });

  assert.equal(refs.coordination.banner?.classList.contains('hidden'), true);
  assert.equal(refs.form.submitBtn.disabled, false);
  assert.equal(refs.form.wizardSaveBtn.disabled, false);

  controller.render({
    coordinationAvailable: false,
    lastSeenAt: '2026-03-12T10:00:00Z',
  });

  assert.equal(refs.coordination.banner?.classList.contains('hidden'), false);
  assert.equal(refs.form.submitBtn.disabled, false);
  assert.equal(refs.form.wizardSaveBtn.disabled, false);
  assert.match(refs.coordination.message?.textContent || '', /moments ago/);
});

test('active tab controller construction is side-effect free and only broadcasts same-draft events', async () => {
  const dom = setupDom();
  const { ActiveTabController } = await importSourceModule('active-tab-controller.ts');
  const coordinationStates = [];
  const broadcastMessages = [];
  const remoteSyncCalls = [];
  const channel = {
    onmessage: null,
    postMessage(message) {
      broadcastMessages.push(message);
    },
    close() {},
  };

  const controller = new ActiveTabController({
    channelName: 'test-active-tab-channel',
    onCoordinationAvailabilityChange(available) {
      coordinationStates.push(available);
    },
    onRemoteSync(draftId, revision) {
      remoteSyncCalls.push({ draftId, revision });
    },
    onVisibilityHidden() {},
    onPageHide() {},
    onBeforeUnload() {},
    documentRef: dom.window.document,
    windowRef: dom.window,
    broadcastChannelFactory: () => channel,
  });

  assert.equal(coordinationStates.length, 0);
  assert.equal(broadcastMessages.length, 0);

  controller.start();
  controller.setActiveDraft('draft-1');

  assert.deepEqual(coordinationStates, [true]);

  controller.broadcastSyncCompleted('draft-1', 3);
  assert.equal(broadcastMessages[0]?.type, 'sync_completed');

  channel.onmessage?.({
    data: {
      type: 'sync_completed',
      tabId: 'tab-other',
      draftId: 'draft-2',
      revision: 5,
    },
  });
  assert.equal(remoteSyncCalls.length, 0);

  channel.onmessage?.({
    data: {
      type: 'sync_completed',
      tabId: 'tab-other',
      draftId: 'draft-1',
      revision: 5,
    },
  });
  assert.deepEqual(remoteSyncCalls, [{ draftId: 'draft-1', revision: 5 }]);

  controller.stop();
});

test('sync controller only starts active-tab coordination from start and stops it on destroy', async () => {
  const { SyncController } = await importSourceModule('sync-controller.ts');
  let startCalls = 0;
  let stopCalls = 0;

  const activeTabController = {
    setActiveDraft() {},
    start() {
      startCalls += 1;
    },
    stop() {
      stopCalls += 1;
    },
    broadcastStateUpdate() {},
    broadcastSyncCompleted() {},
  };

  const controller = new SyncController({
    stateManager: {
      getState() {
        return {
          syncPending: false,
          details: { title: '' },
          currentStep: 1,
          document: { id: '' },
          serverDraftId: '',
          serverRevision: 0,
        };
      },
      markSynced() {},
    },
    syncService: {
      async start() {},
      destroy() {},
      async sync() {
        return { success: true, result: { id: 'draft-1', revision: 1 } };
      },
    },
    activeTabController,
    statusUpdater() {},
    showConflictDialog() {},
    syncDebounceMs: 5,
    syncRetryDelays: [5],
    documentRef: document,
    windowRef: window,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {};
      },
    }),
  });

  assert.equal(startCalls, 0);
  assert.equal(stopCalls, 0);

  controller.start();
  controller.destroy();

  assert.equal(startCalls, 1);
  assert.equal(stopCalls, 1);
});

test('sync controller surfaces same-draft stale conflicts instead of passive-tab blocking', async () => {
  const { SyncController } = await importSourceModule('sync-controller.ts');
  const statusUpdates = [];
  const conflictRevisions = [];

  const controller = new SyncController({
    stateManager: {
      getState() {
        return {
          syncPending: true,
          details: { title: 'Conflict Draft' },
          currentStep: 2,
          document: { id: 'doc-1' },
          serverDraftId: 'draft-1',
          serverRevision: 2,
        };
      },
    },
    syncService: {
      async start() {},
      destroy() {},
      async sync() {
        return { success: false, conflict: true, currentRevision: 3 };
      },
    },
    activeTabController: {
      setActiveDraft() {},
      start() {},
      stop() {},
      broadcastStateUpdate() {},
      broadcastSyncCompleted() {},
    },
    statusUpdater(status) {
      statusUpdates.push(status);
    },
    showConflictDialog(revision) {
      conflictRevisions.push(revision);
    },
    syncDebounceMs: 5,
    syncRetryDelays: [5],
    documentRef: document,
    windowRef: window,
  });

  const result = await controller.performSync();

  assert.equal(result.conflict, true);
  assert.deepEqual(conflictRevisions, [3]);
  assert.deepEqual(statusUpdates.slice(-2), ['saving', 'conflict']);
});

test('sync controller refreshes the bound draft on window focus', async () => {
  setupDom();
  const { SyncController } = await importSourceModule('sync-controller.ts');
  let refreshCalls = 0;

  const controller = new SyncController({
    stateManager: {
      getState() {
        return {
          syncPending: false,
          serverDraftId: 'draft-1',
        };
      },
    },
    syncService: {
      async start() {},
      destroy() {},
      async refresh() {
        refreshCalls += 1;
        return { id: 'draft-1', revision: 2 };
      },
      async sync() {
        return { success: true };
      },
    },
    activeTabController: {
      setActiveDraft() {},
      start() {},
      stop() {},
      broadcastStateUpdate() {},
      broadcastSyncCompleted() {},
    },
    statusUpdater() {},
    showConflictDialog() {},
    syncDebounceMs: 5,
    syncRetryDelays: [5],
    documentRef: document,
    windowRef: window,
  });

  controller.start();
  window.dispatchEvent(new window.Event('focus'));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(refreshCalls, 1);
  controller.destroy();
});

test('submit controller does not recreate an existing draft when the pre-send handshake returns not found', async () => {
  setupDom();
  const { createAgreementFormSubmitController } = await importSourceModule('form-submit.ts');
  let createCalls = 0;
  let forceSyncCalls = 0;

  const controller = createAgreementFormSubmitController(buildSubmitControllerFixture({
    syncService: {
      async create() {
        createCalls += 1;
        return { id: 'draft-recreated', revision: 3 };
      },
      async load() {
        const error = new Error('HTTP 404');
        error.status = 404;
        throw error;
      },
    },
    syncOrchestrator: {
      async forceSync() {
        forceSyncCalls += 1;
        return { success: true };
      },
    },
  }));

  await assert.rejects(
    () => controller.ensureDraftReadyForSend(),
    (error) => error?.code === 'DRAFT_SEND_NOT_FOUND' && error?.status === 404,
  );
  assert.equal(createCalls, 0);
  assert.equal(forceSyncCalls, 2);
});

test('submit controller routes send-time stale revisions through the shared conflict recovery UI', async () => {
  setupDom();
  const { createAgreementFormSubmitController } = await importSourceModule('form-submit.ts');
  const statusUpdates = [];
  const conflictRevisions = [];
  const telemetry = [];

  const controller = createAgreementFormSubmitController(buildSubmitControllerFixture({
    syncService: {
      async send() {
        throw {
          code: 'STALE_REVISION',
          message: 'stale revision',
          currentRevision: 4,
          conflict: {
            currentRevision: 4,
          },
        };
      },
    },
    options: {
      updateSyncStatus(status) {
        statusUpdates.push(status);
      },
      showSyncConflictDialog(revision) {
        conflictRevisions.push(revision);
      },
      emitWizardTelemetry(eventName, fields) {
        telemetry.push({ eventName, fields });
      },
    },
  }));

  controller.bindEvents();
  document.getElementById('agreement-form').dispatchEvent(new window.Event('submit', {
    bubbles: true,
    cancelable: true,
  }));
  await waitForAsyncHandlers();
  await waitForAsyncHandlers();

  assert.deepEqual(conflictRevisions, [4]);
  assert.equal(statusUpdates.includes('conflict'), true);
  assert.equal(document.getElementById('submit-btn').disabled, false);
  assert.equal(telemetry.some((entry) => entry.eventName === 'wizard_send_conflict'), true);
});

test('state binding applyStateToUI rehydrates document, participants, rules, placements, preview, and step', async () => {
  setupDom();
  const { createAgreementStateBindingController } = await importSourceModule('state-binding.ts');

  const appliedCalls = [];
  const previewCalls = [];
  const wizardNavigationController = {
    currentStep: 1,
    getCurrentStep() {
      return this.currentStep;
    },
    setCurrentStep(stepNum) {
      this.currentStep = stepNum;
      appliedCalls.push(`step:${stepNum}`);
    },
    updateWizardUI() {
      appliedCalls.push('wizard-ui');
    },
  };
  const controller = createAgreementStateBindingController({
    titleSource: {
      USER: 'user',
      AUTOFILL: 'autofill',
      SERVER_SEED: 'server_seed',
    },
    stateManager: {
      getState() {
        return {};
      },
      setTitleSource() {},
    },
    trackWizardStateChanges() {
      appliedCalls.push('tracked');
    },
    participantsController: {
      refs: {
        participantsContainer: document.createElement('div'),
        addParticipantBtn: null,
      },
      restoreFromState(state) {
        appliedCalls.push(`participants:${state?.participants?.length || 0}`);
      },
    },
    fieldDefinitionsController: {
      refs: {
        fieldDefinitionsContainer: document.createElement('div'),
        fieldRulesContainer: document.createElement('div'),
      },
      restoreFieldDefinitionsFromState(state) {
        appliedCalls.push(`definitions:${state?.fieldDefinitions?.length || 0}`);
      },
      restoreFieldRulesFromState(state) {
        appliedCalls.push(`rules:${state?.fieldRules?.length || 0}`);
      },
      updateFieldParticipantOptions() {
        appliedCalls.push('participant-options');
      },
    },
    placementController: {
      restoreFieldPlacementsFromState(state) {
        appliedCalls.push(`placements:${state?.fieldPlacements?.length || 0}`);
      },
    },
    updateFieldParticipantOptions() {
      appliedCalls.push('update-field-participants');
    },
    previewCard: {
      setDocument(id, title, pageCount) {
        previewCalls.push({ type: 'set', id, title, pageCount });
      },
      clear() {
        previewCalls.push({ type: 'clear' });
      },
    },
    wizardNavigationController,
    documentIdInput: document.getElementById('document_id'),
    documentPageCountInput: document.getElementById('document_page_count'),
    selectedDocumentTitle: document.getElementById('selected-document-title'),
    agreementRefs: {
      form: {
        titleInput: document.getElementById('title'),
        messageInput: document.getElementById('message'),
      },
      sync: {
        indicator: document.getElementById('sync-status-indicator'),
      },
    },
    parsePositiveInt(value, fallback = 0) {
      const parsed = Number.parseInt(String(value ?? ''), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    },
    isEditMode: false,
  });

  const state = {
    currentStep: 6,
    document: {
      id: 'doc_123',
      title: 'Mutual NDA',
      pageCount: 4,
    },
    details: {
      title: 'Agreement Title',
      message: 'Agreement message',
    },
    participants: [{ tempId: 'participant_1' }],
    fieldDefinitions: [{ tempId: 'field_1' }],
    fieldRules: [{ id: 'rule_1' }],
    fieldPlacements: [{ id: 'placement_1' }],
  };

  controller.applyStateToUI(state);
  controller.applyStateToUI(state);

  assert.equal(document.getElementById('document_id').value, 'doc_123');
  assert.equal(document.getElementById('document_page_count').value, '4');
  assert.equal(document.getElementById('title').value, 'Agreement Title');
  assert.equal(document.getElementById('message').value, 'Agreement message');
  assert.equal(document.getElementById('selected-document').classList.contains('hidden'), false);
  assert.equal(document.getElementById('document-picker').classList.contains('hidden'), true);
  assert.equal(document.getElementById('selected-document-title').textContent, 'Mutual NDA');
  assert.equal(document.getElementById('selected-document-info').textContent, '4 pages');
  assert.deepEqual(appliedCalls, [
    'participants:1',
    'definitions:1',
    'rules:1',
    'update-field-participants',
    'placements:1',
    'step:6',
    'wizard-ui',
    'participants:1',
    'definitions:1',
    'rules:1',
    'update-field-participants',
    'placements:1',
    'step:6',
    'wizard-ui',
  ]);
  assert.deepEqual(previewCalls, [
    { type: 'set', id: 'doc_123', title: 'Mutual NDA', pageCount: 4 },
    { type: 'set', id: 'doc_123', title: 'Mutual NDA', pageCount: 4 },
  ]);
});

test('resume controller continue applies reconciled state without using boot-time globals', async () => {
  setupDom();
  const { createAgreementResumeController } = await importSourceModule('resume-flow.ts');

  let appliedState = null;
  const state = {
    currentStep: 6,
    updatedAt: '2026-03-13T10:00:00Z',
    details: { title: 'Resume Me' },
    document: { id: 'doc_123', title: 'Mutual NDA' },
    participants: [{ tempId: 'participant_1' }],
    fieldDefinitions: [{ tempId: 'field_1' }],
    fieldRules: [{ id: 'rule_1' }],
    fieldPlacements: [{ id: 'placement_1' }],
    syncPending: false,
    serverDraftId: null,
  };
  const stateManager = {
    state,
    getState() {
      return this.state;
    },
    normalizeLoadedState(nextState) {
      return nextState;
    },
    setState(nextState) {
      this.state = nextState;
    },
    clear() {
      this.state = {};
    },
    collectFormState() {
      return this.state;
    },
    hasResumableState() {
      return true;
    },
  };

  const controller = createAgreementResumeController({
    isEditMode: false,
    storageKey: 'wizard-state',
    stateManager,
    syncOrchestrator: {
      broadcastStateUpdate() {},
      broadcastDraftDisposed() {},
      scheduleSync() {},
    },
    syncService: {
      async bootstrap() {
        return {
          resourceRef: { kind: 'agreement_draft', id: 'draft_123' },
          snapshot: {
            ref: { kind: 'agreement_draft', id: 'draft_123' },
            data: { wizard_state: stateManager.state },
            revision: 1,
            updatedAt: '2026-03-13T10:00:00Z',
          },
        };
      },
      async create(nextState) {
        stateManager.state = {
          ...nextState,
          serverDraftId: 'draft_123',
          serverRevision: 2,
          syncPending: false,
        };
        return {
          id: 'draft_123',
          revision: 2,
          wizard_state: stateManager.state,
        };
      },
      async load() {
        throw new Error('not used');
      },
      async dispose() {},
    },
    applyResumedState(nextState) {
      appliedState = nextState;
    },
    hasMeaningfulWizardProgress() {
      return true;
    },
    formatRelativeTime() {
      return 'moments ago';
    },
    emitWizardTelemetry() {},
  });

  controller.bindEvents();
  await controller.maybeShowResumeDialog();
  document.getElementById('resume-continue-btn').click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(document.getElementById('resume-dialog-modal').classList.contains('hidden'), true);
  assert.equal(appliedState.currentStep, 6);
  assert.equal(appliedState.participants.length, 1);
  assert.equal(appliedState.fieldDefinitions.length, 1);
  assert.equal('_resumeToStep' in window, false);
});

test('resume controller clears stale completed draft ids so finished agreements are not resumed', async () => {
  setupDom();
  const { createAgreementResumeController } = await importSourceModule('resume-flow.ts');

  const stateManager = {
    state: {
      currentStep: 6,
      details: { title: 'Completed Draft' },
      document: { id: 'doc_123', title: 'Mutual NDA' },
      serverDraftId: 'draft_123',
      serverRevision: 5,
      syncPending: false,
    },
    getState() {
      return this.state;
    },
    normalizeLoadedState(nextState) {
      return nextState;
    },
    setState(nextState) {
      this.state = nextState;
    },
    clear() {
      this.state = {};
    },
    collectFormState() {
      return this.state;
    },
    hasResumableState() {
      return true;
    },
  };

  const controller = createAgreementResumeController({
    isEditMode: false,
    storageKey: 'wizard-state',
    stateManager,
    syncOrchestrator: {
      broadcastStateUpdate() {},
      broadcastDraftDisposed() {},
      scheduleSync() {},
    },
    syncService: {
      async bootstrap() {
        throw new Error('not used');
      },
      async create() {
        throw new Error('not used');
      },
      async load() {
        const error = new Error('HTTP 404');
        error.status = 404;
        throw error;
      },
      async dispose() {},
    },
    applyResumedState() {},
    hasMeaningfulWizardProgress() {
      return true;
    },
    formatRelativeTime() {
      return 'moments ago';
    },
    emitWizardTelemetry() {},
  });

  const resolved = await controller.reconcileBootstrapState();

  assert.equal(resolved.serverDraftId, null);
  assert.equal(resolved.serverRevision, 0);
});

test('runtime actions conflict reload rehydrates latest server draft without reloading the page', async () => {
  setupDom();
  const { createAgreementRuntimeActionsController } = await importSourceModule('runtime-actions.ts');

  let appliedState = null;
  const stateManager = {
    state: {
      serverDraftId: 'draft_123',
      serverRevision: 4,
      syncPending: false,
    },
    collectFormState() {
      return this.state;
    },
    updateState(nextState) {
      this.state = nextState;
    },
    getState() {
      return this.state;
    },
    clear() {
      this.state = {};
    },
    setState(nextState) {
      this.state = nextState;
    },
  };

  const controller = createAgreementRuntimeActionsController({
    stateManager,
    syncOrchestrator: {
      scheduleSync() {},
      broadcastStateUpdate() {},
      async refreshCurrentDraft() {
        stateManager.setState({
          currentStep: 6,
          serverDraftId: 'draft_123',
          serverRevision: 7,
          syncPending: false,
          details: { title: 'Latest Server Draft' },
        });
        return { success: true };
      },
      manualRetry() {
        return {};
      },
      performSync() {
        return Promise.resolve({});
      },
    },
    syncService: {
      async dispose() {},
      async load() { return { id: 'draft_123', revision: 7 }; },
    },
    applyStateToUI(nextState) {
      appliedState = nextState;
    },
    surfaceSyncOutcome(result) {
      return result;
    },
    announceError() {},
    getCurrentStep() {
      return 1;
    },
    reviewStep: 6,
    onReviewStepRequested() {},
    updateActiveTabOwnershipUI() {},
  });

  document.getElementById('conflict-dialog-modal').classList.remove('hidden');
  controller.bindRetryAndConflictHandlers();
  document.getElementById('conflict-reload-btn').click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(appliedState.currentStep, 6);
  assert.equal(stateManager.getState().serverRevision, 7);
  assert.equal(document.getElementById('conflict-dialog-modal').classList.contains('hidden'), true);
});
