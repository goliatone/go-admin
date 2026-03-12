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

function activeTabStorageKey() {
  const scopeToken = ['create', 'user-123', '/admin/content/esign_agreements/new'].join('|');
  return `esign_wizard_active_tab_v1:${encodeURIComponent(scopeToken)}`;
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

function createFetchStub() {
  const calls = [];
  const fetchStub = async (url) => {
    const href = String(url);
    calls.push(href);
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
    if (href.includes('/esign/drafts')) {
      return jsonResponse({ items: [] });
    }
    return jsonResponse({});
  };
  return { calls, fetchStub };
}

test('agreement form boot loads documents from the built bundle without throwing', async () => {
  setupDom();
  const { calls, fetchStub } = createFetchStub();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchStub;

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
    globalThis.fetch = originalFetch;
  }
});

test('agreement form boot succeeds when ownership banner nodes are absent', async () => {
  setupDom();
  document.getElementById('active-tab-banner')?.remove();
  document.getElementById('active-tab-message')?.remove();
  document.getElementById('active-tab-take-control-btn')?.remove();
  document.getElementById('active-tab-reload-btn')?.remove();

  const { calls, fetchStub } = createFetchStub();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchStub;

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
    globalThis.fetch = originalFetch;
  }
});

test('agreement form destroy releases the active-tab claim', async () => {
  setupDom();
  const { fetchStub } = createFetchStub();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchStub;

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

    const storageKey = activeTabStorageKey();
    assert.notEqual(window.localStorage.getItem(storageKey), null);

    controller.destroy();

    assert.equal(window.localStorage.getItem(storageKey), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('agreement form take control clears the stale passive-tab sync status', async () => {
  setupDom();
  const storageKey = activeTabStorageKey();
  window.localStorage.setItem(storageKey, JSON.stringify({
    tabId: 'tab-other',
    claimedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  }));

  const { fetchStub } = createFetchStub();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchStub;

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
    const takeControlButton = document.getElementById('active-tab-take-control-btn');

    assert.equal(syncStatusText?.textContent?.trim(), 'Open in another tab');
    takeControlButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flush();
    await flush();

    assert.notEqual(syncStatusText?.textContent?.trim(), 'Open in another tab');

    controller.destroy();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('agreement form controller destroy releases the shared runtime so a new controller can re-init', async () => {
  setupDom();
  const { calls, fetchStub } = createFetchStub();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchStub;

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
    globalThis.fetch = originalFetch;
  }
});
