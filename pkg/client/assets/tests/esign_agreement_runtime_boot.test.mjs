import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.resolve(testFileDir, '../../templates/resources/esign-agreements/form.html');
const templateMarkup = fs.readFileSync(templatePath, 'utf8');

const bootstrapDom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:8082' });
setGlobals(bootstrapDom.window);
Object.defineProperty(globalThis.document, 'readyState', { value: 'loading', configurable: true });

const { AgreementFormController } = await import('../dist/esign/index.js');

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
  globalThis.HTMLTemplateElement = win.HTMLTemplateElement;
  globalThis.HTMLCanvasElement = win.HTMLCanvasElement;
  globalThis.Event = win.Event;
  globalThis.CustomEvent = win.CustomEvent;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.KeyboardEvent = win.KeyboardEvent;
  globalThis.MutationObserver = win.MutationObserver;
  globalThis.FormData = win.FormData;
  globalThis.DOMParser = win.DOMParser;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: win.localStorage, configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: win.sessionStorage, configurable: true });
  globalThis.requestAnimationFrame = win.requestAnimationFrame
    ? win.requestAnimationFrame.bind(win)
    : (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = win.cancelAnimationFrame
    ? win.cancelAnimationFrame.bind(win)
    : (id) => clearTimeout(id);

  if (!win.HTMLElement.prototype.scrollIntoView) {
    win.HTMLElement.prototype.scrollIntoView = () => {};
  }
  if (!win.HTMLCanvasElement.prototype.getContext) {
    win.HTMLCanvasElement.prototype.getContext = () => ({
      clearRect() {},
      drawImage() {},
      fillRect() {},
      save() {},
      restore() {},
      scale() {},
      translate() {},
      beginPath() {},
      rect() {},
      clip() {},
      fillText() {},
      measureText() {
        return { width: 0 };
      },
    });
  }
}

function setupDom() {
  const dom = new JSDOM(templateMarkup, { url: 'http://localhost:8082/admin/content/esign_agreements/new' });
  setGlobals(dom.window);
  Object.defineProperty(globalThis.document, 'readyState', { value: 'complete', configurable: true });

  const configScript = document.getElementById('esign-page-config');
  if (configScript) {
    configScript.textContent = JSON.stringify({
      base_path: '/admin',
      api_base_path: '/admin/api',
      user_id: 'user-123',
      sync: {
        base_url: '/admin/api/v1/esign',
        bootstrap_path: '/admin/api/v1/esign/sync/bootstrap/agreement-draft',
        client_base_path: '/admin/sync-client/sync-core',
        resource_kind: 'agreement_draft',
        action_operations: ['send'],
      },
      is_edit: false,
      create_success: false,
      submit_mode: 'json',
      routes: {
        index: '/admin/content/esign_agreements',
        documents: '/admin/content/esign_documents',
        create: '/admin/content/esign_agreements/new',
        documents_upload_url: '/admin/content/esign_documents/new',
      },
      initial_participants: [],
      initial_field_instances: [],
    });
  }

  return dom;
}

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  };
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createSyncHarness() {
  let draftCounter = 0;
  const drafts = new Map();
  const nextTimestamp = () => new Date(Date.UTC(2026, 2, 12, 12, 0, drafts.size + 1)).toISOString();

  function draftRef(id) {
    return {
      kind: 'agreement_draft',
      id,
      scope: { user_id: 'user-123' },
    };
  }

  function snapshotFromState(id, revision, wizardState) {
    return {
      ref: draftRef(id),
      data: {
        id,
        revision,
        updated_at: nextTimestamp(),
        wizard_state: structuredClone(wizardState),
      },
      revision,
      updatedAt: nextTimestamp(),
      metadata: {
        wizard_id: wizardState.wizardId,
      },
    };
  }

  const module = {
    createInMemoryCache() {
      const cache = new Map();
      return {
        set(ref, snapshot) {
          cache.set(ref.id, structuredClone(snapshot));
          return snapshot;
        },
        clear(ref) {
          cache.delete(ref.id);
        },
      };
    },
    createFetchSyncTransport() {
      return {
        async load(ref) {
          const snapshot = drafts.get(ref.id);
          if (!snapshot) {
            throw { code: 'NOT_FOUND', message: 'draft not found' };
          }
          return structuredClone(snapshot);
        },
        async mutate(input) {
          const current = drafts.get(input.ref.id);
          if (!current) {
            throw { code: 'NOT_FOUND', message: 'draft not found' };
          }
          if (Number(input.expectedRevision || 0) !== Number(current.revision || 0)) {
            throw {
              code: 'STALE_REVISION',
              message: 'stale revision',
              currentRevision: current.revision,
              conflict: {
                code: 'STALE_REVISION',
                message: 'stale revision',
                currentRevision: current.revision,
                latestSnapshot: structuredClone(current),
                staleSnapshot: structuredClone(current),
              },
            };
          }
          if (input.operation === 'send') {
            drafts.delete(input.ref.id);
            return {
              snapshot: {
                ref: input.ref,
                data: {
                  id: input.ref.id,
                  agreement_id: 'agreement-123',
                  draft_deleted: true,
                },
                revision: current.revision + 1,
                updatedAt: nextTimestamp(),
                metadata: { operation: 'send' },
              },
              applied: true,
              replay: false,
            };
          }
          const nextWizardState = structuredClone(input.payload?.wizard_state || {});
          const nextSnapshot = snapshotFromState(input.ref.id, current.revision + 1, nextWizardState);
          drafts.set(input.ref.id, nextSnapshot);
          return {
            snapshot: structuredClone(nextSnapshot),
            applied: true,
            replay: false,
          };
        },
      };
    },
    createSyncEngine({ transport }) {
      return {
        resource(ref) {
          let snapshot = drafts.get(ref.id) ? structuredClone(drafts.get(ref.id)) : null;
          return {
            getSnapshot() {
              return snapshot ? structuredClone(snapshot) : null;
            },
            getState() {
              return {
                ref,
                status: snapshot ? 'ready' : 'idle',
                snapshot: snapshot ? structuredClone(snapshot) : null,
                invalidated: false,
                queueDepth: 0,
                error: null,
                conflict: null,
              };
            },
            subscribe() {
              return () => {};
            },
            async load() {
              snapshot = await transport.load(ref);
              return structuredClone(snapshot);
            },
            async mutate(input) {
              const response = await transport.mutate({ ...input, ref });
              snapshot = structuredClone(response.snapshot);
              if (response.snapshot?.data?.draft_deleted) {
                drafts.delete(ref.id);
              } else {
                drafts.set(ref.id, structuredClone(response.snapshot));
              }
              return response;
            },
            invalidate() {},
            async refresh() {
              snapshot = await transport.load(ref);
              return structuredClone(snapshot);
            },
          };
        },
      };
    },
    parseReadEnvelope(ref, payload) {
      return {
        ref,
        data: payload.data,
        revision: payload.revision,
        updatedAt: payload.updated_at,
        metadata: payload.metadata,
      };
    },
  };

  const fetchStub = async (url) => {
    const href = String(url);
    if (href.includes('/panels/esign_documents')) {
      return jsonResponse({
        items: [
          {
            id: 'doc-1',
            title: 'NDA.pdf',
            page_count: 3,
            compatibility_tier: 'supported',
            created_at: '2026-03-10T10:00:00Z',
            updated_at: '2026-03-10T10:00:00Z',
          },
        ],
      });
    }
    if (href.includes('/esign/sync/bootstrap/agreement-draft')) {
      draftCounter += 1;
      const id = `draft-${draftCounter}`;
      const wizardState = {
        wizardId: `wizard-${draftCounter}`,
        currentStep: 1,
        document: { id: null, title: null, pageCount: null },
        details: { title: '', message: '' },
        participants: [],
        fieldDefinitions: [],
        fieldPlacements: [],
        fieldRules: [],
        titleSource: 'autofill',
        syncPending: false,
      };
      const snapshot = snapshotFromState(id, 1, wizardState);
      drafts.set(id, snapshot);
      return {
        ok: true,
        status: 201,
        json: async () => ({
          resource_ref: snapshot.ref,
          wizard_id: wizardState.wizardId,
          draft: {
            data: snapshot.data,
            revision: snapshot.revision,
            updated_at: snapshot.updatedAt,
            metadata: snapshot.metadata,
          },
        }),
      };
    }
    if (href.includes('/esign/drafts')) {
      return jsonResponse({ items: [] });
    }
    return jsonResponse({});
  };

  return { fetchStub, module };
}

function createFetchStub() {
  const calls = [];
  const harness = createSyncHarness();
  const fetchStub = async (url, init) => {
    const href = String(url);
    calls.push(href);
    return harness.fetchStub(url, init);
  };
  return { calls, fetchStub, harness };
}

test('agreement form boot loads documents from the built bundle without throwing', async () => {
  setupDom();
  const { calls, fetchStub, harness } = createFetchStub();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchStub;
  window.__esignSyncCoreLoader = async () => harness.module;

  try {
    const controller = new AgreementFormController({
      basePath: '/admin',
      apiBasePath: '/admin/api',
      user_id: 'user-123',
      routes: {
        index: '/admin/content/esign_agreements',
        documents: '/admin/content/esign_documents',
        create: '/admin/content/esign_agreements/new',
        documents_upload_url: '/admin/content/esign_documents/new',
      },
    });

    assert.doesNotThrow(() => controller.init());
    await flush();
    await flush();

    assert.ok(
      calls.some((href) => href.includes('/admin/api/panels/esign_documents?')),
      'expected agreement boot to request documents',
    );
    assert.equal(document.querySelectorAll('.document-option').length, 1);

    controller.destroy();
  } finally {
    delete window.__esignSyncCoreLoader;
    globalThis.fetch = originalFetch;
  }
});

test('agreement form boot succeeds when ownership banner nodes are absent', async () => {
  setupDom();
  document.getElementById('active-tab-banner')?.remove();
  document.getElementById('active-tab-message')?.remove();
  document.getElementById('active-tab-take-control-btn')?.remove();
  document.getElementById('active-tab-reload-btn')?.remove();

  const { calls, fetchStub, harness } = createFetchStub();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchStub;
  window.__esignSyncCoreLoader = async () => harness.module;

  try {
    const controller = new AgreementFormController({
      basePath: '/admin',
      apiBasePath: '/admin/api',
      user_id: 'user-123',
      routes: {
        index: '/admin/content/esign_agreements',
        documents: '/admin/content/esign_documents',
        create: '/admin/content/esign_agreements/new',
        documents_upload_url: '/admin/content/esign_documents/new',
      },
    });

    assert.doesNotThrow(() => controller.init());
    await flush();
    await flush();

    assert.ok(
      calls.some((href) => href.includes('/admin/api/panels/esign_documents?')),
      'expected agreement boot to request documents without ownership nodes',
    );

    controller.destroy();
  } finally {
    delete window.__esignSyncCoreLoader;
    globalThis.fetch = originalFetch;
  }
});

test('agreement form destroy does not persist legacy active-tab ownership state', async () => {
  setupDom();
  const { fetchStub, harness } = createFetchStub();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchStub;
  window.__esignSyncCoreLoader = async () => harness.module;

  try {
    const controller = new AgreementFormController({
      basePath: '/admin',
      apiBasePath: '/admin/api',
      user_id: 'user-123',
      routes: {
        index: '/admin/content/esign_agreements',
        documents: '/admin/content/esign_documents',
        create: '/admin/content/esign_agreements/new',
        documents_upload_url: '/admin/content/esign_documents/new',
      },
    });

    controller.init();
    await flush();
    await flush();

    controller.destroy();
    assert.equal(window.localStorage.length, 0);
  } finally {
    delete window.__esignSyncCoreLoader;
    globalThis.fetch = originalFetch;
  }
});

test('agreement form ignores stale localStorage ownership leftovers on boot', async () => {
  setupDom();
  window.localStorage.setItem('legacy-ownership-claim', JSON.stringify({ stale: true }));

  const { fetchStub, harness } = createFetchStub();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchStub;
  window.__esignSyncCoreLoader = async () => harness.module;

  try {
    const controller = new AgreementFormController({
      basePath: '/admin',
      apiBasePath: '/admin/api',
      user_id: 'user-123',
      routes: {
        index: '/admin/content/esign_agreements',
        documents: '/admin/content/esign_documents',
        create: '/admin/content/esign_agreements/new',
        documents_upload_url: '/admin/content/esign_documents/new',
      },
    });

    controller.init();
    await flush();
    await flush();

    const syncStatusText = document.getElementById('sync-status-text');
    assert.notEqual(syncStatusText?.textContent?.trim(), 'Open in another tab');

    controller.destroy();
  } finally {
    delete window.__esignSyncCoreLoader;
    globalThis.fetch = originalFetch;
  }
});

test('agreement form controller destroy releases the shared runtime so a new controller can re-init', async () => {
  setupDom();
  const { calls, fetchStub, harness } = createFetchStub();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchStub;
  window.__esignSyncCoreLoader = async () => harness.module;

  try {
    const first = new AgreementFormController({
      basePath: '/admin',
      apiBasePath: '/admin/api',
      user_id: 'user-123',
      routes: {
        index: '/admin/content/esign_agreements',
        documents: '/admin/content/esign_documents',
        create: '/admin/content/esign_agreements/new',
        documents_upload_url: '/admin/content/esign_documents/new',
      },
    });

    first.init();
    await flush();
    await flush();
    first.destroy();

    setupDom();

    const second = new AgreementFormController({
      basePath: '/admin',
      apiBasePath: '/admin/api',
      user_id: 'user-123',
      routes: {
        index: '/admin/content/esign_agreements',
        documents: '/admin/content/esign_documents',
        create: '/admin/content/esign_agreements/new',
        documents_upload_url: '/admin/content/esign_documents/new',
      },
    });

    second.init();
    await flush();
    await flush();

    const documentRequests = calls.filter((href) => href.includes('/admin/api/panels/esign_documents?'));
    assert.ok(documentRequests.length >= 4, 'expected two boot cycles to reload the document endpoints');

    second.destroy();
  } finally {
    delete window.__esignSyncCoreLoader;
    globalThis.fetch = originalFetch;
  }
});
