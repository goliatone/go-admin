import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

const fixtures = JSON.parse(
  await readFile(new URL('../../../../admin/testdata/translation_matrix_contract_fixtures.json', import.meta.url), 'utf8')
);

const {
  buildTranslationMatrixBulkActionPayload,
  buildTranslationMatrixLocalePolicyMetadata,
  buildTranslationMatrixURL,
  createTranslationMatrixSelectionState,
  initTranslationMatrixPage,
  isTranslationMatrixNotRequiredCell,
  normalizeTranslationMatrixBulkActionResponse,
  normalizeTranslationMatrixResponse,
  setTranslationMatrixSelectedLocales,
  toggleTranslationMatrixFamilySelection,
} = await import('../dist/translation-matrix/index.js');

test('translation matrix contracts: normalize viewport rows, columns, and bulk action states', () => {
  const payload = normalizeTranslationMatrixResponse(fixtures.states.viewport);

  assert.equal(payload.data.columns.length, 4);
  assert.equal(payload.data.columns[0].locale, 'en');
  assert.equal(payload.data.rows.length, 2);
  assert.equal(payload.data.selection.bulk_actions.create_missing.enabled, true);
  assert.equal(payload.data.selection.bulk_actions.export_selected.permission, 'admin.translations.export');
  assert.equal(payload.meta.locale_policy[1].optional_family_count, 1);
  assert.equal(payload.meta.quick_action_targets.create_missing.endpoint, '/admin/api/translations/matrix/actions/create-missing');

  const pageRow = payload.data.rows.find((row) => row.family_id === 'tg-page-matrix-1');
  assert.ok(pageRow);
  assert.equal(pageRow.cells.es.state, 'in_progress');
  assert.equal(pageRow.cells.fr.state, 'fallback');
  assert.equal(isTranslationMatrixNotRequiredCell(pageRow.cells.de), true);
  assert.equal(pageRow.links.family.href, '/admin/translations/families/tg-page-matrix-1');
  assert.equal(pageRow.cells.fr.quick_actions.create.enabled, true);
  assert.equal(pageRow.cells.de.quick_actions.create.reason_code, 'INVALID_STATUS');
});

test('translation matrix contracts: build canonical query urls with locale windows', () => {
  const url = buildTranslationMatrixURL('/admin/api/translations/matrix', {
    environment: 'production',
    tenantId: 'tenant-1',
    orgId: 'org-1',
    contentType: 'pages',
    blockerCode: 'missing_locale',
    locales: ['fr', 'de'],
    localeLimit: 2,
    localeOffset: 0,
  });

  assert.equal(
    url,
    '/admin/api/translations/matrix?environment=production&tenant_id=tenant-1&org_id=org-1&content_type=pages&blocker_code=missing_locale&locales=fr%2Cde&locale_offset=0&locale_limit=2'
  );
});

test('translation matrix contracts: selection state stays deterministic and serializable for bulk actions', () => {
  let state = createTranslationMatrixSelectionState({
    bulk_actions: fixtures.states.viewport.data.selection.bulk_actions,
  });
  state = toggleTranslationMatrixFamilySelection(state, 'tg-page-matrix-1');
  state = toggleTranslationMatrixFamilySelection(state, 'tg-news-matrix-1');
  state = setTranslationMatrixSelectedLocales(state, ['fr', 'es', 'fr']);

  assert.deepEqual(state.family_ids, ['tg-news-matrix-1', 'tg-page-matrix-1']);
  assert.deepEqual(state.locales, ['fr', 'es']);

  const payload = buildTranslationMatrixBulkActionPayload(state, {
    auto_create_assignment: true,
  });
  assert.deepEqual(payload.family_ids, ['tg-news-matrix-1', 'tg-page-matrix-1']);
  assert.deepEqual(payload.locales, ['fr', 'es']);
  assert.equal(payload.auto_create_assignment, true);
});

test('translation matrix contracts: locale policy metadata exposes sticky headers and optional cells', () => {
  const payload = normalizeTranslationMatrixResponse(fixtures.states.viewport);
  const metadata = buildTranslationMatrixLocalePolicyMetadata(payload);

  const source = metadata.find((column) => column.locale === 'en');
  assert.ok(source);
  assert.equal(source.sticky, true);
  assert.equal(source.source_locale, true);

  const german = metadata.find((column) => column.locale === 'de');
  assert.ok(german);
  assert.equal(german.optional_family_count, 1);
  assert.deepEqual(german.not_required_family_ids, ['tg-page-matrix-1']);
});

test('translation matrix contracts: normalize create-missing and export-selected bulk action payloads', () => {
  const createPayload = normalizeTranslationMatrixBulkActionResponse(fixtures.actions.create_missing);
  assert.equal(createPayload.data.action, 'create_missing');
  assert.equal(createPayload.data.summary.created, 1);
  assert.equal(createPayload.data.results[0].created[0].assignment_id, 'txasg_fr_1');

  const exportPayload = normalizeTranslationMatrixBulkActionResponse(fixtures.actions.export_selected);
  assert.equal(exportPayload.data.action, 'export_selected');
  assert.equal(exportPayload.data.summary.export_ready, 2);
  assert.equal(exportPayload.data.results[0].exportable_locales[0], 'es');
  assert.equal(exportPayload.data.preview_rows.length, 3);
});

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Document = win.Document;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.HTMLFormElement = win.HTMLFormElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.KeyboardEvent = win.KeyboardEvent;
  globalThis.FormData = win.FormData;
  globalThis.URL = win.URL;
  globalThis.URLSearchParams = win.URLSearchParams;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true });
  Object.defineProperty(globalThis, 'location', { value: win.location, configurable: true });
}

function setupDom(url = 'http://localhost/admin/translations/matrix?environment=production&tenant_id=tenant-1&org_id=org-1') {
  const dom = new JSDOM('<!doctype html><html><body><div id="root" data-endpoint="/admin/api/translations/matrix" data-title="Translation Matrix"></div></body></html>', { url });
  setGlobals(dom.window);
  return {
    dom,
    root: dom.window.document.getElementById('root'),
  };
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function createJsonResponse(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        const key = String(name).toLowerCase();
        return headers[key] ?? headers[name] ?? null;
      },
    },
    async json() {
      return body;
    },
    clone() {
      return this;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

test('translation matrix runtime: mount renders filters, viewport controls, and dense grid', async () => {
  const { root } = setupDom();
  const page = initTranslationMatrixPage(root, {
    fetch: async () => createJsonResponse(fixtures.states.viewport, 200, {
      'content-type': 'application/json',
    }),
  });

  await flushAsync();

  assert.ok(page);
  assert.equal(page.getState(), 'ready');
  assert.match(root.innerHTML, /data-matrix-filters="true"/);
  assert.match(root.innerHTML, /data-matrix-grid="true"/);
  assert.match(root.innerHTML, /Create Missing/);
  assert.match(root.innerHTML, /Prev locales/);

  page.unmount();
});

test('translation matrix runtime: resolves breadcrumb base path from endpoint and uses shared neutral styling', async () => {
  const { root } = setupDom('http://localhost/workspace/admin/translations/matrix');
  root.dataset.endpoint = '/workspace/admin/api/translations/matrix';
  const page = initTranslationMatrixPage(root, {
    fetch: async () => createJsonResponse(fixtures.states.viewport, 200, {
      'content-type': 'application/json',
    }),
  });

  await flushAsync();

  assert.ok(page);
  assert.match(root.innerHTML, /href="\/workspace\/admin\/translations"/);
  assert.doesNotMatch(root.innerHTML, /slate-/);

  page.unmount();
});

test('translation matrix runtime: loading, empty, and error states render published affordances', async () => {
  {
    const { root } = setupDom();
    let release;
    const blocker = new Promise((resolve) => {
      release = resolve;
    });
    const page = initTranslationMatrixPage(root, {
      fetch: async () => {
        await blocker;
        return createJsonResponse(fixtures.states.viewport, 200, {
          'content-type': 'application/json',
        });
      },
    });
    assert.match(root.innerHTML, /data-matrix-loading="true"/);
    release();
    await flushAsync();
    await flushAsync();
    page.unmount();
  }

  {
    const { root } = setupDom();
    const page = initTranslationMatrixPage(root, {
      fetch: async () => createJsonResponse({
        ...fixtures.states.viewport,
        data: {
          ...fixtures.states.viewport.data,
          rows: [],
        },
        meta: {
          ...fixtures.states.viewport.meta,
          total: 0,
        },
      }, 200, {
        'content-type': 'application/json',
      }),
    });
    await flushAsync();
    assert.match(root.innerHTML, /data-matrix-empty="true"/);
    page.unmount();
  }

  {
    const { root } = setupDom();
    const page = initTranslationMatrixPage(root, {
      fetch: async () => createJsonResponse({ error: 'boom' }, 503, {
        'content-type': 'application/json',
        'x-request-id': 'req-matrix',
      }),
    });
    await flushAsync();
    assert.equal(page.getState(), 'error');
    assert.match(root.innerHTML, /data-matrix-error="true"/);
    assert.match(root.innerHTML, /Retry matrix/);
    page.unmount();
  }
});

test('translation matrix runtime: quick create action posts to create-missing endpoint and refreshes payload', async () => {
  const { root } = setupDom();
  const requests = [];
  let call = 0;
  const page = initTranslationMatrixPage(root, {
    fetch: async (url, options = {}) => {
      requests.push({ url: String(url), method: options.method ?? 'GET', body: options.body ? JSON.parse(String(options.body)) : null });
      call += 1;
      if (String(options.method || 'GET').toUpperCase() === 'POST') {
        return createJsonResponse(fixtures.actions.create_missing, 200, {
          'content-type': 'application/json',
        });
      }
      return createJsonResponse(call === 1 ? fixtures.states.viewport : fixtures.states.missing_cell, 200, {
        'content-type': 'application/json',
      });
    },
  });

  await flushAsync();

  const button = root.querySelector('[data-family-id="tg-page-matrix-1"][data-locale="fr"]');
  assert.ok(button);
  button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await flushAsync();
  await flushAsync();

  const postRequest = requests.find((entry) => entry.method === 'POST');
  assert.ok(postRequest);
  assert.equal(postRequest.url, '/admin/api/translations/matrix/actions/create-missing');
  assert.deepEqual(postRequest.body.family_ids, ['tg-page-matrix-1']);
  assert.deepEqual(postRequest.body.locales, ['fr']);

  page.unmount();
});

test('translation matrix runtime: keyboard arrows move focus between cell actions', async () => {
  const { root } = setupDom();
  const page = initTranslationMatrixPage(root, {
    fetch: async () => createJsonResponse(fixtures.states.viewport, 200, {
      'content-type': 'application/json',
    }),
  });

  await flushAsync();

  const first = root.querySelector('[data-row-index="0"][data-col-index="0"]');
  const next = root.querySelector('[data-row-index="0"][data-col-index="1"]');
  assert.ok(first);
  assert.ok(next);

  first.focus();
  first.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

  assert.equal(document.activeElement, next);

  page.unmount();
});

test('translation matrix runtime: performance smoke stays within a reasonable render budget', async () => {
  const { root } = setupDom();
  const largeFixture = JSON.parse(JSON.stringify(fixtures.states.viewport));
  largeFixture.data.rows = Array.from({ length: 80 }, (_, index) => ({
    ...largeFixture.data.rows[index % largeFixture.data.rows.length],
    family_id: `tg-perf-${index}`,
    source_title: `Perf ${index}`,
  }));
  const startedAt = performance.now();
  const page = initTranslationMatrixPage(root, {
    fetch: async () => createJsonResponse(largeFixture, 200, {
      'content-type': 'application/json',
    }),
  });
  await flushAsync();
  const duration = performance.now() - startedAt;

  assert.ok(duration < 1500, `expected matrix render under 1500ms, got ${duration}`);
  assert.match(root.innerHTML, /tg-perf-79/);

  page.unmount();
});
