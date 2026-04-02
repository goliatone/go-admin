import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testFileDir = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return readFileSync(path.resolve(testFileDir, relativePath), 'utf8');
}

function withDocument(token = 'csrf-token') {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  const meta = {
    getAttribute(name) {
      if (name !== 'content') {
        return null;
      }
      return token;
    },
  };

  globalThis.document = {
    readyState: 'loading',
    addEventListener() {},
    removeEventListener() {},
    querySelector(selector) {
      if (selector === 'meta[name="csrf-token"]') {
        return meta;
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
    body: {},
    documentElement: {},
  };
  globalThis.window = { document: globalThis.document };

  return () => {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  };
}

async function importFresh(relativePath) {
  const moduleURL = new URL(relativePath, import.meta.url);
  moduleURL.searchParams.set('t', String(Date.now() + Math.random()));
  return await import(moduleURL.href);
}

test('csrf-aware transport is adopted by shared wrappers and admin mutation pages', () => {
  const contentTypeAPIClientSource = readSource('../src/content-type-builder/api-client.ts');
  const menuBuilderAPIClientSource = readSource('../src/menu-builder/api-client.ts');
  const errorHelpersSource = readSource('../src/toast/error-helpers.ts');
  const servicesAPIClientSource = readSource('../src/services/api-client.ts');
  const translationExchangeSource = readSource('../src/translation-exchange/translation-exchange-manager.ts');
  const importModalSource = readSource('../src/components/import-modal.ts');
  const exchangeImportSource = readSource('../src/datatable/exchange-import.ts');
  const debugPanelSource = readSource('../src/debug/debug-panel.ts');
  const integrationMappingsSource = readSource('../src/esign/pages/integration-mappings.ts');
  const integrationSyncRunsSource = readSource('../src/esign/pages/integration-sync-runs.ts');
  const integrationConflictsSource = readSource('../src/esign/pages/integration-conflicts.ts');
  const googleDrivePickerSource = readSource('../src/esign/pages/google-drive-picker.ts');
  const googleIntegrationSource = readSource('../src/esign/pages/google-integration.ts');
  const placementEditorSource = readSource('../src/esign/pages/agreement-form/placement-editor.ts');
  const documentSelectionSource = readSource('../src/esign/pages/agreement-form/document-selection.ts');
  const registerTemplateSource = readSource('../../templates/register.html');
  const layoutTemplateSource = readSource('../../templates/layout.html');
  const loginLayoutTemplateSource = readSource('../../templates/login-layout.html');
  const browserGlobalsSource = readSource('../src/shared/transport/browser-globals.ts');

  assert.match(contentTypeAPIClientSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(contentTypeAPIClientSource, /const response = await httpRequest\(url, \{/);

  assert.match(menuBuilderAPIClientSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(menuBuilderAPIClientSource, /const response = await httpRequest\(path, \{/);

  assert.match(errorHelpersSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(errorHelpersSource, /const response = await httpRequest\(endpoint, options\);/);

  assert.match(servicesAPIClientSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(servicesAPIClientSource, /return await httpRequest\(url, options\);/);

  assert.match(translationExchangeSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(translationExchangeSource, /const response = await httpRequest\(path, init\);/);

  assert.match(importModalSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(importModalSource, /response = await httpRequest\(this\.endpoint, \{/);

  assert.match(exchangeImportSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.ok((exchangeImportSource.match(/await httpRequest\(/g) || []).length >= 3);

  assert.match(debugPanelSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.ok((debugPanelSource.match(/httpRequest\(`\$\{this\.debugPath\}/g) || []).length >= 3);

  assert.match(integrationMappingsSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.ok((integrationMappingsSource.match(/await httpRequest\(/g) || []).length >= 4);

  assert.match(integrationSyncRunsSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.ok((integrationSyncRunsSource.match(/await httpRequest\(/g) || []).length >= 2);

  assert.match(integrationConflictsSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(integrationConflictsSource, /await httpRequest\(`\$\{this\.conflictsEndpoint\}\/\$\{this\.currentConflictId\}\/resolve`/);

  assert.match(googleDrivePickerSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(googleDrivePickerSource, /await httpRequest\(this\.buildScopedAPIURL\('\/esign\/google-drive\/imports'\), \{/);

  assert.match(googleIntegrationSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.ok((googleIntegrationSource.match(/await httpRequest\(/g) || []).length >= 2);

  assert.match(placementEditorSource, /from '\.\.\/\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(placementEditorSource, /await httpRequest\(`\$\{apiVersionBase\}\/esign\/agreements\/\$\{agreementId\}\/auto-place`/);

  assert.match(documentSelectionSource, /from '\.\.\/\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(documentSelectionSource, /const triggerResponse = await httpRequest\(triggerURL, \{/);

  assert.equal((registerTemplateSource.match(/\{\{\s*csrf_field\|safe\s*\}\}/g) || []).length, 2);
  assert.match(browserGlobalsSource, /from '\.\/http-client\.js'/);
  assert.match(browserGlobalsSource, /appendCSRFHeader\(resolveRequestURL\(input\), \{ method: resolveRequestMethod\(input, options\) \}, headers\);/);
  assert.match(layoutTemplateSource, /assets\/dist\/runtime\/go-admin-browser\.js/);
  assert.match(loginLayoutTemplateSource, /assets\/dist\/runtime\/go-admin-browser\.js/);
  assert.doesNotMatch(layoutTemplateSource, /window\.goAdminFetch = function/);
  assert.doesNotMatch(loginLayoutTemplateSource, /window\.goAdminFetch = function/);
});

test('browser globals install window.goAdminFetch with the shared csrf rules', async () => {
  const restoreDocument = withDocument('browser-globals-csrf');
  const originalFetch = globalThis.fetch;
  const originalLocation = globalThis.location;
  const requests = [];

  globalThis.location = new URL('https://example.com/admin/feature-flags');
  globalThis.fetch = async (input, init = {}) => {
    requests.push({ input: String(input), init });
    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const module = await importFresh('../dist/shared/transport/browser-globals.js');
    assert.equal(typeof globalThis.window.goAdminFetch, 'function');
    assert.equal(typeof globalThis.window.goAdminCSRFHeaders, 'function');
    assert.equal(typeof globalThis.window.goAdminGetCSRFToken, 'function');
    assert.equal(typeof module.goAdminFetch, 'function');
    assert.equal(typeof module.goAdminCSRFHeaders, 'function');
    assert.equal(typeof module.installBrowserCSRFGlobals, 'function');

    await globalThis.window.goAdminFetch('/admin/api/dashboard/preferences', { method: 'POST' });
    await globalThis.window.goAdminFetch('https://external.example.com/api', { method: 'POST' });
    assert.equal(requests.length, 2);

    const sameOriginHeaders = requests[0].init.headers instanceof Headers
      ? requests[0].init.headers
      : new Headers(requests[0].init.headers || {});
    const crossOriginHeaders = requests[1].init.headers instanceof Headers
      ? requests[1].init.headers
      : new Headers(requests[1].init.headers || {});

    assert.equal(sameOriginHeaders.get('X-CSRF-Token'), 'browser-globals-csrf');
    assert.equal(crossOriginHeaders.get('X-CSRF-Token'), null);
    assert.equal(globalThis.window.goAdminGetCSRFToken(), 'browser-globals-csrf');
    assert.equal(globalThis.window.goAdminCSRFHeaders({ Accept: 'application/json' }).get('X-CSRF-Token'), 'browser-globals-csrf');
  } finally {
    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }
    if (originalLocation === undefined) {
      delete globalThis.location;
    } else {
      globalThis.location = originalLocation;
    }
    restoreDocument();
  }
});

test('executeStructuredRequest appends csrf headers for same-origin unsafe requests', async () => {
  const restoreDocument = withDocument('structured-request-csrf');
  const originalFetch = globalThis.fetch;
  const { executeStructuredRequest } = await importFresh('../dist/toast/error-helpers.js');
  const requests = [];

  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const result = await executeStructuredRequest('/admin/api/panels/documents/doc_123', {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });

    assert.equal(result.success, true);
    assert.equal(requests.length, 1);
    const headers = requests[0].init.headers instanceof Headers
      ? requests[0].init.headers
      : new Headers(requests[0].init.headers || {});
    assert.equal(headers.get('X-CSRF-Token'), 'structured-request-csrf');
  } finally {
    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }
    restoreDocument();
  }
});

test('MenuBuilderAPIClient appends csrf headers on mutating requests', async () => {
  const restoreDocument = withDocument('menu-builder-csrf');
  const originalFetch = globalThis.fetch;
  const { MenuBuilderAPIClient } = await importFresh('../dist/menu-builder/index.js');
  const requests = [];
  const responses = [
    {
      contracts: {
        endpoints: {
          'menu.view_profiles': '/admin/api/menu-view-profiles',
        },
        error_codes: {},
      },
    },
    {
      profile: { code: 'default', name: 'Default', mode: 'full', status: 'draft' },
    },
  ];

  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    const payload = responses.shift();
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      async json() {
        return payload;
      },
      async text() {
        return JSON.stringify(payload);
      },
    };
  };

  try {
    const client = new MenuBuilderAPIClient({ basePath: '/admin/api' });
    await client.createProfile({ code: 'default', name: 'Default' });

    assert.equal(requests.length, 2);
    const headers = requests[1].init.headers instanceof Headers
      ? requests[1].init.headers
      : new Headers(requests[1].init.headers || {});
    assert.equal(requests[1].init.method, 'POST');
    assert.equal(headers.get('X-CSRF-Token'), 'menu-builder-csrf');
  } finally {
    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }
    restoreDocument();
  }
});

test('ContentTypeAPIClient appends csrf headers on mutating requests', async () => {
  const restoreDocument = withDocument('content-type-csrf');
  const originalFetch = globalThis.fetch;
  const { ContentTypeAPIClient } = await importFresh('../dist/content-type-builder/index.js');
  const requests = [];

  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      async json() {
        return { item: { id: 'news', slug: 'news', name: 'News' } };
      },
      async text() {
        return JSON.stringify({ item: { id: 'news', slug: 'news', name: 'News' } });
      },
      clone() {
        return this;
      },
    };
  };

  try {
    const client = new ContentTypeAPIClient({ basePath: '/admin' });
    await client.create({ slug: 'news', name: 'News' });

    assert.equal(requests.length, 1);
    const headers = requests[0].init.headers instanceof Headers
      ? requests[0].init.headers
      : new Headers(requests[0].init.headers || {});
    assert.equal(requests[0].init.method, 'POST');
    assert.equal(headers.get('X-CSRF-Token'), 'content-type-csrf');
  } finally {
    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }
    restoreDocument();
  }
});
