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
      <div id="active-tab-banner" class="hidden"></div>
      <div id="active-tab-message"></div>
      <button id="active-tab-take-control-btn" type="button">Take control</button>
      <button id="active-tab-reload-btn" type="button">Reload</button>
      <div id="sync-status-indicator"></div>
      <div id="sync-status-icon"></div>
      <div id="sync-status-text"></div>
      <button id="sync-retry-btn" type="button">Retry</button>
      <div id="conflict-dialog-modal"></div>
      <div id="conflict-local-time"></div>
      <div id="conflict-server-revision"></div>
      <div id="conflict-server-time"></div>
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
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  globalThis.Storage = win.Storage;
  globalThis.Event = win.Event;
  globalThis.CustomEvent = win.CustomEvent;
  globalThis.MessageEvent = win.MessageEvent;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: win.localStorage, configurable: true });
}

function setupDom() {
  const dom = new JSDOM(agreementFormMarkup(), { url: 'http://localhost:8082/admin/content/esign_agreements/new' });
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

test('collectAgreementFormRefs returns required refs and throws targeted errors for missing required nodes', async () => {
  setupDom();
  const { collectAgreementFormRefs } = await importSourceModule('refs.ts');

  const refs = collectAgreementFormRefs(document);
  assert.equal(refs.form.root.id, 'agreement-form');
  assert.equal(refs.form.submitBtn.id, 'submit-btn');
  assert.equal(refs.ownership.banner?.id, 'active-tab-banner');

  document.getElementById('submit-btn')?.remove();
  assert.throws(
    () => collectAgreementFormRefs(document),
    /Agreement form boot failed: missing required submit button element/,
  );
});

test('ownership UI controller renders passive state and re-enables actions for owner state', async () => {
  setupDom();
  const [{ collectAgreementFormRefs }, { createOwnershipUIController }] = await Promise.all([
    importSourceModule('refs.ts'),
    importSourceModule('ownership-ui.ts'),
  ]);

  const refs = collectAgreementFormRefs(document);
  const controller = createOwnershipUIController(refs, {
    formatRelativeTime: () => 'moments ago',
  });

  controller.render({
    isOwner: false,
    coordinationAvailable: true,
    claim: { lastSeenAt: '2026-03-12T10:00:00Z' },
  });

  assert.equal(refs.ownership.banner?.classList.contains('hidden'), false);
  assert.equal(refs.form.submitBtn.disabled, true);
  assert.equal(refs.form.wizardSaveBtn.disabled, true);
  assert.match(refs.ownership.message?.textContent || '', /moments ago/);

  controller.render({
    isOwner: true,
    coordinationAvailable: true,
  });

  assert.equal(refs.ownership.banner?.classList.contains('hidden'), true);
  assert.equal(refs.form.submitBtn.disabled, false);
  assert.equal(refs.form.wizardSaveBtn.disabled, false);
});

test('active tab controller construction is side-effect free and start claims ownership explicitly', async () => {
  const dom = setupDom();
  const { ActiveTabController } = await importSourceModule('active-tab-controller.ts');
  const ownershipStates = [];
  const broadcastMessages = [];
  const channel = {
    onmessage: null,
    postMessage(message) {
      broadcastMessages.push(message);
    },
    close() {},
  };

  const controller = new ActiveTabController({
    storageKey: 'test-active-tab',
    channelName: 'test-active-tab-channel',
    heartbeatMs: 1000,
    staleMs: 5000,
    telemetry() {},
    onOwnershipChange(state) {
      ownershipStates.push(state);
    },
    onRemoteState() {},
    onRemoteSync() {},
    onVisibilityHidden() {},
    onPageHide() {},
    onBeforeUnload() {},
    documentRef: dom.window.document,
    windowRef: dom.window,
    localStorageRef: dom.window.localStorage,
    broadcastChannelFactory: () => channel,
    now: () => '2026-03-12T10:00:00Z',
  });

  assert.equal(ownershipStates.length, 0);
  assert.equal(dom.window.localStorage.getItem('test-active-tab'), null);
  assert.equal(broadcastMessages.length, 0);

  controller.start();

  assert.equal(controller.isOwner, true);
  assert.equal(ownershipStates.length > 0, true);
  assert.notEqual(dom.window.localStorage.getItem('test-active-tab'), null);
  assert.equal(broadcastMessages[0]?.type, 'active_tab_claimed');

  controller.stop();

  assert.equal(dom.window.localStorage.getItem('test-active-tab'), null);
});

test('sync controller only starts active-tab coordination from start and stops it on destroy', async () => {
  const { SyncController } = await importSourceModule('sync-controller.ts');
  let startCalls = 0;
  let stopCalls = 0;

  const activeTabController = {
    isOwner: true,
    currentClaim: null,
    lastBlockedReason: '',
    start() {
      startCalls += 1;
    },
    stop() {
      stopCalls += 1;
    },
    ensureOwnership() {
      return true;
    },
    takeControl() {
      return true;
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
      async sync() {
        return { success: true, result: { id: 'draft-1', revision: 1 } };
      },
    },
    activeTabController,
    statusUpdater() {},
    showConflictDialog() {},
    syncDebounceMs: 5,
    syncRetryDelays: [5],
    currentUserID: 'user-123',
    draftsEndpoint: '/api/v1/esign/drafts',
    draftEndpointWithUserID(url) {
      return url;
    },
    draftRequestHeaders() {
      return { Accept: 'application/json' };
    },
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
