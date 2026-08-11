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
const {
  DataGrid,
  FilterBuilder,
  formatPaginationNumber,
  paginationWindow,
  renderPaginationButtons,
} = await importDatatableModule();

test('paginationWindow preserves boundaries and marks skipped ranges', () => {
  assert.deepEqual(paginationWindow(0, 1), []);
  assert.deepEqual(paginationWindow(1, 1), [1]);
  assert.deepEqual(paginationWindow(6, 3), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(paginationWindow(20, 1), [1, 2, 3, 4, 5, 'ellipsis', 20]);
  assert.deepEqual(paginationWindow(20, 10), [1, 'ellipsis', 9, 10, 11, 'ellipsis', 20]);
  assert.deepEqual(paginationWindow(20, 20), [1, 'ellipsis', 16, 17, 18, 19, 20]);
});

test('DataGrid pagination uses stable classes, localized labels, formatted numbers, and the exact ellipsis asset', () => {
  const dom = new JSDOM('<nav id="table-pagination"></nav>', { url: 'http://localhost/admin/customers' });
  const previous = {};
  for (const key of ['window', 'document', 'HTMLElement', 'Event']) {
    previous[key] = globalThis[key];
    globalThis[key] = dom.window[key];
  }
  const grid = {
    selectors: { paginationContainer: '#table-pagination' },
    state: { currentPage: 10, perPage: 10 },
    config: {
      pagination: {
        mode: 'semantic',
        locale: 'de-DE',
        labels: {
          previous: 'Zurück',
          next: 'Weiter',
          previousPage: 'Vorherige Seite',
          nextPage: 'Nächste Seite',
          page: 'Seite {page}',
        },
      },
    },
    pushStateToURL() {},
    async refresh() {},
  };

  try {
    assert.equal(formatPaginationNumber(grid, 12345), '12.345');
    renderPaginationButtons(grid, 200);
    const container = dom.window.document.getElementById('table-pagination');
    const previousButton = container.querySelector('[data-page="9"]');
    const active = container.querySelector('[aria-current="page"]');
    const nextButton = container.querySelector('[data-page="11"]:last-of-type');
    const ellipsis = container.querySelector('.admin-datagrid__page-ellipsis');

    assert.equal(previousButton.textContent.trim(), 'Zurück');
    assert.equal(previousButton.getAttribute('aria-label'), 'Vorherige Seite');
    assert.equal(nextButton.textContent.trim(), 'Weiter');
    assert.equal(nextButton.getAttribute('aria-label'), 'Nächste Seite');
    assert.equal(active.textContent.trim(), '10');
    assert.equal(active.getAttribute('aria-label'), 'Seite 10');
    assert.equal(active.classList.contains('admin-datagrid__page-button--active'), true);
    assert.ok(ellipsis.querySelector('svg'));
    assert.match(ellipsis.innerHTML, /M11\.6667 1\.16667C11\.6667 1\.811/);
    assert.equal(container.querySelector('path[d="m15 18-6-6 6-6"]'), null);
    assert.equal(container.querySelector('path[d="m9 18 6-6-6-6"]'), null);
    assert.doesNotMatch(container.innerHTML, /min-h-|text-gray-|rounded-lg/);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
    dom.window.close();
  }
});

test('DataGrid pagination preserves the historical renderer when semantic mode is absent', () => {
  const dom = new JSDOM('<footer data-datagrid-pagination><nav id="table-pagination"></nav></footer>');
  const previous = {};
  for (const key of ['window', 'document', 'HTMLElement', 'Event']) {
    previous[key] = globalThis[key];
    globalThis[key] = dom.window[key];
  }
  const grid = {
    selectors: { paginationContainer: '#table-pagination' },
    state: { currentPage: 1, perPage: 10 },
    config: {},
    pushStateToURL() {},
    async refresh() {},
  };

  try {
    renderPaginationButtons(grid, 200);
    const pagination = dom.window.document.querySelector('[data-datagrid-pagination]');
    const container = dom.window.document.getElementById('table-pagination');
    assert.equal(pagination.classList.contains('admin-datagrid__pagination--presented'), false);
    assert.ok(container.querySelector('path[d="m15 18-6-6 6-6"]'));
    assert.ok(container.querySelector('path[d="m9 18 6-6-6-6"]'));
    assert.match(container.innerHTML, /min-h-\[38px\]/);
    assert.match(container.innerHTML, /hover:bg-gray-100/);
    assert.equal(container.querySelector('.admin-datagrid__page-ellipsis')?.textContent, '…');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
    dom.window.close();
  }
});

test('semantic pagination safely resolves hostile labels and invalid locales', () => {
  const dom = new JSDOM('<footer data-datagrid-pagination><nav id="table-pagination"></nav></footer>');
  const previous = {};
  for (const key of ['window', 'document', 'HTMLElement', 'Event']) {
    previous[key] = globalThis[key];
    globalThis[key] = dom.window[key];
  }
  const grid = {
    selectors: { paginationContainer: '#table-pagination' },
    state: { currentPage: 1, perPage: 10 },
    config: {
      pagination: {
        mode: 'semantic',
        locale: 'not_a_locale',
        labels: {
          previous: '   ',
          next: 42,
          previousPage: {},
          nextPage: null,
          page: { includes() { throw new Error('must not be called'); } },
        },
      },
    },
    pushStateToURL() {},
    async refresh() {},
  };

  try {
    assert.doesNotThrow(() => renderPaginationButtons(grid, 20));
    const container = dom.window.document.getElementById('table-pagination');
    assert.equal(container.querySelector('[data-page="0"]').textContent.trim(), 'Previous');
    assert.equal(container.querySelector('[data-page="0"]').getAttribute('aria-label'), 'Previous page');
    assert.equal(container.querySelector('[data-page="2"]:last-of-type').textContent.trim(), 'Next');
    assert.equal(container.querySelector('[aria-current="page"]').getAttribute('aria-label'), 'Page 1');
    assert.equal(formatPaginationNumber(grid, 12345), '12345');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
    dom.window.close();
  }
});

test('semantic pagination formats complete plural-aware summaries for zero, one, and many rows', () => {
  const dom = new JSDOM(`
    <span id="table-info-start"></span>
    <span id="table-info-end"></span>
    <span id="table-info-total"></span>
    <p id="table-info-summary"></p>
    <nav id="table-pagination"></nav>
  `);
  const previous = {};
  for (const key of ['window', 'document', 'HTMLElement', 'Event']) {
    previous[key] = globalThis[key];
    globalThis[key] = dom.window[key];
  }
  const grid = new DataGrid({
    tableId: 'missing-table',
    apiEndpoint: '/records',
    columns: [],
    perPage: 10,
    pagination: {
      mode: 'semantic',
      locale: 'de-DE',
      labels: {
        summary: {
          one: '{total} Datensatz; Bereich {start}–{end}',
          other: '{total} Datensätze; Bereich {start}–{end}',
        },
      },
    },
  });

  try {
    for (const [total, expected] of [
      [0, '0 Datensätze; Bereich 0–0'],
      [1, '1 Datensatz; Bereich 1–1'],
      [12345, '12.345 Datensätze; Bereich 1–10'],
    ]) {
      grid.state.currentPage = 1;
      grid.updatePaginationUI({ records: [], total });
      assert.equal(dom.window.document.getElementById('table-info-summary').textContent, expected);
    }
  } finally {
    grid.destroy();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
    dom.window.close();
  }
});

test('FilterBuilder stays inside the visual viewport and restores focus', () => {
  const dom = new JSDOM(`
    <button id="filter-toggle-btn" type="button" aria-expanded="false">Filters</button>
    <div id="filter-panel" class="hidden"></div>
    <div id="filter-overlay" class="hidden"></div>
  `, { url: 'http://localhost/admin/customers' });
  const previous = {};
  for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'Event', 'KeyboardEvent', 'localStorage', 'location']) {
    previous[key] = globalThis[key];
    globalThis[key] = dom.window[key];
  }
  const toggle = dom.window.document.getElementById('filter-toggle-btn');
  const panel = dom.window.document.getElementById('filter-panel');
  Object.defineProperty(dom.window, 'visualViewport', { configurable: true, value: { offsetLeft: 20, offsetTop: 10, width: 360, height: 640 } });
  toggle.getBoundingClientRect = () => ({ left: 340, right: 380, top: 40, bottom: 76, width: 40, height: 36 });
  panel.getBoundingClientRect = () => ({ left: 0, right: 800, top: 0, bottom: 500, width: 800, height: 500 });

  try {
    new FilterBuilder({ fields: [{ name: 'name', label: 'Name', type: 'text' }], onApply() {}, onClear() {} });
    toggle.click();
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(panel.classList.contains('hidden'), false);
    assert.equal(panel.style.left, '28px');
    assert.equal(panel.style.maxWidth, '344px');
    assert.ok(Number.parseFloat(panel.style.top) >= 18);
    assert.ok(Number.parseFloat(panel.style.top) + Number.parseFloat(panel.style.maxHeight) <= 642);

    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(panel.classList.contains('hidden'), true);
    assert.equal(dom.window.document.activeElement, toggle);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
    dom.window.close();
  }
});

test('DataGrid generic dropdowns keep expanded state and focus truthful', () => {
  const dom = new JSDOM(`
    <button id="column-toggle-btn" type="button" data-dropdown-toggle="column-toggle-menu" aria-expanded="false">Columns</button>
    <div id="column-toggle-menu" class="hidden"><button type="button" role="option">Name</button></div>
    <table id="records-grid"><thead><tr><th>Name</th></tr></thead><tbody></tbody></table>
  `, { url: 'http://localhost/admin/customers' });
  const previous = {};
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Event', 'KeyboardEvent', 'MouseEvent', 'AbortController']) {
    previous[key] = globalThis[key];
    globalThis[key] = dom.window[key];
  }

  try {
    const grid = new DataGrid({ tableId: 'records-grid', columns: [{ field: 'name', label: 'Name' }] });
    grid.tableEl = dom.window.document.getElementById('records-grid');
    grid.bindDropdownToggles();
    const toggle = dom.window.document.getElementById('column-toggle-btn');
    const menu = dom.window.document.getElementById('column-toggle-menu');
    const option = menu.querySelector('[role="option"]');

    toggle.click();
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(menu.classList.contains('hidden'), false);
    assert.equal(dom.window.document.activeElement, option);

    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(menu.classList.contains('hidden'), true);
    assert.equal(dom.window.document.activeElement, toggle);
    grid.destroy();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
    dom.window.close();
  }
});
