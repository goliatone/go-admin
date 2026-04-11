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
const runtimeTemplatePath = path.resolve(
  testFileDir,
  '../../templates/resources/esign-source-management/runtime.html',
);
const runtimeTemplate = fs.readFileSync(runtimeTemplatePath, 'utf8');

const bootstrapDom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost:8082/admin/esign/sources',
});
setGlobals(bootstrapDom.window);
Object.defineProperty(globalThis.document, 'readyState', { value: 'loading', configurable: true });

const {
  PHASE_15_PAGE_DEFINITIONS,
  initSourceManagementRuntimePage,
  getPageController,
} = await import('../dist/esign/index.js');

function setGlobals(win) {
  defineGlobal('window', win);
  defineGlobal('document', win.document);
  defineGlobal('Document', win.Document);
  defineGlobal('Node', win.Node);
  defineGlobal('Element', win.Element);
  defineGlobal('HTMLElement', win.HTMLElement);
  defineGlobal('HTMLButtonElement', win.HTMLButtonElement);
  defineGlobal('HTMLFormElement', win.HTMLFormElement);
  defineGlobal('HTMLInputElement', win.HTMLInputElement);
  defineGlobal('Event', win.Event);
  defineGlobal('CustomEvent', win.CustomEvent);
  defineGlobal('FormData', win.FormData);
  defineGlobal('AbortController', win.AbortController);
  defineGlobal('AbortSignal', win.AbortSignal);
  defineGlobal('navigator', win.navigator);
  defineGlobal('history', win.history);
  defineGlobal('location', win.location);
}

function defineGlobal(name, value) {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}

function createRuntimeMarkup({ page, config, model }) {
  return `
    <!doctype html>
    <html>
      <body>
        <div data-esign-page="${page}" hidden></div>
        <script id="esign-page-config" type="application/json">${JSON.stringify(config)}</script>
        <script id="source-management-page-model" type="application/json">${JSON.stringify(model)}</script>
        <div data-source-management-runtime-root></div>
      </body>
    </html>
  `;
}

function useRuntimeDOM(markup, url = 'http://localhost:8082/admin/esign/sources') {
  const dom = new JSDOM(markup, { url });
  setGlobals(dom.window);
  Object.defineProperty(globalThis.document, 'readyState', { value: 'complete', configurable: true });
  return dom;
}

function installFetchStub(payload) {
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return payload;
    },
    async text() {
      return JSON.stringify(payload);
    },
  });
}

test('phase 15 runtime definitions cover all runtime surfaces', () => {
  assert.deepEqual(Object.keys(PHASE_15_PAGE_DEFINITIONS), [
    'source-browser',
    'source-detail',
    'source-revision-inspector',
    'source-comment-inspector',
    'source-artifact-inspector',
    'source-search',
  ]);

  for (const definition of Object.values(PHASE_15_PAGE_DEFINITIONS)) {
    assert.equal(definition.templatePath, 'resources/esign-source-management/runtime.html');
    assert.equal(definition.requiresBackendLinks, true);
  }
});

test('runtime template exposes a single runtime module load and the live workspace root', () => {
  assert.match(
    runtimeTemplate,
    /data-source-management-runtime-root/,
    'expected runtime template to expose the live workspace root'
  );
  assert.match(
    runtimeTemplate,
    /source_management_page_model_json/,
    'expected runtime template to emit the page model payload'
  );

  const moduleLoads = runtimeTemplate.match(/<script type="module" src="/g) ?? [];
  assert.equal(moduleLoads.length, 1, 'expected runtime template to load the esign module exactly once');
});

test('runtime bootstrap renders source browser from server-authored contracts and registers the page controller', async () => {
  const payload = {
    items: [
      {
        source: { id: 'src_123', label: 'Master Service Agreement' },
        status: 'active',
        lineage_confidence: 'high',
        provider: {
          kind: 'google_drive',
          label: 'Google Drive',
          external_file_id: 'fixture-google-file-1',
        },
        latest_revision: {
          id: 'rev_123',
          provider_revision_hint: 'candidate-v2',
          modified_time: '2026-03-22T10:00:00Z',
        },
        pending_candidate_count: 2,
        links: {},
      },
    ],
    page_info: { page: 1, page_size: 20, total_count: 1, has_more: false, sort: 'updated_desc' },
    applied_query: { query: 'msa' },
    permissions: {},
    empty_state: { kind: 'none' },
    links: {},
  };

  installFetchStub(payload);
  const config = {
    page: 'admin.sources.browser',
    api_base_path: '/admin/api/v1/esign',
    routes: {
      source_browser: '/admin/esign/sources',
      source_detail: '/admin/esign/sources/:source_document_id',
      source_search: '/admin/esign/source-search',
    },
    context: {
      surface: 'source_browser',
    },
  };
  const model = {
    surface: 'source_browser',
    title: 'Source Browser',
    summary: 'Runtime source browser',
    contract: payload,
  };

  useRuntimeDOM(createRuntimeMarkup({ page: 'admin.sources.browser', config, model }));
  const controller = initSourceManagementRuntimePage();
  assert.ok(controller, 'expected runtime bootstrap controller');

  const root = globalThis.document.querySelector('[data-source-management-runtime-root]');
  assert.ok(root);
  assert.match(root.innerHTML, /Master Service Agreement/);
  assert.match(root.innerHTML, /fixture-google-file-1/);
  assert.ok(getPageController('admin.sources.browser'));
});

test('runtime bootstrap renders source search from backend-authored result links', async () => {
  const payload = {
    items: [
      {
        result_kind: 'source_revision',
        source: { id: 'src_789', label: 'Vendor Terms' },
        revision: { id: 'rev_789', provider_revision_hint: 'vendor-v3' },
        provider: { kind: 'google_drive', label: 'Google Drive' },
        matched_fields: ['canonical_title', 'comment_text'],
        summary: 'Matched canonical_title and comment_text across canonical source metadata.',
        links: {},
      },
    ],
    page_info: { page: 1, page_size: 20, total_count: 1, has_more: false, sort: 'relevance' },
    applied_query: { query: 'Need legal approval', has_comments: true },
    permissions: {},
    empty_state: { kind: 'none' },
    links: {},
  };

  installFetchStub(payload);
  const config = {
    page: 'admin.sources.search',
    api_base_path: '/admin/api/v1/esign',
    routes: {
      source_browser: '/admin/esign/sources',
      source_detail: '/admin/esign/sources/:source_document_id',
      source_revision: '/admin/esign/source-revisions/:source_revision_id',
      source_search: '/admin/esign/source-search',
    },
    context: {
      surface: 'source_search',
    },
  };
  const model = {
    surface: 'source_search',
    title: 'Source Search',
    result_links: [
      {
        label: 'Vendor Terms revision',
        href: '/admin/esign/source-revisions/rev_789?q=Need+legal+approval',
      },
    ],
    contract: payload,
  };

  useRuntimeDOM(
    createRuntimeMarkup({ page: 'admin.sources.search', config, model }),
    'http://localhost:8082/admin/esign/source-search?q=Need+legal+approval'
  );
  const controller = initSourceManagementRuntimePage();
  assert.ok(controller, 'expected runtime bootstrap controller');

  const root = globalThis.document.querySelector('[data-source-management-runtime-root]');
  assert.ok(root);
  assert.match(root.innerHTML, /Matched canonical_title and comment_text/);
  assert.match(root.innerHTML, /\/admin\/esign\/source-revisions\/rev_789\?q=Need\+legal\+approval/);
  assert.ok(getPageController('admin.sources.search'));
});
