import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importDatatableModule } from './helpers/load-datatable-dist.mjs';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const { DataGrid } = await importDatatableModule();

async function loadFixture() {
  const fixtureURL = new URL('./fixtures/bulk_action_contracts/canonical_bulk_contracts.json', import.meta.url);
  return JSON.parse(await readFile(fixtureURL, 'utf8'));
}

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.Response = win.Response || globalThis.Response;
  globalThis.AbortController = win.AbortController || globalThis.AbortController;
  globalThis.localStorage = win.localStorage;
}

function setupDOM() {
  const dom = new JSDOM(`
    <div>
      <table id="documents-datatable">
        <thead>
          <tr>
            <th data-role="selection" data-fixed="left">
              <input id="table-checkbox-all" type="checkbox">
            </th>
            <th data-column="title">Title</th>
            <th data-column="status">Status</th>
            <th data-role="actions" data-fixed="right">Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
      <div id="bulk-actions-overlay" class="hidden" data-bulk-base="/admin/api/panels/documents/bulk">
        <button id="bulk-clear-selection" type="button">Clear</button>
        <span id="selected-count">0</span>
        <button data-bulk-action="delete" type="button">Delete</button>
      </div>
    </div>
  `, { url: 'http://localhost/admin/content/documents' });
  setGlobals(dom.window);
  return dom;
}

function buildListPayload(fixture) {
  return {
    records: [
      { id: 'doc_1', title: 'Protected Document', status: 'in_use' },
      { id: 'doc_2', title: 'Reusable Document', status: 'ready' },
    ],
    schema: fixture.list_contract.schema,
    $meta: fixture.list_contract.$meta,
  };
}

function createGrid(notifier) {
  return new DataGrid({
    tableId: 'documents-datatable',
    apiEndpoint: '/admin/api/panels/documents',
    columns: [
      { field: 'title', label: 'Title' },
      { field: 'status', label: 'Status' },
    ],
    notifier,
  });
}

async function wait(ms = 0) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

test('Phase 7 fixture: datagrid debounces selection-sensitive bulk state and shows disabled reasons', async () => {
  const fixture = await loadFixture();
  const dom = setupDOM();
  const originalFetch = globalThis.fetch;
  const requests = [];

  globalThis.fetch = async (url, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    requests.push({ method, url: String(url), body: init.body ? JSON.parse(String(init.body)) : null });
    if (method === 'GET') {
      return new Response(JSON.stringify(buildListPayload(fixture)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(fixture.selection_contracts.mixed_selection), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const notifier = {
      async confirm() { return true; },
      success() {},
      error() {},
    };
    const grid = createGrid(notifier);
    grid.init();
    await wait(20);

    const checkboxes = dom.window.document.querySelectorAll('.table-checkbox');
    assert.equal(checkboxes.length, 2);

    checkboxes.forEach((checkbox) => {
      checkbox.checked = true;
      checkbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    });

    await wait(320);

    const stateRequest = requests.find((entry) => entry.method === 'POST' && entry.url.includes('/bulk-actions/state'));
    assert.ok(stateRequest, 'expected selection-sensitive bulk state request');
    assert.deepEqual(stateRequest.body.ids.sort(), ['doc_1', 'doc_2']);

    const deleteButton = dom.window.document.querySelector('[data-bulk-action="delete"]');
    const reasonContainer = dom.window.document.querySelector('[data-bulk-action-state-reasons]');

    assert.equal(deleteButton?.getAttribute('aria-disabled'), 'true');
    assert.equal(deleteButton?.getAttribute('title'), fixture.selection_contracts.mixed_selection.bulk_action_state.delete.reason);
    assert.match(reasonContainer?.textContent || '', /Some selected records cannot be deleted\./i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Phase 7 fixture: bulk failures surface structured invalid-selection copy and reconcile disabled state after refresh', async () => {
  const fixture = await loadFixture();
  const dom = setupDOM();
  const originalFetch = globalThis.fetch;
  const notifier = {
    errors: [],
    async confirm() { return true; },
    success() {},
    error(message) { this.errors.push(String(message)); },
  };

  let stateRequestCount = 0;
  globalThis.fetch = async (url, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const path = String(url);
    if (method === 'GET') {
      return new Response(JSON.stringify(buildListPayload(fixture)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (path.includes('/bulk-actions/state')) {
      stateRequestCount += 1;
      const payload = stateRequestCount === 1
        ? {
            bulk_action_state: {
              delete: {
                enabled: true,
                permission: 'documents.delete',
              },
            },
            selection: { count: 2 },
          }
        : fixture.selection_contracts.mixed_selection;
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(fixture.execution_failure), {
      status: fixture.execution_failure.status,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const grid = createGrid(notifier);
    grid.init();
    await wait(20);

    const checkboxes = dom.window.document.querySelectorAll('.table-checkbox');
    checkboxes.forEach((checkbox) => {
      checkbox.checked = true;
      checkbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    });

    await wait(320);

    const deleteButton = dom.window.document.querySelector('[data-bulk-action="delete"]');
    deleteButton?.setAttribute('aria-disabled', 'false');
    deleteButton?.setAttribute('data-disabled', 'false');
    deleteButton?.removeAttribute('title');

    deleteButton?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await wait(20);
    await wait(320);

    assert.ok(
      notifier.errors.some((message) => message.includes('INVALID_SELECTION: Some selected records cannot be deleted.')),
      `expected invalid-selection toast, got ${notifier.errors.join(' | ')}`
    );
    assert.equal(deleteButton?.getAttribute('aria-disabled'), 'true');
    assert.equal(deleteButton?.getAttribute('title'), fixture.selection_contracts.mixed_selection.bulk_action_state.delete.reason);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
