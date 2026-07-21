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
  globalThis.KeyboardEvent = win.KeyboardEvent;
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
  attachCopyListeners,
  renderLogsPanel,
  renderLogRow,
  logRowKey,
  logSearchText,
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

test('logRowKey prefers the server event id and preserves a deterministic legacy fallback', () => {
  assert.equal(logRowKey({ id: 'log-uuid' }), 'log-uuid');
  const legacy = { timestamp: '2026-07-21T13:38:49Z', level: 'error', message: 'not ready', source: 'monitor.go:12' };
  assert.equal(logRowKey(legacy), logRowKey({ ...legacy }));
  assert.notEqual(logRowKey(legacy), logRowKey({ ...legacy, message: 'ready' }));
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

test('rich logs render an accessible summary plus prioritized structured details', () => {
  const entry = {
    id: 'log-1',
    timestamp: '2026-07-21T13:38:49Z',
    level: 'error',
    message: 'public search readiness refresh failed',
    logger: 'admin-server',
    source: 'public_route_capabilities.go:1194',
    caller: { function: 'runPublicSearchReadinessMonitor', file: '/app/public_route_capabilities.go', line: 1194 },
    request_id: 'req-1',
    trace_id: 'trace-1',
    fields: {
      zeta: 'last',
      health: { provider: 'typesense', indexes: ['archive_media', 'site_content'] },
      root_error: 'indexes are not ready',
      error: 'validate public search provider health',
      alpha: 'first',
      stack: 'goroutine 1\nframe',
    },
  };
  const html = renderLogsPanel([entry], consoleStyles, {
    showSource: true,
    truncateMessage: false,
    expandable: true,
  });

  assert.match(html, /data-row-key="log-1"/);
  assert.match(html, /role="button"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Copy JSON/);
  assert.match(html, /Copy stack/);
  assert.ok(html.indexOf('Error') < html.indexOf('Diagnostics'));
  assert.ok(html.indexOf('Diagnostics') < html.indexOf('Context'));
  assert.ok(html.indexOf('Context') < html.indexOf('Fields'));
  assert.ok(html.indexOf('Alpha') < html.indexOf('Zeta'), 'remaining fields sorted deterministically');
  assert.match(logSearchText(entry), /archive_media/);
  assert.match(logSearchText(entry), /trace-1/);
});

test('compact logs remain a single legacy-compatible row', () => {
  const html = renderLogsPanel([{ message: 'legacy', source: 'adapter.go:35', fields: { error: 'boom' } }], consoleStyles, {
    showSource: false,
    truncateMessage: true,
  });
  assert.doesNotMatch(html, /expansion-row/);
  assert.doesNotMatch(html, /Copy JSON/);
  assert.doesNotMatch(html, /role="button"/);
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

test('log expansion supports keyboard operation and updates ARIA state', () => {
  const entry = { id: 'log-keyboard', level: 'error', message: 'boom', fields: { error: 'cause' } };
  const root = mount(`<table><tbody data-live-list>${renderLogRow(entry, consoleStyles, {
    showSource: true,
    truncateMessage: false,
    expandable: true,
  })}</tbody></table>`);
  const expanded = new Set();
  attachRowExpansion(root, { tableSelector: '[data-live-list]', ...EXPAND_OPTS, expanded });
  const row = root.querySelector('tr.expandable-row');
  const detail = row.nextElementSibling;

  row.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.ok(expanded.has('log-keyboard'));
  assert.equal(row.getAttribute('aria-expanded'), 'true');
  assert.equal(detail.getAttribute('aria-hidden'), 'false');

  row.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  assert.ok(!expanded.has('log-keyboard'));
  assert.equal(row.getAttribute('aria-expanded'), 'false');
  assert.equal(detail.getAttribute('aria-hidden'), 'true');
});

test('delegated log copy actions work for rows streamed after adoption', async () => {
  const copied = [];
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async (value) => copied.push(value) },
    configurable: true,
  });
  const root = mount('<table><tbody data-live-list></tbody></table>');
  attachCopyListeners(root, { feedbackDuration: 0, useIconFeedback: true });
  root.querySelector('tbody').insertAdjacentHTML('afterbegin', renderLogRow({
    id: 'log-copy',
    level: 'error',
    message: 'copy me',
    fields: { error: 'boom', stack: 'frame one\nframe two' },
  }, consoleStyles, { showSource: true, truncateMessage: false, expandable: true }));

  root.querySelector('button[title="Copy normalized log event as JSON"]')
    .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  root.querySelector('button[title="Copy stack trace"]')
    .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(JSON.parse(copied[0]).id, 'log-copy');
  assert.equal(copied[1], 'frame one\nframe two');
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

test('live list reports evicted keys so hosts can discard expansion state', () => {
  const root = mount('<table><tbody data-live-list><tr data-row-key="b"><td>b</td></tr><tr class="expansion-row"><td>detail</td></tr><tr data-row-key="a"><td>a</td></tr><tr class="expansion-row"><td>detail</td></tr></tbody></table>');
  const frames = [];
  const evicted = [];
  const view = new LiveListView({
    styles: consoleStyles,
    keyOf: (entry) => entry.id,
    renderRow: (entry) => `<tr data-row-key="${entry.id}"><td>${entry.id}</td></tr><tr class="expansion-row"><td>detail</td></tr>`,
    getRenderOptions: () => ({ newestFirst: true }),
    getMaxEntries: () => 2,
    onEvict: (keys) => evicted.push(...keys),
    scheduleFrame: (cb) => frames.push(cb),
  });
  view.adopt(root);
  view.enqueue([{ id: 'c' }]);
  frames.splice(0).forEach((cb) => cb());

  assert.deepEqual(evicted, ['a']);
  assert.equal(root.querySelector('[data-row-key="a"]'), null);
  assert.equal(root.querySelectorAll('tr').length, 4, 'detail row evicted with its summary');
});

test('rich logs bound a sustained streaming burst before DOM insertion', () => {
  const root = mount('<table><tbody data-live-list></tbody></table>');
  const frames = [];
  const view = new LiveListView({
    styles: consoleStyles,
    keyOf: logRowKey,
    renderRow: (entry) => renderLogRow(entry, consoleStyles, {
      showSource: true,
      truncateMessage: false,
      expandable: true,
    }),
    getRenderOptions: () => ({ newestFirst: true }),
    getMaxEntries: () => 100,
    scheduleFrame: (cb) => frames.push(cb),
  });
  view.adopt(root);
  view.enqueue(Array.from({ length: 1000 }, (_, index) => ({
    id: `log-${index}`,
    level: 'info',
    message: `event ${index}`,
    fields: { nested: { index } },
  })));
  frames.splice(0).forEach((cb) => cb());

  const summaries = root.querySelectorAll('tr[data-row-key]');
  assert.equal(summaries.length, 100);
  assert.equal(root.querySelectorAll('tbody > tr').length, 200, '100 summary/detail logical rows');
  assert.equal(summaries[0].getAttribute('data-row-key'), 'log-999');
  assert.equal(summaries[99].getAttribute('data-row-key'), 'log-900');
});
