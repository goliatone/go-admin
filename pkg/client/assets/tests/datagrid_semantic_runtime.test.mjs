import test from 'node:test';
import assert from 'node:assert/strict';
import { importDatatableModule } from './helpers/load-datatable-dist.mjs';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const { DataGrid } = await importDatatableModule();

function installDOM() {
  const dom = new JSDOM(`
    <main>
      <section data-datagrid-toolbar>
        <input id="table-search" type="search">
        <div id="filter-panel" data-datagrid-filter-panel></div>
      </section>
      <section data-datagrid-surface>
        <table id="documents-datatable">
          <thead>
            <tr>
              <th data-role="selection"><input id="table-checkbox-all" type="checkbox"></th>
              <th data-column="title">Title</th>
              <th data-role="actions">Actions</th>
            </tr>
            <tr>
              <th></th>
              <th><input data-filter-column="title"></th>
              <th data-role="actions"></th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </section>
      <footer data-datagrid-pagination>
        <p>
          Showing <span id="table-info-start">0</span> to
          <span id="table-info-end">0</span> of
          <span id="table-info-total">0</span>
        </p>
        <nav id="table-pagination"></nav>
        <select id="table-per-page"><option value="10">10</option></select>
      </footer>
    </main>
  `, { url: 'http://localhost/admin/content/documents' });

  const previous = {};
  for (const key of [
    'window',
    'document',
    'HTMLElement',
    'HTMLInputElement',
    'Event',
    'MouseEvent',
    'CustomEvent',
    'Node',
    'localStorage',
    'location',
    'history',
    'AbortController',
  ]) {
    previous[key] = globalThis[key];
  }

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.HTMLInputElement = dom.window.HTMLInputElement;
  globalThis.Event = dom.window.Event;
  globalThis.MouseEvent = dom.window.MouseEvent;
  globalThis.CustomEvent = dom.window.CustomEvent;
  globalThis.Node = dom.window.Node;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.location = dom.window.location;
  globalThis.history = dom.window.history;
  globalThis.AbortController = dom.window.AbortController;

  return {
    dom,
    cleanup() {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete globalThis[key];
        } else {
          globalThis[key] = value;
        }
      }
      dom.window.close();
    },
  };
}

function createGrid(
  notifier = { error() {}, success() {}, async confirm() { return true; } },
  overrides = {},
) {
  return new DataGrid({
    tableId: 'documents-datatable',
    apiEndpoint: '/admin/api/panels/articles',
    columns: [{ field: 'title', label: 'Title' }],
    notifier,
    ...overrides,
  });
}

function response(records) {
  return new Response(JSON.stringify({ records, total: records.length }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

async function wait(ms = 0) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

test('DataGrid adopts semantic structure, renders loading, and delegates selection once', async () => {
  const { dom, cleanup } = installDOM();
  const originalFetch = globalThis.fetch;
  let releaseFetch;
  const fetchReleased = new Promise((resolve) => {
    releaseFetch = resolve;
  });
  globalThis.fetch = async () => {
    await fetchReleased;
    return response([{ id: 'article_1', title: 'Contract' }]);
  };

  try {
    const grid = createGrid();
    grid.init();
    await wait(0);

    const table = dom.window.document.querySelector('#documents-datatable');
    assert.equal(table.closest('[data-datagrid-surface]').classList.contains('admin-datagrid'), true);
    assert.equal(table.classList.contains('admin-datagrid__table'), true);
    assert.equal(table.querySelector('thead').classList.contains('admin-datagrid__header'), true);
    assert.equal(table.querySelector('tbody').classList.contains('admin-datagrid__body'), true);
    assert.equal(dom.window.document.querySelector('[data-datagrid-toolbar]').classList.contains('admin-datagrid__toolbar'), true);
    assert.equal(dom.window.document.querySelector('[data-datagrid-filter-panel]').classList.contains('admin-surface-card'), true);
    assert.equal(dom.window.document.querySelector('[data-datagrid-pagination]').classList.contains('admin-datagrid__pagination'), true);
    assert.equal(dom.window.document.querySelector('#table-info-start').parentElement.classList.contains('admin-datagrid__pagination-text'), true);
    assert.equal(table.dataset.state, 'loading');
    assert.equal(table.getAttribute('aria-busy'), 'true');
    assert.match(table.querySelector('[data-datagrid-state="loading"]')?.textContent || '', /Loading/);
    assert.equal(table.querySelector('[data-datagrid-state="loading"] [role="status"]') !== null, true);

    releaseFetch();
    await wait(20);

    assert.equal(table.dataset.state, 'ready');
    assert.equal(table.getAttribute('aria-busy'), 'false');
    assert.equal(table.querySelector('[data-datagrid-state="loading"]'), null);

    let selectionUpdates = 0;
    grid.updateBulkActionsBar = () => {
      selectionUpdates += 1;
    };
    grid.updateSelectionBindings();
    grid.updateSelectionBindings();

    const checkbox = table.querySelector('.table-checkbox');
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    assert.equal(selectionUpdates, 1);
    assert.equal(checkbox.closest('tr').dataset.selected, 'true');
    assert.equal(checkbox.closest('tr').getAttribute('aria-selected'), 'true');

    grid.destroy();
    checkbox.checked = false;
    checkbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    assert.equal(selectionUpdates, 1, 'destroy must remove the delegated selection listener');
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test('DataGrid treats disabled list capabilities as authoritative', async () => {
  const { dom, cleanup } = installDOM();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => response([{ id: 'article_1', title: 'Contract', status: 'draft' }]);

  try {
    dom.window.document.body.insertAdjacentHTML(
      'beforeend',
      [
        '<button id="other-toggle" data-dropdown-toggle="other-menu">Options</button>',
        '<div id="other-menu" class="hidden">Other options</div>',
        '<button id="export-btn" data-dropdown-toggle="export-menu">Export</button>',
        '<div id="export-menu"><button data-export-format="csv">CSV</button></div>',
      ].join(''),
    );
    let exportCalls = 0;
    const grid = createGrid(undefined, {
      capabilities: { selection: false, bulk: false, export: false },
      columns: [
        { field: 'title', label: 'Title' },
        { field: 'status', label: 'Status' },
      ],
      behaviors: {
        export: {
          async export() {
            exportCalls += 1;
          },
        },
      },
    });
    let bulkUpdates = 0;
    grid.updateBulkActionsBar = () => {
      bulkUpdates += 1;
    };

    grid.init();
    await wait(20);

    const otherToggle = dom.window.document.querySelector('#other-toggle');
    const otherMenu = dom.window.document.querySelector('#other-menu');
    otherToggle.click();
    assert.equal(otherMenu.classList.contains('hidden'), false, 'non-export dropdowns must remain interactive');
    otherToggle.click();
    assert.equal(otherMenu.classList.contains('hidden'), true);

    const exportToggle = dom.window.document.querySelector('#export-btn');
    const exportMenu = dom.window.document.querySelector('#export-menu');
    assert.equal(exportMenu.classList.contains('hidden'), true, 'dropdown initialization must hide the export menu');
    exportToggle.click();
    assert.equal(exportMenu.classList.contains('hidden'), true, 'disabled export trigger must remain inert');

    const table = dom.window.document.querySelector('#documents-datatable');
    assert.equal(table.querySelector('tbody .table-checkbox'), null);
    grid.reorderColumns(['status', 'title']);
    assert.deepEqual(
      [...table.querySelectorAll('tbody tr:first-child td')].map((cell) => (
        cell.dataset.column || cell.dataset.role
      )),
      ['status', 'title', 'actions'],
      'fixed-column reordering must tolerate an omitted selection cell',
    );

    const updatesBeforeChange = bulkUpdates;
    const staleHeaderCheckbox = table.querySelector('#table-checkbox-all');
    staleHeaderCheckbox.checked = true;
    staleHeaderCheckbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    assert.equal(
      bulkUpdates,
      updatesBeforeChange,
      'selection listeners must not bind when selection is disabled',
    );
    dom.window.document.querySelector('[data-export-format="csv"]').click();
    await wait(0);
    assert.equal(exportCalls, 0, 'export handlers must not bind when export is disabled');

    grid.destroy();
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test('DataGrid normalizes selection from bulk and export capability ownership', () => {
  const { cleanup } = installDOM();
  try {
    const grid = createGrid(undefined, {
      capabilities: { selection: false, bulk: false, export: true },
    });
    assert.deepEqual(grid.config.capabilities, {
      selection: true,
      bulk: false,
      export: true,
    });
    grid.destroy();
  } finally {
    cleanup();
  }
});

test('DataGrid uses capability-aware structural colspans in flat and grouped empty states', async () => {
  for (const grouped of [false, true]) {
    const { dom, cleanup } = installDOM();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => response([]);

    try {
      const grid = createGrid(undefined, {
        capabilities: { selection: false, bulk: false, export: false },
        enableGroupedMode: grouped,
        defaultViewMode: grouped ? 'grouped' : 'flat',
      });
      grid.init();
      await wait(20);

      const stateCell = dom.window.document.querySelector(
        '#documents-datatable [data-datagrid-state="empty"] td',
      );
      assert.equal(stateCell?.getAttribute('colspan'), '2');
      grid.destroy();
    } finally {
      globalThis.fetch = originalFetch;
      cleanup();
    }
  }
});

test('DataGrid omits action structure when default and custom row actions are absent', async () => {
  const { dom, cleanup } = installDOM();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => response([{ id: 'article_1', title: 'Contract' }]);

  try {
    const grid = createGrid(undefined, {
      capabilities: { selection: false, bulk: false, export: false },
      useDefaultActions: false,
    });
    grid.init();
    await wait(20);

    const table = dom.window.document.querySelector('#documents-datatable');
    assert.equal(table.querySelectorAll('thead [data-role="actions"]').length, 0);
    assert.deepEqual(
      [...table.querySelectorAll('tbody tr:first-child td')].map((cell) => (
        cell.dataset.column || cell.dataset.role
      )),
      ['title'],
    );
    grid.destroy();
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test('DataGrid excludes an omitted action column from flat and grouped empty-state colspans', async () => {
  for (const grouped of [false, true]) {
    const { dom, cleanup } = installDOM();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => response([]);

    try {
      const grid = createGrid(undefined, {
        capabilities: { selection: false, bulk: false, export: false },
        enableGroupedMode: grouped,
        defaultViewMode: grouped ? 'grouped' : 'flat',
        useDefaultActions: false,
      });
      grid.init();
      await wait(20);

      const stateCell = dom.window.document.querySelector(
        '#documents-datatable [data-datagrid-state="empty"] td',
      );
      assert.equal(stateCell?.getAttribute('colspan'), '1');
      grid.destroy();
    } finally {
      globalThis.fetch = originalFetch;
      cleanup();
    }
  }
});

test('DataGrid uses one fixed-column contract for populated grouped headers and rows', async () => {
  const cases = [
    {
      name: 'actionless',
      overrides: {
        capabilities: { selection: false, bulk: false, export: false },
        useDefaultActions: false,
      },
      expectedCells: ['title'],
    },
    {
      name: 'custom actions',
      overrides: {
        capabilities: { selection: false, bulk: false, export: false },
        useDefaultActions: false,
        rowActions: () => [],
      },
      expectedCells: ['title', 'actions'],
    },
    {
      name: 'legacy defaults',
      overrides: {},
      expectedCells: ['selection', 'title', 'actions'],
    },
  ];

  for (const testCase of cases) {
    const { dom, cleanup } = installDOM();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => response([{
      family_id: 'family_1',
      group_by: 'family_id',
      records: [{ id: 'article_1', title: 'Contract', family_id: 'family_1' }],
    }]);

    try {
      const grid = createGrid(undefined, {
        enableGroupedMode: true,
        defaultViewMode: 'grouped',
        ...testCase.overrides,
      });
      grid.init();
      await wait(20);

      const table = dom.window.document.querySelector('#documents-datatable');
      const groupHeaderCell = table.querySelector('.group-header td');
      const renderedCells = [...table.querySelectorAll('tbody .group-child-row td')].map((cell) => (
        cell.dataset.column || cell.dataset.role
      ));
      assert.equal(groupHeaderCell?.getAttribute('colspan'), String(testCase.expectedCells.length), testCase.name);
      assert.deepEqual(renderedCells, testCase.expectedCells, testCase.name);
      grid.destroy();
    } finally {
      globalThis.fetch = originalFetch;
      cleanup();
    }
  }
});

test('DataGrid reports render lifecycle states after state content is available', async () => {
  const { dom, cleanup } = installDOM();
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  globalThis.fetch = async () => response([]);
  const transitions = [];
  console.error = () => {};

  try {
    const grid = createGrid(undefined, {
      capabilities: { selection: false, bulk: false, export: false },
      useDefaultActions: false,
      onStateChange(state) {
        const table = dom.window.document.querySelector('#documents-datatable');
        transitions.push({
          state,
          tableState: table?.dataset.state,
          stateRow: table?.querySelector(`[data-datagrid-state="${state}"]`)?.textContent?.trim() || '',
        });
        if (state === 'loading') throw new Error('consumer callback failure');
      },
    });
    grid.init();
    await wait(20);

    assert.deepEqual(transitions.map(({ state }) => state), ['loading', 'empty']);
    assert.equal(transitions[0].tableState, 'loading');
    assert.equal(transitions[1].tableState, 'empty');
    assert.match(transitions[1].stateRow, /No results found/);
    grid.destroy();
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    cleanup();
  }
});

test('DataGrid reports loading while retaining stale rows during refresh', async () => {
  const { dom, cleanup } = installDOM();
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  let releaseRefresh;
  const refreshReleased = new Promise((resolve) => {
    releaseRefresh = resolve;
  });
  globalThis.fetch = async () => {
    requestCount += 1;
    if (requestCount === 1) return response([{ id: 'article_1', title: 'Existing contract' }]);
    await refreshReleased;
    return response([{ id: 'article_1', title: 'Updated contract' }]);
  };
  const transitions = [];

  try {
    const grid = createGrid(undefined, {
      onStateChange(state) {
        transitions.push(state);
      },
    });
    grid.init();
    await wait(20);

    const table = dom.window.document.querySelector('#documents-datatable');
    const refreshPromise = grid.refresh();
    await wait(0);
    assert.equal(table.dataset.state, 'loading');
    assert.equal(table.querySelectorAll('.admin-datagrid__row').length, 1);
    assert.deepEqual(transitions, ['loading', 'ready', 'loading']);

    releaseRefresh();
    await refreshPromise;
    assert.equal(table.dataset.state, 'ready');
    assert.deepEqual(transitions, ['loading', 'ready', 'loading', 'ready']);
    grid.destroy();
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test('DataGrid retains action structure for a custom row-action provider', async () => {
  const { dom, cleanup } = installDOM();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => response([{ id: 'article_1', title: 'Contract' }]);

  try {
    const grid = createGrid(undefined, {
      capabilities: { selection: false, bulk: false, export: false },
      useDefaultActions: false,
      rowActions: () => [],
    });
    grid.init();
    await wait(20);

    const table = dom.window.document.querySelector('#documents-datatable');
    assert.equal(table.querySelectorAll('thead [data-role="actions"]').length, 2);
    assert.deepEqual(
      [...table.querySelectorAll('tbody tr:first-child td')].map((cell) => (
        cell.dataset.column || cell.dataset.role
      )),
      ['title', 'actions'],
    );
    grid.destroy();
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test('DataGrid renders an accessible error row without discarding stale records', async () => {
  const { dom, cleanup } = installDOM();
  const originalFetch = globalThis.fetch;
  const errors = [];
  const errorTransitions = [];
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    if (requestCount === 1) {
      return response([{ id: 'article_1', title: 'Existing contract' }]);
    }
    return new Response('unavailable', { status: 503 });
  };

  try {
    const grid = createGrid(
      {
        error(message) {
          errors.push(message);
        },
        success() {},
        async confirm() {
          return true;
        },
      },
      {
        onStateChange(state) {
          if (state === 'error') {
            errorTransitions.push(
              dom.window.document.querySelector('[data-datagrid-state="error"]')?.textContent?.trim() || '',
            );
          }
        },
      },
    );
    grid.init();
    await wait(20);

    const table = dom.window.document.querySelector('#documents-datatable');
    assert.equal(table.querySelectorAll('.admin-datagrid__row').length, 1);

    await grid.refresh();

    assert.equal(table.dataset.state, 'error');
    assert.equal(table.getAttribute('aria-busy'), 'false');
    assert.equal(table.querySelectorAll('.admin-datagrid__row').length, 1);
    const errorState = table.querySelector('[data-datagrid-state="error"]');
    assert.match(errorState?.textContent || '', /Failed to load data/);
    assert.equal(errorState?.querySelector('[role="alert"]') !== null, true);
    assert.deepEqual(errors, ['Failed to load data']);
    assert.deepEqual(errorTransitions, ['Failed to load data']);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test('DataGrid connects grouped loading presentation to the core refresh lifecycle', async () => {
  const { dom, cleanup } = installDOM();
  const originalFetch = globalThis.fetch;
  let releaseFetch;
  const fetchReleased = new Promise((resolve) => {
    releaseFetch = resolve;
  });
  globalThis.fetch = async () => {
    await fetchReleased;
    return response([]);
  };

  try {
    const grid = createGrid(undefined, {
      enableGroupedMode: true,
      defaultViewMode: 'grouped',
    });
    grid.init();
    await wait(0);

    const table = dom.window.document.querySelector('#documents-datatable');
    const loadingState = table.querySelector('[data-datagrid-state="loading"]');
    assert.match(loadingState?.textContent || '', /Loading groups/);
    assert.equal(loadingState?.querySelector('[role="status"][aria-live="polite"]') !== null, true);

    releaseFetch();
    await wait(20);

    assert.equal(table.dataset.state, 'empty');
    assert.equal(table.querySelector('[data-datagrid-state="loading"]'), null);
    assert.equal(table.querySelector('[data-datagrid-state="empty"]') !== null, true);
    grid.destroy();
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
