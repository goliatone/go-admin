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

function createTabDOM() {
  const dom = new JSDOM(
    `<!doctype html><html><body>
      <div id="sync-status-text"></div>
      <button id="sync-retry-btn" type="button">Retry</button>
      <div id="conflict-dialog-modal"></div>
      <div id="conflict-server-revision"></div>
      <button id="conflict-reload-btn" type="button">Reload latest</button>
      <button id="conflict-force-btn" type="button">Force</button>
      <button id="conflict-dismiss-btn" type="button">Dismiss</button>
    </body></html>`,
    { url: 'http://localhost:8082/admin/content/esign_agreements/new' },
  );
  Object.defineProperty(dom.window.document, 'visibilityState', {
    value: 'visible',
    configurable: true,
  });
  return dom;
}

function createBroadcastNetwork() {
  const registry = new Map();

  function connect(name) {
    const key = String(name || '').trim();
    const peers = registry.get(key) || new Set();
    const channel = {
      onmessage: null,
      postMessage(message) {
        for (const peer of peers) {
          if (peer === channel || typeof peer.onmessage !== 'function') continue;
          peer.onmessage({ data: structuredClone(message) });
        }
      },
      close() {
        peers.delete(channel);
        if (peers.size === 0) registry.delete(key);
      },
    };
    peers.add(channel);
    registry.set(key, peers);
    return channel;
  }

  return { connect };
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createStateManager(initialState) {
  const state = {
    syncPending: false,
    serverDraftId: null,
    serverRevision: 0,
    ...initialState,
  };
  return {
    state,
    getState() {
      return this.state;
    },
    setState(nextState) {
      this.state = { ...this.state, ...nextState };
    },
    markSynced(draftId, revision) {
      this.state = {
        ...this.state,
        serverDraftId: draftId,
        serverRevision: revision,
        syncPending: false,
      };
    },
  };
}

test('agreement sync multitab: different draft tabs ignore each other remote sync events', async () => {
  const { ActiveTabController } = await importSourceModule('active-tab-controller.ts');
  const network = createBroadcastNetwork();
  const tabA = createTabDOM();
  const tabB = createTabDOM();

  const tabARemoteSync = [];
  const tabBRemoteSync = [];

  const controllerA = new ActiveTabController({
    storageKey: 'wizard-active-tab',
    channelName: 'esign_wizard_sync',
    heartbeatMs: 250,
    staleMs: 1000,
    telemetry() {},
    onOwnershipChange() {},
    onRemoteState() {},
    onRemoteSync(draftId, revision) {
      tabARemoteSync.push({ draftId, revision });
    },
    onVisibilityHidden() {},
    onPageHide() {},
    onBeforeUnload() {},
    documentRef: tabA.window.document,
    windowRef: tabA.window,
    localStorageRef: tabA.window.localStorage,
    broadcastChannelFactory: (name) => network.connect(name),
  });
  const controllerB = new ActiveTabController({
    storageKey: 'wizard-active-tab',
    channelName: 'esign_wizard_sync',
    heartbeatMs: 250,
    staleMs: 1000,
    telemetry() {},
    onOwnershipChange() {},
    onRemoteState() {},
    onRemoteSync(draftId, revision) {
      tabBRemoteSync.push({ draftId, revision });
    },
    onVisibilityHidden() {},
    onPageHide() {},
    onBeforeUnload() {},
    documentRef: tabB.window.document,
    windowRef: tabB.window,
    localStorageRef: tabB.window.localStorage,
    broadcastChannelFactory: (name) => network.connect(name),
  });

  controllerA.start();
  controllerB.start();
  controllerA.setActiveDraft('draft-a');
  controllerB.setActiveDraft('draft-b');

  controllerA.broadcastSyncCompleted('draft-a', 2);
  await flush();

  assert.deepEqual(tabARemoteSync, []);
  assert.deepEqual(tabBRemoteSync, []);

  controllerA.stop();
  controllerB.stop();
});

test('agreement sync multitab: same draft refreshes when clean and surfaces stale conflict when dirty', async () => {
  const [{ ActiveTabController }, { SyncController }] = await Promise.all([
    importSourceModule('active-tab-controller.ts'),
    importSourceModule('sync-controller.ts'),
  ]);
  const network = createBroadcastNetwork();
  let backendRevision = 2;

  function buildTab(windowName) {
    const dom = createTabDOM();
    dom.window.name = windowName;
    const stateManager = createStateManager({
      syncPending: false,
      serverDraftId: 'draft-shared',
      serverRevision: 2,
      details: { title: 'Shared Agreement' },
      currentStep: 3,
      document: { id: 'doc-1' },
    });
    const statusUpdates = [];
    const conflictRevisions = [];
    let refreshCalls = 0;
    let controller;

    const syncService = {
      async start() {},
      destroy() {},
      async refresh() {
        refreshCalls += 1;
        stateManager.setState({
          serverRevision: backendRevision,
          syncPending: false,
        });
        return { id: 'draft-shared', revision: backendRevision };
      },
      async sync() {
        if (Number(stateManager.getState().serverRevision || 0) !== backendRevision) {
          return { success: false, conflict: true, currentRevision: backendRevision };
        }
        stateManager.setState({ syncPending: false, serverRevision: backendRevision });
        return { success: true, result: { id: 'draft-shared', revision: backendRevision } };
      },
    };

    const activeTabController = new ActiveTabController({
      storageKey: 'wizard-active-tab',
      channelName: 'esign_wizard_sync',
      heartbeatMs: 250,
      staleMs: 1000,
      telemetry() {},
      onOwnershipChange() {},
      onRemoteState() {},
      onRemoteSync(draftId) {
        if (String(stateManager.getState().serverDraftId || '').trim() !== String(draftId || '').trim()) return;
        if (stateManager.getState().syncPending) return;
        void controller.refreshCurrentDraft({ preserveDirty: true, force: true });
      },
      onVisibilityHidden() {},
      onPageHide() {},
      onBeforeUnload() {},
      documentRef: dom.window.document,
      windowRef: dom.window,
      localStorageRef: dom.window.localStorage,
      broadcastChannelFactory: (name) => network.connect(name),
    });

    controller = new SyncController({
      stateManager,
      syncService,
      activeTabController,
      storageKey: 'wizard-state',
      statusUpdater(status) {
        statusUpdates.push(status);
      },
      showConflictDialog(revision) {
        conflictRevisions.push(revision);
      },
      syncDebounceMs: 5,
      syncRetryDelays: [5],
      documentRef: dom.window.document,
      windowRef: dom.window,
    });

    controller.start();
    activeTabController.setActiveDraft('draft-shared');

    return {
      dom,
      controller,
      activeTabController,
      stateManager,
      get refreshCalls() {
        return refreshCalls;
      },
      statusUpdates,
      conflictRevisions,
      destroy() {
        controller.destroy();
      },
    };
  }

  const tabA = buildTab('tab-a');
  const tabB = buildTab('tab-b');

  backendRevision = 3;
  tabA.activeTabController.broadcastSyncCompleted('draft-shared', 3);
  await flush();

  assert.equal(tabB.refreshCalls, 1);
  assert.equal(tabB.stateManager.getState().serverRevision, 3);

  tabB.stateManager.setState({ syncPending: true });
  backendRevision = 4;
  tabA.activeTabController.broadcastSyncCompleted('draft-shared', 4);
  await flush();

  assert.equal(tabB.refreshCalls, 1, 'dirty tab should not auto-refresh over unsaved state');

  const conflict = await tabB.controller.performSync();
  assert.equal(conflict.conflict, true);
  assert.deepEqual(tabB.conflictRevisions, [4]);
  assert.deepEqual(tabB.statusUpdates.slice(-2), ['saving', 'conflict']);

  tabA.destroy();
  tabB.destroy();
});
