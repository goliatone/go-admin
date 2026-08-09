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
const { DataGrid, FilterBuilder, paginationWindow } = await importDatatableModule();

test('paginationWindow preserves boundaries and marks skipped ranges', () => {
  assert.deepEqual(paginationWindow(0, 1), []);
  assert.deepEqual(paginationWindow(1, 1), [1]);
  assert.deepEqual(paginationWindow(6, 3), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(paginationWindow(20, 1), [1, 2, 3, 4, 5, 'ellipsis', 20]);
  assert.deepEqual(paginationWindow(20, 10), [1, 'ellipsis', 9, 10, 11, 'ellipsis', 20]);
  assert.deepEqual(paginationWindow(20, 20), [1, 'ellipsis', 16, 17, 18, 19, 20]);
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
