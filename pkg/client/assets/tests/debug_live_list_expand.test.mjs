import test from 'node:test';
import assert from 'node:assert/strict';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

function setGlobals(win) {
  globalThis.window = win;
  globalThis.self = win;
  globalThis.document = win.document;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true, writable: true });
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
}

const bootstrapDOM = new JSDOM(`<!doctype html><html><body></body></html>`, { url: 'http://127.0.0.1:9090/' });
setGlobals(bootstrapDOM.window);

const {
  renderRequestsPanel,
  renderRequestRow,
  requestRowKey,
  renderJSErrorsPanel,
  jsErrorRowKey,
  LiveListView,
  attachRowExpansion,
  restoreRowExpansion,
  attachRequestDetailListeners,
  consoleStyles,
} = await import('../dist/debug/index.js');

function mount(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

// ---------------------------------------------------------------------------
// Stable, index-free keys
// ---------------------------------------------------------------------------

test('requestRowKey/jsErrorRowKey prefer id and are otherwise deterministic + index-free', () => {
  assert.equal(requestRowKey({ id: 'r1' }), 'r1');
  const r = { timestamp: '2026-06-18T10:00:00Z', method: 'GET', path: '/a', status: 200 };
  assert.equal(requestRowKey(r), requestRowKey({ ...r }), 'same content -> same key regardless of position');
  assert.notEqual(requestRowKey(r), requestRowKey({ ...r, path: '/b' }));

  assert.equal(jsErrorRowKey({ id: 'e1' }), 'e1');
  const e = { timestamp: '2026-06-18T10:00:00Z', type: 'uncaught', message: 'boom', source: 'a.js', line: 1 };
  assert.equal(jsErrorRowKey(e), jsErrorRowKey({ ...e }));
  assert.notEqual(jsErrorRowKey(e), jsErrorRowKey({ ...e, message: 'bang' }));
});

// ---------------------------------------------------------------------------
// Renderers emit live-list markup
// ---------------------------------------------------------------------------

test('renderRequestsPanel marks a live-list tbody with keyed request rows', () => {
  const html = renderRequestsPanel([{ id: 'r1', method: 'GET', path: '/a', status: 200 }], consoleStyles, {
    expandedRequestIds: new Set(),
  });
  assert.match(html, /<tbody data-live-list>/);
  assert.match(html, /data-request-id="r1"/);
  assert.match(html, /data-detail-for="r1"/);
});

test('renderJSErrorsPanel marks a live-list tbody with keyed error rows', () => {
  const html = renderJSErrorsPanel([{ id: 'e1', type: 'uncaught', message: 'boom', stack: 'at x' }], consoleStyles);
  assert.match(html, /<tbody data-live-list>/);
  assert.match(html, /data-row-key="e1"/);
  assert.match(html, /expandable-row/);
});

// ---------------------------------------------------------------------------
// Persisted, delegated expansion (jserrors-style)
// ---------------------------------------------------------------------------

function jserrorsRoot(errors) {
  return mount(renderJSErrorsPanel(errors, consoleStyles));
}

const EXPAND_OPTS = { rowSelector: 'tr.expandable-row', keyAttr: 'data-row-key' };

test('attachRowExpansion toggles .expanded and records the key', () => {
  const root = jserrorsRoot([{ id: 'e1', type: 'uncaught', message: 'boom', stack: 'at x' }]);
  const expanded = new Set();
  attachRowExpansion(root, { tableSelector: '[data-live-list]', ...EXPAND_OPTS, expanded });

  const row = root.querySelector('tr.expandable-row');
  row.querySelector('td').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.ok(row.classList.contains('expanded'));
  assert.ok(expanded.has('e1'));

  row.querySelector('td').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.ok(!row.classList.contains('expanded'));
  assert.ok(!expanded.has('e1'));
});

test('restoreRowExpansion re-applies .expanded after a full re-render', () => {
  const errors = [{ id: 'e1', type: 'uncaught', message: 'boom', stack: 'at x' }];
  const root = jserrorsRoot(errors);
  const expanded = new Set(['e1']);

  // Simulate a rebuild (new DOM, expanded class gone).
  root.innerHTML = renderJSErrorsPanel(errors, consoleStyles);
  assert.ok(!root.querySelector('tr.expandable-row').classList.contains('expanded'));

  restoreRowExpansion(root, { ...EXPAND_OPTS, expanded });
  assert.ok(root.querySelector('tr.expandable-row').classList.contains('expanded'), 'expansion restored from set');
});

// ---------------------------------------------------------------------------
// Requests incremental adoption (LiveListView + detail expansion)
// ---------------------------------------------------------------------------

// LiveListView needs a scheduleFrame; inject a manual one for deterministic flushes.
function requestsViewManual(requests, maxEntries = 50) {
  const root = mount(renderRequestsPanel(requests, consoleStyles, { expandedRequestIds: new Set() }));
  const frames = [];
  const expandedRequests = new Set();
  const view = new LiveListView({
    styles: consoleStyles,
    containerSelector: '[data-request-table] tbody',
    rowSelector: 'tr[data-request-id]',
    keyAttr: 'data-request-id',
    keyOf: requestRowKey,
    renderRow: (entry) => renderRequestRow(entry, consoleStyles, { expandedRequestIds: expandedRequests }),
    getItems: () => requests,
    getRenderOptions: () => ({ newestFirst: true }),
    getMaxEntries: () => maxEntries,
    onAdopt: (r) => attachRequestDetailListeners(r, expandedRequests),
    scheduleFrame: (cb) => frames.push(cb),
  });
  view.adopt(root);
  return {
    root,
    view,
    tick() { frames.splice(0).forEach((cb) => cb()); },
    summaryKeys() { return [...root.querySelectorAll('tbody tr[data-request-id]')].map((e) => e.getAttribute('data-request-id')); },
    rowCount() { return root.querySelectorAll('tbody tr').length; },
  };
}

test('requests append incrementally with their detail rows; newest-first', () => {
  const requests = [{ id: 'a', method: 'GET', path: '/a', status: 200 }];
  const ctx = requestsViewManual(requests);
  assert.deepEqual(ctx.summaryKeys(), ['a']);

  const b = { id: 'b', method: 'POST', path: '/b', status: 201 };
  requests.push(b);
  ctx.view.enqueue([b]);
  ctx.tick();

  assert.deepEqual(ctx.summaryKeys(), ['b', 'a'], 'b prepended (newest-first)');
  assert.ok(ctx.root.querySelector('tr[data-detail-for="b"]'), 'detail row appended for b');
  assert.equal(ctx.rowCount(), 4, 'two summary + two detail rows');
});

test('requests evict the oldest summary + detail together', () => {
  const requests = [
    { id: 'a', method: 'GET', path: '/a', status: 200 },
    { id: 'b', method: 'GET', path: '/b', status: 200 },
  ];
  const ctx = requestsViewManual(requests, 2);

  const c = { id: 'c', method: 'GET', path: '/c', status: 200 };
  requests.push(c);
  ctx.view.enqueue([c]);
  ctx.tick();

  assert.deepEqual(ctx.summaryKeys(), ['c', 'b'], 'c in, oldest (a) evicted');
  assert.equal(ctx.root.querySelector('tr[data-request-id="a"]'), null, 'a summary gone');
  assert.equal(ctx.root.querySelector('tr[data-detail-for="a"]'), null, 'a detail gone too');
  assert.equal(ctx.rowCount(), 4, 'exactly two logical rows remain');
});
