import test from 'node:test';
import assert from 'node:assert/strict';
import { importDatatableModule } from './helpers/load-datatable-dist.mjs';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (_error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const { DataGrid } = await importDatatableModule();

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.KeyboardEvent = win.KeyboardEvent;
  globalThis.AbortController = win.AbortController;
}

function createDom(tableIds = ['records-grid']) {
  const tables = tableIds.map((id) => `<table id="${id}"><tbody></tbody></table>`).join('');
  const dom = new JSDOM(`<!doctype html><html><body>${tables}</body></html>`, {
    url: 'http://localhost/admin/content/pages',
  });
  setGlobals(dom.window);
  return dom;
}

function createGrid(tableId, config = {}) {
  return new DataGrid({
    tableId,
    apiEndpoint: '/admin/api/records',
    columns: [],
    ...config,
  });
}

test('DataGrid createTableRow escapes hostile record IDs and emits globally unique ARIA IDs', () => {
  const dom = createDom(['grid-a', 'grid-b']);
  const hostileID = 'row" autofocus onfocus="globalThis.injected=true';
  const actions = [
    {
      id: 'publish.draft',
      label: 'Publish',
      disabled: true,
      disabledReason: 'Draft publishing is unavailable.',
      action: () => {},
    },
    {
      id: 'publish-draft',
      label: 'Publish',
      disabled: true,
      disabledReason: 'Live publishing is unavailable.',
      action: () => {},
    },
  ];
  const gridA = createGrid('grid-a', { rowActions: () => actions });
  const gridB = createGrid('grid-b', { rowActions: () => actions });
  const rowA = gridA.createTableRow({ id: hostileID });
  const rowB = gridB.createTableRow({ id: hostileID });
  dom.window.document.querySelector('#grid-a tbody').appendChild(rowA);
  dom.window.document.querySelector('#grid-b tbody').appendChild(rowB);

  assert.equal(dom.window.document.querySelector('[autofocus], [onfocus]'), null);
  assert.equal(rowA.querySelector('.table-checkbox').dataset.id, hostileID);
  rowA.querySelectorAll('[data-record-id]').forEach((element) => {
    assert.equal(element.dataset.recordId, hostileID);
  });

  const ids = Array.from(dom.window.document.querySelectorAll('[id]'), (element) => element.id)
    .filter((id) => id !== 'grid-a' && id !== 'grid-b');
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.every((id) => /^[a-z0-9-]+$/.test(id)), true);

  dom.window.document.querySelectorAll('[aria-controls]').forEach((trigger) => {
    const controlledID = trigger.getAttribute('aria-controls');
    assert.equal(dom.window.document.querySelectorAll(`[id="${controlledID}"]`).length, 1);
  });
  dom.window.document.querySelectorAll('[aria-describedby]').forEach((item) => {
    const reasonID = item.getAttribute('aria-describedby');
    assert.equal(dom.window.document.querySelectorAll(`[id="${reasonID}"]`).length, 1);
  });
});

test('DataGrid createTableRow binds duplicate labels and sanitized-ID collisions to exact actions', async () => {
  createDom();
  const calls = [];
  const actions = [
    { id: 'publish.draft', label: 'Publish', action: () => calls.push('draft') },
    { id: 'publish-draft', label: 'Publish', action: () => calls.push('live') },
  ];
  const grid = createGrid('records-grid', { rowActions: () => actions });
  const row = grid.createTableRow({ id: 'row-1' });
  const buttons = row.querySelectorAll('[data-action-key]');

  assert.equal(buttons.length, 2);
  assert.notEqual(buttons[0].dataset.actionKey, buttons[1].dataset.actionKey);
  buttons[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  buttons[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await Promise.resolve();

  assert.deepEqual(calls, ['draft', 'live']);
});

test('DataGrid default Delete closes its menu before invoking the delete workflow', async () => {
  createDom();
  const grid = createGrid('records-grid');
  const row = grid.createTableRow({ id: 'row-1' });
  document.querySelector('#records-grid tbody').appendChild(row);
  const trigger = row.querySelector('[data-dropdown-trigger]');
  const menu = row.querySelector('.actions-menu');
  const deleteButton = row.querySelector('[data-action-id="delete"]');
  menu.classList.remove('hidden');
  trigger.setAttribute('aria-expanded', 'true');

  let deleteCalled = false;
  grid.handleDelete = async () => {
    deleteCalled = true;
    assert.equal(menu.classList.contains('hidden'), true);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  };
  deleteButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await Promise.resolve();

  assert.equal(deleteCalled, true);
});

test('DataGrid renderData closes and removes an open portaled menu before replacing rows', () => {
  const dom = createDom();
  const grid = createGrid('records-grid', {
    rowActions: (record) => [
      { id: 'publish', label: 'Publish', action: () => record.id },
    ],
  });
  grid.tableEl = dom.window.document.getElementById('records-grid');
  grid.bindDropdownToggles();
  grid.renderData({ data: [{ id: 'row-1' }] });

  const oldTrigger = grid.tableEl.querySelector('[data-dropdown-trigger]');
  const oldMenu = grid.tableEl.querySelector('.actions-menu');
  oldTrigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(oldMenu.parentElement, dom.window.document.body);
  assert.equal(oldMenu.classList.contains('hidden'), false);

  grid.renderData({ data: [{ id: 'row-2' }] });

  assert.equal(oldTrigger.isConnected, false);
  assert.equal(oldMenu.isConnected, false);
  assert.equal(dom.window.document.querySelectorAll('body > .actions-menu').length, 0);
  grid.destroy();
});
